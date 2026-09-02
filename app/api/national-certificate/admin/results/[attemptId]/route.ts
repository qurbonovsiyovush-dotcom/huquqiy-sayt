import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdmin(request: NextRequest) {
  const session =
    request.cookies.get("qurbonov_session")?.value;

  const role =
    request.cookies.get("qurbonov_role")?.value;

  return Boolean(session) && role === "admin";
}

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      attemptId: string;
    }>;
  }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Faqat administrator batafsil natijani ko‘rishi mumkin.",
        },
        { status: 403 }
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

    /*
     * 1. URINISH VA TEST MA'LUMOTLARI
     */
    const attempts = await sql`
      SELECT
        a.id,
        a.test_id,
        a.user_name,
        a.user_key,
        a.status,
        a.started_at,
        a.submitted_at,
        a.correct_count,
        a.incorrect_count,
        a.unanswered_count,
        a.raw_score,
        a.percentage,
        a.created_at,

        t.title AS test_title,
        t.description AS test_description,
        t.duration_minutes,
        t.total_questions

      FROM national_certificate_attempts a

      JOIN national_certificate_tests t
        ON t.id = a.test_id

      WHERE a.id = ${attemptId}

      LIMIT 1
    `;

    if (attempts.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Natija topilmadi.",
        },
        { status: 404 }
      );
    }

    const attempt = attempts[0];

    /*
     * 2. TESTNING BARCHA SAVOLLARI
     *
     * Foydalanuvchi javob bergan bo‘lsa,
     * attempt_answers bilan birlashtiriladi.
     */
    const questions = await sql`
      SELECT
        q.id,
        q.question_number,
        q.question_type,
        q.question_text,
        q.question_html,
        q.points,

        aa.selected_option_id,
        aa.open_answer_text,
        aa.is_correct,
        aa.awarded_points,
        aa.answered_at

      FROM national_certificate_questions q

      LEFT JOIN national_certificate_attempt_answers aa
        ON aa.question_id = q.id
        AND aa.attempt_id = ${attemptId}

      WHERE q.test_id = ${attempt.test_id}

      ORDER BY q.question_number ASC
    `;

    const questionIds = questions.map(
      (question) => String(question.id)
    );

    /*
     * 3. YOPIQ SAVOLLAR VARIANTLARI
     */
    let options: any[] = [];

    if (questionIds.length > 0) {
      options = await sql`
        SELECT
          id,
          question_id,

          "key" AS option_key,
          "text" AS option_text,
          "html" AS option_html,

          is_correct,
          sort_order

        FROM national_certificate_options

        WHERE question_id =
          ANY(${questionIds}::uuid[])

        ORDER BY
          question_id,
          sort_order ASC
      `;
    }

    /*
     * 4. OCHIQ SAVOLLARNING
     * QABUL QILINADIGAN JAVOBLARI
     */
    let acceptedAnswers: any[] = [];

    if (questionIds.length > 0) {
      acceptedAnswers = await sql`
        SELECT
          id,
          question_id,
          answer_text,
          normalized_answer

        FROM national_certificate_open_answers

        WHERE question_id =
          ANY(${questionIds}::uuid[])

        ORDER BY
          question_id,
          answer_text
      `;
    }

    /*
     * 5. VARIANTLARNI SAVOLLAR BO‘YICHA
     * GURUHLASH
     */
    const optionsByQuestion =
      new Map<string, any[]>();

    for (const option of options) {
      const questionId =
        String(option.question_id);

      if (!optionsByQuestion.has(questionId)) {
        optionsByQuestion.set(
          questionId,
          []
        );
      }

      optionsByQuestion
        .get(questionId)!
        .push({
          id: String(option.id),

          key:
            option.option_key || "",

          text:
            option.option_text || "",

          html:
            option.option_html || "",

          isCorrect:
            Boolean(option.is_correct),

          sortOrder:
            Number(option.sort_order || 0),
        });
    }

    /*
     * 6. OCHIQ JAVOBLARNI
     * SAVOLLAR BO‘YICHA GURUHLASH
     */
    const answersByQuestion =
      new Map<string, any[]>();

    for (const answer of acceptedAnswers) {
      const questionId =
        String(answer.question_id);

      if (!answersByQuestion.has(questionId)) {
        answersByQuestion.set(
          questionId,
          []
        );
      }

      answersByQuestion
        .get(questionId)!
        .push({
          id: String(answer.id),

          answerText:
            answer.answer_text || "",

          normalizedAnswer:
            answer.normalized_answer || "",
        });
    }

    /*
     * 7. HAR BIR SAVOL UCHUN
     * BATAFSIL NATIJA TAYYORLASH
     */
    const detailedQuestions =
      questions.map((question) => {
        const questionId =
          String(question.id);

        const questionOptions =
          optionsByQuestion.get(questionId) || [];

        const accepted =
          answersByQuestion.get(questionId) || [];

        /*
         * Foydalanuvchi tanlagan variant
         */
        const selectedOption =
          question.selected_option_id
            ? questionOptions.find(
                (option) =>
                  option.id ===
                  String(
                    question.selected_option_id
                  )
              ) || null
            : null;

        /*
         * To‘g‘ri variant
         */
        const correctOption =
          question.question_type === "closed"
            ? questionOptions.find(
                (option) =>
                  option.isCorrect
              ) || null
            : null;

        /*
         * Savolga umuman javob berilganmi?
         */
        const answered =
          question.question_type === "closed"
            ? Boolean(
                question.selected_option_id
              )
            : Boolean(
                String(
                  question.open_answer_text || ""
                ).trim()
              );

        /*
         * Agar javobsiz bo‘lsa,
         * isCorrect = null bo‘ladi.
         */
        const isCorrect =
          !answered
            ? null
            : question.is_correct === null ||
              question.is_correct === undefined
            ? null
            : Boolean(question.is_correct);

        return {
          id: questionId,

          questionNumber:
            Number(
              question.question_number
            ),

          questionType:
            question.question_type,

          questionText:
            question.question_text || "",

          questionHtml:
            question.question_html || "",

          points:
            Number(
              question.points || 0
            ),

          answered,

          isCorrect,

          awardedPoints:
            Number(
              question.awarded_points || 0
            ),

          answeredAt:
            question.answered_at
              ? new Date(
                  String(
                    question.answered_at
                  )
                ).toISOString()
              : null,

          /*
           * Yopiq savol
           */
          selectedOption,

          correctOption,

          options:
            questionOptions,

          /*
           * Ochiq savol
           */
          openAnswerText:
            question.open_answer_text || "",

          acceptedAnswers:
            accepted,
        };
      });

    /*
     * 8. FRONTENDGA NATIJA
     */
    return NextResponse.json(
      {
        success: true,

        result: {
          attemptId:
            String(attempt.id),

          testId:
            String(attempt.test_id),

          testTitle:
            attempt.test_title || "",

          testDescription:
            attempt.test_description || "",

          userName:
            attempt.user_name?.trim() ||
            "Noma’lum foydalanuvchi",

          status:
            attempt.status,

          durationMinutes:
            Number(
              attempt.duration_minutes || 0
            ),

          totalQuestions:
            Number(
              attempt.total_questions || 0
            ),

          correctCount:
            Number(
              attempt.correct_count || 0
            ),

          incorrectCount:
            Number(
              attempt.incorrect_count || 0
            ),

          unansweredCount:
            Number(
              attempt.unanswered_count || 0
            ),

          rawScore:
            Number(
              attempt.raw_score || 0
            ),

          percentage:
            Number(
              attempt.percentage || 0
            ),

          startedAt:
            attempt.started_at
              ? new Date(
                  String(attempt.started_at)
                ).toISOString()
              : null,

          submittedAt:
            attempt.submitted_at
              ? new Date(
                  String(
                    attempt.submitted_at
                  )
                ).toISOString()
              : null,

          questions:
            detailedQuestions,
        },
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
      "National certificate detailed result GET error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Batafsil natijani yuklashda xatolik yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}
