"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ResultItem = {
  id: string;
  user_key: string;
  user_name: string | null;
  status: "submitted" | "expired";
  started_at: string;
  submitted_at: string | null;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  raw_score: string | number;
  percentage: string | number;
  created_at: string;
  test_id: string;
  test_title: string;
  total_questions: number;
};

type ApiResponse = {
  success: boolean;
  results?: ResultItem[];
  message?: string;
};

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("uz-UZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function formatNumber(value: string | number) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return "0";
  }

  return Number.isInteger(numberValue)
    ? String(numberValue)
    : numberValue.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

export default function NationalCertificateResultsPage() {
  const [results, setResults] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  async function loadResults() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/national-certificate/admin/results",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data: ApiResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Natijalarni yuklab bo‘lmadi."
        );
      }

      setResults(Array.isArray(data.results) ? data.results : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Natijalarni yuklashda xatolik yuz berdi."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadResults();
  }, []);

  const filteredResults = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return results;
    }

    return results.filter((item) => {
      return (
        item.test_title.toLowerCase().includes(query) ||
        (item.user_name || "").toLowerCase().includes(query) ||
        item.user_key.toLowerCase().includes(query)
      );
    });
  }, [results, search]);

  const stats = useMemo(() => {
    const submitted = results.filter(
      (item) => item.status === "submitted"
    ).length;

    const expired = results.filter(
      (item) => item.status === "expired"
    ).length;

    const average =
      results.length === 0
        ? 0
        : results.reduce(
            (sum, item) => sum + Number(item.percentage || 0),
            0
          ) / results.length;

    return {
      total: results.length,
      submitted,
      expired,
      average,
    };
  }, [results]);

  return (
    <main className="page">
      <div className="container">
        <div className="topbar">
          <div>
            <p className="eyebrow">
              MILLIY SERTIFIKAT
            </p>

            <h1>Natijalar</h1>

            <p className="subtitle">
              Foydalanuvchilarning Milliy sertifikat test
              natijalarini boshqarish.
            </p>
          </div>

          <div className="topActions">
            <Link
              href="/admin/tests"
              className="button secondary"
            >
              Testlar
            </Link>

            <button
              type="button"
              onClick={loadResults}
              className="button primary"
              disabled={loading}
            >
              {loading ? "Yuklanmoqda..." : "Yangilash"}
            </button>
          </div>
        </div>

        <section className="statsGrid">
          <article className="statCard">
            <span>Jami natijalar</span>
            <strong>{stats.total}</strong>
          </article>

          <article className="statCard">
            <span>Yakunlangan</span>
            <strong>{stats.submitted}</strong>
          </article>

          <article className="statCard">
            <span>Vaqti tugagan</span>
            <strong>{stats.expired}</strong>
          </article>

          <article className="statCard">
            <span>O‘rtacha natija</span>
            <strong>
              {stats.average.toFixed(2)}%
            </strong>
          </article>
        </section>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <h2>Natijalar ro‘yxati</h2>

              <p>
                {filteredResults.length} ta natija ko‘rsatilmoqda
              </p>
            </div>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Test yoki foydalanuvchi bo‘yicha qidirish..."
              className="searchInput"
            />
          </div>

          {error && (
            <div className="errorBox">
              <strong>Xatolik</strong>
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="emptyState">
              Natijalar yuklanmoqda...
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="emptyState">
              Natija topilmadi.
            </div>
          ) : (
            <div className="tableWrapper">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Test</th>
                    <th>Foydalanuvchi</th>
                    <th>Holat</th>
                    <th>To‘g‘ri</th>
                    <th>Noto‘g‘ri</th>
                    <th>Javobsiz</th>
                    <th>Ball</th>
                    <th>Foiz</th>
                    <th>Boshlangan</th>
                    <th>Yakunlangan</th>
                    <th>Batafsil</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredResults.map((item, index) => (
                    <tr key={item.id}>
                      <td>{index + 1}</td>

                      <td>
                        <div className="testCell">
                          <strong>
                            {item.test_title}
                          </strong>

                          <span>
                            {item.total_questions} savol
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="userCell">
                          <strong>
                            {item.user_name?.trim() ||
                              "Noma’lum foydalanuvchi"}
                          </strong>

                          <span title={item.user_key}>
                            {item.user_key.length > 18
                              ? `${item.user_key.slice(
                                  0,
                                  18
                                )}...`
                              : item.user_key}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span
                          className={
                            item.status === "submitted"
                              ? "status submitted"
                              : "status expired"
                          }
                        >
                          {item.status === "submitted"
                            ? "Yakunlangan"
                            : "Vaqti tugagan"}
                        </span>
                      </td>

                      <td className="correct">
                        {item.correct_count}
                      </td>

                      <td className="incorrect">
                        {item.incorrect_count}
                      </td>

                      <td>
                        {item.unanswered_count}
                      </td>

                      <td>
                        {formatNumber(item.raw_score)}
                        /
                        {item.total_questions}
                      </td>

                      <td>
                        <strong>
                          {Number(
                            item.percentage
                          ).toFixed(2)}
                          %
                        </strong>
                      </td>

                      <td>
                        {formatDate(item.started_at)}
                      </td>

                      <td>
                        {formatDate(item.submitted_at)}
                      </td>

                      <td>
                        <Link
                          href={`/admin/results/national-certificate/${item.id}`}
                          className="detailButton"
                        >
                          Batafsil
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          padding: 24px 18px 58px;
          color: #172033;
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(255, 255, 255, 0.98) 0%,
              rgba(245, 248, 250, 0.96) 38%,
              #edf1f4 100%
            );
          font-family:
            "Times New Roman",
            Georgia,
            serif;
        }

        .container {
          width: min(1500px, 100%);
          margin: 0 auto;
        }

        .topbar {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 28px;
          min-height: 158px;
          margin-bottom: 26px;
          padding: 24px 28px 26px;
          border: 3px solid #21445d;
          border-radius: 22px;
          color: #102f49;
          background:
            linear-gradient(
              180deg,
              #88d6ff 0%,
              #56b9eb 44%,
              #2d8ec4 100%
            );
          box-shadow:
            inset 0 3px 0 rgba(255, 255, 255, 0.72),
            inset 0 -8px 0 rgba(17, 72, 105, 0.26),
            0 8px 0 #1d5b7b,
            0 15px 25px rgba(17, 36, 51, 0.2);
          overflow: hidden;
        }

        .topbar::before {
          content: "";
          position: absolute;
          inset: 0 0 auto;
          height: 46%;
          background:
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.2),
              rgba(255, 255, 255, 0)
            );
          pointer-events: none;
        }

        .topbar > * {
          position: relative;
          z-index: 1;
        }

        .topbar > div:first-child {
          min-width: 0;
          display: flex;
          flex: 1;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;
          padding: 4px 0 2px 2px;
        }

        .eyebrow {
          display: inline-flex;
          margin: 0 0 8px;
          padding: 5px 11px;
          border: 1px solid #2b607f;
          border-radius: 8px;
          color: #0f476b;
          background:
            linear-gradient(
              180deg,
              #e8f8ff 0%,
              #b9e4f8 100%
            );
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-shadow: 0 1px 0 #fff;
          box-shadow:
            inset 0 1px 0 #fff,
            0 2px 0 #2a6d8d;
        }

        h1 {
          margin: 2px 0 0;
          font-size: 40px;
          line-height: 1.06;
          color: #10263c;
          text-shadow:
            0 1px 0 rgba(255, 255, 255, 0.8),
            0 2px 3px rgba(0, 0, 0, 0.12);
        }

        .subtitle {
          max-width: 760px;
          margin: 11px 0 0;
          color: #173f5a;
          font-size: 16px;
          font-weight: 800;
          line-height: 1.4;
          text-shadow: 0 1px 0 rgba(255, 255, 255, 0.65);
        }

        .topActions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        :global(.button) {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #42515a;
          border-radius: 11px;
          padding: 10px 18px;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
          text-decoration: none;
          color: #172638;
          transition:
            transform 0.12s ease,
            filter 0.12s ease,
            box-shadow 0.12s ease;
          box-shadow:
            inset 0 2px 0 rgba(255, 255, 255, 0.9),
            inset 0 -4px 0 rgba(65, 72, 77, 0.18),
            0 5px 0 #566168,
            0 8px 12px rgba(0, 0, 0, 0.16);
        }

        :global(.button:hover) {
          transform: translateY(-1px);
          filter: brightness(1.03);
        }

        :global(.button:active) {
          transform: translateY(4px);
          box-shadow:
            inset 0 2px 0 rgba(255, 255, 255, 0.85),
            0 1px 0 #566168;
        }

        :global(.button:disabled) {
          cursor: not-allowed;
          opacity: 0.6;
          transform: none;
        }

        :global(.primary) {
          border-color: #174a68;
          background:
            linear-gradient(
              180deg,
              #8ed8ff 0%,
              #52b7eb 47%,
              #2b87ba 100%
            );
          color: #10334a;
          box-shadow:
            inset 0 2px 0 rgba(255, 255, 255, 0.74),
            inset 0 -4px 0 rgba(17, 72, 105, 0.22),
            0 5px 0 #1b607f,
            0 8px 12px rgba(0, 0, 0, 0.16);
        }

        :global(.secondary) {
          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #eeeeee 48%,
              #c9ccce 100%
            );
          color: #172033;
        }

        :global(.topActions .secondary) {
          min-width: 92px;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 26px;
        }

        .statCard {
          min-height: 118px;
          padding: 20px 22px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border: 2px solid #4a555c;
          border-radius: 16px;
          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #f0f1f2 50%,
              #d0d4d7 100%
            );
          box-shadow:
            inset 0 2px 0 rgba(255, 255, 255, 0.96),
            inset 0 -5px 0 rgba(68, 76, 81, 0.16),
            0 6px 0 #626c72,
            0 12px 18px rgba(0, 0, 0, 0.14);
        }

        .statCard span {
          color: #64717d;
          font-size: 14px;
          font-weight: 900;
        }

        .statCard strong {
          color: #172334;
          font-size: 31px;
          line-height: 1;
          text-shadow: 0 1px 0 #fff;
        }

        .panel {
          overflow: hidden;
          border: 3px solid #3d474e;
          border-radius: 18px;
          background:
            linear-gradient(
              180deg,
              #666c70 0%,
              #545a5e 100%
            );
          box-shadow:
            inset 0 3px 0 rgba(255, 255, 255, 0.15),
            inset 0 -7px 0 rgba(0, 0, 0, 0.14),
            0 7px 0 #353c40,
            0 14px 24px rgba(0, 0, 0, 0.17);
        }

        .panelHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 18px 20px;
          border-bottom: 2px solid #30383d;
          background:
            linear-gradient(
              180deg,
              #7a8084 0%,
              #60666a 100%
            );
          color: white;
          box-shadow:
            inset 0 2px 0 rgba(255, 255, 255, 0.13),
            inset 0 -4px 0 rgba(0, 0, 0, 0.16);
        }

        .panelHeader h2 {
          margin: 0;
          font-size: 22px;
          text-shadow: 0 1px 0 #1c2226;
        }

        .panelHeader p {
          margin: 6px 0 0;
          font-size: 13px;
          color: #dce6ec;
          font-weight: 700;
        }

        .searchInput {
          width: min(410px, 100%);
          height: 46px;
          border: 2px solid #33444f;
          border-radius: 11px;
          padding: 0 14px;
          font-size: 14px;
          font-weight: 700;
          outline: none;
          color: #172334;
          background:
            linear-gradient(
              180deg,
              #d5d9dc 0%,
              #f6f7f8 24%,
              #ffffff 100%
            );
          box-shadow:
            inset 0 4px 8px rgba(45, 55, 62, 0.18),
            0 3px 0 #303a40;
        }

        .searchInput:focus {
          border-color: #2b8ec2;
          box-shadow:
            inset 0 4px 8px rgba(45, 55, 62, 0.12),
            0 0 0 3px rgba(69, 176, 230, 0.25),
            0 3px 0 #245f7d;
        }

        .tableWrapper {
          overflow-x: auto;
          background: #eef2f4;
          padding: 12px;
        }

        table {
          width: 100%;
          min-width: 1380px;
          border-collapse: separate;
          border-spacing: 0 10px;
        }

        th {
          background:
            linear-gradient(
              180deg,
              #7a8084 0%,
              #5c6266 100%
            );
          color: #fff;
          text-align: left;
          padding: 12px 14px;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
          border-top: 1px solid #889095;
          border-bottom: 2px solid #394146;
          text-shadow: 0 1px 0 #20262a;
        }

        th:first-child {
          border-radius: 9px 0 0 9px;
        }

        th:last-child {
          border-radius: 0 9px 9px 0;
        }

        td {
          padding: 14px;
          font-size: 13px;
          vertical-align: middle;
          white-space: nowrap;
          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #f3f4f5 52%,
              #d9dde0 100%
            );
          border-top: 1px solid #c6cdd1;
          border-bottom: 3px solid #879198;
          box-shadow:
            inset 0 1px 0 #fff;
        }

        tbody tr td:first-child {
          border-left: 1px solid #c6cdd1;
          border-radius: 10px 0 0 10px;
        }

        tbody tr td:last-child {
          border-right: 1px solid #c6cdd1;
          border-radius: 0 10px 10px 0;
        }

        tbody tr {
          transition:
            transform 0.12s ease,
            filter 0.12s ease;
        }

        tbody tr:hover {
          transform: translateY(-1px);
          filter: brightness(1.015);
        }

        .testCell,
        .userCell {
          display: flex;
          flex-direction: column;
          gap: 5px;
          max-width: 270px;
          white-space: normal;
        }

        .testCell strong,
        .userCell strong {
          color: #172334;
          font-size: 14px;
        }

        .testCell span,
        .userCell span {
          color: #747f89;
          font-size: 11px;
        }

        .status {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 30px;
          padding: 6px 11px;
          border: 1px solid rgba(0, 0, 0, 0.18);
          border-radius: 9px;
          font-size: 11px;
          font-weight: 900;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.8),
            0 3px 0 rgba(0, 0, 0, 0.16);
        }

        .submitted {
          background:
            linear-gradient(
              180deg,
              #f2fff5 0%,
              #cbeed3 100%
            );
          color: #24683a;
        }

        .expired {
          background:
            linear-gradient(
              180deg,
              #fff7ef 0%,
              #f4d2b9 100%
            );
          color: #9a4d1e;
        }

        .correct {
          color: #1d7a3a;
          font-weight: 900;
        }

        .incorrect {
          color: #b12620;
          font-weight: 900;
        }

        :global(.detailButton) {
          min-width: 112px;
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 9px 16px;
          border: 2px solid #103f5b;
          border-radius: 11px;
          background:
            linear-gradient(
              180deg,
              #a7e3ff 0%,
              #61c2f0 43%,
              #3193c8 100%
            );
          color: #082f49 !important;
          font-size: 13px;
          font-weight: 900;
          text-decoration: none !important;
          white-space: nowrap;
          text-shadow:
            0 1px 0 rgba(255, 255, 255, 0.8);
          box-shadow:
            inset 0 2px 0 rgba(255, 255, 255, 0.86),
            inset 0 -4px 0 rgba(12, 66, 97, 0.26),
            0 5px 0 #155676,
            0 9px 13px rgba(0, 0, 0, 0.2);
          transition:
            transform 0.12s ease,
            filter 0.12s ease,
            box-shadow 0.12s ease;
        }

        :global(.detailButton::after) {
          content: " →";
          margin-left: 7px;
          font-size: 14px;
          font-weight: 900;
        }

        :global(.detailButton:hover) {
          transform: translateY(-2px);
          filter: brightness(1.06);
          box-shadow:
            inset 0 2px 0 rgba(255, 255, 255, 0.9),
            inset 0 -4px 0 rgba(12, 66, 97, 0.24),
            0 7px 0 #155676,
            0 12px 16px rgba(0, 0, 0, 0.22);
        }

        :global(.detailButton:active) {
          transform: translateY(4px);
          box-shadow:
            inset 0 2px 0 rgba(255, 255, 255, 0.78),
            0 1px 0 #155676,
            0 4px 7px rgba(0, 0, 0, 0.16);
        }

        .emptyState {
          margin: 12px;
          padding: 70px 20px;
          border: 2px solid #9ba5ab;
          border-radius: 12px;
          text-align: center;
          color: #66717b;
          background:
            linear-gradient(
              180deg,
              #ffffff,
              #e2e6e8
            );
          font-size: 15px;
          font-weight: 800;
          box-shadow:
            inset 0 2px 0 #fff,
            0 4px 0 #7a848a;
        }

        .errorBox {
          margin: 16px;
          padding: 14px 16px;
          border: 2px solid #a64943;
          border-radius: 11px;
          background:
            linear-gradient(
              180deg,
              #fff4f3,
              #efc3bf
            );
          color: #8e211a;
          display: flex;
          flex-direction: column;
          gap: 4px;
          box-shadow:
            inset 0 1px 0 #fff,
            0 4px 0 #8e4a45;
        }

        @media (max-width: 950px) {
          .statsGrid {
            grid-template-columns: repeat(2, 1fr);
          }

          .topbar,
          .panelHeader {
            flex-direction: column;
            align-items: stretch;
          }

          .topbar > div:first-child {
            align-items: flex-start;
            padding-right: 0;
          }

          .topActions {
            justify-content: flex-start;
          }

          .searchInput {
            width: 100%;
          }
        }

        @media (max-width: 560px) {
          .page {
            padding: 16px 10px 40px;
          }

          h1 {
            font-size: 30px;
          }

          .statsGrid {
            grid-template-columns: 1fr;
          }

          .topActions {
            width: 100%;
          }

          :global(.button) {
            flex: 1;
            text-align: center;
          }
        }
      `}</style>
    </main>
  );
}
