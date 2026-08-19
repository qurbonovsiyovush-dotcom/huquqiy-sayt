import {
  NextRequest,
  NextResponse,
} from "next/server";

/* =========================================================
   TEST BO'LIMIGA KIRISHNI AJRATISH

   ADMIN:
   /test-entry -> /admin/tests

   ODDIY FOYDALANUVCHI:
   /test-entry -> /test
========================================================= */

export async function GET(
  request: NextRequest
) {
  const session =
    request.cookies.get(
      "qurbonov_session"
    )?.value;

  const role =
    request.cookies.get(
      "qurbonov_role"
    )?.value;

  /* =======================================================
     LOGIN QILMAGAN FOYDALANUVCHI
  ======================================================= */

  if (!session) {
    return NextResponse.redirect(
      new URL(
        "/login",
        request.url
      )
    );
  }

  /* =======================================================
     ADMIN
  ======================================================= */

  if (role === "admin") {
    return NextResponse.redirect(
      new URL(
        "/admin/tests",
        request.url
      )
    );
  }

  /* =======================================================
     ODDIY FOYDALANUVCHI
  ======================================================= */

  return NextResponse.redirect(
    new URL(
      "/test",
      request.url
    )
  );
}