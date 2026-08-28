"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type SynonymWord = {
  id: string;
  word: string;
  uzbek: string;
  synonyms: string[];
  createdAt: string;
  updatedAt: string;
};

type ApiResponse = {
  ok: boolean;
  words?: SynonymWord[];
  total?: number;
  message?: string;
};

type ProgressItem = {
  correct: number;
  wrong: number;
  difficult: boolean;
  learned: boolean;
};

type ProgressMap = Record<string, ProgressItem>;

type Mode =
  | "learn"
  | "choice"
  | "write"
  | "wrong"
  | "difficult";

const API = "/api/dictionary/synonyms";
const STORAGE_KEY = "qurbonov_synonyms_progress";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function shuffle<T>(items: T[]) {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

export default function SynonymsPage() {
  const [words, setWords] = useState<SynonymWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [mode, setMode] = useState<Mode>("learn");
  const [index, setIndex] = useState(0);

  const [progress, setProgress] = useState<ProgressMap>({});

  const [revealed, setRevealed] = useState(false);

  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [choiceResult, setChoiceResult] = useState<
    "correct" | "wrong" | ""
  >("");

  const [writeAnswer, setWriteAnswer] = useState("");
  const [writeResult, setWriteResult] = useState<
    "correct" | "wrong" | ""
  >("");

  const [speechSupported, setSpeechSupported] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  /* =====================================================
     INITIAL
  ===================================================== */

  useEffect(() => {
    setSpeechSupported(
      typeof window !== "undefined" &&
        "speechSynthesis" in window
    );

    loadWords();
    loadProgress();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  async function loadWords() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(API, {
        cache: "no-store",
      });

      const data: ApiResponse = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message || "Sinonimlarni yuklab bo‘lmadi."
        );
      }

      setWords(data.words || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Xatolik yuz berdi."
      );
    } finally {
      setLoading(false);
    }
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        setProgress({});
        return;
      }

      const parsed = JSON.parse(raw);

      if (parsed && typeof parsed === "object") {
        setProgress(parsed);
      }
    } catch {
      setProgress({});
    }
  }

  function saveProgress(next: ProgressMap) {
    setProgress(next);

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(next)
      );
    } catch {
      //
    }
  }

  /* =====================================================
     FILTERS
  ===================================================== */

  const wrongIds = useMemo(() => {
    return new Set(
      Object.entries(progress)
        .filter(([, item]) => item.wrong > 0)
        .map(([id]) => id)
    );
  }, [progress]);

  const difficultIds = useMemo(() => {
    return new Set(
      Object.entries(progress)
        .filter(([, item]) => item.difficult)
        .map(([id]) => id)
    );
  }, [progress]);

  const visibleWords = useMemo(() => {
    if (mode === "wrong") {
      return words.filter((item) => wrongIds.has(item.id));
    }

    if (mode === "difficult") {
      return words.filter((item) =>
        difficultIds.has(item.id)
      );
    }

    return words;
  }, [words, mode, wrongIds, difficultIds]);

  const current =
    visibleWords.length > 0
      ? visibleWords[
          Math.min(index, visibleWords.length - 1)
        ]
      : null;

  const currentProgress = current
    ? progress[current.id] || {
        correct: 0,
        wrong: 0,
        difficult: false,
        learned: false,
      }
    : null;

  /* =====================================================
     STATS
  ===================================================== */

  const totalCorrect = useMemo(() => {
    return Object.values(progress).reduce(
      (sum, item) => sum + item.correct,
      0
    );
  }, [progress]);

  const totalWrong = useMemo(() => {
    return Object.values(progress).reduce(
      (sum, item) => sum + item.wrong,
      0
    );
  }, [progress]);

  const learnedCount = useMemo(() => {
    return Object.values(progress).filter(
      (item) => item.learned
    ).length;
  }, [progress]);

  const accuracy =
    totalCorrect + totalWrong > 0
      ? Math.round(
          (totalCorrect / (totalCorrect + totalWrong)) * 100
        )
      : 0;

  /* =====================================================
     TIMER / RESET
  ===================================================== */

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function resetCard() {
    clearTimer();

    setRevealed(false);
    setSelectedAnswer("");
    setChoiceResult("");
    setWriteAnswer("");
    setWriteResult("");
  }

  function changeMode(nextMode: Mode) {
    resetCard();
    setMode(nextMode);
    setIndex(0);
  }

  /* =====================================================
     NAVIGATION
  ===================================================== */

  function next() {
    clearTimer();

    setRevealed(false);
    setSelectedAnswer("");
    setChoiceResult("");
    setWriteAnswer("");
    setWriteResult("");

    setIndex((old) => {
      if (visibleWords.length === 0) return 0;

      if (old < visibleWords.length - 1) {
        return old + 1;
      }

      return 0;
    });
  }

  function previous() {
    resetCard();

    setIndex((old) => {
      if (visibleWords.length === 0) return 0;

      if (old > 0) {
        return old - 1;
      }

      return visibleWords.length - 1;
    });
  }

  function autoNext(delay: number) {
    clearTimer();

    timerRef.current = setTimeout(() => {
      next();
    }, delay);
  }

  /* =====================================================
     PROGRESS
  ===================================================== */

  function markResult(
    item: SynonymWord,
    correct: boolean
  ) {
    const old = progress[item.id] || {
      correct: 0,
      wrong: 0,
      difficult: false,
      learned: false,
    };

    const nextCorrect =
      old.correct + (correct ? 1 : 0);

    const nextItem: ProgressItem = {
      ...old,

      correct: nextCorrect,

      wrong: old.wrong + (correct ? 0 : 1),

      learned:
        nextCorrect >= 3 ? true : old.learned,
    };

    saveProgress({
      ...progress,
      [item.id]: nextItem,
    });
  }

  function toggleDifficult() {
    if (!current) return;

    const old = progress[current.id] || {
      correct: 0,
      wrong: 0,
      difficult: false,
      learned: false,
    };

    saveProgress({
      ...progress,

      [current.id]: {
        ...old,
        difficult: !old.difficult,
      },
    });
  }

  /* =====================================================
     LEARN
  ===================================================== */

  function revealSynonyms() {
    if (!current || revealed) return;

    setRevealed(true);

    autoNext(2400);
  }

  /* =====================================================
     CHOICE
  ===================================================== */

  const choiceOptions = useMemo(() => {
    if (!current || current.synonyms.length === 0) {
      return [];
    }

    const correct = current.synonyms[0];

    const wrongPool = words
      .filter((item) => item.id !== current.id)
      .flatMap((item) => item.synonyms)
      .filter(
        (item) =>
          normalize(item) !== normalize(correct) &&
          !current.synonyms
            .map(normalize)
            .includes(normalize(item))
      );

    const uniqueWrong = Array.from(
      new Set(wrongPool)
    );

    const wrongAnswers = shuffle(uniqueWrong).slice(0, 3);

    return shuffle([correct, ...wrongAnswers]);
  }, [current, words]);

  function checkChoice(answer: string) {
    if (!current || choiceResult) return;

    const accepted = current.synonyms.map(normalize);

    const correct = accepted.includes(
      normalize(answer)
    );

    setSelectedAnswer(answer);

    setChoiceResult(correct ? "correct" : "wrong");

    markResult(current, correct);

    // To‘g‘ri javob tezroq,
    // xato javob esa uzoqroq ko‘rinadi.
    autoNext(correct ? 1200 : 2300);
  }

  /* =====================================================
     WRITE
  ===================================================== */

  function checkWrite() {
    if (!current || writeResult) return;

    const answer = normalize(writeAnswer);

    if (!answer) return;

    const accepted = current.synonyms.map(normalize);

    const correct = accepted.includes(answer);

    setWriteResult(correct ? "correct" : "wrong");

    markResult(current, correct);

    autoNext(correct ? 1200 : 2300);
  }

  /* =====================================================
     SPEECH
  ===================================================== */

  function speakWord() {
    if (!current || !speechSupported) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(
      current.word
    );

    utterance.lang = "en-US";
    utterance.rate = 0.85;

    window.speechSynthesis.speak(utterance);
  }

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <main className="centerPage">
        <div className="message3d">
          Synonyms yuklanmoqda...
        </div>

        <style jsx>{`
          .centerPage {
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: #edf3f6;
            font-family: "Bell MT", "Times New Roman", serif;
          }

          .message3d {
            padding: 24px 40px;
            border: 2px solid #59666c;
            border-radius: 14px;
            background: linear-gradient(
              180deg,
              #f5f5f5,
              #d3d6d8
            );
            box-shadow:
              inset 0 3px 2px #ffffff,
              0 7px 0 #737d82,
              0 13px 20px rgba(0, 0, 0, 0.18);
            font-size: 22px;
            font-weight: 700;
            color: #075478;
          }
        `}</style>
      </main>
    );
  }

  if (error) {
    return (
      <main className="centerPage">
        <div className="errorBox">{error}</div>

        <style jsx>{`
          .centerPage {
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: #edf3f6;
            font-family: "Bell MT", "Times New Roman", serif;
          }

          .errorBox {
            padding: 22px 35px;
            border: 2px solid #a84b4b;
            border-radius: 14px;
            background: #fff0f0;
            box-shadow: 0 6px 0 #884646;
            color: #8d2222;
            font-weight: 700;
          }
        `}</style>
      </main>
    );
  }

  /* =====================================================
     PAGE
  ===================================================== */

  return (
    <main className="page">
      {/* ================= HEADER ================= */}

      <header className="topPanel">
        <button
          type="button"
          className="grayButton backButton"
          onClick={() => {
            window.location.href =
              "/qollanmalar/dictionaries";
          }}
        >
          ← Lug‘atlar
        </button>

        <div className="headerCenter">
          <h1>Synonyms</h1>
          <div>Sinonimlarni yodlash</div>
        </div>

        <div className="totalBox">
          <strong>{words.length}</strong>
          <span>Jami</span>
        </div>
      </header>

      {/* ================= CONTROL ================= */}

      <section className="controlPanel">
        <div className="modeRow">
          <button
            type="button"
            className={
              mode === "learn"
                ? "modeButton activeButton"
                : "modeButton"
            }
            onClick={() => changeMode("learn")}
          >
            O‘rganish
          </button>

          <button
            type="button"
            className={
              mode === "choice"
                ? "modeButton activeButton"
                : "modeButton"
            }
            onClick={() => changeMode("choice")}
          >
            Tanlash
          </button>

          <button
            type="button"
            className={
              mode === "write"
                ? "modeButton activeButton"
                : "modeButton"
            }
            onClick={() => changeMode("write")}
          >
            Yozish
          </button>

          <button
            type="button"
            className={
              mode === "wrong"
                ? "modeButton activeButton"
                : "modeButton"
            }
            onClick={() => changeMode("wrong")}
          >
            Xatolarim
          </button>

          <button
            type="button"
            className={
              mode === "difficult"
                ? "modeButton activeButton"
                : "modeButton"
            }
            onClick={() => changeMode("difficult")}
          >
            ★ Qiyinlar
          </button>
        </div>

        <div className="statsRow">
          <div className="statBox">
            <span>To‘g‘ri</span>
            <strong>{totalCorrect}</strong>
          </div>

          <div className="statBox">
            <span>Xato</span>
            <strong>{totalWrong}</strong>
          </div>

          <div className="statBox">
            <span>Yodlangan</span>
            <strong>{learnedCount}</strong>
          </div>

          <div className="statBox">
            <span>Natija</span>
            <strong>{accuracy}%</strong>
          </div>
        </div>
      </section>

      {/* ================= EMPTY ================= */}

      {visibleWords.length === 0 ? (
        <section className="emptyPanel">
          {mode === "wrong"
            ? "Hozircha xato qilingan so‘zlar yo‘q."
            : mode === "difficult"
              ? "Hozircha qiyin deb belgilangan so‘zlar yo‘q."
              : "So‘zlar mavjud emas."}
        </section>
      ) : current ? (
        /* ================= MAIN ================= */

        <section className="learningPanel">
          <div className="progressRow">
            <span>
              {index + 1} / {visibleWords.length}
            </span>

            <span>
              To‘g‘ri: {currentProgress?.correct || 0}
              {" · "}
              Xato: {currentProgress?.wrong || 0}
            </span>
          </div>

          <article className="wordCard">
            <div className="iconButtons">
              <button
                type="button"
                className="smallGray3d"
                onClick={speakWord}
                disabled={!speechSupported}
                title="Talaffuz"
              >
                🔊
              </button>

              <button
                type="button"
                className={
                  currentProgress?.difficult
                    ? "smallGray3d starActive"
                    : "smallGray3d"
                }
                onClick={toggleDifficult}
                title="Qiyin so‘z"
              >
                ★
              </button>
            </div>

            <div className="wordLabel">
              Inglizcha so‘z
            </div>

            <h2>{current.word}</h2>

            <div className="translationBox">
              {current.uzbek}
            </div>

            {/* ============= LEARN ============= */}

            {mode === "learn" && (
              <div className="contentArea">
                {!revealed ? (
                  <button
                    type="button"
                    className="blueButton"
                    onClick={revealSynonyms}
                  >
                    Sinonimlarni ko‘rsatish
                  </button>
                ) : (
                  <>
                    <div className="synonymList">
                      {current.synonyms.map(
                        (synonym, idx) => (
                          <span
                            key={`${synonym}-${idx}`}
                            className="synonymChip"
                          >
                            {synonym}
                          </span>
                        )
                      )}
                    </div>

                    <div className="autoText">
                      Keyingi so‘zga avtomatik o‘tiladi...
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ============= CHOICE ============= */}

            {mode === "choice" && (
              <div className="contentArea">
                <div className="question">
                  Qaysi biri{" "}
                  <strong>{current.word}</strong>{" "}
                  so‘zining sinonimi?
                </div>

                <div className="answersGrid">
                  {choiceOptions.map((option) => {
                    let className = "answerButton";

                    if (choiceResult) {
                      const isCorrect =
                        current.synonyms
                          .map(normalize)
                          .includes(normalize(option));

                      if (isCorrect) {
                        className += " correctAnswer";
                      } else if (
                        option === selectedAnswer
                      ) {
                        className += " wrongAnswer";
                      }
                    }

                    return (
                      <button
                        type="button"
                        key={option}
                        className={className}
                        disabled={Boolean(choiceResult)}
                        onClick={() =>
                          checkChoice(option)
                        }
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>

                {choiceResult && (
                  <div
                    className={
                      choiceResult === "correct"
                        ? "resultBox correctResult"
                        : "resultBox wrongResult"
                    }
                  >
                    {choiceResult === "correct"
                      ? "✓ To‘g‘ri!"
                      : `✗ Xato. To‘g‘ri javoblardan biri: ${current.synonyms[0]}`}
                  </div>
                )}
              </div>
            )}

            {/* ============= WRITE ============= */}

            {mode === "write" && (
              <div className="contentArea">
                <div className="question">
                  <strong>{current.word}</strong>{" "}
                  so‘zining sinonimini yozing.
                </div>

                <div className="writeRow">
                  <input
                    type="text"
                    value={writeAnswer}
                    placeholder="Sinonim yozing..."
                    disabled={Boolean(writeResult)}
                    onChange={(e) =>
                      setWriteAnswer(e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        checkWrite();
                      }
                    }}
                  />

                  <button
                    type="button"
                    className="blueButton checkButton"
                    onClick={checkWrite}
                    disabled={
                      Boolean(writeResult) ||
                      !writeAnswer.trim()
                    }
                  >
                    Tekshirish
                  </button>
                </div>

                {writeResult && (
                  <div
                    className={
                      writeResult === "correct"
                        ? "resultBox correctResult"
                        : "resultBox wrongResult"
                    }
                  >
                    {writeResult === "correct"
                      ? "✓ To‘g‘ri!"
                      : `✗ Xato. Sinonimlar: ${current.synonyms.join(
                          ", "
                        )}`}
                  </div>
                )}
              </div>
            )}

            {/* ============= REVIEW ============= */}

            {(mode === "wrong" ||
              mode === "difficult") && (
              <div className="contentArea">
                <div className="question">
                  Sinonimlar
                </div>

                <div className="synonymList">
                  {current.synonyms.map(
                    (synonym, idx) => (
                      <span
                        key={`${synonym}-${idx}`}
                        className="synonymChip"
                      >
                        {synonym}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}
          </article>

          {/* ================= BOTTOM ================= */}

          <div className="bottomNavigation">
            <button
              type="button"
              className="grayButton navButton"
              onClick={previous}
            >
              ← Oldingi
            </button>

            <button
              type="button"
              className="blueButton laterButton"
              onClick={() => {
                if (
                  current &&
                  !currentProgress?.difficult
                ) {
                  toggleDifficult();
                }

                next();
              }}
            >
              ★ Keyinroq yana ko‘rsat
            </button>

            <button
              type="button"
              className="grayButton navButton"
              onClick={next}
            >
              Keyingi →
            </button>
          </div>
        </section>
      ) : null}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        :global(html) {
          background: #edf3f6;
        }

        :global(body) {
          margin: 0;
          background: #edf3f6;
        }

        button,
        input {
          font-family: "Bell MT", "Times New Roman", serif;
        }

        .page {
          min-height: 100vh;
          padding: 26px 18px 70px;

          font-family: "Bell MT", "Times New Roman", serif;

          color: #142e3c;

          background:
            radial-gradient(
              circle at top,
              #ffffff 0%,
              #f3f7f9 42%,
              #e8eff2 100%
            );
        }

        /* =================================================
           BARCHA ASOSIY BLOKLAR BIR XIL KENGLIKDA
        ================================================= */

        .topPanel,
        .controlPanel,
        .learningPanel,
        .emptyPanel {
          width: min(1150px, 100%);
          margin-left: auto;
          margin-right: auto;
        }

        /* =================================================
           HEADER
        ================================================= */

        .topPanel {
          min-height: 105px;

          margin-bottom: 28px;

          padding: 18px 24px;

          display: grid;
          grid-template-columns: 180px 1fr 145px;
          align-items: center;
          gap: 20px;

          border: 3px solid #0b4969;
          border-radius: 20px;

          background:
            linear-gradient(
              180deg,
              #a9eaff 0%,
              #62c9ef 48%,
              #319fce 100%
            );

          box-shadow:
            inset 0 4px 3px rgba(255, 255, 255, 0.92),
            inset 0 -7px 0 #08709a,
            0 9px 0 #07506f,
            0 16px 24px rgba(0, 0, 0, 0.2);
        }

        .headerCenter {
          text-align: center;
        }

        .headerCenter h1 {
          margin: 0;

          color: #064d73;

          font-size: clamp(34px, 4vw, 44px);

          line-height: 1;

          text-shadow:
            0 2px 0 #ffffff,
            0 3px 3px rgba(0, 0, 0, 0.12);
        }

        .headerCenter div {
          margin-top: 7px;

          color: #164b63;

          font-size: 14px;

          font-weight: 700;
        }

        .totalBox {
          min-height: 58px;

          padding: 7px 14px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          border: 2px solid #737d82;
          border-radius: 11px;

          background:
            linear-gradient(
              180deg,
              #f6f6f6 0%,
              #e4e4e4 48%,
              #c8ccce 100%
            );

          box-shadow:
            inset 0 3px 2px #ffffff,
            inset 0 -2px 3px rgba(0, 0, 0, 0.08),
            0 6px 0 #707a7f,
            0 10px 14px rgba(0, 0, 0, 0.15);
        }

        .totalBox strong {
          color: #0676aa;

          font-size: 24px;
        }

        .totalBox span {
          margin-top: 1px;

          font-size: 13px;

          font-weight: 700;
        }

        /* =================================================
           OCH KULRANG 3D TUGMALAR
        ================================================= */

        .grayButton,
        .modeButton,
        .answerButton,
        .smallGray3d {
          border: 2px solid #7c878c;

          color: #172d38;

          background:
            linear-gradient(
              180deg,
              #f4f4f4 0%,
              #e3e3e3 45%,
              #c9cdcf 100%
            );

          box-shadow:
            inset 0 3px 2px rgba(255, 255, 255, 0.95),
            inset 0 -2px 3px rgba(0, 0, 0, 0.08),
            0 5px 0 #717b80,
            0 9px 12px rgba(0, 0, 0, 0.13);

          font-weight: 700;

          cursor: pointer;

          transition:
            transform 0.08s ease,
            box-shadow 0.08s ease,
            filter 0.12s ease;
        }

        .grayButton:hover,
        .modeButton:hover,
        .answerButton:hover,
        .smallGray3d:hover {
          filter: brightness(1.025);
        }

        .grayButton:active,
        .modeButton:active,
        .answerButton:active,
        .smallGray3d:active,
        .blueButton:active {
          transform: translateY(4px);

          box-shadow:
            inset 0 2px 3px rgba(0, 0, 0, 0.08),
            0 1px 0 #697378;
        }

        .backButton {
          min-height: 55px;

          padding: 10px 16px;

          border-radius: 11px;

          font-size: 14px;
        }

        /* =================================================
           CONTROL PANEL
        ================================================= */

        .controlPanel {
          margin-bottom: 28px;

          padding: 17px;

          border: 3px solid #40484c;
          border-radius: 18px;

          background:
            linear-gradient(
              145deg,
              #6b7174 0%,
              #555b5e 50%,
              #43494c 100%
            );

          box-shadow:
            inset 0 3px 3px rgba(255, 255, 255, 0.18),
            inset 0 -7px 0 #303639,
            0 8px 0 #303639,
            0 14px 20px rgba(0, 0, 0, 0.18);
        }

        .modeRow {
          display: grid;

          grid-template-columns: repeat(5, 1fr);

          gap: 13px;
        }

        .modeButton {
          min-height: 49px;

          border-radius: 9px;

          font-size: 14px;
        }

        .activeButton {
          border-color: #126487;

          color: #064d70;

          background:
            linear-gradient(
              180deg,
              #caf2ff 0%,
              #79d4f4 45%,
              #43b2df 100%
            );

          box-shadow:
            inset 0 3px 2px #ffffff,
            inset 0 -2px 3px rgba(0, 0, 0, 0.07),
            0 5px 0 #126181,
            0 9px 12px rgba(0, 0, 0, 0.14);
        }

        .statsRow {
          margin-top: 15px;

          display: grid;

          grid-template-columns: repeat(4, 1fr);

          gap: 13px;
        }

        .statBox {
          min-height: 68px;

          padding: 9px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          border: 2px solid #9aa3a7;
          border-radius: 9px;

          background:
            linear-gradient(
              180deg,
              #f2f2f2 0%,
              #dedede 50%,
              #c7cbcd 100%
            );

          box-shadow:
            inset 0 3px 2px #ffffff,
            inset 0 -2px 3px rgba(0, 0, 0, 0.07),
            0 5px 0 #798388;
        }

        .statBox span {
          font-size: 13px;

          font-weight: 700;
        }

        .statBox strong {
          margin-top: 4px;

          color: #0877aa;

          font-size: 22px;
        }

        /* =================================================
           MAIN PANEL — 1150PX
        ================================================= */

        .learningPanel {
          padding: 20px;

          border: 3px solid #3b4347;
          border-radius: 20px;

          background:
            linear-gradient(
              145deg,
              #6b7174 0%,
              #545a5d 48%,
              #41474a 100%
            );

          box-shadow:
            inset 0 3px 3px rgba(255, 255, 255, 0.17),
            inset 0 -8px 0 #2e3437,
            0 10px 0 #2e3437,
            0 17px 26px rgba(0, 0, 0, 0.22);
        }

        .progressRow {
          min-height: 30px;

          padding: 0 5px 8px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          color: #ffffff;

          font-size: 14px;

          font-weight: 700;

          text-shadow: 0 2px 2px rgba(0, 0, 0, 0.35);
        }

        /* =================================================
           WORD CARD
        ================================================= */

        .wordCard {
          position: relative;

          min-height: 410px;

          padding: 28px 42px 32px;

          text-align: center;

          border: 3px solid #c5cbce;
          border-radius: 17px;

          background:
            linear-gradient(
              145deg,
              #f8f8f8 0%,
              #eeeeee 52%,
              #d9dcde 100%
            );

          box-shadow:
            inset 0 4px 4px rgba(255, 255, 255, 0.98),
            inset 0 -4px 5px rgba(0, 0, 0, 0.07),
            0 8px 0 #7b858a,
            0 13px 18px rgba(0, 0, 0, 0.18);
        }

        .iconButtons {
          position: absolute;

          top: 18px;
          right: 22px;

          display: flex;

          gap: 11px;
        }

        .smallGray3d {
          width: 48px;
          height: 45px;

          border-radius: 9px;

          font-size: 17px;
        }

        .starActive {
          border-color: #b18a21;

          background:
            linear-gradient(
              180deg,
              #fff8c9,
              #f2d76d 55%,
              #d9b83e
            );

          box-shadow:
            inset 0 3px 2px #ffffff,
            0 5px 0 #a98b30;
        }

        .wordLabel {
          margin-top: 2px;

          color: #667176;

          font-size: 15px;

          font-weight: 700;
        }

        .wordCard h2 {
          margin: 8px 0 21px;

          color: #0875aa;

          font-size: clamp(43px, 6vw, 61px);

          line-height: 1;

          text-shadow:
            0 2px 0 #ffffff,
            0 3px 3px rgba(0, 0, 0, 0.1);
        }

        .translationBox {
          width: min(800px, 90%);

          margin: 0 auto;

          min-height: 58px;

          padding: 13px 20px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 2px solid #6daac6;
          border-radius: 10px;

          background:
            linear-gradient(
              180deg,
              #edfaff 0%,
              #d7effb 50%,
              #bddfee 100%
            );

          box-shadow:
            inset 0 3px 2px #ffffff,
            0 5px 0 #6e9eb3;

          color: #17546f;

          font-size: 21px;

          font-weight: 700;
        }

        .contentArea {
          width: min(900px, 100%);

          margin: 24px auto 0;
        }

        .question {
          margin-bottom: 18px;

          color: #263b45;

          font-size: 19px;

          font-weight: 700;
        }

        /* =================================================
           BLUE 3D
        ================================================= */

        .blueButton {
          min-height: 48px;

          padding: 10px 24px;

          border: 2px solid #116184;
          border-radius: 9px;

          color: #074d70;

          background:
            linear-gradient(
              180deg,
              #c9f1ff 0%,
              #79d2f2 48%,
              #45b3df 100%
            );

          box-shadow:
            inset 0 3px 2px #ffffff,
            inset 0 -2px 3px rgba(0, 0, 0, 0.07),
            0 5px 0 #115f7e,
            0 9px 12px rgba(0, 0, 0, 0.13);

          font-weight: 700;

          cursor: pointer;

          transition:
            transform 0.08s ease,
            box-shadow 0.08s ease;
        }

        /* =================================================
           SYNONYMS
        ================================================= */

        .synonymList {
          display: flex;

          flex-wrap: wrap;

          justify-content: center;

          gap: 12px;
        }

        .synonymChip {
          min-width: 115px;

          padding: 10px 16px;

          border: 2px solid #669ab1;
          border-radius: 8px;

          background:
            linear-gradient(
              180deg,
              #f3f3f3,
              #d6dadc
            );

          box-shadow:
            inset 0 2px 2px #ffffff,
            0 4px 0 #7c898f;

          color: #075779;

          font-weight: 700;
        }

        .autoText {
          margin-top: 18px;

          color: #687277;

          font-size: 13px;

          font-weight: 700;
        }

        /* =================================================
           ANSWERS — OCH KULRANG 3D
        ================================================= */

        .answersGrid {
          display: grid;

          grid-template-columns: repeat(2, 1fr);

          gap: 16px;
        }

        .answerButton {
          min-height: 60px;

          padding: 12px 18px;

          border-radius: 10px;

          font-size: 17px;
        }

        .correctAnswer {
          border-color: #34824c;

          color: #175c2b;

          background:
            linear-gradient(
              180deg,
              #f1fff4,
              #bceac8 50%,
              #8bd29d
            );

          box-shadow:
            inset 0 3px 2px #ffffff,
            0 5px 0 #4e9b62;
        }

        .wrongAnswer {
          border-color: #a44c4c;

          color: #812323;

          background:
            linear-gradient(
              180deg,
              #fff5f5,
              #f2c0c0 50%,
              #e59595
            );

          box-shadow:
            inset 0 3px 2px #ffffff,
            0 5px 0 #a75959;
        }

        /* =================================================
           WRITE
        ================================================= */

        .writeRow {
          display: grid;

          grid-template-columns: 1fr 180px;

          gap: 15px;
        }

        .writeRow input {
          width: 100%;

          min-height: 52px;

          padding: 10px 16px;

          border: 2px solid #838e93;
          border-radius: 9px;

          outline: none;

          background:
            linear-gradient(
              180deg,
              #ffffff,
              #f0f0f0
            );

          box-shadow:
            inset 0 3px 5px rgba(0, 0, 0, 0.09),
            0 3px 0 #9aa2a6;

          color: #203844;

          font-size: 17px;

          font-weight: 700;
        }

        .checkButton {
          margin: 0;
        }

        /* =================================================
           RESULT
        ================================================= */

        .resultBox {
          margin-top: 18px;

          padding: 12px 16px;

          border-radius: 9px;

          font-size: 15px;

          font-weight: 700;
        }

        .correctResult {
          border: 2px solid #68a978;

          color: #216535;

          background: #e9ffed;
        }

        .wrongResult {
          border: 2px solid #bf7272;

          color: #8b2626;

          background: #fff0f0;
        }

        /* =================================================
           BOTTOM NAVIGATION
           TEPA BILAN MOS 3D
        ================================================= */

        .bottomNavigation {
          margin-top: 22px;

          display: grid;

          grid-template-columns: 1fr 1.35fr 1fr;

          gap: 15px;
        }

        .navButton,
        .laterButton {
          width: 100%;

          min-height: 52px;

          border-radius: 10px;

          font-size: 14px;
        }

        .laterButton {
          margin: 0;
        }

        /* =================================================
           EMPTY
        ================================================= */

        .emptyPanel {
          padding: 35px;

          text-align: center;

          border: 3px solid #3e464a;
          border-radius: 18px;

          color: #ffffff;

          background:
            linear-gradient(
              145deg,
              #686e71,
              #444a4d
            );

          box-shadow:
            inset 0 3px 3px rgba(255, 255, 255, 0.17),
            0 9px 0 #303639,
            0 15px 20px rgba(0, 0, 0, 0.18);

          font-size: 18px;

          font-weight: 700;
        }

        button:disabled {
          cursor: not-allowed;

          opacity: 0.72;
        }

        /* =================================================
           TABLET
        ================================================= */

        @media (max-width: 900px) {
          .topPanel {
            grid-template-columns: 150px 1fr 120px;
          }

          .modeRow {
            grid-template-columns: repeat(3, 1fr);
          }

          .wordCard {
            padding-left: 25px;
            padding-right: 25px;
          }
        }

        /* =================================================
           MOBILE
        ================================================= */

        @media (max-width: 650px) {
          .page {
            padding: 15px 9px 50px;
          }

          .topPanel {
            grid-template-columns: 1fr;

            padding: 14px;
          }

          .backButton,
          .totalBox {
            width: 100%;
          }

          .headerCenter {
            order: -1;
          }

          .controlPanel {
            padding: 12px;
          }

          .modeRow {
            grid-template-columns: repeat(2, 1fr);
          }

          .statsRow {
            grid-template-columns: repeat(2, 1fr);
          }

          .learningPanel {
            padding: 12px;
          }

          .progressRow {
            font-size: 12px;
          }

          .wordCard {
            min-height: 0;

            padding: 75px 13px 24px;
          }

          .iconButtons {
            top: 14px;

            right: 50%;

            transform: translateX(50%);
          }

          .translationBox {
            width: 100%;
          }

          .answersGrid {
            grid-template-columns: 1fr;
          }

          .writeRow {
            grid-template-columns: 1fr;
          }

          .bottomNavigation {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
