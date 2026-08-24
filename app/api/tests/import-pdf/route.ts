import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createCanvas } from "@napi-rs/canvas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* =========================================================
   TYPES
========================================================= */

type ImportedOption = {
  id: string;
  label: "A" | "B" | "C" | "D";
  text: string;
  isCorrect: boolean;
};

type ImportedQuestion = {
  id: string;
  number: number;
  questionText: string;
  options: ImportedOption[];
  imageSrc?: string;
  warning?: string;
};

type PdfTextItem = {
  str: string;
  transform: number[];
  width?: number;
  height?: number;
};

type PositionedText = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
};

type TextLine = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
  column: "left" | "right" | "full";
};

type HighlightRect = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

type PageInfo = {
  page: any;
  width: number;
  height: number;
  highlights: HighlightRect[];
};

type QuestionBlock = {
  number: number;
  lines: TextLine[];
};

/* =========================================================
   ADMIN
========================================================= */

async function isAdmin() {
  const cookieStore = await cookies();

  return (
    cookieStore.get("qurbonov_role")?.value === "admin"
  );
}

/* =========================================================
   HELPERS
========================================================= */

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function normalizeSpace(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanPlus(value: string) {
  return value
    .replace(/\(\s*\+\s*\)/g, "")
    .replace(/\s*\+\s*$/g, "")
    .replace(/^\s*\+\s*/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function hasPlusMarker(value: string) {
  return (
    /\+\s*$/.test(value) ||
    /\(\s*\+\s*\)/.test(value) ||
    /^\s*\+\s*[ABCD][\)\.\-:]/.test(value)
  );
}

function isQuestionStart(value: string) {
  return /^\s*\d{1,4}[\.\)]\s+\S/.test(value);
}

function questionNumber(value: string) {
  const match = value.match(/^\s*(\d{1,4})[\.\)]\s+/);

  return match
    ? Number(match[1])
    : null;
}

function stripQuestionNumber(value: string) {
  return value
    .replace(/^\s*\d{1,4}[\.\)]\s+/, "")
    .trim();
}

function optionLabelFromStart(
  value: string
): "A" | "B" | "C" | "D" | null {
  const match = value.match(
    /^\s*([ABCD])[\)\.\-:]\s*/ // CASE-SENSITIVE intentionally
  );

  if (!match) {
    return null;
  }

  return match[1] as "A" | "B" | "C" | "D";
}

function stripOptionPrefix(value: string) {
  return value
    .replace(/^\s*[ABCD][\)\.\-:]\s*/, "")
    .trim();
}

function rectIntersects(
  a: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  },
  b: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }
) {
  return !(
    a.x2 < b.x1 ||
    a.x1 > b.x2 ||
    a.y2 < b.y1 ||
    a.y1 > b.y2
  );
}

function lineIsHighlighted(
  line: TextLine,
  highlights: HighlightRect[]
) {
  const lineRect = {
    x1: line.x - 3,
    y1: line.y - line.height * 0.4,
    x2: line.x + line.width + 3,
    y2: line.y + line.height * 1.05,
  };

  return highlights.some((highlight) =>
    rectIntersects(lineRect, highlight)
  );
}

/* =========================================================
   PDF HIGHLIGHT ANNOTATIONS
========================================================= */

async function pageHighlights(
  page: any
): Promise<HighlightRect[]> {
  try {
    const annotations =
      await page.getAnnotations({
        intent: "display",
      });

    const result: HighlightRect[] = [];

    for (const annotation of annotations) {
      if (
        annotation?.subtype !== "Highlight" &&
        annotation?.annotationType !== 9
      ) {
        continue;
      }

      const quadPoints =
        Array.isArray(annotation?.quadPoints)
          ? annotation.quadPoints
          : null;

      if (
        quadPoints &&
        quadPoints.length >= 8
      ) {
        for (
          let index = 0;
          index + 7 < quadPoints.length;
          index += 8
        ) {
          const xs = [
            quadPoints[index],
            quadPoints[index + 2],
            quadPoints[index + 4],
            quadPoints[index + 6],
          ];

          const ys = [
            quadPoints[index + 1],
            quadPoints[index + 3],
            quadPoints[index + 5],
            quadPoints[index + 7],
          ];

          result.push({
            x1: Math.min(...xs),
            y1: Math.min(...ys),
            x2: Math.max(...xs),
            y2: Math.max(...ys),
          });
        }

        continue;
      }

      if (
        Array.isArray(annotation?.rect) &&
        annotation.rect.length >= 4
      ) {
        const [
          x1,
          y1,
          x2,
          y2,
        ] = annotation.rect;

        result.push({
          x1: Math.min(x1, x2),
          y1: Math.min(y1, y2),
          x2: Math.max(x1, x2),
          y2: Math.max(y1, y2),
        });
      }
    }

    return result;
  } catch (error) {
    console.error(
      "HIGHLIGHT READ ERROR:",
      error
    );

    return [];
  }
}

/* =========================================================
   TEXT LINES
========================================================= */

function buildLines(
  items: PositionedText[],
  column: "left" | "right" | "full"
): TextLine[] {
  const sorted =
    [...items].sort((a, b) => {
      const dy = b.y - a.y;

      if (Math.abs(dy) > 4) {
        return dy;
      }

      return a.x - b.x;
    });

  const groups: PositionedText[][] = [];

  for (const item of sorted) {
    const existing =
      groups.find((group) => {
        const avgY =
          group.reduce(
            (sum, part) =>
              sum + part.y,
            0
          ) / group.length;

        return (
          Math.abs(
            avgY - item.y
          ) <=
          Math.max(
            3.5,
            item.height * 0.4
          )
        );
      });

    if (existing) {
      existing.push(item);
    } else {
      groups.push([item]);
    }
  }

  return groups
    .map((group) => {
      group.sort(
        (a, b) =>
          a.x - b.x
      );

      let text = "";
      let previousEnd = 0;

      for (const item of group) {
        const gap =
          item.x -
          previousEnd;

        if (
          text &&
          gap >
            Math.max(
              2.5,
              item.height * 0.2
            )
        ) {
          text += " ";
        }

        text += item.text;

        previousEnd =
          item.x +
          item.width;
      }

      const x =
        Math.min(
          ...group.map(
            (item) => item.x
          )
        );

      const y =
        group.reduce(
          (sum, item) =>
            sum + item.y,
          0
        ) / group.length;

      const right =
        Math.max(
          ...group.map(
            (item) =>
              item.x +
              item.width
          )
        );

      const height =
        Math.max(
          ...group.map(
            (item) =>
              item.height
          )
        );

      return {
        text:
          normalizeSpace(text),
        x,
        y,
        width:
          right - x,
        height,
        pageNumber:
          group[0]
            .pageNumber,
        column,
      } satisfies TextLine;
    })
    .filter(
      (line) =>
        line.text
    )
    .sort((a, b) => {
      const dy =
        b.y - a.y;

      if (
        Math.abs(dy) > 3
      ) {
        return dy;
      }

      return a.x - b.x;
    });
}

/* =========================================================
   TWO-COLUMN DETECTION
========================================================= */

function splitIntoColumns(
  items: PositionedText[],
  pageWidth: number
) {
  /*
    PDFda haqiqiy 2 ustun bo‘lsa, elementlar chap va o‘ngda
    aniq guruhlanadi. Markazdan ozgina "dead zone" qoldiramiz.
  */
  const middle = pageWidth / 2;
  const deadZone = Math.max(18, pageWidth * 0.035);

  const left =
    items.filter(
      (item) =>
        item.x +
          item.width / 2 <
        middle - deadZone
    );

  const right =
    items.filter(
      (item) =>
        item.x +
          item.width / 2 >
        middle + deadZone
    );

  const center =
    items.filter(
      (item) =>
        item.x +
          item.width / 2 >=
          middle - deadZone &&
        item.x +
          item.width / 2 <=
          middle + deadZone
    );

  /*
    Sarlavha kabi markazdan o‘tadigan uzun satrlarni alohida
    full-width line sifatida saqlaymiz.
  */
  const wideCenter =
    center.filter(
      (item) =>
        item.width >
        pageWidth * 0.35
    );

  const looksTwoColumn =
    left.length >= 6 &&
    right.length >= 6;

  if (!looksTwoColumn) {
    return {
      twoColumn: false,
      left: items,
      right: [] as PositionedText[],
      full: [] as PositionedText[],
    };
  }

  return {
    twoColumn: true,
    left,
    right,
    full: wideCenter,
  };
}

/* =========================================================
   INLINE OPTIONS:
   A) ... B) ...
   C) ... D) ...
========================================================= */

function splitInlineOptions(
  line: TextLine
): {
  label: "A" | "B" | "C" | "D";
  text: string;
  sourceLine: TextLine;
}[] {
  const value = line.text;

  /*
    Uppercase A-D only.
    This intentionally does NOT match lowercase a)/b) subparts.
  */
  const regex =
    /(^|\s)([ABCD])[\)\.\-:]\s*/g;

  const matches: {
    index: number;
    end: number;
    label: "A" | "B" | "C" | "D";
  }[] = [];

  let match:
    RegExpExecArray | null;

  while (
    (match =
      regex.exec(value)) !==
    null
  ) {
    const prefixLength =
      match[1]?.length ?? 0;

    const actualIndex =
      match.index +
      prefixLength;

    matches.push({
      index:
        actualIndex,
      end:
        regex.lastIndex,
      label:
        match[2] as
          | "A"
          | "B"
          | "C"
          | "D",
    });
  }

  if (
    matches.length === 0
  ) {
    return [];
  }

  return matches.map(
    (current, index) => {
      const next =
        matches[index + 1];

      const text =
        value
          .slice(
            current.end,
            next
              ? next.index
              : value.length
          )
          .trim();

      return {
        label:
          current.label,
        text,
        sourceLine:
          line,
      };
    }
  );
}

/* =========================================================
   GLOBAL QUESTION BLOCKS
========================================================= */

function buildQuestionBlocks(
  lines: TextLine[]
): QuestionBlock[] {
  const blocks:
    QuestionBlock[] = [];

  let current:
    QuestionBlock | null =
    null;

  for (const line of lines) {
    if (
      isQuestionStart(
        line.text
      )
    ) {
      if (current) {
        blocks.push(
          current
        );
      }

      current = {
        number:
          questionNumber(
            line.text
          ) ?? 0,
        lines: [line],
      };

      continue;
    }

    if (current) {
      current.lines.push(
        line
      );
    }
  }

  if (current) {
    blocks.push(current);
  }

  return blocks;
}

/* =========================================================
   PARSE ONE QUESTION
========================================================= */

function parseQuestionBlock(
  block: QuestionBlock,
  pageInfos: Map<number, PageInfo>
) {
  const questionParts:
    string[] = [];

  const optionsMap =
    new Map<
      "A" | "B" | "C" | "D",
      {
        label:
          | "A"
          | "B"
          | "C"
          | "D";
        text: string;
        correctByPlus: boolean;
        correctByHighlight: boolean;
        sourceLine: TextLine;
      }
    >();

  let optionMode = false;
  let currentOption:
    | "A"
    | "B"
    | "C"
    | "D"
    | null = null;

  let firstOptionLine:
    TextLine | null =
    null;

  let lastQuestionLine:
    TextLine | null =
    null;

  for (
    let index = 0;
    index <
    block.lines.length;
    index++
  ) {
    const line =
      block.lines[index];

    const lineText =
      index === 0
        ? stripQuestionNumber(
            line.text
          )
        : line.text;

    const inline =
      splitInlineOptions({
        ...line,
        text: lineText,
      });

    if (
      inline.length > 0
    ) {
      optionMode = true;

      if (
        !firstOptionLine
      ) {
        firstOptionLine =
          line;
      }

      for (
        const part of inline
      ) {
        const pageInfo =
          pageInfos.get(
            line.pageNumber
          );

        const plus =
          hasPlusMarker(
            part.text
          ) ||
          hasPlusMarker(
            line.text
          );

        const highlight =
          pageInfo
            ? lineIsHighlighted(
                line,
                pageInfo.highlights
              )
            : false;

        const cleaned =
          cleanPlus(
            part.text
          );

        const previous =
          optionsMap.get(
            part.label
          );

        if (previous) {
          previous.text =
            normalizeSpace(
              `${previous.text} ${cleaned}`
            );

          previous.correctByPlus =
            previous.correctByPlus ||
            plus;

          previous.correctByHighlight =
            previous.correctByHighlight ||
            highlight;
        } else {
          optionsMap.set(
            part.label,
            {
              label:
                part.label,
              text:
                cleaned,
              correctByPlus:
                plus,
              correctByHighlight:
                highlight,
              sourceLine:
                part.sourceLine,
            }
          );
        }

        currentOption =
          part.label;
      }

      continue;
    }

    const directLabel =
      optionLabelFromStart(
        lineText
      );

    if (directLabel) {
      optionMode = true;
      currentOption =
        directLabel;

      if (
        !firstOptionLine
      ) {
        firstOptionLine =
          line;
      }

      const raw =
        stripOptionPrefix(
          lineText
        );

      const pageInfo =
        pageInfos.get(
          line.pageNumber
        );

      const plus =
        hasPlusMarker(raw) ||
        hasPlusMarker(
          lineText
        );

      const highlight =
        pageInfo
          ? lineIsHighlighted(
              line,
              pageInfo.highlights
            )
          : false;

      optionsMap.set(
        directLabel,
        {
          label:
            directLabel,
          text:
            cleanPlus(raw),
          correctByPlus:
            plus,
          correctByHighlight:
            highlight,
          sourceLine:
            line,
        }
      );

      continue;
    }

    if (
      optionMode &&
      currentOption
    ) {
      const current =
        optionsMap.get(
          currentOption
        );

      if (current) {
        current.text =
          normalizeSpace(
            `${current.text} ${cleanPlus(lineText)}`
          );

        if (
          hasPlusMarker(
            lineText
          )
        ) {
          current.correctByPlus =
            true;
        }

        const pageInfo =
          pageInfos.get(
            line.pageNumber
          );

        if (
          pageInfo &&
          lineIsHighlighted(
            line,
            pageInfo.highlights
          )
        ) {
          current.correctByHighlight =
            true;
        }
      }

      continue;
    }

    questionParts.push(
      lineText
    );

    lastQuestionLine =
      line;
  }

  const labels:
    (
      | "A"
      | "B"
      | "C"
      | "D"
    )[] = [
      "A",
      "B",
      "C",
      "D",
    ];

  /*
    PRIORITY:
    1) + marker
    2) PDF highlight
    3) manual admin review
  */
  const plusCorrectLabels =
    labels.filter(
      (label) =>
        optionsMap.get(
          label
        )?.correctByPlus
    );

  const highlightedLabels =
    labels.filter(
      (label) =>
        optionsMap.get(
          label
        )
          ?.correctByHighlight
    );

  const correctLabel =
    plusCorrectLabels.length ===
    1
      ? plusCorrectLabels[0]
      : plusCorrectLabels.length >
          1
        ? null
        : highlightedLabels.length ===
            1
          ? highlightedLabels[0]
          : null;

  const options:
    ImportedOption[] =
    labels.map(
      (label) => {
        const found =
          optionsMap.get(
            label
          );

        return {
          id: makeId(
            `q${block.number}-${label.toLowerCase()}`
          ),
          label,
          text:
            found?.text ??
            "",
          isCorrect:
            correctLabel ===
            label,
        };
      }
    );

  let warning:
    string | undefined;

  const foundCount =
    labels.filter(
      (label) =>
        optionsMap.has(
          label
        )
    ).length;

  if (
    foundCount !== 4
  ) {
    warning =
      `${foundCount} ta variant topildi. 4 ta variant bo‘lishi kerak.`;
  } else if (
    plusCorrectLabels.length >
    1
  ) {
    warning =
      "Bir nechta variantda + belgisi topildi. To‘g‘ri javobni tekshiring.";
  } else if (
    plusCorrectLabels.length ===
      0 &&
    highlightedLabels.length >
      1
  ) {
    warning =
      "Bir nechta sariq variant topildi. To‘g‘ri javobni tekshiring.";
  } else if (
    !correctLabel
  ) {
    warning =
      "To‘g‘ri javob avtomatik topilmadi. To‘g‘ri variant oxiriga + belgisi qo‘ying yoki admin oynasida belgilang.";
  }

  return {
    number:
      block.number,
    questionText:
      normalizeSpace(
        questionParts.join(
          "\n"
        )
      ),
    options,
    warning,
    firstOptionLine,
    lastQuestionLine,
  };
}

/* =========================================================
   QUESTION IMAGE / DIAGRAM CROP
========================================================= */

async function renderQuestionImage(
  pageInfo: PageInfo,
  firstOptionLine: TextLine | null,
  lastQuestionLine: TextLine | null
) {
  if (
    !firstOptionLine ||
    !lastQuestionLine
  ) {
    return undefined;
  }

  if (
    firstOptionLine.pageNumber !==
    lastQuestionLine.pageNumber
  ) {
    return undefined;
  }

  const upperY =
    lastQuestionLine.y;

  const lowerY =
    firstOptionLine.y;

  const gap =
    upperY - lowerY;

  /*
    Matn bilan variantlar orasida sezilarli katta bo‘shliq:
    rasm / jadval / diagramma bo‘lishi mumkin.
  */
  if (gap < 48) {
    return undefined;
  }

  const viewport =
    pageInfo.page.getViewport({
      scale: 1.6,
    });

  const canvas =
    createCanvas(
      Math.ceil(
        viewport.width
      ),
      Math.ceil(
        viewport.height
      )
    );

  const context =
    canvas.getContext(
      "2d"
    );

  await pageInfo.page
    .render({
      canvasContext:
        context,
      viewport,
    })
    .promise;

  const scaleX =
    viewport.width /
    pageInfo.width;

  const scaleY =
    viewport.height /
    pageInfo.height;

  const topPdfY =
    upperY - 10;

  const bottomPdfY =
    lowerY + 10;

  const topCanvas =
    viewport.height -
    topPdfY * scaleY;

  const bottomCanvas =
    viewport.height -
    bottomPdfY *
      scaleY;

  const cropTop =
    Math.max(
      0,
      Math.floor(
        Math.min(
          topCanvas,
          bottomCanvas
        )
      )
    );

  const cropBottom =
    Math.min(
      viewport.height,
      Math.ceil(
        Math.max(
          topCanvas,
          bottomCanvas
        )
      )
    );

  const cropHeight =
    cropBottom -
    cropTop;

  if (
    cropHeight < 40
  ) {
    return undefined;
  }

  /*
    Savol qaysi ustunda bo‘lsa, shu ustunni crop qilamiz.
  */
  const column =
    firstOptionLine.column;

  let pdfX1 = 18;
  let pdfX2 =
    pageInfo.width - 18;

  if (
    column === "left"
  ) {
    pdfX1 = 12;
    pdfX2 =
      pageInfo.width /
        2 -
      6;
  } else if (
    column === "right"
  ) {
    pdfX1 =
      pageInfo.width /
        2 +
      6;

    pdfX2 =
      pageInfo.width -
      12;
  }

  const cropX =
    Math.max(
      0,
      Math.floor(
        pdfX1 * scaleX
      )
    );

  const cropWidth =
    Math.max(
      1,
      Math.min(
        viewport.width -
          cropX,
        Math.ceil(
          (pdfX2 -
            pdfX1) *
            scaleX
        )
      )
    );

  const output =
    createCanvas(
      cropWidth,
      cropHeight
    );

  const outputContext =
    output.getContext(
      "2d"
    );

  outputContext.fillStyle =
    "#ffffff";

  outputContext.fillRect(
    0,
    0,
    output.width,
    output.height
  );

  outputContext.drawImage(
    canvas,
    cropX,
    cropTop,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight
  );

  const png =
    await output.encode(
      "png"
    );

  return `data:image/png;base64,${png.toString("base64")}`;
}

/* =========================================================
   POST
========================================================= */

export async function POST(
  request: NextRequest
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        {
          success: false,
          message:
            "PDF import faqat administrator uchun.",
        },
        {
          status: 403,
        }
      );
    }

    const formData =
      await request.formData();

    const file =
      formData.get(
        "file"
      );

    if (
      !(file instanceof File)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "PDF fayl topilmadi.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      file.type !==
        "application/pdf" &&
      !file.name
        .toLowerCase()
        .endsWith(".pdf")
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Faqat PDF fayl yuklash mumkin.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      file.size >
      30 * 1024 * 1024
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "PDF hajmi 30 MB dan oshmasligi kerak.",
        },
        {
          status: 400,
        }
      );
    }

    const bytes =
      new Uint8Array(
        await file.arrayBuffer()
      );

    const pdfjs =
      await import(
        "pdfjs-dist/legacy/build/pdf.mjs"
      );

    /*
      Vercel worker fix
    */
    const {
      pathToFileURL,
    } = await import(
      "node:url"
    );

    const path =
      await import(
        "node:path"
      );

    pdfjs.GlobalWorkerOptions.workerSrc =
      pathToFileURL(
        path.join(
          process.cwd(),
          "node_modules",
          "pdfjs-dist",
          "legacy",
          "build",
          "pdf.worker.mjs"
        )
      ).href;

    const document =
      await pdfjs
        .getDocument({
          data: bytes,
          useSystemFonts:
            true,
          disableFontFace:
            false,
        })
        .promise;

    const allLines:
      TextLine[] = [];

    const pageInfos =
      new Map<
        number,
        PageInfo
      >();

    /* ---------------------------------------------------------
       EVERY PAGE
    --------------------------------------------------------- */

    for (
      let pageNumber = 1;
      pageNumber <=
      document.numPages;
      pageNumber++
    ) {
      const page =
        await document.getPage(
          pageNumber
        );

      const viewport =
        page.getViewport({
          scale: 1,
        });

      const highlights =
        await pageHighlights(
          page
        );

      pageInfos.set(
        pageNumber,
        {
          page,
          width:
            viewport.width,
          height:
            viewport.height,
          highlights,
        }
      );

      const textContent =
        await page.getTextContent();

      const positionedItems:
        PositionedText[] =
        (
          textContent.items as
            PdfTextItem[]
        )
          .filter(
            (item) =>
              typeof item.str ===
                "string" &&
              item.str.trim()
          )
          .map((item) => {
            const transform =
              item.transform ??
              [
                1,
                0,
                0,
                1,
                0,
                0,
              ];

            return {
              text:
                item.str.trim(),

              x:
                Number(
                  transform[4]
                ) || 0,

              y:
                Number(
                  transform[5]
                ) || 0,

              width:
                Math.max(
                  1,
                  Number(
                    item.width
                  ) || 1
                ),

              height:
                Math.max(
                  8,
                  Math.abs(
                    Number(
                      transform[3]
                    ) || 0
                  )
                ),

              pageNumber,
            };
          });

      const columns =
        splitIntoColumns(
          positionedItems,
          viewport.width
        );

      /*
        Reading order:
        FULL heading → LEFT column → RIGHT column
      */
      if (
        columns.full.length >
        0
      ) {
        allLines.push(
          ...buildLines(
            columns.full,
            "full"
          )
        );
      }

      if (
        columns.twoColumn
      ) {
        allLines.push(
          ...buildLines(
            columns.left,
            "left"
          )
        );

        allLines.push(
          ...buildLines(
            columns.right,
            "right"
          )
        );
      } else {
        allLines.push(
          ...buildLines(
            columns.left,
            "full"
          )
        );
      }
    }

    /* ---------------------------------------------------------
       GLOBAL BLOCKS
    --------------------------------------------------------- */

    const blocks =
      buildQuestionBlocks(
        allLines
      );

    const importedQuestions:
      ImportedQuestion[] =
      [];

    for (
      const block of blocks
    ) {
      const parsed =
        parseQuestionBlock(
          block,
          pageInfos
        );

      let imageSrc:
        string | undefined;

      if (
        parsed.firstOptionLine &&
        parsed.lastQuestionLine &&
        parsed.firstOptionLine.pageNumber ===
          parsed.lastQuestionLine.pageNumber
      ) {
        const pageInfo =
          pageInfos.get(
            parsed.firstOptionLine.pageNumber
          );

        if (pageInfo) {
          imageSrc =
            await renderQuestionImage(
              pageInfo,
              parsed.firstOptionLine,
              parsed.lastQuestionLine
            );
        }
      }

      importedQuestions.push({
        id:
          makeId(
            `import-q${parsed.number}`
          ),

        number:
          parsed.number,

        questionText:
          parsed.questionText,

        options:
          parsed.options,

        imageSrc,

        warning:
          parsed.warning,
      });
    }

    /*
      Number order.
      NOTE: two-column PDFs normally have sequential numbering.
    */
    importedQuestions.sort(
      (a, b) =>
        a.number -
        b.number
    );

    const seen =
      new Set<number>();

    for (
      const question of importedQuestions
    ) {
      if (
        seen.has(
          question.number
        )
      ) {
        question.warning =
          question.warning ||
          "Savol raqami takrorlangan. Tekshirib chiqing.";
      }

      seen.add(
        question.number
      );
    }

    if (
      importedQuestions.length ===
      0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "PDFdan test savollari topilmadi. Savollar 1. yoki 1) ko‘rinishida boshlanishini tekshiring.",
        },
        {
          status: 422,
        }
      );
    }

    /*
      PDF.js page objectlarini eng oxirida cleanup qilamiz,
      chunki rasm crop qilishda ular kerak bo‘ladi.
    */
    for (
      const pageInfo of pageInfos.values()
    ) {
      try {
        pageInfo.page.cleanup();
      } catch {
        // ignore
      }
    }

    document.cleanup();
    document.destroy();

    return NextResponse.json({
      success: true,
      questions:
        importedQuestions,
      total:
        importedQuestions.length,
    });
  } catch (error) {
    console.error(
      "PDF TEST IMPORT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "PDFni tahlil qilishda server xatosi yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}
