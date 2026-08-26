import { NextRequest, NextResponse } from "next/server";
import { del, get, list, put } from "@vercel/blob";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const TESTS_BLOB_PATH = "huquqiy-sayt/tests.json";

const IMPORT_ROOT = "huquqiy-sayt/test-imports";

function importMetaPath(testId: string) {
  return `${IMPORT_ROOT}/${testId}/meta.json`;
}

function importChunkPath(testId: string, startIndex: number) {
  return `${IMPORT_ROOT}/${testId}/chunks/${String(startIndex).padStart(8, "0")}.json`;
}

function importChunkPrefix(testId: string) {
  return `${IMPORT_ROOT}/${testId}/chunks/`;
}

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

  /*
    MUHIM ARXITEKTURA:
    Import metama'lumoti UNIQUE blob path'ga yoziladi.
    Bu fayl overwrite qilinmaydi, shuning uchun Vercel Blob stale-read
    muammosi chunklar orasida paydo bo‘lmaydi.
  */
  await put(
    importMetaPath(id),
    JSON.stringify(newTest),
    {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType:
        "application/json; charset=utf-8",
      cacheControlMaxAge: 0,
    }
  );

  /*
    Admin ro‘yxatida qoralama darhol ko‘rinishi uchun placeholderni
    tests.json'ga ham yozishga harakat qilamiz. Keyingi chunklar esa
    tests.json'ni qayta-qayta overwrite QILMAYDI.
  */
  const tests =
    await readTests();

  tests.push(newTest);

  await writeTests(tests);

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
   Har bir chunk alohida UNIQUE blob faylga yoziladi.
   Shu sabab 0 -> 10 -> 20 -> ... ketma-ketligida tests.json'ni
   qayta-qayta o‘qish/yozish shart emas.
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
    Meta UNIQUE path'da. Bu yerda tests.json'ga qaramaymiz.
  */
  const metaResult =
    await get(
      importMetaPath(testId),
      {
        access: "private",
      }
    );

  if (
    !metaResult ||
    metaResult.statusCode !== 200 ||
    !metaResult.stream
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Import metama’lumoti topilmadi.",
      },
      {
        status: 404,
      }
    );
  }

  const metaText =
    await new Response(
      metaResult.stream
    ).text();

  const meta =
    JSON.parse(metaText) as TestData;

  const expectedQuestions =
    Number(
      meta.importState
        ?.expectedQuestions
    ) || 0;

  if (
    startIndex +
      chunk.length >
    expectedQuestions
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          `Savollar soni kutilgan miqdordan oshmoqda: ${startIndex + chunk.length}/${expectedQuestions}.`,
      },
      {
        status: 400,
      }
    );
  }

  const chunkPayload = {
    testId,
    startIndex,
    count: chunk.length,
    questions: chunk,
    createdAt:
      new Date().toISOString(),
  };

  /*
    Bir xil startIndex qayta yuborilsa shu fayl overwrite bo‘ladi.
    Demak append idempotent — savollar dublikat bo‘lib ketmaydi.
  */
  await put(
    importChunkPath(
      testId,
      startIndex
    ),
    JSON.stringify(
      chunkPayload
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

  return NextResponse.json(
    {
      success: true,
      testId,
      receivedQuestions:
        Math.min(
          expectedQuestions,
          startIndex +
            chunk.length
        ),
      expectedQuestions,
      remaining:
        Math.max(
          0,
          expectedQuestions -
            (
              startIndex +
              chunk.length
            )
        ),
    },
    {
      status: 200,
    }
  );
}

/* =========================================================
   FINALIZE CHUNKED TEST
   Barcha UNIQUE chunk bloblarini yig‘ib, faqat SHU YERDA tests.json'ga
   to‘liq testni bir marta yozamiz.
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

  const metaResult =
    await get(
      importMetaPath(testId),
      {
        access: "private",
      }
    );

  if (
    !metaResult ||
    metaResult.statusCode !== 200 ||
    !metaResult.stream
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Import metama’lumoti topilmadi.",
      },
      {
        status: 404,
      }
    );
  }

  const metaText =
    await new Response(
      metaResult.stream
    ).text();

  const meta =
    JSON.parse(metaText) as TestData;

  const expectedQuestions =
    Number(
      meta.importState
        ?.expectedQuestions
    ) || 0;

  /*
    list() yangi yaratilgan alohida chunk bloblarini topadi.
    840 ta savol 10 tadan bo‘lsa taxminan 84 ta chunk — limitdan ancha kam.
  */
  const listed =
    await list({
      prefix:
        importChunkPrefix(
          testId
        ),
      limit: 1000,
    });

  const chunkBlobs =
    [...listed.blobs].sort(
      (a, b) =>
        a.pathname.localeCompare(
          b.pathname
        )
    );

  if (
    chunkBlobs.length === 0
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Birorta savol bo‘lagi topilmadi.",
      },
      {
        status: 409,
      }
    );
  }

  const chunkRows: {
    startIndex: number;
    questions: unknown[];
  }[] = [];

  for (const blob of chunkBlobs) {
    const chunkResult =
      await get(
        blob.pathname,
        {
          access: "private",
        }
      );

    if (
      !chunkResult ||
      chunkResult.statusCode !== 200 ||
      !chunkResult.stream
    ) {
      continue;
    }

    const chunkText =
      await new Response(
        chunkResult.stream
      ).text();

    const parsed =
      JSON.parse(chunkText);

    const startIndex =
      Number(
        parsed?.startIndex
      );

    const questions =
      Array.isArray(
        parsed?.questions
      )
        ? parsed.questions
        : [];

    if (
      Number.isInteger(
        startIndex
      ) &&
      startIndex >= 0 &&
      questions.length > 0
    ) {
      chunkRows.push({
        startIndex,
        questions,
      });
    }
  }

  chunkRows.sort(
    (a, b) =>
      a.startIndex -
      b.startIndex
  );

  const assembled: unknown[] = [];
  let expectedStart = 0;

  for (const row of chunkRows) {
    if (
      row.startIndex !==
      expectedStart
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            `Savol bo‘laklarida uzilish bor. Server ${expectedStart}-savoldan boshlanuvchi bo‘lakni kutmoqda, ammo ${row.startIndex}-savoldan boshlanuvchi bo‘lak topildi.`,
          expectedStartIndex:
            expectedStart,
          foundStartIndex:
            row.startIndex,
        },
        {
          status: 409,
        }
      );
    }

    assembled.push(
      ...row.questions
    );

    expectedStart =
      assembled.length;
  }

  if (
    assembled.length !==
    expectedQuestions
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          `Test hali to‘liq saqlanmagan. ${assembled.length}/${expectedQuestions} ta savol chunklarda mavjud.`,
        receivedQuestions:
          assembled.length,
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

  const completedTest: TestData = {
    ...meta,
    questions: assembled,
    status: finalStatus,
    importState: {
      mode: "chunked",
      expectedQuestions,
      receivedQuestions:
        assembled.length,
      completed: true,
    },
    updatedAt: now,
  };

  /*
    tests.json'da placeholder topilsa update qilamiz;
    stale read sabab topilmasa ham testni yo‘qotmaymiz — qo‘shamiz.
  */
  const tests =
    await readTests();

  const index =
    tests.findIndex(
      (item) =>
        item.id === testId
    );

  if (index >= 0) {
    tests[index] =
      completedTest;
  } else {
    tests.push(
      completedTest
    );
  }

  await writeTests(tests);

  /*
    Vaqtinchalik chunklarni tozalash.
    Cleanup xato qilsa test saqlanishiga ta'sir qilmaydi.
  */
  try {
    const pathsToDelete = [
      importMetaPath(testId),
      ...chunkBlobs.map(
        (blob) =>
          blob.pathname
      ),
    ];

    if (
      pathsToDelete.length > 0
    ) {
      await del(
        pathsToDelete
      );
    }
  } catch (cleanupError) {
    console.warn(
      "TEMP IMPORT CLEANUP ERROR:",
      cleanupError
    );
  }

  return NextResponse.json(
    {
      success: true,
      message:
        "Test to‘liq saqlandi.",
      test:
        completedTest,
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
