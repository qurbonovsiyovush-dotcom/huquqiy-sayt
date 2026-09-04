import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type SubmittedAnswers = Record<string, string>;

type SubmittedAnswerItem = {
  questionId?: string | number;
  optionId?: string | number | null;
};

function normalizeAnswers(
  value: unknown
): SubmittedAnswers {
  const normalized: SubmittedAnswers = {};

  /*
    1-format:

    {
      "101": "401",
      "102": "406"
    }
  */
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    for (const [questionId, optionId] of Object.entries(
      value as Record<string, unknown>
    )) {
      const qId = String(questionId || "").trim();

      const oId =
        optionId === null ||
        optionId === undefined
          ? ""
          : String(optionId).trim();

      if (
        /^\d+$/.test(qId) &&
        /^\d+$/.test(oId)
      ) {
        normalized[qId] = oId;
      }
    }

    return normalized;
  }

  /*
    2-format:

    [
      {
        questionId: "101",
        optionId: "401"
      }
    ]
  */
  if (Array.isArray(value)) {
    for (const item of value as SubmittedAnswerItem[]) {
      const questionId = String(
        item?.questionId ?? ""
      ).trim();

      const optionId = String(
        item?.optionId ?? ""
      ).trim();

      if (
        /^\d+$/.test(questionId) &&
        /^\d+$/.test(optionId)
      ) {
        normalized[questionId] = optionId;
      }
    }
  }

  return normalized;
}

/* =========================================================
   POST
   MAVZULASHTIRILGAN TEST JAVOBLARINI TEKSHIRISH
========================================================= */

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const testId = String(id || "").trim();

    /* -----------------------------------------------------
       1. TEST ID
    ----------------------------------------------------- */

    if (!/^\d+$/.test(testId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Test ID noto‘g‘ri.",
        },
        {
          status: 400,
        }
      );
    }

    /* -----------------------------------------------------
       2. BODY
    ----------------------------------------------------- */

    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message:
            "Yuborilgan ma’lumot noto‘g‘ri.",
        },
        {
          status: 400,
        }
      );
    }

    const answers = normalizeAnswers(
      body?.answers
    );

    /* -----------------------------------------------------
       3. TEST MAVJUDLIGINI TEKSHIRISH

       Faqat e'lon qilingan test tekshiriladi.
    ----------------------------------------------------- */

    const tests = await sql`
      SELECT
        t.id,
        t.book_id,
        t.title,
        t.duration_minutes,
        t.attempt_limit,
        t.status,
        t.question_count,

        b.title AS book_title,
        b.subject,
        b.grade,
        b.status AS book_status

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
            "Test topilmadi yoki e’lon qilinmagan.",
        },
        {
          status: 404,
        }
      );
    }

    const test = tests[0];

    /* -----------------------------------------------------
       4. SAVOLLAR + VARIANTLAR

       is_correct FAQAT SERVER ICHIDA ISHLATILADI.
    ----------------------------------------------------- */

    const rows = await sql`
      SELECT
        q.id AS question_id,
        q.question_number,
        q.points,

        o.id AS option_id,
        o.option_key,
        o.option_text,
        o.option_html,
        o.is_correct

      FROM thematic_questions q

      LEFT JOIN thematic_options o
        ON o.question_id = q.id

      WHERE q.test_id = ${testId}

      ORDER BY
        q.question_number ASC,
        q.id ASC,
        o.id ASC
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Ushbu testda savollar mavjud emas.",
        },
        {
          status: 404,
        }
      );
    }

    /* -----------------------------------------------------
       5. SAVOLLARNI GURUHLASH
    ----------------------------------------------------- */

    type ServerOption = {
      id: string;
      key: string;
      text: string;
      html: string;
      isCorrect: boolean;
    };

    type ServerQuestion = {
      id: string;
      number: number;
      points: number;
      options: ServerOption[];
    };

    const questionMap =
      new Map<string, ServerQuestion>();

    for (const row of rows) {
      const questionId = String(
        row.question_id
      );

      if (!questionMap.has(questionId)) {
        questionMap.set(questionId, {
          id: questionId,

          number:
            Number(row.question_number) || 0,

          points:
            Number(row.points) > 0
              ? Number(row.points)
              : 1,

          options: [],
        });
      }

      if (
        row.option_id !== null &&
        row.option_id !== undefined
      ) {
        questionMap
          .get(questionId)!
          .options.push({
            id: String(row.option_id),

            key: String(
              row.option_key || ""
            ),

            text: String(
              row.option_text || ""
            ),

            html: String(
              row.option_html || ""
            ),

            isCorrect:
              row.is_correct === true,
          });
      }
    }

    const questions = Array.from(
      questionMap.values()
    ).sort(
      (a, b) =>
        a.number - b.number
    );

    /* -----------------------------------------------------
       6. NATIJANI HISOBLASH
    ----------------------------------------------------- */

    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;

    let earnedPoints = 0;
    let totalPoints = 0;

    const details = questions.map(
      (question) => {
        totalPoints += question.points;

        const selectedOptionId =
          answers[question.id] || null;

        const selectedOption =
          selectedOptionId
            ? question.options.find(
                (option) =>
                  option.id ===
                  selectedOptionId
              ) || null
            : null;

        const correctOption =
          question.options.find(
            (option) =>
              option.isCorrect === true
          ) || null;

        const isCorrect =
          !!selectedOption &&
          selectedOption.isCorrect === true;

        if (!selectedOptionId) {
          unanswered++;
        } else if (isCorrect) {
          correct++;
          earnedPoints += question.points;
        } else {
          incorrect++;
        }

        return {
          questionId: question.id,

          questionNumber:
            question.number,

          selectedOptionId:
            selectedOption?.id || null,

          correctOptionId:
            correctOption?.id || null,

          correctOptionKey:
            correctOption?.key || null,

          /*
            Test tugagandan keyin tahlil qilish
            uchun to'g'ri variant matnini ham
            qaytaramiz.
          */
          correctOptionText:
            correctOption?.text || "",

          correctOptionHtml:
            correctOption?.html || "",

          isCorrect,

          points: question.points,

          earnedPoints: isCorrect
            ? question.points
            : 0,
        };
      }
    );

    /* -----------------------------------------------------
       7. FOIZ
    ----------------------------------------------------- */

    const total = questions.length;

    const percentage =
      total > 0
        ? Math.round(
            (correct / total) * 100
          )
        : 0;

    /* -----------------------------------------------------
       8. CLIENTGA NATIJA

       is_correct ustuni hech qachon xom holatda
       yuborilmaydi.
    ----------------------------------------------------- */

    return NextResponse.json(
      {
        success: true,

        test: {
          id: String(test.id),

          title: String(
            test.title || ""
          ),

          bookTitle: String(
            test.book_title || ""
          ),

          subject: String(
            test.subject || ""
          ),

          grade: Number(
            test.grade
          ),
        },

        result: {
          total,
          correct,
          incorrect,
          unanswered,
          percentage,

          earnedPoints,
          totalPoints,
        },

        details,
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
      "Thematic test submit error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Test javoblarini tekshirishda server xatosi yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}
