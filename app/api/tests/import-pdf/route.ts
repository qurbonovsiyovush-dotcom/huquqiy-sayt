import { NextRequest, NextResponse } from "next/server";
import { createCanvas } from "@napi-rs/canvas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
};

type TextLine = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type HighlightRect = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

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
    .trim();
}

function optionLabel(value: string):
  | "A"
  | "B"
  | "C"
  | "D"
  | null {
  const match = value.match(/^\s*([ABCD])[\)\.\-:]\s*/i);

  if (!match) return null;

  return match[1].toUpperCase() as "A" | "B" | "C" | "D";
}

function stripOptionPrefix(value: string) {
  return value.replace(/^\s*[ABCD][\)\.\-:]\s*/i, "").trim();
}

function isQuestionStart(value: string) {
  return /^\s*\d{1,4}[\.\)]\s+\S/.test(value);
}

function questionNumber(value: string) {
  const match = value.match(/^\s*(\d{1,4})[\.\)]\s+/);
  return match ? Number(match[1]) : null;
}

function stripQuestionNumber(value: string) {
  return value.replace(/^\s*\d{1,4}[\.\)]\s+/, "").trim();
}

function buildLines(items: PositionedText[]) {
  const sorted = [...items].sort((a, b) => {
    const dy = b.y - a.y;

    if (Math.abs(dy) > 4) {
      return dy;
    }

    return a.x - b.x;
  });

  const groups: PositionedText[][] = [];

  for (const item of sorted) {
    const existing = groups.find((group) => {
      const avgY =
        group.reduce((sum, part) => sum + part.y, 0) / group.length;

      return Math.abs(avgY - item.y) <= Math.max(3.5, item.height * 0.35);
    });

    if (existing) {
      existing.push(item);
    } else {
      groups.push([item]);
    }
  }

  const lines: TextLine[] = groups.map((group) => {
    group.sort((a, b) => a.x - b.x);

    let text = "";
    let previousEnd = 0;

    for (const item of group) {
      const gap = item.x - previousEnd;

      if (text && gap > Math.max(2.5, item.height * 0.18)) {
        text += " ";
      }

      text += item.text;
      previousEnd = item.x + item.width;
    }

    const x = Math.min(...group.map((item) => item.x));
    const y = group.reduce((sum, item) => sum + item.y, 0) / group.length;
    const right = Math.max(
      ...group.map((item) => item.x + item.width)
    );
    const height = Math.max(...group.map((item) => item.height));

    return {
      text: normalizeSpace(text),
      x,
      y,
      width: right - x,
      height,
    };
  });

  return lines
    .filter((line) => line.text)
    .sort((a, b) => {
      const dy = b.y - a.y;

      if (Math.abs(dy) > 3) {
        return dy;
      }

      return a.x - b.x;
    });
}

function rectIntersects(
  a: { x1: number; y1: number; x2: number; y2: number },
  b: { x1: number; y1: number; x2: number; y2: number }
) {
  return !(
    a.x2 < b.x1 ||
    a.x1 > b.x2 ||
    a.y2 < b.y1 ||
    a.y1 > b.y2
  );
}

function optionIsHighlighted(
  optionLine: TextLine,
  highlights: HighlightRect[]
) {
  const lineRect = {
    x1: optionLine.x - 2,
    y1: optionLine.y - optionLine.height * 0.35,
    x2: optionLine.x + optionLine.width + 2,
    y2: optionLine.y + optionLine.height * 0.95,
  };

  return highlights.some((highlight) =>
    rectIntersects(lineRect, highlight)
  );
}

async function pageHighlights(page: any): Promise<HighlightRect[]> {
  try {
    const annotations = await page.getAnnotations({
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

      const quadPoints = Array.isArray(annotation?.quadPoints)
        ? annotation.quadPoints
        : null;

      if (quadPoints && quadPoints.length >= 8) {
        for (let index = 0; index + 7 < quadPoints.length; index += 8) {
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

      if (Array.isArray(annotation?.rect) && annotation.rect.length >= 4) {
        const [x1, y1, x2, y2] = annotation.rect;

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
    console.error("HIGHLIGHT READ ERROR:", error);
    return [];
  }
}

function findQuestionBlocks(lines: TextLine[]) {
  const starts = lines
    .map((line, index) => ({
      line,
      index,
      number: questionNumber(line.text),
    }))
    .filter(
      (item) =>
        item.number !== null &&
        isQuestionStart(item.line.text)
    );

  const blocks: {
    number: number;
    startIndex: number;
    endIndex: number;
    lines: TextLine[];
  }[] = [];

  for (let index = 0; index < starts.length; index++) {
    const current = starts[index];
    const next = starts[index + 1];

    const endIndex = next
      ? next.index
      : lines.length;

    blocks.push({
      number: current.number!,
      startIndex: current.index,
      endIndex,
      lines: lines.slice(current.index, endIndex),
    });
  }

  return blocks;
}

function parseQuestionBlock(
  block: {
    number: number;
    lines: TextLine[];
  },
  highlights: HighlightRect[]
): {
  number: number;
  questionText: string;
  options: ImportedOption[];
  optionStartY: number | null;
  questionEndY: number | null;
  optionLines: TextLine[];
  warning?: string;
} {
  const optionLineIndexes: number[] = [];

  block.lines.forEach((line, index) => {
    if (optionLabel(line.text)) {
      optionLineIndexes.push(index);
    }
  });

  if (optionLineIndexes.length === 0) {
    return {
      number: block.number,
      questionText: normalizeSpace(
        block.lines
          .map((line, index) =>
            index === 0
              ? stripQuestionNumber(line.text)
              : line.text
          )
          .join("\n")
      ),
      options: [],
      optionStartY: null,
      questionEndY:
        block.lines.length > 0
          ? block.lines[block.lines.length - 1].y
          : null,
      optionLines: [],
      warning:
        "A/B/C/D variantlar avtomatik topilmadi. Savolni qo‘lda tekshiring.",
    };
  }

  const firstOptionIndex = optionLineIndexes[0];

  const questionLines = block.lines.slice(0, firstOptionIndex);

  const questionText = normalizeSpace(
    questionLines
      .map((line, index) =>
        index === 0
          ? stripQuestionNumber(line.text)
          : line.text
      )
      .join("\n")
  );

  const options: ImportedOption[] = [];
  const optionLines: TextLine[] = [];

  for (let optionIndex = 0; optionIndex < optionLineIndexes.length; optionIndex++) {
    const start = optionLineIndexes[optionIndex];
    const end =
      optionLineIndexes[optionIndex + 1] ?? block.lines.length;

    const firstLine = block.lines[start];
    const label = optionLabel(firstLine.text);

    if (!label) continue;

    const textParts = [
      stripOptionPrefix(firstLine.text),
      ...block.lines
        .slice(start + 1, end)
        .map((line) => line.text),
    ];

    const isCorrect = optionIsHighlighted(firstLine, highlights);

    options.push({
      id: makeId(
        `q${block.number}-${label.toLowerCase()}`
      ),
      label,
      text: normalizeSpace(textParts.join(" ")),
      isCorrect,
    });

    optionLines.push(firstLine);
  }

  const correctCount =
    options.filter((option) => option.isCorrect).length;

  let warning: string | undefined;

  if (options.length !== 4) {
    warning =
      `${options.length} ta variant topildi. 4 ta variant bo‘lishi kerak.`;
  } else if (correctCount === 0) {
    warning =
      "Sariq belgilangan to‘g‘ri javob avtomatik aniqlanmadi.";
  } else if (correctCount > 1) {
    warning =
      "Bir nechta sariq variant topildi. To‘g‘ri javobni tekshiring.";
  }

  return {
    number: block.number,
    questionText,
    options,
    optionStartY:
      optionLines.length > 0
        ? Math.max(...optionLines.map((line) => line.y))
        : null,
    questionEndY:
      questionLines.length > 0
        ? Math.min(...questionLines.map((line) => line.y))
        : null,
    optionLines,
    warning,
  };
}

async function renderQuestionImage(
  page: any,
  pageWidth: number,
  pageHeight: number,
  parsed: {
    questionText: string;
    optionStartY: number | null;
    questionEndY: number | null;
  }
) {
  if (
    parsed.optionStartY === null ||
    parsed.questionEndY === null
  ) {
    return undefined;
  }

  /*
    Savol matni bilan variantlar orasida katta vertikal bo‘shliq bo‘lsa,
    u yerda diagramma / jadval / rasm bor deb hisoblaymiz.
  */
  const upperY = parsed.questionEndY;
  const lowerY = parsed.optionStartY;

  const gap = upperY - lowerY;

  if (gap < 55) {
    return undefined;
  }

  const pdfjs = await import(
    "pdfjs-dist/legacy/build/pdf.mjs"
  );

  const viewport = page.getViewport({
    scale: 1.65,
  });

  const canvas = createCanvas(
    Math.ceil(viewport.width),
    Math.ceil(viewport.height)
  );

  const context = canvas.getContext("2d");

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  /*
    PDF koordinatasi pastdan yuqoriga,
    Canvas esa tepadan pastga yuradi.
  */
  const scaleX = viewport.width / pageWidth;
  const scaleY = viewport.height / pageHeight;

  const topPdfY = upperY - 12;
  const bottomPdfY = lowerY + 12;

  const topCanvas =
    viewport.height - topPdfY * scaleY;
  const bottomCanvas =
    viewport.height - bottomPdfY * scaleY;

  const cropTop = Math.max(
    0,
    Math.floor(Math.min(topCanvas, bottomCanvas))
  );

  const cropBottom = Math.min(
    viewport.height,
    Math.ceil(Math.max(topCanvas, bottomCanvas))
  );

  const cropHeight =
    cropBottom - cropTop;

  if (cropHeight < 45) {
    return undefined;
  }

  /*
    Diagrammalar ko‘pincha sahifaning katta qismida bo‘ladi.
    Chap/o‘ngdan ozgina margin qoldirib kesamiz.
  */
  const cropX = Math.max(
    0,
    Math.floor(20 * scaleX)
  );

  const cropWidth = Math.min(
    viewport.width - cropX,
    Math.ceil((pageWidth - 40) * scaleX)
  );

  const output = createCanvas(
    Math.max(1, cropWidth),
    Math.max(1, cropHeight)
  );

  const outputContext = output.getContext("2d");

  outputContext.fillStyle = "#ffffff";
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

  const png = await output.encode("png");

  return `data:image/png;base64,${png.toString("base64")}`;
}

function ensureFourOptions(
  options: ImportedOption[],
  questionNumberValue: number
) {
  const labels: ("A" | "B" | "C" | "D")[] = [
    "A",
    "B",
    "C",
    "D",
  ];

  return labels.map((label) => {
    const existing = options.find(
      (option) => option.label === label
    );

    if (existing) return existing;

    return {
      id: makeId(
        `q${questionNumberValue}-${label.toLowerCase()}`
      ),
      label,
      text: "",
      isCorrect: false,
    };
  });
}

export async function POST(
  request: NextRequest
) {
  try {
    const formData =
      await request.formData();

    const file =
      formData.get("file");

    if (!(file instanceof File)) {
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
      file.type !== "application/pdf" &&
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

    const pdfjs = await import(
      "pdfjs-dist/legacy/build/pdf.mjs"
    );

    const document = await pdfjs
      .getDocument({
        data: bytes,
        useSystemFonts: true,
        disableFontFace: false,
      })
      .promise;

    const importedQuestions:
      ImportedQuestion[] = [];

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

      const positionedItems: PositionedText[] =
        (textContent.items as PdfTextItem[])
          .filter(
            (item) =>
              typeof item.str ===
                "string" &&
              item.str.trim()
          )
          .map((item) => {
            const transform =
              item.transform || [
                1, 0, 0, 1, 0, 0,
              ];

            const x =
              Number(transform[4]) ||
              0;

            const y =
              Number(transform[5]) ||
              0;

            const height =
              Math.max(
                8,
                Math.abs(
                  Number(
                    transform[3]
                  ) || 0
                )
              );

            return {
              text:
                item.str.trim(),
              x,
              y,
              width:
                Math.max(
                  1,
                  Number(
                    item.width
                  ) || 1
                ),
              height,
            };
          });

      const lines =
        buildLines(
          positionedItems
        );

      const highlights =
        await pageHighlights(
          page
        );

      const blocks =
        findQuestionBlocks(
          lines
        );

      for (const block of blocks) {
        const parsed =
          parseQuestionBlock(
            block,
            highlights
          );

        const imageSrc =
          await renderQuestionImage(
            page,
            viewport.width,
            viewport.height,
            parsed
          );

        const options =
          ensureFourOptions(
            parsed.options,
            parsed.number
          );

        let warning =
          parsed.warning;

        if (
          imageSrc &&
          !warning
        ) {
          /*
            Rasmli savol topilgani xato emas.
            Faqat admin previewda bilib turishi uchun
            warning bermaymiz.
          */
        }

        importedQuestions.push({
          id: makeId(
            `import-q${parsed.number}`
          ),
          number:
            parsed.number,
          questionText:
            parsed.questionText,
          options,
          imageSrc,
          warning,
        });
      }

      page.cleanup();
    }

    document.cleanup();
    document.destroy();

    importedQuestions.sort(
      (a, b) =>
        a.number - b.number
    );

    /*
      PDFda raqamlar takrorlangan yoki sahifa boshida
      boshqa raqamli matn savol deb tushunilgan bo‘lsa,
      tekshirish oynasida ko‘rinsin.
    */
    const seen =
      new Set<number>();

    for (const question of importedQuestions) {
      if (
        seen.has(
          question.number
        )
      ) {
        question.warning =
          question.warning ||
          "Savol raqami PDF ichida takrorlangan. Tekshirib chiqing.";
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
            "PDFdan test savollari topilmadi. PDF matnli ekanini va savollar '1.' yoki '1)' ko‘rinishida boshlanganini tekshiring.",
        },
        {
          status: 422,
        }
      );
    }

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
