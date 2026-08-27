import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { get, put } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  testType?: string;
  customTestTypeName?: string;
  attemptLimit?: number | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

async function isAdmin() {
  const cookieStore = await cookies();
  return Boolean(
    cookieStore.get("qurbonov_session")?.value &&
    cookieStore.get("qurbonov_role")?.value === "admin"
  );
}

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

async function readTests(): Promise<TestData[]> {
  checkBlobToken();

  const result = await get(TESTS_BLOB_PATH, {
    access: "private",
  });

  if (!result || result.statusCode !== 200 || !result.stream) {
    throw new Error(
      `tests.json o‘qilmadi. Status: ${result?.statusCode ?? "noma'lum"}`
    );
  }

  const text = await new Response(result.stream).text();

  if (!text.trim()) {
    throw new Error("tests.json bo‘sh.");
  }

  return normalizeTests(JSON.parse(text));
}

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
      cacheControlMaxAge: 0,
    }
  );
}

async function getId(
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  return decodeURIComponent(String(params?.id || "")).trim();
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const id = await getId(context);

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Test ID topilmadi." },
        { status: 400 }
      );
    }

    const tests = await readTests();
    const test = tests.find((item) => item.id === id);

    if (!test) {
      return NextResponse.json(
        { success: false, message: "Test topilmadi." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, test },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("GET /api/tests/[id] ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Testni yuklashda server xatosi.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        {
          success: false,
          message: "Bu amal faqat administrator uchun.",
        },
        { status: 403 }
      );
    }

    const id = await getId(context);

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Test ID topilmadi." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const tests = await readTests();

    const index = tests.findIndex((item) => item.id === id);

    if (index < 0) {
      return NextResponse.json(
        { success: false, message: "Test topilmadi." },
        { status: 404 }
      );
    }

    const current = tests[index];

    const requestedStatus: TestStatus =
      body?.status === "published"
        ? "published"
        : body?.status === "draft"
        ? "draft"
        : current.status === "published"
        ? "published"
        : "draft";

    const nextQuestions = Array.isArray(body?.questions)
      ? body.questions
      : Array.isArray(current.questions)
      ? current.questions
      : [];

    if (
      requestedStatus === "published" &&
      nextQuestions.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Savolsiz testni e’lon qilib bo‘lmaydi.",
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const updatedTest: TestData = {
      ...current,
      ...body,
      id: current.id,
      questions: nextQuestions,
      status: requestedStatus,
      createdAt:
        current.createdAt ||
        String(body?.createdAt || now),
      updatedAt: now,
    };

    tests[index] = updatedTest;

    await writeTests(tests);

    return NextResponse.json(
      {
        success: true,
        message:
          requestedStatus === "published"
            ? "Test muvaffaqiyatli e’lon qilindi."
            : "Test qoralama holatida saqlandi.",
        test: updatedTest,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("PUT /api/tests/[id] ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Testni yangilashda server xatosi.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        {
          success: false,
          message: "Bu amal faqat administrator uchun.",
        },
        { status: 403 }
      );
    }

    const id = await getId(context);

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Test ID topilmadi." },
        { status: 400 }
      );
    }

    const tests = await readTests();
    const index = tests.findIndex((item) => item.id === id);

    if (index < 0) {
      return NextResponse.json(
        { success: false, message: "Test topilmadi." },
        { status: 404 }
      );
    }

    const deletedTest = tests[index];
    const nextTests = tests.filter((item) => item.id !== id);

    await writeTests(nextTests);

    return NextResponse.json(
      {
        success: true,
        message: "Test o‘chirildi.",
        test: deletedTest,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE /api/tests/[id] ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Testni o‘chirishda server xatosi.",
      },
      { status: 500 }
    );
  }
}
