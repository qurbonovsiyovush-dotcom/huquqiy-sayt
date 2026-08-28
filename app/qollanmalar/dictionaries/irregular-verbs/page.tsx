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
  total?: number;
};

type Mode =
  | "v1"
  | "v2"
  | "v3"
  | "mixed";

type QuestionMode =
  | "v1"
  | "v2"
  | "v3";

type Question = {
  verb: IrregularVerb;
  mode: QuestionMode;
  prompt: string;
  correctAnswer: string;
  wrongAnswer: string;
  options: string[];
};

const API_URL =
  "/api/dictionary/irregular-verbs";

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
   SAVOL REJIMI
========================================================= */

function getQuestionMode(
  mode: Mode
): QuestionMode {
  if (mode !== "mixed") {
    return mode;
  }

  const modes: QuestionMode[] = [
    "v1",
    "v2",
    "v3",
  ];

  return modes[
    Math.floor(
      Math.random() *
        modes.length
    )
  ];
}

/* =========================================================
   JAVOB MATNI
========================================================= */

function getAnswer(
  verb: IrregularVerb,
  mode: QuestionMode
) {
  if (mode === "v1") {
    return `${verb.v2} — ${verb.v3}`;
  }

  if (mode === "v2") {
    return `${verb.v1} — ${verb.v3}`;
  }

  return `${verb.v1} — ${verb.v2}`;
}

/* =========================================================
   PROMPT
========================================================= */

function getPrompt(
  verb: IrregularVerb,
  mode: QuestionMode
) {
  if (mode === "v1") {
    return verb.v1;
  }

  if (mode === "v2") {
    return verb.v2;
  }

  return verb.v3;
}

/* =========================================================
   LABEL
========================================================= */

function getModeLabel(
  mode: QuestionMode
) {
  if (mode === "v1") {
    return "V1 → V2 + V3";
  }

  if (mode === "v2") {
    return "V2 → V1 + V3";
  }

  return "V3 → V1 + V2";
}

/* =========================================================
   PAGE
========================================================= */

export default function IrregularVerbsLearnPage() {
  const [verbs, setVerbs] =
    useState<IrregularVerb[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [mode, setMode] =
    useState<Mode>("v1");

  const [index, setIndex] =
    useState(0);

  const [question, setQuestion] =
    useState<Question | null>(null);

  const [
    selectedAnswer,
    setSelectedAnswer,
  ] = useState<string | null>(
    null
  );

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
  ] = useState<Set<string>>(
    new Set()
  );

  const autoNextTimer =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

  /* =====================================================
     TIMER
  ===================================================== */

  function clearAutoNextTimer() {
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
      clearAutoNextTimer();
    };
  }, []);

  /* =====================================================
     API
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
          Array.isArray(
            data.verbs
          )
            ? data.verbs
            : [];

        setVerbs(
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
     SAVOL YARATISH
  ===================================================== */

  const createQuestion =
    useCallback(
      (
        currentIndex: number,
        currentMode: Mode
      ) => {
        if (
          verbs.length < 2
        ) {
          setQuestion(null);
          return;
        }

        const verb =
          verbs[
            currentIndex %
              verbs.length
          ];

        const qMode =
          getQuestionMode(
            currentMode
          );

        const correctAnswer =
          getAnswer(
            verb,
            qMode
          );

        /*
          Noto‘g‘ri javob uchun
          boshqa fe’l tanlaymiz.
        */

        let wrongVerb =
          verbs[
            Math.floor(
              Math.random() *
                verbs.length
            )
          ];

        let guard = 0;

        while (
          wrongVerb.id ===
            verb.id &&
          guard < 50
        ) {
          wrongVerb =
            verbs[
              Math.floor(
                Math.random() *
                  verbs.length
              )
            ];

          guard++;
        }

        const wrongAnswer =
          getAnswer(
            wrongVerb,
            qMode
          );

        const options =
          Math.random() > 0.5
            ? [
                correctAnswer,
                wrongAnswer,
              ]
            : [
                wrongAnswer,
                correctAnswer,
              ];

        setQuestion({
          verb,
          mode: qMode,
          prompt:
            getPrompt(
              verb,
              qMode
            ),
          correctAnswer,
          wrongAnswer,
          options,
        });

        setSelectedAnswer(
          null
        );
      },
      [verbs]
    );

  useEffect(() => {
    if (
      verbs.length >= 2
    ) {
      createQuestion(
        index,
        mode
      );
    }
  }, [
    verbs,
    index,
    mode,
    createQuestion,
  ]);

  /* =====================================================
     KEYINGI
  ===================================================== */

  function goNext() {
    clearAutoNextTimer();

    if (!verbs.length) {
      return;
    }

    setIndex((prev) =>
      prev >=
      verbs.length - 1
        ? 0
        : prev + 1
    );

    setSelectedAnswer(null);
  }

  /* =====================================================
     OLDINGI
  ===================================================== */

  function goPrevious() {
    clearAutoNextTimer();

    if (!verbs.length) {
      return;
    }

    setIndex((prev) =>
      prev <= 0
        ? verbs.length - 1
        : prev - 1
    );

    setSelectedAnswer(null);
  }

  /* =====================================================
     AVTOMATIK KEYINGI
  ===================================================== */

  function goNextAutomatically() {
    clearAutoNextTimer();

    autoNextTimer.current =
      setTimeout(() => {
        setIndex((prev) =>
          prev >=
          verbs.length - 1
            ? 0
            : prev + 1
        );

        setSelectedAnswer(
          null
        );

        autoNextTimer.current =
          null;
      }, 700);
  }

  /* =====================================================
     JAVOB
  ===================================================== */

  function handleAnswer(
    answer: string
  ) {
    if (
      !question ||
      selectedAnswer !== null
    ) {
      return;
    }

    setSelectedAnswer(answer);

    if (
      answer ===
      question.correctAnswer
    ) {
      setCorrectCount(
        (prev) => prev + 1
      );
    } else {
      setWrongCount(
        (prev) => prev + 1
      );
    }

    goNextAutomatically();
  }

  /* =====================================================
     KEYINROQ KO‘RSATISH
  ===================================================== */

  function showLater() {
    clearAutoNextTimer();

    if (!verbs.length) {
      return;
    }

    const current =
      verbs[index];

    const newList = [
      ...verbs
        .slice(index + 1),
      ...verbs.slice(
        0,
        index
      ),
      current,
    ];

    setVerbs(newList);
    setIndex(0);
    setSelectedAnswer(null);
  }

  /* =====================================================
     QIYIN FE’L
  ===================================================== */

  function toggleDifficult() {
    if (!question) return;

    const id =
      question.verb.id;

    setDifficultIds(
      (previous) => {
        const next =
          new Set(previous);

        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }

        return next;
      }
    );
  }

  /* =====================================================
     REJIM
  ===================================================== */

  function changeMode(
    newMode: Mode
  ) {
    clearAutoNextTimer();

    setMode(newMode);
    setIndex(0);
    setSelectedAnswer(null);
    setCorrectCount(0);
    setWrongCount(0);
  }

  /* =====================================================
     TALAFFUZ
  ===================================================== */

  function speakWord() {
    if (
      !question ||
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
        question.prompt
      );

    utterance.lang = "en-US";
    utterance.rate = 0.85;

    window.speechSynthesis.speak(
      utterance
    );
  }

  /* =====================================================
     CURRENT
  ===================================================== */

  const isDifficult =
    question
      ? difficultIds.has(
          question.verb.id
        )
      : false;

  const currentNumber =
    verbs.length
      ? index + 1
      : 0;

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

  if (
    error ||
    verbs.length < 2 ||
    !question
  ) {
    return (
      <main className="statePage">
        <div className="stateCard">
          {error ||
            "Mashq qilish uchun kamida 2 ta fe’l kerak."}

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
            text-align: center;
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
      {/* ===============================================
          TOP PANEL
      =============================================== */}

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

        <div className="modeArea">
          <button
            type="button"
            className={
              mode === "v1"
                ? "modeButton active"
                : "modeButton"
            }
            onClick={() =>
              changeMode("v1")
            }
          >
            V1 → V2 + V3
          </button>

          <button
            type="button"
            className={
              mode === "v2"
                ? "modeButton active"
                : "modeButton"
            }
            onClick={() =>
              changeMode("v2")
            }
          >
            V2 → V1 + V3
          </button>

          <button
            type="button"
            className={
              mode === "v3"
                ? "modeButton active"
                : "modeButton"
            }
            onClick={() =>
              changeMode("v3")
            }
          >
            V3 → V1 + V2
          </button>

          <button
            type="button"
            className={
              mode === "mixed"
                ? "modeButton active"
                : "modeButton"
            }
            onClick={() =>
              changeMode("mixed")
            }
          >
            Aralash
          </button>
        </div>

        <div className="progressBox">
          <strong>
            {currentNumber}
          </strong>

          <span>
            / {verbs.length}
          </span>
        </div>
      </section>

      {/* ===============================================
          CONTENT
      =============================================== */}

      <section className="content">
        <div className="modeLabel">
          {getModeLabel(
            question.mode
          )}
        </div>

        {/* WORD */}

        <div className="wordCard">
          {question.prompt}
        </div>

        {/* TRANSLATION */}

        <div className="translation">
          {question.verb.uzbek}
        </div>

        {/* TOOLS */}

        <div className="tools">
          <button
            type="button"
            className="toolButton"
            onClick={speakWord}
          >
            🔊 Talaffuz
          </button>

          <button
            type="button"
            className={
              isDifficult
                ? "toolButton difficultActive"
                : "toolButton"
            }
            onClick={
              toggleDifficult
            }
          >
            {isDifficult
              ? "★ Qiyin fe’l"
              : "☆ Qiyin fe’l"}
          </button>
        </div>

        {/* ANSWERS */}

        <div className="answers">
          {question.options.map(
            (answer) => {
              let className =
                "answerButton";

              if (
                selectedAnswer !==
                null
              ) {
                if (
                  answer ===
                  question.correctAnswer
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
                  type="button"
                  className={
                    className
                  }
                  disabled={
                    selectedAnswer !==
                    null
                  }
                  onClick={() =>
                    handleAnswer(
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

        {/* MINI STATS */}

        <div className="miniStats">
          <div className="miniStat">
            <span>✓</span>

            <strong>
              {correctCount}
            </strong>

            <small>
              To‘g‘ri
            </small>
          </div>

          <div className="miniStat">
            <span>✕</span>

            <strong>
              {wrongCount}
            </strong>

            <small>
              Xato
            </small>
          </div>

          <div className="miniStat">
            <span>★</span>

            <strong>
              {
                difficultIds.size
              }
            </strong>

            <small>
              Qiyin
            </small>
          </div>

          <div className="miniStat accuracy">
            <span>%</span>

            <strong>
              {accuracy}
            </strong>

            <small>
              Natija
            </small>
          </div>
        </div>

        {/* NAVIGATION */}

        <div className="navigation">
          <button
            type="button"
            className="navButton"
            onClick={goPrevious}
          >
            ← Oldingi
          </button>

          <button
            type="button"
            className="laterButton"
            onClick={showLater}
          >
            ↻ Keyinroq yana
            ko‘rsat
          </button>

          <button
            type="button"
            className="navButton"
            onClick={goNext}
          >
            Keyingi →
          </button>
        </div>
      </section>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;

          padding:
            24px
            12px
            60px;

          background:
            radial-gradient(
              circle at top,
              #ffffff 0%,
              #f3f6f7 45%,
              #e7ecef 100%
            );

          color: #111;

          font-family:
            "Bell MT",
            "Times New Roman",
            Georgia,
            serif;
        }

        button {
          font-family: inherit;
        }

        /* =========================================
           TOP PANEL
        ========================================= */

        .topPanel {
          width:
            min(
              1090px,
              calc(
                100% - 20px
              )
            );

          min-height: 105px;

          margin: 0 auto;

          padding:
            16px
            25px;

          display: grid;

          grid-template-columns:
            175px
            1fr
            110px;

          align-items: center;

          gap: 20px;

          border:
            3px solid
            #074d6c;

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
            inset 0 6px 5px
              rgba(
                255,
                255,
                255,
                .75
              ),

            inset 0 -5px 5px
              rgba(
                0,
                0,
                0,
                .13
              ),

            0 9px 0
              #07506c,

            0 16px 23px
              rgba(
                0,
                0,
                0,
                .20
              );
        }

        .backButton,
        .modeButton,
        .toolButton,
        .navButton,
        .laterButton {
          cursor: pointer;

          font-weight: 800;
        }

        .backButton {
          min-height: 46px;

          padding:
            8px
            14px;

          border:
            2px solid
            #174461;

          border-radius: 9px;

          color: #073b68;

          background:
            linear-gradient(
              180deg,
              #c8f2ff,
              #82d1ef 55%,
              #4ba4d0
            );

          box-shadow:
            inset 0 4px 4px
              rgba(
                255,
                255,
                255,
                .8
              ),

            0 4px 0
              #17415c;
        }

        .modeArea {
          display: grid;

          grid-template-columns:
            repeat(
              4,
              minmax(
                0,
                1fr
              )
            );

          gap: 8px;
        }

        .modeButton {
          min-height: 43px;

          padding:
            6px
            8px;

          border:
            2px solid
            #276a88;

          border-radius: 8px;

          background:
            linear-gradient(
              180deg,
              #f4fbfd,
              #d9e7ec
            );

          color: #335665;

          box-shadow:
            0 3px 0
              #24627e;

          font-size: 12px;
        }

        .modeButton.active {
          border-color:
            #073d5b;

          background:
            linear-gradient(
              180deg,
              #d4f5ff,
              #7bcceb
            );

          color: #063c5c;

          box-shadow:
            inset 0 3px 4px
              rgba(
                255,
                255,
                255,
                .8
              ),

            0 4px 0
              #073f5b;
        }

        .progressBox {
          min-height: 62px;

          display: flex;

          align-items:
            baseline;

          justify-content:
            center;

          gap: 4px;

          border:
            2px solid
            #174461;

          border-radius: 10px;

          background:
            linear-gradient(
              180deg,
              #e7f9ff,
              #addff2
            );

          box-shadow:
            inset 0 4px 4px
              rgba(
                255,
                255,
                255,
                .85
              ),

            0 4px 0
              #17415c;
        }

        .progressBox strong {
          color: #073b68;

          font-size: 25px;
        }

        .progressBox span {
          color: #496674;

          font-size: 13px;

          font-weight: 800;
        }

        /* =========================================
           CONTENT
        ========================================= */

        .content {
          width:
            min(
              960px,
              calc(
                100% - 20px
              )
            );

          margin:
            55px
            auto
            0;

          text-align: center;
        }

        .modeLabel {
          width:
            fit-content;

          margin:
            0 auto
            13px;

          padding:
            5px
            13px;

          border:
            1px solid
            #9aa8ae;

          border-radius:
            20px;

          background: #e3eaed;

          color: #536871;

          font-size: 11px;

          font-weight: 900;
        }

        /* =========================================
           WORD
        ========================================= */

        .wordCard {
          width:
            min(
              500px,
              92%
            );

          min-height: 122px;

          margin: 0 auto;

          padding:
            20px;

          display: flex;

          align-items: center;

          justify-content:
            center;

          border:
            3px solid
            #07506d;

          border-radius: 17px;

          background:
            linear-gradient(
              180deg,
              #81dcf7 0%,
              #59bee6 40%,
              #2fa0cf 100%
            );

          box-shadow:
            inset 0 6px 5px
              rgba(
                255,
                255,
                255,
                .65
              ),

            inset 0 -4px 4px
              rgba(
                0,
                0,
                0,
                .10
              ),

            0 9px 0
              #07506d,

            0 15px 20px
              rgba(
                0,
                0,
                0,
                .18
              );

          color: #073b68;

          font-size: 42px;

          font-weight: 900;

          overflow-wrap:
            anywhere;
        }

        .translation {
          margin-top: 20px;

          color: #5a6970;

          font-size: 17px;

          font-weight: 800;
        }

        /* =========================================
           TOOLS
        ========================================= */

        .tools {
          margin-top: 20px;

          display: flex;

          justify-content:
            center;

          gap: 12px;

          flex-wrap: wrap;
        }

        .toolButton {
          min-height: 39px;

          padding:
            6px
            14px;

          border:
            1px solid
            #8d999e;

          border-radius: 8px;

          background:
            linear-gradient(
              180deg,
              #f6f6f6,
              #dadfe1
            );

          color: #465b65;

          box-shadow:
            0 3px 0
              #8b969b;
        }

        .difficultActive {
          border-color:
            #af8a27;

          background:
            linear-gradient(
              180deg,
              #fff7d7,
              #ead88e
            );

          color: #70550b;
        }

        /* =========================================
           ANSWERS
        ========================================= */

        .answers {
          margin-top: 65px;

          display: grid;

          grid-template-columns:
            repeat(
              2,
              minmax(
                280px,
                1fr
              )
            );

          gap: 52px;
        }

        .answerButton {
          min-height: 108px;

          padding:
            15px
            20px;

          border:
            2px solid
            #747f84;

          border-radius: 13px;

          background:
            linear-gradient(
              180deg,
              #eeeeee 0%,
              #e7e7e7 50%,
              #dcdcdc 100%
            );

          box-shadow:
            inset 0 5px 5px
              rgba(
                255,
                255,
                255,
                .95
              ),

            inset 0 -4px 4px
              rgba(
                0,
                0,
                0,
                .08
              ),

            0 8px 0
              #747f84,

            0 13px 18px
              rgba(
                0,
                0,
                0,
                .19
              );

          color: #152c36;

          font-size: 24px;

          font-weight: 900;

          cursor: pointer;

          transition:
            transform
            .08s ease;
        }

        .answerButton:hover:not(
            :disabled
          ) {
          transform:
            translateY(
              -2px
            );
        }

        .answerButton.correct {
          border-color:
            #42845b;

          background:
            linear-gradient(
              180deg,
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
              180deg,
              #ffeaea,
              #efc2c2
            );

          box-shadow:
            0 7px 0
              #9d6262;
        }

        .answerButton:disabled {
          cursor: default;
        }

        /* =========================================
           STATS
        ========================================= */

        .miniStats {
          margin-top: 34px;

          display: flex;

          align-items: center;

          justify-content:
            center;

          gap: 12px;

          flex-wrap: wrap;
        }

        .miniStat {
          min-width: 112px;

          min-height: 43px;

          padding:
            5px
            10px;

          display: grid;

          grid-template-columns:
            20px
            1fr;

          grid-template-rows:
            20px
            13px;

          align-items: center;

          border:
            1px solid
            #89969c;

          border-radius: 8px;

          background:
            linear-gradient(
              180deg,
              #f1f3f4,
              #dce1e3
            );

          box-shadow:
            0 3px 0
              #8b969b;
        }

        .miniStat > span {
          grid-row:
            1 / 3;

          color: #477080;

          font-weight: 900;
        }

        .miniStat strong {
          color: #153f52;

          font-size: 15px;
        }

        .miniStat small {
          color: #667980;

          font-size: 9px;

          font-weight: 800;
        }

        /* =========================================
           NAVIGATION
        ========================================= */

        .navigation {
          margin-top: 55px;

          display: grid;

          grid-template-columns:
            160px
            1fr
            160px;

          gap: 18px;

          align-items: center;
        }

        .navButton,
        .laterButton {
          min-height: 45px;

          padding:
            8px
            14px;

          border:
            2px solid
            #64737a;

          border-radius: 9px;

          background:
            linear-gradient(
              180deg,
              #f5f5f5,
              #d8dcde
            );

          color: #354e59;

          box-shadow:
            0 4px 0
              #7b868b;
        }

        .laterButton {
          justify-self: center;

          min-width: 230px;

          border-color:
            #337b9a;

          background:
            linear-gradient(
              180deg,
              #dff6ff,
              #a8dceb
            );

          color: #17526b;

          box-shadow:
            0 4px 0
              #397a95;
        }

        /* =========================================
           TABLET
        ========================================= */

        @media (
          max-width: 850px
        ) {
          .topPanel {
            grid-template-columns:
              150px
              1fr
              85px;

            gap: 12px;

            padding:
              14px;
          }

          .modeArea {
            grid-template-columns:
              repeat(
                2,
                1fr
              );
          }

          .answers {
            gap: 25px;
          }
        }

        /* =========================================
           MOBILE
        ========================================= */

        @media (
          max-width: 620px
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
                100% - 10px
              );

            padding: 12px;

            display: grid;

            grid-template-columns:
              1fr
              70px;

            gap: 10px;

            border-radius: 15px;
          }

          .backButton {
            grid-column:
              1 / -1;

            width: 100%;

            min-height: 39px;
          }

          .modeArea {
            grid-template-columns:
              repeat(
                2,
                minmax(
                  0,
                  1fr
                )
              );

            gap: 7px;
          }

          .modeButton {
            min-height: 39px;

            padding:
              5px
              3px;

            font-size: 10px;
          }

          .progressBox {
            min-height: 85px;

            flex-direction:
              column;

            align-items: center;

            gap: 0;
          }

          .progressBox strong {
            font-size: 22px;
          }

          .content {
            width:
              calc(
                100% - 14px
              );

            margin-top: 38px;
          }

          .wordCard {
            min-height: 100px;

            font-size: 34px;
          }

          .translation {
            font-size: 15px;
          }

          .answers {
            margin-top: 48px;

            grid-template-columns:
              1fr;

            gap: 22px;
          }

          .answerButton {
            min-height: 82px;

            font-size: 20px;
          }

          .miniStats {
            display: grid;

            grid-template-columns:
              repeat(
                4,
                minmax(
                  0,
                  1fr
                )
              );

            gap: 6px;
          }

          .miniStat {
            min-width: 0;

            min-height: 54px;

            padding:
              5px
              3px;

            display: flex;

            flex-direction:
              column;

            justify-content:
              center;

            gap: 0;
          }

          .miniStat > span {
            display: none;
          }

          .miniStat strong {
            font-size: 15px;
          }

          .miniStat small {
            font-size: 8px;
          }

          .navigation {
            margin-top: 42px;

            grid-template-columns:
              1fr
              1fr;

            gap: 12px;
          }

          .laterButton {
            grid-column:
              1 / -1;

            grid-row: 1;

            width: 100%;

            min-width: 0;
          }

          .navButton {
            width: 100%;

            padding:
              6px;

            font-size: 12px;
          }
        }

        @media (
          max-width: 370px
        ) {
          .wordCard {
            font-size: 29px;
          }

          .answerButton {
            font-size: 18px;
          }

          .modeButton {
            font-size: 9px;
          }
        }
      `}</style>
    </main>
  );
}
