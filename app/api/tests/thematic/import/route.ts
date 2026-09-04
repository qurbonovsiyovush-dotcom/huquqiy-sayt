import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================================================
   MAVZULASHTIRILGAN TEST — NEON BATCH IMPORT V2

   Asosiy farq:
   OLD:
     1609 savol -> 1609 INSERT
     ~6436 variant -> ~6436 INSERT

   V2:
     mavzular -> 1 batch INSERT
     savollar -> bir necha batch INSERT
     variantlar -> bir necha batch INSERT

   Natija: SQL so‘rovlari soni keskin kamayadi.
========================================================= */

type IncomingOption = {
  id?: string;
  label?: string;
  text?: string;
  html?: string;
  isCorrect?: boolean;
};

type IncomingQuestion = {
  id?: string;
  number?: number;
  questionText?: string;
  questionHtml?: string;
  options?: IncomingOption[];
  shapes?: unknown[];
  points?: number;
};

type IncomingSection = {
  title?: string;
  sectionType?:
    | "lesson"
    | "control"
    | "glossary"
    | "other";
  description?: string;
  questions?: IncomingQuestion[];
};

type ImportBody = {
  grade?: number;
  bookTitle?: string;
  subject?: string;
  edition?: string;
  description?: string;
  durationMinutes?: number;
  attemptLimit?: number | null;
  sections?: IncomingSection[];
};

type TestRow = {
  section_order: number;
  section_type: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  attempt_limit: number | null;
  question_count: number;
};

type QuestionRow = {
  test_id: string;
  section_order: number;
  question_number: number;
  question_text: string;
  question_html: string | null;
  points: number;
};

type OptionRow = {
  question_id: string;
  option_key: string;
  option_text: string;
  option_html: string | null;
  is_correct: boolean;
};

/* =========================================================
   YORDAMCHI FUNKSIYALAR
========================================================= */

function cleanText(value: unknown) {
  return String(value ?? "")
    .replace(/\u0000/g, "")
    .trim();
}

function normalizeGrade(value: unknown) {
  const grade = Number(value);

  if (
    grade === 8 ||
    grade === 9 ||
    grade === 10 ||
    grade === 11
  ) {
    return grade;
  }

  return null;
}

function normalizeSectionType(
  value: unknown
): "lesson" | "control" | "glossary" | "other" {
  if (
    value === "lesson" ||
    value === "control" ||
    value === "glossary" ||
    value === "other"
  ) {
    return value;
  }

  return "lesson";
}

function normalizeDuration(value: unknown) {
  const parsed = Number(value);

  if (
    Number.isFinite(parsed) &&
    parsed > 0
  ) {
    return Math.round(parsed);
  }

  return 60;
}

function normalizeAttemptLimit(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed <= 0
  ) {
    return null;
  }

  return Math.max(
    1,
    Math.round(parsed)
  );
}

function normalizePoints(value: unknown) {
  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed <= 0
  ) {
    return 1;
  }

  return parsed;
}

function htmlToPlainText(value: string) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function chunkArray<T>(
  items: T[],
  size: number
): T[][] {
  const result: T[][] = [];

  for (
    let index = 0;
    index < items.length;
    index += size
  ) {
    result.push(
      items.slice(
        index,
        index + size
      )
    );
  }

  return result;
}

/* =========================================================
   POST
========================================================= */

export async function POST(
  request: NextRequest
) {
  let createdBookId:
    | string
    | null = null;

  try {
    const body =
      (await request.json()) as ImportBody;

    /* =====================================================
       1. ASOSIY TEKSHIRUV
    ===================================================== */

    const grade =
      normalizeGrade(body.grade);

    if (grade === null) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Sinf noto‘g‘ri. Faqat 8, 9, 10 yoki 11-sinf mumkin.",
        },
        {
          status: 400,
        }
      );
    }

    const bookTitle =
      cleanText(body.bookTitle);

    if (!bookTitle) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Kitob nomi kiritilmagan.",
        },
        {
          status: 400,
        }
      );
    }

    const subject =
      cleanText(body.subject) ||
      "Davlat va huquq asoslari";

    const edition =
      cleanText(body.edition);

    const durationMinutes =
      normalizeDuration(
        body.durationMinutes
      );

    const attemptLimit =
      normalizeAttemptLimit(
        body.attemptLimit
      );

    const sections =
      Array.isArray(body.sections)
        ? body.sections
        : [];

    if (
      sections.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Saqlash uchun mavzular topilmadi.",
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       2. HAMMASINI DBGA YOZISHDAN OLDIN TEKSHIRAMIZ
    ===================================================== */

    let incomingQuestionCount =
      0;

    let incomingOptionCount =
      0;

    for (
      let sectionIndex = 0;
      sectionIndex <
      sections.length;
      sectionIndex++
    ) {
      const section =
        sections[
          sectionIndex
        ];

      const sectionTitle =
        cleanText(
          section.title
        );

      if (!sectionTitle) {
        return NextResponse.json(
          {
            success: false,
            message:
              `${sectionIndex + 1}-mavzuning nomi mavjud emas.`,
          },
          {
            status: 400,
          }
        );
      }

      const questions =
        Array.isArray(
          section.questions
        )
          ? section.questions
          : [];

      if (
        questions.length === 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              `"${sectionTitle}" mavzusida savollar mavjud emas.`,
          },
          {
            status: 400,
          }
        );
      }

      for (
        let questionIndex = 0;
        questionIndex <
        questions.length;
        questionIndex++
      ) {
        const question =
          questions[
            questionIndex
          ];

        const questionHtml =
          cleanText(
            question.questionHtml ||
              question.questionText
          );

        const questionText =
          cleanText(
            question.questionText
          ) ||
          htmlToPlainText(
            questionHtml
          );

        if (
          !questionText &&
          !questionHtml
        ) {
          return NextResponse.json(
            {
              success: false,
              message:
                `"${sectionTitle}" mavzusining ${
                  questionIndex + 1
                }-savolida savol matni yo‘q.`,
            },
            {
              status: 400,
            }
          );
        }

        const options =
          Array.isArray(
            question.options
          )
            ? question.options
            : [];

        if (
          options.length === 0
        ) {
          return NextResponse.json(
            {
              success: false,
              message:
                `"${sectionTitle}" mavzusining ${
                  questionIndex + 1
                }-savolida javob variantlari yo‘q.`,
            },
            {
              status: 400,
            }
          );
        }

        const correctCount =
          options.filter(
            (option) =>
              option.isCorrect ===
              true
          ).length;

        if (
          correctCount !== 1
        ) {
          return NextResponse.json(
            {
              success: false,
              message:
                `"${sectionTitle}" mavzusining ${
                  questionIndex + 1
                }-savolida aynan bitta to‘g‘ri javob bo‘lishi kerak.`,
            },
            {
              status: 400,
            }
          );
        }

        incomingQuestionCount++;
        incomingOptionCount +=
          options.length;
      }
    }

    /* =====================================================
       3. OLDINGI YARIM QOLGAN DRAFT IMPORTNI TOZALASH

       Bir xil:
       grade + title + draft

       bo‘lsa eski yarim import o‘chiriladi.

       Published kitobga TEGMAYDI.
    ===================================================== */

    await sql`
      DELETE FROM thematic_books
      WHERE
        grade = ${grade}
        AND title = ${bookTitle}
        AND status = 'draft'
    `;

    /* =====================================================
       4. KITOBNI YARATAMIZ
    ===================================================== */

    const bookResult =
      await sql`
        INSERT INTO thematic_books (
          grade,
          title,
          subject,
          edition,
          status,
          created_at,
          updated_at
        )
        VALUES (
          ${grade},
          ${bookTitle},
          ${subject},
          ${edition || null},
          'draft',
          NOW(),
          NOW()
        )
        RETURNING
          id::text AS id,
          grade,
          title,
          subject,
          edition,
          status
      `;

    const book =
      bookResult[0];

    if (!book?.id) {
      throw new Error(
        "Kitob ID yaratilmadi."
      );
    }

    createdBookId =
      String(book.id);

    /* =====================================================
       5. 31 TA MAVZUNI BITTA BATCHDA YOZAMIZ
    ===================================================== */

    const testRows:
      TestRow[] =
      sections.map(
        (
          section,
          sectionIndex
        ) => {
          const questions =
            Array.isArray(
              section.questions
            )
              ? section.questions
              : [];

          return {
            section_order:
              sectionIndex + 1,

            section_type:
              normalizeSectionType(
                section.sectionType
              ),

            title:
              cleanText(
                section.title
              ),

            description:
              cleanText(
                section.description
              ) || null,

            duration_minutes:
              durationMinutes,

            attempt_limit:
              attemptLimit,

            question_count:
              questions.length,
          };
        }
      );

    const testRowsJson =
      JSON.stringify(
        testRows
      );

    const insertedTests =
      await sql`
        WITH incoming AS (
          SELECT *
          FROM jsonb_to_recordset(
            ${testRowsJson}::jsonb
          ) AS x(
            section_order integer,
            section_type text,
            title text,
            description text,
            duration_minutes integer,
            attempt_limit integer,
            question_count integer
          )
        )

        INSERT INTO thematic_tests (
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
        )

        SELECT
          ${createdBookId}::bigint,
          section_order,
          section_type,
          title,
          description,
          duration_minutes,
          attempt_limit,
          'draft',
          question_count,
          NOW(),
          NOW()

        FROM incoming

        ORDER BY
          section_order

        RETURNING
          id::text AS id,
          section_order
      `;

    if (
      insertedTests.length !==
      sections.length
    ) {
      throw new Error(
        `Mavzular soni mos kelmadi. Kutilgan: ${sections.length}, saqlangan: ${insertedTests.length}.`
      );
    }

    const testIdBySection =
      new Map<
        number,
        string
      >();

    for (
      const row of
      insertedTests
    ) {
      testIdBySection.set(
        Number(
          row.section_order
        ),
        String(row.id)
      );
    }

    /* =====================================================
       6. BARCHA SAVOLLARNI TAYYORLAYMIZ
    ===================================================== */

    const questionRows:
      QuestionRow[] = [];

    for (
      let sectionIndex = 0;
      sectionIndex <
      sections.length;
      sectionIndex++
    ) {
      const sectionOrder =
        sectionIndex + 1;

      const testId =
        testIdBySection.get(
          sectionOrder
        );

      if (!testId) {
        throw new Error(
          `${sectionOrder}-mavzu test ID topilmadi.`
        );
      }

      const section =
        sections[
          sectionIndex
        ];

      const questions =
        Array.isArray(
          section.questions
        )
          ? section.questions
          : [];

      for (
        let questionIndex = 0;
        questionIndex <
        questions.length;
        questionIndex++
      ) {
        const question =
          questions[
            questionIndex
          ];

        const questionHtml =
          cleanText(
            question.questionHtml ||
              question.questionText
          );

        const questionText =
          cleanText(
            question.questionText
          ) ||
          htmlToPlainText(
            questionHtml
          );

        questionRows.push({
          test_id:
            testId,

          section_order:
            sectionOrder,

          question_number:
            questionIndex + 1,

          question_text:
            questionText,

          question_html:
            questionHtml ||
            null,

          points:
            normalizePoints(
              question.points
            ),
        });
      }
    }

    /* =====================================================
       7. SAVOLLARNI 250 TADAN BATCH QILIB YOZAMIZ

       1609 savol ≈ 7 ta SQL
    ===================================================== */

    const questionChunks =
      chunkArray(
        questionRows,
        250
      );

    const questionIdMap =
      new Map<
        string,
        string
      >();

    let savedQuestions = 0;

    for (
      const chunk of
      questionChunks
    ) {
      const chunkJson =
        JSON.stringify(
          chunk
        );

      const insertedQuestions =
        await sql`
          WITH incoming AS (
            SELECT *
            FROM jsonb_to_recordset(
              ${chunkJson}::jsonb
            ) AS x(
              test_id text,
              section_order integer,
              question_number integer,
              question_text text,
              question_html text,
              points numeric
            )
          )

          INSERT INTO thematic_questions (
            test_id,
            question_number,
            question_text,
            question_html,
            points,
            created_at,
            updated_at
          )

          SELECT
            test_id::bigint,
            question_number,
            question_text,
            question_html,
            points,
            NOW(),
            NOW()

          FROM incoming

          RETURNING
            id::text AS id,
            test_id::text AS test_id,
            question_number
        `;

      savedQuestions +=
        insertedQuestions.length;

      for (
        const row of
        insertedQuestions
      ) {
        const mapKey =
          `${String(
            row.test_id
          )}:${Number(
            row.question_number
          )}`;

        questionIdMap.set(
          mapKey,
          String(row.id)
        );
      }
    }

    if (
      savedQuestions !==
      incomingQuestionCount
    ) {
      throw new Error(
        `Savollar soni mos kelmadi. Kutilgan: ${incomingQuestionCount}, saqlangan: ${savedQuestions}.`
      );
    }

    /* =====================================================
       8. BARCHA A/B/C/D VARIANTLARNI TAYYORLAYMIZ
    ===================================================== */

    const optionRows:
      OptionRow[] = [];

    for (
      let sectionIndex = 0;
      sectionIndex <
      sections.length;
      sectionIndex++
    ) {
      const sectionOrder =
        sectionIndex + 1;

      const testId =
        testIdBySection.get(
          sectionOrder
        );

      if (!testId) {
        throw new Error(
          `${sectionOrder}-mavzu test ID topilmadi.`
        );
      }

      const section =
        sections[
          sectionIndex
        ];

      const questions =
        Array.isArray(
          section.questions
        )
          ? section.questions
          : [];

      for (
        let questionIndex = 0;
        questionIndex <
        questions.length;
        questionIndex++
      ) {
        const questionNumber =
          questionIndex + 1;

        const questionMapKey =
          `${testId}:${questionNumber}`;

        const questionId =
          questionIdMap.get(
            questionMapKey
          );

        if (!questionId) {
          throw new Error(
            `${sectionOrder}-mavzuning ${questionNumber}-savol IDsi topilmadi.`
          );
        }

        const question =
          questions[
            questionIndex
          ];

        const options =
          Array.isArray(
            question.options
          )
            ? question.options
            : [];

        for (
          let optionIndex = 0;
          optionIndex <
          options.length;
          optionIndex++
        ) {
          const option =
            options[
              optionIndex
            ];

          const optionKey =
            cleanText(
              option.label
            ) ||
            String.fromCharCode(
              65 +
                optionIndex
            );

          const optionHtml =
            cleanText(
              option.html ||
                option.text
            );

          const optionText =
            cleanText(
              option.text
            ) ||
            htmlToPlainText(
              optionHtml
            );

          optionRows.push({
            question_id:
              questionId,

            option_key:
              optionKey,

            option_text:
              optionText,

            option_html:
              optionHtml ||
              null,

            is_correct:
              option.isCorrect ===
              true,
          });
        }
      }
    }

    /* =====================================================
       9. VARIANTLARNI 1000 TADAN BATCH QILIB YOZAMIZ

       ~6436 variant ≈ 7 ta SQL
    ===================================================== */

    const optionChunks =
      chunkArray(
        optionRows,
        1000
      );

    let savedOptions = 0;

    for (
      const chunk of
      optionChunks
    ) {
      const chunkJson =
        JSON.stringify(
          chunk
        );

      const insertedOptions =
        await sql`
          WITH incoming AS (
            SELECT *
            FROM jsonb_to_recordset(
              ${chunkJson}::jsonb
            ) AS x(
              question_id text,
              option_key text,
              option_text text,
              option_html text,
              is_correct boolean
            )
          )

          INSERT INTO thematic_options (
            question_id,
            option_key,
            option_text,
            option_html,
            is_correct,
            created_at
          )

          SELECT
            question_id::bigint,
            option_key,
            option_text,
            option_html,
            is_correct,
            NOW()

          FROM incoming

          RETURNING id
        `;

      savedOptions +=
        insertedOptions.length;
    }

    if (
      savedOptions !==
      incomingOptionCount
    ) {
      throw new Error(
        `Variantlar soni mos kelmadi. Kutilgan: ${incomingOptionCount}, saqlangan: ${savedOptions}.`
      );
    }

    /* =====================================================
       10. BAZADAGI SAVOLLARNI TEKSHIRAMIZ
    ===================================================== */

    const verification =
      await sql`
        SELECT
          COUNT(q.id)::int
            AS question_count

        FROM thematic_questions q

        INNER JOIN thematic_tests t
          ON t.id =
            q.test_id

        WHERE
          t.book_id =
            ${createdBookId}::bigint
      `;

    const verifiedQuestions =
      Number(
        verification[0]
          ?.question_count ??
          0
      );

    if (
      verifiedQuestions !==
      incomingQuestionCount
    ) {
      throw new Error(
        `Yakuniy tekshiruvda savollar soni mos kelmadi. Kutilgan: ${incomingQuestionCount}, bazada: ${verifiedQuestions}.`
      );
    }

    /* =====================================================
       11. NATIJA
    ===================================================== */

    return NextResponse.json({
      success: true,

      message:
        "Mavzulashtirilgan kitob Neon bazasiga batch usulida muvaffaqiyatli saqlandi.",

      book: {
        id:
          createdBookId,

        grade,

        title:
          bookTitle,

        subject,

        edition:
          edition ||
          null,

        status:
          "draft",
      },

      saved: {
        sections:
          sections.length,

        questions:
          savedQuestions,

        options:
          savedOptions,

        verifiedQuestions,
      },

      performance: {
        questionBatches:
          questionChunks.length,

        optionBatches:
          optionChunks.length,
      },
    });
  } catch (error) {
    console.error(
      "THEMATIC NEON BATCH IMPORT ERROR:",
      error
    );

    /* =====================================================
       XATO BO‘LSA YANGI YARIM IMPORTNI TOZALAYMIZ
    ===================================================== */

    if (
      createdBookId
    ) {
      try {
        await sql`
          DELETE FROM thematic_books
          WHERE
            id =
              ${createdBookId}::bigint
        `;
      } catch (
        cleanupError
      ) {
        console.error(
          "THEMATIC IMPORT CLEANUP ERROR:",
          cleanupError
        );
      }
    }

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Mavzulashtirilgan testlarni Neon bazasiga saqlashda xatolik yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}
