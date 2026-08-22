"use client";

import { useEffect, useRef, useState } from "react";

type UserRole = "admin" | "user" | null;

export default function Home() {
  const [role, setRole] = useState<UserRole>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const clockRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);

  /* =========================================
     SOAT — OPTIMALLASHTIRILGAN

     Muhim: vaqt har soniyada React state orqali
     yangilanmaydi. Faqat soat va sana DOM matni
     o‘zgaradi. Shu sabab butun 3D sahifa har
     soniyada qayta render bo‘lmaydi.
  ========================================= */

  useEffect(() => {
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

    function updateClock() {
      const current = new Date();

      const timeText = `${String(current.getHours()).padStart(2, "0")}:${String(
        current.getMinutes()
      ).padStart(2, "0")}:${String(current.getSeconds()).padStart(2, "0")}`;

      const dateText = `${uzWeekdays[current.getDay()]}, ${current.getDate()}-${
        uzMonths[current.getMonth()]
      } ${current.getFullYear()}`;

      if (clockRef.current) {
        clockRef.current.textContent = timeText;
      }

      if (dateRef.current) {
        dateRef.current.textContent = dateText;
      }
    }

    updateClock();

    const timer = window.setInterval(updateClock, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  /* =========================================
     ADMIN / USER ROLINI ANIQLASH
  ========================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadRole() {
      try {
        const response = await fetch("/api/me", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        });

        if (response.status === 401) {
          window.location.replace("/login");
          return;
        }

        if (!response.ok) {
          throw new Error("Rolni aniqlab bo‘lmadi.");
        }

        const data = await response.json();

        if (cancelled) return;

        if (data.role === "admin") {
          setRole("admin");
        } else {
          setRole("user");
        }
      } catch (error) {
        console.error("ROLE LOAD ERROR:", error);

        if (!cancelled) {
          setRole("user");
        }
      } finally {
        if (!cancelled) {
          setRoleLoading(false);
        }
      }
    }

    loadRole();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =========================================
     CHIQISH
  ========================================= */

  async function logout() {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      window.location.replace("/login");
    }
  }

  /* =========================================
     BO‘LIMGA TUSHISH
  ========================================= */

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  /* =========================================
     TESTLARNI OCHISH
  ========================================= */

  function openTests() {
    window.location.href = "/test-entry";
  }

  return (
    <main className="page">
      {/* ================= HEADER ================= */}

      <header className="topPanel">
        <div className="namePlate">
          Qurbonov Siyovush Jamaliddinzoda
        </div>

        <nav className="navButtons">
          <button
            type="button"
            className="grayButton"
            onClick={() => scrollToSection("talabalar")}
          >
            Talabalar
          </button>

          <button
            type="button"
            className="grayButton"
            onClick={() => scrollToSection("abituriyent")}
          >
            Abituriyent
          </button>

          <button
            type="button"
            className="grayButton"
            onClick={() => scrollToSection("savoljavob")}
          >
            Savol-javob
          </button>

          <button
            type="button"
            className="grayButton"
            onClick={() => scrollToSection("qollanmalar")}
          >
            Qo‘llanmalar
          </button>

          {/* FAQAT ADMINDA KO‘RINADI */}

          {!roleLoading && role === "admin" && (
            <button
              type="button"
              className="adminButton"
              onClick={() => {
                window.location.href = "/admin";
              }}
            >
              Admin
            </button>
          )}

          <button
            type="button"
            className="logoutButton"
            onClick={logout}
          >
            Chiqish
          </button>
        </nav>
      </header>

      {/* ================= SOAT ================= */}

      <section className="clockSection">
        <div className="clockPanel">
          <div className="clockTopLabel">
            Huquqiy ta’lim platformasi
          </div>

          <div
            ref={clockRef}
            className="clockTime"
          >
            --:--:--
          </div>

          <div className="calendarBox">
            <div
              ref={dateRef}
              className="dateText"
            >
              Sana yuklanmoqda...
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
            <h2>Normativ-huquqiy hujjatlar</h2>

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
            <h2>Kazuslar</h2>

            <button
              type="button"
              className="openButton"
              onClick={() => {
                window.location.href =
                  "/talabalar/kazuslar";
              }}
            >
              Ochish
            </button>
          </article>

          <article className="card">
            <h2>Qo‘llanmalar</h2>

            <button
              type="button"
              className="openButton"
            >
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
            <h2>Testlar</h2>

            {!roleLoading && role === "admin" && (
              <div className="adminLabel">
                Administrator boshqaruvi
              </div>
            )}

            <button
              type="button"
              className="openButton testButton"
              onClick={openTests}
            >
              {!roleLoading && role === "admin"
                ? "Boshqarish"
                : "Ochish"}
            </button>
          </article>

          <article className="card">
            <h2>Qo‘llanmalar</h2>

            <button
              type="button"
              className="openButton"
            >
              Ochish
            </button>
          </article>

          <article className="card">
            <h2>Video darslar</h2>

            <button
              type="button"
              className="openButton"
            >
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
            <h2>Ko‘p beriladigan savollar</h2>

            <button
              type="button"
              className="openButton"
            >
              Ochish
            </button>
          </article>

          <article className="card">
            <h2>Savol yuborish</h2>

            <button
              type="button"
              className="openButton"
            >
              Ochish
            </button>
          </article>

          <article className="card">
            <h2>Sud qarorlari tahlili</h2>

            <button
              type="button"
              className="openButton"
            >
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
            <h2>Kodekslar</h2>

            <button
              type="button"
              className="openButton"
            >
              Ochish
            </button>
          </article>

          <article className="card">
            <h2>Qonun va qonunchilik hujjatlari</h2>

            <button
              type="button"
              className="openButton"
            >
              Ochish
            </button>
          </article>

          <article className="card">
            <h2>Darsliklar</h2>

            <button
              type="button"
              className="openButton"
            >
              Ochish
            </button>
          </article>

          <article className="card">
            <h2>English Vocabulary</h2>

            <div className="vocabularySubtitle">
              4000 Essential English Words
            </div>

            <button
              type="button"
              className="openButton testButton"
              onClick={() => {
                window.location.href =
                  "/qollanmalar/english-vocabulary";
              }}
            >
              Ochish
            </button>
          </article>
        </div>
      </section>

      {/* ================= FOOTER ================= */}

      <footer className="footerBlue">
        Qurbonov Siyovush Jamaliddinzodaning huquqiy ta’lim platformasi
      </footer>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          padding: 15px 18px 40px;

          background: linear-gradient(
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

        button {
          font-family: inherit;
        }

        /* ================= HEADER ================= */

        .topPanel {
          width: 100%;
          min-height: 145px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 28px;

          padding: 25px 32px;

          border: 3px solid #173e58;
          border-radius: 28px;

          background: linear-gradient(
            180deg,
            #8bd3ff 0%,
            #69b7e8 40%,
            #4999ce 100%
          );

          box-shadow:
            inset 0 7px 6px rgba(255, 255, 255, 0.75),
            inset 0 -8px 8px rgba(0, 0, 0, 0.18),
            0 7px 0 #173c55,
            0 12px 18px rgba(0, 0, 0, 0.22);
        }

        /* ================= ISM ================= */

        .namePlate {
          min-width: 440px;

          padding: 20px 27px;

          text-align: center;
          white-space: nowrap;

          color: #080808;

          font-size: 28px;
          font-weight: 700;

          border: 3px solid #42494e;
          border-radius: 16px;

          background: linear-gradient(
            180deg,
            #f7f7f7 0%,
            #dedede 30%,
            #b9b9b9 70%,
            #9f9f9f 100%
          );

          box-shadow:
            inset 0 6px 5px rgba(255, 255, 255, 0.95),
            inset 0 -6px 6px rgba(0, 0, 0, 0.2),
            0 5px 0 #4b5256,
            0 9px 11px rgba(0, 0, 0, 0.23);
        }

        /* ================= NAV ================= */

        .navButtons {
          display: flex;
          align-items: center;
          justify-content: flex-end;

          gap: 14px;
          flex-wrap: wrap;
        }

        .grayButton,
        .adminButton,
        .logoutButton {
          width: 155px;
          height: 62px;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 0 10px;

          border-radius: 14px;

          cursor: pointer;

          font-size: 16px;
          font-weight: 700;

          transition:
            transform 0.15s ease,
            filter 0.15s ease;
        }

        .grayButton {
          color: #111;

          border: 3px solid #464c50;

          background: linear-gradient(
            180deg,
            #f8f8f8 0%,
            #dedede 30%,
            #b8b8b8 70%,
            #999999 100%
          );

          box-shadow:
            inset 0 5px 5px rgba(255, 255, 255, 0.95),
            inset 0 -6px 6px rgba(0, 0, 0, 0.2),
            0 5px 0 #4b5256,
            0 8px 10px rgba(0, 0, 0, 0.22);
        }

        .adminButton {
          color: white;

          border: 3px solid #174461;

          background: linear-gradient(
            180deg,
            #9bd9ff 0%,
            #59a9d9 55%,
            #2d7eae 100%
          );

          box-shadow:
            inset 0 5px 5px rgba(255, 255, 255, 0.45),
            0 5px 0 #17415c,
            0 8px 10px rgba(0, 0, 0, 0.22);
        }

        .logoutButton {
          color: white;

          border: 3px solid #7c1515;

          background: linear-gradient(
            180deg,
            #ff8080 0%,
            #e54646 40%,
            #c32121 72%,
            #981313 100%
          );

          box-shadow:
            inset 0 5px 5px rgba(255, 255, 255, 0.45),
            0 5px 0 #761010,
            0 8px 10px rgba(0, 0, 0, 0.22);
        }

        .grayButton:hover,
        .adminButton:hover,
        .logoutButton:hover {
          filter: brightness(1.07);
          transform: translateY(-2px);
        }

        /* ================= SOAT ================= */

        .clockSection {
          width: 100%;

          padding: 55px 0 90px;

          display: flex;
          align-items: center;
          justify-content: center;
        }

        .clockPanel {
          position: relative;

          width: min(1400px, 95%);
          min-height: 500px;

          padding: 70px 50px 45px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          gap: 32px;

          border: 3px solid #303538;
          border-radius: 30px;

          background: linear-gradient(
            145deg,
            #686c6f 0%,
            #505457 45%,
            #363a3d 100%
          );

          box-shadow:
            inset 0 7px 6px rgba(255, 255, 255, 0.23),
            inset 0 -8px 8px rgba(0, 0, 0, 0.32),
            0 7px 0 #272b2e,
            0 15px 24px rgba(0, 0, 0, 0.3);
        }

        .clockTopLabel {
          position: absolute;

          top: -35px;
          left: 50%;

          transform: translateX(-50%);

          width: min(650px, 80%);
          min-height: 68px;

          padding: 10px 25px;

          display: flex;
          align-items: center;
          justify-content: center;

          text-align: center;

          color: #073b68;

          font-size: clamp(25px, 2.8vw, 38px);
          font-weight: 700;

          border: 3px solid #174461;
          border-radius: 17px;

          background: linear-gradient(
            180deg,
            #9bd9ff 0%,
            #73bdea 45%,
            #4e9ccc 100%
          );

          box-shadow:
            inset 0 6px 5px rgba(255, 255, 255, 0.75),
            inset 0 -6px 6px rgba(0, 0, 0, 0.16),
            0 5px 0 #17415c,
            0 9px 13px rgba(0, 0, 0, 0.25);
        }

        .clockTime {
          width: min(850px, 90%);
          min-height: 185px;

          padding: 25px 30px;

          display: flex;
          align-items: center;
          justify-content: center;

          text-align: center;

          color: #0c0c0c;

          font-size: clamp(65px, 8vw, 130px);
          font-weight: 700;
          letter-spacing: 8px;

          border: 4px solid #42494e;
          border-radius: 25px;

          background: linear-gradient(
            180deg,
            #f5f5f5 0%,
            #dddddd 30%,
            #b8b8b8 72%,
            #989898 100%
          );

          box-shadow:
            inset 0 8px 7px rgba(255, 255, 255, 0.96),
            inset 0 -8px 8px rgba(0, 0, 0, 0.22),
            0 7px 0 #4b5256,
            0 13px 18px rgba(0, 0, 0, 0.27);
        }

        .calendarBox {
          width: min(850px, 90%);
          min-height: 130px;

          padding: 20px 30px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 3px solid #174461;
          border-radius: 20px;

          background: linear-gradient(
            180deg,
            #a7deff 0%,
            #72bde9 55%,
            #4d9bcb 100%
          );

          box-shadow:
            inset 0 6px 5px rgba(255, 255, 255, 0.72),
            inset 0 -6px 6px rgba(0, 0, 0, 0.15),
            0 5px 0 #17415c,
            0 10px 14px rgba(0, 0, 0, 0.22);
        }

        .dateText {
          width: 100%;

          color: #073b68;

          text-align: center;

          font-size: clamp(26px, 3vw, 40px);
          font-weight: 700;
        }

        /* ================= BO‘LIM ================= */

        .mainSection {
          position: relative;

          width: min(1400px, 96%);
          min-height: 330px;

          margin: 0 auto 95px;

          padding: 65px 32px 45px;

          scroll-margin-top: 60px;

          border: 3px solid #303538;
          border-radius: 28px;

          background: linear-gradient(
            145deg,
            #686c6f 0%,
            #505457 45%,
            #363a3d 100%
          );

          box-shadow:
            inset 0 7px 6px rgba(255, 255, 255, 0.23),
            inset 0 -8px 8px rgba(0, 0, 0, 0.32),
            0 7px 0 #272b2e,
            0 15px 24px rgba(0, 0, 0, 0.3);
        }

        .sectionTitle {
          position: absolute;

          top: -35px;
          left: 50%;

          transform: translateX(-50%);

          width: 310px;
          height: 66px;

          display: flex;
          align-items: center;
          justify-content: center;

          text-align: center;

          color: #073b68;

          font-size: 28px;
          font-weight: 700;

          border: 3px solid #174461;
          border-radius: 15px;

          background: linear-gradient(
            180deg,
            #9bd9ff 0%,
            #73bdea 45%,
            #4e9ccc 100%
          );

          box-shadow:
            inset 0 6px 5px rgba(255, 255, 255, 0.75),
            inset 0 -6px 6px rgba(0, 0, 0, 0.16),
            0 5px 0 #17415c,
            0 9px 13px rgba(0, 0, 0, 0.25);
        }

        /* ================= KARTALAR ================= */

        .cards {
          display: grid;

          grid-template-columns:
            repeat(3, minmax(0, 1fr));

          gap: 30px;
        }

        .card {
          min-height: 230px;

          padding: 30px 22px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          text-align: center;

          border: 2px solid #3d4347;
          border-radius: 20px;

          background: linear-gradient(
            145deg,
            #e1e1e1 0%,
            #c5c5c5 50%,
            #a6a6a6 100%
          );

          box-shadow:
            inset 0 6px 5px rgba(255, 255, 255, 0.86),
            inset 0 -7px 7px rgba(0, 0, 0, 0.18),
            0 6px 0 #4a5054,
            0 11px 16px rgba(0, 0, 0, 0.25);
        }

        .card h2 {
          flex: 1;

          display: flex;
          align-items: center;
          justify-content: center;

          margin: 10px 0 28px;

          color: #111;

          font-size: clamp(22px, 2vw, 28px);
        }

        .adminLabel {
          margin: -15px 0 18px;

          padding: 7px 14px;

          color: #125a32;

          font-size: 14px;
          font-weight: 700;

          border: 1px solid #2d8450;
          border-radius: 8px;

          background: #d8f1df;
        }

        .vocabularySubtitle {
          margin: -18px 0 22px;

          color: #173e58;

          font-size: 16px;
          font-weight: 700;
        }

        /* ================= TUGMALAR ================= */

        .openButton {
          width: 165px;
          height: 48px;

          border: 2px solid #4e565b;
          border-radius: 9px;

          cursor: pointer;

          color: #111;

          font-size: 17px;
          font-weight: 700;

          background: linear-gradient(
            180deg,
            #f8f8f8 0%,
            #bdbdbd 100%
          );

          box-shadow:
            inset 0 4px 4px white,
            0 4px 0 #555d61;

          transition:
            transform 0.15s ease,
            filter 0.15s ease;
        }

        .openButton:hover {
          filter: brightness(1.06);
          transform: translateY(-2px);
        }

        .openButton:active {
          transform: translateY(2px);
        }

        .testButton {
          color: #073b68;

          border-color: #174461;

          background: linear-gradient(
            180deg,
            #b8ecff 0%,
            #58a8d7 100%
          );

          box-shadow:
            inset 0 4px 4px rgba(255, 255, 255, 0.8),
            0 4px 0 #17415c;
        }

        /* ================= FOOTER ================= */

        .footerBlue {
          width: min(1400px, 96%);
          min-height: 100px;

          margin: 10px auto;

          padding: 20px 30px;

          display: flex;
          align-items: center;
          justify-content: center;

          text-align: center;

          color: #073b68;

          font-size: clamp(24px, 2.7vw, 35px);
          font-weight: 700;

          border: 3px solid #17425e;
          border-radius: 20px;

          background: linear-gradient(
            180deg,
            #91d5ff 0%,
            #67b7e8 50%,
            #4998cd 100%
          );

          box-shadow:
            inset 0 6px 5px rgba(255, 255, 255, 0.72),
            inset 0 -7px 7px rgba(0, 0, 0, 0.17),
            0 6px 0 #16415b,
            0 12px 17px rgba(0, 0, 0, 0.22);
        }

        /* ================= RESPONSIVE ================= */

        @media (max-width: 1350px) {
          .topPanel {
            flex-direction: column;
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
          .cards {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .page {
            padding: 10px;
          }

          .topPanel {
            padding: 20px 15px;
          }

          .namePlate {
            width: 100%;
            min-width: 0;

            white-space: normal;

            font-size: 21px;
          }

          .navButtons {
            width: 100%;

            display: grid;

            grid-template-columns: 1fr 1fr;
          }

          .grayButton,
          .adminButton,
          .logoutButton {
            width: 100%;
          }

          .clockPanel {
            width: 97%;

            padding: 70px 15px 30px;
          }

          .clockTopLabel {
            width: 90%;
            font-size: 23px;
          }

          .clockTime {
            width: 96%;
            min-height: 130px;

            font-size: 50px;

            letter-spacing: 2px;
          }

          .calendarBox {
            width: 96%;
            min-height: 110px;
          }

          .dateText {
            font-size: 22px;
          }

          .mainSection {
            width: 97%;

            padding: 60px 18px 35px;
          }

          .sectionTitle {
            width: 88%;

            font-size: 23px;
          }

          .footerBlue {
            width: 97%;

            font-size: 22px;
          }
        }

        @media (max-width: 450px) {
          .navButtons {
            grid-template-columns: 1fr;
          }

          .clockTime {
            font-size: 42px;
            letter-spacing: 1px;
          }
        }
      `}</style>
    </main>
  );
}
