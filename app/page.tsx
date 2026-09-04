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
        <section className="loginCard">
          <div className="loginTab">
            Qurbonov Siyovush Jamaliddinzoda
          </div>

          <div className="loginContent">
            <div className="loginLeft">
              <form
                onSubmit={handleLogin}
                className="loginForm"
              >
                <div className="inputShell">
                  <span
                    className="lockIcon"
                    aria-hidden="true"
                  >
                    🔒
                  </span>

                  <input
                    className="loginInput"
                    type="text"
                    value={code}
                    disabled={loginLoading}
                    autoComplete="off"
                    placeholder="Kirish kodini kiriting"
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
            </div>

            <div className="loginRight">
              <div className="emblemCircle">
                <img
                  src="/gerb.png"
                  alt="O‘zbekiston Respublikasi Davlat gerbi"
                  className="loginEmblem"
                />
              </div>
            </div>
          </div>
        </section>

        <style jsx>{`
          * {
            box-sizing: border-box;
          }

          .loginPage {
            min-height: 100vh;
            width: 100%;

            display: flex;
            align-items: center;
            justify-content: center;

            padding: 42px 24px;

            background: #f7f7f5;

            font-family:
              "Bell MT",
              "Times New Roman",
              serif;
          }

          .loginCard {
            position: relative;

            width: min(92vw, 1120px);
            min-height: 470px;

            padding:
              78px
              54px
              46px;

            border:
              3px solid #244c66;

            border-radius: 44px;

            background:
              linear-gradient(
                180deg,
                #e5e7e8 0%,
                #d3d7d9 38%,
                #c4c9cc 100%
              );

            box-shadow:
              inset 0 5px 0
                rgba(255,255,255,.95),
              inset 0 0 0 12px
                rgba(255,255,255,.30),
              inset 0 -8px 0
                rgba(73,84,90,.18),
              0 10px 0 #7a858a,
              0 16px 28px
                rgba(0,0,0,.18);
          }

          .loginCard::before {
            content: "";

            position: absolute;
            inset: 14px;

            pointer-events: none;

            border:
              2px solid
              rgba(255,255,255,.80);

            border-radius: 34px;

            box-shadow:
              inset 0 0 0 2px
              rgba(112,124,130,.22);
          }

          .loginTab {
            position: absolute;

            top: -50px;
            left: 50%;

            transform: translateX(-50%);

            min-width: 520px;
            max-width: 72%;

            padding:
              15px
              32px
              14px;

            border:
              3px solid #4f626d;

            border-radius: 15px;

            background:
              linear-gradient(
                180deg,
                #f4f6f7 0%,
                #d9e0e3 46%,
                #b9c5ca 100%
              );

            box-shadow:
              inset 0 3px 0
                rgba(255,255,255,.96),
              inset 0 -3px 0
                rgba(68,87,97,.16),
              0 7px 0 #596c75,
              0 11px 18px
                rgba(0,0,0,.14);

            color: #172a34;

            font-size: 29px;
            font-weight: 900;
            text-align: center;

            z-index: 3;
          }

          .loginContent {
            position: relative;
            z-index: 2;

            min-height: 330px;

            display: grid;
            grid-template-columns:
              minmax(420px, 1.15fr)
              minmax(300px, .85fr);

            align-items: center;
            gap: 64px;
          }

          .loginLeft {
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 24px;
          }

          .ownerName {
            width: 100%;

            padding:
              17px
              20px;

            border:
              3px solid #525b60;

            border-radius: 14px;

            background:
              linear-gradient(
                180deg,
                #ffffff 0%,
                #ececec 56%,
                #d4d4d4 100%
              );

            box-shadow:
              inset 0 3px 0 #ffffff,
              0 7px 0 #454c50,
              0 10px 15px
                rgba(0,0,0,.16);

            color: #111;

            font-size: 26px;
            font-weight: 800;
            text-align: center;
          }

          .loginForm {
            display: flex;
            flex-direction: column;
            gap: 28px;
          }

          .inputShell {
            min-height: 76px;

            display: flex;
            align-items: center;

            padding:
              0
              20px;

            border:
              3px solid #4d6877;

            border-radius: 13px;

            background:
              linear-gradient(
                180deg,
                #fbfbfb 0%,
                #eeeeee 62%,
                #dedede 100%
              );

            box-shadow:
              inset 0 3px 0 #ffffff,
              inset 0 -3px 0
                rgba(102,113,120,.12),
              0 7px 0 #3d5969,
              0 11px 16px
                rgba(0,0,0,.16);
          }

          .lockIcon {
            flex: 0 0 auto;

            margin-right: 13px;

            font-size: 20px;
          }

          .loginInput {
            width: 100%;
            min-width: 0;

            border: 0;
            outline: 0;

            background: transparent;

            color: #111;

            font-family:
              "Bell MT",
              "Times New Roman",
              serif;

            font-size: 21px;
            font-weight: 700;
          }

          .loginInput::placeholder {
            color: #858585;
            opacity: 1;
          }

          .loginError {
            margin:
              -12px
              0
              -8px;

            padding:
              11px
              14px;

            border:
              1px solid #bf6565;

            border-radius: 9px;

            background: #fff0f0;

            color: #9a1f1f;

            font-size: 14px;
            font-weight: 800;
            text-align: center;
          }

          .loginButton {
            min-height: 76px;

            border:
              3px solid #4d6877;

            border-radius: 13px;

            background:
              linear-gradient(
                180deg,
                #eef5f8 0%,
                #c9dce5 32%,
                #91b7ca 68%,
                #6f9eb5 100%
              );

            box-shadow:
              inset 0 3px 0
                rgba(255,255,255,.96),
              inset 0 -3px 0
                rgba(20,101,143,.16),
              0 8px 0 #536f7e,
              0 12px 17px
                rgba(0,0,0,.17);

            color: #203640;

            font-family:
              "Bell MT",
              "Times New Roman",
              serif;

            font-size: 31px;
            font-weight: 900;

            cursor: pointer;

            transition:
              transform .12s ease,
              box-shadow .12s ease;
          }

          .loginButton:hover {
            transform: translateY(-1px);
          }

          .loginButton:active {
            transform: translateY(4px);

            box-shadow:
              inset 0 3px 0
                rgba(255,255,255,.80),
              0 4px 0 #176a96,
              0 8px 12px
                rgba(0,0,0,.14);
          }

          .loginButton:disabled {
            opacity: .65;
            cursor: wait;
          }

          .loginRight {
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .emblemCircle {
            width: min(28vw, 320px);
            aspect-ratio: 1 / 1;

            display: flex;
            align-items: center;
            justify-content: center;

            border-radius: 50%;

            background:
              radial-gradient(
                circle,
                #444b4f 0%,
                #30373b 72%,
                #1f2528 100%
              );

            border:
              3px solid #30383c;

            box-shadow:
              inset 0 0 0 8px
                rgba(255,255,255,.05),
              inset 0 0 0 14px
                rgba(0,0,0,.12),
              0 10px 0 #272d30,
              0 16px 22px
                rgba(0,0,0,.16);

            overflow: hidden;
          }

          .loginEmblem {
            width: 90%;
            height: 90%;

            display: block;

            object-fit: contain;
            object-position: center;

            user-select: none;
          }

          @media (max-width: 900px) {
            .loginCard {
              width: min(94vw, 760px);

              padding:
                76px
                34px
                40px;
            }

            .loginContent {
              grid-template-columns: 1fr;
              gap: 36px;
            }

            .loginRight {
              order: -1;
            }

            .emblemCircle {
              width: min(46vw, 260px);
            }

            .ownerName {
              font-size: 23px;
            }
          }

          @media (max-width: 560px) {
            .loginPage {
              padding:
                38px
                12px;
            }

            .loginCard {
              width: 92vw;
              min-height: auto;

              padding:
                66px
                18px
                28px;

              border-radius: 28px;
            }

            .loginCard::before {
              inset: 9px;
              border-radius: 21px;
            }

            .loginTab {
              top: -35px;

              min-width: 0;
              width: calc(100% - 44px);
              max-width: 330px;

              padding:
                12px
                18px
                11px;

              border-radius: 14px;

              font-size: 20px;
            }

            .loginContent {
              gap: 27px;
            }

            .emblemCircle {
              width: min(58vw, 220px);
            }

            .ownerName {
              padding:
                14px
                12px;

              font-size: 20px;
              line-height: 1.18;
            }

            .loginForm {
              gap: 20px;
            }

            .inputShell,
            .loginButton {
              min-height: 60px;
            }

            .loginInput {
              font-size: 17px;
            }

            .loginButton {
              font-size: 25px;
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
