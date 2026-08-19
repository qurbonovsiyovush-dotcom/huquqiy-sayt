import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TestResult = {
  id: string;
  userName: string;
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
  finishedAt: string;
};

const DATA_DIR = path.join(process.cwd(), "data-storage");
const DATA_FILE = path.join(DATA_DIR, "test-results.json");

async function readResults(): Promise<TestResult[]> {
  try {
    const text = await fs.readFile(DATA_FILE, "utf8");
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeResults(results: TestResult[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(
    DATA_FILE,
    JSON.stringify(results, null, 2),
    "utf8"
  );
}

function number(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function POST(request: NextRequest) {
  try {
    const session = request.cookies.get("qurbonov_session")?.value;

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Avval tizimga kiring." },
        { status: 401 }
      );
    }

    const encodedName =
      request.cookies.get("qurbonov_name")?.value || "Foydalanuvchi";

    let userName = "Foydalanuvchi";

    try {
      userName = decodeURIComponent(encodedName);
    } catch {
      userName = encodedName;
    }

    const body = await request.json();

    const testId = String(body?.testId || "").trim();
    const testTitle = String(body?.testTitle || "").trim();
    const subject = String(body?.subject || "").trim();

    if (!testId || !testTitle) {
      return NextResponse.json(
        { success: false, message: "Test ma’lumotlari yetarli emas." },
        { status: 400 }
      );
    }

    const total = Math.max(0, number(body?.total));
    const correct = Math.max(0, number(body?.correct));
    const incorrect = Math.max(0, number(body?.incorrect));
    const unanswered = Math.max(0, number(body?.unanswered));
    const percentage = Math.min(100, Math.max(0, number(body?.percentage)));
    const earnedPoints = Math.max(0, number(body?.earnedPoints));
    const totalPoints = Math.max(0, number(body?.totalPoints));
    const spentSeconds = Math.max(0, Math.floor(number(body?.spentSeconds)));

    const result: TestResult = {
      id: crypto.randomUUID(),
      userName,
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
      finishedAt: new Date().toISOString(),
    };

    const results = await readResults();
    results.unshift(result);
    await writeResults(results);

    return NextResponse.json(
      { success: true, result },
      { status: 201 }
    );
  } catch (error) {
    console.error("RESULT POST ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Natijani saqlashda server xatosi." },
      { status: 500 }
    );
  }
}