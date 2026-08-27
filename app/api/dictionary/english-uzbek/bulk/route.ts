import { NextRequest, NextResponse } from "next/server";
import { put, list } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BLOB_PATH = "data-storage/english-uzbek-dictionary.json";

type DictionaryWord = {
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

type IncomingWord = {
  english?: unknown;
  uzbek?: unknown;
};

function emptyData(): DictionaryData {
  return {
    words: [],
    updatedAt: new Date().toISOString(),
  };
}

function cleanText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .replace(/\s+/g, " ");
}

function createId(index: number) {
  return `${Date.now()}-${index}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

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

    const response = await fetch(latest.url, {
      cache: "no-store",
    });

    if (!response.ok) {
      return emptyData();
    }

    const data = await response.json();

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
    console.error(
      "BULK DICTIONARY READ ERROR:",
      error
    );

    return emptyData();
  }
}

async function saveDictionary(
  data: DictionaryData
) {
  return put(
    BLOB_PATH,
    JSON.stringify(data, null, 2),
    {
      access: "public",
      allowOverwrite: true,
      contentType: "application/json",
    }
  );
}

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();

    const incomingWords: IncomingWord[] =
      Array.isArray(body)
        ? body
        : Array.isArray(body?.words)
        ? body.words
        : [];

    if (incomingWords.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Import qilinadigan so‘zlar topilmadi.",
        },
        {
          status: 400,
        }
      );
    }

    /*
      Juda katta yoki noto‘g‘ri requestlardan
      himoya qilish uchun limit.
    */
    if (incomingWords.length > 10000) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Bir martada 10 000 tadan ortiq so‘z import qilib bo‘lmaydi.",
        },
        {
          status: 400,
        }
      );
    }

    const data = await readDictionary();

    /*
      Mavjud lug‘atdagi juftliklarni Set'ga joylaymiz.
      Bu 2700+ so‘zda dublikat tekshiruvini tezlashtiradi.
    */
    const existingPairs = new Set(
      data.words.map((word) => {
        return `${word.english
          .trim()
          .toLowerCase()}|||${word.uzbek
          .trim()
          .toLowerCase()}`;
      })
    );

    const now =
      new Date().toISOString();

    const newWords: DictionaryWord[] = [];

    let skipped = 0;
    let invalid = 0;

    incomingWords.forEach(
      (item, index) => {
        const english =
          cleanText(item.english);

        const uzbek =
          cleanText(item.uzbek);

        if (!english || !uzbek) {
          invalid++;
          return;
        }

        const pairKey =
          `${english.toLowerCase()}|||${uzbek.toLowerCase()}`;

        /*
          Bazada yoki shu bulk request ichida
          takror bo‘lsa o‘tkazib yuboramiz.
        */
        if (existingPairs.has(pairKey)) {
          skipped++;
          return;
        }

        existingPairs.add(pairKey);

        newWords.push({
          id: createId(index),
          english,
          uzbek,
          createdAt: now,
          updatedAt: now,
        });
      }
    );

    if (newWords.length === 0) {
      return NextResponse.json(
        {
          ok: true,

          message:
            "Yangi so‘z qo‘shilmadi.",

          added: 0,
          skipped,
          invalid,

          total:
            data.words.length,
        },
        {
          status: 200,
        }
      );
    }

    data.words.push(...newWords);

    /*
      Inglizcha bo‘yicha alifbo tartibi.
    */
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
          "Ommaviy import muvaffaqiyatli yakunlandi.",

        added:
          newWords.length,

        skipped,

        invalid,

        total:
          data.words.length,

        importedWords:
          newWords.length,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "BULK IMPORT ERROR:",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        message:
          "Ommaviy import vaqtida xatolik yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}
