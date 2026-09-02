import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasSession(request: NextRequest) {
  const session =
    request.cookies.get("qurbonov_session")?.value;

  return Boolean(session);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!hasSession(request)) {
      return NextResponse.json(
        {
          success: false,
          message: "Testni ishlash uchun tizimga kirish kerak.",
        },
        { status: 401 }
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
        attempt_limit
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

    const test = tests[0];

    if (test.status !== "published") {
      return NextResponse.json(
        {
          success: false,
          message: "Bu test hali e’lon qilinmagan.",
        },
        { status: 403 }
      );
    }

    const questions = await sql`
      SELECT
        id,
        question_number,
        question_type,
        question_text,
        question_html,
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
            "Test savollari to‘liq emas. Administratorga murojaat qiling.",
        },
        { status: 409 }
      );
    }

    const options = await sql`
      SELECT
        o.id,
        o.question_id,
        o.option_key,
        o.option_text,
        o.option_html,
        o.sort_order
      FROM national_certificate_options o
      INNER JOIN national_certificate_questions q
        ON q.id = o.question_id
      WHERE q.test_id = ${testId}
      ORDER BY
        q.question_number ASC,
        o.sort_order ASC,
        o.option_key ASC
    `;

    const publicQuestions =
      questions.map((question) => {
        const questionId =
          String(question.id);

        if (
          question.question_type ===
          "closed"
        ) {
          return {
            id: question.id,
            questionNumber:
              Number(
                question.question_number
              ),
            questionType: "closed",
            questionText:
              question.question_text,
            questionHtml:
              question.question_html || "",
            points:
              Number(question.points),
            options: options
              .filter(
                (option) =>
                  String(
                    option.question_id
                  ) === questionId
              )
              .map((option) => ({
                id: option.id,
                key:
                  option.option_key,
                text:
                  option.option_text,
                html:
                  option.option_html || "",
                sortOrder:
                  Number(
                    option.sort_order
                  ),
              })),
          };
        }

        return {
          id: question.id,
          questionNumber:
            Number(
              question.question_number
            ),
          questionType: "open",
          questionText:
            question.question_text,
          questionHtml:
            question.question_html || "",
          points:
            Number(question.points),
          options: [],
        };
      });

    return NextResponse.json(
      {
        success: true,

        test: {
          id: test.id,
          title: test.title,
          description:
            test.description || "",
          subject: test.subject,

          durationMinutes:
            Number(
              test.duration_minutes
            ),

          closedQuestionCount:
            Number(
              test.closed_question_count
            ),

          openQuestionCount:
            Number(
              test.open_question_count
            ),

          totalQuestions:
            Number(
              test.total_questions
            ),

          attemptLimit:
            test.attempt_limit === null
              ? null
              : Number(
                  test.attempt_limit
                ),

          questions:
            publicQuestions,
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
      "National certificate public test GET error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Testni yuklashda server xatosi yuz berdi.",
      },
      { status: 500 }
    );
  }
}
