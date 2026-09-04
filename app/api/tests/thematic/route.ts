import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TestStatus = "draft" | "published";

function isStatus(value: unknown): value is TestStatus {
  return value === "draft" || value === "published";
}

function normalizeIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) => String(item ?? "").trim())
        .filter((item) => /^\d+$/.test(item))
    )
  );
}

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

    return NextResponse.json(
      {
        success: true,
        count: result.length,
        books: result,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Thematic tests GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "Mavzulashtirilgan testlarni olishda xatolik yuz berdi.",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   POST
   Neon thematic testlarni boshqarish

   action:
   - set-status
   - bulk-publish-tests
   - bulk-delete-tests
========================================================= */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const action = String(body?.action || "").trim();

    /* =====================================================
       1. BITTA TEST STATUSINI O'ZGARTIRISH
    ===================================================== */

    if (action === "set-status") {
      const testId = String(body?.testId ?? "").trim();
      const status = body?.status;

      if (!/^\d+$/.test(testId)) {
        return NextResponse.json(
          {
            success: false,
            message: "Test ID noto‘g‘ri.",
          },
          { status: 400 }
        );
      }

      if (!isStatus(status)) {
        return NextResponse.json(
          {
            success: false,
            message: "Test holati noto‘g‘ri.",
          },
          { status: 400 }
        );
      }

      const existing = await sql`
        SELECT
          id,
          book_id,
          question_count,
          status
        FROM thematic_tests
        WHERE id = ${testId}
        LIMIT 1
      `;

      if (existing.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Mavzulashtirilgan test topilmadi.",
          },
          { status: 404 }
        );
      }

      if (
        status === "published" &&
        Number(existing[0]?.question_count || 0) <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Savolsiz testni e’lon qilib bo‘lmaydi.",
          },
          { status: 400 }
        );
      }

      const updated = await sql`
        UPDATE thematic_tests
        SET
          status = ${status},
          updated_at = NOW()
        WHERE id = ${testId}
        RETURNING
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
      `;

      /*
        Kitob holatini ham sinxronlashtiramiz.

        Kamida bitta published mavzu bo'lsa:
        book = published.

        Hech biri published bo'lmasa:
        book = draft.
      */

      await sql`
        UPDATE thematic_books
        SET
          status = CASE
            WHEN EXISTS (
              SELECT 1
              FROM thematic_tests
              WHERE book_id = ${existing[0].book_id}
                AND status = 'published'
            )
            THEN 'published'
            ELSE 'draft'
          END,
          updated_at = NOW()
        WHERE id = ${existing[0].book_id}
      `;

      return NextResponse.json({
        success: true,
        message:
          status === "published"
            ? "Test e’lon qilindi."
            : "Test qoralamaga qaytarildi.",
        test: updated[0],
      });
    }

    /* =====================================================
       2. KO'P TESTNI BIRTA SQL BILAN E'LON QILISH
    ===================================================== */

    if (action === "bulk-publish-tests") {
      const testIds = normalizeIds(body?.testIds);

      if (testIds.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              "E’lon qilinadigan testlar tanlanmagan.",
          },
          { status: 400 }
        );
      }

      /*
        neon() tagged-template API bilan dinamik IN (...)
        yasash o'rniga PostgreSQL ANY ishlatamiz.

        text[] -> bigint[]
      */

      const updated = await sql`
        UPDATE thematic_tests
        SET
          status = 'published',
          updated_at = NOW()
        WHERE id = ANY(${testIds}::bigint[])
          AND question_count > 0
        RETURNING
          id,
          book_id,
          status
      `;

      /*
        Faqat tegishli kitoblarni published qilamiz.
      */

      const bookIds = Array.from(
        new Set(
          updated
            .map((row) => String(row.book_id))
            .filter((value) => /^\d+$/.test(value))
        )
      );

      if (bookIds.length > 0) {
        await sql`
          UPDATE thematic_books
          SET
            status = 'published',
            updated_at = NOW()
          WHERE id = ANY(${bookIds}::bigint[])
        `;
      }

      const publishedIds = updated.map((row) =>
        String(row.id)
      );

      return NextResponse.json({
        success: true,
        message: `${publishedIds.length} ta mavzulashtirilgan test e’lon qilindi.`,
        publishedCount: publishedIds.length,
        publishedIds,
      });
    }

    /* =====================================================
       3. QORALAMALARNI BIRTA SQL BILAN O'CHIRISH
    ===================================================== */

    if (action === "bulk-delete-tests") {
      const testIds = normalizeIds(body?.testIds);
      const onlyDrafts = body?.onlyDrafts !== false;

      if (testIds.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              "O‘chiriladigan testlar tanlanmagan.",
          },
          { status: 400 }
        );
      }

      /*
        O'chirishdan oldin book_id larni olamiz.
      */

      const affectedTests = onlyDrafts
        ? await sql`
            SELECT
              id,
              book_id
            FROM thematic_tests
            WHERE id = ANY(${testIds}::bigint[])
              AND status = 'draft'
          `
        : await sql`
            SELECT
              id,
              book_id
            FROM thematic_tests
            WHERE id = ANY(${testIds}::bigint[])
          `;

      if (affectedTests.length === 0) {
        return NextResponse.json({
          success: true,
          message: "O‘chiriladigan test topilmadi.",
          deletedCount: 0,
          deletedIds: [],
        });
      }

      const affectedBookIds = Array.from(
        new Set(
          affectedTests.map((row) =>
            String(row.book_id)
          )
        )
      );

      let deleted;

      if (onlyDrafts) {
        deleted = await sql`
          DELETE FROM thematic_tests
          WHERE id = ANY(${testIds}::bigint[])
            AND status = 'draft'
          RETURNING id
        `;
      } else {
        deleted = await sql`
          DELETE FROM thematic_tests
          WHERE id = ANY(${testIds}::bigint[])
          RETURNING id
        `;
      }

      /*
        ON DELETE CASCADE sabab:
        thematic_questions va thematic_options ham avtomatik
        o'chadi.

        Endi bo'shab qolgan kitoblarni o'chiramiz.
      */

      if (affectedBookIds.length > 0) {
        await sql`
          DELETE FROM thematic_books b
          WHERE b.id = ANY(${affectedBookIds}::bigint[])
            AND NOT EXISTS (
              SELECT 1
              FROM thematic_tests t
              WHERE t.book_id = b.id
            )
        `;

        /*
          Qolgan kitoblar statusini qayta hisoblaymiz.
        */

        await sql`
          UPDATE thematic_books b
          SET
            status = CASE
              WHEN EXISTS (
                SELECT 1
                FROM thematic_tests t
                WHERE t.book_id = b.id
                  AND t.status = 'published'
              )
              THEN 'published'
              ELSE 'draft'
            END,
            updated_at = NOW()
          WHERE b.id = ANY(${affectedBookIds}::bigint[])
        `;
      }

      const deletedIds = deleted.map((row) =>
        String(row.id)
      );

      return NextResponse.json({
        success: true,
        message: `${deletedIds.length} ta mavzulashtirilgan test o‘chirildi.`,
        deletedCount: deletedIds.length,
        deletedIds,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: "Noma’lum amal.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Thematic tests POST error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "Mavzulashtirilgan testlarni boshqarishda server xatosi yuz berdi.",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   DELETE
   BITTA MAVZULASHTIRILGAN TESTNI O'CHIRISH

   /api/tests/thematic?id=123
========================================================= */

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const testId = String(
      searchParams.get("id") || ""
    ).trim();

    if (!/^\d+$/.test(testId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Test ID noto‘g‘ri.",
        },
        { status: 400 }
      );
    }

    const existing = await sql`
      SELECT
        id,
        book_id,
        title
      FROM thematic_tests
      WHERE id = ${testId}
      LIMIT 1
    `;

    if (existing.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Mavzulashtirilgan test topilmadi.",
        },
        { status: 404 }
      );
    }

    const bookId = existing[0].book_id;

    /*
      thematic_tests -> thematic_questions -> thematic_options

      FK lar ON DELETE CASCADE bilan yaratilgani uchun
      bitta thematic_tests DELETE yetarli.
    */

    await sql`
      DELETE FROM thematic_tests
      WHERE id = ${testId}
    `;

    /*
      Agar kitobda boshqa mavzu qolmagan bo'lsa,
      kitobning o'zini ham o'chiramiz.
    */

    const remaining = await sql`
      SELECT COUNT(*)::int AS count
      FROM thematic_tests
      WHERE book_id = ${bookId}
    `;

    if (Number(remaining[0]?.count || 0) === 0) {
      await sql`
        DELETE FROM thematic_books
        WHERE id = ${bookId}
      `;
    } else {
      /*
        Aks holda kitob statusini qolgan mavzularga
        qarab qayta hisoblaymiz.
      */

      await sql`
        UPDATE thematic_books
        SET
          status = CASE
            WHEN EXISTS (
              SELECT 1
              FROM thematic_tests
              WHERE book_id = ${bookId}
                AND status = 'published'
            )
            THEN 'published'
            ELSE 'draft'
          END,
          updated_at = NOW()
        WHERE id = ${bookId}
      `;
    }

    return NextResponse.json({
      success: true,
      message: "Mavzulashtirilgan test o‘chirildi.",
      deletedId: testId,
    });
  } catch (error) {
    console.error("Thematic test DELETE error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "Mavzulashtirilgan testni o‘chirishda server xatosi yuz berdi.",
      },
      { status: 500 }
    );
  }
}
