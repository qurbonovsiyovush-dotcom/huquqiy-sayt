"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type TestOption = {
  id?: string;
  option_key: "A" | "B" | "C" | "D";
  option_text: string;
  option_html?: string;
  is_correct: boolean;
  sort_order?: number;
};

type AcceptedAnswer = {
  id?: string;
  answer_text: string;
  normalized_answer?: string;
};

type Question = {
  id?: string;
  test_id?: string;
  question_number: number;
  question_type: "closed" | "open";
  question_text: string;
  question_html?: string;
  points?: number | string;
  options?: TestOption[];
  acceptedAnswers?: AcceptedAnswer[];
};

type TestData = {
  id: string;
  title: string;
  description?: string;
  subject?: string;
  status: "draft" | "published";
  duration_minutes: number;
  closed_question_count: number;
  open_question_count: number;
  total_questions: number;
  attempt_limit: number | null;
  questions: Question[];
};

type PublishDetails = {
  total?: number;
  requiredTotal?: number;
  closed?: number;
  requiredClosed?: number;
  open?: number;
  requiredOpen?: number;
};

const OPTION_KEYS = ["A", "B", "C", "D"] as const;

function createEmptyOptions(): TestOption[] {
  return OPTION_KEYS.map((key, index) => ({
    option_key: key,
    option_text: "",
    option_html: "",
    is_correct: index === 0,
    sort_order: index,
  }));
}

function formatPoints(value: number | string | undefined) {
  if (value === undefined || value === null || value === "") {
    return "1";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "1";
  }

  return String(number);
}

export default function NationalCertificateEditorPage() {
  const router = useRouter();
  const params = useParams();

  const testId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : "";

  const [test, setTest] = useState<TestData | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [currentNumber, setCurrentNumber] = useState(1);

  const [questionText, setQuestionText] = useState("");
  const [points, setPoints] = useState("1");

  const [options, setOptions] =
    useState<TestOption[]>(createEmptyOptions());

  const [acceptedAnswers, setAcceptedAnswers] =
    useState<string[]>([""]);

  const currentType: "closed" | "open" =
    currentNumber <= 35 ? "closed" : "open";

  async function readJson(response: Response) {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  async function loadTest() {
    if (!testId) {
      setError("Test ID topilmadi.");
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/national-certificate/tests/${encodeURIComponent(
          testId
        )}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await readJson(response);

      if (!response.ok || !data.success || !data.test) {
        setError(
          data.message ||
            "Test ma’lumotlarini yuklab bo‘lmadi."
        );
        return;
      }

      setTest(data.test as TestData);
    } catch (error) {
      console.error(error);

      setError(
        "Server bilan bog‘lanishda xatolik yuz berdi."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTest();
  }, [testId]);

  const savedQuestions = useMemo(() => {
    if (!test?.questions) {
      return new Map<number, Question>();
    }

    return new Map(
      test.questions.map((question) => [
        Number(question.question_number),
        question,
      ])
    );
  }, [test]);

  function loadQuestionIntoEditor(questionNumber: number) {
    setCurrentNumber(questionNumber);
    setError("");
    setSuccessMessage("");

    const existing =
      savedQuestions.get(questionNumber);

    if (!existing) {
      setQuestionText("");
      setPoints("1");

      if (questionNumber <= 35) {
        setOptions(createEmptyOptions());
      } else {
        setAcceptedAnswers([""]);
      }

      return;
    }

    setQuestionText(existing.question_text || "");
    setPoints(formatPoints(existing.points));

    if (questionNumber <= 35) {
      const existingOptions =
        Array.isArray(existing.options)
          ? existing.options
          : [];

      const loadedOptions = OPTION_KEYS.map(
        (key, index) => {
          const found = existingOptions.find(
            (option) => option.option_key === key
          );

          return {
            id: found?.id,
            option_key: key,
            option_text: found?.option_text || "",
            option_html: found?.option_html || "",
            is_correct: found?.is_correct === true,
            sort_order: index,
          };
        }
      );

      if (
        loadedOptions.filter(
          (option) => option.is_correct
        ).length !== 1
      ) {
        loadedOptions.forEach((option, index) => {
          option.is_correct = index === 0;
        });
      }

      setOptions(loadedOptions);
    } else {
      const answers =
        Array.isArray(existing.acceptedAnswers)
          ? existing.acceptedAnswers
              .map(
                (answer) =>
                  answer.answer_text || ""
              )
              .filter(Boolean)
          : [];

      setAcceptedAnswers(
        answers.length > 0 ? answers : [""]
      );
    }
  }

  useEffect(() => {
    if (!test) {
      return;
    }

    loadQuestionIntoEditor(currentNumber);
  }, [test]);

  function updateOptionText(
    index: number,
    value: string
  ) {
    setOptions((current) =>
      current.map((option, optionIndex) =>
        optionIndex === index
          ? {
              ...option,
              option_text: value,
            }
          : option
      )
    );
  }

  function setCorrectOption(index: number) {
    setOptions((current) =>
      current.map((option, optionIndex) => ({
        ...option,
        is_correct: optionIndex === index,
      }))
    );
  }

  function updateAcceptedAnswer(
    index: number,
    value: string
  ) {
    setAcceptedAnswers((current) =>
      current.map((answer, answerIndex) =>
        answerIndex === index
          ? value
          : answer
      )
    );
  }

  function addAcceptedAnswer() {
    setAcceptedAnswers((current) => [
      ...current,
      "",
    ]);
  }

  function removeAcceptedAnswer(index: number) {
    setAcceptedAnswers((current) => {
      if (current.length === 1) {
        return [""];
      }

      return current.filter(
        (_, answerIndex) =>
          answerIndex !== index
      );
    });
  }

  async function saveCurrentQuestion() {
    if (!test) {
      return;
    }

    if (test.status !== "draft") {
      setError(
        "E’lon qilingan testni tahrirlab bo‘lmaydi."
      );
      return;
    }

    const cleanQuestionText =
      questionText.trim();

    if (!cleanQuestionText) {
      setError("Savol matnini kiriting.");
      return;
    }

    const numericPoints = Number(points);

    if (
      !Number.isFinite(numericPoints) ||
      numericPoints < 0
    ) {
      setError("Savol bali noto‘g‘ri.");
      return;
    }

    if (currentType === "closed") {
      const hasEmptyOption =
        options.some(
          (option) =>
            !option.option_text.trim()
        );

      if (hasEmptyOption) {
        setError(
          "A, B, C va D variantlarining barchasini kiriting."
        );
        return;
      }

      const correctCount =
        options.filter(
          (option) =>
            option.is_correct
        ).length;

      if (correctCount !== 1) {
        setError(
          "Aynan bitta to‘g‘ri javob belgilang."
        );
        return;
      }
    } else {
      const validAnswers =
        acceptedAnswers
          .map((answer) =>
            answer.trim()
          )
          .filter(Boolean);

      if (validAnswers.length === 0) {
        setError(
          "Kamida bitta qabul qilinadigan javob kiriting."
        );
        return;
      }
    }

    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const body =
        currentType === "closed"
          ? {
              questionNumber: currentNumber,
              questionText:
                cleanQuestionText,
              questionHtml: "",
              points:
                numericPoints,
              options: options.map(
                (option) => ({
                  key:
                    option.option_key,
                  text:
                    option.option_text.trim(),
                  html: "",
                  isCorrect:
                    option.is_correct,
                })
              ),
            }
          : {
              questionNumber:
                currentNumber,
              questionText:
                cleanQuestionText,
              questionHtml: "",
              points:
                numericPoints,
              acceptedAnswers:
                acceptedAnswers
                  .map((answer) =>
                    answer.trim()
                  )
                  .filter(Boolean),
            };

      const response = await fetch(
        `/api/national-certificate/tests/${encodeURIComponent(
          test.id
        )}/questions`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const data = await readJson(response);

      if (!response.ok || !data.success) {
        setError(
          data.message ||
            "Savolni saqlab bo‘lmadi."
        );
        return;
      }

      setSuccessMessage(
        `${currentNumber}-savol muvaffaqiyatli saqlandi.`
      );

      const savedNumber = currentNumber;

      await loadTest();

      if (savedNumber < 45) {
        setTimeout(() => {
          loadQuestionIntoEditor(
            savedNumber + 1
          );
        }, 150);
      }
    } catch (error) {
      console.error(error);

      setError(
        "Savolni saqlashda server xatosi yuz berdi."
      );
    } finally {
      setSaving(false);
    }
  }

  async function publishTest() {
    if (!test) {
      return;
    }

    if (test.status === "published") {
      setSuccessMessage(
        "Test allaqachon e’lon qilingan."
      );
      return;
    }

    const confirmed = window.confirm(
      "Testni e’lon qilmoqchimisiz?\n\nServer barcha 45 ta savolni tekshiradi."
    );

    if (!confirmed) {
      return;
    }

    setPublishing(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        `/api/national-certificate/tests/${encodeURIComponent(
          test.id
        )}/publish`,
        {
          method: "POST",
        }
      );

      const data = await readJson(response);

      if (!response.ok || !data.success) {
        let message =
          data.message ||
          "Testni e’lon qilib bo‘lmadi.";

        const details =
          data.details as
            | PublishDetails
            | undefined;

        if (details) {
          message += `\n\nHozir:
Jami: ${details.total ?? 0}/${
            details.requiredTotal ?? 45
          }
Yopiq: ${details.closed ?? 0}/${
            details.requiredClosed ?? 35
          }
Ochiq: ${details.open ?? 0}/${
            details.requiredOpen ?? 10
          }`;
        }

        if (
          Array.isArray(
            data.invalidQuestions
          ) &&
          data.invalidQuestions.length > 0
        ) {
          const numbers =
            data.invalidQuestions
              .map(
                (
                  item: {
                    question_number?: number;
                  }
                ) =>
                  item.question_number
              )
              .filter(Boolean)
              .join(", ");

          if (numbers) {
            message += `\n\nMuammoli savollar: ${numbers}`;
          }
        }

        setError(message);
        return;
      }

      setSuccessMessage(
        data.message ||
          "Test muvaffaqiyatli e’lon qilindi."
      );

      await loadTest();
    } catch (error) {
      console.error(error);

      setError(
        "Testni e’lon qilishda server bilan bog‘lanib bo‘lmadi."
      );
    } finally {
      setPublishing(false);
    }
  }

  const savedCount =
    test?.questions?.length || 0;

  const closedSavedCount =
    test?.questions?.filter(
      (question) =>
        Number(
          question.question_number
        ) <= 35
    ).length || 0;

  const openSavedCount =
    test?.questions?.filter(
      (question) =>
        Number(
          question.question_number
        ) >= 36
    ).length || 0;

  if (loading) {
    return (
      <main className="centerPage">
        <div className="loadingCard">
          Test yuklanmoqda...
        </div>

        <style jsx>{`
          .centerPage {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #e7eef2;
            font-family: Arial, sans-serif;
          }

          .loadingCard {
            padding: 24px 34px;
            border: 1px solid #8fa1ab;
            border-radius: 14px;
            background: white;
            font-weight: 800;
          }
        `}</style>
      </main>
    );
  }

  if (!test) {
    return (
      <main className="centerPage">
        <div className="errorCard">
          <strong>
            Testni ochib bo‘lmadi.
          </strong>

          <p>{error}</p>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/admin/tests"
              )
            }
          >
            Orqaga
          </button>
        </div>

        <style jsx>{`
          .centerPage {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #e7eef2;
            font-family: Arial, sans-serif;
          }

          .errorCard {
            width: min(520px, 92%);
            padding: 24px;
            border: 1px solid #b26a6a;
            border-radius: 14px;
            background: white;
            text-align: center;
          }

          button {
            min-height: 42px;
            padding: 0 20px;
            border: 1px solid #2b607c;
            border-radius: 9px;
            background: #7fc2e3;
            font-weight: 800;
            cursor: pointer;
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="topHeader">
        <div>
          <div className="miniTitle">
            MILLIY SERTIFIKAT
          </div>

          <h1>{test.title}</h1>

          <p>
            35 ta yopiq + 10 ta ochiq savol
          </p>
        </div>

        <div className="headerActions">
          {test.status === "draft" ? (
            <button
              type="button"
              className="publishButton"
              onClick={publishTest}
              disabled={
                publishing || saving
              }
            >
              {publishing
                ? "E’LON QILINMOQDA..."
                : "TESTNI E’LON QILISH"}
            </button>
          ) : (
            <div className="publishedBadge">
              ✓ E’LON QILINGAN
            </div>
          )}

          <button
            type="button"
            className="grayButton"
            onClick={() =>
              router.push(
                "/admin/tests"
              )
            }
          >
            ← Testlar
          </button>
        </div>
      </header>

      <section className="stats">
        <div>
          <span>Saqlangan</span>
          <strong>
            {savedCount}/45
          </strong>
        </div>

        <div>
          <span>Yopiq</span>
          <strong>
            {closedSavedCount}/35
          </strong>
        </div>

        <div>
          <span>Ochiq</span>
          <strong>
            {openSavedCount}/10
          </strong>
        </div>

        <div>
          <span>Vaqt</span>
          <strong>
            {test.duration_minutes} daqiqa
          </strong>
        </div>

        <div>
          <span>Holati</span>
          <strong>
            {test.status === "draft"
              ? "Qoralama"
              : "E’lon qilingan"}
          </strong>
        </div>
      </section>

      {error && (
        <div className="globalMessage errorBox">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="globalMessage successBox">
          {successMessage}
        </div>
      )}

      <section className="workspace">
        <aside className="navigator">
          <div className="navigatorTitle">
            SAVOLLAR
          </div>

          <div className="questionGrid">
            {Array.from(
              { length: 45 },
              (_, index) =>
                index + 1
            ).map((number) => {
              const saved =
                savedQuestions.has(
                  number
                );

              const active =
                currentNumber ===
                number;

              const type =
                number <= 35
                  ? "closed"
                  : "open";

              return (
                <button
                  type="button"
                  key={number}
                  className={[
                    "questionButton",
                    saved
                      ? "saved"
                      : "",
                    active
                      ? "active"
                      : "",
                    type === "open"
                      ? "openQuestion"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() =>
                    loadQuestionIntoEditor(
                      number
                    )
                  }
                >
                  {number}
                </button>
              );
            })}
          </div>

          <div className="legend">
            <div>
              <span className="dot closedDot" />
              1–35 yopiq
            </div>

            <div>
              <span className="dot openDot" />
              36–45 ochiq
            </div>

            <div>
              <span className="dot savedDot" />
              Saqlangan
            </div>
          </div>
        </aside>

        <section className="editorCard">
          <div className="editorHeader">
            <div>
              <span>
                {currentNumber}-savol
              </span>

              <strong>
                {currentType ===
                "closed"
                  ? "Yopiq savol"
                  : "Ochiq savol"}
              </strong>
            </div>

            <label className="pointsBox">
              <span>Ball</span>

              <input
                type="number"
                min="0"
                step="0.001"
                value={points}
                onChange={(event) =>
                  setPoints(
                    event.target.value
                  )
                }
                disabled={
                  saving ||
                  test.status !== "draft"
                }
              />
            </label>
          </div>

          {test.status === "published" && (
            <div className="lockedBox">
              Test e’lon qilingan. Savollarni
              tahrirlash bloklangan.
            </div>
          )}

          <div className="field">
            <label>
              Savol matni
            </label>

            <textarea
              rows={6}
              value={questionText}
              onChange={(event) =>
                setQuestionText(
                  event.target.value
                )
              }
              placeholder="Savol matnini kiriting..."
              disabled={
                saving ||
                test.status !== "draft"
              }
            />
          </div>

          {currentType === "closed" ? (
            <div className="closedBlock">
              <div className="blockTitle">
                JAVOB VARIANTLARI
              </div>

              {options.map(
                (option, index) => (
                  <div
                    className={
                      option.is_correct
                        ? "optionRow correct"
                        : "optionRow"
                    }
                    key={
                      option.option_key
                    }
                  >
                    <button
                      type="button"
                      className="correctSelector"
                      onClick={() =>
                        setCorrectOption(
                          index
                        )
                      }
                      disabled={
                        saving ||
                        test.status !==
                          "draft"
                      }
                      title="To‘g‘ri javob sifatida belgilash"
                    >
                      {option.is_correct
                        ? "✓"
                        : ""}
                    </button>

                    <div className="optionLetter">
                      {
                        option.option_key
                      }
                    </div>

                    <input
                      value={
                        option.option_text
                      }
                      onChange={(
                        event
                      ) =>
                        updateOptionText(
                          index,
                          event.target.value
                        )
                      }
                      placeholder={`${option.option_key} variantini kiriting`}
                      disabled={
                        saving ||
                        test.status !==
                          "draft"
                      }
                    />
                  </div>
                )
              )}

              <p className="helper">
                Yashil belgi qo‘yilgan
                variant to‘g‘ri javob
                hisoblanadi.
              </p>
            </div>
          ) : (
            <div className="openBlock">
              <div className="blockTitle">
                QABUL QILINADIGAN TO‘G‘RI
                JAVOBLAR
              </div>

              <p className="helper">
                Bir ma’noni ifodalovchi bir
                nechta yozilish variantini
                qo‘shishingiz mumkin.
              </p>

              {acceptedAnswers.map(
                (
                  answer,
                  index
                ) => (
                  <div
                    className="answerRow"
                    key={index}
                  >
                    <div className="answerNumber">
                      {index + 1}
                    </div>

                    <input
                      value={answer}
                      onChange={(
                        event
                      ) =>
                        updateAcceptedAnswer(
                          index,
                          event.target.value
                        )
                      }
                      placeholder="To‘g‘ri javob..."
                      disabled={
                        saving ||
                        test.status !==
                          "draft"
                      }
                    />

                    <button
                      type="button"
                      className="removeButton"
                      onClick={() =>
                        removeAcceptedAnswer(
                          index
                        )
                      }
                      disabled={
                        saving ||
                        test.status !==
                          "draft"
                      }
                    >
                      ×
                    </button>
                  </div>
                )
              )}

              <button
                type="button"
                className="addAnswerButton"
                onClick={
                  addAcceptedAnswer
                }
                disabled={
                  saving ||
                  test.status !== "draft"
                }
              >
                + Yana javob qo‘shish
              </button>
            </div>
          )}

          <div className="bottomActions">
            <button
              type="button"
              className="navButton"
              disabled={
                currentNumber === 1 ||
                saving
              }
              onClick={() =>
                loadQuestionIntoEditor(
                  currentNumber - 1
                )
              }
            >
              ← Oldingi
            </button>

            <button
              type="button"
              className="saveButton"
              onClick={
                saveCurrentQuestion
              }
              disabled={
                saving ||
                test.status !== "draft"
              }
            >
              {saving
                ? "SAQLANMOQDA..."
                : test.status ===
                  "published"
                ? "TAHRIRLASH BLOKLANGAN"
                : "SAVOLNI SAQLASH"}
            </button>

            <button
              type="button"
              className="navButton"
              disabled={
                currentNumber === 45 ||
                saving
              }
              onClick={() =>
                loadQuestionIntoEditor(
                  currentNumber + 1
                )
              }
            >
              Keyingi →
            </button>
          </div>
        </section>
      </section>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          padding: 24px;
          background: linear-gradient(
            180deg,
            #edf3f6 0%,
            #dce6eb 100%
          );
          color: #142d3b;
          font-family: Arial, sans-serif;
        }

        .topHeader {
          width: min(1280px, 100%);
          margin: 0 auto 18px;
          padding: 20px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          border: 1px solid #285a76;
          border-radius: 18px;
          background: linear-gradient(
            180deg,
            #7dc6e9 0%,
            #50a7d3 100%
          );
          box-shadow:
            inset 0 4px 4px
              rgba(255, 255, 255, 0.65),
            0 6px 0 #315f76,
            0 12px 20px
              rgba(0, 0, 0, 0.15);
        }

        .miniTitle {
          color: #285974;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1.4px;
        }

        .topHeader h1 {
          margin: 5px 0;
          color: #102f42;
          font-size: 26px;
        }

        .topHeader p {
          margin: 0;
          color: #426a7e;
          font-size: 13px;
        }

        .headerActions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        button {
          font-family: inherit;
        }

        .grayButton,
        .publishButton {
          min-height: 42px;
          padding: 0 18px;
          border-radius: 10px;
          font-weight: 900;
          cursor: pointer;
        }

        .grayButton {
          border: 1px solid #657983;
          background: linear-gradient(
            180deg,
            #ffffff 0%,
            #d9e0e3 100%
          );
          color: #173344;
          box-shadow:
            inset 0 3px 3px
              rgba(255, 255, 255, 0.8),
            0 3px 0 #74858d;
        }

        .publishButton {
          border: 1px solid #337044;
          background: linear-gradient(
            180deg,
            #dff5e5 0%,
            #85c99b 100%
          );
          color: #17452b;
          box-shadow:
            inset 0 3px 3px
              rgba(255, 255, 255, 0.8),
            0 3px 0 #4c825d;
        }

        .publishedBadge {
          min-height: 42px;
          padding: 0 16px;
          display: flex;
          align-items: center;
          border: 1px solid #37764c;
          border-radius: 10px;
          background: #d9f3e1;
          color: #1e6036;
          font-size: 12px;
          font-weight: 900;
        }

        .stats {
          width: min(1280px, 100%);
          margin: 0 auto 18px;
          display: grid;
          grid-template-columns:
            repeat(5, minmax(0, 1fr));
          gap: 10px;
        }

        .stats div {
          min-height: 76px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          border: 1px solid #94a5ad;
          border-radius: 12px;
          background: linear-gradient(
            180deg,
            #ffffff 0%,
            #e8eef1 100%
          );
          box-shadow:
            inset 0 3px 3px
              rgba(255, 255, 255, 0.9),
            0 3px 0 #a0adb3;
          text-align: center;
        }

        .stats span {
          margin-bottom: 5px;
          color: #667983;
          font-size: 11px;
          font-weight: 800;
        }

        .stats strong {
          color: #133a50;
          font-size: 17px;
        }

        .globalMessage {
          width: min(1280px, 100%);
          margin: 0 auto 18px;
          padding: 14px 16px;
          border-radius: 11px;
          white-space: pre-line;
          font-size: 13px;
          font-weight: 800;
          line-height: 1.6;
        }

        .errorBox {
          border: 1px solid #b45e5e;
          background: #fff0f0;
          color: #8e2828;
        }

        .successBox {
          border: 1px solid #4c8b62;
          background: #ebf9ef;
          color: #24633a;
        }

        .workspace {
          width: min(1280px, 100%);
          margin: 0 auto;
          display: grid;
          grid-template-columns:
            260px minmax(0, 1fr);
          gap: 18px;
          align-items: start;
        }

        .navigator {
          position: sticky;
          top: 18px;
          padding: 16px;
          border: 1px solid #899ca7;
          border-radius: 16px;
          background: linear-gradient(
            180deg,
            #ffffff 0%,
            #e8eef1 100%
          );
          box-shadow:
            inset 0 4px 4px
              rgba(255, 255, 255, 0.9),
            0 5px 0 #97a6ad,
            0 10px 20px
              rgba(0, 0, 0, 0.1);
        }

        .navigatorTitle {
          margin-bottom: 12px;
          color: #34586a;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .questionGrid {
          display: grid;
          grid-template-columns:
            repeat(5, minmax(0, 1fr));
          gap: 7px;
        }

        .questionButton {
          aspect-ratio: 1;
          border: 1px solid #889aa4;
          border-radius: 8px;
          background: linear-gradient(
            180deg,
            #ffffff 0%,
            #dfe6e9 100%
          );
          color: #243f4e;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          box-shadow:
            inset 0 2px 2px
              rgba(255, 255, 255, 0.9),
            0 2px 0 #a1adb3;
        }

        .questionButton.openQuestion {
          border-color: #986b35;
          background: linear-gradient(
            180deg,
            #fff7e5 0%,
            #edd7a8 100%
          );
        }

        .questionButton.saved {
          border-color: #407856;
          background: linear-gradient(
            180deg,
            #e8f8ee 0%,
            #b9ddc5 100%
          );
        }

        .questionButton.active {
          border: 2px solid #174e70;
          background: linear-gradient(
            180deg,
            #9bdcff 0%,
            #4ba6d7 100%
          );
          color: #0c2f44;
          box-shadow:
            inset 0 3px 3px
              rgba(255, 255, 255, 0.75),
            0 3px 0 #245d7a;
        }

        .legend {
          margin-top: 15px;
          display: grid;
          gap: 7px;
          color: #60717a;
          font-size: 11px;
          font-weight: 700;
        }

        .legend div {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .dot {
          width: 12px;
          height: 12px;
          display: inline-block;
          border: 1px solid #778b95;
          border-radius: 3px;
        }

        .closedDot {
          background: #e9eef0;
        }

        .openDot {
          background: #edd7a8;
        }

        .savedDot {
          background: #b9ddc5;
        }

        .editorCard {
          padding: 22px;
          border: 1px solid #8b9fa9;
          border-radius: 18px;
          background: linear-gradient(
            180deg,
            #ffffff 0%,
            #edf2f4 100%
          );
          box-shadow:
            inset 0 4px 5px
              rgba(255, 255, 255, 0.95),
            0 6px 0 #95a5ad,
            0 13px 25px
              rgba(0, 0, 0, 0.12);
        }

        .editorHeader {
          margin-bottom: 20px;
          padding: 13px 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          border: 1px solid #32627c;
          border-radius: 11px;
          background: linear-gradient(
            180deg,
            #bce9fc 0%,
            #7fc4e1 100%
          );
          box-shadow:
            inset 0 3px 3px
              rgba(255, 255, 255, 0.75),
            0 3px 0 #46738a;
        }

        .editorHeader > div {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .editorHeader span {
          color: #4e7182;
          font-size: 11px;
          font-weight: 800;
        }

        .editorHeader strong {
          color: #13384c;
          font-size: 18px;
        }

        .pointsBox {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
        }

        .pointsBox input {
          width: 85px;
          height: 38px;
        }

        .lockedBox {
          margin-bottom: 18px;
          padding: 12px 14px;
          border: 1px solid #9b7a39;
          border-radius: 9px;
          background: #fff6dd;
          color: #72531d;
          font-size: 12px;
          font-weight: 800;
        }

        .field {
          margin-bottom: 20px;
        }

        .field > label,
        .blockTitle {
          display: block;
          margin-bottom: 8px;
          color: #2c4958;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.5px;
        }

        input,
        textarea {
          width: 100%;
          border: 1px solid #899da7;
          border-radius: 10px;
          outline: none;
          background: white;
          color: #142d3a;
          font: inherit;
          box-shadow:
            inset 0 2px 4px
              rgba(0, 0, 0, 0.06);
        }

        input {
          height: 46px;
          padding: 0 13px;
        }

        textarea {
          padding: 13px;
          resize: vertical;
          line-height: 1.5;
        }

        input:focus,
        textarea:focus {
          border-color: #3a8cb5;
          box-shadow:
            0 0 0 3px
              rgba(61, 147, 190, 0.14),
            inset 0 2px 3px
              rgba(0, 0, 0, 0.04);
        }

        input:disabled,
        textarea:disabled {
          background: #edf1f3;
          color: #65747c;
        }

        .closedBlock,
        .openBlock {
          margin-top: 10px;
          padding: 17px;
          border: 1px solid #98a8af;
          border-radius: 13px;
          background: linear-gradient(
            180deg,
            #f9fbfc 0%,
            #e6ecef 100%
          );
        }

        .optionRow,
        .answerRow {
          margin: 9px 0;
          display: grid;
          align-items: center;
          gap: 9px;
        }

        .optionRow {
          grid-template-columns:
            38px 38px minmax(0, 1fr);
        }

        .answerRow {
          grid-template-columns:
            36px minmax(0, 1fr) 38px;
        }

        .correctSelector {
          width: 38px;
          height: 38px;
          border: 1px solid #748a95;
          border-radius: 9px;
          background: linear-gradient(
            180deg,
            #ffffff 0%,
            #dde5e9 100%
          );
          color: #17633d;
          font-size: 20px;
          font-weight: 900;
          cursor: pointer;
        }

        .optionRow.correct
          .correctSelector {
          border-color: #2e8052;
          background: linear-gradient(
            180deg,
            #ddf5e6 0%,
            #9ed0ae 100%
          );
        }

        .optionLetter,
        .answerNumber {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #728a96;
          border-radius: 8px;
          background: linear-gradient(
            180deg,
            #bce7fa 0%,
            #76bad9 100%
          );
          color: #123a50;
          font-weight: 900;
        }

        .answerNumber {
          width: 36px;
          height: 36px;
        }

        .removeButton {
          width: 38px;
          height: 38px;
          border: 1px solid #a15d5d;
          border-radius: 8px;
          background: linear-gradient(
            180deg,
            #fff5f5 0%,
            #efc4c4 100%
          );
          color: #8c2929;
          font-size: 20px;
          font-weight: 900;
          cursor: pointer;
        }

        .addAnswerButton {
          min-height: 42px;
          margin-top: 8px;
          padding: 0 16px;
          border: 1px solid #46765a;
          border-radius: 9px;
          background: linear-gradient(
            180deg,
            #e8f6ed 0%,
            #b7d9c2 100%
          );
          color: #24553a;
          font-weight: 900;
          cursor: pointer;
        }

        .helper {
          margin: 8px 0;
          color: #677983;
          font-size: 11px;
          line-height: 1.5;
        }

        .bottomActions {
          margin-top: 22px;
          display: grid;
          grid-template-columns:
            140px minmax(0, 1fr) 140px;
          gap: 12px;
        }

        .navButton,
        .saveButton {
          min-height: 48px;
          border-radius: 10px;
          font-weight: 900;
          cursor: pointer;
        }

        .navButton {
          border: 1px solid #778993;
          background: linear-gradient(
            180deg,
            #ffffff 0%,
            #d9e0e4 100%
          );
          color: #273f4d;
          box-shadow:
            inset 0 3px 3px
              rgba(255, 255, 255, 0.8),
            0 3px 0 #8d9aa1;
        }

        .saveButton {
          border: 1px solid #215f7f;
          background: linear-gradient(
            180deg,
            #8bd4f1 0%,
            #49a6d3 100%
          );
          color: #102f42;
          box-shadow:
            inset 0 3px 3px
              rgba(255, 255, 255, 0.75),
            0 4px 0 #2e6682;
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 900px) {
          .stats {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .workspace {
            grid-template-columns: 1fr;
          }

          .navigator {
            position: static;
          }

          .questionGrid {
            grid-template-columns:
              repeat(9, minmax(0, 1fr));
          }
        }

        @media (max-width: 600px) {
          .page {
            padding: 12px;
          }

          .topHeader {
            flex-direction: column;
            align-items: flex-start;
          }

          .headerActions {
            width: 100%;
            justify-content: flex-start;
          }

          .stats {
            grid-template-columns: 1fr;
          }

          .questionGrid {
            grid-template-columns:
              repeat(5, minmax(0, 1fr));
          }

          .editorCard {
            padding: 14px;
          }

          .editorHeader {
            align-items: flex-start;
            flex-direction: column;
          }

          .optionRow {
            grid-template-columns:
              34px 34px minmax(0, 1fr);
          }

          .bottomActions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
