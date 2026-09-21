"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Period =
  | "week"
  | "month"
  | "all";

type RankingItem = {
  rank: number;
  userId: string;
  userName: string;
  workedQuestions: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  testsWorked: number;
  attempts: number;
  earnedPoints: number;
  firstActivityAt: string | null;
  lastActivityAt: string | null;
};

type RankingResponse = {
  success: boolean;
  period?: Period;
  timezone?: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  summary?: {
    participants: number;
    uniqueAnswers: number;
    correctAnswers: number;
    incorrectAnswers: number;
  };
  ranking?: RankingItem[];
  message?: string;
};

function periodTitle(
  period: Period
) {
  if (period === "week") {
    return "Haftalik reyting";
  }

  if (period === "month") {
    return "Oylik reyting";
  }

  return "Umumiy reyting";
}

function formatDate(
  value: string | null
) {
  if (!value) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat(
      "uz-UZ",
      {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }
    ).format(
      new Date(value)
    );
  } catch {
    return value;
  }
}

function safeDate() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function normalizePdfText(
  value: string
) {
  return String(value || "")
    .replace(
      /[‘’ʻʼ`´]/g,
      "'"
    )
    .replace(
      /[–—]/g,
      "-"
    );
}

function csvCell(
  value: unknown
) {
  const text =
    String(value ?? "");

  return `"${text.replace(
    /"/g,
    '""'
  )}"`;
}

export default function AdminRankingPage() {
  const router =
    useRouter();

  const [period, setPeriod] =
    useState<Period>("week");

  const [ranking, setRanking] =
    useState<RankingItem[]>([]);

  const [summary, setSummary] =
    useState({
      participants: 0,
      uniqueAnswers: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
    });

  const [
    periodStart,
    setPeriodStart,
  ] = useState<
    string | null
  >(null);

  const [
    periodEnd,
    setPeriodEnd,
  ] = useState<
    string | null
  >(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [
    deletingUserId,
    setDeletingUserId,
  ] = useState<
    string | null
  >(null);

  const [
    clearingAll,
    setClearingAll,
  ] = useState(false);

  /* =====================================================
     LOAD
  ===================================================== */

  useEffect(() => {
    void loadRanking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  async function readJson(
    response: Response
  ) {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  async function loadRanking() {
    setLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          `/api/admin/ranking?period=${period}&limit=500`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

      const data:
        RankingResponse =
        await readJson(
          response
        );

      if (!response.ok) {
        if (
          response.status ===
          403
        ) {
          router.replace("/");
          return;
        }

        throw new Error(
          data?.message ||
            "Reytingni yuklab bo‘lmadi."
        );
      }

      setRanking(
        Array.isArray(
          data?.ranking
        )
          ? data.ranking
          : []
      );

      setSummary({
        participants:
          Number(
            data?.summary
              ?.participants
          ) || 0,

        uniqueAnswers:
          Number(
            data?.summary
              ?.uniqueAnswers
          ) || 0,

        correctAnswers:
          Number(
            data?.summary
              ?.correctAnswers
          ) || 0,

        incorrectAnswers:
          Number(
            data?.summary
              ?.incorrectAnswers
          ) || 0,
      });

      setPeriodStart(
        data?.periodStart ||
          null
      );

      setPeriodEnd(
        data?.periodEnd ||
          null
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Reytingni yuklashda xatolik."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =====================================================
     SEARCH
  ===================================================== */

  const visibleRanking =
    useMemo(() => {
      const needle =
        search
          .trim()
          .toLowerCase();

      if (!needle) {
        return ranking;
      }

      return ranking.filter(
        (item) =>
          item.userName
            .toLowerCase()
            .includes(
              needle
            ) ||
          item.userId
            .toLowerCase()
            .includes(
              needle
            )
      );
    }, [
      ranking,
      search,
    ]);

  const topThree =
    visibleRanking.slice(
      0,
      3
    );

  /* =====================================================
     DELETE USER
  ===================================================== */

  async function deleteUser(
    item: RankingItem
  ) {
    const ok =
      window.confirm(
        `${item.userName}ning barcha reyting ma’lumotlarini o‘chirasizmi?\n\nBu amalni qaytarib bo‘lmaydi.`
      );

    if (!ok) {
      return;
    }

    setDeletingUserId(
      item.userId
    );

    try {
      const response =
        await fetch(
          "/api/admin/ranking",
          {
            method:
              "DELETE",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "user",
                userId:
                  item.userId,
              }),
          }
        );

      const data =
        await readJson(
          response
        );

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Talabani o‘chirib bo‘lmadi."
        );
      }

      await loadRanking();
    } catch (err) {
      window.alert(
        err instanceof Error
          ? err.message
          : "O‘chirishda xatolik."
      );
    } finally {
      setDeletingUserId(
        null
      );
    }
  }

  /* =====================================================
     CLEAR ALL
  ===================================================== */

  async function clearAll() {
    const first =
      window.confirm(
        "UMUMIY REYTINGNI TO‘LIQ O‘CHIRASIZMI?\n\nBarcha talabalar reytingi va savol natijalari o‘chadi."
      );

    if (!first) {
      return;
    }

    const second =
      window.confirm(
        "Oxirgi tasdiq:\n\nBu amalni qaytarib bo‘lmaydi. Davom etilsinmi?"
      );

    if (!second) {
      return;
    }

    setClearingAll(
      true
    );

    try {
      const response =
        await fetch(
          "/api/admin/ranking",
          {
            method:
              "DELETE",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "all",
              }),
          }
        );

      const data =
        await readJson(
          response
        );

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Umumiy reytingni o‘chirib bo‘lmadi."
        );
      }

      setSearch("");
      await loadRanking();
    } catch (err) {
      window.alert(
        err instanceof Error
          ? err.message
          : "O‘chirishda xatolik."
      );
    } finally {
      setClearingAll(
        false
      );
    }
  }

  /* =====================================================
     PDF
  ===================================================== */

  function exportPdf() {
    if (
      visibleRanking.length ===
      0
    ) {
      window.alert(
        "PDF uchun reyting natijalari yo‘q."
      );
      return;
    }

    const doc =
      new jsPDF({
        orientation:
          "landscape",
        unit: "mm",
        format: "a4",
      });

    const title =
      normalizePdfText(
        periodTitle(
          period
        ).toUpperCase()
      );

    doc.setFont(
      "helvetica",
      "bold"
    );
    doc.setFontSize(16);
    doc.text(
      title,
      10,
      13
    );

    doc.setFont(
      "helvetica",
      "normal"
    );
    doc.setFontSize(8);

    const periodText =
      period === "all"
        ? "Davr: barcha vaqt"
        : `Davr: ${formatDate(
            periodStart
          )} - ${formatDate(
            periodEnd
          )}`;

    doc.text(
      normalizePdfText(
        periodText
      ),
      10,
      19
    );

    doc.text(
      normalizePdfText(
        `Ishtirokchilar: ${summary.participants} | Noyob ishlangan savollar: ${summary.uniqueAnswers} | To'g'ri: ${summary.correctAnswers} | Noto'g'ri: ${summary.incorrectAnswers}`
      ),
      10,
      24
    );

    autoTable(
      doc,
      {
        startY: 29,

        head: [[
          "O'rin",
          "Talaba",
          "Ishlangan",
          "To'g'ri",
          "Noto'g'ri",
          "Aniqlik",
          "Testlar",
          "Urinishlar",
          "Ball",
          "Oxirgi faollik",
        ]],

        body:
          visibleRanking.map(
            (item) => [
              item.rank,
              normalizePdfText(
                item.userName
              ),
              item.workedQuestions,
              item.correct,
              item.incorrect,
              `${item.accuracy}%`,
              item.testsWorked,
              item.attempts,
              item.earnedPoints,
              normalizePdfText(
                formatDate(
                  item.lastActivityAt
                )
              ),
            ]
          ),

        styles: {
          fontSize: 7.5,
          halign:
            "center",
          valign:
            "middle",
        },

        headStyles: {
          fontStyle:
            "bold",
        },

        columnStyles: {
          1: {
            halign:
              "left",
          },
          9: {
            halign:
              "left",
          },
        },

        margin: {
          left: 8,
          right: 8,
        },
      }
    );

    const totalPages =
      doc.getNumberOfPages();

    for (
      let page = 1;
      page <= totalPages;
      page++
    ) {
      doc.setPage(
        page
      );

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(7);

      doc.text(
        `${page}/${totalPages}`,
        287,
        202,
        {
          align:
            "right",
        }
      );
    }

    doc.save(
      `umumiy-reyting-${period}-${safeDate()}.pdf`
    );
  }

  /* =====================================================
     CSV
  ===================================================== */

  function exportCsv() {
    if (
      visibleRanking.length ===
      0
    ) {
      window.alert(
        "Eksport uchun natija yo‘q."
      );
      return;
    }

    const rows = [
      [
        "O‘rin",
        "Talaba",
        "User ID",
        "Ishlangan savollar",
        "To‘g‘ri",
        "Noto‘g‘ri",
        "Aniqlik %",
        "Testlar",
        "Urinishlar",
        "Ball",
        "Oxirgi faollik",
      ],

      ...visibleRanking.map(
        (item) => [
          item.rank,
          item.userName,
          item.userId,
          item.workedQuestions,
          item.correct,
          item.incorrect,
          item.accuracy,
          item.testsWorked,
          item.attempts,
          item.earnedPoints,
          formatDate(
            item.lastActivityAt
          ),
        ]
      ),
    ];

    const csv =
      rows
        .map((row) =>
          row
            .map(
              csvCell
            )
            .join(",")
        )
        .join("\n");

    const blob =
      new Blob(
        [
          "\uFEFF",
          csv,
        ],
        {
          type:
            "text/csv;charset=utf-8",
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const anchor =
      document.createElement(
        "a"
      );

    anchor.href = url;

    anchor.download =
      `umumiy-reyting-${period}-${safeDate()}.csv`;

    anchor.click();

    URL.revokeObjectURL(
      url
    );
  }

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <main className="page">
      <header className="topPanel">
        <div className="namePlate">
          🏆 Umumiy reyting
        </div>

        <div className="headerButtons">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/admin/results"
              )
            }
          >
            ← Natijalar
          </button>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/admin"
              )
            }
          >
            Admin panel
          </button>

          <button
            type="button"
            onClick={() =>
              router.push("/")
            }
          >
            Asosiy sahifa
          </button>
        </div>
      </header>

      <section className="panel">
        <div className="floatingTitle">
          Reyting boshqaruvi
        </div>

        {/* PERIOD */}

        <div className="periodTabs">
          <button
            type="button"
            className={
              period === "week"
                ? "periodButton active"
                : "periodButton"
            }
            onClick={() =>
              setPeriod(
                "week"
              )
            }
          >
            Haftalik
          </button>

          <button
            type="button"
            className={
              period === "month"
                ? "periodButton active"
                : "periodButton"
            }
            onClick={() =>
              setPeriod(
                "month"
              )
            }
          >
            Oylik
          </button>

          <button
            type="button"
            className={
              period === "all"
                ? "periodButton active"
                : "periodButton"
            }
            onClick={() =>
              setPeriod(
                "all"
              )
            }
          >
            Umumiy
          </button>
        </div>

        {/* STATS */}

        <div className="statsGrid">
          <article className="statCard">
            <span>
              Ishtirokchilar
            </span>
            <strong>
              {
                summary.participants
              }
            </strong>
          </article>

          <article className="statCard">
            <span>
              Ishlangan noyob savollar
            </span>
            <strong>
              {
                summary.uniqueAnswers
              }
            </strong>
          </article>

          <article className="statCard successStat">
            <span>
              To‘g‘ri javoblar
            </span>
            <strong>
              {
                summary.correctAnswers
              }
            </strong>
          </article>

          <article className="statCard dangerStat">
            <span>
              Noto‘g‘ri javoblar
            </span>
            <strong>
              {
                summary.incorrectAnswers
              }
            </strong>
          </article>
        </div>

        {/* TOP 3 */}

        {topThree.length >
          0 && (
          <div className="topThree">
            {topThree.map(
              (
                item,
                index
              ) => (
                <article
                  key={
                    item.userId
                  }
                  className={`topCard top${index + 1}`}
                >
                  <span>
                    {index === 0
                      ? "🥇 1-o‘rin"
                      : index === 1
                        ? "🥈 2-o‘rin"
                        : "🥉 3-o‘rin"}
                  </span>

                  <strong>
                    {
                      item.userName
                    }
                  </strong>

                  <small>
                    {
                      item.correct
                    }{" "}
                    ta to‘g‘ri •{" "}
                    {
                      item.accuracy
                    }
                    %
                  </small>
                </article>
              )
            )}
          </div>
        )}

        {/* TOOLS */}

        <div className="toolBar">
          <div className="searchGroup">
            <input
              type="search"
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event.target
                    .value
                )
              }
              placeholder="Talaba ismi yoki ID..."
            />

            {search && (
              <button
                type="button"
                className="clearSearch"
                onClick={() =>
                  setSearch("")
                }
              >
                ×
              </button>
            )}
          </div>

          <div className="toolButtons">
            <button
              type="button"
              className="refreshButton"
              disabled={
                loading
              }
              onClick={() =>
                void loadRanking()
              }
            >
              {loading
                ? "Yuklanmoqda..."
                : "↻ Yangilash"}
            </button>

            <button
              type="button"
              className="pdfButton"
              onClick={
                exportPdf
              }
            >
              PDF olish
            </button>

            <button
              type="button"
              className="csvButton"
              onClick={
                exportCsv
              }
            >
              CSV olish
            </button>

            <button
              type="button"
              className="dangerButton"
              disabled={
                clearingAll ||
                ranking.length ===
                  0
              }
              onClick={
                clearAll
              }
            >
              {clearingAll
                ? "O‘chirilmoqda..."
                : "Umumiy reytingni o‘chirish"}
            </button>
          </div>
        </div>

        <div className="periodInfo">
          <strong>
            {
              periodTitle(
                period
              )
            }
          </strong>

          <span>
            {period ===
            "all"
              ? "Barcha vaqt bo‘yicha natijalar"
              : `${formatDate(
                  periodStart
                )} dan ${formatDate(
                  periodEnd
                )} gacha`}
          </span>

          <span>
            Ko‘rsatilmoqda:{" "}
            {
              visibleRanking.length
            }{" "}
            ta talaba
          </span>
        </div>

        {error && (
          <div className="errorBox">
            {error}
          </div>
        )}

        {/* TABLE */}

        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>
                  O‘rin
                </th>
                <th>
                  Talaba
                </th>
                <th>
                  Ishlangan
                </th>
                <th>
                  To‘g‘ri
                </th>
                <th>
                  Noto‘g‘ri
                </th>
                <th>
                  Aniqlik
                </th>
                <th>
                  Testlar
                </th>
                <th>
                  Urinish
                </th>
                <th>
                  Ball
                </th>
                <th>
                  Oxirgi faollik
                </th>
                <th>
                  Amal
                </th>
              </tr>
            </thead>

            <tbody>
              {!loading &&
                visibleRanking.map(
                  (item) => (
                    <tr
                      key={
                        item.userId
                      }
                    >
                      <td>
                        <span className="rankBadge">
                          #
                          {
                            item.rank
                          }
                        </span>
                      </td>

                      <td className="studentCell">
                        <strong>
                          {
                            item.userName
                          }
                        </strong>

                        <small>
                          ID:{" "}
                          {
                            item.userId
                          }
                        </small>
                      </td>

                      <td>
                        {
                          item.workedQuestions
                        }
                      </td>

                      <td className="correctValue">
                        {
                          item.correct
                        }
                      </td>

                      <td className="incorrectValue">
                        {
                          item.incorrect
                        }
                      </td>

                      <td>
                        <strong>
                          {
                            item.accuracy
                          }
                          %
                        </strong>
                      </td>

                      <td>
                        {
                          item.testsWorked
                        }
                      </td>

                      <td>
                        {
                          item.attempts
                        }
                      </td>

                      <td>
                        {
                          item.earnedPoints
                        }
                      </td>

                      <td className="dateCell">
                        {formatDate(
                          item.lastActivityAt
                        )}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="deleteUserButton"
                          disabled={
                            deletingUserId ===
                            item.userId
                          }
                          onClick={() =>
                            void deleteUser(
                              item
                            )
                          }
                        >
                          {deletingUserId ===
                          item.userId
                            ? "..."
                            : "O‘chirish"}
                        </button>
                      </td>
                    </tr>
                  )
                )}

              {!loading &&
                visibleRanking.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={
                        11
                      }
                    >
                      <div className="emptyState">
                        Reyting natijalari topilmadi.
                      </div>
                    </td>
                  </tr>
                )}

              {loading && (
                <tr>
                  <td
                    colSpan={
                      11
                    }
                  >
                    <div className="emptyState">
                      Reyting yuklanmoqda...
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rankingRule">
          <strong>
            Reyting tartibi:
          </strong>{" "}
          avval to‘g‘ri
          javoblar soni,
          keyin aniqlik
          foizi, keyin
          ishlangan noyob
          savollar soni.
          Bir xil savol
          tanlangan davr
          ichida qayta
          ishlansa, reytingga
          bir marta
          hisoblanadi.
        </div>
      </section>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          padding: 22px;
          background:
            radial-gradient(circle at top right, rgba(39, 162, 219, 0.12), transparent 34%),
            #f3f6f8;
          color: #102a43;
          font-family: Arial, Helvetica, sans-serif;
        }

        .topPanel {
          max-width: 1500px;
          margin: 0 auto 22px;
          padding: 14px;
          border: 1px solid #9aa8b3;
          border-radius: 18px;
          background: linear-gradient(180deg, #ffffff, #e9eef2);
          box-shadow:
            0 8px 0 #14394c,
            0 12px 28px rgba(0, 0, 0, 0.12);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .namePlate {
          padding: 13px 22px;
          border: 1px solid #aa7b00;
          border-radius: 12px;
          background: linear-gradient(180deg, #fff9d9, #efc34f);
          box-shadow: inset 0 1px 0 #fff;
          font-size: 22px;
          font-weight: 900;
        }

        .headerButtons,
        .toolButtons {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
        }

        button {
          font: inherit;
        }

        .headerButtons button,
        .toolButtons button {
          border: 1px solid #83919b;
          border-radius: 10px;
          padding: 10px 14px;
          background: linear-gradient(180deg, #ffffff, #dbe2e7);
          color: #102a43;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 3px 0 #64727c;
        }

        .headerButtons button:active,
        .toolButtons button:active {
          transform: translateY(2px);
          box-shadow: 0 1px 0 #64727c;
        }

        .panel {
          position: relative;
          max-width: 1500px;
          margin: 0 auto;
          padding: 34px 20px 22px;
          border: 1px solid #9aa8b3;
          border-radius: 20px;
          background: #ffffff;
          box-shadow: 0 12px 35px rgba(17, 45, 61, 0.11);
        }

        .floatingTitle {
          position: absolute;
          top: -19px;
          left: 24px;
          padding: 10px 22px;
          border: 2px solid #175f83;
          border-radius: 13px;
          background: linear-gradient(180deg, #dff5ff, #58b7e4);
          box-shadow: 0 5px 0 #174d66;
          font-size: 18px;
          font-weight: 900;
        }

        .periodTabs {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin: 12px 0 18px;
        }

        .periodButton {
          min-height: 52px;
          border: 1px solid #8b98a1;
          border-radius: 12px;
          background: linear-gradient(180deg, #fff, #e7ecef);
          font-weight: 900;
          font-size: 16px;
          cursor: pointer;
          box-shadow: 0 4px 0 #6e7c85;
        }

        .periodButton.active {
          border-color: #996f00;
          background: linear-gradient(180deg, #fff7cf, #f1c33f);
          box-shadow: 0 4px 0 #8c6500;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }

        .statCard {
          padding: 16px;
          border: 1px solid #bdc8cf;
          border-radius: 14px;
          background: linear-gradient(180deg, #ffffff, #f0f4f6);
          box-shadow: 0 5px 12px rgba(20, 57, 76, 0.08);
        }

        .statCard span {
          display: block;
          color: #567;
          font-size: 13px;
          margin-bottom: 8px;
        }

        .statCard strong {
          font-size: 26px;
        }

        .successStat strong {
          color: #10823b;
        }

        .dangerStat strong {
          color: #c93434;
        }

        .topThree {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }

        .topCard {
          min-height: 120px;
          padding: 18px;
          border-radius: 16px;
          border: 1px solid #b5bec4;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
        }

        .topCard span {
          font-weight: 900;
        }

        .topCard strong {
          font-size: 18px;
        }

        .topCard small {
          color: #4d6070;
        }

        .top1 {
          background: linear-gradient(135deg, #fff9d8, #f3ca54);
        }

        .top2 {
          background: linear-gradient(135deg, #f7f8f9, #d7dde1);
        }

        .top3 {
          background: linear-gradient(135deg, #fff0e2, #dca06b);
        }

        .toolBar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
          padding: 12px;
          border: 1px solid #c3cdd3;
          border-radius: 14px;
          background: #f7fafb;
        }

        .searchGroup {
          position: relative;
          flex: 1 1 330px;
          max-width: 500px;
        }

        .searchGroup input {
          width: 100%;
          min-height: 44px;
          border: 1px solid #9caab4;
          border-radius: 10px;
          padding: 10px 42px 10px 13px;
          font: inherit;
          outline: none;
          background: #fff;
        }

        .searchGroup input:focus {
          border-color: #187cab;
          box-shadow: 0 0 0 3px rgba(24, 124, 171, 0.12);
        }

        .clearSearch {
          position: absolute;
          top: 7px;
          right: 7px;
          width: 30px;
          height: 30px;
          border: 0;
          border-radius: 8px;
          background: #e9eef1;
          cursor: pointer;
          font-size: 20px;
        }

        .refreshButton {
          background: linear-gradient(180deg, #eefaff, #9edaf4) !important;
        }

        .pdfButton {
          background: linear-gradient(180deg, #fff1f1, #f5a4a4) !important;
        }

        .csvButton {
          background: linear-gradient(180deg, #eefaf0, #a6e1b1) !important;
        }

        .dangerButton {
          color: #fff !important;
          border-color: #951c1c !important;
          background: linear-gradient(180deg, #f45a5a, #c71919) !important;
          box-shadow: 0 3px 0 #791010 !important;
        }

        button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .periodInfo {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px 18px;
          margin-bottom: 12px;
          padding: 10px 12px;
          border-left: 4px solid #d0a421;
          background: #fffbee;
          font-size: 13px;
        }

        .errorBox {
          margin-bottom: 12px;
          padding: 12px;
          border: 1px solid #d64040;
          border-radius: 10px;
          background: #fff0f0;
          color: #9c1f1f;
          font-weight: 800;
        }

        .tableWrap {
          overflow-x: auto;
          border: 1px solid #aebac1;
          border-radius: 14px;
        }

        table {
          width: 100%;
          min-width: 1180px;
          border-collapse: collapse;
          background: #fff;
        }

        th,
        td {
          padding: 12px 10px;
          border-bottom: 1px solid #d7dfe4;
          text-align: center;
          vertical-align: middle;
          font-size: 13px;
        }

        th {
          position: sticky;
          top: 0;
          z-index: 2;
          background: linear-gradient(180deg, #2d617b, #173f55);
          color: #fff;
          font-size: 12px;
        }

        tbody tr:hover {
          background: #f3f9fc;
        }

        .rankBadge {
          display: inline-flex;
          min-width: 42px;
          justify-content: center;
          padding: 7px 9px;
          border-radius: 999px;
          background: #edf3f6;
          font-weight: 900;
        }

        .studentCell {
          min-width: 220px;
          text-align: left;
        }

        .studentCell strong,
        .studentCell small {
          display: block;
        }

        .studentCell small {
          margin-top: 4px;
          color: #73838d;
          font-size: 10px;
          word-break: break-all;
        }

        .correctValue {
          color: #11863d;
          font-weight: 900;
        }

        .incorrectValue {
          color: #c63131;
          font-weight: 900;
        }

        .dateCell {
          min-width: 145px;
          white-space: nowrap;
        }

        .deleteUserButton {
          border: 1px solid #a22020;
          border-radius: 8px;
          padding: 8px 11px;
          background: linear-gradient(180deg, #fff0f0, #efaaaa);
          color: #8c1111;
          font-weight: 900;
          cursor: pointer;
        }

        .emptyState {
          padding: 32px;
          color: #667784;
          font-weight: 800;
        }

        .rankingRule {
          margin-top: 14px;
          padding: 12px 14px;
          border-radius: 12px;
          background: #eff7fb;
          border: 1px solid #bfd6e2;
          color: #385465;
          font-size: 13px;
          line-height: 1.6;
        }

        @media (max-width: 1050px) {
          .topPanel,
          .toolBar {
            align-items: stretch;
            flex-direction: column;
          }

          .statsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .topThree {
            grid-template-columns: 1fr;
          }

          .searchGroup {
            max-width: none;
          }
        }

        @media (max-width: 650px) {
          .page {
            padding: 12px;
          }

          .panel {
            padding-left: 10px;
            padding-right: 10px;
          }

          .periodTabs,
          .statsGrid {
            grid-template-columns: 1fr;
          }

          .namePlate {
            font-size: 18px;
          }

          .headerButtons,
          .toolButtons {
            display: grid;
            grid-template-columns: 1fr;
          }

          .headerButtons button,
          .toolButtons button {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}

