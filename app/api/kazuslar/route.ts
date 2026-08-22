import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  del,
  get,
  list,
  put,
} from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* =========================================================
   TYPES
========================================================= */

type CaseQuestion = {
  id: string;
  question: string;
  answer: string;
};

type PlatformCase = {
  id: string;
  type: "platform";
  subject: string;
  title: string;
  caseText: string;
  questions: CaseQuestion[];
  createdAt: string;
  updatedAt: string;
};

type RawQuestion = {
  id?: unknown;
  question?: unknown;
  answer?: unknown;
};

type CreateCaseBody = {
  subject?: unknown;
  title?: unknown;
  caseText?: unknown;
  questions?: unknown;
};

type UpdateCaseBody = {
  id?: unknown;
  subject?: unknown;
  title?: unknown;
  caseText?: unknown;
  questions?: unknown;
};

type DeleteCaseBody = {
  id?: unknown;
};

type MeResponse = {
  role?: unknown;
};

/* =========================================================
   CONSTANTS
========================================================= */

const CASES_PREFIX =
  "huquqiy-sayt/kazuslar/";

const NO_CACHE_HEADERS = {
  "Cache-Control":
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

/* =========================================================
   COMMON HELPERS
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

function cleanText(
  value: unknown
) {
  return String(
    value ?? ""
  ).trim();
}

function createId() {
  const random =
    Math.random()
      .toString(36)
      .slice(2, 9);

  return (
    `${Date.now()}-${random}`
  );
}

function getCasePath(
  id: string
) {
  return (
    `${CASES_PREFIX}${id}.json`
  );
}

/* =========================================================
   ADMIN TEKSHIRISH

   Saytingizda /api/me allaqachon ishlayotgani uchun
   shu endpoint orqali cookie va rol tekshiriladi.
========================================================= */

async function requireAdmin(
  request: NextRequest
) {
  const cookie =
    request.headers.get(
      "cookie"
    ) ?? "";

  const meUrl =
    new URL(
      "/api/me",
      request.url
    );

  const response =
    await fetch(
      meUrl,
      {
        method: "GET",
        headers: {
          cookie,
        },
        cache: "no-store",
      }
    );

  if (
    response.status ===
    401
  ) {
    return {
      ok: false as const,
      status: 401,
      message:
        "Avval tizimga kiring.",
    };
  }

  if (
    !response.ok
  ) {
    return {
      ok: false as const,
      status: 500,
      message:
        "Foydalanuvchi rolini tekshirib bo‘lmadi.",
    };
  }

  const data =
    (await response.json()) as MeResponse;

  if (
    data.role !==
    "admin"
  ) {
    return {
      ok: false as const,
      status: 403,
      message:
        "Bu amal faqat administrator uchun.",
    };
  }

  return {
    ok: true as const,
  };
}

/* =========================================================
   QUESTION NORMALIZE
========================================================= */

function normalizeQuestions(
  value: unknown
): CaseQuestion[] {
  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  const result:
    CaseQuestion[] = [];

  for (
    const item of value
  ) {
    if (
      !item ||
      typeof item !==
        "object"
    ) {
      continue;
    }

    const raw =
      item as RawQuestion;

    const question =
      cleanText(
        raw.question
      );

    const answer =
      cleanText(
        raw.answer
      );

    if (
      !question ||
      !answer
    ) {
      continue;
    }

    result.push({
      id:
        cleanText(
          raw.id
        ) ||
        createId(),

      question,
      answer,
    });
  }

  return result;
}

/* =========================================================
   CASE NORMALIZE
========================================================= */

function normalizeCase(
  value: unknown
): PlatformCase | null {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return null;
  }

  const raw =
    value as Record<
      string,
      unknown
    >;

  const id =
    cleanText(raw.id);

  const subject =
    cleanText(
      raw.subject
    );

  const title =
    cleanText(
      raw.title
    );

  const caseText =
    cleanText(
      raw.caseText
    );

  const questions =
    normalizeQuestions(
      raw.questions
    );

  if (
    !id ||
    !subject ||
    !title ||
    !caseText ||
    questions.length === 0
  ) {
    return null;
  }

  return {
    id,
    type: "platform",
    subject,
    title,
    caseText,
    questions,

    createdAt:
      cleanText(
        raw.createdAt
      ),

    updatedAt:
      cleanText(
        raw.updatedAt
      ),
  };
}

/* =========================================================
   BLOB O‘QISH
========================================================= */

async function readCase(
  id: string
): Promise<
  PlatformCase | null
> {
  checkBlobToken();

  try {
    const result =
      await get(
        getCasePath(id),
        {
          access:
            "private",
        }
      );

    if (
      !result ||
      result.statusCode !==
        200 ||
      !result.stream
    ) {
      return null;
    }

    const text =
      await new Response(
        result.stream
      ).text();

    if (
      !text.trim()
    ) {
      return null;
    }

    const parsed:
      unknown =
      JSON.parse(text);

    return normalizeCase(
      parsed
    );
  } catch (error) {
    console.warn(
      `Kazus o‘qilmadi: ${id}`,
      error
    );

    return null;
  }
}

/* =========================================================
   BLOB YOZISH
========================================================= */

async function writeCase(
  data: PlatformCase
) {
  checkBlobToken();

  await put(
    getCasePath(
      data.id
    ),

    JSON.stringify(
      data,
      null,
      2
    ),

    {
      access:
        "private",

      addRandomSuffix:
        false,

      allowOverwrite:
        true,

      contentType:
        "application/json; charset=utf-8",

      cacheControlMaxAge:
        60,
    }
  );
}

/* =========================================================
   LIST
========================================================= */

async function readAllCases(): Promise<
  PlatformCase[]
> {
  checkBlobToken();

  const cases:
    PlatformCase[] = [];

  let cursor:
    string | undefined =
    undefined;

  do {
    const result: {
      blobs: Array<{
        pathname: string;
      }>;
      hasMore: boolean;
      cursor?: string;
    } =
      await list({
        prefix:
          CASES_PREFIX,

        cursor,

        limit:
          100,
      });

    for (
      const blob of result.blobs
    ) {
      if (
        !blob.pathname.endsWith(
          ".json"
        )
      ) {
        continue;
      }

      const id =
        blob.pathname
          .slice(
            CASES_PREFIX.length
          )
          .replace(
            /\.json$/,
            ""
          );

      if (
        !id
      ) {
        continue;
      }

      const item =
        await readCase(id);

      if (
        item
      ) {
        cases.push(
          item
        );
      }
    }

    cursor =
      result.hasMore
        ? result.cursor
        : undefined;
  } while (cursor);

  cases.sort(
    (
      a,
      b
    ) =>
      new Date(
        b.createdAt
      ).getTime() -
      new Date(
        a.createdAt
      ).getTime()
  );

  return cases;
}

/* =========================================================
   VALIDATION
========================================================= */

function validateCaseInput(
  body:
    CreateCaseBody |
    UpdateCaseBody
) {
  const subject =
    cleanText(
      body.subject
    );

  const title =
    cleanText(
      body.title
    );

  const caseText =
    cleanText(
      body.caseText
    );

  const questions =
    normalizeQuestions(
      body.questions
    );

  if (
    !subject
  ) {
    return {
      ok: false as const,
      message:
        "Fan nomini kiriting.",
    };
  }

  if (
    !title
  ) {
    return {
      ok: false as const,
      message:
        "Kazus nomini kiriting.",
    };
  }

  if (
    !caseText
  ) {
    return {
      ok: false as const,
      message:
        "Kazus matnini kiriting.",
    };
  }

  if (
    questions.length ===
    0
  ) {
    return {
      ok: false as const,
      message:
        "Kamida bitta savol va uning javobini kiriting.",
    };
  }

  return {
    ok: true as const,
    subject,
    title,
    caseText,
    questions,
  };
}

/* =========================================================
   GET
   /api/kazuslar
   /api/kazuslar?id=...
========================================================= */

export async function GET(
  request:
    NextRequest
) {
  try {
    const {
      searchParams,
    } =
      new URL(
        request.url
      );

    const id =
      cleanText(
        searchParams.get(
          "id"
        )
      );

    if (
      id
    ) {
      const item =
        await readCase(
          id
        );

      if (
        !item
      ) {
        return NextResponse.json(
          {
            success:
              false,

            message:
              "Kazus topilmadi.",
          },
          {
            status:
              404,

            headers:
              NO_CACHE_HEADERS,
          }
        );
      }

      return NextResponse.json(
        {
          success:
            true,

          case:
            item,
        },
        {
          status:
            200,

          headers:
            NO_CACHE_HEADERS,
        }
      );
    }

    const cases =
      await readAllCases();

    return NextResponse.json(
      {
        success:
          true,

        count:
          cases.length,

        cases,
      },
      {
        status:
          200,

        headers:
          NO_CACHE_HEADERS,
      }
    );
  } catch (error) {
    console.error(
      "GET /api/kazuslar ERROR:",
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          error instanceof Error
            ? error.message
            : "Kazuslarni yuklashda server xatosi.",
      },
      {
        status:
          500,

        headers:
          NO_CACHE_HEADERS,
      }
    );
  }
}

/* =========================================================
   POST
   YANGI PLATFORM KAZUSINI SAQLASH
========================================================= */

export async function POST(
  request:
    NextRequest
) {
  try {
    const auth =
      await requireAdmin(
        request
      );

    if (
      !auth.ok
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            auth.message,
        },
        {
          status:
            auth.status,

          headers:
            NO_CACHE_HEADERS,
        }
      );
    }

    const body =
      (await request.json()) as CreateCaseBody;

    const validated =
      validateCaseInput(
        body
      );

    if (
      !validated.ok
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            validated.message,
        },
        {
          status:
            400,

          headers:
            NO_CACHE_HEADERS,
        }
      );
    }

    const now =
      new Date()
        .toISOString();

    const data:
      PlatformCase =
      {
        id:
          createId(),

        type:
          "platform",

        subject:
          validated.subject,

        title:
          validated.title,

        caseText:
          validated.caseText,

        questions:
          validated.questions,

        createdAt:
          now,

        updatedAt:
          now,
      };

    await writeCase(
      data
    );

    /*
      Saqlanganini qayta tekshiramiz.
    */
    const verified =
      await readCase(
        data.id
      );

    if (
      !verified
    ) {
      throw new Error(
        "Kazus Blobga yuborildi, lekin saqlanganini tasdiqlab bo‘lmadi."
      );
    }

    return NextResponse.json(
      {
        success:
          true,

        message:
          "Kazus muvaffaqiyatli saqlandi.",

        case:
          verified,
      },
      {
        status:
          201,

        headers:
          NO_CACHE_HEADERS,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/kazuslar ERROR:",
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          error instanceof Error
            ? error.message
            : "Kazusni saqlashda server xatosi.",
      },
      {
        status:
          500,

        headers:
          NO_CACHE_HEADERS,
      }
    );
  }
}

/* =========================================================
   PATCH
   KAZUSNI TAHRIRLASH
========================================================= */

export async function PATCH(
  request:
    NextRequest
) {
  try {
    const auth =
      await requireAdmin(
        request
      );

    if (
      !auth.ok
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            auth.message,
        },
        {
          status:
            auth.status,

          headers:
            NO_CACHE_HEADERS,
        }
      );
    }

    const body =
      (await request.json()) as UpdateCaseBody;

    const id =
      cleanText(
        body.id
      );

    if (
      !id
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Kazus ID topilmadi.",
        },
        {
          status:
            400,

          headers:
            NO_CACHE_HEADERS,
        }
      );
    }

    const existing =
      await readCase(
        id
      );

    if (
      !existing
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Kazus topilmadi.",
        },
        {
          status:
            404,

          headers:
            NO_CACHE_HEADERS,
        }
      );
    }

    const validated =
      validateCaseInput(
        body
      );

    if (
      !validated.ok
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            validated.message,
        },
        {
          status:
            400,

          headers:
            NO_CACHE_HEADERS,
        }
      );
    }

    const updated:
      PlatformCase =
      {
        ...existing,

        subject:
          validated.subject,

        title:
          validated.title,

        caseText:
          validated.caseText,

        questions:
          validated.questions,

        updatedAt:
          new Date()
            .toISOString(),
      };

    await writeCase(
      updated
    );

    const verified =
      await readCase(
        id
      );

    if (
      !verified
    ) {
      throw new Error(
        "Kazus yangilandi, lekin saqlanganini tasdiqlab bo‘lmadi."
      );
    }

    return NextResponse.json(
      {
        success:
          true,

        message:
          "Kazus muvaffaqiyatli yangilandi.",

        case:
          verified,
      },
      {
        status:
          200,

        headers:
          NO_CACHE_HEADERS,
      }
    );
  } catch (error) {
    console.error(
      "PATCH /api/kazuslar ERROR:",
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          error instanceof Error
            ? error.message
            : "Kazusni yangilashda server xatosi.",
      },
      {
        status:
          500,

        headers:
          NO_CACHE_HEADERS,
      }
    );
  }
}

/* =========================================================
   DELETE
   KAZUSNI O‘CHIRISH
========================================================= */

export async function DELETE(
  request:
    NextRequest
) {
  try {
    const auth =
      await requireAdmin(
        request
      );

    if (
      !auth.ok
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            auth.message,
        },
        {
          status:
            auth.status,

          headers:
            NO_CACHE_HEADERS,
        }
      );
    }

    const body =
      (await request.json()) as DeleteCaseBody;

    const id =
      cleanText(
        body.id
      );

    if (
      !id
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Kazus ID topilmadi.",
        },
        {
          status:
            400,

          headers:
            NO_CACHE_HEADERS,
        }
      );
    }

    const existing =
      await readCase(
        id
      );

    if (
      !existing
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "Kazus topilmadi.",
        },
        {
          status:
            404,

          headers:
            NO_CACHE_HEADERS,
        }
      );
    }

    await del(
      getCasePath(
        id
      )
    );

    return NextResponse.json(
      {
        success:
          true,

        message:
          "Kazus o‘chirildi.",

        id,
      },
      {
        status:
          200,

        headers:
          NO_CACHE_HEADERS,
      }
    );
  } catch (error) {
    console.error(
      "DELETE /api/kazuslar ERROR:",
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          error instanceof Error
            ? error.message
            : "Kazusni o‘chirishda server xatosi.",
      },
      {
        status:
          500,

        headers:
          NO_CACHE_HEADERS,
      }
    );
  }
}
