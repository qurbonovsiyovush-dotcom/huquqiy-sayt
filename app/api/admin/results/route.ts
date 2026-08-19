import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

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

function adminAllowed(request: NextRequest) {
  const session = request.cookies.get("qurbonov_session")?.value;
  const role = request.cookies.get("qurbonov_role")?.value;
  return Boolean(session) && role === "admin";
}

export async function GET(request: NextRequest) {
  if (!adminAllowed(request)) {
    return NextResponse.json(
      { success: false, message: "Administrator huquqi talab qilinadi." },
      { status: 403 }
    );
  }

  const results = await readResults();

  return NextResponse.json({
    success: true,
    results,
  });
}

export async function DELETE(request: NextRequest) {
  if (!adminAllowed(request)) {
    return NextResponse.json(
      { success: false, message: "Administrator huquqi talab qilinadi." },
      { status: 403 }
    );
  }

  try {
    const url = new URL(request.url);
    const id = String(url.searchParams.get("id") || "").trim();
    const all = url.searchParams.get("all") === "1";

    if (all) {
      await writeResults([]);
      return NextResponse.json({ success: true });
    }

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Natija ID topilmadi." },
        { status: 400 }
      );
    }

    const results = await readResults();
    const nextResults = results.filter((item) => item.id !== id);

    if (nextResults.length === results.length) {
      return NextResponse.json(
        { success: false, message: "Natija topilmadi." },
        { status: 404 }
      );
    }

    await writeResults(nextResults);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("RESULT DELETE ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Natijani o‘chirishda server xatosi." },
      { status: 500 }
    );
  }
}