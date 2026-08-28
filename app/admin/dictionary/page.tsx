"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type VocabularyWord = {
  word: string;
  translation: string;
  example?: string;
  uzbekExample?: string;
};

type VocabularyUnit = {
  book: number;
  unit: number;
  words: VocabularyWord[];
  updatedAt?: string;
};

const BOOKS = Array.from({ length: 6 }, (_, i) => i + 1);
const UNITS = Array.from({ length: 30 }, (_, i) => i + 1);

export default function DictionaryAdminPage() {
  const router = useRouter();

  const [book, setBook] = useState(1);
  const [unit, setUnit] = useState(1);

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedLabel = useMemo(
    () => `Book ${book} → Unit ${unit}`,
    [book, unit]
  );

  useEffect(() => {
    loadUnit();
  }, [book, unit]);

  async function loadUnit() {
    try {
      setLoading(true);
      setMessage("");
      setError("");

      const response = await fetch("/api/vocabulary", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Lug‘at ma’lumotlarini yuklab bo‘lmadi.");
      }

      const data = await response.json();

      let units: VocabularyUnit[] = [];

      if (Array.isArray(data)) {
        units = data;
      } else if (Array.isArray(data?.units)) {
        units = data.units;
      } else if (Array.isArray(data?.data)) {
        units = data.data;
      }

      const current = units.find(
        (item) =>
          Number(item.book) === Number(book) &&
          Number(item.unit) === Number(unit)
      );

      if (!current || !Array.isArray(current.words)) {
        setText("");
        return;
      }

      const formatted = current.words
        .map((item) => {
          const english = item.word || "";
          const uzbek = item.translation || "";
          const englishExample = item.example || "";
          const uzbekExample = item.uzbekExample || "";

          if (englishExample || uzbekExample) {
            return `${english} | ${uzbek} | ${englishExample} | ${uzbekExample}`;
          }

          return `${english} | ${uzbek}`;
        })
        .join("\n");

      setText(formatted);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Ma’lumotlarni yuklashda xatolik yuz berdi."
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveUnit() {
    try {
      setLoading(true);
      setMessage("");
      setError("");

      const lines = text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length === 0) {
        setError("Kamida bitta so‘z kiriting.");
        return;
      }

      const words: VocabularyWord[] = [];

      for (const line of lines) {
        const parts = line.split("|").map((part) => part.trim());

        if (parts.length < 2 || !parts[0] || !parts[1]) {
          throw new Error(
            `Noto‘g‘ri format: "${line}". Format: English | Uzbek`
          );
        }

        words.push({
          word: parts[0],
          translation: parts[1],
          example: parts[2] || "",
          uzbekExample: parts[3] || "",
        });
      }

      const response = await fetch("/api/vocabulary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          book,
          unit,
          words,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            "Ma’lumotlarni saqlashda xatolik yuz berdi."
        );
      }

      setMessage(
        `✓ ${selectedLabel} muvaffaqiyatli saqlandi. Jami: ${words.length} ta so‘z.`
      );

      await loadUnit();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Saqlashda xatolik yuz berdi."
      );
    } finally {
      setLoading(false);
    }
  }

  async function deleteUnit() {
    const confirmed = window.confirm(
      `${selectedLabel} ichidagi barcha so‘zlarni o‘chirmoqchimisiz?`
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      setMessage("");
      setError("");

      const response = await fetch(
        `/api/vocabulary?book=${book}&unit=${unit}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            "Unitni o‘chirishda xatolik yuz berdi."
        );
      }

      setText("");
      setMessage(`✓ ${selectedLabel} muvaffaqiyatli o‘chirildi.`);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "O‘chirishda xatolik yuz berdi."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      {/* =========================
          TEPADAGI 3D PANEL
      ========================== */}
      <header className="topPanel">
        <div className="namePlate">
          Qurbonov Siyovush Jamaliddinzoda
        </div>

        <div className="topActions">
          <button
            className="whiteButton"
            onClick={() => router.push("/")}
          >
            Asosiy sahifa
          </button>

          <button
            className="blueButton"
            onClick={() => router.push("/admin")}
          >
            ← Orqaga
          </button>
        </div>
      </header>

      {/* =========================
          ASOSIY LUG‘AT BOSHQARUVI
      ========================== */}
      <section className="mainPanel">
        <div className="titlePlate">Lug‘at boshqaruvi</div>

        {/* =========================
            BOSHQA LUG‘ATLAR
        ========================== */}
        <div className="dictionaryCards">
          <div className="dictionaryCard">
            <div className="miniBadge">EN</div>

            <h2>English–Uzbek Dictionary</h2>

            <button
              className="manageButton"
              onClick={() =>
                router.push("/admin/dictionary/english-uzbek")
              }
            >
              Boshqarish
            </button>
          </div>

          <div className="dictionaryCard">
            <div className="miniBadge">IV</div>

            <h2>Irregular Verbs</h2>

            <button
              className="manageButton"
              onClick={() =>
                router.push("/admin/dictionary/irregular-verbs")
              }
            >
              Boshqarish
            </button>
          </div>
        </div>

        {/* =========================
            ENGLISH VOCABULARY
        ========================== */}
        <div className="vocabularyBox">
          <div className="vocabularyHeading">
            <div className="bigBadge">4000</div>

            <div>
              <h1>English Vocabulary</h1>
              <p>
                4000 Essential English Words — so‘zlar va misol
                gaplarni boshqarish
              </p>
            </div>
          </div>

          <div className="selectors">
            <div className="field">
              <label>Book</label>

              <select
                value={book}
                onChange={(e) => setBook(Number(e.target.value))}
                disabled={loading}
              >
                {BOOKS.map((item) => (
                  <option key={item} value={item}>
                    Book {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Unit</label>

              <select
                value={unit}
                onChange={(e) => setUnit(Number(e.target.value))}
                disabled={loading}
              >
                {UNITS.map((item) => (
                  <option key={item} value={item}>
                    Unit {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="selectedBox">
            Tanlandi: <strong>{selectedLabel}</strong>
          </div>

          <div className="inputSection">
            <h2>So‘zlarni kiriting</h2>

            <p>
              Format: <strong>English | Uzbek | English example | Uzbek example</strong>
            </p>

            <p>
              Misol gap bo‘lmasa: <strong>English | Uzbek</strong>
            </p>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`afraid | qo‘rqqan | I am afraid of dogs. | Men itlardan qo‘rqaman.
agree | rozi bo‘lmoq | I agree with you. | Men sizga qo‘shilaman.
angry | jahli chiqqan | He is angry with me. | U mendan jahli chiqdi.`}
              disabled={loading}
            />
          </div>

          {error && <div className="errorBox">{error}</div>}

          {message && <div className="successBox">{message}</div>}

          <div className="bottomActions">
            <button
              className="saveButton"
              onClick={saveUnit}
              disabled={loading}
            >
              {loading ? "Kutilmoqda..." : "Saqlash"}
            </button>

            <button
              className="reloadButton"
              onClick={loadUnit}
              disabled={loading}
            >
              Qayta yuklash
            </button>

            <button
              className="deleteButton"
              onClick={deleteUnit}
              disabled={loading}
            >
              Unitni o‘chirish
            </button>
          </div>
        </div>
      </section>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          padding: 26px 28px 60px;
          background:
            radial-gradient(
              circle at top,
              #ffffff 0%,
              #f4f8fa 45%,
              #edf3f5 100%
            );
          color: #062f50;
          font-family: "Bell MT", "Times New Roman", serif;
        }

        /* =====================
           TOP PANEL
        ====================== */

        .topPanel {
          width: min(1500px, 96%);
          min-height: 108px;
          margin: 0 auto 75px;
          padding: 18px 25px;

          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;

          border: 3px solid #0a3b58;
          border-radius: 25px;

          background: linear-gradient(
            180deg,
            #83d8fb 0%,
            #54bce8 45%,
            #3198c8 100%
          );

          box-shadow:
            inset 0 3px 4px rgba(255, 255, 255, 0.85),
            inset 0 -7px 0 #086184,
            0 12px 0 #073b55,
            0 20px 28px rgba(0, 0, 0, 0.18);
        }

        .namePlate {
          min-width: 410px;
          padding: 20px 26px;

          text-align: center;
          font-size: 25px;
          font-weight: 700;
          color: #111;

          border: 3px solid #59636a;
          border-radius: 18px;

          background: linear-gradient(
            180deg,
            #ffffff,
            #e7e7e7 60%,
            #cccccc
          );

          box-shadow:
            inset 0 3px 4px #ffffff,
            0 8px 0 #657077,
            0 12px 18px rgba(0, 0, 0, 0.2);
        }

        .topActions {
          display: flex;
          gap: 16px;
          align-items: center;
        }

        button {
          font-family: inherit;
          font-weight: 700;
          cursor: pointer;
        }

        button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .whiteButton,
        .blueButton {
          min-width: 140px;
          padding: 18px 20px;
          border-radius: 15px;
          font-size: 15px;
        }

        .whiteButton {
          color: #111;
          border: 2px solid #5a646a;

          background: linear-gradient(
            180deg,
            #ffffff,
            #e9e9e9 60%,
            #cfcfcf
          );

          box-shadow:
            inset 0 2px 3px white,
            0 7px 0 #687278;
        }

        .blueButton {
          color: #063453;
          border: 2px solid #075278;

          background: linear-gradient(
            180deg,
            #b8ebff,
            #65c9f0 55%,
            #36a7d5
          );

          box-shadow:
            inset 0 2px 3px white,
            0 7px 0 #075274;
        }

        .whiteButton:active,
        .blueButton:active,
        .manageButton:active,
        .saveButton:active,
        .reloadButton:active,
        .deleteButton:active {
          transform: translateY(4px);
          box-shadow: none;
        }

        /* =====================
           MAIN PANEL
        ====================== */

        .mainPanel {
          position: relative;

          width: min(1150px, 96%);
          margin: 0 auto;
          padding: 75px 35px 42px;

          border: 3px solid #343b3f;
          border-radius: 26px;

          background: linear-gradient(
            145deg,
            #686e71 0%,
            #555b5e 45%,
            #3f4548 100%
          );

          box-shadow:
            inset 0 3px 3px rgba(255, 255, 255, 0.2),
            inset 0 -8px 0 #292e31,
            0 14px 24px rgba(0, 0, 0, 0.22);
        }

        .titlePlate {
          position: absolute;
          top: -45px;
          left: 50%;
          transform: translateX(-50%);

          min-width: 300px;
          padding: 17px 35px;

          text-align: center;
          font-size: 30px;
          font-weight: 700;

          border: 3px solid #07527a;
          border-radius: 18px;

          background: linear-gradient(
            180deg,
            #a3e6ff,
            #60c5ee 55%,
            #329dcc
          );

          box-shadow:
            inset 0 3px 3px white,
            0 8px 0 #075274,
            0 12px 18px rgba(0, 0, 0, 0.25);
        }

        /* =====================
           DICTIONARY CARDS
        ====================== */

        .dictionaryCards {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 25px;
          margin-bottom: 30px;
        }

        .dictionaryCard {
          min-height: 220px;
          padding: 26px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 22px;

          color: #111;

          border: 2px solid #e9e9e9;
          border-radius: 20px;

          background: linear-gradient(
            145deg,
            #ffffff 0%,
            #eeeeee 55%,
            #d5d5d5 100%
          );

          box-shadow:
            inset 0 4px 5px white,
            0 9px 0 #747d80,
            0 14px 20px rgba(0, 0, 0, 0.22);
        }

        .dictionaryCard h2 {
          margin: 0;
          text-align: center;
          font-size: 27px;
        }

        .miniBadge {
          min-width: 58px;
          height: 52px;
          padding: 0 12px;

          display: flex;
          align-items: center;
          justify-content: center;

          font-size: 17px;
          font-weight: 700;
          color: #063554;

          border: 2px solid #075277;
          border-radius: 12px;

          background: linear-gradient(
            180deg,
            #c7f0ff,
            #69c9ee 55%,
            #35a4d2
          );

          box-shadow:
            inset 0 2px 3px white,
            0 6px 0 #075274;
        }

        .manageButton {
          min-width: 160px;
          padding: 14px 22px;

          color: #063554;
          font-size: 16px;

          border: 2px solid #075277;
          border-radius: 12px;

          background: linear-gradient(
            180deg,
            #bcecff,
            #65c8ef 55%,
            #35a4d2
          );

          box-shadow:
            inset 0 2px 3px white,
            0 6px 0 #075274;
        }

        /* =====================
           VOCABULARY BOX
        ====================== */

        .vocabularyBox {
          padding: 30px;
          color: #111;

          border: 2px solid #e8e8e8;
          border-radius: 20px;

          background: linear-gradient(
            145deg,
            #ffffff,
            #eeeeee 60%,
            #d8d8d8
          );

          box-shadow:
            inset 0 4px 5px white,
            0 9px 0 #737c80,
            0 14px 20px rgba(0, 0, 0, 0.22);
        }

        .vocabularyHeading {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 20px;
          margin-bottom: 30px;
          text-align: center;
        }

        .vocabularyHeading h1 {
          margin: 0 0 5px;
          font-size: 31px;
        }

        .vocabularyHeading p {
          margin: 0;
          font-size: 15px;
          color: #424242;
        }

        .bigBadge {
          min-width: 70px;
          height: 55px;

          display: flex;
          align-items: center;
          justify-content: center;

          color: #063554;
          font-weight: 700;

          border: 2px solid #075277;
          border-radius: 12px;

          background: linear-gradient(
            180deg,
            #c7f0ff,
            #69c9ee 55%,
            #35a4d2
          );

          box-shadow:
            inset 0 2px 3px white,
            0 6px 0 #075274;
        }

        .selectors {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field label {
          font-size: 18px;
          font-weight: 700;
        }

        select {
          width: 100%;
          padding: 16px 18px;

          font-family: inherit;
          font-size: 17px;
          font-weight: 700;

          border: 1px solid #8c969b;
          border-radius: 12px;

          background: #fff;

          box-shadow:
            inset 0 2px 3px rgba(0, 0, 0, 0.05),
            0 5px 0 #8b9498;
        }

        .selectedBox {
          margin-top: 24px;
          padding: 15px 18px;

          font-size: 17px;
          color: #073c5d;

          border: 1px solid #4b9ec3;
          border-radius: 10px;

          background: linear-gradient(
            180deg,
            #d9f4ff,
            #b7e3f5
          );

          box-shadow: 0 5px 0 #76a9bd;
        }

        .inputSection {
          margin-top: 30px;
        }

        .inputSection h2 {
          margin: 0 0 7px;
          font-size: 25px;
        }

        .inputSection p {
          margin: 4px 0;
          color: #444;
          font-size: 15px;
        }

        textarea {
          width: 100%;
          min-height: 330px;
          margin-top: 15px;
          padding: 18px;

          resize: vertical;

          font-family: "Bell MT", "Times New Roman", serif;
          font-size: 17px;
          line-height: 1.65;

          border: 1px solid #8d969b;
          border-radius: 12px;
          outline: none;

          background: #fff;

          box-shadow:
            inset 0 3px 6px rgba(0, 0, 0, 0.08),
            0 4px 0 #91999d;
        }

        textarea:focus {
          border-color: #1987b6;
          box-shadow:
            inset 0 3px 6px rgba(0, 0, 0, 0.08),
            0 0 0 3px rgba(51, 174, 224, 0.18),
            0 4px 0 #4d91ad;
        }

        .successBox,
        .errorBox {
          margin-top: 20px;
          padding: 15px 18px;
          border-radius: 10px;
          font-weight: 700;
        }

        .successBox {
          color: #155f2a;
          background: #e3f7e8;
          border: 1px solid #74ba85;
        }

        .errorBox {
          color: #8a1c1c;
          background: #fdeaea;
          border: 1px solid #d88b8b;
        }

        .bottomActions {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
          margin-top: 25px;
        }

        .saveButton,
        .reloadButton,
        .deleteButton {
          min-width: 150px;
          padding: 14px 22px;

          border-radius: 11px;
          font-size: 16px;
        }

        .saveButton {
          color: #063554;
          border: 2px solid #075277;

          background: linear-gradient(
            180deg,
            #bcecff,
            #65c8ef 55%,
            #35a4d2
          );

          box-shadow:
            inset 0 2px 3px white,
            0 6px 0 #075274;
        }

        .reloadButton {
          color: #222;
          border: 2px solid #6c7579;

          background: linear-gradient(
            180deg,
            #ffffff,
            #e8e8e8,
            #cfcfcf
          );

          box-shadow:
            inset 0 2px 3px white,
            0 6px 0 #737b7f;
        }

        .deleteButton {
          color: #7b1111;
          border: 2px solid #a84e4e;

          background: linear-gradient(
            180deg,
            #fff7f7,
            #f3dede,
            #e5bcbc
          );

          box-shadow:
            inset 0 2px 3px white,
            0 6px 0 #9e5c5c;
        }

        /* =====================
           MOBILE
        ====================== */

        @media (max-width: 850px) {
          .page {
            padding: 16px 12px 40px;
          }

          .topPanel {
            width: 100%;
            margin-bottom: 65px;
            padding: 14px;
            flex-direction: column;
          }

          .namePlate {
            width: 100%;
            min-width: 0;
            font-size: 20px;
          }

          .topActions {
            width: 100%;
          }

          .whiteButton,
          .blueButton {
            flex: 1;
            min-width: 0;
          }

          .mainPanel {
            width: 100%;
            padding: 65px 15px 25px;
          }

          .titlePlate {
            min-width: 240px;
            font-size: 24px;
          }

          .dictionaryCards {
            grid-template-columns: 1fr;
          }

          .dictionaryCard {
            min-height: 190px;
          }

          .selectors {
            grid-template-columns: 1fr;
          }

          .vocabularyBox {
            padding: 20px 15px;
          }

          .vocabularyHeading {
            flex-direction: column;
          }

          .vocabularyHeading h1 {
            font-size: 26px;
          }

          textarea {
            min-height: 300px;
          }

          .bottomActions {
            flex-direction: column;
          }

          .saveButton,
          .reloadButton,
          .deleteButton {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}
