"use client";

import { useEffect, useMemo, useState } from "react";

type VocabularyWord = {
  word: string;
  translation: string;
  example?: string;
  exampleTranslation?: string;
};

type VocabularyResponse = {
  success: boolean;
  message?: string;
  book?: number;
  unit?: number;
  count?: number;
  words?: VocabularyWord[];
};

export default function DictionaryAdminPage() {
  const [book, setBook] = useState("1");
  const [unit, setUnit] = useState("1");
  const [text, setText] = useState("");

  const [savedWords, setSavedWords] = useState<VocabularyWord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const books = Array.from({ length: 6 }, (_, i) => i + 1);
  const units = Array.from({ length: 30 }, (_, i) => i + 1);

  /* =========================================================
     SO‘ZLARNI PARSE QILISH
  ========================================================= */

  const parsedWords = useMemo(() => {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line): VocabularyWord | null => {
        const parts = line.split("|").map((part) => part.trim());

        if (parts.length < 2) {
          return null;
        }

        const word = parts[0] || "";
        const translation = parts[1] || "";
        const example = parts[2] || "";
        const exampleTranslation = parts[3] || "";

        if (!word || !translation) {
          return null;
        }

        return {
          word,
          translation,
          ...(example ? { example } : {}),
          ...(exampleTranslation ? { exampleTranslation } : {}),
        };
      })
      .filter((item): item is VocabularyWord => item !== null);
  }, [text]);

  const totalLines = useMemo(() => {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean).length;
  }, [text]);

  const invalidLines = totalLines - parsedWords.length;

  const exampleCount = useMemo(() => {
    return parsedWords.filter(
      (item) => Boolean(item.example && item.exampleTranslation)
    ).length;
  }, [parsedWords]);

  /* =========================================================
     SO‘ZLARNI YUKLASH
  ========================================================= */

  async function loadWords() {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const response = await fetch(
        `/api/vocabulary?book=${book}&unit=${unit}&t=${Date.now()}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = (await response.json()) as VocabularyResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "So‘zlarni yuklashda xatolik yuz berdi."
        );
      }

      setSavedWords(Array.isArray(data.words) ? data.words : []);
    } catch (err) {
      console.error("Vocabulary load error:", err);

      setSavedWords([]);

      setError(
        err instanceof Error
          ? err.message
          : "So‘zlarni yuklashda xatolik yuz berdi."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book, unit]);

  /* =========================================================
     IMPORT
  ========================================================= */

  async function handleImport() {
    try {
      setError("");
      setMessage("");

      if (!text.trim()) {
        setError("Avval so‘zlarni kiriting.");
        return;
      }

      if (invalidLines > 0) {
        setError(`${invalidLines} ta qator noto‘g‘ri formatda.`);
        return;
      }

      if (parsedWords.length === 0) {
        setError(
          "Import qilish uchun kamida bitta to‘g‘ri so‘z bo‘lishi kerak."
        );
        return;
      }

      const confirmed = window.confirm(
        `Book ${book}, Unit ${unit} uchun ${parsedWords.length} ta so‘zni saqlaysizmi?\n\n` +
          `Misol gap bilan: ${exampleCount} ta\n\n` +
          `Agar bu Unit oldin mavjud bo‘lsa, eski so‘zlar yangilari bilan almashtiriladi.`
      );

      if (!confirmed) {
        return;
      }

      setSaving(true);

      const response = await fetch("/api/vocabulary", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          book: Number(book),
          unit: Number(unit),
          words: parsedWords,
        }),
      });

      const data = (await response.json()) as VocabularyResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "So‘zlarni saqlashda xatolik yuz berdi."
        );
      }

      const newlySavedWords = Array.isArray(data.words)
        ? data.words
        : parsedWords;

      setSavedWords(newlySavedWords);

      setMessage(
        data.message ||
          `Book ${book}, Unit ${unit} uchun ${newlySavedWords.length} ta so‘z saqlandi.`
      );

      setText("");
    } catch (err) {
      console.error("Vocabulary import error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "So‘zlarni saqlashda xatolik yuz berdi."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =========================================================
     TAHRIRLASH
  ========================================================= */

  function loadSavedIntoEditor() {
    if (savedWords.length === 0) {
      setError("Bu Unitda hali saqlangan so‘zlar yo‘q.");
      return;
    }

    const prepared = savedWords
      .map((item) => {
        return [
          item.word,
          item.translation,
          item.example || "",
          item.exampleTranslation || "",
        ].join(" | ");
      })
      .join("\n");

    setText(prepared);

    setMessage("Saqlangan so‘zlar tahrirlash maydoniga yuklandi.");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  return (
    <main className="page">
      <div className="pageGlow pageGlowOne" />
      <div className="pageGlow pageGlowTwo" />

      <div className="container">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="topPanel">
          <div className="topLeft">
            <div className="logoMark">
              <span>QS</span>
            </div>

            <div>
              <div className="siteName">
                Qurbonov Siyovush Jamaliddinzoda
              </div>

              <div className="siteSub">
                English Vocabulary boshqaruv paneli
              </div>
            </div>
          </div>

          <div className="adminBadge">
            <span className="adminDot" />
            Admin
          </div>
        </div>

        {/* =====================================================
            TITLE
        ===================================================== */}

        <div className="titleBlock">
          <div className="titleLine" />

          <div>
            <h1>English Vocabulary</h1>

            <p>
              4000 Essential English Words — so‘zlar va misol gaplarni
              boshqarish
            </p>
          </div>
        </div>

        {/* =====================================================
            MAIN CARD
        ===================================================== */}

        <section className="panel">
          <div className="panelTop">
            <div>
              <div className="sectionLabel">LUG‘AT BOSHQARUVI</div>

              <h2>Unitga so‘z qo‘shish</h2>
            </div>

            <div className="selectionBadge">
              Book {book} / Unit {unit}
            </div>
          </div>

          {/* BOOK UNIT */}

          <div className="selectorGrid">
            <div className="field">
              <label>Book</label>

              <div className="input3d">
                <select
                  value={book}
                  onChange={(e) => {
                    setBook(e.target.value);
                    setText("");
                    setMessage("");
                    setError("");
                  }}
                >
                  {books.map((number) => (
                    <option key={number} value={number}>
                      Book {number}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <label>Unit</label>

              <div className="input3d">
                <select
                  value={unit}
                  onChange={(e) => {
                    setUnit(e.target.value);
                    setText("");
                    setMessage("");
                    setError("");
                  }}
                >
                  {units.map((number) => (
                    <option key={number} value={number}>
                      Unit {number}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* CURRENT SELECTION */}

          <div className="currentSelection">
            <div className="currentCircle">✓</div>

            <div>
              <span>Tanlangan bo‘lim</span>

              <strong>
                Book {book}
                <b>→</b>
                Unit {unit}
              </strong>
            </div>
          </div>

          {/* MESSAGES */}

          {message && (
            <div className="alert successAlert">
              <div className="alertIcon">✓</div>
              {message}
            </div>
          )}

          {error && (
            <div className="alert errorAlert">
              <div className="alertIcon">!</div>
              {error}
            </div>
          )}

          {/* EDITOR HEADER */}

          <div className="editorHeader">
            <div>
              <h3>So‘zlarni kiriting</h3>

              <p>
                Format:
                <strong>
                  {" "}
                  English | Uzbek | English example | Uzbek example
                </strong>
              </p>

              <p>
                Misol gap bo‘lmasa:
                <strong> English | Uzbek</strong>
              </p>
            </div>

            <div className="lineCounter">
              {totalLines === 0 ? "0 qator" : `${totalLines} qator`}
            </div>
          </div>

          {/* TEXTAREA */}

          <div
            className={`textareaOuter ${
              invalidLines > 0 ? "textareaInvalid" : ""
            }`}
          >
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck={false}
              placeholder={`afraid | qo‘rqqan | I am afraid of dogs. | Men itlardan qo‘rqaman.
agree | rozi bo‘lmoq | I agree with you. | Men sizga qo‘shilaman.
angry | jahli chiqqan | He is angry with me. | U mendan jahli chiqdi.`}
            />
          </div>

          {/* STATISTICS + BUTTON */}

          <div className="controlRow">
            <div className="stats">
              <div className="statItem">
                <span>Qator</span>
                <strong>{totalLines}</strong>
              </div>

              <div className="statItem good">
                <span>To‘g‘ri</span>
                <strong>{parsedWords.length}</strong>
              </div>

              <div className={`statItem ${invalidLines > 0 ? "bad" : ""}`}>
                <span>Xato</span>
                <strong>{invalidLines}</strong>
              </div>

              <div className="statItem">
                <span>Misol gap</span>
                <strong>{exampleCount}</strong>
              </div>
            </div>

            <button
              type="button"
              className="importButton"
              disabled={
                saving ||
                parsedWords.length === 0 ||
                invalidLines > 0
              }
              onClick={handleImport}
            >
              {saving ? "Saqlanmoqda..." : "Import qilish"}
            </button>
          </div>
        </section>

        {/* =====================================================
            SAVED WORDS
        ===================================================== */}

        <section className="panel savedPanel">
          <div className="savedTop">
            <div>
              <div className="sectionLabel">SAQLANGAN MA’LUMOTLAR</div>

              <h2>Saqlangan so‘zlar</h2>

              <p>
                Book {book} → Unit {unit}
              </p>
            </div>

            <div className="savedControls">
              <div className="savedCount">
                {savedWords.length}
                <span> ta</span>
              </div>

              <button
                type="button"
                className="smallButton editButton"
                onClick={loadSavedIntoEditor}
                disabled={loading || savedWords.length === 0}
              >
                Tahrirlash
              </button>

              <button
                type="button"
                className="smallButton refreshButton"
                onClick={loadWords}
                disabled={loading}
              >
                {loading ? "Yuklanmoqda..." : "Yangilash"}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="emptyState">
              <div className="spinner" />
              <strong>So‘zlar yuklanmoqda...</strong>
            </div>
          ) : savedWords.length === 0 ? (
            <div className="emptyState">
              <strong>Bu Unit uchun hali so‘z saqlanmagan.</strong>

              <span>
                So‘zlarni yuqoridagi maydonga kiriting va Import qilish
                tugmasini bosing.
              </span>
            </div>
          ) : (
            <div className="wordList">
              {savedWords.map((item, index) => (
                <div
                  className="wordRow"
                  key={`${item.word}-${index}`}
                >
                  <div className="wordNumber">
                    {index + 1}
                  </div>

                  <div className="wordContent">
                    <div className="wordLine">
                      <strong className="englishWord">
                        {item.word}
                      </strong>

                      <span className="divider">—</span>

                      <span className="uzbekWord">
                        {item.translation}
                      </span>
                    </div>

                    {(item.example ||
                      item.exampleTranslation) && (
                      <div className="exampleArea">
                        {item.example && (
                          <div className="englishExample">
                            {item.example}
                          </div>
                        )}

                        {item.exampleTranslation && (
                          <div className="uzbekExample">
                            {item.exampleTranslation}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
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
          position: relative;
          overflow: hidden;

          padding: 28px 20px 60px;

          font-family: "Bell MT", "Times New Roman", serif;

          color: #1c2733;

          background:
            linear-gradient(
              180deg,
              #f3f5f7 0%,
              #e8ebef 50%,
              #dde2e7 100%
            );
        }

        .pageGlow {
          position: fixed;
          pointer-events: none;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.18;
        }

        .pageGlowOne {
          width: 380px;
          height: 380px;
          background: #789fc2;

          top: -180px;
          left: -150px;
        }

        .pageGlowTwo {
          width: 420px;
          height: 420px;
          background: #aac2d6;

          right: -220px;
          bottom: 70px;
        }

        .container {
          position: relative;
          z-index: 2;

          max-width: 1180px;
          margin: 0 auto;
        }

        /* =====================================================
           TOP PANEL
        ===================================================== */

        .topPanel {
          display: flex;
          justify-content: space-between;
          align-items: center;

          gap: 20px;

          padding: 18px 22px;

          border: 1px solid #cdd3da;

          border-radius: 18px;

          background:
            linear-gradient(
              145deg,
              #f7f8fa,
              #dde2e7
            );

          box-shadow:
            8px 8px 18px rgba(83, 92, 103, 0.18),
            -7px -7px 16px rgba(255, 255, 255, 0.92),
            inset 1px 1px 0 rgba(255, 255, 255, 0.8);
        }

        .topLeft {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .logoMark {
          width: 48px;
          height: 48px;

          display: grid;
          place-items: center;

          border-radius: 13px;

          color: white;

          font-family: "Times New Roman", serif;
          font-size: 16px;
          font-weight: 700;

          background:
            linear-gradient(
              145deg,
              #628cac,
              #315c7d
            );

          box-shadow:
            4px 5px 9px rgba(43, 70, 91, 0.3),
            inset 2px 2px 4px rgba(255,255,255,.3);
        }

        .siteName {
          color: #143d5d;
          font-size: 20px;
          font-weight: 700;
        }

        .siteSub {
          margin-top: 3px;
          color: #7a828b;
          font-size: 14px;
        }

        .adminBadge {
          display: flex;
          align-items: center;
          gap: 8px;

          padding: 9px 14px;

          border-radius: 11px;

          background:
            linear-gradient(
              145deg,
              #ffffff,
              #d9dee4
            );

          border: 1px solid #d0d6dc;

          color: #40515f;

          font-size: 14px;
          font-weight: 700;

          box-shadow:
            4px 4px 8px rgba(80, 90, 101, 0.14),
            -4px -4px 8px rgba(255,255,255,.85);
        }

        .adminDot {
          width: 7px;
          height: 7px;

          border-radius: 50%;

          background: #3d8761;
        }

        /* =====================================================
           TITLE
        ===================================================== */

        .titleBlock {
          display: flex;
          align-items: center;
          gap: 16px;

          margin: 31px 5px 22px;
        }

        .titleLine {
          width: 5px;
          height: 59px;

          border-radius: 6px;

          background:
            linear-gradient(
              180deg,
              #315d7e,
              #8ba8bd
            );

          box-shadow:
            2px 2px 5px rgba(41, 69, 90, 0.22);
        }

        .titleBlock h1 {
          margin: 0;

          color: #163f5f;

          font-size: 36px;
          line-height: 1;
        }

        .titleBlock p {
          margin: 8px 0 0;

          color: #757e87;

          font-size: 16px;
        }

        /* =====================================================
           PANEL
        ===================================================== */

        .panel {
          border-radius: 20px;

          padding: 27px;

          border: 1px solid #cbd1d7;

          background:
            linear-gradient(
              145deg,
              #f4f6f8,
              #dfe3e7
            );

          box-shadow:
            10px 10px 22px rgba(76, 85, 95, 0.18),
            -8px -8px 18px rgba(255,255,255,.9),
            inset 1px 1px 0 rgba(255,255,255,.8);
        }

        .panelTop,
        .savedTop {
          display: flex;

          justify-content: space-between;
          align-items: center;

          flex-wrap: wrap;

          gap: 17px;

          margin-bottom: 25px;
        }

        .sectionLabel {
          margin-bottom: 5px;

          color: #6f8190;

          font-family: Arial, sans-serif;

          font-size: 10px;
          font-weight: 800;

          letter-spacing: 1.8px;
        }

        .panel h2 {
          margin: 0;

          color: #202f3c;

          font-size: 27px;
        }

        .selectionBadge {
          padding: 9px 14px;

          border-radius: 11px;

          color: #294d68;

          background:
            linear-gradient(
              145deg,
              #e6edf3,
              #cbd6df
            );

          border: 1px solid #c4cfd7;

          box-shadow:
            4px 4px 8px rgba(70, 82, 92, .15),
            -3px -3px 6px rgba(255,255,255,.8);

          font-size: 14px;
          font-weight: 700;
        }

        /* =====================================================
           FIELDS
        ===================================================== */

        .selectorGrid {
          display: grid;

          grid-template-columns:
            repeat(2, minmax(0, 1fr));

          gap: 20px;
        }

        .field label {
          display: block;

          margin: 0 0 8px 3px;

          color: #3d4a55;

          font-size: 17px;
          font-weight: 700;
        }

        .input3d {
          padding: 3px;

          border-radius: 12px;

          background:
            linear-gradient(
              145deg,
              #cbd0d6,
              #ffffff
            );

          box-shadow:
            inset 3px 3px 6px rgba(68, 79, 90, .17),
            inset -3px -3px 6px rgba(255,255,255,.88);
        }

        select {
          width: 100%;
          height: 51px;

          padding: 0 15px;

          border: none;

          border-radius: 10px;

          outline: none;

          background:
            linear-gradient(
              180deg,
              #ffffff,
              #f1f3f5
            );

          color: #2b3946;

          font-family: inherit;

          font-size: 17px;
          font-weight: 700;

          cursor: pointer;
        }

        /* =====================================================
           CURRENT SELECTION
        ===================================================== */

        .currentSelection {
          display: flex;
          align-items: center;

          gap: 13px;

          margin-top: 22px;

          padding: 13px 16px;

          border-radius: 13px;

          border: 1px solid #bccbd6;

          background:
            linear-gradient(
              145deg,
              #dfe8ef,
              #cbd9e3
            );

          box-shadow:
            inset 2px 2px 4px rgba(255,255,255,.7),
            4px 4px 9px rgba(70, 87, 99, .13);
        }

        .currentCircle {
          width: 35px;
          height: 35px;

          display: grid;
          place-items: center;

          border-radius: 50%;

          color: white;

          background:
            linear-gradient(
              145deg,
              #547e9e,
              #2e5776
            );

          box-shadow:
            3px 3px 6px rgba(41,68,89,.25),
            inset 2px 2px 3px rgba(255,255,255,.3);

          font-family: Arial, sans-serif;
          font-weight: 800;
        }

        .currentSelection span {
          display: block;

          margin-bottom: 2px;

          color: #667684;

          font-size: 12px;
        }

        .currentSelection strong {
          color: #234d6b;

          font-size: 17px;
        }

        .currentSelection b {
          margin: 0 9px;
        }

        /* =====================================================
           ALERTS
        ===================================================== */

        .alert {
          display: flex;
          align-items: center;

          gap: 10px;

          padding: 12px 15px;

          margin-top: 16px;

          border-radius: 11px;

          font-weight: 700;
        }

        .successAlert {
          color: #416554;

          border: 1px solid #bfcfc6;

          background: #e6eee9;
        }

        .errorAlert {
          color: #874d4a;

          border: 1px solid #dbc2bf;

          background: #f1e6e4;
        }

        .alertIcon {
          width: 27px;
          height: 27px;

          display: grid;
          place-items: center;

          border-radius: 50%;

          background: rgba(255,255,255,.65);

          font-family: Arial, sans-serif;
        }

        /* =====================================================
           EDITOR
        ===================================================== */

        .editorHeader {
          display: flex;

          justify-content: space-between;
          align-items: flex-end;

          gap: 20px;

          flex-wrap: wrap;

          margin-top: 27px;
          margin-bottom: 11px;
        }

        .editorHeader h3 {
          margin: 0 0 7px;

          color: #263847;

          font-size: 21px;
        }

        .editorHeader p {
          margin: 3px 0;

          color: #747d85;

          font-size: 14px;
        }

        .lineCounter {
          padding: 8px 12px;

          border-radius: 10px;

          color: #556978;

          background:
            linear-gradient(
              145deg,
              #f4f6f8,
              #d4d9df
            );

          border: 1px solid #d0d5da;

          box-shadow:
            3px 3px 6px rgba(79,89,99,.12),
            -3px -3px 6px rgba(255,255,255,.85);

          font-size: 13px;
          font-weight: 700;
        }

        .textareaOuter {
          padding: 4px;

          border-radius: 14px;

          background:
            linear-gradient(
              145deg,
              #c4cad1,
              #fefefe
            );

          box-shadow:
            inset 4px 4px 8px rgba(62,74,85,.15),
            inset -4px -4px 8px rgba(255,255,255,.85),
            4px 5px 10px rgba(74,84,93,.12);
        }

        .textareaInvalid {
          background: #d8a5a2;
        }

        textarea {
          display: block;

          width: 100%;
          min-height: 285px;

          resize: vertical;

          padding: 17px;

          border: none;
          outline: none;

          border-radius: 11px;

          background:
            linear-gradient(
              180deg,
              #ffffff,
              #f6f7f8
            );

          color: #313c46;

          font-family: Arial, sans-serif;

          font-size: 15px;
          line-height: 1.75;
        }

        textarea::placeholder {
          color: #9199a1;
        }

        /* =====================================================
           CONTROLS
        ===================================================== */

        .controlRow {
          display: flex;

          justify-content: space-between;
          align-items: center;

          gap: 20px;

          flex-wrap: wrap;

          margin-top: 21px;
        }

        .stats {
          display: flex;

          gap: 8px;

          flex-wrap: wrap;
        }

        .statItem {
          min-width: 77px;

          padding: 7px 10px;

          text-align: center;

          border-radius: 10px;

          background:
            linear-gradient(
              145deg,
              #f5f6f7,
              #d9dde1
            );

          border: 1px solid #d1d6da;

          box-shadow:
            3px 3px 6px rgba(79,89,99,.12),
            -3px -3px 6px rgba(255,255,255,.8);
        }

        .statItem span {
          display: block;

          color: #7d858c;

          font-family: Arial, sans-serif;

          font-size: 10px;
        }

        .statItem strong {
          display: block;

          margin-top: 2px;

          color: #344756;

          font-size: 17px;
        }

        .good strong {
          color: #527263;
        }

        .bad strong {
          color: #93534f;
        }

        .importButton {
          min-width: 165px;

          height: 48px;

          padding: 0 22px;

          border: 1px solid #294c66;

          border-radius: 12px;

          color: #ffffff;

          background:
            linear-gradient(
              145deg,
              #527c9b,
              #294f6c
            );

          box-shadow:
            5px 6px 11px rgba(37,64,84,.28),
            inset 2px 2px 4px rgba(255,255,255,.25),
            inset -3px -3px 5px rgba(25,45,61,.25);

          font-family: inherit;

          font-size: 16px;
          font-weight: 700;

          cursor: pointer;

          transition: .15s ease;
        }

        .importButton:hover:not(:disabled) {
          transform: translateY(-1px);

          filter: brightness(1.04);
        }

        .importButton:active:not(:disabled) {
          transform: translateY(2px);

          box-shadow:
            inset 4px 4px 8px rgba(20,42,58,.28);
        }

        .importButton:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        /* =====================================================
           SAVED PANEL
        ===================================================== */

        .savedPanel {
          margin-top: 25px;
        }

        .savedTop {
          margin-bottom: 0;
        }

        .savedTop p {
          margin: 5px 0 0;

          color: #7a838c;

          font-size: 14px;
        }

        .savedControls {
          display: flex;

          align-items: center;

          gap: 8px;

          flex-wrap: wrap;
        }

        .savedCount {
          min-width: 55px;

          padding: 8px 11px;

          text-align: center;

          border-radius: 10px;

          color: #3b5b72;

          background:
            linear-gradient(
              145deg,
              #e5ebef,
              #cbd4dc
            );

          border: 1px solid #c6d0d8;

          box-shadow:
            3px 3px 6px rgba(73,84,94,.13),
            -3px -3px 6px rgba(255,255,255,.8);

          font-weight: 700;
        }

        .savedCount span {
          font-size: 12px;
          font-weight: 400;
        }

        .smallButton {
          height: 39px;

          padding: 0 14px;

          border-radius: 9px;

          font-family: inherit;

          font-size: 14px;
          font-weight: 700;

          cursor: pointer;

          transition: .15s ease;
        }

        .editButton {
          color: #314e63;

          border: 1px solid #b9c5ce;

          background:
            linear-gradient(
              145deg,
              #edf1f4,
              #d0d8df
            );

          box-shadow:
            3px 3px 6px rgba(76,87,98,.12),
            -3px -3px 6px rgba(255,255,255,.8);
        }

        .refreshButton {
          color: #4b5359;

          border: 1px solid #c5c9cd;

          background:
            linear-gradient(
              145deg,
              #f7f8f9,
              #d9dcdf
            );

          box-shadow:
            3px 3px 6px rgba(76,84,92,.12),
            -3px -3px 6px rgba(255,255,255,.82);
        }

        .smallButton:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .smallButton:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        /* =====================================================
           EMPTY
        ===================================================== */

        .emptyState {
          min-height: 160px;

          margin-top: 22px;

          display: flex;
          flex-direction: column;

          align-items: center;
          justify-content: center;

          gap: 6px;

          padding: 20px;

          border-radius: 14px;

          color: #7b858e;

          background:
            linear-gradient(
              145deg,
              #dfe3e7,
              #f4f6f8
            );

          border: 1px solid #d3d8dc;

          box-shadow:
            inset 5px 5px 10px rgba(78,88,98,.11),
            inset -5px -5px 10px rgba(255,255,255,.82);
        }

        .emptyState strong {
          color: #4f5e69;
          font-size: 16px;
        }

        .emptyState span {
          font-family: Arial, sans-serif;
          font-size: 12px;
        }

        .spinner {
          width: 26px;
          height: 26px;

          margin-bottom: 4px;

          border-radius: 50%;

          border: 3px solid #c7cfd5;
          border-top-color: #416b89;

          animation: spin .8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* =====================================================
           WORDS
        ===================================================== */

        .wordList {
          display: grid;

          gap: 11px;

          margin-top: 22px;
        }

        .wordRow {
          display: flex;

          gap: 13px;

          padding: 14px 16px;

          border-radius: 13px;

          border: 1px solid #d0d5da;

          background:
            linear-gradient(
              145deg,
              #f5f6f7,
              #e0e4e7
            );

          box-shadow:
            4px 4px 8px rgba(71,81,90,.12),
            -4px -4px 8px rgba(255,255,255,.8);

          transition: .15s ease;
        }

        .wordRow:hover {
          transform: translateY(-1px);

          box-shadow:
            6px 6px 11px rgba(71,81,90,.14),
            -5px -5px 9px rgba(255,255,255,.82);
        }

        .wordNumber {
          width: 35px;
          height: 35px;

          flex: 0 0 35px;

          display: grid;
          place-items: center;

          border-radius: 9px;

          color: white;

          background:
            linear-gradient(
              145deg,
              #668ba6,
              #365f7d
            );

          box-shadow:
            3px 3px 6px rgba(46,72,92,.23),
            inset 1px 1px 3px rgba(255,255,255,.3);

          font-family: Arial, sans-serif;
          font-size: 13px;
          font-weight: 700;
        }

        .wordContent {
          flex: 1;
          min-width: 0;
        }

        .wordLine {
          display: flex;
          align-items: baseline;

          gap: 9px;

          flex-wrap: wrap;
        }

        .englishWord {
          color: #243a4b;

          font-size: 19px;
        }

        .divider {
          color: #929aa1;
        }

        .uzbekWord {
          color: #59656f;

          font-size: 17px;
        }

        .exampleArea {
          margin-top: 9px;

          padding: 10px 12px;

          border-radius: 9px;

          background:
            linear-gradient(
              145deg,
              #e0e4e7,
              #f8f9fa
            );

          box-shadow:
            inset 2px 2px 5px rgba(67,77,86,.09),
            inset -2px -2px 5px rgba(255,255,255,.85);
        }

        .englishExample {
          color: #3e4c58;

          font-family: "Times New Roman", serif;

          font-size: 16px;
          font-style: italic;
          font-weight: 700;
        }

        .uzbekExample {
          margin-top: 3px;

          color: #526f83;

          font-family: "Times New Roman", serif;

          font-size: 15px;
          font-style: italic;
        }

        /* =====================================================
           RESPONSIVE
        ===================================================== */

        @media (max-width: 760px) {
          .page {
            padding: 16px 10px 40px;
          }

          .topPanel {
            padding: 14px;
          }

          .adminBadge {
            display: none;
          }

          .siteName {
            font-size: 17px;
          }

          .siteSub {
            font-size: 12px;
          }

          .titleBlock h1 {
            font-size: 29px;
          }

          .titleBlock p {
            font-size: 14px;
          }

          .panel {
            padding: 18px;
          }

          .selectorGrid {
            grid-template-columns: 1fr;
          }

          .controlRow {
            align-items: stretch;
          }

          .stats {
            width: 100%;

            display: grid;

            grid-template-columns:
              repeat(2, 1fr);
          }

          .importButton {
            width: 100%;
          }

          textarea {
            min-height: 240px;
          }
        }

        @media (max-width: 470px) {
          .logoMark {
            width: 42px;
            height: 42px;
          }

          .siteName {
            font-size: 15px;
          }

          .titleBlock {
            margin-top: 24px;
          }

          .titleBlock h1 {
            font-size: 25px;
          }

          .panel h2 {
            font-size: 23px;
          }

          .savedControls {
            width: 100%;
          }

          .smallButton {
            flex: 1;
          }
        }
      `}</style>
    </main>
  );
}
