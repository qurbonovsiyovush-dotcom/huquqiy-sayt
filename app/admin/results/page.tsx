"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type TestResult = {
  id: string;
  userName: string;
  testId: string;
  testTitle: string;
  subject: string;
  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  percentage: number;
  earnedPoints: number;
  totalPoints: number;
  spentSeconds: number;
  finishedAt: string;
};

export default function AdminResultsPage() {
  const router = useRouter();

  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadResults();
  }, []);

  async function loadResults() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/results", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 403) {
          router.replace("/");
          return;
        }

        throw new Error(data?.message || "Natijalarni yuklab bo‘lmadi.");
      }

      setResults(Array.isArray(data?.results) ? data.results : []);
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

  const subjects = useMemo(() => {
    return Array.from(
      new Set(
        results
          .map((item) => String(item.subject || "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [results]);

  const filteredResults = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return results.filter((item) => {
      const matchesSubject =
        subjectFilter === "all" || item.subject === subjectFilter;

      const matchesSearch =
        !needle ||
        item.userName.toLowerCase().includes(needle) ||
        item.testTitle.toLowerCase().includes(needle) ||
        item.subject.toLowerCase().includes(needle);

      return matchesSubject && matchesSearch;
    });
  }, [results, search, subjectFilter]);

  const stats = useMemo(() => {
    const count = results.length;
    const average =
      count > 0
        ? Math.round(
            results.reduce((sum, item) => sum + item.percentage, 0) / count
          )
        : 0;

    const best =
      count > 0 ? Math.max(...results.map((item) => item.percentage)) : 0;

    const users = new Set(results.map((item) => item.userName)).size;

    return { count, average, best, users };
  }, [results]);

  function formatDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value || "—";
    }

    return date.toLocaleString("uz-UZ", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDuration(seconds: number) {
    const safe = Math.max(0, Math.floor(Number(seconds) || 0));
    const minutes = Math.floor(safe / 60);
    const secs = safe % 60;

    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(
      2,
      "0"
    )}`;
  }

  async function deleteResult(id: string) {
    if (!window.confirm("Ushbu natija o‘chirilsinmi?")) {
      return;
    }

    setDeletingId(id);

    try {
      const response = await fetch(
        `/api/admin/results?id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        alert(data?.message || "Natija o‘chirilmadi.");
        return;
      }

      setResults((current) => current.filter((item) => item.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  async function deleteAll() {
    if (results.length === 0) {
      return;
    }

    if (
      !window.confirm(
        "Barcha test natijalari o‘chirilsinmi? Bu amalni qaytarib bo‘lmaydi."
      )
    ) {
      return;
    }

    const response = await fetch("/api/admin/results?all=1", {
      method: "DELETE",
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      alert(data?.message || "Natijalar o‘chirilmadi.");
      return;
    }

    setResults([]);
  }

  function csvCell(value: unknown) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
  }

  function exportCsv() {
    const rows = [
      [
        "Foydalanuvchi",
        "Test",
        "Fan",
        "Foiz",
        "To‘g‘ri",
        "Noto‘g‘ri",
        "Javobsiz",
        "Ball",
        "Sarflangan vaqt",
        "Topshirilgan sana",
      ],
      ...filteredResults.map((item) => [
        item.userName,
        item.testTitle,
        item.subject,
        `${item.percentage}%`,
        item.correct,
        item.incorrect,
        item.unanswered,
        `${item.earnedPoints}/${item.totalPoints}`,
        formatDuration(item.spentSeconds),
        formatDate(item.finishedAt),
      ]),
    ];

    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `test-natijalari-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="page">
      <header className="topPanel">
        <div className="namePlate">Test natijalari</div>

        <div className="headerButtons">
          <button onClick={() => router.push("/admin/tests")}>Testlar</button>
          <button onClick={() => router.push("/admin/requests")}>Admin</button>
          <button onClick={() => router.push("/")}>Asosiy sahifa</button>
        </div>
      </header>

      <section className="panel">
        <div className="floatingTitle">Natijalar boshqaruvi</div>

        <div className="statsGrid">
          <div className="statCard">
            <span>Jami urinish</span>
            <strong>{stats.count}</strong>
          </div>

          <div className="statCard">
            <span>Foydalanuvchilar</span>
            <strong>{stats.users}</strong>
          </div>

          <div className="statCard">
            <span>O‘rtacha natija</span>
            <strong>{stats.average}%</strong>
          </div>

          <div className="statCard">
            <span>Eng yuqori</span>
            <strong>{stats.best}%</strong>
          </div>
        </div>

        <div className="filterBar">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Foydalanuvchi, test yoki fan bo‘yicha qidirish..."
          />

          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
          >
            <option value="all">Barcha fanlar</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>

          <button className="refreshButton" onClick={loadResults}>
            Yangilash
          </button>

          <button
            className="exportButton"
            onClick={exportCsv}
            disabled={filteredResults.length === 0}
          >
            CSV saqlash
          </button>

          <button
            className="deleteAllButton"
            onClick={deleteAll}
            disabled={results.length === 0}
          >
            Barchasini o‘chirish
          </button>
        </div>

        {loading ? (
          <div className="stateBox">Natijalar yuklanmoqda...</div>
        ) : error ? (
          <div className="stateBox errorBox">{error}</div>
        ) : filteredResults.length === 0 ? (
          <div className="stateBox">Hozircha natijalar mavjud emas.</div>
        ) : (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>№</th>
                  <th>Foydalanuvchi</th>
                  <th>Test</th>
                  <th>Fan</th>
                  <th>Natija</th>
                  <th>Javoblar</th>
                  <th>Ball</th>
                  <th>Vaqt</th>
                  <th>Sana</th>
                  <th>Amal</th>
                </tr>
              </thead>

              <tbody>
                {filteredResults.map((item, index) => (
                  <tr key={item.id}>
                    <td>{index + 1}</td>
                    <td className="userCell">{item.userName}</td>
                    <td>{item.testTitle}</td>
                    <td>{item.subject || "—"}</td>
                    <td>
                      <span
                        className={
                          item.percentage >= 71
                            ? "score goodScore"
                            : item.percentage >= 56
                            ? "score middleScore"
                            : "score lowScore"
                        }
                      >
                        {item.percentage}%
                      </span>
                    </td>
                    <td>
                      <div className="answerStats">
                        <span className="correctText">✓ {item.correct}</span>
                        <span className="wrongText">× {item.incorrect}</span>
                        <span>— {item.unanswered}</span>
                      </div>
                    </td>
                    <td>
                      {item.earnedPoints}/{item.totalPoints}
                    </td>
                    <td>{formatDuration(item.spentSeconds)}</td>
                    <td className="dateCell">{formatDate(item.finishedAt)}</td>
                    <td>
                      <button
                        className="deleteButton"
                        disabled={deletingId === item.id}
                        onClick={() => deleteResult(item.id)}
                      >
                        {deletingId === item.id ? "..." : "O‘chirish"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          padding: 18px 18px 80px;
          background: linear-gradient(180deg, #fff, #edf1f4);
          color: #111;
          font-family: "Bell MT", "Times New Roman", serif;
        }

        button,
        input,
        select {
          font-family: inherit;
        }

        button {
          cursor: pointer;
        }

        button:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .topPanel {
          width: 100%;
          min-height: 110px;
          padding: 20px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          border: 3px solid #173e58;
          border-radius: 25px;
          background: linear-gradient(#9bdcff, #54a4d5);
          box-shadow:
            inset 0 6px 5px rgba(255, 255, 255, 0.8),
            0 7px 0 #173c55,
            0 13px 20px rgba(0, 0, 0, 0.2);
        }

        .namePlate {
          min-width: 300px;
          padding: 17px 28px;
          text-align: center;
          border: 3px solid #444;
          border-radius: 15px;
          background: linear-gradient(#fff, #bdbdbd);
          box-shadow: inset 0 5px 5px white, 0 5px 0 #555;
          font-size: 27px;
          font-weight: 700;
        }

        .headerButtons {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 12px;
        }

        .headerButtons button,
        .refreshButton,
        .exportButton,
        .deleteAllButton {
          min-height: 48px;
          padding: 0 18px;
          border: 2px solid #555;
          border-radius: 9px;
          background: linear-gradient(#fff, #bbb);
          box-shadow: 0 4px 0 #555;
          font-weight: 700;
        }

        .panel {
          position: relative;
          width: min(1550px, 98%);
          margin: 90px auto 0;
          padding: 75px 28px 35px;
          border: 3px solid #303538;
          border-radius: 27px;
          background: linear-gradient(145deg, #696d70, #505457 50%, #363a3d);
          box-shadow:
            inset 0 7px 6px rgba(255, 255, 255, 0.23),
            inset 0 -8px 8px rgba(0, 0, 0, 0.32),
            0 7px 0 #272b2e,
            0 15px 25px rgba(0, 0, 0, 0.24);
        }

        .floatingTitle {
          position: absolute;
          top: -35px;
          left: 50%;
          transform: translateX(-50%);
          min-width: 360px;
          min-height: 68px;
          padding: 10px 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          border: 3px solid #174461;
          border-radius: 16px;
          background: linear-gradient(#abe6ff, #58a8d7);
          box-shadow: inset 0 6px 5px rgba(255, 255, 255, 0.7), 0 5px 0 #17415c;
          color: #073b68;
          font-size: 27px;
          font-weight: 700;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 15px;
          margin-bottom: 25px;
        }

        .statCard {
          min-height: 110px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 2px solid #555;
          border-radius: 14px;
          background: linear-gradient(#fff, #d0d0d0);
          box-shadow: inset 0 5px 5px white, 0 5px 0 #555d61;
          text-align: center;
        }

        .statCard span {
          color: #555;
          margin-bottom: 7px;
        }

        .statCard strong {
          color: #07517e;
          font-size: 30px;
        }

        .filterBar {
          margin-bottom: 25px;
          padding: 18px;
          display: grid;
          grid-template-columns: minmax(250px, 1fr) 220px auto auto auto;
          gap: 12px;
          border: 2px solid #555;
          border-radius: 13px;
          background: linear-gradient(#fff, #ccc);
          box-shadow: 0 5px 0 #555d61;
        }

        .filterBar input,
        .filterBar select {
          min-height: 48px;
          padding: 0 13px;
          border: 2px solid #777;
          border-radius: 8px;
          background: white;
          font-size: 16px;
        }

        .exportButton {
          border-color: #277b49;
          background: linear-gradient(#c6f1d3, #68c888);
          box-shadow: 0 4px 0 #277144;
          color: #125a32;
        }

        .deleteAllButton {
          border-color: #8e1515;
          background: linear-gradient(#f77b7b, #c62525);
          box-shadow: 0 4px 0 #831515;
          color: white;
        }

        .stateBox {
          padding: 40px 25px;
          border: 2px solid #777;
          border-radius: 13px;
          background: white;
          text-align: center;
          font-size: 20px;
          font-weight: 700;
        }

        .errorBox {
          color: #9c1d1d;
          background: #ffe1e1;
        }

        .tableWrap {
          overflow-x: auto;
          border: 2px solid #555;
          border-radius: 14px;
          background: white;
          box-shadow: 0 6px 0 #555d61;
        }

        table {
          width: 100%;
          min-width: 1250px;
          border-collapse: collapse;
        }

        th,
        td {
          padding: 13px 11px;
          border-bottom: 1px solid #bbb;
          border-right: 1px solid #ddd;
          text-align: center;
          vertical-align: middle;
        }

        th {
          position: sticky;
          top: 0;
          z-index: 1;
          background: linear-gradient(#b8ecff, #58a8d7);
          color: #073b68;
          font-size: 15px;
        }

        tbody tr:nth-child(even) {
          background: #f3f3f3;
        }

        tbody tr:hover {
          background: #eaf7ff;
        }

        .userCell {
          font-weight: 700;
        }

        .dateCell {
          white-space: nowrap;
          font-size: 13px;
        }

        .score {
          min-width: 65px;
          padding: 7px 10px;
          display: inline-block;
          border-radius: 20px;
          font-weight: 700;
        }

        .goodScore {
          color: #126033;
          background: #d8f1df;
        }

        .middleScore {
          color: #7a5b00;
          background: #fff0b5;
        }

        .lowScore {
          color: #8c1818;
          background: #f6dada;
        }

        .answerStats {
          display: flex;
          justify-content: center;
          gap: 8px;
          white-space: nowrap;
        }

        .correctText {
          color: #18713b;
          font-weight: 700;
        }

        .wrongText {
          color: #ad1c1c;
          font-weight: 700;
        }

        .deleteButton {
          min-height: 38px;
          padding: 0 12px;
          border: 1px solid #8e1515;
          border-radius: 7px;
          background: linear-gradient(#f77b7b, #c62525);
          color: white;
          font-weight: 700;
        }

        @media (max-width: 1100px) {
          .statsGrid {
            grid-template-columns: repeat(2, 1fr);
          }

          .filterBar {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 700px) {
          .page {
            padding: 10px 7px 60px;
          }

          .topPanel {
            flex-direction: column;
            padding: 16px;
          }

          .namePlate {
            width: 100%;
            min-width: 0;
          }

          .headerButtons {
            width: 100%;
          }

          .headerButtons button {
            flex: 1;
            min-width: 130px;
          }

          .panel {
            width: 99%;
            padding: 70px 10px 20px;
          }

          .floatingTitle {
            min-width: 250px;
            width: 85%;
            font-size: 21px;
          }

          .statsGrid,
          .filterBar {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
