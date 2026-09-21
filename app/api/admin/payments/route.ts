import {
  NextRequest,
  NextResponse,
} from "next/server";

import crypto from "crypto";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function cleanText(value: unknown) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function isoDateOnly(value: unknown) {
  const text = String(value ?? "").trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  return new Date()
    .toISOString()
    .slice(0, 10);
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

async function isAdmin(
  request: NextRequest
) {
  return Boolean(
    request.cookies.get(
      "qurbonov_session"
    )?.value
  ) &&
    request.cookies.get(
      "qurbonov_role"
    )?.value === "admin";
}

async function getProfileBalance(
  profileId: string
) {
  const rows =
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
        ) AS balance
      FROM profile_finance_entries
      WHERE profile_id = ${profileId}
    `;

  return toNumber(
    rows[0]?.balance
  );
}

export async function GET(
  request: NextRequest
) {
  try {
    if (
      !(await isAdmin(request))
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Faqat administrator uchun.",
        },
        { status: 403 }
      );
    }

    const profileRows =
      await sql`
        SELECT
          p.id,
          p.profile_code,
          p.full_name,
          p.status,

          COALESCE(
            SUM(
              CASE
                WHEN e.entry_type = 'debt'
                  THEN e.amount
                WHEN e.entry_type = 'payment'
                  THEN -e.amount
                WHEN e.entry_type = 'adjustment'
                  THEN e.amount
                ELSE 0
              END
            ) FILTER (
              WHERE e.is_voided = FALSE
            ),
            0
          ) AS balance,

          COALESCE(
            SUM(e.amount) FILTER (
              WHERE
                e.is_voided = FALSE
                AND e.entry_type = 'payment'
            ),
            0
          ) AS total_paid,

          COALESCE(
            SUM(e.amount) FILTER (
              WHERE
                e.is_voided = FALSE
                AND e.entry_type = 'debt'
            ),
            0
          ) AS total_debt_added,

          MAX(e.occurred_at) FILTER (
            WHERE e.is_voided = FALSE
          ) AS last_finance_at,

          period.period_start,
          period.period_end,
          period.due_date,
          period.period_months

        FROM user_profiles p

        LEFT JOIN profile_finance_entries e
          ON e.profile_id = p.id

        LEFT JOIN LATERAL (
          SELECT
            pe.period_start,
            pe.period_end,
            pe.due_date,
            pe.period_months
          FROM profile_finance_entries pe
          WHERE
            pe.profile_id = p.id
            AND pe.is_voided = FALSE
            AND pe.due_date IS NOT NULL
          ORDER BY
            pe.occurred_at DESC,
            pe.created_at DESC
          LIMIT 1
        ) period
          ON TRUE

        GROUP BY
          p.id,
          p.profile_code,
          p.full_name,
          p.status,
          period.period_start,
          period.period_end,
          period.due_date,
          period.period_months

        ORDER BY
          CASE
            WHEN p.status = 'active' THEN 0
            ELSE 1
          END,
          p.full_name ASC
      `;

    const entryRows =
      await sql`
        SELECT
          e.id,
          e.profile_id,
          e.entry_type,
          e.amount,
          e.note,
          e.occurred_at,
          e.period_start,
          e.period_end,
          e.due_date,
          e.period_months,
          e.is_voided,
          e.voided_at,
          e.created_by,
          e.created_at,

          p.full_name,
          p.profile_code

        FROM profile_finance_entries e

        JOIN user_profiles p
          ON p.id = e.profile_id

        ORDER BY
          e.occurred_at DESC,
          e.created_at DESC
        LIMIT 1000
      `;

    const profiles =
      profileRows.map(
        (row: any) => {
          const balance =
            toNumber(
              row.balance
            );

          const daysLeft =
            daysFromToday(
              row.due_date
            );

          return {
            id:
              String(row.id),

            profileCode:
              String(
                row.profile_code
              ),

            fullName:
              String(
                row.full_name
              ),

            status:
              String(
                row.status
              ),

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
                row.total_paid
              ),

            totalDebtAdded:
              toNumber(
                row.total_debt_added
              ),

            lastFinanceAt:
              row.last_finance_at
                ? new Date(
                    row.last_finance_at
                  ).toISOString()
                : null,

            periodStart:
              row.period_start
                ? String(
                    row.period_start
                  ).slice(0, 10)
                : null,

            periodEnd:
              row.period_end
                ? String(
                    row.period_end
                  ).slice(0, 10)
                : null,

            dueDate:
              row.due_date
                ? String(
                    row.due_date
                  ).slice(0, 10)
                : null,

            periodMonths:
              row.period_months
                ? Number(
                    row.period_months
                  )
                : null,

            daysLeft,

            isOverdue:
              balance > 0 &&
              daysLeft !== null &&
              daysLeft < 0,
          };
        }
      );

    return NextResponse.json({
      success: true,

      summary: {
        totalDebt:
          profiles.reduce(
            (sum, item) =>
              sum +
              item.currentDebt,
            0
          ),

        totalAdvance:
          profiles.reduce(
            (sum, item) =>
              sum +
              item.advance,
            0
          ),

        totalPaid:
          profiles.reduce(
            (sum, item) =>
              sum +
              item.totalPaid,
            0
          ),

        debtors:
          profiles.filter(
            (item) =>
              item.currentDebt > 0
          ).length,

        overdue:
          profiles.filter(
            (item) =>
              item.isOverdue
          ).length,
      },

      profiles,

      entries:
        entryRows.map(
          (row: any) => ({
            id:
              String(row.id),

            profileId:
              String(
                row.profile_id
              ),

            fullName:
              String(
                row.full_name
              ),

            profileCode:
              String(
                row.profile_code
              ),

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
              row.period_start
                ? String(
                    row.period_start
                  ).slice(0, 10)
                : null,

            periodEnd:
              row.period_end
                ? String(
                    row.period_end
                  ).slice(0, 10)
                : null,

            dueDate:
              row.due_date
                ? String(
                    row.due_date
                  ).slice(0, 10)
                : null,

            periodMonths:
              row.period_months
                ? Number(
                    row.period_months
                  )
                : null,

            isVoided:
              row.is_voided === true,

            voidedAt:
              row.voided_at
                ? new Date(
                    row.voided_at
                  ).toISOString()
                : null,
          })
        ),
    });
  } catch (error) {
    console.error(
      "ADMIN FINANCE GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Moliyaviy ma’lumotlarni yuklashda server xatosi.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    if (
      !(await isAdmin(request))
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Faqat administrator uchun.",
        },
        { status: 403 }
      );
    }

    const body =
      await request
        .json()
        .catch(() => ({}));

    const action =
      cleanText(
        body?.action
      ).toLowerCase();

    const adminId =
      String(
        request.cookies.get(
          "qurbonov_user_id"
        )?.value ||
          "admin"
      );

    if (
      action === "set-debt" ||
      action === "add-debt"
    ) {
      const profileId =
        cleanText(
          body?.profileId
        );

      const requestedAmount =
        toNumber(
          body?.amount
        );

      const note =
        cleanText(
          body?.note
        );

      const periodStart =
        isoDateOnly(
          body?.periodStart
        );

      const dueDateRaw =
        String(
          body?.dueDate || ""
        ).trim();

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
          dueDateRaw
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "To‘lov muddatini tanlang.",
          },
          { status: 400 }
        );
      }

      const dueDate =
        dueDateRaw;

      const periodEnd =
        dueDate;

      if (
        !profileId ||
        (
          action === "set-debt"
            ? requestedAmount < 0
            : requestedAmount <= 0
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Profil va qarz summasini to‘g‘ri kiriting.",
          },
          { status: 400 }
        );
      }

      const profileRows =
        await sql`
          SELECT id
          FROM user_profiles
          WHERE id =
            ${profileId}
          LIMIT 1
        `;

      if (
        profileRows.length === 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Profil topilmadi.",
          },
          { status: 404 }
        );
      }

      if (
        action === "add-debt"
      ) {
        await sql`
          INSERT INTO profile_finance_entries (
            id,
            profile_id,
            entry_type,
            amount,
            note,
            occurred_at,
            period_start,
            period_end,
            due_date,
            period_months,
            created_by,
            created_at
          )
          VALUES (
            ${crypto.randomUUID()},
            ${profileId},
            'debt',
            ${requestedAmount},
            ${note || null},
            NOW(),
            ${periodStart}::date,
            ${periodEnd}::date,
            ${dueDate}::date,
            NULL,
            ${adminId},
            NOW()
          )
        `;

        return NextResponse.json({
          success: true,
          message:
            "Qarz va to‘lov muddati qo‘shildi.",
          periodStart,
          periodEnd,
          dueDate,
        });
      }

      const currentBalance =
        await getProfileBalance(
          profileId
        );

      const delta =
        requestedAmount -
        currentBalance;

      const isOnlyPeriodUpdate =
        Math.abs(delta) <
        0.005;

      await sql`
        INSERT INTO profile_finance_entries (
          id,
          profile_id,
          entry_type,
          amount,
          note,
          occurred_at,
          period_start,
          period_end,
          due_date,
          period_months,
          created_by,
          created_at
        )
        VALUES (
          ${crypto.randomUUID()},
          ${profileId},
          ${
            isOnlyPeriodUpdate
              ? "period"
              : "adjustment"
          },
          ${
            isOnlyPeriodUpdate
              ? 0
              : delta
          },
          ${
            note ||
            (
              isOnlyPeriodUpdate
                ? `To‘lov muddati ${dueDate} qilib belgilandi`
                : `Qarz ${requestedAmount} so‘m qilib belgilandi`
            )
          },
          NOW(),
          ${periodStart}::date,
          ${periodEnd}::date,
          ${dueDate}::date,
          NULL,
          ${adminId},
          NOW()
        )
      `;

      return NextResponse.json({
        success: true,
        message:
          "Qarz va to‘lov muddati yangilandi.",
        currentDebt:
          requestedAmount,
        periodStart,
        periodEnd,
        dueDate,
      });
    }

    if (
      action === "add-payment"
    ) {
      const profileId =
        cleanText(
          body?.profileId
        );

      const amount =
        toNumber(
          body?.amount
        );

      const note =
        cleanText(
          body?.note
        );

      if (
        !profileId ||
        amount <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Profil va to‘langan summani kiriting.",
          },
          { status: 400 }
        );
      }

      const profileRows =
        await sql`
          SELECT id
          FROM user_profiles
          WHERE id =
            ${profileId}
          LIMIT 1
        `;

      if (
        profileRows.length === 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Profil topilmadi.",
          },
          { status: 404 }
        );
      }

      await sql`
        INSERT INTO profile_finance_entries (
          id,
          profile_id,
          entry_type,
          amount,
          note,
          occurred_at,
          created_by,
          created_at
        )
        VALUES (
          ${crypto.randomUUID()},
          ${profileId},
          'payment',
          ${amount},
          ${note || null},
          NOW(),
          ${adminId},
          NOW()
        )
      `;

      const balance =
        await getProfileBalance(
          profileId
        );

      return NextResponse.json({
        success: true,
        message:
          "To‘lov yozildi.",
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
      });
    }

    if (
      action === "void-entry"
    ) {
      const entryId =
        cleanText(
          body?.entryId
        );

      if (!entryId) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Yozuv ID topilmadi.",
          },
          { status: 400 }
        );
      }

      const rows =
        await sql`
          UPDATE profile_finance_entries
          SET
            is_voided = TRUE,
            voided_at = NOW(),
            voided_by =
              ${adminId}
          WHERE
            id =
              ${entryId}
            AND
            is_voided = FALSE
          RETURNING id
        `;

      if (
        rows.length === 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Yozuv topilmadi yoki oldin bekor qilingan.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message:
          "Yozuv bekor qilindi. Tarix saqlanib qoldi.",
      });
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Noma’lum amal.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error(
      "ADMIN FINANCE POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Moliyaviy amalni bajarishda server xatosi.",
      },
      { status: 500 }
    );
  }
}
