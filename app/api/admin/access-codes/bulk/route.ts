import {
  NextRequest,
  NextResponse,
} from "next/server";

import { cookies } from "next/headers";
import crypto from "crypto";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CODE_CHARS =
  "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/* =====================================================
   ADMIN
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
   RANDOM
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

function makeAccessCode() {
  return (
    "QURBONOV-" +
    randomPart(4) +
    "-" +
    randomPart(4)
  );
}

/* =====================================================
   UNIQUE KODLAR
===================================================== */

async function createUniqueCodes(
  count: number
) {
  const result: string[] = [];

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
        !existingCodes.has(code)
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

    const incoming =
      Array.isArray(
        body?.names
      )
        ? body.names
        : [];

    const names =
      incoming
        .map(
          (value: unknown) =>
            String(
              value || ""
            )
              .replace(
                /\s+/g,
                " "
              )
              .trim()
        )
        .filter(Boolean);

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

    const codes =
      await createUniqueCodes(
        names.length
      );

    const entries =
      names.map(
        (
          name,
          index
        ) => ({
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
        RETURNING
          id,
          code,
          name
      `;

    const rowMap =
      new Map(
        rows.map(
          (row: any) => [
            String(row.code),

            {
              id:
                String(row.id),

              name:
                String(row.name),

              code:
                String(row.code),
            },
          ]
        )
      );

    const users =
      entries
        .map(
          (entry) =>
            rowMap.get(
              entry.code
            )
        )
        .filter(Boolean);

    return NextResponse.json({
      success: true,

      count:
        users.length,

      users,

      message:
        `${users.length} ta kod yaratildi.`,
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
