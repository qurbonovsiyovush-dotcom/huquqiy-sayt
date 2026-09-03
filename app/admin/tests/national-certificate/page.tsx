"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type NationalCertificateTest = {
  id: string;
  title: string;
  description: string;
  subject: string;
  status: "draft" | "published";
  durationMinutes: number;
  expectedClosedCount: number;
  expectedOpenCount: number;
  expectedTotalCount: number;
  savedClosedCount: number;
  savedOpenCount: number;
  savedQuestionCount: number;
  attemptLimit: number | null;
  attemptCount: number;
  submittedCount: number;
  inProgressCount: number;
  isComplete: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  tests?: NationalCertificateTest[];
  statistics?: {
    total: number;
    draftCount: number;
    publishedCount: number;
    completeCount: number;
  };
};

export default function NationalCertificateAdminTestsPage() {
  const router = useRouter();

  const [tests, setTests] = useState<NationalCertificateTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [unpublishingId, setUnpublishingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "draft" | "published"
  >("all");

  const loadTests = useCallback(async (silent = false) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setMessage("");

      const response = await fetch(
        "/api/national-certificate/admin/tests",
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      const data: ApiResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Milliy sertifikat testlarini yuklab bo‘lmadi."
        );
      }

      setTests(Array.isArray(data.tests) ? data.tests : []);
    } catch (error) {
      console.error("LOAD NATIONAL CERTIFICATE TESTS ERROR:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Testlarni yuklashda xatolik yuz berdi."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTests();
  }, [loadTests]);

  const statistics = useMemo(() => {
    const total = tests.length;
    const draftCount = tests.filter(
      (test) => test.status === "draft"
    ).length;
    const publishedCount = tests.filter(
      (test) => test.status === "published"
    ).length;
    const completeCount = tests.filter((test) => test.isComplete).length;

    return {
      total,
      draftCount,
      publishedCount,
      completeCount,
    };
  }, [tests]);

  const filteredTests = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("uz-UZ");

    return tests.filter((test) => {
      const statusMatches =
        statusFilter === "all" || test.status === statusFilter;

      if (!statusMatches) return false;

      if (!query) return true;

      return (
        test.title.toLocaleLowerCase("uz-UZ").includes(query) ||
        test.description.toLocaleLowerCase("uz-UZ").includes(query)
      );
    });
  }, [tests, search, statusFilter]);

  function formatDate(value: string | null) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return new Intl.DateTimeFormat("uz-UZ", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  async function publishTest(test: NationalCertificateTest) {
    if (test.status === "published") return;

    if (!test.isComplete) {
      setMessage(
        `"${test.title}" testida 45 ta savol to‘liq emas. Avval 35 ta yopiq va 10 ta ochiq savolni to‘ldiring.`
      );
      return;
    }

    const confirmed = window.confirm(
      `"${test.title}" testini e’lon qilasizmi?\n\nE’lon qilingandan keyin foydalanuvchilar testni ishlashi mumkin bo‘ladi.`
    );

    if (!confirmed) return;

    try {
      setPublishingId(test.id);
      setMessage("");

      const response = await fetch(
        `/api/national-certificate/tests/${encodeURIComponent(
          test.id
        )}/publish`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.message || "Testni e’lon qilib bo‘lmadi."
        );
      }

      setMessage(`"${test.title}" muvaffaqiyatli e’lon qilindi.`);
      await loadTests(true);
    } catch (error) {
      console.error("PUBLISH NATIONAL CERTIFICATE TEST ERROR:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Testni e’lon qilishda xatolik yuz berdi."
      );
    } finally {
      setPublishingId(null);
    }
  }


  async function unpublishTest(test: NationalCertificateTest) {
    if (test.status !== "published") return;

    const confirmed = window.confirm(
      `"${test.title}" testini qoralamaga qaytarasizmi?\n\nTest foydalanuvchilar ro‘yxatidan yashiriladi. Savollar va eski natijalar saqlanib qoladi.`
    );

    if (!confirmed) return;

    try {
      setUnpublishingId(test.id);
      setMessage("");

      const response = await fetch(
        `/api/national-certificate/tests/${encodeURIComponent(
          test.id
        )}/unpublish`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.message || "Testni qoralamaga qaytarib bo‘lmadi."
        );
      }

      setMessage(`"${test.title}" qoralama holatiga qaytarildi.`);
      await loadTests(true);
    } catch (error) {
      console.error("UNPUBLISH NATIONAL CERTIFICATE TEST ERROR:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Testni qoralamaga qaytarishda xatolik yuz berdi."
      );
    } finally {
      setUnpublishingId(null);
    }
  }

  async function deleteTest(test: NationalCertificateTest) {
    const firstConfirm = window.confirm(
      `"${test.title}" testini o‘chirmoqchimisiz?\n\nAgar test bo‘yicha urinish yoki natija mavjud bo‘lsa, tizim o‘chirishga ruxsat bermaydi.`
    );

    if (!firstConfirm) return;

    const secondConfirm = window.confirm(
      `DIQQAT!\n\n"${test.title}" testini o‘chirishni yana bir bor tasdiqlang.\n\nBu amalni bekor qilib bo‘lmaydi.`
    );

    if (!secondConfirm) return;

    try {
      setDeletingId(test.id);
      setMessage("");

      const response = await fetch(
        `/api/national-certificate/tests/${encodeURIComponent(
          test.id
        )}/delete`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok || !data?.success) {
        if (data?.code === "TEST_HAS_ATTEMPTS") {
          const attempts = data?.attempts;

          throw new Error(
            `${data.message || "Testni o‘chirib bo‘lmaydi."}${
              attempts
                ? ` Jami urinish: ${attempts.total}, topshirilgan: ${attempts.submitted}, muddati tugagan: ${attempts.expired}, davom etayotgan: ${attempts.inProgress}.`
                : ""
            }`
          );
        }

        throw new Error(
          data?.message || "Testni o‘chirib bo‘lmadi."
        );
      }

      setMessage(`"${test.title}" muvaffaqiyatli o‘chirildi.`);
      await loadTests(true);
    } catch (error) {
      console.error("DELETE NATIONAL CERTIFICATE TEST ERROR:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Testni o‘chirishda xatolik yuz berdi."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="page">
      <header className="header">
        <div className="titlePlate">
          <span>ADMIN PANEL</span>
          <strong>Milliy sertifikat testlari</strong>
        </div>

        <div className="headerActions">
          <button
            type="button"
            className="grayButton"
            onClick={() => router.push("/admin/tests")}
          >
            ← Testlar
          </button>

          <button
            type="button"
            className="grayButton"
            onClick={() => router.push("/admin/results/national-certificate")}
          >
            Natijalar
          </button>

          <button
            type="button"
            className="grayButton"
            onClick={() => router.push("/")}
          >
            Asosiy sahifa
          </button>
        </div>
      </header>

      <section className="topActions">
        <button
          type="button"
          className="blueButton bigAction"
          onClick={() =>
            router.push("/admin/tests/national-certificate/new")
          }
        >
          + Yangi test
        </button>

        <button
          type="button"
          className="blueButton bigAction"
          onClick={() =>
            router.push("/admin/tests/national-certificate/import-pdf")
          }
        >
          PDF import
        </button>

        <button
          type="button"
          className="grayButton bigAction"
          onClick={() => loadTests(true)}
          disabled={refreshing}
        >
          {refreshing ? "Yangilanmoqda..." : "Yangilash"}
        </button>
      </section>

      <section className="statsGrid">
        <article className="statCard">
          <strong>{statistics.total}</strong>
          <span>Jami test</span>
        </article>

        <article className="statCard">
          <strong>{statistics.draftCount}</strong>
          <span>Qoralama</span>
        </article>

        <article className="statCard">
          <strong>{statistics.publishedCount}</strong>
          <span>E’lon qilingan</span>
        </article>

        <article className="statCard">
          <strong>{statistics.completeCount}</strong>
          <span>45/45 tayyor</span>
        </article>
      </section>

      <section className="controlPanel">
        <div className="controlTitle">Testlarni boshqarish</div>

        <div className="filters">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Test nomi bo‘yicha qidirish..."
          />

          <div className="filterButtons">
            <button
              type="button"
              className={statusFilter === "all" ? "filter activeFilter" : "filter"}
              onClick={() => setStatusFilter("all")}
            >
              Barchasi
            </button>

            <button
              type="button"
              className={
                statusFilter === "draft" ? "filter activeFilter" : "filter"
              }
              onClick={() => setStatusFilter("draft")}
            >
              Qoralama
            </button>

            <button
              type="button"
              className={
                statusFilter === "published"
                  ? "filter activeFilter"
                  : "filter"
              }
              onClick={() => setStatusFilter("published")}
            >
              E’lon qilingan
            </button>
          </div>
        </div>

        {message && <div className="messageBox">{message}</div>}

        {loading ? (
          <div className="stateBox">Testlar yuklanmoqda...</div>
        ) : filteredTests.length === 0 ? (
          <div className="stateBox">
            {tests.length === 0
              ? "Hali Milliy sertifikat testi yaratilmagan."
              : "Qidiruv bo‘yicha test topilmadi."}
          </div>
        ) : (
          <div className="testList">
            {filteredTests.map((test) => (
              <article className="testCard" key={test.id}>
                <div className="testMain">
                  <div className="testTitleRow">
                    <div>
                      <h2>{test.title}</h2>

                      {test.description && (
                        <p>{test.description}</p>
                      )}
                    </div>

                    <span
                      className={
                        test.status === "published"
                          ? "statusBadge published"
                          : "statusBadge draft"
                      }
                    >
                      {test.status === "published"
                        ? "E’lon qilingan"
                        : "Qoralama"}
                    </span>
                  </div>

                  <div className="metaGrid">
                    <div className="metaCard">
                      <strong>{test.savedQuestionCount}/45</strong>
                      <span>Jami savol</span>
                    </div>

                    <div className="metaCard">
                      <strong>{test.savedClosedCount}/35</strong>
                      <span>Yopiq</span>
                    </div>

                    <div className="metaCard">
                      <strong>{test.savedOpenCount}/10</strong>
                      <span>Ochiq</span>
                    </div>

                    <div className="metaCard">
                      <strong>{test.durationMinutes}</strong>
                      <span>Daqiqa</span>
                    </div>

                    <div className="metaCard">
                      <strong>
                        {test.attemptLimit === null
                          ? "∞"
                          : test.attemptLimit}
                      </strong>
                      <span>Urinish limiti</span>
                    </div>

                    <div className="metaCard">
                      <strong>{test.attemptCount}</strong>
                      <span>Urinishlar</span>
                    </div>
                  </div>

                  <div className="infoStrip">
                    <span>
                      Holat:{" "}
                      <b className={test.isComplete ? "okText" : "warnText"}>
                        {test.isComplete ? "45/45 tayyor" : "To‘liq emas"}
                      </b>
                    </span>

                    <span>
                      Topshirilgan: <b>{test.submittedCount}</b>
                    </span>

                    <span>
                      Davom etayotgan: <b>{test.inProgressCount}</b>
                    </span>

                    <span>
                      Yangilangan: <b>{formatDate(test.updatedAt)}</b>
                    </span>
                  </div>
                </div>

                <div className="actions">
                  <button
                    type="button"
                    className="blueButton actionButton"
                    onClick={() =>
                      router.push(
                        `/admin/tests/national-certificate/${encodeURIComponent(
                          test.id
                        )}`
                      )
                    }
                  >
                    Tahrirlash
                  </button>

                  <button
                    type="button"
                    className="grayButton actionButton"
                    onClick={() =>
                      router.push("/admin/results/national-certificate")
                    }
                  >
                    Natijalar
                  </button>

                  {test.status === "draft" && (
                    <button
                      type="button"
                      className="greenButton actionButton"
                      disabled={
                        !test.isComplete ||
                        publishingId === test.id ||
                        deletingId === test.id
                      }
                      onClick={() => publishTest(test)}
                    >
                      {publishingId === test.id
                        ? "E’lon qilinmoqda..."
                        : "E’lon qilish"}
                    </button>
                  )}

                  {test.status === "published" && (
                    <button
                      type="button"
                      className="amberButton actionButton"
                      disabled={
                        unpublishingId === test.id ||
                        deletingId === test.id
                      }
                      onClick={() => unpublishTest(test)}
                    >
                      {unpublishingId === test.id
                        ? "Qaytarilmoqda..."
                        : "Qoralamaga qaytarish"}
                    </button>
                  )}

                  <button
                    type="button"
                    className="redButton actionButton"
                    disabled={
                      deletingId === test.id ||
                      publishingId === test.id ||
                      unpublishingId === test.id
                    }
                    onClick={() => deleteTest(test)}
                  >
                    {deletingId === test.id
                      ? "O‘chirilmoqda..."
                      : "Testni o‘chirish"}
                  </button>
                </div>
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
          padding: 20px;
          background:
            radial-gradient(
              circle at 12% 0%,
              rgba(255, 255, 255, 0.95),
              transparent 28%
            ),
            linear-gradient(180deg, #e8edf1 0%, #c5cfd6 100%);
          color: #101820;
          font-family: Georgia, "Times New Roman", serif;
        }

        .header,
        .controlPanel,
        .testCard,
        .statCard,
        .topActions {
          border: 2px solid #273f4d;
          box-shadow:
            inset 0 5px 4px rgba(255,255,255,.75),
            0 6px 0 #273f4d,
            0 12px 25px rgba(18, 35, 46, .22);
        }

        .header {
          max-width: 1640px;
          min-height: 150px;
          margin: 0 auto 26px;
          padding: 24px 28px;
          border-radius: 24px;
          background:
            linear-gradient(
              180deg,
              #5fd0ff 0%,
              #0b88d7 49%,
              #0666b2 100%
            );
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .titlePlate {
          min-width: 360px;
          padding: 15px 22px;
          border: 2px solid #344750;
          border-radius: 16px;
          background:
            linear-gradient(180deg, #fff 0%, #c6d0d5 100%);
          box-shadow:
            inset 0 4px 3px #fff,
            0 5px 0 #364c57,
            0 9px 16px rgba(0,0,0,.2);
        }

        .titlePlate span,
        .titlePlate strong {
          display: block;
        }

        .titlePlate span {
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .titlePlate strong {
          margin-top: 5px;
          font-size: clamp(25px, 2.1vw, 35px);
        }

        .headerActions,
        .topActions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .topActions {
          max-width: 1640px;
          margin: 0 auto 26px;
          padding: 18px;
          border-radius: 18px;
          background:
            linear-gradient(180deg, #d9e1e6 0%, #929fa7 100%);
        }

        button {
          font: inherit;
        }

        .grayButton,
        .blueButton,
        .greenButton,
        .publishedButton,
        .amberButton,
        .redButton,
        .filter {
          min-height: 48px;
          padding: 10px 18px;
          border: 2px solid #29434f;
          border-radius: 13px;
          font-weight: 900;
          cursor: pointer;
          box-shadow:
            inset 0 3px 2px rgba(255,255,255,.85),
            0 4px 0 #29434f,
            0 8px 13px rgba(0,0,0,.14);
          transition:
            transform .12s ease,
            box-shadow .12s ease;
        }

        .grayButton,
        .filter {
          background:
            linear-gradient(180deg, #fff 0%, #c8d0d5 100%);
          color: #111;
        }

        .blueButton {
          color: #fff;
          background:
            linear-gradient(180deg, #5fd0ff 0%, #0784d4 58%, #0466ad 100%);
        }

        .greenButton {
          color: #102916;
          background:
            linear-gradient(180deg, #dfffe6 0%, #68c982 100%);
        }

        .publishedButton {
          color: #17451f;
          background:
            linear-gradient(180deg, #e8ffed 0%, #9fdcae 100%);
        }

        .amberButton {
          color: #3d2800;
          background:
            linear-gradient(180deg, #fff4c7 0%, #e3b64f 100%);
        }

        .redButton {
          color: #fff;
          border-color: #672b2b;
          background:
            linear-gradient(180deg, #ff8a8a 0%, #c92d2d 58%, #941f1f 100%);
          box-shadow:
            inset 0 3px 2px rgba(255,255,255,.75),
            0 4px 0 #672b2b,
            0 8px 13px rgba(0,0,0,.16);
        }

        button:not(:disabled):active {
          transform: translateY(3px);
          box-shadow:
            inset 0 2px 3px rgba(0,0,0,.12),
            0 1px 0 #29434f;
        }

        button:disabled {
          opacity: .58;
          cursor: not-allowed;
        }

        .bigAction {
          min-width: 210px;
          min-height: 56px;
          font-size: 17px;
        }

        .statsGrid {
          max-width: 1640px;
          margin: 0 auto 26px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 15px;
        }

        .statCard {
          min-height: 116px;
          padding: 18px;
          border-radius: 17px;
          background:
            linear-gradient(180deg, #fff 0%, #d5dde2 100%);
          text-align: center;
        }

        .statCard strong {
          display: block;
          font-size: 34px;
        }

        .statCard span {
          display: block;
          margin-top: 5px;
          font-weight: 900;
        }

        .controlPanel {
          position: relative;
          max-width: 1640px;
          margin: 0 auto 50px;
          padding: 36px 22px 24px;
          border-radius: 22px;
          background:
            linear-gradient(180deg, #909da5 0%, #69777f 100%);
        }

        .controlTitle {
          position: absolute;
          top: -18px;
          left: 24px;
          padding: 9px 20px;
          border: 2px solid #274553;
          border-radius: 12px;
          background:
            linear-gradient(180deg, #5ed0ff 0%, #0784d4 100%);
          color: #fff;
          font-weight: 900;
          font-size: 18px;
          box-shadow:
            inset 0 3px 2px rgba(255,255,255,.7),
            0 4px 0 #274553;
        }

        .filters {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 14px;
          margin-bottom: 18px;
        }

        .filters input {
          width: 100%;
          min-height: 54px;
          padding: 11px 15px;
          border: 2px solid #344b57;
          border-radius: 13px;
          background:
            linear-gradient(180deg, #fff 0%, #e7ecef 100%);
          font: inherit;
          font-size: 16px;
          outline: none;
          box-shadow:
            inset 0 4px 7px rgba(35, 53, 63, .16),
            0 3px 0 #4c626d;
        }

        .filterButtons {
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
        }

        .filter {
          min-height: 54px;
        }

        .activeFilter {
          color: #fff;
          background:
            linear-gradient(180deg, #5ed0ff 0%, #0a84d0 100%);
        }

        .messageBox,
        .stateBox {
          margin-bottom: 18px;
          padding: 16px;
          border: 2px solid #365665;
          border-radius: 13px;
          background:
            linear-gradient(180deg, #f4fbff 0%, #cbe9f7 100%);
          font-weight: 900;
          box-shadow:
            inset 0 3px 2px rgba(255,255,255,.85),
            0 3px 0 #516b78;
        }

        .stateBox {
          min-height: 160px;
          display: grid;
          place-items: center;
          font-size: 20px;
        }

        .testList {
          display: grid;
          gap: 20px;
        }

        .testCard {
          padding: 18px;
          border-radius: 18px;
          background:
            linear-gradient(180deg, #f9fbfc 0%, #cdd6dc 100%);
          display: grid;
          grid-template-columns: 1fr 220px;
          gap: 18px;
        }

        .testTitleRow {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }

        .testTitleRow h2 {
          margin: 0;
          font-size: clamp(22px, 1.7vw, 29px);
        }

        .testTitleRow p {
          margin: 7px 0 0;
          color: #40515b;
          font-size: 15px;
          font-weight: 700;
        }

        .statusBadge {
          flex: 0 0 auto;
          padding: 9px 13px;
          border: 2px solid #354b55;
          border-radius: 10px;
          font-weight: 900;
          box-shadow:
            inset 0 3px 2px rgba(255,255,255,.8),
            0 3px 0 #4c626c;
        }

        .statusBadge.draft {
          background:
            linear-gradient(180deg, #fff4cf 0%, #e8c968 100%);
        }

        .statusBadge.published {
          background:
            linear-gradient(180deg, #eaffef 0%, #7bd18f 100%);
        }

        .metaGrid {
          margin-top: 17px;
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 10px;
        }

        .metaCard {
          min-height: 84px;
          padding: 11px;
          border: 2px solid #5d7079;
          border-radius: 12px;
          background:
            linear-gradient(180deg, #fff 0%, #dde4e8 100%);
          text-align: center;
          box-shadow:
            inset 0 3px 2px #fff,
            0 3px 0 #75858d;
        }

        .metaCard strong {
          display: block;
          font-size: 23px;
        }

        .metaCard span {
          display: block;
          margin-top: 4px;
          font-size: 12px;
          font-weight: 900;
        }

        .infoStrip {
          margin-top: 14px;
          padding: 11px 13px;
          border: 2px solid #657680;
          border-radius: 11px;
          background:
            linear-gradient(180deg, #f9fbfc 0%, #d5dde1 100%);
          display: flex;
          gap: 18px;
          flex-wrap: wrap;
          font-size: 13px;
          box-shadow:
            inset 0 3px 2px rgba(255,255,255,.9),
            0 3px 0 #78868d;
        }

        .okText {
          color: #167131;
        }

        .warnText {
          color: #9c5f00;
        }

        .actions {
          display: flex;
          flex-direction: column;
          gap: 11px;
          justify-content: center;
        }

        .actionButton {
          width: 100%;
          min-height: 50px;
        }

        @media (max-width: 1200px) {
          .metaGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .testCard {
            grid-template-columns: 1fr;
          }

          .actions {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 900px) {
          .header {
            flex-direction: column;
            align-items: stretch;
          }

          .headerActions {
            justify-content: flex-start;
          }

          .titlePlate {
            min-width: 0;
          }

          .statsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .filters {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 650px) {
          .page {
            padding: 12px;
          }

          .statsGrid,
          .metaGrid,
          .actions {
            grid-template-columns: 1fr;
          }

          .filterButtons {
            display: grid;
            grid-template-columns: 1fr;
          }

          .testTitleRow {
            flex-direction: column;
          }

          .statusBadge {
            width: 100%;
            text-align: center;
          }

          .bigAction {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}
