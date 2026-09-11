import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdmin(request: NextRequest) {
  const session =
    request.cookies.get("qurbonov_session")?.value;

  const role =
    request.cookies.get("qurbonov_role")?.value;

  return Boolean(session) && role === "admin";
}

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Faqat administrator foydalanishi mumkin.",
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

    const body = await request.json();

    const title =
      typeof body.title === "string"
        ? body.title.trim()
        : "";

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : "";

    const durationMinutes =
      Number(body.durationMinutes);

    let attemptLimit: number | null = null;

    if (
      body.attemptLimit !== null &&
      body.attemptLimit !== undefined &&
      body.attemptLimit !== ""
    ) {
      attemptLimit = Number(
        body.attemptLimit
      );
    }

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          message: "Test nomini kiriting.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(
        durationMinutes
      ) ||
      durationMinutes <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Test vaqti musbat butun son bo‘lishi kerak.",
        },
        { status: 400 }
      );
    }

    if (
      attemptLimit !== null &&
      (
        !Number.isInteger(
          attemptLimit
        ) ||
        attemptLimit <= 0
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Urinishlar soni musbat butun son bo‘lishi kerak.",
        },
        { status: 400 }
      );
    }

    const existing =
      await sql`
        SELECT id
        FROM national_certificate_tests
        WHERE id = ${id}
        LIMIT 1
      `;

    if (existing.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Test topilmadi.",
        },
        { status: 404 }
      );
    }

    const updated =
      await sql`
        UPDATE national_certificate_tests
        SET
          title = ${title},
          description = ${description},
          duration_minutes = ${durationMinutes},
          attempt_limit = ${attemptLimit},
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING
          id,
          title,
          description,
          status,
          duration_minutes,
          attempt_limit,
          updated_at
      `;

    return NextResponse.json({
      success: true,
      message:
        "Test ma’lumotlari saqlandi.",
      test: updated[0],
    });
  } catch (error) {
    console.error(
      "National certificate settings PATCH error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Test ma’lumotlarini saqlashda server xatoligi yuz berdi.",
      },
      { status: 500 }
    );
  }
}
