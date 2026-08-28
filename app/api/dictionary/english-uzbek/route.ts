import { NextRequest, NextResponse } from "next/server";
import { put, list, get } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BLOB_PATH = "data-storage/english-uzbek-dictionary.json";

export type DictionaryWord = {
  id: string;
  english: string;
  uzbek: string;
  createdAt: string;
  updatedAt: string;
};

type DictionaryData = {
  words: DictionaryWord[];
  updatedAt: string;
};

/* =========================================================
   BO'SH BAZA
========================================================= */

function emptyData(): DictionaryData {
  return {
    words: [],
    updatedAt: new Date().toISOString(),
  };
}

/* =========================================================
   MATNNI TOZALASH
========================================================= */

function cleanText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ");
}

/* =========================================================
   ID YARATISH
========================================================= */

function createId(): string {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

/* =========================================================
   PRIVATE BLOB'DAN MA'LUMOTNI O'QISH
========================================================= */

async function readDictionary(): Promise<DictionaryData> {
  try {
    const result = await list({
      prefix: BLOB_PATH,
    });

    if (!result.blobs.length) {
      return emptyData();
    }

    const latest = [...result.blobs].sort(
      (a, b) =>
        new Date(b.uploadedAt).getTime() -
        new Date(a.uploadedAt).getTime()
    )[0];

    /*
      Store PRIVATE bo'lgani uchun oddiy:
      fetch(latest.url)
      ishlatmaymiz.

      @vercel/blob get() orqali o'qiymiz.
    */
    const blob = await get(latest.pathname, {
      access: "private",
    });

    if (!blob || blob.statusCode !== 200 || !blob.stream) {
      console.error(
        "Dictionary blob topilmadi yoki o'qib bo'lmadi."
      );

      return emptyData();
    }

    const text = await new Response(blob.stream).text();

    if (!text.trim()) {
      return emptyData();
    }

    const data = JSON.parse(text);

    if (!data || !Array.isArray(data.words)) {
      return emptyData();
    }

    return {
      words: data.words,
      updatedAt:
        typeof data.updatedAt === "string"
          ? data.updatedAt
          : new Date().toISOString(),
    };
  } catch (error) {
    console.error("Dictionary read error:", error);

    return emptyData();
  }
}

/* =========================================================
   PRIVATE BLOB'GA SAQLASH
========================================================= */

async function saveDictionary(
  data: DictionaryData
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

/* =========================================================
   GET
   BARCHA SO'ZLARNI OLISH

   /api/dictionary/english-uzbek

   QIDIRISH:
   /api/dictionary/english-uzbek?q=book
========================================================= */

export async function GET(
  request: NextRequest
) {
  try {
    const data = await readDictionary();

    const q = cleanText(
      request.nextUrl.searchParams.get("q")
    ).toLowerCase();

    let words = data.words;

    if (q) {
      words = words.filter((word) => {
        return (
          word.english.toLowerCase().includes(q) ||
          word.uzbek.toLowerCase().includes(q)
        );
      });
    }

    return NextResponse.json(
      {
        ok: true,
        total: data.words.length,
        resultCount: words.length,
        words,
        updatedAt: data.updatedAt,
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
      "GET dictionary error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        message:
          "Lug‘atni yuklashda xatolik yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   POST
   BITTA YANGI SO'Z QO'SHISH

   {
     "english": "book",
     "uzbek": "kitob"
   }
========================================================= */

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();

    const english = cleanText(body?.english);
    const uzbek = cleanText(body?.uzbek);

    if (!english) {
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

    const data = await readDictionary();

    const duplicate = data.words.find(
      (word) =>
        word.english.toLowerCase() ===
          english.toLowerCase() &&
        word.uzbek.toLowerCase() ===
          uzbek.toLowerCase()
    );

    if (duplicate) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Bu so‘z lug‘atda allaqachon mavjud.",
          word: duplicate,
        },
        {
          status: 409,
        }
      );
    }

    const now = new Date().toISOString();

    const newWord: DictionaryWord = {
      id: createId(),
      english,
      uzbek,
      createdAt: now,
      updatedAt: now,
    };

    data.words.push(newWord);

    data.words.sort((a, b) =>
      a.english.localeCompare(
        b.english,
        "en",
        {
          sensitivity: "base",
        }
      )
    );

    data.updatedAt = now;

    await saveDictionary(data);

    return NextResponse.json(
      {
        ok: true,
        message:
          "Yangi so‘z lug‘atga qo‘shildi.",
        word: newWord,
        total: data.words.length,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST dictionary error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        message:
          "So‘zni saqlashda xatolik yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   PUT
   SO'ZNI TAHRIRLASH

   {
     "id": "...",
     "english": "book",
     "uzbek": "kitob"
   }
========================================================= */

export async function PUT(
  request: NextRequest
) {
  try {
    const body = await request.json();

    const id = cleanText(body?.id);
    const english = cleanText(body?.english);
    const uzbek = cleanText(body?.uzbek);

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

    if (!english || !uzbek) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Inglizcha so‘z va o‘zbekcha tarjima majburiy.",
        },
        {
          status: 400,
        }
      );
    }

    const data = await readDictionary();

    const index = data.words.findIndex(
      (word) => word.id === id
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

    const duplicate = data.words.find(
      (word) =>
        word.id !== id &&
        word.english.toLowerCase() ===
          english.toLowerCase() &&
        word.uzbek.toLowerCase() ===
          uzbek.toLowerCase()
    );

    if (duplicate) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Bunday so‘z allaqachon mavjud.",
        },
        {
          status: 409,
        }
      );
    }

    const now = new Date().toISOString();

    data.words[index] = {
      ...data.words[index],
      english,
      uzbek,
      updatedAt: now,
    };

    data.words.sort((a, b) =>
      a.english.localeCompare(
        b.english,
        "en",
        {
          sensitivity: "base",
        }
      )
    );

    data.updatedAt = now;

    await saveDictionary(data);

    return NextResponse.json({
      ok: true,
      message:
        "So‘z muvaffaqiyatli tahrirlandi.",
      word: data.words.find(
        (word) => word.id === id
      ),
      total: data.words.length,
    });
  } catch (error) {
    console.error(
      "PUT dictionary error:",
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

/* =========================================================
   DELETE
   SO'ZNI O'CHIRISH

   /api/dictionary/english-uzbek?id=SOZ_ID
========================================================= */

export async function DELETE(
  request: NextRequest
) {
  try {
    const id = cleanText(
      request.nextUrl.searchParams.get("id")
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

    const data = await readDictionary();

    const word = data.words.find(
      (item) => item.id === id
    );

    if (!word) {
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

    data.words = data.words.filter(
      (item) => item.id !== id
    );

    data.updatedAt =
      new Date().toISOString();

    await saveDictionary(data);

    return NextResponse.json({
      ok: true,
      message:
        "So‘z lug‘atdan o‘chirildi.",
      deletedWord: word,
      total: data.words.length,
    });
  } catch (error) {
    console.error(
      "DELETE dictionary error:",
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
