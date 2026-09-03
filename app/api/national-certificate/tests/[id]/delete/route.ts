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

function noStoreHeaders() {
  return {
    "Cache-Control":
      "no-store, no-cache, must-revalidate",
  };
}

export async function DELETE(
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
            "Testni o‘chirish faqat administrator uchun.",
        },
        {
          status: 403,
          headers: noStoreHeaders(),
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
          headers: noStoreHeaders(),
        }
      );
    }

    const testRows = await sql`
      SELECT
        id,
        title
      FROM national_certificate_tests
      WHERE id = ${testId}
      LIMIT 1;
    `;

    const test = testRows[0];

    if (!test) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Milliy sertifikat testi topilmadi.",
        },
        {
          status: 404,
          headers: noStoreHeaders(),
        }
      );
    }

    /*
      Admin tasdiqlaganidan keyin test to‘liq o‘chiriladi.

      O‘chirish tartibi:
      1) attempt answerlar
      2) attemptlar
      3) test

      Savollar, variantlar va ochiq javoblar
      test/question FK laridagi ON DELETE CASCADE orqali
      avtomatik o‘chadi.
    */

    await sql`
      DELETE FROM national_certificate_attempt_answers
      WHERE attempt_id IN (
        SELECT id
        FROM national_certificate_attempts
        WHERE test_id = ${testId}
      );
    `;

    await sql`
      DELETE FROM national_certificate_attempts
      WHERE test_id = ${testId};
    `;

    const deletedRows = await sql`
      DELETE FROM national_certificate_tests
      WHERE id = ${testId}
      RETURNING
        id,
        title;
    `;

    const deleted = deletedRows[0];

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Testni o‘chirish amalga oshmadi.",
        },
        {
          status: 409,
          headers: noStoreHeaders(),
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Milliy sertifikat testi barcha savollar, urinishlar va natijalar bilan birga butunlay o‘chirildi.",
        deletedTest: {
          id: String(deleted.id),
          title: String(deleted.title || ""),
        },
      },
      {
        status: 200,
        headers: noStoreHeaders(),
      }
    );
  } catch (error) {
    console.error(
      "NATIONAL CERTIFICATE DELETE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Testni o‘chirishda server xatosi yuz berdi.",
      },
      {
        status: 500,
        headers: noStoreHeaders(),
      }
    );
  }
}

