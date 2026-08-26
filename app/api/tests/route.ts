import { NextRequest, NextResponse } from "next/server";
import { get, put } from "@vercel/blob";
import crypto from "crypto";

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

  testType?: string;
  customTestTypeName?: string;

  status?: TestStatus;

  questions?: unknown[];

  attemptLimit?: number | null;

  importState?: {
    mode?: "chunked";
    expectedQuestions?: number;
    receivedQuestions?: number;
    completed?: boolean;
  };

  createdAt?: string;
  updatedAt?: string;

  [key: string]: unknown;
};

/* =========================================================
   HELPERS
========================================================= */

function checkBlobToken() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN topilmadi."
    );
  }
}

function normalizeTests(
  value: unknown
): TestData[] {
  if (!Array.isArray(value)) {
    throw new Error(
      "tests.json formati noto‘g‘ri."
    );
  }

  return value as TestData[];
}

function normalizeAttemptLimit(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    value === "unlimited"
  ) {
    return null;
  }

  const parsed =
    Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < 1
  ) {
    return null;
  }

  return Math.floor(parsed);
}

function normalizeStatus(
  value: unknown
): TestStatus {
  return value === "published"
    ? "published"
    : "draft";
}

/* =========================================================
   BLOB READ
========================================================= */

async function readTests(): Promise<TestData[]> {
  checkBlobToken();

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
    throw new Error(
      `tests.json o‘qilmadi. Status: ${
        result?.statusCode ??
        "noma'lum"
      }`
    );
  }

  const text =
    await new Response(
      result.stream
    ).text();

  if (!text.trim()) {
    throw new Error(
      "tests.json bo‘sh."
    );
  }

  const parsed =
    JSON.parse(text);

  return normalizeTests(
    parsed
  );
}

/* =========================================================
   BLOB WRITE
========================================================= */

async function writeTests(
  tests: TestData[]
) {
  checkBlobToken();

  await put(
    TESTS_BLOB_PATH,
    JSON.stringify(
      tests,
      null,
      2
    ),
    {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType:
        "application/json; charset=utf-8",
      cacheControlMaxAge: 0,
    }
  );
}

/* =========================================================
   GET
========================================================= */

export async function GET() {
  try {
    const tests =
      await readTests();

    const sortedTests =
      [...tests].sort(
        (a, b) => {
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
        }
      );

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
   CREATE CHUNKED TEST
========================================================= */

async function createChunkedTest(
  body: any
) {
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

  const tests =
    await readTests();

  const now =
    new Date().toISOString();

  const expectedQuestions =
    Math.max(
      1,
      Number(
        body?.expectedQuestions
      ) || 1
    );

  const id =
    crypto.randomUUID();

  const newTest: TestData = {
    id,

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

    testType:
      String(
        body?.testType || ""
      ),

    customTestTypeName:
      String(
        body?.customTestTypeName ||
        ""
      ),

    status: "draft",

    attemptLimit:
      normalizeAttemptLimit(
        body?.attemptLimit
      ),

    questions: [],

    importState: {
      mode: "chunked",
      expectedQuestions,
      receivedQuestions: 0,
      completed: false,
    },

    createdAt: now,
    updatedAt: now,
  };

  tests.push(
    newTest
  );

  await writeTests(
    tests
  );

  return NextResponse.json(
    {
      success: true,
      testId: id,
      receivedQuestions: 0,
      expectedQuestions,
    },
    {
      status: 201,
    }
  );
}

/* =========================================================
   APPEND QUESTIONS CHUNK
========================================================= */

async function appendQuestionsChunk(
  body: any
) {
  const testId =
    String(
      body?.testId || ""
    ).trim();

  if (!testId) {
    return NextResponse.json(
      {
        success: false,
        message:
          "testId topilmadi.",
      },
      {
        status: 400,
      }
    );
  }

  const chunk =
    Array.isArray(
      body?.questions
    )
      ? body.questions
      : [];

  if (
    chunk.length === 0
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Savollar bo‘lagi bo‘sh.",
      },
      {
        status: 400,
      }
    );
  }

  const startIndex =
    Number(
      body?.startIndex
    );

  if (
    !Number.isInteger(
      startIndex
    ) ||
    startIndex < 0
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "startIndex noto‘g‘ri.",
      },
      {
        status: 400,
      }
    );
  }

  /*
    MUHIM:
    Fixed-path Blob ketma-ket overwrite qilinganda keyingi request
    qisqa muddat eski JSON holatini o‘qib qolishi mumkin.

    Shu sabab:
      - test topilmaganda;
      - yoki serverdagi questions.length frontend yuborgan startIndex'dan
        kichik bo‘lganda
    Blob qayta o‘qiladi.
  */
  let tests: TestData[] = [];
  let index = -1;
  let existing: unknown[] = [];

  for (let attempt = 0; attempt < 10; attempt++) {
    tests = await readTests();

    index = tests.findIndex(
      (item) =>
        item.id === testId
    );

    if (index >= 0) {
      const candidate =
        Array.isArray(
          tests[index].questions
        )
          ? tests[index].questions as unknown[]
          : [];

      existing = candidate;

      /*
        Aynan kerakli startIndex ko‘rinsa — yozishga tayyor.
      */
      if (
        existing.length ===
        startIndex
      ) {
        break;
      }

      /*
        Server startIndex'dan oldinga o‘tib ketgan bo‘lsa, bu ko‘pincha
        browser bir xil chunkni qayta yuborganini anglatadi.
        Shu chunk allaqachon saqlangan deb idempotent javob qaytaramiz.
      */
      if (
        existing.length >=
        startIndex + chunk.length
      ) {
        const expectedQuestions =
          Number(
            tests[index].importState
              ?.expectedQuestions
          ) || existing.length;

        return NextResponse.json(
          {
            success: true,
            duplicate: true,
            testId,
            receivedQuestions:
              existing.length,
            expectedQuestions,
            remaining:
              Math.max(
                0,
                expectedQuestions -
                  existing.length
              ),
          },
          {
            status: 200,
          }
        );
      }
    }

    /*
      Hali oldingi chunk ko‘rinmagan.
      Biroz kutib Blob'ni qayta o‘qiymiz.
    */
    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          250 * (attempt + 1)
        )
    );
  }

  if (index < 0) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Test yaratildi, ammo Blob'dan qayta o‘qishda topilmadi.",
      },
      {
        status: 404,
      }
    );
  }

  /*
    Retrylardan keyin ham serverdagi uzunlik startIndex bilan teng
    bo‘lmasa, ma'lumotni buzmaslik uchun yozmaymiz.
  */
  if (
    existing.length !==
    startIndex
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          `Savollar ketma-ketligi mos emas. Server ${existing.length}-savoldan davom etishni kutmoqda, brauzer esa ${startIndex}-savoldan yubordi.`,
        expectedStartIndex:
          existing.length,
        receivedStartIndex:
          startIndex,
      },
      {
        status: 409,
      }
    );
  }

  const test =
    tests[index];

  const expectedQuestions =
    Number(
      test.importState
        ?.expectedQuestions
    ) ||
    (
      startIndex +
      chunk.length
    );

  /*
    Kutilgan umumiy savollar sonidan oshib ketishiga yo‘l qo‘ymaymiz.
  */
  if (
    startIndex +
      chunk.length >
    expectedQuestions
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          `Savollar soni kutilgan miqdordan oshib ketmoqda: ${startIndex + chunk.length}/${expectedQuestions}.`,
      },
      {
        status: 400,
      }
    );
  }

  const updatedQuestions = [
    ...existing,
    ...chunk,
  ];

  const now =
    new Date().toISOString();

  tests[index] = {
    ...test,

    questions:
      updatedQuestions,

    importState: {
      mode: "chunked",

      expectedQuestions,

      receivedQuestions:
        updatedQuestions.length,

      completed: false,
    },

    updatedAt: now,
  };

  await writeTests(
    tests
  );

  return NextResponse.json(
    {
      success: true,

      testId,

      receivedQuestions:
        updatedQuestions.length,

      expectedQuestions,

      remaining:
        Math.max(
          0,
          expectedQuestions -
            updatedQuestions.length
        ),
    },
    {
      status: 200,
    }
  );
}

/* =========================================================
   FINALIZE CHUNKED TEST
========================================================= */

async function finalizeChunkedTest(
  body: any
) {
  const testId =
    String(
      body?.testId || ""
    ).trim();

  if (!testId) {
    return NextResponse.json(
      {
        success: false,
        message:
          "testId topilmadi.",
      },
      {
        status: 400,
      }
    );
  }

  let tests: TestData[] = [];
  let index = -1;

  /*
    Oxirgi chunk yozilgandan keyin finalize juda tez kelishi mumkin.
    Shuning uchun yakuniy holat ko‘ringuncha Blob'ni qayta o‘qiymiz.
  */
  for (let attempt = 0; attempt < 10; attempt++) {
    tests = await readTests();

    index = tests.findIndex(
      (item) =>
        item.id === testId
    );

    if (index >= 0) {
      const candidateQuestions: unknown[] =
        Array.isArray(
          tests[index].questions
        )
          ? (tests[index].questions as unknown[])
          : [];

      const candidateExpected =
        Number(
          tests[index].importState
            ?.expectedQuestions
        ) ||
        candidateQuestions.length;

      if (
        candidateQuestions.length ===
        candidateExpected
      ) {
        break;
      }
    }

    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          250 * (attempt + 1)
        )
    );
  }

  if (index < 0) {
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

  const test =
    tests[index];

  const questions =
    Array.isArray(
      test.questions
    )
      ? test.questions
      : [];

  const expectedQuestions =
    Number(
      test.importState
        ?.expectedQuestions
    ) ||
    questions.length;

  if (
    questions.length !==
    expectedQuestions
  ) {
    return NextResponse.json(
      {
        success: false,

        message:
          `Test hali to‘liq saqlanmagan. ${questions.length}/${expectedQuestions} ta savol serverda mavjud.`,

        receivedQuestions:
          questions.length,

        expectedQuestions,
      },
      {
        status: 409,
      }
    );
  }

  const now =
    new Date().toISOString();

  const finalStatus =
    normalizeStatus(
      body?.status
    );

  tests[index] = {
    ...test,

    status:
      finalStatus,

    importState: {
      mode: "chunked",

      expectedQuestions,

      receivedQuestions:
        questions.length,

      completed: true,
    },

    updatedAt: now,
  };

  await writeTests(
    tests
  );

  return NextResponse.json(
    {
      success: true,

      message:
        "Test to‘liq saqlandi.",

      test:
        tests[index],
    },
    {
      status: 200,
    }
  );
}

/* =========================================================
   LEGACY / NORMAL POST
========================================================= */

async function createNormalTest(
  body: any
) {
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

  const tests =
    await readTests();

  const now =
    new Date().toISOString();

  const newTest: TestData = {
    ...body,

    id:
      crypto.randomUUID(),

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
      normalizeStatus(
        body?.status
      ),

    attemptLimit:
      normalizeAttemptLimit(
        body?.attemptLimit
      ),

    createdAt: now,
    updatedAt: now,
  };

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

      test:
        newTest,
    },
    {
      status: 201,
    }
  );
}

/* =========================================================
   POST ROUTER
========================================================= */

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const action =
      String(
        body?.action || ""
      );

    if (
      action ===
      "create-chunked-test"
    ) {
      return await createChunkedTest(
        body
      );
    }

    if (
      action ===
      "append-questions"
    ) {
      return await appendQuestionsChunk(
        body
      );
    }

    if (
      action ===
      "finalize-chunked-test"
    ) {
      return await finalizeChunkedTest(
        body
      );
    }

    /*
      Eski test editor ishlashi uchun
      oddiy POST saqlanib qoladi.
    */
    return await createNormalTest(
      body
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
