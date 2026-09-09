import {
  NextRequest,
  NextResponse,
} from "next/server";

/* =========================================================
   PROXY
   FOYDALANUVCHI VA ADMIN HUQUQLARINI AJRATISH

   MUHIM:
   "/" sahifa ochiq qoladi, chunki aynan shu sahifada
   gerbli kirish oynasi bor.

   Eski "/login" sahifasi endi ishlatilmaydi.
   U avtomatik "/" ga yuboriladi.
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
     NEXT.JS ICHKI FAYLLARI VA OCHIQ ASSETLAR
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
    pathname ===
      "/gerb.png" ||
    pathname.startsWith(
      "/icons"
    )
  ) {
    return NextResponse.next();
  }

  /* =======================================================
     ASOSIY SAHIFA
     GERBLI LOGIN SHU YERDA
  ======================================================= */

  if (pathname === "/") {
    return NextResponse.next();
  }

  /* =======================================================
     ESKI /login SAHIFASINI OLIB TASHLAYMIZ
     Kim /login ga kirsa gerbli login turgan "/" ga boradi.
  ======================================================= */

  if (pathname === "/login") {
    return NextResponse.redirect(
      new URL(
        "/",
        request.url
      )
    );
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
     VOCABULARY GET API
     HAMMAGA OCHIQ
  ======================================================= */

  if (
    pathname ===
      "/api/vocabulary" &&
    request.method.toUpperCase() ===
      "GET"
  ) {
    return NextResponse.next();
  }

  /* =======================================================
     LOGIN QILMAGAN FOYDALANUVCHI
  ======================================================= */

  if (!isLoggedIn) {
    /*
      Himoyalangan sahifaga kirishga
      urinsa, eski /login ga emas,
      gerbli login turgan "/" ga
      qaytaramiz.
    */
    if (
      !pathname.startsWith(
        "/api/"
      )
    ) {
      return NextResponse.redirect(
        new URL(
          "/",
          request.url
        )
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
     VOCABULARY API

     GET:
     oddiy foydalanuvchi ham o‘qiydi.

     POST / PUT / PATCH / DELETE:
     faqat administrator.
  ======================================================= */

  if (
    pathname ===
      "/api/vocabulary" ||
    pathname.startsWith(
      "/api/vocabulary/"
    )
  ) {
    const method =
      request.method.toUpperCase();

    if (method === "GET") {
      return NextResponse.next();
    }

    if (!isAdmin) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Vocabulary ma’lumotlarini faqat administrator o‘zgartira oladi.",
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

     GET:
     oddiy foydalanuvchi ham testni ochadi.

     POST / PUT / PATCH / DELETE:
     faqat administrator.
  ======================================================= */

  if (
    pathname ===
      "/api/tests" ||
    pathname.startsWith(
      "/api/tests/"
    )
  ) {
    const method =
      request.method.toUpperCase();

    if (method === "GET") {
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
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
