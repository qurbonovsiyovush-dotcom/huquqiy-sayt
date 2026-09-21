import {
  NextRequest,
  NextResponse,
} from "next/server";

import crypto from "crypto";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnswerStatus =
  | "correct"
  | "incorrect";

type RankingQuestion = {
  questionId: string;
  questionNumber: number;
  answerStatus: AnswerStatus;
  selectedAnswer: string | null;
  correctAnswer: string | null;
  points: number;
};

function decodeCookieValue(
  value: string | undefined,
  fallback: string
) {
  if (!value) {
    return fallback;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    /* =====================================================
       SESSION / USER
    ===================================================== */

    const session =
      request.cookies.get(
        "qurbonov_session"
      )?.value;

    const role =
      request.cookies.get(
        "qurbonov_role"
      )?.value;

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Avval tizimga kiring.",
        },
        {
          status: 401,
        }
      );
    }

    let userId =
      String(
        request.cookies.get(
          "qurbonov_user_id"
        )?.value || ""
      ).trim();

    if (
      role === "admin" &&
      !userId
    ) {
      userId = "admin";
    }

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          code:
            "USER_ID_MISSING",
          message:
            "Foydalanuvchi ID topilmadi. Tizimdan chiqib qayta kiring.",
        },
        {
          status: 401,
        }
      );
    }

    let userName =
      decodeCookieValue(
        request.cookies.get(
          "qurbonov_name"
        )?.value,
        "Foydalanuvchi"
      );

    if (
      role !== "admin"
    ) {
      const users =
        await sql`
          SELECT
            id,
            name,
            active,
            approved
          FROM access_codes
          WHERE id = ${userId}
          LIMIT 1
        `;

      if (
        users.length === 0 ||
        users[0].active !== true ||
        users[0].approved !== true
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Foydalanuvchiga ruxsat berilmagan.",
          },
          {
            status: 403,
          }
        );
      }

      userName =
        String(
          users[0].name ||
            "Foydalanuvchi"
        );
    }

    /* =====================================================
       BODY
    ===================================================== */

    const body =
      await request
        .json()
        .catch(() => ({}));

    const source =
      String(
        body?.source || ""
      ).trim();

    /*
      Hozir bu endpoint mavzulashtirilgan
      testni umumiy reytingga qo‘shadi.

      Oddiy/legislation/block/30/custom testlar
      /api/results orqali yozilyapti.

      Milliy sertifikat esa o‘z submit route'ida
      yoziladi.
    */
    if (
      source !== "thematic"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Noto‘g‘ri reyting manbasi.",
        },
        {
          status: 400,
        }
      );
    }

    const testId =
      String(
        body?.testId || ""
      ).trim();

    if (
      !/^\d+$/.test(
        testId
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Mavzulashtirilgan test ID noto‘g‘ri.",
        },
        {
          status: 400,
        }
      );
    }

    const answers =
      body?.answers &&
      typeof body.answers ===
        "object" &&
      !Array.isArray(
        body.answers
      )
        ? body.answers as Record<
            string,
            unknown
          >
        : {};

    const spentSeconds =
      Math.max(
        0,
        Math.floor(
          Number(
            body?.spentSeconds
          ) || 0
        )
      );

    /* =====================================================
       TEST
    ===================================================== */

    const testRows =
      await sql`
        SELECT
          t.id,
          t.title,
          t.status,
          t.section_type,
          b.subject
        FROM thematic_tests t
        INNER JOIN thematic_books b
          ON b.id = t.book_id
        WHERE t.id = ${testId}
        LIMIT 1
      `;

    if (
      testRows.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Mavzulashtirilgan test topilmadi.",
        },
        {
          status: 404,
        }
      );
    }

    const test: any =
      testRows[0];

    if (
      role !== "admin" &&
      test.status !==
        "published"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bu test e’lon qilinmagan.",
        },
        {
          status: 403,
        }
      );
    }

    const testTitle =
      String(
        test.title ||
          "Mavzulashtirilgan test"
      );

    const subject =
      String(
        test.subject || ""
      );

    /* =====================================================
       SAVOLLAR + VARIANTLAR
    ===================================================== */

    const questionRows =
      await sql`
        SELECT
          id,
          question_number,
          points
        FROM thematic_questions
        WHERE test_id = ${testId}
        ORDER BY
          question_order ASC,
          id ASC
      `;

    if (
      questionRows.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Test savollari topilmadi.",
        },
        {
          status: 409,
        }
      );
    }

    const questionIds =
      questionRows.map(
        (row: any) =>
          Number(row.id)
      );

    const optionRows =
      await sql`
        SELECT
          id,
          question_id,
          is_correct
        FROM thematic_options
        WHERE
          question_id =
            ANY(
              ${questionIds}::bigint[]
            )
        ORDER BY
          question_id ASC,
          id ASC
      `;

    const optionQuestionMap =
      new Map<
        string,
        string
      >();

    const correctOptionMap =
      new Map<
        string,
        Set<string>
      >();

    for (
      const option of
        optionRows
    ) {
      const optionId =
        String(option.id);

      const questionId =
        String(
          option.question_id
        );

      optionQuestionMap.set(
        optionId,
        questionId
      );

      if (
        option.is_correct ===
        true
      ) {
        const set =
          correctOptionMap.get(
            questionId
          ) ||
          new Set<string>();

        set.add(
          optionId
        );

        correctOptionMap.set(
          questionId,
          set
        );
      }
    }

    const validQuestionIds =
      new Set(
        questionRows.map(
          (row: any) =>
            String(row.id)
        )
      );

    /*
      Body ichida testga tegishli bo‘lmagan
      savol bo‘lsa qabul qilmaymiz.
    */
    for (
      const questionId of
        Object.keys(answers)
    ) {
      if (
        !validQuestionIds.has(
          String(
            questionId
          )
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Testga tegishli bo‘lmagan savol yuborildi.",
          },
          {
            status: 400,
          }
        );
      }
    }

    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    let earnedPoints = 0;
    let totalPoints = 0;

    const rankingQuestions:
      RankingQuestion[] = [];

    for (
      const question of
        questionRows
    ) {
      const questionId =
        String(
          question.id
        );

      const questionNumber =
        Number(
          question.question_number
        ) || 0;

      const questionPoints =
        Number(
          question.points
        ) > 0
          ? Number(
              question.points
            )
          : 1;

      totalPoints +=
        questionPoints;

      const rawSelected =
        answers[
          questionId
        ];

      const selectedOptionId =
        rawSelected ===
          undefined ||
        rawSelected ===
          null ||
        String(
          rawSelected
        ).trim() === ""
          ? null
          : String(
              rawSelected
            );

      if (
        !selectedOptionId
      ) {
        unansweredCount++;
        continue;
      }

      /*
        Variant shu savolga tegishlimi?
      */
      if (
        optionQuestionMap.get(
          selectedOptionId
        ) !== questionId
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Savolga tegishli bo‘lmagan variant yuborildi.",
          },
          {
            status: 400,
          }
        );
      }

      const correctSet =
        correctOptionMap.get(
          questionId
        ) ||
        new Set<string>();

      const isCorrect =
        correctSet.has(
          selectedOptionId
        );

      if (isCorrect) {
        correctCount++;
        earnedPoints +=
          questionPoints;
      } else {
        incorrectCount++;
      }

      rankingQuestions.push({
        questionId,
        questionNumber,
        answerStatus:
          isCorrect
            ? "correct"
            : "incorrect",
        selectedAnswer:
          selectedOptionId,
        correctAnswer:
          correctSet.size
            ? Array.from(
                correctSet
              ).join(",")
            : null,
        points:
          isCorrect
            ? questionPoints
            : 0,
      });
    }

    const totalQuestions =
      questionRows.length;

    const percentage =
      totalQuestions > 0
        ? Math.round(
            (
              correctCount /
              totalQuestions
            ) *
              100
          )
        : 0;

    /*
      Umuman javob berilmagan urinish
      reytingga yozilmaydi.
    */
    if (
      rankingQuestions.length ===
      0
    ) {
      return NextResponse.json({
        success: true,
        rankingSaved: false,
        reason: "NO_ANSWERS",
        message:
          "Javob berilgan savol yo‘q, reytingga qo‘shilmadi.",
      });
    }

    /* =====================================================
       RANKING ATTEMPT
    ===================================================== */

    const sourceAttemptId =
      crypto.randomUUID();

    const finishedAt =
      new Date()
        .toISOString();

    let rankingAttemptId:
      string | null =
        null;

    try {
      const attempts =
        await sql`
          INSERT INTO ranking_attempts (
            user_id,
            user_name,
            source,
            test_type,
            test_id,
            test_title,
            subject,
            total_questions,
            correct_count,
            incorrect_count,
            unanswered_count,
            percentage,
            earned_points,
            total_points,
            spent_seconds,
            source_attempt_id,
            finished_at,
            created_at
          )
          VALUES (
            ${userId},
            ${userName},
            'thematic',
            'thematic',
            ${testId},
            ${testTitle},
            ${subject},
            ${totalQuestions},
            ${correctCount},
            ${incorrectCount},
            ${unansweredCount},
            ${percentage},
            ${earnedPoints},
            ${totalPoints},
            ${spentSeconds},
            ${sourceAttemptId},
            ${finishedAt}::timestamptz,
            NOW()
          )
          RETURNING id
        `;

      rankingAttemptId =
        String(
          attempts[0]?.id ||
            ""
        );

      if (
        !rankingAttemptId
      ) {
        throw new Error(
          "Ranking attempt ID yaratilmadi."
        );
      }

      const bulkRows =
        rankingQuestions.map(
          (question) => ({
            question_id:
              question.questionId,
            question_number:
              question.questionNumber,
            answer_status:
              question.answerStatus,
            selected_answer:
              question.selectedAnswer,
            correct_answer:
              question.correctAnswer,
            points:
              question.points,
          })
        );

      const bulkJson =
        JSON.stringify(
          bulkRows
        );

      await sql`
        INSERT INTO ranking_question_results (
          ranking_attempt_id,
          user_id,
          user_name,
          source,
          test_type,
          test_id,
          test_title,
          question_id,
          question_number,
          answer_status,
          selected_answer,
          correct_answer,
          points,
          answered_at,
          created_at
        )
        SELECT
          ${rankingAttemptId}::bigint,
          ${userId},
          ${userName},
          'thematic',
          'thematic',
          ${testId},
          ${testTitle},
          x.question_id,
          x.question_number,
          x.answer_status,
          x.selected_answer,
          x.correct_answer,
          x.points,
          ${finishedAt}::timestamptz,
          NOW()
        FROM jsonb_to_recordset(
          ${bulkJson}::jsonb
        ) AS x(
          question_id text,
          question_number integer,
          answer_status text,
          selected_answer text,
          correct_answer text,
          points numeric
        )
      `;

      return NextResponse.json({
        success: true,
        rankingSaved: true,
        source:
          "thematic",
        result: {
          userId,
          userName,
          testId,
          testTitle,
          total:
            totalQuestions,
          correct:
            correctCount,
          incorrect:
            incorrectCount,
          unanswered:
            unansweredCount,
          percentage,
          earnedPoints,
          totalPoints,
          workedQuestions:
            rankingQuestions.length,
        },
      });
    } catch (
      rankingError
    ) {
      console.error(
        "THEMATIC RANKING SAVE ERROR:",
        rankingError
      );

      if (
        rankingAttemptId
      ) {
        try {
          await sql`
            DELETE FROM
              ranking_attempts
            WHERE id =
              ${rankingAttemptId}
          `;
        } catch (
          cleanupError
        ) {
          console.error(
            "THEMATIC RANKING CLEANUP ERROR:",
            cleanupError
          );
        }
      }

      throw rankingError;
    }
  } catch (error) {
    console.error(
      "RANKING SUBMIT POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        rankingSaved: false,
        message:
          error instanceof Error
            ? error.message
            : "Reytingni saqlashda server xatosi.",
      },
      {
        status: 500,
      }
    );
  }
}

