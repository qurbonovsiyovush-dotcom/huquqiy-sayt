"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ParsedOption = {
  id?: string;
  label: "A" | "B" | "C" | "D";
  text: string;
  isCorrect: boolean;
};

type ParsedQuestion = {
  id?: string;
  number: number;
  questionText: string;
  options: ParsedOption[];
  pdfCrop?: unknown;
  warning?: string;
};

type ParseResponse = {
  success?: boolean;
  message?: string;
  questions?: ParsedQuestion[];
  total?: number;
  expectedTotal?: number;
  missingNumbers?: number[];
};

const CHUNK_SIZE = 20;

async function readJsonResponse(response: Response) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(text || `Server ${response.status} xato qaytardi.`);
  }
}

export default function Constitution840ImportPage() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [loadingParse, setLoadingParse] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [duration, setDuration] = useState(180);
  const [attemptLimit, setAttemptLimit] = useState<string>("");

  const warnings = useMemo(
    () => questions.filter((question) => question.warning),
    [questions]
  );

  const correctCount = useMemo(
    () =>
      questions.reduce(
        (sum, question) =>
          sum + question.options.filter((option) => option.isCorrect).length,
        0
      ),
    [questions]
  );

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] || null;

    setFile(selected);
    setQuestions([]);
    setProgress(0);
    setMessage("");
    setError("");
  }

  async function parsePdf() {
    if (!file) {
      setError("Avval PDF faylni tanlang.");
      return;
    }

    try {
      setLoadingParse(true);
      setError("");
      setMessage("");
      setQuestions([]);
      setProgress(0);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/tests/import-constitution-pdf", {
        method: "POST",
        body: formData,
      });

      const data = (await readJsonResponse(response)) as ParseResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.message || "PDF tahlil qilinmadi.");
      }

      const parsed = Array.isArray(data.questions) ? data.questions : [];

      setQuestions(parsed);

      if (parsed.length !== 840) {
        throw new Error(
          `PDFdan ${parsed.length} ta savol topildi. 840 ta bo‘lishi kerak. Yo‘qolgan raqamlar: ${(data.missingNumbers || []).join(", ") || "noma’lum"}.`
        );
      }

      const wrongCorrect = parsed.filter(
        (question) =>
          question.options.filter((option) => option.isCorrect).length !== 1
      );

      if (wrongCorrect.length > 0) {
        throw new Error(
          `${wrongCorrect.length} ta savolda to‘g‘ri javob aniq topilmadi. Birinchi muammoli savollar: ${wrongCorrect
            .slice(0, 20)
            .map((question) => question.number)
            .join(", ")}`
        );
      }

      setMessage(
        `PDF tayyor: ${parsed.length} ta savol, ${parsed.length * 4} ta variant, ${parsed.length} ta to‘g‘ri javob topildi.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF tahlilida xatolik.");
    } finally {
      setLoadingParse(false);
    }
  }

  async function postSave(payload: unknown) {
    const response = await fetch("/api/tests/import-constitution-neon", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await readJsonResponse(response);

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Neon import xatosi.");
    }

    return data;
  }

  async function saveToNeon() {
    if (questions.length !== 840) {
      setError("Avval PDFni tahlil qiling. Aynan 840 ta savol topilishi kerak.");
      return;
    }

    const invalid = questions.filter(
      (question) =>
        question.options.length !== 4 ||
        question.options.filter((option) => option.isCorrect).length !== 1
    );

    if (invalid.length > 0) {
      setError(
        `Import to‘xtatildi. Muammoli savollar: ${invalid
          .slice(0, 30)
          .map((question) => question.number)
          .join(", ")}`
      );
      return;
    }

    const confirmed = window.confirm(
      "840 ta Konstitutsiya testini Neon bazasiga yozamizmi? Shu ID bilan oldingi test bo‘lsa, savollari yangidan almashtiriladi."
    );

    if (!confirmed) return;

    try {
      setLoadingSave(true);
      setError("");
      setMessage("");
      setProgress(0);

      await postSave({
        action: "start",
        duration,
        attemptLimit: attemptLimit.trim() === "" ? null : Number(attemptLimit),
      });

      const chunks = Math.ceil(questions.length / CHUNK_SIZE);

      for (let index = 0; index < chunks; index++) {
        const chunk = questions.slice(
          index * CHUNK_SIZE,
          (index + 1) * CHUNK_SIZE
        );

        await postSave({
          action: "questions",
          questions: chunk,
        });

        setProgress(Math.round(((index + 1) / chunks) * 100));
      }

      const finish = await postSave({ action: "finish" });

      setProgress(100);
      setMessage(finish.message || "840 ta test Neon bazasiga saqlandi.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Neon importda xatolik.");
    } finally {
      setLoadingSave(false);
    }
  }

  return (
    <main className="page">
      <header className="topBar">
        <strong>Konstitutsiya — 840 ta test</strong>

        <button type="button" onClick={() => router.push("/admin/tests")}>
          Test boshqaruvi
        </button>
      </header>

      <section className="panel">
        <div className="floatingTitle">PDF → Neon</div>

        <h1>KONSTITUTSIYA — 840 TA TEST</h1>
        <p className="lead">
          780 ta asosiy test + 30 ta 1-variant + 30 ta 2-variant. Blob ishlatilmaydi.
        </p>

        <div className="settingsGrid">
          <label>
            <span>Test vaqti (daqiqa)</span>
            <input
              type="number"
              min={1}
              value={duration}
              onChange={(event) => setDuration(Math.max(1, Number(event.target.value) || 1))}
            />
          </label>

          <label>
            <span>Urinish limiti</span>
            <input
              type="number"
              min={1}
              value={attemptLimit}
              placeholder="Bo‘sh = cheklanmagan"
              onChange={(event) => setAttemptLimit(event.target.value)}
            />
          </label>
        </div>

        <label className="fileBox">
          <span>{file ? file.name : "Kons test 2026.pdf faylini tanlang"}</span>
          <input type="file" accept="application/pdf,.pdf" onChange={chooseFile} />
        </label>

        <div className="actions">
          <button
            type="button"
            className="blueButton"
            disabled={!file || loadingParse || loadingSave}
            onClick={parsePdf}
          >
            {loadingParse ? "PDF tahlil qilinmoqda..." : "1. PDFni tekshirish"}
          </button>

          <button
            type="button"
            className="greenButton"
            disabled={questions.length !== 840 || loadingParse || loadingSave}
            onClick={saveToNeon}
          >
            {loadingSave ? "Neon bazasiga saqlanmoqda..." : "2. Neon bazasiga saqlash"}
          </button>
        </div>

        <div className="stats">
          <div>
            <span>Savollar</span>
            <strong>{questions.length}/840</strong>
          </div>
          <div>
            <span>Variantlar</span>
            <strong>{questions.reduce((sum, q) => sum + q.options.length, 0)}/3360</strong>
          </div>
          <div>
            <span>To‘g‘ri javob</span>
            <strong>{correctCount}/840</strong>
          </div>
          <div>
            <span>Ogohlantirish</span>
            <strong>{warnings.length}</strong>
          </div>
        </div>

        {loadingSave && (
          <div className="progressBox">
            <div className="progressText">{progress}%</div>
            <div className="progressTrack">
              <div className="progressFill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {message && <div className="message success">{message}</div>}
        {error && <div className="message error">{error}</div>}

        {questions.length > 0 && (
          <div className="preview">
            <h2>Tekshiruv</h2>
            <div className="previewGrid">
              {questions.slice(0, 8).map((question) => (
                <article key={question.number}>
                  <b>{question.number}-savol</b>
                  <p>{question.questionText}</p>
                  <small>
                    To‘g‘ri: {question.options.find((option) => option.isCorrect)?.label || "?"}
                  </small>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      <style jsx>{`
        .page {
          min-height: 100vh;
          padding: 16px 16px 70px;
          box-sizing: border-box;
          background: linear-gradient(180deg, #ffffff, #eef3f6);
          color: #071d2e;
          font-family: Georgia, "Times New Roman", serif;
        }

        .topBar {
          max-width: 1120px;
          margin: 0 auto;
          min-height: 56px;
          padding: 9px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          border: 2px solid #194e68;
          border-radius: 10px;
          background: linear-gradient(180deg, #85d6fa, #4bb6e7 45%, #2196cc);
          box-shadow: inset 0 4px 3px rgba(255,255,255,.75), 0 6px 0 #164a63, 0 9px 15px rgba(0,0,0,.22);
        }

        .topBar button,
        .blueButton,
        .greenButton {
          border-radius: 8px;
          font-family: inherit;
          font-weight: 900;
          cursor: pointer;
        }

        .topBar button {
          padding: 10px 20px;
          border: 1px solid #526772;
          background: linear-gradient(#fff, #d7d7d7);
        }

        .panel {
          position: relative;
          width: min(1120px, 96%);
          margin: 70px auto 0;
          padding: 64px 28px 32px;
          box-sizing: border-box;
          border: 2px solid #323b40;
          border-radius: 22px;
          background: linear-gradient(180deg, #666b6e, #444a4d);
          box-shadow: inset 0 4px 3px rgba(255,255,255,.22), 0 9px 0 #262c2f, 0 14px 22px rgba(0,0,0,.25);
        }

        .floatingTitle {
          position: absolute;
          top: -31px;
          left: 50%;
          transform: translateX(-50%);
          min-width: 240px;
          padding: 14px 30px;
          text-align: center;
          border: 2px solid #1a526d;
          border-radius: 12px;
          background: linear-gradient(180deg, #9ce1ff, #4eb8e9 58%, #218ebf);
          box-shadow: inset 0 4px 3px rgba(255,255,255,.7), 0 6px 0 #31586b;
          font-size: 24px;
          font-weight: 900;
        }

        h1,
        .lead {
          color: white;
          text-align: center;
        }

        .lead {
          margin-bottom: 22px;
        }

        .settingsGrid,
        .stats,
        .previewGrid {
          display: grid;
          gap: 14px;
        }

        .settingsGrid {
          grid-template-columns: repeat(2, minmax(0,1fr));
          margin-bottom: 18px;
        }

        .settingsGrid label {
          padding: 14px;
          display: grid;
          gap: 8px;
          border-radius: 12px;
          background: linear-gradient(#f8fafb, #dce4e8);
          box-shadow: inset 0 3px 2px #fff, 0 5px 0 #707c82;
          font-weight: 900;
        }

        .settingsGrid input {
          min-height: 44px;
          padding: 0 12px;
          border: 1.5px solid #158bc0;
          border-radius: 7px;
          font: 16px Georgia, serif;
        }

        .fileBox {
          min-height: 90px;
          padding: 18px;
          display: grid;
          place-items: center;
          text-align: center;
          border: 2px dashed #4baed8;
          border-radius: 14px;
          background: linear-gradient(#f9fcfd, #dce5e9);
          box-shadow: inset 0 3px 2px #fff, 0 5px 0 #6f7e85;
          cursor: pointer;
          font-weight: 900;
        }

        .fileBox input {
          margin-top: 10px;
        }

        .actions {
          margin-top: 22px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0,1fr));
          gap: 14px;
        }

        .blueButton,
        .greenButton {
          min-height: 52px;
          border: 1.5px solid #1e6380;
          box-shadow: inset 0 3px 2px rgba(255,255,255,.75), 0 5px 0 #315b6d;
        }

        .blueButton {
          background: linear-gradient(#c9f1ff, #56bee8);
        }

        .greenButton {
          background: linear-gradient(#d7f7df, #72c987);
        }

        button:disabled {
          cursor: not-allowed;
          opacity: .55;
        }

        .stats {
          margin-top: 22px;
          grid-template-columns: repeat(4, minmax(0,1fr));
        }

        .stats div {
          padding: 14px;
          display: grid;
          gap: 5px;
          text-align: center;
          border-radius: 11px;
          background: linear-gradient(#fff, #dfe6e9);
          box-shadow: inset 0 3px 2px #fff, 0 4px 0 #727f85;
        }

        .stats strong {
          font-size: 20px;
        }

        .progressBox,
        .message,
        .preview {
          margin-top: 22px;
          padding: 16px;
          border-radius: 12px;
          background: #eef4f7;
          box-shadow: inset 0 3px 2px #fff, 0 5px 0 #717d83;
        }

        .progressText {
          margin-bottom: 8px;
          font-weight: 900;
          text-align: center;
        }

        .progressTrack {
          height: 18px;
          overflow: hidden;
          border: 1px solid #526772;
          border-radius: 9px;
          background: #cbd5da;
        }

        .progressFill {
          height: 100%;
          background: linear-gradient(#95e2ff, #26a8df);
          transition: width .2s ease;
        }

        .success {
          border: 2px solid #39824a;
          color: #164f24;
        }

        .error {
          border: 2px solid #a53b3b;
          color: #8c1d1d;
        }

        .preview h2 {
          margin-top: 0;
        }

        .previewGrid {
          grid-template-columns: repeat(2, minmax(0,1fr));
        }

        .preview article {
          padding: 12px;
          border: 1px solid #9aa9b0;
          border-radius: 9px;
          background: white;
        }

        .preview p {
          margin: 8px 0;
          white-space: pre-wrap;
        }

        @media (max-width: 760px) {
          .settingsGrid,
          .actions,
          .stats,
          .previewGrid {
            grid-template-columns: 1fr;
          }

          .panel {
            width: 100%;
            padding: 58px 12px 22px;
          }
        }
      `}</style>
    </main>
  );
}

