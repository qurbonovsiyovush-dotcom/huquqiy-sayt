import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await sql`
      SELECT
        NOW() AS database_time,
        COUNT(*)::int AS test_count
      FROM national_certificate_tests
    `;

    return NextResponse.json({
      success: true,
      message: "Neon database connected successfully",
      databaseTime: result[0]?.database_time,
      testCount: result[0]?.test_count ?? 0,
    });
  } catch (error) {
    console.error("National certificate DB test error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Database connection failed",
      },
      { status: 500 }
    );
  }
}
