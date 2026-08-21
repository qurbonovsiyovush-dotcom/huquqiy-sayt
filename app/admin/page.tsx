"use client";

import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();

  const sections = [
    {
      title: "Foydalanuvchilar va ruxsatlar",
      subtitle:
        "Kirish kodlari, foydalanuvchilar va saytga kirish so‘rovlarini boshqarish.",
      href: "/admin/requests",
      symbol: "👥",
    },
    {
      title: "Lug‘at boshqaruvi",
      subtitle:
        "4000 Essential English Words bo‘yicha Book, Unit, so‘z va misol gaplarni boshqarish.",
      href: "/admin/dictionary",
      symbol: "📚",
    },
    {
      title: "Testlar",
      subtitle:
        "Saytdagi testlarni yaratish, tahrirlash va boshqarish.",
      href: "/admin/tests",
      symbol: "📝",
    },
    {
      title: "Natijalar",
      subtitle:
        "Foydalanuvchilarning test natijalari va ko‘rsatkichlarini ko‘rish.",
      href: "/admin/results",
      symbol: "📊",
    },
  ];

  return (
    <main className="page">
      {/* =====================================================
          TOP PANEL
      ===================================================== */}

      <header className="topPanel">
        <button
          type="button"
          className="namePlate"
          onClick={() => router.push("/")}
        >
          Qurbonov Siyovush Jamaliddinzoda
        </button>

        <div className="topButtons">
          <button
            type="button"
            className="topButton"
            onClick={() => router.push("/")}
          >
            Asosiy sahifa
          </button>

          <button
            type="button"
            className="exitButton"
            onClick={() => router.push("/logout")}
          >
            Chiqish
          </button>
        </div>
      </header>

      {/* =====================================================
          ADMIN HERO
      ===================================================== */}

      <section className="adminHero">
        <div className="sectionTitle">
          Admin panel
        </div>

        <h1>
          Sayt boshqaruv markazi
        </h1>

        <p>
          Kerakli bo‘limni tanlang va sayt ma’lumotlarini boshqaring.
        </p>
      </section>

      {/* =====================================================
          ADMIN CARDS
      ===================================================== */}

      <section className="cardsSection">
        <div className="cardsGrid">
          {sections.map((section) => (
            <button
              type="button"
              key={section.href}
              className="adminCard"
              onClick={() =>
                router.push(section.href)
              }
            >
              <div className="cardTop">
                <div className="cardIcon">
                  {section.symbol}
                </div>

                <div className="cardTitle">
                  {section.title}
                </div>
              </div>

              <div className="cardBody">
                <p>
                  {section.subtitle}
                </p>

                <div className="manageButton">
                  Boshqarish →
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="footer">
        Admin boshqaruv paneli
      </footer>

      {/* =====================================================
          CSS
      ===================================================== */}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          padding: 18px 18px 80px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #f4f7f9 55%,
              #e9eef2 100%
            );

          font-family:
            "Bell MT",
            "Times New Roman",
            serif;

          color: #0a3553;
        }

        /* =====================================================
           TOP PANEL
        ===================================================== */

        .topPanel {
          width: min(1580px, 98%);
          min-height: 118px;

          margin: 0 auto;

          padding: 22px 30px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 20px;

          border: 3px solid #173e58;
          border-radius: 26px;

          background:
            linear-gradient(
              180deg,
              #92dcff 0%,
              #67bee9 45%,
              #4599cc 100%
            );

          box-shadow:
            inset 0 6px 6px
              rgba(255,255,255,.72),

            inset 0 -5px 6px
              rgba(0,0,0,.10),

            0 8px 0 #173c55,

            0 15px 25px
              rgba(0,0,0,.18);
        }

        .namePlate {
          min-height: 64px;

          padding: 15px 28px;

          border: 3px solid #545b60;
          border-radius: 14px;

          background:
            linear-gradient(
              180deg,
              #ffffff,
              #c6c6c6
            );

          box-shadow:
            inset 0 5px 5px
              rgba(255,255,255,.9),

            0 5px 0 #6a7074;

          color: #111;

          font-family: inherit;
          font-size: 24px;
          font-weight: 700;

          cursor: pointer;
        }

        .topButtons {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .topButton,
        .exitButton {
          min-width: 150px;
          height: 58px;

          padding: 0 22px;

          border-radius: 13px;

          font-family: inherit;
          font-size: 16px;
          font-weight: 700;

          cursor: pointer;
        }

        .topButton {
          border: 2px solid #666;

          color: #111;

          background:
            linear-gradient(
              180deg,
              #ffffff,
              #c7c7c7
            );

          box-shadow:
            inset 0 4px 4px
              rgba(255,255,255,.9),

            0 4px 0 #666;
        }

        .exitButton {
          border: 2px solid #a80d0d;

          color: white;

          background:
            linear-gradient(
              180deg,
              #ff5e5e,
              #cf1111
            );

          box-shadow:
            inset 0 4px 4px
              rgba(255,255,255,.25),

            0 4px 0 #8d0b0b;
        }

        /* =====================================================
           HERO
        ===================================================== */

        .adminHero {
          position: relative;

          width: min(1200px, 94%);

          min-height: 260px;

          margin: 95px auto 75px;

          padding: 90px 45px 55px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          text-align: center;

          border: 3px solid #303538;
          border-radius: 28px;

          background:
            linear-gradient(
              145deg,
              #686c6f,
              #363a3d
            );

          box-shadow:
            inset 0 5px 5px
              rgba(255,255,255,.08),

            0 8px 0 #272b2e,

            0 17px 28px
              rgba(0,0,0,.24);
        }

        .sectionTitle {
          position: absolute;

          top: -37px;
          left: 50%;

          transform: translateX(-50%);

          min-width: 320px;
          min-height: 72px;

          padding: 12px 30px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 3px solid #174461;
          border-radius: 16px;

          color: #073b68;

          background:
            linear-gradient(
              180deg,
              #a0ddff,
              #55a8d8
            );

          box-shadow:
            inset 0 5px 4px
              rgba(255,255,255,.55),

            0 6px 0 #17415c;

          font-size: 30px;
          font-weight: 700;

          z-index: 2;
        }

        .adminHero h1 {
          margin: 0;

          color: white;

          font-size:
            clamp(
              34px,
              4.2vw,
              52px
            );

          line-height: 1.15;

          text-shadow:
            0 3px 3px
              rgba(0,0,0,.35);
        }

        .adminHero p {
          max-width: 760px;

          margin: 20px 0 0;

          color: #f1f5f7;

          font-size: 21px;
          line-height: 1.55;
        }

        /* =====================================================
           CARDS
        ===================================================== */

        .cardsSection {
          width: min(1200px, 94%);

          margin: 0 auto;
        }

        .cardsGrid {
          display: grid;

          grid-template-columns:
            repeat(2, minmax(0, 1fr));

          gap: 46px;
        }

        .adminCard {
          min-height: 320px;

          padding: 0;

          overflow: hidden;

          border: 3px solid #303538;
          border-radius: 24px;

          background:
            linear-gradient(
              145deg,
              #666b6e,
              #3b4043
            );

          box-shadow:
            inset 0 4px 4px
              rgba(255,255,255,.06),

            0 8px 0 #272d30,

            0 16px 26px
              rgba(0,0,0,.22);

          font-family: inherit;

          text-align: left;

          cursor: pointer;

          transition:
            transform .15s ease,
            filter .15s ease;
        }

        .adminCard:hover {
          transform:
            translateY(-6px);

          filter:
            brightness(1.03);
        }

        .adminCard:active {
          transform:
            translateY(2px);
        }

        .cardTop {
          min-height: 105px;

          padding: 22px 28px;

          display: flex;
          align-items: center;

          gap: 20px;

          border-bottom: 6px solid #174461;

          background:
            linear-gradient(
              180deg,
              #9adfff,
              #56addc
            );

          box-shadow:
            inset 0 5px 5px
              rgba(255,255,255,.55);
        }

        .cardIcon {
          width: 64px;
          height: 64px;

          flex-shrink: 0;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 2px solid
            rgba(23,68,97,.55);

          border-radius: 15px;

          background:
            rgba(255,255,255,.35);

          font-size: 36px;
        }

        .cardTitle {
          color: #073b68;

          font-size:
            clamp(
              25px,
              2.4vw,
              34px
            );

          font-weight: 700;

          line-height: 1.15;
        }

        .cardBody {
          min-height: 205px;

          padding: 32px 30px 30px;

          display: flex;
          flex-direction: column;
          justify-content: space-between;

          color: white;
        }

        .cardBody p {
          max-width: 470px;

          margin: 0;

          font-size: 20px;
          line-height: 1.55;

          text-shadow:
            0 1px 1px
              rgba(0,0,0,.35);
        }

        .manageButton {
          width: fit-content;

          margin-top: 28px;

          padding: 13px 25px;

          border: 2px solid #686e72;
          border-radius: 11px;

          color: #0b3550;

          background:
            linear-gradient(
              180deg,
              #ffffff,
              #cfcfcf
            );

          box-shadow:
            inset 0 4px 4px
              rgba(255,255,255,.9),

            0 4px 0 #676d71;

          font-size: 17px;
          font-weight: 700;
        }

        /* =====================================================
           FOOTER
        ===================================================== */

        .footer {
          width: min(1200px, 94%);

          margin: 70px auto 0;

          text-align: center;

          color: #60717b;

          font-size: 16px;
        }

        /* =====================================================
           TABLET
        ===================================================== */

        @media (
          max-width: 900px
        ) {
          .topPanel {
            flex-direction: column;
          }

          .cardsGrid {
            grid-template-columns:
              1fr;
          }

          .adminHero {
            margin-top: 90px;
          }
        }

        /* =====================================================
           MOBILE
        ===================================================== */

        @media (
          max-width: 600px
        ) {
          .page {
            padding:
              12px 10px 50px;
          }

          .topPanel {
            width: 100%;

            padding:
              18px 15px;
          }

          .namePlate {
            width: 100%;

            font-size: 19px;

            text-align: center;
          }

          .topButtons {
            width: 100%;

            justify-content: center;
          }

          .topButton,
          .exitButton {
            min-width: 130px;
          }

          .adminHero {
            width: 100%;

            min-height: 240px;

            padding:
              85px 22px 45px;
          }

          .sectionTitle {
            min-width: 230px;

            font-size: 25px;
          }

          .cardsSection {
            width: 100%;
          }

          .cardsGrid {
            gap: 30px;
          }

          .adminCard {
            min-height: 290px;
          }

          .cardTop {
            padding:
              20px 18px;
          }

          .cardIcon {
            width: 54px;
            height: 54px;

            font-size: 30px;
          }

          .cardBody {
            padding:
              26px 22px;
          }

          .cardBody p {
            font-size: 18px;
          }
        }
      `}</style>
    </main>
  );
}
