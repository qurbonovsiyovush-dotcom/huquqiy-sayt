import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAdmin() {
  const cookieStore = await cookies();

  return (
    Boolean(cookieStore.get("qurbonov_session")?.value) &&
    cookieStore.get("qurbonov_role")?.value === "admin"
  );
}

function cleanText(value: unknown) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ")
    : "";
}

/* =========================
   GET
   ========================= */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = cleanText(searchParams.get("q"));

    let rows;

    if (q) {
      rows = await sql`
        SELECT
          id,
          word,
          uzbek,
          synonym,
          synonym_uzbek AS "synonymUzbek",
          word_order AS "wordOrder"
        FROM synonyms
        WHERE
          LOWER(word) LIKE ${`%${q.toLowerCase()}%`}
          OR LOWER(synonym) LIKE ${`%${q.toLowerCase()}%`}
          OR LOWER(uzbek) LIKE ${`%${q.toLowerCase()}%`}
        ORDER BY word_order ASC, id ASC
      `;
    } else {
      rows = await sql`
        SELECT
          id,
          word,
          uzbek,
          synonym,
          synonym_uzbek AS "synonymUzbek",
          word_order AS "wordOrder"
        FROM synonyms
        ORDER BY word_order ASC, id ASC
      `;
    }

    return NextResponse.json(
      {
        success: true,
        synonyms: rows,
        total: rows.length,
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error("SYNONYMS GET ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Sinonimlarni yuklashda xatolik yuz berdi.",
        synonyms: [],
        total: 0,
      },
      { status: 500 }
    );
  }
}

/* =========================
   POST — ADMIN
   ========================= */

export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        {
          success: false,
          message: "Ruxsat berilmagan.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const word = cleanText(body?.word);
    const uzbek = cleanText(body?.uzbek);
    const synonym = cleanText(body?.synonym);

    const synonymUzbek =
      cleanText(
        body?.synonymUzbek ??
          body?.synonym_uzbek
      ) || null;

    if (!word || !uzbek || !synonym) {
      return NextResponse.json(
        {
          success: false,
          message:
            "word, uzbek va synonym maydonlari majburiy.",
        },
        { status: 400 }
      );
    }

    const orderResult = await sql`
      SELECT
        COALESCE(MAX(word_order), 0) + 1 AS next_order
      FROM synonyms
    `;

    const wordOrder =
      Number(orderResult[0]?.next_order ?? 1);

    const rows = await sql`
      INSERT INTO synonyms (
        word,
        uzbek,
        synonym,
        synonym_uzbek,
        word_order
      )
      VALUES (
        ${word},
        ${uzbek},
        ${synonym},
        ${synonymUzbek},
        ${wordOrder}
      )
      RETURNING
        id,
        word,
        uzbek,
        synonym,
        synonym_uzbek AS "synonymUzbek",
        word_order AS "wordOrder"
    `;

    return NextResponse.json({
      success: true,
      synonym: rows[0],
    });
  } catch (error) {
    console.error("SYNONYMS POST ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Sinonimni saqlashda xatolik yuz berdi.",
      },
      { status: 500 }
    );
  }
}

/* =========================
   PUT — ADMIN
   ========================= */

export async function PUT(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        {
          success: false,
          message: "Ruxsat berilmagan.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const id = Number(body?.id);
    const word = cleanText(body?.word);
    const uzbek = cleanText(body?.uzbek);
    const synonym = cleanText(body?.synonym);

    const synonymUzbek =
      cleanText(
        body?.synonymUzbek ??
          body?.synonym_uzbek
      ) || null;

    if (
      !Number.isInteger(id) ||
      id <= 0 ||
      !word ||
      !uzbek ||
      !synonym
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Ma’lumotlar noto‘g‘ri.",
        },
        { status: 400 }
      );
    }

    const rows = await sql`
      UPDATE synonyms
      SET
        word = ${word},
        uzbek = ${uzbek},
        synonym = ${synonym},
        synonym_uzbek = ${synonymUzbek},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING
        id,
        word,
        uzbek,
        synonym,
        synonym_uzbek AS "synonymUzbek",
        word_order AS "wordOrder"
    `;

    if (!rows.length) {
      return NextResponse.json(
        {
          success: false,
          message: "Sinonim topilmadi.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      synonym: rows[0],
    });
  } catch (error) {
    console.error("SYNONYMS PUT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Sinonimni tahrirlashda xatolik yuz berdi.",
      },
      { status: 500 }
    );
  }
}

/* =========================
   DELETE — ADMIN
   ========================= */

export async function DELETE(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        {
          success: false,
          message: "Ruxsat berilmagan.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "ID noto‘g‘ri.",
        },
        { status: 400 }
      );
    }

    const rows = await sql`
      DELETE FROM synonyms
      WHERE id = ${id}
      RETURNING id
    `;

    if (!rows.length) {
      return NextResponse.json(
        {
          success: false,
          message: "Sinonim topilmadi.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedId: id,
    });
  } catch (error) {
    console.error("SYNONYMS DELETE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Sinonimni o‘chirishda xatolik yuz berdi.",
      },
      { status: 500 }
    );
  }
}
