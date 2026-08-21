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
};

type VocabularyPostBody = {
  book?: unknown;
  unit?: unknown;
  words?: unknown;
};

/* =========================================================
   BLOB TOKEN TEKSHIRISH
========================================================= */

function checkBlobToken() {
  if (
    !process.env
      .BLOB_READ_WRITE_TOKEN
  ) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN topilmadi."
    );
  }
}

/* =========================================================
   VOCABULARY'NI BLOB'DAN O‘QISH
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

    /*
      vocabulary.json hali
      mavjud bo‘lmasa bo‘sh
      massiv qaytadi.
    */

    return [];
  }
}

/* =========================================================
   VOCABULARY'NI BLOB'GA YOZISH
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
   BOOK TEKSHIRISH
========================================================= */

function isValidBook(
  book: number
) {
  return (
    Number.isInteger(book) &&
    book >= 1 &&
    book <= 6
  );
}

/* =========================================================
   UNIT TEKSHIRISH
========================================================= */

function isValidUnit(
  unit: number
) {
  return (
    Number.isInteger(unit) &&
    unit >= 1 &&
    unit <= 30
  );
}

/* =========================================================
   GET

   MISOL:
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

    /* =====================================================
       BOOK TEKSHIRISH
    ===================================================== */

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

    /* =====================================================
       UNIT TEKSHIRISH
    ===================================================== */

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

    /* =====================================================
       VOCABULARY O‘QISH
    ===================================================== */

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

    /* =====================================================
       JAVOB
    ===================================================== */

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

   ADMIN BOOK + UNIT UCHUN SO‘ZLARNI SAQLAYDI
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

    /* =====================================================
       BOOK TEKSHIRISH
    ===================================================== */

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

    /* =====================================================
       UNIT TEKSHIRISH
    ===================================================== */

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

    /* =====================================================
       KELGAN SO‘ZLARNI OLISH
    ===================================================== */

    const incomingWords: RawVocabularyWord[] =
      Array.isArray(body.words)
        ? (
            body.words as RawVocabularyWord[]
          )
        : [];

    /* =====================================================
       SO‘ZLARNI TOZALASH
    ===================================================== */

    const words: VocabularyWord[] =
      incomingWords
        .map(
          (
            item: RawVocabularyWord
          ): VocabularyWord => ({
            word: String(
              item.word ?? ""
            ).trim(),

            translation: String(
              item.translation ?? ""
            ).trim(),
          })
        )
        .filter(
          (
            item: VocabularyWord
          ) =>
            item.word.length > 0 &&
            item.translation.length >
              0
        );

    /* =====================================================
       SO‘Z BORMI?
    ===================================================== */

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

    /* =====================================================
       MAVJUD VOCABULARY'NI O‘QISH
    ===================================================== */

    const vocabulary =
      await readVocabulary();

    const now =
      new Date().toISOString();

    /* =====================================================
       BOOK + UNIT MAVJUDMI?
    ===================================================== */

    const existingIndex =
      vocabulary.findIndex(
        (
          item: VocabularyUnit
        ) =>
          item.book === book &&
          item.unit === unit
      );

    /* =====================================================
       YANGI UNIT MA'LUMOTI
    ===================================================== */

    const unitData: VocabularyUnit =
      {
        book,
        unit,
        words,
        updatedAt: now,
      };

    /* =====================================================
       MAVJUD BO‘LSA YANGILAYMIZ
       YO‘Q BO‘LSA QO‘SHAMIZ
    ===================================================== */

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

    /* =====================================================
       BLOB'GA SAQLASH
    ===================================================== */

    await writeVocabulary(
      vocabulary
    );

    /* =====================================================
       NATIJA
    ===================================================== */

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
