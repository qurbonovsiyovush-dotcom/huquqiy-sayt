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

type TestOption = {
  id?: string;
  option_key: "A" | "B" | "C" | "D";
  option_text: string;
  option_html?: string;
  is_correct: boolean;
  sort_order?: number;
};

type AcceptedAnswer = {
  id?: string;
  answer_text: string;
  normalized_answer?: string;
};

type Question = {
  id?: string;
  test_id?: string;
  question_number: number;
  question_type: "closed" | "open";
  question_text: string;
  question_html?: string;
  points?: number;
  options?: TestOption[];
  acceptedAnswers?: AcceptedAnswer[];
};

type TestData = {
  id: string;
  title: string;
  description?: string;
  subject?: string;
  status: "draft" | "published";
  duration_minutes: number;
  closed_question_count: number;
  open_question_count: number;
  total_questions: number;
  attempt_limit: number | null;
  questions: Question[];
};

type TableConfig = {
  rows: number;
  cols: number;
  cells: string[][];
  headerRow: boolean;
};

type Venn2Config = {
  leftTitle: string;
  rightTitle: string;
  leftText: string;
  intersectionText: string;
  rightText: string;
};

type Venn3Config = {
  aTitle: string;
  bTitle: string;
  cTitle: string;
  aText: string;
  bText: string;
  cText: string;
  abText: string;
  acText: string;
  bcText: string;
  abcText: string;
};

type TextConfig = {
  text: string;
  align: "left" | "center" | "right";
  bold: boolean;
  italic: boolean;
  fontSize: number;
};

type ShapeConfig = {
  text: string;
  shape:
    | "rectangle"
    | "rounded"
    | "circle"
    | "ellipse";
};

type VisualBlock =
  | {
      id: string;
      kind: "table";
      config: TableConfig;
    }
  | {
      id: string;
      kind: "venn2";
      config: Venn2Config;
    }
  | {
      id: string;
      kind: "venn3";
      config: Venn3Config;
    }
  | {
      id: string;
      kind: "text";
      config: TextConfig;
    }
  | {
      id: string;
      kind: "shape";
      config: ShapeConfig;
    };

const OPTION_KEYS = [
  "A",
  "B",
  "C",
  "D",
] as const;

function createEmptyOptions(): TestOption[] {
  return OPTION_KEYS.map(
    (key, index) => ({
      option_key: key,
      option_text: "",
      option_html: "",
      is_correct: index === 0,
      sort_order: index,
    })
  );
}

function createId() {
  if (
    typeof crypto !== "undefined" &&
    "randomUUID" in crypto
  ) {
    return crypto.randomUUID();
  }

  return `block-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

function escapeHtml(value: string) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function nl2br(value: string) {
  return escapeHtml(value).replace(
    /\n/g,
    "<br />"
  );
}

function encodeConfig(value: unknown) {
  return encodeURIComponent(
    JSON.stringify(value)
  );
}

function decodeConfig<T>(
  value: string
): T | null {
  try {
    return JSON.parse(
      decodeURIComponent(value)
    ) as T;
  } catch {
    return null;
  }
}

function blankTable(
  rows = 3,
  cols = 3
): TableConfig {
  return {
    rows,
    cols,
    headerRow: true,
    cells: Array.from(
      { length: rows },
      () =>
        Array.from(
          { length: cols },
          () => ""
        )
    ),
  };
}

function renderTable(
  block: Extract<
    VisualBlock,
    { kind: "table" }
  >
) {
  const { config } = block;

  const rows = config.cells
    .map((row, rowIndex) => {
      const tag =
        config.headerRow &&
        rowIndex === 0
          ? "th"
          : "td";

      const cells = row
        .map(
          (cell) =>
            `<${tag} style="border:1.5px solid #29434f;padding:9px 10px;vertical-align:middle;text-align:left;min-width:70px;background:${
              tag === "th"
                ? "#cfefff"
                : "#ffffff"
            };font-weight:${
              tag === "th"
                ? "800"
                : "600"
            };">${nl2br(
              cell
            )}</${tag}>`
        )
        .join("");

      return `<tr>${cells}</tr>`;
    })
    .join("");

  return `<div data-nc-block="table" data-config="${encodeConfig(
    config
  )}" style="margin:14px 0;overflow-x:auto;"><table style="width:100%;border-collapse:collapse;border:2px solid #29434f;background:#fff;font-family:Georgia,'Times New Roman',serif;font-size:16px;">${rows}</table></div>`;
}

function renderVenn2(
  block: Extract<
    VisualBlock,
    { kind: "venn2" }
  >
) {
  const c = block.config;

  return `<div data-nc-block="venn2" data-config="${encodeConfig(
    c
  )}" style="margin:18px auto;width:min(100%,720px);padding:18px 12px 24px;border:1.5px solid #6f8793;border-radius:14px;background:#f7fbfd;font-family:Georgia,'Times New Roman',serif;">
    <div style="display:flex;justify-content:space-between;gap:12px;font-weight:800;font-size:17px;margin:0 70px 8px;">
      <span>${escapeHtml(
        c.leftTitle
      )}</span>
      <span>${escapeHtml(
        c.rightTitle
      )}</span>
    </div>
    <div style="position:relative;height:300px;max-width:650px;margin:0 auto;">
      <div style="position:absolute;left:65px;top:25px;width:300px;height:220px;border:3px solid #29434f;border-radius:50%;background:rgba(100,196,235,.17);"></div>
      <div style="position:absolute;right:65px;top:25px;width:300px;height:220px;border:3px solid #29434f;border-radius:50%;background:rgba(106,213,170,.17);"></div>
      <div style="position:absolute;left:85px;top:95px;width:145px;text-align:center;font-weight:800;font-size:16px;line-height:1.35;">${nl2br(
        c.leftText
      )}</div>
      <div style="position:absolute;left:50%;transform:translateX(-50%);top:95px;width:145px;text-align:center;font-weight:900;font-size:16px;line-height:1.35;">${nl2br(
        c.intersectionText
      )}</div>
      <div style="position:absolute;right:85px;top:95px;width:145px;text-align:center;font-weight:800;font-size:16px;line-height:1.35;">${nl2br(
        c.rightText
      )}</div>
    </div>
  </div>`;
}

function renderVenn3(
  block: Extract<
    VisualBlock,
    { kind: "venn3" }
  >
) {
  const c = block.config;

  return `<div data-nc-block="venn3" data-config="${encodeConfig(
    c
  )}" style="margin:18px auto;width:min(100%,760px);padding:18px 12px 26px;border:1.5px solid #6f8793;border-radius:14px;background:#f7fbfd;font-family:Georgia,'Times New Roman',serif;">
    <div style="position:relative;height:430px;max-width:700px;margin:0 auto;">
      <div style="position:absolute;left:44px;top:68px;width:330px;height:245px;border:3px solid #29434f;border-radius:50%;background:rgba(70,168,225,.14);"></div>
      <div style="position:absolute;right:44px;top:68px;width:330px;height:245px;border:3px solid #29434f;border-radius:50%;background:rgba(69,206,155,.14);"></div>
      <div style="position:absolute;left:185px;top:165px;width:330px;height:245px;border:3px solid #29434f;border-radius:50%;background:rgba(242,190,76,.14);"></div>

      <div style="position:absolute;left:86px;top:22px;font-weight:900;font-size:17px;">${escapeHtml(
        c.aTitle
      )}</div>
      <div style="position:absolute;right:86px;top:22px;font-weight:900;font-size:17px;">${escapeHtml(
        c.bTitle
      )}</div>
      <div style="position:absolute;left:50%;transform:translateX(-50%);bottom:0;font-weight:900;font-size:17px;">${escapeHtml(
        c.cTitle
      )}</div>

      <div style="position:absolute;left:94px;top:145px;width:120px;text-align:center;font-weight:800;">${nl2br(
        c.aText
      )}</div>
      <div style="position:absolute;right:94px;top:145px;width:120px;text-align:center;font-weight:800;">${nl2br(
        c.bText
      )}</div>
      <div style="position:absolute;left:50%;transform:translateX(-50%);top:320px;width:150px;text-align:center;font-weight:800;">${nl2br(
        c.cText
      )}</div>

      <div style="position:absolute;left:50%;transform:translateX(-50%);top:120px;width:130px;text-align:center;font-weight:800;">${nl2br(
        c.abText
      )}</div>
      <div style="position:absolute;left:230px;top:245px;width:110px;text-align:center;font-weight:800;">${nl2br(
        c.acText
      )}</div>
      <div style="position:absolute;right:230px;top:245px;width:110px;text-align:center;font-weight:800;">${nl2br(
        c.bcText
      )}</div>

      <div style="position:absolute;left:50%;transform:translateX(-50%);top:220px;width:120px;text-align:center;font-weight:900;">${nl2br(
        c.abcText
      )}</div>
    </div>
  </div>`;
}

function renderTextBlock(
  block: Extract<
    VisualBlock,
    { kind: "text" }
  >
) {
  const c = block.config;

  return `<div data-nc-block="text" data-config="${encodeConfig(
    c
  )}" style="margin:12px 0;padding:10px 12px;text-align:${
    c.align
  };font-size:${Math.max(
    10,
    Math.min(48, c.fontSize)
  )}px;font-weight:${
    c.bold ? "800" : "400"
  };font-style:${
    c.italic ? "italic" : "normal"
  };font-family:Georgia,'Times New Roman',serif;">${nl2br(
    c.text
  )}</div>`;
}

function renderShape(
  block: Extract<
    VisualBlock,
    { kind: "shape" }
  >
) {
  const c = block.config;

  const shapeStyle =
    c.shape === "circle"
      ? "width:210px;height:210px;border-radius:50%;"
      : c.shape === "ellipse"
      ? "width:340px;height:180px;border-radius:50%;"
      : c.shape === "rounded"
      ? "width:min(100%,520px);min-height:120px;border-radius:30px;"
      : "width:min(100%,520px);min-height:120px;border-radius:4px;";

  return `<div data-nc-block="shape" data-config="${encodeConfig(
    c
  )}" style="margin:18px auto;${shapeStyle}border:3px solid #29434f;background:linear-gradient(180deg,#f8fcfe,#d9edf6);display:flex;align-items:center;justify-content:center;padding:18px;text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:800;">${nl2br(
    c.text
  )}</div>`;
}

function renderVisualBlocks(
  blocks: VisualBlock[]
) {
  return blocks
    .map((block) => {
      switch (block.kind) {
        case "table":
          return renderTable(block);
        case "venn2":
          return renderVenn2(block);
        case "venn3":
          return renderVenn3(block);
        case "text":
          return renderTextBlock(block);
        case "shape":
          return renderShape(block);
        default:
          return "";
      }
    })
    .join("");
}

function parseVisualBlocks(
  html: string
): VisualBlock[] {
  if (
    !html ||
    typeof window === "undefined"
  ) {
    return [];
  }

  try {
    const documentValue =
      new DOMParser().parseFromString(
        `<div id="root">${html}</div>`,
        "text/html"
      );

    const nodes =
      documentValue.querySelectorAll(
        "[data-nc-block][data-config]"
      );

    const blocks: VisualBlock[] = [];

    nodes.forEach((node) => {
      const kind =
        node.getAttribute(
          "data-nc-block"
        );

      const encoded =
        node.getAttribute(
          "data-config"
        ) || "";

      if (!kind || !encoded) {
        return;
      }

      if (kind === "table") {
        const config =
          decodeConfig<TableConfig>(
            encoded
          );

        if (config) {
          blocks.push({
            id: createId(),
            kind: "table",
            config,
          });
        }
      }

      if (kind === "venn2") {
        const config =
          decodeConfig<Venn2Config>(
            encoded
          );

        if (config) {
          blocks.push({
            id: createId(),
            kind: "venn2",
            config,
          });
        }
      }

      if (kind === "venn3") {
        const config =
          decodeConfig<Venn3Config>(
            encoded
          );

        if (config) {
          blocks.push({
            id: createId(),
            kind: "venn3",
            config,
          });
        }
      }

      if (kind === "text") {
        const config =
          decodeConfig<TextConfig>(
            encoded
          );

        if (config) {
          blocks.push({
            id: createId(),
            kind: "text",
            config,
          });
        }
      }

      if (kind === "shape") {
        const config =
          decodeConfig<ShapeConfig>(
            encoded
          );

        if (config) {
          blocks.push({
            id: createId(),
            kind: "shape",
            config,
          });
        }
      }
    });

    return blocks;
  } catch {
    return [];
  }
}

export default function NationalCertificateEditorPage() {
  const router = useRouter();
  const params = useParams();

  const testId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : "";

  const [test, setTest] =
    useState<TestData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [
    currentNumber,
    setCurrentNumber,
  ] = useState(1);

  const [
    questionText,
    setQuestionText,
  ] = useState("");

  const [
    visualBlocks,
    setVisualBlocks,
  ] = useState<VisualBlock[]>([]);

  const [points, setPoints] =
    useState("1");

  const [options, setOptions] =
    useState<TestOption[]>(
      createEmptyOptions()
    );

  const [
    acceptedAnswers,
    setAcceptedAnswers,
  ] = useState<string[]>([""]);

  const [
    selectedBlockId,
    setSelectedBlockId,
  ] = useState<string | null>(
    null
  );

  const currentType:
    | "closed"
    | "open" =
    currentNumber <= 35
      ? "closed"
      : "open";

  const generatedQuestionHtml =
    useMemo(
      () =>
        renderVisualBlocks(
          visualBlocks
        ),
      [visualBlocks]
    );

  async function readJson(
    response: Response
  ) {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  async function loadTest() {
    if (!testId) {
      setError("Test ID topilmadi.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/national-certificate/tests/${encodeURIComponent(
          testId
        )}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data =
        await readJson(response);

      if (
        !response.ok ||
        !data.success ||
        !data.test
      ) {
        setError(
          data.message ||
            "Test ma’lumotlarini yuklab bo‘lmadi."
        );

        return;
      }

      setTest(
        data.test as TestData
      );
    } catch (error) {
      console.error(error);

      setError(
        "Server bilan bog‘lanishda xatolik yuz berdi."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTest();
  }, [testId]);

  const savedQuestions =
    useMemo(() => {
      if (!test?.questions) {
        return new Map<
          number,
          Question
        >();
      }

      return new Map(
        test.questions.map(
          (question) => [
            Number(
              question.question_number
            ),
            question,
          ]
        )
      );
    }, [test]);

  function loadQuestionIntoEditor(
    questionNumber: number
  ) {
    setCurrentNumber(
      questionNumber
    );

    setError("");
    setMessage("");
    setSelectedBlockId(null);

    const existing =
      savedQuestions.get(
        questionNumber
      );

    if (!existing) {
      setQuestionText("");
      setVisualBlocks([]);
      setPoints("1");

      if (
        questionNumber <= 35
      ) {
        setOptions(
          createEmptyOptions()
        );
      } else {
        setAcceptedAnswers([""]);
      }

      return;
    }

    setQuestionText(
      existing.question_text ||
        ""
    );

    setVisualBlocks(
      parseVisualBlocks(
        existing.question_html ||
          ""
      )
    );

    setPoints(
      String(
        existing.points ?? 1
      )
    );

    if (
      questionNumber <= 35
    ) {
      const existingOptions =
        Array.isArray(
          existing.options
        )
          ? existing.options
          : [];

      const loadedOptions =
        OPTION_KEYS.map(
          (key, index) => {
            const found =
              existingOptions.find(
                (option) =>
                  option.option_key ===
                  key
              );

            return {
              id: found?.id,
              option_key: key,
              option_text:
                found?.option_text ||
                "",
              option_html:
                found?.option_html ||
                "",
              is_correct:
                found?.is_correct ===
                true,
              sort_order: index,
            };
          }
        );

      if (
        loadedOptions.filter(
          (option) =>
            option.is_correct
        ).length !== 1
      ) {
        loadedOptions.forEach(
          (
            option,
            index
          ) => {
            option.is_correct =
              index === 0;
          }
        );
      }

      setOptions(
        loadedOptions
      );
    } else {
      const answers =
        Array.isArray(
          existing.acceptedAnswers
        )
          ? existing.acceptedAnswers
              .map(
                (answer) =>
                  answer.answer_text ||
                  ""
              )
              .filter(Boolean)
          : [];

      setAcceptedAnswers(
        answers.length > 0
          ? answers
          : [""]
      );
    }
  }

  useEffect(() => {
    if (!test) {
      return;
    }

    loadQuestionIntoEditor(
      currentNumber
    );
  }, [test]);

  function updateOptionText(
    index: number,
    value: string
  ) {
    setOptions((current) =>
      current.map(
        (
          option,
          optionIndex
        ) =>
          optionIndex === index
            ? {
                ...option,
                option_text:
                  value,
              }
            : option
      )
    );
  }

  function setCorrectOption(
    index: number
  ) {
    setOptions((current) =>
      current.map(
        (
          option,
          optionIndex
        ) => ({
          ...option,
          is_correct:
            optionIndex ===
            index,
        })
      )
    );
  }

  function updateAcceptedAnswer(
    index: number,
    value: string
  ) {
    setAcceptedAnswers(
      (current) =>
        current.map(
          (
            answer,
            answerIndex
          ) =>
            answerIndex ===
            index
              ? value
              : answer
        )
    );
  }

  function addAcceptedAnswer() {
    setAcceptedAnswers(
      (current) => [
        ...current,
        "",
      ]
    );
  }

  function removeAcceptedAnswer(
    index: number
  ) {
    setAcceptedAnswers(
      (current) => {
        if (
          current.length === 1
        ) {
          return [""];
        }

        return current.filter(
          (
            _,
            answerIndex
          ) =>
            answerIndex !==
            index
        );
      }
    );
  }

  function addTable() {
    const block: VisualBlock = {
      id: createId(),
      kind: "table",
      config:
        blankTable(3, 3),
    };

    setVisualBlocks(
      (current) => [
        ...current,
        block,
      ]
    );

    setSelectedBlockId(
      block.id
    );
  }

  function addVenn2() {
    const block: VisualBlock = {
      id: createId(),
      kind: "venn2",
      config: {
        leftTitle:
          "1-to‘plam",
        rightTitle:
          "2-to‘plam",
        leftText: "I",
        intersectionText:
          "III",
        rightText: "II",
      },
    };

    setVisualBlocks(
      (current) => [
        ...current,
        block,
      ]
    );

    setSelectedBlockId(
      block.id
    );
  }

  function addVenn3() {
    const block: VisualBlock = {
      id: createId(),
      kind: "venn3",
      config: {
        aTitle:
          "A to‘plam",
        bTitle:
          "B to‘plam",
        cTitle:
          "C to‘plam",
        aText: "I",
        bText: "II",
        cText: "III",
        abText: "IV",
        acText: "V",
        bcText: "VI",
        abcText: "VII",
      },
    };

    setVisualBlocks(
      (current) => [
        ...current,
        block,
      ]
    );

    setSelectedBlockId(
      block.id
    );
  }

  function addTextBlock() {
    const block: VisualBlock = {
      id: createId(),
      kind: "text",
      config: {
        text:
          "Matn blokini yozing",
        align: "left",
        bold: false,
        italic: false,
        fontSize: 18,
      },
    };

    setVisualBlocks(
      (current) => [
        ...current,
        block,
      ]
    );

    setSelectedBlockId(
      block.id
    );
  }

  function addShape(
    shape:
      | "rectangle"
      | "rounded"
      | "circle"
      | "ellipse"
  ) {
    const block: VisualBlock = {
      id: createId(),
      kind: "shape",
      config: {
        text:
          "Shakl ichidagi matn",
        shape,
      },
    };

    setVisualBlocks(
      (current) => [
        ...current,
        block,
      ]
    );

    setSelectedBlockId(
      block.id
    );
  }

  function updateBlock(
    id: string,
    updater: (
      block: VisualBlock
    ) => VisualBlock
  ) {
    setVisualBlocks(
      (current) =>
        current.map((block) =>
          block.id === id
            ? updater(block)
            : block
        )
    );
  }

  function removeBlock(
    id: string
  ) {
    setVisualBlocks(
      (current) =>
        current.filter(
          (block) =>
            block.id !== id
        )
    );

    if (
      selectedBlockId === id
    ) {
      setSelectedBlockId(
        null
      );
    }
  }

  function moveBlock(
    id: string,
    direction: -1 | 1
  ) {
    setVisualBlocks(
      (current) => {
        const index =
          current.findIndex(
            (block) =>
              block.id === id
          );

        if (index < 0) {
          return current;
        }

        const nextIndex =
          index + direction;

        if (
          nextIndex < 0 ||
          nextIndex >=
            current.length
        ) {
          return current;
        }

        const copy =
          [...current];

        [
          copy[index],
          copy[nextIndex],
        ] = [
          copy[nextIndex],
          copy[index],
        ];

        return copy;
      }
    );
  }

  function changeTableSize(
    id: string,
    rows: number,
    cols: number
  ) {
    updateBlock(
      id,
      (block) => {
        if (
          block.kind !==
          "table"
        ) {
          return block;
        }

        const safeRows =
          Math.max(
            1,
            Math.min(
              12,
              rows
            )
          );

        const safeCols =
          Math.max(
            1,
            Math.min(
              10,
              cols
            )
          );

        const nextCells =
          Array.from(
            {
              length:
                safeRows,
            },
            (
              _,
              rowIndex
            ) =>
              Array.from(
                {
                  length:
                    safeCols,
                },
                (
                  __,
                  colIndex
                ) =>
                  block.config
                    .cells[
                    rowIndex
                  ]?.[
                    colIndex
                  ] || ""
              )
          );

        return {
          ...block,
          config: {
            ...block.config,
            rows: safeRows,
            cols: safeCols,
            cells: nextCells,
          },
        };
      }
    );
  }

  function updateTableCell(
    id: string,
    rowIndex: number,
    colIndex: number,
    value: string
  ) {
    updateBlock(
      id,
      (block) => {
        if (
          block.kind !==
          "table"
        ) {
          return block;
        }

        const cells =
          block.config.cells.map(
            (row) => [
              ...row,
            ]
          );

        if (
          cells[rowIndex]
        ) {
          cells[rowIndex][
            colIndex
          ] = value;
        }

        return {
          ...block,
          config: {
            ...block.config,
            cells,
          },
        };
      }
    );
  }

  async function saveCurrentQuestion() {
    if (!test) {
      return;
    }

    if (
      test.status !==
      "draft"
    ) {
      window.alert(
        "E’lon qilingan testni tahrirlab bo‘lmaydi."
      );

      return;
    }

    const cleanQuestionText =
      questionText.trim();

    if (
      !cleanQuestionText
    ) {
      setError(
        "Savol matnini kiriting."
      );

      return;
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

      return;
    }

    if (
      currentType ===
      "closed"
    ) {
      const hasEmptyOption =
        options.some(
          (option) =>
            !option.option_text.trim()
        );

      if (
        hasEmptyOption
      ) {
        setError(
          "A, B, C va D variantlarining barchasini kiriting."
        );

        return;
      }

      const correctCount =
        options.filter(
          (option) =>
            option.is_correct
        ).length;

      if (
        correctCount !== 1
      ) {
        setError(
          "Aynan bitta to‘g‘ri javob belgilang."
        );

        return;
      }
    } else {
      const validAnswers =
        acceptedAnswers
          .map((answer) =>
            answer.trim()
          )
          .filter(Boolean);

      if (
        validAnswers.length ===
        0
      ) {
        setError(
          "Kamida bitta qabul qilinadigan javob kiriting."
        );

        return;
      }
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const body =
        currentType ===
        "closed"
          ? {
              questionNumber:
                currentNumber,
              questionText:
                cleanQuestionText,
              questionHtml:
                generatedQuestionHtml,
              points:
                numericPoints,
              options:
                options.map(
                  (option) => ({
                    key:
                      option.option_key,
                    text:
                      option.option_text.trim(),
                    html:
                      option.option_html ||
                      "",
                    isCorrect:
                      option.is_correct,
                  })
                ),
            }
          : {
              questionNumber:
                currentNumber,
              questionText:
                cleanQuestionText,
              questionHtml:
                generatedQuestionHtml,
              points:
                numericPoints,
              acceptedAnswers:
                acceptedAnswers
                  .map(
                    (answer) =>
                      answer.trim()
                  )
                  .filter(
                    Boolean
                  ),
            };

      const response =
        await fetch(
          `/api/national-certificate/tests/${encodeURIComponent(
            test.id
          )}/questions`,
          {
            method:
              "POST",
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
        setError(
          data.message ||
            "Savolni saqlab bo‘lmadi."
        );

        return;
      }

      setMessage(
        `${currentNumber}-savol saqlandi.`
      );

      await loadTest();

      if (
        currentNumber < 45
      ) {
        const next =
          currentNumber + 1;

        setTimeout(
          () =>
            loadQuestionIntoEditor(
              next
            ),
          50
        );
      }
    } catch (error) {
      console.error(error);

      setError(
        "Savolni saqlashda server xatosi yuz berdi."
      );
    } finally {
      setSaving(false);
    }
  }

  async function publishTest() {
    if (!test) {
      return;
    }

    if (
      test.status ===
      "published"
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Testni e’lon qilasizmi? 45 ta savol to‘liq bo‘lishi kerak."
      );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response =
        await fetch(
          `/api/national-certificate/tests/${encodeURIComponent(
            test.id
          )}/publish`,
          {
            method:
              "POST",
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
        setError(
          data.message ||
            "Testni e’lon qilib bo‘lmadi."
        );

        return;
      }

      setMessage(
        "Test muvaffaqiyatli e’lon qilindi."
      );

      await loadTest();
    } catch {
      setError(
        "Testni e’lon qilishda server xatosi yuz berdi."
      );
    } finally {
      setSaving(false);
    }
  }

  const savedCount =
    test?.questions?.length ||
    0;

  const closedSavedCount =
    test?.questions?.filter(
      (question) =>
        Number(
          question.question_number
        ) <= 35
    ).length || 0;

  const openSavedCount =
    test?.questions?.filter(
      (question) =>
        Number(
          question.question_number
        ) >= 36
    ).length || 0;

  const selectedBlock =
    visualBlocks.find(
      (block) =>
        block.id ===
        selectedBlockId
    ) || null;

  if (loading) {
    return (
      <main className="centerPage">
        <div className="loadingCard">
          Test yuklanmoqda...
        </div>

        <style jsx>{`
          .centerPage {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #e7eef2;
            font-family: Georgia, "Times New Roman", serif;
          }

          .loadingCard {
            padding: 24px 34px;
            border: 2px solid #38515f;
            border-radius: 14px;
            background: white;
            font-weight: 900;
            box-shadow: 0 5px 0 #38515f;
          }
        `}</style>
      </main>
    );
  }

  if (!test) {
    return (
      <main className="centerPage">
        <div className="errorCard">
          <strong>
            Testni ochib bo‘lmadi.
          </strong>

          <p>{error}</p>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/admin/tests/national-certificate"
              )
            }
          >
            Orqaga
          </button>
        </div>

        <style jsx>{`
          .centerPage {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #e7eef2;
            font-family: Georgia, "Times New Roman", serif;
          }

          .errorCard {
            width: min(520px, 92%);
            padding: 24px;
            border: 2px solid #8c3b3b;
            border-radius: 14px;
            background: white;
            text-align: center;
          }

          button {
            min-height: 42px;
            padding: 0 20px;
            border: 2px solid #2b607c;
            border-radius: 9px;
            background: #7fc2e3;
            font-weight: 900;
            cursor: pointer;
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="topHeader">
        <div className="titlePlate">
          <div className="miniTitle">
            MILLIY SERTIFIKAT
          </div>

          <h1>{test.title}</h1>

          <p>
            35 ta yopiq + 10 ta
            ochiq savol
          </p>
        </div>

        <div className="headerActions">
          <button
            type="button"
            className="grayButton"
            onClick={() =>
              router.push(
                "/admin/tests/national-certificate"
              )
            }
          >
            ← Testlar
          </button>

          <button
            type="button"
            className="grayButton"
            onClick={() =>
              router.push(
                "/admin/results/national-certificate"
              )
            }
          >
            Natijalar
          </button>

          {test.status ===
            "draft" && (
            <button
              type="button"
              className="greenButton"
              disabled={saving}
              onClick={
                publishTest
              }
            >
              E’lon qilish
            </button>
          )}
        </div>
      </header>

      <section className="stats">
        <div>
          <span>
            Saqlangan
          </span>
          <strong>
            {savedCount}/45
          </strong>
        </div>

        <div>
          <span>Yopiq</span>
          <strong>
            {closedSavedCount}/35
          </strong>
        </div>

        <div>
          <span>Ochiq</span>
          <strong>
            {openSavedCount}/10
          </strong>
        </div>

        <div>
          <span>Vaqt</span>
          <strong>
            {
              test.duration_minutes
            }{" "}
            daqiqa
          </strong>
        </div>

        <div>
          <span>Holati</span>
          <strong>
            {test.status ===
            "draft"
              ? "Qoralama"
              : "E’lon qilingan"}
          </strong>
        </div>
      </section>

      <section className="workspace">
        <aside className="navigator">
          <div className="navigatorTitle">
            SAVOLLAR
          </div>

          <div className="questionGrid">
            {Array.from(
              {
                length: 45,
              },
              (_, index) =>
                index + 1
            ).map((number) => {
              const saved =
                savedQuestions.has(
                  number
                );

              const active =
                currentNumber ===
                number;

              return (
                <button
                  type="button"
                  key={number}
                  className={[
                    "questionButton",
                    saved
                      ? "saved"
                      : "",
                    active
                      ? "active"
                      : "",
                    number >= 36
                      ? "openQuestion"
                      : "",
                  ]
                    .filter(
                      Boolean
                    )
                    .join(" ")}
                  onClick={() =>
                    loadQuestionIntoEditor(
                      number
                    )
                  }
                >
                  {number}
                </button>
              );
            })}
          </div>

          <div className="legend">
            <div>
              <span className="dot closedDot" />
              1–35 yopiq
            </div>

            <div>
              <span className="dot openDot" />
              36–45 ochiq
            </div>

            <div>
              <span className="dot savedDot" />
              Saqlangan
            </div>
          </div>
        </aside>

        <section className="editorCard">
          <div className="editorHeader">
            <div className="questionTitle">
              <span>
                {currentNumber}
                -savol
              </span>

              <strong>
                {currentType ===
                "closed"
                  ? "Yopiq savol"
                  : "Ochiq savol"}
              </strong>
            </div>

            <label className="pointsBox">
              <span>
                Ball
              </span>

              <input
                type="number"
                min="0"
                step="0.001"
                value={points}
                onChange={(
                  event
                ) =>
                  setPoints(
                    event.target
                      .value
                  )
                }
                disabled={
                  saving ||
                  test.status !==
                    "draft"
                }
              />
            </label>
          </div>

          <div className="field">
            <label>
              Savol matni
            </label>

            <textarea
              rows={6}
              value={
                questionText
              }
              onChange={(
                event
              ) =>
                setQuestionText(
                  event.target
                    .value
                )
              }
              placeholder="Savol matnini kiriting..."
              disabled={
                saving ||
                test.status !==
                  "draft"
              }
            />
          </div>

          <section className="visualSection">
            <div className="visualTitleRow">
              <div>
                <div className="blockTitle">
                  SAVOL ELEMENTLARI
                </div>

                <p>
                  Jadval, Eyler–Venn
                  diagrammasi, matn
                  bloki yoki shakl
                  qo‘shing.
                </p>
              </div>

              <div className="elementToolbar">
                <button
                  type="button"
                  onClick={addTable}
                  disabled={
                    test.status !==
                    "draft" ||
                    saving
                  }
                >
                  ▦ Jadval
                </button>

                <button
                  type="button"
                  onClick={
                    addVenn2
                  }
                  disabled={
                    test.status !==
                    "draft" ||
                    saving
                  }
                >
                  ◯◯ 2 Venn
                </button>

                <button
                  type="button"
                  onClick={
                    addVenn3
                  }
                  disabled={
                    test.status !==
                    "draft" ||
                    saving
                  }
                >
                  ◯◯◯ 3 Venn
                </button>

                <button
                  type="button"
                  onClick={
                    addTextBlock
                  }
                  disabled={
                    test.status !==
                    "draft" ||
                    saving
                  }
                >
                  T Matn
                </button>

                <button
                  type="button"
                  onClick={() =>
                    addShape(
                      "rectangle"
                    )
                  }
                  disabled={
                    test.status !==
                    "draft" ||
                    saving
                  }
                >
                  ▭ To‘rtburchak
                </button>

                <button
                  type="button"
                  onClick={() =>
                    addShape(
                      "rounded"
                    )
                  }
                  disabled={
                    test.status !==
                    "draft" ||
                    saving
                  }
                >
                  ▢ Yumaloq
                </button>

                <button
                  type="button"
                  onClick={() =>
                    addShape(
                      "circle"
                    )
                  }
                  disabled={
                    test.status !==
                    "draft" ||
                    saving
                  }
                >
                  ○ Aylana
                </button>

                <button
                  type="button"
                  onClick={() =>
                    addShape(
                      "ellipse"
                    )
                  }
                  disabled={
                    test.status !==
                    "draft" ||
                    saving
                  }
                >
                  ⬭ Ellips
                </button>
              </div>
            </div>

            {visualBlocks.length ===
            0 ? (
              <div className="emptyVisual">
                Hozircha savolga
                jadval yoki diagramma
                qo‘shilmagan.
              </div>
            ) : (
              <div className="visualBlockList">
                {visualBlocks.map(
                  (
                    block,
                    index
                  ) => (
                    <article
                      key={
                        block.id
                      }
                      className={
                        selectedBlockId ===
                        block.id
                          ? "visualBlockCard selected"
                          : "visualBlockCard"
                      }
                    >
                      <div className="visualBlockTop">
                        <button
                          type="button"
                          className="selectBlock"
                          onClick={() =>
                            setSelectedBlockId(
                              block.id
                            )
                          }
                        >
                          {index +
                            1}
                          .{" "}
                          {block.kind ===
                          "table"
                            ? "Jadval"
                            : block.kind ===
                              "venn2"
                            ? "2 doirali Eyler–Venn"
                            : block.kind ===
                              "venn3"
                            ? "3 doirali Eyler–Venn"
                            : block.kind ===
                              "text"
                            ? "Matn bloki"
                            : "Shakl"}
                        </button>

                        <div className="blockActions">
                          <button
                            type="button"
                            onClick={() =>
                              moveBlock(
                                block.id,
                                -1
                              )
                            }
                            disabled={
                              index ===
                                0 ||
                              saving
                            }
                          >
                            ↑
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              moveBlock(
                                block.id,
                                1
                              )
                            }
                            disabled={
                              index ===
                                visualBlocks.length -
                                  1 ||
                              saving
                            }
                          >
                            ↓
                          </button>

                          <button
                            type="button"
                            className="deleteTiny"
                            onClick={() =>
                              removeBlock(
                                block.id
                              )
                            }
                            disabled={
                              saving ||
                              test.status !==
                                "draft"
                            }
                          >
                            ×
                          </button>
                        </div>
                      </div>

                      <div
                        className="miniPreview"
                        dangerouslySetInnerHTML={{
                          __html:
                            renderVisualBlocks(
                              [
                                block,
                              ]
                            ),
                        }}
                      />
                    </article>
                  )
                )}
              </div>
            )}

            {selectedBlock && (
              <div className="propertyPanel">
                <div className="propertyTitle">
                  TANLANGAN ELEMENTNI
                  TAHRIRLASH
                </div>

                {selectedBlock.kind ===
                  "table" && (
                  <div className="propertyBody">
                    <div className="twoCols">
                      <label>
                        Qatorlar
                        <input
                          type="number"
                          min="1"
                          max="12"
                          value={
                            selectedBlock
                              .config
                              .rows
                          }
                          onChange={(
                            event
                          ) =>
                            changeTableSize(
                              selectedBlock.id,
                              Number(
                                event.target
                                  .value
                              ),
                              selectedBlock
                                .config
                                .cols
                            )
                          }
                        />
                      </label>

                      <label>
                        Ustunlar
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={
                            selectedBlock
                              .config
                              .cols
                          }
                          onChange={(
                            event
                          ) =>
                            changeTableSize(
                              selectedBlock.id,
                              selectedBlock
                                .config
                                .rows,
                              Number(
                                event.target
                                  .value
                              )
                            )
                          }
                        />
                      </label>
                    </div>

                    <label className="checkLabel">
                      <input
                        type="checkbox"
                        checked={
                          selectedBlock
                            .config
                            .headerRow
                        }
                        onChange={(
                          event
                        ) =>
                          updateBlock(
                            selectedBlock.id,
                            (
                              block
                            ) => {
                              if (
                                block.kind !==
                                "table"
                              ) {
                                return block;
                              }

                              return {
                                ...block,
                                config: {
                                  ...block.config,
                                  headerRow:
                                    event
                                      .target
                                      .checked,
                                },
                              };
                            }
                          )
                        }
                      />
                      Birinchi qatorni
                      sarlavha qatori
                      qilish
                    </label>

                    <div className="tableEditorWrap">
                      <table className="tableEditor">
                        <tbody>
                          {selectedBlock.config.cells.map(
                            (
                              row,
                              rowIndex
                            ) => (
                              <tr
                                key={
                                  rowIndex
                                }
                              >
                                {row.map(
                                  (
                                    cell,
                                    colIndex
                                  ) => (
                                    <td
                                      key={
                                        colIndex
                                      }
                                    >
                                      <textarea
                                        value={
                                          cell
                                        }
                                        rows={
                                          2
                                        }
                                        onChange={(
                                          event
                                        ) =>
                                          updateTableCell(
                                            selectedBlock.id,
                                            rowIndex,
                                            colIndex,
                                            event
                                              .target
                                              .value
                                          )
                                        }
                                      />
                                    </td>
                                  )
                                )}
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {selectedBlock.kind ===
                  "venn2" && (
                  <div className="propertyBody">
                    {[
                      [
                        "leftTitle",
                        "Chap doira nomi",
                      ],
                      [
                        "rightTitle",
                        "O‘ng doira nomi",
                      ],
                      [
                        "leftText",
                        "Faqat chap qism",
                      ],
                      [
                        "intersectionText",
                        "Kesishma",
                      ],
                      [
                        "rightText",
                        "Faqat o‘ng qism",
                      ],
                    ].map(
                      ([
                        key,
                        label,
                      ]) => (
                        <label
                          key={
                            key
                          }
                        >
                          {label}
                          <textarea
                            rows={
                              2
                            }
                            value={
                              String(
                                selectedBlock
                                  .config[
                                  key as keyof Venn2Config
                                ] ||
                                  ""
                              )
                            }
                            onChange={(
                              event
                            ) =>
                              updateBlock(
                                selectedBlock.id,
                                (
                                  block
                                ) => {
                                  if (
                                    block.kind !==
                                    "venn2"
                                  ) {
                                    return block;
                                  }

                                  return {
                                    ...block,
                                    config: {
                                      ...block.config,
                                      [key]:
                                        event
                                          .target
                                          .value,
                                    },
                                  };
                                }
                              )
                            }
                          />
                        </label>
                      )
                    )}
                  </div>
                )}

                {selectedBlock.kind ===
                  "venn3" && (
                  <div className="propertyBody vennFields">
                    {[
                      [
                        "aTitle",
                        "A doira nomi",
                      ],
                      [
                        "bTitle",
                        "B doira nomi",
                      ],
                      [
                        "cTitle",
                        "C doira nomi",
                      ],
                      [
                        "aText",
                        "Faqat A",
                      ],
                      [
                        "bText",
                        "Faqat B",
                      ],
                      [
                        "cText",
                        "Faqat C",
                      ],
                      [
                        "abText",
                        "A ∩ B",
                      ],
                      [
                        "acText",
                        "A ∩ C",
                      ],
                      [
                        "bcText",
                        "B ∩ C",
                      ],
                      [
                        "abcText",
                        "A ∩ B ∩ C",
                      ],
                    ].map(
                      ([
                        key,
                        label,
                      ]) => (
                        <label
                          key={
                            key
                          }
                        >
                          {label}
                          <textarea
                            rows={
                              2
                            }
                            value={
                              String(
                                selectedBlock
                                  .config[
                                  key as keyof Venn3Config
                                ] ||
                                  ""
                              )
                            }
                            onChange={(
                              event
                            ) =>
                              updateBlock(
                                selectedBlock.id,
                                (
                                  block
                                ) => {
                                  if (
                                    block.kind !==
                                    "venn3"
                                  ) {
                                    return block;
                                  }

                                  return {
                                    ...block,
                                    config: {
                                      ...block.config,
                                      [key]:
                                        event
                                          .target
                                          .value,
                                    },
                                  };
                                }
                              )
                            }
                          />
                        </label>
                      )
                    )}
                  </div>
                )}

                {selectedBlock.kind ===
                  "text" && (
                  <div className="propertyBody">
                    <label>
                      Matn
                      <textarea
                        rows={4}
                        value={
                          selectedBlock
                            .config
                            .text
                        }
                        onChange={(
                          event
                        ) =>
                          updateBlock(
                            selectedBlock.id,
                            (
                              block
                            ) => {
                              if (
                                block.kind !==
                                "text"
                              ) {
                                return block;
                              }

                              return {
                                ...block,
                                config: {
                                  ...block.config,
                                  text:
                                    event
                                      .target
                                      .value,
                                },
                              };
                            }
                          )
                        }
                      />
                    </label>

                    <div className="threeCols">
                      <label>
                        Tekislash
                        <select
                          value={
                            selectedBlock
                              .config
                              .align
                          }
                          onChange={(
                            event
                          ) =>
                            updateBlock(
                              selectedBlock.id,
                              (
                                block
                              ) => {
                                if (
                                  block.kind !==
                                  "text"
                                ) {
                                  return block;
                                }

                                return {
                                  ...block,
                                  config: {
                                    ...block.config,
                                    align:
                                      event
                                        .target
                                        .value as TextConfig["align"],
                                  },
                                };
                              }
                            )
                          }
                        >
                          <option value="left">
                            Chap
                          </option>
                          <option value="center">
                            Markaz
                          </option>
                          <option value="right">
                            O‘ng
                          </option>
                        </select>
                      </label>

                      <label>
                        O‘lcham
                        <input
                          type="number"
                          min="10"
                          max="48"
                          value={
                            selectedBlock
                              .config
                              .fontSize
                          }
                          onChange={(
                            event
                          ) =>
                            updateBlock(
                              selectedBlock.id,
                              (
                                block
                              ) => {
                                if (
                                  block.kind !==
                                  "text"
                                ) {
                                  return block;
                                }

                                return {
                                  ...block,
                                  config: {
                                    ...block.config,
                                    fontSize:
                                      Number(
                                        event
                                          .target
                                          .value
                                      ) ||
                                      18,
                                  },
                                };
                              }
                            )
                          }
                        />
                      </label>

                      <div className="formatChecks">
                        <label>
                          <input
                            type="checkbox"
                            checked={
                              selectedBlock
                                .config
                                .bold
                            }
                            onChange={(
                              event
                            ) =>
                              updateBlock(
                                selectedBlock.id,
                                (
                                  block
                                ) => {
                                  if (
                                    block.kind !==
                                    "text"
                                  ) {
                                    return block;
                                  }

                                  return {
                                    ...block,
                                    config: {
                                      ...block.config,
                                      bold:
                                        event
                                          .target
                                          .checked,
                                    },
                                  };
                                }
                              )
                            }
                          />
                          Qalin
                        </label>

                        <label>
                          <input
                            type="checkbox"
                            checked={
                              selectedBlock
                                .config
                                .italic
                            }
                            onChange={(
                              event
                            ) =>
                              updateBlock(
                                selectedBlock.id,
                                (
                                  block
                                ) => {
                                  if (
                                    block.kind !==
                                    "text"
                                  ) {
                                    return block;
                                  }

                                  return {
                                    ...block,
                                    config: {
                                      ...block.config,
                                      italic:
                                        event
                                          .target
                                          .checked,
                                    },
                                  };
                                }
                              )
                            }
                          />
                          Kursiv
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {selectedBlock.kind ===
                  "shape" && (
                  <div className="propertyBody">
                    <label>
                      Shakl ichidagi
                      matn
                      <textarea
                        rows={4}
                        value={
                          selectedBlock
                            .config
                            .text
                        }
                        onChange={(
                          event
                        ) =>
                          updateBlock(
                            selectedBlock.id,
                            (
                              block
                            ) => {
                              if (
                                block.kind !==
                                "shape"
                              ) {
                                return block;
                              }

                              return {
                                ...block,
                                config: {
                                  ...block.config,
                                  text:
                                    event
                                      .target
                                      .value,
                                },
                              };
                            }
                          )
                        }
                      />
                    </label>

                    <label>
                      Shakl turi
                      <select
                        value={
                          selectedBlock
                            .config
                            .shape
                        }
                        onChange={(
                          event
                        ) =>
                          updateBlock(
                            selectedBlock.id,
                            (
                              block
                            ) => {
                              if (
                                block.kind !==
                                "shape"
                              ) {
                                return block;
                              }

                              return {
                                ...block,
                                config: {
                                  ...block.config,
                                  shape:
                                    event
                                      .target
                                      .value as ShapeConfig["shape"],
                                },
                              };
                            }
                          )
                        }
                      >
                        <option value="rectangle">
                          To‘rtburchak
                        </option>
                        <option value="rounded">
                          Yumaloq to‘rtburchak
                        </option>
                        <option value="circle">
                          Aylana
                        </option>
                        <option value="ellipse">
                          Ellips
                        </option>
                      </select>
                    </label>
                  </div>
                )}
              </div>
            )}

            <div className="fullPreview">
              <div className="previewTitle">
                TESTDA QANDAY
                KO‘RINADI
              </div>

              {generatedQuestionHtml ? (
                <div
                  className="renderedHtml"
                  dangerouslySetInnerHTML={{
                    __html:
                      generatedQuestionHtml,
                  }}
                />
              ) : (
                <div className="previewEmpty">
                  Qo‘shimcha element
                  yo‘q.
                </div>
              )}
            </div>
          </section>

          {currentType ===
          "closed" ? (
            <div className="closedBlock">
              <div className="blockTitle">
                JAVOB VARIANTLARI
              </div>

              {options.map(
                (
                  option,
                  index
                ) => (
                  <div
                    className={
                      option.is_correct
                        ? "optionRow correct"
                        : "optionRow"
                    }
                    key={
                      option.option_key
                    }
                  >
                    <button
                      type="button"
                      className="correctSelector"
                      onClick={() =>
                        setCorrectOption(
                          index
                        )
                      }
                      disabled={
                        saving ||
                        test.status !==
                          "draft"
                      }
                      title="To‘g‘ri javob sifatida belgilash"
                    >
                      {option.is_correct
                        ? "✓"
                        : ""}
                    </button>

                    <div className="optionLetter">
                      {
                        option.option_key
                      }
                    </div>

                    <input
                      value={
                        option.option_text
                      }
                      onChange={(
                        event
                      ) =>
                        updateOptionText(
                          index,
                          event.target
                            .value
                        )
                      }
                      placeholder={`${option.option_key} variantini kiriting`}
                      disabled={
                        saving ||
                        test.status !==
                          "draft"
                      }
                    />
                  </div>
                )
              )}

              <p className="helper">
                Yashil belgi
                qo‘yilgan variant
                to‘g‘ri javob
                hisoblanadi.
              </p>
            </div>
          ) : (
            <div className="openBlock">
              <div className="blockTitle">
                QABUL QILINADIGAN
                TO‘G‘RI JAVOBLAR
              </div>

              <p className="helper">
                Bir ma’noni
                ifodalovchi bir
                nechta yozilish
                variantini
                qo‘shishingiz
                mumkin.
              </p>

              {acceptedAnswers.map(
                (
                  answer,
                  index
                ) => (
                  <div
                    className="answerRow"
                    key={index}
                  >
                    <div className="answerNumber">
                      {index + 1}
                    </div>

                    <input
                      value={
                        answer
                      }
                      onChange={(
                        event
                      ) =>
                        updateAcceptedAnswer(
                          index,
                          event.target
                            .value
                        )
                      }
                      placeholder="To‘g‘ri javob..."
                      disabled={
                        saving ||
                        test.status !==
                          "draft"
                      }
                    />

                    <button
                      type="button"
                      className="removeButton"
                      onClick={() =>
                        removeAcceptedAnswer(
                          index
                        )
                      }
                      disabled={
                        saving ||
                        test.status !==
                          "draft"
                      }
                    >
                      ×
                    </button>
                  </div>
                )
              )}

              <button
                type="button"
                className="addAnswerButton"
                onClick={
                  addAcceptedAnswer
                }
                disabled={
                  saving ||
                  test.status !==
                    "draft"
                }
              >
                + Yana javob
                qo‘shish
              </button>
            </div>
          )}

          {error && (
            <div className="errorBox">
              {error}
            </div>
          )}

          {message && (
            <div className="messageBox">
              {message}
            </div>
          )}

          <div className="bottomActions">
            <button
              type="button"
              className="navButton"
              disabled={
                currentNumber ===
                  1 || saving
              }
              onClick={() =>
                loadQuestionIntoEditor(
                  currentNumber - 1
                )
              }
            >
              ← Oldingi
            </button>

            <button
              type="button"
              className="saveButton"
              onClick={
                saveCurrentQuestion
              }
              disabled={
                saving ||
                test.status !==
                  "draft"
              }
            >
              {saving
                ? "SAQLANMOQDA..."
                : "SAVOLNI SAQLASH"}
            </button>

            <button
              type="button"
              className="navButton"
              disabled={
                currentNumber ===
                  45 || saving
              }
              onClick={() =>
                loadQuestionIntoEditor(
                  currentNumber + 1
                )
              }
            >
              Keyingi →
            </button>
          </div>
        </section>
      </section>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          padding: 20px;
          color: #111a20;
          background:
            radial-gradient(
              circle at 8% 0%,
              rgba(
                255,
                255,
                255,
                0.95
              ),
              transparent 24%
            ),
            linear-gradient(
              180deg,
              #e8eef2 0%,
              #c8d3da 100%
            );
          font-family:
            Georgia,
            "Times New Roman",
            serif;
        }

        .topHeader,
        .stats div,
        .navigator,
        .editorCard {
          border: 2px solid
            #29434f;
          box-shadow:
            inset 0 4px 3px
              rgba(
                255,
                255,
                255,
                0.8
              ),
            0 5px 0
              #29434f,
            0 12px 23px
              rgba(
                0,
                0,
                0,
                0.16
              );
        }

        .topHeader {
          width: min(
            1640px,
            100%
          );
          min-height: 142px;
          margin: 0 auto 22px;
          padding: 22px 26px;
          display: flex;
          justify-content:
            space-between;
          align-items: center;
          gap: 18px;
          border-radius: 22px;
          background:
            linear-gradient(
              180deg,
              #61d2ff 0%,
              #0789d8 53%,
              #0866ae 100%
            );
        }

        .titlePlate {
          padding: 14px 20px;
          border: 2px solid
            #344a55;
          border-radius: 15px;
          background:
            linear-gradient(
              180deg,
              #fff 0%,
              #d5dde2 100%
            );
          box-shadow:
            inset 0 4px 3px
              #fff,
            0 5px 0
              #425966;
        }

        .miniTitle {
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 1.5px;
        }

        .topHeader h1 {
          margin: 4px 0;
          font-size: clamp(
            25px,
            2vw,
            34px
          );
        }

        .topHeader p {
          margin: 0;
          font-weight: 700;
        }

        .headerActions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        button,
        input,
        textarea,
        select {
          font: inherit;
        }

        button {
          cursor: pointer;
        }

        button:disabled {
          cursor:
            not-allowed;
          opacity: 0.55;
        }

        .grayButton,
        .greenButton {
          min-height: 48px;
          padding: 0 18px;
          border: 2px solid
            #2c4652;
          border-radius: 12px;
          font-weight: 900;
          box-shadow:
            inset 0 3px 2px
              rgba(
                255,
                255,
                255,
                0.85
              ),
            0 4px 0
              #2c4652;
        }

        .grayButton {
          background:
            linear-gradient(
              180deg,
              #fff,
              #ccd5da
            );
        }

        .greenButton {
          background:
            linear-gradient(
              180deg,
              #e5ffeb,
              #75d38d
            );
        }

        .stats {
          width: min(
            1640px,
            100%
          );
          margin: 0 auto 22px;
          display: grid;
          grid-template-columns:
            repeat(
              5,
              minmax(0, 1fr)
            );
          gap: 12px;
        }

        .stats div {
          min-height: 90px;
          padding: 14px;
          border-radius: 14px;
          background:
            linear-gradient(
              180deg,
              #fff,
              #d9e1e5
            );
          display: flex;
          flex-direction:
            column;
          align-items: center;
          justify-content:
            center;
          text-align: center;
        }

        .stats span {
          font-size: 12px;
          font-weight: 900;
        }

        .stats strong {
          margin-top: 5px;
          font-size: 20px;
        }

        .workspace {
          width: min(
            1640px,
            100%
          );
          margin: 0 auto 50px;
          display: grid;
          grid-template-columns:
            290px minmax(
              0,
              1fr
            );
          gap: 18px;
          align-items: start;
        }

        .navigator {
          position: sticky;
          top: 16px;
          padding: 14px;
          border-radius: 18px;
          background:
            linear-gradient(
              180deg,
              #aebac1,
              #718089
            );
        }

        .navigatorTitle,
        .blockTitle,
        .propertyTitle,
        .previewTitle {
          padding: 9px 12px;
          border: 2px solid
            #38525f;
          border-radius: 10px;
          background:
            linear-gradient(
              180deg,
              #64d2ff,
              #0887d4
            );
          color: white;
          font-weight: 900;
          text-align: center;
          box-shadow:
            inset 0 3px 2px
              rgba(
                255,
                255,
                255,
                0.65
              ),
            0 3px 0
              #38525f;
        }

        .questionGrid {
          margin-top: 14px;
          display: grid;
          grid-template-columns:
            repeat(
              5,
              1fr
            );
          gap: 8px;
        }

        .questionButton {
          min-height: 42px;
          border: 2px solid
            #4b5e67;
          border-radius: 9px;
          background:
            linear-gradient(
              180deg,
              #fff,
              #ccd4d8
            );
          font-weight: 900;
          box-shadow:
            inset 0 2px 2px
              #fff,
            0 3px 0
              #4b5e67;
        }

        .questionButton.openQuestion {
          background:
            linear-gradient(
              180deg,
              #fff8cc,
              #e1c863
            );
        }

        .questionButton.saved {
          background:
            linear-gradient(
              180deg,
              #e9ffed,
              #70cd87
            );
        }

        .questionButton.active {
          color: #fff;
          background:
            linear-gradient(
              180deg,
              #5dd1ff,
              #087fc7
            );
          transform:
            translateY(
              -2px
            );
        }

        .legend {
          margin-top: 16px;
          padding: 11px;
          border: 2px solid
            #51656e;
          border-radius: 11px;
          background:
            rgba(
              255,
              255,
              255,
              0.68
            );
          font-size: 12px;
          font-weight: 800;
        }

        .legend div {
          margin: 5px 0;
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .dot {
          width: 13px;
          height: 13px;
          border: 1px solid
            #364d58;
          border-radius: 3px;
        }

        .closedDot {
          background: #fff;
        }

        .openDot {
          background: #e5cb62;
        }

        .savedDot {
          background: #70cd87;
        }

        .editorCard {
          padding: 18px;
          border-radius: 18px;
          background:
            linear-gradient(
              180deg,
              #f8fafb,
              #d8e0e4
            );
        }

        .editorHeader {
          padding: 12px 14px;
          border: 2px solid
            #647781;
          border-radius: 12px;
          background:
            linear-gradient(
              180deg,
              #fff,
              #d7e0e4
            );
          display: flex;
          align-items: center;
          justify-content:
            space-between;
          gap: 15px;
          box-shadow:
            inset 0 3px 2px
              #fff,
            0 3px 0
              #71838c;
        }

        .questionTitle {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .questionTitle span {
          font-size: 22px;
          font-weight: 900;
        }

        .questionTitle strong {
          padding: 6px 10px;
          border: 2px solid
            #4b6876;
          border-radius: 9px;
          background:
            linear-gradient(
              180deg,
              #d9f4ff,
              #8bcce9
            );
        }

        .pointsBox {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 900;
        }

        .pointsBox input {
          width: 94px;
          min-height: 42px;
        }

        .field {
          margin-top: 16px;
        }

        .field label {
          display: block;
          margin-bottom: 7px;
          font-weight: 900;
        }

        .field textarea {
          width: 100%;
          min-height: 150px;
          padding: 15px;
          resize: vertical;
          border: 2px solid
            #647985;
          border-radius: 12px;
          background: #fff;
          font-size: 18px;
          font-weight: 700;
          line-height: 1.45;
          box-shadow:
            inset 0 4px 7px
              rgba(
                46,
                69,
                82,
                0.13
              );
        }

        .visualSection,
        .closedBlock,
        .openBlock {
          margin-top: 18px;
          padding: 16px;
          border: 2px solid
            #586c76;
          border-radius: 15px;
          background:
            linear-gradient(
              180deg,
              #edf3f6,
              #c7d2d8
            );
          box-shadow:
            inset 0 3px 3px
              rgba(
                255,
                255,
                255,
                0.82
              ),
            0 4px 0
              #697b84;
        }

        .visualTitleRow {
          display: flex;
          justify-content:
            space-between;
          gap: 16px;
          align-items:
            flex-start;
        }

        .visualTitleRow p {
          margin: 10px 0 0;
          font-size: 13px;
          font-weight: 700;
        }

        .elementToolbar {
          display: flex;
          flex-wrap: wrap;
          justify-content:
            flex-end;
          gap: 8px;
        }

        .elementToolbar button,
        .blockActions button,
        .selectBlock {
          min-height: 40px;
          padding: 0 12px;
          border: 2px solid
            #405964;
          border-radius: 9px;
          background:
            linear-gradient(
              180deg,
              #fff,
              #ccd6db
            );
          font-weight: 900;
          box-shadow:
            inset 0 2px 2px
              #fff,
            0 3px 0
              #405964;
        }

        .emptyVisual,
        .previewEmpty {
          margin-top: 14px;
          min-height: 90px;
          padding: 20px;
          display: grid;
          place-items: center;
          border: 2px dashed
            #7b8d96;
          border-radius: 12px;
          background:
            rgba(
              255,
              255,
              255,
              0.58
            );
          font-weight: 800;
          text-align: center;
        }

        .visualBlockList {
          margin-top: 14px;
          display: grid;
          gap: 12px;
        }

        .visualBlockCard {
          padding: 12px;
          border: 2px solid
            #6c7e87;
          border-radius: 13px;
          background:
            linear-gradient(
              180deg,
              #fff,
              #e1e7ea
            );
          box-shadow:
            0 3px 0
              #7b8990;
        }

        .visualBlockCard.selected {
          border-color:
            #057cc4;
          box-shadow:
            inset 0 0 0
              2px #5fd0ff,
            0 4px 0
              #0673b3;
        }

        .visualBlockTop {
          display: flex;
          justify-content:
            space-between;
          gap: 10px;
          align-items: center;
        }

        .selectBlock {
          flex: 1;
          text-align: left;
          background:
            linear-gradient(
              180deg,
              #e8f8ff,
              #a9d9ef
            );
        }

        .blockActions {
          display: flex;
          gap: 6px;
        }

        .blockActions button {
          width: 42px;
          padding: 0;
        }

        .deleteTiny {
          color: #fff;
          border-color:
            #6d2626 !important;
          background:
            linear-gradient(
              180deg,
              #ff8a8a,
              #c92c2c
            ) !important;
        }

        .miniPreview {
          margin-top: 10px;
          overflow: hidden;
        }

        .propertyPanel {
          margin-top: 16px;
          padding: 15px;
          border: 2px solid
            #4c626c;
          border-radius: 14px;
          background:
            linear-gradient(
              180deg,
              #f9fbfc,
              #dce4e8
            );
          box-shadow:
            inset 0 3px 2px
              #fff,
            0 4px 0
              #667983;
        }

        .propertyBody {
          margin-top: 14px;
          display: grid;
          gap: 12px;
        }

        .propertyBody label {
          display: grid;
          gap: 6px;
          font-weight: 900;
        }

        .propertyBody input,
        .propertyBody textarea,
        .propertyBody select,
        .pointsBox input {
          width: 100%;
          min-height: 42px;
          padding: 9px 10px;
          border: 2px solid
            #6b7f89;
          border-radius: 9px;
          background: #fff;
        }

        .propertyBody textarea {
          resize: vertical;
        }

        .twoCols,
        .threeCols {
          display: grid;
          gap: 10px;
        }

        .twoCols {
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
        }

        .threeCols {
          grid-template-columns:
            repeat(
              3,
              minmax(0, 1fr)
            );
        }

        .checkLabel {
          display: flex !important;
          align-items: center;
          gap: 8px;
        }

        .checkLabel input,
        .formatChecks input {
          width: auto;
          min-height: auto;
        }

        .formatChecks {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-top: 24px;
        }

        .formatChecks label {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .tableEditorWrap {
          overflow-x: auto;
          padding-bottom: 5px;
        }

        .tableEditor {
          width: 100%;
          border-collapse:
            collapse;
        }

        .tableEditor td {
          min-width: 150px;
          border: 1px solid
            #5e737e;
          padding: 4px;
          background: #fff;
        }

        .tableEditor textarea {
          min-width: 140px;
          border: 0;
          border-radius: 0;
          min-height: 60px;
          padding: 7px;
          outline: none;
        }

        .vennFields {
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
        }

        .fullPreview {
          margin-top: 16px;
          padding: 13px;
          border: 2px solid
            #536975;
          border-radius: 13px;
          background: #fff;
          box-shadow:
            inset 0 4px 7px
              rgba(
                0,
                0,
                0,
                0.08
              );
        }

        .renderedHtml {
          margin-top: 12px;
        }

        .optionRow,
        .answerRow {
          margin-top: 10px;
          display: grid;
          align-items: center;
          gap: 9px;
        }

        .optionRow {
          grid-template-columns:
            50px 52px 1fr;
          padding: 8px;
          border: 2px solid
            #677983;
          border-radius: 12px;
          background:
            linear-gradient(
              180deg,
              #fff,
              #dce3e7
            );
          box-shadow:
            0 3px 0
              #7b8990;
        }

        .optionRow.correct {
          background:
            linear-gradient(
              180deg,
              #e9ffed,
              #91dca2
            );
        }

        .correctSelector,
        .optionLetter,
        .answerNumber {
          width: 46px;
          min-height: 46px;
          border: 2px solid
            #36515e;
          border-radius: 9px;
          display: grid;
          place-items: center;
          font-size: 20px;
          font-weight: 900;
          background:
            linear-gradient(
              180deg,
              #62d2ff,
              #0783cf
            );
          color: #fff;
          box-shadow:
            inset 0 2px 2px
              rgba(
                255,
                255,
                255,
                0.7
              ),
            0 3px 0
              #36515e;
        }

        .correctSelector {
          background:
            linear-gradient(
              180deg,
              #eaffef,
              #67ca80
            );
          color: #153b1f;
        }

        .optionRow input,
        .answerRow input {
          width: 100%;
          min-height: 50px;
          padding: 10px 12px;
          border: 2px solid
            #687b85;
          border-radius: 10px;
          background: #fff;
          font-size: 16px;
          font-weight: 700;
        }

        .answerRow {
          grid-template-columns:
            52px 1fr 48px;
        }

        .removeButton {
          min-height: 46px;
          border: 2px solid
            #692929;
          border-radius: 9px;
          background:
            linear-gradient(
              180deg,
              #ff8f8f,
              #c72d2d
            );
          color: #fff;
          font-size: 22px;
          font-weight: 900;
          box-shadow:
            0 3px 0
              #692929;
        }

        .addAnswerButton {
          margin-top: 12px;
          min-height: 46px;
          padding: 0 16px;
          border: 2px solid
            #315a3c;
          border-radius: 10px;
          background:
            linear-gradient(
              180deg,
              #eaffef,
              #72cf89
            );
          font-weight: 900;
          box-shadow:
            0 3px 0
              #315a3c;
        }

        .helper {
          margin: 10px 0 0;
          font-size: 12px;
          font-weight: 700;
          color: #43545d;
        }

        .errorBox,
        .messageBox {
          margin-top: 16px;
          padding: 13px;
          border: 2px solid;
          border-radius: 10px;
          font-weight: 900;
        }

        .errorBox {
          border-color:
            #8c3c3c;
          background: #ffe5e5;
          color: #7a2020;
        }

        .messageBox {
          border-color:
            #317444;
          background: #e8ffed;
          color: #1c6030;
        }

        .bottomActions {
          margin-top: 18px;
          display: grid;
          grid-template-columns:
            180px 1fr 180px;
          gap: 12px;
        }

        .navButton,
        .saveButton {
          min-height: 54px;
          border: 2px solid
            #29434f;
          border-radius: 11px;
          font-weight: 900;
          box-shadow:
            inset 0 3px 2px
              rgba(
                255,
                255,
                255,
                0.78
              ),
            0 4px 0
              #29434f;
        }

        .navButton {
          background:
            linear-gradient(
              180deg,
              #fff,
              #cbd5da
            );
        }

        .saveButton {
          color: #fff;
          background:
            linear-gradient(
              180deg,
              #60d2ff,
              #0785d1 55%,
              #0567af
            );
          font-size: 17px;
        }

        @media (
          max-width: 1150px
        ) {
          .workspace {
            grid-template-columns:
              1fr;
          }

          .navigator {
            position: static;
          }

          .questionGrid {
            grid-template-columns:
              repeat(
                9,
                minmax(
                  40px,
                  1fr
                )
              );
          }
        }

        @media (
          max-width: 850px
        ) {
          .topHeader,
          .visualTitleRow {
            flex-direction:
              column;
            align-items:
              stretch;
          }

          .stats {
            grid-template-columns:
              repeat(
                2,
                minmax(
                  0,
                  1fr
                )
              );
          }

          .elementToolbar {
            justify-content:
              flex-start;
          }

          .vennFields,
          .twoCols,
          .threeCols {
            grid-template-columns:
              1fr;
          }

          .bottomActions {
            grid-template-columns:
              1fr;
          }
        }

        @media (
          max-width: 600px
        ) {
          .page {
            padding: 10px;
          }

          .questionGrid {
            grid-template-columns:
              repeat(
                5,
                1fr
              );
          }

          .stats {
            grid-template-columns:
              1fr;
          }

          .optionRow {
            grid-template-columns:
              46px 46px 1fr;
          }
        }
      `}</style>
    </main>
  );
}
