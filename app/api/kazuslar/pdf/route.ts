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

function safeDownloadName(
  fileName: string
) {
  return (
    fileName
      .replace(
        /[\r\n"]/g,
        ""
      )
      .trim() ||
    "kazus.pdf"
  );
}

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

    const { searchParams } =
      new URL(
        request.url
      );

    const id =
      searchParams
        .get("id")
        ?.trim();

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Kazus ID ko‘rsatilmagan.",
        },
        {
          status: 400,
        }
      );
    }

    /* =========================
       1. METADATA'NI O‘QIYMIZ
    ========================= */

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
        }
      );
    }

    const meta =
      JSON.parse(
        metaText
      ) as PdfCaseMeta;

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
        }
      );
    }

    /* =========================
       2. PRIVATE PDF'NI O‘QIYMIZ
    ========================= */

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
        }
      );
    }

    /* =========================
       3. BRAUZERGA PDF QAYTARAMIZ
    ========================= */

    const fileName =
      safeDownloadName(
        meta.originalFileName
      );

    return new Response(
      pdfResult.stream,
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `inline; filename="${fileName}"`,

          "Cache-Control":
            "private, no-store, no-cache, must-revalidate",

          "X-Content-Type-Options":
            "nosniff",
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
      }
    );
  }
}
