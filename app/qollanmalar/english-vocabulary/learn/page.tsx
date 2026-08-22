"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useSearchParams } from "next/navigation";

/* =========================================================
   TYPES
========================================================= */

type VocabularyWord = {
  word: string;
  translation: string;
  example?: string;
  exampleTranslation?: string;
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
   BOOK 1 → UNIT 1 MISOL GAPLARI

   Keyinchalik bularni ham admin panel orqali
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
   ARRAY ARALASHTIRISH
========================================================= */

function shuffleArray<T>(
  items: T[]
): T[] {
  const array = [...items];

  for (
    let i = array.length - 1;
    i > 0;
    i--
  ) {
    const randomIndex =
      Math.floor(
        Math.random() *
          (i + 1)
      );

    [
      array[i],
      array[randomIndex],
    ] = [
      array[randomIndex],
      array[i],
    ];
  }

  return array;
}

/* =========================================================
   WORD KEY
========================================================= */

function getWordKey(
  word: VocabularyWord
) {
  return word.word
    .trim()
    .toLowerCase();
}

/* =========================================================
   ASOSIY COMPONENT
========================================================= */

function LearnContent() {
  const searchParams =
    useSearchParams();

  const book =
    Number(
      searchParams.get("book")
    ) || 1;

  const unit =
    Number(
      searchParams.get("unit")
    ) || 1;

  /* =======================================================
     DATA
  ======================================================= */

  const [
    words,
    setWords,
  ] =
    useState<
      VocabularyWord[]
    >([]);

  const [
    queue,
    setQueue,
  ] =
    useState<
      VocabularyWord[]
    >([]);

  const [
    currentIndex,
    setCurrentIndex,
  ] =
    useState(0);

  const [
    options,
    setOptions,
  ] =
    useState<string[]>([]);

  /* =======================================================
     UI STATE
  ======================================================= */

  const [
    showExample,
    setShowExample,
  ] =
    useState(false);

  const [
    selectedAnswer,
    setSelectedAnswer,
  ] =
    useState<
      string | null
    >(null);

  const [
    answerState,
    setAnswerState,
  ] =
    useState<
      "correct" |
      "wrong" |
      null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    finished,
    setFinished,
  ] =
    useState(false);

  /* =======================================================
     YODLASH STATISTIKASI
  ======================================================= */

  const [
    correctCount,
    setCorrectCount,
  ] =
    useState(0);

  const [
    wrongCount,
    setWrongCount,
  ] =
    useState(0);

  const [
    difficultWords,
    setDifficultWords,
  ] =
    useState<string[]>([]);

  const [
    isReviewMode,
    setIsReviewMode,
  ] =
    useState(false);

  /* =======================================================
     API DAN SO‘ZLARNI OLISH
  ======================================================= */

  useEffect(() => {
    async function loadWords() {
      try {
        setLoading(true);
        setError("");

        const response =
          await fetch(
            `/api/vocabulary?book=${book}&unit=${unit}`,
            {
              method: "GET",
              cache:
                "no-store",
            }
          );

        const data =
          (await response.json()) as VocabularyResponse;

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "So‘zlarni yuklab bo‘lmadi."
          );
        }

        const loadedWords =
          Array.isArray(
            data.words
          )
            ? data.words
            : [];

        if (
          loadedWords.length <
          2
        ) {
          throw new Error(
            "Bu Unitda yodlash uchun yetarli so‘z mavjud emas."
          );
        }

        setWords(
          loadedWords
        );

        setQueue(
          shuffleArray(
            loadedWords
          )
        );

        setCurrentIndex(0);

        setFinished(false);

        setCorrectCount(0);

        setWrongCount(0);

        setDifficultWords([]);

        setIsReviewMode(false);
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
  }, [
    book,
    unit,
  ]);

  /* =======================================================
     CURRENT WORD
  ======================================================= */

  const currentWord =
    queue[
      currentIndex
    ];

  /* =======================================================
     2 TA VARIANT TAYYORLASH
  ======================================================= */

  useEffect(() => {
    if (
      !currentWord ||
      words.length < 2
    ) {
      return;
    }

    const wrongCandidates =
      words.filter(
        (
          item:
            VocabularyWord
        ) =>
          item.translation !==
          currentWord.translation
      );

    if (
      wrongCandidates.length ===
      0
    ) {
      return;
    }

    const randomWrong =
      wrongCandidates[
        Math.floor(
          Math.random() *
            wrongCandidates.length
        )
      ];

    const wrongAnswer =
      randomWrong.translation;

    setOptions(
      shuffleArray([
        currentWord.translation,
        wrongAnswer,
      ])
    );

    setShowExample(false);

    setSelectedAnswer(
      null
    );

    setAnswerState(
      null
    );
  }, [
    currentWord,
    words,
  ]);

  /* =======================================================
     MISOL GAP

     1-o‘rinda: API / BLOB orqali kelgan misol gap
     2-o‘rinda: eski Unit 1 uchun EXAMPLES fallback
  ======================================================= */

  const example =
    useMemo<ExampleData | null>(() => {
      if (
        !currentWord
      ) {
        return null;
      }

      const english =
        currentWord.example?.trim();

      const uzbek =
        currentWord.exampleTranslation?.trim();

      if (
        english
      ) {
        return {
          english,
          uzbek:
            uzbek || "",
        };
      }

      const key =
        getWordKey(
          currentWord
        );

      return (
        EXAMPLES[key] ??
        null
      );
    }, [
      currentWord,
    ]);

  /* =======================================================
     CURRENT WORD QIYINMI?
  ======================================================= */

  const currentIsDifficult =
    currentWord
      ? difficultWords.includes(
          getWordKey(
            currentWord
          )
        )
      : false;

  /* =======================================================
     TALAFFUZ
  ======================================================= */

  function speakWord() {
    if (
      !currentWord
    ) {
      return;
    }

    if (
      typeof window ===
      "undefined"
    ) {
      return;
    }

    if (
      !(
        "speechSynthesis" in
        window
      )
    ) {
      return;
    }

    window
      .speechSynthesis
      .cancel();

    const utterance =
      new SpeechSynthesisUtterance(
        currentWord.word
      );

    utterance.lang =
      "en-US";

    /*
      Ozgina sekinroq:
      yodlash uchun
      tushunarliroq bo‘ladi.
    */

    utterance.rate =
      0.78;

    utterance.pitch =
      1;

    utterance.volume =
      1;

    window
      .speechSynthesis
      .speak(
        utterance
      );
  }

  /* =======================================================
     QIYIN SO‘Z BELGILASH
  ======================================================= */

  function toggleDifficultWord() {
    if (
      !currentWord
    ) {
      return;
    }

    const key =
      getWordKey(
        currentWord
      );

    setDifficultWords(
      (
        oldWords
      ) => {
        if (
          oldWords.includes(
            key
          )
        ) {
          return oldWords.filter(
            (
              item:
                string
            ) =>
              item !== key
          );
        }

        return [
          ...oldWords,
          key,
        ];
      }
    );
  }

  /* =======================================================
     KEYINROQ YANA KO‘RSAT
  ======================================================= */

  function showLater() {
    if (
      !currentWord ||
      selectedAnswer !==
        null
    ) {
      return;
    }

    const key =
      getWordKey(
        currentWord
      );

    /*
      Keyinroq bosilgan so‘zni
      avtomatik qiyin so‘z
      qilib qo‘yamiz.
    */

    setDifficultWords(
      (
        oldWords
      ) =>
        oldWords.includes(
          key
        )
          ? oldWords
          : [
              ...oldWords,
              key,
            ]
    );

    /*
      Navbat oxiriga
      qayta qo‘shamiz.
    */

    setQueue(
      (
        oldQueue
      ) => [
        ...oldQueue,
        currentWord,
      ]
    );

    setCurrentIndex(
      (
        oldIndex
      ) =>
        oldIndex + 1
    );
  }

  /* =======================================================
     JAVOB TANLASH
  ======================================================= */

  function chooseAnswer(
    answer: string
  ) {
    if (
      !currentWord ||
      selectedAnswer !==
        null
    ) {
      return;
    }

    setSelectedAnswer(
      answer
    );

    const isCorrect =
      answer ===
      currentWord.translation;

    if (
      isCorrect
    ) {
      setAnswerState(
        "correct"
      );

      setCorrectCount(
        (
          value
        ) =>
          value + 1
      );
    } else {
      setAnswerState(
        "wrong"
      );

      setWrongCount(
        (
          value
        ) =>
          value + 1
      );

      const key =
        getWordKey(
          currentWord
        );

      /*
        Xato qilingan so‘z
        qiyin so‘zlarga tushadi.
      */

      setDifficultWords(
        (
          oldWords
        ) =>
          oldWords.includes(
            key
          )
            ? oldWords
            : [
                ...oldWords,
                key,
              ]
      );

      /*
        Xato qilingan so‘z
        navbat oxiriga qaytadi.
      */

      setQueue(
        (
          oldQueue
        ) => [
          ...oldQueue,
          currentWord,
        ]
      );
    }

    /*
      Rangni ko‘rsatib turish uchun
      ozgina kutamiz.
    */

    window.setTimeout(
      () => {
        setCurrentIndex(
          (
            oldIndex
          ) =>
            oldIndex + 1
        );
      },
      950
    );
  }

  /* =======================================================
     TUGAGANINI TEKSHIRISH
  ======================================================= */

  useEffect(() => {
    if (
      queue.length > 0 &&
      currentIndex >=
        queue.length
    ) {
      setFinished(
        true
      );
    }
  }, [
    currentIndex,
    queue.length,
  ]);

  /* =======================================================
     BARCHASINI QAYTA BOSHLASH
  ======================================================= */

  function restartAll() {
    setQueue(
      shuffleArray(
        words
      )
    );

    setCurrentIndex(0);

    setCorrectCount(0);

    setWrongCount(0);

    setFinished(false);

    setShowExample(false);

    setSelectedAnswer(
      null
    );

    setAnswerState(
      null
    );

    setDifficultWords([]);

    setIsReviewMode(
      false
    );
  }

  /* =======================================================
     FAQAT QIYIN SO‘ZLARNI YODLASH
  ======================================================= */

  function startDifficultReview() {
    const difficult =
      words.filter(
        (
          word:
            VocabularyWord
        ) =>
          difficultWords.includes(
            getWordKey(
              word
            )
          )
      );

    if (
      difficult.length <
      1
    ) {
      return;
    }

    setQueue(
      shuffleArray(
        difficult
      )
    );

    setCurrentIndex(0);

    setCorrectCount(0);

    setWrongCount(0);

    setFinished(false);

    setShowExample(false);

    setSelectedAnswer(
      null
    );

    setAnswerState(
      null
    );

    setIsReviewMode(
      true
    );
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    loading
  ) {
    return (
      <main
        className="simplePage"
      >
        <div
          className="loadingBox"
        >
          So‘zlar yuklanmoqda...
        </div>

        <style jsx>{`
          .simplePage {
            min-height: 100vh;

            display: flex;

            align-items: center;

            justify-content: center;

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

          .loadingBox {
            font-size: 28px;

            font-weight: 700;

            color: #073b68;
          }
        `}</style>
      </main>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (
    error
  ) {
    return (
      <main
        className="simplePage"
      >
        <div
          className="errorCard"
        >
          <div
            className="errorTitle"
          >
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
            Unitlarga qaytish
          </button>
        </div>

        <style jsx>{`
          .simplePage {
            min-height: 100vh;

            display: flex;

            align-items: center;

            justify-content: center;

            background:
              #f5f7f8;

            font-family:
              "Bell MT",
              "Times New Roman",
              serif;
          }

          .errorCard {
            width:
              min(
                520px,
                90%
              );

            padding: 35px;

            text-align:
              center;

            border:
              2px solid
              #aaa;

            border-radius:
              20px;

            background:
              white;
          }

          .errorTitle {
            margin-bottom:
              15px;

            color:
              #b42318;

            font-size:
              28px;

            font-weight:
              700;
          }

          button {
            margin-top:
              25px;

            padding:
              12px 25px;

            cursor:
              pointer;
          }
        `}</style>
      </main>
    );
  }

  /* =======================================================
     YAKUNIY SAHIFA
  ======================================================= */

  if (
    finished
  ) {
    return (
      <main
        className="finishedPage"
      >
        <div
          className="finishedCard"
        >
          <div
            className="finishedTop"
          >
            Book {book}
            {" • "}
            Unit {unit}

            {isReviewMode &&
              " • Qiyin so‘zlar"}
          </div>

          <h1>
            {isReviewMode
              ? "Takrorlash yakunlandi!"
              : "Yodlash yakunlandi!"}
          </h1>

          <p
            className="finishText"
          >
            {isReviewMode
              ? "Qiyin so‘zlarni yana bir marta ko‘rib chiqdingiz."
              : "Unitdagi so‘zlarni ko‘rib chiqdingiz."}
          </p>

          <div
            className="resultRow"
          >
            <div
              className="resultBox"
            >
              <strong>
                {
                  correctCount
                }
              </strong>

              <span>
                Esladingiz
              </span>
            </div>

            <div
              className="resultBox"
            >
              <strong>
                {
                  wrongCount
                }
              </strong>

              <span>
                Qayta ko‘rildi
              </span>
            </div>

            <div
              className="resultBox difficultResult"
            >
              <strong>
                {
                  difficultWords.length
                }
              </strong>

              <span>
                ⭐ Qiyin so‘z
              </span>
            </div>
          </div>

          {difficultWords.length >
            0 && (
            <div
              className="difficultList"
            >
              <div
                className="difficultTitle"
              >
                ⭐ Qiyin so‘zlar
              </div>

              <div
                className="wordChips"
              >
                {words
                  .filter(
                    (
                      word:
                        VocabularyWord
                    ) =>
                      difficultWords.includes(
                        getWordKey(
                          word
                        )
                      )
                  )
                  .map(
                    (
                      word:
                        VocabularyWord
                    ) => (
                      <span
                        key={
                          word.word
                        }
                        className="wordChip"
                      >
                        {
                          word.word
                        }
                      </span>
                    )
                  )}
              </div>
            </div>
          )}

          <div
            className="finishButtons"
          >
            {difficultWords.length >
              0 && (
              <button
                type="button"
                className="reviewButton"
                onClick={
                  startDifficultReview
                }
              >
                ⭐ Qiyin so‘zlarni yana yodlash
              </button>
            )}

            <button
              type="button"
              className="againButton"
              onClick={
                restartAll
              }
            >
              🔄 Boshidan yodlash
            </button>

            <button
              type="button"
              className="backButton"
              onClick={() => {
                window.location.href =
                  "/qollanmalar/english-vocabulary";
              }}
            >
              ← Unitlarga qaytish
            </button>
          </div>
        </div>

        <style jsx>{`
          * {
            box-sizing:
              border-box;
          }

          .finishedPage {
            min-height:
              100vh;

            display:
              flex;

            align-items:
              center;

            justify-content:
              center;

            padding:
              35px 20px;

            background:
              linear-gradient(
                180deg,
                #ffffff 0%,
                #eef1f3 100%
              );

            font-family:
              "Bell MT",
              "Times New Roman",
              serif;
          }

          .finishedCard {
            width:
              min(
                900px,
                96%
              );

            padding:
              45px 35px;

            text-align:
              center;

            border:
              3px solid
              #303538;

            border-radius:
              28px;

            background:
              linear-gradient(
                145deg,
                #eeeeee,
                #c8c8c8
              );

            box-shadow:
              inset 0 7px 6px
                rgba(
                  255,
                  255,
                  255,
                  .85
                ),

              inset 0 -7px 7px
                rgba(
                  0,
                  0,
                  0,
                  .12
                ),

              0 8px 0
                #51585c,

              0 16px 25px
                rgba(
                  0,
                  0,
                  0,
                  .25
                );
          }

          .finishedTop {
            color:
              #174461;

            font-size:
              20px;

            font-weight:
              700;
          }

          h1 {
            margin:
              14px 0 8px;

            color:
              #073b68;

            font-size:
              clamp(
                34px,
                5vw,
                48px
              );
          }

          .finishText {
            margin:
              0;

            font-size:
              21px;
          }

          .resultRow {
            display:
              grid;

            grid-template-columns:
              repeat(
                3,
                minmax(
                  0,
                  1fr
                )
              );

            gap:
              20px;

            margin:
              35px 0;
          }

          .resultBox {
            min-height:
              125px;

            display:
              flex;

            flex-direction:
              column;

            align-items:
              center;

            justify-content:
              center;

            padding:
              20px;

            border:
              2px solid
              #555;

            border-radius:
              16px;

            background:
              linear-gradient(
                180deg,
                #ffffff,
                #dddddd
              );

            box-shadow:
              inset 0 4px 4px
                white,

              0 4px 0
                #555d61;
          }

          .resultBox strong {
            display:
              block;

            margin-bottom:
              5px;

            color:
              #073b68;

            font-size:
              40px;
          }

          .resultBox span {
            font-size:
              18px;

            font-weight:
              700;
          }

          .difficultResult {
            border-color:
              #9a6b00;

            background:
              linear-gradient(
                180deg,
                #fff8cf,
                #ecd86e
              );
          }

          .difficultList {
            margin:
              15px 0 30px;

            padding:
              22px;

            border:
              2px solid
              #b68b20;

            border-radius:
              16px;

            background:
              rgba(
                255,
                248,
                207,
                .8
              );
          }

          .difficultTitle {
            margin-bottom:
              15px;

            color:
              #754c00;

            font-size:
              23px;

            font-weight:
              700;
          }

          .wordChips {
            display:
              flex;

            justify-content:
              center;

            gap:
              10px;

            flex-wrap:
              wrap;
          }

          .wordChip {
            padding:
              7px 14px;

            border:
              1px solid
              #ad8528;

            border-radius:
              18px;

            background:
              white;

            color:
              #55400c;

            font-size:
              17px;

            font-weight:
              700;
          }

          .finishButtons {
            display:
              flex;

            justify-content:
              center;

            gap:
              16px;

            flex-wrap:
              wrap;
          }

          .finishButtons button {
            min-width:
              210px;

            min-height:
              50px;

            padding:
              12px 20px;

            border-radius:
              11px;

            font-family:
              inherit;

            font-size:
              17px;

            font-weight:
              700;

            cursor:
              pointer;
          }

          .reviewButton {
            color:
              #634500;

            border:
              2px solid
              #9a6b00;

            background:
              linear-gradient(
                180deg,
                #fff4b8,
                #e5c451
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
                #9a6b00;
          }

          .againButton {
            color:
              #073b68;

            border:
              2px solid
              #174461;

            background:
              linear-gradient(
                180deg,
                #b8ecff,
                #58a8d7
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

          .backButton {
            border:
              2px solid
              #555;

            background:
              linear-gradient(
                180deg,
                #fafafa,
                #bdbdbd
              );

            box-shadow:
              inset 0 4px 4px
                white,

              0 4px 0
                #555d61;
          }

          @media (
            max-width:
              700px
          ) {
            .resultRow {
              grid-template-columns:
                1fr;
            }
          }
        `}</style>
      </main>
    );
  }

  if (
    !currentWord
  ) {
    return null;
  }

  /* =======================================================
     ASOSIY YODLASH SAHIFASI
  ======================================================= */

  return (
    <main
      className="page"
    >
      {/* ===================================================
          YUQORI PANEL
      =================================================== */}

      <header
        className="topBar"
      >
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

        <div
          className="unitInfo"
        >
          Book {book}
          {" • "}
          Unit {unit}

          {isReviewMode &&
            " • ⭐ Takrorlash"}
        </div>

        <div
          className="progress"
        >
          {Math.min(
            currentIndex +
              1,
            queue.length
          )}

          {" / "}

          {
            queue.length
          }
        </div>
      </header>

      {/* ===================================================
          MAIN
      =================================================== */}

      <section
        className="learnArea"
      >
        {/* =================================================
            SO‘Z
        ================================================= */}

        <div
          className="wordBox"
        >
          {currentWord.word.toUpperCase()}
        </div>

        {/* =================================================
            WORD TOOLS
        ================================================= */}

        <div
          className="wordTools"
        >
          <button
            type="button"
            className="toolButton"
            onClick={
              speakWord
            }
          >
            🔊 Talaffuz
          </button>

          <button
            type="button"
            className={
              currentIsDifficult
                ? "toolButton difficultActive"
                : "toolButton"
            }
            onClick={
              toggleDifficultWord
            }
          >
            {currentIsDifficult
              ? "⭐ Qiyin so‘z"
              : "☆ Qiyin so‘z"}
          </button>
        </div>

        {/* =================================================
            MISOL GAP
        ================================================= */}

        <div
          className="exampleArea"
        >
          {!showExample && (
            <button
              type="button"
              className="exampleButton"
              onClick={() =>
                setShowExample(
                  true
                )
              }
            >
              💡 Misol gap
            </button>
          )}

          {showExample && (
            <div
              className="exampleText"
            >
              {example ? (
                <>
                  <div
                    className="englishExample"
                  >
                    {
                      example.english
                    }
                  </div>

                  <div
                    className="uzbekExample"
                  >
                    (
                    {
                      example.uzbek
                    }
                    )
                  </div>
                </>
              ) : (
                <div
                  className="noExample"
                >
                  Bu so‘z uchun
                  misol gap hali
                  kiritilmagan.
                </div>
              )}
            </div>
          )}
        </div>

        {/* =================================================
            JAVOBLAR
        ================================================= */}

        <div
          className="answers"
        >
          {options.map(
            (
              answer:
                string
            ) => {
              const isCorrect =
                answer ===
                currentWord.translation;

              const isSelected =
                selectedAnswer ===
                answer;

              let className =
                "answerButton";

              if (
                selectedAnswer
              ) {
                if (
                  isCorrect
                ) {
                  className +=
                    " correctAnswer";
                } else if (
                  isSelected
                ) {
                  className +=
                    " wrongAnswer";
                }
              }

              return (
                <button
                  key={
                    answer
                  }
                  type="button"
                  className={
                    className
                  }
                  onClick={() =>
                    chooseAnswer(
                      answer
                    )
                  }
                  disabled={
                    selectedAnswer !==
                    null
                  }
                >
                  {
                    answer
                  }
                </button>
              );
            }
          )}
        </div>

        {/* =================================================
            KEYINROQ
        ================================================= */}

        <button
          type="button"
          className="laterButton"
          onClick={
            showLater
          }
          disabled={
            selectedAnswer !==
            null
          }
        >
          ↩ Keyinroq yana ko‘rsat
        </button>

        {/* =================================================
            FEEDBACK
        ================================================= */}

        <div
          className="feedbackArea"
        >
          {answerState ===
            "correct" && (
            <div
              className="correctText"
            >
              To‘g‘ri ✓
            </div>
          )}

          {answerState ===
            "wrong" && (
            <div
              className="wrongText"
            >
              Bu so‘zni keyinroq yana ko‘ramiz
            </div>
          )}
        </div>
      </section>

      {/* ===================================================
          CSS
      =================================================== */}

      <style jsx>{`
        * {
          box-sizing:
            border-box;
        }

        .page {
          min-height:
            100vh;

          padding:
            22px 30px
            50px;

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

          color:
            #111;
        }

        /* ================= TOP ================= */

        .topBar {
          width:
            min(
              1200px,
              96%
            );

          min-height:
            115px;

          margin:
            0 auto;

          padding:
            20px 28px;

          display:
            grid;

          grid-template-columns:
            1fr auto 1fr;

          align-items:
            center;

          gap:
            20px;

          border:
            3px solid
            #174461;

          border-radius:
            25px;

          background:
            linear-gradient(
              180deg,
              #8bd3ff 0%,
              #68b7e8 45%,
              #4999ce 100%
            );

          box-shadow:
            inset 0 7px 6px
              rgba(
                255,
                255,
                255,
                .72
              ),

            inset 0 -7px 7px
              rgba(
                0,
                0,
                0,
                .16
              ),

            0 7px 0
              #17415c,

            0 13px 18px
              rgba(
                0,
                0,
                0,
                .22
              );
        }

        .backMini {
          justify-self:
            start;

          padding:
            10px 18px;

          border:
            2px solid
            #51585c;

          border-radius:
            9px;

          background:
            linear-gradient(
              180deg,
              #ffffff,
              #c7c7c7
            );

          box-shadow:
            inset 0 3px 3px
              white,

            0 3px 0
              #555d61;

          font-family:
            inherit;

          font-size:
            16px;

          font-weight:
            700;

          cursor:
            pointer;
        }

        .unitInfo {
          color:
            #073b68;

          font-size:
            21px;

          font-weight:
            700;

          text-align:
            center;
        }

        .progress {
          justify-self:
            end;

          color:
            #304f65;

          font-size:
            18px;

          font-weight:
            700;
        }

        /* ================= MAIN ================= */

        .learnArea {
          width:
            min(
              1250px,
              98%
            );

          min-height:
            700px;

          margin:
            42px auto
            0;

          display:
            flex;

          flex-direction:
            column;

          align-items:
            center;
        }

        /* ================= WORD ================= */

        .wordBox {
          width:
            min(
              470px,
              85%
            );

          min-height:
            105px;

          padding:
            20px;

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;

          text-align:
            center;

          color:
            #050505;

          font-size:
            clamp(
              28px,
              3vw,
              40px
            );

          font-weight:
            700;

          border:
            3px solid
            #174461;

          border-radius:
            18px;

          background:
            linear-gradient(
              180deg,
              #84c9f5 0%,
              #63a9da 45%,
              #5298ca 100%
            );

          box-shadow:
            inset 0 7px 6px
              rgba(
                255,
                255,
                255,
                .65
              ),

            inset 0 -7px 7px
              rgba(
                0,
                0,
                0,
                .16
              ),

            0 6px 0
              #17415c,

            0 10px 15px
              rgba(
                0,
                0,
                0,
                .24
              );
        }

        /* ================= WORD TOOLS ================= */

        .wordTools {
          margin-top:
            24px;

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;

          gap:
            16px;

          flex-wrap:
            wrap;
        }

        .toolButton {
          min-width:
            145px;

          min-height:
            44px;

          padding:
            9px 17px;

          border:
            2px solid
            #51585c;

          border-radius:
            11px;

          background:
            linear-gradient(
              180deg,
              #ffffff,
              #dedede
            );

          box-shadow:
            inset 0 4px 4px
              rgba(
                255,
                255,
                255,
                .95
              ),

            0 4px 0
              #555d61;

          color:
            #222;

          font-family:
            inherit;

          font-size:
            16px;

          font-weight:
            700;

          cursor:
            pointer;

          transition:
            transform
              .12s ease,
            filter
              .12s ease;
        }

        .toolButton:hover {
          transform:
            translateY(
              -2px
            );

          filter:
            brightness(
              1.05
            );
        }

        .toolButton:active {
          transform:
            translateY(
              2px
            );
        }

        .difficultActive {
          color:
            #754c00;

          border-color:
            #9a6b00;

          background:
            linear-gradient(
              180deg,
              #fff4b8,
              #eac858
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
              #9a6b00;
        }

        /* ================= EXAMPLE ================= */

        .exampleArea {
          width:
            100%;

          min-height:
            145px;

          margin-top:
            18px;

          display:
            flex;

          align-items:
            center;

          justify-content:
            center;
        }

        .exampleButton {
          padding:
            10px 21px;

          border:
            1px solid
            #777;

          border-radius:
            20px;

          background:
            #ffffff;

          color:
            #333;

          font-family:
            inherit;

          font-size:
            17px;

          font-weight:
            700;

          cursor:
            pointer;

          transition:
            transform
              .15s ease,
            box-shadow
              .15s ease;
        }

        .exampleButton:hover {
          transform:
            translateY(
              -2px
            );

          box-shadow:
            0 5px 10px
              rgba(
                0,
                0,
                0,
                .12
              );
        }

        .exampleText {
          text-align:
            center;

          animation:
            exampleAppear
            .22s ease;
        }

        @keyframes exampleAppear {
          from {
            opacity:
              0;

            transform:
              translateY(
                5px
              );
          }

          to {
            opacity:
              1;

            transform:
              translateY(
                0
              );
          }
        }

        .englishExample {
          color:
            #111;

          font-family:
            "Times New Roman",
            serif;

          font-size:
            clamp(
              27px,
              3vw,
              38px
            );

          font-weight:
            700;

          font-style:
            italic;
        }

        .uzbekExample {
          margin-top:
            3px;

          color:
            #e11d1d;

          font-family:
            "Times New Roman",
            serif;

          font-size:
            clamp(
              24px,
              2.6vw,
              33px
            );

          font-style:
            italic;
        }

        .noExample {
          color:
            #777;

          font-size:
            19px;

          font-style:
            italic;
        }

        /* ================= ANSWERS ================= */

        .answers {
          width:
            min(
              1050px,
              95%
            );

          margin-top:
            15px;

          display:
            grid;

          grid-template-columns:
            repeat(
              2,
              minmax(
                0,
                1fr
              )
            );

          gap:
            80px;
        }

        .answerButton {
          min-height:
            105px;

          padding:
            20px 25px;

          border:
            3px solid
            #4d555a;

          border-radius:
            17px;

          color:
            #070707;

          background:
            linear-gradient(
              180deg,
              #f2f2f2 0%,
              #d7d7d7 35%,
              #bbbbbb 100%
            );

          box-shadow:
            inset 0 7px 6px
              rgba(
                255,
                255,
                255,
                .92
              ),

            inset 0 -6px 6px
              rgba(
                0,
                0,
                0,
                .15
              ),

            0 6px 0
              #555d61,

            0 10px 14px
              rgba(
                0,
                0,
                0,
                .20
              );

          font-family:
            inherit;

          font-size:
            clamp(
              24px,
              2.5vw,
              34px
            );

          font-weight:
            700;

          cursor:
            pointer;

          transition:
            transform
              .12s ease,
            filter
              .12s ease;
        }

        .answerButton:hover:not(:disabled) {
          transform:
            translateY(
              -3px
            );

          filter:
            brightness(
              1.04
            );
        }

        .answerButton:active:not(:disabled) {
          transform:
            translateY(
              3px
            );
        }

        .answerButton:disabled {
          cursor:
            default;
        }

        .correctAnswer {
          color:
            #0b4f2b;

          border-color:
            #237a45;

          background:
            linear-gradient(
              180deg,
              #baf4cb,
              #74cf91
            );

          box-shadow:
            inset 0 6px 5px
              rgba(
                255,
                255,
                255,
                .75
              ),

            0 6px 0
              #237a45;
        }

        .wrongAnswer {
          color:
            #7a1515;

          border-color:
            #a52b2b;

          background:
            linear-gradient(
              180deg,
              #ffc4c4,
              #e77b7b
            );

          box-shadow:
            inset 0 6px 5px
              rgba(
                255,
                255,
                255,
                .75
              ),

            0 6px 0
              #8c2727;
        }

        /* ================= LATER ================= */

        .laterButton {
          margin-top:
            30px;

          padding:
            10px 22px;

          border:
            1px solid
            #858585;

          border-radius:
            18px;

          background:
            #ffffff;

          color:
            #555;

          font-family:
            inherit;

          font-size:
            16px;

          font-weight:
            700;

          cursor:
            pointer;

          transition:
            transform
              .12s ease,
            box-shadow
              .12s ease;
        }

        .laterButton:hover:not(:disabled) {
          transform:
            translateY(
              -2px
            );

          box-shadow:
            0 4px 9px
              rgba(
                0,
                0,
                0,
                .13
              );
        }

        .laterButton:disabled {
          opacity:
            .5;

          cursor:
            default;
        }

        /* ================= FEEDBACK ================= */

        .feedbackArea {
          min-height:
            55px;

          margin-top:
            24px;

          text-align:
            center;
        }

        .correctText {
          color:
            #14713a;

          font-size:
            25px;

          font-weight:
            700;
        }

        .wrongText {
          color:
            #b42318;

          font-size:
            22px;

          font-weight:
            700;
        }

        /* ================= MOBILE ================= */

        @media (
          max-width:
            760px
        ) {
          .page {
            padding:
              15px 12px
              35px;
          }

          .topBar {
            grid-template-columns:
              1fr 1fr;

            padding:
              18px 15px;
          }

          .unitInfo {
            grid-column:
              1 / -1;

            grid-row:
              1;
          }

          .backMini {
            grid-column:
              1;

            grid-row:
              2;
          }

          .progress {
            grid-column:
              2;

            grid-row:
              2;
          }

          .learnArea {
            margin-top:
              30px;
          }

          .answers {
            grid-template-columns:
              1fr;

            gap:
              25px;

            margin-top:
              10px;
          }

          .answerButton {
            min-height:
              88px;
          }

          .exampleArea {
            min-height:
              130px;
          }
        }
      `}</style>
    </main>
  );
}

/* =========================================================
   PAGE

   useSearchParams uchun Suspense kerak.
========================================================= */

export default function LearnPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight:
              "100vh",

            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "center",

            fontFamily:
              '"Bell MT", "Times New Roman", serif',

            fontSize:
              "26px",

            fontWeight:
              700,
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
