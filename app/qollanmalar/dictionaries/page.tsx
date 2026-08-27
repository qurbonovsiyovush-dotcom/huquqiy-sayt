"use client";

const dictionaries = [
  {
    icon: "EN",
    title: "English–Uzbek Dictionary",
    href: "/qollanmalar/dictionaries/english-uzbek",
  },
  {
    icon: "UZ",
    title: "Uzbek–English Dictionary",
    href: "/qollanmalar/dictionaries/uzbek-english",
  },
  {
    icon: "PV",
    title: "Phrasal Verbs",
    href: "/qollanmalar/dictionaries/phrasal-verbs",
  },
  {
    icon: "IV",
    title: "Irregular Verbs",
    href: "/qollanmalar/dictionaries/irregular-verbs",
  },
  {
    icon: "S/A",
    title: "Synonyms & Antonyms",
    href: "/qollanmalar/dictionaries/synonyms-antonyms",
  },
  {
    icon: "C",
    title: "Collocations",
    href: "/qollanmalar/dictionaries/collocations",
  },
];

export default function DictionariesPage() {
  function goTo(href: string) {
    window.location.href = href;
  }

  return (
    <main className="page">
      <header className="topPanel">
        <button
          type="button"
          className="backButton"
          onClick={() => goTo("/qollanmalar")}
        >
          ← Qo‘llanmalarga qaytish
        </button>

        <div className="brand">QURBONOV.UZ</div>
      </header>

      <section className="mainPanel">
        <div className="panelTitle">
          Inglizcha lug‘atlar
        </div>

        <div className="cards">
          {dictionaries.map((item) => (
            <article
              className="dictionaryCard"
              key={item.href}
            >
              <div className="icon3d">
                {item.icon}
              </div>

              <h2>{item.title}</h2>

              <button
                type="button"
                className="openButton"
                onClick={() => goTo(item.href)}
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

        .page {
          min-height: 100vh;
          padding: 35px 20px 70px;

          font-family:
            "Bell MT",
            Georgia,
            "Times New Roman",
            serif;

          background:
            radial-gradient(
              circle at 50% 0%,
              #ffffff 0%,
              #f2f7fa 43%,
              #dee6eb 100%
            );
        }

        /* =============================================
           YUQORI PANEL
        ============================================= */

        .topPanel {
          width: min(1120px, 100%);
          min-height: 92px;

          margin: 0 auto 66px;
          padding: 18px 25px;

          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;

          border: 3px solid #253239;
          border-radius: 22px;

          background:
            linear-gradient(
              180deg,
              #858b8e 0%,
              #686f72 16%,
              #50575a 60%,
              #3c4346 100%
            );

          box-shadow:
            inset 0 3px 3px rgba(255, 255, 255, 0.43),
            inset 0 -6px 8px rgba(0, 0, 0, 0.3),
            0 9px 0 #202b30,
            0 17px 26px rgba(0, 0, 0, 0.25);
        }

        .brand {
          color: #ffffff;

          font-size: 18px;
          font-weight: 900;
          letter-spacing: 3px;

          text-shadow:
            0 2px 0 #164d6b,
            0 3px 4px rgba(0, 0, 0, 0.72);
        }

        /* =============================================
           ORQAGA 3D TUGMASI
        ============================================= */

        .backButton {
          min-width: 220px;
          min-height: 50px;

          padding: 10px 20px;

          border: 2px solid #155b7d;
          border-radius: 11px;

          color: #063f63;

          background:
            linear-gradient(
              180deg,
              #dff8ff 0%,
              #b0e9fb 17%,
              #7ccff0 47%,
              #4bb1dc 74%,
              #2c90be 100%
            );

          box-shadow:
            inset 0 3px 2px rgba(255, 255, 255, 0.97),
            inset 0 -4px 5px rgba(0, 71, 107, 0.23),
            0 7px 0 #164d68,
            0 12px 16px rgba(0, 0, 0, 0.27);

          font-family: inherit;
          font-size: 15px;
          font-weight: 900;

          cursor: pointer;

          transition:
            transform 0.13s ease,
            box-shadow 0.13s ease,
            filter 0.13s ease;
        }

        .backButton:hover {
          transform: translateY(-3px);
          filter: brightness(1.04);

          box-shadow:
            inset 0 3px 2px rgba(255, 255, 255, 0.97),
            0 10px 0 #164d68,
            0 16px 20px rgba(0, 0, 0, 0.3);
        }

        .backButton:active {
          transform: translateY(5px);

          box-shadow:
            inset 0 4px 7px rgba(0, 0, 0, 0.2),
            0 2px 0 #164d68,
            0 4px 6px rgba(0, 0, 0, 0.2);
        }

        /* =============================================
           KATTA PANEL
        ============================================= */

        .mainPanel {
          position: relative;

          width: min(1120px, 100%);
          margin: 0 auto;

          padding: 95px 30px 46px;

          border: 3px solid #263238;
          border-radius: 25px;

          background:
            linear-gradient(
              145deg,
              #737a7d 0%,
              #5d6467 28%,
              #4b5255 65%,
              #373e41 100%
            );

          box-shadow:
            inset 0 3px 3px rgba(255, 255, 255, 0.4),
            inset 0 -8px 12px rgba(0, 0, 0, 0.3),
            0 10px 0 #222c30,
            0 20px 35px rgba(0, 0, 0, 0.3);
        }

        .panelTitle {
          position: absolute;

          top: -38px;
          left: 50%;

          transform: translateX(-50%);

          min-width: 320px;
          padding: 15px 38px;

          text-align: center;

          color: #063f68;

          font-size: 31px;
          font-weight: 900;

          border: 2px solid #145b80;
          border-radius: 15px;

          background:
            linear-gradient(
              180deg,
              #d5f5ff 0%,
              #a3e3fa 16%,
              #73ccef 48%,
              #45afe0 76%,
              #278dbd 100%
            );

          box-shadow:
            inset 0 3px 2px rgba(255, 255, 255, 0.95),
            inset 0 -3px 5px rgba(0, 72, 110, 0.25),
            0 8px 0 #155775,
            0 13px 18px rgba(0, 0, 0, 0.3);

          text-shadow:
            0 1px 0 #ffffff,
            0 2px 2px rgba(0, 0, 0, 0.15);
        }

        /* =============================================
           6 TA 3D KARTA
        ============================================= */

        .cards {
          display: grid;

          grid-template-columns:
            repeat(3, minmax(0, 1fr));

          gap: 36px 30px;
        }

        .dictionaryCard {
          min-height: 260px;

          padding: 27px 20px 28px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;

          border: 2px solid #f7f7f7;
          border-radius: 18px;

          background:
            linear-gradient(
              145deg,
              #ffffff 0%,
              #f7f7f7 24%,
              #ededed 55%,
              #d6d6d6 100%
            );

          box-shadow:
            inset 0 3px 3px rgba(255, 255, 255, 1),
            inset 0 -4px 7px rgba(0, 0, 0, 0.12),
            0 9px 0 #3c4549,
            0 15px 20px rgba(0, 0, 0, 0.28);

          transition:
            transform 0.18s ease,
            box-shadow 0.18s ease;
        }

        .dictionaryCard:hover {
          transform:
            translateY(-6px)
            scale(1.012);

          box-shadow:
            inset 0 3px 3px rgba(255, 255, 255, 1),
            inset 0 -4px 7px rgba(0, 0, 0, 0.1),
            0 14px 0 #3c4549,
            0 23px 28px rgba(0, 0, 0, 0.31);
        }

        .icon3d {
          min-width: 58px;
          height: 49px;

          padding: 0 10px;

          display: flex;
          align-items: center;
          justify-content: center;

          color: #06476f;

          font-size: 17px;
          font-weight: 900;

          border: 2px solid #145a7b;
          border-radius: 11px;

          background:
            linear-gradient(
              180deg,
              #d9f7ff 0%,
              #a9e5fa 20%,
              #73ccef 53%,
              #48add8 78%,
              #318db5 100%
            );

          box-shadow:
            inset 0 3px 2px rgba(255, 255, 255, 0.95),
            inset 0 -3px 4px rgba(0, 65, 100, 0.2),
            0 6px 0 #164d68,
            0 9px 12px rgba(0, 0, 0, 0.25);
        }

        .dictionaryCard h2 {
          margin: 25px 0;

          color: #101010;

          text-align: center;

          font-size: 23px;
          line-height: 1.25;
          font-weight: 900;

          text-shadow:
            0 1px 0 #ffffff,
            0 2px 2px rgba(0, 0, 0, 0.12);
        }

        /* =============================================
           OCHISH — HAQIQIY 3D BUTTON
        ============================================= */

        .openButton {
          width: 165px;
          min-height: 50px;

          padding: 10px 20px;

          border: 2px solid #155b7d;
          border-radius: 11px;

          color: #063f63;

          background:
            linear-gradient(
              180deg,
              #e0f8ff 0%,
              #afeafb 17%,
              #78d0f1 47%,
              #49b2df 74%,
              #2a91c0 100%
            );

          box-shadow:
            inset 0 3px 2px rgba(255, 255, 255, 0.97),
            inset 0 -4px 5px rgba(0, 71, 107, 0.23),
            0 7px 0 #164d68,
            0 11px 15px rgba(0, 0, 0, 0.27);

          font-family: inherit;
          font-size: 16px;
          font-weight: 900;

          cursor: pointer;

          text-shadow:
            0 1px 0 rgba(255, 255, 255, 0.85);

          transition:
            transform 0.13s ease,
            box-shadow 0.13s ease,
            filter 0.13s ease;
        }

        .openButton:hover {
          transform: translateY(-4px);
          filter: brightness(1.05);

          box-shadow:
            inset 0 3px 2px rgba(255, 255, 255, 0.97),
            0 11px 0 #164d68,
            0 16px 18px rgba(0, 0, 0, 0.3);
        }

        .openButton:active {
          transform: translateY(5px);

          box-shadow:
            inset 0 4px 7px rgba(0, 0, 0, 0.2),
            0 2px 0 #164d68,
            0 4px 6px rgba(0, 0, 0, 0.22);
        }

        /* =============================================
           RESPONSIVE
        ============================================= */

        @media (max-width: 950px) {
          .cards {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .mainPanel {
            padding-left: 24px;
            padding-right: 24px;
          }
        }

        @media (max-width: 650px) {
          .page {
            padding:
              20px 12px
              50px;
          }

          .topPanel {
            margin-bottom: 60px;

            padding: 15px;

            flex-direction: column;
          }

          .backButton {
            width: 100%;
          }

          .brand {
            margin: 5px 0;
          }

          .mainPanel {
            padding:
              80px 15px
              30px;

            border-radius: 20px;
          }

          .panelTitle {
            min-width: 245px;

            padding:
              13px 20px;

            font-size: 25px;
          }

          .cards {
            grid-template-columns: 1fr;
            gap: 28px;
          }

          .dictionaryCard {
            min-height: 235px;
          }

          .dictionaryCard h2 {
            font-size: 22px;
          }

          .openButton {
            width: 170px;
          }
        }
      `}</style>
    </main>
  );
}
