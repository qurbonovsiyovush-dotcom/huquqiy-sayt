"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { jsPDF } from "jspdf";

type TestStatus = "draft" | "published";

type TestOption = {
  id: string;
  text: string;
  isCorrect: boolean;
};

type TestShape = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  imageSrc?: string;
  [key: string]: unknown;
};

type TestQuestion = {
  id: string;
  questionHtml: string;
  options: TestOption[];
  shapes?: TestShape[];
  points?: number;
};

type TestData = {
  id: string;
  title: string;
  subject: string;
  duration: number;
  description?: string;
  questions: TestQuestion[];
  status: TestStatus;
  createdAt?: string;
  updatedAt?: string;
};

export default function AdminTestsPage() {
  const router = useRouter();

  const [tests, setTests] = useState<TestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | TestStatus
  >("all");
  const [exportTest, setExportTest] = useState<TestData | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "word" | null>(null);

  /* =========================================================
     JSON O'QISH
  ========================================================= */

  async function readJson(response: Response) {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  /* =========================================================
     TESTLARNI YUKLASH
  ========================================================= */

  const loadTests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/tests", {
        method: "GET",
        cache: "no-store",
      });

      const data = await readJson(response);

      if (!response.ok || !data.success) {
        setTests([]);

        setError(
          data.message ||
            "Testlarni serverdan yuklab bo‘lmadi."
        );

        return;
      }

      const loadedTests: TestData[] = Array.isArray(data.tests)
        ? data.tests
        : [];

      setTests(loadedTests);
    } catch (error) {
      console.error(error);

      setTests([]);

      setError(
        "Server bilan bog‘lanishda xatolik yuz berdi."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTests();
  }, [loadTests]);

  /* =========================================================
     FILTER
  ========================================================= */

  const filteredTests = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tests.filter((test) => {
      if (
        statusFilter !== "all" &&
        test.status !== statusFilter
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        String(test.title || "")
          .toLowerCase()
          .includes(query) ||
        String(test.subject || "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [tests, search, statusFilter]);

  /* =========================================================
     STATISTIKA
  ========================================================= */

  const statistics = useMemo(() => {
    const draft = tests.filter(
      (test) => test.status === "draft"
    ).length;

    const published = tests.filter(
      (test) => test.status === "published"
    ).length;

    return {
      total: tests.length,
      draft,
      published,
    };
  }, [tests]);

  /* =========================================================
     TESTNI TO'LIQ OLISH
  ========================================================= */

  async function getFullTest(id: string): Promise<TestData | null> {
    try {
      const response = await fetch(
        `/api/tests/${encodeURIComponent(id)}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await readJson(response);

      if (!response.ok || !data.success || !data.test) {
        window.alert(
          data.message || "Test ma’lumotlarini olib bo‘lmadi."
        );

        return null;
      }

      return data.test as TestData;
    } catch (error) {
      console.error(error);

      window.alert(
        "Test ma’lumotlarini olishda server xatosi."
      );

      return null;
    }
  }

  /* =========================================================
     STATUSNI O'ZGARTIRISH
  ========================================================= */

  async function changeStatus(
    id: string,
    newStatus: TestStatus
  ) {
    setWorkingId(id);

    try {
      const fullTest = await getFullTest(id);

      if (!fullTest) {
        return;
      }

      if (
        newStatus === "published" &&
        (!Array.isArray(fullTest.questions) ||
          fullTest.questions.length === 0)
      ) {
        window.alert(
          "Savolsiz testni e’lon qilib bo‘lmaydi."
        );

        return;
      }

      const confirmed = window.confirm(
        newStatus === "published"
          ? "Ushbu test foydalanuvchilarga e’lon qilinsinmi?"
          : "Ushbu test qoralama holatiga qaytarilsinmi?"
      );

      if (!confirmed) {
        return;
      }

      const updatedTest = {
        ...fullTest,
        status: newStatus,
      };

      const response = await fetch(
        `/api/tests/${encodeURIComponent(id)}`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(updatedTest),
        }
      );

      const data = await readJson(response);

      if (!response.ok || !data.success) {
        window.alert(
          data.message ||
            "Test holatini o‘zgartirib bo‘lmadi."
        );

        return;
      }

      setTests((current) =>
        current.map((test) =>
          test.id === id
            ? {
                ...test,
                ...(data.test || {}),
                status: newStatus,
              }
            : test
        )
      );

      window.alert(
        newStatus === "published"
          ? "Test muvaffaqiyatli e’lon qilindi."
          : "Test qoralama holatiga qaytarildi."
      );
    } catch (error) {
      console.error(error);

      window.alert(
        "Test holatini o‘zgartirishda server xatosi."
      );
    } finally {
      setWorkingId(null);
    }
  }

  /* =========================================================
     O'CHIRISH
  ========================================================= */

  async function deleteTest(test: TestData) {
    const confirmed = window.confirm(
      `"${test.title}" testi BUTUNLAY o‘chiriladi.\n\n` +
        "Bu amalni ortga qaytarib bo‘lmaydi.\n\n" +
        "Davom etasizmi?"
    );

    if (!confirmed) {
      return;
    }

    setWorkingId(test.id);

    try {
      const response = await fetch(
        `/api/tests/${encodeURIComponent(test.id)}`,
        {
          method: "DELETE",
          cache: "no-store",
        }
      );

      const data = await readJson(response);

      if (!response.ok || !data.success) {
        window.alert(
          data.message || "Testni o‘chirib bo‘lmadi."
        );

        return;
      }

      setTests((current) =>
        current.filter((item) => item.id !== test.id)
      );

      window.alert("Test o‘chirildi.");
    } catch (error) {
      console.error(error);

      window.alert(
        "Testni o‘chirishda server xatosi."
      );
    } finally {
      setWorkingId(null);
    }
  }

  /* =========================================================
     PDF / WORD EKSPORT
  ========================================================= */

  function cleanFileName(value: string) {
    return String(value || "test")
      .trim()
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
      .replace(/\s+/g, "_") || "test";
  }

  function stripHtml(value?: string) {
    if (!value) return "";

    if (typeof document === "undefined") {
      return String(value).replace(/<[^>]*>/g, " ");
    }

    const element = document.createElement("div");
    element.innerHTML = value;
    return (element.textContent || element.innerText || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeHtml(value: string) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async function imageToDataUrl(src?: string) {
    if (!src) return "";
    if (src.startsWith("data:")) return src;

    try {
      const response = await fetch(src, { cache: "no-store" });
      if (!response.ok) return src;
      const blob = await response.blob();

      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result || src));
        reader.onerror = () => resolve(src);
        reader.readAsDataURL(blob);
      });
    } catch {
      return src;
    }
  }

  async function buildTestDocument(
    fullTest: TestData,
    includeAnswers: boolean
  ) {
    const questions = Array.isArray(fullTest.questions)
      ? fullTest.questions
      : [];

    const questionParts = await Promise.all(
      questions.map(async (question, index) => {
        const options = Array.isArray(question.options)
          ? question.options
          : [];

        const imageShapes = Array.isArray(question.shapes)
          ? question.shapes.filter(
              (shape) =>
                typeof shape.imageSrc === "string" &&
                shape.imageSrc.trim().length > 0
            )
          : [];

        const shapeImages = await Promise.all(
          imageShapes.map(async (shape) => {
            const src = await imageToDataUrl(shape.imageSrc);
            return src
              ? `<div class="questionImage"><img src="${escapeHtml(src)}" alt="Savol rasmi" /></div>`
              : "";
          })
        );

        const optionsHtml = options
          .map((option, optionIndex) => {
            const letter = String.fromCharCode(65 + optionIndex);
            const correct = option.isCorrect === true;
            const optionText = stripHtml(option.text);
            const correctClass = includeAnswers && correct ? " correct" : "";
            const answerLabel =
              includeAnswers && correct
                ? '<span class="answer">TO‘G‘RI JAVOB</span>'
                : "";

            return `
              <div class="option${correctClass}">
                <strong>${letter}.</strong>
                ${escapeHtml(optionText || "Variant matni mavjud emas")}
                ${answerLabel}
              </div>
            `;
          })
          .join("");

        return `
          <section class="question">
            <h3>${index + 1}-savol</h3>
            <div class="questionText">${escapeHtml(
              stripHtml(question.questionHtml) || "Savol matni mavjud emas"
            )}</div>
            ${shapeImages.join("")}
            <div class="options">${optionsHtml}</div>
          </section>
        `;
      })
    );

    return `<!doctype html>
<html lang="uz">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(fullTest.title || "Test")}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #101820;
      font-family: Arial, "Times New Roman", serif;
      font-size: 10.5pt;
      line-height: 1.34;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header {
      margin-bottom: 12px;
      padding: 12px;
      border: 2px solid #174461;
      border-radius: 12px;
      background: #eaf7ff;
      text-align: center;
    }
    .header h1 { margin: 0 0 5px; color: #073b68; font-size: 18pt; }
    .header p { margin: 3px 0; }
    .nameLine { margin-top: 9px; padding-top: 7px; border-top: 1px solid #7d9bad; text-align: left; }
    .meta { display: table; width: 100%; margin-top: 9px; border-collapse: collapse; }
    .meta div { display: table-cell; padding: 6px; border: 1px solid #9aa8b0; }
    .question {
      margin: 0 0 10px;
      padding: 9px 10px;
      break-inside: auto;
      page-break-inside: auto;
      border: 1px solid #8c9aa3;
      border-radius: 7px;
    }
    .question h3 { margin: 0 0 6px; color: #073b68; font-size: 12pt; }
    .questionText { margin-bottom: 7px; font-weight: 700; white-space: pre-wrap; }
    .questionImage { margin: 7px 0; text-align: center; break-inside: avoid; page-break-inside: avoid; }
    .questionImage img {
      display: inline-block;
      width: auto;
      height: auto;
      max-width: 260px;
      max-height: 185px;
      object-fit: contain;
    }
    .option {
      position: relative;
      margin: 4px 0;
      padding: 5px 8px;
      border: 1px solid #c2c9cd;
      border-radius: 5px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .option.correct { border: 2px solid #2f8450; background: #eaf8ef; }
    .answer { float: right; margin-left: 8px; color: #176b39; font-size: 8pt; font-weight: 800; }
    .footer { margin-top: 12px; color: #4b5961; text-align: center; font-size: 8pt; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(fullTest.title || "Nomsiz test")}</h1>
    <p><strong>Fan:</strong> ${escapeHtml(fullTest.subject || "—")}</p>
    ${fullTest.description ? `<p>${escapeHtml(stripHtml(fullTest.description))}</p>` : ""}
    <div class="meta">
      <div><strong>Savollar:</strong> ${questions.length}</div>
      <div><strong>Vaqt:</strong> ${Number(fullTest.duration) || 0} daqiqa</div>
      <div><strong>Javoblar:</strong> ${includeAnswers ? "bilan" : "javobsiz"}</div>
    </div>
    <div class="nameLine"><strong>F.I.Sh.:</strong> ____________________________________________</div>
  </div>
  ${questionParts.join("")}
  <div class="footer">qurbonovv.uz — Huquqiy ta’lim platformasi</div>
</body>
</html>`;
  }

  async function exportAsWord(test: TestData, includeAnswers: boolean) {
    setExporting(true);
    setWorkingId(test.id);

    try {
      const fullTest = await getFullTest(test.id);
      if (!fullTest) return;

      const html = await buildTestDocument(fullTest, includeAnswers);
      const blob = new Blob(["\ufeff", html], {
        type: "application/msword;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `${cleanFileName(fullTest.title)}_${
        includeAnswers ? "javoblari_bilan" : "javobsiz"
      }.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setExportTest(null);
      setExportFormat(null);
    } catch (error) {
      console.error(error);
      window.alert("Word faylini yaratishda xatolik yuz berdi.");
    } finally {
      setExporting(false);
      setWorkingId(null);
    }
  }

  async function exportAsPdf(test: TestData, includeAnswers: boolean) {
    setExporting(true);
    setWorkingId(test.id);

    let iframe: HTMLIFrameElement | null = null;

    try {
      const fullTest = await getFullTest(test.id);
      if (!fullTest) return;

      const html = await buildTestDocument(fullTest, includeAnswers);

      // PDF uchun yashirin hujjat yaratamiz. Print oynasi ochilmaydi.
      iframe = document.createElement("iframe");
      iframe.setAttribute("aria-hidden", "true");
      iframe.style.position = "fixed";
      iframe.style.left = "-100000px";
      iframe.style.top = "0";
      iframe.style.width = "794px";
      iframe.style.height = "1123px";
      iframe.style.opacity = "0";
      iframe.style.pointerEvents = "none";
      iframe.style.border = "0";
      document.body.appendChild(iframe);

      const pdfDocument = iframe.contentDocument;
      if (!pdfDocument) {
        throw new Error("PDF hujjatini tayyorlab bo‘lmadi.");
      }

      pdfDocument.open();
      pdfDocument.write(html);
      pdfDocument.close();

      await new Promise<void>((resolve) => {
        if (pdfDocument.readyState === "complete") {
          resolve();
          return;
        }

        iframe!.onload = () => resolve();
        window.setTimeout(resolve, 500);
      });

      // Hamma rasmlar yuklanishini kutamiz.
      const images = Array.from(pdfDocument.images);
      await Promise.all(
        images.map(
          (image) =>
            new Promise<void>((resolve) => {
              if (image.complete) {
                resolve();
                return;
              }

              image.onload = () => resolve();
              image.onerror = () => resolve();
              window.setTimeout(resolve, 4000);
            })
        )
      );

      // Font va layout to‘liq hisoblanishini kutamiz.
      if (pdfDocument.fonts?.ready) {
        await pdfDocument.fonts.ready;
      }

      await new Promise((resolve) => window.setTimeout(resolve, 150));

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      await pdf.html(pdfDocument.body, {
        margin: [8, 8, 8, 8],
        autoPaging: "text",
        width: 194,
        windowWidth: 794,
        html2canvas: {
          scale: 0.9,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false,
        },
      });

      // Brauzer yuklab olishni boshlaydi. Chrome sozlamasida
      // "Ask where to save each file before downloading" yoqilgan bo‘lsa,
      // qayerga saqlashni so‘raydi.
      pdf.save(
        `${cleanFileName(fullTest.title)}_${
          includeAnswers ? "javoblari_bilan" : "javobsiz"
        }.pdf`
      );

      setExportTest(null);
      setExportFormat(null);
    } catch (error) {
      console.error(error);
      window.alert(
        "PDF faylini yaratishda xatolik yuz berdi. Sahifani yangilab qayta urinib ko‘ring."
      );
    } finally {
      if (iframe?.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }

      setExporting(false);
      setWorkingId(null);
    }
  }

  /* =========================================================
     SANA
  ========================================================= */

  function formatDate(value?: string) {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString("uz-UZ");
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <main className="page">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="header">
        <div className="headerTitle">
          <span>ADMIN PANEL</span>

          <strong>Testlarni boshqarish</strong>
        </div>

        <div className="headerActions">
          <button
            type="button"
            className="grayButton"
            onClick={() => router.push("/admin/requests")}
          >
            <span className="buttonMain">Admin panel</span>
            <span className="buttonSub">Boshqaruv bo‘limi</span>
          </button>

          <button
            type="button"
            className="grayButton"
            onClick={() => router.push("/test")}
          >
            <span className="buttonMain">Testlarni ko‘rish</span>
            <span className="buttonSub">Barcha testlar ro‘yxati</span>
          </button>

          <button
            type="button"
            className="resultsButton"
            onClick={() => router.push("/admin/results")}
          >
            <span className="buttonMain">Test natijalari</span>
            <span className="buttonSub">Natijalar va statistika</span>
          </button>

          <button
            type="button"
            className="blueButton"
            onClick={() => router.push("/test/editor")}
          >
            <span className="buttonMain">Yangi test yaratish</span>
            <span className="buttonSub">Yangi test qo‘shish</span>
          </button>
        </div>
      </header>

      {/* =====================================================
          STATISTIKA
      ===================================================== */}

      <section className="mainBox">
        <div className="floatingTitle">
          Testlar
        </div>

        <div className="statistics">
          <button
            type="button"
            className={
              statusFilter === "all"
                ? "statCard activeStat"
                : "statCard"
            }
            onClick={() => setStatusFilter("all")}
          >
            <strong>{statistics.total}</strong>
            <span>Jami test</span>
          </button>

          <button
            type="button"
            className={
              statusFilter === "draft"
                ? "statCard activeStat"
                : "statCard"
            }
            onClick={() => setStatusFilter("draft")}
          >
            <strong>{statistics.draft}</strong>
            <span>Qoralama</span>
          </button>

          <button
            type="button"
            className={
              statusFilter === "published"
                ? "statCard activeStat"
                : "statCard"
            }
            onClick={() => setStatusFilter("published")}
          >
            <strong>{statistics.published}</strong>
            <span>E’lon qilingan</span>
          </button>
        </div>

        {/* ===================================================
            QIDIRUV
        =================================================== */}

        <div className="searchArea">
          <div className="searchInputBox">
            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Test nomi yoki fan bo‘yicha qidirish..."
            />

            {search && (
              <button
                type="button"
                className="clearSearch"
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
            ↻ Yangilash
          </button>
        </div>

        {/* ===================================================
            ERROR
        =================================================== */}

        {error && (
          <div className="errorBox">
            {error}
          </div>
        )}

        {/* ===================================================
            TESTLAR
        =================================================== */}

        <div className="contentBox">
          {loading ? (
            <div className="emptyBox">
              <div className="loader" />

              <strong>
                Testlar yuklanmoqda...
              </strong>
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="emptyBox">
              <div className="emptyIcon">
                ?
              </div>

              <h2>Test topilmadi</h2>

              <p>
                Hozircha ushbu bo‘limda test mavjud emas.
              </p>

              <button
                type="button"
                className="blueButton createFirstButton"
                onClick={() =>
                  router.push("/test/editor")
                }
              >
                + Birinchi testni yaratish
              </button>
            </div>
          ) : (
            <div className="testList">
              {filteredTests.map((test) => {
                const questionCount = Array.isArray(
                  test.questions
                )
                  ? test.questions.length
                  : 0;

                const busy = workingId === test.id;

                return (
                  <article
                    className="testCard"
                    key={test.id}
                  >
                    {/* STATUS */}

                    <div
                      className={
                        test.status === "published"
                          ? "statusBadge publishedBadge"
                          : "statusBadge draftBadge"
                      }
                    >
                      {test.status === "published"
                        ? "✓ E’LON QILINGAN"
                        : "● QORALAMA"}
                    </div>

                    {/* TITLE */}

                    <div className="testHeader">
                      <div className="testTitleArea">
                        <h2>
                          {test.title ||
                            "Nomsiz test"}
                        </h2>

                        <p>
                          {test.subject ||
                            "Fan ko‘rsatilmagan"}
                        </p>
                      </div>
                    </div>

                    {/* DESCRIPTION */}

                    {test.description && (
                      <div className="description">
                        {test.description}
                      </div>
                    )}

                    {/* INFO */}

                    <div className="testInformation">
                      <div className="infoItem">
                        <span>Savollar</span>

                        <strong>
                          {questionCount}
                        </strong>
                      </div>

                      <div className="infoItem">
                        <span>Vaqt</span>

                        <strong>
                          {Number(test.duration) || 0}
                          <small> daqiqa</small>
                        </strong>
                      </div>

                      <div className="infoItem">
                        <span>Holati</span>

                        <strong>
                          {test.status === "published"
                            ? "E’lon qilingan"
                            : "Qoralama"}
                        </strong>
                      </div>

                      <div className="infoItem">
                        <span>Oxirgi o‘zgarish</span>

                        <strong className="dateText">
                          {formatDate(test.updatedAt)}
                        </strong>
                      </div>
                    </div>

                    {/* ACTIONS */}

                    <div className="actions">
                      <button
                        type="button"
                        className="editButton"
                        disabled={busy}
                        onClick={() =>
                          router.push(
                            `/test/editor?id=${encodeURIComponent(
                              test.id
                            )}`
                          )
                        }
                      >
                        <span className="actionMain">Tahrirlash</span>
                        <span className="actionSub">Test ma’lumotlarini o‘zgartirish</span>
                      </button>

                      {test.status === "draft" ? (
                        <button
                          type="button"
                          className="publishButton"
                          disabled={busy}
                          onClick={() =>
                            changeStatus(
                              test.id,
                              "published"
                            )
                          }
                        >
                          {busy
                            ? "Kutilmoqda..."
                            : "✓ E’lon qilish"}
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="viewButton"
                            disabled={busy}
                            onClick={() =>
                              router.push(
                                `/test/${encodeURIComponent(
                                  test.id
                                )}`
                              )
                            }
                          >
                            <span className="actionMain">Testni ko‘rish</span>
                            <span className="actionSub">Testni yechib ko‘rish</span>
                          </button>

                          <button
                            type="button"
                            className="draftButton"
                            disabled={busy}
                            onClick={() =>
                              changeStatus(
                                test.id,
                                "draft"
                              )
                            }
                          >
                            <span className="actionMain">Qoralamaga qaytarish</span>
                            <span className="actionSub">Testni qoralamaga o‘tkazish</span>
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        className="saveButton"
                        disabled={busy}
                        onClick={() => setExportTest(test)}
                      >
                        <span className="actionMain">Kompyuterga saqlash</span>
                        <span className="actionSub">PDF yoki Word formatida</span>
                      </button>

                      <button
                        type="button"
                        className="deleteButton"
                        disabled={busy}
                        onClick={() =>
                          deleteTest(test)
                        }
                      >
                        <span className="actionMain">O‘chirish</span>
                        <span className="actionSub">Testni butunlay o‘chirish</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {exportTest && (
        <div
          className="exportOverlay"
          onClick={() => {
            if (!exporting) {
              setExportTest(null);
              setExportFormat(null);
            }
          }}
        >
          <div
            className="exportModal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="exportTitle">
              <span>Kompyuterga saqlash</span>
              <strong>{exportTest.title || "Test"}</strong>
            </div>

            {!exportFormat ? (
              <>
                <p>Avval fayl formatini tanlang.</p>
                <div className="exportChoices">
                  <button
                    type="button"
                    className="pdfChoice"
                    disabled={exporting}
                    onClick={() => setExportFormat("pdf")}
                  >
                    <span className="choiceMain">PDF</span>
                    <span className="choiceSub">Chop etish yoki PDF sifatida saqlash</span>
                  </button>

                  <button
                    type="button"
                    className="wordChoice"
                    disabled={exporting}
                    onClick={() => setExportFormat("word")}
                  >
                    <span className="choiceMain">Word</span>
                    <span className="choiceSub">Tahrirlash mumkin bo‘lgan .doc fayl</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <p>
                  <strong>{exportFormat === "pdf" ? "PDF" : "Word"}</strong> qanday saqlansin?
                </p>
                <div className="answerChoices">
                  <button
                    type="button"
                    className="withAnswersChoice"
                    disabled={exporting}
                    onClick={() =>
                      exportFormat === "pdf"
                        ? exportAsPdf(exportTest, true)
                        : exportAsWord(exportTest, true)
                    }
                  >
                    <span className="choiceMain">Javoblari bilan</span>
                    <span className="choiceSub">To‘g‘ri javoblar yashil rangda belgilanadi</span>
                  </button>

                  <button
                    type="button"
                    className="withoutAnswersChoice"
                    disabled={exporting}
                    onClick={() =>
                      exportFormat === "pdf"
                        ? exportAsPdf(exportTest, false)
                        : exportAsWord(exportTest, false)
                    }
                  >
                    <span className="choiceMain">Javoblarsiz</span>
                    <span className="choiceSub">Talabalarga tarqatish uchun toza test</span>
                  </button>
                </div>

                <button
                  type="button"
                  className="backExport"
                  disabled={exporting}
                  onClick={() => setExportFormat(null)}
                >
                  ← Formatni qayta tanlash
                </button>
              </>
            )}

            <button
              type="button"
              className="cancelExport"
              disabled={exporting}
              onClick={() => {
                setExportTest(null);
                setExportFormat(null);
              }}
            >
              {exporting ? "Tayyorlanmoqda..." : "Bekor qilish"}
            </button>
          </div>
        </div>
      )}

      {/* =====================================================
          YANGI TEST TUGMASI
      ===================================================== */}

      <div className="bottomCreate">
        <button
          type="button"
          onClick={() =>
            router.push("/test/editor")
          }
        >
          <span>+</span>

          YANGI TEST YARATISH
        </button>
      </div>

      {/* =====================================================
          CSS
      ===================================================== */}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;

          padding:
            20px 20px 100px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #f4f6f7 55%,
              #e9eef1 100%
            );

          color: #111;

          font-family:
            Georgia,
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
          opacity: 0.55;
          cursor: wait;
        }

        /* ================================================
           HEADER
        ================================================ */

        .header {
          width: min(1500px, 96%);

          min-height: 120px;

          margin: 0 auto;

          padding: 22px 28px;

          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 25px;

          border:
            3px solid #303538;

          border-radius: 25px;

          background:
            linear-gradient(
              145deg,
              #696d70,
              #4f5457 50%,
              #373b3e
            );

          box-shadow:
            inset 0 7px 6px
              rgba(255, 255, 255, 0.25),
            inset 0 -7px 8px
              rgba(0, 0, 0, 0.3),
            0 7px 0 #272b2e,
            0 14px 24px
              rgba(0, 0, 0, 0.23);
        }

        .headerTitle {
          min-width: 310px;

          padding: 14px 30px;

          display: flex;

          flex-direction: column;

          align-items: center;

          justify-content: center;

          border:
            3px solid #174461;

          border-radius: 16px;

          background:
            linear-gradient(
              #a8e5ff,
              #58a8d7
            );

          box-shadow:
            inset 0 6px 5px
              rgba(255, 255, 255, 0.75),
            0 5px 0 #17415c;

          color: #073b68;

          text-align: center;
        }

        .headerTitle span {
          margin-bottom: 3px;

          font-size: 13px;

          letter-spacing: 2px;
        }

        .headerTitle strong {
          font-size: 27px;
        }

        .headerActions {
          display: flex;

          align-items: center;

          justify-content: flex-end;

          gap: 12px;

          flex-wrap: wrap;
        }

        .headerActions button {
          min-height: 52px;

          padding: 0 20px;

          border-radius: 10px;

          font-weight: 700;

          font-size: 15px;
        }

        .grayButton {
          border:
            2px solid #555;

          background:
            linear-gradient(
              #ffffff,
              #bcbcbc
            );

          box-shadow:
            0 4px 0 #444;
        }

        .resultsButton {
          color: #125a32;

          border:
            2px solid #267446;

          background:
            linear-gradient(
              #c4f2d2,
              #68c988
            );

          box-shadow:
            0 4px 0 #266c42;

          font-weight: 700;
        }

        .resultsButton:hover {
          filter: brightness(1.05);
        }

        .blueButton {
          color: #073b68;

          border:
            2px solid #174461;

          background:
            linear-gradient(
              #b6ebff,
              #58a8d7
            );

          box-shadow:
            0 4px 0 #17415c;

          font-weight: 700;
        }

        /* ================================================
           MAIN
        ================================================ */

        .mainBox {
          position: relative;

          width: min(1500px, 96%);

          margin:
            95px auto 60px;

          padding:
            85px 35px 40px;

          border:
            3px solid #303538;

          border-radius: 27px;

          background:
            linear-gradient(
              145deg,
              #686c6f,
              #505457 45%,
              #363a3d
            );

          box-shadow:
            inset 0 7px 6px
              rgba(255, 255, 255, 0.23),
            inset 0 -8px 8px
              rgba(0, 0, 0, 0.32),
            0 7px 0 #272b2e,
            0 15px 24px
              rgba(0, 0, 0, 0.25);
        }

        .floatingTitle {
          position: absolute;

          top: -35px;

          left: 50%;

          transform:
            translateX(-50%);

          min-width: 330px;

          min-height: 70px;

          padding:
            10px 30px;

          display: flex;

          align-items: center;

          justify-content: center;

          color: #073b68;

          text-align: center;

          border:
            3px solid #174461;

          border-radius: 16px;

          background:
            linear-gradient(
              #a7e2ff,
              #58a8d7
            );

          box-shadow:
            inset 0 6px 5px
              rgba(255, 255, 255, 0.7),
            0 5px 0 #17415c;

          font-size: 28px;

          font-weight: 700;

          z-index: 10;
        }

        /* ================================================
           STATISTICS
        ================================================ */

        .statistics {
          display: grid;

          grid-template-columns:
            repeat(3, minmax(0, 1fr));

          gap: 20px;

          margin-bottom: 28px;
        }

        .statCard {
          min-height: 105px;

          padding: 15px;

          border:
            3px solid #666;

          border-radius: 14px;

          background:
            linear-gradient(
              #ffffff,
              #cccccc
            );

          box-shadow:
            inset 0 5px 5px white,
            0 5px 0 #555d61;

          text-align: center;
        }

        .statCard strong {
          display: block;

          margin-bottom: 5px;

          color: #07517e;

          font-size: 34px;
        }

        .statCard span {
          font-size: 17px;

          font-weight: 700;
        }

        .activeStat {
          border-color: #1688bf;

          background:
            linear-gradient(
              #d9f3ff,
              #88cbe9
            );
        }

        /* ================================================
           SEARCH
        ================================================ */

        .searchArea {
          margin-bottom: 30px;

          padding: 22px;

          display: flex;

          gap: 15px;

          border:
            2px solid #555;

          border-radius: 15px;

          background:
            linear-gradient(
              #eeeeee,
              #c4c4c4
            );

          box-shadow:
            inset 0 5px 5px white,
            0 5px 0 #555d61;
        }

        .searchInputBox {
          position: relative;

          flex: 1;
        }

        .searchInputBox input {
          width: 100%;

          height: 58px;

          padding:
            0 55px 0 18px;

          border:
            2px solid #168fc9;

          border-radius: 10px;

          outline: none;

          background: white;

          direction: ltr;

          text-align: left;

          font-size: 18px;
        }

        .clearSearch {
          position: absolute;

          top: 50%;

          right: 12px;

          width: 35px;

          height: 35px;

          transform:
            translateY(-50%);

          border: none;

          background: transparent;

          color: #b11919;

          font-size: 27px;

          font-weight: 700;
        }

        .refreshButton {
          min-width: 140px;

          border:
            2px solid #555;

          border-radius: 9px;

          background:
            linear-gradient(
              #ffffff,
              #bbbbbb
            );

          font-weight: 700;
        }

        /* ================================================
           CONTENT
        ================================================ */

        .contentBox {
          min-height: 250px;

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

        .errorBox {
          margin-bottom: 25px;

          padding: 18px;

          color: #8c1111;

          text-align: center;

          border:
            2px solid #c72c2c;

          border-radius: 10px;

          background: #ffd5d5;

          font-weight: 700;
        }

        .emptyBox {
          min-height: 300px;

          display: flex;

          flex-direction: column;

          align-items: center;

          justify-content: center;

          text-align: center;
        }

        .emptyIcon {
          width: 70px;

          height: 70px;

          margin-bottom: 15px;

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

        .emptyBox h2 {
          margin:
            5px 0;
        }

        .emptyBox p {
          color: #555;
        }

        .createFirstButton {
          min-height: 52px;

          margin-top: 15px;

          padding: 0 25px;

          border-radius: 9px;
        }

        .loader {
          width: 45px;

          height: 45px;

          margin-bottom: 20px;

          border:
            5px solid #ccc;

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

        /* ================================================
           TEST LIST
        ================================================ */

        .testList {
          display: grid;

          gap: 25px;
        }

        .testCard {
          position: relative;

          padding:
            35px 28px 28px;

          overflow: hidden;

          border:
            2px solid #60676b;

          border-radius: 17px;

          background:
            linear-gradient(
              #ffffff,
              #dedede 65%,
              #c4c4c4
            );

          box-shadow:
            inset 0 5px 5px white,
            0 6px 0 #555d61,
            0 12px 18px
              rgba(0, 0, 0, 0.2);
        }

        .statusBadge {
          position: absolute;

          top: 15px;

          right: 15px;

          padding:
            8px 13px;

          border-radius: 8px;

          font-size: 12px;

          font-weight: 700;

          letter-spacing: 0.4px;
        }

        .draftBadge {
          color: #704e00;

          border:
            1px solid #b9870d;

          background: #ffe7a3;
        }

        .publishedBadge {
          color: #126033;

          border:
            1px solid #3a9660;

          background: #ccefd8;
        }

        .testHeader {
          padding-right: 170px;
        }

        .testTitleArea h2 {
          margin:
            0 0 8px;

          color: #111;

          font-size: 30px;
          font-weight: 800;
          letter-spacing: .1px;
        }

        .testTitleArea p {
          margin: 0;

          color: #07517e;

          font-size: 20px;

          font-weight: 800;
        }

        .description {
          margin-top: 20px;

          padding: 16px;
          color: #1c252b;
          font-size: 16px;
          font-weight: 600;

          border:
            1px solid #aaa;

          border-radius: 8px;

          background:
            rgba(255, 255, 255, 0.55);

          line-height: 1.5;
        }

        /* ================================================
           INFORMATION
        ================================================ */

        .testInformation {
          margin:
            25px 0;

          display: grid;

          grid-template-columns:
            repeat(4, minmax(0, 1fr));

          gap: 14px;
        }

        .infoItem {
          min-height: 90px;

          padding: 15px;

          display: flex;

          flex-direction: column;

          align-items: center;

          justify-content: center;

          border:
            1px solid #999;

          border-radius: 10px;

          background:
            rgba(255, 255, 255, 0.65);

          text-align: center;
        }

        .infoItem span {
          margin-bottom: 7px;

          color: #26343c;

          font-size: 15px;
          font-weight: 700;
        }

        .infoItem strong {
          color: #07517e;

          font-size: 23px;
          font-weight: 800;
        }

        .infoItem small {
          font-size: 13px;
        }

        .dateText {
          font-size: 15px !important;
          line-height: 1.3;
        }

        /* ================================================
           ACTIONS
        ================================================ */

        .actions {
          display: flex;

          align-items: stretch;

          gap: 11px;

          flex-wrap: wrap;
        }

        .actions button {
          min-height: 50px;

          padding:
            0 18px;

          border-radius: 9px;

          font-weight: 700;
        }

        .editButton {
          color: #674700;

          border:
            2px solid #956b00;

          background:
            linear-gradient(
              #ffe69d,
              #daa329
            );

          box-shadow:
            0 4px 0 #8a6300;
        }

        .publishButton {
          color: #0e552c;

          border:
            2px solid #277b49;

          background:
            linear-gradient(
              #b9efca,
              #5bc37d
            );

          box-shadow:
            0 4px 0 #277144;
        }

        .viewButton {
          color: #073b68;

          border:
            2px solid #174461;

          background:
            linear-gradient(
              #b5eaff,
              #59a9d8
            );

          box-shadow:
            0 4px 0 #17415c;
        }

        .draftButton {
          color: #624900;

          border:
            2px solid #8d710e;

          background:
            linear-gradient(
              #fff2b9,
              #d7b850
            );

          box-shadow:
            0 4px 0 #806811;
        }

        .saveButton {
          color: #125c32;

          border:
            2px solid #267446;

          background:
            linear-gradient(
              #c4f2d2,
              #68c988
            );

          box-shadow:
            0 4px 0 #266c42;
        }

        .deleteButton {
          margin-left: auto;

          color: white;

          border:
            2px solid #8e1515;

          background:
            linear-gradient(
              #f66d6d,
              #c62424
            );

          box-shadow:
            0 4px 0 #831515;
        }

        /* ================================================
           BOTTOM CREATE
        ================================================ */

        .bottomCreate {
          width: min(1500px, 96%);

          margin: 0 auto;

          text-align: center;
        }

        .bottomCreate button {
          min-width: 330px;

          min-height: 65px;

          padding:
            0 30px;

          color: #073b68;

          border:
            3px solid #174461;

          border-radius: 13px;

          background:
            linear-gradient(
              #b6ebff,
              #58a8d7
            );

          box-shadow:
            inset 0 5px 5px
              rgba(255, 255, 255, 0.6),
            0 5px 0 #17415c;

          font-size: 20px;

          font-weight: 800;
        }

        .bottomCreate span {
          margin-right: 8px;

          font-size: 28px;

          vertical-align: middle;
        }

        .headerActions button {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          line-height: 1.12;
        }

        .buttonMain {
          font-size: 16px;
          font-weight: 900;
        }

        .buttonSub {
          margin-top: 4px;
          font-size: 12px;
          font-weight: 700;
          opacity: 1;
          color: #26343c;
        }

        .actions button {
          position: relative;
          min-width: 170px;
          min-height: 62px;
          padding: 8px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          line-height: 1.12;
          transition: transform .12s ease, filter .12s ease, box-shadow .12s ease;
        }

        .actions button:hover {
          filter: brightness(1.04);
          transform: translateY(-1px);
        }

        .actions button:active {
          transform: translateY(3px);
          box-shadow: 0 1px 0 rgba(0,0,0,.45) !important;
        }

        .actionMain {
          display: block;
          font-size: 16px;
          font-weight: 900;
        }

        .actionSub {
          display: block;
          margin-top: 4px;
          font-size: 12px;
          font-weight: 700;
          opacity: 1;
          color: #26343c;
        }

        /* ===============================
           Yozuvlarni tiniq va aniq ko‘rsatish
        =============================== */
        .page,
        .page button,
        .page input {
          -webkit-font-smoothing: antialiased;
          text-rendering: geometricPrecision;
        }

        .testCard,
        .statCard,
        .infoItem,
        .actions button,
        .headerActions button {
          text-shadow: none;
        }

        .buttonMain,
        .actionMain,
        .testTitleArea h2,
        .testTitleArea p,
        .infoItem strong {
          opacity: 1;
          text-shadow: 0 1px 0 rgba(255,255,255,.35);
        }

        .buttonSub,
        .actionSub,
        .description,
        .infoItem span,
        .dateText {
          opacity: 1;
          color: #26343c;
          text-shadow: none;
        }

        .exportOverlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          padding: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(4, 20, 30, .62);
          backdrop-filter: blur(6px);
        }

        .exportModal {
          width: min(540px, 100%);
          padding: 26px;
          border: 3px solid #303538;
          border-radius: 22px;
          background: linear-gradient(145deg, #f8f8f8, #d2d2d2);
          box-shadow:
            inset 0 6px 5px rgba(255,255,255,.95),
            0 7px 0 #555d61,
            0 20px 45px rgba(0,0,0,.35);
          text-align: center;
        }

        .exportTitle {
          margin-bottom: 12px;
          padding: 14px 16px;
          border: 2px solid #174461;
          border-radius: 13px;
          background: linear-gradient(#b6ebff, #58a8d7);
          box-shadow: inset 0 5px 5px rgba(255,255,255,.7), 0 4px 0 #17415c;
          color: #073b68;
        }

        .exportTitle span,
        .exportTitle strong {
          display: block;
        }

        .exportTitle span {
          font-size: 13px;
          letter-spacing: .7px;
          text-transform: uppercase;
        }

        .exportTitle strong {
          margin-top: 4px;
          font-size: 23px;
        }

        .exportModal p {
          margin: 18px 0;
          color: #444;
        }

        .exportChoices {
          display: grid;
          grid-template-columns: repeat(2, minmax(0,1fr));
          gap: 14px;
        }

        .exportChoices button {
          min-height: 92px;
          padding: 12px;
          border-radius: 13px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 5px 0 rgba(0,0,0,.28);
          font-weight: 700;
        }

        .pdfChoice {
          border: 2px solid #8e1515;
          background: linear-gradient(#ffd1d1, #ed7777);
          color: #7b1111;
        }

        .wordChoice {
          border: 2px solid #174461;
          background: linear-gradient(#c9f1ff, #64b6e1);
          color: #073b68;
        }

        .choiceMain {
          font-size: 24px;
          font-weight: 900;
        }

        .choiceSub {
          margin-top: 5px;
          font-size: 11px;
          line-height: 1.3;
        }

        .cancelExport {
          width: 100%;
          min-height: 46px;
          margin-top: 18px;
          border: 2px solid #555;
          border-radius: 10px;
          background: linear-gradient(#fff, #bbb);
          box-shadow: 0 4px 0 #555;
          font-weight: 800;
        }

        .answerChoices {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .answerChoices button {
          min-height: 92px;
          padding: 12px;
          border-radius: 13px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 5px 0 rgba(0,0,0,.28);
          font-weight: 800;
        }

        .withAnswersChoice {
          border: 2px solid #267446;
          background: linear-gradient(#d8f8e2, #74cf92);
          color: #104d2b;
        }

        .withoutAnswersChoice {
          border: 2px solid #174461;
          background: linear-gradient(#d8f3ff, #73bce2);
          color: #073b68;
        }

        .backExport {
          width: 100%;
          min-height: 44px;
          margin-top: 14px;
          border: 2px solid #6a6a6a;
          border-radius: 10px;
          background: linear-gradient(#fff, #d3d3d3);
          box-shadow: 0 3px 0 #666;
          color: #202020;
          font-weight: 800;
        }

        /* Matnlarni xira ko‘rinishdan chiqarish */
        .page,
        .page button,
        .page input {
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }

        .testTitleArea h2,
        .testTitleArea p,
        .description,
        .infoItem span,
        .infoItem strong,
        .actionMain,
        .actionSub,
        .buttonMain,
        .buttonSub,
        .statCard span,
        .exportModal {
          text-shadow: none;
          opacity: 1;
        }

        .description,
        .infoItem span,
        .actionSub,
        .buttonSub {
          color: #26343c;
        }

        .actionSub,
        .buttonSub {
          font-weight: 700;
          opacity: .92;
        }

        /* ================================================
           RESPONSIVE
        ================================================ */

        @media (max-width: 1000px) {
          .header {
            flex-direction: column;
          }

          .headerTitle {
            width: 100%;
            min-width: 0;
          }

          .headerActions {
            width: 100%;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .headerActions button {
            width: 100%;
          }

          .testInformation {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 700px) {
          .testTitleArea h2 { font-size: 24px; line-height: 1.2; }
          .testTitleArea p { font-size: 17px; line-height: 1.25; }
          .description { font-size: 15px; line-height: 1.45; }
          .infoItem span { font-size: 14px; }
          .infoItem strong { font-size: 21px; }
          .dateText { font-size: 14px !important; }
          .buttonMain, .actionMain { font-size: 15px; }
          .buttonSub, .actionSub { font-size: 11px; line-height: 1.25; }
          .page {
            padding: 9px 6px 60px;
          }

          .header {
            width: 99%;
            min-height: auto;
            padding: 13px 11px;
            gap: 12px;
            border-radius: 18px;
          }

          .headerTitle {
            min-height: 78px;
            padding: 10px 12px;
            border-width: 2px;
            border-radius: 13px;
          }

          .headerTitle span {
            font-size: 11px;
          }

          .headerTitle strong {
            font-size: 22px;
          }

          .headerActions {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
          }

          .headerActions button {
            min-height: 55px;
            padding: 6px 8px;
            border-radius: 9px;
          }

          .buttonMain {
            font-size: 13px;
          }

          .buttonSub {
            font-size: 9px;
          }

          .mainBox {
            width: 99%;
            margin-top: 66px;
            padding: 54px 9px 16px;
            border-radius: 19px;
          }

          .floatingTitle {
            top: -27px;
            min-width: 210px;
            min-height: 51px;
            padding: 7px 18px;
            border-width: 2px;
            border-radius: 12px;
            font-size: 21px;
          }

          .statistics {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 7px;
            margin-bottom: 15px;
          }

          .statCard {
            min-height: 82px;
            padding: 9px 5px;
            border-width: 2px;
            border-radius: 10px;
            box-shadow: inset 0 4px 4px white, 0 3px 0 #555d61;
          }

          .statCard strong {
            margin-bottom: 2px;
            font-size: 25px;
          }

          .statCard span {
            font-size: 12px;
            line-height: 1.12;
          }

          .searchArea {
            margin-bottom: 15px;
            padding: 10px;
            flex-direction: column;
            gap: 8px;
            border-radius: 11px;
          }

          .searchInputBox input {
            height: 46px;
            padding-left: 12px;
            font-size: 14px;
          }

          .refreshButton {
            min-height: 42px;
          }

          .contentBox {
            min-height: 180px;
            padding: 8px;
            border-radius: 13px;
          }

          .testList {
            gap: 14px;
          }

          .testCard {
            padding: 52px 10px 14px;
            border-radius: 13px;
            box-shadow: inset 0 4px 4px white, 0 4px 0 #555d61, 0 8px 12px rgba(0,0,0,.15);
          }

          .statusBadge {
            top: 10px;
            right: 10px;
            padding: 6px 9px;
            font-size: 10px;
          }

          .testHeader {
            padding-right: 0;
          }

          .testTitleArea h2 {
            margin-bottom: 4px;
            font-size: 23px;
          }

          .testTitleArea p {
            font-size: 15px;
          }

          .description {
            margin-top: 12px;
            padding: 10px;
            font-size: 13px;
          }

          .testInformation {
            margin: 14px 0;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 7px;
          }

          .infoItem {
            min-height: 78px;
            padding: 8px 5px;
            border-radius: 9px;
          }

          .infoItem span {
            margin-bottom: 4px;
            font-size: 11px;
          }

          .infoItem strong {
            font-size: 18px;
            line-height: 1.15;
          }

          .dateText {
            font-size: 12px !important;
          }

          .actions {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
          }

          .actions button {
            width: 100%;
            min-width: 0;
            min-height: 58px;
            margin-left: 0;
            padding: 7px 6px;
            border-radius: 9px;
          }

          .actionMain {
            font-size: 13px;
          }

          .actionSub {
            font-size: 9px;
            line-height: 1.16;
          }

          .deleteButton {
            grid-column: 1 / -1;
          }

          .bottomCreate {
            width: 99%;
          }

          .bottomCreate button {
            width: 100%;
            min-width: 0;
            min-height: 53px;
            font-size: 15px;
          }

          .exportModal {
            padding: 18px 13px;
            border-radius: 17px;
          }

          .exportChoices,
          .answerChoices {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .exportChoices button {
            min-height: 76px;
          }
        }

        @media (max-width: 420px) {
          .headerActions {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .statistics {
            gap: 5px;
          }

          .statCard strong {
            font-size: 22px;
          }

          .statCard span {
            font-size: 10px;
          }

          .actions {
            grid-template-columns: 1fr;
          }

          .deleteButton {
            grid-column: auto;
          }
        }
      `}</style>
    </main>
  );
}
