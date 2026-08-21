"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  async function logout() {
    try {
      await fetch("/api/logout", {
        method: "POST",
      });
    } finally {
      window.location.replace("/login");
    }
  }

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  const uzMonths = [
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

  const uzWeekdays = [
    "Yakshanba",
    "Dushanba",
    "Seshanba",
    "Chorshanba",
    "Payshanba",
    "Juma",
    "Shanba",
  ];

  const timeText = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

  const dateText = `${uzWeekdays[now.getDay()]}, ${now.getDate()}-${
    uzMonths[now.getMonth()]
  } ${now.getFullYear()}`;

  return (
    <main className="page">

      {/* ================= YUQORI PANEL ================= */}

      <header className="topPanel">

        <div className="namePlate">
          Qurbonov Siyovush Jamaliddinzoda
        </div>

        <nav className="navButtons">

          <button
            className="grayButton"
            onClick={() => scrollToSection("talabalar")}
          >
            Talabalar
          </button>

          <button
            className="grayButton"
            onClick={() => scrollToSection("abituriyent")}
          >
            Abituriyent
          </button>

          <button
            className="grayButton"
            onClick={() => scrollToSection("savoljavob")}
          >
            Savol-javob
          </button>

          <button
            className="grayButton"
            onClick={() => scrollToSection("qollanmalar")}
          >
            Qo‘llanmalar
          </button>

          <button
            className="grayButton"
            onClick={() => window.location.href = "/admin/requests"}
          >
            Admin
          </button>

          <button
            className="logoutButton"
            onClick={logout}
          >
            Chiqish
          </button>

        </nav>

      </header>

      {/* ================= SOAT VA SANA ================= */}

      <section className="clockSection">

        <div className="clockPanel">

          <div className="clockTopLabel">
            Huquqiy ta’lim platformasi
          </div>

          <div className="clockTime">
            {timeText}
          </div>

          {/* FAQAT KICHIK 18 KALENDAR OLIB TASHLANDI */}

          <div className="calendarBox">

            <div className="dateText">
              {dateText}
            </div>

          </div>

        </div>

      </section>

      {/* ================= TALABALAR ================= */}

      <section
        id="talabalar"
        className="mainSection"
      >

        <div className="sectionTitle">
          Talabalar
        </div>

        <div className="cards">

          <article className="card">

            <h2>
              Normativ-huquqiy hujjatlar
            </h2>

            <button
              type="button"
              className="openButton"
              onClick={() => {
                window.open(
                  "https://lex.uz",
                  "_blank",
                  "noopener,noreferrer"
                );
              }}
            >
              Ochish
            </button>

          </article>

          <article className="card">

            <h2>
              Kazuslar
            </h2>

            <button
              className="openButton"
              onClick={() => window.location.href = "/talabalar/kazuslar"}
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

      {/* ================= ABITURIYENT ================= */}

      <section
        id="abituriyent"
        className="mainSection"
      >

        <div className="sectionTitle">
          Abituriyent
        </div>

        <div className="cards">

          <article className="card">

            <h2>
              Testlar
            </h2>

            <button className="openButton">
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

          <article className="card">

            <h2>
              Video darslar
            </h2>

            <button className="openButton">
              Ochish
            </button>

          </article>

        </div>

      </section>

      {/* ================= SAVOL-JAVOB ================= */}

      <section
        id="savoljavob"
        className="mainSection"
      >

        <div className="sectionTitle">
          Savol-javob
        </div>

        <div className="cards">

          <article className="card">

            <h2>
              Ko‘p beriladigan savollar
            </h2>

            <button className="openButton">
              Ochish
            </button>

          </article>

          <article className="card">

            <h2>
              Savol yuborish
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

      {/* ================= QO‘LLANMALAR ================= */}

      <section
        id="qollanmalar"
        className="mainSection"
      >

        <div className="sectionTitle">
          Qo‘llanmalar
        </div>

        <div className="cards">

          <article className="card">

            <h2>
              Kodekslar
            </h2>

            <button className="openButton">
              Ochish
            </button>

          </article>

          <article className="card">

            <h2>
              Qonun va qonunchilik hujjatlari
            </h2>

            <button className="openButton">
              Ochish
            </button>

          </article>

          <article className="card">

            <h2>
              Darsliklar
            </h2>

            <button className="openButton">
              Ochish
            </button>

          </article>

        </div>

      </section>

      {/* ================= OXIRGI PANEL ================= */}

      <footer className="footerBlue">
        Qurbonov Siyovush Jamaliddinzodaning huquqiy ta’lim platformasi
      </footer>

      <style jsx>{`

        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;

          padding:
            15px
            18px
            40px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #f3f5f6 55%,
              #e5e8ea 100%
            );

          color: #111;

          font-family:
            "Bell MT",
            "Times New Roman",
            serif;
        }

        /* ================= HEADER ================= */

        .topPanel {
          width: 100%;
          min-height: 145px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 28px;

          padding:
            25px
            32px;

          border:
            3px solid #173e58;

          border-radius: 28px;

          background:
            linear-gradient(
              180deg,
              #8bd3ff 0%,
              #69b7e8 40%,
              #4999ce 100%
            );

          box-shadow:
            inset 0 7px 6px rgba(255,255,255,.75),
            inset 0 -8px 8px rgba(0,0,0,.18),
            0 7px 0 #173c55,
            0 12px 18px rgba(0,0,0,.22);
        }

        /* ================= ISM ================= */

        .namePlate {
          min-width: 440px;

          padding:
            20px
            27px;

          text-align: center;
          white-space: nowrap;

          color: #080808;

          font-size: 28px;
          font-weight: 700;

          border:
            3px solid #42494e;

          border-radius: 16px;

          background:
            linear-gradient(
              180deg,
              #f7f7f7 0%,
              #dedede 30%,
              #b9b9b9 70%,
              #9f9f9f 100%
            );

          box-shadow:
            inset 0 6px 5px rgba(255,255,255,.95),
            inset 0 -6px 6px rgba(0,0,0,.20),
            0 5px 0 #4b5256,
            0 9px 11px rgba(0,0,0,.23);
        }

        /* ================= NAVIGATION ================= */

        .navButtons {
          display: flex;
          align-items: center;
          justify-content: flex-end;

          gap: 14px;

          flex-wrap: wrap;
        }

        .grayButton,
        .logoutButton {
          width: 155px;
          height: 62px;

          display: flex;
          align-items: center;
          justify-content: center;

          padding:
            0
            10px;

          border-radius: 14px;

          cursor: pointer;

          font-family: inherit;
          font-size: 16px;
          font-weight: 700;
        }

        .grayButton {
          color: #111;

          border:
            3px solid #464c50;

          background:
            linear-gradient(
              180deg,
              #f8f8f8 0%,
              #dedede 30%,
              #b8b8b8 70%,
              #999999 100%
            );

          box-shadow:
            inset 0 5px 5px rgba(255,255,255,.95),
            inset 0 -6px 6px rgba(0,0,0,.20),
            0 5px 0 #4b5256,
            0 8px 10px rgba(0,0,0,.22);
        }

        .grayButton:hover {
          filter: brightness(1.07);
          transform: translateY(-2px);
        }

        /* ================= CHIQISH ================= */

        .logoutButton {
          color: white;

          border:
            3px solid #7c1515;

          background:
            linear-gradient(
              180deg,
              #ff8080 0%,
              #e54646 40%,
              #c32121 72%,
              #981313 100%
            );

          box-shadow:
            inset 0 5px 5px rgba(255,255,255,.45),
            0 5px 0 #761010,
            0 8px 10px rgba(0,0,0,.22);

          text-shadow:
            0 2px 2px rgba(0,0,0,.45);
        }

        /* ================= SOAT BO‘LIMI ================= */

        .clockSection {
          width: 100%;

          padding:
            55px
            0
            90px;

          display: flex;
          align-items: center;
          justify-content: center;
        }

        .clockPanel {
          position: relative;

          width:
            min(
              1400px,
              95%
            );

          min-height: 500px;

          padding:
            70px
            50px
            45px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          gap: 32px;

          border:
            3px solid #303538;

          border-radius: 30px;

          background:
            linear-gradient(
              145deg,
              #686c6f 0%,
              #505457 45%,
              #363a3d 100%
            );

          box-shadow:
            inset 0 7px 6px rgba(255,255,255,.23),
            inset 0 -8px 8px rgba(0,0,0,.32),
            0 7px 0 #272b2e,
            0 15px 24px rgba(0,0,0,.30);
        }

        /* ================= SOAT PANEL NOMI ================= */

        .clockTopLabel {
          position: absolute;

          top: -35px;
          left: 50%;

          transform:
            translateX(-50%);

          width:
            min(
              650px,
              80%
            );

          min-height: 68px;

          padding:
            10px
            25px;

          display: flex;
          align-items: center;
          justify-content: center;

          text-align: center;

          color: #073b68;

          font-size:
            clamp(
              25px,
              2.8vw,
              38px
            );

          font-weight: 700;

          border:
            3px solid #174461;

          border-radius: 17px;

          background:
            linear-gradient(
              180deg,
              #9bd9ff 0%,
              #73bdea 45%,
              #4e9ccc 100%
            );

          box-shadow:
            inset 0 6px 5px rgba(255,255,255,.75),
            inset 0 -6px 6px rgba(0,0,0,.16),
            0 5px 0 #17415c,
            0 9px 13px rgba(0,0,0,.25);

          text-shadow:
            0 2px 0 rgba(255,255,255,.75);
        }

        /* ================= SOAT ================= */

        .clockTime {
          width:
            min(
              850px,
              90%
            );

          min-height: 185px;

          padding:
            25px
            30px;

          display: flex;
          align-items: center;
          justify-content: center;

          text-align: center;

          color: #0c0c0c;

          font-size:
            clamp(
              65px,
              8vw,
              130px
            );

          font-weight: 700;

          letter-spacing: 8px;

          border:
            4px solid #42494e;

          border-radius: 25px;

          background:
            linear-gradient(
              180deg,
              #f5f5f5 0%,
              #dddddd 30%,
              #b8b8b8 72%,
              #989898 100%
            );

          box-shadow:
            inset 0 8px 7px rgba(255,255,255,.96),
            inset 0 -8px 8px rgba(0,0,0,.22),
            0 7px 0 #4b5256,
            0 13px 18px rgba(0,0,0,.27);

          text-shadow:
            0 2px 0 white,
            0 4px 5px rgba(0,0,0,.18);
        }

        /* ================= SANA ================= */

        .calendarBox {
          width:
            min(
              850px,
              90%
            );

          min-height: 130px;

          padding:
            20px
            30px;

          display: flex;
          align-items: center;
          justify-content: center;

          border:
            3px solid #174461;

          border-radius: 20px;

          background:
            linear-gradient(
              180deg,
              #a7deff 0%,
              #72bde9 55%,
              #4d9bcb 100%
            );

          box-shadow:
            inset 0 6px 5px rgba(255,255,255,.72),
            inset 0 -6px 6px rgba(0,0,0,.15),
            0 5px 0 #17415c,
            0 10px 14px rgba(0,0,0,.22);
        }

        .dateText {
          width: 100%;

          color: #073b68;

          text-align: center;

          font-size:
            clamp(
              26px,
              3vw,
              40px
            );

          font-weight: 700;

          text-shadow:
            0 2px 0 rgba(255,255,255,.65);
        }

        /* ================= ASOSIY BO‘LIM ================= */

        .mainSection {
          position: relative;

          width:
            min(
              1400px,
              96%
            );

          min-height: 330px;

          margin:
            0 auto
            95px;

          padding:
            65px
            32px
            45px;

          scroll-margin-top: 60px;

          border:
            3px solid #303538;

          border-radius: 28px;

          background:
            linear-gradient(
              145deg,
              #686c6f 0%,
              #505457 45%,
              #363a3d 100%
            );

          box-shadow:
            inset 0 7px 6px rgba(255,255,255,.23),
            inset 0 -8px 8px rgba(0,0,0,.32),
            0 7px 0 #272b2e,
            0 15px 24px rgba(0,0,0,.30);
        }

        /* ================= BO‘LIM NOMI ================= */

        .sectionTitle {
          position: absolute;

          top: -35px;
          left: 50%;

          transform:
            translateX(-50%);

          width: 310px;
          height: 66px;

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
              180deg,
              #9bd9ff 0%,
              #73bdea 45%,
              #4e9ccc 100%
            );

          box-shadow:
            inset 0 6px 5px rgba(255,255,255,.75),
            inset 0 -6px 6px rgba(0,0,0,.16),
            0 5px 0 #17415c,
            0 9px 13px rgba(0,0,0,.25);
        }

        /* ================= KARTOCHKALAR ================= */

        .cards {
          display: grid;

          grid-template-columns:
            repeat(
              3,
              minmax(
                0,
                1fr
              )
            );

          gap: 30px;
        }

        .card {
          min-height: 230px;

          padding:
            30px
            22px;

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
              145deg,
              #e1e1e1 0%,
              #c5c5c5 50%,
              #a6a6a6 100%
            );

          box-shadow:
            inset 0 6px 5px rgba(255,255,255,.86),
            inset 0 -7px 7px rgba(0,0,0,.18),
            0 6px 0 #4a5054,
            0 11px 16px rgba(0,0,0,.25);
        }

        .card h2 {
          flex: 1;

          display: flex;
          align-items: center;
          justify-content: center;

          margin:
            10px
            0
            28px;

          color: #111;

          font-size:
            clamp(
              22px,
              2vw,
              28px
            );
        }

        /* ================= OCHISH ================= */

        .openButton {
          width: 165px;
          height: 48px;

          border:
            2px solid #4e565b;

          border-radius: 9px;

          cursor: pointer;

          color: #111;

          font-family: inherit;
          font-size: 17px;
          font-weight: 700;

          background:
            linear-gradient(
              180deg,
              #f8f8f8 0%,
              #bdbdbd 100%
            );

          box-shadow:
            inset 0 4px 4px white,
            0 4px 0 #555d61;
        }

        /* ================= FOOTER ================= */

        .footerBlue {
          width:
            min(
              1400px,
              96%
            );

          min-height: 100px;

          margin:
            10px
            auto;

          padding:
            20px
            30px;

          display: flex;
          align-items: center;
          justify-content: center;

          text-align: center;

          color: #073b68;

          font-size:
            clamp(
              24px,
              2.7vw,
              35px
            );

          font-weight: 700;

          border:
            3px solid #17425e;

          border-radius: 20px;

          background:
            linear-gradient(
              180deg,
              #91d5ff 0%,
              #67b7e8 50%,
              #4998cd 100%
            );

          box-shadow:
            inset 0 6px 5px rgba(255,255,255,.72),
            inset 0 -7px 7px rgba(0,0,0,.17),
            0 6px 0 #16415b,
            0 12px 17px rgba(0,0,0,.22);
        }

        /* ================= RESPONSIVE ================= */

        @media (max-width: 1350px) {
          .topPanel {
            flex-direction: column;
            min-height: auto;
          }

          .namePlate {
            width: 100%;
            min-width: 0;
          }

          .navButtons {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 950px) {
          .page {
            padding: 12px;
          }

          .topPanel {
            padding: 18px;
            gap: 16px;
          }

          .namePlate {
            white-space: normal;
          }

          .navButtons {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px;
          }

          .grayButton,
          .logoutButton {
            width: 100%;
          }

          .clockSection {
            padding: 45px 0 60px;
          }

          .clockPanel {
            min-height: 360px;
            padding: 60px 24px 28px;
            gap: 22px;
          }

          .cards {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 18px;
          }

          .mainSection {
            min-height: auto;
            margin-bottom: 70px;
            padding: 58px 22px 28px;
          }

          .card {
            min-height: 170px;
            padding: 20px 14px;
          }

          .card h2 {
            margin: 6px 0 18px;
          }
        }

        @media (max-width: 700px) {
          .page {
            padding: 8px 6px 28px;
          }

          .topPanel {
            min-height: auto;
            padding: 12px 10px;
            gap: 12px;
            border-radius: 18px;
          }

          .namePlate {
            width: 100%;
            min-width: 0;
            padding: 12px 10px;
            white-space: normal;
            font-size: 18px;
            line-height: 1.25;
            border-radius: 12px;
          }

          .navButtons {
            width: 100%;
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 7px;
          }

          .grayButton,
          .logoutButton {
            width: 100%;
            height: 43px;
            padding: 0 5px;
            border-width: 2px;
            border-radius: 9px;
            font-size: 13px;
          }

          .clockSection {
            padding: 32px 0 46px;
          }

          .clockPanel {
            width: 98%;
            min-height: 275px;
            padding: 48px 10px 18px;
            gap: 14px;
            border-radius: 19px;
          }

          .clockTopLabel {
            top: -25px;
            width: 88%;
            min-height: 48px;
            padding: 6px 12px;
            font-size: 18px;
            border-radius: 11px;
          }

          .clockTime {
            width: 96%;
            min-height: 86px;
            padding: 12px 8px;
            font-size: clamp(38px, 13vw, 54px);
            letter-spacing: 1px;
            border-width: 3px;
            border-radius: 16px;
          }

          .calendarBox {
            width: 96%;
            min-height: 68px;
            padding: 10px 8px;
            border-radius: 13px;
          }

          .dateText {
            font-size: 17px;
            line-height: 1.25;
          }

          .mainSection {
            width: 98%;
            min-height: auto;
            margin: 0 auto 54px;
            padding: 48px 9px 17px;
            border-radius: 19px;
          }

          .sectionTitle {
            top: -25px;
            width: 76%;
            height: 48px;
            font-size: 19px;
            border-radius: 11px;
          }

          .cards {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 9px;
          }

          .card {
            min-height: 118px;
            padding: 12px 7px;
            border-radius: 13px;
          }

          .card h2 {
            margin: 2px 0 10px;
            font-size: 15px;
            line-height: 1.15;
          }

          .openButton {
            width: min(112px, 92%);
            height: 38px;
            font-size: 14px;
            border-radius: 7px;
          }

          .footerBlue {
            width: 98%;
            min-height: 68px;
            margin-top: 0;
            padding: 12px 10px;
            font-size: 17px;
            line-height: 1.25;
            border-radius: 14px;
          }
        }

        @media (max-width: 420px) {
          .navButtons {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .clockTime {
            font-size: clamp(34px, 12vw, 46px);
          }

          .card h2 {
            font-size: 14px;
          }

          .openButton {
            width: min(105px, 94%);
          }
        }

      `}</style>

    </main>
  );
}
