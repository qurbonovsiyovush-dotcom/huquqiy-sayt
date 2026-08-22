"use client";

import { useState } from "react";

const BOOKS = [1, 2, 3, 4, 5, 6];
const UNITS = Array.from({ length: 30 }, (_, i) => i + 1);

export default function EnglishVocabularyPage() {
  const [selectedBook, setSelectedBook] = useState(1);
  const [pressedUnit, setPressedUnit] = useState<number | null>(null);

  function goBack() {
    window.location.href = "/qollanmalar";
  }

  function selectBook(book: number) {
    setSelectedBook(book);
    setPressedUnit(null);
  }

  function openUnit(unit: number) {
    setPressedUnit(unit);

    window.setTimeout(() => {
      window.location.href =
        `/qollanmalar/english-vocabulary/learn?book=${selectedBook}&unit=${unit}`;
    }, 110);
  }

  return (
    <main className="page">
      <div className="pageShell">
        {/* =========================
            TOP NAVIGATION
        ========================== */}
        <header className="topNav3d">
          <button
            type="button"
            className="brandPlate"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            Qurbonov Siyovush Jamaliddinzoda
          </button>

          <div className="navActions">
            <button
              type="button"
              className="navButton"
              onClick={() => {
                window.location.href = "/talabalar";
              }}
            >
              Talabalar
            </button>

            <button
              type="button"
              className="navButton"
              onClick={() => {
                window.location.href = "/abituriyent";
              }}
            >
              Abituriyent
            </button>

            <button
              type="button"
              className="navButton"
              onClick={() => {
                window.location.href = "/savol-javob";
              }}
            >
              Savol-javob
            </button>

            <button
              type="button"
              className="navButton navActive"
              onClick={goBack}
            >
              Qo‘llanmalar
            </button>

            <button
              type="button"
              className="navButton navAdmin"
              onClick={() => {
                window.location.href = "/admin";
              }}
            >
              Admin
            </button>

            <button
              type="button"
              className="navButton navExit"
              onClick={() => {
                window.location.href = "/";
              }}
            >
              Chiqish
            </button>
          </div>
        </header>

        {/* =========================
            TITLE BADGE
        ========================== */}
        <div className="titleBadge3d">
          English Vocabulary
        </div>

        {/* =========================
            MAIN BOOK PANEL
        ========================== */}
        <section className="darkPanel3d">
          <div className="panelTitle">
            4000 Essential English Words
          </div>

          <div className="panelSubtitle">
            Avval Book tanlang, keyin Unitni tanlab testni boshlang.
          </div>

          <div className="bookGrid">
            {BOOKS.map((book) => (
              <button
                key={book}
                type="button"
                className={
                  selectedBook === book
                    ? "bookButton3d bookSelected"
                    : "bookButton3d"
                }
                onClick={() => selectBook(book)}
              >
                Book {book}
              </button>
            ))}
          </div>
        </section>

        {/* =========================
            UNIT TITLE BADGE
        ========================== */}
        <div className="sectionBadge3d">
          Book {selectedBook}
        </div>

        {/* =========================
            UNIT PANEL
        ========================== */}
        <section className="darkPanel3d unitPanel">
          <div className="unitHint">
            Unitni tanlang
          </div>

          <div className="unitGrid">
            {UNITS.map((unit) => (
              <button
                key={unit}
                type="button"
                className={
                  pressedUnit === unit
                    ? "unitButton3d unitPressed"
                    : "unitButton3d"
                }
                onMouseDown={() => setPressedUnit(unit)}
                onMouseLeave={() => setPressedUnit(null)}
                onClick={() => openUnit(unit)}
              >
                Unit {unit}
              </button>
            ))}
          </div>
        </section>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          padding: 18px 16px 70px;
          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #f7f8f9 48%,
              #eceff1 100%
            );
          color: #111;
          font-family:
            "Bell MT",
            "Times New Roman",
            serif;
        }

        .pageShell {
          width: min(1600px, 100%);
          margin: 0 auto;
        }

        /* =========================================
           TOP NAVIGATION — ASOSIY SAYTGA MOS
        ========================================== */

        .topNav3d {
          min-height: 118px;
          display: grid;
          grid-template-columns: minmax(330px, 1fr) auto;
          align-items: center;
          gap: 26px;
          padding: 18px 28px;

          border: 3px solid #15394f;
          border-radius: 24px;

          background:
            linear-gradient(
              180deg,
              #8dd8ff 0%,
              #64b9e9 42%,
              #4499cc 72%,
              #3785b1 100%
            );

          box-shadow:
            inset 0 7px 7px rgba(255,255,255,.72),
            inset 0 -8px 8px rgba(0,0,0,.18),
            0 7px 0 #173d55,
            0 11px 0 #0b2c41,
            0 18px 22px rgba(0,0,0,.20);
        }

        .brandPlate {
          justify-self: start;
          min-width: 420px;
          min-height: 64px;
          padding: 10px 24px;

          border: 2px solid #62696d;
          border-radius: 12px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #ececec 38%,
              #c8c8c8 100%
            );

          box-shadow:
            inset 0 5px 4px rgba(255,255,255,.95),
            inset 0 -4px 4px rgba(0,0,0,.10),
            0 5px 0 #5c6367,
            0 9px 10px rgba(0,0,0,.18);

          color: #111;
          text-align: left;
          font-family: inherit;
          font-size: 24px;
          font-weight: 700;
          cursor: pointer;
        }

        .navActions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 14px;
          flex-wrap: wrap;
        }

        .navButton {
          min-width: 132px;
          min-height: 54px;
          padding: 9px 17px;

          border: 2px solid #596267;
          border-radius: 11px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #e7e7e7 40%,
              #c7c7c7 100%
            );

          box-shadow:
            inset 0 5px 4px rgba(255,255,255,.95),
            inset 0 -4px 4px rgba(0,0,0,.10),
            0 5px 0 #586064,
            0 8px 10px rgba(0,0,0,.16);

          color: #111;
          font-family: inherit;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .navButton:hover,
        .brandPlate:hover {
          transform: translateY(-2px);
          filter: brightness(1.035);
        }

        .navButton:active,
        .brandPlate:active {
          transform: translateY(3px);
        }

        .navActive,
        .navAdmin {
          color: #ffffff;
          border-color: #174461;

          background:
            linear-gradient(
              180deg,
              #77c9f2 0%,
              #4aa4d5 55%,
              #2c7eb0 100%
            );

          box-shadow:
            inset 0 5px 4px rgba(255,255,255,.38),
            inset 0 -4px 4px rgba(0,0,0,.15),
            0 5px 0 #17415c,
            0 8px 10px rgba(20,65,92,.24);
        }

        .navExit {
          color: #ffffff;
          border-color: #8f0e0e;

          background:
            linear-gradient(
              180deg,
              #ff6767 0%,
              #e72f2f 50%,
              #bd1010 100%
            );

          box-shadow:
            inset 0 5px 4px rgba(255,255,255,.35),
            inset 0 -4px 4px rgba(0,0,0,.15),
            0 5px 0 #8d1111,
            0 8px 10px rgba(100,0,0,.20);
        }

        /* =========================================
           TITLE BADGE
        ========================================== */

        .titleBadge3d,
        .sectionBadge3d {
          width: fit-content;
          margin: 20px auto -18px;
          position: relative;
          z-index: 3;

          min-width: 560px;
          min-height: 62px;
          padding: 11px 30px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 3px solid #174461;
          border-radius: 13px;

          color: #073b68;

          background:
            linear-gradient(
              180deg,
              #a8e4ff 0%,
              #77c8f0 44%,
              #4b9fd0 100%
            );

          box-shadow:
            inset 0 6px 5px rgba(255,255,255,.70),
            inset 0 -5px 5px rgba(0,0,0,.13),
            0 6px 0 #17415c,
            0 10px 13px rgba(20,65,92,.24);

          font-size: 31px;
          font-weight: 700;
          text-align: center;
        }

        .sectionBadge3d {
          min-width: 270px;
          font-size: 25px;
          margin-top: 42px;
        }

        /* =========================================
           DARK 3D PANEL
        ========================================== */

        .darkPanel3d {
          padding: 56px 42px 40px;

          border: 3px solid #333a3e;
          border-radius: 24px;

          background:
            linear-gradient(
              180deg,
              #61676a 0%,
              #505659 45%,
              #3d4346 100%
            );

          box-shadow:
            inset 0 5px 5px rgba(255,255,255,.10),
            inset 0 -7px 7px rgba(0,0,0,.22),
            0 6px 0 #30373b,
            0 11px 0 #23292c,
            0 17px 24px rgba(0,0,0,.22);
        }

        .panelTitle {
          text-align: center;
          color: #ffffff;
          font-size: 25px;
          font-weight: 700;
          text-shadow: 0 2px 0 rgba(0,0,0,.38);
        }

        .panelSubtitle {
          margin-top: 8px;
          margin-bottom: 28px;
          text-align: center;
          color: #e7eaec;
          font-size: 15px;
        }

        /* =========================================
           BOOK BUTTONS
        ========================================== */

        .bookGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 22px;
        }

        .bookButton3d {
          min-height: 104px;
          padding: 16px 18px;

          border: 2px solid #5b6367;
          border-radius: 15px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #ececec 42%,
              #c8c8c8 100%
            );

          box-shadow:
            inset 0 7px 6px rgba(255,255,255,.95),
            inset 0 -5px 5px rgba(0,0,0,.10),
            0 6px 0 #5b6367,
            0 11px 12px rgba(0,0,0,.17);

          color: #111;
          font-family: inherit;
          font-size: 23px;
          font-weight: 700;
          cursor: pointer;

          transition:
            transform .10s ease,
            filter .10s ease,
            box-shadow .10s ease;
        }

        .bookButton3d:hover {
          transform: translateY(-3px);
          filter: brightness(1.035);
        }

        .bookButton3d:active {
          transform: translateY(4px);
          box-shadow:
            inset 0 5px 6px rgba(0,0,0,.12),
            0 2px 0 #596166;
        }

        .bookSelected {
          color: #073b68;
          border-color: #174461;

          background:
            linear-gradient(
              180deg,
              #b7eaff 0%,
              #7ecdf2 43%,
              #4ba1d2 100%
            );

          box-shadow:
            inset 0 7px 6px rgba(255,255,255,.72),
            inset 0 -5px 5px rgba(0,0,0,.13),
            0 6px 0 #17415c,
            0 11px 14px rgba(20,65,92,.25);
        }

        /* =========================================
           UNIT PANEL
        ========================================== */

        .unitPanel {
          padding-top: 50px;
        }

        .unitHint {
          margin-bottom: 25px;
          color: #ffffff;
          text-align: center;
          font-size: 20px;
          font-weight: 700;
          text-shadow: 0 2px 0 rgba(0,0,0,.35);
        }

        .unitGrid {
          display: grid;
          grid-template-columns: repeat(8, minmax(0, 1fr));
          gap: 18px 15px;
        }

        .unitButton3d {
          min-height: 68px;
          padding: 12px 14px;

          border: 2px solid #5b6367;
          border-radius: 11px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #ededed 42%,
              #c8c8c8 100%
            );

          box-shadow:
            inset 0 6px 5px rgba(255,255,255,.95),
            inset 0 -4px 4px rgba(0,0,0,.10),
            0 5px 0 #596166,
            0 9px 10px rgba(0,0,0,.16);

          color: #111;
          font-family: inherit;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;

          transition:
            transform .08s ease,
            filter .08s ease,
            background .08s ease,
            box-shadow .08s ease;
        }

        .unitButton3d:hover {
          transform: translateY(-2px);
          filter: brightness(1.035);
        }

        .unitPressed,
        .unitButton3d:active {
          transform: translateY(4px);

          color: #073b68;
          border-color: #174461;

          background:
            linear-gradient(
              180deg,
              #abe6ff 0%,
              #78c8ef 42%,
              #4b9fd0 100%
            );

          box-shadow:
            inset 0 5px 6px rgba(0,0,0,.10),
            inset 0 2px 2px rgba(255,255,255,.55),
            0 2px 0 #17415c,
            0 5px 7px rgba(20,65,92,.21);
        }

        /* =========================================
           RESPONSIVE
        ========================================== */

        @media (max-width: 1450px) {
          .topNav3d {
            grid-template-columns: 1fr;
          }

          .brandPlate {
            justify-self: center;
            min-width: 420px;
            text-align: center;
          }

          .navActions {
            justify-content: center;
          }
        }

        @media (max-width: 1100px) {
          .bookGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .unitGrid {
            grid-template-columns: repeat(6, minmax(0, 1fr));
          }
        }

        @media (max-width: 820px) {
          .titleBadge3d {
            min-width: 0;
            width: min(92%, 560px);
            font-size: 26px;
          }

          .bookGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .unitGrid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }

          .darkPanel3d {
            padding-left: 18px;
            padding-right: 18px;
          }
        }

        @media (max-width: 620px) {
          .page {
            padding: 10px 8px 50px;
          }

          .brandPlate {
            min-width: 0;
            width: 100%;
            font-size: 19px;
          }

          .navActions {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            width: 100%;
          }

          .navButton {
            min-width: 0;
            width: 100%;
          }

          .bookGrid {
            grid-template-columns: 1fr;
          }

          .unitGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .bookButton3d {
            min-height: 82px;
          }

          .sectionBadge3d {
            min-width: 220px;
          }
        }

        @media (max-width: 440px) {
          .unitGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </main>
  );
}
