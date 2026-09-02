"use client";

import {
  useCallback,
  useEffect,
  useMemo,
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

          <button
            type="button"
            className="refreshButton"
            onClick={
              loadResult
            }
          >
            Yangilash
          </button>
        </div>

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

      body {
        margin: 0;
        background: #eef1f5;
        color: #142033;
      }

      button {
        font: inherit;
      }

      .detailPage {
        min-height: 100vh;
        background:
          linear-gradient(
            180deg,
            #f5f7fa 0%,
            #edf1f5 100%
          );
      }

      .pageInner {
        width: min(
          96%,
          1280px
        );
        margin: 0 auto;
        padding: 30px 0 60px;
      }

      .topActions {
        display: flex;
        align-items: center;
        justify-content:
          space-between;
        gap: 14px;
        margin-bottom: 18px;
      }

      .backLink {
        color: #244f8e;
        font-weight: 800;
        text-decoration: none;
      }

      .refreshButton,
      .primaryButton {
        min-height: 42px;
        padding: 9px 17px;
        border: 0;
        border-radius: 10px;
        background: #2458a6;
        color: white;
        font-weight: 800;
        cursor: pointer;
      }

      .heroCard {
        display: flex;
        justify-content:
          space-between;
        align-items: center;
        gap: 26px;
        padding: 30px;
        border: 1px solid
          #d7dee8;
        border-radius: 20px;
        background: white;
        box-shadow:
          0 8px 24px
          rgba(
            22,
            37,
            59,
            0.07
          );
      }

      .heroLeft {
        min-width: 0;
      }

      .eyebrow {
        margin-bottom: 7px;
        color: #2458a6;
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .heroCard h1 {
        margin: 0;
        font-size: clamp(
          25px,
          4vw,
          38px
        );
        line-height: 1.15;
      }

      .heroCard h2 {
        margin: 11px 0 0;
        color: #47546a;
        font-size: 18px;
      }

      .heroCard p {
        margin: 9px 0 0;
        color: #687386;
      }

      .heroResult {
        flex: 0 0 150px;
        width: 150px;
        height: 150px;
        display: grid;
        place-content: center;
        text-align: center;
        border: 9px solid
          #d8e3f2;
        border-radius: 50%;
        background: #eef4fb;
      }

      .heroResult strong {
        font-size: 28px;
      }

      .heroResult span {
        margin-top: 4px;
        color: #687488;
        font-size: 11px;
      }

      .statsGrid {
        display: grid;
        grid-template-columns:
          repeat(
            4,
            minmax(0, 1fr)
          );
        gap: 14px;
        margin-top: 18px;
      }

      .statCard {
        padding: 18px;
        border: 1px solid
          #d8dfe8;
        border-radius: 15px;
        background: white;
      }

      .statCard span {
        display: block;
        margin-bottom: 7px;
        color: #697487;
        font-size: 12px;
      }

      .statCard strong {
        font-size: 23px;
      }

      .greenText {
        color: #28703a;
      }

      .redText {
        color: #9d3030;
      }

      .infoCard {
        display: grid;
        grid-template-columns:
          repeat(
            4,
            minmax(0, 1fr)
          );
        gap: 14px;
        margin-top: 18px;
        padding: 20px;
        border: 1px solid
          #d7dee8;
        border-radius: 16px;
        background: white;
      }

      .infoCard span {
        display: block;
        margin-bottom: 6px;
        color: #6d7788;
        font-size: 11px;
      }

      .infoCard strong {
        font-size: 14px;
      }

      .filterCard {
        display: flex;
        flex-wrap: wrap;
        gap: 9px;
        margin-top: 22px;
        padding: 14px;
        border: 1px solid
          #d8dfe7;
        border-radius: 14px;
        background: white;
      }

      .filterButton {
        border: 1px solid
          #ccd5e0;
        border-radius: 999px;
        padding: 9px 14px;
        background: #f8f9fb;
        color: #465267;
        cursor: pointer;
        font-weight: 800;
      }

      .filterButton span {
        margin-left: 4px;
        opacity: 0.7;
      }

      .filterButton.active {
        background: #2458a6;
        border-color: #2458a6;
        color: white;
      }

      .questionsSection {
        margin-top: 26px;
      }

      .sectionTitle {
        display: flex;
        justify-content:
          space-between;
        align-items: center;
        margin-bottom: 14px;
      }

      .sectionTitle h2 {
        margin: 0;
      }

      .sectionTitle p {
        margin: 5px 0 0;
        color: #758094;
        font-size: 13px;
      }

      .questionsList {
        display: grid;
        gap: 16px;
      }

      .questionCard {
        overflow: hidden;
        border: 1px solid
          #d7dee7;
        border-radius: 17px;
        background: white;
        box-shadow:
          0 5px 16px
          rgba(
            20,
            33,
            54,
            0.05
          );
      }

      .questionCard.correct {
        border-left: 5px solid
          #4c9a5e;
      }

      .questionCard.incorrect {
        border-left: 5px solid
          #c24a4a;
      }

      .questionCard.unanswered {
        border-left: 5px solid
          #a4acb8;
      }

      .questionTop {
        display: flex;
        align-items: center;
        justify-content:
          space-between;
        gap: 14px;
        padding: 18px 20px;
        border-bottom: 1px solid
          #e3e7ed;
        background: #fafbfd;
      }

      .questionInfo {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 9px;
      }

      .questionNumber {
        font-size: 17px;
        font-weight: 900;
      }

      .questionType {
        padding: 5px 9px;
        border-radius: 999px;
        background: #edf1f6;
        color: #5d697b;
        font-size: 11px;
        font-weight: 800;
      }

      .statusBadge {
        flex: 0 0 auto;
        padding: 6px 10px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 900;
      }

      .statusBadge.correct {
        background: #e8f4ea;
        color: #2f6f3d;
      }

      .statusBadge.incorrect {
        background: #fbeaea;
        color: #992f2f;
      }

      .statusBadge.unanswered {
        background: #eef0f3;
        color: #68717e;
      }

      .questionText {
        padding: 22px 20px 5px;
        font-size: 17px;
        font-weight: 800;
        line-height: 1.6;
      }

      .htmlContent img {
        max-width: 100%;
        height: auto;
      }

      .htmlContent table {
        max-width: 100%;
        border-collapse:
          collapse;
      }

      .optionsList {
        display: grid;
        gap: 10px;
        padding: 18px 20px 22px;
      }

      .optionRow {
        display: flex;
        align-items: center;
        gap: 12px;
        min-height: 54px;
        padding: 12px 14px;
        border: 1px solid
          #d8dee7;
        border-radius: 12px;
        background: #fafbfd;
      }

      .optionRow.correctOption {
        border-color: #91c19d;
        background: #edf8ef;
      }

      .optionRow.wrongSelected {
        border-color: #d49b9b;
        background: #fff0f0;
      }

      .optionRow.selected.correctOption {
        box-shadow:
          inset 0 0 0 1px
          #63a873;
      }

      .optionKey {
        flex: 0 0 34px;
        height: 34px;
        display: grid;
        place-items: center;
        border-radius: 8px;
        background: #e9edf2;
        font-weight: 900;
      }

      .correctOption
        .optionKey {
        background: #4d9560;
        color: white;
      }

      .wrongSelected
        .optionKey {
        background: #b44a4a;
        color: white;
      }

      .optionContent {
        min-width: 0;
        flex: 1;
        line-height: 1.5;
      }

      .optionMarks {
        display: flex;
        flex-wrap: wrap;
        justify-content:
          flex-end;
        gap: 6px;
      }

      .selectedLabel,
      .correctLabel {
        padding: 4px 7px;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 900;
      }

      .selectedLabel {
        background: #e5edf9;
        color: #30598f;
      }

      .correctLabel {
        background: #dff1e3;
        color: #2c6e3a;
      }

      .openResult {
        display: grid;
        grid-template-columns:
          1fr 1fr;
        gap: 14px;
        padding: 18px 20px 22px;
      }

      .answerBox {
        min-width: 0;
        padding: 16px;
        border-radius: 12px;
        border: 1px solid
          #d8dee7;
      }

      .userAnswer {
        background: #f8f9fb;
      }

      .correctAnswer {
        background: #edf8ef;
        border-color: #abd0b3;
      }

      .answerBox > span {
        display: block;
        margin-bottom: 8px;
        color: #687486;
        font-size: 11px;
      }

      .answerBox strong {
        overflow-wrap: anywhere;
        line-height: 1.5;
      }

      .acceptedList {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
      }

      .acceptedList strong {
        padding: 5px 8px;
        border-radius: 8px;
        background: white;
        border: 1px solid
          #c6ddcb;
        font-size: 13px;
      }

      .questionFooter {
        display: flex;
        align-items: center;
        justify-content:
          flex-end;
        gap: 7px;
        padding: 12px 20px;
        border-top: 1px solid
          #e4e8ed;
        background: #fafbfd;
        color: #5f6a7b;
        font-size: 12px;
      }

      .questionFooter strong {
        color: #172033;
      }

      .centerState,
      .errorState {
        width: min(
          92%,
          600px
        );
        margin: 0 auto;
        padding: 120px 20px;
        text-align: center;
      }

      .loader {
        width: 44px;
        height: 44px;
        margin: 0 auto 18px;
        border-radius: 50%;
        border: 4px solid
          #d9e0e9;
        border-top-color:
          #2458a6;
        animation:
          spin 0.8s
          linear infinite;
      }

      @keyframes spin {
        to {
          transform:
            rotate(360deg);
        }
      }

      .errorIcon {
        width: 64px;
        height: 64px;
        display: grid;
        place-items: center;
        margin: 0 auto 18px;
        border-radius: 50%;
        background: #feeaea;
        color: #a63131;
        font-size: 31px;
        font-weight: 900;
      }

      @media (
        max-width: 900px
      ) {
        .statsGrid,
        .infoCard {
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
        }

        .openResult {
          grid-template-columns:
            1fr;
        }
      }

      @media (
        max-width: 650px
      ) {
        .pageInner {
          width: min(
            94%,
            1280px
          );
          padding-top: 18px;
        }

        .heroCard {
          align-items:
            flex-start;
          flex-direction: column;
          padding: 22px;
        }

        .heroResult {
          width: 120px;
          height: 120px;
          flex-basis: 120px;
        }

        .statsGrid,
        .infoCard {
          grid-template-columns:
            1fr;
        }

        .questionTop {
          align-items:
            flex-start;
        }

        .optionRow {
          align-items:
            flex-start;
          flex-wrap: wrap;
        }

        .optionMarks {
          width: 100%;
          justify-content:
            flex-start;
          padding-left: 46px;
        }
      }
    `}</style>
  );
}
