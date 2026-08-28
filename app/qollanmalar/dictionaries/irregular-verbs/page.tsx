"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type IrregularVerb = {
  id: string;
  v1: string;
  v2: string;
  v3: string;
  uzbek: string;
  createdAt: string;
  updatedAt: string;
};

type ApiResponse = {
  ok?: boolean;
  message?: string;
  verbs?: IrregularVerb[];
};

type StudyMode =
  | "learn"
  | "choice"
  | "write"
  | "mistakes"
  | "difficult";

type Direction =
  | "v1"
  | "v2"
  | "v3"
  | "mixed";

type QuestionDirection =
  | "v1"
  | "v2"
  | "v3";

const API_URL =
  "/api/dictionary/irregular-verbs";

const DIFFICULT_KEY =
  "irregular-verbs-difficult";

const MISTAKES_KEY =
  "irregular-verbs-mistakes";

/* =========================================================
   HELPERS
========================================================= */

function shuffleArray<T>(array: T[]) {
  const copy = [...array];

  for (let i = copy.length - 1; i > 0; i--) {
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

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getQuestionDirection(
  direction: Direction
): QuestionDirection {
  if (direction !== "mixed") {
    return direction;
  }

  const directions: QuestionDirection[] = [
    "v1",
    "v2",
    "v3",
  ];

  return directions[
    Math.floor(
      Math.random() *
        directions.length
    )
  ];
}

function getPrompt(
  verb: IrregularVerb,
  direction: QuestionDirection
) {
  if (direction === "v1") {
    return verb.v1;
  }

  if (direction === "v2") {
    return verb.v2;
  }

  return verb.v3;
}

function getChoiceAnswer(
  verb: IrregularVerb,
  direction: QuestionDirection
) {
  if (direction === "v1") {
    return `${verb.v2} — ${verb.v3}`;
  }

  if (direction === "v2") {
    return `${verb.v1} — ${verb.v3}`;
  }

  return `${verb.v1} — ${verb.v2}`;
}

function getDirectionLabel(
  direction: QuestionDirection
) {
  if (direction === "v1") {
    return "V1 → V2 + V3";
  }

  if (direction === "v2") {
    return "V2 → V1 + V3";
  }

  return "V3 → V1 + V2";
}

function readSavedIds(key: string) {
  if (typeof window === "undefined") {
    return new Set<string>();
  }

  try {
    const raw =
      window.localStorage.getItem(key);

    if (!raw) {
      return new Set<string>();
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return new Set<string>();
    }

    return new Set<string>(
      parsed.filter(
        (item): item is string =>
          typeof item === "string"
      )
    );
  } catch {
    return new Set<string>();
  }
}

function saveIds(
  key: string,
  ids: Set<string>
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    key,
    JSON.stringify([...ids])
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function IrregularVerbsPage() {
  const [allVerbs, setAllVerbs] =
    useState<IrregularVerb[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [studyMode, setStudyMode] =
    useState<StudyMode>("choice");

  const [direction, setDirection] =
    useState<Direction>("v1");

  const [index, setIndex] =
    useState(0);

  const [
    questionDirection,
    setQuestionDirection,
  ] =
    useState<QuestionDirection>("v1");

  const [
    selectedAnswer,
    setSelectedAnswer,
  ] = useState<string | null>(null);

  const [options, setOptions] =
    useState<string[]>([]);

  const [writeOne, setWriteOne] =
    useState("");

  const [writeTwo, setWriteTwo] =
    useState("");

  const [
    writeChecked,
    setWriteChecked,
  ] = useState(false);

  const [
    writeCorrect,
    setWriteCorrect,
  ] = useState(false);

  const [
    correctCount,
    setCorrectCount,
  ] = useState(0);

  const [
    wrongCount,
    setWrongCount,
  ] = useState(0);

  const [
    difficultIds,
    setDifficultIds,
  ] =
    useState<Set<string>>(
      new Set()
    );

  const [
    mistakeIds,
    setMistakeIds,
  ] =
    useState<Set<string>>(
      new Set()
    );

  const [
    storageLoaded,
    setStorageLoaded,
  ] = useState(false);

  const autoNextTimer =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

  /* =====================================================
     LOCAL STORAGE
  ===================================================== */

  useEffect(() => {
    setDifficultIds(
      readSavedIds(DIFFICULT_KEY)
    );

    setMistakeIds(
      readSavedIds(MISTAKES_KEY)
    );

    setStorageLoaded(true);
  }, []);

  useEffect(() => {
    if (!storageLoaded) return;

    saveIds(
      DIFFICULT_KEY,
      difficultIds
    );
  }, [
    difficultIds,
    storageLoaded,
  ]);

  useEffect(() => {
    if (!storageLoaded) return;

    saveIds(
      MISTAKES_KEY,
      mistakeIds
    );
  }, [
    mistakeIds,
    storageLoaded,
  ]);

  /* =====================================================
     TIMER
  ===================================================== */

  function clearAutoTimer() {
    if (autoNextTimer.current) {
      clearTimeout(
        autoNextTimer.current
      );

      autoNextTimer.current = null;
    }
  }

  useEffect(() => {
    return () => {
      clearAutoTimer();
    };
  }, []);

  /* =====================================================
     LOAD DATA
  ===================================================== */

  const loadVerbs =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await fetch(API_URL, {
            method: "GET",
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
              "Irregular Verbs yuklanmadi."
          );
        }

        const loaded =
          Array.isArray(data.verbs)
            ? data.verbs
            : [];

        setAllVerbs(
          shuffleArray(loaded)
        );
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Ma’lumotlarni yuklashda xatolik."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadVerbs();
  }, [loadVerbs]);

  /* =====================================================
     ACTIVE VERBS
  ===================================================== */

  const activeVerbs =
    useMemo(() => {
      if (
        studyMode === "difficult"
      ) {
        return allVerbs.filter(
          (verb) =>
            difficultIds.has(
              verb.id
            )
        );
      }

      if (
        studyMode === "mistakes"
      ) {
        return allVerbs.filter(
          (verb) =>
            mistakeIds.has(
              verb.id
            )
        );
      }

      return allVerbs;
    }, [
      allVerbs,
      studyMode,
      difficultIds,
      mistakeIds,
    ]);

  const currentVerb =
    activeVerbs.length > 0
      ? activeVerbs[
          index %
            activeVerbs.length
        ]
      : null;

  /* =====================================================
     RESET QUESTION
  ===================================================== */

  const prepareQuestion =
    useCallback(() => {
      if (!currentVerb) {
        setOptions([]);
        return;
      }

      clearAutoTimer();

      const qDirection =
        getQuestionDirection(
          direction
        );

      setQuestionDirection(
        qDirection
      );

      setSelectedAnswer(null);
      setWriteOne("");
      setWriteTwo("");
      setWriteChecked(false);
      setWriteCorrect(false);

      if (
        studyMode !== "choice" &&
        studyMode !== "mistakes" &&
        studyMode !== "difficult"
      ) {
        setOptions([]);
        return;
      }

      if (
        activeVerbs.length < 2
      ) {
        setOptions([]);
        return;
      }

      const correct =
        getChoiceAnswer(
          currentVerb,
          qDirection
        );

      const candidates =
        activeVerbs.filter(
          (verb) =>
            verb.id !==
            currentVerb.id
        );

      const source =
        candidates.length > 0
          ? candidates
          : allVerbs.filter(
              (verb) =>
                verb.id !==
                currentVerb.id
            );

      if (source.length === 0) {
        setOptions([correct]);
        return;
      }

      /*
        Noto‘g‘ri variantni imkon qadar
        shakli o‘xshash fe’llardan olish.
      */

      const scored =
        source.map((verb) => {
          const wrong =
            getChoiceAnswer(
              verb,
              qDirection
            );

          let score = 0;

          const correctParts =
            correct.split("—");

          const wrongParts =
            wrong.split("—");

          const c1 =
            normalize(
              correctParts[0] || ""
            );

          const c2 =
            normalize(
              correctParts[1] || ""
            );

          const w1 =
            normalize(
              wrongParts[0] || ""
            );

          const w2 =
            normalize(
              wrongParts[1] || ""
            );

          if (
            c1.slice(-2) ===
            w1.slice(-2)
          ) {
            score += 2;
          }

          if (
            c2.slice(-2) ===
            w2.slice(-2)
          ) {
            score += 2;
          }

          if (
            Math.abs(
              c1.length -
                w1.length
            ) <= 2
          ) {
            score += 1;
          }

          if (
            Math.abs(
              c2.length -
                w2.length
            ) <= 2
          ) {
            score += 1;
          }

          return {
            verb,
            score,
          };
        });

      scored.sort(
        (a, b) =>
          b.score - a.score
      );

      const topScore =
        scored[0]?.score ?? 0;

      const best =
        scored
          .filter(
            (item) =>
              item.score >=
              Math.max(
                0,
                topScore - 1
              )
          )
          .slice(0, 10);

      const selectedWrong =
        best[
          Math.floor(
            Math.random() *
              best.length
          )
        ]?.verb ||
        source[
          Math.floor(
            Math.random() *
              source.length
          )
        ];

      const wrong =
        getChoiceAnswer(
          selectedWrong,
          qDirection
        );

      setOptions(
        shuffleArray([
          correct,
          wrong,
        ])
      );
    }, [
      currentVerb,
      direction,
      studyMode,
      activeVerbs,
      allVerbs,
    ]);

  useEffect(() => {
    prepareQuestion();
  }, [prepareQuestion]);

  /* =====================================================
     NAVIGATION
  ===================================================== */

  function goNext() {
    clearAutoTimer();

    if (
      activeVerbs.length === 0
    ) {
      return;
    }

    setIndex((prev) =>
      prev >=
      activeVerbs.length - 1
        ? 0
        : prev + 1
    );
  }

  function goPrevious() {
    clearAutoTimer();

    if (
      activeVerbs.length === 0
    ) {
      return;
    }

    setIndex((prev) =>
      prev <= 0
        ? activeVerbs.length - 1
        : prev - 1
    );
  }

  function autoNext() {
    clearAutoTimer();

    autoNextTimer.current =
      setTimeout(() => {
        setIndex((prev) =>
          prev >=
          activeVerbs.length - 1
            ? 0
            : prev + 1
        );

        autoNextTimer.current =
          null;
      }, 850);
  }

  /* =====================================================
     MISTAKES
  ===================================================== */

  function addMistake(id: string) {
    setMistakeIds((previous) => {
      const next =
        new Set(previous);

      next.add(id);

      return next;
    });
  }

  function removeMistake(
    id: string
  ) {
    setMistakeIds((previous) => {
      const next =
        new Set(previous);

      next.delete(id);

      return next;
    });
  }

  /* =====================================================
     CHOICE ANSWER
  ===================================================== */

  function handleChoice(
    answer: string
  ) {
    if (
      !currentVerb ||
      selectedAnswer !== null
    ) {
      return;
    }

    const correct =
      getChoiceAnswer(
        currentVerb,
        questionDirection
      );

    setSelectedAnswer(answer);

    if (answer === correct) {
      setCorrectCount(
        (prev) => prev + 1
      );

      if (
        studyMode ===
        "mistakes"
      ) {
        removeMistake(
          currentVerb.id
        );
      }
    } else {
      setWrongCount(
        (prev) => prev + 1
      );

      addMistake(
        currentVerb.id
      );
    }

    autoNext();
  }

  /* =====================================================
     WRITING ANSWERS
  ===================================================== */

  function getWritingAnswers() {
    if (!currentVerb) {
      return {
        first: "",
        second: "",
        firstLabel: "",
        secondLabel: "",
      };
    }

    if (
      questionDirection === "v1"
    ) {
      return {
        first: currentVerb.v2,
        second: currentVerb.v3,
        firstLabel: "V2",
        secondLabel: "V3",
      };
    }

    if (
      questionDirection === "v2"
    ) {
      return {
        first: currentVerb.v1,
        second: currentVerb.v3,
        firstLabel: "V1",
        secondLabel: "V3",
      };
    }

    return {
      first: currentVerb.v1,
      second: currentVerb.v2,
      firstLabel: "V1",
      secondLabel: "V2",
    };
  }

  function answerMatches(
    userAnswer: string,
    correctAnswer: string
  ) {
    const user =
      normalize(userAnswer);

    const accepted =
      correctAnswer
        .split("/")
        .map(normalize);

    return accepted.includes(user);
  }

  function checkWriting() {
    if (
      !currentVerb ||
      writeChecked
    ) {
      return;
    }

    const expected =
      getWritingAnswers();

    if (
      !writeOne.trim() ||
      !writeTwo.trim()
    ) {
      return;
    }

    const firstCorrect =
      answerMatches(
        writeOne,
        expected.first
      );

    const secondCorrect =
      answerMatches(
        writeTwo,
        expected.second
      );

    const isCorrect =
      firstCorrect &&
      secondCorrect;

    setWriteChecked(true);
    setWriteCorrect(
      isCorrect
    );

    if (isCorrect) {
      setCorrectCount(
        (prev) => prev + 1
      );

      removeMistake(
        currentVerb.id
      );
    } else {
      setWrongCount(
        (prev) => prev + 1
      );

      addMistake(
        currentVerb.id
      );
    }

    autoNext();
  }

  /* =====================================================
     DIFFICULT
  ===================================================== */

  function toggleDifficult() {
    if (!currentVerb) return;

    setDifficultIds(
      (previous) => {
        const next =
          new Set(previous);

        if (
          next.has(
            currentVerb.id
          )
        ) {
          next.delete(
            currentVerb.id
          );
        } else {
          next.add(
            currentVerb.id
          );
        }

        return next;
      }
    );
  }

  /* =====================================================
     SPEAK
  ===================================================== */

  function speak() {
    if (
      !currentVerb ||
      typeof window ===
        "undefined" ||
      !(
        "speechSynthesis" in
        window
      )
    ) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance =
      new SpeechSynthesisUtterance(
        getPrompt(
          currentVerb,
          questionDirection
        )
      );

    utterance.lang =
      "en-US";

    utterance.rate = 0.85;

    window.speechSynthesis.speak(
      utterance
    );
  }

  /* =====================================================
     CHANGE MODE
  ===================================================== */

  function changeStudyMode(
    newMode: StudyMode
  ) {
    clearAutoTimer();

    setStudyMode(newMode);
    setIndex(0);
    setSelectedAnswer(null);
    setWriteChecked(false);
    setCorrectCount(0);
    setWrongCount(0);
  }

  function changeDirection(
    newDirection: Direction
  ) {
    clearAutoTimer();

    setDirection(
      newDirection
    );

    setIndex(0);
    setSelectedAnswer(null);
    setWriteChecked(false);
  }

  /* =====================================================
     VALUES
  ===================================================== */

  const difficult =
    currentVerb
      ? difficultIds.has(
          currentVerb.id
        )
      : false;

  const writing =
    getWritingAnswers();

  const totalAnswered =
    correctCount +
    wrongCount;

  const accuracy =
    totalAnswered > 0
      ? Math.round(
          (correctCount /
            totalAnswered) *
            100
        )
      : 0;

  /* =====================================================
     LOADING / ERROR
  ===================================================== */

  if (loading) {
    return (
      <main className="statePage">
        <div className="stateCard">
          Irregular Verbs
          yuklanmoqda...
        </div>

        <style jsx>{`
          .statePage {
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: #eef3f5;
            font-family:
              "Bell MT",
              "Times New Roman",
              serif;
          }

          .stateCard {
            padding: 30px 45px;
            border: 2px solid #536269;
            border-radius: 15px;
            background: #eee;
            box-shadow:
              0 7px 0 #69767c,
              0 13px 20px
                rgba(0,0,0,.18);
            font-size: 22px;
            font-weight: 800;
          }
        `}</style>
      </main>
    );
  }

  if (error) {
    return (
      <main className="statePage">
        <div className="stateCard">
          <strong>{error}</strong>

          <button
            onClick={() =>
              void loadVerbs()
            }
          >
            Qayta yuklash
          </button>
        </div>

        <style jsx>{`
          .statePage {
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: #eef3f5;
            font-family:
              "Bell MT",
              "Times New Roman",
              serif;
          }

          .stateCard {
            padding: 30px;
            display: flex;
            flex-direction: column;
            gap: 20px;
            border: 2px solid #536269;
            border-radius: 15px;
            background: #eee;
          }

          button {
            min-height: 42px;
          }
        `}</style>
      </main>
    );
  }

  /* =====================================================
     MAIN
  ===================================================== */

  return (
    <main className="page">
      {/* TOP */}

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

        <div className="studyModes">
          <button
            className={
              studyMode === "learn"
                ? "studyButton active"
                : "studyButton"
            }
            onClick={() =>
              changeStudyMode(
                "learn"
              )
            }
          >
            O‘rganish
          </button>

          <button
            className={
              studyMode === "choice"
                ? "studyButton active"
                : "studyButton"
            }
            onClick={() =>
              changeStudyMode(
                "choice"
              )
            }
          >
            Tanlash
          </button>

          <button
            className={
              studyMode === "write"
                ? "studyButton active"
                : "studyButton"
            }
            onClick={() =>
              changeStudyMode(
                "write"
              )
            }
          >
            Yozish
          </button>

          <button
            className={
              studyMode ===
              "mistakes"
                ? "studyButton active"
                : "studyButton"
            }
            onClick={() =>
              changeStudyMode(
                "mistakes"
              )
            }
          >
            Xatolarim
            <span className="countBadge">
              {mistakeIds.size}
            </span>
          </button>

          <button
            className={
              studyMode ===
              "difficult"
                ? "studyButton active"
                : "studyButton"
            }
            onClick={() =>
              changeStudyMode(
                "difficult"
              )
            }
          >
            ★ Qiyinlar
            <span className="countBadge">
              {difficultIds.size}
            </span>
          </button>
        </div>

        <div className="progress">
          <strong>
            {activeVerbs.length
              ? index + 1
              : 0}
          </strong>

          <span>
            / {activeVerbs.length}
          </span>
        </div>
      </section>

      {/* DIRECTIONS */}

      {studyMode !== "learn" && (
        <section className="directions">
          {(
            [
              ["v1", "V1 → V2 + V3"],
              ["v2", "V2 → V1 + V3"],
              ["v3", "V3 → V1 + V2"],
              ["mixed", "Aralash"],
            ] as const
          ).map(
            ([value, label]) => (
              <button
                key={value}
                className={
                  direction ===
                  value
                    ? "directionButton active"
                    : "directionButton"
                }
                onClick={() =>
                  changeDirection(
                    value
                  )
                }
              >
                {label}
              </button>
            )
          )}
        </section>
      )}

      {/* EMPTY MODE */}

      {!currentVerb ? (
        <section className="emptyCard">
          {studyMode ===
          "mistakes"
            ? "Hozircha xato qilingan fe’llar yo‘q."
            : studyMode ===
              "difficult"
            ? "Hozircha qiyin fe’l belgilanmagan."
            : "Fe’llar topilmadi."}

          <button
            onClick={() =>
              changeStudyMode(
                "choice"
              )
            }
          >
            Tanlash rejimiga qaytish
          </button>
        </section>
      ) : (
        <section className="content">
          {/* LEARN MODE */}

          {studyMode ===
          "learn" ? (
            <>
              <div className="learnTitle">
                Fe’lni yodlab oling
              </div>

              <div className="learnCard">
                <div>
                  <span>V1</span>
                  <strong>
                    {currentVerb.v1}
                  </strong>
                </div>

                <div>
                  <span>V2</span>
                  <strong>
                    {currentVerb.v2}
                  </strong>
                </div>

                <div>
                  <span>V3</span>
                  <strong>
                    {currentVerb.v3}
                  </strong>
                </div>

                <p>
                  {currentVerb.uzbek}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="questionLabel">
                {getDirectionLabel(
                  questionDirection
                )}
              </div>

              <div className="wordCard">
                {getPrompt(
                  currentVerb,
                  questionDirection
                )}
              </div>

              <div className="translation">
                {currentVerb.uzbek}
              </div>
            </>
          )}

          {/* TOOLS */}

          <div className="tools">
            <button
              className="toolButton"
              onClick={speak}
            >
              🔊 Talaffuz
            </button>

            <button
              className={
                difficult
                  ? "toolButton difficultActive"
                  : "toolButton"
              }
              onClick={
                toggleDifficult
              }
            >
              {difficult
                ? "★ Qiyin fe’l"
                : "☆ Qiyin fe’l"}
            </button>
          </div>

          {/* CHOICE */}

          {(studyMode ===
            "choice" ||
            studyMode ===
              "mistakes" ||
            studyMode ===
              "difficult") && (
            <div className="answers">
              {options.map(
                (answer) => {
                  const correct =
                    getChoiceAnswer(
                      currentVerb,
                      questionDirection
                    );

                  let className =
                    "answerButton";

                  if (
                    selectedAnswer !==
                    null
                  ) {
                    if (
                      answer ===
                      correct
                    ) {
                      className +=
                        " correct";
                    } else if (
                      answer ===
                      selectedAnswer
                    ) {
                      className +=
                        " wrong";
                    }
                  }

                  return (
                    <button
                      key={answer}
                      className={
                        className
                      }
                      disabled={
                        selectedAnswer !==
                        null
                      }
                      onClick={() =>
                        handleChoice(
                          answer
                        )
                      }
                    >
                      {answer}
                    </button>
                  );
                }
              )}
            </div>
          )}

          {/* WRITING */}

          {studyMode ===
            "write" && (
            <div className="writeArea">
              <div className="writeInputs">
                <label>
                  <span>
                    {
                      writing.firstLabel
                    }
                  </span>

                  <input
                    value={
                      writeOne
                    }
                    disabled={
                      writeChecked
                    }
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={`${writing.firstLabel} ni yozing`}
                    onChange={(e) =>
                      setWriteOne(
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
                        checkWriting();
                      }
                    }}
                  />
                </label>

                <label>
                  <span>
                    {
                      writing.secondLabel
                    }
                  </span>

                  <input
                    value={
                      writeTwo
                    }
                    disabled={
                      writeChecked
                    }
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={`${writing.secondLabel} ni yozing`}
                    onChange={(e) =>
                      setWriteTwo(
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
                        checkWriting();
                      }
                    }}
                  />
                </label>
              </div>

              {!writeChecked ? (
                <button
                  className="checkButton"
                  onClick={
                    checkWriting
                  }
                >
                  Tekshirish
                </button>
              ) : (
                <div
                  className={
                    writeCorrect
                      ? "writeResult success"
                      : "writeResult fail"
                  }
                >
                  {writeCorrect ? (
                    <>
                      ✓ To‘g‘ri!
                    </>
                  ) : (
                    <>
                      ✕ To‘g‘ri
                      javob:{" "}
                      <strong>
                        {
                          writing.first
                        }{" "}
                        —{" "}
                        {
                          writing.second
                        }
                      </strong>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STATS */}

          {studyMode !==
            "learn" && (
            <div className="stats">
              <div>
                <strong>
                  {correctCount}
                </strong>
                <span>
                  ✓ To‘g‘ri
                </span>
              </div>

              <div>
                <strong>
                  {wrongCount}
                </strong>
                <span>
                  ✕ Xato
                </span>
              </div>

              <div>
                <strong>
                  {
                    mistakeIds.size
                  }
                </strong>
                <span>
                  Xatolarim
                </span>
              </div>

              <div>
                <strong>
                  {accuracy}%
                </strong>
                <span>
                  Natija
                </span>
              </div>
            </div>
          )}

          {/* NAV */}

          <div className="navigation">
            <button
              onClick={
                goPrevious
              }
            >
              ← Oldingi
            </button>

            <button
              className="later"
              onClick={() => {
                if (
                  currentVerb
                ) {
                  addMistake(
                    currentVerb.id
                  );
                }

                goNext();
              }}
            >
              ↻ Keyinroq yana
              ko‘rsat
            </button>

            <button
              onClick={goNext}
            >
              Keyingi →
            </button>
          </div>
        </section>
      )}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          padding: 22px 14px 60px;

          background:
            radial-gradient(
              circle at top,
              #fff 0%,
              #f3f6f7 45%,
              #e7ecef 100%
            );

          color: #142d38;

          font-family:
            "Bell MT",
            "Times New Roman",
            Georgia,
            serif;
        }

        button,
        input {
          font-family: inherit;
        }

        button {
          cursor: pointer;
        }

        /* TOP */

        .topPanel {
          width: min(
            1180px,
            calc(100% - 10px)
          );

          margin: auto;

          padding: 16px 20px;

          display: grid;

          grid-template-columns:
            145px 1fr 95px;

          align-items: center;

          gap: 16px;

          border: 3px solid #07506d;
          border-radius: 19px;

          background:
            linear-gradient(
              180deg,
              #82dcf7,
              #55bde5 45%,
              #2596c2
            );

          box-shadow:
            inset 0 6px 5px
              rgba(255,255,255,.7),
            inset 0 -5px 5px
              rgba(0,0,0,.12),
            0 9px 0 #07506d,
            0 16px 22px
              rgba(0,0,0,.2);
        }

        .backButton,
        .studyButton,
        .directionButton,
        .toolButton,
        .navigation button,
        .checkButton,
        .emptyCard button {
          border: 2px solid #526b76;
          border-radius: 9px;

          background:
            linear-gradient(
              180deg,
              #f6fbfd,
              #d6e3e8
            );

          color: #254d5f;

          font-weight: 900;

          box-shadow:
            0 4px 0 #607984;
        }

        .backButton {
          min-height: 45px;
        }

        .studyModes {
          display: grid;

          grid-template-columns:
            repeat(
              5,
              minmax(0,1fr)
            );

          gap: 8px;
        }

        .studyButton {
          position: relative;
          min-height: 44px;
          padding: 6px;
          font-size: 12px;
        }

        .studyButton.active,
        .directionButton.active {
          border-color: #073f5d;

          background:
            linear-gradient(
              180deg,
              #d8f6ff,
              #7bccea
            );

          color: #063e5d;

          box-shadow:
            inset 0 3px 3px
              rgba(255,255,255,.8),
            0 4px 0 #064764;
        }

        .countBadge {
          margin-left: 5px;
          padding: 1px 5px;

          border-radius: 20px;

          background: #1b6887;
          color: white;

          font-size: 9px;
        }

        .progress {
          min-height: 58px;

          display: flex;
          justify-content: center;
          align-items: baseline;

          gap: 4px;

          border: 2px solid #174461;
          border-radius: 10px;

          background:
            linear-gradient(
              #e8faff,
              #b2e1f2
            );

          box-shadow:
            0 4px 0 #17415c;
        }

        .progress strong {
          font-size: 24px;
        }

        .progress span {
          font-size: 11px;
          font-weight: 900;
        }

        /* DIRECTIONS */

        .directions {
          width: min(
            780px,
            calc(100% - 20px)
          );

          margin: 45px auto 0;

          display: grid;

          grid-template-columns:
            repeat(4,1fr);

          gap: 10px;
        }

        .directionButton {
          min-height: 39px;
          font-size: 11px;
        }

        /* CONTENT */

        .content {
          width: min(
            950px,
            calc(100% - 15px)
          );

          margin: 36px auto 0;

          text-align: center;
        }

        .questionLabel,
        .learnTitle {
          width: fit-content;

          margin: 0 auto 13px;

          padding: 5px 14px;

          border: 1px solid #9ca9ae;
          border-radius: 20px;

          background: #e5ebed;

          color: #536a74;

          font-size: 11px;
          font-weight: 900;
        }

        /* WORD */

        .wordCard {
          width: min(510px,94%);
          min-height: 120px;

          margin: auto;
          padding: 20px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 3px solid #07506d;
          border-radius: 17px;

          background:
            linear-gradient(
              #82dcf7,
              #52bae3 45%,
              #2d9dca
            );

          box-shadow:
            inset 0 6px 5px
              rgba(255,255,255,.65),
            0 9px 0 #07506d,
            0 15px 20px
              rgba(0,0,0,.18);

          color: #073b68;

          font-size: 42px;
          font-weight: 900;
        }

        .translation {
          margin-top: 20px;

          color: #5b6d74;

          font-size: 17px;
          font-weight: 800;
        }

        /* LEARN */

        .learnCard {
          width: min(720px,96%);

          margin: 0 auto;

          padding: 32px;

          display: grid;

          grid-template-columns:
            repeat(3,1fr);

          gap: 18px;

          border: 3px solid #07506d;
          border-radius: 18px;

          background:
            linear-gradient(
              #83dcf6,
              #4eb6df
            );

          box-shadow:
            inset 0 6px 5px
              rgba(255,255,255,.65),
            0 9px 0 #07506d,
            0 16px 22px
              rgba(0,0,0,.18);
        }

        .learnCard > div {
          min-height: 105px;

          padding: 12px;

          display: flex;
          flex-direction: column;
          justify-content: center;

          border: 2px solid #597983;
          border-radius: 12px;

          background:
            linear-gradient(
              #f5f7f7,
              #dce2e4
            );

          box-shadow:
            0 5px 0 #698087;
        }

        .learnCard span {
          font-size: 11px;
          font-weight: 900;
          color: #63777f;
        }

        .learnCard strong {
          margin-top: 8px;
          font-size: 27px;
        }

        .learnCard p {
          grid-column: 1 / -1;

          margin: 8px 0 0;

          font-size: 20px;
          font-weight: 900;
        }

        /* TOOLS */

        .tools {
          margin-top: 25px;

          display: flex;
          justify-content: center;
          gap: 12px;
        }

        .toolButton {
          min-height: 38px;
          padding: 6px 15px;
        }

        .difficultActive {
          border-color: #a7862b;
          background:
            linear-gradient(
              #fff7d7,
              #e7d48a
            );
          color: #72570a;
        }

        /* ANSWERS */

        .answers {
          margin-top: 55px;

          display: grid;
          grid-template-columns:
            repeat(2,1fr);

          gap: 45px;
        }

        .answerButton {
          min-height: 105px;
          padding: 16px;

          border: 2px solid #747f84;
          border-radius: 13px;

          background:
            linear-gradient(
              #f1f1f1,
              #dedede
            );

          box-shadow:
            inset 0 5px 5px
              rgba(255,255,255,.9),
            0 8px 0 #747f84,
            0 13px 18px
              rgba(0,0,0,.18);

          color: #172f39;

          font-size: 23px;
          font-weight: 900;
        }

        .answerButton.correct {
          border-color: #42845b;

          background:
            linear-gradient(
              #e8f8ed,
              #bfe5cb
            );

          box-shadow:
            0 7px 0 #4f8b63;
        }

        .answerButton.wrong {
          border-color: #a85e5e;

          background:
            linear-gradient(
              #ffeaea,
              #efc2c2
            );

          box-shadow:
            0 7px 0 #9d6262;
        }

        /* WRITE */

        .writeArea {
          width: min(700px,100%);

          margin: 55px auto 0;
        }

        .writeInputs {
          display: grid;
          grid-template-columns:
            repeat(2,1fr);

          gap: 25px;
        }

        .writeInputs label {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .writeInputs span {
          font-weight: 900;
          color: #41606d;
        }

        .writeInputs input {
          min-height: 70px;
          padding: 12px 18px;

          border: 2px solid #6d7e85;
          border-radius: 12px;

          outline: none;

          background: #f3f3f3;

          box-shadow:
            inset 0 4px 7px
              rgba(0,0,0,.08),
            0 5px 0 #77858a;

          text-align: center;

          color: #153c4e;

          font-size: 23px;
          font-weight: 900;
        }

        .writeInputs input:focus {
          border-color: #278eb8;
        }

        .checkButton {
          min-width: 190px;
          min-height: 45px;

          margin-top: 28px;

          background:
            linear-gradient(
              #d8f6ff,
              #83cee9
            );
        }

        .writeResult {
          margin: 30px auto 0;

          padding: 13px 20px;

          width: fit-content;

          border-radius: 9px;

          font-size: 17px;
          font-weight: 900;
        }

        .writeResult.success {
          background: #d8efdf;
          color: #27613b;
        }

        .writeResult.fail {
          background: #f5dada;
          color: #843d3d;
        }

        /* STATS */

        .stats {
          margin-top: 35px;

          display: flex;
          justify-content: center;
          gap: 10px;

          flex-wrap: wrap;
        }

        .stats div {
          min-width: 105px;
          min-height: 48px;

          padding: 5px 10px;

          display: flex;
          flex-direction: column;

          border: 1px solid #89969c;
          border-radius: 8px;

          background:
            linear-gradient(
              #f1f3f4,
              #dce1e3
            );

          box-shadow:
            0 3px 0 #8b969b;
        }

        .stats strong {
          font-size: 16px;
        }

        .stats span {
          font-size: 9px;
          font-weight: 800;
        }

        /* NAVIGATION */

        .navigation {
          margin-top: 50px;

          display: grid;

          grid-template-columns:
            160px 1fr 160px;

          gap: 20px;
        }

        .navigation button {
          min-height: 44px;
        }

        .navigation .later {
          justify-self: center;
          min-width: 230px;

          border-color: #337b9a;

          background:
            linear-gradient(
              #dff6ff,
              #a8dceb
            );
        }

        /* EMPTY */

        .emptyCard {
          width: min(550px,90%);

          margin: 80px auto;

          padding: 35px;

          display: flex;
          flex-direction: column;
          gap: 25px;

          text-align: center;

          border: 2px solid #687a82;
          border-radius: 15px;

          background: #e9edef;

          box-shadow:
            0 7px 0 #78878d;

          font-size: 19px;
          font-weight: 900;
        }

        .emptyCard button {
          min-height: 45px;
        }

        /* TABLET */

        @media (max-width: 900px) {
          .topPanel {
            grid-template-columns:
              130px 1fr 80px;
          }

          .studyModes {
            grid-template-columns:
              repeat(3,1fr);
          }
        }

        /* MOBILE */

        @media (max-width: 650px) {
          .page {
            padding:
              10px 5px 35px;
          }

          .topPanel {
            width:
              calc(100% - 8px);

            grid-template-columns:
              1fr 70px;

            padding: 12px;
          }

          .backButton {
            grid-column:
              1 / -1;
          }

          .studyModes {
            grid-template-columns:
              repeat(2,1fr);
          }

          .studyButton {
            font-size: 10px;
          }

          .directions {
            margin-top: 35px;

            grid-template-columns:
              repeat(2,1fr);
          }

          .content {
            margin-top: 30px;
          }

          .wordCard {
            min-height: 95px;
            font-size: 34px;
          }

          .learnCard {
            padding: 20px 12px;

            grid-template-columns: 1fr;
          }

          .learnCard p {
            grid-column: auto;
          }

          .answers {
            margin-top: 45px;

            grid-template-columns: 1fr;

            gap: 22px;
          }

          .answerButton {
            min-height: 80px;
            font-size: 20px;
          }

          .writeInputs {
            grid-template-columns: 1fr;
          }

          .writeInputs input {
            min-height: 60px;
            font-size: 20px;
          }

          .stats {
            display: grid;
            grid-template-columns:
              repeat(4,1fr);
          }

          .stats div {
            min-width: 0;
            padding: 5px 2px;
          }

          .navigation {
            grid-template-columns:
              1fr 1fr;
          }

          .navigation .later {
            grid-column: 1 / -1;
            grid-row: 1;

            width: 100%;
            min-width: 0;
          }
        }
      `}</style>
    </main>
  );
}
