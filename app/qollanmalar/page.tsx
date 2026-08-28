"use client";

import { useRouter } from "next/navigation";

type SectionItem = {
  badge: string;
  title: string;
  href: string;
};

const sections: SectionItem[] = [
  {
    badge: "K",
    title: "Kodekslar",
    href: "/kodekslar",
  },
  {
    badge: "Q",
    title: "Qonun va qonunchilik hujjatlari",
    href: "/qonunlar",
  },
  {
    badge: "D",
    title: "Darsliklar",
    href: "/darsliklar",
  },
  {
    badge: "EN",
    title: "English Vocabulary",
    href: "/qollanmalar/english-vocabulary",
  },
  {
    badge: "L",
    title: "Inglizcha lug‘atlar",
    href: "/qollanmalar/dictionaries",
  },
];

export default function QollanmalarPage() {
  const router = useRouter();

  function goBack() {
    /*
      MUHIM:
      history.back() yoki router.back() ishlatilmaydi.

      Orqaga tugmasi HAR DOIM:
      /admin
      sahifasiga olib boradi.
    */
    window.location.href = "/admin";
  }

  return (
    <main className="page">
      {/* =====================================
          TEPADAGI 3D PANEL
      ====================================== */}

      <header className="topPanel">
        <div className="titleBox">
          Qo‘llanmalar
        </div>

        <button
          type="button"
          className="backButton"
          onClick={goBack}
        >
          Orqaga
        </button>
      </header>

      {/* =====================================
          ASOSIY PANEL
      ====================================== */}

      <section className="mainPanel">
        <h1 className="sectionTitle">
          Kerakli bo‘limni tanlang
        </h1>

        <div className="cards">
          {sections.map((item) => (
            <article
              key={item.title}
              className="card"
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

        :global(html) {
          background: #edf3f6;
        }

        :global(body) {
          margin: 0;

          background: #edf3f6;
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
            20px 18px
            70px;

          font-family:
            "Bell MT",
            "Times New Roman",
            serif;

          color: #111;

          background:
            radial-gradient(
              circle at top,
              #ffffff 0%,
              #f4f8fa 48%,
              #eaf1f4 100%
            );
        }

        /* =====================================
           TEPADAGI PANEL
        ====================================== */

        .topPanel {
          width: min(1570px, 100%);

          min-height: 125px;

          margin:
            0 auto 52px;

          padding:
            20px 35px;

          display: flex;

          align-items: center;

          justify-content:
            space-between;

          gap: 30px;

          border:
            3px solid #0a405e;

          border-radius: 27px;

          background:
            linear-gradient(
              180deg,
              #8dddfc 0%,
              #60c3eb 46%,
              #3ca5d3 100%
            );

          box-shadow:
            inset 0 4px 4px
              rgba(
                255,
                255,
                255,
                0.9
              ),
            inset 0 -8px 0
              #08759f,
            0 10px 0
              #063f5b,
            0 19px 28px
              rgba(
                0,
                0,
                0,
                0.2
              );
        }

        .titleBox {
          min-width: 460px;

          min-height: 72px;

          padding:
            14px 32px;

          display: flex;

          align-items: center;

          justify-content:
            center;

          border:
            3px solid #626b70;

          border-radius: 18px;

          background:
            linear-gradient(
              180deg,
              #f7f7f7 0%,
              #e7e7e7 50%,
              #cccccc 100%
            );

          box-shadow:
            inset 0 4px 3px
              #ffffff,
            inset 0 -3px 3px
              rgba(
                0,
                0,
                0,
                0.07
              ),
            0 8px 0
              #6e787d,
            0 13px 17px
              rgba(
                0,
                0,
                0,
                0.18
              );

          font-size:
            clamp(
              27px,
              3vw,
              35px
            );

          font-weight: 700;
        }

        .backButton {
          min-width: 165px;

          min-height: 62px;

          padding:
            12px 25px;

          border:
            3px solid #626b70;

          border-radius: 15px;

          background:
            linear-gradient(
              180deg,
              #f5f5f5 0%,
              #e2e2e2 48%,
              #c9cdcf 100%
            );

          box-shadow:
            inset 0 3px 3px
              #ffffff,
            inset 0 -2px 3px
              rgba(
                0,
                0,
                0,
                0.08
              ),
            0 7px 0
              #697378,
            0 12px 16px
              rgba(
                0,
                0,
                0,
                0.16
              );

          color: #111;

          font-size: 16px;

          font-weight: 700;

          cursor: pointer;
        }

        .backButton:hover {
          filter: brightness(1.035);
        }

        .backButton:active {
          transform:
            translateY(4px);

          box-shadow:
            inset 0 2px 3px
              rgba(
                0,
                0,
                0,
                0.1
              ),
            0 2px 0
              #697378;
        }

        /* =====================================
           ASOSIY KULRANG PANEL
        ====================================== */

        .mainPanel {
          width: min(1570px, 100%);

          margin: 0 auto;

          padding:
            38px 42px
            50px;

          border:
            3px solid #373e42;

          border-radius: 26px;

          background:
            linear-gradient(
              145deg,
              #707679 0%,
              #5b6164 48%,
              #454b4e 100%
            );

          box-shadow:
            inset 0 4px 3px
              rgba(
                255,
                255,
                255,
                0.18
              ),
            inset 0 -9px 0
              #303639,
            0 11px 0
              #343a3d,
            0 19px 27px
              rgba(
                0,
                0,
                0,
                0.2
              );
        }

        .sectionTitle {
          margin:
            0 0 38px;

          text-align: center;

          color: #ffffff;

          font-size:
            clamp(
              24px,
              3vw,
              29px
            );

          font-weight: 700;

          text-shadow:
            0 2px 2px
              rgba(
                0,
                0,
                0,
                0.65
              );
        }

        /* =====================================
           KARTALAR
        ====================================== */

        .cards {
          display: grid;

          grid-template-columns:
            repeat(3, 1fr);

          gap:
            36px 34px;
        }

        .card {
          min-height: 265px;

          padding:
            25px 24px
            24px;

          display: flex;

          flex-direction:
            column;

          align-items: center;

          justify-content:
            space-between;

          gap: 18px;

          border:
            2px solid #e5e5e5;

          border-radius: 17px;

          background:
            linear-gradient(
              145deg,
              #f8f8f8 0%,
              #eeeeee 50%,
              #d9dcde 100%
            );

          box-shadow:
            inset 0 4px 4px
              #ffffff,
            inset 0 -3px 4px
              rgba(
                0,
                0,
                0,
                0.07
              ),
            0 8px 0
              #788287,
            0 14px 20px
              rgba(
                0,
                0,
                0,
                0.19
              );
        }

        .badge {
          min-width: 56px;

          height: 50px;

          padding:
            0 11px;

          display: flex;

          align-items: center;

          justify-content:
            center;

          border:
            2px solid #086183;

          border-radius: 10px;

          background:
            linear-gradient(
              180deg,
              #c9f1ff 0%,
              #79d2f2 48%,
              #45b2df 100%
            );

          box-shadow:
            inset 0 3px 2px
              #ffffff,
            inset 0 -2px 2px
              rgba(
                0,
                0,
                0,
                0.08
              ),
            0 6px 0
              #075a7a;

          color: #064c6e;

          font-size: 15px;

          font-weight: 700;
        }

        .card h2 {
          margin: 0;

          min-height: 55px;

          display: flex;

          align-items: center;

          justify-content:
            center;

          text-align: center;

          color: #111;

          font-size:
            clamp(
              21px,
              2vw,
              25px
            );

          line-height: 1.25;

          font-weight: 700;
        }

        .openButton {
          min-width: 150px;

          min-height: 48px;

          padding:
            10px 24px;

          border:
            2px solid #075d80;

          border-radius: 9px;

          background:
            linear-gradient(
              180deg,
              #c9f1ff 0%,
              #78d1f2 48%,
              #43b0dc 100%
            );

          box-shadow:
            inset 0 3px 2px
              #ffffff,
            inset 0 -2px 3px
              rgba(
                0,
                0,
                0,
                0.07
              ),
            0 6px 0
              #075878,
            0 10px 14px
              rgba(
                0,
                0,
                0,
                0.14
              );

          color: #063f5c;

          font-size: 14px;

          font-weight: 700;

          cursor: pointer;
        }

        .openButton:hover {
          filter: brightness(1.035);
        }

        .openButton:active {
          transform:
            translateY(4px);

          box-shadow:
            inset 0 2px 3px
              rgba(
                0,
                0,
                0,
                0.08
              ),
            0 2px 0
              #075878;
        }

        /* =====================================
           TABLET
        ====================================== */

        @media (
          max-width: 1050px
        ) {
          .titleBox {
            min-width: 340px;
          }

          .cards {
            grid-template-columns:
              repeat(2, 1fr);
          }
        }

        /* =====================================
           MOBILE
        ====================================== */

        @media (
          max-width: 700px
        ) {
          .page {
            padding:
              14px 9px
              50px;
          }

          .topPanel {
            width: 100%;

            min-height: 0;

            margin-bottom: 42px;

            padding: 14px;

            flex-direction:
              column;
          }

          .titleBox,
          .backButton {
            width: 100%;

            min-width: 0;
          }

          .titleBox {
            min-height: 60px;

            font-size: 27px;
          }

          .mainPanel {
            width: 100%;

            padding:
              30px 14px
              35px;
          }

          .sectionTitle {
            margin-bottom: 28px;
          }

          .cards {
            grid-template-columns:
              1fr;

            gap: 28px;
          }

          .card {
            min-height: 225px;
          }
        }
      `}</style>
    </main>
  );
}
