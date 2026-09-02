"use client";

import { useEffect, useState } from "react";

type NationalCertificateTest = {
  id: string;
  title: string;
  description?: string | null;
  subject?: string;
  status?: string;
  durationMinutes: number;
  closedQuestionCount: number;
  openQuestionCount: number;
  totalQuestionCount: number;
  attemptLimit?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

export default function NationalCertificatePage() {
  const [tests, setTests] = useState<
    NationalCertificateTest[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  async function loadTests() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/national-certificate/tests",
        {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        }
      );

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Testlarni yuklab bo‘lmadi."
        );
      }

      const receivedTests =
        Array.isArray(data)
          ? data
          : Array.isArray(data?.tests)
            ? data.tests
            : [];

      setTests(receivedTests);
    } catch (err) {
      console.error(
        "NATIONAL CERTIFICATE TESTS ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Testlarni yuklab bo‘lmadi."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTests();
  }, []);

  function openTest(id: string) {
    window.location.href =
      `/national-certificate/${id}`;
  }

  function goHome() {
    window.location.href = "/";
  }

  return (
    <main className="page">
      {/* =========================
          YUQORI PANEL
      ========================= */}

      <section className="topPanel">
        <div className="topInner">
          <button
            type="button"
            className="homeButton"
            onClick={goHome}
          >
            ← Asosiy sahifa
          </button>

          <div className="titleButton">
            Milliy sertifikat
          </div>

          <button
            type="button"
            className="refreshButton"
            onClick={loadTests}
            disabled={loading}
          >
            {loading
              ? "Yuklanmoqda..."
              : "Yangilash"}
          </button>
        </div>
      </section>

      {/* =========================
          ASOSIY QISM
      ========================= */}

      <section className="content">
        <div className="sectionTitle">
          Huquqshunoslik fanidan
          Milliy sertifikat
        </div>

        <div className="infoPanel">
          <div className="infoItem">
            <span>Savollar</span>
            <strong>45 ta</strong>
          </div>

          <div className="infoItem">
            <span>Yopiq</span>
            <strong>35 ta</strong>
          </div>

          <div className="infoItem">
            <span>Ochiq</span>
            <strong>10 ta</strong>
          </div>

          <div className="infoItem">
            <span>Yo‘nalish</span>
            <strong>
              Huquqshunoslik
            </strong>
          </div>
        </div>

        {error && (
          <div className="errorPanel">
            <strong>Xatolik</strong>

            <span>{error}</span>

            <button
              type="button"
              onClick={loadTests}
            >
              Qayta urinish
            </button>
          </div>
        )}

        {loading && (
          <div className="loadingPanel">
            <div className="loader" />

            <strong>
              Testlar yuklanmoqda...
            </strong>
          </div>
        )}

        {!loading &&
          !error &&
          tests.length === 0 && (
            <div className="emptyPanel">
              <div className="emptyIcon">
                !
              </div>

              <h2>
                Hozircha test mavjud
                emas
              </h2>

              <p>
                E’lon qilingan Milliy
                sertifikat testlari shu
                yerda ko‘rinadi.
              </p>
            </div>
          )}

        {!loading &&
          !error &&
          tests.length > 0 && (
            <div className="testsGrid">
              {tests.map(
                (test, index) => (
                  <article
                    className="testCard"
                    key={test.id}
                  >
                    <div className="cardTop">
                      <div className="testNumber">
                        TEST{" "}
                        {String(
                          index + 1
                        ).padStart(
                          2,
                          "0"
                        )}
                      </div>

                      <div className="statusBadge">
                        E’lon qilingan
                      </div>
                    </div>

                    <h2>
                      {test.title}
                    </h2>

                    {test.description && (
                      <p className="description">
                        {
                          test.description
                        }
                      </p>
                    )}

                    <div className="testStats">
                      <div>
                        <span>
                          Savollar
                        </span>

                        <strong>
                          {test.totalQuestionCount ??
                            45}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Yopiq
                        </span>

                        <strong>
                          {test.closedQuestionCount ??
                            35}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Ochiq
                        </span>

                        <strong>
                          {test.openQuestionCount ??
                            10}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Vaqt
                        </span>

                        <strong>
                          {
                            test.durationMinutes
                          }{" "}
                          daq.
                        </strong>
                      </div>
                    </div>

                    <div className="attemptInfo">
                      {test.attemptLimit ==
                      null
                        ? "Urinishlar soni cheklanmagan"
                        : `Urinishlar soni: ${test.attemptLimit}`}
                    </div>

                    <button
                      type="button"
                      className="openButton"
                      onClick={() =>
                        openTest(test.id)
                      }
                    >
                      Testni ochish
                      <span>→</span>
                    </button>
                  </article>
                )
              )}
            </div>
          )}
      </section>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          margin: 0;
          padding: 0 0 70px;
          background:
            radial-gradient(
              circle at 50% -120px,
              rgba(
                36,
                136,
                222,
                0.15
              ),
              transparent 500px
            ),
            linear-gradient(
              180deg,
              #f7f9fb 0%,
              #e8edf2 100%
            );
          color: #142033;
          font-family:
            Georgia,
            "Times New Roman",
            serif;
        }

        button {
          font-family: inherit;
        }

        /* =========================
           HEADER
        ========================= */

        .topPanel {
          padding: 24px 30px 31px;
          border-bottom: 2px solid
            #064278;
          background:
            linear-gradient(
              180deg,
              #46a6e2 0%,
              #2588ca 46%,
              #126cae 100%
            );
          box-shadow:
            inset 0 3px 0
              rgba(
                255,
                255,
                255,
                0.45
              ),
            inset 0 -8px 0
              rgba(
                0,
                57,
                101,
                0.2
              ),
            0 8px 0 #07517f,
            0 13px 22px
              rgba(
                15,
                63,
                94,
                0.24
              );
        }

        .topInner {
          width: min(
            96%,
            1500px
          );
          min-height: 78px;
          margin: 0 auto;
          display: grid;
          grid-template-columns:
            1fr auto 1fr;
          align-items: center;
          gap: 20px;
        }

        .homeButton,
        .refreshButton,
        .titleButton {
          min-height: 48px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 11px 20px;
          border: 2px solid
            #48545c;
          border-radius: 11px;
          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #eceeef 50%,
              #c7ccd0 100%
            );
          color: #162337;
          font-weight: 900;
          box-shadow:
            inset 0 2px 0
              #ffffff,
            inset 0 -5px 0
              rgba(
                54,
                63,
                69,
                0.15
              ),
            0 5px 0 #59636a,
            0 9px 14px
              rgba(
                0,
                0,
                0,
                0.17
              );
        }

        .homeButton,
        .refreshButton {
          cursor: pointer;
          transition:
            transform 0.12s ease,
            filter 0.12s ease;
        }

        .homeButton {
          justify-self: start;
        }

        .refreshButton {
          justify-self: end;
          border-color: #07518f;
          background:
            linear-gradient(
              180deg,
              #69c1f1 0%,
              #2b94d4 52%,
              #1776b8 100%
            );
          color: #102c43;
          box-shadow:
            inset 0 2px 0
              rgba(
                255,
                255,
                255,
                0.45
              ),
            inset 0 -5px 0
              rgba(
                0,
                61,
                105,
                0.18
              ),
            0 5px 0 #075786,
            0 9px 14px
              rgba(
                0,
                57,
                99,
                0.19
              );
        }

        .titleButton {
          min-width: 250px;
          font-size: 20px;
          letter-spacing: 0.02em;
        }

        .homeButton:hover,
        .refreshButton:hover {
          filter: brightness(
            1.04
          );
          transform: translateY(
            -1px
          );
        }

        .homeButton:active,
        .refreshButton:active {
          transform: translateY(
            4px
          );
          box-shadow:
            inset 0 3px 6px
              rgba(
                0,
                0,
                0,
                0.15
              ),
            0 2px 0 #505b62;
        }

        .refreshButton:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        /* =========================
           CONTENT
        ========================= */

        .content {
          width: min(
            94%,
            1450px
          );
          margin: 48px auto 0;
        }

        .sectionTitle {
          width: max-content;
          max-width: 100%;
          margin: 0 auto 30px;
          padding: 16px 30px;
          border: 2px solid
            #4e5961;
          border-radius: 13px;
          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #eceeef 52%,
              #c8cdd1 100%
            );
          color: #152337;
          text-align: center;
          font-size: clamp(
            22px,
            3vw,
            31px
          );
          font-weight: 900;
          box-shadow:
            inset 0 2px 0
              #ffffff,
            inset 0 -5px 0
              rgba(
                55,
                64,
                71,
                0.14
              ),
            0 6px 0 #59636a,
            0 11px 17px
              rgba(
                0,
                0,
                0,
                0.15
              );
        }

        /* =========================
           INFO
        ========================= */

        .infoPanel {
          display: grid;
          grid-template-columns:
            repeat(
              4,
              minmax(0, 1fr)
            );
          gap: 16px;
          margin-bottom: 32px;
        }

        .infoItem {
          min-height: 91px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 17px 20px;
          border: 2px solid
            #59646c;
          border-radius: 13px;
          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #edf0f2 57%,
              #ccd2d6 100%
            );
          box-shadow:
            inset 0 2px 0
              #ffffff,
            inset 0 -5px 0
              rgba(
                53,
                62,
                68,
                0.13
              ),
            0 5px 0 #69737a,
            0 9px 14px
              rgba(
                0,
                0,
                0,
                0.13
              );
        }

        .infoItem span {
          margin-bottom: 7px;
          color: #65717d;
          font-size: 13px;
          font-weight: 800;
        }

        .infoItem strong {
          color: #162438;
          font-size: 21px;
        }

        /* =========================
           TEST CARDS
        ========================= */

        .testsGrid {
          display: grid;
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
          gap: 28px;
        }

        .testCard {
          min-width: 0;
          padding: 27px;
          border: 2px solid
            #4e5961;
          border-radius: 19px;
          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #f0f2f3 57%,
              #d6dbdf 100%
            );
          box-shadow:
            inset 0 3px 0
              #ffffff,
            inset 0 -7px 0
              rgba(
                53,
                62,
                68,
                0.13
              ),
            0 8px 0 #59636a,
            0 14px 22px
              rgba(
                18,
                30,
                42,
                0.17
              );
        }

        .cardTop {
          display: flex;
          align-items: center;
          justify-content:
            space-between;
          gap: 15px;
        }

        .testNumber,
        .statusBadge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 33px;
          padding: 7px 12px;
          border: 1px solid
            #536068;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.05em;
          box-shadow:
            inset 0 1px 0
              #ffffff,
            0 3px 0 #6c767d;
        }

        .testNumber {
          background:
            linear-gradient(
              180deg,
              #ffffff,
              #d7dce0
            );
          color: #263448;
        }

        .statusBadge {
          border-color: #477151;
          background:
            linear-gradient(
              180deg,
              #f8fff9,
              #cce4d1
            );
          color: #285d34;
          box-shadow:
            inset 0 1px 0
              #ffffff,
            0 3px 0 #5d8065;
        }

        .testCard h2 {
          margin: 24px 0 0;
          color: #122238;
          font-size: clamp(
            23px,
            2.5vw,
            30px
          );
          line-height: 1.25;
          text-shadow:
            0 1px 0 #ffffff;
        }

        .description {
          min-height: 26px;
          margin: 12px 0 0;
          color: #586675;
          font-size: 15px;
          line-height: 1.6;
        }

        .testStats {
          display: grid;
          grid-template-columns:
            repeat(
              4,
              minmax(0, 1fr)
            );
          gap: 10px;
          margin-top: 25px;
        }

        .testStats > div {
          min-width: 0;
          min-height: 75px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 11px;
          border: 2px solid
            #68737b;
          border-radius: 10px;
          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #e9ecee 58%,
              #cfd5d9 100%
            );
          box-shadow:
            inset 0 2px 0
              #ffffff,
            inset 0 -4px 0
              rgba(
                50,
                58,
                64,
                0.11
              ),
            0 4px 0 #747e85;
        }

        .testStats span {
          display: block;
          margin-bottom: 5px;
          color: #687582;
          font-size: 11px;
          font-weight: 800;
        }

        .testStats strong {
          color: #17263a;
          font-size: 17px;
        }

        .attemptInfo {
          margin-top: 20px;
          padding: 11px 14px;
          border: 1px solid
            #71808a;
          border-radius: 8px;
          background:
            linear-gradient(
              180deg,
              #f9fafb,
              #dfe4e8
            );
          color: #536171;
          font-size: 13px;
          font-weight: 800;
          box-shadow:
            inset 0 1px 0
              #ffffff,
            0 3px 0 #818b92;
        }

        .openButton {
          width: 100%;
          min-height: 55px;
          margin-top: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border: 2px solid
            #064887;
          border-radius: 11px;
          background:
            linear-gradient(
              180deg,
              #4ba0f0 0%,
              #1a79d3 46%,
              #0758ac 100%
            );
          color: #ffffff;
          cursor: pointer;
          font-size: 16px;
          font-weight: 900;
          box-shadow:
            inset 0 2px 0
              rgba(
                255,
                255,
                255,
                0.45
              ),
            inset 0 -5px 0
              rgba(
                0,
                45,
                96,
                0.22
              ),
            0 6px 0 #063f78,
            0 10px 15px
              rgba(
                0,
                52,
                105,
                0.22
              );
          transition:
            transform 0.12s ease,
            filter 0.12s ease;
        }

        .openButton span {
          font-size: 21px;
        }

        .openButton:hover {
          filter: brightness(
            1.05
          );
          transform: translateY(
            -1px
          );
        }

        .openButton:active {
          transform: translateY(
            4px
          );
          box-shadow:
            inset 0 3px 6px
              rgba(
                0,
                0,
                0,
                0.16
              ),
            0 2px 0 #063f78;
        }

        /* =========================
           LOADING / EMPTY / ERROR
        ========================= */

        .loadingPanel,
        .emptyPanel,
        .errorPanel {
          width: min(
            100%,
            720px
          );
          margin: 35px auto 0;
          padding: 40px 30px;
          border: 2px solid
            #566169;
          border-radius: 18px;
          background:
            linear-gradient(
              180deg,
              #ffffff,
              #dce1e5
            );
          text-align: center;
          box-shadow:
            inset 0 2px 0
              #ffffff,
            inset 0 -6px 0
              rgba(
                53,
                62,
                68,
                0.12
              ),
            0 7px 0 #687279,
            0 12px 18px
              rgba(
                0,
                0,
                0,
                0.14
              );
        }

        .loader {
          width: 46px;
          height: 46px;
          margin: 0 auto 18px;
          border: 5px solid
            #c8d0d6;
          border-top-color:
            #116bc3;
          border-radius: 50%;
          animation:
            spin 0.8s linear
            infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(
              360deg
            );
          }
        }

        .emptyIcon {
          width: 58px;
          height: 58px;
          margin: 0 auto 17px;
          display: grid;
          place-items: center;
          border: 2px solid
            #59646c;
          border-radius: 50%;
          background:
            linear-gradient(
              180deg,
              #ffffff,
              #cdd3d7
            );
          font-size: 25px;
          font-weight: 900;
          box-shadow:
            inset 0 2px 0
              #ffffff,
            0 5px 0 #6b757c;
        }

        .emptyPanel h2 {
          margin: 0;
        }

        .emptyPanel p {
          margin: 12px 0 0;
          color: #65717d;
          line-height: 1.6;
        }

        .errorPanel {
          border-color: #884848;
          background:
            linear-gradient(
              180deg,
              #fffafa,
              #efd3d3
            );
          color: #792727;
        }

        .errorPanel strong,
        .errorPanel span {
          display: block;
        }

        .errorPanel strong {
          margin-bottom: 8px;
          font-size: 20px;
        }

        .errorPanel button {
          margin-top: 20px;
          padding: 10px 18px;
          border: 2px solid
            #783434;
          border-radius: 9px;
          background:
            linear-gradient(
              180deg,
              #ffffff,
              #dfc1c1
            );
          color: #6e2424;
          cursor: pointer;
          font-weight: 900;
          box-shadow:
            inset 0 2px 0
              #ffffff,
            0 4px 0 #8b5252;
        }

        /* =========================
           RESPONSIVE
        ========================= */

        @media (
          max-width: 900px
        ) {
          .topInner {
            grid-template-columns:
              1fr 1fr;
          }

          .titleButton {
            grid-column:
              1 / -1;
            grid-row: 1;
            justify-self: center;
          }

          .homeButton {
            grid-column: 1;
            grid-row: 2;
          }

          .refreshButton {
            grid-column: 2;
            grid-row: 2;
          }

          .infoPanel {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );
          }

          .testsGrid {
            grid-template-columns:
              1fr;
          }
        }

        @media (
          max-width: 560px
        ) {
          .topPanel {
            padding: 18px 12px
              25px;
          }

          .topInner {
            width: 100%;
            gap: 12px;
          }

          .titleButton {
            min-width: 0;
            width: 100%;
          }

          .homeButton,
          .refreshButton {
            width: 100%;
            padding-left: 10px;
            padding-right: 10px;
          }

          .content {
            width: 92%;
            margin-top: 37px;
          }

          .sectionTitle {
            width: 100%;
            padding: 14px;
          }

          .infoPanel {
            gap: 10px;
          }

          .infoItem {
            min-height: 78px;
            padding: 13px;
          }

          .infoItem strong {
            font-size: 17px;
          }

          .testCard {
            padding: 20px;
          }

          .cardTop {
            align-items:
              flex-start;
          }

          .testStats {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );
          }
        }
      `}</style>
    </main>
  );
}
