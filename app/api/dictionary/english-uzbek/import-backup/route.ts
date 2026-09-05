import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ImportWord = {
  id?: string;
  english?: string;
  uzbek?: string;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function requireAdmin() {
  const store = await cookies();
  return Boolean(store.get("qurbonov_session")?.value) &&
    store.get("qurbonov_role")?.value === "admin";
}

export async function POST(req: NextRequest) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json(
        { ok: false, success: false, message: "Ruxsat yo‘q." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    const rawWords: ImportWord[] = Array.isArray(body?.words) ? body.words : [];

    if (!rawWords.length) {
      return NextResponse.json(
        { ok: false, success: false, message: "Import uchun so‘zlar topilmadi." },
        { status: 400 }
      );
    }

    if (rawWords.length > 5000) {
      return NextResponse.json(
        { ok: false, success: false, message: "Bir importda 5000 tadan ortiq so‘z yuborib bo‘lmaydi." },
        { status: 400 }
      );
    }

    const normalized = rawWords
      .map((item, index) => ({
        id: clean(item.id) || `dict_import_${Date.now()}_${index + 1}`,
        english: clean(item.english),
        uzbek: clean(item.uzbek),
      }))
      .filter((item) => item.english);

    if (!normalized.length) {
      return NextResponse.json(
        { ok: false, success: false, message: "Yaroqli inglizcha so‘z topilmadi." },
        { status: 400 }
      );
    }

    const payload = JSON.stringify(normalized);

    const result = await sql`
      WITH incoming AS (
        SELECT
          x.id::text AS id,
          x.english::text AS english,
          x.uzbek::text AS uzbek
        FROM jsonb_to_recordset(${payload}::jsonb)
          AS x(id text, english text, uzbek text)
      ),
      upserted AS (
        INSERT INTO english_uzbek_dictionary (
          id,
          english,
          uzbek,
          created_at,
          updated_at
        )
        SELECT
          id,
          english,
          uzbek,
          NOW(),
          NOW()
        FROM incoming
        ON CONFLICT (id)
        DO UPDATE SET
          english = EXCLUDED.english,
          uzbek = EXCLUDED.uzbek,
          updated_at = NOW()
        RETURNING id
      )
      SELECT COUNT(*)::int AS count
      FROM upserted
    `;

    const totalResult = await sql`
      SELECT COUNT(*)::int AS total
      FROM english_uzbek_dictionary
    `;

    return NextResponse.json(
      {
        ok: true,
        success: true,
        imported: Number(result[0]?.count ?? 0),
        total: Number(totalResult[0]?.total ?? 0),
        message: `${Number(result[0]?.count ?? 0)} ta so‘z Neon bazasiga import qilindi.`,
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("English-Uzbek backup import error:", error);
    return NextResponse.json(
      {
        ok: false,
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Import vaqtida noma’lum xatolik yuz berdi.",
      },
      { status: 500 }
    );
  }
}

