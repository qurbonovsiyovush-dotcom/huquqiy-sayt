"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type DictionaryWord = {
  id: string;
  english: string;
  uzbek: string;
  createdAt: string;
  updatedAt: string;
};

type ApiResponse = {
  ok: boolean;
  message?: string;
  total?: number;
  words?: DictionaryWord[];
};

const API = "/api/dictionary/english-uzbek";

export default function EnglishUzbekAdminPage() {
  const [words, setWords] = useState<DictionaryWord[]>([]);
  const [loading, setLoading] = useState(true);

  const [english, setEnglish] = useState("");
  const [uzbek, setUzbek] = useState("");

  const [search, setSearch] = useState("");

  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEnglish, setEditEnglish] = useState("");
  const [editUzbek, setEditUzbek] = useState("");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState<"success" | "error" | "">("");

  /* =====================================================
     XABAR
  ===================================================== */

  function showMessage(
    text: string,
    type: "success" | "error"
  ) {
    setMessage(text);
    setMessageType(type);

    window.setTimeout(() => {
      setMessage("");
      setMessageType("");
    }, 5000);
  }

  /* =====================================================
     LUG'ATNI YUKLASH
  ===================================================== */

  const loadWords = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(API, {
        cache: "no-store",
      });

      const data: ApiResponse = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message || "Lug‘atni yuklab bo‘lmadi."
        );
      }

      setWords(data.words || []);
    } catch (error) {
      console.error(error);

      showMessage(
        "Lug‘atni yuklashda xatolik yuz berdi.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWords();
  }, [loadWords]);

  /* =====================================================
     BITTA SO'Z QO'SHISH
  ===================================================== */

  async function addWord() {
    const en = english.trim();
    const uz = uzbek.trim();

    if (!en) {
      showMessage(
        "Inglizcha so‘zni kiriting.",
        "error"
      );
      return;
    }

    if (!uz) {
      showMessage(
        "O‘zbekcha tarjimani kiriting.",
        "error"
      );
      return;
    }

    try {
      const response = await fetch(API, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          english: en,
          uzbek: uz,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message || "So‘zni qo‘shib bo‘lmadi."
        );
      }

      setEnglish("");
      setUzbek("");

      showMessage(
        `“${en}” lug‘atga qo‘shildi.`,
        "success"
      );

      await loadWords();
    } catch (error) {
      const text =
        error instanceof Error
          ? error.message
          : "Xatolik yuz berdi.";

      showMessage(text, "error");
    }
  }

  /* =====================================================
     IMPORT MATNINI AJRATISH

     QABUL QILADI:

     1. plate - tarelka
     2) name — ism
     place = joy
     table: stol
     book    kitob
  ===================================================== */

  function parseImportText(text: string) {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const result: {
      english: string;
      uzbek: string;
    }[] = [];

    for (const originalLine of lines) {
      let line = originalLine;

      /*
        Boshidagi raqamni olib tashlaydi:

        1.
        1)
        125.
        2700)
      */
      line = line.replace(
        /^\s*\d+\s*[\.\)\-:]?\s*/,
        ""
      );

      let englishPart = "";
      let uzbekPart = "";

      /*
        Eng ishonchli ajratgichlar:
        —  –  -  =  :
      */
      const separators = [
        " — ",
        " – ",
        " - ",
        " = ",
        ": ",
        "—",
        "–",
      ];

      let found = false;

      for (const separator of separators) {
        const position = line.indexOf(separator);

        if (position > 0) {
          englishPart = line
            .slice(0, position)
            .trim();

          uzbekPart = line
            .slice(position + separator.length)
            .trim();

          found = true;
          break;
        }
      }

      /*
        Agar yuqoridagi format bo'lmasa,
        TAB bilan ajratilgan matnni tekshiradi.
      */
      if (!found && line.includes("\t")) {
        const parts = line
          .split("\t")
          .map((part) => part.trim())
          .filter(Boolean);

        if (parts.length >= 2) {
          englishPart = parts[0];
          uzbekPart = parts.slice(1).join(", ");
          found = true;
        }
      }

      /*
        Noto'g'ri satrni o'tkazib yuboramiz.
      */
      if (!found) {
        continue;
      }

      englishPart = englishPart.trim();
      uzbekPart = uzbekPart.trim();

      if (!englishPart || !uzbekPart) {
        continue;
      }

      result.push({
        english: englishPart,
        uzbek: uzbekPart,
      });
    }

    return result;
  }

  const parsedPreview = useMemo(
    () => parseImportText(importText),
    [importText]
  );

  /* =====================================================
     OMMAVIY IMPORT
  ===================================================== */

  async function importWords() {
    const parsed = parseImportText(importText);

    if (parsed.length === 0) {
      showMessage(
        "Import qilinadigan so‘zlar topilmadi.",
        "error"
      );
      return;
    }

    const confirmed = window.confirm(
      `${parsed.length} ta so‘z aniqlandi.\n\n` +
        `Ularni lug‘atga import qilamizmi?`
    );

    if (!confirmed) return;

    try {
      setImporting(true);

      let added = 0;
      let skipped = 0;
      let failed = 0;

      /*
        Bir vaqtning o'zida 2700 ta request
        yubormaymiz.

        10 tadan guruhlab yuboramiz.
      */
      const batchSize = 10;

      for (
        let start = 0;
        start < parsed.length;
        start += batchSize
      ) {
        const batch = parsed.slice(
          start,
          start + batchSize
        );

        const results = await Promise.all(
          batch.map(async (word) => {
            try {
              const response = await fetch(API, {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body: JSON.stringify(word),
              });

              const data = await response.json();

              if (response.status === 409) {
                return "skipped";
              }

              if (!response.ok || !data.ok) {
                return "failed";
              }

              return "added";
            } catch {
              return "failed";
            }
          })
        );

        for (const result of results) {
          if (result === "added") {
            added++;
          } else if (result === "skipped") {
            skipped++;
          } else {
            failed++;
          }
        }

        const processed = Math.min(
          start + batchSize,
          parsed.length
        );

        setImportProgress(
          `${processed} / ${parsed.length}`
        );
      }

      setImportText("");

      await loadWords();

      showMessage(
        `Import tugadi. Qo‘shildi: ${added} ta. ` +
          `Mavjud bo‘lgani uchun o‘tkazildi: ${skipped} ta. ` +
          `Xato: ${failed} ta.`,
        failed > 0 ? "error" : "success"
      );
    } finally {
      setImporting(false);
      setImportProgress("");
    }
  }

  /* =====================================================
     TAHRIRLASHNI BOSHLASH
  ===================================================== */

  function startEdit(word: DictionaryWord) {
    setEditingId(word.id);
    setEditEnglish(word.english);
    setEditUzbek(word.uzbek);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditEnglish("");
    setEditUzbek("");
  }

  /* =====================================================
     TAHRIRLANGAN SO'ZNI SAQLASH
  ===================================================== */

  async function saveEdit() {
    if (!editingId) return;

    if (!editEnglish.trim()) {
      showMessage(
        "Inglizcha so‘z bo‘sh bo‘lishi mumkin emas.",
        "error"
      );
      return;
    }

    if (!editUzbek.trim()) {
      showMessage(
        "Tarjima bo‘sh bo‘lishi mumkin emas.",
        "error"
      );
      return;
    }

    try {
      const response = await fetch(API, {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          id: editingId,
          english: editEnglish.trim(),
          uzbek: editUzbek.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message ||
            "So‘zni tahrirlab bo‘lmadi."
        );
      }

      cancelEdit();

      await loadWords();

      showMessage(
        "So‘z muvaffaqiyatli tahrirlandi.",
        "success"
      );
    } catch (error) {
      const text =
        error instanceof Error
          ? error.message
          : "Xatolik yuz berdi.";

      showMessage(text, "error");
    }
  }

  /* =====================================================
     O'CHIRISH
  ===================================================== */

  async function deleteWord(word: DictionaryWord) {
    const confirmed = window.confirm(
      `“${word.english} — ${word.uzbek}”\n\n` +
        `so‘zini lug‘atdan o‘chirasizmi?`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API}?id=${encodeURIComponent(word.id)}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message || "So‘zni o‘chirib bo‘lmadi."
        );
      }

      setWords((old) =>
        old.filter((item) => item.id !== word.id)
      );

      showMessage(
        "So‘z lug‘atdan o‘chirildi.",
        "success"
      );
    } catch (error) {
      const text =
        error instanceof Error
          ? error.message
          : "Xatolik yuz berdi.";

      showMessage(text, "error");
    }
  }

  /* =====================================================
     QIDIRUV
  ===================================================== */

  const filteredWords = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return words;

    return words.filter(
      (word) =>
        word.english
          .toLowerCase()
          .includes(q) ||
        word.uzbek
          .toLowerCase()
          .includes(q)
    );
  }, [words, search]);

  return (
    <main className="page">
      {/* =========================================
          SARLAVHA
      ========================================= */}

      <section className="header3d">
        <div>
          <h1>English–Uzbek Dictionary</h1>
          <div className="adminLabel">
            Lug‘at boshqaruvi
          </div>
        </div>

        <div className="totalBox">
          <strong>{words.length}</strong>
          <span>Jami so‘z</span>
        </div>
      </section>

      {/* XABAR */}

      {message && (
        <div
          className={`message ${
            messageType === "success"
              ? "successMessage"
              : "errorMessage"
          }`}
        >
          {message}
        </div>
      )}

      {/* =========================================
          BITTA SO'Z QO'SHISH
      ========================================= */}

      <section className="panel">
        <div className="panelTitle">
          Yangi so‘z qo‘shish
        </div>

        <div className="singleAdd">
          <div className="field">
            <label>English</label>

            <input
              value={english}
              onChange={(event) =>
                setEnglish(event.target.value)
              }
              placeholder="Masalan: book"
            />
          </div>

          <div className="field">
            <label>O‘zbekcha tarjima</label>

            <input
              value={uzbek}
              onChange={(event) =>
                setUzbek(event.target.value)
              }
              placeholder="Masalan: kitob"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  addWord();
                }
              }}
            />
          </div>

          <button
            className="blueButton"
            onClick={addWord}
          >
            + Qo‘shish
          </button>
        </div>
      </section>

      {/* =========================================
          OMMAVIY IMPORT
      ========================================= */}

      <section className="panel">
        <div className="panelTitle">
          Ommaviy import
        </div>

        <textarea
          className="importArea"
          value={importText}
          onChange={(event) =>
            setImportText(event.target.value)
          }
          placeholder={`Masalan:

1. plate - tarelka
2. name - ism, nom
3. place - joy
4. table - stol, jadval`}
        />

        <div className="importBottom">
          <div className="detected">
            Aniqlangan:{" "}
            <strong>{parsedPreview.length}</strong>{" "}
            ta so‘z
          </div>

          <button
            className="importButton"
            disabled={importing}
            onClick={importWords}
          >
            {importing
              ? `Import qilinmoqda ${
                  importProgress
                    ? `(${importProgress})`
                    : ""
                }`
              : "Import qilish"}
          </button>
        </div>
      </section>

      {/* =========================================
          LUG'AT
      ========================================= */}

      <section className="panel">
        <div className="dictionaryHeader">
          <div className="panelTitle noMargin">
            Lug‘at
          </div>

          <input
            className="searchInput"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="So‘z qidirish..."
          />
        </div>

        <div className="resultInfo">
          Ko‘rsatilmoqda:{" "}
          <strong>{filteredWords.length}</strong>{" "}
          / {words.length}
        </div>

        {loading ? (
          <div className="statusBox">
            Lug‘at yuklanmoqda...
          </div>
        ) : words.length === 0 ? (
          <div className="statusBox">
            Lug‘at hozircha bo‘sh. Yuqoridan
            so‘z qo‘shing yoki 2700 ta so‘zni
            ommaviy import qiling.
          </div>
        ) : filteredWords.length === 0 ? (
          <div className="statusBox">
            Qidiruv bo‘yicha so‘z topilmadi.
          </div>
        ) : (
          <div className="wordList">
            {filteredWords.map((word, index) => (
              <article
                className="wordCard"
                key={word.id}
              >
                <div className="number">
                  {index + 1}
                </div>

                {editingId === word.id ? (
                  <>
                    <input
                      className="editInput"
                      value={editEnglish}
                      onChange={(event) =>
                        setEditEnglish(
                          event.target.value
                        )
                      }
                    />

                    <input
                      className="editInput"
                      value={editUzbek}
                      onChange={(event) =>
                        setEditUzbek(
                          event.target.value
                        )
                      }
                    />

                    <div className="actions">
                      <button
                        className="saveButton"
                        onClick={saveEdit}
                      >
                        Saqlash
                      </button>

                      <button
                        className="cancelButton"
                        onClick={cancelEdit}
                      >
                        Bekor
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="englishWord">
                      {word.english}
                    </div>

                    <div className="uzbekWord">
                      {word.uzbek}
                    </div>

                    <div className="actions">
                      <button
                        className="editButton"
                        onClick={() =>
                          startEdit(word)
                        }
                      >
                        Tahrirlash
                      </button>

                      <button
                        className="deleteButton"
                        onClick={() =>
                          deleteWord(word)
                        }
                      >
                        O‘chirish
                      </button>
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        :global(body) {
          margin: 0;
        }

        button,
        input,
        textarea {
          font-family:
            "Bell MT",
            Georgia,
            serif;
        }

        .page {
          min-height: 100vh;
          padding: 35px 25px 80px;

          font-family:
            "Bell MT",
            Georgia,
            serif;

          background:
            radial-gradient(
              circle at top,
              #ffffff,
              #eef3f6
            );

          color: #142a36;
        }

        /* HEADER */

        .header3d {
          width: min(1150px, 100%);
          margin: 0 auto 35px;

          padding: 25px 30px;

          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;

          border: 3px solid #174d68;
          border-radius: 22px;

          background:
            linear-gradient(
              180deg,
              #9ce5ff,
              #64bee8 50%,
              #3c96c4
            );

          box-shadow:
            inset 0 4px 3px
              rgba(255,255,255,.8),
            0 9px 0 #194f69,
            0 15px 22px
              rgba(0,0,0,.22);
        }

        .header3d h1 {
          margin: 0;

          font-size:
            clamp(25px, 4vw, 38px);

          color: #073d5d;
        }

        .adminLabel {
          margin-top: 5px;

          font-weight: 900;
          color: #24536c;
        }

        .totalBox {
          min-width: 130px;

          padding: 12px 20px;

          text-align: center;

          border: 2px solid #59676e;
          border-radius: 12px;

          background:
            linear-gradient(
              white,
              #dddddd
            );

          box-shadow:
            inset 0 3px 2px white,
            0 6px 0 #586268;
        }

        .totalBox strong {
          display: block;

          font-size: 27px;
          color: #08689c;
        }

        .totalBox span {
          font-size: 13px;
          font-weight: 900;
        }

        /* MESSAGE */

        .message {
          width: min(1150px, 100%);
          margin: 0 auto 25px;
          padding: 15px 20px;

          border-radius: 12px;

          text-align: center;
          font-weight: 900;
        }

        .successMessage {
          border: 2px solid #49915e;
          background: #eaffef;
          color: #1d6b35;
        }

        .errorMessage {
          border: 2px solid #b84a4a;
          background: #fff0f0;
          color: #922323;
        }

        /* PANELS */

        .panel {
          width: min(1150px, 100%);
          margin: 0 auto 32px;

          padding: 26px;

          border: 2px solid #747e83;
          border-radius: 18px;

          background:
            linear-gradient(
              145deg,
              #ffffff,
              #eceeef
            );

          box-shadow:
            inset 0 3px 3px white,
            0 8px 0 #5c666b,
            0 14px 20px
              rgba(0,0,0,.16);
        }

        .panelTitle {
          margin-bottom: 22px;

          font-size: 24px;
          font-weight: 900;

          color: #07537d;
        }

        .noMargin {
          margin: 0;
        }

        /* SINGLE ADD */

        .singleAdd {
          display: grid;
          grid-template-columns:
            1fr 1fr 150px;

          align-items: end;
          gap: 18px;
        }

        .field label {
          display: block;
          margin-bottom: 7px;

          font-weight: 900;
        }

        .field input,
        .editInput,
        .searchInput {
          width: 100%;
          min-height: 48px;

          padding: 10px 14px;

          border: 2px solid #8a969c;
          border-radius: 9px;

          outline: none;

          background: white;

          font-size: 16px;
        }

        .field input:focus,
        .editInput:focus,
        .searchInput:focus,
        .importArea:focus {
          border-color: #158ac2;

          box-shadow:
            0 0 0 3px
              rgba(21,138,194,.13);
        }

        /* BUTTONS */

        .blueButton,
        .importButton {
          min-height: 48px;
          padding: 10px 20px;

          border: 2px solid #155b7d;
          border-radius: 9px;

          background:
            linear-gradient(
              #d9f6ff,
              #63c2e8 55%,
              #3696c3
            );

          box-shadow:
            inset 0 3px 2px white,
            0 5px 0 #174f6a;

          color: #063f63;

          font-size: 16px;
          font-weight: 900;

          cursor: pointer;
        }

        .blueButton:active,
        .importButton:active,
        .editButton:active,
        .deleteButton:active,
        .saveButton:active,
        .cancelButton:active {
          transform: translateY(4px);
          box-shadow: none;
        }

        .importButton:disabled {
          opacity: .65;
          cursor: wait;
        }

        /* IMPORT */

        .importArea {
          width: 100%;
          min-height: 270px;

          resize: vertical;

          padding: 18px;

          border: 2px solid #8a969c;
          border-radius: 12px;

          outline: none;

          background: white;

          font-size: 16px;
          line-height: 1.6;
        }

        .importBottom {
          margin-top: 18px;

          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .detected {
          font-size: 17px;
          font-weight: 900;
        }

        .detected strong {
          color: #0780bb;
          font-size: 22px;
        }

        /* DICTIONARY */

        .dictionaryHeader {
          display: grid;
          grid-template-columns:
            1fr minmax(250px, 420px);

          align-items: center;
          gap: 20px;

          margin-bottom: 15px;
        }

        .resultInfo {
          margin-bottom: 18px;

          font-weight: 900;
          color: #536168;
        }

        .statusBox {
          padding: 40px 20px;

          text-align: center;

          border: 2px dashed #a5adb1;
          border-radius: 12px;

          color: #56636a;

          font-size: 18px;
          font-weight: 900;
        }

        .wordList {
          display: grid;
          gap: 13px;
        }

        .wordCard {
          min-height: 70px;

          padding: 12px 15px;

          display: grid;
          grid-template-columns:
            55px 1fr 1.2fr 190px;

          align-items: center;
          gap: 14px;

          border: 2px solid #c0c6c9;
          border-radius: 12px;

          background:
            linear-gradient(
              white,
              #e6e6e6
            );

          box-shadow:
            0 4px 0 #7a8387,
            0 7px 10px
              rgba(0,0,0,.1);
        }

        .number {
          width: 42px;
          height: 42px;

          display: grid;
          place-items: center;

          border-radius: 9px;

          background:
            linear-gradient(
              #c9efff,
              #66bee4
            );

          border: 1px solid #25769b;

          font-weight: 900;
          color: #064a6d;
        }

        .englishWord {
          font-size: 19px;
          font-weight: 900;
          color: #07537d;
        }

        .uzbekWord {
          font-size: 17px;
          font-weight: 700;
        }

        .actions {
          display: flex;
          gap: 8px;
        }

        .editButton,
        .deleteButton,
        .saveButton,
        .cancelButton {
          flex: 1;
          min-height: 38px;

          border-radius: 7px;

          font-weight: 900;
          cursor: pointer;
        }

        .editButton,
        .saveButton {
          border: 1px solid #23719a;

          background:
            linear-gradient(
              #d7f5ff,
              #6cc4e9
            );

          box-shadow:
            0 3px 0 #28647f;

          color: #084d70;
        }

        .deleteButton {
          border: 1px solid #a94a4a;

          background:
            linear-gradient(
              #fff1f1,
              #efa0a0
            );

          box-shadow:
            0 3px 0 #934444;

          color: #8a2020;
        }

        .cancelButton {
          border: 1px solid #777;

          background:
            linear-gradient(
              white,
              #d4d4d4
            );

          box-shadow:
            0 3px 0 #777;
        }

        /* RESPONSIVE */

        @media (max-width: 900px) {
          .singleAdd {
            grid-template-columns: 1fr;
          }

          .dictionaryHeader {
            grid-template-columns: 1fr;
          }

          .wordCard {
            grid-template-columns:
              50px 1fr;

            gap: 12px;
          }

          .uzbekWord {
            grid-column: 2;
          }

          .actions {
            grid-column:
              1 / -1;
          }
        }

        @media (max-width: 600px) {
          .page {
            padding:
              20px 12px
              60px;
          }

          .header3d {
            flex-direction: column;
            text-align: center;
          }

          .totalBox {
            width: 100%;
          }

          .panel {
            padding: 18px 14px;
          }

          .importBottom {
            flex-direction: column;
            align-items: stretch;
          }

          .importButton {
            width: 100%;
          }

          .wordCard {
            grid-template-columns: 1fr;
          }

          .number {
            margin: auto;
          }

          .englishWord,
          .uzbekWord {
            grid-column: 1;
            text-align: center;
          }

          .actions {
            grid-column: 1;
            flex-direction: column;
          }
        }
      `}</style>
    </main>
  );
}
