"use client";

export default function QollanmalarPage() {
  function goHome() {
    window.location.href = "/";
  }

  const cards = [
    {
      title: "Kodekslar",
      subtitle: "O‘zbekiston Respublikasi kodekslari",
      href: "/qollanmalar/kodekslar",
      badge: "K",
    },
    {
      title: "Qonun va qonunchilik hujjatlari",
      subtitle: "Qonunlar va boshqa normativ-huquqiy hujjatlar",
      href: "/qollanmalar/qonunlar",
      badge: "Q",
    },
    {
      title: "Darsliklar",
      subtitle: "Huquqiy fanlar bo‘yicha darslik va o‘quv materiallari",
      href: "/qollanmalar/darsliklar",
      badge: "D",
    },
    {
      title: "English Vocabulary",
      subtitle: "4000 Essential English Words",
      href: "/qollanmalar/english-vocabulary",
      badge: "EN",
    },
    {
      title: "Inglizcha lug‘atlar",
      subtitle: "English–Uzbek, Phrasal Verbs, Irregular Verbs va boshqalar",
      href: "/qollanmalar/dictionaries",
      badge: "L",
    },
  ];

  return (
    <main className="page">
      <div className="shell">
        <header className="guideBar">
          <button
            type="button"
            className="backButton"
            onClick={goHome}
          >
            ← Asosiy sahifa
          </button>

          <div className="guideBarTitle">
            QURBONOV.UZ
          </div>
        </header>

        <section className="mainPanel">
          <div className="floatingTitle">
            Qo‘llanmalar
          </div>

          <div className="intro">
            <h1>Kerakli bo‘limni tanlang</h1>
          </div>

          <div className="cardGrid">
            {cards.map((card) => (
              <article
                key={card.href}
                className="guideCard"
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
                    window.location.href =
                      card.href;
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

        .page {
          min-height: 100vh;

          padding:
            24px 18px
            70px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #f5f7f8 60%,
              #e9edef 100%
            );

          font-family:
            "Bell MT",
            "Times New Roman",
            serif;

          color:
            #111;
        }

        .shell {
          width:
            min(
              1200px,
              96%
            );

          margin:
            0 auto;
        }

        /* =====================================================
           YUQORI PANEL
        ===================================================== */

        .guideBar {
          position:
            relative;

          width:
            100%;

          min-height:
            112px;

          display:
            flex;

          align-items:
            center;

          justify-content:
            space-between;

          gap:
            18px;

          padding:
            20px 32px;

          border:
            3px solid
            #174461;

          border-radius:
            28px;

          background:
            linear-gradient(
              180deg,
              #8bd4fa 0%,
              #68bae8 48%,
              #4da2d3 100%
            );

          box-shadow:
            inset 0 5px 4px
              rgba(
                255,
                255,
                255,
                .72
              ),

            inset 0 -6px 6px
              rgba(
                0,
                0,
                0,
                .10
              ),

            0 8px 0
              #174d6d,

            0 14px 18px
              rgba(
                0,
                0,
                0,
                .20
              );

          margin-bottom:
            34px;
        }

        .guideBarTitle {
          color:
            #073b68;

          font-size:
            20px;

          font-weight:
            900;

          letter-spacing:
            2px;

          text-shadow:
            0 1px 0
              rgba(
                255,
                255,
                255,
                .7
              );
        }

        .backButton {
          min-width:
            168px;

          min-height:
            52px;

          padding:
            10px 24px;

          border:
            2px solid
            #174461;

          border-radius:
            9px;

          background:
            linear-gradient(
              180deg,
              #a8e7ff 0%,
              #72c3eb 55%,
              #4b9dcd 100%
            );

          box-shadow:
            inset 0 4px 4px
              rgba(
                255,
                255,
                255,
                .8
              ),

            inset 0 -3px 3px
              rgba(
                0,
                0,
                0,
                .12
              ),

            0 4px 0
              #17415c,

            0 8px 10px
              rgba(
                0,
                0,
                0,
                .18
              );

          color:
            #073b68;

          font-family:
            inherit;

          font-size:
            14px;

          font-weight:
            700;

          cursor:
            pointer;

          transition:
            transform .10s ease,
            filter .10s ease,
            box-shadow .10s ease;
        }

        .backButton:hover {
          transform:
            translateY(
              -2px
            );

          filter:
            brightness(
              1.035
            );
        }

        .backButton:active {
          transform:
            translateY(
              3px
            );

          box-shadow:
            inset 0 4px 5px
              rgba(
                0,
                0,
                0,
                .10
              ),

            0 1px 0
              #17415c;
        }

        /* =====================================================
           ASOSIY PANEL
        ===================================================== */

        .mainPanel {
          position:
            relative;

          margin-top:
            76px;

          padding:
            70px 30px
            38px;

          border:
            3px solid
            #333a3e;

          border-radius:
            23px;

          background:
            linear-gradient(
              180deg,
              #62686b 0%,
              #505659 46%,
              #3d4346 100%
            );

          box-shadow:
            inset 0 5px 5px
              rgba(
                255,
                255,
                255,
                .10
              ),

            inset 0 -7px 7px
              rgba(
                0,
                0,
                0,
                .22
              ),

            0 6px 0
              #30373b,

            0 11px 0
              #242a2d,

            0 17px 24px
              rgba(
                0,
                0,
                0,
                .22
              );
        }

        .floatingTitle {
          position:
            absolute;

          left:
            50%;

          top:
            -31px;

          transform:
            translateX(
              -50%
            );

          min-width:
            340px;

          min-height:
            58px;

          padding:
            10px 28px;

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;

          border:
            3px solid
            #174461;

          border-radius:
            12px;

          background:
            linear-gradient(
              180deg,
              #a9e7ff 0%,
              #75c5ed 47%,
              #4a9dce 100%
            );

          box-shadow:
            inset 0 6px 5px
              rgba(
                255,
                255,
                255,
                .70
              ),

            inset 0 -5px 5px
              rgba(
                0,
                0,
                0,
                .13
              ),

            0 6px 0
              #17415c,

            0 10px 13px
              rgba(
                20,
                65,
                92,
                .24
              );

          color:
            #073b68;

          font-size:
            30px;

          font-weight:
            700;

          text-align:
            center;

          white-space:
            nowrap;
        }

        .intro {
          margin-bottom:
            30px;

          text-align:
            center;
        }

        .intro h1 {
          margin:
            0;

          color:
            #ffffff;

          font-size:
            28px;

          font-weight:
            700;

          text-shadow:
            0 2px 0
              rgba(
                0,
                0,
                0,
                .35
              );
        }

        /* =====================================================
           KARTALAR
        ===================================================== */

        .cardGrid {
          display:
            grid;

          grid-template-columns:
            repeat(
              3,
              minmax(
                0,
                1fr
              )
            );

          gap:
            26px;
        }

        .guideCard {
          min-height:
            230px;

          padding:
            24px 20px
            22px;

          display:
            flex;

          flex-direction:
            column;

          align-items:
            center;

          justify-content:
            center;

          text-align:
            center;

          border:
            2px solid
            #596166;

          border-radius:
            15px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #ededed 42%,
              #c8c8c8 100%
            );

          box-shadow:
            inset 0 7px 6px
              rgba(
                255,
                255,
                255,
                .95
              ),

            inset 0 -5px 5px
              rgba(
                0,
                0,
                0,
                .10
              ),

            0 6px 0
              #596166,

            0 11px 12px
              rgba(
                0,
                0,
                0,
                .18
              );
        }

        .badge {
          min-width:
            58px;

          min-height:
            44px;

          padding:
            7px 11px;

          margin-bottom:
            15px;

          display:
            grid;

          place-items:
            center;

          border:
            2px solid
            #174461;

          border-radius:
            10px;

          color:
            #073b68;

          background:
            linear-gradient(
              180deg,
              #c5f0ff 0%,
              #76c5ec 50%,
              #4da2d3 100%
            );

          box-shadow:
            inset 0 4px 4px
              rgba(
                255,
                255,
                255,
                .78
              ),

            0 4px 0
              #17415c;

          font-size:
            16px;

          font-weight:
            900;
        }

        .cardContent {
          flex:
            1;

          display:
            flex;

          flex-direction:
            column;

          align-items:
            center;

          justify-content:
            center;
        }

        .guideCard h2 {
          margin:
            0 0 8px;

          color:
            #111;

          font-size:
            24px;

          line-height:
            1.15;
        }

        .guideCard p {
          max-width:
            300px;

          margin:
            0;

          color:
            #525c62;

          font-size:
            14px;

          line-height:
            1.35;

          font-weight:
            700;
        }

        .openButton {
          min-width:
            150px;

          min-height:
            45px;

          margin-top:
            20px;

          padding:
            8px 20px;

          border:
            2px solid
            #174461;

          border-radius:
            9px;

          color:
            #073b68;

          background:
            linear-gradient(
              180deg,
              #a8e7ff 0%,
              #72c3eb 55%,
              #4b9dcd 100%
            );

          box-shadow:
            inset 0 4px 4px
              rgba(
                255,
                255,
                255,
                .8
              ),

            inset 0 -3px 3px
              rgba(
                0,
                0,
                0,
                .12
              ),

            0 4px 0
              #17415c,

            0 8px 10px
              rgba(
                0,
                0,
                0,
                .18
              );

          font-family:
            inherit;

          font-size:
            15px;

          font-weight:
            700;

          cursor:
            pointer;

          transition:
            transform .10s ease,
            filter .10s ease,
            box-shadow .10s ease;
        }

        .openButton:hover {
          transform:
            translateY(
              -2px
            );

          filter:
            brightness(
              1.04
            );
        }

        .openButton:active {
          transform:
            translateY(
              3px
            );

          box-shadow:
            inset 0 4px 5px
              rgba(
                0,
                0,
                0,
                .10
              ),

            0 1px 0
              #17415c;
        }

        /* =====================================================
           TABLET
        ===================================================== */

        @media (
          max-width:
            1050px
        ) {
          .cardGrid {
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

        /* =====================================================
           MOBILE
        ===================================================== */

        @media (
          max-width:
            640px
        ) {
          .page {
            padding:
              10px 8px
              34px;
          }

          .shell {
            width:
              100%;
          }

          .guideBar {
            min-height:
              68px;

            padding:
              10px 12px;

            margin-bottom:
              22px;

            border-radius:
              18px;

            border-width:
              2px;

            box-shadow:
              inset 0 4px 4px
                rgba(
                  255,
                  255,
                  255,
                  .68
                ),

              inset 0 -4px 4px
                rgba(
                  0,
                  0,
                  0,
                  .10
                ),

              0 5px 0
                #174d6d,

              0 9px 12px
                rgba(
                  0,
                  0,
                  0,
                  .16
                );
          }

          .guideBarTitle {
            display:
              none;
          }

          .backButton {
            width:
              100%;

            min-width:
              0;

            min-height:
              40px;

            padding:
              7px 15px;

            font-size:
              13px;

            border-radius:
              8px;
          }

          .mainPanel {
            margin-top:
              55px;

            padding:
              48px 14px
              22px;

            border-radius:
              18px;

            border-width:
              2px;

            box-shadow:
              inset 0 4px 4px
                rgba(
                  255,
                  255,
                  255,
                  .08
                ),

              inset 0 -5px 5px
                rgba(
                  0,
                  0,
                  0,
                  .18
                ),

              0 4px 0
                #30373b,

              0 8px 0
                #242a2d,

              0 12px 16px
                rgba(
                  0,
                  0,
                  0,
                  .18
                );
          }

          .floatingTitle {
            top:
              -24px;

            width:
              min(
                82%,
                300px
              );

            min-width:
              0;

            min-height:
              46px;

            padding:
              7px 16px;

            font-size:
              22px;

            border-width:
              2px;

            border-radius:
              10px;

            box-shadow:
              inset 0 4px 4px
                rgba(
                  255,
                  255,
                  255,
                  .68
                ),

              inset 0 -4px 4px
                rgba(
                  0,
                  0,
                  0,
                  .12
                ),

              0 4px 0
                #17415c,

              0 7px 9px
                rgba(
                  20,
                  65,
                  92,
                  .20
                );
          }

          .intro {
            margin-bottom:
              18px;
          }

          .intro h1 {
            font-size:
              21px;
          }

          .cardGrid {
            grid-template-columns:
              repeat(
                2,
                minmax(
                  0,
                  1fr
                )
              );

            gap:
              12px;
          }

          .guideCard {
            min-height:
              180px;

            padding:
              16px 9px
              14px;

            border-radius:
              11px;

            box-shadow:
              inset 0 5px 4px
                rgba(
                  255,
                  255,
                  255,
                  .92
                ),

              inset 0 -4px 4px
                rgba(
                  0,
                  0,
                  0,
                  .09
                ),

              0 4px 0
                #596166,

              0 7px 8px
                rgba(
                  0,
                  0,
                  0,
                  .14
                );
          }

          .badge {
            min-width:
              44px;

            min-height:
              36px;

            margin-bottom:
              9px;

            font-size:
              13px;
          }

          .guideCard h2 {
            font-size:
              17px;
          }

          .guideCard p {
            font-size:
              11px;

            line-height:
              1.25;
          }

          .openButton {
            min-width:
              110px;

            min-height:
              38px;

            margin-top:
              13px;

            padding:
              6px 12px;

            font-size:
              12px;
          }
        }

        @media (
          max-width:
            390px
        ) {
          .cardGrid {
            grid-template-columns:
              1fr;
          }

          .guideCard {
            min-height:
              165px;
          }
        }
      `}</style>
    </main>
  );
}
