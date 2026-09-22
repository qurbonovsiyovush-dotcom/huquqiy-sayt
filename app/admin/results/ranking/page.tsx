"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Period =
  | "week"
  | "month"
  | "all";

type SortMode =
  | "rank"
  | "correct"
  | "accuracy"
  | "worked"
  | "name"
  | "activity";

type RankingTestItem = {
  source: string;
  testId: string;
  testTitle: string;
  workedQuestions: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  attempts: number;
  firstActivityAt: string | null;
  lastActivityAt: string | null;
};

type RankingProfile = {
  id: string;
  profileCode: string;
  fullName: string;
  rankingEnabled: boolean;
  createdAt: string | null;
};

type RankingItem = {
  rank: number;
  userId: string;
  userName: string;
  workedQuestions: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  testsWorked: number;
  attempts: number;
  earnedPoints: number;
  firstActivityAt: string | null;
  lastActivityAt: string | null;
  tests: RankingTestItem[];
};

type RankingResponse = {
  success: boolean;
  period?: Period;
  timezone?: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  summary?: {
    participants: number;
    uniqueAnswers: number;
    correctAnswers: number;
    incorrectAnswers: number;
  };
  ranking?: RankingItem[];
  profiles?: RankingProfile[];
  message?: string;
};

function periodTitle(
  period: Period
) {
  if (period === "week") {
    return "Haftalik reyting";
  }

  if (period === "month") {
    return "Oylik reyting";
  }

  return "Umumiy reyting";
}

function formatDate(
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

function safeDate() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function normalizePdfText(
  value: string
) {
  return String(value || "")
    .replace(
      /[‘’ʻʼ`´]/g,
      "'"
    )
    .replace(
      /[–—]/g,
      "-"
    );
}

function csvCell(
  value: unknown
) {
  const text =
    String(value ?? "");

  return `"${text.replace(
    /"/g,
    '""'
  )}"`;
}

function numberOrZero(
  value: unknown
) {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : 0;
}

export default function AdminRankingPage() {
  const router =
    useRouter();

  const [period, setPeriod] =
    useState<Period>("week");

  const [ranking, setRanking] =
    useState<RankingItem[]>([]);

  const [summary, setSummary] =
    useState({
      participants: 0,
      uniqueAnswers: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
    });

  const [
    periodStart,
    setPeriodStart,
  ] = useState<
    string | null
  >(null);

  const [
    periodEnd,
    setPeriodEnd,
  ] = useState<
    string | null
  >(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [sortMode, setSortMode] =
    useState<SortMode>("rank");

  const [
    selectionMode,
    setSelectionMode,
  ] = useState(false);

  const [
    selectedIds,
    setSelectedIds,
  ] = useState<Set<string>>(
    new Set()
  );

  const [
    showSelectedOnly,
    setShowSelectedOnly,
  ] = useState(false);

  const [
    deletingUserId,
    setDeletingUserId,
  ] = useState<
    string | null
  >(null);

  const [
    deletingSelected,
    setDeletingSelected,
  ] = useState(false);

  const [
    clearingAll,
    setClearingAll,
  ] = useState(false);

  const [
    expandedUsers,
    setExpandedUsers,
  ] = useState<Set<string>>(
    new Set()
  );

  const [
    rankingProfiles,
    setRankingProfiles,
  ] = useState<RankingProfile[]>([]);

  const [
    showRankingManager,
    setShowRankingManager,
  ] = useState(false);

  const [
    profileSearch,
    setProfileSearch,
  ] = useState("");

  const [
    updatingProfileId,
    setUpdatingProfileId,
  ] = useState<string | null>(null);

  const [
    managerSelectionMode,
    setManagerSelectionMode,
  ] = useState(false);

  const [
    managerSelectedIds,
    setManagerSelectedIds,
  ] = useState<Set<string>>(
    new Set()
  );

  const [
    archivingProfileId,
    setArchivingProfileId,
  ] = useState<string | null>(null);

  const [
    archivingSelected,
    setArchivingSelected,
  ] = useState(false);

  /* =====================================================
     LOAD
  ===================================================== */

  useEffect(() => {
    setSelectedIds(
      new Set()
    );

    setShowSelectedOnly(
      false
    );

    setSelectionMode(
      false
    );

    setExpandedUsers(
      new Set()
    );

    void loadRanking();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  async function readJson(
    response: Response
  ) {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  async function loadRanking() {
    setLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          `/api/admin/ranking?period=${period}&limit=500`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

      const data:
        RankingResponse =
        await readJson(
          response
        );

      if (!response.ok) {
        if (
          response.status ===
          403
        ) {
          router.replace("/");
          return;
        }

        throw new Error(
          data?.message ||
            "Reytingni yuklab bo‘lmadi."
        );
      }

      const nextRanking =
        Array.isArray(
          data?.ranking
        )
          ? data.ranking
          : [];

      setRanking(
        nextRanking
      );

      setRankingProfiles(
        Array.isArray(
          data?.profiles
        )
          ? data.profiles
          : []
      );

      setSelectedIds(
        (current) => {
          const allowed =
            new Set(
              nextRanking.map(
                (item) =>
                  item.userId
              )
            );

          return new Set(
            [...current].filter(
              (id) =>
                allowed.has(id)
            )
          );
        }
      );

      setSummary({
        participants:
          numberOrZero(
            data?.summary
              ?.participants
          ),

        uniqueAnswers:
          numberOrZero(
            data?.summary
              ?.uniqueAnswers
          ),

        correctAnswers:
          numberOrZero(
            data?.summary
              ?.correctAnswers
          ),

        incorrectAnswers:
          numberOrZero(
            data?.summary
              ?.incorrectAnswers
          ),
      });

      setPeriodStart(
        data?.periodStart ||
          null
      );

      setPeriodEnd(
        data?.periodEnd ||
          null
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Reytingni yuklashda xatolik."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =====================================================
     FILTER / SORT
  ===================================================== */

  const visibleRanking =
    useMemo(() => {
      const needle =
        search
          .trim()
          .toLowerCase();

      let rows =
        ranking.filter(
          (item) => {
            const matchesSearch =
              !needle ||
              item.userName
                .toLowerCase()
                .includes(
                  needle
                ) ||
              item.userId
                .toLowerCase()
                .includes(
                  needle
                );

            const matchesSelected =
              !showSelectedOnly ||
              selectedIds.has(
                item.userId
              );

            return (
              matchesSearch &&
              matchesSelected
            );
          }
        );

      rows =
        [...rows];

      if (
        sortMode ===
        "correct"
      ) {
        rows.sort(
          (a, b) =>
            b.correct -
              a.correct ||
            b.accuracy -
              a.accuracy ||
            a.rank -
              b.rank
        );
      } else if (
        sortMode ===
        "accuracy"
      ) {
        rows.sort(
          (a, b) =>
            b.accuracy -
              a.accuracy ||
            b.correct -
              a.correct ||
            a.rank -
              b.rank
        );
      } else if (
        sortMode ===
        "worked"
      ) {
        rows.sort(
          (a, b) =>
            b.workedQuestions -
              a.workedQuestions ||
            b.correct -
              a.correct ||
            a.rank -
              b.rank
        );
      } else if (
        sortMode ===
        "name"
      ) {
        rows.sort(
          (a, b) =>
            a.userName.localeCompare(
              b.userName,
              "uz"
            )
        );
      } else if (
        sortMode ===
        "activity"
      ) {
        rows.sort(
          (a, b) =>
            new Date(
              b.lastActivityAt ||
                0
            ).getTime() -
            new Date(
              a.lastActivityAt ||
                0
            ).getTime()
        );
      } else {
        rows.sort(
          (a, b) =>
            a.rank -
            b.rank
        );
      }

      return rows;
    }, [
      ranking,
      search,
      sortMode,
      selectedIds,
      showSelectedOnly,
    ]);

  const visibleProfiles =
    useMemo(() => {
      const needle =
        profileSearch
          .trim()
          .toLowerCase();

      return rankingProfiles.filter(
        (profile) =>
          !needle ||
          profile.fullName
            .toLowerCase()
            .includes(needle) ||
          profile.profileCode
            .toLowerCase()
            .includes(needle)
      );
    }, [
      rankingProfiles,
      profileSearch,
    ]);

  const rankingEnabledCount =
    rankingProfiles.filter(
      (profile) =>
        profile.rankingEnabled
    ).length;

  const rankingDisabledCount =
    rankingProfiles.length -
    rankingEnabledCount;

  const allVisibleManagerSelected =
    visibleProfiles.length > 0 &&
    visibleProfiles.every(
      (profile) =>
        managerSelectedIds.has(
          profile.id
        )
    );

  const selectedManagerProfiles =
    visibleProfiles.filter(
      (profile) =>
        managerSelectedIds.has(
          profile.id
        )
    );

  const topThree =
    ranking.slice(
      0,
      3
    );

  const selectedItems =
    useMemo(
      () =>
        ranking.filter(
          (item) =>
            selectedIds.has(
              item.userId
            )
        ),
      [
        ranking,
        selectedIds,
      ]
    );

  const allVisibleSelected =
    visibleRanking.length >
      0 &&
    visibleRanking.every(
      (item) =>
        selectedIds.has(
          item.userId
        )
    );

  const exportRows =
    selectedItems.length >
    0
      ? selectedItems
      : visibleRanking;

  /* =====================================================
     SELECTION
  ===================================================== */

  function toggleUser(
    userId: string
  ) {
    setSelectedIds(
      (current) => {
        const next =
          new Set(current);

        if (
          next.has(userId)
        ) {
          next.delete(
            userId
          );
        } else {
          next.add(
            userId
          );
        }

        return next;
      }
    );
  }

  function toggleAllVisible() {
    setSelectedIds(
      (current) => {
        const next =
          new Set(current);

        if (
          allVisibleSelected
        ) {
          for (
            const item of
            visibleRanking
          ) {
            next.delete(
              item.userId
            );
          }
        } else {
          for (
            const item of
            visibleRanking
          ) {
            next.add(
              item.userId
            );
          }
        }

        return next;
      }
    );
  }

  function clearSelection() {
    setSelectedIds(
      new Set()
    );

    setShowSelectedOnly(
      false
    );
  }

  function openSelectionMode() {
    setSelectionMode(
      true
    );
  }

  function closeSelectionMode() {
    clearSelection();

    setSelectionMode(
      false
    );
  }

  function resetFilters() {
    setSearch("");
    setSortMode("rank");
    setShowSelectedOnly(false);
  }

  function toggleTests(
    userId: string
  ) {
    setExpandedUsers(
      (current) => {
        const next =
          new Set(current);

        if (
          next.has(userId)
        ) {
          next.delete(
            userId
          );
        } else {
          next.add(
            userId
          );
        }

        return next;
      }
    );
  }


  /* =====================================================
     REYTING BOSHQARUVI — PROFIL TANLASH / ARXIV
  ===================================================== */

  function toggleManagerProfile(
    profileId: string
  ) {
    setManagerSelectedIds(
      (current) => {
        const next =
          new Set(current);

        if (
          next.has(profileId)
        ) {
          next.delete(
            profileId
          );
        } else {
          next.add(
            profileId
          );
        }

        return next;
      }
    );
  }

  function toggleAllManagerVisible() {
    setManagerSelectedIds(
      (current) => {
        const next =
          new Set(current);

        if (
          allVisibleManagerSelected
        ) {
          for (
            const profile of
            visibleProfiles
          ) {
            next.delete(
              profile.id
            );
          }
        } else {
          for (
            const profile of
            visibleProfiles
          ) {
            next.add(
              profile.id
            );
          }
        }

        return next;
      }
    );
  }

  function closeManagerSelection() {
    setManagerSelectedIds(
      new Set()
    );
    setManagerSelectionMode(
      false
    );
  }

  async function archiveProfileRequest(
    profileId: string
  ) {
    const response =
      await fetch(
        "/api/admin/profiles",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body:
            JSON.stringify({
              action:
                "archive",
              profileId,
            }),
        }
      );

    const data =
      await readJson(
        response
      );

    if (!response.ok) {
      throw new Error(
        data?.message ||
          "Profilni ro‘yxatdan chiqarib bo‘lmadi."
      );
    }

    return data;
  }

  async function archiveRankingProfile(
    profile: RankingProfile
  ) {
    const first =
      window.confirm(
        `${profile.fullName} profilini ro‘yxatdan chiqarasizmi?\n\nProfil reyting boshqaruvidan yo‘qoladi va kirish kodlari faolsizlanadi. Test hamda to‘lov tarixi saqlanadi.`
      );

    if (!first) {
      return;
    }

    const second =
      window.confirm(
        `Oxirgi tasdiq:\n\n${profile.fullName} profilini ro‘yxatdan chiqarishni tasdiqlaysizmi?`
      );

    if (!second) {
      return;
    }

    setArchivingProfileId(
      profile.id
    );

    try {
      await archiveProfileRequest(
        profile.id
      );

      setManagerSelectedIds(
        (current) => {
          const next =
            new Set(current);

          next.delete(
            profile.id
          );

          return next;
        }
      );

      await loadRanking();
    } catch (err) {
      window.alert(
        err instanceof Error
          ? err.message
          : "Profilni ro‘yxatdan chiqarishda xatolik."
      );
    } finally {
      setArchivingProfileId(
        null
      );
    }
  }

  async function archiveSelectedProfiles() {
    if (
      managerSelectedIds.size === 0
    ) {
      window.alert(
        "Avval ro‘yxatdan chiqariladigan profillarni tanlang."
      );
      return;
    }

    const profiles =
      rankingProfiles.filter(
        (profile) =>
          managerSelectedIds.has(
            profile.id
          )
      );

    const first =
      window.confirm(
        `${profiles.length} ta profilni ro‘yxatdan chiqarasizmi?\n\nUlarning kirish kodlari faolsizlanadi. Test natijalari va to‘lov tarixi saqlanadi.`
      );

    if (!first) {
      return;
    }

    const second =
      window.confirm(
        `Oxirgi tasdiq:\n\nTanlangan ${profiles.length} ta profilni ro‘yxatdan chiqarish tasdiqlansinmi?`
      );

    if (!second) {
      return;
    }

    setArchivingSelected(
      true
    );

    try {
      for (
        const profile of
        profiles
      ) {
        await archiveProfileRequest(
          profile.id
        );
      }

      closeManagerSelection();

      await loadRanking();
    } catch (err) {
      window.alert(
        err instanceof Error
          ? err.message
          : "Tanlangan profillarni ro‘yxatdan chiqarishda xatolik."
      );

      await loadRanking();
    } finally {
      setArchivingSelected(
        false
      );
    }
  }

  /* =====================================================
     REYTING ON / OFF
  ===================================================== */

  async function toggleRankingProfile(
    profile: RankingProfile
  ) {
    const nextEnabled =
      !profile.rankingEnabled;

    const ok =
      window.confirm(
        nextEnabled
          ? `${profile.fullName} reytingda HISOBLANSINMI?`
          : `${profile.fullName} reytingdan chiqarilsinmi?\n\nTest natijalari o‘chmaydi. Faqat reytingda hisoblanmaydi.`
      );

    if (!ok) {
      return;
    }

    setUpdatingProfileId(
      profile.id
    );

    try {
      const response =
        await fetch(
          "/api/admin/ranking",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                action:
                  "ranking_enabled",
                profileId:
                  profile.id,
                enabled:
                  nextEnabled,
              }),
          }
        );

      const data =
        await readJson(
          response
        );

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Reyting holatini o‘zgartirib bo‘lmadi."
        );
      }

      await loadRanking();
    } catch (err) {
      window.alert(
        err instanceof Error
          ? err.message
          : "Reyting holatini o‘zgartirishda xatolik."
      );
    } finally {
      setUpdatingProfileId(
        null
      );
    }
  }

  /* =====================================================
     DELETE ONE
  ===================================================== */

  async function deleteUser(
    item: RankingItem
  ) {
    const ok =
      window.confirm(
        `${item.userName}ning BARCHA davrdagi reyting ma’lumotlarini o‘chirasizmi?\n\nBu amalni qaytarib bo‘lmaydi.`
      );

    if (!ok) {
      return;
    }

    setDeletingUserId(
      item.userId
    );

    try {
      const response =
        await fetch(
          "/api/admin/ranking",
          {
            method:
              "DELETE",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "user",
                userId:
                  item.userId,
              }),
          }
        );

      const data =
        await readJson(
          response
        );

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Talabani o‘chirib bo‘lmadi."
        );
      }

      setSelectedIds(
        (current) => {
          const next =
            new Set(current);

          next.delete(
            item.userId
          );

          return next;
        }
      );

      await loadRanking();
    } catch (err) {
      window.alert(
        err instanceof Error
          ? err.message
          : "O‘chirishda xatolik."
      );
    } finally {
      setDeletingUserId(
        null
      );
    }
  }

  /* =====================================================
     DELETE SELECTED
  ===================================================== */

  async function deleteSelected() {
    if (
      selectedIds.size ===
      0
    ) {
      window.alert(
        "Avval o‘chiriladigan foydalanuvchilarni tanlang."
      );
      return;
    }

    const names =
      selectedItems
        .slice(0, 5)
        .map(
          (item) =>
            `• ${item.userName}`
        )
        .join("\n");

    const extra =
      selectedItems.length >
      5
        ? `\n... va yana ${selectedItems.length - 5} ta`
        : "";

    const ok =
      window.confirm(
        `${selectedItems.length} ta foydalanuvchining BARCHA davrdagi reyting ma’lumotlari o‘chiriladi:\n\n${names}${extra}\n\nDavom etasizmi?`
      );

    if (!ok) {
      return;
    }

    setDeletingSelected(
      true
    );

    try {
      const response =
        await fetch(
          "/api/admin/ranking",
          {
            method:
              "DELETE",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "users",
                userIds:
                  [...selectedIds],
              }),
          }
        );

      const data =
        await readJson(
          response
        );

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Tanlangan foydalanuvchilarni o‘chirib bo‘lmadi."
        );
      }

      clearSelection();
      setSelectionMode(false);

      await loadRanking();
    } catch (err) {
      window.alert(
        err instanceof Error
          ? err.message
          : "O‘chirishda xatolik."
      );
    } finally {
      setDeletingSelected(
        false
      );
    }
  }

  /* =====================================================
     CLEAR ALL
  ===================================================== */

  async function clearAll() {
    const first =
      window.confirm(
        "UMUMIY REYTINGNI TO‘LIQ O‘CHIRASIZMI?\n\nBarcha foydalanuvchilar va savol natijalari o‘chadi."
      );

    if (!first) {
      return;
    }

    const second =
      window.confirm(
        "Oxirgi tasdiq:\n\nBu amalni qaytarib bo‘lmaydi. Davom etilsinmi?"
      );

    if (!second) {
      return;
    }

    setClearingAll(
      true
    );

    try {
      const response =
        await fetch(
          "/api/admin/ranking",
          {
            method:
              "DELETE",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "all",
              }),
          }
        );

      const data =
        await readJson(
          response
        );

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Umumiy reytingni o‘chirib bo‘lmadi."
        );
      }

      setSearch("");
      clearSelection();

      await loadRanking();
    } catch (err) {
      window.alert(
        err instanceof Error
          ? err.message
          : "O‘chirishda xatolik."
      );
    } finally {
      setClearingAll(
        false
      );
    }
  }

  /* =====================================================
     PDF
  ===================================================== */

  function exportPdf() {
    if (
      exportRows.length ===
      0
    ) {
      window.alert(
        "PDF uchun reyting natijalari yo‘q."
      );
      return;
    }

    const doc =
      new jsPDF({
        orientation:
          "landscape",
        unit: "mm",
        format: "a4",
      });

    const title =
      normalizePdfText(
        `${periodTitle(
          period
        ).toUpperCase()}${
          selectedItems.length
            ? " - TANLANGAN FOYDALANUVCHILAR"
            : ""
        }`
      );

    doc.setFont(
      "helvetica",
      "bold"
    );
    doc.setFontSize(15);
    doc.text(
      title,
      10,
      13
    );

    doc.setFont(
      "helvetica",
      "normal"
    );
    doc.setFontSize(8);

    const periodText =
      period === "all"
        ? "Davr: barcha vaqt"
        : `Davr: ${formatDate(
            periodStart
          )} - ${formatDate(
            periodEnd
          )}`;

    doc.text(
      normalizePdfText(
        periodText
      ),
      10,
      19
    );

    doc.text(
      normalizePdfText(
        `Jami: ${exportRows.length} foydalanuvchi | To'g'ri javoblar: ${exportRows.reduce(
          (sum, item) =>
            sum + item.correct,
          0
        )} | Ishlangan savollar: ${exportRows.reduce(
          (sum, item) =>
            sum +
            item.workedQuestions,
          0
        )}`
      ),
      10,
      24
    );

    autoTable(
      doc,
      {
        startY: 29,

        head: [[
          "O'rin",
          "Foydalanuvchi",
          "Ishlangan",
          "To'g'ri",
          "Noto'g'ri",
          "Aniqlik",
          "Testlar",
          "Urinishlar",
          "Ball",
          "Oxirgi faollik",
        ]],

        body:
          exportRows.map(
            (item) => [
              item.rank,
              normalizePdfText(
                item.userName
              ),
              item.workedQuestions,
              item.correct,
              item.incorrect,
              `${item.accuracy}%`,
              item.testsWorked,
              item.attempts,
              item.earnedPoints,
              normalizePdfText(
                formatDate(
                  item.lastActivityAt
                )
              ),
            ]
          ),

        styles: {
          fontSize: 7.5,
          halign:
            "center",
          valign:
            "middle",
        },

        headStyles: {
          fontStyle:
            "bold",
        },

        columnStyles: {
          1: {
            halign:
              "left",
          },
          9: {
            halign:
              "left",
          },
        },

        margin: {
          left: 8,
          right: 8,
        },
      }
    );

    const totalPages =
      doc.getNumberOfPages();

    for (
      let page = 1;
      page <= totalPages;
      page++
    ) {
      doc.setPage(
        page
      );

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(7);

      doc.text(
        `${page}/${totalPages}`,
        287,
        202,
        {
          align:
            "right",
        }
      );
    }

    doc.save(
      `umumiy-reyting-${period}-${safeDate()}.pdf`
    );
  }

  /* =====================================================
     CSV
  ===================================================== */

  function exportCsv() {
    if (
      exportRows.length ===
      0
    ) {
      window.alert(
        "Eksport uchun natija yo‘q."
      );
      return;
    }

    const rows = [
      [
        "O‘rin",
        "Foydalanuvchi",
        "User ID",
        "Ishlangan savollar",
        "To‘g‘ri",
        "Noto‘g‘ri",
        "Aniqlik %",
        "Testlar",
        "Urinishlar",
        "Ball",
        "Oxirgi faollik",
      ],

      ...exportRows.map(
        (item) => [
          item.rank,
          item.userName,
          item.userId,
          item.workedQuestions,
          item.correct,
          item.incorrect,
          item.accuracy,
          item.testsWorked,
          item.attempts,
          item.earnedPoints,
          formatDate(
            item.lastActivityAt
          ),
        ]
      ),
    ];

    const csv =
      rows
        .map((row) =>
          row
            .map(
              csvCell
            )
            .join(",")
        )
        .join("\n");

    const blob =
      new Blob(
        [
          "\uFEFF",
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

    const anchor =
      document.createElement(
        "a"
      );

    anchor.href = url;

    anchor.download =
      `umumiy-reyting-${period}-${safeDate()}.csv`;

    anchor.click();

    URL.revokeObjectURL(
      url
    );
  }

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <main className="page">
      <div className="pageGlow pageGlowOne" />
      <div className="pageGlow pageGlowTwo" />

      <header className="hero3d">
        <div className="heroTitleWrap">
          <div className="trophyBox">
            🏆
          </div>

          <div>
            <h1>
              Umumiy reyting
            </h1>
          </div>
        </div>

        <div className="headerButtons">
          <button
            type="button"
            className="silverButton resultsNav"
            onClick={() =>
              router.push(
                "/admin/results"
              )
            }
          >
            ← Natijalar
          </button>

          <button
            type="button"
            className="silverButton adminNav"
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
            className="silverButton homeNav"
            onClick={() =>
              router.push("/")
            }
          >
            Asosiy sahifa
          </button>
        </div>
      </header>

      <section className="mainPanel3d">
        <div className="floating3dLabel">
          Reyting boshqaruvi
        </div>

        <div className="periodTabs">
          <button
            type="button"
            className={
              period === "week"
                ? "periodButton active"
                : "periodButton"
            }
            onClick={() =>
              setPeriod(
                "week"
              )
            }
          >
            Haftalik
          </button>

          <button
            type="button"
            className={
              period === "month"
                ? "periodButton active"
                : "periodButton"
            }
            onClick={() =>
              setPeriod(
                "month"
              )
            }
          >
            Oylik
          </button>

          <button
            type="button"
            className={
              period === "all"
                ? "periodButton active"
                : "periodButton"
            }
            onClick={() =>
              setPeriod(
                "all"
              )
            }
          >
            Umumiy
          </button>
        </div>

        <div className="statsGrid">
          <article className="stat3d">
            <div className="statIcon">
              👥
            </div>

            <div>
              <span>
                Ishtirokchilar
              </span>
              <strong>
                {
                  summary.participants
                }
              </strong>
            </div>
          </article>

          <article className="stat3d">
            <div className="statIcon">
              📝
            </div>

            <div>
              <span>
                Ishlangan noyob savollar
              </span>
              <strong>
                {
                  summary.uniqueAnswers
                }
              </strong>
            </div>
          </article>

          <article className="stat3d greenStat">
            <div className="statIcon">
              ✓
            </div>

            <div>
              <span>
                To‘g‘ri javoblar
              </span>
              <strong>
                {
                  summary.correctAnswers
                }
              </strong>
            </div>
          </article>

          <article className="stat3d redStat">
            <div className="statIcon">
              ×
            </div>

            <div>
              <span>
                Noto‘g‘ri javoblar
              </span>
              <strong>
                {
                  summary.incorrectAnswers
                }
              </strong>
            </div>
          </article>
        </div>

        {topThree.length >
          0 && (
          <section className="podiumSection">
            <div className="sectionTitleRow">
              <h2>
                Eng yuqori natijalar
              </h2>
            </div>

            <div className="topThree">
              {topThree.map(
                (
                  item,
                  index
                ) => (
                  <article
                    key={
                      item.userId
                    }
                    className={`topCard top${index + 1}`}
                  >
                    <div className="medal">
                      {index === 0
                        ? "🥇"
                        : index === 1
                          ? "🥈"
                          : "🥉"}
                    </div>

                    <div className="podiumRank">
                      {index + 1}-o‘rin
                    </div>

                    <strong>
                      {
                        item.userName
                      }
                    </strong>

                    <div className="podiumNumbers">
                      <span>
                        <b>
                          {
                            item.correct
                          }
                        </b>{" "}
                        to‘g‘ri
                      </span>

                      <span>
                        <b>
                          {
                            item.accuracy
                          }
                          %
                        </b>{" "}
                        aniqlik
                      </span>
                    </div>
                  </article>
                )
              )}
            </div>
          </section>
        )}

        <section className="controlDeck">
          <div className="filterRow">
            <div className="searchGroup">
              <svg
                className="searchSvg"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="6.5" />
                <path d="M16 16l4 4" />
              </svg>

              <input
                type="search"
                value={
                  search
                }
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
                placeholder="Foydalanuvchi ismi yoki ID bo‘yicha qidirish..."
              />

              {search && (
                <button
                  type="button"
                  className="clearSearch"
                  onClick={() =>
                    setSearch("")
                  }
                  aria-label="Qidiruvni tozalash"
                >
                  ×
                </button>
              )}
            </div>

            <select
              value={
                sortMode
              }
              onChange={(
                event
              ) =>
                setSortMode(
                  event.target
                    .value as SortMode
                )
              }
              className="sortSelect"
            >
              <option value="rank">
                Reyting tartibi
              </option>

              <option value="correct">
                To‘g‘ri javob bo‘yicha
              </option>

              <option value="accuracy">
                Aniqlik bo‘yicha
              </option>

              <option value="worked">
                Ishlangan savollar bo‘yicha
              </option>

              <option value="name">
                Ism A–Z
              </option>

              <option value="activity">
                Oxirgi faollik
              </option>
            </select>

            <div className="filterActions">
              <button
                type="button"
                className={
                  selectionMode
                    ? "selectModeButton activeSelectMode"
                    : "selectModeButton"
                }
                onClick={() => {
                  if (selectionMode) {
                    closeSelectionMode();
                  } else {
                    openSelectionMode();
                  }
                }}
              >
                <span
                  className={
                    selectionMode
                      ? "modernSelectIcon active"
                      : "modernSelectIcon"
                  }
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M5 12.5l4 4L19 7" />
                  </svg>
                </span>

                <span>
                  {selectionMode
                    ? `Tanlash (${selectedIds.size})`
                    : "Tanlash"}
                </span>
              </button>

              <button
                type="button"
                className={
                  showRankingManager
                    ? "rankingManagerButton activeRankingManager"
                    : "rankingManagerButton"
                }
                onClick={() =>
                  setShowRankingManager(
                    (current) =>
                      !current
                  )
                }
              >
                ⚙ Reyting boshqaruvi
              </button>

              {(search ||
                sortMode !== "rank" ||
                showSelectedOnly) && (
                <button
                  type="button"
                  className="resetFilterButton"
                  onClick={resetFilters}
                >
                  Filtrlarni tozalash
                </button>
              )}
            </div>
          </div>

          {showRankingManager && (
            <section className="rankingManagerPanel">
              <div className="rankingManagerTop">
                <div>
                  <strong>
                    Reytingda hisoblash
                  </strong>

                  <span>
                    Faqat ON qilingan foydalanuvchilar haftalik, oylik va umumiy reytingga kiradi.
                  </span>
                </div>

                <div className="rankingManagerTopRight">
                  <div className="rankingManagerStats">
                    <span className="managerOnBadge">
                      ON: {rankingEnabledCount}
                    </span>

                    <span className="managerOffBadge">
                      OFF: {rankingDisabledCount}
                    </span>
                  </div>

                  <button
                    type="button"
                    className={
                      managerSelectionMode
                        ? "managerSelectButton activeManagerSelect"
                        : "managerSelectButton"
                    }
                    onClick={() => {
                      if (
                        managerSelectionMode
                      ) {
                        closeManagerSelection();
                      } else {
                        setManagerSelectionMode(
                          true
                        );
                      }
                    }}
                  >
                    {managerSelectionMode
                      ? `Tanlash (${managerSelectedIds.size})`
                      : "Profillarni tanlash"}
                  </button>
                </div>
              </div>

              <div className="rankingManagerSearch">
                <input
                  type="search"
                  value={profileSearch}
                  onChange={(event) =>
                    setProfileSearch(
                      event.target.value
                    )
                  }
                  placeholder="Profil ismi yoki profil ID bo‘yicha qidirish..."
                />
              </div>

              {managerSelectionMode && (
                <div className="managerSelectionBar">
                  <label className="managerMasterCheck">
                    <input
                      type="checkbox"
                      checked={
                        allVisibleManagerSelected
                      }
                      onChange={
                        toggleAllManagerVisible
                      }
                    />

                    <span>
                      Ko‘rinib turganlarning barchasini tanlash
                    </span>
                  </label>

                  <div className="managerSelectionActions">
                    <button
                      type="button"
                      className="managerCancelSelectButton"
                      onClick={
                        closeManagerSelection
                      }
                    >
                      Bekor qilish
                    </button>

                    <button
                      type="button"
                      className="managerBulkArchiveButton"
                      disabled={
                        managerSelectedIds.size ===
                          0 ||
                        archivingSelected
                      }
                      onClick={() =>
                        void archiveSelectedProfiles()
                      }
                    >
                      {archivingSelected
                        ? "O‘chirilmoqda..."
                        : `Tanlanganlarni o‘chirish (${managerSelectedIds.size})`}
                    </button>
                  </div>
                </div>
              )}

              <div className="rankingProfileList">
                {visibleProfiles.map(
                  (profile) => (
                    <article
                      className={
                        profile.rankingEnabled
                          ? "rankingProfileRow profileRankingOn"
                          : "rankingProfileRow profileRankingOff"
                      }
                      key={profile.id}
                    >
                      <div className="rankingProfileLeft">
                        {managerSelectionMode && (
                          <label className="managerProfileCheck">
                            <input
                              type="checkbox"
                              checked={
                                managerSelectedIds.has(
                                  profile.id
                                )
                              }
                              onChange={() =>
                                toggleManagerProfile(
                                  profile.id
                                )
                              }
                            />
                          </label>
                        )}

                        <div className="rankingProfileIdentity">
                          <strong>
                            {profile.fullName}
                          </strong>

                          <span>
                            {profile.profileCode || profile.id}
                          </span>
                        </div>
                      </div>

                      <div className="rankingProfileState">
                        <span>
                          {profile.rankingEnabled
                            ? "Reytingda hisoblanadi"
                            : "Reytingda hisoblanmaydi"}
                        </span>

                        <button
                          type="button"
                          className={
                            profile.rankingEnabled
                              ? "rankingToggle rankingToggleOn"
                              : "rankingToggle rankingToggleOff"
                          }
                          disabled={
                            updatingProfileId ===
                              profile.id ||
                            archivingProfileId ===
                              profile.id
                          }
                          onClick={() =>
                            void toggleRankingProfile(
                              profile
                            )
                          }
                        >
                          <span className="rankingToggleKnob" />

                          <strong>
                            {updatingProfileId ===
                            profile.id
                              ? "..."
                              : profile.rankingEnabled
                                ? "ON"
                                : "OFF"}
                          </strong>
                        </button>

                        {!managerSelectionMode && (
                          <button
                            type="button"
                            className="profileArchiveButton"
                            title="Ro‘yxatdan chiqarish"
                            aria-label={`${profile.fullName} profilini ro‘yxatdan chiqarish`}
                            disabled={
                              archivingProfileId ===
                              profile.id
                            }
                            onClick={() =>
                              void archiveRankingProfile(
                                profile
                              )
                            }
                          >
                            {archivingProfileId ===
                            profile.id
                              ? "…"
                              : "✕"}
                          </button>
                        )}
                      </div>
                    </article>
                  )
                )}

                {visibleProfiles.length ===
                  0 && (
                  <div className="rankingManagerEmpty">
                    Profil topilmadi.
                  </div>
                )}
              </div>
            </section>
          )}

          {selectionMode && (
          <div className="selectionBar">
            <div className="selectionLeft">
              <label className="masterCheck">
                <input
                  type="checkbox"
                  checked={
                    allVisibleSelected
                  }
                  onChange={
                    toggleAllVisible
                  }
                  disabled={
                    visibleRanking.length ===
                    0
                  }
                />

                <span>
                  Ko‘rinib turganlarning barchasini tanlash
                </span>
              </label>

              <div className="selectedBadge">
                Tanlangan:{" "}
                <strong>
                  {
                    selectedIds.size
                  }
                </strong>
              </div>
            </div>

            <div className="selectionActions">
              <button
                type="button"
                className={
                  showSelectedOnly
                    ? "small3dButton activeSmall"
                    : "small3dButton"
                }
                disabled={
                  selectedIds.size ===
                  0
                }
                onClick={() =>
                  setShowSelectedOnly(
                    (value) =>
                      !value
                  )
                }
              >
                Faqat tanlanganlar
              </button>

              <button
                type="button"
                className="small3dButton"
                onClick={
                  closeSelectionMode
                }
              >
                Tanlashni yopish
              </button>

              <button
                type="button"
                className="bulkDeleteButton"
                disabled={
                  selectedIds.size ===
                    0 ||
                  deletingSelected
                }
                onClick={() =>
                  void deleteSelected()
                }
              >
                {deletingSelected
                  ? "O‘chirilmoqda..."
                  : `Tanlanganlarni o‘chirish (${selectedIds.size})`}
              </button>
            </div>
          </div>
          )}

          <div className="actionRow">
            <div className="periodInfo3d">
              <strong>
                {
                  periodTitle(
                    period
                  )
                }
              </strong>

              <span>
                {period ===
                "all"
                  ? "Barcha vaqt bo‘yicha natijalar"
                  : `${formatDate(
                      periodStart
                    )} — ${formatDate(
                      periodEnd
                    )}`}
              </span>

              <span className="visibleCount">
                Ko‘rsatilmoqda:{" "}
                <strong>
                  {
                    visibleRanking.length
                  }
                </strong>{" "}
                ta
              </span>
            </div>

            <div className="toolButtons">
              <button
                type="button"
                className="blueTool"
                disabled={
                  loading
                }
                onClick={() =>
                  void loadRanking()
                }
              >
                {loading
                  ? "Yuklanmoqda..."
                  : "↻ Yangilash"}
              </button>

              <button
                type="button"
                className="pdfTool"
                onClick={
                  exportPdf
                }
              >
                PDF olish
                {selectedIds.size
                  ? ` (${selectedIds.size})`
                  : ""}
              </button>

              <button
                type="button"
                className="csvTool"
                onClick={
                  exportCsv
                }
              >
                CSV olish
                {selectedIds.size
                  ? ` (${selectedIds.size})`
                  : ""}
              </button>

              <button
                type="button"
                className="dangerTool"
                disabled={
                  clearingAll ||
                  ranking.length ===
                    0
                }
                onClick={
                  clearAll
                }
              >
                {clearingAll
                  ? "O‘chirilmoqda..."
                  : "Umumiy reytingni o‘chirish"}
              </button>
            </div>
          </div>
        </section>

        {error && (
          <div className="errorBox">
            <strong>
              Xatolik:
            </strong>{" "}
            {error}
          </div>
        )}

        <section className="rankingBoard">
          <div className="rankingBoardHeader">
            <div className="rankingBoardTitle">
              <div className="rankingBoardIcon">
                ≡
              </div>

              <strong>
                Foydalanuvchilar reytingi
              </strong>
            </div>

            <div className="rankingBoardRight">
              {selectionMode && (
                <label className="boardSelectAll">
                  <input
                    type="checkbox"
                    checked={
                      allVisibleSelected
                    }
                    onChange={
                      toggleAllVisible
                    }
                    disabled={
                      visibleRanking.length ===
                      0
                    }
                  />

                  <span>
                    Barchasini tanlash
                  </span>
                </label>
              )}

              <div className="tableCount">
                {
                  visibleRanking.length
                }{" "}
                ta
              </div>
            </div>
          </div>

          <div className="rankingList">
            {!loading &&
              visibleRanking.map(
                (item) => {
                  const selected =
                    selectedIds.has(
                      item.userId
                    );

                  return (
                    <article
                      key={
                        item.userId
                      }
                      className={[
                        "rankingUserCard",
                        selected
                          ? "selectedRankingCard"
                          : "",
                        selectionMode
                          ? "selectableRankingCard"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => {
                        if (
                          selectionMode
                        ) {
                          toggleUser(
                            item.userId
                          );
                        }
                      }}
                    >
                      {selectionMode && (
                        <div className="rankingSelectBox">
                          <input
                            type="checkbox"
                            checked={
                              selected
                            }
                            onChange={() =>
                              toggleUser(
                                item.userId
                              )
                            }
                            onClick={(event) =>
                              event.stopPropagation()
                            }
                            aria-label={`${item.userName}ni tanlash`}
                          />
                        </div>
                      )}

                      <div className="rankingIdentity">
                        <span
                          className={`rankMedal rankMedal${Math.min(
                            item.rank,
                            4
                          )}`}
                        >
                          {item.rank <= 3
                            ? item.rank === 1
                              ? "🥇"
                              : item.rank === 2
                                ? "🥈"
                                : "🥉"
                            : `#${item.rank}`}
                        </span>

                        <div className="rankingUserName">
                          <strong>
                            {
                              item.userName
                            }
                          </strong>

                          <span className="rankingPositionText">
                            {item.rank}-o‘rin
                          </span>
                        </div>
                      </div>

                      <div className="rankingMetrics">
                        <div className="rankingMetric">
                          <span>
                            Ishlangan
                          </span>

                          <strong>
                            {
                              item.workedQuestions
                            }
                          </strong>
                        </div>

                        <div className="rankingMetric successMetric">
                          <span>
                            To‘g‘ri
                          </span>

                          <strong>
                            {
                              item.correct
                            }
                          </strong>
                        </div>

                        <div className="rankingMetric dangerMetric">
                          <span>
                            Noto‘g‘ri
                          </span>

                          <strong>
                            {
                              item.incorrect
                            }
                          </strong>
                        </div>

                        <div className="rankingMetric accuracyMetricCard">
                          <span>
                            Aniqlik
                          </span>

                          <strong>
                            {
                              item.accuracy
                            }
                            %
                          </strong>

                          <div className="cardAccuracyTrack">
                            <div
                              className="cardAccuracyBar"
                              style={{
                                width:
                                  `${Math.max(
                                    0,
                                    Math.min(
                                      100,
                                      item.accuracy
                                    )
                                  )}%`,
                              }}
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          className="rankingMetric testMetricButton"
                          disabled={
                            selectionMode
                          }
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleTests(
                              item.userId
                            );
                          }}
                          title={
                            selectionMode
                              ? "Tanlash rejimida test tafsilotlari yopiq"
                              : "Ishlangan testlarni ko‘rish"
                          }
                        >
                          <span>
                            Testlar
                          </span>

                          <strong>
                            {
                              item.testsWorked
                            }
                          </strong>

                          <small>
                            {expandedUsers.has(
                              item.userId
                            )
                              ? "Yopish"
                              : "Ko‘rish"}
                          </small>
                        </button>

                        <div className="rankingMetric">
                          <span>
                            Urinish
                          </span>

                          <strong>
                            {
                              item.attempts
                            }
                          </strong>
                        </div>

                        <div className="rankingMetric scoreMetric">
                          <span>
                            Ball
                          </span>

                          <strong>
                            {
                              item.earnedPoints
                            }
                          </strong>
                        </div>
                      </div>

                      <div className="rankingSide">
                        <div className="rankingActivity">
                          <span>
                            Oxirgi faollik
                          </span>

                          <strong>
                            {formatDate(
                              item.lastActivityAt
                            )}
                          </strong>
                        </div>

                        <button
                          type="button"
                          className="deleteUserButton rankingDeleteButton"
                          disabled={
                            deletingUserId ===
                            item.userId
                          }
                          onClick={(event) => {
                            event.stopPropagation();
                            void deleteUser(
                              item
                            );
                          }}
                        >
                          {deletingUserId ===
                          item.userId
                            ? "..."
                            : "O‘chirish"}
                        </button>
                      </div>

                      {expandedUsers.has(
                        item.userId
                      ) && (
                        <div
                          className="rankingTestsPanel"
                          onClick={(event) =>
                            event.stopPropagation()
                          }
                        >
                          <div className="rankingTestsHeader">
                            <div>
                              <strong>
                                Ishlangan testlar
                              </strong>

                              <span>
                                {periodTitle(
                                  period
                                )} bo‘yicha
                              </span>
                            </div>

                            <div className="rankingTestsCount">
                              {
                                item.tests.length
                              }{" "}
                              ta test
                            </div>
                          </div>

                          {item.tests.length >
                          0 ? (
                            <div className="rankingTestsList">
                              {item.tests.map(
                                (
                                  test
                                ) => (
                                  <article
                                    className="rankingTestRow"
                                    key={`${test.source}:${test.testId}`}
                                  >
                                    <div className="rankingTestMain">
                                      <strong>
                                        {
                                          test.testTitle
                                        }
                                      </strong>

                                      <span>
                                        ID:{" "}
                                        {
                                          test.testId
                                        }
                                      </span>
                                    </div>

                                    <div className="rankingTestStat">
                                      <span>
                                        Ishlangan
                                      </span>
                                      <strong>
                                        {
                                          test.workedQuestions
                                        }
                                      </strong>
                                    </div>

                                    <div className="rankingTestStat correctTestStat">
                                      <span>
                                        To‘g‘ri
                                      </span>
                                      <strong>
                                        {
                                          test.correct
                                        }
                                      </strong>
                                    </div>

                                    <div className="rankingTestStat incorrectTestStat">
                                      <span>
                                        Noto‘g‘ri
                                      </span>
                                      <strong>
                                        {
                                          test.incorrect
                                        }
                                      </strong>
                                    </div>

                                    <div className="rankingTestStat">
                                      <span>
                                        Aniqlik
                                      </span>
                                      <strong>
                                        {
                                          test.accuracy
                                        }
                                        %
                                      </strong>
                                    </div>

                                    <div className="rankingTestStat">
                                      <span>
                                        Urinish
                                      </span>
                                      <strong>
                                        {
                                          test.attempts
                                        }
                                      </strong>
                                    </div>

                                    <div className="rankingTestDate">
                                      <span>
                                        Oxirgi ishlangan
                                      </span>
                                      <strong>
                                        {formatDate(
                                          test.lastActivityAt
                                        )}
                                      </strong>
                                    </div>
                                  </article>
                                )
                              )}
                            </div>
                          ) : (
                            <div className="rankingTestsEmpty">
                              Test ma’lumoti topilmadi.
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                }
              )}

            {!loading &&
              visibleRanking.length ===
                0 && (
                <div className="rankingEmptyState">
                  <div className="rankingEmptyIcon">
                    ⌕
                  </div>

                  <strong>
                    Natija topilmadi
                  </strong>

                  <span>
                    Qidiruv yoki saralashni o‘zgartirib ko‘ring.
                  </span>
                </div>
              )}

            {loading && (
              <div className="rankingEmptyState">
                <div className="loader3d" />

                <strong>
                  Reyting yuklanmoqda...
                </strong>
              </div>
            )}
          </div>
        </section>

        <div className="rankingRule3d">
          <div className="ruleIcon">
            i
          </div>

          <div>
            <strong>
              Reyting hisoblash tartibi
            </strong>

            <p>
              To‘g‘ri javoblar → aniqlik → ishlangan noyob savollar. Bir xil savol tanlangan davr ichida reytingga bir marta hisoblanadi.
            </p>
          </div>
        </div>
      </section>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          padding: 34px 24px 56px;
          background:
            linear-gradient(180deg, #eef9ff 0%, #f8fbfd 38%, #eaf3f7 100%);
          color: #0d2f43;
          font-family: Arial, Helvetica, sans-serif;
        }

        .pageGlow {
          position: absolute;
          pointer-events: none;
          border-radius: 999px;
          filter: blur(1px);
          opacity: 0.32;
        }

        .pageGlowOne {
          width: 430px;
          height: 430px;
          top: -170px;
          right: -100px;
          background: radial-gradient(circle, #88ddff 0%, transparent 70%);
        }

        .pageGlowTwo {
          width: 360px;
          height: 360px;
          bottom: -180px;
          left: -120px;
          background: radial-gradient(circle, #ffe88a 0%, transparent 70%);
        }

        .hero3d,
        .mainPanel3d {
          position: relative;
          z-index: 1;
          width: min(1760px, 100%);
          max-width: 1760px;
          margin-left: auto;
          margin-right: auto;
        }

        .hero3d {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 32px;
          padding: 20px 22px;
          border: 2px solid #6b8797;
          border-radius: 20px;
          background:
            linear-gradient(180deg, #ffffff 0%, #edf2f5 55%, #dce5ea 100%);
          box-shadow:
            inset 0 2px 0 #ffffff,
            inset 0 -2px 0 rgba(73, 101, 116, 0.18),
            0 8px 0 #163e52,
            0 16px 28px rgba(16, 54, 73, 0.18);
        }

        .heroTitleWrap {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }

        .trophyBox {
          display: grid;
          place-items: center;
          width: 78px;
          height: 70px;
          flex: 0 0 auto;
          border: 2px solid #ba8200;
          border-radius: 16px;
          background:
            linear-gradient(180deg, #fff7c8 0%, #ffd96a 52%, #e9ad22 100%);
          box-shadow:
            inset 0 2px 0 #fffde9,
            inset 0 -3px 0 rgba(129, 82, 0, 0.2),
            0 5px 0 #9c6c00;
          font-size: 33px;
        }

        .heroTitleWrap h1 {
          margin: 0;
          font-size: clamp(30px, 3vw, 44px);
          line-height: 1;
          color: #082b40;
          text-shadow: 0 1px 0 #fff;
        }

        .heroTitleWrap p {
          margin: 7px 0 0;
          color: #55707f;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 17px;
          font-weight: 700;
        }

        .headerButtons,
        .toolButtons,
        .selectionActions {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
        }

        button,
        input,
        select {
          font: inherit;
        }

        button {
          -webkit-tap-highlight-color: transparent;
        }

        .silverButton,
        .toolButtons button,
        .small3dButton,
        .bulkDeleteButton {
          min-height: 48px;
          border: 1px solid #71848e;
          border-radius: 12px;
          padding: 11px 17px;
          background:
            linear-gradient(180deg, #ffffff 0%, #eef2f4 50%, #cbd6dc 100%);
          color: #0c3145;
          font-weight: 900;
          cursor: pointer;
          box-shadow:
            inset 0 1px 0 #fff,
            0 4px 0 #70838d;
          transition:
            transform 120ms ease,
            filter 120ms ease;
        }

        @media (hover: hover) and (pointer: fine) {
          .silverButton:hover,
          .toolButtons button:hover,
          .small3dButton:hover,
          .bulkDeleteButton:hover,
          .periodButton:hover,
          .deleteUserButton:hover {
            filter: brightness(1.035);
          }
        }

        .silverButton:active,
        .toolButtons button:active,
        .small3dButton:active,
        .bulkDeleteButton:active,
        .periodButton:active,
        .deleteUserButton:active {
          transform: translateY(3px);
          box-shadow: 0 1px 0 #70838d;
        }

        .mainPanel3d {
          padding: 48px 22px 30px;
          border: 2px solid #8399a6;
          border-radius: 23px;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.98), rgba(247,251,253,0.98));
          box-shadow:
            inset 0 2px 0 #ffffff,
            inset 0 -2px 0 rgba(38, 75, 95, 0.08),
            0 8px 0 #244b60,
            0 16px 34px rgba(14, 55, 76, 0.14);
        }

        .floating3dLabel {
          position: absolute;
          top: -24px;
          left: 28px;
          padding: 11px 27px;
          border: 2px solid #1a6c92;
          border-radius: 14px;
          background:
            linear-gradient(180deg, #e7faff 0%, #83d5f3 50%, #38a8d4 100%);
          color: #0b3449;
          box-shadow:
            inset 0 2px 0 #f8feff,
            0 5px 0 #175b7a;
          font-size: 23px;
          font-weight: 900;
        }

        .periodTabs {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }

        .periodButton {
          min-height: 78px;
          border: 1px solid #7f909a;
          border-radius: 14px;
          background:
            linear-gradient(180deg, #ffffff 0%, #f2f5f7 52%, #d5dee3 100%);
          color: #16384a;
          font-weight: 900;
          cursor: pointer;
          box-shadow:
            inset 0 2px 0 #fff,
            0 5px 0 #71838d;
        }

        .periodButton.active {
          border-color: #a97800;
          background:
            linear-gradient(180deg, #fff9d8 0%, #ffe480 52%, #efb829 100%);
          color: #281b00;
          box-shadow:
            inset 0 2px 0 #fffdeb,
            0 5px 0 #9e7000;
        }

        .statsGrid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 22px;
        }

        .stat3d {
          display: flex;
          align-items: center;
          gap: 13px;
          min-width: 0;
          min-height: 92px;
          padding: 17px;
          border: 1px solid #aab8c0;
          border-radius: 16px;
          background:
            linear-gradient(180deg, #ffffff 0%, #f4f7f8 55%, #e3eaee 100%);
          box-shadow:
            inset 0 1px 0 #ffffff,
            0 5px 0 #b5c1c7,
            0 9px 18px rgba(28, 63, 80, 0.08);
        }

        .statIcon {
          display: grid;
          place-items: center;
          width: 56px;
          height: 56px;
          flex: 0 0 auto;
          border: 1px solid #83a2b4;
          border-radius: 13px;
          background:
            linear-gradient(180deg, #f2fbff, #b9e5f6);
          color: #176887;
          box-shadow:
            inset 0 1px 0 #fff,
            0 3px 0 #83a9ba;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 23px;
          font-weight: 900;
        }

        .greenStat .statIcon {
          border-color: #70a47a;
          background:
            linear-gradient(180deg, #f4fff5, #bde9c4);
          color: #157b2f;
          box-shadow:
            inset 0 1px 0 #fff,
            0 3px 0 #77a981;
        }

        .redStat .statIcon {
          border-color: #bc7b7b;
          background:
            linear-gradient(180deg, #fff8f8, #f2bcbc);
          color: #bd2424;
          box-shadow:
            inset 0 1px 0 #fff,
            0 3px 0 #bd8585;
        }

        .stat3d span {
          display: block;
          margin-bottom: 4px;
          color: #607684;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 13px;
          font-weight: 700;
        }

        .stat3d strong {
          display: block;
          font-size: 32px;
          line-height: 1;
          color: #0c3247;
        }

        .greenStat strong {
          color: #137f36;
        }

        .redStat strong {
          color: #c02d2d;
        }

        .podiumSection {
          margin-bottom: 20px;
          padding: 18px;
          border: 1px solid #c4d0d6;
          border-radius: 17px;
          background:
            linear-gradient(180deg, #fbfdfe, #eef5f8);
          box-shadow:
            inset 0 1px 0 #fff,
            0 4px 0 #cad5da;
        }

        .sectionTitleRow,
        .tableTopBar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }

        .sectionTitleRow {
          margin-bottom: 12px;
        }

        .sectionTitleRow h2 {
          margin: 0;
          font-size: 19px;
        }

        .sectionTitleRow span {
          padding: 5px 9px;
          border-radius: 999px;
          background: #e6eef2;
          color: #5d7481;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 11px;
          font-weight: 800;
        }

        .topThree {
          display: grid;
          grid-template-columns:
            repeat(auto-fit, minmax(320px, 1fr));
          gap: 14px;
        }

        .topCard {
          position: relative;
          min-width: 0;
          min-height: 145px;
          padding: 22px 22px 19px 84px;
          border: 1px solid #b8a15c;
          border-radius: 16px;
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,0.65),
            0 5px 0 rgba(89, 71, 20, 0.35);
        }

        .top1 {
          background:
            linear-gradient(135deg, #fff9d7 0%, #ffe89a 48%, #f2c441 100%);
        }

        .top2 {
          border-color: #9eaab1;
          background:
            linear-gradient(135deg, #ffffff 0%, #e6ecef 48%, #c4ced4 100%);
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,0.85),
            0 5px 0 #9ba8af;
        }

        .top3 {
          border-color: #b78968;
          background:
            linear-gradient(135deg, #fff8f0 0%, #edc6a6 50%, #ca8a5c 100%);
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,0.7),
            0 5px 0 #a56e49;
        }

        .medal {
          position: absolute;
          left: 20px;
          top: 24px;
          display: grid;
          place-items: center;
          width: 51px;
          height: 51px;
          border-radius: 50%;
          background: rgba(255,255,255,0.62);
          box-shadow:
            inset 0 1px 0 #fff,
            0 3px 8px rgba(0,0,0,0.12);
          font-size: 27px;
        }

        .podiumRank {
          margin-bottom: 5px;
          color: #7a5b00;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .topCard strong {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 10px;
          font-size: 21px;
          white-space: nowrap;
        }

        .podiumNumbers {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .podiumNumbers span {
          padding: 5px 8px;
          border-radius: 8px;
          background: rgba(255,255,255,0.55);
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12px;
        }

        .controlDeck {
          margin-bottom: 18px;
          padding: 17px;
          border: 1px solid #aebdc5;
          border-radius: 17px;
          background:
            linear-gradient(180deg, #fafdff, #edf4f7);
          box-shadow:
            inset 0 1px 0 #fff,
            0 5px 0 #becbd1;
        }

        .filterRow,
        .selectionBar,
        .actionRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .filterRow {
          margin-bottom: 12px;
        }

        .searchGroup {
          position: relative;
          flex: 1 1 520px;
          min-width: 260px;
        }

        .searchSvg {
          position: absolute;
          top: 50%;
          left: 17px;
          z-index: 2;
          width: 21px;
          height: 21px;
          transform: translateY(-50%);
          fill: none;
          stroke: #466575;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
          pointer-events: none;
        }

        .searchGroup input,
        .sortSelect {
          min-height: 52px;
          border: 1px solid #8399a5;
          border-radius: 11px;
          background:
            linear-gradient(180deg, #ffffff, #f4f8fa);
          color: #14384b;
          outline: none;
          box-shadow:
            inset 0 2px 5px rgba(25, 57, 72, 0.08),
            0 2px 0 #c1ccd2;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 17px;
          font-weight: 600;
        }

        .searchGroup input {
          width: 100%;
          padding: 10px 44px 10px 50px;
        }

        .sortSelect {
          flex: 0 0 280px;
          padding: 9px 12px;
          cursor: pointer;
        }

        .searchGroup input:focus,
        .sortSelect:focus {
          border-color: #2388b3;
          box-shadow:
            0 0 0 3px rgba(35,136,179,0.13),
            inset 0 2px 5px rgba(25, 57, 72, 0.08);
        }

        .clearSearch {
          position: absolute;
          top: 7px;
          right: 7px;
          width: 31px;
          height: 31px;
          border: 0;
          border-radius: 8px;
          background: #dfe8ed;
          color: #375565;
          cursor: pointer;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 23px;
          font-weight: 900;
        }

        .selectionBar {
          min-height: 66px;
          margin-bottom: 14px;
          padding: 12px 14px;
          border: 1px solid #bdcbd2;
          border-radius: 13px;
          background:
            linear-gradient(180deg, #ffffff, #f1f6f8);
        }

        .selectionLeft {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 11px;
          min-width: 0;
        }

        .masterCheck {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #294a5b;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }

        input[type="checkbox"] {
          width: 18px;
          height: 18px;
          accent-color: #167ba7;
          cursor: pointer;
        }

        .selectedBadge,
        .tableCount {
          border: 1px solid #bda15a;
          border-radius: 999px;
          padding: 6px 10px;
          background:
            linear-gradient(180deg, #fff8d9, #f2d778);
          color: #5e4500;
          box-shadow: inset 0 1px 0 #fff;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 11px;
          font-weight: 800;
        }

        .small3dButton {
          min-height: 40px;
          padding: 8px 12px;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12px;
        }

        .activeSmall {
          border-color: #27799a;
          background:
            linear-gradient(180deg, #e9faff, #9bd9ef);
          box-shadow:
            inset 0 1px 0 #fff,
            0 4px 0 #5f9eb7;
        }

        .bulkDeleteButton {
          min-height: 40px;
          padding: 8px 13px;
          border-color: #a12d2d;
          background:
            linear-gradient(180deg, #fff0f0, #efabab);
          color: #8a1515;
          box-shadow:
            inset 0 1px 0 #fff,
            0 4px 0 #a76262;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12px;
        }

        .actionRow {
          align-items: stretch;
        }

        .periodInfo3d {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 7px 13px;
          flex: 1 1 380px;
          min-width: 0;
          padding: 9px 12px;
          border-left: 5px solid #ddb329;
          border-radius: 9px;
          background: #fffbea;
          box-shadow: inset 0 1px 3px rgba(86, 66, 0, 0.06);
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12px;
        }

        .periodInfo3d strong {
          color: #0c3348;
          font-size: 13px;
        }

        .periodInfo3d span,
        .periodInfo3d small {
          color: #60717a;
        }

        .toolButtons {
          justify-content: flex-end;
        }

        .toolButtons button {
          min-height: 47px;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 13px;
        }

        .blueTool {
          background:
            linear-gradient(180deg, #effbff, #9ddcf3) !important;
          box-shadow:
            inset 0 1px 0 #fff,
            0 4px 0 #629db5 !important;
        }

        .pdfTool {
          border-color: #a76262 !important;
          background:
            linear-gradient(180deg, #fff3f3, #f2aaaa) !important;
          color: #7f2020 !important;
          box-shadow:
            inset 0 1px 0 #fff,
            0 4px 0 #ad7070 !important;
        }

        .csvTool {
          border-color: #65996f !important;
          background:
            linear-gradient(180deg, #f2fff4, #aee1b7) !important;
          color: #185d29 !important;
          box-shadow:
            inset 0 1px 0 #fff,
            0 4px 0 #76a881 !important;
        }

        .dangerTool {
          border-color: #8f1515 !important;
          background:
            linear-gradient(180deg, #f15b5b, #bd1010) !important;
          color: #ffffff !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.45),
            0 4px 0 #761010 !important;
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          filter: grayscale(0.15);
        }

        .errorBox {
          margin-bottom: 14px;
          padding: 12px 14px;
          border: 1px solid #c54949;
          border-radius: 12px;
          background:
            linear-gradient(180deg, #fff8f8, #ffe8e8);
          color: #8d1c1c;
          box-shadow:
            inset 0 1px 0 #fff,
            0 3px 0 #d4a2a2;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 13px;
        }

        .tableShell3d {
          overflow: hidden;
          border: 1px solid #7391a1;
          border-radius: 17px;
          background: #ffffff;
          box-shadow:
            inset 0 1px 0 #fff,
            0 6px 0 #8aa1ad,
            0 12px 24px rgba(21, 59, 78, 0.1);
        }

        .tableTopBar {
          padding: 15px 16px;
          background:
            linear-gradient(180deg, #f9fdff, #e7f1f5);
          border-bottom: 1px solid #b9c8d0;
        }

        .tableTopBar > div:first-child {
          min-width: 0;
        }

        .tableTopBar strong,

        .tableTopBar strong {
          margin-bottom: 3px;
          font-size: 17px;
        }

        .tableWrap {
          overflow-x: auto;
          max-width: 100%;
        }

        table {
          width: 100%;
          min-width: 1380px;
          border-collapse: collapse;
          background: #fff;
        }

        th,
        td {
          padding: 14px 11px;
          border-bottom: 1px solid #d8e1e6;
          text-align: center;
          vertical-align: middle;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 13px;
        }

        th {
          position: sticky;
          top: 0;
          z-index: 3;
          background:
            linear-gradient(180deg, #2f708f 0%, #174760 55%, #10384d 100%);
          color: #ffffff;
          text-shadow: 0 1px 0 rgba(0,0,0,0.25);
          font-size: 12px;
          font-weight: 900;
        }

        tbody tr {
          transition:
            background 120ms ease,
            box-shadow 120ms ease;
        }

        @media (hover: hover) and (pointer: fine) {
          tbody tr:hover {
            background: #f0f9fd;
          }
        }

        tbody tr.selectedRow {
          background:
            linear-gradient(90deg, #fff9d9, #fffdf1);
          box-shadow:
            inset 4px 0 0 #d3a51d;
        }

        .checkColumn {
          width: 46px;
          min-width: 46px;
        }

        .rankBadge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 42px;
          padding: 6px 8px;
          border: 1px solid #b7c4cb;
          border-radius: 999px;
          background:
            linear-gradient(180deg, #ffffff, #e6edf1);
          box-shadow:
            inset 0 1px 0 #fff,
            0 2px 0 #b7c3ca;
          color: #27495a;
          font-weight: 900;
        }

        .rank1 {
          border-color: #bb901d;
          background:
            linear-gradient(180deg, #fff9d3, #f1c84f);
          color: #6a4b00;
        }

        .rank2 {
          border-color: #9aa8af;
          background:
            linear-gradient(180deg, #ffffff, #d8e0e4);
        }

        .rank3 {
          border-color: #bb8f6e;
          background:
            linear-gradient(180deg, #fff8f0, #ddb08c);
          color: #6e3f21;
        }

        .studentCell {
          min-width: 255px;
          max-width: 330px;
          text-align: left;
        }

        .studentCell strong,

        .studentCell strong {
          color: #0a3349;
          font-family:
            "Bell MT",
            Georgia,
            serif;
          font-size: 16px;
        }

        .metricChip {
          display: inline-flex;
          min-width: 36px;
          justify-content: center;
          padding: 5px 7px;
          border-radius: 7px;
          background: #edf3f6;
          color: #294e60;
          font-weight: 900;
        }

        .correctValue {
          color: #13853b;
          font-size: 16px;
          font-weight: 900;
        }

        .incorrectValue {
          color: #c02e2e;
          font-size: 16px;
          font-weight: 900;
        }

        .accuracyCell {
          min-width: 128px;
        }

        .accuracyCell strong {
          display: block;
          margin-bottom: 5px;
          color: #143d52;
        }

        .accuracyTrack {
          height: 6px;
          overflow: hidden;
          border-radius: 999px;
          background: #dce5ea;
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.11);
        }

        .accuracyBar {
          height: 100%;
          border-radius: inherit;
          background:
            linear-gradient(90deg, #3aa8d3, #1d779d);
        }

        .dateCell {
          min-width: 155px;
          white-space: nowrap;
          color: #455f6d;
          font-size: 12px;
        }

        .deleteUserButton {
          min-height: 39px;
          border: 1px solid #b14a4a;
          border-radius: 9px;
          padding: 7px 10px;
          background:
            linear-gradient(180deg, #fff5f5, #efb0b0);
          color: #8d1717;
          box-shadow:
            inset 0 1px 0 #fff,
            0 3px 0 #b76c6c;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .emptyState {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 42px 16px;
          color: #647a86;
        }

        .emptyState strong {
          color: #294c5e;
          font-size: 16px;
        }

        .emptyState span {
          font-size: 12px;
        }

        .emptyIcon {
          display: grid;
          place-items: center;
          width: 56px;
          height: 56px;
          border-radius: 14px;
          background: #edf4f7;
          font-size: 27px;
        }

        .loader3d {
          width: 36px;
          height: 36px;
          border: 4px solid #d5e3e9;
          border-top-color: #1d789e;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .rankingRule3d {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-top: 18px;
          padding: 13px 14px;
          border: 1px solid #a9c4d2;
          border-radius: 14px;
          background:
            linear-gradient(180deg, #f2fbff, #e6f3f9);
          box-shadow:
            inset 0 1px 0 #fff,
            0 4px 0 #b4cbd6;
        }

        .ruleIcon {
          display: grid;
          place-items: center;
          width: 31px;
          height: 31px;
          flex: 0 0 auto;
          border-radius: 50%;
          background:
            linear-gradient(180deg, #65c9ef, #268bb3);
          color: #fff;
          box-shadow: 0 3px 0 #1b6684;
          font-family: Arial, Helvetica, sans-serif;
          font-weight: 900;
        }

        .rankingRule3d strong {
          display: block;
          margin-bottom: 3px;
          font-size: 13px;
        }

        .rankingRule3d p {
          margin: 0;
          color: #526d7b;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 11px;
          line-height: 1.55;
        }


        @media (max-width: 1250px) {
          .filterActions {
            width: 100%;
          }

          .filterActions button {
            flex: 1 1 auto;
          }
        }

        @media (max-width: 1250px) {
          .hero3d,
          .filterRow,
          .selectionBar,
          .actionRow {
            align-items: stretch;
            flex-direction: column;
          }

          .headerButtons,
          .selectionActions,
          .toolButtons {
            justify-content: stretch;
          }

          .headerButtons button,
          .selectionActions button,
          .toolButtons button {
            flex: 1 1 auto;
          }

          .sortSelect {
            flex-basis: auto;
            width: 100%;
          }

          .statsGrid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .topThree {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 670px) {
          .page {
            padding: 18px 10px 36px;
          }

          .hero3d {
            padding: 12px;
            border-radius: 15px;
          }

          .heroTitleWrap {
            align-items: flex-start;
          }

          .trophyBox {
            width: 52px;
            height: 49px;
            border-radius: 12px;
            font-size: 21px;
          }

          .heroTitleWrap h1 {
            font-size: 27px;
          }

          .heroTitleWrap p {
            font-size: 11px;
          }

          .headerButtons,
          .filterActions {
            display: grid;
            grid-template-columns: 1fr;
          }

          .mainPanel3d {
            padding: 38px 9px 18px;
            border-radius: 17px;
          }

          .floating3dLabel {
            left: 14px;
            padding: 9px 15px;
            font-size: 17px;
          }

          .periodTabs,
          .statsGrid {
            grid-template-columns: 1fr;
          }

          .selectionLeft,
          .selectionActions,
          .toolButtons {
            width: 100%;
          }

          .selectionActions,
          .toolButtons {
            display: grid;
            grid-template-columns: 1fr;
          }

          .selectionActions button,
          .toolButtons button {
            width: 100%;
          }

          .sectionTitleRow,
          .tableTopBar {
            align-items: flex-start;
            flex-direction: column;
          }

          .topCard {
            padding-left: 68px;
          }
        }



        /* =====================================================
           BIR XIL YOZUV + NAVIGATSIYA RANGLARI
        ===================================================== */

        .page,
        .page * {
          font-family: "Times New Roman", Times, serif !important;
        }

        .heroTitleWrap h1,
        .floating3dLabel,
        .topCard strong,
        .studentCell strong,
        .tableTopBar strong {
          letter-spacing: 0;
        }

        .resultsNav {
          border-color: #2f82aa !important;
          background:
            linear-gradient(180deg, #f0fbff 0%, #9edcf3 52%, #56b7dc 100%) !important;
          color: #082f43 !important;
          box-shadow:
            inset 0 1px 0 #ffffff,
            0 4px 0 #367f9e !important;
        }

        .adminNav {
          border-color: #a97d17 !important;
          background:
            linear-gradient(180deg, #fff9d5 0%, #f4d36d 52%, #e5ad2e 100%) !important;
          color: #302100 !important;
          box-shadow:
            inset 0 1px 0 #fffef0,
            0 4px 0 #98701a !important;
        }

        .homeNav {
          border-color: #4d8b5a !important;
          background:
            linear-gradient(180deg, #f3fff5 0%, #aee1b8 52%, #69bc7a 100%) !important;
          color: #123d1c !important;
          box-shadow:
            inset 0 1px 0 #ffffff,
            0 4px 0 #4d8558 !important;
        }

        .filterRow {
          align-items: stretch;
        }

        .filterActions {
          display: flex;
          flex: 0 0 auto;
          align-items: stretch;
          gap: 9px;
        }

        .selectModeButton,
        .resetFilterButton {
          min-height: 52px;
          border: 1px solid #6d8796;
          border-radius: 11px;
          padding: 10px 15px;
          color: #14394b;
          font-weight: 900;
          cursor: pointer;
          box-shadow:
            inset 0 1px 0 #ffffff,
            0 4px 0 #79909c;
        }

        .selectModeButton {
          background:
            linear-gradient(180deg, #f4fcff 0%, #a9ddf0 52%, #72bdd9 100%);
        }

        .activeSelectMode {
          border-color: #9b730d;
          background:
            linear-gradient(180deg, #fff9d4 0%, #f4d36d 52%, #e6af2f 100%);
          color: #3d2a00;
          box-shadow:
            inset 0 1px 0 #fffef0,
            0 4px 0 #947019;
        }

        .resetFilterButton {
          background:
            linear-gradient(180deg, #ffffff 0%, #e7ecef 52%, #cfd9de 100%);
        }

        .selectionBar {
          animation: selectionOpen 160ms ease-out;
        }

        @keyframes selectionOpen {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .dangerTool {
          color: #111111 !important;
          text-shadow: none !important;
        }

        .visibleCount {
          color: #405f70 !important;
        }

        .tableTopBar > div:first-child {
          display: flex;
          align-items: center;
          min-height: 32px;
        }

        .studentCell strong {
          margin: 0;
        }


        /* =====================================================
           SAYT USLUBIGA MOS QIDIRUV + ZAMONAVIY TANLASH
        ===================================================== */

        @media (min-width: 1101px) {
          .filterRow {
            display: grid;
            grid-template-columns:
              minmax(0, 1fr)
              285px
              auto;
            align-items: stretch;
            gap: 12px;
          }
        }

        .searchGroup {
          min-width: 0;
        }

        .searchGroup input,
        .sortSelect,
        .selectModeButton,
        .resetFilterButton {
          min-height: 54px;
          font-size: 16px;
        }

        .searchGroup input {
          border: 2px solid #7b8991;
          border-radius: 10px;
          background:
            linear-gradient(180deg, #ffffff 0%, #fbfbfb 58%, #f0f0f0 100%);
          color: #111111;
          box-shadow:
            inset 0 1px 0 #ffffff,
            inset 0 2px 5px rgba(0, 0, 0, 0.06),
            0 3px 0 #a4adb2;
        }

        .searchGroup input:focus {
          border-color: #1f84af;
          box-shadow:
            0 0 0 3px rgba(31, 132, 175, 0.12),
            inset 0 2px 5px rgba(0, 0, 0, 0.05),
            0 3px 0 #6fa6bd;
        }

        .searchGroup input::placeholder {
          color: #616b70;
          font-style: normal;
        }

        .clearSearch {
          top: 9px;
          right: 9px;
          width: 34px;
          height: 34px;
          border: 1px solid #a8b1b6;
          border-radius: 8px;
          background:
            linear-gradient(180deg, #ffffff, #dfe5e8);
          color: #263d49;
          box-shadow:
            inset 0 1px 0 #ffffff,
            0 2px 0 #a5afb4;
        }

        .sortSelect {
          border: 2px solid #7b8991;
          border-radius: 10px;
          background-color: #ffffff;
          color: #111111;
          box-shadow:
            inset 0 1px 0 #ffffff,
            0 3px 0 #a4adb2;
          font-weight: 700;
        }

        .selectModeButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          min-width: 132px;
          border: 2px solid #367e9d;
          border-radius: 10px;
          background:
            linear-gradient(180deg, #eafaff 0%, #8fd1ec 55%, #54abd0 100%);
          color: #082f43;
          box-shadow:
            inset 0 1px 0 #ffffff,
            0 4px 0 #347a98;
        }

        .modernSelectIcon {
          display: inline-grid;
          place-items: center;
          width: 24px;
          height: 24px;
          flex: 0 0 24px;
          border: 2px solid #2e708e;
          border-radius: 7px;
          background:
            linear-gradient(180deg, #ffffff, #d8eef7);
          box-shadow:
            inset 0 1px 0 #ffffff,
            0 1px 0 rgba(0, 0, 0, 0.09);
        }

        .modernSelectIcon svg {
          width: 16px;
          height: 16px;
          fill: none;
          stroke: #1d6685;
          stroke-width: 3;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .modernSelectIcon.active {
          border-color: #8c6600;
          background:
            linear-gradient(180deg, #fff9d8, #e9bd39);
        }

        .modernSelectIcon.active svg {
          stroke: #4e3900;
        }

        /* Native checkbox o‘rniga saytdagi 3D uslubga mos zamonaviy belgi */
        input[type="checkbox"] {
          appearance: none;
          -webkit-appearance: none;
          display: inline-grid;
          place-content: center;
          width: 21px;
          height: 21px;
          margin: 0;
          border: 2px solid #718995;
          border-radius: 6px;
          background:
            linear-gradient(180deg, #ffffff, #e9eef1);
          box-shadow:
            inset 0 1px 0 #ffffff,
            0 2px 0 #aab6bc;
          cursor: pointer;
          transition:
            transform 120ms ease,
            border-color 120ms ease,
            background 120ms ease;
        }

        input[type="checkbox"]::before {
          content: "";
          width: 10px;
          height: 6px;
          border-left: 3px solid #ffffff;
          border-bottom: 3px solid #ffffff;
          transform:
            rotate(-45deg)
            scale(0);
          transform-origin: center;
          transition: transform 120ms ease;
        }

        input[type="checkbox"]:checked {
          border-color: #1e789e;
          background:
            linear-gradient(180deg, #63c9ed, #278eb7);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.6),
            0 2px 0 #1e6887;
        }

        input[type="checkbox"]:checked::before {
          transform:
            rotate(-45deg)
            scale(1);
        }

        input[type="checkbox"]:focus-visible {
          outline: 3px solid rgba(37, 137, 178, 0.2);
          outline-offset: 2px;
        }

        .selectionReadyRow {
          cursor: pointer;
        }

        .selectionReadyRow td {
          user-select: none;
        }

        .selectionReadyRow:not(.selectedRow):hover {
          background: #f2f9fc !important;
        }

        .selectedRow {
          background:
            linear-gradient(90deg, #fff8cf, #fffdf0) !important;
        }

        .filterActions {
          align-items: stretch;
        }

        .resetFilterButton {
          border: 2px solid #87949b;
          background:
            linear-gradient(180deg, #ffffff, #dde4e8);
          color: #1a303b;
          box-shadow:
            inset 0 1px 0 #ffffff,
            0 4px 0 #89979e;
        }

        @media (max-width: 1100px) {
          .filterRow {
            display: flex;
            flex-direction: column;
            align-items: stretch;
          }

          .sortSelect {
            width: 100%;
            flex-basis: auto;
          }

          .filterActions {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 620px) {
          .filterActions {
            grid-template-columns: 1fr;
          }

          .selectModeButton,
          .resetFilterButton {
            width: 100%;
          }
        }

        /* =====================================================
           FINAL VISUAL TUNING
           Katta ekranlarda matn mayda ko‘rinib qolmasligi uchun.
        ===================================================== */

        .hero3d,
        .mainPanel3d {
          box-sizing: border-box;
        }

        .headerButtons .silverButton {
          font-family: "Times New Roman", Times, serif;
          font-size: 15px;
        }

        .periodButton {
          font-size: 18px;
        }

        .topCard:only-child {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: 54px minmax(180px, 1fr) auto;
          grid-template-areas:
            "medal rank numbers"
            "medal name numbers";
          align-items: center;
          column-gap: 16px;
          min-height: 112px;
          padding: 20px 24px;
        }

        .topCard:only-child .medal {
          position: static;
          grid-area: medal;
        }

        .topCard:only-child .podiumRank {
          grid-area: rank;
          align-self: end;
          margin: 0 0 4px;
        }

        .topCard:only-child > strong {
          grid-area: name;
          align-self: start;
          margin: 0;
          font-size: 22px;
        }

        .topCard:only-child .podiumNumbers {
          grid-area: numbers;
          justify-content: flex-end;
        }

        .topCard:only-child .podiumNumbers span {
          padding: 8px 11px;
          font-size: 13px;
        }

        .controlDeck {
          padding-top: 18px;
          padding-bottom: 18px;
        }

        .searchGroup input::placeholder {
          color: #708591;
          opacity: 1;
        }

        .selectedBadge,
        .tableCount {
          font-size: 12px;
        }

        .tableShell3d {
          margin-top: 4px;
        }

        tbody tr:nth-child(even):not(.selectedRow) {
          background: #fbfdfe;
        }

        td {
          color: #1d4052;
        }

        .rankBadge {
          font-size: 12px;
        }

        .metricChip {
          font-size: 13px;
        }

        .accuracyCell strong {
          font-size: 13px;
        }

        .rankingRule3d {
          padding: 16px 17px;
        }

        .rankingRule3d strong {
          font-size: 15px;
        }

        .rankingRule3d p {
          font-size: 12px;
        }

        @media (min-width: 1500px) {
          .page {
            padding-left: 34px;
            padding-right: 34px;
          }

          .hero3d,
          .mainPanel3d {
            width: min(1760px, 96%);
          }
        }

        @media (max-width: 900px) {
          .topCard:only-child {
            display: block;
            min-height: 145px;
            padding: 20px 20px 18px 82px;
          }

          .topCard:only-child .medal {
            position: absolute;
            left: 20px;
            top: 24px;
          }

          .topCard:only-child > strong {
            display: block;
            margin-bottom: 10px;
          }

          .topCard:only-child .podiumNumbers {
            justify-content: flex-start;
          }
        }


        /* =====================================================
           FINAL DESIGN SYSTEM — QURBONOVV.UZ ADMIN USLUBI
        ===================================================== */

        :global(body) {
          margin: 0;
          background: #f7fafc;
        }

        .page {
          min-height: 100vh;
          overflow-x: hidden;
          padding: 28px 16px 48px;
          background:
            radial-gradient(circle at 88% 5%, rgba(85, 194, 242, 0.16), transparent 28%),
            linear-gradient(180deg, #ffffff 0%, #f5f8fa 54%, #edf3f6 100%);
          color: #071c2a;
          font-family: "Bell MT", Georgia, "Times New Roman", serif;
        }

        .page,
        .page button,
        .page input,
        .page select,
        .page table,
        .page th,
        .page td {
          font-family: "Bell MT", Georgia, "Times New Roman", serif !important;
        }

        .pageGlow {
          display: none;
        }

        .hero3d,
        .mainPanel3d {
          width: min(1600px, 100%);
          max-width: 1600px;
          margin-left: auto;
          margin-right: auto;
        }

        /* ---------- TOP HEADER ---------- */

        .hero3d {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 72px;
          padding: 16px 22px;
          border: 2px solid #18485f;
          border-radius: 19px;
          background:
            linear-gradient(180deg, #89d8f8 0%, #64bee8 48%, #3b9dcc 100%);
          box-shadow:
            inset 0 2px 0 rgba(255, 255, 255, 0.92),
            inset 0 -2px 0 rgba(0, 59, 91, 0.18),
            0 7px 0 #123d52,
            0 14px 24px rgba(0, 45, 67, 0.16);
        }

        .heroTitleWrap {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 330px;
          padding: 10px 22px 10px 12px;
          border: 2px solid #5d656a;
          border-radius: 13px;
          background:
            linear-gradient(180deg, #ffffff 0%, #f4f4f4 48%, #d6d6d6 100%);
          box-shadow:
            inset 0 2px 0 #ffffff,
            0 5px 0 #596166;
        }

        .trophyBox {
          display: grid;
          place-items: center;
          width: 46px;
          height: 46px;
          flex: 0 0 auto;
          border: 1px solid #a16d00;
          border-radius: 50%;
          background:
            linear-gradient(180deg, #fff6c4 0%, #ffd767 48%, #eeb326 100%);
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,0.9),
            0 3px 0 #9b6900;
          font-size: 23px;
        }

        .heroTitleWrap h1 {
          margin: 0;
          color: #071c2a;
          font-size: clamp(25px, 2.2vw, 34px);
          font-weight: 700;
          line-height: 1;
          letter-spacing: 0;
          text-shadow: 0 1px 0 #fff;
        }

        .headerButtons {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 10px;
        }

        .silverButton {
          min-height: 46px;
          min-width: 122px;
          padding: 9px 15px;
          border-radius: 10px;
          color: #071c2a;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,0.8),
            0 4px 0 rgba(27, 63, 79, 0.62);
        }

        .resultsNav {
          border: 1px solid #24799f;
          background: linear-gradient(180deg, #eefbff, #8bd8f3 55%, #52b5de);
        }

        .adminNav {
          border: 1px solid #a47713;
          background: linear-gradient(180deg, #fff9dc, #f6d260 55%, #e5aa1f);
        }

        .homeNav {
          border: 1px solid #4b8b57;
          background: linear-gradient(180deg, #f2fff4, #a9e0af 55%, #69bc78);
        }

        /* ---------- MAIN PANEL ---------- */

        .mainPanel3d {
          position: relative;
          padding: 54px 26px 28px;
          border: 2px solid #293235;
          border-radius: 20px;
          background:
            linear-gradient(180deg, #606466 0%, #55595b 48%, #45494b 100%);
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,0.12),
            0 8px 0 #252c2f,
            0 18px 34px rgba(20, 28, 32, 0.20);
        }

        .floating3dLabel {
          position: absolute;
          top: -31px;
          left: 50%;
          transform: translateX(-50%);
          min-width: 310px;
          padding: 12px 26px;
          border: 2px solid #1b5068;
          border-radius: 14px;
          background:
            linear-gradient(180deg, #b8eaff 0%, #74c9ee 52%, #3aa5d1 100%);
          color: #0b3245;
          box-shadow:
            inset 0 2px 0 #effbff,
            0 5px 0 #174c63;
          text-align: center;
          font-size: 24px;
          font-weight: 700;
        }

        /* ---------- PERIOD TABS ---------- */

        .periodTabs {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
          margin-bottom: 20px;
        }

        .periodButton {
          min-height: 72px;
          padding: 12px 18px;
          border: 2px solid #71808a;
          border-radius: 14px;
          background:
            linear-gradient(180deg, #ffffff 0%, #f5f5f5 52%, #d8dde0 100%);
          color: #111;
          box-shadow:
            inset 0 2px 0 #fff,
            0 6px 0 #52646e;
          font-size: 22px;
          font-weight: 700;
          cursor: pointer;
        }

        .periodButton.active {
          border-color: #a87900;
          background:
            linear-gradient(180deg, #fff8d3 0%, #ffe27a 50%, #efb926 100%);
          color: #111;
          box-shadow:
            inset 0 2px 0 #fff9df,
            0 6px 0 #906600;
        }

        /* ---------- STATS ---------- */

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 15px;
          margin-bottom: 22px;
        }

        .stat3d {
          display: flex;
          align-items: center;
          gap: 14px;
          min-height: 105px;
          padding: 16px 18px;
          border: 1px solid #d4d4d4;
          border-radius: 13px;
          background:
            linear-gradient(180deg, #ffffff 0%, #fbfbfb 55%, #e9e9e9 100%);
          box-shadow:
            inset 0 2px 0 #fff,
            0 5px 0 #a9a9a9;
        }

        .statIcon {
          display: grid;
          place-items: center;
          width: 52px;
          height: 52px;
          flex: 0 0 auto;
          border: 1px solid #6199b1;
          border-radius: 50%;
          background:
            linear-gradient(180deg, #effaff, #9edcf3);
          color: #0a536f;
          box-shadow:
            inset 0 2px 0 #fff,
            0 3px 0 #5e8fa4;
          font-size: 23px;
          font-weight: 700;
        }

        .greenStat .statIcon {
          border-color: #61986b;
          background: linear-gradient(180deg, #f3fff4, #aee4b7);
          color: #146629;
          box-shadow: inset 0 2px 0 #fff, 0 3px 0 #65976d;
        }

        .redStat .statIcon {
          border-color: #b36363;
          background: linear-gradient(180deg, #fff4f4, #efb1b1);
          color: #a41818;
          box-shadow: inset 0 2px 0 #fff, 0 3px 0 #a96262;
        }

        .stat3d span {
          display: block;
          margin: 0 0 4px;
          color: #222;
          font-size: 17px;
          font-weight: 400;
        }

        .stat3d strong {
          display: block;
          color: #07547a;
          font-size: 29px;
          line-height: 1;
        }

        .greenStat strong {
          color: #08752c;
        }

        .redStat strong {
          color: #b31313;
        }

        /* ---------- PODIUM ---------- */

        .podiumSection {
          margin-bottom: 22px;
          padding: 18px;
          border: 1px solid #d0d0d0;
          border-radius: 14px;
          background: #f7f7f7;
          box-shadow:
            inset 0 2px 0 #fff,
            0 5px 0 #b4b4b4;
        }

        .sectionTitleRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 13px;
        }

        .sectionTitleRow h2 {
          margin: 0;
          color: #111;
          font-size: 20px;
          font-weight: 700;
        }

        .topThree {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .topCard {
          position: relative;
          min-height: 132px;
          padding: 20px 20px 18px 78px;
          border-radius: 14px;
          color: #111;
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,.75),
            0 5px 0 rgba(74,74,74,.46);
        }

        .top1 {
          border: 1px solid #b98a16;
          background: linear-gradient(135deg, #fff8d5, #ffe594 48%, #efbd32);
        }

        .top2 {
          border: 1px solid #929ca2;
          background: linear-gradient(135deg, #fff, #e9ecee 48%, #c8d0d4);
        }

        .top3 {
          border: 1px solid #a97c5a;
          background: linear-gradient(135deg, #fff7ed, #eac3a4 48%, #c98a5e);
        }

        .medal {
          position: absolute;
          left: 18px;
          top: 23px;
          display: grid;
          place-items: center;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(255,255,255,.76);
          box-shadow: 0 3px 7px rgba(0,0,0,.12);
          font-size: 25px;
        }

        .podiumRank {
          margin-bottom: 5px;
          font-size: 14px;
          font-weight: 700;
        }

        .topCard > strong {
          display: block;
          margin-bottom: 12px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 20px;
        }

        .podiumNumbers {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .podiumNumbers span {
          padding: 6px 10px;
          border-radius: 9px;
          background: rgba(255,255,255,.70);
          font-size: 15px;
        }

        .topCard:only-child {
          grid-column: 1 / -1;
          min-height: 115px;
        }

        /* ---------- CONTROL DECK ---------- */

        .controlDeck {
          margin-bottom: 22px;
          padding: 17px;
          border: 1px solid #d3d3d3;
          border-radius: 13px;
          background: #f7f7f7;
          box-shadow:
            inset 0 2px 0 #fff,
            0 5px 0 #b6b6b6;
        }

        .filterRow {
          display: grid;
          grid-template-columns: minmax(300px, 1fr) 260px auto;
          align-items: center;
          gap: 12px;
          margin-bottom: 13px;
        }

        .searchGroup {
          position: relative;
          min-width: 0;
        }

        .searchSvg {
          position: absolute;
          left: 17px;
          top: 50%;
          width: 20px;
          height: 20px;
          transform: translateY(-50%);
          fill: none;
          stroke: #375564;
          stroke-width: 2;
          stroke-linecap: round;
          pointer-events: none;
          z-index: 2;
        }

        .searchGroup input,
        .sortSelect {
          width: 100%;
          min-height: 50px;
          border: 2px solid #777;
          border-radius: 8px;
          background: #fff;
          color: #111;
          outline: none;
          box-shadow:
            inset 0 2px 4px rgba(0,0,0,.05),
            0 2px 0 #b8b8b8;
          font-size: 17px;
          font-weight: 400;
        }

        .searchGroup input {
          padding: 10px 46px 10px 50px;
        }

        .searchGroup input::-webkit-search-cancel-button {
          display: none;
        }

        .searchGroup input::placeholder {
          color: #6e6e6e;
          opacity: 1;
        }

        .sortSelect {
          padding: 9px 12px;
          cursor: pointer;
        }

        .searchGroup input:focus,
        .sortSelect:focus {
          border-color: #2d9bcb;
          box-shadow: 0 0 0 3px rgba(45,155,203,.15);
        }

        .clearSearch {
          position: absolute;
          right: 9px;
          top: 50%;
          width: 31px;
          height: 31px;
          transform: translateY(-50%);
          border: 1px solid #a0a0a0;
          border-radius: 50%;
          background: linear-gradient(180deg, #fff, #e4e4e4);
          color: #333;
          font-size: 20px;
          font-weight: 700;
          cursor: pointer;
        }

        .filterActions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 9px;
        }

        .selectModeButton,
        .resetFilterButton {
          min-height: 50px;
          border-radius: 9px;
          color: #111;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
        }

        .selectModeButton {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          min-width: 132px;
          justify-content: center;
          padding: 8px 13px;
          border: 1px solid #26779a;
          background: linear-gradient(180deg, #effaff, #9eddf4 58%, #64b9dc);
          box-shadow: inset 0 2px 0 #fff, 0 4px 0 #4c8ea8;
        }

        .modernSelectIcon {
          position: relative;
          display: grid;
          place-items: center;
          width: 25px;
          height: 25px;
          flex: 0 0 auto;
          border: 2px solid #2b6c86;
          border-radius: 7px;
          background: linear-gradient(180deg, #fff, #dceaf0);
          box-shadow:
            inset 0 1px 0 #fff,
            0 2px 0 rgba(33, 85, 108, .48);
        }

        .modernSelectIcon svg {
          width: 16px;
          height: 16px;
          fill: none;
          stroke: #1f607b;
          stroke-width: 3;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .activeSelectMode {
          border-color: #146b32;
          background: linear-gradient(180deg, #f2fff4, #a8e1b2 58%, #69bc78);
          box-shadow: inset 0 2px 0 #fff, 0 4px 0 #4b8f58;
        }

        .activeSelectMode .modernSelectIcon {
          border-color: #26743a;
          background: linear-gradient(180deg, #eaffed, #80d58f);
          box-shadow: inset 0 1px 0 #fff, 0 2px 0 #397b45;
        }

        .activeSelectMode .modernSelectIcon svg {
          stroke: #0b5e22;
        }

        .resetFilterButton {
          padding: 8px 13px;
          border: 1px solid #777;
          background: linear-gradient(180deg, #fff, #ddd);
          box-shadow: inset 0 2px 0 #fff, 0 4px 0 #888;
        }

        /* ---------- MODERN CHECKBOX ---------- */

        .masterCheck input[type="checkbox"],
        .checkColumn input[type="checkbox"] {
          appearance: none;
          -webkit-appearance: none;
          width: 24px;
          height: 24px;
          margin: 0;
          border: 2px solid #4c7182;
          border-radius: 7px;
          background: linear-gradient(180deg, #fff, #dfe9ed);
          box-shadow: inset 0 1px 0 #fff, 0 2px 0 #89a1ac;
          cursor: pointer;
          vertical-align: middle;
        }

        .masterCheck input[type="checkbox"]:checked,
        .checkColumn input[type="checkbox"]:checked {
          border-color: #1e6f8e;
          background:
            linear-gradient(180deg, #8ad9f5, #3ba8d2);
          box-shadow: inset 0 1px 0 #dff8ff, 0 2px 0 #246f8d;
          background-image:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M5 12.5l4 4L19 7' fill='none' stroke='%23ffffff' stroke-width='3.3' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-size: 17px 17px;
          background-position: center;
          background-repeat: no-repeat;
        }

        .selectionBar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin: 0 0 13px;
          padding: 11px 13px;
          border: 1px solid #78a8bd;
          border-radius: 10px;
          background: linear-gradient(180deg, #eefaff, #d9f1fb);
          box-shadow: inset 0 2px 0 #fff, 0 3px 0 #85aab9;
        }

        .selectionLeft,
        .selectionActions {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }

        .masterCheck {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          color: #111;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
        }

        .selectedBadge {
          padding: 7px 11px;
          border: 1px solid #af871e;
          border-radius: 999px;
          background: linear-gradient(180deg, #fff7d0, #f2d36a);
          color: #111;
          font-size: 15px;
          box-shadow: inset 0 1px 0 #fff;
        }

        .small3dButton,
        .bulkDeleteButton {
          min-height: 39px;
          padding: 7px 12px;
          border-radius: 8px;
          color: #111;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
        }

        .small3dButton {
          border: 1px solid #777;
          background: linear-gradient(180deg, #fff, #ddd);
          box-shadow: inset 0 1px 0 #fff, 0 3px 0 #888;
        }

        .activeSmall {
          border-color: #257999;
          background: linear-gradient(180deg, #effaff, #a5dff5);
          box-shadow: inset 0 1px 0 #fff, 0 3px 0 #659eb5;
        }

        .bulkDeleteButton {
          border: 1px solid #a24444;
          background: linear-gradient(180deg, #fff2f2, #efb1b1);
          box-shadow: inset 0 1px 0 #fff, 0 3px 0 #a96666;
        }

        /* ---------- ACTION BAR ---------- */

        .actionRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-top: 1px;
        }

        .periodInfo3d {
          display: flex;
          align-items: center;
          gap: 13px;
          flex-wrap: wrap;
          flex: 1 1 auto;
          min-height: 49px;
          padding: 9px 13px;
          border-left: 5px solid #d6aa21;
          border-radius: 8px;
          background: #fffbea;
          color: #111;
          font-size: 15px;
        }

        .periodInfo3d strong {
          font-size: 16px;
        }

        .visibleCount {
          margin-left: auto;
        }

        .toolButtons {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          flex-wrap: wrap;
          gap: 9px;
        }

        .toolButtons button {
          min-height: 45px;
          padding: 9px 14px;
          border-radius: 8px;
          color: #111 !important;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
        }

        .blueTool {
          border: 1px solid #267a9e !important;
          background: linear-gradient(180deg, #effbff, #9eddf4) !important;
          box-shadow: inset 0 2px 0 #fff, 0 4px 0 #5f99b0 !important;
        }

        .pdfTool {
          border: 1px solid #aa6969 !important;
          background: linear-gradient(180deg, #fff2f2, #efb1b1) !important;
          box-shadow: inset 0 2px 0 #fff, 0 4px 0 #a96d6d !important;
        }

        .csvTool {
          border: 1px solid #66956e !important;
          background: linear-gradient(180deg, #f2fff4, #afe0b6) !important;
          box-shadow: inset 0 2px 0 #fff, 0 4px 0 #76a47d !important;
        }

        .dangerTool {
          border: 1px solid #9b2424 !important;
          background: linear-gradient(180deg, #f36d6d, #d32626) !important;
          color: #000 !important;
          text-shadow: 0 1px 0 rgba(255,255,255,.30);
          box-shadow: inset 0 2px 0 rgba(255,255,255,.42), 0 4px 0 #861919 !important;
        }

        /* ---------- TABLE ---------- */

        .tableShell3d {
          overflow: hidden;
          border: 1px solid #cecece;
          border-radius: 13px;
          background: #fff;
          box-shadow:
            inset 0 2px 0 #fff,
            0 5px 0 #ababab;
        }

        .tableTopBar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 13px 15px;
          background: linear-gradient(180deg, #f8f8f8, #e5e5e5);
          border-bottom: 1px solid #c8c8c8;
        }

        .tableTopBar strong {
          color: #111;
          font-size: 19px;
        }

        .tableCount {
          padding: 6px 11px;
          border: 1px solid #b88e22;
          border-radius: 999px;
          background: linear-gradient(180deg, #fff7d2, #f0cf62);
          color: #111;
          font-size: 15px;
        }

        .tableWrap {
          overflow-x: auto;
        }

        table {
          width: 100%;
          min-width: 1350px;
          border-collapse: collapse;
          background: #fff;
        }

        th,
        td {
          padding: 13px 10px;
          border-bottom: 1px solid #dedede;
          color: #111;
          text-align: center;
          vertical-align: middle;
          font-size: 15px;
        }

        th {
          position: sticky;
          top: 0;
          z-index: 2;
          background:
            linear-gradient(180deg, #2a6e8d 0%, #18506a 52%, #103b50 100%);
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          text-shadow: 0 1px 0 rgba(0,0,0,.28);
        }

        tbody tr:nth-child(even):not(.selectedRow) {
          background: #fafafa;
        }

        tbody tr.selectedRow {
          background: linear-gradient(90deg, #fff8d8, #fffdf1);
          box-shadow: inset 5px 0 0 #d5aa26;
        }

        .selectionReadyRow {
          cursor: pointer;
        }

        .checkColumn {
          width: 52px;
          min-width: 52px;
        }

        .rankBadge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 45px;
          padding: 6px 9px;
          border: 1px solid #b4b4b4;
          border-radius: 999px;
          background: linear-gradient(180deg, #fff, #e2e2e2);
          color: #111;
          box-shadow: inset 0 1px 0 #fff, 0 2px 0 #b2b2b2;
          font-size: 14px;
          font-weight: 700;
        }

        .rank1 {
          border-color: #b48919;
          background: linear-gradient(180deg, #fff7cd, #efc64d);
        }

        .rank2 {
          border-color: #969fa4;
          background: linear-gradient(180deg, #fff, #d7dcdf);
        }

        .rank3 {
          border-color: #ae7d59;
          background: linear-gradient(180deg, #fff5e9, #dbab86);
        }

        .studentCell {
          min-width: 260px;
          text-align: left;
        }

        .studentCell strong {
          display: block;
          color: #111;
          font-size: 17px;
          font-weight: 700;
        }

        .metricChip {
          display: inline-flex;
          min-width: 39px;
          justify-content: center;
          padding: 5px 7px;
          border-radius: 7px;
          background: #eaf3f7;
          color: #164a60;
          font-size: 15px;
          font-weight: 700;
        }

        .correctValue {
          color: #087e2d;
          font-size: 17px;
          font-weight: 700;
        }

        .incorrectValue {
          color: #be1616;
          font-size: 17px;
          font-weight: 700;
        }

        .accuracyCell {
          min-width: 120px;
        }

        .accuracyCell strong {
          display: block;
          margin-bottom: 5px;
          font-size: 15px;
        }

        .accuracyTrack {
          height: 7px;
          overflow: hidden;
          border-radius: 999px;
          background: #d8d8d8;
          box-shadow: inset 0 1px 2px rgba(0,0,0,.14);
        }

        .accuracyBar {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #36add8, #15789f);
        }

        .dateCell {
          min-width: 160px;
          white-space: nowrap;
          font-size: 14px;
        }

        .deleteUserButton {
          min-height: 37px;
          padding: 7px 12px;
          border: 1px solid #a84848;
          border-radius: 8px;
          background: linear-gradient(180deg, #fff2f2, #efb1b1);
          color: #111;
          box-shadow: inset 0 1px 0 #fff, 0 3px 0 #a76363;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        /* ---------- RULE ---------- */

        .rankingRule3d {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 18px;
          padding: 13px 15px;
          border: 1px solid #7aafc5;
          border-radius: 11px;
          background: linear-gradient(180deg, #eefdff, #d8f2fc);
          color: #111;
          box-shadow: inset 0 1px 0 #fff, 0 4px 0 #8db3c2;
        }

        .ruleIcon {
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          flex: 0 0 auto;
          border-radius: 50%;
          background: linear-gradient(180deg, #67caee, #268bb1);
          color: #fff;
          box-shadow: 0 3px 0 #1d6581;
          font-size: 18px;
          font-weight: 700;
        }

        .rankingRule3d strong {
          display: block;
          margin-bottom: 2px;
          font-size: 16px;
        }

        .rankingRule3d p {
          margin: 0;
          color: #111;
          font-size: 14px;
          line-height: 1.35;
        }

        .emptyState {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 40px 16px;
          color: #333;
        }

        .emptyState strong {
          font-size: 19px;
        }

        .emptyState span {
          font-size: 15px;
        }

        .errorBox {
          margin-bottom: 14px;
          padding: 12px 14px;
          border: 1px solid #a94646;
          border-radius: 10px;
          background: #fff1f1;
          color: #8c1717;
          font-size: 16px;
        }

        .loader3d {
          width: 35px;
          height: 35px;
          border: 4px solid #d7e6ed;
          border-top-color: #1b789e;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        /* ---------- PRESS EFFECTS ---------- */

        @media (hover: hover) and (pointer: fine) {
          .silverButton:hover,
          .periodButton:hover,
          .selectModeButton:hover,
          .resetFilterButton:hover,
          .small3dButton:hover,
          .bulkDeleteButton:hover,
          .toolButtons button:hover,
          .deleteUserButton:hover {
            filter: brightness(1.035);
          }
        }

        .silverButton:active,
        .periodButton:active,
        .selectModeButton:active,
        .resetFilterButton:active,
        .small3dButton:active,
        .bulkDeleteButton:active,
        .toolButtons button:active,
        .deleteUserButton:active {
          transform: translateY(3px);
          box-shadow: 0 1px 0 rgba(70,70,70,.55) !important;
        }

        button:disabled {
          opacity: .48;
          cursor: not-allowed;
          filter: grayscale(.18);
        }

        /* ---------- RESPONSIVE ---------- */

        @media (max-width: 1180px) {
          .hero3d,
          .actionRow,
          .selectionBar {
            align-items: stretch;
            flex-direction: column;
          }

          .headerButtons,
          .toolButtons,
          .selectionActions {
            justify-content: stretch;
          }

          .headerButtons button,
          .toolButtons button {
            flex: 1 1 160px;
          }

          .filterRow {
            grid-template-columns: 1fr 1fr;
          }

          .searchGroup {
            grid-column: 1 / -1;
          }

          .filterActions {
            justify-content: stretch;
          }

          .filterActions button {
            flex: 1;
          }

          .statsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .topThree {
            grid-template-columns: 1fr;
          }

          .visibleCount {
            margin-left: 0;
          }
        }

        @media (max-width: 700px) {
          .rankingTestRow {
            grid-template-columns: 1fr;
          }

          .rankingTestMain,
          .rankingTestDate {
            grid-column: auto;
          }

          .rankingTestsHeader {
            align-items: flex-start;
            flex-direction: column;
          }


          .page {
            padding: 20px 9px 36px;
          }

          .hero3d {
            margin-bottom: 66px;
            padding: 12px;
          }

          .heroTitleWrap {
            min-width: 0;
            width: 100%;
          }

          .heroTitleWrap h1 {
            font-size: 24px;
          }

          .headerButtons {
            width: 100%;
            display: grid;
            grid-template-columns: 1fr;
          }

          .mainPanel3d {
            padding: 48px 9px 19px;
          }

          .floating3dLabel {
            min-width: 240px;
            font-size: 20px;
          }

          .periodTabs,
          .statsGrid,
          .filterRow {
            grid-template-columns: 1fr;
          }

          .searchGroup {
            grid-column: auto;
          }

          .filterActions,
          .toolButtons,
          .selectionActions {
            display: grid;
            grid-template-columns: 1fr;
            width: 100%;
          }

          .filterActions button,
          .toolButtons button,
          .selectionActions button {
            width: 100%;
          }

          .periodInfo3d {
            align-items: flex-start;
            flex-direction: column;
          }
        }



        /* =====================================================
           FOYDALANUVCHILAR REYTINGI — ZAMONAVIY 3D KARTALAR
        ===================================================== */

        .rankingBoard {
          overflow: hidden;
          border: 2px solid #737b7f;
          border-radius: 15px;
          background:
            linear-gradient(180deg, #f7f7f7 0%, #ececec 100%);
          box-shadow:
            inset 0 2px 0 #ffffff,
            0 6px 0 #555e62,
            0 12px 24px rgba(0, 0, 0, 0.14);
        }

        .rankingBoardHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          min-height: 62px;
          padding: 11px 16px;
          border-bottom: 2px solid #16485f;
          background:
            linear-gradient(180deg, #8edcf9 0%, #58b8e0 54%, #2c8fbb 100%);
          box-shadow:
            inset 0 2px 0 rgba(255, 255, 255, 0.8);
        }

        .rankingBoardTitle {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .rankingBoardIcon {
          display: grid;
          place-items: center;
          width: 38px;
          height: 38px;
          flex: 0 0 auto;
          border: 1px solid #1d6787;
          border-radius: 50%;
          background:
            linear-gradient(180deg, #f2fbff, #a8def2);
          color: #0b425b;
          box-shadow:
            inset 0 1px 0 #ffffff,
            0 3px 0 #397e9b;
          font-size: 19px;
          font-weight: 700;
        }

        .rankingBoardTitle strong {
          color: #072b3d;
          font-size: 22px;
          font-weight: 700;
          text-shadow: 0 1px 0 rgba(255, 255, 255, 0.7);
        }

        .rankingBoardRight {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 10px;
        }

        .boardSelectAll {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 38px;
          padding: 6px 11px;
          border: 1px solid #5a7d8d;
          border-radius: 9px;
          background:
            linear-gradient(180deg, #ffffff, #dce9ef);
          color: #112f3d;
          box-shadow:
            inset 0 1px 0 #ffffff,
            0 3px 0 #65838f;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .boardSelectAll input,
        .rankingSelectBox input {
          appearance: none;
          -webkit-appearance: none;
          width: 24px;
          height: 24px;
          margin: 0;
          border: 2px solid #4c7182;
          border-radius: 7px;
          background:
            linear-gradient(180deg, #ffffff, #dfe9ed);
          box-shadow:
            inset 0 1px 0 #ffffff,
            0 2px 0 #89a1ac;
          cursor: pointer;
        }

        .boardSelectAll input:checked,
        .rankingSelectBox input:checked {
          border-color: #1d6886;
          background:
            linear-gradient(180deg, #82d7f4, #2b9fcb);
          background-image:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M5 12.5l4 4L19 7' fill='none' stroke='%23ffffff' stroke-width='3.3' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-position: center;
          background-repeat: no-repeat;
          background-size: 17px 17px;
          box-shadow:
            inset 0 1px 0 #dcf8ff,
            0 2px 0 #246f8d;
        }

        .rankingBoard .tableCount {
          min-width: 54px;
          text-align: center;
          font-size: 15px;
        }

        .rankingList {
          display: grid;
          gap: 12px;
          padding: 14px;
          background:
            linear-gradient(180deg, #ededed 0%, #e1e1e1 100%);
        }

        .rankingUserCard {
          display: grid;
          grid-template-columns:
            minmax(260px, 1.15fr)
            minmax(620px, 2.7fr)
            minmax(170px, 0.8fr);
          align-items: stretch;
          gap: 12px;
          min-width: 0;
          padding: 13px;
          border: 1px solid #b7b7b7;
          border-radius: 13px;
          background:
            linear-gradient(180deg, #ffffff 0%, #f8f8f8 58%, #ececec 100%);
          box-shadow:
            inset 0 2px 0 #ffffff,
            0 4px 0 #a7a7a7,
            0 7px 14px rgba(0, 0, 0, 0.08);
          transition:
            transform 120ms ease,
            box-shadow 120ms ease,
            border-color 120ms ease,
            background 120ms ease;
        }

        .selectableRankingCard {
          grid-template-columns:
            42px
            minmax(240px, 1.1fr)
            minmax(600px, 2.6fr)
            minmax(170px, 0.8fr);
          cursor: pointer;
        }

        @media (hover: hover) and (pointer: fine) {
          .rankingUserCard:hover {
            transform: translateY(-1px);
            border-color: #8fa8b3;
            box-shadow:
              inset 0 2px 0 #ffffff,
              0 5px 0 #94a4aa,
              0 10px 18px rgba(0, 0, 0, 0.10);
          }
        }

        .selectedRankingCard {
          border-color: #c39519;
          background:
            linear-gradient(90deg, #fff8d8 0%, #fffdf5 42%, #fff9df 100%);
          box-shadow:
            inset 5px 0 0 #d4a61f,
            inset 0 2px 0 #ffffff,
            0 4px 0 #b39b5a;
        }

        .rankingSelectBox {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .rankingIdentity {
          display: flex;
          align-items: center;
          gap: 13px;
          min-width: 0;
          padding: 6px 4px;
        }

        .rankMedal {
          display: grid;
          place-items: center;
          width: 54px;
          height: 54px;
          flex: 0 0 auto;
          border: 1px solid #a8a8a8;
          border-radius: 50%;
          background:
            linear-gradient(180deg, #ffffff, #e1e1e1);
          box-shadow:
            inset 0 2px 0 #ffffff,
            0 3px 0 #a0a0a0;
          color: #111111;
          font-size: 20px;
          font-weight: 700;
        }

        .rankMedal1 {
          border-color: #b48817;
          background:
            linear-gradient(180deg, #fff8ce, #f2ca53);
          box-shadow:
            inset 0 2px 0 #ffffff,
            0 3px 0 #a87b0b;
        }

        .rankMedal2 {
          border-color: #929da3;
          background:
            linear-gradient(180deg, #ffffff, #d6dde1);
          box-shadow:
            inset 0 2px 0 #ffffff,
            0 3px 0 #8a979e;
        }

        .rankMedal3 {
          border-color: #aa7854;
          background:
            linear-gradient(180deg, #fff4e8, #d9a67e);
          box-shadow:
            inset 0 2px 0 #ffffff,
            0 3px 0 #9b6b49;
        }

        .rankingUserName {
          min-width: 0;
        }

        .rankingUserName strong {
          display: block;
          overflow: hidden;
          color: #101010;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 20px;
          font-weight: 700;
        }

        .rankingPositionText {
          display: inline-block;
          margin-top: 6px;
          padding: 4px 9px;
          border: 1px solid #c0c0c0;
          border-radius: 999px;
          background: #f2f2f2;
          color: #444444;
          font-size: 13px;
          font-weight: 700;
        }

        .rankingMetrics {
          display: grid;
          grid-template-columns:
            repeat(7, minmax(82px, 1fr));
          gap: 8px;
          min-width: 0;
        }

        .rankingMetric {
          display: flex;
          min-width: 0;
          min-height: 76px;
          padding: 9px 7px;
          border: 1px solid #c9c9c9;
          border-radius: 10px;
          background:
            linear-gradient(180deg, #ffffff, #f0f0f0);
          box-shadow:
            inset 0 1px 0 #ffffff,
            0 3px 0 #b7b7b7;
          text-align: center;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .rankingMetric span {
          display: block;
          margin-bottom: 4px;
          color: #444444;
          font-size: 13px;
          font-weight: 400;
          white-space: nowrap;
        }

        .rankingMetric strong {
          display: block;
          color: #0c4c69;
          font-size: 20px;
          line-height: 1;
          font-weight: 700;
        }

        .testMetricButton {
          width: 100%;
          font-family: inherit;
          cursor: pointer;
          transition:
            transform 120ms ease,
            border-color 120ms ease,
            box-shadow 120ms ease;
        }

        .testMetricButton small {
          display: block;
          margin-top: 5px;
          color: #1b6787;
          font-size: 10px;
          font-weight: 700;
        }

        .testMetricButton:not(:disabled):hover {
          transform: translateY(-1px);
          border-color: #74aac1;
          background:
            linear-gradient(180deg, #f6fcff, #d9edf5);
          box-shadow:
            inset 0 1px 0 #ffffff,
            0 4px 0 #90aebc;
        }

        .testMetricButton:disabled {
          cursor: default;
          opacity: .72;
        }

        .successMetric strong {
          color: #087c2d;
        }

        .dangerMetric strong {
          color: #bd1616;
        }

        .scoreMetric {
          border-color: #b89a49;
          background:
            linear-gradient(180deg, #fffbea, #f4e5aa);
          box-shadow:
            inset 0 1px 0 #ffffff,
            0 3px 0 #b19a58;
        }

        .scoreMetric strong {
          color: #6d5100;
        }

        .accuracyMetricCard {
          min-width: 105px;
        }

        .cardAccuracyTrack {
          width: 100%;
          height: 6px;
          margin-top: 7px;
          overflow: hidden;
          border-radius: 999px;
          background: #d4d4d4;
          box-shadow:
            inset 0 1px 2px rgba(0,0,0,0.13);
        }

        .cardAccuracyBar {
          height: 100%;
          border-radius: inherit;
          background:
            linear-gradient(90deg, #44b7df, #147ba4);
        }

        .rankingSide {
          display: flex;
          min-width: 0;
          padding-left: 2px;
          border-left: 1px solid #d0d0d0;
          flex-direction: column;
          justify-content: space-between;
          gap: 9px;
        }

        .rankingActivity {
          padding: 8px 9px;
          border: 1px solid #c7c7c7;
          border-radius: 9px;
          background:
            linear-gradient(180deg, #fafafa, #e7e7e7);
          text-align: center;
        }

        .rankingActivity span {
          display: block;
          margin-bottom: 5px;
          color: #555555;
          font-size: 12px;
        }

        .rankingActivity strong {
          display: block;
          color: #111111;
          font-size: 13px;
          line-height: 1.35;
        }

        .rankingDeleteButton {
          width: 100%;
          min-height: 39px;
          font-size: 14px;
        }

        .rankingTestsPanel {
          grid-column: 1 / -1;
          margin-top: 2px;
          padding: 13px;
          border: 1px solid #8baab8;
          border-radius: 12px;
          background:
            linear-gradient(180deg, #edf9fe 0%, #dbeef6 100%);
          box-shadow:
            inset 0 2px 0 #ffffff,
            0 3px 0 #7696a4;
        }

        .rankingTestsHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
          padding-bottom: 10px;
          border-bottom: 1px solid #b5ced8;
        }

        .rankingTestsHeader strong,
        .rankingTestsHeader span {
          display: block;
        }

        .rankingTestsHeader strong {
          color: #0d4f6c;
          font-size: 17px;
        }

        .rankingTestsHeader span {
          margin-top: 3px;
          color: #57737f;
          font-size: 11px;
        }

        .rankingTestsCount {
          flex: 0 0 auto;
          padding: 6px 10px;
          border: 1px solid #7da5b6;
          border-radius: 999px;
          background:
            linear-gradient(180deg, #ffffff, #cfe8f2);
          color: #155a77;
          box-shadow:
            inset 0 1px 0 #ffffff,
            0 2px 0 #86a4b0;
          font-size: 12px;
          font-weight: 700;
        }

        .rankingTestsList {
          display: grid;
          gap: 8px;
        }

        .rankingTestRow {
          display: grid;
          grid-template-columns:
            minmax(240px, 2fr)
            repeat(5, minmax(78px, .62fr))
            minmax(150px, 1fr);
          align-items: stretch;
          gap: 7px;
          padding: 8px;
          border: 1px solid #bdcdd4;
          border-radius: 10px;
          background:
            linear-gradient(180deg, #ffffff, #f1f5f7);
          box-shadow:
            inset 0 1px 0 #ffffff,
            0 2px 0 #afc1c9;
        }

        .rankingTestMain,
        .rankingTestStat,
        .rankingTestDate {
          min-width: 0;
          padding: 7px 8px;
          border: 1px solid #d0dade;
          border-radius: 8px;
          background: rgba(255,255,255,.75);
        }

        .rankingTestMain {
          display: flex;
          justify-content: center;
          flex-direction: column;
        }

        .rankingTestMain strong {
          overflow: hidden;
          color: #111111;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 14px;
        }

        .rankingTestMain span {
          margin-top: 4px;
          overflow: hidden;
          color: #70777a;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 9px;
        }

        .rankingTestStat,
        .rankingTestDate {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          text-align: center;
        }

        .rankingTestStat span,
        .rankingTestDate span {
          margin-bottom: 4px;
          color: #606a6e;
          font-size: 10px;
        }

        .rankingTestStat strong {
          color: #0e5675;
          font-size: 16px;
        }

        .correctTestStat strong {
          color: #087c2d;
        }

        .incorrectTestStat strong {
          color: #bd1616;
        }

        .rankingTestDate strong {
          color: #222222;
          font-size: 10px;
          line-height: 1.3;
        }

        .rankingTestsEmpty {
          padding: 18px;
          border: 1px dashed #9fb9c4;
          border-radius: 9px;
          background: rgba(255,255,255,.60);
          color: #546c77;
          text-align: center;
          font-weight: 700;
        }

        .rankingEmptyState {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 9px;
          min-height: 170px;
          padding: 30px 16px;
          border: 1px solid #bdbdbd;
          border-radius: 12px;
          background:
            linear-gradient(180deg, #ffffff, #efefef);
          color: #333333;
          box-shadow:
            inset 0 2px 0 #ffffff,
            0 4px 0 #b1b1b1;
          text-align: center;
        }

        .rankingEmptyIcon {
          display: grid;
          place-items: center;
          width: 48px;
          height: 48px;
          border: 1px solid #7ea0af;
          border-radius: 50%;
          background:
            linear-gradient(180deg, #f3fbff, #b8e2f2);
          color: #1b5d78;
          font-size: 23px;
        }

        .rankingEmptyState strong {
          color: #111111;
          font-size: 19px;
        }

        .rankingEmptyState span {
          color: #555555;
          font-size: 15px;
        }

        @media (max-width: 1450px) {
          .rankingUserCard {
            grid-template-columns:
              minmax(230px, 1fr)
              minmax(520px, 2.4fr)
              minmax(155px, .75fr);
          }

          .selectableRankingCard {
            grid-template-columns:
              40px
              minmax(220px, 1fr)
              minmax(500px, 2.3fr)
              minmax(155px, .75fr);
          }

          .rankingMetrics {
            grid-template-columns:
              repeat(4, minmax(90px, 1fr));
          }

          .rankingMetric:last-child {
            grid-column: auto;
          }
        }

        @media (max-width: 1050px) {
          .rankingUserCard,
          .selectableRankingCard {
            grid-template-columns: 1fr;
          }

          .rankingSelectBox {
            justify-content: flex-start;
          }

          .rankingSide {
            padding-left: 0;
            border-left: 0;
            border-top: 1px solid #d0d0d0;
            padding-top: 10px;
            display: grid;
            grid-template-columns: 1fr auto;
            align-items: center;
          }

          .rankingDeleteButton {
            width: auto;
            min-width: 120px;
          }

          .rankingTestRow {
            grid-template-columns:
              repeat(3, minmax(0, 1fr));
          }

          .rankingTestMain {
            grid-column: 1 / -1;
          }

          .rankingTestDate {
            grid-column: span 2;
          }

          .rankingMetrics {
            grid-template-columns:
              repeat(4, minmax(100px, 1fr));
          }
        }

        @media (max-width: 680px) {
          .rankingBoardHeader {
            align-items: stretch;
            flex-direction: column;
          }

          .rankingBoardRight {
            justify-content: space-between;
          }

          .rankingBoardTitle strong {
            font-size: 19px;
          }

          .rankingList {
            padding: 10px;
          }

          .rankingUserCard {
            padding: 10px;
          }

          .rankingUserName strong {
            font-size: 18px;
          }

          .rankingMetrics {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .rankingSide {
            grid-template-columns: 1fr;
          }

          .rankingDeleteButton {
            width: 100%;
          }
        }


        .rankingManagerButton {
          min-height: 44px;
          padding: 0 16px;
          border: 1px solid #8a711d;
          border-radius: 9px;
          background:
            linear-gradient(
              180deg,
              #fff8ca,
              #e6c85b
            );
          color: #4e3c05;
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,.82),
            0 4px 0 #987c27;
          font-weight: 800;
          cursor: pointer;
        }

        .rankingManagerButton:hover {
          filter: brightness(1.03);
          transform: translateY(-1px);
        }

        .rankingManagerButton.activeRankingManager {
          background:
            linear-gradient(
              180deg,
              #dff7ff,
              #69c4e8
            );
          border-color: #267da1;
          color: #124e6a;
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,.86),
            0 4px 0 #367d98;
        }

        .rankingManagerPanel {
          margin-top: 14px;
          padding: 14px;
          border: 1px solid #7c888e;
          border-radius: 13px;
          background:
            linear-gradient(
              180deg,
              #f7f9fa,
              #d9dddf
            );
          box-shadow:
            inset 0 2px 0 #fff,
            0 5px 0 rgba(0,0,0,.22);
        }

        .rankingManagerTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 12px;
        }

        .rankingManagerTop > div:first-child {
          min-width: 0;
        }

        .rankingManagerTop strong,
        .rankingManagerTop span {
          display: block;
        }

        .rankingManagerTop > div:first-child > strong {
          color: #124f70;
          font-size: 18px;
        }

        .rankingManagerTop > div:first-child > span {
          margin-top: 4px;
          color: #58666d;
          font-size: 12px;
          font-weight: 700;
        }

        .rankingManagerStats {
          display: flex;
          gap: 8px;
          flex: 0 0 auto;
        }

        .rankingManagerStats span {
          padding: 7px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 900;
        }

        .managerOnBadge {
          border: 1px solid #68a37b;
          background: #e3f7e8;
          color: #176c38;
        }

        .managerOffBadge {
          border: 1px solid #bc8585;
          background: #fbe8e8;
          color: #8e2929;
        }

        .rankingManagerSearch {
          margin-bottom: 12px;
        }

        .rankingManagerSearch input {
          width: 100%;
          min-height: 42px;
          padding: 0 13px;
          border: 1px solid #919a9e;
          border-radius: 9px;
          background: #fff;
          color: #183d51;
          outline: none;
          box-shadow:
            inset 0 2px 3px rgba(0,0,0,.08),
            0 2px 0 rgba(255,255,255,.75);
          font-family: inherit;
        }

        .rankingProfileList {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .rankingProfileRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          min-width: 0;
          padding: 11px 12px;
          border-radius: 11px;
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,.82),
            0 3px 0 rgba(0,0,0,.16);
        }

        .profileRankingOn {
          border: 1px solid #70a981;
          background:
            linear-gradient(
              180deg,
              #f2fff5,
              #d7f1df
            );
        }

        .profileRankingOff {
          border: 1px solid #bd8b8b;
          background:
            linear-gradient(
              180deg,
              #fff7f7,
              #f3dede
            );
        }

        .rankingProfileIdentity {
          min-width: 0;
        }

        .rankingProfileIdentity strong,
        .rankingProfileIdentity span {
          display: block;
        }

        .rankingProfileIdentity strong {
          overflow: hidden;
          color: #163c50;
          font-size: 14px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .rankingProfileIdentity span {
          margin-top: 4px;
          color: #69757b;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 10px;
        }

        .rankingProfileState {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 0 0 auto;
        }

        .rankingProfileState > span {
          max-width: 145px;
          color: #536068;
          font-size: 10px;
          font-weight: 800;
          text-align: right;
        }

        .rankingToggle {
          position: relative;
          width: 82px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding: 0 10px;
          border-radius: 999px;
          cursor: pointer;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 10px;
          font-weight: 900;
          transition: .18s ease;
        }

        .rankingToggle:disabled {
          opacity: .65;
          cursor: wait;
        }

        .rankingToggleKnob {
          position: absolute;
          top: 4px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #fff;
          box-shadow:
            0 2px 4px rgba(0,0,0,.28),
            inset 0 1px 0 #fff;
          transition: .18s ease;
        }

        .rankingToggle strong {
          position: relative;
          z-index: 1;
        }

        .rankingToggleOn {
          border: 1px solid #3d8b58;
          background:
            linear-gradient(
              180deg,
              #71dc93,
              #36a85c
            );
          color: #fff;
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,.34),
            0 3px 0 #2b7443;
        }

        .rankingToggleOn .rankingToggleKnob {
          left: 4px;
        }

        .rankingToggleOff {
          justify-content: flex-start;
          border: 1px solid #a35050;
          background:
            linear-gradient(
              180deg,
              #ee9b9b,
              #cc5e5e
            );
          color: #fff;
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,.30),
            0 3px 0 #8f4242;
        }

        .rankingToggleOff .rankingToggleKnob {
          right: 4px;
        }


        .rankingManagerTopRight {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 0 0 auto;
        }

        .managerSelectButton {
          min-height: 34px;
          padding: 0 13px;
          border: 1px solid #4c879f;
          border-radius: 9px;
          background:
            linear-gradient(
              180deg,
              #eefbff,
              #9ed7ee
            );
          color: #154f6a;
          cursor: pointer;
          box-shadow:
            inset 0 2px 0 #fff,
            0 3px 0 #5f94a8;
          font-family: inherit;
          font-weight: 900;
        }

        .managerSelectButton.activeManagerSelect {
          border-color: #9b6a1e;
          background:
            linear-gradient(
              180deg,
              #fff7d6,
              #efce70
            );
          color: #6a4b0e;
          box-shadow:
            inset 0 2px 0 #fff,
            0 3px 0 #a17c31;
        }

        .managerSelectionBar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin: -2px 0 12px;
          padding: 10px 12px;
          border: 1px solid #a8afb3;
          border-radius: 10px;
          background:
            linear-gradient(
              180deg,
              #ffffff,
              #e7eaec
            );
          box-shadow:
            inset 0 2px 0 #fff,
            0 3px 0 rgba(0,0,0,.14);
        }

        .managerMasterCheck,
        .managerProfileCheck {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #304b59;
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
        }

        .managerMasterCheck input,
        .managerProfileCheck input {
          width: 18px;
          height: 18px;
          accent-color: #2694bd;
          cursor: pointer;
        }

        .managerSelectionActions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .managerCancelSelectButton,
        .managerBulkArchiveButton {
          min-height: 34px;
          padding: 0 12px;
          border-radius: 8px;
          cursor: pointer;
          font-family: inherit;
          font-size: 11px;
          font-weight: 900;
        }

        .managerCancelSelectButton {
          border: 1px solid #78868c;
          background:
            linear-gradient(
              180deg,
              #fff,
              #d9dfe2
            );
          color: #354952;
          box-shadow:
            inset 0 2px 0 #fff,
            0 3px 0 #879399;
        }

        .managerBulkArchiveButton {
          border: 1px solid #aa4f4f;
          background:
            linear-gradient(
              180deg,
              #ffb7b7,
              #df6f6f
            );
          color: #7c1d1d;
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,.72),
            0 3px 0 #9e5151;
        }

        .managerBulkArchiveButton:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .rankingProfileLeft {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          flex: 1 1 auto;
        }

        .managerProfileCheck {
          flex: 0 0 auto;
        }

        .profileArchiveButton {
          width: 34px;
          height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 34px;
          border: 1px solid #aa4f4f;
          border-radius: 9px;
          background:
            linear-gradient(
              180deg,
              #fff1f1,
              #e98d8d
            );
          color: #9b2020;
          cursor: pointer;
          box-shadow:
            inset 0 2px 0 rgba(255,255,255,.84),
            0 3px 0 #a45b5b;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 16px;
          font-weight: 900;
        }

        .profileArchiveButton:hover {
          transform: translateY(-1px);
        }

        .profileArchiveButton:disabled {
          opacity: .55;
          cursor: wait;
          transform: none;
        }

        .rankingManagerEmpty {
          grid-column: 1 / -1;
          padding: 18px;
          border: 1px dashed #9ca8ad;
          border-radius: 10px;
          background: rgba(255,255,255,.55);
          color: #66737a;
          text-align: center;
          font-weight: 700;
        }

        @media (max-width: 900px) {
          .rankingManagerTopRight {
            width: 100%;
            justify-content: space-between;
            flex-wrap: wrap;
          }

          .managerSelectionBar {
            align-items: stretch;
            flex-direction: column;
          }

          .managerSelectionActions {
            width: 100%;
          }

          .managerCancelSelectButton,
          .managerBulkArchiveButton {
            flex: 1 1 auto;
          }

          .rankingProfileList {
            grid-template-columns: 1fr;
          }

          .rankingManagerTop {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 600px) {
          .rankingProfileRow {
            align-items: flex-start;
            flex-direction: column;
          }

          .rankingProfileState {
            width: 100%;
            justify-content: flex-end;
            flex-wrap: wrap;
          }

          .rankingProfileLeft {
            width: 100%;
          }

          .rankingProfileState > span {
            max-width: none;
            text-align: left;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            scroll-behavior: auto !important;
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.001ms !important;
          }
        }
      `}</style>
    </main>
  );
}
