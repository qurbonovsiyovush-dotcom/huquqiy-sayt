import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type IncomingOption = {
  id?: unknown;
  text?: unknown;
  optionText?: unknown;
  html?: unknown;
  isCorrect?: unknown;
  correct?: unknown;
};

type IncomingQuestion = {
  id?: unknown;
  questionText?: unknown;
  questionHtml?: unknown;
  points?: unknown;
  shapes?: unknown;
  options?: IncomingOption[];
};

async function isAdmin() {
  const cookieStore = await cookies();

  return (
    cookieStore.get("qurbonov_session")?.value &&
    cookieStore.get("qurbonov_role")?.value === "admin"
  );
}

function normalizeStatus(value: unknown) {
  return value === "published"
    ? "published"
    : "draft";
}

function optionKey(index: number) {
  return String.fromCharCode(
    65 + index
  );
}

function asObject(
  value: unknown
): Record<string, unknown> {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  )
    ? (value as Record<string, unknown>)
    : {};
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const testRows = await sql`
      SELECT
        id,
        title,
        subject,
        duration,
        description,
        test_type,
        custom_test_type_name,
        status,
        attempt_limit,
        extra_json,
        created_at,
        updated_at
      FROM legacy_tests
      WHERE id = ${id}
      LIMIT 1
    `;

    if (testRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Test topilmadi.",
        },
        { status: 404 }
      );
    }

    const testRow: any =
      testRows[0];

    /*
      Draft testni foydalanuvchiga bermaymiz.
      Admin esa tahrirlash uchun ko‘ra oladi.
    */
    const admin = await isAdmin();

    if (
      testRow.status !== "published" &&
      !admin
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bu test hali e’lon qilinmagan.",
        },
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
        shapes_json,
        extra_json
      FROM legacy_test_questions
      WHERE test_id = ${id}
      ORDER BY question_number ASC, id ASC
    `;

    const questionIds =
      questionRows.map(
        (row: any) =>
          Number(row.id)
      );

    let optionRows: any[] = [];

    if (questionIds.length > 0) {
      optionRows = await sql`
        SELECT
          id,
          question_id,
          option_key,
          option_text,
          option_html,
          is_correct,
          extra_json
        FROM legacy_test_options
        WHERE question_id = ANY(${questionIds})
        ORDER BY
          question_id ASC,
          option_key ASC,
          id ASC
      `;
    }

    const optionsByQuestion =
      new Map<number, any[]>();

    for (const row of optionRows) {
      const questionId =
        Number(row.question_id);

      const current =
        optionsByQuestion.get(
          questionId
        ) || [];

      current.push({
        id: String(row.id),
        text:
          String(
            row.option_html ||
              row.option_text ||
              ""
          ),
        optionText:
          String(
            row.option_text ||
              ""
          ),
        html:
          row.option_html
            ? String(row.option_html)
            : "",
        isCorrect:
          row.is_correct === true,
        correct:
          row.is_correct === true,
      });

      optionsByQuestion.set(
        questionId,
        current
      );
    }

    const questions =
      questionRows.map(
        (row: any) => ({
          id: String(row.id),
          questionText:
            String(
              row.question_text || ""
            ),
          questionHtml:
            String(
              row.question_html ||
                row.question_text ||
                ""
            ),
          points:
            Number(row.points) || 1,
          shapes:
            Array.isArray(row.shapes_json)
              ? row.shapes_json
              : [],
          options:
            optionsByQuestion.get(
              Number(row.id)
            ) || [],
        })
      );

    const test = {
      id: String(testRow.id),
      title:
        String(testRow.title || ""),
      subject:
        String(testRow.subject || ""),
      duration:
        Number(testRow.duration) || 30,
      description:
        testRow.description == null
          ? ""
          : String(
              testRow.description
            ),
      status:
        normalizeStatus(
          testRow.status
        ),
      testType:
        testRow.test_type == null
          ? undefined
          : String(
              testRow.test_type
            ),
      customTestTypeName:
        testRow.custom_test_type_name ==
        null
          ? undefined
          : String(
              testRow.custom_test_type_name
            ),
      attemptLimit:
        testRow.attempt_limit == null
          ? null
          : Number(
              testRow.attempt_limit
            ),
      questions,
      questionCount:
        questions.length,
      storage: "legacy",
      createdAt:
        testRow.created_at
          ? new Date(
              testRow.created_at
            ).toISOString()
          : undefined,
      updatedAt:
        testRow.updated_at
          ? new Date(
              testRow.updated_at
            ).toISOString()
          : undefined,
      ...asObject(
        testRow.extra_json
      ),
    };

    return NextResponse.json({
      success: true,
      test,
    });
  } catch (error) {
    console.error(
      "LEGACY NEON GET ONE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Testni yuklab bo‘lmadi.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Faqat administrator uchun.",
        },
        { status: 403 }
      );
    }

    const { id } =
      await context.params;

    const body =
      await request.json();

    const existing =
      await sql`
        SELECT id
        FROM legacy_tests
        WHERE id = ${id}
        LIMIT 1
      `;

    if (existing.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Test topilmadi.",
        },
        { status: 404 }
      );
    }

    /*
      Admin paneldagi "E'lon qilish / Qoralama" tugmasi
      faqat { status } yuboradi.
    */
    if (
      body?.status &&
      !Array.isArray(body?.questions)
    ) {
      const status =
        normalizeStatus(
          body.status
        );

      if (
        status === "published"
      ) {
        const counts =
          await sql`
            SELECT
              COUNT(*)::int AS question_count
            FROM legacy_test_questions
            WHERE test_id = ${id}
          `;

        if (
          Number(
            counts[0]?.question_count
          ) <= 0
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
      }

      await sql`
        UPDATE legacy_tests
        SET
          status = ${status},
          updated_at = NOW()
        WHERE id = ${id}
      `;

      return NextResponse.json({
        success: true,
        testId: id,
        status,
      });
    }

    /*
      /test/editor to‘liq test obyektini yuborsa,
      Neon jadvallarini qayta saqlaymiz.
    */
    const title =
      String(
        body?.title || ""
      ).trim();

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Test nomi bo‘sh bo‘lishi mumkin emas.",
        },
        { status: 400 }
      );
    }

    const questions:
      IncomingQuestion[] =
      Array.isArray(
        body?.questions
      )
        ? body.questions
        : [];

    const status =
      normalizeStatus(
        body?.status
      );

    if (
      status === "published" &&
      questions.length === 0
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

    await sql`
      UPDATE legacy_tests
      SET
        title = ${title},
        subject = ${
          String(
            body?.subject || ""
          ).trim()
        },
        duration = ${
          Math.max(
            1,
            Number(
              body?.duration
            ) || 30
          )
        },
        description = ${
          String(
            body?.description ||
              ""
          )
        },
        test_type = ${
          body?.testType
            ? String(
                body.testType
              )
            : null
        },
        custom_test_type_name = ${
          body?.customTestTypeName
            ? String(
                body.customTestTypeName
              )
            : null
        },
        status = ${status},
        attempt_limit = ${
          body?.attemptLimit == null ||
          body?.attemptLimit === ""
            ? null
            : Math.max(
                1,
                Number(
                  body.attemptLimit
                ) || 1
              )
        },
        questions_json =
          '[]'::jsonb,
        updated_at = NOW()
      WHERE id = ${id}
    `;

    /*
      ON DELETE CASCADE variantlarni ham o‘chiradi.
    */
    await sql`
      DELETE FROM legacy_test_questions
      WHERE test_id = ${id}
    `;

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

      const questionText =
        String(
          question?.questionText ??
            question?.questionHtml ??
            ""
        ).trim();

      const questionHtml =
        String(
          question?.questionHtml ??
            questionText
        );

      const shapes =
        Array.isArray(
          question?.shapes
        )
          ? question.shapes
          : [];

      const insertedQuestions =
        await sql`
          INSERT INTO legacy_test_questions (
            test_id,
            question_number,
            question_text,
            question_html,
            points,
            shapes_json,
            extra_json,
            created_at,
            updated_at
          )
          VALUES (
            ${id},
            ${questionIndex + 1},
            ${questionText},
            ${questionHtml},
            ${
              Number(
                question?.points
              ) || 1
            },
            ${JSON.stringify(
              shapes
            )}::jsonb,
            '{}'::jsonb,
            NOW(),
            NOW()
          )
          RETURNING id
        `;

      const questionId =
        Number(
          insertedQuestions[0]?.id
        );

      const options =
        Array.isArray(
          question?.options
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

        const optionText =
          String(
            option?.optionText ??
              option?.text ??
              ""
          );

        const optionHtml =
          String(
            option?.html ?? ""
          );

        const isCorrect =
          option?.isCorrect === true ||
          option?.correct === true;

        await sql`
          INSERT INTO legacy_test_options (
            question_id,
            option_key,
            option_text,
            option_html,
            is_correct,
            extra_json,
            created_at,
            updated_at
          )
          VALUES (
            ${questionId},
            ${optionKey(
              optionIndex
            )},
            ${optionText},
            ${
              optionHtml ||
              null
            },
            ${isCorrect},
            '{}'::jsonb,
            NOW(),
            NOW()
          )
        `;
      }
    }

    return NextResponse.json({
      success: true,
      message:
        "Test Neon bazasida saqlandi.",
      testId: id,
      questionCount:
        questions.length,
    });
  } catch (error) {
    console.error(
      "LEGACY NEON PUT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Testni saqlab bo‘lmadi.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Faqat administrator uchun.",
        },
        { status: 403 }
      );
    }

    const { id } =
      await context.params;

    const deleted =
      await sql`
        DELETE FROM legacy_tests
        WHERE id = ${id}
        RETURNING id
      `;

    if (
      deleted.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Test topilmadi.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedId: id,
    });
  } catch (error) {
    console.error(
      "LEGACY NEON DELETE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Testni o‘chirib bo‘lmadi.",
      },
      { status: 500 }
    );
  }
}
