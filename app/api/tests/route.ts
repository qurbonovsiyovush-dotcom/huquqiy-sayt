import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type TestStatus = "draft" | "published";

type IncomingOption = {
  id?: unknown;
  label?: unknown;
  text?: unknown;
  optionText?: unknown;
  html?: unknown;
  isCorrect?: unknown;
  correct?: unknown;
};

type IncomingQuestion = {
  id?: unknown;
  number?: unknown;
  questionText?: unknown;
  questionHtml?: unknown;
  points?: unknown;
  shapes?: unknown;
  options?: IncomingOption[];
};

function normalizeStatus(value: unknown): TestStatus {
  return value === "published" ? "published" : "draft";
}

function normalizeAttemptLimit(value: unknown): number | null {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    value === "unlimited"
  ) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return null;
  }

  return Math.floor(parsed);
}

function normalizePositiveInt(value: unknown, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.max(1, Math.floor(parsed));
}

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function optionKey(index: number, option?: IncomingOption) {
  const incoming = String(option?.label ?? "")
    .trim()
    .toUpperCase();

  if (/^[A-Z]$/.test(incoming)) {
    return incoming;
  }

  return String.fromCharCode(65 + index);
}

function questionTextFromIncoming(question: IncomingQuestion) {
  return String(
    question?.questionText ?? question?.questionHtml ?? ""
  ).trim();
}

function questionHtmlFromIncoming(question: IncomingQuestion) {
  const text = questionTextFromIncoming(question);
  return String(question?.questionHtml ?? text);
}

function optionTextFromIncoming(option: IncomingOption) {
  return String(option?.optionText ?? option?.text ?? "");
}

function optionHtmlFromIncoming(option: IncomingOption) {
  const text = optionTextFromIncoming(option);
  const html = String(option?.html ?? "");
  return html || text;
}

function optionIsCorrect(option: IncomingOption) {
  return option?.isCorrect === true || option?.correct === true;
}

function normalizeTestIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
    )
  );
}

function normalizeNumericIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) => String(item ?? "").trim())
        .filter((item) => /^\d+$/.test(item))
    )
  );
}

async function isAdmin() {
  const cookieStore = await cookies();

  return Boolean(
    cookieStore.get("qurbonov_session")?.value &&
      cookieStore.get("qurbonov_role")?.value === "admin"
  );
}

async function requireAdmin() {
  if (await isAdmin()) {
    return null;
  }

  return NextResponse.json(
    {
      success: false,
      message: "Bu amal faqat administrator uchun.",
    },
    { status: 403 }
  );
}

async function getQuestionCount(testId: string | number) {
  const rows = await sql`
    SELECT COUNT(*)::int AS count
    FROM legacy_test_questions
    WHERE test_id = ${testId}
  `;

  return Number(rows[0]?.count || 0);
}

async function insertQuestion(
  testId: string | number,
  questionNumber: number,
  question: IncomingQuestion
) {
  const questionText = questionTextFromIncoming(question);
  const questionHtml = questionHtmlFromIncoming(question);
  const shapes = Array.isArray(question?.shapes) ? question.shapes : [];
  const points = normalizePositiveInt(question?.points, 1);

  const inserted = await sql`
    INSERT INTO legacy_test_questions (
      test_id,
      question_number,
      question_text,
      question_html,
      points,
      shapes_json,
      extra_json,
      created_at,
      updated_at
    )
    VALUES (
      ${testId},
      ${questionNumber},
      ${questionText},
      ${questionHtml},
      ${points},
      ${JSON.stringify(shapes)}::jsonb,
      ${JSON.stringify({ sourceId: question?.id ?? null })}::jsonb,
      NOW(),
      NOW()
    )
    RETURNING id
  `;

  const questionId = Number(inserted[0]?.id);
  if (!Number.isFinite(questionId)) {
    throw new Error(`${questionNumber}-savolni Neon bazaga yozib bo‘lmadi.`);
  }

  const options = Array.isArray(question?.options) ? question.options : [];

  for (let optionIndex = 0; optionIndex < options.length; optionIndex++) {
    const option = options[optionIndex] || {};

    await sql`
      INSERT INTO legacy_test_options (
        question_id,
        option_key,
        option_text,
        option_html,
        is_correct,
        extra_json,
        created_at,
        updated_at
      )
      VALUES (
        ${questionId},
        ${optionKey(optionIndex, option)},
        ${optionTextFromIncoming(option)},
        ${optionHtmlFromIncoming(option)},
        ${optionIsCorrect(option)},
        ${JSON.stringify({ sourceId: option?.id ?? null })}::jsonb,
        NOW(),
        NOW()
      )
    `;
  }

  return questionId;
}

async function readOneTest(testId: string | number) {
  const testRows = await sql`
    SELECT
      id,
      title,
      subject,
      duration,
      description,
      test_type,
      custom_test_type_name,
      status,
      attempt_limit,
      extra_json,
      created_at,
      updated_at
    FROM legacy_tests
    WHERE id = ${testId}
    LIMIT 1
  `;

  if (testRows.length === 0) {
    return null;
  }

  const testRow: any = testRows[0];

  const questionRows: any[] = await sql`
    SELECT
      id,
      question_number,
      question_text,
      question_html,
      points,
      shapes_json,
      extra_json
    FROM legacy_test_questions
    WHERE test_id = ${testId}
    ORDER BY question_number ASC, id ASC
  `;

  const optionsByQuestion = new Map<string, any[]>();

  if (questionRows.length > 0) {
    const optionRows: any[] = await sql`
      SELECT
        o.id,
        o.question_id,
        o.option_key,
        o.option_text,
        o.option_html,
        o.is_correct,
        o.extra_json
      FROM legacy_test_options o
      JOIN legacy_test_questions q ON q.id = o.question_id
      WHERE q.test_id = ${testId}
      ORDER BY
        q.question_number ASC,
        q.id ASC,
        o.option_key ASC,
        o.id ASC
    `;

    for (const row of optionRows) {
      const key = String(row.question_id);
      const current = optionsByQuestion.get(key) || [];

      current.push({
        id: String(row.id),
        label: String(row.option_key || ""),
        text: String(row.option_text || row.option_html || ""),
        optionText: String(row.option_text || ""),
        html: String(row.option_html || row.option_text || ""),
        isCorrect: row.is_correct === true,
        correct: row.is_correct === true,
        ...asObject(row.extra_json),
      });

      optionsByQuestion.set(key, current);
    }
  }

  const questions = questionRows.map((row: any) => ({
    id: String(row.id),
    number: Number(row.question_number) || 0,
    questionText: String(row.question_text || ""),
    questionHtml: String(row.question_html || row.question_text || ""),
    points: Number(row.points) || 1,
    shapes: Array.isArray(row.shapes_json) ? row.shapes_json : [],
    options: optionsByQuestion.get(String(row.id)) || [],
    ...asObject(row.extra_json),
  }));

  return {
    id: String(testRow.id),
    title: String(testRow.title || ""),
    subject: String(testRow.subject || ""),
    duration: Number(testRow.duration) || 30,
    description: String(testRow.description || ""),
    testType:
      testRow.test_type == null ? undefined : String(testRow.test_type),
    customTestTypeName:
      testRow.custom_test_type_name == null
        ? undefined
        : String(testRow.custom_test_type_name),
    status: normalizeStatus(testRow.status),
    attemptLimit:
      testRow.attempt_limit == null ? null : Number(testRow.attempt_limit),
    questions,
    questionCount: questions.length,
    storage: "legacy",
    createdAt: testRow.created_at
      ? new Date(testRow.created_at).toISOString()
      : undefined,
    updatedAt: testRow.updated_at
      ? new Date(testRow.updated_at).toISOString()
      : undefined,
    ...asObject(testRow.extra_json),
  };
}

/* =========================================================
   GET — Vercel Blob EMAS, Neon legacy_tests
========================================================= */

export async function GET() {
  try {
    const rows: any[] = await sql`
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
        t.extra_json,
        t.created_at,
        t.updated_at,
        COUNT(q.id)::int AS question_count
      FROM legacy_tests t
      LEFT JOIN legacy_test_questions q ON q.test_id = t.id
      GROUP BY t.id
      ORDER BY COALESCE(t.updated_at, t.created_at) DESC, t.id DESC
    `;

    const tests = rows.map((row: any) => ({
      id: String(row.id),
      title: String(row.title || ""),
      subject: String(row.subject || ""),
      duration: Number(row.duration) || 30,
      description: String(row.description || ""),
      testType: row.test_type == null ? undefined : String(row.test_type),
      customTestTypeName:
        row.custom_test_type_name == null
          ? undefined
          : String(row.custom_test_type_name),
      status: normalizeStatus(row.status),
      attemptLimit:
        row.attempt_limit == null ? null : Number(row.attempt_limit),
      questionCount: Number(row.question_count) || 0,
      questions: [],
      storage: "legacy",
      createdAt: row.created_at
        ? new Date(row.created_at).toISOString()
        : undefined,
      updatedAt: row.updated_at
        ? new Date(row.updated_at).toISOString()
        : undefined,
      ...asObject(row.extra_json),
    }));

    return NextResponse.json(
      { success: true, tests },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("GET /api/tests NEON ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Testlarni Neon bazadan yuklab bo‘lmadi.",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   CREATE CHUNKED TEST
========================================================= */

async function createChunkedTest(body: any) {
  const title = String(body?.title || "").trim();
  const subject = String(body?.subject || "").trim();

  if (!title) {
    return NextResponse.json(
      { success: false, message: "Test nomi kiritilmagan." },
      { status: 400 }
    );
  }

  const expectedQuestions = normalizePositiveInt(body?.expectedQuestions, 1);
  const importState = {
    mode: "chunked",
    expectedQuestions,
    receivedQuestions: 0,
    completed: false,
  };

  const newTestId = randomUUID();

  const inserted = await sql`
    INSERT INTO legacy_tests (
      id,
      title,
      subject,
      duration,
      description,
      test_type,
      custom_test_type_name,
      status,
      attempt_limit,
      questions_json,
      extra_json,
      created_at,
      updated_at
    )
    VALUES (
      ${newTestId},
      ${title},
      ${subject},
      ${normalizePositiveInt(body?.duration, 30)},
      ${String(body?.description || "")},
      ${body?.testType ? String(body.testType) : null},
      ${body?.customTestTypeName ? String(body.customTestTypeName) : null},
      'draft',
      ${normalizeAttemptLimit(body?.attemptLimit)},
      '[]'::jsonb,
      ${JSON.stringify({ importState })}::jsonb,
      NOW(),
      NOW()
    )
    RETURNING id
  `;

  const testId = String(inserted[0]?.id || "");
  if (!testId) {
    throw new Error("Yangi test ID olinmadi.");
  }

  return NextResponse.json(
    {
      success: true,
      testId,
      receivedQuestions: 0,
      expectedQuestions,
    },
    { status: 201 }
  );
}

/* =========================================================
   APPEND QUESTIONS
   Idempotent: aynan shu question_number oralig‘i avval o‘chiriladi.
========================================================= */

async function appendQuestionsChunk(body: any) {
  const testId = String(body?.testId || "").trim();
  const startIndex = Number(body?.startIndex);
  const chunk: IncomingQuestion[] = Array.isArray(body?.questions)
    ? body.questions
    : [];

  if (!testId) {
    return NextResponse.json(
      { success: false, message: "testId noto‘g‘ri." },
      { status: 400 }
    );
  }

  if (!Number.isInteger(startIndex) || startIndex < 0) {
    return NextResponse.json(
      { success: false, message: "startIndex noto‘g‘ri." },
      { status: 400 }
    );
  }

  if (chunk.length === 0) {
    return NextResponse.json(
      { success: false, message: "Savollar bo‘lagi bo‘sh." },
      { status: 400 }
    );
  }

  const testRows: any[] = await sql`
    SELECT id, extra_json
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

  const extra = asObject(testRows[0].extra_json);
  const importState = asObject(extra.importState);
  const expectedQuestions = Number(importState.expectedQuestions || 0);

  if (
    expectedQuestions > 0 &&
    startIndex + chunk.length > expectedQuestions
  ) {
    return NextResponse.json(
      {
        success: false,
        message: `Savollar soni kutilgan miqdordan oshmoqda: ${
          startIndex + chunk.length
        }/${expectedQuestions}.`,
      },
      { status: 400 }
    );
  }

  const fromQuestion = startIndex + 1;
  const toQuestion = startIndex + chunk.length;

  await sql`
    DELETE FROM legacy_test_questions
    WHERE test_id = ${testId}
      AND question_number BETWEEN ${fromQuestion} AND ${toQuestion}
  `;

  for (let index = 0; index < chunk.length; index++) {
    await insertQuestion(testId, startIndex + index + 1, chunk[index]);
  }

  const receivedQuestions = await getQuestionCount(testId);

  const nextExtra = {
    ...extra,
    importState: {
      ...importState,
      mode: "chunked",
      expectedQuestions: expectedQuestions || Math.max(receivedQuestions, toQuestion),
      receivedQuestions,
      completed: false,
    },
  };

  await sql`
    UPDATE legacy_tests
    SET
      extra_json = ${JSON.stringify(nextExtra)}::jsonb,
      updated_at = NOW()
    WHERE id = ${testId}
  `;

  return NextResponse.json({
    success: true,
    testId,
    receivedQuestions,
    expectedQuestions: expectedQuestions || null,
    remaining:
      expectedQuestions > 0
        ? Math.max(0, expectedQuestions - receivedQuestions)
        : null,
  });
}

/* =========================================================
   FINALIZE CHUNKED TEST
========================================================= */

async function finalizeChunkedTest(body: any) {
  const testId = String(body?.testId || "").trim();

  if (!testId) {
    return NextResponse.json(
      { success: false, message: "testId noto‘g‘ri." },
      { status: 400 }
    );
  }

  const rows: any[] = await sql`
    SELECT id, extra_json
    FROM legacy_tests
    WHERE id = ${testId}
    LIMIT 1
  `;

  if (rows.length === 0) {
    return NextResponse.json(
      { success: false, message: "Test topilmadi." },
      { status: 404 }
    );
  }

  const extra = asObject(rows[0].extra_json);
  const importState = asObject(extra.importState);
  const expectedQuestions = Number(importState.expectedQuestions || 0);
  const receivedQuestions = await getQuestionCount(testId);

  if (expectedQuestions > 0 && receivedQuestions !== expectedQuestions) {
    return NextResponse.json(
      {
        success: false,
        message: `Test hali to‘liq saqlanmagan. ${receivedQuestions}/${expectedQuestions} ta savol Neon bazada mavjud.`,
        receivedQuestions,
        expectedQuestions,
      },
      { status: 409 }
    );
  }

  const finalStatus = normalizeStatus(body?.status);
  const nextExtra = {
    ...extra,
    importState: {
      ...importState,
      mode: "chunked",
      expectedQuestions: expectedQuestions || receivedQuestions,
      receivedQuestions,
      completed: true,
    },
  };

  await sql`
    UPDATE legacy_tests
    SET
      status = ${finalStatus},
      extra_json = ${JSON.stringify(nextExtra)}::jsonb,
      updated_at = NOW()
    WHERE id = ${testId}
  `;

  return NextResponse.json({
    success: true,
    message: "Test Neon bazasiga to‘liq saqlandi.",
    testId,
    receivedQuestions,
    expectedQuestions: expectedQuestions || receivedQuestions,
    status: finalStatus,
  });
}

/* =========================================================
   BULK PUBLISH
========================================================= */

async function bulkPublishTests(body: any) {
  const testIds = normalizeTestIds(body?.testIds);

  if (testIds.length === 0) {
    return NextResponse.json(
      { success: false, message: "E’lon qilinadigan testlar tanlanmagan." },
      { status: 400 }
    );
  }

  const updated: any[] = await sql`
    UPDATE legacy_tests t
    SET
      status = 'published',
      updated_at = NOW()
    WHERE t.id::text = ANY(${testIds}::text[])
      AND EXISTS (
        SELECT 1
        FROM legacy_test_questions q
        WHERE q.test_id = t.id
      )
    RETURNING t.id
  `;

  const publishedIds = updated.map((row: any) => String(row.id));

  return NextResponse.json({
    success: true,
    message: `${publishedIds.length} ta test e’lon qilindi.`,
    publishedCount: publishedIds.length,
    publishedIds,
    missingCount: testIds.length - publishedIds.length,
  });
}

/* =========================================================
   BULK DELETE
========================================================= */

async function bulkDeleteTests(body: any) {
  const testIds = normalizeTestIds(body?.testIds);
  const onlyDrafts = body?.onlyDrafts !== false;

  if (testIds.length === 0) {
    return NextResponse.json(
      { success: false, message: "O‘chiriladigan testlar tanlanmagan." },
      { status: 400 }
    );
  }

  const deleted: any[] = onlyDrafts
    ? await sql`
        DELETE FROM legacy_tests
        WHERE id::text = ANY(${testIds}::text[])
          AND status = 'draft'
        RETURNING id
      `
    : await sql`
        DELETE FROM legacy_tests
        WHERE id::text = ANY(${testIds}::text[])
        RETURNING id
      `;

  const deletedIds = deleted.map((row: any) => String(row.id));

  return NextResponse.json({
    success: true,
    message: `${deletedIds.length} ta test o‘chirildi.`,
    deletedCount: deletedIds.length,
    deletedIds,
    skippedCount: testIds.length - deletedIds.length,
  });
}

/* =========================================================
   SET STATUS
========================================================= */

async function setTestStatus(body: any) {
  const testId = String(body?.testId || "").trim();
  const status = normalizeStatus(body?.status);

  if (!testId) {
    return NextResponse.json(
      { success: false, message: "Test ID noto‘g‘ri." },
      { status: 400 }
    );
  }

  if (status === "published") {
    const count = await getQuestionCount(testId);
    if (count <= 0) {
      return NextResponse.json(
        { success: false, message: "Savolsiz testni e’lon qilib bo‘lmaydi." },
        { status: 400 }
      );
    }
  }

  const updated: any[] = await sql`
    UPDATE legacy_tests
    SET
      status = ${status},
      updated_at = NOW()
    WHERE id = ${testId}
    RETURNING id, status, updated_at
  `;

  if (updated.length === 0) {
    return NextResponse.json(
      { success: false, message: "Test topilmadi." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    testId,
    status,
    updatedAt: updated[0].updated_at,
  });
}

/* =========================================================
   LOAD EDITOR PAGE
========================================================= */

async function loadEditorPage(body: any) {
  const testId = String(body?.testId || "").trim();

  if (!testId) {
    return NextResponse.json(
      { success: false, message: "Test ID noto‘g‘ri." },
      { status: 400 }
    );
  }

  const requestedPage = Math.max(1, Math.floor(Number(body?.page) || 1));
  const pageSize = Math.min(
    50,
    Math.max(10, Math.floor(Number(body?.pageSize) || 30))
  );

  const testRows: any[] = await sql`
    SELECT
      id,
      title,
      subject,
      duration,
      description,
      test_type,
      custom_test_type_name,
      status,
      attempt_limit,
      created_at,
      updated_at
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

  const totalQuestions = await getQuestionCount(testId);
  const totalPages = Math.max(1, Math.ceil(totalQuestions / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * pageSize;

  const questionRows: any[] = await sql`
    SELECT
      id,
      question_number,
      question_text,
      question_html,
      points,
      shapes_json,
      extra_json
    FROM legacy_test_questions
    WHERE test_id = ${testId}
    ORDER BY question_number ASC, id ASC
    LIMIT ${pageSize}
    OFFSET ${offset}
  `;

  const optionsByQuestion = new Map<string, any[]>();

  if (questionRows.length > 0) {
    const questionIds = questionRows.map((row: any) => String(row.id));

    const optionRows: any[] = await sql`
      SELECT
        id,
        question_id,
        option_key,
        option_text,
        option_html,
        is_correct,
        extra_json
      FROM legacy_test_options
      WHERE question_id = ANY(${questionIds}::bigint[])
      ORDER BY question_id ASC, option_key ASC, id ASC
    `;

    for (const row of optionRows) {
      const key = String(row.question_id);
      const current = optionsByQuestion.get(key) || [];
      current.push({
        id: String(row.id),
        label: String(row.option_key || ""),
        text: String(row.option_text || row.option_html || ""),
        html: String(row.option_html || row.option_text || ""),
        isCorrect: row.is_correct === true,
      });
      optionsByQuestion.set(key, current);
    }
  }

  const questions = questionRows.map((row: any) => ({
    id: String(row.id),
    number: Number(row.question_number) || 0,
    questionText: String(row.question_text || ""),
    questionHtml: String(row.question_html || row.question_text || ""),
    points: Number(row.points) || 1,
    shapes: Array.isArray(row.shapes_json) ? row.shapes_json : [],
    options: optionsByQuestion.get(String(row.id)) || [],
    ...asObject(row.extra_json),
  }));

  const testRow: any = testRows[0];

  return NextResponse.json({
    success: true,
    test: {
      id: String(testRow.id),
      title: String(testRow.title || ""),
      subject: String(testRow.subject || ""),
      duration: Number(testRow.duration) || 30,
      description: String(testRow.description || ""),
      status: normalizeStatus(testRow.status),
      testType:
        testRow.test_type == null ? undefined : String(testRow.test_type),
      customTestTypeName:
        testRow.custom_test_type_name == null
          ? undefined
          : String(testRow.custom_test_type_name),
      attemptLimit:
        testRow.attempt_limit == null ? null : Number(testRow.attempt_limit),
      createdAt: testRow.created_at,
      updatedAt: testRow.updated_at,
    },
    questions,
    pagination: {
      page,
      pageSize,
      startIndex: offset,
      totalQuestions,
      totalPages,
      from: totalQuestions === 0 ? 0 : offset + 1,
      to: Math.min(offset + pageSize, totalQuestions),
    },
  });
}

/* =========================================================
   PATCH TEST
========================================================= */

async function patchTest(body: any) {
  const testId = String(body?.testId || "").trim();

  if (!testId) {
    return NextResponse.json(
      { success: false, message: "Test ID noto‘g‘ri." },
      { status: 400 }
    );
  }

  const existingRows: any[] = await sql`
    SELECT *
    FROM legacy_tests
    WHERE id = ${testId}
    LIMIT 1
  `;

  if (existingRows.length === 0) {
    return NextResponse.json(
      { success: false, message: "Test topilmadi." },
      { status: 404 }
    );
  }

  const current: any = existingRows[0];
  const status =
    body?.status === undefined ? normalizeStatus(current.status) : normalizeStatus(body.status);

  await sql`
    UPDATE legacy_tests
    SET
      title = ${
        body?.title === undefined ? String(current.title || "") : String(body.title || "").trim()
      },
      subject = ${
        body?.subject === undefined ? String(current.subject || "") : String(body.subject || "").trim()
      },
      duration = ${
        body?.duration === undefined
          ? Number(current.duration) || 30
          : normalizePositiveInt(body.duration, 30)
      },
      description = ${
        body?.description === undefined
          ? String(current.description || "")
          : String(body.description || "")
      },
      test_type = ${
        body?.testType === undefined
          ? current.test_type
          : body?.testType
          ? String(body.testType)
          : null
      },
      custom_test_type_name = ${
        body?.customTestTypeName === undefined
          ? current.custom_test_type_name
          : body?.customTestTypeName
          ? String(body.customTestTypeName)
          : null
      },
      attempt_limit = ${
        body?.attemptLimit === undefined
          ? current.attempt_limit
          : normalizeAttemptLimit(body.attemptLimit)
      },
      status = ${status},
      updated_at = NOW()
    WHERE id = ${testId}
  `;

  const deletedQuestionIds = normalizeNumericIds(body?.deletedQuestionIds);

  if (deletedQuestionIds.length > 0) {
    await sql`
      DELETE FROM legacy_test_questions
      WHERE test_id = ${testId}
        AND id = ANY(${deletedQuestionIds}::bigint[])
    `;
  }

  const changedQuestions: IncomingQuestion[] = Array.isArray(body?.changedQuestions)
    ? body.changedQuestions
    : [];

  let nextNumber = (await getQuestionCount(testId)) + 1;
  let changedCount = 0;

  for (const question of changedQuestions) {
    const incomingId = String(question?.id ?? "").trim();
    let questionId: string | null = null;

    if (/^\d+$/.test(incomingId)) {
      const belongs: any[] = await sql`
        SELECT id, question_number
        FROM legacy_test_questions
        WHERE id = ${incomingId}
          AND test_id = ${testId}
        LIMIT 1
      `;

      if (belongs.length > 0) {
        questionId = String(belongs[0].id);

        await sql`
          UPDATE legacy_test_questions
          SET
            question_text = ${questionTextFromIncoming(question)},
            question_html = ${questionHtmlFromIncoming(question)},
            points = ${normalizePositiveInt(question?.points, 1)},
            shapes_json = ${JSON.stringify(
              Array.isArray(question?.shapes) ? question.shapes : []
            )}::jsonb,
            updated_at = NOW()
          WHERE id = ${questionId}
            AND test_id = ${testId}
        `;

        await sql`
          DELETE FROM legacy_test_options
          WHERE question_id = ${questionId}
        `;

        const options = Array.isArray(question?.options) ? question.options : [];
        for (let optionIndex = 0; optionIndex < options.length; optionIndex++) {
          const option = options[optionIndex] || {};
          await sql`
            INSERT INTO legacy_test_options (
              question_id,
              option_key,
              option_text,
              option_html,
              is_correct,
              extra_json,
              created_at,
              updated_at
            )
            VALUES (
              ${questionId},
              ${optionKey(optionIndex, option)},
              ${optionTextFromIncoming(option)},
              ${optionHtmlFromIncoming(option)},
              ${optionIsCorrect(option)},
              '{}'::jsonb,
              NOW(),
              NOW()
            )
          `;
        }
      }
    }

    if (!questionId) {
      await insertQuestion(testId, nextNumber++, question);
    }

    changedCount++;
  }

  const questionOrder = Array.isArray(body?.questionOrder)
    ? body.questionOrder.map((value: unknown) => String(value ?? "").trim())
    : [];

  if (questionOrder.length > 0) {
    const existingQuestions: any[] = await sql`
      SELECT id, extra_json
      FROM legacy_test_questions
      WHERE test_id = ${testId}
      ORDER BY question_number ASC, id ASC
    `;

    const sourceIdMap = new Map<string, string>();
    for (const row of existingQuestions) {
      sourceIdMap.set(String(row.id), String(row.id));
      const sourceId = String(asObject(row.extra_json).sourceId ?? "").trim();
      if (sourceId) sourceIdMap.set(sourceId, String(row.id));
    }

    let orderNumber = 1;
    const used = new Set<string>();

    for (const requestedId of questionOrder) {
      const realId = sourceIdMap.get(requestedId);
      if (!realId || used.has(realId)) continue;

      await sql`
        UPDATE legacy_test_questions
        SET question_number = ${orderNumber}, updated_at = NOW()
        WHERE id = ${realId}
          AND test_id = ${testId}
      `;
      used.add(realId);
      orderNumber++;
    }

    for (const row of existingQuestions) {
      const realId = String(row.id);
      if (used.has(realId)) continue;

      await sql`
        UPDATE legacy_test_questions
        SET question_number = ${orderNumber}, updated_at = NOW()
        WHERE id = ${realId}
          AND test_id = ${testId}
      `;
      orderNumber++;
    }
  }

  const questionCount = await getQuestionCount(testId);

  if (status === "published" && questionCount === 0) {
    await sql`
      UPDATE legacy_tests
      SET status = 'draft', updated_at = NOW()
      WHERE id = ${testId}
    `;

    return NextResponse.json(
      { success: false, message: "Savolsiz testni e’lon qilib bo‘lmaydi." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Testdagi o‘zgarishlar Neon bazasida saqlandi.",
    test: {
      id: testId,
      status,
      questionCount,
      updatedAt: new Date().toISOString(),
    },
    changedCount,
    deletedCount: deletedQuestionIds.length,
  });
}

/* =========================================================
   LEGACY / NORMAL POST
========================================================= */

async function createNormalTest(body: any) {
  const title = String(body?.title || "").trim();
  const subject = String(body?.subject || "").trim();
  const questions: IncomingQuestion[] = Array.isArray(body?.questions)
    ? body.questions
    : [];

  if (!title) {
    return NextResponse.json(
      { success: false, message: "Test nomi kiritilmagan." },
      { status: 400 }
    );
  }

  if (questions.length === 0) {
    return NextResponse.json(
      { success: false, message: "Kamida bitta savol bo‘lishi kerak." },
      { status: 400 }
    );
  }

  const status = normalizeStatus(body?.status);
  const newTestId = randomUUID();

  const inserted: any[] = await sql`
    INSERT INTO legacy_tests (
      id,
      title,
      subject,
      duration,
      description,
      test_type,
      custom_test_type_name,
      status,
      attempt_limit,
      questions_json,
      extra_json,
      created_at,
      updated_at
    )
    VALUES (
      ${newTestId},
      ${title},
      ${subject},
      ${normalizePositiveInt(body?.duration, 30)},
      ${String(body?.description || "")},
      ${body?.testType ? String(body.testType) : null},
      ${body?.customTestTypeName ? String(body.customTestTypeName) : null},
      ${status},
      ${normalizeAttemptLimit(body?.attemptLimit)},
      '[]'::jsonb,
      '{}'::jsonb,
      NOW(),
      NOW()
    )
    RETURNING id
  `;

  const testId = String(inserted[0]?.id || "");

  for (let index = 0; index < questions.length; index++) {
    await insertQuestion(testId, index + 1, questions[index]);
  }

  const test = await readOneTest(testId);

  return NextResponse.json(
    {
      success: true,
      message: "Test Neon bazasida yaratildi.",
      testId,
      test,
    },
    { status: 201 }
  );
}

/* =========================================================
   POST ROUTER
========================================================= */

export async function POST(request: NextRequest) {
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || "").trim();

    if (action === "create-chunked-test") {
      return await createChunkedTest(body);
    }

    if (action === "append-questions") {
      return await appendQuestionsChunk(body);
    }

    if (action === "finalize-chunked-test") {
      return await finalizeChunkedTest(body);
    }

    if (action === "bulk-publish-tests") {
      return await bulkPublishTests(body);
    }

    if (action === "bulk-delete-tests") {
      return await bulkDeleteTests(body);
    }

    if (action === "set-status") {
      return await setTestStatus(body);
    }

    if (action === "patch-test") {
      return await patchTest(body);
    }

    if (action === "load-editor-page") {
      return await loadEditorPage(body);
    }

    return await createNormalTest(body);
  } catch (error) {
    console.error("POST /api/tests NEON ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Testni Neon bazasiga saqlashda server xatosi yuz berdi.",
      },
      { status: 500 }
    );
  }
}
