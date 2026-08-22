import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { get, put } from "@vercel/blob";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================================================
   TYPES
========================================================= */

type AccessCode = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  approved: boolean;
  requestedAt: string | null;
  createdAt: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
};

type HistoryItem = {
  id: string;
  type:
    | "created"
    | "requested"
    | "approved"
    | "rejected"
    | "revoked"
    | "deleted";
  name: string;
  code: string;
  message: string;
  createdAt: string;
};

/* =========================================================
   BLOB PATH
========================================================= */

const CODES_BLOB_PATH =
  "huquqiy-sayt/access-codes.json";

const HISTORY_BLOB_PATH =
  "huquqiy-sayt/history.json";

/* =========================================================
   BLOB TOKEN
========================================================= */

function checkBlobToken() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN topilmadi."
    );
  }
}

/* =========================================================
   ADMIN
========================================================= */

async function isAdmin() {
  const cookieStore = await cookies();

  return (
    cookieStore.get("qurbonov_role")?.value ===
    "admin"
  );
}

/* =========================================================
   KODLARNI NORMALIZE QILISH
========================================================= */

function normalizeCodes(
  value: unknown
): AccessCode[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is AccessCode => {
      if (
        !item ||
        typeof item !== "object"
      ) {
        return false;
      }

      const raw = item as Record<
        string,
        unknown
      >;

      return (
        typeof raw.id === "string" &&
        typeof raw.code === "string" &&
        typeof raw.name === "string"
      );
    }
  );
}

/* =========================================================
   TARIXNI NORMALIZE QILISH
========================================================= */

function normalizeHistory(
  value: unknown
): HistoryItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is HistoryItem => {
      if (
        !item ||
        typeof item !== "object"
      ) {
        return false;
      }

      const raw = item as Record<
        string,
        unknown
      >;

      return (
        typeof raw.id === "string" &&
        typeof raw.name === "string" &&
        typeof raw.code === "string"
      );
    }
  );
}

/* =========================================================
   KODLARNI O‘QISH
========================================================= */

async function readCodes(): Promise<
  AccessCode[]
> {
  checkBlobToken();

  try {
    const result = await get(
      CODES_BLOB_PATH,
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

    const text = await new Response(
      result.stream
    ).text();

    if (!text.trim()) {
      return [];
    }

    const parsed: unknown =
      JSON.parse(text);

    return normalizeCodes(parsed);
  } catch (error) {
    console.error(
      "READ CODES ERROR:",
      error
    );

    /*
      Blob hali mavjud bo‘lmasa
      bo‘sh ro‘yxat qaytadi.
    */
    return [];
  }
}

/* =========================================================
   KODLARNI SAQLASH
========================================================= */

async function writeCodes(
  codes: AccessCode[]
) {
  checkBlobToken();

  await put(
    CODES_BLOB_PATH,

    JSON.stringify(
      codes,
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
   TARIXNI O‘QISH
========================================================= */

async function readHistory(): Promise<
  HistoryItem[]
> {
  checkBlobToken();

  try {
    const result = await get(
      HISTORY_BLOB_PATH,
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

    const text = await new Response(
      result.stream
    ).text();

    if (!text.trim()) {
      return [];
    }

    const parsed: unknown =
      JSON.parse(text);

    return normalizeHistory(parsed);
  } catch (error) {
    console.error(
      "READ HISTORY ERROR:",
      error
    );

    return [];
  }
}

/* =========================================================
   TARIXNI SAQLASH
========================================================= */

async function writeHistory(
  history: HistoryItem[]
) {
  checkBlobToken();

  await put(
    HISTORY_BLOB_PATH,

    JSON.stringify(
      history,
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
   TARIXGA YOZISH
========================================================= */

async function addHistory(data: {
  type: HistoryItem["type"];
  name: string;
  code: string;
  message: string;
}) {
  try {
    const history =
      await readHistory();

    history.unshift({
      id: crypto.randomUUID(),

      type: data.type,

      name: data.name,

      code: data.code,

      message: data.message,

      createdAt:
        new Date().toISOString(),
    });

    /*
      Tarix haddan tashqari
      kattalashib ketmasligi uchun
      oxirgi 500 ta yozuvni saqlaymiz.
    */

    const limitedHistory =
      history.slice(0, 500);

    await writeHistory(
      limitedHistory
    );
  } catch (error) {
    console.error(
      "HISTORY ERROR:",
      error
    );
  }
}

/* =========================================================
   MAXSUS KOD YARATISH
========================================================= */

function generateCode() {
  const a = crypto
    .randomBytes(2)
    .toString("hex")
    .toUpperCase();

  const b = crypto
    .randomBytes(2)
    .toString("hex")
    .toUpperCase();

  return `QUR-${a}-${b}`;
}

/* =========================================================
   GET
========================================================= */

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json(
      {
        success: false,

        message:
          "Faqat administrator kirishi mumkin.",
      },
      {
        status: 403,
      }
    );
  }

  try {
    const codes =
      await readCodes();

    return NextResponse.json(
      {
        success: true,
        codes,
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
      "GET CODES ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Kodlarni yuklashda xatolik.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   POST
   YANGI KOD YARATISH
========================================================= */

export async function POST(
  request: Request
) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      {
        success: false,

        message:
          "Faqat administrator kod yaratishi mumkin.",
      },
      {
        status: 403,
      }
    );
  }

  try {
    checkBlobToken();

    const body =
      await request.json();

    const name = String(
      body?.name ?? ""
    ).trim();

    if (!name) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Foydalanuvchi ismini kiriting.",
        },
        {
          status: 400,
        }
      );
    }

    const codes =
      await readCodes();

    let code =
      generateCode();

    while (
      codes.some(
        (item) =>
          item.code === code
      )
    ) {
      code =
        generateCode();
    }

    const newUser: AccessCode = {
      id: crypto.randomUUID(),

      code,

      name,

      active: true,

      approved: false,

      requestedAt: null,

      createdAt:
        new Date().toISOString(),

      approvedAt: null,

      rejectedAt: null,
    };

    codes.unshift(
      newUser
    );

    /*
      VERCEL BLOB'GA SAQLAYMIZ
    */

    await writeCodes(
      codes
    );

    /*
      TARIXGA HAM YOZAMIZ
    */

    await addHistory({
      type: "created",

      name: newUser.name,

      code: newUser.code,

      message:
        `${newUser.name} uchun yangi maxsus kirish kodi yaratildi.`,
    });

    return NextResponse.json(
      {
        success: true,

        message:
          "Maxsus kirish kodi yaratildi.",

        user: newUser,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "CREATE CODE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Kod yaratishda server xatosi.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   DELETE
   FOYDALANUVCHI + KODNI BUTUNLAY O‘CHIRISH

   MISOL:
   /api/admin/codes?id=123
========================================================= */

export async function DELETE(
  request: Request
) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      {
        success: false,

        message:
          "Faqat administrator o‘chira oladi.",
      },
      {
        status: 403,
      }
    );
  }

  try {
    checkBlobToken();

    const url =
      new URL(request.url);

    const id = String(
      url.searchParams.get("id") ??
        ""
    ).trim();

    if (!id) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Foydalanuvchi ID berilmagan.",
        },
        {
          status: 400,
        }
      );
    }

    const codes =
      await readCodes();

    const user =
      codes.find(
        (item) =>
          item.id === id
      );

    if (!user) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Foydalanuvchi topilmadi.",
        },
        {
          status: 404,
        }
      );
    }

    const newCodes =
      codes.filter(
        (item) =>
          item.id !== id
      );

    /*
      BLOB'DAGI RO‘YXATNI
      YANGILAYMIZ
    */

    await writeCodes(
      newCodes
    );

    /*
      QAYTA O‘QIB TEKSHIRAMIZ
    */

    const checkCodes =
      await readCodes();

    const stillExists =
      checkCodes.some(
        (item) =>
          item.id === id
      );

    if (stillExists) {
      console.error(
        "DELETE CHECK FAILED:",
        id
      );

      return NextResponse.json(
        {
          success: false,

          message:
            "Foydalanuvchini o‘chirib bo‘lmadi.",
        },
        {
          status: 500,
        }
      );
    }

    /*
      TARIXDA QOLDIRAMIZ
    */

    await addHistory({
      type: "deleted",

      name: user.name,

      code: user.code,

      message:
        `${user.name} va ${user.code} kodi butunlay o‘chirildi.`,
    });

    console.log(
      "USER DELETED:",
      user.name,
      user.code,
      user.id
    );

    return NextResponse.json(
      {
        success: true,

        message:
          "Foydalanuvchi butunlay o‘chirildi.",

        deletedId:
          user.id,

        deletedCode:
          user.code,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "DELETE USER ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Foydalanuvchini o‘chirishda server xatosi.",
      },
      {
        status: 500,
      }
    );
  }
}
