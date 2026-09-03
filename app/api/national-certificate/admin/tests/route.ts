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

function toNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toNullableNumber(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

export async function GET() {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Ushbu ma’lumotlarni ko‘rish faqat administrator uchun.",
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

    const rows = await sql`
      SELECT
        t.id,
        t.title,
        t.description,
        t.subject,
        t.status,
        t.duration_minutes,
        t.closed_question_count,
        t.open_question_count,
        t.total_question_count,
        t.attempt_limit,
        t.created_at,
        t.updated_at,

        COUNT(q.id)::int AS saved_question_count,

        COUNT(q.id)
          FILTER (
            WHERE q.type = 'closed'
          )::int AS saved_closed_count,

        COUNT(q.id)
          FILTER (
            WHERE q.type = 'open'
          )::int AS saved_open_count,

        (
          SELECT COUNT(*)::int
          FROM national_certificate_attempts a
          WHERE
            a.test_id = t.id
            AND a.status IN (
              'submitted',
              'expired'
            )
        ) AS attempt_count,

        (
          SELECT COUNT(*)::int
          FROM national_certificate_attempts a
          WHERE
            a.test_id = t.id
            AND a.status = 'submitted'
        ) AS submitted_count,

        (
          SELECT COUNT(*)::int
          FROM national_certificate_attempts a
          WHERE
            a.test_id = t.id
            AND a.status = 'in_progress'
        ) AS in_progress_count

      FROM national_certificate_tests t

      LEFT JOIN national_certificate_questions q
        ON q.test_id = t.id

      GROUP BY
        t.id,
        t.title,
        t.description,
        t.subject,
        t.status,
        t.duration_minutes,
        t.closed_question_count,
        t.open_question_count,
        t.total_question_count,
        t.attempt_limit,
        t.created_at,
        t.updated_at

      ORDER BY
        t.updated_at DESC,
        t.created_at DESC;
    `;

    const tests = rows.map((row) => {
      const savedClosedCount =
        toNumber(row.saved_closed_count);

      const savedOpenCount =
        toNumber(row.saved_open_count);

      const savedQuestionCount =
        toNumber(row.saved_question_count);

      return {
        id: String(row.id),
        title:
          String(row.title || "").trim() ||
          "Nomsiz test",
        description:
          row.description === null
            ? ""
            : String(row.description || ""),
        subject:
          String(row.subject || "law"),
        status:
          row.status === "published"
            ? "published"
            : "draft",

        durationMinutes:
          toNumber(row.duration_minutes),

        expectedClosedCount:
          toNumber(
            row.closed_question_count
          ),

        expectedOpenCount:
          toNumber(
            row.open_question_count
          ),

        expectedTotalCount:
          toNumber(
            row.total_question_count
          ),

        savedClosedCount,
        savedOpenCount,
        savedQuestionCount,

        attemptLimit:
          toNullableNumber(
            row.attempt_limit
          ),

        attemptCount:
          toNumber(
            row.attempt_count
          ),

        submittedCount:
          toNumber(
            row.submitted_count
          ),

        inProgressCount:
          toNumber(
            row.in_progress_count
          ),

        isComplete:
          savedQuestionCount === 45 &&
          savedClosedCount === 35 &&
          savedOpenCount === 10,

        createdAt:
          row.created_at
            ? new Date(
                String(row.created_at)
              ).toISOString()
            : null,

        updatedAt:
          row.updated_at
            ? new Date(
                String(row.updated_at)
              ).toISOString()
            : null,
      };
    });

    const total = tests.length;

    const draftCount =
      tests.filter(
        (test) =>
          test.status === "draft"
      ).length;

    const publishedCount =
      tests.filter(
        (test) =>
          test.status ===
          "published"
      ).length;

    const completeCount =
      tests.filter(
        (test) =>
          test.isComplete
      ).length;

    return NextResponse.json(
      {
        success: true,
        tests,
        statistics: {
          total,
          draftCount,
          publishedCount,
          completeCount,
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
      "NATIONAL CERTIFICATE ADMIN TESTS GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Milliy sertifikat testlarini yuklashda server xatosi yuz berdi.",
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

