import { NextRequest, NextResponse } from "next/server";
import { get, list, put } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BLOB_PATH =
  "huquqiy-sayt/dictionary-irregular-verbs.json";

/* =========================================================
   TYPES
========================================================= */

type IrregularVerb = {
  id: string;
  v1: string;
  v2: string;
  v3: string;
  uzbek: string;
  createdAt: string;
  updatedAt: string;
};

type DictionaryData = {
  verbs: IrregularVerb[];
  updatedAt: string;
};

/* =========================================================
   BO‘SH DATA
========================================================= */

function emptyData(): DictionaryData {
  return {
    verbs: [],
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

  return value.trim();
}

/* =========================================================
   BLOB'DAN O‘QISH
========================================================= */

async function readData(): Promise<DictionaryData> {
  try {
    const result = await list({
      prefix: BLOB_PATH,
      limit: 100,
    });

    if (!result.blobs.length) {
      return emptyData();
    }

    const latest = [...result.blobs].sort(
      (a, b) =>
        new Date(b.uploadedAt).getTime() -
        new Date(a.uploadedAt).getTime()
    )[0];

    const blob = await get(latest.pathname, {
      access: "private",
    });

    if (
      !blob ||
      blob.statusCode !== 200 ||
      !blob.stream
    ) {
      return emptyData();
    }

    const text = await new Response(
      blob.stream
    ).text();

    if (!text.trim()) {
      return emptyData();
    }

    const parsed = JSON.parse(text);

    if (
      !parsed ||
      !Array.isArray(parsed.verbs)
    ) {
      return emptyData();
    }

    return {
      verbs: parsed.verbs,
      updatedAt:
        typeof parsed.updatedAt === "string"
          ? parsed.updatedAt
          : new Date().toISOString(),
    };
  } catch (error) {
    console.error(
      "Irregular verbs bulk read error:",
      error
    );

    return emptyData();
  }
}

/* =========================================================
   BLOB'GA SAQLASH
========================================================= */

async function saveData(
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
   SARALASH
========================================================= */

function sortVerbs(
  verbs: IrregularVerb[]
): IrregularVerb[] {
  return [...verbs].sort((a, b) =>
    a.v1.localeCompare(b.v1, "en", {
      sensitivity: "base",
    })
  );
}

/* =========================================================
   POST
   OMMAVIY IMPORT
========================================================= */

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();

    const rawText = cleanText(
      body?.text
    );

    if (!rawText) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Import qilish uchun fe’llar ro‘yxatini kiriting.",
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       QATORLARGA AJRATISH
    ===================================================== */

    const lines = rawText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Import uchun yaroqli qator topilmadi.",
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       MAVJUD BAZANI OLISH
    ===================================================== */

    const data = await readData();

    const existingV1 = new Set(
      data.verbs.map((verb) =>
        verb.v1
          .trim()
          .toLowerCase()
      )
    );

    const importedV1 =
      new Set<string>();

    const newVerbs: IrregularVerb[] = [];

    let duplicateCount = 0;
    let invalidCount = 0;

    const invalidLines: string[] = [];

    const now =
      new Date().toISOString();

    /* =====================================================
       HAR BIR QATORNI TEKSHIRISH

       FORMAT:
       go | went | gone | bormoq
    ===================================================== */

    for (const line of lines) {
      const parts = line
        .split("|")
        .map((part) =>
          part.trim()
        );

      if (parts.length < 4) {
        invalidCount += 1;

        invalidLines.push(line);

        continue;
      }

      const v1 = cleanText(
        parts[0]
      );

      const v2 = cleanText(
        parts[1]
      );

      const v3 = cleanText(
        parts[2]
      );

      /*
        Agar tarjimada | belgisi
        tasodifan bo‘lsa, qolgan qismlarni
        yana birlashtiramiz.
      */

      const uzbek = cleanText(
        parts
          .slice(3)
          .join(" | ")
      );

      if (
        !v1 ||
        !v2 ||
        !v3 ||
        !uzbek
      ) {
        invalidCount += 1;

        invalidLines.push(line);

        continue;
      }

      const key =
        v1.toLowerCase();

      /*
        Bazada mavjud bo‘lsa
      */

      if (existingV1.has(key)) {
        duplicateCount += 1;
        continue;
      }

      /*
        Import qilinayotgan ro‘yxatning
        o‘zida takrorlangan bo‘lsa
      */

      if (importedV1.has(key)) {
        duplicateCount += 1;
        continue;
      }

      importedV1.add(key);

      newVerbs.push({
        id: crypto.randomUUID(),
        v1,
        v2,
        v3,
        uzbek,
        createdAt: now,
        updatedAt: now,
      });
    }

    /* =====================================================
       HECH NARSA QO‘SHILMAGAN BO‘LSA
    ===================================================== */

    if (!newVerbs.length) {
      return NextResponse.json(
        {
          ok: true,

          message:
            "Yangi fe’l qo‘shilmadi.",

          added: 0,

          duplicates:
            duplicateCount,

          invalid:
            invalidCount,

          invalidLines,

          total:
            data.verbs.length,

          verbs:
            sortVerbs(
              data.verbs
            ),
        },
        {
          status: 200,
        }
      );
    }

    /* =====================================================
       YANGI FE’LLARNI QO‘SHISH
    ===================================================== */

    const verbs = sortVerbs([
      ...data.verbs,
      ...newVerbs,
    ]);

    const newData: DictionaryData = {
      verbs,
      updatedAt: now,
    };

    await saveData(newData);

    /* =====================================================
       NATIJA
    ===================================================== */

    return NextResponse.json(
      {
        ok: true,

        message:
          "Ommaviy import muvaffaqiyatli tugadi.",

        added:
          newVerbs.length,

        duplicates:
          duplicateCount,

        invalid:
          invalidCount,

        invalidLines,

        total:
          verbs.length,

        verbs,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "POST irregular verbs bulk error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        message:
          "Irregular Verbs import qilishda xatolik yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}
