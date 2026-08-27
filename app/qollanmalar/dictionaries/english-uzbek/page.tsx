"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "en-uz" | "uz-en" | "mixed";

type WordItem = {
  id: number;
  english: string;
  uzbek: string;
};

/*
  MUHIM:
  Bu DEMO so'zlar.
  Keyingi bosqichda bularni olib tashlab,
  2700+ ta so'zni API/bazadan olamiz.
*/
const DEMO_WORDS: WordItem[] = [
  { id: 1, english: "plate", uzbek: "tarelka" },
  { id: 2, english: "name", uzbek: "ism, nom" },
  { id: 3, english: "place", uzbek: "joy" },
  { id: 4, english: "table", uzbek: "stol, jadval" },
  { id: 5, english: "clever", uzbek: "aqlli, ziyrak" },
  { id: 6, english: "safe", uzbek: "xavfsiz" },
  { id: 7, english: "promise", uzbek: "va'da bermoq" },
  { id: 8, english: "reply", uzbek: "javob bermoq" },
  { id: 9, english: "hide", uzbek: "yashirmoq" },
  { id: 10, english: "hunt", uzbek: "ov qilmoq" },
];

function shuffle<T>(array: T[]): T[] {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

export default function EnglishUzbekLearnPage() {
  const router = useRouter();

  const [words] = useState<WordItem[]>(DEMO_WORDS);
  const [mode, setMode] = useState<Mode>("en-uz");
  const [index, setIndex] = useState(0);

  const [options, setOptions] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [wrongWords, setWrongWords] = useState<number[]>([]);
  const [hardWords, setHardWords] = useState<number[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);

  const current = words[index];

  const effectiveMode = useMemo<"en-uz" | "uz-en">(() => {
    if (mode !== "mixed") return mode;

    return index % 2 === 0 ? "en-uz" : "uz-en";
  }, [mode, index]);

  const question = useMemo(() => {
    if (!current) return "";

    return effectiveMode === "en-uz"
      ? current.english
      : current.uzbek;
  }, [current, effectiveMode]);

  const correctAnswer = useMemo(() => {
    if (!current) return "";

    return effectiveMode === "en-uz"
      ? current.uzbek
      : current.english;
  }, [current, effectiveMode]);

  useEffect(() => {
    if (!current || words.length === 0) return;

    const pool = words
      .filter((word) => word.id !== current.id)
      .map((word) =>
        effectiveMode === "en-uz"
          ? word.uzbek
          : word.english
      );

    const wrongOption =
      pool[Math.floor(Math.random() * pool.length)];

    setOptions(shuffle([correctAnswer, wrongOption]));
    setSelected(null);
  }, [current, effectiveMode, correctAnswer, words]);

  function changeMode(newMode: Mode) {
    setMode(newMode);
    setIndex(0);
    setSelected(null);
    setCorrectCount(0);
    setWrongCount(0);
  }

  function nextWord() {
    setSelected(null);

    if (index < words.length - 1) {
      setIndex((old) => old + 1);
    } else {
      setIndex(0);
    }
  }

  function previousWord() {
    setSelected(null);

    if (index > 0) {
      setIndex((old) => old - 1);
    } else {
      setIndex(words.length - 1);
    }
  }

  function chooseAnswer(answer: string) {
    if (selected) return;

    setSelected(answer);

    if (answer === correctAnswer) {
      setCorrectCount((old) => old + 1);

      window.setTimeout(() => {
        nextWord();
      }, 650);
    } else {
      setWrongCount((old) => old + 1);

      if (!wrongWords.includes(current.id)) {
        setWrongWords((old) => [...old, current.id]);
      }
    }
  }

  function toggleHardWord() {
    if (!current) return;

    setHardWords((old) => {
      if (old.includes(current.id)) {
        return old.filter((id) => id !== current.id);
      }

      return [...old, current.id];
    });
  }

  function showLater() {
    if (!wrongWords.includes(current.id)) {
      setWrongWords((old) => [...old, current.id]);
    }

    nextWord();
  }

  function speakWord() {
    if (typeof window === "undefined") return;

    window.speechSynthesis.cancel();

    const text =
      effectiveMode === "en-uz"
        ? current.english
        : current.english;

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = "en-US";
    utterance.rate = 0.82;

    window.speechSynthesis.speak(utterance);
  }

  const isHard = current
    ? hardWords.includes(current.id)
    : false;

  if (!current) {
    return (
      <main className="page">
        <div className="empty">
          Lug‘atda hozircha so‘z mavjud emas.
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      {/* YUQORI PANEL */}
      <section className="topPanel">
        <button
          className="small3d gray"
          onClick={() =>
            router.push("/qollanmalar/dictionaries")
          }
        >
          ← Lug‘atlar
        </button>

        <div className="modeArea">
          <button
            className={`modeButton ${
              mode === "en-uz" ? "active" : ""
            }`}
            onClick={() => changeMode("en-uz")}
          >
            English → Uzbek
          </button>

          <button
            className={`modeButton ${
              mode === "uz-en" ? "active" : ""
            }`}
            onClick={() => changeMode("uz-en")}
          >
            Uzbek → English
          </button>

          <button
            className={`modeButton ${
              mode === "mixed" ? "active" : ""
            }`}
            onClick={() => changeMode("mixed")}
          >
            Aralash
          </button>
        </div>

        <div className="counter">
          {index + 1} / {words.length}
        </div>
      </section>

      {/* STATISTIKA */}
      <section className="stats">
        <div>
          <strong>{words.length}</strong>
          <span>Jami so‘z</span>
        </div>

        <div>
          <strong>{correctCount}</strong>
          <span>To‘g‘ri</span>
        </div>

        <div>
          <strong>{wrongCount}</strong>
          <span>Xato</span>
        </div>

        <div>
          <strong>{hardWords.length}</strong>
          <span>Qiyin so‘z</span>
        </div>
      </section>

      {/* ASOSIY SO'Z */}
      <section className="questionCard">
        {question}
      </section>

      {/* TALAFFUZ / QIYIN */}
      <div className="actionRow">
        <button
          className="small3d gray"
          onClick={speakWord}
        >
          🔊 Talaffuz
        </button>

        <button
          className={`small3d ${
            isHard ? "hardActive" : "gray"
          }`}
          onClick={toggleHardWord}
        >
          {isHard ? "★ Qiyin so‘z" : "☆ Qiyin so‘z"}
        </button>
      </div>

      {/* JAVOB VARIANTLARI */}
      <section className="answers">
        {options.map((option) => {
          let answerClass = "";

          if (selected) {
            if (option === correctAnswer) {
              answerClass = "correct";
            } else if (option === selected) {
              answerClass = "wrong";
            }
          }

          return (
            <button
              key={option}
              className={`answerCard ${answerClass}`}
              onClick={() => chooseAnswer(option)}
            >
              {option}
            </button>
          );
        })}
      </section>

      {/* XATO BO'LGANDA */}
      {selected && selected !== correctAnswer && (
        <div className="feedback wrongText">
          ✕ Noto‘g‘ri. To‘g‘ri javob:{" "}
          <strong>{correctAnswer}</strong>
        </div>
      )}

      {/* PASTKI TUGMALAR */}
      <div className="bottomActions">
        <button
          className="navButton"
          onClick={previousWord}
        >
          ← Oldingi
        </button>

        <button
          className="laterButton"
          onClick={showLater}
        >
          ↻ Keyinroq yana ko‘rsat
        </button>

        <button
          className="navButton"
          onClick={nextWord}
        >
          Keyingi →
        </button>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        :global(body) {
          margin: 0;
          background: #f4f6f7;
        }

        button {
          font-family: "Bell MT", Georgia, serif;
        }

        .page {
          min-height: 100vh;
          padding: 35px 30px 80px;
          font-family: "Bell MT", Georgia, serif;

          background:
            radial-gradient(
              circle at top,
              #ffffff 0%,
              #f6f8f9 45%,
              #e8eef1 100%
            );

          color: #062f4b;
        }

        /* =========================
           TOP PANEL
        ========================= */

        .topPanel {
          width: min(1160px, 100%);
          min-height: 125px;

          margin: 0 auto 35px;
          padding: 22px 28px;

          display: grid;
          grid-template-columns: 180px 1fr 120px;
          align-items: center;
          gap: 20px;

          border: 3px solid #12445f;
          border-radius: 24px;

          background:
            linear-gradient(
              180deg,
              #9be4ff 0%,
              #73c8ee 16%,
              #55afe0 62%,
              #3d98c8 100%
            );

          box-shadow:
            inset 0 4px 3px rgba(255,255,255,.75),
            inset 0 -7px 8px rgba(0,70,110,.22),
            0 9px 0 #164b66,
            0 16px 25px rgba(0,0,0,.23);
        }

        .modeArea {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 14px;
        }

        .modeButton {
          min-width: 145px;
          height: 46px;
          padding: 0 18px;

          border: 2px solid #626b70;
          border-radius: 9px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #f4f4f4 48%,
              #d6d6d6 100%
            );

          box-shadow:
            inset 0 3px 2px white,
            0 5px 0 #5a6266,
            0 8px 11px rgba(0,0,0,.18);

          color: #102e40;
          font-weight: 900;
          cursor: pointer;
        }

        .modeButton.active {
          border-color: #0b5278;

          background:
            linear-gradient(
              180deg,
              #d8f6ff 0%,
              #99dcf7 25%,
              #58b7e2 70%,
              #3294c3 100%
            );

          box-shadow:
            inset 0 3px 2px white,
            0 5px 0 #164e6b,
            0 8px 12px rgba(0,0,0,.2);
        }

        .counter {
          text-align: right;
          font-size: 18px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        /* =========================
           3D TUGMALAR
        ========================= */

        .small3d {
          min-height: 46px;
          padding: 8px 18px;

          border: 2px solid #596368;
          border-radius: 9px;

          font-size: 15px;
          font-weight: 900;

          cursor: pointer;

          transition:
            transform .12s ease,
            box-shadow .12s ease;
        }

        .gray {
          color: #182c38;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #f2f2f2 50%,
              #d2d2d2 100%
            );

          box-shadow:
            inset 0 3px 2px white,
            0 5px 0 #5a6266,
            0 8px 12px rgba(0,0,0,.18);
        }

        .small3d:active,
        .modeButton:active,
        .navButton:active,
        .laterButton:active {
          transform: translateY(4px);
          box-shadow: none;
        }

        .hardActive {
          color: #684600;
          border-color: #b37a00;

          background:
            linear-gradient(
              180deg,
              #fff9d5,
              #ffd86b
            );

          box-shadow:
            inset 0 3px 2px white,
            0 5px 0 #a16d00,
            0 8px 12px rgba(0,0,0,.18);
        }

        /* =========================
           STATISTIKA
        ========================= */

        .stats {
          width: min(900px, 100%);
          margin: 0 auto 30px;

          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        .stats > div {
          min-height: 72px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          border: 2px solid #c9cfd2;
          border-radius: 12px;

          background:
            linear-gradient(
              180deg,
              #ffffff,
              #e7e7e7
            );

          box-shadow:
            0 5px 0 #747d81,
            0 9px 13px rgba(0,0,0,.12);
        }

        .stats strong {
          font-size: 23px;
          color: #05649a;
        }

        .stats span {
          margin-top: 3px;
          font-size: 13px;
          font-weight: 900;
          color: #3b454a;
        }

        /* =========================
           SO'Z KARTASI
        ========================= */

        .questionCard {
          width: min(500px, 92%);
          min-height: 115px;

          margin: 35px auto 28px;
          padding: 20px;

          display: flex;
          align-items: center;
          justify-content: center;

          text-align: center;

          border: 3px solid #164d69;
          border-radius: 18px;

          background:
            linear-gradient(
              180deg,
              #a5e5ff 0%,
              #70c5ed 18%,
              #54addc 65%,
              #4197c4 100%
            );

          box-shadow:
            inset 0 4px 3px rgba(255,255,255,.8),
            inset 0 -6px 6px rgba(0,60,100,.22),
            0 8px 0 #1d536c,
            0 14px 20px rgba(0,0,0,.22);

          color: #061b29;
          font-size: clamp(28px, 4vw, 42px);
          font-weight: 900;
          text-transform: none;
        }

        .actionRow {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 16px;

          margin-bottom: 65px;
        }

        /* =========================
           JAVOBLAR
        ========================= */

        .answers {
          width: min(1050px, 100%);
          margin: 0 auto;

          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 55px;
        }

        .answerCard {
          min-height: 110px;
          padding: 18px 25px;

          border: 2px solid #667075;
          border-radius: 17px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #f4f4f4 25%,
              #dedede 65%,
              #c8c8c8 100%
            );

          box-shadow:
            inset 0 4px 3px white,
            inset 0 -5px 6px rgba(0,0,0,.08),
            0 8px 0 #5d666a,
            0 13px 18px rgba(0,0,0,.2);

          font-size: clamp(22px, 3vw, 31px);
          font-weight: 900;

          cursor: pointer;

          transition:
            transform .12s ease,
            box-shadow .12s ease;
        }

        .answerCard:hover {
          transform: translateY(-2px);
        }

        .answerCard.correct {
          border-color: #258348;

          background:
            linear-gradient(
              180deg,
              #effff3,
              #bcefc8,
              #83d89a
            );

          box-shadow:
            inset 0 4px 3px white,
            0 8px 0 #31804a,
            0 13px 18px rgba(0,0,0,.18);

          color: #125c2a;
        }

        .answerCard.wrong {
          border-color: #b82e2e;

          background:
            linear-gradient(
              180deg,
              #fff4f4,
              #ffc4c4,
              #ed8888
            );

          box-shadow:
            inset 0 4px 3px white,
            0 8px 0 #9c3434,
            0 13px 18px rgba(0,0,0,.18);

          color: #7a1010;
        }

        /* =========================
           FEEDBACK
        ========================= */

        .feedback {
          width: min(700px, 95%);
          margin: 30px auto 0;
          padding: 15px 20px;

          text-align: center;

          border-radius: 12px;

          font-size: 17px;
          font-weight: 900;
        }

        .wrongText {
          border: 2px solid #d58282;
          background: #fff0f0;
          color: #8b1d1d;
        }

        /* =========================
           PASTKI TUGMALAR
        ========================= */

        .bottomActions {
          width: min(850px, 100%);
          margin: 45px auto 0;

          display: flex;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
          gap: 18px;
        }

        .navButton,
        .laterButton {
          min-height: 47px;
          padding: 10px 22px;

          border-radius: 22px;
          border: 1px solid #777;

          background:
            linear-gradient(
              180deg,
              white,
              #e5e5e5
            );

          box-shadow:
            0 4px 0 #777,
            0 7px 10px rgba(0,0,0,.12);

          font-size: 15px;
          font-weight: 900;
          cursor: pointer;
        }

        .laterButton {
          min-width: 210px;
        }

        .empty {
          max-width: 600px;
          margin: 100px auto;
          padding: 40px;
          text-align: center;
          background: white;
          border-radius: 20px;
          font-size: 22px;
          font-weight: 900;
        }

        /* =========================
           TELEFON
        ========================= */

        @media (max-width: 760px) {
          .page {
            padding: 20px 12px 60px;
          }

          .topPanel {
            grid-template-columns: 1fr;
            text-align: center;
          }

          .counter {
            text-align: center;
          }

          .modeArea {
            flex-direction: column;
          }

          .modeButton {
            width: 100%;
          }

          .stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .answers {
            grid-template-columns: 1fr;
            gap: 25px;
          }

          .actionRow {
            margin-bottom: 40px;
          }

          .answerCard {
            min-height: 90px;
          }

          .bottomActions {
            flex-direction: column;
          }

          .navButton,
          .laterButton {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}
