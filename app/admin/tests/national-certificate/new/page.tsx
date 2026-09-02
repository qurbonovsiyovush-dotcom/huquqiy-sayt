"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type CreatedTest = {
  id: string;
  title: string;
  description?: string;
  status: "draft" | "published";
  duration_minutes: number;
  closed_question_count: number;
  open_question_count: number;
  total_questions: number;
  attempt_limit: number | null;
};

export default function NewNationalCertificateTestPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("90");
  const [attemptLimit, setAttemptLimit] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdTest, setCreatedTest] =
    useState<CreatedTest | null>(null);

  async function readJson(response: Response) {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setError("");

    const cleanTitle = title.trim();
    const duration = Number(durationMinutes);

    const limit =
      attemptLimit.trim() === ""
        ? null
        : Number(attemptLimit);

    if (!cleanTitle) {
      setError("Test nomini kiriting.");
      return;
    }

    if (!Number.isInteger(duration) || duration <= 0) {
      setError("Test vaqtini to‘g‘ri kiriting.");
      return;
    }

    if (
      limit !== null &&
      (!Number.isInteger(limit) || limit <= 0)
    ) {
      setError("Urinishlar sonini to‘g‘ri kiriting.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        "/api/national-certificate/tests",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: cleanTitle,
            description: description.trim(),
            durationMinutes: duration,
            attemptLimit: limit,
          }),
        }
      );

      const data = await readJson(response);

      if (!response.ok || !data.success || !data.test) {
        setError(
          data.message ||
            "Testni yaratishda xatolik yuz berdi."
        );
        return;
      }

      setCreatedTest(data.test as CreatedTest);
    } catch (error) {
      console.error(error);

      setError(
        "Server bilan bog‘lanishda xatolik yuz berdi."
      );
    } finally {
      setSaving(false);
    }
  }

  if (createdTest) {
    return (
      <main className="page">
        <section className="successCard">
          <div className="successIcon">✓</div>

          <div className="miniTitle">
            MILLIY SERTIFIKAT
          </div>

          <h1>Test yaratildi</h1>

          <p className="successText">
            Test hozircha qoralama holatda saqlandi.
            Keyingi bosqichda 35 ta yopiq va 10 ta ochiq
            savolni kiritamiz.
          </p>

          <div className="infoGrid">
            <div className="infoBox">
              <span>Test nomi</span>
              <strong>{createdTest.title}</strong>
            </div>

            <div className="infoBox">
              <span>Holati</span>
              <strong>Qoralama</strong>
            </div>

            <div className="infoBox">
              <span>Vaqt</span>
              <strong>
                {createdTest.duration_minutes} daqiqa
              </strong>
            </div>

            <div className="infoBox">
              <span>Yopiq savollar</span>
              <strong>
                {createdTest.closed_question_count}
              </strong>
            </div>

            <div className="infoBox">
              <span>Ochiq savollar</span>
              <strong>
                {createdTest.open_question_count}
              </strong>
            </div>

            <div className="infoBox">
              <span>Jami</span>
              <strong>
                {createdTest.total_questions} ta savol
              </strong>
            </div>
          </div>

          <div className="testIdBox">
            <span>Test ID</span>
            <code>{createdTest.id}</code>
          </div>

          <div className="successActions">
            <button
              type="button"
              className="backButton"
              onClick={() =>
                router.push("/admin/tests")
              }
            >
              Testlar boshqaruviga qaytish
            </button>
          </div>
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
                #edf3f6 0%,
                #dfe8ed 100%
              );
            font-family:
              Arial,
              "Times New Roman",
              sans-serif;
          }

          .successCard {
            width: min(820px, 100%);
            margin: 45px auto;
            padding: 34px;
            border: 1px solid #9baab3;
            border-radius: 22px;
            background:
              linear-gradient(
                180deg,
                #ffffff 0%,
                #eef3f5 100%
              );
            box-shadow:
              inset 0 4px 5px
                rgba(255, 255, 255, 0.95),
              0 7px 0 #8b9ba4,
              0 15px 30px rgba(0, 0, 0, 0.15);
            text-align: center;
          }

          .successIcon {
            width: 76px;
            height: 76px;
            margin: 0 auto 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 3px solid #26734d;
            border-radius: 50%;
            background: #e8f7ef;
            color: #17613f;
            font-size: 42px;
            font-weight: 900;
          }

          .miniTitle {
            color: #38627a;
            font-size: 13px;
            font-weight: 900;
            letter-spacing: 1.5px;
          }

          h1 {
            margin: 8px 0 10px;
            color: #112f42;
            font-size: 32px;
          }

          .successText {
            max-width: 600px;
            margin: 0 auto 26px;
            color: #53636d;
            font-size: 15px;
            line-height: 1.6;
          }

          .infoGrid {
            display: grid;
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
            gap: 12px;
          }

          .infoBox {
            min-height: 92px;
            padding: 15px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 7px;
            border: 1px solid #9aabb5;
            border-radius: 13px;
            background:
              linear-gradient(
                180deg,
                #ffffff 0%,
                #e5ecef 100%
              );
            box-shadow:
              inset 0 3px 3px #ffffff,
              0 3px 0 #9aa8af;
          }

          .infoBox span {
            color: #687983;
            font-size: 12px;
            font-weight: 700;
          }

          .infoBox strong {
            color: #152f3d;
            font-size: 16px;
          }

          .testIdBox {
            margin-top: 20px;
            padding: 14px;
            border: 1px dashed #7e949f;
            border-radius: 11px;
            background: #f7fafb;
            text-align: left;
          }

          .testIdBox span {
            display: block;
            margin-bottom: 7px;
            color: #536873;
            font-size: 12px;
            font-weight: 800;
          }

          .testIdBox code {
            overflow-wrap: anywhere;
            color: #173a4f;
            font-size: 13px;
          }

          .successActions {
            margin-top: 25px;
          }

          .backButton {
            min-height: 48px;
            padding: 0 24px;
            border: 1px solid #1e526f;
            border-radius: 12px;
            background:
              linear-gradient(
                180deg,
                #88cbea 0%,
                #4ca4d1 100%
              );
            color: #102b3a;
            font-size: 14px;
            font-weight: 900;
            cursor: pointer;
            box-shadow:
              inset 0 3px 3px
                rgba(255, 255, 255, 0.7),
              0 4px 0 #285e79;
          }

          .backButton:active {
            transform: translateY(2px);
            box-shadow:
              inset 0 2px 2px
                rgba(255, 255, 255, 0.6),
              0 2px 0 #285e79;
          }

          @media (max-width: 700px) {
            .infoGrid {
              grid-template-columns: 1fr;
            }

            .successCard {
              padding: 24px 16px;
            }
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="topBar">
        <div>
          <div className="miniTitle">
            ADMIN PANEL
          </div>

          <h1>Milliy sertifikat testi</h1>

          <p>
            Huquqshunoslik fanidan 35 ta yopiq va
            10 ta ochiq savoldan iborat test.
          </p>
        </div>

        <button
          type="button"
          className="backButton"
          onClick={() =>
            router.push("/admin/tests")
          }
        >
          ← Orqaga
        </button>
      </div>

      <form
        className="formCard"
        onSubmit={handleSubmit}
      >
        <div className="sectionTitle">
          TESTNING ASOSIY MA’LUMOTLARI
        </div>

        <div className="field">
          <label htmlFor="title">
            Test nomi <b>*</b>
          </label>

          <input
            id="title"
            value={title}
            onChange={(event) =>
              setTitle(event.target.value)
            }
            placeholder="Masalan: Milliy sertifikat — 1-variant"
            maxLength={200}
            disabled={saving}
          />
        </div>

        <div className="field">
          <label htmlFor="description">
            Test haqida qisqacha ma’lumot
          </label>

          <textarea
            id="description"
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
            placeholder="Test haqida izoh..."
            rows={4}
            disabled={saving}
          />
        </div>

        <div className="twoColumns">
          <div className="field">
            <label htmlFor="duration">
              Test uchun vaqt
            </label>

            <div className="inputWithSuffix">
              <input
                id="duration"
                type="number"
                min="1"
                step="1"
                value={durationMinutes}
                onChange={(event) =>
                  setDurationMinutes(
                    event.target.value
                  )
                }
                disabled={saving}
              />

              <span>daqiqa</span>
            </div>

            <small>
              Vaqt butun 45 ta savol uchun beriladi.
            </small>
          </div>

          <div className="field">
            <label htmlFor="attemptLimit">
              Urinishlar soni
            </label>

            <input
              id="attemptLimit"
              type="number"
              min="1"
              step="1"
              value={attemptLimit}
              onChange={(event) =>
                setAttemptLimit(event.target.value)
              }
              placeholder="Cheklanmagan"
              disabled={saving}
            />

            <small>
              Bo‘sh qoldirilsa — cheklanmagan.
            </small>
          </div>
        </div>

        <div className="formatCard">
          <div className="formatHeader">
            TEST TUZILISHI
          </div>

          <div className="formatGrid">
            <div>
              <strong>1–35</strong>
              <span>Yopiq savollar</span>
            </div>

            <div>
              <strong>36–45</strong>
              <span>Ochiq savollar</span>
            </div>

            <div>
              <strong>45</strong>
              <span>Jami savol</span>
            </div>
          </div>

          <p>
            Foydalanuvchi berilgan vaqt ichida
            savollar orasida erkin o‘ta oladi va
            javoblarini o‘zgartira oladi.
          </p>
        </div>

        {error && (
          <div className="errorBox">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="saveButton"
          disabled={saving}
        >
          {saving
            ? "SAQLANMOQDA..."
            : "TESTNI YARATISH"}
        </button>
      </form>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          padding: 30px 22px 70px;
          background:
            linear-gradient(
              180deg,
              #edf3f6 0%,
              #dfe7eb 100%
            );
          color: #152b38;
          font-family:
            Arial,
            "Times New Roman",
            sans-serif;
        }

        .topBar {
          width: min(920px, 100%);
          margin: 0 auto 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .miniTitle {
          color: #37657f;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 1.5px;
        }

        .topBar h1 {
          margin: 5px 0 6px;
          color: #112f42;
          font-size: 30px;
        }

        .topBar p {
          margin: 0;
          color: #62747e;
          font-size: 14px;
        }

        .formCard {
          width: min(920px, 100%);
          margin: 0 auto;
          padding: 28px;
          border: 1px solid #9baab3;
          border-radius: 20px;
          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #eef2f4 100%
            );
          box-shadow:
            inset 0 4px 5px
              rgba(255, 255, 255, 0.95),
            0 6px 0 #899ba5,
            0 14px 26px rgba(0, 0, 0, 0.14);
        }

        .sectionTitle {
          margin-bottom: 22px;
          padding: 11px 15px;
          border: 1px solid #2c5c77;
          border-radius: 10px;
          background:
            linear-gradient(
              180deg,
              #b8e5f8 0%,
              #7fc1df 100%
            );
          color: #12384e;
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 0.7px;
          box-shadow:
            inset 0 3px 3px
              rgba(255, 255, 255, 0.7),
            0 3px 0 #37677f;
        }

        .field {
          margin-bottom: 20px;
        }

        label {
          display: block;
          margin-bottom: 8px;
          color: #253f4e;
          font-size: 14px;
          font-weight: 900;
        }

        label b {
          color: #a52d2d;
        }

        input,
        textarea {
          width: 100%;
          border: 1px solid #8da0aa;
          border-radius: 11px;
          outline: none;
          background: #ffffff;
          color: #132b38;
          font: inherit;
          transition: 0.15s ease;
          box-shadow:
            inset 0 2px 4px
              rgba(0, 0, 0, 0.06);
        }

        input {
          height: 49px;
          padding: 0 14px;
        }

        textarea {
          padding: 13px 14px;
          resize: vertical;
          line-height: 1.5;
        }

        input:focus,
        textarea:focus {
          border-color: #317ca3;
          box-shadow:
            0 0 0 3px
              rgba(67, 152, 197, 0.15),
            inset 0 2px 4px
              rgba(0, 0, 0, 0.04);
        }

        input:disabled,
        textarea:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        small {
          display: block;
          margin-top: 7px;
          color: #71818a;
          font-size: 12px;
        }

        .twoColumns {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .inputWithSuffix {
          position: relative;
        }

        .inputWithSuffix input {
          padding-right: 85px;
        }

        .inputWithSuffix span {
          position: absolute;
          top: 50%;
          right: 14px;
          transform: translateY(-50%);
          color: #60737e;
          font-size: 13px;
          font-weight: 800;
          pointer-events: none;
        }

        .formatCard {
          margin: 8px 0 22px;
          padding: 20px;
          border: 1px solid #8398a4;
          border-radius: 15px;
          background:
            linear-gradient(
              180deg,
              #f8fbfc 0%,
              #e5ecef 100%
            );
          box-shadow:
            inset 0 3px 4px #ffffff,
            0 3px 0 #a0adb3;
        }

        .formatHeader {
          margin-bottom: 14px;
          color: #385a6c;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .formatGrid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .formatGrid div {
          min-height: 84px;
          padding: 13px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 1px solid #9baab2;
          border-radius: 11px;
          background: #ffffff;
          text-align: center;
        }

        .formatGrid strong {
          color: #164b69;
          font-size: 22px;
        }

        .formatGrid span {
          margin-top: 5px;
          color: #586b76;
          font-size: 12px;
          font-weight: 800;
        }

        .formatCard p {
          margin: 16px 0 0;
          color: #586b76;
          font-size: 13px;
          line-height: 1.5;
        }

        .errorBox {
          margin-bottom: 18px;
          padding: 12px 14px;
          border: 1px solid #ba5a5a;
          border-radius: 10px;
          background: #fff0f0;
          color: #8e2525;
          font-size: 13px;
          font-weight: 800;
        }

        .saveButton,
        .backButton {
          border: 1px solid #1d536f;
          border-radius: 11px;
          color: #102c3b;
          font-weight: 900;
          cursor: pointer;
          box-shadow:
            inset 0 3px 3px
              rgba(255, 255, 255, 0.75),
            0 4px 0 #2d607b;
        }

        .saveButton {
          width: 100%;
          min-height: 53px;
          background:
            linear-gradient(
              180deg,
              #8ed2ef 0%,
              #4da8d3 100%
            );
          font-size: 15px;
          letter-spacing: 0.5px;
        }

        .backButton {
          min-height: 43px;
          padding: 0 18px;
          background:
            linear-gradient(
              180deg,
              #f8f8f8 0%,
              #d7dde0 100%
            );
          font-size: 13px;
          white-space: nowrap;
        }

        .saveButton:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .saveButton:not(:disabled):active,
        .backButton:active {
          transform: translateY(2px);
          box-shadow:
            inset 0 2px 3px
              rgba(255, 255, 255, 0.7),
            0 2px 0 #2d607b;
        }

        @media (max-width: 700px) {
          .page {
            padding: 20px 12px 50px;
          }

          .topBar {
            align-items: flex-start;
            flex-direction: column;
          }

          .formCard {
            padding: 18px 14px;
          }

          .twoColumns,
          .formatGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
