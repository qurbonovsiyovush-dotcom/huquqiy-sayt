import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================================================
   ADMIN TEKSHIRISH
========================================================= */

function isAdmin(request: NextRequest) {
  const session =
    request.cookies.get("qurbonov_session")?.value;

  const role =
    request.cookies.get("qurbonov_role")?.value;

  return Boolean(session) && role === "admin";
}

/* =========================================================
   GET — NATIJALAR
========================================================= */

export async function GET(request: NextRequest) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Faqat administrator natijalarni ko‘rishi mumkin.",
        },
        {
          status: 403,
        }
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

      WHERE
        a.status IN (
          'submitted',
          'expired'
        )

      ORDER BY
        COALESCE(
          a.submitted_at,
          a.created_at
        ) DESC
    `;

    return NextResponse.json(
      {
        success: true,
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
      "National certificate admin results GET error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Natijalarni yuklashda xatolik yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   DELETE — BITTA YOKI BARCHA NATIJA
========================================================= */

export async function DELETE(
  request: NextRequest
) {
  try {
    /* =========================
       ADMIN TEKSHIRISH
    ========================= */

    if (!isAdmin(request)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Faqat administrator natijalarni o‘chira oladi.",
        },
        {
          status: 403,
        }
      );
    }

    const url = new URL(request.url);

    const id =
      String(
        url.searchParams.get("id") || ""
      ).trim();

    const deleteAll =
      url.searchParams.get("all") === "1";

    /* =====================================================
       BARCHA YAKUNLANGAN NATIJALARNI O‘CHIRISH
    ===================================================== */

    if (deleteAll) {
      const deleted = await sql`
        DELETE FROM national_certificate_attempts

        WHERE
          status IN (
            'submitted',
            'expired'
          )

        RETURNING id
      `;

      return NextResponse.json(
        {
          success: true,

          deletedCount:
            Array.isArray(deleted)
              ? deleted.length
              : 0,

          message:
            "Barcha milliy sertifikat natijalari o‘chirildi.",
        },
        {
          status: 200,
          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate",
          },
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
            "O‘chiriladigan natija ID si ko‘rsatilmagan.",
        },
        {
          status: 400,
        }
      );
    }

    const deleted = await sql`
      DELETE FROM national_certificate_attempts

      WHERE
        id = ${id}

        AND status IN (
          'submitted',
          'expired'
        )

      RETURNING id
    `;

    if (
      !Array.isArray(deleted) ||
      deleted.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Natija topilmadi yoki uni o‘chirish mumkin emas.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        deletedId: id,
        message:
          "Natija muvaffaqiyatli o‘chirildi.",
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
      "National certificate admin results DELETE error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Natijani o‘chirishda xatolik yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}
