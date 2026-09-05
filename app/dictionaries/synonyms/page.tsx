"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
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

    return Array.isArray(parsed) ? parsed.map(String) : [];
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

  /* =========================
     LOCAL STORAGE
     ========================= */

  useEffect(() => {
    setMistakeIds(readIds(MISTAKES_KEY));
    setHardIds(readIds(HARD_KEY));
  }, []);

  /* =========================
     NEON API
     ========================= */

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

        setItems(
          Array.isArray(data.synonyms)
            ? data.synonyms
            : []
        );
      } catch (error) {
        if (!active) return;

        setLoadError(
          error instanceof Error
            ? error.message
            : "Ma’lumotlarni yuklashda xatolik."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  /* =========================
     ACTIVE WORDS
     ========================= */

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

  /* =========================
     SAVE
     ========================= */

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

  const saveHard = useCallback((next: string[]) => {
    setHardIds(next);

    if (typeof window !== "undefined") {
      localStorage.setItem(
        HARD_KEY,
        JSON.stringify(next)
      );
    }
  }, []);

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

  /* =========================
     OPTIONS
     ========================= */

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

  /* =========================
     NAVIGATION
     ========================= */

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

  /* =========================
     ANSWERS
     ========================= */

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
    if (
      !current ||
      !writtenAnswer.trim() ||
      answerState !== "idle"
    ) {
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

  const progress =
    activeItems.length > 0
      ? ((index + 1) / activeItems.length) * 100
      : 0;

  /* =========================
     LOADING
     ========================= */

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
            background: #e7edf1;
            font-family: "Bell MT",
              "Times New Roman", serif;
          }

          .stateBox {
            padding: 24px 35px;
            border: 2px solid #35434c;
            border-radius: 16px;
            background: white;
            box-shadow: 0 7px 0 #4b5b65;
            font-size: 21px;
            font-weight: 900;
          }
        `}</style>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="statePage">
        <div className="stateBox error">
          {loadError}
        </div>

        <style jsx>{`
          .statePage {
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: #e7edf1;
            font-family: "Bell MT",
              "Times New Roman", serif;
          }

          .stateBox {
            padding: 24px 35px;
            border-radius: 16px;
            font-size: 20px;
            font-weight: 900;
          }

          .error {
            color: #851b1b;
            border: 2px solid #a95050;
            background: #fff0f0;
          }
        `}</style>
      </main>
    );
  }

  /* =========================
     PAGE
     ========================= */

  return (
    <main className="page">
      {/* TOP */}

      <header className="topbar">
        <button
          type="button"
          className="metalButton topButton"
          onClick={() =>
            router.push("/dictionaries")
          }
        >
          ← Lug‘atlar
        </button>

        <button
          type="button"
          className="blueButton topButton"
          onClick={() => router.push("/")}
        >
          Bosh sahifa
        </button>
      </header>

      {/* MAIN */}

      <section className="mainPanel">
        <div className="floatingTitle">
          Synonyms
        </div>

        {/* MODES */}

        <div className="tabs">
          <button
            type="button"
            className={
              mode === "learn"
                ? "tab active"
                : "tab"
            }
            onClick={() => changeMode("learn")}
          >
            O‘rganish
          </button>

          <button
            type="button"
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
            type="button"
            className={
              mode === "write"
                ? "tab active"
                : "tab"
            }
            onClick={() => changeMode("write")}
          >
            Yozish
          </button>

          <button
            type="button"
            className={
              mode === "mistakes"
                ? "tab active"
                : "tab"
            }
            onClick={() =>
              changeMode("mistakes")
            }
          >
            Xatolarim
            <span>{mistakeIds.length}</span>
          </button>

          <button
            type="button"
            className={
              mode === "hard"
                ? "tab active"
                : "tab"
            }
            onClick={() => changeMode("hard")}
          >
            ★ Qiyinlar
            <span>{hardIds.length}</span>
          </button>

          <button
            type="button"
            className={
              mode === "mixed"
                ? "tab active"
                : "tab"
            }
            onClick={() => changeMode("mixed")}
          >
            Aralash
          </button>
        </div>

        {/* STATS */}

        <div className="stats">
          <div className="statBox">
            <span>Jami</span>
            <strong>{items.length}</strong>
          </div>

          <div className="statBox">
            <span>To‘g‘ri</span>
            <strong>{correctCount}</strong>
          </div>

          <div className="statBox">
            <span>Xato</span>
            <strong>{wrongCount}</strong>
          </div>

          <div className="statBox">
            <span>Qiyinlar</span>
            <strong>{hardIds.length}</strong>
          </div>
        </div>

        {current ? (
          <>
            {/* PROGRESS */}

            <div className="progressBox">
              <div className="progressText">
                <strong>
                  {index + 1} / {activeItems.length}
                </strong>

                <strong>
                  {Math.round(progress)}%
                </strong>
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

            {/* CARD */}

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

              {/* =====================
                  O‘RGANISH
                  ===================== */}

              {mode === "learn" && (
                <div className="learnArea">
                  <div className="relationRow">
                    {/* ACCEPT */}

                    <div className="relationCard wordCard">
                      <strong>{current.word}</strong>
                    </div>

                    {/* ARROW */}

                    <div className="synonymConnector">
                      <div className="connectorLine" />

                      <span className="leftArrow">
                        ◀
                      </span>

                      <div className="connectorButton">
                        Sinonimi
                      </div>

                      <span className="rightArrow">
                        ▶
                      </span>
                    </div>

                    {/* RECEIVE */}

                    <div className="relationCard synonymCard">
                      <strong>
                        {current.synonym}
                      </strong>
                    </div>
                  </div>

                  {/* TARJIMA */}

                  <div className="meaningButton">
                    {current.uzbek}
                  </div>
                </div>
              )}

              {/* =====================
                  TANLASH
                  ===================== */}

              {(mode === "choose" ||
                mode === "mistakes" ||
                mode === "hard") && (
                <div className="quizArea">
                  <div className="questionWord">
                    {current.word}
                  </div>

                  <div className="questionTranslation">
                    {current.uzbek}
                  </div>

                  <div className="question">
                    Qaysi biri{" "}
                    <strong>
                      {current.word}
                    </strong>{" "}
                    so‘zining sinonimi?
                  </div>

                  <div className="options">
                    {options.map((option) => {
                      let className = "option";

                      if (
                        answerState !== "idle" &&
                        normalize(option) ===
                          normalize(
                            current.synonym
                          )
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

              {/* =====================
                  YOZISH
                  ===================== */}

              {mode === "write" && (
                <div className="writeArea">
                  <div className="questionWord">
                    {current.word}
                  </div>

                  <div className="questionTranslation">
                    {current.uzbek}
                  </div>

                  <div className="question">
                    <strong>
                      {current.word}
                    </strong>{" "}
                    so‘zining sinonimini yozing
                  </div>

                  <div className="writeRow">
                    <input
                      type="text"
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
                        if (
                          event.key === "Enter"
                        ) {
                          checkWrittenAnswer();
                        }
                      }}
                      placeholder="Sinonimni yozing..."
                      autoComplete="off"
                    />

                    <button
                      type="button"
                      className="blueButton checkButton"
                      onClick={
                        checkWrittenAnswer
                      }
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

              {/* =====================
                  ARALASH
                  ===================== */}

              {mode === "mixed" && (
                <div className="learnArea">
                  <div className="relationRow">
                    <div className="relationCard wordCard">
                      <strong>{current.word}</strong>
                    </div>

                    <div className="synonymConnector">
                      <div className="connectorLine" />

                      <span className="leftArrow">
                        ◀
                      </span>

                      <div className="connectorButton">
                        Sinonimi
                      </div>

                      <span className="rightArrow">
                        ▶
                      </span>
                    </div>

                    <div className="relationCard synonymCard">
                      <strong>
                        {current.synonym}
                      </strong>
                    </div>
                  </div>

                  <div className="meaningButton">
                    {current.uzbek}
                  </div>

                  <button
                    type="button"
                    className="blueButton randomButton"
                    onClick={randomNext}
                  >
                    Tasodifiy so‘z
                  </button>
                </div>
              )}
            </article>

            {/* NAVIGATION */}

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
          padding: 24px 16px 65px;

          font-family:
            "Bell MT",
            "Times New Roman",
            serif;

          color: #101820;

          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(98, 192, 240, 0.2),
              transparent 34%
            ),
            linear-gradient(
              180deg,
              #eef5f8 0%,
              #dfe8ed 48%,
              #edf2f5 100%
            );
        }

        /* =========================
           TOPBAR
           ========================= */

        .topbar {
          width: min(1480px, 96%);
          min-height: 78px;

          margin: 0 auto 66px;
          padding: 14px 20px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          border: 2px solid #263a47;
          border-radius: 20px;

          background:
            linear-gradient(
              180deg,
              #647581 0%,
              #455965 47%,
              #2f424d 100%
            );

          box-shadow:
            0 9px 0 #1e313c,
            0 16px 25px rgba(0, 0, 0, 0.18),
            inset 0 3px 0
              rgba(255, 255, 255, 0.36),
            inset 0 -6px 9px
              rgba(0, 0, 0, 0.2);
        }

        .topButton {
          min-width: 150px;
        }

        /* =========================
           BUTTONS
           ========================= */

        .metalButton,
        .blueButton {
          min-height: 49px;
          padding: 9px 20px;

          border-radius: 11px;

          font-size: 16px;
          font-weight: 900;

          cursor: pointer;

          transition:
            transform 0.12s ease,
            filter 0.12s ease;
        }

        .metalButton {
          border: 2px solid #667984;

          color: #172a36;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #e9eef1 38%,
              #bdc9cf 100%
            );

          box-shadow:
            0 5px 0 #526570,
            inset 0 3px 0
              rgba(255, 255, 255, 0.95);
        }

        .blueButton {
          border: 2px solid #0874b2;

          color: #063c69;

          background:
            linear-gradient(
              180deg,
              #dff8ff 0%,
              #8edcff 35%,
              #34b2ee 70%,
              #1496d4 100%
            );

          box-shadow:
            0 6px 0 #075a87,
            inset 0 3px 0
              rgba(255, 255, 255, 0.9);
        }

        .metalButton:hover,
        .blueButton:hover {
          transform: translateY(-2px);
          filter: brightness(1.04);
        }

        .metalButton:active,
        .blueButton:active {
          transform: translateY(3px);
        }

        /* =========================
           MAIN
           ========================= */

        .mainPanel {
          position: relative;

          width: min(1480px, 96%);
          margin: 0 auto;

          padding: 68px 28px 35px;

          border: 2px solid #294555;
          border-radius: 23px;

          background:
            linear-gradient(
              145deg,
              #708a99 0%,
              #506b79 42%,
              #354c59 100%
            );

          box-shadow:
            0 11px 0 #263b46,
            0 19px 32px rgba(0, 0, 0, 0.22),
            inset 0 3px 0
              rgba(255, 255, 255, 0.35),
            inset 0 -8px 14px
              rgba(0, 0, 0, 0.18);
        }

        .floatingTitle {
          position: absolute;
          top: -35px;
          left: 50%;

          transform: translateX(-50%);

          min-width: 350px;

          padding: 13px 35px 15px;

          text-align: center;

          color: #063d6c;

          font-size: 32px;
          font-weight: 900;

          border: 2px solid #0877b7;
          border-radius: 15px;

          background:
            linear-gradient(
              180deg,
              #e4faff 0%,
              #9be2ff 35%,
              #42bdf4 72%,
              #1c9cdb 100%
            );

          box-shadow:
            0 7px 0 #075c8a,
            0 12px 18px rgba(0, 0, 0, 0.2),
            inset 0 3px 0
              rgba(255, 255, 255, 0.9);
        }

        /* =========================
           TABS
           ========================= */

        .tabs {
          display: grid;
          grid-template-columns:
            repeat(6, minmax(0, 1fr));

          gap: 15px;

          margin-bottom: 22px;
        }

        .tab {
          min-height: 59px;

          padding: 10px 12px;

          border: 2px solid #71848f;
          border-radius: 12px;

          color: #172a37;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #edf1f3 44%,
              #c5d0d6 100%
            );

          box-shadow:
            0 6px 0 #4b606c,
            inset 0 3px 0
              rgba(255, 255, 255, 0.95);

          font-size: 16px;
          font-weight: 900;

          cursor: pointer;

          transition:
            transform 0.12s ease,
            filter 0.12s ease;
        }

        .tab:hover {
          transform: translateY(-2px);
        }

        .tab:active {
          transform: translateY(3px);
        }

        .tab span {
          display: inline-grid;
          place-items: center;

          min-width: 23px;
          height: 23px;

          margin-left: 6px;

          border-radius: 50%;

          background: #d6e2e8;

          font-size: 12px;
        }

        .tab.active {
          color: #063d6c;

          border-color: #0877b7;

          background:
            linear-gradient(
              180deg,
              #e2f9ff 0%,
              #8edcff 40%,
              #31b2ef 76%,
              #1596d3 100%
            );

          box-shadow:
            0 6px 0 #075b88,
            inset 0 3px 0
              rgba(255, 255, 255, 0.92);
        }

        /* =========================
           STATS
           ========================= */

        .stats {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));

          gap: 16px;

          margin-bottom: 23px;
        }

        .statBox {
          min-height: 82px;

          padding: 12px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          border: 2px solid #71838d;
          border-radius: 13px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #eef3f5 48%,
              #ccd7dc 100%
            );

          box-shadow:
            0 6px 0 #4c606b,
            inset 0 3px 0
              rgba(255, 255, 255, 0.96);
        }

        .statBox span {
          color: #52646e;

          font-size: 15px;
          font-weight: 900;
        }

        .statBox strong {
          margin-top: 3px;

          color: #064d83;

          font-size: 24px;
          font-weight: 900;
        }

        /* =========================
           PROGRESS
           ========================= */

        .progressBox {
          margin-bottom: 22px;

          padding: 9px 13px 11px;

          border: 2px solid #263f4e;
          border-radius: 12px;

          background:
            linear-gradient(
              180deg,
              #3e5b6a,
              #29424f
            );

          box-shadow:
            inset 0 2px 4px
              rgba(0, 0, 0, 0.25);
        }

        .progressText {
          display: flex;
          align-items: center;
          justify-content: space-between;

          margin-bottom: 7px;

          color: white;

          font-size: 15px;
        }

        .progressTrack {
          height: 15px;

          overflow: hidden;

          border: 2px solid #203643;
          border-radius: 20px;

          background: #172c38;

          box-shadow:
            inset 0 2px 5px
              rgba(0, 0, 0, 0.45);
        }

        .progressFill {
          height: 100%;

          border-radius: 20px;

          background:
            linear-gradient(
              180deg,
              #b8edff,
              #34b8f1 60%,
              #1498d6
            );

          box-shadow:
            inset 0 2px 0
              rgba(255, 255, 255, 0.7);

          transition: width 0.2s ease;
        }

        /* =========================
           STUDY CARD
           ========================= */

        .studyCard {
          position: relative;

          min-height: 385px;

          padding: 52px 55px 45px;

          border: 2px solid #81929c;
          border-radius: 19px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #f3f7f9 47%,
              #dfe7eb 100%
            );

          box-shadow:
            0 8px 0 #425967,
            0 14px 20px rgba(0, 0, 0, 0.16),
            inset 0 4px 4px
              rgba(255, 255, 255, 0.95);
        }

        .starButton {
          position: absolute;
          z-index: 10;

          top: 18px;
          right: 20px;

          width: 51px;
          height: 48px;

          border: 2px solid #71828b;
          border-radius: 11px;

          color: #60727c;

          background:
            linear-gradient(
              180deg,
              #ffffff,
              #dce5e9
            );

          box-shadow:
            0 4px 0 #536772,
            inset 0 2px 0 white;

          font-size: 25px;

          cursor: pointer;
        }

        .starButton.starred {
          color: #8d6500;

          border-color: #c68c00;

          background:
            linear-gradient(
              180deg,
              #fff8c9,
              #ffd33f
            );

          box-shadow:
            0 4px 0 #a57500,
            inset 0 2px 0 white;
        }

        /* =========================
           LEARN DESIGN
           ========================= */

        .learnArea {
          width: 100%;

          padding-top: 20px;
        }

        .relationRow {
          width: min(1180px, 100%);

          margin: 0 auto;

          display: grid;

          grid-template-columns:
            minmax(270px, 1fr)
            minmax(190px, 260px)
            minmax(270px, 1fr);

          align-items: center;

          gap: 34px;
        }

        .relationCard {
          min-height: 145px;

          padding: 24px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 19px;

          transition:
            transform 0.15s ease,
            filter 0.15s ease;
        }

        .relationCard:hover {
          transform: translateY(-3px);
          filter: brightness(1.03);
        }

        .relationCard strong {
          font-size: clamp(
            35px,
            4vw,
            52px
          );

          line-height: 1;

          font-weight: 900;
        }

        /* ACCEPT */

        .wordCard {
          border: 2px solid #596d78;

          color: #101820;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #edf2f4 23%,
              #d3dde2 70%,
              #b5c2c9 100%
            );

          box-shadow:
            0 8px 0 #536671,
            0 14px 19px
              rgba(0, 0, 0, 0.18),
            inset 0 4px 3px
              rgba(255, 255, 255, 0.96),
            inset 0 -5px 8px
              rgba(45, 64, 74, 0.15);
        }

        /* RECEIVE */

        .synonymCard {
          border: 2px solid #0877b8;

          color: #063f70;

          background:
            linear-gradient(
              180deg,
              #e5f9ff 0%,
              #b9eaff 23%,
              #72cef7 68%,
              #35abe2 100%
            );

          box-shadow:
            0 8px 0 #12648e,
            0 14px 19px
              rgba(0, 86, 135, 0.2),
            inset 0 4px 3px
              rgba(255, 255, 255, 0.96),
            inset 0 -6px 9px
              rgba(0, 82, 130, 0.17);
        }

        /* =========================
           ARROW
           ========================= */

        .synonymConnector {
          position: relative;

          min-height: 100px;

          display: flex;
          align-items: center;
          justify-content: center;
        }

        .connectorLine {
          position: absolute;

          left: 22px;
          right: 22px;

          top: 50%;

          height: 25px;

          transform: translateY(-50%);

          border-top: 2px solid #1685c1;
          border-bottom: 2px solid #075e8e;

          background:
            linear-gradient(
              180deg,
              #c4f0ff 0%,
              #57c4f5 48%,
              #209fdc 100%
            );

          box-shadow:
            inset 0 3px 0
              rgba(255, 255, 255, 0.7),
            0 4px 5px
              rgba(0, 0, 0, 0.14);
        }

        .leftArrow,
        .rightArrow {
          position: absolute;

          top: 50%;

          transform: translateY(-50%);

          z-index: 2;

          color: #25a7e6;

          font-size: 54px;

          line-height: 1;

          text-shadow:
            0 3px 0 #075b88,
            0 5px 5px
              rgba(0, 0, 0, 0.2);
        }

        .leftArrow {
          left: -3px;
        }

        .rightArrow {
          right: -3px;
        }

        .connectorButton {
          position: relative;

          z-index: 3;

          min-width: 145px;

          padding: 12px 16px;

          text-align: center;

          color: #073e6b;

          font-size: 22px;
          font-weight: 900;

          border: 2px solid #0877b7;
          border-radius: 11px;

          background:
            linear-gradient(
              180deg,
              #dff8ff 0%,
              #8ddcff 43%,
              #32b1ed 100%
            );

          box-shadow:
            0 6px 0 #075b87,
            inset 0 3px 0
              rgba(255, 255, 255, 0.9);
        }

        /* =========================
           MEANING
           ========================= */

        .meaningButton {
          width: min(530px, 82%);

          min-height: 86px;

          margin: 58px auto 0;

          padding: 16px 28px;

          display: flex;
          align-items: center;
          justify-content: center;

          text-align: center;

          color: #063e6d;

          font-size: clamp(
            28px,
            3vw,
            39px
          );

          font-weight: 900;

          border: 2px solid #0876b4;
          border-radius: 16px;

          background:
            linear-gradient(
              180deg,
              #e3faff 0%,
              #a5e5ff 27%,
              #5bc6f3 68%,
              #27a6df 100%
            );

          box-shadow:
            0 8px 0 #0a608d,
            0 14px 19px
              rgba(0, 70, 110, 0.18),
            inset 0 4px 3px
              rgba(255, 255, 255, 0.95),
            inset 0 -5px 8px
              rgba(0, 76, 120, 0.15);
        }

        /* =========================
           QUIZ
           ========================= */

        .quizArea,
        .writeArea {
          width: min(900px, 100%);

          margin: 0 auto;

          text-align: center;
        }

        .questionWord {
          color: #0d1820;

          font-size: clamp(
            38px,
            5vw,
            61px
          );

          font-weight: 900;
        }

        .questionTranslation {
          margin-top: 7px;

          color: #536671;

          font-size: 20px;
          font-weight: 900;
        }

        .question {
          margin: 27px 0 21px;

          color: #273943;

          font-size: 21px;
          font-weight: 900;
        }

        .options {
          display: grid;

          grid-template-columns:
            repeat(2, minmax(0, 1fr));

          gap: 17px;
        }

        .option {
          min-height: 68px;

          padding: 12px 18px;

          border: 2px solid #71848e;
          border-radius: 12px;

          color: #172b37;

          background:
            linear-gradient(
              180deg,
              #ffffff,
              #edf2f4 42%,
              #c4d0d6
            );

          box-shadow:
            0 6px 0 #4d616c,
            inset 0 3px 0 white;

          font-size: 21px;
          font-weight: 900;

          cursor: pointer;
        }

        .option:hover:not(:disabled) {
          transform: translateY(-2px);

          border-color: #0c82be;

          background:
            linear-gradient(
              180deg,
              #e9faff,
              #9edfff
            );
        }

        .option.correct {
          color: #145a2b;

          border-color: #46955e;

          background:
            linear-gradient(
              180deg,
              #f0fff3,
              #a9e7b9
            );

          box-shadow: 0 6px 0 #3b784d;
        }

        .option.wrong {
          color: #8b1f1f;

          border-color: #b45757;

          background:
            linear-gradient(
              180deg,
              #fff3f3,
              #ffb6b6
            );

          box-shadow: 0 6px 0 #843e3e;
        }

        /* =========================
           WRITE
           ========================= */

        .writeRow {
          display: grid;

          grid-template-columns: 1fr auto;

          gap: 14px;
        }

        .writeRow input {
          min-height: 60px;

          padding: 12px 18px;

          outline: none;

          border: 2px solid #6c818c;
          border-radius: 11px;

          background: white;

          box-shadow:
            inset 0 3px 6px
              rgba(0, 0, 0, 0.08);

          color: #152630;

          font-size: 20px;
          font-weight: 900;
        }

        .writeRow input:focus {
          border-color: #168dca;

          box-shadow:
            0 0 0 3px
              rgba(39, 165, 224, 0.18),
            inset 0 3px 6px
              rgba(0, 0, 0, 0.08);
        }

        .checkButton {
          min-width: 170px;
        }

        /* =========================
           MESSAGES
           ========================= */

        .correctMessage,
        .wrongMessage {
          margin-top: 20px;

          padding: 13px 17px;

          border-radius: 11px;

          font-size: 18px;
          font-weight: 900;
        }

        .correctMessage {
          color: #155a2a;

          border: 2px solid #61a975;

          background: #e4f8e9;
        }

        .wrongMessage {
          color: #861f1f;

          border: 2px solid #bc6969;

          background: #ffe3e3;
        }

        .randomButton {
          display: block;

          min-width: 230px;

          margin: 28px auto 0;
        }

        /* =========================
           NAVIGATION
           ========================= */

        .navigation {
          display: grid;

          grid-template-columns: 1fr 1fr;

          gap: 22px;

          margin-top: 28px;
        }

        .navButton {
          width: 100%;

          min-height: 59px;

          font-size: 18px;
        }

        .emptyBox {
          padding: 65px 25px;

          text-align: center;

          border: 2px solid #71838e;
          border-radius: 15px;

          background: #f7fafb;

          box-shadow: 0 7px 0 #4d626d;

          font-size: 21px;
          font-weight: 900;
        }

        /* =========================
           TABLET
           ========================= */

        @media (max-width: 1000px) {
          .tabs {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }

          .relationRow {
            grid-template-columns: 1fr;

            gap: 25px;
          }

          .relationCard {
            width: min(600px, 100%);

            margin: 0 auto;
          }

          .synonymConnector {
            width: min(300px, 90%);

            margin: 0 auto;
          }

          .meaningButton {
            margin-top: 35px;
          }
        }

        /* =========================
           MOBILE
           ========================= */

        @media (max-width: 650px) {
          .page {
            padding:
              15px 8px 45px;
          }

          .topbar {
            width: 100%;

            min-height: 67px;

            margin-bottom: 58px;

            padding: 10px;
          }

          .topButton {
            min-width: 0;

            padding: 8px 11px;

            font-size: 14px;
          }

          .mainPanel {
            width: 100%;

            padding:
              62px 12px 26px;
          }

          .floatingTitle {
            min-width: 230px;

            padding: 11px 20px;

            font-size: 25px;
          }

          .tabs {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));

            gap: 11px;
          }

          .tab {
            min-height: 54px;

            font-size: 14px;
          }

          .stats {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));

            gap: 11px;
          }

          .studyCard {
            min-height: 390px;

            padding:
              58px 14px 30px;
          }

          .relationCard {
            min-height: 120px;
          }

          .relationCard strong {
            font-size: 38px;
          }

          .connectorButton {
            font-size: 18px;
          }

          .meaningButton {
            width: 100%;

            min-height: 74px;

            font-size: 28px;
          }

          .options {
            grid-template-columns: 1fr;
          }

          .writeRow {
            grid-template-columns: 1fr;
          }

          .navigation {
            grid-template-columns: 1fr;

            gap: 14px;
          }
        }
      `}</style>
    </main>
  );
}
