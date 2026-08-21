"use client";

import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();

  const items = [
    {
      title: "Foydalanuvchilar va ruxsatlar",
      button: "Boshqarish",
      href: "/admin/requests",
    },
    {
      title: "Lug‘at boshqaruvi",
      button: "Boshqarish",
      href: "/admin/dictionary",
    },
    {
      title: "Testlar",
      button: "Boshqarish",
      href: "/admin/tests",
    },
    {
      title: "Natijalar",
      button: "Boshqarish",
      href: "/admin/results",
    },
  ];

  return (
    <main className="page">
      {/* ================= HEADER ================= */}

      <header className="topPanel">
        <div className="namePlate">
          Qurbonov Siyovush Jamaliddinzoda
        </div>

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

      {/* ================= ADMIN BLOCK ================= */}

      <section className="adminBlock">
        <div className="sectionTitle">
          Admin panel
        </div>

        <div className="cardsGrid">
          {items.map((item) => (
            <div
              className="adminCard"
              key={item.href}
            >
              <h2>{item.title}</h2>

              <button
                type="button"
                className="manageButton"
                onClick={() =>
                  router.push(item.href)
                }
              >
                {item.button}
              </button>
            </div>
          ))}
        </div>
      </section>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          padding: 18px 16px 70px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #f4f6f7 60%,
              #eef1f3 100%
            );

          font-family:
            "Bell MT",
            "Times New Roman",
            serif;
        }

        /* ================= HEADER ================= */

        .topPanel {
          width: min(1580px, 98%);
          min-height: 110px;

          margin: 0 auto;

          padding: 20px 28px;

          display: flex;
          justify-content: space-between;
          align-items: center;

          gap: 20px;

          border: 3px solid #173e58;
          border-radius: 25px;

          background:
            linear-gradient(
              180deg,
              #91d9ff,
              #4999ce
            );

          box-shadow:
            inset 0 5px 5px
              rgba(255,255,255,.65),

            0 7px 0 #173c55,

            0 14px 20px
              rgba(0,0,0,.18);
        }

        .namePlate {
          padding: 17px 25px;

          border: 3px solid #42494e;
          border-radius: 14px;

          background:
            linear-gradient(
              180deg,
              #fafafa,
              #aaa
            );

          box-shadow:
            inset 0 5px 5px
              rgba(255,255,255,.8),

            0 5px 0 #63696d;

          color: #111;

          font-size: 24px;
          font-weight: 700;
        }

        .topButtons {
          display: flex;
          gap: 15px;
        }

        .topButton,
        .exitButton {
          min-width: 145px;
          height: 55px;

          border-radius: 13px;

          font-family: inherit;
          font-weight: 700;

          cursor: pointer;
        }

        .topButton {
          border: 2px solid #666;

          background:
            linear-gradient(
              180deg,
              #ffffff,
              #bbbbbb
            );

          box-shadow:
            0 4px 0 #666;
        }

        .exitButton {
          border: 2px solid #174461;

          color: white;

          background:
            linear-gradient(
              180deg,
              #6bc1eb,
              #3187b5
            );

          box-shadow:
            0 4px 0 #174461;
        }

        /* ================= MAIN ADMIN BLOCK ================= */

        .adminBlock {
          position: relative;

          width: min(1400px, 94%);

          margin: 100px auto 0;

          padding:
            70px 34px 45px;

          border: 3px solid #303538;
          border-radius: 28px;

          background:
            linear-gradient(
              145deg,
              #696d70,
              #3b4043
            );

          box-shadow:
            inset 0 4px 5px
              rgba(255,255,255,.1),

            0 8px 0 #272b2e,

            0 17px 27px
              rgba(0,0,0,.23);
        }

        .sectionTitle {
          position: absolute;

          top: -35px;
          left: 50%;

          transform: translateX(-50%);

          min-width: 310px;
          min-height: 70px;

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
              #9bd9ff,
              #4e9ccc
            );

          box-shadow:
            inset 0 5px 4px
              rgba(255,255,255,.55),

            0 6px 0 #17415c;

          font-size: 30px;
          font-weight: 700;
        }

        /* ================= CARDS ================= */

        .cardsGrid {
          display: grid;

          grid-template-columns:
            repeat(2, minmax(0, 1fr));

          gap: 34px;
        }

        .adminCard {
          min-height: 255px;

          padding: 30px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          text-align: center;

          border: 3px solid #535b5f;
          border-radius: 20px;

          background:
            linear-gradient(
              145deg,
              #f2f2f2 0%,
              #d4d4d4 42%,
              #b8b8b8 100%
            );

          box-shadow:
            inset 0 7px 7px
              rgba(255,255,255,.92),

            inset 0 -5px 5px
              rgba(0,0,0,.10),

            0 7px 0 #555d61,

            0 12px 18px
              rgba(0,0,0,.22);
        }

        .adminCard h2 {
          margin:
            0 0 35px;

          color: #111;

          font-size:
            clamp(
              26px,
              2.5vw,
              35px
            );

          line-height: 1.2;

          font-weight: 700;
        }

        /* ================= BUTTON ================= */

        .manageButton {
          min-width: 180px;
          min-height: 55px;

          padding: 10px 28px;

          border: 3px solid #174461;
          border-radius: 11px;

          color: #073b68;

          background:
            linear-gradient(
              180deg,
              #a0ddff,
              #55a8d8
            );

          box-shadow:
            inset 0 4px 4px
              rgba(255,255,255,.6),

            0 5px 0 #17415c;

          font-family: inherit;

          font-size: 18px;
          font-weight: 700;

          cursor: pointer;

          transition:
            transform .13s ease;
        }

        .manageButton:hover {
          transform:
            translateY(-2px);
        }

        .manageButton:active {
          transform:
            translateY(4px);

          box-shadow:
            0 1px 0 #17415c;
        }

        /* ================= TABLET ================= */

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
        }

        /* ================= MOBILE ================= */

        @media (
          max-width: 600px
        ) {
          .page {
            padding:
              10px 8px 50px;
          }

          .topPanel {
            width: 100%;

            padding:
              18px 14px;
          }

          .namePlate {
            width: 100%;

            text-align: center;

            font-size: 19px;
          }

          .topButtons {
            width: 100%;

            flex-direction: column;
          }

          .topButton,
          .exitButton {
            width: 100%;
          }

          .adminBlock {
            width: 100%;

            margin-top: 85px;

            padding:
              60px 18px 30px;
          }

          .sectionTitle {
            min-width: 220px;

            font-size: 24px;
          }

          .adminCard {
            min-height: 220px;
          }

          .adminCard h2 {
            font-size: 25px;
          }

          .manageButton {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}
