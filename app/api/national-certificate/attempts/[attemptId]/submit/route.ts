import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
  Foydalanuvchi uchun qo‘shimcha vaqt EMAS.
  UI 00:00 da bloklanadi.

  Bu faqat 00:00 da brauzerdan jo‘natilgan avtomatik
  yakunlash so‘rovi tarmoq orqali serverga yetib kelishi
  uchun transport oynasi.
*/
const AUTO_SUBMIT_TRANSPORT_GRACE_MS = 5_000;

type RawAnswer = {
  questionId?: unknown;
  selectedOptionId?: unknown;
  openAnswerText?: unknown;
};

type SubmittedAnswer = {
  questionId: string;
  selectedOptionId: string | null;
  openAnswerText: string;
};

type StoredAnswerRow = {
  question_id: string;
  selected_option_id: string | null;
  open_answer_text: string | null;
  normalized_open_answer: string | null;
  is_correct: boolean | null;
  awarded_points: number;
};

function getUserKey(request: NextRequest) {
  return (
    request.cookies.get("qurbonov_session")?.value ||
    ""
  );
}

/*
  ============================================================
  BEPUL SMART OPEN-ANSWER CHECKER
  ============================================================

  Bu checker hech qanday tashqi AI/API ishlatmaydi.

  Nimalarni tushunadi:
  - katta/kichik harf farqi;
  - nuqta, vergul, tire va ortiqcha bo‘sh joylar;
  - turli apostroflar;
  - "5", "5 yil", "besh", "besh yil" kabi son variantlari;
  - so‘zlar tartibi o‘zgargan javoblar;
  - ayrim o‘zbekcha qo‘shimchalar va yengil imlo xatolari;
  - vergul/nuqtali vergul bilan yozilgan ro‘yxatlarda bandlar tartibi;
  - etalon javobdagi raqam noto‘g‘ri almashtirilsa, javobni xato qiladi.

  Muhim:
  Bu AI emas. Juda erkin, chuqur parafrazlarni 100% tushunmaydi.
  Shuning uchun huquqiy aniqlikni saqlash uchun ehtiyotkor ishlaydi.
*/

type AcceptedOpenAnswer = {
  answerText: string;
  normalizedAnswer: string;
};

const UZBEK_NUMBER_UNITS: Record<string, number> = {
  nol: 0,
  bir: 1,
  ikki: 2,
  uch: 3,
  tort: 4,
  besh: 5,
  olti: 6,
  yetti: 7,
  sakkiz: 8,
  toqqiz: 9,
};

const UZBEK_NUMBER_TENS: Record<string, number> = {
  on: 10,
  yigirma: 20,
  ottiz: 30,
  qirq: 40,
  ellik: 50,
  oltmish: 60,
  yetmish: 70,
  sakson: 80,
  toqson: 90,
};

const LIGHT_STOP_WORDS = new Set([
  "va",
  "ham",
  "yoki",
  "esa",
  "bilan",
  "uchun",
  "boyicha",
  "bo'yicha",
  "sifatida",
  "deb",
  "bu",
  "shu",
  "osha",
  "o'sha",
]);

const PHRASE_ALIASES: Array<[RegExp, string]> = [
  [/\bumrining\s+oxirigacha\b/giu, "umrbod"],
  [/\bumrining\s+oxiriga\s+qadar\b/giu, "umrbod"],
  [/\bhayotining\s+oxirigacha\b/giu, "umrbod"],
  [/\bhayotining\s+oxiriga\s+qadar\b/giu, "umrbod"],
  [/\bavloddan\s+avlodga\b/giu, "meros"],
  [/\bnasldan\s+naslga\b/giu, "meros"],
  [/\bmeros\s+bo['’ʻʼ`]?yicha\b/giu, "meros"],
  [/\bmeros\s+orqali\b/giu, "meros"],
  [/\bovoz\s+berish\s+yo['’ʻʼ`]?li\s+bilan\b/giu, "saylov"],
  [/\bsaylov\s+orqali\b/giu, "saylov"],
];

function normalizeApostrophes(value: string) {
  return value
    .replace(/[ʻʼ’`‘]/g, "'")
    .replace(/[“”„"]/g, " ");
}

function basicNormalize(value: string) {
  let result = normalizeApostrophes(
    String(value || "")
      .trim()
      .toLowerCase()
  );

  for (const [pattern, replacement] of PHRASE_ALIASES) {
    result = result.replace(
      pattern,
      replacement
    );
  }

  return result
    .replace(/<[^>]*>/g, " ")
    .replace(/[-–—_/\\|]+/g, " ")
    .replace(/[^\p{L}\p{N}'%]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalNumberWord(
  token: string
) {
  return token
    .replace(/'/g, "")
    .replace(/^toʻrt$/u, "tort")
    .replace(/^to‘rt$/u, "tort")
    .replace(/^toʻqqiz$/u, "toqqiz")
    .replace(/^to‘qqiz$/u, "toqqiz")
    .replace(/^oʻn$/u, "on")
    .replace(/^o‘n$/u, "on")
    .replace(/^oʻttiz$/u, "ottiz")
    .replace(/^o‘ttiz$/u, "ottiz")
    .replace(/^toʻqson$/u, "toqson")
    .replace(/^to‘qson$/u, "toqson");
}

function parseUzbekNumberSequence(
  tokens: string[],
  startIndex: number
): {
  value: number;
  consumed: number;
} | null {
  let total = 0;
  let current = 0;
  let consumed = 0;
  let found = false;

  for (
    let index = startIndex;
    index < tokens.length;
    index += 1
  ) {
    const rawToken =
      canonicalNumberWord(
        tokens[index]
      );

    if (
      Object.prototype.hasOwnProperty.call(
        UZBEK_NUMBER_UNITS,
        rawToken
      )
    ) {
      current +=
        UZBEK_NUMBER_UNITS[
          rawToken
        ];
      consumed += 1;
      found = true;
      continue;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        UZBEK_NUMBER_TENS,
        rawToken
      )
    ) {
      current +=
        UZBEK_NUMBER_TENS[
          rawToken
        ];
      consumed += 1;
      found = true;
      continue;
    }

    if (rawToken === "yuz") {
      current =
        Math.max(
          1,
          current
        ) * 100;
      consumed += 1;
      found = true;
      continue;
    }

    if (rawToken === "ming") {
      total +=
        Math.max(
          1,
          current
        ) * 1000;
      current = 0;
      consumed += 1;
      found = true;
      continue;
    }

    break;
  }

  if (!found) {
    return null;
  }

  return {
    value: total + current,
    consumed,
  };
}

function normalizeNumberWords(
  value: string
) {
  const tokens =
    basicNormalize(value)
      .split(" ")
      .filter(Boolean);

  const output: string[] = [];

  let index = 0;

  while (index < tokens.length) {
    const parsed =
      parseUzbekNumberSequence(
        tokens,
        index
      );

    if (
      parsed &&
      parsed.consumed > 0
    ) {
      output.push(
        String(parsed.value)
      );
      index +=
        parsed.consumed;
      continue;
    }

    output.push(tokens[index]);
    index += 1;
  }

  return output.join(" ");
}

function normalizeAnswer(value: string) {
  return normalizeNumberWords(
    value
  )
    .replace(/\s+/g, " ")
    .trim();
}

function stripApostrophe(
  value: string
) {
  return value.replace(
    /'/g,
    ""
  );
}

function stemToken(
  rawToken: string
) {
  let token =
    stripApostrophe(
      rawToken
        .toLowerCase()
        .trim()
    );

  if (!token) {
    return "";
  }

  if (/^\d+(?:[.,]\d+)?$/.test(token)) {
    return token.replace(
      ",",
      "."
    );
  }

  /*
    O‘zbek tilidagi eng ko‘p uchraydigan qo‘shimchalardan
    faqat xavfsizroq qismini yengil kesamiz.
  */
  const suffixes = [
    "larining",
    "larning",
    "lardan",
    "larga",
    "larini",
    "lari",
    "lar",
    "ning",
    "dan",
    "ga",
    "ka",
    "qa",
    "da",
    "ni",
    "si",
  ];

  for (const suffix of suffixes) {
    if (
      token.length >=
        suffix.length + 4 &&
      token.endsWith(suffix)
    ) {
      token = token.slice(
        0,
        -suffix.length
      );
      break;
    }
  }

  const verbSuffixes = [
    "lanadi",
    "lanish",
    "lanishi",
    "iladi",
    "ilishi",
    "ishadi",
    "adi",
    "aydi",
    "ydi",
    "gan",
    "kan",
    "qan",
    "ish",
  ];

  for (
    const suffix of verbSuffixes
  ) {
    if (
      token.length >=
        suffix.length + 4 &&
      token.endsWith(suffix)
    ) {
      token = token.slice(
        0,
        -suffix.length
      );
      break;
    }
  }

  return token;
}

function tokenList(
  value: string
) {
  const normalized =
    normalizeAnswer(value);

  const rawTokens =
    normalized
      .split(" ")
      .filter(Boolean);

  const tokens: string[] = [];

  for (const rawToken of rawTokens) {
    const clean =
      stripApostrophe(
        rawToken
      );

    if (
      clean.endsWith("maydi") &&
      clean.length > 6
    ) {
      tokens.push(
        stemToken(
          clean.slice(
            0,
            -"maydi".length
          )
        )
      );
      tokens.push("emas");
      continue;
    }

    const stem =
      stemToken(rawToken);

    if (
      stem &&
      !LIGHT_STOP_WORDS.has(
        stem
      )
    ) {
      tokens.push(stem);
    }
  }

  return tokens.filter(
    Boolean
  );
}

function unique<T>(
  values: T[]
) {
  return Array.from(
    new Set(values)
  );
}

function levenshteinDistance(
  left: string,
  right: string
) {
  if (left === right) {
    return 0;
  }

  if (!left.length) {
    return right.length;
  }

  if (!right.length) {
    return left.length;
  }

  const previous =
    Array.from(
      {
        length:
          right.length + 1,
      },
      (_, index) => index
    );

  for (
    let i = 1;
    i <= left.length;
    i += 1
  ) {
    const current =
      new Array(
        right.length + 1
      ).fill(0);

    current[0] = i;

    for (
      let j = 1;
      j <= right.length;
      j += 1
    ) {
      const cost =
        left[i - 1] ===
        right[j - 1]
          ? 0
          : 1;

      current[j] =
        Math.min(
          current[j - 1] + 1,
          previous[j] + 1,
          previous[j - 1] +
            cost
        );
    }

    for (
      let j = 0;
      j < current.length;
      j += 1
    ) {
      previous[j] =
        current[j];
    }
  }

  return previous[
    right.length
  ];
}

function tokensEquivalent(
  leftRaw: string,
  rightRaw: string
) {
  const left =
    stemToken(leftRaw);
  const right =
    stemToken(rightRaw);

  if (!left || !right) {
    return false;
  }

  if (left === right) {
    return true;
  }

  const leftIsNumber =
    /^\d+(?:\.\d+)?$/.test(
      left
    );

  const rightIsNumber =
    /^\d+(?:\.\d+)?$/.test(
      right
    );

  if (
    leftIsNumber ||
    rightIsNumber
  ) {
    return (
      leftIsNumber &&
      rightIsNumber &&
      left === right
    );
  }

  if (
    left.length >= 5 &&
    right.length >= 5 &&
    (
      left.startsWith(right) ||
      right.startsWith(left)
    )
  ) {
    const difference =
      Math.abs(
        left.length -
          right.length
      );

    if (difference <= 4) {
      return true;
    }
  }

  if (
    left.length >= 5 &&
    right.length >= 5 &&
    levenshteinDistance(
      left,
      right
    ) <= 1
  ) {
    return true;
  }

  return false;
}

function extractNumbers(
  value: string
) {
  return unique(
    normalizeAnswer(value)
      .match(
        /\b\d+(?:\.\d+)?\b/g
      ) || []
  );
}

function isNumericQuestion(
  questionText: string
) {
  const normalized =
    normalizeAnswer(
      questionText
    );

  return (
    /\bnecha\b/.test(
      normalized
    ) ||
    /\bnechta\b/.test(
      normalized
    ) ||
    /\bqancha\b/.test(
      normalized
    )
  );
}

function splitConcepts(
  value: string
) {
  const cleaned =
    normalizeApostrophes(
      String(value || "")
    )
      .replace(/<[^>]*>/g, " ")
      .replace(
        /(?:^|\s)[•●▪◦]\s*/g,
        "; "
      )
      .replace(
        /\r?\n+/g,
        "; "
      )
      .replace(
        /(?:^|\s)\d{1,2}[.)-]\s*/g,
        "; "
      )
      .trim();

  let parts =
    cleaned
      .split(/[;]+/)
      .map(
        (item) =>
          item.trim()
      )
      .filter(Boolean);

  /*
    Agar etalon bitta uzun qatorda, vergullar bilan
    sanab yozilgan bo‘lsa, uni alohida mazmuniy bandlarga ajratamiz.
  */
  if (
    parts.length === 1
  ) {
    const commaParts =
      cleaned
        .split(/[,]+/)
        .map(
          (item) =>
            item.trim()
        )
        .filter(Boolean);

    if (
      commaParts.length >= 3
    ) {
      parts =
        commaParts;
    }
  }

  return parts;
}

function matchTokenCoverage(
  expectedTokens: string[],
  userTokens: string[]
) {
  const expected =
    unique(
      expectedTokens
    );

  if (
    expected.length === 0
  ) {
    return 0;
  }

  let matched = 0;

  for (
    const expectedToken of
    expected
  ) {
    const exists =
      userTokens.some(
        (userToken) =>
          tokensEquivalent(
            expectedToken,
            userToken
          )
      );

    if (exists) {
      matched += 1;
    }
  }

  return (
    matched /
    expected.length
  );
}

function conceptMatches(
  concept: string,
  userAnswer: string
) {
  const expectedTokens =
    tokenList(concept);
  const userTokens =
    tokenList(userAnswer);

  if (
    expectedTokens.length === 0 ||
    userTokens.length === 0
  ) {
    return false;
  }

  const expectedNumbers =
    extractNumbers(
      concept
    );

  const userNumbers =
    extractNumbers(
      userAnswer
    );

  /*
    Etalonda raqam bo‘lsa, foydalanuvchi aynan shu raqamni
    yozishi kerak. Masalan 5 yil o‘rniga 4 yil qabul qilinmaydi.
  */
  if (
    expectedNumbers.length > 0 &&
    !expectedNumbers.every(
      (number) =>
        userNumbers.includes(
          number
        )
    )
  ) {
    return false;
  }

  const coverage =
    matchTokenCoverage(
      expectedTokens,
      userTokens
    );

  if (
    expectedTokens.length === 1
  ) {
    return coverage === 1;
  }

  if (
    expectedTokens.length === 2
  ) {
    return coverage >= 0.5;
  }

  if (
    expectedTokens.length <= 4
  ) {
    return coverage >= 0.67;
  }

  return coverage >= 0.6;
}

function smartOpenAnswerMatches(
  questionText: string,
  userAnswer: string,
  acceptedAnswers:
    AcceptedOpenAnswer[]
) {
  const normalizedUser =
    normalizeAnswer(
      userAnswer
    );

  if (!normalizedUser) {
    return false;
  }

  /*
    1) Eng ishonchli usul — to‘liq normallashtirilgan moslik.
  */
  for (
    const accepted of
    acceptedAnswers
  ) {
    const normalizedAccepted =
      normalizeAnswer(
        accepted.answerText ||
          accepted.normalizedAnswer
      );

    if (
      normalizedAccepted &&
      normalizedAccepted ===
        normalizedUser
    ) {
      return true;
    }
  }

  /*
    2) "Necha?", "Nechta?", "Qancha?" tipidagi savollar.
       Masalan etalon: "5 yil muddatga saylanadi"
       Qabul qilinadi:
       - 5
       - 5 yil
       - besh
       - besh yil
  */
  if (
    isNumericQuestion(
      questionText
    )
  ) {
    for (
      const accepted of
      acceptedAnswers
    ) {
      const acceptedNumbers =
        extractNumbers(
          accepted.answerText ||
            accepted.normalizedAnswer
        );

      const userNumbers =
        extractNumbers(
          userAnswer
        );

      if (
        acceptedNumbers.length === 1 &&
        userNumbers.length === 1 &&
        acceptedNumbers[0] ===
          userNumbers[0]
      ) {
        return true;
      }
    }
  }

  /*
    3) Mazmuniy bandlar bo‘yicha bepul tekshiruv.
       Bandlar qaysi tartibda yozilgani muhim emas.
  */
  for (
    const accepted of
    acceptedAnswers
  ) {
    const acceptedText =
      accepted.answerText ||
      accepted.normalizedAnswer;

    if (!acceptedText) {
      continue;
    }

    const acceptedNumbers =
      extractNumbers(
        acceptedText
      );

    const userNumbers =
      extractNumbers(
        userAnswer
      );

    /*
      Etalondagi raqamlar o‘zgartirib yuborilgan bo‘lsa,
      umumiy gap o‘xshash bo‘lsa ham to‘g‘ri demaymiz.
    */
    if (
      acceptedNumbers.length > 0 &&
      !acceptedNumbers.every(
        (number) =>
          userNumbers.includes(
            number
          )
      )
    ) {
      continue;
    }

    const concepts =
      splitConcepts(
        acceptedText
      );

    if (
      concepts.length >= 2
    ) {
      const matchedConcepts =
        concepts.filter(
          (concept) =>
            conceptMatches(
              concept,
              userAnswer
            )
        ).length;

      /*
        Ro‘yxat tipidagi javobda barcha asosiy bandlar bo‘lishi kerak.
        Tartib muhim emas.
      */
      if (
        matchedConcepts ===
        concepts.length
      ) {
        return true;
      }

      continue;
    }

    /*
      Bitta gapli javoblarda so‘zlar tartibi muhim emas.
      60–67% mazmuniy token mosligi talab qilinadi.
    */
    if (
      conceptMatches(
        acceptedText,
        userAnswer
      )
    ) {
      return true;
    }
  }

  return false;
}

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{
      attemptId: string;
    }>;
  }
) {
  try {
    const userKey = getUserKey(request);

    if (!userKey) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Natijani yuborish uchun tizimga kirish kerak.",
        },
        { status: 401 }
      );
    }

    const { attemptId } =
      await context.params;

    if (!attemptId) {
      return NextResponse.json(
        {
          success: false,
          message: "Urinish ID topilmadi.",
        },
        { status: 400 }
      );
    }

    const attempts = await sql`
      SELECT
        a.id,
        a.test_id,
        a.user_key,
        a.status,
        a.started_at,
        t.title,
        t.duration_minutes,
        t.status AS test_status
      FROM national_certificate_attempts a
      INNER JOIN national_certificate_tests t
        ON t.id = a.test_id
      WHERE a.id = ${attemptId}
      LIMIT 1
    `;

    if (attempts.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Urinish topilmadi.",
        },
        { status: 404 }
      );
    }

    const attempt = attempts[0];

    if (
      String(attempt.user_key) !== userKey
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bu urinish sizga tegishli emas.",
        },
        { status: 403 }
      );
    }

    if (
      attempt.status !== "in_progress"
    ) {
      return NextResponse.json(
        {
          success: false,
          code: "ATTEMPT_ALREADY_FINISHED",
          message:
            "Bu urinish allaqachon yakunlangan.",
          status: attempt.status,
        },
        { status: 409 }
      );
    }

    const testId =
      String(attempt.test_id);

    const startedAt = new Date(
      String(attempt.started_at)
    );

    const durationMinutes =
      Number(attempt.duration_minutes);

    const expiresAt = new Date(
      startedAt.getTime() +
        durationMinutes * 60 * 1000
    );

    const now = new Date();

    const body =
      await request.json().catch(
        () => ({})
      );

    const automatic =
      body?.automatic === true;

    const isPastDeadline =
      now.getTime() >=
      expiresAt.getTime();

    const isAutomaticTransportWindow =
      automatic &&
      now.getTime() <=
        expiresAt.getTime() +
          AUTO_SUBMIT_TRANSPORT_GRACE_MS;

    /*
      QAT’IY VAQT NAZORATI

      Oddiy/manual submit expiresAt dan keyin mutlaqo
      qabul qilinmaydi.

      Faqat frontend 00:00 da allaqachon bloklangandan keyin
      yuborgan automatic=true so‘rovi 5 soniyagacha serverga
      yetib kelishi mumkin. Bu foydalanuvchiga test ishlash
      uchun qo‘shimcha vaqt bermaydi.
    */
    if (
      isPastDeadline &&
      !isAutomaticTransportWindow
    ) {
      await sql`
        UPDATE national_certificate_attempts
        SET
          status = 'expired',
          submitted_at = ${expiresAt.toISOString()}::timestamptz,
          correct_count = 0,
          incorrect_count = 0,
          unanswered_count = 45,
          raw_score = 0,
          percentage = 0,
          updated_at = NOW()
        WHERE
          id = ${attemptId}
          AND status = 'in_progress'
      `;

      return NextResponse.json(
        {
          success: false,
          code: "TIME_EXPIRED",
          message:
            "Test uchun ajratilgan vaqt tugagan.",
          expired: true,
          expiresAt:
            expiresAt.toISOString(),
        },
        { status: 409 }
      );
    }

    const rawAnswers: unknown[] =
      Array.isArray(body?.answers)
        ? body.answers
        : [];

    const parsedAnswers: SubmittedAnswer[] =
      rawAnswers.map(
        (raw: unknown): SubmittedAnswer => {
          const item =
            raw &&
            typeof raw === "object"
              ? (raw as RawAnswer)
              : {};

          return {
            questionId:
              typeof item.questionId ===
              "string"
                ? item.questionId.trim()
                : "",

            selectedOptionId:
              typeof item.selectedOptionId ===
                "string" &&
              item.selectedOptionId.trim()
                ? item.selectedOptionId.trim()
                : null,

            openAnswerText:
              typeof item.openAnswerText ===
              "string"
                ? item.openAnswerText.trim()
                : "",
          };
        }
      );

    /*
      Bir savol tasodifan ikki marta yuborilsa,
      oxirgi yuborilgan qiymat olinadi.
    */
    const submittedMap =
      new Map<string, SubmittedAnswer>();

    for (const answer of parsedAnswers) {
      if (!answer.questionId) {
        continue;
      }

      submittedMap.set(
        answer.questionId,
        answer
      );
    }

    const questions = await sql`
      SELECT
        id,
        question_number,
        question_type,
        question_text,
        question_html,
        points
      FROM national_certificate_questions
      WHERE test_id = ${testId}
      ORDER BY question_number ASC
    `;

    if (questions.length !== 45) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Test savollari bazada to‘liq emas.",
        },
        { status: 409 }
      );
    }

    const questionIdSet = new Set(
      questions.map((question) =>
        String(question.id)
      )
    );

    for (
      const questionId of
      submittedMap.keys()
    ) {
      if (
        !questionIdSet.has(questionId)
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Testga tegishli bo‘lmagan savol yuborildi.",
          },
          { status: 400 }
        );
      }
    }

    /*
      To‘g‘ri yopiq javoblarni server bazadan oladi.
      Bu ma’lumot foydalanuvchi brauzeriga yuborilmaydi.
    */
    const options = await sql`
      SELECT
        o.id,
        o.question_id,
        o.is_correct
      FROM national_certificate_options o
      INNER JOIN national_certificate_questions q
        ON q.id = o.question_id
      WHERE q.test_id = ${testId}
    `;

    /*
      Ochiq savollarning qabul qilinadigan javoblari
      ham faqat server ichida olinadi.
    */
    const acceptedAnswers = await sql`
      SELECT
        a.question_id,
        a.answer_text,
        a.normalized_answer
      FROM national_certificate_open_answers a
      INNER JOIN national_certificate_questions q
        ON q.id = a.question_id
      WHERE q.test_id = ${testId}
    `;

    const optionsByQuestion =
      new Map<
        string,
        {
          id: string;
          isCorrect: boolean;
        }[]
      >();

    for (const option of options) {
      const questionId =
        String(option.question_id);

      const current =
        optionsByQuestion.get(
          questionId
        ) || [];

      current.push({
        id: String(option.id),
        isCorrect:
          option.is_correct === true,
      });

      optionsByQuestion.set(
        questionId,
        current
      );
    }

    const openAnswersByQuestion =
      new Map<
        string,
        AcceptedOpenAnswer[]
      >();

    for (
      const accepted of
      acceptedAnswers
    ) {
      const questionId =
        String(
          accepted.question_id
        );

      const current =
        openAnswersByQuestion.get(
          questionId
        ) || [];

      current.push({
        answerText:
          String(
            accepted.answer_text ||
              ""
          ),
        normalizedAnswer:
          String(
            accepted.normalized_answer ||
              ""
          ),
      });

      openAnswersByQuestion.set(
        questionId,
        current
      );
    }

    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;
    let rawScore = 0;
    let maximumScore = 0;

    const rows: StoredAnswerRow[] =
      [];

    const questionResults: {
      questionId: string;
      questionNumber: number;
      answered: boolean;
      isCorrect: boolean | null;
      awardedPoints: number;
    }[] = [];

    for (const question of questions) {
      const questionId =
        String(question.id);

      const questionNumber =
        Number(
          question.question_number
        );

      const questionType =
        String(
          question.question_type
        );

      const questionPoints =
        Number(question.points);

      maximumScore +=
        Number.isFinite(
          questionPoints
        )
          ? questionPoints
          : 0;

      const submitted =
        submittedMap.get(
          questionId
        );

      if (
        questionType === "closed"
      ) {
        const selectedOptionId =
          submitted?.selectedOptionId ||
          null;

        if (!selectedOptionId) {
          unansweredCount += 1;

          rows.push({
            question_id:
              questionId,
            selected_option_id:
              null,
            open_answer_text:
              null,
            normalized_open_answer:
              null,
            is_correct:
              null,
            awarded_points: 0,
          });

          questionResults.push({
            questionId,
            questionNumber,
            answered: false,
            isCorrect: null,
            awardedPoints: 0,
          });

          continue;
        }

        const questionOptions =
          optionsByQuestion.get(
            questionId
          ) || [];

        const selectedOption =
          questionOptions.find(
            (option) =>
              option.id ===
              selectedOptionId
          );

        /*
          Variant boshqa savolga tegishli bo‘lsa
          yoki umuman mavjud bo‘lmasa, so‘rov rad qilinadi.
        */
        if (!selectedOption) {
          return NextResponse.json(
            {
              success: false,
              message:
                `${questionNumber}-savol uchun noto‘g‘ri javob varianti yuborildi.`,
            },
            { status: 400 }
          );
        }

        const isCorrect =
          selectedOption.isCorrect;

        const awardedPoints =
          isCorrect
            ? questionPoints
            : 0;

        if (isCorrect) {
          correctCount += 1;
          rawScore +=
            awardedPoints;
        } else {
          incorrectCount += 1;
        }

        rows.push({
          question_id:
            questionId,
          selected_option_id:
            selectedOptionId,
          open_answer_text:
            null,
          normalized_open_answer:
            null,
          is_correct:
            isCorrect,
          awarded_points:
            awardedPoints,
        });

        questionResults.push({
          questionId,
          questionNumber,
          answered: true,
          isCorrect,
          awardedPoints,
        });

        continue;
      }

      const openAnswerText =
        submitted?.openAnswerText ||
        "";

      if (!openAnswerText) {
        unansweredCount += 1;

        rows.push({
          question_id:
            questionId,
          selected_option_id:
            null,
          open_answer_text:
            null,
          normalized_open_answer:
            null,
          is_correct:
            null,
          awarded_points: 0,
        });

        questionResults.push({
          questionId,
          questionNumber,
          answered: false,
          isCorrect: null,
          awardedPoints: 0,
        });

        continue;
      }

      const normalized =
        normalizeAnswer(
          openAnswerText
        );

      const acceptedList =
        openAnswersByQuestion.get(
          questionId
        ) || [];

      const questionText =
        String(
          question.question_text ||
            question.question_html ||
            ""
        );

      const isCorrect =
        smartOpenAnswerMatches(
          questionText,
          openAnswerText,
          acceptedList
        );

      const awardedPoints =
        isCorrect
          ? questionPoints
          : 0;

      if (isCorrect) {
        correctCount += 1;
        rawScore +=
          awardedPoints;
      } else {
        incorrectCount += 1;
      }

      rows.push({
        question_id:
          questionId,
        selected_option_id:
          null,
        open_answer_text:
          openAnswerText,
        normalized_open_answer:
          normalized,
        is_correct:
          isCorrect,
        awarded_points:
          awardedPoints,
      });

      questionResults.push({
        questionId,
        questionNumber,
        answered: true,
        isCorrect,
        awardedPoints,
      });
    }

    const percentage =
      maximumScore > 0
        ? Math.min(
            100,
            Math.max(
              0,
              (rawScore /
                maximumScore) *
                100
            )
          )
        : 0;

    /*
      45 ta javob holatini bir marta DBga yuboramiz.
      Har savol uchun alohida 45 ta INSERT qilinmaydi.
    */
    const rowsJson =
      JSON.stringify(rows);

    await sql`
      INSERT INTO national_certificate_attempt_answers (
        attempt_id,
        question_id,
        selected_option_id,
        open_answer_text,
        normalized_open_answer,
        is_correct,
        awarded_points,
        answered_at
      )
      SELECT
        ${attemptId}::uuid,
        x.question_id::uuid,
        NULLIF(
          x.selected_option_id,
          ''
        )::uuid,
        NULLIF(
          x.open_answer_text,
          ''
        ),
        NULLIF(
          x.normalized_open_answer,
          ''
        ),
        x.is_correct,
        x.awarded_points,
        NOW()
      FROM jsonb_to_recordset(
        ${rowsJson}::jsonb
      ) AS x(
        question_id text,
        selected_option_id text,
        open_answer_text text,
        normalized_open_answer text,
        is_correct boolean,
        awarded_points numeric
      )
      ON CONFLICT (
        attempt_id,
        question_id
      )
      DO UPDATE SET
        selected_option_id =
          EXCLUDED.selected_option_id,
        open_answer_text =
          EXCLUDED.open_answer_text,
        normalized_open_answer =
          EXCLUDED.normalized_open_answer,
        is_correct =
          EXCLUDED.is_correct,
        awarded_points =
          EXCLUDED.awarded_points,
        answered_at = NOW()
    `;

    const finalized = await sql`
      UPDATE national_certificate_attempts
      SET
        status = 'submitted',
        submitted_at = NOW(),
        correct_count =
          ${correctCount},
        incorrect_count =
          ${incorrectCount},
        unanswered_count =
          ${unansweredCount},
        raw_score =
          ${rawScore},
        percentage =
          ${percentage},
        updated_at = NOW()
      WHERE
        id = ${attemptId}
        AND user_key = ${userKey}
        AND status = 'in_progress'
      RETURNING
        id,
        status,
        started_at,
        submitted_at,
        correct_count,
        incorrect_count,
        unanswered_count,
        raw_score,
        percentage
    `;

    if (finalized.length === 0) {
      return NextResponse.json(
        {
          success: false,
          code:
            "ATTEMPT_ALREADY_FINISHED",
          message:
            "Urinishni qayta yakunlab bo‘lmaydi.",
        },
        { status: 409 }
      );
    }

    const finalAttempt =
      finalized[0];

    /* =====================================================
       UMUMIY REYTING
       Milliy sertifikat ham shu umumiy reytingga kiradi.
    ===================================================== */

    let rankingSaved = false;

    const rankingUserId =
      String(
        request.cookies.get(
          "qurbonov_user_id"
        )?.value || ""
      ).trim();

    if (rankingUserId) {
      let rankingUserName =
        "Foydalanuvchi";

      try {
        const rawName =
          request.cookies.get(
            "qurbonov_name"
          )?.value;

        if (rawName) {
          try {
            rankingUserName =
              decodeURIComponent(
                rawName
              );
          } catch {
            rankingUserName =
              rawName;
          }
        }

        const role =
          request.cookies.get(
            "qurbonov_role"
          )?.value;

        if (
          role !== "admin"
        ) {
          const userRows =
            await sql`
              SELECT
                name,
                active,
                approved
              FROM access_codes
              WHERE id =
                ${rankingUserId}
              LIMIT 1
            `;

          if (
            userRows.length >
              0 &&
            userRows[0]
              .active ===
              true &&
            userRows[0]
              .approved ===
              true
          ) {
            rankingUserName =
              String(
                userRows[0]
                  .name ||
                  rankingUserName
              );
          }
        }

        /*
          Shu Milliy sertifikat attempt oldin
          reytingga yozilgan bo‘lsa takror yozmaymiz.
        */
        const existingRanking =
          await sql`
            SELECT id
            FROM ranking_attempts
            WHERE
              source =
                'national-certificate'
              AND
              source_attempt_id =
                ${attemptId}
            LIMIT 1
          `;

        if (
          existingRanking.length >
            0
        ) {
          rankingSaved = true;
        } else {
          const startedAt =
            new Date(
              String(
                finalAttempt
                  .started_at
              )
            );

          const submittedAt =
            new Date(
              String(
                finalAttempt
                  .submitted_at
              )
            );

          const spentSeconds =
            Math.max(
              0,
              Math.floor(
                (
                  submittedAt.getTime() -
                  startedAt.getTime()
                ) /
                  1000
              )
            );

          const rankingAttempts =
            await sql`
              INSERT INTO ranking_attempts (
                user_id,
                user_name,
                source,
                test_type,
                test_id,
                test_title,
                subject,
                total_questions,
                correct_count,
                incorrect_count,
                unanswered_count,
                percentage,
                earned_points,
                total_points,
                spent_seconds,
                source_attempt_id,
                started_at,
                finished_at,
                created_at
              )
              VALUES (
                ${rankingUserId},
                ${rankingUserName},
                'national-certificate',
                'national-certificate',
                ${testId},
                ${String(
                  attempt.title ||
                    "Milliy sertifikat"
                )},
                'Milliy sertifikat',
                45,
                ${Number(
                  finalAttempt
                    .correct_count
                )},
                ${Number(
                  finalAttempt
                    .incorrect_count
                )},
                ${Number(
                  finalAttempt
                    .unanswered_count
                )},
                ${Number(
                  finalAttempt
                    .percentage
                )},
                ${Number(
                  finalAttempt
                    .raw_score
                )},
                ${maximumScore},
                ${spentSeconds},
                ${attemptId},
                ${startedAt.toISOString()}::timestamptz,
                ${submittedAt.toISOString()}::timestamptz,
                NOW()
              )
              RETURNING id
            `;

          const rankingAttemptId =
            String(
              rankingAttempts[0]
                ?.id || ""
            );

          if (
            !rankingAttemptId
          ) {
            throw new Error(
              "Milliy sertifikat ranking attempt yaratilmadi."
            );
          }

          try {
            const numberByQuestion =
              new Map<
                string,
                number
              >();

            for (
              const question of
                questions
            ) {
              numberByQuestion.set(
                String(
                  question.id
                ),
                Number(
                  question
                    .question_number
                ) || 0
              );
            }

            /*
              Reytingda faqat real javob berilgan
              savollar saqlanadi.
            */
            const rankingQuestionRows =
              rows
                .filter(
                  (row) =>
                    row.is_correct !==
                    null
                )
                .map(
                  (row) => ({
                    question_id:
                      String(
                        row.question_id
                      ),

                    question_number:
                      numberByQuestion.get(
                        String(
                          row.question_id
                        )
                      ) || 0,

                    answer_status:
                      row.is_correct ===
                      true
                        ? "correct"
                        : "incorrect",

                    selected_answer:
                      row.selected_option_id ||
                      row.open_answer_text ||
                      null,

                    correct_answer:
                      null,

                    points:
                      Number(
                        row.awarded_points
                      ) || 0,
                  })
                );

            if (
              rankingQuestionRows.length >
              0
            ) {
              const rankingJson =
                JSON.stringify(
                  rankingQuestionRows
                );

              await sql`
                INSERT INTO ranking_question_results (
                  ranking_attempt_id,
                  user_id,
                  user_name,
                  source,
                  test_type,
                  test_id,
                  test_title,
                  question_id,
                  question_number,
                  answer_status,
                  selected_answer,
                  correct_answer,
                  points,
                  answered_at,
                  created_at
                )
                SELECT
                  ${rankingAttemptId}::bigint,
                  ${rankingUserId},
                  ${rankingUserName},
                  'national-certificate',
                  'national-certificate',
                  ${testId},
                  ${String(
                    attempt.title ||
                      "Milliy sertifikat"
                  )},
                  x.question_id,
                  x.question_number,
                  x.answer_status,
                  x.selected_answer,
                  x.correct_answer,
                  x.points,
                  ${submittedAt.toISOString()}::timestamptz,
                  NOW()
                FROM jsonb_to_recordset(
                  ${rankingJson}::jsonb
                ) AS x(
                  question_id text,
                  question_number integer,
                  answer_status text,
                  selected_answer text,
                  correct_answer text,
                  points numeric
                )
              `;
            }

            rankingSaved =
              true;
          } catch (
            rankingQuestionError
          ) {
            /*
              Savollar yozilmasa yarim ranking attempt
              qolib ketmasin.
            */
            await sql`
              DELETE FROM
                ranking_attempts
              WHERE id =
                ${rankingAttemptId}
            `;

            throw rankingQuestionError;
          }
        }
      } catch (
        rankingError
      ) {
        /*
          Reyting xatosi Milliy sertifikatning
          asosiy natijasini bekor qilmaydi.
        */
        console.error(
          "NATIONAL CERTIFICATE RANKING ERROR:",
          rankingError
        );
      }
    } else {
      console.error(
        "NATIONAL CERTIFICATE RANKING: qurbonov_user_id cookie topilmadi."
      );
    }

    return NextResponse.json({
      success: true,
      rankingSaved,

      message:
        "Test muvaffaqiyatli yakunlandi.",

      result: {
        attemptId:
          finalAttempt.id,

        testId,

        title:
          attempt.title,

        status:
          finalAttempt.status,

        correctCount:
          Number(
            finalAttempt.correct_count
          ),

        incorrectCount:
          Number(
            finalAttempt.incorrect_count
          ),

        unansweredCount:
          Number(
            finalAttempt.unanswered_count
          ),

        totalQuestions: 45,

        rawScore:
          Number(
            finalAttempt.raw_score
          ),

        maximumScore,

        percentage:
          Number(
            finalAttempt.percentage
          ),

        startedAt:
          new Date(
            String(
              finalAttempt.started_at
            )
          ).toISOString(),

        submittedAt:
          new Date(
            String(
              finalAttempt.submitted_at
            )
          ).toISOString(),

        questionResults,
      },
    });
  } catch (error) {
    console.error(
      "National certificate submit POST error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Testni yakunlashda server xatosi yuz berdi.",
      },
      { status: 500 }
    );
  }
}
