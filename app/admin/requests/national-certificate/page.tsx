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
          background: #eef1f4;
          padding: 28px 20px 60px;
          color: #172033;
        }

        .container {
          width: min(1500px, 100%);
          margin: 0 auto;
        }

        .topbar {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 24px;
        }

        .eyebrow {
          margin: 0 0 6px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: #245ea8;
        }

        h1 {
          margin: 0;
          font-size: 34px;
          line-height: 1.1;
        }

        .subtitle {
          margin: 10px 0 0;
          color: #667085;
          font-size: 15px;
        }

        .topActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .button {
          border: 0;
          border-radius: 10px;
          padding: 11px 17px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          transition: 0.15s ease;
        }

        .button:hover {
          transform: translateY(-1px);
        }

        .button:disabled {
          cursor: not-allowed;
          opacity: 0.6;
          transform: none;
        }

        .primary {
          background: #245ea8;
          color: white;
        }

        .secondary {
          background: #dce3ea;
          color: #172033;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 20px;
        }

        .statCard {
          min-height: 108px;
          background: white;
          border: 1px solid #dce2e8;
          border-radius: 14px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 0 5px 16px rgba(25, 39, 58, 0.05);
        }

        .statCard span {
          color: #667085;
          font-size: 14px;
          font-weight: 600;
        }

        .statCard strong {
          font-size: 30px;
          line-height: 1;
        }

        .panel {
          background: white;
          border: 1px solid #dce2e8;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 5px 16px rgba(25, 39, 58, 0.05);
        }

        .panelHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 20px;
          border-bottom: 1px solid #e6eaf0;
        }

        .panelHeader h2 {
          margin: 0;
          font-size: 20px;
        }

        .panelHeader p {
          margin: 6px 0 0;
          font-size: 13px;
          color: #667085;
        }

        .searchInput {
          width: min(390px, 100%);
          height: 42px;
          border: 1px solid #cfd7df;
          border-radius: 10px;
          padding: 0 13px;
          font-size: 14px;
          outline: none;
          background: #fafbfc;
        }

        .searchInput:focus {
          border-color: #245ea8;
          background: white;
          box-shadow: 0 0 0 3px rgba(36, 94, 168, 0.1);
        }

        .tableWrapper {
          overflow-x: auto;
        }

        table {
          width: 100%;
          min-width: 1350px;
          border-collapse: collapse;
        }

        th {
          background: #f5f7f9;
          color: #475467;
          text-align: left;
          padding: 12px 14px;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
          border-bottom: 1px solid #dfe4ea;
        }

        td {
          padding: 14px;
          font-size: 13px;
          border-bottom: 1px solid #edf0f3;
          vertical-align: middle;
          white-space: nowrap;
        }

        tbody tr:hover {
          background: #fafbfc;
        }

        tbody tr:last-child td {
          border-bottom: 0;
        }

        .testCell,
        .userCell {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-width: 260px;
          white-space: normal;
        }

        .testCell span,
        .userCell span {
          color: #7a8493;
          font-size: 11px;
        }

        .status {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
        }

        .submitted {
          background: #e8f7ee;
          color: #187642;
        }

        .expired {
          background: #fff1e8;
          color: #a34d16;
        }

        .correct {
          color: #187642;
          font-weight: 800;
        }

        .incorrect {
          color: #b42318;
          font-weight: 800;
        }

        .emptyState {
          padding: 70px 20px;
          text-align: center;
          color: #667085;
          font-size: 15px;
        }

        .errorBox {
          margin: 20px;
          padding: 14px 16px;
          border: 1px solid #f2b8b5;
          border-radius: 10px;
          background: #fff1f0;
          color: #9f1f17;
          display: flex;
          flex-direction: column;
          gap: 4px;
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

          .searchInput {
            width: 100%;
          }
        }

        @media (max-width: 560px) {
          .page {
            padding: 18px 12px 40px;
          }

          h1 {
            font-size: 28px;
          }

          .statsGrid {
            grid-template-columns: 1fr;
          }

          .topActions {
            width: 100%;
          }

          .button {
            flex: 1;
            text-align: center;
          }
        }
      `}</style>
    </main>
  );
}
