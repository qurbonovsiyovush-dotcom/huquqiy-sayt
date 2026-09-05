import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DictionaryWord = {
  id: string;
  english: string;
  uzbek: string;
  createdAt: string;
  updatedAt: string;
};

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };
}

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function makeId() {
  return `dict_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function mapRow(row: any): DictionaryWord {
  return {
    id: String(row.id),
    english: String(row.english ?? ""),
    uzbek: String(row.uzbek ?? ""),
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at ?? ""),
    updatedAt:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at ?? ""),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = cleanText(searchParams.get("q"));

    let rows: any[];

    if (q) {
      const pattern = `%${q}%`;

      rows = await sql`
        SELECT
          id,
          english,
          uzbek,
          created_at,
          updated_at
        FROM english_uzbek_dictionary
        WHERE
          english ILIKE ${pattern}
          OR uzbek ILIKE ${pattern}
        ORDER BY LOWER(english) ASC, created_at ASC
      `;
    } else {
      rows = await sql`
        SELECT
          id,
          english,
          uzbek,
          created_at,
          updated_at
        FROM english_uzbek_dictionary
        ORDER BY LOWER(english) ASC, created_at ASC
      `;
    }

    const words = rows.map(mapRow);

    return NextResponse.json(
      {
        ok: true,
        success: true,
        total: words.length,
        count: words.length,
        words,
      },
      {
        status: 200,
        headers: noStoreHeaders(),
      }
    );
  } catch (error) {
    console.error("ENGLISH-UZBEK GET ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        success: false,
        message: "Lug‘atni yuklab bo‘lmadi.",
      },
      {
        status: 500,
        headers: noStoreHeaders(),
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const english = cleanText(body?.english);
    const uzbek = cleanText(body?.uzbek);

    if (!english) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          message: "Inglizcha so‘zni kiriting.",
        },
        {
          status: 400,
          headers: noStoreHeaders(),
        }
      );
    }

    if (!uzbek) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          message: "O‘zbekcha tarjimani kiriting.",
        },
        {
          status: 400,
          headers: noStoreHeaders(),
        }
      );
    }

    const duplicateRows = await sql`
      SELECT id
      FROM english_uzbek_dictionary
      WHERE LOWER(english) = LOWER(${english})
      LIMIT 1
    `;

    if (duplicateRows.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          message: "Bu inglizcha so‘z lug‘atda allaqachon mavjud.",
        },
        {
          status: 409,
          headers: noStoreHeaders(),
        }
      );
    }

    const id = cleanText(body?.id) || makeId();
    const now = new Date().toISOString();

    const rows = await sql`
      INSERT INTO english_uzbek_dictionary (
        id,
        english,
        uzbek,
        created_at,
        updated_at
      )
      VALUES (
        ${id},
        ${english},
        ${uzbek},
        ${now},
        ${now}
      )
      RETURNING
        id,
        english,
        uzbek,
        created_at,
        updated_at
    `;

    const word = mapRow(rows[0]);

    return NextResponse.json(
      {
        ok: true,
        success: true,
        message: "So‘z muvaffaqiyatli qo‘shildi.",
        word,
      },
      {
        status: 201,
        headers: noStoreHeaders(),
      }
    );
  } catch (error) {
    console.error("ENGLISH-UZBEK POST ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        success: false,
        message: "So‘zni saqlashda xatolik yuz berdi.",
      },
      {
        status: 500,
        headers: noStoreHeaders(),
      }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const id = cleanText(body?.id);
    const english = cleanText(body?.english);
    const uzbek = cleanText(body?.uzbek);

    if (!id) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          message: "So‘z ID topilmadi.",
        },
        {
          status: 400,
          headers: noStoreHeaders(),
        }
      );
    }

    if (!english) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          message: "Inglizcha so‘zni kiriting.",
        },
        {
          status: 400,
          headers: noStoreHeaders(),
        }
      );
    }

    if (!uzbek) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          message: "O‘zbekcha tarjimani kiriting.",
        },
        {
          status: 400,
          headers: noStoreHeaders(),
        }
      );
    }

    const duplicateRows = await sql`
      SELECT id
      FROM english_uzbek_dictionary
      WHERE
        LOWER(english) = LOWER(${english})
        AND id <> ${id}
      LIMIT 1
    `;

    if (duplicateRows.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          message: "Bu inglizcha so‘z boshqa yozuvda allaqachon mavjud.",
        },
        {
          status: 409,
          headers: noStoreHeaders(),
        }
      );
    }

    const rows = await sql`
      UPDATE english_uzbek_dictionary
      SET
        english = ${english},
        uzbek = ${uzbek},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING
        id,
        english,
        uzbek,
        created_at,
        updated_at
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          message: "So‘z topilmadi.",
        },
        {
          status: 404,
          headers: noStoreHeaders(),
        }
      );
    }

    const word = mapRow(rows[0]);

    return NextResponse.json(
      {
        ok: true,
        success: true,
        message: "So‘z muvaffaqiyatli yangilandi.",
        word,
      },
      {
        status: 200,
        headers: noStoreHeaders(),
      }
    );
  } catch (error) {
    console.error("ENGLISH-UZBEK PUT ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        success: false,
        message: "So‘zni yangilashda xatolik yuz berdi.",
      },
      {
        status: 500,
        headers: noStoreHeaders(),
      }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    let id = cleanText(searchParams.get("id"));

    if (!id) {
      try {
        const body = await request.json();
        id = cleanText(body?.id);
      } catch {
        // body bo‘lmasligi mumkin
      }
    }

    if (!id) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          message: "O‘chirish uchun so‘z ID topilmadi.",
        },
        {
          status: 400,
          headers: noStoreHeaders(),
        }
      );
    }

    const rows = await sql`
      DELETE FROM english_uzbek_dictionary
      WHERE id = ${id}
      RETURNING id
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          message: "So‘z topilmadi.",
        },
        {
          status: 404,
          headers: noStoreHeaders(),
        }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        success: true,
        message: "So‘z muvaffaqiyatli o‘chirildi.",
        id,
      },
      {
        status: 200,
        headers: noStoreHeaders(),
      }
    );
  } catch (error) {
    console.error("ENGLISH-UZBEK DELETE ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        success: false,
        message: "So‘zni o‘chirishda xatolik yuz berdi.",
      },
      {
        status: 500,
        headers: noStoreHeaders(),
      }
    );
  }
}
