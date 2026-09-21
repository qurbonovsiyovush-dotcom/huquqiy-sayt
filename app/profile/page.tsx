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

  sources?: Array<{
    source: string;
    worked: number;
    correct: number;
    incorrect: number;
  }>;

  recentAttempts?: Array<{
    id: string;
    source: string;
    testType: string | null;
    testId: string;
    testTitle: string;
    subject: string | null;
    totalQuestions: number;
    correct: number;
    incorrect: number;
    unanswered: number;
    percentage: number;
    earnedPoints: number;
    totalPoints: number;
    spentSeconds: number;
    finishedAt: string | null;
  }>;
};


type FinanceSummary = {
  currentDebt: number;
  advance: number;
  totalPaid: number;
  totalDebtAdded: number;
};

type FinanceEntry = {
  id: string;
  entryType: string;
  amount: number;
  note: string | null;
  occurredAt: string | null;
  isVoided: boolean;
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

function financeEntryName(
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

  return "Qarz yangilandi";
}

function initials(
  fullName: string
) {
  const parts =
    fullName
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  return parts
    .slice(0, 2)
    .map(
      (part) =>
        part.charAt(0)
          .toUpperCase()
    )
    .join("") || "U";
}

function formatDate(
  value: string | null | undefined
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

function sourceName(
  source: string
) {
  if (
    source ===
    "national-certificate"
  ) {
    return "Milliy sertifikat";
  }

  if (
    source === "thematic"
  ) {
    return "Mavzulashtirilgan";
  }

  if (
    source === "legacy"
  ) {
    return "Asosiy testlar";
  }

  return source;
}

export default function ProfilePage() {
  const router =
    useRouter();

  const [data, setData] =
    useState<ProfileResponse | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [financeSummary, setFinanceSummary] =
    useState<FinanceSummary>({
      currentDebt: 0,
      advance: 0,
      totalPaid: 0,
      totalDebtAdded: 0,
    });

  const [financeEntries, setFinanceEntries] =
    useState<FinanceEntry[]>([]);

  useEffect(() => {
    void loadProfile();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProfile() {
    setLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/profile/me",
          {
            cache: "no-store",
          }
        );

      const result =
        (await response.json()) as ProfileResponse;

      if (!response.ok) {
        throw new Error(
          result?.message ||
            "Profilni yuklab bo‘lmadi."
        );
      }

      setData(result);

      const financeResponse =
        await fetch(
          "/api/profile/payments",
          {
            cache: "no-store",
          }
        );

      const financeData =
        await financeResponse
          .json()
          .catch(() => ({}));

      if (
        financeResponse.ok
      ) {
        setFinanceSummary({
          currentDebt:
            Number(
              financeData
                ?.summary
                ?.currentDebt ||
                0
            ),

          advance:
            Number(
              financeData
                ?.summary
                ?.advance ||
                0
            ),

          totalPaid:
            Number(
              financeData
                ?.summary
                ?.totalPaid ||
                0
            ),

          totalDebtAdded:
            Number(
              financeData
                ?.summary
                ?.totalDebtAdded ||
                0
            ),
        });

        setFinanceEntries(
          Array.isArray(
            financeData
              ?.entries
          )
            ? financeData.entries
            : []
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Profilni yuklashda xatolik."
      );
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await fetch(
        "/api/logout",
        {
          method: "POST",
        }
      );
    } finally {
      router.replace("/");
      router.refresh();
    }
  }

  const profile =
    data?.profile;

  const week =
    data?.ranking?.week;

  const month =
    data?.ranking?.month;

  const all =
    data?.ranking?.all;

  const sourceTotal =
    useMemo(
      () =>
        (data?.sources || [])
          .reduce(
            (
              sum,
              item
            ) =>
              sum +
              item.worked,
            0
          ),
      [data?.sources]
    );

  if (loading) {
    return (
      <main className="loadingPage">
        <div className="loader" />
        <strong>
          Profil yuklanmoqda...
        </strong>

        <style jsx>{`
          .loadingPage {
            min-height: 100vh;
            display: grid;
            place-items: center;
            align-content: center;
            gap: 14px;
            background: #f4f7fa;
            font-family: "Bell MT", Georgia, serif;
          }

          .loader {
            width: 42px;
            height: 42px;
            border: 5px solid #dce7ed;
            border-top-color: #2c93bd;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
  

        /* =====================================================
           QURBONOVV.UZ — MODERN DARK PROFILE V3
        ===================================================== */

        :global(html) {
          scroll-behavior: smooth;
        }

        :global(body) {
          margin: 0;
          background: #041521;
        }

        .page {
          min-height: 100vh;
          background:
            radial-gradient(circle at 88% 8%, rgba(43, 156, 220, .16), transparent 27%),
            radial-gradient(circle at 9% 72%, rgba(27, 102, 169, .13), transparent 28%),
            linear-gradient(180deg, #061a2a 0%, #061522 48%, #071b2c 100%);
          color: #f4fbff;
          font-family: Georgia, "Times New Roman", serif;
        }

        .topBar {
          position: sticky;
          top: 0;
          z-index: 60;
          min-height: 92px;
          padding: 14px 24px;
          border-bottom: 1px solid rgba(109, 207, 255, .34);
          background: linear-gradient(180deg, rgba(58, 188, 246, .98), rgba(24, 125, 186, .97));
          box-shadow: 0 9px 28px rgba(0, 0, 0, .24);
          display: grid;
          grid-template-columns: minmax(360px, 1fr) auto auto;
          align-items: center;
          gap: 18px;
        }

        .siteBrand {
          justify-self: start;
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 56px;
          padding: 9px 20px;
          border: 1px solid #536b78;
          border-radius: 14px;
          background: linear-gradient(180deg, #fff 0%, #e7edf0 100%);
          color: #132630;
          box-shadow: inset 0 2px 0 #fff, 0 5px 0 #274556, 0 10px 22px rgba(0,0,0,.18);
          font-size: 20px;
          font-weight: 700;
          cursor: pointer;
        }

        .siteBrandIcon {
          display: grid;
          place-items: center;
          width: 35px;
          height: 35px;
          border-radius: 50%;
          background: #f4f4f4;
          color: #173b50;
          font-size: 19px;
        }

        .topNav {
          display: flex;
          align-items: center;
          overflow: hidden;
          border: 1px solid rgba(135, 216, 255, .34);
          border-radius: 14px;
          background: linear-gradient(180deg, #0c4c75, #073653);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.1), 0 7px 17px rgba(0,0,0,.15);
        }

        .topNav button {
          min-height: 50px;
          padding: 0 18px;
          border: 0;
          border-right: 1px solid rgba(255,255,255,.08);
          background: transparent;
          color: #eff9ff;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .topNav button:hover {
          background: rgba(73, 177, 232, .16);
        }

        .topActions {
          display: flex;
          gap: 9px;
        }

        .topActions button {
          min-height: 50px;
          border-radius: 11px;
          color: #fff;
          font-weight: 700;
          cursor: pointer;
        }

        .topActions .refreshButton {
          width: 48px;
          padding: 0;
          border: 1px solid #246f96;
          background: linear-gradient(180deg, #73d4fa, #2e9ac9);
          box-shadow: inset 0 1px 0 #dff8ff, 0 4px 0 #23789b;
        }

        .topActions .logoutButton {
          padding: 0 20px;
          border: 1px solid #8f1520;
          background: linear-gradient(180deg, #ef4f5f, #c31225);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.35), 0 4px 0 #86121d;
        }

        .layout {
          display: grid;
          grid-template-columns: 270px minmax(0, 1fr);
          width: min(1780px, 100%);
          margin: 0 auto;
          padding: 20px;
          gap: 18px;
        }

        .sideNav {
          position: sticky;
          top: 112px;
          align-self: start;
          height: calc(100vh - 132px);
          width: auto;
          padding: 0;
          overflow: auto;
          border: 1px solid rgba(83, 170, 223, .48);
          border-radius: 18px;
          background: linear-gradient(180deg, rgba(8, 42, 67, .98), rgba(5, 29, 47, .99));
          box-shadow: inset 0 1px 0 rgba(255,255,255,.05), 0 13px 30px rgba(0,0,0,.26);
        }

        .sidebarProfile {
          padding: 26px 16px 20px;
          text-align: center;
        }

        .sidebarAvatar {
          display: grid;
          place-items: center;
          width: 122px;
          height: 122px;
          margin: 0 auto 15px;
          overflow: hidden;
          border: 3px solid #9bdcff;
          border-radius: 50%;
          background: linear-gradient(135deg, #e7f6ff, #8cc9ed);
          color: #163b54;
          box-shadow: 0 0 0 6px rgba(80, 170, 220, .10), 0 10px 22px rgba(0,0,0,.22);
          font-size: 34px;
          font-weight: 900;
        }

        .sidebarAvatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .sidebarProfile h2 {
          margin: 0 0 10px;
          color: #fff;
          font-size: 21px;
        }

        .sidebarStatus {
          display: inline-flex;
          padding: 6px 11px;
          border-radius: 8px;
          background: linear-gradient(180deg, #149461, #0a6845);
          color: #e2fff0;
          font-size: 12px;
          font-weight: 700;
        }

        .sidebarMenu {
          display: grid;
          gap: 1px;
          padding: 0 0 14px;
        }

        .sidebarMenu button {
          display: flex;
          align-items: center;
          gap: 13px;
          min-height: 55px;
          padding: 0 20px;
          border: 0;
          border-top: 1px solid rgba(255,255,255,.05);
          border-radius: 0;
          background: transparent;
          color: #dcecf5;
          text-align: left;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .sidebarMenu button span {
          display: grid;
          place-items: center;
          width: 28px;
          color: #9ddaff;
          font-size: 19px;
        }

        .sidebarMenu button:hover {
          background: rgba(54, 159, 217, .12);
        }

        .sidebarMenu .activeNav {
          background: linear-gradient(180deg, #2c9cf3, #176fe0);
          color: #fff;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.25);
        }

        .sidebarQuote {
          margin: 0 13px 15px;
          padding: 18px;
          border: 1px solid rgba(68, 145, 190, .22);
          border-radius: 13px;
          background: radial-gradient(circle at 85% 20%, rgba(214, 172, 78, .14), transparent 32%), rgba(5, 27, 44, .78);
        }

        .sidebarQuote > div {
          color: #d9ad55;
          font-size: 35px;
          text-align: right;
        }

        .sidebarQuote p {
          margin: 9px 0 12px;
          color: #edf8ff;
          font-size: 15px;
          font-style: italic;
          line-height: 1.35;
        }

        .sidebarQuote span {
          color: #7196aa;
          font-size: 9px;
          letter-spacing: .08em;
        }

        .content {
          grid-column: auto;
          min-width: 0;
          padding: 0;
        }

        .modernHeroBanner {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 140px minmax(240px, .55fr);
          align-items: center;
          min-height: 140px;
          margin-bottom: 15px;
          padding: 22px 26px;
          overflow: hidden;
          border: 1px solid rgba(72, 163, 218, .55);
          border-radius: 17px;
          background: radial-gradient(circle at 58% 50%, rgba(42, 153, 216, .25), transparent 28%), linear-gradient(120deg, rgba(13, 60, 91, .98), rgba(7, 37, 61, .98));
          box-shadow: inset 0 1px 0 rgba(255,255,255,.06), 0 10px 26px rgba(0,0,0,.2);
        }

        .modernHeroBanner > div:first-child > span {
          color: #61c5f7;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .14em;
        }

        .modernHeroBanner h2 {
          margin: 7px 0 6px;
          font-size: 31px;
        }

        .modernHeroBanner p {
          margin: 0;
          color: #b9d4e3;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 13px;
        }

        .bannerLawMark {
          display: grid;
          place-items: center;
          width: 92px;
          height: 92px;
          justify-self: center;
          border: 2px solid rgba(143, 216, 255, .35);
          border-radius: 50%;
          background: linear-gradient(180deg, rgba(18, 78, 115, .92), rgba(5, 39, 63, .96));
          color: #d5a94d;
          box-shadow: 0 0 0 8px rgba(42, 127, 176, .10), 0 10px 24px rgba(0,0,0,.24);
          font-size: 44px;
        }

        .modernHeroBanner blockquote {
          margin: 0;
          padding-left: 20px;
          border-left: 1px solid rgba(255,255,255,.08);
          color: #d8e8f1;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 13px;
          line-height: 1.5;
        }

        .profileHero,
        .rankSection,
        .financeSection,
        .panel {
          border: 1px solid rgba(70, 155, 208, .48);
          background: linear-gradient(180deg, rgba(10, 48, 76, .97), rgba(7, 35, 58, .98));
          box-shadow: inset 0 1px 0 rgba(255,255,255,.05), 0 10px 25px rgba(0,0,0,.18);
          color: #f5fbff;
        }

        .profileHero {
          grid-template-columns: auto minmax(0, 1fr) auto;
          margin-bottom: 15px;
          padding: 19px;
          border-radius: 16px;
        }

        .avatar {
          width: 82px;
          height: 82px;
          border: 3px solid #8ed4f8;
          background: linear-gradient(135deg, #e8f6ff, #91cbea);
          color: #163c55;
        }

        .profileMain h1 {
          color: #fff;
          font-size: 29px;
        }

        .metaLine {
          color: #87a8b9;
          font-family: Arial, Helvetica, sans-serif;
        }

        .profileCode {
          background: rgba(72, 151, 196, .18);
          color: #9ddcff;
        }

        .heroRank {
          border: 1px solid rgba(202, 163, 73, .48);
          background: linear-gradient(135deg, rgba(115, 87, 26, .45), rgba(81, 60, 19, .36));
        }

        .heroRank span {
          color: #d6c181;
        }

        .heroRank strong {
          color: #ffd96b;
        }

        .quickGrid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 15px;
        }

        .quickGrid article {
          min-height: 105px;
          padding: 17px;
          border: 1px solid rgba(65, 154, 211, .38);
          border-radius: 14px;
          background: linear-gradient(180deg, rgba(13, 55, 86, .98), rgba(8, 40, 66, .98));
          box-shadow: inset 0 1px 0 rgba(255,255,255,.05), 0 7px 18px rgba(0,0,0,.16);
        }

        .quickGrid span {
          color: #b7d0de;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12px;
        }

        .quickGrid strong {
          color: #6bc6ff;
          font-size: 27px;
        }

        .greenCard {
          border-color: rgba(38, 189, 118, .40) !important;
          background: linear-gradient(180deg, rgba(13, 81, 63, .77), rgba(8, 55, 45, .83)) !important;
        }

        .greenCard strong {
          color: #50d795;
        }

        .redCard {
          border-color: rgba(214, 69, 92, .42) !important;
          background: linear-gradient(180deg, rgba(91, 41, 55, .78), rgba(62, 31, 43, .85)) !important;
        }

        .redCard strong {
          color: #ff8194;
        }

        .rankSection,
        .financeSection,
        .panel {
          border-radius: 16px;
          padding: 18px;
        }

        .sectionTitle h2 {
          color: #fff;
          font-size: 19px;
        }

        .sectionTitle span {
          color: #86a7b8;
        }

        .rankGrid article,
        .financeSummaryGrid article,
        .sourceList article,
        .activityList article,
        .financeHistory {
          background: rgba(7, 39, 64, .70);
          color: #eff9ff;
        }

        .rankGrid article {
          border: 1px solid rgba(66, 145, 194, .25);
        }

        .rankGrid article span,
        .rankGrid article small,
        .financeSummaryGrid span,
        .financeHistory article > div:first-child span,
        .sourceHeader span,
        .activityList span {
          color: #82a3b5;
        }

        .rankGrid article strong,
        .financeSummaryGrid strong,
        .sourceHeader strong,
        .activityList strong {
          color: #eaf8ff;
        }

        .rankGrid .goldRank {
          background: linear-gradient(135deg, rgba(119, 87, 20, .42), rgba(83, 59, 17, .36));
          border: 1px solid rgba(205, 165, 76, .42);
        }

        .rankGrid .goldRank strong {
          color: #ffd568;
        }

        .financeSummaryGrid .debtFinance strong {
          color: #ff8495;
        }

        .financeSummaryGrid .paidFinance strong,
        .financeAmount.payment,
        .good {
          color: #51d895;
        }

        .financeAmount.debt,
        .financeAmount.adjustment,
        .bad {
          color: #ff8495;
        }

        .financeHistory article {
          border-bottom-color: rgba(255,255,255,.07);
        }

        .track {
          background: rgba(116, 151, 174, .24);
        }

        .track div {
          background: linear-gradient(90deg, #2fb7ff, #3079f0);
        }

        .twoColumn {
          gap: 15px;
        }

        .empty {
          color: #829eae;
        }

        .errorBox {
          border-color: rgba(226, 77, 95, .55);
          background: rgba(101, 33, 47, .75);
          color: #ffdfe4;
        }

        @media (max-width: 1280px) {
          .topBar {
            grid-template-columns: 1fr auto;
          }

          .topNav {
            grid-column: 1 / -1;
            grid-row: 2;
            justify-self: stretch;
          }

          .topNav button {
            flex: 1;
          }

          .layout {
            grid-template-columns: 235px minmax(0, 1fr);
          }

          .quickGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 930px) {
          .topBar {
            position: relative;
            grid-template-columns: 1fr;
          }

          .siteBrand,
          .topActions {
            justify-self: stretch;
          }

          .siteBrand {
            justify-content: center;
          }

          .topNav {
            grid-column: auto;
            grid-row: auto;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .topActions button {
            flex: 1;
          }

          .layout {
            grid-template-columns: 1fr;
          }

          .sideNav {
            position: relative;
            top: 0;
            height: auto;
          }

          .sidebarMenu {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .modernHeroBanner {
            grid-template-columns: 1fr;
          }

          .bannerLawMark,
          .modernHeroBanner blockquote {
            display: none;
          }

          .twoColumn {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 620px) {
          .topBar,
          .layout {
            padding-left: 10px;
            padding-right: 10px;
          }

          .siteBrand {
            font-size: 16px;
          }

          .topNav,
          .sidebarMenu,
          .quickGrid,
          .rankGrid,
          .financeSummaryGrid {
            grid-template-columns: 1fr;
          }

          .profileHero {
            grid-template-columns: 1fr;
            text-align: center;
          }

          .avatar {
            margin: 0 auto;
          }

          .statusLine,
          .metaLine {
            justify-content: center;
          }
        }

      `}</style>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="topBar">
        <button
          type="button"
          className="siteBrand"
          onClick={() =>
            router.push("/")
          }
        >
          <span className="siteBrandIcon">⚖</span>
          <span>Qurbonov Siyovush Jamaliddinzoda</span>
        </button>

        <nav className="topNav">
          <button
            type="button"
            onClick={() =>
              (window.location.href =
                "/#talabalar")
            }
          >
            ♙ Talabalar
          </button>

          <button
            type="button"
            onClick={() =>
              (window.location.href =
                "/#abituriyent")
            }
          >
            ♟ Abituriyent
          </button>

          <button
            type="button"
            onClick={() =>
              (window.location.href =
                "/#savol-javob")
            }
          >
            ● Savol-javob
          </button>

          <button
            type="button"
            onClick={() =>
              (window.location.href =
                "/#qollanmalar")
            }
          >
            ▣ Qo‘llanmalar
          </button>
        </nav>

        <div className="topActions">
          <button
            type="button"
            className="refreshButton"
            onClick={() =>
              void loadProfile()
            }
          >
            ↻
          </button>

          <button
            type="button"
            className="logoutButton"
            onClick={() =>
              void logout()
            }
          >
            ↪ Chiqish
          </button>
        </div>
      </header>

      <div className="layout">
        <aside className="sideNav">
          <section className="sidebarProfile">
            <div className="sidebarAvatar">
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

            <h2>
              {profile?.fullName ||
                "Foydalanuvchi"}
            </h2>

            <span className="sidebarStatus">
              ✓ Faol foydalanuvchi
            </span>
          </section>

          <nav className="sidebarMenu">
            <button
              type="button"
              className="activeNav"
            >
              <span>⌂</span> Asosiy ma’lumotlar
            </button>

            <button
              type="button"
              onClick={() =>
                router.push("/test")
              }
            >
              <span>▤</span> Mening testlarim
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/national-certificate"
                )
              }
            >
              <span>◔</span> Milliy sertifikat
            </button>

            <button
              type="button"
              onClick={() => {
                document
                  .querySelector(
                    ".financeSection"
                  )
                  ?.scrollIntoView({
                    behavior: "smooth",
                  });
              }}
            >
              <span>▰</span> To‘lovlar
            </button>

            <button
              type="button"
              onClick={() =>
                router.push("/")
              }
            >
              <span>⚙</span> Asosiy sahifa
            </button>
          </nav>

          <div className="sidebarQuote">
            <div>⚖</div>
            <p>
              “Bilim — sizning eng katta investitsiyangiz.”
            </p>
            <span>QURBONOVV.UZ</span>
          </div>
        </aside>

        <section className="content">
          {error && (
            <div className="errorBox">
              {error}
            </div>
          )}

          {profile && (
            <>
              <section className="modernHeroBanner">
                <div>
                  <span>SHAXSIY KABINET</span>
                  <h2>Foydalanuvchi profili</h2>
                  <p>
                    Natijalar, reyting va to‘lov holati — barchasi bitta joyda.
                  </p>
                </div>

                <div className="bannerLawMark">⚖</div>

                <blockquote>
                  “Qonun ustuvor bo‘lgan jamiyatda kelajak porloqdir.”
                </blockquote>
              </section>

              <section className="profileHero">
                <div className="avatar">
                  {profile.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={
                        profile.avatarUrl
                      }
                      alt={
                        profile.fullName
                      }
                    />
                  ) : (
                    <span>
                      {initials(
                        profile.fullName
                      )}
                    </span>
                  )}
                </div>

                <div className="profileMain">
                  <div className="statusLine">
                    <span className="activeBadge">
                      Faol profil
                    </span>

                    <span className="profileCode">
                      {
                        profile.profileCode
                      }
                    </span>
                  </div>

                  <h1>
                    {
                      profile.fullName
                    }
                  </h1>

                  <div className="metaLine">
                    <span>
                      Profil yaratilgan:{" "}
                      {formatDate(
                        profile.createdAt
                      )}
                    </span>

                    <span>
                      Oxirgi kirish:{" "}
                      {formatDate(
                        profile.lastLoginAt
                      )}
                    </span>

                    <span>
                      Faol kodlar:{" "}
                      {
                        profile.activeCodeCount
                      }
                    </span>
                  </div>
                </div>

                <div className="heroRank">
                  <span>
                    Umumiy o‘rin
                  </span>

                  <strong>
                    {all?.rank
                      ? `#${all.rank}`
                      : "—"}
                  </strong>
                </div>
              </section>

              <section className="quickGrid">
                <article>
                  <span>
                    Ishlangan
                  </span>

                  <strong>
                    {
                      all?.workedQuestions ||
                      0
                    }
                  </strong>
                </article>

                <article className="greenCard">
                  <span>
                    To‘g‘ri
                  </span>

                  <strong>
                    {
                      all?.correct ||
                      0
                    }
                  </strong>
                </article>

                <article className="redCard">
                  <span>
                    Noto‘g‘ri
                  </span>

                  <strong>
                    {
                      all?.incorrect ||
                      0
                    }
                  </strong>
                </article>

                <article>
                  <span>
                    Aniqlik
                  </span>

                  <strong>
                    {
                      all?.accuracy ||
                      0
                    }
                    %
                  </strong>
                </article>
              </section>

              <section className="rankSection">
                <div className="sectionTitle">
                  <h2>
                    Reyting
                  </h2>
                </div>

                <div className="rankGrid">
                  <article>
                    <span>
                      Haftalik
                    </span>

                    <strong>
                      {week?.rank
                        ? `#${week.rank}`
                        : "—"}
                    </strong>

                    <small>
                      {
                        week?.correct ||
                        0
                      }{" "}
                      ta to‘g‘ri
                    </small>
                  </article>

                  <article>
                    <span>
                      Oylik
                    </span>

                    <strong>
                      {month?.rank
                        ? `#${month.rank}`
                        : "—"}
                    </strong>

                    <small>
                      {
                        month?.correct ||
                        0
                      }{" "}
                      ta to‘g‘ri
                    </small>
                  </article>

                  <article className="goldRank">
                    <span>
                      Umumiy
                    </span>

                    <strong>
                      {all?.rank
                        ? `#${all.rank}`
                        : "—"}
                    </strong>

                    <small>
                      {
                        all?.accuracy ||
                        0
                      }
                      % aniqlik
                    </small>
                  </article>
                </div>
              </section>

              <section className="financeSection">
                <div className="sectionTitle">
                  <h2>
                    To‘lov holati
                  </h2>

                  <span>
                    {financeSummary.currentDebt > 0
                      ? `Qarz: ${money(
                          financeSummary.currentDebt
                        )}`
                      : financeSummary.advance > 0
                        ? `Avans: ${money(
                            financeSummary.advance
                          )}`
                        : "Qarzdorlik yo‘q"}
                  </span>
                </div>

                <div className="financeSummaryGrid">
                  <article className="debtFinance">
                    <span>
                      Hozirgi qarz
                    </span>

                    <strong>
                      {money(
                        financeSummary.currentDebt
                      )}
                    </strong>
                  </article>

                  <article className="paidFinance">
                    <span>
                      Jami to‘langan
                    </span>

                    <strong>
                      {money(
                        financeSummary.totalPaid
                      )}
                    </strong>
                  </article>

                  <article>
                    <span>
                      Avans
                    </span>

                    <strong>
                      {money(
                        financeSummary.advance
                      )}
                    </strong>
                  </article>
                </div>

                <div className="financeHistory">
                  <h3>
                    So‘nggi moliyaviy harakatlar
                  </h3>

                  {financeEntries
                    .filter(
                      (item) =>
                        !item.isVoided
                    )
                    .slice(
                      0,
                      6
                    )
                    .map(
                      (item) => (
                        <article
                          key={
                            item.id
                          }
                        >
                          <div>
                            <strong>
                              {financeEntryName(
                                item.entryType
                              )}
                            </strong>

                            <span>
                              {formatDate(
                                item.occurredAt
                              )}
                              {item.note
                                ? ` • ${item.note}`
                                : ""}
                            </span>
                          </div>

                          <div
                            className={`financeAmount ${item.entryType}`}
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
                        </article>
                      )
                    )}

                  {financeEntries.filter(
                    (item) =>
                      !item.isVoided
                  ).length ===
                    0 && (
                    <div className="empty">
                      Hozircha to‘lov ma’lumoti yo‘q.
                    </div>
                  )}
                </div>
              </section>

              <section className="twoColumn">
                <div className="panel">
                  <div className="sectionTitle">
                    <h2>
                      Test yo‘nalishlari
                    </h2>

                    <span>
                      Jami:{" "}
                      {
                        sourceTotal
                      }
                    </span>
                  </div>

                  <div className="sourceList">
                    {(data?.sources ||
                      []).map(
                      (item) => {
                        const accuracy =
                          item.worked >
                          0
                            ? Math.round(
                                (
                                  item.correct /
                                  item.worked
                                ) *
                                  1000
                              ) /
                              10
                            : 0;

                        return (
                          <article
                            key={
                              item.source
                            }
                          >
                            <div className="sourceHeader">
                              <strong>
                                {sourceName(
                                  item.source
                                )}
                              </strong>

                              <span>
                                {
                                  item.worked
                                }{" "}
                                savol
                              </span>
                            </div>

                            <div className="sourceNumbers">
                              <span className="good">
                                ✓{" "}
                                {
                                  item.correct
                                }
                              </span>

                              <span className="bad">
                                ×{" "}
                                {
                                  item.incorrect
                                }
                              </span>

                              <span>
                                {
                                  accuracy
                                }
                                %
                              </span>
                            </div>

                            <div className="track">
                              <div
                                style={{
                                  width:
                                    `${Math.max(
                                      0,
                                      Math.min(
                                        100,
                                        accuracy
                                      )
                                    )}%`,
                                }}
                              />
                            </div>
                          </article>
                        );
                      }
                    )}

                    {(data?.sources ||
                      []).length ===
                      0 && (
                      <div className="empty">
                        Hozircha test statistikasi yo‘q.
                      </div>
                    )}
                  </div>
                </div>

                <div className="panel">
                  <div className="sectionTitle">
                    <h2>
                      So‘nggi faollik
                    </h2>
                  </div>

                  <div className="activityList">
                    {(data?.recentAttempts ||
                      [])
                      .slice(
                        0,
                        6
                      )
                      .map(
                        (item) => (
                          <article
                            key={
                              item.id
                            }
                          >
                            <div>
                              <strong>
                                {
                                  item.testTitle
                                }
                              </strong>

                              <span>
                                {sourceName(
                                  item.source
                                )}{" "}
                                •{" "}
                                {formatDate(
                                  item.finishedAt
                                )}
                              </span>
                            </div>

                            <div className="activityScore">
                              <strong>
                                {
                                  item.correct
                                }
                                /
                                {
                                  item.totalQuestions
                                }
                              </strong>

                              <span>
                                {
                                  item.percentage
                                }
                                %
                              </span>
                            </div>
                          </article>
                        )
                      )}

                    {(data
                      ?.recentAttempts ||
                      []).length ===
                      0 && (
                      <div className="empty">
                        Hozircha urinishlar yo‘q.
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </>
          )}
        </section>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          background: #f5f7fb;
          color: #172033;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        .topBar {
          position: sticky;
          top: 0;
          z-index: 20;
          min-height: 72px;
          padding: 12px 28px 12px 360px;
          border-bottom: 1px solid #e3e8ef;
          background: rgba(255,255,255,.96);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          backdrop-filter: blur(10px);
        }

        .menuButton {
          width: 44px;
          height: 44px;
          border: 1px solid #dce4ed;
          border-radius: 11px;
          background: #fff;
          font-size: 20px;
        }

        .topActions {
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
        }

        .topActions button {
          min-height: 42px;
          padding: 8px 14px;
          border: 1px solid #dce5ef;
          border-radius: 10px;
          background: #fff;
          color: #24324a;
          font-weight: 700;
          cursor: pointer;
        }

        .layout {
          display: grid;
          grid-template-columns:
            330px minmax(0, 1fr);
        }

        .sideNav {
          position: fixed;
          top: 0;
          bottom: 0;
          left: 0;
          z-index: 30;
          width: 330px;
          padding: 26px 18px;
          border-right: 1px solid #e1e6ed;
          background: #fff;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 34px;
          padding: 0 8px;
        }

        .brandMark {
          display: grid;
          place-items: center;
          width: 53px;
          height: 53px;
          border: 2px solid #19426c;
          border-radius: 15px;
          color: #19426c;
          font-size: 27px;
          font-weight: 900;
        }

        .brand strong,
        .brand span {
          display: block;
        }

        .brand strong {
          color: #162c4e;
          font-size: 20px;
        }

        .brand span {
          margin-top: 3px;
          color: #748097;
          font-size: 12px;
        }

        nav {
          display: grid;
          gap: 8px;
        }

        nav button {
          min-height: 50px;
          padding: 10px 14px;
          border: 0;
          border-radius: 13px;
          background: transparent;
          color: #3d4960;
          text-align: left;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
        }

        nav button.activeNav {
          background: #edf4ff;
          color: #2668d9;
        }

        .content {
          grid-column: 2;
          min-width: 0;
          padding: 30px;
        }

        .errorBox {
          margin-bottom: 16px;
          padding: 13px 15px;
          border: 1px solid #f0b2b2;
          border-radius: 12px;
          background: #fff1f1;
          color: #9d2929;
          font-weight: 700;
        }

        .profileHero {
          display: grid;
          grid-template-columns:
            auto minmax(0, 1fr) auto;
          gap: 22px;
          align-items: center;
          margin-bottom: 20px;
          padding: 24px;
          border: 1px solid #e1e7ee;
          border-radius: 20px;
          background: #fff;
          box-shadow:
            0 6px 20px rgba(28, 45, 75, .06);
        }

        .avatar {
          display: grid;
          place-items: center;
          width: 94px;
          height: 94px;
          overflow: hidden;
          border: 4px solid #e7f0ff;
          border-radius: 50%;
          background:
            linear-gradient(135deg, #ddebff, #aacdff);
          color: #2259a5;
          font-size: 30px;
          font-weight: 900;
        }

        .avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .statusLine {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }

        .activeBadge,
        .profileCode {
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
        }

        .activeBadge {
          background: #e9f8ee;
          color: #19773b;
        }

        .profileCode {
          background: #eff4fa;
          color: #617086;
        }

        .profileMain h1 {
          margin: 0 0 10px;
          color: #152540;
          font-size: clamp(
            26px,
            3vw,
            36px
          );
        }

        .metaLine {
          display: flex;
          gap: 10px 18px;
          flex-wrap: wrap;
          color: #748097;
          font-size: 12px;
        }

        .heroRank {
          min-width: 150px;
          padding: 16px;
          border: 1px solid #e9d28b;
          border-radius: 16px;
          background:
            linear-gradient(135deg, #fffaf0, #fff0b5);
          text-align: center;
        }

        .heroRank span,
        .heroRank strong {
          display: block;
        }

        .heroRank span {
          margin-bottom: 6px;
          color: #8c752b;
          font-size: 12px;
        }

        .heroRank strong {
          color: #7c5e00;
          font-size: 29px;
        }

        .quickGrid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 13px;
          margin-bottom: 20px;
        }

        .quickGrid article {
          padding: 18px;
          border: 1px solid #e0e6ed;
          border-radius: 17px;
          background: #fff;
          box-shadow:
            0 5px 16px rgba(28,45,75,.05);
        }

        .quickGrid span,
        .quickGrid strong {
          display: block;
        }

        .quickGrid span {
          margin-bottom: 7px;
          color: #778299;
          font-size: 12px;
        }

        .quickGrid strong {
          color: #204f86;
          font-size: 28px;
        }

        .greenCard strong {
          color: #198443;
        }

        .redCard strong {
          color: #c73b3b;
        }

        .rankSection,
        .panel {
          border: 1px solid #e0e6ed;
          border-radius: 20px;
          background: #fff;
          box-shadow:
            0 6px 20px rgba(28,45,75,.05);
        }

        .rankSection {
          margin-bottom: 20px;
          padding: 20px;
        }

        .sectionTitle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 15px;
        }

        .sectionTitle h2 {
          margin: 0;
          color: #1a2942;
          font-size: 19px;
        }

        .sectionTitle span {
          color: #8290a5;
          font-size: 12px;
        }

        .rankGrid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 13px;
        }

        .rankGrid article {
          padding: 18px;
          border-radius: 15px;
          background: #f6f8fb;
          text-align: center;
        }

        .rankGrid article span,
        .rankGrid article strong,
        .rankGrid article small {
          display: block;
        }

        .rankGrid article span {
          color: #768298;
          font-size: 12px;
        }

        .rankGrid article strong {
          margin: 6px 0;
          color: #215da9;
          font-size: 30px;
        }

        .rankGrid article small {
          color: #8993a4;
        }

        .rankGrid .goldRank {
          background:
            linear-gradient(135deg, #fffaf0, #fff0b6);
        }

        .rankGrid .goldRank strong {
          color: #876300;
        }


        .financeSection {
          margin-bottom: 20px;
          padding: 20px;
          border: 1px solid #e0e6ed;
          border-radius: 20px;
          background: #fff;
          box-shadow:
            0 6px 20px rgba(28,45,75,.05);
        }

        .financeSummaryGrid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 11px;
          margin-bottom: 15px;
        }

        .financeSummaryGrid article {
          padding: 16px;
          border-radius: 14px;
          background: #f6f8fb;
        }

        .financeSummaryGrid span,
        .financeSummaryGrid strong {
          display: block;
        }

        .financeSummaryGrid span {
          color: #7a8598;
          font-size: 11px;
        }

        .financeSummaryGrid strong {
          margin-top: 5px;
          color: #245f9f;
          font-size: 19px;
        }

        .financeSummaryGrid .debtFinance strong {
          color: #c13a3a;
        }

        .financeSummaryGrid .paidFinance strong {
          color: #198144;
        }

        .financeHistory {
          padding: 14px;
          border-radius: 15px;
          background: #f7f9fc;
        }

        .financeHistory h3 {
          margin: 0 0 10px;
          color: #283751;
          font-size: 15px;
        }

        .financeHistory article {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid #e4e8ed;
        }

        .financeHistory article:last-child {
          border-bottom: 0;
        }

        .financeHistory strong,
        .financeHistory span {
          display: block;
        }

        .financeHistory article > div:first-child strong {
          color: #273650;
          font-size: 13px;
        }

        .financeHistory article > div:first-child span {
          margin-top: 4px;
          color: #7a879b;
          font-size: 10px;
        }

        .financeAmount {
          min-width: 120px;
          text-align: right;
          font-size: 14px;
          font-weight: 700;
        }

        .financeAmount.payment {
          color: #198144;
        }

        .financeAmount.debt,
        .financeAmount.adjustment {
          color: #c13a3a;
        }

        .twoColumn {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            minmax(0, 1fr);
          gap: 20px;
        }

        .panel {
          padding: 20px;
        }

        .sourceList,
        .activityList {
          display: grid;
          gap: 11px;
        }

        .sourceList article,
        .activityList article {
          padding: 14px;
          border-radius: 14px;
          background: #f7f9fc;
        }

        .sourceHeader,
        .sourceNumbers,
        .activityList article {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .sourceHeader strong {
          color: #273650;
        }

        .sourceHeader span,
        .activityList span {
          color: #7a879b;
          font-size: 11px;
        }

        .sourceNumbers {
          margin: 9px 0 7px;
          justify-content: flex-start;
          font-size: 12px;
        }

        .good {
          color: #188044;
        }

        .bad {
          color: #c84242;
        }

        .track {
          height: 6px;
          overflow: hidden;
          border-radius: 999px;
          background: #dfe6ee;
        }

        .track div {
          height: 100%;
          border-radius: inherit;
          background:
            linear-gradient(90deg, #4da9f8, #2c6ee8);
        }

        .activityList article > div:first-child {
          min-width: 0;
        }

        .activityList strong,
        .activityList span {
          display: block;
        }

        .activityList strong {
          overflow: hidden;
          color: #263550;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .activityList span {
          margin-top: 5px;
        }

        .activityScore {
          min-width: 70px;
          text-align: right;
        }

        .activityScore strong {
          color: #2564b4;
          font-size: 17px;
        }

        .empty {
          padding: 25px;
          color: #8994a6;
          text-align: center;
        }

        @media (
          max-width: 1000px
        ) {
          .topBar {
            padding-left: 20px;
          }

          .sideNav {
            display: none;
          }

          .layout {
            display: block;
          }

          .content {
            padding: 20px;
          }

          .profileHero {
            grid-template-columns:
              auto minmax(0, 1fr);
          }

          .heroRank {
            grid-column:
              1 / -1;
          }

          .twoColumn {
            grid-template-columns:
              1fr;
          }
        }

        @media (
          max-width: 650px
        ) {
          .topBar {
            align-items: flex-start;
            flex-direction: column;
          }

          .content {
            padding: 12px;
          }

          .profileHero {
            grid-template-columns:
              1fr;
            text-align: center;
          }

          .avatar {
            margin: 0 auto;
          }

          .statusLine,
          .metaLine {
            justify-content: center;
          }

          .quickGrid,
          .rankGrid,
          .financeSummaryGrid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .topActions {
            width: 100%;
          }

          .topActions button {
            flex: 1;
          }
        }
      `}</style>
    </main>
  );
}

