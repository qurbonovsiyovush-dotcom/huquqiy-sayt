"use client";

import {
  ChangeEvent,
  useState,
} from "react";

type ImportUnit = {
  book: number;
  unit: number;
  words: Array<{
    word: string;
    translation: string;
    example?: string;
    exampleTranslation?: string;
  }>;
};

type ImportResponse = {
  success?: boolean;
  message?: string;
  importedUnits?: number;
  importedWords?: number;
};

export default function VocabularyBackupImportPage() {
  const [fileName, setFileName] =
    useState("");

  const [units, setUnits] =
    useState<ImportUnit[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  async function handleFile(
    event: ChangeEvent<HTMLInputElement>
  ) {
    setMessage("");
    setError("");
    setUnits([]);

    const file =
      event.target.files?.[0];

    if (!file) {
      setFileName("");
      return;
    }

    setFileName(file.name);

    try {
      const text =
        await file.text();

      const parsed =
        JSON.parse(text);

      const possibleUnits =
        Array.isArray(parsed)
          ? parsed
          : Array.isArray(
              parsed?.units
            )
            ? parsed.units
            : [];

      if (
        possibleUnits.length ===
        0
      ) {
        throw new Error(
          "JSON ichidan Unitlar topilmadi."
        );
      }

      const normalized =
        possibleUnits
          .map(
            (
              item: any
            ) => ({
              book: Number(
                item?.book
              ),
              unit: Number(
                item?.unit
              ),
              words:
                Array.isArray(
                  item?.words
                )
                  ? item.words
                  : [],
            })
          )
          .filter(
            (
              item: ImportUnit
            ) =>
              Number.isInteger(
                item.book
              ) &&
              item.book >= 1 &&
              item.book <= 6 &&
              Number.isInteger(
                item.unit
              ) &&
              item.unit >= 1 &&
              item.unit <= 30 &&
              item.words.length >
                0
          );

      if (
        normalized.length ===
        0
      ) {
        throw new Error(
          "Yaroqli Unit topilmadi."
        );
      }

      setUnits(
        normalized
      );
    } catch (err) {
      setUnits([]);

      setError(
        err instanceof Error
          ? err.message
          : "JSON faylni o‘qishda xatolik."
      );
    }
  }

  async function importToNeon() {
    if (
      units.length === 0
    ) {
      setError(
        "Avval JSON faylni tanlang."
      );
      return;
    }

    const confirmed =
      window.confirm(
        `${units.length} ta Unitni Neon bazasiga import qilamizmi? Shu Unitlarda oldingi so‘zlar bo‘lsa, yangilari bilan almashtiriladi.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setError("");

      const response =
        await fetch(
          "/api/vocabulary/import-backup",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify(
                {
                  units,
                }
              ),
          }
        );

      const text =
        await response.text();

      let data:
        | ImportResponse
        | null = null;

      try {
        data = JSON.parse(
          text
        );
      } catch {
        throw new Error(
          text ||
            `Server ${response.status} xato qaytardi.`
        );
      }

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Import amalga oshmadi."
        );
      }

      setMessage(
        data.message ||
          "Import muvaffaqiyatli yakunlandi."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Importda xatolik yuz berdi."
      );
    } finally {
      setLoading(false);
    }
  }

  const wordCount =
    units.reduce(
      (
        sum,
        unit
      ) =>
        sum +
        unit.words.length,
      0
    );

  return (
    <main className="page">
      <section className="panel">
        <div className="title">
          English Vocabulary
        </div>

        <h1>
          JSON backupni Neon&apos;ga tiklash
        </h1>

        <p className="description">
          Masalan:
          {" "}
          <strong>
            book-1-600-words.json
          </strong>
        </p>

        <label className="fileBox">
          <span>
            JSON faylni tanlash
          </span>

          <input
            type="file"
            accept=".json,application/json"
            onChange={
              handleFile
            }
          />
        </label>

        {fileName && (
          <div className="info">
            <div>
              Fayl:
              {" "}
              <strong>
                {fileName}
              </strong>
            </div>

            <div>
              Unit:
              {" "}
              <strong>
                {units.length}
              </strong>
            </div>

            <div>
              So‘z:
              {" "}
              <strong>
                {wordCount}
              </strong>
            </div>
          </div>
        )}

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {message && (
          <div className="success">
            {message}
          </div>
        )}

        <button
          type="button"
          className="importButton"
          onClick={
            importToNeon
          }
          disabled={
            loading ||
            units.length === 0
          }
        >
          {loading
            ? "Neon'ga import qilinmoqda..."
            : "Neon'ga tiklash"}
        </button>

        <button
          type="button"
          className="backButton"
          onClick={() => {
            window.location.href =
              "/admin/dictionary";
          }}
        >
          ← Lug‘at boshqaruviga qaytish
        </button>
      </section>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          padding: 40px 20px;
          background:
            linear-gradient(
              180deg,
              #eef3f6 0%,
              #dfe8ed 100%
            );
          color: #111;
          font-family:
            "Bell MT",
            "Times New Roman",
            serif;
        }

        .panel {
          width:
            min(
              820px,
              96%
            );
          margin: 0 auto;
          padding:
            36px;
          border:
            3px solid
            #243d4b;
          border-radius:
            24px;
          background:
            linear-gradient(
              180deg,
              #f8fafb,
              #e4eaed
            );
          box-shadow:
            inset 0 3px 3px
              #fff,
            0 10px 0
              #60717a,
            0 18px 28px
              rgba(
                0,
                0,
                0,
                0.22
              );
        }

        .title {
          width:
            fit-content;
          margin:
            -58px auto
            28px;
          padding:
            14px 34px;
          border:
            3px solid
            #063d61;
          border-radius:
            16px;
          background:
            linear-gradient(
              180deg,
              #84d9fa,
              #47afe0
            );
          font-size:
            24px;
          font-weight:
            700;
          box-shadow:
            inset 0 3px 2px
              rgba(
                255,
                255,
                255,
                0.9
              ),
            0 7px 0
              #075b82;
        }

        h1 {
          margin:
            18px 0 10px;
          text-align:
            center;
          font-size:
            30px;
        }

        .description {
          margin:
            0 0 24px;
          text-align:
            center;
          font-size:
            18px;
        }

        .fileBox {
          display:
            flex;
          align-items:
            center;
          justify-content:
            center;
          min-height:
            130px;
          padding:
            20px;
          border:
            3px dashed
            #5f7079;
          border-radius:
            18px;
          background:
            #fff;
          cursor:
            pointer;
          font-size:
            22px;
          font-weight:
            700;
        }

        .fileBox input {
          display: none;
        }

        .info {
          display:
            grid;
          grid-template-columns:
            repeat(
              3,
              1fr
            );
          gap:
            12px;
          margin-top:
            20px;
        }

        .info > div {
          padding:
            15px;
          border:
            2px solid
            #6d7d85;
          border-radius:
            13px;
          background:
            #f9fbfc;
          text-align:
            center;
          font-size:
            18px;
        }

        .error,
        .success {
          margin-top:
            20px;
          padding:
            16px;
          border-radius:
            13px;
          font-size:
            18px;
          font-weight:
            700;
          text-align:
            center;
        }

        .error {
          border:
            2px solid
            #9c2f2f;
          background:
            #ffeaea;
          color:
            #7b1717;
        }

        .success {
          border:
            2px solid
            #26713c;
          background:
            #e9f8ed;
          color:
            #18562a;
        }

        .importButton,
        .backButton {
          width:
            100%;
          min-height:
            58px;
          margin-top:
            22px;
          border:
            3px solid
            #063d61;
          border-radius:
            15px;
          font-family:
            inherit;
          font-size:
            20px;
          font-weight:
            700;
          cursor:
            pointer;
        }

        .importButton {
          background:
            linear-gradient(
              180deg,
              #72cef4,
              #2997cb
            );
          color:
            #101010;
          box-shadow:
            inset 0 3px 2px
              rgba(
                255,
                255,
                255,
                0.8
              ),
            0 7px 0
              #075b82;
        }

        .importButton:disabled {
          opacity:
            0.55;
          cursor:
            not-allowed;
        }

        .backButton {
          margin-top:
            18px;
          border-color:
            #555;
          background:
            linear-gradient(
              180deg,
              #fff,
              #d8dde0
            );
          color:
            #111;
          box-shadow:
            0 6px 0
              #7b858a;
        }

        @media (
          max-width:
            650px
        ) {
          .panel {
            padding:
              28px 18px;
          }

          .info {
            grid-template-columns:
              1fr;
          }

          h1 {
            font-size:
              25px;
          }
        }
      `}</style>
    </main>
  );
}

