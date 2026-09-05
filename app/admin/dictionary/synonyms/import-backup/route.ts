import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SynonymInput = {
  word?: unknown;
  uzbek?: unknown;
  synonym?: unknown;
  synonymUzbek?: unknown;
  synonym_uzbek?: unknown;
  wordOrder?: unknown;
  word_order?: unknown;
};

function cleanText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ");
}

function cleanOrder(
  value: unknown,
  fallback: number
): number {
  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    number < 0
  ) {
    return fallback;
  }

  return Math.floor(number);
}

async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies();

  const session =
    cookieStore.get("qurbonov_session")?.value;

  const role =
    cookieStore.get("qurbonov_role")?.value;

  return Boolean(session) && role === "admin";
}

export async function POST(
  request: NextRequest
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Faqat administrator import qilishi mumkin.",
        },
        {
          status: 403,
        }
      );
    }

    const body = await request.json();

    /*
      Quyidagi ikkala JSON ko‘rinishini
      ham qabul qiladi:

      1)
      {
        "synonyms": [...]
      }

      2)
      [...]
    */
    const source: SynonymInput[] =
      Array.isArray(body)
        ? body
        : Array.isArray(body?.synonyms)
          ? body.synonyms
          : [];

    if (source.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Import qilinadigan sinonimlar topilmadi.",
        },
        {
          status: 400,
        }
      );
    }

    if (source.length > 5000) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bir martada 5000 tadan ortiq yozuv import qilib bo‘lmaydi.",
        },
        {
          status: 400,
        }
      );
    }

    const normalized = source
      .map((item, index) => {
        const word =
          cleanText(item?.word);

        const uzbek =
          cleanText(item?.uzbek);

        const synonym =
          cleanText(item?.synonym);

        const synonymUzbek =
          cleanText(
            item?.synonymUzbek ??
              item?.synonym_uzbek
          );

        const wordOrder =
          cleanOrder(
            item?.wordOrder ??
              item?.word_order,
            index + 1
          );

        return {
          word,
          uzbek,
          synonym,
          synonym_uzbek:
            synonymUzbek || null,
          word_order: wordOrder,
        };
      })
      .filter(
        (item) =>
          item.word &&
          item.uzbek &&
          item.synonym
      );

    if (normalized.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Yaroqli sinonim yozuvlari topilmadi.",
        },
        {
          status: 400,
        }
      );
    }

    /*
      Bir xil word + synonym takrorlansa,
      oxirgi yozuvni qoldiramiz.
    */
    const uniqueMap = new Map<
      string,
      (typeof normalized)[number]
    >();

    for (const item of normalized) {
      const key =
        `${item.word.toLowerCase()}::` +
        item.synonym.toLowerCase();

      uniqueMap.set(key, item);
    }

    const uniqueItems =
      Array.from(uniqueMap.values());

    /*
      Importni qayta ishlatish mumkin bo‘lishi
      uchun eski bazani tozalaymiz.

      Masalan 291 talik JSONni qayta import
      qilsangiz 582 bo‘lib ketmaydi.
    */
    await sql`
      DELETE FROM synonyms
    `;

    const json =
      JSON.stringify(uniqueItems);

    await sql`
      INSERT INTO synonyms (
        word,
        uzbek,
        synonym,
        synonym_uzbek,
        word_order
      )
      SELECT
        x.word,
        x.uzbek,
        x.synonym,
        x.synonym_uzbek,
        x.word_order
      FROM jsonb_to_recordset(
        ${json}::jsonb
      ) AS x(
        word text,
        uzbek text,
        synonym text,
        synonym_uzbek text,
        word_order integer
      )
    `;

    const countResult = await sql`
      SELECT COUNT(*)::int AS count
      FROM synonyms
    `;

    const total =
      Number(countResult[0]?.count ?? 0);

    return NextResponse.json(
      {
        success: true,
        message:
          `${uniqueItems.length} ta sinonim ` +
          `Neon bazasiga import qilindi.`,
        imported:
          uniqueItems.length,
        received:
          source.length,
        skipped:
          source.length -
          normalized.length,
        total,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "SYNONYMS IMPORT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Sinonimlarni import qilishda server xatosi yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}
