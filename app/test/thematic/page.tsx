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
        <button
          type="button"
          className="backButton"
          onClick={() =>
            router.push("/test")
          }
        >
          ← Testlar
        </button>

        <section className="titlePlate">
          <div className="titleMain">
            Mavzulashtirilgan testlar
          </div>

          <div className="titleSub">
            Sinfni tanlang
          </div>
        </section>

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
          padding: 38px 18px 70px;
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

        .shell {
          width: min(1000px, 100%);
          margin: 0 auto;
        }

        .backButton {
          margin-bottom: 24px;
          padding: 10px 18px;
          border: 2px solid #324b58;
          border-radius: 10px;
          background:
            linear-gradient(
              180deg,
              #f7f9fa,
              #d6dde1
            );
          box-shadow:
            inset 0 2px 0 #ffffff,
            0 5px 0 #667780;
          color: #203641;
          font-family: inherit;
          font-weight: 900;
          cursor: pointer;
        }

        .backButton:active {
          transform: translateY(3px);
          box-shadow:
            inset 0 2px 0 #ffffff,
            0 2px 0 #667780;
        }

        .titlePlate {
          margin-bottom: 34px;
          padding: 24px;
          border: 3px solid #40545e;
          border-radius: 16px;
          background:
            linear-gradient(
              180deg,
              #e7eaec 0%,
              #c6cccf 100%
            );
          box-shadow:
            inset 0 3px 0 rgba(255,255,255,.9),
            0 8px 0 #64737a,
            0 15px 25px rgba(0,0,0,.15);
          text-align: center;
        }

        .titleMain {
          font-size: clamp(26px, 3vw, 36px);
          font-weight: 900;
        }

        .titleSub {
          margin-top: 6px;
          color: #435158;
          font-size: 19px;
          font-weight: 800;
        }

        .gradeGrid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 22px;
        }

        .gradeButton {
          min-height: 130px;
          display: grid;
          grid-template-columns:
            76px minmax(0, 1fr) 40px;
          align-items: center;
          gap: 16px;
          padding: 20px;
          border: 3px solid #285b77;
          border-radius: 16px;
          background:
            linear-gradient(
              180deg,
              #8bd5fb 0%,
              #55b6e8 54%,
              #3595c7 100%
            );
          box-shadow:
            inset 0 3px 0 rgba(255,255,255,.72),
            inset 0 -2px 0 rgba(0,0,0,.12),
            0 8px 0 #205b7b,
            0 14px 20px rgba(0,0,0,.15);
          color: #102d3c;
          font-family: inherit;
          text-align: left;
          cursor: pointer;
        }

        .gradeButton:active {
          transform: translateY(4px);
          box-shadow:
            inset 0 3px 0 rgba(255,255,255,.68),
            0 4px 0 #205b7b;
        }

        .gradeNumber {
          width: 68px;
          height: 68px;
          display: grid;
          place-items: center;
          border: 2px solid rgba(22,62,82,.52);
          border-radius: 14px;
          background: rgba(255,255,255,.5);
          font-size: 30px;
          font-weight: 900;
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

        @media (max-width: 720px) {
          .gradeGrid {
            grid-template-columns: 1fr;
          }

          .gradeButton {
            min-height: 105px;
            grid-template-columns:
              60px minmax(0,1fr) 30px;
          }

          .gradeNumber {
            width: 54px;
            height: 54px;
            font-size: 24px;
          }

          .gradeText strong {
            font-size: 21px;
          }
        }
      `}</style>
    </main>
  );
}

