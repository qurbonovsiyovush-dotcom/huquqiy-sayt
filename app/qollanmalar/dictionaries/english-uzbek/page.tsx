"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type Mode = "en-uz" | "uz-en" | "mixed";

type DictionaryWord = {
  id: string;
  english: string;
  uzbek: string;
  createdAt?: string;
  updatedAt?: string;
};

type ApiResponse = {
  ok: boolean;
  message?: string;
  total?: number;
  words?: DictionaryWord[];
};

const API = "/api/dictionary/english-uzbek";

/* =========================================================
   MASSIVNI ARALASHTIRISH
========================================================= */

function shuffle<T>(items: T[]): T[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [result[i], result[j]] = [
      result[j],
      result[i],
    ];
  }

  return result;
}

/* =========================================================
   LOCAL STORAGE
========================================================= */

const HARD_WORDS_KEY =
  "english_uzbek_hard_words";

function readHardWords(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const saved =
      window.localStorage.getItem(
        HARD_WORDS_KEY
      );

    if (!saved) return [];

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function saveHardWords(ids: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    HARD_WORDS_KEY,
    JSON.stringify(ids)
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function EnglishUzbekPage() {
  const router = useRouter();

  const [words, setWords] =
    useState<DictionaryWord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [mode, setMode] =
    useState<Mode>("en-uz");

  const [index, setIndex] =
    useState(0);

  const [options, setOptions] =
    useState<string[]>([]);

  const [selected, setSelected] =
    useState<string | null>(null);

  const [correctCount, setCorrectCount] =
    useState(0);

  const [wrongCount, setWrongCount] =
    useState(0);

  const [hardWords, setHardWords] =
    useState<string[]>([]);

  const [laterWords, setLaterWords] =
    useState<string[]>([]);

  const [sessionFinished, setSessionFinished] =
    useState(false);

  /* =======================================================
     QIYIN SO'ZLARNI YUKLASH
  ======================================================= */

  useEffect(() => {
    setHardWords(readHardWords());
  }, []);

  /* =======================================================
     API DAN LUG'ATLARNI OLISH
  ======================================================= */

  const loadWords = useCallback(
    async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(API, {
          method: "GET",
          cache: "no-store",
        });

        const data: ApiResponse =
          await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(
            data.message ||
              "Lug‘atlarni yuklab bo‘lmadi."
          );
        }

        const loadedWords =
          Array.isArray(data.words)
            ? data.words.filter(
                (word) =>
                  word &&
                  typeof word.english ===
                    "string" &&
                  typeof word.uzbek ===
                    "string" &&
                  word.english.trim() &&
                  word.uzbek.trim()
              )
            : [];

        setWords(loadedWords);
        setIndex(0);
        setSelected(null);
        setSessionFinished(false);
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Lug‘atlarni yuklashda xatolik yuz berdi."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadWords();
  }, [loadWords]);

  /* =======================================================
     HOZIRGI SO'Z
  ======================================================= */

  const current =
    words.length > 0
      ? words[index]
      : undefined;

  /* =======================================================
     ARALASH REJIM
  ======================================================= */

  const effectiveMode =
    useMemo<"en-uz" | "uz-en">(() => {
      if (mode === "en-uz") {
        return "en-uz";
      }

      if (mode === "uz-en") {
        return "uz-en";
      }

      /*
        Aralash rejimda:
        1-so'z EN → UZ
        2-so'z UZ → EN
        va hokazo.
      */

      return index % 2 === 0
        ? "en-uz"
        : "uz-en";
    }, [mode, index]);

  /* =======================================================
     SAVOL
  ======================================================= */

  const question = useMemo(() => {
    if (!current) return "";

    return effectiveMode === "en-uz"
      ? current.english
      : current.uzbek;
  }, [current, effectiveMode]);

  /* =======================================================
     TO'G'RI JAVOB
  ======================================================= */

  const correctAnswer =
    useMemo(() => {
      if (!current) return "";

      return effectiveMode === "en-uz"
        ? current.uzbek
        : current.english;
    }, [current, effectiveMode]);

  /* =======================================================
     2 TA JAVOB VARIANTI
  ======================================================= */

  useEffect(() => {
    if (!current) {
      setOptions([]);
      return;
    }

    /*
      Boshqa lug'atlardan noto'g'ri
      variantlarni olamiz.
    */

    const wrongPool = words
      .filter(
        (word) =>
          word.id !== current.id
      )
      .map((word) =>
        effectiveMode === "en-uz"
          ? word.uzbek
          : word.english
      )
      .filter(
        (answer) =>
          answer.trim().toLowerCase() !==
          correctAnswer
            .trim()
            .toLowerCase()
      );

    /*
      Takroriy variantlarni olib tashlaymiz.
    */

    const uniqueWrongPool = [
      ...new Set(wrongPool),
    ];

    if (uniqueWrongPool.length === 0) {
      setOptions([correctAnswer]);
      setSelected(null);
      return;
    }

    const randomWrong =
      uniqueWrongPool[
        Math.floor(
          Math.random() *
            uniqueWrongPool.length
        )
      ];

    setOptions(
      shuffle([
        correctAnswer,
        randomWrong,
      ])
    );

    setSelected(null);
  }, [
    current,
    words,
    effectiveMode,
    correctAnswer,
  ]);

  /* =======================================================
     REJIMNI O'ZGARTIRISH
  ======================================================= */

  function changeMode(newMode: Mode) {
    setMode(newMode);
    setIndex(0);
    setSelected(null);
    setCorrectCount(0);
    setWrongCount(0);
    setLaterWords([]);
    setSessionFinished(false);
  }

  /* =======================================================
     KEYINGI SO'Z
  ======================================================= */

  function nextWord() {
    if (words.length === 0) return;

    setSelected(null);

    if (index < words.length - 1) {
      setIndex((old) => old + 1);
    } else {
      setSessionFinished(true);
    }
  }

  /* =======================================================
     OLDINGI SO'Z
  ======================================================= */

  function previousWord() {
    if (words.length === 0) return;

    setSessionFinished(false);
    setSelected(null);

    if (index > 0) {
      setIndex((old) => old - 1);
    } else {
      setIndex(words.length - 1);
    }
  }

  /* =======================================================
     JAVOBNI TANLASH
  ======================================================= */

  function chooseAnswer(answer: string) {
    if (!current || selected) {
      return;
    }

    setSelected(answer);

    const isCorrect =
      answer === correctAnswer;

    if (isCorrect) {
      setCorrectCount(
        (old) => old + 1
      );

      /*
        To'g'ri bo'lsa qisqa vaqt
        yashil rang ko'rinadi,
        keyin keyingi so'zga o'tadi.
      */

      window.setTimeout(() => {
        nextWord();
      }, 650);
    } else {
      setWrongCount(
        (old) => old + 1
      );

      /*
        Xato qilingan so'zni
        keyinroq yana ko'rsatish
        ro'yxatiga qo'shamiz.
      */

      setLaterWords((old) => {
        if (
          old.includes(current.id)
        ) {
          return old;
        }

        return [
          ...old,
          current.id,
        ];
      });
    }
  }

  /* =======================================================
     QIYIN SO'Z
  ======================================================= */

  function toggleHardWord() {
    if (!current) return;

    setHardWords((old) => {
      let next: string[];

      if (
        old.includes(current.id)
      ) {
        next = old.filter(
          (id) =>
            id !== current.id
        );
      } else {
        next = [
          ...old,
          current.id,
        ];
      }

      saveHardWords(next);

      return next;
    });
  }

  /* =======================================================
     KEYINROQ YANA KO'RSAT
  ======================================================= */

  function showLater() {
    if (!current) return;

    setLaterWords((old) => {
      if (
        old.includes(current.id)
      ) {
        return old;
      }

      return [
        ...old,
        current.id,
      ];
    });

    nextWord();
  }

  /* =======================================================
     TALAFFUZ
  ======================================================= */

  function speakWord() {
    if (
      !current ||
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      return;
    }

    window.speechSynthesis.cancel();

    /*
      Talaffuz har doim
      inglizcha so'zni o'qiydi.
    */

    const speech =
      new SpeechSynthesisUtterance(
        current.english
      );

    speech.lang = "en-US";
    speech.rate = 0.82;
    speech.pitch = 1;

    window.speechSynthesis.speak(
      speech
    );
  }

  /* =======================================================
     QAYTA BOSHLASH
  ======================================================= */

  function restart() {
    setIndex(0);
    setSelected(null);
    setCorrectCount(0);
    setWrongCount(0);
    setLaterWords([]);
    setSessionFinished(false);
  }

  /* =======================================================
     QIYINMI?
  ======================================================= */

  const isHard =
    current
      ? hardWords.includes(
          current.id
        )
      : false;

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <main className="page">
        <section className="statusCard">
          <div className="loader" />

          <h2>
            Lug‘atlar yuklanmoqda...
          </h2>
        </section>

        <PageStyles />
      </main>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (error) {
    return (
      <main className="page">
        <section className="statusCard">
          <h2>
            Lug‘atlarni yuklab bo‘lmadi
          </h2>

          <p>{error}</p>

          <button
            className="blue3dButton"
            onClick={loadWords}
          >
            Qayta urinish
          </button>
        </section>

        <PageStyles />
      </main>
    );
  }

  /* =======================================================
     BAZA BO'SH
  ======================================================= */

  if (words.length === 0) {
    return (
      <main className="page">
        <section className="statusCard">
          <h1>
            English–Uzbek
          </h1>

          <h2>
            Hozircha lug‘at kiritilmagan
          </h2>

          <p>
            Administrator lug‘atlarni
            kiritgandan keyin ular shu
            sahifada avtomatik paydo
            bo‘ladi.
          </p>

          <button
            className="gray3dButton"
            onClick={() =>
              router.push(
                "/qollanmalar/dictionaries"
              )
            }
          >
            ← Lug‘atlarga qaytish
          </button>
        </section>

        <PageStyles />
      </main>
    );
  }

  /* =======================================================
     TUGAGAN HOLAT
  ======================================================= */

  if (sessionFinished) {
    return (
      <main className="page">
        <section className="finishCard">
          <div className="finishIcon">
            ✓
          </div>

          <h1>
            Lug‘atlar tugadi!
          </h1>

          <div className="finishStats">
            <div>
              <strong>
                {words.length}
              </strong>

              <span>
                Jami
              </span>
            </div>

            <div>
              <strong>
                {correctCount}
              </strong>

              <span>
                To‘g‘ri
              </span>
            </div>

            <div>
              <strong>
                {wrongCount}
              </strong>

              <span>
                Xato
              </span>
            </div>

            <div>
              <strong>
                {laterWords.length}
              </strong>

              <span>
                Qaytarish
              </span>
            </div>
          </div>

          <button
            className="blue3dButton"
            onClick={restart}
          >
            ↻ Qayta boshlash
          </button>

          <button
            className="gray3dButton"
            onClick={() =>
              router.push(
                "/qollanmalar/dictionaries"
              )
            }
          >
            ← Lug‘atlarga qaytish
          </button>
        </section>

        <PageStyles />
      </main>
    );
  }

  /* =======================================================
     ASOSIY SAHIFA
  ======================================================= */

  return (
    <main className="page">
      {/* =========================
          YUQORI PANEL
      ========================= */}

      <section className="topPanel">
        <button
          className="backButton"
          onClick={() =>
            router.push(
              "/qollanmalar/dictionaries"
            )
          }
        >
          ← Lug‘atlar
        </button>

        <div className="modeArea">
          <button
            className={`modeButton ${
              mode === "en-uz"
                ? "active"
                : ""
            }`}
            onClick={() =>
              changeMode("en-uz")
            }
          >
            English → Uzbek
          </button>

          <button
            className={`modeButton ${
              mode === "uz-en"
                ? "active"
                : ""
            }`}
            onClick={() =>
              changeMode("uz-en")
            }
          >
            Uzbek → English
          </button>

          <button
            className={`modeButton ${
              mode === "mixed"
                ? "active"
                : ""
            }`}
            onClick={() =>
              changeMode("mixed")
            }
          >
            Aralash
          </button>
        </div>

        <div className="counter">
          {index + 1} /{" "}
          {words.length}
        </div>
      </section>

      {/* =========================
          STATISTIKA
      ========================= */}

      <section className="stats">
        <div className="statBox">
          <strong>
            {words.length}
          </strong>

          <span>
            Jami so‘z
          </span>
        </div>

        <div className="statBox">
          <strong>
            {correctCount}
          </strong>

          <span>
            To‘g‘ri
          </span>
        </div>

        <div className="statBox">
          <strong>
            {wrongCount}
          </strong>

          <span>
            Xato
          </span>
        </div>

        <div className="statBox">
          <strong>
            {hardWords.length}
          </strong>

          <span>
            Qiyin so‘z
          </span>
        </div>
      </section>

      {/* =========================
          ASOSIY SO'Z
      ========================= */}

      <section className="wordCard">
        {question}
      </section>

      {/* =========================
          TALAFFUZ VA QIYIN
      ========================= */}

      <div className="wordActions">
        <button
          className="gray3dButton"
          onClick={speakWord}
        >
          🔊 Talaffuz
        </button>

        <button
          className={
            isHard
              ? "hardButton"
              : "gray3dButton"
          }
          onClick={toggleHardWord}
        >
          {isHard
            ? "★ Qiyin so‘z"
            : "☆ Qiyin so‘z"}
        </button>
      </div>

      {/* =========================
          2 TA JAVOB
      ========================= */}

      <section className="answers">
        {options.map(
          (option, optionIndex) => {
            let stateClass = "";

            if (selected) {
              if (
                option ===
                correctAnswer
              ) {
                stateClass =
                  "correct";
              } else if (
                option ===
                selected
              ) {
                stateClass =
                  "wrong";
              }
            }

            return (
              <button
                key={`${option}-${optionIndex}`}
                className={`answerButton ${stateClass}`}
                disabled={
                  Boolean(selected)
                }
                onClick={() =>
                  chooseAnswer(
                    option
                  )
                }
              >
                {option}
              </button>
            );
          }
        )}
      </section>

      {/* =========================
          XATO JAVOB
      ========================= */}

      {selected &&
        selected !==
          correctAnswer && (
          <div className="wrongNotice">
            <span>✕</span>

            Noto‘g‘ri.

            <strong>
              To‘g‘ri javob:{" "}
              {correctAnswer}
            </strong>
          </div>
        )}

      {/* =========================
          PASTKI TUGMALAR
      ========================= */}

      <section className="bottomActions">
        <button
          className="gray3dButton"
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
          className="gray3dButton"
          onClick={nextWord}
        >
          Keyingi →
        </button>
      </section>

      <PageStyles />
    </main>
  );
}

/* =========================================================
   CSS
========================================================= */

function PageStyles() {
  return (
    <style jsx global>{`
      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        padding: 0;
      }

      body {
        background: #f2f5f7;
      }

      button {
        font-family:
          "Bell MT",
          Georgia,
          serif;
      }

      .page {
        min-height: 100vh;

        padding:
          32px 28px
          80px;

        font-family:
          "Bell MT",
          Georgia,
          serif;

        color: #102f42;

        background:
          radial-gradient(
            circle at top,
            #ffffff 0%,
            #f7f9fa 45%,
            #e9eef1 100%
          );
      }

      /* =========================
         TOP
      ========================= */

      .topPanel {
        width:
          min(1180px, 100%);

        min-height: 120px;

        margin:
          0 auto 32px;

        padding:
          22px 28px;

        display: grid;

        grid-template-columns:
          170px 1fr
          130px;

        align-items: center;

        gap: 20px;

        border:
          3px solid #174c67;

        border-radius: 23px;

        background:
          linear-gradient(
            180deg,
            #a9e9ff 0%,
            #79ceef 17%,
            #55b1df 62%,
            #3e96c2 100%
          );

        box-shadow:
          inset 0 4px 3px
            rgba(
              255,
              255,
              255,
              0.85
            ),
          inset 0 -7px 8px
            rgba(
              0,
              65,
              100,
              0.2
            ),
          0 9px 0 #164b65,
          0 16px 24px
            rgba(
              0,
              0,
              0,
              0.2
            );
      }

      .modeArea {
        display: flex;

        justify-content:
          center;

        gap: 14px;

        flex-wrap: wrap;
      }

      .counter {
        text-align: right;

        font-size: 19px;
        font-weight: 900;

        letter-spacing: 1px;

        color: #073e5d;
      }

      /* =========================
         BUTTONS
      ========================= */

      .backButton,
      .gray3dButton,
      .laterButton,
      .modeButton,
      .blue3dButton,
      .hardButton {
        min-height: 46px;

        padding:
          9px 18px;

        border-radius: 9px;

        font-size: 15px;
        font-weight: 900;

        cursor: pointer;

        transition:
          transform 0.12s ease,
          box-shadow 0.12s ease;
      }

      .backButton,
      .gray3dButton,
      .laterButton {
        border:
          2px solid #626b70;

        color: #163342;

        background:
          linear-gradient(
            180deg,
            #ffffff,
            #f4f4f4 48%,
            #d5d5d5
          );

        box-shadow:
          inset 0 3px 2px
            white,
          0 5px 0 #5d6569,
          0 8px 11px
            rgba(
              0,
              0,
              0,
              0.16
            );
      }

      .modeButton {
        min-width: 145px;

        border:
          2px solid #626b70;

        color: #163342;

        background:
          linear-gradient(
            180deg,
            #ffffff,
            #f3f3f3 48%,
            #d5d5d5
          );

        box-shadow:
          inset 0 3px 2px
            white,
          0 5px 0 #5b6367,
          0 8px 11px
            rgba(
              0,
              0,
              0,
              0.16
            );
      }

      .modeButton.active {
        border-color: #105477;

        color: #063e5e;

        background:
          linear-gradient(
            180deg,
            #e0f8ff,
            #9cdef7 25%,
            #5bb9e1 68%,
            #3496c3
          );

        box-shadow:
          inset 0 3px 2px
            white,
          0 5px 0 #174f6a,
          0 8px 12px
            rgba(
              0,
              0,
              0,
              0.2
            );
      }

      .hardButton {
        border:
          2px solid #a97705;

        color: #654500;

        background:
          linear-gradient(
            180deg,
            #fffbdc,
            #ffe181 50%,
            #efbd39
          );

        box-shadow:
          inset 0 3px 2px
            white,
          0 5px 0 #a3720a,
          0 8px 11px
            rgba(
              0,
              0,
              0,
              0.16
            );
      }

      .blue3dButton {
        border:
          2px solid #135b7f;

        color: #073e5e;

        background:
          linear-gradient(
            180deg,
            #daf7ff,
            #73c9eb 55%,
            #3999c6
          );

        box-shadow:
          inset 0 3px 2px
            white,
          0 5px 0 #164f6b;
      }

      .backButton:active,
      .gray3dButton:active,
      .laterButton:active,
      .modeButton:active,
      .blue3dButton:active,
      .hardButton:active {
        transform:
          translateY(4px);

        box-shadow: none;
      }

      /* =========================
         STATS
      ========================= */

      .stats {
        width:
          min(900px, 100%);

        margin:
          0 auto 35px;

        display: grid;

        grid-template-columns:
          repeat(4, 1fr);

        gap: 13px;
      }

      .statBox {
        min-height: 75px;

        display: flex;

        flex-direction:
          column;

        align-items: center;

        justify-content:
          center;

        border:
          2px solid #c5cbce;

        border-radius: 12px;

        background:
          linear-gradient(
            180deg,
            #ffffff,
            #e7e7e7
          );

        box-shadow:
          inset 0 3px 2px
            white,
          0 5px 0 #777f83,
          0 9px 13px
            rgba(
              0,
              0,
              0,
              0.11
            );
      }

      .statBox strong {
        font-size: 25px;
        color: #0671a7;
      }

      .statBox span {
        margin-top: 3px;

        font-size: 13px;
        font-weight: 900;

        color: #465259;
      }

      /* =========================
         WORD CARD
      ========================= */

      .wordCard {
        width:
          min(510px, 94%);

        min-height: 120px;

        margin:
          40px auto 28px;

        padding: 22px;

        display: flex;

        align-items: center;

        justify-content:
          center;

        text-align: center;

        border:
          3px solid #174e69;

        border-radius: 18px;

        color: #071d2b;

        font-size:
          clamp(
            29px,
            4vw,
            43px
          );

        font-weight: 900;

        background:
          linear-gradient(
            180deg,
            #ace9ff 0%,
            #77caee 18%,
            #54addb 65%,
            #4197c2 100%
          );

        box-shadow:
          inset 0 4px 3px
            rgba(
              255,
              255,
              255,
              0.85
            ),
          inset 0 -6px 6px
            rgba(
              0,
              60,
              100,
              0.2
            ),
          0 8px 0 #1d536c,
          0 14px 20px
            rgba(
              0,
              0,
              0,
              0.2
            );
      }

      .wordActions {
        display: flex;

        justify-content:
          center;

        flex-wrap: wrap;

        gap: 16px;

        margin-bottom: 65px;
      }

      /* =========================
         ANSWERS
      ========================= */

      .answers {
        width:
          min(1050px, 100%);

        margin: 0 auto;

        display: grid;

        grid-template-columns:
          repeat(2, 1fr);

        gap: 55px;
      }

      .answerButton {
        min-height: 110px;

        padding:
          18px 25px;

        border:
          2px solid #697277;

        border-radius: 17px;

        color: #172f3d;

        background:
          linear-gradient(
            180deg,
            #ffffff 0%,
            #f4f4f4 27%,
            #dedede 67%,
            #c8c8c8 100%
          );

        box-shadow:
          inset 0 4px 3px
            white,
          inset 0 -5px 6px
            rgba(
              0,
              0,
              0,
              0.07
            ),
          0 8px 0 #5e676b,
          0 13px 18px
            rgba(
              0,
              0,
              0,
              0.18
            );

        font-size:
          clamp(
            21px,
            3vw,
            30px
          );

        font-weight: 900;

        cursor: pointer;

        transition:
          transform 0.12s ease;
      }

      .answerButton:not(
          :disabled
        ):hover {
        transform:
          translateY(-3px);
      }

      .answerButton.correct {
        border-color: #268248;

        color: #135d2b;

        background:
          linear-gradient(
            180deg,
            #f2fff5,
            #c2efcc,
            #84d79a
          );

        box-shadow:
          inset 0 4px 3px
            white,
          0 8px 0 #32804b,
          0 13px 18px
            rgba(
              0,
              0,
              0,
              0.16
            );
      }

      .answerButton.wrong {
        border-color: #b53131;

        color: #7d1111;

        background:
          linear-gradient(
            180deg,
            #fff4f4,
            #ffc7c7,
            #eb8989
          );

        box-shadow:
          inset 0 4px 3px
            white,
          0 8px 0 #9b3535,
          0 13px 18px
            rgba(
              0,
              0,
              0,
              0.16
            );
      }

      /* =========================
         WRONG NOTICE
      ========================= */

      .wrongNotice {
        width:
          min(700px, 95%);

        margin:
          30px auto 0;

        padding:
          14px 20px;

        display: flex;

        justify-content:
          center;

        align-items: center;

        flex-wrap: wrap;

        gap: 8px;

        border:
          2px solid #d58585;

        border-radius: 12px;

        background: #fff0f0;

        color: #8b1d1d;

        font-size: 17px;
        font-weight: 900;
      }

      /* =========================
         BOTTOM
      ========================= */

      .bottomActions {
        width:
          min(850px, 100%);

        margin:
          45px auto 0;

        display: flex;

        justify-content:
          center;

        align-items: center;

        flex-wrap: wrap;

        gap: 18px;
      }

      .laterButton {
        min-width: 215px;

        border-radius: 22px;
      }

      /* =========================
         STATUS / FINISH
      ========================= */

      .statusCard,
      .finishCard {
        width:
          min(650px, 95%);

        margin:
          90px auto;

        padding:
          45px 30px;

        text-align: center;

        border:
          2px solid #6f797e;

        border-radius: 20px;

        background:
          linear-gradient(
            145deg,
            #ffffff,
            #e8eaeb
          );

        box-shadow:
          inset 0 4px 3px
            white,
          0 8px 0 #60696d,
          0 15px 25px
            rgba(
              0,
              0,
              0,
              0.16
            );
      }

      .statusCard h1,
      .finishCard h1 {
        color: #07547e;
      }

      .statusCard p {
        line-height: 1.6;
        font-size: 17px;
      }

      .statusCard button,
      .finishCard button {
        margin:
          10px 6px;
      }

      .loader {
        width: 45px;
        height: 45px;

        margin:
          0 auto 20px;

        border:
          5px solid #d9e0e4;

        border-top-color:
          #1489bd;

        border-radius: 50%;

        animation:
          spin 0.8s linear
          infinite;
      }

      @keyframes spin {
        to {
          transform:
            rotate(360deg);
        }
      }

      .finishIcon {
        width: 80px;
        height: 80px;

        margin:
          0 auto 20px;

        display: grid;
        place-items: center;

        border-radius: 50%;

        background: #dff7e5;

        border:
          3px solid #3a9556;

        color: #278046;

        font-size: 40px;
        font-weight: 900;
      }

      .finishStats {
        margin:
          30px 0;

        display: grid;

        grid-template-columns:
          repeat(4, 1fr);

        gap: 10px;
      }

      .finishStats div {
        padding: 15px 8px;

        border:
          1px solid #c4cacc;

        border-radius: 10px;

        background: white;
      }

      .finishStats strong {
        display: block;

        font-size: 24px;

        color: #0874a8;
      }

      .finishStats span {
        font-size: 13px;
        font-weight: 900;
      }

      /* =========================
         MOBILE
      ========================= */

      @media (
        max-width: 760px
      ) {
        .page {
          padding:
            20px 12px
            60px;
        }

        .topPanel {
          grid-template-columns:
            1fr;

          text-align: center;
        }

        .backButton {
          width: 100%;
        }

        .modeArea {
          display: grid;
          grid-template-columns:
            1fr;
        }

        .modeButton {
          width: 100%;
        }

        .counter {
          text-align: center;
        }

        .stats {
          grid-template-columns:
            repeat(2, 1fr);
        }

        .answers {
          grid-template-columns:
            1fr;

          gap: 25px;
        }

        .wordActions {
          margin-bottom: 40px;
        }

        .answerButton {
          min-height: 90px;
        }

        .bottomActions {
          flex-direction:
            column;
        }

        .bottomActions button {
          width: 100%;
        }

        .finishStats {
          grid-template-columns:
            repeat(2, 1fr);
        }
      }
    `}</style>
  );
}
