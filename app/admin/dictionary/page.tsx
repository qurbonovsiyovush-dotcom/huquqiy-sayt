"use client";

import { useEffect, useMemo, useState } from "react";

type VocabularyWord = {
  word: string;
  translation: string;
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
      .map((line) => {
        const separatorIndex = line.indexOf("|");

        if (separatorIndex === -1) {
          return null;
        }

        const word = line
          .slice(0, separatorIndex)
          .trim();

        const translation = line
          .slice(separatorIndex + 1)
          .trim();

        if (!word || !translation) {
          return null;
        }

        return {
          word,
          translation,
        };
      })
      .filter(
        (
          item
        ): item is VocabularyWord => item !== null
      );
  }, [text]);

  /* =========================================================
     BARCHA TO‘LDIRILGAN QATORLAR
  ========================================================= */

  const totalLines = useMemo(() => {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean).length;
  }, [text]);

  /* =========================================================
     XATO QATORLAR SONI
  ========================================================= */

  const invalidLines = totalLines - parsedWords.length;

  /* =========================================================
     UNITDAGI MAVJUD SO‘ZLARNI YUKLASH
  ========================================================= */

  async function loadWords() {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const response = await fetch(
        `/api/vocabulary?book=${book}&unit=${unit}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data =
        (await response.json()) as VocabularyResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "So‘zlarni yuklashda xatolik yuz berdi."
        );
      }

      setSavedWords(
        Array.isArray(data.words)
          ? data.words
          : []
      );
    } catch (err) {
      console.error(
        "Vocabulary load error:",
        err
      );

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

  /* =========================================================
     BOOK YOKI UNIT O‘ZGARGANDA YUKLASH
  ========================================================= */

  useEffect(() => {
    loadWords();
  }, [book, unit]);

  /* =========================================================
     IMPORT QILISH
  ========================================================= */

  async function handleImport() {
    try {
      setError("");
      setMessage("");

      if (!text.trim()) {
        setError(
          "Avval so‘zlarni kiriting."
        );
        return;
      }

      if (invalidLines > 0) {
        setError(
          `${invalidLines} ta qator noto‘g‘ri formatda. Har bir qatorda: English | Uzbek bo‘lishi kerak.`
        );
        return;
      }

      if (parsedWords.length === 0) {
        setError(
          "Import qilish uchun kamida bitta to‘g‘ri so‘z bo‘lishi kerak."
        );
        return;
      }

      const confirmed = window.confirm(
        `Book ${book}, Unit ${unit} uchun ${parsedWords.length} ta so‘zni saqlaysizmi?\n\nAgar bu Unit oldin mavjud bo‘lsa, eski so‘zlar yangilari bilan almashtiriladi.`
      );

      if (!confirmed) {
        return;
      }

      setSaving(true);

      const response = await fetch(
        "/api/vocabulary",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            book: Number(book),
            unit: Number(unit),
            words: parsedWords,
          }),
        }
      );

      const data =
        (await response.json()) as VocabularyResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "So‘zlarni saqlashda xatolik yuz berdi."
        );
      }

      setMessage(
        data.message ||
          `Book ${book}, Unit ${unit} uchun ${parsedWords.length} ta so‘z saqlandi.`
      );

      setText("");

      await loadWords();
    } catch (err) {
      console.error(
        "Vocabulary import error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "So‘zlarni saqlashda xatolik yuz berdi."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "40px 20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        {/* =====================================================
            SARLAVHA
        ===================================================== */}

        <div
          style={{
            marginBottom: "30px",
          }}
        >
          <h1
            style={{
              fontSize: "32px",
              margin: "0 0 8px",
              color: "#172033",
            }}
          >
            English Vocabulary
          </h1>

          <p
            style={{
              margin: 0,
              color: "#667085",
              fontSize: "16px",
            }}
          >
            4000 Essential English Words — so‘zlarni boshqarish
          </p>
        </div>

        {/* =====================================================
            ASOSIY KARTA
        ===================================================== */}

        <div
          style={{
            background: "white",
            borderRadius: "18px",
            padding: "28px",
            boxShadow:
              "0 8px 30px rgba(0,0,0,0.08)",
            border:
              "1px solid #e8ecf3",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: "24px",
              color: "#172033",
            }}
          >
            Unitga so‘z qo‘shish
          </h2>

          {/* ===================================================
              BOOK VA UNIT
          =================================================== */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "20px",
              marginBottom: "24px",
            }}
          >
            {/* BOOK */}

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: 600,
                  color: "#344054",
                }}
              >
                Book
              </label>

              <select
                value={book}
                onChange={(e) => {
                  setBook(
                    e.target.value
                  );

                  setText("");
                }}
                style={{
                  width: "100%",
                  height: "48px",
                  borderRadius: "10px",
                  border:
                    "1px solid #d0d5dd",
                  padding: "0 14px",
                  fontSize: "16px",
                  background: "white",
                  color: "#101828",
                }}
              >
                {books.map(
                  (number) => (
                    <option
                      key={number}
                      value={number}
                    >
                      Book {number}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* UNIT */}

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: 600,
                  color: "#344054",
                }}
              >
                Unit
              </label>

              <select
                value={unit}
                onChange={(e) => {
                  setUnit(
                    e.target.value
                  );

                  setText("");
                }}
                style={{
                  width: "100%",
                  height: "48px",
                  borderRadius: "10px",
                  border:
                    "1px solid #d0d5dd",
                  padding: "0 14px",
                  fontSize: "16px",
                  background: "white",
                  color: "#101828",
                }}
              >
                {units.map(
                  (number) => (
                    <option
                      key={number}
                      value={number}
                    >
                      Unit {number}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          {/* ===================================================
              TANLANGAN UNIT
          =================================================== */}

          <div
            style={{
              padding: "14px 18px",
              background: "#eef4ff",
              borderRadius: "10px",
              color: "#1849a9",
              fontWeight: 600,
              marginBottom: "24px",
            }}
          >
            Tanlandi: Book {book} → Unit {unit}
          </div>

          {/* ===================================================
              XABAR
          =================================================== */}

          {message && (
            <div
              style={{
                background:
                  "#ecfdf3",
                border:
                  "1px solid #abefc6",
                color: "#067647",
                padding:
                  "14px 16px",
                borderRadius:
                  "10px",
                marginBottom:
                  "20px",
                fontWeight: 600,
              }}
            >
              ✅ {message}
            </div>
          )}

          {/* ===================================================
              ERROR
          =================================================== */}

          {error && (
            <div
              style={{
                background:
                  "#fef3f2",
                border:
                  "1px solid #fecdca",
                color: "#b42318",
                padding:
                  "14px 16px",
                borderRadius:
                  "10px",
                marginBottom:
                  "20px",
                fontWeight: 600,
              }}
            >
              ❌ {error}
            </div>
          )}

          {/* ===================================================
              IMPORT MAYDONI
          =================================================== */}

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: 600,
                color: "#344054",
              }}
            >
              So‘zlarni kiriting
            </label>

            <p
              style={{
                marginTop: 0,
                color: "#667085",
                fontSize: "14px",
              }}
            >
              Har bir qatorda: English | Uzbek
            </p>

            <textarea
              value={text}
              onChange={(e) =>
                setText(
                  e.target.value
                )
              }
              placeholder={`abandon | tark etmoq
keen | juda qiziqqan
jealous | rashkchi
tact | odob bilan muomala qilish`}
              style={{
                width: "100%",
                minHeight: "280px",
                resize: "vertical",
                padding: "16px",
                boxSizing:
                  "border-box",
                borderRadius: "12px",
                border:
                  invalidLines > 0
                    ? "1px solid #f04438"
                    : "1px solid #d0d5dd",
                fontSize: "16px",
                lineHeight: "1.7",
                outline: "none",
                color: "#101828",
                background:
                  "#ffffff",
              }}
            />
          </div>

          {/* ===================================================
              STATISTIKA + IMPORT
          =================================================== */}

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              flexWrap: "wrap",
              gap: "15px",
              marginTop: "20px",
            }}
          >
            <div>
              <div
                style={{
                  color: "#667085",
                  marginBottom:
                    "4px",
                }}
              >
                {totalLines} ta qator
              </div>

              <div
                style={{
                  fontSize:
                    "14px",
                  color:
                    invalidLines > 0
                      ? "#b42318"
                      : "#067647",
                }}
              >
                To‘g‘ri:{" "}
                {parsedWords.length}
                {" • "}
                Xato:{" "}
                {invalidLines}
              </div>
            </div>

            <button
              type="button"
              disabled={
                saving ||
                parsedWords.length ===
                  0 ||
                invalidLines > 0
              }
              onClick={
                handleImport
              }
              style={{
                border: "none",
                borderRadius:
                  "10px",
                padding:
                  "13px 26px",
                background:
                  saving ||
                  parsedWords.length ===
                    0 ||
                  invalidLines > 0
                    ? "#98a2b3"
                    : "#155eef",
                color: "white",
                fontSize: "16px",
                fontWeight: 600,
                cursor:
                  saving ||
                  parsedWords.length ===
                    0 ||
                  invalidLines > 0
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {saving
                ? "Saqlanmoqda..."
                : "Import qilish"}
            </button>
          </div>
        </div>

        {/* =====================================================
            SAQLANGAN SO‘ZLAR
        ===================================================== */}

        <div
          style={{
            marginTop: "24px",
            background: "#ffffff",
            border:
              "1px solid #e8ecf3",
            borderRadius: "16px",
            padding: "22px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              gap: "15px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h3
                style={{
                  margin:
                    "0 0 5px",
                  color: "#172033",
                }}
              >
                Saqlangan so‘zlar
              </h3>

              <div
                style={{
                  color: "#667085",
                  fontSize:
                    "14px",
                }}
              >
                Book {book} → Unit {unit}
              </div>
            </div>

            <button
              type="button"
              onClick={
                loadWords
              }
              disabled={loading}
              style={{
                border:
                  "1px solid #d0d5dd",
                background:
                  "#ffffff",
                borderRadius:
                  "9px",
                padding:
                  "9px 15px",
                cursor:
                  loading
                    ? "not-allowed"
                    : "pointer",
                fontWeight: 600,
              }}
            >
              {loading
                ? "Yuklanmoqda..."
                : "Yangilash"}
            </button>
          </div>

          <div
            style={{
              marginTop: "20px",
            }}
          >
            {loading ? (
              <div
                style={{
                  color: "#667085",
                  padding:
                    "20px 0",
                }}
              >
                So‘zlar yuklanmoqda...
              </div>
            ) : savedWords.length ===
              0 ? (
              <div
                style={{
                  background:
                    "#f9fafb",
                  border:
                    "1px dashed #d0d5dd",
                  borderRadius:
                    "10px",
                  padding:
                    "24px",
                  color:
                    "#667085",
                  textAlign:
                    "center",
                }}
              >
                Bu Unit uchun hali so‘z saqlanmagan.
              </div>
            ) : (
              <div
                style={{
                  display:
                    "grid",
                  gap: "10px",
                }}
              >
                {savedWords.map(
                  (
                    item,
                    index
                  ) => (
                    <div
                      key={`${item.word}-${index}`}
                      style={{
                        display:
                          "grid",
                        gridTemplateColumns:
                          "50px 1fr 1fr",
                        gap:
                          "15px",
                        alignItems:
                          "center",
                        padding:
                          "13px 15px",
                        border:
                          "1px solid #e5e7eb",
                        borderRadius:
                          "10px",
                      }}
                    >
                      <div
                        style={{
                          color:
                            "#667085",
                          fontWeight:
                            600,
                        }}
                      >
                        {index + 1}.
                      </div>

                      <div
                        style={{
                          fontWeight:
                            700,
                          color:
                            "#101828",
                        }}
                      >
                        {item.word}
                      </div>

                      <div
                        style={{
                          color:
                            "#475467",
                        }}
                      >
                        {item.translation}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* =====================================================
            TEST FORMAT PREVIEW
        ===================================================== */}

        <div
          style={{
            marginTop: "24px",
            background: "#ffffff",
            border:
              "1px solid #e8ecf3",
            borderRadius: "16px",
            padding: "22px",
          }}
        >
          <h3
            style={{
              marginTop: 0,
              color: "#172033",
            }}
          >
            Test formati
          </h3>

          <div
            style={{
              border:
                "1px solid #e5e7eb",
              borderRadius: "12px",
              padding: "20px",
            }}
          >
            <div
              style={{
                fontSize: "24px",
                fontWeight: 700,
                marginBottom:
                  "18px",
              }}
            >
              abandon
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: "12px",
              }}
            >
              <div
                style={{
                  border:
                    "1px solid #d0d5dd",
                  borderRadius:
                    "10px",
                  padding:
                    "15px",
                }}
              >
                A) tark etmoq
              </div>

              <div
                style={{
                  border:
                    "1px solid #d0d5dd",
                  borderRadius:
                    "10px",
                  padding:
                    "15px",
                }}
              >
                B) davom ettirmoq
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
