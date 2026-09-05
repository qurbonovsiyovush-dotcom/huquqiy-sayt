"use client";

import { useState } from "react";

export default function LegacyBackupImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function runImport() {
    if (!file) {
      setMessage("tests.json faylini tanlang.");
      return;
    }

    try {
      setBusy(true);
      setMessage("");

      const form = new FormData();
      form.append("file", file);

      const response = await fetch("/api/tests/import-backup", {
        method: "POST",
        body: form,
        credentials: "include",
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Import amalga oshmadi.");
      }

      setMessage(
        `Tayyor: ${data.importedTests} ta test, ${data.importedQuestions} ta savol, ${data.importedOptions} ta variant tiklandi.`
      );
    } catch (error) {
      setMessage(error instanceof Error ? `Xato: ${error.message}` : "Importda xatolik.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 24, fontFamily: "Georgia, serif" }}>
      <h1>Eski test backupini tiklash</h1>
      <p>Eski <b>tests.json</b> faylini tanlang. Import to‘g‘ridan-to‘g‘ri Neon bazasiga yoziladi.</p>

      <input
        type="file"
        accept=".json,application/json"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />

      <div style={{ marginTop: 20 }}>
        <button
          type="button"
          disabled={busy || !file}
          onClick={runImport}
          style={{ padding: "12px 20px", fontSize: 16, fontWeight: 700 }}
        >
          {busy ? "Tiklanmoqda..." : "Neon’ga tiklash"}
        </button>
      </div>

      {message && (
        <div style={{ marginTop: 20, padding: 14, border: "1px solid #999", borderRadius: 8 }}>
          {message}
        </div>
      )}
    </main>
  );
}
