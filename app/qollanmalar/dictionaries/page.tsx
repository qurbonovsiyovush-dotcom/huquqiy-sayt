"use client";

import { useRouter } from "next/navigation";

type DictionaryCard = {
  title: string;
  badge: string;
  href: string;
};

const dictionaries: DictionaryCard[] = [
  {
    title: "English–Uzbek Dictionary",
    badge: "EN",
    href: "/qollanmalar/dictionaries/english-uzbek",
  },
  {
    title: "Phrasal Verbs",
    badge: "PV",
    href: "/qollanmalar/dictionaries/phrasal-verbs",
  },
  {
    title: "Irregular Verbs",
    badge: "IV",
    href: "/qollanmalar/dictionaries/irregular-verbs",
  },
  {
    title: "Synonyms & Antonyms",
    badge: "S/A",
    href: "/qollanmalar/dictionaries/synonyms-antonyms",
  },
  {
    title: "Collocations",
    badge: "C",
    href: "/qollanmalar/dictionaries/collocations",
  },
  {
    title: "IELTS Vocabulary",
    badge: "IELTS",
    href: "/qollanmalar/dictionaries/ielts-vocabulary",
  },
];

export default function DictionariesPage() {
  const router = useRouter();

  function goToAdmin() {
    window.location.href = "/admin";
  }

  function openDictionary(href: string) {
    router.push(href);
  }

  return (
    <main className="page">
      {/* TEPA PANEL */}
      <section className="topPanel">
        <button
          type="button"
          className="backButton"
          onClick={goToAdmin}
        >
          ← Orqaga
        </button>

        <div className="siteName">QURBONOV.UZ</div>
      </section>

      {/* ASOSIY PANEL */}
      <section className="mainPanel">
        <div className="panelTitle">
          Inglizcha lug‘atlar
        </div>

        <h1 className="heading">
          Kerakli bo‘limni tanlang
        </h1>

        <div className="cards">
          {dictionaries.map((item) => (
            <article
              className="card"
              key={item.title}
            >
              <div className="badge">
                {item.badge}
              </div>

              <h2>{item.title}</h2>

              <button
                type="button"
                className="openButton"
                onClick={() =>
                  openDictionary(item.href)
                }
              >
                Ochish
              </button>
            </article>
          ))}
        </div>
      </section>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          padding: 26px 20px 70px;

          background:
            radial-gradient(
              circle at top,
              #ffffff 0%,
              #f4f7f8 50%,
              #e9eef0 100%
            );

          color: #111;

          font-family:
            "Bell MT",
            "Times New Roman",
            Georgia,
            serif;
        }

        button {
          font-family: inherit;
        }

        /* ==============================
           TEPA KO‘K PANEL
        ============================== */

        .topPanel {
          width: min(1400px, 100%);
          min-height: 110px;

          margin: 0 auto 78px;

          padding: 22px 34px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 30px;

          border: 3px solid #123d52;
          border-radius: 27px;

          background:
            linear-gradient(
              180deg,
              #8bdcff 0%,
              #62bae6 48%,
              #409dce 100%
            );

          box-shadow:
            inset 0 7px 7px rgba(255, 255, 255, 0.48),
            inset 0 -7px 8px rgba(0, 0, 0, 0.13),
            0 10px 0 #123d52,
            0 17px 23px rgba(0, 0, 0, 0.19);
        }

        /* ==============================
           ORQAGA
        ============================== */

        .backButton {
          width: 195px;
          min-height: 58px;

          padding: 10px 20px;

          border: 2px solid #315968;
          border-radius: 12px;

          background:
            linear-gradient(
              180deg,
              #f9fdff 0%,
              #bfe8f7 40%,
              #69c5e8 100%
            );

          box-shadow:
            inset 0 5px 5px rgba(255, 255, 255, 0.8),
            0 6px 0 #315968,
            0 10px 13px rgba(0, 0, 0, 0.18);

          color: #063d61;

          font-size: 16px;
          font-weight: 900;

          cursor: pointer;

          transition:
            transform 0.1s ease,
            box-shadow 0.1s ease;
        }

        .backButton:hover {
          transform: translateY(-2px);

          box-shadow:
            inset 0 5px 5px rgba(255, 255, 255, 0.8),
            0 8px 0 #315968,
            0 13px 15px rgba(0, 0, 0, 0.2);
        }

        .backButton:active {
          transform: translateY(4px);

          box-shadow:
            inset 0 3px 5px rgba(0, 0, 0, 0.1),
            0 2px 0 #315968;
        }

        /* ==============================
           SAYT NOMI
        ============================== */

        .siteName {
          color: #063c67;

          font-size: 23px;
          font-weight: 900;

          letter-spacing: 1px;

          text-shadow:
            0 1px 0 rgba(255, 255, 255, 0.75);
        }

        /* ==============================
           ASOSIY PANEL
        ============================== */

        .mainPanel {
          position: relative;

          width: min(1400px, 100%);

          margin: 0 auto;

          padding: 80px 38px 50px;

          border: 2px solid #30383b;
          border-radius: 25px;

          background:
            linear-gradient(
              180deg,
              #666b6d 0%,
              #53595b 50%,
              #404749 100%
            );

          box-shadow:
            inset 0 6px 8px rgba(255, 255, 255, 0.12),
            inset 0 -9px 11px rgba(0, 0, 0, 0.22),
            0 10px 0 #303638,
            0 18px 27px rgba(0, 0, 0, 0.22);
        }

        /* ==============================
           INGLIZCHA LUG‘ATLAR SARLAVHASI
        ============================== */

        .panelTitle {
          position: absolute;

          top: -35px;
          left: 50%;

          transform: translateX(-50%);

          min-width: 400px;
          min-height: 72px;

          padding: 12px 35px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 3px solid #07506d;
          border-radius: 15px;

          background:
            linear-gradient(
              180deg,
              #d8f6ff 0%,
              #79d0ef 42%,
              #3ca8d5 100%
            );

          box-shadow:
            inset 0 5px 5px rgba(255, 255, 255, 0.72),
            0 8px 0 #07506d,
            0 13px 17px rgba(0, 0, 0, 0.22);

          color: #06436c;

          font-size: 32px;
          font-weight: 900;

          text-align: center;
        }

        /* ==============================
           SARLAVHA
        ============================== */

        .heading {
          margin: 0 0 38px;

          color: #fff;

          text-align: center;

          font-size: 27px;
          font-weight: 900;

          text-shadow:
            0 2px 2px rgba(0, 0, 0, 0.65);
        }

        /* ==============================
           KARTALAR
        ============================== */

        .cards {
          width: 100%;

          display: grid;

          grid-template-columns:
            repeat(3, minmax(0, 1fr));

          gap: 34px 32px;
        }

        .card {
          min-height: 235px;

          padding: 26px 22px 24px;

          display: flex;
          flex-direction: column;
          align-items: center;

          border: 1px solid #d1d1d1;
          border-radius: 15px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #f4f4f4 55%,
              #e2e2e2 100%
            );

          box-shadow:
            inset 0 5px 7px rgba(255, 255, 255, 0.95),
            0 8px 0 #858c8e,
            0 14px 19px rgba(0, 0, 0, 0.22);

          text-align: center;

          transition:
            transform 0.15s ease,
            box-shadow 0.15s ease;
        }

        .card:hover {
          transform: translateY(-3px);

          box-shadow:
            inset 0 5px 7px rgba(255, 255, 255, 0.95),
            0 10px 0 #858c8e,
            0 17px 22px rgba(0, 0, 0, 0.25);
        }

        /* ==============================
           BADGE
        ============================== */

        .badge {
          min-width: 58px;
          height: 48px;

          padding: 0 10px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 2px solid #07506d;
          border-radius: 10px;

          background:
            linear-gradient(
              180deg,
              #e2f9ff 0%,
              #7bd2f0 48%,
              #3ca8d5 100%
            );

          box-shadow:
            inset 0 4px 4px rgba(255, 255, 255, 0.8),
            0 5px 0 #07506d;

          color: #063e68;

          font-size: 16px;
          font-weight: 900;
        }

        /* ==============================
           KARTA NOMI
        ============================== */

        .card h2 {
          width: 100%;

          margin: 28px 0 0;

          color: #111;

          font-size: 23px;
          line-height: 1.15;

          font-weight: 900;
        }

        /* ==============================
           OCHISH TUGMASI
        ============================== */

        .openButton {
          width: 170px;
          min-height: 48px;

          margin-top: auto;

          border: 2px solid #07506d;
          border-radius: 9px;

          background:
            linear-gradient(
              180deg,
              #dcf7ff 0%,
              #78d0ef 48%,
              #3ba8d5 100%
            );

          box-shadow:
            inset 0 4px 4px rgba(255, 255, 255, 0.76),
            0 6px 0 #07506d,
            0 10px 12px rgba(0, 0, 0, 0.18);

          color: #073e65;

          font-size: 15px;
          font-weight: 900;

          cursor: pointer;

          transition:
            transform 0.1s ease,
            box-shadow 0.1s ease;
        }

        .openButton:hover {
          transform: translateY(-2px);

          box-shadow:
            inset 0 4px 4px rgba(255, 255, 255, 0.76),
            0 8px 0 #07506d,
            0 12px 14px rgba(0, 0, 0, 0.2);
        }

        .openButton:active {
          transform: translateY(4px);

          box-shadow:
            inset 0 3px 4px rgba(0, 0, 0, 0.08),
            0 2px 0 #07506d;
        }

        /* ==============================
           TABLET
        ============================== */

        @media (max-width: 1000px) {
          .topPanel {
            margin-bottom: 70px;
          }

          .mainPanel {
            padding: 75px 25px 42px;
          }

          .cards {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .panelTitle {
            min-width: 340px;

            font-size: 28px;
          }
        }

        /* ==============================
           TELEFON
        ============================== */

        @media (max-width: 620px) {
          .page {
            padding: 10px 8px 45px;
          }

          .topPanel {
            min-height: 92px;

            margin-bottom: 62px;

            padding: 14px;

            border-radius: 18px;

            gap: 12px;
          }

          .backButton {
            width: 120px;
            min-height: 50px;

            padding: 7px 8px;

            font-size: 13px;
          }

          .siteName {
            font-size: 16px;
          }

          .mainPanel {
            padding: 65px 14px 32px;

            border-radius: 18px;
          }

          .panelTitle {
            top: -29px;

            min-width: 250px;
            min-height: 58px;

            padding: 8px 15px;

            font-size: 23px;
          }

          .heading {
            margin-bottom: 27px;

            font-size: 21px;
          }

          .cards {
            grid-template-columns: 1fr;

            gap: 26px;
          }

          .card {
            min-height: 215px;
          }

          .card h2 {
            font-size: 21px;
          }
        }
      `}</style>
    </main>
  );
}
