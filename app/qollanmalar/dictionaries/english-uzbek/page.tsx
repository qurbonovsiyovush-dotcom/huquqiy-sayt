"use client";

import { useMemo, useState } from "react";

type DictionaryItem = {
  word: string;
  translation: string;
};

const WORDS: DictionaryItem[] = [
  { word: "abandon", translation: "tark etmoq" },
  { word: "ability", translation: "qobiliyat" },
  { word: "able", translation: "qodir" },
  { word: "accept", translation: "qabul qilmoq" },
  { word: "accident", translation: "baxtsiz hodisa" },
  { word: "achieve", translation: "erishmoq" },
  { word: "act", translation: "harakat qilmoq" },
  { word: "active", translation: "faol" },
  { word: "add", translation: "qo‘shmoq" },
  { word: "afraid", translation: "qo‘rqgan" },
  { word: "agree", translation: "rozi bo‘lmoq" },
  { word: "allow", translation: "ruxsat bermoq" },
  { word: "answer", translation: "javob" },
  { word: "arrive", translation: "yetib kelmoq" },
  { word: "attack", translation: "hujum qilmoq" },
  { word: "beautiful", translation: "chiroyli" },
  { word: "begin", translation: "boshlamoq" },
  { word: "believe", translation: "ishonmoq" },
  { word: "book", translation: "kitob" },
  { word: "build", translation: "qurmoq" },
];

export default function EnglishUzbekDictionaryPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) {
      return WORDS.slice(0, 10);
    }

    return WORDS.filter((item) =>
      item.word.toLowerCase().includes(q)
    );
  }, [query]);

  function goBack() {
    window.location.href =
      "/qollanmalar/dictionaries";
  }

  return (
    <main className="page">
      <header className="topPanel">
        <button
          type="button"
          className="backButton"
          onClick={goBack}
        >
          ← Lug‘atlarga qaytish
        </button>

        <div className="brand">
          QURBONOV.UZ
        </div>
      </header>

      <section className="mainPanel">
        <div className="panelTitle">
          English–Uzbek Dictionary
        </div>

        <div className="searchBox">
          <input
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder="Inglizcha so‘zni kiriting..."
          />
        </div>

        <div className="resultInfo">
          {query.trim()
            ? `${filtered.length} ta natija topildi`
            : "So‘z qidirishni boshlang"}
        </div>

        <div className="wordList">
          {filtered.length > 0 ? (
            filtered.map((item) => (
              <article
                key={item.word}
                className="wordCard"
              >
                <div className="englishWord">
                  {item.word}
                </div>

                <div className="divider">
                  →
                </div>

                <div className="uzbekWord">
                  {item.translation}
                </div>
              </article>
            ))
          ) : (
            <div className="emptyBox">
              So‘z topilmadi
            </div>
          )}
        </div>
      </section>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        :global(body) {
          margin: 0;
        }

        .page {
          min-height: 100vh;
          padding: 35px 20px 70px;

          font-family:
            "Bell MT",
            Georgia,
            "Times New Roman",
            serif;

          background:
            radial-gradient(
              circle at 50% 0%,
              #ffffff 0%,
              #f1f6f9 45%,
              #dfe7eb 100%
            );
        }

        .topPanel {
          width: min(1120px, 100%);
          min-height: 92px;

          margin: 0 auto 66px;
          padding: 18px 25px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          border: 3px solid #253239;
          border-radius: 22px;

          background:
            linear-gradient(
              180deg,
              #858b8e 0%,
              #686f72 16%,
              #50575a 60%,
              #3c4346 100%
            );

          box-shadow:
            inset 0 3px 3px rgba(255,255,255,.43),
            inset 0 -6px 8px rgba(0,0,0,.3),
            0 9px 0 #202b30,
            0 17px 26px rgba(0,0,0,.25);
        }

        .brand {
          color: white;
          font-size: 18px;
          font-weight: 900;
          letter-spacing: 3px;

          text-shadow:
            0 2px 0 #164d6b,
            0 3px 4px rgba(0,0,0,.7);
        }

        .backButton {
          min-width: 210px;
          min-height: 50px;

          padding: 10px 20px;

          border: 2px solid #155b7d;
          border-radius: 11px;

          color: #063f63;

          background:
            linear-gradient(
              180deg,
              #dff8ff 0%,
              #b0e9fb 17%,
              #7ccff0 47%,
              #4bb1dc 74%,
              #2c90be 100%
            );

          box-shadow:
            inset 0 3px 2px rgba(255,255,255,.97),
            inset 0 -4px 5px rgba(0,71,107,.23),
            0 7px 0 #164d68,
            0 12px 16px rgba(0,0,0,.27);

          font-family: inherit;
          font-size: 15px;
          font-weight: 900;

          cursor: pointer;
        }

        .mainPanel {
          position: relative;

          width: min(1120px, 100%);
          margin: 0 auto;

          padding: 100px 30px 45px;

          border: 3px solid #263238;
          border-radius: 25px;

          background:
            linear-gradient(
              145deg,
              #737a7d 0%,
              #5d6467 28%,
              #4b5255 65%,
              #373e41 100%
            );

          box-shadow:
            inset 0 3px 3px rgba(255,255,255,.4),
            inset 0 -8px 12px rgba(0,0,0,.3),
            0 10px 0 #222c30,
            0 20px 35px rgba(0,0,0,.3);
        }

        .panelTitle {
          position: absolute;

          top: -38px;
          left: 50%;

          transform: translateX(-50%);

          min-width: 390px;

          padding: 15px 38px;

          text-align: center;

          color: #063f68;

          font-size: 29px;
          font-weight: 900;

          border: 2px solid #145b80;
          border-radius: 15px;

          background:
            linear-gradient(
              180deg,
              #d5f5ff 0%,
              #a3e3fa 16%,
              #73ccef 48%,
              #45afe0 76%,
              #278dbd 100%
            );

          box-shadow:
            inset 0 3px 2px rgba(255,255,255,.95),
            inset 0 -3px 5px rgba(0,72,110,.25),
            0 8px 0 #155775,
            0 13px 18px rgba(0,0,0,.3);
        }

        .searchBox {
          padding: 18px;

          border: 2px solid #f4f4f4;
          border-radius: 16px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #e7eaec 100%
            );

          box-shadow:
            inset 0 3px 3px rgba(255,255,255,1),
            0 7px 0 #4b555a,
            0 12px 17px rgba(0,0,0,.2);
        }

        .searchBox input {
          width: 100%;
          min-height: 58px;

          padding: 10px 18px;

          border: 2px solid #1677a7;
          border-radius: 11px;

          outline: none;

          font-family: inherit;
          font-size: 20px;

          color: #123748;

          background: white;

          box-shadow:
            inset 0 3px 4px rgba(0,0,0,.08),
            0 3px 0 #7b8b93;
        }

        .searchBox input:focus {
          border-color: #0e9bd9;

          box-shadow:
            0 0 0 4px rgba(14,155,217,.14),
            inset 0 3px 4px rgba(0,0,0,.08),
            0 3px 0 #47758c;
        }

        .resultInfo {
          margin: 24px 0 18px;

          padding: 12px 16px;

          color: white;

          font-size: 17px;
          font-weight: 900;

          text-align: center;

          text-shadow:
            0 2px 2px rgba(0,0,0,.35);
        }

        .wordList {
          display: grid;
          gap: 16px;
        }

        .wordCard {
          min-height: 86px;

          padding: 18px 24px;

          display: grid;
          grid-template-columns:
            1fr auto 1fr;

          align-items: center;
          gap: 18px;

          border: 2px solid #f8f8f8;
          border-radius: 15px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #eeeeee 60%,
              #d8d8d8 100%
            );

          box-shadow:
            inset 0 3px 3px rgba(255,255,255,1),
            0 6px 0 #465056,
            0 10px 15px rgba(0,0,0,.2);
        }

        .englishWord,
        .uzbekWord {
          font-size: 23px;
          font-weight: 900;
        }

        .englishWord {
          color: #073f68;
        }

        .uzbekWord {
          text-align: right;
          color: #1d2c33;
        }

        .divider {
          width: 48px;
          height: 42px;

          display: grid;
          place-items: center;

          border: 2px solid #155b7d;
          border-radius: 10px;

          color: #063f63;

          background:
            linear-gradient(
              180deg,
              #d9f7ff,
              #65c3e8
            );

          box-shadow:
            0 4px 0 #164d68;

          font-size: 21px;
          font-weight: 900;
        }

        .emptyBox {
          padding: 35px;

          text-align: center;

          border: 2px solid #f4f4f4;
          border-radius: 15px;

          color: #333;

          background:
            linear-gradient(
              #ffffff,
              #e4e4e4
            );

          box-shadow:
            0 6px 0 #465056;

          font-size: 20px;
          font-weight: 900;
        }

        @media (max-width: 700px) {
          .page {
            padding:
              20px 12px
              50px;
          }

          .topPanel {
            flex-direction: column;
            padding: 15px;
          }

          .backButton {
            width: 100%;
          }

          .mainPanel {
            padding:
              80px 15px
              30px;
          }

          .panelTitle {
            min-width: 250px;
            width: 84%;

            padding:
              12px 18px;

            font-size: 23px;
          }

          .wordCard {
            grid-template-columns: 1fr;
            text-align: center;
          }

          .uzbekWord {
            text-align: center;
          }

          .divider {
            margin: 0 auto;
            transform: rotate(90deg);
          }
        }
      `}</style>
    </main>
  );
}
