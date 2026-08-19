import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

/* =========================================================
   TEST MA'LUMOTLARI UCHUN TIPLAR
========================================================= */

export type TestOption = {
  id: string;
  text: string;
  isCorrect: boolean;
};

export type TestShape = {
  id: string;

  type:
    | "rectangle"
    | "roundedRectangle"
    | "circle"
    | "ellipse"
    | "venn"
    | "text";

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

  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";

  textAlign:
    | "left"
    | "center"
    | "right";
};

export type TestQuestion = {
  id: string;

  questionHtml: string;

  options: TestOption[];

  shapes: TestShape[];

  points: number;
};

export type TestData = {
  id: string;

  title: string;
  subject: string;

  duration: number;

  description: string;

  questions: TestQuestion[];

  status:
    | "draft"
    | "published";

  createdAt: string;
  updatedAt: string;
};


/* =========================================================
   TESTLAR SAQLANADIGAN FAYL
========================================================= */

const DATA_DIRECTORY = path.join(
  process.cwd(),
  "data-storage"
);

const TESTS_FILE = path.join(
  DATA_DIRECTORY,
  "tests.json"
);


/* =========================================================
   PAPKA VA FAYL BORLIGINI TEKSHIRISH
========================================================= */

async function ensureStorage() {

  await fs.mkdir(
    DATA_DIRECTORY,
    {
      recursive: true,
    }
  );

  try {

    await fs.access(TESTS_FILE);

  } catch {

    await fs.writeFile(
      TESTS_FILE,
      "[]",
      "utf8"
    );

  }

}


/* =========================================================
   TESTLARNI O'QISH
========================================================= */

async function readTests(): Promise<TestData[]> {

  await ensureStorage();

  try {

    const file = await fs.readFile(
      TESTS_FILE,
      "utf8"
    );

    if (!file.trim()) {
      return [];
    }

    const parsed = JSON.parse(file);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;

  } catch (error) {

    console.error(
      "Testlarni o'qishda xato:",
      error
    );

    return [];

  }

}


/* =========================================================
   TESTLARNI SAQLASH
========================================================= */

async function writeTests(
  tests: TestData[]
) {

  await ensureStorage();

  await fs.writeFile(
    TESTS_FILE,
    JSON.stringify(
      tests,
      null,
      2
    ),
    "utf8"
  );

}


/* =========================================================
   GET
   BARCHA TESTLARNI OLISH
========================================================= */

export async function GET() {

  try {

    const tests = await readTests();

    /*
      Eng oxirgi o'zgartirilgan test
      tepada chiqadi.
    */

    const sortedTests = [...tests].sort(
      (a, b) => {

        return (
          new Date(
            b.updatedAt
          ).getTime() -
          new Date(
            a.updatedAt
          ).getTime()
        );

      }
    );

    return NextResponse.json(
      {
        success: true,

        count:
          sortedTests.length,

        tests:
          sortedTests,
      },
      {
        status: 200,
      }
    );

  } catch (error) {

    console.error(
      "GET /api/tests xatosi:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Testlarni yuklab bo'lmadi.",
      },
      {
        status: 500,
      }
    );

  }

}


/* =========================================================
   POST
   YANGI TEST YARATISH
========================================================= */

export async function POST(
  request: NextRequest
) {

  try {

    const body =
      await request.json();

    /* -----------------------------
       TEST NOMI
    ----------------------------- */

    const title =
      typeof body.title === "string"
        ? body.title.trim()
        : "";

    if (!title) {

      return NextResponse.json(
        {
          success: false,

          message:
            "Test nomini kiriting.",
        },
        {
          status: 400,
        }
      );

    }


    /* -----------------------------
       FAN
    ----------------------------- */

    const subject =
      typeof body.subject === "string"
        ? body.subject.trim()
        : "";


    /* -----------------------------
       VAQT
    ----------------------------- */

    const rawDuration =
      Number(body.duration);

    const duration =
      Number.isFinite(rawDuration) &&
      rawDuration > 0
        ? Math.round(rawDuration)
        : 30;


    /* -----------------------------
       IZOH
    ----------------------------- */

    const description =
      typeof body.description ===
      "string"
        ? body.description
        : "";


    /* -----------------------------
       SAVOLLAR
    ----------------------------- */

    const questions =
      Array.isArray(body.questions)
        ? body.questions
        : [];


    /* -----------------------------
       STATUS
    ----------------------------- */

    const status:
      | "draft"
      | "published" =
      body.status === "published"
        ? "published"
        : "draft";


    /* -----------------------------
       VAQT
    ----------------------------- */

    const now =
      new Date().toISOString();


    /* -----------------------------
       ID
    ----------------------------- */

    const id =
      crypto.randomUUID();


    /* -----------------------------
       YANGI TEST
    ----------------------------- */

    const newTest: TestData = {

      id,

      title,

      subject,

      duration,

      description,

      questions,

      status,

      createdAt: now,

      updatedAt: now,

    };


    /* -----------------------------
       OLDINGI TESTLAR
    ----------------------------- */

    const tests =
      await readTests();


    /* -----------------------------
       YANGI TESTNI QO'SHAMIZ
    ----------------------------- */

    tests.push(newTest);


    /* -----------------------------
       FAYLGA SAQLAYMIZ
    ----------------------------- */

    await writeTests(tests);


    /* -----------------------------
       JAVOB
    ----------------------------- */

    return NextResponse.json(
      {
        success: true,

        message:
          "Test muvaffaqiyatli yaratildi.",

        test:
          newTest,
      },
      {
        status: 201,
      }
    );

  } catch (error) {

    console.error(
      "POST /api/tests xatosi:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Testni saqlashda xatolik yuz berdi.",
      },
      {
        status: 500,
      }
    );

  }

}