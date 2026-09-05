import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const clean = (v: unknown) => String(v ?? "").trim();
const nullable = (v: unknown) => {
  const s = clean(v);
  return s || null;
};

async function requireAdmin() {
  const store = await cookies();
  return Boolean(store.get("qurbonov_session")?.value) &&
    store.get("qurbonov_role")?.value === "admin";
}

function isExcludedType(v: unknown) {
  const t = clean(v).toLowerCase();
  return t === "thematic" || t === "national-certificate" || t === "national_certificate";
}

function normalizeStatus(v: unknown) {
  return clean(v) === "published" ? "published" : "draft";
}

function normalizeAttemptLimit(v: unknown) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

function qText(q: any) {
  return clean(q?.questionText ?? q?.text ?? q?.question ?? "");
}

function qHtml(q: any) {
  return nullable(q?.questionHtml ?? q?.html);
}

function qPoints(q: any) {
  const n = Number(q?.points ?? 1);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function optKey(o: any, i: number) {
  return clean(o?.key ?? o?.label ?? o?.letter) || String.fromCharCode(65 + i);
}

function optText(o: any) {
  return clean(o?.text ?? o?.optionText ?? "");
}

function optHtml(o: any) {
  return nullable(o?.html ?? o?.optionHtml);
}

function optCorrect(o: any) {
  return Boolean(o?.isCorrect ?? o?.correct ?? o?.is_correct ?? false);
}

export async function POST(request: NextRequest) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ success: false, message: "Faqat administrator uchun." }, { status: 403 });
    }

    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, message: "tests.json fayli yuborilmadi." }, { status: 400 });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      return NextResponse.json({ success: false, message: "JSON fayl noto‘g‘ri." }, { status: 400 });
    }

    const tests = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.tests)
        ? parsed.tests
        : parsed?.test
          ? [parsed.test]
          : [];

    if (!tests.length) {
      return NextResponse.json({ success: false, message: "Faylda testlar topilmadi." }, { status: 400 });
    }

    let importedTests = 0;
    let importedQuestions = 0;
    let importedOptions = 0;
    let skipped = 0;

    for (const test of tests) {
      const id = clean(test?.id);
      if (!id || isExcludedType(test?.testType)) {
        skipped++;
        continue;
      }

      const durationRaw = Number(test?.duration ?? 30);
      const duration = Number.isFinite(durationRaw) && durationRaw > 0 ? Math.floor(durationRaw) : 30;
      const createdAt = nullable(test?.createdAt) ?? new Date().toISOString();
      const updatedAt = nullable(test?.updatedAt) ?? createdAt;

      const {
        id: _id, title: _title, subject: _subject, duration: _duration,
        description: _description, testType: _testType,
        customTestTypeName: _customTestTypeName, status: _status,
        attemptLimit: _attemptLimit, questions: _questions,
        createdAt: _createdAt, updatedAt: _updatedAt, ...testExtra
      } = test ?? {};

      await sql`
        INSERT INTO legacy_tests (
          id,title,subject,duration,description,test_type,custom_test_type_name,
          status,attempt_limit,questions_json,extra_json,created_at,updated_at
        )
        VALUES (
          ${id},
          ${clean(test?.title) || "Nomsiz test"},
          ${nullable(test?.subject)},
          ${duration},
          ${nullable(test?.description)},
          ${nullable(test?.testType)},
          ${nullable(test?.customTestTypeName)},
          ${normalizeStatus(test?.status)},
          ${normalizeAttemptLimit(test?.attemptLimit)},
          ${JSON.stringify([])}::jsonb,
          ${JSON.stringify(testExtra)}::jsonb,
          ${createdAt}::timestamptz,
          ${updatedAt}::timestamptz
        )
        ON CONFLICT (id) DO UPDATE SET
          title=EXCLUDED.title,
          subject=EXCLUDED.subject,
          duration=EXCLUDED.duration,
          description=EXCLUDED.description,
          test_type=EXCLUDED.test_type,
          custom_test_type_name=EXCLUDED.custom_test_type_name,
          status=EXCLUDED.status,
          attempt_limit=EXCLUDED.attempt_limit,
          extra_json=EXCLUDED.extra_json,
          updated_at=EXCLUDED.updated_at
      `;

      await sql`DELETE FROM legacy_test_questions WHERE test_id=${id}`;

      const questions = Array.isArray(test?.questions) ? test.questions : [];

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const {
          id: oldQId, questionText: _qt, text: _text, question: _question,
          questionHtml: _qh, html: _html, options: _opts, shapes: _shapes,
          points: _points, ...qExtra
        } = q ?? {};

        const qRows = await sql`
          INSERT INTO legacy_test_questions (
            test_id,question_number,question_text,question_html,points,
            shapes_json,extra_json,created_at,updated_at
          )
          VALUES (
            ${id},${i + 1},${qText(q)},${qHtml(q)},${qPoints(q)},
            ${JSON.stringify(Array.isArray(q?.shapes) ? q.shapes : [])}::jsonb,
            ${JSON.stringify({ ...qExtra, oldId: oldQId ?? null })}::jsonb,
            NOW(),NOW()
          )
          RETURNING id
        `;

        const questionId = Number(qRows[0]?.id);
        importedQuestions++;

        const options = Array.isArray(q?.options) ? q.options : [];

        for (let j = 0; j < options.length; j++) {
          const o = options[j];
          const {
            id: oldOId, key: _key, label: _label, letter: _letter,
            text: _ot, optionText: _optionText, html: _oh, optionHtml: _optionHtml,
            isCorrect: _c1, correct: _c2, is_correct: _c3, ...oExtra
          } = o ?? {};

          await sql`
            INSERT INTO legacy_test_options (
              question_id,option_key,option_text,option_html,is_correct,
              extra_json,created_at,updated_at
            )
            VALUES (
              ${questionId},${optKey(o,j)},${optText(o)},${optHtml(o)},${optCorrect(o)},
              ${JSON.stringify({ ...oExtra, oldId: oldOId ?? null })}::jsonb,
              NOW(),NOW()
            )
          `;
          importedOptions++;
        }
      }

      importedTests++;
    }

    return NextResponse.json({
      success: true,
      message: "Eski test backupi Neon bazasiga import qilindi.",
      importedTests,
      importedQuestions,
      importedOptions,
      skipped,
    });
  } catch (error) {
    console.error("IMPORT LEGACY BACKUP ERROR:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Backup importida server xatosi." },
      { status: 500 }
    );
  }
}

