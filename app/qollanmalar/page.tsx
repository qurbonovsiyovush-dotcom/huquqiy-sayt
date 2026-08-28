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
      <section className="panel">
        {/* TEPA TUGMALAR */}
        <div className="topActions">
          <button
            type="button"
            className="navButton"
            onClick={() => router.back()}
          >
            ← Orqaga
          </button>

          <button
            type="button"
            className="navButton"
            onClick={() => router.push("/")}
          >
            ⌂ Asosiy sahifa
          </button>
        </div>

        {/* ASOSIY SARLAVHA */}
        <div className="titlePlate">Qo‘llanmalar</div>

        <h1 className="heading">Kerakli bo‘limni tanlang</h1>

        {/* KARTALAR */}
        <div className="cards">
          {cards.map((card) => (
            <article className="card" key={card.title}>
              <div className="badge">{card.badge}</div>

              <h2>{card.title}</h2>

              <button
                type="button"
                className="openButton"
                onClick={() => router.push(card.href)}
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

          padding: 45px 18px 60px;

          display: flex;
          justify-content: center;
          align-items: flex-start;

          background: radial-gradient(
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

        /* =========================
           ASOSIY PANEL
        ========================= */

        .panel {
          position: relative;

          width: min(1160px, 100%);

          padding: 95px 30px 45px;

          border: 2px solid #30383b;
          border-radius: 22px;

          background: linear-gradient(
            180deg,
            #656a6c 0%,
            #53595b 50%,
            #3f4648 100%
          );

          box-shadow:
            inset 0 5px 7px rgba(255, 255, 255, 0.12),
            inset 0 -8px 10px rgba(0, 0, 0, 0.22),
            0 10px 0 #303638,
            0 17px 26px rgba(0, 0, 0, 0.22);
        }

        /* =========================
           QO‘LLANMALAR SARLAVHASI
        ========================= */

        .titlePlate {
          position: absolute;

          top: -25px;
          left: 50%;

          transform: translateX(-50%);

          min-width: 320px;

          padding: 11px 35px;

          border: 2px solid #07506d;
          border-radius: 0 0 11px 11px;

          background: linear-gradient(
            180deg,
            #8ae0fa 0%,
            #58bfe7 52%,
            #319dcc 100%
          );

          box-shadow:
            inset 0 5px 5px rgba(255, 255, 255, 0.65),
            0 7px 0 #07506d,
            0 11px 14px rgba(0, 0, 0, 0.22);

          color: #073f6d;

          text-align: center;

          font-size: 31px;
          font-weight: 900;

          z-index: 10;
        }

        /* =========================
           ORQAGA / ASOSIY SAHIFA
        ========================= */

        .topActions {
          position: absolute;

          top: 25px;
          left: 30px;
          right: 30px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 20px;
        }

        .navButton {
          min-width: 155px;
          min-height: 43px;

          padding: 8px 18px;

          border: 2px solid #07506d;
          border-radius: 9px;

          background: linear-gradient(
            180deg,
            #e3f9ff 0%,
            #8bd9f3 43%,
            #48b3dc 100%
          );

          box-shadow:
            inset 0 4px 4px rgba(255, 255, 255, 0.8),
            inset 0 -3px 4px rgba(0, 0, 0, 0.08),
            0 5px 0 #07506d,
            0 9px 12px rgba(0, 0, 0, 0.25);

          color: #073f65;

          font-family:
            "Bell MT",
            "Times New Roman",
            Georgia,
            serif;

          font-size: 14px;
          font-weight: 900;

          cursor: pointer;

          transition:
            transform 0.12s ease,
            box-shadow 0.12s ease,
            filter 0.12s ease;
        }

        .navButton:hover {
          transform: translateY(-2px);

          filter: brightness(1.04);

          box-shadow:
            inset 0 4px 4px rgba(255, 255, 255, 0.8),
            0 7px 0 #07506d,
            0 12px 15px rgba(0, 0, 0, 0.27);
        }

        .navButton:active {
          transform: translateY(4px);

          box-shadow:
            inset 0 3px 5px rgba(0, 0, 0, 0.1),
            0 2px 0 #07506d;
        }

        /* =========================
           BO‘LIM SARLAVHASI
        ========================= */

        .heading {
          margin: 0 0 32px;

          color: #ffffff;

          text-align: center;

          font-size: 28px;
          font-weight: 900;

          text-shadow: 0 2px 2px rgba(0, 0, 0, 0.65);
        }

        /* =========================
           KARTALAR
        ========================= */

        .cards {
          display: grid;

          grid-template-columns: repeat(3, minmax(0, 1fr));

          gap: 30px 28px;
        }

        .card {
          min-height: 245px;

          padding: 23px 20px 22px;

          display: flex;
          flex-direction: column;
          align-items: center;

          border: 1px solid #d0d0d0;
          border-radius: 14px;

          background: linear-gradient(
            180deg,
            #ffffff 0%,
            #f5f5f5 55%,
            #e5e5e5 100%
          );

          box-shadow:
            inset 0 5px 7px rgba(255, 255, 255, 0.95),
            0 8px 0 #858c8e,
            0 13px 18px rgba(0, 0, 0, 0.22);

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
            0 16px 22px rgba(0, 0, 0, 0.25);
        }

        /* =========================
           BADGE
        ========================= */

        .badge {
          width: 56px;
          height: 47px;

          display: flex;
          align-items: center;
          justify-content: center;

          flex-shrink: 0;

          border: 2px solid #07506d;
          border-radius: 10px;

          background: linear-gradient(
            180deg,
            #e1f8ff 0%,
            #78d1f0 48%,
            #3ca8d5 100%
          );

          box-shadow:
            inset 0 4px 4px rgba(255, 255, 255, 0.8),
            0 5px 0 #07506d;

          color: #063e68;

          font-size: 16px;
          font-weight: 900;
        }

        /* =========================
           KARTA NOMI
        ========================= */

        .card h2 {
          width: 100%;

          margin: 26px 0 0;

          color: #111;

          font-size: 23px;
          line-height: 1.15;
          font-weight: 900;
        }

        /* =========================
           OCHISH TUGMASI
        ========================= */

        .openButton {
          width: 145px;
          min-height: 44px;

          margin-top: auto;

          border: 2px solid #07506d;
          border-radius: 9px;

          background: linear-gradient(
            180deg,
            #d9f6ff 0%,
            #75cfee 48%,
            #38a7d5 100%
          );

          box-shadow:
            inset 0 4px 4px rgba(255, 255, 255, 0.75),
            0 6px 0 #07506d,
            0 10px 12px rgba(0, 0, 0, 0.18);

          color: #073e65;

          font-family:
            "Bell MT",
            "Times New Roman",
            Georgia,
            serif;

          font-size: 14px;
          font-weight: 900;

          cursor: pointer;

          transition:
            transform 0.12s ease,
            box-shadow 0.12s ease;
        }

        .openButton:hover {
          transform: translateY(-2px);

          box-shadow:
            inset 0 4px 4px rgba(255, 255, 255, 0.75),
            0 8px 0 #07506d,
            0 12px 14px rgba(0, 0, 0, 0.2);
        }

        .openButton:active {
          transform: translateY(4px);

          box-shadow:
            inset 0 3px 4px rgba(0, 0, 0, 0.08),
            0 2px 0 #07506d;
        }

        /* =========================
           TABLET
        ========================= */

        @media (max-width: 900px) {
          .panel {
            padding-top: 105px;
          }

          .cards {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .navButton {
            min-width: 135px;
          }
        }

        /* =========================
           TELEFON
        ========================= */

        @media (max-width: 600px) {
          .page {
            padding: 35px 10px 40px;
          }

          .panel {
            padding: 90px 15px 30px;

            border-radius: 17px;
          }

          .titlePlate {
            top: -20px;

            min-width: 220px;

            padding: 9px 18px;

            font-size: 24px;
          }

          .topActions {
            top: 28px;
            left: 14px;
            right: 14px;

            gap: 10px;
          }

          .navButton {
            min-width: 0;
            width: 50%;

            padding: 7px 5px;

            font-size: 12px;
          }

          .heading {
            margin-bottom: 25px;

            font-size: 22px;
          }

          .cards {
            grid-template-columns: 1fr;

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
