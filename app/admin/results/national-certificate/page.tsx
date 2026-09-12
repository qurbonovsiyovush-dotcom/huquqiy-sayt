"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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


type CertificateLevel = "A+" | "A" | "B+" | "B" | "C+" | "C" | "—";

function getPercent(item: ResultItem) {
  const fromApi = Number(item.percentage);
  if (Number.isFinite(fromApi)) return fromApi;

  const total = Math.max(0, Number(item.total_questions) || 0);
  const correct = Math.max(0, Number(item.correct_count) || 0);
  return total > 0 ? (correct / total) * 100 : 0;
}

/*
  Daraja to‘g‘ridan-to‘g‘ri FOIZ natijasiga qarab beriladi.

  A+  — 70% va undan yuqori
  A   — 65% – 69.99%
  B+  — 60% – 64.99%
  B   — 55% – 59.99%
  C+  — 50% – 54.99%
  C   — 46% – 49.99%
  —   — 46% dan past

  Shu sabab "sertifikat balli" ham foiz natijasining o‘zi
  sifatida ishlatiladi; 75 ballik proporsional formula yo‘q.
*/
function getCertificateScore(item: ResultItem) {
  return Math.min(
    100,
    Math.max(
      0,
      getPercent(item)
    )
  );
}

function getCertificateLevel(score: number): CertificateLevel {
  if (score >= 70) return "A+";
  if (score >= 65) return "A";
  if (score >= 60) return "B+";
  if (score >= 55) return "B";
  if (score >= 50) return "C+";
  if (score >= 46) return "C";
  return "—";
}

function getsCertificate(score: number) {
  return score >= 46;
}

function normalizePdfText(value: string) {
  return String(value || "")
    .replace(/[‘’ʻʼ`´]/g, "'")
    .replace(/[–—]/g, "-");
}

function sortResults(items: ResultItem[]) {
  return [...items].sort((a, b) => {
    const scoreDiff = getCertificateScore(b) - getCertificateScore(a);
    if (Math.abs(scoreDiff) > 0.0001) return scoreDiff;
    if (b.correct_count !== a.correct_count) return b.correct_count - a.correct_count;
    if (a.incorrect_count !== b.incorrect_count) return a.incorrect_count - b.incorrect_count;
    return new Date(a.submitted_at || a.created_at).getTime() - new Date(b.submitted_at || b.created_at).getTime();
  });
}

function safeDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function NationalCertificateResultsPage() {
  const [results, setResults] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);

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

  const allRankedResults = useMemo(() => sortResults(results), [results]);

  const filteredResults = useMemo(() => {
    const query = search.trim().toLowerCase();

    const list = !query
      ? results
      : results.filter((item) => {
          const score = getCertificateScore(item);
          const level = getCertificateLevel(score);
          const certificateText = getsCertificate(score)
            ? "sertifikat oladi"
            : "sertifikat olmaydi";

          return [
            item.test_title,
            item.user_name || "",
            item.user_key,
            level,
            certificateText,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);
        });

    return sortResults(list);
  }, [results, search]);

  const stats = useMemo(() => {
    const certified = results.filter((item) =>
      getsCertificate(getCertificateScore(item))
    ).length;

    const notCertified = results.length - certified;

    const averageScore =
      results.length === 0
        ? 0
        : results.reduce(
            (sum, item) => sum + getCertificateScore(item),
            0
          ) / results.length;

    return {
      total: results.length,
      certified,
      notCertified,
      averageScore,
    };
  }, [results]);

  async function deleteOneResult(item: ResultItem) {
    const userName =
      item.user_name?.trim() ||
      "Noma'lum foydalanuvchi";

    const confirmed = window.confirm(
      `${userName} foydalanuvchisining "${item.test_title}" natijasini o'chirasizmi?\n\nBu amalni ortga qaytarib bo'lmaydi.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(item.id);

      const response = await fetch(
        `/api/national-certificate/admin/results?id=${encodeURIComponent(
          item.id
        )}`,
        {
          method: "DELETE",
          cache: "no-store",
        }
      );

      const data = await response.json().catch(() => ({
        success: false,
        message: "Server javobini o'qib bo'lmadi.",
      }));

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Natijani o'chirib bo'lmadi."
        );
      }

      setResults((current) =>
        current.filter(
          (result) => result.id !== item.id
        )
      );
    } catch (err) {
      window.alert(
        err instanceof Error
          ? err.message
          : "Natijani o'chirishda xatolik yuz berdi."
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function deleteAllResults() {
    if (results.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      `DIQQAT!\n\nBarcha ${results.length} ta Milliy sertifikat natijasini o'chirasizmi?\n\nBu amalni ortga qaytarib bo'lmaydi.`
    );

    if (!confirmed) {
      return;
    }

    const secondConfirm = window.confirm(
      "Oxirgi tasdiq: HAQIQATAN HAM barcha natijalarni o'chirmoqchimisiz?"
    );

    if (!secondConfirm) {
      return;
    }

    try {
      setDeletingAll(true);

      const response = await fetch(
        "/api/national-certificate/admin/results?all=1",
        {
          method: "DELETE",
          cache: "no-store",
        }
      );

      const data = await response.json().catch(() => ({
        success: false,
        message: "Server javobini o'qib bo'lmadi.",
      }));

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Barcha natijalarni o'chirib bo'lmadi."
        );
      }

      setResults([]);
    } catch (err) {
      window.alert(
        err instanceof Error
          ? err.message
          : "Natijalarni o'chirishda xatolik yuz berdi."
      );
    } finally {
      setDeletingAll(false);
    }
  }

  function exportPdf() {
    if (allRankedResults.length === 0) {
      window.alert("PDF uchun natija mavjud emas.");
      return;
    }

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const navy: [number, number, number] = [19, 75, 112];
    const blue: [number, number, number] = [44, 139, 190];
    const lightBlue: [number, number, number] = [233, 246, 253];
    const green: [number, number, number] = [38, 126, 76];
    const lightGreen: [number, number, number] = [232, 247, 237];
    const red: [number, number, number] = [178, 55, 55];
    const lightRed: [number, number, number] = [253, 235, 235];
    const gold: [number, number, number] = [181, 139, 23];
    const lightGold: [number, number, number] = [255, 247, 214];
    const gray: [number, number, number] = [93, 105, 113];
    const lightGray: [number, number, number] = [245, 247, 248];
    const neutralBorder: [number, number, number] = [180, 188, 193];

    /* =========================
       YUQORI ZAMONAVIY HEADER
    ========================= */

    /* 3D soya */
    doc.setFillColor(11, 45, 69);
    doc.roundedRect(10.8, 11.2, pageWidth - 20, 20, 3.2, 3.2, "F");

    /* asosiy panel */
    doc.setFillColor(16, 78, 119);
    doc.roundedRect(10, 9, pageWidth - 20, 20, 3.2, 3.2, "F");

    /* yuqori yaltirash */
    doc.setFillColor(42, 145, 201);
    doc.roundedRect(10, 9, pageWidth - 20, 5.2, 3.2, 3.2, "F");

    /* chap aksent */
    doc.setFillColor(57, 177, 226);
    doc.roundedRect(10, 9, 5.5, 20, 3.2, 3.2, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.text(
      "MILLIY SERTIFIKAT NATIJALARI",
      20,
      20
    );

    doc.setFontSize(8);
    doc.text(
      normalizePdfText(
        `Hisobot sanasi: ${formatDate(new Date().toISOString())}`
      ),
      pageWidth - 14,
      18,
      { align: "right" }
    );

    /* =========================
       STATISTIKA KARTALARI
    ========================= */

    const cards = [
      {
        label: "Jami natijalar",
        value: String(stats.total),
        fill: lightBlue,
        stroke: blue,
        valueColor: navy,
      },
      {
        label: "Sertifikat oladi",
        value: String(stats.certified),
        fill: lightGreen,
        stroke: green,
        valueColor: green,
      },
      {
        label: "Sertifikat olmaydi",
        value: String(stats.notCertified),
        fill: lightRed,
        stroke: red,
        valueColor: red,
      },
      {
        label: "O'rtacha sertifikat balli (foiz)",
        value: stats.averageScore.toFixed(2),
        fill: lightGold,
        stroke: gold,
        valueColor: gold,
      },
    ];

    const cardGap = 4;
    const cardX = 10;
    const cardY = 34;
    const cardWidth =
      (pageWidth - 20 - cardGap * 3) / 4;
    const cardHeight = 17;

    cards.forEach((card, index) => {
      const x =
        cardX + index * (cardWidth + cardGap);

      /* 3D soya */
      doc.setFillColor(183, 192, 198);
      doc.roundedRect(
        x + 0.9,
        cardY + 1.3,
        cardWidth,
        cardHeight,
        2,
        2,
        "F"
      );

      /* karta yuzi */
      doc.setFillColor(...card.fill);
      doc.setDrawColor(...card.stroke);
      doc.setLineWidth(0.45);
      doc.roundedRect(
        x,
        cardY,
        cardWidth,
        cardHeight,
        2,
        2,
        "FD"
      );

      /* yuqori highlight */
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.45);
      doc.line(
        x + 2.4,
        cardY + 1.7,
        x + cardWidth - 2.4,
        cardY + 1.7
      );

      doc.setTextColor(...gray);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text(
        normalizePdfText(card.label),
        x + 4,
        cardY + 5.5
      );

      doc.setTextColor(...card.valueColor);
      doc.setFontSize(13);
      doc.text(
        card.value,
        x + 4,
        cardY + 13
      );
    });

    /* =========================
       DARAJA LEGENDASI
    ========================= */

    const gradeItems = [
      ["A+", "70+"],
      ["A", "65-69.9"],
      ["B+", "60-64.9"],
      ["B", "55-59.9"],
      ["C+", "50-54.9"],
      ["C", "46-49.9"],
      ["-", "46 dan past"],
    ];

    const gradeY = 56;
    const gradeGap = 2.5;
    const gradeWidth =
      (pageWidth - 20 - gradeGap * 6) / 7;

    gradeItems.forEach(([grade, range], index) => {
      const x =
        10 + index * (gradeWidth + gradeGap);

      const isFail = grade === "-";
      const isTop = grade === "A+";

      doc.setFillColor(
        ...(isFail
          ? lightRed
          : isTop
          ? lightGold
          : lightGray)
      );

      doc.setDrawColor(
        ...(isFail
          ? red
          : isTop
          ? gold
          : neutralBorder)
      );

      /* 3D soya */
      doc.setFillColor(180, 188, 193);
      doc.roundedRect(
        x + 0.7,
        gradeY + 0.9,
        gradeWidth,
        11,
        1.7,
        1.7,
        "F"
      );

      doc.setFillColor(
        ...(isFail
          ? lightRed
          : isTop
          ? lightGold
          : lightGray)
      );
      doc.setDrawColor(
        ...(isFail
          ? red
          : isTop
          ? gold
          : neutralBorder)
      );
      doc.setLineWidth(0.35);
      doc.roundedRect(
        x,
        gradeY,
        gradeWidth,
        11,
        1.7,
        1.7,
        "FD"
      );

      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.3);
      doc.line(
        x + 2,
        gradeY + 1.4,
        x + gradeWidth - 2,
        gradeY + 1.4
      );

      doc.setTextColor(
        ...(isFail
          ? red
          : isTop
          ? gold
          : navy)
      );

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(
        grade,
        x + 4,
        gradeY + 4.7
      );

      doc.setTextColor(...gray);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.text(
        range,
        x + 4,
        gradeY + 8.7
      );
    });

    /* =========================
       NATIJALAR JADVALI
    ========================= */

    autoTable(doc, {
      startY: 72,

      head: [
        [
          "O'rin",
          "F.I.Sh.",
          "Test",
          "Holat",
          "To'g'ri",
          "Noto'g'ri",
          "Javobsiz",
          "Foiz",
          "Sertifikat balli",
          "Daraja",
          "Sertifikat holati",
          "Yakunlangan",
        ],
      ],

      body: allRankedResults.map(
        (item, index) => {
          const score =
            getCertificateScore(item);

          return [
            index + 1,
            normalizePdfText(
              item.user_name?.trim() ||
                "Noma'lum foydalanuvchi"
            ),
            normalizePdfText(
              item.test_title
            ),
            item.status === "submitted"
              ? "Yakunlangan"
              : "Vaqti tugagan",
            item.correct_count,
            item.incorrect_count,
            item.unanswered_count,
            `${getPercent(item).toFixed(2)}%`,
            score.toFixed(2),
            getCertificateLevel(score),
            getsCertificate(score)
              ? "Sertifikat oladi"
              : "Sertifikat olmaydi",
            normalizePdfText(
              formatDate(item.submitted_at)
            ),
          ];
        }
      ),

      theme: "grid",

      styles: {
        font: "helvetica",
        fontSize: 7.3,
        textColor: [35, 45, 52],
        lineColor: [216, 222, 226],
        lineWidth: 0.2,
        cellPadding: {
          top: 2.8,
          right: 2.2,
          bottom: 2.8,
          left: 2.2,
        },
        valign: "middle",
        halign: "center",
        overflow: "linebreak",
      },

      headStyles: {
        fillColor: navy,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7.4,
        lineColor: navy,
        cellPadding: 3.1,
      },

      alternateRowStyles: {
        fillColor: [248, 250, 251],
      },

      columnStyles: {
        0: {
          cellWidth: 13,
          fontStyle: "bold",
        },
        1: {
          cellWidth: 35,
          halign: "left",
          fontStyle: "bold",
        },
        2: {
          cellWidth: 38,
          halign: "left",
        },
        3: {
          cellWidth: 24,
        },
        4: {
          cellWidth: 16,
        },
        5: {
          cellWidth: 17,
        },
        6: {
          cellWidth: 16,
        },
        7: {
          cellWidth: 17,
          fontStyle: "bold",
        },
        8: {
          cellWidth: 24,
          fontStyle: "bold",
        },
        9: {
          cellWidth: 17,
          fontStyle: "bold",
        },
        10: {
          cellWidth: 30,
          fontStyle: "bold",
        },
        11: {
          cellWidth: 32,
        },
      },

      margin: {
        top: 16,
        left: 10,
        right: 10,
        bottom: 15,
      },

      didParseCell: (data) => {
        if (data.section !== "body") {
          return;
        }

        const row =
          data.row.raw as Array<
            string | number
          >;

        const score =
          Number(row?.[8] || 0);

        const level =
          String(row?.[9] || "-");

        const certified =
          score >= 46;

        if (data.column.index === 0) {
          data.cell.styles.fillColor =
            data.row.index === 0
              ? lightGold
              : data.row.index === 1
              ? [238, 241, 243]
              : data.row.index === 2
              ? [248, 231, 217]
              : data.cell.styles.fillColor;

          data.cell.styles.textColor =
            navy;
        }

        if (data.column.index === 8) {
          data.cell.styles.fillColor =
            certified
              ? lightBlue
              : lightRed;

          data.cell.styles.textColor =
            certified
              ? navy
              : red;

          data.cell.styles.fontStyle =
            "bold";
        }

        if (data.column.index === 9) {
          if (level === "A+") {
            data.cell.styles.fillColor =
              lightGold;
            data.cell.styles.textColor =
              [130, 96, 0];
          } else if (level === "-") {
            data.cell.styles.fillColor =
              lightRed;
            data.cell.styles.textColor =
              red;
          } else {
            data.cell.styles.fillColor =
              lightGreen;
            data.cell.styles.textColor =
              green;
          }

          data.cell.styles.fontStyle =
            "bold";
        }

        if (data.column.index === 10) {
          data.cell.styles.fillColor =
            certified
              ? lightGreen
              : lightRed;

          data.cell.styles.textColor =
            certified
              ? green
              : red;

          data.cell.styles.fontStyle =
            "bold";
        }
      },

    });

    /* =========================
       FOOTER - BARCHA SAHIFALAR
    ========================= */

    const totalPages =
      doc.getNumberOfPages();

    for (
      let pageNumber = 1;
      pageNumber <= totalPages;
      pageNumber++
    ) {
      doc.setPage(pageNumber);

      if (pageNumber > 1) {
        doc.setFont(
          "helvetica",
          "bold"
        );
        doc.setFontSize(8);
        doc.setTextColor(...navy);
        doc.text(
          "MILLIY SERTIFIKAT NATIJALARI",
          10,
          10
        );
      }

      doc.setDrawColor(215, 221, 225);
      doc.setLineWidth(0.25);
      doc.line(
        10,
        pageHeight - 10,
        pageWidth - 10,
        pageHeight - 10
      );

      doc.setFont(
        "helvetica",
        "normal"
      );
      doc.setFontSize(6.7);
      doc.setTextColor(...gray);

      doc.text(
        normalizePdfText(
          "Sertifikat balli foiz natijasiga teng. Daraja foiz natijasiga qarab belgilanadi."
        ),
        10,
        pageHeight - 6
      );

      doc.text(
        `${pageNumber}/${totalPages}`,
        pageWidth - 10,
        pageHeight - 6,
        { align: "right" }
      );
    }

    doc.save(
      `milliy-sertifikat-natijalari-${safeDate()}.pdf`
    );
  }

  return (
    <main className="page">
      <div className="container">
        <div className="topbar">
          <div>
            <div className="mainTitleButton">
              MILLIY SERTIFIKAT NATIJALARI
            </div>
          </div>

          <div className="topActions">
            <Link href="/admin/results" className="button secondary">
              ← Natijalar
            </Link>

            <Link href="/admin" className="button secondary">
              Admin panel
            </Link>

            <Link href="/" className="button secondary">
              Asosiy sahifa
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

        <section className="resultTypeNav">
          <Link
            href="/admin/results"
            className="resultNavCard generalResult"
          >
            <span className="resultNavIcon">≡</span>
            <strong>Test natijalari</strong>
          </Link>

          <Link
            href="/admin/results/national-certificate"
            className="resultNavCard nationalResult active"
          >
            <span className="resultNavIcon">A+</span>
            <strong>Milliy sertifikat natijalari</strong>
          </Link>
        </section>

        <section className="statsGrid">
          <article className="statCard">
            <span>Jami natijalar</span>
            <strong>{stats.total}</strong>
          </article>

          <article className="statCard successStat">
            <span>Sertifikat oladi</span>
            <strong>{stats.certified}</strong>
          </article>

          <article className="statCard dangerStat">
            <span>Sertifikat olmaydi</span>
            <strong>{stats.notCertified}</strong>
          </article>

          <article className="statCard">
            <span>O‘rtacha sertifikat balli (foiz)</span>
            <strong>{stats.averageScore.toFixed(2)}</strong>
          </article>
        </section>

        <section className="gradingPanel">
          <div className="gradingTitle">Nizom bo‘yicha darajalar</div>

          <div className="gradingGrid">
            <div className="gradeBox gradeAPlus"><strong>A+</strong><span>70 va undan yuqori</span></div>
            <div className="gradeBox"><strong>A</strong><span>65 – 69.9</span></div>
            <div className="gradeBox"><strong>B+</strong><span>60 – 64.9</span></div>
            <div className="gradeBox"><strong>B</strong><span>55 – 59.9</span></div>
            <div className="gradeBox"><strong>C+</strong><span>50 – 54.9</span></div>
            <div className="gradeBox"><strong>C</strong><span>46 – 49.9</span></div>
            <div className="gradeBox failGrade"><strong>—</strong><span>46 dan past</span></div>
          </div>
        </section>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <h2>Natijalar reytingi</h2>
              <p>
                {filteredResults.length} ta natija ko‘rsatilmoqda. Jadval foiz natijasiga teng sertifikat balli bo‘yicha tartiblangan.
              </p>
            </div>

            <div className="panelTools">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Test, foydalanuvchi yoki daraja..."
                className="searchInput"
              />

              <button
                type="button"
                className="reportButton pdfReport"
                onClick={exportPdf}
                disabled={loading || allRankedResults.length === 0}
              >
                PDF — Barcha natijalar
              </button>

              <button
                type="button"
                className="reportButton deleteAllReport"
                onClick={deleteAllResults}
                disabled={
                  loading ||
                  deletingAll ||
                  results.length === 0
                }
              >
                {deletingAll
                  ? "O‘chirilmoqda..."
                  : "Barchasini o‘chirish"}
              </button>
            </div>
          </div>

          {error && (
            <div className="errorBox">
              <strong>Xatolik</strong>
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="emptyState">Natijalar yuklanmoqda...</div>
          ) : filteredResults.length === 0 ? (
            <div className="emptyState">Natija topilmadi.</div>
          ) : (
            <div className="tableWrapper">
              <table>
                <thead>
                  <tr>
                    <th>O‘rin</th>
                    <th>Test</th>
                    <th>Foydalanuvchi</th>
                    <th>Holat</th>
                    <th>To‘g‘ri</th>
                    <th>Noto‘g‘ri</th>
                    <th>Javobsiz</th>
                    <th>Natija</th>
                    <th>Foiz</th>
                    <th>Sertifikat balli</th>
                    <th>Daraja</th>
                    <th>Sertifikat</th>
                    <th>Boshlangan</th>
                    <th>Yakunlangan</th>
                    <th>Amallar</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredResults.map((item, index) => {
                    const score = getCertificateScore(item);
                    const level = getCertificateLevel(score);
                    const certified = getsCertificate(score);

                    return (
                      <tr key={item.id}>
                        <td><span className="rank">{index + 1}</span></td>

                        <td>
                          <div className="testCell">
                            <strong>{item.test_title}</strong>
                            <span>{item.total_questions} savol</span>
                          </div>
                        </td>

                        <td>
                          <div className="userCell">
                            <strong>{item.user_name?.trim() || "Noma’lum foydalanuvchi"}</strong>
                            <span title={item.user_key}>
                              {item.user_key.length > 18
                                ? `${item.user_key.slice(0, 18)}...`
                                : item.user_key}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span className={item.status === "submitted" ? "status submitted" : "status expired"}>
                            {item.status === "submitted" ? "Yakunlangan" : "Vaqti tugagan"}
                          </span>
                        </td>

                        <td className="correct">{item.correct_count}</td>
                        <td className="incorrect">{item.incorrect_count}</td>
                        <td>{item.unanswered_count}</td>
                        <td><strong>{item.correct_count}/{item.total_questions}</strong></td>
                        <td><strong>{getPercent(item).toFixed(2)}%</strong></td>
                        <td><span className="scoreBadge">{score.toFixed(2)}</span></td>
                        <td><span className="levelBadge">{level}</span></td>
                        <td>
                          <span className={certified ? "certificateBadge certificateYes" : "certificateBadge certificateNo"}>
                            {certified ? "Sertifikat oladi" : "Sertifikat olmaydi"}
                          </span>
                        </td>
                        <td>{formatDate(item.started_at)}</td>
                        <td>{formatDate(item.submitted_at)}</td>
                        <td>
                          <div className="actionButtons">
                            <Link
                              href={`/admin/results/national-certificate/${item.id}`}
                              className="detailButton"
                            >
                              Batafsil
                            </Link>

                            <button
                              type="button"
                              className="deleteOneButton"
                              onClick={() =>
                                void deleteOneResult(item)
                              }
                              disabled={
                                deletingAll ||
                                deletingId === item.id
                              }
                            >
                              {deletingId === item.id
                                ? "..."
                                : "O‘chirish"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
          min-height: 118px;
          margin-bottom: 26px;
          padding: 20px 28px 22px;
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

        .mainTitleButton {
          min-height: 58px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 13px 24px;
          border: 2px solid #414b52;
          border-radius: 12px;
          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #f1f1f1 42%,
              #c6c9cb 100%
            );
          color: #162333;
          font-size: 20px;
          font-weight: 900;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          text-shadow:
            0 1px 0 rgba(255, 255, 255, 0.95);
          box-shadow:
            inset 0 2px 0 rgba(255, 255, 255, 0.95),
            inset 0 -5px 0 rgba(61, 67, 71, 0.18),
            0 6px 0 #525b61,
            0 10px 14px rgba(0, 0, 0, 0.17);
          white-space: nowrap;
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

        .resultTypeNav {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 22px;
          margin: 32px 0 30px;
        }

        :global(.resultNavCard) {
          min-height: 145px;
          padding: 24px 20px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 18px;

          border: 3px solid #515b61;
          border-radius: 19px;

          color: #111;
          text-decoration: none;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #e7eaec 50%,
              #c4c9cc 100%
            );

          box-shadow:
            inset 0 7px 6px rgba(255,255,255,.95),
            inset 0 -5px 5px rgba(0,0,0,.10),
            0 8px 0 #555d61,
            0 14px 20px rgba(0,0,0,.22);

          transition:
            transform .13s ease,
            filter .13s ease,
            box-shadow .13s ease;
        }

        :global(.resultNavCard:hover) {
          transform: translateY(-4px);
          filter: brightness(1.02);
        }

        :global(.resultNavCard:active) {
          transform: translateY(5px);
          box-shadow:
            inset 0 4px 4px rgba(255,255,255,.8),
            0 2px 0 #555d61;
        }

        :global(.resultNavCard strong) {
          font-size: 27px;
          font-weight: 900;
          text-align: center;
        }

        :global(.resultNavIcon) {
          width: 64px;
          height: 64px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 3px solid #174461;
          border-radius: 50%;

          color: #073b68;

          background:
            radial-gradient(
              circle at 35% 25%,
              #f4fbff,
              #a8e0fb 48%,
              #59a9d4 100%
            );

          box-shadow:
            inset 0 6px 5px rgba(255,255,255,.85),
            0 6px 0 #174461,
            0 9px 13px rgba(0,0,0,.20);

          font-size: 25px;
          font-weight: 900;
        }

        :global(.generalResult) {
          border-color: #174461;

          background:
            linear-gradient(
              180deg,
              #f0fbff 0%,
              #cdebf8 48%,
              #91cbe5 100%
            );

          box-shadow:
            inset 0 7px 6px rgba(255,255,255,.94),
            0 8px 0 #174461,
            0 14px 20px rgba(0,0,0,.22);
        }

        :global(.nationalResult) {
          border-color: #6d5294;

          background:
            linear-gradient(
              180deg,
              #fbf7ff 0%,
              #e2d5f1 48%,
              #b69dce 100%
            );

          box-shadow:
            inset 0 7px 6px rgba(255,255,255,.94),
            0 8px 0 #6d5294,
            0 14px 20px rgba(0,0,0,.22);
        }

        :global(.nationalResult .resultNavIcon) {
          border-color: #6d5294;
          color: #593d7b;

          background:
            radial-gradient(
              circle at 35% 25%,
              #fffaff,
              #e3cff4 48%,
              #aa89c8 100%
            );

          box-shadow:
            inset 0 6px 5px rgba(255,255,255,.85),
            0 6px 0 #6d5294,
            0 9px 13px rgba(0,0,0,.20);
        }

        :global(.resultNavCard.active) {
          outline: 3px solid rgba(255,255,255,.65);
          outline-offset: -7px;
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

        .deleteAllReport {
          border: 2px solid #8b1f1f;
          color: #ffffff;
          background:
            linear-gradient(
              180deg,
              #ff7f7f 0%,
              #dc3c3c 48%,
              #ad1f1f 100%
            );
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,.55),
            inset 0 -4px 0 rgba(99,0,0,.24),
            0 5px 0 #761919,
            0 8px 12px rgba(0,0,0,.18);
        }

        .actionButtons {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
        }

        .deleteOneButton {
          min-width: 92px;
          min-height: 40px;
          padding: 8px 13px;
          border: 2px solid #8d2626;
          border-radius: 10px;
          color: #7a1717;
          background:
            linear-gradient(
              180deg,
              #fff0f0 0%,
              #f5b3b3 48%,
              #dc7777 100%
            );
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,.82),
            inset 0 -3px 0 rgba(111,20,20,.16),
            0 4px 0 #8d2626;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          transition:
            transform .12s ease,
            filter .12s ease,
            box-shadow .12s ease;
        }

        .deleteOneButton:hover:not(:disabled) {
          transform: translateY(-1px);
          filter: brightness(1.03);
        }

        .deleteOneButton:active:not(:disabled) {
          transform: translateY(3px);
          box-shadow: 0 1px 0 #8d2626;
        }

        .deleteOneButton:disabled {
          cursor: not-allowed;
          opacity: .55;
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
          .resultTypeNav,
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

          .mainTitleButton {
            width: 100%;
            white-space: normal;
            text-align: center;
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

          .resultTypeNav,
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


        /* ===== MILLIY SERTIFIKAT YANGI QO‘SHIMCHALAR ===== */
        .statsGrid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .successStat strong { color: #1d7a3a; }
        .dangerStat strong { color: #b12620; }

        .gradingPanel {
          margin: 38px 0 26px;
          padding: 28px 18px 18px;
          border: 3px solid #3d474e;
          border-radius: 18px;
          background: linear-gradient(145deg, #666c70, #444a4e);
          box-shadow: inset 0 3px 0 rgba(255,255,255,.15), 0 7px 0 #353c40, 0 14px 24px rgba(0,0,0,.17);
        }

        .gradingTitle {
          width: fit-content;
          margin: -53px auto 20px;
          padding: 10px 28px;
          border: 3px solid #174461;
          border-radius: 14px;
          background: linear-gradient(#abe6ff, #58a8d7);
          box-shadow: inset 0 5px 4px rgba(255,255,255,.7), 0 5px 0 #17415c;
          color: #073b68;
          font-size: 21px;
          font-weight: 900;
        }

        .gradingGrid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 10px;
        }

        .gradeBox {
          min-height: 86px;
          padding: 10px 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border: 2px solid #5b6266;
          border-radius: 12px;
          background: linear-gradient(#fff, #d8dcdf);
          box-shadow: inset 0 3px 3px #fff, 0 4px 0 #5a6267;
          text-align: center;
        }

        .gradeBox strong { color: #0b527a; font-size: 25px; }
        .gradeBox span { font-size: 12px; font-weight: 900; }
        .gradeAPlus { background: linear-gradient(#fff8bd, #e9c744); }
        .failGrade { background: linear-gradient(#ffeaea, #e8aaaa); }

        .panelTools {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

        .panelTools .searchInput { width: 300px; }

        .reportButton {
          min-height: 46px;
          padding: 0 15px;
          border-radius: 10px;
          font-family: inherit;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: inset 0 2px 0 rgba(255,255,255,.78), 0 4px 0 rgba(0,0,0,.42);
        }

        .pdfReport {
          border: 2px solid #8d1d1d;
          background: linear-gradient(#ffd9d9, #df6464);
          color: #711414;
        }

        table { min-width: 1900px; }

        .rank,
        .scoreBadge,
        .levelBadge,
        .certificateBadge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
        }

        .rank {
          width: 34px;
          height: 34px;
          border: 2px solid #59636a;
          border-radius: 50%;
          background: linear-gradient(#fff, #cfd4d7);
          box-shadow: 0 3px 0 #59636a;
        }

        .scoreBadge {
          min-width: 72px;
          min-height: 34px;
          padding: 6px 10px;
          border: 2px solid #174461;
          border-radius: 10px;
          color: #073b68;
          background: linear-gradient(#dff5ff, #85cdea);
          box-shadow: 0 3px 0 #174461;
        }

        .levelBadge {
          min-width: 52px;
          min-height: 34px;
          padding: 6px 9px;
          border: 2px solid #6f622a;
          border-radius: 10px;
          background: linear-gradient(#fff9cb, #e6d071);
          box-shadow: 0 3px 0 #6f622a;
        }

        .certificateBadge {
          min-height: 34px;
          padding: 6px 10px;
          border-radius: 10px;
          font-size: 11px;
          box-shadow: inset 0 1px 0 #fff, 0 3px 0 rgba(0,0,0,.25);
        }

        .certificateYes {
          border: 2px solid #287344;
          color: #176638;
          background: linear-gradient(#effff4, #aee4be);
        }

        .certificateNo {
          border: 2px solid #9a2b2b;
          color: #812020;
          background: linear-gradient(#fff0f0, #eab1b1);
        }

        @media (max-width: 1250px) {
          .gradingGrid { grid-template-columns: repeat(4, 1fr); }
          .panelHeader { flex-direction: column; align-items: stretch; }
          .panelTools { justify-content: flex-start; }
        }

        @media (max-width: 950px) {
          .gradingGrid { grid-template-columns: repeat(2, 1fr); }
          .panelTools .searchInput { width: 100%; }
        }

        @media (max-width: 560px) {
          .gradingGrid { grid-template-columns: 1fr; }
          .panelTools { flex-direction: column; }
          .reportButton { width: 100%; }
        }
      `}</style>
    </main>
  );
}
