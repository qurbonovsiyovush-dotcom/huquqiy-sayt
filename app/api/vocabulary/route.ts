import {
  NextRequest,
  NextResponse,
} from "next/server";

import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* =========================================================
   TYPES
========================================================= */

type VocabularyWord = {
  word: string;
  translation: string;
  example?: string;
  exampleTranslation?: string;
};

type RawVocabularyWord = {
  word?: unknown;
  translation?: unknown;
  example?: unknown;
  exampleTranslation?: unknown;
};

type VocabularyPostBody = {
  book?: unknown;
  unit?: unknown;
  words?: unknown;
};

/* =========================================================
   COMMON HEADERS
========================================================= */

const NO_CACHE_HEADERS = {
  "Cache-Control":
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

/* =========================================================
   VALIDATION
========================================================= */

function isValidBook(book: number) {
  return (
    Number.isInteger(book) &&
    book >= 1 &&
    book <= 6
  );
}

function isValidUnit(unit: number) {
  return (
    Number.isInteger(unit) &&
    unit >= 1 &&
    unit <= 30
  );
}

function normalizeWord(
  item: RawVocabularyWord
): VocabularyWord | null {
  const word = String(
    item.word ?? ""
  ).trim();

  const translation = String(
    item.translation ?? ""
  ).trim();

  const example = String(
    item.example ?? ""
  ).trim();

  const exampleTranslation = String(
    item.exampleTranslation ?? ""
  ).trim();

  if (!word || !translation) {
    return null;
  }

  return {
    word,
    translation,
    ...(example
      ? { example }
      : {}),
    ...(exampleTranslation
      ? { exampleTranslation }
      : {}),
  };
}

function validationError(
  message: string
) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    {
      status: 400,
      headers: NO_CACHE_HEADERS,
    }
  );
}

/* =========================================================
   GET
   /api/vocabulary?book=1&unit=1
========================================================= */

export async function GET(
  request: NextRequest
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const book = Number(
      searchParams.get("book")
    );

    const unit = Number(
      searchParams.get("unit")
    );

    if (!isValidBook(book)) {
      return validationError(
        "Book 1 dan 6 gacha bo‘lishi kerak."
      );
    }

    if (!isValidUnit(unit)) {
      return validationError(
        "Unit 1 dan 30 gacha bo‘lishi kerak."
      );
    }

    const unitRows = await sql`
      SELECT
        id,
        updated_at
      FROM vocabulary_units
      WHERE book = ${book}
        AND unit = ${unit}
      LIMIT 1
    `;

    if (unitRows.length === 0) {
      return NextResponse.json(
        {
          success: true,
          book,
          unit,
          count: 0,
          words: [],
          updatedAt: null,
        },
        {
          status: 200,
          headers: NO_CACHE_HEADERS,
        }
      );
    }

    const unitId = Number(
      unitRows[0].id
    );

    const wordRows = await sql`
      SELECT
        word,
        translation,
        example,
        example_translation
      FROM vocabulary_words
      WHERE unit_id = ${unitId}
      ORDER BY word_order ASC, id ASC
    `;

    const words: VocabularyWord[] =
      wordRows.map((row) => {
        const example =
          row.example == null
            ? ""
            : String(row.example);

        const exampleTranslation =
          row.example_translation == null
            ? ""
            : String(
                row.example_translation
              );

        return {
          word: String(row.word),
          translation: String(
            row.translation
          ),
          ...(example
            ? { example }
            : {}),
          ...(exampleTranslation
            ? {
                exampleTranslation,
              }
            : {}),
        };
      });

    const updatedAtRaw =
      unitRows[0].updated_at;

    const updatedAt =
      updatedAtRaw instanceof Date
        ? updatedAtRaw.toISOString()
        : updatedAtRaw
          ? new Date(
              String(updatedAtRaw)
            ).toISOString()
          : null;

    return NextResponse.json(
      {
        success: true,
        book,
        unit,
        count: words.length,
        words,
        updatedAt,
      },
      {
        status: 200,
        headers: NO_CACHE_HEADERS,
      }
    );
  } catch (error) {
    console.error(
      "GET /api/vocabulary ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Vocabulary yuklashda server xatosi.",
      },
      {
        status: 500,
        headers: NO_CACHE_HEADERS,
      }
    );
  }
}

/* =========================================================
   POST
   BOOK + UNIT SO‘ZLARINI NEON'GA SAQLASH
========================================================= */

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      (await request.json()) as VocabularyPostBody;

    const book = Number(
      body.book
    );

    const unit = Number(
      body.unit
    );

    if (!isValidBook(book)) {
      return validationError(
        "Book 1 dan 6 gacha bo‘lishi kerak."
      );
    }

    if (!isValidUnit(unit)) {
      return validationError(
        "Unit 1 dan 30 gacha bo‘lishi kerak."
      );
    }

    const incomingWords =
      Array.isArray(body.words)
        ? body.words
        : [];

    const words: VocabularyWord[] =
      incomingWords
        .map((item) =>
          normalizeWord(
            (item ??
              {}) as RawVocabularyWord
          )
        )
        .filter(
          (
            item
          ): item is VocabularyWord =>
            item !== null
        );

    if (words.length === 0) {
      return validationError(
        "Kamida bitta so‘z kiritilishi kerak."
      );
    }

    /*
      1) Book + Unit yozuvini yaratamiz yoki yangilaymiz.
    */
    const unitRows = await sql`
      INSERT INTO vocabulary_units (
        book,
        unit,
        updated_at
      )
      VALUES (
        ${book},
        ${unit},
        NOW()
      )
      ON CONFLICT (book, unit)
      DO UPDATE SET
        updated_at = NOW()
      RETURNING
        id,
        updated_at
    `;

    const unitId = Number(
      unitRows[0].id
    );

    /*
      2) Shu Unitning eski so‘zlarini o‘chiramiz.
         Boshqa Book va Unitlarga tegmaymiz.
    */
    await sql`
      DELETE FROM vocabulary_words
      WHERE unit_id = ${unitId}
    `;

    /*
      3) Yangi so‘zlarni bitta SQL bilan joylaymiz.
    */
    const insertPayload =
      words.map(
        (item, index) => ({
          word_order: index + 1,
          word: item.word,
          translation:
            item.translation,
          example:
            item.example ?? null,
          example_translation:
            item.exampleTranslation ??
            null,
        })
      );

    await sql`
      INSERT INTO vocabulary_words (
        unit_id,
        word_order,
        word,
        translation,
        example,
        example_translation,
        created_at,
        updated_at
      )
      SELECT
        ${unitId},
        x.word_order,
        x.word,
        x.translation,
        x.example,
        x.example_translation,
        NOW(),
        NOW()
      FROM jsonb_to_recordset(
        ${JSON.stringify(
          insertPayload
        )}::jsonb
      ) AS x(
        word_order integer,
        word text,
        translation text,
        example text,
        example_translation text
      )
    `;

    /*
      4) Haqiqatan saqlanganini Neon'dan qayta o‘qib tekshiramiz.
    */
    const savedRows = await sql`
      SELECT
        word,
        translation,
        example,
        example_translation
      FROM vocabulary_words
      WHERE unit_id = ${unitId}
      ORDER BY word_order ASC, id ASC
    `;

    const savedWords: VocabularyWord[] =
      savedRows.map((row) => {
        const example =
          row.example == null
            ? ""
            : String(row.example);

        const exampleTranslation =
          row.example_translation == null
            ? ""
            : String(
                row.example_translation
              );

        return {
          word: String(row.word),
          translation: String(
            row.translation
          ),
          ...(example
            ? { example }
            : {}),
          ...(exampleTranslation
            ? {
                exampleTranslation,
              }
            : {}),
        };
      });

    if (
      savedWords.length !==
      words.length
    ) {
      throw new Error(
        "So‘zlar Neon'ga yuborildi, lekin saqlangan soni mos kelmadi."
      );
    }

    const updatedAtRaw =
      unitRows[0].updated_at;

    const updatedAt =
      updatedAtRaw instanceof Date
        ? updatedAtRaw.toISOString()
        : updatedAtRaw
          ? new Date(
              String(updatedAtRaw)
            ).toISOString()
          : new Date().toISOString();

    return NextResponse.json(
      {
        success: true,
        message:
          `Book ${book}, Unit ${unit} uchun ${savedWords.length} ta so‘z saqlandi.`,
        book,
        unit,
        count: savedWords.length,
        words: savedWords,
        updatedAt,
      },
      {
        status: 200,
        headers: NO_CACHE_HEADERS,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/vocabulary ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Vocabulary saqlashda server xatosi.",
      },
      {
        status: 500,
        headers: NO_CACHE_HEADERS,
      }
    );
  }
}

/* =========================================================
   DELETE
   /api/vocabulary?book=1&unit=1

   Faqat tanlangan Book + Unit o‘chadi.
   ON DELETE CASCADE sabab vocabulary_words ham o‘chadi.
========================================================= */

export async function DELETE(
  request: NextRequest
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const book = Number(
      searchParams.get("book")
    );

    const unit = Number(
      searchParams.get("unit")
    );

    if (!isValidBook(book)) {
      return validationError(
        "Book 1 dan 6 gacha bo‘lishi kerak."
      );
    }

    if (!isValidUnit(unit)) {
      return validationError(
        "Unit 1 dan 30 gacha bo‘lishi kerak."
      );
    }

    const deleted = await sql`
      DELETE FROM vocabulary_units
      WHERE book = ${book}
        AND unit = ${unit}
      RETURNING id
    `;

    return NextResponse.json(
      {
        success: true,
        message:
          deleted.length > 0
            ? `Book ${book}, Unit ${unit} muvaffaqiyatli o‘chirildi.`
            : `Book ${book}, Unit ${unit} da saqlangan so‘zlar yo‘q edi.`,
        book,
        unit,
        count: 0,
        words: [],
        updatedAt: null,
      },
      {
        status: 200,
        headers: NO_CACHE_HEADERS,
      }
    );
  } catch (error) {
    console.error(
      "DELETE /api/vocabulary ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Vocabulary o‘chirishda server xatosi.",
      },
      {
        status: 500,
        headers: NO_CACHE_HEADERS,
      }
    );
  }
}
