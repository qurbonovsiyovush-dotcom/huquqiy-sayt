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
  hasEOL?: boolean;
};

type PositionedText = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
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
  items: PositionedText[];
  highlights: HighlightRect[];
};

type RawQuestionBlock = {
  number: number;
  raw: string;
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
   BASIC HELPERS
========================================================= */

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function normalizeOneLine(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeMultiline(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanPlus(value: string) {
  return value
    .replace(/\(\s*\+\s*\)/g, "")
    .replace(/\s*\+\s*$/g, "")
    .replace(/^\s*\+\s*/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function hasPlusMarker(value: string) {
  return (
    /\+\s*$/.test(value) ||
    /\(\s*\+\s*\)/.test(value) ||
    /^\s*\+\s*/.test(value)
  );
}

function safeQuestionNumber(value: string) {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return null;
  }

  if (n < 1 || n > 5000) {
    return null;
  }

  return Math.trunc(n);
}

/* =========================================================
   PDF TEXT -> NATURAL DOCUMENT STRING
========================================================= */

function textItemsToNaturalText(items: PdfTextItem[]) {
  let output = "";

  for (const item of items) {
    const value =
      typeof item.str === "string"
        ? item.str
        : "";

    if (!value) {
      if (item.hasEOL) {
        output += "\n";
      }

      continue;
    }

    if (
      output &&
      !output.endsWith("\n") &&
      !output.endsWith(" ")
    ) {
      output += " ";
    }

    output += value;

    if (item.hasEOL) {
      output += "\n";
    }
  }

  return normalizeMultiline(output);
}

/* =========================================================
   QUESTION BLOCKS
   IMPORTANT:
   Questions are detected from NATURAL PDF text order,
   NOT from x/y column splitting.
========================================================= */

function buildQuestionBlocks(documentText: string): RawQuestionBlock[] {
  const normalized =
    `\n${documentText.replace(/\r/g, "")}\n`;

  /*
    Question must begin at start of a line.
    This prevents:
      1) ...
      2) ...
    inside a question from becoming separate test questions.
  */
  const regex =
    /^\s*(\d{1,4})[\.\)]\s+(.+)$/gm;

  const starts: {
    number: number;
    index: number;
    bodyStart: number;
  }[] = [];

  let match: RegExpExecArray | null;

  while ((match = regex.exec(normalized)) !== null) {
    const number =
      safeQuestionNumber(match[1]);

    if (number === null) {
      continue;
    }

    /*
      Body starts immediately after "1. " / "1) ".
      match[2] is first line text, but slicing from bodyStart
      preserves the following lines too.
    */
    const prefixMatch =
      match[0].match(/^\s*\d{1,4}[\.\)]\s+/);

    const prefixLength =
      prefixMatch?.[0]?.length ?? 0;

    starts.push({
      number,
      index: match.index,
      bodyStart: match.index + prefixLength,
    });
  }

  const blocks: RawQuestionBlock[] = [];

  for (let i = 0; i < starts.length; i++) {
    const current = starts[i];
    const next = starts[i + 1];

    const end =
      next
        ? next.index
        : normalized.length;

    const raw =
      normalized
        .slice(
          current.bodyStart,
          end
        )
        .trim();

    blocks.push({
      number: current.number,
      raw,
    });
  }

  return blocks;
}

/* =========================================================
   OPTION PARSER
   Supports:
      A) ... B) ...
      C) ... D) ...
   and vertical A/B/C/D.
   Lowercase a)/b) subparts are intentionally ignored.
========================================================= */

function findOptionMarkers(raw: string) {
  /*
    Uppercase only.
    Marker may be:
      start of block
      new line
      whitespace after previous text

    We intentionally do NOT use /i.
  */
  const regex =
    /(^|[\n\r]|[ \t]{1,})([ABCD])[\)\.\-:]\s*/g;

  const markers: {
    label: "A" | "B" | "C" | "D";
    markerStart: number;
    contentStart: number;
  }[] = [];

  let match: RegExpExecArray | null;

  while ((match = regex.exec(raw)) !== null) {
    const leading =
      match[1] ?? "";

    const markerStart =
      match.index + leading.length;

    markers.push({
      label:
        match[2] as
          | "A"
          | "B"
          | "C"
          | "D",
      markerStart,
      contentStart:
        regex.lastIndex,
    });
  }

  return markers;
}

function parseQuestionTextAndOptions(
  block: RawQuestionBlock,
  highlightedLabels: Set<string>
) {
  const markers =
    findOptionMarkers(block.raw);

  /*
    To trust option parsing, we require A/B/C/D to appear
    in sensible order. This avoids accidental A)/B) matches.
  */
  const firstByLabel =
    new Map<
      "A" | "B" | "C" | "D",
      {
        label: "A" | "B" | "C" | "D";
        markerStart: number;
        contentStart: number;
      }
    >();

  for (const marker of markers) {
    if (!firstByLabel.has(marker.label)) {
      firstByLabel.set(marker.label, marker);
    }
  }

  const orderedLabels:
    ("A" | "B" | "C" | "D")[] = [
      "A",
      "B",
      "C",
      "D",
    ];

  const selectedMarkers =
    orderedLabels
      .map((label) => firstByLabel.get(label))
      .filter(
        (
          marker
        ): marker is {
          label: "A" | "B" | "C" | "D";
          markerStart: number;
          contentStart: number;
        } => Boolean(marker)
      )
      .sort(
        (a, b) =>
          a.markerStart - b.markerStart
      );

  const hasSensibleOrder =
    selectedMarkers.length >= 2 &&
    selectedMarkers.every((marker, index) => {
      if (index === 0) {
        return true;
      }

      const prev =
        selectedMarkers[index - 1];

      return (
        orderedLabels.indexOf(marker.label) >
        orderedLabels.indexOf(prev.label)
      );
    });

  if (!hasSensibleOrder) {
    return {
      questionText:
        normalizeMultiline(block.raw),
      options: [] as ImportedOption[],
      warning:
        "A/B/C/D variantlar avtomatik topilmadi. Savolni qo‘lda tekshiring.",
    };
  }

  const questionText =
    normalizeMultiline(
      block.raw.slice(
        0,
        selectedMarkers[0].markerStart
      )
    );

  const parsedOptions: {
    label: "A" | "B" | "C" | "D";
    text: string;
    correctByPlus: boolean;
    correctByHighlight: boolean;
  }[] = [];

  for (
    let index = 0;
    index < selectedMarkers.length;
    index++
  ) {
    const current =
      selectedMarkers[index];

    const next =
      selectedMarkers[index + 1];

    const rawOptionText =
      block.raw.slice(
        current.contentStart,
        next
          ? next.markerStart
          : block.raw.length
      );

    parsedOptions.push({
      label: current.label,
      text:
        normalizeMultiline(
          cleanPlus(rawOptionText)
        ),
      correctByPlus:
        hasPlusMarker(rawOptionText),
      correctByHighlight:
        highlightedLabels.has(
          current.label
        ),
    });
  }

  /*
    + has priority over yellow highlight.
  */
  const plusLabels =
    parsedOptions
      .filter(
        (option) =>
          option.correctByPlus
      )
      .map(
        (option) =>
          option.label
      );

  const highlightLabels =
    parsedOptions
      .filter(
        (option) =>
          option.correctByHighlight
      )
      .map(
        (option) =>
          option.label
      );

  let correctLabel:
    "A" | "B" | "C" | "D" | null =
    null;

  if (plusLabels.length === 1) {
    correctLabel =
      plusLabels[0];
  } else if (
    plusLabels.length === 0 &&
    highlightLabels.length === 1
  ) {
    correctLabel =
      highlightLabels[0];
  }

  const options: ImportedOption[] =
    parsedOptions.map((option) => ({
      id: makeId(
        `q${block.number}-${option.label.toLowerCase()}`
      ),
      label: option.label,
      text: option.text,
      isCorrect:
        option.label === correctLabel,
    }));

  let warning:
    string | undefined;

  const distinctLabels =
    new Set(
      options.map(
        (option) =>
          option.label
      )
    );

  if (distinctLabels.size !== 4) {
    warning =
      `${distinctLabels.size} ta variant topildi. 4 ta variant bo‘lishi kerak.`;
  } else if (
    plusLabels.length > 1
  ) {
    warning =
      "Bir nechta variantda + belgisi topildi. To‘g‘ri javobni tekshiring.";
  } else if (
    plusLabels.length === 0 &&
    highlightLabels.length > 1
  ) {
    warning =
      "Bir nechta sariq variant topildi. To‘g‘ri javobni tekshiring.";
  } else if (!correctLabel) {
    warning =
      "To‘g‘ri javob avtomatik topilmadi. To‘g‘ri variant oxiriga + belgisi qo‘ying yoki admin oynasida belgilang.";
  }

  return {
    questionText,
    options,
    warning,
  };
}

/* =========================================================
   HIGHLIGHT ANNOTATIONS
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

function highlightedOptionLabelsOnPage(
  items: PositionedText[],
  highlights: HighlightRect[]
) {
  const result =
    new Set<string>();

  for (const highlight of highlights) {
    const intersecting =
      items
        .filter((item) => {
          const itemRect = {
            x1: item.x,
            y1:
              item.y -
              item.height * 0.35,
            x2:
              item.x +
              item.width,
            y2:
              item.y +
              item.height,
          };

          return rectIntersects(
            itemRect,
            highlight
          );
        })
        .sort((a, b) => {
          const dy =
            Math.abs(
              a.y - b.y
            );

          if (dy > 4) {
            return b.y - a.y;
          }

          return a.x - b.x;
        });

    const text =
      normalizeOneLine(
        intersecting
          .map(
            (item) =>
              item.text
          )
          .join(" ")
      );

    const match =
      text.match(
        /(?:^|\s)([ABCD])[\)\.\-:]/
      );

    if (match) {
      result.add(
        match[1]
      );
    }
  }

  return result;
}

/* =========================================================
   POSITIONED ITEMS
========================================================= */

function buildPositionedItems(
  textItems: PdfTextItem[],
  pageNumber: number
): PositionedText[] {
  return textItems
    .filter(
      (item) =>
        typeof item.str ===
          "string" &&
        item.str.trim()
    )
    .map((item) => {
      const transform =
        item.transform ?? [
          1, 0, 0, 1, 0, 0,
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
}

/* =========================================================
   IMAGE / DIAGRAM DETECTION
   Conservative:
   only crop when we can confidently locate:
   question start -> option A on same page,
   and there is a large vertical gap.
========================================================= */

function findQuestionVisualBounds(
  pageInfo: PageInfo,
  questionNumberValue: number
) {
  const items =
    [...pageInfo.items].sort(
      (a, b) => {
        const dy =
          b.y - a.y;

        if (
          Math.abs(dy) > 4
        ) {
          return dy;
        }

        return a.x - b.x;
      }
    );

  const qRegex =
    new RegExp(
      `^${questionNumberValue}[\\.\\)]$|^${questionNumberValue}[\\.\\)]\\s`
    );

  let questionStart:
    PositionedText | null =
    null;

  for (const item of items) {
    if (
      qRegex.test(
        item.text.trim()
      )
    ) {
      questionStart =
        item;
      break;
    }
  }

  if (!questionStart) {
    return null;
  }

  /*
    Find A) below/after question start, reasonably near same x region.
  */
  const optionA =
    items.find(
      (item) => {
        if (
          !/^A[\)\.\-:]$|^A[\)\.\-:]\s/.test(
            item.text.trim()
          )
        ) {
          return false;
        }

        return (
          item.y <
          questionStart!.y
        );
      }
    ) ?? null;

  if (!optionA) {
    return null;
  }

  return {
    questionStart,
    optionA,
  };
}

async function renderQuestionImage(
  pageInfo: PageInfo,
  questionNumberValue: number
) {
  const bounds =
    findQuestionVisualBounds(
      pageInfo,
      questionNumberValue
    );

  if (!bounds) {
    return undefined;
  }

  const {
    questionStart,
    optionA,
  } = bounds;

  /*
    Huge gap only.
    Regular text questions should NOT get accidental screenshots.
  */
  const gap =
    questionStart.y -
    optionA.y;

  if (gap < 120) {
    return undefined;
  }

  const viewport =
    pageInfo.page.getViewport({
      scale: 1.55,
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

  /*
    Crop BELOW question start and ABOVE option A.
    We leave margins so diagram/table is preserved.
  */
  const upperPdfY =
    questionStart.y - 18;

  const lowerPdfY =
    optionA.y + 18;

  const topCanvas =
    viewport.height -
    upperPdfY *
      scaleY;

  const bottomCanvas =
    viewport.height -
    lowerPdfY *
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

  if (cropHeight < 55) {
    return undefined;
  }

  /*
    Use x position to guess whether question belongs to left/right column.
    This is ONLY for image cropping, not for text parsing.
  */
  const pageMiddle =
    pageInfo.width / 2;

  let pdfX1 = 12;
  let pdfX2 =
    pageInfo.width - 12;

  if (
    questionStart.x <
    pageMiddle * 0.75
  ) {
    pdfX1 = 10;
    pdfX2 =
      pageMiddle - 5;
  } else if (
    questionStart.x >
    pageMiddle * 0.9
  ) {
    pdfX1 =
      pageMiddle + 5;
    pdfX2 =
      pageInfo.width - 10;
  }

  const cropX =
    Math.max(
      0,
      Math.floor(
        pdfX1 *
          scaleX
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
   PAGE LOOKUP FOR QUESTION IMAGE
========================================================= */

function findPageForQuestion(
  pageInfos: Map<number, PageInfo>,
  questionNumberValue: number
) {
  const startRegex =
    new RegExp(
      `^${questionNumberValue}[\\.\\)]$|^${questionNumberValue}[\\.\\)]\\s`
    );

  for (
    const [
      pageNumber,
      pageInfo,
    ] of pageInfos
  ) {
    const found =
      pageInfo.items.some(
        (item) =>
          startRegex.test(
            item.text.trim()
          )
      );

    if (found) {
      return {
        pageNumber,
        pageInfo,
      };
    }
  }

  return null;
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
      Vercel PDF.js worker fix
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

    const pageInfos =
      new Map<
        number,
        PageInfo
      >();

    const documentTextParts:
      string[] = [];

    const allHighlightedLabels =
      new Set<string>();

    /* ---------------------------------------------------------
       READ PDF IN NATIVE CONTENT ORDER
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

      const textContent =
        await page.getTextContent();

      const rawItems =
        textContent.items as PdfTextItem[];

      const pageText =
        textItemsToNaturalText(
          rawItems
        );

      documentTextParts.push(
        pageText
      );

      const positionedItems =
        buildPositionedItems(
          rawItems,
          pageNumber
        );

      const highlights =
        await pageHighlights(
          page
        );

      const pageHighlightedLabels =
        highlightedOptionLabelsOnPage(
          positionedItems,
          highlights
        );

      for (
        const label of
        pageHighlightedLabels
      ) {
        allHighlightedLabels.add(
          label
        );
      }

      pageInfos.set(
        pageNumber,
        {
          page,
          width:
            viewport.width,
          height:
            viewport.height,
          items:
            positionedItems,
          highlights,
        }
      );
    }

    const documentText =
      documentTextParts.join(
        "\n"
      );

    /* ---------------------------------------------------------
       QUESTIONS
    --------------------------------------------------------- */

    const rawBlocks =
      buildQuestionBlocks(
        documentText
      );

    const importedQuestions:
      ImportedQuestion[] =
      [];

    for (
      const block of rawBlocks
    ) {
      /*
        Highlight fallback is intentionally conservative:
        we only trust it globally when it identifies one label.
        + remains the primary answer marker.
      */
      const highlightLabelsForQuestion =
        allHighlightedLabels.size === 1
          ? allHighlightedLabels
          : new Set<string>();

      const parsed =
        parseQuestionTextAndOptions(
          block,
          highlightLabelsForQuestion
        );

      let imageSrc:
        string | undefined;

      const pageMatch =
        findPageForQuestion(
          pageInfos,
          block.number
        );

      if (pageMatch) {
        try {
          imageSrc =
            await renderQuestionImage(
              pageMatch.pageInfo,
              block.number
            );
        } catch (error) {
          console.error(
            `QUESTION IMAGE ${block.number} ERROR:`,
            error
          );

          imageSrc =
            undefined;
        }
      }

      importedQuestions.push({
        id: makeId(
          `import-q${block.number}`
        ),
        number:
          block.number,
        questionText:
          parsed.questionText,
        options:
          parsed.options,
        imageSrc,
        warning:
          parsed.warning,
      });
    }

    /* ---------------------------------------------------------
       CLEAN DUPLICATES
       Keep the first valid occurrence of each question number.
    --------------------------------------------------------- */

    const unique =
      new Map<
        number,
        ImportedQuestion
      >();

    for (
      const question of
      importedQuestions
    ) {
      const existing =
        unique.get(
          question.number
        );

      if (!existing) {
        unique.set(
          question.number,
          question
        );

        continue;
      }

      /*
        If duplicate exists, prefer one with more valid options.
      */
      if (
        question.options.length >
        existing.options.length
      ) {
        unique.set(
          question.number,
          question
        );
      }
    }

    const finalQuestions =
      [...unique.values()].sort(
        (a, b) =>
          a.number - b.number
      );

    if (
      finalQuestions.length ===
      0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "PDFdan test savollari topilmadi. Savollar alohida satrda 1. yoki 1) ko‘rinishida boshlanishini tekshiring.",
        },
        {
          status: 422,
        }
      );
    }

    /* ---------------------------------------------------------
       CLEANUP
    --------------------------------------------------------- */

    for (
      const pageInfo of
      pageInfos.values()
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
        finalQuestions,
      total:
        finalQuestions.length,
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
