import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIRECTORY = path.join(
  process.cwd(),
  "data-storage"
);

const TESTS_FILE = path.join(
  DATA_DIRECTORY,
  "tests.json"
);

/* =========================================================
   TYPES
========================================================= */

type TestData = {
  id: string;
  title?: string;
  subject?: string;
  duration?: number;
  description?: string;
  status?: "draft" | "published";
  questions?: unknown[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

/* =========================================================
   PAPKA VA FAYLNI TEKSHIRISH
========================================================= */

function ensureStorage() {
  if (!fs.existsSync(DATA_DIRECTORY)) {
    fs.mkdirSync(DATA_DIRECTORY, {
      recursive: true,
    });
  }

  if (!fs.existsSync(TESTS_FILE)) {
    fs.writeFileSync(
      TESTS_FILE,
      JSON.stringify([], null, 2),
      "utf-8"
    );
  }
}

/* =========================================================
   TESTLARNI O'QISH
========================================================= */

function readTests(): TestData[] {
  ensureStorage();

  try {
    const content = fs.readFileSync(
      TESTS_FILE,
      "utf-8"
    );

    if (!content.trim()) {
      return [];
    }

    const parsed = JSON.parse(content);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch (error) {
    console.error(
      "tests.json o‘qish xatosi:",
      error
    );

    return [];
  }
}

/* =========================================================
   TESTLARNI YOZISH
========================================================= */

function writeTests(tests: TestData[]) {
  ensureStorage();

  fs.writeFileSync(
    TESTS_FILE,
    JSON.stringify(tests, null, 2),
    "utf-8"
  );
}

/* =========================================================
   PARAMS ID
========================================================= */

async function getId(
  context: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await context.params;

  return decodeURIComponent(
    String(params.id || "")
  ).trim();
}

/* =========================================================
   GET
   BITTA TESTNI OLISH
========================================================= */

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const id = await getId(context);

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Test ID berilmagan.",
        },
        {
          status: 400,
        }
      );
    }

    const tests = readTests();

    const test = tests.find(
      (item) =>
        String(item.id) === String(id)
    );

    if (!test) {
      console.log(
        "TEST TOPILMADI. ID:",
        id
      );

      console.log(
        "MAVJUD ID LAR:",
        tests.map((item) => item.id)
      );

      return NextResponse.json(
        {
          success: false,
          message: "Test topilmadi.",
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
   TESTNI TAHRIRLASH
========================================================= */

export async function PUT(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const id = await getId(context);

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Test ID berilmagan.",
        },
        {
          status: 400,
        }
      );
    }

    const body = await request.json();

    const tests = readTests();

    const index = tests.findIndex(
      (item) =>
        String(item.id) === String(id)
    );

    if (index === -1) {
      return NextResponse.json(
        {
          success: false,
          message: "Test topilmadi.",
        },
        {
          status: 404,
        }
      );
    }

    const oldTest = tests[index];

    const updatedTest: TestData = {
      ...oldTest,
      ...body,

      /*
        ID ni client o'zgartira olmaydi.
      */

      id: oldTest.id,

      createdAt:
        oldTest.createdAt ||
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString(),
    };

    tests[index] = updatedTest;

    writeTests(tests);

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
   FAQAT AYRIM MAYDONLARNI O'ZGARTIRISH
========================================================= */

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const id = await getId(context);

    const body = await request.json();

    const tests = readTests();

    const index = tests.findIndex(
      (item) =>
        String(item.id) === String(id)
    );

    if (index === -1) {
      return NextResponse.json(
        {
          success: false,
          message: "Test topilmadi.",
        },
        {
          status: 404,
        }
      );
    }

    const oldTest = tests[index];

    const updatedTest: TestData = {
      ...oldTest,
      ...body,

      id: oldTest.id,

      updatedAt:
        new Date().toISOString(),
    };

    tests[index] = updatedTest;

    writeTests(tests);

    return NextResponse.json({
      success: true,
      message: "Test yangilandi.",
      test: updatedTest,
    });
  } catch (error) {
    console.error(
      "PATCH /api/tests/[id] ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Testni yangilashda xatolik.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   DELETE
   TESTNI BUTUNLAY O'CHIRISH
========================================================= */

export async function DELETE(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const id = await getId(context);

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Test ID berilmagan.",
        },
        {
          status: 400,
        }
      );
    }

    const tests = readTests();

    const testExists = tests.some(
      (item) =>
        String(item.id) === String(id)
    );

    if (!testExists) {
      return NextResponse.json(
        {
          success: false,
          message: "Test topilmadi.",
        },
        {
          status: 404,
        }
      );
    }

    const remainingTests =
      tests.filter(
        (item) =>
          String(item.id) !== String(id)
      );

    writeTests(remainingTests);

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