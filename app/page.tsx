"use client";

import { useEffect, useState } from "react";
import "./home.css";

type UserRole = "admin" | "user" | null;

type ActiveSection =
  | "talabalar"
  | "abituriyent"
  | "savoljavob"
  | null;

export default function Home() {
  const [role, setRole] =
    useState<UserRole>(null);

  const [roleLoading, setRoleLoading] =
    useState(true);

  const [activeSection, setActiveSection] =
    useState<ActiveSection>(null);

  /* =========================================
     ADMIN / USER ROLINI ANIQLASH
  ========================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadRole() {
      try {
        const response = await fetch(
          "/api/me",
          {
            method: "GET",
            cache: "no-store",
            credentials: "include",
          }
        );

        if (response.status === 401) {
          window.location.replace(
            "/login"
          );

          return;
        }

        if (!response.ok) {
          throw new Error(
            "Rolni aniqlab bo‘lmadi."
          );
        }

        const data =
          await response.json();

        if (cancelled) {
          return;
        }

        if (data.role === "admin") {
          setRole("admin");
        } else {
          setRole("user");
        }
      } catch (error) {
        console.error(
          "ROLE LOAD ERROR:",
          error
        );

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
     QAYSI BO‘LIM KO‘RINIB TURGANINI ANIQLASH
  ========================================= */

  useEffect(() => {
    const sectionIds = [
      "talabalar",
      "abituriyent",
      "savoljavob",
    ] as const;

    const sections =
      sectionIds
        .map((id) =>
          document.getElementById(id)
        )
        .filter(
          (
            element
          ): element is HTMLElement =>
            Boolean(element)
        );

    if (sections.length === 0) {
      return;
    }

    const observer =
      new IntersectionObserver(
        (entries) => {
          const visibleEntries =
            entries
              .filter(
                (entry) =>
                  entry.isIntersecting
              )
              .sort(
                (a, b) =>
                  b.intersectionRatio -
                  a.intersectionRatio
              );

          if (
            visibleEntries.length > 0
          ) {
            const id =
              visibleEntries[0]
                .target.id as ActiveSection;

            setActiveSection(id);
          }
        },
        {
          root: null,

          rootMargin:
            "-25% 0px -55% 0px",

          threshold: [
            0,
            0.1,
            0.25,
            0.5,
            0.75,
            1,
          ],
        }
      );

    sections.forEach(
      (section) => {
        observer.observe(section);
      }
    );

    return () => {
      observer.disconnect();
    };
  }, []);

  /* =========================================
     CHIQISH
  ========================================= */

  async function logout() {
    try {
      await fetch(
        "/api/logout",
        {
          method: "POST",
          credentials: "include",
        }
      );
    } finally {
      window.location.replace(
        "/login"
      );
    }
  }

  /* =========================================
     BO‘LIMGA TUSHISH
  ========================================= */

  function scrollToSection(
    id:
      | "talabalar"
      | "abituriyent"
      | "savoljavob"
  ) {
    setActiveSection(id);

    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }

  /* =========================================
     TESTLARNI OCHISH
  ========================================= */

  function openTests() {
    window.location.href =
      "/test-entry";
  }

  /* =========================================
     MILLIY SERTIFIKATNI OCHISH
  ========================================= */

  function openNationalCertificate() {
    window.location.href =
      "/national-certificate";
  }

  /* =========================================
     QO‘LLANMALARNI OCHISH
  ========================================= */

  function openGuides() {
    window.location.href =
      "/qollanmalar";
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
            className={`grayButton ${
              activeSection ===
              "talabalar"
                ? "activeNavButton"
                : ""
            }`}
            onClick={() =>
              scrollToSection(
                "talabalar"
              )
            }
          >
            Talabalar
          </button>

          <button
            type="button"
            className={`grayButton ${
              activeSection ===
              "abituriyent"
                ? "activeNavButton"
                : ""
            }`}
            onClick={() =>
              scrollToSection(
                "abituriyent"
              )
            }
          >
            Abituriyent
          </button>

          <button
            type="button"
            className={`grayButton ${
              activeSection ===
              "savoljavob"
                ? "activeNavButton"
                : ""
            }`}
            onClick={() =>
              scrollToSection(
                "savoljavob"
              )
            }
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

          {!roleLoading &&
            role === "admin" && (
              <button
                type="button"
                className="adminButton"
                onClick={() => {
                  window.location.href =
                    "/admin";
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
              Normativ-huquqiy
              hujjatlar
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
            <h2>
              Milliy sertifikat
            </h2>

            <button
              type="button"
              className="openButton testButton"
              onClick={
                openNationalCertificate
              }
            >
              Ochish
            </button>
          </article>

          <article className="card">
            <h2>
              Qo‘llanmalar
            </h2>

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

            {!roleLoading &&
              role === "admin" && (
                <div className="adminLabel">
                  Administrator
                  boshqaruvi
                </div>
              )}

            <button
              type="button"
              className="openButton testButton"
              onClick={openTests}
            >
              {!roleLoading &&
              role === "admin"
                ? "Boshqarish"
                : "Ochish"}
            </button>
          </article>

          <article className="card">
            <h2>
              Qo‘llanmalar
            </h2>

            <button
              type="button"
              className="openButton"
              onClick={openGuides}
            >
              Ochish
            </button>
          </article>

          <article className="card">
            <h2>
              Video darslar
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
              Ko‘p beriladigan
              savollar
            </h2>

            <button
              type="button"
              className="openButton"
            >
              Ochish
            </button>
          </article>

          <article className="card">
            <h2>
              Savol yuborish
            </h2>

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
        Qurbonov Siyovush
        Jamaliddinzodaning huquqiy
        ta’lim platformasi
      </footer>
    </main>
  );
}
