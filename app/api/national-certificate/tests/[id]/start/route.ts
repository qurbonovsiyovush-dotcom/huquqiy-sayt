import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getUserKey(request: NextRequest) {
  return request.cookies.get("qurbonov_session")?.value || "";
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const userKey = getUserKey(request);

    if (!userKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Testni boshlash uchun tizimga kirish kerak.",
        },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));

    const userName =
      typeof body?.userName === "string"
        ? body.userName.trim().replace(/\s+/g, " ")
        : "";

    if (!userName) {
      return NextResponse.json(
        {
          success: false,
          message: "Ism va familiyangizni kiriting.",
        },
        { status: 400 }
      );
    }

    if (userName.length < 2) {
      return NextResponse.json(
        {
          success: false,
          message: "Ism juda qisqa.",
        },
        { status: 400 }
      );
    }

    if (userName.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message: "Ism juda uzun.",
        },
        { status: 400 }
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
        duration_minutes,
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

    const activeAttempts = await sql`
      SELECT
        id,
        started_at,
        status,
        user_name
      FROM national_certificate_attempts
      WHERE
        test_id = ${testId}
        AND user_key = ${userKey}
        AND status = 'in_progress'
      ORDER BY started_at DESC
      LIMIT 1
    `;

    if (activeAttempts.length > 0) {
      const activeAttempt = activeAttempts[0];

      const startedAt = new Date(
        String(activeAttempt.started_at)
      );

      const durationMinutes =
        Number(test.duration_minutes);

      const expiresAt = new Date(
        startedAt.getTime() +
          durationMinutes * 60 * 1000
      );

      const now = new Date();

      if (expiresAt.getTime() > now.getTime()) {
        await sql`
          UPDATE national_certificate_attempts
          SET
            user_name = ${userName},
            updated_at = NOW()
          WHERE id = ${activeAttempt.id}
        `;

        return NextResponse.json({
          success: true,
          resumed: true,
          message:
            "Avval boshlangan test davom ettirilmoqda.",
          attempt: {
            id: activeAttempt.id,
            testId,
            status: activeAttempt.status,
            startedAt: startedAt.toISOString(),
            expiresAt: expiresAt.toISOString(),
            durationMinutes,
            userName,
          },
        });
      }

      await sql`
        UPDATE national_certificate_attempts
        SET
          status = 'expired',
          submitted_at = NOW(),
          updated_at = NOW()
        WHERE id = ${activeAttempt.id}
      `;
    }

    const attemptLimit =
      test.attempt_limit === null
        ? null
        : Number(test.attempt_limit);

    if (attemptLimit !== null) {
      const attemptStats = await sql`
        SELECT
          COUNT(*)::int AS used_count
        FROM national_certificate_attempts
        WHERE
          test_id = ${testId}
          AND user_key = ${userKey}
          AND status IN (
            'submitted',
            'expired'
          )
      `;

      const usedCount = Number(
        attemptStats[0]?.used_count ?? 0
      );

      if (usedCount >= attemptLimit) {
        return NextResponse.json(
          {
            success: false,
            code: "ATTEMPT_LIMIT_REACHED",
            message:
              "Bu test uchun urinishlar soni tugagan.",
            attemptLimit,
            attemptsUsed: usedCount,
            attemptsRemaining: 0,
          },
          { status: 403 }
        );
      }
    }

    const created = await sql`
      INSERT INTO national_certificate_attempts (
        test_id,
        user_key,
        user_name,
        status,
        started_at,
        created_at,
        updated_at
      )
      VALUES (
        ${testId},
        ${userKey},
        ${userName},
        'in_progress',
        NOW(),
        NOW(),
        NOW()
      )
      RETURNING
        id,
        started_at,
        status,
        user_name
    `;

    const attempt = created[0];

    const startedAt = new Date(
      String(attempt.started_at)
    );

    const durationMinutes =
      Number(test.duration_minutes);

    const expiresAt = new Date(
      startedAt.getTime() +
        durationMinutes * 60 * 1000
    );

    return NextResponse.json(
      {
        success: true,
        resumed: false,
        message: "Test boshlandi.",
        attempt: {
          id: attempt.id,
          testId,
          status: attempt.status,
          startedAt: startedAt.toISOString(),
          expiresAt: expiresAt.toISOString(),
          durationMinutes,
          userName: attempt.user_name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "National certificate test start POST error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Testni boshlashda server xatosi yuz berdi.",
      },
      { status: 500 }
    );
  }
}
