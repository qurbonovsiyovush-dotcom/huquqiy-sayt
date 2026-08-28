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
type Direction = "en-uz" | "uz-en";

export default function EnglishUzbekLearnPage() {
  const router = useRouter();

  const [words, setWords] = useState<DictionaryWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [mode, setMode] = useState<Mode>("en-uz");
  const [mixedDirection, setMixedDirection] =
    useState<Direction>("en-uz");

  const [index, setIndex] = useState(0);

  const [options, setOptions] = useState<string[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(
    null
  );

  const [difficultWords, setDifficultWords] = useState<Set<string>>(
    new Set()
  );

  // =========================================================
  // LUG‘ATNI YUKLASH
  // =========================================================

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

  const currentWord = words[index];

  const currentDirection: Direction = useMemo(() => {
    if (mode === "mixed") {
      return mixedDirection;
    }

    return mode;
  }, [mode, mixedDirection]);

  // =========================================================
  // JAVOB VARIANTLARINI YARATISH
  // =========================================================

  const createOptions = useCallback(() => {
    if (!currentWord || words.length === 0) return;

    let direction: Direction;

    if (mode === "mixed") {
      direction = Math.random() < 0.5 ? "en-uz" : "uz-en";
      setMixedDirection(direction);
    } else {
      direction = mode;
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
      setCorrectAnswer(correct);
      setOptions([correct]);
      setSelectedAnswer(null);
      return;
    }

    const wrong =
      wrongPool[Math.floor(Math.random() * wrongPool.length)];

    const generated =
      Math.random() < 0.5 ? [correct, wrong] : [wrong, correct];

    setCorrectAnswer(correct);
    setOptions(generated);
    setSelectedAnswer(null);
  }, [currentWord, words, mode]);

  useEffect(() => {
    if (currentWord && words.length > 0) {
      createOptions();
    }
  }, [currentWord, words.length, index, mode, createOptions]);

  // =========================================================
  // JAVOB TANLASH
  // =========================================================

  function handleAnswer(answer: string) {
    if (selectedAnswer !== null) return;

    setSelectedAnswer(answer);
  }

  // =========================================================
  // KEYINGI
  // =========================================================

  function nextWord() {
    if (words.length === 0) return;

    setIndex((prev) =>
      prev >= words.length - 1 ? 0 : prev + 1
    );

    setSelectedAnswer(null);
  }

  // =========================================================
  // OLDINGI
  // =========================================================

  function previousWord() {
    if (words.length === 0) return;

    setIndex((prev) =>
      prev <= 0 ? words.length - 1 : prev - 1
    );

    setSelectedAnswer(null);
  }

  // =========================================================
  // KEYINROQ YANA KO‘RSAT
  // =========================================================

  function showLater() {
    if (!currentWord || words.length < 2) return;

    setWords((prevWords) => {
      const copy = [...prevWords];

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

    setSelectedAnswer(null);
  }

  // =========================================================
  // QIYIN SO‘Z
  // =========================================================

  function toggleDifficult() {
    if (!currentWord) return;

    setDifficultWords((prev) => {
      const next = new Set(prev);

      if (next.has(currentWord.id)) {
        next.delete(currentWord.id);
      } else {
        next.add(currentWord.id);
      }

      return next;
    });
  }

  // =========================================================
  // TALAFFUZ
  // =========================================================

  function pronounce() {
    if (!currentWord) return;

    if (!("speechSynthesis" in window)) {
      alert(
        "Brauzeringiz talaffuz funksiyasini qo‘llab-quvvatlamaydi."
      );
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(
      currentWord.english
    );

    utterance.lang = "en-US";
    utterance.rate = 0.85;
    utterance.pitch = 1;

    window.speechSynthesis.speak(utterance);
  }

  const questionText = useMemo(() => {
    if (!currentWord) return "";

    return currentDirection === "en-uz"
      ? currentWord.english
      : currentWord.uzbek;
  }, [currentWord, currentDirection]);

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.messageBox}>
          Lug‘at yuklanmoqda...
        </div>
      </main>
    );
  }

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
      {/* =====================================================
          TEPADAGI 3D PANEL
      ===================================================== */}

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
              setSelectedAnswer(null);
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
              setSelectedAnswer(null);
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
              setSelectedAnswer(null);
            }}
          >
            Aralash
          </button>
        </div>

        <div style={styles.progress}>
          {index + 1} / {words.length}
        </div>
      </section>

      {/* =====================================================
          ASOSIY O‘RGANISH QISMI
      ===================================================== */}

      <section style={styles.studyArea}>
        {/* SAVOL */}

        <div style={styles.wordCard}>
          {questionText}
        </div>

        {/* TALAFFUZ + QIYIN SO‘Z */}

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

        {/* =================================================
            2 TA JAVOB
        ================================================= */}

        <div style={styles.answers}>
          {options.map((option) => {
            let optionStyle: React.CSSProperties = {
              ...styles.answerButton,
            };

            if (selectedAnswer !== null) {
              if (option === correctAnswer) {
                optionStyle = {
                  ...optionStyle,
                  ...styles.correctAnswer,
                };
              } else if (option === selectedAnswer) {
                optionStyle = {
                  ...optionStyle,
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

        {/* =================================================
            PASTKI NAVIGATSIYA
        ================================================= */}

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

// =========================================================
// 3D DESIGN
// =========================================================

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "36px 24px 80px",
    background:
      "radial-gradient(circle at top, #ffffff 0%, #f4f8fa 48%, #eaf2f6 100%)",
    fontFamily:
      '"Bell MT", "Times New Roman", Georgia, serif',
    color: "#063b5a",
  },

  topPanel: {
    width: "min(1090px, calc(100% - 20px))",
    margin: "0 auto",

    minHeight: "98px",
    padding: "17px 28px",

    display: "grid",
    gridTemplateColumns: "190px 1fr 130px",
    alignItems: "center",
    gap: "22px",

    border: "2px solid #075476",
    borderRadius: "20px",

    background:
      "linear-gradient(180deg, #82dcf7 0%, #56bce5 38%, #2f9ecb 78%, #208bb7 100%)",

    boxShadow:
      "0 10px 0 #07506c, 0 16px 23px rgba(0,0,0,0.20), inset 0 3px 3px rgba(255,255,255,0.85), inset 0 -3px 4px rgba(0,78,110,0.16)",
  },

  backButton: {
    minWidth: "165px",
    height: "46px",

    padding: "0 22px",

    borderRadius: "9px",
    border: "1px solid #7e8c94",

    background:
      "linear-gradient(180deg, #ffffff 0%, #f2f2f2 52%, #e4e4e4 100%)",

    boxShadow:
      "0 6px 0 #68757c, 0 8px 12px rgba(0,0,0,0.18), inset 0 1px 1px rgba(255,255,255,0.9)",

    fontFamily: "inherit",
    fontSize: "16px",
    fontWeight: 700,
    color: "#063b5b",

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
    minWidth: "155px",
    height: "46px",

    padding: "0 18px",

    borderRadius: "8px",
    border: "1px solid #839097",

    background:
      "linear-gradient(180deg, #ffffff 0%, #f1f1f1 50%, #dedede 100%)",

    boxShadow:
      "0 6px 0 #66757c, 0 8px 11px rgba(0,0,0,0.17), inset 0 1px 1px rgba(255,255,255,0.95)",

    fontFamily: "inherit",
    fontSize: "16px",
    fontWeight: 700,

    color: "#063a58",
    cursor: "pointer",
  },

  modeButtonActive: {
    color: "#ffffff",

    border: "1px solid #00517a",

    background:
      "linear-gradient(180deg, #5cd0f8 0%, #22a6df 47%, #0d7fb5 100%)",

    boxShadow:
      "0 6px 0 #064f70, 0 9px 13px rgba(0,0,0,0.22), inset 0 2px 2px rgba(255,255,255,0.4)",
  },

  progress: {
    justifySelf: "end",

    minWidth: "110px",

    textAlign: "center",

    fontFamily: "inherit",
    fontSize: "17px",
    fontWeight: 800,
    letterSpacing: "2px",

    color: "#043c5c",

    textShadow:
      "0 1px 0 rgba(255,255,255,0.65)",
  },

  studyArea: {
    width: "min(1050px, calc(100% - 20px))",
    margin: "50px auto 0",
  },

  wordCard: {
    width: "min(500px, 92%)",
    minHeight: "122px",

    margin: "0 auto",
    padding: "22px 32px",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    textAlign: "center",

    borderRadius: "16px",
    border: "2px solid #075274",

    background:
      "linear-gradient(180deg, #81dcf7 0%, #59bee6 40%, #2fa0cf 100%)",

    boxShadow:
      "0 9px 0 #07506d, 0 15px 22px rgba(0,0,0,0.21), inset 0 3px 3px rgba(255,255,255,0.75), inset 0 -3px 3px rgba(0,75,110,0.16)",

    color: "#062e49",

    fontFamily: "inherit",
    fontSize: "42px",
    fontWeight: 700,

    wordBreak: "break-word",
  },

  functionButtons: {
    marginTop: "30px",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    gap: "15px",
    flexWrap: "wrap",
  },

  smallButton: {
    minWidth: "122px",
    height: "45px",

    padding: "0 19px",

    border: "1px solid #858f95",
    borderRadius: "8px",

    background:
      "linear-gradient(180deg, #ffffff 0%, #f1f1f1 55%, #dedede 100%)",

    boxShadow:
      "0 6px 0 #67747a, 0 9px 12px rgba(0,0,0,0.18), inset 0 1px 1px rgba(255,255,255,0.9)",

    color: "#063b5a",

    fontFamily: "inherit",
    fontSize: "16px",
    fontWeight: 700,

    cursor: "pointer",
  },

  difficultActive: {
    background:
      "linear-gradient(180deg, #fff6b6 0%, #ffd95b 100%)",

    boxShadow:
      "0 6px 0 #b28c18, 0 9px 12px rgba(0,0,0,0.18)",
  },

  answers: {
    marginTop: "70px",

    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(280px, 1fr))",

    gap: "52px",
  },

  answerButton: {
    minHeight: "108px",

    padding: "22px 28px",

    borderRadius: "13px",
    border: "1px solid #90999e",

    background:
      "linear-gradient(180deg, #ffffff 0%, #f5f5f5 45%, #e8e8e8 100%)",

    boxShadow:
      "0 8px 0 #748087, 0 13px 18px rgba(0,0,0,0.19), inset 0 2px 2px rgba(255,255,255,0.9)",

    color: "#073951",

    fontFamily: "inherit",
    fontSize: "29px",
    fontWeight: 700,

    cursor: "pointer",

    transition:
      "transform 0.12s ease, box-shadow 0.12s ease",
  },

  correctAnswer: {
    border: "2px solid #16883a",

    background:
      "linear-gradient(180deg, #e3ffe8 0%, #a7e9b4 100%)",

    color: "#075d23",

    boxShadow:
      "0 8px 0 #418e53, 0 13px 18px rgba(0,0,0,0.17)",
  },

  wrongAnswer: {
    border: "2px solid #ae2828",

    background:
      "linear-gradient(180deg, #ffe8e8 0%, #eeaaaa 100%)",

    color: "#8c1616",

    boxShadow:
      "0 8px 0 #a04d4d, 0 13px 18px rgba(0,0,0,0.17)",
  },

  navigation: {
    marginTop: "50px",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    gap: "19px",
    flexWrap: "wrap",
  },

  navButton: {
    minWidth: "112px",
    height: "46px",

    padding: "0 18px",

    borderRadius: "8px",
    border: "1px solid #858f95",

    background:
      "linear-gradient(180deg, #ffffff 0%, #f2f2f2 52%, #e2e2e2 100%)",

    boxShadow:
      "0 6px 0 #66747a, 0 9px 12px rgba(0,0,0,0.17), inset 0 1px 1px rgba(255,255,255,0.9)",

    color: "#063b5a",

    fontFamily: "inherit",
    fontSize: "15px",
    fontWeight: 700,

    cursor: "pointer",
  },

  laterButton: {
    minWidth: "215px",
    height: "46px",

    padding: "0 22px",

    borderRadius: "22px",
    border: "1px solid #858f95",

    background:
      "linear-gradient(180deg, #ffffff 0%, #f2f2f2 52%, #e1e1e1 100%)",

    boxShadow:
      "0 6px 0 #66747a, 0 9px 12px rgba(0,0,0,0.18), inset 0 1px 1px rgba(255,255,255,0.9)",

    color: "#063b5a",

    fontFamily: "inherit",
    fontSize: "15px",
    fontWeight: 700,

    cursor: "pointer",
  },

  messageBox: {
    width: "min(700px, 92%)",
    margin: "110px auto",

    padding: "38px",

    borderRadius: "16px",
    border: "1px solid #9aa4a9",

    background:
      "linear-gradient(180deg, #ffffff 0%, #eeeeee 100%)",

    boxShadow:
      "0 9px 0 #718087, 0 16px 25px rgba(0,0,0,0.18)",

    textAlign: "center",

    fontFamily: "inherit",
    fontSize: "22px",
    fontWeight: 700,
  },
};
