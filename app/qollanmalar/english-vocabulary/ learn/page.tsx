"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useSearchParams } from "next/navigation";

type VocabularyWord = {
  word: string;
  translation: string;
};

type VocabularyResponse = {
  success: boolean;
  message?: string;
  words?: VocabularyWord[];
};

type ExampleData = {
  english: string;
  uzbek: string;
};

/* =========================================================
   HOZIRGI BOOK 1 → UNIT 1 UCHUN MISOL GAPLAR

   Keyinchalik bu gaplarni ham admin paneldan
   kiritadigan qilamiz.
========================================================= */

const EXAMPLES: Record<string, ExampleData> = {
  afraid: {
    english: "I am afraid of dogs.",
    uzbek: "Men itlardan qo‘rqaman.",
  },

  agree: {
    english: "I agree with you.",
    uzbek: "Men sizga qo‘shilaman.",
  },

  angry: {
    english: "He is angry with me.",
    uzbek: "U mendan jahli chiqdi.",
  },

  arrive: {
    english: "We arrived at school early.",
    uzbek: "Biz maktabga erta yetib keldik.",
  },

  attack: {
    english: "The dog tried to attack him.",
    uzbek: "It unga hujum qilishga urindi.",
  },

  bottom: {
    english: "The key is at the bottom of the bag.",
    uzbek: "Kalit sumkaning pastki qismida.",
  },

  clever: {
    english: "She is a clever student.",
    uzbek: "U aqlli o‘quvchi.",
  },

  cruel: {
    english: "The cruel man hurt the animal.",
    uzbek: "Shafqatsiz odam hayvonga ozor berdi.",
  },

  finally: {
    english: "Finally, we arrived home.",
    uzbek: "Nihoyat, biz uyga yetib keldik.",
  },

  hide: {
    english: "The boy hid behind the door.",
    uzbek: "Bola eshik orqasiga yashirindi.",
  },

  hunt: {
    english: "The lion hunts at night.",
    uzbek: "Sher tunda ov qiladi.",
  },

  lot: {
    english: "I have a lot of books.",
    uzbek: "Menda juda ko‘p kitob bor.",
  },

  middle: {
    english: "He is standing in the middle of the room.",
    uzbek: "U xonaning o‘rtasida turibdi.",
  },

  moment: {
    english: "Please wait a moment.",
    uzbek: "Iltimos, bir lahza kuting.",
  },

  pleased: {
    english: "I am pleased to meet you.",
    uzbek: "Siz bilan tanishganimdan mamnunman.",
  },

  promise: {
    english: "I promise to help you.",
    uzbek: "Men sizga yordam berishga va’da beraman.",
  },

  reply: {
    english: "She did not reply to my message.",
    uzbek: "U mening xabarimga javob bermadi.",
  },

  safe: {
    english: "The children are safe now.",
    uzbek: "Bolalar hozir xavfsiz.",
  },

  trick: {
    english: "He played a trick on his friend.",
    uzbek: "U do‘stiga hiyla ishlatdi.",
  },

  well: {
    english: "She speaks English well.",
    uzbek: "U ingliz tilida yaxshi gapiradi.",
  },
};

/* =========================================================
   MASSIVNI ARALASHTIRISH
========================================================= */

function shuffleArray<T>(items: T[]): T[] {
  const array = [...items];

  for (let i = array.length - 1; i > 0; i--) {
    const randomIndex =
      Math.floor(Math.random() * (i + 1));

    [array[i], array[randomIndex]] = [
      array[randomIndex],
      array[i],
    ];
  }

  return array;
}

/* =========================================================
   ASOSIY YODLASH COMPONENT
========================================================= */

function LearnContent() {
  const searchParams = useSearchParams();

  const book =
    Number(searchParams.get("book")) || 1;

  const unit =
    Number(searchParams.get("unit")) || 1;

  const [words, setWords] =
    useState<VocabularyWord[]>([]);

  const [queue, setQueue] =
    useState<VocabularyWord[]>([]);

  const [currentIndex, setCurrentIndex] =
    useState(0);

  const [options, setOptions] =
    useState<string[]>([]);

  const [showExample, setShowExample] =
    useState(false);

  const [selectedAnswer, setSelectedAnswer] =
    useState<string | null>(null);

  const [answerState, setAnswerState] =
    useState<"correct" | "wrong" | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [correctCount, setCorrectCount] =
    useState(0);

  const [wrongCount, setWrongCount] =
    useState(0);

  const [finished, setFinished] =
    useState(false);

  /* =======================================================
     SO‘ZLARNI API DAN OLISH
  ======================================================= */

  useEffect(() => {
    async function loadWords() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/vocabulary?book=${book}&unit=${unit}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const data =
          (await response.json()) as VocabularyResponse;

        if (!response.ok || !data.success) {
          throw new Error(
            data.message ||
              "So‘zlarni yuklab bo‘lmadi."
          );
        }

        const loadedWords =
          Array.isArray(data.words)
            ? data.words
            : [];

        if (loadedWords.length < 2) {
          throw new Error(
            "Bu Unitda yodlash uchun yetarli so‘z mavjud emas."
          );
        }

        setWords(loadedWords);

        /*
          Birinchi aylanishda so‘zlarni
          aralashtirib chiqamiz.
        */

        setQueue(
          shuffleArray(loadedWords)
        );

        setCurrentIndex(0);
        setFinished(false);
        setCorrectCount(0);
        setWrongCount(0);
      } catch (err) {
        console.error(
          "VOCABULARY LOAD ERROR:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Xatolik yuz berdi."
        );
      } finally {
        setLoading(false);
      }
    }

    loadWords();
  }, [book, unit]);

  /* =======================================================
     HOZIRGI SO‘Z
  ======================================================= */

  const currentWord =
    queue[currentIndex];

  /* =======================================================
     HOZIRGI SO‘Z UCHUN 2 TA VARIANT
  ======================================================= */

  useEffect(() => {
    if (!currentWord || words.length < 2) {
      return;
    }

    const wrongCandidates =
      words.filter(
        (item) =>
          item.translation !==
          currentWord.translation
      );

    if (wrongCandidates.length === 0) {
      return;
    }

    const wrongAnswer =
      wrongCandidates[
        Math.floor(
          Math.random() *
            wrongCandidates.length
        )
      ].translation;

    setOptions(
      shuffleArray([
        currentWord.translation,
        wrongAnswer,
      ])
    );

    setShowExample(false);
    setSelectedAnswer(null);
    setAnswerState(null);
  }, [currentWord, words]);

  /* =======================================================
     JAVOB TANLASH
  ======================================================= */

  function chooseAnswer(answer: string) {
    if (
      !currentWord ||
      selectedAnswer !== null
    ) {
      return;
    }

    setSelectedAnswer(answer);

    const isCorrect =
      answer ===
      currentWord.translation;

    if (isCorrect) {
      setAnswerState("correct");

      setCorrectCount(
        (value) => value + 1
      );
    } else {
      setAnswerState("wrong");

      setWrongCount(
        (value) => value + 1
      );

      /*
        XATO QILINGAN SO‘ZNI
        KEYINROQ YANA QAYTARAMIZ.

        Darhol emas — navbat oxiriga
        qo‘shiladi.
      */

      setQueue((oldQueue) => [
        ...oldQueue,
        currentWord,
      ]);
    }

    /*
      Javob rangini ozgina ko‘rsatib,
      keyingi so‘zga avtomatik o‘tamiz.
    */

    window.setTimeout(() => {
      setCurrentIndex(
        (oldIndex) => {
          const nextIndex =
            oldIndex + 1;

          /*
            queue uzunligi keyinroq
            yangilanishi mumkinligi uchun
            yakunlashni alohida tekshiramiz.
          */

          return nextIndex;
        }
      );
    }, 850);
  }

  /* =======================================================
     YAKUNLANGANINI TEKSHIRISH
  ======================================================= */

  useEffect(() => {
    if (
      queue.length > 0 &&
      currentIndex >= queue.length
    ) {
      setFinished(true);
    }
  }, [currentIndex, queue.length]);

  /* =======================================================
     MISOL GAP
  ======================================================= */

  const example = useMemo(() => {
    if (!currentWord) {
      return null;
    }

    return (
      EXAMPLES[
        currentWord.word
          .trim()
          .toLowerCase()
      ] ?? null
    );
  }, [currentWord]);

  /* =======================================================
     QAYTA BOSHLASH
  ======================================================= */

  function restart() {
    setQueue(
      shuffleArray(words)
    );

    setCurrentIndex(0);
    setCorrectCount(0);
    setWrongCount(0);
    setFinished(false);
    setShowExample(false);
    setSelectedAnswer(null);
    setAnswerState(null);
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <main className="page center">
        <div className="loadingBox">
          So‘zlar yuklanmoqda...
        </div>

        <style jsx>{`
          .page {
            min-height: 100vh;
            background:
              linear-gradient(
                180deg,
                #ffffff,
                #eef1f3
              );
            font-family:
              "Bell MT",
              "Times New Roman",
              serif;
          }

          .center {
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .loadingBox {
            font-size: 28px;
            font-weight: 700;
          }
        `}</style>
      </main>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (error) {
    return (
      <main className="page center">
        <div className="errorCard">
          <div className="errorTitle">
            Xatolik
          </div>

          <div>
            {error}
          </div>

          <button
            type="button"
            onClick={() => {
              window.location.href =
                "/qollanmalar/english-vocabulary";
            }}
          >
            Orqaga
          </button>
        </div>

        <style jsx>{`
          .page {
            min-height: 100vh;
            background: #f5f7f8;
            font-family:
              "Bell MT",
              "Times New Roman",
              serif;
          }

          .center {
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .errorCard {
            width: min(520px, 90%);
            padding: 35px;
            text-align: center;
            border: 2px solid #aaa;
            border-radius: 20px;
            background: white;
          }

          .errorTitle {
            margin-bottom: 15px;
            color: #b42318;
            font-size: 28px;
            font-weight: 700;
          }

          button {
            margin-top: 25px;
            padding: 12px 25px;
            cursor: pointer;
          }
        `}</style>
      </main>
    );
  }

  /* =======================================================
     YAKUN
  ======================================================= */

  if (finished) {
    return (
      <main className="page finishedPage">

        <div className="finishedCard">

          <div className="finishedSmall">
            Book {book} — Unit {unit}
          </div>

          <h1>
            Yodlash yakunlandi!
          </h1>

          <p>
            Unitdagi barcha so‘zlarni
            ko‘rib chiqdingiz.
          </p>

          <div className="resultRow">

            <div className="resultBox">
              <strong>
                {correctCount}
              </strong>

              <span>
                Esladingiz
              </span>
            </div>

            <div className="resultBox">
              <strong>
                {wrongCount}
              </strong>

              <span>
                Qayta ko‘rildi
              </span>
            </div>

          </div>

          <div className="finishButtons">

            <button
              type="button"
              className="againButton"
              onClick={restart}
            >
              Yana yodlash
            </button>

            <button
              type="button"
              className="backButton"
              onClick={() => {
                window.location.href =
                  "/qollanmalar/english-vocabulary";
              }}
            >
              Unitlarga qaytish
            </button>

          </div>

        </div>

        <style jsx>{`
          .page {
            min-height: 100vh;
            background:
              linear-gradient(
                180deg,
                #ffffff,
                #eceff1
              );
            font-family:
              "Bell MT",
              "Times New Roman",
              serif;
          }

          .finishedPage {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 30px;
          }

          .finishedCard {
            width: min(750px, 96%);
            padding: 50px 35px;
            text-align: center;

            border:
              3px solid #303538;

            border-radius: 28px;

            background:
              linear-gradient(
                145deg,
                #eeeeee,
                #c8c8c8
              );

            box-shadow:
              inset 0 7px 6px
                rgba(255,255,255,.85),
              0 8px 0 #51585c,
              0 16px 25px
                rgba(0,0,0,.25);
          }

          .finishedSmall {
            color: #174461;
            font-size: 19px;
            font-weight: 700;
          }

          h1 {
            margin: 15px 0;
            color: #073b68;
            font-size: 42px;
          }

          p {
            font-size: 21px;
          }

          .resultRow {
            display: flex;
            justify-content: center;
            gap: 25px;
            margin: 35px 0;
          }

          .resultBox {
            min-width: 180px;
            padding: 25px;

            border:
              2px solid #555;

            border-radius: 16px;

            background: white;
          }

          .resultBox strong {
            display: block;
            font-size: 38px;
            color: #073b68;
          }

          .resultBox span {
            font-size: 18px;
          }

          .finishButtons {
            display: flex;
            justify-content: center;
            gap: 18px;
            flex-wrap: wrap;
          }

          button {
            min-width: 190px;
            padding: 14px 22px;

            border-radius: 11px;

            font-family: inherit;
            font-size: 17px;
            font-weight: 700;

            cursor: pointer;
          }

          .againButton {
            color: #073b68;

            border:
              2px solid #174461;

            background:
              linear-gradient(
                180deg,
                #b8ecff,
                #58a8d7
              );
          }

          .backButton {
            border:
              2px solid #555;

            background:
              linear-gradient(
                180deg,
                #fafafa,
                #bdbdbd
              );
          }
        `}</style>

      </main>
    );
  }

  if (!currentWord) {
    return null;
  }

  /* =======================================================
     ASOSIY YODLASH OYNASI
  ======================================================= */

  return (
    <main className="page">

      {/* YUQORI PANEL */}

      <header className="topBar">

        <button
          type="button"
          className="backMini"
          onClick={() => {
            window.location.href =
              "/qollanmalar/english-vocabulary";
          }}
        >
          ← Unitlar
        </button>

        <div className="unitInfo">
          Book {book} • Unit {unit}
        </div>

        <div className="progress">
          {Math.min(
            currentIndex + 1,
            queue.length
          )}
          {" / "}
          {queue.length}
        </div>

      </header>

      {/* SO‘Z */}

      <section className="learnArea">

        <div className="wordBox">
          {currentWord.word.toUpperCase()}
        </div>

        {/* MISOL GAP */}

        <div className="exampleArea">

          {!showExample && (
            <button
              type="button"
              className="exampleButton"
              onClick={() =>
                setShowExample(true)
              }
            >
              💡 Misol gap
            </button>
          )}

          {showExample && (
            <div className="exampleText">

              {example ? (
                <>
                  <div className="englishExample">
                    {example.english}
                  </div>

                  <div className="uzbekExample">
                    ({example.uzbek})
                  </div>
                </>
              ) : (
                <div className="noExample">
                  Bu so‘z uchun misol gap
                  hali kiritilmagan.
                </div>
              )}

            </div>
          )}

        </div>

        {/* 2 TA VARIANT */}

        <div className="answers">

          {options.map(
            (answer) => {
              const isCorrect =
                answer ===
                currentWord.translation;

              const isSelected =
                selectedAnswer === answer;

              let className =
                "answerButton";

              if (selectedAnswer) {
                if (isCorrect) {
                  className +=
                    " correctAnswer";
                } else if (isSelected) {
                  className +=
                    " wrongAnswer";
                }
              }

              return (
                <button
                  key={answer}
                  type="button"
                  className={className}
                  onClick={() =>
                    chooseAnswer(answer)
                  }
                  disabled={
                    selectedAnswer !== null
                  }
                >
                  {answer}
                </button>
              );
            }
          )}

        </div>

        {/* JAVOB HOLATI */}

        <div className="feedbackArea">

          {answerState ===
            "correct" && (
            <div className="correctText">
              To‘g‘ri ✓
            </div>
          )}

          {answerState ===
            "wrong" && (
            <div className="wrongText">
              Yana bir marta eslab qolamiz
            </div>
          )}

        </div>

      </section>

      <style jsx>{`

        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;

          padding:
            22px 30px 50px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #f5f6f7 60%,
              #eceff1 100%
            );

          font-family:
            "Bell MT",
            "Times New Roman",
            serif;

          color: #111;
        }

        /* ================= TOP ================= */

        .topBar {
          width: min(1200px, 96%);

          margin: 0 auto;

          display: grid;

          grid-template-columns:
            1fr auto 1fr;

          align-items: center;

          gap: 20px;
        }

        .backMini {
          justify-self: start;

          padding: 10px 18px;

          border:
            2px solid #51585c;

          border-radius: 9px;

          background:
            linear-gradient(
              180deg,
              #ffffff,
              #c7c7c7
            );

          box-shadow:
            inset 0 3px 3px white,
            0 3px 0 #555d61;

          font-family: inherit;

          font-size: 16px;
          font-weight: 700;

          cursor: pointer;
        }

        .unitInfo {
          color: #073b68;

          font-size: 21px;
          font-weight: 700;
        }

        .progress {
          justify-self: end;

          color: #555;

          font-size: 18px;
          font-weight: 700;
        }

        /* ================= MAIN ================= */

        .learnArea {
          width: min(1250px, 98%);

          min-height: 700px;

          margin: 45px auto 0;

          display: flex;

          flex-direction: column;

          align-items: center;
        }

        /* ================= WORD ================= */

        .wordBox {
          width: min(470px, 85%);

          min-height: 105px;

          padding: 20px;

          display: flex;

          align-items: center;

          justify-content: center;

          text-align: center;

          color: #050505;

          font-size:
            clamp(
              28px,
              3vw,
              40px
            );

          font-weight: 700;

          border:
            3px solid #174461;

          border-radius: 18px;

          background:
            linear-gradient(
              180deg,
              #84c9f5 0%,
              #63a9da 45%,
              #5298ca 100%
            );

          box-shadow:
            inset 0 7px 6px
              rgba(255,255,255,.65),

            inset 0 -7px 7px
              rgba(0,0,0,.16),

            0 6px 0 #17415c,

            0 10px 15px
              rgba(0,0,0,.24);
        }

        /* ================= EXAMPLE ================= */

        .exampleArea {
          width: 100%;

          min-height: 155px;

          margin-top: 28px;

          display: flex;

          align-items: center;

          justify-content: center;
        }

        .exampleButton {
          padding: 10px 21px;

          border:
            1px solid #777;

          border-radius: 20px;

          background: #ffffff;

          color: #333;

          font-family: inherit;

          font-size: 17px;

          font-weight: 700;

          cursor: pointer;

          transition:
            transform .15s ease,
            box-shadow .15s ease;
        }

        .exampleButton:hover {
          transform:
            translateY(-2px);

          box-shadow:
            0 5px 10px
              rgba(0,0,0,.12);
        }

        .exampleText {
          text-align: center;
        }

        .englishExample {
          color: #111;

          font-family:
            "Times New Roman",
            serif;

          font-size:
            clamp(
              27px,
              3vw,
              38px
            );

          font-weight: 700;

          font-style: italic;
        }

        .uzbekExample {
          margin-top: 3px;

          color: #e11d1d;

          font-family:
            "Times New Roman",
            serif;

          font-size:
            clamp(
              24px,
              2.6vw,
              33px
            );

          font-style: italic;
        }

        .noExample {
          color: #777;

          font-size: 19px;

          font-style: italic;
        }

        /* ================= ANSWERS ================= */

        .answers {
          width: min(1050px, 95%);

          margin-top: 25px;

          display: grid;

          grid-template-columns:
            repeat(2, minmax(0, 1fr));

          gap: 85px;
        }

        .answerButton {
          min-height: 105px;

          padding: 20px 25px;

          border:
            3px solid #4d555a;

          border-radius: 17px;

          color: #070707;

          background:
            linear-gradient(
              180deg,
              #f2f2f2 0%,
              #d7d7d7 35%,
              #bbbbbb 100%
            );

          box-shadow:
            inset 0 7px 6px
              rgba(255,255,255,.92),

            inset 0 -6px 6px
              rgba(0,0,0,.15),

            0 6px 0 #555d61,

            0 10px 14px
              rgba(0,0,0,.20);

          font-family: inherit;

          font-size:
            clamp(
              24px,
              2.5vw,
              34px
            );

          font-weight: 700;

          cursor: pointer;

          transition:
            transform .12s ease,
            filter .12s ease;
        }

        .answerButton:hover:not(:disabled) {
          transform:
            translateY(-3px);

          filter:
            brightness(1.04);
        }

        .answerButton:active:not(:disabled) {
          transform:
            translateY(3px);
        }

        .answerButton:disabled {
          cursor: default;
        }

        .correctAnswer {
          color: #0b4f2b;

          border-color: #237a45;

          background:
            linear-gradient(
              180deg,
              #baf4cb,
              #74cf91
            );

          box-shadow:
            inset 0 6px 5px
              rgba(255,255,255,.75),

            0 6px 0 #237a45;
        }

        .wrongAnswer {
          color: #7a1515;

          border-color: #a52b2b;

          background:
            linear-gradient(
              180deg,
              #ffc4c4,
              #e77b7b
            );

          box-shadow:
            inset 0 6px 5px
              rgba(255,255,255,.75),

            0 6px 0 #8c2727;
        }

        /* ================= FEEDBACK ================= */

        .feedbackArea {
          min-height: 60px;

          margin-top: 35px;

          text-align: center;
        }

        .correctText {
          color: #14713a;

          font-size: 25px;

          font-weight: 700;
        }

        .wrongText {
          color: #b42318;

          font-size: 22px;

          font-weight: 700;
        }

        /* ================= MOBILE ================= */

        @media (max-width: 760px) {

          .page {
            padding:
              15px 12px 35px;
          }

          .topBar {
            grid-template-columns:
              1fr 1fr;
          }

          .unitInfo {
            grid-column:
              1 / -1;

            grid-row: 1;

            text-align: center;
          }

          .backMini {
            grid-column: 1;

            grid-row: 2;
          }

          .progress {
            grid-column: 2;

            grid-row: 2;
          }

          .learnArea {
            margin-top: 30px;
          }

          .exampleArea {
            min-height: 140px;
          }

          .answers {
            grid-template-columns:
              1fr;

            gap: 25px;

            margin-top: 15px;
          }

          .answerButton {
            min-height: 88px;
          }
        }

      `}</style>

    </main>
  );
}

/* =========================================================
   PAGE

   useSearchParams uchun Suspense ishlatyapmiz.
========================================================= */

export default function LearnPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily:
              '"Bell MT", "Times New Roman", serif',
            fontSize: "26px",
            fontWeight: 700,
          }}
        >
          Yuklanmoqda...
        </div>
      }
    >
      <LearnContent />
    </Suspense>
  );
}
