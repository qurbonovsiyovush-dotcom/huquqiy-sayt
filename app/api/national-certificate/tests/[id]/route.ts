import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdmin(request: NextRequest) {
  const session = request.cookies.get("qurbonov_session")?.value;
  const role = request.cookies.get("qurbonov_role")?.value;

  return Boolean(session) && role === "admin";
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json(
        {
          success: false,
          message: "Faqat administrator foydalanishi mumkin.",
        },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Test ID topilmadi.",
        },
        { status: 400 }
      );
    }

    const tests = await sql`
      SELECT
        id,
        title,
        description,
        subject,
        status,
        duration_minutes,
        closed_question_count,
        open_question_count,
        total_questions,
        attempt_limit,
        created_at,
        updated_at
      FROM national_certificate_tests
      WHERE id = ${id}
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

    const questions = await sql`
      SELECT
        id,
        test_id,
        question_number,
        question_type,
        question_text,
        question_html,
        points,
        created_at,
        updated_at
      FROM national_certificate_questions
      WHERE test_id = ${id}
      ORDER BY question_number ASC
    `;

    const questionIds = questions.map((question) => question.id);

    let options: Record<string, unknown>[] = [];
    let openAnswers: Record<string, unknown>[] = [];

    if (questionIds.length > 0) {
      options = await sql`
        SELECT
          id,
          question_id,
          option_key,
          option_text,
          option_html,
          is_correct,
          sort_order,
          created_at
        FROM national_certificate_options
        WHERE question_id = ANY(${questionIds}::uuid[])
        ORDER BY question_id, sort_order, option_key
      `;

      openAnswers = await sql`
        SELECT
          id,
          question_id,
          answer_text,
          normalized_answer,
          created_at
        FROM national_certificate_open_answers
        WHERE question_id = ANY(${questionIds}::uuid[])
        ORDER BY created_at ASC
      `;
    }

    const fullQuestions = questions.map((question) => {
      const questionId = String(question.id);

      if (question.question_type === "closed") {
        return {
          ...question,
          options: options.filter(
            (option) =>
              String(option.question_id) === questionId
          ),
          acceptedAnswers: [],
        };
      }

      return {
        ...question,
        options: [],
        acceptedAnswers: openAnswers.filter(
          (answer) =>
            String(answer.question_id) === questionId
        ),
      };
    });

    return NextResponse.json({
      success: true,
      test: {
        ...tests[0],
        questions: fullQuestions,
      },
    });
  } catch (error) {
    console.error(
      "National certificate test GET by id error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Test ma’lumotlarini yuklashda xatolik yuz berdi.",
      },
      { status: 500 }
    );
  }
}
