import {
  NextRequest,
  NextResponse,
} from "next/server";

import { cookies } from "next/headers";
import crypto from "crypto";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RequestBody = {
  names?: unknown;
  ids?: unknown;
};

type BulkEntry = {
  id: string;
  name: string;
  code: string;
};

type CreatedUser = {
  id: string;
  name: string;
  code: string;
  active: boolean;
  approved: boolean;
};

const CODE_CHARS =
  "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

async function isAdmin() {
  const cookieStore = await cookies();

  const session =
    cookieStore.get(
      "qurbonov_session"
    )?.value;

  const role =
    cookieStore.get(
      "qurbonov_role"
    )?.value;

  return Boolean(
    session && role === "admin"
  );
}

function randomPart(
  length: number
) {
  const bytes =
    crypto.randomBytes(length);

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

function normalizeNames(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(
      (
        item: unknown
      ): string =>
        String(item || "")
          .replace(/\s+/g, " ")
          .trim()
    )
    .filter(
      (
        item: string
      ): boolean =>
        Boolean(item)
    );
}

function normalizeIds(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map(
          (
            item: unknown
          ): string =>
            String(item || "")
              .trim()
        )
        .filter(
          (
            item: string
          ): boolean =>
            Boolean(item)
        )
    )
  );
}

async function createUniqueCodes(
  count: number
): Promise<string[]> {
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
      new Set<string>(
        existing.map(
          (row: {
            code?: unknown;
          }): string =>
            String(
              row.code || ""
            )
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
      (await request
        .json()
        .catch(
          () => ({})
        )) as RequestBody;

    const names =
      normalizeNames(
        body.names
      );

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

    const entries:
      BulkEntry[] =
      names.map(
        (
          name: string,
          index: number
        ): BulkEntry => ({
          id:
            crypto.randomUUID(),
          name,
          code:
            codes[index],
        })
      );

    const payload =
      JSON.stringify(entries);

    /*
      MUHIM:
      approved = FALSE
      requested_at = NOW()

      Demak yaratilgan ommaviy kodlar darhol
      "Kirish so‘rovlari" bo‘limida ko‘rinadi va
      admin ruxsat bermaguncha to‘g‘ridan-to‘g‘ri kirmaydi.
    */
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
          FALSE,
          NOW(),
          NOW(),
          NULL,
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
          name,
          code,
          active,
          approved
      `;

    const createdUsers:
      CreatedUser[] =
      rows.map(
        (row: {
          id?: unknown;
          name?: unknown;
          code?: unknown;
          active?: unknown;
          approved?: unknown;
        }): CreatedUser => ({
          id:
            String(
              row.id || ""
            ),
          name:
            String(
              row.name || ""
            ),
          code:
            String(
              row.code || ""
            ),
          active:
            row.active === true,
          approved:
            row.approved === true,
        })
      );

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

    return NextResponse.json({
      success: true,
      count:
        createdUsers.length,
      users:
        createdUsers,
      message:
        `${createdUsers.length} ta kod yaratildi. Ruxsat berilmaguncha foydalanuvchilar kira olmaydi.`,
    });
  } catch (error) {
    console.error(
      "BULK ACCESS CODE POST ERROR:",
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

export async function PATCH(
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
      (await request
        .json()
        .catch(
          () => ({})
        )) as RequestBody;

    const ids =
      normalizeIds(
        body.ids
      );

    if (
      ids.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Ruxsat beriladigan kodlar topilmadi.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      ids.length > 500
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bir martada maksimum 500 ta kodga ruxsat beriladi.",
        },
        {
          status: 400,
        }
      );
    }

    const payload =
      JSON.stringify(ids);

    const rows =
      await sql`
        UPDATE access_codes
        SET
          active = TRUE,
          approved = TRUE,
          approved_at = NOW(),
          rejected_at = NULL
        WHERE id IN (
          SELECT value
          FROM jsonb_array_elements_text(
            ${payload}::jsonb
          )
        )
        RETURNING id
      `;

    return NextResponse.json({
      success: true,
      count:
        rows.length,
      message:
        `${rows.length} ta kodga kirish ruxsati berildi.`,
    });
  } catch (error) {
    console.error(
      "BULK ACCESS CODE PATCH ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Ommaviy ruxsat berishda server xatosi yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
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
      (await request
        .json()
        .catch(
          () => ({})
        )) as RequestBody;

    const ids =
      normalizeIds(
        body.ids
      );

    if (
      ids.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "O‘chiriladigan kodlar topilmadi.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      ids.length > 500
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bir martada maksimum 500 ta kod o‘chiriladi.",
        },
        {
          status: 400,
        }
      );
    }

    const payload =
      JSON.stringify(ids);

    /*
      MUHIM:
      Faqat administrator avval RUXSAT BERGAN
      (approved = TRUE) kodlargina o‘chiriladi.

      Ruxsat kutilayotgan kodlarga tegilmaydi.
    */
    const rows =
      await sql`
        DELETE FROM access_codes
        WHERE id IN (
          SELECT value
          FROM jsonb_array_elements_text(
            ${payload}::jsonb
          )
        )
        AND approved = TRUE
        RETURNING id
      `;

    const deletedIds =
      rows.map(
        (row: {
          id?: unknown;
        }): string =>
          String(
            row.id || ""
          )
      )
      .filter(
        (id: string): boolean =>
          Boolean(id)
      );

    return NextResponse.json({
      success: true,
      count:
        deletedIds.length,
      ids:
        deletedIds,
      message:
        deletedIds.length > 0
          ? `${deletedIds.length} ta ruxsat berilgan ommaviy kod o‘chirildi.`
          : "Ruxsat berilgan ommaviy kod topilmadi.",
    });
  } catch (error) {
    console.error(
      "BULK ACCESS CODE DELETE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Ommaviy kodlarni o‘chirishda server xatosi yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}
