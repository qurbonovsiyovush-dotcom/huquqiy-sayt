import { NextResponse } from "next/server";
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

async function readCodes(): Promise<AccessCode[]> {
  try {
    const text =
      await fs.readFile(
        DATA_FILE,
        "utf8"
      );

    const data =
      JSON.parse(text);

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
    JSON.stringify(codes, null, 2),
    "utf8"
  );
}

function sessionToken() {
  return crypto
    .randomBytes(32)
    .toString("hex");
}

function setSessionCookies(
  response: NextResponse,
  role: "admin" | "user",
  name: string
) {
  response.cookies.set(
    "qurbonov_session",
    sessionToken(),
    {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.NODE_ENV ===
        "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    }
  );

  response.cookies.set(
    "qurbonov_role",
    role,
    {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.NODE_ENV ===
        "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    }
  );

  response.cookies.set(
    "qurbonov_name",
    encodeURIComponent(name),
    {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.NODE_ENV ===
        "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    }
  );
}

export async function POST(
  request: Request
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

    // ========================================
    // ADMIN
    // ========================================

    if (
      enteredCode === ADMIN_CODE
    ) {
      const response =
        NextResponse.json({
          success: true,
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

    // ========================================
    // ODDIY FOYDALANUVCHI
    // ========================================

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

    // RAD ETILGAN
    if (!user.active) {
      return NextResponse.json(
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
    }

    // ========================================
    // ADMIN HALI RUXSAT BERMAGAN
    // ========================================

    if (!user.approved) {
      if (!user.requestedAt) {
        codes[index] = {
          ...user,

          requestedAt:
            new Date().toISOString(),
        };

        await writeCodes(codes);
      }

      // MUHIM:
      // BU YERDA COOKIE YARATILMAYDI!

      return NextResponse.json(
        {
          success: false,
          status: "pending",
          error:
            "Kirish so‘rovingiz yuborildi. Administrator ruxsatini kuting.",
        },
        {
          status: 403,
        }
      );
    }

    // ========================================
    // ADMIN RUXSAT BERGAN
    // ========================================

    const response =
      NextResponse.json({
        success: true,
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