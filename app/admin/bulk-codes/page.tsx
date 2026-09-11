"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  ChangeEvent,
} from "react";

import {
  useRouter,
} from "next/navigation";

type CreatedUser = {
  id: string;
  name: string;
  code: string;
  approved?: boolean;
};

type ApiResult = {
  success?: boolean;
  message?: string;
  count?: number;
  users?: unknown;
};

const BATCH_STORAGE_KEY =
  "qurbonov-bulk-code-current-batch";

function isCreatedUser(
  value: unknown
): value is CreatedUser {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const row =
    value as Record<
      string,
      unknown
    >;

  return (
    typeof row.id ===
      "string" &&
    typeof row.name ===
      "string" &&
    typeof row.code ===
      "string"
  );
}

function pdfSafeText(
  value: string
) {
  return value
    .normalize("NFKD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[ʻʼ‘’`´]/g,
      "'"
    )
    .replace(
      /[–—]/g,
      "-"
    )
    .replace(
      /[^\x20-\x7E]/g,
      "?"
    );
}

function pdfEscape(
  value: string
) {
  return pdfSafeText(value)
    .replace(
      /\\/g,
      "\\\\"
    )
    .replace(
      /\(/g,
      "\\("
    )
    .replace(
      /\)/g,
      "\\)"
    );
}

function roundedRect(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const c =
    r * 0.5522847498;

  const n = (
    value: number
  ) =>
    value.toFixed(2);

  return [
    `${n(x + r)} ${n(y)} m`,
    `${n(x + w - r)} ${n(y)} l`,
    `${n(x + w - r + c)} ${n(y)} ${n(x + w)} ${n(y + r - c)} ${n(x + w)} ${n(y + r)} c`,
    `${n(x + w)} ${n(y + h - r)} l`,
    `${n(x + w)} ${n(y + h - r + c)} ${n(x + w - r + c)} ${n(y + h)} ${n(x + w - r)} ${n(y + h)} c`,
    `${n(x + r)} ${n(y + h)} l`,
    `${n(x + r - c)} ${n(y + h)} ${n(x)} ${n(y + h - r + c)} ${n(x)} ${n(y + h - r)} c`,
    `${n(x)} ${n(y + r)} l`,
    `${n(x)} ${n(y + r - c)} ${n(x + r - c)} ${n(y)} ${n(x + r)} ${n(y)} c`,
    "h",
  ].join("\n");
}

function buildPdf(
  users: CreatedUser[]
): string {
  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const CARD_X = 42;
  const CARD_W =
    PAGE_W - 84;
  const CARD_H = 72;
  const GAP = 22;
  const TOP = 43;
  const PER_PAGE = 8;

  const pageCount =
    Math.ceil(
      users.length /
        PER_PAGE
    );

  const objectCount =
    3 + pageCount * 2;

  const objects:
    string[] =
    new Array(
      objectCount + 1
    ).fill("");

  const pageObjectIds:
    number[] = [];

  objects[1] =
    "<< /Type /Catalog /Pages 2 0 R >>";

  objects[3] =
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";

  for (
    let pageIndex = 0;
    pageIndex < pageCount;
    pageIndex++
  ) {
    const pageObject =
      4 + pageIndex * 2;

    const contentObject =
      pageObject + 1;

    pageObjectIds.push(
      pageObject
    );

    const pageUsers =
      users.slice(
        pageIndex * PER_PAGE,
        (pageIndex + 1) *
          PER_PAGE
      );

    const commands:
      string[] = [];

    pageUsers.forEach(
      (
        user: CreatedUser,
        index: number
      ) => {
        const x = CARD_X;

        const y =
          PAGE_H -
          TOP -
          CARD_H -
          index *
            (CARD_H + GAP);

        commands.push(
          "q",
          "0.10 0.14 0.18 rg",
          roundedRect(
            x + 7,
            y - 8,
            CARD_W,
            CARD_H,
            13
          ),
          "f",
          "Q"
        );

        commands.push(
          "q",
          "0.40 0.55 0.65 rg",
          roundedRect(
            x + 3,
            y - 4,
            CARD_W,
            CARD_H,
            13
          ),
          "f",
          "Q"
        );

        commands.push(
          "q",
          "0.96 0.99 1 rg",
          roundedRect(
            x,
            y,
            CARD_W,
            CARD_H,
            13
          ),
          "f",
          "Q"
        );

        commands.push(
          "q",
          "0.05 0.24 0.36 RG",
          "1.8 w",
          roundedRect(
            x,
            y,
            CARD_W,
            CARD_H,
            13
          ),
          "S",
          "Q"
        );

        commands.push(
          "q",
          "1 1 1 RG",
          "2.5 w",
          `${(x + 18).toFixed(2)} ${(y + CARD_H - 10).toFixed(2)} m`,
          `${(x + CARD_W - 18).toFixed(2)} ${(y + CARD_H - 10).toFixed(2)} l`,
          "S",
          "Q"
        );

        const text =
          `${user.name}  |  ${user.code}`;

        const safeText =
          pdfSafeText(text);

        let fontSize = 15;
        const maxWidth =
          CARD_W - 50;

        const approximateWidth =
          () =>
            safeText.length *
            fontSize *
            0.535;

        while (
          approximateWidth() >
            maxWidth &&
          fontSize > 8
        ) {
          fontSize -= 0.5;
        }

        const textWidth =
          approximateWidth();

        const textX =
          x +
          (CARD_W -
            textWidth) /
            2;

        const textY =
          y +
          CARD_H / 2 -
          fontSize * 0.34;

        commands.push(
          "BT",
          `/F1 ${fontSize.toFixed(2)} Tf`,
          "0.03 0.12 0.18 rg",
          `${textX.toFixed(2)} ${textY.toFixed(2)} Td`,
          `(${pdfEscape(text)}) Tj`,
          "ET"
        );
      }
    );

    const stream =
      commands.join("\n");

    objects[pageObject] =
      `<< /Type /Page /Parent 2 0 R ` +
      `/MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
      `/Resources << /Font << /F1 3 0 R >> >> ` +
      `/Contents ${contentObject} 0 R >>`;

    objects[contentObject] =
      `<< /Length ${stream.length} >>\n` +
      `stream\n${stream}\nendstream`;
  }

  objects[2] =
    `<< /Type /Pages /Kids [` +
    pageObjectIds
      .map(
        (id: number) =>
          `${id} 0 R`
      )
      .join(" ") +
    `] /Count ${pageCount} >>`;

  let pdf = "%PDF-1.4\n";

  const offsets:
    number[] =
    new Array(
      objectCount + 1
    ).fill(0);

  for (
    let id = 1;
    id <= objectCount;
    id++
  ) {
    offsets[id] =
      pdf.length;

    pdf +=
      `${id} 0 obj\n` +
      `${objects[id]}\n` +
      `endobj\n`;
  }

  const xrefOffset =
    pdf.length;

  pdf +=
    `xref\n0 ${objectCount + 1}\n`;

  pdf +=
    "0000000000 65535 f \n";

  for (
    let id = 1;
    id <= objectCount;
    id++
  ) {
    pdf +=
      String(offsets[id])
        .padStart(10, "0") +
      " 00000 n \n";
  }

  pdf +=
    `trailer\n` +
    `<< /Size ${objectCount + 1} /Root 1 0 R >>\n` +
    `startxref\n` +
    `${xrefOffset}\n` +
    `%%EOF`;

  return pdf;
}

export default function BulkCodesPage() {
  const router =
    useRouter();

  const [
    namesText,
    setNamesText,
  ] =
    useState<string>("");

  const [
    creating,
    setCreating,
  ] =
    useState<boolean>(false);

  const [
    approving,
    setApproving,
  ] =
    useState<boolean>(false);

  const [
    deleting,
    setDeleting,
  ] =
    useState<boolean>(false);

  const [
    users,
    setUsers,
  ] =
    useState<CreatedUser[]>([]);

  const [
    message,
    setMessage,
  ] =
    useState<string>("");

  const [
    error,
    setError,
  ] =
    useState<string>("");

  useEffect(() => {
    try {
      const saved =
        sessionStorage.getItem(
          BATCH_STORAGE_KEY
        );

      if (!saved) {
        return;
      }

      const parsed:
        unknown =
        JSON.parse(saved);

      if (
        !Array.isArray(parsed)
      ) {
        return;
      }

      const restored =
        parsed.filter(
          isCreatedUser
        );

      if (
        restored.length > 0
      ) {
        setUsers(restored);
      }
    } catch {
      sessionStorage.removeItem(
        BATCH_STORAGE_KEY
      );
    }
  }, []);

  function saveBatch(
    nextUsers:
      CreatedUser[]
  ) {
    setUsers(nextUsers);

    if (
      nextUsers.length === 0
    ) {
      sessionStorage.removeItem(
        BATCH_STORAGE_KEY
      );
      return;
    }

    sessionStorage.setItem(
      BATCH_STORAGE_KEY,
      JSON.stringify(
        nextUsers
      )
    );
  }

  const names:
    string[] =
    useMemo<string[]>(
      () =>
        namesText
          .split(/\r?\n/)
          .map(
            (
              item: string
            ) =>
              item
                .replace(
                  /\s+/g,
                  " "
                )
                .trim()
          )
          .filter(
            (
              item: string
            ) =>
              Boolean(item)
          ),
      [namesText]
    );

  const allApproved =
    users.length > 0 &&
    users.every(
      (
        user: CreatedUser
      ) =>
        user.approved ===
        true
    );

  const busy =
    creating ||
    approving ||
    deleting;

  async function readTextFile(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target
        .files?.[0];

    if (!file) {
      return;
    }

    try {
      const text =
        await file.text();

      setNamesText(text);
      setMessage("");
      setError("");
    } catch {
      setError(
        "Matn faylini o‘qib bo‘lmadi."
      );
    }
  }

  async function readJson(
    response: Response
  ): Promise<ApiResult> {
    try {
      return (
        await response.json()
      ) as ApiResult;
    } catch {
      return {};
    }
  }

  async function createCodes() {
    if (
      names.length === 0
    ) {
      setError(
        "Ism-familiyalarni kiriting."
      );
      return;
    }

    if (
      names.length > 500
    ) {
      setError(
        "Bir martada maksimum 500 ta ism."
      );
      return;
    }

    if (
      users.length > 0
    ) {
      const continueWithNewBatch =
        window.confirm(
          "Oldingi yaratilgan kodlar ro‘yxati hali ekranda turibdi. Yangi ro‘yxat yaratilsa, eski ro‘yxatni shu sahifadan ommaviy o‘chirish imkoniyati yo‘qoladi.\n\nDavom etasizmi?"
        );

      if (
        !continueWithNewBatch
      ) {
        return;
      }
    }

    const confirmed =
      window.confirm(
        `${names.length} ta foydalanuvchi uchun kirish kodi yaratiladi.\n\nKodlar avval RUXSAT KUTILMOQDA holatida bo‘ladi.\n\nDavom etasizmi?`
      );

    if (!confirmed) {
      return;
    }

    setCreating(true);
    setMessage("");
    setError("");

    try {
      const response =
        await fetch(
          "/api/admin/access-codes/bulk",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                names,
              }),
          }
        );

      const data =
        await readJson(
          response
        );

      if (
        !response.ok ||
        data.success !== true
      ) {
        setError(
          data.message ||
            "Kodlar yaratilmadi."
        );
        return;
      }

      const created =
        Array.isArray(
          data.users
        )
          ? data.users.filter(
              isCreatedUser
            )
          : [];

      if (
        created.length === 0
      ) {
        setError(
          "Yaratilgan kodlar topilmadi."
        );
        return;
      }

      saveBatch(created);

      setMessage(
        `${created.length} ta kod yaratildi. Hozircha ruxsat berilmagan.`
      );
    } catch (createError) {
      console.error(
        createError
      );
      setError(
        "Server bilan bog‘lanishda xatolik."
      );
    } finally {
      setCreating(false);
    }
  }

  async function approveAll() {
    if (
      users.length === 0 ||
      allApproved
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `${users.length} ta ommaviy kodning barchasiga kirish ruxsati berilsinmi?`
      );

    if (!confirmed) {
      return;
    }

    setApproving(true);
    setMessage("");
    setError("");

    try {
      const response =
        await fetch(
          "/api/admin/access-codes/bulk",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                ids:
                  users.map(
                    (
                      user:
                        CreatedUser
                    ) =>
                      user.id
                  ),
              }),
          }
        );

      const data =
        await readJson(
          response
        );

      if (
        !response.ok ||
        data.success !== true
      ) {
        setError(
          data.message ||
            "Ruxsat berilmadi."
        );
        return;
      }

      const approvedUsers =
        users.map(
          (
            user:
              CreatedUser
          ): CreatedUser => ({
            ...user,
            approved: true,
          })
        );

      saveBatch(
        approvedUsers
      );

      setMessage(
        data.message ||
          "Barcha kodlarga ruxsat berildi."
      );
    } catch (approveError) {
      console.error(
        approveError
      );
      setError(
        "Ommaviy ruxsat berishda server xatosi."
      );
    } finally {
      setApproving(false);
    }
  }

  async function deleteCurrentBatch() {
    if (
      users.length === 0
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `DIQQAT!\n\nFaqat hozir ekranda turgan ${users.length} ta ommaviy kod bazadan butunlay o‘chiriladi.\n\nDavom etasizmi?`
      );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setMessage("");
    setError("");

    try {
      const response =
        await fetch(
          "/api/admin/access-codes/bulk",
          {
            method: "DELETE",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                ids:
                  users.map(
                    (
                      user:
                        CreatedUser
                    ) =>
                      user.id
                  ),
              }),
          }
        );

      const data =
        await readJson(
          response
        );

      if (
        !response.ok ||
        data.success !== true
      ) {
        setError(
          data.message ||
            "Kodlar o‘chirilmadi."
        );
        return;
      }

      const deletedCount =
        data.count ??
        users.length;

      saveBatch([]);

      setMessage(
        `${deletedCount} ta ommaviy kod o‘chirildi.`
      );
    } catch (deleteError) {
      console.error(
        deleteError
      );
      setError(
        "Ommaviy kodlarni o‘chirishda server xatosi."
      );
    } finally {
      setDeleting(false);
    }
  }

  async function copyAll() {
    if (
      users.length === 0
    ) {
      return;
    }

    const text =
      users
        .map(
          (
            user:
              CreatedUser
          ) =>
            `${user.name}  |  ${user.code}`
        )
        .join("\n");

    try {
      await navigator
        .clipboard
        .writeText(text);

      setMessage(
        "Kodlar nusxalandi."
      );
    } catch {
      window.prompt(
        "Nusxalang:",
        text
      );
    }
  }

  function downloadPdf() {
    if (
      users.length === 0
    ) {
      return;
    }

    const pdf =
      buildPdf(users);

    const blob =
      new Blob(
        [pdf],
        {
          type:
            "application/pdf",
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    link.href = url;
    link.download =
      "kirish-kodlari.pdf";

    document.body
      .appendChild(link);

    link.click();
    link.remove();

    window.setTimeout(
      () => {
        URL.revokeObjectURL(
          url
        );
      },
      1000
    );
  }

  return (
    <main className="page">
      <div className="topBar">
        <button
          type="button"
          className="backButton"
          onClick={() =>
            router.push(
              "/admin/requests"
            )
          }
        >
          ← ORQAGA
        </button>

        <div className="title">
          Ommaviy kirish kodlari
        </div>
      </div>

      <section className="panel">
        <div className="uploadRow">
          <label className="fileButton">
            TXT FAYL TANLASH

            <input
              type="file"
              accept=".txt,text/plain"
              disabled={busy}
              onChange={
                readTextFile
              }
            />
          </label>

          <div className="countBox">
            {names.length} ta
          </div>
        </div>

        <textarea
          value={namesText}
          disabled={busy}
          onChange={(
            event
          ) => {
            setNamesText(
              event.target.value
            );
            setMessage("");
            setError("");
          }}
          placeholder={`Aliyev Bekzod
Karimova Dilnoza
Usmonov Javohir`}
        />

        <button
          type="button"
          className="createButton"
          disabled={
            busy ||
            names.length === 0
          }
          onClick={createCodes}
        >
          {creating
            ? "YARATILMOQDA..."
            : "KODLARNI YARATISH"}
        </button>

        {error && (
          <div className="errorBox">
            {error}
          </div>
        )}

        {message && (
          <div className="successBox">
            {message}
          </div>
        )}
      </section>

      {users.length > 0 && (
        <section className="resultPanel">
          <div className="batchStatus">
            {allApproved
              ? "RUXSAT BERILGAN"
              : "RUXSAT KUTILMOQDA"}
          </div>

          <div className="resultActions">
            <button
              type="button"
              className="approveButton"
              disabled={
                busy ||
                allApproved
              }
              onClick={approveAll}
            >
              {approving
                ? "RUXSAT BERILMOQDA..."
                : allApproved
                ? "RUXSAT BERILGAN ✓"
                : "HAMMASIGA RUXSAT BERISH"}
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={copyAll}
            >
              HAMMASINI NUSXALASH
            </button>

            <button
              type="button"
              className="pdfButton"
              disabled={busy}
              onClick={downloadPdf}
            >
              PDF YUKLAB OLISH
            </button>

            <button
              type="button"
              className="deleteButton"
              disabled={busy}
              onClick={
                deleteCurrentBatch
              }
            >
              {deleting
                ? "O‘CHIRILMOQDA..."
                : "YARATILGAN KODLARNI O‘CHIRISH"}
            </button>
          </div>

          <div className="cards">
            {users.map(
              (
                user:
                  CreatedUser,
                index: number
              ) => (
                <div
                  className="codeCard"
                  key={
                    user.id ||
                    `${user.code}-${index}`
                  }
                >
                  <span>
                    {user.name}
                  </span>

                  <b>|</b>

                  <strong>
                    {user.code}
                  </strong>
                </div>
              )
            )}
          </div>
        </section>
      )}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          padding: 24px;
          background:
            linear-gradient(
              145deg,
              #eef5f9,
              #d7e4ec
            );
          color: #101820;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        button {
          cursor: pointer;
          font-weight: 900;
        }

        button:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .topBar {
          width: min(1100px, 100%);
          margin: 0 auto 28px;
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .title {
          flex: 1;
          padding: 18px 24px;
          border: 2px solid #15394f;
          border-radius: 17px;
          background:
            linear-gradient(
              180deg,
              #ffffff,
              #dceaf2
            );
          box-shadow:
            inset 0 5px 5px
              rgba(255,255,255,.95),
            0 7px 0 #17394d,
            0 14px 24px
              rgba(0,0,0,.18);
          font-size:
            clamp(22px, 3vw, 34px);
          font-weight: 900;
          text-align: center;
        }

        .backButton {
          min-height: 55px;
          padding: 0 22px;
          border: 2px solid #4d5960;
          border-radius: 12px;
          background:
            linear-gradient(
              #ffffff,
              #cbd2d6
            );
          box-shadow:
            inset 0 4px 4px white,
            0 5px 0 #4d5960;
        }

        .panel,
        .resultPanel {
          width: min(1100px, 100%);
          margin: 0 auto 35px;
          padding: 28px;
          border: 2px solid #304754;
          border-radius: 22px;
          background:
            linear-gradient(
              145deg,
              #ffffff,
              #e5edf1
            );
          box-shadow:
            inset 0 6px 6px
              rgba(255,255,255,.9),
            0 9px 0 #304754,
            0 18px 30px
              rgba(0,0,0,.18);
        }

        .uploadRow {
          margin-bottom: 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
        }

        .fileButton {
          min-height: 52px;
          padding: 0 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #1e5a7a;
          border-radius: 12px;
          background:
            linear-gradient(
              #dff5ff,
              #91cfe9
            );
          box-shadow:
            inset 0 4px 4px
              rgba(255,255,255,.9),
            0 5px 0 #1e5a7a;
          font-weight: 900;
          cursor: pointer;
        }

        .fileButton input {
          display: none;
        }

        .countBox {
          padding: 12px 20px;
          border: 2px solid #59666d;
          border-radius: 12px;
          background: white;
          font-weight: 900;
        }

        textarea {
          width: 100%;
          min-height: 330px;
          padding: 20px;
          resize: vertical;
          border: 2px solid #64737b;
          border-radius: 15px;
          outline: none;
          background: white;
          box-shadow:
            inset 0 4px 7px
              rgba(0,0,0,.10);
          font-family:
            Arial,
            Helvetica,
            sans-serif;
          font-size: 18px;
          line-height: 1.65;
        }

        .createButton {
          min-height: 60px;
          margin: 25px auto 0;
          padding: 0 36px;
          display: block;
          border: 2px solid #176438;
          border-radius: 13px;
          color: white;
          background:
            linear-gradient(
              #49be74,
              #23864a
            );
          box-shadow:
            inset 0 4px 4px
              rgba(255,255,255,.25),
            0 6px 0 #176438;
          font-size: 17px;
        }

        .successBox,
        .errorBox {
          margin-top: 22px;
          padding: 14px;
          border-radius: 11px;
          text-align: center;
          font-weight: 800;
        }

        .successBox {
          border: 2px solid #2d7b4b;
          background: #dff5e6;
          color: #176438;
        }

        .errorBox {
          border: 2px solid #9b2d2d;
          background: #f8dddd;
          color: #8a2020;
        }

        .batchStatus {
          width: fit-content;
          margin: 0 auto 24px;
          padding: 12px 22px;
          border: 2px solid #6c5500;
          border-radius: 12px;
          background:
            linear-gradient(
              #fff7c7,
              #e8cf68
            );
          box-shadow:
            0 5px 0 #6c5500;
          font-weight: 900;
        }

        .resultActions {
          margin-bottom: 28px;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 15px;
        }

        .resultActions button {
          min-height: 54px;
          padding: 0 22px;
          border: 2px solid #3c4d57;
          border-radius: 11px;
          background:
            linear-gradient(
              white,
              #cbd6dc
            );
          box-shadow:
            inset 0 4px 4px white,
            0 5px 0 #3c4d57;
        }

        .resultActions
        .approveButton {
          border-color: #176438;
          color: white;
          background:
            linear-gradient(
              #55c97d,
              #278c51
            );
          box-shadow:
            0 5px 0 #176438;
        }

        .resultActions
        .pdfButton {
          border-color: #1c6840;
          color: white;
          background:
            linear-gradient(
              #55c97d,
              #278c51
            );
          box-shadow:
            0 5px 0 #1c6840;
        }

        .resultActions
        .deleteButton {
          border-color: #821b1b;
          color: white;
          background:
            linear-gradient(
              #ff6969,
              #c92525
            );
          box-shadow:
            0 5px 0 #821b1b;
        }

        .cards {
          display: grid;
          gap: 18px;
        }

        .codeCard {
          min-height: 76px;
          padding: 16px 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          border: 2px solid #173e55;
          border-radius: 15px;
          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #edf5f9 55%,
              #cfdee7 100%
            );
          box-shadow:
            inset 0 5px 4px
              rgba(255,255,255,.95),
            inset 0 -3px 4px
              rgba(0,0,0,.08),
            0 7px 0 #173e55,
            0 13px 19px
              rgba(0,0,0,.17);
          font-size:
            clamp(16px, 2vw, 21px);
        }

        .codeCard span {
          font-weight: 800;
        }

        .codeCard b {
          color: #61727c;
          font-size: 22px;
        }

        .codeCard strong {
          color: #0b4d73;
          letter-spacing: 1px;
        }

        @media (
          max-width: 700px
        ) {
          .page {
            padding: 12px;
          }

          .topBar {
            flex-direction: column;
          }

          .backButton,
          .title {
            width: 100%;
          }

          .panel,
          .resultPanel {
            padding: 17px;
          }

          .uploadRow {
            align-items: stretch;
            flex-direction: column;
          }

          .fileButton,
          .countBox {
            width: 100%;
            text-align: center;
          }

          .resultActions {
            flex-direction: column;
          }

          .resultActions button {
            width: 100%;
          }

          .codeCard {
            flex-wrap: wrap;
            gap: 8px;
            text-align: center;
          }
        }
      `}</style>
    </main>
  );
}
