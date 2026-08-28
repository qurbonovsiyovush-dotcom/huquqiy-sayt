"use client";

import { useEffect, useMemo, useState } from "react";

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

export default function SynonymsLearningPage() {
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

  useEffect(() => {
    setSpeechSupported(
      typeof window !== "undefined" &&
        "speechSynthesis" in window
    );

    loadWords();
    loadProgress();
  }, []);

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        setProgress({});
        return;
      }

      const parsed = JSON.parse(raw);

      if (
        parsed &&
        typeof parsed === "object"
      ) {
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

  async function loadWords() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(API, {
        cache: "no-store",
      });

      const data: ApiResponse =
        await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message ||
            "Sinonimlarni yuklab bo‘lmadi."
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

  const wrongIds = useMemo(() => {
    return new Set(
      Object.entries(progress)
        .filter(
          ([, item]) =>
            item.wrong > 0
        )
        .map(([id]) => id)
    );
  }, [progress]);

  const difficultIds = useMemo(() => {
    return new Set(
      Object.entries(progress)
        .filter(
          ([, item]) =>
            item.difficult
        )
        .map(([id]) => id)
    );
  }, [progress]);

  const visibleWords = useMemo(() => {
    if (mode === "wrong") {
      return words.filter((item) =>
        wrongIds.has(item.id)
      );
    }

    if (mode === "difficult") {
      return words.filter((item) =>
        difficultIds.has(item.id)
      );
    }

    return words;
  }, [
    words,
    mode,
    wrongIds,
    difficultIds,
  ]);

  const current =
    visibleWords.length > 0
      ? visibleWords[
          Math.min(
            index,
            visibleWords.length - 1
          )
        ]
      : null;

  const currentProgress =
    current
      ? progress[current.id] || {
          correct: 0,
          wrong: 0,
          difficult: false,
          learned: false,
        }
      : null;

  const totalCorrect = useMemo(() => {
    return Object.values(progress).reduce(
      (sum, item) =>
        sum + item.correct,
      0
    );
  }, [progress]);

  const totalWrong = useMemo(() => {
    return Object.values(progress).reduce(
      (sum, item) =>
        sum + item.wrong,
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
          (totalCorrect /
            (totalCorrect +
              totalWrong)) *
            100
        )
      : 0;

  function resetCardState() {
    setRevealed(false);
    setSelectedAnswer("");
    setChoiceResult("");
    setWriteAnswer("");
    setWriteResult("");
  }

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setIndex(0);
    resetCardState();
  }

  function next() {
    if (
      index <
      visibleWords.length - 1
    ) {
      setIndex((old) => old + 1);
    } else {
      setIndex(0);
    }

    resetCardState();
  }

  function previous() {
    if (index > 0) {
      setIndex((old) => old - 1);
    } else {
      setIndex(
        Math.max(
          visibleWords.length - 1,
          0
        )
      );
    }

    resetCardState();
  }

  function markResult(
    item: SynonymWord,
    correct: boolean
  ) {
    const old =
      progress[item.id] || {
        correct: 0,
        wrong: 0,
        difficult: false,
        learned: false,
      };

    const nextItem: ProgressItem = {
      ...old,
      correct:
        old.correct +
        (correct ? 1 : 0),
      wrong:
        old.wrong +
        (correct ? 0 : 1),
      learned:
        correct
          ? old.correct + 1 >= 3
          : old.learned,
    };

    saveProgress({
      ...progress,
      [item.id]: nextItem,
    });
  }

  function toggleDifficult() {
    if (!current) return;

    const old =
      progress[current.id] || {
        correct: 0,
        wrong: 0,
        difficult: false,
        learned: false,
      };

    saveProgress({
      ...progress,
      [current.id]: {
        ...old,
        difficult:
          !old.difficult,
      },
    });
  }

  const choiceOptions = useMemo(() => {
    if (!current) return [];

    const correct =
      current.synonyms[0];

    const wrongPool = words
      .filter(
        (item) =>
          item.id !== current.id
      )
      .flatMap(
        (item) => item.synonyms
      )
      .filter(
        (item) =>
          normalize(item) !==
          normalize(correct)
      );

    const wrongAnswers = shuffle(
      Array.from(
        new Set(wrongPool)
      )
    ).slice(0, 3);

    return shuffle([
      correct,
      ...wrongAnswers,
    ]);
  }, [current, words]);

  function checkChoice(
    answer: string
  ) {
    if (
      !current ||
      choiceResult
    ) {
      return;
    }

    const accepted =
      current.synonyms.map(
        normalize
      );

    const correct =
      accepted.includes(
        normalize(answer)
      );

    setSelectedAnswer(answer);
    setChoiceResult(
      correct ? "correct" : "wrong"
    );

    markResult(
      current,
      correct
    );
  }

  function checkWrite() {
    if (
      !current ||
      writeResult
    ) {
      return;
    }

    const answer =
      normalize(writeAnswer);

    if (!answer) return;

    const accepted =
      current.synonyms.map(
        normalize
      );

    const correct =
      accepted.includes(answer);

    setWriteResult(
      correct ? "correct" : "wrong"
    );

    markResult(
      current,
      correct
    );
  }

  function speakWord() {
    if (
      !current ||
      !speechSupported
    ) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance =
      new SpeechSynthesisUtterance(
        current.word
      );

    utterance.lang = "en-US";
    utterance.rate = 0.85;

    window.speechSynthesis.speak(
      utterance
    );
  }

  if (loading) {
    return (
      <main className="page">
        <div className="loadingBox">
          Synonyms yuklanmoqda...
        </div>

        <style jsx>{`
          .page {
            min-height: 100vh;
            display: grid;
            place-items: center;
            font-family:
              "Bell MT",
              "Times New Roman",
              serif;
            background: #eef4f6;
          }

          .loadingBox {
            font-size: 25px;
            font-weight: 700;
            color: #07537d;
          }
        `}</style>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page">
        <div className="errorBox">
          {error}
        </div>

        <style jsx>{`
          .page {
            min-height: 100vh;
            display: grid;
            place-items: center;
            font-family:
              "Bell MT",
              "Times New Roman",
              serif;
            background: #eef4f6;
          }

          .errorBox {
            padding: 20px 30px;
            border-radius: 14px;
            border: 2px solid #b84a4a;
            background: #fff0f0;
            color: #8c2020;
            font-weight: 700;
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="topPanel">
        <button
          className="backButton"
          onClick={() => {
            window.location.href =
              "/qollanmalar/dictionaries";
          }}
        >
          ← Lug‘atlar
        </button>

        <div className="titleWrap">
          <h1>Synonyms</h1>

          <div className="subtitle">
            Sinonimlarni yodlash
          </div>
        </div>

        <div className="counterBox">
          <strong>
            {visibleWords.length}
          </strong>

          <span>
            Jami
          </span>
        </div>
      </section>

      <section className="toolbar">
        <button
          className={
            mode === "learn"
              ? "modeButton active"
              : "modeButton"
          }
          onClick={() =>
            changeMode("learn")
          }
        >
          O‘rganish
        </button>

        <button
          className={
            mode === "choice"
              ? "modeButton active"
              : "modeButton"
          }
          onClick={() =>
            changeMode("choice")
          }
        >
          Tanlash
        </button>

        <button
          className={
            mode === "write"
              ? "modeButton active"
              : "modeButton"
          }
          onClick={() =>
            changeMode("write")
          }
        >
          Yozish
        </button>

        <button
          className={
            mode === "wrong"
              ? "modeButton active"
              : "modeButton"
          }
          onClick={() =>
            changeMode("wrong")
          }
        >
          Xatolarim
        </button>

        <button
          className={
            mode === "difficult"
              ? "modeButton active"
              : "modeButton"
          }
          onClick={() =>
            changeMode(
              "difficult"
            )
          }
        >
          ★ Qiyinlar
        </button>
      </section>

      <section className="statsGrid">
        <div className="statCard">
          <span>
            To‘g‘ri
          </span>

          <strong>
            {totalCorrect}
          </strong>
        </div>

        <div className="statCard">
          <span>
            Xato
          </span>

          <strong>
            {totalWrong}
          </strong>
        </div>

        <div className="statCard">
          <span>
            Yodlangan
          </span>

          <strong>
            {learnedCount}
          </strong>
        </div>

        <div className="statCard">
          <span>
            Natija
          </span>

          <strong>
            {accuracy}%
          </strong>
        </div>
      </section>

      {visibleWords.length === 0 ? (
        <section className="emptyBox">
          {mode === "wrong"
            ? "Hozircha xato qilingan so‘zlar yo‘q."
            : mode ===
                "difficult"
              ? "Hozircha qiyin deb belgilangan so‘zlar yo‘q."
              : "So‘zlar mavjud emas."}
        </section>
      ) : current ? (
        <section className="learningPanel">
          <div className="progressLine">
            <span>
              {index + 1} /{" "}
              {visibleWords.length}
            </span>

            <span>
              To‘g‘ri:{" "}
              {currentProgress?.correct ||
                0}
              {" · "}
              Xato:{" "}
              {currentProgress?.wrong ||
                0}
            </span>
          </div>

          <div className="wordCard">
            <div className="wordTop">
              <div>
                <div className="smallLabel">
                  Inglizcha so‘z
                </div>

                <h2>
                  {current.word}
                </h2>
              </div>

              <div className="topCardButtons">
                <button
                  className="speakerButton"
                  onClick={speakWord}
                  disabled={
                    !speechSupported
                  }
                >
                  🔊
                </button>

                <button
                  className={
                    currentProgress
                      ?.difficult
                      ? "starButton starActive"
                      : "starButton"
                  }
                  onClick={
                    toggleDifficult
                  }
                >
                  ★
                </button>
              </div>
            </div>

            <div className="uzbekBox">
              {current.uzbek}
            </div>

            {mode === "learn" && (
              <>
                {!revealed ? (
                  <button
                    className="revealButton"
                    onClick={() =>
                      setRevealed(
                        true
                      )
                    }
                  >
                    Sinonimlarni
                    ko‘rsatish
                  </button>
                ) : (
                  <div className="synonymsBox">
                    {current.synonyms.map(
                      (
                        synonym,
                        idx
                      ) => (
                        <span
                          key={`${synonym}-${idx}`}
                          className="synonymBadge"
                        >
                          {synonym}
                        </span>
                      )
                    )}
                  </div>
                )}
              </>
            )}

            {mode === "choice" && (
              <div className="choiceBox">
                <div className="questionText">
                  Qaysi biri{" "}
                  <strong>
                    {current.word}
                  </strong>{" "}
                  so‘zining sinonimi?
                </div>

                <div className="choiceGrid">
                  {choiceOptions.map(
                    (option) => {
                      let className =
                        "choiceButton";

                      if (
                        choiceResult
                      ) {
                        const isCorrect =
                          current.synonyms
                            .map(
                              normalize
                            )
                            .includes(
                              normalize(
                                option
                              )
                            );

                        if (
                          isCorrect
                        ) {
                          className +=
                            " correctAnswer";
                        } else if (
                          selectedAnswer ===
                          option
                        ) {
                          className +=
                            " wrongAnswer";
                        }
                      }

                      return (
                        <button
                          key={option}
                          className={
                            className
                          }
                          onClick={() =>
                            checkChoice(
                              option
                            )
                          }
                          disabled={
                            Boolean(
                              choiceResult
                            )
                          }
                        >
                          {option}
                        </button>
                      );
                    }
                  )}
                </div>

                {choiceResult && (
                  <div
                    className={
                      choiceResult ===
                      "correct"
                        ? "resultMessage correctMessage"
                        : "resultMessage wrongMessage"
                    }
                  >
                    {choiceResult ===
                    "correct"
                      ? "✓ To‘g‘ri!"
                      : `✗ Xato. To‘g‘ri javoblardan biri: ${current.synonyms[0]}`}
                  </div>
                )}
              </div>
            )}

            {mode === "write" && (
              <div className="writeBox">
                <div className="questionText">
                  <strong>
                    {current.word}
                  </strong>{" "}
                  so‘zining bitta
                  sinonimini yozing.
                </div>

                <div className="writeRow">
                  <input
                    value={
                      writeAnswer
                    }
                    onChange={(e) =>
                      setWriteAnswer(
                        e.target
                          .value
                      )
                    }
                    onKeyDown={(
                      e
                    ) => {
                      if (
                        e.key ===
                        "Enter"
                      ) {
                        checkWrite();
                      }
                    }}
                    placeholder="Sinonim yozing..."
                    disabled={
                      Boolean(
                        writeResult
                      )
                    }
                  />

                  <button
                    className="checkButton"
                    onClick={
                      checkWrite
                    }
                    disabled={
                      Boolean(
                        writeResult
                      ) ||
                      !writeAnswer.trim()
                    }
                  >
                    Tekshirish
                  </button>
                </div>

                {writeResult && (
                  <div
                    className={
                      writeResult ===
                      "correct"
                        ? "resultMessage correctMessage"
                        : "resultMessage wrongMessage"
                    }
                  >
                    {writeResult ===
                    "correct"
                      ? "✓ To‘g‘ri!"
                      : `✗ Xato. Javoblar: ${current.synonyms.join(
                          ", "
                        )}`}
                  </div>
                )}
              </div>
            )}

            {(mode === "wrong" ||
              mode ===
                "difficult") && (
              <div className="reviewBox">
                <div className="smallLabel">
                  Sinonimlar
                </div>

                <div className="synonymsBox">
                  {current.synonyms.map(
                    (
                      synonym,
                      idx
                    ) => (
                      <span
                        key={`${synonym}-${idx}`}
                        className="synonymBadge"
                      >
                        {synonym}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="navigation">
            <button
              className="navButton"
              onClick={previous}
            >
              ← Oldingi
            </button>

            <button
              className="laterButton"
              onClick={() => {
                toggleDifficult();
                next();
              }}
            >
              Keyinroq yana
              ko‘rsat
            </button>

            <button
              className="navButton"
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

        :global(body) {
          margin: 0;
        }

        button,
        input {
          font-family:
            "Bell MT",
            "Times New Roman",
            serif;
        }

        .page {
          min-height: 100vh;

          padding:
            28px 22px
            70px;

          background:
            radial-gradient(
              circle at top,
              #ffffff,
              #eef3f6 55%,
              #e4ebee
            );

          color: #102f40;

          font-family:
            "Bell MT",
            "Times New Roman",
            serif;
        }

        .topPanel {
          width:
            min(1180px, 100%);

          margin:
            0 auto 28px;

          padding:
            22px 26px;

          display: flex;

          align-items: center;

          justify-content:
            space-between;

          gap: 20px;

          border:
            3px solid #0c4969;

          border-radius: 22px;

          background:
            linear-gradient(
              180deg,
              #9be3ff,
              #5fc5ee 55%,
              #359dcb
            );

          box-shadow:
            inset 0 4px 3px
              rgba(
                255,
                255,
                255,
                0.8
              ),
            0 9px 0 #0b4e6d,
            0 15px 22px
              rgba(
                0,
                0,
                0,
                0.2
              );
        }

        .titleWrap {
          flex: 1;
          text-align: center;
        }

        .titleWrap h1 {
          margin: 0;

          font-size:
            clamp(
              30px,
              4vw,
              42px
            );

          color: #06456b;
        }

        .subtitle {
          margin-top: 5px;

          font-size: 15px;

          font-weight: 700;

          color: #23566d;
        }

        .backButton,
        .counterBox {
          min-width: 150px;

          min-height: 54px;

          border:
            2px solid #5d686e;

          border-radius: 12px;

          background:
            linear-gradient(
              #ffffff,
              #dadada
            );

          box-shadow:
            inset 0 3px 2px
              white,
            0 6px 0 #5f6a70;
        }

        .backButton {
          padding:
            10px 18px;

          cursor: pointer;

          font-size: 15px;

          font-weight: 700;
        }

        .counterBox {
          padding:
            8px 16px;

          display: flex;

          flex-direction:
            column;

          align-items: center;

          justify-content:
            center;
        }

        .counterBox strong {
          color: #0879af;

          font-size: 24px;
        }

        .counterBox span {
          font-size: 12px;

          font-weight: 700;
        }

        .toolbar {
          width:
            min(1180px, 100%);

          margin:
            0 auto 22px;

          padding: 16px;

          display: grid;

          grid-template-columns:
            repeat(5, 1fr);

          gap: 12px;

          border:
            2px solid #606a6f;

          border-radius: 17px;

          background:
            linear-gradient(
              #6a7073,
              #4a5053
            );

          box-shadow:
            0 7px 0 #353a3d,
            0 11px 18px
              rgba(
                0,
                0,
                0,
                0.18
              );
        }

        .modeButton {
          min-height: 48px;

          border:
            2px solid #a8b0b3;

          border-radius: 10px;

          background:
            linear-gradient(
              white,
              #d9d9d9
            );

          box-shadow:
            0 4px 0 #7c8589;

          font-weight: 700;

          cursor: pointer;
        }

        .modeButton.active {
          border-color: #176b91;

          background:
            linear-gradient(
              #c7efff,
              #63c5ec
            );

          color: #064c70;

          box-shadow:
            0 4px 0 #146181;
        }

        .statsGrid {
          width:
            min(1180px, 100%);

          margin:
            0 auto 24px;

          display: grid;

          grid-template-columns:
            repeat(4, 1fr);

          gap: 14px;
        }

        .statCard {
          padding:
            14px 18px;

          text-align: center;

          border:
            2px solid #c0c7ca;

          border-radius: 13px;

          background:
            linear-gradient(
              #ffffff,
              #e7e7e7
            );

          box-shadow:
            0 5px 0 #858e92;
        }

        .statCard span {
          display: block;

          font-size: 14px;

          font-weight: 700;
        }

        .statCard strong {
          display: block;

          margin-top: 4px;

          color: #0573a8;

          font-size: 25px;
        }

        .learningPanel,
        .emptyBox {
          width:
            min(980px, 100%);

          margin: 0 auto;

          padding: 24px;

          border:
            3px solid #4b5357;

          border-radius: 22px;

          background:
            linear-gradient(
              145deg,
              #656b6e,
              #474d50
            );

          box-shadow:
            inset 0 3px 3px
              rgba(
                255,
                255,
                255,
                0.15
              ),
            0 10px 0 #31373a,
            0 16px 24px
              rgba(
                0,
                0,
                0,
                0.2
              );
        }

        .emptyBox {
          color: white;

          text-align: center;

          font-size: 20px;

          font-weight: 700;
        }

        .progressLine {
          margin-bottom: 18px;

          display: flex;

          justify-content:
            space-between;

          color: white;

          font-weight: 700;
        }

        .wordCard {
          padding:
            28px 30px;

          border:
            2px solid #d9dddf;

          border-radius: 18px;

          background:
            linear-gradient(
              #ffffff,
              #ededed
            );

          box-shadow:
            inset 0 4px 4px
              white,
            0 8px 0 #868f93,
            0 12px 18px
              rgba(
                0,
                0,
                0,
                0.18
              );
        }

        .wordTop {
          display: flex;

          align-items:
            flex-start;

          justify-content:
            space-between;

          gap: 20px;
        }

        .smallLabel {
          margin-bottom: 5px;

          color: #5b656a;

          font-size: 14px;

          font-weight: 700;
        }

        .wordCard h2 {
          margin: 0;

          color: #05679a;

          font-size:
            clamp(
              34px,
              6vw,
              52px
            );
        }

        .topCardButtons {
          display: flex;

          gap: 10px;
        }

        .speakerButton,
        .starButton {
          width: 48px;

          height: 45px;

          border:
            2px solid #6d787d;

          border-radius: 9px;

          background:
            linear-gradient(
              white,
              #dadada
            );

          box-shadow:
            0 4px 0 #747d81;

          cursor: pointer;

          font-size: 20px;
        }

        .starActive {
          background:
            linear-gradient(
              #fff6bc,
              #f0c84d
            );
        }

        .uzbekBox {
          margin-top: 20px;

          padding:
            15px 18px;

          border:
            2px solid #87b8cf;

          border-radius: 11px;

          background:
            linear-gradient(
              #eefaff,
              #ceeafa
            );

          color: #164c66;

          font-size: 22px;

          font-weight: 700;
        }

        .revealButton,
        .checkButton {
          margin-top: 24px;

          min-height: 48px;

          padding:
            11px 22px;

          border:
            2px solid #146487;

          border-radius: 10px;

          background:
            linear-gradient(
              #caefff,
              #5fc2e8
            );

          box-shadow:
            0 5px 0 #155f7e;

          color: #064a6e;

          font-size: 16px;

          font-weight: 700;

          cursor: pointer;
        }

        .synonymsBox {
          margin-top: 24px;

          display: flex;

          flex-wrap: wrap;

          gap: 10px;
        }

        .synonymBadge {
          padding:
            9px 13px;

          border:
            1px solid #4e9fc3;

          border-radius: 8px;

          background:
            linear-gradient(
              white,
              #d9f2ff
            );

          color: #07587f;

          font-weight: 700;
        }

        .choiceBox,
        .writeBox,
        .reviewBox {
          margin-top: 28px;
        }

        .questionText {
          margin-bottom: 18px;

          font-size: 19px;

          font-weight: 700;

          color: #27383f;
        }

        .choiceGrid {
          display: grid;

          grid-template-columns:
            repeat(2, 1fr);

          gap: 12px;
        }

        .choiceButton {
          min-height: 55px;

          padding:
            12px 15px;

          border:
            2px solid #839097;

          border-radius: 10px;

          background:
            linear-gradient(
              white,
              #dddddd
            );

          box-shadow:
            0 4px 0 #7b8589;

          font-size: 17px;

          font-weight: 700;

          cursor: pointer;
        }

        .correctAnswer {
          border-color: #3e9157;

          background:
            linear-gradient(
              #ecfff1,
              #9ee2af
            );
        }

        .wrongAnswer {
          border-color: #a94c4c;

          background:
            linear-gradient(
              #fff2f2,
              #efa3a3
            );
        }

        .resultMessage {
          margin-top: 17px;

          padding:
            13px 16px;

          border-radius: 9px;

          font-weight: 700;
        }

        .correctMessage {
          border:
            1px solid #6db17b;

          background: #e9ffed;

          color: #226d34;
        }

        .wrongMessage {
          border:
            1px solid #c57a7a;

          background: #fff0f0;

          color: #8b2727;
        }

        .writeRow {
          display: grid;

          grid-template-columns:
            1fr auto;

          gap: 12px;
        }

        .writeRow input {
          width: 100%;

          min-height: 50px;

          padding:
            10px 15px;

          border:
            2px solid #899499;

          border-radius: 9px;

          outline: none;

          background: white;

          font-size: 17px;
        }

        .checkButton {
          margin-top: 0;
        }

        .navigation {
          margin-top: 24px;

          display: grid;

          grid-template-columns:
            1fr 1.3fr 1fr;

          gap: 12px;
        }

        .navButton,
        .laterButton {
          min-height: 50px;

          padding:
            10px 15px;

          border-radius: 10px;

          font-weight: 700;

          cursor: pointer;
        }

        .navButton {
          border:
            2px solid #647078;

          background:
            linear-gradient(
              white,
              #d6d6d6
            );

          box-shadow:
            0 5px 0 #747d81;
        }

        .laterButton {
          border:
            2px solid #165f80;

          background:
            linear-gradient(
              #c9efff,
              #65c4e7
            );

          box-shadow:
            0 5px 0 #145c78;

          color: #064d6d;
        }

        button:active {
          transform:
            translateY(3px);

          box-shadow: none;
        }

        button:disabled {
          opacity: 0.6;

          cursor:
            not-allowed;
        }

        @media (
          max-width: 800px
        ) {
          .page {
            padding:
              18px 10px
              50px;
          }

          .topPanel {
            flex-direction:
              column;
          }

          .backButton,
          .counterBox,
          .titleWrap {
            width: 100%;
          }

          .toolbar {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .statsGrid {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .learningPanel {
            padding: 15px;
          }

          .wordCard {
            padding:
              22px 16px;
          }

          .choiceGrid {
            grid-template-columns:
              1fr;
          }

          .writeRow {
            grid-template-columns:
              1fr;
          }

          .navigation {
            grid-template-columns:
              1fr;
          }
        }
      `}</style>
    </main>
  );
}
