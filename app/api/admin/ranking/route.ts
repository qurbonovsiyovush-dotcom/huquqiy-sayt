import {
  NextRequest,
  NextResponse,
} from "next/server";

import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================================================
   TYPES
========================================================= */

type RankingPeriod =
  | "week"
  | "month"
  | "all";

function normalizePeriod(
  value: string | null
): RankingPeriod {
  if (value === "week") {
    return "week";
  }

  if (value === "month") {
    return "month";
  }

  return "all";
}

function toNumber(
  value: unknown
) {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : 0;
}

/* =========================================================
   GET
   /api/admin/ranking?period=week
   /api/admin/ranking?period=month
   /api/admin/ranking?period=all
========================================================= */

export async function GET(
  request: NextRequest
) {
  try {
    /* =====================================================
       ADMIN TEKSHIRUVI
    ===================================================== */

    const session =
      request.cookies.get(
        "qurbonov_session"
      )?.value;

    const role =
      request.cookies.get(
        "qurbonov_role"
      )?.value;

    if (
      !session ||
      role !== "admin"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Faqat administrator uchun.",
        },
        {
          status: 403,
        }
      );
    }

    const url =
      new URL(
        request.url
      );

    const period =
      normalizePeriod(
        url.searchParams.get(
          "period"
        )
      );

    const requestedLimit =
      Math.floor(
        toNumber(
          url.searchParams.get(
            "limit"
          )
        )
      );

    const limit =
      requestedLimit > 0
        ? Math.min(
            requestedLimit,
            500
          )
        : 200;

    /* =====================================================
       DAVR BOSHLANISHI

       Haftalik:
       Dushanba 00:00 dan.

       Oylik:
       Oyning 1-kuni 00:00 dan.

       Vaqt zonasi:
       Asia/Tashkent.
    ===================================================== */

    const periodInfoRows =
      await sql`
        SELECT
          CASE
            WHEN ${period} = 'week'
            THEN (
              date_trunc(
                'week',
                NOW() AT TIME ZONE
                  'Asia/Tashkent'
              )
              AT TIME ZONE
                'Asia/Tashkent'
            )

            WHEN ${period} = 'month'
            THEN (
              date_trunc(
                'month',
                NOW() AT TIME ZONE
                  'Asia/Tashkent'
              )
              AT TIME ZONE
                'Asia/Tashkent'
            )

            ELSE NULL
          END
            AS period_start,

          NOW()
            AS period_end
      `;

    const periodStart =
      periodInfoRows[0]
        ?.period_start
        ? new Date(
            periodInfoRows[0]
              .period_start
          ).toISOString()
        : null;

    const periodEnd =
      periodInfoRows[0]
        ?.period_end
        ? new Date(
            periodInfoRows[0]
              .period_end
          ).toISOString()
        : new Date()
            .toISOString();

    /* =====================================================
       REYTING

       MUHIM QOIDA:

       Bir foydalanuvchi bir davr ichida
       aynan bir xil:
       - source
       - test_id
       - question_id

       savolni qayta-qayta ishlasa,
       reytingda faqat BIRINCHI
       real javobi hisoblanadi.

       unanswered hisobga olinmaydi.

       Masalan:
       1-savolni haftada 5 marta ishlasa
       haftalik reytingga faqat 1 marta kiradi.
    ===================================================== */

    const rows =
      await sql`
        WITH filtered AS (
          SELECT
            id,
            ranking_attempt_id,
            user_id,
            user_name,
            source,
            test_type,
            test_id,
            test_title,
            question_id,
            question_number,
            answer_status,
            points,
            answered_at
          FROM
            ranking_question_results
          WHERE
            answer_status IN (
              'correct',
              'incorrect'
            )
            AND (
              ${period} = 'all'
              OR answered_at >=
                CASE
                  WHEN ${period} = 'week'
                  THEN (
                    date_trunc(
                      'week',
                      NOW() AT TIME ZONE
                        'Asia/Tashkent'
                    )
                    AT TIME ZONE
                      'Asia/Tashkent'
                  )

                  WHEN ${period} = 'month'
                  THEN (
                    date_trunc(
                      'month',
                      NOW() AT TIME ZONE
                        'Asia/Tashkent'
                    )
                    AT TIME ZONE
                      'Asia/Tashkent'
                  )

                  ELSE
                    '-infinity'::timestamptz
                END
            )
        ),

        first_answers AS (
          SELECT DISTINCT ON (
            user_id,
            source,
            test_id,
            question_id
          )
            id,
            ranking_attempt_id,
            user_id,
            user_name,
            source,
            test_type,
            test_id,
            test_title,
            question_id,
            question_number,
            answer_status,
            points,
            answered_at
          FROM
            filtered
          ORDER BY
            user_id,
            source,
            test_id,
            question_id,
            answered_at ASC,
            id ASC
        ),

        aggregated AS (
          SELECT
            user_id,

            (
              ARRAY_AGG(
                user_name
                ORDER BY
                  answered_at DESC
              )
            )[1]
              AS user_name,

            COUNT(*)::int
              AS worked_questions,

            COUNT(*) FILTER (
              WHERE
                answer_status =
                  'correct'
            )::int
              AS correct_count,

            COUNT(*) FILTER (
              WHERE
                answer_status =
                  'incorrect'
            )::int
              AS incorrect_count,

            COUNT(
              DISTINCT
              source || ':' ||
              test_id
            )::int
              AS tests_worked,

            COUNT(
              DISTINCT
              ranking_attempt_id
            )::int
              AS attempts_count,

            COALESCE(
              SUM(points),
              0
            )
              AS earned_points,

            MIN(answered_at)
              AS first_activity_at,

            MAX(answered_at)
              AS last_activity_at
          FROM
            first_answers
          GROUP BY
            user_id
        ),

        scored AS (
          SELECT
            user_id,
            user_name,
            worked_questions,
            correct_count,
            incorrect_count,
            tests_worked,
            attempts_count,
            earned_points,

            CASE
              WHEN
                worked_questions > 0
              THEN
                ROUND(
                  (
                    correct_count::numeric /
                    worked_questions::numeric
                  ) * 100,
                  2
                )
              ELSE
                0
            END
              AS accuracy,

            first_activity_at,
            last_activity_at
          FROM
            aggregated
        )

        SELECT
          ROW_NUMBER() OVER (
            ORDER BY
              correct_count DESC,
              accuracy DESC,
              worked_questions DESC,
              incorrect_count ASC,
              user_name ASC
          )::int
            AS rank,

          user_id,
          user_name,
          worked_questions,
          correct_count,
          incorrect_count,
          accuracy,
          tests_worked,
          attempts_count,
          earned_points,
          first_activity_at,
          last_activity_at

        FROM
          scored

        ORDER BY
          correct_count DESC,
          accuracy DESC,
          worked_questions DESC,
          incorrect_count ASC,
          user_name ASC

        LIMIT ${limit}
      `;

    /* =====================================================
       UMUMIY STATISTIKA
    ===================================================== */

    const summaryRows =
      await sql`
        WITH filtered AS (
          SELECT
            id,
            user_id,
            source,
            test_id,
            question_id,
            answer_status,
            answered_at
          FROM
            ranking_question_results
          WHERE
            answer_status IN (
              'correct',
              'incorrect'
            )
            AND (
              ${period} = 'all'
              OR answered_at >=
                CASE
                  WHEN ${period} = 'week'
                  THEN (
                    date_trunc(
                      'week',
                      NOW() AT TIME ZONE
                        'Asia/Tashkent'
                    )
                    AT TIME ZONE
                      'Asia/Tashkent'
                  )

                  WHEN ${period} = 'month'
                  THEN (
                    date_trunc(
                      'month',
                      NOW() AT TIME ZONE
                        'Asia/Tashkent'
                    )
                    AT TIME ZONE
                      'Asia/Tashkent'
                  )

                  ELSE
                    '-infinity'::timestamptz
                END
            )
        ),

        first_answers AS (
          SELECT DISTINCT ON (
            user_id,
            source,
            test_id,
            question_id
          )
            user_id,
            source,
            test_id,
            question_id,
            answer_status,
            answered_at,
            id
          FROM
            filtered
          ORDER BY
            user_id,
            source,
            test_id,
            question_id,
            answered_at ASC,
            id ASC
        )

        SELECT
          COUNT(
            DISTINCT user_id
          )::int
            AS participants,

          COUNT(*)::int
            AS unique_answers,

          COUNT(*) FILTER (
            WHERE
              answer_status =
                'correct'
          )::int
            AS correct_answers,

          COUNT(*) FILTER (
            WHERE
              answer_status =
                'incorrect'
          )::int
            AS incorrect_answers

        FROM
          first_answers
      `;

    const summary: any =
      summaryRows[0] || {};

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json(
      {
        success: true,

        period,

        timezone:
          "Asia/Tashkent",

        periodStart,
        periodEnd,

        summary: {
          participants:
            toNumber(
              summary.participants
            ),

          uniqueAnswers:
            toNumber(
              summary.unique_answers
            ),

          correctAnswers:
            toNumber(
              summary.correct_answers
            ),

          incorrectAnswers:
            toNumber(
              summary.incorrect_answers
            ),
        },

        ranking:
          rows.map(
            (row: any) => ({
              rank:
                toNumber(
                  row.rank
                ),

              userId:
                String(
                  row.user_id ||
                    ""
                ),

              userName:
                String(
                  row.user_name ||
                    "Foydalanuvchi"
                ),

              workedQuestions:
                toNumber(
                  row.worked_questions
                ),

              correct:
                toNumber(
                  row.correct_count
                ),

              incorrect:
                toNumber(
                  row.incorrect_count
                ),

              accuracy:
                toNumber(
                  row.accuracy
                ),

              testsWorked:
                toNumber(
                  row.tests_worked
                ),

              attempts:
                toNumber(
                  row.attempts_count
                ),

              earnedPoints:
                toNumber(
                  row.earned_points
                ),

              firstActivityAt:
                row.first_activity_at
                  ? new Date(
                      row.first_activity_at
                    ).toISOString()
                  : null,

              lastActivityAt:
                row.last_activity_at
                  ? new Date(
                      row.last_activity_at
                    ).toISOString()
                  : null,
            })
          ),
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error(
      "ADMIN RANKING GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Reytingni yuklashda server xatosi.",
      },
      {
        status: 500,
      }
    );
  }
}


/* =========================================================
   DELETE
   Reytingni tozalash / bitta talabani o‘chirish

   Body:
   { action: "all" }

   yoki:

   {
     action: "user",
     userId: "..."
   }
========================================================= */

export async function DELETE(
  request: NextRequest
) {
  try {
    const session =
      request.cookies.get(
        "qurbonov_session"
      )?.value;

    const role =
      request.cookies.get(
        "qurbonov_role"
      )?.value;

    if (
      !session ||
      role !== "admin"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Faqat administrator uchun.",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      await request
        .json()
        .catch(() => ({}));

    const action =
      String(
        body?.action || ""
      ).trim();

    /* =====================================================
       HAMMA REYTINGNI O‘CHIRISH
    ===================================================== */

    if (action === "all") {
      const before =
        await sql`
          SELECT
            (
              SELECT COUNT(*)
              FROM ranking_attempts
            )::int
              AS attempts_count,

            (
              SELECT COUNT(*)
              FROM ranking_question_results
            )::int
              AS question_results_count
        `;

      await sql`
        TRUNCATE TABLE
          ranking_question_results,
          ranking_attempts
        RESTART IDENTITY
        CASCADE
      `;

      return NextResponse.json({
        success: true,
        action: "all",
        deleted: {
          attempts:
            Number(
              before[0]
                ?.attempts_count || 0
            ),
          questionResults:
            Number(
              before[0]
                ?.question_results_count || 0
            ),
        },
        message:
          "Umumiy reyting to‘liq tozalandi.",
      });
    }

    /* =====================================================
       BITTA TALABANI O‘CHIRISH
    ===================================================== */

    if (action === "user") {
      const userId =
        String(
          body?.userId || ""
        ).trim();

      if (!userId) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Foydalanuvchi ID topilmadi.",
          },
          {
            status: 400,
          }
        );
      }

      const before =
        await sql`
          SELECT
            (
              SELECT COUNT(*)
              FROM ranking_attempts
              WHERE user_id =
                ${userId}
            )::int
              AS attempts_count,

            (
              SELECT COUNT(*)
              FROM ranking_question_results
              WHERE user_id =
                ${userId}
            )::int
              AS question_results_count
        `;

      /*
        ranking_question_results
        ranking_attempts ga FK bilan
        ON DELETE CASCADE ulangan.
      */

      await sql`
        DELETE FROM
          ranking_attempts
        WHERE
          user_id =
            ${userId}
      `;

      return NextResponse.json({
        success: true,
        action: "user",
        userId,
        deleted: {
          attempts:
            Number(
              before[0]
                ?.attempts_count || 0
            ),
          questionResults:
            Number(
              before[0]
                ?.question_results_count || 0
            ),
        },
        message:
          "Talabaning reyting ma’lumotlari o‘chirildi.",
      });
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Noto‘g‘ri o‘chirish amali.",
      },
      {
        status: 400,
      }
    );
  } catch (error) {
    console.error(
      "ADMIN RANKING DELETE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Reytingni o‘chirishda server xatosi.",
      },
      {
        status: 500,
      }
    );
  }
}
