"use client";

export default function KazuslarPage() {
  function goBack() {
    window.location.href = "/";
  }

  return (
    <main className="page">
      <header className="topPanel">
        <div className="titlePlate">
          Talabalar — Kazuslar
        </div>

        <button
          className="backButton"
          onClick={goBack}
        >
          Orqaga
        </button>
      </header>

      <section className="mainBox">
        <div className="sectionTitle">
          Kazuslar
        </div>

        <div className="cases">
          <article className="caseCard">
            <h2>1-kazus</h2>

            <button className="openButton">
              Ochish
            </button>
          </article>

          <article className="caseCard">
            <h2>2-kazus</h2>

            <button className="openButton">
              Ochish
            </button>
          </article>

          <article className="caseCard">
            <h2>3-kazus</h2>

            <button className="openButton">
              Ochish
            </button>
          </article>
        </div>
      </section>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          padding: 20px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #f2f4f5 100%
            );

          font-family:
            "Bell MT",
            "Times New Roman",
            serif;
        }

        .topPanel {
          width: 100%;
          min-height: 120px;

          padding: 25px 30px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 25px;

          border: 3px solid #173e58;
          border-radius: 27px;

          background:
            linear-gradient(
              180deg,
              #8bd3ff 0%,
              #69b7e8 45%,
              #4999ce 100%
            );

          box-shadow:
            inset 0 6px 6px rgba(255, 255, 255, 0.75),
            inset 0 -7px 7px rgba(0, 0, 0, 0.18),
            0 7px 0 #173c55,
            0 12px 18px rgba(0, 0, 0, 0.22);
        }

        .titlePlate {
          min-width: 430px;

          padding: 18px 28px;

          text-align: center;

          font-size: 29px;
          font-weight: 700;

          border: 3px solid #42494e;
          border-radius: 16px;

          background:
            linear-gradient(
              180deg,
              #f7f7f7 0%,
              #dedede 30%,
              #b9b9b9 70%,
              #9f9f9f 100%
            );

          box-shadow:
            inset 0 6px 5px rgba(255, 255, 255, 0.95),
            inset 0 -6px 6px rgba(0, 0, 0, 0.2),
            0 5px 0 #4b5256,
            0 9px 11px rgba(0, 0, 0, 0.23);
        }

        .backButton {
          width: 150px;
          height: 58px;

          border: 3px solid #464c50;
          border-radius: 14px;

          cursor: pointer;

          font-family: inherit;
          font-size: 17px;
          font-weight: 700;

          background:
            linear-gradient(
              180deg,
              #f8f8f8 0%,
              #dedede 30%,
              #b8b8b8 70%,
              #999999 100%
            );

          box-shadow:
            inset 0 5px 5px rgba(255, 255, 255, 0.95),
            inset 0 -6px 6px rgba(0, 0, 0, 0.2),
            0 5px 0 #4b5256;
        }

        .mainBox {
          position: relative;

          width: min(1400px, 95%);

          margin: 90px auto 40px;

          padding: 75px 35px 50px;

          border: 3px solid #303538;
          border-radius: 28px;

          background:
            linear-gradient(
              145deg,
              #686c6f 0%,
              #505457 45%,
              #363a3d 100%
            );

          box-shadow:
            inset 0 7px 6px rgba(255, 255, 255, 0.23),
            inset 0 -8px 8px rgba(0, 0, 0, 0.32),
            0 7px 0 #272b2e,
            0 15px 24px rgba(0, 0, 0, 0.3);
        }

        .sectionTitle {
          position: absolute;

          top: -35px;
          left: 50%;

          transform: translateX(-50%);

          width: 310px;
          height: 66px;

          display: flex;
          align-items: center;
          justify-content: center;

          font-size: 28px;
          font-weight: 700;

          color: #073b68;

          border: 3px solid #174461;
          border-radius: 15px;

          background:
            linear-gradient(
              180deg,
              #9bd9ff 0%,
              #73bdea 45%,
              #4e9ccc 100%
            );

          box-shadow:
            inset 0 6px 5px rgba(255, 255, 255, 0.75),
            inset 0 -6px 6px rgba(0, 0, 0, 0.16),
            0 5px 0 #17415c,
            0 9px 13px rgba(0, 0, 0, 0.25);
        }

        .cases {
          display: grid;

          grid-template-columns:
            repeat(3, 1fr);

          gap: 30px;
        }

        .caseCard {
          min-height: 230px;

          padding: 30px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          border: 2px solid #3d4347;
          border-radius: 20px;

          background:
            linear-gradient(
              145deg,
              #e1e1e1 0%,
              #c5c5c5 50%,
              #a6a6a6 100%
            );

          box-shadow:
            inset 0 6px 5px rgba(255, 255, 255, 0.86),
            inset 0 -7px 7px rgba(0, 0, 0, 0.18),
            0 6px 0 #4a5054,
            0 11px 16px rgba(0, 0, 0, 0.25);
        }

        .caseCard h2 {
          margin-bottom: 35px;

          font-size: 28px;
        }

        .openButton {
          width: 170px;
          height: 48px;

          border: 2px solid #4e565b;
          border-radius: 9px;

          cursor: pointer;

          font-family: inherit;
          font-size: 17px;
          font-weight: 700;

          background:
            linear-gradient(
              180deg,
              #f8f8f8 0%,
              #bdbdbd 100%
            );

          box-shadow:
            inset 0 4px 4px white,
            0 4px 0 #555d61;
        }

        .openButton:hover,
        .backButton:hover {
          filter: brightness(1.08);
        }

        @media (max-width: 900px) {
          .cases {
            grid-template-columns: 1fr;
          }

          .topPanel {
            flex-direction: column;
          }

          .titlePlate {
            min-width: 0;
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}