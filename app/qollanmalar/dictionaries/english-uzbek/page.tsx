"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type DictionaryWord = {
  id: string;
  english: string;
  uzbek: string;
  createdAt?: string;
  updatedAt?: string;
};

type Mode = "en-uz" | "uz-en" | "mixed";

export default function EnglishUzbekLearnPage() {
  const router = useRouter();

  const [words, setWords] = useState<DictionaryWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [mode, setMode] = useState<Mode>("en-uz");
  const [index, setIndex] = useState(0);

  const [options, setOptions] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState("");

  const [mixedDirection, setMixedDirection] =
    useState<"en-uz" | "uz-en">("en-uz");

  const [difficultWords, setDifficultWords] = useState<Set<string>>(
    new Set()
  );

  // =========================
  // LUG‘ATNI YUKLASH
  // =========================

  useEffect(() => {
    async function loadWords() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "/api/dictionary/english-uzbek",
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error("Lug‘atni yuklab bo‘lmadi.");
        }

        const data = await response.json();

        let receivedWords: DictionaryWord[] = [];

        if (Array.isArray(data)) {
          receivedWords = data;
        } else if (Array.isArray(data.words)) {
          receivedWords = data.words;
        } else if (Array.isArray(data.data)) {
          receivedWords = data.data;
        }

        const cleanWords = receivedWords.filter(
          (word) =>
            word &&
            typeof word.english === "string" &&
            typeof word.uzbek === "string" &&
            word.english.trim() !== "" &&
            word.uzbek.trim() !== ""
        );

        setWords(cleanWords);

        if (cleanWords.length === 0) {
          setError("Lug‘atda so‘z topilmadi.");
        }
      } catch (err) {
        console.error(err);
        setError("Lug‘atni yuklashda xatolik yuz berdi.");
      } finally {
        setLoading(false);
      }
    }

    loadWords();
  }, []);

  // =========================
  // HOZIRGI YO‘NALISH
  // =========================

  const currentDirection = useMemo(() => {
    if (mode === "mixed") {
      return mixedDirection;
    }

    return mode;
  }, [mode, mixedDirection]);

  const currentWord = words[index];

  // =========================
  // VARIANT YARATISH
  // =========================

  const createOptions = useCallback(() => {
    if (!currentWord || words.length < 2) {
      return;
    }

    const direction =
      mode === "mixed"
        ? Math.random() < 0.5
          ? "en-uz"
          : "uz-en"
        : mode;

    if (mode === "mixed") {
      setMixedDirection(direction);
    }

    const correct =
      direction === "en-uz"
        ? currentWord.uzbek.trim()
        : currentWord.english.trim();

    const wrongPool = words
      .filter((word) => word.id !== currentWord.id)
      .map((word) =>
        direction === "en-uz"
          ? word.uzbek.trim()
          : word.english.trim()
      )
      .filter(
        (value, position, array) =>
          value !== "" &&
          value !== correct &&
          array.indexOf(value) === position
      );

    if (wrongPool.length === 0) {
      setOptions([correct]);
      setCorrectAnswer(correct);
      setSelected(null);
      return;
    }

    const randomWrong =
      wrongPool[Math.floor(Math.random() * wrongPool.length)];

    const generatedOptions = [correct, randomWrong].sort(
      () => Math.random() - 0.5
    );

    setCorrectAnswer(correct);
    setOptions(generatedOptions);
    setSelected(null);
  }, [currentWord, words, mode]);

  useEffect(() => {
    if (words.length > 0 && currentWord) {
      createOptions();
    }
  }, [index, mode, words.length, currentWord, createOptions]);

  // =========================
  // JAVOBNI TANLASH
  // =========================

  function handleAnswer(answer: string) {
    if (selected !== null) return;

    setSelected(answer);
  }

  // =========================
  // KEYINGI
  // =========================

  function nextWord() {
    if (words.length === 0) return;

    setIndex((previous) => {
      if (previous >= words.length - 1) {
        return 0;
      }

      return previous + 1;
    });

    setSelected(null);
  }

  // =========================
  // OLDINGI
  // =========================

  function previousWord() {
    if (words.length === 0) return;

    setIndex((previous) => {
      if (previous <= 0) {
        return words.length - 1;
      }

      return previous - 1;
    });

    setSelected(null);
  }

  // =========================
  // KEYINROQ YANA KO‘RSAT
  // =========================

  function showLater() {
    if (!currentWord || words.length === 0) return;

    setWords((previousWords) => {
      const copy = [...previousWords];

      const [removed] = copy.splice(index, 1);

      const minDistance = 5;
      const maxDistance = Math.min(20, copy.length);

      let newPosition = index + minDistance;

      if (maxDistance > minDistance) {
        newPosition =
          index +
          minDistance +
          Math.floor(
            Math.random() * (maxDistance - minDistance + 1)
          );
      }

      newPosition = Math.min(newPosition, copy.length);

      copy.splice(newPosition, 0, removed);

      return copy;
    });

    if (index >= words.length - 1) {
      setIndex(0);
    }

    setSelected(null);
  }

  // =========================
  // QIYIN SO‘Z
  // =========================

  function toggleDifficult() {
    if (!currentWord) return;

    setDifficultWords((previous) => {
      const next = new Set(previous);

      if (next.has(currentWord.id)) {
        next.delete(currentWord.id);
      } else {
        next.add(currentWord.id);
      }

      return next;
    });
  }

  // =========================
  // TALAFFUZ
  // =========================

  function pronounce() {
    if (!currentWord) return;

    if (!("speechSynthesis" in window)) {
      alert("Brauzeringiz talaffuz funksiyasini qo‘llab-quvvatlamaydi.");
      return;
    }

    window.speechSynthesis.cancel();

    const text =
      currentDirection === "en-uz"
        ? currentWord.english
        : currentWord.english;

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = "en-US";
    utterance.rate = 0.85;
    utterance.pitch = 1;

    window.speechSynthesis.speak(utterance);
  }

  // =========================
  // SAVOL MATNI
  // =========================

  const questionText = useMemo(() => {
    if (!currentWord) return "";

    if (currentDirection === "en-uz") {
      return currentWord.english;
    }

    return currentWord.uzbek;
  }, [currentWord, currentDirection]);

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.messageBox}>
          Lug‘at yuklanmoqda...
        </div>
      </main>
    );
  }

  // =========================
  // ERROR
  // =========================

  if (error || words.length === 0) {
    return (
      <main style={styles.page}>
        <div style={styles.messageBox}>
          {error || "Lug‘atda so‘z mavjud emas."}
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      {/* ================= HEADER ================= */}

      <section style={styles.topPanel}>
        <button
          type="button"
          style={styles.backButton}
          onClick={() =>
            router.push("/qollanmalar/dictionaries")
          }
        >
          ← Lug‘atlar
        </button>

        <div style={styles.modeGroup}>
          <button
            type="button"
            style={{
              ...styles.modeButton,
              ...(mode === "en-uz"
                ? styles.modeButtonActive
                : {}),
            }}
            onClick={() => {
              setMode("en-uz");
              setSelected(null);
            }}
          >
            English → Uzbek
          </button>

          <button
            type="button"
            style={{
              ...styles.modeButton,
              ...(mode === "uz-en"
                ? styles.modeButtonActive
                : {}),
            }}
            onClick={() => {
              setMode("uz-en");
              setSelected(null);
            }}
          >
            Uzbek → English
          </button>

          <button
            type="button"
            style={{
              ...styles.modeButton,
              ...(mode === "mixed"
                ? styles.modeButtonActive
                : {}),
            }}
            onClick={() => {
              setMode("mixed");
              setSelected(null);
            }}
          >
            Aralash
          </button>
        </div>

        <div style={styles.progress}>
          {index + 1} / {words.length}
        </div>
      </section>

      {/* ================= SAVOL ================= */}

      <section style={styles.studyArea}>
        <div style={styles.wordCard}>
          {questionText}
        </div>

        {/* ================= FUNKSIYA TUGMALARI ================= */}

        <div style={styles.functionButtons}>
          <button
            type="button"
            style={styles.smallButton}
            onClick={pronounce}
          >
            🔊 Talaffuz
          </button>

          <button
            type="button"
            style={{
              ...styles.smallButton,
              ...(difficultWords.has(currentWord.id)
                ? styles.difficultActive
                : {}),
            }}
            onClick={toggleDifficult}
          >
            {difficultWords.has(currentWord.id)
              ? "★ Qiyin so‘z"
              : "☆ Qiyin so‘z"}
          </button>
        </div>

        {/* ================= JAVOBLAR ================= */}

        <div style={styles.answers}>
          {options.map((option) => {
            let optionStyle = styles.answerButton;

            if (selected !== null) {
              if (option === correctAnswer) {
                optionStyle = {
                  ...styles.answerButton,
                  ...styles.correctAnswer,
                };
              } else if (
                option === selected &&
                option !== correctAnswer
              ) {
                optionStyle = {
                  ...styles.answerButton,
                  ...styles.wrongAnswer,
                };
              }
            }

            return (
              <button
                key={option}
                type="button"
                style={optionStyle}
                onClick={() => handleAnswer(option)}
              >
                {option}
              </button>
            );
          })}
        </div>

        {/* ================= NAVIGATION ================= */}

        <div style={styles.navigation}>
          <button
            type="button"
            style={styles.navButton}
            onClick={previousWord}
          >
            ← Oldingi
          </button>

          <button
            type="button"
            style={styles.laterButton}
            onClick={showLater}
          >
            ↻ Keyinroq yana ko‘rsat
          </button>

          <button
            type="button"
            style={styles.navButton}
            onClick={nextWord}
          >
            Keyingi →
          </button>
        </div>
      </section>
    </main>
  );
}

// ======================================================
// DESIGN
// ======================================================

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(180deg, #f7fbfd 0%, #eef5f8 100%)",
    padding: "32px 18px 60px",
    fontFamily:
      '"Bell MT", "Times New Roman", Georgia, serif',
    color: "#073b5c",
  },

  topPanel: {
    maxWidth: "1100px",
    margin: "0 auto",
    minHeight: "88px",

    display: "grid",
    gridTemplateColumns: "170px 1fr 130px",
    alignItems: "center",
    gap: "20px",

    padding: "16px 24px",

    borderRadius: "20px",
    border: "2px solid #075477",

    background:
      "linear-gradient(180deg, #7ed6f4 0%, #45add8 72%, #2994c0 100%)",

    boxShadow:
      "0 10px 0 #07506d, 0 17px 24px rgba(0,0,0,0.20), inset 0 2px 3px rgba(255,255,255,0.85)",
  },

  backButton: {
    height: "46px",
    padding: "0 22px",

    borderRadius: "9px",
    border: "1px solid #87939a",

    background:
      "linear-gradient(180deg, #ffffff 0%, #eeeeee 100%)",

    boxShadow:
      "0 6px 0 #67747b, 0 8px 12px rgba(0,0,0,0.18)",

    fontFamily: "inherit",
    fontSize: "16px",
    fontWeight: 700,

    color: "#063c5a",
    cursor: "pointer",
  },

  modeGroup: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
    flexWrap: "wrap",
  },

  modeButton: {
    minWidth: "150px",
    height: "46px",

    padding: "0 20px",

    borderRadius: "8px",
    border: "1px solid #82929a",

    background:
      "linear-gradient(180deg, #ffffff 0%, #ededed 100%)",

    boxShadow:
      "0 6px 0 #66767d, 0 8px 11px rgba(0,0,0,0.15)",

    fontFamily: "inherit",
    fontSize: "16px",
    fontWeight: 700,

    color: "#073c5b",
    cursor: "pointer",
  },

  modeButtonActive: {
    color: "#ffffff",

    border: "1px solid #005179",

    background:
      "linear-gradient(180deg, #56c8f3 0%, #158bc1 100%)",

    boxShadow:
      "0 6px 0 #075372, 0 8px 11px rgba(0,0,0,0.20)",
  },

  progress: {
    justifySelf: "end",

    minWidth: "100px",

    textAlign: "center",

    fontSize: "18px",
    fontWeight: 800,
    letterSpacing: "1px",

    color: "#063b59",
  },

  studyArea: {
    maxWidth: "1050px",
    margin: "38px auto 0",
  },

  wordCard: {
    width: "min(490px, 90vw)",
    minHeight: "116px",

    margin: "0 auto",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    padding: "20px 30px",

    textAlign: "center",

    borderRadius: "15px",
    border: "2px solid #075579",

    background:
      "linear-gradient(180deg, #78d3f3 0%, #3ba8d6 100%)",

    boxShadow:
      "0 9px 0 #07506e, 0 15px 20px rgba(0,0,0,0.18), inset 0 2px 2px rgba(255,255,255,0.7)",

    color: "#062f4d",

    fontSize: "40px",
    fontWeight: 700,

    wordBreak: "break-word",
  },

  functionButtons: {
    marginTop: "30px",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "14px",

    flexWrap: "wrap",
  },

  smallButton: {
    minWidth: "120px",
    height: "44px",

    padding: "0 18px",

    border: "1px solid #88949a",
    borderRadius: "8px",

    background:
      "linear-gradient(180deg, #ffffff 0%, #ededed 100%)",

    boxShadow:
      "0 6px 0 #65737a, 0 8px 10px rgba(0,0,0,0.15)",

    color: "#073d5c",

    fontFamily: "inherit",
    fontSize: "16px",
    fontWeight: 700,

    cursor: "pointer",
  },

  difficultActive: {
    background:
      "linear-gradient(180deg, #fff3a8 0%, #ffd85e 100%)",
  },

  answers: {
    marginTop: "68px",

    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(280px, 1fr))",

    gap: "52px",

    alignItems: "stretch",
  },

  answerButton: {
    minHeight: "100px",

    padding: "20px 28px",

    borderRadius: "13px",
    border: "1px solid #9aa3a7",

    background:
      "linear-gradient(180deg, #ffffff 0%, #eeeeee 100%)",

    boxShadow:
      "0 8px 0 #727e84, 0 12px 17px rgba(0,0,0,0.16)",

    color: "#073951",

    fontFamily: "inherit",
    fontSize: "28px",
    fontWeight: 700,

    cursor: "pointer",

    transition:
      "transform 0.12s ease, box-shadow 0.12s ease",
  },

  correctAnswer: {
    background:
      "linear-gradient(180deg, #d9ffe0 0%, #9ee7ac 100%)",

    border: "2px solid #168836",
    color: "#075d20",
  },

  wrongAnswer: {
    background:
      "linear-gradient(180deg, #ffe1e1 0%, #ef9b9b 100%)",

    border: "2px solid #b92e2e",
    color: "#8d1414",
  },

  navigation: {
    marginTop: "48px",

    display: "flex",
    justifyContent: "center",
    alignItems: "center",

    gap: "18px",

    flexWrap: "wrap",
  },

  navButton: {
    minWidth: "110px",
    height: "46px",

    padding: "0 18px",

    borderRadius: "8px",
    border: "1px solid #89969c",

    background:
      "linear-gradient(180deg, #ffffff 0%, #eeeeee 100%)",

    boxShadow:
      "0 6px 0 #69767c, 0 8px 10px rgba(0,0,0,0.15)",

    color: "#073d5b",

    fontFamily: "inherit",
    fontSize: "15px",
    fontWeight: 700,

    cursor: "pointer",
  },

  laterButton: {
    minWidth: "210px",
    height: "46px",

    padding: "0 22px",

    borderRadius: "22px",
    border: "1px solid #87949a",

    background:
      "linear-gradient(180deg, #ffffff 0%, #ededed 100%)",

    boxShadow:
      "0 6px 0 #68757a, 0 8px 10px rgba(0,0,0,0.15)",

    color: "#073d5b",

    fontFamily: "inherit",
    fontSize: "15px",
    fontWeight: 700,

    cursor: "pointer",
  },

  messageBox: {
    maxWidth: "700px",
    margin: "100px auto",

    padding: "35px",

    borderRadius: "15px",

    background: "#ffffff",

    boxShadow:
      "0 8px 0 #738087, 0 15px 25px rgba(0,0,0,0.15)",

    textAlign: "center",

    fontSize: "22px",
    fontWeight: 700,
  },
};
