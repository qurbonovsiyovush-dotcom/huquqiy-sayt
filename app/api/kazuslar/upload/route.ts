import {
  del,
  put,
} from "@vercel/blob";

import {
  NextResponse,
} from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const PDF_PREFIX =
  "huquqiy-sayt/kazuslar-pdf/files/";

const PDF_META_PREFIX =
  "huquqiy-sayt/kazuslar-pdf/meta/";

const NO_CACHE_HEADERS = {
  "Cache-Control":
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

type MeResponse = {
  role?: unknown;
};

type PdfCaseMeta = {
  id: string;
  type: "pdf";
  subject: string;
  title: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  pathname: string;
  createdAt: string;
  updatedAt: string;
};

function cleanText(
  value: FormDataEntryValue | null
) {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value.trim();
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

function safeFileName(
  fileName: string
) {
  const cleaned =
    fileName
      .normalize("NFKD")
      .replace(
        /[^\w.\-]+/g,
        "-"
      )
      .replace(
        /-+/g,
        "-"
      )
      .replace(
        /^[-.]+|[-.]+$/g,
        ""
      );

  return (
    cleaned ||
    "kazus.pdf"
  );
}

async function requireAdmin(
  request: Request
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
    response.status === 401
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
    data.role !== "admin"
  ) {
    return {
      ok: false as const,
      status: 403,
      message:
        "PDF kazus yuklash faqat administrator uchun.",
    };
  }

  return {
    ok: true as const,
  };
}

export async function POST(
  request: Request
) {
  let uploadedPathname = "";

  try {
    if (
      !process.env
        .BLOB_READ_WRITE_TOKEN
    ) {
      throw new Error(
        "BLOB_READ_WRITE_TOKEN topilmadi."
      );
    }

    const auth =
      await requireAdmin(
        request
      );

    if (
      !auth.ok
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
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

    const formData =
      await request.formData();

    const file =
      formData.get(
        "file"
      );

    const subject =
      cleanText(
        formData.get(
          "subject"
        )
      );

    const title =
      cleanText(
        formData.get(
          "title"
        )
      );

    if (
      !subject
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Fan nomini kiriting.",
        },
        {
          status: 400,
          headers:
            NO_CACHE_HEADERS,
        }
      );
    }

    if (
      !title
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Kazus nomini kiriting.",
        },
        {
          status: 400,
          headers:
            NO_CACHE_HEADERS,
        }
      );
    }

    if (
      !(file instanceof File)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "PDF fayl topilmadi.",
        },
        {
          status: 400,
          headers:
            NO_CACHE_HEADERS,
        }
      );
    }

    const isPdf =
      file.type ===
        "application/pdf" ||
      file.name
        .toLowerCase()
        .endsWith(
          ".pdf"
        );

    if (
      !isPdf
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Faqat PDF fayl yuklash mumkin.",
        },
        {
          status: 400,
          headers:
            NO_CACHE_HEADERS,
        }
      );
    }

    const maxSize =
      10 *
      1024 *
      1024;

    if (
      file.size >
      maxSize
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "PDF hajmi 10 MB dan oshmasligi kerak.",
        },
        {
          status: 400,
          headers:
            NO_CACHE_HEADERS,
        }
      );
    }

    if (
      file.size === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "PDF fayl bo‘sh.",
        },
        {
          status: 400,
          headers:
            NO_CACHE_HEADERS,
        }
      );
    }

    const id =
      createId();

    const safeName =
      safeFileName(
        file.name
      );

    const pdfPath =
      `${PDF_PREFIX}${id}-${safeName}`;

    const blob =
      await put(
        pdfPath,
        file,
        {
          access:
            "public",

          addRandomSuffix:
            false,

          contentType:
            "application/pdf",

          cacheControlMaxAge:
            3600,
        }
      );

    uploadedPathname =
      blob.pathname;

    const now =
      new Date()
        .toISOString();

    const meta:
      PdfCaseMeta =
      {
        id,
        type: "pdf",
        subject,
        title,

        originalFileName:
          file.name,

        fileSize:
          file.size,

        mimeType:
          "application/pdf",

        url:
          blob.url,

        pathname:
          blob.pathname,

        createdAt:
          now,

        updatedAt:
          now,
      };

    await put(
      `${PDF_META_PREFIX}${id}.json`,

      JSON.stringify(
        meta,
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

    return NextResponse.json(
      {
        success: true,

        message:
          "PDF kazus muvaffaqiyatli yuklandi.",

        case:
          meta,
      },
      {
        status: 201,
        headers:
          NO_CACHE_HEADERS,
      }
    );
  } catch (error) {
    console.error(
      "PDF upload ERROR:",
      error
    );

    /*
      PDF yuklandi-yu metadata yozishda xato bo‘lsa,
      yetim PDF qolmasligi uchun rollback qilamiz.
    */
    if (
      uploadedPathname
    ) {
      try {
        await del(
          uploadedPathname
        );
      } catch (
        rollbackError
      ) {
        console.error(
          "PDF rollback ERROR:",
          rollbackError
        );
      }
    }

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "PDF yuklashda xatolik yuz berdi.",
      },
      {
        status: 500,
        headers:
          NO_CACHE_HEADERS,
      }
    );
  }
}
