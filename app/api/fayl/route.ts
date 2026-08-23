import { get } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const INDEX_PATH =
  "huquqiy-sayt/kazuslar/qoidalar/index.json";

type RuleResource = {
  id: string;
  title: string;
  description: string;
  category: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileType: "pdf" | "ppt" | "pptx";
  pathname: string;
  url: string;
  createdAt: string;
  updatedAt: string;
};

async function readIndex(): Promise<RuleResource[]> {
  const result = await get(INDEX_PATH, {
    access: "private",
  });

  if (
    !result ||
    result.statusCode !== 200 ||
    !result.stream
  ) {
    return [];
  }

  const raw = await new Response(
    result.stream
  ).text();

  if (!raw.trim()) {
    return [];
  }

  const parsed = JSON.parse(raw);

  return Array.isArray(parsed)
    ? parsed
    : [];
}

export async function GET(
  request: NextRequest
) {
  try {
    const url = new URL(request.url);

    const id =
      url.searchParams
        .get("id")
        ?.trim() ?? "";

    const download =
      url.searchParams.get("download") === "1";

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Material ID topilmadi.",
        },
        {
          status: 400,
        }
      );
    }

    const resources = await readIndex();

    const resource = resources.find(
      (item) => item.id === id
    );

    if (!resource) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Material topilmadi.",
        },
        {
          status: 404,
        }
      );
    }

    const blob = await get(
      resource.pathname,
      {
        access: "private",
      }
    );

    if (
      !blob ||
      blob.statusCode !== 200 ||
      !blob.stream
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Fayl topilmadi.",
        },
        {
          status: 404,
        }
      );
    }

    const disposition =
      download || resource.fileType !== "pdf"
        ? `attachment; filename*=UTF-8''${encodeURIComponent(resource.fileName)}`
        : `inline; filename*=UTF-8''${encodeURIComponent(resource.fileName)}`;

    return new NextResponse(
      blob.stream,
      {
        status: 200,
        headers: {
          "Content-Type":
            resource.mimeType ||
            "application/octet-stream",
          "Content-Disposition":
            disposition,
          "Cache-Control":
            "private, no-store, max-age=0",
          "X-Content-Type-Options":
            "nosniff",
        },
      }
    );
  } catch (error) {
    console.error(
      "QOIDALAR FILE GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Faylni ochishda xatolik.",
      },
      {
        status: 500,
      }
    );
  }
}
