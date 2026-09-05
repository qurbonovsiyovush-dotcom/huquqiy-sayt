"use client";

import { useState } from "react";

const CHUNK_SIZE = 20;

async function readJsonResponse(response: Response) {
  const text = await response.text();
  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Server JSON qaytarmadi. HTTP ${response.status}. ` +
      (text ? text.slice(0, 180) : "Javob bo‘sh.")
    );
  }
  if (!response.ok || !data?.success) {
    throw new Error(data?.message || `HTTP ${response.status}`);
  }
  return data;
}

async function api(body: any) {
  const response = await fetch("/api/tests/import-backup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  return readJsonResponse(response);
}

export default function LegacyBackupImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);

  async function runImport() {
    if (!file) {
      setMessage("tests.json faylini tanlang.");
      return;
    }

    try {
      setBusy(true);
      setProgress(0);
      setMessage("Fayl brauzerda o‘qilmoqda...");

      const parsed = JSON.parse(await file.text());
      const tests = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.tests)
          ? parsed.tests
          : parsed?.test
            ? [parsed.test]
            : [];

      if (!tests.length) throw new Error("Faylda test topilmadi.");

      const eligible = tests.filter((test: any) => {
        const type = String(test?.testType ?? "").trim().toLowerCase();
        return test?.id &&
          type !== "thematic" &&
          type !== "national-certificate" &&
          type !== "national_certificate";
      });

      if (!eligible.length) throw new Error("Tiklash uchun eski test topilmadi.");

      const totalQuestions = eligible.reduce(
        (sum: number, test: any) =>
          sum + (Array.isArray(test?.questions) ? test.questions.length : 0),
        0
      );

      let doneQuestions = 0;
      let totalOptions = 0;

      for (let t = 0; t < eligible.length; t++) {
        const test = eligible[t];
        const questions = Array.isArray(test?.questions) ? test.questions : [];

        setMessage(
          `${t + 1}/${eligible.length}: ${test.title || "Nomsiz test"} tayyorlanmoqda...`
        );

        const start = await api({
          action: "start",
          test: { ...test, questions: undefined },
        });

        for (let i = 0; i < questions.length; i += CHUNK_SIZE) {
          const chunk = questions.slice(i, i + CHUNK_SIZE);

          const result = await api({
            action: "questions",
            testId: start.testId,
            startNumber: i + 1,
            questions: chunk,
          });

          doneQuestions += Number(result.savedQuestions ?? chunk.length);
          totalOptions += Number(result.savedOptions ?? 0);

          const pct = totalQuestions
            ? Math.round((doneQuestions / totalQuestions) * 100)
            : 100;

          setProgress(pct);
          setMessage(
            `${t + 1}/${eligible.length}: ${test.title || "Nomsiz test"} — ` +
            `${Math.min(i + chunk.length, questions.length)}/${questions.length} savol.`
          );
        }

        await api({ action: "finish", testId: start.testId });
      }

      setProgress(100);
      setMessage(
        `Tayyor! ${eligible.length} ta test, ${doneQuestions} ta savol, ` +
        `${totalOptions} ta variant Neon bazasiga tiklandi.`
      );
    } catch (error) {
      setMessage(
        `Xato: ${error instanceof Error ? error.message : "Import amalga oshmadi."}`
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{
      maxWidth: 760,
      margin: "40px auto",
      padding: 24,
      fontFamily: "Georgia, serif",
    }}>
      <h1>Eski test backupini tiklash</h1>

      <p>
        Eski <b>tests.json</b> fayli brauzerda o‘qiladi va kichik qismlarda
        Neon bazasiga yuboriladi.
      </p>

      <input
        type="file"
        accept=".json,application/json"
        disabled={busy}
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />

      <div style={{ marginTop: 20 }}>
        <button
          type="button"
          disabled={busy || !file}
          onClick={runImport}
          style={{
            padding: "12px 22px",
            fontSize: 17,
            fontWeight: 700,
            cursor: busy ? "wait" : "pointer",
          }}
        >
          {busy ? "Tiklanmoqda..." : "Neon’ga tiklash"}
        </button>
      </div>

      {(busy || progress > 0) && (
        <div style={{
          marginTop: 20,
          width: "100%",
          height: 22,
          border: "1px solid #777",
          borderRadius: 7,
          overflow: "hidden",
          background: "#eee",
        }}>
          <div style={{
            width: `${progress}%`,
            height: "100%",
            background: "#2477c9",
            transition: "width .2s ease",
          }} />
        </div>
      )}

      {message && (
        <div style={{
          marginTop: 18,
          padding: 14,
          border: "1px solid #999",
          borderRadius: 8,
          whiteSpace: "pre-wrap",
        }}>
          {message}
        </div>
      )}
    </main>
  );
}
