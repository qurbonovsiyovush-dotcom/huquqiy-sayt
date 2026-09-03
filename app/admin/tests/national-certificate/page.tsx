import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAdmin() {
  const cookieStore = await cookies();

  const session =
    cookieStore.get("qurbonov_session")?.value || "";

  const role =
    cookieStore.get("qurbonov_role")?.value || "";

  return Boolean(session) && role === "admin";
}

export async function POST(
  _request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Testni qoralamaga qaytarish faqat administrator uchun.",
        },
        {
          status: 403,
          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    const { id } = await context.params;

    const testId = String(id || "").trim();

    if (!testId) {
      return NextResponse.json(
        {
          success: false,
          message: "Test ID topilmadi.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    const rows = await sql`
      SELECT
        id,
        title,
        status
      FROM national_certificate_tests
      WHERE id = ${testId}
      LIMIT 1;
    `;

    const test = rows[0];

    if (!test) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Milliy sertifikat testi topilmadi.",
        },
        {
          status: 404,
          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    if (test.status === "draft") {
      return NextResponse.json(
        {
          success: true,
          message:
            "Test allaqachon qoralama holatida.",
          test: {
            id: String(test.id),
            title: String(test.title || ""),
            status: "draft",
          },
        },
        {
          status: 200,
          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    await sql`
      UPDATE national_certificate_tests
      SET
        status = 'draft',
        updated_at = NOW()
      WHERE id = ${testId};
    `;

    return NextResponse.json(
      {
        success: true,
        message:
          "Test qoralama holatiga qaytarildi.",
        test: {
          id: String(test.id),
          title: String(test.title || ""),
          status: "draft",
        },
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
      "NATIONAL CERTIFICATE UNPUBLISH ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Testni qoralamaga qaytarishda server xatosi yuz berdi.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  }
}
