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

/*
  Eski tests.json faqat birinchi migratsiya uchun o‘qiladi.
  Endi unga HECH QACHON yozilmaydi.
*/
const LEGACY_TESTS_FILE = path.join(
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

type StoreData = {
  tests: TestData[];
  etag?: string;
};

/* =========================================================
   HELPERS
========================================================= */

function normalizeTests(value: unknown): TestData[] {
  return Array.isArray(value)
    ? (value as TestData[])
    : [];
}

function readLegacyTests(): TestData[] {
  try {
    if (!fs.existsSync(LEGACY_TESTS_FILE)) {
      return [];
    }

    const content = fs.readFileSync(
      LEGACY_TESTS_FILE,
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
      "LEGACY tests.json O‘QISH XATOSI:",
      error
    );

    return [];
  }
}

/* =========================================================
   BLOBGA YOZISH
========================================================= */

async function writeTests(
  tests: TestData[],
  etag?: string
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
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType:
        "application/json; charset=utf-8",
      cacheControlMaxAge: 60,

      /*
        Agar biz o‘qiganimizdan keyin boshqa request
        faylni o‘zgartirgan bo‘lsa, tasodifan ustidan
        yozib yubormaslik uchun.
      */
      ...(etag
        ? {
            ifMatch: etag,
          }
        : {}),
    }
  );
}

/* =========================================================
   BLOB'DAN O‘QISH
========================================================= */

async function readTests(): Promise<StoreData> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN topilmadi."
    );
  }

  const result = await get(
    BLOB_PATH,
    {
      access: "private",
    }
  );

  /*
    Blob hali mavjud bo‘lmasa:
    GitHub/Verceldagi eski tests.json ni bir marta
    Blob'ga ko‘chiramiz.
  */
  if (!result) {
    const legacyTests =
      readLegacyTests();

    await writeTests(
      legacyTests
    );

    return {
      tests: legacyTests,
    };
  }

  if (
    result.statusCode !== 200 ||
    !result.stream
  ) {
    throw new Error(
      `Blob o‘qilmadi. Status: ${result.statusCode}`
    );
  }

  const text =
    await new Response(
      result.stream
    ).text();

  const tests = text.trim()
    ? normalizeTests(
        JSON.parse(text)
      )
    : [];

  return {
    tests,
    etag: result.blob.etag,
  };
}

/* =========================================================
   PARAMS ID
========================================================= */

async function getId(
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const params =
    await context.params;

  return decodeURIComponent(
    String(
      params.id || ""
    )
  ).trim();
}

/* =========================================================
   GET
   BITTA TESTNI OLISH
========================================================= */

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const id =
      await getId(context);

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Test ID berilmagan.",
        },
        {
          status: 400,
        }
      );
    }

    const { tests } =
      await readTests();

    const test =
      tests.find(
        (item) =>
          String(item.id) ===
          String(id)
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

    return NextResponse.json(
      {
        success: true,
        test,
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
      "GET /api/tests/[id] ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Testni yuklashda server xatosi yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   PUT
   TESTNI TO‘LIQ TAHRIRLASH
========================================================= */

export async function PUT(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const id =
      await getId(context);

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Test ID berilmagan.",
        },
        {
          status: 400,
        }
      );
    }

    const body =
      await request.json();

    const {
      tests,
      etag,
    } = await readTests();

    const index =
      tests.findIndex(
        (item) =>
          String(item.id) ===
          String(id)
      );

    if (index === -1) {
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

    const oldTest =
      tests[index];

    const title =
      String(
        body?.title ??
          oldTest.title ??
          ""
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
        : Array.isArray(
            oldTest.questions
          )
        ? oldTest.questions
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

    const updatedTest: TestData = {
      ...oldTest,
      ...body,

      /*
        ID o‘zgarmaydi.
      */
      id: oldTest.id,

      title,

      subject: String(
        body?.subject ??
          oldTest.subject ??
          ""
      ).trim(),

      duration: Math.max(
        1,
        Number(
          body?.duration ??
            oldTest.duration
        ) || 30
      ),

      description:
        String(
          body?.description ??
            oldTest.description ??
            ""
        ),

      questions,

      status:
        body?.status ===
        "published"
          ? "published"
          : body?.status ===
            "draft"
          ? "draft"
          : oldTest.status ||
            "draft",

      createdAt:
        oldTest.createdAt ||
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString(),
    };

    tests[index] =
      updatedTest;

    await writeTests(
      tests,
      etag
    );

    return NextResponse.json(
      {
        success: true,
        message:
          "Test muvaffaqiyatli yangilandi.",
        test: updatedTest,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "PUT /api/tests/[id] ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Testni yangilashda server xatosi yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   PATCH
   FAQAT KERAKLI MAYDONLARNI O‘ZGARTIRISH
========================================================= */

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const id =
      await getId(context);

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Test ID berilmagan.",
        },
        {
          status: 400,
        }
      );
    }

    const body =
      await request.json();

    const {
      tests,
      etag,
    } = await readTests();

    const index =
      tests.findIndex(
        (item) =>
          String(item.id) ===
          String(id)
      );

    if (index === -1) {
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

    const oldTest =
      tests[index];

    const updatedTest: TestData = {
      ...oldTest,
      ...body,

      id: oldTest.id,

      createdAt:
        oldTest.createdAt,

      updatedAt:
        new Date().toISOString(),
    };

    tests[index] =
      updatedTest;

    await writeTests(
      tests,
      etag
    );

    return NextResponse.json(
      {
        success: true,
        message:
          "Test yangilandi.",
        test: updatedTest,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "PATCH /api/tests/[id] ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Testni yangilashda xatolik yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   DELETE
   TESTNI BUTUNLAY O‘CHIRISH
========================================================= */

export async function DELETE(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const id =
      await getId(context);

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Test ID berilmagan.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      tests,
      etag,
    } = await readTests();

    const exists =
      tests.some(
        (item) =>
          String(item.id) ===
          String(id)
      );

    if (!exists) {
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

    const remainingTests =
      tests.filter(
        (item) =>
          String(item.id) !==
          String(id)
      );

    await writeTests(
      remainingTests,
      etag
    );

    return NextResponse.json(
      {
        success: true,
        message:
          "Test butunlay o‘chirildi.",
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "DELETE /api/tests/[id] ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Testni o‘chirishda server xatosi yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}
