"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type SynonymItem = {
  id: string | number;
  word: string;
  uzbek: string;
  synonym: string;
  synonymUzbek?: string | null;
  wordOrder?: number;
};

type Mode =
  | "learn"
  | "choose"
  | "write"
  | "mistakes"
  | "hard"
  | "mixed";

type AnswerState = "idle" | "correct" | "wrong";

const MISTAKES_KEY = "qurbonov_synonyms_mistakes";
const HARD_KEY = "qurbonov_synonyms_hard";

function normalize(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/\s+/g, " ");
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function readIds(key: string): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];

    return Array.isArray(parsed)
      ? parsed.map(String)
      : [];
  } catch {
    return [];
  }
}

export default function SynonymsPage() {
  const router = useRouter();

  const [items, setItems] = useState<SynonymItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [mode, setMode] = useState<Mode>("learn");
  const [index, setIndex] = useState(0);

  const [mistakeIds, setMistakeIds] = useState<string[]>([]);
  const [hardIds, setHardIds] = useState<string[]>([]);

  const [options, setOptions] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [answerState, setAnswerState] =
    useState<AnswerState>("idle");

  const [writtenAnswer, setWrittenAnswer] = useState("");

  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);

  useEffect(() => {
    setMistakeIds(readIds(MISTAKES_KEY));
    setHardIds(readIds(HARD_KEY));
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setLoadError("");

        const response = await fetch(
          "/api/dictionary/synonyms",
          {
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok || !data?.success) {
          throw new Error(
            data?.message ||
              "Sinonimlarni yuklab bo‘lmadi."
          );
        }

        if (!active) return;

        const rows = Array.isArray(data.synonyms)
          ? data.synonyms
          : [];

        setItems(rows);
      } catch (error) {
        if (!active) return;

        setLoadError(
          error instanceof Error
            ? error.message
            : "Ma’lumotlarni yuklashda xatolik."
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const activeItems = useMemo(() => {
    if (mode === "mistakes") {
      return items.filter((item) =>
        mistakeIds.includes(String(item.id))
      );
    }

    if (mode === "hard") {
      return items.filter((item) =>
        hardIds.includes(String(item.id))
      );
    }

    return items;
  }, [items, mistakeIds, hardIds, mode]);

  const current =
    activeItems.length > 0
      ? activeItems[
          Math.min(index, activeItems.length - 1)
        ]
      : null;

  const isHard = current
    ? hardIds.includes(String(current.id))
    : false;

  const saveMistakes = useCallback(
    (next: string[]) => {
      setMistakeIds(next);

      if (typeof window !== "undefined") {
        localStorage.setItem(
          MISTAKES_KEY,
          JSON.stringify(next)
        );
      }
    },
    []
  );

  const saveHard = useCallback(
    (next: string[]) => {
      setHardIds(next);

      if (typeof window !== "undefined") {
        localStorage.setItem(
          HARD_KEY,
          JSON.stringify(next)
        );
      }
    },
    []
  );

  function addMistake(id: string | number) {
    const value = String(id);

    if (mistakeIds.includes(value)) return;

    saveMistakes([...mistakeIds, value]);
  }

  function removeMistake(id: string | number) {
    const value = String(id);

    saveMistakes(
      mistakeIds.filter((item) => item !== value)
    );
  }

  function toggleHard() {
    if (!current) return;

    const value = String(current.id);

    if (hardIds.includes(value)) {
      saveHard(
        hardIds.filter((item) => item !== value)
      );
    } else {
      saveHard([...hardIds, value]);
    }
  }

  const createOptions = useCallback(
    (question: SynonymItem) => {
      const distractors = shuffle(
        items
          .filter(
            (item) =>
              String(item.id) !== String(question.id) &&
              normalize(item.synonym) !==
                normalize(question.synonym)
          )
          .map((item) => item.synonym)
      );

      const unique = Array.from(
        new Set(distractors)
      ).slice(0, 3);

      setOptions(
        shuffle([question.synonym, ...unique])
      );

      setSelected("");
      setAnswerState("idle");
    },
    [items]
  );

  useEffect(() => {
    if (!current) {
      setOptions([]);
      return;
    }

    if (
      mode === "choose" ||
      mode === "mistakes" ||
      mode === "hard"
    ) {
      createOptions(current);
    } else {
      setSelected("");
      setAnswerState("idle");
    }

    setWrittenAnswer("");
  }, [current?.id, mode, createOptions]);

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setIndex(0);
    setSelected("");
    setWrittenAnswer("");
    setAnswerState("idle");
  }

  function previous() {
    if (!activeItems.length) return;

    setIndex((value) =>
      value <= 0
        ? activeItems.length - 1
        : value - 1
    );
  }

  function next() {
    if (!activeItems.length) return;

    setIndex((value) =>
      value >= activeItems.length - 1
        ? 0
        : value + 1
    );
  }

  function randomNext() {
    if (activeItems.length <= 1) return;

    let nextIndex = index;

    while (nextIndex === index) {
      nextIndex = Math.floor(
        Math.random() * activeItems.length
      );
    }

    setIndex(nextIndex);
  }

  function chooseAnswer(answer: string) {
    if (!current || answerState !== "idle") {
      return;
    }

    setSelected(answer);

    if (
      normalize(answer) ===
      normalize(current.synonym)
    ) {
      setAnswerState("correct");
      setCorrectCount((value) => value + 1);
      removeMistake(current.id);
    } else {
      setAnswerState("wrong");
      setWrongCount((value) => value + 1);
      addMistake(current.id);
    }
  }

  function checkWrittenAnswer() {
    if (!current || !writtenAnswer.trim()) {
      return;
    }

    if (
      normalize(writtenAnswer) ===
      normalize(current.synonym)
    ) {
      setAnswerState("correct");
      setCorrectCount((value) => value + 1);
      removeMistake(current.id);
    } else {
      setAnswerState("wrong");
      setWrongCount((value) => value + 1);
      addMistake(current.id);
    }
  }

  function mixedAction() {
    randomNext();
  }

  const progress =
    activeItems.length > 0
      ? ((index + 1) / activeItems.length) * 100
      : 0;

  if (loading) {
    return (
      <main className="statePage">
        <div className="stateBox">
          Sinonimlar yuklanmoqda...
        </div>

        <style jsx>{`
          .statePage {
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: #e7ecef;
            font-family: "Bell MT",
              "Times New Roman", serif;
          }

          .stateBox {
            padding: 25px 35px;
            border: 2px solid #3b454b;
            border-radius: 16px;
            background: white;
            font-size: 21px;
            font-weight: 900;
            box-shadow: 0 7px 0 #596267;
          }
        `}</style>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="statePage">
        <div className="stateBox">
          {loadError}
        </div>

        <style jsx>{`
          .statePage {
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: #e7ecef;
            font-family: "Bell MT",
              "Times New Roman", serif;
          }

          .stateBox {
            padding: 25px 35px;
            color: #7b1616;
            border: 2px solid #b45d5d;
            border-radius: 16px;
            background: #fff0f0;
            font-size: 19px;
            font-weight: 900;
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="topbar">
        <button
          type="button"
          className="metalButton"
          onClick={() => router.push("/dictionaries")}
        >
          ← Lug‘atlar
        </button>

        <div className="brand">
          <span>QURBONOV.UZ</span>
          <strong>Synonyms</strong>
          <small>Sinonimlarni yodlash</small>
        </div>

        <button
          type="button"
          className="blueButton"
          onClick={() => router.push("/")}
        >
          Bosh sahifa
        </button>
      </header>

      <section className="mainPanel">
        <div className="floatingTitle">
          Synonyms
        </div>

        <div className="tabs">
          <button
            className={
              mode === "learn" ? "tab active" : "tab"
            }
            onClick={() => changeMode("learn")}
          >
            O‘rganish
          </button>

          <button
            className={
              mode === "choose"
                ? "tab active"
                : "tab"
            }
            onClick={() => changeMode("choose")}
          >
            Tanlash
          </button>

          <button
            className={
              mode === "write" ? "tab active" : "tab"
            }
            onClick={() => changeMode("write")}
          >
            Yozish
          </button>

          <button
            className={
              mode === "mistakes"
                ? "tab active"
                : "tab"
            }
            onClick={() => changeMode("mistakes")}
          >
            Xatolarim
            <span>{mistakeIds.length}</span>
          </button>

          <button
            className={
              mode === "hard" ? "tab active" : "tab"
            }
            onClick={() => changeMode("hard")}
          >
            ★ Qiyinlar
            <span>{hardIds.length}</span>
          </button>

          <button
            className={
              mode === "mixed" ? "tab active" : "tab"
            }
            onClick={() => changeMode("mixed")}
          >
            Aralash
          </button>
        </div>

        <div className="stats">
          <div>
            <span>Jami</span>
            <strong>{items.length}</strong>
          </div>

          <div>
            <span>To‘g‘ri</span>
            <strong>{correctCount}</strong>
          </div>

          <div>
            <span>Xato</span>
            <strong>{wrongCount}</strong>
          </div>

          <div>
            <span>Qiyinlar</span>
            <strong>{hardIds.length}</strong>
          </div>
        </div>

        {current ? (
          <>
            <div className="progressBox">
              <div className="progressText">
                <strong>
                  {index + 1} / {activeItems.length}
                </strong>

                <span>
                  {Math.round(progress)}%
                </span>
              </div>

              <div className="progressTrack">
                <div
                  className="progressFill"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>
            </div>

            <article className="studyCard">
              <button
                type="button"
                className={
                  isHard
                    ? "starButton starred"
                    : "starButton"
                }
                onClick={toggleHard}
                title="Qiyin so‘z sifatida belgilash"
              >
                ★
              </button>

              <div className="word">
                {current.word}
              </div>

              <div className="translation">
                {current.uzbek}
              </div>

              {mode === "learn" && (
                <div className="learnArea">
                  <div className="label">
                    Sinonimi
                  </div>

                  <div className="synonymWord">
                    {current.synonym}
                  </div>

                  {current.synonymUzbek && (
                    <div className="synonymTranslation">
                      {current.synonymUzbek}
                    </div>
                  )}
                </div>
              )}

              {(mode === "choose" ||
                mode === "mistakes" ||
                mode === "hard") && (
                <div className="quizArea">
                  <div className="question">
                    Qaysi biri{" "}
                    <strong>{current.word}</strong>{" "}
                    so‘zining sinonimi?
                  </div>

                  <div className="options">
                    {options.map((option) => {
                      let className = "option";

                      if (
                        answerState !== "idle" &&
                        normalize(option) ===
                          normalize(current.synonym)
                      ) {
                        className += " correct";
                      } else if (
                        answerState === "wrong" &&
                        selected === option
                      ) {
                        className += " wrong";
                      }

                      return (
                        <button
                          type="button"
                          key={option}
                          className={className}
                          disabled={
                            answerState !== "idle"
                          }
                          onClick={() =>
                            chooseAnswer(option)
                          }
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>

                  {answerState === "correct" && (
                    <div className="correctMessage">
                      To‘g‘ri! ✓
                    </div>
                  )}

                  {answerState === "wrong" && (
                    <div className="wrongMessage">
                      To‘g‘ri javob:{" "}
                      <strong>
                        {current.synonym}
                      </strong>
                    </div>
                  )}
                </div>
              )}

              {mode === "write" && (
                <div className="writeArea">
                  <div className="question">
                    <strong>{current.word}</strong>{" "}
                    so‘zining sinonimini yozing:
                  </div>

                  <div className="writeRow">
                    <input
                      value={writtenAnswer}
                      disabled={
                        answerState !== "idle"
                      }
                      onChange={(event) =>
                        setWrittenAnswer(
                          event.target.value
                        )
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          checkWrittenAnswer();
                        }
                      }}
                      placeholder="Sinonimni yozing..."
                      autoComplete="off"
                    />

                    <button
                      type="button"
                      className="blueButton checkButton"
                      onClick={checkWrittenAnswer}
                      disabled={
                        !writtenAnswer.trim() ||
                        answerState !== "idle"
                      }
                    >
                      Tekshirish
                    </button>
                  </div>

                  {answerState === "correct" && (
                    <div className="correctMessage">
                      To‘g‘ri! ✓
                    </div>
                  )}

                  {answerState === "wrong" && (
                    <div className="wrongMessage">
                      To‘g‘ri javob:{" "}
                      <strong>
                        {current.synonym}
                      </strong>
                    </div>
                  )}
                </div>
              )}

              {mode === "mixed" && (
                <div className="learnArea">
                  <div className="label">
                    Sinonimi
                  </div>

                  <div className="synonymWord">
                    {current.synonym}
                  </div>

                  <button
                    type="button"
                    className="blueButton mixButton"
                    onClick={mixedAction}
                  >
                    Tasodifiy keyingi so‘z
                  </button>
                </div>
              )}
            </article>

            <div className="navigation">
              <button
                type="button"
                className="metalButton navButton"
                onClick={previous}
              >
                ← Oldingi
              </button>

              <button
                type="button"
                className="blueButton navButton"
                onClick={next}
              >
                Keyingi →
              </button>
            </div>
          </>
        ) : (
          <div className="emptyBox">
            {mode === "mistakes"
              ? "Hozircha xato qilingan so‘zlar yo‘q."
              : mode === "hard"
                ? "Hozircha qiyin so‘zlar belgilanmagan."
                : "Sinonimlar topilmadi."}
          </div>
        )}
      </section>

      <style jsx>{`
        :global(*) {
          box-sizing: border-box;
        }

        :global(body) {
          margin: 0;
        }

        button,
        input {
          font-family: inherit;
        }

        .page {
          min-height: 100vh;
          padding: 26px 18px 70px;
          font-family: "Bell MT",
            "Times New Roman", serif;
          color: #111820;
          background:
            radial-gradient(
              circle at top,
              rgba(120, 196, 235, 0.18),
              transparent 28%
            ),
            linear-gradient(
              180deg,
              #eef3f6 0%,
              #dfe6ea 50%,
              #eef2f4 100%
            );
        }

        .topbar {
          width: min(1450px, 96%);
          margin: 0 auto 75px;
          padding: 18px 22px;
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 18px;
          border: 2px solid #2d373c;
          border-radius: 22px;
          background: linear-gradient(
            145deg,
            #737b80,
            #555e63 48%,
            #3c4448
          );
          box-shadow:
            0 10px 0 #293237,
            0 18px 30px rgba(0, 0, 0, 0.18),
            inset 0 3px 0
              rgba(255, 255, 255, 0.36),
            inset 0 -7px 10px
              rgba(0, 0, 0, 0.2);
        }

        .brand {
          text-align: center;
          color: white;
          text-shadow: 0 2px 2px
            rgba(0, 0, 0, 0.42);
        }

        .brand span {
          display: block;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .brand strong {
          display: block;
          margin-top: 2px;
          font-size: 30px;
        }

        .brand small {
          display: block;
          margin-top: 3px;
          font-size: 14px;
        }

        .metalButton,
        .blueButton {
          min-height: 48px;
          padding: 9px 18px;
          border-radius: 10px;
          font-weight: 900;
          cursor: pointer;
        }

        .metalButton {
          border: 2px solid #626c71;
          color: #253039;
          background: linear-gradient(
            180deg,
            #fff,
            #d3d6d8 58%,
            #adb3b6
          );
          box-shadow:
            0 5px 0 #515b60,
            inset 0 2px 0
              rgba(255, 255, 255, 0.9);
        }

        .blueButton {
          border: 2px solid #174b69;
          color: #073b68;
          background: linear-gradient(
            180deg,
            #d9f5ff,
            #85d0f2 55%,
            #57add8
          );
          box-shadow:
            0 5px 0 #174760,
            inset 0 2px 0
              rgba(255, 255, 255, 0.84);
        }

        .mainPanel {
          position: relative;
          width: min(1200px, 96%);
          margin: 0 auto;
          padding: 75px 30px 40px;
          border: 2px solid #303a3f;
          border-radius: 25px;
          background: linear-gradient(
            145deg,
            #6d757a,
            #535b60 42%,
            #3c4448
          );
          box-shadow:
            0 11px 0 #293237,
            0 20px 34px rgba(0, 0, 0, 0.22),
            inset 0 3px 0
              rgba(255, 255, 255, 0.34);
        }

        .floatingTitle {
          position: absolute;
          top: -31px;
          left: 50%;
          transform: translateX(-50%);
          min-width: 290px;
          padding: 13px 25px;
          text-align: center;
          color: #073b68;
          font-size: 28px;
          font-weight: 900;
          border: 2px solid #174a68;
          border-radius: 13px;
          background: linear-gradient(
            180deg,
            #ddf7ff,
            #87cef0 53%,
            #58acd7
          );
          box-shadow:
            0 7px 0 #174760,
            0 12px 19px rgba(0, 0, 0, 0.2),
            inset 0 2px 0
              rgba(255, 255, 255, 0.88);
        }

        .tabs {
          display: grid;
          grid-template-columns:
            repeat(6, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 20px;
        }

        .tab {
          min-height: 50px;
          border: 2px solid #727b80;
          border-radius: 10px;
          background: linear-gradient(
            180deg,
            #fff,
            #d5d9dc
          );
          box-shadow: 0 4px 0 #515b60;
          color: #283239;
          font-weight: 900;
          cursor: pointer;
        }

        .tab span {
          margin-left: 5px;
          padding: 2px 6px;
          border-radius: 10px;
          background: rgba(0, 0, 0, 0.1);
        }

        .tab.active {
          color: #073b68;
          border-color: #174b69;
          background: linear-gradient(
            180deg,
            #ddf7ff,
            #83cdef
          );
          box-shadow: 0 4px 0 #174760;
        }

        .stats {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }

        .stats div {
          padding: 11px;
          text-align: center;
          border: 2px solid #7d878c;
          border-radius: 11px;
          background: linear-gradient(
            180deg,
            #fff,
            #e1e4e6
          );
          box-shadow: 0 4px 0 #596267;
        }

        .stats span {
          display: block;
          color: #5b656b;
          font-size: 13px;
          font-weight: 700;
        }

        .stats strong {
          display: block;
          margin-top: 3px;
          color: #073b68;
          font-size: 21px;
        }

        .progressBox {
          margin-bottom: 20px;
        }

        .progressText {
          display: flex;
          justify-content: space-between;
          margin-bottom: 6px;
          color: white;
        }

        .progressTrack {
          height: 13px;
          overflow: hidden;
          border: 2px solid #283238;
          border-radius: 20px;
          background: #252d31;
        }

        .progressFill {
          height: 100%;
          background: linear-gradient(
            90deg,
            #5bb3dd,
            #b9ecff
          );
          transition: width 0.2s ease;
        }

        .studyCard {
          position: relative;
          min-height: 430px;
          padding: 45px 35px 35px;
          text-align: center;
          border: 2px solid #747d82;
          border-radius: 20px;
          background: linear-gradient(
            180deg,
            #fafafa,
            #e0e2e4 68%,
            #c9ccce
          );
          box-shadow:
            0 9px 0 #596267,
            0 15px 22px rgba(0, 0, 0, 0.18),
            inset 0 4px 4px white;
        }

        .starButton {
          position: absolute;
          top: 18px;
          right: 20px;
          width: 48px;
          height: 44px;
          border: 2px solid #8b8b78;
          border-radius: 10px;
          background: #eee;
          color: #8b8b78;
          font-size: 25px;
          cursor: pointer;
        }

        .starButton.starred {
          color: #8b6500;
          background: #fff2ae;
          border-color: #a37b0c;
        }

        .word {
          color: #111820;
          font-size: clamp(38px, 6vw, 68px);
          font-weight: 900;
        }

        .translation {
          margin-top: 7px;
          color: #526068;
          font-size: 22px;
          font-weight: 700;
        }

        .learnArea,
        .quizArea,
        .writeArea {
          width: min(760px, 100%);
          margin: 35px auto 0;
        }

        .label {
          color: #5a656b;
          font-size: 15px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .synonymWord {
          margin-top: 8px;
          color: #07559a;
          font-size: 43px;
          font-weight: 900;
        }

        .synonymTranslation {
          margin-top: 5px;
          color: #566168;
          font-size: 18px;
        }

        .question {
          margin-bottom: 20px;
          color: #273138;
          font-size: 21px;
          font-weight: 700;
        }

        .options {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 15px;
        }

        .option {
          min-height: 62px;
          padding: 10px 15px;
          border: 2px solid #747d82;
          border-radius: 11px;
          background: linear-gradient(
            180deg,
            #fff,
            #d8dcde
          );
          box-shadow: 0 5px 0 #596267;
          color: #1b242a;
          font-size: 20px;
          font-weight: 900;
          cursor: pointer;
        }

        .option.correct {
          color: #155b29;
          border-color: #4d9661;
          background: #dff5e5;
          box-shadow: 0 5px 0 #3e774d;
        }

        .option.wrong {
          color: #851d1d;
          border-color: #ae5555;
          background: #ffe0e0;
          box-shadow: 0 5px 0 #843f3f;
        }

        .correctMessage,
        .wrongMessage {
          margin-top: 20px;
          padding: 12px;
          border-radius: 10px;
          font-size: 18px;
          font-weight: 900;
        }

        .correctMessage {
          color: #155b29;
          border: 1px solid #65a875;
          background: #dff5e5;
        }

        .wrongMessage {
          color: #851d1d;
          border: 1px solid #bc6969;
          background: #ffe3e3;
        }

        .writeRow {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 12px;
        }

        .writeRow input {
          min-height: 55px;
          padding: 10px 16px;
          border: 2px solid #778288;
          border-radius: 10px;
          outline: none;
          background: white;
          font-size: 19px;
          font-weight: 700;
        }

        .writeRow input:focus {
          border-color: #2a7fb0;
          box-shadow: 0 0 0 3px
            rgba(72, 167, 218, 0.2);
        }

        .checkButton {
          min-width: 150px;
        }

        .mixButton {
          display: block;
          margin: 25px auto 0;
        }

        .navigation {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          margin-top: 28px;
        }

        .navButton {
          width: 100%;
          min-height: 55px;
          font-size: 17px;
        }

        .emptyBox {
          padding: 60px 25px;
          text-align: center;
          border: 2px solid #778187;
          border-radius: 16px;
          background: #f5f6f7;
          box-shadow: 0 6px 0 #596267;
          font-size: 20px;
          font-weight: 900;
        }

        @media (max-width: 900px) {
          .topbar {
            grid-template-columns: 1fr;
          }

          .metalButton,
          .blueButton {
            width: 100%;
          }

          .tabs {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 650px) {
          .page {
            padding-left: 9px;
            padding-right: 9px;
          }

          .mainPanel {
            width: 100%;
            padding: 70px 14px 28px;
          }

          .tabs {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .stats {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .studyCard {
            min-height: 390px;
            padding: 50px 15px 25px;
          }

          .options {
            grid-template-columns: 1fr;
          }

          .writeRow {
            grid-template-columns: 1fr;
          }

          .navigation {
            grid-template-columns: 1fr;
          }

          .floatingTitle {
            min-width: 240px;
            font-size: 24px;
          }
        }
      `}</style>
    </main>
  );
}
