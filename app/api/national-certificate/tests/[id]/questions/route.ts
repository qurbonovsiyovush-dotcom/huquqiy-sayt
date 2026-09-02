import { randomUUID } from "crypto";
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
    /*
      ============================================================
      1. FAQAT ADMIN
      ============================================================
    */

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

    /*
      ============================================================
      2. TESTNI TEKSHIRAMIZ
      ============================================================
    */

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

    /*
      E'lon qilingan testning savollarini hozircha o'zgartirmaymiz.
      Bu foydalanuvchilarning eski natijalari buzilib ketishining
      oldini oladi.
    */

    if (tests[0].status !== "draft") {
      return NextResponse.json(
        {
          success: false,
          message:
            "E’lon qilingan test savollarini tahrirlab bo‘lmaydi. Avval testni qoralama holatiga qaytaring.",
        },
        { status: 409 }
      );
    }

    /*
      ============================================================
      3. BODY
      ============================================================
    */

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

    /*
      ============================================================
      4. UMUMIY VALIDATSIYA
      ============================================================
    */

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

    /*
      Savol turi CLIENT yuborgan qiymatdan olinmaydi.

      1–35  = yopiq
      36–45 = ochiq

      Shuning uchun foydalanuvchi requestni o'zgartirib ham
      formatni buzolmaydi.
    */

    const questionType =
      questionNumber <= 35 ? "closed" : "open";

    /*
      ============================================================
      5. YOPIQ SAVOL
      ============================================================
    */

    if (questionType === "closed") {
      const rawOptions: ClosedOptionInput[] =
        Array.isArray(body.options) ? body.options : [];

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

      const expectedKeys = ["A", "B", "C", "D"];

      const options = rawOptions.map((option, index) => {
        const key = String(
          option?.key || expectedKeys[index]
        )
          .trim()
          .toUpperCase();

        const text =
          typeof option?.text === "string"
            ? option.text.trim()
            : "";

        const html =
          typeof option?.html === "string"
            ? option.html.trim()
            : "";

        return {
          option_key: key,
          option_text: text,
          option_html: html,
          is_correct: option?.isCorrect === true,
          sort_order: index,
        };
      });

      /*
        A, B, C, D dan boshqa kalitga ruxsat bermaymiz.
      */

      const actualKeys = options.map(
        (option) => option.option_key
      );

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

      /*
        Variant matni bo'sh bo'lishi mumkin emas.
      */

      if (
        options.some(
          (option) => !option.option_text
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "A, B, C va D variantlarining barchasini kiriting.",
          },
          { status: 400 }
        );
      }

      /*
        Faqat BITTA to'g'ri javob.
      */

      const correctCount = options.filter(
        (option) => option.is_correct
      ).length;

      if (correctCount !== 1) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Yopiq savolda aynan bitta to‘g‘ri javob belgilanashi kerak.",
          },
          { status: 400 }
        );
      }

      /*
        Yangi UUID'ni serverning o'zi yaratadi.
      */

      const questionId = randomUUID();

      /*
        Bitta SQL statement ichida:

        1. Shu raqamdagi eski savolni o'chiramiz.
        2. Yangi savolni yozamiz.
        3. A/B/C/D variantlarini yozamiz.

        Eski savol o'chirilganda uning eski variantlari
        ON DELETE CASCADE orqali avtomatik o'chadi.
      */

      await sql`
        WITH deleted_question AS (
          DELETE FROM national_certificate_questions
          WHERE
            test_id = ${testId}
            AND question_number = ${questionNumber}
          RETURNING id
        ),
        inserted_question AS (
          INSERT INTO national_certificate_questions (
            id,
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
            ${questionId},
            ${testId},
            ${questionNumber},
            'closed',
            ${questionText},
            ${questionHtml},
            ${points},
            NOW(),
            NOW()
          )
          RETURNING id
        )
        INSERT INTO national_certificate_options (
          question_id,
          option_key,
          option_text,
          option_html,
          is_correct,
          sort_order
        )
        SELECT
          inserted_question.id,
          option_data.option_key,
          option_data.option_text,
          option_data.option_html,
          option_data.is_correct,
          option_data.sort_order
        FROM inserted_question
        CROSS JOIN jsonb_to_recordset(
          ${JSON.stringify(options)}::jsonb
        ) AS option_data(
          option_key TEXT,
          option_text TEXT,
          option_html TEXT,
          is_correct BOOLEAN,
          sort_order INTEGER
        )
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

    /*
      ============================================================
      6. OCHIQ SAVOL
      ============================================================
    */

    const rawAcceptedAnswers = Array.isArray(
      body.acceptedAnswers
    )
      ? body.acceptedAnswers
      : [];

    /*
      Ochiq savolda kamida bitta qabul qilinadigan javob bo'lishi shart.
    */

    const acceptedAnswers = rawAcceptedAnswers
      .map((value: unknown) => {
        const answerText =
          typeof value === "string"
            ? value.trim()
            : "";

        return {
          answer_text: answerText,
          normalized_answer:
            normalizeAnswer(answerText),
        };
      })
      .filter(
        (answer: {
          answer_text: string;
          normalized_answer: string;
        }) =>
          answer.answer_text &&
          answer.normalized_answer
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

    /*
      Normalizatsiyadan keyin takroriy javoblarni chiqaramiz.

      Masalan:
      "Konstitutsiya"
      " konstitutsiya "
      bir xil javob hisoblanadi.
    */

    const uniqueAnswers = Array.from(
      new Map(
        acceptedAnswers.map(
          (answer: {
            answer_text: string;
            normalized_answer: string;
          }) => [
            answer.normalized_answer,
            answer,
          ]
        )
      ).values()
    );

    const questionId = randomUUID();

    /*
      Bitta SQL statement ichida:

      1. Eski savolni o'chiramiz.
      2. Ochiq savolni yozamiz.
      3. Barcha qabul qilinadigan javoblarni yozamiz.
    */

    await sql`
      WITH deleted_question AS (
        DELETE FROM national_certificate_questions
        WHERE
          test_id = ${testId}
          AND question_number = ${questionNumber}
        RETURNING id
      ),
      inserted_question AS (
        INSERT INTO national_certificate_questions (
          id,
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
          ${questionId},
          ${testId},
          ${questionNumber},
          'open',
          ${questionText},
          ${questionHtml},
          ${points},
          NOW(),
          NOW()
        )
        RETURNING id
      )
      INSERT INTO national_certificate_open_answers (
        question_id,
        answer_text,
        normalized_answer
      )
      SELECT
        inserted_question.id,
        answer_data.answer_text,
        answer_data.normalized_answer
      FROM inserted_question
      CROSS JOIN jsonb_to_recordset(
        ${JSON.stringify(uniqueAnswers)}::jsonb
      ) AS answer_data(
        answer_text TEXT,
        normalized_answer TEXT
      )
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
