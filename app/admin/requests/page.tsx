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
  code: string;
  name: string;

  active: boolean;
  approved: boolean;

  requestedAt: string | null;
  createdAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
};

type ActiveSection =
  | "dashboard"
  | "new-code"
  | "pending"
  | "approved"
  | "all"
  | "blocked";

/* =========================================================
   PAGE
========================================================= */

export default function AdminRequestsPage() {
  const router = useRouter();

  const [users, setUsers] =
    useState<AccessCode[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [creating, setCreating] =
    useState(false);

  const [workingId, setWorkingId] =
    useState<string | null>(null);

  const [name, setName] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [
    activeSection,
    setActiveSection,
  ] =
    useState<ActiveSection>(
      "dashboard"
    );

  const [
    lastCreatedCode,
    setLastCreatedCode,
  ] =
    useState("");

  const [
    lastCreatedName,
    setLastCreatedName,
  ] =
    useState("");

  const [
    copiedCode,
    setCopiedCode,
  ] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [
    messageType,
    setMessageType,
  ] =
    useState<
      "success" | "error" | ""
    >("");

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
     MESSAGE
  ========================================================= */

  function showMessage(
    text: string,
    type:
      | "success"
      | "error" = "success"
  ) {
    setMessage(text);
    setMessageType(type);

    window.setTimeout(() => {
      setMessage("");
      setMessageType("");
    }, 4000);
  }

  /* =========================================================
     FOYDALANUVCHILARNI YUKLASH
  ========================================================= */

  const loadUsers =
    useCallback(
      async (
        silent = false
      ) => {
        if (!silent) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        try {
          const response =
            await fetch(
              "/api/admin/access-codes",
              {
                method: "GET",
                cache: "no-store",
              }
            );

          const data =
            await readJson(
              response
            );

          if (
            !response.ok ||
            data?.success !== true
          ) {
            setUsers([]);

            showMessage(
              data?.message ||
                "Foydalanuvchilarni yuklab bo‘lmadi.",
              "error"
            );

            return;
          }

          setUsers(
            Array.isArray(
              data.users
            )
              ? data.users
              : []
          );
        } catch (error) {
          console.error(
            "ACCESS USERS LOAD ERROR:",
            error
          );

          showMessage(
            "Server bilan bog‘lanishda xatolik yuz berdi.",
            "error"
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  /* =========================================================
     YANGI KOD YARATISH
  ========================================================= */

  async function createCode() {
    const cleanName =
      name
        .replace(/\s+/g, " ")
        .trim();

    if (!cleanName) {
      showMessage(
        "Foydalanuvchi ism-familiyasini kiriting.",
        "error"
      );

      return;
    }

    setCreating(true);

    try {
      const response =
        await fetch(
          "/api/admin/access-codes",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action: "create",
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
        data?.success !== true
      ) {
        showMessage(
          data?.message ||
            "Maxsus kirish kodi yaratilmadi.",
          "error"
        );

        return;
      }

      const newCode =
        String(
          data?.code ||
            data?.user?.code ||
            ""
        );

      setLastCreatedCode(
        newCode
      );

      setLastCreatedName(
        cleanName
      );

      setName("");

      await loadUsers(true);

      showMessage(
        "Yangi kirish kodi yaratildi."
      );
    } catch (error) {
      console.error(
        "CREATE ACCESS CODE ERROR:",
        error
      );

      showMessage(
        "Kod yaratishda server xatosi yuz berdi.",
        "error"
      );
    } finally {
      setCreating(false);
    }
  }

  /* =========================================================
     ACTION
  ========================================================= */

  async function runAction(
    id: string,
    action:
      | "approve"
      | "reject"
      | "restore"
      | "deactivate"
      | "delete"
  ) {
    let confirmation = "";

    if (
      action === "approve"
    ) {
      confirmation =
        "Ushbu foydalanuvchiga saytga kirish ruxsatini berasizmi?";
    }

    if (
      action === "reject"
    ) {
      confirmation =
        "Ushbu kirish so‘rovini rad etasizmi?";
    }

    if (
      action === "restore"
    ) {
      confirmation =
        "Ushbu kodni qayta faollashtirasizmi?\n\nFoydalanuvchi kodni qayta ishlatganda yana ruxsat so‘rovi yuboradi.";
    }

    if (
      action ===
      "deactivate"
    ) {
      confirmation =
        "Ushbu foydalanuvchining kirish huquqini bloklaysizmi?";
    }

    if (
      action === "delete"
    ) {
      confirmation =
        "DIQQAT!\n\nUshbu foydalanuvchi va kirish kodi butunlay o‘chiriladi.\n\nEski kod bilan boshqa kirib bo‘lmaydi.\n\nDavom etasizmi?";
    }

    if (
      confirmation &&
      !window.confirm(
        confirmation
      )
    ) {
      return;
    }

    setWorkingId(id);

    try {
      const response =
        await fetch(
          "/api/admin/access-codes",
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
        data?.success !== true
      ) {
        showMessage(
          data?.message ||
            "Amal bajarilmadi.",
          "error"
        );

        return;
      }

      await loadUsers(true);

      showMessage(
        data?.message ||
          "Amal muvaffaqiyatli bajarildi."
      );
    } catch (error) {
      console.error(
        "ACCESS CODE ACTION ERROR:",
        error
      );

      showMessage(
        "Server bilan bog‘lanishda xatolik yuz berdi.",
        "error"
      );
    } finally {
      setWorkingId(null);
    }
  }

  /* =========================================================
     COPY
  ========================================================= */

  async function copyCode(
    code: string
  ) {
    try {
      await navigator.clipboard.writeText(
        code
      );

      setCopiedCode(code);

      window.setTimeout(
        () => {
          setCopiedCode("");
        },
        1800
      );
    } catch {
      window.prompt(
        "Kodni nusxalang:",
        code
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
          method: "POST",
        }
      );
    } catch (error) {
      console.error(
        "LOGOUT ERROR:",
        error
      );
    } finally {
      sessionStorage.removeItem(
        "qurbonov-session"
      );

      sessionStorage.removeItem(
        "qurbonov-role"
      );

      router.replace("/");
      router.refresh();
    }
  }

  /* =========================================================
     STATUS
  ========================================================= */

  function getStatus(
    user: AccessCode
  ) {
    if (!user.active) {
      return {
        key: "blocked",
        text:
          "Bloklangan / rad etilgan",
      };
    }

    if (user.approved) {
      return {
        key: "approved",
        text:
          "Ruxsat berilgan",
      };
    }

    if (user.requestedAt) {
      return {
        key: "pending",
        text:
          "Ruxsat kutilmoqda",
      };
    }

    return {
      key: "unused",
      text:
        "Kod hali ishlatilmagan",
    };
  }

  /* =========================================================
     STATISTICS
  ========================================================= */

  const statistics =
    useMemo(() => {
      const pending =
        users.filter(
          (item) =>
            item.active &&
            !item.approved &&
            Boolean(
              item.requestedAt
            )
        ).length;

      const approved =
        users.filter(
          (item) =>
            item.active &&
            item.approved
        ).length;

      const blocked =
        users.filter(
          (item) =>
            !item.active
        ).length;

      const unused =
        users.filter(
          (item) =>
            item.active &&
            !item.approved &&
            !item.requestedAt
        ).length;

      return {
        total:
          users.length,
        pending,
        approved,
        blocked,
        unused,
      };
    }, [users]);

  /* =========================================================
     SEARCH
  ========================================================= */

  const searchText =
    search
      .trim()
      .toLowerCase();

  const searchedUsers =
    useMemo(() => {
      if (!searchText) {
        return users;
      }

      return users.filter(
        (item) =>
          item.name
            .toLowerCase()
            .includes(
              searchText
            ) ||
          item.code
            .toLowerCase()
            .includes(
              searchText
            )
      );
    }, [
      users,
      searchText,
    ]);

  const pendingUsers =
    useMemo(
      () =>
        searchedUsers.filter(
          (item) =>
            item.active &&
            !item.approved &&
            Boolean(
              item.requestedAt
            )
        ),
      [searchedUsers]
    );

  const approvedUsers =
    useMemo(
      () =>
        searchedUsers.filter(
          (item) =>
            item.active &&
            item.approved
        ),
      [searchedUsers]
    );

  const blockedUsers =
    useMemo(
      () =>
        searchedUsers.filter(
          (item) =>
            !item.active
        ),
      [searchedUsers]
    );

  /* =========================================================
     DATE
  ========================================================= */

  function formatDate(
    value:
      | string
      | null
      | undefined
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
      "uz-UZ",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  /* =========================================================
     CARD
  ========================================================= */

  function renderUserCard(
    user: AccessCode
  ) {
    const status =
      getStatus(user);

    const working =
      workingId ===
      user.id;

    return (
      <article
        className="userCard"
        key={user.id}
      >
        <div className="userTop">
          <div>
            <h3>
              {user.name}
            </h3>

            <div
              className={`statusBadge ${status.key}`}
            >
              {status.text}
            </div>
          </div>
        </div>

        <div className="codeBox">
          <span>
            Maxsus kod
          </span>

          <strong>
            {user.code}
          </strong>

          <button
            type="button"
            className="copyButton"
            onClick={() =>
              copyCode(
                user.code
              )
            }
          >
            {copiedCode ===
            user.code
              ? "Nusxalandi ✓"
              : "Nusxalash"}
          </button>
        </div>

        <div className="dateGrid">
          <div>
            <span>
              Yaratilgan
            </span>

            <strong>
              {formatDate(
                user.createdAt
              )}
            </strong>
          </div>

          <div>
            <span>
              So‘rov
            </span>

            <strong>
              {formatDate(
                user.requestedAt
              )}
            </strong>
          </div>

          <div>
            <span>
              Tasdiqlangan
            </span>

            <strong>
              {formatDate(
                user.approvedAt
              )}
            </strong>
          </div>
        </div>

        <div className="userActions">
          {status.key ===
            "pending" && (
            <>
              <button
                type="button"
                className="approveButton"
                disabled={
                  working
                }
                onClick={() =>
                  runAction(
                    user.id,
                    "approve"
                  )
                }
              >
                {working
                  ? "Kutilmoqda..."
                  : "Ruxsat berish"}
              </button>

              <button
                type="button"
                className="rejectButton"
                disabled={
                  working
                }
                onClick={() =>
                  runAction(
                    user.id,
                    "reject"
                  )
                }
              >
                Rad etish
              </button>
            </>
          )}

          {status.key ===
            "approved" && (
            <button
              type="button"
              className="blockButton"
              disabled={
                working
              }
              onClick={() =>
                runAction(
                  user.id,
                  "deactivate"
                )
              }
            >
              Kirishni bloklash
            </button>
          )}

          {status.key ===
            "unused" && (
            <button
              type="button"
              className="blockButton"
              disabled={
                working
              }
              onClick={() =>
                runAction(
                  user.id,
                  "deactivate"
                )
              }
            >
              Kodni bloklash
            </button>
          )}

          {status.key ===
            "blocked" && (
            <button
              type="button"
              className="restoreButton"
              disabled={
                working
              }
              onClick={() =>
                runAction(
                  user.id,
                  "restore"
                )
              }
            >
              Qayta faollashtirish
            </button>
          )}

          <button
            type="button"
            className="deleteButton"
            disabled={
              working
            }
            onClick={() =>
              runAction(
                user.id,
                "delete"
              )
            }
          >
            Butunlay o‘chirish
          </button>
        </div>
      </article>
    );
  }

  /* =========================================================
     USER LIST
  ========================================================= */

  function renderUserList(
    list: AccessCode[],
    emptyText: string
  ) {
    if (loading) {
      return (
        <div className="emptyBox">
          Yuklanmoqda...
        </div>
      );
    }

    if (
      list.length === 0
    ) {
      return (
        <div className="emptyBox">
          {emptyText}
        </div>
      );
    }

    return (
      <div className="usersGrid">
        {list.map(
          renderUserCard
        )}
      </div>
    );
  }

  /* =========================================================
     JSX
  ========================================================= */

  return (
    <main className="page">
      {/* ================================================
          HEADER
      ================================================= */}

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
              router.push(
                "/admin/tests"
              )
            }
          >
            Testlar
          </button>

          <button
            type="button"
            className="topButton"
            disabled={
              refreshing
            }
            onClick={() =>
              loadUsers(true)
            }
          >
            {refreshing
              ? "Yangilanmoqda..."
              : "Yangilash"}
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

      {/* ================================================
          MESSAGE
      ================================================= */}

      {message && (
        <div
          className={`messageBox ${
            messageType ===
            "error"
              ? "messageError"
              : "messageSuccess"
          }`}
        >
          {message}
        </div>
      )}

      {/* ================================================
          HERO
      ================================================= */}

      <section className="heroPanel">
        <div className="floatingTitle">
          Foydalanuvchilar
        </div>

        <h1>
          Kirish kodlari va
          foydalanuvchilarni
          boshqarish
        </h1>

        <p>
          Kod yaratish, ruxsat
          berish, bloklash va
          o‘chirish Neon bazasi
          orqali boshqariladi.
        </p>
      </section>

      {/* ================================================
          STATISTICS
      ================================================= */}

      <section className="statistics">
        <button
          type="button"
          className="statCard"
          onClick={() =>
            setActiveSection(
              "all"
            )
          }
        >
          <strong>
            {statistics.total}
          </strong>

          <span>
            Jami kodlar
          </span>
        </button>

        <button
          type="button"
          className="statCard pendingStat"
          onClick={() =>
            setActiveSection(
              "pending"
            )
          }
        >
          <strong>
            {statistics.pending}
          </strong>

          <span>
            So‘rov kutmoqda
          </span>
        </button>

        <button
          type="button"
          className="statCard approvedStat"
          onClick={() =>
            setActiveSection(
              "approved"
            )
          }
        >
          <strong>
            {statistics.approved}
          </strong>

          <span>
            Ruxsat berilgan
          </span>
        </button>

        <button
          type="button"
          className="statCard unusedStat"
          onClick={() =>
            setActiveSection(
              "all"
            )
          }
        >
          <strong>
            {statistics.unused}
          </strong>

          <span>
            Ishlatilmagan kod
          </span>
        </button>

        <button
          type="button"
          className="statCard blockedStat"
          onClick={() =>
            setActiveSection(
              "blocked"
            )
          }
        >
          <strong>
            {statistics.blocked}
          </strong>

          <span>
            Bloklangan
          </span>
        </button>
      </section>

      {/* ================================================
          MANAGEMENT
      ================================================= */}

      <section className="managementPanel">
        <div className="floatingTitle">
          Boshqaruv
        </div>

        <div className="managementGrid">
          <button
            type="button"
            className="managementCard createManagement"
            onClick={() =>
              setActiveSection(
                "new-code"
              )
            }
          >
            <span className="managementIcon">
              +
            </span>

            <strong>
              Yangi kirish kodi
            </strong>

            <small>
              Yangi foydalanuvchi
              uchun maxsus kod
              yarating.
            </small>
          </button>

          <button
            type="button"
            className="managementCard"
            onClick={() =>
              setActiveSection(
                "pending"
              )
            }
          >
            <span className="managementNumber">
              {statistics.pending}
            </span>

            <strong>
              Kirish so‘rovlari
            </strong>

            <small>
              Ruxsat kutayotgan
              foydalanuvchilar.
            </small>
          </button>

          <button
            type="button"
            className="managementCard"
            onClick={() =>
              setActiveSection(
                "approved"
              )
            }
          >
            <span className="managementNumber">
              {statistics.approved}
            </span>

            <strong>
              Ruxsat berilganlar
            </strong>

            <small>
              Saytga kirishi
              tasdiqlangan
              foydalanuvchilar.
            </small>
          </button>

          <button
            type="button"
            className="managementCard"
            onClick={() =>
              setActiveSection(
                "all"
              )
            }
          >
            <span className="managementNumber">
              {statistics.total}
            </span>

            <strong>
              Barcha kodlar
            </strong>

            <small>
              Barcha yaratilgan
              kodlarni boshqaring.
            </small>
          </button>

          <button
            type="button"
            className="managementCard"
            onClick={() =>
              setActiveSection(
                "blocked"
              )
            }
          >
            <span className="managementNumber">
              {statistics.blocked}
            </span>

            <strong>
              Bloklanganlar
            </strong>

            <small>
              Rad etilgan yoki
              bloklangan kodlar.
            </small>
          </button>
        </div>
      </section>

      {/* ================================================
          CONTENT
      ================================================= */}

      <section className="contentPanel">
        {/* ==============================================
            DASHBOARD
        =============================================== */}

        {activeSection ===
          "dashboard" && (
          <>
            <div className="contentTitle">
              Boshqaruv
            </div>

            <div className="innerPanel">
              <div className="dashboardWelcome">
                <h2>
                  Foydalanuvchilar
                  boshqaruvi
                </h2>

                <p>
                  Yuqoridagi
                  bo‘limlardan birini
                  tanlang.
                </p>
              </div>
            </div>
          </>
        )}

        {/* ==============================================
            NEW CODE
        =============================================== */}

        {activeSection ===
          "new-code" && (
          <>
            <div className="contentTitle">
              Yangi kirish kodi
            </div>

            <div className="innerPanel">
              <div className="createArea">
                <label
                  htmlFor="new-user-name"
                >
                  Foydalanuvchi
                  ism-familiyasi
                </label>

                <input
                  id="new-user-name"
                  type="text"
                  value={name}
                  disabled={
                    creating
                  }
                  placeholder="Masalan: Ali Valiyev"
                  onChange={(e) =>
                    setName(
                      e.target.value
                    )
                  }
                  onKeyDown={(
                    e
                  ) => {
                    if (
                      e.key ===
                      "Enter"
                    ) {
                      createCode();
                    }
                  }}
                />

                <button
                  type="button"
                  className="createButton"
                  disabled={
                    creating
                  }
                  onClick={
                    createCode
                  }
                >
                  {creating
                    ? "KOD YARATILMOQDA..."
                    : "KOD YARATISH"}
                </button>

                {lastCreatedCode && (
                  <div className="createdResult">
                    <span>
                      Yangi kod
                    </span>

                    <h3>
                      {
                        lastCreatedName
                      }
                    </h3>

                    <strong>
                      {
                        lastCreatedCode
                      }
                    </strong>

                    <button
                      type="button"
                      onClick={() =>
                        copyCode(
                          lastCreatedCode
                        )
                      }
                    >
                      {copiedCode ===
                      lastCreatedCode
                        ? "Nusxalandi ✓"
                        : "KODNI NUSXALASH"}
                    </button>

                    <small>
                      Ushbu kodni
                      foydalanuvchiga
                      yuboring. U kodni
                      birinchi marta
                      ishlatganda kirish
                      so‘rovi sizga keladi.
                    </small>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ==============================================
            PENDING
        =============================================== */}

        {activeSection ===
          "pending" && (
          <>
            <div className="contentTitle">
              Kirish so‘rovlari
            </div>

            <div className="innerPanel">
              <SearchBox
                search={search}
                setSearch={
                  setSearch
                }
              />

              {renderUserList(
                pendingUsers,
                "Hozircha yangi kirish so‘rovi yo‘q."
              )}
            </div>
          </>
        )}

        {/* ==============================================
            APPROVED
        =============================================== */}

        {activeSection ===
          "approved" && (
          <>
            <div className="contentTitle">
              Ruxsat berilganlar
            </div>

            <div className="innerPanel">
              <SearchBox
                search={search}
                setSearch={
                  setSearch
                }
              />

              {renderUserList(
                approvedUsers,
                "Ruxsat berilgan foydalanuvchi yo‘q."
              )}
            </div>
          </>
        )}

        {/* ==============================================
            ALL
        =============================================== */}

        {activeSection ===
          "all" && (
          <>
            <div className="contentTitle">
              Barcha kirish kodlari
            </div>

            <div className="innerPanel">
              <SearchBox
                search={search}
                setSearch={
                  setSearch
                }
              />

              {renderUserList(
                searchedUsers,
                "Kirish kodi mavjud emas."
              )}
            </div>
          </>
        )}

        {/* ==============================================
            BLOCKED
        =============================================== */}

        {activeSection ===
          "blocked" && (
          <>
            <div className="contentTitle">
              Bloklanganlar
            </div>

            <div className="innerPanel">
              <SearchBox
                search={search}
                setSearch={
                  setSearch
                }
              />

              {renderUserList(
                blockedUsers,
                "Bloklangan foydalanuvchi yo‘q."
              )}
            </div>
          </>
        )}
      </section>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          padding: 16px 16px 80px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #f5f7f8 55%,
              #edf1f3 100%
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
          cursor: not-allowed;
        }

        /* ===========================================
           HEADER
        =========================================== */

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

          gap: 22px;

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
                0.6
              ),
            0 7px 0 #173c55,
            0 13px 20px
              rgba(
                0,
                0,
                0,
                0.18
              );
        }

        .namePlate {
          min-height: 58px;

          padding: 0 25px;

          border:
            3px solid #50585d;

          border-radius: 13px;

          color: #111;

          background:
            linear-gradient(
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
        }

        .topButtons {
          display: flex;

          flex-wrap: wrap;

          justify-content:
            flex-end;

          gap: 12px;
        }

        .topButton,
        .exitButton {
          min-height: 50px;

          padding:
            8px 18px;

          border-radius: 10px;

          font-weight: 700;
        }

        .topButton {
          border:
            2px solid #666;

          background:
            linear-gradient(
              #ffffff,
              #c8c8c8
            );

          box-shadow:
            0 4px 0 #666;
        }

        .exitButton {
          min-width: 110px;

          border:
            2px solid #8a1717;

          color: white;

          background:
            linear-gradient(
              #ef6666,
              #b42121
            );

          box-shadow:
            0 4px 0 #7d1717;
        }

        /* ===========================================
           MESSAGE
        =========================================== */

        .messageBox {
          position: fixed;

          z-index: 1000;

          top: 25px;
          left: 50%;

          transform:
            translateX(-50%);

          width:
            min(
              650px,
              92%
            );

          padding:
            15px 20px;

          border-radius: 12px;

          text-align: center;

          font-size: 17px;
          font-weight: 700;

          box-shadow:
            0 7px 20px
              rgba(
                0,
                0,
                0,
                0.25
              );
        }

        .messageSuccess {
          border:
            2px solid #277447;

          color: #14552f;

          background: #d9f1df;
        }

        .messageError {
          border:
            2px solid #922020;

          color: #801919;

          background: #f5dada;
        }

        /* ===========================================
           HERO
        =========================================== */

        .heroPanel,
        .managementPanel,
        .contentPanel {
          position: relative;

          border:
            3px solid #303538;

          background:
            linear-gradient(
              145deg,
              #686d70,
              #3d4245
            );

          box-shadow:
            0 8px 0 #292e31,
            0 17px 28px
              rgba(
                0,
                0,
                0,
                0.22
              );
        }

        .heroPanel {
          width:
            min(
              1050px,
              92%
            );

          min-height: 185px;

          margin:
            85px auto 50px;

          padding:
            65px 35px 30px;

          border-radius: 24px;

          text-align: center;
        }

        .heroPanel h1 {
          margin: 0;

          color: white;

          font-size:
            clamp(
              28px,
              3vw,
              39px
            );

          line-height: 1.2;
        }

        .heroPanel p {
          max-width: 720px;

          margin:
            15px auto 0;

          color: #e9eef1;

          font-size: 17px;

          line-height: 1.5;
        }

        .floatingTitle,
        .contentTitle {
          position: absolute;

          top: -31px;
          left: 50%;

          transform:
            translateX(-50%);

          min-height: 62px;

          padding:
            10px 28px;

          display: flex;
          align-items: center;
          justify-content: center;

          border:
            3px solid #174461;

          border-radius: 14px;

          color: #073b68;

          background:
            linear-gradient(
              #a5e1ff,
              #51a2d0
            );

          box-shadow:
            inset 0 4px 4px
              rgba(
                255,
                255,
                255,
                0.6
              ),
            0 5px 0 #17415c;

          font-size: 25px;

          font-weight: 700;

          white-space: nowrap;
        }

        /* ===========================================
           STATISTICS
        =========================================== */

        .statistics {
          width:
            min(
              1150px,
              94%
            );

          margin:
            0 auto 65px;

          display: grid;

          grid-template-columns:
            repeat(
              5,
              minmax(0, 1fr)
            );

          gap: 14px;
        }

        .statCard {
          min-height: 115px;

          padding: 14px 8px;

          border:
            2px solid #60686c;

          border-radius: 14px;

          background:
            linear-gradient(
              #ffffff,
              #d0d0d0
            );

          box-shadow:
            0 5px 0 #555d61;

          text-align: center;
        }

        .statCard strong {
          display: block;

          margin-bottom: 5px;

          color: #07517e;

          font-size: 35px;
        }

        .statCard span {
          font-size: 14px;

          font-weight: 700;
        }

        .pendingStat strong {
          color: #9a7412;
        }

        .approvedStat strong {
          color: #20783d;
        }

        .blockedStat strong {
          color: #a52222;
        }

        .unusedStat strong {
          color: #555;
        }

        /* ===========================================
           MANAGEMENT
        =========================================== */

        .managementPanel {
          width:
            min(
              1150px,
              94%
            );

          margin: 0 auto;

          padding:
            68px 28px 32px;

          border-radius: 25px;
        }

        .managementGrid {
          display: grid;

          grid-template-columns:
            repeat(
              5,
              minmax(0, 1fr)
            );

          gap: 17px;
        }

        .managementCard {
          min-height: 205px;

          padding:
            22px 15px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          gap: 10px;

          border:
            3px solid #565e62;

          border-radius: 16px;

          color: #111;

          background:
            linear-gradient(
              145deg,
              #fafafa,
              #d8d8d8
            );

          box-shadow:
            inset 0 6px 6px
              rgba(
                255,
                255,
                255,
                0.9
              ),
            0 6px 0 #555d61;

          text-align: center;

          transition:
            transform 0.15s ease;
        }

        .managementCard:hover {
          transform:
            translateY(-4px);
        }

        .managementCard strong {
          font-size: 20px;
        }

        .managementCard small {
          color: #555;

          font-size: 13px;

          line-height: 1.35;
        }

        .managementNumber,
        .managementIcon {
          min-width: 58px;
          height: 58px;

          padding: 0 10px;

          display: flex;
          align-items: center;
          justify-content: center;

          border:
            2px solid #174461;

          border-radius: 50%;

          color: #07517e;

          background: #bcecff;

          font-size: 27px;

          font-weight: 700;
        }

        .createManagement {
          border-color: #317746;

          background:
            linear-gradient(
              #edfff1,
              #bfe6c9
            );
        }

        .createManagement
          .managementIcon {
          border-color: #277447;

          color: #176535;

          background: #c9f4d4;
        }

        /* ===========================================
           CONTENT
        =========================================== */

        .contentPanel {
          width:
            min(
              1200px,
              95%
            );

          min-height: 280px;

          margin:
            85px auto 0;

          padding:
            80px 30px 35px;

          border-radius: 25px;
        }

        .contentTitle {
          min-width: 300px;

          max-width: 90%;

          text-align: center;
        }

        .innerPanel {
          padding: 28px;

          border:
            3px solid #5a6266;

          border-radius: 18px;

          background:
            linear-gradient(
              145deg,
              #f4f4f4,
              #c9c9c9
            );

          box-shadow:
            inset 0 6px 7px
              rgba(
                255,
                255,
                255,
                0.85
              ),
            0 6px 0 #555d61;
        }

        .dashboardWelcome {
          min-height: 200px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          text-align: center;
        }

        .dashboardWelcome h2 {
          margin:
            0 0 12px;

          font-size: 29px;
        }

        .dashboardWelcome p {
          margin: 0;

          color: #555;

          font-size: 18px;
        }

        /* ===========================================
           CREATE
        =========================================== */

        .createArea {
          width:
            min(
              720px,
              100%
            );

          margin: 0 auto;

          display: flex;
          flex-direction: column;

          gap: 15px;
        }

        .createArea label {
          font-size: 19px;

          font-weight: 700;
        }

        .createArea input {
          width: 100%;

          min-height: 60px;

          padding:
            0 18px;

          border:
            2px solid #666;

          border-radius: 11px;

          outline: none;

          background: white;

          font-size: 19px;
        }

        .createArea input:focus {
          border-color: #168fc9;

          box-shadow:
            0 0 0 3px
              rgba(
                22,
                143,
                201,
                0.15
              );
        }

        .createButton {
          min-height: 58px;

          margin:
            7px auto 0;

          padding:
            0 35px;

          border:
            3px solid #277447;

          border-radius: 11px;

          color: #14552f;

          background:
            linear-gradient(
              #c9f4d4,
              #77cc90
            );

          box-shadow:
            0 5px 0 #286a3f;

          font-size: 18px;

          font-weight: 700;
        }

        .createdResult {
          margin-top: 20px;

          padding: 25px;

          display: flex;
          flex-direction: column;
          align-items: center;

          gap: 10px;

          border:
            3px solid #168fc9;

          border-radius: 15px;

          background: #e6f8ff;

          text-align: center;
        }

        .createdResult > span {
          color: #555;

          font-weight: 700;
        }

        .createdResult h3 {
          margin: 0;

          font-size: 23px;
        }

        .createdResult strong {
          padding:
            12px 18px;

          border:
            2px dashed #168fc9;

          border-radius: 9px;

          color: #07517e;

          background: white;

          font-family:
            Consolas,
            monospace;

          font-size: 25px;

          letter-spacing: 1px;
        }

        .createdResult button {
          min-height: 48px;

          padding:
            0 20px;

          border:
            2px solid #174461;

          border-radius: 9px;

          color: #073b68;

          background:
            linear-gradient(
              #bcecff,
              #64b6df
            );

          font-weight: 700;
        }

        .createdResult small {
          max-width: 550px;

          color: #555;

          line-height: 1.4;
        }

        /* ===========================================
           SEARCH
        =========================================== */

        .searchWrapper {
          min-height: 62px;

          margin-bottom: 25px;

          display: flex;

          border:
            2px solid #328dbb;

          border-radius: 11px;

          overflow: hidden;

          background: white;
        }

        .searchInput {
          flex: 1;

          min-width: 0;

          padding:
            0 18px;

          border: none;

          outline: none;

          font-size: 18px;
        }

        .clearButton {
          width: 60px;

          border: none;

          color: #a41414;

          background: transparent;

          font-size: 28px;

          font-weight: 700;
        }

        /* ===========================================
           USERS
        =========================================== */

        .usersGrid {
          display: grid;

          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );

          gap: 20px;
        }

        .userCard {
          padding: 23px;

          border:
            2px solid #555d61;

          border-radius: 15px;

          background:
            linear-gradient(
              #ffffff,
              #dedede
            );

          box-shadow:
            0 5px 0 #555d61;
        }

        .userTop {
          margin-bottom: 15px;

          display: flex;

          justify-content:
            space-between;

          gap: 15px;
        }

        .userCard h3 {
          margin:
            0 0 8px;

          font-size: 23px;
        }

        .statusBadge {
          display: inline-block;

          padding:
            6px 10px;

          border-radius: 30px;

          font-size: 13px;

          font-weight: 700;
        }

        .statusBadge.approved {
          color: #176438;

          background: #d4f1dc;
        }

        .statusBadge.pending {
          color: #795c0b;

          background: #fff1b6;
        }

        .statusBadge.blocked {
          color: #8b1919;

          background: #f3d2d2;
        }

        .statusBadge.unused {
          color: #555;

          background: #e4e4e4;
        }

        .codeBox {
          margin:
            15px 0;

          padding: 14px;

          display: grid;

          grid-template-columns:
            minmax(0, 1fr)
            auto;

          gap: 7px 12px;

          align-items: center;

          border:
            2px solid #80aabb;

          border-radius: 10px;

          background: #f3fbff;
        }

        .codeBox > span {
          grid-column:
            1 / -1;

          color: #555;

          font-size: 12px;

          font-weight: 700;

          text-transform:
            uppercase;
        }

        .codeBox > strong {
          overflow-wrap:
            anywhere;

          color: #07517e;

          font-family:
            Consolas,
            monospace;

          font-size: 18px;
        }

        .copyButton {
          min-height: 39px;

          padding:
            0 12px;

          border:
            1px solid #168fc9;

          border-radius: 7px;

          color: #07517e;

          background: #dff5ff;

          font-weight: 700;
        }

        .dateGrid {
          display: grid;

          grid-template-columns:
            repeat(
              3,
              minmax(0, 1fr)
            );

          gap: 8px;
        }

        .dateGrid > div {
          min-height: 68px;

          padding: 8px;

          border:
            1px solid #aaa;

          border-radius: 8px;

          background:
            rgba(
              255,
              255,
              255,
              0.6
            );

          text-align: center;
        }

        .dateGrid span {
          display: block;

          margin-bottom: 5px;

          color: #666;

          font-size: 11px;
        }

        .dateGrid strong {
          font-size: 12px;

          line-height: 1.3;
        }

        .userActions {
          margin-top: 17px;

          display: flex;

          flex-wrap: wrap;

          gap: 9px;
        }

        .userActions button {
          flex: 1;

          min-width: 135px;

          min-height: 47px;

          padding:
            7px 12px;

          border-radius: 9px;

          font-weight: 700;
        }

        .approveButton {
          border:
            2px solid #277447;

          color: #14552f;

          background:
            linear-gradient(
              #c8f0d3,
              #78cb90
            );
        }

        .rejectButton,
        .deleteButton {
          border:
            2px solid #922020;

          color: white;

          background:
            linear-gradient(
              #ef6666,
              #b52020
            );
        }

        .blockButton {
          border:
            2px solid #8b6c18;

          color: #5f4908;

          background:
            linear-gradient(
              #ffe590,
              #dab443
            );
        }

        .restoreButton {
          border:
            2px solid #266f76;

          color: #15565c;

          background:
            linear-gradient(
              #b9eff1,
              #6bc5ca
            );
        }

        .emptyBox {
          min-height: 150px;

          padding: 25px;

          display: flex;
          align-items: center;
          justify-content: center;

          color: #555;

          text-align: center;

          font-size: 18px;
        }

        /* ===========================================
           RESPONSIVE
        =========================================== */

        @media (
          max-width: 1050px
        ) {
          .statistics {
            grid-template-columns:
              repeat(
                3,
                minmax(
                  0,
                  1fr
                )
              );
          }

          .managementGrid {
            grid-template-columns:
              repeat(
                3,
                minmax(
                  0,
                  1fr
                )
              );
          }
        }

        @media (
          max-width: 850px
        ) {
          .topPanel {
            flex-direction:
              column;
          }

          .namePlate {
            width: 100%;
          }

          .topButtons {
            width: 100%;

            display: grid;

            grid-template-columns:
              repeat(
                2,
                minmax(
                  0,
                  1fr
                )
              );
          }

          .usersGrid {
            grid-template-columns:
              1fr;
          }

          .dateGrid {
            grid-template-columns:
              1fr;
          }
        }

        @media (
          max-width: 650px
        ) {
          .page {
            padding:
              10px 7px 50px;
          }

          .topPanel {
            width: 100%;

            padding: 13px;
          }

          .topButtons {
            grid-template-columns:
              1fr;
          }

          .topButton,
          .exitButton {
            width: 100%;
          }

          .heroPanel,
          .managementPanel,
          .contentPanel,
          .statistics {
            width: 100%;
          }

          .heroPanel {
            margin-top: 70px;

            padding:
              55px 15px 25px;
          }

          .statistics {
            grid-template-columns:
              repeat(
                2,
                minmax(
                  0,
                  1fr
                )
              );

            gap: 8px;
          }

          .statCard {
            min-height: 95px;
          }

          .statCard strong {
            font-size: 29px;
          }

          .managementPanel {
            padding:
              60px 12px 18px;
          }

          .managementGrid {
            grid-template-columns:
              1fr;
          }

          .managementCard {
            min-height: 155px;
          }

          .contentPanel {
            padding:
              65px 8px 15px;
          }

          .innerPanel {
            padding: 12px;
          }

          .floatingTitle,
          .contentTitle {
            min-width: 200px;

            max-width: 92%;

            min-height: 55px;

            padding:
              8px 15px;

            font-size: 20px;

            white-space: normal;
          }

          .createArea input {
            font-size: 16px;
          }

          .createdResult {
            padding: 16px 8px;
          }

          .createdResult strong {
            font-size: 19px;
          }

          .codeBox {
            grid-template-columns:
              1fr;
          }

          .copyButton {
            width: 100%;
          }

          .userCard {
            padding: 15px 10px;
          }

          .userActions {
            flex-direction:
              column;
          }

          .userActions button {
            width: 100%;

            min-width: 0;
          }
        }
      `}</style>
    </main>
  );
}

/* =========================================================
   SEARCH COMPONENT
========================================================= */

function SearchBox({
  search,
  setSearch,
}: {
  search: string;
  setSearch:
    React.Dispatch<
      React.SetStateAction<string>
    >;
}) {
  return (
    <div className="searchWrapper">
      <input
        type="text"
        className="searchInput"
        value={search}
        placeholder="Ism yoki maxsus kod bo‘yicha qidirish..."
        onChange={(e) =>
          setSearch(
            e.target.value
          )
        }
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

      <style jsx>{`
        .searchWrapper {
          min-height: 62px;

          margin-bottom: 25px;

          display: flex;

          border:
            2px solid #328dbb;

          border-radius: 11px;

          overflow: hidden;

          background: white;
        }

        .searchInput {
          flex: 1;

          min-width: 0;

          padding:
            0 18px;

          border: none;

          outline: none;

          font-family:
            "Bell MT",
            "Times New Roman",
            serif;

          font-size: 18px;
        }

        .clearButton {
          width: 60px;

          border: none;

          color: #a41414;

          background: transparent;

          font-size: 28px;

          font-weight: 700;

          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
