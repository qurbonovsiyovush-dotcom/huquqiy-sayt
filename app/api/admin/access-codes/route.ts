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
   BITTA UNIQUE KOD TOPISH
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
   OMMAVIY UNIQUE KODLAR TOPISH
===================================================== */

async function createUniqueCodes(
  count: number
) {
  const result: string[] = [];

  const reserved =
    new Set<string>();

  while (
    result.length < count
  ) {
    const needed =
      count - result.length;

    const candidates:
      string[] = [];

    while (
      candidates.length <
      needed
    ) {
      const code =
        makeAccessCode();

      if (
        reserved.has(code)
      ) {
        continue;
      }

      reserved.add(code);

      candidates.push(code);
    }

    const payload =
      JSON.stringify(
        candidates.map(
          (code) => ({
            code,
          })
        )
      );

    const existing =
      await sql`
        SELECT
          a.code
        FROM access_codes a
        INNER JOIN
          jsonb_to_recordset(
            ${payload}::jsonb
          ) AS x(
            code TEXT
          )
        ON a.code = x.code
      `;

    const existingCodes =
      new Set(
        existing.map(
          (row: any) =>
            String(row.code)
        )
      );

    for (
      const code of candidates
    ) {
      if (
        !existingCodes.has(
          code
        )
      ) {
        result.push(code);
      }
    }
  }

  return result.slice(
    0,
    count
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
            WHEN
              requested_at IS NOT NULL
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
   bulk-create
   approve
   reject
   restore
   deactivate
   delete
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
       1. BITTA YANGI KOD YARATISH
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
       2. OMMAVIY KOD YARATISH

       1 DAN 500 TAGACHA

       BULAR DARHOL TASDIQLANGAN
       HOLATDA YARATILADI.
    ================================================= */

    if (
      action === "bulk-create"
    ) {
      const count =
        Number(
          body?.count || 0
        );

      if (
        !Number.isInteger(
          count
        ) ||
        count < 1 ||
        count > 500
      ) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Kodlar soni 1 dan 500 gacha bo‘lishi kerak.",
          },
          {
            status: 400,
          }
        );
      }

      const codes =
        await createUniqueCodes(
          count
        );

      const entries =
        codes.map(
          (
            code,
            index
          ) => ({
            id:
              crypto.randomUUID(),

            code,

            name:
              `Talaba ${String(
                index + 1
              ).padStart(
                3,
                "0"
              )}`,
          })
        );

      const payload =
        JSON.stringify(
          entries
        );

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
          SELECT
            x.id,
            x.code,
            x.name,
            TRUE,
            TRUE,
            NULL,
            NOW(),
            NOW(),
            NULL
          FROM
            jsonb_to_recordset(
              ${payload}::jsonb
            ) AS x(
              id TEXT,
              code TEXT,
              name TEXT
            )
          ON CONFLICT (code)
          DO NOTHING
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

      if (
        rows.length !== count
      ) {
        return NextResponse.json(
          {
            success: false,

            message:
              `${rows.length} ta kod yaratildi. ${count} ta kod to‘liq yaratilmaganligi sababli qayta urinib ko‘ring.`,

            count:
              rows.length,

            users:
              rows.map(
                formatUser
              ),
          },
          {
            status: 409,
          }
        );
      }

      return NextResponse.json({
        success: true,

        message:
          `${rows.length} ta kirish kodi yaratildi.`,

        count:
          rows.length,

        users:
          rows.map(
            formatUser
          ),
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
       3. TASDIQLASH
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
       4. RAD ETISH
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
       5. QAYTA FAOLLASHTIRISH

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
       6. KODNI BLOKLASH
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
       7. BUTUNLAY O‘CHIRISH
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
