import { cookies } from "next/headers";
import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  del,
  get,
  put,
} from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TESTS_BLOB_PATH =
  "huquqiy-sayt/tests.json";

/*
  YANGI TEZKOR SAQLASH:
  Har bir test alohida blob sifatida ham saqlanadi.

  Masalan:
  huquqiy-sayt/tests-by-id/abc-123.json

  Shunda /api/tests/[id] har safar ulkan tests.json ni
  to‘liq yuklab, JSON.parse qilib, find() qilishga majbur bo‘lmaydi.
*/
const TEST_BY_ID_DIR =
  "huquqiy-sayt/tests-by-id";

const MEMORY_TTL_MS =
  60_000;

type TestStatus =
  | "draft"
  | "published";

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
  attemptLimit?:
    | number
    | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

type MemoryItem = {
  test: TestData;
  expiresAt: number;
};

/*
  Bitta server instance ichida takroriy GETlarda
  Blobga ham qayta murojaat qilmaslik uchun.
*/
const memoryCache =
  new Map<
    string,
    MemoryItem
  >();

async function isAdmin() {
  const cookieStore =
    await cookies();

  return Boolean(
    cookieStore.get(
      "qurbonov_session"
    )?.value &&
      cookieStore.get(
        "qurbonov_role"
      )?.value === "admin"
  );
}

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

function normalizeTests(
  value: unknown
): TestData[] {
  if (
    !Array.isArray(value)
  ) {
    throw new Error(
      "tests.json formati noto‘g‘ri."
    );
  }

  return value as TestData[];
}

function testBlobPath(
  id: string
) {
  return `${TEST_BY_ID_DIR}/${encodeURIComponent(
    id
  )}.json`;
}

function putMemory(
  test: TestData
) {
  memoryCache.set(
    test.id,
    {
      test,
      expiresAt:
        Date.now() +
        MEMORY_TTL_MS,
    }
  );
}

function getMemory(
  id: string
) {
  const item =
    memoryCache.get(id);

  if (!item) {
    return null;
  }

  if (
    item.expiresAt <=
    Date.now()
  ) {
    memoryCache.delete(id);
    return null;
  }

  return item.test;
}

function removeMemory(
  id: string
) {
  memoryCache.delete(id);
}

/*
  Eski katta tests.json ni o‘qish.
  Bu endi faqat:
  1) individual blob hali yaratilmagan birinchi GETda;
  2) PUT/DELETE paytida umumiy tests.json ni sinxron saqlashda
  ishlatiladi.
*/
async function readTests(): Promise<
  TestData[]
> {
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
    result.statusCode !==
      200 ||
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

  return normalizeTests(
    JSON.parse(text)
  );
}

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
      addRandomSuffix:
        false,
      allowOverwrite: true,
      contentType:
        "application/json; charset=utf-8",
      cacheControlMaxAge:
        0,
    }
  );
}

/*
  Bitta testni alohida Blobga yozish.
*/
async function writeTestById(
  test: TestData
) {
  checkBlobToken();

  await put(
    testBlobPath(
      test.id
    ),
    JSON.stringify(test),
    {
      access: "private",
      addRandomSuffix:
        false,
      allowOverwrite: true,
      contentType:
        "application/json; charset=utf-8",

      /*
        Vercel Blob CDN keshi eski testni ushlab qolmasin.
        Biz yuqorida o‘zimiz memory cache boshqaryapmiz.
      */
      cacheControlMaxAge:
        0,
    }
  );

  putMemory(test);
}

/*
  Eng tez o‘qish tartibi:

  1. RAM cache
  2. tests-by-id/<id>.json
  3. Faqat individual fayl yo‘q bo‘lsa eski tests.json
     va topilgan test uchun individual faylni avtomatik yaratish.

  Bu usul eski testlarni migratsiya qilmasdan ham ishlaydi:
  test birinchi marta ochilganda o‘zi tezkor formatga ko‘chadi.
*/
async function readTestFast(
  id: string
): Promise<TestData | null> {
  const memory =
    getMemory(id);

  if (memory) {
    return memory;
  }

  checkBlobToken();

  try {
    const result =
      await get(
        testBlobPath(id),
        {
          access:
            "private",
        }
      );

    if (
      result &&
      result.statusCode ===
        200 &&
      result.stream
    ) {
      const text =
        await new Response(
          result.stream
        ).text();

      if (text.trim()) {
        const parsed =
          JSON.parse(
            text
          ) as TestData;

        if (
          parsed &&
          parsed.id === id
        ) {
          putMemory(parsed);
          return parsed;
        }
      }
    }
  } catch (error) {
    /*
      Individual Blob hali yo‘q bo‘lishi mumkin.
      Buni fatal xato deb hisoblamaymiz,
      eski tests.json fallbackga o‘tamiz.
    */
    console.warn(
      `Individual test blob o‘qilmadi (${id}), fallback tests.json:`,
      error
    );
  }

  const tests =
    await readTests();

  const test =
    tests.find(
      (item) =>
        item.id === id
    ) || null;

  if (!test) {
    return null;
  }

  /*
    Birinchi sekin GETdan keyin shu test uchun
    alohida tezkor fayl yaratamiz.
    Bu yozish xatosi testni ochishga halaqit bermasin.
  */
  try {
    await writeTestById(
      test
    );
  } catch (error) {
    console.warn(
      `Individual test blob yaratilmadi (${id}):`,
      error
    );

    putMemory(test);
  }

  return test;
}

async function removeTestByIdBlob(
  id: string
) {
  removeMemory(id);

  try {
    await del(
      testBlobPath(id)
    );
  } catch (error) {
    /*
      Individual fayl bo‘lmasa DELETE baribir muvaffaqiyatli
      hisoblanishi kerak.
    */
    console.warn(
      `Individual test blob o‘chirilmadi (${id}):`,
      error
    );
  }
}

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
      params?.id || ""
    )
  ).trim();
}

export async function GET(
  _request: NextRequest,
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
            "Test ID topilmadi.",
        },
        {
          status: 400,
        }
      );
    }

    const test =
      await readTestFast(
        id
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
      Qoralamani oddiy foydalanuvchi IDni bilib olib
      ochib ketmasligi kerak.
      Admin esa qoralamani tahrirlash uchun ko‘ra oladi.
    */
    if (
      test.status !==
        "published" &&
      !(await isAdmin())
    ) {
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

    const admin =
      await isAdmin();

    return NextResponse.json(
      {
        success: true,
        test,
      },
      {
        status: 200,
        headers: {
          /*
            Admin uchun hech qanday browser cache yo‘q.
            Published test foydalanuvchida 15 soniya turishi mumkin.
            Asosiy tezlik baribir individual Blob + memory cache dan keladi.
          */
          "Cache-Control":
            admin
              ? "no-store, no-cache, must-revalidate"
              : "private, max-age=15, stale-while-revalidate=30",
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
          error instanceof
          Error
            ? error.message
            : "Testni yuklashda server xatosi.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    if (
      !(await isAdmin())
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bu amal faqat administrator uchun.",
        },
        {
          status: 403,
        }
      );
    }

    const id =
      await getId(context);

    if (!id) {
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

    const body =
      await request.json();

    /*
      PUTda umumiy tests.json hali source-of-truth bo‘lib qoladi.
      Shuning uchun eski admin/import tizimlari buzilmaydi.
    */
    const tests =
      await readTests();

    const index =
      tests.findIndex(
        (item) =>
          item.id === id
      );

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

    const current =
      tests[index];

    const requestedStatus: TestStatus =
      body?.status ===
      "published"
        ? "published"
        : body?.status ===
          "draft"
        ? "draft"
        : current.status ===
          "published"
        ? "published"
        : "draft";

    const nextQuestions =
      Array.isArray(
        body?.questions
      )
        ? body.questions
        : Array.isArray(
            current.questions
          )
        ? current.questions
        : [];

    if (
      requestedStatus ===
        "published" &&
      nextQuestions.length ===
        0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Savolsiz testni e’lon qilib bo‘lmaydi.",
        },
        {
          status: 400,
        }
      );
    }

    const now =
      new Date().toISOString();

    const updatedTest: TestData =
      {
        ...current,
        ...body,

        /*
          ID clientdan o‘zgartirib yuborilmaydi.
        */
        id: current.id,

        questions:
          nextQuestions,

        status:
          requestedStatus,

        createdAt:
          current.createdAt ||
          String(
            body?.createdAt ||
              now
          ),

        updatedAt: now,
      };

    tests[index] =
      updatedTest;

    /*
      Avval source-of-truth tests.json,
      keyin tezkor individual test.
    */
    await writeTests(tests);

    try {
      await writeTestById(
        updatedTest
      );
    } catch (error) {
      /*
        Asosiy tests.json allaqachon saqlandi.
        Individual tezkor nusxa yozilmasa PUTni yiqitmaymiz;
        keyingi GET tests.jsondan topib uni qayta yaratadi.
      */
      console.error(
        `Individual test blob yangilanmadi (${id}):`,
        error
      );

      removeMemory(id);
    }

    return NextResponse.json(
      {
        success: true,
        message:
          requestedStatus ===
          "published"
            ? "Test muvaffaqiyatli e’lon qilindi."
            : "Test qoralama holatida saqlandi.",
        test: updatedTest,
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
      "PUT /api/tests/[id] ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof
          Error
            ? error.message
            : "Testni yangilashda server xatosi.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    if (
      !(await isAdmin())
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bu amal faqat administrator uchun.",
        },
        {
          status: 403,
        }
      );
    }

    const id =
      await getId(context);

    if (!id) {
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

    const tests =
      await readTests();

    const index =
      tests.findIndex(
        (item) =>
          item.id === id
      );

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

    const deletedTest =
      tests[index];

    const nextTests =
      tests.filter(
        (item) =>
          item.id !== id
      );

    await writeTests(
      nextTests
    );

    await removeTestByIdBlob(
      id
    );

    return NextResponse.json(
      {
        success: true,
        message:
          "Test o‘chirildi.",
        test: deletedTest,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store",
        },
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
          error instanceof
          Error
            ? error.message
            : "Testni o‘chirishda server xatosi.",
      },
      {
        status: 500,
      }
    );
  }
}
