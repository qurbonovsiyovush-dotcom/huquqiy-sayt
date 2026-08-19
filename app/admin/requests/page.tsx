"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

/* =========================================================
   TYPES
========================================================= */

type AccessCode = {
  id: string;
  name: string;
  code: string;

  createdAt?: string;

  active?: boolean;
  approved?: boolean;

  requestedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
};

type AccessRequest = {
  id: string;
  name: string;
  code: string;

  createdAt?: string;

  requestedAt?: string | null;

  approved?: boolean;
  active?: boolean;
};

type HistoryItem = {
  id?: string;

  name?: string;
  code?: string;

  action?: string;
  message?: string;

  createdAt?: string;
  date?: string;
};

/* =========================================================
   PAGE
========================================================= */

export default function AdminRequestsPage() {
  const router = useRouter();

  const [codes, setCodes] =
    useState<AccessCode[]>([]);

  const [requests, setRequests] =
    useState<AccessRequest[]>([]);

  const [history, setHistory] =
    useState<HistoryItem[]>([]);

  const [name, setName] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  const [workingId, setWorkingId] =
    useState<string | null>(null);

  /* =======================================================
     JSON
  ======================================================= */

  async function readJson(
    response: Response
  ) {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  /* =======================================================
     KODLARNI YUKLASH
  ======================================================= */

  const loadCodes =
    useCallback(async () => {
      try {
        const response =
          await fetch(
            "/api/admin/codes",
            {
              method: "GET",
              cache: "no-store",
            }
          );

        if (!response.ok) {
          return;
        }

        const data =
          await readJson(
            response
          );

        if (
          Array.isArray(
            data.codes
          )
        ) {
          setCodes(
            data.codes
          );
        } else if (
          Array.isArray(data)
        ) {
          setCodes(data);
        } else {
          setCodes([]);
        }
      } catch (error) {
        console.error(
          "Kodlarni yuklash xatosi:",
          error
        );
      }
    }, []);

  /* =======================================================
     SO‘ROVLARNI YUKLASH
  ======================================================= */

  const loadRequests =
    useCallback(async () => {
      try {
        const response =
          await fetch(
            "/api/admin/requests",
            {
              method: "GET",
              cache: "no-store",
            }
          );

        if (!response.ok) {
          return;
        }

        const data =
          await readJson(
            response
          );

        if (
          Array.isArray(
            data.requests
          )
        ) {
          setRequests(
            data.requests
          );
        } else if (
          Array.isArray(data)
        ) {
          setRequests(data);
        } else {
          setRequests([]);
        }
      } catch (error) {
        console.error(
          "So‘rovlarni yuklash xatosi:",
          error
        );
      }
    }, []);

  /* =======================================================
     TARIX
  ======================================================= */

  const loadHistory =
    useCallback(async () => {
      try {
        const response =
          await fetch(
            "/api/admin/history",
            {
              method: "GET",
              cache: "no-store",
            }
          );

        if (!response.ok) {
          setHistory([]);
          return;
        }

        const data =
          await readJson(
            response
          );

        if (
          Array.isArray(
            data.history
          )
        ) {
          setHistory(
            data.history
          );
        } else if (
          Array.isArray(data)
        ) {
          setHistory(data);
        } else {
          setHistory([]);
        }
      } catch {
        setHistory([]);
      }
    }, []);

  /* =======================================================
     REFRESH
  ======================================================= */

  const refreshAll =
    useCallback(async () => {
      await Promise.all([
        loadCodes(),
        loadRequests(),
        loadHistory(),
      ]);
    }, [
      loadCodes,
      loadRequests,
      loadHistory,
    ]);

  useEffect(() => {
    async function start() {
      setLoading(true);

      await refreshAll();

      setLoading(false);
    }

    start();
  }, [refreshAll]);

  /* =======================================================
     KOD YARATISH
  ======================================================= */

  async function createCode() {
    const cleanName =
      name.trim();

    if (!cleanName) {
      window.alert(
        "Foydalanuvchi ismini kiriting."
      );

      return;
    }

    setCreating(true);

    try {
      const response =
        await fetch(
          "/api/admin/codes",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                name: cleanName,
              }),
          }
        );

      const data =
        await readJson(
          response
        );

      if (
        !response.ok ||
        data.success === false
      ) {
        window.alert(
          data.message ||
            "Maxsus kod yaratilmadi."
        );

        return;
      }

      setName("");

      await refreshAll();

    } catch (error) {
      console.error(
        "Kod yaratish xatosi:",
        error
      );

      window.alert(
        "Kod yaratishda server xatosi."
      );

    } finally {
      setCreating(false);
    }
  }

  /* =======================================================
     QABUL / RAD
  ======================================================= */

  async function requestAction(
    id: string,
    action:
      | "approve"
      | "reject"
  ) {
    setWorkingId(id);

    try {
      const response =
        await fetch(
          "/api/admin/requests",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                id,
                action,
              }),
          }
        );

      const data =
        await readJson(
          response
        );

      if (
        !response.ok ||
        data.success === false
      ) {
        window.alert(
          data.message ||
            "Amal bajarilmadi."
        );

        return;
      }

      await refreshAll();

    } finally {
      setWorkingId(null);
    }
  }

  /* =======================================================
     RUXSATNI BEKOR QILISH
  ======================================================= */

  async function revokeAccess(
    id: string
  ) {
    const confirmed =
      window.confirm(
        "Ushbu foydalanuvchining kirish ruxsatini bekor qilasizmi?"
      );

    if (!confirmed) {
      return;
    }

    setWorkingId(id);

    try {
      const response =
        await fetch(
          "/api/admin/requests",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                id,
                action:
                  "revoke",
              }),
          }
        );

      const data =
        await readJson(
          response
        );

      if (
        !response.ok ||
        data.success === false
      ) {
        window.alert(
          data.message ||
            "Ruxsatni bekor qilib bo‘lmadi."
        );

        return;
      }

      await refreshAll();

    } finally {
      setWorkingId(null);
    }
  }

  /* =======================================================
     BUTUNLAY O‘CHIRISH
  ======================================================= */

  async function deleteUser(
    id: string
  ) {
    const confirmed =
      window.confirm(
        "Bu foydalanuvchi va unga berilgan maxsus kod BUTUNLAY o‘chiriladi.\n\n" +
          "Eski kod bilan boshqa kira olmaydi.\n\n" +
          "Davom etasizmi?"
      );

    if (!confirmed) {
      return;
    }

    setWorkingId(id);

    try {
      const response =
        await fetch(
          `/api/admin/codes/${encodeURIComponent(
            id
          )}`,
          {
            method:
              "DELETE",

            cache:
              "no-store",
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
        window.alert(
          data.message ||
            "O‘chirish amalga oshmadi."
        );

        return;
      }

      setCodes(
        (current) =>
          current.filter(
            (item) =>
              item.id !== id
          )
      );

      setRequests(
        (current) =>
          current.filter(
            (item) =>
              item.id !== id
          )
      );

      await refreshAll();

    } finally {
      setWorkingId(null);
    }
  }

  /* =======================================================
     LOGOUT
  ======================================================= */

  async function logout() {
    try {
      await fetch(
        "/api/logout",
        {
          method: "POST",
        }
      );
    } finally {
      router.replace(
        "/login"
      );

      router.refresh();
    }
  }

  /* =======================================================
     SEARCH
  ======================================================= */

  const searchText =
    search
      .trim()
      .toLowerCase();

  function matchesSearch(
    item: {
      name?: string;
      code?: string;
    }
  ) {
    if (!searchText) {
      return true;
    }

    return (
      String(
        item.name || ""
      )
        .toLowerCase()
        .includes(
          searchText
        ) ||

      String(
        item.code || ""
      )
        .toLowerCase()
        .includes(
          searchText
        )
    );
  }

  const filteredCodes =
    useMemo(
      () =>
        codes.filter(
          matchesSearch
        ),
      [
        codes,
        searchText,
      ]
    );

  const pendingRequests =
    useMemo(
      () =>
        requests.filter(
          (item) =>
            !item.approved &&
            matchesSearch(
              item
            )
        ),
      [
        requests,
        searchText,
      ]
    );

  const approvedCodes =
    useMemo(
      () =>
        filteredCodes.filter(
          (item) =>
            item.approved ===
              true &&
            item.active !==
              false
        ),
      [filteredCodes]
    );

  const rejectedCodes =
    useMemo(
      () =>
        filteredCodes.filter(
          (item) =>
            Boolean(
              item.rejectedAt
            )
        ),
      [filteredCodes]
    );

  /* =======================================================
     DATE
  ======================================================= */

  function formatDate(
    value?: string | null
  ) {
    if (!value) {
      return "—";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return date.toLocaleString(
      "uz-UZ"
    );
  }

  /* =======================================================
     JSX
  ======================================================= */

  return (
    <main className="page">

      {/* HEADER */}

      <header className="topPanel">

        <div className="namePlate">
          Qurbonov Siyovush
          Jamaliddinzoda
        </div>

        <div className="topButtons">

          <button
            className="topButton"
            onClick={() =>
              router.push("/")
            }
          >
            Asosiy sahifa
          </button>

          <button
            className="exitButton"
            onClick={logout}
          >
            Chiqish
          </button>

        </div>

      </header>


      {/* ADMIN PANEL */}

      <section className="adminHero">

        <div className="sectionTitle">
          Admin paneli
        </div>

        <h1>
          Foydalanuvchilar va
          kirish ruxsatlarini
          boshqarish
        </h1>

      </section>


      {/* QIDIRUV */}

      <section className="sectionBox">

        <div className="sectionTitle">
          Qidiruv
        </div>

        <div className="metalInner">

          <div className="searchWrapper">

            <span className="searchIcon">
              🔎
            </span>

            <input
              className="searchInput"
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Ism yoki maxsus kod bo‘yicha qidirish..."
            />

            {search && (
              <button
                className="searchX"
                onClick={() =>
                  setSearch("")
                }
              >
                ×
              </button>
            )}

          </div>


          {search.trim() && (

            <div className="searchResults">

              <div className="searchResultCount">

                {filteredCodes.length > 0
                  ? `${filteredCodes.length} ta natija topildi`
                  : "Natija topilmadi"}

              </div>

              {filteredCodes.length >
                0 && (

                <div className="searchResultGrid">

                  {filteredCodes.map(
                    (item) => (

                      <article
                        className="searchResultCard"
                        key={
                          item.id
                        }
                      >

                        <button
                          className="deleteX"
                          title="Butunlay o‘chirish"
                          disabled={
                            workingId ===
                            item.id
                          }
                          onClick={() =>
                            deleteUser(
                              item.id
                            )
                          }
                        >
                          ×
                        </button>

                        <h3>
                          {item.name}
                        </h3>

                        <div className="codeText">
                          {item.code}
                        </div>

                        <div className="searchStatus">

                          {item.approved &&
                          item.active !==
                            false
                            ? "✓ Ruxsat berilgan"
                            : item.rejectedAt
                            ? "✕ Rad etilgan"
                            : item.requestedAt
                            ? "⏳ Ruxsat kutilmoqda"
                            : "Hali so‘rov yubormagan"}

                        </div>

                        <small>
                          Yaratilgan:{" "}
                          {formatDate(
                            item.createdAt
                          )}
                        </small>

                      </article>

                    )
                  )}

                </div>

              )}

            </div>

          )}

        </div>

      </section>


      {/* YANGI KOD */}

      <section className="sectionBox">

        <div className="sectionTitle">
          Yangi kirish kodi
        </div>

        <div className="metalInner">

          <div className="createRow">

            <div className="inputGroup">

              <label>
                Foydalanuvchi ismi
              </label>

              <input
                value={name}
                onChange={(e) =>
                  setName(
                    e.target.value
                  )
                }
                placeholder="Masalan: Ali Valiyev"
              />

            </div>

            <button
              className="blueButton"
              onClick={createCode}
              disabled={creating}
            >
              {creating
                ? "Yaratilmoqda..."
                : "Maxsus kod yaratish"}
            </button>

          </div>

        </div>

      </section>


      {/* YARATILGAN KODLAR */}

      <section className="sectionBox">

        <div className="sectionTitle">
          Yaratilgan kodlar
        </div>

        <div className="metalInner">

          {loading ? (

            <div className="empty">
              Yuklanmoqda...
            </div>

          ) : codes.length ===
            0 ? (

            <div className="empty">
              Yaratilgan kod yo‘q.
            </div>

          ) : (

            <div className="twoRowScroll">

              <div className="cardsGrid">

                {codes.map(
                  (item) => (

                    <article
                      className="userCard"
                      key={item.id}
                    >

                      <button
                        className="deleteX"
                        title="Butunlay o‘chirish"
                        disabled={
                          workingId ===
                          item.id
                        }
                        onClick={() =>
                          deleteUser(
                            item.id
                          )
                        }
                      >
                        ×
                      </button>

                      <h3>
                        {item.name}
                      </h3>

                      <div className="codeText">
                        {item.code}
                      </div>

                      <small>
                        Yaratilgan:{" "}
                        {formatDate(
                          item.createdAt
                        )}
                      </small>

                      {!item.approved && (
                        <div className="statusBox">

                          {item.rejectedAt
                            ? "Rad etilgan"
                            : item.requestedAt
                            ? "So‘rov yuborilgan"
                            : "Hali so‘rov yubormagan"}

                        </div>
                      )}

                    </article>

                  )
                )}

              </div>

            </div>
          )}

        </div>

      </section>


      {/* KIRISH SO‘ROVLARI */}

      <section className="sectionBox">

        <div className="sectionTitle">
          Kirish so‘rovlari
        </div>

        <div className="metalInner">

          <div className="subHeader">

            <strong>
              Kutilayotgan so‘rovlar
            </strong>

            <span className="counter">
              {
                pendingRequests.length
              }
            </span>

          </div>

          {pendingRequests.length ===
          0 ? (

            <div className="empty">
              Hozircha yangi
              kirish so‘rovi yo‘q.
            </div>

          ) : (

            <div className="requestList">

              {pendingRequests.map(
                (item) => (

                  <article
                    className="requestCard"
                    key={item.id}
                  >

                    <div>

                      <h3>
                        {item.name}
                      </h3>

                      <div className="codeText">
                        {item.code}
                      </div>

                      <small>
                        So‘rov:{" "}
                        {formatDate(
                          item.requestedAt
                        )}
                      </small>

                    </div>

                    <div className="actionButtons">

                      <button
                        className="approveButton"
                        onClick={() =>
                          requestAction(
                            item.id,
                            "approve"
                          )
                        }
                      >
                        Qabul qilish
                      </button>

                      <button
                        className="rejectButton"
                        onClick={() =>
                          requestAction(
                            item.id,
                            "reject"
                          )
                        }
                      >
                        Rad etish
                      </button>

                    </div>

                  </article>

                )
              )}

            </div>
          )}

        </div>

      </section>


      {/* RUXSAT BERILGANLAR */}

      <section className="sectionBox">

        <div className="sectionTitle">
          Ruxsat berilganlar
        </div>

        <div className="metalInner">

          {approvedCodes.length ===
          0 ? (

            <div className="empty">
              Ruxsat berilgan
              foydalanuvchi yo‘q.
            </div>

          ) : (

            <div className="requestList">

              {approvedCodes.map(
                (item) => (

                  <article
                    className="approvedCard"
                    key={item.id}
                  >

                    <button
                      className="deleteX"
                      title="Butunlay o‘chirish"
                      onClick={() =>
                        deleteUser(
                          item.id
                        )
                      }
                    >
                      ×
                    </button>

                    <div>

                      <h3>
                        {item.name}
                      </h3>

                      <div className="codeText">
                        {item.code}
                      </div>

                      <div className="approvedText">
                        ✓ Ruxsat berilgan
                      </div>

                      <small>
                        Tasdiqlangan:{" "}
                        {formatDate(
                          item.approvedAt
                        )}
                      </small>

                    </div>

                    <button
                      className="revokeButton"
                      onClick={() =>
                        revokeAccess(
                          item.id
                        )
                      }
                    >
                      Ruxsatni bekor qilish
                    </button>

                  </article>

                )
              )}

            </div>
          )}

        </div>

      </section>


      {/* RAD ETILGANLAR */}

      <section className="sectionBox">

        <div className="sectionTitle">
          Rad etilganlar
        </div>

        <div className="metalInner">

          {rejectedCodes.length ===
          0 ? (

            <div className="empty">
              Rad etilgan foydalanuvchi yo‘q.
            </div>

          ) : (

            <div className="cardsGrid">

              {rejectedCodes.map(
                (item) => (

                  <article
                    className="userCard"
                    key={item.id}
                  >

                    <button
                      className="deleteX"
                      onClick={() =>
                        deleteUser(
                          item.id
                        )
                      }
                    >
                      ×
                    </button>

                    <h3>
                      {item.name}
                    </h3>

                    <div className="codeText">
                      {item.code}
                    </div>

                    <div className="rejectedText">
                      ✕ Rad etilgan
                    </div>

                  </article>

                )
              )}

            </div>
          )}

        </div>

      </section>


      {/* TARIX */}

      <section className="sectionBox">

        <div className="sectionTitle">
          Tarix
        </div>

        <div className="metalInner">

          {history.length ===
          0 ? (

            <div className="empty">
              Hozircha tarix
              mavjud emas.
            </div>

          ) : (

            <div className="historyScroll">

              {history.map(
                (item, index) => (

                  <div
                    className="historyItem"
                    key={
                      item.id ||
                      index
                    }
                  >

                    <div>

                      <strong>
                        {item.name ||
                          "Foydalanuvchi"}
                      </strong>

                      {item.code && (
                        <div className="historyCode">
                          {item.code}
                        </div>
                      )}

                      <p>
                        {item.message ||
                          item.action ||
                          "Amal bajarildi"}
                      </p>

                    </div>

                    <small>
                      {formatDate(
                        item.createdAt ||
                          item.date
                      )}
                    </small>

                  </div>

                )
              )}

            </div>
          )}

        </div>

      </section>


      <style jsx>{`

        * {
          box-sizing:
            border-box;
        }

        .page {
          min-height: 100vh;
          padding:
            16px 16px 80px;

          background:
            linear-gradient(
              #fff,
              #f2f5f7
            );

          font-family:
            "Bell MT",
            "Times New Roman",
            serif;
        }

        button,
        input {
          font-family: inherit;
        }

        .topPanel {
          min-height: 110px;

          padding: 22px 28px;

          display: flex;
          justify-content:
            space-between;
          align-items: center;

          border:
            3px solid #173e58;

          border-radius: 25px;

          background:
            linear-gradient(
              #91d9ff,
              #4999ce
            );

          box-shadow:
            0 7px 0 #173c55;
        }

        .namePlate {
          padding:
            17px 25px;

          border:
            3px solid #42494e;

          border-radius: 14px;

          background:
            linear-gradient(
              #fafafa,
              #aaa
            );

          font-size: 24px;
          font-weight: 700;
        }

        .topButtons {
          display: flex;
          gap: 15px;
        }

        .topButton,
        .exitButton {
          min-width: 145px;
          height: 55px;

          border-radius: 13px;

          cursor: pointer;

          font-weight: 700;
        }

        .topButton {
          background:
            linear-gradient(
              #fff,
              #bbb
            );
        }

        .exitButton {
          color: white;

          background:
            linear-gradient(
              #ff6262,
              #a90909
            );
        }

        .adminHero,
        .sectionBox {
          position: relative;

          width:
            min(1200px, 94%);

          margin:
            85px auto 65px;

          border:
            3px solid #303538;

          border-radius: 27px;

          background:
            linear-gradient(
              145deg,
              #686c6f,
              #363a3d
            );

          box-shadow:
            0 7px 0 #272b2e,
            0 15px 24px
              rgba(0,0,0,.25);
        }

        .adminHero {
          min-height: 220px;

          padding:
            75px 35px 45px;

          display: flex;
          align-items: center;
          justify-content: center;

          color: white;

          text-align: center;
        }

        .sectionBox {
          padding:
            70px 38px 38px;
        }

        .sectionTitle {
          position: absolute;

          top: -32px;
          left: 50%;

          transform:
            translateX(-50%);

          min-width: 300px;
          min-height: 64px;

          display: flex;
          align-items: center;
          justify-content: center;

          padding:
            10px 25px;

          border:
            3px solid #174461;

          border-radius: 15px;

          color: #073b68;

          background:
            linear-gradient(
              #9bd9ff,
              #4e9ccc
            );

          box-shadow:
            0 5px 0 #17415c;

          font-size: 27px;
          font-weight: 700;

          z-index: 10;
        }

        .metalInner {
          padding: 28px;

          border:
            2px solid #4c5357;

          border-radius: 20px;

          background:
            linear-gradient(
              #ededed,
              #aaa
            );

          box-shadow:
            inset 6px 6px 9px
              rgba(255,255,255,.9),

            0 6px 0 #4a5054;
        }

        /* QIDIRUV */

        .searchWrapper {
          height: 72px;

          display: flex;
          align-items: center;

          overflow: hidden;

          border:
            2px solid #159bd3;

          border-radius: 15px;

          background: white;
        }

        .searchIcon {
          width: 65px;

          text-align: center;

          font-size: 25px;
        }

        .searchInput {
          flex: 1;

          height: 100%;

          border: none;
          outline: none;

          font-size: 21px;
        }

        .searchX {
          width: 65px;
          height: 100%;

          border: none;

          background:
            transparent;

          cursor: pointer;

          color: #a41414;

          font-size: 30px;
          font-weight: 700;
        }

        .searchResults {
          margin-top: 28px;
        }

        .searchResultCount {
          margin-bottom: 18px;

          padding: 12px;

          border:
            2px solid #3485ad;

          border-radius: 11px;

          background:
            #a8d9f2;

          text-align: center;

          color: #073b68;

          font-size: 18px;
          font-weight: 700;
        }

        .searchResultGrid {
          display: grid;

          grid-template-columns:
            repeat(3, 1fr);

          gap: 20px;
        }

        .searchResultCard {
          position: relative;

          padding:
            35px 22px 22px;

          text-align: center;

          border:
            2px solid #4d5559;

          border-radius: 16px;

          background:
            linear-gradient(
              #f5f5f5,
              #bbb
            );

          box-shadow:
            0 6px 0 #555d61;
        }

        .searchStatus {
          margin:
            12px 0;

          font-weight: 700;
        }

        /* CREATE */

        .createRow {
          display: grid;

          grid-template-columns:
            1fr 220px;

          gap: 18px;

          align-items: end;
        }

        .inputGroup label {
          display: block;

          margin-bottom: 9px;

          font-size: 18px;
          font-weight: 700;
        }

        .inputGroup input {
          width: 100%;
          height: 58px;

          padding:
            0 18px;

          border:
            2px solid #646b70;

          border-radius: 10px;
        }

        .blueButton {
          height: 58px;

          border:
            2px solid #174461;

          border-radius: 12px;

          background:
            linear-gradient(
              #9bd9ff,
              #5ba9d8
            );

          cursor: pointer;

          font-weight: 700;
        }

        /* 2 QATOR */

        .twoRowScroll {
          max-height: 435px;

          overflow-y: auto;

          padding-right: 8px;
        }

        .cardsGrid {
          display: grid;

          grid-template-columns:
            repeat(3, 1fr);

          gap: 22px;
        }

        .userCard,
        .requestCard,
        .approvedCard {
          position: relative;

          border:
            2px solid #4d5559;

          border-radius: 17px;

          background:
            linear-gradient(
              #f5f5f5,
              #b7b7b7
            );

          box-shadow:
            0 6px 0 #555d61;
        }

        .userCard {
          padding:
            28px 22px 20px;

          text-align: center;
        }

        .codeText {
          margin:
            7px 0;

          color: #064a79;

          font-size: 21px;
          font-weight: 700;
        }

        .statusBox {
          margin-top: 18px;

          padding: 10px;

          border:
            1px solid #999;

          border-radius: 9px;
        }

        .deleteX {
          position: absolute;

          top: 10px;
          right: 10px;

          width: 35px;
          height: 35px;

          border:
            2px solid #8e0000;

          border-radius: 50%;

          cursor: pointer;

          color: white;

          background:
            linear-gradient(
              #ff6262,
              #a90000
            );

          font-size: 25px;
          font-weight: 700;
        }

        .subHeader {
          margin-bottom: 22px;

          display: flex;

          justify-content:
            space-between;

          align-items: center;
        }

        .counter {
          width: 35px;
          height: 35px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          color: white;

          background:
            #c90e0e;
        }

        .requestList {
          display: grid;

          gap: 20px;
        }

        .requestCard,
        .approvedCard {
          min-height: 150px;

          padding: 25px;

          display: flex;

          justify-content:
            space-between;

          align-items: center;

          gap: 30px;
        }

        .actionButtons {
          display: flex;

          gap: 15px;
        }

        .approveButton,
        .rejectButton,
        .revokeButton {
          min-width: 145px;

          height: 50px;

          border-radius: 10px;

          cursor: pointer;

          font-weight: 700;
        }

        .approveButton {
          background:
            #7ee8a1;
        }

        .rejectButton {
          color: white;

          background:
            #cf2424;
        }

        .revokeButton {
          background:
            #e5ac22;
        }

        .approvedText {
          margin: 8px 0;

          color: #08772c;

          font-weight: 700;
        }

        .rejectedText {
          margin: 12px 0;

          color: #b51010;

          font-weight: 700;
        }

        .historyScroll {
          max-height: 390px;

          overflow-y: auto;

          display: grid;

          gap: 15px;
        }

        .historyItem {
          padding: 18px;

          display: flex;

          justify-content:
            space-between;

          border:
            1px solid #777;

          border-radius: 12px;

          background:
            rgba(
              255,
              255,
              255,
              .55
            );
        }

        .historyCode {
          color: #07517e;

          font-weight: 700;
        }

        .empty {
          min-height: 110px;

          display: flex;

          align-items: center;

          justify-content: center;

          text-align: center;
        }

        @media (
          max-width: 950px
        ) {

          .cardsGrid,
          .searchResultGrid {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .createRow {
            grid-template-columns:
              1fr;
          }
        }

        @media (
          max-width: 650px
        ) {

          .topPanel {
            flex-direction:
              column;
          }

          .cardsGrid,
          .searchResultGrid {
            grid-template-columns:
              1fr;
          }

          .requestCard,
          .approvedCard {
            flex-direction:
              column;
          }

          .actionButtons {
            flex-direction:
              column;
          }

        }

      `}</style>

    </main>
  );
}