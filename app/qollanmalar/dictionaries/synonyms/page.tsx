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

const STORAGE_KEY =
  "qurbonov_synonyms_progress";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function shuffle<T>(items: T[]) {
  const copy = [...items];

  for (
    let i = copy.length - 1;
    i > 0;
    i--
  ) {
    const j = Math.floor(
      Math.random() * (i + 1)
    );

    [copy[i], copy[j]] = [
      copy[j],
      copy[i],
    ];
  }

  return copy;
}

export default function SynonymsLearningPage() {
  const [words, setWords] =
    useState<SynonymWord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [mode, setMode] =
    useState<Mode>("learn");

  const [index, setIndex] =
    useState(0);

  const [progress, setProgress] =
    useState<ProgressMap>({});

  const [revealed, setRevealed] =
    useState(false);

  const [
    selectedAnswer,
    setSelectedAnswer,
  ] = useState("");

  const [
    choiceResult,
    setChoiceResult,
  ] = useState<
    "correct" | "wrong" | ""
  >("");

  const [
    writeAnswer,
    setWriteAnswer,
  ] = useState("");

  const [
    writeResult,
    setWriteResult,
  ] = useState<
    "correct" | "wrong" | ""
  >("");

  const [
    speechSupported,
    setSpeechSupported,
  ] = useState(false);

  const timerRef =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

  /* ==============================
     INITIAL LOAD
  ============================== */

  useEffect(() => {
    setSpeechSupported(
      typeof window !== "undefined" &&
        "speechSynthesis" in window
    );

    loadWords();
    loadProgress();

    return () => {
      if (timerRef.current) {
        clearTimeout(
          timerRef.current
        );
      }
    };
  }, []);

  /* ==============================
     PROGRESS
  ============================== */

  function loadProgress() {
    try {
      const raw =
        localStorage.getItem(
          STORAGE_KEY
        );

      if (!raw) {
        setProgress({});
        return;
      }

      const parsed =
        JSON.parse(raw);

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

  function saveProgress(
    next: ProgressMap
  ) {
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

  /* ==============================
     LOAD WORDS
  ============================== */

  async function loadWords() {
    try {
      setLoading(true);
      setError("");

      const response =
        await fetch(API, {
          cache: "no-store",
        });

      const data: ApiResponse =
        await response.json();

      if (
        !response.ok ||
        !data.ok
      ) {
        throw new Error(
          data.message ||
            "Sinonimlarni yuklab bo‘lmadi."
        );
      }

      setWords(
        data.words || []
      );
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

  /* ==============================
     FILTERS
  ============================== */

  const wrongIds = useMemo(
    () =>
      new Set(
        Object.entries(
          progress
        )
          .filter(
            ([, item]) =>
              item.wrong > 0
          )
          .map(([id]) => id)
      ),
    [progress]
  );

  const difficultIds =
    useMemo(
      () =>
        new Set(
          Object.entries(
            progress
          )
            .filter(
              ([, item]) =>
                item.difficult
            )
            .map(([id]) => id)
        ),
      [progress]
    );

  const visibleWords =
    useMemo(() => {
      if (mode === "wrong") {
        return words.filter(
          (item) =>
            wrongIds.has(
              item.id
            )
        );
      }

      if (
        mode === "difficult"
      ) {
        return words.filter(
          (item) =>
            difficultIds.has(
              item.id
            )
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
            visibleWords.length -
              1
          )
        ]
      : null;

  const currentProgress =
    current
      ? progress[
          current.id
        ] || {
          correct: 0,
          wrong: 0,
          difficult: false,
          learned: false,
        }
      : null;

  /* ==============================
     STATISTICS
  ============================== */

  const totalCorrect =
    useMemo(
      () =>
        Object.values(
          progress
        ).reduce(
          (sum, item) =>
            sum +
            item.correct,
          0
        ),
      [progress]
    );

  const totalWrong =
    useMemo(
      () =>
        Object.values(
          progress
        ).reduce(
          (sum, item) =>
            sum +
            item.wrong,
          0
        ),
      [progress]
    );

  const learnedCount =
    useMemo(
      () =>
        Object.values(
          progress
        ).filter(
          (item) =>
            item.learned
        ).length,
      [progress]
    );

  const accuracy =
    totalCorrect +
      totalWrong >
    0
      ? Math.round(
          (totalCorrect /
            (totalCorrect +
              totalWrong)) *
            100
        )
      : 0;

  /* ==============================
     CARD STATE
  ============================== */

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(
        timerRef.current
      );

      timerRef.current =
        null;
    }
  }

  function resetCardState() {
    clearTimer();

    setRevealed(false);

    setSelectedAnswer("");

    setChoiceResult("");

    setWriteAnswer("");

    setWriteResult("");
  }

  function changeMode(
    nextMode: Mode
  ) {
    resetCardState();

    setMode(nextMode);

    setIndex(0);
  }

  /* ==============================
     NAVIGATION
  ============================== */

  function next() {
    clearTimer();

    setRevealed(false);

    setSelectedAnswer("");

    setChoiceResult("");

    setWriteAnswer("");

    setWriteResult("");

    setIndex((old) => {
      if (
        visibleWords.length ===
        0
      ) {
        return 0;
      }

      if (
        old <
        visibleWords.length -
          1
      ) {
        return old + 1;
      }

      return 0;
    });
  }

  function previous() {
    resetCardState();

    setIndex((old) => {
      if (
        visibleWords.length ===
        0
      ) {
        return 0;
      }

      if (old > 0) {
        return old - 1;
      }

      return (
        visibleWords.length -
        1
      );
    });
  }

  function autoNext(
    delay: number
  ) {
    clearTimer();

    timerRef.current =
      setTimeout(() => {
        next();
      }, delay);
  }

  /* ==============================
     PROGRESS RESULT
  ============================== */

  function markResult(
    item: SynonymWord,
    correct: boolean
  ) {
    const old =
      progress[
        item.id
      ] || {
        correct: 0,
        wrong: 0,
        difficult: false,
        learned: false,
      };

    const nextCorrect =
      old.correct +
      (correct ? 1 : 0);

    const nextItem: ProgressItem =
      {
        ...old,

        correct:
          nextCorrect,

        wrong:
          old.wrong +
          (correct ? 0 : 1),

        learned:
          nextCorrect >= 3
            ? true
            : old.learned,
      };

    saveProgress({
      ...progress,

      [item.id]:
        nextItem,
    });
  }

  /* ==============================
     DIFFICULT
  ============================== */

  function toggleDifficult() {
    if (!current) return;

    const old =
      progress[
        current.id
      ] || {
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

  /* ==============================
     LEARNING MODE
  ============================== */

  function revealSynonyms() {
    if (!current) return;

    setRevealed(true);

    /*
      Sinonimlar 2.2 soniya
      ko‘rinadi va keyingi
      so‘zga avtomatik o‘tadi.
    */

    autoNext(2200);
  }

  /* ==============================
     CHOICE OPTIONS
  ============================== */

  const choiceOptions =
    useMemo(() => {
      if (!current) {
        return [];
      }

      const correct =
        current.synonyms[0];

      const wrongPool =
        words
          .filter(
            (item) =>
              item.id !==
              current.id
          )
          .flatMap(
            (item) =>
              item.synonyms
          )
          .filter(
            (item) =>
              normalize(
                item
              ) !==
              normalize(
                correct
              )
          );

      const wrongAnswers =
        shuffle(
          Array.from(
            new Set(
              wrongPool
            )
          )
        ).slice(0, 3);

      return shuffle([
        correct,
        ...wrongAnswers,
      ]);
    }, [
      current,
      words,
    ]);

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

    setSelectedAnswer(
      answer
    );

    setChoiceResult(
      correct
        ? "correct"
        : "wrong"
    );

    markResult(
      current,
      correct
    );

    /*
      Javobni 0.9 soniya
      ko‘rsatadi va keyingiga
      avtomatik o‘tadi.
    */

    autoNext(900);
  }

  /* ==============================
     WRITE MODE
  ============================== */

  function checkWrite() {
    if (
      !current ||
      writeResult
    ) {
      return;
    }

    const answer =
      normalize(
        writeAnswer
      );

    if (!answer) return;

    const accepted =
      current.synonyms.map(
        normalize
      );

    const correct =
      accepted.includes(
        answer
      );

    setWriteResult(
      correct
        ? "correct"
        : "wrong"
    );

    markResult(
      current,
      correct
    );

    autoNext(900);
  }

  /* ==============================
     SPEECH
  ============================== */

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

    utterance.lang =
      "en-US";

    utterance.rate =
      0.85;

    window.speechSynthesis.speak(
      utterance
    );
  }

  /* ==============================
     LOADING
  ============================== */

  if (loading) {
    return (
      <main className="centerPage">
        <div className="loading3d">
          Synonyms yuklanmoqda...
        </div>

        <style jsx>{`
          .centerPage {
            min-height: 100vh;

            display: grid;

            place-items: center;

            background:
              #eef3f6;

            font-family:
              "Bell MT",
              "Times New Roman",
              serif;
          }

          .loading3d {
            padding:
              25px 40px;

            border:
              3px solid #075277;

            border-radius:
              16px;

            background:
              linear-gradient(
                #c7f0ff,
                #5dc2e9
              );

            box-shadow:
              0 8px 0
                #075274,
              0 15px 25px
                rgba(
                  0,
                  0,
                  0,
                  0.2
                );

            color:
              #064a6d;

            font-size:
              24px;

            font-weight:
              700;
          }
        `}</style>
      </main>
    );
  }

  if (error) {
    return (
      <main className="centerPage">
        <div className="error3d">
          {error}
        </div>

        <style jsx>{`
          .centerPage {
            min-height: 100vh;

            display: grid;

            place-items: center;

            background:
              #eef3f6;

            font-family:
              "Bell MT",
              "Times New Roman",
              serif;
          }

          .error3d {
            padding:
              22px 35px;

            border:
              2px solid
                #a74747;

            border-radius:
              14px;

            background:
              #fff0f0;

            box-shadow:
              0 6px 0
                #8b4545;

            color:
              #8c2020;

            font-weight:
              700;
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="page">
      {/* =========================
          HEADER
      ========================== */}

      <header className="top3d">
        <button
          className="back3d"
          onClick={() => {
            window.location.href =
              "/qollanmalar/dictionaries";
          }}
        >
          ← Lug‘atlar
        </button>

        <div className="headerCenter">
          <h1>
            Synonyms
          </h1>

          <span>
            Sinonimlarni yodlash
          </span>
        </div>

        <div className="total3d">
          <strong>
            {words.length}
          </strong>

          <span>
            Jami
          </span>
        </div>
      </header>

      {/* =========================
          CONTROL PANEL
      ========================== */}

      <section className="control3d">
        <div className="modeRow">
          <button
            className={
              mode === "learn"
                ? "mode3d active3d"
                : "mode3d"
            }
            onClick={() =>
              changeMode(
                "learn"
              )
            }
          >
            O‘rganish
          </button>

          <button
            className={
              mode === "choice"
                ? "mode3d active3d"
                : "mode3d"
            }
            onClick={() =>
              changeMode(
                "choice"
              )
            }
          >
            Tanlash
          </button>

          <button
            className={
              mode === "write"
                ? "mode3d active3d"
                : "mode3d"
            }
            onClick={() =>
              changeMode(
                "write"
              )
            }
          >
            Yozish
          </button>

          <button
            className={
              mode === "wrong"
                ? "mode3d active3d"
                : "mode3d"
            }
            onClick={() =>
              changeMode(
                "wrong"
              )
            }
          >
            Xatolarim
          </button>

          <button
            className={
              mode ===
              "difficult"
                ? "mode3d active3d"
                : "mode3d"
            }
            onClick={() =>
              changeMode(
                "difficult"
              )
            }
          >
            ★ Qiyinlar
          </button>
        </div>

        <div className="statsRow">
          <div className="miniStat">
            <span>
              To‘g‘ri
            </span>

            <strong>
              {totalCorrect}
            </strong>
          </div>

          <div className="miniStat">
            <span>
              Xato
            </span>

            <strong>
              {totalWrong}
            </strong>
          </div>

          <div className="miniStat">
            <span>
              Yodlangan
            </span>

            <strong>
              {learnedCount}
            </strong>
          </div>

          <div className="miniStat">
            <span>
              Natija
            </span>

            <strong>
              {accuracy}%
            </strong>
          </div>
        </div>
      </section>

      {/* =========================
          EMPTY
      ========================== */}

      {visibleWords.length ===
      0 ? (
        <section className="empty3d">
          {mode === "wrong"
            ? "Hozircha xato qilingan so‘zlar yo‘q."
            : mode ===
                "difficult"
              ? "Hozircha qiyin so‘zlar yo‘q."
              : "So‘zlar mavjud emas."}
        </section>
      ) : current ? (
        /* =========================
            MAIN LEARNING BOX
        ========================== */

        <section className="learning3d">
          <div className="progressTop">
            <span>
              {index + 1} /{" "}
              {visibleWords.length}
            </span>

            <span>
              To‘g‘ri:{" "}
              {currentProgress
                ?.correct || 0}

              {" · "}

              Xato:{" "}
              {currentProgress
                ?.wrong || 0}
            </span>
          </div>

          <article className="card3d">
            <div className="cardButtons">
              <button
                className="icon3d"
                onClick={
                  speakWord
                }
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
                    ? "icon3d starOn"
                    : "icon3d"
                }
                onClick={
                  toggleDifficult
                }
              >
                ★
              </button>
            </div>

            <div className="englishLabel">
              Inglizcha so‘z
            </div>

            <h2>
              {current.word}
            </h2>

            <div className="uzbek3d">
              {current.uzbek}
            </div>

            {/* LEARN */}

            {mode ===
              "learn" && (
              <>
                {!revealed ? (
                  <button
                    className="mainBlue3d"
                    onClick={
                      revealSynonyms
                    }
                  >
                    Sinonimlarni
                    ko‘rsatish
                  </button>
                ) : (
                  <>
                    <div className="synonyms3d">
                      {current.synonyms.map(
                        (
                          synonym,
                          idx
                        ) => (
                          <span
                            key={`${synonym}-${idx}`}
                          >
                            {
                              synonym
                            }
                          </span>
                        )
                      )}
                    </div>

                    <div className="autoText">
                      Keyingi
                      so‘zga
                      avtomatik
                      o‘tilmoqda...
                    </div>
                  </>
                )}
              </>
            )}

            {/* CHOICE */}

            {mode ===
              "choice" && (
              <div className="testArea">
                <p>
                  Qaysi biri{" "}
                  <strong>
                    {
                      current.word
                    }
                  </strong>{" "}
                  so‘zining
                  sinonimi?
                </p>

                <div className="choiceGrid">
                  {choiceOptions.map(
                    (
                      option
                    ) => {
                      let cls =
                        "choice3d";

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
                          cls +=
                            " choiceCorrect";
                        } else if (
                          option ===
                          selectedAnswer
                        ) {
                          cls +=
                            " choiceWrong";
                        }
                      }

                      return (
                        <button
                          key={
                            option
                          }
                          className={
                            cls
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
                          {
                            option
                          }
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
                        ? "result good"
                        : "result bad"
                    }
                  >
                    {choiceResult ===
                    "correct"
                      ? "✓ To‘g‘ri"
                      : `✗ Xato — ${current.synonyms[0]}`}
                  </div>
                )}
              </div>
            )}

            {/* WRITE */}

            {mode ===
              "write" && (
              <div className="testArea">
                <p>
                  <strong>
                    {
                      current.word
                    }
                  </strong>{" "}
                  so‘zining
                  sinonimini
                  yozing.
                </p>

                <div className="writeRow">
                  <input
                    value={
                      writeAnswer
                    }
                    onChange={(
                      e
                    ) =>
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
                    placeholder="Sinonim..."
                    disabled={
                      Boolean(
                        writeResult
                      )
                    }
                  />

                  <button
                    className="mainBlue3d"
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
                        ? "result good"
                        : "result bad"
                    }
                  >
                    {writeResult ===
                    "correct"
                      ? "✓ To‘g‘ri"
                      : `✗ ${current.synonyms.join(
                          ", "
                        )}`}
                  </div>
                )}
              </div>
            )}

            {/* REVIEW */}

            {(mode ===
              "wrong" ||
              mode ===
                "difficult") && (
              <div className="synonyms3d">
                {current.synonyms.map(
                  (
                    synonym,
                    idx
                  ) => (
                    <span
                      key={`${synonym}-${idx}`}
                    >
                      {
                        synonym
                      }
                    </span>
                  )
                )}
              </div>
            )}
          </article>

          {/* NAVIGATION */}

          <div className="navRow">
            <button
              className="nav3d"
              onClick={
                previous
              }
            >
              ← Oldingi
            </button>

            <button
              className="later3d"
              onClick={() => {
                toggleDifficult();
                next();
              }}
            >
              ★ Keyinroq
              yana ko‘rsat
            </button>

            <button
              className="nav3d"
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
            28px 20px
            70px;

          font-family:
            "Bell MT",
            "Times New Roman",
            serif;

          color:
            #102f40;

          background:
            radial-gradient(
              circle at top,
              #ffffff,
              #eef4f7 55%,
              #e5ecef
            );
        }

        /* HEADER */

        .top3d {
          width:
            min(1150px, 100%);

          margin:
            0 auto 28px;

          padding:
            20px 25px;

          display: grid;

          grid-template-columns:
            180px 1fr
            140px;

          align-items:
            center;

          gap: 20px;

          border:
            3px solid
              #0a4766;

          border-radius:
            20px;

          background:
            linear-gradient(
              180deg,
              #a9eaff,
              #5ac5ef 55%,
              #2697c7
            );

          box-shadow:
            inset 0 4px 3px
              rgba(
                255,
                255,
                255,
                0.9
              ),
            inset 0 -7px 0
              #08709b,
            0 9px 0
              #064d6a,
            0 16px 25px
              rgba(
                0,
                0,
                0,
                0.2
              );
        }

        .headerCenter {
          text-align:
            center;
        }

        .headerCenter h1 {
          margin: 0;

          font-size:
            40px;

          color:
            #06496f;

          text-shadow:
            0 2px 0
              white;
        }

        .headerCenter span {
          font-weight:
            700;
        }

        .back3d,
        .total3d {
          min-height:
            55px;

          border:
            2px solid
              #626e74;

          border-radius:
            11px;

          background:
            linear-gradient(
              white,
              #dedede
            );

          box-shadow:
            inset 0 3px 2px
              white,
            0 6px 0
              #69747a;

          font-weight:
            700;
        }

        .back3d {
          cursor:
            pointer;
        }

        .total3d {
          display: flex;

          flex-direction:
            column;

          align-items:
            center;

          justify-content:
            center;
        }

        .total3d strong {
          font-size:
            23px;

          color:
            #0674a7;
        }

        /* CONTROL */

        .control3d {
          width:
            min(1150px, 100%);

          margin:
            0 auto 30px;

          padding:
            17px;

          border:
            3px solid
              #3f474b;

          border-radius:
            18px;

          background:
            linear-gradient(
              145deg,
              #676d70,
              #454b4e
            );

          box-shadow:
            inset 0 3px 3px
              rgba(
                255,
                255,
                255,
                0.2
              ),
            inset 0 -6px 0
              #303639,
            0 8px 0
              #303639,
            0 14px 20px
              rgba(
                0,
                0,
                0,
                0.18
              );
        }

        .modeRow {
          display: grid;

          grid-template-columns:
            repeat(
              5,
              1fr
            );

          gap: 12px;
        }

        .mode3d {
          min-height:
            48px;

          border:
            2px solid
              #90999d;

          border-radius:
            9px;

          background:
            linear-gradient(
              #ffffff,
              #d8d8d8
            );

          box-shadow:
            inset 0 2px 2px
              white,
            0 5px 0
              #747d81;

          font-weight:
            700;

          cursor:
            pointer;
        }

        .active3d {
          color:
            #064d70;

          border-color:
            #106487;

          background:
            linear-gradient(
              #caf2ff,
              #65c9ef
            );

          box-shadow:
            inset 0 2px 2px
              white,
            0 5px 0
              #0f6485;
        }

        .statsRow {
          margin-top:
            15px;

          display: grid;

          grid-template-columns:
            repeat(
              4,
              1fr
            );

          gap: 12px;
        }

        .miniStat {
          padding:
            10px;

          text-align:
            center;

          border:
            2px solid
              #b4bcc0;

          border-radius:
            9px;

          background:
            linear-gradient(
              white,
              #dedede
            );

          box-shadow:
            0 4px 0
              #7c8589;
        }

        .miniStat span {
          display:
            block;

          font-size:
            13px;

          font-weight:
            700;
        }

        .miniStat strong {
          display:
            block;

          margin-top:
            2px;

          color:
            #0877aa;

          font-size:
            21px;
        }

        /* LEARNING */

        .learning3d {
          width:
            min(850px, 100%);

          margin:
            auto;

          padding:
            22px;

          border:
            3px solid
              #363e42;

          border-radius:
            20px;

          background:
            linear-gradient(
              145deg,
              #666c6f,
              #43494c
            );

          box-shadow:
            inset 0 3px 3px
              rgba(
                255,
                255,
                255,
                0.16
              ),
            inset 0 -8px 0
              #2e3437,
            0 10px 0
              #2d3336,
            0 17px 26px
              rgba(
                0,
                0,
                0,
                0.22
              );
        }

        .progressTop {
          margin-bottom:
            16px;

          display: flex;

          justify-content:
            space-between;

          color:
            white;

          font-weight:
            700;
        }

        .card3d {
          position:
            relative;

          padding:
            35px 32px
            32px;

          text-align:
            center;

          border:
            3px solid
              #d5dadd;

          border-radius:
            17px;

          background:
            linear-gradient(
              145deg,
              #ffffff,
              #eeeeee
            );

          box-shadow:
            inset 0 4px 4px
              white,
            inset 0 -4px 4px
              rgba(
                0,
                0,
                0,
                0.06
              ),
            0 8px 0
              #858e92,
            0 13px 17px
              rgba(
                0,
                0,
                0,
                0.18
              );
        }

        .cardButtons {
          position:
            absolute;

          top: 18px;

          right: 20px;

          display: flex;

          gap: 9px;
        }

        .icon3d {
          width: 45px;

          height: 42px;

          border:
            2px solid
              #69747a;

          border-radius:
            9px;

          background:
            linear-gradient(
              white,
              #d8d8d8
            );

          box-shadow:
            0 4px 0
              #707a7f;

          cursor:
            pointer;
        }

        .starOn {
          background:
            linear-gradient(
              #fff5ad,
              #efc343
            );
        }

        .englishLabel {
          color:
            #687379;

          font-weight:
            700;
        }

        .card3d h2 {
          margin:
            8px 0 24px;

          color:
            #0570a6;

          font-size:
            clamp(
              44px,
              7vw,
              62px
            );

          text-shadow:
            0 2px 0
              white;
        }

        .uzbek3d {
          width:
            min(620px, 100%);

          margin:
            auto;

          padding:
            15px 20px;

          border:
            2px solid
              #6eacc9;

          border-radius:
            10px;

          background:
            linear-gradient(
              #eefaff,
              #cbeafd
            );

          box-shadow:
            inset 0 2px 3px
              white,
            0 5px 0
              #78a7bb;

          color:
            #15526f;

          font-size:
            22px;

          font-weight:
            700;
        }

        .mainBlue3d {
          margin-top:
            25px;

          min-height:
            48px;

          padding:
            10px 25px;

          border:
            2px solid
              #116084;

          border-radius:
            9px;

          background:
            linear-gradient(
              #c8f0ff,
              #60c4ea
            );

          box-shadow:
            inset 0 2px 2px
              white,
            0 5px 0
              #125e7c;

          color:
            #074d70;

          font-weight:
            700;

          cursor:
            pointer;
        }

        .synonyms3d {
          margin-top:
            28px;

          display: flex;

          flex-wrap:
            wrap;

          justify-content:
            center;

          gap: 10px;
        }

        .synonyms3d span {
          padding:
            10px 15px;

          border:
            2px solid
              #4d9bc0;

          border-radius:
            8px;

          background:
            linear-gradient(
              white,
              #d4effd
            );

          box-shadow:
            0 4px 0
              #70a2b7;

          color:
            #06557c;

          font-weight:
            700;
        }

        .autoText {
          margin-top:
            18px;

          color:
            #667176;

          font-size:
            13px;

          font-weight:
            700;
        }

        /* TEST */

        .testArea {
          margin-top:
            27px;
        }

        .testArea p {
          font-size:
            18px;

          font-weight:
            700;
        }

        .choiceGrid {
          display: grid;

          grid-template-columns:
            repeat(
              2,
              1fr
            );

          gap: 12px;

          margin-top:
            18px;
        }

        .choice3d {
          min-height:
            52px;

          border:
            2px solid
              #828d92;

          border-radius:
            9px;

          background:
            linear-gradient(
              white,
              #dddddd
            );

          box-shadow:
            0 5px 0
              #798388;

          font-weight:
            700;

          cursor:
            pointer;
        }

        .choiceCorrect {
          background:
            linear-gradient(
              #effff2,
              #9ee0af
            );

          border-color:
            #3a8a52;
        }

        .choiceWrong {
          background:
            linear-gradient(
              #fff0f0,
              #ee9e9e
            );

          border-color:
            #a44747;
        }

        .writeRow {
          display: grid;

          grid-template-columns:
            1fr auto;

          gap: 12px;

          margin-top:
            15px;
        }

        .writeRow input {
          min-height:
            49px;

          padding:
            10px 15px;

          border:
            2px solid
              #899499;

          border-radius:
            9px;

          outline: none;

          font-size:
            17px;

          box-shadow:
            inset 0 2px 4px
              rgba(
                0,
                0,
                0,
                0.08
              );
        }

        .writeRow .mainBlue3d {
          margin-top: 0;
        }

        .result {
          margin-top:
            16px;

          padding:
            11px;

          border-radius:
            8px;

          font-weight:
            700;
        }

        .good {
          color:
            #216837;

          background:
            #e9ffed;

          border:
            1px solid
              #65aa78;
        }

        .bad {
          color:
            #8b2424;

          background:
            #fff0f0;

          border:
            1px solid
              #c67a7a;
        }

        /* NAV */

        .navRow {
          margin-top:
            22px;

          display: grid;

          grid-template-columns:
            1fr 1.4fr
            1fr;

          gap: 12px;
        }

        .nav3d,
        .later3d {
          min-height:
            49px;

          border-radius:
            9px;

          font-weight:
            700;

          cursor:
            pointer;
        }

        .nav3d {
          border:
            2px solid
              #6f797e;

          background:
            linear-gradient(
              white,
              #d5d5d5
            );

          box-shadow:
            0 5px 0
              #747e82;
        }

        .later3d {
          border:
            2px solid
              #126083;

          background:
            linear-gradient(
              #c8efff,
              #61c4e9
            );

          box-shadow:
            0 5px 0
              #115d7b;

          color:
            #064d6e;
        }

        .empty3d {
          width:
            min(850px, 100%);

          margin:
            auto;

          padding:
            35px;

          text-align:
            center;

          color:
            white;

          border:
            3px solid
              #383f43;

          border-radius:
            18px;

          background:
            linear-gradient(
              #656b6e,
              #464c4f
            );

          box-shadow:
            0 9px 0
              #303639;

          font-weight:
            700;
        }

        button:active {
          transform:
            translateY(3px);

          box-shadow:
            none;
        }

        button:disabled {
          opacity:
            0.6;

          cursor:
            not-allowed;
        }

        /* MOBILE */

        @media (
          max-width: 760px
        ) {
          .page {
            padding:
              16px 10px
              50px;
          }

          .top3d {
            grid-template-columns:
              1fr;

            text-align:
              center;
          }

          .back3d,
          .total3d {
            width: 100%;
          }

          .modeRow {
            grid-template-columns:
              repeat(
                2,
                1fr
              );
          }

          .statsRow {
            grid-template-columns:
              repeat(
                2,
                1fr
              );
          }

          .learning3d {
            padding:
              14px;
          }

          .card3d {
            padding:
              75px 15px
              25px;
          }

          .cardButtons {
            left: 50%;

            right: auto;

            transform:
              translateX(
                -50%
              );
          }

          .choiceGrid {
            grid-template-columns:
              1fr;
          }

          .writeRow {
            grid-template-columns:
              1fr;
          }

          .navRow {
            grid-template-columns:
              1fr;
          }
        }
      `}</style>
    </main>
  );
}
