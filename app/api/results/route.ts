import {
  NextRequest,
  NextResponse,
} from "next/server";

import crypto from "crypto";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================================================
   TYPES
========================================================= */

type TestResult = {
  id: string;
  userId?: string;
  userName: string;

  source?: string;
  testType?: string;

  testId: string;
  testTitle: string;
  subject: string;

  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;

  percentage: number;

  earnedPoints: number;
  totalPoints: number;

  spentSeconds: number;

  answers?: Record<string, unknown>;

  finishedAt: string;
};

type VerifiedQuestion = {
  questionId: string;
  questionNumber: number;
  selectedAnswer: string | null;
  correctAnswer: string | null;
  answerStatus:
    | "correct"
    | "incorrect"
    | "unanswered";
  points: number;
};

/* =========================================================
   HELPERS
========================================================= */

function safeNumber(
  value: unknown,
  fallback = 0
) {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

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

/* =========================================================
   POST
   TEST NATIJASINI SAQLASH

   1) Foydalanuvchini tekshiradi
   2) Testni Neon'dan oladi
   3) answers mavjud bo‘lsa serverning o‘zi tekshiradi
   4) Barcha test natijalarini ranking_attempts ga yozadi
   5) Server tekshirgan real javoblarni
      ranking_question_results ga yozadi

   VERCEL BLOB ISHLATILMAYDI.
========================================================= */

export async function POST(
  request: NextRequest
) {
  try {
    /* =====================================================
       SESSION
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

    /* =====================================================
       USER ID
    ===================================================== */

    let userId = String(
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

    /*
      Eski session bilan kirib turgan
      foydalanuvchida bu cookie bo‘lmasligi mumkin.
      Logout -> qayta login qilinsa avtomatik paydo bo‘ladi.
    */

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          code: "USER_ID_MISSING",
          message:
            "Foydalanuvchi ID topilmadi. Tizimdan chiqib qayta kiring.",
        },
        {
          status: 401,
        }
      );
    }

    /* =====================================================
       FOYDALANUVCHI ISMI
       Oddiy user bo‘lsa ismni cookie'dan emas,
       Neon access_codes jadvalidan olamiz.
    ===================================================== */

    let userName =
      decodeCookieValue(
        request.cookies.get(
          "qurbonov_name"
        )?.value,
        "Foydalanuvchi"
      );

    if (role !== "admin") {
      const userRows = await sql`
        SELECT
          id,
          name,
          active,
          approved
        FROM access_codes
        WHERE id = ${userId}
        LIMIT 1
      `;

      if (userRows.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Foydalanuvchi topilmadi.",
          },
          {
            status: 401,
          }
        );
      }

      const user: any = userRows[0];

      if (
        user.active !== true ||
        user.approved !== true
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Foydalanuvchi uchun test natijasini saqlashga ruxsat yo‘q.",
          },
          {
            status: 403,
          }
        );
      }

      userName = String(
        user.name ||
          "Foydalanuvchi"
      );
    }

    /* =====================================================
       BODY
    ===================================================== */

    const body =
      await request.json();

    const requestedTestId =
      String(
        body?.testId || ""
      ).trim();

    if (!requestedTestId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Test ID topilmadi.",
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       TESTNI NEON'DAN OLAMIZ

       testTitle / subject / testType'ni
       clientdan ishonib olmaymiz.
    ===================================================== */

    const testRows = await sql`
      SELECT
        id,
        title,
        subject,
        test_type,
        custom_test_type_name,
        status
      FROM legacy_tests
      WHERE id = ${requestedTestId}
      LIMIT 1
    `;

    if (testRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Test topilmadi.",
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
      test.status !== "published"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bu test foydalanuvchilar uchun e’lon qilinmagan.",
        },
        {
          status: 403,
        }
      );
    }

    const testId =
      String(test.id);

    const testTitle = String(
      test.title || "Nomsiz test"
    );

    const subject = String(
      test.subject || ""
    );

    const testType = String(
      test.test_type ||
        test.custom_test_type_name ||
        "other"
    );

    /* =====================================================
       ANSWERS
    ===================================================== */

    let answers:
      | Record<string, unknown>
      | undefined;

    if (
      body?.answers &&
      typeof body.answers ===
        "object" &&
      !Array.isArray(body.answers)
    ) {
      answers =
        body.answers as Record<
          string,
          unknown
        >;
    }

    /*
      Eski frontend answers yubormasa ham
      sayt buzilmasligi uchun client yuborgan
      natijalarni vaqtincha qabul qilamiz.

      answers mavjud bo‘lsa quyida server
      natijani qayta hisoblaydi.
    */

    let total = Math.max(
      0,
      safeNumber(body?.total)
    );

    let correct = Math.max(
      0,
      safeNumber(body?.correct)
    );

    let incorrect = Math.max(
      0,
      safeNumber(body?.incorrect)
    );

    let unanswered = Math.max(
      0,
      safeNumber(body?.unanswered)
    );

    let percentage = Math.min(
      100,
      Math.max(
        0,
        safeNumber(body?.percentage)
      )
    );

    let earnedPoints = Math.max(
      0,
      safeNumber(body?.earnedPoints)
    );

    let totalPoints = Math.max(
      0,
      safeNumber(body?.totalPoints)
    );

    const spentSeconds = Math.max(
      0,
      Math.floor(
        safeNumber(
          body?.spentSeconds
        )
      )
    );

    let verifiedQuestions:
      VerifiedQuestion[] = [];

    let serverVerified = false;

    /* =====================================================
       SERVER TOMONIDA SAVOLMA-SAVOL TEKSHIRISH
    ===================================================== */

    if (answers) {
      const questionRows = await sql`
        SELECT
          id,
          question_number,
          points
        FROM legacy_test_questions
        WHERE test_id = ${testId}
        ORDER BY
          question_number ASC,
          id ASC
      `;

      const questionIds =
        questionRows.map(
          (row: any) =>
            Number(row.id)
        );

      let correctOptionRows:
        any[] = [];

      if (questionIds.length > 0) {
        correctOptionRows =
          await sql`
            SELECT
              id,
              question_id
            FROM legacy_test_options
            WHERE
              question_id = ANY(
                ${questionIds}
              )
              AND is_correct = TRUE
            ORDER BY
              question_id ASC,
              id ASC
          `;
      }

      /*
        Bir savolda bir nechta to‘g‘ri variant
        bo‘lsa ham ishlashi uchun Set ishlatamiz.
      */

      const correctOptions =
        new Map<
          string,
          Set<string>
        >();

      for (
        const option of
        correctOptionRows
      ) {
        const qid = String(
          option.question_id
        );

        const current =
          correctOptions.get(qid) ||
          new Set<string>();

        current.add(
          String(option.id)
        );

        correctOptions.set(
          qid,
          current
        );
      }

      let verifiedCorrect = 0;
      let verifiedIncorrect = 0;
      let verifiedUnanswered = 0;
      let verifiedEarned = 0;
      let verifiedTotalPoints = 0;

      for (
        const question of
        questionRows
      ) {
        const questionId = String(
          question.id
        );

        const questionNumber =
          Number(
            question.question_number
          ) || 0;

        const points =
          Number(question.points) > 0
            ? Number(
                question.points
              )
            : 1;

        verifiedTotalPoints += points;

        const rawSelected =
          answers[questionId];

        const selected =
          rawSelected === undefined ||
          rawSelected === null ||
          String(rawSelected).trim() ===
            ""
            ? null
            : String(rawSelected);

        const correctSet =
          correctOptions.get(
            questionId
          ) || new Set<string>();

        const correctAnswer =
          correctSet.size > 0
            ? Array.from(
                correctSet
              ).join(",")
            : null;

        if (!selected) {
          verifiedUnanswered++;

          verifiedQuestions.push({
            questionId,
            questionNumber,
            selectedAnswer: null,
            correctAnswer,
            answerStatus:
              "unanswered",
            points: 0,
          });

          continue;
        }

        if (
          correctSet.has(selected)
        ) {
          verifiedCorrect++;
          verifiedEarned += points;

          verifiedQuestions.push({
            questionId,
            questionNumber,
            selectedAnswer:
              selected,
            correctAnswer,
            answerStatus:
              "correct",
            points,
          });
        } else {
          verifiedIncorrect++;

          verifiedQuestions.push({
            questionId,
            questionNumber,
            selectedAnswer:
              selected,
            correctAnswer,
            answerStatus:
              "incorrect",
            points: 0,
          });
        }
      }

      total =
        questionRows.length;

      correct =
        verifiedCorrect;

      incorrect =
        verifiedIncorrect;

      unanswered =
        verifiedUnanswered;

      earnedPoints =
        verifiedEarned;

      totalPoints =
        verifiedTotalPoints;

      percentage =
        total > 0
          ? Math.round(
              (correct / total) *
                100
            )
          : 0;

      serverVerified = true;
    }

    /* =====================================================
       YANGI NATIJA ID VA VAQT
    ===================================================== */

    const resultId =
      crypto.randomUUID();

    const finishedAt =
      new Date().toISOString();

    const result: TestResult = {
      id: resultId,

      userId,
      userName,

      source: "legacy",
      testType,

      testId,
      testTitle,
      subject,

      total,
      correct,
      incorrect,
      unanswered,

      percentage,

      earnedPoints,
      totalPoints,

      spentSeconds,

      answers,

      finishedAt,
    };

    /* =====================================================
       ASOSIY NATIJANI NEON'GA SAQLASH

       MUHIM:
       Bu attempt reyting yoqilgan yoki yoqilmaganidan
       qat'i nazar saqlanadi.

       Reytingning o‘zi ranking_question_results va
       user_profiles.ranking_enabled orqali hisoblanadi.
    ===================================================== */

    const attemptRows = await sql`
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
        'legacy',
        ${testType},
        ${testId},
        ${testTitle},
        ${subject},
        ${total},
        ${correct},
        ${incorrect},
        ${unanswered},
        ${percentage},
        ${earnedPoints},
        ${totalPoints},
        ${spentSeconds},
        ${resultId},
        ${finishedAt}::timestamptz,
        NOW()
      )
      RETURNING
        id
    `;

    const rankingAttemptId =
      String(
        attemptRows[0]?.id || ""
      );

    if (!rankingAttemptId) {
      throw new Error(
        "Test natijasini Neon bazasiga saqlab bo‘lmadi."
      );
    }

    /* =====================================================
       REYTING UCHUN SAVOLMA-SAVOL NATIJALAR

       Faqat server tekshirgan va real javob berilgan
       savollar ranking_question_results ga yoziladi.

       unanswered bu jadvalga yozilmaydi.
    ===================================================== */

    let rankingSaved = false;
    let rankingWarning:
      string | null = null;

    if (
      serverVerified &&
      verifiedQuestions.length > 0
    ) {
      const answeredQuestions =
        verifiedQuestions.filter(
          (question) =>
            question.answerStatus !==
            "unanswered"
        );

      if (
        answeredQuestions.length > 0
      ) {
        try {
          const bulkQuestionResults =
            answeredQuestions.map(
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
              bulkQuestionResults
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
              'legacy',
              ${testType},
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

          rankingSaved = true;
        } catch (rankingError) {
          console.error(
            "RANKING QUESTION SAVE ERROR:",
            rankingError
          );

          rankingWarning =
            rankingError instanceof Error
              ? rankingError.message
              : "Reyting savollarini Neon bazasiga yozib bo‘lmadi.";

          /*
            Asosiy ranking_attempts qatori O‘CHIRILMAYDI.
            Chunki endi u Test natijalari bo‘limining
            asosiy tarix yozuvi hisoblanadi.

            Faqat shu attemptga tegishli yarim yozilgan
            savol natijalari bo‘lsa tozalaymiz.
          */

          try {
            await sql`
              DELETE FROM
                ranking_question_results
              WHERE
                ranking_attempt_id =
                  ${rankingAttemptId}
            `;
          } catch (
            cleanupError
          ) {
            console.error(
              "RANKING QUESTION CLEANUP ERROR:",
              cleanupError
            );
          }

          rankingSaved = false;
        }
      } else {
        /*
          Server tekshirgan, lekin foydalanuvchi
          birorta savolga javob bermagan.
          Natija attempt sifatida saqlanadi,
          reytingga real javob qo‘shilmaydi.
        */
        rankingSaved = true;
      }
    }

    /* =====================================================
       LOG
    ===================================================== */

    console.log(
      "NATIJA NEON'GA SAQLANDI:",
      {
        id: result.id,
        neonAttemptId:
          rankingAttemptId,
        userId:
          result.userId,
        userName:
          result.userName,
        testTitle:
          result.testTitle,
        correct:
          result.correct,
        percentage:
          result.percentage,
        serverVerified,
        rankingSaved,
      }
    );

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json(
      {
        success: true,

        message:
          rankingWarning
            ? "Test natijasi Neon bazasiga saqlandi, lekin reyting savollarini saqlashda xatolik yuz berdi."
            : "Test natijasi Neon bazasiga muvaffaqiyatli saqlandi.",

        serverVerified,
        resultSaved: true,
        rankingSaved,
        rankingWarning,
        rankingAttemptId,

        result: {
          id: result.id,
          userId:
            result.userId,
          userName:
            result.userName,
          testId:
            result.testId,
          testTitle:
            result.testTitle,
          subject:
            result.subject,
          testType:
            result.testType,
          total:
            result.total,
          correct:
            result.correct,
          incorrect:
            result.incorrect,
          unanswered:
            result.unanswered,
          percentage:
            result.percentage,
          earnedPoints:
            result.earnedPoints,
          totalPoints:
            result.totalPoints,
          spentSeconds:
            result.spentSeconds,
          finishedAt:
            result.finishedAt,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "RESULT POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Natijani saqlashda server xatosi.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   GET
   NATIJALARNI NEON'DAN OLISH

   Hozirgi eski endpoint xulqini saqlaymiz:
   session bo‘lsa natijalar qaytariladi.
========================================================= */

export async function GET(
  request: NextRequest
) {
  try {
    const session =
      request.cookies.get(
        "qurbonov_session"
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

    const rows = await sql`
      SELECT
        id::text AS id,
        user_id::text AS user_id,
        user_name,
        source,
        test_type,
        test_id::text AS test_id,
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
        finished_at
      FROM ranking_attempts
      ORDER BY
        finished_at DESC,
        id DESC
    `;

    const results = rows.map(
      (row: any) => ({
        id: String(
          row.id || ""
        ),

        userId: String(
          row.user_id || ""
        ),

        userName: String(
          row.user_name ||
            "Foydalanuvchi"
        ),

        source: String(
          row.source || ""
        ),

        testType: String(
          row.test_type || ""
        ),

        testId: String(
          row.test_id || ""
        ),

        testTitle: String(
          row.test_title ||
            "Nomsiz test"
        ),

        subject: String(
          row.subject || ""
        ),

        total: Number(
          row.total_questions || 0
        ),

        correct: Number(
          row.correct_count || 0
        ),

        incorrect: Number(
          row.incorrect_count || 0
        ),

        unanswered: Number(
          row.unanswered_count || 0
        ),

        percentage: Number(
          row.percentage || 0
        ),

        earnedPoints: Number(
          row.earned_points || 0
        ),

        totalPoints: Number(
          row.total_points || 0
        ),

        spentSeconds: Number(
          row.spent_seconds || 0
        ),

        sourceAttemptId: String(
          row.source_attempt_id || ""
        ),

        finishedAt:
          row.finished_at
            ? new Date(
                row.finished_at
              ).toISOString()
            : "",
      })
    );

    return NextResponse.json(
      {
        success: true,
        count: results.length,
        results,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error(
      "RESULT GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Natijalarni Neon bazasidan yuklashda server xatosi.",
      },
      {
        status: 500,
      }
    );
  }
}
