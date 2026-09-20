import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  get,
  put,
} from "@vercel/blob";

import crypto from "crypto";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESULTS_BLOB_PATH =
  "huquqiy-sayt/test-results.json";

/* =========================================================
   TYPES
========================================================= */

type TestResult = {
  id: string;

  userId?: string;
  userName: string;

  source?: string;
  testType?: string;

  testId: string;
  testTitle: string;
  subject: string;

  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;

  percentage: number;

  earnedPoints: number;
  totalPoints: number;

  spentSeconds: number;

  answers?: Record<
    string,
    unknown
  >;

  finishedAt: string;
};

type VerifiedQuestion = {
  questionId: string;
  questionNumber: number;
  selectedAnswer:
    | string
    | null;
  correctAnswer:
    | string
    | null;
  answerStatus:
    | "correct"
    | "incorrect"
    | "unanswered";
  points: number;
};

/* =========================================================
   HELPERS
========================================================= */

function safeNumber(
  value: unknown,
  fallback = 0
) {
  const parsed =
    Number(value);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : fallback;
}

function decodeCookieValue(
  value:
    | string
    | undefined,
  fallback: string
) {
  if (!value) {
    return fallback;
  }

  try {
    return decodeURIComponent(
      value
    );
  } catch {
    return value;
  }
}

/* =========================================================
   BLOB'DAN NATIJALARNI O‘QISH
========================================================= */

async function readResults():
  Promise<TestResult[]> {
  if (
    !process.env
      .BLOB_READ_WRITE_TOKEN
  ) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN topilmadi."
    );
  }

  try {
    const result =
      await get(
        RESULTS_BLOB_PATH,
        {
          access:
            "private",
        }
      );

    if (
      !result ||
      result.statusCode !==
        200 ||
      !result.stream
    ) {
      return [];
    }

    const text =
      await new Response(
        result.stream
      ).text();

    if (!text.trim()) {
      return [];
    }

    const parsed =
      JSON.parse(text);

    return Array.isArray(
      parsed
    )
      ? parsed
      : [];
  } catch (error) {
    /*
      Blob hali yaratilmagan
      bo‘lsa birinchi natijadan
      boshlaymiz.
    */

    console.log(
      "Natijalar Blob hali mavjud emas:",
      error
    );

    return [];
  }
}

/* =========================================================
   NATIJALARNI BLOB'GA YOZISH
========================================================= */

async function writeResults(
  results: TestResult[]
) {
  if (
    !process.env
      .BLOB_READ_WRITE_TOKEN
  ) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN topilmadi."
    );
  }

  await put(
    RESULTS_BLOB_PATH,
    JSON.stringify(
      results,
      null,
      2
    ),
    {
      access:
        "private",
      addRandomSuffix:
        false,
      allowOverwrite:
        true,
      contentType:
        "application/json; charset=utf-8",
      cacheControlMaxAge:
        60,
    }
  );
}

/* =========================================================
   POST
   TEST NATIJASINI SAQLASH

   1) Foydalanuvchini tekshiradi
   2) Testni Neon'dan oladi
   3) answers mavjud bo‘lsa serverning o‘zi tekshiradi
   4) Eski Test natijalari bo‘limi uchun Blob'ga yozadi
   5) Reyting uchun Neon'ga savolma-savol yozadi
========================================================= */

export async function POST(
  request: NextRequest
) {
  try {
    /* =====================================================
       SESSION
    ===================================================== */

    const session =
      request.cookies.get(
        "qurbonov_session"
      )?.value;

    const role =
      request.cookies.get(
        "qurbonov_role"
      )?.value;

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Avval tizimga kiring.",
        },
        {
          status: 401,
        }
      );
    }

    /* =====================================================
       USER ID
    ===================================================== */

    let userId =
      String(
        request.cookies.get(
          "qurbonov_user_id"
        )?.value || ""
      ).trim();

    if (
      role === "admin" &&
      !userId
    ) {
      userId = "admin";
    }

    /*
      Eski session bilan kirib turgan
      foydalanuvchida bu cookie
      bo‘lmasligi mumkin.

      Logout -> qayta login qilinsa
      avtomatik paydo bo‘ladi.
    */

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          code:
            "USER_ID_MISSING",
          message:
            "Foydalanuvchi ID topilmadi. Tizimdan chiqib qayta kiring.",
        },
        {
          status: 401,
        }
      );
    }

    /* =====================================================
       FOYDALANUVCHI ISMI

       Oddiy user bo‘lsa ismni cookie'dan emas,
       Neon access_codes jadvalidan olamiz.
    ===================================================== */

    let userName =
      decodeCookieValue(
        request.cookies.get(
          "qurbonov_name"
        )?.value,
        "Foydalanuvchi"
      );

    if (
      role !== "admin"
    ) {
      const userRows =
        await sql`
          SELECT
            id,
            name,
            active,
            approved
          FROM access_codes
          WHERE id = ${userId}
          LIMIT 1
        `;

      if (
        userRows.length === 0
      ) {
        return NextResponse.json(
          {
            success:
              false,
            message:
              "Foydalanuvchi topilmadi.",
          },
          {
            status: 401,
          }
        );
      }

      const user: any =
        userRows[0];

      if (
        user.active !==
          true ||
        user.approved !==
          true
      ) {
        return NextResponse.json(
          {
            success:
              false,
            message:
              "Foydalanuvchi uchun test natijasini saqlashga ruxsat yo‘q.",
          },
          {
            status: 403,
          }
        );
      }

      userName =
        String(
          user.name ||
            "Foydalanuvchi"
        );
    }

    /* =====================================================
       BODY
    ===================================================== */

    const body =
      await request.json();

    const requestedTestId =
      String(
        body?.testId || ""
      ).trim();

    if (!requestedTestId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Test ID topilmadi.",
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       TESTNI NEON'DAN OLAMIZ

       testTitle / subject / testType'ni
       clientdan ishonib olmaymiz.
    ===================================================== */

    const testRows =
      await sql`
        SELECT
          id,
          title,
          subject,
          test_type,
          custom_test_type_name,
          status
        FROM legacy_tests
        WHERE id =
          ${requestedTestId}
        LIMIT 1
      `;

    if (
      testRows.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Test topilmadi.",
        },
        {
          status: 404,
        }
      );
    }

    const test: any =
      testRows[0];

    if (
      role !== "admin" &&
      test.status !==
        "published"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Bu test foydalanuvchilar uchun e’lon qilinmagan.",
        },
        {
          status: 403,
        }
      );
    }

    const testId =
      String(test.id);

    const testTitle =
      String(
        test.title ||
          "Nomsiz test"
      );

    const subject =
      String(
        test.subject || ""
      );

    const testType =
      String(
        test.test_type ||
          test.custom_test_type_name ||
          "other"
      );

    /* =====================================================
       ANSWERS
    ===================================================== */

    let answers:
      | Record<
          string,
          unknown
        >
      | undefined;

    if (
      body?.answers &&
      typeof body.answers ===
        "object" &&
      !Array.isArray(
        body.answers
      )
    ) {
      answers =
        body.answers as Record<
          string,
          unknown
        >;
    }

    /*
      Hozirgi eski frontend answers yubormasa
      sayt buzilib qolmasligi uchun
      vaqtincha backward-compatible ishlaymiz.

      Keyingi qadamda frontend ham answers yuboradi.
    */

    let total =
      Math.max(
        0,
        safeNumber(
          body?.total
        )
      );

    let correct =
      Math.max(
        0,
        safeNumber(
          body?.correct
        )
      );

    let incorrect =
      Math.max(
        0,
        safeNumber(
          body?.incorrect
        )
      );

    let unanswered =
      Math.max(
        0,
        safeNumber(
          body?.unanswered
        )
      );

    let percentage =
      Math.min(
        100,
        Math.max(
          0,
          safeNumber(
            body?.percentage
          )
        )
      );

    let earnedPoints =
      Math.max(
        0,
        safeNumber(
          body?.earnedPoints
        )
      );

    let totalPoints =
      Math.max(
        0,
        safeNumber(
          body?.totalPoints
        )
      );

    const spentSeconds =
      Math.max(
        0,
        Math.floor(
          safeNumber(
            body?.spentSeconds
          )
        )
      );

    let verifiedQuestions:
      VerifiedQuestion[] =
        [];

    let serverVerified =
      false;

    /* =====================================================
       SERVER TOMONIDA SAVOLMA-SAVOL TEKSHIRISH
    ===================================================== */

    if (answers) {
      const questionRows =
        await sql`
          SELECT
            id,
            question_number,
            points
          FROM legacy_test_questions
          WHERE test_id =
            ${testId}
          ORDER BY
            question_number ASC,
            id ASC
        `;

      const questionIds =
        questionRows.map(
          (row: any) =>
            Number(row.id)
        );

      let correctOptionRows:
        any[] = [];

      if (
        questionIds.length >
          0
      ) {
        correctOptionRows =
          await sql`
            SELECT
              id,
              question_id
            FROM legacy_test_options
            WHERE
              question_id =
                ANY(
                  ${questionIds}
                )
              AND
              is_correct =
                TRUE
            ORDER BY
              question_id ASC,
              id ASC
          `;
      }

      /*
        Bir savolda bir nechta
        to‘g‘ri variant bo‘lsa ham
        ishlashi uchun Set ishlatamiz.
      */

      const correctOptions =
        new Map<
          string,
          Set<string>
        >();

      for (
        const option of
          correctOptionRows
      ) {
        const qid =
          String(
            option.question_id
          );

        const current =
          correctOptions.get(
            qid
          ) ||
          new Set<string>();

        current.add(
          String(
            option.id
          )
        );

        correctOptions.set(
          qid,
          current
        );
      }

      let verifiedCorrect =
        0;

      let verifiedIncorrect =
        0;

      let verifiedUnanswered =
        0;

      let verifiedEarned =
        0;

      let verifiedTotalPoints =
        0;

      for (
        const question of
          questionRows
      ) {
        const questionId =
          String(
            question.id
          );

        const questionNumber =
          Number(
            question.question_number
          ) || 0;

        const points =
          Number(
            question.points
          ) > 0
            ? Number(
                question.points
              )
            : 1;

        verifiedTotalPoints +=
          points;

        const rawSelected =
          answers[
            questionId
          ];

        const selected =
          rawSelected ===
            undefined ||
          rawSelected ===
            null ||
          String(
            rawSelected
          ).trim() === ""
            ? null
            : String(
                rawSelected
              );

        const correctSet =
          correctOptions.get(
            questionId
          ) ||
          new Set<string>();

        const correctAnswer =
          correctSet.size >
            0
            ? Array.from(
                correctSet
              ).join(",")
            : null;

        if (!selected) {
          verifiedUnanswered++;

          verifiedQuestions.push(
            {
              questionId,
              questionNumber,
              selectedAnswer:
                null,
              correctAnswer,
              answerStatus:
                "unanswered",
              points: 0,
            }
          );

          continue;
        }

        if (
          correctSet.has(
            selected
          )
        ) {
          verifiedCorrect++;
          verifiedEarned +=
            points;

          verifiedQuestions.push(
            {
              questionId,
              questionNumber,
              selectedAnswer:
                selected,
              correctAnswer,
              answerStatus:
                "correct",
              points,
            }
          );
        } else {
          verifiedIncorrect++;

          verifiedQuestions.push(
            {
              questionId,
              questionNumber,
              selectedAnswer:
                selected,
              correctAnswer,
              answerStatus:
                "incorrect",
              points: 0,
            }
          );
        }
      }

      total =
        questionRows.length;

      correct =
        verifiedCorrect;

      incorrect =
        verifiedIncorrect;

      unanswered =
        verifiedUnanswered;

      earnedPoints =
        verifiedEarned;

      totalPoints =
        verifiedTotalPoints;

      percentage =
        total > 0
          ? Math.round(
              (
                correct /
                total
              ) *
                100
            )
          : 0;

      serverVerified =
        true;
    }

    /* =====================================================
       YANGI NATIJA ID VA VAQT
    ===================================================== */

    const resultId =
      crypto.randomUUID();

    const finishedAt =
      new Date()
        .toISOString();

    /* =====================================================
       ESKI TEST NATIJALARI BO‘LIMI UCHUN BLOB
    ===================================================== */

    const result:
      TestResult = {
      id:
        resultId,

      userId,
      userName,

      source:
        "legacy",

      testType,

      testId,
      testTitle,
      subject,

      total,
      correct,
      incorrect,
      unanswered,

      percentage,

      earnedPoints,
      totalPoints,

      spentSeconds,

      /*
        Reyting Neon'ga yozilmay qolsa,
        keyinchalik tiklash imkoniyati
        bo‘lishi uchun answers Blob'da
        ham saqlanadi.
      */
      answers,

      finishedAt,
    };

    const results =
      await readResults();

    results.unshift(
      result
    );

    await writeResults(
      results
    );

    /* =====================================================
       REYTINGNI NEON'GA YOZISH

       Faqat answers mavjud bo‘lsa.
       Shunda natija server tomonidan
       savolma-savol tekshirilgan bo‘ladi.
    ===================================================== */

    let rankingSaved =
      false;

    let rankingAttemptId:
      string | null =
        null;

    if (
      serverVerified &&
      verifiedQuestions.length >
        0
    ) {
      try {
        const attempts =
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
              finished_at,
              created_at
            )
            VALUES (
              ${userId},
              ${userName},
              'legacy',
              ${testType},
              ${testId},
              ${testTitle},
              ${subject},
              ${total},
              ${correct},
              ${incorrect},
              ${unanswered},
              ${percentage},
              ${earnedPoints},
              ${totalPoints},
              ${spentSeconds},
              ${resultId},
              ${finishedAt}::timestamptz,
              NOW()
            )
            RETURNING id
          `;

        rankingAttemptId =
          String(
            attempts[0]?.id ||
              ""
          );

        if (
          !rankingAttemptId
        ) {
          throw new Error(
            "Ranking attempt ID yaratilmadi."
          );
        }

        /*
          Har bir savol natijasini
          alohida yozamiz.
        */

        for (
          const question of
            verifiedQuestions
        ) {
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
            VALUES (
              ${rankingAttemptId},
              ${userId},
              ${userName},
              'legacy',
              ${testType},
              ${testId},
              ${testTitle},
              ${question.questionId},
              ${question.questionNumber},
              ${question.answerStatus},
              ${question.selectedAnswer},
              ${question.correctAnswer},
              ${question.points},
              ${finishedAt}::timestamptz,
              NOW()
            )
          `;
        }

        rankingSaved =
          true;
      } catch (
        rankingError
      ) {
        console.error(
          "RANKING SAVE ERROR:",
          rankingError
        );

        /*
          Yarim yozilgan attempt qolib
          ketmasligi uchun o‘chiramiz.
          ON DELETE CASCADE sabab
          question_results ham o‘chadi.
        */

        if (
          rankingAttemptId
        ) {
          try {
            await sql`
              DELETE FROM
                ranking_attempts
              WHERE id =
                ${rankingAttemptId}
            `;
          } catch (
            cleanupError
          ) {
            console.error(
              "RANKING CLEANUP ERROR:",
              cleanupError
            );
          }
        }
      }
    }

    /* =====================================================
       LOG
    ===================================================== */

    console.log(
      "NATIJA SAQLANDI:",
      {
        id:
          result.id,

        userId:
          result.userId,

        userName:
          result.userName,

        testTitle:
          result.testTitle,

        correct:
          result.correct,

        percentage:
          result.percentage,

        serverVerified,

        rankingSaved,
      }
    );

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json(
      {
        success: true,

        message:
          rankingSaved
            ? "Natija va reyting muvaffaqiyatli saqlandi."
            : "Natija saqlandi.",

        serverVerified,

        rankingSaved,

        result: {
          id:
            result.id,

          userId:
            result.userId,

          userName:
            result.userName,

          testId:
            result.testId,

          testTitle:
            result.testTitle,

          subject:
            result.subject,

          testType:
            result.testType,

          total:
            result.total,

          correct:
            result.correct,

          incorrect:
            result.incorrect,

          unanswered:
            result.unanswered,

          percentage:
            result.percentage,

          earnedPoints:
            result.earnedPoints,

          totalPoints:
            result.totalPoints,

          spentSeconds:
            result.spentSeconds,

          finishedAt:
            result.finishedAt,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "RESULT POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Natijani saqlashda server xatosi.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   GET
   HOZIRCHA TEKSHIRISH UCHUN
========================================================= */

export async function GET(
  request: NextRequest
) {
  try {
    const session =
      request.cookies.get(
        "qurbonov_session"
      )?.value;

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Avval tizimga kiring.",
        },
        {
          status: 401,
        }
      );
    }

    const results =
      await readResults();

    return NextResponse.json(
      {
        success: true,
        count:
          results.length,
        results,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error(
      "RESULT GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Natijalarni yuklashda server xatosi.",
      },
      {
        status: 500,
      }
    );
  }
}
