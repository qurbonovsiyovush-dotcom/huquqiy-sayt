import {
  NextRequest,
  NextResponse,
} from "next/server";

import crypto from "crypto";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =====================================================
   ADMIN
===================================================== */

const ADMIN_CODE =
  "QURBONOV-ADMIN-2026";

const ADMIN_NAME =
  "Qurbonov Siyovush Jamaliddinzoda";

/* =====================================================
   COOKIE
===================================================== */

const COOKIE_MAX_AGE =
  60 * 60 * 12;

function sessionToken() {
  return crypto
    .randomBytes(32)
    .toString("hex");
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure:
      process.env.NODE_ENV ===
      "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  };
}

function clearCookie(
  response: NextResponse,
  name: string
) {
  response.cookies.set(
    name,
    "",
    {
      ...cookieOptions(),
      maxAge: 0,
    }
  );
}

function setSessionCookies(
  response: NextResponse,
  role: "admin" | "user",
  name: string
) {
  response.cookies.set(
    "qurbonov_session",
    sessionToken(),
    cookieOptions()
  );

  response.cookies.set(
    "qurbonov_role",
    role,
    cookieOptions()
  );

  response.cookies.set(
    "qurbonov_name",
    encodeURIComponent(name),
    cookieOptions()
  );

  clearCookie(
    response,
    "qurbonov_pending"
  );
}

function setPendingCookie(
  response: NextResponse,
  userId: string
) {
  response.cookies.set(
    "qurbonov_pending",
    userId,
    cookieOptions()
  );
}

/* =====================================================
   POST
   KIRISH KODINI TEKSHIRISH
===================================================== */

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const enteredCode =
      String(body?.code ?? "")
        .trim()
        .toUpperCase();

    if (!enteredCode) {
      return NextResponse.json(
        {
          success: false,
          status: "error",
          error:
            "Maxsus kirish kodini kiriting.",
        },
        {
          status: 400,
        }
      );
    }

    /* =================================================
       ADMIN KODI
    ================================================= */

    if (
      enteredCode === ADMIN_CODE
    ) {
      const response =
        NextResponse.json({
          success: true,
          status: "authenticated",
          role: "admin",
          redirect: "/",
        });

      setSessionCookies(
        response,
        "admin",
        ADMIN_NAME
      );

      return response;
    }

    /* =================================================
       ODDIY FOYDALANUVCHI
       NEON BAZADAN QIDIRAMIZ
    ================================================= */

    const users =
      await sql`
        SELECT
          id,
          code,
          name,
          active,
          approved,
          requested_at,
          created_at,
          approved_at,
          rejected_at
        FROM access_codes
        WHERE UPPER(code) = ${enteredCode}
        LIMIT 1
      `;

    if (users.length === 0) {
      return NextResponse.json(
        {
          success: false,
          status: "not-found",
          error:
            "Kirish kodi noto‘g‘ri.",
        },
        {
          status: 401,
        }
      );
    }

    const user: any =
      users[0];

    const userId =
      String(user.id);

    const userName =
      String(
        user.name ||
          "Foydalanuvchi"
      );

    /* =================================================
       BLOKLANGAN / RAD ETILGAN
    ================================================= */

    if (user.active !== true) {
      const response =
        NextResponse.json(
          {
            success: false,
            status: "rejected",
            error:
              "Kirish so‘rovingiz rad etilgan.",
          },
          {
            status: 403,
          }
        );

      clearCookie(
        response,
        "qurbonov_pending"
      );

      return response;
    }

    /* =================================================
       ADMIN HALI TASDIQLAMAGAN
    ================================================= */

    if (user.approved !== true) {
      /*
        Birinchi marta kod ishlatilganda
        requested_at vaqtini yozamiz.
      */

      if (!user.requested_at) {
        await sql`
          UPDATE access_codes
          SET
            requested_at = NOW()
          WHERE id = ${userId}
        `;
      }

      const response =
        NextResponse.json({
          success: false,
          status: "pending",
          message:
            "Kirish so‘rovingiz yuborildi. Administrator ruxsatini kuting.",
        });

      /*
        Foydalanuvchidan kodni qayta
        so‘ramaslik uchun vaqtincha ID cookie.
      */

      setPendingCookie(
        response,
        userId
      );

      return response;
    }

    /* =================================================
       OLDINDAN TASDIQLANGAN FOYDALANUVCHI
    ================================================= */

    const response =
      NextResponse.json({
        success: true,
        status: "authenticated",
        role: "user",
        redirect: "/",
      });

    setSessionCookies(
      response,
      "user",
      userName
    );

    return response;
  } catch (error) {
    console.error(
      "LOGIN ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        status: "error",
        error:
          "Serverda xatolik yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =====================================================
   GET
   KIRISH HOLATINI TEKSHIRISH
===================================================== */

export async function GET(
  request: NextRequest
) {
  try {
    /* =================================================
       ALLAQACHON LOGIN QILINGAN
    ================================================= */

    const session =
      request.cookies.get(
        "qurbonov_session"
      )?.value;

    const role =
      request.cookies.get(
        "qurbonov_role"
      )?.value;

    if (session) {
      return NextResponse.json({
        success: true,
        status: "authenticated",
        role:
          role === "admin"
            ? "admin"
            : "user",
      });
    }

    /* =================================================
       TASDIQ KUTAYOTGAN FOYDALANUVCHI
    ================================================= */

    const pendingUserId =
      request.cookies.get(
        "qurbonov_pending"
      )?.value;

    if (!pendingUserId) {
      return NextResponse.json({
        success: false,
        status: "none",
      });
    }

    /* =================================================
       NEON BAZADAN FOYDALANUVCHINI OLAMIZ
    ================================================= */

    const users =
      await sql`
        SELECT
          id,
          code,
          name,
          active,
          approved,
          requested_at,
          created_at,
          approved_at,
          rejected_at
        FROM access_codes
        WHERE id = ${pendingUserId}
        LIMIT 1
      `;

    if (users.length === 0) {
      const response =
        NextResponse.json({
          success: false,
          status: "not-found",
        });

      clearCookie(
        response,
        "qurbonov_pending"
      );

      return response;
    }

    const user: any =
      users[0];

    const userName =
      String(
        user.name ||
          "Foydalanuvchi"
      );

    /* =================================================
       RAD ETILGAN
    ================================================= */

    if (user.active !== true) {
      const response =
        NextResponse.json({
          success: false,
          status: "rejected",
          error:
            "Kirish so‘rovingiz rad etilgan.",
        });

      clearCookie(
        response,
        "qurbonov_pending"
      );

      return response;
    }

    /* =================================================
       HALI KUTILMOQDA
    ================================================= */

    if (user.approved !== true) {
      return NextResponse.json({
        success: false,
        status: "pending",
        message:
          "Administrator ruxsati kutilmoqda...",
      });
    }

    /* =================================================
       ADMIN TASDIQLADI

       Endi kodni yana kiritmasdan
       foydalanuvchiga session beramiz.
    ================================================= */

    const response =
      NextResponse.json({
        success: true,
        status: "approved",
        role: "user",
        redirect: "/",
      });

    setSessionCookies(
      response,
      "user",
      userName
    );

    return response;
  } catch (error) {
    console.error(
      "LOGIN STATUS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        status: "error",
        error:
          "Serverda xatolik yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}
