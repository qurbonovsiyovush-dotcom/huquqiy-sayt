import {
  NextRequest,
  NextResponse,
} from "next/server";

import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toNumber(
  value: unknown
) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
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

    const entryRows =
      await sql`
        SELECT
          id,
          entry_type,
          amount,
          note,
          occurred_at,
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

