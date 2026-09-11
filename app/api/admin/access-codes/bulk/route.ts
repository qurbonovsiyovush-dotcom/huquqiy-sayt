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
   TYPES
===================================================== */

type BulkEntry = {
  id: string;
  name: string;
  code: string;
};

type CreatedUser = {
  id: string;
  name: string;
  code: string;
};

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
   KOD BELGILARI
===================================================== */

const CODE_CHARS =
  "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/* =====================================================
   RANDOM QISM
===================================================== */

function randomPart(
  length: number
) {
  const bytes =
    crypto.randomBytes(
      length
    );

  let result = "";

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

/* =====================================================
   KIRISH KODI

   Masalan:
   QURBONOV-7K4M-92PX
===================================================== */

function makeAccessCode() {
  return (
    "QURBONOV-" +
    randomPart(4) +
    "-" +
    randomPart(4)
  );
}

/* =====================================================
   UNIQUE KODLAR YARATISH
===================================================== */

async function createUniqueCodes(
  count: number
): Promise<string[]> {
  const result: string[] =
    [];

  const reserved =
    new Set<string>();

  let safety = 0;

  while (
    result.length < count
  ) {
    safety++;

    if (safety > 20) {
      throw new Error(
        "Noyob kodlarni yaratib bo‘lmadi."
      );
    }

    const needed =
      count -
      result.length;

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
        candidates
      );

    const existing =
      await sql`
        SELECT code
        FROM access_codes
        WHERE code IN (
          SELECT value
          FROM jsonb_array_elements_text(
            ${payload}::jsonb
          )
        )
      `;

    const existingCodes =
      new Set<string>(
        existing.map(
          (row: any) =>
            String(
              row.code
            )
        )
      );

    for (
      const code of
      candidates
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
   POST
===================================================== */

export async function POST(
  request: NextRequest
) {
  try {
    /* =================================================
       ADMIN TEKSHIRISH
    ================================================= */

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

    /* =================================================
       BODY
    ================================================= */

    const body:
      Record<
        string,
        unknown
      > =
      await request
        .json()
        .catch(
          () => ({})
        );

    /* =================================================
       ISMLARNI OLISH
    ================================================= */

    const incoming:
      unknown[] =
      Array.isArray(
        body.names
      )
        ? body.names
        : [];

    const names:
      string[] =
      incoming
        .map(
          (
            value:
              unknown
          ): string =>
            String(
              value || ""
            )
              .replace(
                /\s+/g,
                " "
              )
              .trim()
        )
        .filter(
          (
            value:
              string
          ): boolean =>
            Boolean(value)
        );

    /* =================================================
       BO‘SH RO‘YXAT
    ================================================= */

    if (
      names.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Ism-familiyalar topilmadi.",
        },
        {
          status: 400,
        }
      );
    }

    /* =================================================
       LIMIT
    ================================================= */

    if (
      names.length > 500
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Bir martada maksimum 500 ta foydalanuvchi.",
        },
        {
          status: 400,
        }
      );
    }

    /* =================================================
       ISM UZUNLIGI
    ================================================= */

    for (
      const name of names
    ) {
      if (
        name.length > 150
      ) {
        return NextResponse.json(
          {
            success: false,

            message:
              `Ism-familiya juda uzun: ${name}`,
          },
          {
            status: 400,
          }
        );
      }
    }

    /* =================================================
       KODLARNI YARATISH
    ================================================= */

    const codes:
      string[] =
      await createUniqueCodes(
        names.length
      );

    /* =================================================
       DATABASE UCHUN MA’LUMOT
    ================================================= */

    const entries:
      BulkEntry[] =
      names.map(
        (
          name:
            string,
          index:
            number
        ): BulkEntry => ({
          id:
            crypto.randomUUID(),

          name,

          code:
            codes[index],
        })
      );

    const payload =
      JSON.stringify(
        entries
      );

    /* =================================================
       BAZAGA BITTA SO‘ROVDA YOZISH

       active = TRUE
       approved = TRUE

       Demak kod darhol ishlaydi.
    ================================================= */

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
        FROM jsonb_to_recordset(
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
          name
      `;

    /* =================================================
       NATIJANI FORMATLASH
    ================================================= */

    const createdUsers:
      CreatedUser[] =
      rows.map(
        (
          row: any
        ): CreatedUser => ({
          id:
            String(
              row.id
            ),

          name:
            String(
              row.name
            ),

          code:
            String(
              row.code
            ),
        })
      );

    /* =================================================
       HAMMASI YARATILDIMI?
    ================================================= */

    if (
      createdUsers.length !==
      names.length
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            `${createdUsers.length} ta kod yaratildi. ${names.length} ta kodning hammasi yaratilmagan.`,

          count:
            createdUsers.length,

          users:
            createdUsers,
        },
        {
          status: 409,
        }
      );
    }

    /* =================================================
       SUCCESS
    ================================================= */

    return NextResponse.json({
      success: true,

      count:
        createdUsers.length,

      users:
        createdUsers,

      message:
        `${createdUsers.length} ta kod yaratildi.`,
    });
  } catch (error) {
    console.error(
      "BULK ACCESS CODE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Kodlarni yaratishda server xatosi yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}
