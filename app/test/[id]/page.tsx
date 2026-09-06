"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type TestStatus = "draft" | "published";

type ShapeType =
  | "rectangle"
  | "roundedRectangle"
  | "circle"
  | "ellipse"
  | "venn"
  | "text"
  | "image";

type TestShape = {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  textAlign?: "left" | "center" | "right";
  textDecoration?: "none" | "underline";
  textTransform?: "none" | "uppercase" | "lowercase";
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
  imageSrc?: string;
  objectFit?: "contain" | "cover" | "fill";
  zIndex?: number;
};

type TestOption = {
  id: string;
  text?: string;
  optionText?: string;
  html?: string;
  isCorrect?: boolean;
  correct?: boolean;
};

type TestQuestion = {
  id: string;
  question?: string;
  text?: string;
  questionText?: string;
  questionHtml?: string;
  options?: TestOption[];
  shapes?: TestShape[];
  points?: number;
};

type TestData = {
  id: string;
  title: string;
  subject: string;
  duration: number;
  description?: string;
  status: TestStatus;
  questions: TestQuestion[];
};

type Answers = Record<string, string>;

export default function TestSolvePage() {
  const router = useRouter();
  const params = useParams();

  const testId = Array.isArray(params?.id)
    ? params.id[0]
    : String(params?.id || "");

  const [test, setTest] = useState<TestData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);

  const [answers, setAnswers] = useState<Answers>({});

  const [remainingSeconds, setRemainingSeconds] =
    useState(0);

  const [showReview, setShowReview] = useState(false);

  const finishLock = useRef(false);
  const resultSavedRef = useRef(false);

  /* =====================================================
     JSON
  ===================================================== */

  async function readJson(response: Response) {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  /* =====================================================
     TESTNI YUKLASH
  ===================================================== */

  useEffect(() => {
    if (!testId) {
      setError("Test ID topilmadi.");
      setLoading(false);
      return;
    }

    loadTest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  async function loadTest() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/tests/${encodeURIComponent(testId)}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(
          data?.message || "Testni yuklab bo‘lmadi."
        );
      }

      /*
        API quyidagilardan birini qaytarsa ham ishlaydi:

        { success: true, test: {...} }

        yoki:

        {...test}
      */

      const receivedTest =
        data?.test && typeof data.test === "object"
          ? data.test
          : data;

      if (!receivedTest?.id) {
        throw new Error("Test topilmadi.");
      }

      /*
        Oddiy foydalanuvchi draft testni ishlamasligi kerak.
      */

      if (receivedTest.status !== "published") {
        throw new Error(
          "Bu test hali foydalanuvchilar uchun e’lon qilinmagan."
        );
      }

      const normalizedTest: TestData = {
        id: String(receivedTest.id),

        title:
          String(receivedTest.title || "").trim() ||
          "Nomsiz test",

        subject:
          String(receivedTest.subject || "").trim() ||
          "Fan ko‘rsatilmagan",

        duration:
          Number(receivedTest.duration) > 0
            ? Number(receivedTest.duration)
            : 30,

        description: String(
          receivedTest.description || ""
        ),

        status: receivedTest.status,

        questions: Array.isArray(receivedTest.questions)
          ? receivedTest.questions
          : [],
      };

      if (normalizedTest.questions.length === 0) {
        throw new Error(
          "Ushbu testda hozircha savollar mavjud emas."
        );
      }

      setTest(normalizedTest);

      setRemainingSeconds(
        normalizedTest.duration * 60
      );
    } catch (err) {
      console.error("TEST LOAD ERROR:", err);

      setTest(null);

      setError(
        err instanceof Error
          ? err.message
          : "Testni yuklashda xatolik yuz berdi."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =====================================================
     SAVOL MATNI
  ===================================================== */

  function cleanPunctuation(value: string) {
    return String(value || "").replace(/\s+\?/g, "?");
  }

  function getQuestionText(question: TestQuestion) {
    return cleanPunctuation(
      question.questionHtml ||
      question.questionText ||
      question.question ||
      question.text ||
      ""
    );
  }

  function getOptionText(option: TestOption) {
    return cleanPunctuation(
      option.text ||
      option.optionText ||
      option.html ||
      ""
    );
  }

  function optionIsCorrect(option: TestOption) {
    return (
      option.isCorrect === true ||
      option.correct === true
    );
  }

  /* =====================================================
     TESTNI BOSHLASH
  ===================================================== */

  function startTest() {
    if (!test) {
      return;
    }

    finishLock.current = false;
    resultSavedRef.current = false;

    setAnswers({});
    setCurrentIndex(0);
    setFinished(false);
    setShowReview(false);

    setRemainingSeconds(
      Math.max(1, Number(test.duration)) * 60
    );

    setStarted(true);
  }

  /* =====================================================
     TESTNI YAKUNLASH
  ===================================================== */

  function finishTest(auto = false) {
    if (!test || finishLock.current) {
      return;
    }

    if (!auto) {
      const unanswered = test.questions.filter(
        (question) => !answers[question.id]
      ).length;

      const message =
        unanswered > 0
          ? `Siz ${unanswered} ta savolga javob bermadingiz.\n\nTestni yakunlaysizmi?`
          : "Testni yakunlaysizmi?";

      if (!window.confirm(message)) {
        return;
      }
    }

    finishLock.current = true;

    setFinished(true);
    setStarted(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /* =====================================================
     TIMER
  ===================================================== */

  useEffect(() => {
    if (!started || finished || !test) {
      return;
    }

    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timer);

          window.setTimeout(() => {
            finishTest(true);
          }, 0);

          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, finished, test]);

  /* =====================================================
     VARIANT TANLASH
  ===================================================== */

  function selectAnswer(
    questionId: string,
    optionId: string
  ) {
    if (finished) {
      return;
    }

    setAnswers((current) => ({
      ...current,
      [questionId]: optionId,
    }));
  }

  /* =====================================================
     NATIJA
  ===================================================== */

  const result = useMemo(() => {
    if (!test) {
      return {
        total: 0,
        correct: 0,
        incorrect: 0,
        unanswered: 0,
        percentage: 0,
        earnedPoints: 0,
        totalPoints: 0,
      };
    }

    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;

    let earnedPoints = 0;
    let totalPoints = 0;

    for (const question of test.questions) {
      const points =
        Number(question.points) > 0
          ? Number(question.points)
          : 1;

      totalPoints += points;

      const selectedOptionId =
        answers[question.id];

      if (!selectedOptionId) {
        unanswered++;
        continue;
      }

      const selectedOption =
        question.options?.find(
          (option) =>
            String(option.id) ===
            String(selectedOptionId)
        );

      if (
        selectedOption &&
        optionIsCorrect(selectedOption)
      ) {
        correct++;
        earnedPoints += points;
      } else {
        incorrect++;
      }
    }

    const total = test.questions.length;

    const percentage =
      total > 0
        ? Math.round((correct / total) * 100)
        : 0;

    return {
      total,
      correct,
      incorrect,
      unanswered,
      percentage,
      earnedPoints,
      totalPoints,
    };
  }, [test, answers]);

  /* =====================================================
     NATIJANI SERVERGA SAQLASH
  ===================================================== */

  useEffect(() => {
    if (!finished || !test || resultSavedRef.current) {
      return;
    }

    resultSavedRef.current = true;

    const totalSeconds =
      Math.max(1, Number(test.duration)) * 60;

    const spentSeconds = Math.max(
      0,
      totalSeconds - Math.max(0, remainingSeconds)
    );

async function saveResult() {
  if (!test) return;
      try {
        const response = await fetch("/api/results", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            testId: test.id,
            testTitle: test.title,
            subject: test.subject,
            total: result.total,
            correct: result.correct,
            incorrect: result.incorrect,
            unanswered: result.unanswered,
            percentage: result.percentage,
            earnedPoints: result.earnedPoints,
            totalPoints: result.totalPoints,
            spentSeconds,
          }),
        });

        if (!response.ok) {
          resultSavedRef.current = false;
          console.error("RESULT SAVE ERROR");
        }
      } catch (error) {
        resultSavedRef.current = false;
        console.error("RESULT SAVE ERROR:", error);
      }
    }

    saveResult();
  }, [finished, test, result, remainingSeconds]);

  /* =====================================================
     VAQT FORMAT
  ===================================================== */

  function formatTime(seconds: number) {
    const safeSeconds = Math.max(
      0,
      Math.floor(seconds)
    );

    const minutes = Math.floor(
      safeSeconds / 60
    );

    const secs = safeSeconds % 60;

    return `${String(minutes).padStart(
      2,
      "0"
    )}:${String(secs).padStart(2, "0")}`;
  }

  /* =====================================================
     CURRENT QUESTION
  ===================================================== */

  const currentQuestion =
    test?.questions?.[currentIndex] || null;

  const answeredCount = test
    ? test.questions.filter(
        (question) => !!answers[question.id]
      ).length
    : 0;

  const progress = test
    ? Math.round(
        (answeredCount /
          Math.max(test.questions.length, 1)) *
          100
      )
    : 0;

  function renderQuestionShapes(question: TestQuestion) {
    const shapes = Array.isArray(question.shapes)
      ? question.shapes
      : [];

    if (shapes.length === 0) {
      return null;
    }

    const minX = Math.min(...shapes.map((shape) => Number(shape.x) || 0));
    const minY = Math.min(...shapes.map((shape) => Number(shape.y) || 0));
    const maxX = Math.max(
      ...shapes.map(
        (shape) =>
          (Number(shape.x) || 0) +
          Math.max(1, Number(shape.width) || 1)
      )
    );
    const maxY = Math.max(
      ...shapes.map(
        (shape) =>
          (Number(shape.y) || 0) +
          Math.max(1, Number(shape.height) || 1)
      )
    );

    /*
      Muhim: sahifada bo‘sh katta canvas yasamaymiz.
      Maydon faqat joylashtirilgan rasm/shakllarning real chegarasi
      qancha bo‘lsa, shuncha bo‘ladi.
    */
    const stageWidth = Math.max(1, Math.ceil(maxX - minX));
    const stageHeight = Math.max(1, Math.ceil(maxY - minY));

    return (
      <div className="shapeResultScroll">
        <div
          className="shapeResultStage"
          style={{
            width: `${stageWidth}px`,
            height: `${stageHeight}px`,
          }}
        >
          {shapes.map((shape) => {
            const width = Math.max(1, Number(shape.width) || 1);
            const height = Math.max(1, Number(shape.height) || 1);
            const left = (Number(shape.x) || 0) - minX;
            const top = (Number(shape.y) || 0) - minY;

            const commonStyle = {
              left,
              top,
              width,
              height,
              zIndex: shape.zIndex ?? 1,
              opacity: shape.opacity ?? 1,
            };

            if (shape.type === "image") {
              return (
                <div
                  key={shape.id}
                  className="resultShapeItem resultImageItem"
                  style={commonStyle}
                >
                  {shape.imageSrc ? (
                    <img
                      src={shape.imageSrc}
                      alt="Test rasmi"
                      draggable={false}
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "block",
                        objectFit: shape.objectFit ?? "contain",
                        borderStyle: "solid",
                        borderColor: shape.borderColor ?? "transparent",
                        borderWidth: `${shape.borderWidth ?? 0}px`,
                        borderRadius: `${shape.borderRadius ?? 0}px`,
                        boxSizing: "border-box",
                      }}
                    />
                  ) : null}
                </div>
              );
            }

            if (shape.type === "venn") {
              return (
                <div
                  key={shape.id}
                  className="resultShapeItem"
                  style={commonStyle}
                >
                  <div className="resultVenn">
                    <div
                      className="resultVennCircle resultVennOne"
                      style={{
                        background: shape.backgroundColor ?? "#8fc9ef",
                        borderColor: shape.borderColor ?? "#2f5975",
                      }}
                    >
                      A
                    </div>
                    <div
                      className="resultVennCircle resultVennTwo"
                      style={{
                        background: shape.backgroundColor ?? "#8fc9ef",
                        borderColor: shape.borderColor ?? "#2f5975",
                      }}
                    >
                      B
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={shape.id}
                className={`resultShapeItem resultShapeBody ${shape.type}`}
                style={{
                  ...commonStyle,
                  background:
                    shape.type === "text"
                      ? "transparent"
                      : shape.backgroundColor ?? "#8fc9ef",
                  borderColor: shape.borderColor ?? "#2f5975",
                  borderWidth: `${shape.borderWidth ?? 2}px`,
                  borderStyle: shape.type === "text" ? "none" : "solid",
                  borderRadius: `${shape.borderRadius ?? 4}px`,
                  color: shape.textColor ?? "#111111",
                  fontFamily: shape.fontFamily ?? "Bell MT",
                  fontSize: `${shape.fontSize ?? 20}px`,
                  fontWeight: shape.fontWeight ?? "normal",
                  fontStyle: shape.fontStyle ?? "normal",
                  textAlign: shape.textAlign ?? "center",
                  textDecoration: shape.textDecoration ?? "none",
                  textTransform: shape.textTransform ?? "none",
                }}
              >
                <span>{shape.text ?? ""}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <main className="statePage">
        <div className="stateBox">
          <div className="loader" />

          <h2>Test yuklanmoqda...</h2>
        </div>

        <style jsx>{stateStyles}</style>
      </main>
    );
  }

  /* =====================================================
     ERROR
  ===================================================== */

  if (error || !test) {
    return (
      <main className="statePage">
        <div className="stateBox">
          <div className="errorIcon">!</div>

          <h1>Testni ochib bo‘lmadi</h1>

          <p>{error || "Test topilmadi."}</p>

          <button
            type="button"
            onClick={() => router.push("/test")}
          >
            Testlar bo‘limiga qaytish
          </button>
        </div>

        <style jsx>{stateStyles}</style>
      </main>
    );
  }

  /* =====================================================
     TEST BOSHLANMAGAN
  ===================================================== */

  if (!started && !finished) {
    return (
      <main className="page">
        <header className="topHeader">
          <div className="headerName">
            Online test
          </div>

          <button
            type="button"
            className="grayButton"
            onClick={() => router.push("/test")}
          >
            ← Testlarga qaytish
          </button>
        </header>

        <section className="panel">
          <div className="floatingTitle">
            Test ma’lumotlari
          </div>

          <div className="introCard">
            <div className="subject">
              {test.subject}
            </div>

            <h1>{test.title}</h1>

            {test.description && (
              <p className="description">
                {test.description}
              </p>
            )}

            <div className="introInformation">
              <div className="info">
                <span>Savollar</span>

                <strong>
                  {test.questions.length}
                </strong>
              </div>

              <div className="info">
                <span>Vaqt</span>

                <strong>
                  {test.duration}
                  <small> daqiqa</small>
                </strong>
              </div>

              <div className="info">
                <span>Holati</span>

                <strong className="green">
                  Tayyor
                </strong>
              </div>
            </div>

            <div className="instruction">
              <strong>Test tartibi</strong>

              <p>
                Har bir savol uchun javob variantini
                belgilang. Savollar orasida erkin
                harakat qilishingiz mumkin. Vaqt
                tugaganda test avtomatik yakunlanadi.
              </p>
            </div>

            <button
              type="button"
              className="startButton"
              onClick={startTest}
            >
              TESTNI BOSHLASH
            </button>
          </div>
        </section>

        <style jsx>{pageStyles}</style>
      </main>
    );
  }

  /* =====================================================
     RESULT
  ===================================================== */

  if (finished) {
    return (
      <main className="page">
        <header className="topHeader">
          <div className="headerName">
            Test natijasi
          </div>

          <button
            type="button"
            className="grayButton"
            onClick={() => router.push("/test")}
          >
            Testlarga qaytish
          </button>
        </header>

        <section className="panel">
          <div className="floatingTitle">
            Natija
          </div>

          <div className="resultBox">
            <div className="resultCircle">
              <strong>
                {result.percentage}%
              </strong>

              <span>Natija</span>
            </div>

            <h1>{test.title}</h1>

            <p className="resultSubject">
              {test.subject}
            </p>

            <div className="resultGrid">
              <div className="resultItem">
                <span>Jami savol</span>

                <strong>
                  {result.total}
                </strong>
              </div>

              <div className="resultItem correctResult">
                <span>To‘g‘ri</span>

                <strong>
                  {result.correct}
                </strong>
              </div>

              <div className="resultItem wrongResult">
                <span>Noto‘g‘ri</span>

                <strong>
                  {result.incorrect}
                </strong>
              </div>

              <div className="resultItem">
                <span>Javobsiz</span>

                <strong>
                  {result.unanswered}
                </strong>
              </div>

              <div className="resultItem">
                <span>Ball</span>

                <strong>
                  {result.earnedPoints}/
                  {result.totalPoints}
                </strong>
              </div>
            </div>

            <div className="resultMessage">
              {result.percentage >= 86
                ? "A’lo natija!"
                : result.percentage >= 71
                ? "Yaxshi natija!"
                : result.percentage >= 56
                ? "Qoniqarli natija."
                : "Natijani yaxshilash uchun mavzularni yana takrorlang."}
            </div>

            <div className="resultActions">
              <button
                type="button"
                className="reviewButton"
                onClick={() =>
                  setShowReview(
                    (current) => !current
                  )
                }
              >
                {showReview
                  ? "Javoblarni yopish"
                  : "Javoblarni ko‘rib chiqish"}
              </button>

              <button
                type="button"
                className="againButton"
                onClick={startTest}
              >
                Qayta ishlash
              </button>

              <button
                type="button"
                className="grayButton"
                onClick={() =>
                  router.push("/test")
                }
              >
                Boshqa test tanlash
              </button>
            </div>
          </div>
        </section>

        {showReview && (
          <section className="reviewPanel">
            <div className="floatingTitle">
              Javoblar tahlili
            </div>

            <div className="reviewInner">
              {test.questions.map(
                (question, index) => {
                  const selectedId =
                    answers[question.id];

                  const selectedOption =
                    question.options?.find(
                      (option) =>
                        String(option.id) ===
                        String(selectedId)
                    );

                  const correct =
                    !!selectedOption &&
                    optionIsCorrect(
                      selectedOption
                    );

                  return (
                    <article
                      key={question.id}
                      className="reviewQuestion"
                    >
                      <div className="reviewNumber">
                        {index + 1}-savol
                      </div>

                      <div
                        className="questionHtml"
                        dangerouslySetInnerHTML={{
                          __html:
                            getQuestionText(
                              question
                            ) ||
                            "Savol matni mavjud emas.",
                        }}
                      />

                      {renderQuestionShapes(question)}

                      <div className="reviewOptions">
                        {(question.options || []).map(
                          (option) => {
                            const selected =
                              String(
                                selectedId
                              ) ===
                              String(
                                option.id
                              );

                            const correctOption =
                              optionIsCorrect(
                                option
                              );

                            let className =
                              "reviewOption";

                            if (correctOption) {
                              className +=
                                " correctOption";
                            }

                            if (
                              selected &&
                              !correctOption
                            ) {
                              className +=
                                " selectedWrong";
                            }

                            return (
                              <div
                                key={option.id}
                                className={
                                  className
                                }
                              >
                                <span>
                                  {correctOption
                                    ? "✓"
                                    : selected
                                    ? "×"
                                    : "○"}
                                </span>

                                <div
                                  dangerouslySetInnerHTML={{
                                    __html:
                                      getOptionText(
                                        option
                                      ),
                                  }}
                                />
                              </div>
                            );
                          }
                        )}
                      </div>

                      <div
                        className={
                          correct
                            ? "answerStatus correctStatus"
                            : "answerStatus wrongStatus"
                        }
                      >
                        {correct
                          ? "✓ To‘g‘ri javob"
                          : selectedId
                          ? "× Noto‘g‘ri javob"
                          : "— Javob berilmagan"}
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          </section>
        )}

        <style jsx>{pageStyles}</style>
      </main>
    );
  }

  /* =====================================================
     TEST ISHLASH
  ===================================================== */

  return (
    <main className="page">
      <header className="testHeader">
        <div className="testHeaderLeft">
          <span>{test.subject}</span>

          <strong>{test.title}</strong>
        </div>

        <div
          className={
            remainingSeconds <= 300
              ? "timer timerDanger"
              : "timer"
          }
        >
          <span>Qolgan vaqt</span>

          <strong>
            {formatTime(remainingSeconds)}
          </strong>
        </div>
      </header>

      <section className="progressPanel">
        <div className="progressInformation">
          <strong>
            {answeredCount} /{" "}
            {test.questions.length} javob
          </strong>

          <span>{progress}%</span>
        </div>

        <div className="progressTrack">
          <div
            className="progressBar"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>
      </section>

      <div className="testLayout">
        {/* =============================================
            NAVIGATOR
        ============================================= */}

        <aside className="navigator">
          <h3>Savollar</h3>

          <div className="questionNumbers">
            {test.questions.map(
              (question, index) => {
                const answered =
                  !!answers[question.id];

                return (
                  <button
                    key={question.id}
                    type="button"
                    className={[
                      "numberButton",

                      currentIndex === index
                        ? "currentNumber"
                        : "",

                      answered
                        ? "answeredNumber"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() =>
                      setCurrentIndex(index)
                    }
                  >
                    {index + 1}
                  </button>
                );
              }
            )}
          </div>

          <div className="legend">
            <div>
              <span className="legendCurrent" />
              Joriy
            </div>

            <div>
              <span className="legendAnswered" />
              Javob berilgan
            </div>

            <div>
              <span className="legendEmpty" />
              Javobsiz
            </div>
          </div>

          <button
            type="button"
            className="finishSideButton"
            onClick={() => finishTest(false)}
          >
            TESTNI YAKUNLASH
          </button>
        </aside>

        {/* =============================================
            QUESTION
        ============================================= */}

        <section className="questionPanel">
          {currentQuestion && (
            <>
              <div className="questionTop">
                <div>
                  <span>
                    SAVOL
                  </span>

                  <strong>
                    {currentIndex + 1}
                  </strong>
                </div>

                <p>
                  {currentIndex + 1} /{" "}
                  {test.questions.length}
                </p>
              </div>

              <div className="questionContent">
                <div className="question3DCard">
                  <div className="question3DLabel">
                    SAVOL MATNI
                  </div>

                  <div
                    className="questionHtml"
                    dangerouslySetInnerHTML={{
                      __html:
                        getQuestionText(
                          currentQuestion
                        ) ||
                        "Savol matni mavjud emas.",
                    }}
                  />
                </div>

                {renderQuestionShapes(currentQuestion)}

                <div className="options">
                  {(
                    currentQuestion.options ||
                    []
                  ).map((option, optionIndex) => {
                    const selected =
                      String(
                        answers[
                          currentQuestion.id
                        ] || ""
                      ) ===
                      String(option.id);

                    return (
                      <button
                        type="button"
                        key={option.id}
                        className={
                          selected
                            ? "option selectedOption"
                            : "option"
                        }
                        onClick={() =>
                          selectAnswer(
                            currentQuestion.id,
                            option.id
                          )
                        }
                      >
                        <span className="optionLetter">
                          {String.fromCharCode(
                            65 + optionIndex
                          )}
                        </span>

                        <div
                          className="optionText"
                          dangerouslySetInnerHTML={{
                            __html:
                              getOptionText(
                                option
                              ),
                          }}
                        />

                        <span className="radio">
                          {selected
                            ? "●"
                            : "○"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="questionActions">
                <button
                  type="button"
                  className="previousButton"
                  disabled={currentIndex === 0}
                  onClick={() =>
                    setCurrentIndex(
                      (current) =>
                        Math.max(
                          0,
                          current - 1
                        )
                    )
                  }
                >
                  ← OLDINGI
                </button>

                {currentIndex <
                test.questions.length - 1 ? (
                  <button
                    type="button"
                    className="nextButton"
                    onClick={() =>
                      setCurrentIndex(
                        (current) =>
                          Math.min(
                            test.questions
                              .length - 1,
                            current + 1
                          )
                      )
                    }
                  >
                    KEYINGI →
                  </button>
                ) : (
                  <button
                    type="button"
                    className="finishButton"
                    onClick={() =>
                      finishTest(false)
                    }
                  >
                    TESTNI YAKUNLASH
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      <style jsx>{pageStyles}</style>
    </main>
  );
}

/* =======================================================
   STATE CSS
======================================================= */

const stateStyles = `
  * {
    box-sizing: border-box;
  }

  .statePage {
    min-height: 100vh;
    padding: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(#ffffff, #e9eef1);
    font-family: "Bell MT", "Times New Roman", serif;
  }

  .stateBox {
    width: min(650px, 96%);
    padding: 50px 30px;
    border: 3px solid #303538;
    border-radius: 22px;
    background: linear-gradient(#ffffff, #d0d0d0);
    box-shadow:
      inset 0 6px 5px white,
      0 7px 0 #555d61,
      0 15px 25px rgba(0,0,0,.2);
    text-align: center;
  }

  .stateBox button {
    min-height: 52px;
    margin-top: 20px;
    padding: 0 25px;
    border: 2px solid #174461;
    border-radius: 10px;
    background: linear-gradient(#b8ecff, #58a8d7);
    box-shadow: 0 4px 0 #17415c;
    color: #073b68;
    font-weight: 700;
    cursor: pointer;
  }

  .loader {
    width: 55px;
    height: 55px;
    margin: 0 auto 20px;
    border: 6px solid #ccc;
    border-top-color: #168fc9;
    border-radius: 50%;
    animation: spin .8s linear infinite;
  }

  .errorIcon {
    width: 70px;
    height: 70px;
    margin: 0 auto 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 4px solid #b52323;
    border-radius: 50%;
    color: #b52323;
    font-size: 40px;
    font-weight: 700;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

/* =======================================================
   MAIN CSS
======================================================= */

const pageStyles = `
  * {
    box-sizing: border-box;
  }

  .page {
    min-height: 100vh;
    padding: 20px 20px 100px;
    background:
      linear-gradient(
        180deg,
        #ffffff 0%,
        #f7f8f9 55%,
        #e9eef1 100%
      );
    color: #111;
    font-family:
      "Bell MT",
      "Times New Roman",
      serif;
  }

  button {
    font-family: inherit;
    cursor: pointer;
  }

  button:disabled {
    opacity: .45;
    cursor: not-allowed;
  }

  /* HEADER */

  .topHeader,
  .testHeader {
    width: min(1500px, 98%);
    min-height: 110px;
    margin: 0 auto;
    padding: 20px 28px;

    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;

    border: 3px solid #174461;
    border-radius: 23px;

    background:
      linear-gradient(
        #a9e5ff,
        #62b3df 55%,
        #4b9dca
      );

    box-shadow:
      inset 0 7px 5px rgba(255,255,255,.7),
      0 7px 0 #173e56,
      0 14px 22px rgba(0,0,0,.2);
  }

  .headerName {
    min-width: 300px;
    min-height: 65px;
    padding: 10px 25px;

    display: flex;
    align-items: center;
    justify-content: center;

    border: 2px solid #555;
    border-radius: 13px;

    background:
      linear-gradient(#fff, #ccc);

    box-shadow:
      inset 0 5px 5px white,
      0 4px 0 #555;

    font-size: 26px;
    font-weight: 700;
  }

  .grayButton {
    min-height: 52px;
    padding: 0 22px;

    border: 2px solid #555;
    border-radius: 9px;

    background:
      linear-gradient(#fff, #bbb);

    box-shadow: 0 4px 0 #555;

    font-weight: 700;
  }

  /* PANEL */

  .panel,
  .reviewPanel {
    position: relative;

    width: min(1300px, 96%);

    margin: 100px auto 0;

    padding: 80px 35px 35px;

    border: 3px solid #303538;
    border-radius: 27px;

    background:
      linear-gradient(
        145deg,
        #696d70,
        #505457 50%,
        #363a3d
      );

    box-shadow:
      inset 0 7px 6px rgba(255,255,255,.23),
      inset 0 -8px 8px rgba(0,0,0,.32),
      0 7px 0 #272b2e,
      0 15px 25px rgba(0,0,0,.24);
  }

  .floatingTitle {
    position: absolute;

    top: -36px;
    left: 50%;

    transform: translateX(-50%);

    min-width: 330px;
    min-height: 70px;

    padding: 10px 30px;

    display: flex;
    align-items: center;
    justify-content: center;

    border: 3px solid #174461;
    border-radius: 16px;

    background:
      linear-gradient(#abe6ff, #58a8d7);

    box-shadow:
      inset 0 6px 5px rgba(255,255,255,.7),
      0 5px 0 #17415c;

    color: #073b68;

    font-size: 28px;
    font-weight: 700;

    text-align: center;
  }

  /* INTRO */

  .introCard,
  .resultBox,
  .reviewInner {
    padding: 35px;

    border: 2px solid #555;
    border-radius: 18px;

    background:
      linear-gradient(#f8f8f8, #ccc);

    box-shadow:
      inset 0 6px 5px white,
      0 6px 0 #555d61;

    text-align: center;
  }

  .introCard h1,
  .resultBox h1 {
    margin: 10px 0 15px;
    font-size: clamp(30px, 4vw, 45px);
  }

  .subject,
  .resultSubject {
    color: #07517e;
    font-size: 20px;
    font-weight: 700;
  }

  .description {
    max-width: 850px;
    margin: 0 auto 25px;
    line-height: 1.6;
    font-size: 17px;
  }

  .introInformation {
    margin: 30px 0;

    display: grid;
    grid-template-columns: repeat(3, 1fr);

    gap: 15px;
  }

  .info {
    min-height: 100px;
    padding: 15px;

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    border: 1px solid #999;
    border-radius: 11px;

    background: rgba(255,255,255,.7);
  }

  .info span {
    margin-bottom: 8px;
    color: #555;
  }

  .info strong {
    color: #07517e;
    font-size: 25px;
  }

  .info small {
    font-size: 14px;
  }

  .green {
    color: #17723b !important;
  }

  .instruction {
    margin: 25px 0;
    padding: 20px;

    border: 2px solid #4a9a68;
    border-radius: 12px;

    background: #d7f2df;
  }

  .instruction strong {
    font-size: 20px;
  }

  .instruction p {
    margin: 10px 0 0;
    line-height: 1.5;
  }

  .startButton {
    width: min(450px, 100%);
    min-height: 65px;

    border: 3px solid #174461;
    border-radius: 12px;

    background:
      linear-gradient(#b8ecff, #58a8d7);

    box-shadow:
      inset 0 5px 5px rgba(255,255,255,.7),
      0 5px 0 #17415c;

    color: #073b68;

    font-size: 18px;
    font-weight: 700;
  }

  /* TEST HEADER */

  .testHeaderLeft {
    display: flex;
    flex-direction: column;
  }

  .testHeaderLeft span {
    margin-bottom: 5px;
    color: #174461;
    font-weight: 700;
  }

  .testHeaderLeft strong {
    font-size: 25px;
  }

  .timer {
    min-width: 180px;
    padding: 12px 20px;

    display: flex;
    flex-direction: column;
    align-items: center;

    border: 2px solid #555;
    border-radius: 12px;

    background:
      linear-gradient(#fff, #ccc);

    box-shadow: 0 4px 0 #555;
  }

  .timer span {
    font-size: 12px;
  }

  .timer strong {
    color: #07517e;
    font-size: 29px;
  }

  .timerDanger {
    border-color: #a51f1f;
    background:
      linear-gradient(#ffe2e2, #ef9b9b);
  }

  .timerDanger strong {
    color: #a31212;
  }

  /* PROGRESS */

  .progressPanel {
    width: min(1500px, 98%);
    margin: 35px auto 0;
    padding: 18px 25px;

    border: 2px solid #555;
    border-radius: 13px;

    background:
      linear-gradient(#fff, #ccc);

    box-shadow: 0 5px 0 #555d61;
  }

  .progressInformation {
    margin-bottom: 10px;

    display: flex;
    justify-content: space-between;
  }

  .progressTrack {
    height: 15px;
    overflow: hidden;

    border: 1px solid #777;
    border-radius: 20px;

    background: #eee;
  }

  .progressBar {
    height: 100%;

    border-radius: 20px;

    background:
      linear-gradient(
        90deg,
        #65b7e1,
        #1788c2
      );

    transition: width .25s ease;
  }

  /* TEST LAYOUT */

  .testLayout {
    width: min(1500px, 98%);

    margin: 35px auto 0;

    display: grid;
    grid-template-columns: 270px minmax(0, 1fr);

    gap: 25px;

    align-items: start;
  }

  /* NAVIGATOR */

  .navigator {
    position: sticky;
    top: 20px;

    padding: 25px 20px;

    border: 3px solid #303538;
    border-radius: 20px;

    background:
      linear-gradient(
        145deg,
        #696d70,
        #404548
      );

    box-shadow:
      0 6px 0 #272b2e,
      0 12px 20px rgba(0,0,0,.2);
  }

  .navigator h3 {
    margin: 0 0 20px;
    color: white;
    text-align: center;
    font-size: 22px;
  }

  .questionNumbers {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  .numberButton {
    aspect-ratio: 1;

    border: 2px solid #777;
    border-radius: 8px;

    background:
      linear-gradient(#fff, #ccc);

    font-weight: 700;
  }

  .answeredNumber {
    border-color: #277b49;
    background:
      linear-gradient(#c6f1d3, #70ca8e);
  }

  .currentNumber {
    outline: 3px solid #43b7ee;
    outline-offset: 2px;
  }

  .legend {
    margin-top: 25px;
    padding: 15px;

    border-radius: 10px;

    background: rgba(255,255,255,.9);

    font-size: 13px;
  }

  .legend div {
    margin: 7px 0;

    display: flex;
    align-items: center;
    gap: 8px;
  }

  .legend span {
    width: 18px;
    height: 18px;

    border: 1px solid #777;
    border-radius: 4px;
  }

  .legendCurrent {
    outline: 2px solid #43b7ee;
  }

  .legendAnswered {
    background: #70ca8e;
  }

  .legendEmpty {
    background: #ddd;
  }

  .finishSideButton {
    width: 100%;
    min-height: 50px;

    margin-top: 20px;

    border: 2px solid #8e1515;
    border-radius: 9px;

    background:
      linear-gradient(#f77b7b, #c62525);

    box-shadow: 0 4px 0 #831515;

    color: white;
    font-weight: 700;
  }

  /* QUESTION PANEL */

  .questionPanel {
    overflow: hidden;

    border: 3px solid #303538;
    border-radius: 22px;

    background:
      linear-gradient(
        145deg,
        #696d70,
        #3d4245
      );

    box-shadow:
      0 7px 0 #272b2e,
      0 15px 25px rgba(0,0,0,.22);
  }

  .questionTop {
    min-height: 85px;
    padding: 15px 25px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    background:
      linear-gradient(
        #a9e5ff,
        #58a8d7
      );

    border-bottom: 3px solid #174461;
  }

  .questionTop div {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .questionTop span {
    font-weight: 700;
  }

  .questionTop strong {
    width: 45px;
    height: 45px;

    display: flex;
    align-items: center;
    justify-content: center;

    border: 2px solid #174461;
    border-radius: 50%;

    background: white;

    color: #07517e;

    font-size: 22px;
  }

  .questionTop p {
    font-weight: 700;
  }

  .questionContent {
    margin: 25px;
    padding: 30px;

    border: 2px solid #555;
    border-radius: 15px;

    background:
      linear-gradient(#fff, #ddd);

    box-shadow:
      inset 0 5px 5px white,
      0 5px 0 #555d61;
  }

  .question3DCard {
    position: relative;
    margin: 0 0 34px;
    padding: 42px 34px 32px;

    border: 2px solid #8a959d;
    border-radius: 22px;

    background:
      linear-gradient(
        145deg,
        #ffffff 0%,
        #f7f8f9 38%,
        #e7eaec 72%,
        #d3d7da 100%
      );

    box-shadow:
      inset 0 7px 6px rgba(255,255,255,.98),
      inset 0 -7px 12px rgba(60,70,78,.18),
      0 7px 0 #6d767c,
      0 15px 24px rgba(0,0,0,.22);
  }

  .question3DCard::before {
    content: "";
    position: absolute;
    inset: 7px;
    pointer-events: none;
    border: 1px solid rgba(255,255,255,.82);
    border-radius: 16px;
  }

  .question3DLabel {
    position: absolute;
    top: -19px;
    left: 30px;

    min-width: 155px;
    min-height: 40px;
    padding: 7px 20px;

    display: flex;
    align-items: center;
    justify-content: center;

    border: 2px solid #174461;
    border-radius: 10px;

    background:
      linear-gradient(
        #c9f1ff 0%,
        #76c9ef 46%,
        #4ca6d1 100%
      );

    box-shadow:
      inset 0 4px 4px rgba(255,255,255,.78),
      0 4px 0 #17415c,
      0 8px 13px rgba(0,0,0,.2);

    color: #073b68;
    font-size: 14px;
    font-weight: 800;
    letter-spacing: 1.2px;
  }

  .questionHtml {
    margin: 0;

    direction: ltr;
    text-align: justify;
    text-justify: inter-word;

    overflow-wrap: normal;
    word-break: normal;
    hyphens: none;

    color: #111315;
    font-size: 24px;
    line-height: 1.55;
    font-weight: 900;

    text-shadow: 0 1px 0 rgba(255,255,255,.9);
  }

  .questionHtml :global(p),
  .questionHtml :global(div),
  .questionHtml :global(li),
  .questionHtml :global(span) {
    font-size: inherit;
    line-height: inherit;
    font-weight: inherit;
    text-align: justify;
    text-justify: inter-word;
  }

  .questionHtml :global(ol),
  .questionHtml :global(ul) {
    margin-top: 8px;
    margin-bottom: 8px;
    padding-left: 38px;
  }

  .questionHtml :global(p) {
    margin: 0 0 18px;
  }

  .questionHtml :global(p:last-child) {
    margin-bottom: 0;
  }

  .questionHtml :global(a) {
    color: #008b88;
    font-weight: 700;
    text-decoration: none;
    border-bottom: 1px solid rgba(0,139,136,.35);
  }

  .questionHtml :global(strong),
  .questionHtml :global(b) {
    color: #082f4d;
  }

  .questionHtml :global(img),
  .optionText :global(img) {
    max-width: 100%;
    height: auto;
  }

  .questionHtml :global(table),
  .optionText :global(table) {
    max-width: 100%;
    border-collapse: collapse;
  }

  .shapeResultScroll {
    width: 100%;
    margin: 0 0 28px;
    overflow-x: auto;
    overflow-y: hidden;
  }

  .shapeResultStage {
    position: relative;
    min-width: 1px;
    min-height: 1px;
    max-width: none;
  }

  .resultShapeItem {
    position: absolute;
    box-sizing: border-box;
  }

  .resultImageItem {
    overflow: visible;
    background: transparent;
  }

  .resultShapeBody {
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    padding: 8px;
    box-sizing: border-box;
  }

  .resultShapeBody.circle,
  .resultShapeBody.ellipse {
    border-radius: 999px;
  }

  .resultVenn {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .resultVennCircle {
    position: absolute;
    top: 8%;
    width: 58%;
    height: 84%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid;
    border-radius: 50%;
    box-sizing: border-box;
    font-weight: 700;
  }

  .resultVennOne {
    left: 5%;
  }

  .resultVennTwo {
    right: 5%;
  }

  .options {
    display: grid;
    gap: 15px;
  }

  .option {
    width: 100%;
    min-height: 75px;

    padding: 12px 18px;

    display: grid;
    grid-template-columns: 48px minmax(0,1fr) 35px;

    align-items: center;
    gap: 15px;

    border: 2px solid #999;
    border-radius: 12px;

    background:
      linear-gradient(#fff, #e4e4e4);

    text-align: left;

    transition:
      transform .15s ease,
      border-color .15s ease;
  }

  .option:hover {
    border-color: #168fc9;
    transform: translateY(-1px);
  }

  .selectedOption {
    border: 3px solid #168fc9;

    background:
      linear-gradient(
        #e4f7ff,
        #bce6f8
      );
  }

  .optionLetter {
    width: 42px;
    height: 42px;

    display: flex;
    align-items: center;
    justify-content: center;

    border: 2px solid #174461;
    border-radius: 50%;

    background:
      linear-gradient(#b8ecff, #58a8d7);

    color: #073b68;

    font-weight: 700;
  }

  .optionText {
    min-width: 0;

    direction: ltr;
    text-align: justify;
    text-justify: inter-word;

    overflow-wrap: normal;
    word-break: normal;
    hyphens: none;

    font-size: 18px;
    line-height: 1.5;
    font-weight: 900;
  }

  .optionText :global(p),
  .optionText :global(div),
  .optionText :global(li),
  .optionText :global(span) {
    font-size: inherit;
    line-height: inherit;
    font-weight: inherit;
    text-align: justify;
    text-justify: inter-word;
  }

  .radio {
    color: #0879b2;
    text-align: center;
    font-size: 25px;
  }

  /* QUESTION ACTIONS */

  .questionActions {
    padding: 0 25px 28px;

    display: flex;
    justify-content: space-between;

    gap: 15px;
  }

  .questionActions button {
    min-width: 180px;
    min-height: 55px;

    padding: 0 20px;

    border-radius: 10px;

    font-weight: 700;
  }

  .previousButton {
    border: 2px solid #555;

    background:
      linear-gradient(#fff, #bbb);

    box-shadow: 0 4px 0 #555;
  }

  .nextButton {
    margin-left: auto;

    border: 2px solid #174461;

    background:
      linear-gradient(#b8ecff, #58a8d7);

    box-shadow: 0 4px 0 #17415c;

    color: #073b68;
  }

  .finishButton {
    margin-left: auto;

    border: 2px solid #277b49;

    background:
      linear-gradient(#c6f1d3, #68c888);

    box-shadow: 0 4px 0 #277144;

    color: #125a32;
  }

  /* RESULT */

  .resultCircle {
    width: 180px;
    height: 180px;

    margin: 0 auto 25px;

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    border: 8px solid #168fc9;
    border-radius: 50%;

    background:
      linear-gradient(#fff, #d8f1fc);

    box-shadow:
      0 7px 15px rgba(0,0,0,.2);
  }

  .resultCircle strong {
    color: #07517e;
    font-size: 45px;
  }

  .resultCircle span {
    font-weight: 700;
  }

  .resultGrid {
    margin: 30px 0;

    display: grid;
    grid-template-columns:
      repeat(5, 1fr);

    gap: 12px;
  }

  .resultItem {
    min-height: 72px;
    padding: 10px;

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    border: 1px solid #999;
    border-radius: 10px;

    background: rgba(255,255,255,.7);
  }

  .resultItem span {
    margin-bottom: 7px;
    color: #555;
  }

  .resultItem strong {
    color: #07517e;
    font-size: 26px;
  }

  .correctResult strong {
    color: #18713b;
  }

  .wrongResult strong {
    color: #ad1c1c;
  }

  .resultMessage {
    margin: 25px 0;
    padding: 20px;

    border: 2px solid #168fc9;
    border-radius: 12px;

    background: #dff5ff;

    color: #07517e;

    font-size: 21px;
    font-weight: 700;
  }

  .resultActions {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;

    gap: 15px;
  }

  .resultActions button {
    min-height: 55px;
    padding: 0 22px;

    border-radius: 9px;

    font-weight: 700;
  }

  .reviewButton {
    border: 2px solid #174461;

    background:
      linear-gradient(#b8ecff, #58a8d7);

    box-shadow: 0 4px 0 #17415c;

    color: #073b68;
  }

  .againButton {
    border: 2px solid #277b49;

    background:
      linear-gradient(#c6f1d3, #68c888);

    box-shadow: 0 4px 0 #277144;

    color: #125a32;
  }

  /* REVIEW */

  .reviewQuestion {
    margin-bottom: 25px;
    padding: 25px;

    border: 2px solid #777;
    border-radius: 13px;

    background: white;

    text-align: left;
  }

  .reviewNumber {
    margin-bottom: 15px;

    color: #07517e;

    font-size: 17px;
    font-weight: 700;
  }

  .reviewOptions {
    display: grid;
    gap: 10px;
  }

  .reviewOption {
    padding: 13px 15px;

    display: flex;
    align-items: center;
    gap: 12px;

    border: 1px solid #aaa;
    border-radius: 8px;

    background: #eee;
  }

  .correctOption {
    border-color: #3d9661;
    background: #d8f1df;
  }

  .selectedWrong {
    border-color: #b93333;
    background: #f6dada;
  }

  .answerStatus {
    margin-top: 15px;
    padding: 12px;

    border-radius: 8px;

    text-align: center;

    font-weight: 700;
  }

  .correctStatus {
    color: #126033;
    background: #d8f1df;
  }

  .wrongStatus {
    color: #8c1818;
    background: #f6dada;
  }

  /* RESPONSIVE */

  @media (max-width: 900px) {
    .question3DCard {
      padding: 36px 22px 24px;
      border-radius: 17px;
    }

    .question3DLabel {
      left: 20px;
      min-width: 135px;
      font-size: 12px;
    }

    .questionHtml {
      font-size: 21px;
      line-height: 1.6;
    }

    .testLayout {
      grid-template-columns: 1fr;
    }

    .navigator {
      position: static;
    }

    .questionNumbers {
      grid-template-columns:
        repeat(8, 1fr);
    }

    .resultGrid {
      grid-template-columns:
        repeat(2, 1fr);
    }
  }

  @media (max-width: 650px) {
  .page {
    padding: 10px 6px 50px;
  }

  .topHeader,
  .testHeader {
    width: 100%;
    min-height: auto;
    padding: 12px;
    flex-direction: column;
    gap: 12px;
    border-radius: 16px;
  }

  .headerName {
    width: 100%;
    min-width: 0;
    min-height: 50px;
    padding: 8px 12px;
    font-size: 21px;
  }

  .topHeader .grayButton {
    width: 100%;
    min-height: 46px;
  }

  .testHeaderLeft {
    width: 100%;
    text-align: center;
  }

  .testHeaderLeft strong {
    font-size: 20px;
  }

  .timer {
    width: 100%;
    min-width: 0;
    padding: 8px 12px;
  }

  .timer strong {
    font-size: 24px;
  }

  .progressPanel {
    width: 100%;
    margin-top: 18px;
    padding: 12px 14px;
  }

  .progressTrack {
    height: 10px;
  }

  .panel,
  .reviewPanel {
    width: 100%;
    margin-top: 65px;
    padding: 55px 8px 15px;
    border-radius: 18px;
  }

  .floatingTitle {
    top: -27px;
    min-width: 190px;
    min-height: 52px;
    padding: 7px 18px;
    font-size: 20px;
    border-radius: 12px;
  }

  .introCard,
  .resultBox,
  .reviewInner {
    padding: 16px 10px;
    border-radius: 13px;
  }

  .introCard h1,
  .resultBox h1 {
    margin: 8px 0 10px;
    font-size: 25px;
  }

  .subject,
  .resultSubject {
    font-size: 17px;
  }

  .description {
    margin-bottom: 18px;
    font-size: 15px;
    line-height: 1.45;
  }

  .introInformation {
    margin: 18px 0;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 9px;
  }

  .info {
    min-height: 72px;
    padding: 9px;
  }

  .info strong {
    font-size: 21px;
  }

  .instruction {
    margin: 17px 0;
    padding: 14px;
  }

  .instruction strong {
    font-size: 18px;
  }

  .instruction p {
    font-size: 14px;
  }

  .startButton {
    min-height: 52px;
    font-size: 16px;
  }

  .testLayout {
    width: 100%;
    margin-top: 18px;
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .navigator {
    position: static;
    padding: 16px 12px;
  }

  .navigator h3 {
    margin-bottom: 12px;
    font-size: 19px;
  }

  .questionNumbers {
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
  }

  .legend {
    margin-top: 15px;
    padding: 10px;
  }

  .finishSideButton {
    min-height: 46px;
    margin-top: 14px;
  }

  .questionPanel {
    border-radius: 16px;
  }

  .questionTop {
    min-height: 65px;
    padding: 10px 14px;
  }

  .questionTop strong {
    width: 36px;
    height: 36px;
    font-size: 18px;
  }

  .questionContent {
    margin: 9px;
    padding: 16px 9px;
  }

  .question3DCard {
    margin-bottom: 25px;
    padding: 32px 15px 20px;
    border-radius: 15px;
  }

  .question3DLabel {
    top: -16px;
    left: 14px;
    min-width: 120px;
    min-height: 34px;
    padding: 5px 12px;
    font-size: 11px;
  }

  .questionHtml {
    font-size: 24px;
    line-height: 1.5;
  }

  .options {
    gap: 10px;
  }

  .option {
    min-height: 58px;
    grid-template-columns: 38px minmax(0, 1fr) 24px;
    gap: 8px;
    padding: 8px;
  }

  .optionLetter {
    width: 34px;
    height: 34px;
  }

  .optionText {
    font-size: 18px;
    line-height: 1.5;
    font-weight: 900;
  }

  .radio {
    font-size: 21px;
  }

  .questionActions {
    padding: 0 9px 16px;
    flex-direction: column;
    gap: 10px;
  }

  .questionActions button {
    width: 100%;
    min-width: 0;
    min-height: 48px;
  }

  /* NATIJA SAHIFASI */

  .resultCircle {
    width: 120px;
    height: 120px;
    margin: 0 auto 15px;
    border-width: 6px;
  }

  .resultCircle strong {
    font-size: 32px;
  }

  .resultCircle span {
    font-size: 14px;
  }

  .resultGrid {
    margin: 18px 0;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .resultItem {
    min-height: 70px;
    padding: 8px 6px;
  }

  .resultItem span {
    margin-bottom: 4px;
    font-size: 13px;
  }

  .resultItem strong {
    font-size: 21px;
  }

  .resultMessage {
    margin: 15px 0;
    padding: 12px 10px;
    font-size: 16px;
  }

  .resultActions {
    gap: 9px;
  }

  .resultActions button {
    width: 100%;
    min-height: 48px;
    padding: 0 12px;
  }

  /* JAVOBLARNI KO‘RIB CHIQISH */

  .reviewQuestion {
    margin-bottom: 15px;
    padding: 14px 10px;
  }

  .reviewNumber {
    margin-bottom: 10px;
    font-size: 15px;
  }

  .reviewOption {
    padding: 10px;
    gap: 8px;
    font-size: 14px;
  }

  .answerStatus {
    margin-top: 10px;
    padding: 9px;
    font-size: 14px;
  }

  .shapeResultScroll {
    margin-bottom: 18px;
  }
}
    }

    .topHeader,
    .testHeader {
      flex-direction: column;
      padding: 15px;
    }

    .headerName {
      width: 100%;
      min-width: 0;
    }

    .timer {
      width: 100%;
    }

    .panel,
    .reviewPanel {
      width: 99%;
      padding: 70px 12px 20px;
    }

    .floatingTitle {
      min-width: 230px;
      font-size: 22px;
    }

    .introCard,
    .resultBox,
    .reviewInner {
      padding: 20px 12px;
    }

    .introInformation {
      grid-template-columns: 1fr;
    }

    .testLayout {
      width: 99%;
    }

    .questionNumbers {
      grid-template-columns:
        repeat(5, 1fr);
    }

    .questionContent {
      margin: 12px;
      padding: 18px 12px;
    }

    .option {
      grid-template-columns:
        42px minmax(0,1fr) 25px;

      padding: 10px;
    }

    .questionActions {
      padding: 0 12px 20px;
      flex-direction: column;
    }

    .questionActions button {
      width: 100%;
      min-width: 0;
    }

    .resultGrid {
      grid-template-columns: 1fr;
    }
  }
`;
