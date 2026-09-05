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

async function isAdmin() {
  const store = await cookies();
  return Boolean(store.get("qurbonov_session")?.value) &&
    store.get("qurbonov_role")?.value === "admin";
}

function status(v: unknown) {
  return clean(v) === "published" ? "published" : "draft";
}

function attemptLimit(v: unknown) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

function excluded(v: unknown) {
  const t = clean(v).toLowerCase();
  return t === "thematic" || t === "national-certificate" || t === "national_certificate";
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
function oKey(o: any, i: number) {
  return clean(o?.key ?? o?.label ?? o?.letter) || String.fromCharCode(65 + i);
}
function oText(o: any) {
  return clean(o?.text ?? o?.optionText ?? "");
}
function oHtml(o: any) {
  return nullable(o?.html ?? o?.optionHtml);
}
function oCorrect(o: any) {
  return Boolean(o?.isCorrect ?? o?.correct ?? o?.is_correct ?? false);
}

async function ensureTest(test: any) {
  const id = clean(test?.id);
  if (!id || excluded(test?.testType)) return null;

  const durationRaw = Number(test?.duration ?? 30);
  const duration = Number.isFinite(durationRaw) && durationRaw > 0
    ? Math.floor(durationRaw) : 30;

  const createdAt = nullable(test?.createdAt) ?? new Date().toISOString();
  const updatedAt = nullable(test?.updatedAt) ?? createdAt;

  const {
    id: _id, title: _title, subject: _subject, duration: _duration,
    description: _description, testType: _testType,
    customTestTypeName: _customTestTypeName, status: _status,
    attemptLimit: _attemptLimit, questions: _questions,
    createdAt: _createdAt, updatedAt: _updatedAt, ...extra
  } = test ?? {};

  await sql`
    INSERT INTO legacy_tests (
      id,title,subject,duration,description,test_type,custom_test_type_name,
      status,attempt_limit,questions_json,extra_json,created_at,updated_at
    )
    VALUES (
      ${id},${clean(test?.title) || "Nomsiz test"},${nullable(test?.subject)},
      ${duration},${nullable(test?.description)},${nullable(test?.testType)},
      ${nullable(test?.customTestTypeName)},${status(test?.status)},
      ${attemptLimit(test?.attemptLimit)},${JSON.stringify([])}::jsonb,
      ${JSON.stringify(extra)}::jsonb,${createdAt}::timestamptz,${updatedAt}::timestamptz
    )
    ON CONFLICT (id) DO UPDATE SET
      title=EXCLUDED.title, subject=EXCLUDED.subject, duration=EXCLUDED.duration,
      description=EXCLUDED.description, test_type=EXCLUDED.test_type,
      custom_test_type_name=EXCLUDED.custom_test_type_name,
      status=EXCLUDED.status, attempt_limit=EXCLUDED.attempt_limit,
      extra_json=EXCLUDED.extra_json, updated_at=EXCLUDED.updated_at
  `;
  return id;
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ success:false, message:"Faqat administrator uchun." }, { status:403 });
    }

    const body = await request.json();
    const action = clean(body?.action);

    if (action === "start") {
      const test = body?.test;
      const id = await ensureTest(test);
      if (!id) {
        return NextResponse.json({ success:false, message:"Test ID topilmadi yoki bu alohida tizim testi." }, { status:400 });
      }

      await sql`DELETE FROM legacy_test_questions WHERE test_id=${id}`;

      return NextResponse.json({ success:true, testId:id });
    }

    if (action === "questions") {
      const testId = clean(body?.testId);
      const startNumber = Math.max(1, Number(body?.startNumber) || 1);
      const questions = Array.isArray(body?.questions) ? body.questions : [];

      if (!testId || !questions.length) {
        return NextResponse.json({ success:false, message:"Savollar paketi noto‘g‘ri." }, { status:400 });
      }

      let savedQuestions = 0;
      let savedOptions = 0;

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const number = startNumber + i;

        const {
          id: oldQId, questionText: _qt, text: _text, question: _question,
          questionHtml: _qh, html: _html, options: _opts, shapes: _shapes,
          points: _points, ...qExtra
        } = q ?? {};

        const rows = await sql`
          INSERT INTO legacy_test_questions (
            test_id,question_number,question_text,question_html,points,
            shapes_json,extra_json,created_at,updated_at
          )
          VALUES (
            ${testId},${number},${qText(q)},${qHtml(q)},${qPoints(q)},
            ${JSON.stringify(Array.isArray(q?.shapes) ? q.shapes : [])}::jsonb,
            ${JSON.stringify({ ...qExtra, oldId: oldQId ?? null })}::jsonb,
            NOW(),NOW()
          )
          ON CONFLICT (test_id,question_number) DO UPDATE SET
            question_text=EXCLUDED.question_text,
            question_html=EXCLUDED.question_html,
            points=EXCLUDED.points,
            shapes_json=EXCLUDED.shapes_json,
            extra_json=EXCLUDED.extra_json,
            updated_at=NOW()
          RETURNING id
        `;

        const questionId = Number(rows[0]?.id);
        await sql`DELETE FROM legacy_test_options WHERE question_id=${questionId}`;

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
              ${questionId},${oKey(o,j)},${oText(o)},${oHtml(o)},${oCorrect(o)},
              ${JSON.stringify({ ...oExtra, oldId: oldOId ?? null })}::jsonb,
              NOW(),NOW()
            )
          `;
          savedOptions++;
        }
        savedQuestions++;
      }

      return NextResponse.json({ success:true, savedQuestions, savedOptions });
    }

    if (action === "finish") {
      const testId = clean(body?.testId);
      const rows = await sql`
        SELECT COUNT(*)::int AS count
        FROM legacy_test_questions
        WHERE test_id=${testId}
      `;
      return NextResponse.json({
        success:true,
        testId,
        questionCount:Number(rows[0]?.count ?? 0)
      });
    }

    return NextResponse.json({ success:false, message:"Noma’lum amal." }, { status:400 });
  } catch (error) {
    console.error("CHUNKED BACKUP IMPORT ERROR:", error);
    return NextResponse.json(
      { success:false, message:error instanceof Error ? error.message : "Server xatosi." },
      { status:500 }
    );
  }
}
