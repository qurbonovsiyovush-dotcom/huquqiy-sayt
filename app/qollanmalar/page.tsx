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
      {/* TEPA 3D PANEL */}
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

      {/* ASOSIY PANEL */}
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
            18px
            55px;

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

        /* =========================
           TEPA PANEL
        ========================= */

        .topPanel {
          width: min(1850px, 100%);

          min-height: 140px;

          margin: 0 auto 35px;

          padding:
            28px
            35px;

          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 30px;

          border:
            3px solid
            #123d52;

          border-radius: 30px;

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

        /* =========================
           CHAP SARLAVHA
        ========================= */

        .pageTitle {
          min-width: 480px;

          min-height: 78px;

          padding:
            15px
            35px;

          display: flex;

          align-items: center;

          justify-content: center;

          border:
            3px solid
            #4f5c62;

          border-radius:
            18px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #ececec 48%,
              #d4d4d4 100%
            );

          box-shadow:
            inset 0 6px 7px
              rgba(
                255,
                255,
                255,
                0.9
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

          font-size: 33px;

          font-weight: 900;
        }

        /* =========================
           ORQAGA
        ========================= */

        .backButton {
          min-width: 165px;

          min-height: 66px;

          padding:
            10px
            25px;

          border:
            3px solid
            #4e5b61;

          border-radius:
            16px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #ececec 48%,
              #d1d1d1 100%
            );

          box-shadow:
            inset 0 5px 6px
              rgba(
                255,
                255,
                255,
                0.9
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
                0.9
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

        /* =========================
           ASOSIY PANEL
        ========================= */

        .mainPanel {
          width: min(1160px, 100%);

          margin: 0 auto;

          padding:
            35px
            30px
            45px;

          border:
            2px solid
            #30383b;

          border-radius:
            22px;

          background:
            linear-gradient(
              180deg,
              #656a6c 0%,
              #53595b 50%,
              #3f4648 100%
            );

          box-shadow:
            inset 0 5px 7px
              rgba(
                255,
                255,
                255,
                0.12
              ),
            inset 0 -8px 10px
              rgba(
                0,
                0,
                0,
                0.22
              ),
            0 10px 0
              #303638,
            0 17px 26px
              rgba(
                0,
                0,
                0,
                0.22
              );
        }

        .heading {
          margin:
            0
            0
            32px;

          color: #fff;

          text-align: center;

          font-size: 28px;

          font-weight: 900;

          text-shadow:
            0 2px 2px
              rgba(
                0,
                0,
                0,
                0.65
              );
        }

        /* =========================
           KARTALAR
        ========================= */

        .cards {
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
            30px
            28px;
        }

        .card {
          min-height: 245px;

          padding:
            23px
            20px
            22px;

          display: flex;

          flex-direction:
            column;

          align-items: center;

          border:
            1px solid
            #d0d0d0;

          border-radius:
            14px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #f5f5f5 55%,
              #e5e5e5 100%
            );

          box-shadow:
            inset 0 5px 7px
              rgba(
                255,
                255,
                255,
                0.95
              ),
            0 8px 0
              #858c8e,
            0 13px 18px
              rgba(
                0,
                0,
                0,
                0.22
              );

          text-align:
            center;
        }

        .badge {
          width: 56px;

          height: 47px;

          display: flex;

          align-items:
            center;

          justify-content:
            center;

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

        .card h2 {
          width: 100%;

          margin:
            26px
            0
            0;

          color: #111;

          font-size: 23px;

          line-height: 1.15;

          font-weight: 900;
        }

        .openButton {
          width: 145px;

          min-height: 44px;

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
        }

        /* =========================
           TABLET
        ========================= */

        @media (
          max-width: 900px
        ) {
          .topPanel {
            min-height: 115px;

            padding:
              22px
              25px;
          }

          .pageTitle {
            min-width: 350px;

            font-size: 27px;
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

        /* =========================
           MOBILE
        ========================= */

        @media (
          max-width: 600px
        ) {
          .page {
            padding:
              10px
              8px
              40px;
          }

          .topPanel {
            min-height: 100px;

            padding:
              15px;

            border-radius:
              18px;

            gap: 12px;
          }

          .pageTitle {
            min-width: 0;

            flex: 1;

            min-height: 58px;

            padding:
              10px
              12px;

            font-size: 21px;

            border-radius:
              12px;
          }

          .backButton {
            min-width: 90px;

            min-height: 52px;

            padding:
              8px
              10px;

            font-size: 13px;

            border-radius:
              11px;
          }

          .mainPanel {
            padding:
              30px
              15px;

            border-radius:
              17px;
          }

          .heading {
            font-size: 22px;
          }

          .cards {
            grid-template-columns:
              1fr;

            gap: 25px;
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
