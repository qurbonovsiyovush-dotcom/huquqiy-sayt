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

type VerbProgress = {
  score: number;
  correct: number;
  wrong: number;
  streak: number;
  nextReviewStep: number;
  lastSeenStep: number;
};

type ProgressMap = Record<
  string,
  VerbProgress
>;

const API_URL =
  "/api/dictionary/irregular-verbs";

const DIFFICULT_KEY =
  "irregular-verbs-difficult";

const MISTAKES_KEY =
  "irregular-verbs-mistakes";

const PROGRESS_KEY =
  "irregular-verbs-srs-progress";

const STEP_KEY =
  "irregular-verbs-srs-step";

/* =========================================================
   ARRAY ARALASHTIRISH
========================================================= */

function shuffleArray<T>(
  array: T[]
): T[] {
  const copy = [...array];

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

/* =========================================================
   NORMALIZE
========================================================= */

function normalize(
  value: string
) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/* =========================================================
   QUESTION DIRECTION
========================================================= */

function getQuestionDirection(
  direction: Direction
): QuestionDirection {
  if (direction !== "mixed") {
    return direction;
  }

  const directions: QuestionDirection[] =
    ["v1", "v2", "v3"];

  return directions[
    Math.floor(
      Math.random() *
        directions.length
    )
  ];
}

/* =========================================================
   PROMPT
========================================================= */

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

/* =========================================================
   CHOICE ANSWER
========================================================= */

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

/* =========================================================
   DIRECTION LABEL
========================================================= */

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

/* =========================================================
   SAVED IDS
========================================================= */

function readSavedIds(
  key: string
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return new Set<string>();
  }

  try {
    const raw =
      window.localStorage.getItem(
        key
      );

    if (!raw) {
      return new Set<string>();
    }

    const parsed =
      JSON.parse(raw);

    if (
      !Array.isArray(parsed)
    ) {
      return new Set<string>();
    }

    return new Set<string>(
      parsed.filter(
        (
          item
        ): item is string =>
          typeof item ===
          "string"
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
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    key,
    JSON.stringify([...ids])
  );
}

/* =========================================================
   PROGRESS STORAGE
========================================================= */

function readProgress():
  ProgressMap {
  if (
    typeof window ===
    "undefined"
  ) {
    return {};
  }

  try {
    const raw =
      window.localStorage.getItem(
        PROGRESS_KEY
      );

    if (!raw) {
      return {};
    }

    const parsed =
      JSON.parse(raw);

    if (
      typeof parsed !==
        "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return {};
    }

    return parsed as ProgressMap;
  } catch {
    return {};
  }
}

function saveProgress(
  progress: ProgressMap
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    PROGRESS_KEY,
    JSON.stringify(progress)
  );
}

function readStep() {
  if (
    typeof window ===
    "undefined"
  ) {
    return 0;
  }

  const raw =
    window.localStorage.getItem(
      STEP_KEY
    );

  const parsed = Number(raw);

  if (
    !Number.isFinite(parsed)
  ) {
    return 0;
  }

  return parsed;
}

function saveStep(
  step: number
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    STEP_KEY,
    String(step)
  );
}

/* =========================================================
   DEFAULT PROGRESS
========================================================= */

function defaultProgress():
  VerbProgress {
  return {
    score: 0,
    correct: 0,
    wrong: 0,
    streak: 0,
    nextReviewStep: 0,
    lastSeenStep: -1,
  };
}

/* =========================================================
   LEVEL
========================================================= */

function getLevel(
  score: number
) {
  if (score >= 6) {
    return {
      key: "mastered",
      label: "Yodlangan",
      icon: "🟢",
    };
  }

  if (score >= 3) {
    return {
      key: "strengthening",
      label:
        "Mustahkamlanmoqda",
      icon: "🟡",
    };
  }

  if (score >= 1) {
    return {
      key: "learning",
      label:
        "O‘rganilmoqda",
      icon: "🟠",
    };
  }

  return {
    key: "new",
    label: "Yangi",
    icon: "🔴",
  };
}

/* =========================================================
   PAGE
========================================================= */

export default function IrregularVerbsPage() {
  const [
    allVerbs,
    setAllVerbs,
  ] =
    useState<IrregularVerb[]>(
      []
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [error, setError] =
    useState("");

  const [
    studyMode,
    setStudyMode,
  ] =
    useState<StudyMode>(
      "choice"
    );

  const [
    direction,
    setDirection,
  ] =
    useState<Direction>(
      "v1"
    );

  const [index, setIndex] =
    useState(0);

  const [
    questionDirection,
    setQuestionDirection,
  ] =
    useState<QuestionDirection>(
      "v1"
    );

  const [
    selectedAnswer,
    setSelectedAnswer,
  ] =
    useState<
      string | null
    >(null);

  const [
    options,
    setOptions,
  ] =
    useState<string[]>([]);

  const [
    writeOne,
    setWriteOne,
  ] = useState("");

  const [
    writeTwo,
    setWriteTwo,
  ] = useState("");

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
    progress,
    setProgress,
  ] =
    useState<ProgressMap>(
      {}
    );

  const [
    questionStep,
    setQuestionStep,
  ] = useState(0);

  const [
    storageLoaded,
    setStorageLoaded,
  ] = useState(false);

  const [
    forcedVerbId,
    setForcedVerbId,
  ] =
    useState<
      string | null
    >(null);

  const autoNextTimer =
    useRef<
      ReturnType<
        typeof setTimeout
      > | null
    >(null);

  /* =====================================================
     STORAGE LOAD
  ===================================================== */

  useEffect(() => {
    setDifficultIds(
      readSavedIds(
        DIFFICULT_KEY
      )
    );

    setMistakeIds(
      readSavedIds(
        MISTAKES_KEY
      )
    );

    setProgress(
      readProgress()
    );

    setQuestionStep(
      readStep()
    );

    setStorageLoaded(true);
  }, []);

  /* =====================================================
     STORAGE SAVE
  ===================================================== */

  useEffect(() => {
    if (!storageLoaded) {
      return;
    }

    saveIds(
      DIFFICULT_KEY,
      difficultIds
    );
  }, [
    difficultIds,
    storageLoaded,
  ]);

  useEffect(() => {
    if (!storageLoaded) {
      return;
    }

    saveIds(
      MISTAKES_KEY,
      mistakeIds
    );
  }, [
    mistakeIds,
    storageLoaded,
  ]);

  useEffect(() => {
    if (!storageLoaded) {
      return;
    }

    saveProgress(
      progress
    );
  }, [
    progress,
    storageLoaded,
  ]);

  useEffect(() => {
    if (!storageLoaded) {
      return;
    }

    saveStep(
      questionStep
    );
  }, [
    questionStep,
    storageLoaded,
  ]);

  /* =====================================================
     TIMER
  ===================================================== */

  function clearAutoTimer() {
    if (
      autoNextTimer.current
    ) {
      clearTimeout(
        autoNextTimer.current
      );

      autoNextTimer.current =
        null;
    }
  }

  useEffect(() => {
    return () => {
      clearAutoTimer();
    };
  }, []);

  /* =====================================================
     LOAD API
  ===================================================== */

  const loadVerbs =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError("");

          const response =
            await fetch(
              API_URL,
              {
                method: "GET",
                cache:
                  "no-store",
              }
            );

          const data:
            ApiResponse =
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
            Array.isArray(
              data.verbs
            )
              ? data.verbs
              : [];

          setAllVerbs(
            shuffleArray(
              loaded
            )
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
      },
      []
    );

  useEffect(() => {
    void loadVerbs();
  }, [loadVerbs]);

  /* =====================================================
     ACTIVE VERBS
  ===================================================== */

  const activeVerbs =
    useMemo(() => {
      if (
        studyMode ===
        "difficult"
      ) {
        return allVerbs.filter(
          (verb) =>
            difficultIds.has(
              verb.id
            )
        );
      }

      if (
        studyMode ===
        "mistakes"
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

  /* =====================================================
     SMART REVIEW
  ===================================================== */

  const smartReviewVerb =
    useMemo(() => {
      if (
        studyMode ===
          "learn" ||
        activeVerbs.length ===
          0
      ) {
        return null;
      }

      const due =
        activeVerbs
          .filter(
            (verb) => {
              const p =
                progress[
                  verb.id
                ];

              if (!p) {
                return false;
              }

              if (
                p.lastSeenStep <
                0
              ) {
                return false;
              }

              return (
                p.nextReviewStep <=
                questionStep
              );
            }
          )
          .sort(
            (a, b) => {
              const pa =
                progress[
                  a.id
                ] ||
                defaultProgress();

              const pb =
                progress[
                  b.id
                ] ||
                defaultProgress();

              if (
                pa.score !==
                pb.score
              ) {
                return (
                  pa.score -
                  pb.score
                );
              }

              return (
                pa.nextReviewStep -
                pb.nextReviewStep
              );
            }
          );

      if (
        due.length === 0
      ) {
        return null;
      }

      return due[0];
    }, [
      activeVerbs,
      progress,
      questionStep,
      studyMode,
    ]);

  /* =====================================================
     CURRENT VERB
  ===================================================== */

  const currentVerb =
    useMemo(() => {
      if (
        activeVerbs.length ===
        0
      ) {
        return null;
      }

      if (forcedVerbId) {
        const forced =
          activeVerbs.find(
            (verb) =>
              verb.id ===
              forcedVerbId
          );

        if (forced) {
          return forced;
        }
      }

      if (
        smartReviewVerb
      ) {
        return smartReviewVerb;
      }

      return activeVerbs[
        index %
          activeVerbs.length
      ];
    }, [
      activeVerbs,
      index,
      forcedVerbId,
      smartReviewVerb,
    ]);

  /* =====================================================
     PROGRESS COUNTS
  ===================================================== */

  const levelCounts =
    useMemo(() => {
      let newCount = 0;
      let learning = 0;
      let strengthening = 0;
      let mastered = 0;

      for (
        const verb of allVerbs
      ) {
        const p =
          progress[
            verb.id
          ] ||
          defaultProgress();

        const level =
          getLevel(
            p.score
          ).key;

        if (
          level === "new"
        ) {
          newCount++;
        } else if (
          level ===
          "learning"
        ) {
          learning++;
        } else if (
          level ===
          "strengthening"
        ) {
          strengthening++;
        } else {
          mastered++;
        }
      }

      return {
        newCount,
        learning,
        strengthening,
        mastered,
      };
    }, [
      allVerbs,
      progress,
    ]);

  /* =====================================================
     CURRENT LEVEL
  ===================================================== */

  const currentProgress =
    currentVerb
      ? progress[
          currentVerb.id
        ] ||
        defaultProgress()
      : defaultProgress();

  const currentLevel =
    getLevel(
      currentProgress.score
    );

  /* =====================================================
     PREPARE QUESTION
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

      setSelectedAnswer(
        null
      );

      setWriteOne("");
      setWriteTwo("");
      setWriteChecked(false);
      setWriteCorrect(false);

      if (
        studyMode !==
          "choice" &&
        studyMode !==
          "mistakes" &&
        studyMode !==
          "difficult"
      ) {
        setOptions([]);
        return;
      }

      const correct =
        getChoiceAnswer(
          currentVerb,
          qDirection
        );

      /*
        Noto‘g‘ri variantni
        butun bazadan olamiz.
        Shunda Xatolarim yoki
        Qiyinlar rejimida 1 ta
        fe’l bo‘lsa ham test ishlaydi.
      */

      const source =
        allVerbs.filter(
          (verb) =>
            verb.id !==
            currentVerb.id
        );

      if (
        source.length === 0
      ) {
        setOptions([
          correct,
        ]);

        return;
      }

      /*
        O‘xshash noto‘g‘ri
        variant tanlash.
      */

      const scored =
        source.map(
          (verb) => {
            const wrong =
              getChoiceAnswer(
                verb,
                qDirection
              );

            const correctParts =
              correct.split(
                "—"
              );

            const wrongParts =
              wrong.split(
                "—"
              );

            const c1 =
              normalize(
                correctParts[
                  0
                ] || ""
              );

            const c2 =
              normalize(
                correctParts[
                  1
                ] || ""
              );

            const w1 =
              normalize(
                wrongParts[
                  0
                ] || ""
              );

            const w2 =
              normalize(
                wrongParts[
                  1
                ] || ""
              );

            let score = 0;

            if (
              c1.slice(-2) ===
              w1.slice(-2)
            ) {
              score += 3;
            }

            if (
              c2.slice(-2) ===
              w2.slice(-2)
            ) {
              score += 3;
            }

            if (
              c1.slice(-1) ===
              w1.slice(-1)
            ) {
              score += 1;
            }

            if (
              c2.slice(-1) ===
              w2.slice(-1)
            ) {
              score += 1;
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
          }
        );

      scored.sort(
        (a, b) =>
          b.score -
          a.score
      );

      const bestPool =
        scored.slice(
          0,
          Math.min(
            12,
            scored.length
          )
        );

      const selected =
        bestPool[
          Math.floor(
            Math.random() *
              bestPool.length
          )
        ];

      const wrong =
        getChoiceAnswer(
          selected.verb,
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
      allVerbs,
    ]);

  useEffect(() => {
    prepareQuestion();
  }, [
    prepareQuestion,
  ]);

  /* =====================================================
     ADD MISTAKE
  ===================================================== */

  function addMistake(
    id: string
  ) {
    setMistakeIds(
      (previous) => {
        const next =
          new Set(
            previous
          );

        next.add(id);

        return next;
      }
    );
  }

  function removeMistake(
    id: string
  ) {
    setMistakeIds(
      (previous) => {
        const next =
          new Set(
            previous
          );

        next.delete(id);

        return next;
      }
    );
  }

  /* =====================================================
     UPDATE SRS
  ===================================================== */

  function updateSrs(
    verbId: string,
    isCorrect: boolean,
    points: number
  ) {
    const nextStep =
      questionStep + 1;

    setProgress(
      (previous) => {
        const old =
          previous[
            verbId
          ] ||
          defaultProgress();

        if (!isCorrect) {
          const newScore =
            Math.max(
              0,
              old.score - 2
            );

          return {
            ...previous,

            [verbId]: {
              ...old,

              score:
                newScore,

              wrong:
                old.wrong + 1,

              streak: 0,

              lastSeenStep:
                nextStep,

              /*
                Xato qilinsa 5 ta
                savoldan keyin
                yana chiqadi.
              */
              nextReviewStep:
                nextStep + 5,
            },
          };
        }

        const newScore =
          Math.min(
            10,
            old.score +
              points
          );

        const newStreak =
          old.streak + 1;

        /*
          Yaxshi bilgan sari
          takrorlash oralig‘i
          uzayadi.
        */

        let interval = 8;

        if (
          newScore >= 6
        ) {
          interval = 40;
        } else if (
          newScore >= 3
        ) {
          interval = 22;
        } else if (
          newScore >= 1
        ) {
          interval = 12;
        }

        if (
          newStreak >= 3
        ) {
          interval += 10;
        }

        return {
          ...previous,

          [verbId]: {
            ...old,

            score:
              newScore,

            correct:
              old.correct + 1,

            streak:
              newStreak,

            lastSeenStep:
              nextStep,

            nextReviewStep:
              nextStep +
              interval,
          },
        };
      }
    );

    setQuestionStep(
      nextStep
    );
  }

  /* =====================================================
     FIND NEXT INDEX
  ===================================================== */

  function moveSequentially(
    directionValue:
      "next" | "previous"
  ) {
    if (
      activeVerbs.length ===
      0
    ) {
      return;
    }

    setForcedVerbId(null);

    if (
      directionValue ===
      "next"
    ) {
      setIndex(
        (previous) =>
          previous >=
          activeVerbs.length -
            1
            ? 0
            : previous + 1
      );
    } else {
      setIndex(
        (previous) =>
          previous <= 0
            ? activeVerbs.length -
              1
            : previous - 1
      );
    }
  }

  /* =====================================================
     GO NEXT
  ===================================================== */

  function goNext() {
    clearAutoTimer();

    moveSequentially(
      "next"
    );
  }

  function goPrevious() {
    clearAutoTimer();

    moveSequentially(
      "previous"
    );
  }

  /* =====================================================
     AUTO NEXT
  ===================================================== */

  function autoNext() {
    clearAutoTimer();

    autoNextTimer.current =
      setTimeout(() => {
        setForcedVerbId(
          null
        );

        setIndex(
          (previous) =>
            previous >=
            activeVerbs.length -
              1
              ? 0
              : previous + 1
        );

        autoNextTimer.current =
          null;
      }, 850);
  }

  /* =====================================================
     CHOICE ANSWER
  ===================================================== */

  function handleChoice(
    answer: string
  ) {
    if (
      !currentVerb ||
      selectedAnswer !==
        null
    ) {
      return;
    }

    const correct =
      getChoiceAnswer(
        currentVerb,
        questionDirection
      );

    const isCorrect =
      answer === correct;

    setSelectedAnswer(
      answer
    );

    if (isCorrect) {
      setCorrectCount(
        (previous) =>
          previous + 1
      );

      /*
        Tanlash = +1 ball
      */

      updateSrs(
        currentVerb.id,
        true,
        1
      );

      /*
        Xatolarim rejimida
        to‘g‘ri topsa ro‘yxatdan
        chiqaramiz.
      */

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
        (previous) =>
          previous + 1
      );

      addMistake(
        currentVerb.id
      );

      updateSrs(
        currentVerb.id,
        false,
        0
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
      questionDirection ===
      "v1"
    ) {
      return {
        first:
          currentVerb.v2,

        second:
          currentVerb.v3,

        firstLabel: "V2",

        secondLabel: "V3",
      };
    }

    if (
      questionDirection ===
      "v2"
    ) {
      return {
        first:
          currentVerb.v1,

        second:
          currentVerb.v3,

        firstLabel: "V1",

        secondLabel: "V3",
      };
    }

    return {
      first:
        currentVerb.v1,

      second:
        currentVerb.v2,

      firstLabel: "V1",

      secondLabel: "V2",
    };
  }

  /* =====================================================
     ACCEPT VARIANTS
  ===================================================== */

  function answerMatches(
    userAnswer: string,
    correctAnswer: string
  ) {
    const user =
      normalize(
        userAnswer
      );

    const accepted =
      correctAnswer
        .split("/")
        .map(
          (item) =>
            normalize(item)
        )
        .filter(Boolean);

    return accepted.includes(
      user
    );
  }

  /* =====================================================
     CHECK WRITING
  ===================================================== */

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
        (previous) =>
          previous + 1
      );

      /*
        Yozish = +2 ball
      */

      updateSrs(
        currentVerb.id,
        true,
        2
      );

      removeMistake(
        currentVerb.id
      );
    } else {
      setWrongCount(
        (previous) =>
          previous + 1
      );

      addMistake(
        currentVerb.id
      );

      updateSrs(
        currentVerb.id,
        false,
        0
      );
    }

    autoNext();
  }

  /* =====================================================
     DIFFICULT
  ===================================================== */

  function toggleDifficult() {
    if (!currentVerb) {
      return;
    }

    setDifficultIds(
      (previous) => {
        const next =
          new Set(
            previous
          );

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
        studyMode ===
        "learn"
          ? currentVerb.v1
          : getPrompt(
              currentVerb,
              questionDirection
            )
      );

    utterance.lang =
      "en-US";

    utterance.rate =
      0.85;

    window.speechSynthesis.speak(
      utterance
    );
  }

  /* =====================================================
     CHANGE STUDY MODE
  ===================================================== */

  function changeStudyMode(
    newMode: StudyMode
  ) {
    clearAutoTimer();

    setStudyMode(
      newMode
    );

    setIndex(0);

    setForcedVerbId(
      null
    );

    setSelectedAnswer(
      null
    );

    setWriteChecked(
      false
    );

    setCorrectCount(0);

    setWrongCount(0);
  }

  /* =====================================================
     CHANGE DIRECTION
  ===================================================== */

  function changeDirection(
    newDirection:
      Direction
  ) {
    clearAutoTimer();

    setDirection(
      newDirection
    );

    setIndex(0);

    setForcedVerbId(
      null
    );

    setSelectedAnswer(
      null
    );

    setWriteChecked(
      false
    );
  }

  /* =====================================================
     SHOW LATER
  ===================================================== */

  function showLater() {
    if (!currentVerb) {
      return;
    }

    addMistake(
      currentVerb.id
    );

    /*
      "Keyinroq yana ko‘rsat"
      bosilsa 5 ta savoldan
      keyin qayta ko‘rsatamiz.
    */

    const nextStep =
      questionStep + 1;

    setProgress(
      (previous) => {
        const old =
          previous[
            currentVerb.id
          ] ||
          defaultProgress();

        return {
          ...previous,

          [currentVerb.id]: {
            ...old,

            lastSeenStep:
              nextStep,

            nextReviewStep:
              nextStep + 5,
          },
        };
      }
    );

    setQuestionStep(
      nextStep
    );

    goNext();
  }

  /* =====================================================
     RESET LEARNING PROGRESS
  ===================================================== */

  function resetLearningProgress() {
    const accepted =
      window.confirm(
        "Irregular Verbs bo‘yicha barcha yodlash natijalarini noldan boshlaysizmi?"
      );

    if (!accepted) {
      return;
    }

    setProgress({});
    setMistakeIds(
      new Set()
    );

    setQuestionStep(0);

    setCorrectCount(0);

    setWrongCount(0);

    setIndex(0);

    setForcedVerbId(
      null
    );

    window.localStorage.removeItem(
      PROGRESS_KEY
    );

    window.localStorage.removeItem(
      MISTAKES_KEY
    );

    window.localStorage.removeItem(
      STEP_KEY
    );
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
     LOADING
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
                rgba(
                  0,
                  0,
                  0,
                  0.18
                );

            font-size: 22px;
            font-weight: 800;
          }
        `}</style>
      </main>
    );
  }

  /* =====================================================
     ERROR
  ===================================================== */

  if (error) {
    return (
      <main className="statePage">
        <div className="stateCard errorCard">
          <strong>
            {error}
          </strong>

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

          .errorCard {
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
            cursor: pointer;
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
      {/* =================================================
          TOP PANEL
      ================================================= */}

      <section className="topPanel">
        <button
          type="button"
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
            type="button"
            className={
              studyMode ===
              "learn"
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
            type="button"
            className={
              studyMode ===
              "choice"
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
            type="button"
            className={
              studyMode ===
              "write"
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
            type="button"
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
            type="button"
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

        <div className="progressBox">
          <strong>
            {levelCounts.mastered}
          </strong>

          <span>
            / {allVerbs.length}
          </span>

          <small>
            Yodlangan
          </small>
        </div>
      </section>

      {/* =================================================
          SRS PROGRESS
      ================================================= */}

      <section className="srsProgress">
        <div className="levelCard red">
          <strong>
            🔴{" "}
            {
              levelCounts.newCount
            }
          </strong>

          <span>Yangi</span>
        </div>

        <div className="levelCard orange">
          <strong>
            🟠{" "}
            {
              levelCounts.learning
            }
          </strong>

          <span>
            O‘rganilmoqda
          </span>
        </div>

        <div className="levelCard yellow">
          <strong>
            🟡{" "}
            {
              levelCounts.strengthening
            }
          </strong>

          <span>
            Mustahkamlanmoqda
          </span>
        </div>

        <div className="levelCard green">
          <strong>
            🟢{" "}
            {
              levelCounts.mastered
            }
          </strong>

          <span>
            Yodlangan
          </span>
        </div>
      </section>

      {/* =================================================
          DIRECTIONS
      ================================================= */}

      {studyMode !==
        "learn" && (
        <section className="directions">
          {(
            [
              [
                "v1",
                "V1 → V2 + V3",
              ],
              [
                "v2",
                "V2 → V1 + V3",
              ],
              [
                "v3",
                "V3 → V1 + V2",
              ],
              [
                "mixed",
                "Aralash",
              ],
            ] as const
          ).map(
            ([
              value,
              label,
            ]) => (
              <button
                type="button"
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

      {/* =================================================
          EMPTY
      ================================================= */}

      {!currentVerb ? (
        <section className="emptyCard">
          <strong>
            {studyMode ===
            "mistakes"
              ? "Hozircha xato qilingan fe’llar yo‘q."
              : studyMode ===
                "difficult"
              ? "Hozircha qiyin fe’l belgilanmagan."
              : "Fe’llar topilmadi."}
          </strong>

          <button
            type="button"
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
          {/* =============================================
              CURRENT LEVEL
          ============================================= */}

          <div className="currentLevel">
            <span>
              {
                currentLevel.icon
              }
            </span>

            <strong>
              {
                currentLevel.label
              }
            </strong>

            <small>
              Ball:{" "}
              {
                currentProgress.score
              }
            </small>
          </div>

          {/* =============================================
              LEARN MODE
          ============================================= */}

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
                    {
                      currentVerb.v1
                    }
                  </strong>
                </div>

                <div>
                  <span>V2</span>

                  <strong>
                    {
                      currentVerb.v2
                    }
                  </strong>
                </div>

                <div>
                  <span>V3</span>

                  <strong>
                    {
                      currentVerb.v3
                    }
                  </strong>
                </div>

                <p>
                  {
                    currentVerb.uzbek
                  }
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
                {
                  currentVerb.uzbek
                }
              </div>
            </>
          )}

          {/* =============================================
              TOOLS
          ============================================= */}

          <div className="tools">
            <button
              type="button"
              className="toolButton"
              onClick={speak}
            >
              🔊 Talaffuz
            </button>

            <button
              type="button"
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

          {/* =============================================
              CHOICE
          ============================================= */}

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
                      type="button"
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

          {/* =============================================
              WRITING
          ============================================= */}

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
                    spellCheck={
                      false
                    }
                    placeholder={`${writing.firstLabel} ni yozing`}
                    onChange={(
                      event
                    ) =>
                      setWriteOne(
                        event.target
                          .value
                      )
                    }
                    onKeyDown={(
                      event
                    ) => {
                      if (
                        event.key ===
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
                    spellCheck={
                      false
                    }
                    placeholder={`${writing.secondLabel} ni yozing`}
                    onChange={(
                      event
                    ) =>
                      setWriteTwo(
                        event.target
                          .value
                      )
                    }
                    onKeyDown={(
                      event
                    ) => {
                      if (
                        event.key ===
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
                  type="button"
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

          {/* =============================================
              STATS
          ============================================= */}

          {studyMode !==
            "learn" && (
            <div className="stats">
              <div>
                <strong>
                  {
                    correctCount
                  }
                </strong>

                <span>
                  ✓ To‘g‘ri
                </span>
              </div>

              <div>
                <strong>
                  {
                    wrongCount
                  }
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

          {/* =============================================
              NAVIGATION
          ============================================= */}

          <div className="navigation">
            <button
              type="button"
              onClick={
                goPrevious
              }
            >
              ← Oldingi
            </button>

            <button
              type="button"
              className="later"
              onClick={
                showLater
              }
            >
              ↻ Keyinroq yana
              ko‘rsat
            </button>

            <button
              type="button"
              onClick={
                goNext
              }
            >
              Keyingi →
            </button>
          </div>

          <button
            type="button"
            className="resetButton"
            onClick={
              resetLearningProgress
            }
          >
            Yodlash natijalarini
            noldan boshlash
          </button>
        </section>
      )}

      <style jsx>{`
        * {
          box-sizing:
            border-box;
        }

        .page {
          min-height: 100vh;

          padding:
            22px
            14px
            60px;

          background:
            radial-gradient(
              circle at top,
              #ffffff 0%,
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
          font-family:
            inherit;
        }

        button {
          cursor: pointer;
        }

        /* =========================================
           TOP PANEL
        ========================================= */

        .topPanel {
          width:
            min(
              1180px,
              calc(
                100% - 10px
              )
            );

          margin: auto;

          padding:
            16px
            20px;

          display: grid;

          grid-template-columns:
            145px
            1fr
            110px;

          align-items:
            center;

          gap: 16px;

          border:
            3px solid
            #07506d;

          border-radius:
            19px;

          background:
            linear-gradient(
              180deg,
              #82dcf7,
              #55bde5 45%,
              #2596c2
            );

          box-shadow:
            inset 0 6px 5px
              rgba(
                255,
                255,
                255,
                0.7
              ),

            inset 0 -5px 5px
              rgba(
                0,
                0,
                0,
                0.12
              ),

            0 9px 0
              #07506d,

            0 16px 22px
              rgba(
                0,
                0,
                0,
                0.2
              );
        }

        .backButton,
        .studyButton,
        .directionButton,
        .toolButton,
        .navigation button,
        .checkButton,
        .emptyCard button {
          border:
            2px solid
            #526b76;

          border-radius:
            9px;

          background:
            linear-gradient(
              180deg,
              #f6fbfd,
              #d6e3e8
            );

          color: #254d5f;

          font-weight: 900;

          box-shadow:
            0 4px 0
              #607984;
        }

        .backButton {
          min-height: 45px;
        }

        .studyModes {
          display: grid;

          grid-template-columns:
            repeat(
              5,
              minmax(
                0,
                1fr
              )
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
          border-color:
            #073f5d;

          background:
            linear-gradient(
              180deg,
              #d8f6ff,
              #7bccea
            );

          color: #063e5d;

          box-shadow:
            inset 0 3px 3px
              rgba(
                255,
                255,
                255,
                0.8
              ),

            0 4px 0
              #064764;
        }

        .countBadge {
          margin-left: 5px;

          padding:
            1px 5px;

          border-radius:
            20px;

          background:
            #1b6887;

          color: white;

          font-size: 9px;
        }

        .progressBox {
          min-height: 64px;

          display: flex;

          flex-direction:
            column;

          align-items:
            center;

          justify-content:
            center;

          border:
            2px solid
            #174461;

          border-radius:
            10px;

          background:
            linear-gradient(
              #e8faff,
              #b2e1f2
            );

          box-shadow:
            0 4px 0
              #17415c;
        }

        .progressBox strong {
          font-size: 22px;

          line-height: 22px;
        }

        .progressBox span {
          font-size: 11px;

          font-weight: 900;
        }

        .progressBox small {
          margin-top: 3px;

          font-size: 8px;

          font-weight: 900;

          color: #55717d;
        }

        /* =========================================
           SRS PROGRESS
        ========================================= */

        .srsProgress {
          width:
            min(
              760px,
              calc(
                100% - 20px
              )
            );

          margin:
            42px
            auto
            0;

          display: grid;

          grid-template-columns:
            repeat(
              4,
              1fr
            );

          gap: 10px;
        }

        .levelCard {
          min-height: 60px;

          padding:
            7px
            8px;

          display: flex;

          flex-direction:
            column;

          justify-content:
            center;

          border:
            1px solid
            #8b989e;

          border-radius:
            9px;

          background:
            linear-gradient(
              #f3f5f5,
              #dde2e4
            );

          box-shadow:
            0 4px 0
              #879499;

          text-align: center;
        }

        .levelCard strong {
          font-size: 16px;
        }

        .levelCard span {
          margin-top: 3px;

          color: #526872;

          font-size: 9px;

          font-weight: 900;
        }

        /* =========================================
           DIRECTIONS
        ========================================= */

        .directions {
          width:
            min(
              780px,
              calc(
                100% - 20px
              )
            );

          margin:
            25px
            auto
            0;

          display: grid;

          grid-template-columns:
            repeat(
              4,
              1fr
            );

          gap: 10px;
        }

        .directionButton {
          min-height: 39px;

          font-size: 11px;
        }

        /* =========================================
           CONTENT
        ========================================= */

        .content {
          width:
            min(
              950px,
              calc(
                100% - 15px
              )
            );

          margin:
            30px
            auto
            0;

          text-align:
            center;
        }

        .currentLevel {
          width:
            fit-content;

          min-width: 150px;

          margin:
            0 auto
            12px;

          padding:
            5px
            12px;

          display: flex;

          align-items:
            center;

          justify-content:
            center;

          gap: 6px;

          border:
            1px solid
            #9ba8ad;

          border-radius:
            20px;

          background:
            #eef2f3;

          color: #526a75;

          font-size: 10px;

          font-weight: 900;
        }

        .currentLevel small {
          padding-left: 5px;

          border-left:
            1px solid
            #adb8bc;
        }

        .questionLabel,
        .learnTitle {
          width:
            fit-content;

          margin:
            0 auto
            13px;

          padding:
            5px
            14px;

          border:
            1px solid
            #9ca9ae;

          border-radius:
            20px;

          background:
            #e5ebed;

          color: #536a74;

          font-size: 11px;

          font-weight: 900;
        }

        /* =========================================
           WORD
        ========================================= */

        .wordCard {
          width:
            min(
              510px,
              94%
            );

          min-height: 120px;

          margin: auto;

          padding: 20px;

          display: flex;

          align-items:
            center;

          justify-content:
            center;

          border:
            3px solid
            #07506d;

          border-radius:
            17px;

          background:
            linear-gradient(
              #82dcf7,
              #52bae3 45%,
              #2d9dca
            );

          box-shadow:
            inset 0 6px 5px
              rgba(
                255,
                255,
                255,
                0.65
              ),

            0 9px 0
              #07506d,

            0 15px 20px
              rgba(
                0,
                0,
                0,
                0.18
              );

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

        /* =========================================
           LEARN
        ========================================= */

        .learnCard {
          width:
            min(
              720px,
              96%
            );

          margin:
            0 auto;

          padding: 32px;

          display: grid;

          grid-template-columns:
            repeat(
              3,
              1fr
            );

          gap: 18px;

          border:
            3px solid
            #07506d;

          border-radius:
            18px;

          background:
            linear-gradient(
              #83dcf6,
              #4eb6df
            );

          box-shadow:
            inset 0 6px 5px
              rgba(
                255,
                255,
                255,
                0.65
              ),

            0 9px 0
              #07506d,

            0 16px 22px
              rgba(
                0,
                0,
                0,
                0.18
              );
        }

        .learnCard > div {
          min-height: 105px;

          padding: 12px;

          display: flex;

          flex-direction:
            column;

          justify-content:
            center;

          border:
            2px solid
            #597983;

          border-radius:
            12px;

          background:
            linear-gradient(
              #f5f7f7,
              #dce2e4
            );

          box-shadow:
            0 5px 0
              #698087;
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
          grid-column:
            1 / -1;

          margin:
            8px 0 0;

          font-size: 20px;

          font-weight: 900;
        }

        /* =========================================
           TOOLS
        ========================================= */

        .tools {
          margin-top: 25px;

          display: flex;

          justify-content:
            center;

          gap: 12px;

          flex-wrap: wrap;
        }

        .toolButton {
          min-height: 38px;

          padding:
            6px 15px;
        }

        .difficultActive {
          border-color:
            #a7862b;

          background:
            linear-gradient(
              #fff7d7,
              #e7d48a
            );

          color: #72570a;
        }

        /* =========================================
           ANSWERS
        ========================================= */

        .answers {
          margin-top: 55px;

          display: grid;

          grid-template-columns:
            repeat(
              2,
              1fr
            );

          gap: 45px;
        }

        .answerButton {
          min-height: 105px;

          padding: 16px;

          border:
            2px solid
            #747f84;

          border-radius:
            13px;

          background:
            linear-gradient(
              #f1f1f1,
              #dedede
            );

          box-shadow:
            inset 0 5px 5px
              rgba(
                255,
                255,
                255,
                0.9
              ),

            0 8px 0
              #747f84,

            0 13px 18px
              rgba(
                0,
                0,
                0,
                0.18
              );

          color: #172f39;

          font-size: 23px;

          font-weight: 900;
        }

        .answerButton.correct {
          border-color:
            #42845b;

          background:
            linear-gradient(
              #e8f8ed,
              #bfe5cb
            );

          box-shadow:
            0 7px 0
              #4f8b63;
        }

        .answerButton.wrong {
          border-color:
            #a85e5e;

          background:
            linear-gradient(
              #ffeaea,
              #efc2c2
            );

          box-shadow:
            0 7px 0
              #9d6262;
        }

        /* =========================================
           WRITE
        ========================================= */

        .writeArea {
          width:
            min(
              700px,
              100%
            );

          margin:
            55px
            auto
            0;
        }

        .writeInputs {
          display: grid;

          grid-template-columns:
            repeat(
              2,
              1fr
            );

          gap: 25px;
        }

        .writeInputs label {
          display: flex;

          flex-direction:
            column;

          gap: 8px;
        }

        .writeInputs span {
          font-weight: 900;

          color: #41606d;
        }

        .writeInputs input {
          min-height: 70px;

          padding:
            12px
            18px;

          border:
            2px solid
            #6d7e85;

          border-radius:
            12px;

          outline: none;

          background:
            #f3f3f3;

          box-shadow:
            inset 0 4px 7px
              rgba(
                0,
                0,
                0,
                0.08
              ),

            0 5px 0
              #77858a;

          text-align:
            center;

          color: #153c4e;

          font-size: 23px;

          font-weight: 900;
        }

        .writeInputs input:focus {
          border-color:
            #278eb8;
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
          width:
            fit-content;

          margin:
            30px auto 0;

          padding:
            13px 20px;

          border-radius:
            9px;

          font-size: 17px;

          font-weight: 900;
        }

        .writeResult.success {
          background:
            #d8efdf;

          color: #27613b;
        }

        .writeResult.fail {
          background:
            #f5dada;

          color: #843d3d;
        }

        /* =========================================
           STATS
        ========================================= */

        .stats {
          margin-top: 35px;

          display: flex;

          justify-content:
            center;

          gap: 10px;

          flex-wrap: wrap;
        }

        .stats div {
          min-width: 105px;

          min-height: 48px;

          padding:
            5px 10px;

          display: flex;

          flex-direction:
            column;

          border:
            1px solid
            #89969c;

          border-radius:
            8px;

          background:
            linear-gradient(
              #f1f3f4,
              #dce1e3
            );

          box-shadow:
            0 3px 0
              #8b969b;
        }

        .stats strong {
          font-size: 16px;
        }

        .stats span {
          font-size: 9px;

          font-weight: 800;
        }

        /* =========================================
           NAVIGATION
        ========================================= */

        .navigation {
          margin-top: 50px;

          display: grid;

          grid-template-columns:
            160px
            1fr
            160px;

          gap: 20px;
        }

        .navigation button {
          min-height: 44px;
        }

        .navigation .later {
          justify-self:
            center;

          min-width: 230px;

          border-color:
            #337b9a;

          background:
            linear-gradient(
              #dff6ff,
              #a8dceb
            );
        }

        .resetButton {
          margin-top: 35px;

          padding:
            6px 12px;

          border:
            1px solid
            #9b6f6f;

          border-radius: 7px;

          background:
            #ece4e4;

          color: #805454;

          font-size: 9px;

          font-weight: 800;

          cursor: pointer;
        }

        /* =========================================
           EMPTY
        ========================================= */

        .emptyCard {
          width:
            min(
              550px,
              90%
            );

          margin:
            80px auto;

          padding: 35px;

          display: flex;

          flex-direction:
            column;

          gap: 25px;

          text-align: center;

          border:
            2px solid
            #687a82;

          border-radius:
            15px;

          background:
            #e9edef;

          box-shadow:
            0 7px 0
              #78878d;

          font-size: 19px;

          font-weight: 900;
        }

        .emptyCard button {
          min-height: 45px;
        }

        /* =========================================
           TABLET
        ========================================= */

        @media (
          max-width: 900px
        ) {
          .topPanel {
            grid-template-columns:
              130px
              1fr
              90px;
          }

          .studyModes {
            grid-template-columns:
              repeat(
                3,
                1fr
              );
          }
        }

        /* =========================================
           MOBILE
        ========================================= */

        @media (
          max-width: 650px
        ) {
          .page {
            padding:
              10px
              5px
              35px;
          }

          .topPanel {
            width:
              calc(
                100% - 8px
              );

            grid-template-columns:
              1fr
              70px;

            padding: 12px;
          }

          .backButton {
            grid-column:
              1 / -1;
          }

          .studyModes {
            grid-template-columns:
              repeat(
                2,
                1fr
              );
          }

          .studyButton {
            font-size: 10px;
          }

          .progressBox {
            min-height: 95px;
          }

          .srsProgress {
            margin-top: 35px;

            grid-template-columns:
              repeat(
                2,
                1fr
              );
          }

          .directions {
            margin-top: 25px;

            grid-template-columns:
              repeat(
                2,
                1fr
              );
          }

          .content {
            margin-top: 30px;
          }

          .currentLevel {
            flex-wrap: wrap;
          }

          .wordCard {
            min-height: 95px;

            font-size: 34px;
          }

          .learnCard {
            padding:
              20px
              12px;

            grid-template-columns:
              1fr;
          }

          .learnCard p {
            grid-column:
              auto;
          }

          .answers {
            margin-top: 45px;

            grid-template-columns:
              1fr;

            gap: 22px;
          }

          .answerButton {
            min-height: 80px;

            font-size: 20px;
          }

          .writeInputs {
            grid-template-columns:
              1fr;
          }

          .writeInputs input {
            min-height: 60px;

            font-size: 20px;
          }

          .stats {
            display: grid;

            grid-template-columns:
              repeat(
                4,
                1fr
              );
          }

          .stats div {
            min-width: 0;

            padding:
              5px
              2px;
          }

          .navigation {
            grid-template-columns:
              1fr
              1fr;
          }

          .navigation .later {
            grid-column:
              1 / -1;

            grid-row: 1;

            width: 100%;

            min-width: 0;
          }
        }

        @media (
          max-width: 380px
        ) {
          .studyModes {
            grid-template-columns:
              1fr;
          }

          .wordCard {
            font-size: 29px;
          }

          .answerButton {
            font-size: 18px;
          }
        }
      `}</style>
    </main>
  );
}
