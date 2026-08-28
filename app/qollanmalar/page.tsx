"use client";

import { useRouter } from "next/navigation";

type GuideCard = {
  title: string;
  href: string;
  badge: string;
};

const cards: GuideCard[] = [
  {
    title: "Kodekslar",
    href: "/qollanmalar/kodekslar",
    badge: "K",
  },
  {
    title: "Qonun va qonunchilik hujjatlari",
    href: "/qollanmalar/qonunlar",
    badge: "Q",
  },
  {
    title: "Darsliklar",
    href: "/qollanmalar/darsliklar",
    badge: "D",
  },
  {
    title: "English Vocabulary",
    href: "/qollanmalar/english-vocabulary",
    badge: "EN",
  },
  {
    title: "Inglizcha lug‘atlar",
    href: "/qollanmalar/dictionaries",
    badge: "L",
  },
];

export default function QollanmalarPage() {
  const router = useRouter();

  return (
    <main className="page">
      {/* =========================
          TEPA 3D PANEL
      ========================== */}

      <section className="topPanel">
        <div className="pageTitle">
          Qo‘llanmalar
        </div>

        <button
          type="button"
          className="backButton"
          onClick={() => router.back()}
        >
          Orqaga
        </button>
      </section>

      {/* =========================
          ASOSIY 3D PANEL
      ========================== */}

      <section className="mainPanel">
        <h1 className="heading">
          Kerakli bo‘limni tanlang
        </h1>

        <div className="cards">
          {cards.map((card) => (
            <article
              className="card"
              key={card.title}
            >
              <div className="badge">
                {card.badge}
              </div>

              <h2>{card.title}</h2>

              <button
                type="button"
                className="openButton"
                onClick={() =>
                  router.push(card.href)
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

          padding:
            16px
            20px
            60px;

          background:
            radial-gradient(
              circle at top,
              #ffffff 0%,
              #f3f6f7 48%,
              #e8edef 100%
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

        /* ==================================================
           TEPA KO‘K PANEL
        ================================================== */

        .topPanel {
          width: min(1850px, 100%);

          min-height: 140px;

          margin:
            0
            auto
            34px;

          padding:
            28px
            35px;

          display: flex;

          align-items: center;

          justify-content:
            space-between;

          gap: 30px;

          border:
            3px solid
            #123d52;

          border-radius:
            30px;

          background:
            linear-gradient(
              180deg,
              #8ad8fb 0%,
              #63b8e5 50%,
              #429dce 100%
            );

          box-shadow:
            inset 0 7px 7px
              rgba(
                255,
                255,
                255,
                0.5
              ),
            inset 0 -8px 8px
              rgba(
                0,
                0,
                0,
                0.12
              ),
            0 11px 0
              #123d52,
            0 18px 25px
              rgba(
                0,
                0,
                0,
                0.2
              );
        }

        /* ==================================================
           QO‘LLANMALAR BLOKI
        ================================================== */

        .pageTitle {
          width: 480px;

          max-width: 45%;

          min-height: 78px;

          padding:
            14px
            30px;

          display: flex;

          align-items: center;

          justify-content:
            center;

          border:
            3px solid
            #4f5c62;

          border-radius:
            18px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #eeeeee 48%,
              #d5d5d5 100%
            );

          box-shadow:
            inset 0 6px 7px
              rgba(
                255,
                255,
                255,
                0.95
              ),
            inset 0 -5px 6px
              rgba(
                0,
                0,
                0,
                0.08
              ),
            0 8px 0
              #4d595e,
            0 13px 16px
              rgba(
                0,
                0,
                0,
                0.2
              );

          color: #111;

          text-align: center;

          font-size: 33px;

          font-weight: 900;
        }

        /* ==================================================
           ORQAGA TUGMASI
        ================================================== */

        .backButton {
          width: 170px;

          min-height: 66px;

          padding:
            10px
            24px;

          border:
            3px solid
            #4e5b61;

          border-radius:
            16px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #eeeeee 48%,
              #d3d3d3 100%
            );

          box-shadow:
            inset 0 5px 6px
              rgba(
                255,
                255,
                255,
                0.95
              ),
            inset 0 -4px 5px
              rgba(
                0,
                0,
                0,
                0.08
              ),
            0 7px 0
              #4e5b61,
            0 11px 14px
              rgba(
                0,
                0,
                0,
                0.2
              );

          color: #111;

          font-size: 17px;

          font-weight: 900;

          cursor: pointer;

          transition:
            transform
            0.1s ease,
            box-shadow
            0.1s ease;
        }

        .backButton:hover {
          transform:
            translateY(-2px);

          box-shadow:
            inset 0 5px 6px
              rgba(
                255,
                255,
                255,
                0.95
              ),
            0 9px 0
              #4e5b61,
            0 14px 17px
              rgba(
                0,
                0,
                0,
                0.22
              );
        }

        .backButton:active {
          transform:
            translateY(4px);

          box-shadow:
            inset 0 4px 5px
              rgba(
                0,
                0,
                0,
                0.08
              ),
            0 2px 0
              #4e5b61;
        }

        /* ==================================================
           PASTDAGI ASOSIY PANEL
           TEPA PANEL BILAN BIR XIL KENGLIK
        ================================================== */

        .mainPanel {
          width: min(1850px, 100%);

          margin: 0 auto;

          padding:
            38px
            34px
            48px;

          border:
            2px solid
            #30383b;

          border-radius:
            26px;

          background:
            linear-gradient(
              180deg,
              #666b6d 0%,
              #53595b 50%,
              #3e4547 100%
            );

          box-shadow:
            inset 0 6px 8px
              rgba(
                255,
                255,
                255,
                0.12
              ),
            inset 0 -9px 11px
              rgba(
                0,
                0,
                0,
                0.22
              ),
            0 10px 0
              #303638,
            0 18px 27px
              rgba(
                0,
                0,
                0,
                0.22
              );
        }

        /* ==================================================
           SARLAVHA
        ================================================== */

        .heading {
          margin:
            0
            0
            34px;

          color: #fff;

          text-align: center;

          font-size: 29px;

          font-weight: 900;

          text-shadow:
            0 2px 2px
              rgba(
                0,
                0,
                0,
                0.7
              );
        }

        /* ==================================================
           KARTALAR
        ================================================== */

        .cards {
          width: 100%;

          display: grid;

          grid-template-columns:
            repeat(
              3,
              minmax(
                0,
                1fr
              )
            );

          gap:
            32px
            30px;
        }

        .card {
          min-height: 260px;

          padding:
            25px
            24px
            24px;

          display: flex;

          flex-direction:
            column;

          align-items: center;

          border:
            1px solid
            #d0d0d0;

          border-radius:
            15px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #f5f5f5 55%,
              #e4e4e4 100%
            );

          box-shadow:
            inset 0 5px 7px
              rgba(
                255,
                255,
                255,
                0.96
              ),
            0 8px 0
              #858c8e,
            0 14px 19px
              rgba(
                0,
                0,
                0,
                0.22
              );

          text-align: center;

          transition:
            transform
            0.15s ease,
            box-shadow
            0.15s ease;
        }

        .card:hover {
          transform:
            translateY(-3px);

          box-shadow:
            inset 0 5px 7px
              rgba(
                255,
                255,
                255,
                0.96
              ),
            0 10px 0
              #858c8e,
            0 17px 22px
              rgba(
                0,
                0,
                0,
                0.25
              );
        }

        /* ==================================================
           KICHIK KO‘K BELGI
        ================================================== */

        .badge {
          width: 58px;

          height: 49px;

          display: flex;

          align-items: center;

          justify-content:
            center;

          flex-shrink: 0;

          border:
            2px solid
            #07506d;

          border-radius:
            10px;

          background:
            linear-gradient(
              180deg,
              #e1f8ff 0%,
              #78d1f0 48%,
              #3ca8d5 100%
            );

          box-shadow:
            inset 0 4px 4px
              rgba(
                255,
                255,
                255,
                0.8
              ),
            0 5px 0
              #07506d;

          color: #063e68;

          font-size: 16px;

          font-weight: 900;
        }

        /* ==================================================
           KARTA NOMI
        ================================================== */

        .card h2 {
          width: 100%;

          margin:
            28px
            0
            0;

          color: #111;

          font-size: 24px;

          line-height: 1.15;

          font-weight: 900;
        }

        /* ==================================================
           OCHISH
        ================================================== */

        .openButton {
          width: 155px;

          min-height: 47px;

          margin-top: auto;

          border:
            2px solid
            #07506d;

          border-radius:
            9px;

          background:
            linear-gradient(
              180deg,
              #d9f6ff 0%,
              #75cfee 48%,
              #38a7d5 100%
            );

          box-shadow:
            inset 0 4px 4px
              rgba(
                255,
                255,
                255,
                0.75
              ),
            0 6px 0
              #07506d,
            0 10px 12px
              rgba(
                0,
                0,
                0,
                0.18
              );

          color: #073e65;

          font-size: 14px;

          font-weight: 900;

          cursor: pointer;

          transition:
            transform
            0.1s ease,
            box-shadow
            0.1s ease;
        }

        .openButton:hover {
          transform:
            translateY(-2px);

          box-shadow:
            inset 0 4px 4px
              rgba(
                255,
                255,
                255,
                0.75
              ),
            0 8px 0
              #07506d,
            0 12px 14px
              rgba(
                0,
                0,
                0,
                0.2
              );
        }

        .openButton:active {
          transform:
            translateY(4px);

          box-shadow:
            inset 0 3px 4px
              rgba(
                0,
                0,
                0,
                0.08
              ),
            0 2px 0
              #07506d;
        }

        /* ==================================================
           KATTA MONITOR
        ================================================== */

        @media (
          min-width: 1500px
        ) {
          .mainPanel {
            padding:
              40px
              45px
              50px;
          }

          .cards {
            gap:
              34px
              36px;
          }

          .card {
            min-height: 275px;
          }
        }

        /* ==================================================
           TABLET
        ================================================== */

        @media (
          max-width: 1000px
        ) {
          .topPanel {
            min-height: 115px;

            padding:
              22px
              25px;
          }

          .pageTitle {
            width: 360px;

            font-size: 27px;
          }

          .mainPanel {
            padding:
              32px
              24px
              42px;
          }

          .cards {
            grid-template-columns:
              repeat(
                2,
                minmax(
                  0,
                  1fr
                )
              );
          }
        }

        /* ==================================================
           TELEFON
        ================================================== */

        @media (
          max-width: 620px
        ) {
          .page {
            padding:
              10px
              8px
              40px;
          }

          .topPanel {
            min-height: 96px;

            padding: 14px;

            border-radius:
              18px;

            gap: 12px;
          }

          .pageTitle {
            width: auto;

            max-width: none;

            flex: 1;

            min-height: 58px;

            padding:
              10px
              12px;

            border-radius:
              12px;

            font-size: 21px;
          }

          .backButton {
            width: 92px;

            min-height: 52px;

            padding:
              7px
              8px;

            border-radius:
              11px;

            font-size: 13px;
          }

          .mainPanel {
            padding:
              28px
              14px
              32px;

            border-radius:
              18px;
          }

          .heading {
            margin-bottom: 25px;

            font-size: 22px;
          }

          .cards {
            grid-template-columns:
              1fr;

            gap: 25px;
          }

          .card {
            min-height: 220px;
          }

          .card h2 {
            font-size: 21px;
          }
        }
      `}</style>
    </main>
  );
}
