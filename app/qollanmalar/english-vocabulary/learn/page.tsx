"use client";

import { useEffect, useState } from "react";

const BOOKS = [1, 2, 3, 4, 5, 6];
const UNITS = Array.from({ length: 30 }, (_, i) => i + 1);

type VisitedMap = Record<string, boolean>;

const STORAGE_KEY = "english-vocabulary-visited-units";

function makeKey(book: number, unit: number) {
  return `book-${book}-unit-${unit}`;
}

export default function EnglishVocabularyPage() {
  const [visited, setVisited] = useState<VisitedMap>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);

      if (raw) {
        const parsed = JSON.parse(raw);

        if (parsed && typeof parsed === "object") {
          setVisited(parsed);
        }
      }
    } catch (error) {
      console.error("Visited units load error:", error);
    } finally {
      setReady(true);
    }
  }, []);

  function openUnit(book: number, unit: number) {
    const key = makeKey(book, unit);

    const nextVisited: VisitedMap = {
      ...visited,
      [key]: true,
    };

    setVisited(nextVisited);

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(nextVisited)
      );
    } catch (error) {
      console.error("Visited unit save error:", error);
    }

    window.location.href =
      `/qollanmalar/english-vocabulary/learn?book=${book}&unit=${unit}`;
  }

  function resetProgress() {
    const confirmed = window.confirm(
      "Barcha ishlangan Unitlarning ko‘k belgisini tozalaysizmi?"
    );

    if (!confirmed) return;

    setVisited({});

    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Progress reset error:", error);
    }
  }

  function countVisited(book: number) {
    return UNITS.filter(
      (unit) => visited[makeKey(book, unit)]
    ).length;
  }

  return (
    <main className="page">
      <div className="wrapper">
        <header className="topBar">
          <button
            type="button"
            className="backButton"
            onClick={() => {
              window.location.href = "/qollanmalar";
            }}
          >
            ← Qo‘llanmalar
          </button>

          <div className="topTitle">
            <h1>English Vocabulary</h1>
            <p>4000 Essential English Words</p>
          </div>

          <button
            type="button"
            className="resetButton"
            onClick={resetProgress}
          >
            Belgilarni tozalash
          </button>
        </header>

        <section className="legend">
          <div className="legendItem">
            <span className="legendGray" />
            <span>Ishlanmagan Unit</span>
          </div>

          <div className="legendItem">
            <span className="legendBlue" />
            <span>Ishlangan Unit</span>
          </div>
        </section>

        <div className="books">
          {BOOKS.map((book) => {
            const completed = countVisited(book);

            return (
              <section className="bookCard" key={book}>
                <div className="bookHead">
                  <div>
                    <h2>Book {book}</h2>
                    <p>Unitni tanlang</p>
                  </div>

                  <div className="bookProgress">
                    <strong>{completed}</strong>
                    <span>/ 30 ishlangan</span>
                  </div>
                </div>

                <div className="unitGrid">
                  {UNITS.map((unit) => {
                    const key = makeKey(book, unit);
                    const isVisited = ready && Boolean(visited[key]);

                    return (
                      <button
                        key={unit}
                        type="button"
                        className={
                          isVisited
                            ? "unitButton unitVisited"
                            : "unitButton"
                        }
                        onClick={() => openUnit(book, unit)}
                        title={
                          isVisited
                            ? `Book ${book}, Unit ${unit} — ishlangan`
                            : `Book ${book}, Unit ${unit}`
                        }
                      >
                        <span>Unit {unit}</span>

                        {isVisited && (
                          <span className="checkMark">✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          padding: 22px 20px 60px;
          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #f3f5f6 55%,
              #e7ebed 100%
            );
          color: #111;
          font-family:
            "Bell MT",
            "Times New Roman",
            serif;
        }

        .wrapper {
          width: min(1220px, 97%);
          margin: 0 auto;
        }

        /* =========================
           TOP BAR
        ========================= */

        .topBar {
          min-height: 100px;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 20px;
          padding: 18px 24px;

          border: 3px solid #174461;
          border-radius: 24px;

          background:
            linear-gradient(
              180deg,
              #8bd3ff 0%,
              #68b7e8 45%,
              #4999ce 100%
            );

          box-shadow:
            inset 0 7px 6px rgba(255,255,255,.72),
            inset 0 -7px 7px rgba(0,0,0,.16),
            0 7px 0 #17415c,
            0 13px 18px rgba(0,0,0,.22);
        }

        .topTitle {
          text-align: center;
        }

        .topTitle h1 {
          margin: 0;
          color: #073b68;
          font-size: 31px;
        }

        .topTitle p {
          margin: 4px 0 0;
          color: #1d4f70;
          font-size: 16px;
          font-weight: 700;
        }

        .backButton,
        .resetButton {
          min-height: 43px;
          padding: 9px 16px;

          border: 2px solid #51585c;
          border-radius: 9px;

          background:
            linear-gradient(
              180deg,
              #ffffff,
              #c7c7c7
            );

          box-shadow:
            inset 0 3px 3px white,
            0 3px 0 #555d61;

          color: #111;
          font-family: inherit;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .backButton {
          justify-self: start;
        }

        .resetButton {
          justify-self: end;
        }

        .backButton:hover,
        .resetButton:hover {
          transform: translateY(-2px);
          filter: brightness(1.04);
        }

        .backButton:active,
        .resetButton:active {
          transform: translateY(2px);
        }

        /* =========================
           LEGEND
        ========================= */

        .legend {
          display: flex;
          justify-content: center;
          gap: 28px;
          flex-wrap: wrap;
          margin: 34px 0 20px;
        }

        .legendItem {
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 15px;
          font-weight: 700;
          color: #3b4b56;
        }

        .legendGray,
        .legendBlue {
          width: 28px;
          height: 18px;
          display: inline-block;
          border-radius: 5px;
          border: 1px solid #555;
          box-shadow: 0 2px 0 #555d61;
        }

        .legendGray {
          background:
            linear-gradient(
              180deg,
              #f5f5f5,
              #c7c7c7
            );
        }

        .legendBlue {
          border-color: #174461;
          background:
            linear-gradient(
              180deg,
              #9bdcff,
              #55a7d7
            );
          box-shadow: 0 2px 0 #17415c;
        }

        /* =========================
           BOOKS
        ========================= */

        .books {
          display: grid;
          gap: 28px;
        }

        .bookCard {
          padding: 24px 30px 30px;

          border: 1px solid #ccd4da;
          border-radius: 20px;

          background:
            linear-gradient(
              145deg,
              #ffffff,
              #f0f2f3
            );

          box-shadow:
            0 8px 18px rgba(48, 62, 72, .13),
            inset 0 2px 0 #ffffff;
        }

        .bookHead {
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
          margin-bottom: 24px;
        }

        .bookHead > div:first-child {
          text-align: center;
        }

        .bookHead h2 {
          margin: 0;
          color: #073b68;
          font-size: 30px;
        }

        .bookHead p {
          margin: 5px 0 0;
          color: #536879;
          font-size: 15px;
        }

        .bookProgress {
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);

          display: flex;
          align-items: baseline;
          gap: 5px;

          padding: 8px 12px;
          border-radius: 10px;
          border: 1px solid #9bb5c6;

          background:
            linear-gradient(
              180deg,
              #edf8ff,
              #cfe7f4
            );

          color: #174461;
          box-shadow:
            inset 0 2px 2px white,
            0 2px 0 #91aebb;
        }

        .bookProgress strong {
          font-size: 20px;
        }

        .bookProgress span {
          font-size: 12px;
          font-weight: 700;
        }

        /* =========================
           UNIT GRID
        ========================= */

        .unitGrid {
          display: grid;
          grid-template-columns:
            repeat(8, minmax(0, 1fr));
          gap: 17px 14px;
        }

        .unitButton {
          min-height: 66px;
          position: relative;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 12px 18px;

          border: 2px solid #51585c;
          border-radius: 11px;

          color: #090909;

          background:
            linear-gradient(
              180deg,
              #f7f7f7 0%,
              #e6e6e6 38%,
              #c8c8c8 100%
            );

          box-shadow:
            inset 0 5px 5px rgba(255,255,255,.95),
            inset 0 -4px 4px rgba(0,0,0,.10),
            0 5px 0 #555d61,
            0 8px 10px rgba(0,0,0,.12);

          font-family: inherit;
          font-size: 16px;
          font-weight: 700;

          cursor: pointer;

          transition:
            transform .12s ease,
            filter .12s ease,
            box-shadow .12s ease;
        }

        .unitButton:hover {
          transform: translateY(-2px);
          filter: brightness(1.035);
        }

        .unitButton:active {
          transform: translateY(3px);
        }

        /* ISHLANGAN UNIT */

        .unitVisited {
          color: #073b68;
          border-color: #174461;

          background:
            linear-gradient(
              180deg,
              #9edfff 0%,
              #72c0eb 43%,
              #4d9ed0 100%
            );

          box-shadow:
            inset 0 5px 5px rgba(255,255,255,.72),
            inset 0 -5px 5px rgba(0,0,0,.13),
            0 5px 0 #17415c,
            0 9px 12px rgba(20,65,92,.20);
        }

        .unitVisited:hover {
          filter: brightness(1.05);
        }

        .checkMark {
          position: absolute;
          right: 8px;
          top: 7px;

          width: 20px;
          height: 20px;

          display: grid;
          place-items: center;

          border-radius: 50%;

          color: #ffffff;
          background: #176b45;

          font-family: Arial, sans-serif;
          font-size: 12px;
          font-weight: 900;

          box-shadow:
            inset 0 1px 2px rgba(255,255,255,.4),
            0 2px 3px rgba(0,0,0,.18);
        }

        /* =========================
           RESPONSIVE
        ========================= */

        @media (max-width: 1150px) {
          .unitGrid {
            grid-template-columns:
              repeat(6, minmax(0, 1fr));
          }
        }

        @media (max-width: 900px) {
          .unitGrid {
            grid-template-columns:
              repeat(4, minmax(0, 1fr));
          }

          .bookProgress {
            position: static;
            transform: none;
            margin-left: 20px;
          }

          .bookHead {
            justify-content: space-between;
          }
        }

        @media (max-width: 700px) {
          .page {
            padding: 12px 9px 40px;
          }

          .topBar {
            grid-template-columns: 1fr 1fr;
            padding: 15px;
          }

          .topTitle {
            grid-column: 1 / -1;
            grid-row: 1;
          }

          .backButton {
            grid-column: 1;
            grid-row: 2;
          }

          .resetButton {
            grid-column: 2;
            grid-row: 2;
          }

          .bookCard {
            padding: 20px 14px 24px;
          }

          .bookHead {
            flex-direction: column;
            gap: 13px;
          }

          .bookProgress {
            margin-left: 0;
          }

          .unitGrid {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
            gap: 14px 10px;
          }

          .unitButton {
            min-height: 60px;
            padding: 10px 8px;
            font-size: 14px;
          }
        }

        @media (max-width: 470px) {
          .unitGrid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .topTitle h1 {
            font-size: 25px;
          }

          .backButton,
          .resetButton {
            padding: 8px 10px;
            font-size: 12px;
          }
        }
      `}</style>
    </main>
  );
}
