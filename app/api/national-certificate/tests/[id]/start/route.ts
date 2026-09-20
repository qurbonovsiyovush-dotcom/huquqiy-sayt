import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getUserKey(request: NextRequest) {
  return (
    request.cookies.get("qurbonov_session")?.value ||
    ""
  );
}

function cleanUserName(value: unknown) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ")
    : "";
}

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const userKey =
      getUserKey(request);

    if (!userKey) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Testni boshlash uchun tizimga kirish kerak.",
        },
        { status: 401 }
      );
    }

    const { id: testId } =
      await context.params;

    if (!testId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Test ID topilmadi.",
        },
        { status: 400 }
      );
    }

    const body =
      await request.json().catch(
        () => ({})
      );

    const userName =
      cleanUserName(
        body?.userName
      );

    if (!userName) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Ism, familiya va otangiz ismini kiriting.",
        },
        { status: 400 }
      );
    }

    if (userName.length < 3) {
      return NextResponse.json(
        {
          success: false,
          message:
            "F.I.Sh. juda qisqa.",
        },
        { status: 400 }
      );
    }

    if (userName.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message:
            "F.I.Sh. 100 ta belgidan oshmasligi kerak.",
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
          message:
            "Test topilmadi.",
        },
        { status: 404 }
      );
    }

    const test = tests[0];

    if (
      test.status !== "published"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bu test hali e’lon qilinmagan.",
        },
        { status: 403 }
      );
    }

    const durationMinutes =
      Number(
        test.duration_minutes
      );

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
            "Test vaqti noto‘g‘ri sozlangan.",
        },
        { status: 409 }
      );
    }

    const attemptLimit =
      test.attempt_limit === null
        ? null
        : Number(
            test.attempt_limit
          );

    const questionStats =
      await sql`
        SELECT
          COUNT(*)::int
            AS total_count,

          COUNT(*) FILTER (
            WHERE
              question_number
                BETWEEN 1 AND 35
              AND question_type = 'closed'
          )::int
            AS closed_count,

          COUNT(*) FILTER (
            WHERE
              question_number
                BETWEEN 36 AND 45
              AND question_type = 'open'
          )::int
            AS open_count,

          COUNT(
            DISTINCT question_number
          )::int
            AS distinct_number_count

        FROM
          national_certificate_questions

        WHERE
          test_id = ${testId}
      `;

    const stats =
      questionStats[0];

    const totalCount =
      Number(
        stats?.total_count ?? 0
      );

    const closedCount =
      Number(
        stats?.closed_count ?? 0
      );

    const openCount =
      Number(
        stats?.open_count ?? 0
      );

    const distinctNumberCount =
      Number(
        stats?.distinct_number_count ??
        0
      );

    if (
      totalCount !== 45 ||
      closedCount !== 35 ||
      openCount !== 10 ||
      distinctNumberCount !== 45
    ) {
      return NextResponse.json(
        {
          success: false,
          code:
            "TEST_NOT_READY",
          message:
            "Test savollari to‘liq yoki to‘g‘ri tuzilmagan. Administratorga murojaat qiling.",
        },
        { status: 409 }
      );
    }

    await sql`
      UPDATE national_certificate_attempts
      SET
        status = 'expired',

        submitted_at =
          COALESCE(
            submitted_at,
            started_at +
              (
                ${durationMinutes}
                * INTERVAL '1 minute'
              )
          ),

        correct_count =
          COALESCE(
            correct_count,
            0
          ),

        incorrect_count =
          COALESCE(
            incorrect_count,
            0
          ),

        unanswered_count =
          COALESCE(
            unanswered_count,
            45
          ),

        raw_score =
          COALESCE(
            raw_score,
            0
          ),

        percentage =
          COALESCE(
            percentage,
            0
          ),

        updated_at = NOW()

      WHERE
        test_id = ${testId}

        AND user_key =
          ${userKey}

        AND status =
          'in_progress'

        AND (
          started_at +
          (
            ${durationMinutes}
            * INTERVAL '1 minute'
          )
        ) <= NOW()
    `;

    const activeAttempts =
      await sql`
        SELECT
          id,
          started_at,
          status,
          user_name
        FROM
          national_certificate_attempts

        WHERE
          test_id = ${testId}

          AND user_key =
            ${userKey}

          AND status =
            'in_progress'

          AND (
            started_at +
            (
              ${durationMinutes}
              * INTERVAL '1 minute'
            )
          ) > NOW()

        ORDER BY
          started_at DESC

        LIMIT 1
      `;

    if (
      activeAttempts.length > 0
    ) {
      const active =
        activeAttempts[0];

      await sql`
        UPDATE
          national_certificate_attempts

        SET
          user_name =
            ${userName},
          updated_at = NOW()

        WHERE
          id = ${active.id}
          AND status =
            'in_progress'
      `;

      const startedAt =
        new Date(
          String(
            active.started_at
          )
        );

      const expiresAt =
        new Date(
          startedAt.getTime() +
          durationMinutes *
            60 *
            1000
        );

      return NextResponse.json({
        success: true,
        resumed: true,

        message:
          "Avval boshlangan test davom ettirilmoqda.",

        attempt: {
          id:
            String(active.id),

          testId,

          status:
            "in_progress",

          startedAt:
            startedAt.toISOString(),

          expiresAt:
            expiresAt.toISOString(),

          durationMinutes,
        },
      });
    }

    if (
      attemptLimit !== null
    ) {
      const usedRows =
        await sql`
          SELECT
            COUNT(*)::int
              AS used_count
          FROM
            national_certificate_attempts

          WHERE
            test_id = ${testId}

            AND user_key =
              ${userKey}

            AND status IN (
              'submitted',
              'expired'
            )
        `;

      const usedCount =
        Number(
          usedRows[0]
            ?.used_count ?? 0
        );

      if (
        usedCount >=
        attemptLimit
      ) {
        return NextResponse.json(
          {
            success: false,
            code:
              "ATTEMPT_LIMIT_REACHED",

            message:
              "Siz ushbu test uchun ruxsat etilgan urinishlar limitidan foydalangansiz.",

            attemptLimit,
            usedAttempts:
              usedCount,
          },
          { status: 403 }
        );
      }
    }

    const inserted =
      await sql`
        INSERT INTO
          national_certificate_attempts (
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
          status
      `;

    if (
      inserted.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Test urinishini yaratib bo‘lmadi.",
        },
        { status: 500 }
      );
    }

    const created =
      inserted[0];

    const startedAt =
      new Date(
        String(
          created.started_at
        )
      );

    const expiresAt =
      new Date(
        startedAt.getTime() +
        durationMinutes *
          60 *
          1000
      );

    return NextResponse.json(
      {
        success: true,
        resumed: false,

        message:
          "Test boshlandi.",

        attempt: {
          id:
            String(
              created.id
            ),

          testId,

          status:
            "in_progress",

          startedAt:
            startedAt.toISOString(),

          expiresAt:
            expiresAt.toISOString(),

          durationMinutes,
        },
      },
      {
        status: 201,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error(
      "National certificate start POST error:",
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
