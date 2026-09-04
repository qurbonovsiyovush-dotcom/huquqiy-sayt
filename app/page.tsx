"use client";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  /* =====================================================
     LOGIN
  ===================================================== */

  const [authenticated, setAuthenticated] =
    useState(false);

  const [checking, setChecking] =
    useState(true);

  const [isAdmin, setIsAdmin] =
    useState(false);

  const [code, setCode] =
    useState("");

  const [loginError, setLoginError] =
    useState("");

  const [loginLoading, setLoginLoading] =
    useState(false);

  useEffect(() => {
    /*
      Faqat shu brauzer oynasida
      avval kod kiritilganmi — tekshiramiz.
    */

    const session =
      sessionStorage.getItem(
        "qurbonov-session"
      );

    const role =
      sessionStorage.getItem(
        "qurbonov-role"
      );

    if (session === "approved") {
      setAuthenticated(true);
      setIsAdmin(role === "admin");
    }

    setChecking(false);
  }, []);

  /* =====================================================
     LOGIN SUBMIT
  ===================================================== */

  async function handleLogin(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setLoginError("");

    const cleanCode =
      code.trim();

    if (!cleanCode) {
      setLoginError(
        "Maxsus kirish kodini kiriting."
      );

      return;
    }

    setLoginLoading(true);

    try {
      const response =
        await fetch("/api/login", {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            code: cleanCode,
          }),
        });

      const data =
        await response.json();

      /*
        Oddiy foydalanuvchi kodi to‘g‘ri,
        lekin admin hali ruxsat bermagan bo‘lsa,
        /api/login 403 qaytaradi.
      */

      if (!response.ok) {
        setLoginError(
          data?.error ||
            data?.message ||
            "Kirish amalga oshmadi."
        );

        return;
      }

      /*
        Faqat server haqiqiy ruxsat bergandan
        keyin asosiy sahifa ochiladi.
      */

      sessionStorage.setItem(
        "qurbonov-session",
        "approved"
      );

      sessionStorage.setItem(
        "qurbonov-role",
        data.role || "user"
      );

      setIsAdmin(
        data.role === "admin"
      );

      setAuthenticated(true);

      setCode("");

    } catch {
      setLoginError(
        "Server bilan bog‘lanishda xatolik yuz berdi."
      );
    } finally {
      setLoginLoading(false);
    }
  }

  /* =====================================================
     CHIQISH
  ===================================================== */

  function logout() {
    sessionStorage.removeItem(
      "qurbonov-session"
    );

    sessionStorage.removeItem(
      "qurbonov-role"
    );

    setAuthenticated(false);
    setIsAdmin(false);
    setCode("");
    setLoginError("");
  }

  /* =====================================================
     TEKSHIRILAYOTGAN PAYT
  ===================================================== */

  if (checking) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#05283e",
        }}
      />
    );
  }

  /* =====================================================
     LOGIN SAHIFASI
     KOD KIRITILMAGUNCHA FAQAT SHU KO‘RINADI
  ===================================================== */

  if (!authenticated) {
    return (
      <main className="loginPage">
        <section className="loginShell">

          <aside className="loginBrand">
            <div className="brandBadge">Q</div>

            <div className="brandText">
              <div className="brandEyebrow">
                HUQUQIY TA’LIM PLATFORMASI
              </div>

              <h1>
                Qurbonov
                <span>S.J.</span>
              </h1>

              <p>
                Talabalar va abituriyentlar uchun
                huquqiy ta’lim platformasi.
              </p>
            </div>

            <div className="brandFoot">
              qurbonov.uz
            </div>
          </aside>

          <div className="loginPanel">
            <div className="loginHeader">
              <div className="loginMiniBadge">
                MAXSUS KIRISH
              </div>

              <h2>
                Xush kelibsiz
              </h2>

              <p>
                Platformaga kirish uchun sizga
                berilgan maxsus kodni kiriting.
              </p>
            </div>

            <form
              onSubmit={handleLogin}
              className="loginForm"
            >
              <label
                htmlFor="access-code"
                className="loginLabel"
              >
                Kirish kodi
              </label>

              <div className="loginInputWrapper">
                <span
                  className="loginKeyIcon"
                  aria-hidden="true"
                >
                  ◆
                </span>

                <input
                  id="access-code"
                  className="loginInput"
                  type="text"
                  value={code}
                  disabled={loginLoading}
                  autoComplete="off"
                  placeholder="Masalan: QUR-XXXX-XXXX"
                  onChange={(e) => {
                    setCode(
                      e.target.value.toUpperCase()
                    );
                    setLoginError("");
                  }}
                />
              </div>

              {loginError && (
                <div
                  className="loginError"
                  role="alert"
                >
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                className="loginButton"
                disabled={loginLoading}
              >
                {loginLoading
                  ? "Tekshirilmoqda..."
                  : "Kirish"}
              </button>
            </form>

            <div className="loginDivider">
              <span />
              <b>Qurbonov Siyovush Jamaliddinzoda</b>
              <span />
            </div>

            <div className="loginInfo">
              Platformaga faqat administrator
              tomonidan berilgan maxsus kod
              orqali kirish mumkin.
            </div>
          </div>

        </section>

        <style jsx>{`
          * {
            box-sizing: border-box;
          }

          .loginPage {
            width: 100%;
            min-height: 100vh;

            display: flex;
            align-items: center;
            justify-content: center;

            padding: 42px 24px;

            background:
              radial-gradient(
                circle at 18% 12%,
                rgba(38, 155, 220, .14),
                transparent 34%
              ),
              radial-gradient(
                circle at 86% 86%,
                rgba(14, 61, 95, .11),
                transparent 36%
              ),
              #f5f7fa;

            font-family:
              "Bell MT",
              "Times New Roman",
              serif;
          }

          .loginShell {
            width: min(100%, 980px);
            min-height: 570px;

            display: grid;
            grid-template-columns:
              minmax(300px, .9fr)
              minmax(430px, 1.1fr);

            overflow: hidden;

            border:
              1px solid
              rgba(14, 50, 75, .14);

            border-radius: 28px;

            background: #ffffff;

            box-shadow:
              0 28px 70px
                rgba(20, 42, 58, .16),
              0 3px 10px
                rgba(20, 42, 58, .08);
          }

          .loginBrand {
            position: relative;

            display: flex;
            flex-direction: column;
            justify-content: space-between;

            min-height: 570px;

            padding:
              42px
              38px
              34px;

            overflow: hidden;

            color: #ffffff;

            background:
              linear-gradient(
                155deg,
                #0b2f49 0%,
                #0d4f75 48%,
                #137db0 100%
              );
          }

          .loginBrand::before {
            content: "";

            position: absolute;

            width: 330px;
            height: 330px;

            right: -175px;
            top: -115px;

            border-radius: 50%;

            border:
              54px solid
              rgba(255,255,255,.08);
          }

          .loginBrand::after {
            content: "";

            position: absolute;

            width: 250px;
            height: 250px;

            left: -140px;
            bottom: -130px;

            border-radius: 50%;

            border:
              42px solid
              rgba(255,255,255,.07);
          }

          .brandBadge {
            position: relative;
            z-index: 1;

            width: 58px;
            height: 58px;

            display: grid;
            place-items: center;

            border:
              1px solid
              rgba(255,255,255,.42);

            border-radius: 18px;

            background:
              rgba(255,255,255,.13);

            box-shadow:
              inset 0 1px 0
              rgba(255,255,255,.25);

            font-size: 30px;
            font-weight: 900;
          }

          .brandText {
            position: relative;
            z-index: 1;

            margin-top: auto;
            margin-bottom: auto;
          }

          .brandEyebrow {
            margin-bottom: 18px;

            color:
              rgba(255,255,255,.74);

            font-family:
              Arial,
              sans-serif;

            font-size: 12px;
            font-weight: 800;

            letter-spacing: 1.8px;
          }

          .brandText h1 {
            margin: 0;

            display: flex;
            flex-direction: column;

            font-size:
              clamp(46px, 5vw, 66px);

            line-height: .93;

            letter-spacing: -1.5px;
          }

          .brandText h1 span {
            color: #8fddff;
          }

          .brandText p {
            max-width: 315px;

            margin:
              24px
              0
              0;

            color:
              rgba(255,255,255,.82);

            font-family:
              Arial,
              sans-serif;

            font-size: 15px;
            line-height: 1.65;
          }

          .brandFoot {
            position: relative;
            z-index: 1;

            color:
              rgba(255,255,255,.66);

            font-family:
              Arial,
              sans-serif;

            font-size: 13px;
            letter-spacing: .8px;
          }

          .loginPanel {
            display: flex;
            flex-direction: column;
            justify-content: center;

            padding:
              52px
              58px;

            background:
              rgba(255,255,255,.98);
          }

          .loginHeader {
            margin-bottom: 30px;
          }

          .loginMiniBadge {
            width: fit-content;

            margin-bottom: 16px;

            padding:
              7px
              11px;

            border-radius: 999px;

            background: #e8f5fb;

            color: #12688f;

            font-family:
              Arial,
              sans-serif;

            font-size: 11px;
            font-weight: 900;

            letter-spacing: 1.2px;
          }

          .loginHeader h2 {
            margin: 0;

            color: #17252f;

            font-size: 38px;
            line-height: 1.05;
            font-weight: 900;
          }

          .loginHeader p {
            max-width: 430px;

            margin:
              12px
              0
              0;

            color: #687782;

            font-family:
              Arial,
              sans-serif;

            font-size: 15px;
            line-height: 1.55;
          }

          .loginForm {
            display: flex;
            flex-direction: column;

            gap: 14px;
          }

          .loginLabel {
            color: #2b3b46;

            font-family:
              Arial,
              sans-serif;

            font-size: 13px;
            font-weight: 800;
          }

          .loginInputWrapper {
            min-height: 58px;

            display: flex;
            align-items: center;

            padding:
              0
              17px;

            border:
              1.5px solid #cbd8df;

            border-radius: 14px;

            background: #f8fafb;

            transition:
              border-color .18s ease,
              box-shadow .18s ease,
              background .18s ease;
          }

          .loginInputWrapper:focus-within {
            border-color: #1684b9;

            background: #ffffff;

            box-shadow:
              0 0 0 4px
              rgba(22,132,185,.12);
          }

          .loginKeyIcon {
            margin-right: 12px;

            color: #1b86b8;

            font-size: 12px;

            transform: rotate(45deg);
          }

          .loginInput {
            width: 100%;
            min-width: 0;

            border: 0;
            outline: 0;

            background: transparent;

            color: #17252f;

            font-family:
              Arial,
              sans-serif;

            font-size: 16px;
            font-weight: 700;

            letter-spacing: .5px;
          }

          .loginInput::placeholder {
            color: #9aa8b2;
            font-weight: 500;
          }

          .loginError {
            padding:
              11px
              13px;

            border:
              1px solid #f0b7b7;

            border-radius: 11px;

            background: #fff4f4;

            color: #a22c2c;

            font-family:
              Arial,
              sans-serif;

            font-size: 13px;
            font-weight: 700;

            text-align: center;
          }

          .loginButton {
            min-height: 58px;

            margin-top: 2px;

            border: 0;
            border-radius: 14px;

            background:
              linear-gradient(
                135deg,
                #0e5c87 0%,
                #118bc2 100%
              );

            box-shadow:
              0 12px 22px
                rgba(15,111,157,.22);

            color: #ffffff;

            font-family:
              "Bell MT",
              "Times New Roman",
              serif;

            font-size: 22px;
            font-weight: 900;

            cursor: pointer;

            transition:
              transform .16s ease,
              box-shadow .16s ease,
              filter .16s ease;
          }

          .loginButton:hover {
            transform:
              translateY(-1px);

            box-shadow:
              0 15px 26px
              rgba(15,111,157,.27);

            filter: brightness(1.03);
          }

          .loginButton:active {
            transform:
              translateY(1px);
          }

          .loginButton:disabled {
            opacity: .6;
            cursor: wait;
            transform: none;
          }

          .loginDivider {
            display: flex;
            align-items: center;

            gap: 12px;

            margin:
              29px
              0
              18px;

            color: #7a8892;

            font-size: 13px;
            text-align: center;
          }

          .loginDivider span {
            flex: 1;
            height: 1px;

            background: #e1e7eb;
          }

          .loginDivider b {
            max-width: 265px;

            color: #485761;

            font-weight: 700;
          }

          .loginInfo {
            color: #7f8c95;

            font-family:
              Arial,
              sans-serif;

            font-size: 12px;
            line-height: 1.5;
            text-align: center;
          }

          @media (max-width: 780px) {
            .loginPage {
              padding:
                22px
                14px;
            }

            .loginShell {
              width: min(100%, 430px);
              min-height: auto;

              grid-template-columns: 1fr;

              border-radius: 22px;
            }

            .loginBrand {
              min-height: 195px;

              padding:
                25px
                24px
                23px;
            }

            .brandBadge {
              width: 46px;
              height: 46px;

              border-radius: 14px;

              font-size: 24px;
            }

            .brandText {
              margin:
                28px
                0
                0;
            }

            .brandEyebrow {
              margin-bottom: 9px;

              font-size: 10px;
            }

            .brandText h1 {
              display: block;

              font-size: 37px;
              line-height: 1;
            }

            .brandText h1 span {
              margin-left: 8px;
            }

            .brandText p {
              display: none;
            }

            .brandFoot {
              display: none;
            }

            .loginPanel {
              padding:
                32px
                24px
                28px;
            }

            .loginHeader {
              margin-bottom: 24px;
            }

            .loginMiniBadge {
              margin-bottom: 12px;
            }

            .loginHeader h2 {
              font-size: 31px;
            }

            .loginHeader p {
              font-size: 14px;
            }

            .loginInputWrapper,
            .loginButton {
              min-height: 56px;
            }

            .loginDivider {
              margin-top: 24px;
            }
          }

          @media (max-width: 390px) {
            .loginPage {
              padding:
                12px
                10px;
            }

            .loginBrand {
              min-height: 170px;

              padding:
                20px;
            }

            .brandText {
              margin-top: 22px;
            }

            .brandText h1 {
              font-size: 33px;
            }

            .loginPanel {
              padding:
                27px
                19px
                24px;
            }

            .loginHeader h2 {
              font-size: 29px;
            }
          }
        `}</style>
      </main>
    );
  }

  /* =====================================================
     ASOSIY SAYT
     FAQAT KIRISH TASDIQLANGANDAN KEYIN
  ===================================================== */

  return (
    <main className="page">

      {/* =================================================
          YUQORI PANEL
      ================================================= */}

      <header className="topPanel">

        <div className="namePlate">
          Qurbonov Siyovush Jamaliddinzoda
        </div>

        <nav className="menu">

          <a
            href="#talabalar"
            className="menuButton"
          >
            Talabalar
          </a>

          <a
            href="#abituriyent"
            className="menuButton"
          >
            Abituriyent
          </a>

          <a
            href="#savol-javob"
            className="menuButton"
          >
            Savol-javob
          </a>

          <button
            type="button"
            className="menuButton"
            onClick={() =>
              router.push(
                "/qollanmalar"
              )
            }
          >
            Qo‘llanmalar
          </button>

          {isAdmin && (
            <button
              className="menuButton"
              onClick={() =>
                router.push(
                  "/admin/requests"
                )
              }
            >
              Admin
            </button>
          )}

          <button
            className="exitButton"
            onClick={logout}
          >
            Chiqish
          </button>

        </nav>

      </header>


      {/* =================================================
          O‘ZBEKISTON RESPUBLIKASI DAVLAT GERBI
      ================================================= */}

      <section className="clockSection">

        <div className="sectionTitle">
          Huquqiy ta’lim platformasi
        </div>

        <div className="emblemHolder">
          <div className="emblemRecess">
            <img
              src="/gerb.png"
              alt="O‘zbekiston Respublikasi Davlat gerbi"
              className="emblemImage"
              draggable={false}
            />
          </div>
        </div>

      </section>


      {/* =================================================
          TALABALAR
      ================================================= */}

      <section
        className="sectionBox"
        id="talabalar"
      >

        <div className="sectionTitle">
          Talabalar
        </div>

        <div className="cards">

          <article className="card">

            <h2>
              Normativ-huquqiy
              hujjatlar
            </h2>

            <button className="openButton">
              Ochish
            </button>

          </article>


          <article className="card">

            <h2>
              Kazuslar
            </h2>

            <button
              className="openButton"
              onClick={() =>
                router.push(
                  "/talabalar/kazuslar"
                )
              }
            >
              Ochish
            </button>

          </article>


          <article className="card">

            <h2>
              Qo‘llanmalar
            </h2>

            <button className="openButton">
              Ochish
            </button>

          </article>

        </div>

      </section>


      {/* =================================================
          ABITURIYENT
      ================================================= */}

      <section
        className="sectionBox"
        id="abituriyent"
      >

        <div className="sectionTitle">
          Abituriyent
        </div>

        <div className="cards">

          <article className="card">
            <h2>Testlar</h2>

            <button
              className="openButton"
              onClick={() =>
                router.push("/test")
              }
            >
              Ochish
            </button>
          </article>

          <article className="card">
            <h2>Qo‘llanmalar</h2>

            <button className="openButton">
              Ochish
            </button>
          </article>

          <article className="card">
            <h2>Video darslar</h2>

            <button className="openButton">
              Ochish
            </button>
          </article>

        </div>

      </section>


      {/* =================================================
          SAVOL JAVOB
      ================================================= */}

      <section
        className="sectionBox"
        id="savol-javob"
      >

        <div className="sectionTitle">
          Savol-javob
        </div>

        <div className="cards">

          <article className="card">
            <h2>
              Huquqiy savollar
            </h2>

            <button className="openButton">
              Ochish
            </button>
          </article>

          <article className="card">
            <h2>
              Huquqiy tushuntirishlar
            </h2>

            <button className="openButton">
              Ochish
            </button>
          </article>

          <article className="card">
            <h2>
              Sud qarorlari tahlili
            </h2>

            <button className="openButton">
              Ochish
            </button>
          </article>

        </div>

      </section>


      {/* =================================================
          QO‘LLANMALAR
      ================================================= */}

      <section
        className="sectionBox"
        id="qollanmalar"
      >

        <div className="sectionTitle">
          Qo‘llanmalar
        </div>

        <div className="cards">

          <article className="card">
            <h2>Kodekslar</h2>

            <button
              type="button"
              className="openButton"
              onClick={() =>
                router.push(
                  "/qollanmalar/kodekslar"
                )
              }
            >
              Ochish
            </button>
          </article>

          <article className="card">
            <h2>
              Qonun va qonunchilik
              hujjatlari
            </h2>

            <button
              type="button"
              className="openButton"
              onClick={() =>
                router.push(
                  "/qollanmalar/qonunlar"
                )
              }
            >
              Ochish
            </button>
          </article>

          <article className="card">
            <h2>Darsliklar</h2>

            <button
              type="button"
              className="openButton"
              onClick={() =>
                router.push(
                  "/qollanmalar/darsliklar"
                )
              }
            >
              Ochish
            </button>
          </article>

          <article className="card">
            <h2>
              English Vocabulary
            </h2>

            <div className="vocabularySubtitle">
              4000 Essential English Words
            </div>

            <button
              type="button"
              className="openButton testButton"
              onClick={() =>
                router.push(
                  "/qollanmalar/english-vocabulary"
                )
              }
            >
              Ochish
            </button>
          </article>

          <article className="card">
            <h2>
              Inglizcha lug‘atlar
            </h2>

            <div className="vocabularySubtitle">
              English–Uzbek, Phrasal Verbs,
              Irregular Verbs va boshqalar
            </div>

            <button
              type="button"
              className="openButton testButton"
              onClick={() =>
                router.push(
                  "/dictionaries"
                )
              }
            >
              Ochish
            </button>
          </article>

        </div>

      </section>

      {/* =================================================
          FOOTER
      ================================================= */}

      <footer className="footer">
        Qurbonov Siyovush Jamaliddinzodaning
        huquqiy ta’lim platformasi
      </footer>


      {/* =================================================
          ASOSIY CSS
      ================================================= */}

      <style jsx>{`

        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;

          padding:
            16px
            16px
            60px;

          background:
            linear-gradient(
              180deg,
              #ffffff,
              #f2f5f7
            );

          font-family:
            "Bell MT",
            "Times New Roman",
            serif;

          color: #111;
        }


        /* ===========================
           HEADER
        =========================== */

        .topPanel {
          width: 100%;

          min-height: 125px;

          padding:
            25px
            30px;

          display: flex;

          align-items: center;

          justify-content:
            space-between;

          gap: 25px;

          border:
            3px solid #173e58;

          border-radius: 27px;

          background:
            linear-gradient(
              180deg,
              #90d9ff,
              #68b9e9 45%,
              #4999ce
            );

          box-shadow:
            inset 0 6px 6px
              rgba(255,255,255,.8),

            inset 0 -7px 7px
              rgba(0,0,0,.18),

            0 7px 0 #173c55,

            0 13px 20px
              rgba(0,0,0,.25);
        }

        .namePlate {
          min-width: 425px;

          padding:
            18px
            25px;

          text-align: center;

          font-size: 26px;

          font-weight: 700;

          border:
            3px solid #42494e;

          border-radius: 15px;

          background:
            linear-gradient(
              180deg,
              #fafafa,
              #dedede 30%,
              #bababa 70%,
              #9b9b9b
            );

          box-shadow:
            inset 0 6px 5px
              rgba(255,255,255,.95),

            inset 0 -6px 6px
              rgba(0,0,0,.20),

            0 5px 0 #4b5256;
        }

        .menu {
          display: flex;

          gap: 14px;

          align-items: center;

          justify-content:
            flex-end;

          flex-wrap: wrap;
        }

        .menuButton,
        .exitButton {
          min-width: 130px;

          height: 58px;

          padding:
            0
            16px;

          display: flex;

          align-items: center;

          justify-content: center;

          border-radius: 14px;

          cursor: pointer;

          text-decoration: none;

          font-family: inherit;

          font-size: 15px;

          font-weight: 700;
        }

        .menuButton {
          color: #111;

          border:
            3px solid #464c50;

          background:
            linear-gradient(
              180deg,
              #f8f8f8,
              #dedede 30%,
              #b8b8b8 70%,
              #999
            );

          box-shadow:
            inset 0 5px 5px
              rgba(255,255,255,.95),

            0 5px 0 #4b5256;
        }

        .exitButton {
          color: white;

          border:
            3px solid #8c1515;

          background:
            linear-gradient(
              #ff6262,
              #db3030 45%,
              #b51010
            );

          box-shadow:
            inset 0 5px 5px
              rgba(255,255,255,.4),

            0 5px 0 #780c0c;
        }


        /* ===========================
           KATTA SECTION
        =========================== */

        .clockSection,
        .sectionBox {
          position: relative;

          /*
            Tepdagi ko‘k panel 100%.
            Pastdagi katta bo‘limlar undan faqat ozgina kichik:
            chap va o‘ngdan taxminan 2.5% ichkarida.
          */
          width: 95%;
          max-width: 95%;

          margin:
            90px
            auto
            70px;

          padding:
            75px
            38px
            45px;

          box-sizing: border-box;

          border:
            3px solid #303538;

          border-radius: 28px;

          background:
            linear-gradient(
              145deg,
              #686c6f,
              #505457 45%,
              #363a3d
            );

          box-shadow:
            inset 0 7px 6px
              rgba(255,255,255,.23),

            inset 0 -8px 8px
              rgba(0,0,0,.32),

            0 7px 0 #272b2e,

            0 15px 24px
              rgba(0,0,0,.30);
        }

        .sectionTitle {
          position: absolute;

          top: -35px;
          left: 50%;

          transform:
            translateX(-50%);

          min-width: 330px;

          min-height: 66px;

          padding:
            10px
            25px;

          display: flex;

          align-items: center;

          justify-content: center;

          text-align: center;

          color: #073b68;

          font-size: 28px;

          font-weight: 700;

          border:
            3px solid #174461;

          border-radius: 15px;

          background:
            linear-gradient(
              #9bd9ff,
              #73bdea 45%,
              #4e9ccc
            );

          box-shadow:
            inset 0 6px 5px
              rgba(255,255,255,.75),

            0 5px 0 #17415c;
        }


        /* ===========================
           GERB
        =========================== */

        .emblemHolder {
          width: 100%;
          min-height: 390px;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 25px;

          box-sizing: border-box;
        }

        .emblemRecess {
          width: clamp(300px, 28vw, 390px);
          height: auto;
          aspect-ratio: 1 / 1;

          margin: 0 auto;

          display: flex;
          align-items: center;
          justify-content: center;

          flex: 0 0 auto;

          border:
            5px solid #22292d;

          border-radius: 50%;

          background:
            radial-gradient(
              circle at 50% 50%,
              #50575b 0%,
              #363c40 55%,
              #1f2528 100%
            );

          box-shadow:
            inset 0 7px 8px
              rgba(255,255,255,.18),

            inset 0 -10px 14px
              rgba(0,0,0,.42),

            0 7px 0 #1f2528,

            0 14px 22px
              rgba(0,0,0,.34);

          overflow: hidden;
        }

        .emblemImage {
          /*
            Gerb qora dumaloq taglik ichida markazda turadi.
            Cho‘zilmaydi va qora halqadan ozgina kichik bo‘ladi.
          */
          width: 91%;
          height: auto;
          max-width: 91%;
          max-height: 91%;

          margin: 0 auto;

          object-fit: contain;
          object-position: center;

          display: block;

          position: static;
          transform: none;

          user-select: none;

          filter:
            drop-shadow(
              0 7px 5px
              rgba(0,0,0,.28)
            );
        }


        /* ===========================
           CARDS
        =========================== */

        .cards {
          width: 100%;

          display: grid;

          grid-template-columns:
            repeat(
              3,
              minmax(0, 1fr)
            );

          gap: 30px;

          align-items: stretch;
        }

        .card {
          width: 100%;
          min-width: 0;
          min-height: 235px;

          padding: 30px;

          box-sizing: border-box;

          display: flex;

          flex-direction: column;

          align-items: center;

          justify-content: center;

          text-align: center;

          border:
            2px solid #3d4347;

          border-radius: 20px;

          background:
            linear-gradient(
              #e1e1e1,
              #c5c5c5 50%,
              #a6a6a6
            );

          box-shadow:
            inset 0 6px 5px
              rgba(255,255,255,.86),

            0 6px 0 #4a5054,

            0 11px 16px
              rgba(0,0,0,.25);
        }

        .vocabularySubtitle {
          min-height: 42px;

          margin:
            -12px
            0
            18px;

          display: flex;
          align-items: center;
          justify-content: center;

          text-align: center;

          color: #314753;

          font-size: 15px;
          line-height: 1.25;
          font-weight: 700;
        }

        .card h2 {
          min-height: 70px;

          margin:
            0
            0
            25px;

          display: flex;

          align-items: center;

          justify-content: center;

          font-size: 25px;
        }

        .openButton {
          width: 175px;

          height: 50px;

          border:
            2px solid #4e565b;

          border-radius: 9px;

          cursor: pointer;

          font-family: inherit;

          font-size: 17px;

          font-weight: 700;

          background:
            linear-gradient(
              #f8f8f8,
              #bdbdbd
            );

          box-shadow:
            inset 0 4px 4px white,

            0 4px 0 #555d61;
        }


        /* ===========================
           FOOTER
        =========================== */

        .footer {
          width: 95%;
          max-width: 95%;

          min-height: 112px;

          margin:
            80px
            auto
            20px;

          padding:
            24px
            35px;

          display: flex;
          align-items: center;
          justify-content: center;

          box-sizing: border-box;

          text-align: center;

          color: #073b68;

          font-size: 23px;
          line-height: 1.25;

          font-weight: 700;

          border:
            3px solid #174461;

          border-radius: 20px;

          background:
            linear-gradient(
              #9bd9ff,
              #59a9d8
            );

          box-shadow:
            inset 0 6px 5px
              rgba(255,255,255,.75),

            0 6px 0 #17415c;
        }


        /* ===========================
           RESPONSIVE
        =========================== */

        @media (
          max-width: 1100px
        ) {

          .topPanel {
            flex-direction: column;
          }

          .namePlate {
            width: 100%;

            min-width: 0;
          }

          .menu {
            width: 100%;

            justify-content: center;
          }
        }

        @media (
          max-width: 850px
        ) {

          .cards {
            grid-template-columns:
              1fr;
          }

          .card h2 {
            min-height: 0;
          }
        }

        @media (
          max-width: 600px
        ) {

          .page {
            padding:
              10px
              10px
              40px;
          }

          .topPanel {
            padding:
              20px
              15px;
          }

          .menu {
            flex-direction: column;
          }

          .menuButton,
          .exitButton {
            width: 100%;
          }

          .clockSection,
          .sectionBox {
            width: 98%;

            padding:
              65px
              18px
              30px;
          }

          .sectionTitle {
            min-width: 240px;

            max-width: 92%;

            font-size: 22px;
          }
        }


        @media (min-width: 651px) and (max-width: 900px) {
          .clockSection,
          .sectionBox {
            width: 93%;
            max-width: 93%;
          }

          .emblemRecess {
            width: min(46vw, 350px);
            height: auto;
            aspect-ratio: 1 / 1;
          }
        }

      `}</style>

    </main>
  );
}
