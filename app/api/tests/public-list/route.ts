import {
  NextResponse,
} from "next/server";
import { get } from "@vercel/blob";
import { unstable_cache } from "next/cache";

export const runtime = "nodejs";

/*
  MUHIM:
  Bu endpoint foydalanuvchiga savollarni YUBORMAYDI.
  /api/tests esa butun tests.json va barcha questions ni yuborishi mumkin.
  Katta test bazasida bu juda og‘ir.

  Bu endpoint faqat test kartasi uchun kerakli metadata qaytaradi.
*/

const TESTS_BLOB_PATH =
  "huquqiy-sayt/tests.json";

type TestStatus =
  | "draft"
  | "published";

type TestCategory =
  | "legislation"
  | "thematic"
  | "block"
  | "national-certificate"
  | "thirty"
  | "custom";

type StoredTest = {
  id?: string;
  title?: string;
  subject?: string;
  duration?: number;
  description?: string;
  status?: TestStatus;
  testType?: string;
  customTestTypeName?: string;
  attemptLimit?: number | null;
  questions?: unknown[];
  createdAt?: string;
  updatedAt?: string;
  importState?: {
    expectedQuestions?: number;
    receivedQuestions?: number;
    completed?: boolean;
  };
};

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

function normalizeTestType(
  test: StoredTest
): TestCategory {
  const value =
    String(
      test.testType || ""
    ).trim();

  if (
    value === "legislation" ||
    value === "thematic" ||
    value === "block" ||
    value ===
      "national-certificate" ||
    value === "thirty" ||
    value === "custom"
  ) {
    return value;
  }

  /*
    Eski testlarda testType bo‘lmasa:
    nomi va savollar sonidan ehtiyotkor fallback.
  */
  const title =
    String(
      test.title || ""
    ).toLowerCase();

  if (
    title.includes(
      "milliy sertifikat"
    )
  ) {
    return "national-certificate";
  }

  if (
    title.includes(
      "mavzulashtiril"
    )
  ) {
    return "thematic";
  }

  if (
    title.includes("blok")
  ) {
    return "block";
  }

  if (
    title.includes("30") &&
    Array.isArray(
      test.questions
    ) &&
    test.questions.length ===
      30
  ) {
    return "thirty";
  }

  return "legislation";
}

async function readPublishedList() {
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
      "tests.json o‘qilmadi."
    );
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

  const tests: StoredTest[] =
    Array.isArray(parsed)
      ? parsed
      : [];

  return tests
    .filter(
      (test) =>
        test.status ===
        "published" &&
        Boolean(test.id)
    )
    .map((test) => ({
      id: String(test.id),
      title:
        String(
          test.title ||
            "Nomsiz test"
        ),
      subject:
        String(
          test.subject || ""
        ),
      description:
        String(
          test.description || ""
        ),
      duration:
        Math.max(
          1,
          Number(
            test.duration
          ) || 30
        ),
      testType:
        normalizeTestType(
          test
        ),
      customTestTypeName:
        String(
          test.customTestTypeName ||
            ""
        ),
      questionCount:
        Array.isArray(
          test.questions
        )
          ? test.questions.length
          : Math.max(
              0,
              Number(
                test.importState
                  ?.receivedQuestions
              ) || 0
            ),
      attemptLimit:
        test.attemptLimit ??
        null,
      updatedAt:
        test.updatedAt ||
        test.createdAt ||
        "",
    }))
    .sort((a, b) => {
      const aTime =
        new Date(
          a.updatedAt || ""
        ).getTime() || 0;

      const bTime =
        new Date(
          b.updatedAt || ""
        ).getTime() || 0;

      return bTime - aTime;
    });
}

/*
  60 soniyalik server cache:
  foydalanuvchi har safar /test ga kirganda katta tests.json ni
  qayta-qayta Blobdan o‘qimaslik uchun.
*/
const getCachedPublishedList =
  unstable_cache(
    readPublishedList,
    [
      "public-test-list-v1",
    ],
    {
      revalidate: 60,
      tags: [
        "public-test-list",
      ],
    }
  );

export async function GET() {
  try {
    const tests =
      await getCachedPublishedList();

    return NextResponse.json(
      {
        success: true,
        tests,
      },
      {
        status: 200,
        headers: {
          /*
            Brauzer/CDN ham qisqa muddat saqlashi mumkin.
          */
          "Cache-Control":
            "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error(
      "GET /api/tests/public-list ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Testlar ro‘yxatini yuklab bo‘lmadi.",
        tests: [],
      },
      {
        status: 500,
      }
    );
  }
}

