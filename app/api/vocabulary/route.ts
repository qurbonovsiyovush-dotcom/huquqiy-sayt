import { NextRequest, NextResponse } from "next/server";
import { get, put } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VOCABULARY_BLOB_PATH =
  "huquqiy-sayt/vocabulary.json";

/* =========================================================
   TYPES
========================================================= */

type VocabularyWord = {
  word: string;
  translation: string;

  example?: string;
  exampleTranslation?: string;
};

type VocabularyUnit = {
  book: number;
  unit: number;
  words: VocabularyWord[];
  updatedAt: string;
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
   BLOB TOKEN
========================================================= */

function checkBlobToken() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN topilmadi."
    );
  }
}

/* =========================================================
   BOOK TEKSHIRISH
========================================================= */

function isValidBook(book: number) {
  return (
    Number.isInteger(book) &&
    book >= 1 &&
    book <= 6
  );
}

/* =========================================================
   UNIT TEKSHIRISH
========================================================= */

function isValidUnit(unit: number) {
  return (
    Number.isInteger(unit) &&
    unit >= 1 &&
    unit <= 30
  );
}

/* =========================================================
   VOCABULARY O‘QISH
========================================================= */

async function readVocabulary(): Promise<
  VocabularyUnit[]
> {
  checkBlobToken();

  try {
    const result = await get(
      VOCABULARY_BLOB_PATH,
      {
        access: "private",
      }
    );

    if (
      !result ||
      result.statusCode !== 200 ||
      !result.stream
    ) {
      return [];
    }

    const text =
      await new Response(
        result.stream
      ).text();

    if (!text.trim()) {
      return [];
    }

    const parsed: unknown =
      JSON.parse(text);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as VocabularyUnit[];
  } catch (error) {
    console.error(
      "readVocabulary ERROR:",
      error
    );

    return [];
  }
}

/* =========================================================
   VOCABULARY YOZISH
========================================================= */

async function writeVocabulary(
  data: VocabularyUnit[]
) {
  checkBlobToken();

  await put(
    VOCABULARY_BLOB_PATH,
    JSON.stringify(
      data,
      null,
      2
    ),
    {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType:
        "application/json; charset=utf-8",
      cacheControlMaxAge: 60,
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
      return NextResponse.json(
        {
          success: false,
          message:
            "Book 1 dan 6 gacha bo‘lishi kerak.",
        },
        {
          status: 400,
        }
      );
    }

    if (!isValidUnit(unit)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unit 1 dan 30 gacha bo‘lishi kerak.",
        },
        {
          status: 400,
        }
      );
    }

    const vocabulary =
      await readVocabulary();

    const found =
      vocabulary.find(
        (
          item: VocabularyUnit
        ) =>
          item.book === book &&
          item.unit === unit
      );

    return NextResponse.json(
      {
        success: true,
        book,
        unit,
        words:
          found?.words ?? [],
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
      }
    );
  }
}

/* =========================================================
   POST

   BOOK + UNIT UCHUN SO‘ZLARNI SAQLASH
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
      return NextResponse.json(
        {
          success: false,

          message:
            "Book 1 dan 6 gacha bo‘lishi kerak.",
        },
        {
          status: 400,
        }
      );
    }

    if (!isValidUnit(unit)) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Unit 1 dan 30 gacha bo‘lishi kerak.",
        },
        {
          status: 400,
        }
      );
    }

    const incomingWords: RawVocabularyWord[] =
      Array.isArray(body.words)
        ? (
            body.words as RawVocabularyWord[]
          )
        : [];

    const words: VocabularyWord[] =
      incomingWords
        .map(
          (
            item: RawVocabularyWord
          ): VocabularyWord => {
            const word = String(
              item.word ?? ""
            ).trim();

            const translation =
              String(
                item.translation ?? ""
              ).trim();

            const example =
              String(
                item.example ?? ""
              ).trim();

            const exampleTranslation =
              String(
                item.exampleTranslation ?? ""
              ).trim();

            return {
              word,
              translation,

              ...(example
                ? {
                    example,
                  }
                : {}),

              ...(exampleTranslation
                ? {
                    exampleTranslation,
                  }
                : {}),
            };
          }
        )
        .filter(
          (
            item: VocabularyWord
          ) =>
            item.word.length > 0 &&
            item.translation.length > 0
        );

    if (words.length === 0) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Kamida bitta so‘z kiritilishi kerak.",
        },
        {
          status: 400,
        }
      );
    }

    const vocabulary =
      await readVocabulary();

    const now =
      new Date().toISOString();

    const existingIndex =
      vocabulary.findIndex(
        (
          item: VocabularyUnit
        ) =>
          item.book === book &&
          item.unit === unit
      );

    const unitData: VocabularyUnit = {
      book,
      unit,
      words,
      updatedAt: now,
    };

    if (
      existingIndex >= 0
    ) {
      vocabulary[
        existingIndex
      ] = unitData;
    } else {
      vocabulary.push(
        unitData
      );
    }

    await writeVocabulary(
      vocabulary
    );

    return NextResponse.json(
      {
        success: true,

        message:
          `Book ${book}, Unit ${unit} uchun ` +
          `${words.length} ta so‘z saqlandi.`,

        book,
        unit,
        count: words.length,
        words,
      },
      {
        status: 200,
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
      }
    );
  }
}
