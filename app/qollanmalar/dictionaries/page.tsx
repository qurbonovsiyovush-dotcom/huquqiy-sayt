"use client";

import { useRouter } from "next/navigation";

type DictionaryItem = {
  badge: string;
  title: string;
  href: string;
};

const dictionaries: DictionaryItem[] = [
  {
    badge: "EN",
    title: "English–Uzbek Dictionary",
    href: "/qollanmalar/dictionaries/english-uzbek",
  },
  {
    badge: "PV",
    title: "Phrasal Verbs",
    href: "/qollanmalar/dictionaries/phrasal-verbs",
  },
  {
    badge: "IV",
    title: "Irregular Verbs",
    href: "/qollanmalar/dictionaries/irregular-verbs",
  },
  {
    badge: "S",
    title: "Synonyms",
    href: "/qollanmalar/dictionaries/synonyms",
  },
  {
    badge: "C",
    title: "Collocations",
    href: "/qollanmalar/dictionaries/collocations",
  },
  {
    badge: "IELTS",
    title: "IELTS Vocabulary",
    href: "/qollanmalar/dictionaries/ielts-vocabulary",
  },
];

export default function DictionariesPage() {
  const router = useRouter();

  return (
    <main className="page">
      {/* =========================
          TEPADAGI PANEL
      ========================== */}

      <header className="topPanel">
        <button
          type="button"
          className="backButton"
          onClick={() =>
            router.push("/qollanmalar")
          }
        >
          ← Qo‘llanmalar
        </button>

        <div className="brand">
          QURBONOV.UZ
        </div>
      </header>

      {/* =========================
          ASOSIY PANEL
      ========================== */}

      <section className="mainPanel">
        <div className="titlePlate">
          Inglizcha lug‘atlar
        </div>

        <h1 className="sectionTitle">
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

              <h2>
                {item.title}
              </h2>

              <button
                type="button"
                className="openButton"
                onClick={() =>
                  router.push(item.href)
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

        :global(body) {
          margin: 0;
        }

        button {
          font-family:
            "Bell MT",
            "Times New Roman",
            serif;
        }

        .page {
          min-height: 100vh;

          padding:
            26px 28px
            70px;

          background:
            radial-gradient(
              circle at top,
              #ffffff 0%,
              #f4f8fa 45%,
              #edf3f5 100%
            );

          color: #111;

          font-family:
            "Bell MT",
            "Times New Roman",
            serif;
        }

        /* =========================
           TOP PANEL
        ========================== */

        .topPanel {
          width:
            min(1500px, 96%);

          min-height: 108px;

          margin:
            0 auto 75px;

          padding:
            18px 25px;

          display: flex;

          align-items: center;

          justify-content:
            space-between;

          gap: 20px;

          border:
            3px solid #0a3b58;

          border-radius: 25px;

          background:
            linear-gradient(
              180deg,
              #83d8fb 0%,
              #54bce8 45%,
              #3198c8 100%
            );

          box-shadow:
            inset 0 3px 4px
              rgba(
                255,
                255,
                255,
                0.85
              ),
            inset 0 -7px 0
              #086184,
            0 12px 0 #073b55,
            0 20px 28px
              rgba(
                0,
                0,
                0,
                0.18
              );
        }

        .backButton,
        .brand {
          min-width: 190px;

          min-height: 58px;

          padding:
            16px 22px;

          display: flex;

          align-items: center;

          justify-content:
            center;

          border:
            3px solid #59636a;

          border-radius: 15px;

          background:
            linear-gradient(
              180deg,
              #ffffff,
              #e7e7e7 60%,
              #cccccc
            );

          box-shadow:
            inset 0 3px 4px
              #ffffff,
            0 7px 0 #657077,
            0 11px 16px
              rgba(
                0,
                0,
                0,
                0.18
              );

          color: #111;

          font-size: 17px;

          font-weight: 700;
        }

        .backButton {
          cursor: pointer;
        }

        .brand {
          color: #063554;
        }

        /* =========================
           MAIN PANEL
        ========================== */

        .mainPanel {
          position: relative;

          width:
            min(1350px, 96%);

          margin: 0 auto;

          padding:
            75px 38px
            48px;

          border:
            3px solid #343b3f;

          border-radius: 26px;

          background:
            linear-gradient(
              145deg,
              #686e71 0%,
              #555b5e 45%,
              #3f4548 100%
            );

          box-shadow:
            inset 0 3px 3px
              rgba(
                255,
                255,
                255,
                0.2
              ),
            inset 0 -8px 0
              #292e31,
            0 14px 24px
              rgba(
                0,
                0,
                0,
                0.22
              );
        }

        .titlePlate {
          position: absolute;

          top: -45px;

          left: 50%;

          transform:
            translateX(-50%);

          min-width: 385px;

          padding:
            17px 35px;

          text-align: center;

          color: #063554;

          font-size: 31px;

          font-weight: 700;

          border:
            3px solid #07527a;

          border-radius: 18px;

          background:
            linear-gradient(
              180deg,
              #a3e6ff,
              #60c5ee 55%,
              #329dcc
            );

          box-shadow:
            inset 0 3px 3px
              white,
            0 8px 0 #075274,
            0 12px 18px
              rgba(
                0,
                0,
                0,
                0.25
              );
        }

        .sectionTitle {
          margin:
            0 0 38px;

          text-align: center;

          color: white;

          font-size: 28px;

          font-weight: 700;

          text-shadow:
            0 2px 2px
              rgba(
                0,
                0,
                0,
                0.7
              );
        }

        /* =========================
           CARDS
        ========================== */

        .cards {
          display: grid;

          grid-template-columns:
            repeat(3, 1fr);

          gap:
            34px 30px;
        }

        .card {
          min-height: 225px;

          padding:
            25px 24px
            22px;

          display: flex;

          flex-direction:
            column;

          align-items: center;

          justify-content:
            space-between;

          gap: 18px;

          border:
            2px solid #e5e5e5;

          border-radius: 18px;

          background:
            linear-gradient(
              145deg,
              #ffffff 0%,
              #f1f1f1 55%,
              #dddddd 100%
            );

          box-shadow:
            inset 0 4px 5px
              white,
            0 9px 0 #747d80,
            0 14px 20px
              rgba(
                0,
                0,
                0,
                0.22
              );
        }

        .card h2 {
          margin: 0;

          min-height: 60px;

          display: flex;

          align-items: center;

          justify-content:
            center;

          text-align: center;

          color: #111;

          font-size: 23px;

          line-height: 1.2;

          font-weight: 700;
        }

        .badge {
          min-width: 55px;

          height: 49px;

          padding:
            0 10px;

          display: flex;

          align-items: center;

          justify-content:
            center;

          color: #063554;

          font-size: 16px;

          font-weight: 700;

          border:
            2px solid #075277;

          border-radius: 10px;

          background:
            linear-gradient(
              180deg,
              #c7f0ff,
              #69c9ee 55%,
              #35a4d2
            );

          box-shadow:
            inset 0 2px 3px
              white,
            0 6px 0 #075274;
        }

        .openButton {
          min-width: 165px;

          padding:
            14px 25px;

          color: #063554;

          font-size: 16px;

          font-weight: 700;

          cursor: pointer;

          border:
            2px solid #075277;

          border-radius: 11px;

          background:
            linear-gradient(
              180deg,
              #bcecff,
              #65c8ef 55%,
              #35a4d2
            );

          box-shadow:
            inset 0 2px 3px
              white,
            0 6px 0 #075274;
        }

        .openButton:hover {
          filter:
            brightness(1.04);
        }

        .openButton:active,
        .backButton:active {
          transform:
            translateY(4px);

          box-shadow: none;
        }

        /* =========================
           TABLET
        ========================== */

        @media (
          max-width: 1050px
        ) {
          .cards {
            grid-template-columns:
              repeat(2, 1fr);
          }
        }

        /* =========================
           MOBILE
        ========================== */

        @media (
          max-width: 700px
        ) {
          .page {
            padding:
              16px 12px
              50px;
          }

          .topPanel {
            width: 100%;

            margin-bottom: 65px;

            padding: 14px;

            flex-direction:
              column;
          }

          .backButton,
          .brand {
            width: 100%;

            min-width: 0;
          }

          .mainPanel {
            width: 100%;

            padding:
              65px 15px
              28px;
          }

          .titlePlate {
            min-width: 250px;

            width:
              calc(100% - 40px);

            padding:
              14px 15px;

            font-size: 25px;
          }

          .sectionTitle {
            font-size: 23px;

            margin-bottom: 28px;
          }

          .cards {
            grid-template-columns:
              1fr;

            gap: 27px;
          }

          .card {
            min-height: 200px;
          }
        }
      `}</style>
    </main>
  );
}
