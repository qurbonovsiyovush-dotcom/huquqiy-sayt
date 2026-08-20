import {
  NextRequest,
  NextResponse,
} from "next/server";

/* =========================================================
   PROXY
   FOYDALANUVCHI VA ADMIN HUQUQLARINI AJRATISH
========================================================= */

export function proxy(
  request: NextRequest
) {
  const { pathname } =
    request.nextUrl;

  const session =
    request.cookies.get(
      "qurbonov_session"
    )?.value;

  const role =
    request.cookies.get(
      "qurbonov_role"
    )?.value;

  const isLoggedIn =
    Boolean(session);

  const isAdmin =
    isLoggedIn &&
    role === "admin";

  /* =======================================================
     NEXT.JS ICHKI FAYLLARI
  ======================================================= */

  if (
    pathname.startsWith(
      "/_next"
    ) ||
    pathname ===
      "/favicon.ico" ||
    pathname ===
  "/sitemap.xml" ||
    pathname.startsWith(
      "/images"
    ) ||
    pathname.startsWith(
      "/icons"
    )
  ) {
    return NextResponse.next();
  }

  /* =======================================================
     LOGIN SAHIFASI
  ======================================================= */

  if (
    pathname === "/login"
  ) {
    /*
      Login qilgan odam yana
      /login ga kirsa asosiy
      sahifaga qaytaramiz.
    */

    if (isLoggedIn) {
      return NextResponse.redirect(
        new URL(
          "/",
          request.url
        )
      );
    }

    return NextResponse.next();
  }

  /* =======================================================
     LOGIN UCHUN OCHIQ API LAR
  ======================================================= */

  if (
    pathname ===
      "/api/login" ||
    pathname ===
      "/api/logout" ||
    pathname.startsWith(
      "/api/auth"
    )
  ) {
    return NextResponse.next();
  }

  /* =======================================================
     LOGIN QILMAGAN FOYDALANUVCHI
  ======================================================= */

  if (!isLoggedIn) {
    /*
      Login qilmagan odam:
      /
      /test
      /test/[id]
      /admin
      va boshqa himoyalangan
      sahifalarga kira olmaydi.
    */

    if (
      !pathname.startsWith(
        "/api/"
      )
    ) {
      const loginUrl =
        new URL(
          "/login",
          request.url
        );

      loginUrl.searchParams.set(
        "next",
        pathname
      );

      return NextResponse.redirect(
        loginUrl
      );
    }

    return NextResponse.json(
      {
        success: false,

        message:
          "Avval tizimga kiring.",
      },
      {
        status: 401,
      }
    );
  }

  /* =======================================================
     ADMIN SAHIFALARI
     FAQAT ADMIN
  ======================================================= */

  if (
    pathname.startsWith(
      "/admin"
    )
  ) {
    if (!isAdmin) {
      return NextResponse.redirect(
        new URL(
          "/",
          request.url
        )
      );
    }

    return NextResponse.next();
  }

  /* =======================================================
     TEST EDITOR
     FAQAT ADMIN
  ======================================================= */

  if (
    pathname ===
      "/test/editor" ||
    pathname.startsWith(
      "/test/editor/"
    )
  ) {
    if (!isAdmin) {
      return NextResponse.redirect(
        new URL(
          "/test",
          request.url
        )
      );
    }

    return NextResponse.next();
  }

  /* =======================================================
     ADMIN API
     FAQAT ADMIN
  ======================================================= */

  if (
    pathname.startsWith(
      "/api/admin"
    )
  ) {
    if (!isAdmin) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Administrator huquqi talab qilinadi.",
        },
        {
          status: 403,
        }
      );
    }

    return NextResponse.next();
  }

  /* =======================================================
     TEST API
  ======================================================= */

  if (
    pathname ===
      "/api/tests" ||
    pathname.startsWith(
      "/api/tests/"
    )
  ) {
    /*
      Oddiy foydalanuvchi ham
      testni ochishi uchun
      test API ga kira olishi
      shart.

      POST / PUT / PATCH /
      DELETE esa faqat admin.
    */

    const method =
      request.method.toUpperCase();

    if (
      method === "GET"
    ) {
      return NextResponse.next();
    }

    if (!isAdmin) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Testlarni faqat administrator o‘zgartira oladi.",
        },
        {
          status: 403,
        }
      );
    }

    return NextResponse.next();
  }

  /* =======================================================
     FOYDALANUVCHI TEST SAHIFALARI
  ======================================================= */

  if (
    pathname === "/test" ||
    pathname.startsWith(
      "/test/"
    )
  ) {
    /*
      Bu yerga:
      /test
      /test/ABC-ID

      oddiy foydalanuvchi
      ham kira oladi.

      /test/editor esa
      yuqorida alohida
      bloklangan.
    */

    return NextResponse.next();
  }

  /* =======================================================
     ASOSIY SAYT VA BOSHQA SAHIFALAR
  ======================================================= */

  return NextResponse.next();
}

/* =========================================================
   MATCHER
========================================================= */

export const config = {
  matcher: [
    /*
      Static Next.js fayllaridan
      tashqari barcha requestlarni
      proxy tekshiradi.
    */

    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
