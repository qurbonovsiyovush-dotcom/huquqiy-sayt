"use client";

import { ChangeEvent, useMemo, useState } from "react";

type DictionaryWord = {
  id?: string;
  english: string;
  uzbek: string;
};

type BackupData = {
  words: DictionaryWord[];
  updatedAt?: string;
};

type ImportResponse = {
  ok?: boolean;
  success?: boolean;
  imported?: number;
  total?: number;
  message?: string;
};

export default function EnglishUzbekImportPage() {
  const [fileName, setFileName] = useState("");
  const [data, setData] = useState<BackupData | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const validCount = useMemo(
    () =>
      data?.words.filter(
        (item) =>
          typeof item?.english === "string" && item.english.trim().length > 0
      ).length ?? 0,
    [data]
  );

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setMessage("");
    setError("");
    setData(null);

    const file = event.target.files?.[0];
    if (!file) {
      setFileName("");
      return;
    }

    setFileName(file.name);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      const words = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.words)
          ? parsed.words
          : null;

      if (!words) {
        throw new Error("JSON ichida words massivi topilmadi.");
      }

      setData({
        words,
        updatedAt:
          typeof parsed?.updatedAt === "string" ? parsed.updatedAt : undefined,
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "JSON faylni o‘qib bo‘lmadi."
      );
    }
  }

  async function importToNeon() {
    if (!data || validCount === 0 || loading) return;

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/dictionary/english-uzbek/import-backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words: data.words }),
      });

      const text = await response.text();
      let result: ImportResponse | null = null;

      try {
        result = text ? JSON.parse(text) : null;
      } catch {
        throw new Error(
          text
            ? `Server JSON qaytarmadi: ${text.slice(0, 250)}`
            : "Serverdan javob kelmadi."
        );
      }

      if (!result) {
        throw new Error("Serverdan yaroqli JSON javob kelmadi.");
      }

      if (!response.ok || !result.success) {
        throw new Error(result.message || `HTTP ${response.status}`);
      }

      setMessage(
        `Tayyor! ${result.imported ?? validCount} ta so‘z import qilindi. ` +
          `Neon bazasida jami: ${result.total ?? "—"} ta so‘z.`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Importda xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <section className="card">
        <div className="top">ENGLISH–UZBEK DICTIONARY</div>

        <h1>JSON → Neon import</h1>
        <p className="sub">
          2700 words JSON faylini tanlang va Neon bazasiga yozing.
        </p>

        <label className="picker">
          <span>JSON faylni tanlash</span>
          <input
            type="file"
            accept=".json,application/json"
            onChange={onFileChange}
          />
        </label>

        {fileName && (
          <div className="info">
            <div>
              <b>Fayl</b>
              <span>{fileName}</span>
            </div>
            <div>
              <b>So‘z</b>
              <span>{validCount}</span>
            </div>
          </div>
        )}

        {error && <div className="error">{error}</div>}
        {message && <div className="success">{message}</div>}

        <button
          type="button"
          className="importButton"
          disabled={!data || validCount === 0 || loading}
          onClick={importToNeon}
        >
          {loading ? "Neon bazasiga yozilmoqda..." : "NEON'GA IMPORT QILISH"}
        </button>
      </section>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          padding: 40px 18px;
          background:
            radial-gradient(circle at top, #5c626b 0, #353a41 36%, #1f2328 100%);
          font-family: Georgia, "Times New Roman", serif;
          color: #101216;
        }

        .card {
          width: min(760px, 100%);
          margin: 0 auto;
          padding: 0 28px 32px;
          overflow: hidden;
          border: 3px solid #15191e;
          border-radius: 22px;
          background: linear-gradient(#e9ecef, #bfc5cb);
          box-shadow:
            0 12px 0 #15191e,
            0 20px 32px rgba(0, 0, 0, 0.42),
            inset 0 2px 0 rgba(255, 255, 255, 0.9);
        }

        .top {
          margin: 0 -28px 28px;
          padding: 16px 20px;
          text-align: center;
          font-weight: 900;
          font-size: 20px;
          letter-spacing: 0.6px;
          color: white;
          background: linear-gradient(#168cff, #0069cf);
          border-bottom: 3px solid #0b3e72;
          box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.45);
        }

        h1 {
          margin: 0;
          text-align: center;
          font-size: 32px;
        }

        .sub {
          margin: 10px 0 26px;
          text-align: center;
          font-size: 17px;
          color: #41464c;
        }

        .picker {
          display: flex;
          min-height: 70px;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: 2px dashed #646b73;
          border-radius: 15px;
          background: #f8f9fa;
          font-weight: 800;
          font-size: 18px;
          box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.12);
        }

        .picker input {
          display: none;
        }

        .info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 18px;
        }

        .info div {
          padding: 15px;
          border: 2px solid #858b92;
          border-radius: 12px;
          background: #fff;
          text-align: center;
        }

        .info b,
        .info span {
          display: block;
        }

        .info b {
          margin-bottom: 6px;
          color: #555b61;
        }

        .info span {
          overflow-wrap: anywhere;
          font-weight: 900;
          font-size: 19px;
        }

        .importButton {
          width: 100%;
          margin-top: 22px;
          min-height: 58px;
          border: 2px solid #074c90;
          border-radius: 13px;
          color: white;
          font-family: inherit;
          font-size: 18px;
          font-weight: 900;
          cursor: pointer;
          background: linear-gradient(#188eff, #006bd2);
          box-shadow:
            0 5px 0 #063a6d,
            inset 0 2px 0 rgba(255, 255, 255, 0.4);
        }

        .importButton:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .success,
        .error {
          margin-top: 18px;
          padding: 15px;
          border-radius: 11px;
          font-weight: 800;
          line-height: 1.45;
        }

        .success {
          border: 2px solid #24713a;
          background: #e8f7ec;
          color: #174d27;
        }

        .error {
          border: 2px solid #9a3030;
          background: #fdeaea;
          color: #7b2020;
        }

        @media (max-width: 600px) {
          .page {
            padding: 22px 12px;
          }

          .card {
            padding: 0 16px 25px;
          }

          .top {
            margin-left: -16px;
            margin-right: -16px;
          }

          h1 {
            font-size: 25px;
          }

          .info {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}

