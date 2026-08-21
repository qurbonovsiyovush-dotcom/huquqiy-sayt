import { NextRequest, NextResponse } from "next/server";
import { get, put } from "@vercel/blob";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================================================
   BLOB
========================================================= */

const BLOB_PATH = "huquqiy-sayt/tests.json";

/* =========================================================
   ESKI LOCAL STORAGE
   Faqat birinchi migratsiya uchun ishlatiladi.
========================================================= */

const LOCAL_TESTS_FILE = path.join(
  process.cwd(),
  "data-storage",
  "tests.json"
);

/* =========================================================
   TYPES
========================================================= */

type TestStatus = "draft" | "published";

type TestData = {
  id: string;
  title?: string;
  subject?: string;
  duration?: number;
  description?: string;
  status?: TestStatus;
  questions?: unknown[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

/* =========================================================
   JSON PARSE
========================================================= */

function normalizeTests(value: unknown): TestData[] {
  return Array.isArray(value)
    ? (value as TestData[])
    : [];
}

/* =========================================================
   LOCAL TESTLARNI O‘QISH
   Blob bo‘sh bo‘lsa bir marta ishlaydi.
========================================================= */

function readLegacyTests(): TestData[] {
  try {
    if (!fs.existsSync(LOCAL_TESTS_FILE)) {
      return [];
    }

    const content = fs.readFileSync(
      LOCAL_TESTS_FILE,
      "utf-8"
    );

    if (!content.trim()) {
      return [];
    }

    return normalizeTests(
      JSON.parse(content)
    );
  } catch (error) {
    console.error(
      "ESKI tests.json O‘QISH XATOSI:",
      error
    );

    return [];
  }
}

/* =========================================================
   BLOBGA YOZISH
========================================================= */

async function writeTests(
  tests: TestData[]
) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN topilmadi."
    );
  }

  await put(
    BLOB_PATH,
    JSON.stringify(
      tests,
      null,
      2
    ),
    {
      access: "private",
      contentType:
        "application/json; charset=utf-8",

      /*
        Path doim bir xil qoladi.
      */
      addRandomSuffix: false,

      /*
        tests.json yangilanayotganligi uchun
        eski Blob ustidan yozishga ruxsat.
      */
      allowOverwrite: true,

      /*
        Tez yangilanishi uchun.
        Vercel Blob minimum 60 soniya.
      */
      cacheControlMaxAge: 60,
    }
  );
}

/* =========================================================
   BLOB'DAN O‘QISH
========================================================= */

async function readTests(): Promise<TestData[]> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN topilmadi."
    );
  }

  try {
    const result = await get(
      BLOB_PATH,
      {
        access: "private",
      }
    );

    /*
      Blob hali yaratilmagan.
      Eski tests.json ni migratsiya qilamiz.
    */
    if (
      !result ||
      result.statusCode !== 200 ||
      !result.stream
    ) {
      const legacyTests =
        readLegacyTests();

      await writeTests(
        legacyTests
      );

      return legacyTests;
    }

    const text =
      await new Response(
        result.stream
      ).text();

    if (!text.trim()) {
      return [];
    }

    return normalizeTests(
      JSON.parse(text)
    );
  } catch (error) {
    /*
      Blob birinchi marta yo‘q bo‘lsa
      yoki get() BlobNotFound qaytarsa,
      eski fayldan boshlaymiz.
    */

    console.error(
      "BLOB O‘QISH:",
      error
    );

    const legacyTests =
      readLegacyTests();

    /*
      Blobga yozishga urinamiz.
      Agar boshqa jiddiy xato bo‘lsa,
      yuqoriga chiqaramiz.
    */
    try {
      await writeTests(
        legacyTests
      );

      return legacyTests;
    } catch (writeError) {
      console.error(
        "BLOB MIGRATSIYA XATOSI:",
        writeError
      );

      throw writeError;
    }
  }
}

/* =========================================================
   ID
========================================================= */

function makeId() {
  return crypto.randomUUID();
}

/* =========================================================
   GET
   BARCHA TESTLARNI OLISH
========================================================= */

export async function GET() {
  try {
    const tests =
      await readTests();

    /*
      Eng oxirgi o‘zgargan testlar tepada.
    */
    const sortedTests = [
      ...tests,
    ].sort((a, b) => {
      const aTime =
        new Date(
          String(
            a.updatedAt ||
              a.createdAt ||
              ""
          )
        ).getTime() || 0;

      const bTime =
        new Date(
          String(
            b.updatedAt ||
              b.createdAt ||
              ""
          )
        ).getTime() || 0;

      return bTime - aTime;
    });

    return NextResponse.json(
      {
        success: true,
        tests: sortedTests,
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
      "GET /api/tests ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Testlarni yuklashda server xatosi yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   POST
   YANGI TEST YARATISH
========================================================= */

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const title =
      String(
        body?.title || ""
      ).trim();

    const subject =
      String(
        body?.subject || ""
      ).trim();

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Test nomi kiritilmagan.",
        },
        {
          status: 400,
        }
      );
    }

    const questions =
      Array.isArray(
        body?.questions
      )
        ? body.questions
        : [];

    if (
      questions.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Kamida bitta savol bo‘lishi kerak.",
        },
        {
          status: 400,
        }
      );
    }

    const now =
      new Date().toISOString();

    const newTest: TestData = {
      ...body,

      /*
        Client bergan IDga ishonmaymiz.
      */
      id: makeId(),

      title,
      subject,

      duration:
        Math.max(
          1,
          Number(
            body?.duration
          ) || 30
        ),

      description:
        String(
          body?.description || ""
        ),

      questions,

      status:
        body?.status ===
        "published"
          ? "published"
          : "draft",

      createdAt: now,
      updatedAt: now,
    };

    const tests =
      await readTests();

    tests.push(
      newTest
    );

    await writeTests(
      tests
    );

    return NextResponse.json(
      {
        success: true,
        message:
          "Test muvaffaqiyatli yaratildi.",
        test: newTest,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/tests ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Testni yaratishda server xatosi yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}
