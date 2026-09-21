import {
  NextRequest,
  NextResponse,
} from "next/server";

import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Period =
  | "week"
  | "month"
  | "all";

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

async function getRank(
  userId: string,
  period: Period
) {
  const rows =
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
        FROM ranking_question_results
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
          user_id,
          source,
          test_id,
          question_id,
          answer_status,
          answered_at
        FROM filtered
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
            AS incorrect_count

        FROM first_answers

        GROUP BY
          user_id
      ),

      scored AS (
        SELECT
          user_id,
          worked_questions,
          correct_count,
          incorrect_count,

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
            ELSE 0
          END
            AS accuracy
        FROM aggregated
      ),

      ranked AS (
        SELECT
          user_id,
          worked_questions,
          correct_count,
          incorrect_count,
          accuracy,

          ROW_NUMBER() OVER (
            ORDER BY
              correct_count DESC,
              accuracy DESC,
              worked_questions DESC,
              incorrect_count ASC,
              user_id ASC
          )::int
            AS rank

        FROM scored
      )

      SELECT
        rank,
        worked_questions,
        correct_count,
        incorrect_count,
        accuracy
      FROM ranked
      WHERE user_id =
        ${userId}
      LIMIT 1
    `;

  if (
    rows.length === 0
  ) {
    return {
      rank: null,
      workedQuestions: 0,
      correct: 0,
      incorrect: 0,
      accuracy: 0,
    };
  }

  const row: any =
    rows[0];

  return {
    rank:
      toNumber(
        row.rank
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
  };
}

export async function GET(
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

    const userId =
      String(
        request.cookies.get(
          "qurbonov_user_id"
        )?.value || ""
      ).trim();

    if (
      !session ||
      !userId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Avval tizimga kiring.",
        },
        {
          status: 401,
        }
      );
    }

    if (
      role === "admin"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bu sahifa foydalanuvchi profili uchun.",
        },
        {
          status: 403,
        }
      );
    }

    const profileRows =
      await sql`
        SELECT
          p.id,
          p.profile_code,
          p.full_name,
          p.avatar_url,
          p.status,
          p.created_at,
          p.updated_at,
          p.last_login_at,

          COUNT(ac.id)::int
            AS code_count,

          COUNT(ac.id) FILTER (
            WHERE
              ac.active = TRUE
              AND ac.approved = TRUE
          )::int
            AS active_code_count

        FROM user_profiles p

        LEFT JOIN access_codes ac
          ON ac.profile_id = p.id

        WHERE p.id =
          ${userId}

        GROUP BY
          p.id,
          p.profile_code,
          p.full_name,
          p.avatar_url,
          p.status,
          p.created_at,
          p.updated_at,
          p.last_login_at

        LIMIT 1
      `;

    if (
      profileRows.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Foydalanuvchi profili topilmadi.",
        },
        {
          status: 404,
        }
      );
    }

    const profile: any =
      profileRows[0];

    const [
      week,
      month,
      all,
      sourceRows,
      recentRows,
    ] =
      await Promise.all([
        getRank(
          userId,
          "week"
        ),

        getRank(
          userId,
          "month"
        ),

        getRank(
          userId,
          "all"
        ),

        sql`
          WITH first_answers AS (
            SELECT DISTINCT ON (
              user_id,
              source,
              test_id,
              question_id
            )
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
              user_id =
                ${userId}
              AND
              answer_status IN (
                'correct',
                'incorrect'
              )
            ORDER BY
              user_id,
              source,
              test_id,
              question_id,
              answered_at ASC,
              id ASC
          )

          SELECT
            source,
            COUNT(*)::int
              AS worked,

            COUNT(*) FILTER (
              WHERE
                answer_status =
                  'correct'
            )::int
              AS correct,

            COUNT(*) FILTER (
              WHERE
                answer_status =
                  'incorrect'
            )::int
              AS incorrect

          FROM first_answers

          GROUP BY
            source

          ORDER BY
            worked DESC,
            source ASC
        `,

        sql`
          SELECT
            id,
            source,
            test_type,
            test_id,
            test_title,
            subject,
            total_questions,
            correct_count,
            incorrect_count,
            unanswered_count,
            percentage,
            earned_points,
            total_points,
            spent_seconds,
            finished_at
          FROM
            ranking_attempts
          WHERE
            user_id =
              ${userId}
          ORDER BY
            finished_at DESC,
            id DESC
          LIMIT 12
        `,
      ]);

    return NextResponse.json({
      success: true,

      profile: {
        id:
          String(
            profile.id
          ),

        profileCode:
          String(
            profile.profile_code
          ),

        fullName:
          String(
            profile.full_name
          ),

        avatarUrl:
          profile.avatar_url
            ? String(
                profile.avatar_url
              )
            : null,

        status:
          String(
            profile.status
          ),

        createdAt:
          profile.created_at
            ? new Date(
                profile.created_at
              ).toISOString()
            : null,

        lastLoginAt:
          profile.last_login_at
            ? new Date(
                profile.last_login_at
              ).toISOString()
            : null,

        codeCount:
          toNumber(
            profile.code_count
          ),

        activeCodeCount:
          toNumber(
            profile.active_code_count
          ),
      },

      ranking: {
        week,
        month,
        all,
      },

      sources:
        sourceRows.map(
          (row: any) => ({
            source:
              String(
                row.source ||
                  ""
              ),

            worked:
              toNumber(
                row.worked
              ),

            correct:
              toNumber(
                row.correct
              ),

            incorrect:
              toNumber(
                row.incorrect
              ),
          })
        ),

      recentAttempts:
        recentRows.map(
          (row: any) => ({
            id:
              String(
                row.id
              ),

            source:
              String(
                row.source ||
                  ""
              ),

            testType:
              row.test_type
                ? String(
                    row.test_type
                  )
                : null,

            testId:
              String(
                row.test_id ||
                  ""
              ),

            testTitle:
              String(
                row.test_title ||
                  ""
              ),

            subject:
              row.subject
                ? String(
                    row.subject
                  )
                : null,

            totalQuestions:
              toNumber(
                row.total_questions
              ),

            correct:
              toNumber(
                row.correct_count
              ),

            incorrect:
              toNumber(
                row.incorrect_count
              ),

            unanswered:
              toNumber(
                row.unanswered_count
              ),

            percentage:
              toNumber(
                row.percentage
              ),

            earnedPoints:
              toNumber(
                row.earned_points
              ),

            totalPoints:
              toNumber(
                row.total_points
              ),

            spentSeconds:
              toNumber(
                row.spent_seconds
              ),

            finishedAt:
              row.finished_at
                ? new Date(
                    row.finished_at
                  ).toISOString()
                : null,
          })
        ),
    });
  } catch (error) {
    console.error(
      "PROFILE ME GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Profilni yuklashda server xatosi.",
      },
      {
        status: 500,
      }
    );
  }
}

