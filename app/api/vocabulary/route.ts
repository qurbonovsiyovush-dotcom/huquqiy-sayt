import { NextRequest, NextResponse } from "next/server";
import { get, put } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VOCABULARY_BLOB_PATH = "huquqiy-sayt/vocabulary.json";

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

function checkBlobToken() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN topilmadi.");
  }
}

/* =========================================================
   VOCABULARY'NI BLOB'DAN O‘QISH
========================================================= */

async function readVocabulary(): Promise<VocabularyUnit[]> {
  checkBlobToken();

  try {
    const result = await get(VOCABULARY_BLOB_PATH, {
      access: "private",
    });

    if (
      !result ||
      result.statusCode !== 200 ||
      !result.stream
    ) {
      return [];
    }

    const text = await new Response(result.stream).text();

    if (!text.trim()) {
      return [];
    }

    const parsed = JSON.parse(text);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as VocabularyUnit[];
  } catch {
    return [];
  }
}

/* =========================================================
   VOCABULARY'NI BLOB'GA YOZISH
========================================================= */

async function writeVocabulary(data: VocabularyUnit[]) {
  checkBlobToken();

  await put(
    VOCABULARY_BLOB_PATH,
    JSON.stringify(data, null, 2),
    {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json; charset=utf-8",
      cacheControlMaxAge: 60,
    }
  );
}

/* =========================================================
   GET
   BOOK + UNIT BO‘YICHA SO‘ZLARNI OLISH
========================================================= */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const book = Number(searchParams.get("book"));
    const unit = Number(searchParams.get("unit"));

    if (
      !Number.isInteger(book) ||
      book < 1 ||
      book > 6
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Book noto‘g‘ri.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isInteger(unit) ||
      unit < 1 ||
      unit > 30
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Unit noto‘g‘ri.",
        },
        {
          status: 400,
        }
      );
    }

    const vocabulary = await readVocabulary();

    const found = vocabulary.find(
      (item) =>
        item.book === book &&
        item.unit === unit
    );

    return NextResponse.json(
      {
        success: true,
        book,
        unit,
        words: found?.words || [],
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const book = Number(body?.book);
    const unit = Number(body?.unit);

    if (
      !Number.isInteger(book) ||
      book < 1 ||
      book > 6
    ) {
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

    if (
      !Number.isInteger(unit) ||
      unit < 1 ||
      unit > 30
    ) {
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

    const incomingWords = Array.isArray(body?.words)
      ? body.words
      : [];

    const words: VocabularyWord[] =
      incomingWords
        .map((item) => ({
          word: String(item?.word || "").trim(),
          translation: String(
            item?.translation || ""
          ).trim(),
        }))
        .filter(
          (item) =>
            item.word &&
            item.translation
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

    const vocabulary = await readVocabulary();

    const now = new Date().toISOString();

    const existingIndex =
      vocabulary.findIndex(
        (item) =>
          item.book === book &&
          item.unit === unit
      );

    const unitData: VocabularyUnit = {
      book,
      unit,
      words,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      vocabulary[existingIndex] = unitData;
    } else {
      vocabulary.push(unitData);
    }

    await writeVocabulary(vocabulary);

    return NextResponse.json(
      {
        success: true,
        message: `Book ${book}, Unit ${unit} uchun ${words.length} ta so‘z saqlandi.`,
        book,
        unit,
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
