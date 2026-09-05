import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type KazusQuestionInput = {
  id?: string;
  question?: string;
  answer?: string;
};

type KazusInput = {
  id?: string;
  subject?: string;
  title?: string;
  caseText?: string;
  questions?: KazusQuestionInput[];
};

type DbKazus = {
  id: string;
  subject: string;
  title: string;
  case_text: string;
  case_type: string;
  created_at: string | Date;
  updated_at: string | Date;
};

type DbQuestion = {
  id: string;
  kazus_id: string;
  question_order: number;
  question: string;
  answer: string;
  created_at: string | Date;
  updated_at: string | Date;
};

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  };
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: noStoreHeaders(),
  });
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function toIso(value: string | Date | null | undefined) {
  if (!value) return new Date().toISOString();

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  return date.toISOString();
}

function normalizeQuestions(
  questions: KazusQuestionInput[] | undefined
) {
  if (!Array.isArray(questions)) return [];

  return questions
    .map((item) => ({
      id: clean(item?.id),
      question: clean(item?.question),
      answer: clean(item?.answer),
    }))
    .filter((item) => item.question && item.answer);
}

function mapKazus(
  row: DbKazus,
  questions: DbQuestion[]
) {
  return {
    id: row.id,
    type: "platform" as const,
    subject: row.subject,
    title: row.title,
    caseText: row.case_text,

    questions: questions
      .sort(
        (a, b) =>
          Number(a.question_order) -
          Number(b.question_order)
      )
      .map((question) => ({
        id: question.id,
        question: question.question,
        answer: question.answer,
      })),

    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

/* =========================================================
   GET
   ---------------------------------------------------------
   /api/kazuslar
       -> barcha platform kazuslar

   /api/kazuslar?id=abc
       -> bitta kazus
   ========================================================= */

export async function GET(request: NextRequest) {
  try {
    const id = clean(
      request.nextUrl.searchParams.get("id")
    );

    /* ---------------- Bitta kazus ---------------- */

    if (id) {
      const rows = (await sql`
        SELECT
          id,
          subject,
          title,
          case_text,
          case_type,
          created_at,
          updated_at
        FROM kazuslar
        WHERE id = ${id}
        LIMIT 1
      `) as DbKazus[];

      if (!rows.length) {
        return json(
          {
            success: false,
            ok: false,
            error: "KAZUS_NOT_FOUND",
            message: "Kazus topilmadi.",
          },
          404
        );
      }

      const questionRows = (await sql`
        SELECT
          id,
          kazus_id,
          question_order,
          question,
          answer,
          created_at,
          updated_at
        FROM kazus_questions
        WHERE kazus_id = ${id}
        ORDER BY question_order ASC
      `) as DbQuestion[];

      const item = mapKazus(
        rows[0],
        questionRows
      );

      return json({
        success: true,
        ok: true,
        item,
        kazus: item,
      });
    }

    /* ---------------- Barcha kazuslar ---------------- */

    const kazusRows = (await sql`
      SELECT
        id,
        subject,
        title,
        case_text,
        case_type,
        created_at,
        updated_at
      FROM kazuslar
      WHERE case_type = 'platform'
      ORDER BY created_at DESC
    `) as DbKazus[];

    if (!kazusRows.length) {
      return json({
        success: true,
        ok: true,
        count: 0,
        total: 0,
        items: [],
        kazuslar: [],
      });
    }

    const questionRows = (await sql`
      SELECT
        id,
        kazus_id,
        question_order,
        question,
        answer,
        created_at,
        updated_at
      FROM kazus_questions
      ORDER BY kazus_id, question_order ASC
    `) as DbQuestion[];

    const questionsByKazus =
      new Map<string, DbQuestion[]>();

    for (const question of questionRows) {
      const current =
        questionsByKazus.get(question.kazus_id) ?? [];

      current.push(question);

      questionsByKazus.set(
        question.kazus_id,
        current
      );
    }

    const items = kazusRows.map((row) =>
      mapKazus(
        row,
        questionsByKazus.get(row.id) ?? []
      )
    );

    return json({
      success: true,
      ok: true,
      count: items.length,
      total: items.length,

      // Eski frontendlarning turli variantlari
      // bilan mos bo‘lishi uchun ikkala nom ham.
      items,
      kazuslar: items,
    });
  } catch (error) {
    console.error("GET /api/kazuslar error:", error);

    return json(
      {
        success: false,
        ok: false,
        error: "KAZUS_GET_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Kazuslarni olishda xatolik yuz berdi.",
      },
      500
    );
  }
}

/* =========================================================
   POST
   ---------------------------------------------------------
   Yangi platform kazus yaratadi.

   Body:
   {
     subject,
     title,
     caseText,
     questions: [
       {
         id?,
         question,
         answer
       }
     ]
   }
   ========================================================= */

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as KazusInput;

    const id = clean(body.id) || makeId("kazus");
    const subject = clean(body.subject);
    const title = clean(body.title);
    const caseText = clean(body.caseText);

    const questions = normalizeQuestions(
      body.questions
    );

    if (!subject) {
      return json(
        {
          success: false,
          ok: false,
          error: "SUBJECT_REQUIRED",
          message: "Fan nomi kiritilmagan.",
        },
        400
      );
    }

    if (!title) {
      return json(
        {
          success: false,
          ok: false,
          error: "TITLE_REQUIRED",
          message: "Kazus sarlavhasi kiritilmagan.",
        },
        400
      );
    }

    if (!caseText) {
      return json(
        {
          success: false,
          ok: false,
          error: "CASE_TEXT_REQUIRED",
          message: "Kazus matni kiritilmagan.",
        },
        400
      );
    }

    if (!questions.length) {
      return json(
        {
          success: false,
          ok: false,
          error: "QUESTION_REQUIRED",
          message:
            "Kamida bitta to‘liq savol va javob bo‘lishi kerak.",
        },
        400
      );
    }

    const existing = await sql`
      SELECT id
      FROM kazuslar
      WHERE id = ${id}
      LIMIT 1
    `;

    if (existing.length) {
      return json(
        {
          success: false,
          ok: false,
          error: "KAZUS_ALREADY_EXISTS",
          message:
            "Bu ID bilan kazus allaqachon mavjud.",
        },
        409
      );
    }

    await sql`
      INSERT INTO kazuslar (
        id,
        subject,
        title,
        case_text,
        case_type,
        created_at,
        updated_at
      )
      VALUES (
        ${id},
        ${subject},
        ${title},
        ${caseText},
        'platform',
        NOW(),
        NOW()
      )
    `;

    try {
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];

        const questionId =
          question.id || makeId("kq");

        await sql`
          INSERT INTO kazus_questions (
            id,
            kazus_id,
            question_order,
            question,
            answer,
            created_at,
            updated_at
          )
          VALUES (
            ${questionId},
            ${id},
            ${i + 1},
            ${question.question},
            ${question.answer},
            NOW(),
            NOW()
          )
        `;
      }
    } catch (questionError) {
      // Savollarni yozishda xato bo‘lsa,
      // yarim kazus qolib ketmasin.
      await sql`
        DELETE FROM kazuslar
        WHERE id = ${id}
      `;

      throw questionError;
    }

    const createdRows = (await sql`
      SELECT
        id,
        subject,
        title,
        case_text,
        case_type,
        created_at,
        updated_at
      FROM kazuslar
      WHERE id = ${id}
      LIMIT 1
    `) as DbKazus[];

    const createdQuestions = (await sql`
      SELECT
        id,
        kazus_id,
        question_order,
        question,
        answer,
        created_at,
        updated_at
      FROM kazus_questions
      WHERE kazus_id = ${id}
      ORDER BY question_order ASC
    `) as DbQuestion[];

    const item = mapKazus(
      createdRows[0],
      createdQuestions
    );

    return json(
      {
        success: true,
        ok: true,
        message: "Kazus saqlandi.",
        item,
        kazus: item,
      },
      201
    );
  } catch (error) {
    console.error("POST /api/kazuslar error:", error);

    return json(
      {
        success: false,
        ok: false,
        error: "KAZUS_CREATE_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Kazusni saqlashda xatolik yuz berdi.",
      },
      500
    );
  }
}

/* =========================================================
   PUT
   ---------------------------------------------------------
   Mavjud kazusni tahrirlaydi.

   Body:
   {
     id,
     subject,
     title,
     caseText,
     questions:[...]
   }
   ========================================================= */

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as KazusInput;

    const id = clean(body.id);
    const subject = clean(body.subject);
    const title = clean(body.title);
    const caseText = clean(body.caseText);

    const questions = normalizeQuestions(
      body.questions
    );

    if (!id) {
      return json(
        {
          success: false,
          ok: false,
          error: "ID_REQUIRED",
          message: "Kazus ID topilmadi.",
        },
        400
      );
    }

    if (!subject || !title || !caseText) {
      return json(
        {
          success: false,
          ok: false,
          error: "INVALID_KAZUS",
          message:
            "Fan, sarlavha va kazus matni to‘liq kiritilishi kerak.",
        },
        400
      );
    }

    if (!questions.length) {
      return json(
        {
          success: false,
          ok: false,
          error: "QUESTION_REQUIRED",
          message:
            "Kamida bitta to‘liq savol va javob bo‘lishi kerak.",
        },
        400
      );
    }

    const existing = await sql`
      SELECT id
      FROM kazuslar
      WHERE id = ${id}
      LIMIT 1
    `;

    if (!existing.length) {
      return json(
        {
          success: false,
          ok: false,
          error: "KAZUS_NOT_FOUND",
          message: "Kazus topilmadi.",
        },
        404
      );
    }

    await sql`
      UPDATE kazuslar
      SET
        subject = ${subject},
        title = ${title},
        case_text = ${caseText},
        updated_at = NOW()
      WHERE id = ${id}
    `;

    await sql`
      DELETE FROM kazus_questions
      WHERE kazus_id = ${id}
    `;

    try {
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];

        const questionId =
          question.id || makeId("kq");

        await sql`
          INSERT INTO kazus_questions (
            id,
            kazus_id,
            question_order,
            question,
            answer,
            created_at,
            updated_at
          )
          VALUES (
            ${questionId},
            ${id},
            ${i + 1},
            ${question.question},
            ${question.answer},
            NOW(),
            NOW()
          )
        `;
      }
    } catch (questionError) {
      console.error(
        "Kazus questions update error:",
        questionError
      );

      throw questionError;
    }

    const updatedRows = (await sql`
      SELECT
        id,
        subject,
        title,
        case_text,
        case_type,
        created_at,
        updated_at
      FROM kazuslar
      WHERE id = ${id}
      LIMIT 1
    `) as DbKazus[];

    const updatedQuestions = (await sql`
      SELECT
        id,
        kazus_id,
        question_order,
        question,
        answer,
        created_at,
        updated_at
      FROM kazus_questions
      WHERE kazus_id = ${id}
      ORDER BY question_order ASC
    `) as DbQuestion[];

    const item = mapKazus(
      updatedRows[0],
      updatedQuestions
    );

    return json({
      success: true,
      ok: true,
      message: "Kazus yangilandi.",
      item,
      kazus: item,
    });
  } catch (error) {
    console.error("PUT /api/kazuslar error:", error);

    return json(
      {
        success: false,
        ok: false,
        error: "KAZUS_UPDATE_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Kazusni yangilashda xatolik yuz berdi.",
      },
      500
    );
  }
}

/* =========================================================
   DELETE
   ---------------------------------------------------------
   /api/kazuslar?id=abc

   yoki body:
   { id: "abc" }

   ON DELETE CASCADE sabab savol-javoblar ham
   avtomatik o‘chadi.
   ========================================================= */

export async function DELETE(request: NextRequest) {
  try {
    let id = clean(
      request.nextUrl.searchParams.get("id")
    );

    if (!id) {
      try {
        const body = await request.json();
        id = clean(body?.id);
      } catch {
        // Body bo‘lmasligi mumkin.
      }
    }

    if (!id) {
      return json(
        {
          success: false,
          ok: false,
          error: "ID_REQUIRED",
          message: "Kazus ID topilmadi.",
        },
        400
      );
    }

    const existing = await sql`
      SELECT id
      FROM kazuslar
      WHERE id = ${id}
      LIMIT 1
    `;

    if (!existing.length) {
      return json(
        {
          success: false,
          ok: false,
          error: "KAZUS_NOT_FOUND",
          message: "Kazus topilmadi.",
        },
        404
      );
    }

    await sql`
      DELETE FROM kazuslar
      WHERE id = ${id}
    `;

    return json({
      success: true,
      ok: true,
      id,
      message: "Kazus o‘chirildi.",
    });
  } catch (error) {
    console.error("DELETE /api/kazuslar error:", error);

    return json(
      {
        success: false,
        ok: false,
        error: "KAZUS_DELETE_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Kazusni o‘chirishda xatolik yuz berdi.",
      },
      500
    );
  }
}
