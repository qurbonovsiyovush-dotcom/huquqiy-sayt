import {
  get,
} from "@vercel/blob";

import {
  NextResponse,
} from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const PDF_META_PREFIX =
  "huquqiy-sayt/kazuslar-pdf/meta/";

const NO_CACHE_HEADERS = {
  "Cache-Control":
    "private, no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
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

type MeResponse = {
  role?: unknown;
};

/* =========================================================
   FAYL NOMINI XAVFSIZLASHTIRISH
========================================================= */

function safeDownloadName(
  fileName: string
) {
  const cleaned =
    fileName
      .replace(
        /[\r\n"]/g,
        ""
      )
      .trim();

  return (
    cleaned ||
    "kazus.pdf"
  );
}

/* =========================================================
   ADMIN TEKSHIRISH

   download=1 bo‘lsa, faqat admin ruxsat oladi.
========================================================= */

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
        "PDFni yuklab olish faqat administrator uchun.",
    };
  }

  return {
    ok: true as const,
  };
}

/* =========================================================
   GET
   /api/kazuslar/pdf?id=...
   /api/kazuslar/pdf?id=...&download=1
========================================================= */

export async function GET(
  request: Request
) {
  try {
    if (
      !process.env
        .BLOB_READ_WRITE_TOKEN
    ) {
      throw new Error(
        "BLOB_READ_WRITE_TOKEN topilmadi."
      );
    }

    const {
      searchParams,
    } =
      new URL(
        request.url
      );

    const id =
      searchParams
        .get("id")
        ?.trim();

    const wantsDownload =
      searchParams.get(
        "download"
      ) === "1";

    if (
      !id
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Kazus ID ko‘rsatilmagan.",
        },
        {
          status: 400,

          headers:
            NO_CACHE_HEADERS,
        }
      );
    }

    /* =====================================================
       DOWNLOAD SO‘ROVI BO‘LSA — ADMINNI TEKSHIRAMIZ
    ===================================================== */

    if (
      wantsDownload
    ) {
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
    }

    /* =====================================================
       1. METADATA'NI O‘QIYMIZ
    ===================================================== */

    const metaResult =
      await get(
        `${PDF_META_PREFIX}${id}.json`,
        {
          access:
            "private",
        }
      );

    if (
      !metaResult ||
      metaResult.statusCode !==
        200 ||
      !metaResult.stream
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "PDF kazus topilmadi.",
        },
        {
          status: 404,

          headers:
            NO_CACHE_HEADERS,
        }
      );
    }

    const metaText =
      await new Response(
        metaResult.stream
      ).text();

    if (
      !metaText.trim()
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "PDF ma’lumotlari topilmadi.",
        },
        {
          status: 404,

          headers:
            NO_CACHE_HEADERS,
        }
      );
    }

    let meta:
      PdfCaseMeta;

    try {
      meta =
        JSON.parse(
          metaText
        ) as PdfCaseMeta;
    } catch {
      return NextResponse.json(
        {
          success: false,

          error:
            "PDF metadata fayli buzilgan.",
        },
        {
          status: 500,

          headers:
            NO_CACHE_HEADERS,
        }
      );
    }

    if (
      !meta.pathname
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "PDF manzili topilmadi.",
        },
        {
          status: 404,

          headers:
            NO_CACHE_HEADERS,
        }
      );
    }

    /* =====================================================
       2. PRIVATE PDF'NI O‘QIYMIZ
    ===================================================== */

    const pdfResult =
      await get(
        meta.pathname,
        {
          access:
            "private",
        }
      );

    if (
      !pdfResult ||
      pdfResult.statusCode !==
        200 ||
      !pdfResult.stream
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "PDF fayl topilmadi.",
        },
        {
          status: 404,

          headers:
            NO_CACHE_HEADERS,
        }
      );
    }

    const fileName =
      safeDownloadName(
        meta.originalFileName
      );

    /*
      Oddiy viewer:
        inline

      Admin download=1:
        attachment
    */
    const contentDisposition =
      wantsDownload
        ? `attachment; filename="${fileName}"`
        : `inline; filename="${fileName}"`;

    return new Response(
      pdfResult.stream,
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            contentDisposition,

          ...NO_CACHE_HEADERS,

          "X-Content-Type-Options":
            "nosniff",

          /*
            PDF brauzerda boshqa sahifa ichiga
            begona domenlardan embed qilinmasin.
          */
          "Content-Security-Policy":
            "frame-ancestors 'self'",

          /*
            Qidiruv tizimlari private PDF endpointini
            indekslamasin.
          */
          "X-Robots-Tag":
            "noindex, nofollow, noarchive",
        },
      }
    );
  } catch (error) {
    console.error(
      "PDF OPEN ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "PDF faylni ochishda xatolik yuz berdi.",
      },
      {
        status: 500,

        headers:
          NO_CACHE_HEADERS,
      }
    );
  }
}
