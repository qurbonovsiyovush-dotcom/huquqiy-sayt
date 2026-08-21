import { NextRequest, NextResponse } from "next/server";
import { get, put } from "@vercel/blob";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESULTS_BLOB_PATH =
  "huquqiy-sayt/test-results.json";

const TESTS_BLOB_PATH =
  "huquqiy-sayt/tests.json";

/* =========================================================
   TYPES
========================================================= */

type TestData = {
  id: string;
  title?: string;
  subject?: string;

  /*
    null = cheksiz
    1, 2, 3... = urinishlar soni
  */
  attemptLimit?: number | null;

  [key: string]: unknown;
};

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

  answers?: Record<string, unknown>;

  finishedAt: string;
};

/* =========================================================
   HELPERS
========================================================= */

function safeNumber(
  value: unknown,
  fallback = 0
) {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function getUserName(
  request: NextRequest
) {
  const encodedName =
    request.cookies.get(
      "qurbonov_name"
    )?.value ||
    "Foydalanuvchi";

  try {
    return decodeURIComponent(
      encodedName
    );
  } catch {
    return encodedName;
  }
}

/* =========================================================
   BLOB TEKSHIRISH
========================================================= */

function checkBlobToken() {
  if (
    !process.env
      .BLOB_READ_WRITE_TOKEN
  ) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN topilmadi."
    );
  }
}

/* =========================================================
   TESTLARNI O‘QISH
========================================================= */

async function readTests(): Promise<TestData[]> {
  checkBlobToken();

  try {
    const result =
      await get(
        TESTS_BLOB_PATH,
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

    const text =
      await new Response(
        result.stream
      ).text();

    if (!text.trim()) {
      return [];
    }

    const parsed =
      JSON.parse(text);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch (error) {
    console.error(
      "TESTS BLOB READ ERROR:",
      error
    );

    return [];
  }
}

/* =========================================================
   NATIJALARNI O‘QISH
========================================================= */

async function readResults(): Promise<TestResult[]> {
  checkBlobToken();

  try {
    const result =
      await get(
        RESULTS_BLOB_PATH,
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

    const text =
      await new Response(
        result.stream
      ).text();

    if (!text.trim()) {
      return [];
    }

    const parsed =
      JSON.parse(text);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch (error) {
    /*
      Hali birorta natija
      mavjud bo‘lmasa [].
    */

    console.log(
      "Natijalar Blob hali mavjud emas:",
      error
    );

    return [];
  }
}

/* =========================================================
   NATIJALARNI YOZISH
========================================================= */

async function writeResults(
  results: TestResult[]
) {
  checkBlobToken();

  await put(
    RESULTS_BLOB_PATH,
    JSON.stringify(
      results,
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
   TEST LIMITINI OLISH
========================================================= */

function getAttemptLimit(
  test: TestData
): number | null {
  /*
    null yoki undefined:
    CHEKSIZ.

    Bu eski testlar buzilmasligi
    uchun ham kerak.
  */

  if (
    test.attemptLimit === null ||
    test.attemptLimit ===
      undefined
  ) {
    return null;
  }

  const parsed =
    Number(
      test.attemptLimit
    );

  if (
    !Number.isFinite(parsed) ||
    parsed < 1
  ) {
    return null;
  }

  return Math.floor(parsed);
}

/* =========================================================
   FOYDALANUVCHINING SHU TESTDAGI URINISHLARI
========================================================= */

function getUserAttempts(
  results: TestResult[],
  testId: string,
  userName: string
) {
  return results.filter(
    (item) =>
      String(item.testId) ===
        String(testId) &&
      String(item.userName)
        .trim()
        .toLocaleLowerCase() ===
        String(userName)
          .trim()
          .toLocaleLowerCase()
  );
}

/* =========================================================
   POST
   NATIJANI SAQLASH
========================================================= */

export async function POST(
  request: NextRequest
) {
  try {
    /* =====================================================
       LOGIN
    ===================================================== */

    const session =
      request.cookies.get(
        "qurbonov_session"
      )?.value;

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Avval tizimga kiring.",
        },
        {
          status: 401,
        }
      );
    }

    const userName =
      getUserName(request);

    /* =====================================================
       BODY
    ===================================================== */

    const body =
      await request.json();

    const testId =
      String(
        body?.testId || ""
      ).trim();

    if (!testId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Test ID topilmadi.",
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       TESTNI SERVERDAN TOPAMIZ
    ===================================================== */

    const tests =
      await readTests();

    const test =
      tests.find(
        (item) =>
          String(item.id) ===
          String(testId)
      );

    if (!test) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Test topilmadi.",
        },
        {
          status: 404,
        }
      );
    }

    /*
      MUHIM:
      test nomi va fanini ham
      clientdan emas,
      serverdagi testdan olamiz.
    */

    const testTitle =
      String(
        test.title ||
          body?.testTitle ||
          ""
      ).trim();

    const subject =
      String(
        test.subject ||
          body?.subject ||
          ""
      ).trim();

    /* =====================================================
       NATIJALARNI O‘QIYMIZ
    ===================================================== */

    const results =
      await readResults();

    /* =====================================================
       URINISH LIMITINI TEKSHIRAMIZ
    ===================================================== */

    const attemptLimit =
      getAttemptLimit(test);

    const previousAttempts =
      getUserAttempts(
        results,
        testId,
        userName
      );

    const attemptsUsed =
      previousAttempts.length;

    /*
      Limit mavjud bo‘lsa va
      ishlatilgan urinishlar
      limitga yetgan bo‘lsa,
      natijani qabul qilmaymiz.
    */

    if (
      attemptLimit !== null &&
      attemptsUsed >=
        attemptLimit
    ) {
      return NextResponse.json(
        {
          success: false,

          code:
            "ATTEMPT_LIMIT_REACHED",

          message:
            `Siz ushbu test uchun berilgan ${attemptLimit} ta urinishdan foydalanib bo‘lgansiz.`,

          attemptLimit,

          attemptsUsed,

          attemptsRemaining: 0,

          previousResults:
            previousAttempts,
        },
        {
          status: 403,
        }
      );
    }

    /* =====================================================
       NATIJA HISOBLARI
    ===================================================== */

    const total =
      Math.max(
        0,
        safeNumber(
          body?.total
        )
      );

    const correct =
      Math.max(
        0,
        safeNumber(
          body?.correct
        )
      );

    const incorrect =
      Math.max(
        0,
        safeNumber(
          body?.incorrect
        )
      );

    const unanswered =
      Math.max(
        0,
        safeNumber(
          body?.unanswered
        )
      );

    const percentage =
      Math.min(
        100,
        Math.max(
          0,
          safeNumber(
            body?.percentage
          )
        )
      );

    const earnedPoints =
      Math.max(
        0,
        safeNumber(
          body?.earnedPoints
        )
      );

    const totalPoints =
      Math.max(
        0,
        safeNumber(
          body?.totalPoints
        )
      );

    const spentSeconds =
      Math.max(
        0,
        Math.floor(
          safeNumber(
            body?.spentSeconds
          )
        )
      );

    /* =====================================================
       JAVOBLAR
    ===================================================== */

    let answers:
      | Record<string, unknown>
      | undefined;

    if (
      body?.answers &&
      typeof body.answers ===
        "object" &&
      !Array.isArray(
        body.answers
      )
    ) {
      answers =
        body.answers;
    }

    /* =====================================================
       YANGI NATIJA
    ===================================================== */

    const result: TestResult = {
      id:
        crypto.randomUUID(),

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

    /* =====================================================
       SAQLASH
    ===================================================== */

    results.unshift(
      result
    );

    await writeResults(
      results
    );

    /* =====================================================
       QOLGAN URINISHLAR
    ===================================================== */

    const newAttemptsUsed =
      attemptsUsed + 1;

    const attemptsRemaining =
      attemptLimit === null
        ? null
        : Math.max(
            0,
            attemptLimit -
              newAttemptsUsed
          );

    return NextResponse.json(
      {
        success: true,

        message:
          "Natija muvaffaqiyatli saqlandi.",

        result,

        attemptLimit,

        attemptsUsed:
          newAttemptsUsed,

        attemptsRemaining,

        unlimited:
          attemptLimit === null,
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
   FOYDALANUVCHI NATIJALARI + URINISH HOLATI
========================================================= */

export async function GET(
  request: NextRequest
) {
  try {
    /* =====================================================
       LOGIN
    ===================================================== */

    const session =
      request.cookies.get(
        "qurbonov_session"
      )?.value;

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Avval tizimga kiring.",
        },
        {
          status: 401,
        }
      );
    }

    const userName =
      getUserName(request);

    const url =
      new URL(
        request.url
      );

    const testId =
      String(
        url.searchParams.get(
          "testId"
        ) || ""
      ).trim();

    const results =
      await readResults();

    /* =====================================================
       TEST ID BERILMAGAN
    ===================================================== */

    if (!testId) {
      const userResults =
        results.filter(
          (item) =>
            String(
              item.userName
            )
              .trim()
              .toLocaleLowerCase() ===
            String(userName)
              .trim()
              .toLocaleLowerCase()
        );

      return NextResponse.json(
        {
          success: true,

          count:
            userResults.length,

          results:
            userResults,
        },
        {
          status: 200,

          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    /* =====================================================
       TESTNI TOPAMIZ
    ===================================================== */

    const tests =
      await readTests();

    const test =
      tests.find(
        (item) =>
          String(item.id) ===
          String(testId)
      );

    if (!test) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Test topilmadi.",
        },
        {
          status: 404,
        }
      );
    }

    const attemptLimit =
      getAttemptLimit(test);

    const attempts =
      getUserAttempts(
        results,
        testId,
        userName
      );

    const attemptsUsed =
      attempts.length;

    const attemptsRemaining =
      attemptLimit === null
        ? null
        : Math.max(
            0,
            attemptLimit -
              attemptsUsed
          );

    const canAttempt =
      attemptLimit === null ||
      attemptsUsed <
        attemptLimit;

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json(
      {
        success: true,

        testId,

        attemptLimit,

        attemptsUsed,

        attemptsRemaining,

        unlimited:
          attemptLimit === null,

        canAttempt,

        results:
          attempts,
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
          "Urinish ma’lumotlarini yuklashda server xatosi.",
      },
      {
        status: 500,
      }
    );
  }
}
