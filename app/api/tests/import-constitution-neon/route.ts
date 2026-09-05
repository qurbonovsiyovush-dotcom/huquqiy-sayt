import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const TEST_ID = "f04d6edc-2b6d-4b16-8919-aef671a402db";
const TEST_TITLE = "KONSTITUTSIYA — 840 TA TEST";
const TEST_SUBJECT = "Konstitutsiya (2023)";
const TEST_DESCRIPTION =
  "“KONSTITUTSIYA — 840 TA TEST” kitobidan 840 ta test elektron shaklda jamlandi. Muallif: Qurbonov S.J.";

type ImportOption = {
  id?: string;
  label?: string;
  key?: string;
  text?: string;
  isCorrect?: boolean;
};

type ImportQuestion = {
  id?: string;
  number?: number;
  questionNumber?: number;
  questionText?: string;
  questionHtml?: string;
  options?: ImportOption[];
  pdfCrop?: unknown;
  warning?: string;
};

async function isAdmin() {
  const cookieStore = await cookies();

  return (
    Boolean(cookieStore.get("qurbonov_session")?.value) &&
    cookieStore.get("qurbonov_role")?.value === "admin"
  );
}

function normalizeOptionKey(value: unknown) {
  const key = String(value || "").trim().toUpperCase();
  return ["A", "B", "C", "D"].includes(key) ? key : "";
}

function normalizeQuestion(raw: ImportQuestion) {
  const number = Number(raw?.number ?? raw?.questionNumber);

  const options = Array.isArray(raw?.options)
    ? raw.options
        .map((option) => ({
          key: normalizeOptionKey(option?.label ?? option?.key),
          text: String(option?.text || "").trim(),
          isCorrect: Boolean(option?.isCorrect),
        }))
        .filter((option: { key: string; text: string; isCorrect: boolean }) => option.key)
    : [];

  return {
    number,
    questionText: String(raw?.questionText || "").trim(),
    questionHtml: String(raw?.questionHtml || "").trim(),
    options,
    extra: {
      sourceId: raw?.id || null,
      pdfCrop: raw?.pdfCrop ?? null,
      warning: raw?.warning || null,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        {
          success: false,
          message: "Bu amal faqat administrator uchun.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const action = String(body?.action || "");

    if (action === "start") {
      const duration = Math.max(1, Number(body?.duration) || 180);
      const attemptLimitRaw = body?.attemptLimit;
      const attemptLimit =
        attemptLimitRaw === null || attemptLimitRaw === "" || attemptLimitRaw === undefined
          ? null
          : Math.max(1, Number(attemptLimitRaw) || 1);

      await sql`
        INSERT INTO legacy_tests (
          id,
          title,
          subject,
          duration,
          description,
          test_type,
          custom_test_type_name,
          status,
          attempt_limit,
          questions_json,
          extra_json,
          created_at,
          updated_at
        )
        VALUES (
          ${TEST_ID},
          ${TEST_TITLE},
          ${TEST_SUBJECT},
          ${duration},
          ${TEST_DESCRIPTION},
          'legislation',
          NULL,
          'draft',
          ${attemptLimit},
          '[]'::jsonb,
          ${JSON.stringify({ source: "constitution-840-pdf", expectedQuestions: 840 })}::jsonb,
          NOW(),
          NOW()
        )
        ON CONFLICT (id)
        DO UPDATE SET
          title = EXCLUDED.title,
          subject = EXCLUDED.subject,
          duration = EXCLUDED.duration,
          description = EXCLUDED.description,
          test_type = 'legislation',
          custom_test_type_name = NULL,
          status = 'draft',
          attempt_limit = EXCLUDED.attempt_limit,
          questions_json = '[]'::jsonb,
          extra_json = EXCLUDED.extra_json,
          updated_at = NOW()
      `;

      await sql`
        DELETE FROM legacy_test_questions
        WHERE test_id = ${TEST_ID}
      `;

      return NextResponse.json({
        success: true,
        message: "Konstitutsiya testi uchun Neon import boshlandi.",
        testId: TEST_ID,
      });
    }

    if (action === "questions") {
      const questionsRaw = Array.isArray(body?.questions) ? body.questions : [];

      if (questionsRaw.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Savollar topilmadi.",
          },
          { status: 400 }
        );
      }

      if (questionsRaw.length > 25) {
        return NextResponse.json(
          {
            success: false,
            message: "Bir so‘rovda ko‘pi bilan 25 ta savol yuboring.",
          },
          { status: 400 }
        );
      }

      const questions = questionsRaw.map(normalizeQuestion);

      for (const question of questions) {
        if (
          !Number.isInteger(question.number) ||
          question.number < 1 ||
          question.number > 840 ||
          !question.questionText
        ) {
          return NextResponse.json(
            {
              success: false,
              message: `Savol noto‘g‘ri: ${question.number || "raqamsiz"}.`,
            },
            { status: 400 }
          );
        }

        if (question.options.length !== 4) {
          return NextResponse.json(
            {
              success: false,
              message: `${question.number}-savolda A/B/C/D to‘liq emas.`,
            },
            { status: 400 }
          );
        }

        const correctCount = question.options.filter((option: { key: string; text: string; isCorrect: boolean }) => option.isCorrect).length;

        if (correctCount !== 1) {
          return NextResponse.json(
            {
              success: false,
              message: `${question.number}-savolda to‘g‘ri javoblar soni ${correctCount}. Aynan 1 ta bo‘lishi kerak.`,
            },
            { status: 400 }
          );
        }

        const rows = await sql`
          INSERT INTO legacy_test_questions (
            test_id,
            question_number,
            question_text,
            question_html,
            points,
            shapes_json,
            extra_json,
            created_at,
            updated_at
          )
          VALUES (
            ${TEST_ID},
            ${question.number},
            ${question.questionText},
            ${question.questionHtml || null},
            1,
            '[]'::jsonb,
            ${JSON.stringify(question.extra)}::jsonb,
            NOW(),
            NOW()
          )
          ON CONFLICT (test_id, question_number)
          DO UPDATE SET
            question_text = EXCLUDED.question_text,
            question_html = EXCLUDED.question_html,
            points = EXCLUDED.points,
            shapes_json = EXCLUDED.shapes_json,
            extra_json = EXCLUDED.extra_json,
            updated_at = NOW()
          RETURNING id
        `;

        const questionId = Number(rows?.[0]?.id);

        if (!questionId) {
          throw new Error(`${question.number}-savol ID sini olishda xatolik.`);
        }

        await sql`
          DELETE FROM legacy_test_options
          WHERE question_id = ${questionId}
        `;

        for (const option of question.options) {
          await sql`
            INSERT INTO legacy_test_options (
              question_id,
              option_key,
              option_text,
              option_html,
              is_correct,
              extra_json,
              created_at,
              updated_at
            )
            VALUES (
              ${questionId},
              ${option.key},
              ${option.text},
              NULL,
              ${option.isCorrect},
              '{}'::jsonb,
              NOW(),
              NOW()
            )
          `;
        }
      }

      const countRows = await sql`
        SELECT COUNT(*)::int AS count
        FROM legacy_test_questions
        WHERE test_id = ${TEST_ID}
      `;

      return NextResponse.json({
        success: true,
        imported: questions.length,
        totalSaved: Number(countRows?.[0]?.count || 0),
      });
    }

    if (action === "finish") {
      const questionRows = await sql`
        SELECT COUNT(*)::int AS count
        FROM legacy_test_questions
        WHERE test_id = ${TEST_ID}
      `;

      const optionRows = await sql`
        SELECT COUNT(*)::int AS count
        FROM legacy_test_options o
        INNER JOIN legacy_test_questions q
          ON q.id = o.question_id
        WHERE q.test_id = ${TEST_ID}
      `;

      const correctRows = await sql`
        SELECT COUNT(*)::int AS count
        FROM legacy_test_options o
        INNER JOIN legacy_test_questions q
          ON q.id = o.question_id
        WHERE q.test_id = ${TEST_ID}
          AND o.is_correct = TRUE
      `;

      const questionCount = Number(questionRows?.[0]?.count || 0);
      const optionCount = Number(optionRows?.[0]?.count || 0);
      const correctCount = Number(correctRows?.[0]?.count || 0);

      if (questionCount !== 840 || optionCount !== 3360 || correctCount !== 840) {
        return NextResponse.json(
          {
            success: false,
            message:
              `Import tugallanmadi. Savol: ${questionCount}/840, variant: ${optionCount}/3360, to‘g‘ri javob: ${correctCount}/840.`,
            questionCount,
            optionCount,
            correctCount,
          },
          { status: 409 }
        );
      }

      await sql`
        UPDATE legacy_tests
        SET
          status = 'published',
          questions_json = '[]'::jsonb,
          extra_json = ${JSON.stringify({
            source: "constitution-840-pdf",
            expectedQuestions: 840,
            importedQuestions: 840,
            importedOptions: 3360,
            completed: true,
          })}::jsonb,
          updated_at = NOW()
        WHERE id = ${TEST_ID}
      `;

      return NextResponse.json({
        success: true,
        message: "Tayyor! 840 ta savol va 3360 ta variant Neon bazasiga saqlandi va test e’lon qilindi.",
        testId: TEST_ID,
        questionCount,
        optionCount,
        correctCount,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: "Noma’lum action.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("CONSTITUTION NEON IMPORT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Konstitutsiya testini Neon bazasiga import qilishda xatolik.",
      },
      { status: 500 }
    );
  }
}
