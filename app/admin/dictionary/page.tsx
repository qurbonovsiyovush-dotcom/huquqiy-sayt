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
     TEXTDAN SO‘ZLARNI AJRATISH
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

  /* =========================================================
     STATISTIKA
  ========================================================= */

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
     UNITDAGI SO‘ZLARNI YUKLASH
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

      /*
        MUHIM:
        importdan keyin yana darhol GET qilmaymiz.

        POST javobidagi yangi words ni to‘g‘ridan-to‘g‘ri
        ekranga chiqaramiz.
      */

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
     TAHRIRLASH UCHUN TEXTAREA GA QAYTARISH
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
      <div className="ambient ambient1" />
      <div className="ambient ambient2" />

      <div className="wrapper">
        {/* HEADER */}

        <header className="hero3d">
          <div className="heroIcon">📘</div>

          <div>
            <h1>English Vocabulary</h1>

            <p>
              4000 Essential English Words — so‘zlar va misol gaplarni
              boshqarish
            </p>
          </div>

          <div className="heroBadge">
            <span>●</span>
            Admin panel
          </div>
        </header>

        {/* ASOSIY PANEL */}

        <section className="mainCard">
          <div className="cardHeader">
            <div>
              <div className="miniTitle">VOCABULARY MANAGER</div>
              <h2>Unitga so‘z qo‘shish</h2>
            </div>

            <div className="selectedTop">
              Book {book} · Unit {unit}
            </div>
          </div>

          {/* BOOK / UNIT */}

          <div className="selectorGrid">
            <div className="fieldGroup">
              <label>
                <span className="labelIcon">📚</span>
                Book
              </label>

              <div className="selectShell">
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

            <div className="fieldGroup">
              <label>
                <span className="labelIcon">📖</span>
                Unit
              </label>

              <div className="selectShell">
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

          {/* TANLANGAN */}

          <div className="selectedBar">
            <div className="check3d">✓</div>

            <div>
              <small>Hozirgi tanlov</small>

              <strong>
                Book {book}
                <span className="arrow">→</span>
                Unit {unit}
              </strong>
            </div>
          </div>

          {/* MESSAGE */}

          {message && (
            <div className="message success">
              <div className="messageIcon">✓</div>
              <div>{message}</div>
            </div>
          )}

          {error && (
            <div className="message danger">
              <div className="messageIcon">!</div>
              <div>{error}</div>
            </div>
          )}

          {/* TEXTAREA */}

          <div className="editorSection">
            <div className="editorHeading">
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
                  Misol gaplar bo‘lmasa:
                  <strong> English | Uzbek</strong>
                </p>
              </div>

              <div className="formatBadge">
                {totalLines === 0 ? "Tayyor" : `${totalLines} qator`}
              </div>
            </div>

            <div
              className={`textareaShell ${
                invalidLines > 0 ? "textareaError" : ""
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
          </div>

          {/* BOTTOM CONTROL */}

          <div className="bottomControl">
            <div className="stats">
              <div className="stat">
                <span>Qator</span>
                <strong>{totalLines}</strong>
              </div>

              <div className="stat successStat">
                <span>To‘g‘ri</span>
                <strong>{parsedWords.length}</strong>
              </div>

              <div
                className={`stat ${
                  invalidLines > 0 ? "errorStat" : ""
                }`}
              >
                <span>Xato</span>
                <strong>{invalidLines}</strong>
              </div>

              <div className="stat">
                <span>Misolli</span>
                <strong>{exampleCount}</strong>
              </div>
            </div>

            <button
              type="button"
              className="importBtn"
              disabled={
                saving ||
                parsedWords.length === 0 ||
                invalidLines > 0
              }
              onClick={handleImport}
            >
              <span className="importIcon">
                {saving ? "◌" : "⇧"}
              </span>

              {saving ? "Saqlanmoqda..." : "Import qilish"}
            </button>
          </div>
        </section>

        {/* SAQLANGAN SO‘ZLAR */}

        <section className="savedCard">
          <div className="savedHeader">
            <div>
              <div className="miniTitle">DATABASE</div>

              <h2>Saqlangan so‘zlar</h2>

              <p>
                Book {book} → Unit {unit}
              </p>
            </div>

            <div className="savedActions">
              <div className="wordCount">
                {savedWords.length}
                <small> ta so‘z</small>
              </div>

              <button
                className="editBtn"
                type="button"
                onClick={loadSavedIntoEditor}
                disabled={loading || savedWords.length === 0}
              >
                ✏ Tahrirlash
              </button>

              <button
                className="refreshBtn"
                type="button"
                onClick={loadWords}
                disabled={loading}
              >
                {loading ? "⟳ Yuklanmoqda..." : "⟳ Yangilash"}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="empty3d">
              <div className="loadingSpinner" />
              <strong>So‘zlar yuklanmoqda...</strong>
            </div>
          ) : savedWords.length === 0 ? (
            <div className="empty3d">
              <div className="emptyIcon">📭</div>

              <strong>
                Bu Unit uchun hali so‘z saqlanmagan.
              </strong>

              <span>
                Yuqoridagi maydonga so‘zlarni kiriting va Import qilish
                tugmasini bosing.
              </span>
            </div>
          ) : (
            <div className="wordGrid">
              {savedWords.map((item, index) => (
                <article
                  className="wordCard"
                  key={`${item.word}-${index}`}
                >
                  <div className="wordTop">
                    <div className="numberBadge">
                      {index + 1}
                    </div>

                    <div className="wordMain">
                      <strong>{item.word}</strong>
                      <span>{item.translation}</span>
                    </div>
                  </div>

                  {(item.example ||
                    item.exampleTranslation) && (
                    <div className="exampleBox">
                      {item.example && (
                        <div className="exampleEnglish">
                          {item.example}
                        </div>
                      )}

                      {item.exampleTranslation && (
                        <div className="exampleUzbek">
                          {item.exampleTranslation}
                        </div>
                      )}
                    </div>
                  )}
                </article>
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
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          padding: 42px 22px 70px;
          font-family: "Bell MT", "Times New Roman", serif;

          background:
            radial-gradient(
              circle at 15% 0%,
              rgba(122, 189, 255, 0.23),
              transparent 31%
            ),
            radial-gradient(
              circle at 88% 8%,
              rgba(202, 214, 231, 0.45),
              transparent 30%
            ),
            linear-gradient(
              145deg,
              #eef3f8 0%,
              #f8fafc 42%,
              #e5ebf2 100%
            );

          color: #11243b;
        }

        .ambient {
          position: fixed;
          border-radius: 999px;
          filter: blur(80px);
          pointer-events: none;
          opacity: 0.35;
        }

        .ambient1 {
          width: 300px;
          height: 300px;
          background: #68b6ff;
          top: -120px;
          left: -100px;
        }

        .ambient2 {
          width: 350px;
          height: 350px;
          background: #bac9da;
          right: -150px;
          top: 200px;
        }

        .wrapper {
          position: relative;
          z-index: 2;
          max-width: 1240px;
          margin: 0 auto;
        }

        /* HEADER */

        .hero3d {
          display: flex;
          align-items: center;
          gap: 18px;

          padding: 22px 26px;
          margin-bottom: 28px;

          border-radius: 25px;

          background:
            linear-gradient(
              145deg,
              rgba(255, 255, 255, 0.97),
              rgba(224, 232, 241, 0.96)
            );

          border: 1px solid rgba(255,255,255,.95);

          box-shadow:
            14px 14px 28px rgba(72, 91, 115, 0.18),
            -12px -12px 25px rgba(255,255,255,.95),
            inset 1px 1px 0 rgba(255,255,255,.9);
        }

        .heroIcon {
          width: 64px;
          height: 64px;

          display: grid;
          place-items: center;

          border-radius: 18px;

          font-size: 30px;

          background:
            linear-gradient(
              145deg,
              #78c5ff,
              #217bd2
            );

          box-shadow:
            7px 7px 13px rgba(21, 86, 145, 0.35),
            inset 3px 3px 5px rgba(255,255,255,.55),
            inset -4px -4px 7px rgba(5,61,117,.25);
        }

        .hero3d h1 {
          margin: 0;

          font-size: clamp(30px, 4vw, 44px);
          color: #073b68;

          letter-spacing: -0.5px;
        }

        .hero3d p {
          margin: 6px 0 0;
          color: #66758a;
          font-size: 17px;
        }

        .heroBadge {
          margin-left: auto;

          display: flex;
          align-items: center;
          gap: 8px;

          padding: 12px 18px;

          border-radius: 15px;

          background:
            linear-gradient(
              145deg,
              #f8fbff,
              #dce6f1
            );

          color: #275275;
          font-weight: 700;

          box-shadow:
            5px 5px 12px rgba(71, 89, 111, 0.2),
            -4px -4px 9px #ffffff;
        }

        .heroBadge span {
          color: #27ae60;
        }

        /* MAIN CARD */

        .mainCard,
        .savedCard {
          padding: 30px;

          border-radius: 28px;

          background:
            linear-gradient(
              145deg,
              rgba(248, 251, 255, 0.98),
              rgba(224, 231, 239, 0.98)
            );

          border: 1px solid rgba(255,255,255,.9);

          box-shadow:
            16px 16px 32px rgba(63, 78, 97, 0.18),
            -14px -14px 28px rgba(255,255,255,.95),
            inset 1px 1px 0 rgba(255,255,255,.9);
        }

        .cardHeader,
        .savedHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;

          margin-bottom: 28px;
        }

        .miniTitle {
          font-family: Arial, sans-serif;
          font-size: 11px;
          letter-spacing: 2px;
          font-weight: 800;
          color: #4786bc;
          margin-bottom: 5px;
        }

        .cardHeader h2,
        .savedHeader h2 {
          margin: 0;
          font-size: 30px;
          color: #102d49;
        }

        .selectedTop {
          padding: 10px 17px;

          border-radius: 14px;

          background:
            linear-gradient(
              145deg,
              #d9ecff,
              #b9d8f5
            );

          color: #07549a;
          font-weight: 800;

          box-shadow:
            5px 5px 10px rgba(64, 105, 145, 0.2),
            -4px -4px 8px #ffffff;
        }

        /* SELECTORS */

        .selectorGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 24px;
        }

        .fieldGroup label {
          display: flex;
          align-items: center;
          gap: 8px;

          margin: 0 0 10px 4px;

          font-size: 18px;
          color: #1e3b59;
          font-weight: 800;
        }

        .labelIcon {
          filter: drop-shadow(0 2px 2px rgba(0,0,0,.12));
        }

        .selectShell {
          padding: 4px;

          border-radius: 17px;

          background:
            linear-gradient(
              145deg,
              #d6dee8,
              #ffffff
            );

          box-shadow:
            inset 3px 3px 7px rgba(76, 94, 115, 0.15),
            inset -3px -3px 7px #ffffff,
            4px 4px 9px rgba(67, 84, 106, 0.14);
        }

        select {
          width: 100%;
          height: 56px;

          border: none;
          outline: none;

          border-radius: 13px;

          padding: 0 18px;

          background:
            linear-gradient(
              180deg,
              #ffffff,
              #eef3f8
            );

          color: #17314c;
          font-size: 18px;
          font-weight: 700;
          font-family: inherit;

          cursor: pointer;
        }

        /* SELECTED BAR */

        .selectedBar {
          margin-top: 25px;

          display: flex;
          align-items: center;
          gap: 15px;

          padding: 16px 18px;

          border-radius: 18px;

          background:
            linear-gradient(
              145deg,
              #d9edff,
              #c4def5
            );

          border: 1px solid #b0d6fa;

          box-shadow:
            inset 3px 3px 7px rgba(255,255,255,.7),
            7px 7px 14px rgba(76, 105, 132, 0.17);
        }

        .check3d {
          width: 42px;
          height: 42px;

          display: grid;
          place-items: center;

          border-radius: 50%;

          color: white;
          font-family: Arial, sans-serif;
          font-weight: 900;
          font-size: 21px;

          background:
            linear-gradient(
              145deg,
              #4caaff,
              #176dd1
            );

          box-shadow:
            4px 5px 9px rgba(24, 91, 157, 0.35),
            inset 2px 2px 4px rgba(255,255,255,.5);
        }

        .selectedBar small {
          display: block;
          font-family: Arial, sans-serif;
          color: #55748e;
          margin-bottom: 2px;
        }

        .selectedBar strong {
          color: #074c8c;
          font-size: 19px;
        }

        .arrow {
          margin: 0 11px;
        }

        /* MESSAGES */

        .message {
          display: flex;
          gap: 12px;
          align-items: center;

          margin-top: 20px;
          padding: 14px 17px;

          border-radius: 16px;

          font-weight: 800;
        }

        .success {
          background: #e9f8ef;
          color: #08783c;
          border: 1px solid #bfe7ce;
        }

        .danger {
          background: #fff0f0;
          color: #b32318;
          border: 1px solid #fac7c3;
        }

        .messageIcon {
          width: 31px;
          height: 31px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: rgba(255,255,255,.65);
        }

        /* EDITOR */

        .editorSection {
          margin-top: 30px;
        }

        .editorHeading {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
          flex-wrap: wrap;

          margin-bottom: 13px;
        }

        .editorHeading h3 {
          font-size: 23px;
          color: #173552;
          margin: 0 0 7px;
        }

        .editorHeading p {
          margin: 3px 0;
          color: #6d7888;
          font-size: 15px;
        }

        .formatBadge {
          padding: 9px 14px;

          border-radius: 12px;

          font-family: Arial, sans-serif;
          font-size: 13px;
          font-weight: 800;

          color: #33678f;

          background:
            linear-gradient(
              145deg,
              #edf5fc,
              #dbe5ee
            );

          box-shadow:
            4px 4px 8px rgba(83, 100, 119, 0.12),
            -3px -3px 7px #ffffff;
        }

        .textareaShell {
          padding: 5px;

          border-radius: 20px;

          background:
            linear-gradient(
              145deg,
              #cad4df,
              #ffffff
            );

          box-shadow:
            inset 5px 5px 10px rgba(76, 92, 110, 0.18),
            inset -5px -5px 10px #ffffff,
            6px 7px 14px rgba(69, 85, 105, 0.15);
        }

        .textareaError {
          background: #f7b1ac;
        }

        textarea {
          display: block;

          width: 100%;
          min-height: 310px;

          resize: vertical;

          padding: 20px;

          border: none;
          outline: none;

          border-radius: 16px;

          background:
            linear-gradient(
              180deg,
              #ffffff,
              #f7f9fc
            );

          color: #26394c;

          font-family: Arial, sans-serif;
          font-size: 16px;
          line-height: 1.8;
        }

        textarea::placeholder {
          color: #8995a3;
        }

        /* BOTTOM */

        .bottomControl {
          margin-top: 24px;

          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }

        .stats {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .stat {
          min-width: 86px;

          padding: 9px 13px;

          border-radius: 13px;

          text-align: center;

          background:
            linear-gradient(
              145deg,
              #f9fbfd,
              #dce4ec
            );

          box-shadow:
            4px 4px 8px rgba(65, 80, 98, 0.13),
            -4px -4px 8px #ffffff;
        }

        .stat span {
          display: block;
          color: #778495;
          font-family: Arial, sans-serif;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.7px;
        }

        .stat strong {
          display: block;
          margin-top: 3px;
          color: #21425f;
          font-size: 20px;
        }

        .successStat strong {
          color: #16834e;
        }

        .errorStat strong {
          color: #c22c23;
        }

        .importBtn {
          min-width: 190px;
          height: 57px;

          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;

          border: none;
          border-radius: 17px;

          color: white;

          font-family: inherit;
          font-size: 18px;
          font-weight: 800;

          background:
            linear-gradient(
              145deg,
              #4baeff,
              #1267ca
            );

          box-shadow:
            8px 9px 16px rgba(20, 83, 145, 0.34),
            inset 3px 3px 5px rgba(255,255,255,.48),
            inset -4px -4px 7px rgba(4,57,117,.32);

          cursor: pointer;
          transition: .18s ease;
        }

        .importBtn:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .importBtn:active:not(:disabled) {
          transform: translateY(2px);

          box-shadow:
            inset 4px 4px 8px rgba(4,57,117,.28),
            inset -3px -3px 6px rgba(255,255,255,.28);
        }

        .importBtn:disabled {
          opacity: .48;
          cursor: not-allowed;
          filter: grayscale(.25);
        }

        .importIcon {
          font-family: Arial, sans-serif;
          font-size: 25px;
        }

        /* SAVED */

        .savedCard {
          margin-top: 30px;
        }

        .savedHeader {
          margin-bottom: 0;
        }

        .savedHeader p {
          color: #738095;
          margin: 5px 0 0;
        }

        .savedActions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .wordCount {
          padding: 9px 13px;
          border-radius: 12px;

          background: #d9ecff;
          color: #145b96;

          font-weight: 900;

          box-shadow:
            inset 2px 2px 4px #ffffff,
            4px 4px 8px rgba(61, 89, 115, 0.15);
        }

        .wordCount small {
          font-weight: 600;
        }

        .editBtn,
        .refreshBtn {
          height: 43px;

          padding: 0 16px;

          border-radius: 12px;

          font-family: inherit;
          font-weight: 800;

          cursor: pointer;

          transition: .18s ease;
        }

        .editBtn {
          border: 1px solid #7bb9e7;

          color: #0b528d;

          background:
            linear-gradient(
              145deg,
              #e8f5ff,
              #cfe4f5
            );

          box-shadow:
            4px 4px 8px rgba(62, 91, 116, 0.15),
            -3px -3px 7px #ffffff;
        }

        .refreshBtn {
          border: 1px solid #c1ccd8;

          color: #314b63;

          background:
            linear-gradient(
              145deg,
              #ffffff,
              #e0e6ec
            );

          box-shadow:
            4px 4px 8px rgba(62, 75, 92, 0.14),
            -3px -3px 7px #ffffff;
        }

        .editBtn:hover:not(:disabled),
        .refreshBtn:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .editBtn:disabled,
        .refreshBtn:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        /* EMPTY */

        .empty3d {
          min-height: 200px;

          margin-top: 25px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;

          border-radius: 20px;

          color: #728094;

          background:
            linear-gradient(
              145deg,
              #e6ecf2,
              #f9fbfd
            );

          box-shadow:
            inset 7px 7px 15px rgba(70, 84, 102, 0.12),
            inset -7px -7px 15px #ffffff;
        }

        .emptyIcon {
          font-size: 36px;
          margin-bottom: 4px;
        }

        .empty3d strong {
          color: #40566c;
          font-size: 17px;
        }

        .empty3d span {
          font-family: Arial, sans-serif;
          font-size: 13px;
        }

        .loadingSpinner {
          width: 30px;
          height: 30px;

          border: 4px solid #d0dfed;
          border-top-color: #267ccc;

          border-radius: 50%;

          animation: spin .8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* WORD GRID */

        .wordGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;

          margin-top: 25px;
        }

        .wordCard {
          padding: 18px;

          border-radius: 18px;

          background:
            linear-gradient(
              145deg,
              #f8fbfe,
              #dfe6ed
            );

          border: 1px solid rgba(255,255,255,.9);

          box-shadow:
            7px 7px 14px rgba(67, 82, 100, 0.16),
            -6px -6px 12px #ffffff;

          transition: .18s ease;
        }

        .wordCard:hover {
          transform: translateY(-3px);
          box-shadow:
            10px 11px 18px rgba(67, 82, 100, 0.18),
            -7px -7px 14px #ffffff;
        }

        .wordTop {
          display: flex;
          gap: 13px;
          align-items: center;
        }

        .numberBadge {
          width: 38px;
          height: 38px;

          flex: 0 0 38px;

          display: grid;
          place-items: center;

          border-radius: 12px;

          color: white;
          font-family: Arial, sans-serif;
          font-weight: 800;

          background:
            linear-gradient(
              145deg,
              #58b5ff,
              #1c72c6
            );

          box-shadow:
            4px 4px 8px rgba(21, 83, 141, 0.3),
            inset 2px 2px 3px rgba(255,255,255,.45);
        }

        .wordMain {
          min-width: 0;
        }

        .wordMain strong {
          display: block;

          color: #102f4a;

          font-size: 21px;
          text-transform: uppercase;
        }

        .wordMain span {
          display: block;
          margin-top: 2px;

          color: #657485;
          font-size: 17px;
        }

        .exampleBox {
          margin-top: 14px;

          padding: 13px 14px;

          border-radius: 13px;

          background:
            linear-gradient(
              145deg,
              #dce5ed,
              #ffffff
            );

          box-shadow:
            inset 3px 3px 7px rgba(74, 89, 106, 0.1),
            inset -3px -3px 7px #ffffff;
        }

        .exampleEnglish {
          color: #263c50;
          font-size: 17px;
          font-style: italic;
          font-weight: 700;
          line-height: 1.45;
        }

        .exampleUzbek {
          margin-top: 5px;
          color: #2272ac;
          font-size: 16px;
          font-style: italic;
          line-height: 1.4;
        }

        /* RESPONSIVE */

        @media (max-width: 820px) {
          .page {
            padding: 20px 12px 45px;
          }

          .hero3d {
            padding: 18px;
          }

          .heroBadge {
            display: none;
          }

          .hero3d h1 {
            font-size: 30px;
          }

          .hero3d p {
            font-size: 14px;
          }

          .mainCard,
          .savedCard {
            padding: 20px;
            border-radius: 22px;
          }

          .selectorGrid,
          .wordGrid {
            grid-template-columns: 1fr;
          }

          .bottomControl {
            align-items: stretch;
          }

          .stats {
            width: 100%;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
          }

          .importBtn {
            width: 100%;
          }
        }

        @media (max-width: 520px) {
          .heroIcon {
            width: 50px;
            height: 50px;
            font-size: 23px;
          }

          .hero3d h1 {
            font-size: 25px;
          }

          .cardHeader h2,
          .savedHeader h2 {
            font-size: 25px;
          }

          textarea {
            min-height: 270px;
            font-size: 14px;
          }
        }
      `}</style>
    </main>
  );
}
