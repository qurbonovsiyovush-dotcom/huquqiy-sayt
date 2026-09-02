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

            <div className="resultActions">
              <button
                type="button"
                className="resultBackButton"
                onClick={() => {
                  window.location.href =
                    "/national-certificate";
                }}
              >
                ← Testlar ro‘yxatiga
              </button>

              <button
                type="button"
                className="resultHomeButton"
                onClick={() => {
                  window.location.href = "/";
                }}
              >
                Asosiy sahifa
              </button>
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
            <strong>Milliy sertifikat</strong>
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
                  className="stepButton"
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
                    className="stepButton"
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

          {currentIndex < test.questions.length - 1 && (
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
          )}
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

      html {
        scroll-behavior: smooth;
      }

      body {
        margin: 0;
        background: #e9eef3;
        color: #142033;
      }

      button,
      input,
      textarea {
        font: inherit;
      }

      button {
        -webkit-tap-highlight-color: transparent;
      }

      .ncPage {
        min-height: 100vh;
        background:
          radial-gradient(circle at 50% -160px, rgba(33, 124, 212, 0.14), transparent 480px),
          linear-gradient(180deg, #f7f9fb 0%, #e8edf2 100%);
      }

      .centerBox,
      .errorPage {
        width: min(92%, 620px);
        margin: 0 auto;
        padding: 110px 24px;
        text-align: center;
      }

      .centerBox,
      .errorPage,
      .startCard,
      .resultCard,
      .navigatorCard,
      .questionCard,
      .confirmModal {
        border: 2px solid #4e5961;
        background:
          linear-gradient(
            180deg,
            #ffffff 0%,
            #f3f5f6 56%,
            #d8dde1 100%
          );
        box-shadow:
          inset 0 2px 0 rgba(255, 255, 255, 0.98),
          inset 0 -6px 0 rgba(55, 64, 71, 0.13),
          0 7px 0 #59636a,
          0 13px 24px rgba(18, 30, 42, 0.18);
      }

      .loader {
        width: 46px;
        height: 50px;
        margin: 0 auto 20px;
        border-radius: 50%;
        border: 5px solid #cbd3da;
        border-top-color: #0c67c4;
        animation: ncSpin 0.8s linear infinite;
      }

      @keyframes ncSpin {
        to {
          transform: rotate(360deg);
        }
      }

      .errorPage {
        margin-top: 50px;
        padding: 42px 30px;
        border-radius: 22px;
      }

      .errorIcon {
        display: grid;
        place-items: center;
        width: 66px;
        height: 66px;
        margin: 0 auto 20px;
        border: 2px solid #8b3030;
        border-radius: 50%;
        background: linear-gradient(180deg, #fff3f3, #e5baba);
        color: #8d2020;
        font-size: 32px;
        font-weight: 900;
        font-size: 14px;
        box-shadow:
          inset 0 2px 0 #fff,
          0 5px 0 #8d4c4c,
          0 9px 14px rgba(90, 20, 20, 0.18);
      }

      .startWrapper {
        width: min(94%, 940px);
        margin: 0 auto;
        padding: 48px 0 70px;
      }

      .resultWrapper {
        width: min(96%, 1120px);
        margin: 0 auto;
        padding: 46px 0 72px;
      }

      .startCard {
        border-radius: 24px;
        padding: 34px;
      }

      .resultCard {
        border-radius: 24px;
        padding: 30px 32px 34px;
      }

      .eyebrow {
        display: flex;
        align-items: center;
        justify-content: center;
        width: max-content;
        min-height: 38px;
        margin-bottom: 14px;
        padding: 8px 16px;
        border: 2px solid #4d565c;
        border-radius: 10px;
        background:
          linear-gradient(
            180deg,
            #ffffff 0%,
            #eceeef 50%,
            #c7ccd0 100%
          );
        color: #172333;
        font-size: 13px;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        box-shadow:
          inset 0 2px 0 rgba(255, 255, 255, 0.98),
          inset 0 -4px 0 rgba(66, 74, 80, 0.16),
          0 4px 0 #59636a,
          0 7px 11px rgba(0, 0, 0, 0.14);
      }

      .startCard h1,
      .resultCard h1 {
        margin: 5px 0 0;
        font-size: clamp(25px, 4vw, 38px);
        line-height: 1.18;
        color: #152235;
        text-shadow: 0 1px 0 #fff;
      }

      .description {
        margin: 14px 0 0;
        color: #536070;
        line-height: 1.7;
      }

      .startStats {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 14px;
        margin-top: 30px;
      }

      .resultStats {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 16px;
        margin-top: 30px;
      }

      .startStats > div,
      .resultStat {
        min-width: 0;
        padding: 18px;
        border: 2px solid #59636a;
        border-radius: 14px;
        background:
          linear-gradient(
            180deg,
            #ffffff 0%,
            #edf0f2 58%,
            #ccd2d6 100%
          );
        box-shadow:
          inset 0 2px 0 #fff,
          inset 0 -5px 0 rgba(53, 62, 68, 0.13),
          0 5px 0 #69737a,
          0 9px 13px rgba(0, 0, 0, 0.13);
      }

      .startStats span,
      .resultStat span {
        display: block;
        margin-bottom: 6px;
        color: #5d6876;
        font-size: 13px;
        font-weight: 700;
      }

      .startStats strong,
      .resultStat strong {
        font-size: 21px;
        color: #142235;
      }

      .resultStat.correct {
        background: linear-gradient(180deg, #f9fff9, #d9eadc);
      }

      .resultStat.wrong {
        background: linear-gradient(180deg, #fffafa, #efdada);
      }

      .resultStat.empty {
        background: linear-gradient(180deg, #ffffff, #e5e8eb);
      }

      .resultStat {
        min-height: 86px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 17px 18px 19px;
      }

      .resultStat span {
        margin-bottom: 7px;
        font-size: 13px;
        font-weight: 900;
      }

      .resultStat strong {
        font-size: 24px;
        line-height: 1.05;
      }


      .instructions {
        margin-top: 28px;
        padding: 20px;
        border: 2px solid #59636a;
        border-radius: 15px;
        background: linear-gradient(180deg, #fafbfc, #dfe4e8);
        box-shadow:
          inset 0 2px 0 #fff,
          inset 0 -4px 0 rgba(54, 64, 71, 0.1),
          0 5px 0 #6a747b,
          0 9px 14px rgba(0, 0, 0, 0.11);
      }

      .instructions h3 {
        margin: 0 0 10px;
        color: #152235;
      }

      .instructions p {
        margin: 8px 0;
        line-height: 1.6;
        color: #465464;
      }

      .nameField {
        margin-top: 27px;
      }

      .nameField label,
      .openAnswer label {
        display: block;
        margin-bottom: 9px;
        color: #263448;
        font-size: 14px;
        font-weight: 900;
      }

      .nameField input,
      .openAnswer textarea {
        width: 100%;
        border: 2px solid #68737b;
        background: linear-gradient(180deg, #e7ebee 0%, #ffffff 18%, #ffffff 100%);
        color: #172033;
        outline: none;
        box-shadow:
          inset 0 4px 9px rgba(30, 42, 54, 0.16),
          inset 0 -1px 0 #fff;
        transition:
          border-color 0.15s ease,
          box-shadow 0.15s ease;
      }

      .nameField input {
        height: 54px;
        padding: 0 16px;
        border-radius: 11px;
        font-size: 16px;
      }

      .nameField input:focus,
      .openAnswer textarea:focus {
        border-color: #176bc5;
        box-shadow:
          inset 0 4px 8px rgba(30, 42, 54, 0.12),
          0 0 0 3px rgba(23, 107, 197, 0.16);
      }

      .nameField input::placeholder,
      .openAnswer textarea::placeholder {
        color: #8a95a1;
      }

      .nameField input:disabled,
      .openAnswer textarea:disabled {
        background: #e5e8eb;
      }

      .nameField span,
      .answerHint {
        display: block;
        margin-top: 8px;
        color: #687482;
        font-size: 12px;
        line-height: 1.5;
      }

      .startButton,
      .primaryButton,
      .secondaryButton,
      .stepButton,
      .finishButton,
      .finishOutlineButton {
        min-height: 47px;
        padding: 11px 21px;
        border: 2px solid #3d4850;
        border-radius: 11px;
        cursor: pointer;
        font-weight: 900;
        transition:
          transform 0.12s ease,
          filter 0.12s ease,
          box-shadow 0.12s ease;
      }

      .startButton,
      .primaryButton {
        background:
          linear-gradient(
            180deg,
            #4ba0f0 0%,
            #1a79d3 45%,
            #0758ac 100%
          );
        color: #fff;
        border-color: #064887;
        box-shadow:
          inset 0 2px 0 rgba(255, 255, 255, 0.45),
          inset 0 -5px 0 rgba(0, 45, 96, 0.22),
          0 6px 0 #063f78,
          0 10px 14px rgba(0, 52, 105, 0.23);
      }

      .startButton {
        width: 100%;
        min-height: 56px;
        margin-top: 27px;
        font-size: 16px;
      }

      .secondaryButton,
      .finishOutlineButton {
        background:
          linear-gradient(
            180deg,
            #ffffff 0%,
            #eceeef 50%,
            #c8cdd1 100%
          );
        color: #263448;
        box-shadow:
          inset 0 2px 0 #fff,
          inset 0 -4px 0 rgba(55, 63, 69, 0.14),
          0 5px 0 #687279,
          0 8px 12px rgba(0, 0, 0, 0.14);
      }

      .stepButton {
        min-width: 190px;
        min-height: 52px;
        border-color: #064887;
        background:
          linear-gradient(
            180deg,
            #4ba0f0 0%,
            #1a79d3 46%,
            #0758ac 100%
          );
        color: #fff;
        font-size: 15px;
        letter-spacing: 0.01em;
        box-shadow:
          inset 0 2px 0 rgba(255, 255, 255, 0.46),
          inset 0 -5px 0 rgba(0, 45, 96, 0.22),
          0 6px 0 #063f78,
          0 10px 14px rgba(0, 52, 105, 0.22);
      }

      .finishButton {
        background:
          linear-gradient(
            180deg,
            #e36b6b 0%,
            #bd4141 46%,
            #922727 100%
          );
        color: #fff;
        border-color: #762020;
        box-shadow:
          inset 0 2px 0 rgba(255, 255, 255, 0.35),
          inset 0 -5px 0 rgba(83, 0, 0, 0.2),
          0 6px 0 #721f1f,
          0 10px 14px rgba(95, 17, 17, 0.2);
      }

      .finishOutlineButton {
        color: #842626;
        border-color: #814545;
      }

      button:disabled {
        opacity: 0.48;
        cursor: not-allowed;
        box-shadow: none !important;
      }

      @media (hover: hover) {
        .startButton:not(:disabled):hover,
        .primaryButton:not(:disabled):hover,
        .secondaryButton:not(:disabled):hover,
        .stepButton:not(:disabled):hover,
        .finishButton:not(:disabled):hover,
        .finishOutlineButton:not(:disabled):hover,
        .navNumber:not(:disabled):hover,
        .option:hover {
          filter: brightness(1.045);
          transform: translateY(-1px);
        }
      }

      .startButton:not(:disabled):active,
      .primaryButton:not(:disabled):active,
      .secondaryButton:not(:disabled):active,
      .stepButton:not(:disabled):active,
      .finishButton:not(:disabled):active,
      .finishOutlineButton:not(:disabled):active,
      .navNumber:not(:disabled):active {
        transform: translateY(4px);
        box-shadow:
          inset 0 2px 6px rgba(0, 0, 0, 0.15),
          0 2px 0 #4d575e;
      }

      /* ===== TEST HEADER ===== */

      .testHeader {
        position: sticky;
        top: 0;
        z-index: 30;
        padding: 13px 0 16px;
        background:
          linear-gradient(
            180deg,
            #2c8be4 0%,
            #176fc7 52%,
            #0753a2 100%
          );
        border-bottom: 2px solid #063e79;
        box-shadow:
          inset 0 2px 0 rgba(255, 255, 255, 0.28),
          inset 0 -5px 0 rgba(0, 42, 90, 0.22),
          0 7px 0 #064582,
          0 12px 18px rgba(0, 44, 90, 0.2);
      }

      .headerInner {
        width: min(98.5%, 1640px);
        min-height: 78px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
      }

      .headerTitle {
        min-width: 0;
        padding: 14px 24px;
        border: 2px solid #4f5960;
        border-radius: 12px;
        background:
          linear-gradient(
            180deg,
            #ffffff 0%,
            #eceeef 52%,
            #c6ccd0 100%
          );
        box-shadow:
          inset 0 2px 0 #fff,
          inset 0 -5px 0 rgba(50, 59, 65, 0.15),
          0 5px 0 #59636a,
          0 9px 14px rgba(0, 0, 0, 0.18);
      }

      .headerTitle strong {
        display: block;
        color: #142235;
        font-size: 22px;
        font-weight: 900;
        letter-spacing: 0.02em;
        white-space: nowrap;
        text-shadow: 0 1px 0 #fff;
      }

      .timer {
        flex: 0 0 auto;
        min-width: 178px;
        padding: 10px 17px;
        text-align: center;
        border: 2px solid #4f5960;
        border-radius: 12px;
        background:
          linear-gradient(
            180deg,
            #ffffff 0%,
            #e8edf1 55%,
            #c4cbd1 100%
          );
        color: #172538;
        box-shadow:
          inset 0 2px 0 #fff,
          inset 0 -5px 0 rgba(52, 61, 67, 0.16),
          0 5px 0 #59636a,
          0 9px 13px rgba(0, 0, 0, 0.18);
      }

      .timer span {
        display: block;
        font-size: 11px;
        color: #586574;
        font-weight: 800;
      }

      .timer strong {
        display: block;
        margin-top: 2px;
        font-size: 25px;
        letter-spacing: 0.05em;
      }

      .timerDanger {
        border-color: #742424;
        background: linear-gradient(180deg, #fff7f7, #efc9c9);
        color: #941f1f;
        box-shadow:
          inset 0 2px 0 #fff,
          0 5px 0 #792727,
          0 9px 13px rgba(100, 20, 20, 0.2);
      }

      .progressTrack {
        height: 10px;
        background: #aeb7bf;
        border-bottom: 1px solid #77828b;
        box-shadow: inset 0 3px 5px rgba(0, 0, 0, 0.2);
      }

      .progressFill {
        height: 100%;
        background:
          linear-gradient(
            180deg,
            #6dbaff 0%,
            #1478d4 65%,
            #0754a5 100%
          );
        box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.42);
        transition: width 0.25s ease;
      }

      /* ===== LAYOUT ===== */

      .testLayout {
        width: min(98.5%, 1640px);
        margin: 30px auto 52px;
        display: grid;
        grid-template-columns: 290px minmax(0, 1fr);
        gap: 26px;
        align-items: start;
      }

      .navigatorCard {
        position: sticky;
        top: 118px;
        padding: 17px;
        border-radius: 18px;
      }

      .navTop {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 11px;
        margin-bottom: 18px;
      }

      .navTop > div {
        padding: 12px;
        border: 2px solid #626d75;
        border-radius: 11px;
        background:
          linear-gradient(
            180deg,
            #ffffff 0%,
            #e8ebed 60%,
            #cdd3d7 100%
          );
        box-shadow:
          inset 0 2px 0 #fff,
          inset 0 -4px 0 rgba(50, 58, 64, 0.12),
          0 4px 0 #727c83,
          0 7px 10px rgba(0, 0, 0, 0.12);
      }

      .navTop span {
        display: block;
        color: #606c79;
        font-size: 11px;
        font-weight: 700;
      }

      .navTop strong {
        display: block;
        margin-top: 4px;
        font-size: 18px;
      }

      .questionNavigator {
        display: grid;
        grid-template-columns: repeat(5, minmax(40px, 1fr));
        gap: 10px;
      }

      .navNumber {
        aspect-ratio: 1;
        min-width: 40px;
        min-height: 40px;
        border: 2px solid #657078;
        border-radius: 9px;
        background:
          linear-gradient(
            180deg,
            #ffffff 0%,
            #e6e9eb 56%,
            #c7cdd1 100%
          );
        color: #334052;
        cursor: pointer;
        font-weight: 900;
        box-shadow:
          inset 0 2px 0 #fff,
          inset 0 -4px 0 rgba(50, 58, 64, 0.13),
          0 4px 0 #707a81,
          0 7px 10px rgba(0, 0, 0, 0.12);
        transition: 0.12s ease;
      }

      .navNumber.answered {
        border-color: #477151;
        background:
          linear-gradient(
            180deg,
            #f7fff8 0%,
            #d6e9d9 60%,
            #bcd9c1 100%
          );
        color: #24552f;
        box-shadow:
          inset 0 2px 0 #fff,
          0 4px 0 #5d8065,
          0 7px 10px rgba(45, 95, 55, 0.12);
      }

      .navNumber.active {
        border-color: #064886;
        background:
          linear-gradient(
            180deg,
            #4ba0ef 0%,
            #1775cf 52%,
            #0754a7 100%
          );
        color: #fff;
        box-shadow:
          inset 0 2px 0 rgba(255, 255, 255, 0.4),
          inset 0 -4px 0 rgba(0, 42, 89, 0.2),
          0 4px 0 #06417a,
          0 8px 12px rgba(9, 75, 138, 0.2),
          0 0 0 3px rgba(26, 108, 193, 0.15);
      }

      .legend {
        display: grid;
        gap: 10px;
        margin-top: 20px;
        padding-top: 16px;
        border-top: 2px groove #d3d8dc;
        color: #5e6977;
        font-size: 12px;
      }

      .legend > div {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .legendBox {
        width: 17px;
        height: 17px;
        border: 2px solid #69747b;
        border-radius: 4px;
        background: linear-gradient(180deg, #fff, #d9dde0);
        box-shadow:
          inset 0 1px 0 #fff,
          0 2px 0 #798289;
      }

      .legendBox.current {
        background: linear-gradient(180deg, #4297ec, #0754a7);
        border-color: #064886;
      }

      .legendBox.answeredLegend {
        background: linear-gradient(180deg, #f6fff7, #cfe5d3);
        border-color: #477151;
      }

      .questionArea {
        min-width: 0;
      }

      .questionArea {
        width: 100%;
      }

      .questionCard {
        width: 100%;
      }

      /* ===== QUESTION CARD ===== */

      .questionCard {
        padding: 32px;
        border-radius: 20px;
      }

      .questionMeta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        padding: 14px 16px;
        border: 2px solid #59646c;
        border-radius: 12px;
        background:
          linear-gradient(
            180deg,
            #ffffff 0%,
            #e5e9ec 58%,
            #cbd1d5 100%
          );
        box-shadow:
          inset 0 2px 0 #fff,
          inset 0 -4px 0 rgba(50, 58, 64, 0.12),
          0 5px 0 #6a747b,
          0 9px 13px rgba(0, 0, 0, 0.12);
      }

      .questionNumber {
        display: inline-block;
        margin-right: 10px;
        font-size: 19px;
        font-weight: 900;
      }

      .questionType,
      .points {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 29px;
        padding: 5px 10px;
        border: 1px solid #66717a;
        border-radius: 999px;
        background: linear-gradient(180deg, #fff, #d7dce0);
        color: #4e5a69;
        font-size: 11px;
        font-weight: 800;
        box-shadow:
          inset 0 1px 0 #fff,
          0 2px 0 #7c858c;
      }

      .points {
        flex: 0 0 auto;
        border-radius: 8px;
        font-size: 12px;
      }

      /* SAVOLNI ALOHIDA KUCHLI 3D PANEL */
      .questionText {
        position: relative;
        margin-top: 30px;
        padding: 34px 34px 36px;
        border: 3px solid #3e596a;
        border-radius: 16px;
        background:
          linear-gradient(
            180deg,
            #ffffff 0%,
            #edf5fb 48%,
            #d5e3ed 100%
          );
        color: #10233a;
        font-size: clamp(24px, 2.25vw, 31px);
        line-height: 1.65;
        font-weight: 900;
        overflow-wrap: anywhere;
        text-shadow: 0 1px 0 #fff;
        box-shadow:
          inset 0 3px 0 #fff,
          inset 0 -7px 0 rgba(57, 78, 91, 0.13),
          0 8px 0 #647783,
          0 14px 22px rgba(21, 45, 61, 0.19);
      }

      .htmlContent img {
        max-width: 100%;
        height: auto;
      }

      .htmlContent table {
        max-width: 100%;
        border-collapse: collapse;
      }

      /* ===== VARIANTLAR: KUCHLI 3D ===== */

      .options {
        display: grid;
        gap: 18px;
        margin-top: 32px;
      }

      .option {
        display: flex;
        align-items: center;
        gap: 15px;
        min-height: 82px;
        padding: 17px 20px;
        border: 3px solid #626e76;
        border-radius: 14px;
        background:
          linear-gradient(
            180deg,
            #ffffff 0%,
            #f1f3f4 52%,
            #d2d7db 100%
          );
        cursor: pointer;
        box-shadow:
          inset 0 3px 0 #fff,
          inset 0 -6px 0 rgba(53, 62, 68, 0.12),
          0 7px 0 #727c83,
          0 12px 18px rgba(0, 0, 0, 0.14);
        transition:
          transform 0.13s ease,
          filter 0.13s ease,
          border-color 0.13s ease,
          box-shadow 0.13s ease;
      }

      .option input {
        position: absolute;
        opacity: 0;
        pointer-events: none;
      }

      .option.selected {
        border-color: #07519a;
        background:
          linear-gradient(
            180deg,
            #f9fcff 0%,
            #d8eaff 50%,
            #b7d6f5 100%
          );
        box-shadow:
          inset 0 3px 0 #fff,
          inset 0 -6px 0 rgba(5, 73, 139, 0.14),
          0 7px 0 #1768b7,
          0 13px 20px rgba(12, 91, 166, 0.2),
          0 0 0 2px rgba(16, 111, 205, 0.12);
      }

      .optionKey {
        flex: 0 0 50px;
        height: 46px;
        display: grid;
        place-items: center;
        border: 2px solid #657078;
        border-radius: 10px;
        background:
          linear-gradient(
            180deg,
            #ffffff 0%,
            #e4e8eb 55%,
            #c5ccd1 100%
          );
        font-weight: 900;
        font-size: 18px;
        box-shadow:
          inset 0 2px 0 #fff,
          inset 0 -4px 0 rgba(50, 58, 64, 0.12),
          0 4px 0 #778188;
      }

      .option.selected .optionKey {
        border-color: #064886;
        background:
          linear-gradient(
            180deg,
            #4ba0ef 0%,
            #1775cf 52%,
            #0754a7 100%
          );
        color: #fff;
        box-shadow:
          inset 0 2px 0 rgba(255, 255, 255, 0.35),
          inset 0 -4px 0 rgba(0, 42, 89, 0.2),
          0 4px 0 #06417a;
      }

      .optionText {
        min-width: 0;
        color: #17263a;
        font-size: 20px;
        line-height: 1.6;
        font-weight: 700;
      }

      .openAnswer {
        margin-top: 32px;
        padding: 22px;
        border: 2px solid #626d75;
        border-radius: 14px;
        background:
          linear-gradient(
            180deg,
            #fafbfc 0%,
            #e1e6ea 100%
          );
        box-shadow:
          inset 0 2px 0 #fff,
          inset 0 -4px 0 rgba(50, 58, 64, 0.1),
          0 5px 0 #727c83,
          0 9px 14px rgba(0, 0, 0, 0.11);
      }

      .openAnswer textarea {
        min-height: 175px;
        padding: 15px;
        border-radius: 11px;
        resize: vertical;
        font-size: 16px;
        line-height: 1.6;
      }

      .questionActions {
        display: grid;
        grid-template-columns: minmax(190px, 1fr) auto minmax(190px, 1fr);
        align-items: center;
        gap: 14px;
        margin-top: 40px;
        padding-top: 24px;
        border-top: 2px groove #d9dde1;
      }

      .questionActions > button:first-child {
        justify-self: start;
      }

      .questionActions > button:last-child {
        justify-self: end;
      }

      .positionText {
        min-width: 82px;
        padding: 10px 14px;
        border: 2px solid #69747c;
        border-radius: 8px;
        background:
          linear-gradient(
            180deg,
            #ffffff 0%,
            #e4e7e9 58%,
            #ced3d7 100%
          );
        color: #4f5d6d;
        text-align: center;
        font-size: 13px;
        font-weight: 900;
        box-shadow:
          inset 0 2px 0 #fff,
          inset 0 -3px 0 rgba(50, 58, 64, 0.12),
          0 3px 0 #7b858c;
      }

      .bottomFinish {
        display: flex;
        justify-content: flex-end;
        margin-top: 28px;
      }

      .errorMessage,
      .successMessage,
      .warningMessage {
        margin-bottom: 18px;
        padding: 14px 16px;
        border: 2px solid;
        border-radius: 11px;
        line-height: 1.5;
        font-weight: 700;
        box-shadow:
          inset 0 2px 0 rgba(255, 255, 255, 0.8),
          0 4px 0 rgba(70, 78, 84, 0.4);
      }

      .errorMessage {
        background: linear-gradient(180deg, #fff7f7, #efd2d2);
        border-color: #a85a5a;
        color: #852828;
      }

      .successMessage {
        min-height: 52px;
        display: flex;
        align-items: center;
        background: linear-gradient(180deg, #f8fff9, #d6ead9);
        border-color: #65906e;
        color: #2e6039;
      }

      .warningMessage {
        background: linear-gradient(180deg, #fffdf4, #efe3b9);
        border-color: #9b8443;
        color: #725d20;
      }

      /* ===== NATIJA ===== */

      .resultTop {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 158px;
        align-items: center;
        gap: 28px;
        padding: 26px 28px 28px;
        border: 2px solid #064785;
        border-radius: 18px;
        background:
          linear-gradient(
            180deg,
            #338ee5 0%,
            #176fc5 52%,
            #0752a0 100%
          );
        color: #fff;
        box-shadow:
          inset 0 2px 0 rgba(255, 255, 255, 0.32),
          inset 0 -6px 0 rgba(0, 40, 85, 0.22),
          0 7px 0 #06437f,
          0 12px 19px rgba(0, 52, 105, 0.21);
      }

      .resultTop > div:first-child {
        min-width: 0;
      }

      .resultTop h1 {
        margin-top: 10px;
        color: #fff;
        font-size: clamp(27px, 3.2vw, 39px);
        line-height: 1.16;
        text-shadow: 0 2px 0 rgba(0, 0, 0, 0.18);
      }

      .resultTop p {
        margin: 8px 0 0;
        color: rgba(255, 255, 255, 0.95);
        font-size: 15px;
        font-weight: 800;
      }

      .resultTop .eyebrow {
        margin: 0;
        min-height: 34px;
        padding: 7px 13px;
        color: #172333;
        font-size: 12px;
      }

      .percentCircle {
        width: 152px;
        height: 152px;
        display: grid;
        place-items: center;
        align-content: center;
        justify-self: end;
        border: 3px solid #4c565d;
        border-radius: 50%;
        background:
          radial-gradient(circle at 50% 34%, #ffffff 0%, #f2f3f4 45%, #c6ccd1 100%);
        color: #152235;
        box-shadow:
          inset 0 4px 0 #fff,
          inset 0 -9px 0 rgba(50, 58, 64, 0.16),
          0 8px 0 #586269,
          0 14px 20px rgba(0, 0, 0, 0.2);
      }

      .percentCircle strong {
        font-size: 31px;
        line-height: 1;
      }

      .percentCircle span {
        margin-top: 6px;
        color: #66717d;
        font-size: 12px;
        font-weight: 900;
      }

      .resultQuestionGrid {
        display: grid;
        grid-template-columns: repeat(9, minmax(0, 1fr));
        gap: 10px;
        margin-top: 30px;
        padding: 18px;
        border: 2px solid #5b666d;
        border-radius: 16px;
        background:
          linear-gradient(
            180deg,
            #f9fafb 0%,
            #e4e8eb 100%
          );
        box-shadow:
          inset 0 2px 0 #fff,
          inset 0 -5px 0 rgba(53, 62, 68, 0.1),
          0 6px 0 #6b757c,
          0 10px 16px rgba(0, 0, 0, 0.12);
      }

      .resultQuestion {
        min-height: 54px;
        display: grid;
        place-items: center;
        border: 2px solid #587663;
        border-radius: 9px;
        background:
          linear-gradient(
            180deg,
            #fbfffc 0%,
            #e2f0e5 55%,
            #c8ddcd 100%
          );
        color: #385845;
        font-size: 14px;
        font-weight: 900;
        box-shadow:
          inset 0 2px 0 #ffffff,
          inset 0 -4px 0 rgba(48, 92, 59, 0.12),
          0 4px 0 #698273,
          0 7px 10px rgba(42, 84, 52, 0.13);
      }

      .resultQuestion.right {
        border-color: #467251;
        background:
          linear-gradient(
            180deg,
            #f8fff9 0%,
            #d8eadb 58%,
            #bfdcc5 100%
          );
        color: #24562f;
        box-shadow:
          inset 0 2px 0 #fff,
          0 4px 0 #5c8065,
          0 7px 10px rgba(38, 105, 54, 0.12);
      }

      .resultQuestion.incorrect {
        border-color: #934a4a;
        background:
          linear-gradient(
            180deg,
            #fff9f9 0%,
            #ecd0d0 58%,
            #dfb8b8 100%
          );
        color: #852929;
        box-shadow:
          inset 0 2px 0 #fff,
          0 4px 0 #9a5a5a,
          0 7px 10px rgba(125, 38, 38, 0.12);
      }

      .resultQuestion.unanswered {
        border-color: #667d6d;
        background:
          linear-gradient(
            180deg,
            #fcfffc 0%,
            #e5efe7 58%,
            #cedbd1 100%
          );
        color: #536b5b;
        box-shadow:
          inset 0 2px 0 #ffffff,
          inset 0 -4px 0 rgba(55, 91, 63, 0.10),
          0 4px 0 #75877a,
          0 7px 10px rgba(48, 76, 55, 0.12);
      }

      /* ===== MODAL ===== */

      .modalOverlay {
        position: fixed;
        inset: 0;
        z-index: 100;
        display: grid;
        place-items: center;
        padding: 20px;
        background: rgba(13, 24, 35, 0.58);
        backdrop-filter: blur(4px);
      }

      .confirmModal {
        width: min(100%, 480px);
        padding: 27px;
        border-radius: 18px;
      }

      .confirmModal h2 {
        margin: 0 0 18px;
      }

      .confirmModal p {
        margin: 8px 0;
      }

      .modalActions {
        display: flex;
        justify-content: flex-end;
        gap: 13px;
        margin-top: 24px;
      }

      /* ===== RESPONSIVE ===== */

      @media (max-width: 980px) {
        .testLayout {
          grid-template-columns: 1fr;
        }

        .navigatorCard {
          position: static;
        }

        .questionNavigator {
          grid-template-columns: repeat(9, minmax(0, 1fr));
        }
      }

      @media (max-width: 760px) {
        .startWrapper,
        .resultWrapper {
          width: min(94%, 760px);
          padding-top: 28px;
        }

        .startCard,
        .resultCard,
        .questionCard {
          padding: 20px;
        }

        .startStats,
        .resultStats {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .headerInner {
          align-items: stretch;
          gap: 10px;
        }

        .headerTitle {
          flex: 1 1 auto;
          min-width: 0;
          padding-left: 14px;
          padding-right: 14px;
        }

        .timer {
          min-width: 125px;
        }

        .testLayout {
          width: 94%;
          margin-top: 24px;
        }

        .questionNavigator {
          grid-template-columns: repeat(7, minmax(0, 1fr));
        }

        .questionMeta {
          align-items: flex-start;
        }

        .questionActions {
          grid-template-columns: 1fr 1fr;
        }

        .positionText {
          grid-column: 1 / -1;
          grid-row: 1;
          justify-self: center;
        }

        .questionActions > button:first-child {
          grid-column: 1;
          grid-row: 2;
        }

        .questionActions > button:last-child {
          grid-column: 2;
          grid-row: 2;
        }

        .resultTop {
          grid-template-columns: minmax(0, 1fr) 120px;
          align-items: center;
          gap: 18px;
          padding: 22px;
        }

        .percentCircle {
          width: 118px;
          height: 118px;
        }

        .percentCircle strong {
          font-size: 24px;
        }

        .resultQuestionGrid {
          grid-template-columns: repeat(7, minmax(0, 1fr));
          padding: 14px;
        }
      }

      @media (max-width: 520px) {
        .testHeader {
          padding: 9px 0 12px;
        }

        .headerInner {
          width: 94%;
        }

        .headerTitle {
          padding: 9px 11px;
        }

        .headerTitle strong {
          font-size: 14px;
        }

        .timer {
          min-width: 108px;
          padding: 7px 9px;
        }

        .timer strong {
          font-size: 18px;
        }

        .startCard,
        .resultCard,
        .questionCard,
        .navigatorCard {
          border-radius: 15px;
        }

        .questionNavigator {
          grid-template-columns: repeat(5, minmax(48px, 1fr));
        }

        .questionMeta {
          display: grid;
        }

        .points {
          width: max-content;
        }

        .questionText {
          padding: 20px 16px 22px;
          font-size: 21px;
        }

        .option {
          padding: 13px;
          min-height: 62px;
        }

        .optionKey {
          flex-basis: 37px;
          height: 37px;
        }

        .questionActions {
          gap: 10px;
        }

        .questionActions button {
          width: 100%;
          padding-left: 10px;
          padding-right: 10px;
        }

        .stepButton {
          min-width: 0;
        }

        .bottomFinish .finishOutlineButton {
          width: 100%;
        }

        .resultTop {
          grid-template-columns: 1fr;
          text-align: center;
        }

        .resultTop .eyebrow {
          margin-left: auto;
          margin-right: auto;
        }

        .percentCircle {
          justify-self: center;
        }

        .resultQuestionGrid {
          grid-template-columns: repeat(5, minmax(48px, 1fr));
        }

        .modalActions {
          display: grid;
          grid-template-columns: 1fr;
        }

        .modalActions button {
          width: 100%;
        }
      }

      .resultActions {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 18px;
        margin-top: 28px;
      }

      .resultBackButton,
      .resultHomeButton {
        min-height: 58px;
        padding: 13px 22px;
        border-radius: 11px;
        cursor: pointer;
        font-family: inherit;
        font-size: 16px;
        font-weight: 900;
        transition: transform 0.12s ease, filter 0.12s ease;
      }

      .resultBackButton {
        border: 2px solid #07508d;
        background: linear-gradient(180deg, #4aa6f0 0%, #1d7ed4 48%, #075bad 100%);
        color: #ffffff;
        box-shadow:
          inset 0 2px 0 rgba(255,255,255,.45),
          inset 0 -5px 0 rgba(0,46,94,.22),
          0 6px 0 #064178,
          0 10px 15px rgba(0,53,101,.20);
      }

      .resultHomeButton {
        border: 2px solid #59656d;
        background: linear-gradient(180deg, #ffffff 0%, #eceff1 54%, #cbd1d5 100%);
        color: #152337;
        box-shadow:
          inset 0 2px 0 #ffffff,
          inset 0 -5px 0 rgba(50,60,68,.13),
          0 6px 0 #69737a,
          0 10px 15px rgba(0,0,0,.14);
      }

      .resultBackButton:hover,
      .resultHomeButton:hover {
        filter: brightness(1.05);
        transform: translateY(-1px);
      }

      .resultBackButton:active,
      .resultHomeButton:active {
        transform: translateY(4px);
      }

      @media (max-width: 620px) {
        .resultActions {
          grid-template-columns: 1fr;
          gap: 13px;
        }

        .resultBackButton,
        .resultHomeButton {
          width: 100%;
          min-height: 54px;
        }
      }

    `}</style>
  );
}

