"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

type ProfileFinance = {
  id: string;
  profileCode: string;
  fullName: string;
  status: string;
  currentDebt: number;
  advance: number;
  totalPaid: number;
  totalDebtAdded: number;
  lastFinanceAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  dueDate: string | null;
  periodMonths: number | null;
  daysLeft: number | null;
  isOverdue: boolean;
};

type FinanceEntry = {
  id: string;
  profileId: string;
  fullName: string;
  profileCode: string;
  entryType: string;
  amount: number;
  note: string | null;
  occurredAt: string | null;
  isVoided: boolean;
  voidedAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  dueDate: string | null;
  periodMonths: number | null;
};

function money(
  value: number
) {
  return new Intl.NumberFormat(
    "uz-UZ"
  ).format(
    Math.round(value)
  ) + " so‘m";
}

function parseMoneyInput(
  value: string
) {
  const normalized = String(value || "")
    .trim()
    .replace(/[^0-9-]/g, "");

  if (
    !normalized ||
    normalized === "-"
  ) {
    return Number.NaN;
  }

  return Number(normalized);
}

function dateTime(
  value: string | null
) {
  if (!value) {
    return "—";
  }

  const raw =
    String(value).trim();

  const parsed =
    new Date(raw);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return raw;
  }

  const parts =
    new Intl.DateTimeFormat(
      "uz-UZ",
      {
        timeZone:
          "Asia/Tashkent",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }
    ).formatToParts(parsed);

  const getPart = (
    type: Intl.DateTimeFormatPartTypes
  ) =>
    parts.find(
      (part) =>
        part.type === type
    )?.value || "";

  const day =
    getPart("day");
  const month =
    getPart("month");
  const year =
    getPart("year");
  const hour =
    getPart("hour");
  const minute =
    getPart("minute");

  return `${day}.${month}.${year} ${hour}:${minute}`;
}

function entryText(
  type: string
) {
  if (
    type === "payment"
  ) {
    return "To‘lov";
  }

  if (
    type === "debt"
  ) {
    return "Qarz qo‘shildi";
  }

  if (
    type === "period"
  ) {
    return "To‘lov muddati";
  }

  return "Qarz tuzatildi";
}

function dateOnly(
  value: string | null
) {
  if (!value) return "—";

  const raw =
    String(value).trim();

  const isoMatch =
    raw.match(
      /(\\d{4})-(\\d{2})-(\\d{2})/
    );

  if (isoMatch) {
    return `${isoMatch[3]}.${isoMatch[2]}.${isoMatch[1]}`;
  }

  const parsed =
    new Date(raw);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return raw;
  }

  const parts =
    new Intl.DateTimeFormat(
      "uz-UZ",
      {
        timeZone:
          "Asia/Tashkent",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).formatToParts(parsed);

  const getPart = (
    type: Intl.DateTimeFormatPartTypes
  ) =>
    parts.find(
      (part) =>
        part.type === type
    )?.value || "";

  return `${getPart("day")}.${getPart("month")}.${getPart("year")}`;
}

function todayInput() {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Asia/Tashkent",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).formatToParts(
      new Date()
    );

  const getPart = (
    type: Intl.DateTimeFormatPartTypes
  ) =>
    parts.find(
      (part) =>
        part.type === type
    )?.value || "";

  return `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
}

function dateTimeInput(
  value: string | null
) {
  if (!value) {
    return "";
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return "";
  }

  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Asia/Tashkent",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }
    ).formatToParts(
      parsed
    );

  const getPart = (
    type: Intl.DateTimeFormatPartTypes
  ) =>
    parts.find(
      (part) =>
        part.type === type
    )?.value || "";

  return `${getPart("year")}-${getPart("month")}-${getPart("day")}T${getPart("hour")}:${getPart("minute")}`;
}

export default function AdminPaymentsPage() {
  const router =
    useRouter();

  const [profiles, setProfiles] =
    useState<ProfileFinance[]>(
      []
    );

  const [entries, setEntries] =
    useState<FinanceEntry[]>(
      []
    );

  const [summary, setSummary] =
    useState({
      totalDebt: 0,
      totalAdvance: 0,
      totalPaid: 0,
      debtors: 0,
      overdue: 0,
    });

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState("all");

  const [loading, setLoading] =
    useState(true);

  const [modal, setModal] =
    useState<
      "debt" |
      "payment" |
      "period" |
      null
    >(null);

  const [selected, setSelected] =
    useState<ProfileFinance | null>(
      null
    );

  const [amount, setAmount] =
    useState("");

  const [note, setNote] =
    useState("");

  const [periodStart, setPeriodStart] =
    useState(todayInput());

  const [dueDate, setDueDate] =
    useState("");

  const [
    editingEntry,
    setEditingEntry,
  ] =
    useState<FinanceEntry | null>(
      null
    );

  const [
    editAmount,
    setEditAmount,
  ] =
    useState("");

  const [
    editNote,
    setEditNote,
  ] =
    useState("");

  const [
    editOccurredAt,
    setEditOccurredAt,
  ] =
    useState("");

  const [
    editPeriodStart,
    setEditPeriodStart,
  ] =
    useState("");

  const [
    editDueDate,
    setEditDueDate,
  ] =
    useState("");

  const [
    historyProfileId,
    setHistoryProfileId,
  ] =
    useState<string | null>(
      null
    );

  useEffect(() => {
    void load();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function json(
    response: Response
  ) {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  async function load() {
    setLoading(true);

    try {
      const response =
        await fetch(
          "/api/admin/payments",
          {
            cache: "no-store",
          }
        );

      const data =
        await json(
          response
        );

      if (!response.ok) {
        if (
          response.status === 403
        ) {
          router.replace("/");
          return;
        }

        throw new Error(
          data?.message ||
            "Moliyaviy ma’lumot yuklanmadi."
        );
      }

      setProfiles(
        Array.isArray(
          data?.profiles
        )
          ? data.profiles
          : []
      );

      setEntries(
        Array.isArray(
          data?.entries
        )
          ? data.entries
          : []
      );

      setSummary({
        totalDebt:
          Number(
            data?.summary
              ?.totalDebt || 0
          ),

        totalAdvance:
          Number(
            data?.summary
              ?.totalAdvance || 0
          ),

        totalPaid:
          Number(
            data?.summary
              ?.totalPaid || 0
          ),

        debtors:
          Number(
            data?.summary
              ?.debtors || 0
          ),

        overdue:
          Number(
            data?.summary
              ?.overdue || 0
          ),
      });
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Xatolik."
      );
    } finally {
      setLoading(false);
    }
  }

  async function post(
    payload: Record<
      string,
      unknown
    >
  ) {
    const response =
      await fetch(
        "/api/admin/payments",
        {
          method: "POST",
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
      await json(
        response
      );

    if (!response.ok) {
      throw new Error(
        data?.message ||
          "Amal bajarilmadi."
      );
    }

    return data;
  }

  function openDebt(
    item: ProfileFinance
  ) {
    setSelected(item);

    setAmount(
      String(
        Math.round(
          item.currentDebt
        )
      )
    );

    setNote("");

    setPeriodStart(
      item.periodStart ||
        todayInput()
    );

    setDueDate(
      item.dueDate || ""
    );

    setModal("debt");
  }

  function openPayment(
    item: ProfileFinance
  ) {
    setSelected(item);

    setAmount(
      item.currentDebt > 0
        ? String(
            Math.round(
              item.currentDebt
            )
          )
        : ""
    );

    setNote("");

    setModal(
      "payment"
    );
  }

  function openPeriod(
    item: ProfileFinance
  ) {
    setSelected(item);

    setAmount("");
    setNote("");

    setPeriodStart(
      item.periodStart ||
        todayInput()
    );

    setDueDate(
      item.dueDate || ""
    );

    setModal(
      "period"
    );
  }

  async function save(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!selected) {
      return;
    }

    const value =
      parseMoneyInput(amount);

    try {
      if (
        modal === "debt"
      ) {
        if (
          !Number.isFinite(
            value
          ) ||
          value < 0
        ) {
          throw new Error(
            "Qarz summasini to‘g‘ri kiriting."
          );
        }

        await post({
          action:
            "set-debt",
          profileId:
            selected.id,
          amount:
            value,
          note,
        });
      } else if (
        modal ===
        "payment"
      ) {
        if (
          !Number.isFinite(
            value
          ) ||
          value <= 0
        ) {
          throw new Error(
            "To‘langan summani to‘g‘ri kiriting."
          );
        }

        await post({
          action:
            "add-payment",
          profileId:
            selected.id,
          amount:
            value,
          note,
        });
      } else if (
        modal ===
        "period"
      ) {
        if (!periodStart) {
          throw new Error(
            "Boshlanish sanasini tanlang."
          );
        }

        if (!dueDate) {
          throw new Error(
            "To‘lov muddatini tanlang."
          );
        }

        if (
          dueDate <
          periodStart
        ) {
          throw new Error(
            "To‘lov muddati boshlanish sanasidan oldin bo‘lishi mumkin emas."
          );
        }

        await post({
          action:
            "set-period",
          profileId:
            selected.id,
          periodStart,
          dueDate,
          note,
        });
      }

      setModal(null);
      setSelected(null);
      setAmount("");
      setNote("");

      await load();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Xatolik."
      );
    }
  }

  function openEditEntry(
    item: FinanceEntry
  ) {
    setHistoryProfileId(null);
    setEditingEntry(item);

    setEditAmount(
      item.entryType ===
        "period"
        ? ""
        : String(
            item.amount
          )
    );

    setEditNote(
      item.note || ""
    );

    setEditOccurredAt(
      dateTimeInput(
        item.occurredAt
      )
    );

    setEditPeriodStart(
      item.periodStart || ""
    );

    setEditDueDate(
      item.dueDate || ""
    );
  }

  async function saveEditEntry(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!editingEntry) {
      return;
    }

    try {
      if (
        editingEntry.entryType ===
        "period"
      ) {
        if (
          !editPeriodStart ||
          !editDueDate
        ) {
          throw new Error(
            "Boshlanish sanasi va to‘lov muddatini kiriting."
          );
        }

        if (
          editDueDate <
          editPeriodStart
        ) {
          throw new Error(
            "To‘lov muddati boshlanish sanasidan oldin bo‘lishi mumkin emas."
          );
        }

        await post({
          action:
            "edit-entry",
          entryId:
            editingEntry.id,
          periodStart:
            editPeriodStart,
          dueDate:
            editDueDate,
          occurredAt:
            editOccurredAt,
          note:
            editNote,
        });
      } else {
        const value =
          parseMoneyInput(
            editAmount
          );

        if (
          !Number.isFinite(
            value
          )
        ) {
          throw new Error(
            "Summani to‘g‘ri kiriting."
          );
        }

        if (
          (
            editingEntry.entryType ===
              "payment" ||
            editingEntry.entryType ===
              "debt"
          ) &&
          value <= 0
        ) {
          throw new Error(
            "Summa 0 dan katta bo‘lishi kerak."
          );
        }

        if (
          editingEntry.entryType ===
            "adjustment" &&
          value === 0
        ) {
          throw new Error(
            "Tuzatish summasi 0 bo‘lishi mumkin emas."
          );
        }

        await post({
          action:
            "edit-entry",
          entryId:
            editingEntry.id,
          amount:
            value,
          occurredAt:
            editOccurredAt,
          note:
            editNote,
        });
      }

      setEditingEntry(
        null
      );

      await load();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Tahrirlashda xatolik."
      );
    }
  }

  function showUserHistory(
    item: ProfileFinance
  ) {
    setHistoryProfileId(
      item.id
    );
  }

  const visibleHistoryEntries =
    useMemo(
      () =>
        historyProfileId
          ? entries.filter(
              (item) =>
                item.profileId ===
                historyProfileId
            )
          : [],
      [
        entries,
        historyProfileId,
      ]
    );

  const visible =
    useMemo(() => {
      const needle =
        search
          .trim()
          .toLowerCase();

      return profiles.filter(
        (item) => {
          const matchesSearch =
            !needle ||
            item.fullName
              .toLowerCase()
              .includes(
                needle
              ) ||
            item.profileCode
              .toLowerCase()
              .includes(
                needle
              );

          const matchesFilter =
            filter === "all" ||
            (
              filter ===
                "debt" &&
              item.currentDebt >
                0
            ) ||
            (
              filter ===
                "clear" &&
              item.currentDebt ===
                0 &&
              item.advance ===
                0
            ) ||
            (
              filter ===
                "advance" &&
              item.advance >
                0
            ) ||
            (
              filter ===
                "overdue" &&
              item.isOverdue
            );

          return (
            matchesSearch &&
            matchesFilter
          );
        }
      );
    }, [
      profiles,
      search,
      filter,
    ]);

  return (
    <main className="page">
      <header className="paymentsTopBar">
        <button
          type="button"
          className="paymentsOwnerButton"
          onClick={() =>
            router.push("/")
          }
        >
          Qurbonov Siyovush Jamaliddinzoda
        </button>

        <div className="paymentsTopButtons">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/admin/requests"
              )
            }
          >
            Foydalanuvchilar
          </button>

          <button
            type="button"
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
            onClick={() =>
              router.push("/")
            }
          >
            Asosiy sahifa
          </button>
        </div>
      </header>

      <section className="paymentsTitlePanel">
        <div className="paymentsTitleTab">
          To‘lovlar boshqaruvi
        </div>
      </section>

      <section className="stats">
        <article className="debtStat">
          <span>
            Umumiy qarzdorlik
          </span>

          <strong>
            {money(
              summary.totalDebt
            )}
          </strong>
        </article>

        <article className="paidStat">
          <span>
            Jami kiritilgan to‘lov
          </span>

          <strong>
            {money(
              summary.totalPaid
            )}
          </strong>
        </article>

        <article>
          <span>
            Qarzdor foydalanuvchi
          </span>

          <strong>
            {
              summary.debtors
            }{" "}
            ta
          </strong>
        </article>

        <article className="advanceStat">
          <span>
            Avans
          </span>

          <strong>
            {money(
              summary.totalAdvance
            )}
          </strong>
        </article>

        <article className="overdueStat">
          <span>
            Muddati o‘tgan
          </span>

          <strong>
            {summary.overdue} ta
          </strong>
        </article>
      </section>

      <section className="panel">
        <div className="tools">
          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Foydalanuvchi ismi yoki profil ID..."
          />

          <select
            value={filter}
            onChange={(event) =>
              setFilter(
                event.target.value
              )
            }
          >
            <option value="all">
              Barcha foydalanuvchilar
            </option>

            <option value="debt">
              Qarzdorlar
            </option>

            <option value="clear">
              Qarzi yo‘q
            </option>

            <option value="advance">
              Avansi bor
            </option>

            <option value="overdue">
              Muddati o‘tgan
            </option>
          </select>

          <button
            type="button"
            onClick={() =>
              void load()
            }
          >
            ↻ Yangilash
          </button>
        </div>

        <div className="sectionTitle">
          <h2>
            Foydalanuvchilar
          </h2>

          <span>
            {
              visible.length
            }{" "}
            ta
          </span>
        </div>

        <div className="userGrid">
          {visible.map(
            (item) => (
              <article
                key={
                  item.id
                }
                className={`userCard ${
                  item.isOverdue
                    ? "overdueCard"
                    : ""
                }`}
              >
                <div className="userTop">
                  <div>
                    <h3>
                      {
                        item.fullName
                      }
                    </h3>

                    <code>
                      {
                        item.profileCode
                      }
                    </code>
                  </div>

                  <div
                    className={
                      item.currentDebt >
                      0
                        ? "debtBadge"
                        : item.advance >
                            0
                          ? "advanceBadge"
                          : "clearBadge"
                    }
                  >
                    {item.currentDebt >
                    0
                      ? "Qarzdor"
                      : item.advance >
                          0
                        ? "Avans"
                        : "Qarzi yo‘q"}
                  </div>
                </div>

                <div className="moneyGrid">
                  <div>
                    <span>
                      Hozirgi qarz
                    </span>

                    <strong className="debtValue">
                      {money(
                        item.currentDebt
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Jami to‘lagan
                    </span>

                    <strong className="paidValue">
                      {money(
                        item.totalPaid
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Avans
                    </span>

                    <strong>
                      {money(
                        item.advance
                      )}
                    </strong>
                  </div>
                </div>

                <div className="periodBox">
                  <div>
                    <span>
                      To‘lov davri
                    </span>

                    <strong>
                      {item.periodStart &&
                      item.periodEnd
                        ? `${dateOnly(
                            item.periodStart
                          )} — ${dateOnly(
                            item.periodEnd
                          )}`
                        : "Belgilanmagan"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Oxirgi muddat
                    </span>

                    <strong
                      className={
                        item.isOverdue
                          ? "overdueText"
                          : ""
                      }
                    >
                      {dateOnly(
                        item.dueDate
                      )}
                      {item.daysLeft !==
                        null &&
                      item.currentDebt >
                        0
                        ? item.daysLeft <
                          0
                          ? ` • ${Math.abs(
                              item.daysLeft
                            )} kun o‘tgan`
                          : ` • ${item.daysLeft} kun qoldi`
                        : ""}
                    </strong>
                  </div>
                </div>

                <div className="lastAction">
                  Oxirgi o‘zgarish:{" "}
                  <strong>
                    {dateTime(
                      item.lastFinanceAt
                    )}
                  </strong>
                </div>

                <div className="cardButtons">
                  <button
                    type="button"
                    className="debtButton"
                    onClick={() =>
                      openDebt(item)
                    }
                  >
                    Qarzini belgilash
                  </button>

                  <button
                    type="button"
                    className="paymentButton"
                    onClick={() =>
                      openPayment(item)
                    }
                  >
                    To‘lov kiritish
                  </button>

                  <button
                    type="button"
                    className="periodButton"
                    onClick={() =>
                      openPeriod(item)
                    }
                  >
                    Muddat belgilash
                  </button>

                  <button
                    type="button"
                    className="historyButton"
                    onClick={() =>
                      showUserHistory(
                        item
                      )
                    }
                  >
                    ✎ To‘lovlarni tahrirlash
                  </button>
                </div>
              </article>
            )
          )}

          {!loading &&
            visible.length ===
              0 && (
              <div className="empty">
                Foydalanuvchi topilmadi.
              </div>
            )}

          {loading && (
            <div className="empty">
              Yuklanmoqda...
            </div>
          )}
        </div>
      </section>

      {historyProfileId && (
        <div
          className="modalBackdrop"
          onMouseDown={() =>
            setHistoryProfileId(null)
          }
        >
          <div
            className="modal historyModal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="historyModalHeader">
              <div>
                <h2>
                  To‘lovlarni tahrirlash
                </h2>
                <div className="selectedUser compactUser">
                  <strong>
                    {profiles.find(
                      (item) =>
                        item.id ===
                        historyProfileId
                    )?.fullName ||
                      "Foydalanuvchi"}
                  </strong>
                  <span>
                    {profiles.find(
                      (item) =>
                        item.id ===
                        historyProfileId
                    )?.profileCode ||
                      ""}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="closeHistoryButton"
                onClick={() =>
                  setHistoryProfileId(null)
                }
              >
                ✕
              </button>
            </div>

            <div className="historyModalList">
              {visibleHistoryEntries.length === 0 && (
                <div className="empty compactEmpty">
                  Hozircha to‘lov yozuvlari yo‘q.
                </div>
              )}

              {visibleHistoryEntries.map(
                (item) => (
                  <article
                    key={item.id}
                    className={
                      item.isVoided
                        ? "historyRow voided"
                        : "historyRow"
                    }
                  >
                    <div className="historyRowMain">
                      <strong>
                        {entryText(
                          item.entryType
                        )}
                      </strong>
                      <span>
                        {dateTime(
                          item.occurredAt
                        )}
                        {item.note
                          ? ` • ${item.note}`
                          : ""}
                      </span>
                    </div>

                    <div
                      className={`entryAmount ${item.entryType}`}
                    >
                      {item.entryType ===
                      "period"
                        ? dateOnly(
                            item.dueDate
                          )
                        : (
                          <>
                            {item.entryType ===
                            "payment"
                              ? "− "
                              : item.amount > 0
                                ? "+ "
                                : ""}
                            {money(
                              Math.abs(
                                item.amount
                              )
                            )}
                          </>
                        )}
                    </div>

                    {!item.isVoided ? (
                      <div className="entryButtons">
                        <button
                          type="button"
                          className="editEntryButton"
                          onClick={() =>
                            openEditEntry(
                              item
                            )
                          }
                        >
                          ✎ Tahrirlash
                        </button>

                        <button
                          type="button"
                          className="voidButton"
                          onClick={() => {
                            if (
                              window.confirm(
                                "Ushbu yozuvni bekor qilasizmi?"
                              )
                            ) {
                              void post({
                                action:
                                  "void-entry",
                                entryId:
                                  item.id,
                              }).then(
                                () =>
                                  load()
                              );
                            }
                          }}
                        >
                          Bekor qilish
                        </button>
                      </div>
                    ) : (
                      <span className="voidLabel">
                        Bekor qilingan
                      </span>
                    )}
                  </article>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {modal &&
        selected && (
          <div
            className="modalBackdrop"
            onMouseDown={() =>
              setModal(null)
            }
          >
            <form
              className="modal"
              onSubmit={save}
              onMouseDown={(event) =>
                event.stopPropagation()
              }
            >
              <h2>
                {modal ===
                "debt"
                  ? "Qarzini belgilash"
                  : modal ===
                      "payment"
                    ? "To‘lov kiritish"
                    : "Muddat belgilash"}
              </h2>

              <div className="selectedUser">
                <strong>
                  {
                    selected.fullName
                  }
                </strong>

                <span>
                  {
                    selected.profileCode
                  }
                </span>
              </div>

              {modal ===
                "debt" && (
                <div className="currentInfo">
                  Hozirgi qarz:{" "}
                  <strong>
                    {money(
                      selected.currentDebt
                    )}
                  </strong>
                </div>
              )}

              {modal ===
                "period" && (
                <div className="currentInfo">
                  Hozirgi muddat:{" "}
                  <strong>
                    {dateOnly(
                      selected.dueDate
                    )}
                  </strong>
                </div>
              )}

              {modal !==
                "period" && (
                <label>
                  {modal ===
                  "debt"
                    ? "Yangi qarz summasi"
                    : "To‘langan summa"}

                  <input
                    autoFocus
                    required
                    type="text"
                    inputMode="numeric"
                    placeholder="Masalan: 329.000"
                    value={amount}
                    onChange={(event) =>
                      setAmount(
                        event.target.value
                      )
                    }
                  />
                </label>
              )}

              {modal ===
                "period" && (
                <div className="periodFields">
                  <label>
                    Boshlanish sanasi
                    <input
                      type="date"
                      required
                      value={
                        periodStart
                      }
                      onChange={(event) =>
                        setPeriodStart(
                          event.target.value
                        )
                      }
                    />
                  </label>

                  <label>
                    To‘lov muddati
                    <input
                      type="date"
                      required
                      min={
                        periodStart ||
                        undefined
                      }
                      value={dueDate}
                      onChange={(event) =>
                        setDueDate(
                          event.target.value
                        )
                      }
                    />
                  </label>
                </div>
              )}

              <label>
                Izoh
                <textarea
                  value={note}
                  onChange={(event) =>
                    setNote(
                      event.target.value
                    )
                  }
                  placeholder={
                    modal ===
                    "period"
                      ? "Masalan: sentabr oyi uchun to‘lov muddati"
                      : modal ===
                          "payment"
                        ? "Masalan: 21-sentabr kuni to‘landi"
                        : "Masalan: sentabr oyi uchun"
                  }
                />
              </label>

              <div className="modalActions">
                <button
                  type="button"
                  onClick={() =>
                    setModal(null)
                  }
                >
                  Bekor qilish
                </button>

                <button
                  type="submit"
                  className={
                    modal ===
                    "debt"
                      ? "saveDebt"
                      : modal ===
                          "payment"
                        ? "savePayment"
                        : "savePeriod"
                  }
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        )}

      {editingEntry && (
        <div
          className="modalBackdrop"
          onMouseDown={() =>
            setEditingEntry(
              null
            )
          }
        >
          <form
            className="modal editModal"
            onSubmit={
              saveEditEntry
            }
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <h2>
              To‘lov yozuvini tahrirlash
            </h2>

            <div className="selectedUser">
              <strong>
                {
                  editingEntry.fullName
                }
              </strong>

              <span>
                {
                  editingEntry.profileCode
                }
              </span>
            </div>

            <div className="editTypeInfo">
              <span>Yozuv turi</span>
              <strong>
                {entryText(
                  editingEntry.entryType
                )}
              </strong>
            </div>

            {editingEntry.entryType !==
              "period" && (
              <label>
                Summa
                <input
                  autoFocus
                  required
                  type="text"
                  inputMode="numeric"
                  placeholder="Masalan: 329.000"
                  value={
                    editAmount
                  }
                  onChange={(event) =>
                    setEditAmount(
                      event.target.value
                    )
                  }
                />
              </label>
            )}

            {editingEntry.entryType ===
              "period" && (
              <div className="periodFields">
                <label>
                  Boshlanish sanasi
                  <input
                    type="date"
                    required
                    value={
                      editPeriodStart
                    }
                    onChange={(event) =>
                      setEditPeriodStart(
                        event.target.value
                      )
                    }
                  />
                </label>

                <label>
                  To‘lov muddati
                  <input
                    type="date"
                    required
                    min={
                      editPeriodStart ||
                      undefined
                    }
                    value={
                      editDueDate
                    }
                    onChange={(event) =>
                      setEditDueDate(
                        event.target.value
                      )
                    }
                  />
                </label>
              </div>
            )}

            <label>
              Sana va vaqt
              <input
                type="datetime-local"
                required
                value={
                  editOccurredAt
                }
                onChange={(event) =>
                  setEditOccurredAt(
                    event.target.value
                  )
                }
              />
            </label>

            <label>
              Izoh
              <textarea
                value={
                  editNote
                }
                onChange={(event) =>
                  setEditNote(
                    event.target.value
                  )
                }
                placeholder="Izoh ixtiyoriy"
              />
            </label>

            <div className="editWarning">
              Saqlanganda aynan shu yozuv yangilanadi.
              Summa ustiga qo‘shilmaydi.
            </div>

            <div className="modalActions">
              <button
                type="button"
                onClick={() =>
                  setEditingEntry(
                    null
                  )
                }
              >
                Bekor qilish
              </button>

              <button
                type="submit"
                className="saveEdit"
              >
                O‘zgarishni saqlash
              </button>
            </div>
          </form>
        </div>
      )}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          padding: 26px;
          background:
            linear-gradient(180deg, #eef8fd, #f7f9fb);
          color: #102f40;
          font-family:
            "Bell MT",
            Georgia,
            "Times New Roman",
            serif;
        }

        button,
        input,
        select,
        textarea {
          font-family: inherit;
        }

        .paymentsTopBar {
          width: min(1495px, calc(100% - 52px));
          min-height: 94px;
          margin: 0 auto 78px;
          padding: 16px 28px;
          border: 2px solid #183f53;
          border-radius: 22px;
          background:
            linear-gradient(
              180deg,
              #91ddfb 0%,
              #55b8e4 56%,
              #42a6d5 100%
            );
          box-shadow:
            inset 0 3px 0 rgba(255,255,255,.68),
            inset 0 -5px 0 rgba(25,91,126,.34),
            0 7px 0 #163f53,
            0 14px 25px rgba(0,0,0,.14);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .paymentsOwnerButton {
          min-width: 410px;
          min-height: 58px;
          padding: 10px 24px;
          border: 2px solid #4d5a60;
          border-radius: 13px;
          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #f3f3f3 42%,
              #c9c9c9 100%
            );
          color: #111;
          box-shadow:
            inset 0 3px 0 #fff,
            inset 0 -3px 0 #999,
            0 5px 0 #59676d;
          font-size: 21px;
          font-weight: 700;
          cursor: pointer;
        }

        .paymentsTopButtons {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 13px;
          flex-wrap: wrap;
        }

        .paymentsTopButtons button,
        .tools button,
        .cardButtons button,
        .voidButton,
        .editEntryButton,
        .showAllHistoryButton {
          min-height: 46px;
          padding: 8px 16px;
          border: 2px solid #586267;
          border-radius: 10px;
          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #eeeeee 48%,
              #c8c8c8 100%
            );
          color: #111;
          box-shadow:
            inset 0 2px 0 #fff,
            0 5px 0 #697276;
          font-weight: 700;
          cursor: pointer;
        }

        .paymentsTitlePanel {
          position: relative;
          max-width: 1020px;
          min-height: 145px;
          margin: 0 auto 68px;
          border: 2px solid #252d31;
          border-radius: 23px;
          background:
            linear-gradient(
              180deg,
              #666a6c 0%,
              #55595b 50%,
              #414547 100%
            );
          box-shadow:
            inset 0 3px 0 rgba(255,255,255,.12),
            inset 0 -4px 0 rgba(0,0,0,.25),
            0 8px 0 #282e31,
            0 17px 26px rgba(0,0,0,.17);
        }

        .paymentsTitleTab {
          position: absolute;
          left: 50%;
          top: -31px;
          transform: translateX(-50%);
          min-width: 310px;
          padding: 12px 28px;
          border: 2px solid #174158;
          border-radius: 15px;
          background:
            linear-gradient(
              180deg,
              #b6edff 0%,
              #6dc9ef 52%,
              #39a3d5 100%
            );
          color: #074c76;
          box-shadow:
            inset 0 3px 0 rgba(255,255,255,.72),
            0 6px 0 #18516f;
          text-align: center;
          font-size: 27px;
          font-weight: 700;
          white-space: nowrap;
        }

        .stats {
          max-width: 1580px;
          margin: 0 auto 18px;
          display: grid;
          grid-template-columns:
            repeat(5, minmax(0, 1fr));
          gap: 12px;
        }

        .stats article {
          padding: 18px;
          border: 1px solid #d0d0d0;
          border-radius: 13px;
          background:
            linear-gradient(180deg, #fff, #ededed);
          box-shadow:
            inset 0 2px 0 #fff,
            0 4px 0 #aaa;
        }

        .stats span,
        .stats strong {
          display: block;
        }

        .stats span {
          margin-bottom: 6px;
          color: #666;
          font-size: 13px;
        }

        .stats strong {
          font-size: 24px;
        }

        .debtStat strong {
          color: #bc2525;
        }

        .paidStat strong {
          color: #14793b;
        }

        .advanceStat strong {
          color: #1f6fa6;
        }

        .overdueStat strong {
          color: #b72c2c;
        }

        .panel {
          max-width: 1580px;
          margin: 0 auto 18px;
          padding: 16px;
          border: 2px solid #51595d;
          border-radius: 17px;
          background:
            linear-gradient(180deg, #626668, #4d5153);
          box-shadow:
            0 7px 0 #2e3437;
        }

        .tools {
          display: grid;
          grid-template-columns:
            minmax(300px, 1fr)
            220px
            auto;
          gap: 9px;
          margin-bottom: 15px;
          padding: 12px;
          border-radius: 11px;
          background: #f5f5f5;
        }

        .tools input,
        .tools select {
          min-height: 44px;
          padding: 8px 11px;
          border: 1px solid #777;
          border-radius: 8px;
          background: #fff;
          color: #111;
        }

        .sectionTitle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 12px;
          padding: 10px 13px;
          border-radius: 9px;
          background:
            linear-gradient(180deg, #91ddf8, #48a9d2);
          color: #0b3348;
        }

        .sectionTitle h2 {
          margin: 0;
          font-size: 20px;
        }

        .sectionTitle span {
          padding: 4px 9px;
          border-radius: 999px;
          background: #fff5c7;
          color: #705900;
          font-size: 12px;
        }

        .userGrid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .userCard {
          padding: 15px;
          border: 1px solid #bbb;
          border-radius: 13px;
          background:
            linear-gradient(180deg, #fff, #efefef);
          box-shadow:
            inset 0 2px 0 #fff,
            0 4px 0 #a4a4a4;
        }

        .userCard.overdueCard {
          border-color: #b84c4c;
          box-shadow:
            inset 0 2px 0 #fff,
            0 5px 0 #8f4747,
            0 10px 18px rgba(134, 39, 39, 0.16);
        }

        .userTop {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .userTop h3 {
          margin: 0 0 4px;
          color: #111;
          font-size: 20px;
        }

        .userTop code {
          color: #73797d;
          font-size: 11px;
        }

        .debtBadge,
        .clearBadge,
        .advanceBadge {
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
        }

        .debtBadge {
          background: #ffe0e0;
          color: #9c2424;
        }

        .clearBadge {
          background: #dff3e4;
          color: #187139;
        }

        .advanceBadge {
          background: #e0f1ff;
          color: #1a6595;
        }

        .moneyGrid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin-bottom: 11px;
        }

        .moneyGrid div {
          padding: 11px;
          border: 1px solid #d0d0d0;
          border-radius: 9px;
          background: #fff;
        }

        .moneyGrid span,
        .moneyGrid strong {
          display: block;
        }

        .moneyGrid span {
          color: #777;
          font-size: 10px;
        }

        .moneyGrid strong {
          margin-top: 4px;
          color: #234c62;
          font-size: 16px;
        }

        .moneyGrid .debtValue {
          color: #ba2525;
        }

        .moneyGrid .paidValue {
          color: #167a3c;
        }

        .periodBox {
          display: grid;
          grid-template-columns:
            1fr 1fr;
          gap: 8px;
          margin-bottom: 10px;
        }

        .periodBox div {
          padding: 9px;
          border: 1px solid #d5d5d5;
          border-radius: 8px;
          background: #f8fbfd;
        }

        .periodBox span,
        .periodBox strong {
          display: block;
        }

        .periodBox span {
          color: #777;
          font-size: 10px;
        }

        .periodBox strong {
          margin-top: 4px;
          color: #234c62;
          font-size: 12px;
        }

        .periodBox .overdueText {
          color: #b62a2a;
        }

        .lastAction {
          margin-bottom: 11px;
          padding: 8px 9px;
          border-radius: 8px;
          background: #f5f5f5;
          color: #666;
          font-size: 11px;
        }

        .cardButtons {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .cardButtons .debtButton {
          border-color: #ad7676;
          background:
            linear-gradient(180deg, #fff3f3, #efb9b9);
          box-shadow:
            inset 0 1px 0 #fff,
            0 4px 0 #ab7474;
        }

        .cardButtons .paymentButton {
          border-color: #438154;
          background:
            linear-gradient(180deg, #effff3, #a7dfb3);
          box-shadow:
            inset 0 1px 0 #fff,
            0 4px 0 #6c9a76;
        }

        .cardButtons .periodButton {
          border-color: #527f99;
          background:
            linear-gradient(180deg, #eefaff, #aedbef);
          color: #124d6e;
          box-shadow:
            inset 0 1px 0 #fff,
            0 4px 0 #6f9db5;
        }

        .cardButtons .historyButton {
          grid-column: 1 / -1;
          border-color: #7a6a9d;
          background:
            linear-gradient(180deg, #faf6ff, #d9c9ef);
          color: #4f3778;
          box-shadow:
            inset 0 1px 0 #fff,
            0 4px 0 #7b6a9c;
        }

        .historyModal {
          width: min(920px, calc(100vw - 32px));
          max-height: 82vh;
          overflow: auto;
        }

        .historyModalHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 14px;
        }

        .compactUser {
          margin-top: 8px;
          margin-bottom: 0;
        }

        .closeHistoryButton {
          width: 42px;
          height: 42px;
          min-width: 42px;
          border: 2px solid #a83a3a;
          border-radius: 10px;
          background: linear-gradient(180deg, #fff5f5, #efb7b7);
          color: #8a2020;
          font-weight: 900;
          cursor: pointer;
        }

        .historyModalList {
          display: grid;
          gap: 10px;
        }

        .historyRow {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto auto;
          align-items: center;
          gap: 12px;
          padding: 12px 13px;
          border: 1px solid #d5dde1;
          border-radius: 11px;
          background: #fff;
        }

        .historyRow.voided {
          opacity: .55;
          text-decoration: line-through;
        }

        .historyRowMain strong,
        .historyRowMain span {
          display: block;
        }

        .historyRowMain span {
          margin-top: 4px;
          color: #6f777b;
          font-size: 11px;
        }

        .compactEmpty {
          min-height: 90px;
        }

        .historyTitleRow {
          align-items: center;
        }

        .historyTitleActions {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .historyTitleActions > span {
          min-width: 44px;
        }

        .showAllHistoryButton {
          min-height: 30px !important;
          padding: 5px 10px !important;
          border-color: #527f99 !important;
          background:
            linear-gradient(180deg, #eefaff, #aedbef) !important;
          color: #124d6e !important;
          box-shadow:
            inset 0 1px 0 #fff,
            0 3px 0 #6f9db5 !important;
          font-size: 10px;
        }


        .historyPanel {
          background:
            linear-gradient(180deg, #5d6163, #494d4f);
        }

        .historyList {
          display: grid;
          gap: 9px;
        }

        .historyList article {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            auto
            auto;
          align-items: center;
          gap: 12px;
          padding: 11px 13px;
          border-radius: 10px;
          background: #fff;
        }

        .historyList article.voided {
          opacity: .55;
          text-decoration: line-through;
        }

        .historyList strong,
        .historyList span {
          display: block;
        }

        .historyList span {
          margin-top: 4px;
          color: #777;
          font-size: 11px;
        }

        .entryAmount {
          min-width: 130px;
          text-align: right;
          font-size: 16px;
          font-weight: 700;
        }

        .entryAmount.payment {
          color: #15793b;
        }

        .entryAmount.debt,
        .entryAmount.adjustment {
          color: #b42828;
        }

        .entryButtons {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .editEntryButton {
          min-height: 34px;
          padding: 6px 10px;
          border: 2px solid #4f8d67;
          border-radius: 9px;
          background:
            linear-gradient(180deg, #effff3, #b7e7c3);
          color: #155e32;
          box-shadow:
            inset 0 1px 0 #fff,
            0 4px 0 #5f9c72;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .voidButton {
          min-height: 34px;
          font-size: 11px;
          border-color: #a66c6c;
          background:
            linear-gradient(180deg, #fff3f3, #efb5b5);
          box-shadow:
            inset 0 1px 0 #fff,
            0 4px 0 #a66f6f;
        }

        .voidLabel {
          padding: 5px 8px;
          border-radius: 999px;
          background: #ddd;
          color: #555;
          font-size: 10px !important;
        }

        .empty {
          grid-column: 1 / -1;
          padding: 35px;
          border-radius: 10px;
          background: #fff;
          text-align: center;
        }

        .modalBackdrop {
          position: fixed;
          inset: 0;
          z-index: 100;
          padding: 24px;
          background:
            rgba(11, 27, 36, .55);
          display: grid;
          place-items: center;
        }

        .modal {
          width: min(540px, 100%);
          padding: 20px;
          border: 2px solid #365361;
          border-radius: 16px;
          background: #fff;
          box-shadow:
            0 20px 70px rgba(0,0,0,.28);
        }

        .modal h2 {
          margin: 0 0 14px;
          color: #102f40;
        }

        .selectedUser {
          margin-bottom: 12px;
          padding: 10px;
          border-radius: 9px;
          background: #eef7fb;
        }

        .selectedUser strong,
        .selectedUser span {
          display: block;
        }

        .selectedUser span {
          margin-top: 3px;
          color: #71808a;
          font-size: 10px;
        }

        .currentInfo {
          margin-bottom: 11px;
          padding: 9px;
          border-radius: 8px;
          background: #fff5cf;
        }

        .modal label {
          display: grid;
          gap: 6px;
          margin-bottom: 11px;
          color: #333;
          font-size: 13px;
          font-weight: 700;
        }

        .periodFields {
          display: grid;
          grid-template-columns:
            1fr 1fr;
          gap: 10px;
        }

        .modal input,
        .modal select,
        .modal textarea {
          width: 100%;
          min-height: 43px;
          padding: 8px 10px;
          border: 1px solid #aaa;
          border-radius: 8px;
          background: #fff;
        }

        .modal textarea {
          min-height: 80px;
          resize: vertical;
        }

        .editTypeInfo {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 12px;
          border: 1px solid #bfc9ce;
          border-radius: 9px;
          background: #f4f9fb;
        }

        .editTypeInfo span {
          color: #68767d;
          font-size: 11px;
        }

        .editTypeInfo strong {
          color: #164e6c;
        }

        .editWarning {
          padding: 10px 12px;
          border: 1px solid #d6bd78;
          border-radius: 9px;
          background: #fff8df;
          color: #6f581e;
          font-size: 11px;
          line-height: 1.45;
        }

        .modalActions .saveEdit {
          border-color: #4f8d67;
          background:
            linear-gradient(180deg, #effff3, #b7e7c3);
          color: #155e32;
          box-shadow:
            inset 0 1px 0 #fff,
            0 4px 0 #5f9c72;
        }

        .modalActions {
          display: flex;
          justify-content: flex-end;
          gap: 9px;
          margin-top: 15px;
        }

        .modalActions button {
          min-height: 40px;
          padding: 8px 14px;
          border: 1px solid #777;
          border-radius: 8px;
          background:
            linear-gradient(180deg, #fff, #ddd);
          color: #111;
          box-shadow:
            inset 0 1px 0 #fff,
            0 4px 0 #888;
          font-weight: 700;
          cursor: pointer;
        }

        .modalActions .saveDebt {
          border-color: #a66f6f;
          background:
            linear-gradient(180deg, #fff2f2, #efb3b3);
          box-shadow:
            inset 0 1px 0 #fff,
            0 4px 0 #a66b6b;
        }

        .modalActions .savePayment {
          border-color: #438054;
          background:
            linear-gradient(180deg, #effff3, #a8dfb4);
          box-shadow:
            inset 0 1px 0 #fff,
            0 4px 0 #6c9b76;
        }

        .modalActions .savePeriod {
          border-color: #527f99;
          background:
            linear-gradient(180deg, #eefaff, #aedbef);
          color: #124d6e;
          box-shadow:
            inset 0 1px 0 #fff,
            0 4px 0 #6f9db5;
        }

        @media (
          max-width: 950px
        ) {
          .paymentsTopBar {
            align-items: stretch;
            flex-direction: column;
          }

          .stats,
          .userGrid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .cardButtons {
            grid-template-columns: 1fr;
          }

          .periodFields,
          .periodBox {
            grid-template-columns:
              1fr;
          }

          .tools {
            grid-template-columns:
              1fr;
          }

          .historyList article {
            grid-template-columns:
              1fr;
          }

          .entryAmount {
            text-align: left;
          }

          .entryButtons {
            align-items: stretch;
            flex-direction: column;
          }
        }

        @media (
          max-width: 600px
        ) {
          .page {
            padding: 12px;
          }

          .stats,
          .userGrid,
          .moneyGrid,
          .cardButtons {
            grid-template-columns:
              1fr;
          }

          .paymentsTopButtons {
            display: grid;
            grid-template-columns:
              1fr;
          }
        }
      `}</style>
    </main>
  );
}
