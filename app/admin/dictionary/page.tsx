"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

/* =========================================================
   TYPES
========================================================= */

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

/* =========================================================
   PAGE
========================================================= */

export default function DictionaryAdminPage() {
  const [book, setBook] =
    useState("1");

  const [unit, setUnit] =
    useState("1");

  const [text, setText] =
    useState("");

  const [
    savedWords,
    setSavedWords,
  ] =
    useState<
      VocabularyWord[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");

  const books =
    Array.from(
      { length: 6 },
      (_, i) => i + 1
    );

  const units =
    Array.from(
      { length: 30 },
      (_, i) => i + 1
    );

  /* =========================================================
     TEXTDAN SO‘ZLARNI AJRATISH

     FORMAT:
     English | Uzbek | English example | Uzbek example
  ========================================================= */

  const parsedWords =
    useMemo(() => {
      return text
        .split("\n")

        .map(
          (line) =>
            line.trim()
        )

        .filter(Boolean)

        .map(
          (
            line
          ): VocabularyWord | null => {
            const parts =
              line
                .split("|")
                .map(
                  (part) =>
                    part.trim()
                );

            /*
              Kamida:
              English | Uzbek
              bo‘lishi kerak.

              Misol gaplar ixtiyoriy.
            */

            if (
              parts.length < 2
            ) {
              return null;
            }

            const word =
              parts[0] || "";

            const translation =
              parts[1] || "";

            const example =
              parts[2] || "";

            const exampleTranslation =
              parts[3] || "";

            if (
              !word ||
              !translation
            ) {
              return null;
            }

            return {
              word,
              translation,

              ...(example
                ? {
                    example,
                  }
                : {}),

              ...(exampleTranslation
                ? {
                    exampleTranslation,
                  }
                : {}),
            };
          }
        )

        .filter(
          (
            item
          ): item is VocabularyWord =>
            item !== null
        );
    }, [text]);

  /* =========================================================
     BARCHA TO‘LDIRILGAN QATORLAR
  ========================================================= */

  const totalLines =
    useMemo(() => {
      return text
        .split("\n")

        .map(
          (line) =>
            line.trim()
        )

        .filter(Boolean)
        .length;
    }, [text]);

  /* =========================================================
     XATO QATORLAR
  ========================================================= */

  const invalidLines =
    totalLines -
    parsedWords.length;

  /* =========================================================
     MISOL GAPLARI BOR SO‘ZLAR SONI
  ========================================================= */

  const exampleCount =
    useMemo(() => {
      return parsedWords.filter(
        (
          item:
            VocabularyWord
        ) =>
          Boolean(
            item.example &&
              item.exampleTranslation
          )
      ).length;
    }, [parsedWords]);

  /* =========================================================
     UNITDAGI MAVJUD SO‘ZLARNI YUKLASH
  ========================================================= */

  async function loadWords() {
    try {
      setLoading(true);

      setError("");

      setMessage("");

      const response =
        await fetch(
          `/api/vocabulary?book=${book}&unit=${unit}`,
          {
            method: "GET",
            cache:
              "no-store",
          }
        );

      const data =
        (await response.json()) as VocabularyResponse;

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "So‘zlarni yuklashda xatolik yuz berdi."
        );
      }

      setSavedWords(
        Array.isArray(
          data.words
        )
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
     BOOK / UNIT O‘ZGARGANDA
  ========================================================= */

  useEffect(() => {
    loadWords();
  }, [book, unit]);

  /* =========================================================
     IMPORT
  ========================================================= */

  async function handleImport() {
    try {
      setError("");

      setMessage("");

      if (
        !text.trim()
      ) {
        setError(
          "Avval so‘zlarni kiriting."
        );

        return;
      }

      if (
        invalidLines > 0
      ) {
        setError(
          `${invalidLines} ta qator noto‘g‘ri formatda.`
        );

        return;
      }

      if (
        parsedWords.length === 0
      ) {
        setError(
          "Import qilish uchun kamida bitta to‘g‘ri so‘z bo‘lishi kerak."
        );

        return;
      }

      const confirmed =
        window.confirm(
          `Book ${book}, Unit ${unit} uchun ${parsedWords.length} ta so‘zni saqlaysizmi?\n\n` +
            `Misol gap bilan: ${exampleCount} ta\n\n` +
            `Agar bu Unit oldin mavjud bo‘lsa, eski so‘zlar yangilari bilan almashtiriladi.`
        );

      if (
        !confirmed
      ) {
        return;
      }

      setSaving(true);

      const response =
        await fetch(
          "/api/vocabulary",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                {
                  book:
                    Number(
                      book
                    ),

                  unit:
                    Number(
                      unit
                    ),

                  words:
                    parsedWords,
                }
              ),
          }
        );

      const data =
        (await response.json()) as VocabularyResponse;

      if (
        !response.ok ||
        !data.success
      ) {
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

  /* =========================================================
     SAVED WORDS NI TEXTAREA GA QAYTA YUKLASH
  ========================================================= */

  function loadSavedIntoEditor() {
    if (
      savedWords.length === 0
    ) {
      setError(
        "Bu Unitda hali saqlangan so‘zlar yo‘q."
      );

      return;
    }

    const prepared =
      savedWords
        .map(
          (
            item:
              VocabularyWord
          ) => {
            return [
              item.word,
              item.translation,
              item.example || "",
              item.exampleTranslation ||
                "",
            ].join(" | ");
          }
        )
        .join("\n");

    setText(
      prepared
    );

    setMessage(
      "Saqlangan so‘zlar tahrirlash maydoniga yuklandi."
    );

    setError("");
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <main
      style={{
        minHeight:
          "100vh",

        background:
          "linear-gradient(180deg, #ffffff 0%, #f5f7fb 55%, #e9edf3 100%)",

        padding:
          "40px 20px",

        fontFamily:
          '"Bell MT", "Times New Roman", serif',
      }}
    >
      <div
        style={{
          maxWidth:
            "1150px",

          margin:
            "0 auto",
        }}
      >
        {/* =====================================================
            HEADER
        ===================================================== */}

        <div
          style={{
            marginBottom:
              "30px",
          }}
        >
          <h1
            style={{
              fontSize:
                "36px",

              margin:
                "0 0 8px",

              color:
                "#073b68",
            }}
          >
            English Vocabulary
          </h1>

          <p
            style={{
              margin: 0,

              color:
                "#667085",

              fontSize:
                "17px",
            }}
          >
            4000 Essential English Words — so‘zlar va misol gaplarni boshqarish
          </p>
        </div>

        {/* =====================================================
            ASOSIY KARTA
        ===================================================== */}

        <div
          style={{
            background:
              "white",

            borderRadius:
              "20px",

            padding:
              "30px",

            boxShadow:
              "0 10px 30px rgba(0,0,0,0.09)",

            border:
              "1px solid #e0e5ec",
          }}
        >
          <h2
            style={{
              marginTop: 0,

              marginBottom:
                "25px",

              color:
                "#172033",

              fontSize:
                "27px",
            }}
          >
            Unitga so‘z qo‘shish
          </h2>

          {/* ===================================================
              BOOK + UNIT
          =================================================== */}

          <div
            style={{
              display:
                "grid",

              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",

              gap:
                "20px",

              marginBottom:
                "24px",
            }}
          >
            {/* BOOK */}

            <div>
              <label
                style={{
                  display:
                    "block",

                  marginBottom:
                    "8px",

                  fontWeight:
                    700,

                  color:
                    "#344054",

                  fontSize:
                    "17px",
                }}
              >
                Book
              </label>

              <select
                value={
                  book
                }
                onChange={
                  (
                    e
                  ) => {
                    setBook(
                      e.target
                        .value
                    );

                    setText(
                      ""
                    );
                  }
                }
                style={{
                  width:
                    "100%",

                  height:
                    "50px",

                  borderRadius:
                    "11px",

                  border:
                    "1px solid #d0d5dd",

                  padding:
                    "0 14px",

                  fontSize:
                    "16px",

                  background:
                    "white",

                  color:
                    "#101828",

                  fontFamily:
                    "inherit",
                }}
              >
                {books.map(
                  (
                    number
                  ) => (
                    <option
                      key={
                        number
                      }
                      value={
                        number
                      }
                    >
                      Book{" "}
                      {
                        number
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            {/* UNIT */}

            <div>
              <label
                style={{
                  display:
                    "block",

                  marginBottom:
                    "8px",

                  fontWeight:
                    700,

                  color:
                    "#344054",

                  fontSize:
                    "17px",
                }}
              >
                Unit
              </label>

              <select
                value={
                  unit
                }
                onChange={
                  (
                    e
                  ) => {
                    setUnit(
                      e.target
                        .value
                    );

                    setText(
                      ""
                    );
                  }
                }
                style={{
                  width:
                    "100%",

                  height:
                    "50px",

                  borderRadius:
                    "11px",

                  border:
                    "1px solid #d0d5dd",

                  padding:
                    "0 14px",

                  fontSize:
                    "16px",

                  background:
                    "white",

                  color:
                    "#101828",

                  fontFamily:
                    "inherit",
                }}
              >
                {units.map(
                  (
                    number
                  ) => (
                    <option
                      key={
                        number
                      }
                      value={
                        number
                      }
                    >
                      Unit{" "}
                      {
                        number
                      }
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          {/* ===================================================
              TANLANGAN JOY
          =================================================== */}

          <div
            style={{
              padding:
                "15px 18px",

              background:
                "#eef6ff",

              border:
                "1px solid #c9e2ff",

              borderRadius:
                "11px",

              color:
                "#1849a9",

              fontWeight:
                700,

              marginBottom:
                "25px",

              fontSize:
                "17px",
            }}
          >
            Tanlandi: Book{" "}
            {book} → Unit{" "}
            {unit}
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

                color:
                  "#067647",

                padding:
                  "14px 16px",

                borderRadius:
                  "10px",

                marginBottom:
                  "20px",

                fontWeight:
                  700,
              }}
            >
              ✅{" "}
              {message}
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

                color:
                  "#b42318",

                padding:
                  "14px 16px",

                borderRadius:
                  "10px",

                marginBottom:
                  "20px",

                fontWeight:
                  700,
              }}
            >
              ❌{" "}
              {error}
            </div>
          )}

          {/* ===================================================
              FORMAT
          =================================================== */}

          <div
            style={{
              marginBottom:
                "12px",
            }}
          >
            <div
              style={{
                fontWeight:
                  700,

                color:
                  "#344054",

                fontSize:
                  "17px",

                marginBottom:
                  "7px",
              }}
            >
              So‘zlarni kiriting
            </div>

            <div
              style={{
                color:
                  "#667085",

                fontSize:
                  "14px",

                lineHeight:
                  "1.6",
              }}
            >
              Format:
              <strong>
                {" "}
                English | Uzbek | English example | Uzbek example
              </strong>
            </div>

            <div
              style={{
                color:
                  "#667085",

                fontSize:
                  "14px",

                marginTop:
                  "4px",
              }}
            >
              Misol gaplar bo‘lmasa, faqat
              <strong>
                {" "}
                English | Uzbek
              </strong>
              {" "}
              formatida ham kiritish mumkin.
            </div>
          </div>

          {/* ===================================================
              TEXTAREA
          =================================================== */}

          <textarea
            value={
              text
            }
            onChange={
              (
                e
              ) =>
                setText(
                  e.target
                    .value
                )
            }
            placeholder={`afraid | qo‘rqqan | I am afraid of dogs. | Men itlardan qo‘rqaman.
agree | rozi bo‘lmoq | I agree with you. | Men sizga qo‘shilaman.
angry | jahli chiqqan | He is angry with me. | U mendan jahli chiqdi.`}
            style={{
              width:
                "100%",

              minHeight:
                "330px",

              resize:
                "vertical",

              padding:
                "17px",

              boxSizing:
                "border-box",

              borderRadius:
                "13px",

              border:
                invalidLines >
                0
                  ? "1px solid #f04438"
                  : "1px solid #d0d5dd",

              fontSize:
                "16px",

              lineHeight:
                "1.8",

              outline:
                "none",

              color:
                "#101828",

              background:
                "#ffffff",

              fontFamily:
                "Arial, sans-serif",
            }}
          />

          {/* ===================================================
              STATISTIKA
          =================================================== */}

          <div
            style={{
              display:
                "flex",

              justifyContent:
                "space-between",

              alignItems:
                "center",

              flexWrap:
                "wrap",

              gap:
                "16px",

              marginTop:
                "20px",
            }}
          >
            <div>
              <div
                style={{
                  color:
                    "#667085",

                  marginBottom:
                    "5px",

                  fontWeight:
                    600,
                }}
              >
                {totalLines}{" "}
                ta qator
              </div>

              <div
                style={{
                  fontSize:
                    "14px",

                  color:
                    invalidLines >
                    0
                      ? "#b42318"
                      : "#067647",
                }}
              >
                To‘g‘ri:{" "}
                {
                  parsedWords.length
                }
                {" • "}
                Xato:{" "}
                {
                  invalidLines
                }
                {" • "}
                Misol gap bilan:{" "}
                {
                  exampleCount
                }
              </div>
            </div>

            <button
              type="button"
              disabled={
                saving ||
                parsedWords.length ===
                  0 ||
                invalidLines >
                  0
              }
              onClick={
                handleImport
              }
              style={{
                border:
                  "none",

                borderRadius:
                  "11px",

                padding:
                  "14px 28px",

                background:
                  saving ||
                  parsedWords.length ===
                    0 ||
                  invalidLines >
                    0
                    ? "#98a2b3"
                    : "#155eef",

                color:
                  "white",

                fontSize:
                  "17px",

                fontWeight:
                  700,

                cursor:
                  saving ||
                  parsedWords.length ===
                    0 ||
                  invalidLines >
                    0
                    ? "not-allowed"
                    : "pointer",

                fontFamily:
                  "inherit",
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
            marginTop:
              "25px",

            background:
              "#ffffff",

            border:
              "1px solid #e8ecf3",

            borderRadius:
              "18px",

            padding:
              "24px",

            boxShadow:
              "0 7px 20px rgba(0,0,0,.06)",
          }}
        >
          <div
            style={{
              display:
                "flex",

              justifyContent:
                "space-between",

              alignItems:
                "center",

              gap:
                "15px",

              flexWrap:
                "wrap",
            }}
          >
            <div>
              <h3
                style={{
                  margin:
                    "0 0 5px",

                  color:
                    "#172033",

                  fontSize:
                    "24px",
                }}
              >
                Saqlangan so‘zlar
              </h3>

              <div
                style={{
                  color:
                    "#667085",

                  fontSize:
                    "15px",
                }}
              >
                Book{" "}
                {book} → Unit{" "}
                {unit}
              </div>
            </div>

            <div
              style={{
                display:
                  "flex",

                gap:
                  "10px",

                flexWrap:
                  "wrap",
              }}
            >
              <button
                type="button"
                onClick={
                  loadSavedIntoEditor
                }
                disabled={
                  loading ||
                  savedWords.length ===
                    0
                }
                style={{
                  border:
                    "1px solid #174461",

                  background:
                    "#eef6ff",

                  color:
                    "#073b68",

                  borderRadius:
                    "9px",

                  padding:
                    "10px 15px",

                  cursor:
                    loading ||
                    savedWords.length ===
                      0
                      ? "not-allowed"
                      : "pointer",

                  fontWeight:
                    700,

                  fontFamily:
                    "inherit",
                }}
              >
                ✏️ Tahrirlash
              </button>

              <button
                type="button"
                onClick={
                  loadWords
                }
                disabled={
                  loading
                }
                style={{
                  border:
                    "1px solid #d0d5dd",

                  background:
                    "#ffffff",

                  borderRadius:
                    "9px",

                  padding:
                    "10px 15px",

                  cursor:
                    loading
                      ? "not-allowed"
                      : "pointer",

                  fontWeight:
                    700,

                  fontFamily:
                    "inherit",
                }}
              >
                {loading
                  ? "Yuklanmoqda..."
                  : "Yangilash"}
              </button>
            </div>
          </div>

          {/* ===================================================
              LIST
          =================================================== */}

          <div
            style={{
              marginTop:
                "22px",
            }}
          >
            {loading ? (
              <div
                style={{
                  color:
                    "#667085",

                  padding:
                    "25px 0",

                  textAlign:
                    "center",
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
                    "26px",

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

                  gap:
                    "13px",
                }}
              >
                {savedWords.map(
                  (
                    item:
                      VocabularyWord,
                    index:
                      number
                  ) => (
                    <div
                      key={`${item.word}-${index}`}
                      style={{
                        border:
                          "1px solid #e1e6ee",

                        borderRadius:
                          "13px",

                        padding:
                          "16px 18px",

                        background:
                          "#ffffff",
                      }}
                    >
                      <div
                        style={{
                          display:
                            "grid",

                          gridTemplateColumns:
                            "45px 1fr 1fr",

                          gap:
                            "15px",

                          alignItems:
                            "center",
                        }}
                      >
                        <div
                          style={{
                            color:
                              "#667085",

                            fontWeight:
                              700,
                          }}
                        >
                          {index +
                            1}
                          .
                        </div>

                        <div
                          style={{
                            fontWeight:
                              700,

                            color:
                              "#101828",

                            fontSize:
                              "18px",
                          }}
                        >
                          {
                            item.word
                          }
                        </div>

                        <div
                          style={{
                            color:
                              "#475467",

                            fontSize:
                              "17px",
                          }}
                        >
                          {
                            item.translation
                          }
                        </div>
                      </div>

                      {(item.example ||
                        item.exampleTranslation) && (
                        <div
                          style={{
                            marginTop:
                              "13px",

                            paddingTop:
                              "12px",

                            borderTop:
                              "1px dashed #d0d5dd",

                            textAlign:
                              "center",
                          }}
                        >
                          {item.example && (
                            <div
                              style={{
                                fontFamily:
                                  '"Times New Roman", serif',

                                fontSize:
                                  "20px",

                                fontStyle:
                                  "italic",

                                fontWeight:
                                  700,

                                color:
                                  "#111",
                              }}
                            >
                              {
                                item.example
                              }
                            </div>
                          )}

                          {item.exampleTranslation && (
                            <div
                              style={{
                                marginTop:
                                  "3px",

                                fontFamily:
                                  '"Times New Roman", serif',

                                fontSize:
                                  "18px",

                                fontStyle:
                                  "italic",

                                color:
                                  "#d92d20",
                              }}
                            >
                              (
                              {
                                item.exampleTranslation
                              }
                              )
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
