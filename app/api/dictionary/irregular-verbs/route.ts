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
   EMPTY DATA
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

    if (!parsed || !Array.isArray(parsed.verbs)) {
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
      "Irregular verbs read error:",
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
   GET
   BARCHA FE’LLARNI OLISH
========================================================= */

export async function GET() {
  try {
    const data = await readData();

    return NextResponse.json(
      {
        ok: true,
        verbs: sortVerbs(data.verbs),
        total: data.verbs.length,
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
      "GET irregular verbs error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        message:
          "Irregular Verbs ma’lumotlarini olishda xatolik yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   POST
   YANGI FE’L QO‘SHISH
========================================================= */

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();

    const v1 = cleanText(body?.v1);
    const v2 = cleanText(body?.v2);
    const v3 = cleanText(body?.v3);
    const uzbek = cleanText(body?.uzbek);

    if (!v1 || !v2 || !v3 || !uzbek) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "V1, V2, V3 va tarjima to‘liq kiritilishi kerak.",
        },
        {
          status: 400,
        }
      );
    }

    const data = await readData();

    const duplicate = data.verbs.some(
      (verb) =>
        verb.v1.toLowerCase() ===
        v1.toLowerCase()
    );

    if (duplicate) {
      return NextResponse.json(
        {
          ok: false,
          message: `"${v1}" fe’li ro‘yxatda mavjud.`,
        },
        {
          status: 409,
        }
      );
    }

    const now = new Date().toISOString();

    const newVerb: IrregularVerb = {
      id: crypto.randomUUID(),
      v1,
      v2,
      v3,
      uzbek,
      createdAt: now,
      updatedAt: now,
    };

    const verbs = sortVerbs([
      ...data.verbs,
      newVerb,
    ]);

    const newData: DictionaryData = {
      verbs,
      updatedAt: now,
    };

    await saveData(newData);

    return NextResponse.json(
      {
        ok: true,
        message:
          "Yangi fe’l muvaffaqiyatli qo‘shildi.",
        verb: newVerb,
        verbs,
        total: verbs.length,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST irregular verbs error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        message:
          "Fe’lni saqlashda xatolik yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   PUT
   FE’LNI TAHRIRLASH
========================================================= */

export async function PUT(
  request: NextRequest
) {
  try {
    const body = await request.json();

    const id = cleanText(body?.id);
    const v1 = cleanText(body?.v1);
    const v2 = cleanText(body?.v2);
    const v3 = cleanText(body?.v3);
    const uzbek = cleanText(body?.uzbek);

    if (!id) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Tahrirlash uchun ID topilmadi.",
        },
        {
          status: 400,
        }
      );
    }

    if (!v1 || !v2 || !v3 || !uzbek) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "V1, V2, V3 va tarjima to‘liq kiritilishi kerak.",
        },
        {
          status: 400,
        }
      );
    }

    const data = await readData();

    const existingVerb =
      data.verbs.find(
        (verb) => verb.id === id
      );

    if (!existingVerb) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Tahrirlanadigan fe’l topilmadi.",
        },
        {
          status: 404,
        }
      );
    }

    const duplicate = data.verbs.some(
      (verb) =>
        verb.id !== id &&
        verb.v1.toLowerCase() ===
          v1.toLowerCase()
    );

    if (duplicate) {
      return NextResponse.json(
        {
          ok: false,
          message: `"${v1}" fe’li boshqa yozuv sifatida mavjud.`,
        },
        {
          status: 409,
        }
      );
    }

    const now = new Date().toISOString();

    const verbs = sortVerbs(
      data.verbs.map((verb) =>
        verb.id === id
          ? {
              ...verb,
              v1,
              v2,
              v3,
              uzbek,
              updatedAt: now,
            }
          : verb
      )
    );

    const newData: DictionaryData = {
      verbs,
      updatedAt: now,
    };

    await saveData(newData);

    return NextResponse.json(
      {
        ok: true,
        message:
          "Fe’l muvaffaqiyatli tahrirlandi.",
        verbs,
        total: verbs.length,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "PUT irregular verbs error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        message:
          "Fe’lni tahrirlashda xatolik yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   DELETE
   FE’LNI O‘CHIRISH
========================================================= */

export async function DELETE(
  request: NextRequest
) {
  try {
    const body = await request.json();

    const id = cleanText(body?.id);

    if (!id) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "O‘chirish uchun ID topilmadi.",
        },
        {
          status: 400,
        }
      );
    }

    const data = await readData();

    const exists = data.verbs.some(
      (verb) => verb.id === id
    );

    if (!exists) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "O‘chiriladigan fe’l topilmadi.",
        },
        {
          status: 404,
        }
      );
    }

    const verbs = data.verbs.filter(
      (verb) => verb.id !== id
    );

    const now = new Date().toISOString();

    const newData: DictionaryData = {
      verbs,
      updatedAt: now,
    };

    await saveData(newData);

    return NextResponse.json(
      {
        ok: true,
        message:
          "Fe’l muvaffaqiyatli o‘chirildi.",
        verbs,
        total: verbs.length,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "DELETE irregular verbs error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        message:
          "Fe’lni o‘chirishda xatolik yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}
