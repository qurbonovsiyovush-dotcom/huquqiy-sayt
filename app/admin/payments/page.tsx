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

function dateTime(
  value: string | null
) {
  if (!value) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat(
      "uz-UZ",
      {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }
    ).format(
      new Date(value)
    );
  } catch {
    return value;
  }
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

  const parts =
    value.split("-");

  if (parts.length !== 3) {
    return value;
  }

  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function todayInput() {
  return new Date()
    .toISOString()
    .slice(0, 10);
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

  async function save(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!selected) {
      return;
    }

    const value =
      Number(amount);

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
          periodStart,
          dueDate,
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
      <header className="hero">
        <div>
          <h1>
            To‘lovlar boshqaruvi
          </h1>

          <p>
            Admin qarz va to‘lov summasini qo‘lda kiritadi
          </p>
        </div>

        <div className="heroButtons">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/admin/users"
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
                className="userCard"
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

      <section className="panel historyPanel">
        <div className="sectionTitle">
          <h2>
            Moliyaviy tarix
          </h2>

          <span>
            {
              entries.length
            }{" "}
            ta
          </span>
        </div>

        <div className="historyList">
          {entries.map(
            (item) => (
              <article
                key={
                  item.id
                }
                className={
                  item.isVoided
                    ? "voided"
                    : ""
                }
              >
                <div>
                  <strong>
                    {
                      item.fullName
                    }
                  </strong>

                  <span>
                    {entryText(
                      item.entryType
                    )}{" "}
                    •{" "}
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
                  "payment"
                    ? "−"
                    : item.amount >
                        0
                      ? "+"
                      : ""}
                  {money(
                    Math.abs(
                      item.amount
                    )
                  )}
                </div>

                {!item.isVoided && (
                  <button
                    type="button"
                    className="voidButton"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Xato kiritilgan yozuvni bekor qilasizmi? Tarixdan o‘chmaydi."
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
                )}

                {item.isVoided && (
                  <span className="voidLabel">
                    Bekor qilingan
                  </span>
                )}
              </article>
            )
          )}
        </div>
      </section>

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
                  : "To‘lov kiritish"}
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

              <label>
                {modal ===
                "debt"
                  ? "Yangi qarz summasi"
                  : "To‘langan summa"}

                <input
                  autoFocus
                  required
                  type="number"
                  min={
                    modal ===
                    "debt"
                      ? "0"
                      : "1"
                  }
                  step="1"
                  value={amount}
                  onChange={(event) =>
                    setAmount(
                      event.target.value
                    )
                  }
                />
              </label>

              {modal ===
                "debt" && (
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
                  placeholder="Masalan: sentabr oyi uchun..."
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
                      : "savePayment"
                  }
                >
                  Saqlash
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

        .hero {
          max-width: 1580px;
          margin: 0 auto 22px;
          padding: 18px 20px;
          border: 2px solid #184b63;
          border-radius: 18px;
          background:
            linear-gradient(180deg, #8cddfb, #4aaad4);
          box-shadow:
            inset 0 2px 0 #effcff,
            0 7px 0 #143f53;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .hero h1 {
          margin: 0;
          font-size: 31px;
        }

        .hero p {
          margin: 5px 0 0;
          color: #255266;
          font-size: 13px;
        }

        .heroButtons {
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
        }

        .heroButtons button,
        .tools button,
        .cardButtons button,
        .voidButton {
          min-height: 41px;
          padding: 8px 13px;
          border: 1px solid #727c82;
          border-radius: 9px;
          background:
            linear-gradient(180deg, #fff, #ddd);
          color: #111;
          box-shadow:
            inset 0 1px 0 #fff,
            0 4px 0 #7d8589;
          font-weight: 700;
          cursor: pointer;
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
            1fr 1fr;
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

        @media (
          max-width: 950px
        ) {
          .hero {
            align-items: stretch;
            flex-direction: column;
          }

          .stats,
          .userGrid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
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

          .heroButtons {
            display: grid;
            grid-template-columns:
              1fr;
          }
        }
      `}</style>
    </main>
  );
}
