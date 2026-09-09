"use client";

import {
  useRouter,
} from "next/navigation";

const grades = [
  {
    grade: 8,
    subtitle:
      "Davlat va huquq asoslari",
  },
  {
    grade: 9,
    subtitle:
      "Davlat va huquq asoslari",
  },
  {
    grade: 10,
    subtitle:
      "Davlat va huquq asoslari",
  },
  {
    grade: 11,
    subtitle:
      "Davlat va huquq asoslari",
  },
];

export default function ThematicGradeSelectorPage() {
  const router = useRouter();

  return (
    <main className="page">
      <div className="shell">

        {/* =========================
            YUQORI NAVIGATSIYA PANELI
        ========================= */}
        <section className="navPanel">
          <button
            type="button"
            className="backButton"
            onClick={() =>
              router.push("/test")
            }
          >
            ← Testlar
          </button>
        </section>

        {/* =========================
            SARLAVHA
        ========================= */}
        <section className="titlePlate">
          <div className="titleMain">
            Mavzulashtirilgan testlar
          </div>

          <div className="titleSub">
            Sinfni tanlang
          </div>
        </section>

        {/* =========================
            SINFLAR
        ========================= */}
        <section className="gradeGrid">
          {grades.map(
            (item) => (
              <button
                key={item.grade}
                type="button"
                className="gradeButton"
                onClick={() =>
                  router.push(
                    `/test/thematic/${item.grade}`
                  )
                }
              >
                <span className="gradeNumber">
                  {item.grade}
                </span>

                <span className="gradeText">
                  <strong>
                    {item.grade}-sinf
                  </strong>

                  <small>
                    {item.subtitle}
                  </small>
                </span>

                <span className="arrow">
                  →
                </span>
              </button>
            )
          )}
        </section>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          padding:
            28px 16px 70px;

          background:
            linear-gradient(
              180deg,
              #d7edf8 0%,
              #c5e0ee 45%,
              #d9eef7 100%
            );

          color: #17242b;

          font-family:
            Georgia,
            "Times New Roman",
            serif;
        }

        /* =========================
           UMUMIY KENGLIK
        ========================= */

        .shell {
          width: 96%;
          max-width: none;

          margin: 0 auto;
        }

        /* =========================
           YUQORI 3D NAV PANEL
        ========================= */

        .navPanel {
          width: 100%;

          min-height: 78px;

          padding:
            12px 16px;

          display: flex;

          align-items: center;

          justify-content:
            flex-start;

          margin-bottom: 34px;

          border:
            2px solid #4e626c;

          border-radius: 16px;

          background:
            linear-gradient(
              180deg,
              #f4f6f7 0%,
              #e4e8ea 48%,
              #cbd2d6 100%
            );

          box-shadow:
            inset 0 4px 3px
              rgba(
                255,
                255,
                255,
                .92
              ),

            inset 0 -3px 3px
              rgba(
                70,
                86,
                94,
                .13
              ),

            0 6px 0
              #687a83,

            0 11px 18px
              rgba(
                0,
                0,
                0,
                .13
              );
        }

        .backButton {
          min-width: 145px;

          min-height: 48px;

          padding:
            0 22px;

          border:
            2px solid
              #405761;

          border-radius: 10px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #e9edef 52%,
              #d1d9dd 100%
            );

          box-shadow:
            inset 0 3px 2px
              rgba(
                255,
                255,
                255,
                .95
              ),

            0 4px 0
              #62757e;

          color: #203641;

          font-family: inherit;

          font-size: 17px;

          font-weight: 900;

          cursor: pointer;

          transition:
            transform .12s ease,
            box-shadow .12s ease;
        }

        .backButton:hover {
          transform:
            translateY(-1px);
        }

        .backButton:active {
          transform:
            translateY(3px);

          box-shadow:
            inset 0 2px 0
              #ffffff,

            0 1px 0
              #62757e;
        }

        /* =========================
           SARLAVHA PANELI
        ========================= */

        .titlePlate {
          width: 100%;

          margin-bottom: 34px;

          padding:
            26px 24px;

          border:
            3px solid #40545e;

          border-radius: 18px;

          background:
            linear-gradient(
              180deg,
              #edf0f1 0%,
              #d9dee0 46%,
              #c6cccf 100%
            );

          box-shadow:
            inset 0 4px 0
              rgba(
                255,
                255,
                255,
                .92
              ),

            inset 0 -3px 4px
              rgba(
                70,
                80,
                85,
                .14
              ),

            0 8px 0
              #64737a,

            0 15px 25px
              rgba(
                0,
                0,
                0,
                .14
              );

          text-align: center;
        }

        .titleMain {
          font-size:
            clamp(
              28px,
              3vw,
              38px
            );

          font-weight: 900;
        }

        .titleSub {
          margin-top: 6px;

          color: #435158;

          font-size: 19px;

          font-weight: 800;
        }

        /* =========================
           SINFLAR GRID
        ========================= */

        .gradeGrid {
          width: 100%;

          display: grid;

          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );

          gap: 22px;
        }

        .gradeButton {
          min-height: 132px;

          display: grid;

          grid-template-columns:
            76px
            minmax(0, 1fr)
            40px;

          align-items: center;

          gap: 16px;

          padding: 20px;

          border:
            3px solid #285b77;

          border-radius: 16px;

          background:
            linear-gradient(
              180deg,
              #8bd5fb 0%,
              #55b6e8 54%,
              #3595c7 100%
            );

          box-shadow:
            inset 0 3px 0
              rgba(
                255,
                255,
                255,
                .72
              ),

            inset 0 -2px 0
              rgba(
                0,
                0,
                0,
                .12
              ),

            0 8px 0
              #205b7b,

            0 14px 20px
              rgba(
                0,
                0,
                0,
                .15
              );

          color: #102d3c;

          font-family: inherit;

          text-align: left;

          cursor: pointer;

          transition:
            transform .12s ease,
            filter .12s ease,
            box-shadow .12s ease;
        }

        .gradeButton:hover {
          filter:
            brightness(1.03);

          transform:
            translateY(-1px);
        }

        .gradeButton:active {
          transform:
            translateY(4px);

          box-shadow:
            inset 0 3px 0
              rgba(
                255,
                255,
                255,
                .68
              ),

            0 4px 0
              #205b7b;
        }

        .gradeNumber {
          width: 68px;

          height: 68px;

          display: grid;

          place-items: center;

          border:
            2px solid
              rgba(
                22,
                62,
                82,
                .52
              );

          border-radius: 14px;

          background:
            rgba(
              255,
              255,
              255,
              .50
            );

          font-size: 30px;

          font-weight: 900;
        }

        .gradeText {
          min-width: 0;
        }

        .gradeText strong {
          display: block;

          font-size: 25px;

          font-weight: 900;
        }

        .gradeText small {
          display: block;

          margin-top: 6px;

          font-size: 14px;

          font-weight: 800;
        }

        .arrow {
          font-size: 30px;

          font-weight: 900;

          text-align: center;
        }

        /* =========================
           TABLET
        ========================= */

        @media (
          max-width: 900px
        ) {
          .shell {
            width: 96%;
          }

          .gradeGrid {
            grid-template-columns:
              1fr;
          }
        }

        /* =========================
           TELEFON
        ========================= */

        @media (
          max-width: 720px
        ) {
          .page {
            padding:
              18px 10px 50px;
          }

          .shell {
            width: 98%;
          }

          .navPanel {
            min-height: 68px;

            padding:
              10px 12px;

            margin-bottom: 28px;

            border-radius: 14px;
          }

          .backButton {
            min-width: 125px;

            min-height: 44px;

            padding:
              0 16px;

            font-size: 15px;
          }

          .titlePlate {
            padding:
              22px 14px;

            border-radius: 15px;
          }

          .titleMain {
            font-size: 27px;
          }

          .titleSub {
            font-size: 17px;
          }

          .gradeButton {
            min-height: 105px;

            grid-template-columns:
              60px
              minmax(0,1fr)
              30px;

            gap: 12px;

            padding:
              16px 14px;
          }

          .gradeNumber {
            width: 54px;

            height: 54px;

            font-size: 24px;
          }

          .gradeText strong {
            font-size: 21px;
          }

          .gradeText small {
            font-size: 13px;
          }

          .arrow {
            font-size: 25px;
          }
        }

        @media (
          max-width: 420px
        ) {
          .shell {
            width: 100%;
          }

          .titleMain {
            font-size: 24px;
          }

          .gradeButton {
            grid-template-columns:
              54px
              minmax(0,1fr)
              24px;
          }

          .gradeNumber {
            width: 50px;

            height: 50px;

            font-size: 22px;
          }

          .gradeText strong {
            font-size: 19px;
          }
        }
      `}</style>
    </main>
  );
}
