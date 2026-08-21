import { NextRequest, NextResponse } from "next/server";
import { get, put } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESULTS_BLOB_PATH =
  "huquqiy-sayt/test-results.json";

/* =========================================================
   TYPES
========================================================= */

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
   ADMIN TEKSHIRISH
========================================================= */

function adminAllowed(
  request: NextRequest
) {
  const session =
    request.cookies.get(
      "qurbonov_session"
    )?.value;

  const role =
    request.cookies.get(
      "qurbonov_role"
    )?.value;

  return Boolean(session) &&
    role === "admin";
}

/* =========================================================
   BLOB'DAN NATIJALARNI O‘QISH
========================================================= */

async function readResults(): Promise<TestResult[]> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN topilmadi."
    );
  }

  try {
    const result = await get(
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
    console.error(
      "ADMIN RESULT BLOB READ ERROR:",
      error
    );

    return [];
  }
}

/* =========================================================
   BLOB'GA NATIJALARNI YOZISH
========================================================= */

async function writeResults(
  results: TestResult[]
) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN topilmadi."
    );
  }

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
   GET
   BARCHA NATIJALARNI OLISH
========================================================= */

export async function GET(
  request: NextRequest
) {
  try {
    if (
      !adminAllowed(request)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Administrator huquqi talab qilinadi.",
        },
        {
          status: 403,
        }
      );
    }

    const results =
      await readResults();

    /*
      Eng yangi natija tepada.
    */

    const sortedResults =
      [...results].sort(
        (a, b) => {
          const aTime =
            new Date(
              a.finishedAt
            ).getTime() || 0;

          const bTime =
            new Date(
              b.finishedAt
            ).getTime() || 0;

          return bTime - aTime;
        }
      );

    return NextResponse.json(
      {
        success: true,
        count:
          sortedResults.length,
        results:
          sortedResults,
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
      "ADMIN RESULTS GET ERROR:",
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

/* =========================================================
   DELETE
========================================================= */

export async function DELETE(
  request: NextRequest
) {
  try {
    if (
      !adminAllowed(request)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Administrator huquqi talab qilinadi.",
        },
        {
          status: 403,
        }
      );
    }

    const url =
      new URL(request.url);

    const id =
      String(
        url.searchParams.get(
          "id"
        ) || ""
      ).trim();

    const deleteAll =
      url.searchParams.get(
        "all"
      ) === "1";

    /* =====================================================
       HAMMASINI O‘CHIRISH
    ===================================================== */

    if (deleteAll) {
      await writeResults([]);

      return NextResponse.json(
        {
          success: true,
          message:
            "Barcha natijalar o‘chirildi.",
        },
        {
          status: 200,
        }
      );
    }

    /* =====================================================
       BITTA NATIJANI O‘CHIRISH
    ===================================================== */

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Natija ID topilmadi.",
        },
        {
          status: 400,
        }
      );
    }

    const results =
      await readResults();

    const exists =
      results.some(
        (item) =>
          String(item.id) ===
          String(id)
      );

    if (!exists) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Natija topilmadi.",
        },
        {
          status: 404,
        }
      );
    }

    const nextResults =
      results.filter(
        (item) =>
          String(item.id) !==
          String(id)
      );

    await writeResults(
      nextResults
    );

    return NextResponse.json(
      {
        success: true,
        message:
          "Natija o‘chirildi.",
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "ADMIN RESULT DELETE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Natijani o‘chirishda server xatosi.",
      },
      {
        status: 500,
      }
    );
  }
}
