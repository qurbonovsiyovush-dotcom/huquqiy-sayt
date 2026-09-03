"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import QuestionDesigner from "@/components/national-certificate/QuestionDesigner";

type ImportedOption = {
  id: string;
  label: "A" | "B" | "C" | "D";
  text: string;
  isCorrect: boolean;
};

type ImportedQuestion = {
  id: string;
  number: number;
  type: "closed" | "open";
  questionText: string;
  questionHtml?: string;
  options: ImportedOption[];
  acceptedAnswers: string[];
  warning?: string;
};

type ImportResponse = {
  success?: boolean;
  message?: string;
  questions?: ImportedQuestion[];
  total?: number;
  expectedTotal?: number;
  closedCount?: number;
  openCount?: number;
  warningCount?: number;
  missingNumbers?: number[];
  ready?: boolean;
};

export default function NationalCertificatePdfImportPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(90);
  const [attemptLimitEnabled, setAttemptLimitEnabled] = useState(false);
  const [attemptLimit, setAttemptLimit] = useState(1);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<ImportedQuestion[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [activeQuestion, setActiveQuestion] = useState(1);

  const stats = useMemo(() => {
    const closed = questions.filter((q) => q.type === "closed").length;
    const open = questions.filter((q) => q.type === "open").length;
    const warnings = questions.filter((q) => Boolean(q.warning)).length;

    return {
      total: questions.length,
      closed,
      open,
      warnings,
      ready:
        questions.length === 45 &&
        closed === 35 &&
        open === 10,
    };
  }, [questions]);

  const current =
    questions.find((q) => q.number === activeQuestion) ??
    questions[0] ??
    null;

  function updateQuestion(
    id: string,
    updater: (question: ImportedQuestion) => ImportedQuestion
  ) {
    setQuestions((currentQuestions) =>
      currentQuestions.map((question) =>
        question.id === id ? updater(question) : question
      )
    );
  }

  function updateOption(
    questionId: string,
    optionId: string,
    patch: Partial<ImportedOption>
  ) {
    updateQuestion(questionId, (question) => ({
      ...question,
      options: question.options.map((option) =>
        option.id === optionId
          ? {
              ...option,
              ...patch,
            }
          : option
      ),
    }));
  }

  function setCorrectOption(questionId: string, optionId: string) {
    updateQuestion(questionId, (question) => ({
      ...question,
      options: question.options.map((option) => ({
        ...option,
        isCorrect: option.id === optionId,
      })),
    }));
  }

  function addAcceptedAnswer(questionId: string) {
    updateQuestion(questionId, (question) => ({
      ...question,
      acceptedAnswers: [...question.acceptedAnswers, ""],
    }));
  }

  function updateAcceptedAnswer(
    questionId: string,
    index: number,
    value: string
  ) {
    updateQuestion(questionId, (question) => ({
      ...question,
      acceptedAnswers: question.acceptedAnswers.map((answer, answerIndex) =>
        answerIndex === index ? value : answer
      ),
    }));
  }

  function removeAcceptedAnswer(questionId: string, index: number) {
    updateQuestion(questionId, (question) => ({
      ...question,
      acceptedAnswers: question.acceptedAnswers.filter(
        (_, answerIndex) => answerIndex !== index
      ),
    }));
  }

  async function analyzePdf() {
    if (!title.trim()) {
      setMessage("Test nomini kiriting.");
      return;
    }

    if (!pdfFile) {
      setMessage("Avval PDF faylni tanlang.");
      return;
    }

    try {
      setAnalyzing(true);
      setMessage("");
      setQuestions([]);

      const formData = new FormData();
      formData.append("file", pdfFile);

      const response = await fetch(
        "/api/national-certificate/tests/import-pdf",
        {
          method: "POST",
          credentials: "include",
          body: formData,
        }
      );

      const data: ImportResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "PDFni tahlil qilib bo‘lmadi."
        );
      }

      const loaded = Array.isArray(data.questions)
        ? data.questions
            .map((question) => ({
              ...question,
              type:
                question.number <= 35
                  ? ("closed" as const)
                  : ("open" as const),
              options:
                question.number <= 35
                  ? Array.isArray(question.options)
                    ? question.options
                    : []
                  : [],
              acceptedAnswers:
                question.number >= 36
                  ? Array.isArray(question.acceptedAnswers)
                    ? question.acceptedAnswers
                    : []
                  : [],
            }))
            .sort((a, b) => a.number - b.number)
        : [];

      setQuestions(loaded);

      if (loaded.length > 0) {
        setActiveQuestion(loaded[0].number);
      }

      if (data.ready) {
        setMessage(
          "PDF muvaffaqiyatli tahlil qilindi. 45 ta savol topildi."
        );
      } else {
        const missing =
          Array.isArray(data.missingNumbers) &&
          data.missingNumbers.length > 0
            ? ` Topilmagan savollar: ${data.missingNumbers.join(", ")}.`
            : "";

        setMessage(
          `PDF tahlil qilindi, lekin tekshirish kerak. Jami: ${
            data.total ?? loaded.length
          }, yopiq: ${data.closedCount ?? 0}, ochiq: ${
            data.openCount ?? 0
          }.${missing}`
        );
      }
    } catch (error) {
      console.error("NATIONAL CERTIFICATE PDF ANALYZE ERROR:", error);
      setMessage(
        error instanceof Error
          ? error.message
          : "PDFni tahlil qilishda xatolik yuz berdi."
      );
    } finally {
      setAnalyzing(false);
    }
  }

  function validateBeforeSave() {
    if (!title.trim()) {
      return "Test nomini kiriting.";
    }

    if (!Number.isFinite(duration) || duration <= 0) {
      return "Test vaqtini to‘g‘ri kiriting.";
    }

    if (questions.length !== 45) {
      return `45 ta savol bo‘lishi kerak. Hozir: ${questions.length} ta.`;
    }

    const numbers = new Set(questions.map((q) => q.number));

    for (let number = 1; number <= 45; number++) {
      if (!numbers.has(number)) {
        return `${number}-savol topilmadi.`;
      }
    }

    for (const question of questions) {
      if (!question.questionText.trim()) {
        return `${question.number}-savol matni bo‘sh.`;
      }

      if (question.number <= 35) {
        if (question.type !== "closed") {
          return `${question.number}-savol yopiq savol bo‘lishi kerak.`;
        }

        if (question.options.length !== 4) {
          return `${question.number}-savolda aynan 4 ta A/B/C/D variant bo‘lishi kerak.`;
        }

        if (question.options.some((option) => !option.text.trim())) {
          return `${question.number}-savolda bo‘sh variant bor.`;
        }

        const correctCount = question.options.filter(
          (option) => option.isCorrect
        ).length;

        if (correctCount !== 1) {
          return `${question.number}-savolda aynan 1 ta to‘g‘ri javob belgilang.`;
        }
      } else {
        if (question.type !== "open") {
          return `${question.number}-savol ochiq savol bo‘lishi kerak.`;
        }

        const answers = question.acceptedAnswers
          .map((answer) => answer.trim())
          .filter(Boolean);

        if (answers.length === 0) {
          return `${question.number}-savol uchun kamida 1 ta qabul qilinadigan javob kiriting.`;
        }
      }
    }

    return "";
  }

  async function saveToDatabase() {
    const validationError = validateBeforeSave();

    if (validationError) {
      setMessage(validationError);
      return;
    }

    const confirmed = window.confirm(
      "45 ta savol tekshirildi. Test Neon bazaga qoralama sifatida saqlansinmi?"
    );

    if (!confirmed) return;

    let createdTestId = "";

    try {
      setSaving(true);
      setMessage("Test yaratilmoqda...");

      const createResponse = await fetch(
        "/api/national-certificate/tests",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            duration: Number(duration),
            durationMinutes: Number(duration),
            attemptLimit: attemptLimitEnabled
              ? Math.max(1, Number(attemptLimit) || 1)
              : null,
          }),
        }
      );

      const createData = await createResponse.json();

      if (!createResponse.ok || !createData?.success) {
        throw new Error(
          createData?.message || "Testni yaratib bo‘lmadi."
        );
      }

      createdTestId =
        createData?.test?.id ||
        createData?.id ||
        "";

      if (!createdTestId) {
        throw new Error("Yaratilgan test ID si qaytmadi.");
      }

      const ordered = [...questions].sort(
        (a, b) => a.number - b.number
      );

      for (let index = 0; index < ordered.length; index++) {
        const question = ordered[index];

        setMessage(
          `${question.number}-savol saqlanmoqda... (${index + 1}/45)`
        );

        const payload =
          question.type === "closed"
            ? {
                number: question.number,
                type: "closed",
                questionText: question.questionText.trim(),
                questionHtml: (question.questionHtml || "").trim(),
                points: 1,
                options: question.options.map((option) => ({
                  key: option.label,
                  optionKey: option.label,
                  label: option.label,
                  text: option.text.trim(),
                  optionText: option.text.trim(),
                  html: option.text.trim(),
                  isCorrect: option.isCorrect,
                  correct: option.isCorrect,
                })),
              }
            : {
                number: question.number,
                type: "open",
                questionText: question.questionText.trim(),
                questionHtml: (question.questionHtml || "").trim(),
                points: 1,
                acceptedAnswers: question.acceptedAnswers
                  .map((answer) => answer.trim())
                  .filter(Boolean),
                answers: question.acceptedAnswers
                  .map((answer) => answer.trim())
                  .filter(Boolean),
              };

        const questionResponse = await fetch(
          `/api/national-certificate/tests/${encodeURIComponent(
            createdTestId
          )}/questions`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        const questionData = await questionResponse.json();

        if (!questionResponse.ok || !questionData?.success) {
          throw new Error(
            `${question.number}-savolni saqlab bo‘lmadi: ${
              questionData?.message || "Noma’lum xatolik"
            }`
          );
        }
      }

      window.alert(
        "PDFdan Milliy sertifikat testi muvaffaqiyatli yaratildi."
      );

      router.push(
        `/admin/tests/national-certificate/${encodeURIComponent(
          createdTestId
        )}`
      );
    } catch (error) {
      console.error("NATIONAL CERTIFICATE PDF SAVE ERROR:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Testni saqlashda xatolik yuz berdi."
      );

      if (createdTestId) {
        window.alert(
          "Test yaratildi, lekin ayrim savollarni saqlashda xatolik yuz berdi. Test muharririga kirib tekshirib chiqing."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page">
      <header className="header">
        <div className="headerTitle">
          <span>ADMIN PANEL</span>
          <strong>Milliy sertifikat — PDF import</strong>
        </div>

        <div className="headerActions">
          <button
            type="button"
            className="grayButton"
            onClick={() =>
              router.push("/admin/tests")
            }
          >
            Testlarni boshqarish
          </button>

          <button
            type="button"
            className="grayButton"
            onClick={() =>
              router.push(
                "/admin/tests/national-certificate/new"
              )
            }
          >
            Oddiy yaratish
          </button>
        </div>
      </header>

      <section className="setupCard">
        <div className="floatingTitle">
          PDF → 45 ta savol
        </div>

        <div className="formatBar">
          <div>
            <strong>35</strong>
            <span>Yopiq savol</span>
          </div>

          <div>
            <strong>10</strong>
            <span>Ochiq savol</span>
          </div>

          <div>
            <strong>45</strong>
            <span>Jami</span>
          </div>

          <div>
            <strong>{duration || 0}</strong>
            <span>Daqiqa</span>
          </div>
        </div>

        <div className="formGrid">
          <label className="field">
            <span>Test nomi</span>
            <input
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              placeholder="Masalan: Milliy sertifikat — Sinov 2"
            />
          </label>

          <label className="field">
            <span>Test vaqti (daqiqa)</span>
            <input
              type="number"
              min={1}
              value={duration}
              onChange={(event) =>
                setDuration(
                  Math.max(
                    1,
                    Number(event.target.value) || 1
                  )
                )
              }
            />
          </label>

          <label className="field full">
            <span>Izoh</span>
            <textarea
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              placeholder="Ixtiyoriy izoh"
            />
          </label>

          <div className="field full">
            <span>Urinishlar soni</span>

            <div className="attemptRow">
              <label className="checkLine">
                <input
                  type="checkbox"
                  checked={attemptLimitEnabled}
                  onChange={(event) =>
                    setAttemptLimitEnabled(
                      event.target.checked
                    )
                  }
                />
                <b>Cheklash</b>
              </label>

              {attemptLimitEnabled && (
                <input
                  className="smallInput"
                  type="number"
                  min={1}
                  value={attemptLimit}
                  onChange={(event) =>
                    setAttemptLimit(
                      Math.max(
                        1,
                        Number(event.target.value) || 1
                      )
                    )
                  }
                />
              )}
            </div>
          </div>
        </div>

        <div className="uploadBox">
          <label className="filePicker">
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) =>
                setPdfFile(
                  event.target.files?.[0] || null
                )
              }
            />

            <span className="fileIcon">PDF</span>

            <div>
              <strong>
                {pdfFile
                  ? pdfFile.name
                  : "PDF faylni tanlang"}
              </strong>

              <small>
                1–35 yopiq, 36–45 ochiq savollar
              </small>
            </div>
          </label>

          <button
            type="button"
            className="blueButton analyzeButton"
            onClick={analyzePdf}
            disabled={analyzing || saving}
          >
            {analyzing
              ? "Tahlil qilinmoqda..."
              : "PDFni tahlil qilish"}
          </button>
        </div>

        {message && (
          <div className="messageBox">
            {message}
          </div>
        )}
      </section>

      {questions.length > 0 && (
        <>
          <section className="statsGrid">
            <div className="statCard">
              <strong>{stats.total}/45</strong>
              <span>Jami savol</span>
            </div>

            <div className="statCard">
              <strong>{stats.closed}/35</strong>
              <span>Yopiq</span>
            </div>

            <div className="statCard">
              <strong>{stats.open}/10</strong>
              <span>Ochiq</span>
            </div>

            <div
              className={
                stats.warnings > 0
                  ? "statCard warningStat"
                  : "statCard"
              }
            >
              <strong>{stats.warnings}</strong>
              <span>Ogohlantirish</span>
            </div>
          </section>

          <section className="editorLayout">
            <aside className="navigator">
              <div className="navigatorTitle">
                Savollar
              </div>

              <div className="numberGrid">
                {Array.from(
                  { length: 45 },
                  (_, index) => index + 1
                ).map((number) => {
                  const question =
                    questions.find(
                      (item) =>
                        item.number === number
                    );

                  const className = [
                    "numberButton",
                    activeQuestion === number
                      ? "activeNumber"
                      : "",
                    question?.warning
                      ? "warningNumber"
                      : "",
                    !question
                      ? "missingNumber"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <button
                      type="button"
                      key={number}
                      className={className}
                      onClick={() =>
                        setActiveQuestion(number)
                      }
                    >
                      {number}
                    </button>
                  );
                })}
              </div>

              <div className="legend">
                <span>
                  <i className="legendReady" />
                  Topilgan
                </span>

                <span>
                  <i className="legendWarning" />
                  Tekshirish
                </span>

                <span>
                  <i className="legendMissing" />
                  Topilmagan
                </span>
              </div>
            </aside>

            <section className="questionEditor">
              {!current ? (
                <div className="emptyEditor">
                  Bu savol PDFdan topilmadi.
                </div>
              ) : (
                <>
                  <div className="questionHead">
                    <div>
                      <strong>
                        {current.number}-savol
                      </strong>

                      <span
                        className={
                          current.type === "closed"
                            ? "typeBadge closedBadge"
                            : "typeBadge openBadge"
                        }
                      >
                        {current.type === "closed"
                          ? "Yopiq savol"
                          : "Ochiq savol"}
                      </span>
                    </div>

                    <span className="pointBadge">
                      1 ball
                    </span>
                  </div>

                  {current.warning && (
                    <div className="warningBox">
                      {current.warning}
                    </div>
                  )}

                  <label className="questionTextField">
                    <span>Savol matni</span>

                    <textarea
                      value={current.questionText}
                      onChange={(event) =>
                        updateQuestion(
                          current.id,
                          (question) => ({
                            ...question,
                            questionText:
                              event.target.value,
                          })
                        )
                      }
                    />
                  </label>

                  <div className="designerPanel">
                    <div className="designerPanelTitle">
                      KUCHLI SAVOL MUHARRIRI
                    </div>

                    <p className="designerHelp">
                      PDFdan kelgan savolni shu yerda boyiting: matn formatlash, rasm, jadval,
                      qo‘lda jadval/chiziq, Eyler–Venn, shakllar, rang, copy/paste va 8 nuqtadan resize.
                    </p>

                    <QuestionDesigner
                      value={current.questionHtml || ""}
                      onChange={(html) =>
                        updateCurrent({
                          questionHtml: html,
                        })
                      }
                    />
                  </div>

                  {current.type === "closed" ? (
                    <div className="optionsEditor">
                      <div className="sectionLabel">
                        A/B/C/D variantlar
                      </div>

                      {current.options.map(
                        (option) => (
                          <div
                            key={option.id}
                            className={
                              option.isCorrect
                                ? "optionRow correctOption"
                                : "optionRow"
                            }
                          >
                            <button
                              type="button"
                              className="optionKey"
                              onClick={() =>
                                setCorrectOption(
                                  current.id,
                                  option.id
                                )
                              }
                              title="To‘g‘ri javobni belgilash"
                            >
                              {option.label}
                            </button>

                            <textarea
                              value={option.text}
                              onChange={(event) =>
                                updateOption(
                                  current.id,
                                  option.id,
                                  {
                                    text:
                                      event.target.value,
                                  }
                                )
                              }
                            />

                            <label className="correctCheck">
                              <input
                                type="radio"
                                name={`correct-${current.id}`}
                                checked={
                                  option.isCorrect
                                }
                                onChange={() =>
                                  setCorrectOption(
                                    current.id,
                                    option.id
                                  )
                                }
                              />

                              <span>
                                To‘g‘ri
                              </span>
                            </label>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="openEditor">
                      <div className="sectionLabel">
                        Qabul qilinadigan javoblar
                      </div>

                      {current.acceptedAnswers.length ===
                        0 && (
                        <div className="noAnswerBox">
                          Javob topilmadi. Qo‘lda kiriting.
                        </div>
                      )}

                      {current.acceptedAnswers.map(
                        (answer, index) => (
                          <div
                            className="answerRow"
                            key={`${current.id}-answer-${index}`}
                          >
                            <span>
                              {index + 1}
                            </span>

                            <input
                              value={answer}
                              onChange={(event) =>
                                updateAcceptedAnswer(
                                  current.id,
                                  index,
                                  event.target.value
                                )
                              }
                              placeholder="Masalan: Toshkent"
                            />

                            <button
                              type="button"
                              onClick={() =>
                                removeAcceptedAnswer(
                                  current.id,
                                  index
                                )
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
                        onClick={() =>
                          addAcceptedAnswer(
                            current.id
                          )
                        }
                      >
                        + Javob qo‘shish
                      </button>
                    </div>
                  )}

                  <div className="editorFooter">
                    <button
                      type="button"
                      className="stepButton"
                      disabled={current.number <= 1}
                      onClick={() =>
                        setActiveQuestion(
                          Math.max(
                            1,
                            current.number - 1
                          )
                        )
                      }
                    >
                      ← Oldingi
                    </button>

                    <button
                      type="button"
                      className="stepButton"
                      disabled={current.number >= 45}
                      onClick={() =>
                        setActiveQuestion(
                          Math.min(
                            45,
                            current.number + 1
                          )
                        )
                      }
                    >
                      Keyingi →
                    </button>
                  </div>
                </>
              )}
            </section>
          </section>

          <section className="savePanel">
            <div>
              <strong>
                Milliy sertifikat testini saqlash
              </strong>

              <p>
                Saqlashdan oldin 45 ta savol,
                A/B/C/D javoblar va 36–45
                savollarning ochiq javoblarini tekshiring.
              </p>
            </div>

            <button
              type="button"
              className="saveButton"
              onClick={saveToDatabase}
              disabled={saving || analyzing}
            >
              {saving
                ? "Saqlanmoqda..."
                : "Neon bazaga saqlash"}
            </button>
          </section>
        </>
      )}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          padding: 20px;
          background:
            radial-gradient(
              circle at 10% 0%,
              rgba(255, 255, 255, 0.96),
              transparent 26%
            ),
            linear-gradient(
              180deg,
              #e7edf2 0%,
              #cbd5dc 100%
            );
          color: #101820;
          font-family:
            Georgia,
            "Times New Roman",
            serif;
        }

        .header,
        .setupCard,
        .navigator,
        .questionEditor,
        .savePanel,
        .statCard {
          border: 2px solid #263d4b;
          box-shadow:
            inset 0 5px 4px rgba(255,255,255,.75),
            0 6px 0 #263d4b,
            0 12px 24px rgba(14, 31, 43, .22);
        }

        .header {
          max-width: 1640px;
          min-height: 148px;
          margin: 0 auto 28px;
          padding: 24px 28px;
          border-radius: 24px;
          background:
            linear-gradient(
              180deg,
              #56c8ff 0%,
              #0c87d8 48%,
              #0768b5 100%
            );
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .headerTitle {
          min-width: 320px;
          padding: 15px 22px;
          border: 2px solid #303b42;
          border-radius: 16px;
          background:
            linear-gradient(
              180deg,
              #f7f8f9 0%,
              #bfc9cf 100%
            );
          box-shadow:
            inset 0 4px 3px #fff,
            0 5px 0 #35434c,
            0 9px 15px rgba(0,0,0,.22);
        }

        .headerTitle span,
        .headerTitle strong {
          display: block;
        }

        .headerTitle span {
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .headerTitle strong {
          margin-top: 5px;
          font-size: clamp(24px, 2vw, 34px);
        }

        .headerActions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        button {
          font: inherit;
        }

        .grayButton,
        .blueButton,
        .saveButton,
        .stepButton,
        .addAnswerButton {
          min-height: 48px;
          padding: 10px 18px;
          border: 2px solid #263d4b;
          border-radius: 13px;
          font-weight: 900;
          cursor: pointer;
          box-shadow:
            inset 0 3px 2px rgba(255,255,255,.85),
            0 4px 0 #263d4b,
            0 8px 12px rgba(0,0,0,.16);
          transition:
            transform .12s ease,
            box-shadow .12s ease;
        }

        .grayButton {
          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #cbd2d7 100%
            );
        }

        .blueButton,
        .saveButton,
        .stepButton {
          color: #fff;
          background:
            linear-gradient(
              180deg,
              #58caff 0%,
              #0784d5 58%,
              #0267ad 100%
            );
        }

        .grayButton:active,
        .blueButton:active,
        .saveButton:active,
        .stepButton:active,
        .addAnswerButton:active {
          transform: translateY(3px);
          box-shadow:
            inset 0 2px 3px rgba(0,0,0,.12),
            0 1px 0 #263d4b;
        }

        button:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .setupCard {
          position: relative;
          max-width: 1640px;
          margin: 0 auto 26px;
          padding: 34px 24px 24px;
          border-radius: 22px;
          background:
            linear-gradient(
              180deg,
              #f7f9fa 0%,
              #cfd8de 100%
            );
        }

        .floatingTitle {
          position: absolute;
          top: -18px;
          left: 26px;
          padding: 8px 18px;
          border: 2px solid #263d4b;
          border-radius: 12px;
          background:
            linear-gradient(
              180deg,
              #65d0ff 0%,
              #168cd5 100%
            );
          color: #fff;
          font-weight: 900;
          box-shadow:
            inset 0 3px 2px rgba(255,255,255,.7),
            0 4px 0 #263d4b;
        }

        .formatBar,
        .statsGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .formatBar {
          margin-bottom: 20px;
        }

        .formatBar > div,
        .statCard {
          min-height: 92px;
          padding: 14px;
          border: 2px solid #50636e;
          border-radius: 15px;
          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #d9e0e4 100%
            );
          box-shadow:
            inset 0 4px 3px #fff,
            0 4px 0 #657680;
          text-align: center;
        }

        .formatBar strong,
        .statCard strong {
          display: block;
          font-size: 28px;
        }

        .formatBar span,
        .statCard span {
          display: block;
          margin-top: 4px;
          font-weight: 800;
        }

        .formGrid {
          display: grid;
          grid-template-columns: 1fr 260px;
          gap: 16px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field.full {
          grid-column: 1 / -1;
        }

        .field > span,
        .sectionLabel,
        .questionTextField > span {
          font-weight: 900;
          font-size: 16px;
        }

        input,
        textarea {
          width: 100%;
          border: 2px solid #556973;
          border-radius: 12px;
          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #eef2f4 100%
            );
          color: #101820;
          font: inherit;
          font-size: 16px;
          outline: none;
          box-shadow:
            inset 0 3px 5px rgba(40, 59, 70, .14),
            0 2px 0 rgba(255,255,255,.9);
        }

        input {
          min-height: 50px;
          padding: 10px 13px;
        }

        textarea {
          min-height: 92px;
          padding: 12px 14px;
          resize: vertical;
        }

        input:focus,
        textarea:focus {
          border-color: #0a81cd;
          box-shadow:
            inset 0 3px 5px rgba(40, 59, 70, .14),
            0 0 0 3px rgba(14, 144, 216, .18);
        }

        .attemptRow {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .checkLine {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .checkLine input {
          width: 20px;
          min-height: 20px;
        }

        .smallInput {
          max-width: 130px;
        }

        .uploadBox {
          margin-top: 20px;
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: 16px;
          align-items: stretch;
        }

        .filePicker {
          min-height: 88px;
          padding: 14px 18px;
          border: 2px dashed #27658b;
          border-radius: 16px;
          background:
            linear-gradient(
              180deg,
              #effaff 0%,
              #c7e8f9 100%
            );
          display: flex;
          align-items: center;
          gap: 14px;
          cursor: pointer;
          box-shadow:
            inset 0 4px 4px rgba(255,255,255,.9),
            0 4px 0 #7798aa;
        }

        .filePicker input {
          display: none;
        }

        .fileIcon {
          width: 58px;
          height: 58px;
          border: 2px solid #244c63;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #c8d3da 100%
            );
          font-weight: 900;
          color: #b01616;
          box-shadow:
            inset 0 3px 2px #fff,
            0 3px 0 #516875;
        }

        .filePicker strong,
        .filePicker small {
          display: block;
        }

        .filePicker strong {
          font-size: 18px;
        }

        .filePicker small {
          margin-top: 5px;
          color: #314b5b;
        }

        .analyzeButton {
          min-height: 88px;
          font-size: 17px;
        }

        .messageBox {
          margin-top: 18px;
          padding: 14px 16px;
          border: 2px solid #3d687e;
          border-radius: 13px;
          background:
            linear-gradient(
              180deg,
              #effaff 0%,
              #c8eaf8 100%
            );
          font-weight: 800;
          box-shadow:
            inset 0 3px 3px rgba(255,255,255,.9),
            0 3px 0 #688492;
        }

        .statsGrid {
          max-width: 1640px;
          margin: 0 auto 24px;
        }

        .warningStat {
          background:
            linear-gradient(
              180deg,
              #fff8d9 0%,
              #f0d36b 100%
            );
        }

        .editorLayout {
          max-width: 1640px;
          margin: 0 auto 26px;
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 22px;
          align-items: start;
        }

        .navigator,
        .questionEditor {
          border-radius: 20px;
        }

        .navigator {
          position: sticky;
          top: 18px;
          padding: 18px;
          background:
            linear-gradient(
              180deg,
              #d3dbe0 0%,
              #87959d 100%
            );
        }

        .navigatorTitle {
          margin-bottom: 15px;
          padding: 10px;
          border: 2px solid #304650;
          border-radius: 12px;
          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #c8d0d5 100%
            );
          text-align: center;
          font-weight: 900;
          font-size: 20px;
          box-shadow:
            inset 0 3px 2px #fff,
            0 3px 0 #42545d;
        }

        .numberGrid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
        }

        .numberButton {
          min-width: 0;
          min-height: 42px;
          border: 2px solid #3b4f59;
          border-radius: 10px;
          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #c5d0d6 100%
            );
          font-weight: 900;
          cursor: pointer;
          box-shadow:
            inset 0 2px 2px #fff,
            0 3px 0 #52636c;
        }

        .activeNumber {
          color: #fff;
          background:
            linear-gradient(
              180deg,
              #60d0ff 0%,
              #0783d2 100%
            );
        }

        .warningNumber {
          background:
            linear-gradient(
              180deg,
              #fff4bb 0%,
              #e8bd35 100%
            );
          color: #1c1c1c;
        }

        .missingNumber {
          background:
            linear-gradient(
              180deg,
              #f4f4f4 0%,
              #bababa 100%
            );
          color: #777;
        }

        .legend {
          margin-top: 16px;
          display: grid;
          gap: 8px;
          font-size: 13px;
          font-weight: 800;
        }

        .legend span {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .legend i {
          width: 16px;
          height: 16px;
          border: 1px solid #333;
          border-radius: 4px;
        }

        .legendReady {
          background: #e9f3f8;
        }

        .legendWarning {
          background: #e8bd35;
        }

        .legendMissing {
          background: #aaa;
        }

        .questionEditor {
          min-height: 620px;
          padding: 22px;
          background:
            linear-gradient(
              180deg,
              #eef2f4 0%,
              #cbd4d9 100%
            );
        }

        .questionHead {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          margin-bottom: 18px;
          padding: 13px 16px;
          border: 2px solid #3b5360;
          border-radius: 14px;
          background:
            linear-gradient(
              180deg,
              #fdfefe 0%,
              #c3cdd3 100%
            );
          box-shadow:
            inset 0 4px 3px #fff,
            0 4px 0 #51636d;
        }

        .questionHead > div {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }

        .questionHead strong {
          font-size: 24px;
        }

        .typeBadge,
        .pointBadge {
          padding: 7px 11px;
          border: 2px solid #385262;
          border-radius: 10px;
          font-weight: 900;
          box-shadow:
            inset 0 2px 2px rgba(255,255,255,.8),
            0 2px 0 #4d6471;
        }

        .closedBadge {
          background: #bfe6fa;
        }

        .openBadge {
          background: #d5f0d8;
        }

        .pointBadge {
          background: #fff;
        }

        .warningBox {
          margin-bottom: 16px;
          padding: 13px 15px;
          border: 2px solid #a67d12;
          border-radius: 12px;
          background:
            linear-gradient(
              180deg,
              #fff8d9 0%,
              #f2d467 100%
            );
          font-weight: 800;
          box-shadow:
            inset 0 3px 2px rgba(255,255,255,.8),
            0 3px 0 #a88420;
        }

        .designerPanel {
          margin-top: 16px;
          padding: 14px;
          border: 2px solid #536a75;
          border-radius: 14px;
          background: linear-gradient(180deg, #eef4f7, #cbd7dd);
          box-shadow: inset 0 3px 2px rgba(255,255,255,.85), 0 4px 0 #687b85;
        }

        .designerPanelTitle {
          display: inline-block;
          padding: 8px 13px;
          border: 2px solid #36515e;
          border-radius: 9px;
          color: #fff;
          font-weight: 900;
          background: linear-gradient(180deg, #62d3ff, #087fc8);
          box-shadow: inset 0 3px 2px rgba(255,255,255,.65), 0 3px 0 #36515e;
        }

        .designerHelp {
          margin: 10px 0;
          font-size: 12px;
          font-weight: 700;
          color: #485b65;
        }

        .questionTextField {
          display: grid;
          gap: 8px;
        }

        .questionTextField textarea {
          min-height: 150px;
          font-size: 20px;
          font-weight: 700;
          line-height: 1.45;
        }

        .optionsEditor,
        .openEditor {
          margin-top: 22px;
        }

        .sectionLabel {
          margin-bottom: 12px;
        }

        .optionRow {
          margin-bottom: 12px;
          padding: 10px;
          border: 2px solid #667983;
          border-radius: 14px;
          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #dce3e7 100%
            );
          display: grid;
          grid-template-columns: 56px 1fr 110px;
          gap: 10px;
          align-items: stretch;
          box-shadow:
            inset 0 3px 3px rgba(255,255,255,.9),
            0 4px 0 #74848d;
        }

        .correctOption {
          border-color: #147438;
          background:
            linear-gradient(
              180deg,
              #effff3 0%,
              #bde7c8 100%
            );
          box-shadow:
            inset 0 3px 3px rgba(255,255,255,.9),
            0 4px 0 #2c8b4b;
        }

        .optionKey {
          border: 2px solid #244959;
          border-radius: 12px;
          background:
            linear-gradient(
              180deg,
              #64d2ff 0%,
              #0b83cf 100%
            );
          color: #fff;
          font-weight: 900;
          font-size: 22px;
          cursor: pointer;
          box-shadow:
            inset 0 3px 2px rgba(255,255,255,.65),
            0 3px 0 #244959;
        }

        .optionRow textarea {
          min-height: 74px;
        }

        .correctCheck {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 7px;
          font-weight: 900;
        }

        .correctCheck input {
          width: 20px;
          min-height: 20px;
        }

        .answerRow {
          margin-bottom: 10px;
          display: grid;
          grid-template-columns: 46px 1fr 50px;
          gap: 10px;
        }

        .answerRow > span,
        .answerRow > button {
          border: 2px solid #3b5360;
          border-radius: 10px;
          display: grid;
          place-items: center;
          font-weight: 900;
          box-shadow:
            inset 0 2px 2px rgba(255,255,255,.8),
            0 2px 0 #566b76;
        }

        .answerRow > span {
          background: #d8e4ea;
        }

        .answerRow > button {
          background:
            linear-gradient(
              180deg,
              #ffb0b0 0%,
              #d54a4a 100%
            );
          cursor: pointer;
        }

        .addAnswerButton {
          background:
            linear-gradient(
              180deg,
              #eaffef 0%,
              #8bd49d 100%
            );
        }

        .noAnswerBox {
          margin-bottom: 12px;
          padding: 12px;
          border: 2px dashed #956f0c;
          border-radius: 10px;
          background: #fff6cb;
          font-weight: 800;
        }

        .editorFooter {
          margin-top: 24px;
          display: flex;
          justify-content: space-between;
          gap: 14px;
        }

        .stepButton {
          min-width: 170px;
        }

        .emptyEditor {
          min-height: 560px;
          display: grid;
          place-items: center;
          font-size: 24px;
          font-weight: 900;
          color: #596a73;
        }

        .savePanel {
          max-width: 1640px;
          margin: 0 auto 50px;
          padding: 20px 24px;
          border-radius: 20px;
          background:
            linear-gradient(
              180deg,
              #d2dae0 0%,
              #89979f 100%
            );
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .savePanel strong {
          display: block;
          font-size: 23px;
        }

        .savePanel p {
          margin: 5px 0 0;
          font-weight: 700;
        }

        .saveButton {
          min-width: 260px;
          min-height: 58px;
          font-size: 17px;
        }

        @media (max-width: 1050px) {
          .header {
            align-items: stretch;
            flex-direction: column;
          }

          .headerActions {
            justify-content: flex-start;
          }

          .editorLayout {
            grid-template-columns: 1fr;
          }

          .navigator {
            position: static;
          }

          .numberGrid {
            grid-template-columns:
              repeat(9, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .page {
            padding: 12px;
          }

          .formatBar,
          .statsGrid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .formGrid,
          .uploadBox {
            grid-template-columns: 1fr;
          }

          .headerTitle {
            min-width: 0;
          }

          .numberGrid {
            grid-template-columns:
              repeat(5, minmax(0, 1fr));
          }

          .questionEditor {
            padding: 14px;
          }

          .optionRow {
            grid-template-columns: 50px 1fr;
          }

          .correctCheck {
            grid-column: 1 / -1;
            justify-content: flex-start;
          }

          .editorFooter,
          .savePanel {
            flex-direction: column;
            align-items: stretch;
          }

          .stepButton,
          .saveButton {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}
