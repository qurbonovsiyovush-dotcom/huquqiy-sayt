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
export const revalidate = 0;

/*
  ESKI BAZA:
  Oldingi barcha lug‘atlar shu faylda qoladi.
  Uni o‘chirmaymiz va eski ma’lumotlar yo‘qolmaydi.
*/
const LEGACY_VOCABULARY_BLOB_PATH =
  "huquqiy-sayt/vocabulary.json";

/*
  YANGI TIZIM:
  Har bir Book + Unit alohida faylga saqlanadi.

  Masalan:
  huquqiy-sayt/vocabulary/book-1/unit-1.json
  huquqiy-sayt/vocabulary/book-6/unit-24.json

  Natija:
  - bitta Unitni saqlaganda boshqa Unitlarga tegmaydi;
  - katta vocabulary.json ni har safar qayta yozmaydi;
  - parallel saqlashda ma’lumotlar bir-birini bosib ketmaydi;
  - saqlash tezroq va ishonchliroq bo‘ladi.
*/

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
   COMMON RESPONSE HEADERS
========================================================= */

const NO_CACHE_HEADERS = {
  "Cache-Control":
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
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
   PATH
========================================================= */

function getUnitBlobPath(
  book: number,
  unit: number
) {
  return (
    `huquqiy-sayt/vocabulary/` +
    `book-${book}/unit-${unit}.json`
  );
}

/* =========================================================
   VALIDATION
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
   UNIT NORMALIZE
========================================================= */

function normalizeUnit(
  value: unknown
): VocabularyUnit | null {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return null;
  }

  const raw =
    value as Record<
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
    return null;
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

  return {
    book,
    unit,
    words,

    updatedAt:
      typeof raw.updatedAt ===
      "string"
        ? raw.updatedAt
        : "",
  };
}

/* =========================================================
   LEGACY VOCABULARY NORMALIZE
========================================================= */

function normalizeVocabulary(
  value: unknown
): VocabularyUnit[] {
  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  const result:
    VocabularyUnit[] = [];

  for (
    const item of value
  ) {
    const normalized =
      normalizeUnit(item);

    if (
      normalized
    ) {
      result.push(
        normalized
      );
    }
  }

  return result;
}

/* =========================================================
   STREAM -> TEXT
========================================================= */

async function streamToText(
  stream: ReadableStream<Uint8Array>
) {
  return await new Response(
    stream
  ).text();
}

/* =========================================================
   YANGI UNIT FAYLINI O‘QISH
========================================================= */

async function readUnitFile(
  book: number,
  unit: number
): Promise<
  VocabularyUnit | null
> {
  checkBlobToken();

  const path =
    getUnitBlobPath(
      book,
      unit
    );

  try {
    const result =
      await get(
        path,
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
      return null;
    }

    const text =
      await streamToText(
        result.stream
      );

    if (
      !text.trim()
    ) {
      return null;
    }

    const parsed:
      unknown =
      JSON.parse(
        text
      );

    const normalized =
      normalizeUnit(
        parsed
      );

    if (
      !normalized
    ) {
      return null;
    }

    if (
      normalized.book !==
        book ||
      normalized.unit !==
        unit
    ) {
      return null;
    }

    return normalized;
  } catch (error) {
    /*
      Fayl hali mavjud bo‘lmasa ham
      xato deb hisoblamaymiz.
      Keyin eski vocabulary.json dan qidiramiz.
    */
    console.warn(
      `readUnitFile ${path}:`,
      error instanceof Error
        ? error.message
        : error
    );

    return null;
  }
}

/* =========================================================
   ESKI vocabulary.json NI O‘QISH
========================================================= */

async function readLegacyVocabulary(): Promise<
  VocabularyUnit[]
> {
  checkBlobToken();

  try {
    const result =
      await get(
        LEGACY_VOCABULARY_BLOB_PATH,
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
      await streamToText(
        result.stream
      );

    if (
      !text.trim()
    ) {
      return [];
    }

    const parsed:
      unknown =
      JSON.parse(
        text
      );

    return normalizeVocabulary(
      parsed
    );
  } catch (error) {
    console.error(
      "readLegacyVocabulary ERROR:",
      error
    );

    return [];
  }
}

/* =========================================================
   UNITNI O‘QISH
   1. Avval yangi alohida fayldan
   2. Topilmasa eski vocabulary.json dan
========================================================= */

async function readVocabularyUnit(
  book: number,
  unit: number
): Promise<
  VocabularyUnit | null
> {
  const newUnit =
    await readUnitFile(
      book,
      unit
    );

  if (
    newUnit
  ) {
    return newUnit;
  }

  const legacy =
    await readLegacyVocabulary();

  return (
    legacy.find(
      (
        item
      ) =>
        item.book ===
          book &&
        item.unit ===
          unit
    ) ??
    null
  );
}

/* =========================================================
   UNITNI YOZISH
========================================================= */

async function writeUnitFile(
  data: VocabularyUnit
) {
  checkBlobToken();

  const path =
    getUnitBlobPath(
      data.book,
      data.unit
    );

  await put(
    path,

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

      /*
        Vercel Blob cacheControlMaxAge
        uchun eng xavfsiz minimal qiymat.
        API javobining o‘zi esa no-store.
      */
      cacheControlMaxAge:
        60,
    }
  );
}

/* =========================================================
   VERIFY HELPERS
========================================================= */

function sameWords(
  a: VocabularyWord[],
  b: VocabularyWord[]
) {
  return (
    JSON.stringify(a) ===
    JSON.stringify(b)
  );
}

function wait(
  ms: number
) {
  return new Promise<void>(
    (resolve) => {
      setTimeout(
        resolve,
        ms
      );
    }
  );
}

/*
  Blobga yozgandan keyin
  qayta o‘qib tekshiramiz.

  Ba’zan storage/CDN propagation
  juda qisqa kechikishi mumkin.
*/
async function verifySavedUnit(
  expected:
    VocabularyUnit
) {
  const delays =
    [
      0,
      120,
      250,
      500,
    ];

  for (
    const delay of delays
  ) {
    if (
      delay > 0
    ) {
      await wait(
        delay
      );
    }

    const actual =
      await readUnitFile(
        expected.book,
        expected.unit
      );

    if (
      actual &&
      actual.book ===
        expected.book &&
      actual.unit ===
        expected.unit &&
      sameWords(
        actual.words,
        expected.words
      )
    ) {
      return actual;
    }
  }

  return null;
}

/* =========================================================
   GET
   /api/vocabulary?book=1&unit=1
========================================================= */

export async function GET(
  request:
    NextRequest
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

          headers:
            NO_CACHE_HEADERS,
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

          headers:
            NO_CACHE_HEADERS,
        }
      );
    }

    const found =
      await readVocabularyUnit(
        book,
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

        updatedAt:
          found?.updatedAt ??
          null,
      },
      {
        status:
          200,

        headers:
          NO_CACHE_HEADERS,
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

        headers:
          NO_CACHE_HEADERS,
      }
    );
  }
}

/* =========================================================
   POST
   BOOK + UNIT SO‘ZLARINI SAQLASH
========================================================= */

export async function POST(
  request:
    NextRequest
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

          headers:
            NO_CACHE_HEADERS,
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

          headers:
            NO_CACHE_HEADERS,
        }
      );
    }

    const incomingWords =
      Array.isArray(
        body.words
      )
        ? body.words
        : [];

    const words:
      VocabularyWord[] =
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

          headers:
            NO_CACHE_HEADERS,
        }
      );
    }

    const now =
      new Date()
        .toISOString();

    const unitData:
      VocabularyUnit =
      {
        book,
        unit,
        words,
        updatedAt:
          now,
      };

    /*
      MUHIM:
      Endi butun vocabulary.json
      o‘qilmaydi va qayta yozilmaydi.

      Faqat tanlangan Book + Unit
      alohida faylga yoziladi.
    */
    await writeUnitFile(
      unitData
    );

    /*
      Haqiqatan yozilganini
      server tomonda tekshiramiz.
    */
    const verified =
      await verifySavedUnit(
        unitData
      );

    if (
      !verified
    ) {
      throw new Error(
        "So‘zlar Blobga yuborildi, lekin saqlanganini tasdiqlab bo‘lmadi. Iltimos, yana urinib ko‘ring."
      );
    }

    return NextResponse.json(
      {
        success:
          true,

        message:
          `Book ${book}, Unit ${unit} uchun ${verified.words.length} ta so‘z saqlandi.`,

        book,
        unit,

        count:
          verified.words.length,

        words:
          verified.words,

        updatedAt:
          verified.updatedAt,
      },
      {
        status:
          200,

        headers:
          NO_CACHE_HEADERS,
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

        headers:
          NO_CACHE_HEADERS,
      }
    );
  }
}
