"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ImportedOption = {
  id: string;
  label: "A" | "B" | "C" | "D";
  text: string;
  isCorrect: boolean;
};

type ShapeType =
  | "rectangle"
  | "roundedRectangle"
  | "circle"
  | "ellipse"
  | "text"
  | "image"
  | "matchingItem";

type EditorShape = {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  imageSrc?: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  fontSize?: number;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
  objectFit?: "contain" | "cover" | "fill";
  zIndex?: number;

  // Moslashtirish elementi uchun
  matchingSide?: "left" | "right";
  matchingKey?: string;
};

type ImportedQuestion = {
  id: string;
  number: number;
  questionText: string;
  options: ImportedOption[];
  imageSrc?: string;
  shapes?: EditorShape[];
  warning?: string;
};


type RichTextEditorProps = {
  editorId: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  compact?: boolean;
};

function editorValueToHtml(value: string) {
  const source = String(value || "");

  if (/<[a-z][\s\S]*>/i.test(source)) {
    return source;
  }

  return source
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

function richTextHasContent(value: string) {
  if (typeof window === "undefined") {
    return String(value || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .trim().length > 0;
  }

  const element = document.createElement("div");
  element.innerHTML = String(value || "");

  return (element.textContent || "")
    .replace(/\u00a0/g, " ")
    .trim().length > 0;
}

function sanitizeRichHtml(value: string) {
  if (typeof window === "undefined") {
    return value;
  }

  const parser = new DOMParser();
  const documentValue = parser.parseFromString(
    `<div>${value}</div>`,
    "text/html"
  );

  documentValue
    .querySelectorAll(
      "script,style,iframe,object,embed,form,input,button,textarea,select,link,meta"
    )
    .forEach((node) => node.remove());

  documentValue.querySelectorAll("*").forEach((node) => {
    [...node.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();

      if (name.startsWith("on")) {
        node.removeAttribute(attribute.name);
      }

      if (
        (name === "href" || name === "src") &&
        value.startsWith("javascript:")
      ) {
        node.removeAttribute(attribute.name);
      }
    });
  });

  return documentValue.body.firstElementChild?.innerHTML || "";
}

const richTextDraftCache = new Map<string, string>();

function RichTextEditor({
  editorId,
  value,
  onChange,
  placeholder = "Matn kiriting...",
  minHeight = 160,
  compact = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);

  const storageKey = `pdf-rich-editor:${editorId}`;

  function readSavedDraft() {
    try {
      return window.sessionStorage.getItem(storageKey);
    } catch {
      return null;
    }
  }

  function saveDraftHtml(html: string) {
    try {
      window.sessionStorage.setItem(storageKey, html);
    } catch {
      // sessionStorage ishlamasa ham editor ishlashda davom etadi
    }
  }

  /*
    MUHIM:
    contentEditable endi HAQIQIY uncontrolled editor.
    Parentdagi `value` har bir renderda DOMga qayta yozilmaydi.
    Shu sabab matnni bir qatordan ikkinchi qatorga ko‘chirsangiz,
    `1-bo‘lim` qilib birlashtirsangiz yoki so‘zlarni joyidan sursangiz,
    ular eski joyiga qaytmaydi.
  */
  const mountedOnceRef = useRef(false);

  useEffect(() => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    /*
      HAR BIR EDITOR UCHUN ALOHIDA DRAFT.
      Scroll, parent re-render yoki component qayta mount bo‘lsa ham
      sessionStorage'dagi oxirgi foydalanuvchi HTML'i ustun turadi.
    */
    const saved = readSavedDraft();
    const initialHtml =
      saved !== null
        ? saved
        : editorValueToHtml(value);

    editor.innerHTML = initialHtml;
    saveDraftHtml(initialHtml);

    /*
      Browser DOMdagi HAR QANDAY o‘zgarishni darhol saqlaymiz.
      Drag/drop, so‘zni tepaga olib chiqish, Enter/Backspace/Delete,
      Ctrl+X/Ctrl+V — hammasi shu yerda ushlanadi.
    */
    const observer = new MutationObserver(() => {
      const html = editor.innerHTML;
      saveDraftHtml(html);
      onChange(html);
    });

    observer.observe(editor, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    });

    return () => {
      const html = editor.innerHTML;
      saveDraftHtml(html);
      onChange(html);
      observer.disconnect();
    };

    // editorId o‘zgarmaydi; value ataylab dependency emas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorId]);

  function rememberLocalHtml() {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    saveDraftHtml(editor.innerHTML);
  }

  function commitChange() {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    const html = editor.innerHTML;
    saveDraftHtml(html);
    onChange(html);
  }

  function saveSelection() {
    const editor = editorRef.current;
    const selection = window.getSelection();

    if (
      !editor ||
      !selection ||
      selection.rangeCount === 0
    ) {
      return;
    }

    const range = selection.getRangeAt(0);

    if (editor.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  }

  function restoreSelection() {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    editor.focus();

    const range = savedRangeRef.current;
    const selection = window.getSelection();

    if (!range || !selection) {
      return;
    }

    selection.removeAllRanges();
    selection.addRange(range);
  }

  function command(
    name: string,
    commandValue?: string
  ) {
    restoreSelection();
    document.execCommand(
      name,
      false,
      commandValue
    );
    saveSelection();
    rememberLocalHtml();

    // Toolbar bosilgandan keyin caret tanlangan joyda qoladi.
    // Parent state faqat editor blur bo‘lganda yangilanadi.
    window.requestAnimationFrame(() => {
      restoreSelection();
    });
  }

  function toolMouseDown(
    event: React.MouseEvent<HTMLElement>
  ) {
    event.preventDefault();
    saveSelection();
  }

  return (
    <div className={compact ? "richEditor richEditorCompact" : "richEditor"}>
      <div className="richToolbar">
        <div className="toolbarGroup">
          <button
            type="button"
            title="Bekor qilish (Undo)"
            onMouseDown={toolMouseDown}
            onClick={() => command("undo")}
          >
            ↶
          </button>

          <button
            type="button"
            title="Qaytarish (Redo)"
            onMouseDown={toolMouseDown}
            onClick={() => command("redo")}
          >
            ↷
          </button>
        </div>

        <div className="toolbarGroup toolbarSelectGroup">
          <select
            title="Shrift"
            defaultValue="Bell MT"
            onMouseDown={saveSelection}
            onChange={(event) =>
              command(
                "fontName",
                event.target.value
              )
            }
          >
            <option value="Bell MT">Bell MT</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Arial">Arial</option>
            <option value="Georgia">Georgia</option>
            <option value="Verdana">Verdana</option>
            <option value="Tahoma">Tahoma</option>
          </select>

          <select
            title="Matn o‘lchami"
            defaultValue="4"
            onMouseDown={saveSelection}
            onChange={(event) =>
              command(
                "fontSize",
                event.target.value
              )
            }
          >
            <option value="2">13</option>
            <option value="3">16</option>
            <option value="4">18</option>
            <option value="5">24</option>
            <option value="6">32</option>
            <option value="7">48</option>
          </select>
        </div>

        <div className="toolbarGroup">
          <button
            type="button"
            className="formatBold"
            title="Qalin"
            onMouseDown={toolMouseDown}
            onClick={() => command("bold")}
          >
            B
          </button>

          <button
            type="button"
            className="formatItalic"
            title="Kursiv"
            onMouseDown={toolMouseDown}
            onClick={() => command("italic")}
          >
            I
          </button>

          <button
            type="button"
            className="formatUnderline"
            title="Tagiga chizish"
            onMouseDown={toolMouseDown}
            onClick={() => command("underline")}
          >
            U
          </button>

          <button
            type="button"
            className="formatStrike"
            title="Ustidan chizish"
            onMouseDown={toolMouseDown}
            onClick={() => command("strikeThrough")}
          >
            abc
          </button>
        </div>

        <div className="toolbarGroup colorTools">
          <label title="Matn rangi">
            <span>A</span>
            <input
              type="color"
              defaultValue="#111111"
              onMouseDown={saveSelection}
              onChange={(event) =>
                command(
                  "foreColor",
                  event.target.value
                )
              }
            />
          </label>

          <label title="Marker / fon rangi">
            <span>▰</span>
            <input
              type="color"
              defaultValue="#fff176"
              onMouseDown={saveSelection}
              onChange={(event) =>
                command(
                  "hiliteColor",
                  event.target.value
                )
              }
            />
          </label>
        </div>

        <div className="toolbarGroup">
          <button
            type="button"
            title="Chapga tekislash"
            onMouseDown={toolMouseDown}
            onClick={() => command("justifyLeft")}
          >
            ≡←
          </button>

          <button
            type="button"
            title="Markazga tekislash"
            onMouseDown={toolMouseDown}
            onClick={() => command("justifyCenter")}
          >
            ≡
          </button>

          <button
            type="button"
            title="O‘ngga tekislash"
            onMouseDown={toolMouseDown}
            onClick={() => command("justifyRight")}
          >
            →≡
          </button>

          <button
            type="button"
            title="Ikki chetidan tekislash"
            onMouseDown={toolMouseDown}
            onClick={() => command("justifyFull")}
          >
            ☰
          </button>
        </div>

        <div className="toolbarGroup">
          <button
            type="button"
            title="Raqamli ro‘yxat"
            onMouseDown={toolMouseDown}
            onClick={() => command("insertOrderedList")}
          >
            1.
          </button>

          <button
            type="button"
            title="Belgili ro‘yxat"
            onMouseDown={toolMouseDown}
            onClick={() => command("insertUnorderedList")}
          >
            •
          </button>

          <button
            type="button"
            title="Chapga surish"
            onMouseDown={toolMouseDown}
            onClick={() => command("outdent")}
          >
            ⇤
          </button>

          <button
            type="button"
            title="Ichkariga surish"
            onMouseDown={toolMouseDown}
            onClick={() => command("indent")}
          >
            ⇥
          </button>
        </div>

        <div className="toolbarGroup">
          <button
            type="button"
            title="Formatlashni tozalash"
            onMouseDown={toolMouseDown}
            onClick={() => command("removeFormat")}
          >
            Tx
          </button>
        </div>
      </div>

      <div
        ref={editorRef}
        className="richEditorArea"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        style={{ minHeight }}
        onInput={() => {
          saveSelection();

          window.requestAnimationFrame(() => {
            rememberLocalHtml();
            commitChange();
          });
        }}
        onFocus={() => {
          saveSelection();
          rememberLocalHtml();
        }}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        onPaste={() => {
          window.requestAnimationFrame(() => {
            saveSelection();
            rememberLocalHtml();
            commitChange();
          });
        }}
        onCut={() => {
          window.requestAnimationFrame(() => {
            saveSelection();
            rememberLocalHtml();
            commitChange();
          });
        }}
        onDrop={() => {
          /*
            Tanlangan matnni sichqoncha bilan boshqa joyga tashlashda
            brauzer DOMni drop eventidan KEYIN o‘zgartiradi.
            Shu sabab requestAnimationFrame ichida yangi HTMLni olamiz.
          */
          window.requestAnimationFrame(() => {
            saveSelection();
            rememberLocalHtml();
            commitChange();
          });
        }}
        onBlur={() => {
          saveSelection();
          rememberLocalHtml();
          commitChange();
        }}
      />

      <style jsx>{`
        .richEditor {
          overflow: hidden;
          border: 2px solid #66737a;
          border-radius: 13px;
          background: #fff;
          box-shadow:
            inset 0 2px 3px rgba(0,0,0,.07),
            0 2px 0 rgba(50,60,66,.22);
        }

        .richToolbar {
          padding: 8px;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 7px;
          border-bottom: 1px solid #9aa5ab;
          background: linear-gradient(#f8f8f8,#dedede);
        }

        .toolbarGroup {
          display: flex;
          align-items: center;
          gap: 4px;
          padding-right: 7px;
          border-right: 1px solid #aab1b5;
        }

        .toolbarGroup:last-child {
          border-right: 0;
        }

        .richToolbar button,
        .richToolbar select,
        .colorTools label {
          min-height: 36px;
          border: 1px solid #7f898e;
          border-radius: 6px;
          background: linear-gradient(#fff,#dedede);
          font-family: "Bell MT", "Times New Roman", serif;
        }

        .richToolbar button {
          min-width: 36px;
          padding: 4px 9px;
          cursor: pointer;
          font-size: 15px;
          font-weight: 700;
        }

        .richToolbar button:hover {
          border-color: #168fc9;
          background: #e4f6ff;
        }

        .richToolbar select {
          padding: 4px 8px;
          cursor: pointer;
        }

        .toolbarSelectGroup select:first-child {
          width: 150px;
        }

        .toolbarSelectGroup select:last-child {
          width: 68px;
        }

        .formatBold {
          font-weight: 900 !important;
        }

        .formatItalic {
          font-style: italic;
        }

        .formatUnderline {
          text-decoration: underline;
        }

        .formatStrike {
          text-decoration: line-through;
          font-size: 12px !important;
        }

        .colorTools label {
          position: relative;
          width: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-weight: 900;
        }

        .colorTools input {
          position: absolute;
          inset: auto 4px 2px;
          width: 30px;
          height: 5px;
          padding: 0;
          border: 0;
          opacity: .85;
          cursor: pointer;
        }

        .richEditorArea {
          padding: 18px 20px;
          outline: none;
          overflow: auto;
          color: #111;
          background: #fff;
          font-family: "Bell MT", "Times New Roman", serif;
          font-size: 21px;
          line-height: 1.65;
          text-align: justify;
          text-justify: inter-word;
          white-space: normal;
          overflow-wrap: anywhere;
        }

        .richEditorArea:empty::before {
          content: attr(data-placeholder);
          color: #8a9398;
          pointer-events: none;
        }

        .richEditorArea :global(p) {
          margin: 0 0 12px;
        }

        .richEditorArea :global(ol),
        .richEditorArea :global(ul) {
          margin: 8px 0;
          padding-left: 30px;
        }

        .richEditorCompact .richToolbar {
          padding: 6px;
        }

        .richEditorCompact .richEditorArea {
          padding: 13px 15px;
          font-size: 19px;
          line-height: 1.5;
        }

        @media(max-width:700px) {
          .richToolbar {
            align-items: stretch;
          }

          .toolbarGroup {
            padding-right: 4px;
          }

          .richToolbar button {
            min-width: 33px;
            min-height: 34px;
            padding: 3px 7px;
          }

          .toolbarSelectGroup {
            width: 100%;
            border-right: 0;
          }

          .toolbarSelectGroup select:first-child {
            flex: 1;
            width: auto;
          }

          .richEditorArea,
          .richEditorCompact .richEditorArea {
            padding: 13px;
            font-size: 17px;
            line-height: 1.55;
          }
        }
      `}</style>
    </div>
  );
}

export default function ImportPdfTestPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [duration, setDuration] = useState(60);
  const [description, setDescription] = useState("");
  const [attemptLimitEnabled, setAttemptLimitEnabled] = useState(true);
  const [attemptLimit, setAttemptLimit] = useState(1);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [questions, setQuestions] =
    useState<ImportedQuestion[]>([]);

  /*
    SAVOL MATNI UCHUN ALOHIDA SOURCE OF TRUTH.
    Variantlar ishlayotgani uchun ularga tegmaymiz.
    Savol matni esa endi questions[] ichidagi eski PDF qiymatiga
    qaram bo‘lmaydi.
  */
  const [questionDrafts, setQuestionDrafts] =
    useState<Record<string, string>>({});

  const [selectedShape, setSelectedShape] = useState<{
    questionId: string;
    shapeId: string;
  } | null>(null);

  const [activeCanvasQuestionId, setActiveCanvasQuestionId] =
    useState<string | null>(null);

  const [openVisualEditors, setOpenVisualEditors] =
    useState<Record<string, boolean>>({});

  const copiedShapeRef = useRef<EditorShape | null>(null);

  const pointerActionRef = useRef<{
    mode: "move" | "resize";
    questionId: string;
    shapeId: string;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    handle?: "nw" | "ne" | "sw" | "se";
  } | null>(null);

  useEffect(() => {
    try {
      Object.entries(questionDrafts).forEach(
        ([id, html]) => {
          window.sessionStorage.setItem(
            `pdf-rich-editor:question:${id}`,
            html
          );
        }
      );
    } catch {
      // ignore
    }
  }, [questionDrafts]);

  const warningCount = useMemo(
    () =>
      questions.filter(
        (item) =>
          item.warning
      ).length,
    [questions]
  );

  function handleFile(
    file: File | null
  ) {
    setMessage("");
    setQuestions([]);
    setQuestionDrafts({});

    if (!file) {
      setPdfFile(null);
      return;
    }

    if (
      file.type !==
        "application/pdf" &&
      !file.name
        .toLowerCase()
        .endsWith(".pdf")
    ) {
      setPdfFile(null);
      setMessage(
        "Faqat PDF fayl yuklash mumkin."
      );
      return;
    }

    if (
      file.size >
      30 * 1024 * 1024
    ) {
      setPdfFile(null);
      setMessage(
        "PDF hajmi 30 MB dan oshmasligi kerak."
      );
      return;
    }

    setPdfFile(file);
  }

  async function analyzePdf() {
    if (!title.trim()) {
      setMessage(
        "Test nomini kiriting."
      );
      return;
    }

    if (!subject.trim()) {
      setMessage(
        "Fan nomini kiriting."
      );
      return;
    }

    if (!pdfFile) {
      setMessage(
        "Avval PDF faylni tanlang."
      );
      return;
    }

    try {
      setAnalyzing(true);
      setMessage("");
      setQuestions([]);
      setQuestionDrafts({});

      const formData =
        new FormData();

      formData.append(
        "file",
        pdfFile
      );

      const response =
        await fetch(
          "/api/tests/import-pdf",
          {
            method: "POST",
            credentials:
              "include",
            body: formData,
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.message ||
            "PDFni tahlil qilib bo‘lmadi."
        );
      }

      const imported:
        ImportedQuestion[] =
        Array.isArray(
          data.questions
        )
          ? data.questions.map(
              (question: ImportedQuestion) => {
                const legacyImageShape: EditorShape[] =
                  question.imageSrc
                    ? [
                        {
                          id: `pdf-img-${question.id}`,
                          type: "image",
                          x: 110,
                          y: 40,
                          width: 620,
                          height: 300,
                          imageSrc: question.imageSrc,
                          objectFit: "contain",
                          borderWidth: 0,
                          borderRadius: 6,
                          zIndex: 1,
                        },
                      ]
                    : [];

                return {
                  ...question,
                  imageSrc: undefined,
                  shapes:
                    Array.isArray(question.shapes) &&
                    question.shapes.length > 0
                      ? question.shapes
                      : legacyImageShape,
                };
              }
            )
          : [];

      try {
        const keysToRemove: string[] = [];

        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i);

          if (key?.startsWith("pdf-rich-editor:")) {
            keysToRemove.push(key);
          }
        }

        keysToRemove.forEach((key) =>
          window.sessionStorage.removeItem(key)
        );
      } catch {
        // ignore
      }

      setQuestionDrafts(
        Object.fromEntries(
          imported.map((question) => [
            question.id,
            question.questionText,
          ])
        )
      );

      setQuestions(imported);

      setMessage(
        `PDFdan ${imported.length} ta savol ajratildi.`
      );
    } catch (error) {
      console.error(
        "PDF IMPORT ERROR:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "PDFni tahlil qilishda xatolik."
      );
    } finally {
      setAnalyzing(false);
    }
  }

  function changeQuestionText(
    id: string,
    value: string
  ) {
    /*
      Bu state faqat SAVOL MATNI uchun.
      Har qanday ?, probel, drag/drop, qatorni birlashtirish va boshqa
      tahrir darhol shu yerda qoladi.
    */
    setQuestionDrafts((current) => ({
      ...current,
      [id]: value,
    }));

    setQuestions((current) =>
      current.map((question) =>
        question.id === id
          ? {
              ...question,
              questionText: value,
            }
          : question
      )
    );
  }

  function changeOptionText(
    questionId: string,
    optionId: string,
    value: string
  ) {
    setQuestions((current) =>
      current.map(
        (question) =>
          question.id ===
          questionId
            ? {
                ...question,
                options:
                  question.options.map(
                    (option) =>
                      option.id ===
                      optionId
                        ? {
                            ...option,
                            text: value,
                          }
                        : option
                  ),
              }
            : question
      )
    );
  }

  function setCorrectAnswer(
    questionId: string,
    optionId: string
  ) {
    setQuestions((current) =>
      current.map(
        (question) =>
          question.id ===
          questionId
            ? {
                ...question,
                warning:
                  undefined,
                options:
                  question.options.map(
                    (option) => ({
                      ...option,
                      isCorrect:
                        option.id ===
                        optionId,
                    })
                  ),
              }
            : question
      )
    );
  }

  function removeQuestion(
    id: string
  ) {
    if (
      !window.confirm(
        "Ushbu savolni olib tashlaysizmi?"
      )
    ) {
      return;
    }

    setQuestions((current) =>
      renumberQuestions(
        current.filter(
          (question) =>
            question.id !== id
        )
      )
    );

    setQuestionDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }


  function renumberQuestions(items: ImportedQuestion[]) {
    return items.map((question, index) => ({
      ...question,
      number: index + 1,
    }));
  }

  function createEmptyQuestion(): ImportedQuestion {
    const questionId =
      `manual-q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    return {
      id: questionId,
      number: questions.length + 1,
      questionText: "",
      options: (["A", "B", "C", "D"] as const).map((label) => ({
        id: `${questionId}-${label.toLowerCase()}-${Math.random()
          .toString(36)
          .slice(2, 6)}`,
        label,
        text: "",
        isCorrect: label === "A",
      })),
      shapes: [],
      warning: "Yangi savol. Matn va variantlarni to‘ldiring.",
    };
  }

  function addQuestion() {
    const created = createEmptyQuestion();

    setQuestionDrafts((current) => ({
      ...current,
      [created.id]: created.questionText,
    }));

    setQuestions((current) =>
      renumberQuestions([
        ...current,
        {
          ...created,
          number: current.length + 1,
        },
      ])
    );

    window.setTimeout(() => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: "smooth",
      });
    }, 50);
  }

  function duplicateQuestion(id: string) {
    setQuestions((current) => {
      const index = current.findIndex((item) => item.id === id);

      if (index < 0) {
        return current;
      }

      const source = current[index];
      const cloneId =
        `copy-q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const clone: ImportedQuestion = {
        ...source,
        id: cloneId,
        options: source.options.map((option) => ({
          ...option,
          id: `${cloneId}-${option.label.toLowerCase()}-${Math.random()
            .toString(36)
            .slice(2, 6)}`,
        })),
        shapes: (source.shapes || []).map((shape) => ({
          ...shape,
          id: `shape-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`,
          x: shape.x + 18,
          y: shape.y + 18,
        })),
        warning: source.warning,
      };

      setQuestionDrafts((drafts) => ({
        ...drafts,
        [clone.id]:
          drafts[source.id] ??
          source.questionText,
      }));

      const next = [...current];
      next.splice(index + 1, 0, clone);

      return renumberQuestions(next);
    });
  }

  function moveQuestion(id: string, direction: -1 | 1) {
    setQuestions((current) => {
      const index = current.findIndex((item) => item.id === id);

      if (index < 0) {
        return current;
      }

      const target = index + direction;

      if (target < 0 || target >= current.length) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);

      return renumberQuestions(next);
    });
  }

  function makeShapeId() {
    return `shape-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 9)}`;
  }

  function updateQuestionShapes(
    questionId: string,
    updater: (shapes: EditorShape[]) => EditorShape[]
  ) {
    setQuestions((current) =>
      current.map((question) =>
        question.id === questionId
          ? {
              ...question,
              shapes: updater(question.shapes || []),
              imageSrc: undefined,
            }
          : question
      )
    );
  }

  function addShape(
    questionId: string,
    type: Exclude<ShapeType, "image">
  ) {
    const baseZ =
      Math.max(
        0,
        ...(
          questions.find((q) => q.id === questionId)?.shapes || []
        ).map((shape) => Number(shape.zIndex) || 0)
      ) + 1;

    const shape: EditorShape = {
      id: makeShapeId(),
      type,
      x: 120,
      y: 70,
      width:
        type === "circle"
          ? 170
          : type === "text"
          ? 260
          : 240,
      height:
        type === "circle"
          ? 170
          : type === "text"
          ? 80
          : 150,
      text:
        type === "text"
          ? "Matn"
          : undefined,
      backgroundColor:
        type === "text"
          ? "transparent"
          : "#8fc9ef",
      borderColor: "#2f5975",
      textColor: "#111111",
      fontSize: 22,
      borderWidth:
        type === "text"
          ? 0
          : 2,
      borderRadius:
        type === "roundedRectangle"
          ? 22
          : type === "circle" ||
            type === "ellipse"
          ? 999
          : 4,
      opacity: 1,
      zIndex: baseZ,
    };

    updateQuestionShapes(questionId, (shapes) => [
      ...shapes,
      shape,
    ]);

    setSelectedShape({
      questionId,
      shapeId: shape.id,
    });
    setActiveCanvasQuestionId(questionId);
  }

  function addImageDataUrl(
    questionId: string,
    imageSrc: string
  ) {
    const image = new Image();

    image.onload = () => {
      const maxWidth = 680;
      const maxHeight = 380;
      const ratio = Math.min(
        maxWidth / Math.max(1, image.naturalWidth),
        maxHeight / Math.max(1, image.naturalHeight),
        1
      );

      const width = Math.max(
        120,
        Math.round(image.naturalWidth * ratio)
      );
      const height = Math.max(
        90,
        Math.round(image.naturalHeight * ratio)
      );

      const shape: EditorShape = {
        id: makeShapeId(),
        type: "image",
        x: Math.max(20, Math.round((900 - width) / 2)),
        y: 55,
        width,
        height,
        imageSrc,
        objectFit: "contain",
        borderWidth: 0,
        borderRadius: 6,
        opacity: 1,
        zIndex: Date.now(),
      };

      updateQuestionShapes(questionId, (shapes) => [
        ...shapes,
        shape,
      ]);

      setSelectedShape({
        questionId,
        shapeId: shape.id,
      });
      setActiveCanvasQuestionId(questionId);
    };

    image.src = imageSrc;
  }

  function changeQuestionImage(
    questionId: string,
    file: File | null
  ) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("Faqat rasm fayli tanlang.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setMessage("Rasm hajmi 8 MB dan oshmasligi kerak.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const imageSrc =
        typeof reader.result === "string"
          ? reader.result
          : "";

      if (imageSrc) {
        addImageDataUrl(questionId, imageSrc);
      }
    };

    reader.readAsDataURL(file);
  }

  function updateShape(
    questionId: string,
    shapeId: string,
    patch: Partial<EditorShape>
  ) {
    updateQuestionShapes(questionId, (shapes) =>
      shapes.map((shape) =>
        shape.id === shapeId
          ? {
              ...shape,
              ...patch,
            }
          : shape
      )
    );
  }

  function removeAllShapes(questionId: string) {
    if (
      !window.confirm(
        "Ushbu savoldagi barcha rasm va shakllarni o‘chirasizmi?"
      )
    ) {
      return;
    }

    updateQuestionShapes(
      questionId,
      () => []
    );

    setSelectedShape((current) =>
      current?.questionId === questionId
        ? null
        : current
    );
  }

  function removeShape(
    questionId: string,
    shapeId: string
  ) {
    updateQuestionShapes(questionId, (shapes) =>
      shapes.filter((shape) => shape.id !== shapeId)
    );

    setSelectedShape((current) =>
      current?.questionId === questionId &&
      current?.shapeId === shapeId
        ? null
        : current
    );
  }

  function duplicateShape(
    questionId: string,
    shapeId: string
  ) {
    const question =
      questions.find((item) => item.id === questionId);

    const source =
      question?.shapes?.find((shape) => shape.id === shapeId);

    if (!source) {
      return;
    }

    const clone: EditorShape = {
      ...source,
      id: makeShapeId(),
      x: source.x + 24,
      y: source.y + 24,
      zIndex: (Number(source.zIndex) || 0) + 1,
    };

    updateQuestionShapes(questionId, (shapes) => [
      ...shapes,
      clone,
    ]);

    setSelectedShape({
      questionId,
      shapeId: clone.id,
    });
  }

  function changeShapeLayer(
    questionId: string,
    shapeId: string,
    direction: "front" | "back"
  ) {
    const question =
      questions.find((item) => item.id === questionId);

    const shapes = question?.shapes || [];

    if (shapes.length === 0) {
      return;
    }

    const values =
      shapes.map((shape) => Number(shape.zIndex) || 0);

    updateShape(
      questionId,
      shapeId,
      {
        zIndex:
          direction === "front"
            ? Math.max(...values) + 1
            : Math.min(...values) - 1,
      }
    );
  }

  function startShapePointer(
    event: React.PointerEvent,
    questionId: string,
    shape: EditorShape,
    mode: "move" | "resize",
    handle?: "nw" | "ne" | "sw" | "se"
  ) {
    event.preventDefault();
    event.stopPropagation();

    setSelectedShape({
      questionId,
      shapeId: shape.id,
    });
    setActiveCanvasQuestionId(questionId);

    pointerActionRef.current = {
      mode,
      questionId,
      shapeId: shape.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: shape.x,
      startY: shape.y,
      startWidth: shape.width,
      startHeight: shape.height,
      handle,
    };
  }

  useEffect(() => {
    function onPointerMove(event: PointerEvent) {
      const action = pointerActionRef.current;

      if (!action) {
        return;
      }

      const dx = event.clientX - action.startClientX;
      const dy = event.clientY - action.startClientY;

      if (action.mode === "move") {
        updateShape(
          action.questionId,
          action.shapeId,
          {
            x: Math.max(0, action.startX + dx),
            y: Math.max(0, action.startY + dy),
          }
        );
        return;
      }

      const minSize = 40;
      let x = action.startX;
      let y = action.startY;
      let width = action.startWidth;
      let height = action.startHeight;

      if (action.handle?.includes("e")) {
        width = Math.max(minSize, action.startWidth + dx);
      }

      if (action.handle?.includes("s")) {
        height = Math.max(minSize, action.startHeight + dy);
      }

      if (action.handle?.includes("w")) {
        const nextWidth =
          Math.max(minSize, action.startWidth - dx);

        x =
          action.startX +
          (action.startWidth - nextWidth);

        width = nextWidth;
      }

      if (action.handle?.includes("n")) {
        const nextHeight =
          Math.max(minSize, action.startHeight - dy);

        y =
          action.startY +
          (action.startHeight - nextHeight);

        height = nextHeight;
      }

      updateShape(
        action.questionId,
        action.shapeId,
        {
          x: Math.max(0, x),
          y: Math.max(0, y),
          width,
          height,
        }
      );
    }

    function onPointerUp() {
      pointerActionRef.current = null;
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [questions]);

  useEffect(() => {
    function isEditableTarget(target: EventTarget | null) {
      const element = target as HTMLElement | null;

      return Boolean(
        element &&
          (
            element.tagName === "INPUT" ||
            element.tagName === "TEXTAREA" ||
            element.tagName === "SELECT" ||
            element.isContentEditable
          )
      );
    }

    function onKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) {
        return;
      }

      const ctrl =
        event.ctrlKey ||
        event.metaKey;

      if (
        ctrl &&
        event.key.toLowerCase() === "c" &&
        selectedShape
      ) {
        const question =
          questions.find(
            (item) => item.id === selectedShape.questionId
          );

        const shape =
          question?.shapes?.find(
            (item) => item.id === selectedShape.shapeId
          );

        if (shape) {
          copiedShapeRef.current = {
            ...shape,
          };
          event.preventDefault();
        }

        return;
      }

      if (
        ctrl &&
        event.key.toLowerCase() === "v" &&
        copiedShapeRef.current &&
        activeCanvasQuestionId
      ) {
        const source =
          copiedShapeRef.current;

        const clone: EditorShape = {
          ...source,
          id: makeShapeId(),
          x: source.x + 28,
          y: source.y + 28,
          zIndex: (Number(source.zIndex) || 0) + 1,
        };

        updateQuestionShapes(
          activeCanvasQuestionId,
          (shapes) => [
            ...shapes,
            clone,
          ]
        );

        setSelectedShape({
          questionId: activeCanvasQuestionId,
          shapeId: clone.id,
        });

        event.preventDefault();
        return;
      }

      if (
        (event.key === "Delete" ||
          event.key === "Backspace") &&
        selectedShape
      ) {
        removeShape(
          selectedShape.questionId,
          selectedShape.shapeId
        );
        event.preventDefault();
      }
    }

    function onPaste(event: ClipboardEvent) {
      if (isEditableTarget(event.target)) {
        return;
      }

      const questionId =
        activeCanvasQuestionId ||
        selectedShape?.questionId;

      if (!questionId) {
        return;
      }

      const imageItem =
        Array.from(event.clipboardData?.items || [])
          .find((item) =>
            item.type.startsWith("image/")
          );

      const file =
        imageItem?.getAsFile();

      if (!file) {
        return;
      }

      event.preventDefault();

      const reader = new FileReader();

      reader.onload = () => {
        const imageSrc =
          typeof reader.result === "string"
            ? reader.result
            : "";

        if (imageSrc) {
          addImageDataUrl(
            questionId,
            imageSrc
          );
        }
      };

      reader.readAsDataURL(file);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("paste", onPaste);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("paste", onPaste);
    };
  }, [
    questions,
    selectedShape,
    activeCanvasQuestionId,
  ]);


  function nextMatchingKey(
    question: ImportedQuestion,
    side: "left" | "right"
  ) {
    const existing =
      (question.shapes || [])
        .filter(
          (shape) =>
            shape.type === "matchingItem" &&
            shape.matchingSide === side
        )
        .map((shape) => shape.matchingKey || "");

    if (side === "left") {
      const numbers =
        existing
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value));

      const next =
        numbers.length > 0
          ? Math.max(...numbers) + 1
          : 1;

      return String(next);
    }

    const letters = "abcdefghijklmnopqrstuvwxyz";

    for (const letter of letters) {
      if (!existing.includes(letter)) {
        return letter;
      }
    }

    return `a${existing.length + 1}`;
  }

  function addMatchingItem(
    questionId: string,
    side: "left" | "right"
  ) {
    const question =
      questions.find((item) => item.id === questionId);

    if (!question) {
      return;
    }

    const key =
      nextMatchingKey(question, side);

    const sameSideCount =
      (question.shapes || []).filter(
        (shape) =>
          shape.type === "matchingItem" &&
          shape.matchingSide === side
      ).length;

    const shape: EditorShape = {
      id: makeShapeId(),
      type: "matchingItem",
      matchingSide: side,
      matchingKey: key,

      // Chap va o'ng ustun alohida joylashadi
      x:
        side === "left"
          ? 70
          : 390,
      y:
        side === "left"
          ? 75 + sameSideCount * 135
          : 35 + sameSideCount * 90,

      width:
        side === "left"
          ? 285
          : 470,
      height:
        side === "left"
          ? 96
          : 72,

      text:
        side === "left"
          ? `Atama ${key}`
          : `Izoh ${key}`,

      backgroundColor: "#ffffff",
      borderColor: "#1f2a30",
      textColor: "#111111",
      fontSize: 20,
      borderWidth: 2,
      borderRadius: 8,
      opacity: 1,
      zIndex: Date.now(),
    };

    updateQuestionShapes(questionId, (shapes) => [
      ...shapes,
      shape,
    ]);

    setSelectedShape({
      questionId,
      shapeId: shape.id,
    });

    setActiveCanvasQuestionId(questionId);
  }

  function addMatchingTemplate(questionId: string) {
    const question =
      questions.find((item) => item.id === questionId);

    if (!question) {
      return;
    }

    const hasMatching =
      (question.shapes || []).some(
        (shape) =>
          shape.type === "matchingItem"
      );

    if (hasMatching) {
      setMessage(
        "Moslashtirish shakli allaqachon bor. + Chap yoki + O‘ng orqali yangi qator qo‘shing."
      );
      return;
    }

    const leftTexts = [
      "Immunitet",
      "Inauguratsiya",
      "Kvorum",
    ];

    const rightTexts = [
      "Izoh a",
      "Izoh b",
      "Izoh c",
      "Izoh d",
      "Izoh e",
    ];

    const created: EditorShape[] = [];

    leftTexts.forEach((item, index) => {
      created.push({
        id: makeShapeId(),
        type: "matchingItem",
        matchingSide: "left",
        matchingKey: String(index + 1),
        x: 70,
        y: 75 + index * 135,
        width: 285,
        height: 96,
        text: item,
        backgroundColor: "#ffffff",
        borderColor: "#1f2a30",
        textColor: "#111111",
        fontSize: 21,
        borderWidth: 2,
        borderRadius: 4,
        opacity: 1,
        zIndex: Date.now() + index,
      });
    });

    rightTexts.forEach((item, index) => {
      created.push({
        id: makeShapeId(),
        type: "matchingItem",
        matchingSide: "right",
        matchingKey: String.fromCharCode(97 + index),
        x: 390,
        y: 35 + index * 90,
        width: 470,
        height: 72,
        text: item,
        backgroundColor: "#ffffff",
        borderColor: "#1f2a30",
        textColor: "#111111",
        fontSize: 18,
        borderWidth: 2,
        borderRadius: 4,
        opacity: 1,
        zIndex: Date.now() + 20 + index,
      });
    });

    updateQuestionShapes(questionId, (shapes) => [
      ...shapes,
      ...created,
    ]);

    setActiveCanvasQuestionId(questionId);
    setSelectedShape({
      questionId,
      shapeId: created[0].id,
    });
  }

  function renderShapeEditor(question: ImportedQuestion) {
    const shapes = question.shapes || [];

    const selected =
      selectedShape?.questionId === question.id
        ? shapes.find(
            (shape) =>
              shape.id === selectedShape.shapeId
          )
        : undefined;

    return (
      <div className="visualEditor">
        <div className="visualToolbar">
          <strong>Rasm / shakl editori</strong>

          <div className="visualToolbarButtons">
            <label className="visualTool imageVisualTool">
              Rasm
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  changeQuestionImage(
                    question.id,
                    event.target.files?.[0] ?? null
                  );
                  event.currentTarget.value = "";
                }}
              />
            </label>

            <button
              type="button"
              className="visualTool"
              onClick={() =>
                addShape(question.id, "text")
              }
            >
              Matn
            </button>

            <button
              type="button"
              className="visualTool"
              onClick={() =>
                addShape(question.id, "rectangle")
              }
            >
              To‘rtburchak
            </button>

            <button
              type="button"
              className="visualTool"
              onClick={() =>
                addShape(question.id, "roundedRectangle")
              }
            >
              Yumaloq
            </button>

            <button
              type="button"
              className="visualTool"
              onClick={() =>
                addShape(question.id, "circle")
              }
            >
              Doira
            </button>

            <button
              type="button"
              className="visualTool"
              onClick={() =>
                addShape(question.id, "ellipse")
              }
            >
              Oval
            </button>

            <button
              type="button"
              className="visualTool matchingTool"
              onClick={() =>
                addMatchingTemplate(
                  question.id
                )
              }
            >
              Moslashtirish
            </button>

            <button
              type="button"
              className="visualTool matchingAddTool"
              onClick={() =>
                addMatchingItem(
                  question.id,
                  "left"
                )
              }
            >
              + Chap
            </button>

            <button
              type="button"
              className="visualTool matchingAddTool"
              onClick={() =>
                addMatchingItem(
                  question.id,
                  "right"
                )
              }
            >
              + O‘ng
            </button>

            {(question.shapes || []).length > 0 && (
              <button
                type="button"
                className="visualTool clearAllShapesTool"
                onClick={() =>
                  removeAllShapes(
                    question.id
                  )
                }
              >
                Hammasini o‘chirish
              </button>
            )}
          </div>

          <span className="clipboardHint">
            Rasmni tanlang: Ctrl+C / Ctrl+V · Clipboard rasmini Ctrl+V · Delete
          </span>
        </div>

        <div
          className="shapeCanvasScroll"
          onPointerDown={() => {
            setActiveCanvasQuestionId(question.id);
            setSelectedShape(null);
          }}
        >
          <div
            className={
              activeCanvasQuestionId === question.id
                ? "shapeCanvas activeCanvas"
                : "shapeCanvas"
            }
          >
            {shapes.length === 0 && (
              <div className="emptyCanvas">
                PDFdagi rasm shu yerga tushadi yoki “Rasm” tugmasi / Ctrl+V orqali rasm qo‘shing.
              </div>
            )}

            {shapes.map((shape) => {
              const isSelected =
                selectedShape?.questionId === question.id &&
                selectedShape?.shapeId === shape.id;

              const style: React.CSSProperties = {
                left: shape.x,
                top: shape.y,
                width: shape.width,
                height: shape.height,
                zIndex: shape.zIndex ?? 1,
                opacity: shape.opacity ?? 1,
                borderWidth:
                  shape.type === "image" ||
                  shape.type === "matchingItem"
                    ? 0
                    : shape.borderWidth ?? 2,
                borderColor:
                  shape.borderColor ?? "#2f5975",
                borderStyle:
                  shape.type === "text"
                    ? "dashed"
                    : "solid",
                borderRadius:
                  shape.type === "matchingItem"
                    ? "0"
                    : shape.type === "circle" ||
                      shape.type === "ellipse"
                    ? "999px"
                    : `${shape.borderRadius ?? 4}px`,
                background:
                  shape.type === "text" ||
                  shape.type === "image" ||
                  shape.type === "matchingItem"
                    ? "transparent"
                    : shape.backgroundColor ?? "#8fc9ef",
                color: shape.textColor ?? "#111111",
              };

              return (
                <div
                  key={shape.id}
                  className={
                    isSelected
                      ? "canvasShape selectedCanvasShape"
                      : "canvasShape"
                  }
                  style={style}
                  onPointerDown={(event) =>
                    startShapePointer(
                      event,
                      question.id,
                      shape,
                      "move"
                    )
                  }
                  onDoubleClick={(event) => {
                    event.stopPropagation();

                    if (
                      shape.type === "text" ||
                      shape.type === "matchingItem"
                    ) {
                      const next = window.prompt(
                        shape.type === "matchingItem"
                          ? "Atama / izoh matni:"
                          : "Matn:",
                        shape.text || ""
                      );

                      if (next !== null) {
                        updateShape(
                          question.id,
                          shape.id,
                          {
                            text: next,
                          }
                        );
                      }
                    }
                  }}
                >
                  {shape.type === "image" &&
                  shape.imageSrc ? (
                    <img
                      src={shape.imageSrc}
                      alt="Savol rasmi"
                      draggable={false}
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "block",
                        objectFit:
                          shape.objectFit ?? "contain",
                        borderRadius: "inherit",
                        pointerEvents: "none",
                      }}
                    />
                  ) : shape.type === "matchingItem" ? (
                    <div
                      className={
                        shape.matchingSide === "left"
                          ? "matchingItem matchingLeft"
                          : "matchingItem matchingRight"
                      }
                    >
                      <div
                        className="matchingKeyCircle"
                        style={{
                          background:
                            shape.backgroundColor ||
                            "#ffffff",
                          borderColor:
                            shape.borderColor ||
                            "#111111",
                          color:
                            shape.textColor ||
                            "#111111",
                        }}
                      >
                        {shape.matchingKey}
                      </div>

                      <div
                        className="matchingTextBox"
                        style={{
                          background:
                            shape.backgroundColor ||
                            "#ffffff",
                          borderColor:
                            shape.borderColor ||
                            "#111111",
                          color:
                            shape.textColor ||
                            "#111111",
                        }}
                      >
                        <span
                          style={{
                            fontSize: `${shape.fontSize ?? 20}px`,
                          }}
                        >
                          {shape.text || ""}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span
                      className="shapeText"
                      style={{
                        fontSize: `${shape.fontSize ?? 22}px`,
                      }}
                    >
                      {shape.text || ""}
                    </span>
                  )}

                  <button
                    type="button"
                    className="shapeDeleteX"
                    title="O‘chirish"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();

                      removeShape(
                        question.id,
                        shape.id
                      );
                    }}
                  >
                    ×
                  </button>

                  {isSelected &&
                    (
                      ["nw", "ne", "sw", "se"] as const
                    ).map((handle) => (
                      <span
                        key={handle}
                        className={`resizeHandle handle-${handle}`}
                        onPointerDown={(event) =>
                          startShapePointer(
                            event,
                            question.id,
                            shape,
                            "resize",
                            handle
                          )
                        }
                      />
                    ))}
                </div>
              );
            })}
          </div>
        </div>

        {selected && (
          <div className="selectedShapePanel">
            <strong>
              Tanlangan: {selected.type}
            </strong>

            {(selected.type === "text" ||
              selected.type === "matchingItem") && (
              <input
                value={selected.text || ""}
                onChange={(event) =>
                  updateShape(
                    question.id,
                    selected.id,
                    {
                      text: event.target.value,
                    }
                  )
                }
                placeholder="Shakl matni"
              />
            )}

            <label>
              W
              <input
                type="number"
                min={40}
                value={Math.round(selected.width)}
                onChange={(event) =>
                  updateShape(
                    question.id,
                    selected.id,
                    {
                      width: Math.max(
                        40,
                        Number(event.target.value) || 40
                      ),
                    }
                  )
                }
              />
            </label>

            <label>
              H
              <input
                type="number"
                min={40}
                value={Math.round(selected.height)}
                onChange={(event) =>
                  updateShape(
                    question.id,
                    selected.id,
                    {
                      height: Math.max(
                        40,
                        Number(event.target.value) || 40
                      ),
                    }
                  )
                }
              />
            </label>

            {selected.type !== "image" && (
              <>
                <label className="shapeColorControl">
                  Fon
                  <input
                    type="color"
                    value={
                      selected.backgroundColor &&
                      selected.backgroundColor !== "transparent"
                        ? selected.backgroundColor
                        : "#ffffff"
                    }
                    onChange={(event) =>
                      updateShape(
                        question.id,
                        selected.id,
                        {
                          backgroundColor:
                            event.target.value,
                        }
                      )
                    }
                  />
                </label>

                <label className="shapeColorControl">
                  Chegara
                  <input
                    type="color"
                    value={
                      selected.borderColor ||
                      "#1f2a30"
                    }
                    onChange={(event) =>
                      updateShape(
                        question.id,
                        selected.id,
                        {
                          borderColor:
                            event.target.value,
                        }
                      )
                    }
                  />
                </label>

                <label className="shapeColorControl">
                  Matn
                  <input
                    type="color"
                    value={
                      selected.textColor ||
                      "#111111"
                    }
                    onChange={(event) =>
                      updateShape(
                        question.id,
                        selected.id,
                        {
                          textColor:
                            event.target.value,
                        }
                      )
                    }
                  />
                </label>
              </>
            )}

            <button
              type="button"
              onClick={() =>
                duplicateShape(
                  question.id,
                  selected.id
                )
              }
            >
              Nusxa
            </button>

            <button
              type="button"
              onClick={() =>
                changeShapeLayer(
                  question.id,
                  selected.id,
                  "front"
                )
              }
            >
              Oldinga
            </button>

            <button
              type="button"
              onClick={() =>
                changeShapeLayer(
                  question.id,
                  selected.id,
                  "back"
                )
              }
            >
              Orqaga
            </button>


          </div>
        )}
      </div>
    );
  }

  async function saveDraft() {
    if (
      questions.length === 0
    ) {
      setMessage(
        "Saqlash uchun savollar yo‘q."
      );
      return;
    }

    const invalid =
      questions.filter(
        (question) => {
          const correctCount =
            question.options.filter(
              (option) =>
                option.isCorrect
            ).length;

          return (
            !richTextHasContent(
              questionDrafts[question.id] ??
              question.questionText
            ) ||
            question.options.some(
              (option) =>
                !richTextHasContent(option.text)
            ) ||
            correctCount !== 1
          );
        }
      );

    if (
      invalid.length > 0
    ) {
      setMessage(
        `${invalid.length} ta savolda xato bor. Har bir savolda 4 ta variant va 1 ta to‘g‘ri javob bo‘lishi kerak.`
      );
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const payload = {
        title:
          title.trim(),
        subject:
          subject.trim(),
        duration:
          Number(duration) ||
          60,
        description:
          description.trim(),
        status: "draft",
        attemptLimit:
          attemptLimitEnabled
            ? Math.max(1, Number(attemptLimit) || 1)
            : null,

        questions:
          questions.map(
            (question) => ({
              id:
                question.id,

              questionHtml:
                sanitizeRichHtml(
                  questionDrafts[question.id] ??
                  question.questionText
                ),

              options:
                question.options.map(
                  (option) => ({
                    id:
                      option.id,
                    text:
                      sanitizeRichHtml(option.text),
                    isCorrect:
                      option.isCorrect,
                  })
                ),

              /*
                Rasm topilgan bo‘lsa, mavjud test editor
                schema'dagi image shape sifatida saqlaymiz.
              */
              shapes:
                Array.isArray(question.shapes)
                  ? question.shapes.flatMap<EditorShape>((shape): EditorShape[] => {
                      if (shape.type !== "matchingItem") {
                        return [
                          {
                            id: shape.id,
                            type: shape.type,
                            x: Math.round(shape.x),
                            y: Math.round(shape.y),
                            width: Math.max(1, Math.round(shape.width)),
                            height: Math.max(1, Math.round(shape.height)),
                            text: shape.text,
                            imageSrc: shape.imageSrc,
                            backgroundColor: shape.backgroundColor,
                            borderColor: shape.borderColor,
                            textColor: shape.textColor,
                            fontSize: shape.fontSize,
                            borderWidth: shape.borderWidth,
                            borderRadius: shape.borderRadius,
                            opacity: shape.opacity,
                            objectFit: shape.objectFit,
                            zIndex: shape.zIndex,
                          },
                        ];
                      }

                      const keyWidth = 50;
                      const gap = 8;
                      const boxX =
                        Math.round(shape.x) + keyWidth - 8;
                      const boxWidth =
                        Math.max(
                          70,
                          Math.round(shape.width) - keyWidth + 8
                        );

                      return [
                        {
                          id: `${shape.id}-box`,
                          type: "roundedRectangle",
                          x: boxX,
                          y: Math.round(shape.y),
                          width: boxWidth,
                          height: Math.max(1, Math.round(shape.height)),
                          backgroundColor: "#ffffff",
                          borderColor: shape.borderColor || "#1f2a30",
                          borderWidth: 2,
                          borderRadius: 8,
                          zIndex: shape.zIndex,
                        },
                        {
                          id: `${shape.id}-key-circle`,
                          type: "circle",
                          x: Math.round(shape.x),
                          y:
                            Math.round(shape.y) +
                            Math.max(
                              0,
                              Math.round(
                                (shape.height - keyWidth) / 2
                              )
                            ),
                          width: keyWidth,
                          height: keyWidth,
                          backgroundColor: "#ffffff",
                          borderColor: shape.borderColor || "#1f2a30",
                          borderWidth: 2,
                          borderRadius: 999,
                          zIndex: (shape.zIndex || 1) + 1,
                        },
                        {
                          id: `${shape.id}-key`,
                          type: "text",
                          x: Math.round(shape.x),
                          y:
                            Math.round(shape.y) +
                            Math.max(
                              0,
                              Math.round(
                                (shape.height - keyWidth) / 2
                              )
                            ),
                          width: keyWidth,
                          height: keyWidth,
                          text: shape.matchingKey || "",
                          textColor: shape.textColor || "#111111",
                          fontSize: 19,
                          borderWidth: 0,
                          zIndex: (shape.zIndex || 1) + 2,
                        },
                        {
                          id: `${shape.id}-text`,
                          type: "text",
                          x: boxX + gap,
                          y: Math.round(shape.y) + 7,
                          width: Math.max(
                            40,
                            boxWidth - gap * 2
                          ),
                          height: Math.max(
                            30,
                            Math.round(shape.height) - 14
                          ),
                          text: shape.text || "",
                          textColor: shape.textColor || "#111111",
                          fontSize: shape.fontSize || 18,
                          borderWidth: 0,
                          zIndex: (shape.zIndex || 1) + 2,
                        },
                      ];
                    })
                  : [],

              points: 1,
            })
          ),
      };

      const response =
        await fetch(
          "/api/tests",
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
                payload
              ),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.message ||
            "Testni saqlab bo‘lmadi."
        );
      }

      window.alert(
        "PDFdan yaratilgan test qoralama sifatida saqlandi."
      );

      router.push(
        "/admin/tests"
      );
    } catch (error) {
      console.error(
        "SAVE IMPORTED TEST ERROR:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Testni saqlashda xatolik."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page">
      <header className="header">
        <div className="headerTitle">
          <span>
            ADMIN PANEL
          </span>

          <strong>
            PDF dan test yaratish
          </strong>
        </div>

        <div className="headerActions">
          <button
            type="button"
            className="grayButton"
            onClick={() =>
              router.push(
                "/admin/tests"
              )
            }
          >
            Testlarni boshqarish
          </button>

          <button
            type="button"
            className="blueButton"
            onClick={() =>
              router.push(
                "/test/editor"
              )
            }
          >
            Oddiy test yaratish
          </button>
        </div>
      </header>

      <section className="mainBox">
        <div className="floatingTitle">
          PDF import
        </div>

        <div className="introBox">
          <strong>
            PDF → avtomatik test
          </strong>

          <p>
            Savol matni, A/B/C/D variantlar, + belgisi bilan ko‘rsatilgan to‘g‘ri javob va savol ichidagi diagramma/rasmlar avtomatik ajratiladi. Tahlildan keyin savolni tahrirlash, rasm qo‘shish, savol qo‘shish, nusxalash va tartibini o‘zgartirish mumkin.
          </p>
        </div>

        <div className="metaGrid">
          <label>
            <span>
              Test nomi
            </span>

            <input
              value={title}
              onChange={(
                event
              ) =>
                setTitle(
                  event.target
                    .value
                )
              }
              placeholder="Masalan: Jinoyat huquqi — 1-test"
            />
          </label>

          <label>
            <span>
              Fan nomi
            </span>

            <input
              value={subject}
              onChange={(
                event
              ) =>
                setSubject(
                  event.target
                    .value
                )
              }
              placeholder="Masalan: Jinoyat huquqi"
            />
          </label>

          <label>
            <span>Vaqt</span>

            <div className="durationBox">
              <input
                type="number"
                min={1}
                max={600}
                value={duration}
                onChange={(
                  event
                ) =>
                  setDuration(
                    Math.max(
                      1,
                      Number(
                        event
                          .target
                          .value
                      ) || 1
                    )
                  )
                }
              />

              <strong>
                daqiqa
              </strong>
            </div>
          </label>


          <label className="attemptField">
            <span>Urinishlar soni</span>

            <div className="attemptBox">
              <input
                type="number"
                min={1}
                max={100}
                value={attemptLimit}
                disabled={!attemptLimitEnabled}
                onChange={(event) =>
                  setAttemptLimit(
                    Math.max(
                      1,
                      Number(event.target.value) || 1
                    )
                  )
                }
              />

              <button
                type="button"
                className={
                  attemptLimitEnabled
                    ? "attemptToggle active"
                    : "attemptToggle"
                }
                onClick={() =>
                  setAttemptLimitEnabled(
                    (current) => !current
                  )
                }
              >
                {attemptLimitEnabled
                  ? "Cheklangan"
                  : "Cheksiz"}
              </button>
            </div>
          </label>

          <label className="descriptionField">
            <span>Izoh</span>

            <textarea
              value={
                description
              }
              onChange={(
                event
              ) =>
                setDescription(
                  event.target
                    .value
                )
              }
              placeholder="Ixtiyoriy..."
            />
          </label>
        </div>

        <div
          className={
            pdfFile
              ? "uploadArea hasFile"
              : "uploadArea"
          }
          onDragOver={(
            event
          ) =>
            event.preventDefault()
          }
          onDrop={(
            event
          ) => {
            event.preventDefault();

            handleFile(
              event
                .dataTransfer
                .files?.[0] ??
                null
            );
          }}
        >
          <div className="pdfBadge">
            PDF
          </div>

          <h2>
            PDF faylni tanlang
          </h2>

          <p>
            Eng ishonchli usul: to‘g‘ri variantga + belgisi qo‘ying.
          </p>

          <label className="fileButton">
            PDF tanlash

            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(
                event
              ) =>
                handleFile(
                  event.target
                    .files?.[0] ??
                    null
                )
              }
            />
          </label>

          {pdfFile && (
            <div className="selectedFile">
              <strong>
                {pdfFile.name}
              </strong>

              <span>
                {(
                  pdfFile.size /
                  1024 /
                  1024
                ).toFixed(2)}{" "}
                MB
              </span>
            </div>
          )}
        </div>

        {message && (
          <div className="messageBox">
            {message}
          </div>
        )}

        <div className="analyzeActions">
          <button
            type="button"
            className="analyzeButton"
            onClick={
              analyzePdf
            }
            disabled={
              analyzing ||
              saving
            }
          >
            {analyzing
              ? "PDF tahlil qilinmoqda..."
              : "PDFNI TAHLIL QILISH"}
          </button>
        </div>
      </section>

      {questions.length >
        0 && (
        <section className="previewBox">
          <div className="floatingTitle">
            Tekshirish
          </div>

          <div className="previewHeader">
            <div>
              <strong>
                {
                  questions.length
                }{" "}
                ta savol topildi
              </strong>

              <span>
                {warningCount >
                0
                  ? `${warningCount} ta savol tekshirilishi kerak`
                  : "Barcha savollar tayyor"}
              </span>
            </div>

            <div className="previewActions">
              <button
                type="button"
                className="addQuestionButton"
                onClick={addQuestion}
                disabled={saving}
              >
                + YANGI SAVOL
              </button>

              <button
                type="button"
                className="saveDraftButton"
                onClick={saveDraft}
                disabled={saving}
              >
                QORALAMA SIFATIDA SAQLASH
              </button>
            </div>
          </div>

          <div className="questionsList">
            {questions.map(
              (
                question
              ) => (
                <article
                  className={
                    question.warning
                      ? "questionCard warningCard"
                      : "questionCard"
                  }
                  key={
                    question.id
                  }
                >
                  <div className="questionTop">
                    <div className="questionNumber">
                      {
                        question.number
                      }
                      -savol
                    </div>

                    <div className="questionTools">
                      <button
                        type="button"
                        className="toolButton"
                        onClick={() =>
                          moveQuestion(
                            question.id,
                            -1
                          )
                        }
                        disabled={
                          question.number === 1
                        }
                        title="Yuqoriga ko‘chirish"
                      >
                        ↑
                      </button>

                      <button
                        type="button"
                        className="toolButton"
                        onClick={() =>
                          moveQuestion(
                            question.id,
                            1
                          )
                        }
                        disabled={
                          question.number === questions.length
                        }
                        title="Pastga ko‘chirish"
                      >
                        ↓
                      </button>

                      <button
                        type="button"
                        className="duplicateButton"
                        onClick={() =>
                          duplicateQuestion(
                            question.id
                          )
                        }
                      >
                        Nusxalash
                      </button>

                      <button
                        type="button"
                        className={
                          openVisualEditors[question.id]
                            ? "imageButton imageButtonActive"
                            : "imageButton"
                        }
                        onClick={() => {
                          setOpenVisualEditors((current) => ({
                            ...current,
                            [question.id]:
                              !current[question.id],
                          }));

                          setActiveCanvasQuestionId(
                            question.id
                          );
                        }}
                      >
                        {openVisualEditors[question.id]
                          ? "Rasm / shaklni yopish"
                          : "Rasm / shakl"}
                      </button>

                      <button
                        type="button"
                        className="removeButton"
                        onClick={() =>
                          removeQuestion(
                            question.id
                          )
                        }
                      >
                        O‘chirish
                      </button>
                    </div>
                  </div>

                  {question.warning && (
                    <div className="warningBox">
                      {
                        question.warning
                      }
                    </div>
                  )}

                  <div className="questionTextField">
                    <span>
                      Savol matni
                    </span>

                    <RichTextEditor
                      editorId={`question:${question.id}`}
                      value={
                        questionDrafts[question.id] ??
                        question.questionText
                      }
                      onChange={(value) =>
                        changeQuestionText(
                          question.id,
                          value
                        )
                      }
                      placeholder="Savol matnini shu yerda tahrirlang..."
                      minHeight={170}
                    />
                  </div>

                  {openVisualEditors[question.id] &&
                    renderShapeEditor(question)}

                  <div className="optionsList">
                    {question.options.map(
                      (
                        option
                      ) => (
                        <div
                          className={
                            option.isCorrect
                              ? "optionRow correctOption"
                              : "optionRow"
                          }
                          key={
                            option.id
                          }
                        >
                          <button
                            type="button"
                            className="correctSelector"
                            onClick={() =>
                              setCorrectAnswer(
                                question.id,
                                option.id
                              )
                            }
                          >
                            {option.isCorrect
                              ? "✓"
                              : ""}
                          </button>

                          <strong className="optionLetter">
                            {
                              option.label
                            }
                          </strong>

                          <RichTextEditor
                            editorId={`option:${question.id}:${option.id}`}
                            value={option.text}
                            onChange={(value) =>
                              changeOptionText(
                                question.id,
                                option.id,
                                value
                              )
                            }
                            placeholder={`${option.label} variant matni...`}
                            minHeight={80}
                            compact
                          />

                          {option.isCorrect && (
                            <span className="correctBadge">
                              TO‘G‘RI
                            </span>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </article>
              )
            )}
          </div>

          <div className="bottomSave">
            <button
              type="button"
              className="addQuestionButton"
              onClick={addQuestion}
              disabled={saving}
            >
              + YANGI SAVOL
            </button>

            <button
              type="button"
              className="saveDraftButton"
              onClick={saveDraft}
              disabled={saving}
            >
              QORALAMA SIFATIDA SAQLASH
            </button>
          </div>
        </section>
      )}

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          padding-bottom: 70px;
          background: #e5eaed;
          color: #101820;
          font-family: "Bell MT", "Times New Roman", serif;
        }

        .header {
          width: min(1480px, 96%);
          margin: 24px auto 0;
          padding: 20px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          border: 3px solid #30383d;
          border-radius: 24px;
          background: linear-gradient(145deg,#697176,#42494d);
          box-shadow: inset 0 6px 6px rgba(255,255,255,.24),0 9px 20px rgba(0,0,0,.18);
        }

        .headerTitle {
          display: flex;
          flex-direction: column;
          gap: 4px;
          color: #fff;
        }

        .headerTitle span {
          font-size: 12px;
          letter-spacing: 2px;
        }

        .headerTitle strong {
          font-size: 28px;
        }

        .headerActions {
          display: flex;
          gap: 12px;
        }

        .grayButton,
        .blueButton {
          min-height: 52px;
          padding: 10px 18px;
          border-radius: 12px;
          cursor: pointer;
          font-family: inherit;
          font-weight: 700;
        }

        .grayButton {
          border: 2px solid #535a5e;
          background: linear-gradient(#fafafa,#b6b6b6);
          box-shadow: 0 5px 0 #4b5256;
        }

        .blueButton {
          color: #073b68;
          border: 2px solid #174461;
          background: linear-gradient(#caefff,#63b3df);
          box-shadow: 0 5px 0 #17415c;
        }

        .mainBox,
        .previewBox {
          position: relative;
          width: min(1300px,94%);
          margin: 72px auto 0;
          padding: 70px 30px 35px;
          border: 3px solid #3e474c;
          border-radius: 24px;
          background: linear-gradient(145deg,#666d71,#41474b);
          box-shadow: inset 0 7px 6px rgba(255,255,255,.20),0 9px 20px rgba(0,0,0,.19);
        }

        .floatingTitle {
          position: absolute;
          top: -27px;
          left: 50%;
          transform: translateX(-50%);
          min-width: 240px;
          padding: 11px 22px;
          text-align: center;
          color: #073b68;
          font-size: 20px;
          font-weight: 700;
          border: 2px solid #174461;
          border-radius: 12px;
          background: linear-gradient(#caf0ff,#59a9d5);
          box-shadow: 0 5px 0 #17415c;
        }

        .introBox {
          padding: 18px 20px;
          border-radius: 14px;
          background: #edf8ff;
          border: 2px solid #6c91a8;
        }

        .introBox strong {
          display: block;
          margin-bottom: 5px;
          color: #073b68;
          font-size: 18px;
        }

        .introBox p {
          margin: 0;
          line-height: 1.55;
        }

        .metaGrid {
          margin-top: 22px;
          display: grid;
          grid-template-columns: repeat(4,minmax(0,1fr));
          gap: 16px;
        }

        .metaGrid label {
          display: flex;
          flex-direction: column;
          gap: 7px;
          color: #fff;
          font-weight: 700;
        }

        .attemptField {
          min-width: 0;
        }

        .attemptBox {
          display: grid;
          grid-template-columns: minmax(0,1fr) auto;
          gap: 8px;
          align-items: center;
        }

        .attemptToggle {
          min-height: 47px;
          padding: 0 12px;
          border: 2px solid #606a70;
          border-radius: 10px;
          background: linear-gradient(#fafafa,#c5c5c5);
          font-family: inherit;
          font-weight: 800;
          cursor: pointer;
        }

        .attemptToggle.active {
          color: #07517e;
          border-color: #174461;
          background: linear-gradient(#d7f4ff,#7fc9ec);
        }

        .descriptionField {
          grid-column: 1/-1;
        }

        .metaGrid input,
        .metaGrid textarea {
          width: 100%;
          padding: 12px 13px;
          border: 2px solid #69747a;
          border-radius: 10px;
          font-family: inherit;
          font-size: 16px;
          background: #fff;
        }

        .metaGrid textarea {
          min-height: 85px;
        }

        .durationBox {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px;
          align-items: center;
        }

        .uploadArea {
          margin-top: 24px;
          min-height: 270px;
          padding: 30px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          text-align: center;
          border: 3px dashed #7b858a;
          border-radius: 18px;
          background: linear-gradient(#f8f8f8,#e0e0e0);
        }

        .uploadArea.hasFile {
          border-style: solid;
          border-color: #3980a8;
          background: linear-gradient(#f2fbff,#dceefa);
        }

        .pdfBadge {
          min-width: 80px;
          padding: 9px 14px;
          color: #fff;
          font-size: 20px;
          font-weight: 900;
          border-radius: 9px;
          background: #ba3434;
        }

        .fileButton {
          position: relative;
          padding: 11px 18px;
          cursor: pointer;
          color: #073b68;
          font-weight: 700;
          border: 2px solid #174461;
          border-radius: 10px;
          background: #aee1fa;
        }

        .fileButton input {
          position: absolute;
          width: 1px;
          height: 1px;
          opacity: 0;
        }

        .selectedFile {
          padding: 8px 12px;
          background: #fff;
          border-radius: 8px;
        }

        .selectedFile span {
          margin-left: 10px;
          color: #657178;
        }

        .messageBox {
          margin-top: 17px;
          padding: 13px 15px;
          border-radius: 10px;
          background: #fff;
          font-weight: 700;
        }

        .analyzeActions,
        .bottomSave {
          margin-top: 20px;
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        .analyzeButton,
        .saveDraftButton {
          min-height: 56px;
          padding: 11px 24px;
          cursor: pointer;
          color: #073b68;
          font-family: inherit;
          font-weight: 800;
          border: 2px solid #174461;
          border-radius: 12px;
          background: linear-gradient(#c9efff,#5eacd8);
          box-shadow: 0 5px 0 #17415c;
        }

        .previewHeader {
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          background: #fff;
          border-radius: 13px;
        }

        .previewHeader > div {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .previewActions {
          display: flex !important;
          flex-direction: row !important;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 10px !important;
        }

        .addQuestionButton {
          min-height: 56px;
          padding: 11px 24px;
          cursor: pointer;
          color: #125a32;
          font-family: inherit;
          font-weight: 800;
          border: 2px solid #277b49;
          border-radius: 12px;
          background: linear-gradient(#d8f5e1,#75cf95);
          box-shadow: 0 5px 0 #277144;
        }

        .questionsList {
          margin-top: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .questionCard {
          padding: 20px;
          border: 2px solid #59646a;
          border-radius: 17px;
          background: linear-gradient(#fafafa,#e3e3e3);
          box-shadow: 0 5px 0 #666d71;
        }

        .warningCard {
          border-color: #bb7b25;
        }

        .questionTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
        }

        .questionTools {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          align-items: center;
          gap: 7px;
        }

        .toolButton,
        .duplicateButton,
        .imageButton {
          min-height: 34px;
          padding: 6px 10px;
          border: 2px solid #626d73;
          border-radius: 7px;
          background: linear-gradient(#fff,#cfcfcf);
          cursor: pointer;
          font-family: inherit;
          font-weight: 700;
        }

        .toolButton {
          min-width: 38px;
          font-size: 17px;
        }

        .toolButton:disabled {
          opacity: .35;
          cursor: not-allowed;
        }

        .duplicateButton {
          color: #073b68;
          border-color: #174461;
          background: linear-gradient(#dff5ff,#91d3f0);
        }

        .imageButton {
          position: relative;
          color: #125a32;
          border-color: #277b49;
          background: linear-gradient(#e1f7e7,#9bd9ae);
        }

        .imageButtonActive {
          color: #073b68;
          border-color: #174461;
          background: linear-gradient(#dff5ff,#91d3f0);
        }

        .imageButton input,
        .imageReplaceButton input {
          position: absolute;
          width: 1px;
          height: 1px;
          opacity: 0;
          pointer-events: none;
        }

        .questionNumber {
          padding: 7px 13px;
          color: #073b68;
          font-weight: 800;
          border: 2px solid #174461;
          border-radius: 9px;
          background: #9bd8f6;
        }

        .removeButton {
          padding: 6px 11px;
          border: 2px solid #9b2828;
          border-radius: 7px;
          background: #ef8d8d;
          cursor: pointer;
          font-family: inherit;
          font-weight: 700;
        }

        .warningBox {
          margin-bottom: 12px;
          padding: 10px 12px;
          color: #7b4b09;
          background: #fff2d8;
          border: 1px solid #c58a33;
          border-radius: 8px;
          font-weight: 700;
        }

        .questionTextField {
          display: flex;
          flex-direction: column;
          gap: 7px;
          font-weight: 700;
        }

        .questionTextField textarea {
          min-height: 150px;
          padding: 18px 20px;
          border: 2px solid #737d82;
          border-radius: 10px;
          font-family: inherit;
          font-size: 21px;
          line-height: 1.6;
          text-align: justify;
          text-justify: inter-word;
          resize: vertical;
        }

        .questionImagePreview {
          margin: 16px 0;
          padding: 12px;
          text-align: center;
          border: 2px solid #365b70;
          border-radius: 13px;
          background: #fff;
        }

        .imageLabel {
          width: fit-content;
          margin: 0 auto 10px;
          padding: 5px 10px;
          color: #073b68;
          font-size: 12px;
          font-weight: 700;
          border-radius: 999px;
          background: #d8effc;
        }

        .questionImagePreview img {
          display: block;
          width: 100%;
          max-width: 980px;
          max-height: 620px;
          margin: auto;
          object-fit: contain;
        }

        .imageActions {
          margin-top: 12px;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 9px;
        }

        .imageReplaceButton,
        .imageRemoveButton {
          position: relative;
          min-height: 38px;
          padding: 8px 13px;
          border-radius: 8px;
          cursor: pointer;
          font-family: inherit;
          font-weight: 700;
        }

        .imageReplaceButton {
          color: #073b68;
          border: 2px solid #174461;
          background: #bfe8fb;
        }

        .imageRemoveButton {
          color: #7b1515;
          border: 2px solid #9b2828;
          background: #ffdede;
        }

        .visualEditor {
          margin: 18px 0 22px;
          overflow: hidden;
          border: 2px solid #365b70;
          border-radius: 14px;
          background: #f8fbfc;
          box-shadow: 0 3px 0 rgba(39,55,64,.18);
        }

        .visualEditor button,
        .visualEditor label,
        .visualEditor input {
          font-family: "Bell MT", Georgia, serif;
        }

        .visualToolbar {
          padding: 11px 12px;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          border-bottom: 1px solid #9eabb2;
          background: linear-gradient(#f8f8f8,#dedede);
        }

        .visualToolbar > strong {
          color: #073b68;
          margin-right: 4px;
        }

        .visualToolbarButtons {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 7px;
        }

        .visualTool {
          position: relative;
          min-width: 76px;
          min-height: 38px;
          padding: 7px 12px;
          border: 1px solid #68747b;
          border-radius: 7px;
          background: linear-gradient(#ffffff,#d7d7d7);
          box-shadow: inset 0 1px 0 #fff, 0 2px 0 rgba(0,0,0,.12);
          cursor: pointer;
          font-family: inherit;
          font-size: 14px;
          font-weight: 700;
        }

        .visualTool:hover {
          filter: brightness(.98);
          transform: translateY(-1px);
        }

        .imageVisualTool {
          color: #125a32;
          border-color: #277b49;
          background: linear-gradient(#e9faee,#aee0bd);
        }

        .visualTool input {
          position: absolute;
          width: 1px;
          height: 1px;
          opacity: 0;
          pointer-events: none;
        }

        .clipboardHint {
          margin-left: auto;
          color: #5c686f;
          font-size: 12px;
          font-weight: 700;
        }

        .shapeCanvasScroll {
          width: 100%;
          overflow: auto;
          padding: 12px;
          background:
            linear-gradient(90deg, rgba(50,70,80,.05) 1px, transparent 1px),
            linear-gradient(rgba(50,70,80,.05) 1px, transparent 1px),
            #eef2f4;
          background-size: 20px 20px;
        }

        .shapeCanvas {
          position: relative;
          width: 900px;
          height: 500px;
          margin: 0 auto;
          overflow: hidden;
          border: 2px solid #8d999f;
          border-radius: 10px;
          background: #fff;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.9);
          touch-action: none;
          user-select: none;
        }

        .activeCanvas {
          outline: 3px solid rgba(22,143,201,.25);
          outline-offset: 2px;
        }

        .emptyCanvas {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 30px;
          color: #7b878e;
          font-size: 15px;
          text-align: center;
          pointer-events: none;
        }

        .canvasShape {
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          cursor: move;
          touch-action: none;
        }

        .selectedCanvasShape {
          outline: 2px solid #168fc9;
          outline-offset: 2px;
        }

        .shapeText {
          width: 100%;
          padding: 8px;
          text-align: center;
          overflow: hidden;
          overflow-wrap: anywhere;
          pointer-events: none;
        }

        .shapeDeleteX {
          position: absolute;
          top: -14px;
          right: -14px;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #ffffff;
          border-radius: 50%;
          color: #ffffff;
          background: #df3434;
          box-shadow: 0 2px 5px rgba(0,0,0,.28);
          cursor: pointer;
          font-family: Arial, sans-serif;
          font-size: 20px;
          font-weight: 900;
          line-height: 1;
          opacity: 0;
          transform: scale(.85);
          transition: .14s ease;
          z-index: 1005;
        }

        .canvasShape:hover > .shapeDeleteX,
        .selectedCanvasShape > .shapeDeleteX {
          opacity: 1;
          transform: scale(1);
        }

        .matchingItem {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          pointer-events: none;
        }

        .matchingTextBox {
          position: absolute;
          left: 40px;
          right: 0;
          top: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px 18px 10px 30px;
          border: 2px solid #111;
          border-radius: 4px;
          background: #ffffff;
          overflow: hidden;
          text-align: center;
          box-shadow: none;
        }

        .matchingRight .matchingTextBox {
          justify-content: flex-start;
          text-align: left;
          padding-left: 34px;
          line-height: 1.28;
        }

        .matchingKeyCircle {
          position: relative;
          z-index: 3;
          width: 60px;
          height: 60px;
          flex: 0 0 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #111;
          border-radius: 50%;
          background: #ffffff;
          font-size: 22px;
          font-weight: 400;
        }

        .matchingLeft .matchingKeyCircle {
          margin-left: 0;
        }

        .matchingRight .matchingKeyCircle {
          width: 54px;
          height: 54px;
          flex-basis: 54px;
          font-size: 20px;
        }

        .matchingTool {
          color: #6b3e00;
          border-color: #a06616;
          background: linear-gradient(#fff4d7,#f1c66b);
        }

        .matchingAddTool {
          color: #073b68;
          border-color: #174461;
          background: linear-gradient(#e3f6ff,#9bd9f2);
        }

        .clearAllShapesTool {
          color: #821818;
          border-color: #a32828;
          background: linear-gradient(#ffe6e6,#f39a9a);
        }

        .shapeColorControl {
          min-width: 86px;
          display: flex !important;
          align-items: center;
          justify-content: space-between;
          gap: 7px;
          padding: 4px 7px;
          border: 1px solid #8c989e;
          border-radius: 6px;
          background: #fff;
        }

        .shapeColorControl input[type="color"] {
          width: 34px;
          height: 28px;
          padding: 1px;
          border: 1px solid #8c989e;
          border-radius: 4px;
          cursor: pointer;
        }

        .resizeHandle {
          position: absolute;
          width: 13px;
          height: 13px;
          border: 2px solid #07517e;
          background: #fff;
          border-radius: 2px;
          z-index: 999;
        }

        .handle-nw { left: -8px; top: -8px; cursor: nwse-resize; }
        .handle-ne { right: -8px; top: -8px; cursor: nesw-resize; }
        .handle-sw { left: -8px; bottom: -8px; cursor: nesw-resize; }
        .handle-se { right: -8px; bottom: -8px; cursor: nwse-resize; }

        .selectedShapePanel {
          padding: 10px 12px;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          border-top: 1px solid #9eabb2;
          background: #f7f9fa;
        }

        .selectedShapePanel > strong {
          color: #073b68;
          margin-right: 4px;
        }

        .selectedShapePanel label {
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 700;
        }

        .selectedShapePanel input {
          width: 100px;
          min-height: 34px;
          padding: 5px 7px;
          border: 1px solid #8c989e;
          border-radius: 6px;
          font-family: inherit;
        }

        .selectedShapePanel > input {
          width: min(260px, 100%);
        }

        .selectedShapePanel button {
          min-height: 34px;
          padding: 5px 10px;
          border: 1px solid #68747b;
          border-radius: 6px;
          background: linear-gradient(#fff,#d9d9d9);
          cursor: pointer;
          font-family: inherit;
          font-weight: 700;
        }

        .optionsList {
          margin-top: 15px;
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .optionRow {
          display: grid;
          grid-template-columns: 42px 34px minmax(0,1fr) auto;
          align-items: center;
          gap: 8px;
          padding: 9px;
          border: 1px solid #8d999f;
          border-radius: 9px;
          background: #f5f5f5;
        }

        .correctOption {
          border: 2px solid #348255;
          background: #e7f7ed;
        }

        .correctSelector {
          width: 42px;
          height: 42px;
          cursor: pointer;
          border: 2px solid #69747a;
          border-radius: 50%;
          background: #fff;
          font-weight: 900;
        }

        .correctOption .correctSelector {
          color: #fff;
          background: #3d9b64;
          font-size: 20px;
        }

        .optionLetter {
          font-size: 21px;
          font-weight: 800;
        }

        .optionRow textarea {
          width: 100%;
          min-height: 72px;
          padding: 13px 15px;
          border: 1px solid #8d999f;
          border-radius: 8px;
          font-family: inherit;
          font-size: 19px;
          line-height: 1.5;
          text-align: justify;
          text-justify: inter-word;
          resize: vertical;
        }

        .correctBadge {
          padding: 5px 8px;
          color: #17623a;
          font-size: 10px;
          font-weight: 900;
          background: #ccebd7;
          border-radius: 999px;
        }

        @media(max-width:600px) {
          .header {
            width: calc(100% - 8px);
            margin-top: 5px;
            padding: 10px;
            flex-direction: column;
            align-items: stretch;
          }

          .headerActions,
          .metaGrid {
            display: grid;
            grid-template-columns: 1fr;
          }

          .mainBox,
          .previewBox {
            width: calc(100% - 8px);
            margin-top: 50px;
            padding: 48px 8px 18px;
          }

          .previewHeader {
            flex-direction: column;
            align-items: stretch;
          }

          .previewActions {
            width: 100%;
            display: grid !important;
            grid-template-columns: 1fr !important;
          }

          .questionTop {
            align-items: flex-start;
            flex-direction: column;
          }

          .questionTools {
            width: 100%;
            justify-content: flex-start;
          }

          .questionTools > * {
            flex: 1 1 auto;
            text-align: center;
          }

          .attemptBox {
            grid-template-columns: 1fr;
          }

          .questionTextField textarea {
            min-height: 130px;
            padding: 14px;
            font-size: 17px;
            line-height: 1.55;
          }

          .optionRow {
            grid-template-columns: 36px 28px 1fr;
          }

          .correctSelector {
            width: 34px;
            height: 34px;
          }

          .optionLetter {
            font-size: 18px;
          }

          .optionRow textarea {
            min-height: 64px;
            padding: 11px 12px;
            font-size: 16px;
            line-height: 1.45;
          }

          .questionImagePreview img {
            max-height: 420px;
          }

          .visualToolbar {
            align-items: stretch;
          }

          .visualToolbarButtons {
            width: 100%;
          }

          .visualTool {
            flex: 1 1 auto;
            text-align: center;
          }

          .clipboardHint {
            width: 100%;
            margin-left: 0;
          }

          .shapeCanvasScroll {
            padding: 7px;
          }

          .shapeCanvas {
            width: 760px;
            height: 460px;
          }

          .selectedShapePanel {
            align-items: stretch;
          }

          .selectedShapePanel button,
          .selectedShapePanel label {
            flex: 1 1 auto;
          }

          .correctBadge {
            grid-column: 3;
          }
        }
      `}</style>
    </main>
  );
}
