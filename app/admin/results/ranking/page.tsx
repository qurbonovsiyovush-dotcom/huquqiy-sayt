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

type SortMode =
  | "rank"
  | "correct"
  | "accuracy"
  | "worked"
  | "name"
  | "activity";

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

function numberOrZero(
  value: unknown
) {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : 0;
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

  const [sortMode, setSortMode] =
    useState<SortMode>("rank");

  const [
    selectionMode,
    setSelectionMode,
  ] = useState(false);

  const [
    selectedIds,
    setSelectedIds,
  ] = useState<Set<string>>(
    new Set()
  );

  const [
    showSelectedOnly,
    setShowSelectedOnly,
  ] = useState(false);

  const [
    deletingUserId,
    setDeletingUserId,
  ] = useState<
    string | null
  >(null);

  const [
    deletingSelected,
    setDeletingSelected,
  ] = useState(false);

  const [
    clearingAll,
    setClearingAll,
  ] = useState(false);

  /* =====================================================
     LOAD
  ===================================================== */

  useEffect(() => {
    setSelectedIds(
      new Set()
    );

    setShowSelectedOnly(
      false
    );

    setSelectionMode(
      false
    );

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

      const nextRanking =
        Array.isArray(
          data?.ranking
        )
          ? data.ranking
          : [];

      setRanking(
        nextRanking
      );

      setSelectedIds(
        (current) => {
          const allowed =
            new Set(
              nextRanking.map(
                (item) =>
                  item.userId
              )
            );

          return new Set(
            [...current].filter(
              (id) =>
                allowed.has(id)
            )
          );
        }
      );

      setSummary({
        participants:
          numberOrZero(
            data?.summary
              ?.participants
          ),

        uniqueAnswers:
          numberOrZero(
            data?.summary
              ?.uniqueAnswers
          ),

        correctAnswers:
          numberOrZero(
            data?.summary
              ?.correctAnswers
          ),

        incorrectAnswers:
          numberOrZero(
            data?.summary
              ?.incorrectAnswers
          ),
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
     FILTER / SORT
  ===================================================== */

  const visibleRanking =
    useMemo(() => {
      const needle =
        search
          .trim()
          .toLowerCase();

      let rows =
        ranking.filter(
          (item) => {
            const matchesSearch =
              !needle ||
              item.userName
                .toLowerCase()
                .includes(
                  needle
                ) ||
              item.userId
                .toLowerCase()
                .includes(
                  needle
                );

            const matchesSelected =
              !showSelectedOnly ||
              selectedIds.has(
                item.userId
              );

            return (
              matchesSearch &&
              matchesSelected
            );
          }
        );

      rows =
        [...rows];

      if (
        sortMode ===
        "correct"
      ) {
        rows.sort(
          (a, b) =>
            b.correct -
              a.correct ||
            b.accuracy -
              a.accuracy ||
            a.rank -
              b.rank
        );
      } else if (
        sortMode ===
        "accuracy"
      ) {
        rows.sort(
          (a, b) =>
            b.accuracy -
              a.accuracy ||
            b.correct -
              a.correct ||
            a.rank -
              b.rank
        );
      } else if (
        sortMode ===
        "worked"
      ) {
        rows.sort(
          (a, b) =>
            b.workedQuestions -
              a.workedQuestions ||
            b.correct -
              a.correct ||
            a.rank -
              b.rank
        );
      } else if (
        sortMode ===
        "name"
      ) {
        rows.sort(
          (a, b) =>
            a.userName.localeCompare(
              b.userName,
              "uz"
            )
        );
      } else if (
        sortMode ===
        "activity"
      ) {
        rows.sort(
          (a, b) =>
            new Date(
              b.lastActivityAt ||
                0
            ).getTime() -
            new Date(
              a.lastActivityAt ||
                0
            ).getTime()
        );
      } else {
        rows.sort(
          (a, b) =>
            a.rank -
            b.rank
        );
      }

      return rows;
    }, [
      ranking,
      search,
      sortMode,
      selectedIds,
      showSelectedOnly,
    ]);

  const topThree =
    ranking.slice(
      0,
      3
    );

  const selectedItems =
    useMemo(
      () =>
        ranking.filter(
          (item) =>
            selectedIds.has(
              item.userId
            )
        ),
      [
        ranking,
        selectedIds,
      ]
    );

  const allVisibleSelected =
    visibleRanking.length >
      0 &&
    visibleRanking.every(
      (item) =>
        selectedIds.has(
          item.userId
        )
    );

  const exportRows =
    selectedItems.length >
    0
      ? selectedItems
      : visibleRanking;

  /* =====================================================
     SELECTION
  ===================================================== */

  function toggleUser(
    userId: string
  ) {
    setSelectedIds(
      (current) => {
        const next =
          new Set(current);

        if (
          next.has(userId)
        ) {
          next.delete(
            userId
          );
        } else {
          next.add(
            userId
          );
        }

        return next;
      }
    );
  }

  function toggleAllVisible() {
    setSelectedIds(
      (current) => {
        const next =
          new Set(current);

        if (
          allVisibleSelected
        ) {
          for (
            const item of
            visibleRanking
          ) {
            next.delete(
              item.userId
            );
          }
        } else {
          for (
            const item of
            visibleRanking
          ) {
            next.add(
              item.userId
            );
          }
        }

        return next;
      }
    );
  }

  function clearSelection() {
    setSelectedIds(
      new Set()
    );

    setShowSelectedOnly(
      false
    );
  }

  function openSelectionMode() {
    setSelectionMode(
      true
    );
  }

  function closeSelectionMode() {
    clearSelection();

    setSelectionMode(
      false
    );
  }

  function resetFilters() {
    setSearch("");
    setSortMode("rank");
    setShowSelectedOnly(false);
  }

  /* =====================================================
     DELETE ONE
  ===================================================== */

  async function deleteUser(
    item: RankingItem
  ) {
    const ok =
      window.confirm(
        `${item.userName}ning BARCHA davrdagi reyting ma’lumotlarini o‘chirasizmi?\n\nBu amalni qaytarib bo‘lmaydi.`
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

      setSelectedIds(
        (current) => {
          const next =
            new Set(current);

          next.delete(
            item.userId
          );

          return next;
        }
      );

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
     DELETE SELECTED
  ===================================================== */

  async function deleteSelected() {
    if (
      selectedIds.size ===
      0
    ) {
      window.alert(
        "Avval o‘chiriladigan foydalanuvchilarni tanlang."
      );
      return;
    }

    const names =
      selectedItems
        .slice(0, 5)
        .map(
          (item) =>
            `• ${item.userName}`
        )
        .join("\n");

    const extra =
      selectedItems.length >
      5
        ? `\n... va yana ${selectedItems.length - 5} ta`
        : "";

    const ok =
      window.confirm(
        `${selectedItems.length} ta foydalanuvchining BARCHA davrdagi reyting ma’lumotlari o‘chiriladi:\n\n${names}${extra}\n\nDavom etasizmi?`
      );

    if (!ok) {
      return;
    }

    setDeletingSelected(
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
                  "users",
                userIds:
                  [...selectedIds],
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
            "Tanlangan foydalanuvchilarni o‘chirib bo‘lmadi."
        );
      }

      clearSelection();
      setSelectionMode(false);

      await loadRanking();
    } catch (err) {
      window.alert(
        err instanceof Error
          ? err.message
          : "O‘chirishda xatolik."
      );
    } finally {
      setDeletingSelected(
        false
      );
    }
  }

  /* =====================================================
     CLEAR ALL
  ===================================================== */

  async function clearAll() {
    const first =
      window.confirm(
        "UMUMIY REYTINGNI TO‘LIQ O‘CHIRASIZMI?\n\nBarcha foydalanuvchilar va savol natijalari o‘chadi."
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
      clearSelection();

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
      exportRows.length ===
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
        `${periodTitle(
          period
        ).toUpperCase()}${
          selectedItems.length
            ? " - TANLANGAN FOYDALANUVCHILAR"
            : ""
        }`
      );

    doc.setFont(
      "helvetica",
      "bold"
    );
    doc.setFontSize(15);
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
        `Jami: ${exportRows.length} foydalanuvchi | To'g'ri javoblar: ${exportRows.reduce(
          (sum, item) =>
            sum + item.correct,
          0
        )} | Ishlangan savollar: ${exportRows.reduce(
          (sum, item) =>
            sum +
            item.workedQuestions,
          0
        )}`
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
          "Foydalanuvchi",
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
          exportRows.map(
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
      exportRows.length ===
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
        "Foydalanuvchi",
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

      ...exportRows.map(
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
      <div className="pageGlow pageGlowOne" />
      <div className="pageGlow pageGlowTwo" />

      <header className="hero3d">
        <div className="heroTitleWrap">
          <div className="trophyBox">
            🏆
          </div>

          <div>
            <h1>
              Umumiy reyting
            </h1>
          </div>
        </div>

        <div className="headerButtons">
          <button
            type="button"
            className="silverButton resultsNav"
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
            className="silverButton adminNav"
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
            className="silverButton homeNav"
            onClick={() =>
              router.push("/")
            }
          >
            Asosiy sahifa
          </button>
        </div>
      </header>

      <section className="mainPanel3d">
        <div className="floating3dLabel">
          Reyting boshqaruvi
        </div>

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

        <div className="statsGrid">
          <article className="stat3d">
            <div className="statIcon">
              👥
            </div>

            <div>
              <span>
                Ishtirokchilar
              </span>
              <strong>
                {
                  summary.participants
                }
              </strong>
            </div>
          </article>

          <article className="stat3d">
            <div className="statIcon">
              📝
            </div>

            <div>
              <span>
                Ishlangan noyob savollar
              </span>
              <strong>
                {
                  summary.uniqueAnswers
                }
              </strong>
            </div>
          </article>

          <article className="stat3d greenStat">
            <div className="statIcon">
              ✓
            </div>

            <div>
              <span>
                To‘g‘ri javoblar
              </span>
              <strong>
                {
                  summary.correctAnswers
                }
              </strong>
            </div>
          </article>

          <article className="stat3d redStat">
            <div className="statIcon">
              ×
            </div>

            <div>
              <span>
                Noto‘g‘ri javoblar
              </span>
              <strong>
                {
                  summary.incorrectAnswers
                }
              </strong>
            </div>
          </article>
        </div>

        {topThree.length >
          0 && (
          <section className="podiumSection">
            <div className="sectionTitleRow">
              <h2>
                Eng yuqori natijalar
              </h2>

              <span>
                {
                  periodTitle(
                    period
                  )
                }
              </span>
            </div>

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
                    <div className="medal">
                      {index === 0
                        ? "🥇"
                        : index === 1
                          ? "🥈"
                          : "🥉"}
                    </div>

                    <div className="podiumRank">
                      {index + 1}-o‘rin
                    </div>

                    <strong>
                      {
                        item.userName
                      }
                    </strong>

                    <div className="podiumNumbers">
                      <span>
                        <b>
                          {
                            item.correct
                          }
                        </b>{" "}
                        to‘g‘ri
                      </span>

                      <span>
                        <b>
                          {
                            item.accuracy
                          }
                          %
                        </b>{" "}
                        aniqlik
                      </span>
                    </div>
                  </article>
                )
              )}
            </div>
          </section>
        )}

        <section className="controlDeck">
          <div className="filterRow">
            <div className="searchGroup">
              <svg
                className="searchSvg"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="6.5" />
                <path d="M16 16l4 4" />
              </svg>

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
                placeholder="Foydalanuvchi ismi yoki ID bo‘yicha qidirish..."
              />

              {search && (
                <button
                  type="button"
                  className="clearSearch"
                  onClick={() =>
                    setSearch("")
                  }
                  aria-label="Qidiruvni tozalash"
                >
                  ×
                </button>
              )}
            </div>

            <select
              value={
                sortMode
              }
              onChange={(
                event
              ) =>
                setSortMode(
                  event.target
                    .value as SortMode
                )
              }
              className="sortSelect"
            >
              <option value="rank">
                Reyting tartibi
              </option>

              <option value="correct">
                To‘g‘ri javob bo‘yicha
              </option>

              <option value="accuracy">
                Aniqlik bo‘yicha
              </option>

              <option value="worked">
                Ishlangan savollar bo‘yicha
              </option>

              <option value="name">
                Ism A–Z
              </option>

              <option value="activity">
                Oxirgi faollik
              </option>
            </select>

            <div className="filterActions">
              <button
                type="button"
                className={
                  selectionMode
                    ? "selectModeButton activeSelectMode"
                    : "selectModeButton"
                }
                onClick={() => {
                  if (selectionMode) {
                    closeSelectionMode();
                  } else {
                    openSelectionMode();
                  }
                }}
              >
                <span
                  className={
                    selectionMode
                      ? "modernSelectIcon active"
                      : "modernSelectIcon"
                  }
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M5 12.5l4 4L19 7" />
                  </svg>
                </span>

                <span>
                  {selectionMode
                    ? `Tanlash rejimi (${selectedIds.size})`
                    : "Tanlash"}
                </span>
              </button>

              {(search ||
                sortMode !== "rank" ||
                showSelectedOnly) && (
                <button
                  type="button"
                  className="resetFilterButton"
                  onClick={resetFilters}
                >
                  Filtrlarni tozalash
                </button>
              )}
            </div>
          </div>

          {selectionMode && (
          <div className="selectionBar">
            <div className="selectionLeft">
              <label className="masterCheck">
                <input
                  type="checkbox"
                  checked={
                    allVisibleSelected
                  }
                  onChange={
                    toggleAllVisible
                  }
                  disabled={
                    visibleRanking.length ===
                    0
                  }
                />

                <span>
                  Ko‘rinib turganlarning barchasini tanlash
                </span>
              </label>

              <div className="selectedBadge">
                Tanlangan:{" "}
                <strong>
                  {
                    selectedIds.size
                  }
                </strong>
              </div>
            </div>

            <div className="selectionActions">
              <button
                type="button"
                className={
                  showSelectedOnly
                    ? "small3dButton activeSmall"
                    : "small3dButton"
                }
                disabled={
                  selectedIds.size ===
                  0
                }
                onClick={() =>
                  setShowSelectedOnly(
                    (value) =>
                      !value
                  )
                }
              >
                Faqat tanlanganlar
              </button>

              <button
                type="button"
                className="small3dButton"
                onClick={
                  closeSelectionMode
                }
              >
                Tanlashni yopish
              </button>

              <button
                type="button"
                className="bulkDeleteButton"
                disabled={
                  selectedIds.size ===
                    0 ||
                  deletingSelected
                }
                onClick={() =>
                  void deleteSelected()
                }
              >
                {deletingSelected
                  ? "O‘chirilmoqda..."
                  : `Tanlanganlarni o‘chirish (${selectedIds.size})`}
              </button>
            </div>
          </div>
          )}

          <div className="actionRow">
            <div className="periodInfo3d">
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
                    )} — ${formatDate(
                      periodEnd
                    )}`}
              </span>

              <span className="visibleCount">
                Ko‘rsatilmoqda:{" "}
                <strong>
                  {
                    visibleRanking.length
                  }
                </strong>{" "}
                ta
              </span>
            </div>

            <div className="toolButtons">
              <button
                type="button"
                className="blueTool"
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
                className="pdfTool"
                onClick={
                  exportPdf
                }
              >
                PDF olish
                {selectedIds.size
                  ? ` (${selectedIds.size})`
                  : ""}
              </button>

              <button
                type="button"
                className="csvTool"
                onClick={
                  exportCsv
                }
              >
                CSV olish
                {selectedIds.size
                  ? ` (${selectedIds.size})`
                  : ""}
              </button>

              <button
                type="button"
                className="dangerTool"
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
        </section>

        {error && (
          <div className="errorBox">
            <strong>
              Xatolik:
            </strong>{" "}
            {error}
          </div>
        )}

        <div className="tableShell3d">
          <div className="tableTopBar">
            <div>
              <strong>
                Foydalanuvchilar reytingi
              </strong>
            </div>

            <div className="tableCount">
              {
                visibleRanking.length
              }{" "}
              ta
            </div>
          </div>

          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  {selectionMode && (
                    <th className="checkColumn">
                      <input
                        type="checkbox"
                        checked={
                          allVisibleSelected
                        }
                        onChange={
                          toggleAllVisible
                        }
                        disabled={
                          visibleRanking.length ===
                          0
                        }
                        aria-label="Barchasini tanlash"
                      />
                    </th>
                  )}

                  <th>
                    O‘rin
                  </th>
                  <th>
                    Foydalanuvchi
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
                    (item) => {
                      const selected =
                        selectedIds.has(
                          item.userId
                        );

                      return (
                        <tr
                          key={
                            item.userId
                          }
                          className={[
                            selected
                              ? "selectedRow"
                              : "",
                            selectionMode
                              ? "selectionReadyRow"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() => {
                            if (selectionMode) {
                              toggleUser(
                                item.userId
                              );
                            }
                          }}
                        >
                          {selectionMode && (
                            <td className="checkColumn">
                              <input
                                type="checkbox"
                                checked={
                                  selected
                                }
                                onChange={() =>
                                  toggleUser(
                                    item.userId
                                  )
                                }
                                onClick={(event) =>
                                  event.stopPropagation()
                                }
                                aria-label={`${item.userName}ni tanlash`}
                              />
                            </td>
                          )}

                          <td>
                            <span className={`rankBadge rank${Math.min(item.rank, 4)}`}>
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

                          </td>

                          <td>
                            <span className="metricChip">
                              {
                                item.workedQuestions
                              }
                            </span>
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
                            <div className="accuracyCell">
                              <strong>
                                {
                                  item.accuracy
                                }
                                %
                              </strong>

                              <div className="accuracyTrack">
                                <div
                                  className="accuracyBar"
                                  style={{
                                    width:
                                      `${Math.max(
                                        0,
                                        Math.min(
                                          100,
                                          item.accuracy
                                        )
                                      )}%`,
                                  }}
                                />
                              </div>
                            </div>
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
                            <strong>
                              {
                                item.earnedPoints
                              }
                            </strong>
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
                              onClick={(event) => {
                                event.stopPropagation();
                                void deleteUser(
                                  item
                                );
                              }}
                            >
                              {deletingUserId ===
                              item.userId
                                ? "..."
                                : "O‘chirish"}
                            </button>
                          </td>
                        </tr>
                      );
                    }
                  )}

                {!loading &&
                  visibleRanking.length ===
                    0 && (
                    <tr>
                      <td
                        colSpan={
                          selectionMode
                            ? 12
                            : 11
                        }
                      >
                        <div className="emptyState">
                          <div className="emptyIcon">
                            ⌕
                          </div>

                          <strong>
                            Natija topilmadi
                          </strong>

                          <span>
                            Qidiruv yoki filtrni o‘zgartirib ko‘ring.
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}

                {loading && (
                  <tr>
                    <td
                      colSpan={
                        selectionMode
                          ? 12
                          : 11
                      }
                    >
                      <div className="emptyState">
                        <div className="loader3d" />

                        <strong>
                          Reyting yuklanmoqda...
                        </strong>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rankingRule3d">
          <div className="ruleIcon">
            i
          </div>

          <div>
            <strong>
              Reyting hisoblash tartibi
            </strong>

            <p>
              Avval to‘g‘ri javoblar soni, keyin aniqlik foizi, undan keyin ishlangan noyob savollar soni hisobga olinadi. Bir xil savol tanlangan davr ichida qayta ishlansa, reytingga bir marta hisoblanadi.
            </p>
          </div>
        </div>
      </section>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          padding: 34px 24px 56px;
          background:
            linear-gradient(180deg, #eef9ff 0%, #f8fbfd 38%, #eaf3f7 100%);
          color: #0d2f43;
          font-family: Arial, Helvetica, sans-serif;
        }

        .pageGlow {
          position: absolute;
          pointer-events: none;
          border-radius: 999px;
          filter: blur(1px);
          opacity: 0.32;
        }

        .pageGlowOne {
          width: 430px;
          height: 430px;
          top: -170px;
          right: -100px;
          background: radial-gradient(circle, #88ddff 0%, transparent 70%);
        }

        .pageGlowTwo {
          width: 360px;
          height: 360px;
          bottom: -180px;
          left: -120px;
          background: radial-gradient(circle, #ffe88a 0%, transparent 70%);
        }

        .hero3d,
        .mainPanel3d {
          position: relative;
          z-index: 1;
          width: min(1760px, 100%);
          max-width: 1760px;
          margin-left: auto;
          margin-right: auto;
        }

        .hero3d {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 32px;
          padding: 20px 22px;
          border: 2px solid #6b8797;
          border-radius: 20px;
          background:
            linear-gradient(180deg, #ffffff 0%, #edf2f5 55%, #dce5ea 100%);
          box-shadow:
            inset 0 2px 0 #ffffff,
            inset 0 -2px 0 rgba(73, 101, 116, 0.18),
            0 8px 0 #163e52,
            0 16px 28px rgba(16, 54, 73, 0.18);
        }

        .heroTitleWrap {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }

        .trophyBox {
          display: grid;
          place-items: center;
          width: 78px;
          height: 70px;
          flex: 0 0 auto;
          border: 2px solid #ba8200;
          border-radius: 16px;
          background:
            linear-gradient(180deg, #fff7c8 0%, #ffd96a 52%, #e9ad22 100%);
          box-shadow:
            inset 0 2px 0 #fffde9,
            inset 0 -3px 0 rgba(129, 82, 0, 0.2),
            0 5px 0 #9c6c00;
          font-size: 33px;
        }

        .heroTitleWrap h1 {
          margin: 0;
          font-size: clamp(30px, 3vw, 44px);
          line-height: 1;
          color: #082b40;
          text-shadow: 0 1px 0 #fff;
        }

        .heroTitleWrap p {
          margin: 7px 0 0;
          color: #55707f;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 17px;
          font-weight: 700;
        }

        .headerButtons,
        .toolButtons,
        .selectionActions {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
        }

        button,
        input,
        select {
          font: inherit;
        }

        button {
          -webkit-tap-highlight-color: transparent;
        }

        .silverButton,
        .toolButtons button,
        .small3dButton,
        .bulkDeleteButton {
          min-height: 48px;
          border: 1px solid #71848e;
          border-radius: 12px;
          padding: 11px 17px;
          background:
            linear-gradient(180deg, #ffffff 0%, #eef2f4 50%, #cbd6dc 100%);
          color: #0c3145;
          font-weight: 900;
          cursor: pointer;
          box-shadow:
            inset 0 1px 0 #fff,
            0 4px 0 #70838d;
          transition:
            transform 120ms ease,
            filter 120ms ease;
        }

        @media (hover: hover) and (pointer: fine) {
          .silverButton:hover,
          .toolButtons button:hover,
          .small3dButton:hover,
          .bulkDeleteButton:hover,
          .periodButton:hover,
          .deleteUserButton:hover {
            filter: brightness(1.035);
          }
        }

        .silverButton:active,
        .toolButtons button:active,
        .small3dButton:active,
        .bulkDeleteButton:active,
        .periodButton:active,
        .deleteUserButton:active {
          transform: translateY(3px);
          box-shadow: 0 1px 0 #70838d;
        }

        .mainPanel3d {
          padding: 48px 22px 30px;
          border: 2px solid #8399a6;
          border-radius: 23px;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.98), rgba(247,251,253,0.98));
          box-shadow:
            inset 0 2px 0 #ffffff,
            inset 0 -2px 0 rgba(38, 75, 95, 0.08),
            0 8px 0 #244b60,
            0 16px 34px rgba(14, 55, 76, 0.14);
        }

        .floating3dLabel {
          position: absolute;
          top: -24px;
          left: 28px;
          padding: 11px 27px;
          border: 2px solid #1a6c92;
          border-radius: 14px;
          background:
            linear-gradient(180deg, #e7faff 0%, #83d5f3 50%, #38a8d4 100%);
          color: #0b3449;
          box-shadow:
            inset 0 2px 0 #f8feff,
            0 5px 0 #175b7a;
          font-size: 23px;
          font-weight: 900;
        }

        .periodTabs {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }

        .periodButton {
          min-height: 78px;
          border: 1px solid #7f909a;
          border-radius: 14px;
          background:
            linear-gradient(180deg, #ffffff 0%, #f2f5f7 52%, #d5dee3 100%);
          color: #16384a;
          font-weight: 900;
          cursor: pointer;
          box-shadow:
            inset 0 2px 0 #fff,
            0 5px 0 #71838d;
        }

        .periodButton.active {
          border-color: #a97800;
          background:
            linear-gradient(180deg, #fff9d8 0%, #ffe480 52%, #efb829 100%);
          color: #281b00;
          box-shadow:
            inset 0 2px 0 #fffdeb,
            0 5px 0 #9e7000;
        }

        .statsGrid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 22px;
        }

        .stat3d {
          display: flex;
          align-items: center;
          gap: 13px;
          min-width: 0;
          min-height: 92px;
          padding: 17px;
          border: 1px solid #aab8c0;
          border-radius: 16px;
          background:
            linear-gradient(180deg, #ffffff 0%, #f4f7f8 55%, #e3eaee 100%);
          box-shadow:
            inset 0 1px 0 #ffffff,
            0 5px 0 #b5c1c7,
            0 9px 18px rgba(28, 63, 80, 0.08);
        }

        .statIcon {
          display: grid;
          place-items: center;
          width: 56px;
          height: 56px;
          flex: 0 0 auto;
          border: 1px solid #83a2b4;
          border-radius: 13px;
          background:
            linear-gradient(180deg, #f2fbff, #b9e5f6);
          color: #176887;
          box-shadow:
            inset 0 1px 0 #fff,
            0 3px 0 #83a9ba;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 23px;
          font-weight: 900;
        }

        .greenStat .statIcon {
          border-color: #70a47a;
          background:
            linear-gradient(180deg, #f4fff5, #bde9c4);
          color: #157b2f;
          box-shadow:
            inset 0 1px 0 #fff,
            0 3px 0 #77a981;
        }

        .redStat .statIcon {
          border-color: #bc7b7b;
          background:
            linear-gradient(180deg, #fff8f8, #f2bcbc);
          color: #bd2424;
          box-shadow:
            inset 0 1px 0 #fff,
            0 3px 0 #bd8585;
        }

        .stat3d span {
          display: block;
          margin-bottom: 4px;
          color: #607684;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 13px;
          font-weight: 700;
        }

        .stat3d strong {
          display: block;
          font-size: 32px;
          line-height: 1;
          color: #0c3247;
        }

        .greenStat strong {
          color: #137f36;
        }

        .redStat strong {
          color: #c02d2d;
        }

        .podiumSection {
          margin-bottom: 20px;
          padding: 18px;
          border: 1px solid #c4d0d6;
          border-radius: 17px;
          background:
            linear-gradient(180deg, #fbfdfe, #eef5f8);
          box-shadow:
            inset 0 1px 0 #fff,
            0 4px 0 #cad5da;
        }

        .sectionTitleRow,
        .tableTopBar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }

        .sectionTitleRow {
          margin-bottom: 12px;
        }

        .sectionTitleRow h2 {
          margin: 0;
          font-size: 19px;
        }

        .sectionTitleRow span {
          padding: 5px 9px;
          border-radius: 999px;
          background: #e6eef2;
          color: #5d7481;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 11px;
          font-weight: 800;
        }

        .topThree {
          display: grid;
          grid-template-columns:
            repeat(auto-fit, minmax(320px, 1fr));
          gap: 14px;
        }

        .topCard {
          position: relative;
          min-width: 0;
          min-height: 145px;
          padding: 22px 22px 19px 84px;
          border: 1px solid #b8a15c;
          border-radius: 16px;
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,0.65),
            0 5px 0 rgba(89, 71, 20, 0.35);
        }

        .top1 {
          background:
            linear-gradient(135deg, #fff9d7 0%, #ffe89a 48%, #f2c441 100%);
        }

        .top2 {
          border-color: #9eaab1;
          background:
            linear-gradient(135deg, #ffffff 0%, #e6ecef 48%, #c4ced4 100%);
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,0.85),
            0 5px 0 #9ba8af;
        }

        .top3 {
          border-color: #b78968;
          background:
            linear-gradient(135deg, #fff8f0 0%, #edc6a6 50%, #ca8a5c 100%);
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,0.7),
            0 5px 0 #a56e49;
        }

        .medal {
          position: absolute;
          left: 20px;
          top: 24px;
          display: grid;
          place-items: center;
          width: 51px;
          height: 51px;
          border-radius: 50%;
          background: rgba(255,255,255,0.62);
          box-shadow:
            inset 0 1px 0 #fff,
            0 3px 8px rgba(0,0,0,0.12);
          font-size: 27px;
        }

        .podiumRank {
          margin-bottom: 5px;
          color: #7a5b00;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .topCard strong {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 10px;
          font-size: 21px;
          white-space: nowrap;
        }

        .podiumNumbers {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .podiumNumbers span {
          padding: 5px 8px;
          border-radius: 8px;
          background: rgba(255,255,255,0.55);
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12px;
        }

        .controlDeck {
          margin-bottom: 18px;
          padding: 17px;
          border: 1px solid #aebdc5;
          border-radius: 17px;
          background:
            linear-gradient(180deg, #fafdff, #edf4f7);
          box-shadow:
            inset 0 1px 0 #fff,
            0 5px 0 #becbd1;
        }

        .filterRow,
        .selectionBar,
        .actionRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .filterRow {
          margin-bottom: 12px;
        }

        .searchGroup {
          position: relative;
          flex: 1 1 520px;
          min-width: 260px;
        }

        .searchSvg {
          position: absolute;
          top: 50%;
          left: 17px;
          z-index: 2;
          width: 21px;
          height: 21px;
          transform: translateY(-50%);
          fill: none;
          stroke: #466575;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
          pointer-events: none;
        }

        .searchGroup input,
        .sortSelect {
          min-height: 52px;
          border: 1px solid #8399a5;
          border-radius: 11px;
          background:
            linear-gradient(180deg, #ffffff, #f4f8fa);
          color: #14384b;
          outline: none;
          box-shadow:
            inset 0 2px 5px rgba(25, 57, 72, 0.08),
            0 2px 0 #c1ccd2;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 17px;
          font-weight: 600;
        }

        .searchGroup input {
          width: 100%;
          padding: 10px 44px 10px 50px;
        }

        .sortSelect {
          flex: 0 0 280px;
          padding: 9px 12px;
          cursor: pointer;
        }

        .searchGroup input:focus,
        .sortSelect:focus {
          border-color: #2388b3;
          box-shadow:
            0 0 0 3px rgba(35,136,179,0.13),
            inset 0 2px 5px rgba(25, 57, 72, 0.08);
        }

        .clearSearch {
          position: absolute;
          top: 7px;
          right: 7px;
          width: 31px;
          height: 31px;
          border: 0;
          border-radius: 8px;
          background: #dfe8ed;
          color: #375565;
          cursor: pointer;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 23px;
          font-weight: 900;
        }

        .selectionBar {
          min-height: 66px;
          margin-bottom: 14px;
          padding: 12px 14px;
          border: 1px solid #bdcbd2;
          border-radius: 13px;
          background:
            linear-gradient(180deg, #ffffff, #f1f6f8);
        }

        .selectionLeft {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 11px;
          min-width: 0;
        }

        .masterCheck {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #294a5b;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }

        input[type="checkbox"] {
          width: 18px;
          height: 18px;
          accent-color: #167ba7;
          cursor: pointer;
        }

        .selectedBadge,
        .tableCount {
          border: 1px solid #bda15a;
          border-radius: 999px;
          padding: 6px 10px;
          background:
            linear-gradient(180deg, #fff8d9, #f2d778);
          color: #5e4500;
          box-shadow: inset 0 1px 0 #fff;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 11px;
          font-weight: 800;
        }

        .small3dButton {
          min-height: 40px;
          padding: 8px 12px;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12px;
        }

        .activeSmall {
          border-color: #27799a;
          background:
            linear-gradient(180deg, #e9faff, #9bd9ef);
          box-shadow:
            inset 0 1px 0 #fff,
            0 4px 0 #5f9eb7;
        }

        .bulkDeleteButton {
          min-height: 40px;
          padding: 8px 13px;
          border-color: #a12d2d;
          background:
            linear-gradient(180deg, #fff0f0, #efabab);
          color: #8a1515;
          box-shadow:
            inset 0 1px 0 #fff,
            0 4px 0 #a76262;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12px;
        }

        .actionRow {
          align-items: stretch;
        }

        .periodInfo3d {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 7px 13px;
          flex: 1 1 380px;
          min-width: 0;
          padding: 9px 12px;
          border-left: 5px solid #ddb329;
          border-radius: 9px;
          background: #fffbea;
          box-shadow: inset 0 1px 3px rgba(86, 66, 0, 0.06);
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12px;
        }

        .periodInfo3d strong {
          color: #0c3348;
          font-size: 13px;
        }

        .periodInfo3d span,
        .periodInfo3d small {
          color: #60717a;
        }

        .toolButtons {
          justify-content: flex-end;
        }

        .toolButtons button {
          min-height: 47px;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 13px;
        }

        .blueTool {
          background:
            linear-gradient(180deg, #effbff, #9ddcf3) !important;
          box-shadow:
            inset 0 1px 0 #fff,
            0 4px 0 #629db5 !important;
        }

        .pdfTool {
          border-color: #a76262 !important;
          background:
            linear-gradient(180deg, #fff3f3, #f2aaaa) !important;
          color: #7f2020 !important;
          box-shadow:
            inset 0 1px 0 #fff,
            0 4px 0 #ad7070 !important;
        }

        .csvTool {
          border-color: #65996f !important;
          background:
            linear-gradient(180deg, #f2fff4, #aee1b7) !important;
          color: #185d29 !important;
          box-shadow:
            inset 0 1px 0 #fff,
            0 4px 0 #76a881 !important;
        }

        .dangerTool {
          border-color: #8f1515 !important;
          background:
            linear-gradient(180deg, #f15b5b, #bd1010) !important;
          color: #ffffff !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.45),
            0 4px 0 #761010 !important;
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          filter: grayscale(0.15);
        }

        .errorBox {
          margin-bottom: 14px;
          padding: 12px 14px;
          border: 1px solid #c54949;
          border-radius: 12px;
          background:
            linear-gradient(180deg, #fff8f8, #ffe8e8);
          color: #8d1c1c;
          box-shadow:
            inset 0 1px 0 #fff,
            0 3px 0 #d4a2a2;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 13px;
        }

        .tableShell3d {
          overflow: hidden;
          border: 1px solid #7391a1;
          border-radius: 17px;
          background: #ffffff;
          box-shadow:
            inset 0 1px 0 #fff,
            0 6px 0 #8aa1ad,
            0 12px 24px rgba(21, 59, 78, 0.1);
        }

        .tableTopBar {
          padding: 15px 16px;
          background:
            linear-gradient(180deg, #f9fdff, #e7f1f5);
          border-bottom: 1px solid #b9c8d0;
        }

        .tableTopBar > div:first-child {
          min-width: 0;
        }

        .tableTopBar strong,

        .tableTopBar strong {
          margin-bottom: 3px;
          font-size: 17px;
        }

        .tableWrap {
          overflow-x: auto;
          max-width: 100%;
        }

        table {
          width: 100%;
          min-width: 1380px;
          border-collapse: collapse;
          background: #fff;
        }

        th,
        td {
          padding: 14px 11px;
          border-bottom: 1px solid #d8e1e6;
          text-align: center;
          vertical-align: middle;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 13px;
        }

        th {
          position: sticky;
          top: 0;
          z-index: 3;
          background:
            linear-gradient(180deg, #2f708f 0%, #174760 55%, #10384d 100%);
          color: #ffffff;
          text-shadow: 0 1px 0 rgba(0,0,0,0.25);
          font-size: 12px;
          font-weight: 900;
        }

        tbody tr {
          transition:
            background 120ms ease,
            box-shadow 120ms ease;
        }

        @media (hover: hover) and (pointer: fine) {
          tbody tr:hover {
            background: #f0f9fd;
          }
        }

        tbody tr.selectedRow {
          background:
            linear-gradient(90deg, #fff9d9, #fffdf1);
          box-shadow:
            inset 4px 0 0 #d3a51d;
        }

        .checkColumn {
          width: 46px;
          min-width: 46px;
        }

        .rankBadge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 42px;
          padding: 6px 8px;
          border: 1px solid #b7c4cb;
          border-radius: 999px;
          background:
            linear-gradient(180deg, #ffffff, #e6edf1);
          box-shadow:
            inset 0 1px 0 #fff,
            0 2px 0 #b7c3ca;
          color: #27495a;
          font-weight: 900;
        }

        .rank1 {
          border-color: #bb901d;
          background:
            linear-gradient(180deg, #fff9d3, #f1c84f);
          color: #6a4b00;
        }

        .rank2 {
          border-color: #9aa8af;
          background:
            linear-gradient(180deg, #ffffff, #d8e0e4);
        }

        .rank3 {
          border-color: #bb8f6e;
          background:
            linear-gradient(180deg, #fff8f0, #ddb08c);
          color: #6e3f21;
        }

        .studentCell {
          min-width: 255px;
          max-width: 330px;
          text-align: left;
        }

        .studentCell strong,

        .studentCell strong {
          color: #0a3349;
          font-family:
            "Bell MT",
            Georgia,
            serif;
          font-size: 16px;
        }

        .metricChip {
          display: inline-flex;
          min-width: 36px;
          justify-content: center;
          padding: 5px 7px;
          border-radius: 7px;
          background: #edf3f6;
          color: #294e60;
          font-weight: 900;
        }

        .correctValue {
          color: #13853b;
          font-size: 16px;
          font-weight: 900;
        }

        .incorrectValue {
          color: #c02e2e;
          font-size: 16px;
          font-weight: 900;
        }

        .accuracyCell {
          min-width: 128px;
        }

        .accuracyCell strong {
          display: block;
          margin-bottom: 5px;
          color: #143d52;
        }

        .accuracyTrack {
          height: 6px;
          overflow: hidden;
          border-radius: 999px;
          background: #dce5ea;
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.11);
        }

        .accuracyBar {
          height: 100%;
          border-radius: inherit;
          background:
            linear-gradient(90deg, #3aa8d3, #1d779d);
        }

        .dateCell {
          min-width: 155px;
          white-space: nowrap;
          color: #455f6d;
          font-size: 12px;
        }

        .deleteUserButton {
          min-height: 39px;
          border: 1px solid #b14a4a;
          border-radius: 9px;
          padding: 7px 10px;
          background:
            linear-gradient(180deg, #fff5f5, #efb0b0);
          color: #8d1717;
          box-shadow:
            inset 0 1px 0 #fff,
            0 3px 0 #b76c6c;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .emptyState {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 42px 16px;
          color: #647a86;
        }

        .emptyState strong {
          color: #294c5e;
          font-size: 16px;
        }

        .emptyState span {
          font-size: 12px;
        }

        .emptyIcon {
          display: grid;
          place-items: center;
          width: 56px;
          height: 56px;
          border-radius: 14px;
          background: #edf4f7;
          font-size: 27px;
        }

        .loader3d {
          width: 36px;
          height: 36px;
          border: 4px solid #d5e3e9;
          border-top-color: #1d789e;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .rankingRule3d {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-top: 18px;
          padding: 13px 14px;
          border: 1px solid #a9c4d2;
          border-radius: 14px;
          background:
            linear-gradient(180deg, #f2fbff, #e6f3f9);
          box-shadow:
            inset 0 1px 0 #fff,
            0 4px 0 #b4cbd6;
        }

        .ruleIcon {
          display: grid;
          place-items: center;
          width: 31px;
          height: 31px;
          flex: 0 0 auto;
          border-radius: 50%;
          background:
            linear-gradient(180deg, #65c9ef, #268bb3);
          color: #fff;
          box-shadow: 0 3px 0 #1b6684;
          font-family: Arial, Helvetica, sans-serif;
          font-weight: 900;
        }

        .rankingRule3d strong {
          display: block;
          margin-bottom: 3px;
          font-size: 13px;
        }

        .rankingRule3d p {
          margin: 0;
          color: #526d7b;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 11px;
          line-height: 1.55;
        }


        @media (max-width: 1250px) {
          .filterActions {
            width: 100%;
          }

          .filterActions button {
            flex: 1 1 auto;
          }
        }

        @media (max-width: 1250px) {
          .hero3d,
          .filterRow,
          .selectionBar,
          .actionRow {
            align-items: stretch;
            flex-direction: column;
          }

          .headerButtons,
          .selectionActions,
          .toolButtons {
            justify-content: stretch;
          }

          .headerButtons button,
          .selectionActions button,
          .toolButtons button {
            flex: 1 1 auto;
          }

          .sortSelect {
            flex-basis: auto;
            width: 100%;
          }

          .statsGrid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .topThree {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 670px) {
          .page {
            padding: 18px 10px 36px;
          }

          .hero3d {
            padding: 12px;
            border-radius: 15px;
          }

          .heroTitleWrap {
            align-items: flex-start;
          }

          .trophyBox {
            width: 52px;
            height: 49px;
            border-radius: 12px;
            font-size: 21px;
          }

          .heroTitleWrap h1 {
            font-size: 27px;
          }

          .heroTitleWrap p {
            font-size: 11px;
          }

          .headerButtons,
          .filterActions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .mainPanel3d {
            padding: 38px 9px 18px;
            border-radius: 17px;
          }

          .floating3dLabel {
            left: 14px;
            padding: 9px 15px;
            font-size: 17px;
          }

          .periodTabs,
          .statsGrid {
            grid-template-columns: 1fr;
          }

          .selectionLeft,
          .selectionActions,
          .toolButtons {
            width: 100%;
          }

          .selectionActions,
          .toolButtons {
            display: grid;
            grid-template-columns: 1fr;
          }

          .selectionActions button,
          .toolButtons button {
            width: 100%;
          }

          .sectionTitleRow,
          .tableTopBar {
            align-items: flex-start;
            flex-direction: column;
          }

          .topCard {
            padding-left: 68px;
          }
        }



        /* =====================================================
           BIR XIL YOZUV + NAVIGATSIYA RANGLARI
        ===================================================== */

        .page,
        .page * {
          font-family: "Times New Roman", Times, serif !important;
        }

        .heroTitleWrap h1,
        .floating3dLabel,
        .topCard strong,
        .studentCell strong,
        .tableTopBar strong {
          letter-spacing: 0;
        }

        .resultsNav {
          border-color: #2f82aa !important;
          background:
            linear-gradient(180deg, #f0fbff 0%, #9edcf3 52%, #56b7dc 100%) !important;
          color: #082f43 !important;
          box-shadow:
            inset 0 1px 0 #ffffff,
            0 4px 0 #367f9e !important;
        }

        .adminNav {
          border-color: #a97d17 !important;
          background:
            linear-gradient(180deg, #fff9d5 0%, #f4d36d 52%, #e5ad2e 100%) !important;
          color: #302100 !important;
          box-shadow:
            inset 0 1px 0 #fffef0,
            0 4px 0 #98701a !important;
        }

        .homeNav {
          border-color: #4d8b5a !important;
          background:
            linear-gradient(180deg, #f3fff5 0%, #aee1b8 52%, #69bc7a 100%) !important;
          color: #123d1c !important;
          box-shadow:
            inset 0 1px 0 #ffffff,
            0 4px 0 #4d8558 !important;
        }

        .filterRow {
          align-items: stretch;
        }

        .filterActions {
          display: flex;
          flex: 0 0 auto;
          align-items: stretch;
          gap: 9px;
        }

        .selectModeButton,
        .resetFilterButton {
          min-height: 52px;
          border: 1px solid #6d8796;
          border-radius: 11px;
          padding: 10px 15px;
          color: #14394b;
          font-weight: 900;
          cursor: pointer;
          box-shadow:
            inset 0 1px 0 #ffffff,
            0 4px 0 #79909c;
        }

        .selectModeButton {
          background:
            linear-gradient(180deg, #f4fcff 0%, #a9ddf0 52%, #72bdd9 100%);
        }

        .activeSelectMode {
          border-color: #9b730d;
          background:
            linear-gradient(180deg, #fff9d4 0%, #f4d36d 52%, #e6af2f 100%);
          color: #3d2a00;
          box-shadow:
            inset 0 1px 0 #fffef0,
            0 4px 0 #947019;
        }

        .resetFilterButton {
          background:
            linear-gradient(180deg, #ffffff 0%, #e7ecef 52%, #cfd9de 100%);
        }

        .selectionBar {
          animation: selectionOpen 160ms ease-out;
        }

        @keyframes selectionOpen {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .dangerTool {
          color: #111111 !important;
          text-shadow: none !important;
        }

        .visibleCount {
          color: #405f70 !important;
        }

        .tableTopBar > div:first-child {
          display: flex;
          align-items: center;
          min-height: 32px;
        }

        .studentCell strong {
          margin: 0;
        }


        /* =====================================================
           SAYT USLUBIGA MOS QIDIRUV + ZAMONAVIY TANLASH
        ===================================================== */

        @media (min-width: 1101px) {
          .filterRow {
            display: grid;
            grid-template-columns:
              minmax(0, 1fr)
              285px
              auto;
            align-items: stretch;
            gap: 12px;
          }
        }

        .searchGroup {
          min-width: 0;
        }

        .searchGroup input,
        .sortSelect,
        .selectModeButton,
        .resetFilterButton {
          min-height: 54px;
          font-size: 16px;
        }

        .searchGroup input {
          border: 2px solid #7b8991;
          border-radius: 10px;
          background:
            linear-gradient(180deg, #ffffff 0%, #fbfbfb 58%, #f0f0f0 100%);
          color: #111111;
          box-shadow:
            inset 0 1px 0 #ffffff,
            inset 0 2px 5px rgba(0, 0, 0, 0.06),
            0 3px 0 #a4adb2;
        }

        .searchGroup input:focus {
          border-color: #1f84af;
          box-shadow:
            0 0 0 3px rgba(31, 132, 175, 0.12),
            inset 0 2px 5px rgba(0, 0, 0, 0.05),
            0 3px 0 #6fa6bd;
        }

        .searchGroup input::placeholder {
          color: #616b70;
          font-style: normal;
        }

        .clearSearch {
          top: 9px;
          right: 9px;
          width: 34px;
          height: 34px;
          border: 1px solid #a8b1b6;
          border-radius: 8px;
          background:
            linear-gradient(180deg, #ffffff, #dfe5e8);
          color: #263d49;
          box-shadow:
            inset 0 1px 0 #ffffff,
            0 2px 0 #a5afb4;
        }

        .sortSelect {
          border: 2px solid #7b8991;
          border-radius: 10px;
          background-color: #ffffff;
          color: #111111;
          box-shadow:
            inset 0 1px 0 #ffffff,
            0 3px 0 #a4adb2;
          font-weight: 700;
        }

        .selectModeButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          min-width: 132px;
          border: 2px solid #367e9d;
          border-radius: 10px;
          background:
            linear-gradient(180deg, #eafaff 0%, #8fd1ec 55%, #54abd0 100%);
          color: #082f43;
          box-shadow:
            inset 0 1px 0 #ffffff,
            0 4px 0 #347a98;
        }

        .modernSelectIcon {
          display: inline-grid;
          place-items: center;
          width: 24px;
          height: 24px;
          flex: 0 0 24px;
          border: 2px solid #2e708e;
          border-radius: 7px;
          background:
            linear-gradient(180deg, #ffffff, #d8eef7);
          box-shadow:
            inset 0 1px 0 #ffffff,
            0 1px 0 rgba(0, 0, 0, 0.09);
        }

        .modernSelectIcon svg {
          width: 16px;
          height: 16px;
          fill: none;
          stroke: #1d6685;
          stroke-width: 3;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .modernSelectIcon.active {
          border-color: #8c6600;
          background:
            linear-gradient(180deg, #fff9d8, #e9bd39);
        }

        .modernSelectIcon.active svg {
          stroke: #4e3900;
        }

        /* Native checkbox o‘rniga saytdagi 3D uslubga mos zamonaviy belgi */
        input[type="checkbox"] {
          appearance: none;
          -webkit-appearance: none;
          display: inline-grid;
          place-content: center;
          width: 21px;
          height: 21px;
          margin: 0;
          border: 2px solid #718995;
          border-radius: 6px;
          background:
            linear-gradient(180deg, #ffffff, #e9eef1);
          box-shadow:
            inset 0 1px 0 #ffffff,
            0 2px 0 #aab6bc;
          cursor: pointer;
          transition:
            transform 120ms ease,
            border-color 120ms ease,
            background 120ms ease;
        }

        input[type="checkbox"]::before {
          content: "";
          width: 10px;
          height: 6px;
          border-left: 3px solid #ffffff;
          border-bottom: 3px solid #ffffff;
          transform:
            rotate(-45deg)
            scale(0);
          transform-origin: center;
          transition: transform 120ms ease;
        }

        input[type="checkbox"]:checked {
          border-color: #1e789e;
          background:
            linear-gradient(180deg, #63c9ed, #278eb7);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.6),
            0 2px 0 #1e6887;
        }

        input[type="checkbox"]:checked::before {
          transform:
            rotate(-45deg)
            scale(1);
        }

        input[type="checkbox"]:focus-visible {
          outline: 3px solid rgba(37, 137, 178, 0.2);
          outline-offset: 2px;
        }

        .selectionReadyRow {
          cursor: pointer;
        }

        .selectionReadyRow td {
          user-select: none;
        }

        .selectionReadyRow:not(.selectedRow):hover {
          background: #f2f9fc !important;
        }

        .selectedRow {
          background:
            linear-gradient(90deg, #fff8cf, #fffdf0) !important;
        }

        .filterActions {
          align-items: stretch;
        }

        .resetFilterButton {
          border: 2px solid #87949b;
          background:
            linear-gradient(180deg, #ffffff, #dde4e8);
          color: #1a303b;
          box-shadow:
            inset 0 1px 0 #ffffff,
            0 4px 0 #89979e;
        }

        @media (max-width: 1100px) {
          .filterRow {
            display: flex;
            flex-direction: column;
            align-items: stretch;
          }

          .sortSelect {
            width: 100%;
            flex-basis: auto;
          }

          .filterActions {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 620px) {
          .filterActions {
            grid-template-columns: 1fr;
          }

          .selectModeButton,
          .resetFilterButton {
            width: 100%;
          }
        }

        /* =====================================================
           FINAL VISUAL TUNING
           Katta ekranlarda matn mayda ko‘rinib qolmasligi uchun.
        ===================================================== */

        .hero3d,
        .mainPanel3d {
          box-sizing: border-box;
        }

        .headerButtons .silverButton {
          font-family: "Times New Roman", Times, serif;
          font-size: 15px;
        }

        .periodButton {
          font-size: 18px;
        }

        .topCard:only-child {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: 54px minmax(180px, 1fr) auto;
          grid-template-areas:
            "medal rank numbers"
            "medal name numbers";
          align-items: center;
          column-gap: 16px;
          min-height: 112px;
          padding: 20px 24px;
        }

        .topCard:only-child .medal {
          position: static;
          grid-area: medal;
        }

        .topCard:only-child .podiumRank {
          grid-area: rank;
          align-self: end;
          margin: 0 0 4px;
        }

        .topCard:only-child > strong {
          grid-area: name;
          align-self: start;
          margin: 0;
          font-size: 22px;
        }

        .topCard:only-child .podiumNumbers {
          grid-area: numbers;
          justify-content: flex-end;
        }

        .topCard:only-child .podiumNumbers span {
          padding: 8px 11px;
          font-size: 13px;
        }

        .controlDeck {
          padding-top: 18px;
          padding-bottom: 18px;
        }

        .searchGroup input::placeholder {
          color: #708591;
          opacity: 1;
        }

        .selectedBadge,
        .tableCount {
          font-size: 12px;
        }

        .tableShell3d {
          margin-top: 4px;
        }

        tbody tr:nth-child(even):not(.selectedRow) {
          background: #fbfdfe;
        }

        td {
          color: #1d4052;
        }

        .rankBadge {
          font-size: 12px;
        }

        .metricChip {
          font-size: 13px;
        }

        .accuracyCell strong {
          font-size: 13px;
        }

        .rankingRule3d {
          padding: 16px 17px;
        }

        .rankingRule3d strong {
          font-size: 15px;
        }

        .rankingRule3d p {
          font-size: 12px;
        }

        @media (min-width: 1500px) {
          .page {
            padding-left: 34px;
            padding-right: 34px;
          }

          .hero3d,
          .mainPanel3d {
            width: min(1760px, 96%);
          }
        }

        @media (max-width: 900px) {
          .topCard:only-child {
            display: block;
            min-height: 145px;
            padding: 20px 20px 18px 82px;
          }

          .topCard:only-child .medal {
            position: absolute;
            left: 20px;
            top: 24px;
          }

          .topCard:only-child > strong {
            display: block;
            margin-bottom: 10px;
          }

          .topCard:only-child .podiumNumbers {
            justify-content: flex-start;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            scroll-behavior: auto !important;
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.001ms !important;
          }
        }
      `}</style>
    </main>
  );
}
