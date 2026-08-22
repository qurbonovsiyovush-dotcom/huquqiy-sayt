"use client";

import { useState } from "react";

const BOOKS = [1, 2, 3, 4, 5, 6];
const UNITS = Array.from({ length: 30 }, (_, i) => i + 1);

export default function EnglishVocabularyPage() {
  const [selectedUnit, setSelectedUnit] = useState<{
    book: number;
    unit: number;
  } | null>(null);

  function openUnit(book: number, unit: number) {
    setSelectedUnit({ book, unit });

    // Tugma ko‘k holatga o‘tishi ko‘rinishi uchun
    // juda qisqa kechikishdan keyin learn sahifaga o‘tamiz.
    window.setTimeout(() => {
      window.location.href =
        `/qollanmalar/english-vocabulary/learn?book=${book}&unit=${unit}`;
    }, 120);
  }

  return (
    <main className="page">
      <div className="wrapper">
        <div className="books">
          {BOOKS.map((book) => {
            return (
              <section className="bookCard" key={book}>
                <div className="bookHead">
                  <div>
                    <h2>Book {book}</h2>
                    <p>Unitni tanlang</p>
                  </div>
                </div>

                <div className="unitGrid">
                  {UNITS.map((unit) => {
                    const isSelected =
                      selectedUnit?.book === book &&
                      selectedUnit?.unit === unit;

                    return (
                      <button
                        key={unit}
                        type="button"
                        className={
                          isSelected
                            ? "unitButton unitSelected"
                            : "unitButton"
                        }
                        onClick={() => openUnit(book, unit)}
                      >
                        Unit {unit}
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
          padding: 0 20px 60px;
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
          margin-bottom: 24px;
        }

        .bookHead > div {
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

        .unitGrid {
          display: grid;
          grid-template-columns:
            repeat(8, minmax(0, 1fr));
          gap: 17px 14px;
        }

        .unitButton {
          min-height: 66px;

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
            box-shadow .12s ease,
            background .12s ease,
            color .12s ease,
            border-color .12s ease;
        }

        .unitButton:hover {
          transform: translateY(-2px);
          filter: brightness(1.035);
        }

        .unitButton:active {
          transform: translateY(3px);
        }

        .unitSelected {
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

        .unitSelected:hover {
          filter: brightness(1.05);
        }

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
        }

        @media (max-width: 700px) {
          .page {
            padding: 0 9px 40px;
          }

          .bookCard {
            padding: 20px 14px 24px;
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
        }
      `}</style>
    </main>
  );
}
