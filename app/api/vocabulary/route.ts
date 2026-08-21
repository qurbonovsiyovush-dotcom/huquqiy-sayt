import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  get,
  put,
} from "@vercel/blob";

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
   BOOK VALIDATION
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
   UNIT VALIDATION
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
   WORD NORMALIZE
========================================================= */

function normalizeWord(
  item: RawVocabularyWord
): VocabularyWord | null {
  const word =
    String(
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
      item.exampleTranslation ??
        ""
    ).trim();

  if (
    !word ||
    !translation
  ) {
    return null;
  }

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

/* =========================================================
   VOCABULARY NORMALIZE
========================================================= */

function normalizeVocabulary(
  value: unknown
): VocabularyUnit[] {
  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  const result: VocabularyUnit[] =
    [];

  for (
    const item of value
  ) {
    if (
      !item ||
      typeof item !==
        "object"
    ) {
      continue;
    }

    const raw =
      item as Record<
        string,
        unknown
      >;

    const book =
      Number(raw.book);

    const unit =
      Number(raw.unit);

    if (
      !isValidBook(book) ||
      !isValidUnit(unit)
    ) {
      continue;
    }

    const rawWords =
      Array.isArray(
        raw.words
      )
        ? raw.words
        : [];

    const words =
      rawWords
        .map((word) =>
          normalizeWord(
            (word ?? {}) as RawVocabularyWord
          )
        )
        .filter(
          (
            word
          ): word is VocabularyWord =>
            word !== null
        );

    result.push({
      book,
      unit,
      words,

      updatedAt:
        typeof raw.updatedAt ===
        "string"
          ? raw.updatedAt
          : "",
    });
  }

  return result;
}

/* =========================================================
   VOCABULARY O‘QISH
========================================================= */

async function readVocabulary(): Promise<
  VocabularyUnit[]
> {
  checkBlobToken();

  try {
    const result =
      await get(
        VOCABULARY_BLOB_PATH,
        {
          access:
            "private",
        }
      );

    if (
      !result ||
      result.statusCode !==
        200 ||
      !result.stream
    ) {
      return [];
    }

    const text =
      await new Response(
        result.stream
      ).text();

    if (
      !text.trim()
    ) {
      return [];
    }

    const parsed: unknown =
      JSON.parse(text);

    return normalizeVocabulary(
      parsed
    );
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
      access:
        "private",

      addRandomSuffix:
        false,

      allowOverwrite:
        true,

      contentType:
        "application/json; charset=utf-8",

      cacheControlMaxAge:
        60,
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
    const {
      searchParams,
    } =
      new URL(
        request.url
      );

    const book =
      Number(
        searchParams.get(
          "book"
        )
      );

    const unit =
      Number(
        searchParams.get(
          "unit"
        )
      );

    if (
      !isValidBook(book)
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Book 1 dan 6 gacha bo‘lishi kerak.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      !isValidUnit(unit)
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Unit 1 dan 30 gacha bo‘lishi kerak.",
        },
        {
          status:
            400,
        }
      );
    }

    const vocabulary =
      await readVocabulary();

    const found =
      vocabulary.find(
        (
          item:
            VocabularyUnit
        ) =>
          item.book ===
            book &&
          item.unit ===
            unit
      );

    return NextResponse.json(
      {
        success:
          true,

        book,
        unit,

        count:
          found?.words.length ??
          0,

        words:
          found?.words ??
          [],
      },
      {
        status:
          200,

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
        success:
          false,

        message:
          error instanceof Error
            ? error.message
            : "Vocabulary yuklashda server xatosi.",
      },
      {
        status:
          500,
      }
    );
  }
}

/* =========================================================
   POST
   BOOK + UNIT SO‘ZLARINI SAQLASH
========================================================= */

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      (await request.json()) as VocabularyPostBody;

    const book =
      Number(
        body.book
      );

    const unit =
      Number(
        body.unit
      );

    if (
      !isValidBook(book)
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Book 1 dan 6 gacha bo‘lishi kerak.",
        },
        {
          status:
            400,
        }
      );
    }

    if (
      !isValidUnit(unit)
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Unit 1 dan 30 gacha bo‘lishi kerak.",
        },
        {
          status:
            400,
        }
      );
    }

    const incomingWords =
      Array.isArray(
        body.words
      )
        ? body.words
        : [];

    const words: VocabularyWord[] =
      incomingWords
        .map((item) =>
          normalizeWord(
            (item ?? {}) as RawVocabularyWord
          )
        )

        .filter(
          (
            item
          ): item is VocabularyWord =>
            item !== null
        );

    if (
      words.length ===
      0
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Kamida bitta so‘z kiritilishi kerak.",
        },
        {
          status:
            400,
        }
      );
    }

    /*
      Mavjud vocabulary ni
      avval o‘qiymiz.

      Shu sababli boshqa
      Book va Unitlar
      o‘chib ketmaydi.
    */

    const vocabulary =
      await readVocabulary();

    const now =
      new Date()
        .toISOString();

    const existingIndex =
      vocabulary.findIndex(
        (
          item:
            VocabularyUnit
        ) =>
          item.book ===
            book &&
          item.unit ===
            unit
      );

    const unitData: VocabularyUnit =
      {
        book,
        unit,
        words,
        updatedAt:
          now,
      };

    /*
      Unit mavjud bo‘lsa
      faqat shu Unit
      yangilanadi.

      Boshqa Unitlar
      o‘z joyida qoladi.
    */

    if (
      existingIndex >=
      0
    ) {
      vocabulary[
        existingIndex
      ] = unitData;
    } else {
      vocabulary.push(
        unitData
      );
    }

    /*
      Tartibli saqlaymiz:
      Book → Unit
    */

    vocabulary.sort(
      (
        a:
          VocabularyUnit,
        b:
          VocabularyUnit
      ) => {
        if (
          a.book !==
          b.book
        ) {
          return (
            a.book -
            b.book
          );
        }

        return (
          a.unit -
          b.unit
        );
      }
    );

    await writeVocabulary(
      vocabulary
    );

    return NextResponse.json(
      {
        success:
          true,

        message:
          `Book ${book}, Unit ${unit} uchun ${words.length} ta so‘z saqlandi.`,

        book,
        unit,

        count:
          words.length,

        words,
      },
      {
        status:
          200,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/vocabulary ERROR:",
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          error instanceof Error
            ? error.message
            : "Vocabulary saqlashda server xatosi.",
      },
      {
        status:
          500,
      }
    );
  }
}
