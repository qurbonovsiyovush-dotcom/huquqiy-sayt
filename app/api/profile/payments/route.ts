import {
  NextRequest,
  NextResponse,
} from "next/server";

import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toDateOnly(
  value: unknown
) {
  if (!value) return null;

  if (value instanceof Date) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, "0");
    const d = String(value.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const raw = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(0, 10);
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;

  const y = parsed.getUTCFullYear();
  const m = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const d = String(parsed.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toNumber(
  value: unknown
) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function daysFromToday(
  dateValue: unknown
) {
  if (!dateValue) return null;

  const target =
    new Date(
      `${String(
        dateValue
      ).slice(0, 10)}T00:00:00Z`
    );

  const todayText =
    new Date()
      .toISOString()
      .slice(0, 10);

  const today =
    new Date(
      `${todayText}T00:00:00Z`
    );

  return Math.ceil(
    (target.getTime() -
      today.getTime()) /
      86400000
  );
}

export async function GET(
  request: NextRequest
) {
  try {
    const session =
      request.cookies.get(
        "qurbonov_session"
      )?.value;

    const profileId =
      String(
        request.cookies.get(
          "qurbonov_user_id"
        )?.value || ""
      ).trim();

    if (
      !session ||
      !profileId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Avval tizimga kiring.",
        },
        { status: 401 }
      );
    }

    const summaryRows =
      await sql`
        SELECT
          COALESCE(
            SUM(
              CASE
                WHEN entry_type = 'debt'
                  THEN amount
                WHEN entry_type = 'payment'
                  THEN -amount
                WHEN entry_type = 'adjustment'
                  THEN amount
                ELSE 0
              END
            ) FILTER (
              WHERE is_voided = FALSE
            ),
            0
          ) AS balance,

          COALESCE(
            SUM(amount) FILTER (
              WHERE
                is_voided = FALSE
                AND entry_type = 'payment'
            ),
            0
          ) AS total_paid,

          COALESCE(
            SUM(amount) FILTER (
              WHERE
                is_voided = FALSE
                AND entry_type = 'debt'
            ),
            0
          ) AS total_debt_added

        FROM profile_finance_entries
        WHERE profile_id =
          ${profileId}
      `;

    const periodRows =
      await sql`
        SELECT
          period_start,
          period_end,
          due_date,
          period_months
        FROM profile_finance_entries
        WHERE
          profile_id =
            ${profileId}
          AND is_voided = FALSE
          AND due_date IS NOT NULL
        ORDER BY
          occurred_at DESC,
          created_at DESC
        LIMIT 1
      `;

    const entryRows =
      await sql`
        SELECT
          id,
          entry_type,
          amount,
          note,
          occurred_at,
          period_start,
          period_end,
          due_date,
          period_months,
          is_voided
        FROM profile_finance_entries
        WHERE profile_id =
          ${profileId}
        ORDER BY
          occurred_at DESC,
          created_at DESC
        LIMIT 100
      `;

    const balance =
      toNumber(
        summaryRows[0]
          ?.balance
      );

    const period =
      periodRows[0] || null;

    const daysLeft =
      period
        ? daysFromToday(
            period.due_date
          )
        : null;

    return NextResponse.json({
      success: true,

      summary: {
        currentDebt:
          Math.max(
            0,
            balance
          ),

        advance:
          Math.max(
            0,
            -balance
          ),

        totalPaid:
          toNumber(
            summaryRows[0]
              ?.total_paid
          ),

        totalDebtAdded:
          toNumber(
            summaryRows[0]
              ?.total_debt_added
          ),

        period: period
          ? {
              startDate:
                toDateOnly(
                  period.period_start
                ),

              endDate:
                toDateOnly(
                  period.period_end
                ),

              dueDate:
                toDateOnly(
                  period.due_date
                ),

              months:
                period.period_months
                  ? Number(
                      period.period_months
                    )
                  : null,

              daysLeft,

              isOverdue:
                balance > 0 &&
                daysLeft !== null &&
                daysLeft < 0,
            }
          : null,
      },

      entries:
        entryRows.map(
          (row: any) => ({
            id:
              String(row.id),

            entryType:
              String(
                row.entry_type
              ),

            amount:
              toNumber(
                row.amount
              ),

            note:
              row.note
                ? String(
                    row.note
                  )
                : null,

            occurredAt:
              row.occurred_at
                ? new Date(
                    row.occurred_at
                  ).toISOString()
                : null,

            periodStart:
              toDateOnly(
                row.period_start
              ),

            periodEnd:
              toDateOnly(
                row.period_end
              ),

            dueDate:
              toDateOnly(
                row.due_date
              ),

            periodMonths:
              row.period_months
                ? Number(
                    row.period_months
                  )
                : null,

            isVoided:
              row.is_voided === true,
          })
        ),
    });
  } catch (error) {
    console.error(
      "PROFILE FINANCE GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Moliyaviy ma’lumotni yuklab bo‘lmadi.",
      },
      { status: 500 }
    );
  }
}
