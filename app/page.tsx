"use client";

import { useEffect, useState } from "react";
import "./home.css";

type UserRole = "admin" | "user" | null;

export default function Home() {
  const [role, setRole] = useState<UserRole>(null);
  const [roleLoading, setRoleLoading] = useState(true);

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

  /* =========================================
     QO‘LLANMALARNI OCHISH
  ========================================= */

  function openGuides() {
    window.location.href = "/qollanmalar";
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
            onClick={openGuides}
          >
            Qo‘llanmalar
          </button>

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

      {/* ================= GERB ================= */}

      <section className="clockSection">
        <div className="clockPanel">
          <div className="clockTopLabel">
            Huquqiy ta’lim platformasi
          </div>

          <div className="emblemArea">
            <div className="emblem3D">
              <div className="emblemInner">
                <img
                  src="/gerb.png"
                  alt="O‘zbekiston Respublikasi Davlat gerbi"
                  className="emblemImage"
                  draggable={false}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= TALABALAR ================= */}

      <section id="talabalar" className="mainSection">
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
              onClick={openGuides}
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
              onClick={openGuides}
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
            <h2>
              Ko‘p beriladigan savollar
            </h2>

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
            <h2>
              Sud qarorlari tahlili
            </h2>

            <button
              type="button"
              className="openButton"
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
