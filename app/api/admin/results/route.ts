import {
  NextRequest,
  NextResponse,
} from "next/server";

import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================================================
   ADMIN TEKSHIRISH
========================================================= */

function adminAllowed(
  request: NextRequest
) {
  const session =
    request.cookies.get(
      "qurbonov_session"
    )?.value;

  const role =
    request.cookies.get(
      "qurbonov_role"
    )?.value;

  return Boolean(session) &&
    role === "admin";
}

/* =========================================================
   GET
   NEON'DAN BARCHA TEST NATIJALARINI OLISH
========================================================= */

export async function GET(
  request: NextRequest
) {
  try {
    if (!adminAllowed(request)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Administrator huquqi talab qilinadi.",
        },
        {
          status: 403,
        }
      );
    }

    const rows = await sql`
      SELECT
        id::text AS id,
        user_id::text AS user_id,
        user_name,
        test_id::text AS test_id,
        test_title,
        subject,
        total_questions,
        correct_count,
        incorrect_count,
        unanswered_count,
        percentage,
        earned_points,
        total_points,
        spent_seconds,
        finished_at
      FROM ranking_attempts
      ORDER BY
        finished_at DESC,
        id DESC
    `;

    const results = rows.map(
      (row: any) => ({
        id: String(
          row.id || ""
        ),

        userId: String(
          row.user_id || ""
        ),

        userName: String(
          row.user_name ||
            "Foydalanuvchi"
        ),

        testId: String(
          row.test_id || ""
        ),

        testTitle: String(
          row.test_title ||
            "Nomsiz test"
        ),

        subject: String(
          row.subject || ""
        ),

        total: Number(
          row.total_questions || 0
        ),

        correct: Number(
          row.correct_count || 0
        ),

        incorrect: Number(
          row.incorrect_count || 0
        ),

        unanswered: Number(
          row.unanswered_count || 0
        ),

        percentage: Number(
          row.percentage || 0
        ),

        earnedPoints: Number(
          row.earned_points || 0
        ),

        totalPoints: Number(
          row.total_points || 0
        ),

        spentSeconds: Number(
          row.spent_seconds || 0
        ),

        finishedAt:
          row.finished_at
            ? new Date(
                row.finished_at
              ).toISOString()
            : "",
      })
    );

    return NextResponse.json(
      {
        success: true,
        count: results.length,
        results,
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
      "ADMIN RESULTS GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Natijalarni yuklashda server xatosi.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   DELETE
========================================================= */

export async function DELETE(
  request: NextRequest
) {
  try {
    if (!adminAllowed(request)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Administrator huquqi talab qilinadi.",
        },
        {
          status: 403,
        }
      );
    }

    const url =
      new URL(request.url);

    const id =
      String(
        url.searchParams.get(
          "id"
        ) || ""
      ).trim();

    const deleteAll =
      url.searchParams.get(
        "all"
      ) === "1";

    /* =====================================================
       BARCHA NATIJALARNI O‘CHIRISH
    ===================================================== */

    if (deleteAll) {
      const countRows =
        await sql`
          SELECT
            COUNT(*)::int
              AS count
          FROM ranking_attempts
        `;

      const deletedCount =
        Number(
          countRows[0]?.count || 0
        );

      await sql`
        DELETE FROM
          ranking_attempts
      `;

      return NextResponse.json(
        {
          success: true,
          deletedCount,
          message:
            "Barcha test natijalari Neon bazasidan o‘chirildi.",
        },
        {
          status: 200,
        }
      );
    }

    /* =====================================================
       BITTA NATIJANI O‘CHIRISH
    ===================================================== */

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Natija ID topilmadi.",
        },
        {
          status: 400,
        }
      );
    }

    const deleted =
      await sql`
        DELETE FROM
          ranking_attempts
        WHERE
          id::text = ${id}
        RETURNING
          id::text AS id
      `;

    if (deleted.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Natija topilmadi.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        id,
        message:
          "Natija Neon bazasidan o‘chirildi.",
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "ADMIN RESULT DELETE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Natijani o‘chirishda server xatosi.",
      },
      {
        status: 500,
      }
    );
  }
}
