"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type IrregularVerb = {
  id: string;
  v1: string;
  v2: string;
  v3: string;
  uzbek: string;
  createdAt: string;
  updatedAt: string;
};

type ApiResponse = {
  ok?: boolean;
  message?: string;
  verbs?: IrregularVerb[];
  total?: number;
  added?: number;
  duplicates?: number;
  invalid?: number;
};

const API_URL = "/api/dictionary/irregular-verbs";
const BULK_API_URL = "/api/dictionary/irregular-verbs/bulk";

export default function IrregularVerbsAdminPage() {
  const [verbs, setVerbs] = useState<IrregularVerb[]>([]);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const [editingVerb, setEditingVerb] =
    useState<IrregularVerb | null>(null);

  const [bulkText, setBulkText] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [bulkResult, setBulkResult] = useState<{
    added: number;
    duplicates: number;
    invalid: number;
    total: number;
  } | null>(null);

  /* =====================================================
     FE'LLARNI YUKLASH
  ===================================================== */

  const loadVerbs = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(API_URL, {
        method: "GET",
        cache: "no-store",
      });

      const data: ApiResponse = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message || "Fe’llarni yuklashda xatolik yuz berdi."
        );
      }

      setVerbs(Array.isArray(data.verbs) ? data.verbs : []);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Fe’llarni yuklashda xatolik yuz berdi."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVerbs();
  }, [loadVerbs]);

  /* =====================================================
     QIDIRUV
  ===================================================== */

  const filteredVerbs = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return verbs;

    return verbs.filter((verb) => {
      return (
        verb.v1.toLowerCase().includes(q) ||
        verb.v2.toLowerCase().includes(q) ||
        verb.v3.toLowerCase().includes(q) ||
        verb.uzbek.toLowerCase().includes(q)
      );
    });
  }, [verbs, search]);

  function clearMessages() {
    setMessage("");
    setError("");
  }

  /* =====================================================
     BITTALAB QO'SHISH / TAHRIRLASH
  ===================================================== */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) return;

    clearMessages();

    const form = event.currentTarget;
    const formData = new FormData(form);

    const v1 = String(formData.get("v1") ?? "").trim();
    const v2 = String(formData.get("v2") ?? "").trim();
    const v3 = String(formData.get("v3") ?? "").trim();
    const uzbek = String(formData.get("uzbek") ?? "").trim();

    if (!v1 || !v2 || !v3 || !uzbek) {
      setError("V1, V2, V3 va tarjimani to‘liq kiriting.");
      return;
    }

    try {
      setSaving(true);

      const isEditing = editingVerb !== null;

      const response = await fetch(API_URL, {
        method: isEditing ? "PUT" : "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          ...(isEditing ? { id: editingVerb.id } : {}),
          v1,
          v2,
          v3,
          uzbek,
        }),
      });

      const data: ApiResponse = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message || "Fe’lni saqlashda xatolik yuz berdi."
        );
      }

      if (Array.isArray(data.verbs)) {
        setVerbs(data.verbs);
      } else {
        await loadVerbs();
      }

      form.reset();
      setEditingVerb(null);

      setMessage(
        data.message ||
          (isEditing
            ? "Fe’l muvaffaqiyatli tahrirlandi."
            : "Yangi fe’l muvaffaqiyatli qo‘shildi.")
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Fe’lni saqlashda xatolik yuz berdi."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =====================================================
     TAHRIRLASH
  ===================================================== */

  function startEdit(verb: IrregularVerb) {
    clearMessages();
    setEditingVerb(verb);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelEdit() {
    clearMessages();
    setEditingVerb(null);
  }

  /* =====================================================
     O'CHIRISH
  ===================================================== */

  async function deleteVerb(verb: IrregularVerb) {
    const confirmed = window.confirm(
      `"${verb.v1} — ${verb.v2} — ${verb.v3}" fe’lini o‘chirmoqchimisiz?`
    );

    if (!confirmed) return;

    clearMessages();

    try {
      setSaving(true);

      const response = await fetch(API_URL, {
        method: "DELETE",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          id: verb.id,
        }),
      });

      const data: ApiResponse = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message || "Fe’lni o‘chirishda xatolik yuz berdi."
        );
      }

      if (Array.isArray(data.verbs)) {
        setVerbs(data.verbs);
      } else {
        await loadVerbs();
      }

      if (editingVerb?.id === verb.id) {
        setEditingVerb(null);
      }

      setMessage(data.message || "Fe’l muvaffaqiyatli o‘chirildi.");
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Fe’lni o‘chirishda xatolik yuz berdi."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =====================================================
     OMMAVIY IMPORT
  ===================================================== */

  async function importBulk() {
    const text = bulkText.trim();

    clearMessages();
    setBulkResult(null);

    if (!text) {
      setError("Import qilish uchun fe’llar ro‘yxatini kiriting.");
      return;
    }

    try {
      setBulkLoading(true);

      const response = await fetch(BULK_API_URL, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          text,
        }),
      });

      const data: ApiResponse = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message || "Ommaviy importda xatolik yuz berdi."
        );
      }

      if (Array.isArray(data.verbs)) {
        setVerbs(data.verbs);
      } else {
        await loadVerbs();
      }

      setBulkResult({
        added: data.added ?? 0,
        duplicates: data.duplicates ?? 0,
        invalid: data.invalid ?? 0,
        total: data.total ?? 0,
      });

      setBulkText("");

      setMessage(
        data.message || "Ommaviy import muvaffaqiyatli tugadi."
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Ommaviy importda xatolik yuz berdi."
      );
    } finally {
      setBulkLoading(false);
    }
  }

  return (
    <main className="page">
      <div className="container">
        {/* HEADER */}

        <section className="headerPanel">
          <button
            type="button"
            className="backButton"
            onClick={() => {
              window.location.href = "/admin/dictionary";
            }}
          >
            ← Lug‘at boshqaruvi
          </button>

          <div className="headerCenter">
            <div className="smallTitle">ADMIN PANEL</div>
            <h1>Irregular Verbs</h1>
          </div>

          <div className="totalBox">
            <strong>{verbs.length}</strong>
            <span>Jami fe’l</span>
          </div>
        </section>

        {/* XABARLAR */}

        {message && (
          <div className="message success">✓ {message}</div>
        )}

        {error && (
          <div className="message error">✕ {error}</div>
        )}

        {/* YANGI FE'L */}

        <section className="panel">
          <div className="panelHeader">
            <h2>
              {editingVerb
                ? "Fe’lni tahrirlash"
                : "Yangi fe’l qo‘shish"}
            </h2>

            {editingVerb && (
              <span className="badge">TAHRIRLASH</span>
            )}
          </div>

          <form
            key={editingVerb ? editingVerb.id : "new"}
            onSubmit={handleSubmit}
          >
            <div className="formGrid">
              <label>
                <span>V1</span>
                <input
                  name="v1"
                  defaultValue={editingVerb?.v1 ?? ""}
                  placeholder="go"
                  autoComplete="off"
                  disabled={saving}
                />
              </label>

              <label>
                <span>V2</span>
                <input
                  name="v2"
                  defaultValue={editingVerb?.v2 ?? ""}
                  placeholder="went"
                  autoComplete="off"
                  disabled={saving}
                />
              </label>

              <label>
                <span>V3</span>
                <input
                  name="v3"
                  defaultValue={editingVerb?.v3 ?? ""}
                  placeholder="gone"
                  autoComplete="off"
                  disabled={saving}
                />
              </label>

              <label>
                <span>Tarjimasi</span>
                <input
                  name="uzbek"
                  defaultValue={editingVerb?.uzbek ?? ""}
                  placeholder="bormoq"
                  autoComplete="off"
                  disabled={saving}
                />
              </label>
            </div>

            <div className="buttonRow">
              <button
                type="submit"
                className="blueButton"
                disabled={saving}
              >
                {saving
                  ? "Saqlanmoqda..."
                  : editingVerb
                  ? "✓ Saqlash"
                  : "+ Qo‘shish"}
              </button>

              {editingVerb && (
                <button
                  type="button"
                  className="grayButton"
                  onClick={cancelEdit}
                  disabled={saving}
                >
                  Bekor qilish
                </button>
              )}
            </div>
          </form>
        </section>

        {/* OMMAVIY IMPORT */}

        <section className="panel importPanel">
          <div className="panelHeader">
            <h2>Ommaviy import</h2>
            <span className="badge">BULK</span>
          </div>

          <div className="example">
            <strong>Format:</strong>
            <br />
            go | went | gone | bormoq
            <br />
            see | saw | seen | ko‘rmoq
            <br />
            write | wrote | written | yozmoq
          </div>

          <textarea
            className="bulkTextarea"
            value={bulkText}
            onChange={(event) => setBulkText(event.target.value)}
            placeholder={
              "be | was/were | been | bo‘lmoq\nbegin | began | begun | boshlamoq\nbreak | broke | broken | sindirmoq"
            }
            disabled={bulkLoading}
          />

          <button
            type="button"
            className="blueButton"
            onClick={() => void importBulk()}
            disabled={bulkLoading}
          >
            {bulkLoading
              ? "Import qilinmoqda..."
              : "⬆ Import qilish"}
          </button>

          {bulkResult && (
            <div className="resultGrid">
              <div>
                <strong>{bulkResult.added}</strong>
                <span>Qo‘shildi</span>
              </div>

              <div>
                <strong>{bulkResult.duplicates}</strong>
                <span>Takroriy</span>
              </div>

              <div>
                <strong>{bulkResult.invalid}</strong>
                <span>Noto‘g‘ri</span>
              </div>

              <div>
                <strong>{bulkResult.total}</strong>
                <span>Jami</span>
              </div>
            </div>
          )}
        </section>

        {/* RO'YXAT */}

        <section className="panel">
          <div className="listTitleRow">
            <h2>Irregular Verbs ro‘yxati</h2>

            <div className="counter">
              {filteredVerbs.length} / {verbs.length}
            </div>
          </div>

          <div className="searchRow">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="V1, V2, V3 yoki tarjima bo‘yicha qidirish..."
            />

            <button
              type="button"
              className="refreshButton"
              onClick={() => void loadVerbs()}
              disabled={loading}
            >
              ↻ Yangilash
            </button>
          </div>

          {loading ? (
            <div className="empty">Yuklanmoqda...</div>
          ) : filteredVerbs.length === 0 ? (
            <div className="empty">
              {verbs.length === 0
                ? "Hozircha fe’llar yo‘q."
                : "Qidiruv bo‘yicha fe’l topilmadi."}
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
                  {filteredVerbs.map((verb, index) => (
                    <tr key={verb.id}>
                      <td>{index + 1}</td>
                      <td className="verb">{verb.v1}</td>
                      <td className="verb">{verb.v2}</td>
                      <td className="verb">{verb.v3}</td>
                      <td className="translation">{verb.uzbek}</td>

                      <td>
                        <div className="actions">
                          <button
                            type="button"
                            className="editButton"
                            onClick={() => startEdit(verb)}
                          >
                            Tahrirlash
                          </button>

                          <button
                            type="button"
                            className="deleteButton"
                            onClick={() => void deleteVerb(verb)}
                          >
                            O‘chirish
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
          background: linear-gradient(135deg, #f7fbfd, #e7eef2);
          font-family: "Bell MT", "Times New Roman", serif;
          color: #111;
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

        .headerPanel {
          min-height: 105px;
          padding: 16px 25px;
          display: grid;
          grid-template-columns: 220px 1fr 150px;
          align-items: center;
          gap: 20px;

          border: 3px solid #174461;
          border-radius: 22px;

          background: linear-gradient(
            180deg,
            #91e1fb 0%,
            #5bc1e8 45%,
            #2e98c5 100%
          );

          box-shadow:
            inset 0 6px 5px rgba(255, 255, 255, 0.75),
            inset 0 -5px 5px rgba(0, 0, 0, 0.13),
            0 8px 0 #174d6d,
            0 14px 19px rgba(0, 0, 0, 0.2);
        }

        .headerCenter {
          text-align: center;
        }

        .smallTitle {
          color: #145277;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .headerCenter h1 {
          margin: 4px 0 0;
          color: #073b68;
          font-size: 34px;
        }

        .backButton,
        .blueButton {
          min-height: 46px;
          padding: 8px 18px;

          border: 2px solid #174461;
          border-radius: 9px;

          background: linear-gradient(
            180deg,
            #b9edff,
            #70c6eb 55%,
            #429dcb
          );

          box-shadow:
            inset 0 4px 4px rgba(255, 255, 255, 0.8),
            0 4px 0 #17415c;

          color: #073b68;
          font-weight: 800;
          cursor: pointer;
        }

        .totalBox {
          min-height: 66px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;

          border: 2px solid #174461;
          border-radius: 11px;

          background: linear-gradient(#e4f8ff, #a7dcf2);

          box-shadow:
            inset 0 4px 4px rgba(255, 255, 255, 0.85),
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

        .message {
          margin-top: 25px;
          padding: 14px 18px;
          border-radius: 10px;
          font-weight: 800;
        }

        .success {
          border: 1px solid #65a57b;
          background: #e3f7e9;
          color: #27613a;
        }

        .error {
          border: 1px solid #c77676;
          background: #ffe7e7;
          color: #842d2d;
        }

        .panel {
          margin-top: 30px;
          padding: 25px;

          border: 2px solid #4d5559;
          border-radius: 18px;

          background: linear-gradient(#f8f8f8, #e5e5e5);

          box-shadow:
            inset 0 5px 5px rgba(255, 255, 255, 0.95),
            inset 0 -5px 5px rgba(0, 0, 0, 0.08),
            0 6px 0 #596166,
            0 11px 16px rgba(0, 0, 0, 0.16);
        }

        .panelHeader,
        .listTitleRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          margin-bottom: 20px;
        }

        h2 {
          margin: 0;
          color: #073b68;
          font-size: 24px;
        }

        .badge {
          padding: 6px 12px;
          border: 1px solid #237aa0;
          border-radius: 7px;
          background: #d9f2fc;
          color: #175978;
          font-size: 11px;
          font-weight: 900;
        }

        .formGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
        }

        label {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        label span {
          font-size: 13px;
          font-weight: 900;
        }

        input,
        textarea {
          outline: none;
          border: 2px solid #a2adb2;
          background: #fff;
          color: #111;
        }

        input:focus,
        textarea:focus {
          border-color: #359bc7;
        }

        label input,
        .searchRow input {
          width: 100%;
          min-height: 48px;
          padding: 10px 13px;
          border-radius: 8px;
          font-size: 16px;
        }

        .buttonRow {
          display: flex;
          gap: 12px;
          margin-top: 20px;
        }

        .grayButton {
          min-height: 46px;
          padding: 8px 18px;
          border: 2px solid #747d81;
          border-radius: 9px;
          background: linear-gradient(#f7f7f7, #d1d1d1);
          box-shadow: 0 4px 0 #777f83;
          cursor: pointer;
          font-weight: 700;
        }

        .example {
          margin-bottom: 15px;
          padding: 14px 16px;
          border-radius: 9px;
          background: #dce5e9;
          color: #294653;
          line-height: 1.7;
        }

        .bulkTextarea {
          width: 100%;
          min-height: 210px;
          padding: 15px;
          margin-bottom: 17px;
          resize: vertical;
          border-radius: 10px;
          font-size: 15px;
          line-height: 1.6;
        }

        .resultGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-top: 22px;
        }

        .resultGrid > div {
          min-height: 72px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          border: 1px solid #87969d;
          border-radius: 9px;

          background: linear-gradient(#edf5f8, #d3dfe4);
          box-shadow: 0 3px 0 #899399;
        }

        .resultGrid strong {
          color: #073b68;
          font-size: 24px;
        }

        .resultGrid span {
          font-size: 11px;
          font-weight: 800;
          color: #50636c;
        }

        .counter {
          padding: 8px 14px;
          border: 1px solid #8a969c;
          border-radius: 8px;
          background: #dbe3e7;
          font-weight: 900;
          color: #344b57;
        }

        .searchRow {
          display: grid;
          grid-template-columns: 1fr 135px;
          gap: 10px;
          margin-bottom: 20px;
        }

        .refreshButton {
          border: 2px solid #67757c;
          border-radius: 9px;
          background: linear-gradient(#f6f6f6, #d3d8da);
          box-shadow: 0 3px 0 #747e83;
          font-weight: 800;
          cursor: pointer;
        }

        .tableWrapper {
          overflow-x: auto;
          border: 1px solid #a7afb3;
          border-radius: 10px;
          background: #fff;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th,
        td {
          padding: 13px 12px;
          border-bottom: 1px solid #d5dadd;
          text-align: left;
          white-space: nowrap;
        }

        th {
          background: linear-gradient(#dbeef6, #bfdce8);
          color: #163f55;
          font-size: 13px;
        }

        .verb {
          color: #073b68;
          font-weight: 900;
          font-size: 16px;
        }

        .translation {
          font-weight: 800;
        }

        .actions {
          display: flex;
          gap: 8px;
        }

        .editButton,
        .deleteButton {
          min-height: 34px;
          padding: 5px 11px;
          border-radius: 7px;
          font-weight: 700;
          cursor: pointer;
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

        .empty {
          padding: 45px 15px;
          border: 2px dashed #a6b0b5;
          border-radius: 10px;
          text-align: center;
          color: #66767e;
          font-weight: 700;
        }

        button:disabled,
        input:disabled,
        textarea:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 900px) {
          .formGrid {
            grid-template-columns: repeat(2, 1fr);
          }

          .headerPanel {
            grid-template-columns: 170px 1fr 110px;
          }
        }

        @media (max-width: 620px) {
          .page {
            padding: 10px 8px 40px;
          }

          .headerPanel {
            grid-template-columns: 1fr 80px;
            padding: 12px;
          }

          .backButton {
            grid-column: 1 / -1;
          }

          .headerCenter {
            text-align: left;
          }

          .headerCenter h1 {
            font-size: 23px;
          }

          .panel {
            padding: 17px 12px;
            margin-top: 22px;
          }

          h2 {
            font-size: 20px;
          }

          .formGrid {
            grid-template-columns: repeat(2, 1fr);
          }

          .resultGrid {
            grid-template-columns: repeat(2, 1fr);
          }

          .searchRow {
            grid-template-columns: 1fr;
          }

          .refreshButton,
          .blueButton,
          .grayButton {
            width: 100%;
          }

          .listTitleRow {
            align-items: flex-start;
          }
        }

        @media (max-width: 390px) {
          .formGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
