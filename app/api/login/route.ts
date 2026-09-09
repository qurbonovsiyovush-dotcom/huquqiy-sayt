import {
  NextRequest,
  NextResponse,
} from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs";

type AccessCode = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  approved: boolean;
  requestedAt: string | null;
  createdAt: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
};

const DATA_FILE = path.join(
  process.cwd(),
  "data-storage",
  "access-codes.json"
);

const ADMIN_CODE =
  "QURBONOV-ADMIN-2026";

const COOKIE_MAX_AGE =
  60 * 60 * 12;

async function readCodes(): Promise<
  AccessCode[]
> {
  try {
    const text = await fs.readFile(
      DATA_FILE,
      "utf8"
    );

    const data = JSON.parse(text);

    return Array.isArray(data)
      ? data
      : [];
  } catch {
    return [];
  }
}

async function writeCodes(
  codes: AccessCode[]
) {
  await fs.writeFile(
    DATA_FILE,
    JSON.stringify(
      codes,
      null,
      2
    ),
    "utf8"
  );
}

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
   KODNI BIR MARTA KIRITISH
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
          error:
            "Maxsus kirish kodini kiriting.",
        },
        {
          status: 400,
        }
      );
    }

    /* ===============================
       ADMIN
    =============================== */

    if (
      enteredCode === ADMIN_CODE
    ) {
      const response =
        NextResponse.json({
          success: true,
          status:
            "authenticated",
          role: "admin",
          redirect: "/",
        });

      setSessionCookies(
        response,
        "admin",
        "Qurbonov Siyovush Jamaliddinzoda"
      );

      return response;
    }

    /* ===============================
       ODDIY FOYDALANUVCHI
    =============================== */

    const codes =
      await readCodes();

    const index =
      codes.findIndex(
        (item) =>
          item.code
            .trim()
            .toUpperCase() ===
          enteredCode
      );

    if (index === -1) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Kirish kodi noto‘g‘ri.",
        },
        {
          status: 401,
        }
      );
    }

    const user =
      codes[index];

    /* ===============================
       RAD ETILGAN
    =============================== */

    if (!user.active) {
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

    /* ===============================
       ADMIN HALI TASDIQLAMAGAN
    =============================== */

    if (!user.approved) {
      if (!user.requestedAt) {
        codes[index] = {
          ...user,
          requestedAt:
            new Date().toISOString(),
        };

        await writeCodes(codes);
      }

      const response =
        NextResponse.json({
          success: false,
          status: "pending",
          message:
            "Kirish so‘rovingiz yuborildi. Administrator ruxsatini kuting.",
        });

      /*
        Foydalanuvchi kodni ikkinchi
        marta kiritmasligi uchun uning
        ID sini vaqtincha cookie da
        eslab qolamiz.
      */
      setPendingCookie(
        response,
        user.id
      );

      return response;
    }

    /* ===============================
       OLDINDAN TASDIQLANGAN
    =============================== */

    const response =
      NextResponse.json({
        success: true,
        status:
          "authenticated",
        role: "user",
        redirect: "/",
      });

    setSessionCookies(
      response,
      "user",
      user.name
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
   ADMIN TASDIQLAGANINI AVTOMATIK TEKSHIRISH
===================================================== */

export async function GET(
  request: NextRequest
) {
  try {
    /*
      Agar session allaqachon mavjud
      bo‘lsa, sahifa refresh yoki yangi
      tabda ham qayta parol so‘ramaydi.
    */
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
        status:
          "authenticated",
        role:
          role === "admin"
            ? "admin"
            : "user",
      });
    }

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

    const codes =
      await readCodes();

    const user =
      codes.find(
        (item) =>
          item.id ===
          pendingUserId
      );

    if (!user) {
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

    if (!user.active) {
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

    if (!user.approved) {
      return NextResponse.json({
        success: false,
        status: "pending",
        message:
          "Administrator ruxsati kutilmoqda...",
      });
    }

    /*
      Admin tasdiqladi.
      Foydalanuvchidan kodni yana
      so‘ramasdan session yaratamiz.
    */
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
      user.name
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
