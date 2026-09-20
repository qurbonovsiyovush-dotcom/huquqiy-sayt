import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ClosedOptionInput = {
  key?: string;
  text?: string;
  html?: string;
  isCorrect?: boolean;
};

type NormalizedAnswer = {
  answer_text: string;
  normalized_answer: string;
};

function isAdmin(request: NextRequest) {
  const session = request.cookies.get("qurbonov_session")?.value;
  const role = request.cookies.get("qurbonov_role")?.value;

  return Boolean(session) && role === "admin";
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
  context: { params: Promise<{ id: string }> }
) {
  try {
    // ============================================================
    // 1. FAQAT ADMIN
    // ============================================================

    if (!isAdmin(request)) {
      return NextResponse.json(
        {
          success: false,
          message: "Faqat administrator savol saqlashi mumkin.",
        },
        { status: 403 }
      );
    }

    const { id: testId } = await context.params;

    if (!testId) {
      return NextResponse.json(
        {
          success: false,
          message: "Test ID topilmadi.",
        },
        { status: 400 }
      );
    }

    // ============================================================
    // 2. TESTNI TEKSHIRISH
    // ============================================================

    const tests = await sql`
      SELECT
        id,
        status
      FROM national_certificate_tests
      WHERE id = ${testId}
      LIMIT 1
    `;

    if (tests.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Test topilmadi.",
        },
        { status: 404 }
      );
    }

    if (tests[0].status !== "draft") {
      return NextResponse.json(
        {
          success: false,
          message:
            "E’lon qilingan test savollarini tahrirlab bo‘lmaydi.",
        },
        { status: 409 }
      );
    }

    // ============================================================
    // 3. BODY
    // ============================================================

    const body = await request.json();

    const questionNumber = Number(body.questionNumber);

    const questionText =
      typeof body.questionText === "string"
        ? body.questionText.trim()
        : "";

    const questionHtml =
      typeof body.questionHtml === "string"
        ? body.questionHtml.trim()
        : "";

    const points =
      body.points === undefined ||
      body.points === null ||
      body.points === ""
        ? 1
        : Number(body.points);

    // ============================================================
    // 4. UMUMIY VALIDATSIYA
    // ============================================================

    if (
      !Number.isInteger(questionNumber) ||
      questionNumber < 1 ||
      questionNumber > 45
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Savol raqami 1 dan 45 gacha bo‘lishi kerak.",
        },
        { status: 400 }
      );
    }

    if (!questionText) {
      return NextResponse.json(
        {
          success: false,
          message: "Savol matnini kiriting.",
        },
        { status: 400 }
      );
    }

    if (!Number.isFinite(points) || points < 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Savol bali noto‘g‘ri.",
        },
        { status: 400 }
      );
    }

    const questionType: "closed" | "open" =
      questionNumber <= 35 ? "closed" : "open";

    // ============================================================
    // 5. YOPIQ SAVOL
    // ============================================================

    if (questionType === "closed") {
      const rawOptions: ClosedOptionInput[] = Array.isArray(body.options)
        ? body.options
        : [];

      if (rawOptions.length !== 4) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Yopiq savolda aynan 4 ta javob varianti bo‘lishi kerak.",
          },
          { status: 400 }
        );
      }

      const expectedKeys = ["A", "B", "C", "D"] as const;

      const options = rawOptions.map((option, index) => {
        const key = String(option?.key || expectedKeys[index])
          .trim()
          .toUpperCase();

        const text =
          typeof option?.text === "string" ? option.text.trim() : "";

        const html =
          typeof option?.html === "string" ? option.html.trim() : "";

        return {
          option_key: key,
          option_text: text,
          option_html: html,
          is_correct: option?.isCorrect === true,
          sort_order: index,
        };
      });

      const actualKeys = options.map((option) => option.option_key);

      if (
        actualKeys.length !== 4 ||
        !expectedKeys.every(
          (key, index) => actualKeys[index] === key
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Variantlar A, B, C, D tartibida bo‘lishi kerak.",
          },
          { status: 400 }
        );
      }

      if (options.some((option) => !option.option_text)) {
        return NextResponse.json(
          {
            success: false,
            message:
              "A, B, C va D variantlarining barchasini kiriting.",
          },
          { status: 400 }
        );
      }

      const correctCount = options.filter(
        (option) => option.is_correct
      ).length;

      if (correctCount !== 1) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Yopiq savolda aynan bitta to‘g‘ri javob belgilanishi kerak.",
          },
          { status: 400 }
        );
      }

      // ============================================================
      // 5.1 SAVOLNI UPSERT QILISH
      // ============================================================

      const questionResult = await sql`
        INSERT INTO national_certificate_questions (
          test_id,
          question_number,
          question_type,
          question_text,
          question_html,
          points,
          created_at,
          updated_at
        )
        VALUES (
          ${testId},
          ${questionNumber},
          'closed',
          ${questionText},
          ${questionHtml},
          ${points},
          NOW(),
          NOW()
        )
        ON CONFLICT (test_id, question_number)
        DO UPDATE SET
          question_type = EXCLUDED.question_type,
          question_text = EXCLUDED.question_text,
          question_html = EXCLUDED.question_html,
          points = EXCLUDED.points,
          updated_at = NOW()
        RETURNING id
      `;

      const questionId = String(questionResult[0].id);

      // Agar bu savol ilgari ochiq bo‘lgan bo‘lsa,
      // ochiq javoblarini tozalaymiz.

      await sql`
        DELETE FROM national_certificate_open_answers
        WHERE question_id = ${questionId}
      `;

      // ============================================================
      // 5.2 A VARIANT
      // ============================================================

      await sql`
        INSERT INTO national_certificate_options (
          question_id,
          option_key,
          option_text,
          option_html,
          is_correct,
          sort_order
        )
        VALUES (
          ${questionId},
          'A',
          ${options[0].option_text},
          ${options[0].option_html},
          ${options[0].is_correct},
          0
        )
        ON CONFLICT (question_id, option_key)
        DO UPDATE SET
          option_text = EXCLUDED.option_text,
          option_html = EXCLUDED.option_html,
          is_correct = EXCLUDED.is_correct,
          sort_order = EXCLUDED.sort_order
      `;

      // ============================================================
      // 5.3 B VARIANT
      // ============================================================

      await sql`
        INSERT INTO national_certificate_options (
          question_id,
          option_key,
          option_text,
          option_html,
          is_correct,
          sort_order
        )
        VALUES (
          ${questionId},
          'B',
          ${options[1].option_text},
          ${options[1].option_html},
          ${options[1].is_correct},
          1
        )
        ON CONFLICT (question_id, option_key)
        DO UPDATE SET
          option_text = EXCLUDED.option_text,
          option_html = EXCLUDED.option_html,
          is_correct = EXCLUDED.is_correct,
          sort_order = EXCLUDED.sort_order
      `;

      // ============================================================
      // 5.4 C VARIANT
      // ============================================================

      await sql`
        INSERT INTO national_certificate_options (
          question_id,
          option_key,
          option_text,
          option_html,
          is_correct,
          sort_order
        )
        VALUES (
          ${questionId},
          'C',
          ${options[2].option_text},
          ${options[2].option_html},
          ${options[2].is_correct},
          2
        )
        ON CONFLICT (question_id, option_key)
        DO UPDATE SET
          option_text = EXCLUDED.option_text,
          option_html = EXCLUDED.option_html,
          is_correct = EXCLUDED.is_correct,
          sort_order = EXCLUDED.sort_order
      `;

      // ============================================================
      // 5.5 D VARIANT
      // ============================================================

      await sql`
        INSERT INTO national_certificate_options (
          question_id,
          option_key,
          option_text,
          option_html,
          is_correct,
          sort_order
        )
        VALUES (
          ${questionId},
          'D',
          ${options[3].option_text},
          ${options[3].option_html},
          ${options[3].is_correct},
          3
        )
        ON CONFLICT (question_id, option_key)
        DO UPDATE SET
          option_text = EXCLUDED.option_text,
          option_html = EXCLUDED.option_html,
          is_correct = EXCLUDED.is_correct,
          sort_order = EXCLUDED.sort_order
      `;

      await sql`
        UPDATE national_certificate_tests
        SET updated_at = NOW()
        WHERE id = ${testId}
      `;

      return NextResponse.json(
        {
          success: true,
          message: `${questionNumber}-savol saqlandi.`,
          question: {
            id: questionId,
            question_number: questionNumber,
            question_type: "closed",
          },
        },
        { status: 200 }
      );
    }

    // ============================================================
    // 6. OCHIQ SAVOL
    // ============================================================

    const rawAcceptedAnswers: unknown[] = Array.isArray(
      body.acceptedAnswers
    )
      ? body.acceptedAnswers
      : [];

    const acceptedAnswers: NormalizedAnswer[] =
      rawAcceptedAnswers
        .map((value: unknown): NormalizedAnswer => {
          const answerText =
            typeof value === "string" ? value.trim() : "";

          return {
            answer_text: answerText,
            normalized_answer: normalizeAnswer(answerText),
          };
        })
        .filter(
          (answer: NormalizedAnswer) =>
            Boolean(
              answer.answer_text &&
                answer.normalized_answer
            )
        );

    if (acceptedAnswers.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Ochiq savol uchun kamida bitta to‘g‘ri javob kiriting.",
        },
        { status: 400 }
      );
    }

    // ============================================================
    // 6.1 TAKRORIY JAVOBLARNI OLIB TASHLASH
    // ============================================================

    const answerMap = new Map<string, NormalizedAnswer>();

    for (const answer of acceptedAnswers) {
      answerMap.set(answer.normalized_answer, answer);
    }

    const uniqueAnswers: NormalizedAnswer[] = Array.from(
      answerMap.values()
    );

    // ============================================================
    // 6.2 SAVOLNI UPSERT QILISH
    // ============================================================

    const questionResult = await sql`
      INSERT INTO national_certificate_questions (
        test_id,
        question_number,
        question_type,
        question_text,
        question_html,
        points,
        created_at,
        updated_at
      )
      VALUES (
        ${testId},
        ${questionNumber},
        'open',
        ${questionText},
        ${questionHtml},
        ${points},
        NOW(),
        NOW()
      )
      ON CONFLICT (test_id, question_number)
      DO UPDATE SET
        question_type = EXCLUDED.question_type,
        question_text = EXCLUDED.question_text,
        question_html = EXCLUDED.question_html,
        points = EXCLUDED.points,
        updated_at = NOW()
      RETURNING id
    `;

    const questionId = String(questionResult[0].id);

    // Ochiq savolda A/B/C/D bo‘lmasligi kerak.

    await sql`
      DELETE FROM national_certificate_options
      WHERE question_id = ${questionId}
    `;

    // Eski ochiq javoblarni tozalaymiz.

    await sql`
      DELETE FROM national_certificate_open_answers
      WHERE question_id = ${questionId}
    `;

    // ============================================================
    // 6.3 YANGI QABUL QILINADIGAN JAVOBLARNI YOZISH
    // ============================================================

    for (const answer of uniqueAnswers) {
      await sql`
        INSERT INTO national_certificate_open_answers (
          question_id,
          answer_text,
          normalized_answer
        )
        VALUES (
          ${questionId},
          ${answer.answer_text},
          ${answer.normalized_answer}
        )
      `;
    }

    await sql`
      UPDATE national_certificate_tests
      SET updated_at = NOW()
      WHERE id = ${testId}
    `;

    return NextResponse.json(
      {
        success: true,
        message: `${questionNumber}-savol saqlandi.`,
        question: {
          id: questionId,
          question_number: questionNumber,
          question_type: "open",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "National certificate question POST error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Savolni saqlashda server xatosi yuz berdi.",
      },
      { status: 500 }
    );
  }
}
