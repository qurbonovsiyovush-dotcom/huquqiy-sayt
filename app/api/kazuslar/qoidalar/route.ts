import { cookies } from "next/headers";
import { del, get, put } from "@vercel/blob";
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

async function isAdmin() {
  const cookieStore = await cookies();

  return (
    cookieStore.get("qurbonov_role")?.value ===
    "admin"
  );
}

function cleanName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ");
}

function safeFileName(value: string) {
  const parts = value.split(".");
  const extension =
    parts.length > 1
      ? `.${parts.pop()!.toLowerCase()}`
      : "";

  const base = parts
    .join(".")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return `${base || "fayl"}${extension}`;
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
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    if (
      message.toLowerCase().includes("not found") ||
      message.includes("404")
    ) {
      return [];
    }

    throw error;
  }
}

async function writeIndex(
  resources: RuleResource[]
) {
  await put(
    INDEX_PATH,
    JSON.stringify(resources, null, 2),
    {
      access: "private",
      allowOverwrite: true,
      addRandomSuffix: false,
      contentType:
        "application/json; charset=utf-8",
    }
  );
}

export async function GET() {
  try {
    const resources = await readIndex();

    resources.sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );

    return NextResponse.json({
      success: true,
      resources,
    });
  } catch (error) {
    console.error("QOIDALAR GET ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Materiallarni yuklab bo‘lmadi.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Fayl yuklash faqat administrator uchun.",
        },
        {
          status: 403,
        }
      );
    }

    const formData = await request.formData();

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "Fayl tanlanmagan.",
        },
        {
          status: 400,
        }
      );
    }

    const title = cleanName(
      String(formData.get("title") ?? "")
    );

    const description = cleanName(
      String(formData.get("description") ?? "")
    );

    const category =
      cleanName(
        String(formData.get("category") ?? "")
      ) || "Boshqa";

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          error: "Sarlavha kiritilmagan.",
        },
        {
          status: 400,
        }
      );
    }

    if (file.size > 30 * 1024 * 1024) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Fayl hajmi 30 MB dan oshmasligi kerak.",
        },
        {
          status: 400,
        }
      );
    }

    const lowerName =
      file.name.toLowerCase();

    let fileType:
      | "pdf"
      | "ppt"
      | "pptx";

    if (lowerName.endsWith(".pdf")) {
      fileType = "pdf";
    } else if (
      lowerName.endsWith(".ppt")
    ) {
      fileType = "ppt";
    } else if (
      lowerName.endsWith(".pptx")
    ) {
      fileType = "pptx";
    } else {
      return NextResponse.json(
        {
          success: false,
          error:
            "Faqat PDF, PPT yoki PPTX fayl yuklash mumkin.",
        },
        {
          status: 400,
        }
      );
    }

    const id =
      typeof crypto !== "undefined" &&
      "randomUUID" in crypto
        ? crypto.randomUUID()
        : `qoidalar-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 9)}`;

    const pathname =
      `huquqiy-sayt/kazuslar/qoidalar/files/${id}-${safeFileName(file.name)}`;

    const blob = await put(
      pathname,
      file,
      {
        access: "private",
        addRandomSuffix: false,
        contentType:
          file.type ||
          "application/octet-stream",
      }
    );

    const now =
      new Date().toISOString();

    const resource: RuleResource = {
      id,
      title,
      description,
      category,
      fileName: file.name,
      fileSize: file.size,
      mimeType:
        file.type ||
        "application/octet-stream",
      fileType,
      pathname: blob.pathname,
      url: blob.url,
      createdAt: now,
      updatedAt: now,
    };

    const resources = await readIndex();

    await writeIndex([
      ...resources,
      resource,
    ]);

    return NextResponse.json(
      {
        success: true,
        resource,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("QOIDALAR POST ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Fayl yuklashda xatolik.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(
  request: NextRequest
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Tahrirlash faqat administrator uchun.",
        },
        {
          status: 403,
        }
      );
    }

    const body = await request.json();

    const id =
      String(body?.id ?? "").trim();

    const title =
      cleanName(
        String(body?.title ?? "")
      );

    const description =
      cleanName(
        String(body?.description ?? "")
      );

    const category =
      cleanName(
        String(body?.category ?? "")
      ) || "Boshqa";

    if (!id || !title) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Material ID yoki sarlavha topilmadi.",
        },
        {
          status: 400,
        }
      );
    }

    const resources = await readIndex();

    const current = resources.find(
      (item) => item.id === id
    );

    if (!current) {
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

    const updated: RuleResource = {
      ...current,
      title,
      description,
      category,
      updatedAt:
        new Date().toISOString(),
    };

    const next = resources.map(
      (item) =>
        item.id === id
          ? updated
          : item
    );

    await writeIndex(next);

    return NextResponse.json({
      success: true,
      resource: updated,
    });
  } catch (error) {
    console.error("QOIDALAR PATCH ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Tahrirlashda xatolik.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  request: NextRequest
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        {
          success: false,
          error:
            "O‘chirish faqat administrator uchun.",
        },
        {
          status: 403,
        }
      );
    }

    const url = new URL(request.url);

    const id =
      url.searchParams
        .get("id")
        ?.trim() ?? "";

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

    await del(resource.pathname);

    const next = resources.filter(
      (item) => item.id !== id
    );

    await writeIndex(next);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("QOIDALAR DELETE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "O‘chirishda xatolik.",
      },
      {
        status: 500,
      }
    );
  }
}
