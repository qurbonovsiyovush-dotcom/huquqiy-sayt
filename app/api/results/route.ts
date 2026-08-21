import { NextRequest, NextResponse } from "next/server";
import { get, put } from "@vercel/blob";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESULTS_BLOB_PATH = "huquqiy-sayt/test-results.json";

type TestResult = {
  id: string;
  userName: string;
  testId: string;
  testTitle: string;
  subject: string;
  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  percentage: number;
  earnedPoints: number;
  totalPoints: number;
  spentSeconds: number;
  answers?: Record<string, string>;
  finishedAt: string;
};

function number(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function readResults(): Promise<TestResult[]> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN topilmadi.");
  }

  try {
    const result = await get(RESULTS_BLOB_PATH, {
      access: "private",
    });

    if (
      !result ||
      result.statusCode !== 200 ||
      !result.stream
    ) {
      return [];
    }

    const text = await new Response(result.stream).text();

    if (!text.trim()) {
      return [];
    }

    const parsed = JSON.parse(text);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch (error) {
    console.error("RESULT BLOB READ ERROR:", error);

    return [];
  }
}

async function writeResults(results: TestResult[]) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN topilmadi.");
  }

  await put(
    RESULTS_BLOB_PATH,
    JSON.stringify(results, null, 2),
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
   POST
   TEST NATIJASINI SAQLASH
========================================================= */

export async function POST(request: NextRequest) {
  try {
    const session =
      request.cookies.get("qurbonov_session")?.value;

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Avval tizimga kiring.",
        },
        {
          status: 401,
        }
      );
    }

    const encodedName =
      request.cookies.get("qurbonov_name")?.value ||
      "Foydalanuvchi";

    let userName = "Foydalanuvchi";

    try {
      userName = decodeURIComponent(encodedName);
    } catch {
      userName = encodedName;
    }

    const body = await request.json();

    const testId =
      String(body?.testId || "").trim();

    const testTitle =
      String(body?.testTitle || "").trim();

    const subject =
      String(body?.subject || "").trim();

    if (!testId || !testTitle) {
      return NextResponse.json(
        {
          success: false,
          message: "Test ma’lumotlari yetarli emas.",
        },
        {
          status: 400,
        }
      );
    }

    const total =
      Math.max(0, number(body?.total));

    const correct =
      Math.max(0, number(body?.correct));

    const incorrect =
      Math.max(0, number(body?.incorrect));

    const unanswered =
      Math.max(0, number(body?.unanswered));

    const percentage =
      Math.min(
        100,
        Math.max(
          0,
          number(body?.percentage)
        )
      );

    const earnedPoints =
      Math.max(
        0,
        number(body?.earnedPoints)
      );

    const totalPoints =
      Math.max(
        0,
        number(body?.totalPoints)
      );

    const spentSeconds =
      Math.max(
        0,
        Math.floor(
          number(body?.spentSeconds)
        )
      );

    const answers =
      body?.answers &&
      typeof body.answers === "object" &&
      !Array.isArray(body.answers)
        ? body.answers
        : undefined;

    const result: TestResult = {
      id: crypto.randomUUID(),
      userName,
      testId,
      testTitle,
      subject,
      total,
      correct,
      incorrect,
      unanswered,
      percentage,
      earnedPoints,
      totalPoints,
      spentSeconds,
      answers,
      finishedAt:
        new Date().toISOString(),
    };

    const results =
      await readResults();

    results.unshift(result);

    await writeResults(results);

    return NextResponse.json(
      {
        success: true,
        result,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "RESULT POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Natijani saqlashda server xatosi.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   GET
   NATIJALARNI KO‘RISH
========================================================= */

export async function GET(
  request: NextRequest
) {
  try {
    const session =
      request.cookies.get("qurbonov_session")?.value;

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Avval tizimga kiring.",
        },
        {
          status: 401,
        }
      );
    }

    const results =
      await readResults();

    return NextResponse.json(
      {
        success: true,
        results,
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
      "RESULT GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Natijalarni yuklashda server xatosi.",
      },
      {
        status: 500,
      }
    );
  }
}
