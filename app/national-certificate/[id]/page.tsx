"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, useSearchParams } from "next/navigation";

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
  const searchParams = useSearchParams();

  const isAdminPreview =
    searchParams.get("preview") === "1";

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
      !isAdminPreview && testId
        ? `national-certificate-progress:${testId}`
        : "",
    [
      isAdminPreview,
      testId,
    ]
  );

  const currentQuestion =
    test?.questions[currentIndex] ??
    null;

  const questionHtmlRef =
    useRef<HTMLDivElement | null>(null);

  /*
    Saqlangan eski Venn HTML turli width/height/position qiymatlari bilan
    kelishi mumkin. Public sahifada uni bir xil, tabiiy document-flow
    ko‘rinishiga keltiramiz va Venn bilan keyingi matn orasidagi barcha
    bo‘sh spacer elementlarni olib tashlaymiz.

    MUHIM:
    Bu blok useLayoutEffect bilan ishlaydi. Sababi birinchi savol
    ekranga chizilishidan OLDIN "1.     matn" kabi ortiqcha bo‘shliqlar
    normallashtirilishi kerak. Aks holda test birinchi ochilganda eski
    bo‘shliq ko‘rinib, boshqa savolga o‘tib qaytilgandan keyingina
    tuzalib qolardi.
  */
  useLayoutEffect(() => {
    const root = questionHtmlRef.current;

    if (
      !root ||
      !currentQuestion?.questionHtml
    ) {
      return;
    }

    let frame1 = 0;
    let frame2 = 0;

    /*
      Word/editor orqali saqlangan ayrim savollarda:
      "1.     matn" ko‘rinishidagi ko‘p NBSP/tab/space qoladi.

      Ular ko‘pincha haqiqiy <ol><li> emas, oddiy <p>/<div>.
      Shu sabab faqat CSS list-style bilan tuzalmaydi.

      Render bo‘lgandan keyin:
      - NBSP/tab/ko‘p space -> bitta oddiy space;
      - 1. 2. 3. ... bilan boshlanuvchi satrga maxsus class;
      - keyingi qatorda matn raqam ostiga emas, matn ostiga tushadi.
    */
    const normalizeNumberedLines = () => {
      /*
        Agar admin qoralama muharririda savol qo‘lda o‘zgartirilgan
        bo‘lsa, foydalanuvchining HTML formatiga tegmaymiz.
        Bu belgi admin editor tomonidan saqlanadi.
      */
      if (
        root.querySelector(
          '[data-user-edited="true"]'
        )
      ) {
        return;
      }

      const leafBlocks =
        root.querySelectorAll<HTMLElement>(
          "p, div"
        );

      const cleanText = (value: string) =>
        String(value || "")
          .replace(/\u00a0/g, " ")
          .replace(/[\t\f\v ]{2,}/g, " ")
          .replace(/\s+\?/g, "?")
          .trim();

      const elementText = (element: HTMLElement) =>
        cleanText(element.textContent || "");

      const isLegalSourceText = (text: string) => {
        const normalized = text.toLowerCase();

        return (
          /^\s*\(/.test(text) &&
          (
            normalized.includes("konstituts") ||
            normalized.includes("kodeks") ||
            normalized.includes("qonun") ||
            normalized.includes("modda") ||
            normalized.includes("farmon") ||
            normalized.includes("qaror") ||
            normalized.includes("nizom") ||
            normalized.includes("holatiga ko")
          )
        );
      };

      const normalizeTextNodes = (element: HTMLElement) => {
        const walker =
          document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT
          );

        let node = walker.nextNode();

        while (node) {
          const textNode = node as Text;
          const original = textNode.nodeValue || "";
          const normalized = original
            .replace(/\u00a0/g, " ")
            .replace(/[\t\f\v ]{2,}/g, " ")
            .replace(/\s+\?/g, "?");

          if (normalized !== original) {
            textNode.nodeValue = normalized;
          }

          node = walker.nextNode();
        }
      };

      const addMarkerSpan = (
        element: HTMLElement,
        kind: "number" | "roman" | "letter"
      ) => {
        if (
          element.querySelector(
            ":scope .nc-list-marker"
          )
        ) {
          return;
        }

        const pattern =
          kind === "number"
            ? /^(\s*)(\d{1,3}[.)])(\s+)/u
            : kind === "roman"
            ? /^(\s*)([IVXLCDM]{1,8}[.)])(\s+)/u
            : /^(\s*)([a-z][.)])(\s+)/u;

        const walker =
          document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT
          );

        let node = walker.nextNode();

        while (node) {
          const textNode = node as Text;

          if (
            textNode.parentElement?.closest(
              ".nc-list-marker"
            )
          ) {
            node = walker.nextNode();
            continue;
          }

          const value = textNode.nodeValue || "";
          const match = value.match(pattern);

          if (!match) {
            node = walker.nextNode();
            continue;
          }

          const parent = textNode.parentNode;
          if (!parent) return;

          const fragment =
            document.createDocumentFragment();

          if (match[1]) {
            fragment.appendChild(
              document.createTextNode(match[1])
            );
          }

          const marker =
            document.createElement("strong");

          marker.className = "nc-list-marker";
          marker.textContent = match[2];
          fragment.appendChild(marker);
          fragment.appendChild(
            document.createTextNode(match[3])
          );

          const consumed =
            match[0].length;

          fragment.appendChild(
            document.createTextNode(
              value.slice(consumed)
            )
          );

          parent.replaceChild(
            fragment,
            textNode
          );

          return;
        }
      };

      leafBlocks.forEach((element) => {
        if (
          element.tagName === "DIV" &&
          element.querySelector(
            ":scope > div, :scope > p, :scope > ol, :scope > ul"
          )
        ) {
          return;
        }

        if (
          element.closest(
            ".nc-object, .nc-venn2, [data-kind='venn2']"
          )
        ) {
          return;
        }

        normalizeTextNodes(element);

        element.classList.remove(
          "nc-numbered-line",
          "nc-number-full-line",
          "nc-roman-line",
          "nc-letter-line",
          "nc-roman-full-line",
          "nc-source-line",
          "nc-final-question-line"
        );

        const visibleText =
          elementText(element);

        if (!visibleText) return;

        if (
          element.hasAttribute(
            "data-pdf-source-row"
          ) ||
          element.hasAttribute(
            "data-pdf-source"
          ) ||
          isLegalSourceText(visibleText)
        ) {
          element.classList.add(
            "nc-source-line"
          );
          return;
        }

        const numberMatch =
          visibleText.match(
            /^(\d{1,3}[.)])\s+(.+)$/u
          );

        if (numberMatch) {
          element.classList.add(
            "nc-numbered-line",
            "nc-number-full-line"
          );
          return;
        }

        const romanMatch =
          visibleText.match(
            /^([IVXLCDM]{1,8}[.)])\s+(.+)$/u
          );

        if (romanMatch) {
          element.classList.add(
            "nc-roman-line",
            "nc-roman-full-line"
          );
          return;
        }

        const letterMatch =
          visibleText.match(
            /^([a-z][.)])\s+(.+)$/u
          );

        if (letterMatch) {
          element.classList.add(
            "nc-letter-line"
          );
          return;
        }

        if (
          element.hasAttribute(
            "data-pdf-final-question"
          )
        ) {
          element.classList.add(
            "nc-final-question-line"
          );
        }
      });

      /*
        OCHIQ/KAZUS SAVOLLAR FIXI

        Oldingi importlarda yakuniy savol ba'zan:
          "Qarzdor ushbu majburiyatni"
          "necha kunlik muddat ...?"
        deb ikkiga bo‘linib qolgan.

        Bu yerda oxirgi savolni yana bitta to‘liq gapga yig‘amiz.
      */
      const finalQuestion =
        root.querySelector<HTMLElement>(
          "[data-pdf-final-question]"
        );

      if (finalQuestion) {
        normalizeTextNodes(finalQuestion);

        let finalText =
          elementText(finalQuestion);

        const caseLines: HTMLElement[] =
          Array.from(
            root.querySelectorAll<HTMLElement>(
              "[data-pdf-case-line]"
            )
          ) as HTMLElement[];

        /*
          19-savolga o‘xshash PDF holati:
          "I." markerining matni text-run tartibi sabab final savol
          boshiga o‘tib qolishi mumkin. Masalan:
          "kollektiv xavfsizlik ...; Qaysi ...?"

          Orphan I./II./1. marker topilsa, nuqtali vergulgacha bo‘lgan
          qismini yana o‘sha markerga qaytaramiz.
        */
        const orphanStructuredLine =
          (
            Array.from(
              root.querySelectorAll<HTMLElement>(
                '[data-pdf-roman-line], [data-pdf-number-line], [data-pdf-case-line]'
              )
            ) as HTMLElement[]
          ).find((element) =>
            /^(?:(?:\d{1,3})|(?:[IVXLCDM]{1,8}))[.)]$/u.test(
              elementText(element)
            )
          ) || null;

        if (orphanStructuredLine) {
          const misplaced = finalText.match(
            /^(.+?[;:])\s*((?:qaysi|qanday|qancha|necha|nechta|kim|nima|qachon|qayerda|ushbu|mazkur)\b[\s\S]*\?)$/iu
          );

          if (misplaced) {
            const marker =
              elementText(
                orphanStructuredLine
              );

            orphanStructuredLine.textContent =
              cleanText(
                `${marker} ${misplaced[1]}`
              );

            if (
              /^[IVXLCDM]{1,8}[.)]$/u.test(
                marker
              )
            ) {
              orphanStructuredLine.classList.add(
                "nc-roman-line",
                "nc-roman-full-line"
              );
            } else {
              orphanStructuredLine.classList.add(
                "nc-numbered-line",
                "nc-number-full-line"
              );
            }

            finalText = cleanText(
              misplaced[2]
            );
          }
        }

        let previous =
          caseLines.length > 0
            ? caseLines[
                caseLines.length - 1
              ]
            : null;

        const beginsAsContinuation =
          /^(?:necha|nechta|qancha|qanday|qaysi|qachon|qayer|kim|nima|eng\s+kechi|muddat|tartib|bajarishi|tuzilishi|so['’ʻʼ`]?roq)/iu;

        let safety = 0;

        while (
          previous &&
          safety < 3 &&
          (
            beginsAsContinuation.test(
              finalText
            ) ||
            !/[.!?;:]$/.test(
              elementText(previous)
            )
          )
        ) {
          safety += 1;

          const previousText =
            elementText(previous);

          if (!previousText) break;

          let boundary = -1;
          const boundaryRegex =
            /[.!?](?:\s+|$)/g;
          let boundaryMatch:
            RegExpExecArray | null;

          while (
            (boundaryMatch =
              boundaryRegex.exec(
                previousText
              )) !== null
          ) {
            if (
              boundaryMatch.index <
              previousText.length - 1
            ) {
              boundary =
                boundaryMatch.index;
            }
          }

          if (boundary >= 0) {
            const prefix = cleanText(
              previousText.slice(
                0,
                boundary + 1
              )
            );

            const fragment = cleanText(
              previousText.slice(
                boundary + 1
              )
            );

            if (fragment) {
              finalText = cleanText(
                `${fragment} ${finalText}`
              );
            }

            if (prefix) {
              previous.textContent =
                prefix;
            } else {
              previous.remove();
            }

            break;
          }

          if (
            /[.!?;:]$/.test(
              previousText
            )
          ) {
            break;
          }

          finalText = cleanText(
            `${previousText} ${finalText}`
          );

          const allCaseLines: HTMLElement[] =
            Array.from(
              root.querySelectorAll<HTMLElement>(
                "[data-pdf-case-line]"
              )
            ) as HTMLElement[];

          const previousIndex =
            allCaseLines.indexOf(
              previous
            );

          previous.remove();

          previous =
            previousIndex > 0
              ? allCaseLines[
                  previousIndex - 1
                ]
              : null;
        }

        finalQuestion.textContent =
          cleanText(finalText);

        finalQuestion.classList.add(
          "nc-final-question-line"
        );

        const questionNumber =
          Number(
            currentQuestion?.questionNumber ||
              0
          );

        /*
          PDFdagi ochiq savol qalinligi:
          36, 37, 39, 43, 44, 45 — yakuniy savol to‘liq qalin.
          38, 40 — yakuniy savol oddiy.
          41, 42 — faqat kalit ibora qalin.

          Boshqa testlarda esa final savolni qalin chiqaramiz.
        */
        const knownOpenQuestion =
          questionNumber >= 36 &&
          questionNumber <= 45;

        const fullBoldOpen =
          [36, 37, 39, 43, 44, 45].includes(
            questionNumber
          );

        finalQuestion.classList.toggle(
          "nc-final-question-bold",
          !knownOpenQuestion ||
            fullBoldOpen
        );

        finalQuestion.classList.toggle(
          "nc-final-question-regular",
          knownOpenQuestion &&
            !fullBoldOpen
        );

        const boldPhrase = (
          pattern: RegExp
        ) => {
          const text =
            finalQuestion.textContent ||
            "";
          const match =
            text.match(pattern);

          if (!match || match.index == null) {
            return;
          }

          const before =
            text.slice(0, match.index);
          const after =
            text.slice(
              match.index +
                match[0].length
            );

          finalQuestion.textContent =
            "";

          finalQuestion.append(
            document.createTextNode(
              before
            )
          );

          const strong =
            document.createElement(
              "strong"
            );

          strong.className =
            "nc-final-keyphrase";
          strong.textContent =
            match[0];

          finalQuestion.append(
            strong
          );
          finalQuestion.append(
            document.createTextNode(
              after
            )
          );
        };

        if (questionNumber === 41) {
          boldPhrase(
            /necha\s+daqiqa/iu
          );
        }

        if (questionNumber === 42) {
          boldPhrase(
            /eng\s+kechi\s+bilan\s+qachongacha/iu
          );
        }
      }

      /*
        Asosiy savol/topshiriq qalin qoladi.
      */
      const main =
        root.querySelector<HTMLElement>(
          "[data-pdf-heading], [data-pdf-main]"
        );

      if (main) {
        main.classList.add(
          "nc-main-question-line"
        );
      }
    };


    const normalizeVenn = () => {
      const venns =
        root.querySelectorAll<HTMLElement>(
          '.nc-venn2, [data-kind="venn2"]'
        );

      venns.forEach((venn) => {
        venn.style.setProperty(
          "display",
          "block",
          "important"
        );
        venn.style.setProperty(
          "position",
          "relative",
          "important"
        );
        venn.style.setProperty(
          "left",
          "auto",
          "important"
        );
        venn.style.setProperty(
          "top",
          "auto",
          "important"
        );
        venn.style.setProperty(
          "right",
          "auto",
          "important"
        );
        venn.style.setProperty(
          "bottom",
          "auto",
          "important"
        );
        venn.style.setProperty(
          "width",
          "min(760px, 100%)",
          "important"
        );
        venn.style.setProperty(
          "max-width",
          "100%",
          "important"
        );
        venn.style.setProperty(
          "height",
          "auto",
          "important"
        );
        venn.style.setProperty(
          "min-height",
          "0",
          "important"
        );
        venn.style.setProperty(
          "margin",
          "10px auto 4px",
          "important"
        );
        venn.style.setProperty(
          "padding",
          "0",
          "important"
        );
        venn.style.setProperty(
          "float",
          "none",
          "important"
        );
        venn.style.setProperty(
          "clear",
          "both",
          "important"
        );
        venn.style.setProperty(
          "transform",
          "none",
          "important"
        );
        venn.style.setProperty(
          "overflow",
          "visible",
          "important"
        );

        const svg =
          venn.querySelector(
            ":scope > svg"
          ) as SVGSVGElement | null;

        if (svg) {
          svg.style.setProperty(
            "display",
            "block",
            "important"
          );
          svg.style.setProperty(
            "position",
            "static",
            "important"
          );
          svg.style.setProperty(
            "left",
            "auto",
            "important"
          );
          svg.style.setProperty(
            "top",
            "auto",
            "important"
          );
          svg.style.setProperty(
            "width",
            "100%",
            "important"
          );
          svg.style.setProperty(
            "height",
            "auto",
            "important"
          );
          svg.style.setProperty(
            "max-width",
            "100%",
            "important"
          );
          svg.style.setProperty(
            "margin",
            "0",
            "important"
          );
          svg.style.setProperty(
            "transform",
            "none",
            "important"
          );
          svg.style.setProperty(
            "overflow",
            "visible",
            "important"
          );

          /*
            width/height atributlari eski saqlangan piksel balandligini
            majburlamasligi uchun faqat viewBox proporsiyasi ishlaydi.
          */
          svg.removeAttribute("width");
          svg.removeAttribute("height");
          svg.setAttribute(
            "preserveAspectRatio",
            "xMidYMid meet"
          );
        }

        /*
          Venn bilan a), b), c)... orasida editor bir nechta bo‘sh
          p/div/br yoki whitespace node saqlab yuborishi mumkin.
          Faqat MUTLAQO BO‘SH node'larni ketma-ket olib tashlaymiz.
          Birinchi haqiqiy matnli elementga yetishimiz bilan to‘xtaymiz.
          Shu sabab a) band hech qachon o‘chmaydi.
        */
        let next =
          venn.nextSibling;

        while (next) {
          const following =
            next.nextSibling;

          if (
            next.nodeType ===
            Node.TEXT_NODE
          ) {
            const textValue =
              (next.textContent || "")
                .replace(/\u00a0/g, "")
                .trim();

            if (!textValue) {
              next.parentNode?.removeChild(
                next
              );
              next = following;
              continue;
            }

            break;
          }

          if (
            next.nodeType ===
            Node.ELEMENT_NODE
          ) {
            const element =
              next as HTMLElement;

            const cleanText =
              (element.textContent || "")
                .replace(/\u00a0/g, "")
                .trim();

            const hasMeaningfulObject =
              Boolean(
                element.querySelector(
                  "img,svg,table,input,textarea,button,[data-object-id]"
                )
              );

            if (
              cleanText === "" &&
              !hasMeaningfulObject
            ) {
              element.remove();
              next = following;
              continue;
            }

            element.style.setProperty(
              "margin-top",
              "4px",
              "important"
            );

            break;
          }

          break;
        }
      });
    };

    /*
      BIRINCHI PAINTDAN OLDIN darhol normalizatsiya qilamiz.
      Shu qism 1-savol birinchi ochilgandagi ortiqcha bo‘shliqni yo‘qotadi.
    */
    normalizeNumberedLines();
    normalizeVenn();

    /*
      Editor/Venn/SVG ichki o‘lchamlari keyingi frame'da o‘zgarishi
      mumkinligi uchun ikki frame'dan keyin yana bir marta tekshiramiz.
      Bu faqat xavfsizlik uchun; asosiy ko‘rinish allaqachon yuqorida
      birinchi paintdan oldin tuzatilgan bo‘ladi.
    */
    frame1 =
      window.requestAnimationFrame(
        () => {
          frame2 =
            window.requestAnimationFrame(
              () => {
                normalizeNumberedLines();
                normalizeVenn();
              }
            );
        }
      );

    const onResize = () => {
      normalizeNumberedLines();
      normalizeVenn();
    };

    window.addEventListener(
      "resize",
      onResize
    );

    return () => {
      window.cancelAnimationFrame(
        frame1
      );
      window.cancelAnimationFrame(
        frame2
      );
      window.removeEventListener(
        "resize",
        onResize
      );
    };
  }, [
    attempt?.id,
    currentQuestion?.id,
    currentQuestion?.questionHtml,
  ]);

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
        const endpoint =
          isAdminPreview
            ? `/api/national-certificate/tests/${encodeURIComponent(
                testId
              )}`
            : `/api/national-certificate/tests/${encodeURIComponent(
                testId
              )}/public`;

        const response = await fetch(
          endpoint,
          {
            method: "GET",
            cache: "no-store",
            credentials: "include",
          }
        );

        const data =
          await response.json();

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

        const rawTest =
          data.test;

        const rawQuestions =
          Array.isArray(
            rawTest.questions
          )
            ? rawTest.questions
            : [];

        const normalizedQuestions:
          TestQuestion[] =
          rawQuestions
            .map((question: any) => {
              const questionNumber =
                Number(
                  question.questionNumber ??
                    question.question_number
                );

              const questionType =
                String(
                  question.questionType ??
                    question.question_type ??
                    (
                      questionNumber <= 35
                        ? "closed"
                        : "open"
                    )
                ) === "open"
                  ? "open"
                  : "closed";

              const rawOptions =
                Array.isArray(
                  question.options
                )
                  ? question.options
                  : [];

              return {
                id:
                  String(
                    question.id ??
                      ""
                  ),

                questionNumber,

                questionType,

                questionText:
                  String(
                    question.questionText ??
                      question.question_text ??
                      ""
                  ),

                questionHtml:
                  String(
                    question.questionHtml ??
                      question.question_html ??
                      ""
                  ),

                points:
                  Number(
                    question.points ??
                      0
                  ),

                options:
                  rawOptions.map(
                    (option: any) => ({
                      id:
                        String(
                          option.id ??
                            option.option_id ??
                            `${question.id}-${option.option_key ?? option.key ?? ""}`
                        ),

                      key:
                        String(
                          option.key ??
                            option.option_key ??
                            ""
                        ),

                      text:
                        String(
                          option.text ??
                            option.option_text ??
                            ""
                        ),

                      html:
                        String(
                          option.html ??
                            option.option_html ??
                            ""
                        ),

                      sortOrder:
                        Number(
                          option.sortOrder ??
                            option.sort_order ??
                            0
                        ),
                    })
                  ),
              } as TestQuestion;
            })
            .filter(
              (
                question: TestQuestion
              ) =>
                Boolean(
                  question.id
                ) &&
                Number.isInteger(
                  question.questionNumber
                )
            )
            .sort(
              (
                a: TestQuestion,
                b: TestQuestion
              ) =>
                a.questionNumber -
                b.questionNumber
            );

        const savedClosedCount =
          normalizedQuestions.filter(
            (question) =>
              question.questionType ===
              "closed"
          ).length;

        const savedOpenCount =
          normalizedQuestions.filter(
            (question) =>
              question.questionType ===
              "open"
          ).length;

        const loadedTest:
          TestData = {
          id:
            String(
              rawTest.id
            ),

          title:
            String(
              rawTest.title ||
                "Nomsiz test"
            ),

          description:
            String(
              rawTest.description ||
                ""
            ),

          subject:
            String(
              rawTest.subject ||
                "law"
            ),

          durationMinutes:
            Number(
              rawTest.durationMinutes ??
                rawTest.duration_minutes ??
                90
            ),

          closedQuestionCount:
            isAdminPreview
              ? savedClosedCount
              : Number(
                  rawTest.closedQuestionCount ??
                    rawTest.closed_question_count ??
                    savedClosedCount
                ),

          openQuestionCount:
            isAdminPreview
              ? savedOpenCount
              : Number(
                  rawTest.openQuestionCount ??
                    rawTest.open_question_count ??
                    savedOpenCount
                ),

          totalQuestions:
            isAdminPreview
              ? normalizedQuestions.length
              : Number(
                  rawTest.totalQuestions ??
                    rawTest.total_questions ??
                    normalizedQuestions.length
                ),

          attemptLimit:
            (
              rawTest.attemptLimit ??
              rawTest.attempt_limit
            ) == null
              ? null
              : Number(
                  rawTest.attemptLimit ??
                    rawTest.attempt_limit
                ),

          questions:
            normalizedQuestions,
        };

        if (
          loadedTest.questions.length ===
          0
        ) {
          throw new Error(
            isAdminPreview
              ? "Preview uchun hali birorta savol saqlanmagan."
              : "Test savollari mavjud emas."
          );
        }

        setTest(
          loadedTest
        );

        if (
          isAdminPreview
        ) {
          /*
            Preview real foydalanuvchining localStorage
            javoblarini olmaydi va hech narsani DBga yozmaydi.
          */
          setAnswers({});
          setCurrentIndex(0);
          setAttempt(null);
          setResult(null);
          setMessage(
            "ADMIN PREVIEW — bu rejimda urinish va natija saqlanmaydi."
          );
          return;
        }

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
      isAdminPreview,
    ]);

  useEffect(() => {
    loadTest();
  }, [loadTest]);

  const startTest =
    useCallback(async () => {
      if (!testId) {
        return;
      }

      if (
        isAdminPreview
      ) {
        if (!test) {
          return;
        }

        const startedAt =
          new Date();

        const expiresAt =
          new Date(
            startedAt.getTime() +
              Math.max(
                1,
                Number(
                  test.durationMinutes
                )
              ) *
                60 *
                1000
          );

        setAttempt({
          id:
            `preview-${testId}`,
          testId,
          status:
            "preview",
          startedAt:
            startedAt.toISOString(),
          expiresAt:
            expiresAt.toISOString(),
          durationMinutes:
            test.durationMinutes,
        });

        setAnswers({});
        setCurrentIndex(0);

        setRemainingSeconds(
          Math.max(
            1,
            Number(
              test.durationMinutes
            )
          ) * 60
        );

        autoSubmitStarted.current =
          false;

        setError("");
        setMessage(
          "ADMIN PREVIEW — urinish va natija bazaga yozilmaydi."
        );

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
      isAdminPreview,
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

        if (
          isAdminPreview
        ) {
          /*
            Preview yakunlanganda hech qanday API chaqirilmaydi.
            Natija va attempt bazaga yozilmaydi.
          */
          setConfirmFinish(false);
          setAttempt(null);
          setRemainingSeconds(
            Math.max(
              1,
              Number(
                test.durationMinutes
              )
            ) * 60
          );
          setAnswers({});
          setCurrentIndex(0);

          setMessage(
            automatic
              ? "ADMIN PREVIEW — preview vaqti tugadi. Hech qanday natija saqlanmadi."
              : "ADMIN PREVIEW — preview yakunlandi. Hech qanday natija saqlanmadi."
          );

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
                  automatic,
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
        isAdminPreview,
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

      const remainingMs =
        expiresAt - Date.now();

      const seconds =
        remainingMs <= 0
          ? 0
          : Math.ceil(
              remainingMs / 1000
            );

      setRemainingSeconds(
        seconds
      );

      if (
        remainingMs <= 0 &&
        !autoSubmitStarted.current
      ) {
        /*
          00:00 ga yetgan zahoti UI to‘liq bloklanadi.
          Modal ham yopiladi va test faqat bir marta
          avtomatik yakunlashga yuboriladi.
        */
        autoSubmitStarted.current =
          true;

        setConfirmFinish(false);

        void submitTest(true);
      }
    };

    updateTimer();

    /*
      250 ms interval taymerni server bergan expiresAt
      vaqtiga aniqroq bog‘laydi. Qolgan vaqt baribir
      sekund ko‘rinishida chiqadi.
    */
    const interval =
      window.setInterval(
        updateTimer,
        250
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
    if (
      !test ||
      !attempt ||
      submitting ||
      remainingSeconds <= 0
    ) {
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
      <main className="ncPage loadingPage">
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

            {isAdminPreview ? (
              <div className="previewNotice">
                <strong>
                  ADMIN PREVIEW
                </strong>

                <span>
                  Ko‘rinish foydalanuvchi sahifasining o‘zi.
                  Preview davomida attempt va natija bazaga yozilmaydi.
                </span>
              </div>
            ) : (
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
            )}

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
                : isAdminPreview
                ? "PREVIEWNI BOSHLASH"
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
                    disabled={
                      submitting ||
                      remainingSeconds <= 0
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
                  ref={questionHtmlRef}
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
                    submitting ||
                    remainingSeconds <= 0
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
                      submitting ||
                      remainingSeconds <= 0
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
                      submitting ||
                      remainingSeconds <= 0
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
                  submitting ||
                  remainingSeconds <= 0
                }
              >
                Testni yakunlash
              </button>
            </div>
          )}
        </section>
      </div>

      {remainingSeconds <= 0 &&
        !result && (
        <div
          className="timeExpiredOverlay"
          role="alert"
          aria-live="assertive"
        >
          <div className="timeExpiredCard">
            <div className="timeExpiredIcon">
              00:00
            </div>

            <h2>Vaqt tugadi</h2>

            <p>
              Test avtomatik yakunlanmoqda.
              Endi javoblarni o‘zgartirib bo‘lmaydi.
            </p>

            <div className="timeExpiredLoader" />
          </div>
        </div>
      )}

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
                  submitting ||
                  remainingSeconds <= 0
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
                  submitting ||
                  remainingSeconds <= 0
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

      /* ===== TEST YUKLANMOQDA: EKRAN MARKAZIDA ===== */
      .loadingPage {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
      }

      .loadingPage .centerBox {
        width: min(92vw, 430px);
        margin: 0;
        padding: 42px 28px 38px;
        text-align: center;
        border-radius: 18px;
      }

      .loadingPage .centerBox h2 {
        margin: 0;
        color: #172538;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 20px;
        line-height: 1.3;
        font-weight: 800;
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
        height: 46px;
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

      .previewNotice {
        margin-top: 27px;
        padding: 18px 20px;
        border: 2px solid #9b7a18;
        border-radius: 13px;
        background:
          linear-gradient(
            180deg,
            #fff7c9 0%,
            #efd36e 100%
          );
        box-shadow:
          inset 0 3px 2px rgba(255,255,255,.9),
          0 4px 0 #92761f;
        text-align: left;
      }

      .previewNotice strong,
      .previewNotice span {
        display: block;
      }

      .previewNotice strong {
        margin-bottom: 6px;
        color: #5b4300;
        font-size: 14px;
        letter-spacing: 1px;
      }

      .previewNotice span {
        color: #4f4630;
        line-height: 1.55;
        font-size: 13px;
        font-weight: 700;
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
        position: relative;
        padding: 34px;
        border: 3px solid #4f5d66;
        border-radius: 28px;

        background:
          linear-gradient(
            145deg,
            #ffffff 0%,
            #f8fafb 32%,
            #e8edf0 72%,
            #d5dce1 100%
          );

        box-shadow:
          inset 0 8px 7px rgba(255,255,255,.98),
          inset 0 -10px 14px rgba(55,70,82,.18),
          0 9px 0 #59656d,
          0 18px 30px rgba(18,35,48,.24);
      }

      .questionCard::before {
        content: "";
        position: absolute;
        inset: 8px;
        pointer-events: none;

        border: 1px solid rgba(255,255,255,.92);
        border-radius: 20px;

        box-shadow:
          inset 0 1px 0 rgba(255,255,255,.95);
      }

      .questionMeta {
        position: relative;
        z-index: 1;

        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;

        padding: 15px 17px;

        border: 2px solid #56636c;
        border-radius: 15px;

        background:
          linear-gradient(
            180deg,
            #ffffff 0%,
            #f4f6f7 24%,
            #dce2e6 67%,
            #c3cbd0 100%
          );

        box-shadow:
          inset 0 5px 4px rgba(255,255,255,.98),
          inset 0 -6px 7px rgba(53,66,75,.16),
          0 6px 0 #647078,
          0 11px 17px rgba(20,34,44,.18);
      }

      .questionMeta::after {
        content: "";
        position: absolute;
        left: 12px;
        right: 12px;
        top: 6px;
        height: 35%;

        pointer-events: none;
        border-radius: 10px;

        background:
          linear-gradient(
            180deg,
            rgba(255,255,255,.72),
            rgba(255,255,255,0)
          );
      }

      .questionMeta > * {
        position: relative;
        z-index: 1;
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

      /* ===== SAVOL MATNI: BARCHA SAVOLLARDA BIR XIL KO‘RINISH ===== */
      .questionText {
        position: relative;
        margin-top: 26px;
        padding: 30px 32px 32px;

        border: 2px solid #8fa0ad;
        border-radius: 24px;

        background:
          linear-gradient(
            145deg,
            #ffffff 0%,
            #ffffff 28%,
            #f8fafb 60%,
            #edf2f5 100%
          );

        color: #101827;

        /*
          Word namunasiga yaqin yozuv.
          Bell MT qurilmada bo‘lmasa Georgia/Times ishlaydi.
        */
        font-family:
          "Bell MT",
          Georgia,
          "Times New Roman",
          serif;

        font-size: 26px;
        line-height: 1.46;
        font-weight: 400;

        overflow-wrap: break-word;
        word-break: normal;
        text-shadow: none;

        box-shadow:
          inset 0 7px 6px rgba(255,255,255,.98),
          inset 0 -8px 12px rgba(63,80,94,.13),
          0 7px 0 #8c9aa4,
          0 14px 22px rgba(25,43,57,.18);
      }

      .questionText::before {
        content: "";
        position: absolute;
        inset: 7px;
        pointer-events: none;

        border: 1px solid rgba(255,255,255,.95);
        border-radius: 17px;
      }

      .questionText::after {
        content: "";
        position: absolute;
        left: 5%;
        right: 5%;
        top: 7px;
        height: 22%;
        pointer-events: none;

        border-radius: 18px;

        background:
          linear-gradient(
            180deg,
            rgba(255,255,255,.55),
            rgba(255,255,255,0)
          );
      }

      .questionText > * {
        position: relative;
        z-index: 1;
      }

      /*
        MUHIM:
        Eski savollar turli vaqtda turli font-size/font-weight
        bilan saqlangan. Shu sabab ayrim savollar katta, ayrimlari
        kichik chiqayotgan edi.

        Endi SAVOLNING ICHKI HTML SHRIFTLARI bir xil qilinadi.
        Bu faqat savol matniga tegadi — A/B/C/D variantlariga tegmaydi.
      */
      .questionText.htmlContent p,
      .questionText.htmlContent div:not(.nc-object),
      .questionText.htmlContent span,
      .questionText.htmlContent li,
      .questionText.htmlContent font {
        font-family:
          "Bell MT",
          Georgia,
          "Times New Roman",
          serif !important;

        font-size: inherit !important;
        line-height: inherit !important;
        color: inherit !important;
      }

      .questionText.htmlContent strong,
      .questionText.htmlContent b {
        font-family:
          "Bell MT",
          Georgia,
          "Times New Roman",
          serif !important;
        font-weight: 700 !important;
      }

      /*
        Eski <font size="..."> atributlari endi savol hajmini
        o‘zgartirmaydi. Hammasi yuqoridagi umumiy hajmga bo‘ysunadi.
      */
      .questionText.htmlContent font[size] {
        font-size: inherit !important;
      }

      /*
        Asosiy savol gapining ko‘rinishi.
      */
      .questionText.htmlContent > p:first-child,
      .questionText.htmlContent > div:first-child {
        margin-top: 0;
        margin-bottom: 12px;
        font-size: 1em !important;
        line-height: 1.42 !important;
      }

      .questionText.htmlContent p {
        margin: 6px 0;
      }

      /*
        Qavs ichidagi manba:
        (O‘zbekiston Respublikasi Konstitutsiyasi)
        qalin EMAS, italic.
      */
      .questionText.htmlContent em,
      .questionText.htmlContent i {
        font-family:
          "Bell MT",
          Georgia,
          "Times New Roman",
          serif !important;

        font-size: 0.92em !important;
        line-height: 1.42 !important;
        font-weight: 400 !important;
        font-style: italic !important;
        color: #202a38 !important;
      }

      /* ===== PDF IMPORT: MATN QALINLIGI VA KAZUS TUZILISHI ===== */
      .questionText.htmlContent [data-pdf-heading="true"],
      .questionText.htmlContent [data-pdf-main="true"],
      .questionText.htmlContent [data-pdf-open-prefix="true"],
      .questionText.htmlContent .nc-main-question-line {
        font-weight: 700 !important;
      }

      .questionText.htmlContent [data-pdf-source-row="true"],
      .questionText.htmlContent [data-pdf-source="true"],
      .questionText.htmlContent .nc-source-line {
        font-weight: 400 !important;
        font-style: italic !important;
      }

      .questionText.htmlContent [data-pdf-case-line="true"],
      .questionText.htmlContent .nc-letter-line {
        font-weight: 400 !important;
      }

      /*
        PDFdagi yopiq savollarda 1./2./3. va I./II./III.
        dan keyingi kategoriya/atama satrlari ham qalin.
      */
      .questionText.htmlContent [data-pdf-number-line="true"],
      .questionText.htmlContent [data-pdf-number-line="true"] *,
      .questionText.htmlContent [data-pdf-roman-line="true"],
      .questionText.htmlContent [data-pdf-roman-line="true"] *,
      .questionText.htmlContent .nc-number-full-line,
      .questionText.htmlContent .nc-number-full-line *,
      .questionText.htmlContent .nc-roman-full-line,
      .questionText.htmlContent .nc-roman-full-line * {
        font-weight: 700 !important;
      }

      .questionText.htmlContent .nc-list-marker,
      .questionText.htmlContent [data-pdf-marker="true"] {
        font-weight: 700 !important;
      }

      .questionText.htmlContent .nc-roman-full-line,
      .questionText.htmlContent .nc-roman-full-line * {
        font-weight: 700 !important;
      }

      .questionText.htmlContent .nc-final-question-line {
        margin-top: 14px !important;
        line-height: 1.5 !important;
      }

      .questionText.htmlContent .nc-final-question-bold,
      .questionText.htmlContent .nc-final-question-bold * {
        font-weight: 700 !important;
      }

      .questionText.htmlContent .nc-final-question-regular {
        font-weight: 400 !important;
      }

      .questionText.htmlContent .nc-final-keyphrase {
        font-weight: 700 !important;
      }

      /*
        WORD/EDITOR'DAN KELGAN ODDIY RAQAMLI SATRLAR

        Masalan:
        1. muayyan hudud;
        2. boshqaruv apparati;

        Bu satrlar <ol><li> bo‘lmasa ham bir xil tizimli ko‘rinadi.
        Birinchi qatorda raqam + bitta tabiiy space.
        Qator o‘ralganda davomi matnning boshidan davom etadi.
      */
      .questionText.htmlContent .nc-numbered-line {
        margin: 7px 0 !important;
        padding-left: 1.10em !important;
        text-indent: -1.10em !important;

        font-size: 0.92em !important;
        line-height: 1.42 !important;
        font-weight: 700 !important;
      }

      /*
        1. 2. 3. 4. bandlar Word namunasidagidek:
        raqam va matn orasidagi masofa kichik va bir xil.
        Brauzerning standart outside-marker bo‘shlig‘idan foydalanmaymiz.
      */
      .questionText.htmlContent ol {
        margin: 8px 0 0;
        padding-left: 0;
        list-style: none;
        counter-reset: question-list;
      }

      .questionText.htmlContent ol > li {
        position: relative;
        margin: 7px 0;
        padding-left: 1.10em;
        text-indent: 0;

        font-size: 0.92em !important;
        line-height: 1.42 !important;
        font-weight: 700 !important;

        counter-increment: question-list;
      }

      .questionText.htmlContent ol > li::before {
        content: counter(question-list) ".";

        position: absolute;
        left: 0;
        top: 0;

        width: 0.90em;

        color: #101827;
        font-size: 0.96em;
        font-weight: 700;
        line-height: 1.42;
        text-align: left;
      }

      /*
        Oddiy bullet ro‘yxatlar alohida saqlanadi.
      */
      .questionText.htmlContent ul {
        margin: 8px 0 0;
        padding-left: 1.25em;
        list-style-position: outside;
      }

      .questionText.htmlContent ul > li {
        margin: 7px 0;
        padding-left: 0;
        text-indent: 0;

        font-size: 0.92em !important;
        line-height: 1.42 !important;
        font-weight: 400 !important;
      }

      .questionText.htmlContent ul > li::marker {
        font-size: 0.90em;
        font-weight: 700;
        color: #101827;
      }

      /* ===== EYLER–VENN: PUBLIC RENDER FALLBACK ===== */
      .questionText.htmlContent .nc-venn2,
      .questionText.htmlContent .nc-object[data-kind="venn2"] {
        display: block !important;
        position: relative !important;
        width: min(760px, 100%) !important;
        max-width: 100% !important;
        height: auto !important;
        min-height: 0 !important;
        margin: 10px auto 4px !important;
        padding: 0 !important;
        float: none !important;
        clear: both !important;
        overflow: visible !important;
        transform: none !important;
      }

      .questionText.htmlContent .nc-venn2 > svg,
      .questionText.htmlContent .nc-object[data-kind="venn2"] > svg {
        display: block !important;
        position: static !important;
        width: 100% !important;
        height: auto !important;
        max-width: 100% !important;
        margin: 0 !important;
        overflow: visible !important;
        transform: none !important;
      }

      .questionText.htmlContent .nc-venn2 foreignObject:nth-of-type(1),
      .questionText.htmlContent .nc-venn2 foreignObject:nth-of-type(2),
      .questionText.htmlContent .nc-object[data-kind="venn2"] foreignObject:nth-of-type(1),
      .questionText.htmlContent .nc-object[data-kind="venn2"] foreignObject:nth-of-type(2) {
        height: 84px !important;
        overflow: visible !important;
      }

      .questionText.htmlContent .nc-venn2 foreignObject:nth-of-type(1) > div,
      .questionText.htmlContent .nc-venn2 foreignObject:nth-of-type(2) > div,
      .questionText.htmlContent .nc-object[data-kind="venn2"] foreignObject:nth-of-type(1) > div,
      .questionText.htmlContent .nc-object[data-kind="venn2"] foreignObject:nth-of-type(2) > div {
        height: 84px !important;
        overflow: visible !important;
        font-size: 18px !important;
        line-height: 1.08 !important;
        font-weight: 700 !important;
        display: flex !important;
        align-items: flex-start !important;
        justify-content: center !important;
        padding-top: 2px !important;
        text-align: center !important;
        white-space: normal !important;
      }

      .questionText.htmlContent .nc-venn2 foreignObject:nth-of-type(3) > div,
      .questionText.htmlContent .nc-venn2 foreignObject:nth-of-type(4) > div,
      .questionText.htmlContent .nc-venn2 foreignObject:nth-of-type(5) > div,
      .questionText.htmlContent .nc-object[data-kind="venn2"] foreignObject:nth-of-type(3) > div,
      .questionText.htmlContent .nc-object[data-kind="venn2"] foreignObject:nth-of-type(4) > div,
      .questionText.htmlContent .nc-object[data-kind="venn2"] foreignObject:nth-of-type(5) > div {
        font-size: 22px !important;
        font-weight: 800 !important;
      }

      .questionText.htmlContent .nc-venn2 foreignObject:last-of-type > div,
      .questionText.htmlContent .nc-object[data-kind="venn2"] foreignObject:last-of-type > div {
        font-size: 18px !important;
        line-height: 1.15 !important;
        font-weight: 700 !important;
      }

      /* Diagramma tugashi bilan keyingi haqiqiy matn yaqin boshlanadi */
      .questionText.htmlContent .nc-venn2,
      .questionText.htmlContent .nc-object[data-kind="venn2"] {
        margin-bottom: 4px !important;
      }

      /* Faqat haqiqatan bo‘sh <p><br></p> ni yashiramiz.
         Matnli birinchi p (masalan, a) band) hech qachon yashirilmaydi. */
      .questionText.htmlContent .nc-venn2 + p:has(> br:only-child),
      .questionText.htmlContent .nc-object[data-kind="venn2"] + p:has(> br:only-child) {
        display: none !important;
        height: 0 !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        line-height: 0 !important;
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

      .timeExpiredOverlay {
        position: fixed;
        inset: 0;
        z-index: 10000;
        display: grid;
        place-items: center;
        padding: 22px;
        background: rgba(13, 24, 36, 0.72);
        backdrop-filter: blur(5px);
      }

      .timeExpiredCard {
        width: min(92vw, 460px);
        padding: 30px 26px;
        border: 2px solid #4e5961;
        border-radius: 20px;
        background:
          linear-gradient(
            180deg,
            #ffffff 0%,
            #edf1f4 58%,
            #d2d8dd 100%
          );
        text-align: center;
        box-shadow:
          inset 0 2px 0 #fff,
          0 7px 0 #59636a,
          0 18px 40px rgba(0, 0, 0, 0.35);
      }

      .timeExpiredIcon {
        width: max-content;
        margin: 0 auto 16px;
        padding: 10px 16px;
        border: 2px solid #8b3030;
        border-radius: 12px;
        background:
          linear-gradient(
            180deg,
            #fff1f1 0%,
            #e8b8b8 100%
          );
        color: #8d2020;
        font-size: 24px;
        font-weight: 900;
      }

      .timeExpiredCard h2 {
        margin: 0;
        color: #152235;
        font-size: 27px;
      }

      .timeExpiredCard p {
        margin: 12px 0 0;
        color: #536070;
        line-height: 1.6;
        font-weight: 700;
      }

      .timeExpiredLoader {
        width: 38px;
        height: 38px;
        margin: 20px auto 0;
        border: 4px solid #cbd3da;
        border-top-color: #0c67c4;
        border-radius: 50%;
        animation: ncSpin 0.8s linear infinite;
      }

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
          border-radius: 21px;

          box-shadow:
            inset 0 5px 5px rgba(255,255,255,.96),
            inset 0 -7px 9px rgba(55,70,82,.15),
            0 6px 0 #59656d,
            0 12px 20px rgba(18,35,48,.20);
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
          margin-top: 20px;
          padding: 20px 17px 22px;
          font-size: 21px;
          line-height: 1.48;
          font-weight: 700;
          border-radius: 14px;
        }

        .questionText.htmlContent .nc-numbered-line {
          padding-left: 1.05em !important;
          text-indent: -1.05em !important;
        }

        .questionText.htmlContent ol {
          padding-left: 0;
        }

        .questionText.htmlContent ol > li {
          padding-left: 1.08em;
        }

        .questionText.htmlContent ol > li::before {
          width: 0.88em;
        }

        .questionText.htmlContent ul {
          padding-left: 1.20em;
        }

        .questionText.htmlContent > p:first-child,
        .questionText.htmlContent > div:first-child {
          margin-bottom: 10px;
        }

        .questionText.htmlContent ol > li,
        .questionText.htmlContent ul > li {
          margin: 6px 0;
          font-size: 0.94em !important;
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
