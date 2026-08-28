import {
  get,
  list,
  put,
} from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SynonymWord = {
  id: string;
  word: string;
  uzbek: string;
  synonyms: string[];
  createdAt: string;
  updatedAt: string;
};

type SynonymData = {
  words: SynonymWord[];
  updatedAt: string;
};

const BLOB_PATH =
  "huquqiy-sayt/dictionary-synonyms.json";

/* =====================================================
   BO‘SH MA’LUMOT
===================================================== */

function emptyData(): SynonymData {
  return {
    words: [],
    updatedAt: new Date().toISOString(),
  };
}

/* =====================================================
   LUG‘ATNI O‘QISH
===================================================== */

async function readData(): Promise<SynonymData> {
  try {
    const result = await list({
      prefix: BLOB_PATH,
      limit: 100,
    });

    const blobs = result.blobs
      .filter(
        (blob) =>
          blob.pathname === BLOB_PATH
      )
      .sort(
        (a, b) =>
          new Date(b.uploadedAt).getTime() -
          new Date(a.uploadedAt).getTime()
      );

    const latest = blobs[0];

    if (!latest) {
      return emptyData();
    }

    const blob = await get(
      latest.pathname,
      {
        access: "private",
      }
    );

    if (
      !blob ||
      blob.statusCode !== 200 ||
      !blob.stream
    ) {
      return emptyData();
    }

    const text =
      await new Response(
        blob.stream
      ).text();

    const parsed =
      JSON.parse(text);

    return {
      words: Array.isArray(parsed.words)
        ? parsed.words
        : [],
      updatedAt:
        parsed.updatedAt ||
        new Date().toISOString(),
    };
  } catch (error) {
    console.error(
      "Synonyms read error:",
      error
    );

    return emptyData();
  }
}

/* =====================================================
   SAQLASH
===================================================== */

async function saveData(
  data: SynonymData
) {
  return put(
    BLOB_PATH,
    JSON.stringify(data, null, 2),
    {
      access: "private",
      allowOverwrite: true,
      contentType: "application/json",
    }
  );
}

/* =====================================================
   TARTIBLASH
===================================================== */

function sortWords(
  words: SynonymWord[]
) {
  return [...words].sort((a, b) =>
    a.word.localeCompare(
      b.word,
      "en",
      {
        sensitivity: "base",
      }
    )
  );
}

/* =====================================================
   SYNONYMLARNI TOZALASH
===================================================== */

function cleanSynonyms(
  value: unknown
): string[] {
  let items: string[] = [];

  if (Array.isArray(value)) {
    items = value.map(String);
  } else if (
    typeof value === "string"
  ) {
    items = value.split(",");
  }

  const seen = new Set<string>();

  return items
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      const key =
        item.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;
    });
}

/* =====================================================
   GET
===================================================== */

export async function GET() {
  try {
    const data =
      await readData();

    const words =
      sortWords(data.words);

    return NextResponse.json({
      ok: true,
      total: words.length,
      words,
    });
  } catch (error) {
    console.error(
      "GET synonyms error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        message:
          "Sinonimlarni yuklab bo‘lmadi.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =====================================================
   POST — BITTA SO‘Z QO‘SHISH
===================================================== */

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const word =
      String(
        body.word || ""
      ).trim();

    const uzbek =
      String(
        body.uzbek || ""
      ).trim();

    const synonyms =
      cleanSynonyms(
        body.synonyms
      );

    if (!word) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Inglizcha so‘zni kiriting.",
        },
        {
          status: 400,
        }
      );
    }

    if (!uzbek) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "O‘zbekcha tarjimani kiriting.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      synonyms.length === 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Kamida bitta sinonim kiriting.",
        },
        {
          status: 400,
        }
      );
    }

    const data =
      await readData();

    const exists =
      data.words.some(
        (item) =>
          item.word
            .trim()
            .toLowerCase() ===
          word.toLowerCase()
      );

    if (exists) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Bu so‘z lug‘atda mavjud.",
        },
        {
          status: 409,
        }
      );
    }

    const now =
      new Date().toISOString();

    const newWord: SynonymWord = {
      id: crypto.randomUUID(),
      word,
      uzbek,
      synonyms,
      createdAt: now,
      updatedAt: now,
    };

    data.words.push(newWord);

    data.words =
      sortWords(data.words);

    data.updatedAt = now;

    await saveData(data);

    return NextResponse.json({
      ok: true,
      message:
        "So‘z muvaffaqiyatli qo‘shildi.",
      total: data.words.length,
      word: newWord,
      words: data.words,
    });
  } catch (error) {
    console.error(
      "POST synonyms error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        message:
          "So‘zni qo‘shishda xatolik yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =====================================================
   PUT — TAHRIRLASH
===================================================== */

export async function PUT(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const id =
      String(
        body.id || ""
      ).trim();

    const word =
      String(
        body.word || ""
      ).trim();

    const uzbek =
      String(
        body.uzbek || ""
      ).trim();

    const synonyms =
      cleanSynonyms(
        body.synonyms
      );

    if (!id) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "So‘z ID topilmadi.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !word ||
      !uzbek ||
      synonyms.length === 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Word, tarjima va sinonimlar to‘ldirilishi kerak.",
        },
        {
          status: 400,
        }
      );
    }

    const data =
      await readData();

    const index =
      data.words.findIndex(
        (item) =>
          item.id === id
      );

    if (index === -1) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "So‘z topilmadi.",
        },
        {
          status: 404,
        }
      );
    }

    const duplicate =
      data.words.some(
        (item) =>
          item.id !== id &&
          item.word
            .trim()
            .toLowerCase() ===
            word.toLowerCase()
      );

    if (duplicate) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Bunday so‘z lug‘atda mavjud.",
        },
        {
          status: 409,
        }
      );
    }

    const now =
      new Date().toISOString();

    data.words[index] = {
      ...data.words[index],
      word,
      uzbek,
      synonyms,
      updatedAt: now,
    };

    data.words =
      sortWords(data.words);

    data.updatedAt = now;

    await saveData(data);

    return NextResponse.json({
      ok: true,
      message:
        "So‘z muvaffaqiyatli tahrirlandi.",
      total: data.words.length,
      words: data.words,
    });
  } catch (error) {
    console.error(
      "PUT synonyms error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        message:
          "So‘zni tahrirlashda xatolik yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =====================================================
   DELETE
===================================================== */

export async function DELETE(
  request: NextRequest
) {
  try {
    const id =
      request.nextUrl.searchParams.get(
        "id"
      );

    if (!id) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "O‘chiriladigan so‘z ID topilmadi.",
        },
        {
          status: 400,
        }
      );
    }

    const data =
      await readData();

    const exists =
      data.words.some(
        (item) =>
          item.id === id
      );

    if (!exists) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "So‘z topilmadi.",
        },
        {
          status: 404,
        }
      );
    }

    data.words =
      data.words.filter(
        (item) =>
          item.id !== id
      );

    data.updatedAt =
      new Date().toISOString();

    await saveData(data);

    return NextResponse.json({
      ok: true,
      message:
        "So‘z o‘chirildi.",
      total: data.words.length,
      words: data.words,
    });
  } catch (error) {
    console.error(
      "DELETE synonyms error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        message:
          "So‘zni o‘chirishda xatolik yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}
