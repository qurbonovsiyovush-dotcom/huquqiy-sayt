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

type ActiveSection =
  | "search"
  | "new-code"
  | "codes"
  | "requests"
  | "approved"
  | "rejected"
  | null;

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

  const [
    activeSection,
    setActiveSection,
  ] =
    useState<ActiveSection>(
      null
    );

  /* =========================================================
     JSON
  ========================================================= */

  async function readJson(
    response: Response
  ) {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  /* =========================================================
     KODLARNI YUKLASH
  ========================================================= */

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

  /* =========================================================
     SO‘ROVLARNI YUKLASH
  ========================================================= */

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

  /* =========================================================
     TARIXNI YUKLASH
  ========================================================= */

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

  /* =========================================================
     HAMMASINI YANGILASH
  ========================================================= */

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
  }, [
    refreshAll,
  ]);

  /* =========================================================
     YANGI KOD YARATISH
  ========================================================= */

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
            method:
              "POST",

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

      window.alert(
        "Maxsus kirish kodi yaratildi."
      );
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

  /* =========================================================
     QABUL / RAD
  ========================================================= */

  async function requestAction(
    id: string,
    action:
      | "approve"
      | "reject"
  ) {
    setWorkingId(
      id
    );

    try {
      const response =
        await fetch(
          "/api/admin/requests",
          {
            method:
              "POST",

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
    } catch (error) {
      console.error(
        "Request action error:",
        error
      );
    } finally {
      setWorkingId(
        null
      );
    }
  }

  /* =========================================================
     RUXSATNI BEKOR QILISH
  ========================================================= */

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

    setWorkingId(
      id
    );

    try {
      const response =
        await fetch(
          "/api/admin/requests",
          {
            method:
              "POST",

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
    } catch (error) {
      console.error(
        "Revoke error:",
        error
      );
    } finally {
      setWorkingId(
        null
      );
    }
  }

  /* =========================================================
     BUTUNLAY O‘CHIRISH
  ========================================================= */

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

    setWorkingId(
      id
    );

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
        (
          current
        ) =>
          current.filter(
            (
              item
            ) =>
              item.id !==
              id
          )
      );

      setRequests(
        (
          current
        ) =>
          current.filter(
            (
              item
            ) =>
              item.id !==
              id
          )
      );

      await refreshAll();
    } catch (error) {
      console.error(
        "Delete error:",
        error
      );
    } finally {
      setWorkingId(
        null
      );
    }
  }

  /* =========================================================
     LOGOUT
  ========================================================= */

  async function logout() {
    try {
      await fetch(
        "/api/logout",
        {
          method:
            "POST",
        }
      );
    } finally {
      router.replace(
        "/login"
      );

      router.refresh();
    }
  }

  /* =========================================================
     SEARCH
  ========================================================= */

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
    if (
      !searchText
    ) {
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
          (
            item
          ) =>
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
          (
            item
          ) =>
            item.approved ===
              true &&
            item.active !==
              false
        ),
      [
        filteredCodes,
      ]
    );

  const rejectedCodes =
    useMemo(
      () =>
        filteredCodes.filter(
          (
            item
          ) =>
            Boolean(
              item.rejectedAt
            )
        ),
      [
        filteredCodes,
      ]
    );

  /* =========================================================
     DATE
  ========================================================= */

  function formatDate(
    value?:
      | string
      | null
  ) {
    if (!value) {
      return "—";
    }

    const date =
      new Date(
        value
      );

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

  /* =========================================================
     BO‘LIMNI OCHISH
  ========================================================= */

  function openSection(
    section:
      ActiveSection
  ) {
    setActiveSection(
      section
    );

    window.setTimeout(
      () => {
        document
          .getElementById(
            "active-content"
          )
          ?.scrollIntoView({
            behavior:
              "smooth",

            block:
              "start",
          });
      },
      80
    );
  }

  function closeSection() {
    setActiveSection(
      null
    );

    window.setTimeout(
      () => {
        document
          .getElementById(
            "management"
          )
          ?.scrollIntoView({
            behavior:
              "smooth",

            block:
              "start",
          });
      },
      50
    );
  }

  /* =========================================================
     JSX
  ========================================================= */

  return (
    <main className="page">

      {/* =====================================================
          TOP HEADER
      ===================================================== */}

      <header className="topPanel">

        <button
          type="button"
          className="namePlate"
          onClick={() =>
            router.push("/")
          }
        >
          Qurbonov Siyovush Jamaliddinzoda
        </button>

        <div className="topButtons">

          <button
            type="button"
            className="topButton"
            onClick={() =>
              router.push(
                "/admin"
              )
            }
          >
            Admin panel
          </button>

          <button
            type="button"
            className="topButton"
            onClick={() =>
              router.push("/")
            }
          >
            Asosiy sahifa
          </button>

          <button
            type="button"
            className="exitButton"
            onClick={
              logout
            }
          >
            Chiqish
          </button>

        </div>

      </header>

      {/* =====================================================
          PAGE TITLE
      ===================================================== */}

      <section className="heroPanel">

        <div className="floatingTitle">
          Foydalanuvchilar
        </div>

        <h1>
          Foydalanuvchilar va kirish
          ruxsatlarini boshqarish
        </h1>

        <p>
          Kerakli boshqaruv bo‘limini
          tanlang.
        </p>

      </section>

      {/* =====================================================
          6 TA BOSHQARUV KARTASI
      ===================================================== */}

      <section
        className="managementPanel"
        id="management"
      >

        <div className="floatingTitle">
          Boshqaruv bo‘limlari
        </div>

        <div className="managementGrid">

          <div className="managementCard">

            <h2>
              Qidiruv
            </h2>

            <p>
              Ism yoki maxsus kod orqali
              foydalanuvchini topish.
            </p>

            <button
              type="button"
              className="openButton"
              onClick={() =>
                openSection(
                  "search"
                )
              }
            >
              Ochish
            </button>

          </div>

          <div className="managementCard">

            <h2>
              Yangi kirish kodi
            </h2>

            <p>
              Yangi foydalanuvchi uchun
              maxsus kirish kodi yaratish.
            </p>

            <button
              type="button"
              className="openButton"
              onClick={() =>
                openSection(
                  "new-code"
                )
              }
            >
              Ochish
            </button>

          </div>

          <div className="managementCard">

            <h2>
              Yaratilgan kodlar
            </h2>

            <p>
              Oldin yaratilgan barcha
              kirish kodlarini ko‘rish.
            </p>

            <button
              type="button"
              className="openButton"
              onClick={() =>
                openSection(
                  "codes"
                )
              }
            >
              Ochish
            </button>

          </div>

          <div className="managementCard">

            <h2>
              Kirish so‘rovlari
            </h2>

            <p>
              Kutilayotgan kirish
              so‘rovlarini boshqarish.
            </p>

            <button
              type="button"
              className="openButton"
              onClick={() =>
                openSection(
                  "requests"
                )
              }
            >
              Ochish
            </button>

          </div>

          <div className="managementCard">

            <h2>
              Ruxsat berilganlar
            </h2>

            <p>
              Saytga kirish ruxsati
              berilgan foydalanuvchilar.
            </p>

            <button
              type="button"
              className="openButton"
              onClick={() =>
                openSection(
                  "approved"
                )
              }
            >
              Ochish
            </button>

          </div>

          <div className="managementCard">

            <h2>
              Rad etilganlar
            </h2>

            <p>
              Kirish so‘rovi rad etilgan
              foydalanuvchilar.
            </p>

            <button
              type="button"
              className="openButton"
              onClick={() =>
                openSection(
                  "rejected"
                )
              }
            >
              Ochish
            </button>

          </div>

        </div>

      </section>

      {/* =====================================================
          ACTIVE CONTENT
      ===================================================== */}

      {activeSection && (

        <section
          className="contentPanel"
          id="active-content"
        >

          <button
            type="button"
            className="backButton"
            onClick={
              closeSection
            }
          >
            ← Boshqaruv bo‘limlariga qaytish
          </button>

          {/* =================================================
              QIDIRUV
          ================================================= */}

          {activeSection ===
            "search" && (

            <>

              <div className="contentTitle">
                Qidiruv
              </div>

              <div className="innerPanel">

                <div className="searchWrapper">

                  <input
                    type="text"
                    className="searchInput"
                    value={
                      search
                    }
                    onChange={(
                      e
                    ) =>
                      setSearch(
                        e.target.value
                      )
                    }
                    placeholder="Ism yoki maxsus kod bo‘yicha qidirish..."
                  />

                  {search && (

                    <button
                      type="button"
                      className="clearButton"
                      onClick={() =>
                        setSearch("")
                      }
                    >
                      ×
                    </button>

                  )}

                </div>

                {!search.trim() ? (

                  <div className="empty">
                    Qidirish uchun ism yoki
                    maxsus kod kiriting.
                  </div>

                ) : filteredCodes.length ===
                  0 ? (

                  <div className="empty">
                    Natija topilmadi.
                  </div>

                ) : (

                  <div className="userGrid">

                    {filteredCodes.map(
                      (
                        item
                      ) => (

                        <article
                          className="userCard"
                          key={
                            item.id
                          }
                        >

                          <button
                            type="button"
                            className="deleteButton"
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
                            {
                              item.name
                            }
                          </h3>

                          <div className="codeText">
                            {
                              item.code
                            }
                          </div>

                          <div className="statusText">

                            {item.approved &&
                            item.active !==
                              false
                              ? "Ruxsat berilgan"
                              : item.rejectedAt
                              ? "Rad etilgan"
                              : item.requestedAt
                              ? "Ruxsat kutilmoqda"
                              : "So‘rov yuborilmagan"}

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

            </>

          )}

          {/* =================================================
              YANGI KOD
          ================================================= */}

          {activeSection ===
            "new-code" && (

            <>

              <div className="contentTitle">
                Yangi kirish kodi
              </div>

              <div className="innerPanel">

                <div className="createArea">

                  <label>
                    Foydalanuvchi ismi
                  </label>

                  <input
                    type="text"
                    value={
                      name
                    }
                    onChange={(
                      e
                    ) =>
                      setName(
                        e.target.value
                      )
                    }
                    placeholder="Masalan: Ali Valiyev"
                  />

                  <button
                    type="button"
                    className="actionButton"
                    onClick={
                      createCode
                    }
                    disabled={
                      creating
                    }
                  >
                    {creating
                      ? "Yaratilmoqda..."
                      : "Maxsus kod yaratish"}
                  </button>

                </div>

              </div>

            </>

          )}

          {/* =================================================
              YARATILGAN KODLAR
          ================================================= */}

          {activeSection ===
            "codes" && (

            <>

              <div className="contentTitle">
                Yaratilgan kodlar
              </div>

              <div className="innerPanel">

                {loading ? (

                  <div className="empty">
                    Yuklanmoqda...
                  </div>

                ) : codes.length ===
                  0 ? (

                  <div className="empty">
                    Yaratilgan kod mavjud emas.
                  </div>

                ) : (

                  <div className="userGrid">

                    {codes.map(
                      (
                        item
                      ) => (

                        <article
                          className="userCard"
                          key={
                            item.id
                          }
                        >

                          <button
                            type="button"
                            className="deleteButton"
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
                            {
                              item.name
                            }
                          </h3>

                          <div className="codeText">
                            {
                              item.code
                            }
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

                {/* TARIX */}

                <div className="historyBox">

                  <h3>
                    So‘nggi tarix
                  </h3>

                  {history.length ===
                    0 ? (

                    <div className="empty">
                      Hozircha tarix mavjud emas.
                    </div>

                  ) : (

                    <div className="historyList">

                      {history.map(
                        (
                          item,
                          index
                        ) => (

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

              </div>

            </>

          )}

          {/* =================================================
              KIRISH SO‘ROVLARI
          ================================================= */}

          {activeSection ===
            "requests" && (

            <>

              <div className="contentTitle">
                Kirish so‘rovlari
              </div>

              <div className="innerPanel">

                {pendingRequests.length ===
                  0 ? (

                  <div className="empty">
                    Hozircha yangi kirish
                    so‘rovi yo‘q.
                  </div>

                ) : (

                  <div className="requestList">

                    {pendingRequests.map(
                      (
                        item
                      ) => (

                        <article
                          className="requestCard"
                          key={
                            item.id
                          }
                        >

                          <div>

                            <h3>
                              {
                                item.name
                              }
                            </h3>

                            <div className="codeText">
                              {
                                item.code
                              }
                            </div>

                            <small>
                              So‘rov:{" "}
                              {formatDate(
                                item.requestedAt
                              )}
                            </small>

                          </div>

                          <div className="requestButtons">

                            <button
                              type="button"
                              className="approveButton"
                              disabled={
                                workingId ===
                                item.id
                              }
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
                              type="button"
                              className="rejectButton"
                              disabled={
                                workingId ===
                                item.id
                              }
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

            </>

          )}

          {/* =================================================
              RUXSAT BERILGANLAR
          ================================================= */}

          {activeSection ===
            "approved" && (

            <>

              <div className="contentTitle">
                Ruxsat berilganlar
              </div>

              <div className="innerPanel">

                {approvedCodes.length ===
                  0 ? (

                  <div className="empty">
                    Ruxsat berilgan
                    foydalanuvchi yo‘q.
                  </div>

                ) : (

                  <div className="requestList">

                    {approvedCodes.map(
                      (
                        item
                      ) => (

                        <article
                          className="requestCard"
                          key={
                            item.id
                          }
                        >

                          <div>

                            <h3>
                              {
                                item.name
                              }
                            </h3>

                            <div className="codeText">
                              {
                                item.code
                              }
                            </div>

                            <div className="approvedStatus">
                              Ruxsat berilgan
                            </div>

                          </div>

                          <div className="requestButtons">

                            <button
                              type="button"
                              className="revokeButton"
                              disabled={
                                workingId ===
                                item.id
                              }
                              onClick={() =>
                                revokeAccess(
                                  item.id
                                )
                              }
                            >
                              Ruxsatni bekor qilish
                            </button>

                            <button
                              type="button"
                              className="deleteSecondary"
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
                              Butunlay o‘chirish
                            </button>

                          </div>

                        </article>

                      )
                    )}

                  </div>

                )}

              </div>

            </>

          )}

          {/* =================================================
              RAD ETILGANLAR
          ================================================= */}

          {activeSection ===
            "rejected" && (

            <>

              <div className="contentTitle">
                Rad etilganlar
              </div>

              <div className="innerPanel">

                {rejectedCodes.length ===
                  0 ? (

                  <div className="empty">
                    Rad etilgan
                    foydalanuvchi yo‘q.
                  </div>

                ) : (

                  <div className="userGrid">

                    {rejectedCodes.map(
                      (
                        item
                      ) => (

                        <article
                          className="userCard"
                          key={
                            item.id
                          }
                        >

                          <button
                            type="button"
                            className="deleteButton"
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
                            {
                              item.name
                            }
                          </h3>

                          <div className="codeText">
                            {
                              item.code
                            }
                          </div>

                          <div className="rejectedStatus">
                            Rad etilgan
                          </div>

                        </article>

                      )
                    )}

                  </div>

                )}

              </div>

            </>

          )}

        </section>

      )}

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
            16px 16px 80px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #f4f6f7 55%,
              #edf1f3 100%
            );

          font-family:
            "Bell MT",
            "Times New Roman",
            serif;

          color: #111;
        }

        button,
        input {
          font-family: inherit;
        }

        /* =====================================================
           HEADER
        ===================================================== */

        .topPanel {
          width: min(
            1580px,
            98%
          );

          min-height: 105px;

          margin: 0 auto;

          padding:
            18px 27px;

          display: flex;
          justify-content:
            space-between;
          align-items: center;

          gap: 25px;

          border:
            3px solid #173e58;

          border-radius: 24px;

          background:
            linear-gradient(
              180deg,
              #8bd5fb 0%,
              #57afdd 50%,
              #3b91bf 100%
            );

          box-shadow:
            inset 0 5px 5px
              rgba(
                255,
                255,
                255,
                .6
              ),

            0 7px 0
              #173c55,

            0 13px 20px
              rgba(
                0,
                0,
                0,
                .18
              );
        }

        .namePlate {
          min-height: 58px;

          padding:
            0 25px;

          border:
            3px solid #50585d;

          border-radius: 13px;

          color: #111;

          background:
            linear-gradient(
              180deg,
              #ffffff,
              #c8c8c8
            );

          box-shadow:
            inset 0 4px 4px
              white,

            0 5px 0
              #60686c;

          font-size: 21px;
          font-weight: 700;

          cursor: pointer;
        }

        .topButtons {
          display: flex;

          gap: 15px;
        }

        .topButton,
        .exitButton {
          min-width: 130px;

          min-height: 52px;

          padding:
            8px 20px;

          border-radius: 11px;

          font-weight: 700;

          cursor: pointer;
        }

        .topButton {
          border:
            2px solid #777;

          background:
            linear-gradient(
              #ffffff,
              #c8c8c8
            );

          box-shadow:
            0 4px 0 #666;
        }

        .exitButton {
          border:
            2px solid #174461;

          color: #ffffff;

          background:
            linear-gradient(
              #74c7ed,
              #348ab8
            );

          box-shadow:
            0 4px 0
              #174461;
        }

        /* =====================================================
           HERO
        ===================================================== */

        .heroPanel {
          position: relative;

          width:
            min(
              1030px,
              90%
            );

          min-height:
            180px;

          margin:
            85px auto 70px;

          padding:
            65px 35px 30px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          text-align: center;

          border:
            3px solid #303538;

          border-radius: 24px;

          background:
            linear-gradient(
              145deg,
              #666b6e,
              #3b4043
            );

          box-shadow:
            0 7px 0
              #272c2f,

            0 15px 24px
              rgba(
                0,
                0,
                0,
                .22
              );
        }

        .heroPanel h1 {
          margin: 0;

          color: white;

          font-size:
            clamp(
              28px,
              3vw,
              38px
            );

          text-shadow:
            0 2px 2px
              rgba(
                0,
                0,
                0,
                .4
              );
        }

        .heroPanel p {
          margin:
            14px 0 0;

          color: #e9eef1;

          font-size: 17px;
        }

        .floatingTitle {
          position: absolute;

          top: -31px;
          left: 50%;

          transform:
            translateX(-50%);

          min-width: 260px;

          min-height: 62px;

          padding:
            10px 25px;

          display: flex;
          align-items: center;
          justify-content: center;

          border:
            3px solid #174461;

          border-radius: 14px;

          color: #073b68;

          background:
            linear-gradient(
              #9edcff,
              #4c9bc9
            );

          box-shadow:
            inset 0 4px 4px
              rgba(
                255,
                255,
                255,
                .55
              ),

            0 5px 0
              #17415c;

          font-size: 26px;

          font-weight: 700;

          white-space: nowrap;
        }

        /* =====================================================
           MANAGEMENT
        ===================================================== */

        .managementPanel {
          position: relative;

          width:
            min(
              1100px,
              92%
            );

          margin:
            0 auto;

          padding:
            65px 28px 32px;

          scroll-margin-top: 30px;

          border:
            3px solid #303538;

          border-radius: 25px;

          background:
            linear-gradient(
              145deg,
              #686d70,
              #3d4245
            );

          box-shadow:
            0 8px 0
              #292e31,

            0 17px 28px
              rgba(
                0,
                0,
                0,
                .22
              );
        }

        .managementGrid {
          display: grid;

          grid-template-columns:
            repeat(
              3,
              minmax(
                0,
                1fr
              )
            );

          gap: 24px;
        }

        .managementCard {
          min-height: 220px;

          padding:
            25px 20px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          text-align: center;

          border:
            3px solid
              #565e62;

          border-radius: 17px;

          background:
            linear-gradient(
              145deg,
              #f7f7f7 0%,
              #e0e0e0 45%,
              #bdbdbd 100%
            );

          box-shadow:
            inset 0 7px 7px
              rgba(
                255,
                255,
                255,
                .95
              ),

            0 7px 0
              #555d61,

            0 12px 17px
              rgba(
                0,
                0,
                0,
                .22
              );

          transition:
            transform .15s ease;
        }

        .managementCard:hover {
          transform:
            translateY(-4px);
        }

        .managementCard h2 {
          margin:
            0 0 12px;

          font-size: 24px;
        }

        .managementCard p {
          flex: 1;

          margin:
            0 0 20px;

          max-width: 270px;

          color: #4b4b4b;

          font-size: 15px;

          line-height: 1.45;
        }

        .openButton,
        .actionButton {
          min-width: 145px;

          min-height: 50px;

          padding:
            8px 20px;

          border:
            3px solid #174461;

          border-radius: 10px;

          color: #073b68;

          background:
            linear-gradient(
              #9edcff,
              #55a8d8
            );

          box-shadow:
            inset 0 4px 4px
              rgba(
                255,
                255,
                255,
                .55
              ),

            0 4px 0
              #17415c;

          font-size: 16px;

          font-weight: 700;

          cursor: pointer;
        }

        /* =====================================================
           ACTIVE SECTION
        ===================================================== */

        .contentPanel {
          position: relative;

          width:
            min(
              1100px,
              92%
            );

          margin:
            75px auto 0;

          padding:
            80px 35px 40px;

          scroll-margin-top: 25px;

          border:
            3px solid #303538;

          border-radius: 25px;

          background:
            linear-gradient(
              145deg,
              #686d70,
              #3d4245
            );

          box-shadow:
            0 8px 0
              #292e31,

            0 17px 28px
              rgba(
                0,
                0,
                0,
                .22
              );
        }

        .contentTitle {
          position: absolute;

          top: -31px;
          left: 50%;

          transform:
            translateX(-50%);

          min-width: 280px;

          min-height: 62px;

          padding:
            10px 25px;

          display: flex;
          align-items: center;
          justify-content: center;

          border:
            3px solid
              #174461;

          border-radius: 14px;

          color: #073b68;

          background:
            linear-gradient(
              #9edcff,
              #4c9bc9
            );

          box-shadow:
            0 5px 0
              #17415c;

          font-size: 25px;

          font-weight: 700;

          text-align: center;
        }

        .backButton {
          display: block;

          margin:
            0 auto 30px;

          min-height: 48px;

          padding:
            9px 22px;

          border:
            2px solid #60686c;

          border-radius: 10px;

          color: #173d55;

          background:
            linear-gradient(
              #ffffff,
              #c9c9c9
            );

          box-shadow:
            0 4px 0 #596166;

          font-weight: 700;

          cursor: pointer;
        }

        .innerPanel {
          padding: 28px;

          border:
            3px solid
              #5a6266;

          border-radius: 18px;

          background:
            linear-gradient(
              145deg,
              #f4f4f4,
              #c3c3c3
            );

          box-shadow:
            inset 0 6px 7px
              rgba(
                255,
                255,
                255,
                .85
              ),

            0 6px 0
              #555d61;
        }

        /* =====================================================
           SEARCH
        ===================================================== */

        .searchWrapper {
          min-height: 65px;

          display: flex;

          border:
            2px solid #328dbb;

          border-radius: 12px;

          overflow: hidden;

          background: white;
        }

        .searchInput {
          flex: 1;

          min-width: 0;

          padding:
            0 20px;

          border: none;

          outline: none;

          font-size: 19px;
        }

        .clearButton {
          width: 60px;

          border: none;

          color: #a41414;

          background:
            transparent;

          font-size: 29px;

          cursor: pointer;
        }

        /* =====================================================
           CREATE
        ===================================================== */

        .createArea {
          max-width: 700px;

          margin: 0 auto;

          display: flex;
          flex-direction: column;

          gap: 16px;
        }

        .createArea label {
          font-size: 19px;

          font-weight: 700;
        }

        .createArea input {
          width: 100%;

          min-height: 58px;

          padding:
            0 18px;

          border:
            2px solid #676f73;

          border-radius: 10px;

          font-size: 18px;
        }

        .createArea .actionButton {
          align-self: center;

          min-width: 220px;
        }

        /* =====================================================
           USER CARDS
        ===================================================== */

        .userGrid {
          margin-top: 25px;

          display: grid;

          grid-template-columns:
            repeat(
              3,
              minmax(
                0,
                1fr
              )
            );

          gap: 20px;
        }

        .userCard {
          position: relative;

          min-height: 180px;

          padding:
            28px 20px;

          text-align: center;

          border:
            2px solid #51595d;

          border-radius: 15px;

          background:
            linear-gradient(
              #f7f7f7,
              #c3c3c3
            );

          box-shadow:
            0 5px 0 #555d61;
        }

        .userCard h3,
        .requestCard h3 {
          margin:
            0 0 10px;

          font-size: 22px;
        }

        .codeText {
          margin:
            7px 0;

          color: #07517e;

          font-size: 20px;

          font-weight: 700;
        }

        .statusText {
          margin:
            12px 0;

          font-weight: 700;
        }

        .deleteButton {
          position: absolute;

          top: 9px;
          right: 9px;

          width: 34px;
          height: 34px;

          border:
            2px solid #8f1616;

          border-radius: 50%;

          color: white;

          background:
            linear-gradient(
              #f26565,
              #ad1111
            );

          font-size: 23px;

          font-weight: 700;

          cursor: pointer;
        }

        /* =====================================================
           REQUEST LIST
        ===================================================== */

        .requestList {
          display: grid;

          gap: 20px;
        }

        .requestCard {
          min-height: 145px;

          padding: 24px;

          display: flex;

          align-items: center;
          justify-content:
            space-between;

          gap: 25px;

          border:
            2px solid #51595d;

          border-radius: 15px;

          background:
            linear-gradient(
              #f7f7f7,
              #c3c3c3
            );

          box-shadow:
            0 5px 0 #555d61;
        }

        .requestButtons {
          display: flex;

          flex-wrap: wrap;

          gap: 12px;
        }

        .approveButton,
        .rejectButton,
        .revokeButton,
        .deleteSecondary {
          min-height: 48px;

          padding:
            8px 18px;

          border-radius: 9px;

          font-weight: 700;

          cursor: pointer;
        }

        .approveButton {
          border:
            2px solid #307544;

          background:
            linear-gradient(
              #a9e9ba,
              #73c58b
            );
        }

        .rejectButton,
        .deleteSecondary {
          border:
            2px solid #902020;

          color: white;

          background:
            linear-gradient(
              #ef6666,
              #b41f1f
            );
        }

        .revokeButton {
          border:
            2px solid #8d701d;

          background:
            linear-gradient(
              #f3d779,
              #d5ac32
            );
        }

        .approvedStatus {
          margin:
            10px 0;

          color: #167237;

          font-weight: 700;
        }

        .rejectedStatus {
          margin:
            10px 0;

          color: #a41717;

          font-weight: 700;
        }

        /* =====================================================
           HISTORY
        ===================================================== */

        .historyBox {
          margin-top: 35px;

          padding-top: 25px;

          border-top:
            2px solid #858585;
        }

        .historyBox > h3 {
          margin:
            0 0 18px;

          text-align: center;

          color: #173d55;

          font-size: 23px;
        }

        .historyList {
          max-height: 330px;

          overflow-y: auto;

          display: grid;

          gap: 12px;
        }

        .historyItem {
          padding: 15px;

          display: flex;

          justify-content:
            space-between;

          gap: 20px;

          border:
            1px solid #838383;

          border-radius: 10px;

          background:
            rgba(
              255,
              255,
              255,
              .55
            );
        }

        .historyItem p {
          margin:
            5px 0 0;
        }

        /* =====================================================
           EMPTY
        ===================================================== */

        .empty {
          min-height: 110px;

          padding: 20px;

          display: flex;

          align-items: center;
          justify-content: center;

          text-align: center;

          color: #555;

          font-size: 18px;
        }

        /* =====================================================
           RESPONSIVE
        ===================================================== */

        @media (
          max-width: 950px
        ) {

          .managementGrid,
          .userGrid {
            grid-template-columns:
              repeat(
                2,
                1fr
              );
          }

          .topPanel {
            flex-direction:
              column;
          }

        }

        @media (
          max-width: 650px
        ) {

          .page {
            padding:
              10px 8px 50px;
          }

          .topPanel {
            width: 100%;
          }

          .namePlate {
            width: 100%;
          }

          .topButtons {
            width: 100%;

            flex-direction:
              column;
          }

          .topButton,
          .exitButton {
            width: 100%;
          }

          .heroPanel,
          .managementPanel,
          .contentPanel {
            width: 100%;
          }

          .managementGrid,
          .userGrid {
            grid-template-columns:
              1fr;
          }

          .requestCard {
            flex-direction:
              column;

            align-items:
              stretch;
          }

          .requestButtons {
            flex-direction:
              column;
          }

          .floatingTitle,
          .contentTitle {
            min-width: 210px;

            max-width: 90%;

            white-space: normal;
          }

        }

      `}</style>

    </main>
  );
}
