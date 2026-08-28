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

  const parsedWords = useMemo(() => {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line): VocabularyWord | null => {
        const parts = line.split("|").map((part) => part.trim());

        if (parts.length < 2) return null;

        const word = parts[0] || "";
        const translation = parts[1] || "";
        const example = parts[2] || "";
        const exampleTranslation = parts[3] || "";

        if (!word || !translation) return null;

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
      (item) => item.example && item.exampleTranslation
    ).length;
  }, [parsedWords]);

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
        setError("Kamida bitta to‘g‘ri so‘z kiriting.");
        return;
      }

      const confirmed = window.confirm(
        `Book ${book}, Unit ${unit} uchun ${parsedWords.length} ta so‘zni saqlaysizmi?\n\n` +
          `Misol gap bilan: ${exampleCount} ta`
      );

      if (!confirmed) return;

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
      setError(
        err instanceof Error
          ? err.message
          : "So‘zlarni saqlashda xatolik yuz berdi."
      );
    } finally {
      setSaving(false);
    }
  }

  function loadSavedIntoEditor() {
    if (savedWords.length === 0) {
      setError("Bu Unitda hali saqlangan so‘zlar yo‘q.");
      return;
    }

    const prepared = savedWords
      .map((item) =>
        [
          item.word,
          item.translation,
          item.example || "",
          item.exampleTranslation || "",
        ].join(" | ")
      )
      .join("\n");

    setText(prepared);
    setMessage("Saqlangan so‘zlar tahrirlash uchun yuklandi.");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function goHome() {
    window.location.href = "/";
  }

  function goAdmin() {
    window.location.href = "/admin";
  }

  return (
    <main className="page">
      <div className="wrapper">
        {/* =====================================================
            TOP PANEL
        ===================================================== */}

        <div className="topBar">
          <button
            type="button"
            className="brandButton"
            onClick={goAdmin}
          >
            Qurbonov Siyovush Jamaliddinzoda
          </button>

          <div className="topActions">
            <button
              type="button"
              className="topSmallButton"
              onClick={goHome}
            >
              Asosiy sahifa
            </button>

            <button
              type="button"
              className="topBlueButton"
              onClick={goAdmin}
            >
              ← Orqaga
            </button>
          </div>
        </div>

        {/* =====================================================
            MAIN ADMIN BLOCK
        ===================================================== */}

        <section className="adminBox">
          <div className="adminTitle">
            Lug‘at boshqaruvi
          </div>

          {/* BOOK + UNIT CARD */}

          <div className="innerCard">
            <h2>English Vocabulary</h2>

            <p className="subtitle">
              4000 Essential English Words — so‘zlar va misol gaplarni boshqarish
            </p>

            <div className="selectorGrid">
              <div className="field">
                <label>Book</label>

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

              <div className="field">
                <label>Unit</label>

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

            <div className="selectedInfo">
              Tanlandi:
              <strong>
                {" "}
                Book {book} → Unit {unit}
              </strong>
            </div>

            {message && (
              <div className="message success">
                {message}
              </div>
            )}

            {error && (
              <div className="message error">
                {error}
              </div>
            )}

            <div className="editorTitle">
              So‘zlarni kiriting
            </div>

            <div className="formatText">
              Format:
              <strong>
                {" "}
                English | Uzbek | English example | Uzbek example
              </strong>
            </div>

            <div className="formatText">
              Misol gap bo‘lmasa:
              <strong> English | Uzbek</strong>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck={false}
              placeholder={`afraid | qo‘rqqan | I am afraid of dogs. | Men itlardan qo‘rqaman.
agree | rozi bo‘lmoq | I agree with you. | Men sizga qo‘shilaman.
angry | jahli chiqqan | He is angry with me. | U mendan jahli chiqdi.`}
            />

            <div className="bottomRow">
              <div className="stats">
                <div>
                  Qator:
                  <strong> {totalLines}</strong>
                </div>

                <div>
                  To‘g‘ri:
                  <strong className="green">
                    {" "}
                    {parsedWords.length}
                  </strong>
                </div>

                <div>
                  Xato:
                  <strong className={invalidLines > 0 ? "red" : ""}>
                    {" "}
                    {invalidLines}
                  </strong>
                </div>

                <div>
                  Misol gap:
                  <strong> {exampleCount}</strong>
                </div>
              </div>

              <button
                type="button"
                className="blueButton"
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
          </div>

          {/* SAVED WORDS */}

          <div className="innerCard savedCard">
            <div className="savedTop">
              <div>
                <h2>Saqlangan so‘zlar</h2>

                <p>
                  Book {book} → Unit {unit}
                </p>
              </div>

              <div className="savedButtons">
                <button
                  type="button"
                  className="grayButton"
                  onClick={loadSavedIntoEditor}
                  disabled={savedWords.length === 0}
                >
                  Tahrirlash
                </button>

                <button
                  type="button"
                  className="blueButton small"
                  onClick={loadWords}
                  disabled={loading}
                >
                  {loading ? "Yuklanmoqda..." : "Yangilash"}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="emptyBox">
                So‘zlar yuklanmoqda...
              </div>
            ) : savedWords.length === 0 ? (
              <div className="emptyBox">
                Bu Unit uchun hali so‘z saqlanmagan.
              </div>
            ) : (
              <div className="wordList">
                {savedWords.map((item, index) => (
                  <div
                    className="wordRow"
                    key={`${item.word}-${index}`}
                  >
                    <div className="numberBox">
                      {index + 1}
                    </div>

                    <div className="wordBody">
                      <div className="wordMain">
                        <strong>{item.word}</strong>
                        <span>—</span>
                        <span>{item.translation}</span>
                      </div>

                      {(item.example ||
                        item.exampleTranslation) && (
                        <div className="exampleBox">
                          {item.example && (
                            <div className="exampleEn">
                              {item.example}
                            </div>
                          )}

                          {item.exampleTranslation && (
                            <div className="exampleUz">
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
          </div>
        </section>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;

          padding: 14px 20px 70px;

          font-family:
            "Bell MT",
            "Times New Roman",
            serif;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #f2f4f5 55%,
              #e7eaec 100%
            );

          color: #111;
        }

        .wrapper {
          max-width: 1020px;
          margin: 0 auto;
        }

        /* ========================================
           TOP BAR
        ======================================== */

        .topBar {
          min-height: 77px;

          display: flex;
          justify-content: space-between;
          align-items: center;

          gap: 18px;

          padding: 13px 18px;

          border-radius: 18px;

          border: 2px solid #133f5c;

          background:
            linear-gradient(
              180deg,
              #79ccf2 0%,
              #57acd7 55%,
              #4799c6 100%
            );

          box-shadow:
            0 7px 0 #123d59,
            0 12px 22px rgba(0, 0, 0, 0.18),
            inset 0 2px 0 rgba(255, 255, 255, 0.65);
        }

        .brandButton {
          min-height: 43px;

          padding: 0 18px;

          border-radius: 10px;

          border: 1px solid #4e5960;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #ececec 52%,
              #cfcfcf 100%
            );

          color: #111;

          font-family: inherit;

          font-size: 16px;
          font-weight: 700;

          cursor: pointer;

          box-shadow:
            0 4px 0 #666,
            inset 0 2px 0 #fff;
        }

        .brandButton:active {
          transform: translateY(3px);
          box-shadow:
            0 1px 0 #666;
        }

        .topActions {
          display: flex;
          gap: 10px;
        }

        .topSmallButton,
        .topBlueButton {
          min-width: 94px;
          height: 38px;

          border-radius: 9px;

          font-family: inherit;

          font-size: 12px;
          font-weight: 700;

          cursor: pointer;
        }

        .topSmallButton {
          border: 1px solid #777;

          background:
            linear-gradient(
              180deg,
              #ffffff,
              #d4d4d4
            );

          box-shadow:
            0 4px 0 #777,
            inset 0 2px 0 #fff;
        }

        .topBlueButton {
          color: #07344e;

          border: 1px solid #155476;

          background:
            linear-gradient(
              180deg,
              #69c4ed,
              #48a7d6
            );

          box-shadow:
            0 4px 0 #14506f,
            inset 0 2px 0 rgba(255,255,255,.6);
        }

        .topSmallButton:active,
        .topBlueButton:active {
          transform: translateY(3px);
          box-shadow: none;
        }

        /* ========================================
           ADMIN BOX
        ======================================== */

        .adminBox {
          position: relative;

          margin: 68px auto 0;

          max-width: 900px;

          padding: 47px 24px 27px;

          border-radius: 18px;

          border: 2px solid #343a3d;

          background:
            linear-gradient(
              180deg,
              #666b6e 0%,
              #555a5d 55%,
              #44494c 100%
            );

          box-shadow:
            0 7px 0 #282d30,
            0 13px 25px rgba(0,0,0,.2),
            inset 0 2px 0 rgba(255,255,255,.15);
        }

        .adminTitle {
          position: absolute;

          top: -24px;
          left: 50%;

          transform: translateX(-50%);

          min-width: 230px;

          padding: 11px 25px;

          text-align: center;

          border-radius: 11px;

          border: 2px solid #145071;

          background:
            linear-gradient(
              180deg,
              #78cdf3,
              #51add9
            );

          color: #143e5d;

          font-size: 22px;
          font-weight: 700;

          box-shadow:
            0 5px 0 #174d68,
            inset 0 2px 0 rgba(255,255,255,.55);
        }

        /* ========================================
           INNER CARDS
        ======================================== */

        .innerCard {
          padding: 25px;

          border-radius: 14px;

          border: 1px solid #d7d7d7;

          background:
            linear-gradient(
              145deg,
              #f9f9f9 0%,
              #ececec 45%,
              #d1d1d1 100%
            );

          box-shadow:
            0 7px 0 #777c7e,
            0 10px 18px rgba(0,0,0,.16),
            inset 0 2px 0 #ffffff;
        }

        .innerCard h2 {
          margin: 0;

          text-align: center;

          color: #111;

          font-size: 26px;
        }

        .subtitle {
          margin: 6px 0 24px;

          text-align: center;

          color: #555;

          font-size: 15px;
        }

        /* ========================================
           BOOK UNIT
        ======================================== */

        .selectorGrid {
          display: grid;

          grid-template-columns:
            repeat(2, minmax(0, 1fr));

          gap: 24px;
        }

        .field label {
          display: block;

          margin: 0 0 7px 5px;

          font-size: 17px;

          font-weight: 700;
        }

        select {
          width: 100%;
          height: 49px;

          padding: 0 14px;

          border-radius: 9px;

          border: 1px solid #7a7a7a;

          outline: none;

          background:
            linear-gradient(
              180deg,
              #ffffff,
              #eeeeee
            );

          box-shadow:
            inset 0 2px 2px #ffffff,
            0 4px 0 #888;

          font-family: inherit;

          font-size: 17px;
          font-weight: 700;
        }

        .selectedInfo {
          margin-top: 22px;

          padding: 12px 15px;

          border-radius: 9px;

          border: 1px solid #367a9f;

          background:
            linear-gradient(
              180deg,
              #d8f0fb,
              #bcdfee
            );

          color: #153d55;

          box-shadow:
            0 4px 0 #8ba7b5,
            inset 0 2px 0 #ffffff;

          font-size: 16px;
        }

        /* ========================================
           ALERTS
        ======================================== */

        .message {
          margin-top: 16px;

          padding: 11px 14px;

          border-radius: 8px;

          font-weight: 700;
        }

        .success {
          background: #dff0e5;
          border: 1px solid #7cab8c;
          color: #245c36;
        }

        .error {
          background: #f2dddd;
          border: 1px solid #b97979;
          color: #7a2525;
        }

        /* ========================================
           EDITOR
        ======================================== */

        .editorTitle {
          margin-top: 28px;

          font-size: 22px;
          font-weight: 700;
        }

        .formatText {
          margin-top: 4px;

          color: #555;

          font-size: 14px;
        }

        textarea {
          width: 100%;
          min-height: 280px;

          margin-top: 12px;

          resize: vertical;

          padding: 15px;

          border-radius: 9px;

          border: 1px solid #777;

          outline: none;

          background: #ffffff;

          box-shadow:
            inset 3px 3px 6px rgba(0,0,0,.14),
            inset -2px -2px 4px rgba(255,255,255,.8);

          font-family: Arial, sans-serif;

          font-size: 15px;
          line-height: 1.7;
        }

        .bottomRow {
          display: flex;

          justify-content: space-between;
          align-items: center;

          gap: 15px;

          flex-wrap: wrap;

          margin-top: 18px;
        }

        .stats {
          display: flex;

          gap: 15px;

          flex-wrap: wrap;

          font-size: 14px;
        }

        .green {
          color: #166b39;
        }

        .red {
          color: #a52525;
        }

        /* ========================================
           BUTTONS
        ======================================== */

        .blueButton,
        .grayButton {
          min-width: 120px;

          height: 39px;

          padding: 0 16px;

          border-radius: 8px;

          font-family: inherit;

          font-size: 14px;
          font-weight: 700;

          cursor: pointer;
        }

        .blueButton {
          color: #123b53;

          border: 1px solid #155679;

          background:
            linear-gradient(
              180deg,
              #74cff6,
              #4eaadb
            );

          box-shadow:
            0 5px 0 #15506e,
            inset 0 2px 0 rgba(255,255,255,.6);
        }

        .grayButton {
          border: 1px solid #777;

          background:
            linear-gradient(
              180deg,
              #ffffff,
              #d7d7d7
            );

          box-shadow:
            0 5px 0 #777,
            inset 0 2px 0 #ffffff;
        }

        .blueButton:active,
        .grayButton:active {
          transform: translateY(4px);

          box-shadow: none;
        }

        .blueButton:disabled,
        .grayButton:disabled {
          opacity: .45;

          cursor: not-allowed;
        }

        .blueButton.small {
          min-width: 100px;
        }

        /* ========================================
           SAVED
        ======================================== */

        .savedCard {
          margin-top: 28px;
        }

        .savedTop {
          display: flex;

          justify-content: space-between;
          align-items: center;

          gap: 20px;

          flex-wrap: wrap;
        }

        .savedTop h2 {
          text-align: left;
        }

        .savedTop p {
          margin: 4px 0 0;
          color: #555;
        }

        .savedButtons {
          display: flex;
          gap: 10px;
        }

        .emptyBox {
          margin-top: 20px;

          padding: 24px;

          text-align: center;

          border-radius: 9px;

          border: 1px dashed #888;

          background:
            linear-gradient(
              180deg,
              #f4f4f4,
              #dddddd
            );

          color: #555;
        }

        /* ========================================
           WORD LIST
        ======================================== */

        .wordList {
          display: grid;

          gap: 10px;

          margin-top: 20px;
        }

        .wordRow {
          display: flex;

          gap: 12px;

          padding: 13px;

          border-radius: 10px;

          border: 1px solid #aaa;

          background:
            linear-gradient(
              145deg,
              #f7f7f7,
              #d8d8d8
            );

          box-shadow:
            0 4px 0 #888,
            inset 0 2px 0 #ffffff;
        }

        .numberBox {
          width: 34px;
          height: 34px;

          flex: 0 0 34px;

          display: grid;
          place-items: center;

          border-radius: 7px;

          color: #143b54;

          background:
            linear-gradient(
              180deg,
              #73cef4,
              #4fa9d5
            );

          border: 1px solid #18516f;

          box-shadow:
            0 3px 0 #15506d;

          font-weight: 700;
        }

        .wordBody {
          flex: 1;
        }

        .wordMain {
          display: flex;

          gap: 10px;

          flex-wrap: wrap;

          align-items: center;

          font-size: 17px;
        }

        .wordMain strong {
          font-size: 19px;
        }

        .exampleBox {
          margin-top: 8px;

          padding: 10px;

          border-radius: 7px;

          background: rgba(255,255,255,.65);

          border: 1px solid #c5c5c5;
        }

        .exampleEn {
          font-style: italic;

          font-size: 16px;

          font-weight: 700;
        }

        .exampleUz {
          margin-top: 4px;

          color: #9b2525;

          font-style: italic;

          font-size: 15px;
        }

        /* ========================================
           MOBILE
        ======================================== */

        @media (max-width: 760px) {
          .page {
            padding: 10px 10px 50px;
          }

          .topBar {
            padding: 12px;
          }

          .brandButton {
            font-size: 13px;
          }

          .topActions {
            display: none;
          }

          .adminBox {
            margin-top: 55px;

            padding:
              40px 13px 20px;
          }

          .adminTitle {
            min-width: 190px;

            font-size: 18px;
          }

          .innerCard {
            padding: 17px;
          }

          .selectorGrid {
            grid-template-columns: 1fr;
          }

          .bottomRow {
            align-items: stretch;
          }

          .blueButton {
            width: 100%;
          }

          .savedButtons {
            width: 100%;
          }

          .savedButtons button {
            flex: 1;
          }
        }
      `}</style>
    </main>
  );
}
