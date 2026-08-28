import {
  get,
  list,
  put,
} from "@vercel/blob";

import {
  NextRequest,
  NextResponse,
} from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =====================================================
   TYPES
===================================================== */

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

type ImportWord = {
  word?: unknown;
  uzbek?: unknown;
  synonyms?: unknown;
};

/* =====================================================
   BLOB
===================================================== */

const BLOB_PATH =
  "huquqiy-sayt/dictionary-synonyms.json";

/* =====================================================
   BO‘SH MA’LUMOT
===================================================== */

function emptyData(): SynonymData {
  return {
    words: [],
    updatedAt:
      new Date().toISOString(),
  };
}

/* =====================================================
   MA’LUMOTNI O‘QISH
===================================================== */

async function readData(): Promise<SynonymData> {
  try {
    const result =
      await list({
        prefix: BLOB_PATH,
        limit: 100,
      });

    const blobs =
      result.blobs
        .filter(
          (blob) =>
            blob.pathname ===
            BLOB_PATH
        )
        .sort(
          (a, b) =>
            new Date(
              b.uploadedAt
            ).getTime() -
            new Date(
              a.uploadedAt
            ).getTime()
        );

    const latest =
      blobs[0];

    if (!latest) {
      return emptyData();
    }

    const blob =
      await get(
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
      words:
        Array.isArray(
          parsed.words
        )
          ? parsed.words
          : [],

      updatedAt:
        parsed.updatedAt ||
        new Date().toISOString(),
    };
  } catch (error) {
    console.error(
      "Synonyms bulk read error:",
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
    JSON.stringify(
      data,
      null,
      2
    ),
    {
      access: "private",
      allowOverwrite: true,
      contentType:
        "application/json",
    }
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
    items =
      value.map(String);
  } else if (
    typeof value === "string"
  ) {
    items =
      value.split(",");
  }

  const seen =
    new Set<string>();

  return items
    .map((item) =>
      item.trim()
    )
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
   TARTIBLASH
===================================================== */

function sortWords(
  words: SynonymWord[]
) {
  return [...words].sort(
    (a, b) =>
      a.word.localeCompare(
        b.word,
        "en",
        {
          sensitivity:
            "base",
        }
      )
  );
}

/* =====================================================
   POST — OMMAVIY IMPORT
===================================================== */

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const incoming:
      ImportWord[] =
      Array.isArray(
        body.words
      )
        ? body.words
        : [];

    if (
      incoming.length === 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Import uchun so‘zlar topilmadi.",
        },
        {
          status: 400,
        }
      );
    }

    const data =
      await readData();

    /* -----------------------------------------
       Bazadagi mavjud so‘zlar
    ----------------------------------------- */

    const existing =
      new Set(
        data.words.map(
          (item) =>
            item.word
              .trim()
              .toLowerCase()
        )
      );

    /*
      Bir importning o‘zida ham
      takroriy so‘z kelishi mumkin.
    */

    const batchSeen =
      new Set<string>();

    let added = 0;
    let skipped = 0;
    let invalid = 0;

    const now =
      new Date().toISOString();

    /* -----------------------------------------
       IMPORT
    ----------------------------------------- */

    for (
      const item
      of incoming
    ) {
      const word =
        String(
          item.word || ""
        ).trim();

      const uzbek =
        String(
          item.uzbek || ""
        ).trim();

      const synonyms =
        cleanSynonyms(
          item.synonyms
        );

      /* Noto‘g‘ri satr */

      if (
        !word ||
        !uzbek ||
        synonyms.length === 0
      ) {
        invalid++;
        continue;
      }

      const key =
        word.toLowerCase();

      /* Bazada mavjud */

      if (
        existing.has(key)
      ) {
        skipped++;
        continue;
      }

      /* Shu importning o‘zida takror */

      if (
        batchSeen.has(key)
      ) {
        skipped++;
        continue;
      }

      batchSeen.add(key);
      existing.add(key);

      const newWord:
        SynonymWord = {
        id:
          crypto.randomUUID(),

        word,
        uzbek,
        synonyms,

        createdAt: now,
        updatedAt: now,
      };

      data.words.push(
        newWord
      );

      added++;
    }

    /* -----------------------------------------
       TARTIBLASH
    ----------------------------------------- */

    data.words =
      sortWords(
        data.words
      );

    data.updatedAt = now;

    /* -----------------------------------------
       FAQAT O‘ZGARISH BO‘LSA SAQLASH
    ----------------------------------------- */

    if (added > 0) {
      await saveData(
        data
      );
    }

    /* -----------------------------------------
       JAVOB
    ----------------------------------------- */

    return NextResponse.json({
      ok: true,

      message:
        "Sinonimlar importi tugadi.",

      added,
      skipped,
      invalid,

      total:
        data.words.length,

      words:
        data.words,
    });
  } catch (error) {
    console.error(
      "Synonyms bulk import error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        message:
          "Sinonimlarni import qilishda xatolik yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}
