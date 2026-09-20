import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const response =
    NextResponse.json({
      success: true,
      message:
        "Tizimdan muvaffaqiyatli chiqildi.",
    });

  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure:
      process.env.NODE_ENV ===
      "production",
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  };

  /* =====================================================
     SESSION
  ===================================================== */

  response.cookies.set(
    "qurbonov_session",
    "",
    cookieOptions
  );

  /* =====================================================
     ROLE
  ===================================================== */

  response.cookies.set(
    "qurbonov_role",
    "",
    cookieOptions
  );

  /* =====================================================
     FOYDALANUVCHI ISMI
  ===================================================== */

  response.cookies.set(
    "qurbonov_name",
    "",
    cookieOptions
  );

  /* =====================================================
     DOIMIY USER ID

     Reyting tizimi uchun qo‘shildi.
  ===================================================== */

  response.cookies.set(
    "qurbonov_user_id",
    "",
    cookieOptions
  );

  /* =====================================================
     TASDIQ KUTAYOTGAN USER
  ===================================================== */

  response.cookies.set(
    "qurbonov_pending",
    "",
    cookieOptions
  );

  return response;
}
