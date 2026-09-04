import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================================================
   GET
   Mavzulashtirilgan kitoblar va testlarni Neon'dan olish
========================================================= */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const gradeParam = searchParams.get("grade");
    const statusParam = searchParams.get("status");

    const grade =
      gradeParam && /^\d+$/.test(gradeParam)
        ? Number(gradeParam)
        : null;

    const status =
      statusParam === "draft" || statusParam === "published"
        ? statusParam
        : null;

    /* ---------------------------------------------
       1. KITOBLAR
    --------------------------------------------- */

    let books;

    if (grade !== null && status !== null) {
      books = await sql`
        SELECT
          id,
          grade,
          title,
          subject,
          edition,
          status,
          created_at,
          updated_at
        FROM thematic_books
        WHERE grade = ${grade}
          AND status = ${status}
        ORDER BY grade ASC, id ASC
      `;
    } else if (grade !== null) {
      books = await sql`
        SELECT
          id,
          grade,
          title,
          subject,
          edition,
          status,
          created_at,
          updated_at
        FROM thematic_books
        WHERE grade = ${grade}
        ORDER BY grade ASC, id ASC
      `;
    } else if (status !== null) {
      books = await sql`
        SELECT
          id,
          grade,
          title,
          subject,
          edition,
          status,
          created_at,
          updated_at
        FROM thematic_books
        WHERE status = ${status}
        ORDER BY grade ASC, id ASC
      `;
    } else {
      books = await sql`
        SELECT
          id,
          grade,
          title,
          subject,
          edition,
          status,
          created_at,
          updated_at
        FROM thematic_books
        ORDER BY grade ASC, id ASC
      `;
    }

    /* ---------------------------------------------
       2. HAR BIR KITOBNING MAVZULARI
    --------------------------------------------- */

    const result = [];

    for (const book of books) {
      let tests;

      if (status !== null) {
        tests = await sql`
          SELECT
            id,
            book_id,
            section_order,
            section_type,
            title,
            description,
            duration_minutes,
            attempt_limit,
            status,
            question_count,
            created_at,
            updated_at
          FROM thematic_tests
          WHERE book_id = ${book.id}
            AND status = ${status}
          ORDER BY section_order ASC, id ASC
        `;
      } else {
        tests = await sql`
          SELECT
            id,
            book_id,
            section_order,
            section_type,
            title,
            description,
            duration_minutes,
            attempt_limit,
            status,
            question_count,
            created_at,
            updated_at
          FROM thematic_tests
          WHERE book_id = ${book.id}
          ORDER BY section_order ASC, id ASC
        `;
      }

      result.push({
        ...book,
        tests,
      });
    }

    return NextResponse.json({
      success: true,
      count: result.length,
      books: result,
    });
  } catch (error) {
    console.error("Thematic tests GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Mavzulashtirilgan testlarni olishda xatolik yuz berdi.",
      },
      { status: 500 }
    );
  }
}
