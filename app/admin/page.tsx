"use client";

import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();

  const cards = [
    {
      title: "Foydalanuvchilar va ruxsatlar",
      description:
        "Foydalanuvchilar, kirish kodlari va saytga kirish so‘rovlarini boshqarish.",
      path: "/admin/requests",
    },
    {
      title: "Lug‘at boshqaruvi",
      description:
        "4000 Essential English Words bo‘yicha kitob, unit, so‘z va misol gaplarni boshqarish.",
      path: "/admin/dictionary",
    },
    {
      title: "Testlar",
      description:
        "Saytdagi testlarni boshqarish va test tizimini nazorat qilish.",
      path: "/admin/tests",
    },
    {
      title: "Natijalar",
      description:
        "Foydalanuvchilarning test natijalari va ko‘rsatkichlarini ko‘rish.",
      path: "/admin/results",
    },
  ];

  return (
    <main className="adminPage">
      {/* ================= HEADER ================= */}

      <header className="topHeader">
        <div className="brandBox">
          Qurbonov Siyovush Jamaliddinzoda
        </div>

        <div className="headerButtons">
          <button
            type="button"
            className="headerButton"
            onClick={() => router.push("/")}
          >
            Asosiy sahifa
          </button>

          <button
            type="button"
            className="logoutButton"
            onClick={() => router.push("/logout")}
          >
            Chiqish
          </button>
        </div>
      </header>

      {/* ================= ADMIN TITLE ================= */}

      <section className="adminContainer">
        <div className="smallTitle">Admin panel</div>

        <div className="heroPanel">
          <h1>Sayt boshqaruv markazi</h1>

          <p>
            Kerakli bo‘limni tanlang va sayt ma’lumotlarini boshqaring.
          </p>
        </div>

        {/* ================= CARDS ================= */}

        <div className="cardsGrid">
          {cards.map((card) => (
            <article className="adminCard" key={card.title}>
              <div className="cardHeader">
                <h2>{card.title}</h2>
              </div>

              <div className="cardBody">
                <p>{card.description}</p>

                <button
                  type="button"
                  className="manageButton"
                  onClick={() => router.push(card.path)}
                >
                  Boshqarish →
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .adminPage {
          min-height: 100vh;
          width: 100%;
          margin: 0;
          padding: 28px 35px 70px;
          background:
            radial-gradient(
              circle at top,
              rgba(75, 165, 215, 0.12),
              transparent 38%
            ),
            linear-gradient(
              180deg,
              #ffffff 0%,
              #f2f5f7 55%,
              #e7ecef 100%
            );
          font-family: "Bell MT", "Times New Roman", serif;
          color: #102f45;
        }

        /* =====================================================
           HEADER
        ===================================================== */

        .topHeader {
          width: min(1450px, 96%);
          min-height: 105px;
          margin: 0 auto;
          padding: 20px 25px;

          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 25px;

          border: 3px solid #164d6b;
          border-radius: 24px;

          background: linear-gradient(
            180deg,
            #7cc8ef 0%,
            #54addb 47%,
            #348fc0 100%
          );

          box-shadow:
            0 8px 0 #164d6b,
            0 15px 24px rgba(0, 0, 0, 0.2),
            inset 0 2px 2px rgba(255, 255, 255, 0.8);
        }

        .brandBox {
          min-height: 58px;
          padding: 0 30px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 2px solid #6a7479;
          border-radius: 13px;

          background: linear-gradient(
            180deg,
            #ffffff 0%,
            #e9e9e9 48%,
            #c7c7c7 100%
          );

          box-shadow:
            0 5px 0 #667176,
            0 8px 12px rgba(0, 0, 0, 0.2),
            inset 0 2px 2px rgba(255, 255, 255, 0.95);

          color: #111;
          font-size: 21px;
          font-weight: 700;
          white-space: nowrap;
        }

        .headerButtons {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .headerButton,
        .logoutButton {
          min-width: 135px;
          height: 55px;
          padding: 0 24px;

          border-radius: 12px;

          font-family: inherit;
          font-size: 16px;
          font-weight: 700;

          cursor: pointer;

          transition:
            transform 0.15s ease,
            box-shadow 0.15s ease;
        }

        .headerButton {
          border: 2px solid #6c7478;

          background: linear-gradient(
            180deg,
            #ffffff 0%,
            #e9e9e9 52%,
            #c8c8c8 100%
          );

          color: #111;

          box-shadow:
            0 4px 0 #606a6e,
            0 7px 10px rgba(0, 0, 0, 0.15);
        }

        .logoutButton {
          border: 2px solid #164d6b;

          background: linear-gradient(
            180deg,
            #69bee9 0%,
            #3d9aca 50%,
            #287aa5 100%
          );

          color: #ffffff;

          box-shadow:
            0 4px 0 #164d6b,
            0 7px 10px rgba(0, 0, 0, 0.18);
        }

        .headerButton:hover,
        .logoutButton:hover {
          transform: translateY(-2px);
        }

        .headerButton:active,
        .logoutButton:active {
          transform: translateY(3px);
          box-shadow: none;
        }

        /* =====================================================
           MAIN CONTAINER
        ===================================================== */

        .adminContainer {
          position: relative;

          width: min(1250px, 92%);
          margin: 75px auto 0;
        }

        /* =====================================================
           ADMIN PANEL SMALL TITLE
        ===================================================== */

        .smallTitle {
          position: absolute;
          z-index: 10;

          top: -42px;
          left: 50%;
          transform: translateX(-50%);

          min-width: 270px;
          height: 72px;
          padding: 0 35px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 3px solid #175272;
          border-radius: 16px;

          background: linear-gradient(
            180deg,
            #86cff3 0%,
            #5eb5df 48%,
            #368fbd 100%
          );

          box-shadow:
            0 7px 0 #175272,
            0 12px 17px rgba(0, 0, 0, 0.2),
            inset 0 2px 2px rgba(255, 255, 255, 0.8);

          color: #123f5d;

          font-size: 29px;
          font-weight: 700;
        }

        /* =====================================================
           HERO
        ===================================================== */

        .heroPanel {
          min-height: 235px;

          padding: 75px 40px 45px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          text-align: center;

          border: 3px solid #343b3f;
          border-radius: 25px;

          background: linear-gradient(
            145deg,
            #6e7478 0%,
            #555b5f 45%,
            #3e4448 100%
          );

          box-shadow:
            0 9px 0 #292f32,
            0 18px 28px rgba(0, 0, 0, 0.2),
            inset 0 2px 2px rgba(255, 255, 255, 0.2);

          color: #ffffff;
        }

        .heroPanel h1 {
          margin: 0;

          font-size: clamp(32px, 3vw, 46px);
          line-height: 1.2;
          font-weight: 700;

          text-shadow: 0 2px 2px rgba(0, 0, 0, 0.5);
        }

        .heroPanel p {
          margin: 20px 0 0;

          font-size: 19px;
          line-height: 1.6;
          font-weight: 600;

          color: #eef4f7;
        }

        /* =====================================================
           GRID
        ===================================================== */

        .cardsGrid {
          width: 100%;

          margin-top: 65px;

          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));

          gap: 45px;
        }

        /* =====================================================
           CARDS
        ===================================================== */

        .adminCard {
          min-height: 315px;

          overflow: hidden;

          display: flex;
          flex-direction: column;

          border: 3px solid #343b3f;
          border-radius: 22px;

          background: #484e52;

          box-shadow:
            0 9px 0 #2b3033,
            0 16px 25px rgba(0, 0, 0, 0.2);

          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .adminCard:hover {
          transform: translateY(-5px);

          box-shadow:
            0 12px 0 #2b3033,
            0 22px 32px rgba(0, 0, 0, 0.24);
        }

        .cardHeader {
          min-height: 92px;

          padding: 20px 30px;

          display: flex;
          align-items: center;
          justify-content: center;

          text-align: center;

          border-bottom: 4px solid #175272;

          background: linear-gradient(
            180deg,
            #7dc9ef 0%,
            #59b1dc 48%,
            #368fbd 100%
          );

          box-shadow:
            inset 0 2px 2px rgba(255, 255, 255, 0.7),
            0 4px 8px rgba(0, 0, 0, 0.22);
        }

        .cardHeader h2 {
          margin: 0;

          color: #123f5d;

          font-size: clamp(23px, 2vw, 30px);
          line-height: 1.2;
          font-weight: 700;
        }

        .cardBody {
          flex: 1;

          padding: 32px 35px 30px;

          display: flex;
          flex-direction: column;
          align-items: flex-start;

          background: linear-gradient(
            145deg,
            #5c6266 0%,
            #484e52 50%,
            #3c4246 100%
          );
        }

        .cardBody p {
          flex: 1;

          margin: 0 0 30px;

          color: #ffffff;

          font-size: 18px;
          line-height: 1.7;
          font-weight: 600;
        }

        /* =====================================================
           MANAGE BUTTON
        ===================================================== */

        .manageButton {
          min-width: 155px;
          height: 52px;

          padding: 0 25px;

          border: 2px solid #697378;
          border-radius: 11px;

          background: linear-gradient(
            180deg,
            #ffffff 0%,
            #e8e8e8 48%,
            #c6c6c6 100%
          );

          box-shadow:
            0 5px 0 #626c70,
            0 8px 12px rgba(0, 0, 0, 0.22),
            inset 0 2px 2px rgba(255, 255, 255, 0.95);

          color: #173d55;

          font-family: inherit;
          font-size: 16px;
          font-weight: 700;

          cursor: pointer;

          transition:
            transform 0.15s ease,
            box-shadow 0.15s ease,
            background 0.15s ease;
        }

        .manageButton:hover {
          transform: translateY(-2px);

          background: linear-gradient(
            180deg,
            #e7f6fd 0%,
            #c7e9f8 50%,
            #a8d5ea 100%
          );
        }

        .manageButton:active {
          transform: translateY(4px);
          box-shadow: none;
        }

        /* =====================================================
           TABLET
        ===================================================== */

        @media (max-width: 900px) {
          .adminPage {
            padding: 20px 18px 60px;
          }

          .topHeader {
            width: 100%;

            flex-direction: column;

            padding: 20px;
          }

          .brandBox {
            width: 100%;
            white-space: normal;
            text-align: center;
          }

          .headerButtons {
            width: 100%;
          }

          .headerButton,
          .logoutButton {
            flex: 1;
          }

          .adminContainer {
            width: 100%;
          }

          .cardsGrid {
            grid-template-columns: 1fr;
            gap: 38px;
          }

          .adminCard {
            min-height: 290px;
          }
        }

        /* =====================================================
           MOBILE
        ===================================================== */

        @media (max-width: 520px) {
          .adminPage {
            padding: 15px 10px 50px;
          }

          .topHeader {
            border-radius: 17px;
          }

          .brandBox {
            padding: 15px;

            font-size: 17px;
          }

          .headerButtons {
            flex-direction: column;
          }

          .headerButton,
          .logoutButton {
            width: 100%;
          }

          .adminContainer {
            margin-top: 65px;
          }

          .smallTitle {
            min-width: 210px;
            height: 62px;

            font-size: 23px;
          }

          .heroPanel {
            min-height: 220px;

            padding: 65px 20px 35px;
          }

          .heroPanel h1 {
            font-size: 29px;
          }

          .heroPanel p {
            font-size: 16px;
          }

          .cardsGrid {
            margin-top: 45px;
          }

          .cardHeader {
            min-height: 78px;
            padding: 15px;
          }

          .cardHeader h2 {
            font-size: 22px;
          }

          .cardBody {
            padding: 25px 22px;
          }

          .cardBody p {
            font-size: 16px;
          }

          .manageButton {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}
