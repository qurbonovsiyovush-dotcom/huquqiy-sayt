"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type SynonymWord = {
  id: string;
  word: string;
  uzbek: string;
  synonyms: string[];
  createdAt: string;
  updatedAt: string;
};

type ApiResponse = {
  ok: boolean;
  message?: string;
  total?: number;
  words?: SynonymWord[];
  added?: number;
  skipped?: number;
  invalid?: number;
};

const API = "/api/dictionary/synonyms";
const BULK_API = "/api/dictionary/synonyms/bulk";

export default function SynonymsAdminPage() {
  const [words, setWords] = useState<SynonymWord[]>([]);
  const [loading, setLoading] = useState(true);

  const [word, setWord] = useState("");
  const [uzbek, setUzbek] = useState("");
  const [synonyms, setSynonyms] = useState("");

  const [search, setSearch] = useState("");

  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [editWord, setEditWord] = useState("");
  const [editUzbek, setEditUzbek] = useState("");
  const [editSynonyms, setEditSynonyms] = useState("");

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
    }, 6000);
  }

  /* =====================================================
     YUKLASH
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
          data.message ||
            "Sinonimlarni yuklab bo‘lmadi."
        );
      }

      setWords(data.words || []);
    } catch (error) {
      console.error(error);

      showMessage(
        "Sinonimlarni yuklashda xatolik yuz berdi.",
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
     SYNONYMLARNI AJRATISH
  ===================================================== */

  function parseSynonyms(value: string) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  /* =====================================================
     BITTA SO‘Z QO‘SHISH
  ===================================================== */

  async function addWord() {
    const cleanWord = word.trim();
    const cleanUzbek = uzbek.trim();
    const cleanSynonyms = parseSynonyms(synonyms);

    if (!cleanWord) {
      showMessage("Inglizcha so‘zni kiriting.", "error");
      return;
    }

    if (!cleanUzbek) {
      showMessage(
        "O‘zbekcha tarjimani kiriting.",
        "error"
      );
      return;
    }

    if (cleanSynonyms.length === 0) {
      showMessage(
        "Kamida bitta sinonim kiriting.",
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
          word: cleanWord,
          uzbek: cleanUzbek,
          synonyms: cleanSynonyms,
        }),
      });

      const data: ApiResponse = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message || "So‘zni qo‘shib bo‘lmadi."
        );
      }

      setWord("");
      setUzbek("");
      setSynonyms("");

      showMessage(
        `“${cleanWord}” muvaffaqiyatli qo‘shildi.`,
        "success"
      );

      await loadWords();
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Xatolik yuz berdi.",
        "error"
      );
    }
  }

  /* =====================================================
     IMPORTNI AJRATISH

     FORMAT:
     big | katta | large, huge, enormous
  ===================================================== */

  function parseImportText(text: string) {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const result: {
      word: string;
      uzbek: string;
      synonyms: string[];
    }[] = [];

    for (const originalLine of lines) {
      const line = originalLine.replace(
        /^\s*\d+\s*[\.\)\-:]?\s*/,
        ""
      );

      const parts = line
        .split("|")
        .map((part) => part.trim());

      if (parts.length < 3) {
        continue;
      }

      const wordPart = parts[0];
      const uzbekPart = parts[1];

      const synonymPart = parts
        .slice(2)
        .join("|");

      const synonymList = parseSynonyms(synonymPart);

      if (
        !wordPart ||
        !uzbekPart ||
        synonymList.length === 0
      ) {
        continue;
      }

      result.push({
        word: wordPart,
        uzbek: uzbekPart,
        synonyms: synonymList,
      });
    }

    return result;
  }

  const parsedPreview = useMemo(() => {
    return parseImportText(importText);
  }, [importText]);

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
        `Hammasini sinonimlar bazasiga import qilamizmi?`
    );

    if (!confirmed) return;

    try {
      setImporting(true);

      const response = await fetch(BULK_API, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          words: parsed,
        }),
      });

      const data: ApiResponse = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message || "Import amalga oshmadi."
        );
      }

      setImportText("");

      await loadWords();

      showMessage(
        `Import tugadi. ` +
          `Qo‘shildi: ${data.added ?? 0} ta. ` +
          `Takroriy: ${data.skipped ?? 0} ta. ` +
          `Noto‘g‘ri: ${data.invalid ?? 0} ta. ` +
          `Jami: ${data.total ?? 0} ta.`,
        "success"
      );
    } catch (error) {
      console.error(error);

      showMessage(
        error instanceof Error
          ? error.message
          : "Import vaqtida xatolik yuz berdi.",
        "error"
      );
    } finally {
      setImporting(false);
    }
  }

  /* =====================================================
     TAHRIRLASH
  ===================================================== */

  function startEdit(item: SynonymWord) {
    setEditingId(item.id);
    setEditWord(item.word);
    setEditUzbek(item.uzbek);
    setEditSynonyms(item.synonyms.join(", "));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditWord("");
    setEditUzbek("");
    setEditSynonyms("");
  }

  async function saveEdit() {
    if (!editingId) return;

    const cleanWord = editWord.trim();
    const cleanUzbek = editUzbek.trim();
    const cleanSynonyms =
      parseSynonyms(editSynonyms);

    if (
      !cleanWord ||
      !cleanUzbek ||
      cleanSynonyms.length === 0
    ) {
      showMessage(
        "So‘z, tarjima va sinonimlarni to‘ldiring.",
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
          word: cleanWord,
          uzbek: cleanUzbek,
          synonyms: cleanSynonyms,
        }),
      });

      const data: ApiResponse = await response.json();

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
      showMessage(
        error instanceof Error
          ? error.message
          : "Xatolik yuz berdi.",
        "error"
      );
    }
  }

  /* =====================================================
     O‘CHIRISH
  ===================================================== */

  async function deleteWord(item: SynonymWord) {
    const confirmed = window.confirm(
      `“${item.word}” so‘zini o‘chirasizmi?`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API}?id=${encodeURIComponent(item.id)}`,
        {
          method: "DELETE",
        }
      );

      const data: ApiResponse = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message || "So‘zni o‘chirib bo‘lmadi."
        );
      }

      setWords((old) =>
        old.filter((word) => word.id !== item.id)
      );

      showMessage(
        "So‘z o‘chirildi.",
        "success"
      );
    } catch (error) {
      showMessage(
        error instanceof Error
          ? error.message
          : "Xatolik yuz berdi.",
        "error"
      );
    }
  }

  /* =====================================================
     QIDIRUV
  ===================================================== */

  const filteredWords = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return words;

    return words.filter((item) => {
      const synonymText =
        item.synonyms.join(" ").toLowerCase();

      return (
        item.word.toLowerCase().includes(q) ||
        item.uzbek.toLowerCase().includes(q) ||
        synonymText.includes(q)
      );
    });
  }, [words, search]);

  return (
    <main className="page">
      {/* HEADER */}

      <section className="header3d">
        <button
          type="button"
          className="backButton"
          onClick={() => {
            window.location.href = "/admin/dictionary";
          }}
        >
          ← Lug‘at boshqaruvi
        </button>

        <div className="headerTitle">
          <h1>Synonyms</h1>
          <div className="adminLabel">
            Sinonimlar boshqaruvi
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

      {/* YANGI SO‘Z */}

      <section className="panel">
        <div className="panelTitle">
          Yangi so‘z qo‘shish
        </div>

        <div className="singleAdd">
          <div className="field">
            <label>Word</label>

            <input
              value={word}
              onChange={(e) =>
                setWord(e.target.value)
              }
              placeholder="Masalan: big"
            />
          </div>

          <div className="field">
            <label>O‘zbekcha</label>

            <input
              value={uzbek}
              onChange={(e) =>
                setUzbek(e.target.value)
              }
              placeholder="Masalan: katta"
            />
          </div>

          <div className="field">
            <label>Synonyms</label>

            <input
              value={synonyms}
              onChange={(e) =>
                setSynonyms(e.target.value)
              }
              placeholder="large, huge, enormous"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
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

      {/* IMPORT */}

      <section className="panel">
        <div className="panelTitle">
          Ommaviy import
        </div>

        <div className="formatBox">
          Format:
          <strong>
            {" "}
            Word | O‘zbekcha | synonym1, synonym2
          </strong>
        </div>

        <textarea
          className="importArea"
          value={importText}
          disabled={importing}
          onChange={(e) =>
            setImportText(e.target.value)
          }
          placeholder={`Masalan:

1. big | katta | large, huge, enormous
2. happy | xursand | glad, pleased, joyful
3. begin | boshlamoq | start, commence
4. beautiful | chiroyli | pretty, attractive, lovely`}
        />

        <div className="importBottom">
          <div className="detected">
            Aniqlangan:{" "}
            <strong>{parsedPreview.length}</strong>{" "}
            ta so‘z
          </div>

          <button
            className="importButton"
            disabled={
              importing ||
              parsedPreview.length === 0
            }
            onClick={importWords}
          >
            {importing
              ? "Import qilinmoqda..."
              : `Import qilish (${parsedPreview.length})`}
          </button>
        </div>
      </section>

      {/* RO‘YXAT */}

      <section className="panel">
        <div className="dictionaryHeader">
          <div className="panelTitle noMargin">
            Synonyms
          </div>

          <input
            className="searchInput"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="So‘z yoki sinonim qidirish..."
          />
        </div>

        <div className="resultInfo">
          Ko‘rsatilmoqda:{" "}
          <strong>{filteredWords.length}</strong>
          {" / "}
          {words.length}
        </div>

        {loading ? (
          <div className="statusBox">
            Sinonimlar yuklanmoqda...
          </div>
        ) : words.length === 0 ? (
          <div className="statusBox">
            Hozircha sinonimlar mavjud emas.
          </div>
        ) : filteredWords.length === 0 ? (
          <div className="statusBox">
            So‘z topilmadi.
          </div>
        ) : (
          <div className="wordList">
            {filteredWords.map(
              (item, index) => (
                <article
                  className="wordCard"
                  key={item.id}
                >
                  <div className="number">
                    {index + 1}
                  </div>

                  {editingId === item.id ? (
                    <>
                      <input
                        className="editInput"
                        value={editWord}
                        onChange={(e) =>
                          setEditWord(
                            e.target.value
                          )
                        }
                      />

                      <input
                        className="editInput"
                        value={editUzbek}
                        onChange={(e) =>
                          setEditUzbek(
                            e.target.value
                          )
                        }
                      />

                      <input
                        className="editInput"
                        value={editSynonyms}
                        onChange={(e) =>
                          setEditSynonyms(
                            e.target.value
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
                        {item.word}
                      </div>

                      <div className="uzbekWord">
                        {item.uzbek}
                      </div>

                      <div className="synonymList">
                        {item.synonyms.map(
                          (synonym) => (
                            <span
                              className="synonymBadge"
                              key={synonym}
                            >
                              {synonym}
                            </span>
                          )
                        )}
                      </div>

                      <div className="actions">
                        <button
                          className="editButton"
                          onClick={() =>
                            startEdit(item)
                          }
                        >
                          Tahrirlash
                        </button>

                        <button
                          className="deleteButton"
                          onClick={() =>
                            deleteWord(item)
                          }
                        >
                          O‘chirish
                        </button>
                      </div>
                    </>
                  )}
                </article>
              )
            )}
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
          font-family: "Bell MT", Georgia, serif;
        }

        .page {
          min-height: 100vh;
          padding: 35px 25px 80px;

          font-family: "Bell MT", Georgia, serif;

          background: radial-gradient(
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

          background: linear-gradient(
            180deg,
            #9ce5ff,
            #64bee8 50%,
            #3c96c4
          );

          box-shadow:
            inset 0 4px 3px
              rgba(255, 255, 255, 0.8),
            0 9px 0 #194f69,
            0 15px 22px
              rgba(0, 0, 0, 0.22);
        }

        .headerTitle {
          flex: 1;
        }

        .header3d h1 {
          margin: 0;

          font-size: clamp(
            27px,
            4vw,
            40px
          );

          color: #073d5d;
        }

        .adminLabel {
          margin-top: 5px;
          font-weight: 900;
          color: #24536c;
        }

        .backButton {
          min-width: 180px;
          min-height: 52px;
          padding: 10px 18px;

          border: 2px solid #4f5c62;
          border-radius: 12px;

          background: linear-gradient(
            white,
            #d8d8d8
          );

          box-shadow:
            inset 0 3px 2px white,
            0 6px 0 #586268;

          color: #16252c;
          font-size: 15px;
          font-weight: 900;
          cursor: pointer;
        }

        .totalBox {
          min-width: 130px;
          padding: 12px 20px;

          text-align: center;

          border: 2px solid #59676e;
          border-radius: 12px;

          background: linear-gradient(
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

        /* PANEL */

        .panel {
          width: min(1150px, 100%);
          margin: 0 auto 32px;
          padding: 26px;

          border: 2px solid #747e83;
          border-radius: 18px;

          background: linear-gradient(
            145deg,
            #ffffff,
            #eceeef
          );

          box-shadow:
            inset 0 3px 3px white,
            0 8px 0 #5c666b,
            0 14px 20px
              rgba(0, 0, 0, 0.16);
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

        /* ADD */

        .singleAdd {
          display: grid;

          grid-template-columns:
            1fr 1fr 1.4fr 140px;

          align-items: end;
          gap: 15px;
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
            rgba(21, 138, 194, 0.13);
        }

        /* BUTTON */

        .blueButton,
        .importButton {
          min-height: 48px;
          padding: 10px 20px;

          border: 2px solid #155b7d;
          border-radius: 9px;

          background: linear-gradient(
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

        .backButton:active,
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
          opacity: 0.55;
          cursor: not-allowed;
        }

        /* IMPORT */

        .formatBox {
          margin-bottom: 14px;
          padding: 12px 15px;

          border-radius: 9px;

          background: #eaf7fd;

          border: 1px solid #8fc8e0;

          color: #24536c;
        }

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

        /* LIST */

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
          min-height: 76px;

          padding: 12px 15px;

          display: grid;

          grid-template-columns:
            55px
            1fr
            1fr
            1.8fr
            190px;

          align-items: center;
          gap: 14px;

          border: 2px solid #c0c6c9;
          border-radius: 12px;

          background: linear-gradient(
            white,
            #e6e6e6
          );

          box-shadow:
            0 4px 0 #7a8387,
            0 7px 10px
              rgba(0, 0, 0, 0.1);
        }

        .number {
          width: 42px;
          height: 42px;

          display: grid;
          place-items: center;

          border-radius: 9px;

          background: linear-gradient(
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

        .synonymList {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .synonymBadge {
          padding: 6px 9px;

          border: 1px solid #4c9fc4;
          border-radius: 7px;

          background: linear-gradient(
            white,
            #d9f3ff
          );

          color: #07537d;

          font-weight: 900;
          font-size: 14px;
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

          background: linear-gradient(
            #d7f5ff,
            #6cc4e9
          );

          box-shadow:
            0 3px 0 #28647f;

          color: #084d70;
        }

        .deleteButton {
          border: 1px solid #a94a4a;

          background: linear-gradient(
            #fff1f1,
            #efa0a0
          );

          box-shadow:
            0 3px 0 #934444;

          color: #8a2020;
        }

        .cancelButton {
          border: 1px solid #777;

          background: linear-gradient(
            white,
            #d4d4d4
          );

          box-shadow:
            0 3px 0 #777;
        }

        /* RESPONSIVE */

        @media (max-width: 1000px) {
          .singleAdd {
            grid-template-columns:
              1fr 1fr;
          }

          .wordCard {
            grid-template-columns:
              55px 1fr 1fr;
          }

          .synonymList {
            grid-column: 2 / -1;
          }

          .actions {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 650px) {
          .page {
            padding: 20px 12px 60px;
          }

          .header3d {
            flex-direction: column;
            text-align: center;
          }

          .backButton,
          .headerTitle,
          .totalBox {
            width: 100%;
          }

          .singleAdd {
            grid-template-columns: 1fr;
          }

          .dictionaryHeader {
            grid-template-columns: 1fr;
          }

          .importBottom {
            flex-direction: column;
            align-items: stretch;
          }

          .importButton {
            width: 100%;
          }

          .panel {
            padding: 18px 14px;
          }

          .wordCard {
            grid-template-columns: 1fr;
            text-align: center;
          }

          .number {
            margin: auto;
          }

          .synonymList {
            grid-column: 1;
            justify-content: center;
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
