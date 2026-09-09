import { cookies } from "next/headers";
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

async function isAdmin() {
  const cookieStore = await cookies();

  return Boolean(
    cookieStore.get("qurbonov_session")?.value &&
      cookieStore.get("qurbonov_role")?.value === "admin"
  );
}

function normalizePositiveInt(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.max(1, Math.floor(parsed));
}

function normalizeNullablePositiveInt(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.max(1, Math.floor(parsed));
}


/* =========================================================
   GET
   Mavzulashtirilgan kitoblar va testlarni Neon'dan olish
========================================================= */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const idParam = searchParams.get("id");
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
       BITTA TESTNI SAVOLLARI BILAN OLISH
       /api/tests/thematic?id=123
    --------------------------------------------- */

    if (idParam !== null) {
      if (!/^\d+$/.test(idParam)) {
        return NextResponse.json(
          { success: false, message: "Test ID noto‘g‘ri." },
          { status: 400 }
        );
      }

      const testId = Number(idParam);

      const testRows = await sql`
        SELECT
          t.id,
          t.book_id,
          t.section_order,
          t.section_type,
          t.title,
          t.description,
          t.duration_minutes,
          t.attempt_limit,
          t.status,
          t.question_count,
          t.created_at,
          t.updated_at,
          b.grade,
          b.title AS book_title,
          b.subject,
          b.edition
        FROM thematic_tests t
        JOIN thematic_books b ON b.id = t.book_id
        WHERE t.id = ${testId}
        LIMIT 1
      `;

      if (testRows.length === 0) {
        return NextResponse.json(
          { success: false, message: "Mavzulashtirilgan test topilmadi." },
          { status: 404 }
        );
      }

      const testRow: any = testRows[0];
      const admin = await isAdmin();

      if (testRow.status !== "published" && !admin) {
        return NextResponse.json(
          { success: false, message: "Bu test hali e’lon qilinmagan." },
          { status: 403 }
        );
      }

      const questionRows = await sql`
        SELECT
          id,
          question_number,
          question_text,
          question_html,
          points,
          shapes_json
        FROM thematic_questions
        WHERE test_id = ${testId}
        ORDER BY question_number ASC, id ASC
      `;

      /*
        Variantlarni JS array -> PostgreSQL bigint[] orqali uzatmaymiz.
        Neon/Vercel muhitida array parametrining serializatsiyasi turlicha
        bo‘lishi mumkin. Shu sabab variantlarni test_id bo‘yicha JOIN bilan
        bevosita bazadan olamiz.
      */
      const optionRows: any[] = await sql`
        SELECT
          o.id,
          o.question_id,
          o.option_key,
          o.option_text,
          o.option_html,
          o.is_correct
        FROM thematic_options o
        JOIN thematic_questions q
          ON q.id = o.question_id
        WHERE q.test_id = ${testId}
        ORDER BY
          q.question_number ASC,
          q.id ASC,
          o.option_key ASC,
          o.id ASC
      `;

      const optionsByQuestion = new Map<string, any[]>();

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

      const questions = questionRows.map((row: any) => ({
        id: String(row.id),
        number: Number(row.question_number) || 0,
        questionText: String(row.question_text || ""),
        questionHtml: String(row.question_html || row.question_text || ""),
        points: Number(row.points) || 1,
        shapes: Array.isArray(row.shapes_json) ? row.shapes_json : [],
        options: optionsByQuestion.get(String(row.id)) || [],
      }));

      return NextResponse.json(
        {
          success: true,
          test: {
            id: String(testRow.id),
            bookId: String(testRow.book_id),
            bookTitle: String(testRow.book_title || ""),
            grade: Number(testRow.grade) || undefined,
            subject: String(testRow.subject || ""),
            edition: String(testRow.edition || ""),
            sectionOrder: Number(testRow.section_order) || 0,
            sectionType: String(testRow.section_type || "lesson"),
            title: String(testRow.title || ""),
            description: String(testRow.description || ""),
            duration: Number(testRow.duration_minutes) || 60,
            attemptLimit:
              testRow.attempt_limit == null
                ? null
                : Number(testRow.attempt_limit),
            status: testRow.status === "published" ? "published" : "draft",
            questionCount: questions.length,
            questions,
            createdAt: testRow.created_at
              ? new Date(testRow.created_at).toISOString()
              : undefined,
            updatedAt: testRow.updated_at
              ? new Date(testRow.updated_at).toISOString()
              : undefined,
          },
        },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

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
   - update-test
   - set-status
   - bulk-publish-tests
   - bulk-delete-tests
========================================================= */

export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        { success: false, message: "Faqat administrator uchun." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));

    const action = String(body?.action || "").trim();


    /* =====================================================
       TEST MA'LUMOTLARI, VAQTI, SAVOL VA VARIANTLARINI TAHRIRLASH
    ===================================================== */

    if (action === "update-test") {
      const testId = String(body?.testId ?? "").trim();

      if (!/^\d+$/.test(testId)) {
        return NextResponse.json(
          { success: false, message: "Test ID noto‘g‘ri." },
          { status: 400 }
        );
      }

      const existing = await sql`
        SELECT id, book_id, status
        FROM thematic_tests
        WHERE id = ${testId}
        LIMIT 1
      `;

      if (existing.length === 0) {
        return NextResponse.json(
          { success: false, message: "Mavzulashtirilgan test topilmadi." },
          { status: 404 }
        );
      }

      const title = String(body?.title || "").trim();
      if (!title) {
        return NextResponse.json(
          { success: false, message: "Test nomi bo‘sh bo‘lishi mumkin emas." },
          { status: 400 }
        );
      }

      const status = isStatus(body?.status)
        ? body.status
        : (existing[0].status === "published" ? "published" : "draft");

      const durationMinutes = normalizePositiveInt(body?.durationMinutes, 60);
      const attemptLimit = normalizeNullablePositiveInt(body?.attemptLimit);
      const questions = Array.isArray(body?.questions) ? body.questions : [];

      if (status === "published" && questions.length === 0) {
        return NextResponse.json(
          { success: false, message: "Savolsiz testni e’lon qilib bo‘lmaydi." },
          { status: 400 }
        );
      }

      await sql`
        UPDATE thematic_tests
        SET
          title = ${title},
          description = ${String(body?.description || "")},
          duration_minutes = ${durationMinutes},
          attempt_limit = ${attemptLimit},
          status = ${status},
          updated_at = NOW()
        WHERE id = ${testId}
      `;

      let updatedQuestionCount = 0;

      for (let questionIndex = 0; questionIndex < questions.length; questionIndex++) {
        const question = questions[questionIndex] || {};
        const questionId = String(question?.id ?? "").trim();

        if (!/^\d+$/.test(questionId)) continue;

        const belongs = await sql`
          SELECT id
          FROM thematic_questions
          WHERE id = ${questionId}
            AND test_id = ${testId}
          LIMIT 1
        `;

        if (belongs.length === 0) continue;

        const questionText = String(
          question?.questionText ?? question?.questionHtml ?? ""
        ).trim();
        const questionHtml = String(
          question?.questionHtml ?? questionText
        );
        const points = normalizePositiveInt(question?.points, 1);

        await sql`
          UPDATE thematic_questions
          SET
            question_number = ${questionIndex + 1},
            question_text = ${questionText},
            question_html = ${questionHtml},
            points = ${points},
            updated_at = NOW()
          WHERE id = ${questionId}
            AND test_id = ${testId}
        `;

        const options = Array.isArray(question?.options) ? question.options : [];
        const correctCount = options.filter((option: any) => option?.isCorrect === true).length;

        if (options.length > 0 && correctCount !== 1) {
          return NextResponse.json(
            {
              success: false,
              message: `${questionIndex + 1}-savolda aynan 1 ta to‘g‘ri javob bo‘lishi kerak.`,
            },
            { status: 400 }
          );
        }

        for (let optionIndex = 0; optionIndex < options.length; optionIndex++) {
          const option = options[optionIndex] || {};
          const optionId = String(option?.id ?? "").trim();
          if (!/^\d+$/.test(optionId)) continue;

          const optionText = String(option?.text ?? option?.html ?? "");
          const optionHtml = String(option?.html ?? optionText);
          const optionKey = String(
            option?.label || String.fromCharCode(65 + optionIndex)
          )
            .trim()
            .toUpperCase();

          await sql`
            UPDATE thematic_options
            SET
              option_key = ${optionKey},
              option_text = ${optionText},
              option_html = ${optionHtml},
              is_correct = ${option?.isCorrect === true},
              updated_at = NOW()
            WHERE id = ${optionId}
              AND question_id = ${questionId}
          `;
        }

        updatedQuestionCount++;
      }

      const countRows = await sql`
        SELECT COUNT(*)::int AS count
        FROM thematic_questions
        WHERE test_id = ${testId}
      `;

      const realQuestionCount = Number(countRows[0]?.count || 0);

      await sql`
        UPDATE thematic_tests
        SET
          question_count = ${realQuestionCount},
          updated_at = NOW()
        WHERE id = ${testId}
      `;

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
        message: "Mavzulashtirilgan test Neon bazasida yangilandi.",
        testId,
        status,
        durationMinutes,
        questionCount: realQuestionCount,
        updatedQuestionCount,
      });
    }

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
    if (!(await isAdmin())) {
      return NextResponse.json(
        { success: false, message: "Faqat administrator uchun." },
        { status: 403 }
      );
    }

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
