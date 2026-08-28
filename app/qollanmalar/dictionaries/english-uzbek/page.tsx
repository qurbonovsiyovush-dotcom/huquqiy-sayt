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
  const [selectedAnswer, setSelectedAnswer] =
    useState<string | null>(null);

  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);

  const [difficultWords, setDifficultWords] =
    useState<Set<string>>(new Set());

  // =====================================================
  // LUG‘ATNI YUKLASH
  // =====================================================

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

  // =====================================================
  // JAVOB VARIANTLARI
  // =====================================================

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
      Math.random() < 0.5
        ? [correct, wrong]
        : [wrong, correct];

    setCorrectAnswer(correct);
    setOptions(generated);
    setSelectedAnswer(null);
  }, [currentWord, words, mode]);

  useEffect(() => {
    if (currentWord && words.length > 0) {
      createOptions();
    }
  }, [currentWord, words.length, index, mode, createOptions]);

  // =====================================================
  // JAVOB
  // =====================================================

  function handleAnswer(answer: string) {
    if (selectedAnswer !== null) return;

    setSelectedAnswer(answer);

    if (answer === correctAnswer) {
      setCorrectCount((prev) => prev + 1);
    } else {
      setWrongCount((prev) => prev + 1);
    }
  }

  // =====================================================
  // KEYINGI
  // =====================================================

  function nextWord() {
    if (words.length === 0) return;

    setIndex((prev) =>
      prev >= words.length - 1 ? 0 : prev + 1
    );

    setSelectedAnswer(null);
  }

  // =====================================================
  // OLDINGI
  // =====================================================

  function previousWord() {
    if (words.length === 0) return;

    setIndex((prev) =>
      prev <= 0 ? words.length - 1 : prev - 1
    );

    setSelectedAnswer(null);
  }

  // =====================================================
  // KEYINROQ
  // =====================================================

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
            Math.random() *
              (maxDistance - minDistance + 1)
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

  // =====================================================
  // QIYIN SO‘Z
  // =====================================================

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

  // =====================================================
  // TALAFFUZ
  // =====================================================

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

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <main className="page">
        <div className="messageBox">
          Lug‘at yuklanmoqda...
        </div>

        <style jsx>{css}</style>
      </main>
    );
  }

  if (error || words.length === 0) {
    return (
      <main className="page">
        <div className="messageBox">
          {error || "Lug‘atda so‘z mavjud emas."}
        </div>

        <style jsx>{css}</style>
      </main>
    );
  }

  return (
    <main className="page">
      {/* ================= TOP PANEL ================= */}

      <section className="topPanel">
        <button
          type="button"
          className="backButton"
          onClick={() =>
            router.push("/qollanmalar/dictionaries")
          }
        >
          ← Lug‘atlar
        </button>

        <div className="modeGroup">
          <button
            type="button"
            className={`modeButton ${
              mode === "en-uz" ? "activeMode" : ""
            }`}
            onClick={() => {
              setMode("en-uz");
              setSelectedAnswer(null);
            }}
          >
            English → Uzbek
          </button>

          <button
            type="button"
            className={`modeButton ${
              mode === "uz-en" ? "activeMode" : ""
            }`}
            onClick={() => {
              setMode("uz-en");
              setSelectedAnswer(null);
            }}
          >
            Uzbek → English
          </button>

          <button
            type="button"
            className={`modeButton ${
              mode === "mixed" ? "activeMode" : ""
            }`}
            onClick={() => {
              setMode("mixed");
              setSelectedAnswer(null);
            }}
          >
            Aralash
          </button>
        </div>

        <div className="progress">
          {index + 1} / {words.length}
        </div>
      </section>

      {/* ================= STUDY ================= */}

      <section className="studyArea">
        <div className="wordCard">
          {questionText}
        </div>

        {/* TALAFFUZ VA QIYIN SO‘Z */}

        <div className="functionButtons">
          <button
            type="button"
            className="smallButton"
            onClick={pronounce}
          >
            🔊 Talaffuz
          </button>

          <button
            type="button"
            className={`smallButton ${
              difficultWords.has(currentWord.id)
                ? "difficultActive"
                : ""
            }`}
            onClick={toggleDifficult}
          >
            {difficultWords.has(currentWord.id)
              ? "★ Qiyin so‘z"
              : "☆ Qiyin so‘z"}
          </button>
        </div>

        {/* ================= JAVOBLAR ================= */}

        <div className="answers">
          {options.map((option) => {
            let className = "answerButton";

            if (selectedAnswer !== null) {
              if (option === correctAnswer) {
                className += " correctAnswer";
              } else if (option === selectedAnswer) {
                className += " wrongAnswer";
              }
            }

            return (
              <button
                key={option}
                type="button"
                className={className}
                onClick={() => handleAnswer(option)}
              >
                {option}
              </button>
            );
          })}
        </div>

        {/* ================= KICHIK STATISTIKA ================= */}

        <div className="miniStats">
          <div className="miniStat correctStat">
            <span>✓</span>
            <span>To‘g‘ri</span>
            <strong>{correctCount}</strong>
          </div>

          <div className="miniStat wrongStat">
            <span>✕</span>
            <span>Xato</span>
            <strong>{wrongCount}</strong>
          </div>

          <button
            type="button"
            className="miniStat difficultStat"
            onClick={toggleDifficult}
          >
            <span>★</span>
            <span>Qiyin so‘z</span>
            <strong>{difficultWords.size}</strong>
          </button>
        </div>

        {/* ================= NAVIGATION ================= */}

        <div className="navigation">
          <button
            type="button"
            className="navButton"
            onClick={previousWord}
          >
            ← Oldingi
          </button>

          <button
            type="button"
            className="laterButton"
            onClick={showLater}
          >
            ↻ Keyinroq yana ko‘rsat
          </button>

          <button
            type="button"
            className="navButton"
            onClick={nextWord}
          >
            Keyingi →
          </button>
        </div>
      </section>

      <style jsx>{css}</style>
    </main>
  );
}

// =====================================================
// CSS
// =====================================================

const css = `
  .page {
    min-height: 100vh;
    padding: 36px 24px 80px;

    background:
      radial-gradient(
        circle at top,
        #ffffff 0%,
        #f4f8fa 48%,
        #eaf2f6 100%
      );

    font-family:
      "Bell MT",
      "Times New Roman",
      Georgia,
      serif;

    color: #063b5a;
  }

  button {
    font-family: inherit;
  }

  /* ================= TOP PANEL ================= */

  .topPanel {
    width: min(1090px, calc(100% - 20px));
    margin: 0 auto;

    min-height: 98px;
    padding: 17px 28px;

    display: grid;
    grid-template-columns: 190px 1fr 130px;
    align-items: center;
    gap: 22px;

    border: 2px solid #075476;
    border-radius: 20px;

    background:
      linear-gradient(
        180deg,
        #82dcf7 0%,
        #56bce5 38%,
        #2f9ecb 78%,
        #208bb7 100%
      );

    box-shadow:
      0 10px 0 #07506c,
      0 16px 23px rgba(0,0,0,.20),
      inset 0 3px 3px rgba(255,255,255,.85),
      inset 0 -3px 4px rgba(0,78,110,.16);
  }

  .backButton,
  .modeButton,
  .smallButton,
  .navButton,
  .laterButton {
    border: 1px solid #858f95;

    background:
      linear-gradient(
        180deg,
        #ffffff 0%,
        #f1f1f1 52%,
        #dedede 100%
      );

    color: #063b5a;

    font-weight: 700;

    cursor: pointer;

    box-shadow:
      0 6px 0 #66747a,
      0 9px 12px rgba(0,0,0,.17),
      inset 0 1px 1px rgba(255,255,255,.9);
  }

  .backButton {
    min-width: 165px;
    height: 46px;

    padding: 0 22px;

    border-radius: 9px;

    font-size: 16px;
  }

  .modeGroup {
    display: flex;
    align-items: center;
    justify-content: center;

    gap: 16px;
  }

  .modeButton {
    min-width: 155px;
    height: 46px;

    padding: 0 18px;

    border-radius: 8px;

    font-size: 16px;
  }

  .activeMode {
    color: white;

    border-color: #00517a;

    background:
      linear-gradient(
        180deg,
        #5cd0f8 0%,
        #22a6df 47%,
        #0d7fb5 100%
      );

    box-shadow:
      0 6px 0 #064f70,
      0 9px 13px rgba(0,0,0,.22),
      inset 0 2px 2px rgba(255,255,255,.4);
  }

  .progress {
    justify-self: end;

    min-width: 110px;

    text-align: center;

    font-size: 17px;
    font-weight: 800;

    letter-spacing: 2px;

    color: #043c5c;
  }

  /* ================= STUDY ================= */

  .studyArea {
    width: min(1050px, calc(100% - 20px));

    margin: 50px auto 0;
  }

  .wordCard {
    width: min(500px, 92%);
    min-height: 122px;

    margin: 0 auto;
    padding: 22px 32px;

    display: flex;
    align-items: center;
    justify-content: center;

    box-sizing: border-box;

    text-align: center;

    border-radius: 16px;
    border: 2px solid #075274;

    background:
      linear-gradient(
        180deg,
        #81dcf7 0%,
        #59bee6 40%,
        #2fa0cf 100%
      );

    box-shadow:
      0 9px 0 #07506d,
      0 15px 22px rgba(0,0,0,.21),
      inset 0 3px 3px rgba(255,255,255,.75),
      inset 0 -3px 3px rgba(0,75,110,.16);

    color: #062e49;

    font-size: 42px;
    font-weight: 700;

    overflow-wrap: anywhere;
  }

  .functionButtons {
    margin-top: 30px;

    display: flex;
    align-items: center;
    justify-content: center;

    gap: 15px;
  }

  .smallButton {
    min-width: 122px;
    height: 45px;

    padding: 0 19px;

    border-radius: 8px;

    font-size: 16px;
  }

  .difficultActive {
    background:
      linear-gradient(
        180deg,
        #fff6b6 0%,
        #ffd95b 100%
      );

    box-shadow:
      0 6px 0 #b28c18,
      0 9px 12px rgba(0,0,0,.18);
  }

  /* ================= ANSWERS ================= */

  .answers {
    margin-top: 70px;

    display: grid;
    grid-template-columns:
      repeat(2, minmax(280px, 1fr));

    gap: 52px;
  }

  .answerButton {
    min-height: 108px;

    padding: 22px 28px;

    border-radius: 13px;
    border: 1px solid #8c969b;

    /*
      OLDINGIDAN BIR OZ KULRANGROQ
    */
    background:
      linear-gradient(
        180deg,
        #eeeeee 0%,
        #e7e7e7 50%,
        #dcdcdc 100%
      );

    box-shadow:
      0 8px 0 #747f84,
      0 13px 18px rgba(0,0,0,.19),
      inset 0 2px 2px rgba(255,255,255,.85);

    color: #073951;

    font-size: 29px;
    font-weight: 700;

    cursor: pointer;

    transition:
      transform .12s ease,
      box-shadow .12s ease,
      background .15s ease;
  }

  .answerButton:hover {
    background:
      linear-gradient(
        180deg,
        #f2f2f2 0%,
        #e9e9e9 50%,
        #dedede 100%
      );
  }

  .correctAnswer {
    border: 2px solid #16883a;

    background:
      linear-gradient(
        180deg,
        #e3ffe8 0%,
        #a7e9b4 100%
      );

    color: #075d23;

    box-shadow:
      0 8px 0 #418e53,
      0 13px 18px rgba(0,0,0,.17);
  }

  .wrongAnswer {
    border: 2px solid #ae2828;

    background:
      linear-gradient(
        180deg,
        #ffe8e8 0%,
        #eeaaaa 100%
      );

    color: #8c1616;

    box-shadow:
      0 8px 0 #a04d4d,
      0 13px 18px rgba(0,0,0,.17);
  }

  /* ================= MINI STATS ================= */

  .miniStats {
    margin-top: 34px;

    display: flex;
    align-items: center;
    justify-content: center;

    gap: 14px;

    flex-wrap: wrap;
  }

  .miniStat {
    min-width: 118px;
    height: 40px;

    padding: 0 13px;

    box-sizing: border-box;

    display: flex;
    align-items: center;
    justify-content: center;

    gap: 7px;

    border-radius: 8px;

    font-size: 14px;
    font-weight: 700;

    box-shadow:
      0 4px 0 rgba(70,80,85,.55),
      0 7px 10px rgba(0,0,0,.12),
      inset 0 1px 1px rgba(255,255,255,.9);
  }

  .miniStat strong {
    font-size: 15px;
  }

  .correctStat {
    border: 1px solid #8dbd94;

    background:
      linear-gradient(
        180deg,
        #f5fff6 0%,
        #dceede 100%
      );

    color: #17622a;
  }

  .wrongStat {
    border: 1px solid #d4a0a0;

    background:
      linear-gradient(
        180deg,
        #fffafa 0%,
        #f1dddd 100%
      );

    color: #8d2424;
  }

  .difficultStat {
    border: 1px solid #d4b66e;

    background:
      linear-gradient(
        180deg,
        #fffdf5 0%,
        #f2e8c9 100%
      );

    color: #765512;

    cursor: pointer;

    font-family: inherit;
  }

  /* ================= NAVIGATION ================= */

  .navigation {
    margin-top: 38px;

    display: flex;
    align-items: center;
    justify-content: center;

    gap: 19px;

    flex-wrap: wrap;
  }

  .navButton {
    min-width: 112px;
    height: 46px;

    padding: 0 18px;

    border-radius: 8px;

    font-size: 15px;
  }

  .laterButton {
    min-width: 215px;
    height: 46px;

    padding: 0 22px;

    border-radius: 22px;

    font-size: 15px;
  }

  .messageBox {
    width: min(700px, 92%);

    margin: 110px auto;

    padding: 38px;

    box-sizing: border-box;

    border-radius: 16px;
    border: 1px solid #9aa4a9;

    background:
      linear-gradient(
        180deg,
        #ffffff 0%,
        #eeeeee 100%
      );

    box-shadow:
      0 9px 0 #718087,
      0 16px 25px rgba(0,0,0,.18);

    text-align: center;

    font-size: 22px;
    font-weight: 700;
  }

  /* =====================================================
     TELEFON
  ===================================================== */

  @media (max-width: 760px) {
    .page {
      padding:
        18px 10px
        calc(45px + env(safe-area-inset-bottom));
    }

    .topPanel {
      width: 100%;
      min-height: auto;

      box-sizing: border-box;

      padding: 14px;

      display: flex;
      flex-direction: column;

      gap: 14px;

      border-radius: 16px;
    }

    .backButton {
      min-width: 0;
      width: 150px;
      height: 42px;

      order: 3;
    }

    .modeGroup {
      width: 100%;

      display: grid;
      grid-template-columns: 1fr 1fr;

      gap: 9px;

      order: 1;
    }

    .modeButton {
      min-width: 0;
      width: 100%;

      height: 42px;

      padding: 0 7px;

      font-size: 13px;
    }

    .modeButton:last-child {
      grid-column: 1 / -1;

      width: 50%;

      justify-self: center;
    }

    .progress {
      min-width: 0;

      justify-self: auto;

      order: 2;

      font-size: 15px;
    }

    .studyArea {
      width: 100%;

      margin-top: 38px;
    }

    .wordCard {
      width: 94%;
      min-height: 105px;

      padding: 18px 16px;

      font-size: clamp(29px, 9vw, 38px);
    }

    .functionButtons {
      margin-top: 26px;

      gap: 10px;

      flex-wrap: wrap;
    }

    .smallButton {
      min-width: 0;

      height: 42px;

      padding: 0 13px;

      font-size: 14px;
    }

    .answers {
      margin-top: 48px;

      grid-template-columns: 1fr;

      gap: 22px;
    }

    .answerButton {
      width: 100%;
      min-height: 88px;

      padding: 18px 15px;

      font-size: 24px;
    }

    .miniStats {
      width: 100%;

      margin-top: 30px;

      display: grid;
      grid-template-columns:
        repeat(3, minmax(0, 1fr));

      gap: 8px;
    }

    .miniStat {
      min-width: 0;
      width: 100%;
      height: 42px;

      padding: 0 5px;

      gap: 4px;

      font-size: 11px;

      white-space: nowrap;
    }

    .miniStat strong {
      font-size: 12px;
    }

    .navigation {
      width: 100%;

      margin-top: 34px;

      display: grid;
      grid-template-columns: 1fr 1fr;

      gap: 13px;
    }

    .navButton {
      min-width: 0;
      width: 100%;

      padding: 0 8px;

      font-size: 13px;
    }

    .laterButton {
      grid-column: 1 / -1;

      grid-row: 1;

      min-width: 0;
      width: min(240px, 100%);

      justify-self: center;

      padding: 0 12px;

      font-size: 13px;
    }
  }

  /* JUDA KICHIK TELEFON */

  @media (max-width: 390px) {
    .page {
      padding-left: 7px;
      padding-right: 7px;
    }

    .topPanel {
      padding: 12px 9px;
    }

    .modeButton {
      font-size: 12px;
    }

    .wordCard {
      font-size: 29px;
    }

    .answerButton {
      font-size: 22px;
    }

    .miniStat {
      font-size: 10px;
    }

    .miniStat strong {
      font-size: 11px;
    }
  }
`;
