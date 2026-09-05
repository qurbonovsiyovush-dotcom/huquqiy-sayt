import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/*
  PUBLIC TEST RO'YXATI

  MUHIM:
  - Vercel Blob umuman ishlatilmaydi.
  - Oddiy/qonunchilik/blok/30 talik/boshqa testlar -> legacy_tests (Neon)
  - Mavzulashtirilgan testlar -> thematic_* (Neon)
  - Faqat published testlar qaytariladi.
  - Savollar va to'g'ri javoblar bu endpoint orqali yuborilmaydi.
*/

export async function GET() {
  try {
    const legacyRows = await sql`
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
      WHERE t.status = 'published'
        AND COALESCE(t.test_type, '') <> 'thematic'
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

    const thematicRows = await sql`
      SELECT
        tt.id,
        tt.book_id,
        tt.section_order,
        tt.section_type,
        tt.title AS section_title,
        tt.description,
        tt.duration_minutes,
        tt.attempt_limit,
        tt.status,
        tt.question_count,
        tt.created_at,
        tt.updated_at,
        tb.grade,
        tb.title AS book_title,
        tb.subject
      FROM thematic_tests tt
      INNER JOIN thematic_books tb
        ON tb.id = tt.book_id
      WHERE tt.status = 'published'
        AND tb.status = 'published'
      ORDER BY
        tb.grade ASC,
        tt.section_order ASC,
        tt.id ASC
    `;

    const legacyTests = legacyRows.map((row: any) => ({
      id: String(row.id),
      title: String(row.title || ""),
      subject: String(row.subject || ""),
      duration: Number(row.duration) || 30,
      description:
        row.description == null
          ? ""
          : String(row.description),
      status: "published",
      testType:
        row.test_type == null || String(row.test_type).trim() === ""
          ? "custom"
          : String(row.test_type),
      customTestTypeName:
        row.custom_test_type_name == null
          ? undefined
          : String(row.custom_test_type_name),
      attemptLimit:
        row.attempt_limit == null
          ? null
          : Number(row.attempt_limit),
      questionCount:
        Number(row.question_count) || 0,
      questionsCount:
        Number(row.question_count) || 0,
      storage: "legacy",
      source: "legacy",
      createdAt:
        row.created_at
          ? new Date(row.created_at).toISOString()
          : undefined,
      updatedAt:
        row.updated_at
          ? new Date(row.updated_at).toISOString()
          : undefined,
    }));

    const thematicTests = thematicRows.map((row: any) => ({
      /*
        Public /test sahifasi thematic testni tanisa,
        mavjud openTest() logikasi uchun testType="thematic" saqlanadi.
        ID oldiga thematic: qo'shmaymiz — public solve route raw Neon id bilan ishlaydi.
      */
      id: String(row.id),
      thematicId: String(row.id),
      bookId: String(row.book_id),
      grade: Number(row.grade) || undefined,
      bookTitle: String(row.book_title || ""),
      title: [
        String(row.book_title || "").trim(),
        String(row.section_title || "").trim(),
      ]
        .filter(Boolean)
        .join(" — "),
      subject:
        String(row.subject || "").trim() ||
        "Davlat va huquq asoslari",
      duration:
        Number(row.duration_minutes) || 60,
      description:
        row.description == null
          ? ""
          : String(row.description),
      status: "published",
      testType: "thematic",
      sectionType: String(row.section_type || "lesson"),
      sectionOrder: Number(row.section_order) || 0,
      attemptLimit:
        row.attempt_limit == null
          ? null
          : Number(row.attempt_limit),
      questionCount:
        Number(row.question_count) || 0,
      questionsCount:
        Number(row.question_count) || 0,
      storage: "thematic",
      source: "thematic",
      createdAt:
        row.created_at
          ? new Date(row.created_at).toISOString()
          : undefined,
      updatedAt:
        row.updated_at
          ? new Date(row.updated_at).toISOString()
          : undefined,
    }));

    const tests = [
      ...legacyTests,
      ...thematicTests,
    ];

    return NextResponse.json(
      {
        success: true,
        tests,
        total: tests.length,
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error(
      "PUBLIC TEST LIST NEON ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Testlar ro‘yxatini yuklab bo‘lmadi.",
        tests: [],
      },
      { status: 500 }
    );
  }
}
