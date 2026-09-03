import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStoreHeaders() {
  return {
    "Cache-Control":
      "no-store, no-cache, must-revalidate",
  };
}

async function isAdmin() {
  const cookieStore =
    await cookies();

  const session =
    cookieStore.get(
      "qurbonov_session"
    )?.value || "";

  const role =
    cookieStore.get(
      "qurbonov_role"
    )?.value || "";

  return (
    Boolean(session) &&
    role === "admin"
  );
}

export async function PATCH(
  request: Request,
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
            "Bu amal faqat administrator uchun.",
        },
        {
          status: 403,
          headers:
            noStoreHeaders(),
        }
      );
    }

    const { id } =
      await context.params;

    const testId =
      String(id || "").trim();

    if (!testId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Test ID topilmadi.",
        },
        {
          status: 400,
          headers:
            noStoreHeaders(),
        }
      );
    }

    const body =
      await request
        .json()
        .catch(() => ({}));

    const title =
      String(
        body?.title || ""
      )
        .trim()
        .replace(/\s+/g, " ");

    const description =
      String(
        body?.description || ""
      ).trim();

    const durationMinutes =
      Number(
        body?.durationMinutes ??
          body?.duration
      );

    const rawAttemptLimit =
      body?.attemptLimit;

    const attemptLimit =
      rawAttemptLimit === null ||
      rawAttemptLimit ===
        undefined ||
      String(
        rawAttemptLimit
      ).trim() === ""
        ? null
        : Number(
            rawAttemptLimit
          );

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Test nomini kiriting.",
        },
        {
          status: 400,
          headers:
            noStoreHeaders(),
        }
      );
    }

    if (title.length > 200) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Test nomi 200 ta belgidan oshmasligi kerak.",
        },
        {
          status: 400,
          headers:
            noStoreHeaders(),
        }
      );
    }

    if (
      !Number.isInteger(
        durationMinutes
      ) ||
      durationMinutes <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Test vaqti musbat butun son bo‘lishi kerak.",
        },
        {
          status: 400,
          headers:
            noStoreHeaders(),
        }
      );
    }

    if (
      attemptLimit !== null &&
      (
        !Number.isInteger(
          attemptLimit
        ) ||
        attemptLimit <= 0
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Urinishlar soni musbat butun son yoki cheklanmagan bo‘lishi kerak.",
        },
        {
          status: 400,
          headers:
            noStoreHeaders(),
        }
      );
    }

    const rows = await sql`
      SELECT
        id,
        status
      FROM national_certificate_tests
      WHERE id = ${testId}
      LIMIT 1;
    `;

    const existing =
      rows[0];

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Milliy sertifikat testi topilmadi.",
        },
        {
          status: 404,
          headers:
            noStoreHeaders(),
        }
      );
    }

    if (
      existing.status !==
      "draft"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "E’lon qilingan testning asosiy ma’lumotlarini tahrirlab bo‘lmaydi. Avval qoralamaga qaytaring.",
        },
        {
          status: 409,
          headers:
            noStoreHeaders(),
        }
      );
    }

    const updatedRows =
      await sql`
        UPDATE national_certificate_tests
        SET
          title = ${title},
          description = ${description},
          duration_minutes = ${durationMinutes},
          attempt_limit = ${attemptLimit},
          updated_at = NOW()
        WHERE id = ${testId}
        RETURNING
          id,
          title,
          description,
          status,
          duration_minutes,
          attempt_limit,
          updated_at;
      `;

    const updated =
      updatedRows[0];

    return NextResponse.json(
      {
        success: true,
        message:
          "Testning asosiy ma’lumotlari saqlandi.",
        test: {
          id: String(
            updated.id
          ),
          title: String(
            updated.title || ""
          ),
          description:
            String(
              updated.description ||
                ""
            ),
          status:
            String(
              updated.status ||
                "draft"
            ),
          durationMinutes:
            Number(
              updated.duration_minutes ||
                durationMinutes
            ),
          attemptLimit:
            updated.attempt_limit ===
            null
              ? null
              : Number(
                  updated.attempt_limit
                ),
          updatedAt:
            updated.updated_at
              ? new Date(
                  String(
                    updated.updated_at
                  )
                ).toISOString()
              : null,
        },
      },
      {
        status: 200,
        headers:
          noStoreHeaders(),
      }
    );
  } catch (error) {
    console.error(
      "NATIONAL CERTIFICATE SETTINGS PATCH ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Test ma’lumotlarini saqlashda server xatosi yuz berdi.",
      },
      {
        status: 500,
        headers:
          noStoreHeaders(),
      }
    );
  }
}
