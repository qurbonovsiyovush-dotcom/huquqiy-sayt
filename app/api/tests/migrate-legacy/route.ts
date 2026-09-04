import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { get, list } from "@vercel/blob";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const TESTS_BLOB_PATH = "huquqiy-sayt/tests.json";
const IMPORT_ROOT = "huquqiy-sayt/test-imports";
const IMPORT_FINAL_SUFFIX = "/final.json";

type LegacyTest = {
  id?: unknown;
  title?: unknown;
  subject?: unknown;
  duration?: unknown;
  description?: unknown;
  testType?: unknown;
  customTestTypeName?: unknown;
  status?: unknown;
  questions?: unknown;
  attemptLimit?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  [key: string]: unknown;
};

type NormalizedOption = {
  option_key: string;
  option_text: string;
  option_html: string | null;
  is_correct: boolean;
  extra_json: Record<string, unknown>;
};

type NormalizedQuestion = {
  question_number: number;
  question_text: string;
  question_html: string | null;
  points: number;
  shapes_json: unknown[];
  extra_json: Record<string, unknown>;
  options: NormalizedOption[];
};

function noCacheHeaders() {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };
}

async function isAdmin() {
  const cookieStore = await cookies();

  return (
    Boolean(cookieStore.get("qurbonov_session")?.value) &&
    cookieStore.get("qurbonov_role")?.value === "admin"
  );
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNullableString(value: unknown) {
  const valueString = asString(value);
  return valueString ? valueString : null;
}

function asPositiveInt(value: unknown, fallback: number) {
  const n = Number(value);

  if (!Number.isFinite(n) || n < 1) {
    return fallback;
  }

  return Math.floor(n);
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

  const n = Number(value);

  if (!Number.isFinite(n) || n < 1) {
    return null;
  }

  return Math.floor(n);
}

function normalizeStatus(value: unknown): "draft" | "published" {
  return value === "published" ? "published" : "draft";
}

function pickQuestionText(question: Record<string, unknown>) {
  return (
    asString(question.questionText) ||
    asString(question.text) ||
    asString(question.question) ||
    ""
  );
}

function pickQuestionHtml(question: Record<string, unknown>) {
  return (
    asNullableString(question.questionHtml) ||
    asNullableString(question.html)
  );
}

function normalizeShapes(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeOptions(value: unknown): NormalizedOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((raw, index): NormalizedOption | null => {
      if (!raw || typeof raw !== "object") {
        return null;
      }

      const option = raw as Record<string, unknown>;

      const fallbackKey = String.fromCharCode(65 + index);
      const optionKey =
        asString(option.key) ||
        asString(option.optionKey) ||
        asString(option.label) ||
        fallbackKey;

      const optionText =
        asString(option.text) ||
        asString(option.optionText) ||
        asString(option.value);

      const optionHtml =
        asNullableString(option.html) ||
        asNullableString(option.optionHtml);

      const isCorrect =
        option.isCorrect === true || option.correct === true;

      const {
        key,
        optionKey: _optionKey,
        label,
        text,
        optionText: _optionText,
        value: _value,
        html,
        optionHtml: _optionHtml,
        isCorrect: _isCorrect,
        correct,
        ...extra
      } = option;

      return {
        option_key: optionKey,
        option_text: optionText,
        option_html: optionHtml,
        is_correct: isCorrect,
        extra_json: extra,
      };
    })
    .filter((item): item is NormalizedOption => Boolean(item));
}

function normalizeQuestions(value: unknown): NormalizedQuestion[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((raw, index): NormalizedQuestion | null => {
      if (!raw || typeof raw !== "object") {
        return null;
      }

      const question = raw as Record<string, unknown>;

      const explicitNumber = Number(
        question.questionNumber ?? question.number
      );

      const questionNumber =
        Number.isFinite(explicitNumber) && explicitNumber > 0
          ? Math.floor(explicitNumber)
          : index + 1;

      const questionText = pickQuestionText(question);
      const questionHtml = pickQuestionHtml(question);

      const pointsRaw = Number(question.points);
      const points =
        Number.isFinite(pointsRaw) && pointsRaw > 0 ? pointsRaw : 1;

      const shapes = normalizeShapes(question.shapes);
      const options = normalizeOptions(question.options);

      const {
        questionNumber: _questionNumber,
        number: _number,
        questionText: _questionText,
        text: _text,
        question: _question,
        questionHtml: _questionHtml,
        html: _html,
        points: _points,
        shapes: _shapes,
        options: _options,
        ...extra
      } = question;

      return {
        question_number: questionNumber,
        question_text: questionText,
        question_html: questionHtml,
        points,
        shapes_json: shapes,
        extra_json: extra,
        options,
      };
    })
    .filter((item): item is NormalizedQuestion => Boolean(item));
}

async function readPrivateJson(pathname: string) {
  const result = await get(pathname, {
    access: "private",
  });

  if (!result || result.statusCode !== 200 || !result.stream) {
    const error = new Error(
      `Blob o‘qilmadi: ${pathname}. Status: ${
        result?.statusCode ?? "noma’lum"
      }`
    );

    (error as Error & { statusCode?: number }).statusCode =
      result?.statusCode;

    throw error;
  }

  const text = await new Response(result.stream).text();

  if (!text.trim()) {
    throw new Error(`Blob bo‘sh: ${pathname}`);
  }

  return JSON.parse(text);
}

async function readLegacyTestsWithFinalOverlay(): Promise<{
  tests: LegacyTest[];
  finalOverlayCount: number;
  finalOverlayWarning: string | null;
}> {
  const parsed = await readPrivateJson(TESTS_BLOB_PATH);

  if (!Array.isArray(parsed)) {
    throw new Error("Eski tests.json formati noto‘g‘ri.");
  }

  const baseTests = parsed as LegacyTest[];
  const byId = new Map<string, LegacyTest>();

  for (const item of baseTests) {
    const id = asString(item?.id);

    if (id) {
      byId.set(id, item);
    }
  }

  let finalOverlayCount = 0;
  let finalOverlayWarning: string | null = null;

  try {
    const listed = await list({
      prefix: `${IMPORT_ROOT}/`,
      limit: 1000,
    });

    const finalBlobs = listed.blobs.filter((blob) =>
      blob.pathname.endsWith(IMPORT_FINAL_SUFFIX)
    );

    for (const blob of finalBlobs) {
      try {
        const finalTest = (await readPrivateJson(
          blob.pathname
        )) as LegacyTest;

        const id = asString(finalTest?.id);

        if (!id) {
          continue;
        }

        const current = byId.get(id);
        const currentCount = Array.isArray(current?.questions)
          ? current!.questions!.length
          : 0;
        const finalCount = Array.isArray(finalTest?.questions)
          ? finalTest.questions.length
          : 0;

        if (!current || finalCount > currentCount) {
          byId.set(id, finalTest);
          finalOverlayCount += 1;
        }
      } catch (error) {
        console.warn(
          "Legacy final.json o‘qilmadi:",
          blob.pathname,
          error
        );
      }
    }
  } catch (error) {
    finalOverlayWarning =
      error instanceof Error
        ? error.message
        : "final.json ro‘yxatini o‘qib bo‘lmadi.";
  }

  return {
    tests: [...byId.values()],
    finalOverlayCount,
    finalOverlayWarning,
  };
}

function shouldSkipAlreadyMigratedTest(test: LegacyTest) {
  const type = asString(test.testType).toLowerCase();

  return (
    type === "thematic" ||
    type === "national-certificate" ||
    type === "national_certificate"
  );
}

async function migrateOneTest(test: LegacyTest) {
  const id = asString(test.id);

  if (!id) {
    throw new Error("Test ID yo‘q.");
  }

  const title = asString(test.title) || "Nomsiz test";
  const subject = asNullableString(test.subject);
  const duration = asPositiveInt(test.duration, 30);
  const description = asNullableString(test.description);
  const testType = asNullableString(test.testType);
  const customTestTypeName = asNullableString(
    test.customTestTypeName
  );
  const status = normalizeStatus(test.status);
  const attemptLimit = normalizeAttemptLimit(test.attemptLimit);

  const questions = normalizeQuestions(test.questions);

  const {
    id: _id,
    title: _title,
    subject: _subject,
    duration: _duration,
    description: _description,
    testType: _testType,
    customTestTypeName: _customTestTypeName,
    status: _status,
    questions: _questions,
    attemptLimit: _attemptLimit,
    createdAt,
    updatedAt,
    ...extra
  } = test;

  const createdAtValue =
    asNullableString(createdAt) ?? new Date().toISOString();

  const updatedAtValue =
    asNullableString(updatedAt) ?? new Date().toISOString();

  await sql`
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
      ${id},
      ${title},
      ${subject},
      ${duration},
      ${description},
      ${testType},
      ${customTestTypeName},
      ${status},
      ${attemptLimit},
      ${JSON.stringify([])}::jsonb,
      ${JSON.stringify(extra)}::jsonb,
      ${createdAtValue}::timestamptz,
      ${updatedAtValue}::timestamptz
    )
    ON CONFLICT (id)
    DO UPDATE SET
      title = EXCLUDED.title,
      subject = EXCLUDED.subject,
      duration = EXCLUDED.duration,
      description = EXCLUDED.description,
      test_type = EXCLUDED.test_type,
      custom_test_type_name = EXCLUDED.custom_test_type_name,
      status = EXCLUDED.status,
      attempt_limit = EXCLUDED.attempt_limit,
      extra_json = EXCLUDED.extra_json,
      updated_at = EXCLUDED.updated_at
  `;

  /*
    Qayta migration qilinsa dublikat hosil bo‘lmasligi uchun
    shu testning eski savollari o‘chiriladi.
    Options ON DELETE CASCADE orqali avtomatik o‘chadi.
  */
  await sql`
    DELETE FROM legacy_test_questions
    WHERE test_id = ${id}
  `;

  if (questions.length === 0) {
    return {
      id,
      title,
      questionCount: 0,
      optionCount: 0,
    };
  }

  const questionPayload = questions.map((question) => ({
    question_number: question.question_number,
    question_text: question.question_text,
    question_html: question.question_html,
    points: question.points,
    shapes_json: question.shapes_json,
    extra_json: question.extra_json,
  }));

  await sql`
    INSERT INTO legacy_test_questions (
      test_id,
      question_number,
      question_text,
      question_html,
      points,
      shapes_json,
      extra_json
    )
    SELECT
      ${id},
      q.question_number,
      q.question_text,
      q.question_html,
      q.points,
      COALESCE(q.shapes_json, '[]'::jsonb),
      COALESCE(q.extra_json, '{}'::jsonb)
    FROM jsonb_to_recordset(
      ${JSON.stringify(questionPayload)}::jsonb
    ) AS q(
      question_number integer,
      question_text text,
      question_html text,
      points numeric,
      shapes_json jsonb,
      extra_json jsonb
    )
  `;

  const questionIds = await sql`
    SELECT id, question_number
    FROM legacy_test_questions
    WHERE test_id = ${id}
    ORDER BY question_number
  `;

  const idByNumber = new Map<number, number>();

  for (const row of questionIds) {
    idByNumber.set(
      Number(row.question_number),
      Number(row.id)
    );
  }

  const optionPayload: Array<{
    question_id: number;
    option_key: string;
    option_text: string;
    option_html: string | null;
    is_correct: boolean;
    extra_json: Record<string, unknown>;
  }> = [];

  for (const question of questions) {
    const questionId = idByNumber.get(question.question_number);

    if (!questionId) {
      continue;
    }

    for (const option of question.options) {
      optionPayload.push({
        question_id: questionId,
        option_key: option.option_key,
        option_text: option.option_text,
        option_html: option.option_html,
        is_correct: option.is_correct,
        extra_json: option.extra_json,
      });
    }
  }

  if (optionPayload.length > 0) {
    await sql`
      INSERT INTO legacy_test_options (
        question_id,
        option_key,
        option_text,
        option_html,
        is_correct,
        extra_json
      )
      SELECT
        o.question_id,
        o.option_key,
        o.option_text,
        o.option_html,
        o.is_correct,
        COALESCE(o.extra_json, '{}'::jsonb)
      FROM jsonb_to_recordset(
        ${JSON.stringify(optionPayload)}::jsonb
      ) AS o(
        question_id bigint,
        option_key varchar(10),
        option_text text,
        option_html text,
        is_correct boolean,
        extra_json jsonb
      )
    `;
  }

  return {
    id,
    title,
    questionCount: questions.length,
    optionCount: optionPayload.length,
  };
}

export async function POST(_request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        {
          success: false,
          message: "Bu amal faqat administrator uchun.",
        },
        {
          status: 403,
          headers: noCacheHeaders(),
        }
      );
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        {
          success: false,
          code: "BLOB_TOKEN_MISSING",
          message: "BLOB_READ_WRITE_TOKEN topilmadi.",
        },
        {
          status: 500,
          headers: noCacheHeaders(),
        }
      );
    }

    const {
      tests,
      finalOverlayCount,
      finalOverlayWarning,
    } = await readLegacyTestsWithFinalOverlay();

    const candidates = tests.filter(
      (test) => !shouldSkipAlreadyMigratedTest(test)
    );

    const skippedAlreadyMigrated =
      tests.length - candidates.length;

    const migrated: Array<{
      id: string;
      title: string;
      questionCount: number;
      optionCount: number;
    }> = [];

    const failed: Array<{
      id: string;
      title: string;
      error: string;
    }> = [];

    for (const test of candidates) {
      try {
        const result = await migrateOneTest(test);
        migrated.push(result);
      } catch (error) {
        failed.push({
          id: asString(test.id),
          title: asString(test.title) || "Nomsiz test",
          error:
            error instanceof Error
              ? error.message
              : "Noma’lum migration xatosi.",
        });
      }
    }

    const totalQuestions = migrated.reduce(
      (sum, item) => sum + item.questionCount,
      0
    );

    const totalOptions = migrated.reduce(
      (sum, item) => sum + item.optionCount,
      0
    );

    return NextResponse.json(
      {
        success: failed.length === 0,
        message:
          failed.length === 0
            ? "Eski testlar Neon bazasiga ko‘chirildi."
            : "Migration yakunlandi, ammo ayrim testlarda xato bo‘ldi.",
        sourceTestCount: tests.length,
        candidateCount: candidates.length,
        migratedTestCount: migrated.length,
        failedTestCount: failed.length,
        skippedAlreadyMigrated,
        totalQuestions,
        totalOptions,
        finalOverlayCount,
        finalOverlayWarning,
        migrated,
        failed,
      },
      {
        status: failed.length === 0 ? 200 : 207,
        headers: noCacheHeaders(),
      }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Migration vaqtida noma’lum xatolik.";

    const lower = message.toLowerCase();

    const blobBlocked =
      lower.includes("403") ||
      lower.includes("forbidden") ||
      lower.includes("limit");

    return NextResponse.json(
      {
        success: false,
        code: blobBlocked
          ? "BLOB_LIMIT_OR_FORBIDDEN"
          : "MIGRATION_FAILED",
        message: blobBlocked
          ? "Vercel Blob hozir 403/Limits reached sabab eski tests.json ni o‘qishga ruxsat bermadi. Ma’lumot o‘chmagan bo‘lishi mumkin; Blob qayta o‘qiladigan bo‘lsa shu migration route qayta ishlatiladi."
          : message,
        detail: message,
      },
      {
        status: blobBlocked ? 503 : 500,
        headers: noCacheHeaders(),
      }
    );
  }
}

