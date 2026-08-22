"use client";

import { useEffect, useRef, useState } from "react";
import "./page.module.css";

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

      
    </main>
  );
}
