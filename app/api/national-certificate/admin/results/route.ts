import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdmin(request: NextRequest) {
  const session = request.cookies.get("qurbonov_session")?.value;
  const role = request.cookies.get("qurbonov_role")?.value;

  return Boolean(session) && role === "admin";
}

export async function GET(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json(
        {
          success: false,
          message: "Faqat administrator natijalarni ko‘rishi mumkin.",
        },
        { status: 403 }
      );
    }

    const results = await sql`
      SELECT
        a.id,
        a.user_key,
        a.user_name,
        a.status,
        a.started_at,
        a.submitted_at,
        a.correct_count,
        a.incorrect_count,
        a.unanswered_count,
        a.raw_score,
        a.percentage,
        a.created_at,
        t.id AS test_id,
        t.title AS test_title,
        t.total_questions
      FROM national_certificate_attempts a
      JOIN national_certificate_tests t
        ON t.id = a.test_id
      WHERE a.status IN ('submitted', 'expired')
      ORDER BY
        COALESCE(a.submitted_at, a.created_at) DESC
    `;

    return NextResponse.json(
      {
        success: true,
        results,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error(
      "National certificate admin results GET error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Natijalarni yuklashda xatolik yuz berdi.",
      },
      { status: 500 }
    );
  }
}
