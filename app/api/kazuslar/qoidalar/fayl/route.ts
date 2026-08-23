import { get } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const INDEX_PATH = "huquqiy-sayt/kazuslar/qoidalar/index.json";

type RuleResource = {
  id: string;
  title: string;
  description: string;
  category: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  blobPath: string;
  createdAt: string;
  updatedAt?: string;
};

async function readIndex(): Promise<RuleResource[]> {
  try {
    const result = await get(INDEX_PATH, {
      access: "private",
    });

    if (!result) {
      return [];
    }

    const text = await new Response(result.stream).text();

    if (!text.trim()) {
      return [];
    }

    const parsed = JSON.parse(text);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Qoidalar index o‘qishda xato:", error);
    return [];
  }
}

function safeFileName(name: string) {
  return name
    .replace(/[\r\n"]/g, "")
    .replace(/[^\p{L}\p{N}._()\- ]/gu, "_");
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          error: "Fayl ID ko‘rsatilmagan.",
        },
        {
          status: 400,
        }
      );
    }

    // Barcha materiallarni olamiz
    const resources = await readIndex();

    // ID bo‘yicha kerakli material
    const resource = resources.find((item) => item.id === id);

    if (!resource) {
      return NextResponse.json(
        {
          error: "Material topilmadi.",
        },
        {
          status: 404,
        }
      );
    }

    if (!resource.blobPath) {
      return NextResponse.json(
        {
          error: "Material faylining manzili topilmadi.",
        },
        {
          status: 404,
        }
      );
    }

    // Vercel Blob'dan haqiqiy faylni olamiz
    const blob = await get(resource.blobPath, {
      access: "private",
    });

    if (!blob) {
      return NextResponse.json(
        {
          error: "Fayl Vercel Blob ichidan topilmadi.",
        },
        {
          status: 404,
        }
      );
    }

    const fileName = safeFileName(
      resource.fileName || `${resource.title}.pdf`
    );

    const extension =
      fileName.split(".").pop()?.toLowerCase() || "";

    let contentType =
      resource.fileType || "application/octet-stream";

    // MIME type noto‘g‘ri saqlangan bo‘lsa ham tuzatamiz
    if (extension === "pdf") {
      contentType = "application/pdf";
    }

    if (extension === "ppt") {
      contentType = "application/vnd.ms-powerpoint";
    }

    if (extension === "pptx") {
      contentType =
        "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    }

    /*
      PDF:
      brauzer ichida ochiladi.

      PPT/PPTX:
      brauzer qo‘llab-quvvatlashiga qarab
      ochiladi yoki yuklab olinadi.
    */
    const isPdf = extension === "pdf";

    const disposition = isPdf
      ? `inline; filename="${fileName}"`
      : `attachment; filename="${fileName}"`;

    return new NextResponse(blob.stream, {
      status: 200,

      headers: {
        "Content-Type": contentType,

        "Content-Disposition": disposition,

        "Cache-Control":
          "private, no-store, no-cache, must-revalidate, max-age=0",

        Pragma: "no-cache",

        Expires: "0",

        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Qoidalar faylini ochishda xato:", error);

    return NextResponse.json(
      {
        error: "Faylni ochishda server xatosi yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}
