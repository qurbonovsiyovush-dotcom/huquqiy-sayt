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
  | "new-code"
  | "bulk-create"
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

  const [
    bulkCreating,
    setBulkCreating,
  ] =
    useState(false);

  const [
    bulkCount,
    setBulkCount,
  ] =
    useState(250);

  const [
    bulkCreatedUsers,
    setBulkCreatedUsers,
  ] =
    useState<AccessCode[]>([]);

  const [
    bulkCopied,
    setBulkCopied,
  ] =
    useState(false);

  const [workingId, setWorkingId] =
    useState<string | null>(null);

  const [
    deletingApproved,
    setDeletingApproved,
  ] = useState(false);

  const [
    deletingPending,
    setDeletingPending,
  ] = useState(false);

  const [
    approvingPending,
    setApprovingPending,
  ] = useState(false);

  const [name, setName] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [
    activeSection,
    setActiveSection,
  ] =
    useState<ActiveSection>(
      "pending"
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

    window.setTimeout(
      () => {
        setMessage("");
        setMessageType("");
      },
      4000
    );
  }

  /* =========================================================
     LOAD
  ========================================================= */

  const loadUsers =
    useCallback(
      async (
        silent = false
      ) => {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
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
                "Ma’lumotlarni yuklab bo‘lmadi.",
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
            "ACCESS CODES LOAD ERROR:",
            error
          );

          showMessage(
            "Server bilan bog‘lanishda xatolik.",
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
     CREATE
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
            "Kod yaratilmadi.",
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
        "CREATE CODE ERROR:",
        error
      );

      showMessage(
        "Kod yaratishda server xatosi.",
        "error"
      );
    } finally {
      setCreating(false);
    }
  }

  /* =========================================================
     BULK CREATE
  ========================================================= */

  async function createBulkCodes() {
    const count =
      Number(bulkCount);

    if (
      !Number.isInteger(count) ||
      count < 1 ||
      count > 500
    ) {
      showMessage(
        "Kodlar soni 1 dan 500 gacha bo‘lishi kerak.",
        "error"
      );

      return;
    }

    const confirmed =
      window.confirm(
        `${count} ta yangi kirish kodi yaratiladi.\n\n` +
        `Kodlar darhol tasdiqlangan holatda bo‘ladi.\n\n` +
        `Davom etasizmi?`
      );

    if (!confirmed) {
      return;
    }

    setBulkCreating(true);
    setBulkCreatedUsers([]);
    setBulkCopied(false);

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
                action:
                  "bulk-create",

                count,
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
            "Ommaviy kodlar yaratilmadi.",
          "error"
        );

        return;
      }

      const created =
        Array.isArray(
          data?.users
        )
          ? data.users
          : [];

      setBulkCreatedUsers(
        created
      );

      await loadUsers(true);

      showMessage(
        `${created.length} ta kirish kodi yaratildi.`
      );
    } catch (error) {
      console.error(
        "BULK CREATE ERROR:",
        error
      );

      showMessage(
        "Ommaviy kod yaratishda server xatosi.",
        "error"
      );
    } finally {
      setBulkCreating(false);
    }
  }

  async function copyBulkCodes() {
    if (
      bulkCreatedUsers.length ===
      0
    ) {
      return;
    }

    const text =
      bulkCreatedUsers
        .map(
          (user) =>
            `${user.name}\t${user.code}`
        )
        .join("\n");

    try {
      await navigator.clipboard.writeText(
        text
      );

      setBulkCopied(true);

      window.setTimeout(
        () => {
          setBulkCopied(false);
        },
        1800
      );
    } catch {
      window.prompt(
        "Ro‘yxatni nusxalang:",
        text
      );
    }
  }

  function downloadBulkCodes() {
    if (
      bulkCreatedUsers.length ===
      0
    ) {
      return;
    }

    const escapeCsv =
      (value: string) =>
        `"${value.replace(
          /"/g,
          '""'
        )}"`;

    const csv =
      [
        [
          "№",
          "Talaba",
          "Kirish kodi",
        ].join(","),

        ...bulkCreatedUsers.map(
          (user, index) =>
            [
              String(
                index + 1
              ),

              escapeCsv(
                user.name
              ),

              escapeCsv(
                user.code
              ),
            ].join(",")
        ),
      ].join("\r\n");

    const blob =
      new Blob(
        [
          "\uFEFF" +
            csv,
        ],
        {
          type:
            "text/csv;charset=utf-8",
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
      `kirish-kodlari-${bulkCreatedUsers.length}.csv`;

    document.body.appendChild(
      link
    );

    link.click();

    link.remove();

    URL.revokeObjectURL(
      url
    );
  }

  /* =========================================================
     KIRISH SO‘ROVLARINING HAMMASIGA RUXSAT BERISH
  ========================================================= */

  async function approveAllPending() {
    const total =
      statistics.pending;

    if (total === 0) {
      showMessage(
        "Kirish so‘rovi mavjud emas.",
        "error"
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Kirish so‘rovida turgan ${total} ta foydalanuvchining BARCHASIGA ruxsat beriladi.\n\nDavom etasizmi?`
      );

    if (!confirmed) {
      return;
    }

    setApprovingPending(true);

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
                action:
                  "approve-all-pending",
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
            "Kirish so‘rovlariga ruxsat berib bo‘lmadi.",
          "error"
        );

        return;
      }

      setSearch("");
      await loadUsers(true);

      showMessage(
        data?.message ||
          "Barcha kirish so‘rovlariga ruxsat berildi."
      );
    } catch (error) {
      console.error(
        "APPROVE ALL PENDING ERROR:",
        error
      );

      showMessage(
        "Server bilan bog‘lanishda xatolik.",
        "error"
      );
    } finally {
      setApprovingPending(false);
    }
  }

  /* =========================================================
     KIRISH SO‘ROVLARINING HAMMASINI O‘CHIRISH
  ========================================================= */

  async function deleteAllPending() {
    const total = statistics.pending;

    if (total === 0) {
      showMessage(
        "Kirish so‘rovi mavjud emas.",
        "error"
      );
      return;
    }

    const confirmed = window.confirm(
      `DIQQAT!\n\nKirish so‘rovida turgan ${total} ta foydalanuvchi va ularning kirish kodlari BUTUNLAY o‘chiriladi.\n\nBu amalni ortga qaytarib bo‘lmaydi.\n\nDavom etasizmi?`
    );

    if (!confirmed) return;

    setDeletingPending(true);

    try {
      const response = await fetch(
        "/api/admin/access-codes",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "delete-all-pending",
          }),
        }
      );

      const data = await readJson(response);

      if (
        !response.ok ||
        data?.success !== true
      ) {
        showMessage(
          data?.message ||
            "Kirish so‘rovlarini o‘chirib bo‘lmadi.",
          "error"
        );
        return;
      }

      setSearch("");
      await loadUsers(true);

      showMessage(
        data?.message ||
          "Barcha kirish so‘rovlari o‘chirildi."
      );
    } catch (error) {
      console.error(
        "DELETE ALL PENDING ERROR:",
        error
      );

      showMessage(
        "Server bilan bog‘lanishda xatolik.",
        "error"
      );
    } finally {
      setDeletingPending(false);
    }
  }

  /* =========================================================
     RUXSAT BERILGANLARNING HAMMASINI O‘CHIRISH
  ========================================================= */

  async function deleteAllApproved() {
    const total =
      statistics.approved;

    if (total === 0) {
      showMessage(
        "Ruxsat berilgan foydalanuvchi yo‘q.",
        "error"
      );

      return;
    }

    const confirmed =
      window.confirm(
        `DIQQAT!\n\nRuxsat berilgan ${total} ta foydalanuvchi va ularning kirish kodlari BUTUNLAY o‘chiriladi.\n\nBu amalni ortga qaytarib bo‘lmaydi.\n\nDavom etasizmi?`
      );

    if (!confirmed) {
      return;
    }

    setDeletingApproved(true);

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
                action:
                  "delete-all-approved",
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
            "Ruxsat berilganlarni o‘chirib bo‘lmadi.",
          "error"
        );

        return;
      }

      setSearch("");
      await loadUsers(true);

      showMessage(
        data?.message ||
          "Ruxsat berilganlar o‘chirildi."
      );
    } catch (error) {
      console.error(
        "DELETE ALL APPROVED ERROR:",
        error
      );

      showMessage(
        "Server bilan bog‘lanishda xatolik.",
        "error"
      );
    } finally {
      setDeletingApproved(false);
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
        "Ushbu foydalanuvchiga kirish ruxsatini berasizmi?";
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
        "Ushbu kodni qayta faollashtirasizmi?";
    }

    if (
      action === "deactivate"
    ) {
      confirmation =
        "Ushbu foydalanuvchining kirishini bloklaysizmi?";
    }

    if (
      action === "delete"
    ) {
      confirmation =
        "DIQQAT!\n\nUshbu foydalanuvchi va uning kodi butunlay o‘chiriladi.\n\nDavom etasizmi?";
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
          "Amal bajarildi."
      );
    } catch (error) {
      console.error(
        "ACTION ERROR:",
        error
      );

      showMessage(
        "Server bilan bog‘lanishda xatolik.",
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
        1500
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
    } catch {}

    sessionStorage.removeItem(
      "qurbonov-session"
    );

    sessionStorage.removeItem(
      "qurbonov-role"
    );

    router.replace("/");
    router.refresh();
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
        text: "Bloklangan",
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
        "Kod ishlatilmagan",
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
        total: users.length,
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
     USER CARD
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
        <div className="userName">
          {user.name}
        </div>

        <div
          className={`statusBadge ${status.key}`}
        >
          {status.text}
        </div>

        <div className="codeBox">
          <div className="codeLabel">
            MAXSUS KIRISH KODI
          </div>

          <div className="codeRow">
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
                ? "✓"
                : "Nusxalash"}
            </button>
          </div>
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
              Tasdiq
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
                RUXSAT BERISH
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
                RAD ETISH
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
              KIRISHNI BLOKLASH
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
              KODNI BLOKLASH
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
              QAYTA FAOLLASHTIRISH
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
            BUTUNLAY O‘CHIRISH
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

      {/* =====================================================
          HEADER
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

      {/* =====================================================
          MESSAGE
      ===================================================== */}

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

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="heroPanel">

        <div className="floatingTitle">
          Foydalanuvchilar
        </div>

        <h1>
          Kirish kodlari va foydalanuvchilarni boshqarish
        </h1>

      </section>

      {/* =====================================================
          STATISTICS
      ===================================================== */}

      <section className="statistics">

        <button
          type="button"
          className="statCard totalStat"
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
            Ishlatilmagan
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

      {/* =====================================================
          MANAGEMENT
      ===================================================== */}

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
          </button>

          <button
            type="button"
            className="managementCard bulkManagement"
            onClick={() =>
              router.push(
                "/admin/bulk-codes"
              )
            }
          >
            <span className="managementIcon">
              PDF
            </span>

            <strong>
              Ommaviy kodlar
            </strong>
          </button>

          <button
            type="button"
            className="managementCard pendingManagement"
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
          </button>

          <button
            type="button"
            className="managementCard approvedManagement"
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
          </button>

          <button
            type="button"
            className="managementCard allManagement"
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
          </button>

          <button
            type="button"
            className="managementCard blockedManagement"
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
          </button>

        </div>

      </section>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <section className="contentPanel">

        {/* =================================================
            NEW CODE
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
                  Foydalanuvchi ism-familiyasi
                </label>

                <input
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
                    ? "YARATILMOQDA..."
                    : "KOD YARATISH"}
                </button>

                {lastCreatedCode && (
                  <div className="createdResult">

                    <span>
                      Yangi kirish kodi
                    </span>

                    <h3>
                      {lastCreatedName}
                    </h3>

                    <strong>
                      {lastCreatedCode}
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
                        ? "NUSXALANDI ✓"
                        : "KODNI NUSXALASH"}
                    </button>

                  </div>
                )}

              </div>

            </div>

          </>
        )}

        {/* =================================================
            BULK CREATE
        ================================================= */}

        {activeSection ===
          "bulk-create" && (
          <>

            <div className="contentTitle">
              Ommaviy parol yaratish
            </div>

            <div className="innerPanel">

              <div className="bulkCreateArea">

                <div className="bulkInfo">
                  Bir bosishda 1 tadan 500 tagacha
                  alohida kirish kodi yaratishingiz mumkin.
                  Yaratilgan kodlar darhol ruxsat berilgan
                  holatda bo‘ladi.
                </div>

                <label>
                  Nechta parol yaratilsin?
                </label>

                <input
                  type="number"
                  min={1}
                  max={500}
                  value={bulkCount}
                  disabled={
                    bulkCreating
                  }
                  onChange={(e) =>
                    setBulkCount(
                      Number(
                        e.target.value
                      )
                    )
                  }
                />

                <button
                  type="button"
                  className="bulkCreateButton"
                  disabled={
                    bulkCreating
                  }
                  onClick={
                    createBulkCodes
                  }
                >
                  {bulkCreating
                    ? "YARATILMOQDA..."
                    : `${bulkCount} TA PAROL YARATISH`}
                </button>

                {bulkCreatedUsers.length >
                  0 && (
                  <div className="bulkResult">

                    <div className="bulkResultHeader">

                      <div>
                        <span>
                          Yaratildi
                        </span>

                        <strong>
                          {bulkCreatedUsers.length} ta
                        </strong>
                      </div>

                      <div className="bulkResultActions">

                        <button
                          type="button"
                          onClick={
                            copyBulkCodes
                          }
                        >
                          {bulkCopied
                            ? "NUSXALANDI ✓"
                            : "HAMMASINI NUSXALASH"}
                        </button>

                        <button
                          type="button"
                          onClick={
                            downloadBulkCodes
                          }
                        >
                          CSV YUKLAB OLISH
                        </button>

                      </div>

                    </div>

                    <div className="bulkTableWrap">

                      <table className="bulkTable">

                        <thead>
                          <tr>
                            <th>№</th>
                            <th>Talaba</th>
                            <th>Kirish kodi</th>
                          </tr>
                        </thead>

                        <tbody>
                          {bulkCreatedUsers.map(
                            (
                              user,
                              index
                            ) => (
                              <tr
                                key={
                                  user.id
                                }
                              >
                                <td>
                                  {index +
                                    1}
                                </td>

                                <td>
                                  {user.name}
                                </td>

                                <td>
                                  <strong>
                                    {user.code}
                                  </strong>
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>

                      </table>

                    </div>

                  </div>
                )}

              </div>

            </div>

          </>
        )}

        {/* =================================================
            PENDING
        ================================================= */}

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

              {statistics.pending >
                0 && (
                <div className="pendingBulkActions">
                  <button
                    type="button"
                    className="approveAllPendingButton"
                    disabled={
                      approvingPending ||
                      deletingPending ||
                      refreshing
                    }
                    onClick={
                      approveAllPending
                    }
                  >
                    {approvingPending
                      ? "RUXSAT BERILMOQDA..."
                      : `BARCHASIGA RUXSAT BERISH (${statistics.pending})`}
                  </button>

                  <button
                    type="button"
                    className="deleteAllPendingButton"
                    disabled={
                      deletingPending ||
                      approvingPending ||
                      refreshing
                    }
                    onClick={
                      deleteAllPending
                    }
                  >
                    {deletingPending
                      ? "O‘CHIRILMOQDA..."
                      : `HAMMASINI O‘CHIRISH (${statistics.pending})`}
                  </button>
                </div>
              )}

              {renderUserList(
                pendingUsers,
                "Hozircha yangi kirish so‘rovi yo‘q."
              )}

            </div>

          </>
        )}

        {/* =================================================
            APPROVED
        ================================================= */}

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

              {statistics.approved >
                0 && (
                <div className="deleteAllApprovedWrap">
                  <button
                    type="button"
                    className="deleteAllApprovedButton"
                    disabled={
                      deletingApproved ||
                      refreshing
                    }
                    onClick={
                      deleteAllApproved
                    }
                  >
                    {deletingApproved
                      ? "O‘CHIRILMOQDA..."
                      : `RUXSAT BERILGANLARNING HAMMASINI O‘CHIRISH (${statistics.approved})`}
                  </button>
                </div>
              )}

              {renderUserList(
                approvedUsers,
                "Ruxsat berilgan foydalanuvchi yo‘q."
              )}

            </div>

          </>
        )}

        {/* =================================================
            ALL
        ================================================= */}

        {activeSection ===
          "all" && (
          <>

            <div className="contentTitle">
              Barcha kodlar
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

        {/* =================================================
            BLOCKED
        ================================================= */}

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

      {/* =====================================================
          GLOBAL CSS
      ===================================================== */}

      <style jsx global>{`

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
        }

        .page {
          min-height: 100vh;

          padding:
            16px 16px 90px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #f5f7f8 55%,
              #e8edf0 100%
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
          opacity: .55;

          cursor: not-allowed;
        }

        /* =====================================================
           HEADER
        ===================================================== */

        .topPanel {
          width:
            min(
              1580px,
              98%
            );

          min-height: 105px;

          margin: 0 auto;

          padding:
            18px 27px;

          display: flex;

          align-items: center;

          justify-content:
            space-between;

          gap: 22px;

          border:
            3px solid #173e58;

          border-radius: 24px;

          background:
            linear-gradient(
              180deg,
              #9adeff 0%,
              #59b4e2 50%,
              #398ebc 100%
            );

          box-shadow:
            inset 0 7px 6px
              rgba(
                255,
                255,
                255,
                .65
              ),

            inset 0 -5px 6px
              rgba(
                0,
                0,
                0,
                .15
              ),

            0 7px 0
              #173c55,

            0 14px 23px
              rgba(
                0,
                0,
                0,
                .22
              );
        }

        .namePlate {
          min-height: 60px;

          padding:
            0 25px;

          border:
            3px solid #50585d;

          border-radius: 13px;

          color: #111;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #eeeeee 45%,
              #bdbdbd 100%
            );

          box-shadow:
            inset 0 5px 5px
              white,

            0 5px 0
              #60686c,

            0 8px 12px
              rgba(
                0,
                0,
                0,
                .18
              );

          font-size: 21px;

          font-weight: 800;
        }

        .topButtons {
          display: flex;

          flex-wrap: wrap;

          justify-content:
            flex-end;

          gap: 13px;
        }

        .topButton,
        .exitButton {
          min-height: 51px;

          min-width: 115px;

          padding:
            8px 18px;

          border-radius: 10px;

          font-weight: 800;
        }

        .topButton {
          border:
            2px solid #626a6e;

          color: #111;

          background:
            linear-gradient(
              #ffffff,
              #c5c5c5
            );

          box-shadow:
            inset 0 4px 4px
              white,

            0 4px 0
              #626a6e;
        }

        .topButton:active {
          transform:
            translateY(3px);

          box-shadow:
            0 1px 0
              #626a6e;
        }

        .exitButton {
          border:
            2px solid #8f1d1d;

          color: white;

          background:
            linear-gradient(
              #f26a6a,
              #b21f1f
            );

          box-shadow:
            inset 0 4px 4px
              rgba(
                255,
                255,
                255,
                .35
              ),

            0 4px 0
              #7d1717;
        }

        /* =====================================================
           MESSAGE
        ===================================================== */

        .messageBox {
          position: fixed;

          z-index: 9999;

          top: 22px;

          left: 50%;

          transform:
            translateX(-50%);

          width:
            min(
              600px,
              90%
            );

          padding:
            15px 20px;

          border-radius: 12px;

          text-align: center;

          font-weight: 800;

          box-shadow:
            0 7px 20px
              rgba(
                0,
                0,
                .25
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

        /* =====================================================
           HERO
        ===================================================== */

        .heroPanel {
          position: relative;

          width:
            min(
              1050px,
              92%
            );

          min-height: 180px;

          margin:
            85px auto 60px;

          padding:
            65px 35px 30px;

          display: flex;

          align-items: center;

          justify-content: center;

          border:
            3px solid #303538;

          border-radius: 25px;

          background:
            linear-gradient(
              145deg,
              #717679 0%,
              #555a5d 45%,
              #34383a 100%
            );

          box-shadow:
            inset 0 7px 6px
              rgba(
                255,
                255,
                255,
                .18
              ),

            inset 0 -7px 7px
              rgba(
                0,
                0,
                0,
                .25
              ),

            0 8px 0
              #292e31,

            0 18px 28px
              rgba(
                0,
                0,
                0,
                .25
              );

          text-align: center;
        }

        .heroPanel h1 {
          margin: 0;

          color: white;

          font-size:
            clamp(
              28px,
              3vw,
              40px
            );

          line-height: 1.2;

          text-shadow:
            0 3px 2px
              rgba(
                0,
                0,
                0,
                .45
              );
        }

        .floatingTitle,
        .contentTitle {
          position: absolute;

          top: -32px;

          left: 50%;

          transform:
            translateX(-50%);

          min-height: 64px;

          padding:
            10px 30px;

          display: flex;

          align-items: center;

          justify-content: center;

          border:
            3px solid #174461;

          border-radius: 15px;

          color: #073b68;

          background:
            linear-gradient(
              180deg,
              #b8ecff 0%,
              #78c8ee 40%,
              #4699c8 100%
            );

          box-shadow:
            inset 0 6px 5px
              rgba(
                255,
                255,
                255,
                .75
              ),

            inset 0 -4px 5px
              rgba(
                0,
                0,
                0,
                .12
              ),

            0 6px 0
              #17415c,

            0 10px 15px
              rgba(
                0,
                0,
                0,
                .22
              );

          font-size: 26px;

          font-weight: 800;

          white-space: nowrap;
        }

        /* =====================================================
           STATISTICS 3D
        ===================================================== */

        .statistics {
          width:
            min(
              1150px,
              94%
            );

          margin:
            0 auto 75px;

          display: grid;

          grid-template-columns:
            repeat(
              5,
              minmax(
                0,
                1fr
              )
            );

          gap: 17px;
        }

        .statCard {
          min-height: 118px;

          padding:
            15px 8px;

          border:
            3px solid #60686c;

          border-radius: 15px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #ededed 45%,
              #c2c2c2 100%
            );

          box-shadow:
            inset 0 7px 6px
              rgba(
                255,
                255,
                255,
                .95
              ),

            inset 0 -4px 5px
              rgba(
                0,
                0,
                0,
                .12
              ),

            0 7px 0
              #555d61,

            0 12px 18px
              rgba(
                0,
                0,
                0,
                .22
              );

          text-align: center;

          transition:
            transform .12s ease,
            box-shadow .12s ease;
        }

        .statCard:hover {
          transform:
            translateY(-4px);

          box-shadow:
            inset 0 7px 6px
              rgba(
                255,
                255,
                255,
                .95
              ),

            0 11px 0
              #555d61,

            0 17px 22px
              rgba(
                0,
                0,
                0,
                .25
              );
        }

        .statCard:active {
          transform:
            translateY(5px);

          box-shadow:
            0 2px 0
              #555d61;
        }

        .statCard strong {
          display: block;

          margin-bottom: 6px;

          color: #07517e;

          font-size: 36px;

          font-weight: 900;
        }

        .statCard span {
          font-size: 15px;

          font-weight: 800;
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

        /* =====================================================
           MANAGEMENT PANEL
        ===================================================== */

        .managementPanel {
          position: relative;

          width:
            min(
              1200px,
              95%
            );

          margin: 0 auto;

          padding:
            75px 30px 38px;

          border:
            3px solid #303538;

          border-radius: 27px;

          background:
            linear-gradient(
              145deg,
              #707578,
              #505558 50%,
              #34383a
            );

          box-shadow:
            inset 0 7px 6px
              rgba(
                255,
                255,
                255,
                .18
              ),

            inset 0 -8px 8px
              rgba(
                0,
                0,
                0,
                .28
              ),

            0 9px 0
              #292e31,

            0 19px 30px
              rgba(
                0,
                0,
                0,
                .28
              );
        }

        .managementGrid {
          display: grid;

          grid-template-columns:
            repeat(
              6,
              minmax(
                0,
                1fr
              )
            );

          gap: 22px;
        }

        .managementCard {
          position: relative;

          min-height: 190px;

          padding:
            25px 15px 30px;

          display: flex;

          flex-direction: column;

          align-items: center;

          justify-content: center;

          gap: 18px;

          border:
            3px solid #4b5358;

          border-radius: 18px;

          color: #111;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #eeeeee 42%,
              #c5c5c5 100%
            );

          box-shadow:
            inset 0 8px 7px
              rgba(
                255,
                255,
                255,
                .95
              ),

            inset 0 -5px 6px
              rgba(
                0,
                0,
                0,
                .12
              ),

            0 9px 0
              #4c555a,

            0 14px 18px
              rgba(
                0,
                0,
                0,
                .28
              );

          text-align: center;

          transition:
            transform .12s ease,
            box-shadow .12s ease;
        }

        .managementCard:hover {
          transform:
            translateY(-6px);
        }

        .managementCard:active {
          transform:
            translateY(6px);

          box-shadow:
            inset 0 5px 5px
              rgba(
                255,
                255,
                255,
                .8
              ),

            0 3px 0
              #4c555a;
        }

        .managementCard strong {
          font-size: 22px;

          font-weight: 900;

          line-height: 1.2;

          text-shadow:
            0 1px 0 white;
        }

        .managementNumber,
        .managementIcon {
          width: 70px;

          height: 70px;

          display: flex;

          align-items: center;

          justify-content: center;

          flex-shrink: 0;

          border:
            3px solid #174461;

          border-radius: 50%;

          color: #07517e;

          background:
            radial-gradient(
              circle at 35% 25%,
              #e5f8ff,
              #a4e1ff 45%,
              #58acd7 100%
            );

          box-shadow:
            inset 0 6px 6px
              rgba(
                255,
                255,
                255,
                .85
              ),

            inset 0 -4px 5px
              rgba(
                0,
                0,
                0,
                .14
              ),

            0 5px 0
              #174461,

            0 9px 12px
              rgba(
                0,
                0,
                0,
                .22
              );

          font-size: 31px;

          font-weight: 900;
        }

        /* YANGI KOD */

        .createManagement {
          border-color: #347649;

          background:
            linear-gradient(
              180deg,
              #f2fff5 0%,
              #c9efd3 45%,
              #91d5a3 100%
            );

          box-shadow:
            inset 0 8px 7px
              rgba(
                255,
                255,
                255,
                .95
              ),

            0 9px 0
              #347649,

            0 14px 18px
              rgba(
                0,
                0,
                0,
                .25
              );
        }

        .createManagement
        .managementIcon {
          border-color: #26733f;

          color: #176536;

          background:
            radial-gradient(
              circle at 35% 25%,
              #f1fff4,
              #b8efc7 50%,
              #6ac184
            );

          box-shadow:
            inset 0 6px 6px
              rgba(
                255,
                255,
                255,
                .85
              ),

            0 5px 0
              #26733f;
        }

        /* OMMAVIY PAROL */

        .bulkManagement {
          border-color: #6a4f99;

          background:
            linear-gradient(
              180deg,
              #fbf7ff,
              #e1d2f5 45%,
              #b598dc 100%
            );

          box-shadow:
            inset 0 8px 7px
              rgba(
                255,
                255,
                255,
                .95
              ),

            0 9px 0
              #6a4f99,

            0 14px 18px
              rgba(
                0,
                0,
                0,
                .25
              );
        }

        .bulkManagement
        .managementIcon {
          border-color: #64478e;

          color: #56377f;

          background:
            radial-gradient(
              circle at 35% 25%,
              #fffaff,
              #ddc9f6 50%,
              #aa86d5
            );

          box-shadow:
            inset 0 6px 6px
              rgba(
                255,
                255,
                255,
                .85
              ),

            0 5px 0
              #64478e;

          font-size: 20px;
        }

        /* PENDING */

        .pendingManagement {
          border-color: #8e741d;

          background:
            linear-gradient(
              180deg,
              #fffdf1,
              #f5e5a9 45%,
              #d9bc57 100%
            );

          box-shadow:
            inset 0 8px 7px
              rgba(
                255,
                255,
                255,
                .95
              ),

            0 9px 0
              #8e741d,

            0 14px 18px
              rgba(
                0,
                0,
                0,
                .25
              );
        }

        .pendingManagement
        .managementNumber {
          border-color: #876d17;

          color: #72570b;

          background:
            radial-gradient(
              circle at 35% 25%,
              #fffbea,
              #ffe899 50%,
              #dab543
            );

          box-shadow:
            inset 0 6px 6px
              rgba(
                255,
                255,
                255,
                .85
              ),

            0 5px 0
              #876d17;
        }

        /* APPROVED */

        .approvedManagement {
          border-color: #277447;

          background:
            linear-gradient(
              180deg,
              #f1fff5,
              #c5ead0 45%,
              #81c897
            );

          box-shadow:
            inset 0 8px 7px
              rgba(
                255,
                255,
                255,
                .95
              ),

            0 9px 0
              #277447,

            0 14px 18px
              rgba(
                0,
                0,
                0,
                .25
              );
        }

        .approvedManagement
        .managementNumber {
          border-color: #267344;

          color: #176638;

          background:
            radial-gradient(
              circle at 35% 25%,
              #effff3,
              #aee8bf 50%,
              #65bc80
            );

          box-shadow:
            inset 0 6px 6px
              rgba(
                255,
                255,
                255,
                .85
              ),

            0 5px 0
              #267344;
        }

        /* ALL */

        .allManagement {
          border-color: #174461;

          background:
            linear-gradient(
              180deg,
              #f2fbff,
              #c7e9f8 45%,
              #80bddb
            );

          box-shadow:
            inset 0 8px 7px
              rgba(
                255,
                255,
                255,
                .95
              ),

            0 9px 0
              #174461,

            0 14px 18px
              rgba(
                0,
                0,
                0,
                .25
              );
        }

        /* BLOCKED */

        .blockedManagement {
          border-color: #8f2020;

          background:
            linear-gradient(
              180deg,
              #fff5f5,
              #f0c8c8 45%,
              #d77b7b
            );

          box-shadow:
            inset 0 8px 7px
              rgba(
                255,
                255,
                255,
                .95
              ),

            0 9px 0
              #8f2020,

            0 14px 18px
              rgba(
                0,
                0,
                0,
                .25
              );
        }

        .blockedManagement
        .managementNumber {
          border-color: #8f2020;

          color: #971b1b;

          background:
            radial-gradient(
              circle at 35% 25%,
              #fff4f4,
              #f4b5b5 50%,
              #d76565
            );

          box-shadow:
            inset 0 6px 6px
              rgba(
                255,
                255,
                255,
                .85
              ),

            0 5px 0
              #8f2020;
        }

        /* =====================================================
           CONTENT
        ===================================================== */

        .contentPanel {
          position: relative;

          width:
            min(
              1200px,
              95%
            );

          min-height: 320px;

          margin:
            90px auto 0;

          padding:
            80px 30px 38px;

          border:
            3px solid #303538;

          border-radius: 27px;

          background:
            linear-gradient(
              145deg,
              #707578,
              #505558 50%,
              #34383a
            );

          box-shadow:
            inset 0 7px 6px
              rgba(
                255,
                255,
                255,
                .18
              ),

            0 9px 0
              #292e31,

            0 19px 30px
              rgba(
                0,
                0,
                0,
                .28
              );
        }

        .contentTitle {
          min-width: 300px;
        }

        .innerPanel {
          padding: 28px;

          border:
            3px solid #5a6266;

          border-radius: 18px;

          background:
            linear-gradient(
              145deg,
              #ffffff 0%,
              #eeeeee 50%,
              #c6c6c6 100%
            );

          box-shadow:
            inset 0 7px 7px
              rgba(
                255,
                255,
                255,
                .9
              ),

            0 7px 0
              #555d61,

            0 12px 18px
              rgba(
                0,
                0,
                0,
                .2
              );
        }

        /* =====================================================
           KIRISH SO‘ROVLARI / RUXSAT BERILGANLARNI HAMMASINI O‘CHIRISH
        ===================================================== */

        .pendingBulkActions,
        .deleteAllApprovedWrap {
          width: 100%;
          margin: -4px 0 28px;
          display: flex;
          justify-content: flex-end;
          gap: 14px;
          flex-wrap: wrap;
        }

        .approveAllPendingButton {
          min-height: 54px;
          padding: 0 24px;
          border: 3px solid #1f6b39;
          border-radius: 12px;
          background:
            linear-gradient(
              180deg,
              #c9f4d2 0%,
              #72d08b 48%,
              #2f9d51 100%
            );
          box-shadow:
            inset 0 4px 4px
              rgba(255,255,255,.62),
            0 5px 0 #1d6b38,
            0 9px 14px
              rgba(0,0,0,.18);
          color: #ffffff;
          font-size: 16px;
          font-weight: 900;
          letter-spacing: .2px;
        }

        .approveAllPendingButton:active:not(:disabled) {
          transform: translateY(3px);
          box-shadow:
            inset 0 3px 4px
              rgba(255,255,255,.4),
            0 2px 0 #1d6b38;
        }

        .deleteAllPendingButton,
        .deleteAllApprovedButton {
          min-height: 54px;
          padding: 0 24px;
          border: 3px solid #861717;
          border-radius: 12px;
          background:
            linear-gradient(
              180deg,
              #ffb1b1 0%,
              #ef5e5e 48%,
              #bd1d1d 100%
            );
          box-shadow:
            inset 0 4px 4px
              rgba(255,255,255,.62),
            0 5px 0 #7b1111,
            0 9px 14px
              rgba(0,0,0,.18);
          color: #ffffff;
          font-size: 16px;
          font-weight: 900;
          letter-spacing: .2px;
        }

        .deleteAllPendingButton:active:not(:disabled),
        .deleteAllApprovedButton:active:not(:disabled) {
          transform: translateY(3px);
          box-shadow:
            inset 0 3px 4px
              rgba(255,255,255,.4),
            0 2px 0 #7b1111;
        }

        /* =====================================================
           SEARCH
        ===================================================== */

        .searchWrapper {
          min-height: 62px;

          margin-bottom: 26px;

          display: flex;

          border:
            2px solid #328dbb;

          border-radius: 11px;

          overflow: hidden;

          background: white;

          box-shadow:
            inset 0 2px 4px
              rgba(
                0,
                0,
                0,
                .08
              );
        }

        .searchInput {
          flex: 1;

          min-width: 0;

          padding:
            0 18px;

          border: none;

          outline: none;

          background: transparent;

          font-size: 18px;
        }

        .clearButton {
          width: 60px;

          border: none;

          color: #a41414;

          background: transparent;

          font-size: 29px;

          font-weight: 900;
        }

        /* =====================================================
           CREATE
        ===================================================== */

        .createArea {
          width:
            min(
              720px,
              100%
            );

          margin: 0 auto;

          display: flex;

          flex-direction: column;

          gap: 16px;
        }

        .createArea label {
          font-size: 20px;

          font-weight: 800;
        }

        .createArea input {
          width: 100%;

          min-height: 62px;

          padding:
            0 18px;

          border:
            2px solid #60686c;

          border-radius: 11px;

          outline: none;

          background: white;

          font-size: 19px;

          box-shadow:
            inset 0 3px 4px
              rgba(
                0,
                0,
                0,
                .1
              );
        }

        .createButton {
          min-height: 58px;

          margin:
            6px auto 0;

          padding:
            0 35px;

          border:
            3px solid #277447;

          border-radius: 11px;

          color: #14552f;

          background:
            linear-gradient(
              #d8f8e0,
              #78cc91
            );

          box-shadow:
            inset 0 5px 4px
              rgba(
                255,
                255,
                255,
                .7
              ),

            0 5px 0
              #286a3f;

          font-size: 18px;

          font-weight: 900;
        }

        .createdResult {
          margin-top: 22px;

          padding: 25px;

          display: flex;

          flex-direction: column;

          align-items: center;

          gap: 12px;

          border:
            3px solid #168fc9;

          border-radius: 16px;

          background:
            linear-gradient(
              #effaff,
              #cdeefa
            );

          box-shadow:
            inset 0 5px 5px
              white,

            0 5px 0
              #168fc9;

          text-align: center;
        }

        .createdResult > span {
          color: #555;

          font-weight: 800;
        }

        .createdResult h3 {
          margin: 0;

          font-size: 24px;
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
              #c7efff,
              #63b6df
            );

          box-shadow:
            0 4px 0
              #174461;

          font-weight: 800;
        }

        /* =====================================================
           BULK CREATE
        ===================================================== */

        .bulkCreateArea {
          width:
            min(
              950px,
              100%
            );

          margin: 0 auto;

          display: flex;

          flex-direction: column;

          gap: 17px;
        }

        .bulkInfo {
          padding: 16px 18px;

          border:
            2px solid #6a4f99;

          border-radius: 12px;

          color: #4f3477;

          background: #f4edff;

          font-size: 17px;

          font-weight: 700;

          line-height: 1.45;
        }

        .bulkCreateArea label {
          font-size: 20px;

          font-weight: 800;
        }

        .bulkCreateArea input {
          width: 100%;

          min-height: 62px;

          padding:
            0 18px;

          border:
            2px solid #60686c;

          border-radius: 11px;

          outline: none;

          background: white;

          font-size: 21px;

          font-weight: 800;

          box-shadow:
            inset 0 3px 4px
              rgba(
                0,
                0,
                0,
                .1
              );
        }

        .bulkCreateButton {
          min-height: 60px;

          margin:
            6px auto 0;

          padding:
            0 35px;

          border:
            3px solid #65478f;

          border-radius: 11px;

          color: #43296b;

          background:
            linear-gradient(
              #f1e6ff,
              #bfa1e4
            );

          box-shadow:
            inset 0 5px 4px
              rgba(
                255,
                255,
                255,
                .7
              ),

            0 5px 0
              #65478f;

          font-size: 18px;

          font-weight: 900;
        }

        .bulkResult {
          margin-top: 20px;

          padding: 20px;

          border:
            3px solid #65478f;

          border-radius: 16px;

          background:
            linear-gradient(
              #fbf8ff,
              #eee4fb
            );

          box-shadow:
            inset 0 5px 5px
              white,

            0 5px 0
              #65478f;
        }

        .bulkResultHeader {
          margin-bottom: 18px;

          display: flex;

          align-items: center;

          justify-content:
            space-between;

          gap: 15px;

          flex-wrap: wrap;
        }

        .bulkResultHeader > div:first-child {
          display: flex;

          align-items: center;

          gap: 10px;
        }

        .bulkResultHeader span {
          color: #555;

          font-weight: 800;
        }

        .bulkResultHeader strong {
          color: #4f3477;

          font-size: 24px;
        }

        .bulkResultActions {
          display: flex;

          flex-wrap: wrap;

          gap: 10px;
        }

        .bulkResultActions button {
          min-height: 46px;

          padding:
            0 16px;

          border:
            2px solid #65478f;

          border-radius: 9px;

          color: #43296b;

          background:
            linear-gradient(
              #f5ecff,
              #cbb3e9
            );

          font-weight: 900;
        }

        .bulkTableWrap {
          max-height: 520px;

          overflow: auto;

          border:
            2px solid #8e78ad;

          border-radius: 12px;

          background: white;
        }

        .bulkTable {
          width: 100%;

          border-collapse:
            collapse;

          font-family:
            "Times New Roman",
            serif;

          font-size: 16px;
        }

        .bulkTable th,
        .bulkTable td {
          padding:
            11px 12px;

          border-bottom:
            1px solid #ddd;

          text-align: left;
        }

        .bulkTable th {
          position: sticky;

          top: 0;

          z-index: 1;

          color: #43296b;

          background: #e9ddf8;

          font-weight: 900;
        }

        .bulkTable td:first-child,
        .bulkTable th:first-child {
          width: 70px;

          text-align: center;
        }

        .bulkTable td strong {
          color: #073b68;

          font-family:
            Consolas,
            monospace;

          white-space: nowrap;
        }

        /* =====================================================
           USER CARDS
        ===================================================== */

        .usersGrid {
          display: grid;

          grid-template-columns:
            repeat(
              2,
              minmax(
                0,
                1fr
              )
            );

          gap: 23px;
        }

        .userCard {
          padding: 24px;

          border:
            3px solid #51595d;

          border-radius: 17px;

          background:
            linear-gradient(
              145deg,
              #ffffff 0%,
              #eeeeee 48%,
              #c5c5c5 100%
            );

          box-shadow:
            inset 0 7px 7px
              rgba(
                255,
                255,
                255,
                .95
              ),

            inset 0 -5px 5px
              rgba(
                0,
                0,
                0,
                .1
              ),

            0 7px 0
              #555d61,

            0 13px 18px
              rgba(
                0,
                0,
                0,
                .22
              );
        }

        .userName {
          margin-bottom: 9px;

          font-size: 25px;

          font-weight: 900;
        }

        .statusBadge {
          display: inline-block;

          margin-bottom: 14px;

          padding:
            7px 12px;

          border-radius: 30px;

          font-size: 13px;

          font-weight: 900;
        }

        .statusBadge.approved {
          border:
            1px solid #57a66f;

          color: #176438;

          background: #d4f1dc;
        }

        .statusBadge.pending {
          border:
            1px solid #c6a939;

          color: #795c0b;

          background: #fff1b6;
        }

        .statusBadge.blocked {
          border:
            1px solid #c45b5b;

          color: #8b1919;

          background: #f3d2d2;
        }

        .statusBadge.unused {
          border:
            1px solid #aaa;

          color: #555;

          background: #e4e4e4;
        }

        .codeBox {
          margin:
            10px 0 17px;

          padding: 14px;

          border:
            2px solid #7ba8bb;

          border-radius: 11px;

          background:
            linear-gradient(
              #f8fdff,
              #dceff6
            );

          box-shadow:
            inset 0 3px 4px
              rgba(
                0,
                0,
                0,
                .08
              );
        }

        .codeLabel {
          margin-bottom: 9px;

          color: #555;

          font-size: 11px;

          font-weight: 900;
        }

        .codeRow {
          display: flex;

          align-items: center;

          justify-content:
            space-between;

          gap: 10px;
        }

        .codeRow strong {
          overflow-wrap:
            anywhere;

          color: #07517e;

          font-family:
            Consolas,
            monospace;

          font-size: 19px;
        }

        .copyButton {
          min-height: 40px;

          padding:
            0 12px;

          border:
            2px solid #168fc9;

          border-radius: 8px;

          color: #07517e;

          background:
            linear-gradient(
              #e6f8ff,
              #a7dbef
            );

          box-shadow:
            0 3px 0
              #168fc9;

          font-weight: 800;
        }

        .dateGrid {
          display: grid;

          grid-template-columns:
            repeat(
              3,
              minmax(
                0,
                1fr
              )
            );

          gap: 9px;
        }

        .dateGrid > div {
          min-height: 72px;

          padding: 9px;

          border:
            1px solid #999;

          border-radius: 9px;

          background:
            rgba(
              255,
              255,
              255,
              .65
            );

          text-align: center;
        }

        .dateGrid span {
          display: block;

          margin-bottom: 6px;

          color: #666;

          font-size: 11px;
        }

        .dateGrid strong {
          font-size: 12px;

          line-height: 1.3;
        }

        .userActions {
          margin-top: 18px;

          display: flex;

          flex-wrap: wrap;

          gap: 10px;
        }

        .userActions button {
          flex: 1;

          min-width: 150px;

          min-height: 49px;

          padding:
            8px 12px;

          border-radius: 9px;

          font-weight: 900;
        }

        .approveButton {
          border:
            2px solid #277447;

          color: #14552f;

          background:
            linear-gradient(
              #d8f6e0,
              #78cb90
            );

          box-shadow:
            0 4px 0
              #277447;
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

          box-shadow:
            0 4px 0
              #7f1818;
        }

        .blockButton {
          border:
            2px solid #8b6c18;

          color: #5f4908;

          background:
            linear-gradient(
              #ffeaa0,
              #d9b342
            );

          box-shadow:
            0 4px 0
              #8b6c18;
        }

        .restoreButton {
          border:
            2px solid #266f76;

          color: #15565c;

          background:
            linear-gradient(
              #c9f4f6,
              #6bc5ca
            );

          box-shadow:
            0 4px 0
              #266f76;
        }

        .emptyBox {
          min-height: 160px;

          display: flex;

          align-items: center;

          justify-content: center;

          padding: 25px;

          color: #555;

          font-size: 19px;

          font-weight: 700;

          text-align: center;
        }

        /* =====================================================
           RESPONSIVE
        ===================================================== */

        @media (
          max-width: 1100px
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
            flex-direction: column;
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

        }

        @media (
          max-width: 650px
        ) {

          .page {
            padding:
              10px 7px 55px;
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
          .statistics,
          .managementPanel,
          .contentPanel {
            width: 100%;
          }

          .heroPanel {
            margin-top: 70px;

            min-height: 150px;

            padding:
              55px 14px 22px;
          }

          .heroPanel h1 {
            font-size: 27px;
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

            gap: 9px;
          }

          .statCard {
            min-height: 100px;
          }

          .statCard strong {
            font-size: 30px;
          }

          .managementPanel {
            padding:
              65px 12px 20px;
          }

          .managementGrid {
            grid-template-columns:
              1fr;
          }

          .managementCard {
            min-height: 145px;
          }

          .contentPanel {
            padding:
              65px 8px 18px;
          }

          .innerPanel {
            padding: 12px;
          }

          .floatingTitle,
          .contentTitle {
            min-width: 210px;

            max-width: 92%;

            min-height: 55px;

            padding:
              8px 14px;

            font-size: 21px;

            white-space: normal;

            text-align: center;
          }

          .dateGrid {
            grid-template-columns:
              1fr;
          }

          .codeRow {
            flex-direction: column;

            align-items: stretch;
          }

          .copyButton {
            width: 100%;
          }

          .userCard {
            padding: 16px 11px;
          }

          .userActions {
            flex-direction: column;
          }

          .userActions button {
            width: 100%;

            min-width: 0;
          }

          .createdResult {
            padding: 16px 9px;
          }

          .createdResult strong {
            font-size: 19px;
          }

          .bulkResult {
            padding: 12px 7px;
          }

          .bulkResultActions {
            width: 100%;
          }

          .bulkResultActions button {
            width: 100%;
          }

          .bulkTable {
            font-size: 14px;
          }

        }

      `}</style>

    </main>
  );
}

/* =========================================================
   SEARCH BOX
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

    </div>
  );
}
