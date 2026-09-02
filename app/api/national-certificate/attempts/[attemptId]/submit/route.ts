import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUBMIT_GRACE_MS = 15_000;

type RawAnswer = {
  questionId?: unknown;
  selectedOptionId?: unknown;
  openAnswerText?: unknown;
};

type SubmittedAnswer = {
  questionId: string;
  selectedOptionId: string | null;
  openAnswerText: string;
};

type StoredAnswerRow = {
  question_id: string;
  selected_option_id: string | null;
  open_answer_text: string | null;
  normalized_open_answer: string | null;
  is_correct: boolean | null;
  awarded_points: number;
};

function getUserKey(request: NextRequest) {
  return (
    request.cookies.get("qurbonov_session")?.value ||
    ""
  );
}

function normalizeAnswer(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[ʻʼ’`]/g, "'")
    .replace(/\s+/g, " ");
}

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{
      attemptId: string;
    }>;
  }
) {
  try {
    const userKey = getUserKey(request);

    if (!userKey) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Natijani yuborish uchun tizimga kirish kerak.",
        },
        { status: 401 }
      );
    }

    const { attemptId } =
      await context.params;

    if (!attemptId) {
      return NextResponse.json(
        {
          success: false,
          message: "Urinish ID topilmadi.",
        },
        { status: 400 }
      );
    }

    const attempts = await sql`
      SELECT
        a.id,
        a.test_id,
        a.user_key,
        a.status,
        a.started_at,
        t.title,
        t.duration_minutes,
        t.status AS test_status
      FROM national_certificate_attempts a
      INNER JOIN national_certificate_tests t
        ON t.id = a.test_id
      WHERE a.id = ${attemptId}
      LIMIT 1
    `;

    if (attempts.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Urinish topilmadi.",
        },
        { status: 404 }
      );
    }

    const attempt = attempts[0];

    if (
      String(attempt.user_key) !== userKey
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bu urinish sizga tegishli emas.",
        },
        { status: 403 }
      );
    }

    if (
      attempt.status !== "in_progress"
    ) {
      return NextResponse.json(
        {
          success: false,
          code: "ATTEMPT_ALREADY_FINISHED",
          message:
            "Bu urinish allaqachon yakunlangan.",
          status: attempt.status,
        },
        { status: 409 }
      );
    }

    const testId =
      String(attempt.test_id);

    const startedAt = new Date(
      String(attempt.started_at)
    );

    const durationMinutes =
      Number(attempt.duration_minutes);

    const expiresAt = new Date(
      startedAt.getTime() +
        durationMinutes * 60 * 1000
    );

    const now = new Date();

    /*
      Brauzer aynan 00:00 da avtomatik yuborganda
      internetdagi kichik kechikish sababli so‘rov
      serverga bir necha soniya kech yetib kelishi mumkin.

      Shu sabab faqat yuborish transporti uchun
      15 soniyalik server grace bor.

      Foydalanuvchi interfeysida esa vaqt baribir
      00:00 da bloklanadi.
    */
    if (
      now.getTime() >
      expiresAt.getTime() +
        SUBMIT_GRACE_MS
    ) {
      await sql`
        UPDATE national_certificate_attempts
        SET
          status = 'expired',
          submitted_at = NOW(),
          correct_count = 0,
          incorrect_count = 0,
          unanswered_count = 45,
          raw_score = 0,
          percentage = 0,
          updated_at = NOW()
        WHERE
          id = ${attemptId}
          AND status = 'in_progress'
      `;

      return NextResponse.json(
        {
          success: false,
          code: "TIME_EXPIRED",
          message:
            "Test uchun ajratilgan vaqt tugagan.",
          expired: true,
          expiresAt:
            expiresAt.toISOString(),
        },
        { status: 409 }
      );
    }

    const body = await request.json();

    const rawAnswers: unknown[] =
      Array.isArray(body?.answers)
        ? body.answers
        : [];

    const parsedAnswers: SubmittedAnswer[] =
      rawAnswers.map(
        (raw: unknown): SubmittedAnswer => {
          const item =
            raw &&
            typeof raw === "object"
              ? (raw as RawAnswer)
              : {};

          return {
            questionId:
              typeof item.questionId ===
              "string"
                ? item.questionId.trim()
                : "",

            selectedOptionId:
              typeof item.selectedOptionId ===
                "string" &&
              item.selectedOptionId.trim()
                ? item.selectedOptionId.trim()
                : null,

            openAnswerText:
              typeof item.openAnswerText ===
              "string"
                ? item.openAnswerText.trim()
                : "",
          };
        }
      );

    /*
      Bir savol tasodifan ikki marta yuborilsa,
      oxirgi yuborilgan qiymat olinadi.
    */
    const submittedMap =
      new Map<string, SubmittedAnswer>();

    for (const answer of parsedAnswers) {
      if (!answer.questionId) {
        continue;
      }

      submittedMap.set(
        answer.questionId,
        answer
      );
    }

    const questions = await sql`
      SELECT
        id,
        question_number,
        question_type,
        points
      FROM national_certificate_questions
      WHERE test_id = ${testId}
      ORDER BY question_number ASC
    `;

    if (questions.length !== 45) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Test savollari bazada to‘liq emas.",
        },
        { status: 409 }
      );
    }

    const questionIdSet = new Set(
      questions.map((question) =>
        String(question.id)
      )
    );

    for (
      const questionId of
      submittedMap.keys()
    ) {
      if (
        !questionIdSet.has(questionId)
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Testga tegishli bo‘lmagan savol yuborildi.",
          },
          { status: 400 }
        );
      }
    }

    /*
      To‘g‘ri yopiq javoblarni server bazadan oladi.
      Bu ma’lumot foydalanuvchi brauzeriga yuborilmaydi.
    */
    const options = await sql`
      SELECT
        o.id,
        o.question_id,
        o.is_correct
      FROM national_certificate_options o
      INNER JOIN national_certificate_questions q
        ON q.id = o.question_id
      WHERE q.test_id = ${testId}
    `;

    /*
      Ochiq savollarning qabul qilinadigan javoblari
      ham faqat server ichida olinadi.
    */
    const acceptedAnswers = await sql`
      SELECT
        a.question_id,
        a.normalized_answer
      FROM national_certificate_open_answers a
      INNER JOIN national_certificate_questions q
        ON q.id = a.question_id
      WHERE q.test_id = ${testId}
    `;

    const optionsByQuestion =
      new Map<
        string,
        {
          id: string;
          isCorrect: boolean;
        }[]
      >();

    for (const option of options) {
      const questionId =
        String(option.question_id);

      const current =
        optionsByQuestion.get(
          questionId
        ) || [];

      current.push({
        id: String(option.id),
        isCorrect:
          option.is_correct === true,
      });

      optionsByQuestion.set(
        questionId,
        current
      );
    }

    const openAnswersByQuestion =
      new Map<string, Set<string>>();

    for (
      const accepted of
      acceptedAnswers
    ) {
      const questionId =
        String(
          accepted.question_id
        );

      const current =
        openAnswersByQuestion.get(
          questionId
        ) || new Set<string>();

      current.add(
        String(
          accepted.normalized_answer
        )
      );

      openAnswersByQuestion.set(
        questionId,
        current
      );
    }

    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;
    let rawScore = 0;
    let maximumScore = 0;

    const rows: StoredAnswerRow[] =
      [];

    const questionResults: {
      questionId: string;
      questionNumber: number;
      answered: boolean;
      isCorrect: boolean | null;
      awardedPoints: number;
    }[] = [];

    for (const question of questions) {
      const questionId =
        String(question.id);

      const questionNumber =
        Number(
          question.question_number
        );

      const questionType =
        String(
          question.question_type
        );

      const questionPoints =
        Number(question.points);

      maximumScore +=
        Number.isFinite(
          questionPoints
        )
          ? questionPoints
          : 0;

      const submitted =
        submittedMap.get(
          questionId
        );

      if (
        questionType === "closed"
      ) {
        const selectedOptionId =
          submitted?.selectedOptionId ||
          null;

        if (!selectedOptionId) {
          unansweredCount += 1;

          rows.push({
            question_id:
              questionId,
            selected_option_id:
              null,
            open_answer_text:
              null,
            normalized_open_answer:
              null,
            is_correct:
              null,
            awarded_points: 0,
          });

          questionResults.push({
            questionId,
            questionNumber,
            answered: false,
            isCorrect: null,
            awardedPoints: 0,
          });

          continue;
        }

        const questionOptions =
          optionsByQuestion.get(
            questionId
          ) || [];

        const selectedOption =
          questionOptions.find(
            (option) =>
              option.id ===
              selectedOptionId
          );

        /*
          Variant boshqa savolga tegishli bo‘lsa
          yoki umuman mavjud bo‘lmasa, so‘rov rad qilinadi.
        */
        if (!selectedOption) {
          return NextResponse.json(
            {
              success: false,
              message:
                `${questionNumber}-savol uchun noto‘g‘ri javob varianti yuborildi.`,
            },
            { status: 400 }
          );
        }

        const isCorrect =
          selectedOption.isCorrect;

        const awardedPoints =
          isCorrect
            ? questionPoints
            : 0;

        if (isCorrect) {
          correctCount += 1;
          rawScore +=
            awardedPoints;
        } else {
          incorrectCount += 1;
        }

        rows.push({
          question_id:
            questionId,
          selected_option_id:
            selectedOptionId,
          open_answer_text:
            null,
          normalized_open_answer:
            null,
          is_correct:
            isCorrect,
          awarded_points:
            awardedPoints,
        });

        questionResults.push({
          questionId,
          questionNumber,
          answered: true,
          isCorrect,
          awardedPoints,
        });

        continue;
      }

      const openAnswerText =
        submitted?.openAnswerText ||
        "";

      if (!openAnswerText) {
        unansweredCount += 1;

        rows.push({
          question_id:
            questionId,
          selected_option_id:
            null,
          open_answer_text:
            null,
          normalized_open_answer:
            null,
          is_correct:
            null,
          awarded_points: 0,
        });

        questionResults.push({
          questionId,
          questionNumber,
          answered: false,
          isCorrect: null,
          awardedPoints: 0,
        });

        continue;
      }

      const normalized =
        normalizeAnswer(
          openAnswerText
        );

      const acceptedSet =
        openAnswersByQuestion.get(
          questionId
        ) || new Set<string>();

      const isCorrect =
        acceptedSet.has(
          normalized
        );

      const awardedPoints =
        isCorrect
          ? questionPoints
          : 0;

      if (isCorrect) {
        correctCount += 1;
        rawScore +=
          awardedPoints;
      } else {
        incorrectCount += 1;
      }

      rows.push({
        question_id:
          questionId,
        selected_option_id:
          null,
        open_answer_text:
          openAnswerText,
        normalized_open_answer:
          normalized,
        is_correct:
          isCorrect,
        awarded_points:
          awardedPoints,
      });

      questionResults.push({
        questionId,
        questionNumber,
        answered: true,
        isCorrect,
        awardedPoints,
      });
    }

    const percentage =
      maximumScore > 0
        ? Math.min(
            100,
            Math.max(
              0,
              (rawScore /
                maximumScore) *
                100
            )
          )
        : 0;

    /*
      45 ta javob holatini bir marta DBga yuboramiz.
      Har savol uchun alohida 45 ta INSERT qilinmaydi.
    */
    const rowsJson =
      JSON.stringify(rows);

    await sql`
      INSERT INTO national_certificate_attempt_answers (
        attempt_id,
        question_id,
        selected_option_id,
        open_answer_text,
        normalized_open_answer,
        is_correct,
        awarded_points,
        answered_at
      )
      SELECT
        ${attemptId}::uuid,
        x.question_id::uuid,
        NULLIF(
          x.selected_option_id,
          ''
        )::uuid,
        NULLIF(
          x.open_answer_text,
          ''
        ),
        NULLIF(
          x.normalized_open_answer,
          ''
        ),
        x.is_correct,
        x.awarded_points,
        NOW()
      FROM jsonb_to_recordset(
        ${rowsJson}::jsonb
      ) AS x(
        question_id text,
        selected_option_id text,
        open_answer_text text,
        normalized_open_answer text,
        is_correct boolean,
        awarded_points numeric
      )
      ON CONFLICT (
        attempt_id,
        question_id
      )
      DO UPDATE SET
        selected_option_id =
          EXCLUDED.selected_option_id,
        open_answer_text =
          EXCLUDED.open_answer_text,
        normalized_open_answer =
          EXCLUDED.normalized_open_answer,
        is_correct =
          EXCLUDED.is_correct,
        awarded_points =
          EXCLUDED.awarded_points,
        answered_at = NOW()
    `;

    const finalized = await sql`
      UPDATE national_certificate_attempts
      SET
        status = 'submitted',
        submitted_at = NOW(),
        correct_count =
          ${correctCount},
        incorrect_count =
          ${incorrectCount},
        unanswered_count =
          ${unansweredCount},
        raw_score =
          ${rawScore},
        percentage =
          ${percentage},
        updated_at = NOW()
      WHERE
        id = ${attemptId}
        AND user_key = ${userKey}
        AND status = 'in_progress'
      RETURNING
        id,
        status,
        started_at,
        submitted_at,
        correct_count,
        incorrect_count,
        unanswered_count,
        raw_score,
        percentage
    `;

    if (finalized.length === 0) {
      return NextResponse.json(
        {
          success: false,
          code:
            "ATTEMPT_ALREADY_FINISHED",
          message:
            "Urinishni qayta yakunlab bo‘lmaydi.",
        },
        { status: 409 }
      );
    }

    const finalAttempt =
      finalized[0];

    return NextResponse.json({
      success: true,

      message:
        "Test muvaffaqiyatli yakunlandi.",

      result: {
        attemptId:
          finalAttempt.id,

        testId,

        title:
          attempt.title,

        status:
          finalAttempt.status,

        correctCount:
          Number(
            finalAttempt.correct_count
          ),

        incorrectCount:
          Number(
            finalAttempt.incorrect_count
          ),

        unansweredCount:
          Number(
            finalAttempt.unanswered_count
          ),

        totalQuestions: 45,

        rawScore:
          Number(
            finalAttempt.raw_score
          ),

        maximumScore,

        percentage:
          Number(
            finalAttempt.percentage
          ),

        startedAt:
          new Date(
            String(
              finalAttempt.started_at
            )
          ).toISOString(),

        submittedAt:
          new Date(
            String(
              finalAttempt.submitted_at
            )
          ).toISOString(),

        questionResults,
      },
    });
  } catch (error) {
    console.error(
      "National certificate submit POST error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Testni yakunlashda server xatosi yuz berdi.",
      },
      { status: 500 }
    );
  }
}
