import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/* =========================================================
   GET
   Bitta e'lon qilingan mavzulashtirilgan testni olish

   MUHIM:
   - is_correct clientga yuborilmaydi
   - faqat published test ochiladi
   - shapes_json clientga shapes sifatida qaytariladi
========================================================= */

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const testId = String(id || "").trim();

    /* ---------------------------------------------
       1. ID TEKSHIRISH
    --------------------------------------------- */

    if (!/^\d+$/.test(testId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Test ID noto‘g‘ri.",
        },
        { status: 400 }
      );
    }

    /* ---------------------------------------------
       2. TEST + KITOB MA'LUMOTLARI
    --------------------------------------------- */

    const tests = await sql`
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

      INNER JOIN thematic_books b
        ON b.id = t.book_id

      WHERE t.id = ${testId}
        AND t.status = 'published'
        AND b.status = 'published'

      LIMIT 1
    `;

    if (tests.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Test topilmadi yoki hali e’lon qilinmagan.",
        },
        { status: 404 }
      );
    }

    const test = tests[0];

    /* ---------------------------------------------
       3. SAVOLLARNI OLISH

       shapes_json ham Neon'dan olinadi.
    --------------------------------------------- */

    const questions = await sql`
      SELECT
        id,
        test_id,
        question_number,
        question_text,
        question_html,
        shapes_json,
        points

      FROM thematic_questions

      WHERE test_id = ${testId}

      ORDER BY
        question_number ASC,
        id ASC
    `;

    if (questions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Ushbu testda hozircha savollar mavjud emas.",
        },
        { status: 404 }
      );
    }

    /* ---------------------------------------------
       4. VARIANTLARNI BIR MARTADA OLISH

       MUHIM:
       is_correct ATAYLAB SELECT QILINMAYDI.
    --------------------------------------------- */

    const options = await sql`
      SELECT
        o.id,
        o.question_id,
        o.option_key,
        o.option_text,
        o.option_html

      FROM thematic_options o

      INNER JOIN thematic_questions q
        ON q.id = o.question_id

      WHERE q.test_id = ${testId}

      ORDER BY
        q.question_number ASC,
        o.id ASC
    `;

    /* ---------------------------------------------
       5. OPTIONLARNI SAVOLLAR BO'YICHA GURUHLASH
    --------------------------------------------- */

    const optionsByQuestion = new Map<
      string,
      Array<{
        id: string;
        key: string;
        text: string;
        html: string;
      }>
    >();

    for (const option of options) {
      const questionId = String(
        option.question_id
      );

      const list =
        optionsByQuestion.get(
          questionId
        ) || [];

      list.push({
        id: String(option.id),

        key: String(
          option.option_key || ""
        ),

        text: String(
          option.option_text || ""
        ),

        html: String(
          option.option_html || ""
        ),
      });

      optionsByQuestion.set(
        questionId,
        list
      );
    }

    /* ---------------------------------------------
       6. PUBLIC QUESTION FORMAT
    --------------------------------------------- */

    const publicQuestions =
      questions.map((question) => {
        const questionId =
          String(question.id);

        /*
          Neon JSONB odatda JS array sifatida keladi.

          Shunga qaramay xavfsizlik uchun:
          - array bo'lsa to'g'ridan-to'g'ri ishlatamiz;
          - string bo'lsa JSON.parse qilamiz;
          - noto'g'ri qiymat bo'lsa [].
        */
        let shapes: unknown[] = [];

        if (
          Array.isArray(
            question.shapes_json
          )
        ) {
          shapes =
            question.shapes_json;
        } else if (
          typeof question.shapes_json ===
          "string"
        ) {
          try {
            const parsed =
              JSON.parse(
                question.shapes_json
              );

            shapes =
              Array.isArray(parsed)
                ? parsed
                : [];
          } catch {
            shapes = [];
          }
        }

        return {
          id: questionId,

          number: Number(
            question.question_number
          ),

          questionNumber: Number(
            question.question_number
          ),

          questionText: String(
            question.question_text || ""
          ),

          questionHtml: String(
            question.question_html || ""
          ),

          /*
            ESKI TEST RENDERERI AYNAN
            "shapes" MAYDONINI KUTADI.
          */
          shapes,

          points:
            Number(question.points) > 0
              ? Number(
                  question.points
                )
              : 1,

          options:
            optionsByQuestion.get(
              questionId
            ) || [],
        };
      });

    /* ---------------------------------------------
       7. CLIENT UCHUN TEST FORMAT
    --------------------------------------------- */

    const responseTest = {
      id: String(test.id),

      source: "thematic-neon",

      testType: "thematic",

      bookId: String(
        test.book_id
      ),

      bookTitle: String(
        test.book_title || ""
      ),

      grade: Number(
        test.grade
      ),

      sectionOrder: Number(
        test.section_order
      ),

      sectionType: String(
        test.section_type ||
          "lesson"
      ),

      title: String(
        test.title || ""
      ),

      subject: String(
        test.subject || ""
      ),

      edition:
        test.edition === null
          ? ""
          : String(
              test.edition
            ),

      description: String(
        test.description || ""
      ),

      /*
        Eski solve dizayni duration
        maydonini kutadi.
      */
      duration: Math.max(
        1,
        Number(
          test.duration_minutes
        ) || 60
      ),

      durationMinutes: Math.max(
        1,
        Number(
          test.duration_minutes
        ) || 60
      ),

      attemptLimit:
        test.attempt_limit ===
          null ||
        test.attempt_limit ===
          undefined
          ? null
          : Math.max(
              1,
              Number(
                test.attempt_limit
              ) || 1
            ),

      status: "published",

      questionCount:
        publicQuestions.length,

      questions:
        publicQuestions,
    };

    return NextResponse.json(
      {
        success: true,
        test: responseTest,
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
      "Thematic test GET error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Mavzulashtirilgan testni yuklashda server xatosi yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}
