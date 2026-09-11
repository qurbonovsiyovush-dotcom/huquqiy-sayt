import {
  NextRequest,
  NextResponse,
} from "next/server";

import { cookies } from "next/headers";
import crypto from "crypto";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =====================================================
   ADMIN TEKSHIRISH
===================================================== */

async function isAdmin() {
  const cookieStore =
    await cookies();

  const session =
    cookieStore.get(
      "qurbonov_session"
    )?.value;

  const role =
    cookieStore.get(
      "qurbonov_role"
    )?.value;

  return Boolean(
    session &&
      role === "admin"
  );
}

/* =====================================================
   SANANI JSON UCHUN TAYYORLASH
===================================================== */

function dateValue(
  value: unknown
) {
  if (!value) {
    return null;
  }

  try {
    return new Date(
      String(value)
    ).toISOString();
  } catch {
    return String(value);
  }
}

/* =====================================================
   FOYDALANUVCHI FORMAT
===================================================== */

function formatUser(
  row: any
) {
  return {
    id: String(row.id),
    code: String(
      row.code || ""
    ),
    name: String(
      row.name || ""
    ),

    active:
      row.active === true,

    approved:
      row.approved === true,

    requestedAt:
      dateValue(
        row.requested_at
      ),

    createdAt:
      dateValue(
        row.created_at
      ),

    approvedAt:
      dateValue(
        row.approved_at
      ),

    rejectedAt:
      dateValue(
        row.rejected_at
      ),
  };
}

/* =====================================================
   TASODIFIY KIRISH KODI

   Masalan:
   QURBONOV-7K4M-92PX
===================================================== */

const CODE_CHARS =
  "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomPart(
  length: number
) {
  let result = "";

  const bytes =
    crypto.randomBytes(
      length
    );

  for (
    let i = 0;
    i < length;
    i++
  ) {
    result +=
      CODE_CHARS[
        bytes[i] %
          CODE_CHARS.length
      ];
  }

  return result;
}

function makeAccessCode() {
  return (
    "QURBONOV-" +
    randomPart(4) +
    "-" +
    randomPart(4)
  );
}

/* =====================================================
   YANGI UNIQUE KOD TOPISH
===================================================== */

async function createUniqueCode() {
  for (
    let attempt = 0;
    attempt < 20;
    attempt++
  ) {
    const code =
      makeAccessCode();

    const existing =
      await sql`
        SELECT id
        FROM access_codes
        WHERE code = ${code}
        LIMIT 1
      `;

    if (
      existing.length === 0
    ) {
      return code;
    }
  }

  throw new Error(
    "Yangi noyob kod yaratib bo‘lmadi."
  );
}

/* =====================================================
   GET
   BARCHA KIRISH KODLARINI OLISH
===================================================== */

export async function GET() {
  try {
    if (
      !(await isAdmin())
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Faqat administrator uchun.",
        },
        {
          status: 403,
        }
      );
    }

    const rows =
      await sql`
        SELECT
          id,
          code,
          name,
          active,
          approved,
          requested_at,
          created_at,
          approved_at,
          rejected_at
        FROM access_codes
        ORDER BY
          CASE
            WHEN requested_at IS NOT NULL
              AND approved = FALSE
              AND active = TRUE
            THEN 0
            ELSE 1
          END,
          created_at DESC
      `;

    const users =
      rows.map(
        formatUser
      );

    const pendingCount =
      users.filter(
        (user) =>
          user.active &&
          !user.approved &&
          Boolean(
            user.requestedAt
          )
      ).length;

    const approvedCount =
      users.filter(
        (user) =>
          user.active &&
          user.approved
      ).length;

    const inactiveCount =
      users.filter(
        (user) =>
          !user.active
      ).length;

    return NextResponse.json({
      success: true,

      users,

      count:
        users.length,

      pendingCount,
      approvedCount,
      inactiveCount,
    });
  } catch (error) {
    console.error(
      "ACCESS CODES GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Kirish kodlarini olishda xatolik yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =====================================================
   POST

   action:
   create
   approve
   reject
   restore
   deactivate
   delete
   delete-all-approved
===================================================== */

export async function POST(
  request: NextRequest
) {
  try {
    if (
      !(await isAdmin())
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Faqat administrator uchun.",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      await request
        .json()
        .catch(() => ({}));

    const action =
      String(
        body?.action || ""
      )
        .trim()
        .toLowerCase();

    /* =================================================
       1. YANGI KOD YARATISH
    ================================================= */

    if (
      action === "create"
    ) {
      const name =
        String(
          body?.name || ""
        )
          .replace(
            /\s+/g,
            " "
          )
          .trim();

      if (!name) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Foydalanuvchi ism-familiyasini kiriting.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        name.length > 150
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Ism-familiya juda uzun.",
          },
          {
            status: 400,
          }
        );
      }

      const id =
        crypto.randomUUID();

      const code =
        await createUniqueCode();

      const rows =
        await sql`
          INSERT INTO access_codes (
            id,
            code,
            name,
            active,
            approved,
            requested_at,
            created_at,
            approved_at,
            rejected_at
          )
          VALUES (
            ${id},
            ${code},
            ${name},
            TRUE,
            FALSE,
            NULL,
            NOW(),
            NULL,
            NULL
          )
          RETURNING
            id,
            code,
            name,
            active,
            approved,
            requested_at,
            created_at,
            approved_at,
            rejected_at
        `;

      return NextResponse.json({
        success: true,
        message:
          "Yangi kirish kodi yaratildi.",

        user:
          formatUser(
            rows[0]
          ),

        code,
      });
    }

    /* =================================================
       2. RUXSAT BERILGANLARNING HAMMASINI O‘CHIRISH

       Bu amal faqat active = TRUE va approved = TRUE
       bo‘lgan foydalanuvchilarni o‘chiradi.
    ================================================= */

    if (
      action ===
      "delete-all-approved"
    ) {
      const deleted =
        await sql`
          DELETE FROM access_codes
          WHERE
            active = TRUE
            AND approved = TRUE
          RETURNING id
        `;

      return NextResponse.json({
        success: true,
        deletedCount:
          deleted.length,
        message:
          `${deleted.length} ta ruxsat berilgan kirish kodi o‘chirildi.`,
      });
    }

    /* =================================================
       QOLGAN AMALLAR UCHUN ID
    ================================================= */

    const id =
      String(
        body?.id || ""
      ).trim();

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Foydalanuvchi ID topilmadi.",
        },
        {
          status: 400,
        }
      );
    }

    const existing =
      await sql`
        SELECT
          id,
          code,
          name,
          active,
          approved,
          requested_at,
          created_at,
          approved_at,
          rejected_at
        FROM access_codes
        WHERE id = ${id}
        LIMIT 1
      `;

    if (
      existing.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Kirish kodi topilmadi.",
        },
        {
          status: 404,
        }
      );
    }

    /* =================================================
       2. TASDIQLASH
    ================================================= */

    if (
      action === "approve"
    ) {
      const rows =
        await sql`
          UPDATE access_codes
          SET
            active = TRUE,
            approved = TRUE,
            approved_at = NOW(),
            rejected_at = NULL
          WHERE id = ${id}
          RETURNING
            id,
            code,
            name,
            active,
            approved,
            requested_at,
            created_at,
            approved_at,
            rejected_at
        `;

      return NextResponse.json({
        success: true,
        message:
          "Foydalanuvchiga kirish ruxsati berildi.",
        user:
          formatUser(
            rows[0]
          ),
      });
    }

    /* =================================================
       3. RAD ETISH
    ================================================= */

    if (
      action === "reject"
    ) {
      const rows =
        await sql`
          UPDATE access_codes
          SET
            active = FALSE,
            approved = FALSE,
            approved_at = NULL,
            rejected_at = NOW()
          WHERE id = ${id}
          RETURNING
            id,
            code,
            name,
            active,
            approved,
            requested_at,
            created_at,
            approved_at,
            rejected_at
        `;

      return NextResponse.json({
        success: true,
        message:
          "Foydalanuvchining kirish so‘rovi rad etildi.",
        user:
          formatUser(
            rows[0]
          ),
      });
    }

    /* =================================================
       4. QAYTA FAOLLASHTIRISH

       Kod ishlaydi, lekin yana admin
       tasdig‘ini kutadi.
    ================================================= */

    if (
      action === "restore"
    ) {
      const rows =
        await sql`
          UPDATE access_codes
          SET
            active = TRUE,
            approved = FALSE,
            requested_at = NULL,
            approved_at = NULL,
            rejected_at = NULL
          WHERE id = ${id}
          RETURNING
            id,
            code,
            name,
            active,
            approved,
            requested_at,
            created_at,
            approved_at,
            rejected_at
        `;

      return NextResponse.json({
        success: true,
        message:
          "Kirish kodi qayta faollashtirildi.",
        user:
          formatUser(
            rows[0]
          ),
      });
    }

    /* =================================================
       5. KODNI BLOKLASH
    ================================================= */

    if (
      action ===
      "deactivate"
    ) {
      const rows =
        await sql`
          UPDATE access_codes
          SET
            active = FALSE,
            approved = FALSE,
            approved_at = NULL,
            rejected_at = NOW()
          WHERE id = ${id}
          RETURNING
            id,
            code,
            name,
            active,
            approved,
            requested_at,
            created_at,
            approved_at,
            rejected_at
        `;

      return NextResponse.json({
        success: true,
        message:
          "Kirish kodi bloklandi.",
        user:
          formatUser(
            rows[0]
          ),
      });
    }

    /* =================================================
       6. BUTUNLAY O‘CHIRISH
    ================================================= */

    if (
      action === "delete"
    ) {
      await sql`
        DELETE FROM access_codes
        WHERE id = ${id}
      `;

      return NextResponse.json({
        success: true,
        message:
          "Kirish kodi o‘chirildi.",
        id,
      });
    }

    /* =================================================
       NOTO‘G‘RI ACTION
    ================================================= */

    return NextResponse.json(
      {
        success: false,
        message:
          "Noma’lum amal.",
      },
      {
        status: 400,
      }
    );
  } catch (error) {
    console.error(
      "ACCESS CODES POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Kirish kodini boshqarishda server xatosi yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}
