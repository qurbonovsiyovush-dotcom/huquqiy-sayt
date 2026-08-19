"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type TestStatus = "draft" | "published";

type TestOption = {
  id: string;
  text: string;
  isCorrect: boolean;
};

type TestShape = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  imageSrc?: string;
  [key: string]: unknown;
};

type TestQuestion = {
  id: string;
  questionHtml: string;
  options: TestOption[];
  shapes?: TestShape[];
  points?: number;
};

type TestData = {
  id: string;
  title: string;
  subject: string;
  duration: number;
  description?: string;
  questions: TestQuestion[];
  status: TestStatus;
  createdAt?: string;
  updatedAt?: string;
};

export default function AdminTestsPage() {
  const router = useRouter();

  const [tests, setTests] = useState<TestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | TestStatus
  >("all");

  /* =========================================================
     JSON O'QISH
  ========================================================= */

  async function readJson(response: Response) {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  /* =========================================================
     TESTLARNI YUKLASH
  ========================================================= */

  const loadTests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/tests", {
        method: "GET",
        cache: "no-store",
      });

      const data = await readJson(response);

      if (!response.ok || !data.success) {
        setTests([]);

        setError(
          data.message ||
            "Testlarni serverdan yuklab bo‘lmadi."
        );

        return;
      }

      const loadedTests: TestData[] = Array.isArray(data.tests)
        ? data.tests
        : [];

      setTests(loadedTests);
    } catch (error) {
      console.error(error);

      setTests([]);

      setError(
        "Server bilan bog‘lanishda xatolik yuz berdi."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTests();
  }, [loadTests]);

  /* =========================================================
     FILTER
  ========================================================= */

  const filteredTests = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tests.filter((test) => {
      if (
        statusFilter !== "all" &&
        test.status !== statusFilter
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        String(test.title || "")
          .toLowerCase()
          .includes(query) ||
        String(test.subject || "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [tests, search, statusFilter]);

  /* =========================================================
     STATISTIKA
  ========================================================= */

  const statistics = useMemo(() => {
    const draft = tests.filter(
      (test) => test.status === "draft"
    ).length;

    const published = tests.filter(
      (test) => test.status === "published"
    ).length;

    return {
      total: tests.length,
      draft,
      published,
    };
  }, [tests]);

  /* =========================================================
     TESTNI TO'LIQ OLISH
  ========================================================= */

  async function getFullTest(id: string): Promise<TestData | null> {
    try {
      const response = await fetch(
        `/api/tests/${encodeURIComponent(id)}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await readJson(response);

      if (!response.ok || !data.success || !data.test) {
        window.alert(
          data.message || "Test ma’lumotlarini olib bo‘lmadi."
        );

        return null;
      }

      return data.test as TestData;
    } catch (error) {
      console.error(error);

      window.alert(
        "Test ma’lumotlarini olishda server xatosi."
      );

      return null;
    }
  }

  /* =========================================================
     STATUSNI O'ZGARTIRISH
  ========================================================= */

  async function changeStatus(
    id: string,
    newStatus: TestStatus
  ) {
    setWorkingId(id);

    try {
      const fullTest = await getFullTest(id);

      if (!fullTest) {
        return;
      }

      if (
        newStatus === "published" &&
        (!Array.isArray(fullTest.questions) ||
          fullTest.questions.length === 0)
      ) {
        window.alert(
          "Savolsiz testni e’lon qilib bo‘lmaydi."
        );

        return;
      }

      const confirmed = window.confirm(
        newStatus === "published"
          ? "Ushbu test foydalanuvchilarga e’lon qilinsinmi?"
          : "Ushbu test qoralama holatiga qaytarilsinmi?"
      );

      if (!confirmed) {
        return;
      }

      const updatedTest = {
        ...fullTest,
        status: newStatus,
      };

      const response = await fetch(
        `/api/tests/${encodeURIComponent(id)}`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(updatedTest),
        }
      );

      const data = await readJson(response);

      if (!response.ok || !data.success) {
        window.alert(
          data.message ||
            "Test holatini o‘zgartirib bo‘lmadi."
        );

        return;
      }

      setTests((current) =>
        current.map((test) =>
          test.id === id
            ? {
                ...test,
                ...(data.test || {}),
                status: newStatus,
              }
            : test
        )
      );

      window.alert(
        newStatus === "published"
          ? "Test muvaffaqiyatli e’lon qilindi."
          : "Test qoralama holatiga qaytarildi."
      );
    } catch (error) {
      console.error(error);

      window.alert(
        "Test holatini o‘zgartirishda server xatosi."
      );
    } finally {
      setWorkingId(null);
    }
  }

  /* =========================================================
     O'CHIRISH
  ========================================================= */

  async function deleteTest(test: TestData) {
    const confirmed = window.confirm(
      `"${test.title}" testi BUTUNLAY o‘chiriladi.\n\n` +
        "Bu amalni ortga qaytarib bo‘lmaydi.\n\n" +
        "Davom etasizmi?"
    );

    if (!confirmed) {
      return;
    }

    setWorkingId(test.id);

    try {
      const response = await fetch(
        `/api/tests/${encodeURIComponent(test.id)}`,
        {
          method: "DELETE",
          cache: "no-store",
        }
      );

      const data = await readJson(response);

      if (!response.ok || !data.success) {
        window.alert(
          data.message || "Testni o‘chirib bo‘lmadi."
        );

        return;
      }

      setTests((current) =>
        current.filter((item) => item.id !== test.id)
      );

      window.alert("Test o‘chirildi.");
    } catch (error) {
      console.error(error);

      window.alert(
        "Testni o‘chirishda server xatosi."
      );
    } finally {
      setWorkingId(null);
    }
  }

  /* =========================================================
     KOMPYUTERGA SAQLASH
  ========================================================= */

  async function downloadTest(test: TestData) {
    setWorkingId(test.id);

    try {
      const fullTest = await getFullTest(test.id);

      if (!fullTest) {
        return;
      }

      const json = JSON.stringify(fullTest, null, 2);

      const blob = new Blob([json], {
        type: "application/json;charset=utf-8",
      });

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");

      const cleanName = String(
        fullTest.title || "test"
      )
        .trim()
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
        .replace(/\s+/g, "_");

      link.href = url;
      link.download = `${cleanName || "test"}.json`;

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);

      window.alert(
        "Testni kompyuterga saqlashda xatolik."
      );
    } finally {
      setWorkingId(null);
    }
  }

  /* =========================================================
     SANA
  ========================================================= */

  function formatDate(value?: string) {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString("uz-UZ");
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <main className="page">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="header">
        <div className="headerTitle">
          <span>ADMIN PANEL</span>

          <strong>Testlarni boshqarish</strong>
        </div>

        <div className="headerActions">
          <button
            type="button"
            className="grayButton"
            onClick={() => router.push("/admin/requests")}
          >
            Admin panel
          </button>

          <button
            type="button"
            className="grayButton"
            onClick={() => router.push("/test")}
          >
            Testlarni ko‘rish
          </button>

          <button
            type="button"
            className="resultsButton"
            onClick={() => router.push("/admin/results")}
          >
            Test natijalari
          </button>

          <button
            type="button"
            className="blueButton"
            onClick={() => router.push("/test/editor")}
          >
            + Yangi test yaratish
          </button>
        </div>
      </header>

      {/* =====================================================
          STATISTIKA
      ===================================================== */}

      <section className="mainBox">
        <div className="floatingTitle">
          Testlar
        </div>

        <div className="statistics">
          <button
            type="button"
            className={
              statusFilter === "all"
                ? "statCard activeStat"
                : "statCard"
            }
            onClick={() => setStatusFilter("all")}
          >
            <strong>{statistics.total}</strong>
            <span>Jami test</span>
          </button>

          <button
            type="button"
            className={
              statusFilter === "draft"
                ? "statCard activeStat"
                : "statCard"
            }
            onClick={() => setStatusFilter("draft")}
          >
            <strong>{statistics.draft}</strong>
            <span>Qoralama</span>
          </button>

          <button
            type="button"
            className={
              statusFilter === "published"
                ? "statCard activeStat"
                : "statCard"
            }
            onClick={() => setStatusFilter("published")}
          >
            <strong>{statistics.published}</strong>
            <span>E’lon qilingan</span>
          </button>
        </div>

        {/* ===================================================
            QIDIRUV
        =================================================== */}

        <div className="searchArea">
          <div className="searchInputBox">
            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Test nomi yoki fan bo‘yicha qidirish..."
            />

            {search && (
              <button
                type="button"
                className="clearSearch"
                onClick={() => setSearch("")}
                title="Tozalash"
              >
                ×
              </button>
            )}
          </div>

          <button
            type="button"
            className="refreshButton"
            onClick={loadTests}
            disabled={loading}
          >
            ↻ Yangilash
          </button>
        </div>

        {/* ===================================================
            ERROR
        =================================================== */}

        {error && (
          <div className="errorBox">
            {error}
          </div>
        )}

        {/* ===================================================
            TESTLAR
        =================================================== */}

        <div className="contentBox">
          {loading ? (
            <div className="emptyBox">
              <div className="loader" />

              <strong>
                Testlar yuklanmoqda...
              </strong>
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="emptyBox">
              <div className="emptyIcon">
                ?
              </div>

              <h2>Test topilmadi</h2>

              <p>
                Hozircha ushbu bo‘limda test mavjud emas.
              </p>

              <button
                type="button"
                className="blueButton createFirstButton"
                onClick={() =>
                  router.push("/test/editor")
                }
              >
                + Birinchi testni yaratish
              </button>
            </div>
          ) : (
            <div className="testList">
              {filteredTests.map((test) => {
                const questionCount = Array.isArray(
                  test.questions
                )
                  ? test.questions.length
                  : 0;

                const busy = workingId === test.id;

                return (
                  <article
                    className="testCard"
                    key={test.id}
                  >
                    {/* STATUS */}

                    <div
                      className={
                        test.status === "published"
                          ? "statusBadge publishedBadge"
                          : "statusBadge draftBadge"
                      }
                    >
                      {test.status === "published"
                        ? "✓ E’LON QILINGAN"
                        : "● QORALAMA"}
                    </div>

                    {/* TITLE */}

                    <div className="testHeader">
                      <div className="testTitleArea">
                        <h2>
                          {test.title ||
                            "Nomsiz test"}
                        </h2>

                        <p>
                          {test.subject ||
                            "Fan ko‘rsatilmagan"}
                        </p>
                      </div>
                    </div>

                    {/* DESCRIPTION */}

                    {test.description && (
                      <div className="description">
                        {test.description}
                      </div>
                    )}

                    {/* INFO */}

                    <div className="testInformation">
                      <div className="infoItem">
                        <span>Savollar</span>

                        <strong>
                          {questionCount}
                        </strong>
                      </div>

                      <div className="infoItem">
                        <span>Vaqt</span>

                        <strong>
                          {Number(test.duration) || 0}
                          <small> daqiqa</small>
                        </strong>
                      </div>

                      <div className="infoItem">
                        <span>Holati</span>

                        <strong>
                          {test.status === "published"
                            ? "E’lon qilingan"
                            : "Qoralama"}
                        </strong>
                      </div>

                      <div className="infoItem">
                        <span>Oxirgi o‘zgarish</span>

                        <strong className="dateText">
                          {formatDate(test.updatedAt)}
                        </strong>
                      </div>
                    </div>

                    {/* ACTIONS */}

                    <div className="actions">
                      <button
                        type="button"
                        className="editButton"
                        disabled={busy}
                        onClick={() =>
                          router.push(
                            `/test/editor?id=${encodeURIComponent(
                              test.id
                            )}`
                          )
                        }
                      >
                        ✎ Tahrirlash
                      </button>

                      {test.status === "draft" ? (
                        <button
                          type="button"
                          className="publishButton"
                          disabled={busy}
                          onClick={() =>
                            changeStatus(
                              test.id,
                              "published"
                            )
                          }
                        >
                          {busy
                            ? "Kutilmoqda..."
                            : "✓ E’lon qilish"}
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="viewButton"
                            disabled={busy}
                            onClick={() =>
                              router.push(
                                `/test/${encodeURIComponent(
                                  test.id
                                )}`
                              )
                            }
                          >
                            ▶ Testni ko‘rish
                          </button>

                          <button
                            type="button"
                            className="draftButton"
                            disabled={busy}
                            onClick={() =>
                              changeStatus(
                                test.id,
                                "draft"
                              )
                            }
                          >
                            Qoralamaga qaytarish
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        className="saveButton"
                        disabled={busy}
                        onClick={() =>
                          downloadTest(test)
                        }
                      >
                        💾 Kompyuterga saqlash
                      </button>

                      <button
                        type="button"
                        className="deleteButton"
                        disabled={busy}
                        onClick={() =>
                          deleteTest(test)
                        }
                      >
                        × O‘chirish
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          YANGI TEST TUGMASI
      ===================================================== */}

      <div className="bottomCreate">
        <button
          type="button"
          onClick={() =>
            router.push("/test/editor")
          }
        >
          <span>+</span>

          YANGI TEST YARATISH
        </button>
      </div>

      {/* =====================================================
          CSS
      ===================================================== */}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;

          padding:
            20px 20px 100px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #f4f6f7 55%,
              #e9eef1 100%
            );

          color: #111;

          font-family:
            "Bell MT",
            "Times New Roman",
            serif;
        }

        button,
        input {
          font-family: inherit;
        }

        button {
          cursor: pointer;
        }

        button:disabled {
          opacity: 0.55;
          cursor: wait;
        }

        /* ================================================
           HEADER
        ================================================ */

        .header {
          width: min(1500px, 96%);

          min-height: 120px;

          margin: 0 auto;

          padding: 22px 28px;

          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 25px;

          border:
            3px solid #303538;

          border-radius: 25px;

          background:
            linear-gradient(
              145deg,
              #696d70,
              #4f5457 50%,
              #373b3e
            );

          box-shadow:
            inset 0 7px 6px
              rgba(255, 255, 255, 0.25),
            inset 0 -7px 8px
              rgba(0, 0, 0, 0.3),
            0 7px 0 #272b2e,
            0 14px 24px
              rgba(0, 0, 0, 0.23);
        }

        .headerTitle {
          min-width: 310px;

          padding: 14px 30px;

          display: flex;

          flex-direction: column;

          align-items: center;

          justify-content: center;

          border:
            3px solid #174461;

          border-radius: 16px;

          background:
            linear-gradient(
              #a8e5ff,
              #58a8d7
            );

          box-shadow:
            inset 0 6px 5px
              rgba(255, 255, 255, 0.75),
            0 5px 0 #17415c;

          color: #073b68;

          text-align: center;
        }

        .headerTitle span {
          margin-bottom: 3px;

          font-size: 13px;

          letter-spacing: 2px;
        }

        .headerTitle strong {
          font-size: 27px;
        }

        .headerActions {
          display: flex;

          align-items: center;

          justify-content: flex-end;

          gap: 12px;

          flex-wrap: wrap;
        }

        .headerActions button {
          min-height: 52px;

          padding: 0 20px;

          border-radius: 10px;

          font-weight: 700;

          font-size: 15px;
        }

        .grayButton {
          border:
            2px solid #555;

          background:
            linear-gradient(
              #ffffff,
              #bcbcbc
            );

          box-shadow:
            0 4px 0 #444;
        }

        .resultsButton {
          color: #125a32;

          border:
            2px solid #267446;

          background:
            linear-gradient(
              #c4f2d2,
              #68c988
            );

          box-shadow:
            0 4px 0 #266c42;

          font-weight: 700;
        }

        .resultsButton:hover {
          filter: brightness(1.05);
        }

        .blueButton {
          color: #073b68;

          border:
            2px solid #174461;

          background:
            linear-gradient(
              #b6ebff,
              #58a8d7
            );

          box-shadow:
            0 4px 0 #17415c;

          font-weight: 700;
        }

        /* ================================================
           MAIN
        ================================================ */

        .mainBox {
          position: relative;

          width: min(1500px, 96%);

          margin:
            95px auto 60px;

          padding:
            85px 35px 40px;

          border:
            3px solid #303538;

          border-radius: 27px;

          background:
            linear-gradient(
              145deg,
              #686c6f,
              #505457 45%,
              #363a3d
            );

          box-shadow:
            inset 0 7px 6px
              rgba(255, 255, 255, 0.23),
            inset 0 -8px 8px
              rgba(0, 0, 0, 0.32),
            0 7px 0 #272b2e,
            0 15px 24px
              rgba(0, 0, 0, 0.25);
        }

        .floatingTitle {
          position: absolute;

          top: -35px;

          left: 50%;

          transform:
            translateX(-50%);

          min-width: 330px;

          min-height: 70px;

          padding:
            10px 30px;

          display: flex;

          align-items: center;

          justify-content: center;

          color: #073b68;

          text-align: center;

          border:
            3px solid #174461;

          border-radius: 16px;

          background:
            linear-gradient(
              #a7e2ff,
              #58a8d7
            );

          box-shadow:
            inset 0 6px 5px
              rgba(255, 255, 255, 0.7),
            0 5px 0 #17415c;

          font-size: 28px;

          font-weight: 700;

          z-index: 10;
        }

        /* ================================================
           STATISTICS
        ================================================ */

        .statistics {
          display: grid;

          grid-template-columns:
            repeat(3, minmax(0, 1fr));

          gap: 20px;

          margin-bottom: 28px;
        }

        .statCard {
          min-height: 105px;

          padding: 15px;

          border:
            3px solid #666;

          border-radius: 14px;

          background:
            linear-gradient(
              #ffffff,
              #cccccc
            );

          box-shadow:
            inset 0 5px 5px white,
            0 5px 0 #555d61;

          text-align: center;
        }

        .statCard strong {
          display: block;

          margin-bottom: 5px;

          color: #07517e;

          font-size: 34px;
        }

        .statCard span {
          font-size: 17px;

          font-weight: 700;
        }

        .activeStat {
          border-color: #1688bf;

          background:
            linear-gradient(
              #d9f3ff,
              #88cbe9
            );
        }

        /* ================================================
           SEARCH
        ================================================ */

        .searchArea {
          margin-bottom: 30px;

          padding: 22px;

          display: flex;

          gap: 15px;

          border:
            2px solid #555;

          border-radius: 15px;

          background:
            linear-gradient(
              #eeeeee,
              #c4c4c4
            );

          box-shadow:
            inset 0 5px 5px white,
            0 5px 0 #555d61;
        }

        .searchInputBox {
          position: relative;

          flex: 1;
        }

        .searchInputBox input {
          width: 100%;

          height: 58px;

          padding:
            0 55px 0 18px;

          border:
            2px solid #168fc9;

          border-radius: 10px;

          outline: none;

          background: white;

          direction: ltr;

          text-align: left;

          font-size: 18px;
        }

        .clearSearch {
          position: absolute;

          top: 50%;

          right: 12px;

          width: 35px;

          height: 35px;

          transform:
            translateY(-50%);

          border: none;

          background: transparent;

          color: #b11919;

          font-size: 27px;

          font-weight: 700;
        }

        .refreshButton {
          min-width: 140px;

          border:
            2px solid #555;

          border-radius: 9px;

          background:
            linear-gradient(
              #ffffff,
              #bbbbbb
            );

          font-weight: 700;
        }

        /* ================================================
           CONTENT
        ================================================ */

        .contentBox {
          min-height: 250px;

          padding: 28px;

          border:
            2px solid #555;

          border-radius: 18px;

          background:
            linear-gradient(
              #f5f5f5,
              #c9c9c9
            );

          box-shadow:
            inset 0 6px 5px white,
            0 6px 0 #555d61;
        }

        .errorBox {
          margin-bottom: 25px;

          padding: 18px;

          color: #8c1111;

          text-align: center;

          border:
            2px solid #c72c2c;

          border-radius: 10px;

          background: #ffd5d5;

          font-weight: 700;
        }

        .emptyBox {
          min-height: 300px;

          display: flex;

          flex-direction: column;

          align-items: center;

          justify-content: center;

          text-align: center;
        }

        .emptyIcon {
          width: 70px;

          height: 70px;

          margin-bottom: 15px;

          display: flex;

          align-items: center;

          justify-content: center;

          border:
            3px solid #168fc9;

          border-radius: 50%;

          color: #07517e;

          font-size: 35px;

          font-weight: 700;
        }

        .emptyBox h2 {
          margin:
            5px 0;
        }

        .emptyBox p {
          color: #555;
        }

        .createFirstButton {
          min-height: 52px;

          margin-top: 15px;

          padding: 0 25px;

          border-radius: 9px;
        }

        .loader {
          width: 45px;

          height: 45px;

          margin-bottom: 20px;

          border:
            5px solid #ccc;

          border-top-color:
            #168fc9;

          border-radius: 50%;

          animation:
            spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform:
              rotate(360deg);
          }
        }

        /* ================================================
           TEST LIST
        ================================================ */

        .testList {
          display: grid;

          gap: 25px;
        }

        .testCard {
          position: relative;

          padding:
            35px 28px 28px;

          overflow: hidden;

          border:
            2px solid #60676b;

          border-radius: 17px;

          background:
            linear-gradient(
              #ffffff,
              #dedede 65%,
              #c4c4c4
            );

          box-shadow:
            inset 0 5px 5px white,
            0 6px 0 #555d61,
            0 12px 18px
              rgba(0, 0, 0, 0.2);
        }

        .statusBadge {
          position: absolute;

          top: 15px;

          right: 15px;

          padding:
            8px 13px;

          border-radius: 8px;

          font-size: 12px;

          font-weight: 700;

          letter-spacing: 0.4px;
        }

        .draftBadge {
          color: #704e00;

          border:
            1px solid #b9870d;

          background: #ffe7a3;
        }

        .publishedBadge {
          color: #126033;

          border:
            1px solid #3a9660;

          background: #ccefd8;
        }

        .testHeader {
          padding-right: 170px;
        }

        .testTitleArea h2 {
          margin:
            0 0 8px;

          color: #111;

          font-size: 27px;
        }

        .testTitleArea p {
          margin: 0;

          color: #07517e;

          font-size: 18px;

          font-weight: 700;
        }

        .description {
          margin-top: 20px;

          padding: 15px;

          border:
            1px solid #aaa;

          border-radius: 8px;

          background:
            rgba(255, 255, 255, 0.55);

          line-height: 1.5;
        }

        /* ================================================
           INFORMATION
        ================================================ */

        .testInformation {
          margin:
            25px 0;

          display: grid;

          grid-template-columns:
            repeat(4, minmax(0, 1fr));

          gap: 14px;
        }

        .infoItem {
          min-height: 90px;

          padding: 15px;

          display: flex;

          flex-direction: column;

          align-items: center;

          justify-content: center;

          border:
            1px solid #999;

          border-radius: 10px;

          background:
            rgba(255, 255, 255, 0.65);

          text-align: center;
        }

        .infoItem span {
          margin-bottom: 7px;

          color: #555;

          font-size: 13px;
        }

        .infoItem strong {
          color: #07517e;

          font-size: 21px;
        }

        .infoItem small {
          font-size: 13px;
        }

        .dateText {
          font-size: 14px !important;
        }

        /* ================================================
           ACTIONS
        ================================================ */

        .actions {
          display: flex;

          align-items: stretch;

          gap: 11px;

          flex-wrap: wrap;
        }

        .actions button {
          min-height: 50px;

          padding:
            0 18px;

          border-radius: 9px;

          font-weight: 700;
        }

        .editButton {
          color: #674700;

          border:
            2px solid #956b00;

          background:
            linear-gradient(
              #ffe69d,
              #daa329
            );

          box-shadow:
            0 4px 0 #8a6300;
        }

        .publishButton {
          color: #0e552c;

          border:
            2px solid #277b49;

          background:
            linear-gradient(
              #b9efca,
              #5bc37d
            );

          box-shadow:
            0 4px 0 #277144;
        }

        .viewButton {
          color: #073b68;

          border:
            2px solid #174461;

          background:
            linear-gradient(
              #b5eaff,
              #59a9d8
            );

          box-shadow:
            0 4px 0 #17415c;
        }

        .draftButton {
          color: #624900;

          border:
            2px solid #8d710e;

          background:
            linear-gradient(
              #fff2b9,
              #d7b850
            );

          box-shadow:
            0 4px 0 #806811;
        }

        .saveButton {
          color: #125c32;

          border:
            2px solid #267446;

          background:
            linear-gradient(
              #c4f2d2,
              #68c988
            );

          box-shadow:
            0 4px 0 #266c42;
        }

        .deleteButton {
          margin-left: auto;

          color: white;

          border:
            2px solid #8e1515;

          background:
            linear-gradient(
              #f66d6d,
              #c62424
            );

          box-shadow:
            0 4px 0 #831515;
        }

        /* ================================================
           BOTTOM CREATE
        ================================================ */

        .bottomCreate {
          width: min(1500px, 96%);

          margin: 0 auto;

          text-align: center;
        }

        .bottomCreate button {
          min-width: 330px;

          min-height: 65px;

          padding:
            0 30px;

          color: #073b68;

          border:
            3px solid #174461;

          border-radius: 13px;

          background:
            linear-gradient(
              #b6ebff,
              #58a8d7
            );

          box-shadow:
            inset 0 5px 5px
              rgba(255, 255, 255, 0.6),
            0 5px 0 #17415c;

          font-size: 18px;

          font-weight: 700;
        }

        .bottomCreate span {
          margin-right: 8px;

          font-size: 28px;

          vertical-align: middle;
        }

        /* ================================================
           RESPONSIVE
        ================================================ */

        @media (max-width: 1000px) {
          .header {
            flex-direction: column;
          }

          .headerTitle {
            width: 100%;

            min-width: 0;
          }

          .headerActions {
            width: 100%;

            justify-content: center;
          }

          .testInformation {
            grid-template-columns:
              repeat(2, 1fr);
          }
        }

        @media (max-width: 700px) {
          .page {
            padding:
              12px 7px 70px;
          }

          .mainBox {
            width: 99%;

            padding:
              75px 13px 25px;
          }

          .floatingTitle {
            min-width: 230px;

            font-size: 22px;
          }

          .statistics {
            grid-template-columns: 1fr;
          }

          .searchArea {
            flex-direction: column;
          }

          .refreshButton {
            min-height: 50px;
          }

          .contentBox {
            padding: 13px;
          }

          .testCard {
            padding:
              65px 15px 20px;
          }

          .testHeader {
            padding-right: 0;
          }

          .testInformation {
            grid-template-columns: 1fr;
          }

          .actions {
            flex-direction: column;
          }

          .actions button {
            width: 100%;

            margin-left: 0;
          }

          .bottomCreate button {
            width: 100%;

            min-width: 0;
          }
        }
      `}</style>
    </main>
  );
}