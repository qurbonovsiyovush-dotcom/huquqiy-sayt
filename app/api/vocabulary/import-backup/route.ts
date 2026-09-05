import "server-only";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type VocabularyWord = {
  word?: unknown;
  translation?: unknown;
  example?: unknown;
  exampleTranslation?: unknown;
};

type VocabularyUnit = {
  book?: unknown;
  unit?: unknown;
  words?: unknown;
};

type ImportBody = {
  units?: unknown;
};

const NO_CACHE_HEADERS = {
  "Cache-Control":
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

function isAdmin(
  request: NextRequest
) {
  const session =
    request.cookies.get(
      "qurbonov_session"
    )?.value;

  const role =
    request.cookies.get(
      "qurbonov_role"
    )?.value;

  return Boolean(
    session &&
      role === "admin"
  );
}

function cleanText(
  value: unknown
) {
  return String(
    value ?? ""
  ).trim();
}

function isValidBook(
  book: number
) {
  return (
    Number.isInteger(book) &&
    book >= 1 &&
    book <= 6
  );
}

function isValidUnit(
  unit: number
) {
  return (
    Number.isInteger(unit) &&
    unit >= 1 &&
    unit <= 30
  );
}

export async function POST(
  request: NextRequest
) {
  try {
    if (!isAdmin(request)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Faqat admin import qila oladi.",
        },
        {
          status: 403,
          headers:
            NO_CACHE_HEADERS,
        }
      );
    }

    const body =
      (await request.json()) as ImportBody;

    const rawUnits =
      Array.isArray(body.units)
        ? body.units
        : [];

    if (
      rawUnits.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Import uchun Unitlar topilmadi.",
        },
        {
          status: 400,
          headers:
            NO_CACHE_HEADERS,
        }
      );
    }

    let importedUnits = 0;
    let importedWords = 0;

    for (
      const rawUnit of rawUnits
    ) {
      if (
        !rawUnit ||
        typeof rawUnit !==
          "object"
      ) {
        continue;
      }

      const unitObject =
        rawUnit as VocabularyUnit;

      const book =
        Number(
          unitObject.book
        );

      const unit =
        Number(
          unitObject.unit
        );

      if (
        !isValidBook(book) ||
        !isValidUnit(unit)
      ) {
        continue;
      }

      const rawWords =
        Array.isArray(
          unitObject.words
        )
          ? unitObject.words
          : [];

      const words =
        rawWords
          .map(
            (
              item,
              index
            ) => {
              if (
                !item ||
                typeof item !==
                  "object"
              ) {
                return null;
              }

              const raw =
                item as VocabularyWord;

              const word =
                cleanText(
                  raw.word
                );

              const translation =
                cleanText(
                  raw.translation
                );

              const example =
                cleanText(
                  raw.example
                );

              const exampleTranslation =
                cleanText(
                  raw.exampleTranslation
                );

              if (
                !word ||
                !translation
              ) {
                return null;
              }

              return {
                word_order:
                  index + 1,
                word,
                translation,
                example:
                  example ||
                  null,
                example_translation:
                  exampleTranslation ||
                  null,
              };
            }
          )
          .filter(
            (
              item
            ): item is {
              word_order: number;
              word: string;
              translation: string;
              example: string | null;
              example_translation:
                | string
                | null;
            } =>
              item !== null
          );

      if (
        words.length === 0
      ) {
        continue;
      }

      const unitRows =
        await sql`
          INSERT INTO
            vocabulary_units (
              book,
              unit,
              updated_at
            )
          VALUES (
            ${book},
            ${unit},
            NOW()
          )
          ON CONFLICT (
            book,
            unit
          )
          DO UPDATE SET
            updated_at = NOW()
          RETURNING id
        `;

      const unitId =
        Number(
          unitRows[0].id
        );

      await sql`
        DELETE FROM
          vocabulary_words
        WHERE
          unit_id =
            ${unitId}
      `;

      await sql`
        INSERT INTO
          vocabulary_words (
            unit_id,
            word_order,
            word,
            translation,
            example,
            example_translation,
            created_at,
            updated_at
          )
        SELECT
          ${unitId},
          x.word_order,
          x.word,
          x.translation,
          x.example,
          x.example_translation,
          NOW(),
          NOW()
        FROM
          jsonb_to_recordset(
            ${JSON.stringify(
              words
            )}::jsonb
          ) AS x(
            word_order integer,
            word text,
            translation text,
            example text,
            example_translation text
          )
      `;

      importedUnits += 1;
      importedWords +=
        words.length;
    }

    return NextResponse.json(
      {
        success: true,
        message:
          `${importedUnits} ta Unit va ${importedWords} ta so‘z Neon bazasiga import qilindi.`,
        importedUnits,
        importedWords,
      },
      {
        status: 200,
        headers:
          NO_CACHE_HEADERS,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/vocabulary/import-backup ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Vocabulary importida server xatosi.",
      },
      {
        status: 500,
        headers:
          NO_CACHE_HEADERS,
      }
    );
  }
}
