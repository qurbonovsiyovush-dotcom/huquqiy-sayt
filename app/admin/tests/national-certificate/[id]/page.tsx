"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";
import QuestionDesigner from "@/components/national-certificate/QuestionDesigner";

type OptionKey =
  | "A"
  | "B"
  | "C"
  | "D";

type ApiOption = {
  id?: string;
  option_key?: OptionKey;
  key?: OptionKey;
  option_text?: string;
  text?: string;
  option_html?: string;
  html?: string;
  is_correct?: boolean;
  isCorrect?: boolean;
};

type ApiAcceptedAnswer = {
  id?: string;
  answer_text?: string;
  normalized_answer?: string;
};

type ApiQuestion = {
  id?: string;
  question_number: number;
  question_type:
    | "closed"
    | "open";
  question_text?: string;
  question_html?: string;
  points?: number;
  options?: ApiOption[];
  acceptedAnswers?:
    | ApiAcceptedAnswer[]
    | string[];
};

type TestData = {
  id: string;
  title: string;
  description?: string;
  status:
    | "draft"
    | "published";
  duration_minutes: number;
  attempt_limit:
    | number
    | null;
  questions: ApiQuestion[];
};

type EditorOption = {
  key: OptionKey;
  text: string;
  html: string;
  isCorrect: boolean;
};

const KEYS: OptionKey[] = [
  "A",
  "B",
  "C",
  "D",
];

function emptyOptions(): EditorOption[] {
  return KEYS.map(
    (key) => ({
      key,
      text: "",
      html: "",
      isCorrect: false,
    })
  );
}

function escapeHtml(
  value: string
) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function plainTextFromHtml(
  html: string
) {
  if (
    typeof document ===
    "undefined"
  ) {
    return String(html ?? "")
      .replace(
        /<br\s*\/?>/gi,
        "\n"
      )
      .replace(
        /<\/(div|p|li)>/gi,
        "\n"
      )
      .replace(
        /<[^>]+>/g,
        " "
      )
      .replace(
        /&nbsp;/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();
  }

  const box =
    document.createElement(
      "div"
    );

  box.innerHTML =
    html || "";

  /*
    Rasm / Venn / shakl ichidagi
    yozuvlarni question_text ga
    qo‘shmaymiz. Ular question_html
    ichida alohida saqlanadi.
  */
  box
    .querySelectorAll(
      "[data-object-id]"
    )
    .forEach(
      (node) =>
        node.remove()
    );

  return (
    box.innerText || ""
  )
    .replace(
      /\u00a0/g,
      " "
    )
    .replace(
      /[ \t]+\n/g,
      "\n"
    )
    .replace(
      /\n[ \t]+/g,
      "\n"
    )
    .replace(
      /\n{3,}/g,
      "\n\n"
    )
    .trim();
}

function initialHtml(
  question?: ApiQuestion
) {
  if (
    question?.question_html?.trim()
  ) {
    return question.question_html;
  }

  const text =
    question?.question_text || "";

  return `<div>${escapeHtml(
    text
  ).replace(
    /\n/g,
    "<br>"
  )}</div>`;
}

/*
  Admin qoralama muharririda foydalanuvchi savol HTMLini
  qo‘lda o‘zgartirganini belgilaymiz.

  Public sahifa shu belgini ko‘rsa, avtomatik PDF formatlovchi
  eski holatni qayta majburlamaydi.
*/
function markUserEditedHtml(
  html: string
) {
  const raw =
    String(html || "").trim();

  if (!raw) {
    return raw;
  }

  if (
    typeof document ===
    "undefined"
  ) {
    return `<div data-user-edited="true">${raw}</div>`;
  }

  const box =
    document.createElement(
      "div"
    );

  box.innerHTML =
    raw;

  const layout =
    box.querySelector<HTMLElement>(
      '[data-pdf-question-layout="true"]'
    );

  if (layout) {
    layout.setAttribute(
      "data-user-edited",
      "true"
    );

    return box.innerHTML;
  }

  const first =
    box.firstElementChild as
      | HTMLElement
      | null;

  if (
    first &&
    box.childElementCount === 1
  ) {
    first.setAttribute(
      "data-user-edited",
      "true"
    );

    return box.innerHTML;
  }

  return `<div data-user-edited="true">${raw}</div>`;
}

async function readJson(
  response: Response
) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export default function NationalCertificateTestEditorPage() {
  const params = useParams();
  const router = useRouter();

  const rawId =
    params?.id;

  const testId =
    Array.isArray(rawId)
      ? rawId[0]
      : String(
          rawId || ""
        );

  const [test, setTest] =
    useState<TestData | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [
    savingSettings,
    setSavingSettings,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  /*
    Qoralamada qo‘lda kiritilgan o‘zgarishlar uchun dirty flag.
    Savol saqlangach false bo‘ladi.
  */
  const [dirty, setDirty] =
    useState(false);

  const [
    currentNumber,
    setCurrentNumber,
  ] = useState(1);

  const [questionHtml, setQuestionHtml] =
    useState("");

  const [questionText, setQuestionText] =
    useState("");

  const [points, setPoints] =
    useState("1");

  const [options, setOptions] =
    useState<EditorOption[]>(
      emptyOptions()
    );

  const [
    acceptedAnswers,
    setAcceptedAnswers,
  ] = useState<string[]>([
    "",
  ]);

  const [title, setTitle] =
    useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [duration, setDuration] =
    useState("90");

  const [
    attemptLimit,
    setAttemptLimit,
  ] = useState("");

  const currentType =
    currentNumber <= 35
      ? "closed"
      : "open";

  const questionMap =
    useMemo(() => {
      return new Map(
        (test?.questions || []).map(
          (question) => [
            Number(
              question.question_number
            ),
            question,
          ]
        )
      );
    }, [test]);

  async function loadTest() {
    if (!testId) {
      setError(
        "Test ID topilmadi."
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          `/api/national-certificate/tests/${encodeURIComponent(
            testId
          )}`,
          {
            method: "GET",
            cache: "no-store",
            credentials:
              "include",
          }
        );

      const data =
        await readJson(
          response
        );

      if (
        !response.ok ||
        !data.success ||
        !data.test
      ) {
        throw new Error(
          data.message ||
            "Testni yuklab bo‘lmadi."
        );
      }

      const loaded =
        data.test as TestData;

      setTest(loaded);
      setTitle(
        loaded.title || ""
      );
      setDescription(
        loaded.description || ""
      );
      setDuration(
        String(
          loaded.duration_minutes ||
            90
        )
      );
      setAttemptLimit(
        loaded.attempt_limit ==
          null
          ? ""
          : String(
              loaded.attempt_limit
            )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Testni yuklashda xatolik."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTest();
  }, [testId]);

  useEffect(() => {
    if (!test) return;

    const question =
      questionMap.get(
        currentNumber
      );

    const html =
      initialHtml(
        question
      );

    setQuestionHtml(html);

    setQuestionText(
      question?.question_text ||
        plainTextFromHtml(
          html
        )
    );

    setPoints(
      String(
        question?.points ?? 1
      )
    );

    if (
      currentNumber <= 35
    ) {
      const source =
        Array.isArray(
          question?.options
        )
          ? question!.options!
          : [];

      setOptions(
        KEYS.map(
          (key, index) => {
            const found =
              source.find(
                (option) =>
                  (option.option_key ||
                    option.key) ===
                  key
              );

            return {
              key,
              text:
                found?.option_text ||
                found?.text ||
                "",
              html:
                found?.option_html ||
                found?.html ||
                "",
              isCorrect:
                found
                  ? found.is_correct ===
                      true ||
                    found.isCorrect ===
                      true
                  : false,
            };
          }
        )
      );
    } else {
      const raw =
        question
          ?.acceptedAnswers;

      const values =
        Array.isArray(raw)
          ? raw
              .map(
                (item) =>
                  typeof item ===
                  "string"
                    ? item
                    : item
                        ?.answer_text ||
                      ""
              )
              .filter(Boolean)
          : [];

      setAcceptedAnswers(
        values.length
          ? values
          : [""]
      );
    }

    setError("");
    setMessage("");
    setDirty(false);
  }, [
    test,
    questionMap,
    currentNumber,
  ]);

  async function saveSettings() {
    if (!test) return;

    const numericDuration =
      Number(duration);

    const numericAttempt =
      attemptLimit.trim() ===
      ""
        ? null
        : Number(
            attemptLimit
          );

    if (!title.trim()) {
      setError(
        "Test nomini kiriting."
      );
      return;
    }

    if (
      !Number.isInteger(
        numericDuration
      ) ||
      numericDuration <= 0
    ) {
      setError(
        "Test vaqtini musbat butun son bilan kiriting."
      );
      return;
    }

    if (
      numericAttempt !==
        null &&
      (!Number.isInteger(
        numericAttempt
      ) ||
        numericAttempt <= 0)
    ) {
      setError(
        "Urinishlar soni noto‘g‘ri."
      );
      return;
    }

    setSavingSettings(true);
    setError("");
    setMessage("");

    try {
      const response =
        await fetch(
          `/api/national-certificate/tests/${encodeURIComponent(
            test.id
          )}/settings`,
          {
            method: "PATCH",
            credentials:
              "include",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              title:
                title.trim(),
              description:
                description.trim(),
              durationMinutes:
                numericDuration,
              attemptLimit:
                numericAttempt,
            }),
          }
        );

      const data =
        await readJson(
          response
        );

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Ma’lumotlarni saqlab bo‘lmadi."
        );
      }

      setMessage(
        "Test ma’lumotlari saqlandi."
      );

      await loadTest();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Saqlashda xatolik."
      );
    } finally {
      setSavingSettings(false);
    }
  }

  function setCorrect(
    index: number
  ) {
    setOptions(
      (previous) =>
        previous.map(
          (option, i) => ({
            ...option,
            isCorrect:
              i === index,
          })
        )
    );

    setDirty(true);
  }

  async function saveQuestion(
    goNext = false
  ): Promise<boolean> {
    if (!test) return false;

    if (
      test.status !==
      "draft"
    ) {
      setError(
        "E’lon qilingan testni tahrirlab bo‘lmaydi."
      );
      return false;
    }

    const cleanHtml =
      questionHtml.trim();

    const cleanText =
      questionText.trim() ||
      plainTextFromHtml(
        cleanHtml
      );

    if (!cleanText) {
      setError(
        "Savol matnini kiriting."
      );
      return false;
    }

    const numericPoints =
      Number(points);

    if (
      !Number.isFinite(
        numericPoints
      ) ||
      numericPoints < 0
    ) {
      setError(
        "Savol bali noto‘g‘ri."
      );
      return false;
    }

    if (
      currentType ===
      "closed"
    ) {
      if (
        options.some(
          (option) =>
            !option.text.trim()
        )
      ) {
        setError(
          "A/B/C/D variantlarining barchasini kiriting."
        );
        return false;
      }

      if (
        options.filter(
          (option) =>
            option.isCorrect
        ).length !== 1
      ) {
        setError(
          "Aynan bitta to‘g‘ri javobni belgilang."
        );
        return false;
      }
    } else {
      const valid =
        acceptedAnswers
          .map(
            (answer) =>
              answer.trim()
          )
          .filter(Boolean);

      if (!valid.length) {
        setError(
          "Kamida bitta qabul qilinadigan javob kiriting."
        );
        return false;
      }
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const finalHtml =
        cleanHtml ||
        `<div>${escapeHtml(
          cleanText
        ).replace(
          /\n/g,
          "<br>"
        )}</div>`;

      const body =
        currentType ===
        "closed"
          ? {
              questionNumber:
                currentNumber,
              questionText:
                cleanText,
              questionHtml:
                finalHtml,
              points:
                numericPoints,
              options:
                options.map(
                  (option) => ({
                    key:
                      option.key,
                    text:
                      option.text.trim(),
                    html:
                      option.html,
                    isCorrect:
                      option.isCorrect,
                  })
                ),
            }
          : {
              questionNumber:
                currentNumber,
              questionText:
                cleanText,
              questionHtml:
                finalHtml,
              points:
                numericPoints,
              acceptedAnswers:
                acceptedAnswers
                  .map(
                    (answer) =>
                      answer.trim()
                  )
                  .filter(Boolean),
            };

      const response =
        await fetch(
          `/api/national-certificate/tests/${encodeURIComponent(
            test.id
          )}/questions`,
          {
            method: "POST",
            credentials:
              "include",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify(
                body
              ),
          }
        );

      const data =
        await readJson(
          response
        );

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            `${currentNumber}-savolni saqlab bo‘lmadi.`
        );
      }

      /*
        MUHIM:
        Oldingi kod save'dan keyin loadTest() chaqirib,
        editor state'ini serverdan qayta yuklardi. Shu paytda
        foydalanuvchi qo‘lda qilgan format ba’zan eski ko‘rinishga
        qaytib ketardi.

        Endi server muvaffaqiyatli saqlagach, lokal test state'ini
        aynan hozirgi HTML bilan yangilaymiz. Hech qanday avtomatik
        qayta formatlash yo‘q.
      */
      setTest(
        (previous) => {
          if (!previous) {
            return previous;
          }

          const savedQuestion:
            ApiQuestion = {
            id:
              questionMap.get(
                currentNumber
              )?.id ||
              data?.question?.id,
            question_number:
              currentNumber,
            question_type:
              currentType,
            question_text:
              cleanText,
            question_html:
              finalHtml,
            points:
              numericPoints,
            options:
              currentType ===
              "closed"
                ? options.map(
                    (
                      option
                    ) => ({
                      option_key:
                        option.key,
                      option_text:
                        option.text.trim(),
                      option_html:
                        option.html,
                      is_correct:
                        option.isCorrect,
                    })
                  )
                : [],
            acceptedAnswers:
              currentType ===
              "open"
                ? acceptedAnswers
                    .map(
                      (
                        answer
                      ) =>
                        answer.trim()
                    )
                    .filter(
                      Boolean
                    )
                : [],
          };

          const exists =
            previous.questions.some(
              (question) =>
                Number(
                  question.question_number
                ) ===
                currentNumber
            );

          return {
            ...previous,
            questions:
              exists
                ? previous.questions.map(
                    (question) =>
                      Number(
                        question.question_number
                      ) ===
                      currentNumber
                        ? savedQuestion
                        : question
                  )
                : [
                    ...previous.questions,
                    savedQuestion,
                  ].sort(
                    (a, b) =>
                      Number(
                        a.question_number
                      ) -
                      Number(
                        b.question_number
                      )
                  ),
          };
        }
      );

      setQuestionHtml(
        finalHtml
      );
      setQuestionText(
        cleanText
      );
      setDirty(false);

      setMessage(
        `${currentNumber}-savol saqlandi.`
      );

      if (
        goNext &&
        currentNumber < 45
      ) {
        setCurrentNumber(
          (number) =>
            number + 1
        );
      }

      return true;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Savolni saqlashda xatolik."
      );

      return false;
    } finally {
      setSaving(false);
    }
  }

  async function goToQuestion(
    nextNumber: number
  ) {
    const safeNumber =
      Math.max(
        1,
        Math.min(
          45,
          nextNumber
        )
      );

    if (
      safeNumber ===
      currentNumber
    ) {
      return;
    }

    /*
      Savolda qo‘lda o‘zgarish bo‘lsa, boshqa savolga o‘tishdan
      OLDIN avtomatik saqlaymiz. Saqlash xato qilsa joyidan
      siljimaydi.
    */
    if (
      dirty &&
      test?.status ===
        "draft"
    ) {
      const saved =
        await saveQuestion(
          false
        );

      if (!saved) {
        return;
      }
    }

    setCurrentNumber(
      safeNumber
    );
  }

  useEffect(() => {
    const handleBeforeUnload = (
      event: BeforeUnloadEvent
    ) => {
      if (!dirty) return;

      event.preventDefault();
      event.returnValue =
        "";
    };

    window.addEventListener(
      "beforeunload",
      handleBeforeUnload
    );

    return () =>
      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload
      );
  }, [dirty]);

  if (loading) {
    return (
      <main className="page">
        <div className="loading">
          Yuklanmoqda...
        </div>
        <style jsx>{styles}</style>
      </main>
    );
  }

  if (!test) {
    return (
      <main className="page">
        <div className="errorBox">
          {error ||
            "Test topilmadi."}
        </div>
        <style jsx>{styles}</style>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="topActions">
        <button
          type="button"
          onClick={() =>
            router.push(
              "/admin/tests/national-certificate"
            )
          }
        >
          ← Testlar
        </button>

        <div className="status">
          {test.status ===
          "draft"
            ? "QORALAMA"
            : "E’LON QILINGAN"}
        </div>
      </div>

      <section className="settingsPanel">
        <div className="sectionTitle">
          TESTNING ASOSIY MA’LUMOTLARI
        </div>

        <label>
          Test nomi
          <input
            value={title}
            onChange={(event) =>
              setTitle(
                event.target.value
              )
            }
          />
        </label>

        <label>
          Test haqida
          <textarea
            rows={3}
            value={description}
            onChange={(event) =>
              setDescription(
                event.target.value
              )
            }
          />
        </label>

        <div className="settingsGrid">
          <label>
            Test vaqti
            <input
              type="number"
              min="1"
              value={duration}
              onChange={(event) =>
                setDuration(
                  event.target.value
                )
              }
            />
          </label>

          <label>
            Urinishlar soni
            <input
              type="number"
              min="1"
              placeholder="Cheklanmagan"
              value={attemptLimit}
              onChange={(event) =>
                setAttemptLimit(
                  event.target.value
                )
              }
            />
          </label>

          <button
            type="button"
            className="primary"
            onClick={
              saveSettings
            }
            disabled={
              savingSettings
            }
          >
            {savingSettings
              ? "Saqlanmoqda..."
              : "Ma’lumotlarni saqlash"}
          </button>
        </div>
      </section>

      <div className="workspace">
        <aside className="navigator">
          <div className="navTitle">
            SAVOLLAR
          </div>

          <div className="questionGrid">
            {Array.from(
              { length: 45 },
              (_, index) =>
                index + 1
            ).map(
              (number) => {
                const exists =
                  questionMap.has(
                    number
                  );

                return (
                  <button
                    type="button"
                    key={number}
                    className={[
                      number ===
                      currentNumber
                        ? "active"
                        : "",
                      exists
                        ? "saved"
                        : "",
                      number > 35
                        ? "openQ"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() =>
                      void goToQuestion(
                        number
                      )
                    }
                  >
                    {number}
                  </button>
                );
              }
            )}
          </div>

          <div className="legend">
            <span>
              <i className="closedDot" />
              1–35 yopiq
            </span>
            <span>
              <i className="openDot" />
              36–45 ochiq
            </span>
            <span>
              <i className="savedDot" />
              Saqlangan
            </span>
          </div>
        </aside>

        <section className="editorPanel">
          <div className="questionHeader">
            <div>
              <b>
                {currentNumber}-savol
              </b>
              <span>
                {currentType ===
                "closed"
                  ? "Yopiq savol"
                  : "Ochiq savol"}
              </span>
            </div>

            <label className="points">
              Ball
              <input
                type="number"
                min="0"
                step="0.001"
                value={points}
                onChange={(event) => {
                setPoints(
                  event.target
                    .value
                );
                setDirty(true);
              }}
              />
            </label>
          </div>

          <div className="unifiedTitle">
            SAVOL MATNI — TO‘LIQ MUHARRIR
          </div>

          <p className="helper">
            Importda saqlangan qalin matn, rasm, Venn,
            jadval va shakllar shu yerning o‘zida ochiladi.
            Rasm/shaklni sudrash va 8 nuqtadan resize qilish mumkin.
          </p>

          <QuestionDesigner
            key={`${test.id}-${currentNumber}`}
            value={questionHtml}
            onChange={(html) => {
              const markedHtml =
                markUserEditedHtml(
                  html
                );

              setQuestionHtml(
                markedHtml
              );

              const plain =
                plainTextFromHtml(
                  markedHtml
                );

              setQuestionText(
                plain
              );

              setDirty(true);
            }}
          />

          {currentType ===
          "closed" ? (
            <section className="answers">
              <div className="sectionTitle">
                A/B/C/D VARIANTLAR
              </div>

              {options.map(
                (
                  option,
                  index
                ) => (
                  <div
                    className={
                      option.isCorrect
                        ? "optionRow correct"
                        : "optionRow"
                    }
                    key={option.key}
                  >
                    <div className="letter">
                      {option.key}
                    </div>

                    <textarea
                      rows={2}
                      value={
                        option.text
                      }
                      onChange={(
                        event
                      ) => {
                        setOptions(
                          (previous) =>
                            previous.map(
                              (
                                item,
                                i
                              ) =>
                                i ===
                                index
                                  ? {
                                      ...item,
                                      text:
                                        event
                                          .target
                                          .value,
                                    }
                                  : item
                            )
                        );
                        setDirty(true);
                      }}
                    />

                    <label className="correctChoice">
                      <input
                        type="radio"
                        name="correct"
                        checked={
                          option.isCorrect
                        }
                        onChange={() =>
                          setCorrect(
                            index
                          )
                        }
                      />
                      To‘g‘ri
                    </label>
                  </div>
                )
              )}
            </section>
          ) : (
            <section className="answers">
              <div className="sectionTitle">
                QABUL QILINADIGAN JAVOBLAR
              </div>

              {acceptedAnswers.map(
                (
                  answer,
                  index
                ) => (
                  <div
                    className="openAnswer"
                    key={index}
                  >
                    <span>
                      {index + 1}
                    </span>

                    <input
                      value={answer}
                      onChange={(
                        event
                      ) => {
                        setAcceptedAnswers(
                          (
                            previous
                          ) =>
                            previous.map(
                              (
                                value,
                                i
                              ) =>
                                i ===
                                index
                                  ? event
                                      .target
                                      .value
                                  : value
                            )
                        );
                        setDirty(true);
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => {
                        setAcceptedAnswers(
                          (
                            previous
                          ) =>
                            previous.length >
                            1
                              ? previous.filter(
                                  (
                                    _,
                                    i
                                  ) =>
                                    i !==
                                    index
                                )
                              : [""]
                        );
                        setDirty(true);
                      }}
                    >
                      ×
                    </button>
                  </div>
                )
              )}

              <button
                type="button"
                onClick={() => {
                setAcceptedAnswers(
                  (previous) => [
                    ...previous,
                    "",
                  ]
                );
                setDirty(true);
              }}
              >
                + Javob qo‘shish
              </button>
            </section>
          )}

          {error && (
            <div className="errorBox">
              {error}
            </div>
          )}

          {message && (
            <div className="successBox">
              {message}
            </div>
          )}

          <div className="bottomActions">
            <button
              type="button"
              onClick={() =>
                void goToQuestion(
                  currentNumber - 1
                )
              }
              disabled={
                currentNumber ===
                1
              }
            >
              ← Oldingi
            </button>

            <button
              type="button"
              className="primary"
              onClick={() =>
                saveQuestion(
                  false
                )
              }
              disabled={
                saving ||
                test.status !==
                  "draft"
              }
            >
              {saving
                ? "Saqlanmoqda..."
                : "Savolni saqlash"}
            </button>

            <button
              type="button"
              className="primary"
              onClick={() =>
                saveQuestion(true)
              }
              disabled={
                saving ||
                test.status !==
                  "draft" ||
                currentNumber ===
                  45
              }
            >
              Saqlab, keyingisiga →
            </button>
          </div>
        </section>
      </div>

      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
  .page {
    min-height: 100%;
    padding: 18px;
    background:
      linear-gradient(
        180deg,
        #e8f0f4,
        #d6e1e7
      );
    color: #10212a;
    font-family:
      Georgia,
      "Times New Roman",
      serif;
  }

  .topActions,
  .settingsPanel,
  .navigator,
  .editorPanel {
    border:
      2px solid #405966;
    border-radius: 14px;
    background:
      linear-gradient(
        180deg,
        #f8fbfc,
        #dce6eb
      );
    box-shadow:
      inset 0 3px 2px #fff,
      0 7px 0 #607984,
      0 10px 18px
        rgba(0,0,0,.18);
  }

  .topActions {
    max-width: 1320px;
    margin: 0 auto 16px;
    padding: 10px 14px;
    display: flex;
    justify-content:
      space-between;
    align-items: center;
  }

  button,
  input,
  textarea {
    font: inherit;
  }

  button {
    cursor: pointer;
    border:
      1.5px solid #45616e;
    border-radius: 8px;
    padding: 9px 14px;
    font-weight: 800;
    background:
      linear-gradient(
        180deg,
        #fff,
        #d8e3e8
      );
    box-shadow:
      inset 0 2px 2px #fff,
      0 3px 0 #81949d;
  }

  button:disabled {
    opacity: .45;
    cursor: not-allowed;
  }

  .primary,
  .sectionTitle,
  .navTitle,
  .unifiedTitle {
    color: #fff;
    background:
      linear-gradient(
        180deg,
        #42c4ff,
        #0789cf 58%,
        #006ca8
      );
    border:
      1px solid #245568;
    box-shadow:
      inset 0 3px 2px
        rgba(255,255,255,.65),
      0 4px 0 #1e536c;
  }

  .primary {
    padding:
      10px 18px;
  }

  .status {
    font-weight: 900;
    padding: 8px 14px;
    border-radius: 8px;
    background: #f0c541;
  }

  .settingsPanel {
    max-width: 1320px;
    margin: 0 auto 18px;
    padding: 14px;
  }

  .sectionTitle,
  .unifiedTitle,
  .navTitle {
    display: inline-block;
    padding: 8px 16px;
    border-radius: 8px;
    font-weight: 900;
  }

  label {
    display: grid;
    gap: 5px;
    margin-top: 12px;
    font-weight: 800;
  }

  input,
  textarea {
    width: 100%;
    box-sizing:
      border-box;
    border:
      1.5px solid #526c78;
    border-radius: 8px;
    background: #fff;
    padding: 10px;
    outline: none;
  }

  .settingsGrid {
    display: grid;
    grid-template-columns:
      1fr 1fr auto;
    gap: 12px;
    align-items: end;
  }

  .workspace {
    max-width: 1320px;
    margin: 0 auto;
    display: grid;
    grid-template-columns:
      210px minmax(0,1fr);
    gap: 16px;
    align-items: start;
  }

  .navigator {
    position: sticky;
    top: 12px;
    padding: 12px;
  }

  .navTitle {
    width: 100%;
    box-sizing:
      border-box;
    text-align: center;
    margin-bottom: 12px;
  }

  .questionGrid {
    display: grid;
    grid-template-columns:
      repeat(5,1fr);
    gap: 7px;
  }

  .questionGrid button {
    padding: 8px 4px;
    min-width: 0;
  }

  .questionGrid button.saved {
    background:
      linear-gradient(
        180deg,
        #d9ffd9,
        #75cf79
      );
  }

  .questionGrid button.openQ {
    border-color:
      #b49515;
  }

  .questionGrid button.active {
    color: #fff;
    background:
      linear-gradient(
        180deg,
        #43c8ff,
        #038ad1
      );
  }

  .legend {
    margin-top: 12px;
    display: grid;
    gap: 6px;
    font-size: 13px;
    font-weight: 700;
  }

  .legend span {
    display: flex;
    gap: 7px;
    align-items: center;
  }

  .legend i {
    width: 12px;
    height: 12px;
    border-radius: 3px;
    border:
      1px solid #314b57;
  }

  .closedDot {
    background: #fff;
  }

  .openDot {
    background: #f2c735;
  }

  .savedDot {
    background: #78d37d;
  }

  .editorPanel {
    padding: 14px;
    min-width: 0;
  }

  .questionHeader {
    display: flex;
    justify-content:
      space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 14px;
    padding: 10px 12px;
    border:
      1.5px solid #5b737e;
    border-radius: 10px;
    background:
      linear-gradient(
        180deg,
        #fff,
        #d8e3e8
      );
  }

  .questionHeader > div {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .questionHeader b {
    font-size: 21px;
  }

  .questionHeader span {
    padding: 5px 10px;
    border-radius: 8px;
    background: #bfeaff;
    font-weight: 800;
  }

  .points {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
  }

  .points input {
    width: 120px;
  }

  .unifiedTitle {
    margin-bottom: 8px;
  }

  .helper {
    margin:
      6px 0 10px;
    font-size: 13px;
    font-weight: 700;
    color: #405560;
  }

  .answers {
    margin-top: 16px;
    padding-top: 14px;
    border-top:
      2px solid #728993;
  }

  .optionRow {
    margin-top: 10px;
    padding: 9px;
    display: grid;
    grid-template-columns:
      48px minmax(0,1fr)
      100px;
    gap: 10px;
    align-items: center;
    border:
      1.5px solid #637b86;
    border-radius: 10px;
    background: #eef3f5;
  }

  .optionRow.correct {
    border-color: #199843;
    background: #e6fae9;
  }

  .letter {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 8px;
    color: #fff;
    font-size: 22px;
    font-weight: 900;
    background:
      linear-gradient(
        180deg,
        #36bfff,
        #037db9
      );
    box-shadow:
      inset 0 3px 2px
        rgba(255,255,255,.55),
      0 4px 0 #165a76;
  }

  .correctChoice {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
  }

  .correctChoice input {
    width: auto;
  }

  .openAnswer {
    margin-top: 10px;
    display: grid;
    grid-template-columns:
      36px minmax(0,1fr)
      42px;
    gap: 8px;
    align-items: center;
  }

  .openAnswer span {
    text-align: center;
    font-weight: 900;
  }

  .bottomActions {
    margin-top: 18px;
    display: flex;
    justify-content:
      space-between;
    gap: 10px;
    flex-wrap: wrap;
  }

  .errorBox,
  .successBox,
  .loading {
    max-width: 1320px;
    margin: 15px auto;
    padding: 12px 15px;
    border-radius: 10px;
    font-weight: 800;
  }

  .errorBox {
    border:
      1px solid #b83232;
    background: #ffeaea;
    color: #861919;
  }

  .successBox {
    border:
      1px solid #338b4a;
    background: #e8f9ed;
    color: #19642d;
  }

  .loading {
    border:
      1px solid #52717e;
    background: #fff;
  }

  @media (
    max-width: 900px
  ) {
    .workspace {
      grid-template-columns: 1fr;
    }

    .navigator {
      position: static;
    }

    .settingsGrid {
      grid-template-columns:
        1fr;
    }

    .optionRow {
      grid-template-columns:
        45px 1fr;
    }

    .correctChoice {
      grid-column:
        1 / -1;
    }
  }
`;
