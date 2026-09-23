"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type RankInfo = {
  rank: number | null;
  workedQuestions: number;
  correct: number;
  incorrect: number;
  accuracy: number;
};

type ProfileResponse = {
  success: boolean;
  message?: string;
  profile?: {
    id: string;
    profileCode: string;
    fullName: string;
    avatarUrl: string | null;
    status: string;
    createdAt: string | null;
    lastLoginAt: string | null;
    codeCount: number;
    activeCodeCount: number;
  };
  ranking?: {
    week: RankInfo;
    month: RankInfo;
    all: RankInfo;
  };
  recentAttempts?: Array<{
    id: string;
    source: string;
    testId: string;
    testTitle: string;
    subject: string | null;
    totalQuestions: number;
    correct: number;
    incorrect: number;
    unanswered: number;
    percentage: number;
    finishedAt: string | null;
  }>;
};

type PaymentPeriod = {
  startDate: string | null;
  endDate: string | null;
  dueDate: string | null;
  months: number | null;
  daysLeft: number | null;
  isOverdue: boolean;
};

type FinanceSummary = {
  currentDebt: number;
  advance: number;
  totalPaid: number;
  totalDebtAdded: number;
  period: PaymentPeriod | null;
};

type FinanceEntry = {
  id: string;
  entryType: string;
  amount: number;
  note: string | null;
  occurredAt: string | null;
  isVoided: boolean;
  periodStart: string | null;
  periodEnd: string | null;
  dueDate: string | null;
  periodMonths: number | null;
};

function money(value: number) {
  return (
    new Intl.NumberFormat("uz-UZ").format(
      Math.round(value || 0)
    ) + " so‘m"
  );
}

function extractIsoDate(
  value: string | null | undefined
) {
  if (!value) return null;

  const raw =
    String(value).trim();

  const isoMatch =
    raw.match(
      /(\d{4})-(\d{2})-(\d{2})/
    );

  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const parsed =
    new Date(raw);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return null;
  }

  const year =
    parsed.getFullYear();

  const month =
    String(
      parsed.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      parsed.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateOnly(
  value: string | null | undefined
) {
  const iso =
    extractIsoDate(value);

  if (!iso) return "—";

  const [year, month, day] =
    iso.split("-");

  return `${day}.${month}.${year}`;
}

function formatDateTime(
  value: string | null | undefined
) {
  if (!value) return "—";

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return formatDateOnly(value);
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

function extractDateFromText(
  value: string | null | undefined
) {
  if (!value) return null;

  const match =
    String(value).match(
      /(\d{4})-(\d{2})-(\d{2})/
    );

  return match
    ? `${match[1]}-${match[2]}-${match[3]}`
    : null;
}

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((item) => item[0]?.toUpperCase())
      .join("") || "U"
  );
}

function sourceName(source: string) {
  if (source === "national-certificate") {
    return "Milliy sertifikat";
  }
  if (source === "thematic") {
    return "Mavzulashtirilgan";
  }
  if (source === "legacy") {
    return "Test";
  }
  return source || "Test";
}

function isPeriodEntry(
  item: FinanceEntry
) {
  const note =
    String(
      item.note || ""
    ).toLowerCase();

  return (
    item.entryType === "period" ||
    (
      Math.abs(item.amount) < 0.005 &&
      note.includes("muddat")
    )
  );
}

function financeName(
  item: FinanceEntry
) {
  if (isPeriodEntry(item)) {
    return "Muddat belgilandi";
  }

  if (
    item.entryType ===
    "payment"
  ) {
    return "To‘lov qilindi";
  }

  if (
    item.entryType ===
    "debt"
  ) {
    return "To‘lov summasi belgilandi";
  }

  if (
    item.entryType ===
    "adjustment"
  ) {
    return "To‘lov summasi tuzatildi";
  }

  return "Moliyaviy o‘zgarish";
}

function financePeriodText(
  item: FinanceEntry
) {
  if (!isPeriodEntry(item)) {
    return "—";
  }

  const start =
    item.periodStart;

  const deadline =
    item.dueDate ||
    extractDateFromText(
      item.note
    );

  if (
    start &&
    deadline
  ) {
    return `${formatDateOnly(
      start
    )} — ${formatDateOnly(
      deadline
    )}`;
  }

  if (deadline) {
    return formatDateOnly(
      deadline
    );
  }

  return "—";
}

function financeAmountText(
  item: FinanceEntry
) {
  if (isPeriodEntry(item)) {
    return "—";
  }

  if (
    item.entryType ===
    "payment"
  ) {
    return `− ${money(
      Math.abs(item.amount)
    )}`;
  }

  if (
    item.entryType ===
    "debt"
  ) {
    return money(
      Math.abs(item.amount)
    );
  }

  const sign =
    item.amount > 0
      ? "+"
      : item.amount < 0
        ? "−"
        : "";

  return `${sign}${
    sign ? " " : ""
  }${money(
    Math.abs(item.amount)
  )}`;
}

function financeNoteText(
  item: FinanceEntry
) {
  const raw =
    String(
      item.note || ""
    ).trim();

  if (!raw) {
    return "";
  }

  if (
    /^Qarz\s+[\d\s.,]+\s*so['‘’]?m\s+qilib\s+belgilandi$/i.test(
      raw
    )
  ) {
    return "";
  }

  if (
    /^To['‘’]?lov\s+muddati\s+\d{4}-\d{2}-\d{2}\s+qilib\s+belgilandi$/i.test(
      raw
    )
  ) {
    return "";
  }

  return raw;
}

export default function ProfilePage() {
  const router = useRouter();

  const [profileData, setProfileData] =
    useState<ProfileResponse | null>(null);

  const [financeSummary, setFinanceSummary] =
    useState<FinanceSummary>({
      currentDebt: 0,
      advance: 0,
      totalPaid: 0,
      totalDebtAdded: 0,
      period: null,
    });

  const [financeEntries, setFinanceEntries] =
    useState<FinanceEntry[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [timelineNow, setTimelineNow] =
    useState(() => Date.now());

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimelineNow(Date.now());
    }, 60_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [profileRes, financeRes] =
        await Promise.all([
          fetch("/api/profile/me", {
            cache: "no-store",
          }),
          fetch("/api/profile/payments", {
            cache: "no-store",
          }),
        ]);

      const profileJson =
        await profileRes
          .json()
          .catch(() => ({}));

      const financeJson =
        await financeRes
          .json()
          .catch(() => ({}));

      if (!profileRes.ok) {
        if (profileRes.status === 401) {
          router.replace("/");
          return;
        }

        throw new Error(
          profileJson?.message ||
            "Profil ma’lumotlari yuklanmadi."
        );
      }

      setProfileData(profileJson);

      if (financeRes.ok) {
        setFinanceSummary({
          currentDebt: Number(
            financeJson?.summary?.currentDebt || 0
          ),
          advance: Number(
            financeJson?.summary?.advance || 0
          ),
          totalPaid: Number(
            financeJson?.summary?.totalPaid || 0
          ),
          totalDebtAdded: Number(
            financeJson?.summary?.totalDebtAdded || 0
          ),

          period:
            financeJson?.summary?.period
              ? {
                  startDate:
                    financeJson.summary.period
                      .startDate || null,

                  endDate:
                    financeJson.summary.period
                      .endDate || null,

                  dueDate:
                    financeJson.summary.period
                      .dueDate || null,

                  months:
                    financeJson.summary.period
                      .months == null
                      ? null
                      : Number(
                          financeJson.summary.period
                            .months
                        ),

                  daysLeft:
                    financeJson.summary.period
                      .daysLeft === null ||
                    financeJson.summary.period
                      .daysLeft === undefined
                      ? null
                      : Number(
                          financeJson.summary.period
                            .daysLeft
                        ),

                  isOverdue:
                    financeJson.summary.period
                      .isOverdue === true,
                }
              : null,
        });

        setFinanceEntries(
          Array.isArray(financeJson?.entries)
            ? financeJson.entries
            : []
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Xatolik yuz berdi."
      );
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await fetch("/api/logout", {
        method: "POST",
      });
    } finally {
      router.replace("/");
      router.refresh();
    }
  }

  const profile = profileData?.profile;
  const allRank = profileData?.ranking?.all;
  const weekRank = profileData?.ranking?.week;
  const monthRank = profileData?.ranking?.month;
  const attempts =
    profileData?.recentAttempts || [];

  const activeFinanceEntries =
    useMemo(() => {
      const seen =
        new Set<string>();

      return financeEntries
        .filter(
          (item) =>
            !item.isVoided
        )
        // Muddat yozuvi bazada saqlanadi, lekin profil tarixida ko‘rsatilmaydi.
        // Muddatning o‘zi yuqoridagi zamonaviy avtomatik timeline’da ko‘rinadi.
        .filter(
          (item) =>
            !isPeriodEntry(item)
        )
        .filter((item) => {
          const canonicalType =
            isPeriodEntry(item)
              ? "period"
              : item.entryType;

          const deadline =
            item.dueDate ||
            extractDateFromText(
              item.note
            ) ||
            "";

          const minute =
            item.occurredAt
              ? item.occurredAt.slice(
                  0,
                  16
                )
              : "";

          const noteKey =
            String(
              item.note || ""
            )
              .trim()
              .toLowerCase()
              .replace(
                /\s+/g,
                " "
              );

          const signature =
            [
              canonicalType,
              minute,
              deadline,
              Math.round(
                item.amount * 100
              ),
              noteKey,
            ].join("|");

          if (
            seen.has(signature)
          ) {
            return false;
          }

          seen.add(signature);

          return true;
        });
    }, [financeEntries]);

  const totalTests = useMemo(() => {
    return new Set(
      attempts.map(
        (item) =>
          `${item.source}:${item.testId}`
      )
    ).size;
  }, [attempts]);

  const totalAmount =
    Math.max(
      0,
      financeSummary.totalPaid +
        financeSummary.currentDebt -
        financeSummary.advance
    );

  const paymentPeriod =
    financeSummary.period;

  const periodTimeline =
    useMemo(() => {
      const startIso =
        extractIsoDate(
          paymentPeriod?.startDate
        );

      const dueIso =
        extractIsoDate(
          paymentPeriod?.dueDate
        );

      if (!startIso || !dueIso) {
        return {
          progress: 0,
          state: "none" as const,
          label: "Muddat belgilanmagan",
          todayLabel: "—",
          daysText: "",
        };
      }

      const toDayNumber = (
        iso: string
      ) => {
        const [year, month, day] =
          iso.split("-").map(Number);

        return Math.floor(
          Date.UTC(
            year,
            month - 1,
            day
          ) / 86_400_000
        );
      };

      const now = timelineNow;
      const today = new Date(now);

      // Bugungi sanani vaqtni hisobga olmasdan olamiz.
      // Shu sabab 23.09 → 18.10 aynan 25 kun bo‘ladi.
      const todayDay =
        Math.floor(
          Date.UTC(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
          ) / 86_400_000
        );

      const startDay =
        toDayNumber(startIso);

      const dueDay =
        toDayNumber(dueIso);

      const totalDays =
        Math.max(
          1,
          dueDay - startDay
        );

      const elapsedDays =
        todayDay - startDay;

      const progress =
        Math.max(
          0,
          Math.min(
            100,
            (elapsedDays / totalDays) *
              100
          )
        );

      const todayLabel =
        new Intl.DateTimeFormat(
          "uz-UZ",
          {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }
        ).format(today);

      if (todayDay < startDay) {
        const days =
          Math.max(
            1,
            startDay - todayDay
          );

        return {
          progress,
          state: "waiting" as const,
          label: "Muddat boshlanmagan",
          todayLabel,
          daysText: `${days} kun qoldi`,
        };
      }

      if (todayDay > dueDay) {
        const days =
          Math.max(
            1,
            todayDay - dueDay
          );

        return {
          progress: 100,
          state: "overdue" as const,
          label: "Muddat tugadi",
          todayLabel,
          daysText: `${days} kun o‘tgan`,
        };
      }

      const daysLeft =
        Math.max(
          0,
          dueDay - todayDay
        );

      const isLastDay =
        daysLeft === 0;

      const isNear =
        daysLeft <= 5;

      return {
        progress,
        state: isLastDay
          ? ("last" as const)
          : isNear
            ? ("near" as const)
            : ("active" as const),
        label: isLastDay
          ? "Bugun oxirgi kun"
          : "Muddat davom etmoqda",
        todayLabel,
        daysText: isLastDay
          ? "Bugun yakunlanadi"
          : `${daysLeft} kun qoldi`,
      };
    }, [
      paymentPeriod?.startDate,
      paymentPeriod?.dueDate,
      timelineNow,
    ]);

  const paidPercent =
    totalAmount > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              (financeSummary.totalPaid /
                totalAmount) *
                100
            )
          )
        )
      : 0;

  const paymentStateLabel =
    financeSummary.currentDebt > 0
      ? "Qarz mavjud"
      : financeSummary.advance > 0
        ? "Ortiqcha to‘lov mavjud"
        : totalAmount > 0 &&
            financeSummary.totalPaid >= totalAmount
          ? "To‘liq to‘langan"
          : "To‘lov belgilanmagan";

  if (loading) {
    return (
      <main className="loading">
        <div className="spinner" />
        <strong>Profil yuklanmoqda...</strong>

        <style jsx>{`
          .loading {
            min-height: 100vh;
            display: grid;
            place-items: center;
            align-content: center;
            gap: 14px;
            background: #fff;
            color: #123b58;
            font-family:
              "Bell MT",
              Georgia,
              serif;
          }

          .spinner {
            width: 45px;
            height: 45px;
            border: 5px solid #d9edf8;
            border-top-color: #2c9bce;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="page">
      {/* ================= HEADER ================= */}
      <header className="siteHeader">
        <button
          type="button"
          className="ownerButton"
          onClick={() => router.push("/")}
        >
          Qurbonov Siyovush Jamaliddinzoda
        </button>

        <nav className="navButtons">
          <button
            type="button"
            onClick={() =>
              (window.location.href =
                "/#talabalar")
            }
          >
            Talabalar
          </button>

          <button
            type="button"
            onClick={() =>
              (window.location.href =
                "/#abituriyent")
            }
          >
            Abituriyent
          </button>

          <button
            type="button"
            onClick={() =>
              (window.location.href =
                "/#savol-javob")
            }
          >
            Savol-javob
          </button>

          <button
            type="button"
            onClick={() =>
              (window.location.href =
                "/#qollanmalar")
            }
          >
            Qo‘llanmalar
          </button>

          <button
            type="button"
            className="exitButton"
            onClick={() => void logout()}
          >
            Chiqish
          </button>
        </nav>
      </header>

      <div className="content">
        {error && (
          <div className="errorBox">
            {error}
          </div>
        )}

        {/* ================= PROFILE ================= */}
        <section className="bigPanel">
          <div className="panelTab">
            Foydalanuvchi profili
          </div>

          <div className="profileArea">
            <div className="avatar3d">
              {profile?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarUrl}
                  alt={profile.fullName}
                />
              ) : (
                <span>
                  {initials(
                    profile?.fullName ||
                      "Foydalanuvchi"
                  )}
                </span>
              )}
            </div>

            <div className="profileInfo">
              <div className="activeStatus">
                ✓ Faol foydalanuvchi
              </div>

              <h1>
                {profile?.fullName ||
                  "Foydalanuvchi"}
              </h1>

              <div className="profileMeta">
                <div>
                  <span>Profil ID</span>
                  <strong>
                    {profile?.profileCode || "—"}
                  </strong>
                </div>

                <div>
                  <span>Umumiy reyting</span>
                  <strong>
                    {allRank?.rank
                      ? `#${allRank.rank}`
                      : "—"}
                  </strong>
                </div>

                <div>
                  <span>Oxirgi kirish</span>
                  <strong>
                    {formatDateTime(
                      profile?.lastLoginAt
                    )}
                  </strong>
                </div>
              </div>
            </div>

            <div className="rankMedal">
              <span>🏆</span>
              <strong>
                {allRank?.rank
                  ? `${allRank.rank}-o‘rin`
                  : "Reyting"}
              </strong>
              <small>
                {allRank?.accuracy || 0}% aniqlik
              </small>
            </div>
          </div>
        </section>

        {/* ================= STATISTICS ================= */}
        <section className="bigPanel">
          <div className="panelTab">
            Natijalar
          </div>

          <div className="statsGrid">
            <article>
              <span className="metricIcon blue">
                ≡
              </span>
              <div>
                <span>Ishlangan testlar</span>
                <strong>{totalTests}</strong>
              </div>
            </article>

            <article>
              <span className="metricIcon green">
                ✓
              </span>
              <div>
                <span>To‘g‘ri javoblar</span>
                <strong>
                  {allRank?.correct || 0}
                </strong>
              </div>
            </article>

            <article>
              <span className="metricIcon red">
                ×
              </span>
              <div>
                <span>Noto‘g‘ri javoblar</span>
                <strong>
                  {allRank?.incorrect || 0}
                </strong>
              </div>
            </article>

            <article>
              <span className="metricIcon purple">
                %
              </span>
              <div>
                <span>Aniqlik</span>
                <strong>
                  {allRank?.accuracy || 0}%
                </strong>
              </div>
            </article>
          </div>

          <div className="rankRow">
            <div>
              <span>Haftalik</span>
              <strong>
                {weekRank?.rank
                  ? `#${weekRank.rank}`
                  : "—"}
              </strong>
            </div>

            <div>
              <span>Oylik</span>
              <strong>
                {monthRank?.rank
                  ? `#${monthRank.rank}`
                  : "—"}
              </strong>
            </div>

            <div>
              <span>Umumiy</span>
              <strong>
                {allRank?.rank
                  ? `#${allRank.rank}`
                  : "—"}
              </strong>
            </div>
          </div>
        </section>

        {/* ================= PAYMENTS ================= */}
        <section className="bigPanel" id="payments">
          <div className="panelTab">
            To‘lovlar
          </div>

          <div className="paymentTop">
            <article className="paymentCard total">
              <div className="paymentCardHead">
                <span className="paymentCardIcon">Σ</span>
                <span>Umumiy summa</span>
              </div>
              <strong>
                {money(totalAmount)}
              </strong>
            </article>

            <article className="paymentCard paid">
              <div className="paymentCardHead">
                <span className="paymentCardIcon">✓</span>
                <span>To‘langan</span>
              </div>
              <strong>
                {money(financeSummary.totalPaid)}
              </strong>
            </article>

            <article className="paymentCard debt">
              <div className="paymentCardHead">
                <span className="paymentCardIcon">−</span>
                <span>Qarz</span>
              </div>
              <strong>
                {money(
                  financeSummary.currentDebt
                )}
              </strong>
            </article>

            <article className="paymentCard advance">
              <div className="paymentCardHead">
                <span className="paymentCardIcon">+</span>
                <span>Ortiqcha to‘langan</span>
              </div>
              <strong>
                {money(
                  financeSummary.advance
                )}
              </strong>
            </article>

            <article
              className={`paymentCard deadline ${
                paymentPeriod?.isOverdue
                  ? "deadlineOverdue"
                  : ""
              }`}
            >
              <div className="paymentCardHead">
                <span className="paymentCardIcon">▣</span>
                <span>To‘lov muddati</span>
              </div>

              <strong>
                {paymentPeriod?.dueDate
                  ? formatDateOnly(
                      paymentPeriod.dueDate
                    )
                  : "Belgilanmagan"}
              </strong>
            </article>
          </div>

          <div className="paymentProgressBox">
            <div className="timeJourneyHeader">
              <div>
                <span className="timeJourneyEyebrow">
                  TO‘LOV MUDDATI HARAKATI
                </span>
                <strong>
                  {periodTimeline.label}
                </strong>
              </div>

              <div
                className={`timeStatusChip ${
                  periodTimeline.state
                }`}
              >
                <span className="timeStatusDot" />
                <span>
                  {periodTimeline.daysText ||
                    paymentStateLabel}
                </span>
              </div>
            </div>

            {paymentPeriod?.startDate &&
            paymentPeriod?.dueDate ? (
              <div className="modernDeadline">
                <div className="deadlineDate startDate">
                  <span>BOSHLANISH</span>
                  <strong>
                    {formatDateOnly(
                      paymentPeriod.startDate
                    )}
                  </strong>
                </div>

                <div className="deadlineRailWrap">
                  <div className="deadlineRail">
                    <div
                      className={`deadlineElapsed ${
                        periodTimeline.state
                      }`}
                      style={{
                        width: `${periodTimeline.progress}%`,
                      }}
                    />

                    <div className="railGlow" />

                    <div
                      className={`movingMarker ${
                        periodTimeline.state
                      }`}
                      style={{
                        left: `${periodTimeline.progress}%`,
                      }}
                    >
                      <div className="markerPulse" />
                      <div className="markerCore">
                        <span>●</span>
                      </div>

                      <div className="todayBubble">
                        <small>BUGUN</small>
                        <strong>
                          {periodTimeline.todayLabel}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="deadlineMeta">
                    <span>
                      {Math.round(
                        periodTimeline.progress
                      )}% muddat o‘tdi
                    </span>
                    <span>
                      {periodTimeline.state ===
                      "overdue"
                        ? "Yakunlangan"
                        : "Avtomatik yangilanadi"}
                    </span>
                  </div>
                </div>

                <div className="deadlineDate endDate">
                  <span>MUDDAT</span>
                  <strong>
                    {formatDateOnly(
                      paymentPeriod.dueDate
                    )}
                  </strong>
                </div>
              </div>
            ) : (
              <div className="deadlineEmpty">
                <span className="deadlineEmptyIcon">◷</span>
                <div>
                  <strong>Muddat belgilanmagan</strong>
                  <span>
                    Administrator to‘lov muddatini
                    belgilagach, harakatlanuvchi
                    chiziq shu yerda paydo bo‘ladi.
                  </span>
                </div>
              </div>
            )}

            <div className="paymentCompletion">
              <div className="progressLabels">
                <span>To‘lov bajarilishi</span>
                <strong>{paidPercent}%</strong>
              </div>

              <div className="progressTrack">
                <div
                  className="progressFill"
                  style={{
                    width: `${paidPercent}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="historyBlock">
            <h2>
              To‘lovlar tarixi
            </h2>

            <div className="historyTimeline">
              {activeFinanceEntries
                .slice(0, 10)
                .map((item, index) => {
                  const periodEntry =
                    isPeriodEntry(item);

                  const kind =
                    periodEntry
                      ? "period"
                      : item.entryType ===
                          "payment"
                        ? "payment"
                        : item.entryType ===
                            "debt"
                          ? "debt"
                          : "adjustment";

                  const amountClass =
                    item.entryType ===
                    "payment"
                      ? "greenText"
                      : periodEntry
                        ? "neutralText"
                        : item.amount < 0
                          ? "greenText"
                          : "chargeText";

                  const periodStart =
                    item.periodStart
                      ? formatDateOnly(
                          item.periodStart
                        )
                      : "—";

                  const periodEnd =
                    item.dueDate
                      ? formatDateOnly(
                          item.dueDate
                        )
                      : extractDateFromText(
                            item.note
                          )
                        ? formatDateOnly(
                            extractDateFromText(
                              item.note
                            )
                          )
                        : "—";

                  const chargeSettled =
                    item.entryType ===
                      "debt" &&
                    totalAmount > 0 &&
                    financeSummary.currentDebt <=
                      0 &&
                    financeSummary.totalPaid >=
                      totalAmount;

                  return (
                    <article
                      className={`historyItem ${kind} ${
                        chargeSettled
                          ? "settledCharge"
                          : ""
                      }`}
                      key={item.id}
                    >
                      <div className="historyIndex">
                        {index + 1}
                      </div>

                      <div className="historyContent">
                        <div className="historyItemTop">
                          <div className="historyTitleGroup">
                            <strong className="historyAction">
                              {financeName(item)}
                            </strong>

                            {chargeSettled && (
                              <span className="settledBadge">
                                To‘liq to‘langan
                              </span>
                            )}

                            <span className="historyDate">
                              {formatDateTime(
                                item.occurredAt
                              )}
                            </span>
                          </div>

                          <strong
                            className={`historyAmount ${amountClass}`}
                          >
                            {financeAmountText(item)}
                          </strong>
                        </div>

                        {periodEntry && (
                          <div className="creativePeriod">
                            <div className="periodDatePoint start">
                              <span className="periodDot" />
                              <strong>
                                {periodStart}
                              </strong>
                              <small>
                                Boshlanish
                              </small>
                            </div>

                            <div className="periodConnector">
                              <span className="connectorLine" />
                              <span className="connectorArrow">
                                →
                              </span>
                            </div>

                            <div className="periodDatePoint end">
                              <span className="periodDot" />
                              <strong>
                                {periodEnd}
                              </strong>
                              <small>
                                Muddat
                              </small>
                            </div>
                          </div>
                        )}

                        {financeNoteText(item) && (
                          <div className="historyNote">
                            {financeNoteText(item)}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}

              {activeFinanceEntries.length === 0 && (
                <div className="emptyRow">
                  Hozircha to‘lov ma’lumoti mavjud emas.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ================= BOTTOM ================= */}
        <div className="twoColumns">
          <section className="bigPanel smallPanel">
            <div className="panelTab smallTab">
              So‘nggi testlar
            </div>

            <div className="attemptList">
              {attempts
                .slice(0, 5)
                .map((item) => (
                  <article key={item.id}>
                    <div>
                      <span className="testType">
                        {sourceName(
                          item.source
                        )}
                      </span>

                      <strong>
                        {item.testTitle}
                      </strong>

                      <small>
                        {formatDateTime(
                          item.finishedAt
                        )}
                      </small>
                    </div>

                    <div className="scoreBox">
                      <strong>
                        {item.correct}/
                        {item.totalQuestions}
                      </strong>

                      <span>
                        {item.percentage}%
                      </span>
                    </div>
                  </article>
                ))}

              {attempts.length === 0 && (
                <div className="emptyCard">
                  Hozircha test natijalari yo‘q.
                </div>
              )}
            </div>
          </section>

          <section className="bigPanel smallPanel">
            <div className="panelTab smallTab">
              Tezkor amallar
            </div>

            <div className="quickGrid">
              <button
                type="button"
                onClick={() => router.push("/test")}
              >
                Test ishlash
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/national-certificate"
                  )
                }
              >
                Milliy sertifikat
              </button>

              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("payments")
                    ?.scrollIntoView({
                      behavior: "smooth",
                    })
                }
              >
                To‘lovlar
              </button>

              <button
                type="button"
                onClick={() => router.push("/")}
              >
                Asosiy sahifa
              </button>
            </div>
          </section>
        </div>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        :global(body) {
          margin: 0;
          background: #ffffff;
        }

        :global(html) {
          scroll-behavior: smooth;
        }

        .page {
          min-height: 100vh;
          padding-bottom: 45px;
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(123, 206, 248, 0.08),
              transparent 28%
            ),
            #ffffff;
          color: #0d2330;
          font-family:
            "Bell MT",
            Georgia,
            "Times New Roman",
            serif;
        }

        button {
          font-family: inherit;
        }

        /* HEADER — SAYTINGIZDAGI USLUB */
        .siteHeader {
          width: calc(100% - 28px);
          min-height: 112px;
          margin: 14px auto 0;
          padding: 18px 28px;
          border: 2px solid #153d52;
          border-radius: 23px;
          background:
            linear-gradient(
              180deg,
              #94defd 0%,
              #55b8e4 55%,
              #42a7d7 100%
            );
          box-shadow:
            inset 0 3px 0 rgba(255,255,255,.72),
            inset 0 -5px 0 rgba(24,93,130,.35),
            0 8px 0 #173e52,
            0 15px 24px rgba(0,0,0,.16);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .ownerButton {
          min-height: 64px;
          min-width: 395px;
          padding: 10px 23px;
          border: 2px solid #45545c;
          border-radius: 14px;
          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #f4f4f4 42%,
              #c9c9c9 100%
            );
          color: #0b0b0b;
          box-shadow:
            inset 0 3px 0 #fff,
            inset 0 -3px 0 #969696,
            0 5px 0 #56646a;
          font-size: 24px;
          font-weight: 700;
          cursor: pointer;
        }

        .navButtons {
          display: flex;
          align-items: center;
          gap: 13px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .navButtons button {
          min-width: 114px;
          min-height: 54px;
          padding: 8px 15px;
          border: 2px solid #48575d;
          border-radius: 12px;
          background:
            linear-gradient(
              180deg,
              #ffffff,
              #d8d8d8 70%,
              #bcbcbc
            );
          color: #090909;
          box-shadow:
            inset 0 2px 0 #fff,
            0 5px 0 #54636a;
          font-weight: 700;
          cursor: pointer;
          transition:
            transform .15s ease,
            filter .15s ease;
        }

        .navButtons button:hover {
          filter: brightness(1.05);
          transform: translateY(-1px);
        }

        .navButtons .exitButton {
          border-color: #8e0d14;
          background:
            linear-gradient(
              180deg,
              #ff5d65,
              #e21b27 62%,
              #c50c18
            );
          color: #fff;
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,.4),
            0 5px 0 #950b13;
        }

        .content {
          width: min(1520px, calc(100% - 48px));
          margin: 78px auto 0;
        }

        .errorBox {
          margin-bottom: 24px;
          padding: 13px 16px;
          border: 1px solid #d87b7b;
          border-radius: 12px;
          background: #fff0f0;
          color: #9d2020;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
          font-weight: 700;
        }

        /* ASOSIY 3D PANEL */
        .bigPanel {
          position: relative;
          margin-bottom: 66px;
          padding: 62px 28px 28px;
          border: 2px solid #242c30;
          border-radius: 24px;
          background:
            linear-gradient(
              180deg,
              #686c6e 0%,
              #55595b 48%,
              #3f4345 100%
            );
          box-shadow:
            inset 0 3px 0 rgba(255,255,255,.15),
            inset 0 -4px 0 rgba(0,0,0,.30),
            0 8px 0 #242a2d,
            0 17px 27px rgba(0,0,0,.20);
        }

        .panelTab {
          position: absolute;
          left: 50%;
          top: -31px;
          transform: translateX(-50%);
          min-width: 330px;
          padding: 12px 28px;
          border: 2px solid #173e54;
          border-radius: 15px;
          background:
            linear-gradient(
              180deg,
              #b6ecff 0%,
              #69c7ef 50%,
              #37a2d5 100%
            );
          color: #064b77;
          box-shadow:
            inset 0 3px 0 rgba(255,255,255,.7),
            0 6px 0 #18516f,
            0 9px 16px rgba(0,0,0,.16);
          text-align: center;
          font-size: 27px;
          font-weight: 700;
        }

        .profileArea {
          display: grid;
          grid-template-columns:
            auto minmax(0, 1fr) 210px;
          align-items: center;
          gap: 26px;
        }

        .avatar3d {
          display: grid;
          place-items: center;
          width: 150px;
          height: 150px;
          overflow: hidden;
          border: 5px solid #1b2b34;
          border-radius: 50%;
          background:
            linear-gradient(
              180deg,
              #dff5ff,
              #74c5e8
            );
          box-shadow:
            inset 0 4px 0 rgba(255,255,255,.65),
            0 8px 0 #252c30,
            0 13px 24px rgba(0,0,0,.3);
        }

        .avatar3d img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar3d span {
          color: #0b4c70;
          font-size: 44px;
          font-weight: 900;
        }

        .profileInfo h1 {
          margin: 10px 0 20px;
          color: #fff;
          font-size: clamp(
            27px,
            3vw,
            39px
          );
          text-shadow:
            0 2px 0 rgba(0,0,0,.35);
        }

        .activeStatus {
          display: inline-block;
          padding: 7px 12px;
          border: 1px solid #4f9664;
          border-radius: 999px;
          background:
            linear-gradient(
              180deg,
              #bff0cb,
              #73c88a
            );
          color: #125329;
          box-shadow:
            inset 0 1px 0 #fff;
          font-weight: 700;
        }

        .profileMeta {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .profileMeta div {
          padding: 13px;
          border: 1px solid #9ea3a5;
          border-radius: 11px;
          background:
            linear-gradient(
              180deg,
              #ffffff,
              #dedede
            );
          box-shadow:
            inset 0 2px 0 #fff,
            0 4px 0 #90979a;
        }

        .profileMeta span,
        .profileMeta strong {
          display: block;
        }

        .profileMeta span {
          margin-bottom: 5px;
          color: #636363;
          font-size: 12px;
        }

        .profileMeta strong {
          color: #0b2f44;
          font-size: 16px;
        }

        .rankMedal {
          min-height: 160px;
          padding: 20px;
          border: 2px solid #95721c;
          border-radius: 18px;
          background:
            linear-gradient(
              180deg,
              #fff3bb,
              #f4cc52
            );
          color: #5d4500;
          box-shadow:
            inset 0 3px 0 #fff9d8,
            0 7px 0 #9e791e,
            0 12px 22px rgba(0,0,0,.23);
          display: grid;
          place-items: center;
          align-content: center;
          text-align: center;
        }

        .rankMedal span {
          font-size: 45px;
        }

        .rankMedal strong {
          margin-top: 5px;
          font-size: 21px;
        }

        .rankMedal small {
          margin-top: 5px;
          font-size: 12px;
        }

        .statsGrid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .statsGrid article {
          display: flex;
          align-items: center;
          gap: 14px;
          min-height: 105px;
          padding: 15px;
          border: 1px solid #aaa;
          border-radius: 13px;
          background:
            linear-gradient(
              180deg,
              #ffffff,
              #dfdfdf
            );
          box-shadow:
            inset 0 2px 0 #fff,
            0 5px 0 #8b9396;
        }

        .metricIcon {
          display: grid;
          place-items: center;
          width: 58px;
          height: 58px;
          flex: 0 0 auto;
          border-radius: 13px;
          color: #fff;
          font-size: 28px;
          font-weight: 900;
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,.35),
            0 4px 0 rgba(0,0,0,.22);
        }

        .metricIcon.blue {
          background:
            linear-gradient(
              180deg,
              #5dc5f2,
              #278ebc
            );
        }

        .metricIcon.green {
          background:
            linear-gradient(
              180deg,
              #6bd78a,
              #259247
            );
        }

        .metricIcon.red {
          background:
            linear-gradient(
              180deg,
              #ff8888,
              #cf3535
            );
        }

        .metricIcon.purple {
          background:
            linear-gradient(
              180deg,
              #b294eb,
              #7855c6
            );
        }

        .statsGrid article > div span,
        .statsGrid article > div strong {
          display: block;
        }

        .statsGrid article > div span {
          margin-bottom: 6px;
          color: #666;
          font-size: 12px;
        }

        .statsGrid article > div strong {
          color: #064e77;
          font-size: 25px;
        }

        .rankRow {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 17px;
        }

        .rankRow div {
          padding: 14px;
          border: 1px solid #9e9e9e;
          border-radius: 10px;
          background:
            linear-gradient(
              180deg,
              #fdfdfd,
              #d6d6d6
            );
          box-shadow:
            inset 0 2px 0 #fff,
            0 4px 0 #858b8e;
          text-align: center;
        }

        .rankRow span,
        .rankRow strong {
          display: block;
        }

        .rankRow span {
          color: #555;
          font-size: 12px;
        }

        .rankRow strong {
          margin-top: 4px;
          color: #07527d;
          font-size: 22px;
        }

        .paymentTop {
          display: grid;
          grid-template-columns:
            repeat(5, minmax(0, 1fr));
          gap: 12px;
        }

        .paymentCard {
          position: relative;
          min-width: 0;
          min-height: 104px;
          padding: 14px 15px;
          overflow: hidden;
          border-radius: 15px;
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,.88),
            0 5px 0 rgba(0,0,0,.24),
            0 10px 20px rgba(0,0,0,.08);
        }

        .paymentCard::after {
          content: "";
          position: absolute;
          right: -25px;
          bottom: -38px;
          width: 105px;
          height: 105px;
          border-radius: 50%;
          background: rgba(255,255,255,.18);
          pointer-events: none;
        }

        .paymentCardHead {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          color: #334b59;
          font-size: 12px;
          font-weight: 800;
        }

        .paymentCardIcon {
          width: 28px;
          height: 28px;
          display: inline-flex !important;
          align-items: center;
          justify-content: center;
          flex: 0 0 28px;
          margin: 0 !important;
          border: 1px solid currentColor;
          border-radius: 50%;
          background: rgba(255,255,255,.58);
          box-shadow:
            inset 0 1px 0 #fff,
            0 2px 0 rgba(0,0,0,.16);
          font-family: Arial, Helvetica, sans-serif;
          font-size: 15px;
          font-weight: 900;
        }

        .paymentCard strong {
          position: relative;
          z-index: 1;
          display: block;
          font-size: 22px;
          line-height: 1.15;
        }

        .paymentCard.total {
          border: 1px solid #6f8fa4;
          background:
            linear-gradient(145deg, #f5fcff, #add9ee);
          color: #154f70;
        }

        .paymentCard.paid {
          border: 1px solid #6fa17d;
          background:
            linear-gradient(145deg, #f1fff4, #a7deb5);
          color: #166337;
        }

        .paymentCard.debt {
          border: 1px solid #ad6b6b;
          background:
            linear-gradient(145deg, #fff5f5, #efb0b0);
          color: #9d2727;
        }

        .paymentCard.advance {
          border: 1px solid #6e93aa;
          background:
            linear-gradient(145deg, #f4fbff, #acd9ee);
          color: #175b80;
        }

        .paymentCard.deadline {
          border: 1px solid #b99744;
          background:
            linear-gradient(145deg, #fff9df, #ecd176);
          color: #6d5311;
        }

        .paymentCard.deadlineOverdue {
          border-color: #ad6b6b;
          background:
            linear-gradient(145deg, #fff2f2, #efa9a9);
          color: #9d2727;
        }

        .paymentProgressBox {
          width: min(94%, 1180px);
          margin: 24px auto 0;
          padding: 22px 24px 20px;
          border: 1px solid rgba(92, 113, 126, .72);
          border-radius: 22px;
          background:
            radial-gradient(
              circle at 50% -70%,
              rgba(91, 205, 246, .24),
              transparent 54%
            ),
            linear-gradient(
              180deg,
              rgba(255,255,255,.98),
              rgba(226,234,239,.98)
            );
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,.98),
            inset 0 -1px 0 rgba(54,79,92,.12),
            0 6px 0 rgba(63,77,84,.34),
            0 14px 28px rgba(0,0,0,.14);
        }

        .timeJourneyHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 22px;
          padding-bottom: 15px;
          border-bottom: 1px solid rgba(72,96,108,.18);
        }

        .timeJourneyHeader > div:first-child {
          min-width: 0;
        }

        .timeJourneyEyebrow {
          display: block;
          margin-bottom: 5px;
          color: #2d7fa7;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.3px;
        }

        .timeJourneyHeader strong {
          color: #173b50;
          font-size: 20px;
          line-height: 1.1;
        }

        .timeStatusChip {
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 38px;
          padding: 7px 12px;
          border: 1px solid #88b9ce;
          border-radius: 999px;
          background: #e9f8fe;
          color: #175b7d;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 11px;
          font-weight: 800;
          box-shadow: inset 0 1px 0 #fff;
        }

        .timeStatusChip.waiting {
          border-color: #a9b2b8;
          background: #f0f2f3;
          color: #5f6a70;
        }

        .timeStatusChip.near,
        .timeStatusChip.last {
          border-color: #d5a44b;
          background: #fff4d4;
          color: #765112;
        }

        .timeStatusChip.overdue {
          border-color: #d68b8b;
          background: #fff0f0;
          color: #9e2e2e;
        }

        .timeStatusDot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: currentColor;
          box-shadow: 0 0 0 4px rgba(42,143,189,.10);
        }

        .modernDeadline {
          width: 100%;
          display: grid;
          grid-template-columns:
            minmax(130px, .22fr)
            minmax(260px, 1fr)
            minmax(130px, .22fr);
          gap: 20px;
          align-items: center;
          padding: 12px 4px 8px;
        }

        .deadlineDate {
          min-width: 0;
          text-align: center;
        }

        .deadlineDate span,
        .deadlineDate strong {
          display: block;
        }

        .deadlineDate span {
          margin-bottom: 7px;
          color: #78909c;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .deadlineDate strong {
          color: #0d577d;
          font-size: 17px;
          white-space: nowrap;
        }

        .deadlineRailWrap {
          min-width: 0;
          padding: 38px 0 0;
        }

        .deadlineRail {
          position: relative;
          height: 14px;
          border: 1px solid #8ba9b8;
          border-radius: 999px;
          background:
            linear-gradient(
              180deg,
              #dce6eb 0%,
              #bdcdd5 100%
            );
          box-shadow:
            inset 0 2px 4px rgba(20,48,61,.22),
            0 1px 0 #fff;
        }

        .deadlineRail::before,
        .deadlineRail::after {
          content: "";
          position: absolute;
          top: 50%;
          z-index: 5;
          width: 20px;
          height: 20px;
          transform: translateY(-50%);
          border: 4px solid #f9fdff;
          border-radius: 50%;
          background: #2b97c5;
          box-shadow:
            0 0 0 2px #2b7799,
            0 3px 8px rgba(0,0,0,.20);
        }

        .deadlineRail::before {
          left: -5px;
        }

        .deadlineRail::after {
          right: -5px;
          background: #f1b74a;
          box-shadow:
            0 0 0 2px #a87b24,
            0 3px 8px rgba(0,0,0,.20);
        }

        .deadlineElapsed {
          position: absolute;
          inset: 0 auto 0 0;
          z-index: 2;
          min-width: 0;
          border-radius: inherit;
          background:
            linear-gradient(
              90deg,
              #1d8fc0 0%,
              #31b7e4 54%,
              #70d7f4 100%
            );
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.45),
            0 0 14px rgba(49,183,228,.35);
          transition: width 1.2s cubic-bezier(.2,.8,.2,1);
        }

        .deadlineElapsed.near,
        .deadlineElapsed.last {
          background:
            linear-gradient(90deg, #289ac4, #e4a83a);
        }

        .deadlineElapsed.overdue {
          background:
            linear-gradient(90deg, #c94747, #ee7a65);
        }

        .railGlow {
          position: absolute;
          top: 2px;
          left: 2%;
          right: 2%;
          z-index: 3;
          height: 3px;
          border-radius: 999px;
          background: rgba(255,255,255,.52);
          pointer-events: none;
        }

        .movingMarker {
          position: absolute;
          top: 50%;
          z-index: 8;
          width: 1px;
          height: 1px;
          transform: translate(-50%, -50%);
          transition: left 1.2s cubic-bezier(.2,.8,.2,1);
        }

        .markerCore {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 28px;
          height: 28px;
          display: grid;
          place-items: center;
          transform: translate(-50%, -50%);
          border: 4px solid #fff;
          border-radius: 50%;
          background:
            radial-gradient(circle at 35% 30%, #8ee8ff, #1e98c8 60%, #0b5f85);
          color: transparent;
          box-shadow:
            0 0 0 2px #176f96,
            0 5px 12px rgba(0,0,0,.28);
        }

        .movingMarker.near .markerCore,
        .movingMarker.last .markerCore {
          background:
            radial-gradient(circle at 35% 30%, #fff0a7, #e9ad39 60%, #9d6b10);
          box-shadow:
            0 0 0 2px #a2731f,
            0 5px 12px rgba(0,0,0,.28);
        }

        .movingMarker.overdue .markerCore {
          background:
            radial-gradient(circle at 35% 30%, #ffc6c6, #dd5454 60%, #8e2020);
          box-shadow:
            0 0 0 2px #a52d2d,
            0 5px 12px rgba(0,0,0,.28);
        }

        .markerPulse {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 42px;
          height: 42px;
          transform: translate(-50%, -50%);
          border: 2px solid rgba(28,153,201,.32);
          border-radius: 50%;
          animation: markerPulse 2s ease-out infinite;
        }

        .movingMarker.near .markerPulse,
        .movingMarker.last .markerPulse {
          border-color: rgba(220,157,45,.38);
        }

        .movingMarker.overdue .markerPulse {
          border-color: rgba(214,67,67,.36);
        }

        .todayBubble {
          position: absolute;
          left: 50%;
          bottom: 24px;
          min-width: 112px;
          padding: 7px 10px;
          transform: translateX(-50%);
          border: 1px solid #87bad0;
          border-radius: 11px;
          background:
            linear-gradient(180deg, #ffffff, #e5f5fb);
          color: #174f6a;
          text-align: center;
          box-shadow:
            inset 0 1px 0 #fff,
            0 4px 10px rgba(0,0,0,.12);
          white-space: nowrap;
        }

        .todayBubble::after {
          content: "";
          position: absolute;
          left: 50%;
          bottom: -6px;
          width: 10px;
          height: 10px;
          transform: translateX(-50%) rotate(45deg);
          border-right: 1px solid #87bad0;
          border-bottom: 1px solid #87bad0;
          background: #e5f5fb;
        }

        .todayBubble small,
        .todayBubble strong {
          display: block;
          position: relative;
          z-index: 2;
        }

        .todayBubble small {
          margin-bottom: 2px;
          color: #4b93b3;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: .9px;
        }

        .todayBubble strong {
          font-size: 12px;
        }

        .deadlineMeta {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-top: 11px;
          color: #6f818a;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 9px;
          font-weight: 700;
        }

        .deadlineEmpty {
          min-height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          padding: 20px;
          border: 1px dashed #9bb0ba;
          border-radius: 16px;
          background: rgba(255,255,255,.48);
          color: #58717e;
          text-align: left;
        }

        .deadlineEmptyIcon {
          width: 45px;
          height: 45px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 50%;
          background: #e5f5fb;
          color: #2388b4;
          font-size: 23px;
        }

        .deadlineEmpty strong,
        .deadlineEmpty span {
          display: block;
        }

        .deadlineEmpty strong {
          margin-bottom: 4px;
          color: #294c5e;
        }

        .deadlineEmpty div span {
          max-width: 430px;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 11px;
          line-height: 1.4;
        }

        .paymentCompletion {
          margin-top: 18px;
          padding-top: 15px;
          border-top: 1px solid rgba(72,96,108,.16);
        }

        .progressLabels {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 8px;
          color: #344c59;
          font-weight: 700;
        }

        .progressLabels strong {
          color: #0b527b;
        }

        .progressTrack {
          height: 13px;
          overflow: hidden;
          border: 1px solid #99a6ad;
          border-radius: 999px;
          background:
            linear-gradient(180deg, #d5d9db, #b9c0c4);
          box-shadow:
            inset 0 2px 3px rgba(0,0,0,.18);
        }

        .progressFill {
          height: 100%;
          border-radius: inherit;
          background:
            linear-gradient(180deg, #45c0ee, #168fbd);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.55);
          transition: width .7s ease;
        }

        @keyframes markerPulse {
          0% {
            opacity: .72;
            transform: translate(-50%, -50%) scale(.76);
          }
          70% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(1.28);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(1.28);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .deadlineElapsed,
          .movingMarker {
            transition: none;
          }

          .markerPulse {
            animation: none;
          }
        }

        .historyBlock {
          margin-top: 22px;
        }

        .historyBlock h2 {
          margin: 0 0 13px;
          color: #fff;
          font-size: 21px;
          letter-spacing: .2px;
          text-shadow: 0 1px 0 rgba(0,0,0,.40);
        }

        .historyTimeline {
          display: grid;
          gap: 13px;
        }

        .historyItem {
          display: grid;
          grid-template-columns: 48px minmax(0, 1fr);
          gap: 12px;
          padding: 13px 14px;
          border: 1px solid #a8afb2;
          border-left-width: 5px;
          border-radius: 14px;
          background:
            linear-gradient(180deg, #ffffff, #ededed);
          box-shadow:
            inset 0 2px 0 #fff,
            0 4px 0 rgba(61, 68, 72, .30);
        }

        .historyItem.payment {
          border-color: #72b88a;
          border-left-color: #2f9d59;
          background:
            linear-gradient(145deg, #f7fff8, #dff6e6);
          box-shadow:
            inset 0 2px 0 #fff,
            0 4px 0 #6ca27b;
        }

        .historyItem.debt {
          border-color: #d3b36d;
          border-left-color: #b88a25;
          background:
            linear-gradient(145deg, #fffdf5, #f4e6bd);
          box-shadow:
            inset 0 2px 0 #fff,
            0 4px 0 #a99561;
        }

        .historyItem.debt.settledCharge {
          border-color: #8db39a;
          border-left-color: #4f9d68;
          background:
            linear-gradient(145deg, #fbfffc, #e0f2e5);
          box-shadow:
            inset 0 2px 0 #fff,
            0 4px 0 #769f82;
        }

        .historyItem.period {
          border-color: #88bad1;
          border-left-color: #2a8fbd;
          background:
            linear-gradient(145deg, #f7fcff, #dceff8);
          box-shadow:
            inset 0 2px 0 #fff,
            0 4px 0 #6f9daf;
        }

        .historyItem.adjustment {
          border-color: #d6bd78;
          border-left-color: #b58b2c;
          background:
            linear-gradient(145deg, #fffdf6, #f5ecd3);
          box-shadow:
            inset 0 2px 0 #fff,
            0 4px 0 #a99561;
        }

        .historyIndex {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          align-self: start;
          border: 1px solid #71818a;
          border-radius: 50%;
          background:
            linear-gradient(180deg, #fff, #cfd8dc);
          color: #183f55;
          box-shadow:
            inset 0 2px 0 #fff,
            0 3px 0 #727d82;
          font-weight: 900;
        }

        .historyItem.payment .historyIndex {
          border-color: #3f945b;
          color: #176d37;
          background:
            linear-gradient(180deg, #effff3, #aee3bc);
        }

        .historyItem.debt .historyIndex {
          border-color: #9b7928;
          color: #795b13;
          background:
            linear-gradient(180deg, #fffbed, #ead490);
        }

        .historyItem.period .historyIndex {
          border-color: #3f8fb2;
          color: #155f83;
          background:
            linear-gradient(180deg, #eefaff, #b6dff1);
        }

        .historyContent {
          min-width: 0;
        }

        .historyItemTop {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(110,120,125,.24);
        }

        .historyTitleGroup {
          min-width: 0;
        }

        .historyAction,
        .historyDate {
          display: block;
        }

        .historyAction {
          color: #183f55;
          font-size: 16px;
        }

        .historyItem.payment .historyAction {
          color: #16723a;
        }

        .historyItem.debt .historyAction {
          color: #765814;
        }

        .historyItem.period .historyAction {
          color: #17658b;
        }

        .historyDate {
          margin-top: 4px;
          color: #6a6f72;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 11px;
        }

        .settledBadge {
          display: inline-flex;
          align-items: center;
          margin-top: 7px;
          padding: 4px 8px;
          border: 1px solid #6fa17d;
          border-radius: 999px;
          background: #e9f8ed;
          color: #176d37;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 10px;
          font-weight: 800;
        }

        .historyAmount {
          flex: 0 0 auto;
          padding: 7px 10px;
          border-radius: 9px;
          background: rgba(255,255,255,.76);
          font-family: Arial, Helvetica, sans-serif;
          font-size: 13px;
          white-space: nowrap;
        }

        .historyItem.payment .historyAmount {
          border: 1px solid #96cda6;
          background: #e8f8ed;
        }

        .historyItem.debt .historyAmount {
          border: 1px solid #d8bd79;
          background: #fff7de;
        }

        .historyItem.period .historyAmount {
          border: 1px solid #a8cfe0;
          background: #ecf8fd;
        }

        .greenText {
          color: #178243;
        }

        .neutralText {
          color: #285a78;
        }

        .chargeText {
          color: #765814;
        }

        .creativePeriod {
          display: grid;
          grid-template-columns:
            minmax(115px, auto)
            minmax(100px, 1fr)
            minmax(115px, auto);
          gap: 12px;
          align-items: center;
          margin-top: 12px;
          padding: 13px 14px;
          border: 1px solid #b6d4e2;
          border-radius: 12px;
          background:
            linear-gradient(180deg, rgba(255,255,255,.72), rgba(231,246,252,.80));
          box-shadow:
            inset 0 1px 0 #fff;
        }

        .periodDatePoint {
          position: relative;
          text-align: center;
        }

        .periodDatePoint strong,
        .periodDatePoint small {
          display: block;
        }

        .periodDatePoint strong {
          color: #0f5f87;
          font-size: 14px;
        }

        .periodDatePoint small {
          margin-top: 4px;
          color: #66808d;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .4px;
        }

        .periodDot {
          width: 17px;
          height: 17px;
          display: block;
          margin: 0 auto 7px;
          border: 3px solid #2a8fbd;
          border-radius: 50%;
          background: #fff;
          box-shadow:
            0 0 0 4px rgba(42,143,189,.14),
            inset 0 1px 0 #fff;
        }

        .periodConnector {
          position: relative;
          height: 20px;
        }

        .connectorLine {
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 4px;
          transform: translateY(-50%);
          border-radius: 999px;
          background:
            repeating-linear-gradient(
              90deg,
              #2a8fbd 0 16px,
              #8ed0ea 16px 26px
            );
          box-shadow:
            0 1px 0 #fff;
        }

        .connectorArrow {
          position: absolute;
          top: 50%;
          right: -2px;
          transform: translateY(-54%);
          color: #17658b;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 22px;
          font-weight: 900;
          background: #e8f7fd;
          padding-left: 4px;
        }

        .historyNote {
          margin-top: 10px;
          padding: 8px 10px;
          border: 1px solid rgba(105,113,118,.24);
          border-radius: 9px;
          background: rgba(255,255,255,.48);
          color: #344b57;
          font-size: 12px;
          font-weight: 700;
        }

        .emptyRow {
          padding: 28px;
          color: #656565;
          text-align: center;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        .twoColumns {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 22px;
        }

        .smallPanel {
          margin-bottom: 0;
        }

        .smallTab {
          min-width: 260px;
          font-size: 22px;
        }

        .attemptList {
          display: grid;
          gap: 10px;
        }

        .attemptList article {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 13px;
          border: 1px solid #aaa;
          border-radius: 11px;
          background:
            linear-gradient(
              180deg,
              #fff,
              #dfdfdf
            );
          box-shadow:
            inset 0 2px 0 #fff,
            0 4px 0 #8d9497;
        }

        .attemptList strong,
        .attemptList small,
        .testType {
          display: block;
        }

        .testType {
          margin-bottom: 4px;
          color: #267198;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .attemptList small {
          margin-top: 5px;
          color: #777;
        }

        .scoreBox {
          min-width: 80px;
          padding-left: 12px;
          border-left: 1px solid #bbb;
          text-align: right;
        }

        .scoreBox strong {
          color: #0b567e;
          font-size: 18px;
        }

        .scoreBox span {
          color: #16813f;
          font-size: 11px;
        }

        .emptyCard {
          padding: 28px;
          border-radius: 11px;
          background: #fff;
          text-align: center;
        }

        .quickGrid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .quickGrid button {
          min-height: 80px;
          padding: 12px;
          border: 2px solid #435159;
          border-radius: 13px;
          background:
            linear-gradient(
              180deg,
              #ffffff,
              #d6d6d6 65%,
              #bcbcbc
            );
          color: #111;
          box-shadow:
            inset 0 2px 0 #fff,
            0 5px 0 #5b686e;
          font-size: 17px;
          font-weight: 700;
          cursor: pointer;
        }

        .quickGrid button:hover {
          filter: brightness(1.05);
        }

        @media (max-width: 1200px) {
          .paymentTop {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }

          .paymentCard.deadline {
            grid-column: span 2;
          }

          .creativePeriod {
            grid-template-columns:
              minmax(105px, auto)
              minmax(70px, 1fr)
              minmax(105px, auto);
          }

          .siteHeader {
            align-items: stretch;
            flex-direction: column;
          }

          .ownerButton {
            min-width: 0;
          }

          .navButtons {
            justify-content: center;
          }

          .profileArea {
            grid-template-columns:
              auto minmax(0, 1fr);
          }

          .rankMedal {
            grid-column: 1 / -1;
          }

          .statsGrid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 820px) {
          .paymentProgressBox {
            width: 100%;
            padding: 18px 14px;
          }

          .timeJourneyHeader {
            align-items: flex-start;
            flex-direction: column;
          }

          .modernDeadline {
            grid-template-columns: 1fr;
            gap: 8px;
          }

          .deadlineDate {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 0 4px;
          }

          .deadlineDate span {
            margin: 0;
          }

          .deadlineRailWrap {
            padding: 42px 10px 6px;
          }

          .endDate {
            margin-top: 3px;
          }
          .content {
            width: calc(100% - 24px);
          }

          .profileArea {
            grid-template-columns: 1fr;
            text-align: center;
          }

          .avatar3d {
            margin: 0 auto;
          }

          .activeStatus {
            margin: 0 auto;
          }

          .profileMeta,
          .paymentTop,
          .rankRow,
          .twoColumns {
            grid-template-columns: 1fr;
          }

          .paymentCard.deadline {
            grid-column: auto;
          }

          .paymentProgressHeader {
            grid-template-columns: 1fr;
          }

          .paymentState {
            text-align: left;
          }

          .creativePeriod {
            grid-template-columns: 1fr;
          }

          .periodConnector {
            height: 42px;
          }

          .connectorLine {
            top: 0;
            bottom: 0;
            left: 50%;
            right: auto;
            width: 4px;
            height: auto;
            transform: translateX(-50%);
            background:
              repeating-linear-gradient(
                180deg,
                #2a8fbd 0 16px,
                #8ed0ea 16px 26px
              );
          }

          .connectorArrow {
            top: auto;
            right: 50%;
            bottom: -4px;
            transform:
              translateX(50%)
              rotate(90deg);
          }

          .navButtons {
            display: grid;
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .navButtons .exitButton {
            grid-column: 1 / -1;
          }

          .paymentEquation {
            grid-template-columns: 1fr;
          }

          .paymentEquation > b {
            display: none;
          }

          .historyDetails {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 560px) {
          .timeJourneyHeader strong {
            font-size: 18px;
          }

          .timeStatusChip {
            max-width: 100%;
          }

          .deadlineDate strong {
            font-size: 15px;
          }

          .deadlineRailWrap {
            padding-top: 46px;
          }

          .todayBubble {
            min-width: 100px;
            padding: 6px 8px;
          }

          .deadlineMeta {
            flex-direction: column;
            align-items: center;
            gap: 3px;
          }
          .siteHeader {
            width: calc(100% - 16px);
            margin-top: 8px;
            padding: 12px;
          }

          .ownerButton {
            font-size: 18px;
          }

          .navButtons {
            grid-template-columns: 1fr;
          }

          .navButtons .exitButton {
            grid-column: auto;
          }

          .historyItemTop {
            flex-direction: column;
          }

          .historyAmount {
            align-self: flex-start;
          }

          .content {
            margin-top: 62px;
          }

          .bigPanel {
            padding: 56px 14px 18px;
          }

          .panelTab {
            min-width: 230px;
            font-size: 20px;
          }

          .statsGrid {
            grid-template-columns: 1fr;
          }

          .statsGrid article {
            min-height: 86px;
          }

          .quickGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
