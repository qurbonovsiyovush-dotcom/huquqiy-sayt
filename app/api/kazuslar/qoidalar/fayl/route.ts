import { cookies } from "next/headers";
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
  mimeType?: string;
  fileType: "pdf" | "ppt" | "pptx";
  pathname?: string;
  blobPath?: string;
  url?: string;
  createdAt: string;
  updatedAt?: string;
};

async function getRole(): Promise<"admin" | "user"> {
  const cookieStore = await cookies();

  return cookieStore.get("qurbonov_role")?.value === "admin"
    ? "admin"
    : "user";
}

async function readIndex(): Promise<RuleResource[]> {
  try {
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
  } catch (error) {
    console.error("QOIDALAR INDEX READ ERROR:", error);
    return [];
  }
}

function safeFileName(name: string) {
  return name
    .replace(/[\r\n"]/g, "")
    .replace(/[^\p{L}\p{N}._()\- ]/gu, "_");
}

function detectContentType(resource: RuleResource) {
  const extension =
    resource.fileName
      ?.split(".")
      .pop()
      ?.toLowerCase() ?? "";

  if (extension === "pdf") {
    return "application/pdf";
  }

  if (extension === "ppt") {
    return "application/vnd.ms-powerpoint";
  }

  if (extension === "pptx") {
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }

  return (
    resource.mimeType ||
    "application/octet-stream"
  );
}

export async function GET(
  request: NextRequest
) {
  try {
    const role = await getRole();

    const url = new URL(request.url);

    const id =
      url.searchParams
        .get("id")
        ?.trim() ?? "";

    const wantsDownload =
      url.searchParams.get("download") === "1";

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Fayl ID ko‘rsatilmagan.",
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
          error: "Material topilmadi.",
        },
        {
          status: 404,
        }
      );
    }

    /*
      ODDIY FOYDALANUVCHI UCHUN:
      - download=1 taqiqlanadi;
      - PPT/PPTX raw fayl umuman berilmaydi;
      - faqat PDF inline ko‘rish beriladi.
    */
    if (role !== "admin") {
      if (wantsDownload) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Faylni yuklab olishga ruxsat berilmagan.",
          },
          {
            status: 403,
          }
        );
      }

      if (resource.fileType !== "pdf") {
        return NextResponse.json(
          {
            success: false,
            error:
              "PPT/PPTX foydalanuvchiga raw fayl sifatida berilmaydi. PDF nusxasidan foydalaning.",
          },
          {
            status: 403,
          }
        );
      }
    }

    const pathname =
      resource.pathname ||
      resource.blobPath ||
      "";

    if (!pathname) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Material faylining manzili topilmadi.",
        },
        {
          status: 404,
        }
      );
    }

    const blob = await get(
      pathname,
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
            "Fayl Vercel Blob ichidan topilmadi.",
        },
        {
          status: 404,
        }
      );
    }

    const fileName =
      safeFileName(
        resource.fileName ||
          `${resource.title}.${resource.fileType}`
      );

    const contentType =
      detectContentType(resource);

    const isPdf =
      resource.fileType === "pdf";

    /*
      ADMIN:
      download=1 bo‘lsa yuklab oladi.
      Aks holda PDF inline.

      USER:
      faqat PDF inline.
    */
    const disposition =
      role === "admin" && wantsDownload
        ? `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`
        : isPdf
          ? `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`
          : `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`;

    return new NextResponse(
      blob.stream,
      {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": disposition,

          /*
            Fayl brauzer/proxy cache'iga saqlanib qolmasin.
          */
          "Cache-Control":
            "private, no-store, no-cache, must-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
          "X-Content-Type-Options": "nosniff",

          /*
            Sahifani boshqa sayt iframe'iga qo‘yishni qiyinlashtiradi.
          */
          "Content-Security-Policy":
            "default-src 'none'; frame-ancestors 'self';",

          /*
            Qidiruv tizimlari raw fayl route'ini indekslamasin.
          */
          "X-Robots-Tag":
            "noindex, nofollow, noarchive, nosnippet",
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
            : "Faylni ochishda server xatosi yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}
