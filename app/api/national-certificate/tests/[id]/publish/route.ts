import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdmin(request: NextRequest) {
  const session =
    request.cookies.get("qurbonov_session")?.value;

  const role =
    request.cookies.get("qurbonov_role")?.value;

  return Boolean(session) && role === "admin";
}

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Faqat administrator testni e’lon qilishi mumkin.",
        },
        { status: 403 }
      );
    }

    const { id: testId } =
      await context.params;

    if (!testId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Test ID topilmadi.",
        },
        { status: 400 }
      );
    }

    const tests = await sql`
      SELECT
        id,
        title,
        status,
        duration_minutes,
        attempt_limit
      FROM national_certificate_tests
      WHERE id = ${testId}
      LIMIT 1
    `;

    if (tests.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Test topilmadi.",
        },
        { status: 404 }
      );
    }

    const test = tests[0];

    if (
      String(test.title || "").trim() === ""
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Test nomi kiritilmagan.",
        },
        { status: 400 }
      );
    }

    const durationMinutes =
      Number(test.duration_minutes);

    if (
      !Number.isInteger(durationMinutes) ||
      durationMinutes <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Test vaqti noto‘g‘ri.",
        },
        { status: 400 }
      );
    }

    if (test.status === "published") {
      return NextResponse.json({
        success: true,
        message:
          "Test allaqachon e’lon qilingan.",
        status: "published",
      });
    }

    /*
      ============================================================
      1. SAVOLLAR RAQAMI VA TURI QAT’IY TEKSHIRILADI
      ============================================================

      1–35  = closed
      36–45 = open

      45 ta savolning aynan 1 dan 45 gacha bo‘lgan
      barcha raqamlari mavjud bo‘lishi shart.
    */
    const questions = await sql`
      SELECT
        id,
        question_number,
        question_type,
        question_text,
        points
      FROM national_certificate_questions
      WHERE test_id = ${testId}
      ORDER BY question_number ASC
    `;

    if (questions.length !== 45) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Testni e’lon qilish uchun aynan 45 ta savol bo‘lishi kerak.",
          details: {
            total:
              questions.length,
            requiredTotal: 45,
          },
        },
        { status: 400 }
      );
    }

    const seenNumbers =
      new Set<number>();

    const invalidStructure: {
      questionNumber: number;
      reason: string;
    }[] = [];

    for (const question of questions) {
      const questionNumber =
        Number(
          question.question_number
        );

      const questionType =
        String(
          question.question_type
        );

      const questionText =
        String(
          question.question_text || ""
        ).trim();

      const points =
        Number(question.points);

      if (
        !Number.isInteger(
          questionNumber
        ) ||
        questionNumber < 1 ||
        questionNumber > 45
      ) {
        invalidStructure.push({
          questionNumber,
          reason:
            "Savol raqami 1–45 oralig‘ida emas.",
        });

        continue;
      }

      if (
        seenNumbers.has(
          questionNumber
        )
      ) {
        invalidStructure.push({
          questionNumber,
          reason:
            "Savol raqami takrorlangan.",
        });

        continue;
      }

      seenNumbers.add(
        questionNumber
      );

      const expectedType =
        questionNumber <= 35
          ? "closed"
          : "open";

      if (
        questionType !==
        expectedType
      ) {
        invalidStructure.push({
          questionNumber,
          reason:
            questionNumber <= 35
              ? "1–35-savollar yopiq bo‘lishi kerak."
              : "36–45-savollar ochiq bo‘lishi kerak.",
        });
      }

      if (!questionText) {
        invalidStructure.push({
          questionNumber,
          reason:
            "Savol matni bo‘sh.",
        });
      }

      if (
        !Number.isFinite(points) ||
        points < 0
      ) {
        invalidStructure.push({
          questionNumber,
          reason:
            "Savol bali noto‘g‘ri.",
        });
      }
    }

    for (
      let number = 1;
      number <= 45;
      number += 1
    ) {
      if (
        !seenNumbers.has(number)
      ) {
        invalidStructure.push({
          questionNumber: number,
          reason:
            "Bu raqamdagi savol mavjud emas.",
        });
      }
    }

    if (
      invalidStructure.length > 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Test savollarining tuzilishida xatolik bor.",
          invalidQuestions:
            invalidStructure,
        },
        { status: 400 }
      );
    }

    /*
      ============================================================
      2. YOPIQ SAVOLLAR
      ============================================================

      Har bir 1–35 savolda:
      - aynan 4 variant;
      - A/B/C/D ning har biri bir martadan;
      - barcha variant matnlari bo‘sh emas;
      - aynan 1 ta to‘g‘ri javob.
    */
    const invalidClosedQuestions =
      await sql`
        SELECT
          q.question_number,

          COUNT(o.id)::int
            AS option_count,

          COUNT(
            DISTINCT o.option_key
          )::int
            AS distinct_key_count,

          COUNT(o.id)
            FILTER (
              WHERE
                o.is_correct = TRUE
            )::int
            AS correct_count,

          COUNT(o.id)
            FILTER (
              WHERE
                o.option_key IN (
                  'A',
                  'B',
                  'C',
                  'D'
                )
            )::int
            AS valid_key_count,

          COUNT(o.id)
            FILTER (
              WHERE
                BTRIM(
                  COALESCE(
                    o.option_text,
                    ''
                  )
                ) <> ''
            )::int
            AS nonempty_text_count

        FROM
          national_certificate_questions q

        LEFT JOIN
          national_certificate_options o
            ON o.question_id = q.id

        WHERE
          q.test_id = ${testId}
          AND q.question_type = 'closed'
          AND q.question_number
              BETWEEN 1 AND 35

        GROUP BY
          q.id,
          q.question_number

        HAVING
          COUNT(o.id) <> 4

          OR COUNT(
            DISTINCT o.option_key
          ) <> 4

          OR COUNT(o.id)
            FILTER (
              WHERE
                o.option_key IN (
                  'A',
                  'B',
                  'C',
                  'D'
                )
            ) <> 4

          OR COUNT(o.id)
            FILTER (
              WHERE
                BTRIM(
                  COALESCE(
                    o.option_text,
                    ''
                  )
                ) <> ''
            ) <> 4

          OR COUNT(o.id)
            FILTER (
              WHERE
                o.is_correct = TRUE
            ) <> 1

        ORDER BY
          q.question_number ASC
      `;

    if (
      invalidClosedQuestions.length >
      0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Ba’zi yopiq savollarda A/B/C/D variantlari yoki to‘g‘ri javob noto‘g‘ri.",
          invalidQuestions:
            invalidClosedQuestions,
        },
        { status: 400 }
      );
    }

    /*
      ============================================================
      3. OCHIQ SAVOLLAR
      ============================================================

      Har bir 36–45 savolda kamida 1 ta
      bo‘sh bo‘lmagan qabul qilinadigan javob bo‘lishi shart.
    */
    const invalidOpenQuestions =
      await sql`
        SELECT
          q.question_number,

          COUNT(a.id)
            FILTER (
              WHERE
                BTRIM(
                  COALESCE(
                    a.answer_text,
                    ''
                  )
                ) <> ''
                AND BTRIM(
                  COALESCE(
                    a.normalized_answer,
                    ''
                  )
                ) <> ''
            )::int
            AS accepted_answer_count

        FROM
          national_certificate_questions q

        LEFT JOIN
          national_certificate_open_answers a
            ON a.question_id = q.id

        WHERE
          q.test_id = ${testId}
          AND q.question_type = 'open'
          AND q.question_number
              BETWEEN 36 AND 45

        GROUP BY
          q.id,
          q.question_number

        HAVING
          COUNT(a.id)
            FILTER (
              WHERE
                BTRIM(
                  COALESCE(
                    a.answer_text,
                    ''
                  )
                ) <> ''
                AND BTRIM(
                  COALESCE(
                    a.normalized_answer,
                    ''
                  )
                ) <> ''
            ) < 1

        ORDER BY
          q.question_number ASC
      `;

    if (
      invalidOpenQuestions.length >
      0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Ba’zi ochiq savollarda qabul qilinadigan to‘g‘ri javob mavjud emas.",
          invalidQuestions:
            invalidOpenQuestions,
        },
        { status: 400 }
      );
    }

    /*
      ============================================================
      4. REAL COUNTLAR BILAN PUBLISH
      ============================================================

      Yuqoridagi barcha tekshiruvlardan muvaffaqiyatli
      o‘tgan testgina published bo‘ladi.
    */
    const updated = await sql`
      UPDATE national_certificate_tests
      SET
        status = 'published',
        closed_question_count = 35,
        open_question_count = 10,
        total_questions = 45,
        updated_at = NOW()
      WHERE
        id = ${testId}
        AND status = 'draft'
      RETURNING
        id,
        status,
        closed_question_count,
        open_question_count,
        total_questions,
        updated_at
    `;

    if (updated.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Test holati o‘zgargan. Sahifani yangilab qayta urinib ko‘ring.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Milliy sertifikat testi muvaffaqiyatli e’lon qilindi.",
      status:
        "published",
      counts: {
        closed: 35,
        open: 10,
        total: 45,
      },
    });
  } catch (error) {
    console.error(
      "National certificate publish POST error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Testni e’lon qilishda server xatosi yuz berdi.",
      },
      { status: 500 }
    );
  }
}
