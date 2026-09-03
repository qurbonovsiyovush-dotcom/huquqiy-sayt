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

  /* =====================================================
     SOAT VA SANA
  ===================================================== */

  const [now, setNow] =
    useState(new Date());

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

    const timer =
      setInterval(() => {
        setNow(new Date());
      }, 1000);

    return () =>
      clearInterval(timer);
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
     SANA
  ===================================================== */

  const days = [
    "Yakshanba",
    "Dushanba",
    "Seshanba",
    "Chorshanba",
    "Payshanba",
    "Juma",
    "Shanba",
  ];

  const months = [
    "yanvar",
    "fevral",
    "mart",
    "aprel",
    "may",
    "iyun",
    "iyul",
    "avgust",
    "sentabr",
    "oktabr",
    "noyabr",
    "dekabr",
  ];

  const timeText =
    now.toLocaleTimeString(
      "uz-UZ",
      {
        hour12: false,
      }
    );

  const dateText =
    `${days[now.getDay()]}, ` +
    `${now.getDate()}-${months[now.getMonth()]} ` +
    `${now.getFullYear()}`;

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

          <div className="loginFloatingTitle">
            Maxsus kirish
          </div>

          <div className="loginMetalOuter">

            <div className="loginMetalInner">
              Qurbonov Siyovush
              Jamaliddinzoda
            </div>

          </div>

          <form
            onSubmit={handleLogin}
            className="loginForm"
          >

            <div className="loginField">

              <label>
                Maxsus kirish kodi
              </label>

              <div className="loginInputWrapper">

                <span className="loginIcon">
                  🔐
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
                      e.target.value
                        .toUpperCase()
                    );

                    setLoginError("");
                  }}
                />

              </div>

            </div>

            {loginError && (
              <div className="loginError">
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

          <div className="loginInfo">
            Platformaga faqat
            administrator tomonidan
            berilgan maxsus kod orqali
            kirish mumkin.
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
            justify-content: center;
            align-items: center;

            padding:
              70px
              20px
              50px;

            background: #ffffff;

            font-family:
              "Bell MT",
              "Times New Roman",
              serif;
          }

          .loginCard {
            width: 100%;
            max-width: 610px;

            position: relative;

            padding:
              72px
              30px
              34px;

            border:
              2px solid #252b2f;

            border-radius: 25px;

            background:
              linear-gradient(
                180deg,
                #6c7174 0%,
                #555b5e 44%,
                #42484b 100%
              );

            box-shadow:
              inset 0 4px 3px
                rgba(255,255,255,.34),

              inset 0 -5px 8px
                rgba(0,0,0,.24),

              0 9px 0 #242a2d,

              0 16px 28px
                rgba(0,0,0,.28);
          }

          .loginCard::before {
            content: "";

            position: absolute;
            inset: 10px;

            border:
              1px solid
              rgba(255,255,255,.30);

            border-radius: 18px;

            pointer-events: none;
          }

          .loginFloatingTitle {
            position: absolute;

            top: -31px;
            left: 50%;

            transform:
              translateX(-50%);

            min-width: 270px;

            padding:
              13px
              28px;

            text-align: center;

            color: #0b3654;

            font-size: 24px;
            font-weight: 900;

            letter-spacing: .2px;

            border:
              2px solid #1b566f;

            border-radius: 12px;

            background:
              linear-gradient(
                180deg,
                #aee7ff 0%,
                #66c8f1 42%,
                #2da7df 72%,
                #1684bb 100%
              );

            box-shadow:
              inset 0 4px 3px
                rgba(255,255,255,.72),

              0 6px 0 #245a72,

              0 9px 15px
                rgba(0,0,0,.24);

            z-index: 5;
          }

          .loginMetalOuter {
            position: relative;
            z-index: 1;

            padding: 5px;

            margin-bottom: 28px;

            border-radius: 16px;

            background:
              linear-gradient(
                180deg,
                #f7f7f7 0%,
                #c9c9c9 38%,
                #8d8d8d 75%,
                #4d4d4d 100%
              );

            border:
              1px solid #202020;

            box-shadow:
              0 6px 0 #2e3437,
              0 10px 16px
                rgba(0,0,0,.30);
          }

          .loginMetalInner {
            min-height: 90px;

            display: flex;
            justify-content: center;
            align-items: center;

            padding:
              14px
              20px;

            text-align: center;

            border-radius: 12px;

            background:
              linear-gradient(
                180deg,
                #ffffff 0%,
                #eeeeee 38%,
                #d0d0d0 100%
              );

            border:
              1px solid #757575;

            box-shadow:
              inset 0 3px 3px
                rgba(255,255,255,.90),

              inset 0 -2px 3px
                rgba(0,0,0,.12);

            color: #111;

            font-size: 25px;
            line-height: 1.05;
            font-weight: 900;

            text-shadow:
              0 1px 0 #ffffff;
          }

          .loginForm {
            position: relative;
            z-index: 1;

            display: flex;
            flex-direction: column;

            gap: 14px;
          }

          .loginField {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .loginField label {
            text-align: center;

            color: #111;

            font-size: 19px;
            font-weight: 900;

            text-shadow:
              0 1px 0
              rgba(255,255,255,.70);
          }

          .loginInputWrapper {
            height: 56px;

            display: flex;
            align-items: center;

            padding:
              0
              14px;

            border:
              2px solid #28607a;

            border-radius: 11px;

            background:
              linear-gradient(
                180deg,
                #ffffff 0%,
                #f4f4f4 55%,
                #d8d8d8 100%
              );

            box-shadow:
              inset 0 3px 3px
                rgba(255,255,255,.95),

              0 4px 0 #5b676d,

              0 7px 12px
                rgba(0,0,0,.20);
          }

          .loginIcon {
            margin-right: 10px;

            font-size: 19px;
          }

          .loginInput {
            flex: 1;
            min-width: 0;

            border: 0;
            outline: 0;

            background: transparent;

            color: #111;

            font-family:
              "Bell MT",
              "Times New Roman",
              serif;

            font-size: 18px;
            font-weight: 700;
          }

          .loginInput::placeholder {
            color: #727272;
            opacity: 1;
          }

          .loginError {
            padding:
              10px
              12px;

            border:
              1px solid #9f2525;

            border-radius: 8px;

            background: #ffeaea;

            color: #8a1717;

            text-align: center;
            font-weight: 800;
          }

          .loginButton {
            min-height: 58px;

            margin-top: 3px;

            border:
              2px solid #1b5670;

            border-radius: 11px;

            background:
              linear-gradient(
                180deg,
                #aee8ff 0%,
                #61c9f3 40%,
                #1ba7e2 74%,
                #0f83b9 100%
              );

            box-shadow:
              inset 0 4px 3px
                rgba(255,255,255,.72),

              0 6px 0 #1d566f,

              0 9px 14px
                rgba(0,0,0,.24);

            color: #11384f;

            font-family:
              "Bell MT",
              "Times New Roman",
              serif;

            font-size: 24px;
            font-weight: 900;

            cursor: pointer;
          }

          .loginButton:active {
            transform:
              translateY(3px);

            box-shadow:
              inset 0 3px 3px
                rgba(255,255,255,.55),

              0 3px 0 #1d566f,

              0 5px 9px
                rgba(0,0,0,.22);
          }

          .loginButton:disabled {
            opacity: .65;
            cursor: wait;
          }

          .loginInfo {
            position: relative;
            z-index: 1;

            margin-top: 28px;

            min-height: 58px;

            display: flex;
            align-items: center;
            justify-content: center;

            padding:
              10px
              16px;

            border:
              1px solid #8a8a8a;

            border-radius: 10px;

            background:
              linear-gradient(
                180deg,
                #ffffff 0%,
                #f1f1f1 55%,
                #d6d6d6 100%
              );

            box-shadow:
              inset 0 3px 3px
                rgba(255,255,255,.92),

              0 5px 0 #626b70,

              0 8px 12px
                rgba(0,0,0,.18);

            color: #474747;

            text-align: center;

            font-size: 13px;
            line-height: 1.25;
            font-weight: 700;
          }

          @media (max-width: 650px) {
            .loginPage {
              padding:
                60px
                12px
                30px;
            }

            .loginCard {
              max-width: 390px;

              padding:
                62px
                16px
                25px;

              border-radius: 22px;
            }

            .loginFloatingTitle {
              min-width: 230px;

              padding:
                11px
                20px;

              font-size: 20px;
            }

            .loginMetalInner {
              min-height: 78px;

              font-size: 21px;
            }

            .loginField label {
              font-size: 17px;
            }

            .loginInputWrapper {
              height: 52px;
            }

            .loginInput {
              font-size: 16px;
            }

            .loginButton {
              min-height: 54px;
              font-size: 21px;
            }

            .loginInfo {
              margin-top: 24px;
              font-size: 12px;
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

          <a
            href="#qollanmalar"
            className="menuButton"
          >
            Qo‘llanmalar
          </a>

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
          SOAT VA SANA
      ================================================= */}

      <section className="clockSection">

        <div className="sectionTitle">
          Huquqiy ta’lim platformasi
        </div>

        <div className="clockBox">
          {timeText}
        </div>

        <div className="dateBox">
          {dateText}
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

            <button className="openButton">
              Ochish
            </button>
          </article>

          <article className="card">
            <h2>
              Qonun va qonunchilik
              hujjatlari
            </h2>

            <button className="openButton">
              Ochish
            </button>
          </article>

          <article className="card">
            <h2>Darsliklar</h2>

            <button className="openButton">
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

          width:
            min(1200px, 95%);

          margin:
            90px
            auto
            70px;

          padding:
            75px
            38px
            45px;

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
           SOAT
        =========================== */

        .clockBox {
          min-height: 170px;

          display: flex;

          align-items: center;

          justify-content: center;

          margin-bottom: 30px;

          border:
            2px solid #444b4f;

          border-radius: 20px;

          background:
            linear-gradient(
              #f0f0f0,
              #c3c3c3
            );

          box-shadow:
            inset 0 6px 5px
              rgba(255,255,255,.9),

            0 7px 0 #4a5054;

          font-size:
            clamp(
              55px,
              9vw,
              95px
            );

          font-weight: 700;

          letter-spacing: 4px;
        }

        .dateBox {
          min-height: 105px;

          display: flex;

          align-items: center;

          justify-content: center;

          padding: 20px;

          text-align: center;

          color: #073b68;

          border:
            3px solid #174461;

          border-radius: 16px;

          background:
            linear-gradient(
              #9bd9ff,
              #59a9d8
            );

          box-shadow:
            inset 0 6px 5px
              rgba(255,255,255,.75),

            0 6px 0 #17415c;

          font-size:
            clamp(
              24px,
              4vw,
              37px
            );

          font-weight: 700;
        }


        /* ===========================
           CARDS
        =========================== */

        .cards {
          display: grid;

          grid-template-columns:
            repeat(
              3,
              1fr
            );

          gap: 30px;
        }

        .card {
          min-height: 235px;

          padding: 30px;

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
          width:
            min(1200px, 95%);

          margin:
            80px
            auto
            20px;

          padding: 30px;

          text-align: center;

          color: #073b68;

          font-size: 23px;

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

      `}</style>

    </main>
  );
}
