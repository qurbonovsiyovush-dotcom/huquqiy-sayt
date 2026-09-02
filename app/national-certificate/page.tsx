"use client";

import { useEffect, useState } from "react";

type UserRole = "admin" | "user" | null;

type NationalCertificateTest = {
  id: string;
  title: string;
  description?: string | null;
  durationMinutes: number;
  closedQuestionCount: number;
  openQuestionCount: number;
  totalQuestionCount: number;
  attemptLimit?: number | null;
};

export default function NationalCertificatePage() {
  const [role, setRole] = useState<UserRole>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [tests, setTests] = useState<NationalCertificateTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadRole() {
      try {
        const response = await fetch("/api/me", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        });

        if (response.status === 401) {
          window.location.replace("/login");
          return;
        }

        if (!response.ok) {
          throw new Error("Rolni aniqlab bo‘lmadi.");
        }

        const data = await response.json();

        if (!cancelled) {
          setRole(data.role === "admin" ? "admin" : "user");
        }
      } catch (error) {
        console.error("ROLE LOAD ERROR:", error);

        if (!cancelled) {
          setRole("user");
        }
      } finally {
        if (!cancelled) {
          setRoleLoading(false);
        }
      }
    }

    loadRole();

    return () => {
      cancelled = true;
    };
  }, []);

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
        window.location.replace("/login");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Testlarni yuklab bo‘lmadi."
        );
      }

      setTests(
        Array.isArray(data)
          ? data
          : Array.isArray(data?.tests)
            ? data.tests
            : []
      );
    } catch (error) {
      console.error("TEST LOAD ERROR:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Testlarni yuklab bo‘lmadi."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTests();
  }, []);

  async function logout() {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      window.location.replace("/login");
    }
  }

  return (
    <main className="page">
      <header className="topPanel">
        <div className="namePlate">
          Qurbonov Siyovush Jamaliddinzoda
        </div>

        <nav className="topActions">
          {!roleLoading && role === "admin" && (
            <button
              type="button"
              className="grayButton"
              onClick={() => {
                window.location.href = "/admin";
              }}
            >
              Admin panel
            </button>
          )}

          <button
            type="button"
            className="grayButton"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            Asosiy sahifa
          </button>

          <button
            type="button"
            className="logoutButton"
            onClick={logout}
          >
            Chiqish
          </button>
        </nav>
      </header>

      <section className="content">
        <div className="sectionTitle">
          Huquqshunoslik fanidan Milliy sertifikat
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
            <strong>Huquqshunoslik</strong>
          </div>
        </div>

        {error && (
          <div className="statePanel errorPanel">
            <strong>{error}</strong>

            <button
              type="button"
              className="retryButton"
              onClick={loadTests}
            >
              Qayta urinish
            </button>
          </div>
        )}

        {loading && (
          <div className="statePanel">
            <div className="loader" />
            <strong>Testlar yuklanmoqda...</strong>
          </div>
        )}

        {!loading && !error && tests.length === 0 && (
          <div className="statePanel">
            <h2>Hozircha test mavjud emas</h2>
            <p>
              E’lon qilingan Milliy sertifikat testlari shu yerda ko‘rinadi.
            </p>
          </div>
        )}

        {!loading && !error && tests.length > 0 && (
          <div className="testsGrid">
            {tests.map((test, index) => (
              <article className="testCard" key={test.id}>
                <div className="cardTop">
                  <div className="testNumber">
                    TEST {String(index + 1).padStart(2, "0")}
                  </div>

                  <div className="statusBadge">
                    E’lon qilingan
                  </div>
                </div>

                <h2>{test.title}</h2>

                {test.description && (
                  <p className="description">
                    {test.description}
                  </p>
                )}

                <div className="testStats">
                  <div>
                    <span>Savollar</span>
                    <strong>
                      {test.totalQuestionCount ?? 45}
                    </strong>
                  </div>

                  <div>
                    <span>Yopiq</span>
                    <strong>
                      {test.closedQuestionCount ?? 35}
                    </strong>
                  </div>

                  <div>
                    <span>Ochiq</span>
                    <strong>
                      {test.openQuestionCount ?? 10}
                    </strong>
                  </div>

                  <div>
                    <span>Vaqt</span>
                    <strong>
                      {test.durationMinutes} daq.
                    </strong>
                  </div>
                </div>

                <div className="attemptInfo">
                  {test.attemptLimit == null
                    ? "Urinishlar soni cheklanmagan"
                    : `Urinishlar soni: ${test.attemptLimit}`}
                </div>

                <button
                  type="button"
                  className="openButton"
                  onClick={() => {
                    window.location.href =
                      `/national-certificate/${test.id}`;
                  }}
                >
                  Testni ochish →
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          padding: 22px 28px 70px;
          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #edf2f6 52%,
              #e4ebf0 100%
            );
          color: #122238;
          font-family: Georgia, "Times New Roman", serif;
        }

        button {
          font-family: inherit;
        }

        .topPanel {
          width: 100%;
          min-height: 138px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 26px;
          padding: 24px 38px;
          border: 4px solid #16445f;
          border-radius: 30px;
          background:
            linear-gradient(
              180deg,
              #78d1f2 0%,
              #59b5df 42%,
              #4098c4 100%
            );
          box-shadow:
            inset 0 4px 0 rgba(255, 255, 255, 0.52),
            inset 0 -9px 0 rgba(5, 65, 102, 0.18),
            0 10px 0 #123e59,
            0 18px 27px rgba(20, 43, 57, 0.2);
        }

        .namePlate {
          min-width: 460px;
          min-height: 72px;
          display: flex;
          align-items: center;
          padding: 15px 34px;
          border: 4px solid #5c6870;
          border-radius: 17px;
          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #eeeeee 52%,
              #d0d0d0 100%
            );
          color: #080b0f;
          font-size: clamp(22px, 2vw, 29px);
          font-weight: 900;
          box-shadow:
            inset 0 3px 0 #ffffff,
            inset 0 -6px 0 rgba(65, 65, 65, 0.12),
            0 7px 0 #687078,
            0 11px 16px rgba(0, 0, 0, 0.18);
        }

        .topActions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 20px;
        }

        .grayButton,
        .logoutButton {
          min-width: 176px;
          min-height: 68px;
          padding: 12px 26px;
          border-radius: 15px;
          cursor: pointer;
          font-size: 17px;
          font-weight: 900;
          transition:
            transform 0.12s ease,
            filter 0.12s ease;
        }

        .grayButton {
          border: 3px solid #5d6870;
          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #ececec 52%,
              #cfcfcf 100%
            );
          color: #0b1118;
          box-shadow:
            inset 0 3px 0 #ffffff,
            inset 0 -6px 0 rgba(60, 60, 60, 0.13),
            0 7px 0 #70777d,
            0 11px 15px rgba(0, 0, 0, 0.16);
        }

        .logoutButton {
          border: 3px solid #11527a;
          background:
            linear-gradient(
              180deg,
              #64c3e9 0%,
              #45a8d3 50%,
              #2f8dbb 100%
            );
          color: #ffffff;
          box-shadow:
            inset 0 3px 0 rgba(255, 255, 255, 0.36),
            inset 0 -6px 0 rgba(6, 66, 103, 0.16),
            0 7px 0 #145277,
            0 11px 15px rgba(0, 48, 78, 0.18);
        }

        .grayButton:hover,
        .logoutButton:hover,
        .openButton:hover,
        .retryButton:hover {
          filter: brightness(1.04);
          transform: translateY(-1px);
        }

        .grayButton:active,
        .logoutButton:active,
        .openButton:active,
        .retryButton:active {
          transform: translateY(4px);
        }

        .content {
          width: min(94%, 1450px);
          margin: 78px auto 0;
        }

        .sectionTitle {
          width: max-content;
          max-width: 100%;
          margin: 0 auto 32px;
          padding: 16px 28px;
          border: 2px solid #556169;
          border-radius: 12px;
          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #eeeeee 54%,
              #d0d4d7 100%
            );
          font-size: clamp(25px, 3vw, 32px);
          font-weight: 900;
          text-align: center;
          box-shadow:
            inset 0 2px 0 #ffffff,
            inset 0 -5px 0 rgba(50, 58, 64, 0.12),
            0 6px 0 #6b747a,
            0 11px 17px rgba(0, 0, 0, 0.14);
        }

        .infoPanel {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 31px;
        }

        .infoItem {
          min-height: 84px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 14px 18px;
          border: 2px solid #5c6870;
          border-radius: 11px;
          background:
            linear-gradient(
              180deg,
              #ffffff,
              #eef1f3 56%,
              #cfd5d9
            );
          box-shadow:
            inset 0 2px 0 #ffffff,
            inset 0 -5px 0 rgba(50, 60, 68, 0.12),
            0 5px 0 #707a81,
            0 9px 14px rgba(0, 0, 0, 0.12);
        }

        .infoItem span {
          margin-bottom: 6px;
          color: #61707d;
          font-size: 13px;
          font-weight: 800;
        }

        .infoItem strong {
          font-size: 20px;
        }

        .testsGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 28px;
        }

        .testCard {
          padding: 24px;
          border: 2px solid #505d65;
          border-radius: 18px;
          background:
            linear-gradient(
              180deg,
              #ffffff,
              #f1f3f4 58%,
              #d4dade
            );
          box-shadow:
            inset 0 3px 0 #ffffff,
            inset 0 -7px 0 rgba(50, 60, 68, 0.12),
            0 8px 0 #636e75,
            0 14px 20px rgba(0, 0, 0, 0.15);
        }

        .cardTop {
          display: flex;
          justify-content: space-between;
          gap: 15px;
        }

        .testNumber,
        .statusBadge {
          min-height: 31px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px 11px;
          border-radius: 7px;
          font-size: 11px;
          font-weight: 900;
        }

        .testNumber {
          border: 1px solid #657079;
          background: linear-gradient(180deg, #ffffff, #d7dcdf);
          box-shadow: 0 3px 0 #737d84;
        }

        .statusBadge {
          border: 1px solid #4c7656;
          background: linear-gradient(180deg, #f8fff9, #cae4cf);
          color: #286139;
          box-shadow: 0 3px 0 #65806b;
        }

        .testCard h2 {
          margin: 23px 0 0;
          font-size: clamp(23px, 2.3vw, 30px);
        }

        .description {
          margin: 11px 0 0;
          color: #5f6b77;
          line-height: 1.55;
        }

        .testStats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin-top: 24px;
        }

        .testStats > div {
          min-height: 70px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 10px;
          border: 2px solid #68747c;
          border-radius: 9px;
          background:
            linear-gradient(180deg, #ffffff, #e9edef 58%, #cfd5d8);
          box-shadow:
            inset 0 2px 0 #ffffff,
            0 4px 0 #778188;
        }

        .testStats span {
          margin-bottom: 5px;
          color: #65727d;
          font-size: 11px;
          font-weight: 800;
        }

        .testStats strong {
          font-size: 16px;
        }

        .attemptInfo {
          margin-top: 18px;
          padding: 10px 13px;
          border: 1px solid #75828a;
          border-radius: 7px;
          background: linear-gradient(180deg, #fbfcfd, #dfe4e7);
          color: #536170;
          font-size: 13px;
          font-weight: 800;
          box-shadow: 0 3px 0 #828c92;
        }

        .openButton,
        .retryButton {
          border: 2px solid #07508d;
          border-radius: 10px;
          background:
            linear-gradient(
              180deg,
              #47a4ef 0%,
              #197bd2 48%,
              #0759ad 100%
            );
          color: #ffffff;
          cursor: pointer;
          font-weight: 900;
          box-shadow:
            inset 0 2px 0 rgba(255, 255, 255, 0.42),
            inset 0 -5px 0 rgba(0, 46, 94, 0.2),
            0 6px 0 #064178,
            0 10px 14px rgba(0, 53, 101, 0.2);
        }

        .openButton {
          width: 100%;
          min-height: 53px;
          margin-top: 23px;
          font-size: 16px;
        }

        .statePanel {
          width: min(100%, 720px);
          margin: 35px auto;
          padding: 35px 28px;
          border: 2px solid #59656d;
          border-radius: 16px;
          background: linear-gradient(180deg, #ffffff, #dce2e6);
          text-align: center;
          box-shadow:
            inset 0 2px 0 #ffffff,
            0 7px 0 #6a747b,
            0 12px 18px rgba(0, 0, 0, 0.13);
        }

        .errorPanel {
          border-color: #834646;
          color: #782a2a;
        }

        .retryButton {
          min-height: 43px;
          margin-top: 18px;
          padding: 8px 17px;
        }

        .loader {
          width: 44px;
          height: 44px;
          margin: 0 auto 17px;
          border: 5px solid #cbd2d7;
          border-top-color: #1876c7;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 1100px) {
          .topPanel {
            flex-direction: column;
            align-items: stretch;
          }

          .namePlate {
            min-width: 0;
            justify-content: center;
            text-align: center;
          }

          .topActions {
            justify-content: center;
            flex-wrap: wrap;
          }
        }

        @media (max-width: 900px) {
          .infoPanel {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .testsGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 560px) {
          .page {
            padding: 12px 10px 50px;
          }

          .topPanel {
            padding: 20px 14px;
            border-radius: 22px;
          }

          .namePlate {
            min-height: 60px;
            padding: 12px 15px;
            font-size: 20px;
          }

          .topActions {
            display: grid;
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .grayButton,
          .logoutButton {
            width: 100%;
            min-width: 0;
            min-height: 54px;
          }

          .content {
            width: 94%;
            margin-top: 58px;
          }

          .sectionTitle {
            width: 100%;
            padding: 14px;
          }

          .testStats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .testCard {
            padding: 19px;
          }
        }
      `}</style>
    </main>
  );
}
