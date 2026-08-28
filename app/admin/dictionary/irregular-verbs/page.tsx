"use client";

import { useMemo, useState } from "react";

type IrregularVerb = {
  id: string;
  v1: string;
  v2: string;
  v3: string;
  uzbek: string;
};

export default function IrregularVerbsAdminPage() {
  const [verbs, setVerbs] = useState<IrregularVerb[]>([]);

  const [v1, setV1] = useState("");
  const [v2, setV2] = useState("");
  const [v3, setV3] = useState("");
  const [uzbek, setUzbek] = useState("");

  const [search, setSearch] = useState("");
  const [bulkText, setBulkText] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);

  const [message, setMessage] = useState("");

  /* =========================================================
     QIDIRUV
  ========================================================= */

  const filteredVerbs = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) {
      return verbs;
    }

    return verbs.filter((verb) => {
      return (
        verb.v1.toLowerCase().includes(q) ||
        verb.v2.toLowerCase().includes(q) ||
        verb.v3.toLowerCase().includes(q) ||
        verb.uzbek.toLowerCase().includes(q)
      );
    });
  }, [verbs, search]);

  /* =========================================================
     FORMNI TOZALASH
  ========================================================= */

  function clearForm() {
    setV1("");
    setV2("");
    setV3("");
    setUzbek("");
    setEditingId(null);
  }

  /* =========================================================
     YANGI FE’L QO‘SHISH / TAHRIRLASH
  ========================================================= */

  function saveVerb() {
    const cleanV1 = v1.trim();
    const cleanV2 = v2.trim();
    const cleanV3 = v3.trim();
    const cleanUzbek = uzbek.trim();

    if (
      !cleanV1 ||
      !cleanV2 ||
      !cleanV3 ||
      !cleanUzbek
    ) {
      setMessage(
        "V1, V2, V3 va tarjima maydonlarini to‘liq kiriting."
      );
      return;
    }

    if (editingId) {
      setVerbs((current) =>
        current.map((verb) =>
          verb.id === editingId
            ? {
                ...verb,
                v1: cleanV1,
                v2: cleanV2,
                v3: cleanV3,
                uzbek: cleanUzbek,
              }
            : verb
        )
      );

      setMessage("Fe’l muvaffaqiyatli tahrirlandi.");
      clearForm();
      return;
    }

    const duplicate = verbs.some(
      (verb) =>
        verb.v1.toLowerCase() === cleanV1.toLowerCase()
    );

    if (duplicate) {
      setMessage(
        `"${cleanV1}" fe’li ro‘yxatda mavjud.`
      );
      return;
    }

    const newVerb: IrregularVerb = {
      id: crypto.randomUUID(),
      v1: cleanV1,
      v2: cleanV2,
      v3: cleanV3,
      uzbek: cleanUzbek,
    };

    setVerbs((current) =>
      [...current, newVerb].sort((a, b) =>
        a.v1.localeCompare(b.v1)
      )
    );

    setMessage("Yangi fe’l qo‘shildi.");

    clearForm();
  }

  /* =========================================================
     TAHRIRLASH
  ========================================================= */

  function startEdit(verb: IrregularVerb) {
    setEditingId(verb.id);

    setV1(verb.v1);
    setV2(verb.v2);
    setV3(verb.v3);
    setUzbek(verb.uzbek);

    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /* =========================================================
     O‘CHIRISH
  ========================================================= */

  function deleteVerb(id: string) {
    const verb = verbs.find(
      (item) => item.id === id
    );

    if (!verb) return;

    const confirmed = window.confirm(
      `"${verb.v1} — ${verb.v2} — ${verb.v3}" fe’lini o‘chirmoqchimisiz?`
    );

    if (!confirmed) return;

    setVerbs((current) =>
      current.filter(
        (item) => item.id !== id
      )
    );

    if (editingId === id) {
      clearForm();
    }

    setMessage("Fe’l o‘chirildi.");
  }

  /* =========================================================
     OMMAVIY IMPORT
     
     FORMAT:
     go | went | gone | bormoq
     see | saw | seen | ko‘rmoq
  ========================================================= */

  function importBulk() {
    const lines = bulkText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setMessage(
        "Import qilish uchun fe’llarni kiriting."
      );
      return;
    }

    const existingV1 = new Set(
      verbs.map((verb) =>
        verb.v1.toLowerCase()
      )
    );

    const imported: IrregularVerb[] = [];

    let invalidCount = 0;
    let duplicateCount = 0;

    for (const line of lines) {
      const parts = line
        .split("|")
        .map((part) => part.trim());

      if (parts.length < 4) {
        invalidCount += 1;
        continue;
      }

      const [
        importedV1,
        importedV2,
        importedV3,
        ...translationParts
      ] = parts;

      const importedUzbek =
        translationParts
          .join("|")
          .trim();

      if (
        !importedV1 ||
        !importedV2 ||
        !importedV3 ||
        !importedUzbek
      ) {
        invalidCount += 1;
        continue;
      }

      const key =
        importedV1.toLowerCase();

      if (
        existingV1.has(key) ||
        imported.some(
          (verb) =>
            verb.v1.toLowerCase() === key
        )
      ) {
        duplicateCount += 1;
        continue;
      }

      imported.push({
        id: crypto.randomUUID(),
        v1: importedV1,
        v2: importedV2,
        v3: importedV3,
        uzbek: importedUzbek,
      });
    }

    if (imported.length > 0) {
      setVerbs((current) =>
        [...current, ...imported].sort(
          (a, b) =>
            a.v1.localeCompare(b.v1)
        )
      );
    }

    setBulkText("");

    setMessage(
      `Import tugadi. Qo‘shildi: ${imported.length} ta. Takroriy: ${duplicateCount} ta. Noto‘g‘ri satr: ${invalidCount} ta.`
    );
  }

  /* =========================================================
     SAHIFA
  ========================================================= */

  return (
    <main className="page">
      <div className="container">
        {/* ================================
            HEADER
        ================================ */}

        <section className="headerPanel">
          <button
            type="button"
            className="backButton"
            onClick={() => {
              window.location.href =
                "/admin/dictionary";
            }}
          >
            ← Lug‘at boshqaruvi
          </button>

          <div className="headerCenter">
            <div className="smallTitle">
              ADMIN PANEL
            </div>

            <h1>Irregular Verbs</h1>
          </div>

          <div className="totalBox">
            <strong>
              {verbs.length}
            </strong>

            <span>
              Jami fe’l
            </span>
          </div>
        </section>

        {/* ================================
            XABAR
        ================================ */}

        {message && (
          <div className="message">
            {message}
          </div>
        )}

        {/* ================================
            YANGI FE’L
        ================================ */}

        <section className="panel">
          <div className="panelTitle">
            {editingId
              ? "Fe’lni tahrirlash"
              : "Yangi fe’l qo‘shish"}
          </div>

          <div className="formGrid">
            <label>
              <span>V1</span>

              <input
                value={v1}
                onChange={(e) =>
                  setV1(e.target.value)
                }
                placeholder="go"
              />
            </label>

            <label>
              <span>V2</span>

              <input
                value={v2}
                onChange={(e) =>
                  setV2(e.target.value)
                }
                placeholder="went"
              />
            </label>

            <label>
              <span>V3</span>

              <input
                value={v3}
                onChange={(e) =>
                  setV3(e.target.value)
                }
                placeholder="gone"
              />
            </label>

            <label>
              <span>Tarjimasi</span>

              <input
                value={uzbek}
                onChange={(e) =>
                  setUzbek(e.target.value)
                }
                placeholder="bormoq"
              />
            </label>
          </div>

          <div className="formActions">
            <button
              type="button"
              className="primaryButton"
              onClick={saveVerb}
            >
              {editingId
                ? "Saqlash"
                : "+ Qo‘shish"}
            </button>

            {editingId && (
              <button
                type="button"
                className="grayButton"
                onClick={clearForm}
              >
                Bekor qilish
              </button>
            )}
          </div>
        </section>

        {/* ================================
            IMPORT
        ================================ */}

        <section className="panel">
          <div className="panelTitle">
            Ommaviy import
          </div>

          <div className="importInfo">
            Har bir fe’lni yangi qatordan
            kiriting:
          </div>

          <div className="formatExample">
            go | went | gone | bormoq
            <br />
            see | saw | seen | ko‘rmoq
            <br />
            write | wrote | written | yozmoq
          </div>

          <textarea
            className="bulkTextarea"
            value={bulkText}
            onChange={(e) =>
              setBulkText(e.target.value)
            }
            placeholder={
              "go | went | gone | bormoq\nsee | saw | seen | ko‘rmoq\nwrite | wrote | written | yozmoq"
            }
          />

          <button
            type="button"
            className="primaryButton"
            onClick={importBulk}
          >
            Import qilish
          </button>
        </section>

        {/* ================================
            RO‘YXAT
        ================================ */}

        <section className="panel">
          <div className="listHeader">
            <div className="panelTitle noMargin">
              Irregular Verbs ro‘yxati
            </div>

            <div className="resultCount">
              {filteredVerbs.length} /{" "}
              {verbs.length}
            </div>
          </div>

          <input
            className="searchInput"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Fe’l yoki tarjima bo‘yicha qidirish..."
          />

          {filteredVerbs.length === 0 ? (
            <div className="emptyState">
              Hozircha fe’llar yo‘q.
            </div>
          ) : (
            <div className="tableWrapper">
              <table>
                <thead>
                  <tr>
                    <th>№</th>
                    <th>V1</th>
                    <th>V2</th>
                    <th>V3</th>
                    <th>Tarjimasi</th>
                    <th>Amallar</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredVerbs.map(
                    (verb, index) => (
                      <tr key={verb.id}>
                        <td>
                          {index + 1}
                        </td>

                        <td className="verb">
                          {verb.v1}
                        </td>

                        <td className="verb">
                          {verb.v2}
                        </td>

                        <td className="verb">
                          {verb.v3}
                        </td>

                        <td>
                          {verb.uzbek}
                        </td>

                        <td>
                          <div className="actionButtons">
                            <button
                              type="button"
                              className="editButton"
                              onClick={() =>
                                startEdit(
                                  verb
                                )
                              }
                            >
                              Tahrirlash
                            </button>

                            <button
                              type="button"
                              className="deleteButton"
                              onClick={() =>
                                deleteVerb(
                                  verb.id
                                )
                              }
                            >
                              O‘chirish
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          padding: 25px 16px 70px;

          background:
            radial-gradient(
              circle at top,
              #ffffff 0%,
              #f2f6f8 50%,
              #e4ebef 100%
            );

          color: #111;

          font-family:
            "Bell MT",
            "Times New Roman",
            Georgia,
            serif;
        }

        .container {
          width: min(1180px, 100%);
          margin: 0 auto;
        }

        button,
        input,
        textarea {
          font-family: inherit;
        }

        /* ==============================
           HEADER
        ============================== */

        .headerPanel {
          min-height: 105px;

          padding: 17px 25px;

          display: grid;

          grid-template-columns:
            220px
            1fr
            150px;

          align-items: center;

          gap: 20px;

          border: 3px solid #174461;

          border-radius: 22px;

          background:
            linear-gradient(
              180deg,
              #91e1fb 0%,
              #5bc1e8 45%,
              #2e98c5 100%
            );

          box-shadow:
            inset 0 6px 5px
              rgba(255,255,255,.75),

            inset 0 -5px 5px
              rgba(0,0,0,.13),

            0 8px 0 #174d6d,

            0 14px 19px
              rgba(0,0,0,.20);
        }

        .headerCenter {
          text-align: center;
        }

        .smallTitle {
          margin-bottom: 4px;

          color: #145277;

          font-size: 12px;

          font-weight: 900;

          letter-spacing: 2px;
        }

        .headerCenter h1 {
          margin: 0;

          color: #073b68;

          font-size: 34px;

          line-height: 1;

          text-shadow:
            0 1px 0
              rgba(255,255,255,.8);
        }

        .backButton {
          min-height: 47px;

          padding: 8px 15px;

          border: 2px solid #174461;

          border-radius: 9px;

          background:
            linear-gradient(
              180deg,
              #c0efff 0%,
              #77c9ec 52%,
              #469fd0 100%
            );

          box-shadow:
            inset 0 4px 4px
              rgba(255,255,255,.8),

            0 4px 0 #17415c;

          color: #073b68;

          font-size: 14px;

          font-weight: 700;

          cursor: pointer;
        }

        .totalBox {
          min-height: 66px;

          padding: 8px;

          display: flex;

          flex-direction: column;

          align-items: center;

          justify-content: center;

          border: 2px solid #174461;

          border-radius: 11px;

          background:
            linear-gradient(
              180deg,
              #e4f8ff 0%,
              #a7dcf2 100%
            );

          box-shadow:
            inset 0 4px 4px
              rgba(255,255,255,.85),

            0 4px 0 #17415c;
        }

        .totalBox strong {
          color: #073b68;

          font-size: 25px;
        }

        .totalBox span {
          color: #35576b;

          font-size: 11px;

          font-weight: 700;
        }

        /* ==============================
           XABAR
        ============================== */

        .message {
          margin-top: 25px;

          padding: 14px 18px;

          border: 1px solid #6ca9c5;

          border-radius: 10px;

          background: #e7f7ff;

          color: #14516d;

          font-weight: 700;

          box-shadow:
            0 4px 8px
              rgba(0,0,0,.08);
        }

        /* ==============================
           PANEL
        ============================== */

        .panel {
          margin-top: 30px;

          padding: 25px;

          border: 2px solid #4d5559;

          border-radius: 18px;

          background:
            linear-gradient(
              180deg,
              #f7f7f7 0%,
              #e5e5e5 100%
            );

          box-shadow:
            inset 0 5px 5px
              rgba(255,255,255,.95),

            inset 0 -5px 5px
              rgba(0,0,0,.08),

            0 6px 0 #596166,

            0 11px 16px
              rgba(0,0,0,.16);
        }

        .panelTitle {
          margin-bottom: 20px;

          color: #073b68;

          font-size: 24px;

          font-weight: 900;
        }

        .noMargin {
          margin-bottom: 0;
        }

        /* ==============================
           FORM
        ============================== */

        .formGrid {
          display: grid;

          grid-template-columns:
            repeat(
              4,
              minmax(0, 1fr)
            );

          gap: 15px;
        }

        label {
          display: flex;

          flex-direction: column;

          gap: 7px;
        }

        label span {
          color: #384a54;

          font-size: 13px;

          font-weight: 900;
        }

        input,
        textarea {
          outline: none;

          border: 2px solid #a2adb2;

          color: #111;

          background: #fff;

          box-shadow:
            inset 0 2px 4px
              rgba(0,0,0,.08);
        }

        input:focus,
        textarea:focus {
          border-color: #359bc7;

          box-shadow:
            0 0 0 3px
              rgba(53,155,199,.15);
        }

        label input {
          width: 100%;

          min-height: 48px;

          padding: 10px 12px;

          border-radius: 8px;

          font-size: 16px;
        }

        .formActions {
          margin-top: 20px;

          display: flex;

          gap: 12px;

          flex-wrap: wrap;
        }

        /* ==============================
           BUTTON
        ============================== */

        .primaryButton,
        .grayButton,
        .editButton,
        .deleteButton {
          border-radius: 8px;

          font-weight: 700;

          cursor: pointer;
        }

        .primaryButton {
          min-width: 155px;

          min-height: 45px;

          padding: 8px 18px;

          border: 2px solid #174461;

          color: #073b68;

          background:
            linear-gradient(
              180deg,
              #ace9ff 0%,
              #6bc2e8 55%,
              #429bca 100%
            );

          box-shadow:
            inset 0 4px 4px
              rgba(255,255,255,.8),

            0 4px 0 #17415c;
        }

        .grayButton {
          min-height: 45px;

          padding: 8px 18px;

          border: 2px solid #6f787d;

          background:
            linear-gradient(
              180deg,
              #f6f6f6 0%,
              #d1d1d1 100%
            );

          box-shadow:
            0 4px 0 #747c80;
        }

        /* ==============================
           IMPORT
        ============================== */

        .importInfo {
          margin-bottom: 10px;

          color: #44555e;

          font-weight: 700;
        }

        .formatExample {
          margin-bottom: 15px;

          padding: 13px 15px;

          border-radius: 8px;

          background: #dce5e9;

          color: #253e4a;

          font-family:
            Consolas,
            monospace;

          font-size: 13px;

          line-height: 1.7;
        }

        .bulkTextarea {
          width: 100%;

          min-height: 180px;

          margin-bottom: 15px;

          padding: 14px;

          resize: vertical;

          border-radius: 10px;

          font-size: 15px;

          line-height: 1.6;
        }

        /* ==============================
           RO‘YXAT
        ============================== */

        .listHeader {
          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 15px;

          margin-bottom: 18px;
        }

        .resultCount {
          padding: 8px 14px;

          border: 1px solid #8a969c;

          border-radius: 8px;

          background: #dbe3e7;

          color: #344b57;

          font-weight: 900;
        }

        .searchInput {
          width: 100%;

          min-height: 48px;

          margin-bottom: 20px;

          padding: 10px 14px;

          border-radius: 9px;

          font-size: 15px;
        }

        .tableWrapper {
          overflow-x: auto;

          border: 1px solid #a7afb3;

          border-radius: 10px;
        }

        table {
          width: 100%;

          border-collapse: collapse;

          background: #fff;
        }

        th,
        td {
          padding: 13px 12px;

          border-bottom:
            1px solid #d5dadd;

          text-align: left;

          white-space: nowrap;
        }

        th {
          background:
            linear-gradient(
              180deg,
              #dbeef6 0%,
              #bfdce8 100%
            );

          color: #163f55;

          font-size: 13px;
        }

        td {
          font-size: 14px;
        }

        tbody tr:hover {
          background: #f3f8fa;
        }

        .verb {
          color: #073b68;

          font-size: 16px;

          font-weight: 900;
        }

        .actionButtons {
          display: flex;

          gap: 8px;
        }

        .editButton,
        .deleteButton {
          min-height: 34px;

          padding: 5px 10px;
        }

        .editButton {
          border: 1px solid #267fa5;

          background: #d5f1fc;

          color: #14516d;
        }

        .deleteButton {
          border: 1px solid #a25b5b;

          background: #ffe2e2;

          color: #7d2424;
        }

        .emptyState {
          padding: 45px 15px;

          border: 2px dashed #a6b0b5;

          border-radius: 10px;

          text-align: center;

          color: #66767e;

          font-weight: 700;
        }

        /* ==============================
           TABLET
        ============================== */

        @media (max-width: 900px) {
          .headerPanel {
            grid-template-columns:
              170px
              1fr
              110px;
          }

          .headerCenter h1 {
            font-size: 27px;
          }

          .formGrid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );
          }
        }

        /* ==============================
           TELEFON
        ============================== */

        @media (max-width: 620px) {
          .page {
            padding:
              10px
              8px
              40px;
          }

          .headerPanel {
            padding: 12px;

            display: grid;

            grid-template-columns:
              1fr
              80px;

            gap: 10px;

            border-radius: 16px;
          }

          .backButton {
            grid-column:
              1 / -1;

            width: 100%;

            min-height: 40px;
          }

          .headerCenter {
            text-align: left;
          }

          .smallTitle {
            font-size: 9px;
          }

          .headerCenter h1 {
            font-size: 23px;
          }

          .totalBox {
            min-height: 55px;
          }

          .totalBox strong {
            font-size: 20px;
          }

          .totalBox span {
            font-size: 9px;
          }

          .panel {
            margin-top: 22px;

            padding: 17px 12px;

            border-radius: 14px;
          }

          .panelTitle {
            font-size: 20px;
          }

          .formGrid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );

            gap: 10px;
          }

          label input {
            min-height: 43px;

            padding: 8px;

            font-size: 14px;
          }

          .primaryButton {
            width: 100%;
          }

          .grayButton {
            width: 100%;
          }

          .bulkTextarea {
            min-height: 160px;
          }

          .listHeader {
            align-items: flex-start;

            flex-direction: column;
          }

          .resultCount {
            font-size: 12px;
          }

          th,
          td {
            padding: 10px 9px;

            font-size: 12px;
          }

          .verb {
            font-size: 14px;
          }

          .editButton,
          .deleteButton {
            font-size: 11px;
          }
        }

        /* ==============================
           JUDA KICHIK TELEFON
        ============================== */

        @media (max-width: 390px) {
          .formGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
