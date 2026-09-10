"use client";

import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();

  const items = [
    {
      title: "Foydalanuvchilar va ruxsatlar",
      href: "/admin/requests",
      className: "usersCard",
      icon: "👥",
    },
    {
      title: "Lug‘at boshqaruvi",
      href: "/admin/dictionary",
      className: "dictionaryCard",
      icon: "A",
    },
    {
      title: "Testlar",
      href: "/admin/tests",
      className: "testsCard",
      icon: "✓",
    },
    {
      title: "Natijalar",
      href: "/admin/results",
      className: "resultsCard",
      icon: "≡",
    },
  ];

  /* =====================================================
     CHIQISH
  ===================================================== */

  async function logout() {
    try {
      await fetch("/api/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error(
        "LOGOUT ERROR:",
        error
      );
    } finally {
      sessionStorage.removeItem(
        "qurbonov-session"
      );

      sessionStorage.removeItem(
        "qurbonov-role"
      );

      router.replace("/");
      router.refresh();
    }
  }

  return (
    <main className="page">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="topPanel">
        <button
          type="button"
          className="namePlate"
          onClick={() =>
            router.push("/")
          }
        >
          Qurbonov Siyovush Jamaliddinzoda
        </button>

        <div className="topButtons">
          <button
            type="button"
            className="backButton"
            onClick={() =>
              router.push("/")
            }
          >
            ← Asosiy sahifa
          </button>

          <button
            type="button"
            className="exitButton"
            onClick={logout}
          >
            Chiqish
          </button>
        </div>
      </header>

      {/* =====================================================
          ADMIN PANEL
      ===================================================== */}

      <section className="adminBlock">
        <div className="sectionTitle">
          Admin panel
        </div>

        <div className="cardsGrid">
          {items.map((item) => (
            <button
              type="button"
              key={item.href}
              className={`adminCard ${item.className}`}
              onClick={() =>
                router.push(
                  item.href
                )
              }
            >
              <span className="cardIcon">
                {item.icon}
              </span>

              <strong>
                {item.title}
              </strong>
            </button>
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
            18px 16px 80px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #f5f7f8 55%,
              #e9eef1 100%
            );

          color: #111;

          font-family:
            "Bell MT",
            "Times New Roman",
            serif;
        }

        button {
          font-family: inherit;
          cursor: pointer;
        }

        /* =====================================================
           HEADER
        ===================================================== */

        .topPanel {
          width:
            min(
              1580px,
              98%
            );

          min-height: 110px;

          margin: 0 auto;

          padding:
            20px 28px;

          display: flex;

          justify-content:
            space-between;

          align-items: center;

          gap: 22px;

          border:
            3px solid #173e58;

          border-radius: 25px;

          background:
            linear-gradient(
              180deg,
              #9adeff 0%,
              #5ab5e3 48%,
              #398ebc 100%
            );

          box-shadow:
            inset 0 7px 6px
              rgba(
                255,
                255,
                255,
                0.68
              ),

            inset 0 -5px 6px
              rgba(
                0,
                0,
                0,
                0.14
              ),

            0 8px 0
              #173c55,

            0 15px 23px
              rgba(
                0,
                0,
                0,
                0.22
              );
        }

        .namePlate {
          min-height: 62px;

          padding:
            0 27px;

          border:
            3px solid #50585d;

          border-radius: 14px;

          color: #111;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #eeeeee 45%,
              #bdbdbd 100%
            );

          box-shadow:
            inset 0 6px 5px
              rgba(
                255,
                255,
                255,
                0.95
              ),

            inset 0 -3px 4px
              rgba(
                0,
                0,
                0,
                0.1
              ),

            0 5px 0
              #60686c;

          font-size: 23px;

          font-weight: 800;
        }

        .topButtons {
          display: flex;

          align-items: center;

          gap: 15px;
        }

        .backButton,
        .exitButton {
          min-width: 155px;

          min-height: 55px;

          padding:
            9px 20px;

          border-radius: 12px;

          font-size: 15px;

          font-weight: 800;

          transition:
            transform 0.12s ease,
            box-shadow 0.12s ease;
        }

        .backButton {
          border:
            2px solid #666;

          color: #111;

          background:
            linear-gradient(
              180deg,
              #ffffff,
              #c5c5c5
            );

          box-shadow:
            inset 0 4px 4px
              rgba(
                255,
                255,
                255,
                0.9
              ),

            0 5px 0
              #666;
        }

        .exitButton {
          border:
            2px solid #8f1d1d;

          color: white;

          background:
            linear-gradient(
              180deg,
              #f27272,
              #ba2222
            );

          box-shadow:
            inset 0 4px 4px
              rgba(
                255,
                255,
                255,
                0.35
              ),

            0 5px 0
              #7d1717;
        }

        .backButton:hover,
        .exitButton:hover {
          transform:
            translateY(-2px);
        }

        .backButton:active,
        .exitButton:active {
          transform:
            translateY(4px);

          box-shadow:
            0 1px 0
              #555;
        }

        /* =====================================================
           ADMIN PANEL
        ===================================================== */

        .adminBlock {
          position: relative;

          width:
            min(
              1400px,
              94%
            );

          margin:
            105px auto 0;

          padding:
            80px 38px 48px;

          border:
            3px solid #303538;

          border-radius: 28px;

          background:
            linear-gradient(
              145deg,
              #707578 0%,
              #505558 48%,
              #34383a 100%
            );

          box-shadow:
            inset 0 7px 6px
              rgba(
                255,
                255,
                255,
                0.18
              ),

            inset 0 -8px 8px
              rgba(
                0,
                0,
                0,
                0.28
              ),

            0 9px 0
              #292e31,

            0 19px 30px
              rgba(
                0,
                0,
                0,
                0.28
              );
        }

        .sectionTitle {
          position: absolute;

          top: -37px;

          left: 50%;

          transform:
            translateX(-50%);

          min-width: 320px;

          min-height: 72px;

          padding:
            10px 30px;

          display: flex;

          align-items: center;

          justify-content: center;

          border:
            3px solid #174461;

          border-radius: 16px;

          color: #073b68;

          background:
            linear-gradient(
              180deg,
              #b8ecff 0%,
              #79caef 40%,
              #499ccb 100%
            );

          box-shadow:
            inset 0 6px 5px
              rgba(
                255,
                255,
                255,
                0.75
              ),

            inset 0 -4px 5px
              rgba(
                0,
                0,
                0,
                0.12
              ),

            0 6px 0
              #17415c,

            0 10px 15px
              rgba(
                0,
                0,
                0,
                0.22
              );

          font-size: 31px;

          font-weight: 800;
        }

        /* =====================================================
           3D KARTALAR
        ===================================================== */

        .cardsGrid {
          display: grid;

          grid-template-columns:
            repeat(
              2,
              minmax(
                0,
                1fr
              )
            );

          gap: 35px;
        }

        .adminCard {
          position: relative;

          min-height: 260px;

          padding:
            32px 25px;

          display: flex;

          flex-direction: column;

          align-items: center;

          justify-content: center;

          gap: 25px;

          border:
            3px solid #535b5f;

          border-radius: 21px;

          color: #111;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #eeeeee 43%,
              #c3c3c3 100%
            );

          box-shadow:
            inset 0 9px 8px
              rgba(
                255,
                255,
                255,
                0.95
              ),

            inset 0 -6px 6px
              rgba(
                0,
                0,
                0,
                0.11
              ),

            0 9px 0
              #555d61,

            0 16px 22px
              rgba(
                0,
                0,
                0,
                0.25
              );

          text-align: center;

          transition:
            transform 0.13s ease,
            box-shadow 0.13s ease;
        }

        .adminCard:hover {
          transform:
            translateY(-6px);

          box-shadow:
            inset 0 9px 8px
              rgba(
                255,
                255,
                255,
                0.95
              ),

            0 14px 0
              #555d61,

            0 22px 28px
              rgba(
                0,
                0,
                0,
                0.27
              );
        }

        .adminCard:active {
          transform:
            translateY(7px);

          box-shadow:
            inset 0 5px 5px
              rgba(
                255,
                255,
                255,
                0.8
              ),

            0 2px 0
              #555d61;
        }

        .adminCard strong {
          font-size:
            clamp(
              27px,
              2.5vw,
              36px
            );

          font-weight: 900;

          line-height: 1.2;

          text-shadow:
            0 1px 0
              rgba(
                255,
                255,
                255,
                0.9
              );
        }

        /* =====================================================
           3D DOIRA
        ===================================================== */

        .cardIcon {
          width: 78px;

          height: 78px;

          display: flex;

          align-items: center;

          justify-content: center;

          border:
            3px solid #174461;

          border-radius: 50%;

          color: #07517e;

          background:
            radial-gradient(
              circle at 35% 25%,
              #effbff 0%,
              #a5e2ff 48%,
              #57abd6 100%
            );

          box-shadow:
            inset 0 7px 6px
              rgba(
                255,
                255,
                255,
                0.85
              ),

            inset 0 -4px 5px
              rgba(
                0,
                0,
                0,
                0.14
              ),

            0 6px 0
              #174461,

            0 10px 13px
              rgba(
                0,
                0,
                0,
                0.22
              );

          font-size: 32px;

          font-weight: 900;
        }

        /* =====================================================
           KARTA RANGLARI
        ===================================================== */

        .usersCard {
          border-color: #287344;

          background:
            linear-gradient(
              180deg,
              #f2fff5 0%,
              #d1f0d9 45%,
              #9bd6ab 100%
            );

          box-shadow:
            inset 0 9px 8px
              rgba(
                255,
                255,
                255,
                0.95
              ),

            0 9px 0
              #287344,

            0 16px 22px
              rgba(
                0,
                0,
                0,
                0.24
              );
        }

        .usersCard
        .cardIcon {
          border-color: #287344;

          color: #176638;

          background:
            radial-gradient(
              circle at 35% 25%,
              #f4fff7,
              #b8edc6,
              #6fc187
            );

          box-shadow:
            inset 0 7px 6px
              rgba(
                255,
                255,
                255,
                0.85
              ),

            0 6px 0
              #287344;
        }

        .dictionaryCard {
          border-color: #846c1b;

          background:
            linear-gradient(
              180deg,
              #fffdf1,
              #f4e6ae 45%,
              #d9bc5c
            );

          box-shadow:
            inset 0 9px 8px
              rgba(
                255,
                255,
                255,
                0.95
              ),

            0 9px 0
              #846c1b,

            0 16px 22px
              rgba(
                0,
                0,
                0,
                0.24
              );
        }

        .dictionaryCard
        .cardIcon {
          border-color: #846c1b;

          color: #71590a;

          background:
            radial-gradient(
              circle at 35% 25%,
              #fffdf0,
              #ffe99a,
              #d9b743
            );

          box-shadow:
            inset 0 7px 6px
              rgba(
                255,
                255,
                255,
                0.85
              ),

            0 6px 0
              #846c1b;
        }

        .testsCard {
          border-color: #174461;

          background:
            linear-gradient(
              180deg,
              #f3fbff,
              #cbeaf8 45%,
              #83bfdc
            );

          box-shadow:
            inset 0 9px 8px
              rgba(
                255,
                255,
                255,
                0.95
              ),

            0 9px 0
              #174461,

            0 16px 22px
              rgba(
                0,
                0,
                0,
                0.24
              );
        }

        .resultsCard {
          border-color: #69528f;

          background:
            linear-gradient(
              180deg,
              #fbf7ff,
              #dfd2f0 45%,
              #b29acb
            );

          box-shadow:
            inset 0 9px 8px
              rgba(
                255,
                255,
                255,
                0.95
              ),

            0 9px 0
              #69528f,

            0 16px 22px
              rgba(
                0,
                0,
                0,
                0.24
              );
        }

        .resultsCard
        .cardIcon {
          border-color: #69528f;

          color: #594078;

          background:
            radial-gradient(
              circle at 35% 25%,
              #fffaff,
              #dfcaf3,
              #a988c4
            );

          box-shadow:
            inset 0 7px 6px
              rgba(
                255,
                255,
                255,
                0.85
              ),

            0 6px 0
              #69528f;
        }

        /* =====================================================
           TABLET
        ===================================================== */

        @media (
          max-width: 900px
        ) {
          .topPanel {
            flex-direction:
              column;
          }

          .namePlate {
            width: 100%;

            text-align: center;
          }

          .topButtons {
            width: 100%;
          }

          .backButton,
          .exitButton {
            flex: 1;
          }

          .cardsGrid {
            grid-template-columns:
              1fr;
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
              10px 8px 55px;
          }

          .topPanel {
            width: 100%;

            padding:
              14px;
          }

          .namePlate {
            font-size: 19px;
          }

          .topButtons {
            flex-direction:
              column;
          }

          .backButton,
          .exitButton {
            width: 100%;
          }

          .adminBlock {
            width: 100%;

            margin-top: 85px;

            padding:
              65px 12px 25px;
          }

          .sectionTitle {
            min-width: 220px;

            min-height: 60px;

            font-size: 25px;
          }

          .cardsGrid {
            gap: 22px;
          }

          .adminCard {
            min-height: 180px;

            padding:
              25px 12px;

            gap: 18px;
          }

          .adminCard strong {
            font-size: 25px;
          }

          .cardIcon {
            width: 65px;

            height: 65px;

            font-size: 27px;
          }
        }
      `}</style>
    </main>
  );
}
