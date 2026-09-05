import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function isAdmin() {
  const cookieStore = await cookies();

  return (
    cookieStore.get("qurbonov_session")?.value &&
    cookieStore.get("qurbonov_role")?.value === "admin"
  );
}

function normalizeStatus(value: unknown) {
  return value === "published"
    ? "published"
    : "draft";
}

export async function GET() {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        {
          success: false,
          message: "Faqat administrator uchun.",
        },
        { status: 403 }
      );
    }

    const rows = await sql`
      SELECT
        t.id,
        t.title,
        t.subject,
        t.duration,
        t.description,
        t.test_type,
        t.custom_test_type_name,
        t.status,
        t.attempt_limit,
        t.created_at,
        t.updated_at,
        COUNT(q.id)::int AS question_count
      FROM legacy_tests t
      LEFT JOIN legacy_test_questions q
        ON q.test_id = t.id
      WHERE COALESCE(t.test_type, '') <> 'thematic'
        AND COALESCE(t.test_type, '') <> 'national-certificate'
      GROUP BY
        t.id,
        t.title,
        t.subject,
        t.duration,
        t.description,
        t.test_type,
        t.custom_test_type_name,
        t.status,
        t.attempt_limit,
        t.created_at,
        t.updated_at
      ORDER BY t.updated_at DESC, t.created_at DESC
    `;

    const tests = rows.map((row: any) => ({
      id: String(row.id),
      title: String(row.title || ""),
      subject: String(row.subject || ""),
      duration: Number(row.duration) || 30,
      description:
        row.description == null
          ? undefined
          : String(row.description),
      testType:
        row.test_type == null
          ? undefined
          : String(row.test_type),
      customTestTypeName:
        row.custom_test_type_name == null
          ? undefined
          : String(row.custom_test_type_name),
      status: normalizeStatus(row.status),
      attemptLimit:
        row.attempt_limit == null
          ? null
          : Number(row.attempt_limit),
      questions: [],
      questionCount:
        Number(row.question_count) || 0,
      storage: "legacy",
      createdAt:
        row.created_at
          ? new Date(row.created_at).toISOString()
          : undefined,
      updatedAt:
        row.updated_at
          ? new Date(row.updated_at).toISOString()
          : undefined,
    }));

    return NextResponse.json({
      success: true,
      tests,
      total: tests.length,
    });
  } catch (error) {
    console.error("LEGACY NEON LIST ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Neon testlarini yuklab bo‘lmadi.",
      },
      { status: 500 }
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
          message: "Faqat administrator uchun.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const action = String(body?.action || "");
    const rawIds = Array.isArray(body?.testIds)
      ? body.testIds
      : [];

    const testIds = Array.from(
      new Set(
        rawIds
          .map((value: unknown) =>
            String(value || "").trim()
          )
          .filter(Boolean)
      )
    );

    if (
      action === "bulk-publish-tests"
    ) {
      const publishedIds: string[] = [];

      for (const testId of testIds) {
        const countRows = await sql`
          SELECT COUNT(*)::int AS count
          FROM legacy_test_questions
          WHERE test_id = ${testId}
        `;

        const count =
          Number(countRows[0]?.count) || 0;

        if (count <= 0) {
          continue;
        }

        const updated = await sql`
          UPDATE legacy_tests
          SET
            status = 'published',
            updated_at = NOW()
          WHERE id = ${testId}
          RETURNING id
        `;

        if (updated.length > 0) {
          publishedIds.push(testId);
        }
      }

      return NextResponse.json({
        success: true,
        publishedIds,
        publishedCount:
          publishedIds.length,
      });
    }

    if (
      action === "bulk-delete-tests"
    ) {
      const onlyDrafts =
        body?.onlyDrafts === true;

      const deletedIds: string[] = [];

      for (const testId of testIds) {
        const deleted = onlyDrafts
          ? await sql`
              DELETE FROM legacy_tests
              WHERE id = ${testId}
                AND status = 'draft'
              RETURNING id
            `
          : await sql`
              DELETE FROM legacy_tests
              WHERE id = ${testId}
              RETURNING id
            `;

        if (deleted.length > 0) {
          deletedIds.push(testId);
        }
      }

      return NextResponse.json({
        success: true,
        deletedIds,
        deletedCount:
          deletedIds.length,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: "Noma’lum action.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error(
      "LEGACY NEON BULK ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Neon amali bajarilmadi.",
      },
      { status: 500 }
    );
  }
}

