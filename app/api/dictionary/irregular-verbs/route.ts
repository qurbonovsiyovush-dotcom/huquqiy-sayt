import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const clean = (v: unknown) => String(v ?? "").trim();
const noStore = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

function mapRow(row: any) {
  return {
    id: String(row.id),
    v1: String(row.v1 ?? ""),
    v2: String(row.v2 ?? ""),
    v3: String(row.v3 ?? ""),
    uzbek: String(row.uzbek ?? ""),
    order: Number(row.verb_order ?? 0),
    createdAt: row.created_at instanceof Date
      ? row.created_at.toISOString()
      : String(row.created_at ?? ""),
    updatedAt: row.updated_at instanceof Date
      ? row.updated_at.toISOString()
      : String(row.updated_at ?? ""),
  };
}

export async function GET(request: NextRequest) {
  try {
    const q = clean(new URL(request.url).searchParams.get("q"));
    let rows: any[];

    if (q) {
      const pattern = `%${q}%`;
      rows = await sql`
        SELECT id,v1,v2,v3,uzbek,verb_order,created_at,updated_at
        FROM irregular_verbs
        WHERE v1 ILIKE ${pattern}
           OR v2 ILIKE ${pattern}
           OR v3 ILIKE ${pattern}
           OR uzbek ILIKE ${pattern}
        ORDER BY
          CASE WHEN verb_order > 0 THEN 0 ELSE 1 END,
          verb_order ASC,
          LOWER(v1) ASC
      `;
    } else {
      rows = await sql`
        SELECT id,v1,v2,v3,uzbek,verb_order,created_at,updated_at
        FROM irregular_verbs
        ORDER BY
          CASE WHEN verb_order > 0 THEN 0 ELSE 1 END,
          verb_order ASC,
          LOWER(v1) ASC
      `;
    }

    const verbs = rows.map(mapRow);
    return NextResponse.json(
      { success: true, ok: true, count: verbs.length, total: verbs.length, verbs, words: verbs, data: verbs },
      { headers: noStore }
    );
  } catch (error) {
    console.error("IRREGULAR VERBS GET:", error);
    return NextResponse.json(
      { success: false, ok: false, message: "Irregular Verbs ma’lumotlarini yuklab bo‘lmadi." },
      { status: 500, headers: noStore }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (Array.isArray(body?.verbs)) {
      const verbs = body.verbs.map((x: any, i: number) => ({
        v1: clean(x?.v1 ?? x?.base ?? x?.baseForm),
        v2: clean(x?.v2 ?? x?.past ?? x?.pastSimple),
        v3: clean(x?.v3 ?? x?.participle ?? x?.pastParticiple),
        uzbek: clean(x?.uzbek ?? x?.translation ?? x?.meaning ?? x?.uz),
        order: Math.max(1, Number(x?.order ?? x?.verbOrder ?? i + 1) || i + 1),
      })).filter((x: any) => x.v1 && x.v2 && x.v3 && x.uzbek);

      if (!verbs.length) {
        return NextResponse.json(
          { success: false, ok: false, message: "Saqlash uchun to‘g‘ri fe’llar topilmadi." },
          { status: 400, headers: noStore }
        );
      }

      await sql`DELETE FROM irregular_verbs`;

      for (const x of verbs) {
        await sql`
          INSERT INTO irregular_verbs (v1,v2,v3,uzbek,verb_order)
          VALUES (${x.v1},${x.v2},${x.v3},${x.uzbek},${x.order})
          ON CONFLICT (v1) DO UPDATE SET
            v2=EXCLUDED.v2,
            v3=EXCLUDED.v3,
            uzbek=EXCLUDED.uzbek,
            verb_order=EXCLUDED.verb_order,
            updated_at=NOW()
        `;
      }

      const rows = await sql`
        SELECT id,v1,v2,v3,uzbek,verb_order,created_at,updated_at
        FROM irregular_verbs
        ORDER BY verb_order ASC, LOWER(v1) ASC
      `;
      const saved = rows.map(mapRow);

      return NextResponse.json(
        { success: true, ok: true, message: `${saved.length} ta Irregular Verb saqlandi.`, count: saved.length, total: saved.length, verbs: saved, words: saved, data: saved },
        { headers: noStore }
      );
    }

    const v1 = clean(body?.v1 ?? body?.base ?? body?.baseForm);
    const v2 = clean(body?.v2 ?? body?.past ?? body?.pastSimple);
    const v3 = clean(body?.v3 ?? body?.participle ?? body?.pastParticiple);
    const uzbek = clean(body?.uzbek ?? body?.translation ?? body?.meaning ?? body?.uz);

    if (!v1 || !v2 || !v3 || !uzbek) {
      return NextResponse.json(
        { success: false, ok: false, message: "V1, V2, V3 va o‘zbekcha tarjimani to‘liq kiriting." },
        { status: 400, headers: noStore }
      );
    }

    let order = Number(body?.order ?? body?.verbOrder ?? 0);
    if (!Number.isFinite(order) || order <= 0) {
      const maxRows = await sql`SELECT COALESCE(MAX(verb_order),0) AS max_order FROM irregular_verbs`;
      order = Number(maxRows[0]?.max_order ?? 0) + 1;
    }

    const rows = await sql`
      INSERT INTO irregular_verbs (v1,v2,v3,uzbek,verb_order)
      VALUES (${v1},${v2},${v3},${uzbek},${order})
      ON CONFLICT (v1) DO UPDATE SET
        v2=EXCLUDED.v2,
        v3=EXCLUDED.v3,
        uzbek=EXCLUDED.uzbek,
        verb_order=EXCLUDED.verb_order,
        updated_at=NOW()
      RETURNING id,v1,v2,v3,uzbek,verb_order,created_at,updated_at
    `;
    const verb = mapRow(rows[0]);

    return NextResponse.json(
      { success: true, ok: true, message: "Irregular Verb saqlandi.", verb, word: verb, data: verb },
      { status: 201, headers: noStore }
    );
  } catch (error) {
    console.error("IRREGULAR VERBS POST:", error);
    return NextResponse.json(
      { success: false, ok: false, message: "Irregular Verb saqlashda xatolik yuz berdi." },
      { status: 500, headers: noStore }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const id = clean(body?.id);
    const v1 = clean(body?.v1 ?? body?.base ?? body?.baseForm);
    const v2 = clean(body?.v2 ?? body?.past ?? body?.pastSimple);
    const v3 = clean(body?.v3 ?? body?.participle ?? body?.pastParticiple);
    const uzbek = clean(body?.uzbek ?? body?.translation ?? body?.meaning ?? body?.uz);

    if (!id || !v1 || !v2 || !v3 || !uzbek) {
      return NextResponse.json(
        { success: false, ok: false, message: "ID, V1, V2, V3 va tarjimani to‘liq kiriting." },
        { status: 400, headers: noStore }
      );
    }

    const order = Number(body?.order ?? body?.verbOrder ?? 0);
    const rows = Number.isFinite(order) && order > 0
      ? await sql`
          UPDATE irregular_verbs SET
            v1=${v1},v2=${v2},v3=${v3},uzbek=${uzbek},verb_order=${order},updated_at=NOW()
          WHERE id=${id}
          RETURNING id,v1,v2,v3,uzbek,verb_order,created_at,updated_at
        `
      : await sql`
          UPDATE irregular_verbs SET
            v1=${v1},v2=${v2},v3=${v3},uzbek=${uzbek},updated_at=NOW()
          WHERE id=${id}
          RETURNING id,v1,v2,v3,uzbek,verb_order,created_at,updated_at
        `;

    if (!rows.length) {
      return NextResponse.json(
        { success: false, ok: false, message: "Fe’l topilmadi." },
        { status: 404, headers: noStore }
      );
    }

    const verb = mapRow(rows[0]);
    return NextResponse.json(
      { success: true, ok: true, message: "Irregular Verb yangilandi.", verb, word: verb, data: verb },
      { headers: noStore }
    );
  } catch (error: any) {
    console.error("IRREGULAR VERBS PUT:", error);
    return NextResponse.json(
      { success: false, ok: false, message: error?.code === "23505" ? "Bu V1 shakli allaqachon mavjud." : "Irregular Verb yangilashda xatolik yuz berdi." },
      { status: error?.code === "23505" ? 409 : 500, headers: noStore }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);

    if (url.searchParams.get("all") === "true") {
      await sql`DELETE FROM irregular_verbs`;
      return NextResponse.json(
        { success: true, ok: true, message: "Barcha Irregular Verbs o‘chirildi." },
        { headers: noStore }
      );
    }

    let id = clean(url.searchParams.get("id"));
    if (!id) {
      try {
        const body = await request.json();
        id = clean(body?.id);
      } catch {}
    }

    if (!id) {
      return NextResponse.json(
        { success: false, ok: false, message: "O‘chirish uchun fe’l ID topilmadi." },
        { status: 400, headers: noStore }
      );
    }

    const rows = await sql`DELETE FROM irregular_verbs WHERE id=${id} RETURNING id`;

    if (!rows.length) {
      return NextResponse.json(
        { success: false, ok: false, message: "Fe’l topilmadi." },
        { status: 404, headers: noStore }
      );
    }

    return NextResponse.json(
      { success: true, ok: true, message: "Irregular Verb o‘chirildi.", id },
      { headers: noStore }
    );
  } catch (error) {
    console.error("IRREGULAR VERBS DELETE:", error);
    return NextResponse.json(
      { success: false, ok: false, message: "Irregular Verb o‘chirishda xatolik yuz berdi." },
      { status: 500, headers: noStore }
    );
  }
}
