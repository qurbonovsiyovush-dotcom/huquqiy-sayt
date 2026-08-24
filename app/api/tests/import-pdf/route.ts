import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/*
  PDF.js Node/Vercel polyfill.

  Biz serverda PDFni rasmga render qilmaymiz.
  Lekin pdfjs-dist PDFni ochish/getTextContent qilish paytida ham
  DOMMatrix / ImageData / Path2D global obyektlarini kutishi mumkin.

  Oldingi @napi-rs/canvas importi olib tashlanganda:
    "DOMMatrix is not defined"
  xatosi shundan paydo bo'ldi.
*/
if (typeof (globalThis as any).DOMMatrix === "undefined") {
  (globalThis as any).DOMMatrix = DOMMatrix as any;
}

if (typeof (globalThis as any).ImageData === "undefined") {
  (globalThis as any).ImageData = ImageData as any;
}

if (typeof (globalThis as any).Path2D === "undefined") {
  (globalThis as any).Path2D = Path2D as any;
}

/* =========================================================
   TYPES
========================================================= */

type OptionLabel = "A" | "B" | "C" | "D";

type ImportedOption = {
  id: string;
  label: OptionLabel;
  text: string;
  isCorrect: boolean;
};

type PdfCrop = {
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

type ImportedQuestion = {
  id: string;
  number: number;
  questionText: string;
  options: ImportedOption[];
  pdfCrop?: PdfCrop;
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

  /*
    PDF.js + @napi-rs/canvas Vercel'da ba'zi PDF shriftlarini
    rasterga chizmay qolishi mumkin. Shuning uchun sahifadagi
    text layer satrlarini ham saqlaymiz va crop ustiga qayta chizamiz.
  */
  lines?: TextLine[];
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
   BASIC HELPERS
========================================================= */

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function normalizeText(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/*
  PDF MATNINI AVTOMATIK TOZALASH

  PDF sahifasidagi vizual qatorlar savol matnida majburiy
  yangi qator bo‘lib qolmasligi kerak.

  Masalan PDF:
    Quyidagi qaysi moddalar 1-
    bo‘lim II bob tarkibiga mos tushadi?

  Natija:
    Quyidagi qaysi moddalar 1-bo‘lim II bob tarkibiga mos tushadi?

  Lekin savol ichidagi sanalgan bandlar:
    1) Tashqi siyosat
    2) Fuqarolik
    3) ...
  alohida qatorda saqlanadi.
*/
function normalizeQuestionText(parts: string[]) {
  const rawLines = parts
    .flatMap((part) => String(part || "").split(/\r?\n/))
    .map((line) =>
      line
        .replace(/\u00a0/g, " ")
        .replace(/[ \t]+/g, " ")
        .trim()
    )
    .filter(Boolean);

  const paragraphs: string[] = [];
  let current = "";

  function appendLine(line: string) {
    if (!current) {
      current = line;
      return;
    }

    /*
      PDF satr oxirida '-' bilan bo‘lingan bo‘lsa:
        1- + bo‘lim        => 1-bo‘lim
        jinoyat- + huquq   => jinoyat-huquq
    */
    if (/-$/.test(current)) {
      current += line;
    } else {
      current += ` ${line}`;
    }
  }

  function flushCurrent() {
    const cleaned = current
      .replace(/\s+([,.;:!?])/g, "$1")
      .replace(/\(\s+/g, "(")
      .replace(/\s+\)/g, ")")
      .replace(/\s{2,}/g, " ")
      .trim();

    if (cleaned) {
      paragraphs.push(cleaned);
    }

    current = "";
  }

  for (const line of rawLines) {
    /*
      Yangi ichki band boshlanishi:
        1) ...
        2) ...
        a) ...
        b) ...

      MUHIM:
      Bandning keyingi vizual PDF qatorlari shu bandning DAVOMI
      hisoblanadi. Oldingi kod ularni alohida paragraph qilib yuborardi.
    */
    const startsInnerListItem =
      /^(?:\d{1,3}|[a-zA-Z])[\)\.]\s+\S/.test(line);

    if (startsInnerListItem) {
      flushCurrent();
      current = line;
      continue;
    }

    /*
      Oddiy qator — hozirgi gap/bandning davomi.
      Shuning uchun yangi \n qo‘ymaymiz, shu qatorga ulaymiz.
    */
    appendLine(line);
  }

  flushCurrent();

  return paragraphs
    .join("\n")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function normalizeOneLine(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
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

function hasPlus(value: string) {
  return (
    /\+\s*$/.test(value) ||
    /\(\s*\+\s*\)/.test(value) ||
    /^\s*\+\s*/.test(value)
  );
}

function questionNumberFromLine(value: string) {
  /*
    MUHIM:
    Test savollari faqat "1.", "2.", "3." ... formatida.
    "1)", "2)" esa savol ichidagi bandlar, savol deb olinmaydi.
  */
  const match = value.match(/^\s*(\d{1,4})\.\s+\S/);

  if (!match) {
    return null;
  }

  const number = Number(match[1]);

  if (
    !Number.isFinite(number) ||
    number < 1 ||
    number > 5000
  ) {
    return null;
  }

  return number;
}

function stripQuestionNumber(value: string) {
  return value
    .replace(/^\s*\d{1,4}\.\s+/, "")
    .trim();
}

function optionLabelFromStart(
  value: string
): OptionLabel | null {
  /*
    Qabul qilinadi:
      A) ...
      +A) ...
      + A) ...
      A)+ ...
      A) + ...
  */
  const match = value.match(
    /^\s*\+?\s*([ABCD])[\)\.\-:]\s*\+?\s*/
  );

  return match
    ? (match[1] as OptionLabel)
    : null;
}

function stripOptionPrefix(value: string) {
  return value
    .replace(
      /^\s*\+?\s*[ABCD][\)\.\-:]\s*\+?\s*/,
      ""
    )
    .trim();
}

function optionMarkerHasLeadingOrTrailingPlus(value: string) {
  return (
    /^\s*\+\s*[ABCD][\)\.\-:]/.test(value) ||
    /^\s*[ABCD][\)\.\-:]\s*\+/.test(value)
  );
}

/* =========================================================
   HIGHLIGHT
========================================================= */

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
    y1: line.y - line.height * 0.45,
    x2: line.x + line.width + 3,
    y2: line.y + line.height * 1.05,
  };

  return highlights.some((highlight) =>
    rectIntersects(lineRect, highlight)
  );
}

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
        const [x1, y1, x2, y2] =
          annotation.rect;

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
   TEXT ITEMS -> LINES
========================================================= */

function buildPositionedItems(
  textItems: PdfTextItem[],
  pageNumber: number
): PositionedText[] {
  return textItems
    .filter(
      (item) =>
        typeof item.str === "string" &&
        item.str.trim()
    )
    .map((item) => {
      const transform =
        item.transform ?? [
          1, 0, 0, 1, 0, 0,
        ];

      return {
        text: item.str.trim(),
        x:
          Number(transform[4]) || 0,
        y:
          Number(transform[5]) || 0,
        width:
          Math.max(
            1,
            Number(item.width) || 1
          ),
        height:
          Math.max(
            8,
            Math.abs(
              Number(transform[3]) || 0
            )
          ),
        pageNumber,
      };
    });
}

function groupItemsIntoLines(
  items: PositionedText[],
  column: "left" | "right" | "full"
): TextLine[] {
  const sorted =
    [...items].sort((a, b) => {
      const dy = b.y - a.y;

      if (Math.abs(dy) > 3.5) {
        return dy;
      }

      return a.x - b.x;
    });

  const groups: PositionedText[][] = [];

  for (const item of sorted) {
    let bestGroup:
      PositionedText[] | null = null;

    let bestDistance =
      Number.POSITIVE_INFINITY;

    for (const group of groups) {
      const avgY =
        group.reduce(
          (sum, part) =>
            sum + part.y,
          0
        ) / group.length;

      const distance =
        Math.abs(
          avgY - item.y
        );

      const tolerance =
        Math.max(
          3.5,
          item.height * 0.45
        );

      if (
        distance <= tolerance &&
        distance < bestDistance
      ) {
        bestDistance =
          distance;

        bestGroup =
          group;
      }
    }

    if (bestGroup) {
      bestGroup.push(item);
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
      let previousRight:
        number | null = null;

      for (const item of group) {
        if (
          previousRight !== null
        ) {
          const gap =
            item.x -
            previousRight;

          if (
            gap >
            Math.max(
              2.5,
              item.height * 0.18
            )
          ) {
            text += " ";
          }
        }

        text +=
          item.text;

        previousRight =
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
          normalizeOneLine(text),
        x,
        y,
        width:
          right - x,
        height,
        pageNumber:
          group[0].pageNumber,
        column,
      };
    })
    .filter(
      (line) =>
        line.text.length > 0
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
   PAGE READING ORDER
   Two-column pages:
   LEFT TOP->BOTTOM, then RIGHT TOP->BOTTOM.
   No item is discarded in the middle.
========================================================= */

function pageLines(
  items: PositionedText[],
  pageWidth: number
) {
  if (items.length === 0) {
    return [] as TextLine[];
  }

  const middle =
    pageWidth / 2;

  /*
    We detect whether there is meaningful text on BOTH sides.
  */
  const leftCount =
    items.filter(
      (item) =>
        item.x <
        middle - 10
    ).length;

  const rightCount =
    items.filter(
      (item) =>
        item.x >
        middle + 10
    ).length;

  const twoColumn =
    leftCount >= 8 &&
    rightCount >= 8;

  if (!twoColumn) {
    return groupItemsIntoLines(
      items,
      "full"
    );
  }

  /*
    IMPORTANT:
    assign EVERY item to exactly one column.
    No dead zone, no dropped tokens.
  */
  const left =
    items.filter(
      (item) =>
        item.x +
          item.width / 2 <=
        middle
    );

  const right =
    items.filter(
      (item) =>
        item.x +
          item.width / 2 >
        middle
    );

  const leftLines =
    groupItemsIntoLines(
      left,
      "left"
    );

  const rightLines =
    groupItemsIntoLines(
      right,
      "right"
    );

  return [
    ...leftLines,
    ...rightLines,
  ];
}

/* =========================================================
   QUESTION BLOCKS
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
    const number =
      questionNumberFromLine(
        line.text
      );

    if (number !== null) {
      if (current) {
        blocks.push(current);
      }

      current = {
        number,
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
   INLINE OPTION SPLITTER
   Example:
      A) 1,4 B) 2,3
      C) 1,3 D) 2,4
========================================================= */

function splitInlineOptions(
  text: string
) {
  /*
    Bir qatorda quyidagilarni ham taniydi:
      A) ... B) ...
      +A) ... B) ...
      A)+ ... B) ...
      A) + ... B) ...
  */
  const regex =
    /(^|\s)(\+?\s*)([ABCD])[\)\.\-:]\s*(\+?\s*)/g;

  const matches: {
    label: OptionLabel;
    markerStart: number;
    contentStart: number;
    markerHasPlus: boolean;
  }[] = [];

  let match:
    RegExpExecArray | null;

  while (
    (match =
      regex.exec(text)) !==
    null
  ) {
    const leadingLength =
      match[1]?.length ?? 0;

    matches.push({
      label:
        match[3] as OptionLabel,
      markerStart:
        match.index +
        leadingLength,
      contentStart:
        regex.lastIndex,
      markerHasPlus:
        Boolean(match[2]?.includes("+")) ||
        Boolean(match[4]?.includes("+")),
    });
  }

  return matches.map(
    (current, index) => {
      const next =
        matches[index + 1];

      return {
        label:
          current.label,
        text:
          text
            .slice(
              current.contentStart,
              next
                ? next.markerStart
                : text.length
            )
            .trim(),
        markerHasPlus:
          current.markerHasPlus,
      };
    }
  );
}

/* =========================================================
   VISUAL QUESTION DETECTION
   Jadval / diagramma / belgi / atama-moslashtirish kabi savollarda
   PDFdagi vizual qism savol matni bilan A/B/C/D orasida joylashadi.
========================================================= */

function looksLikeVisualQuestion(value: string) {
  const text = normalizeOneLine(value).toLowerCase();

  return (
    /\bjadval(?:da|ni|dan)?\b/.test(text) ||
    /\bdiagramma(?:si|ga|ni|dan)?\b/.test(text) ||
    /\beyler[\s\-–—]*venn\b/.test(text) ||
    /\bushbu\s+belgi\b/.test(text) ||
    /\bbelgi\s+qanday\s+ma[’'`ʻʼ]?noni\b/.test(text) ||
    /\byuridik\s+atamalar\b/.test(text) ||
    /\batamalar\s+va\s+ularning\s+izohi\b/.test(text)
  );
}

/*
  Vizual savolda prompt tugagan joyni topamiz.
  Masalan:
    "8. Quyidagi jadvalda ..."
    "berilgan qatorni aniqlang ?"
  keyingi satrlar jadvalning o‘zi bo‘ladi.

  Savol prompti odatda ?, ! yoki . bilan tugaydi.
*/
function visualPromptEndIndex(lines: TextLine[]) {
  if (lines.length === 0) {
    return -1;
  }

  let accumulated = "";

  for (let index = 0; index < lines.length; index++) {
    const current =
      index === 0
        ? stripQuestionNumber(lines[index].text)
        : lines[index].text;

    accumulated = normalizeOneLine(
      accumulated
        ? `${accumulated} ${current}`
        : current
    );

    if (
      looksLikeVisualQuestion(accumulated) &&
      /[?!\.]\s*$/.test(accumulated)
    ) {
      return index;
    }

    // Vizual savol promptlari odatda 1-4 satr.
    // Juda cho‘zilib ketsa, diagramma/jadval matnini promptga qo‘shmaymiz.
    if (
      index >= 3 &&
      looksLikeVisualQuestion(accumulated)
    ) {
      return index;
    }
  }

  return looksLikeVisualQuestion(accumulated)
    ? Math.min(lines.length - 1, 1)
    : -1;
}

/* =========================================================
   PARSE:
   QUESTION -> A -> B -> C -> D -> NEXT QUESTION
========================================================= */

function parseQuestion(
  block: QuestionBlock,
  pageInfos: Map<number, PageInfo>
) {
  const labels:
    OptionLabel[] = [
      "A",
      "B",
      "C",
      "D",
    ];

  const questionParts:
    string[] = [];

  const questionLines:
    TextLine[] = [];

  const optionData =
    new Map<
      OptionLabel,
      {
        textParts: string[];
        plus: boolean;
        highlight: boolean;
        firstLine: TextLine;
      }
    >();

  let currentOption:
    OptionLabel | null =
    null;

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
      splitInlineOptions(
        lineText
      );

    if (
      inline.length > 0
    ) {
      if (!firstOptionLine) {
        firstOptionLine =
          line;
      }

      const pageInfo =
        pageInfos.get(
          line.pageNumber
        );

      for (const part of inline) {
        currentOption =
          part.label;

        const existing =
          optionData.get(
            part.label
          );

        const plus =
          part.markerHasPlus ||
          hasPlus(
            part.text
          );

        const highlight =
          pageInfo
            ? lineIsHighlighted(
                line,
                pageInfo.highlights
              )
            : false;

        if (existing) {
          existing.textParts.push(
            cleanPlus(
              part.text
            )
          );

          existing.plus =
            existing.plus ||
            plus;

          existing.highlight =
            existing.highlight ||
            highlight;
        } else {
          optionData.set(
            part.label,
            {
              textParts: [
                cleanPlus(
                  part.text
                ),
              ],
              plus,
              highlight,
              firstLine:
                line,
            }
          );
        }
      }

      continue;
    }

    const directLabel =
      optionLabelFromStart(
        lineText
      );

    if (directLabel) {
      currentOption =
        directLabel;

      if (!firstOptionLine) {
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

      optionData.set(
        directLabel,
        {
          textParts: [
            cleanPlus(raw),
          ],
          plus:
            optionMarkerHasLeadingOrTrailingPlus(
              lineText
            ) ||
            hasPlus(raw) ||
            hasPlus(
              lineText
            ),
          highlight:
            pageInfo
              ? lineIsHighlighted(
                  line,
                  pageInfo.highlights
                )
              : false,
          firstLine:
            line,
        }
      );

      continue;
    }

    if (currentOption) {
      const existing =
        optionData.get(
          currentOption
        );

      if (existing) {
        existing.textParts.push(
          cleanPlus(
            lineText
          )
        );

        if (
          hasPlus(
            lineText
          )
        ) {
          existing.plus =
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
          existing.highlight =
            true;
        }
      }

      continue;
    }

    questionParts.push(
      lineText
    );

    questionLines.push(
      line
    );

    lastQuestionLine =
      line;
  }

  const plusLabels =
    labels.filter(
      (label) =>
        optionData.get(
          label
        )?.plus
    );

  const highlightLabels =
    labels.filter(
      (label) =>
        optionData.get(
          label
        )?.highlight
    );

  let correctLabel:
    OptionLabel | null =
    null;

  /*
    PRIORITY:
    1. +
    2. yellow highlight
    3. manual admin selection
  */
  if (
    plusLabels.length === 1
  ) {
    correctLabel =
      plusLabels[0];
  } else if (
    plusLabels.length === 0 &&
    highlightLabels.length === 1
  ) {
    correctLabel =
      highlightLabels[0];
  }

  const options:
    ImportedOption[] =
    labels.map(
      (label) => {
        const found =
          optionData.get(
            label
          );

        return {
          id: makeId(
            `q${block.number}-${label.toLowerCase()}`
          ),
          label,
          text:
            found
              ? normalizeText(
                  found.textParts.join(
                    " "
                  )
                )
              : "",
          isCorrect:
            correctLabel ===
            label,
        };
      }
    );

  const foundCount =
    labels.filter(
      (label) =>
        optionData.has(
          label
        )
    ).length;

  let warning:
    string | undefined;

  if (foundCount !== 4) {
    warning =
      `${foundCount} ta variant topildi. A, B, C, D to‘liq topilmadi.`;
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
      "To‘g‘ri javob topilmadi. To‘g‘ri variant oxiriga + belgisi qo‘ying yoki admin oynasida belgilang.";
  }

  const fullQuestionText =
    normalizeQuestionText(
      questionParts
    );

  const promptEndIndex =
    visualPromptEndIndex(
      questionLines
    );

  const shouldRenderImage =
    promptEndIndex >= 0 &&
    Boolean(firstOptionLine);

  const promptParts =
    shouldRenderImage
      ? questionLines
          .slice(
            0,
            promptEndIndex + 1
          )
          .map(
            (line, index) =>
              index === 0
                ? stripQuestionNumber(
                    line.text
                  )
                : line.text
          )
      : questionParts;

  const promptEndLine =
    shouldRenderImage
      ? questionLines[
          promptEndIndex
        ] ?? null
      : null;

  return {
    number:
      block.number,
    questionText:
      normalizeQuestionText(
        promptParts
      ),
    options,
    warning,
    firstOptionLine,
    lastQuestionLine,
    promptEndLine,
    shouldRenderImage,
    fullQuestionText,
  };
}

/* =========================================================
   IMAGE / DIAGRAM
   Only if there is a REAL large gap between question text
   and first A/B/C/D line on the SAME page/column.
========================================================= */

function getQuestionPdfCrop(
  pageInfo: PageInfo,
  firstOptionLine: TextLine | null,
  promptEndLine: TextLine | null
): PdfCrop | undefined {
  if (!firstOptionLine || !promptEndLine) {
    return undefined;
  }

  if (
    firstOptionLine.pageNumber !==
    promptEndLine.pageNumber
  ) {
    return undefined;
  }

  /*
    =========================================================
    COLUMN-AWARE DYNAMIC CROP
    =========================================================

    QOIDA:
      1) Savol matni tugagan joydan KEYIN boshlanadi.
      2) A/B/C/D variantlari boshlanishidan OLDIN tugaydi.
      3) Faqat SAVOLNING O'Z USTUNI ichidagi kontent olinadi.
      4) Chap/o'ng ustun orasidagi uzun vertikal chiziq cropga kirmaydi.
      5) Crop razmeri fixed emas — real kontent chegarasidan hisoblanadi.
  */

  const targetColumn: "left" | "right" | "full" =
    promptEndLine.column !== "full"
      ? promptEndLine.column
      : firstOptionLine.column !== "full"
      ? firstOptionLine.column
      : "full";

  const middle =
    pageInfo.width / 2;

  /*
    Savol prompti va variantlar orasidagi vertikal "koridor".
    Juda katta fixed padding ishlatmaymiz.
  */
  const rawTopY =
    promptEndLine.y -
    Math.max(
      5,
      promptEndLine.height * 0.35
    );

  /*
    Variant boshlanishidan ancha yuqorida to‘xtaymiz.
    Oldingi 0.35 koeffitsiyent A) satrining yuqori qismini cropga
    kiritib yuborayotgan edi.
  */
  /*
    FINAL BOTTOM TUNE:
    Pastki chegara ozgina pastga tushirildi.
    Maqsad: Venn/jadvalning oxirgi qatori to‘liq ko‘rinsin,
    lekin A/B/C/D variantlari rasmga kirmasin.
  */
  const rawBottomY =
    firstOptionLine.y +
    Math.max(
      7,
      firstOptionLine.height * 0.88
    );

  if (
    rawTopY -
      rawBottomY <
    22
  ) {
    return undefined;
  }

  /*
    Faqat shu savolning USTUNI va vertikal oralig'idagi textlarni olamiz.
    Bu eng muhim fix: chapdagi 13/14/15 savollar o'ng Venn cropiga
    endi tushmaydi va aksincha.
  */
  const insideLines =
    (pageInfo.lines || [])
      .filter((line) => {
        if (
          line.pageNumber !==
          promptEndLine.pageNumber
        ) {
          return false;
        }

        if (
          targetColumn !== "full" &&
          line.column !== targetColumn
        ) {
          return false;
        }

        const lineTop =
          line.y +
          line.height * 0.8;

        const lineBottom =
          line.y -
          line.height * 0.4;

        return (
          lineTop < rawTopY &&
          lineBottom > rawBottomY
        );
      });

  /*
    USTUNNING xavfsiz gorizontal chegaralari.
    Separator chiziq ko'rinmasligi uchun markazdan ancha ichkariga kiramiz.
  */
  const separatorGap =
    Math.max(
      10,
      pageInfo.width * 0.018
    );

  /*
    Sahifa tashqi chetida ozgina xavfsizlik qoldiramiz.
    3.5% jadvalning birinchi ustunini (№ / 1 / 2 / 3...) kesib yuborayotgan
    edi, shuning uchun 1.5% ga tushirdik.
  */
  let hardLeft =
    pageInfo.width * 0.015;

  let hardRight =
    pageInfo.width * 0.985;

  if (targetColumn === "left") {
    hardRight =
      middle - separatorGap;
  } else if (
    targetColumn === "right"
  ) {
    hardLeft =
      middle + separatorGap;
  }

  /*
    Agar text layer topilmasa ham ustundan tashqariga chiqmaymiz.
  */
  if (
    insideLines.length === 0
  ) {
    const fallbackWidth =
      hardRight - hardLeft;

    if (
      fallbackWidth < 80
    ) {
      return undefined;
    }

    return {
      pageNumber:
        firstOptionLine.pageNumber,
      x:
        hardLeft,
      y:
        Math.max(
          0,
          rawBottomY
        ),
      width:
        fallbackWidth,
      height:
        Math.max(
          30,
          rawTopY -
            rawBottomY
        ),
    };
  }

  /*
    REAL CONTENT BOUNDING BOX.
    Jadval / Venn / moslashtirish ichidagi matnlar qayerda bo'lsa,
    crop gorizontal razmeri shunga qarab moslashadi.
  */
  const minTextX =
    Math.min(
      ...insideLines.map(
        (line) => line.x
      )
    );

  const maxTextX =
    Math.max(
      ...insideLines.map(
        (line) =>
          line.x +
          line.width
      )
    );

  const highestTextTop =
    Math.max(
      ...insideLines.map(
        (line) =>
          line.y +
          line.height
      )
    );

  const lowestTextBottom =
    Math.min(
      ...insideLines.map(
        (line) =>
          line.y -
          line.height * 0.45
      )
    );

  const averageHeight =
    insideLines.reduce(
      (sum, line) =>
        sum + line.height,
      0
    ) /
    Math.max(
      1,
      insideLines.length
    );

  /*
    Shakl chiziqlari matndan biroz tashqarida bo'lishi mumkin.
    Padding dinamik, ammo ustun chegarasidan oshmaydi.
  */
  /*
    Jadvalning yashil borderlari textdan ancha tashqarida turishi mumkin.
    Shuning uchun gorizontal paddingni biroz kengaytiramiz.
    Bu baribir hardLeft/hardRight va separator chegarasidan oshmaydi.
  */
  const horizontalPadding =
    Math.max(
      24,
      Math.min(
        48,
        averageHeight * 3.1
      )
    );

  const verticalPadding =
    Math.max(
      5,
      Math.min(
        12,
        averageHeight * 0.85
      )
    );

  let x1 =
    minTextX -
    horizontalPadding;

  let x2 =
    maxTextX +
    horizontalPadding;

  /*
    Ustun separatorini qat'iy kesib tashlaymiz.
  */
  x1 =
    Math.max(
      hardLeft,
      x1
    );

  x2 =
    Math.min(
      hardRight,
      x2
    );

  /*
    Venn ichidagi I/II/III kabi text juda tor bo'lishi mumkin.
    Shuning uchun faqat shu USTUN ichida minimal vizual kenglik.
    Bu boshqa ustunga o'tmaydi.
  */
  const availableColumnWidth =
    hardRight - hardLeft;

  const minimumVisualWidth =
    Math.min(
      availableColumnWidth,
      Math.max(
        250,
        availableColumnWidth * 0.72
      )
    );

  if (
    x2 - x1 <
    minimumVisualWidth
  ) {
    const contentCenter =
      (x1 + x2) / 2;

    x1 =
      contentCenter -
      minimumVisualWidth / 2;

    x2 =
      contentCenter +
      minimumVisualWidth / 2;

    if (
      x1 < hardLeft
    ) {
      const shift =
        hardLeft - x1;

      x1 += shift;
      x2 += shift;
    }

    if (
      x2 > hardRight
    ) {
      const shift =
        x2 - hardRight;

      x1 -= shift;
      x2 -= shift;
    }
  }

  /*
    Vertikal crop ham real kontent bo'yicha, ammo:
      - savol matniga chiqmaydi
      - A/B/C/D variantiga tushmaydi
  */
  const top =
    Math.min(
      rawTopY,
      highestTextTop +
        verticalPadding
    );

  const bottom =
    Math.max(
      rawBottomY,
      lowestTextBottom -
        verticalPadding
    );

  const width =
    x2 - x1;

  const height =
    top - bottom;

  if (
    width < 80 ||
    height < 28
  ) {
    return undefined;
  }

  return {
    pageNumber:
      firstOptionLine.pageNumber,
    x:
      Math.max(
        hardLeft,
        x1
      ),
    y:
      Math.max(
        0,
        bottom
      ),
    width:
      Math.min(
        width,
        hardRight -
          Math.max(
            hardLeft,
            x1
          )
      ),
    height:
      Math.min(
        height,
        pageInfo.height -
          Math.max(
            0,
            bottom
          )
      ),
  };
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
      VERCEL PDF.JS WORKER FIX
      Keep this — it already worked on your deployment.
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
       PAGE BY PAGE
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
        textContent.items as
          PdfTextItem[];

      const items =
        buildPositionedItems(
          rawItems,
          pageNumber
        );

      const highlights =
        await pageHighlights(
          page
        );

      /*
        PAGE READING ORDER:
        left column first, then right column.
        No center text is discarded.
      */
      const lines =
        pageLines(
          items,
          viewport.width
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
          lines,
        }
      );

      allLines.push(
        ...lines
      );
    }

    /* ---------------------------------------------------------
       QUESTION BLOCKS
    --------------------------------------------------------- */

    const blocks =
      buildQuestionBlocks(
        allLines
      );

    const imported:
      ImportedQuestion[] = [];

    for (const block of blocks) {
      const parsed =
        parseQuestion(
          block,
          pageInfos
        );

      let pdfCrop:
        PdfCrop | undefined;

      if (
        parsed.shouldRenderImage &&
        parsed.firstOptionLine &&
        parsed.promptEndLine &&
        parsed.firstOptionLine.pageNumber ===
          parsed.promptEndLine.pageNumber
      ) {
        const pageInfo =
          pageInfos.get(
            parsed.firstOptionLine.pageNumber
          );

        if (pageInfo) {
          pdfCrop =
            getQuestionPdfCrop(
              pageInfo,
              parsed.firstOptionLine,
              parsed.promptEndLine
            );
        }
      }

      imported.push({
        id: makeId(
          `import-q${parsed.number}`
        ),
        number:
          parsed.number,
        questionText:
          parsed.questionText,
        options:
          parsed.options,
        pdfCrop,
        warning:
          parsed.warning,
      });
    }

    /* ---------------------------------------------------------
       REMOVE DUPLICATE QUESTION NUMBERS
       Prefer the version with more non-empty options.
    --------------------------------------------------------- */

    const unique =
      new Map<
        number,
        ImportedQuestion
      >();

    for (const question of imported) {
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

      const existingFilled =
        existing.options.filter(
          (option) =>
            option.text.trim()
        ).length;

      const newFilled =
        question.options.filter(
          (option) =>
            option.text.trim()
        ).length;

      if (
        newFilled >
        existingFilled
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
            "PDFdan test savollari topilmadi. Test savollari '1.' '2.' '3.' ko‘rinishida bo‘lishi kerak.",
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
