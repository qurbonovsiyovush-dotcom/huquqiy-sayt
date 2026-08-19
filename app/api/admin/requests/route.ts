import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import fs from "fs/promises";
import path from "path";

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

const DATA_DIR = path.join(
  process.cwd(),
  "data-storage"
);

const DATA_FILE = path.join(
  DATA_DIR,
  "access-codes.json"
);

/* =====================================================
   ADMINNI TEKSHIRISH
===================================================== */

async function isAdmin() {
  const cookieStore = await cookies();

  return (
    cookieStore.get("qurbonov_role")?.value ===
    "admin"
  );
}

/* =====================================================
   DATA FAYLINI TAYYORLASH
===================================================== */

async function ensureFile() {
  await fs.mkdir(DATA_DIR, {
    recursive: true,
  });

  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(
      DATA_FILE,
      JSON.stringify([], null, 2),
      "utf8"
    );
  }
}

/* =====================================================
   KODLARNI O‘QISH
===================================================== */

async function readCodes(): Promise<AccessCode[]> {
  await ensureFile();

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
}

/* =====================================================
   KODLARNI SAQLASH
===================================================== */

async function writeCodes(
  codes: AccessCode[]
) {
  await ensureFile();

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

/* =====================================================
   GET
   KIRISH SO‘ROVLARINI ADMIN PANELGA BERISH
===================================================== */

export async function GET() {

  if (!(await isAdmin())) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Bu bo‘lim faqat administrator uchun.",
      },
      {
        status: 403,
      }
    );
  }

  try {

    const codes =
      await readCodes();

    /*
      Faqat foydalanuvchi kamida
      bir marta kirishga uringan
      kodlarni olamiz.
    */

    const requests = codes
      .filter(
        (item) =>
          item.requestedAt !== null
      )
      .map((item) => {

        let status:
          | "pending"
          | "approved"
          | "rejected";

        if (item.approved) {

          status = "approved";

        } else if (!item.active) {

          status = "rejected";

        } else {

          status = "pending";

        }

        return {
          id: item.id,

          code: item.code,

          name: item.name,

          status,

          requestedAt:
            item.requestedAt,

          approvedAt:
            item.approvedAt ?? null,

          rejectedAt:
            item.rejectedAt ?? null,
        };
      });

    return NextResponse.json({
      success: true,
      requests,
    });

  } catch (error) {

    console.error(
      "REQUEST GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Kirish so‘rovlarini olishda xatolik yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =====================================================
   POST
   RUXSAT BERISH / RAD ETISH
===================================================== */

export async function POST(
  request: Request
) {

  if (!(await isAdmin())) {
    return NextResponse.json(
      {
        success: false,

        message:
          "Bu amalni faqat administrator bajarishi mumkin.",
      },
      {
        status: 403,
      }
    );
  }

  try {

    const body =
      await request.json();

    const id =
      String(
        body?.id ?? ""
      ).trim();

    const action =
      String(
        body?.action ?? ""
      ).trim();

    if (!id) {

      return NextResponse.json(
        {
          success: false,

          message:
            "Foydalanuvchi ID topilmadi.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      action !== "approve" &&
      action !== "reject"
    ) {

      return NextResponse.json(
        {
          success: false,

          message:
            "Noto‘g‘ri amal yuborildi.",
        },
        {
          status: 400,
        }
      );
    }

    const codes =
      await readCodes();

    const index =
      codes.findIndex(
        (item) =>
          item.id === id
      );

    if (index === -1) {

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

    /* ===============================================
       RUXSAT BERISH
    =============================================== */

    if (action === "approve") {

      codes[index] = {
        ...codes[index],

        active: true,

        approved: true,

        approvedAt:
          new Date().toISOString(),

        rejectedAt: null,
      };

      await writeCodes(
        codes
      );

      return NextResponse.json({
        success: true,

        status: "approved",

        message:
          `${codes[index].name} uchun kirishga ruxsat berildi.`,
      });
    }

    /* ===============================================
       RAD ETISH
    =============================================== */

    codes[index] = {
      ...codes[index],

      active: false,

      approved: false,

      rejectedAt:
        new Date().toISOString(),

      approvedAt: null,
    };

    await writeCodes(
      codes
    );

    return NextResponse.json({
      success: true,

      status: "rejected",

      message:
        `${codes[index].name}ning kirish so‘rovi rad etildi.`,
    });

  } catch (error) {

    console.error(
      "REQUEST POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Ruxsatni o‘zgartirishda server xatosi.",
      },
      {
        status: 500,
      }
    );
  }
}