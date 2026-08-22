"use client";

import { useState } from "react";

const BOOKS = [1, 2, 3, 4, 5, 6];
const UNITS = Array.from({ length: 30 }, (_, i) => i + 1);

export default function EnglishVocabularyPage() {
  const [selectedBook, setSelectedBook] = useState<number | null>(null);

  function goBack() {
    window.location.href = "/qollanmalar";
  }

  function openUnit(unit: number) {
    if (!selectedBook) return;

    window.location.href =
      `/qollanmalar/english-vocabulary/learn?book=${selectedBook}&unit=${unit}`;
  }

  return (
    <main className="page">
      <div className="shell">
        <div className="guideBar">
          <button
            type="button"
            className="backButton"
            onClick={goBack}
          >
            ← Qo‘llanmalar
          </button>
        </div>

        <section className="mainPanel">
          <div className="floatingTitle">
            English Vocabulary
          </div>

          <div className="intro">
            <h1>4000 Essential English Words</h1>
            <p>Kitobni tanlang</p>
          </div>

          <div className="bookGrid">
            {BOOKS.map((book) => (
              <button
                key={book}
                type="button"
                className={
                  selectedBook === book
                    ? "bookCard bookCardActive"
                    : "bookCard"
                }
                onClick={() => setSelectedBook(book)}
              >
                <span className="bookName">Book {book}</span>
                <span className="bookSub">30 ta Unit</span>
              </button>
            ))}
          </div>
        </section>

        {selectedBook && (
          <section className="unitPanel">
            <div className="floatingTitle unitFloatingTitle">
              Book {selectedBook}
            </div>

            <div className="unitIntro">
              <h2>Unitni tanlang</h2>
              <p>
                Book {selectedBook} bo‘yicha 30 ta Unit
              </p>
            </div>

            <div className="unitGrid">
              {UNITS.map((unit) => (
                <button
                  key={unit}
                  type="button"
                  className="unitButton"
                  onClick={() => openUnit(unit)}
                >
                  Unit {unit}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          padding: 24px 18px 70px;
          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #f5f7f8 60%,
              #e9edef 100%
            );
          font-family:
            "Bell MT",
            "Times New Roman",
            serif;
          color: #111;
        }

        .shell {
          width: min(1200px, 96%);
          margin: 0 auto;
        }

        .guideBar {
          width: 100%;
          min-height: 112px;

          display: flex;
          align-items: center;

          padding: 20px 32px;

          border: 3px solid #174461;
          border-radius: 28px;

          background:
            linear-gradient(
              180deg,
              #8bd4fa 0%,
              #68bae8 48%,
              #4da2d3 100%
            );

          box-shadow:
            inset 0 5px 4px rgba(255,255,255,.72),
            inset 0 -6px 6px rgba(0,0,0,.10),
            0 8px 0 #174d6d,
            0 14px 18px rgba(0,0,0,.20);

          margin-bottom: 34px;
        }

        .backButton {
          min-width: 168px;
          min-height: 52px;
          padding: 10px 24px;

          border: 2px solid #174461;
          border-radius: 9px;

          background:
            linear-gradient(
              180deg,
              #a8e7ff 0%,
              #72c3eb 55%,
              #4b9dcd 100%
            );

          box-shadow:
            inset 0 4px 4px rgba(255,255,255,.8),
            inset 0 -3px 3px rgba(0,0,0,.12),
            0 4px 0 #17415c,
            0 8px 10px rgba(0,0,0,.18);

          color: #073b68;
          font-family: inherit;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .backButton:hover {
          transform: translateY(-2px);
        }

        .backButton:active {
          transform: translateY(3px);
          box-shadow:
            inset 0 4px 5px rgba(0,0,0,.10),
            0 1px 0 #17415c;
        }

        .mainPanel,
        .unitPanel {
          position: relative;
          margin-top: 76px;
          padding: 70px 30px 34px;

          border: 3px solid #333a3e;
          border-radius: 23px;

          background:
            linear-gradient(
              180deg,
              #62686b 0%,
              #505659 46%,
              #3d4346 100%
            );

          box-shadow:
            inset 0 5px 5px rgba(255,255,255,.10),
            inset 0 -7px 7px rgba(0,0,0,.22),
            0 6px 0 #30373b,
            0 11px 0 #242a2d,
            0 17px 24px rgba(0,0,0,.22);
        }

        .unitPanel {
          margin-top: 82px;
          padding-top: 64px;
        }

        .floatingTitle {
          position: absolute;
          left: 50%;
          top: -31px;
          transform: translateX(-50%);

          min-width: 340px;
          min-height: 58px;
          padding: 10px 28px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 3px solid #174461;
          border-radius: 12px;

          background:
            linear-gradient(
              180deg,
              #a9e7ff 0%,
              #75c5ed 47%,
              #4a9dce 100%
            );

          box-shadow:
            inset 0 6px 5px rgba(255,255,255,.70),
            inset 0 -5px 5px rgba(0,0,0,.13),
            0 6px 0 #17415c,
            0 10px 13px rgba(20,65,92,.24);

          color: #073b68;
          font-size: 30px;
          font-weight: 700;
          text-align: center;
          white-space: nowrap;
        }

        .unitFloatingTitle {
          min-width: 250px;
          font-size: 27px;
        }

        .intro,
        .unitIntro {
          text-align: center;
          margin-bottom: 30px;
        }

        .intro h1,
        .unitIntro h2 {
          margin: 0;
          color: #ffffff;
          font-size: 28px;
          font-weight: 700;
          text-shadow:
            0 2px 0 rgba(0,0,0,.35);
        }

        .intro p,
        .unitIntro p {
          margin: 7px 0 0;
          color: #e7eaec;
          font-size: 16px;
          font-weight: 700;
        }

        .bookGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 26px;
        }

        .bookCard {
          min-height: 160px;
          padding: 18px 20px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;

          border: 2px solid #596166;
          border-radius: 15px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #ededed 42%,
              #c8c8c8 100%
            );

          box-shadow:
            inset 0 7px 6px rgba(255,255,255,.95),
            inset 0 -5px 5px rgba(0,0,0,.10),
            0 6px 0 #596166,
            0 11px 12px rgba(0,0,0,.18);

          color: #111;
          font-family: inherit;
          cursor: pointer;

          transition:
            transform .10s ease,
            filter .10s ease,
            box-shadow .10s ease;
        }

        .bookCard:hover {
          transform: translateY(-3px);
          filter: brightness(1.035);
        }

        .bookCard:active {
          transform: translateY(4px);
        }

        .bookCardActive {
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

        .bookName {
          font-size: 28px;
          font-weight: 700;
        }

        .bookSub {
          font-size: 14px;
          font-weight: 700;
          opacity: .75;
        }

        .unitGrid {
          display: grid;
          grid-template-columns: repeat(8, minmax(0, 1fr));
          gap: 18px 14px;
        }

        .unitButton {
          min-height: 68px;
          padding: 12px 12px;

          border: 2px solid #596166;
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

        .unitButton:hover {
          transform: translateY(-2px);
          filter: brightness(1.035);
        }

        .unitButton:active {
          transform: translateY(4px);

          color: #073b68;
          border-color: #174461;

          background:
            linear-gradient(
              180deg,
              #aee8ff 0%,
              #7bc8ee 42%,
              #4b9fce 100%
            );

          box-shadow:
            inset 0 5px 6px rgba(0,0,0,.10),
            inset 0 2px 2px rgba(255,255,255,.55),
            0 2px 0 #17415c,
            0 5px 7px rgba(20,65,92,.20);
        }

        @media (max-width: 1050px) {
          .bookGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .unitGrid {
            grid-template-columns: repeat(6, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .guideBar {
            min-height: 92px;
            padding: 16px 18px;
            border-radius: 22px;
          }

          .backButton {
            min-width: 150px;
            min-height: 48px;
            padding: 9px 18px;
            font-size: 14px;
          }

          .bookGrid {
            grid-template-columns: 1fr;
          }

          .unitGrid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }

          .mainPanel,
          .unitPanel {
            padding-left: 16px;
            padding-right: 16px;
          }

          .floatingTitle {
            min-width: 0;
            width: min(88%, 340px);
            font-size: 25px;
          }
        }

        @media (max-width: 500px) {
          .page {
            padding-left: 8px;
            padding-right: 8px;
          }

          .guideBar {
            min-height: 82px;
            padding: 13px 12px;
            border-radius: 19px;
          }

          .backButton {
            width: 100%;
            min-width: 0;
            min-height: 46px;
            font-size: 14px;
          }

          .unitGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .bookCard {
            min-height: 130px;
          }
        }

        @media (max-width: 380px) {
          .unitGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </main>
  );
}
