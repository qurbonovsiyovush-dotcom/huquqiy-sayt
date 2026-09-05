"use client";

import { ChangeEvent, useState } from "react";

type ImportResult = {
  success?: boolean;
  message?: string;
  imported?: number;
  received?: number;
  skipped?: number;
  total?: number;
};

export default function ImportSynonymsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<ImportResult | null>(
    null
  );
  const [error, setError] = useState("");

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile =
      event.target.files?.[0] ?? null;

    setFile(selectedFile);
    setFileName(selectedFile?.name ?? "");
    setResult(null);
    setError("");
    setProgress("");
  }

  async function importFile() {
    if (!file) {
      setError("Avval JSON faylni tanlang.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      setProgress("JSON fayl o‘qilmoqda...");

      const text = await file.text();

      let json: unknown;

      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(
          "Tanlangan fayl to‘g‘ri JSON formatida emas."
        );
      }

      const source = Array.isArray(json)
        ? json
        : (
            json as {
              synonyms?: unknown;
            }
          )?.synonyms;

      if (!Array.isArray(source)) {
        throw new Error(
          "JSON ichidan sinonimlar ro‘yxati topilmadi."
        );
      }

      if (source.length === 0) {
        throw new Error(
          "JSON faylda sinonimlar mavjud emas."
        );
      }

      setProgress(
        `${source.length} ta yozuv topildi. Neon bazasiga yuborilmoqda...`
      );

      const response = await fetch(
        "/api/dictionary/synonyms/import-backup",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(source),
        }
      );

      const responseText = await response.text();

      let data: ImportResult;

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          `Server JSON qaytarmadi. HTTP ${response.status}.`
        );
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            `Import bajarilmadi. HTTP ${response.status}.`
        );
      }

      setResult(data);
      setProgress("Import yakunlandi.");
    } catch (err) {
      setProgress("");

      setError(
        err instanceof Error
          ? err.message
          : "Noma’lum xatolik yuz berdi."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #e9edf2 0%, #d9dee5 100%)",
        padding: "40px 20px",
        fontFamily: "Georgia, 'Times New Roman', serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 760,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background:
              "linear-gradient(180deg, #444b55 0%, #292e35 100%)",
            border: "2px solid #171a1f",
            borderRadius: 20,
            padding: 6,
            boxShadow:
              "0 12px 24px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.18)",
          }}
        >
          <div
            style={{
              borderRadius: 15,
              border: "1px solid rgba(255,255,255,.12)",
              padding: "28px",
            }}
          >
            <h1
              style={{
                margin: 0,
                textAlign: "center",
                color: "#fff",
                fontSize: 30,
                fontWeight: 700,
              }}
            >
              Synonyms import
            </h1>

            <p
              style={{
                color: "#d9dee6",
                textAlign: "center",
                marginTop: 10,
                marginBottom: 28,
                fontSize: 16,
              }}
            >
              JSON fayldagi sinonimlarni Neon bazasiga
              yuklash
            </p>

            <div
              style={{
                background:
                  "linear-gradient(180deg, #f9fafb 0%, #e6e9ed 100%)",
                border: "2px solid #b8bec6",
                borderRadius: 14,
                padding: 20,
                boxShadow:
                  "inset 0 2px 5px rgba(0,0,0,.12)",
              }}
            >
              <label
                style={{
                  display: "block",
                  fontWeight: 700,
                  marginBottom: 10,
                  color: "#222",
                }}
              >
                JSON fayl
              </label>

              <input
                type="file"
                accept=".json,application/json"
                disabled={loading}
                onChange={handleFileChange}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: 12,
                  background: "#fff",
                  border: "1px solid #aeb5bd",
                  borderRadius: 9,
                  fontSize: 15,
                }}
              />

              {fileName && (
                <div
                  style={{
                    marginTop: 12,
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "#eef3f8",
                    border: "1px solid #cbd5df",
                    color: "#26313d",
                    fontSize: 14,
                  }}
                >
                  Tanlangan fayl:{" "}
                  <strong>{fileName}</strong>
                </div>
              )}

              <button
                type="button"
                disabled={!file || loading}
                onClick={importFile}
                style={{
                  width: "100%",
                  marginTop: 20,
                  padding: "14px 18px",
                  borderRadius: 10,
                  border: "2px solid #0b315e",
                  background:
                    !file || loading
                      ? "#9aa5b1"
                      : "linear-gradient(180deg, #2583dc 0%, #07539e 100%)",
                  color: "#fff",
                  fontSize: 17,
                  fontWeight: 700,
                  cursor:
                    !file || loading
                      ? "not-allowed"
                      : "pointer",
                  boxShadow:
                    !file || loading
                      ? "none"
                      : "0 5px 0 #073b70, 0 8px 14px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.35)",
                }}
              >
                {loading
                  ? "Import qilinmoqda..."
                  : "Neon bazasiga import qilish"}
              </button>
            </div>

            {progress && (
              <div
                style={{
                  marginTop: 20,
                  padding: 14,
                  borderRadius: 10,
                  background: "#e8f2ff",
                  border: "1px solid #8eb9e8",
                  color: "#123e6d",
                  fontWeight: 700,
                }}
              >
                {progress}
              </div>
            )}

            {error && (
              <div
                style={{
                  marginTop: 20,
                  padding: 14,
                  borderRadius: 10,
                  background: "#ffe7e7",
                  border: "1px solid #d98888",
                  color: "#8b1717",
                  fontWeight: 700,
                }}
              >
                Xato: {error}
              </div>
            )}

            {result?.success && (
              <div
                style={{
                  marginTop: 20,
                  padding: 18,
                  borderRadius: 12,
                  background: "#e5f7e9",
                  border: "2px solid #74b982",
                  color: "#155724",
                }}
              >
                <div
                  style={{
                    fontSize: 19,
                    fontWeight: 700,
                    marginBottom: 10,
                  }}
                >
                  Tayyor!
                </div>

                <div>
                  Import qilindi:{" "}
                  <strong>
                    {result.imported ?? 0}
                  </strong>
                </div>

                <div>
                  Neon bazasida jami:{" "}
                  <strong>{result.total ?? 0}</strong>
                </div>

                {(result.skipped ?? 0) > 0 && (
                  <div>
                    O‘tkazib yuborildi:{" "}
                    <strong>
                      {result.skipped}
                    </strong>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
