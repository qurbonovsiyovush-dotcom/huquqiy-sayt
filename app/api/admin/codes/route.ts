import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs";

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

const DATA_DIR = path.join(
  process.cwd(),
  "data-storage"
);

const DATA_FILE = path.join(
  DATA_DIR,
  "access-codes.json"
);

const HISTORY_FILE = path.join(
  DATA_DIR,
  "history.json"
);

/* =========================================
   ADMIN
========================================= */

async function isAdmin() {
  const cookieStore = await cookies();

  return (
    cookieStore.get("qurbonov_role")?.value ===
    "admin"
  );
}

/* =========================================
   FAYLLARNI TAYYORLASH
========================================= */

async function ensureFiles() {
  await fs.mkdir(DATA_DIR, {
    recursive: true,
  });

  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(
      DATA_FILE,
      "[]",
      "utf8"
    );
  }

  try {
    await fs.access(HISTORY_FILE);
  } catch {
    await fs.writeFile(
      HISTORY_FILE,
      "[]",
      "utf8"
    );
  }
}

/* =========================================
   KODLARNI O‘QISH
========================================= */

async function readCodes(): Promise<AccessCode[]> {
  await ensureFiles();

  try {
    const text = await fs.readFile(
      DATA_FILE,
      "utf8"
    );

    if (!text.trim()) {
      return [];
    }

    const data = JSON.parse(text);

    return Array.isArray(data)
      ? data
      : [];
  } catch (error) {
    console.error(
      "READ CODES ERROR:",
      error
    );

    return [];
  }
}

/* =========================================
   KODLARNI SAQLASH
========================================= */

async function writeCodes(
  codes: AccessCode[]
) {
  await ensureFiles();

  await fs.writeFile(
    DATA_FILE,
    JSON.stringify(
      codes,
      null,
      2
    ),
    "utf8"
  );
}

/* =========================================
   TARIXGA YOZISH
========================================= */

async function addHistory(
  data: {
    type: HistoryItem["type"];
    name: string;
    code: string;
    message: string;
  }
) {
  try {
    await ensureFiles();

    let history: HistoryItem[] = [];

    try {
      const text =
        await fs.readFile(
          HISTORY_FILE,
          "utf8"
        );

      const parsed =
        JSON.parse(text);

      history =
        Array.isArray(parsed)
          ? parsed
          : [];
    } catch {
      history = [];
    }

    history.unshift({
      id: crypto.randomUUID(),

      type: data.type,

      name: data.name,

      code: data.code,

      message: data.message,

      createdAt:
        new Date().toISOString(),
    });

    await fs.writeFile(
      HISTORY_FILE,
      JSON.stringify(
        history,
        null,
        2
      ),
      "utf8"
    );
  } catch (error) {
    console.error(
      "HISTORY ERROR:",
      error
    );
  }
}

/* =========================================
   MAXSUS KOD
========================================= */

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

/* =========================================
   GET
========================================= */

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

    return NextResponse.json({
      success: true,
      codes,
    });
  } catch (error) {
    console.error(
      "GET CODES ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Kodlarni yuklashda xatolik.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================
   POST
   YANGI KOD YARATISH
========================================= */

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
    const body =
      await request.json();

    const name =
      String(
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

    await writeCodes(
      codes
    );

    await addHistory({
      type: "created",

      name:
        newUser.name,

      code:
        newUser.code,

      message:
        `${newUser.name} uchun yangi maxsus kirish kodi yaratildi.`,
    });

    return NextResponse.json(
      {
        success: true,

        user:
          newUser,
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
          "Kod yaratishda server xatosi.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================
   DELETE
   FOYDALANUVCHI + KODNI BUTUNLAY O‘CHIRISH
========================================= */

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
    const url =
      new URL(request.url);

    const id =
      String(
        url.searchParams.get("id") ?? ""
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

    /* MUHIM */

    const newCodes =
      codes.filter(
        (item) =>
          item.id !== id
      );

    await writeCodes(
      newCodes
    );

    /* HAQIQATAN O‘CHGANINI TEKSHIRAMIZ */

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
            "Foydalanuvchini fayldan o‘chirib bo‘lmadi.",
        },
        {
          status: 500,
        }
      );
    }

    /* TARIXDA QOLADI */

    await addHistory({
      type: "deleted",

      name:
        user.name,

      code:
        user.code,

      message:
        `${user.name} va ${user.code} kodi butunlay o‘chirildi.`,
    });

    console.log(
      "USER DELETED:",
      user.name,
      user.code,
      user.id
    );

    return NextResponse.json({
      success: true,

      deletedId:
        user.id,

      deletedCode:
        user.code,
    });

  } catch (error) {
    console.error(
      "DELETE USER ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Foydalanuvchini o‘chirishda server xatosi.",
      },
      {
        status: 500,
      }
    );
  }
}