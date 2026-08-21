import { NextRequest, NextResponse } from "next/server";
import { get, put } from "@vercel/blob";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TESTS_BLOB_PATH = "huquqiy-sayt/tests.json";

type TestStatus = "draft" | "published";

type TestData = {
  id: string;
  title?: string;
  subject?: string;
  duration?: number;
  description?: string;
  status?: TestStatus;
  questions?: unknown[];

  // null = cheksiz
  // 1,2,3... = urinishlar soni
  attemptLimit?: number | null;

  createdAt?: string;
  updatedAt?: string;

  [key: string]: unknown;
};

function checkBlobToken() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN topilmadi.");
  }
}

function normalizeTests(value: unknown): TestData[] {
  if (!Array.isArray(value)) {
    throw new Error("tests.json formati noto‘g‘ri.");
  }

  return value as TestData[];
}

function normalizeAttemptLimit(value: unknown): number | null {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    value === "unlimited"
  ) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return null;
  }

  return Math.floor(parsed);
}

/* =========================================================
   TESTLARNI BLOB'DAN O‘QISH
========================================================= */

async function readTests(): Promise<TestData[]> {
  checkBlobToken();

  const result = await get(TESTS_BLOB_PATH, {
    access: "private",
  });

  if (
    !result ||
    result.statusCode !== 200 ||
    !result.stream
  ) {
    throw new Error(
      `tests.json o‘qilmadi. Status: ${result?.statusCode ?? "noma'lum"}`
    );
  }

  const text = await new Response(result.stream).text();

  if (!text.trim()) {
    throw new Error("tests.json bo‘sh.");
  }

  const parsed = JSON.parse(text);

  return normalizeTests(parsed);
}

/* =========================================================
   TESTLARNI BLOB'GA YOZISH
========================================================= */

async function writeTests(tests: TestData[]) {
  checkBlobToken();

  await put(
    TESTS_BLOB_PATH,
    JSON.stringify(tests, null, 2),
    {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json; charset=utf-8",
      cacheControlMaxAge: 60,
    }
  );
}

/* =========================================================
   GET
   BARCHA TESTLARNI OLISH
========================================================= */

export async function GET() {
  try {
    const tests = await readTests();

    const sortedTests = [...tests].sort((a, b) => {
      const aTime =
        new Date(
          String(a.updatedAt || a.createdAt || "")
        ).getTime() || 0;

      const bTime =
        new Date(
          String(b.updatedAt || b.createdAt || "")
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
    console.error("GET /api/tests ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Testlarni yuklashda server xatosi.",
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const title = String(body?.title || "").trim();
    const subject = String(body?.subject || "").trim();

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          message: "Test nomi kiritilmagan.",
        },
        {
          status: 400,
        }
      );
    }

    const questions = Array.isArray(body?.questions)
      ? body.questions
      : [];

    if (questions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Kamida bitta savol bo‘lishi kerak.",
        },
        {
          status: 400,
        }
      );
    }

    /*
      MUHIM:
      avval mavjud testlarni Blob'dan o‘qiymiz.
      Agar o‘qish xato bersa, yozmaymiz.
      Shuning uchun eski testlar tasodifan o‘chmaydi.
    */
    const tests = await readTests();

    const now = new Date().toISOString();

    const newTest: TestData = {
      ...body,

      id: crypto.randomUUID(),

      title,
      subject,

      duration: Math.max(
        1,
        Number(body?.duration) || 30
      ),

      description: String(
        body?.description || ""
      ),

      questions,

      status:
        body?.status === "published"
          ? "published"
          : "draft",

      attemptLimit:
        normalizeAttemptLimit(
          body?.attemptLimit
        ),

      createdAt: now,
      updatedAt: now,
    };

    tests.push(newTest);

    await writeTests(tests);

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
    console.error("POST /api/tests ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Testni yaratishda server xatosi.",
      },
      {
        status: 500,
      }
    );
  }
}
