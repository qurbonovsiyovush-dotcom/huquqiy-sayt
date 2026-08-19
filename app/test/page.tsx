"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type TestData = {
  id: string;
  title: string;
  subject: string;
  duration: number;
  description?: string;
  status: "draft" | "published";
  questions?: unknown[];
  createdAt?: string;
  updatedAt?: string;
};

export default function TestPage() {
  const router = useRouter();

  const [tests, setTests] = useState<TestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  /* =====================================================
     TESTLARNI SERVERDAN OLISH
  ===================================================== */

  useEffect(() => {
    loadTests();
  }, []);

  async function loadTests() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/tests", {
        method: "GET",
        cache: "no-store",
      });

      let data: any = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data?.message || "Testlarni yuklab bo‘lmadi."
        );
      }

      /*
        API ikki xil format qaytarsa ham ishlaydi:

        {
          success: true,
          tests: [...]
        }

        yoki to'g'ridan-to'g'ri:

        [...]
      */

      const receivedTests: TestData[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.tests)
        ? data.tests
        : [];

      /*
        FOYDALANUVCHI FAQAT PUBLISHED
        TESTLARNI KO'RADI.
      */

      const publishedTests = receivedTests.filter(
        (test) => test.status === "published"
      );

      setTests(publishedTests);
    } catch (err) {
      console.error("TEST LOAD ERROR:", err);

      setTests([]);

      setError(
        err instanceof Error
          ? err.message
          : "Testlarni yuklashda xatolik yuz berdi."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =====================================================
     QIDIRUV
  ===================================================== */

  const filteredTests = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return tests;
    }

    return tests.filter((test) => {
      const title = String(test.title || "").toLowerCase();
      const subject = String(test.subject || "").toLowerCase();
      const description = String(
        test.description || ""
      ).toLowerCase();

      return (
        title.includes(query) ||
        subject.includes(query) ||
        description.includes(query)
      );
    });
  }, [tests, search]);

  /* =====================================================
     TESTNI BOSHLASH
  ===================================================== */

  function startTest(id: string) {
    if (!id) {
      window.alert("Test ID topilmadi.");
      return;
    }

    router.push(`/test/${encodeURIComponent(id)}`);
  }

  /* =====================================================
     UI
  ===================================================== */

  return (
    <main className="page">
      {/* =================================================
          HEADER
      ================================================= */}

      <header className="header">
        <div className="headerTitle">
          Online testlar
        </div>

        <button
          type="button"
          className="homeButton"
          onClick={() => router.push("/")}
        >
          Asosiy sahifa
        </button>
      </header>

      {/* =================================================
          TEST BO'LIMI
      ================================================= */}

      <section className="mainPanel">
        <div className="sectionTitle">
          Test bo‘limi
        </div>

        <div className="welcomeBox">
          <h1>
            Bilimingizni sinab ko‘ring
          </h1>

          <p>
            Kerakli testni tanlang va testni boshlang.
          </p>
        </div>
      </section>

      {/* =================================================
          QIDIRUV
      ================================================= */}

      <section className="searchPanel">
        <div className="sectionTitle">
          Qidiruv
        </div>

        <div className="searchInner">
          <div className="searchWrapper">
            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Test nomi yoki fan bo‘yicha qidirish..."
              dir="ltr"
            />

            {search && (
              <button
                type="button"
                className="clearButton"
                onClick={() => setSearch("")}
                title="Tozalash"
              >
                ×
              </button>
            )}
          </div>

          <button
            type="button"
            className="refreshButton"
            onClick={loadTests}
            disabled={loading}
          >
            Yangilash
          </button>
        </div>
      </section>

      {/* =================================================
          TESTLAR
      ================================================= */}

      <section className="testsPanel">
        <div className="sectionTitle">
          Mavjud testlar
        </div>

        <div className="testsInner">
          {/* LOADING */}

          {loading && (
            <div className="messageBox">
              <div className="loader" />

              <h2>
                Testlar yuklanmoqda...
              </h2>
            </div>
          )}

          {/* ERROR */}

          {!loading && error && (
            <div className="messageBox errorMessage">
              <div className="messageIcon">
                !
              </div>

              <h2>
                Testlarni yuklab bo‘lmadi
              </h2>

              <p>
                {error}
              </p>

              <button
                type="button"
                className="retryButton"
                onClick={loadTests}
              >
                Qayta urinish
              </button>
            </div>
          )}

          {/* TEST YO'Q */}

          {!loading &&
            !error &&
            filteredTests.length === 0 && (
              <div className="messageBox">
                <div className="messageIcon">
                  ?
                </div>

                <h2>
                  {search
                    ? "Qidiruv bo‘yicha test topilmadi"
                    : "Hozircha e’lon qilingan test yo‘q"}
                </h2>

                <p>
                  {search
                    ? "Boshqa test nomi yoki fan nomini yozib ko‘ring."
                    : "Administrator testni e’lon qilgandan so‘ng shu yerda ko‘rinadi."}
                </p>
              </div>
            )}

          {/* TESTLAR */}

          {!loading &&
            !error &&
            filteredTests.length > 0 && (
              <div className="testGrid">
                {filteredTests.map((test) => {
                  const questionCount = Array.isArray(
                    test.questions
                  )
                    ? test.questions.length
                    : 0;

                  return (
                    <article
                      key={test.id}
                      className="testCard"
                    >
                      <div className="publishedBadge">
                        TEST
                      </div>

                      <div className="testCardTop">
                        <h2>
                          {test.title ||
                            "Nomsiz test"}
                        </h2>

                        <div className="subject">
                          {test.subject ||
                            "Fan ko‘rsatilmagan"}
                        </div>
                      </div>

                      {test.description && (
                        <p className="description">
                          {test.description}
                        </p>
                      )}

                      <div className="information">
                        <div className="infoBox">
                          <span>
                            Savollar
                          </span>

                          <strong>
                            {questionCount}
                          </strong>
                        </div>

                        <div className="infoBox">
                          <span>
                            Vaqt
                          </span>

                          <strong>
                            {Number(
                              test.duration
                            ) || 0}
                            <small>
                              {" "}
                              daqiqa
                            </small>
                          </strong>
                        </div>

                        <div className="infoBox">
                          <span>
                            Holati
                          </span>

                          <strong className="ready">
                            Tayyor
                          </strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="startButton"
                        onClick={() =>
                          startTest(test.id)
                        }
                      >
                        TESTNI BOSHLASH
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
        </div>
      </section>

      {/* =================================================
          CSS
      ================================================= */}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          width: 100%;
          min-height: 100vh;

          padding:
            20px 20px 100px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #fafafa 50%,
              #edf1f3 100%
            );

          color: #111;

          font-family:
            "Bell MT",
            "Times New Roman",
            serif;
        }

        button,
        input {
          font-family: inherit;
        }

        button {
          cursor: pointer;
        }

        button:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        /* ===============================================
           HEADER
        =============================================== */

        .header {
          width: 100%;

          min-height: 120px;

          margin: 0 auto;

          padding: 22px 28px;

          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 25px;

          border:
            3px solid #16405b;

          border-radius: 25px;

          background:
            linear-gradient(
              180deg,
              #a9e5ff 0%,
              #67b8e3 50%,
              #4b9dca 100%
            );

          box-shadow:
            inset 0 7px 5px
              rgba(255, 255, 255, 0.75),
            inset 0 -6px 5px
              rgba(0, 0, 0, 0.12),
            0 7px 0 #173e56,
            0 15px 25px
              rgba(0, 0, 0, 0.2);
        }

        .headerTitle {
          min-width: 330px;

          min-height: 72px;

          padding: 15px 30px;

          display: flex;

          align-items: center;

          justify-content: center;

          border:
            2px solid #555;

          border-radius: 15px;

          background:
            linear-gradient(
              #ffffff,
              #d1d1d1
            );

          box-shadow:
            inset 0 5px 5px white,
            0 5px 0 #555;

          font-size: 27px;

          font-weight: 700;

          text-align: center;
        }

        .homeButton {
          min-width: 155px;

          min-height: 55px;

          padding: 0 22px;

          border:
            2px solid #555;

          border-radius: 10px;

          background:
            linear-gradient(
              #ffffff,
              #c5c5c5
            );

          box-shadow:
            0 4px 0 #555;

          font-weight: 700;
        }

        .homeButton:hover {
          filter: brightness(1.05);
        }

        /* ===============================================
           UMUMIY PANEL
        =============================================== */

        .mainPanel,
        .searchPanel,
        .testsPanel {
          position: relative;

          width: min(1300px, 96%);

          margin:
            100px auto 0;

          padding:
            80px 35px 35px;

          border:
            3px solid #303538;

          border-radius: 27px;

          background:
            linear-gradient(
              145deg,
              #696d70 0%,
              #505457 50%,
              #363a3d 100%
            );

          box-shadow:
            inset 0 7px 6px
              rgba(255, 255, 255, 0.23),
            inset 0 -8px 8px
              rgba(0, 0, 0, 0.32),
            0 7px 0 #272b2e,
            0 15px 25px
              rgba(0, 0, 0, 0.24);
        }

        .sectionTitle {
          position: absolute;

          top: -36px;

          left: 50%;

          transform:
            translateX(-50%);

          min-width: 330px;

          min-height: 70px;

          padding: 10px 30px;

          display: flex;

          align-items: center;

          justify-content: center;

          border:
            3px solid #174461;

          border-radius: 16px;

          background:
            linear-gradient(
              #abe6ff,
              #58a8d7
            );

          box-shadow:
            inset 0 6px 5px
              rgba(255, 255, 255, 0.7),
            0 5px 0 #17415c;

          color: #073b68;

          font-size: 28px;

          font-weight: 700;

          text-align: center;

          z-index: 5;
        }

        /* ===============================================
           WELCOME
        =============================================== */

        .welcomeBox {
          width: 100%;

          min-height: 210px;

          padding: 35px;

          display: flex;

          flex-direction: column;

          align-items: center;

          justify-content: center;

          border:
            2px solid #555;

          border-radius: 18px;

          background:
            linear-gradient(
              #f5f5f5,
              #c9c9c9
            );

          box-shadow:
            inset 0 6px 5px white,
            0 6px 0 #555d61;

          text-align: center;
        }

        .welcomeBox h1 {
          margin:
            0 0 18px;

          color: #111;

          font-size:
            clamp(32px, 4vw, 50px);

          line-height: 1.1;
        }

        .welcomeBox p {
          margin: 0;

          color: #333;

          font-size: 20px;

          line-height: 1.5;
        }

        /* ===============================================
           SEARCH
        =============================================== */

        .searchPanel {
          padding-top: 75px;
        }

        .searchInner {
          width: 100%;

          padding: 25px;

          display: flex;

          align-items: center;

          gap: 15px;

          border:
            2px solid #555;

          border-radius: 18px;

          background:
            linear-gradient(
              #f5f5f5,
              #c9c9c9
            );

          box-shadow:
            inset 0 6px 5px white,
            0 6px 0 #555d61;
        }

        .searchWrapper {
          position: relative;

          flex: 1;
        }

        .searchWrapper input {
          width: 100%;

          height: 62px;

          padding:
            0 55px 0 20px;

          border:
            2px solid #1597d2;

          border-radius: 11px;

          outline: none;

          background: #fff;

          color: #111;

          direction: ltr;

          text-align: left;

          unicode-bidi: plaintext;

          font-size: 19px;
        }

        .searchWrapper input:focus {
          border-color: #006ca5;

          box-shadow:
            0 0 0 3px
              rgba(21, 151, 210, 0.15);
        }

        .clearButton {
          position: absolute;

          top: 50%;

          right: 12px;

          width: 38px;

          height: 38px;

          transform:
            translateY(-50%);

          border: none;

          background: transparent;

          color: #a91919;

          font-size: 29px;

          font-weight: 700;
        }

        .refreshButton {
          min-width: 140px;

          height: 62px;

          padding: 0 20px;

          border:
            2px solid #555;

          border-radius: 10px;

          background:
            linear-gradient(
              #ffffff,
              #bbbbbb
            );

          box-shadow:
            0 4px 0 #555;

          font-size: 16px;

          font-weight: 700;
        }

        /* ===============================================
           TESTS
        =============================================== */

        .testsPanel {
          min-height: 400px;
        }

        .testsInner {
          width: 100%;

          min-height: 300px;

          padding: 28px;

          border:
            2px solid #555;

          border-radius: 18px;

          background:
            linear-gradient(
              #f5f5f5,
              #c9c9c9
            );

          box-shadow:
            inset 0 6px 5px white,
            0 6px 0 #555d61;
        }

        .testGrid {
          display: grid;

          grid-template-columns:
            repeat(
              auto-fit,
              minmax(380px, 1fr)
            );

          gap: 28px;
        }

        /* ===============================================
           TEST CARD
        =============================================== */

        .testCard {
          position: relative;

          min-height: 350px;

          padding:
            50px 25px 25px;

          display: flex;

          flex-direction: column;

          border:
            2px solid #596064;

          border-radius: 17px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #e7e7e7 65%,
              #cacaca 100%
            );

          box-shadow:
            inset 0 5px 5px white,
            0 6px 0 #555d61,
            0 12px 20px
              rgba(0, 0, 0, 0.18);

          overflow: hidden;
        }

        .publishedBadge {
          position: absolute;

          top: 14px;

          right: 14px;

          padding:
            7px 15px;

          border:
            1px solid #25814a;

          border-radius: 8px;

          background: #c9efd6;

          color: #126033;

          font-size: 12px;

          font-weight: 700;
        }

        .testCardTop {
          text-align: center;
        }

        .testCardTop h2 {
          margin:
            0 0 10px;

          color: #111;

          font-size: 27px;

          line-height: 1.25;

          overflow-wrap: anywhere;
        }

        .subject {
          color: #07517e;

          font-size: 19px;

          font-weight: 700;
        }

        .description {
          margin:
            20px 0 0;

          padding: 15px;

          border:
            1px solid #aaa;

          border-radius: 9px;

          background:
            rgba(255, 255, 255, 0.65);

          text-align: center;

          line-height: 1.5;
        }

        /* ===============================================
           INFO
        =============================================== */

        .information {
          margin:
            25px 0;

          display: grid;

          grid-template-columns:
            repeat(3, 1fr);

          gap: 10px;
        }

        .infoBox {
          min-height: 85px;

          padding: 12px;

          display: flex;

          flex-direction: column;

          align-items: center;

          justify-content: center;

          border:
            1px solid #aaa;

          border-radius: 9px;

          background:
            rgba(255, 255, 255, 0.7);

          text-align: center;
        }

        .infoBox span {
          margin-bottom: 6px;

          color: #555;

          font-size: 13px;
        }

        .infoBox strong {
          color: #07517e;

          font-size: 21px;
        }

        .infoBox small {
          font-size: 13px;
        }

        .infoBox .ready {
          color: #16713a;

          font-size: 16px;
        }

        /* ===============================================
           START BUTTON
        =============================================== */

        .startButton {
          width: 100%;

          min-height: 58px;

          margin-top: auto;

          padding: 0 20px;

          border:
            2px solid #174461;

          border-radius: 11px;

          background:
            linear-gradient(
              #b8ecff,
              #58a8d7
            );

          box-shadow:
            inset 0 4px 4px
              rgba(255, 255, 255, 0.65),
            0 5px 0 #17415c;

          color: #073b68;

          font-size: 17px;

          font-weight: 700;
        }

        .startButton:hover {
          filter: brightness(1.05);

          transform:
            translateY(-1px);
        }

        .startButton:active {
          transform:
            translateY(3px);

          box-shadow:
            0 2px 0 #17415c;
        }

        /* ===============================================
           MESSAGE
        =============================================== */

        .messageBox {
          min-height: 280px;

          padding: 30px;

          display: flex;

          flex-direction: column;

          align-items: center;

          justify-content: center;

          text-align: center;
        }

        .messageBox h2 {
          margin:
            12px 0 8px;

          font-size: 25px;
        }

        .messageBox p {
          max-width: 600px;

          margin:
            0;

          color: #555;

          font-size: 17px;

          line-height: 1.5;
        }

        .messageIcon {
          width: 70px;

          height: 70px;

          display: flex;

          align-items: center;

          justify-content: center;

          border:
            3px solid #168fc9;

          border-radius: 50%;

          color: #07517e;

          font-size: 35px;

          font-weight: 700;
        }

        .errorMessage .messageIcon {
          border-color: #bd2424;

          color: #bd2424;
        }

        .retryButton {
          min-width: 160px;

          min-height: 50px;

          margin-top: 20px;

          border:
            2px solid #555;

          border-radius: 9px;

          background:
            linear-gradient(
              #ffffff,
              #bbbbbb
            );

          box-shadow:
            0 4px 0 #555;

          font-weight: 700;
        }

        /* ===============================================
           LOADER
        =============================================== */

        .loader {
          width: 50px;

          height: 50px;

          margin-bottom: 15px;

          border:
            5px solid #bbb;

          border-top-color:
            #168fc9;

          border-radius: 50%;

          animation:
            spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform:
              rotate(360deg);
          }
        }

        /* ===============================================
           TABLET
        =============================================== */

        @media (max-width: 900px) {
          .header {
            flex-direction: column;
          }

          .headerTitle {
            width: 100%;

            min-width: 0;
          }

          .homeButton {
            width: 100%;
          }

          .testGrid {
            grid-template-columns: 1fr;
          }
        }

        /* ===============================================
           MOBILE
        =============================================== */

        @media (max-width: 650px) {
          .page {
            padding:
              12px 7px 70px;
          }

          .header {
            padding:
              15px;
          }

          .mainPanel,
          .searchPanel,
          .testsPanel {
            width: 99%;

            margin-top: 85px;

            padding:
              70px 12px 25px;
          }

          .sectionTitle {
            min-width: 230px;

            min-height: 62px;

            font-size: 22px;
          }

          .welcomeBox {
            padding:
              25px 15px;
          }

          .welcomeBox h1 {
            font-size: 32px;
          }

          .searchInner {
            padding: 15px;

            flex-direction: column;
          }

          .searchWrapper {
            width: 100%;
          }

          .refreshButton {
            width: 100%;
          }

          .testsInner {
            padding: 12px;
          }

          .testGrid {
            grid-template-columns: 1fr;
          }

          .testCard {
            padding:
              55px 15px 20px;
          }

          .information {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}