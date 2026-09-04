import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================================================
   MAVZULASHTIRILGAN TESTLARNI NEON'GA IMPORT QILISH

   Tuzilishi:
   thematic_books
      ↓
   thematic_tests
      ↓
   thematic_questions
      ↓
   thematic_options
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

  // Hozirgi editor yuborishi mumkin.
  // Hozircha DB sxemasida shapes uchun alohida ustun yo'q.
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
  const duration = Number(value);

  if (
    Number.isFinite(duration) &&
    duration > 0
  ) {
    return Math.round(duration);
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

/* =========================================================
   HTML'DAN ODDIY MATN FALLBACK
========================================================= */

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

/* =========================================================
   POST
========================================================= */

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      (await request.json()) as ImportBody;

    /* -----------------------------------------------------
       1. ASOSIY MA'LUMOTLARNI TEKSHIRISH
    ----------------------------------------------------- */

    const grade =
      normalizeGrade(body.grade);

    if (grade === null) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Sinf noto‘g‘ri. Faqat 8, 9, 10 yoki 11-sinf mumkin.",
        },
        { status: 400 }
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
        { status: 400 }
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

    if (sections.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Saqlash uchun mavzular topilmadi.",
        },
        { status: 400 }
      );
    }

    /* -----------------------------------------------------
       2. SAVOLLARNI OLDINDAN TEKSHIRAMIZ

       DBga yozishni boshlashdan oldin xato bo'lsa shu yerda
       to'xtaydi.
    ----------------------------------------------------- */

    let incomingQuestionCount = 0;

    for (
      let sectionIndex = 0;
      sectionIndex < sections.length;
      sectionIndex++
    ) {
      const section =
        sections[sectionIndex];

      const sectionTitle =
        cleanText(section.title);

      if (!sectionTitle) {
        return NextResponse.json(
          {
            success: false,
            message:
              `${sectionIndex + 1}-mavzuning nomi mavjud emas.`,
          },
          { status: 400 }
        );
      }

      const questions =
        Array.isArray(
          section.questions
        )
          ? section.questions
          : [];

      if (questions.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              `"${sectionTitle}" mavzusida savollar mavjud emas.`,
          },
          { status: 400 }
        );
      }

      for (
        let questionIndex = 0;
        questionIndex <
        questions.length;
        questionIndex++
      ) {
        const question =
          questions[questionIndex];

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
            { status: 400 }
          );
        }

        const options =
          Array.isArray(
            question.options
          )
            ? question.options
            : [];

        if (options.length === 0) {
          return NextResponse.json(
            {
              success: false,
              message:
                `"${sectionTitle}" mavzusining ${
                  questionIndex + 1
                }-savolida javob variantlari yo‘q.`,
            },
            { status: 400 }
          );
        }

        const correctCount =
          options.filter(
            (option) =>
              option.isCorrect === true
          ).length;

        if (correctCount !== 1) {
          return NextResponse.json(
            {
              success: false,
              message:
                `"${sectionTitle}" mavzusining ${
                  questionIndex + 1
                }-savolida aynan bitta to‘g‘ri javob bo‘lishi kerak.`,
            },
            { status: 400 }
          );
        }

        incomingQuestionCount++;
      }
    }

    /* -----------------------------------------------------
       3. KITOBNI YARATAMIZ

       Hozirgi importda har bir PDF alohida kitob bo'ladi.
    ----------------------------------------------------- */

    const createdBooks =
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
          id,
          grade,
          title,
          subject,
          edition,
          status
      `;

    const book =
      createdBooks[0];

    if (!book?.id) {
      throw new Error(
        "Kitob ID yaratilmadi."
      );
    }

    const bookId =
      Number(book.id);

    let savedSections = 0;
    let savedQuestions = 0;
    let savedOptions = 0;

    /* -----------------------------------------------------
       4. MAVZULARNI SAQLAYMIZ
    ----------------------------------------------------- */

    try {
      for (
        let sectionIndex = 0;
        sectionIndex <
        sections.length;
        sectionIndex++
      ) {
        const section =
          sections[sectionIndex];

        const sectionTitle =
          cleanText(
            section.title
          );

        const sectionType =
          normalizeSectionType(
            section.sectionType
          );

        const sectionDescription =
          cleanText(
            section.description
          );

        const questions =
          Array.isArray(
            section.questions
          )
            ? section.questions
            : [];

        const createdTests =
          await sql`
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
            VALUES (
              ${bookId},
              ${sectionIndex + 1},
              ${sectionType},
              ${sectionTitle},
              ${
                sectionDescription ||
                null
              },
              ${durationMinutes},
              ${attemptLimit},
              'draft',
              ${questions.length},
              NOW(),
              NOW()
            )
            RETURNING id
          `;

        const testId =
          Number(
            createdTests[0]?.id
          );

        if (!testId) {
          throw new Error(
            `"${sectionTitle}" mavzusi uchun test ID yaratilmadi.`
          );
        }

        savedSections++;

        /* -------------------------------------------------
           5. SAVOLLARNI SAQLAYMIZ
        ------------------------------------------------- */

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

          const points =
            normalizePoints(
              question.points
            );

          const createdQuestions =
            await sql`
              INSERT INTO thematic_questions (
                test_id,
                question_number,
                question_text,
                question_html,
                points,
                created_at,
                updated_at
              )
              VALUES (
                ${testId},
                ${questionIndex + 1},
                ${questionText},
                ${questionHtml || null},
                ${points},
                NOW(),
                NOW()
              )
              RETURNING id
            `;

          const questionId =
            Number(
              createdQuestions[0]?.id
            );

          if (!questionId) {
            throw new Error(
              `"${sectionTitle}" mavzusining ${
                questionIndex + 1
              }-savoli uchun ID yaratilmadi.`
            );
          }

          savedQuestions++;

          /* -----------------------------------------------
             6. A/B/C/D VARIANTLARNI SAQLAYMIZ
          ----------------------------------------------- */

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
              options[optionIndex];

            const optionKey =
              cleanText(
                option.label
              ) ||
              String.fromCharCode(
                65 + optionIndex
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

            await sql`
              INSERT INTO thematic_options (
                question_id,
                option_key,
                option_text,
                option_html,
                is_correct,
                created_at
              )
              VALUES (
                ${questionId},
                ${optionKey},
                ${optionText},
                ${optionHtml || null},
                ${
                  option.isCorrect ===
                  true
                },
                NOW()
              )
            `;

            savedOptions++;
          }
        }
      }

      /* ---------------------------------------------------
         7. KITOB QUESTION COUNTINI TEKSHIRAMIZ
      --------------------------------------------------- */

      const actualCount =
        await sql`
          SELECT
            COUNT(q.id)::int AS count
          FROM thematic_questions q
          INNER JOIN thematic_tests t
            ON t.id = q.test_id
          WHERE t.book_id = ${bookId}
        `;

      const databaseQuestionCount =
        Number(
          actualCount[0]?.count ??
            0
        );

      if (
        databaseQuestionCount !==
        incomingQuestionCount
      ) {
        throw new Error(
          `Savollar soni mos kelmadi. Kutilgan: ${incomingQuestionCount}, bazada: ${databaseQuestionCount}.`
        );
      }

      /* ---------------------------------------------------
         8. MUVAFFAQIYATLI NATIJA
      --------------------------------------------------- */

      return NextResponse.json({
        success: true,

        message:
          "Mavzulashtirilgan kitob Neon bazasiga muvaffaqiyatli saqlandi.",

        book: {
          id: String(
            book.id
          ),
          grade:
            Number(book.grade),
          title:
            String(book.title),
          subject:
            String(book.subject),
          edition:
            book.edition
              ? String(
                  book.edition
                )
              : null,
          status:
            String(book.status),
        },

        saved: {
          sections:
            savedSections,

          questions:
            savedQuestions,

          options:
            savedOptions,

          verifiedQuestions:
            databaseQuestionCount,
        },
      });
    } catch (saveError) {
      /*
        Import o'rtasida xato chiqsa yarimta kitob qolib ketmasin.

        thematic_books o'chirilganda:
        thematic_tests
        thematic_questions
        thematic_options

        ON DELETE CASCADE orqali avtomatik o'chadi.
      */

      await sql`
        DELETE FROM thematic_books
        WHERE id = ${bookId}
      `;

      throw saveError;
    }
  } catch (error) {
    console.error(
      "THEMATIC NEON IMPORT ERROR:",
      error
    );

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
