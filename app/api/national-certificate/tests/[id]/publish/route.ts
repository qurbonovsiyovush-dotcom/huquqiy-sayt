import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdmin(request: NextRequest) {
  const session = request.cookies.get("qurbonov_session")?.value;
  const role = request.cookies.get("qurbonov_role")?.value;

  return Boolean(session) && role === "admin";
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json(
        {
          success: false,
          message: "Faqat administrator testni e’lon qilishi mumkin.",
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

    const tests = await sql`
      SELECT
        id,
        title,
        status,
        closed_question_count,
        open_question_count,
        total_questions
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

    if (test.status === "published") {
      return NextResponse.json({
        success: true,
        message: "Test allaqachon e’lon qilingan.",
        status: "published",
      });
    }

    const questionStats = await sql`
      SELECT
        COUNT(*)::int AS total_count,
        COUNT(*) FILTER (
          WHERE question_type = 'closed'
        )::int AS closed_count,
        COUNT(*) FILTER (
          WHERE question_type = 'open'
        )::int AS open_count
      FROM national_certificate_questions
      WHERE test_id = ${testId}
    `;

    const totalCount = Number(
      questionStats[0]?.total_count ?? 0
    );

    const closedCount = Number(
      questionStats[0]?.closed_count ?? 0
    );

    const openCount = Number(
      questionStats[0]?.open_count ?? 0
    );

    if (
      totalCount !== 45 ||
      closedCount !== 35 ||
      openCount !== 10
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Testni e’lon qilish uchun barcha 45 ta savol to‘liq kiritilishi kerak.",
          details: {
            total: totalCount,
            requiredTotal: 45,
            closed: closedCount,
            requiredClosed: 35,
            open: openCount,
            requiredOpen: 10,
          },
        },
        { status: 400 }
      );
    }

    // Yopiq savollar validatsiyasi:
    // har bir savolda aynan 4 variant va aynan 1 to‘g‘ri javob bo‘lishi shart.

    const invalidClosedQuestions = await sql`
      SELECT
        q.question_number,
        COUNT(o.id)::int AS option_count,
        COUNT(o.id) FILTER (
          WHERE o.is_correct = TRUE
        )::int AS correct_count
      FROM national_certificate_questions q
      LEFT JOIN national_certificate_options o
        ON o.question_id = q.id
      WHERE
        q.test_id = ${testId}
        AND q.question_type = 'closed'
      GROUP BY
        q.id,
        q.question_number
      HAVING
        COUNT(o.id) <> 4
        OR COUNT(o.id) FILTER (
          WHERE o.is_correct = TRUE
        ) <> 1
      ORDER BY q.question_number ASC
    `;

    if (invalidClosedQuestions.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Ba’zi yopiq savollarda variantlar yoki to‘g‘ri javob noto‘g‘ri.",
          invalidQuestions: invalidClosedQuestions,
        },
        { status: 400 }
      );
    }

    // Ochiq savollar validatsiyasi:
    // har bir ochiq savolda kamida 1 ta qabul qilinadigan javob bo‘lishi shart.

    const invalidOpenQuestions = await sql`
      SELECT
        q.question_number,
        COUNT(a.id)::int AS accepted_answer_count
      FROM national_certificate_questions q
      LEFT JOIN national_certificate_open_answers a
        ON a.question_id = q.id
      WHERE
        q.test_id = ${testId}
        AND q.question_type = 'open'
      GROUP BY
        q.id,
        q.question_number
      HAVING COUNT(a.id) < 1
      ORDER BY q.question_number ASC
    `;

    if (invalidOpenQuestions.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Ba’zi ochiq savollarda qabul qilinadigan to‘g‘ri javob mavjud emas.",
          invalidQuestions: invalidOpenQuestions,
        },
        { status: 400 }
      );
    }

    await sql`
      UPDATE national_certificate_tests
      SET
        status = 'published',
        updated_at = NOW()
      WHERE id = ${testId}
    `;

    return NextResponse.json({
      success: true,
      message: "Milliy sertifikat testi muvaffaqiyatli e’lon qilindi.",
      status: "published",
    });
  } catch (error) {
    console.error(
      "National certificate publish POST error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Testni e’lon qilishda server xatosi yuz berdi.",
      },
      { status: 500 }
    );
  }
}
