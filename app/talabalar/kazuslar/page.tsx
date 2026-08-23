"use client";

import { useEffect, useMemo, useState } from "react";

type UserRole = "admin" | "user" | null;

type CaseQuestion = {
  id: string;
  question: string;
  answer: string;
};

type PlatformCase = {
  id: string;
  type: "platform";
  subject: string;
  title: string;
  caseText: string;
  questions: CaseQuestion[];
  createdAt: string;
  updatedAt: string;
};

type PdfCase = {
  id: string;
  type: "pdf";
  subject: string;
  title: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  pathname: string;
  createdAt: string;
  updatedAt: string;
};

type AnyCase = PlatformCase | PdfCase;

type Mode = "list" | "write" | "upload" | "view";

export default function KazuslarPage() {
  const [mode, setMode] = useState<Mode>("list");

  const [role, setRole] = useState<UserRole>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const [cases, setCases] = useState<AnyCase[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [casesError, setCasesError] = useState("");

  const [selectedCase, setSelectedCase] = useState<PlatformCase | null>(null);

  const [subject, setSubject] = useState("");
  const [caseTitle, setCaseTitle] = useState("");
  const [caseText, setCaseText] = useState("");

  const [questions, setQuestions] = useState<CaseQuestion[]>([
    {
      id: "1",
      question: "",
      answer: "",
    },
  ]);

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const [search, setSearch] = useState("");

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfSubject, setPdfSubject] = useState("");
  const [pdfTitle, setPdfTitle] = useState("");
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfMessage, setPdfMessage] = useState("");

  useEffect(() => {
    loadRole();
    loadCases();
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

      if (!response.ok) {
        throw new Error("Rolni aniqlab bo‘lmadi.");
      }

      const data = await response.json();

      if (data.role === "admin") {
        setRole("admin");
      } else {
        setRole("user");
      }
    } catch (error) {
      console.error("ROLE ERROR:", error);
      setRole("user");
    } finally {
      setRoleLoading(false);
    }
  }

  async function loadCases() {
    try {
      setCasesLoading(true);
      setCasesError("");

      const response = await fetch("/api/kazuslar", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Kazuslarni yuklab bo‘lmadi.");
      }

      setCases(Array.isArray(data.cases) ? data.cases : []);
    } catch (error) {
      console.error("CASES LOAD ERROR:", error);

      setCasesError(
        error instanceof Error
          ? error.message
          : "Kazuslarni yuklashda xatolik."
      );
    } finally {
      setCasesLoading(false);
    }
  }

  function goBack() {
    if (mode !== "list") {
      setMode("list");
      setSelectedCase(null);
      setSaveMessage("");
      return;
    }

    window.location.href = "/";
  }

  function resetForm() {
    setSubject("");
    setCaseTitle("");
    setCaseText("");
    setQuestions([
      {
        id: "1",
        question: "",
        answer: "",
      },
    ]);
    setSaveMessage("");
  }

  function openWriteMode() {
    resetForm();
    setMode("write");
  }

  function openUploadMode() {
    setSaveMessage("");
    setPdfFile(null);
    setPdfSubject("");
    setPdfTitle("");
    setPdfMessage("");
    setMode("upload");
  }

  async function uploadPdf() {
    if (role !== "admin") {
      setPdfMessage("❌ PDF yuklash faqat administrator uchun.");
      return;
    }

    if (!pdfSubject.trim()) {
      setPdfMessage("❌ Fan nomini kiriting.");
      return;
    }

    if (!pdfTitle.trim()) {
      setPdfMessage("❌ Kazus nomini kiriting.");
      return;
    }

    if (!pdfFile) {
      setPdfMessage("❌ Avval PDF faylni tanlang.");
      return;
    }

    if (
      pdfFile.type !== "application/pdf" &&
      !pdfFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setPdfMessage("❌ Faqat PDF fayl yuklash mumkin.");
      return;
    }

    if (pdfFile.size > 10 * 1024 * 1024) {
      setPdfMessage("❌ PDF hajmi 10 MB dan oshmasligi kerak.");
      return;
    }

    try {
      setPdfUploading(true);
      setPdfMessage("");

      const formData = new FormData();
      formData.append("file", pdfFile);
      formData.append("subject", pdfSubject.trim());
      formData.append("title", pdfTitle.trim());

      const response = await fetch("/api/kazuslar/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || data.message || "PDF faylni yuklab bo‘lmadi."
        );
      }

      setPdfMessage("✅ PDF muvaffaqiyatli yuklandi.");
      setPdfFile(null);
      setPdfSubject("");
      setPdfTitle("");

      await loadCases();

      window.setTimeout(() => {
        setPdfMessage("");
        setMode("list");
      }, 1000);
    } catch (error) {
      console.error("PDF UPLOAD ERROR:", error);

      setPdfMessage(
        error instanceof Error
          ? `❌ ${error.message}`
          : "❌ PDF yuklashda xatolik yuz berdi."
      );
    } finally {
      setPdfUploading(false);
    }
  }

  function addQuestion() {
    setQuestions((old) => [
      ...old,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        question: "",
        answer: "",
      },
    ]);
  }

  function removeQuestion(id: string) {
    if (questions.length <= 1) return;

    setQuestions((old) => old.filter((item) => item.id !== id));
  }

  function changeQuestion(
    id: string,
    field: "question" | "answer",
    value: string
  ) {
    setQuestions((old) =>
      old.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  }

  async function saveCase() {
    if (role !== "admin") {
      setSaveMessage("Kazus qo‘shish faqat administrator uchun.");
      return;
    }

    const cleanSubject = subject.trim();
    const cleanTitle = caseTitle.trim();
    const cleanCaseText = caseText.trim();

    if (!cleanSubject) {
      setSaveMessage("Fan nomini kiriting.");
      return;
    }

    if (!cleanTitle) {
      setSaveMessage("Kazus nomini kiriting.");
      return;
    }

    if (!cleanCaseText) {
      setSaveMessage("Kazus matnini kiriting.");
      return;
    }

    const cleanQuestions = questions
      .map((item) => ({
        id: item.id,
        question: item.question.trim(),
        answer: item.answer.trim(),
      }))
      .filter((item) => item.question && item.answer);

    if (cleanQuestions.length === 0) {
      setSaveMessage("Kamida bitta savol va uning javobini to‘liq yozing.");
      return;
    }

    try {
      setSaving(true);
      setSaveMessage("");

      const response = await fetch("/api/kazuslar", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: cleanSubject,
          title: cleanTitle,
          caseText: cleanCaseText,
          questions: cleanQuestions,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Kazusni saqlab bo‘lmadi.");
      }

      setSaveMessage("✅ Kazus muvaffaqiyatli saqlandi.");

      await loadCases();

      window.setTimeout(() => {
        resetForm();
        setMode("list");
      }, 900);
    } catch (error) {
      console.error("SAVE CASE ERROR:", error);

      setSaveMessage(
        error instanceof Error
          ? `❌ ${error.message}`
          : "❌ Kazusni saqlashda xatolik."
      );
    } finally {
      setSaving(false);
    }
  }

  async function openCase(item: AnyCase) {
    if (item.type === "pdf") {
      const viewerUrl =
        `/talabalar/kazuslar/pdf/${encodeURIComponent(item.id)}`;

      window.open(
        viewerUrl,
        "_blank",
        "noopener,noreferrer"
      );

      return;
    }

    try {
      setSelectedCase(item);
      setMode("view");

      const response = await fetch(
        `/api/kazuslar?id=${encodeURIComponent(item.id)}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (
        response.ok &&
        data.success &&
        data.case &&
        data.case.type === "platform"
      ) {
        setSelectedCase(data.case);
      }
    } catch (error) {
      console.error("OPEN CASE ERROR:", error);
    }
  }

  const filteredCases = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("uz");

    if (!q) return cases;

    return cases.filter((item) => {
      const extraText =
        item.type === "platform"
          ? item.caseText
          : item.originalFileName;

      const text = `${item.subject} ${item.title} ${extraText}`
        .toLocaleLowerCase("uz");

      return text.includes(q);
    });
  }, [cases, search]);

  return (
    <main className="page">
      <header className="topPanel">
        <div className="titlePlate">Talabalar — Kazuslar</div>

        <button className="backButton" type="button" onClick={goBack}>
          Orqaga
        </button>
      </header>

      {mode === "list" && (
        <>
          {!roleLoading && role === "admin" && (
            <section className="controlBox">
              <button
                className="mainActionButton"
                type="button"
                onClick={openWriteMode}
              >
                ✍ Kazusga javob yozish
              </button>

              <button
                className="mainActionButton"
                type="button"
                onClick={openUploadMode}
              >
                📄 Kazus yuklash
              </button>
            </section>
          )}

          <section className="mainBox">
            <div className="sectionTitle">Kazuslar</div>

            <div className="searchRow">
              <input
                className="searchInput"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Kazus yoki fan bo‘yicha qidirish..."
              />

              <button
                className="refreshButton"
                type="button"
                onClick={loadCases}
                disabled={casesLoading}
              >
                {casesLoading ? "Yuklanmoqda..." : "Yangilash"}
              </button>
            </div>

            {casesError && <div className="errorBox">{casesError}</div>}

            {casesLoading ? (
              <div className="emptyState">Kazuslar yuklanmoqda...</div>
            ) : filteredCases.length === 0 ? (
              <div className="emptyState">
                {cases.length === 0
                  ? "Hozircha kazus qo‘shilmagan."
                  : "Qidiruv bo‘yicha kazus topilmadi."}
              </div>
            ) : (
              <div className="cases">
                {filteredCases.map((item) => (
                  <article
                    className={`caseCard ${
                      item.type === "pdf" ? "pdfCaseCard" : ""
                    }`}
                    key={item.id}
                  >
                    <div
                      className={
                        item.type === "pdf"
                          ? "caseType pdfCaseType"
                          : "caseType"
                      }
                    >
                      {item.type === "pdf"
                        ? "📄 PDF kazus"
                        : "✍ Platformada yozilgan"}
                    </div>

                    <div className="subjectBadge">{item.subject}</div>

                    <h2>{item.title}</h2>

                    {item.type === "platform" ? (
                      <>
                        <p className="casePreview">
                          {item.caseText.length > 150
                            ? `${item.caseText.slice(0, 150)}...`
                            : item.caseText}
                        </p>

                        <div className="questionCount">
                          {item.questions.length} ta savol
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="pdfCardIcon">PDF</div>

                        <p className="casePreview pdfFileName">
                          {item.originalFileName || "PDF hujjat"}
                        </p>

                        <div className="questionCount pdfInfo">
                          {item.fileSize > 0
                            ? `${(item.fileSize / 1024 / 1024).toFixed(2)} MB`
                            : "PDF fayl"}
                        </div>
                      </>
                    )}

                    <button
                      className="openButton"
                      type="button"
                      onClick={() => openCase(item)}
                    >
                      {item.type === "pdf" ? "PDFni ochish" : "Ochish"}
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {mode === "write" && (
        <section className="editorBox">
          <div className="sectionTitle">Kazusga javob yozish</div>

          <div className="formGroup">
            <label>Fan nomi</label>

            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Masalan: Jinoyat huquqi"
            />
          </div>

          <div className="formGroup">
            <label>Kazus nomi</label>

            <input
              type="text"
              value={caseTitle}
              onChange={(e) => setCaseTitle(e.target.value)}
              placeholder="Masalan: 1-kazus"
            />
          </div>

          <div className="formGroup">
            <label>Kazus matni</label>

            <textarea
              className="caseTextarea"
              value={caseText}
              onChange={(e) => setCaseText(e.target.value)}
              placeholder="Kazusning to‘liq matnini shu yerga yozing..."
            />
          </div>

          <div className="questionsTitle">Savollar va javoblar</div>

          {questions.map((item, index) => (
            <div className="questionCard" key={item.id}>
              <div className="questionHeader">
                <h3>{index + 1}-savol</h3>

                {questions.length > 1 && (
                  <button
                    className="deleteButton"
                    type="button"
                    onClick={() => removeQuestion(item.id)}
                  >
                    O‘chirish
                  </button>
                )}
              </div>

              <label>Savol</label>

              <textarea
                className="questionTextarea"
                value={item.question}
                onChange={(e) =>
                  changeQuestion(item.id, "question", e.target.value)
                }
                placeholder={`${index + 1}-savolni yozing...`}
              />

              <label>Javob</label>

              <textarea
                className="answerTextarea"
                value={item.answer}
                onChange={(e) =>
                  changeQuestion(item.id, "answer", e.target.value)
                }
                placeholder="Ushbu savolning javobini yozing..."
              />
            </div>
          ))}

          <button
            className="addQuestionButton"
            type="button"
            onClick={addQuestion}
          >
            + Yana savol qo‘shish
          </button>

          {saveMessage && (
            <div
              className={
                saveMessage.startsWith("✅")
                  ? "successBox"
                  : "errorBox"
              }
            >
              {saveMessage}
            </div>
          )}

          <div className="bottomButtons">
            <button
              className="cancelButton"
              type="button"
              onClick={() => {
                resetForm();
                setMode("list");
              }}
              disabled={saving}
            >
              Bekor qilish
            </button>

            <button
              className="saveButton"
              type="button"
              onClick={saveCase}
              disabled={saving}
            >
              {saving ? "Saqlanmoqda..." : "Kazusni saqlash"}
            </button>
          </div>
        </section>
      )}

      {mode === "upload" && (
        <section className="editorBox">
          <div className="sectionTitle">Kazus yuklash</div>

          <div className="uploadArea">
            <div className="pdfIcon">PDF</div>

            <h2>PDF kazus yuklash</h2>

            <p>
              Bu bo‘limda Word dasturida tayyorlab, PDF formatiga
              o‘tkazilgan kazuslaringizni yuklaysiz.
            </p>

            <p className="comingSoon">
              Faqat PDF formatidagi, 10 MB gacha bo‘lgan fayl yuklang.
            </p>

            <div className="pdfMetaFields">
              <div className="pdfField">
                <label>Fan nomi</label>
                <input
                  type="text"
                  value={pdfSubject}
                  onChange={(e) => {
                    setPdfSubject(e.target.value);
                    setPdfMessage("");
                  }}
                  placeholder="Masalan: Jinoyat huquqi"
                  disabled={pdfUploading}
                />
              </div>

              <div className="pdfField">
                <label>Kazus nomi</label>
                <input
                  type="text"
                  value={pdfTitle}
                  onChange={(e) => {
                    setPdfTitle(e.target.value);
                    setPdfMessage("");
                  }}
                  placeholder="Masalan: 1-kazus"
                  disabled={pdfUploading}
                />
              </div>
            </div>

            <input
              className="fileInput"
              type="file"
              accept=".pdf,application/pdf"
              disabled={pdfUploading}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setPdfFile(file);
                setPdfMessage("");
              }}
            />

            {pdfFile && (
              <p>
                <strong>Tanlangan fayl:</strong> {pdfFile.name}
              </p>
            )}

            {pdfMessage && (
              <div
                className={
                  pdfMessage.startsWith("✅")
                    ? "successBox"
                    : "errorBox"
                }
              >
                {pdfMessage}
              </div>
            )}
          </div>

          <div className="bottomButtons">
            <button
              className="cancelButton"
              type="button"
              onClick={() => {
                setPdfFile(null);
                setPdfSubject("");
                setPdfTitle("");
                setPdfMessage("");
                setMode("list");
              }}
              disabled={pdfUploading}
            >
              Bekor qilish
            </button>

            <button
              className="saveButton"
              type="button"
              onClick={uploadPdf}
              disabled={
                pdfUploading ||
                !pdfFile ||
                !pdfSubject.trim() ||
                !pdfTitle.trim()
              }
            >
              {pdfUploading ? "PDF yuklanmoqda..." : "PDF yuklash"}
            </button>
          </div>
        </section>
      )}

      {mode === "view" && selectedCase && (
        <section className="viewerBox">
          <div className="sectionTitle">Kazus</div>

          <div className="viewerHeader">
            <div>
              <div className="viewerSubject">{selectedCase.subject}</div>
              <h1>{selectedCase.title}</h1>
            </div>

            <button
              className="smallBackButton"
              type="button"
              onClick={() => {
                setSelectedCase(null);
                setMode("list");
              }}
            >
              ← Ro‘yxatga
            </button>
          </div>

          <div className="caseTextBox">
            <h2>Kazus matni</h2>
            <p>{selectedCase.caseText}</p>
          </div>

          <div className="viewerQuestionsTitle">Savollar va javoblar</div>

          <div className="viewerQuestions">
            {selectedCase.questions.map((item, index) => (
              <div className="viewerQuestionCard" key={item.id}>
                <div className="viewerQuestion">
                  <strong>{index + 1}-savol.</strong> {item.question}
                </div>

                <div className="viewerAnswer">
                  <div className="answerLabel">Javob</div>
                  <p>{item.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          padding: 20px;
          background: linear-gradient(180deg, #ffffff 0%, #f2f4f5 100%);
          font-family: "Bell MT", "Times New Roman", serif;
          color: #111;
        }

        .topPanel {
          width: 100%;
          min-height: 120px;
          padding: 25px 30px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 25px;
          border: 3px solid #173e58;
          border-radius: 27px;
          background: linear-gradient(
            180deg,
            #8bd3ff 0%,
            #69b7e8 45%,
            #4999ce 100%
          );
          box-shadow:
            inset 0 6px 6px rgba(255, 255, 255, 0.75),
            inset 0 -7px 7px rgba(0, 0, 0, 0.18),
            0 7px 0 #173c55,
            0 12px 18px rgba(0, 0, 0, 0.22);
        }

        .titlePlate {
          min-width: 430px;
          padding: 18px 28px;
          text-align: center;
          font-size: 29px;
          font-weight: 700;
          border: 3px solid #42494e;
          border-radius: 16px;
          background: linear-gradient(
            180deg,
            #f7f7f7 0%,
            #dedede 30%,
            #b9b9b9 70%,
            #9f9f9f 100%
          );
          box-shadow:
            inset 0 6px 5px rgba(255, 255, 255, 0.95),
            inset 0 -6px 6px rgba(0, 0, 0, 0.2),
            0 5px 0 #4b5256,
            0 9px 11px rgba(0, 0, 0, 0.23);
        }

        .backButton,
        .smallBackButton {
          border: 3px solid #464c50;
          border-radius: 14px;
          cursor: pointer;
          font-family: inherit;
          font-weight: 700;
          background: linear-gradient(
            180deg,
            #f8f8f8,
            #dedede 30%,
            #b8b8b8 70%,
            #999
          );
          box-shadow:
            inset 0 5px 5px rgba(255, 255, 255, 0.95),
            inset 0 -6px 6px rgba(0, 0, 0, 0.2),
            0 5px 0 #4b5256;
        }

        .backButton {
          width: 150px;
          height: 58px;
          font-size: 17px;
        }

        .smallBackButton {
          min-width: 150px;
          min-height: 50px;
          padding: 10px 18px;
          font-size: 16px;
        }

        .controlBox {
          width: min(900px, 95%);
          margin: 65px auto 0;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 35px;
        }

        .mainActionButton {
          min-height: 80px;
          border: 3px solid #174461;
          border-radius: 17px;
          cursor: pointer;
          font-family: inherit;
          font-size: 23px;
          font-weight: 700;
          color: #073b68;
          background: linear-gradient(
            180deg,
            #a8e1ff,
            #72bfea 48%,
            #4797ca
          );
          box-shadow:
            inset 0 6px 6px rgba(255, 255, 255, 0.8),
            inset 0 -6px 6px rgba(0, 0, 0, 0.18),
            0 6px 0 #17415c,
            0 11px 15px rgba(0, 0, 0, 0.23);
        }

        .mainActionButton:hover {
          filter: brightness(1.07);
          transform: translateY(-1px);
        }

        .mainBox,
        .editorBox,
        .viewerBox {
          position: relative;
          width: min(1400px, 95%);
          margin: 80px auto 40px;
          padding: 75px 35px 50px;
          border: 3px solid #303538;
          border-radius: 28px;
          background: linear-gradient(
            145deg,
            #686c6f,
            #505457 45%,
            #363a3d
          );
          box-shadow:
            inset 0 7px 6px rgba(255, 255, 255, 0.23),
            inset 0 -8px 8px rgba(0, 0, 0, 0.32),
            0 7px 0 #272b2e,
            0 15px 24px rgba(0, 0, 0, 0.3);
        }

        .sectionTitle {
          position: absolute;
          top: -35px;
          left: 50%;
          transform: translateX(-50%);
          min-width: 310px;
          min-height: 66px;
          padding: 12px 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          white-space: nowrap;
          font-size: 28px;
          font-weight: 700;
          color: #073b68;
          border: 3px solid #174461;
          border-radius: 15px;
          background: linear-gradient(
            180deg,
            #9bd9ff,
            #73bdea 45%,
            #4e9ccc
          );
          box-shadow:
            inset 0 6px 5px rgba(255, 255, 255, 0.75),
            inset 0 -6px 6px rgba(0, 0, 0, 0.16),
            0 5px 0 #17415c,
            0 9px 13px rgba(0, 0, 0, 0.25);
        }

        .searchRow {
          max-width: 1000px;
          margin: 0 auto 35px;
          display: grid;
          grid-template-columns: 1fr 180px;
          gap: 15px;
        }

        .searchInput {
          min-height: 54px;
          padding: 0 18px;
          border: 2px solid #454c50;
          border-radius: 11px;
          outline: none;
          font-family: inherit;
          font-size: 17px;
          background: #f5f5f5;
        }

        .refreshButton {
          min-height: 54px;
          border: 2px solid #174461;
          border-radius: 11px;
          cursor: pointer;
          font-family: inherit;
          font-size: 16px;
          font-weight: 700;
          color: #073b68;
          background: linear-gradient(#a4deff, #54a8db);
          box-shadow: 0 4px 0 #17415c;
        }

        .cases {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 30px;
        }

        .caseCard {
          min-height: 300px;
          padding: 25px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          border: 2px solid #3d4347;
          border-radius: 20px;
          background: linear-gradient(
            145deg,
            #e1e1e1,
            #c5c5c5 50%,
            #a6a6a6
          );
          box-shadow:
            inset 0 6px 5px rgba(255, 255, 255, 0.86),
            inset 0 -7px 7px rgba(0, 0, 0, 0.18),
            0 6px 0 #4a5054,
            0 11px 16px rgba(0, 0, 0, 0.25);
        }

        .caseCard h2 {
          margin: 12px 0;
          font-size: 28px;
        }

        .caseType,
        .subjectBadge,
        .questionCount {
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 700;
        }

        .caseType {
          background: #eaf6ff;
          color: #174461;
        }

        .pdfCaseCard {
          border-color: #713232;
        }

        .pdfCaseType {
          background: #f9dddd;
          color: #8a1e1e;
        }

        .pdfCardIcon {
          width: 64px;
          height: 64px;
          margin: 12px auto 2px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          background: #c92727;
          color: white;
          font-size: 17px;
          font-weight: 700;
          box-shadow: 0 4px 0 #771515;
        }

        .pdfFileName {
          word-break: break-word;
          font-weight: 700;
        }

        .pdfInfo {
          background: #f1dede;
          color: #6e2525;
        }

        .subjectBadge {
          margin-top: 10px;
          background: #d7e9f5;
          color: #173e58;
        }

        .questionCount {
          margin: 12px 0 18px;
          background: #d9dedf;
          color: #29353c;
        }

        .casePreview {
          width: 100%;
          min-height: 58px;
          margin: 4px 0 0;
          color: #27363e;
          line-height: 1.45;
          font-size: 15px;
        }

        .openButton {
          width: 170px;
          height: 48px;
          border: 2px solid #4e565b;
          border-radius: 9px;
          cursor: pointer;
          font-family: inherit;
          font-size: 17px;
          font-weight: 700;
          background: linear-gradient(180deg, #f8f8f8, #bdbdbd);
          box-shadow:
            inset 0 4px 4px white,
            0 4px 0 #555d61;
        }

        .formGroup {
          width: 100%;
          max-width: 1050px;
          margin: 0 auto 28px;
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        label {
          color: white;
          font-size: 20px;
          font-weight: 700;
        }

        .formGroup input,
        textarea {
          width: 100%;
          padding: 15px;
          border: 3px solid #525a5f;
          border-radius: 12px;
          outline: none;
          font-family: inherit;
          font-size: 18px;
          background: #f5f5f5;
          box-shadow:
            inset 0 3px 6px rgba(0, 0, 0, 0.15),
            0 3px 0 #343a3e;
        }

        .formGroup input:focus,
        textarea:focus {
          border-color: #5cb6eb;
        }

        .caseTextarea {
          min-height: 260px;
          resize: vertical;
        }

        .questionsTitle,
        .viewerQuestionsTitle {
          max-width: 1050px;
          margin: 45px auto 25px;
          padding: 15px;
          text-align: center;
          border-radius: 12px;
          font-size: 25px;
          font-weight: 700;
          color: #073b68;
          background: linear-gradient(180deg, #9bd9ff, #57a8da);
        }

        .questionCard {
          max-width: 1050px;
          margin: 0 auto 35px;
          padding: 28px;
          border: 3px solid #454c50;
          border-radius: 18px;
          background: linear-gradient(145deg, #dedede, #b5b5b5);
          box-shadow:
            inset 0 5px 5px rgba(255, 255, 255, 0.8),
            0 6px 0 #303538;
        }

        .questionCard label {
          display: block;
          margin: 15px 0 8px;
          color: #152b3a;
        }

        .questionHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
        }

        .questionHeader h3 {
          margin: 0;
          color: #073b68;
          font-size: 24px;
        }

        .questionTextarea {
          min-height: 110px;
          resize: vertical;
        }

        .answerTextarea {
          min-height: 210px;
          resize: vertical;
        }

        .deleteButton {
          padding: 9px 17px;
          border: 2px solid #8b1818;
          border-radius: 8px;
          cursor: pointer;
          color: white;
          font-family: inherit;
          font-weight: 700;
          background: linear-gradient(#ef5b5b, #a91616);
        }

        .addQuestionButton {
          display: block;
          width: 250px;
          min-height: 55px;
          margin: 20px auto 45px;
          border: 3px solid #174461;
          border-radius: 12px;
          cursor: pointer;
          font-family: inherit;
          font-size: 18px;
          font-weight: 700;
          color: #073b68;
          background: linear-gradient(#a4deff, #54a8db);
          box-shadow:
            inset 0 4px 4px white,
            0 5px 0 #17415c;
        }

        .uploadArea {
          max-width: 850px;
          margin: 20px auto 40px;
          padding: 60px 30px;
          text-align: center;
          border: 3px dashed #5caedc;
          border-radius: 20px;
          background: linear-gradient(145deg, #eeeeee, #bdbdbd);
        }

        .pdfIcon {
          width: 90px;
          height: 90px;
          margin: 0 auto 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 15px;
          background: #c92727;
          color: white;
          font-size: 24px;
          font-weight: 700;
          box-shadow: 0 6px 0 #771515;
        }

        .uploadArea p {
          font-size: 18px;
          line-height: 1.5;
        }

        .comingSoon {
          color: #7a1717;
          font-weight: 700;
        }

        .pdfMetaFields {
          max-width: 650px;
          margin: 28px auto 0;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          text-align: left;
        }

        .pdfField {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .pdfField label {
          color: #173e58;
          font-size: 18px;
          font-weight: 700;
        }

        .pdfField input {
          width: 100%;
          min-height: 50px;
          padding: 10px 14px;
          border: 2px solid #525a5f;
          border-radius: 10px;
          outline: none;
          font-family: inherit;
          font-size: 17px;
          background: #ffffff;
          box-shadow: inset 0 3px 5px rgba(0, 0, 0, 0.12);
        }

        .pdfField input:focus {
          border-color: #5cb6eb;
        }

        .fileInput {
          max-width: 600px;
          margin-top: 25px;
          background: white;
        }

        .bottomButtons {
          max-width: 700px;
          margin: 40px auto 0;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
        }

        .cancelButton,
        .saveButton {
          min-height: 58px;
          border-radius: 12px;
          cursor: pointer;
          font-family: inherit;
          font-size: 18px;
          font-weight: 700;
        }

        .cancelButton {
          border: 3px solid #565d61;
          background: linear-gradient(#f4f4f4, #a7a7a7);
          box-shadow: 0 5px 0 #4d5357;
        }

        .saveButton {
          border: 3px solid #174461;
          color: #073b68;
          background: linear-gradient(#9edcff, #4c9fd1);
          box-shadow: 0 5px 0 #17415c;
        }

        .saveButton:disabled,
        .cancelButton:disabled,
        .refreshButton:disabled {
          opacity: 0.65;
          cursor: wait;
        }

        .successBox,
        .errorBox,
        .emptyState {
          max-width: 1050px;
          margin: 20px auto;
          padding: 18px 22px;
          border-radius: 12px;
          text-align: center;
          font-size: 17px;
          font-weight: 700;
        }

        .successBox {
          color: #165f31;
          border: 2px solid #2f8650;
          background: #dff4e5;
        }

        .errorBox {
          color: #8a1e1e;
          border: 2px solid #a63a3a;
          background: #f9dddd;
        }

        .emptyState {
          color: #24343d;
          border: 2px solid #69747a;
          background: #d8dcde;
        }

        .viewerHeader {
          max-width: 1100px;
          margin: 0 auto 30px;
          padding: 25px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          border-radius: 17px;
          background: linear-gradient(145deg, #dfdfdf, #b9b9b9);
          border: 2px solid #41484c;
          box-shadow:
            inset 0 5px 5px rgba(255, 255, 255, 0.8),
            0 5px 0 #373d41;
        }

        .viewerHeader h1 {
          margin: 8px 0 0;
          font-size: 32px;
          color: #111;
        }

        .viewerSubject {
          display: inline-block;
          padding: 7px 14px;
          border-radius: 18px;
          background: #9edcff;
          color: #073b68;
          font-weight: 700;
        }

        .caseTextBox {
          max-width: 1100px;
          margin: 0 auto;
          padding: 30px;
          border: 2px solid #434b50;
          border-radius: 18px;
          background: #f0f0f0;
          box-shadow:
            inset 0 4px 5px rgba(255, 255, 255, 0.9),
            0 5px 0 #3c4347;
        }

        .caseTextBox h2 {
          margin: 0 0 18px;
          color: #073b68;
        }

        .caseTextBox p {
          margin: 0;
          white-space: pre-wrap;
          line-height: 1.75;
          font-size: 18px;
        }

        .viewerQuestions {
          max-width: 1100px;
          margin: 0 auto;
        }

        .viewerQuestionCard {
          margin-bottom: 28px;
          padding: 25px;
          border-radius: 17px;
          border: 2px solid #434b50;
          background: linear-gradient(145deg, #dedede, #b8b8b8);
          box-shadow:
            inset 0 5px 5px rgba(255, 255, 255, 0.75),
            0 5px 0 #363d41;
        }

        .viewerQuestion {
          padding: 18px;
          border-radius: 11px;
          background: #f5f5f5;
          font-size: 19px;
          line-height: 1.6;
        }

        .viewerAnswer {
          margin-top: 18px;
          padding: 20px;
          border-radius: 11px;
          background: #dceffd;
          font-size: 18px;
          line-height: 1.7;
        }

        .viewerAnswer p {
          margin: 7px 0 0;
          white-space: pre-wrap;
        }

        .answerLabel {
          color: #073b68;
          font-weight: 700;
        }

        button:active {
          transform: translateY(3px);
          box-shadow: none;
        }

        @media (max-width: 950px) {
          .page {
            padding: 10px;
          }

          .topPanel {
            flex-direction: column;
            padding: 20px;
          }

          .titlePlate {
            min-width: 0;
            width: 100%;
            font-size: 22px;
          }

          .backButton {
            width: 100%;
          }

          .controlBox {
            grid-template-columns: 1fr;
            gap: 20px;
          }

          .cases {
            grid-template-columns: 1fr;
          }

          .mainBox,
          .editorBox,
          .viewerBox {
            width: 100%;
            padding: 70px 15px 30px;
          }

          .sectionTitle {
            min-width: 240px;
            max-width: 92%;
            white-space: normal;
            text-align: center;
            font-size: 21px;
          }

          .searchRow {
            grid-template-columns: 1fr;
          }

          .bottomButtons {
            grid-template-columns: 1fr;
          }

          .pdfMetaFields {
            grid-template-columns: 1fr;
          }

          .questionCard {
            padding: 18px;
          }

          .viewerHeader {
            flex-direction: column;
            align-items: stretch;
          }

          .smallBackButton {
            width: 100%;
          }
        }

        @media (max-width: 520px) {
          .mainActionButton {
            min-height: 62px;
            font-size: 18px;
          }

          .caseCard {
            min-height: 250px;
            padding: 20px;
          }

          .caseCard h2 {
            font-size: 24px;
          }

          .questionHeader {
            align-items: flex-start;
            flex-direction: column;
          }

          .deleteButton {
            width: 100%;
          }

          .addQuestionButton {
            width: 100%;
          }

          .viewerHeader h1 {
            font-size: 27px;
          }

          .caseTextBox {
            padding: 20px;
          }

          .caseTextBox p,
          .viewerQuestion,
          .viewerAnswer {
            font-size: 16px;
          }
        }
      `}</style>
    </main>
  );
}
