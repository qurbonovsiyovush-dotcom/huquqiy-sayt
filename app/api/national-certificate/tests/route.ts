import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdmin(request: NextRequest) {
  const session = request.cookies.get("qurbonov_session")?.value;
  const role = request.cookies.get("qurbonov_role")?.value;

  return Boolean(session) && role === "admin";
}

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

export async function POST(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json(
        {
          success: false,
          message: "Faqat administrator test yaratishi mumkin.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const title =
      typeof body.title === "string"
        ? body.title.trim()
        : "";

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : "";

    const durationMinutes = Number(body.durationMinutes);

    const attemptLimit =
      body.attemptLimit === null ||
      body.attemptLimit === undefined ||
      body.attemptLimit === ""
        ? null
        : Number(body.attemptLimit);

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          message: "Test nomi kiritilishi shart.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(durationMinutes) ||
      durationMinutes <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Test vaqti noto‘g‘ri.",
        },
        { status: 400 }
      );
    }

    if (
      attemptLimit !== null &&
      (!Number.isInteger(attemptLimit) || attemptLimit <= 0)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Urinishlar soni noto‘g‘ri.",
        },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO national_certificate_tests (
        title,
        description,
        duration_minutes,
        attempt_limit,
        status
      )
      VALUES (
        ${title},
        ${description},
        ${durationMinutes},
        ${attemptLimit},
        'draft'
      )
      RETURNING
        id,
        title,
        description,
        status,
        duration_minutes,
        closed_question_count,
        open_question_count,
        total_questions,
        attempt_limit,
        created_at,
        updated_at
    `;

    return NextResponse.json(
      {
        success: true,
        message: "Milliy sertifikat testi yaratildi.",
        test: result[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("National certificate tests POST error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Test yaratishda xatolik yuz berdi.",
      },
      { status: 500 }
    );
  }
}
