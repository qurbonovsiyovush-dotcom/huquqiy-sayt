"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams } from "next/navigation";

type OptionData = {
  id: string;
  key: string;
  text: string;
  html: string;
  isCorrect: boolean;
  sortOrder: number;
};

type AcceptedAnswer = {
  id: string;
  answerText: string;
  normalizedAnswer: string;
};

type QuestionData = {
  id: string;
  questionNumber: number;
  questionType: "closed" | "open";
  questionText: string;
  questionHtml: string;
  points: number;
  answered: boolean;
  isCorrect: boolean | null;
  awardedPoints: number;
  answeredAt: string | null;
  selectedOption: OptionData | null;
  openAnswerText: string;
  correctOption: OptionData | null;
  acceptedAnswers: AcceptedAnswer[];
  options: OptionData[];
};

type ResultData = {
  attemptId: string;
  testId: string;
  testTitle: string;
  testDescription: string;
  userName: string;
  status: string;
  durationMinutes: number;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  rawScore: number;
  percentage: number;
  startedAt: string | null;
  submittedAt: string | null;
  questions: QuestionData[];
};

function formatNumber(value: number) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  if (Number.isInteger(value)) {
    return String(value);
  }

  return value
    .toFixed(3)
    .replace(/0+$/, "")
    .replace(/\.$/, "");
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleString(
    "uz-UZ",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }
  );
}

export default function NationalCertificateDetailedResultPage() {
  const params = useParams();

  const attemptId =
    typeof params?.attemptId ===
    "string"
      ? params.attemptId
      : "";

  const [result, setResult] =
    useState<ResultData | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [isExportingPdf, setIsExportingPdf] =
    useState(false);

  const pdfContentRef =
    useRef<HTMLDivElement | null>(null);

  const [filter, setFilter] =
    useState<
      | "all"
      | "correct"
      | "incorrect"
      | "unanswered"
    >("all");

  const loadResult =
    useCallback(async () => {
      if (!attemptId) {
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response =
          await fetch(
            `/api/national-certificate/admin/results/${attemptId}`,
            {
              method: "GET",
              cache: "no-store",
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Natijani yuklab bo‘lmadi."
          );
        }

        setResult(
          data.result as ResultData
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Natijani yuklashda xatolik yuz berdi."
        );
      } finally {
        setLoading(false);
      }
    }, [attemptId]);

  useEffect(() => {
    loadResult();
  }, [loadResult]);

  const saveAsPdf =
    useCallback(async () => {
      if (
        !result ||
        !pdfContentRef.current ||
        isExportingPdf
      ) {
        return;
      }

      setIsExportingPdf(true);
      setError("");

      try {
        /*
         * PDF har doim 45 ta savolni olishi uchun
         * avval "Barchasi" filtriga qaytamiz.
         */
        if (filter !== "all") {
          setFilter("all");

          await new Promise<void>(
            (resolve) => {
              requestAnimationFrame(
                () => {
                  requestAnimationFrame(
                    () => resolve()
                  );
                }
              );
            }
          );
        }

        /*
         * Web-fontlar bo‘lsa, yuklanishini kutamiz.
         */
        if (
          typeof document !== "undefined" &&
          "fonts" in document
        ) {
          try {
            await (
              document as Document & {
                fonts: FontFaceSet;
              }
            ).fonts.ready;
          } catch {
            // Font kutish xatosi PDFni to‘xtatmaydi.
          }
        }

        const [
          html2canvasModule,
          jsPdfModule,
        ] = await Promise.all([
          import("html2canvas"),
          import("jspdf"),
        ]);

        const html2canvas =
          html2canvasModule.default;

        const jsPDF =
          jsPdfModule.jsPDF;

        const element =
          pdfContentRef.current;

        if (!element) {
          throw new Error(
            "PDF uchun natija paneli topilmadi."
          );
        }

        /*
         * Saytdagi 3D ko‘rinishni aynan capture qilamiz.
         * scale=2 matn va soyalarni aniqroq qiladi.
         */
        const canvas =
          await html2canvas(
            element,
            {
              scale: 2,
              useCORS: true,
              allowTaint: false,
              backgroundColor:
                "#eef2f6",
              logging: false,
              scrollX: 0,
              scrollY:
                -window.scrollY,
              windowWidth:
                document.documentElement
                  .scrollWidth,
              windowHeight:
                document.documentElement
                  .scrollHeight,
            }
          );

        const imageData =
          canvas.toDataURL(
            "image/jpeg",
            0.96
          );

        /*
         * A4 portrait.
         * Uzun panel A4 sahifalarga ketma-ket bo‘linadi.
         */
        const pdf =
          new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4",
            compress: true,
          });

        const pageWidth =
          pdf.internal.pageSize.getWidth();

        const pageHeight =
          pdf.internal.pageSize.getHeight();

        const margin = 6;

        const printableWidth =
          pageWidth -
          margin * 2;

        const printableHeight =
          pageHeight -
          margin * 2;

        const imageWidth =
          printableWidth;

        const imageHeight =
          (canvas.height *
            imageWidth) /
          canvas.width;

        let heightLeft =
          imageHeight;

        let positionY =
          margin;

        pdf.addImage(
          imageData,
          "JPEG",
          margin,
          positionY,
          imageWidth,
          imageHeight,
          undefined,
          "FAST"
        );

        heightLeft -=
          printableHeight;

        while (heightLeft > 0) {
          pdf.addPage();

          positionY =
            margin -
            (imageHeight -
              heightLeft);

          pdf.addImage(
            imageData,
            "JPEG",
            margin,
            positionY,
            imageWidth,
            imageHeight,
            undefined,
            "FAST"
          );

          heightLeft -=
            printableHeight;
        }

        const safeName =
          result.userName
            .trim()
            .replace(
              /[<>:"/\\|?*\u0000-\u001F]/g,
              ""
            )
            .replace(/\s+/g, "-")
            .slice(0, 80) ||
          "Foydalanuvchi";

        const safeTest =
          result.testTitle
            .trim()
            .replace(
              /[<>:"/\\|?*\u0000-\u001F]/g,
              ""
            )
            .replace(/\s+/g, "-")
            .slice(0, 80) ||
          "Milliy-sertifikat";

        pdf.save(
          `${safeName}-${safeTest}-natija.pdf`
        );
      } catch (err) {
        console.error(
          "PDF export error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "PDFni saqlashda xatolik yuz berdi."
        );
      } finally {
        setIsExportingPdf(false);
      }
    }, [
      result,
      filter,
      isExportingPdf,
    ]);

  const filteredQuestions =
    useMemo(() => {
      if (!result) {
        return [];
      }

      if (filter === "all") {
        return result.questions;
      }

      if (
        filter === "correct"
      ) {
        return result.questions.filter(
          (question) =>
            question.answered &&
            question.isCorrect === true
        );
      }

      if (
        filter === "incorrect"
      ) {
        return result.questions.filter(
          (question) =>
            question.answered &&
            question.isCorrect === false
        );
      }

      return result.questions.filter(
        (question) =>
          !question.answered
      );
    }, [result, filter]);

  if (loading) {
    return (
      <main className="detailPage">
        <div className="centerState">
          <div className="loader" />
          <h2>
            Batafsil natija
            yuklanmoqda...
          </h2>
        </div>

        <PageStyles />
      </main>
    );
  }

  if (
    error ||
    !result
  ) {
    return (
      <main className="detailPage">
        <div className="errorState">
          <div className="errorIcon">
            !
          </div>

          <h1>
            Natijani ochib
            bo‘lmadi
          </h1>

          <p>
            {error ||
              "Natija topilmadi."}
          </p>

          <button
            type="button"
            className="primaryButton"
            onClick={
              loadResult
            }
          >
            Qayta urinish
          </button>
        </div>

        <PageStyles />
      </main>
    );
  }

  return (
    <main className="detailPage">
      <div className="pageInner">
        <div className="topActions">
          <a
            href="/admin/results/national-certificate"
            className="backLink"
          >
            ← Natijalarga qaytish
          </a>

          <div className="actionButtons">
            <button
              type="button"
              className="pdfButton"
              onClick={saveAsPdf}
              disabled={isExportingPdf}
            >
              {isExportingPdf
                ? "PDF tayyorlanmoqda..."
                : "PDF saqlash"}
            </button>

            <button
              type="button"
              className="refreshButton"
              onClick={loadResult}
              disabled={isExportingPdf}
            >
              Yangilash
            </button>
          </div>
        </div>

        <div
          ref={pdfContentRef}
          className="pdfContent"
        >
        <section className="heroCard">
          <div className="heroLeft">
            <div className="eyebrow">
              Milliy sertifikat
            </div>

            <h1>
              {result.userName}
            </h1>

            <h2>
              {result.testTitle}
            </h2>

            {result.testDescription && (
              <p>
                {
                  result.testDescription
                }
              </p>
            )}
          </div>

          <div className="heroResult">
            <strong>
              {formatNumber(
                result.percentage
              )}
              %
            </strong>

            <span>
              Umumiy natija
            </span>
          </div>
        </section>

        <section className="statsGrid">
          <div className="statCard">
            <span>
              To‘g‘ri
            </span>

            <strong className="greenText">
              {
                result.correctCount
              }
            </strong>
          </div>

          <div className="statCard">
            <span>
              Noto‘g‘ri
            </span>

            <strong className="redText">
              {
                result.incorrectCount
              }
            </strong>
          </div>

          <div className="statCard">
            <span>
              Javobsiz
            </span>

            <strong>
              {
                result.unansweredCount
              }
            </strong>
          </div>

          <div className="statCard">
            <span>
              Ball
            </span>

            <strong>
              {formatNumber(
                result.rawScore
              )}
              /
              {
                result.totalQuestions
              }
            </strong>
          </div>
        </section>

        <section className="infoCard">
          <div>
            <span>
              Boshlangan
            </span>

            <strong>
              {formatDate(
                result.startedAt
              )}
            </strong>
          </div>

          <div>
            <span>
              Yakunlangan
            </span>

            <strong>
              {formatDate(
                result.submittedAt
              )}
            </strong>
          </div>

          <div>
            <span>
              Ajratilgan vaqt
            </span>

            <strong>
              {
                result.durationMinutes
              }{" "}
              daqiqa
            </strong>
          </div>

          <div>
            <span>
              Holat
            </span>

            <strong>
              {result.status ===
              "submitted"
                ? "Yakunlangan"
                : result.status ===
                  "expired"
                ? "Vaqti tugagan"
                : result.status}
            </strong>
          </div>
        </section>

        <section className="filterCard">
          <button
            type="button"
            className={
              filter === "all"
                ? "filterButton active"
                : "filterButton"
            }
            onClick={() =>
              setFilter("all")
            }
          >
            Barchasi{" "}
            <span>
              {
                result.questions
                  .length
              }
            </span>
          </button>

          <button
            type="button"
            className={
              filter ===
              "correct"
                ? "filterButton active"
                : "filterButton"
            }
            onClick={() =>
              setFilter(
                "correct"
              )
            }
          >
            To‘g‘ri{" "}
            <span>
              {
                result.correctCount
              }
            </span>
          </button>

          <button
            type="button"
            className={
              filter ===
              "incorrect"
                ? "filterButton active"
                : "filterButton"
            }
            onClick={() =>
              setFilter(
                "incorrect"
              )
            }
          >
            Noto‘g‘ri{" "}
            <span>
              {
                result.incorrectCount
              }
            </span>
          </button>

          <button
            type="button"
            className={
              filter ===
              "unanswered"
                ? "filterButton active"
                : "filterButton"
            }
            onClick={() =>
              setFilter(
                "unanswered"
              )
            }
          >
            Javobsiz{" "}
            <span>
              {
                result.unansweredCount
              }
            </span>
          </button>
        </section>

        <section className="questionsSection">
          <div className="sectionTitle">
            <div>
              <h2>
                Savollar bo‘yicha
                natija
              </h2>

              <p>
                {
                  filteredQuestions.length
                }{" "}
                ta savol
                ko‘rsatilmoqda
              </p>
            </div>
          </div>

          <div className="questionsList">
            {filteredQuestions.map(
              (question) => {
                const statusClass =
                  !question.answered
                    ? "unanswered"
                    : question.isCorrect
                    ? "correct"
                    : "incorrect";

                const statusText =
                  !question.answered
                    ? "Javobsiz"
                    : question.isCorrect
                    ? "To‘g‘ri"
                    : "Noto‘g‘ri";

                return (
                  <article
                    key={
                      question.id
                    }
                    className={`questionCard ${statusClass}`}
                  >
                    <div className="questionTop">
                      <div className="questionInfo">
                        <span className="questionNumber">
                          {
                            question.questionNumber
                          }
                          -savol
                        </span>

                        <span className="questionType">
                          {question.questionType ===
                          "closed"
                            ? "Yopiq savol"
                            : "Ochiq savol"}
                        </span>
                      </div>

                      <div className={`statusBadge ${statusClass}`}>
                        {
                          statusText
                        }
                      </div>
                    </div>

                    {question.questionHtml ? (
                      <div
                        className="questionText htmlContent"
                        dangerouslySetInnerHTML={{
                          __html:
                            question.questionHtml,
                        }}
                      />
                    ) : (
                      <div className="questionText">
                        {
                          question.questionText
                        }
                      </div>
                    )}

                    {question.questionType ===
                    "closed" ? (
                      <div className="optionsList">
                        {question.options.map(
                          (
                            option
                          ) => {
                            const isSelected =
                              question
                                .selectedOption
                                ?.id ===
                              option.id;

                            const isCorrect =
                              option.isCorrect;

                            const classes =
                              [
                                "optionRow",
                                isSelected
                                  ? "selected"
                                  : "",
                                isCorrect
                                  ? "correctOption"
                                  : "",
                                isSelected &&
                                !isCorrect
                                  ? "wrongSelected"
                                  : "",
                              ]
                                .filter(
                                  Boolean
                                )
                                .join(
                                  " "
                                );

                            return (
                              <div
                                key={
                                  option.id
                                }
                                className={
                                  classes
                                }
                              >
                                <span className="optionKey">
                                  {
                                    option.key
                                  }
                                </span>

                                <div className="optionContent">
                                  {option.html ? (
                                    <div
                                      className="htmlContent"
                                      dangerouslySetInnerHTML={{
                                        __html:
                                          option.html,
                                      }}
                                    />
                                  ) : (
                                    <span>
                                      {
                                        option.text
                                      }
                                    </span>
                                  )}
                                </div>

                                <div className="optionMarks">
                                  {isSelected && (
                                    <span className="selectedLabel">
                                      Foydalanuvchi
                                    </span>
                                  )}

                                  {isCorrect && (
                                    <span className="correctLabel">
                                      To‘g‘ri javob
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    ) : (
                      <div className="openResult">
                        <div className="answerBox userAnswer">
                          <span>
                            Foydalanuvchi
                            javobi
                          </span>

                          <strong>
                            {question.openAnswerText
                              ? question.openAnswerText
                              : "Javob berilmagan"}
                          </strong>
                        </div>

                        <div className="answerBox correctAnswer">
                          <span>
                            Qabul qilinadigan
                            javoblar
                          </span>

                          <div className="acceptedList">
                            {question.acceptedAnswers.length >
                            0 ? (
                              question.acceptedAnswers.map(
                                (
                                  answer
                                ) => (
                                  <strong
                                    key={
                                      answer.id
                                    }
                                  >
                                    {
                                      answer.answerText
                                    }
                                  </strong>
                                )
                              )
                            ) : (
                              <strong>
                                —
                              </strong>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="questionFooter">
                      <span>
                        Berilgan ball:
                      </span>

                      <strong>
                        {formatNumber(
                          question.awardedPoints
                        )}
                        /
                        {formatNumber(
                          question.points
                        )}
                      </strong>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        </section>
        </div>
      </div>

      <PageStyles />
    </main>
  );
}

function PageStyles() {
  return (
    <style jsx global>{`
      * {
        box-sizing: border-box;
      }

      html {
        background: #f3f5f7;
      }

      body {
        margin: 0;
        background:
          radial-gradient(
            circle at 50% 0%,
            rgba(255, 255, 255, 0.96) 0%,
            rgba(245, 247, 249, 0.96) 34%,
            #edf1f4 100%
          );
        color: #132035;
        font-family:
          "Times New Roman",
          Georgia,
          serif;
      }

      button,
      input,
      textarea,
      select {
        font: inherit;
      }

      .detailPage {
        min-height: 100vh;
        padding: 18px 0 70px;
        background:
          linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.88) 0%,
            rgba(238, 242, 246, 0.94) 100%
          );
      }

      .pageInner {
        width: min(96%, 1320px);
        margin: 0 auto;
        padding: 12px 0 60px;
      }

      .topActions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        margin-bottom: 18px;
        padding: 12px 14px;
        border: 2px solid #25394a;
        border-radius: 18px;
        background:
          linear-gradient(
            180deg,
            #72c7f3 0%,
            #49a9df 48%,
            #2684ba 100%
          );
        box-shadow:
          inset 0 2px 0 rgba(255, 255, 255, 0.72),
          inset 0 -7px 0 rgba(14, 68, 103, 0.28),
          0 7px 0 #174d6d,
          0 13px 22px rgba(20, 37, 51, 0.2);
      }

      .backLink,
      .refreshButton,
      .pdfButton,
      .primaryButton {
        min-height: 44px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 10px 18px;
        border: 2px solid #3b4a56;
        border-radius: 12px;
        color: #102138;
        font-weight: 900;
        text-decoration: none;
        cursor: pointer;
        background:
          linear-gradient(
            180deg,
            #ffffff 0%,
            #f0f0f0 42%,
            #c8c8c8 100%
          );
        box-shadow:
          inset 0 2px 0 rgba(255, 255, 255, 0.9),
          inset 0 -4px 0 rgba(68, 68, 68, 0.22),
          0 5px 0 #4c555b,
          0 8px 12px rgba(0, 0, 0, 0.16);
        transition:
          transform 0.12s ease,
          box-shadow 0.12s ease,
          filter 0.12s ease;
      }

      .refreshButton,
      .pdfButton,
      .primaryButton {
        border-color: #123f5c;
        color: #0d2a44;
        background:
          linear-gradient(
            180deg,
            #8ed7ff 0%,
            #55b9ee 45%,
            #2e8fc5 100%
          );
        box-shadow:
          inset 0 2px 0 rgba(255, 255, 255, 0.76),
          inset 0 -4px 0 rgba(10, 64, 98, 0.28),
          0 5px 0 #155779,
          0 8px 13px rgba(0, 0, 0, 0.17);
      }

      .backLink:hover,
      .refreshButton:hover,
      .pdfButton:hover,
      .primaryButton:hover {
        transform: translateY(-1px);
        filter: brightness(1.025);
      }

      .backLink:active,
      .refreshButton:active,
      .pdfButton:active,
      .primaryButton:active {
        transform: translateY(4px);
        box-shadow:
          inset 0 2px 0 rgba(255, 255, 255, 0.7),
          inset 0 -2px 0 rgba(0, 0, 0, 0.18),
          0 1px 0 #4b565d,
          0 3px 7px rgba(0, 0, 0, 0.15);
      }

      .actionButtons {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .pdfButton {
        border-color: #28502f;
        color: #17361d;
        background:
          linear-gradient(
            180deg,
            #c9f2d1 0%,
            #83d394 45%,
            #4ca966 100%
          );
        box-shadow:
          inset 0 2px 0 rgba(255, 255, 255, 0.76),
          inset 0 -4px 0 rgba(34, 103, 49, 0.25),
          0 5px 0 #357645,
          0 8px 13px rgba(0, 0, 0, 0.17);
      }

      .refreshButton:disabled,
      .pdfButton:disabled,
      .primaryButton:disabled {
        cursor: wait;
        opacity: 0.72;
      }

      .pdfContent {
        width: 100%;
      }

      .heroCard {
        position: relative;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 28px;
        padding: 34px 36px;
        border: 3px solid #30383d;
        border-radius: 24px;
        background:
          linear-gradient(
            180deg,
            #686d71 0%,
            #555a5d 45%,
            #42474a 100%
          );
        color: #ffffff;
        box-shadow:
          inset 0 3px 0 rgba(255, 255, 255, 0.18),
          inset 0 -9px 0 rgba(0, 0, 0, 0.2),
          0 9px 0 #2d3235,
          0 17px 28px rgba(21, 31, 39, 0.25);
        overflow: hidden;
      }

      .heroCard::before {
        content: "";
        position: absolute;
        inset: 0 0 auto;
        height: 38%;
        background:
          linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.16),
            rgba(255, 255, 255, 0)
          );
        pointer-events: none;
      }

      .heroLeft,
      .heroResult {
        position: relative;
        z-index: 1;
      }

      .heroLeft {
        min-width: 0;
      }

      .eyebrow {
        display: inline-flex;
        align-items: center;
        min-height: 34px;
        margin-bottom: 10px;
        padding: 6px 16px;
        border: 2px solid #143f58;
        border-radius: 12px;
        background:
          linear-gradient(
            180deg,
            #87d8ff 0%,
            #4cb7ec 48%,
            #2686bd 100%
          );
        color: #0e3857;
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        text-shadow: 0 1px 0 rgba(255, 255, 255, 0.65);
        box-shadow:
          inset 0 2px 0 rgba(255, 255, 255, 0.75),
          inset 0 -4px 0 rgba(17, 75, 108, 0.25),
          0 4px 0 #1d607f;
      }

      .heroCard h1 {
        margin: 7px 0 0;
        font-size: clamp(27px, 4vw, 42px);
        line-height: 1.12;
        color: #ffffff;
        text-shadow:
          0 2px 0 #1d252a,
          0 4px 8px rgba(0, 0, 0, 0.25);
      }

      .heroCard h2 {
        margin: 14px 0 0;
        color: #edf8ff;
        font-size: 20px;
        text-shadow: 0 1px 0 rgba(0, 0, 0, 0.45);
      }

      .heroCard p {
        margin: 10px 0 0;
        color: #d7e2e8;
        font-size: 15px;
      }

      .heroResult {
        flex: 0 0 164px;
        width: 164px;
        height: 164px;
        display: grid;
        place-content: center;
        text-align: center;
        border: 4px solid #173f58;
        border-radius: 50%;
        background:
          radial-gradient(
            circle at 34% 28%,
            #d9f2ff 0%,
            #93d6f8 26%,
            #4aaee1 62%,
            #2f84b4 100%
          );
        color: #0a2940;
        box-shadow:
          inset 0 7px 12px rgba(255, 255, 255, 0.65),
          inset 0 -12px 15px rgba(13, 73, 108, 0.25),
          0 7px 0 #143f58,
          0 14px 24px rgba(0, 0, 0, 0.28);
      }

      .heroResult strong {
        font-size: 31px;
        text-shadow: 0 1px 0 rgba(255, 255, 255, 0.7);
      }

      .heroResult span {
        margin-top: 5px;
        color: #234861;
        font-size: 11px;
        font-weight: 800;
      }

      .statsGrid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 16px;
        margin-top: 24px;
      }

      .statCard {
        position: relative;
        min-height: 112px;
        padding: 19px 20px;
        border: 2px solid #465159;
        border-radius: 16px;
        background:
          linear-gradient(
            180deg,
            #ffffff 0%,
            #f0f0f0 48%,
            #c9ccce 100%
          );
        box-shadow:
          inset 0 2px 0 rgba(255, 255, 255, 0.95),
          inset 0 -5px 0 rgba(62, 70, 75, 0.18),
          0 6px 0 #59636a,
          0 11px 17px rgba(0, 0, 0, 0.14);
      }

      .statCard span {
        display: block;
        margin-bottom: 9px;
        color: #596573;
        font-size: 13px;
        font-weight: 800;
      }

      .statCard strong {
        font-size: 27px;
        color: #172334;
        text-shadow: 0 1px 0 #fff;
      }

      .greenText {
        color: #1f7a40 !important;
      }

      .redText {
        color: #a22e2e !important;
      }

      .infoCard {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 14px;
        margin-top: 24px;
        padding: 18px;
        border: 2px solid #3d474e;
        border-radius: 18px;
        background:
          linear-gradient(
            180deg,
            #6a6f73 0%,
            #555b5f 48%,
            #454a4d 100%
          );
        box-shadow:
          inset 0 2px 0 rgba(255, 255, 255, 0.18),
          inset 0 -6px 0 rgba(0, 0, 0, 0.16),
          0 7px 0 #343a3e,
          0 13px 20px rgba(0, 0, 0, 0.17);
      }

      .infoCard > div {
        min-width: 0;
        padding: 13px 14px;
        border: 1px solid #c6ccd0;
        border-radius: 12px;
        background:
          linear-gradient(
            180deg,
            #ffffff 0%,
            #eceeef 52%,
            #c8cccf 100%
          );
        box-shadow:
          inset 0 2px 0 rgba(255, 255, 255, 0.95),
          inset 0 -3px 0 rgba(59, 66, 70, 0.15),
          0 4px 0 #545e64;
      }

      .infoCard span {
        display: block;
        margin-bottom: 6px;
        color: #68727d;
        font-size: 11px;
        font-weight: 800;
      }

      .infoCard strong {
        color: #172334;
        font-size: 14px;
      }

      .filterCard {
        display: flex;
        flex-wrap: wrap;
        gap: 11px;
        margin-top: 26px;
        padding: 16px;
        border: 2px solid #30404b;
        border-radius: 17px;
        background:
          linear-gradient(
            180deg,
            #5e6468 0%,
            #4b5155 100%
          );
        box-shadow:
          inset 0 2px 0 rgba(255, 255, 255, 0.15),
          inset 0 -5px 0 rgba(0, 0, 0, 0.14),
          0 6px 0 #343b40,
          0 11px 18px rgba(0, 0, 0, 0.16);
      }

      .filterButton {
        min-height: 40px;
        border: 2px solid #4d5960;
        border-radius: 12px;
        padding: 8px 15px;
        background:
          linear-gradient(
            180deg,
            #ffffff 0%,
            #eeeeee 48%,
            #c7c9cb 100%
          );
        color: #172638;
        cursor: pointer;
        font-weight: 900;
        box-shadow:
          inset 0 2px 0 rgba(255, 255, 255, 0.9),
          inset 0 -3px 0 rgba(60, 66, 70, 0.16),
          0 4px 0 #59636a;
        transition:
          transform 0.12s ease,
          box-shadow 0.12s ease,
          filter 0.12s ease;
      }

      .filterButton span {
        margin-left: 5px;
        opacity: 0.72;
      }

      .filterButton:hover {
        filter: brightness(1.02);
        transform: translateY(-1px);
      }

      .filterButton:active {
        transform: translateY(3px);
        box-shadow:
          inset 0 2px 0 rgba(255, 255, 255, 0.8),
          0 1px 0 #59636a;
      }

      .filterButton.active {
        border-color: #154864;
        background:
          linear-gradient(
            180deg,
            #8ed8ff 0%,
            #52b6e9 45%,
            #2b87bb 100%
          );
        color: #0f3148;
        box-shadow:
          inset 0 2px 0 rgba(255, 255, 255, 0.75),
          inset 0 -4px 0 rgba(19, 78, 112, 0.25),
          0 5px 0 #155878;
      }

      .questionsSection {
        margin-top: 30px;
      }

      .sectionTitle {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding: 15px 18px;
        border: 2px solid #133d57;
        border-radius: 15px;
        background:
          linear-gradient(
            180deg,
            #84d6ff 0%,
            #4eb6ea 48%,
            #2b88bd 100%
          );
        color: #11344d;
        box-shadow:
          inset 0 2px 0 rgba(255, 255, 255, 0.7),
          inset 0 -5px 0 rgba(17, 73, 106, 0.26),
          0 6px 0 #175a7b,
          0 11px 17px rgba(0, 0, 0, 0.15);
      }

      .sectionTitle h2 {
        margin: 0;
        font-size: 24px;
        text-shadow: 0 1px 0 rgba(255, 255, 255, 0.65);
      }

      .sectionTitle p {
        margin: 5px 0 0;
        color: #285672;
        font-size: 13px;
        font-weight: 700;
      }

      .questionsList {
        display: grid;
        gap: 22px;
      }

      .questionCard {
        position: relative;
        overflow: hidden;
        border: 2px solid #4a555c;
        border-radius: 18px;
        background:
          linear-gradient(
            180deg,
            #ffffff 0%,
            #f7f8f8 74%,
            #e5e8ea 100%
          );
        box-shadow:
          inset 0 2px 0 rgba(255, 255, 255, 0.95),
          inset 0 -5px 0 rgba(70, 78, 83, 0.12),
          0 7px 0 #5d676d,
          0 13px 21px rgba(0, 0, 0, 0.15);
      }

      .questionCard.correct {
        border-left: 7px solid #2f8e4f;
        box-shadow:
          inset 0 2px 0 rgba(255, 255, 255, 0.95),
          inset 0 -5px 0 rgba(70, 78, 83, 0.12),
          0 7px 0 #4f765a,
          0 13px 21px rgba(0, 0, 0, 0.15);
      }

      .questionCard.incorrect {
        border-left: 7px solid #b84242;
        box-shadow:
          inset 0 2px 0 rgba(255, 255, 255, 0.95),
          inset 0 -5px 0 rgba(70, 78, 83, 0.12),
          0 7px 0 #7c5050,
          0 13px 21px rgba(0, 0, 0, 0.15);
      }

      .questionCard.unanswered {
        border-left: 7px solid #8c969d;
      }

      .questionTop {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        padding: 16px 18px 18px;
        border-bottom: 2px solid #c8ced2;
        background:
          linear-gradient(
            180deg,
            #72787c 0%,
            #5a6064 100%
          );
        color: #ffffff;
        box-shadow:
          inset 0 2px 0 rgba(255, 255, 255, 0.13),
          inset 0 -4px 0 rgba(0, 0, 0, 0.16);
      }

      .questionInfo {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
      }

      .questionNumber {
        font-size: 18px;
        font-weight: 900;
        text-shadow: 0 1px 0 #1b2226;
      }

      .questionType {
        padding: 6px 10px;
        border: 1px solid #b7c0c7;
        border-radius: 9px;
        background:
          linear-gradient(
            180deg,
            #ffffff 0%,
            #dedede 100%
          );
        color: #40505d;
        font-size: 11px;
        font-weight: 900;
        box-shadow:
          inset 0 1px 0 #ffffff,
          0 2px 0 #444d52;
      }

      .statusBadge {
        flex: 0 0 auto;
        padding: 7px 11px;
        border: 1px solid rgba(0, 0, 0, 0.18);
        border-radius: 9px;
        font-size: 11px;
        font-weight: 900;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.72),
          0 3px 0 rgba(0, 0, 0, 0.18);
      }

      .statusBadge.correct {
        background:
          linear-gradient(180deg, #eaf9ee, #bfe9c9);
        color: #23673a;
      }

      .statusBadge.incorrect {
        background:
          linear-gradient(180deg, #fff0f0, #efbebe);
        color: #8f2929;
      }

      .statusBadge.unanswered {
        background:
          linear-gradient(180deg, #f4f5f6, #d6dade);
        color: #5d6871;
      }

      .questionText {
        padding: 24px 22px 6px;
        font-size: 18px;
        font-weight: 900;
        line-height: 1.62;
        color: #162335;
      }

      .htmlContent img {
        max-width: 100%;
        height: auto;
      }

      .htmlContent table {
        max-width: 100%;
        border-collapse: collapse;
      }

      .optionsList {
        display: grid;
        gap: 12px;
        padding: 18px 22px 24px;
      }

      .optionRow {
        display: flex;
        align-items: center;
        gap: 12px;
        min-height: 58px;
        padding: 12px 15px;
        border: 2px solid #aeb7bd;
        border-radius: 12px;
        background:
          linear-gradient(
            180deg,
            #ffffff 0%,
            #f1f2f3 53%,
            #d8dcdf 100%
          );
        box-shadow:
          inset 0 2px 0 rgba(255, 255, 255, 0.95),
          inset 0 -3px 0 rgba(70, 78, 84, 0.13),
          0 4px 0 #838d93;
      }

      .optionRow.correctOption {
        border-color: #5e9d70;
        background:
          linear-gradient(
            180deg,
            #f5fff7 0%,
            #dff5e4 52%,
            #bfe3c7 100%
          );
        box-shadow:
          inset 0 2px 0 rgba(255, 255, 255, 0.9),
          inset 0 -3px 0 rgba(54, 109, 69, 0.13),
          0 4px 0 #5f8a6a;
      }

      .optionRow.wrongSelected {
        border-color: #b87070;
        background:
          linear-gradient(
            180deg,
            #fff8f8 0%,
            #f7dede 52%,
            #e8bbbb 100%
          );
        box-shadow:
          inset 0 2px 0 rgba(255, 255, 255, 0.9),
          inset 0 -3px 0 rgba(128, 65, 65, 0.12),
          0 4px 0 #916363;
      }

      .optionRow.selected.correctOption {
        outline: 2px solid rgba(39, 118, 58, 0.22);
        outline-offset: 2px;
      }

      .optionKey {
        flex: 0 0 38px;
        height: 38px;
        display: grid;
        place-items: center;
        border: 1px solid #58636a;
        border-radius: 9px;
        background:
          linear-gradient(
            180deg,
            #fefefe 0%,
            #d5d8da 100%
          );
        color: #263642;
        font-weight: 900;
        box-shadow:
          inset 0 1px 0 #ffffff,
          0 3px 0 #68737a;
      }

      .correctOption .optionKey {
        border-color: #316b41;
        background:
          linear-gradient(
            180deg,
            #69bd7b 0%,
            #3f9853 100%
          );
        color: #ffffff;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.42),
          0 3px 0 #2d653b;
      }

      .wrongSelected .optionKey {
        border-color: #7f2f2f;
        background:
          linear-gradient(
            180deg,
            #d76565 0%,
            #ae3d3d 100%
          );
        color: #ffffff;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.35),
          0 3px 0 #7b3030;
      }

      .optionContent {
        min-width: 0;
        flex: 1;
        color: #1c2a39;
        line-height: 1.5;
        font-weight: 700;
      }

      .optionMarks {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 7px;
      }

      .selectedLabel,
      .correctLabel {
        padding: 5px 8px;
        border-radius: 8px;
        font-size: 10px;
        font-weight: 900;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.8),
          0 2px 0 rgba(0, 0, 0, 0.13);
      }

      .selectedLabel {
        border: 1px solid #5e8db2;
        background:
          linear-gradient(180deg, #eef8ff, #cfe8f8);
        color: #295c83;
      }

      .correctLabel {
        border: 1px solid #6ba278;
        background:
          linear-gradient(180deg, #f1fff4, #cdebd4);
        color: #29643a;
      }

      .openResult {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        padding: 20px 22px 24px;
      }

      .answerBox {
        min-width: 0;
        padding: 17px;
        border: 2px solid #aeb7bd;
        border-radius: 13px;
        box-shadow:
          inset 0 2px 0 rgba(255, 255, 255, 0.92),
          inset 0 -3px 0 rgba(65, 74, 80, 0.12),
          0 4px 0 #7d878d;
      }

      .userAnswer {
        background:
          linear-gradient(
            180deg,
            #ffffff 0%,
            #edf0f2 54%,
            #d3d7da 100%
          );
      }

      .correctAnswer {
        border-color: #729e7c;
        background:
          linear-gradient(
            180deg,
            #f7fff8 0%,
            #e0f3e4 54%,
            #c6e3cc 100%
          );
        box-shadow:
          inset 0 2px 0 rgba(255, 255, 255, 0.92),
          inset 0 -3px 0 rgba(54, 103, 67, 0.1),
          0 4px 0 #65846d;
      }

      .answerBox > span {
        display: block;
        margin-bottom: 8px;
        color: #687581;
        font-size: 11px;
        font-weight: 900;
      }

      .answerBox strong {
        overflow-wrap: anywhere;
        color: #192838;
        line-height: 1.5;
      }

      .acceptedList {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .acceptedList strong {
        padding: 6px 9px;
        border: 1px solid #7da888;
        border-radius: 8px;
        background:
          linear-gradient(
            180deg,
            #ffffff 0%,
            #e0f1e4 100%
          );
        box-shadow:
          inset 0 1px 0 #ffffff,
          0 2px 0 #789282;
        font-size: 13px;
      }

      .questionFooter {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 7px;
        padding: 13px 20px;
        border-top: 2px solid #c6ccd0;
        background:
          linear-gradient(
            180deg,
            #f3f4f5 0%,
            #d9dde0 100%
          );
        color: #56636f;
        font-size: 12px;
        font-weight: 700;
      }

      .questionFooter strong {
        color: #172334;
      }

      .centerState,
      .errorState {
        width: min(92%, 620px);
        margin: 0 auto;
        padding: 110px 20px;
        text-align: center;
      }

      .centerState h2,
      .errorState h1 {
        color: #172334;
        text-shadow: 0 1px 0 #ffffff;
      }

      .loader {
        width: 48px;
        height: 48px;
        margin: 0 auto 20px;
        border-radius: 50%;
        border: 5px solid #c6d4dd;
        border-top-color: #2b8fc6;
        box-shadow:
          inset 0 0 0 2px #ffffff,
          0 4px 0 #54707f;
        animation: spin 0.8s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .errorIcon {
        width: 66px;
        height: 66px;
        display: grid;
        place-items: center;
        margin: 0 auto 18px;
        border: 2px solid #8d3030;
        border-radius: 50%;
        background:
          radial-gradient(
            circle at 35% 25%,
            #ffdede 0%,
            #ec8c8c 54%,
            #c54d4d 100%
          );
        color: #7d2020;
        font-size: 32px;
        font-weight: 900;
        box-shadow:
          inset 0 3px 0 rgba(255, 255, 255, 0.55),
          0 5px 0 #8a3434,
          0 10px 18px rgba(0, 0, 0, 0.17);
      }

      @media (max-width: 900px) {
        .statsGrid,
        .infoCard {
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
        }

        .openResult {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 650px) {
        .detailPage {
          padding-top: 10px;
        }

        .pageInner {
          width: min(94%, 1320px);
          padding-top: 8px;
        }

        .topActions {
          align-items: stretch;
          flex-direction: column;
        }

        .actionButtons {
          width: 100%;
          display: grid;
          grid-template-columns: 1fr 1fr;
        }

        .backLink,
        .refreshButton,
        .pdfButton,
        .primaryButton {
          width: 100%;
        }

        .heroCard {
          align-items: flex-start;
          flex-direction: column;
          padding: 24px 22px 28px;
        }

        .heroResult {
          width: 126px;
          height: 126px;
          flex-basis: 126px;
        }

        .statsGrid,
        .infoCard {
          grid-template-columns: 1fr;
        }

        .questionTop {
          align-items: flex-start;
        }

        .optionRow {
          align-items: flex-start;
          flex-wrap: wrap;
        }

        .optionMarks {
          width: 100%;
          justify-content: flex-start;
          padding-left: 50px;
        }

        .sectionTitle {
          padding: 14px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
          scroll-behavior: auto !important;
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
    `}</style>
  );
}
