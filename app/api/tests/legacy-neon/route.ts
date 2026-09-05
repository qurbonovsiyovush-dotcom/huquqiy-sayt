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

    const testIds: string[] = Array.from(
      new Set<string>(
        rawIds
          .map((value: unknown): string =>
            String(value || "").trim()
          )
          .filter((value: string): boolean => Boolean(value))
      )
    );

    if (action === "load-editor-page") {
      const testId = String(body?.testId || "").trim();
      const page = Math.max(1, Number(body?.page) || 1);
      const pageSize = Math.min(100, Math.max(1, Number(body?.pageSize) || 30));

      if (!testId) {
        return NextResponse.json(
          { success: false, message: "Test ID topilmadi." },
          { status: 400 }
        );
      }

      const testRows = await sql`
        SELECT
          id, title, subject, duration, description,
          test_type, custom_test_type_name, status,
          attempt_limit, created_at, updated_at
        FROM legacy_tests
        WHERE id = ${testId}
        LIMIT 1
      `;

      if (testRows.length === 0) {
        return NextResponse.json(
          { success: false, message: "Test topilmadi." },
          { status: 404 }
        );
      }

      const countRows = await sql`
        SELECT COUNT(*)::int AS count
        FROM legacy_test_questions
        WHERE test_id = ${testId}
      `;
      const totalQuestions = Number(countRows[0]?.count) || 0;
      const totalPages = Math.max(1, Math.ceil(totalQuestions / pageSize));
      const safePage = Math.min(page, totalPages);
      const startIndex = (safePage - 1) * pageSize;

      const questionRows = await sql`
        SELECT
          id, question_number, question_text, question_html,
          points, shapes_json, extra_json
        FROM legacy_test_questions
        WHERE test_id = ${testId}
        ORDER BY question_number ASC, id ASC
        LIMIT ${pageSize}
        OFFSET ${startIndex}
      `;

      const questionIds = questionRows.map((row: any) => Number(row.id));
      let optionRows: any[] = [];

      if (questionIds.length > 0) {
        optionRows = await sql`
          SELECT
            id, question_id, option_key, option_text,
            option_html, is_correct, extra_json
          FROM legacy_test_options
          WHERE question_id = ANY(${questionIds}::bigint[])
          ORDER BY question_id ASC, option_key ASC, id ASC
        `;
      }

      const optionsByQuestion = new Map<string, any[]>();
      for (const row of optionRows) {
        const key = String(row.question_id);
        const list = optionsByQuestion.get(key) || [];
        list.push({
          id: String(row.id),
          text: String(row.option_text || ""),
          html: row.option_html == null ? undefined : String(row.option_html),
          isCorrect: row.is_correct === true,
        });
        optionsByQuestion.set(key, list);
      }

      const questions = questionRows.map((row: any) => ({
        id: String(row.id),
        questionText: String(row.question_text || ""),
        questionHtml:
          row.question_html == null || String(row.question_html).trim() === ""
            ? String(row.question_text || "")
            : String(row.question_html),
        points: Number(row.points) || 1,
        shapes: Array.isArray(row.shapes_json) ? row.shapes_json : [],
        options: optionsByQuestion.get(String(row.id)) || [],
      }));

      const row: any = testRows[0];

      return NextResponse.json({
        success: true,
        test: {
          id: String(row.id),
          title: String(row.title || ""),
          subject: String(row.subject || ""),
          duration: Number(row.duration) || 30,
          description: row.description == null ? "" : String(row.description),
          status: normalizeStatus(row.status),
          testType: row.test_type == null ? undefined : String(row.test_type),
          customTestTypeName:
            row.custom_test_type_name == null
              ? undefined
              : String(row.custom_test_type_name),
          attemptLimit:
            row.attempt_limit == null ? null : Number(row.attempt_limit),
          questions,
          createdAt: row.created_at
            ? new Date(row.created_at).toISOString()
            : undefined,
          updatedAt: row.updated_at
            ? new Date(row.updated_at).toISOString()
            : undefined,
        },
        questions,
        pagination: {
          page: safePage,
          pageSize,
          totalQuestions,
          totalPages,
          startIndex,
        },
      });
    }

    if (action === "patch-test") {
      const testId = String(body?.testId || "").trim();

      if (!testId) {
        return NextResponse.json(
          { success: false, message: "Test ID topilmadi." },
          { status: 400 }
        );
      }

      const existing = await sql`
        SELECT id
        FROM legacy_tests
        WHERE id = ${testId}
        LIMIT 1
      `;

      if (existing.length === 0) {
        return NextResponse.json(
          { success: false, message: "Test topilmadi." },
          { status: 404 }
        );
      }

      const title =
        typeof body?.title === "string" ? body.title.trim() : null;
      const subject =
        typeof body?.subject === "string" ? body.subject.trim() : null;
      const description =
        typeof body?.description === "string" ? body.description : null;
      const duration =
        body?.duration == null ? null : Math.max(1, Number(body.duration) || 30);
      const status =
        body?.status == null ? null : normalizeStatus(body.status);

      await sql`
        UPDATE legacy_tests
        SET
          title = COALESCE(${title}, title),
          subject = COALESCE(${subject}, subject),
          duration = COALESCE(${duration}, duration),
          description = COALESCE(${description}, description),
          status = COALESCE(${status}, status),
          updated_at = NOW()
        WHERE id = ${testId}
      `;

      const deletedQuestionIds: string[] = Array.isArray(body?.deletedQuestionIds)
        ? body.deletedQuestionIds
            .map((value: unknown) => String(value || "").trim())
            .filter((value: string) => Boolean(value))
        : [];

      for (const questionId of deletedQuestionIds) {
        await sql`
          DELETE FROM legacy_test_questions
          WHERE test_id = ${testId}
            AND id = ${questionId}
        `;
      }

      const changedQuestions: any[] = Array.isArray(body?.changedQuestions)
        ? body.changedQuestions
        : [];

      for (const question of changedQuestions) {
        const rawQuestionId = String(question?.id || "").trim();
        const questionText = String(
          question?.questionText ??
            question?.questionHtml?.replace?.(/<[^>]*>/g, " ") ??
            ""
        ).trim();
        const questionHtml = String(question?.questionHtml || "");
        const points = Number(question?.points) || 1;
        const shapes = Array.isArray(question?.shapes) ? question.shapes : [];

        const numericQuestionId = /^\d+$/.test(rawQuestionId)
          ? rawQuestionId
          : null;

        let savedQuestionId: string | null = null;

        if (numericQuestionId) {
          const updatedQuestion = await sql`
            UPDATE legacy_test_questions
            SET
              question_text = ${questionText},
              question_html = ${questionHtml},
              points = ${points},
              shapes_json = ${JSON.stringify(shapes)}::jsonb,
              updated_at = NOW()
            WHERE id = ${numericQuestionId}
              AND test_id = ${testId}
            RETURNING id
          `;
          if (updatedQuestion.length > 0) {
            savedQuestionId = String(updatedQuestion[0].id);
          }
        }

        if (!savedQuestionId) {
          const maxRows = await sql`
            SELECT COALESCE(MAX(question_number), 0)::int AS max_number
            FROM legacy_test_questions
            WHERE test_id = ${testId}
          `;
          const nextNumber = (Number(maxRows[0]?.max_number) || 0) + 1;

          const insertedQuestion = await sql`
            INSERT INTO legacy_test_questions (
              test_id, question_number, question_text,
              question_html, points, shapes_json
            )
            VALUES (
              ${testId}, ${nextNumber}, ${questionText},
              ${questionHtml}, ${points},
              ${JSON.stringify(shapes)}::jsonb
            )
            RETURNING id
          `;
          savedQuestionId = String(insertedQuestion[0].id);
        }

        await sql`
          DELETE FROM legacy_test_options
          WHERE question_id = ${savedQuestionId}
        `;

        const options: any[] = Array.isArray(question?.options)
          ? question.options
          : [];

        for (let index = 0; index < options.length; index += 1) {
          const option = options[index];
          const optionKey = String.fromCharCode(65 + index);
          const optionText = String(option?.text ?? option?.optionText ?? "");
          const optionHtml =
            typeof option?.html === "string" ? option.html : null;
          const isCorrect = option?.isCorrect === true || option?.correct === true;

          await sql`
            INSERT INTO legacy_test_options (
              question_id, option_key, option_text,
              option_html, is_correct
            )
            VALUES (
              ${savedQuestionId}, ${optionKey}, ${optionText},
              ${optionHtml}, ${isCorrect}
            )
          `;
        }
      }

      const countRows = await sql`
        SELECT COUNT(*)::int AS count
        FROM legacy_test_questions
        WHERE test_id = ${testId}
      `;

      return NextResponse.json({
        success: true,
        testId,
        changedCount: changedQuestions.length,
        deletedCount: deletedQuestionIds.length,
        questionCount: Number(countRows[0]?.count) || 0,
      });
    }

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
