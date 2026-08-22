"use client";

const BOOKS = [1, 2, 3, 4, 5, 6];
const UNITS = Array.from({ length: 30 }, (_, i) => i + 1);

export default function EnglishVocabularyPage() {
  function openUnit(book: number, unit: number) {
    window.location.href =
      `/qollanmalar/english-vocabulary/learn?book=${book}&unit=${unit}`;
  }

  return (
    <main className="page">
      <div className="wrapper">
        <div className="top">
          <button
            type="button"
            className="homeButton"
            onClick={() => {
              window.location.href = "/qollanmalar";
            }}
          >
            ← Asosiy sahifa
          </button>

          <div className="titleBox">
            <h1>English Vocabulary</h1>
            <h2>4000 Essential English Words</h2>
          </div>
        </div>

        <div className="books">
          {BOOKS.map((book) => (
            <section className="bookCard" key={book}>
              <div className="bookHead">
                <h2>Book {book}</h2>
                <p>Unitni tanlang</p>
              </div>

              <div className="unitGrid">
                {UNITS.map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    className="unitButton"
                    onClick={() => openUnit(book, unit)}
                  >
                    Unit {unit}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          padding: 26px 20px 60px;
          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #f6f8f9 55%,
              #e9edef 100%
            );
          color: #111;
          font-family:
            "Bell MT",
            "Times New Roman",
            serif;
        }

        .wrapper {
          width: min(1220px, 96%);
          margin: 0 auto;
        }

        .top {
          position: relative;
          margin-bottom: 34px;
          min-height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .homeButton {
          position: absolute;
          left: 0;
          top: 8px;

          min-width: 134px;
          min-height: 42px;
          padding: 8px 15px;

          border: 2px solid #174461;
          border-radius: 9px;

          background:
            linear-gradient(
              180deg,
              #9fe0ff 0%,
              #67b8e7 55%,
              #4d9fd0 100%
            );

          box-shadow:
            inset 0 3px 3px rgba(255,255,255,.8),
            0 3px 0 #17415c;

          color: #073b68;
          font-family: inherit;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .homeButton:active {
          transform: translateY(2px);
          box-shadow:
            inset 0 2px 3px rgba(0,0,0,.15),
            0 1px 0 #17415c;
        }

        .titleBox {
          text-align: center;
        }

        .titleBox h1 {
          margin: 0;
          color: #073b68;
          font-size: 34px;
          line-height: 1.05;
        }

        .titleBox h2 {
          margin: 9px 0 0;
          font-size: 18px;
          color: #202020;
        }

        .books {
          display: grid;
          gap: 28px;
        }

        .bookCard {
          padding: 22px 30px 28px;

          border: 1px solid #cbd4da;
          border-radius: 20px;

          background:
            linear-gradient(
              145deg,
              #ffffff 0%,
              #f5f6f7 58%,
              #eef1f2 100%
            );

          box-shadow:
            0 8px 18px rgba(48,62,72,.13),
            inset 0 2px 0 #ffffff;
        }

        .bookHead {
          text-align: center;
          margin-bottom: 23px;
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
          padding: 12px 14px;

          border: 2px solid #51585c;
          border-radius: 11px;

          color: #090909;

          background:
            linear-gradient(
              180deg,
              #f8f8f8 0%,
              #e8e8e8 42%,
              #c9c9c9 100%
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
            transform .08s ease,
            background .08s ease,
            border-color .08s ease,
            box-shadow .08s ease,
            color .08s ease;
        }

        .unitButton:hover {
          transform: translateY(-2px);
          filter: brightness(1.03);
        }

        /* FAQAT BOSIB TURGAN PAYTDA KO‘K */
        .unitButton:active {
          transform: translateY(3px);
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
            0 2px 0 #17415c,
            0 5px 8px rgba(20,65,92,.20);
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
            padding: 16px 9px 40px;
          }

          .top {
            padding-top: 54px;
            min-height: 150px;
          }

          .homeButton {
            left: 0;
            top: 0;
          }

          .titleBox h1 {
            font-size: 28px;
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
