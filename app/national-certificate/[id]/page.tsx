"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams } from "next/navigation";

type TestOption = {
  id: string;
  key: string;
  text: string;
  html: string;
  sortOrder: number;
};

type TestQuestion = {
  id: string;
  questionNumber: number;
  questionType: "closed" | "open";
  questionText: string;
  questionHtml: string;
  points: number;
  options: TestOption[];
};

type TestData = {
  id: string;
  title: string;
  description: string;
  subject: string;
  durationMinutes: number;
  closedQuestionCount: number;
  openQuestionCount: number;
  totalQuestions: number;
  attemptLimit: number | null;
  questions: TestQuestion[];
};

type AttemptData = {
  id: string;
  testId: string;
  status: string;
  startedAt: string;
  expiresAt: string;
  durationMinutes: number;
};

type QuestionResult = {
  questionId: string;
  questionNumber: number;
  answered: boolean;
  isCorrect: boolean | null;
  awardedPoints: number;
};

type FinalResult = {
  attemptId: string;
  testId: string;
  title: string;
  status: string;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  totalQuestions: number;
  rawScore: number;
  maximumScore: number;
  percentage: number;
  startedAt: string;
  submittedAt: string;
  questionResults: QuestionResult[];
};

type AnswerState = {
  selectedOptionId?: string;
  openAnswerText?: string;
};

type AnswersMap = Record<string, AnswerState>;

function formatTime(totalSeconds: number) {
  const safe = Math.max(
    0,
    Math.floor(totalSeconds)
  );

  const hours = Math.floor(
    safe / 3600
  );

  const minutes = Math.floor(
    (safe % 3600) / 60
  );

  const seconds = safe % 60;

  if (hours > 0) {
    return [
      hours,
      minutes,
      seconds,
    ]
      .map((value) =>
        String(value).padStart(2, "0")
      )
      .join(":");
  }

  return [minutes, seconds]
    .map((value) =>
      String(value).padStart(2, "0")
    )
    .join(":");
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  if (Number.isInteger(value)) {
    return String(value);
  }

  return value
    .toFixed(3)
    .replace(/0+$/, "")
    .replace(/\.$/, "");
}

export default function NationalCertificateTestPage() {
  const params = useParams();

  const testId =
    typeof params?.id === "string"
      ? params.id
      : "";

  const [test, setTest] =
    useState<TestData | null>(null);

  const [attempt, setAttempt] =
    useState<AttemptData | null>(null);

  const [answers, setAnswers] =
    useState<AnswersMap>({});

  const [currentIndex, setCurrentIndex] =
    useState(0);

  const [remainingSeconds, setRemainingSeconds] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [starting, setStarting] =
    useState(false);

  const [userName, setUserName] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [result, setResult] =
    useState<FinalResult | null>(null);

  const [confirmFinish, setConfirmFinish] =
    useState(false);

  const autoSubmitStarted =
    useRef(false);

  const storageKey = useMemo(
    () =>
      testId
        ? `national-certificate-progress:${testId}`
        : "",
    [testId]
  );

  const currentQuestion =
    test?.questions[currentIndex] ??
    null;

  const answeredCount = useMemo(() => {
    if (!test) {
      return 0;
    }

    return test.questions.filter(
      (question) => {
        const answer =
          answers[question.id];

        if (
          question.questionType ===
          "closed"
        ) {
          return Boolean(
            answer?.selectedOptionId
          );
        }

        return Boolean(
          answer?.openAnswerText?.trim()
        );
      }
    ).length;
  }, [test, answers]);

  const unansweredCount =
    test
      ? test.totalQuestions -
        answeredCount
      : 0;

  const progressPercent =
    test && test.totalQuestions > 0
      ? (answeredCount /
          test.totalQuestions) *
        100
      : 0;

  const saveLocalProgress =
    useCallback(
      (
        nextAnswers: AnswersMap,
        nextIndex = currentIndex
      ) => {
        if (!storageKey) {
          return;
        }

        try {
          localStorage.setItem(
            storageKey,
            JSON.stringify({
              answers: nextAnswers,
              currentIndex:
                nextIndex,
              attemptId:
                attempt?.id || null,
              savedAt:
                new Date().toISOString(),
            })
          );
        } catch {
          // localStorage ishlamasa test davom etadi.
        }
      },
      [
        storageKey,
        currentIndex,
        attempt?.id,
      ]
    );

  const loadTest =
    useCallback(async () => {
      if (!testId) {
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/national-certificate/tests/${testId}/public`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Testni yuklab bo‘lmadi."
          );
        }

        const loadedTest =
          data.test as TestData;

        setTest(loadedTest);

        try {
          const savedRaw =
            localStorage.getItem(
              storageKey
            );

          if (savedRaw) {
            const saved =
              JSON.parse(savedRaw);

            if (
              saved?.answers &&
              typeof saved.answers ===
                "object"
            ) {
              setAnswers(
                saved.answers
              );
            }

            if (
              Number.isInteger(
                saved?.currentIndex
              )
            ) {
              const safeIndex =
                Math.max(
                  0,
                  Math.min(
                    loadedTest
                      .questions
                      .length - 1,
                    saved.currentIndex
                  )
                );

              setCurrentIndex(
                safeIndex
              );
            }
          }
        } catch {
          // Noto‘g‘ri localStorage ma’lumoti e’tiborsiz qoldiriladi.
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Testni yuklashda xatolik yuz berdi."
        );
      } finally {
        setLoading(false);
      }
    }, [
      testId,
      storageKey,
    ]);

  useEffect(() => {
    loadTest();
  }, [loadTest]);

  const startTest =
    useCallback(async () => {
      if (!testId) {
        return;
      }

      const cleanName = userName
        .trim()
        .replace(/\s+/g, " " );

      if (!cleanName) {
        setError(
          "Ism, familiya va otangiz ismini kiriting."
        );
        return;
      }

      if (cleanName.length < 3) {
        setError(
          "F.I.Sh. juda qisqa."
        );
        return;
      }

      if (cleanName.length > 100) {
        setError(
          "F.I.Sh. 100 ta belgidan oshmasligi kerak."
        );
        return;
      }

      setStarting(true);
      setError("");
      setMessage("");

      try {
        const response = await fetch(
          `/api/national-certificate/tests/${testId}/start`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              userName: cleanName,
            }),
          }
        );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Testni boshlashda xatolik yuz berdi."
          );
        }

        const nextAttempt =
          data.attempt as AttemptData;

        setAttempt(nextAttempt);

        const expires =
          new Date(
            nextAttempt.expiresAt
          ).getTime();

        setRemainingSeconds(
          Math.max(
            0,
            Math.ceil(
              (expires -
                Date.now()) /
                1000
            )
          )
        );

        autoSubmitStarted.current =
          false;

        if (data.resumed) {
          setMessage(
            "Avval boshlangan test davom ettirilmoqda."
          );
        }

        if (storageKey) {
          try {
            const savedRaw =
              localStorage.getItem(
                storageKey
              );

            if (savedRaw) {
              const saved =
                JSON.parse(
                  savedRaw
                );

              if (
                saved?.answers &&
                typeof saved.answers ===
                  "object"
              ) {
                setAnswers(
                  saved.answers
                );
              }

              if (
                Number.isInteger(
                  saved?.currentIndex
                )
              ) {
                setCurrentIndex(
                  Math.max(
                    0,
                    Math.min(
                      (test
                        ?.questions
                        .length ??
                        1) - 1,
                      saved.currentIndex
                    )
                  )
                );
              }
            }
          } catch {
            // davom etamiz
          }
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Testni boshlashda xatolik yuz berdi."
        );
      } finally {
        setStarting(false);
      }
    }, [
      testId,
      storageKey,
      test,
      userName,
    ]);

  const submitTest =
    useCallback(
      async (
        automatic = false
      ) => {
        if (
          !attempt ||
          !test ||
          submitting
        ) {
          return;
        }

        setSubmitting(true);
        setError("");
        setMessage("");

        try {
          const submittedAnswers =
            test.questions.map(
              (question) => {
                const answer =
                  answers[
                    question.id
                  ] || {};

                return {
                  questionId:
                    question.id,

                  selectedOptionId:
                    question
                      .questionType ===
                    "closed"
                      ? answer.selectedOptionId ||
                        null
                      : null,

                  openAnswerText:
                    question
                      .questionType ===
                    "open"
                      ? answer.openAnswerText ||
                        ""
                      : "",
                };
              }
            );

          const response =
            await fetch(
              `/api/national-certificate/attempts/${attempt.id}/submit`,
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body: JSON.stringify({
                  answers:
                    submittedAnswers,
                }),
              }
            );

          const data =
            await response.json();

          if (
            !response.ok ||
            !data.success
          ) {
            if (
              data.code ===
              "TIME_EXPIRED"
            ) {
              setRemainingSeconds(
                0
              );

              throw new Error(
                "Test uchun ajratilgan vaqt tugadi."
              );
            }

            throw new Error(
              data.message ||
                "Testni yakunlashda xatolik yuz berdi."
            );
          }

          setResult(
            data.result as FinalResult
          );

          setConfirmFinish(false);

          if (storageKey) {
            try {
              localStorage.removeItem(
                storageKey
              );
            } catch {
              // ignore
            }
          }

          if (automatic) {
            setMessage(
              "Vaqt tugadi. Test avtomatik yakunlandi."
            );
          }
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Testni yakunlashda xatolik yuz berdi."
          );
        } finally {
          setSubmitting(false);
        }
      },
      [
        attempt,
        test,
        answers,
        submitting,
        storageKey,
      ]
    );

  useEffect(() => {
    if (
      !attempt ||
      result
    ) {
      return;
    }

    const updateTimer = () => {
      const expiresAt =
        new Date(
          attempt.expiresAt
        ).getTime();

      const seconds =
        Math.max(
          0,
          Math.ceil(
            (expiresAt -
              Date.now()) /
              1000
          )
        );

      setRemainingSeconds(
        seconds
      );

      if (
        seconds <= 0 &&
        !autoSubmitStarted.current
      ) {
        autoSubmitStarted.current =
          true;

        submitTest(true);
      }
    };

    updateTimer();

    const interval =
      window.setInterval(
        updateTimer,
        1000
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [
    attempt,
    result,
    submitTest,
  ]);

  const selectOption = (
    questionId: string,
    optionId: string
  ) => {
    if (
      !attempt ||
      submitting ||
      remainingSeconds <= 0
    ) {
      return;
    }

    const next: AnswersMap = {
      ...answers,

      [questionId]: {
        ...answers[
          questionId
        ],
        selectedOptionId:
          optionId,
      },
    };

    setAnswers(next);

    saveLocalProgress(next);
  };

  const writeOpenAnswer = (
    questionId: string,
    value: string
  ) => {
    if (
      !attempt ||
      submitting ||
      remainingSeconds <= 0
    ) {
      return;
    }

    const next: AnswersMap = {
      ...answers,

      [questionId]: {
        ...answers[
          questionId
        ],
        openAnswerText:
          value,
      },
    };

    setAnswers(next);

    saveLocalProgress(next);
  };

  const goToQuestion = (
    index: number
  ) => {
    if (!test) {
      return;
    }

    const safe =
      Math.max(
        0,
        Math.min(
          test.questions.length -
            1,
          index
        )
      );

    setCurrentIndex(safe);

    saveLocalProgress(
      answers,
      safe
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const isAnswered = (
    question: TestQuestion
  ) => {
    const answer =
      answers[question.id];

    if (
      question.questionType ===
      "closed"
    ) {
      return Boolean(
        answer?.selectedOptionId
      );
    }

    return Boolean(
      answer?.openAnswerText?.trim()
    );
  };

  if (loading) {
    return (
      <main className="ncPage">
        <div className="centerBox">
          <div className="loader" />
          <h2>
            Test yuklanmoqda...
          </h2>
        </div>

        <PageStyles />
      </main>
    );
  }

  if (
    error &&
    !test
  ) {
    return (
      <main className="ncPage">
        <div className="errorPage">
          <div className="errorIcon">
            !
          </div>

          <h1>
            Testni ochib
            bo‘lmadi
          </h1>

          <p>{error}</p>

          <button
            type="button"
            onClick={loadTest}
            className="primaryButton"
          >
            Qayta urinish
          </button>
        </div>

        <PageStyles />
      </main>
    );
  }

  if (!test) {
    return null;
  }

  if (result) {
    return (
      <main className="ncPage">
        <div className="resultWrapper">
          <section className="resultCard">
            <div className="resultTop">
              <div>
                <div className="eyebrow">
                  Milliy
                  sertifikat
                </div>

                <h1>
                  {result.title}
                </h1>

                <p>
                  Test
                  yakunlandi
                </p>
              </div>

              <div className="percentCircle">
                <strong>
                  {formatNumber(
                    result.percentage
                  )}
                  %
                </strong>

                <span>
                  Natija
                </span>
              </div>
            </div>

            {message && (
              <div className="successMessage">
                {message}
              </div>
            )}

            <div className="resultStats">
              <div className="resultStat correct">
                <span>
                  To‘g‘ri
                </span>

                <strong>
                  {
                    result.correctCount
                  }
                </strong>
              </div>

              <div className="resultStat wrong">
                <span>
                  Noto‘g‘ri
                </span>

                <strong>
                  {
                    result.incorrectCount
                  }
                </strong>
              </div>

              <div className="resultStat empty">
                <span>
                  Javobsiz
                </span>

                <strong>
                  {
                    result.unansweredCount
                  }
                </strong>
              </div>

              <div className="resultStat">
                <span>
                  Ball
                </span>

                <strong>
                  {formatNumber(
                    result.rawScore
                  )}
                  /
                  {formatNumber(
                    result.maximumScore
                  )}
                </strong>
              </div>
            </div>

            <div className="resultQuestionGrid">
              {result.questionResults.map(
                (item) => (
                  <div
                    key={
                      item.questionId
                    }
                    className={[
                      "resultQuestion",
                      !item.answered
                        ? "unanswered"
                        : item.isCorrect
                        ? "right"
                        : "incorrect",
                    ].join(" ")}
                    title={
                      !item.answered
                        ? `${item.questionNumber}-savol: javobsiz`
                        : item.isCorrect
                        ? `${item.questionNumber}-savol: to‘g‘ri`
                        : `${item.questionNumber}-savol: noto‘g‘ri`
                    }
                  >
                    {
                      item.questionNumber
                    }
                  </div>
                )
              )}
            </div>
          </section>
        </div>

        <PageStyles />
      </main>
    );
  }

  if (!attempt) {
    return (
      <main className="ncPage">
        <div className="startWrapper">
          <section className="startCard">
            <div className="eyebrow">
              Huquqshunoslik
            </div>

            <h1>
              {test.title}
            </h1>

            {test.description && (
              <p className="description">
                {
                  test.description
                }
              </p>
            )}

            <div className="startStats">
              <div>
                <span>
                  Savollar
                </span>

                <strong>
                  {
                    test.totalQuestions
                  }
                </strong>
              </div>

              <div>
                <span>
                  Yopiq
                </span>

                <strong>
                  {
                    test.closedQuestionCount
                  }
                </strong>
              </div>

              <div>
                <span>
                  Ochiq
                </span>

                <strong>
                  {
                    test.openQuestionCount
                  }
                </strong>
              </div>

              <div>
                <span>
                  Vaqt
                </span>

                <strong>
                  {
                    test.durationMinutes
                  }{" "}
                  daqiqa
                </strong>
              </div>
            </div>

            <div className="instructions">
              <h3>
                Test tartibi
              </h3>

              <p>
                Test davomida
                savollar orasida
                erkin yurishingiz
                va oldingi
                javoblaringizni
                o‘zgartirishingiz
                mumkin.
              </p>

              <p>
                Vaqt barcha
                savollar uchun
                umumiy hisoblanadi.
                Vaqt tugaganda test
                avtomatik
                yakunlanadi.
              </p>

              {test.attemptLimit !==
                null && (
                <p>
                  Urinishlar soni:{" "}
                  <strong>
                    {
                      test.attemptLimit
                    }
                  </strong>
                </p>
              )}
            </div>

            <div className="nameField">
              <label
                htmlFor="national-certificate-user-name"
              >
                Ism, familiya va otangiz ismi
              </label>

              <input
                id="national-certificate-user-name"
                type="text"
                value={userName}
                onChange={(event) => {
                  setUserName(
                    event.target.value
                  );

                  if (error) {
                    setError("");
                  }
                }}
                placeholder="Masalan: Ali Valiyev Nurali o‘g‘li"
                maxLength={100}
                autoComplete="name"
                disabled={starting}
                onKeyDown={(event) => {
                  if (
                    event.key ===
                      "Enter" &&
                    !starting &&
                    userName.trim()
                  ) {
                    startTest();
                  }
                }}
              />

              <span>
                Natijangiz administrator
                panelida shu F.I.Sh. bilan
                saqlanadi.
              </span>
            </div>

            {error && (
              <div className="errorMessage">
                {error}
              </div>
            )}

            <button
              type="button"
              className="startButton"
              onClick={
                startTest
              }
              disabled={
                starting
              }
            >
              {starting
                ? "Boshlanmoqda..."
                : "Testni boshlash"}
            </button>
          </section>
        </div>

        <PageStyles />
      </main>
    );
  }

  return (
    <main className="ncPage">
      <header className="testHeader">
        <div className="headerInner">
          <div className="headerTitle">
            <span>
              Milliy
              sertifikat
            </span>

            <strong>
              {test.title}
            </strong>
          </div>

          <div
            className={[
              "timer",
              remainingSeconds <=
              300
                ? "timerDanger"
                : "",
            ].join(" ")}
          >
            <span>
              Qolgan vaqt
            </span>

            <strong>
              {formatTime(
                remainingSeconds
              )}
            </strong>
          </div>
        </div>
      </header>

      <div className="progressTrack">
        <div
          className="progressFill"
          style={{
            width: `${progressPercent}%`,
          }}
        />
      </div>

      <div className="testLayout">
        <aside className="navigatorCard">
          <div className="navTop">
            <div>
              <span>
                Javob
                berildi
              </span>

              <strong>
                {answeredCount}/
                {
                  test.totalQuestions
                }
              </strong>
            </div>

            <div>
              <span>
                Javobsiz
              </span>

              <strong>
                {unansweredCount}
              </strong>
            </div>
          </div>

          <div className="questionNavigator">
            {test.questions.map(
              (
                question,
                index
              ) => {
                const answered =
                  isAnswered(
                    question
                  );

                const active =
                  index ===
                  currentIndex;

                return (
                  <button
                    type="button"
                    key={
                      question.id
                    }
                    onClick={() =>
                      goToQuestion(
                        index
                      )
                    }
                    className={[
                      "navNumber",
                      answered
                        ? "answered"
                        : "",
                      active
                        ? "active"
                        : "",
                    ].join(
                      " "
                    )}
                  >
                    {
                      question.questionNumber
                    }
                  </button>
                );
              }
            )}
          </div>

          <div className="legend">
            <div>
              <span className="legendBox current" />
              Hozirgi
            </div>

            <div>
              <span className="legendBox answeredLegend" />
              Javob berilgan
            </div>

            <div>
              <span className="legendBox blank" />
              Javobsiz
            </div>
          </div>
        </aside>

        <section className="questionArea">
          {message && (
            <div className="successMessage">
              {message}
            </div>
          )}

          {error && (
            <div className="errorMessage">
              {error}
            </div>
          )}

          {currentQuestion && (
            <article className="questionCard">
              <div className="questionMeta">
                <div>
                  <span className="questionNumber">
                    {
                      currentQuestion.questionNumber
                    }
                    -savol
                  </span>

                  <span className="questionType">
                    {currentQuestion.questionType ===
                    "closed"
                      ? "Yopiq savol"
                      : "Ochiq savol"}
                  </span>
                </div>

                <span className="points">
                  {formatNumber(
                    currentQuestion.points
                  )}{" "}
                  ball
                </span>
              </div>

              {currentQuestion.questionHtml ? (
                <div
                  className="questionText htmlContent"
                  dangerouslySetInnerHTML={{
                    __html:
                      currentQuestion.questionHtml,
                  }}
                />
              ) : (
                <div className="questionText">
                  {
                    currentQuestion.questionText
                  }
                </div>
              )}

              {currentQuestion.questionType ===
              "closed" ? (
                <div className="options">
                  {currentQuestion.options.map(
                    (
                      option
                    ) => {
                      const selected =
                        answers[
                          currentQuestion
                            .id
                        ]
                          ?.selectedOptionId ===
                        option.id;

                      return (
                        <label
                          key={
                            option.id
                          }
                          className={[
                            "option",
                            selected
                              ? "selected"
                              : "",
                          ].join(
                            " "
                          )}
                        >
                          <input
                            type="radio"
                            name={`question-${currentQuestion.id}`}
                            checked={
                              selected
                            }
                            disabled={
                              submitting ||
                              remainingSeconds <=
                                0
                            }
                            onChange={() =>
                              selectOption(
                                currentQuestion.id,
                                option.id
                              )
                            }
                          />

                          <span className="optionKey">
                            {
                              option.key
                            }
                          </span>

                          {option.html ? (
                            <span
                              className="optionText htmlContent"
                              dangerouslySetInnerHTML={{
                                __html:
                                  option.html,
                              }}
                            />
                          ) : (
                            <span className="optionText">
                              {
                                option.text
                              }
                            </span>
                          )}
                        </label>
                      );
                    }
                  )}
                </div>
              ) : (
                <div className="openAnswer">
                  <label
                    htmlFor="open-answer"
                  >
                    Javobingiz
                  </label>

                  <textarea
                    id="open-answer"
                    value={
                      answers[
                        currentQuestion
                          .id
                      ]
                        ?.openAnswerText ||
                      ""
                    }
                    onChange={(
                      event
                    ) =>
                      writeOpenAnswer(
                        currentQuestion.id,
                        event
                          .target
                          .value
                      )
                    }
                    disabled={
                      submitting ||
                      remainingSeconds <=
                        0
                    }
                    placeholder="Javobni kiriting..."
                    rows={5}
                  />

                  <span className="answerHint">
                    Javobni aniq
                    yozing.
                  </span>
                </div>
              )}

              <div className="questionActions">
                <button
                  type="button"
                  className="secondaryButton"
                  onClick={() =>
                    goToQuestion(
                      currentIndex -
                        1
                    )
                  }
                  disabled={
                    currentIndex ===
                      0 ||
                    submitting
                  }
                >
                  ← Oldingi
                </button>

                <span className="positionText">
                  {currentIndex +
                    1}{" "}
                  /{" "}
                  {
                    test.totalQuestions
                  }
                </span>

                {currentIndex <
                test.questions.length -
                  1 ? (
                  <button
                    type="button"
                    className="primaryButton"
                    onClick={() =>
                      goToQuestion(
                        currentIndex +
                          1
                      )
                    }
                    disabled={
                      submitting
                    }
                  >
                    Keyingi →
                  </button>
                ) : (
                  <button
                    type="button"
                    className="finishButton"
                    onClick={() =>
                      setConfirmFinish(
                        true
                      )
                    }
                    disabled={
                      submitting
                    }
                  >
                    Testni
                    yakunlash
                  </button>
                )}
              </div>
            </article>
          )}

          <div className="bottomFinish">
            <button
              type="button"
              className="finishOutlineButton"
              onClick={() =>
                setConfirmFinish(
                  true
                )
              }
              disabled={
                submitting
              }
            >
              Testni yakunlash
            </button>
          </div>
        </section>
      </div>

      {confirmFinish && (
        <div
          className="modalOverlay"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setConfirmFinish(
                false
              );
            }
          }}
        >
          <div
            className="confirmModal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="finish-title"
          >
            <h2 id="finish-title">
              Testni
              yakunlaysizmi?
            </h2>

            <p>
              Javob berilgan:{" "}
              <strong>
                {answeredCount}
              </strong>
            </p>

            <p>
              Javobsiz:{" "}
              <strong>
                {unansweredCount}
              </strong>
            </p>

            {unansweredCount >
              0 && (
              <div className="warningMessage">
                Sizda{" "}
                {
                  unansweredCount
                }{" "}
                ta javobsiz savol
                mavjud.
              </div>
            )}

            <div className="modalActions">
              <button
                type="button"
                className="secondaryButton"
                onClick={() =>
                  setConfirmFinish(
                    false
                  )
                }
                disabled={
                  submitting
                }
              >
                Testga qaytish
              </button>

              <button
                type="button"
                className="finishButton"
                onClick={() =>
                  submitTest(
                    false
                  )
                }
                disabled={
                  submitting
                }
              >
                {submitting
                  ? "Yakunlanmoqda..."
                  : "Ha, yakunlash"}
              </button>
            </div>
          </div>
        </div>
      )}

      <PageStyles />
    </main>
  );
}

function PageStyles() {
  return (
    <style jsx global>{`
      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        background: #f3f5f7;
        color: #172033;
      }

      button,
      input,
      textarea {
        font: inherit;
      }

      .ncPage {
        min-height: 100vh;
        background:
          linear-gradient(
            180deg,
            #f7f8fa 0%,
            #eef1f4 100%
          );
      }

      .centerBox,
      .errorPage {
        width: min(
          92%,
          600px
        );
        margin: 0 auto;
        padding: 120px 24px;
        text-align: center;
      }

      .loader {
        width: 44px;
        height: 44px;
        margin: 0 auto 20px;
        border-radius: 50%;
        border: 4px solid
          #d9dfe8;
        border-top-color:
          #2458a6;
        animation: ncSpin
          0.8s linear infinite;
      }

      @keyframes ncSpin {
        to {
          transform: rotate(
            360deg
          );
        }
      }

      .errorIcon {
        display: grid;
        place-items: center;
        width: 64px;
        height: 64px;
        margin: 0 auto 20px;
        border-radius: 50%;
        background: #fee2e2;
        color: #b42318;
        font-size: 32px;
        font-weight: 900;
      }

      .startWrapper,
      .resultWrapper {
        width: min(
          94%,
          900px
        );
        margin: 0 auto;
        padding: 50px 0;
      }

      .startCard,
      .resultCard {
        background: #ffffff;
        border: 1px solid
          #d8dee8;
        border-radius: 22px;
        padding: 34px;
        box-shadow:
          0 10px 28px
          rgba(
            19,
            31,
            54,
            0.08
          );
      }

      .eyebrow {
        margin-bottom: 8px;
        color: #2458a6;
        font-weight: 800;
        font-size: 13px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .startCard h1,
      .resultCard h1 {
        margin: 0;
        font-size: clamp(
          25px,
          4vw,
          38px
        );
        line-height: 1.18;
      }

      .description {
        margin: 14px 0 0;
        color: #5b6577;
        line-height: 1.7;
      }

      .startStats,
      .resultStats {
        display: grid;
        grid-template-columns:
          repeat(
            4,
            minmax(0, 1fr)
          );
        gap: 12px;
        margin-top: 28px;
      }

      .startStats > div,
      .resultStat {
        min-width: 0;
        padding: 18px;
        border: 1px solid
          #dce2ea;
        border-radius: 15px;
        background: #f8f9fb;
      }

      .startStats span,
      .resultStat span {
        display: block;
        color: #6b7483;
        font-size: 13px;
        margin-bottom: 6px;
      }

      .startStats strong,
      .resultStat strong {
        font-size: 20px;
      }

      .instructions {
        margin-top: 26px;
        padding: 20px;
        border-radius: 15px;
        background: #f2f5f9;
        border: 1px solid
          #dde4ed;
      }

      .instructions h3 {
        margin: 0 0 10px;
      }

      .instructions p {
        margin: 8px 0;
        line-height: 1.6;
        color: #4e5869;
      }

      .nameField {
        margin-top: 22px;
      }

      .nameField label {
        display: block;
        margin-bottom: 8px;
        color: #263448;
        font-size: 14px;
        font-weight: 800;
      }

      .nameField input {
        width: 100%;
        height: 52px;
        padding: 0 15px;
        border: 1px solid #cbd4df;
        border-radius: 11px;
        background: #ffffff;
        color: #172033;
        font-size: 16px;
        outline: none;
        transition:
          border-color 0.15s ease,
          box-shadow 0.15s ease;
      }

      .nameField input:focus {
        border-color: #527fbd;
        box-shadow:
          0 0 0 3px
          rgba(36, 88, 166, 0.12);
      }

      .nameField input::placeholder {
        color: #98a2b3;
      }

      .nameField input:disabled {
        background: #f3f5f7;
      }

      .nameField span {
        display: block;
        margin-top: 7px;
        color: #737d8d;
        font-size: 12px;
        line-height: 1.5;
      }

      .startButton,
      .primaryButton,
      .secondaryButton,
      .finishButton,
      .finishOutlineButton {
        min-height: 46px;
        border-radius: 11px;
        border: 1px solid
          transparent;
        padding: 11px 20px;
        cursor: pointer;
        font-weight: 800;
        transition:
          transform 0.15s ease,
          background 0.15s ease,
          border-color 0.15s ease;
      }

      .startButton {
        width: 100%;
        margin-top: 24px;
        min-height: 54px;
        background: #2458a6;
        color: white;
        font-size: 16px;
      }

      .primaryButton {
        background: #2458a6;
        color: white;
      }

      .secondaryButton {
        background: white;
        color: #263448;
        border-color: #ccd4df;
      }

      .finishButton {
        background: #9f2d2d;
        color: white;
      }

      .finishOutlineButton {
        background: white;
        color: #8c2929;
        border-color: #c98686;
      }

      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      @media (hover: hover) {
        .startButton:not(:disabled):hover,
        .primaryButton:not(:disabled):hover,
        .finishButton:not(:disabled):hover {
          transform:
            translateY(-1px);
        }

        .secondaryButton:not(:disabled):hover {
          background: #f4f6f8;
        }
      }

      .testHeader {
        position: sticky;
        top: 0;
        z-index: 30;
        background:
          rgba(
            255,
            255,
            255,
            0.96
          );
        border-bottom: 1px
          solid #dbe1e9;
        backdrop-filter: blur(
          10px
        );
      }

      .headerInner {
        width: min(
          96%,
          1380px
        );
        margin: 0 auto;
        min-height: 76px;
        display: flex;
        align-items: center;
        justify-content:
          space-between;
        gap: 20px;
      }

      .headerTitle {
        min-width: 0;
      }

      .headerTitle span {
        display: block;
        color: #647084;
        font-size: 12px;
        margin-bottom: 3px;
      }

      .headerTitle strong {
        display: block;
        overflow: hidden;
        text-overflow:
          ellipsis;
        white-space: nowrap;
        font-size: 18px;
      }

      .timer {
        flex: 0 0 auto;
        min-width: 142px;
        text-align: center;
        padding: 8px 15px;
        border-radius: 12px;
        background: #edf3fb;
        border: 1px solid
          #c8d8ee;
      }

      .timer span {
        display: block;
        font-size: 11px;
        color: #59687a;
      }

      .timer strong {
        display: block;
        margin-top: 2px;
        font-size: 21px;
        letter-spacing: 0.05em;
      }

      .timerDanger {
        background: #fff0f0;
        border-color: #e2a6a6;
        color: #a12626;
      }

      .progressTrack {
        height: 4px;
        background: #dfe4eb;
      }

      .progressFill {
        height: 100%;
        background: #2458a6;
        transition:
          width 0.25s ease;
      }

      .testLayout {
        width: min(
          96%,
          1380px
        );
        margin: 24px auto;
        display: grid;
        grid-template-columns:
          310px
          minmax(0, 1fr);
        gap: 24px;
        align-items: start;
      }

      .navigatorCard {
        position: sticky;
        top: 104px;
        background: white;
        border: 1px solid
          #d9e0e9;
        border-radius: 17px;
        padding: 18px;
        box-shadow:
          0 6px 18px
          rgba(
            25,
            38,
            61,
            0.06
          );
      }

      .navTop {
        display: grid;
        grid-template-columns:
          1fr 1fr;
        gap: 10px;
        margin-bottom: 16px;
      }

      .navTop > div {
        padding: 11px;
        border-radius: 10px;
        background: #f4f6f8;
      }

      .navTop span {
        display: block;
        color: #6a7484;
        font-size: 11px;
      }

      .navTop strong {
        display: block;
        margin-top: 4px;
        font-size: 18px;
      }

      .questionNavigator {
        display: grid;
        grid-template-columns:
          repeat(
            5,
            minmax(0, 1fr)
          );
        gap: 8px;
      }

      .navNumber {
        aspect-ratio: 1;
        min-width: 0;
        border-radius: 9px;
        border: 1px solid
          #ccd4de;
        background: white;
        color: #374357;
        cursor: pointer;
        font-weight: 700;
      }

      .navNumber.answered {
        background: #e4efe7;
        border-color: #93b59a;
        color: #285b34;
      }

      .navNumber.active {
        background: #2458a6;
        border-color: #2458a6;
        color: white;
        box-shadow:
          0 0 0 3px
          rgba(
            36,
            88,
            166,
            0.14
          );
      }

      .legend {
        display: grid;
        gap: 8px;
        margin-top: 18px;
        padding-top: 14px;
        border-top: 1px solid
          #e1e5eb;
        font-size: 12px;
        color: #697386;
      }

      .legend > div {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .legendBox {
        width: 16px;
        height: 16px;
        border-radius: 4px;
        border: 1px solid
          #ccd4de;
        background: white;
      }

      .legendBox.current {
        background: #2458a6;
        border-color: #2458a6;
      }

      .legendBox.answeredLegend {
        background: #e4efe7;
        border-color: #93b59a;
      }

      .questionArea {
        min-width: 0;
      }

      .questionCard {
        background: white;
        border: 1px solid
          #d9e0e8;
        border-radius: 19px;
        padding: 28px;
        box-shadow:
          0 7px 22px
          rgba(
            25,
            37,
            57,
            0.06
          );
      }

      .questionMeta {
        display: flex;
        align-items: center;
        justify-content:
          space-between;
        gap: 14px;
        padding-bottom: 18px;
        border-bottom: 1px
          solid #e4e8ed;
      }

      .questionNumber {
        display: inline-block;
        font-size: 17px;
        font-weight: 900;
        margin-right: 10px;
      }

      .questionType {
        display: inline-block;
        padding: 5px 9px;
        border-radius: 999px;
        background: #eef2f7;
        color: #5a6576;
        font-size: 11px;
        font-weight: 700;
      }

      .points {
        flex: 0 0 auto;
        color: #5e6979;
        font-size: 13px;
        font-weight: 700;
      }

      .questionText {
        margin-top: 26px;
        font-size: clamp(
          18px,
          2.3vw,
          23px
        );
        line-height: 1.65;
        font-weight: 700;
        overflow-wrap:
          anywhere;
      }

      .htmlContent img {
        max-width: 100%;
        height: auto;
      }

      .htmlContent table {
        max-width: 100%;
        border-collapse:
          collapse;
      }

      .options {
        display: grid;
        gap: 12px;
        margin-top: 28px;
      }

      .option {
        display: flex;
        align-items: center;
        gap: 13px;
        min-height: 60px;
        padding: 14px 16px;
        border: 1px solid
          #d5dce6;
        border-radius: 13px;
        background: #fff;
        cursor: pointer;
        transition:
          border-color 0.15s,
          background 0.15s;
      }

      .option input {
        position: absolute;
        opacity: 0;
        pointer-events: none;
      }

      .option.selected {
        background: #eef4fc;
        border-color: #5e88c4;
        box-shadow:
          inset 0 0 0 1px
          #5e88c4;
      }

      .optionKey {
        flex: 0 0 36px;
        height: 36px;
        display: grid;
        place-items: center;
        border-radius: 9px;
        background: #edf0f4;
        font-weight: 900;
      }

      .option.selected
        .optionKey {
        background: #2458a6;
        color: white;
      }

      .optionText {
        min-width: 0;
        font-size: 16px;
        line-height: 1.5;
      }

      .openAnswer {
        margin-top: 28px;
      }

      .openAnswer label {
        display: block;
        margin-bottom: 9px;
        font-weight: 800;
      }

      .openAnswer textarea {
        width: 100%;
        resize: vertical;
        min-height: 135px;
        padding: 14px;
        border-radius: 12px;
        border: 1px solid
          #cbd4df;
        background: #fff;
        color: #182235;
        outline: none;
        font-size: 16px;
        line-height: 1.6;
      }

      .openAnswer textarea:focus {
        border-color: #527fbd;
        box-shadow:
          0 0 0 3px
          rgba(
            36,
            88,
            166,
            0.12
          );
      }

      .answerHint {
        display: block;
        margin-top: 7px;
        color: #737d8d;
        font-size: 12px;
      }

      .questionActions {
        display: grid;
        grid-template-columns:
          1fr auto 1fr;
        align-items: center;
        gap: 14px;
        margin-top: 34px;
        padding-top: 20px;
        border-top: 1px solid
          #e5e9ee;
      }

      .questionActions
        > button:last-child {
        justify-self: end;
      }

      .positionText {
        color: #667284;
        font-size: 13px;
        font-weight: 800;
      }

      .bottomFinish {
        display: flex;
        justify-content:
          flex-end;
        margin-top: 16px;
      }

      .errorMessage,
      .successMessage,
      .warningMessage {
        margin-bottom: 16px;
        padding: 13px 15px;
        border-radius: 10px;
        line-height: 1.5;
      }

      .errorMessage {
        background: #fff0f0;
        border: 1px solid
          #e5b5b5;
        color: #922d2d;
      }

      .successMessage {
        background: #edf7ef;
        border: 1px solid
          #b9d7be;
        color: #30613a;
      }

      .warningMessage {
        background: #fff8e5;
        border: 1px solid
          #e5cf91;
        color: #765d1b;
      }

      .modalOverlay {
        position: fixed;
        inset: 0;
        z-index: 100;
        background:
          rgba(
            13,
            21,
            34,
            0.56
          );
        display: grid;
        place-items: center;
        padding: 20px;
      }

      .confirmModal {
        width: min(
          100%,
          480px
        );
        background: white;
        border-radius: 18px;
        padding: 26px;
        box-shadow:
          0 24px 60px
          rgba(
            0,
            0,
            0,
            0.24
          );
      }

      .confirmModal h2 {
        margin: 0 0 18px;
      }

      .confirmModal p {
        margin: 8px 0;
      }

      .modalActions {
        display: flex;
        justify-content:
          flex-end;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 22px;
      }

      .resultTop {
        display: flex;
        justify-content:
          space-between;
        align-items: center;
        gap: 24px;
      }

      .resultTop p {
        color: #667285;
      }

      .percentCircle {
        flex: 0 0 150px;
        width: 150px;
        height: 150px;
        display: grid;
        place-content: center;
        text-align: center;
        border-radius: 50%;
        background: #eef3fa;
        border: 10px solid
          #d7e2f1;
      }

      .percentCircle strong {
        font-size: 27px;
      }

      .percentCircle span {
        margin-top: 4px;
        color: #687487;
        font-size: 12px;
      }

      .resultStat.correct {
        background: #edf7ef;
      }

      .resultStat.wrong {
        background: #fff0f0;
      }

      .resultStat.empty {
        background: #f1f2f4;
      }

      .resultQuestionGrid {
        display: grid;
        grid-template-columns:
          repeat(
            9,
            minmax(0, 1fr)
          );
        gap: 8px;
        margin-top: 28px;
      }

      .resultQuestion {
        aspect-ratio: 1;
        display: grid;
        place-items: center;
        border-radius: 8px;
        border: 1px solid
          #cfd6df;
        font-weight: 800;
      }

      .resultQuestion.right {
        background: #e4f2e7;
        color: #245b30;
        border-color: #98bfa0;
      }

      .resultQuestion.incorrect {
        background: #fbe8e8;
        color: #8e2929;
        border-color: #dca2a2;
      }

      .resultQuestion.unanswered {
        background: #f2f3f5;
        color: #68717f;
      }

      @media (
        max-width: 900px
      ) {
        .testLayout {
          grid-template-columns:
            1fr;
        }

        .navigatorCard {
          position: static;
        }

        .questionNavigator {
          grid-template-columns:
            repeat(
              9,
              minmax(
                34px,
                1fr
              )
            );
        }

        .resultQuestionGrid {
          grid-template-columns:
            repeat(
              7,
              minmax(0, 1fr)
            );
        }
      }

      @media (
        max-width: 680px
      ) {
        .startWrapper,
        .resultWrapper {
          padding: 18px 0;
        }

        .startCard,
        .resultCard,
        .questionCard {
          padding: 18px;
          border-radius: 15px;
        }

        .startStats,
        .resultStats {
          grid-template-columns:
            1fr 1fr;
        }

        .headerInner {
          min-height: 68px;
          gap: 8px;
        }

        .headerTitle strong {
          font-size: 14px;
        }

        .timer {
          min-width: 112px;
          padding: 7px 9px;
        }

        .timer strong {
          font-size: 17px;
        }

        .testLayout {
          width: 94%;
          margin-top: 14px;
          gap: 14px;
        }

        .questionNavigator {
          grid-template-columns:
            repeat(
              7,
              minmax(
                34px,
                1fr
              )
            );
        }

        .questionMeta {
          align-items:
            flex-start;
        }

        .questionNumber,
        .questionType {
          display: block;
        }

        .questionType {
          width: fit-content;
          margin-top: 6px;
        }

        .questionActions {
          grid-template-columns:
            1fr 1fr;
        }

        .positionText {
          grid-column:
            1 / -1;
          grid-row: 1;
          text-align: center;
        }

        .questionActions
          > button:first-child {
          grid-column: 1;
        }

        .questionActions
          > button:last-child {
          grid-column: 2;
          justify-self:
            stretch;
        }

        .resultTop {
          align-items:
            flex-start;
          flex-direction:
            column;
        }

        .percentCircle {
          width: 120px;
          height: 120px;
          flex-basis: 120px;
        }

        .resultQuestionGrid {
          grid-template-columns:
            repeat(
              5,
              minmax(0, 1fr)
            );
        }
      }

      @media (
        max-width: 420px
      ) {
        .questionNavigator {
          grid-template-columns:
            repeat(
              5,
              minmax(
                38px,
                1fr
              )
            );
        }

        .startStats,
        .resultStats {
          grid-template-columns:
            1fr 1fr;
        }
      }
    `}</style>
  );
}
