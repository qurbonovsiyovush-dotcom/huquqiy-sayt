"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ImportedOption = {
  id: string;
  label: "A" | "B" | "C" | "D";
  text: string;
  isCorrect: boolean;
};

type ImportedQuestion = {
  id: string;
  number: number;
  questionText: string;
  options: ImportedOption[];
  imageSrc?: string;
  warning?: string;
};

export default function ImportPdfTestPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [duration, setDuration] = useState(60);
  const [description, setDescription] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [questions, setQuestions] =
    useState<ImportedQuestion[]>([]);

  const warningCount = useMemo(
    () =>
      questions.filter(
        (item) =>
          item.warning
      ).length,
    [questions]
  );

  function handleFile(
    file: File | null
  ) {
    setMessage("");
    setQuestions([]);

    if (!file) {
      setPdfFile(null);
      return;
    }

    if (
      file.type !==
        "application/pdf" &&
      !file.name
        .toLowerCase()
        .endsWith(".pdf")
    ) {
      setPdfFile(null);
      setMessage(
        "Faqat PDF fayl yuklash mumkin."
      );
      return;
    }

    if (
      file.size >
      30 * 1024 * 1024
    ) {
      setPdfFile(null);
      setMessage(
        "PDF hajmi 30 MB dan oshmasligi kerak."
      );
      return;
    }

    setPdfFile(file);
  }

  async function analyzePdf() {
    if (!title.trim()) {
      setMessage(
        "Test nomini kiriting."
      );
      return;
    }

    if (!subject.trim()) {
      setMessage(
        "Fan nomini kiriting."
      );
      return;
    }

    if (!pdfFile) {
      setMessage(
        "Avval PDF faylni tanlang."
      );
      return;
    }

    try {
      setAnalyzing(true);
      setMessage("");
      setQuestions([]);

      const formData =
        new FormData();

      formData.append(
        "file",
        pdfFile
      );

      const response =
        await fetch(
          "/api/tests/import-pdf",
          {
            method: "POST",
            credentials:
              "include",
            body: formData,
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.message ||
            "PDFni tahlil qilib bo‘lmadi."
        );
      }

      const imported:
        ImportedQuestion[] =
        Array.isArray(
          data.questions
        )
          ? data.questions
          : [];

      setQuestions(imported);

      setMessage(
        `PDFdan ${imported.length} ta savol ajratildi.`
      );
    } catch (error) {
      console.error(
        "PDF IMPORT ERROR:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "PDFni tahlil qilishda xatolik."
      );
    } finally {
      setAnalyzing(false);
    }
  }

  function changeQuestionText(
    id: string,
    value: string
  ) {
    setQuestions((current) =>
      current.map(
        (question) =>
          question.id === id
            ? {
                ...question,
                questionText:
                  value,
              }
            : question
      )
    );
  }

  function changeOptionText(
    questionId: string,
    optionId: string,
    value: string
  ) {
    setQuestions((current) =>
      current.map(
        (question) =>
          question.id ===
          questionId
            ? {
                ...question,
                options:
                  question.options.map(
                    (option) =>
                      option.id ===
                      optionId
                        ? {
                            ...option,
                            text: value,
                          }
                        : option
                  ),
              }
            : question
      )
    );
  }

  function setCorrectAnswer(
    questionId: string,
    optionId: string
  ) {
    setQuestions((current) =>
      current.map(
        (question) =>
          question.id ===
          questionId
            ? {
                ...question,
                warning:
                  undefined,
                options:
                  question.options.map(
                    (option) => ({
                      ...option,
                      isCorrect:
                        option.id ===
                        optionId,
                    })
                  ),
              }
            : question
      )
    );
  }

  function removeQuestion(
    id: string
  ) {
    if (
      !window.confirm(
        "Ushbu savolni olib tashlaysizmi?"
      )
    ) {
      return;
    }

    setQuestions((current) =>
      current
        .filter(
          (question) =>
            question.id !== id
        )
        .map(
          (
            question,
            index
          ) => ({
            ...question,
            number:
              index + 1,
          })
        )
    );
  }

  async function saveDraft() {
    if (
      questions.length === 0
    ) {
      setMessage(
        "Saqlash uchun savollar yo‘q."
      );
      return;
    }

    const invalid =
      questions.filter(
        (question) => {
          const correctCount =
            question.options.filter(
              (option) =>
                option.isCorrect
            ).length;

          return (
            !question.questionText.trim() ||
            question.options.some(
              (option) =>
                !option.text.trim()
            ) ||
            correctCount !== 1
          );
        }
      );

    if (
      invalid.length > 0
    ) {
      setMessage(
        `${invalid.length} ta savolda xato bor. Har bir savolda 4 ta variant va 1 ta to‘g‘ri javob bo‘lishi kerak.`
      );
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const payload = {
        title:
          title.trim(),
        subject:
          subject.trim(),
        duration:
          Number(duration) ||
          60,
        description:
          description.trim(),
        status: "draft",

        questions:
          questions.map(
            (question) => ({
              id:
                question.id,

              questionHtml:
                question.questionText,

              options:
                question.options.map(
                  (option) => ({
                    id:
                      option.id,
                    text:
                      option.text,
                    isCorrect:
                      option.isCorrect,
                  })
                ),

              /*
                Rasm topilgan bo‘lsa, mavjud test editor
                schema'dagi image shape sifatida saqlaymiz.
              */
              shapes:
                question.imageSrc
                  ? [
                      {
                        id:
                          `img-${question.id}`,
                        type:
                          "image",
                        x: 100,
                        y: 20,
                        width:
                          620,
                        height:
                          300,
                        imageSrc:
                          question.imageSrc,
                        objectFit:
                          "contain",
                        borderWidth:
                          0,
                        borderRadius:
                          6,
                        zIndex:
                          1,
                      },
                    ]
                  : [],

              points: 1,
            })
          ),
      };

      const response =
        await fetch(
          "/api/tests",
          {
            method: "POST",
            credentials:
              "include",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify(
                payload
              ),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.message ||
            "Testni saqlab bo‘lmadi."
        );
      }

      window.alert(
        "PDFdan yaratilgan test qoralama sifatida saqlandi."
      );

      router.push(
        "/admin/tests"
      );
    } catch (error) {
      console.error(
        "SAVE IMPORTED TEST ERROR:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Testni saqlashda xatolik."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page">
      <header className="header">
        <div className="headerTitle">
          <span>
            ADMIN PANEL
          </span>

          <strong>
            PDF dan test yaratish
          </strong>
        </div>

        <div className="headerActions">
          <button
            type="button"
            className="grayButton"
            onClick={() =>
              router.push(
                "/admin/tests"
              )
            }
          >
            Testlarni boshqarish
          </button>

          <button
            type="button"
            className="blueButton"
            onClick={() =>
              router.push(
                "/test/editor"
              )
            }
          >
            Oddiy test yaratish
          </button>
        </div>
      </header>

      <section className="mainBox">
        <div className="floatingTitle">
          PDF import
        </div>

        <div className="introBox">
          <strong>
            PDF → avtomatik test
          </strong>

          <p>
            Savol matni, A/B/C/D variantlar, sariq bilan belgilangan to‘g‘ri javob va savol ichidagi diagramma/rasmlar avtomatik ajratishga harakat qilinadi. Natijani albatta tekshirib chiqing.
          </p>
        </div>

        <div className="metaGrid">
          <label>
            <span>
              Test nomi
            </span>

            <input
              value={title}
              onChange={(
                event
              ) =>
                setTitle(
                  event.target
                    .value
                )
              }
              placeholder="Masalan: Jinoyat huquqi — 1-test"
            />
          </label>

          <label>
            <span>
              Fan nomi
            </span>

            <input
              value={subject}
              onChange={(
                event
              ) =>
                setSubject(
                  event.target
                    .value
                )
              }
              placeholder="Masalan: Jinoyat huquqi"
            />
          </label>

          <label>
            <span>Vaqt</span>

            <div className="durationBox">
              <input
                type="number"
                min={1}
                max={600}
                value={duration}
                onChange={(
                  event
                ) =>
                  setDuration(
                    Math.max(
                      1,
                      Number(
                        event
                          .target
                          .value
                      ) || 1
                    )
                  )
                }
              />

              <strong>
                daqiqa
              </strong>
            </div>
          </label>

          <label className="descriptionField">
            <span>Izoh</span>

            <textarea
              value={
                description
              }
              onChange={(
                event
              ) =>
                setDescription(
                  event.target
                    .value
                )
              }
              placeholder="Ixtiyoriy..."
            />
          </label>
        </div>

        <div
          className={
            pdfFile
              ? "uploadArea hasFile"
              : "uploadArea"
          }
          onDragOver={(
            event
          ) =>
            event.preventDefault()
          }
          onDrop={(
            event
          ) => {
            event.preventDefault();

            handleFile(
              event
                .dataTransfer
                .files?.[0] ??
                null
            );
          }}
        >
          <div className="pdfBadge">
            PDF
          </div>

          <h2>
            PDF faylni tanlang
          </h2>

          <p>
            To‘g‘ri javoblarni sariq highlight bilan belgilang.
          </p>

          <label className="fileButton">
            PDF tanlash

            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(
                event
              ) =>
                handleFile(
                  event.target
                    .files?.[0] ??
                    null
                )
              }
            />
          </label>

          {pdfFile && (
            <div className="selectedFile">
              <strong>
                {pdfFile.name}
              </strong>

              <span>
                {(
                  pdfFile.size /
                  1024 /
                  1024
                ).toFixed(2)}{" "}
                MB
              </span>
            </div>
          )}
        </div>

        {message && (
          <div className="messageBox">
            {message}
          </div>
        )}

        <div className="analyzeActions">
          <button
            type="button"
            className="analyzeButton"
            onClick={
              analyzePdf
            }
            disabled={
              analyzing ||
              saving
            }
          >
            {analyzing
              ? "PDF tahlil qilinmoqda..."
              : "PDFNI TAHLIL QILISH"}
          </button>
        </div>
      </section>

      {questions.length >
        0 && (
        <section className="previewBox">
          <div className="floatingTitle">
            Tekshirish
          </div>

          <div className="previewHeader">
            <div>
              <strong>
                {
                  questions.length
                }{" "}
                ta savol topildi
              </strong>

              <span>
                {warningCount >
                0
                  ? `${warningCount} ta savol tekshirilishi kerak`
                  : "Barcha savollar tayyor"}
              </span>
            </div>

            <button
              type="button"
              className="saveDraftButton"
              onClick={
                saveDraft
              }
              disabled={
                saving
              }
            >
              QORALAMA SIFATIDA SAQLASH
            </button>
          </div>

          <div className="questionsList">
            {questions.map(
              (
                question
              ) => (
                <article
                  className={
                    question.warning
                      ? "questionCard warningCard"
                      : "questionCard"
                  }
                  key={
                    question.id
                  }
                >
                  <div className="questionTop">
                    <div className="questionNumber">
                      {
                        question.number
                      }
                      -savol
                    </div>

                    <button
                      type="button"
                      className="removeButton"
                      onClick={() =>
                        removeQuestion(
                          question.id
                        )
                      }
                    >
                      O‘chirish
                    </button>
                  </div>

                  {question.warning && (
                    <div className="warningBox">
                      {
                        question.warning
                      }
                    </div>
                  )}

                  <label className="questionTextField">
                    <span>
                      Savol matni
                    </span>

                    <textarea
                      value={
                        question.questionText
                      }
                      onChange={(
                        event
                      ) =>
                        changeQuestionText(
                          question.id,
                          event
                            .target
                            .value
                        )
                      }
                    />
                  </label>

                  {question.imageSrc && (
                    <div className="questionImagePreview">
                      <div className="imageLabel">
                        PDFdan ajratilgan rasm / diagramma
                      </div>

                      <img
                        src={
                          question.imageSrc
                        }
                        alt={`${question.number}-savol rasmi`}
                      />
                    </div>
                  )}

                  <div className="optionsList">
                    {question.options.map(
                      (
                        option
                      ) => (
                        <div
                          className={
                            option.isCorrect
                              ? "optionRow correctOption"
                              : "optionRow"
                          }
                          key={
                            option.id
                          }
                        >
                          <button
                            type="button"
                            className="correctSelector"
                            onClick={() =>
                              setCorrectAnswer(
                                question.id,
                                option.id
                              )
                            }
                          >
                            {option.isCorrect
                              ? "✓"
                              : ""}
                          </button>

                          <strong className="optionLetter">
                            {
                              option.label
                            }
                          </strong>

                          <textarea
                            value={
                              option.text
                            }
                            onChange={(
                              event
                            ) =>
                              changeOptionText(
                                question.id,
                                option.id,
                                event
                                  .target
                                  .value
                              )
                            }
                          />

                          {option.isCorrect && (
                            <span className="correctBadge">
                              TO‘G‘RI
                            </span>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </article>
              )
            )}
          </div>

          <div className="bottomSave">
            <button
              type="button"
              className="saveDraftButton"
              onClick={
                saveDraft
              }
              disabled={
                saving
              }
            >
              QORALAMA SIFATIDA SAQLASH
            </button>
          </div>
        </section>
      )}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          padding-bottom: 70px;
          background: #e5eaed;
          color: #101820;
          font-family: "Bell MT", "Times New Roman", serif;
        }

        .header {
          width: min(1480px, 96%);
          margin: 24px auto 0;
          padding: 20px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          border: 3px solid #30383d;
          border-radius: 24px;
          background: linear-gradient(145deg,#697176,#42494d);
          box-shadow: inset 0 6px 6px rgba(255,255,255,.24),0 9px 20px rgba(0,0,0,.18);
        }

        .headerTitle {
          display: flex;
          flex-direction: column;
          gap: 4px;
          color: #fff;
        }

        .headerTitle span {
          font-size: 12px;
          letter-spacing: 2px;
        }

        .headerTitle strong {
          font-size: 28px;
        }

        .headerActions {
          display: flex;
          gap: 12px;
        }

        .grayButton,
        .blueButton {
          min-height: 52px;
          padding: 10px 18px;
          border-radius: 12px;
          cursor: pointer;
          font-family: inherit;
          font-weight: 700;
        }

        .grayButton {
          border: 2px solid #535a5e;
          background: linear-gradient(#fafafa,#b6b6b6);
          box-shadow: 0 5px 0 #4b5256;
        }

        .blueButton {
          color: #073b68;
          border: 2px solid #174461;
          background: linear-gradient(#caefff,#63b3df);
          box-shadow: 0 5px 0 #17415c;
        }

        .mainBox,
        .previewBox {
          position: relative;
          width: min(1300px,94%);
          margin: 72px auto 0;
          padding: 70px 30px 35px;
          border: 3px solid #3e474c;
          border-radius: 24px;
          background: linear-gradient(145deg,#666d71,#41474b);
          box-shadow: inset 0 7px 6px rgba(255,255,255,.20),0 9px 20px rgba(0,0,0,.19);
        }

        .floatingTitle {
          position: absolute;
          top: -27px;
          left: 50%;
          transform: translateX(-50%);
          min-width: 240px;
          padding: 11px 22px;
          text-align: center;
          color: #073b68;
          font-size: 20px;
          font-weight: 700;
          border: 2px solid #174461;
          border-radius: 12px;
          background: linear-gradient(#caf0ff,#59a9d5);
          box-shadow: 0 5px 0 #17415c;
        }

        .introBox {
          padding: 18px 20px;
          border-radius: 14px;
          background: #edf8ff;
          border: 2px solid #6c91a8;
        }

        .introBox strong {
          display: block;
          margin-bottom: 5px;
          color: #073b68;
          font-size: 18px;
        }

        .introBox p {
          margin: 0;
          line-height: 1.55;
        }

        .metaGrid {
          margin-top: 22px;
          display: grid;
          grid-template-columns: repeat(3,minmax(0,1fr));
          gap: 16px;
        }

        .metaGrid label {
          display: flex;
          flex-direction: column;
          gap: 7px;
          color: #fff;
          font-weight: 700;
        }

        .descriptionField {
          grid-column: 1/-1;
        }

        .metaGrid input,
        .metaGrid textarea {
          width: 100%;
          padding: 12px 13px;
          border: 2px solid #69747a;
          border-radius: 10px;
          font-family: inherit;
          font-size: 16px;
          background: #fff;
        }

        .metaGrid textarea {
          min-height: 85px;
        }

        .durationBox {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px;
          align-items: center;
        }

        .uploadArea {
          margin-top: 24px;
          min-height: 270px;
          padding: 30px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          text-align: center;
          border: 3px dashed #7b858a;
          border-radius: 18px;
          background: linear-gradient(#f8f8f8,#e0e0e0);
        }

        .uploadArea.hasFile {
          border-style: solid;
          border-color: #3980a8;
          background: linear-gradient(#f2fbff,#dceefa);
        }

        .pdfBadge {
          min-width: 80px;
          padding: 9px 14px;
          color: #fff;
          font-size: 20px;
          font-weight: 900;
          border-radius: 9px;
          background: #ba3434;
        }

        .fileButton {
          position: relative;
          padding: 11px 18px;
          cursor: pointer;
          color: #073b68;
          font-weight: 700;
          border: 2px solid #174461;
          border-radius: 10px;
          background: #aee1fa;
        }

        .fileButton input {
          position: absolute;
          width: 1px;
          height: 1px;
          opacity: 0;
        }

        .selectedFile {
          padding: 8px 12px;
          background: #fff;
          border-radius: 8px;
        }

        .selectedFile span {
          margin-left: 10px;
          color: #657178;
        }

        .messageBox {
          margin-top: 17px;
          padding: 13px 15px;
          border-radius: 10px;
          background: #fff;
          font-weight: 700;
        }

        .analyzeActions,
        .bottomSave {
          margin-top: 20px;
          display: flex;
          justify-content: center;
        }

        .analyzeButton,
        .saveDraftButton {
          min-height: 56px;
          padding: 11px 24px;
          cursor: pointer;
          color: #073b68;
          font-family: inherit;
          font-weight: 800;
          border: 2px solid #174461;
          border-radius: 12px;
          background: linear-gradient(#c9efff,#5eacd8);
          box-shadow: 0 5px 0 #17415c;
        }

        .previewHeader {
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          background: #fff;
          border-radius: 13px;
        }

        .previewHeader > div {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .questionsList {
          margin-top: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .questionCard {
          padding: 20px;
          border: 2px solid #59646a;
          border-radius: 17px;
          background: linear-gradient(#fafafa,#e3e3e3);
          box-shadow: 0 5px 0 #666d71;
        }

        .warningCard {
          border-color: #bb7b25;
        }

        .questionTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
        }

        .questionNumber {
          padding: 7px 13px;
          color: #073b68;
          font-weight: 800;
          border: 2px solid #174461;
          border-radius: 9px;
          background: #9bd8f6;
        }

        .removeButton {
          padding: 6px 11px;
          border: 2px solid #9b2828;
          border-radius: 7px;
          background: #ef8d8d;
          cursor: pointer;
          font-family: inherit;
          font-weight: 700;
        }

        .warningBox {
          margin-bottom: 12px;
          padding: 10px 12px;
          color: #7b4b09;
          background: #fff2d8;
          border: 1px solid #c58a33;
          border-radius: 8px;
          font-weight: 700;
        }

        .questionTextField {
          display: flex;
          flex-direction: column;
          gap: 7px;
          font-weight: 700;
        }

        .questionTextField textarea {
          min-height: 150px;
          padding: 18px 20px;
          border: 2px solid #737d82;
          border-radius: 10px;
          font-family: inherit;
          font-size: 21px;
          line-height: 1.6;
          text-align: justify;
          text-justify: inter-word;
          resize: vertical;
        }

        .questionImagePreview {
          margin: 16px 0;
          padding: 12px;
          text-align: center;
          border: 2px solid #365b70;
          border-radius: 13px;
          background: #fff;
        }

        .imageLabel {
          width: fit-content;
          margin: 0 auto 10px;
          padding: 5px 10px;
          color: #073b68;
          font-size: 12px;
          font-weight: 700;
          border-radius: 999px;
          background: #d8effc;
        }

        .questionImagePreview img {
          display: block;
          width: 100%;
          max-width: 980px;
          max-height: 620px;
          margin: auto;
          object-fit: contain;
        }

        .optionsList {
          margin-top: 15px;
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .optionRow {
          display: grid;
          grid-template-columns: 38px 34px 1fr auto;
          align-items: center;
          gap: 8px;
          padding: 9px;
          border: 1px solid #8d999f;
          border-radius: 9px;
          background: #f5f5f5;
        }

        .correctOption {
          border: 2px solid #348255;
          background: #e7f7ed;
        }

        .correctSelector {
          width: 42px;
          height: 42px;
          cursor: pointer;
          border: 2px solid #69747a;
          border-radius: 50%;
          background: #fff;
          font-weight: 900;
        }

        .correctOption .correctSelector {
          color: #fff;
          background: #3d9b64;
          font-size: 20px;
        }

        .optionLetter {
          font-size: 21px;
          font-weight: 800;
        }

        .optionRow textarea {
          width: 100%;
          min-height: 72px;
          padding: 13px 15px;
          border: 1px solid #8d999f;
          border-radius: 8px;
          font-family: inherit;
          font-size: 19px;
          line-height: 1.5;
          text-align: justify;
          text-justify: inter-word;
          resize: vertical;
        }

        .correctBadge {
          padding: 5px 8px;
          color: #17623a;
          font-size: 10px;
          font-weight: 900;
          background: #ccebd7;
          border-radius: 999px;
        }

        @media(max-width:600px) {
          .header {
            width: calc(100% - 8px);
            margin-top: 5px;
            padding: 10px;
            flex-direction: column;
            align-items: stretch;
          }

          .headerActions,
          .metaGrid {
            display: grid;
            grid-template-columns: 1fr;
          }

          .mainBox,
          .previewBox {
            width: calc(100% - 8px);
            margin-top: 50px;
            padding: 48px 8px 18px;
          }

          .previewHeader {
            flex-direction: column;
            align-items: stretch;
          }

          .questionTextField textarea {
            min-height: 130px;
            padding: 14px;
            font-size: 17px;
            line-height: 1.55;
          }

          .optionRow {
            grid-template-columns: 36px 28px 1fr;
          }

          .correctSelector {
            width: 34px;
            height: 34px;
          }

          .optionLetter {
            font-size: 18px;
          }

          .optionRow textarea {
            min-height: 64px;
            padding: 11px 12px;
            font-size: 16px;
            line-height: 1.45;
          }

          .questionImagePreview img {
            max-height: 420px;
          }

          .correctBadge {
            grid-column: 3;
          }
        }
      `}</style>
    </main>
  );
}
