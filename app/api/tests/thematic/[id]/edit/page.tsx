"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type TestStatus = "draft" | "published";

type EditOption = {
  id: string;
  label: string;
  text: string;
  html?: string;
  isCorrect: boolean;
};

type EditQuestion = {
  id: string;
  number: number;
  questionText: string;
  questionHtml?: string;
  points: number;
  shapes?: unknown[];
  options: EditOption[];
};

type EditTest = {
  id: string;
  bookId?: string;
  bookTitle?: string;
  grade?: number;
  subject?: string;
  sectionType?: string;
  title: string;
  description: string;
  duration: number;
  attemptLimit: number | null;
  status: TestStatus;
  questionCount: number;
  questions: EditQuestion[];
};

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function plainToHtml(value: string) {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

export default function ThematicAdminEditorPage() {
  const router = useRouter();
  const params = useParams();

  const testId = Array.isArray(params?.id)
    ? String(params.id[0] || "")
    : String(params?.id || "");

  const [test, setTest] = useState<EditTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  async function readJson(response: Response) {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  async function loadTest() {
    if (!/^\d+$/.test(testId)) {
      setError("Test ID noto‘g‘ri.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/tests/thematic?id=${encodeURIComponent(testId)}`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      const data = await readJson(response);

      if (!response.ok || !data?.success || !data?.test) {
        throw new Error(
          data?.message || "Mavzulashtirilgan testni yuklab bo‘lmadi."
        );
      }

      const raw = data.test;

      const normalized: EditTest = {
        id: String(raw.id || testId),
        bookId: raw.bookId ? String(raw.bookId) : undefined,
        bookTitle: String(raw.bookTitle || ""),
        grade: Number(raw.grade) || undefined,
        subject: String(raw.subject || ""),
        sectionType: String(raw.sectionType || "lesson"),
        title: String(raw.title || ""),
        description: String(raw.description || ""),
        duration: Math.max(1, Number(raw.duration) || 60),
        attemptLimit:
          raw.attemptLimit === null || raw.attemptLimit === undefined
            ? null
            : Math.max(1, Number(raw.attemptLimit) || 1),
        status: raw.status === "published" ? "published" : "draft",
        questionCount: Number(raw.questionCount) || 0,
        questions: Array.isArray(raw.questions)
          ? raw.questions.map((question: any, questionIndex: number) => ({
              id: String(question?.id || ""),
              number: Number(question?.number) || questionIndex + 1,
              questionText: String(
                question?.questionText || question?.questionHtml || ""
              ),
              questionHtml: String(
                question?.questionHtml || question?.questionText || ""
              ),
              points: Math.max(1, Number(question?.points) || 1),
              shapes: Array.isArray(question?.shapes) ? question.shapes : [],
              options: Array.isArray(question?.options)
                ? question.options.map((option: any, optionIndex: number) => ({
                    id: String(option?.id || ""),
                    label: String(
                      option?.label || String.fromCharCode(65 + optionIndex)
                    ),
                    text: String(option?.text || option?.html || ""),
                    html: String(option?.html || option?.text || ""),
                    isCorrect: option?.isCorrect === true,
                  }))
                : [],
            }))
          : [],
      };

      setTest(normalized);
    } catch (err) {
      setTest(null);
      setError(
        err instanceof Error
          ? err.message
          : "Mavzulashtirilgan testni yuklashda xatolik."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  const visibleQuestions = useMemo(() => {
    if (!test) return [];

    const query = search.trim().toLowerCase();
    if (!query) return test.questions.map((question, index) => ({ question, index }));

    return test.questions
      .map((question, index) => ({ question, index }))
      .filter(({ question, index }) => {
        const haystack = [
          String(index + 1),
          question.questionText,
          ...question.options.map((option) => option.text),
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(query);
      });
  }, [test, search]);

  function updateQuestionText(index: number, value: string) {
    setTest((current) => {
      if (!current) return current;

      const questions = [...current.questions];
      questions[index] = {
        ...questions[index],
        questionText: value,
        questionHtml: plainToHtml(value),
      };

      return { ...current, questions };
    });
  }

  function updateOptionText(
    questionIndex: number,
    optionIndex: number,
    value: string
  ) {
    setTest((current) => {
      if (!current) return current;

      const questions = [...current.questions];
      const question = { ...questions[questionIndex] };
      const options = [...question.options];

      options[optionIndex] = {
        ...options[optionIndex],
        text: value,
        html: plainToHtml(value),
      };

      question.options = options;
      questions[questionIndex] = question;

      return { ...current, questions };
    });
  }

  function setCorrectOption(questionIndex: number, optionIndex: number) {
    setTest((current) => {
      if (!current) return current;

      const questions = [...current.questions];
      const question = { ...questions[questionIndex] };

      question.options = question.options.map((option, index) => ({
        ...option,
        isCorrect: index === optionIndex,
      }));

      questions[questionIndex] = question;
      return { ...current, questions };
    });
  }

  function validateBeforeSave(current: EditTest) {
    if (!current.title.trim()) {
      return "Test nomi bo‘sh bo‘lishi mumkin emas.";
    }

    if (!Number.isFinite(Number(current.duration)) || Number(current.duration) < 1) {
      return "Vaqt kamida 1 daqiqa bo‘lishi kerak.";
    }

    for (let index = 0; index < current.questions.length; index++) {
      const question = current.questions[index];

      if (!question.questionText.trim()) {
        return `${index + 1}-savol matni bo‘sh.`;
      }

      if (!Array.isArray(question.options) || question.options.length === 0) {
        return `${index + 1}-savolda variantlar yo‘q.`;
      }

      const correctCount = question.options.filter(
        (option) => option.isCorrect
      ).length;

      if (correctCount !== 1) {
        return `${index + 1}-savolda aynan 1 ta to‘g‘ri javob tanlanishi kerak.`;
      }
    }

    return "";
  }

  async function saveTest() {
    if (!test || saving) return;

    const validationError = validateBeforeSave(test);
    if (validationError) {
      window.alert(validationError);
      return;
    }

    const confirmed = window.confirm(
      `O‘zgarishlar Neon bazasiga saqlanadi.\n\n` +
        `Test: ${test.title}\n` +
        `Vaqt: ${test.duration} daqiqa\n` +
        `Savollar: ${test.questions.length} ta\n` +
        `Holat: ${test.status === "published" ? "E’lon qilingan" : "Qoralama"}\n\n` +
        `Davom etasizmi?`
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setMessage("Saqlanmoqda...");

    try {
      const response = await fetch("/api/tests/thematic", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "update-test",
          testId: test.id,
          title: test.title.trim(),
          description: test.description,
          durationMinutes: Math.max(1, Number(test.duration) || 60),
          attemptLimit:
            test.attemptLimit === null
              ? null
              : Math.max(1, Number(test.attemptLimit) || 1),
          status: test.status,
          questions: test.questions.map((question, questionIndex) => ({
            id: question.id,
            number: questionIndex + 1,
            questionText: question.questionText,
            questionHtml: plainToHtml(question.questionText),
            points: question.points,
            options: question.options.map((option, optionIndex) => ({
              id: option.id,
              label:
                option.label || String.fromCharCode(65 + optionIndex),
              text: option.text,
              html: plainToHtml(option.text),
              isCorrect: option.isCorrect,
            })),
          })),
        }),
      });

      const data = await readJson(response);

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Testni saqlab bo‘lmadi.");
      }

      setMessage(
        `${Number(data?.questionCount) || test.questions.length} ta savol bilan saqlandi.`
      );

      window.alert("Test muvaffaqiyatli Neon bazasida yangilandi.");
      await loadTest();
    } catch (err) {
      const text =
        err instanceof Error ? err.message : "Testni saqlashda xatolik.";
      setError(text);
      setMessage("");
      window.alert(text);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="page">
        <div className="statusCard">Test yuklanmoqda...</div>
        <style jsx>{styles}</style>
      </main>
    );
  }

  if (!test) {
    return (
      <main className="page">
        <div className="errorCard">{error || "Test topilmadi."}</div>
        <button className="backButton" onClick={() => router.push("/admin/tests")}>
          ← Testlarni boshqarish
        </button>
        <style jsx>{styles}</style>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="topBar">
        <div>
          <div className="eyebrow">ADMIN PANEL</div>
          <h1>Mavzulashtirilgan testni tahrirlash</h1>
        </div>

        <div className="topActions">
          <button
            type="button"
            className="grayButton"
            disabled={saving}
            onClick={() => router.push("/admin/tests")}
          >
            ← Orqaga
          </button>

          {test.status === "published" && (
            <button
              type="button"
              className="viewButton"
              disabled={saving}
              onClick={() =>
                router.push(`/test/thematic/solve/${encodeURIComponent(test.id)}`)
              }
            >
              Testni ko‘rish
            </button>
          )}

          <button
            type="button"
            className="saveButton"
            disabled={saving}
            onClick={saveTest}
          >
            {saving ? "Saqlanmoqda..." : "✓ O‘zgarishlarni saqlash"}
          </button>
        </div>
      </header>

      {error && <div className="errorCard">{error}</div>}
      {message && <div className="messageCard">{message}</div>}

      <section className="metaCard">
        <div className="floatingTitle">Test sozlamalari</div>

        <div className="metaGrid">
          <label className="field wide">
            <span>Test nomi</span>
            <input
              value={test.title}
              onChange={(event) =>
                setTest((current) =>
                  current ? { ...current, title: event.target.value } : current
                )
              }
            />
          </label>

          <label className="field">
            <span>Vaqt (daqiqa)</span>
            <input
              type="number"
              min={1}
              value={test.duration}
              onChange={(event) =>
                setTest((current) =>
                  current
                    ? {
                        ...current,
                        duration: Math.max(1, Number(event.target.value) || 1),
                      }
                    : current
                )
              }
            />
          </label>

          <label className="field">
            <span>Urinishlar soni</span>
            <input
              type="number"
              min={1}
              placeholder="Cheklanmagan"
              value={test.attemptLimit ?? ""}
              onChange={(event) =>
                setTest((current) =>
                  current
                    ? {
                        ...current,
                        attemptLimit:
                          event.target.value === ""
                            ? null
                            : Math.max(1, Number(event.target.value) || 1),
                      }
                    : current
                )
              }
            />
          </label>

          <label className="field">
            <span>Holati</span>
            <select
              value={test.status}
              onChange={(event) =>
                setTest((current) =>
                  current
                    ? {
                        ...current,
                        status:
                          event.target.value === "published"
                            ? "published"
                            : "draft",
                      }
                    : current
                )
              }
            >
              <option value="draft">Qoralama</option>
              <option value="published">E’lon qilingan</option>
            </select>
          </label>

          <label className="field wide">
            <span>Izoh</span>
            <textarea
              rows={3}
              value={test.description}
              onChange={(event) =>
                setTest((current) =>
                  current
                    ? { ...current, description: event.target.value }
                    : current
                )
              }
            />
          </label>
        </div>

        <div className="metaInfo">
          <span>
            <b>Kitob:</b> {test.bookTitle || "—"}
          </span>
          <span>
            <b>Sinf:</b> {test.grade ? `${test.grade}-sinf` : "—"}
          </span>
          <span>
            <b>Savollar:</b> {test.questions.length} ta
          </span>
        </div>
      </section>

      <section className="questionsCard">
        <div className="floatingTitle">Savollar va variantlar</div>

        <div className="questionToolbar">
          <strong>Jami {test.questions.length} ta savol</strong>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Savol yoki variant bo‘yicha qidirish..."
          />
          <span>{visibleQuestions.length} ta ko‘rsatilmoqda</span>
        </div>

        <div className="questionList">
          {visibleQuestions.map(({ question, index }) => (
            <details className="questionItem" key={question.id}>
              <summary>
                <span className="questionNumber">{index + 1}</span>
                <span className="summaryText">
                  {question.questionText.trim() || "Savol matni yo‘q"}
                </span>
                <span className="correctMini">
                  {question.options.find((option) => option.isCorrect)?.label || "—"}
                </span>
              </summary>

              <div className="questionBody">
                <label className="field wide">
                  <span>Savol matni</span>
                  <textarea
                    rows={5}
                    value={question.questionText}
                    onChange={(event) =>
                      updateQuestionText(index, event.target.value)
                    }
                  />
                </label>

                <div className="optionsTitle">
                  Variantlar — to‘g‘ri javobni chapdagi doira orqali tanlang
                </div>

                <div className="optionList">
                  {question.options.map((option, optionIndex) => (
                    <div
                      className={
                        option.isCorrect ? "optionRow correctRow" : "optionRow"
                      }
                      key={option.id}
                    >
                      <label className="correctPicker" title="To‘g‘ri javob">
                        <input
                          type="radio"
                          name={`correct-${question.id}`}
                          checked={option.isCorrect}
                          onChange={() => setCorrectOption(index, optionIndex)}
                        />
                        <strong>{option.label}</strong>
                      </label>

                      <textarea
                        rows={2}
                        value={option.text}
                        onChange={(event) =>
                          updateOptionText(index, optionIndex, event.target.value)
                        }
                      />

                      {option.isCorrect && (
                        <span className="correctBadge">TO‘G‘RI</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>

      <div className="bottomActions">
        <button
          type="button"
          className="grayButton"
          disabled={saving}
          onClick={() => router.push("/admin/tests")}
        >
          Bekor qilish
        </button>

        <button
          type="button"
          className="saveButton bigSave"
          disabled={saving}
          onClick={saveTest}
        >
          {saving ? "Saqlanmoqda..." : "✓ Neon bazaga saqlash"}
        </button>
      </div>

      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
  :global(*) { box-sizing: border-box; }

  .page {
    min-height: 100vh;
    padding: 28px 20px 60px;
    background: linear-gradient(180deg,#dff3ff 0%,#c7e4f3 100%);
    color: #152a35;
    font-family: "Times New Roman", serif;
  }

  .topBar,
  .metaCard,
  .questionsCard,
  .statusCard,
  .errorCard,
  .messageCard {
    width: min(1280px, 100%);
    margin-left: auto;
    margin-right: auto;
  }

  .topBar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 28px;
    padding: 20px 24px;
    border: 2px solid #435b68;
    border-radius: 18px;
    background: linear-gradient(180deg,#ffffff 0%,#dfe8ed 100%);
    box-shadow: inset 0 3px 0 #fff, 0 7px 0 #62747e, 0 12px 20px rgba(0,0,0,.15);
  }

  .eyebrow { font-size: 13px; font-weight: 900; letter-spacing: .13em; color: #1470a1; }
  h1 { margin: 4px 0 0; font-size: 29px; line-height: 1.15; }

  .topActions,
  .bottomActions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  button {
    min-height: 46px;
    padding: 10px 18px;
    border: 2px solid #334d5c;
    border-radius: 10px;
    font-family: inherit;
    font-size: 16px;
    font-weight: 900;
    cursor: pointer;
    box-shadow: inset 0 2px 0 rgba(255,255,255,.9), 0 4px 0 #425b69;
  }

  button:disabled { opacity: .55; cursor: not-allowed; }
  .grayButton { background: linear-gradient(#fff,#d5dadd); color: #263942; }
  .viewButton { background: linear-gradient(#d9f5ff,#79c6e7); color: #073b68; }
  .saveButton { background: linear-gradient(#dff6df,#6fbe75); color: #153e20; border-color: #2f6840; }

  .statusCard,
  .errorCard,
  .messageCard {
    margin-top: 20px;
    padding: 18px 20px;
    border: 2px solid #50636e;
    border-radius: 14px;
    background: #fff;
    font-size: 18px;
    font-weight: 800;
  }

  .errorCard { border-color: #a43e3e; background: #fff0f0; color: #7c1f1f; }
  .messageCard { border-color: #3f7b51; background: #edf9f0; color: #225632; }

  .metaCard,
  .questionsCard {
    position: relative;
    margin-top: 36px;
    padding: 34px 22px 24px;
    border: 2px solid #4b5961;
    border-radius: 18px;
    background: linear-gradient(180deg,#edf1f3 0%,#d0d7da 100%);
    box-shadow: inset 0 3px 0 rgba(255,255,255,.92), 0 7px 0 #68747a, 0 12px 20px rgba(0,0,0,.14);
  }

  .floatingTitle {
    position: absolute;
    top: -22px;
    left: 50%;
    transform: translateX(-50%);
    min-width: 220px;
    padding: 9px 22px;
    border: 2px solid #4d6572;
    border-radius: 11px;
    background: linear-gradient(#f8fbfc,#c9d5da);
    box-shadow: inset 0 2px 0 #fff, 0 5px 0 #63737b;
    text-align: center;
    font-size: 20px;
    font-weight: 900;
  }

  .metaGrid {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr;
    gap: 16px;
  }

  .field { display: flex; flex-direction: column; gap: 7px; }
  .field.wide { grid-column: 1 / -1; }
  .field > span { font-size: 15px; font-weight: 900; }

  input,
  textarea,
  select {
    width: 100%;
    border: 2px solid #71818a;
    border-radius: 9px;
    background: #fff;
    color: #111;
    padding: 10px 12px;
    font-family: inherit;
    font-size: 17px;
    font-weight: 700;
    outline: none;
  }

  textarea { resize: vertical; line-height: 1.4; }
  input:focus, textarea:focus, select:focus { border-color: #168fc9; box-shadow: 0 0 0 3px rgba(22,143,201,.13); }

  .metaInfo {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 18px;
  }

  .metaInfo span {
    padding: 8px 11px;
    border: 1px solid #96a4ac;
    border-radius: 8px;
    background: #f8fbfc;
  }

  .questionToolbar {
    display: grid;
    grid-template-columns: auto minmax(260px,1fr) auto;
    align-items: center;
    gap: 14px;
    margin-bottom: 16px;
  }

  .questionToolbar > span { font-weight: 800; }

  .questionList { display: grid; gap: 12px; }

  .questionItem {
    border: 2px solid #65747c;
    border-radius: 12px;
    background: linear-gradient(#fff,#e8edef);
    overflow: hidden;
    box-shadow: 0 4px 0 #89969c;
  }

  .questionItem summary {
    min-height: 62px;
    display: grid;
    grid-template-columns: 44px minmax(0,1fr) 46px;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    cursor: pointer;
    list-style: none;
  }

  .questionItem summary::-webkit-details-marker { display: none; }

  .questionNumber,
  .correctMini {
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    border: 2px solid #426276;
    border-radius: 9px;
    background: #dff2fc;
    font-weight: 900;
  }

  .correctMini { border-color: #3f7a4d; background: #e1f4e5; color: #245a32; }
  .summaryText { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 17px; font-weight: 900; }

  .questionBody {
    padding: 18px;
    border-top: 2px solid #9aa7ad;
    background: rgba(255,255,255,.62);
  }

  .optionsTitle { margin: 18px 0 10px; font-weight: 900; }
  .optionList { display: grid; gap: 10px; }

  .optionRow {
    display: grid;
    grid-template-columns: 72px minmax(0,1fr) 86px;
    align-items: center;
    gap: 12px;
    padding: 10px;
    border: 2px solid #8b989f;
    border-radius: 10px;
    background: #f7f8f9;
  }

  .correctRow { border-color: #3e8750; background: #ebf8ee; }

  .correctPicker {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
  }

  .correctPicker input { width: 20px; height: 20px; padding: 0; }
  .correctPicker strong { font-size: 20px; }
  .correctBadge { text-align: center; color: #27683a; font-size: 12px; font-weight: 900; }

  .bottomActions {
    width: min(1280px,100%);
    margin: 28px auto 0;
  }

  .bigSave { min-width: 260px; }
  .backButton { margin-top: 18px; }

  @media (max-width: 900px) {
    .topBar { align-items: stretch; flex-direction: column; }
    .topActions { justify-content: flex-start; }
    .metaGrid { grid-template-columns: 1fr 1fr; }
    .field.wide { grid-column: 1 / -1; }
    .questionToolbar { grid-template-columns: 1fr; }
  }

  @media (max-width: 620px) {
    .page { padding: 20px 10px 40px; }
    .metaGrid { grid-template-columns: 1fr; }
    .field.wide { grid-column: auto; }
    .optionRow { grid-template-columns: 62px minmax(0,1fr); }
    .correctBadge { grid-column: 2; }
    h1 { font-size: 23px; }
  }
`;

