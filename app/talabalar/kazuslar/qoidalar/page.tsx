"use client";

import { useEffect, useMemo, useState } from "react";

type UserRole = "admin" | "user" | null;

type RuleResource = {
  id: string;
  title: string;
  description: string;
  category: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileType: "pdf" | "ppt" | "pptx";
  pathname: string;
  url: string;
  createdAt: string;
  updatedAt: string;
};

const CATEGORIES = [
  "Kazus yechish qoidalari",
  "Huquqiy tahlil",
  "IRAC",
  "Namunaviy javoblar",
  "Boshqa",
];

function formatFileSize(size: number) {
  if (!size) return "0 KB";

  const mb = size / 1024 / 1024;

  if (mb >= 1) {
    return `${mb.toFixed(2)} MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

export default function QoidalarPage() {
  const [role, setRole] = useState<UserRole>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const [resources, setResources] = useState<RuleResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Barchasi");

  const [showUpload, setShowUpload] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [file, setFile] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadRole();
    loadResources();
  }, []);

  async function loadRole() {
    try {
      const response = await fetch("/api/me", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      if (response.status === 401) {
        window.location.replace("/login");
        return;
      }

      const data = await response.json();

      setRole(data?.role === "admin" ? "admin" : "user");
    } catch (error) {
      console.error("ROLE ERROR:", error);
      setRole("user");
    } finally {
      setRoleLoading(false);
    }
  }

  async function loadResources() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/kazuslar/qoidalar", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            data.message ||
            "Materiallarni yuklab bo‘lmadi."
        );
      }

      setResources(
        Array.isArray(data.resources)
          ? data.resources
          : []
      );
    } catch (error) {
      console.error("RESOURCES ERROR:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Materiallarni yuklashda xatolik."
      );
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setCategory(CATEGORIES[0]);
    setFile(null);
    setMessage("");
  }

  function openUploadForm() {
    resetForm();
    setShowUpload(true);
  }

  function openEditForm(item: RuleResource) {
    if (role !== "admin") return;

    setEditingId(item.id);
    setTitle(item.title);
    setDescription(item.description || "");
    setCategory(item.category || CATEGORIES[0]);
    setFile(null);
    setMessage("");
    setShowUpload(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveResource() {
    if (role !== "admin") {
      setMessage("Bu amal faqat administrator uchun.");
      return;
    }

    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setMessage("Sarlavhani kiriting.");
      return;
    }

    if (!editingId && !file) {
      setMessage("PDF yoki PPT/PPTX faylni tanlang.");
      return;
    }

    if (file) {
      const lowerName = file.name.toLowerCase();
      const allowed =
        lowerName.endsWith(".pdf") ||
        lowerName.endsWith(".ppt") ||
        lowerName.endsWith(".pptx");

      if (!allowed) {
        setMessage("Faqat PDF, PPT yoki PPTX fayl yuklash mumkin.");
        return;
      }

      if (file.size > 30 * 1024 * 1024) {
        setMessage("Fayl hajmi 30 MB dan oshmasligi kerak.");
        return;
      }
    }

    try {
      setSaving(true);
      setMessage("");

      if (editingId) {
        const response = await fetch("/api/kazuslar/qoidalar", {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: editingId,
            title: cleanTitle,
            description: description.trim(),
            category,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error ||
              data.message ||
              "Materialni tahrirlab bo‘lmadi."
          );
        }

        setMessage("✅ Material ma’lumotlari yangilandi.");
      } else {
        const formData = new FormData();

        formData.append("file", file!);
        formData.append("title", cleanTitle);
        formData.append("description", description.trim());
        formData.append("category", category);

        const response = await fetch("/api/kazuslar/qoidalar", {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error ||
              data.message ||
              "Faylni yuklab bo‘lmadi."
          );
        }

        setMessage("✅ Material muvaffaqiyatli yuklandi.");
      }

      await loadResources();

      window.setTimeout(() => {
        resetForm();
        setShowUpload(false);
      }, 750);
    } catch (error) {
      console.error("SAVE RESOURCE ERROR:", error);

      setMessage(
        error instanceof Error
          ? `❌ ${error.message}`
          : "❌ Saqlashda xatolik."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteResource(item: RuleResource) {
    if (role !== "admin") return;

    const confirmed = window.confirm(
      `“${item.title}” materialini butunlay o‘chirmoqchimisiz?`
    );

    if (!confirmed) return;

    try {
      setDeletingId(item.id);

      const response = await fetch(
        `/api/kazuslar/qoidalar?id=${encodeURIComponent(item.id)}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            data.message ||
            "Materialni o‘chirib bo‘lmadi."
        );
      }

      setResources((old) =>
        old.filter((resource) => resource.id !== item.id)
      );
    } catch (error) {
      console.error("DELETE RESOURCE ERROR:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Materialni o‘chirishda xatolik."
      );
    } finally {
      setDeletingId(null);
    }
  }

  function openResource(item: RuleResource) {
    if (item.fileType === "pdf") {
      window.location.href =
        `/talabalar/kazuslar/qoidalar/korish/${encodeURIComponent(item.id)}`;
      return;
    }

    if (role === "admin") {
      window.open(
        `/api/kazuslar/qoidalar/fayl?id=${encodeURIComponent(item.id)}&download=1`,
        "_blank",
        "noopener,noreferrer"
      );
      return;
    }

    alert(
      "PPT/PPTX faylini brauzerda yuklab olmasdan ko‘rsatish ishonchli ishlamaydi. " +
      "Foydalanuvchilar uchun shu taqdimotning PDF nusxasini ham yuklash tavsiya etiladi."
    );
  }

  const filteredResources = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("uz");

    return resources.filter((item) => {
      if (
        categoryFilter !== "Barchasi" &&
        item.category !== categoryFilter
      ) {
        return false;
      }

      if (!q) return true;

      const searchable =
        `${item.title} ${item.description} ${item.category} ${item.fileName}`
          .toLocaleLowerCase("uz");

      return searchable.includes(q);
    });
  }, [resources, search, categoryFilter]);

  return (
    <main
      className="page"
      onContextMenu={(event) => {
        if (role !== "admin") {
          event.preventDefault();
        }
      }}
      onDragStart={(event) => {
        if (role !== "admin") {
          event.preventDefault();
        }
      }}
      onKeyDown={(event) => {
        if (role === "admin") return;

        const key = event.key.toLowerCase();

        if (
          (event.ctrlKey || event.metaKey) &&
          ["s", "p", "u"].includes(key)
        ) {
          event.preventDefault();
        }
      }}
    >
      <header className="topPanel">
        <div className="titlePlate">
          Kazusga javob yozish qoidalari
        </div>

        <button
          className="backButton"
          type="button"
          onClick={() => {
            window.location.href = "/talabalar/kazuslar";
          }}
        >
          Orqaga
        </button>
      </header>

      {!roleLoading && role === "admin" && (
        <section className="adminActions">
          <button
            className="mainActionButton"
            type="button"
            onClick={openUploadForm}
          >
            PDF / PPT / PPTX yuklash
          </button>
        </section>
      )}

      {showUpload && role === "admin" && (
        <section className="uploadBox">
          <div className="sectionTitle">
            {editingId
              ? "Materialni tahrirlash"
              : "Yangi material yuklash"}
          </div>

          <div className="formGrid">
            <label>
              Sarlavha
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setMessage("");
                }}
                placeholder="Masalan: Kazus yechishning 10 ta asosiy qoidasi"
              />
            </label>

            <label>
              Kategoriya
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((item) => (
                  <option value={item} key={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="fullWidth">
              Qisqa izoh
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Material haqida qisqa izoh..."
              />
            </label>

            {!editingId && (
              <label className="fullWidth">
                PDF / PPT / PPTX fayl
                <input
                  type="file"
                  accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] ?? null);
                    setMessage("");
                  }}
                />
              </label>
            )}
          </div>

          {file && (
            <div className="selectedFile">
              Tanlangan fayl: <b>{file.name}</b> —{" "}
              {formatFileSize(file.size)}
            </div>
          )}

          {message && (
            <div className="messageBox">{message}</div>
          )}

          <div className="formActions">
            <button
              className="cancelButton"
              type="button"
              onClick={() => {
                resetForm();
                setShowUpload(false);
              }}
              disabled={saving}
            >
              Bekor qilish
            </button>

            <button
              className="saveButton"
              type="button"
              onClick={saveResource}
              disabled={saving}
            >
              {saving
                ? "Saqlanmoqda..."
                : editingId
                  ? "O‘zgarishlarni saqlash"
                  : "Materialni yuklash"}
            </button>
          </div>
        </section>
      )}

      <section className="mainBox">
        <div className="sectionTitle">
          Qo‘llanmalar va taqdimotlar
        </div>

        <div className="filterRow">
          <input
            className="searchInput"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Material qidirish..."
          />

          <select
            className="categoryFilter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="Barchasi">Barcha kategoriyalar</option>
            {CATEGORIES.map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>

          <button
            className="refreshButton"
            type="button"
            onClick={loadResources}
            disabled={loading}
          >
            {loading ? "Yuklanmoqda..." : "Yangilash"}
          </button>
        </div>

        {error && (
          <div className="errorBox">{error}</div>
        )}

        {loading ? (
          <div className="emptyState">
            Materiallar yuklanmoqda...
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="emptyState">
            {resources.length === 0
              ? "Hozircha material yuklanmagan."
              : "Qidiruv bo‘yicha material topilmadi."}
          </div>
        ) : (
          <div className="resourcesGrid">
            {filteredResources.map((item) => (
              <article className="resourceCard" key={item.id}>
                <div className={`fileTypeBadge ${item.fileType}`}>
                  {item.fileType.toUpperCase()}
                </div>

                <div className="categoryBadge">
                  {item.category}
                </div>

                <h2>{item.title}</h2>

                {item.description && (
                  <p className="description">
                    {item.description}
                  </p>
                )}

              {item.fileName} · {formatFileSize(item.fileSize)}

                {!roleLoading && role === "admin" && (
                  <div className="adminCardActions">
                    <button
                      className="editButton"
                      type="button"
                      onClick={() => openEditForm(item)}
                    >
                      Tahrirlash
                    </button>

                    <button
                      className="deleteButton"
                      type="button"
                      disabled={deletingId === item.id}
                      onClick={() => deleteResource(item)}
                    >
                      {deletingId === item.id
                        ? "O‘chirilmoqda..."
                        : "O‘chirish"}
                    </button>
                  </div>
                )}

                <button
                  className="openButton"
                  type="button"
                  onClick={() => openResource(item)}
                >
                  {item.fileType === "pdf"
                    ? "Ko‘rish"
                    : role === "admin"
                      ? "PPT/PPTX ni yuklab olish"
                      : "PDF nusxasi kerak"}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          padding-bottom: 50px;
          font-family: "Bell MT", "Times New Roman", serif;
          background: #e9ecef;
          color: #111;
        }

        .topPanel {
          width: min(1500px, 97%);
          margin: 25px auto 0;
          padding: 22px 25px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          border: 3px solid #303538;
          border-radius: 25px;
          background: linear-gradient(145deg,#6a6e71,#44484b);
          box-shadow:
            inset 0 7px 6px rgba(255,255,255,.23),
            inset 0 -8px 8px rgba(0,0,0,.28),
            0 8px 16px rgba(0,0,0,.18);
        }

        .titlePlate {
          flex: 1 1 auto;
          max-width: 720px;
          padding: 16px 24px;
          text-align: center;
          font-size: 27px;
          font-weight: 700;
          border: 3px solid #42494e;
          border-radius: 16px;
          background: linear-gradient(#f7f7f7,#b4b4b4);
          box-shadow:
            inset 0 5px 4px rgba(255,255,255,.95),
            0 5px 0 #4b5256;
        }

        .backButton,
        .mainActionButton,
        .saveButton,
        .cancelButton,
        .refreshButton,
        .openButton,
        .editButton,
        .deleteButton {
          font-family: inherit;
          font-weight: 700;
          cursor: pointer;
        }

        .backButton {
          min-width: 145px;
          min-height: 54px;
          border: 3px solid #464c50;
          border-radius: 13px;
          background: linear-gradient(#f8f8f8,#a4a4a4);
          box-shadow:
            inset 0 4px 4px rgba(255,255,255,.9),
            0 5px 0 #4b5256;
        }

        .adminActions {
          width: min(760px, 94%);
          margin: 45px auto 0;
        }

        .mainActionButton {
          width: 100%;
          min-height: 70px;
          border: 3px solid #174461;
          border-radius: 16px;
          color: #073b68;
          font-size: 20px;
          background: linear-gradient(#c6edff,#58a8d5);
          box-shadow:
            inset 0 5px 5px rgba(255,255,255,.85),
            0 6px 0 #17415c,
            0 11px 15px rgba(0,0,0,.18);
        }

        .uploadBox,
        .mainBox {
          position: relative;
          width: min(1400px, 95%);
          margin: 72px auto 35px;
          padding: 70px 30px 35px;
          border: 3px solid #303538;
          border-radius: 26px;
          background: linear-gradient(145deg,#676b6e,#3f4346);
          box-shadow:
            inset 0 7px 6px rgba(255,255,255,.22),
            0 8px 18px rgba(0,0,0,.2);
        }

        .sectionTitle {
          position: absolute;
          top: -29px;
          left: 50%;
          transform: translateX(-50%);
          min-width: 300px;
          padding: 12px 24px;
          text-align: center;
          color: #073b68;
          font-size: 22px;
          font-weight: 700;
          border: 2px solid #174461;
          border-radius: 12px;
          background: linear-gradient(#c8edff,#54a5d2);
          box-shadow:
            inset 0 4px 4px rgba(255,255,255,.9),
            0 5px 0 #17415c;
        }

        .formGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }

        .formGrid label {
          display: flex;
          flex-direction: column;
          gap: 7px;
          color: #fff;
          font-size: 16px;
          font-weight: 700;
        }

        .fullWidth {
          grid-column: 1 / -1;
        }

        .formGrid input,
        .formGrid select,
        .formGrid textarea,
        .searchInput,
        .categoryFilter {
          width: 100%;
          padding: 12px 13px;
          border: 2px solid #6b7479;
          border-radius: 10px;
          font-family: inherit;
          font-size: 16px;
          background: #fff;
        }

        .formGrid textarea {
          min-height: 105px;
          resize: vertical;
        }

        .selectedFile,
        .messageBox {
          margin-top: 15px;
          padding: 12px 14px;
          border-radius: 9px;
          background: #fff;
        }

        .formActions {
          margin-top: 18px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .saveButton,
        .cancelButton {
          min-height: 50px;
          border-radius: 10px;
        }

        .saveButton {
          border: 2px solid #174461;
          color: #073b68;
          background: #9edcff;
        }

        .cancelButton {
          border: 2px solid #686868;
          background: #e6e6e6;
        }

        .filterRow {
          display: grid;
          grid-template-columns: 2fr 1.3fr auto;
          gap: 12px;
          margin-bottom: 24px;
        }

        .refreshButton {
          min-width: 130px;
          border: 2px solid #555d62;
          border-radius: 10px;
          background: #e6e6e6;
        }

        .resourcesGrid {
          display: grid;
          grid-template-columns: repeat(3,minmax(0,1fr));
          gap: 20px;
        }

        .resourceCard {
          min-height: 330px;
          padding: 22px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          text-align: center;
          border-radius: 18px;
          background: linear-gradient(#fafafa,#dedede);
          box-shadow:
            inset 0 4px 4px rgba(255,255,255,.95),
            0 5px 0 #6a7175,
            0 9px 16px rgba(0,0,0,.16);
        }

        .fileTypeBadge {
          min-width: 72px;
          padding: 7px 12px;
          border-radius: 8px;
          font-weight: 700;
          color: #fff;
          background: #5a6268;
        }

        .fileTypeBadge.pdf {
          background: #bb3535;
        }

        .fileTypeBadge.ppt,
        .fileTypeBadge.pptx {
          background: #d66b24;
        }

        .categoryBadge {
          max-width: 100%;
          padding: 6px 11px;
          border: 2px solid #174461;
          border-radius: 999px;
          color: #073b68;
          font-size: 12px;
          font-weight: 700;
          background: #bde8ff;
        }

        .resourceCard h2 {
          margin: 0;
          font-size: 22px;
          line-height: 1.25;
        }

        .description {
          margin: 0;
          color: #4c555b;
          line-height: 1.45;
        }

        .fileMeta {
          margin-top: auto;
          font-size: 12px;
          color: #687177;
        }

        .adminCardActions {
          width: 100%;
          display: flex;
          justify-content: center;
          gap: 8px;
        }

        .editButton,
        .deleteButton {
          min-width: 95px;
          min-height: 32px;
          border-radius: 7px;
          font-size: 11px;
        }

        .editButton {
          color: #073b68;
          border: 1.5px solid #174461;
          background: #bfe8ff;
        }

        .deleteButton {
          color: #000;
          border: 1.5px solid #982828;
          background: #ef8989;
        }

        .openButton {
          width: 100%;
          min-height: 45px;
          border: 2px solid #174461;
          border-radius: 10px;
          color: #073b68;
          background: linear-gradient(#c8efff,#63b4df);
          box-shadow: 0 4px 0 #17415c;
        }

        .emptyState,
        .errorBox {
          padding: 25px;
          text-align: center;
          border-radius: 12px;
          background: #fff;
          font-weight: 700;
        }

        .errorBox {
          color: #8a1e1e;
          margin-bottom: 15px;
        }

        @media (max-width: 900px) {
          .resourcesGrid {
            grid-template-columns: repeat(2,minmax(0,1fr));
          }
        }

        @media (max-width: 600px) {
          .topPanel {
            width: calc(100% - 12px);
            margin-top: 6px;
            padding: 9px;
            flex-direction: column;
            border-radius: 14px;
          }

          .titlePlate {
            width: 100%;
            padding: 10px 8px;
            font-size: 19px;
          }

          .backButton {
            width: 100%;
            min-height: 44px;
          }

          .adminActions {
            width: calc(100% - 16px);
            margin-top: 20px;
          }

          .mainActionButton {
            min-height: 52px;
            font-size: 15px;
          }

          .uploadBox,
          .mainBox {
            width: calc(100% - 8px);
            margin-top: 50px;
            padding: 48px 8px 18px;
            border-radius: 14px;
          }

          .sectionTitle {
            min-width: 0;
            width: min(250px, 80%);
            padding: 8px 10px;
            font-size: 16px;
          }

          .formGrid,
          .formActions,
          .filterRow {
            grid-template-columns: 1fr;
          }

          .resourcesGrid {
            grid-template-columns: repeat(2,minmax(0,1fr));
            gap: 9px;
          }

          .resourceCard {
            min-height: 245px;
            padding: 12px 9px;
            gap: 9px;
            border-radius: 12px;
          }

          .resourceCard h2 {
            font-size: 15px;
          }

          .description {
            font-size: 11px;
          }

          .categoryBadge,
          .fileMeta {
            font-size: 9px;
          }

          .fileTypeBadge {
            min-width: 55px;
            padding: 5px 8px;
            font-size: 10px;
          }

          .editButton,
          .deleteButton {
            min-width: 0;
            flex: 1 1 0;
            font-size: 9px;
          }

          .openButton {
            min-height: 36px;
            font-size: 11px;
          }
        }

        @media (max-width: 380px) {
          .resourcesGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
