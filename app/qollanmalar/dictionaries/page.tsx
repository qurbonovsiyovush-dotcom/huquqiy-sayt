"use client";

export default function DictionariesPage() {
  /* =====================================================
     ORQAGA QAYTISH
  ===================================================== */

  function goBack() {
    window.location.href = "/qollanmalar";
  }

  /* =====================================================
     LUG‘AT BO‘LIMLARI
  ===================================================== */

  const cards = [
    {
      title: "English–Uzbek Dictionary",
      subtitle: "Inglizcha so‘zlarni yodlash va mustahkamlash",
      href: "/qollanmalar/dictionaries/english-uzbek",
      badge: "EN",
    },
    {
      title: "Phrasal Verbs",
      subtitle: "Eng muhim inglizcha phrasal verblar",
      href: "/qollanmalar/dictionaries/phrasal-verbs",
      badge: "PV",
    },
    {
      title: "Irregular Verbs",
      subtitle: "Noto‘g‘ri fe’llarni yodlash va mashq qilish",
      href: "/qollanmalar/dictionaries/irregular-verbs",
      badge: "IV",
    },
    {
      title: "Synonyms & Antonyms",
      subtitle: "Sinonim va antonimlar orqali lug‘at boyligini oshirish",
      href: "/qollanmalar/dictionaries/synonyms-antonyms",
      badge: "S/A",
    },
    {
      title: "Collocations",
      subtitle: "Ingliz tilidagi eng muhim so‘z birikmalari",
      href: "/qollanmalar/dictionaries/collocations",
      badge: "C",
    },
    {
      title: "IELTS Vocabulary",
      subtitle: "IELTS uchun eng kerakli akademik so‘zlar",
      href: "/qollanmalar/dictionaries/ielts-vocabulary",
      badge: "IELTS",
    },
  ];

  return (
    <main className="page">
      <div className="shell">
        {/* =================================================
            YUQORI PANEL
        ================================================= */}

        <header className="topBar">
          <button
            type="button"
            className="backButton"
            onClick={goBack}
          >
            ← Qo‘llanmalar
          </button>

          <div className="topTitle">
            QURBONOV.UZ
          </div>
        </header>

        {/* =================================================
            ASOSIY PANEL
        ================================================= */}

        <section className="mainPanel">
          <div className="floatingTitle">
            Inglizcha lug‘atlar
          </div>

          <div className="intro">
            <h1>Kerakli bo‘limni tanlang</h1>
          </div>

          {/* =================================================
              KARTALAR
          ================================================= */}

          <div className="cardGrid">
            {cards.map((card) => (
              <article
                key={card.href}
                className="dictionaryCard"
              >
                <div className="badge">
                  {card.badge}
                </div>

                <div className="cardContent">
                  <h2>{card.title}</h2>

                  <p>{card.subtitle}</p>
                </div>

                <button
                  type="button"
                  className="openButton"
                  onClick={() => {
                    window.location.href = card.href;
                  }}
                >
                  Ochish
                </button>
              </article>
            ))}
          </div>
        </section>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        /* =====================================================
           SAHIFA
        ===================================================== */

        .page {
          min-height: 100vh;

          padding:
            24px
            18px
            70px;

          background:
            radial-gradient(
              circle at top,
              #ffffff 0%,
              #f4f8fa 50%,
              #e8f0f4 100%
            );

          font-family:
            "Bell MT",
            "Times New Roman",
            Georgia,
            serif;

          color: #111;
        }

        .shell {
          width: min(1200px, 96%);

          margin: 0 auto;
        }

        button {
          font-family: inherit;
        }

        /* =====================================================
           YUQORI PANEL
        ===================================================== */

        .topBar {
          width: 100%;

          min-height: 100px;

          padding:
            18px
            30px;

          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 20px;

          border:
            3px solid
            #174461;

          border-radius: 25px;

          background:
            linear-gradient(
              180deg,
              #8bdcff 0%,
              #62bee9 47%,
              #399bc9 100%
            );

          box-shadow:
            inset 0 5px 4px
              rgba(255,255,255,.75),

            inset 0 -5px 5px
              rgba(0,0,0,.12),

            0 8px 0
              #174d6d,

            0 14px 18px
              rgba(0,0,0,.20);
        }

        .topTitle {
          color: #073b68;

          font-size: 20px;

          font-weight: 900;

          letter-spacing: 2px;

          text-shadow:
            0 1px 0
            rgba(255,255,255,.75);
        }

        /* =====================================================
           ORQAGA TUGMASI
        ===================================================== */

        .backButton {
          min-width: 170px;

          min-height: 50px;

          padding:
            9px
            22px;

          border:
            2px solid
            #174461;

          border-radius: 9px;

          background:
            linear-gradient(
              180deg,
              #b8edff 0%,
              #72c7ed 52%,
              #439ed0 100%
            );

          box-shadow:
            inset 0 4px 4px
              rgba(255,255,255,.8),

            inset 0 -3px 3px
              rgba(0,0,0,.12),

            0 5px 0
              #17415c,

            0 9px 11px
              rgba(0,0,0,.18);

          color: #073b68;

          font-size: 14px;

          font-weight: 700;

          cursor: pointer;

          transition:
            transform .1s ease,
            filter .1s ease,
            box-shadow .1s ease;
        }

        .backButton:hover {
          transform:
            translateY(-2px);

          filter:
            brightness(1.04);
        }

        .backButton:active {
          transform:
            translateY(3px);

          box-shadow:
            inset 0 4px 5px
              rgba(0,0,0,.1),

            0 1px 0
              #17415c;
        }

        /* =====================================================
           ASOSIY KULRANG PANEL
        ===================================================== */

        .mainPanel {
          position: relative;

          margin-top: 70px;

          padding:
            68px
            30px
            38px;

          border:
            3px solid
            #333a3e;

          border-radius: 23px;

          background:
            linear-gradient(
              180deg,
              #62686b 0%,
              #505659 46%,
              #3d4346 100%
            );

          box-shadow:
            inset 0 5px 5px
              rgba(255,255,255,.10),

            inset 0 -7px 7px
              rgba(0,0,0,.22),

            0 6px 0
              #30373b,

            0 11px 0
              #242a2d,

            0 17px 24px
              rgba(0,0,0,.22);
        }

        /* =====================================================
           INGLIZCHA LUG‘ATLAR SARLAVHASI
        ===================================================== */

        .floatingTitle {
          position: absolute;

          left: 50%;

          top: -31px;

          transform:
            translateX(-50%);

          min-width: 350px;

          min-height: 60px;

          padding:
            10px
            30px;

          display: flex;

          align-items: center;

          justify-content: center;

          border:
            3px solid
            #174461;

          border-radius: 12px;

          background:
            linear-gradient(
              180deg,
              #b1ebff 0%,
              #73c8ef 47%,
              #3d9dce 100%
            );

          box-shadow:
            inset 0 6px 5px
              rgba(255,255,255,.72),

            inset 0 -5px 5px
              rgba(0,0,0,.13),

            0 6px 0
              #17415c,

            0 10px 13px
              rgba(20,65,92,.24);

          color: #073b68;

          font-size: 30px;

          font-weight: 700;

          text-align: center;

          white-space: nowrap;
        }

        /* =====================================================
           INTRO
        ===================================================== */

        .intro {
          margin-bottom: 28px;

          text-align: center;
        }

        .intro h1 {
          margin: 0;

          color: #ffffff;

          font-size: 25px;

          font-weight: 700;

          text-shadow:
            0 2px 0
            rgba(0,0,0,.35);
        }

        /* =====================================================
           KARTALAR
        ===================================================== */

        .cardGrid {
          display: grid;

          grid-template-columns:
            repeat(
              3,
              minmax(0, 1fr)
            );

          gap: 25px;
        }

        .dictionaryCard {
          min-height: 225px;

          padding:
            22px
            18px
            20px;

          display: flex;

          flex-direction: column;

          align-items: center;

          justify-content: center;

          text-align: center;

          border:
            2px solid
            #596166;

          border-radius: 15px;

          background:
            linear-gradient(
              180deg,
              #f8f8f8 0%,
              #e9e9e9 45%,
              #c9c9c9 100%
            );

          box-shadow:
            inset 0 7px 6px
              rgba(255,255,255,.95),

            inset 0 -5px 5px
              rgba(0,0,0,.10),

            0 6px 0
              #596166,

            0 11px 12px
              rgba(0,0,0,.18);
        }

        /* =====================================================
           BADGE
        ===================================================== */

        .badge {
          min-width: 58px;

          min-height: 44px;

          padding:
            7px
            11px;

          margin-bottom: 15px;

          display: grid;

          place-items: center;

          border:
            2px solid
            #174461;

          border-radius: 10px;

          color: #073b68;

          background:
            linear-gradient(
              180deg,
              #c5f0ff 0%,
              #76c5ec 50%,
              #4da2d3 100%
            );

          box-shadow:
            inset 0 4px 4px
              rgba(255,255,255,.78),

            0 4px 0
              #17415c;

          font-size: 15px;

          font-weight: 900;
        }

        /* =====================================================
           KARTA MATNI
        ===================================================== */

        .cardContent {
          flex: 1;

          display: flex;

          flex-direction: column;

          align-items: center;

          justify-content: center;
        }

        .dictionaryCard h2 {
          margin:
            0
            0
            8px;

          color: #111;

          font-size: 22px;

          line-height: 1.15;
        }

        .dictionaryCard p {
          max-width: 300px;

          margin: 0;

          color: #525c62;

          font-size: 13px;

          line-height: 1.35;

          font-weight: 700;
        }

        /* =====================================================
           OCHISH TUGMASI
        ===================================================== */

        .openButton {
          min-width: 150px;

          min-height: 45px;

          margin-top: 18px;

          padding:
            8px
            20px;

          border:
            2px solid
            #174461;

          border-radius: 9px;

          color: #073b68;

          background:
            linear-gradient(
              180deg,
              #a8e7ff 0%,
              #72c3eb 55%,
              #4b9dcd 100%
            );

          box-shadow:
            inset 0 4px 4px
              rgba(255,255,255,.8),

            inset 0 -3px 3px
              rgba(0,0,0,.12),

            0 4px 0
              #17415c,

            0 8px 10px
              rgba(0,0,0,.18);

          font-size: 15px;

          font-weight: 700;

          cursor: pointer;

          transition:
            transform .1s ease,
            filter .1s ease,
            box-shadow .1s ease;
        }

        .openButton:hover {
          transform:
            translateY(-2px);

          filter:
            brightness(1.04);
        }

        .openButton:active {
          transform:
            translateY(3px);

          box-shadow:
            inset 0 4px 5px
              rgba(0,0,0,.10),

            0 1px 0
              #17415c;
        }

        /* =====================================================
           TABLET
        ===================================================== */

        @media (max-width: 1050px) {
          .cardGrid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );
          }
        }

        /* =====================================================
           TELEFON
        ===================================================== */

        @media (max-width: 640px) {
          .page {
            padding:
              10px
              8px
              35px;
          }

          .shell {
            width: 100%;
          }

          .topBar {
            min-height: 68px;

            padding:
              10px
              12px;

            border-radius: 18px;

            border-width: 2px;

            box-shadow:
              inset 0 4px 4px
                rgba(255,255,255,.68),

              inset 0 -4px 4px
                rgba(0,0,0,.10),

              0 5px 0
                #174d6d,

              0 9px 12px
                rgba(0,0,0,.16);
          }

          .topTitle {
            display: none;
          }

          .backButton {
            width: 100%;

            min-width: 0;

            min-height: 40px;

            padding:
              7px
              15px;

            font-size: 13px;

            border-radius: 8px;
          }

          .mainPanel {
            margin-top: 55px;

            padding:
              48px
              12px
              22px;

            border-radius: 18px;

            border-width: 2px;

            box-shadow:
              inset 0 4px 4px
                rgba(255,255,255,.08),

              inset 0 -5px 5px
                rgba(0,0,0,.18),

              0 4px 0
                #30373b,

              0 8px 0
                #242a2d,

              0 12px 16px
                rgba(0,0,0,.18);
          }

          .floatingTitle {
            top: -24px;

            width:
              min(
                86%,
                310px
              );

            min-width: 0;

            min-height: 46px;

            padding:
              7px
              14px;

            font-size: 21px;

            border-width: 2px;

            border-radius: 10px;

            white-space: normal;
          }

          .intro {
            margin-bottom: 18px;
          }

          .intro h1 {
            font-size: 20px;
          }

          .cardGrid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );

            gap: 12px;
          }

          .dictionaryCard {
            min-height: 190px;

            padding:
              15px
              8px
              14px;

            border-radius: 11px;

            box-shadow:
              inset 0 5px 4px
                rgba(255,255,255,.92),

              inset 0 -4px 4px
                rgba(0,0,0,.09),

              0 4px 0
                #596166,

              0 7px 8px
                rgba(0,0,0,.14);
          }

          .badge {
            min-width: 44px;

            min-height: 36px;

            margin-bottom: 10px;

            padding:
              5px
              7px;

            font-size: 12px;
          }

          .dictionaryCard h2 {
            font-size: 16px;
          }

          .dictionaryCard p {
            font-size: 10px;

            line-height: 1.25;
          }

          .openButton {
            min-width: 105px;

            min-height: 38px;

            margin-top: 12px;

            padding:
              6px
              10px;

            font-size: 12px;
          }
        }

        /* =====================================================
           JUDA KICHIK TELEFON
        ===================================================== */

        @media (max-width: 390px) {
          .cardGrid {
            grid-template-columns: 1fr;
          }

          .dictionaryCard {
            min-height: 165px;
          }

          .dictionaryCard h2 {
            font-size: 18px;
          }

          .dictionaryCard p {
            font-size: 11px;
          }

          .openButton {
            min-width: 125px;
          }
        }
      `}</style>
    </main>
  );
}
