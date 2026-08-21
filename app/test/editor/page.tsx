"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ClipboardEvent as ReactClipboardEvent,
} from "react";

import {
  useRouter,
} from "next/navigation";

/* =========================================================
   TYPES
========================================================= */

type TestStatus =
  | "draft"
  | "published";

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

  text: string;

  backgroundColor: string;
  borderColor: string;
  textColor: string;

  fontSize: number;
  fontFamily: string;

  fontWeight:
    | "normal"
    | "bold";

  fontStyle:
    | "normal"
    | "italic";

  textAlign:
    | "left"
    | "center"
    | "right";
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
  text: string;
  isCorrect: boolean;
};

type TestQuestion = {
  id: string;

  questionHtml: string;

  options: TestOption[];

  shapes: TestShape[];

  points: number;
};

type TestData = {
  id?: string;

  title: string;
  subject: string;

  duration: number;

  description: string;

  questions: TestQuestion[];

  status: TestStatus;

  /*
    null = cheksiz urinish.
    1, 2, 3... = ruxsat etilgan maksimal urinishlar soni.
  */
  attemptLimit?: number | null;

  createdAt?: string;
  updatedAt?: string;
};

/* =========================================================
   HELPERS
========================================================= */

function makeId() {
  return crypto.randomUUID();
}

function makeOptions(): TestOption[] {
  return [
    {
      id: makeId(),
      text: "",
      isCorrect: true,
    },
    {
      id: makeId(),
      text: "",
      isCorrect: false,
    },
    {
      id: makeId(),
      text: "",
      isCorrect: false,
    },
    {
      id: makeId(),
      text: "",
      isCorrect: false,
    },
  ];
}

function makeQuestion(): TestQuestion {
  return {
    id: makeId(),

    questionHtml: "",

    options:
      makeOptions(),

    shapes: [],

    points: 1,
  };
}

function optionLetter(
  index: number
) {
  return [
    "A",
    "B",
    "C",
    "D",
  ][index] ?? "?";
}

/* =========================================================
   PAGE
========================================================= */

export default function TestEditorPage() {
  const router =
    useRouter();

  const [
    editingId,
    setEditingId,
  ] = useState<string | null>(null);

  const [
    paramsReady,
    setParamsReady,
  ] = useState(false);

  const editorRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const canvasRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const imageInputRef =
    useRef<HTMLInputElement | null>(null);

  /* =======================================================
     STATES
  ======================================================= */

  const [
    adminChecked,
    setAdminChecked,
  ] = useState(false);

  const [
    loadingTest,
    setLoadingTest,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    title,
    setTitle,
  ] = useState("");

  const [
    subject,
    setSubject,
  ] = useState("");

  const [
    duration,
    setDuration,
  ] = useState(30);

  const [
    description,
    setDescription,
  ] = useState("");

  /* =======================================================
     URINISHLAR

     unlimitedAttempts = true  -> cheksiz
     unlimitedAttempts = false -> attemptLimit soni bo‘yicha
  ======================================================= */

  const [
    attemptLimit,
    setAttemptLimit,
  ] = useState(1);

  const [
    unlimitedAttempts,
    setUnlimitedAttempts,
  ] = useState(true);

  const [
    questions,
    setQuestions,
  ] = useState<
    TestQuestion[]
  >([
    makeQuestion(),
  ]);

  const [
    activeQuestionId,
    setActiveQuestionId,
  ] = useState(
    questions[0].id
  );

  const [
    selectedShapeId,
    setSelectedShapeId,
  ] = useState<
    string | null
  >(null);

  const [
    fontFamily,
    setFontFamily,
  ] = useState(
    "Bell MT"
  );

  const [
    fontSize,
    setFontSize,
  ] = useState("18");

  /* =======================================================
     ACTIVE QUESTION
  ======================================================= */

  const activeQuestion =
    useMemo(
      () =>
        questions.find(
          (item) =>
            item.id ===
            activeQuestionId
        ) ??
        questions[0],
      [
        questions,
        activeQuestionId,
      ]
    );

  const selectedShape =
    useMemo(
      () =>
        activeQuestion
          ?.shapes
          .find(
            (shape) =>
              shape.id ===
              selectedShapeId
          ) ?? null,
      [
        activeQuestion,
        selectedShapeId,
      ]
    );

  /* =======================================================
     URL PARAMETRINI CLIENT TOMONDA O‘QISH
     Vercel prerender paytida useSearchParams xatosini
     oldini oladi.
  ======================================================= */

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search
    );

    setEditingId(
      params.get("id")
    );

    setParamsReady(true);
  }, []);

  /* =======================================================
     ADMIN CHECK
  ======================================================= */

  useEffect(() => {
    async function checkAdmin() {
      try {
        const response =
          await fetch(
            "/api/me",
            {
              cache:
                "no-store",
              credentials:
                "include",
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          data?.role !== "admin"
        ) {
          router.replace(
            "/admin/tests"
          );

          return;
        }

        setAdminChecked(
          true
        );
      } catch {
        router.replace(
          "/test"
        );
      }
    }

    checkAdmin();
  }, [router]);

  /* =======================================================
     EXISTING TEST LOAD
  ======================================================= */

  useEffect(() => {
    if (
      !adminChecked ||
      !editingId
    ) {
      return;
    }

    async function loadTest() {
      setLoadingTest(
        true
      );

      try {
        const response =
          await fetch(
            `/api/tests/${encodeURIComponent(
              editingId!
            )}`,
            {
              cache:
                "no-store",
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success ||
          !data.test
        ) {
          alert(
            data.message ||
              "Test topilmadi."
          );

          router.replace(
            "/test"
          );

          return;
        }

        const test =
          data.test as TestData;

        setTitle(
          test.title || ""
        );

        setSubject(
          test.subject || ""
        );

        setDuration(
          Number(
            test.duration
          ) || 30
        );

        setDescription(
          test.description ||
            ""
        );

        /*
          Eski testlarda attemptLimit bo‘lmasligi mumkin.
          Bunday testlar avtomatik ravishda CHEKSIZ deb olinadi.
        */
        if (
          test.attemptLimit === null ||
          typeof test.attemptLimit === "undefined"
        ) {
          setUnlimitedAttempts(true);
          setAttemptLimit(1);
        } else {
          setUnlimitedAttempts(false);
          setAttemptLimit(
            Math.max(
              1,
              Number(test.attemptLimit) || 1
            )
          );
        }

        const loadedQuestions =
          Array.isArray(
            test.questions
          ) &&
          test.questions.length >
            0
            ? test.questions
            : [
                makeQuestion(),
              ];

        setQuestions(
          loadedQuestions
        );

        setActiveQuestionId(
          loadedQuestions[0].id
        );
      } catch {
        alert(
          "Testni yuklashda server xatosi."
        );
      } finally {
        setLoadingTest(
          false
        );
      }
    }

    loadTest();
  }, [
    adminChecked,
    editingId,
    router,
  ]);

  /* =======================================================
     QUESTION UPDATE
  ======================================================= */

  function updateQuestion(
    id: string,
    patch:
      Partial<TestQuestion>
  ) {
    setQuestions(
      (current) =>
        current.map(
          (question) =>
            question.id === id
              ? {
                  ...question,
                  ...patch,
                }
              : question
        )
    );
  }

  /* =======================================================
     EDITOR SYNC
  ======================================================= */

  function saveEditorHtml() {
    if (
      !editorRef.current ||
      !activeQuestion
    ) {
      return;
    }

    const html =
      editorRef.current.innerHTML;

    updateQuestion(
      activeQuestion.id,
      {
        questionHtml:
          html,
      }
    );
  }

  function focusEditor() {
    editorRef.current?.focus();
  }

  /* =======================================================
     WORD COMMANDS
  ======================================================= */

  function command(
    name: string,
    value?: string
  ) {
    focusEditor();

    document.execCommand(
      name,
      false,
      value
    );

    saveEditorHtml();
  }

  function changeFont(
    value: string
  ) {
    setFontFamily(
      value
    );

    command(
      "fontName",
      value
    );
  }

  function changeFontSize(
    value: string
  ) {
    setFontSize(
      value
    );

    focusEditor();

    document.execCommand(
      "fontSize",
      false,
      "7"
    );

    if (
      editorRef.current
    ) {
      const items =
        editorRef.current
          .querySelectorAll(
            'font[size="7"]'
          );

      items.forEach(
        (item) => {
          const element =
            item as HTMLElement;

          element.removeAttribute(
            "size"
          );

          element.style.fontSize =
            `${value}px`;
        }
      );
    }

    saveEditorHtml();
  }

  /* =======================================================
     QUESTION CRUD
  ======================================================= */

  function addQuestion() {
    saveEditorHtml();

    const newQuestion =
      makeQuestion();

    setQuestions(
      (current) => [
        ...current,
        newQuestion,
      ]
    );

    setActiveQuestionId(
      newQuestion.id
    );

    setSelectedShapeId(
      null
    );
  }

  function duplicateQuestion() {
    if (
      !activeQuestion
    ) {
      return;
    }

    saveEditorHtml();

    const copy:
      TestQuestion = {
      ...activeQuestion,

      id: makeId(),

      options:
        activeQuestion
          .options
          .map(
            (option) => ({
              ...option,
              id: makeId(),
            })
          ),

      shapes:
        activeQuestion
          .shapes
          .map(
            (shape) => ({
              ...shape,

              id: makeId(),

              x:
                shape.x +
                20,

              y:
                shape.y +
                20,
            })
          ),
    };

    setQuestions(
      (current) => [
        ...current,
        copy,
      ]
    );

    setActiveQuestionId(
      copy.id
    );

    setSelectedShapeId(
      null
    );
  }

  function deleteQuestion() {
    if (
      !activeQuestion
    ) {
      return;
    }

    if (
      questions.length ===
      1
    ) {
      alert(
        "Kamida bitta savol bo‘lishi kerak."
      );

      return;
    }

    if (
      !confirm(
        "Ushbu savol o‘chirilsinmi?"
      )
    ) {
      return;
    }

    const remaining =
      questions.filter(
        (item) =>
          item.id !==
          activeQuestion.id
      );

    setQuestions(
      remaining
    );

    setActiveQuestionId(
      remaining[0].id
    );

    setSelectedShapeId(
      null
    );
  }

  /* =======================================================
     OPTION UPDATE
  ======================================================= */

  function updateOption(
    optionId: string,
    text: string
  ) {
    if (
      !activeQuestion
    ) {
      return;
    }

    updateQuestion(
      activeQuestion.id,
      {
        options:
          activeQuestion
            .options
            .map(
              (option) =>
                option.id ===
                optionId
                  ? {
                      ...option,
                      text,
                    }
                  : option
            ),
      }
    );
  }

  function setCorrectOption(
    optionId: string
  ) {
    if (
      !activeQuestion
    ) {
      return;
    }

    updateQuestion(
      activeQuestion.id,
      {
        options:
          activeQuestion
            .options
            .map(
              (option) => ({
                ...option,

                isCorrect:
                  option.id ===
                  optionId,
              })
            ),
      }
    );
  }

  /* =======================================================
     SHAPES
  ======================================================= */

  function addShape(
    type: ShapeType
  ) {
    if (
      !activeQuestion
    ) {
      return;
    }

    const shape:
      TestShape = {
      id: makeId(),

      type,

      x: 80,
      y: 70,

      width:
        type === "circle"
          ? 180
          : type ===
              "ellipse"
            ? 260
            : type ===
                "venn"
              ? 420
              : 260,

      height:
        type === "circle"
          ? 180
          : type ===
              "ellipse"
            ? 150
            : type ===
                "venn"
              ? 220
              : 130,

      text:
        type === "venn"
          ? ""
          : "Matn",

      backgroundColor:
        "#8fc9ef",

      borderColor:
        "#2f5975",

      textColor:
        "#111111",

      fontSize: 20,

      fontFamily:
        "Bell MT",

      fontWeight:
        "normal",

      fontStyle:
        "normal",

      textAlign: "center",
      textDecoration: "none",
      textTransform: "none",
      borderWidth: 2,
      borderRadius:
        type === "roundedRectangle" ? 28 :
        type === "circle" || type === "ellipse" ? 999 : 4,
      opacity: 1,
      imageSrc: "",
      objectFit: "contain",
      zIndex: activeQuestion.shapes.length + 1,
    };

    updateQuestion(
      activeQuestion.id,
      {
        shapes: [
          ...activeQuestion
            .shapes,
          shape,
        ],
      }
    );

    setSelectedShapeId(
      shape.id
    );
  }

  function updateShape(
    id: string,
    patch:
      Partial<TestShape>
  ) {
    if (
      !activeQuestion
    ) {
      return;
    }

    updateQuestion(
      activeQuestion.id,
      {
        shapes:
          activeQuestion
            .shapes
            .map(
              (shape) =>
                shape.id === id
                  ? {
                      ...shape,
                      ...patch,
                    }
                  : shape
            ),
      }
    );
  }

  function deleteShape() {
    if (
      !activeQuestion ||
      !selectedShapeId
    ) {
      return;
    }

    updateQuestion(
      activeQuestion.id,
      {
        shapes:
          activeQuestion
            .shapes
            .filter(
              (shape) =>
                shape.id !==
                selectedShapeId
            ),
      }
    );

    setSelectedShapeId(
      null
    );
  }

  function duplicateShape() {
    if (!activeQuestion || !selectedShape) return;
    const copy: TestShape = {
      ...selectedShape,
      id: makeId(),
      x: selectedShape.x + 24,
      y: selectedShape.y + 24,
      zIndex: Math.max(1, ...activeQuestion.shapes.map(s => s.zIndex ?? 1)) + 1,
    };
    updateQuestion(activeQuestion.id, { shapes: [...activeQuestion.shapes, copy] });
    setSelectedShapeId(copy.id);
  }

  function bringShapeForward() {
    if (!activeQuestion || !selectedShape) return;
    const maxZ = Math.max(1, ...activeQuestion.shapes.map(s => s.zIndex ?? 1));
    updateShape(selectedShape.id, { zIndex: maxZ + 1 });
  }

  function sendShapeBackward() {
    if (!activeQuestion || !selectedShape) return;
    const minZ = Math.min(1, ...activeQuestion.shapes.map(s => s.zIndex ?? 1));
    updateShape(selectedShape.id, { zIndex: minZ - 1 });
  }

  function addImageFromFile(file: File) {
    if (!activeQuestion) return;

    if (!file.type.startsWith("image/")) {
      alert("Faqat rasm faylini tanlang.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") return;

      const dataUrl = reader.result;
      const image = new Image();

      image.onload = () => {
        /*
          Kichik rasm — o‘zining tabiiy hajmida chiqadi.
          Juda katta rasm — faqat editor maydoniga sig‘ishi uchun
          proporsional ravishda kichraytiriladi.
        */
        const naturalWidth = Math.max(1, image.naturalWidth || 1);
        const naturalHeight = Math.max(1, image.naturalHeight || 1);

        const canvasWidth =
          canvasRef.current?.clientWidth || 1000;

        const maxWidth = Math.max(200, canvasWidth - 40);
        const scale = Math.min(1, maxWidth / naturalWidth);

        const width = Math.max(
          1,
          Math.round(naturalWidth * scale)
        );

        const height = Math.max(
          1,
          Math.round(naturalHeight * scale)
        );

        const shape: TestShape = {
          id: makeId(),
          type: "image",
          x: 20,
          y: 20,
          width,
          height,
          text: "",
          backgroundColor: "transparent",
          borderColor: "#2f5975",
          textColor: "#111111",
          fontSize: 20,
          fontFamily: "Bell MT",
          fontWeight: "normal",
          fontStyle: "normal",
          textAlign: "center",
          textDecoration: "none",
          textTransform: "none",
          borderWidth: 0,
          borderRadius: 0,
          opacity: 1,
          imageSrc: dataUrl,
          objectFit: "contain",
          zIndex:
            Math.max(
              1,
              ...activeQuestion.shapes.map(
                (item) => item.zIndex ?? 1
              )
            ) + 1,
        };

        updateQuestion(activeQuestion.id, {
          shapes: [
            ...activeQuestion.shapes,
            shape,
          ],
        });

        setSelectedShapeId(shape.id);
      };

      image.src = dataUrl;
    };

    reader.readAsDataURL(file);
  }

  function handleImageUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (file) {
      addImageFromFile(file);
    }

    event.target.value = "";
  }

  function handleCanvasPaste(
    event: ReactClipboardEvent<HTMLDivElement>
  ) {
    const items = Array.from(
      event.clipboardData?.items || []
    );

    const imageItem = items.find((item) =>
      item.type.startsWith("image/")
    );

    if (!imageItem) {
      return;
    }

    const file = imageItem.getAsFile();

    if (!file) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    addImageFromFile(file);
  }

  /* =======================================================
     DRAG
  ======================================================= */

  function startDrag(
    event:
      ReactMouseEvent,
    shape: TestShape
  ) {
    const target =
      event.target as HTMLElement;

    if (
      target.closest(
        ".resizeHandle"
      ) ||
      target.closest(
        ".shapeInput"
      )
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    setSelectedShapeId(
      shape.id
    );

    const startMouseX =
      event.clientX;

    const startMouseY =
      event.clientY;

    const startX =
      shape.x;

    const startY =
      shape.y;

    function move(
      e: MouseEvent
    ) {
      updateShape(
        shape.id,
        {
          x: Math.max(
            0,
            startX +
              e.clientX -
              startMouseX
          ),

          y: Math.max(
            0,
            startY +
              e.clientY -
              startMouseY
          ),
        }
      );
    }

    function stop() {
      window.removeEventListener(
        "mousemove",
        move
      );

      window.removeEventListener(
        "mouseup",
        stop
      );
    }

    window.addEventListener(
      "mousemove",
      move
    );

    window.addEventListener(
      "mouseup",
      stop
    );
  }

  /* =======================================================
     RESIZE
  ======================================================= */

  function startResize(
    event:
      ReactMouseEvent,
    shape: TestShape,
    direction:
      | "n"
      | "s"
      | "e"
      | "w"
      | "ne"
      | "nw"
      | "se"
      | "sw"
  ) {
    event.preventDefault();
    event.stopPropagation();

    const startMouseX =
      event.clientX;

    const startMouseY =
      event.clientY;

    const startX =
      shape.x;

    const startY =
      shape.y;

    const startWidth =
      shape.width;

    const startHeight =
      shape.height;

    const minWidth = 60;
    const minHeight = 50;

    function move(
      e: MouseEvent
    ) {
      const dx =
        e.clientX -
        startMouseX;

      const dy =
        e.clientY -
        startMouseY;

      let x =
        startX;

      let y =
        startY;

      let width =
        startWidth;

      let height =
        startHeight;

      if (
        direction.includes(
          "e"
        )
      ) {
        width =
          Math.max(
            minWidth,
            startWidth + dx
          );
      }

      if (
        direction.includes(
          "s"
        )
      ) {
        height =
          Math.max(
            minHeight,
            startHeight + dy
          );
      }

      if (
        direction.includes(
          "w"
        )
      ) {
        const nextWidth =
          startWidth - dx;

        if (
          nextWidth >=
          minWidth
        ) {
          width =
            nextWidth;

          x =
            startX + dx;
        }
      }

      if (
        direction.includes(
          "n"
        )
      ) {
        const nextHeight =
          startHeight - dy;

        if (
          nextHeight >=
          minHeight
        ) {
          height =
            nextHeight;

          y =
            startY + dy;
        }
      }

      updateShape(
        shape.id,
        {
          x,
          y,
          width,
          height,
        }
      );
    }

    function stop() {
      window.removeEventListener(
        "mousemove",
        move
      );

      window.removeEventListener(
        "mouseup",
        stop
      );
    }

    window.addEventListener(
      "mousemove",
      move
    );

    window.addEventListener(
      "mouseup",
      stop
    );
  }

  /* =======================================================
     SAVE
  ======================================================= */

  async function saveTest(
    status: TestStatus
  ) {
    saveEditorHtml();

    if (
      !title.trim()
    ) {
      alert(
        "Test nomini kiriting."
      );

      return;
    }

    if (
      questions.length ===
      0
    ) {
      alert(
        "Kamida bitta savol bo‘lishi kerak."
      );

      return;
    }

    const invalid =
      questions.some(
        (question) =>
          question.options
            .filter(
              (option) =>
                option.isCorrect
            ).length !== 1
      );

    if (invalid) {
      alert(
        "Har bir savolda aynan bitta to‘g‘ri javob belgilang."
      );

      return;
    }

    setSaving(true);

    try {
      /*
        React state update async
        bo‘lgani uchun aktiv
        editor HTMLni payloadga
        qo‘lda qo‘yamiz.
      */

      const currentHtml =
        editorRef.current
          ?.innerHTML ??
        activeQuestion
          ?.questionHtml ??
        "";

      const payloadQuestions =
        questions.map(
          (question) =>
            question.id ===
            activeQuestion?.id
              ? {
                  ...question,

                  questionHtml:
                    currentHtml,
                }
              : question
        );

      const payload = {
        title:
          title.trim(),

        subject:
          subject.trim(),

        duration:
          Math.max(
            1,
            Number(duration) ||
              30
          ),

        description,

        /*
          null = cheksiz.
          Son = maksimal urinishlar soni.
        */
        attemptLimit:
          unlimitedAttempts
            ? null
            : Math.max(
                1,
                Number(attemptLimit) || 1
              ),

        questions:
          payloadQuestions,

        status,
      };

      const response =
        await fetch(
          editingId
            ? `/api/tests/${encodeURIComponent(
                editingId
              )}`
            : "/api/tests",
          {
            method:
              editingId
                ? "PUT"
                : "POST",

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
        !data.success
      ) {
        alert(
          data.message ||
            "Test saqlanmadi."
        );

        return;
      }

      alert(
        status ===
          "published"
          ? editingId
            ? "Test yangilandi va e’lon qilindi."
            : "Test yaratildi va e’lon qilindi."
          : editingId
            ? "O‘zgarishlar saqlandi."
            : "Test qoralama sifatida saqlandi."
      );

      router.push(
        "/admin/tests"
      );

      router.refresh();
    } catch {
      alert(
        "Testni saqlashda server xatosi yuz berdi."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     KOMPYUTERGA SAQLASH
  ======================================================= */

  function downloadTestToComputer() {
    saveEditorHtml();

    const currentHtml =
      editorRef.current?.innerHTML ??
      activeQuestion?.questionHtml ??
      "";

    const exportQuestions =
      questions.map((question) =>
        question.id === activeQuestion?.id
          ? {
              ...question,
              questionHtml: currentHtml,
            }
          : question
      );

    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      test: {
        id: editingId || undefined,
        title: title.trim(),
        subject: subject.trim(),
        duration: Math.max(1, Number(duration) || 30),
        description,
        attemptLimit:
          unlimitedAttempts
            ? null
            : Math.max(1, Number(attemptLimit) || 1),
        questions: exportQuestions,
        status: "draft" as TestStatus,
      },
    };

    const blob = new Blob(
      [JSON.stringify(exportData, null, 2)],
      { type: "application/json;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const safeTitle =
      (title.trim() || "test")
        .replace(/[^a-zA-Z0-9\u0400-\u04FF\u2018\u2019\u02BB\u02BC_-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "test";

    link.href = url;
    link.download = `${safeTitle}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    !paramsReady ||
    !adminChecked ||
    loadingTest
  ) {
    return (
      <main className="loading">
        Test muharriri
        yuklanmoqda...
      </main>
    );
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <main
      className="page"
      onMouseDown={() =>
        setSelectedShapeId(
          null
        )
      }
    >

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="topPanel">

        <div className="namePlate">
          Test muharriri
        </div>

        <div className="headerButtons">

          <button
            onClick={() =>
              router.push(
                "/admin/tests"
              )
            }
          >
            Testlar
          </button>

          <button
            onClick={() =>
              router.push("/")
            }
          >
            Asosiy sahifa
          </button>

        </div>

      </header>


      {/* =================================================
          TEST INFO
      ================================================= */}

      <section className="sectionBox">

        <div className="sectionTitle">
          {editingId
            ? "Testni tahrirlash"
            : "Yangi test yaratish"}
        </div>

        <div className="infoPanel">

          <label>
            <span>
              Test nomi
            </span>

            <input
              value={title}
              onChange={(e) =>
                setTitle(
                  e.target.value
                )
              }
              dir="ltr"
              placeholder="Masalan: Jinoyat huquqi — 1"
            />
          </label>

          <label>
            <span>
              Fan
            </span>

            <input
              value={subject}
              onChange={(e) =>
                setSubject(
                  e.target.value
                )
              }
              dir="ltr"
              placeholder="Masalan: Jinoyat huquqi"
            />
          </label>

          <label>
            <span>
              Vaqt
            </span>

            <div className="durationRow">

              <input
                type="number"
                min={1}
                value={duration}
                onChange={(e) =>
                  setDuration(
                    Math.max(
                      1,
                      Number(
                        e.target
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
            <span>
              Urinishlar soni
            </span>

            <div className="attemptControl">
              <div className="attemptNumberBox">
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={attemptLimit}
                  disabled={unlimitedAttempts}
                  onChange={(e) =>
                    setAttemptLimit(
                      Math.max(
                        1,
                        Math.floor(
                          Number(e.target.value) || 1
                        )
                      )
                    )
                  }
                />

                <strong>
                  marta
                </strong>
              </div>

              <label className="unlimitedSwitch">
                <input
                  type="checkbox"
                  checked={unlimitedAttempts}
                  onChange={(e) =>
                    setUnlimitedAttempts(
                      e.target.checked
                    )
                  }
                />

                <span className="switchTrack">
                  <span className="switchThumb" />
                </span>

                <strong>
                  Cheksiz
                </strong>
              </label>
            </div>

            <small className="attemptHelp">
              Masalan: 1 — faqat bir marta, 2 — ikki marta.
              “Cheksiz” tanlansa, o‘quvchi istagancha ishlashi mumkin.
            </small>
          </label>

          <label className="descriptionField">

            <span>
              Test haqida
            </span>

            <textarea
              value={
                description
              }
              onChange={(e) =>
                setDescription(
                  e.target.value
                )
              }
              placeholder="Test haqida qisqacha izoh..."
            />

          </label>

        </div>

      </section>


      {/* =================================================
          QUESTION NAV
      ================================================= */}

      <section className="questionBar">

        <div className="questionTabs">

          {questions.map(
            (
              question,
              index
            ) => (
              <button
                key={
                  question.id
                }
                className={
                  question.id ===
                  activeQuestionId
                    ? "activeTab"
                    : ""
                }
                onClick={() => {
                  saveEditorHtml();

                  setActiveQuestionId(
                    question.id
                  );

                  setSelectedShapeId(
                    null
                  );
                }}
              >
                {index + 1}
              </button>
            )
          )}

        </div>

        <button
          className="addQuestion"
          onClick={
            addQuestion
          }
        >
          + Yangi savol
        </button>

      </section>


      {/* =================================================
          WORD TOOLBAR
      ================================================= */}

      <section className="wordRibbon">

        <div className="ribbonTitle">
          Bosh sahifa
        </div>

        <div className="toolbar">

          <div className="toolGroup">

            <button
              title="Bekor qilish"
              onMouseDown={(e) =>
                e.preventDefault()
              }
              onClick={() =>
                command(
                  "undo"
                )
              }
            >
              ↶
            </button>

            <button
              title="Qaytarish"
              onMouseDown={(e) =>
                e.preventDefault()
              }
              onClick={() =>
                command(
                  "redo"
                )
              }
            >
              ↷
            </button>

          </div>


          <div className="toolGroup">

            <select
              value={
                fontFamily
              }
              onChange={(e) =>
                changeFont(
                  e.target.value
                )
              }
            >
              <option>
                Bell MT
              </option>

              <option>
                Times New Roman
              </option>

              <option>
                Arial
              </option>

              <option>
                Calibri
              </option>

              <option>
                Georgia
              </option>

              <option>
                Verdana
              </option>

              <option>
                Courier New
              </option>
            </select>

            <select
              value={
                fontSize
              }
              onChange={(e) =>
                changeFontSize(
                  e.target.value
                )
              }
            >
              {[
                10,
                12,
                14,
                16,
                18,
                20,
                22,
                24,
                28,
                32,
                36,
                48,
                60,
                72,
              ].map(
                (size) => (
                  <option
                    key={size}
                    value={size}
                  >
                    {size}
                  </option>
                )
              )}
            </select>

          </div>


          <div className="toolGroup">

            <button
              className="bold"
              onMouseDown={(e) =>
                e.preventDefault()
              }
              onClick={() =>
                command(
                  "bold"
                )
              }
            >
              B
            </button>

            <button
              className="italic"
              onMouseDown={(e) =>
                e.preventDefault()
              }
              onClick={() =>
                command(
                  "italic"
                )
              }
            >
              I
            </button>

            <button
              className="underline"
              onMouseDown={(e) =>
                e.preventDefault()
              }
              onClick={() =>
                command(
                  "underline"
                )
              }
            >
              U
            </button>

            <button
              onMouseDown={(e) =>
                e.preventDefault()
              }
              onClick={() =>
                command(
                  "strikeThrough"
                )
              }
            >
              abc
            </button>

          </div>


          <div className="toolGroup">

            <label className="colorButton">
              A

              <input
                type="color"
                onChange={(e) =>
                  command(
                    "foreColor",
                    e.target.value
                  )
                }
              />
            </label>

            <label className="colorButton">
              ▰

              <input
                type="color"
                onChange={(e) =>
                  command(
                    "hiliteColor",
                    e.target.value
                  )
                }
              />
            </label>

          </div>


          <div className="toolGroup">

            <button
              onMouseDown={(e) =>
                e.preventDefault()
              }
              onClick={() =>
                command(
                  "justifyLeft"
                )
              }
            >
              ≡←
            </button>

            <button
              onMouseDown={(e) =>
                e.preventDefault()
              }
              onClick={() =>
                command(
                  "justifyCenter"
                )
              }
            >
              ≡
            </button>

            <button
              onMouseDown={(e) =>
                e.preventDefault()
              }
              onClick={() =>
                command(
                  "justifyRight"
                )
              }
            >
              →≡
            </button>

            <button
              onMouseDown={(e) =>
                e.preventDefault()
              }
              onClick={() =>
                command(
                  "justifyFull"
                )
              }
            >
              ☰
            </button>

          </div>


          <div className="toolGroup">

            <button
              onMouseDown={(e) =>
                e.preventDefault()
              }
              onClick={() =>
                command(
                  "insertOrderedList"
                )
              }
            >
              1.
            </button>

            <button
              onMouseDown={(e) =>
                e.preventDefault()
              }
              onClick={() =>
                command(
                  "insertUnorderedList"
                )
              }
            >
              •
            </button>

          </div>

        </div>

      </section>


      {/* =================================================
          QUESTION
      ================================================= */}

      {activeQuestion && (
        <section className="editorSection">

          <div className="questionHeader">

            <h2>
              Savol{" "}
              {questions.findIndex(
                (item) =>
                  item.id ===
                  activeQuestion.id
              ) + 1}
            </h2>

            <div>

              <button
                onClick={
                  duplicateQuestion
                }
              >
                Nusxalash
              </button>

              <button
                className="dangerButton"
                onClick={
                  deleteQuestion
                }
              >
                Savolni o‘chirish
              </button>

            </div>

          </div>


          {/* WORD PAGE */}

          <div className="paperOuter">

            <div
              key={
                activeQuestion.id
              }
              ref={(element) => {
                editorRef.current =
                  element;

                if (
                  element &&
                  element.innerHTML !==
                    activeQuestion
                      .questionHtml
                ) {
                  element.innerHTML =
                    activeQuestion
                      .questionHtml ||
                    "";
                }
              }}
              className="wordPage"
              contentEditable
              suppressContentEditableWarning
              dir="ltr"
              onBlur={
                saveEditorHtml
              }
              data-placeholder="Savol matnini shu yerga yozing..."
            />

          </div>


          {/* =================================================
              SHAPES
          ================================================= */}

          <div className="shapesToolbar">

            <strong>
              Shakllar
            </strong>

            <button
              onClick={() =>
                addShape(
                  "rectangle"
                )
              }
            >
              ▭ To‘rtburchak
            </button>

            <button
              onClick={() =>
                addShape(
                  "roundedRectangle"
                )
              }
            >
              ▢ Yumaloq
            </button>

            <button
              onClick={() =>
                addShape(
                  "circle"
                )
              }
            >
              ○ Doira
            </button>

            <button
              onClick={() =>
                addShape(
                  "ellipse"
                )
              }
            >
              ⬭ Oval
            </button>

            <button
              onClick={() =>
                addShape(
                  "venn"
                )
              }
            >
              ◯◯ Venn
            </button>

            <button onClick={() => addShape("text")}>
              T Matn
            </button>

            <button className="imageButton" onClick={() => imageInputRef.current?.click()}>
              🖼 Rasm joylash
            </button>
            <input
              ref={imageInputRef}
              className="hiddenImageInput"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
            />

          </div>


          <div
            ref={canvasRef}
            className="shapeCanvas"
            tabIndex={0}
            onPaste={handleCanvasPaste}
            title="Rasmni shu maydonga Ctrl+V bilan ham joylashingiz mumkin"
            onMouseDown={(
              e
            ) => {
              e.stopPropagation();

              setSelectedShapeId(
                null
              );
            }}
          >

            <div className="canvasHint">
              Shakllarni shu maydonda joylashtiring · Rasm uchun Ctrl+V ham ishlaydi
            </div>

            {activeQuestion
              .shapes
              .map(
                (shape) => {
                  const selected =
                    shape.id ===
                    selectedShapeId;

                  return (
                    <div
                      key={
                        shape.id
                      }
                      className={`shapeItem ${
                        selected
                          ? "selectedShape"
                          : ""
                      }`}
                      style={{
                        left:
                          shape.x,

                        top:
                          shape.y,

                        width:
                          shape.width,

                        height: shape.height,
                        zIndex: shape.zIndex ?? 1,
                        opacity: shape.opacity ?? 1,
                      }}
                      onMouseDown={(
                        e
                      ) =>
                        startDrag(
                          e,
                          shape
                        )
                      }
                    >

                      {shape.type === "image" ? (
                        <div
                          className="imageShapeBody"
                          style={{
                            borderColor: shape.borderColor,
                            borderWidth: `${shape.borderWidth ?? 2}px`,
                            borderRadius: `${shape.borderRadius ?? 8}px`,
                          }}
                        >
                          {shape.imageSrc ? (
                            <img
                              src={shape.imageSrc}
                              alt="Test rasmi"
                              draggable={false}
                              style={{ objectFit: shape.objectFit ?? "contain" }}
                            />
                          ) : <span>Rasm tanlanmagan</span>}
                        </div>
                      ) : shape.type ===
                      "venn" ? (

                        <div className="venn">

                          <div
                            className="vennCircle vennOne"
                            style={{
                              background:
                                shape.backgroundColor,

                              borderColor:
                                shape.borderColor,
                            }}
                          >
                            <span>
                              A
                            </span>
                          </div>

                          <div
                            className="vennCircle vennTwo"
                            style={{
                              background:
                                shape.backgroundColor,

                              borderColor:
                                shape.borderColor,
                            }}
                          >
                            <span>
                              B
                            </span>
                          </div>

                        </div>

                      ) : (

                        <div
                          className={`shapeBody ${shape.type}`}
                          style={{
                            background:
                              shape.type ===
                              "text"
                                ? "transparent"
                                : shape.backgroundColor,

                            borderColor:
                              shape.borderColor,

                            color:
                              shape.textColor,

                            fontFamily:
                              shape.fontFamily,

                            fontSize:
                              `${shape.fontSize}px`,

                            fontWeight:
                              shape.fontWeight,

                            fontStyle:
                              shape.fontStyle,

                            textAlign: shape.textAlign,
                            textDecoration: shape.textDecoration ?? "none",
                            textTransform: shape.textTransform ?? "none",
                            borderWidth: `${shape.borderWidth ?? 2}px`,
                            borderRadius: `${shape.borderRadius ?? 4}px`,
                          }}
                        >

                          <input
                            className="shapeInput"
                            value={
                              shape.text
                            }
                            onMouseDown={(
                              e
                            ) =>
                              e.stopPropagation()
                            }
                            onChange={(
                              e
                            ) =>
                              updateShape(
                                shape.id,
                                {
                                  text:
                                    e
                                      .target
                                      .value,
                                }
                              )
                            }
                          />

                        </div>

                      )}


                      {selected && (
                        <>

                          <button
                            className="shapeDelete"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onClick={(
                              e
                            ) => {
                              e.stopPropagation();

                              deleteShape();
                            }}
                          >
                            ×
                          </button>


                          {(
                            [
                              "n",
                              "s",
                              "e",
                              "w",
                              "ne",
                              "nw",
                              "se",
                              "sw",
                            ] as const
                          ).map(
                            (
                              direction
                            ) => (
                              <span
                                key={
                                  direction
                                }
                                className={`resizeHandle resize-${direction}`}
                                onMouseDown={(
                                  e
                                ) =>
                                  startResize(
                                    e,
                                    shape,
                                    direction
                                  )
                                }
                              />
                            )
                          )}

                        </>
                      )}

                    </div>
                  );
                }
              )}

          </div>


          {/* SHAPE / IMAGE SETTINGS */}
          {selectedShape && (
            <div className="shapeSettings" onMouseDown={(e) => e.stopPropagation()}>
              <strong className="settingsHeading">
                {selectedShape.type === "image" ? "Rasm sozlamalari" : "Shakl va matn sozlamalari"}
              </strong>

              {selectedShape.type !== "image" && <>
                <label>Shrift
                  <select value={selectedShape.fontFamily} onChange={(e) => updateShape(selectedShape.id,{fontFamily:e.target.value})}>
                    <option>Bell MT</option><option>Times New Roman</option><option>Arial</option>
                    <option>Calibri</option><option>Georgia</option><option>Verdana</option><option>Courier New</option>
                  </select>
                </label>
                <label>O‘lcham
                  <input className="smallNumber" type="number" min={8} max={160} value={selectedShape.fontSize}
                    onChange={(e)=>updateShape(selectedShape.id,{fontSize:Math.max(8,Number(e.target.value)||8)})}/>
                </label>
                <button className={selectedShape.fontWeight==="bold"?"activeSetting":""}
                  onClick={()=>updateShape(selectedShape.id,{fontWeight:selectedShape.fontWeight==="bold"?"normal":"bold"})}>B</button>
                <button className={selectedShape.fontStyle==="italic"?"activeSetting":""}
                  onClick={()=>updateShape(selectedShape.id,{fontStyle:selectedShape.fontStyle==="italic"?"normal":"italic"})}><i>I</i></button>
                <button className={selectedShape.textDecoration==="underline"?"activeSetting":""}
                  onClick={()=>updateShape(selectedShape.id,{textDecoration:selectedShape.textDecoration==="underline"?"none":"underline"})}><u>U</u></button>
                <button className={selectedShape.textTransform==="uppercase"?"activeSetting":""}
                  onClick={()=>updateShape(selectedShape.id,{textTransform:selectedShape.textTransform==="uppercase"?"none":"uppercase"})}>AA</button>
                <button onClick={()=>updateShape(selectedShape.id,{textAlign:"left"})}>≡←</button>
                <button onClick={()=>updateShape(selectedShape.id,{textAlign:"center"})}>≡</button>
                <button onClick={()=>updateShape(selectedShape.id,{textAlign:"right"})}>→≡</button>
                <label>Matn rangi <input type="color" value={selectedShape.textColor}
                  onChange={(e)=>updateShape(selectedShape.id,{textColor:e.target.value})}/></label>
              </>}

              {selectedShape.type !== "text" && selectedShape.type !== "image" &&
                <label>Fon <input type="color" value={selectedShape.backgroundColor}
                  onChange={(e)=>updateShape(selectedShape.id,{backgroundColor:e.target.value})}/></label>}

              <label>Chegara <input type="color" value={selectedShape.borderColor}
                onChange={(e)=>updateShape(selectedShape.id,{borderColor:e.target.value})}/></label>
              <label>Chegara qalinligi <input className="smallNumber" type="number" min={0} max={20}
                value={selectedShape.borderWidth ?? 2}
                onChange={(e)=>updateShape(selectedShape.id,{borderWidth:Math.max(0,Number(e.target.value)||0)})}/></label>
              <label>Burchak <input className="smallNumber" type="number" min={0} max={999}
                value={selectedShape.borderRadius ?? 4}
                onChange={(e)=>updateShape(selectedShape.id,{borderRadius:Math.max(0,Number(e.target.value)||0)})}/></label>
              <label>Shaffoflik <input className="rangeInput" type="range" min={0.1} max={1} step={0.05}
                value={selectedShape.opacity ?? 1}
                onChange={(e)=>updateShape(selectedShape.id,{opacity:Number(e.target.value)})}/></label>

              {selectedShape.type === "image" && <>
                <label>Rasm moslashuvi
                  <select value={selectedShape.objectFit ?? "contain"}
                    onChange={(e)=>updateShape(selectedShape.id,{objectFit:e.target.value as "contain"|"cover"|"fill"})}>
                    <option value="contain">To‘liq ko‘rsatish</option>
                    <option value="cover">Maydonni to‘ldirish</option>
                    <option value="fill">Cho‘zib to‘ldirish</option>
                  </select>
                </label>
                <button onClick={()=>imageInputRef.current?.click()}>Yangi rasm qo‘shish</button>
              </>}

              <span className="settingsDivider"/>
              <button onClick={duplicateShape}>Nusxalash</button>
              <button onClick={bringShapeForward}>Oldinga</button>
              <button onClick={sendShapeBackward}>Orqaga</button>
              <button className="dangerSetting" onClick={deleteShape}>O‘chirish</button>
            </div>
          )}


          {/* =================================================
              OPTIONS
          ================================================= */}

          <div className="answersTitle">
            Javob variantlari
          </div>

          <div className="answers">

            {activeQuestion
              .options
              .map(
                (
                  option,
                  index
                ) => (
                  <div
                    className={
                      option.isCorrect
                        ? "answerRow correctAnswer"
                        : "answerRow"
                    }
                    key={
                      option.id
                    }
                  >

                    <label className="radioArea">

                      <input
                        type="radio"
                        name={`correct-${activeQuestion.id}`}
                        checked={
                          option.isCorrect
                        }
                        onChange={() =>
                          setCorrectOption(
                            option.id
                          )
                        }
                      />

                      <strong>
                        {optionLetter(
                          index
                        )}
                      </strong>

                    </label>

                    <textarea
                      value={
                        option.text
                      }
                      onChange={(e) =>
                        updateOption(
                          option.id,
                          e.target.value
                        )
                      }
                      placeholder={`${optionLetter(
                        index
                      )}) javob variantini yozing...`}
                    />

                  </div>
                )
              )}

          </div>


          <div className="pointsRow">

            <label>
              Savol balli

              <input
                type="number"
                min={1}
                value={
                  activeQuestion
                    .points
                }
                onChange={(e) =>
                  updateQuestion(
                    activeQuestion.id,
                    {
                      points:
                        Math.max(
                          1,
                          Number(
                            e
                              .target
                              .value
                          ) || 1
                        ),
                    }
                  )
                }
              />

            </label>

          </div>

        </section>
      )}


      {/* =================================================
          SAVE
      ================================================= */}

      <div className="bottomButtons">

        <button
          className="draftButton"
          disabled={saving}
          onClick={() =>
            saveTest(
              "draft"
            )
          }
        >
          {saving
            ? "Saqlanmoqda..."
            : editingId
              ? "O‘zgarishlarni saqlash"
              : "Qoralama saqlash"}
        </button>

        <button
          className="downloadButton"
          disabled={saving}
          onClick={downloadTestToComputer}
        >
          Kompyuterga saqlash
        </button>

        <button
          className="publishButton"
          disabled={saving}
          onClick={() =>
            saveTest(
              "published"
            )
          }
        >
          Testni e’lon qilish
        </button>

      </div>


      {/* =================================================
          CSS
      ================================================= */}

      <style jsx>{`

        * {
          box-sizing: border-box;
        }

        .loading {
          min-height: 100vh;

          display: flex;
          align-items: center;
          justify-content: center;

          font-family:
            "Bell MT",
            "Times New Roman",
            serif;

          font-size: 27px;
        }

        .page {
          min-height: 100vh;

          padding:
            18px
            18px
            100px;

          direction: ltr;

          background:
            linear-gradient(
              180deg,
              #ffffff,
              #edf1f4
            );

          color: #111;

          font-family:
            "Bell MT",
            "Times New Roman",
            serif;
        }

        button,
        input,
        textarea,
        select {
          font-family: inherit;
        }

        button {
          cursor: pointer;
        }

        button:disabled {
          opacity: .55;
          cursor: wait;
        }


        /* HEADER */

        .topPanel {
          width: 100%;

          min-height: 115px;

          padding:
            22px 28px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 20px;

          border:
            3px solid #173e58;

          border-radius: 25px;

          background:
            linear-gradient(
              #9bdcff,
              #54a4d5
            );

          box-shadow:
            inset 0 6px 5px
              rgba(255,255,255,.8),

            0 7px 0 #173c55,

            0 13px 20px
              rgba(0,0,0,.2);
        }

        .namePlate {
          min-width: 320px;

          padding:
            18px 30px;

          text-align: center;

          border:
            3px solid #444;

          border-radius: 15px;

          background:
            linear-gradient(
              #fff,
              #bdbdbd
            );

          box-shadow:
            inset 0 5px 5px white,

            0 5px 0 #555;

          font-size: 27px;
          font-weight: 700;
        }

        .headerButtons {
          display: flex;
          gap: 12px;
        }

        .headerButtons button {
          min-width: 145px;
          height: 52px;

          border:
            2px solid #555;

          border-radius: 10px;

          background:
            linear-gradient(
              #fff,
              #bbb
            );

          font-weight: 700;
        }


        /* GENERAL SECTION */

        .sectionBox,
        .editorSection {
          position: relative;

          width:
            min(1400px, 96%);

          margin:
            90px auto 65px;

          padding:
            75px 35px 40px;

          border:
            3px solid #303538;

          border-radius: 27px;

          background:
            linear-gradient(
              145deg,
              #686c6f,
              #505457 45%,
              #363a3d
            );

          box-shadow:
            inset 0 7px 6px
              rgba(255,255,255,.23),

            inset 0 -8px 8px
              rgba(0,0,0,.32),

            0 7px 0 #272b2e,

            0 15px 24px
              rgba(0,0,0,.25);
        }

        .sectionTitle {
          position: absolute;

          top: -34px;
          left: 50%;

          transform:
            translateX(-50%);

          min-width: 340px;
          min-height: 68px;

          padding:
            10px 28px;

          display: flex;
          align-items: center;
          justify-content: center;

          text-align: center;

          color: #073b68;

          border:
            3px solid #174461;

          border-radius: 16px;

          background:
            linear-gradient(
              #a7e2ff,
              #58a8d7
            );

          box-shadow:
            inset 0 6px 5px
              rgba(255,255,255,.7),

            0 5px 0 #17415c;

          font-size: 27px;
          font-weight: 700;

          z-index: 20;
        }


        /* INFO — CHETLARI TEKIS */

        .infoPanel {
          width: 100%;

          min-height: 230px;

          padding:
            30px;

          display: grid;

          grid-template-columns:
            minmax(0, 1.8fr)
            minmax(0, 1.35fr)
            minmax(190px, .75fr)
            minmax(250px, 1fr);

          align-items: center;

          gap: 22px;

          border:
            2px solid #555d61;

          border-radius: 18px;

          background:
            linear-gradient(
              #f4f4f4,
              #c5c5c5
            );

          box-shadow:
            inset 0 6px 5px white,

            0 6px 0 #555d61;
        }

        .infoPanel label {
          min-width: 0;

          display: flex;
          flex-direction: column;

          justify-content: center;

          gap: 10px;

          font-size: 18px;
          font-weight: 700;
        }

        .infoPanel label > span {
          width: 100%;
          text-align: center;
          font-size: 22px;
          font-weight: 700;
        }

        .infoPanel input,
        .infoPanel textarea {
          width: 100%;

          border:
            2px solid #666;

          border-radius: 10px;

          outline: none;

          background: white;

          direction: ltr;
          text-align: center;

          color: #111;

          font-size: 17px;
        }

        .infoPanel input {
          height: 58px;

          padding:
            0 16px;
        }

        .infoPanel textarea {
          min-height: 95px;

          padding: 14px;

          resize: vertical;

          text-align: left;
        }

        .descriptionField {
          grid-column:
            1 / -1;
        }

        .durationRow {
          width: 100%;

          display: flex;
          align-items: center;

          gap: 12px;
        }

        .durationRow input {
          flex: 1;
          min-width: 0;
        }

        .durationRow strong {
          white-space: nowrap;
        }

        /* URINISHLAR */

        .attemptField {
          min-width: 0;
        }

        .attemptControl {
          width: 100%;
          display: grid;
          gap: 10px;
        }

        .attemptNumberBox {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .attemptNumberBox input {
          flex: 1;
          min-width: 0;
        }

        .attemptNumberBox input:disabled {
          opacity: .52;
          cursor: not-allowed;
          background: #e5e7e9;
        }

        .attemptNumberBox strong {
          white-space: nowrap;
        }

        .unlimitedSwitch {
          width: 100%;
          min-height: 48px;
          padding: 8px 12px;
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 10px !important;
          border: 2px solid #777;
          border-radius: 10px;
          background: linear-gradient(#fff, #d5d5d5);
          box-shadow: inset 0 3px 3px white, 0 3px 0 #777;
          cursor: pointer;
          user-select: none;
        }

        .unlimitedSwitch > input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
          width: 1px;
          height: 1px;
        }

        .switchTrack {
          position: relative;
          width: 48px !important;
          height: 26px;
          flex: 0 0 48px;
          border: 2px solid #666;
          border-radius: 999px;
          background: #bbb;
          transition: .2s ease;
        }

        .switchThumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 18px !important;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 1px 3px rgba(0,0,0,.35);
          transition: .2s ease;
        }

        .unlimitedSwitch > input:checked + .switchTrack {
          border-color: #176a91;
          background: #4fb0df;
        }

        .unlimitedSwitch > input:checked + .switchTrack .switchThumb {
          transform: translateX(22px);
        }

        .unlimitedSwitch > strong {
          color: #073b68;
          white-space: nowrap;
          font-size: 15px;
        }

        .attemptHelp {
          display: block;
          margin-top: 2px;
          color: #47545b;
          font-size: 12px;
          font-weight: 600;
          line-height: 1.35;
          text-align: center;
        }


        /* QUESTION BAR */

        .questionBar {
          width:
            min(1400px, 96%);

          margin:
            35px auto;

          padding: 14px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 20px;

          border:
            2px solid #555;

          border-radius: 12px;

          background:
            linear-gradient(
              #eee,
              #bbb
            );
        }

        .questionTabs {
          display: flex;
          gap: 8px;

          flex-wrap: wrap;
        }

        .questionTabs button {
          width: 46px;
          height: 46px;

          border:
            2px solid #555;

          border-radius: 8px;

          background:
            linear-gradient(
              #fff,
              #bbb
            );

          font-weight: 700;
        }

        .questionTabs .activeTab {
          color: #073b68;

          border-color: #174461;

          background:
            linear-gradient(
              #a8e5ff,
              #58a8d7
            );
        }

        .addQuestion {
          min-width: 170px;

          height: 48px;

          border:
            2px solid #176a38;

          border-radius: 9px;

          background:
            linear-gradient(
              #9ce6b5,
              #4bbd72
            );

          font-weight: 700;
        }


        /* WORD */

        .wordRibbon {
          position: sticky;

          top: 5px;

          z-index: 200;

          width:
            min(1400px, 96%);

          margin:
            0 auto 25px;

          overflow: hidden;

          border:
            2px solid #777;

          border-radius: 12px;

          background: #e4e4e4;

          box-shadow:
            0 5px 14px
              rgba(0,0,0,.22);
        }

        .ribbonTitle {
          padding:
            8px 16px;

          border-bottom:
            1px solid #aaa;

          background:
            #f5f5f5;

          color: #07507a;

          font-weight: 700;
        }

        .toolbar {
          display: flex;
          align-items: center;

          gap: 7px;

          flex-wrap: wrap;

          padding: 10px;
        }

        .toolGroup {
          display: flex;
          align-items: center;

          gap: 4px;

          padding-right: 9px;

          border-right:
            1px solid #aaa;
        }

        .toolGroup button,
        .toolGroup select,
        .colorButton {
          min-height: 38px;

          border:
            1px solid #888;

          border-radius: 5px;

          background:
            linear-gradient(
              #fff,
              #d6d6d6
            );
        }

        .toolGroup button {
          min-width: 40px;

          padding:
            0 9px;
        }

        .toolGroup select {
          padding:
            0 8px;
        }

        .bold {
          font-weight: 900;
        }

        .italic {
          font-style: italic;
        }

        .underline {
          text-decoration: underline;
        }

        .colorButton {
          position: relative;

          width: 42px;

          display: flex;
          align-items: center;
          justify-content: center;

          font-weight: 700;
        }

        .colorButton input {
          position: absolute;

          width: 100%;
          height: 100%;

          opacity: 0;

          cursor: pointer;
        }


        /* EDITOR */

        .questionHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 20px;

          margin-bottom: 20px;

          color: white;
        }

        .questionHeader div {
          display: flex;
          gap: 10px;
        }

        .questionHeader button {
          min-height: 42px;

          padding:
            0 15px;

          border:
            2px solid #555;

          border-radius: 8px;

          background:
            linear-gradient(
              #fff,
              #bbb
            );

          font-weight: 700;
        }

        .questionHeader .dangerButton {
          color: white;

          border-color: #8a1010;

          background:
            linear-gradient(
              #f76b6b,
              #ae1111
            );
        }

        .paperOuter {
          width: 100%;

          padding: 30px;

          border-radius:
            13px 13px 0 0;

          background: #929292;
        }

        .wordPage {
          width: 100%;

          min-height: 340px;

          padding:
            40px;

          border:
            1px solid #777;

          outline: none;

          background: white;

          direction: ltr;
          text-align: left;
          unicode-bidi: plaintext;

          white-space: pre-wrap;

          overflow-wrap:
            break-word;

          box-shadow:
            0 5px 15px
              rgba(0,0,0,.25);

          font-size: 18px;

          line-height: 1.6;
        }

        .wordPage:empty:before {
          content:
            attr(
              data-placeholder
            );

          color: #999;

          pointer-events: none;
        }


        /* SHAPE TOOLBAR */

        .shapesToolbar {
          width: 100%;

          padding: 16px;

          display: flex;
          align-items: center;

          gap: 10px;

          flex-wrap: wrap;

          border:
            2px solid #555;

          background:
            linear-gradient(
              #eee,
              #bbb
            );
        }

        .shapesToolbar button {
          min-height: 42px;

          padding:
            0 15px;

          border:
            2px solid #666;

          border-radius: 7px;

          background:
            linear-gradient(
              #fff,
              #c9c9c9
            );

          font-weight: 700;
        }


        /* CANVAS */

        .shapeCanvas {
          position: relative;

          width: 100%;

          height: 650px;

          overflow: hidden;

          border:
            3px solid #666;

          border-top: none;

          border-radius:
            0 0 14px 14px;

          background-color:
            white;

          background-image:
            linear-gradient(
              #ededed 1px,
              transparent 1px
            ),

            linear-gradient(
              90deg,
              #ededed 1px,
              transparent 1px
            );

          background-size:
            25px 25px;
        }

        .canvasHint {
          position: absolute;

          top: 15px;
          left: 20px;

          color: #aaa;

          pointer-events: none;
        }

        .shapeItem {
          position: absolute;

          cursor: move;

          user-select: none;
        }

        .selectedShape {
          outline:
            2px dashed #087eb9;

          outline-offset: 5px;
        }

        .shapeBody {
          width: 100%;
          height: 100%;

          display: flex;
          align-items: center;
          justify-content: center;

          overflow: hidden;

          border:
            2px solid;

          box-shadow:
            5px 6px 0
              rgba(0,0,0,.23);
        }

        .shapeBody.rectangle {
          border-radius: 2px;
        }

        .shapeBody.roundedRectangle {
          border-radius: 22px;
        }

        .shapeBody.circle {
          border-radius: 50%;
        }

        .shapeBody.ellipse {
          border-radius: 50%;
        }

        .shapeBody.text {
          border: none;

          box-shadow: none;
        }

        .shapeInput {
          width: 90%;

          border: none;
          outline: none;

          background:
            transparent;

          color: inherit;

          text-align: inherit;

          font: inherit;
        }


        /* VENN */

        .venn {
          position: relative;

          width: 100%;
          height: 100%;
        }

        .vennCircle {
          position: absolute;

          top: 0;

          width: 62%;
          height: 100%;

          display: flex;
          align-items: center;
          justify-content: center;

          border:
            2px solid;

          border-radius: 50%;

          opacity: .68;

          font-size: 25px;

          font-weight: 700;
        }

        .vennOne {
          left: 0;
        }

        .vennTwo {
          right: 0;
        }


        .hiddenImageInput { display: none; }
        .imageButton { min-width: 150px; }
        .imageShapeBody { width:100%; height:100%; overflow:hidden; display:flex; align-items:center; justify-content:center; background:transparent; border-style:solid; box-sizing:border-box; }
        .imageShapeBody img { width:100%; height:100%; display:block; user-select:none; pointer-events:none; }
        .settingsHeading { width:100%; font-size:20px; color:#073b68; padding-bottom:8px; border-bottom:1px solid #888; }
        .shapeSettings .activeSetting { color:#fff; background:linear-gradient(#3197d0,#17628d); }
        .shapeSettings .dangerSetting { color:#fff; background:linear-gradient(#ef6666,#a71919); }
        .settingsDivider { width:2px; height:34px; background:#777; margin:0 4px; }
        .rangeInput { width:120px; }

        /* SHAPE DELETE */

        .shapeDelete {
          position: absolute;

          top: -23px;
          right: -23px;

          width: 32px;
          height: 32px;

          z-index: 40;

          display: flex;
          align-items: center;
          justify-content: center;

          border:
            2px solid #790000;

          border-radius: 50%;

          color: white;

          background:
            linear-gradient(
              #ff6666,
              #a70000
            );

          font-size: 22px;

          font-weight: 700;
        }


        /* RESIZE — 8 TOMON */

        .resizeHandle {
          position: absolute;

          width: 15px;
          height: 15px;

          z-index: 35;

          border:
            2px solid white;

          border-radius: 3px;

          background: #087eb9;

          box-shadow:
            0 0 0 1px #064d73;
        }

        .resize-n {
          top: -9px;
          left: 50%;

          transform:
            translateX(-50%);

          cursor: ns-resize;
        }

        .resize-s {
          bottom: -9px;
          left: 50%;

          transform:
            translateX(-50%);

          cursor: ns-resize;
        }

        .resize-e {
          right: -9px;
          top: 50%;

          transform:
            translateY(-50%);

          cursor: ew-resize;
        }

        .resize-w {
          left: -9px;
          top: 50%;

          transform:
            translateY(-50%);

          cursor: ew-resize;
        }

        .resize-ne {
          top: -9px;
          right: -9px;

          cursor:
            nesw-resize;
        }

        .resize-nw {
          top: -9px;
          left: -9px;

          cursor:
            nwse-resize;
        }

        .resize-se {
          right: -9px;
          bottom: -9px;

          cursor:
            nwse-resize;
        }

        .resize-sw {
          left: -9px;
          bottom: -9px;

          cursor:
            nesw-resize;
        }


        /* SHAPE SETTINGS */

        .shapeSettings {
          width: 100%;

          margin-top: 20px;

          padding: 18px;

          display: flex;
          align-items: center;

          gap: 15px;

          flex-wrap: wrap;

          border:
            2px solid #555;

          border-radius: 12px;

          background:
            linear-gradient(
              #eee,
              #bbb
            );
        }

        .shapeSettings label {
          display: flex;
          align-items: center;

          gap: 7px;

          font-weight: 700;
        }

        .shapeSettings input[type="color"] {
          width: 42px;
          height: 36px;
        }

        .shapeSettings select,
        .shapeSettings button,
        .smallNumber {
          min-height: 38px;

          border:
            1px solid #777;

          border-radius: 6px;

          background: white;
        }

        .shapeSettings button {
          min-width: 40px;

          font-weight: 700;
        }

        .smallNumber {
          width: 75px;

          padding:
            0 7px;
        }


        /* ANSWERS */

        .answersTitle {
          margin-top: 30px;

          padding: 14px;

          text-align: center;

          color: white;

          font-size: 25px;

          font-weight: 700;
        }

        .answers {
          display: grid;

          gap: 13px;
        }

        .answerRow {
          width: 100%;

          display: grid;

          grid-template-columns:
            80px minmax(0, 1fr);

          align-items: center;

          gap: 15px;

          padding: 15px;

          border:
            2px solid #666;

          border-radius: 11px;

          background:
            linear-gradient(
              #f3f3f3,
              #c7c7c7
            );
        }

        .correctAnswer {
          border-color: #258b51;

          background:
            linear-gradient(
              #e1f8e8,
              #a9dfbb
            );
        }

        .radioArea {
          display: flex;
          align-items: center;
          justify-content: center;

          gap: 10px;

          font-size: 25px;
        }

        .radioArea input {
          width: 21px;
          height: 21px;
        }

        .answerRow textarea {
          width: 100%;

          min-height: 70px;

          padding: 12px 15px;

          resize: vertical;

          direction: ltr;
          text-align: left;

          border:
            2px solid #777;

          border-radius: 8px;

          outline: none;

          background: white;

          font-size: 17px;
        }

        .pointsRow {
          margin-top: 20px;

          padding: 15px;

          border-radius: 10px;

          background:
            #d7d7d7;
        }

        .pointsRow label {
          display: flex;
          align-items: center;

          justify-content:
            center;

          gap: 12px;

          font-size: 18px;

          font-weight: 700;
        }

        .pointsRow input {
          width: 90px;

          height: 42px;

          padding:
            0 10px;

          border:
            2px solid #777;

          border-radius: 7px;

          font-size: 17px;
        }


        /* SAVE */

        .bottomButtons {
          width:
            min(1400px, 96%);

          margin:
            40px auto;

          display: flex;

          justify-content: center;

          gap: 24px;
        }

        .bottomButtons button {
          min-width: 260px;

          min-height: 62px;

          border-radius: 13px;

          font-size: 18px;

          font-weight: 700;
        }

        .draftButton {
          border:
            3px solid #555;

          background:
            linear-gradient(
              #fff,
              #bcbcbc
            );

          box-shadow:
            0 5px 0 #555;
        }

        .downloadButton {
          color: #125a32;

          border:
            3px solid #2d6c47;

          background:
            linear-gradient(
              #d8f1df,
              #86c99d
            );

          box-shadow:
            0 5px 0 #2d6c47;
        }


        .publishButton {
          color: #073b68;

          border:
            3px solid #174461;

          background:
            linear-gradient(
              #a8e5ff,
              #58a8d7
            );

          box-shadow:
            0 5px 0 #17415c;
        }


        /* RESPONSIVE */

        @media (
          max-width: 950px
        ) {

          .infoPanel {
            grid-template-columns:
              1fr;
          }

          .descriptionField {
            grid-column: auto;
          }

          .topPanel,
          .questionHeader {
            flex-direction: column;
          }

          .questionBar {
            flex-direction: column;

            align-items: stretch;
          }

          .addQuestion {
            width: 100%;
          }

        }

        @media (
          max-width: 650px
        ) {

          .page {
            padding:
              10px 8px 60px;
          }

          .topPanel {
            padding:
              20px 14px;
          }

          .namePlate {
            width: 100%;

            min-width: 0;
          }

          .headerButtons {
            width: 100%;

            flex-direction: column;
          }

          .headerButtons button {
            width: 100%;
          }

          .sectionBox,
          .editorSection {
            width: 99%;

            padding:
              65px 14px 25px;
          }

          .sectionTitle {
            min-width: 230px;

            max-width: 90%;

            font-size: 21px;
          }

          .infoPanel {
            padding: 16px;
          }

          .paperOuter {
            padding: 12px;
          }

          .wordPage {
            padding: 20px;

            min-height: 280px;
          }

          .shapeCanvas {
            height: 500px;
          }

          .answerRow {
            grid-template-columns:
              1fr;
          }

          .bottomButtons {
            flex-direction: column;
          }

          .bottomButtons button {
            width: 100%;
          }

        }

      `}</style>

    </main>
  );
}
