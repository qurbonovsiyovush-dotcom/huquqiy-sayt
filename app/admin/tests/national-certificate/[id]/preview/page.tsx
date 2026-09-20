"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";

type PreviewOption = {
  key: string;
  text: string;
  html: string;
};

type PreviewQuestion = {
  questionNumber: number;
  questionType: "closed" | "open";
  questionText: string;
  questionHtml: string;
  points: number;
  options: PreviewOption[];
};

type PreviewTest = {
  id: string;
  title: string;
  description: string;
  status: "draft" | "published";
  durationMinutes: number;
  questions: PreviewQuestion[];
};

const NUMBERS =
  Array.from(
    { length: 45 },
    (_, index) => index + 1
  );

function formatPreviewTime(
  durationMinutes: number
) {
  const totalSeconds =
    Math.max(
      0,
      Math.floor(durationMinutes * 60)
    );

  const hours =
    Math.floor(
      totalSeconds / 3600
    );

  const minutes =
    Math.floor(
      (totalSeconds % 3600) / 60
    );

  const seconds =
    totalSeconds % 60;

  if (hours > 0) {
    return [
      hours,
      minutes,
      seconds,
    ]
      .map((value) =>
        String(value).padStart(2, "0")
      )
      .join(":");
  }

  return [
    minutes,
    seconds,
  ]
    .map((value) =>
      String(value).padStart(2, "0")
    )
    .join(":");
}

function normalizeTest(
  raw: any
): PreviewTest {
  const rawQuestions =
    Array.isArray(raw?.questions)
      ? raw.questions
      : [];

  const questions: PreviewQuestion[] =
    rawQuestions
      .map((question: any) => {
        const number =
          Number(
            question?.question_number ??
            question?.questionNumber
          );

        const type =
          String(
            question?.question_type ??
            question?.questionType ??
            (
              number <= 35
                ? "closed"
                : "open"
            )
          ) === "open"
            ? "open"
            : "closed";

        const rawOptions =
          Array.isArray(question?.options)
            ? question.options
            : [];

        const options: PreviewOption[] =
          rawOptions.map(
            (option: any) => ({
              key: String(
                option?.option_key ??
                option?.key ??
                ""
              ),
              text: String(
                option?.option_text ??
                option?.text ??
                ""
              ),
              html: String(
                option?.option_html ??
                option?.html ??
                ""
              ),
            })
          );

        return {
          questionNumber:
            number,
          questionType:
            type,
          questionText:
            String(
              question?.question_text ??
              question?.questionText ??
              ""
            ),
          questionHtml:
            String(
              question?.question_html ??
              question?.questionHtml ??
              ""
            ),
          points:
            Number(
              question?.points ?? 0
            ),
          options,
        };
      })
      .filter(
        (question: PreviewQuestion) =>
          Number.isInteger(
            question.questionNumber
          ) &&
          question.questionNumber >= 1 &&
          question.questionNumber <= 45
      )
      .sort(
        (
          a: PreviewQuestion,
          b: PreviewQuestion
        ) =>
          a.questionNumber -
          b.questionNumber
      );

  return {
    id:
      String(raw?.id ?? ""),
    title:
      String(
        raw?.title ??
        "Nomsiz test"
      ),
    description:
      String(
        raw?.description ??
        ""
      ),
    status:
      raw?.status === "published"
        ? "published"
        : "draft",
    durationMinutes:
      Number(
        raw?.duration_minutes ??
        raw?.durationMinutes ??
        90
      ),
    questions,
  };
}

export default function
NationalCertificatePreviewPage() {
  const params =
    useParams();

  const router =
    useRouter();

  const testId =
    typeof params?.id === "string"
      ? params.id
      : "";

  const [
    test,
    setTest,
  ] =
    useState<PreviewTest | null>(
      null
    );

  const [
    currentNumber,
    setCurrentNumber,
  ] =
    useState(1);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  useEffect(() => {
    if (!testId) {
      setError(
        "Test ID topilmadi."
      );
      setLoading(false);
      return;
    }

    let cancelled =
      false;

    async function loadPreview() {
      try {
        setLoading(true);
        setError("");

        const response =
          await fetch(
            `/api/national-certificate/tests/${encodeURIComponent(
              testId
            )}`,
            {
              method: "GET",
              cache: "no-store",
              credentials:
                "include",
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data?.success ||
          !data?.test
        ) {
          throw new Error(
            data?.message ||
            "Test previewini yuklab bo‘lmadi."
          );
        }

        const normalized =
          normalizeTest(
            data.test
          );

        if (cancelled) {
          return;
        }

        setTest(
          normalized
        );

        const firstSaved =
          normalized.questions[0]
            ?.questionNumber ??
          1;

        setCurrentNumber(
          firstSaved
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Previewni yuklashda xatolik yuz berdi."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPreview();

    return () => {
      cancelled = true;
    };
  }, [testId]);

  const questionMap =
    useMemo(() => {
      return new Map(
        (test?.questions || []).map(
          (question) => [
            question.questionNumber,
            question,
          ]
        )
      );
    }, [test]);

  const currentQuestion =
    questionMap.get(
      currentNumber
    ) ??
    null;

  const savedCount =
    test?.questions.length ??
    0;

  if (loading) {
    return (
      <main className="page centerPage">
        <div className="stateCard">
          Preview yuklanmoqda...
        </div>
        <Styles />
      </main>
    );
  }

  if (
    error ||
    !test
  ) {
    return (
      <main className="page centerPage">
        <div className="stateCard error">
          <h2>
            Previewni ochib bo‘lmadi
          </h2>

          <p>
            {error ||
              "Test topilmadi."}
          </p>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/admin/tests/national-certificate"
              )
            }
          >
            ← Testlar ro‘yxatiga
          </button>
        </div>

        <Styles />
      </main>
    );
  }

  return (
    <main className="page">
      <header className="previewBar">
        <div>
          <div className="previewLabel">
            ADMIN PREVIEW
          </div>

          <strong>
            Bu faqat ko‘rish rejimi.
            Urinish yaratilmaydi.
          </strong>
        </div>

        <div className="topButtons">
          <button
            type="button"
            className="grayButton"
            onClick={() =>
              router.push(
                `/admin/tests/national-certificate/${encodeURIComponent(
                  test.id
                )}`
              )
            }
          >
            ← Tahrirlash
          </button>

          <button
            type="button"
            className="grayButton"
            onClick={() =>
              router.push(
                "/admin/tests/national-certificate"
              )
            }
          >
            Testlar
          </button>
        </div>
      </header>

      <section className="testHeader">
        <div>
          <span className="mini">
            Milliy sertifikat
          </span>

          <h1>
            {test.title}
          </h1>

          {test.description && (
            <p>
              {test.description}
            </p>
          )}

          <div className="statusRow">
            <span
              className={[
                "statusBadge",
                test.status,
              ].join(" ")}
            >
              {test.status ===
              "published"
                ? "E’lon qilingan"
                : "Qoralama"}
            </span>

            <span>
              Saqlangan:{" "}
              <b>
                {savedCount}/45
              </b>
            </span>
          </div>
        </div>

        <div className="timer">
          <span>
            Preview taymer
          </span>

          <strong>
            {formatPreviewTime(
              test.durationMinutes
            )}
          </strong>

          <small>
            Real urinish emas
          </small>
        </div>
      </section>

      <div className="layout">
        <aside className="navigator">
          <div className="navTitle">
            Savollar
          </div>

          <div className="numbers">
            {NUMBERS.map(
              (number) => {
                const saved =
                  questionMap.has(
                    number
                  );

                const active =
                  currentNumber ===
                  number;

                return (
                  <button
                    key={number}
                    type="button"
                    className={[
                      "navNumber",
                      saved
                        ? "saved"
                        : "missing",
                      active
                        ? "active"
                        : "",
                    ].join(" ")}
                    onClick={() =>
                      setCurrentNumber(
                        number
                      )
                    }
                  >
                    {number}
                  </button>
                );
              }
            )}
          </div>

          <div className="legend">
            <span>
              <i className="box savedBox" />
              Saqlangan
            </span>

            <span>
              <i className="box missingBox" />
              Kiritilmagan
            </span>
          </div>
        </aside>

        <section className="content">
          {currentQuestion ? (
            <article className="questionCard">
              <div className="questionTop">
                <div>
                  <span className="questionNumber">
                    {
                      currentQuestion.questionNumber
                    }
                    -savol
                  </span>

                  <span className="questionType">
                    {currentQuestion.questionType ===
                    "closed"
                      ? "Yopiq savol"
                      : "Ochiq savol"}
                  </span>
                </div>

                <strong>
                  {
                    currentQuestion.points
                  }{" "}
                  ball
                </strong>
              </div>

              {currentQuestion.questionHtml ? (
                <div
                  className="questionText htmlContent"
                  dangerouslySetInnerHTML={{
                    __html:
                      currentQuestion.questionHtml,
                  }}
                />
              ) : (
                <div className="questionText">
                  {
                    currentQuestion.questionText
                  }
                </div>
              )}

              {currentQuestion.questionType ===
              "closed" ? (
                <div className="options">
                  {currentQuestion.options.map(
                    (
                      option,
                      index
                    ) => (
                      <label
                        className="option"
                        key={`${option.key}-${index}`}
                      >
                        <input
                          type="radio"
                          disabled
                        />

                        <span className="optionKey">
                          {
                            option.key ||
                            String.fromCharCode(
                              65 + index
                            )
                          }
                        </span>

                        {option.html ? (
                          <span
                            className="optionText htmlContent"
                            dangerouslySetInnerHTML={{
                              __html:
                                option.html,
                            }}
                          />
                        ) : (
                          <span className="optionText">
                            {
                              option.text
                            }
                          </span>
                        )}
                      </label>
                    )
                  )}
                </div>
              ) : (
                <div className="openAnswer">
                  <label>
                    Javobingiz
                  </label>

                  <textarea
                    rows={5}
                    disabled
                    placeholder="Foydalanuvchi javobni shu yerga yozadi..."
                  />
                </div>
              )}

              <div className="questionActions">
                <button
                  type="button"
                  className="stepButton"
                  disabled={
                    currentNumber <= 1
                  }
                  onClick={() =>
                    setCurrentNumber(
                      (value) =>
                        Math.max(
                          1,
                          value - 1
                        )
                    )
                  }
                >
                  ← Oldingi
                </button>

                <span>
                  {currentNumber}/45
                </span>

                <button
                  type="button"
                  className="stepButton"
                  disabled={
                    currentNumber >= 45
                  }
                  onClick={() =>
                    setCurrentNumber(
                      (value) =>
                        Math.min(
                          45,
                          value + 1
                        )
                    )
                  }
                >
                  Keyingi →
                </button>
              </div>
            </article>
          ) : (
            <article className="missingCard">
              <strong>
                {currentNumber}-savol
              </strong>

              <h2>
                Bu savol hali kiritilmagan
              </h2>

              <p>
                Qoralama testda bu normal.
                Tahrirlash sahifasiga qaytib
                savolni kiritishingiz mumkin.
              </p>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/admin/tests/national-certificate/${encodeURIComponent(
                      test.id
                    )}`
                  )
                }
              >
                Tahrirlashga qaytish
              </button>
            </article>
          )}
        </section>
      </div>

      <Styles />
    </main>
  );
}

function Styles() {
  return (
    <style jsx global>{`
      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        background: #e9eef3;
        color: #142033;
        font-family: Georgia, "Times New Roman", serif;
      }

      button,
      textarea {
        font: inherit;
      }

      .page {
        min-height: 100vh;
        padding: 18px;
        background:
          radial-gradient(
            circle at 50% -120px,
            rgba(38, 132, 221, 0.17),
            transparent 470px
          ),
          linear-gradient(
            180deg,
            #f7f9fb 0%,
            #e4eaf0 100%
          );
      }

      .centerPage {
        display: grid;
        place-items: center;
      }

      .stateCard {
        width: min(92vw, 520px);
        padding: 30px;
        border: 2px solid #51606a;
        border-radius: 18px;
        background: #fff;
        text-align: center;
        box-shadow:
          0 6px 0 #59636a,
          0 14px 30px rgba(0,0,0,.18);
      }

      .stateCard button,
      .missingCard button,
      .grayButton,
      .stepButton {
        min-height: 46px;
        padding: 10px 17px;
        border: 2px solid #40505a;
        border-radius: 11px;
        background:
          linear-gradient(
            180deg,
            #fff 0%,
            #d9e0e5 100%
          );
        color: #162536;
        font-weight: 900;
        cursor: pointer;
        box-shadow:
          inset 0 2px 0 #fff,
          0 4px 0 #5d6a72;
      }

      button:disabled {
        opacity: .45;
        cursor: not-allowed;
      }

      .previewBar,
      .testHeader,
      .layout {
        width: min(1500px, 100%);
        margin-left: auto;
        margin-right: auto;
      }

      .previewBar {
        min-height: 86px;
        padding: 16px 18px;
        border: 2px solid #6d5416;
        border-radius: 17px;
        background:
          linear-gradient(
            180deg,
            #fff5c8 0%,
            #e9c75c 100%
          );
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        box-shadow:
          inset 0 3px 0 rgba(255,255,255,.85),
          0 5px 0 #806929,
          0 10px 22px rgba(0,0,0,.16);
      }

      .previewLabel {
        margin-bottom: 4px;
        font-size: 13px;
        font-weight: 900;
        letter-spacing: 1.8px;
      }

      .topButtons {
        display: flex;
        gap: 9px;
        flex-wrap: wrap;
      }

      .testHeader {
        margin-top: 18px;
        padding: 22px;
        border: 2px solid #4f5e68;
        border-radius: 20px;
        background:
          linear-gradient(
            180deg,
            #ffffff 0%,
            #dce4ea 100%
          );
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        box-shadow:
          inset 0 3px 0 #fff,
          0 6px 0 #65717a,
          0 12px 24px rgba(0,0,0,.16);
      }

      .testHeader h1 {
        margin: 5px 0 6px;
        font-size: clamp(25px, 3vw, 37px);
      }

      .testHeader p {
        max-width: 820px;
        margin: 0;
        color: #536170;
        line-height: 1.6;
      }

      .mini {
        color: #37657f;
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 1.5px;
        text-transform: uppercase;
      }

      .statusRow {
        margin-top: 13px;
        display: flex;
        align-items: center;
        gap: 13px;
        flex-wrap: wrap;
      }

      .statusBadge {
        padding: 7px 11px;
        border: 2px solid #4f5c64;
        border-radius: 9px;
        font-weight: 900;
      }

      .statusBadge.draft {
        background: #ffe99a;
      }

      .statusBadge.published {
        background: #bce9c5;
      }

      .timer {
        flex: 0 0 auto;
        min-width: 190px;
        padding: 13px 17px;
        border: 2px solid #44525c;
        border-radius: 15px;
        background:
          linear-gradient(
            180deg,
            #edf8ff 0%,
            #b7d8ec 100%
          );
        text-align: center;
        box-shadow:
          inset 0 3px 0 #fff,
          0 4px 0 #5c6c76;
      }

      .timer span,
      .timer small {
        display: block;
      }

      .timer span {
        font-size: 12px;
        font-weight: 900;
      }

      .timer strong {
        display: block;
        margin: 4px 0;
        font-size: 28px;
      }

      .timer small {
        color: #536574;
      }

      .layout {
        margin-top: 20px;
        margin-bottom: 50px;
        display: grid;
        grid-template-columns: 270px 1fr;
        gap: 18px;
      }

      .navigator,
      .questionCard,
      .missingCard {
        border: 2px solid #53616b;
        border-radius: 18px;
        background:
          linear-gradient(
            180deg,
            #fff 0%,
            #dce3e8 100%
          );
        box-shadow:
          inset 0 3px 0 #fff,
          0 6px 0 #65717a,
          0 12px 22px rgba(0,0,0,.14);
      }

      .navigator {
        align-self: start;
        padding: 16px;
        position: sticky;
        top: 16px;
      }

      .navTitle {
        margin-bottom: 12px;
        font-size: 17px;
        font-weight: 900;
      }

      .numbers {
        display: grid;
        grid-template-columns:
          repeat(5, 1fr);
        gap: 7px;
      }

      .navNumber {
        aspect-ratio: 1;
        border: 2px solid #68757e;
        border-radius: 9px;
        font-weight: 900;
        cursor: pointer;
      }

      .navNumber.saved {
        background:
          linear-gradient(
            180deg,
            #effff1,
            #9fdda9
          );
      }

      .navNumber.missing {
        background:
          linear-gradient(
            180deg,
            #fff,
            #d9dee2
          );
        color: #7d878e;
      }

      .navNumber.active {
        outline: 3px solid #1674c9;
        outline-offset: 2px;
      }

      .legend {
        margin-top: 15px;
        display: grid;
        gap: 8px;
        font-size: 12px;
        font-weight: 900;
      }

      .legend span {
        display: flex;
        align-items: center;
        gap: 7px;
      }

      .box {
        width: 18px;
        height: 18px;
        border: 2px solid #66737c;
        border-radius: 5px;
      }

      .savedBox {
        background: #a9e1b2;
      }

      .missingBox {
        background: #e1e5e8;
      }

      .questionCard,
      .missingCard {
        min-height: 500px;
        padding: 25px;
      }

      .questionTop {
        padding-bottom: 15px;
        border-bottom: 1px solid #aab3ba;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 13px;
      }

      .questionNumber {
        margin-right: 10px;
        font-size: 20px;
        font-weight: 900;
      }

      .questionType {
        color: #5d6875;
        font-size: 13px;
        font-weight: 900;
      }

      .questionText {
        margin-top: 24px;
        font-size: 18px;
        line-height: 1.7;
      }

      .htmlContent img,
      .htmlContent svg,
      .htmlContent table {
        max-width: 100%;
      }

      .options {
        margin-top: 24px;
        display: grid;
        gap: 12px;
      }

      .option {
        min-height: 60px;
        padding: 12px 14px;
        border: 2px solid #78848c;
        border-radius: 12px;
        background:
          linear-gradient(
            180deg,
            #fff 0%,
            #edf1f3 100%
          );
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .optionKey {
        flex: 0 0 auto;
        width: 38px;
        height: 38px;
        border: 2px solid #65727b;
        border-radius: 50%;
        display: grid;
        place-items: center;
        font-weight: 900;
      }

      .optionText {
        flex: 1;
        min-width: 0;
        line-height: 1.55;
      }

      .openAnswer {
        margin-top: 25px;
      }

      .openAnswer label {
        display: block;
        margin-bottom: 8px;
        font-weight: 900;
      }

      .openAnswer textarea {
        width: 100%;
        padding: 13px;
        border: 2px solid #7a858d;
        border-radius: 11px;
        background: #eef1f3;
      }

      .questionActions {
        margin-top: 28px;
        padding-top: 17px;
        border-top: 1px solid #adb6bc;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .questionActions span {
        font-weight: 900;
      }

      .missingCard {
        display: grid;
        place-content: center;
        justify-items: center;
        text-align: center;
      }

      .missingCard > strong {
        color: #65727c;
        font-size: 17px;
      }

      .missingCard h2 {
        margin: 9px 0;
        font-size: 27px;
      }

      .missingCard p {
        max-width: 520px;
        margin: 0 0 19px;
        color: #596675;
        line-height: 1.65;
      }

      @media (max-width: 900px) {
        .previewBar,
        .testHeader {
          align-items: stretch;
          flex-direction: column;
        }

        .timer {
          width: 100%;
        }

        .layout {
          grid-template-columns: 1fr;
        }

        .navigator {
          position: static;
        }

        .numbers {
          grid-template-columns:
            repeat(9, 1fr);
        }
      }

      @media (max-width: 600px) {
        .page {
          padding: 10px;
        }

        .numbers {
          grid-template-columns:
            repeat(5, 1fr);
        }

        .questionCard,
        .missingCard {
          padding: 17px;
        }

        .questionTop,
        .questionActions {
          align-items: stretch;
          flex-direction: column;
        }

        .stepButton {
          width: 100%;
        }
      }
    `}</style>
  );
}

