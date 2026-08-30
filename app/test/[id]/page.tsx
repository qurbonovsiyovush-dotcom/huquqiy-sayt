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
  attemptLimit?: number | null;
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

  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const [showReview, setShowReview] = useState(false);

  const [flagged, setFlagged] = useState<Record<string, boolean>>({});

  const [reviewMode, setReviewMode] = useState<"all" | "wrong">("all");

  const [zoomQuestionId, setZoomQuestionId] = useState<string | null>(null);

  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");

  const [isOnline, setIsOnline] = useState(true);

  const [attemptLoading, setAttemptLoading] = useState(true);

  const [attemptLimit, setAttemptLimit] = useState<number | null>(null);

  const [attemptsUsed, setAttemptsUsed] = useState(0);

  const [attemptsRemaining, setAttemptsRemaining] =
    useState<number | null>(null);

  const [canAttempt, setCanAttempt] = useState(true);

  const restoredRef = useRef(false);

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

      const receivedTest =
        data?.test && typeof data.test === "object"
          ? data.test
          : data;

      if (!receivedTest?.id) {
        throw new Error("Test topilmadi.");
      }

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

        description: String(receivedTest.description || ""),

        status: receivedTest.status,

        attemptLimit:
          receivedTest.attemptLimit === null ||
          receivedTest.attemptLimit === undefined
            ? null
            : Math.max(
                1,
                Math.floor(
                  Number(receivedTest.attemptLimit) || 1
                )
              ),

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

      setAttemptLoading(true);

      try {
        const attemptResponse = await fetch(
          `/api/results?testId=${encodeURIComponent(
            normalizedTest.id
          )}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const attemptData = await readJson(attemptResponse);

        if (attemptResponse.ok) {
          setAttemptLimit(
            attemptData?.attemptLimit === null ||
              attemptData?.unlimited === true
              ? null
              : Math.max(
                  1,
                  Number(attemptData?.attemptLimit) || 1
                )
          );

          setAttemptsUsed(
            Math.max(
              0,
              Number(attemptData?.attemptsUsed) || 0
            )
          );

          setAttemptsRemaining(
            attemptData?.attemptsRemaining === null
              ? null
              : Math.max(
                  0,
                  Number(attemptData?.attemptsRemaining) || 0
                )
          );

          setCanAttempt(
            attemptData?.canAttempt !== false
          );
        } else {
          setCanAttempt(false);

          setError(
            attemptData?.message ||
              "Urinish holatini tekshirib bo‘lmadi."
          );
        }
      } catch (attemptError) {
        console.error(
          "ATTEMPT CHECK ERROR:",
          attemptError
        );

        setCanAttempt(false);

        setError(
          "Urinish holatini tekshirib bo‘lmadi."
        );
      } finally {
        setAttemptLoading(false);
      }

      setRemainingSeconds(
        normalizedTest.duration * 60
      );

      try {
        const raw = window.localStorage.getItem(
          `quiz-progress:${normalizedTest.id}`
        );

        if (raw) {
          const saved = JSON.parse(raw);

          if (
            saved?.started === true &&
            saved?.finished !== true
          ) {
            setAnswers(
              saved.answers &&
                typeof saved.answers === "object"
                ? saved.answers
                : {}
            );

            setFlagged(
              saved.flagged &&
                typeof saved.flagged === "object"
                ? saved.flagged
                : {}
            );

            setCurrentIndex(
              Math.min(
                Math.max(
                  0,
                  Number(saved.currentIndex) || 0
                ),
                Math.max(
                  0,
                  normalizedTest.questions.length - 1
                )
              )
            );

            setRemainingSeconds(
              Math.max(
                1,
                Number(saved.remainingSeconds) ||
                  normalizedTest.duration * 60
              )
            );

            setStarted(true);
            setFinished(false);
          }
        }
      } catch (restoreError) {
        console.error(
          "TEST PROGRESS RESTORE ERROR:",
          restoreError
        );
      } finally {
        restoredRef.current = true;
      }
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

  function getQuestionText(
    question: TestQuestion
  ) {
    return (
      question.questionHtml ||
      question.questionText ||
      question.question ||
      question.text ||
      ""
    );
  }

  function getOptionText(option: TestOption) {
    return (
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
    if (!test || attemptLoading) {
      return;
    }

    if (!canAttempt) {
      window.alert(
        attemptLimit === null
          ? "Hozir testni boshlash mumkin emas."
          : `Siz ushbu test uchun berilgan ${attemptLimit} ta urinishdan foydalanib bo‘lgansiz.`
      );

      return;
    }

    finishLock.current = false;
    resultSavedRef.current = false;

    setAnswers({});
    setCurrentIndex(0);
    setFinished(false);
    setShowReview(false);
    setReviewMode("all");
    setFlagged({});
    setZoomQuestionId(null);

    try {
      window.localStorage.removeItem(
        `quiz-progress:${test.id}`
      );
    } catch {}

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

      const flaggedCount =
        test.questions.filter(
          (question) => flagged[question.id]
        ).length;

      const answered =
        test.questions.length - unanswered;

      const message =
        `Testni yakunlashdan oldin tekshiring:\n\n` +
        `✓ Javob berilgan: ${answered} ta\n` +
        `— Javobsiz: ${unanswered} ta\n` +
        `⚑ Belgilangan: ${flaggedCount} ta\n\n` +
        `Testni yakunlaysizmi ?`;

      if (!window.confirm(message)) {
        return;
      }
    }

    finishLock.current = true;

    setFinished(true);
    setStarted(false);
    setZoomQuestionId(null);

    try {
      window.localStorage.removeItem(
        `quiz-progress:${test.id}`
      );
    } catch {}

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
     ONLINE
  ===================================================== */

  useEffect(() => {
    const syncOnline = () =>
      setIsOnline(window.navigator.onLine);

    syncOnline();

    window.addEventListener(
      "online",
      syncOnline
    );

    window.addEventListener(
      "offline",
      syncOnline
    );

    return () => {
      window.removeEventListener(
        "online",
        syncOnline
      );

      window.removeEventListener(
        "offline",
        syncOnline
      );
    };
  }, []);

  /* =====================================================
     AUTOSAVE
  ===================================================== */

  useEffect(() => {
    if (
      !test ||
      !started ||
      finished ||
      !restoredRef.current
    ) {
      return;
    }

    setSaveState("saving");

    const timeout = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          `quiz-progress:${test.id}`,
          JSON.stringify({
            version: 1,
            testId: test.id,
            started: true,
            finished: false,
            answers,
            flagged,
            currentIndex,
            remainingSeconds,
            savedAt: Date.now(),
          })
        );

        setSaveState("saved");
      } catch (saveError) {
        console.error(
          "TEST PROGRESS SAVE ERROR:",
          saveError
        );

        setSaveState("saved");
      }
    }, 180);

    return () =>
      window.clearTimeout(timeout);
  }, [
    test,
    started,
    finished,
    answers,
    flagged,
    currentIndex,
    remainingSeconds,
  ]);

  useEffect(() => {
    if (!started || finished) {
      return;
    }

    const beforeUnload = (
      event: BeforeUnloadEvent
    ) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener(
      "beforeunload",
      beforeUnload
    );

    return () =>
      window.removeEventListener(
        "beforeunload",
        beforeUnload
      );
  }, [started, finished]);

  /* =====================================================
     KLAVIATURA
  ===================================================== */

  useEffect(() => {
    if (!started || finished || !test) {
      return;
    }

    const onKeyDown = (
      event: KeyboardEvent
    ) => {
      const target =
        event.target as HTMLElement | null;

      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable ||
        zoomQuestionId
      ) {
        return;
      }

      const question =
        test.questions[currentIndex];

      if (!question) {
        return;
      }

      const key =
        event.key.toLowerCase();

      const optionIndex = [
        "a",
        "b",
        "c",
        "d",
      ].indexOf(key);

      if (optionIndex >= 0) {
        const option =
          question.options?.[optionIndex];

        if (option) {
          event.preventDefault();

          selectAnswer(
            question.id,
            option.id
          );
        }

        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();

        setCurrentIndex((current) =>
          Math.max(0, current - 1)
        );
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();

        setCurrentIndex((current) =>
          Math.min(
            test.questions.length - 1,
            current + 1
          )
        );
      }
    };

    window.addEventListener(
      "keydown",
      onKeyDown
    );

    return () =>
      window.removeEventListener(
        "keydown",
        onKeyDown
      );
  }, [
    started,
    finished,
    test,
    currentIndex,
    zoomQuestionId,
  ]);

  /* =====================================================
     JAVOB
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

  function toggleFlag(questionId: string) {
    setFlagged((current) => ({
      ...current,
      [questionId]: !current[questionId],
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

    const total =
      test.questions.length;

    const percentage =
      total > 0
        ? Math.round(
            (correct / total) * 100
          )
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
     NATIJANI SAQLASH
  ===================================================== */

  useEffect(() => {
    if (
      !finished ||
      !test ||
      resultSavedRef.current
    ) {
      return;
    }

    resultSavedRef.current = true;

    const totalSeconds =
      Math.max(
        1,
        Number(test.duration)
      ) * 60;

    const spentSeconds = Math.max(
      0,
      totalSeconds -
        Math.max(0, remainingSeconds)
    );

    async function saveResult() {
      if (!test) {
        return;
      }

      try {
        const response = await fetch(
          "/api/results",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              testId: test.id,
              testTitle: test.title,
              subject: test.subject,
              total: result.total,
              correct: result.correct,
              incorrect: result.incorrect,
              unanswered:
                result.unanswered,
              percentage:
                result.percentage,
              earnedPoints:
                result.earnedPoints,
              totalPoints:
                result.totalPoints,
              spentSeconds,
            }),
          }
        );

        const data =
          await readJson(response);

        if (!response.ok) {
          resultSavedRef.current = false;

          if (
            data?.code ===
            "ATTEMPT_LIMIT_REACHED"
          ) {
            setCanAttempt(false);

            setAttemptLimit(
              data?.attemptLimit ??
                attemptLimit
            );

            setAttemptsUsed(
              Number(
                data?.attemptsUsed
              ) || attemptsUsed
            );

            setAttemptsRemaining(0);
          }

          console.error(
            "RESULT SAVE ERROR:",
            data?.message ||
              response.status
          );

          return;
        }

        setAttemptLimit(
          data?.attemptLimit ?? null
        );

        setAttemptsUsed(
          Math.max(
            0,
            Number(data?.attemptsUsed) || 0
          )
        );

        setAttemptsRemaining(
          data?.attemptsRemaining === null
            ? null
            : Math.max(
                0,
                Number(
                  data?.attemptsRemaining
                ) || 0
              )
        );

        setCanAttempt(
          data?.attemptLimit === null ||
            (Number(
              data?.attemptsRemaining
            ) || 0) > 0
        );
      } catch (error) {
        resultSavedRef.current = false;

        console.error(
          "RESULT SAVE ERROR:",
          error
        );
      }
    }

    saveResult();
  }, [
    finished,
    test,
    result,
    remainingSeconds,
    attemptLimit,
    attemptsUsed,
  ]);

  /* =====================================================
     VAQT
  ===================================================== */

  function formatTime(seconds: number) {
    const safeSeconds = Math.max(
      0,
      Math.floor(seconds)
    );

    const minutes = Math.floor(
      safeSeconds / 60
    );

    const secs =
      safeSeconds % 60;

    return `${String(minutes).padStart(
      2,
      "0"
    )}:${String(secs).padStart(
      2,
      "0"
    )}`;
  }

  const currentQuestion =
    test?.questions?.[currentIndex] ||
    null;

  const answeredCount = test
    ? test.questions.filter(
        (question) =>
          !!answers[question.id]
      ).length
    : 0;

  const progress = test
    ? Math.round(
        (answeredCount /
          Math.max(
            test.questions.length,
            1
          )) *
          100
      )
    : 0;

  const spentSeconds = test
    ? Math.max(
        0,
        Math.max(
          1,
          Number(test.duration)
        ) *
          60 -
          remainingSeconds
      )
    : 0;

  /* =====================================================
     SHAPES
  ===================================================== */

  function renderQuestionShapes(
    question: TestQuestion,
    zoomed = false
  ) {
    const shapes =
      Array.isArray(question.shapes)
        ? question.shapes
        : [];

    if (shapes.length === 0) {
      return null;
    }

    const minX = Math.min(
      ...shapes.map(
        (shape) =>
          Number(shape.x) || 0
      )
    );

    const minY = Math.min(
      ...shapes.map(
        (shape) =>
          Number(shape.y) || 0
      )
    );

    const maxX = Math.max(
      ...shapes.map(
        (shape) =>
          (Number(shape.x) || 0) +
          Math.max(
            1,
            Number(shape.width) || 1
          )
      )
    );

    const maxY = Math.max(
      ...shapes.map(
        (shape) =>
          (Number(shape.y) || 0) +
          Math.max(
            1,
            Number(shape.height) || 1
          )
      )
    );

    const stageWidth = Math.max(
      1,
      Math.ceil(maxX - minX)
    );

    const stageHeight = Math.max(
      1,
      Math.ceil(maxY - minY)
    );

    return (
      <div
        className={
          zoomed
            ? "shapeResultScroll shapeResultZoomed"
            : "shapeResultScroll shapeResultClickable"
        }
        onClick={() => {
          if (!zoomed) {
            setZoomQuestionId(
              question.id
            );
          }
        }}
        title={
          zoomed
            ? undefined
            : "Kattalashtirib ko‘rish"
        }
      >
        <div
          className="shapeResultStage"
          style={{
            width: `${stageWidth}px`,
            height: `${stageHeight}px`,
          }}
        >
          {shapes.map((shape) => {
            const width = Math.max(
              1,
              Number(shape.width) || 1
            );

            const height = Math.max(
              1,
              Number(shape.height) || 1
            );

            const left =
              (Number(shape.x) || 0) -
              minX;

            const top =
              (Number(shape.y) || 0) -
              minY;

            const commonStyle = {
              left,
              top,
              width,
              height,
              zIndex:
                shape.zIndex ?? 1,
              opacity:
                shape.opacity ?? 1,
            };

            if (
              shape.type === "image"
            ) {
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
                        objectFit:
                          shape.objectFit ??
                          "contain",
                        borderStyle:
                          "solid",
                        borderColor:
                          shape.borderColor ??
                          "transparent",
                        borderWidth: `${
                          shape.borderWidth ??
                          0
                        }px`,
                        borderRadius: `${
                          shape.borderRadius ??
                          0
                        }px`,
                        boxSizing:
                          "border-box",
                      }}
                    />
                  ) : null}
                </div>
              );
            }

            if (
              shape.type === "venn"
            ) {
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
                        background:
                          shape.backgroundColor ??
                          "#8fc9ef",
                        borderColor:
                          shape.borderColor ??
                          "#2f5975",
                      }}
                    >
                      A
                    </div>

                    <div
                      className="resultVennCircle resultVennTwo"
                      style={{
                        background:
                          shape.backgroundColor ??
                          "#8fc9ef",
                        borderColor:
                          shape.borderColor ??
                          "#2f5975",
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
                    shape.type ===
                    "text"
                      ? "transparent"
                      : shape.backgroundColor ??
                        "#8fc9ef",

                  borderColor:
                    shape.borderColor ??
                    "#2f5975",

                  borderWidth: `${
                    shape.borderWidth ??
                    2
                  }px`,

                  borderStyle:
                    shape.type ===
                    "text"
                      ? "none"
                      : "solid",

                  borderRadius: `${
                    shape.borderRadius ??
                    4
                  }px`,

                  color:
                    shape.textColor ??
                    "#111111",

                  fontFamily:
                    shape.fontFamily ??
                    "Bell MT",

                  fontSize: `${
                    shape.fontSize ??
                    20
                  }px`,

                  fontWeight:
                    shape.fontWeight ??
                    "normal",

                  fontStyle:
                    shape.fontStyle ??
                    "normal",

                  textAlign:
                    shape.textAlign ??
                    "center",

                  textDecoration:
                    shape.textDecoration ??
                    "none",

                  textTransform:
                    shape.textTransform ??
                    "none",
                }}
              >
                <span>
                  {shape.text ?? ""}
                </span>
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

        <style jsx>
          {stateStyles}
        </style>
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
          <div className="errorIcon">
            !
          </div>

          <h1>
            Testni ochib bo‘lmadi
          </h1>

          <p>
            {error ||
              "Test topilmadi."}
          </p>

          <button
            type="button"
            onClick={() =>
              router.push("/test")
            }
          >
            Testlar bo‘limiga qaytish
          </button>
        </div>

        <style jsx>
          {stateStyles}
        </style>
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
            onClick={() =>
              router.push("/test")
            }
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

            <h1>
              {test.title}
            </h1>

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
                  <small>
                    {" "}daqiqa
                  </small>
                </strong>
              </div>

              <div className="info">
                <span>Holati</span>

                <strong className="green">
                  Tayyor
                </strong>
              </div>

              <div className="info">
                <span>Urinish</span>

                <strong
                  className={
                    canAttempt
                      ? "green"
                      : ""
                  }
                >
                  {attemptLoading
                    ? "Tekshirilmoqda..."
                    : attemptLimit ===
                      null
                    ? "Cheksiz"
                    : `${
                        attemptsRemaining ??
                        0
                      } ta qoldi`}
                </strong>
              </div>
            </div>

            <div className="instruction">
              <strong>
                Test tartibi
              </strong>

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
              disabled={
                attemptLoading ||
                !canAttempt
              }
            >
              {attemptLoading
                ? "URINISHLAR TEKSHIRILMOQDA..."
                : canAttempt
                ? "TESTNI BOSHLASH"
                : "URINISHLAR TUGAGAN"}
            </button>
          </div>
        </section>

        <style jsx>
          {pageStyles}
        </style>
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
            onClick={() =>
              router.push("/test")
            }
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

              <span>
                Natija
              </span>
            </div>

            <h1>
              {test.title}
            </h1>

            <p className="resultSubject">
              {test.subject}
            </p>

            <div className="resultGrid">
              <div className="resultItem">
                <span>
                  Jami savol
                </span>
                <strong>
                  {result.total}
                </strong>
              </div>

              <div className="resultItem correctResult">
                <span>
                  To‘g‘ri
                </span>
                <strong>
                  {result.correct}
                </strong>
              </div>

              <div className="resultItem wrongResult">
                <span>
                  Noto‘g‘ri
                </span>
                <strong>
                  {result.incorrect}
                </strong>
              </div>

              <div className="resultItem">
                <span>
                  Javobsiz
                </span>
                <strong>
                  {result.unanswered}
                </strong>
              </div>

              <div className="resultItem">
                <span>
                  Ball
                </span>

                <strong>
                  {result.earnedPoints}/
                  {result.totalPoints}
                </strong>
              </div>

              <div className="resultItem">
                <span>
                  Sarflangan vaqt
                </span>

                <strong>
                  {formatTime(
                    spentSeconds
                  )}
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
                onClick={() => {
                  if (
                    showReview &&
                    reviewMode === "all"
                  ) {
                    setShowReview(false);
                  } else {
                    setReviewMode("all");
                    setShowReview(true);
                  }
                }}
              >
                {showReview &&
                reviewMode === "all"
                  ? "Javoblarni yopish"
                  : "Barcha javoblarni ko‘rish"}
              </button>

              <button
                type="button"
                className="wrongOnlyButton"
                onClick={() => {
                  setReviewMode("wrong");
                  setShowReview(true);
                }}
              >
                Faqat xatolarni ko‘rish
              </button>

              <button
                type="button"
                className="againButton"
                onClick={startTest}
                disabled={
                  attemptLoading ||
                  !canAttempt
                }
              >
                {canAttempt
                  ? attemptLimit === null
                    ? "Qayta ishlash"
                    : `Qayta ishlash (${
                        attemptsRemaining ??
                        0
                      } ta qoldi)`
                  : "Urinishlar tugagan"}
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
              {test.questions
                .map(
                  (question, index) => ({
                    question,
                    index,
                  })
                )

                .filter(({ question }) => {
                  if (
                    reviewMode === "all"
                  ) {
                    return true;
                  }

                  const selectedId =
                    answers[question.id];

                  const selectedOption =
                    question.options?.find(
                      (option) =>
                        String(option.id) ===
                        String(selectedId)
                    );

                  return (
                    !selectedOption ||
                    !optionIsCorrect(
                      selectedOption
                    )
                  );
                })

                .map(
                  ({
                    question,
                    index,
                  }) => {
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
                          lang="uz"
                          className="questionHtml"
                          dangerouslySetInnerHTML={{
                            __html:
                              getQuestionText(
                                question
                              ) ||
                              "Savol matni mavjud emas.",
                          }}
                        />

                        {renderQuestionShapes(
                          question
                        )}

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

                              if (
                                correctOption
                              ) {
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
                                  className={className}
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

                        <div className="reviewAnswerSummary">
                          <div>
                            <strong>
                              Siz tanlagan:
                            </strong>{" "}
                            {selectedOption
                              ? getOptionText(
                                  selectedOption
                                ).replace(
                                  /<[^>]*>/g,
                                  ""
                                ) || "—"
                              : "Javob berilmagan"}
                          </div>

                          <div>
                            <strong>
                              To‘g‘ri javob:
                            </strong>{" "}
                            {(() => {
                              const correctOption =
                                question.options?.find(
                                  optionIsCorrect
                                );

                              return correctOption
                                ? getOptionText(
                                    correctOption
                                  ).replace(
                                    /<[^>]*>/g,
                                    ""
                                  ) || "—"
                                : "Ko‘rsatilmagan";
                            })()}
                          </div>

                          <div>
                            <strong>
                              Ball:
                            </strong>{" "}
                            {correct
                              ? Number(
                                  question.points
                                ) > 0
                                ? Number(
                                    question.points
                                  )
                                : 1
                              : 0}
                            /
                            {Number(
                              question.points
                            ) > 0
                              ? Number(
                                  question.points
                                )
                              : 1}
                          </div>
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

        <style jsx>
          {pageStyles}
        </style>
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
          <span>
            {test.subject}
          </span>

          <strong>
            {test.title}
          </strong>
        </div>

        <div className="saveIndicatorWrap">
          <span
            className={
              isOnline
                ? "onlineDot"
                : "offlineDot"
            }
          />

          <span>
            {isOnline
              ? saveState === "saving"
                ? "Saqlanmoqda..."
                : "Saqlandi"
              : "Internet yo‘q · lokal saqlandi"}
          </span>
        </div>

        <div
          className={
            remainingSeconds <= 300
              ? "timer timerDanger"
              : "timer"
          }
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
      </header>

      <section className="progressPanel">
        <div className="progressInformation">
          <strong>
            {answeredCount} /{" "}
            {test.questions.length} javob
          </strong>

          <span>
            {progress}%
          </span>
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
        <aside className="navigator">
          <h3>
            Savollar
          </h3>

          <div className="questionNumbers">
            {test.questions.map(
              (
                question,
                index
              ) => {
                const answered =
                  !!answers[
                    question.id
                  ];

                return (
                  <button
                    key={question.id}
                    type="button"
                    className={[
                      "numberButton",

                      currentIndex ===
                      index
                        ? "currentNumber"
                        : "",

                      answered
                        ? "answeredNumber"
                        : "",

                      flagged[
                        question.id
                      ]
                        ? "flaggedNumber"
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
              <span className="legendFlagged" />
              Belgilangan
            </div>

            <div>
              <span className="legendEmpty" />
              Javobsiz
            </div>
          </div>

          <button
            type="button"
            className="finishSideButton"
            onClick={() =>
              finishTest(false)
            }
          >
            TESTNI YAKUNLASH
          </button>
        </aside>

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

                <div className="questionTopActions">
                  <button
                    type="button"
                    className={
                      flagged[
                        currentQuestion.id
                      ]
                        ? "flagButton flagButtonActive"
                        : "flagButton"
                    }
                    onClick={() =>
                      toggleFlag(
                        currentQuestion.id
                      )
                    }
                    title="Bu savolga keyin qaytish uchun belgilang"
                  >
                    ⚑{" "}
                    {flagged[
                      currentQuestion.id
                    ]
                      ? "BELGILANGAN"
                      : "BELGILASH"}
                  </button>

                  <p>
                    {currentIndex + 1} /{" "}
                    {test.questions.length}
                  </p>
                </div>
              </div>

              <div className="questionContent">
                <div className="question3DCard">
                  <div className="question3DLabel">
                    SAVOL MATNI
                  </div>

                  <div
                    lang="uz"
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

                {renderQuestionShapes(
                  currentQuestion
                )}

                <div className="options">
                  {(
                    currentQuestion.options ||
                    []
                  ).map(
                    (
                      option,
                      optionIndex
                    ) => {
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
                              65 +
                                optionIndex
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
                    }
                  )}
                </div>
              </div>

              <div className="questionActions">
                <button
                  type="button"
                  className="previousButton"
                  disabled={
                    currentIndex === 0
                  }
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

      {zoomQuestionId &&
        (() => {
          const zoomQuestion =
            test.questions.find(
              (q) =>
                q.id ===
                zoomQuestionId
            );

          if (!zoomQuestion) {
            return null;
          }

          return (
            <div
              className="zoomOverlay"
              role="dialog"
              aria-modal="true"
              onClick={() =>
                setZoomQuestionId(null)
              }
            >
              <div
                className="zoomPanel"
                onClick={(event) =>
                  event.stopPropagation()
                }
              >
                <button
                  type="button"
                  className="zoomClose"
                  onClick={() =>
                    setZoomQuestionId(null)
                  }
                  aria-label="Yopish"
                >
                  ×
                </button>

                <div className="zoomTitle">
                  Savol tasviri · kattalashtirilgan
                </div>

                {renderQuestionShapes(
                  zoomQuestion,
                  true
                )}
              </div>
            </div>
          );
        })()}

      <style jsx>
        {pageStyles}
      </style>
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

    box-shadow:
      0 4px 0 #555;

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
    grid-template-columns:
      repeat(4, 1fr);

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

    background:
      rgba(255,255,255,.7);
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

    box-shadow:
      0 4px 0 #555;
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

    box-shadow:
      0 5px 0 #555d61;
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

    transition:
      width .25s ease;
  }

  /* TEST LAYOUT */

  .testLayout {
    width: min(1500px, 98%);
    margin: 35px auto 0;

    display: grid;

    grid-template-columns:
      270px minmax(0, 1fr);

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
    grid-template-columns:
      repeat(4, 1fr);

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

  .flaggedNumber {
    border-color: #a66a00;

    background:
      linear-gradient(#fff0b8, #e9b84f);
  }

  .currentNumber.flaggedNumber {
    outline-color: #43b7ee;
  }

  .legend {
    margin-top: 25px;
    padding: 15px;

    border-radius: 10px;

    background:
      rgba(255,255,255,.9);

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

  .legendFlagged {
    background: #e9b84f;
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

    box-shadow:
      0 4px 0 #831515;

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
      linear-gradient(#a9e5ff, #58a8d7);

    border-bottom:
      3px solid #174461;
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

  .questionTopActions {
    display: flex !important;
    align-items: center;
    gap: 12px !important;
  }

  .flagButton {
    min-height: 38px;
    padding: 0 14px;

    border: 2px solid #805600;
    border-radius: 9px;

    background:
      linear-gradient(#fff8d8, #e8c56a);

    box-shadow:
      0 3px 0 #805600;

    color: #624200;
    font-weight: 800;
  }

  .flagButtonActive {
    background:
      linear-gradient(#ffe68a, #e4a92f);
  }

  .questionTop p {
    margin: 0;
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

    padding:
      42px 34px 32px;

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

    border:
      1px solid rgba(255,255,255,.82);

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

  /* =====================================================
     SAVOL MATNI
     QORA + IKKI CHETI TEKIS
  ===================================================== */

  .questionHtml {
    width: 100%;
    max-width: 100%;

    margin: 0;

    color: #000000 !important;

    direction: ltr;

    text-align: justify !important;
    text-align-last: left !important;

    text-justify: inter-word;

    font-family:
      "Bell MT",
      "Times New Roman",
      serif;

    font-size:
      clamp(22px, 2vw, 30px);

    line-height: 1.58;

    font-weight: 400;

    letter-spacing: normal !important;
    word-spacing: normal !important;

    white-space: normal !important;

    word-break: normal !important;

    overflow-wrap: normal;

    hyphens: auto;

    -webkit-hyphens: auto;

    text-shadow:
      0 1px 0 rgba(255,255,255,.9);
  }

  /*
    SAVOL ICHIDAGI HAR QANDAY HTML RANGINI
    MAJBURAN QORA QILADI
  */

  .questionHtml :global(*) {
    color: #000000 !important;

    border-color: inherit;

    letter-spacing: inherit;

    word-spacing: inherit;
  }

  /*
    Ba'zi importlarda <font color=""> kelishi mumkin.
  */

  .questionHtml :global(font) {
    color: #000000 !important;
  }

  /*
    Inline style bilan rang kelgan bo‘lsa ham qora.
  */

  .questionHtml :global([style]) {
    color: #000000 !important;
  }

  .questionHtml :global(p) {
    width: 100%;

    margin: 0 0 16px;

    padding: 0;

    color: #000000 !important;

    text-align: justify !important;
    text-align-last: left !important;

    text-justify: inter-word;

    letter-spacing: normal !important;
    word-spacing: normal !important;

    white-space: normal !important;

    word-break: normal !important;

    overflow-wrap: normal;

    hyphens: auto;

    -webkit-hyphens: auto;
  }

  .questionHtml :global(p:last-child) {
    margin-bottom: 0;
  }

  .questionHtml :global(div) {
    max-width: 100%;

    color: #000000 !important;

    text-align: justify !important;
    text-align-last: left !important;

    text-justify: inter-word;

    letter-spacing: normal !important;
    word-spacing: normal !important;

    white-space: normal !important;

    word-break: normal !important;

    overflow-wrap: normal;

    hyphens: auto;

    -webkit-hyphens: auto;
  }

  .questionHtml :global(span) {
    color: #000000 !important;

    letter-spacing: normal !important;
    word-spacing: normal !important;

    white-space: normal !important;
  }

  /*
    QALIN
  */

  .questionHtml :global(strong),
  .questionHtml :global(b) {
    color: #000000 !important;

    font-weight: 800 !important;
  }

  /*
    KURSIV
  */

  .questionHtml :global(i),
  .questionHtml :global(em) {
    color: #000000 !important;

    font-style: italic !important;
  }

  /*
    QALIN + KURSIV
  */

  .questionHtml :global(strong i),
  .questionHtml :global(strong em),
  .questionHtml :global(b i),
  .questionHtml :global(b em) {
    color: #000000 !important;

    font-weight: 800 !important;

    font-style: italic !important;
  }

  /*
    TAGI CHIZILGAN
  */

  .questionHtml :global(u) {
    color: #000000 !important;

    text-decoration:
      underline;
  }

  /*
    SARLAVHALAR
  */

  .questionHtml :global(h1),
  .questionHtml :global(h2),
  .questionHtml :global(h3),
  .questionHtml :global(h4),
  .questionHtml :global(h5),
  .questionHtml :global(h6) {
    color: #000000 !important;

    font-weight: 800 !important;

    letter-spacing: normal !important;
    word-spacing: normal !important;

    text-align: justify !important;
    text-align-last: left !important;
  }

  /*
    RO‘YXAT
  */

  .questionHtml :global(ul),
  .questionHtml :global(ol) {
    width: 100%;

    margin: 14px 0 18px;

    padding-left: 38px;

    color: #000000 !important;
  }

  .questionHtml :global(li) {
    margin: 7px 0;

    color: #000000 !important;

    text-align: justify !important;
    text-align-last: left !important;

    text-justify: inter-word;

    letter-spacing: normal !important;
    word-spacing: normal !important;

    white-space: normal !important;

    word-break: normal !important;

    hyphens: auto;

    -webkit-hyphens: auto;
  }

  /*
    LINK HAM QORA
  */

  .questionHtml :global(a) {
    color: #000000 !important;

    font-weight: 700;

    text-decoration:
      underline;

    border-bottom: none;
  }

  /*
    BR
  */

  .questionHtml :global(br) {
    display: initial;
  }

  /*
    RASM
  */

  .questionHtml :global(img),
  .optionText :global(img) {
    max-width: 100%;
    height: auto;
  }

  /*
    JADVAL
  */

  .questionHtml :global(table),
  .optionText :global(table) {
    width: auto;
    max-width: 100%;

    border-collapse:
      collapse;
  }

  .questionHtml :global(th),
  .questionHtml :global(td),
  .optionText :global(th),
  .optionText :global(td) {
    padding: 8px 10px;

    border:
      1px solid #555;

    vertical-align: top;
  }

  .questionHtml :global(th),
  .questionHtml :global(td) {
    color: #000000 !important;
  }

  .questionHtml :global(th) {
    font-weight: 800;
  }

  /* SHAPES */

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

    background:
      transparent;
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

  /* OPTIONS */

  .options {
    display: grid;

    gap: 15px;
  }

  .option {
    width: 100%;
    min-height: 75px;

    padding: 12px 18px;

    display: grid;

    grid-template-columns:
      48px minmax(0,1fr) 35px;

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

    transform:
      translateY(-1px);
  }

  .selectedOption {
    border:
      3px solid #168fc9;

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

    border:
      2px solid #174461;

    border-radius: 50%;

    background:
      linear-gradient(
        #b8ecff,
        #58a8d7
      );

    color: #073b68;

    font-weight: 700;
  }

  .optionText {
    min-width: 0;

    direction: ltr;

    text-align: left;

    color: #000000 !important;

    font-size: 17px;

    line-height: 1.5;

    letter-spacing: normal !important;

    word-spacing: normal !important;

    white-space: normal;

    word-break: normal;

    overflow-wrap:
      break-word;
  }

  .optionText :global(*) {
    color: #000000 !important;
  }

  .optionText :global([style]),
  .optionText :global(font) {
    color: #000000 !important;
  }

  .optionText :global(strong),
  .optionText :global(b) {
    color: #000000 !important;

    font-weight:
      800 !important;
  }

  .optionText :global(i),
  .optionText :global(em) {
    color: #000000 !important;

    font-style:
      italic !important;
  }

  .radio {
    color: #0879b2;

    text-align: center;

    font-size: 25px;
  }

  /* ACTIONS */

  .questionActions {
    padding:
      0 25px 28px;

    display: flex;

    justify-content:
      space-between;

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
    border:
      2px solid #555;

    background:
      linear-gradient(#fff, #bbb);

    box-shadow:
      0 4px 0 #555;
  }

  .nextButton {
    margin-left: auto;

    border:
      2px solid #174461;

    background:
      linear-gradient(
        #b8ecff,
        #58a8d7
      );

    box-shadow:
      0 4px 0 #17415c;

    color: #073b68;
  }

  .finishButton {
    margin-left: auto;

    border:
      2px solid #277b49;

    background:
      linear-gradient(
        #c6f1d3,
        #68c888
      );

    box-shadow:
      0 4px 0 #277144;

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

    border:
      8px solid #168fc9;

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
      repeat(3, 1fr);

    gap: 12px;
  }

  .resultItem {
    min-height: 72px;

    padding: 10px;

    display: flex;

    flex-direction: column;

    align-items: center;
    justify-content: center;

    border:
      1px solid #999;

    border-radius: 10px;

    background:
      rgba(255,255,255,.7);
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

    border:
      2px solid #168fc9;

    border-radius: 12px;

    background:
      #dff5ff;

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
    border:
      2px solid #174461;

    background:
      linear-gradient(
        #b8ecff,
        #58a8d7
      );

    box-shadow:
      0 4px 0 #17415c;

    color: #073b68;
  }

  .againButton {
    border:
      2px solid #277b49;

    background:
      linear-gradient(
        #c6f1d3,
        #68c888
      );

    box-shadow:
      0 4px 0 #277144;

    color: #125a32;
  }

  /* REVIEW */

  .reviewQuestion {
    margin-bottom: 25px;

    padding: 25px;

    border:
      2px solid #777;

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

    border:
      1px solid #aaa;

    border-radius: 8px;

    background: #eee;
  }

  .correctOption {
    border-color: #3d9661;

    background:
      #d8f1df;
  }

  .selectedWrong {
    border-color: #b93333;

    background:
      #f6dada;
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

    background:
      #d8f1df;
  }

  .wrongStatus {
    color: #8c1818;

    background:
      #f6dada;
  }

  .saveIndicatorWrap {
    margin-left: auto;

    min-height: 42px;

    padding: 9px 14px;

    display: flex;

    align-items: center;

    gap: 8px;

    border:
      1px solid #6f7b82;

    border-radius: 11px;

    background:
      rgba(255,255,255,.78);

    font-size: 13px;

    font-weight: 700;

    white-space: nowrap;
  }

  .onlineDot,
  .offlineDot {
    width: 10px;
    height: 10px;

    border-radius: 50%;

    flex: 0 0 auto;
  }

  .onlineDot {
    background: #25944d;
  }

  .offlineDot {
    background: #b32929;
  }

  .shapeResultClickable {
    cursor: zoom-in;

    border-radius: 12px;

    transition:
      box-shadow .15s ease,
      transform .15s ease;
  }

  .shapeResultClickable:hover {
    box-shadow:
      0 0 0 3px rgba(22,143,201,.18);
  }

  .zoomOverlay {
    position: fixed;

    inset: 0;

    z-index: 9999;

    padding: 24px;

    display: flex;

    align-items: center;
    justify-content: center;

    background:
      rgba(13,20,25,.88);

    backdrop-filter:
      blur(5px);
  }

  .zoomPanel {
    position: relative;

    width:
      min(1200px, 96vw);

    max-height: 92vh;

    overflow: auto;

    padding:
      64px 28px 28px;

    border:
      2px solid #79c7ee;

    border-radius: 20px;

    background:
      linear-gradient(#fff, #e9edf0);

    box-shadow:
      0 18px 60px rgba(0,0,0,.45);
  }

  .zoomTitle {
    position: absolute;

    top: 20px;
    left: 28px;

    color: #073b68;

    font-size: 18px;

    font-weight: 800;
  }

  .zoomClose {
    position: absolute;

    top: 14px;
    right: 16px;

    width: 42px;
    height: 42px;

    border: 0;

    border-radius: 50%;

    background:
      #25343d;

    color: white;

    font-size: 28px;

    line-height: 1;
  }

  .shapeResultZoomed {
    min-height: 100px;

    overflow: auto;

    margin-bottom: 0;
  }

  .wrongOnlyButton {
    border:
      2px solid #8e1515;

    background:
      linear-gradient(#ffd7d7, #ef8d8d);

    box-shadow:
      0 4px 0 #831515;

    color: #711313;
  }

  .reviewAnswerSummary {
    margin-top: 15px;

    padding: 14px;

    display: grid;

    gap: 7px;

    border:
      1px solid #9aa5ac;

    border-radius: 9px;

    background:
      #f4f7f8;

    line-height: 1.45;
  }

  /* RESPONSIVE */

  @media (max-width: 900px) {

    .introInformation {
      grid-template-columns:
        repeat(2, 1fr);
    }

    .question3DCard {
      padding:
        36px 22px 24px;

      border-radius: 17px;
    }

    .question3DLabel {
      left: 20px;

      min-width: 135px;

      font-size: 12px;
    }

    .questionHtml {
      font-size: 21px;

      line-height: 1.55;
    }

    .testLayout {
      grid-template-columns:
        1fr;
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
      padding:
        10px 6px 50px;
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

      padding:
        8px 12px;

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

      padding:
        8px 12px;
    }

    .timer strong {
      font-size: 24px;
    }

    .progressPanel {
      width: 100%;

      margin-top: 18px;

      padding:
        12px 14px;
    }

    .progressTrack {
      height: 10px;
    }

    .panel,
    .reviewPanel {
      width: 100%;

      margin-top: 65px;

      padding:
        55px 8px 15px;

      border-radius: 18px;
    }

    .floatingTitle {
      top: -27px;

      min-width: 190px;

      min-height: 52px;

      padding:
        7px 18px;

      font-size: 20px;

      border-radius: 12px;
    }

    .introCard,
    .resultBox,
    .reviewInner {
      padding:
        16px 10px;

      border-radius:
        13px;
    }

    .introCard h1,
    .resultBox h1 {
      margin:
        8px 0 10px;

      font-size: 25px;
    }

    .subject,
    .resultSubject {
      font-size: 17px;
    }

    .description {
      margin-bottom:
        18px;

      font-size: 15px;

      line-height: 1.45;
    }

    .introInformation {
      margin:
        18px 0;

      grid-template-columns:
        repeat(2, minmax(0, 1fr));

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
      margin:
        17px 0;

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

      grid-template-columns:
        1fr;

      gap: 18px;
    }

    .navigator {
      position: static;

      padding:
        16px 12px;
    }

    .navigator h3 {
      margin-bottom: 12px;

      font-size: 19px;
    }

    .questionNumbers {
      grid-template-columns:
        repeat(5, 1fr);

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

      padding:
        10px 14px;
    }

    .questionTop strong {
      width: 36px;
      height: 36px;

      font-size: 18px;
    }

    .questionTopActions {
      width: auto;

      flex-wrap: wrap;

      justify-content:
        flex-end;
    }

    .flagButton {
      min-height: 34px;

      padding:
        0 10px;

      font-size: 11px;
    }

    .questionContent {
      margin: 9px;

      padding:
        16px 9px;
    }

    .question3DCard {
      margin-bottom: 25px;

      padding:
        32px 15px 20px;

      border-radius: 15px;
    }

    .question3DLabel {
      top: -16px;
      left: 14px;

      min-width: 120px;
      min-height: 34px;

      padding:
        5px 12px;

      font-size: 11px;
    }

    .questionHtml {
      font-size: 18px;

      line-height: 1.5;
    }

    .options {
      gap: 10px;
    }

    .option {
      min-height: 58px;

      grid-template-columns:
        38px minmax(0,1fr) 24px;

      gap: 8px;

      padding: 8px;
    }

    .optionLetter {
      width: 34px;

      height: 34px;
    }

    .optionText {
      font-size: 15px;

      line-height: 1.4;
    }

    .radio {
      font-size: 21px;
    }

    .questionActions {
      position: sticky;

      bottom: 0;

      z-index: 30;

      padding:
        10px 9px 14px;

      flex-direction: row;

      gap: 8px;

      background:
        rgba(55,61,65,.96);

      border-top:
        1px solid rgba(255,255,255,.25);

      backdrop-filter:
        blur(10px);
    }

    .questionActions button {
      flex: 1;

      width: auto;

      min-width: 0;

      min-height: 48px;

      padding:
        0 8px;

      font-size: 13px;
    }

    .resultCircle {
      width: 120px;

      height: 120px;

      margin:
        0 auto 15px;

      border-width: 6px;
    }

    .resultCircle strong {
      font-size: 32px;
    }

    .resultCircle span {
      font-size: 14px;
    }

    .resultGrid {
      margin:
        18px 0;

      grid-template-columns:
        repeat(2, minmax(0, 1fr));

      gap: 8px;
    }

    .resultItem {
      min-height: 70px;

      padding:
        8px 6px;
    }

    .resultItem span {
      margin-bottom: 4px;

      font-size: 13px;
    }

    .resultItem strong {
      font-size: 21px;
    }

    .resultMessage {
      margin:
        15px 0;

      padding:
        12px 10px;

      font-size: 16px;
    }

    .resultActions {
      gap: 9px;
    }

    .resultActions button {
      width: 100%;

      min-height: 48px;

      padding:
        0 12px;
    }

    .reviewQuestion {
      margin-bottom: 15px;

      padding:
        14px 10px;
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

    .saveIndicatorWrap {
      width: 100%;

      margin-left: 0;

      justify-content:
        center;
    }

    .zoomOverlay {
      padding: 8px;
    }

    .zoomPanel {
      width: 100%;

      max-height: 96vh;

      padding:
        58px 10px 16px;

      border-radius: 14px;
    }

    .zoomTitle {
      left: 14px;

      font-size: 15px;
    }

    .reviewAnswerSummary {
      padding: 10px;

      font-size: 13px;
    }
  }
`;
