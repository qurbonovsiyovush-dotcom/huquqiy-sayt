import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tests = await sql`
      SELECT
        id,
        title,
        description,
        duration_minutes,
        closed_question_count,
        open_question_count,
        total_questions,
        attempt_limit,
        created_at,
        updated_at
      FROM national_certificate_tests
      WHERE status = 'published'
      ORDER BY updated_at DESC
    `;

    return NextResponse.json({
      success: true,
      tests,
    });
  } catch (error) {
    console.error("National certificate tests GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Testlarni yuklashda xatolik yuz berdi",
      },
      { status: 500 }
    );
  }
}
