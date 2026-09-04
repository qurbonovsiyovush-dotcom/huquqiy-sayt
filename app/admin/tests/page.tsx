"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

type TestStatus = "draft" | "published";

type TestOption = {
  id: string;
  text: string;
  isCorrect: boolean;
};

type TestShape = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  imageSrc?: string;
  [key: string]: unknown;
};

type TestQuestion = {
  id: string;
  questionHtml: string;
  options: TestOption[];
  shapes?: TestShape[];
  points?: number;
};

type TestCategory =
  | "legislation"
  | "thematic"
  | "block"
  | "national-certificate"
  | "thirty"
  | "custom";

type TestData = {
  id: string;
  title: string;
  subject: string;
  duration: number;
  description?: string;
  questions: TestQuestion[];
  status: TestStatus;

  /*
    Yangi kategoriya tizimi.
    Eski testlarda bu maydon bo‘lmasligi mumkin.
  */
  testType?: TestCategory;
  customTestTypeName?: string;

  createdAt?: string;
  updatedAt?: string;
};

const TEST_CATEGORIES: Array<{
  key: TestCategory;
  title: string;
  shortTitle: string;
  description: string;
  icon: string;
}> = [
  {
    key: "legislation",
    title: "Qonunchilik hujjatlaridan test",
    shortTitle: "Qonunchilik hujjatlaridan",
    description: "Konstitutsiya, kodeks, qonun va boshqa normativ-huquqiy hujjatlar",
    icon: "§",
  },
  {
    key: "thematic",
    title: "Mavzulashtirilgan test",
    shortTitle: "Mavzulashtirilgan",
    description: "Muayyan mavzu yoki bob bo‘yicha tuzilgan testlar",
    icon: "M",
  },
  {
    key: "block",
    title: "Blok test",
    shortTitle: "Blok test",
    description: "Bir nechta fan yoki bo‘limni birlashtirgan blok testlar",
    icon: "B",
  },
  {
    key: "national-certificate",
    title: "Milliy sertifikat testi",
    shortTitle: "Milliy sertifikat",
    description: "Milliy sertifikat formatidagi testlar",
    icon: "MS",
  },
  {
    key: "thirty",
    title: "30 talik test",
    shortTitle: "30 talik",
    description: "30 ta savoldan iborat tezkor testlar",
    icon: "30",
  },
  {
    key: "custom",
    title: "Boshqa test",
    shortTitle: "Boshqa test",
    description: "Test turining nomini adminning o‘zi belgilaydi",
    icon: "+",
  },
];

function normalizeTestType(test: TestData): TestCategory {
  const value = test.testType;

  if (
    value === "legislation" ||
    value === "thematic" ||
    value === "block" ||
    value === "national-certificate" ||
    value === "thirty" ||
    value === "custom"
  ) {
    return value;
  }

  /*
    Eski testlar yo‘qolib ketmasligi uchun
    kategoriyasiz testlarni “Boshqa test”ga joylaymiz.
  */
  return "custom";
}

function testTypeLabel(test: TestData) {
  const type = normalizeTestType(test);

  if (type === "custom") {
    return (
      String(test.customTestTypeName || "").trim() ||
      "Boshqa test"
    );
  }

  return (
    TEST_CATEGORIES.find((item) => item.key === type)?.title ||
    "Boshqa test"
  );
}

export default function AdminTestsPage() {
  const router = useRouter();

  const [tests, setTests] = useState<TestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [bulkPublishing, setBulkPublishing] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | TestStatus
  >("all");
  const [exportTest, setExportTest] = useState<TestData | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "word" | null>(null);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);

  const [selectedCategory, setSelectedCategory] =
    useState<TestCategory>("legislation");

  const [createCategory, setCreateCategory] =
    useState<TestCategory>("legislation");

  const [customCreateName, setCustomCreateName] =
    useState("");

  /* =========================================================
     JSON O'QISH
  ========================================================= */

  async function readJson(response: Response) {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  /* =========================================================
     TESTLARNI YUKLASH
  ========================================================= */

  const loadTests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/tests", {
        method: "GET",
        cache: "no-store",
      });

      const data = await readJson(response);

      if (!response.ok || !data.success) {
        setTests([]);

        setError(
          data.message ||
            "Testlarni serverdan yuklab bo‘lmadi."
        );

        return;
      }

      const loadedTests: TestData[] = Array.isArray(data.tests)
        ? data.tests
        : [];

      setTests(loadedTests);
    } catch (error) {
      console.error(error);

      setTests([]);

      setError(
        "Server bilan bog‘lanishda xatolik yuz berdi."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTests();
  }, [loadTests]);

  /* =========================================================
     FILTER
  ========================================================= */

  const categoryTests = useMemo(() => {
    return tests.filter(
      (test) =>
        normalizeTestType(test) ===
        selectedCategory
    );
  }, [tests, selectedCategory]);

  const filteredTests = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return categoryTests.filter((test) => {
      if (
        statusFilter !== "all" &&
        test.status !== statusFilter
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        String(test.title || "")
          .toLowerCase()
          .includes(query) ||
        String(test.subject || "")
          .toLowerCase()
          .includes(query) ||
        testTypeLabel(test)
          .toLowerCase()
          .includes(query)
      );
    });
  }, [
    categoryTests,
    search,
    statusFilter,
  ]);

  /* =========================================================
     STATISTIKA
  ========================================================= */

  const statistics = useMemo(() => {
    /*
      Umumiy statistika:
      - Jami test = barcha kategoriyalardagi testlar soni
      - Qoralama = barcha kategoriyalardagi qoralama testlar
      - E'lon qilingan = barcha kategoriyalardagi published testlar

      Tanlangan kategoriya faqat pastdagi ro'yxatni filtrlaydi.
    */
    const draft =
      tests.filter(
        (test) =>
          test.status === "draft"
      ).length;

    const published =
      tests.filter(
        (test) =>
          test.status ===
          "published"
      ).length;

    return {
      total:
        tests.length,
      draft,
      published,
    };
  }, [tests]);

  const categoryCounts = useMemo(() => {
    const counts: Record<TestCategory, number> = {
      legislation: 0,
      thematic: 0,
      block: 0,
      "national-certificate": 0,
      thirty: 0,
      custom: 0,
    };

    for (const test of tests) {
      counts[
        normalizeTestType(test)
      ] += 1;
    }

    return counts;
  }, [tests]);

  /* =========================================================
     TESTNI TO'LIQ OLISH
  ========================================================= */

  async function getFullTest(id: string): Promise<TestData | null> {
    try {
      const response = await fetch(
        `/api/tests/${encodeURIComponent(id)}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await readJson(response);

      if (!response.ok || !data.success || !data.test) {
        window.alert(
          data.message || "Test ma’lumotlarini olib bo‘lmadi."
        );

        return null;
      }

      return data.test as TestData;
    } catch (error) {
      console.error(error);

      window.alert(
        "Test ma’lumotlarini olishda server xatosi."
      );

      return null;
    }
  }

  /* =========================================================
     STATUSNI O'ZGARTIRISH
  ========================================================= */

  async function changeStatus(
    id: string,
    newStatus: TestStatus
  ) {
    setWorkingId(id);

    try {
      const fullTest = await getFullTest(id);

      if (!fullTest) {
        return;
      }

      if (
        newStatus === "published" &&
        (!Array.isArray(fullTest.questions) ||
          fullTest.questions.length === 0)
      ) {
        window.alert(
          "Savolsiz testni e’lon qilib bo‘lmaydi."
        );

        return;
      }

      const confirmed = window.confirm(
        newStatus === "published"
          ? "Ushbu test foydalanuvchilarga e’lon qilinsinmi?"
          : "Ushbu test qoralama holatiga qaytarilsinmi?"
      );

      if (!confirmed) {
        return;
      }

      /*
        MUHIM:
        780/840 ta savolning HAMMASINI qayta PUT qilmaymiz.
        Aks holda Vercel request hajmi limitiga uriladi.

        Serverdagi /api/tests/[id]/route.ts mavjud testni o‘qib,
        faqat status maydonini almashtiradi; savollar o‘z joyida qoladi.
      */
      const response = await fetch(
        `/api/tests/${encodeURIComponent(id)}`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      const data = await readJson(response);

      if (!response.ok || !data.success) {
        window.alert(
          data.message ||
            "Test holatini o‘zgartirib bo‘lmadi."
        );

        return;
      }

      setTests((current) =>
        current.map((test) =>
          test.id === id
            ? {
                ...test,
                ...(data.test || {}),
                status: newStatus,
              }
            : test
        )
      );

      window.alert(
        newStatus === "published"
          ? "Test muvaffaqiyatli e’lon qilindi."
          : "Test qoralama holatiga qaytarildi."
      );
    } catch (error) {
      console.error(error);

      window.alert(
        "Test holatini o‘zgartirishda server xatosi."
      );
    } finally {
      setWorkingId(null);
    }
  }

  /* =========================================================
     KO'RINIB TURGAN QORALAMALARNI BIR YO'LA E'LON QILISH
  ========================================================= */

  async function publishVisibleDrafts() {
    const drafts = filteredTests.filter(
      (test) => test.status === "draft"
    );

    if (drafts.length === 0) {
      window.alert(
        "Hozirgi filtrda e’lon qilinadigan qoralama test yo‘q."
      );
      return;
    }

    const confirmed = window.confirm(
      `${drafts.length} ta qoralama test bir yo‘la e’lon qilinadi.\n\n` +
        "Faqat hozir tanlangan bo‘lim va qidiruv/holat filtriga mos testlar e’lon qilinadi.\n\n" +
        "Davom etasizmi?"
    );

    if (!confirmed) {
      return;
    }

    setBulkPublishing(true);

    const publishedIds: string[] = [];
    const failed: string[] = [];

    try {
      /*
        Har bir test uchun faqat status maydonini PUT qilamiz.
        Savollar qayta yuborilmaydi, shuning uchun katta testlarda
        request hajmi oshib ketmaydi.

        So‘rovlarni ketma-ket yuboramiz: Blob faylga bir vaqtning
        o‘zida ko‘p yozish natijasida ma’lumot yo‘qolib qolmasin.
      */
      for (const test of drafts) {
        try {
          setWorkingId(test.id);

          const response = await fetch(
            `/api/tests/${encodeURIComponent(test.id)}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                status: "published",
              }),
            }
          );

          const data = await readJson(response);

          if (!response.ok || !data.success) {
            failed.push(test.title || test.id);
            continue;
          }

          publishedIds.push(test.id);

          setTests((current) =>
            current.map((item) =>
              item.id === test.id
                ? {
                    ...item,
                    ...(data.test || {}),
                    status: "published",
                  }
                : item
            )
          );
        } catch (error) {
          console.error(error);
          failed.push(test.title || test.id);
        }
      }

      if (failed.length === 0) {
        window.alert(
          `${publishedIds.length} ta test muvaffaqiyatli e’lon qilindi.`
        );
      } else {
        window.alert(
          `${publishedIds.length} ta test e’lon qilindi.\n` +
            `${failed.length} ta testda xatolik yuz berdi.\n\n` +
            "Xatolik bo‘lgan testlarni ro‘yxatdan tekshiring."
        );
      }

      await loadTests();
    } finally {
      setWorkingId(null);
      setBulkPublishing(false);
    }
  }

  /* =========================================================
     O'CHIRISH
  ========================================================= */

  async function deleteTest(test: TestData) {
    const confirmed = window.confirm(
      `"${test.title}" testi BUTUNLAY o‘chiriladi.\n\n` +
        "Bu amalni ortga qaytarib bo‘lmaydi.\n\n" +
        "Davom etasizmi?"
    );

    if (!confirmed) {
      return;
    }

    setWorkingId(test.id);

    try {
      const response = await fetch(
        `/api/tests/${encodeURIComponent(test.id)}`,
        {
          method: "DELETE",
          cache: "no-store",
        }
      );

      const data = await readJson(response);

      if (!response.ok || !data.success) {
        window.alert(
          data.message || "Testni o‘chirib bo‘lmadi."
        );

        return;
      }

      setTests((current) =>
        current.filter((item) => item.id !== test.id)
      );

      window.alert("Test o‘chirildi.");
    } catch (error) {
      console.error(error);

      window.alert(
        "Testni o‘chirishda server xatosi."
      );
    } finally {
      setWorkingId(null);
    }
  }

  /* =========================================================
     KO'RINIB TURGAN QORALAMALARNI BIR YO'LA O'CHIRISH
  ========================================================= */

  async function deleteVisibleDrafts() {
    const drafts = filteredTests.filter(
      (test) => test.status === "draft"
    );

    if (drafts.length === 0) {
      window.alert(
        "Hozirgi filtrda o‘chiriladigan qoralama test yo‘q."
      );
      return;
    }

    const confirmed = window.confirm(
      `${drafts.length} ta qoralama test BUTUNLAY o‘chiriladi.\n\n` +
        "Faqat hozir tanlangan bo‘lim va qidiruv/holat filtriga mos QORALAMA testlar o‘chiriladi.\n" +
        "E’lon qilingan testlarga tegilmaydi.\n\n" +
        "Bu amalni ortga qaytarib bo‘lmaydi.\n\n" +
        "Davom etasizmi?"
    );

    if (!confirmed) {
      return;
    }

    const secondConfirmed = window.confirm(
      `DIQQAT!\n\n${drafts.length} ta qoralamani BIR YO‘LA o‘chirishni tasdiqlaysizmi?`
    );

    if (!secondConfirmed) {
      return;
    }

    setBulkDeleting(true);
    setError("");

    try {
      /*
        MUHIM:
        Endi brauzer 35 ta DELETE so‘rovi yubormaydi.
        Barcha ID lar BIRTA POST so‘rov bilan serverga yuboriladi.
        Server tests.json ni bir marta o‘qib, bir marta yozadi.
      */
      const response = await fetch(
        "/api/tests",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            action:
              "bulk-delete-tests",
            testIds:
              drafts.map(
                (test) =>
                  test.id
              ),
            onlyDrafts: true,
          }),
        }
      );

      const data =
        await readJson(
          response
        );

      if (
        !response.ok ||
        !data.success
      ) {
        window.alert(
          data.message ||
            "Qoralamalarni bir yo‘la o‘chirib bo‘lmadi."
        );
        return;
      }

      const deletedIds =
        new Set<string>(
          Array.isArray(
            data.deletedIds
          )
            ? data.deletedIds.map(
                (value: unknown) =>
                  String(value)
              )
            : []
        );

      setTests(
        (current) =>
          current.filter(
            (test) =>
              !deletedIds.has(
                test.id
              )
          )
      );

      window.alert(
        `${Number(data.deletedCount) || deletedIds.size} ta qoralama test bir yo‘la o‘chirildi.`
      );

      await loadTests();
    } catch (error) {
      console.error(error);

      window.alert(
        "Qoralamalarni bir yo‘la o‘chirishda server xatosi."
      );
    } finally {
      setBulkDeleting(false);
      setWorkingId(null);
    }
  }

  /* =========================================================
     PDF / WORD EKSPORT
  ========================================================= */

  function cleanFileName(value: string) {
    return String(value || "test")
      .trim()
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
      .replace(/\s+/g, "_") || "test";
  }

  function stripHtml(value?: string) {
    if (!value) return "";

    if (typeof document === "undefined") {
      return String(value).replace(/<[^>]*>/g, " ");
    }

    const element = document.createElement("div");
    element.innerHTML = value;
    return (element.textContent || element.innerText || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeHtml(value: string) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async function imageToDataUrl(src?: string) {
    if (!src) return "";
    if (src.startsWith("data:")) return src;

    try {
      const response = await fetch(src, { cache: "no-store" });
      if (!response.ok) return src;
      const blob = await response.blob();

      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result || src));
        reader.onerror = () => resolve(src);
        reader.readAsDataURL(blob);
      });
    } catch {
      return src;
    }
  }


  function shapeNumber(shape: TestShape, key: string, fallback = 0) {
    const value = shape[key];
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function shapeString(shape: TestShape, key: string, fallback = "") {
    const value = shape[key];
    return typeof value === "string" ? value : fallback;
  }

  function getShapeLayout(shapes: TestShape[]) {
    if (!shapes.length) return null;

    const minX = Math.min(...shapes.map((shape) => Number(shape.x) || 0));
    const minY = Math.min(...shapes.map((shape) => Number(shape.y) || 0));
    const maxX = Math.max(
      ...shapes.map(
        (shape) =>
          (Number(shape.x) || 0) + Math.max(1, Number(shape.width) || 1)
      )
    );
    const maxY = Math.max(
      ...shapes.map(
        (shape) =>
          (Number(shape.y) || 0) + Math.max(1, Number(shape.height) || 1)
      )
    );

    const sourceWidth = Math.max(1, maxX - minX);
    const sourceHeight = Math.max(1, maxY - minY);

    // A4/Word ichida shakllar juda katta bo‘lib ketmasligi uchun
    // butun kompozitsiyani bir xil nisbatda kichraytiramiz.
    const scale = Math.min(1, 560 / sourceWidth, 300 / sourceHeight);

    return {
      minX,
      minY,
      sourceWidth,
      sourceHeight,
      scale,
      width: Math.max(1, Math.round(sourceWidth * scale)),
      height: Math.max(1, Math.round(sourceHeight * scale)),
    };
  }

  async function buildQuestionShapesHtml(question: TestQuestion) {
    const shapes = Array.isArray(question.shapes) ? question.shapes : [];
    const layout = getShapeLayout(shapes);
    if (!layout) return "";

    const items = await Promise.all(
      shapes.map(async (shape) => {
        const type = String(shape.type || "rectangle");
        const left = ((Number(shape.x) || 0) - layout.minX) * layout.scale;
        const top = ((Number(shape.y) || 0) - layout.minY) * layout.scale;
        const width = Math.max(1, Number(shape.width) || 1) * layout.scale;
        const height = Math.max(1, Number(shape.height) || 1) * layout.scale;
        const opacity = shapeNumber(shape, "opacity", 1);
        const zIndex = Math.round(shapeNumber(shape, "zIndex", 1));
        const borderWidth = shapeNumber(shape, "borderWidth", 2) * layout.scale;
        const borderRadius = shapeNumber(shape, "borderRadius", 6) * layout.scale;
        const backgroundColor = shapeString(shape, "backgroundColor", "#8fc9ef");
        const borderColor = shapeString(shape, "borderColor", "#2f5975");
        const textColor = shapeString(shape, "textColor", "#111111");
        const fontSize = Math.max(8, shapeNumber(shape, "fontSize", 20) * layout.scale);
        const fontFamily = shapeString(shape, "fontFamily", "Times New Roman");
        const fontWeight = shapeString(shape, "fontWeight", "normal");
        const fontStyle = shapeString(shape, "fontStyle", "normal");
        const textAlign = shapeString(shape, "textAlign", "center");
        const textDecoration = shapeString(shape, "textDecoration", "none");
        const textTransform = shapeString(shape, "textTransform", "none");
        const text = escapeHtml(shapeString(shape, "text", ""));

        const base = `position:absolute;left:${left}px;top:${top}px;width:${width}px;height:${height}px;z-index:${zIndex};opacity:${opacity};box-sizing:border-box;`;

        if (type === "image") {
          const src = await imageToDataUrl(shape.imageSrc);
          if (!src) return "";
          const objectFit = shapeString(shape, "objectFit", "contain");

          // PDF/Word eksportida rasm kompozitsiyani bosib ketmasin:
          // original shape qutisi ichida markazga proporsional kichraytiramiz.
          const imageScale = 0.52;
          const imageWidth = Math.max(1, width * imageScale);
          const imageHeight = Math.max(1, height * imageScale);
          const imageLeft = left + (width - imageWidth) / 2;
          const imageTop = top + (height - imageHeight) / 2;
          const imageBase = `position:absolute;left:${imageLeft}px;top:${imageTop}px;width:${imageWidth}px;height:${imageHeight}px;z-index:${zIndex};opacity:${opacity};box-sizing:border-box;`;

          return `<div style="${imageBase}overflow:hidden;border:${Math.max(0, borderWidth)}px solid ${escapeHtml(borderColor)};border-radius:${Math.max(0, borderRadius)}px;background:#fff;box-shadow:0 3px 8px rgba(0,0,0,.16);"><img src="${escapeHtml(src)}" alt="Savol rasmi" style="display:block;width:100%;height:100%;object-fit:${escapeHtml(objectFit)};" /></div>`;
        }

        if (type === "venn") {
          return `<div style="${base}">
            <div style="position:absolute;left:2%;top:8%;width:64%;height:84%;border:${Math.max(1, borderWidth)}px solid ${escapeHtml(borderColor)};border-radius:50%;background:${escapeHtml(backgroundColor)};opacity:.72;display:flex;align-items:center;justify-content:center;font-weight:700;box-shadow:inset 0 3px 4px rgba(255,255,255,.6),0 3px 7px rgba(0,0,0,.18);">A</div>
            <div style="position:absolute;right:2%;top:8%;width:64%;height:84%;border:${Math.max(1, borderWidth)}px solid ${escapeHtml(borderColor)};border-radius:50%;background:${escapeHtml(backgroundColor)};opacity:.72;display:flex;align-items:center;justify-content:center;font-weight:700;box-shadow:inset 0 3px 4px rgba(255,255,255,.6),0 3px 7px rgba(0,0,0,.18);">B</div>
          </div>`;
        }

        const radius =
          type === "circle" || type === "ellipse"
            ? "50%"
            : type === "roundedRectangle"
            ? `${Math.max(10, borderRadius)}px`
            : `${Math.max(0, borderRadius)}px`;
        const border = type === "text" ? "none" : `${Math.max(1, borderWidth)}px solid ${escapeHtml(borderColor)}`;
        const background = type === "text" ? "transparent" : escapeHtml(backgroundColor);
        const shadow = type === "text" ? "none" : "inset 0 3px 4px rgba(255,255,255,.72),0 3px 0 rgba(40,55,65,.35),0 7px 12px rgba(0,0,0,.17)";

        return `<div style="${base}display:flex;align-items:center;justify-content:${textAlign === "left" ? "flex-start" : textAlign === "right" ? "flex-end" : "center"};padding:${Math.max(2, 6 * layout.scale)}px;overflow:hidden;background:${background};border:${border};border-radius:${radius};box-shadow:${shadow};color:${escapeHtml(textColor)};font-family:${escapeHtml(fontFamily)};font-size:${fontSize}px;font-weight:${escapeHtml(fontWeight)};font-style:${escapeHtml(fontStyle)};text-align:${escapeHtml(textAlign)};text-decoration:${escapeHtml(textDecoration)};text-transform:${escapeHtml(textTransform)};line-height:1.15;">${text}</div>`;
      })
    );

    return `<div class="shapeStageWrap"><div class="shapeStage" style="position:relative;width:${layout.width}px;height:${layout.height}px;">${items.join("")}</div></div>`;
  }

  async function appendQuestionShapesForPdf(
    parent: HTMLElement,
    question: TestQuestion
  ) {
    const shapes = Array.isArray(question.shapes) ? question.shapes : [];
    const layout = getShapeLayout(shapes);
    if (!layout) return;

    const wrap = document.createElement("div");
    wrap.style.width = "100%";
    wrap.style.margin = "12px 0 14px";
    wrap.style.padding = "12px";
    wrap.style.display = "flex";
    wrap.style.justifyContent = "center";
    wrap.style.alignItems = "center";
    wrap.style.overflow = "hidden";
    wrap.style.background = "linear-gradient(180deg,#f7fbfe 0%,#e8f2f8 100%)";
    wrap.style.border = "2px solid #31586f";
    wrap.style.borderRadius = "14px";
    wrap.style.boxShadow = "inset 0 4px 4px rgba(255,255,255,.95), 0 4px 0 #355361, 0 8px 16px rgba(15,42,57,.18)";

    const stage = document.createElement("div");
    stage.style.position = "relative";
    stage.style.width = `${layout.width}px`;
    stage.style.height = `${layout.height}px`;
    stage.style.flex = "0 0 auto";
    stage.style.background = "transparent";
    stage.style.margin = "0 auto";
    wrap.appendChild(stage);

    for (const shape of shapes) {
      const type = String(shape.type || "rectangle");
      const item = document.createElement("div");
      item.style.position = "absolute";
      item.style.left = `${((Number(shape.x) || 0) - layout.minX) * layout.scale}px`;
      item.style.top = `${((Number(shape.y) || 0) - layout.minY) * layout.scale}px`;
      item.style.width = `${Math.max(1, Number(shape.width) || 1) * layout.scale}px`;
      item.style.height = `${Math.max(1, Number(shape.height) || 1) * layout.scale}px`;
      item.style.zIndex = String(Math.round(shapeNumber(shape, "zIndex", 1)));
      item.style.opacity = String(shapeNumber(shape, "opacity", 1));
      item.style.boxSizing = "border-box";

      const borderWidth = Math.max(0, shapeNumber(shape, "borderWidth", 2) * layout.scale);
      const borderRadius = Math.max(0, shapeNumber(shape, "borderRadius", 6) * layout.scale);
      const backgroundColor = shapeString(shape, "backgroundColor", "#8fc9ef");
      const borderColor = shapeString(shape, "borderColor", "#2f5975");
      const textColor = shapeString(shape, "textColor", "#111111");

      if (type === "image") {
        const src = await imageToDataUrl(shape.imageSrc);
        if (!src) continue;

        // Rasmning original joylashuvini saqlagan holda qutisi ichida markazga
        // kichraytiramiz. Shu sabab gerb/foto butun savolni egallab olmaydi.
        const currentLeft = ((Number(shape.x) || 0) - layout.minX) * layout.scale;
        const currentTop = ((Number(shape.y) || 0) - layout.minY) * layout.scale;
        const currentWidth = Math.max(1, Number(shape.width) || 1) * layout.scale;
        const currentHeight = Math.max(1, Number(shape.height) || 1) * layout.scale;
        const imageScale = 0.52;
        const imageWidth = Math.max(1, currentWidth * imageScale);
        const imageHeight = Math.max(1, currentHeight * imageScale);

        item.style.left = `${currentLeft + (currentWidth - imageWidth) / 2}px`;
        item.style.top = `${currentTop + (currentHeight - imageHeight) / 2}px`;
        item.style.width = `${imageWidth}px`;
        item.style.height = `${imageHeight}px`;
        item.style.overflow = "hidden";
        item.style.background = "transparent";
        item.style.border = borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : "none";
        item.style.borderRadius = `${borderRadius}px`;
        item.style.boxShadow = borderWidth > 0 ? "0 3px 8px rgba(0,0,0,.14)" : "none";

        const img = document.createElement("img");
        img.src = src;
        img.alt = "Savol rasmi";
        img.style.display = "block";
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = shapeString(shape, "objectFit", "contain") as
          | "contain"
          | "cover"
          | "fill";
        item.appendChild(img);
        stage.appendChild(item);
        continue;
      }

      if (type === "venn") {
        const makeCircle = (side: "left" | "right", label: string) => {
          const circle = document.createElement("div");
          circle.style.position = "absolute";
          circle.style.top = "8%";
          circle.style.width = "64%";
          circle.style.height = "84%";
          circle.style[side] = "2%";
          circle.style.border = `${Math.max(1, borderWidth)}px solid ${borderColor}`;
          circle.style.borderRadius = "50%";
          circle.style.background = backgroundColor;
          circle.style.opacity = ".72";
          circle.style.display = "flex";
          circle.style.alignItems = "center";
          circle.style.justifyContent = "center";
          circle.style.fontWeight = "700";
          circle.style.boxShadow = "inset 0 3px 4px rgba(255,255,255,.6),0 3px 7px rgba(0,0,0,.18)";
          circle.textContent = label;
          return circle;
        };
        item.appendChild(makeCircle("left", "A"));
        item.appendChild(makeCircle("right", "B"));
        stage.appendChild(item);
        continue;
      }

      item.style.display = "flex";
      item.style.alignItems = "center";
      const align = shapeString(shape, "textAlign", "center");
      item.style.justifyContent =
        align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";
      item.style.padding = `${Math.max(2, 6 * layout.scale)}px`;
      item.style.overflow = "hidden";
      item.style.color = textColor;
      item.style.fontFamily = shapeString(shape, "fontFamily", "Times New Roman");
      item.style.fontSize = `${Math.max(8, shapeNumber(shape, "fontSize", 20) * layout.scale)}px`;
      item.style.fontWeight = shapeString(shape, "fontWeight", "normal");
      item.style.fontStyle = shapeString(shape, "fontStyle", "normal");
      item.style.textAlign = align as "left" | "center" | "right";
      item.style.textDecoration = shapeString(shape, "textDecoration", "none");
      item.style.textTransform = shapeString(shape, "textTransform", "none") as
        | "none"
        | "uppercase"
        | "lowercase";
      item.style.lineHeight = "1.15";
      item.textContent = shapeString(shape, "text", "");

      if (type === "text") {
        item.style.background = "transparent";
        item.style.border = "none";
        item.style.boxShadow = "none";
      } else {
        item.style.background = backgroundColor;
        item.style.border = `${Math.max(1, borderWidth)}px solid ${borderColor}`;
        item.style.borderRadius =
          type === "circle" || type === "ellipse"
            ? "50%"
            : type === "roundedRectangle"
            ? `${Math.max(10, borderRadius)}px`
            : `${borderRadius}px`;
        item.style.boxShadow =
          "inset 0 3px 4px rgba(255,255,255,.72),0 3px 0 rgba(40,55,65,.35),0 7px 12px rgba(0,0,0,.17)";
      }

      stage.appendChild(item);
    }

    parent.appendChild(wrap);
  }

  async function buildTestDocument(
    fullTest: TestData,
    includeAnswers: boolean
  ) {
    const questions = Array.isArray(fullTest.questions)
      ? fullTest.questions
      : [];

    const questionParts = await Promise.all(
      questions.map(async (question, index) => {
        const options = Array.isArray(question.options)
          ? question.options
          : [];

        const shapesHtml = await buildQuestionShapesHtml(question);

        const optionsHtml = options
          .map((option, optionIndex) => {
            const letter = String.fromCharCode(65 + optionIndex);
            const correct = option.isCorrect === true;
            const optionText = stripHtml(option.text);
            const correctClass = includeAnswers && correct ? " correct" : "";
            const answerLabel =
              includeAnswers && correct
                ? '<span class="answer">TO‘G‘RI JAVOB</span>'
                : "";

            return `
              <div class="option${correctClass}">
                <strong>${letter}.</strong>
                ${escapeHtml(optionText || "Variant matni mavjud emas")}
                ${answerLabel}
              </div>
            `;
          })
          .join("");

        return `
          <section class="question">
            <h3>${index + 1}-savol</h3>
            <div class="questionText">${escapeHtml(
              stripHtml(question.questionHtml) || "Savol matni mavjud emas"
            )}</div>
            ${shapesHtml}
            <div class="options">${optionsHtml}</div>
          </section>
        `;
      })
    );

    return `<!doctype html>
<html lang="uz">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(fullTest.title || "Test")}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #101820;
      font-family: Arial, "Times New Roman", serif;
      font-size: 10.5pt;
      line-height: 1.34;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header {
      margin-bottom: 12px;
      padding: 12px;
      border: 2px solid #174461;
      border-radius: 12px;
      background: #eaf7ff;
      text-align: center;
    }
    .header h1 { margin: 0 0 5px; color: #073b68; font-size: 18pt; }
    .header p { margin: 3px 0; }
    .nameLine { margin-top: 9px; padding-top: 7px; border-top: 1px solid #7d9bad; text-align: left; }
    .meta { display: table; width: 100%; margin-top: 9px; border-collapse: collapse; }
    .meta div { display: table-cell; padding: 6px; border: 1px solid #9aa8b0; }
    .question {
      margin: 0 0 10px;
      padding: 9px 10px;
      break-inside: auto;
      page-break-inside: auto;
      border: 1px solid #8c9aa3;
      border-radius: 7px;
    }
    .question h3 { margin: 0 0 6px; color: #073b68; font-size: 12pt; }
    .questionText { margin-bottom: 7px; font-weight: 700; white-space: pre-wrap; }
    .questionImage { margin: 7px 0; text-align: center; break-inside: avoid; page-break-inside: avoid; }
    .questionImage img {
      display: inline-block;
      width: auto;
      height: auto;
     max-width: 48%;
max-height: 135px;
width: auto;
height: auto;
object-fit: contain;
display: block;
margin: 10px auto 12px;
      text-align: center;
      overflow: hidden;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .shapeStage {
      display: inline-block;
      vertical-align: top;
      background: #fff;
    }
    .option {
      position: relative;
      margin: 4px 0;
      padding: 5px 8px;
      border: 1px solid #c2c9cd;
      border-radius: 5px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .option.correct { border: 2px solid #2f8450; background: #eaf8ef; }
    .answer { float: right; margin-left: 8px; color: #176b39; font-size: 8pt; font-weight: 800; }
    .footer { margin-top: 12px; color: #4b5961; text-align: center; font-size: 8pt; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(fullTest.title || "Nomsiz test")}</h1>
    <p><strong>Fan:</strong> ${escapeHtml(fullTest.subject || "—")}</p>
    ${fullTest.description ? `<p>${escapeHtml(stripHtml(fullTest.description))}</p>` : ""}
    <div class="meta">
      <div><strong>Savollar:</strong> ${questions.length}</div>
      <div><strong>Vaqt:</strong> ${Number(fullTest.duration) || 0} daqiqa</div>
      <div><strong>Javoblar:</strong> ${includeAnswers ? "bilan" : "javobsiz"}</div>
    </div>
    <div class="nameLine"><strong>F.I.Sh.:</strong> ____________________________________________</div>
  </div>
  ${questionParts.join("")}
  <div class="footer">qurbonovv.uz — Huquqiy ta’lim platformasi</div>
</body>
</html>`;
  }

  async function exportAsWord(test: TestData, includeAnswers: boolean) {
    setExporting(true);
    setWorkingId(test.id);

    try {
      const fullTest = await getFullTest(test.id);
      if (!fullTest) return;

      const html = await buildTestDocument(fullTest, includeAnswers);
      const blob = new Blob(["\ufeff", html], {
        type: "application/msword;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `${cleanFileName(fullTest.title)}_${
        includeAnswers ? "javoblari_bilan" : "javobsiz"
      }.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setExportTest(null);
      setExportFormat(null);
    } catch (error) {
      console.error(error);
      window.alert("Word faylini yaratishda xatolik yuz berdi.");
    } finally {
      setExporting(false);
      setWorkingId(null);
    }
  }

  async function exportAsPdf(test: TestData, includeAnswers: boolean) {
    setExporting(true);
    setWorkingId(test.id);

    let renderRoot: HTMLDivElement | null = null;

    try {
      const fullTest = await getFullTest(test.id);
      if (!fullTest) return;

      const questions = Array.isArray(fullTest.questions)
        ? fullTest.questions
        : [];

      /*
        Muhim:
        jsPDF.html() ishlatmaymiz. U brauzer CSS'ini ayrim holatlarda
        noto'g'ri hisoblab, qora fon yoki juda katta shrift chiqarishi mumkin.
        Har bir blokni html2canvas bilan oq fonda rasmga aylantirib,
        PDF sahifalariga o'zimiz joylaymiz.
      */
      renderRoot = document.createElement("div");
      renderRoot.style.position = "fixed";
      renderRoot.style.left = "-100000px";
      renderRoot.style.top = "0";
      renderRoot.style.width = "720px";
      renderRoot.style.padding = "0";
      renderRoot.style.margin = "0";
      renderRoot.style.background = "#ffffff";
      renderRoot.style.color = "#111111";
      renderRoot.style.fontFamily = 'Arial, "Times New Roman", serif';
      renderRoot.style.fontSize = "16px";
      renderRoot.style.lineHeight = "1.42";
      renderRoot.style.zIndex = "-1";
      document.body.appendChild(renderRoot);

      function addBaseStyles(element: HTMLElement) {
        element.style.boxSizing = "border-box";
        element.style.width = "100%";
        element.style.background = "#ffffff";
        element.style.color = "#111111";
      }

      const header = document.createElement("section");
      addBaseStyles(header);
      header.style.padding = "18px";
      header.style.marginBottom = "14px";
      header.style.border = "2px solid #174461";
      header.style.borderRadius = "12px";
      header.style.background = "#eef8ff";
      header.style.textAlign = "center";
      header.innerHTML = `
        <h1 style="margin:0 0 7px;color:#073b68;font-size:30px;line-height:1.15;">
          ${escapeHtml(fullTest.title || "Nomsiz test")}
        </h1>
        <div style="font-size:17px;margin:4px 0;"><strong>Fan:</strong> ${escapeHtml(fullTest.subject || "—")}</div>
        ${fullTest.description ? `<div style="font-size:14px;margin:6px 0;">${escapeHtml(stripHtml(fullTest.description))}</div>` : ""}
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:12px;">
          <div style="padding:8px;border:1px solid #9aa8b0;background:#fff;"><strong>Savollar:</strong> ${questions.length}</div>
          <div style="padding:8px;border:1px solid #9aa8b0;background:#fff;"><strong>Vaqt:</strong> ${Number(fullTest.duration) || 0} daqiqa</div>
          <div style="padding:8px;border:1px solid #9aa8b0;background:#fff;"><strong>Javoblar:</strong> ${includeAnswers ? "bilan" : "javobsiz"}</div>
        </div>
        <div style="margin-top:12px;padding-top:9px;border-top:1px solid #7d9bad;text-align:left;font-size:16px;">
          <strong>F.I.Sh.:</strong> ______________________________________________
        </div>
      `;
      renderRoot.appendChild(header);

      const questionElements: HTMLElement[] = [];

      for (let index = 0; index < questions.length; index++) {
        const question = questions[index];
        const card = document.createElement("section");
        addBaseStyles(card);
        card.style.padding = "14px";
        card.style.marginBottom = "16px";
        card.style.border = "2px solid #2d5268";
        card.style.borderRadius = "15px";
        card.style.background = "linear-gradient(180deg,#ffffff 0%,#f2f6f8 100%)";
        card.style.boxShadow = "inset 0 4px 4px rgba(255,255,255,.95), 0 5px 0 #3a5664, 0 10px 18px rgba(0,0,0,.18)";

        const title = document.createElement("div");
        title.textContent = `${index + 1}-savol`;
        title.style.width = "fit-content";
        title.style.minWidth = "120px";
        title.style.margin = "0 0 11px";
        title.style.padding = "7px 15px";
        title.style.color = "#073b68";
        title.style.fontSize = "18px";
        title.style.fontWeight = "900";
        title.style.textAlign = "center";
        title.style.border = "2px solid #174461";
        title.style.borderRadius = "10px";
        title.style.background = "linear-gradient(180deg,#c6f0ff 0%,#69b7df 100%)";
        title.style.boxShadow = "inset 0 3px 3px rgba(255,255,255,.85), 0 3px 0 #17415c";
        card.appendChild(title);

        const questionText = document.createElement("div");
        questionText.textContent =
          stripHtml(question.questionHtml) || "Savol matni mavjud emas";
        questionText.style.marginBottom = "12px";
        questionText.style.padding = "12px 14px";
        questionText.style.fontSize = "16px";
        questionText.style.lineHeight = "1.42";
        questionText.style.fontWeight = "800";
        questionText.style.whiteSpace = "pre-wrap";
        questionText.style.overflowWrap = "anywhere";
        questionText.style.color = "#12202a";
        questionText.style.border = "1px solid #9aaab3";
        questionText.style.borderRadius = "10px";
        questionText.style.background = "linear-gradient(180deg,#ffffff 0%,#eef2f4 100%)";
        questionText.style.boxShadow = "inset 0 3px 3px rgba(255,255,255,.95), 0 3px 0 #b5bec3";
        card.appendChild(questionText);

        await appendQuestionShapesForPdf(card, question);

        const options = Array.isArray(question.options)
          ? question.options
          : [];

        options.forEach((option, optionIndex) => {
          const optionBox = document.createElement("div");
          const correct = includeAnswers && option.isCorrect === true;
          optionBox.style.display = "flex";
          optionBox.style.alignItems = "flex-start";
          optionBox.style.gap = "7px";
          optionBox.style.margin = "7px 0";
          optionBox.style.padding = "8px 11px";
          optionBox.style.border = correct
            ? "2px solid #2f8450"
            : "1px solid #8fa0aa";
          optionBox.style.borderRadius = "8px";
          optionBox.style.background = correct
            ? "linear-gradient(180deg,#f1fff5 0%,#ccefd7 100%)"
            : "linear-gradient(180deg,#ffffff 0%,#e9eef1 100%)";
          optionBox.style.boxShadow = correct
            ? "inset 0 3px 3px rgba(255,255,255,.9), 0 3px 0 #2f8450"
            : "inset 0 3px 3px rgba(255,255,255,.95), 0 3px 0 #8e9aa1";
          optionBox.style.color = "#111111";
          optionBox.style.fontSize = "14px";
          optionBox.style.fontWeight = "700";
          optionBox.style.lineHeight = "1.35";

          const letter = document.createElement("strong");
          letter.textContent = `${String.fromCharCode(65 + optionIndex)}.`;
          letter.style.flex = "0 0 auto";
          optionBox.appendChild(letter);

          const text = document.createElement("span");
          text.textContent = stripHtml(option.text) || "Variant matni mavjud emas";
          text.style.flex = "1";
          text.style.overflowWrap = "anywhere";
          optionBox.appendChild(text);

          if (correct) {
            const badge = document.createElement("strong");
            badge.textContent = "TO‘G‘RI JAVOB";
            badge.style.flex = "0 0 auto";
            badge.style.color = "#176b39";
            badge.style.fontSize = "11px";
            badge.style.whiteSpace = "nowrap";
            optionBox.appendChild(badge);
          }

          card.appendChild(optionBox);
        });

        renderRoot.appendChild(card);
        questionElements.push(card);
      }

      const footer = document.createElement("div");
      addBaseStyles(footer);
      footer.textContent = "qurbonovv.uz — Huquqiy ta’lim platformasi";
      footer.style.padding = "8px 0";
      footer.style.color = "#4b5961";
      footer.style.textAlign = "center";
      footer.style.fontSize = "12px";
      renderRoot.appendChild(footer);

      // Rasm, shakl va fontlar to‘liq tayyor bo‘lishini kutamiz.
      const allImages = Array.from(renderRoot.querySelectorAll("img"));
      await Promise.all(
        allImages.map(
          (image) =>
            new Promise<void>((resolve) => {
              if (image.complete) {
                resolve();
                return;
              }
              image.onload = () => resolve();
              image.onerror = () => resolve();
              window.setTimeout(resolve, 3500);
            })
        )
      );

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2;
      let currentY = margin;
      let pageHasContent = false;

      async function addElementToPdf(element: HTMLElement, gapAfter = 3) {
        const canvas = await html2canvas(element, {
          scale: 1.7,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false,
          imageTimeout: 4000,
          scrollX: 0,
          scrollY: 0,
          windowWidth: 720,
        });

        const renderWidthMm = usableWidth;
        const renderHeightMm = (canvas.height * renderWidthMm) / canvas.width;

        // Blok bitta sahifaga sig'masa, yangi sahifadan boshlaymiz.
        if (
          pageHasContent &&
          currentY + renderHeightMm > pageHeight - margin
        ) {
          pdf.addPage();
          currentY = margin;
          pageHasContent = false;
        }

        // Juda uzun blok (masalan, juda uzun savol) bo'lsa, vertikal bo'lib kesamiz.
        if (renderHeightMm > usableHeight) {
          const pxPerMm = canvas.width / renderWidthMm;
          const sliceHeightPx = Math.floor(usableHeight * pxPerMm);
          let sourceY = 0;

          while (sourceY < canvas.height) {
            if (pageHasContent) {
              pdf.addPage();
              currentY = margin;
              pageHasContent = false;
            }

            const currentSliceHeight = Math.min(
              sliceHeightPx,
              canvas.height - sourceY
            );

            const slice = document.createElement("canvas");
            slice.width = canvas.width;
            slice.height = currentSliceHeight;
            const ctx = slice.getContext("2d");
            if (!ctx) throw new Error("PDF canvas yaratilmadi.");
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, slice.width, slice.height);
            ctx.drawImage(
              canvas,
              0,
              sourceY,
              canvas.width,
              currentSliceHeight,
              0,
              0,
              canvas.width,
              currentSliceHeight
            );

            const sliceHeightMm =
              (currentSliceHeight * renderWidthMm) / canvas.width;
            pdf.addImage(
              slice.toDataURL("image/jpeg", 0.92),
              "JPEG",
              margin,
              currentY,
              renderWidthMm,
              sliceHeightMm,
              undefined,
              "FAST"
            );

            sourceY += currentSliceHeight;
            pageHasContent = true;

            if (sourceY < canvas.height) {
              pdf.addPage();
              currentY = margin;
              pageHasContent = false;
            } else {
              currentY += sliceHeightMm + gapAfter;
            }
          }
          return;
        }

        pdf.addImage(
          canvas.toDataURL("image/jpeg", 0.94),
          "JPEG",
          margin,
          currentY,
          renderWidthMm,
          renderHeightMm,
          undefined,
          "FAST"
        );
        currentY += renderHeightMm + gapAfter;
        pageHasContent = true;
      }

      await addElementToPdf(header, 4);
      for (const card of questionElements) {
        await addElementToPdf(card, 4);
      }
      await addElementToPdf(footer, 0);

      pdf.save(
        `${cleanFileName(fullTest.title)}_${
          includeAnswers ? "javoblari_bilan" : "javobsiz"
        }.pdf`
      );

      setExportTest(null);
      setExportFormat(null);
    } catch (error) {
      console.error("PDF EXPORT ERROR:", error);
      window.alert(
        "PDF faylini yaratishda xatolik yuz berdi. Sahifani yangilab qayta urinib ko‘ring."
      );
    } finally {
      if (renderRoot?.parentNode) {
        renderRoot.parentNode.removeChild(renderRoot);
      }

      setExporting(false);
      setWorkingId(null);
    }
  }

  /* =========================================================
     SANA
  ========================================================= */

  function formatDate(value?: string) {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString("uz-UZ");
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <main className="page">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="header">
        <div className="headerTitle">
          <span>ADMIN PANEL</span>

          <strong>Testlarni boshqarish</strong>
        </div>

        <div className="headerActions">
          <button
            type="button"
            className="grayButton"
            onClick={() => router.push("/admin/requests")}
          >
            <span className="buttonMain">Admin panel</span>
          </button>

          <button
            type="button"
            className="grayButton"
            onClick={() => router.push("/test")}
          >
            <span className="buttonMain">Testlarni ko‘rish</span>
          </button>

          <button
            type="button"
            className="resultsButton"
            onClick={() => router.push("/admin/results")}
          >
            <span className="buttonMain">Test natijalari</span>
          </button>

          <button
            type="button"
            className="blueButton"
            onClick={() => {
              setCreateCategory(
                selectedCategory
              );
              setCreateMenuOpen(true);
            }}
          >
            <span className="buttonMain">Yangi test yaratish</span>
          </button>
        </div>
      </header>

      {createMenuOpen && (
        <div
          className="createOverlay"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setCreateMenuOpen(false);
            }
          }}
        >
          <div
            className="createModal createModalWide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="createTestTitle"
          >
            <button
              type="button"
              className="createClose"
              onClick={() =>
                setCreateMenuOpen(false)
              }
              aria-label="Yopish"
            >
              ×
            </button>

            <div className="createModalBadge">
              TEST YARATISH
            </div>

            <h2 id="createTestTitle">
              Avval test turini tanlang
            </h2>

            <p className="createModalText">
              Test saqlanganda tanlangan bo‘limga tushadi.
              Shu sabab testlar bir-biriga aralashmaydi.
            </p>

            <div className="createCategoryGrid">
              {TEST_CATEGORIES.map((category) => (
                <button
                  type="button"
                  key={category.key}
                  className={
                    createCategory === category.key
                      ? "createCategoryCard activeCreateCategory"
                      : "createCategoryCard"
                  }
                  onClick={() =>
                    setCreateCategory(category.key)
                  }
                >
                  <span className="categoryMiniIcon">
                    {category.icon}
                  </span>

                  <strong>
                    {category.title}
                  </strong>

                  <small>
                    {category.description}
                  </small>
                </button>
              ))}
            </div>

            {createCategory === "custom" && (
              <div className="customTypeBox">
                <label htmlFor="customTestTypeName">
                  Test turining nomi
                </label>

                <input
                  id="customTestTypeName"
                  value={customCreateName}
                  onChange={(event) =>
                    setCustomCreateName(
                      event.target.value
                    )
                  }
                  placeholder="Masalan: Final nazorat testi"
                />
              </div>
            )}

            <div className="createMethodTitle">
              Endi yaratish usulini tanlang
            </div>

            <div className="createChoiceGrid">
              <button
                type="button"
                className="createChoice createChoiceManual"
                onClick={() => {
                  if (
                    createCategory === "custom" &&
                    !customCreateName.trim()
                  ) {
                    window.alert(
                      "Boshqa test uchun test turining nomini kiriting."
                    );
                    return;
                  }

                  const params =
                    new URLSearchParams({
                      testType:
                        createCategory,
                    });

                  if (
                    createCategory ===
                    "custom"
                  ) {
                    params.set(
                      "customTestTypeName",
                      customCreateName.trim()
                    );
                  }

                  setCreateMenuOpen(false);

                  if (
                    createCategory ===
                    "national-certificate"
                  ) {
                    router.push(
                      "/admin/tests/national-certificate/new"
                    );
                    return;
                  }

                  router.push(
                    `/test/editor?${params.toString()}`
                  );
                }}
              >
                <span className="createChoiceIcon">
                  ✎
                </span>

                <strong>
                  Oddiy test yaratish
                </strong>

                <small>
                  Savol va variantlarni qo‘lda kiritish
                </small>
              </button>

              <button
                type="button"
                className="createChoice createChoicePdf"
                onClick={() => {
                  if (
                    createCategory === "custom" &&
                    !customCreateName.trim()
                  ) {
                    window.alert(
                      "Boshqa test uchun test turining nomini kiriting."
                    );
                    return;
                  }

                  const params =
                    new URLSearchParams({
                      testType:
                        createCategory,
                    });

                  if (
                    createCategory ===
                    "custom"
                  ) {
                    params.set(
                      "customTestTypeName",
                      customCreateName.trim()
                    );
                  }

                  setCreateMenuOpen(false);

                  if (
                    createCategory ===
                    "national-certificate"
                  ) {
                    router.push(
                      "/admin/tests/national-certificate/import-pdf"
                    );
                    return;
                  }

                  router.push(
                    `/test/import-pdf?${params.toString()}`
                  );
                }}
              >
                <span className="createChoiceIcon">
                  PDF
                </span>

                <strong>
                  PDF dan test yaratish
                </strong>

                <small>
                  PDFdan savol va A/B/C/D variantlarni ajratish
                </small>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          STATISTIKA
      ===================================================== */}

      <section className="mainBox">
        <div className="floatingTitle">
          Testlar
        </div>

        <div className="categorySection">
          <div className="categorySectionHeader">
            <div>
              <strong>
                Test turlari
              </strong>

              <span>
                Kerakli bo‘limni tanlang
              </span>
            </div>

            <div className="selectedCategoryName">
              {
                TEST_CATEGORIES.find(
                  (item) =>
                    item.key ===
                    selectedCategory
                )?.title
              }
            </div>
          </div>

          <div className="categoryGrid">
            {TEST_CATEGORIES.map((category) => {
              const active =
                selectedCategory ===
                category.key;

              return (
                <button
                  key={category.key}
                  type="button"
                  className={
                    active
                      ? "categoryCard activeCategoryCard"
                      : "categoryCard"
                  }
                  onClick={() => {
                    if (
                      category.key ===
                      "national-certificate"
                    ) {
                      router.push(
                        "/admin/tests/national-certificate"
                      );
                      return;
                    }

                    setSelectedCategory(
                      category.key
                    );
                    setStatusFilter(
                      "all"
                    );
                    setSearch("");
                  }}
                >
                  <span className="categoryIcon">
                    {category.icon}
                  </span>

                  <span className="categoryCardContent">
                    <strong>
                      {category.title}
                    </strong>
                  </span>

                  <span className="categoryCount">
                    {
                      categoryCounts[
                        category.key
                      ]
                    }
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="statistics">
          <button
            type="button"
            className={
              statusFilter === "all"
                ? "statCard activeStat"
                : "statCard"
            }
            onClick={() => setStatusFilter("all")}
          >
            <strong>{statistics.total}</strong>
            <span>Jami test</span>
          </button>

          <button
            type="button"
            className={
              statusFilter === "draft"
                ? "statCard activeStat"
                : "statCard"
            }
            onClick={() => setStatusFilter("draft")}
          >
            <strong>{statistics.draft}</strong>
            <span>Qoralama</span>
          </button>

          <button
            type="button"
            className={
              statusFilter === "published"
                ? "statCard activeStat"
                : "statCard"
            }
            onClick={() => setStatusFilter("published")}
          >
            <strong>{statistics.published}</strong>
            <span>E’lon qilingan</span>
          </button>
        </div>

        {/* ===================================================
            QIDIRUV
        =================================================== */}

        <div className="searchArea">
          <div className="searchInputBox">
            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Test nomi yoki fan bo‘yicha qidirish..."
            />

            {search && (
              <button
                type="button"
                className="clearSearch"
                onClick={() => setSearch("")}
                title="Tozalash"
              >
                ×
              </button>
            )}
          </div>

          {selectedCategory === "thematic" && (
            <button
              type="button"
              className="thematicPublishButton"
              onClick={publishVisibleDrafts}
              disabled={
                loading ||
                bulkPublishing ||
                filteredTests.every(
                  (test) =>
                    test.status !== "draft"
                )
              }
              title="Hozir ko‘rinib turgan qoralama testlarni bir yo‘la e’lon qilish"
            >
              {bulkPublishing
                ? "E’lon qilinmoqda..."
                : "Barchasini e’lon qilish"}
            </button>
          )}

          {selectedCategory === "thematic" && (
            <button
              type="button"
              className="thematicDeleteButton"
              onClick={deleteVisibleDrafts}
              disabled={
                loading ||
                bulkPublishing ||
                bulkDeleting ||
                filteredTests.every(
                  (test) => test.status !== "draft"
                )
              }
              title="Hozir ko‘rinib turgan qoralama testlarni bir yo‘la o‘chirish"
            >
              {bulkDeleting
                ? "O‘chirilmoqda..."
                : "Qoralamalarni o‘chirish"}
            </button>
          )}

          <button
            type="button"
            className="refreshButton"
            onClick={loadTests}
            disabled={loading || bulkPublishing || bulkDeleting}
          >
            ↻ Yangilash
          </button>
        </div>

        {/* ===================================================
            ERROR
        =================================================== */}

        {error && (
          <div className="errorBox">
            {error}
          </div>
        )}

        {/* ===================================================
            TESTLAR
        =================================================== */}

        <div className="contentBox">
          {loading ? (
            <div className="emptyBox">
              <div className="loader" />

              <strong>
                Testlar yuklanmoqda...
              </strong>
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="emptyBox">
              <div className="emptyIcon">
                ?
              </div>

              <h2>Test topilmadi</h2>

              <p>
                Hozircha ushbu bo‘limda test mavjud emas.
              </p>

              <button
                type="button"
                className="blueButton createFirstButton"
                onClick={() => {
                  setCreateCategory(
                    selectedCategory
                  );
                  setCreateMenuOpen(true);
                }}
              >
                + Birinchi testni yaratish
              </button>
            </div>
          ) : (
            <div className="testList">
              {filteredTests.map((test) => {
                const questionCount = Array.isArray(
                  test.questions
                )
                  ? test.questions.length
                  : 0;

                const busy = workingId === test.id;

                return (
                  <article
                    className="testCard"
                    key={test.id}
                  >
                    <div className="testTypeBadge">
                      {testTypeLabel(test)}
                    </div>

                    {/* STATUS */}

                    <div
                      className={
                        test.status === "published"
                          ? "statusBadge publishedBadge"
                          : "statusBadge draftBadge"
                      }
                    >
                      {test.status === "published"
                        ? "✓ E’LON QILINGAN"
                        : "● QORALAMA"}
                    </div>

                    {/* TITLE */}

                    <div className="testHeader">
                      <div className="testTitleArea">
                        <h2>
                          {test.title ||
                            "Nomsiz test"}
                        </h2>

                        <p>
                          {test.subject ||
                            "Fan ko‘rsatilmagan"}
                        </p>
                      </div>
                    </div>

                    {/* DESCRIPTION */}

                    {test.description && (
                      <div className="description">
                        {test.description}
                      </div>
                    )}

                    {/* INFO */}

                    <div className="testInformation">
                      <div className="infoItem">
                        <span>Savollar</span>

                        <strong>
                          {questionCount}
                        </strong>
                      </div>

                      <div className="infoItem">
                        <span>Vaqt</span>

                        <strong>
                          {Number(test.duration) || 0}
                          <small> daqiqa</small>
                        </strong>
                      </div>

                      <div className="infoItem">
                        <span>Holati</span>

                        <strong>
                          {test.status === "published"
                            ? "E’lon qilingan"
                            : "Qoralama"}
                        </strong>
                      </div>

                      <div className="infoItem">
                        <span>Oxirgi o‘zgarish</span>

                        <strong className="dateText">
                          {formatDate(test.updatedAt)}
                        </strong>
                      </div>
                    </div>

                    {/* ACTIONS */}

                    <div className="actions">
                      <button
                        type="button"
                        className="editButton"
                        disabled={busy}
                        onClick={() =>
                          router.push(
                            `/test/editor?id=${encodeURIComponent(
                              test.id
                            )}`
                          )
                        }
                      >
                        <span className="actionMain">Tahrirlash</span>
                      </button>

                      {test.status === "draft" ? (
                        <button
                          type="button"
                          className="publishButton"
                          disabled={busy}
                          onClick={() =>
                            changeStatus(
                              test.id,
                              "published"
                            )
                          }
                        >
                          {busy
                            ? "Kutilmoqda..."
                            : "✓ E’lon qilish"}
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="viewButton"
                            disabled={busy}
                            onClick={() =>
                              router.push(
                                `/test/${encodeURIComponent(
                                  test.id
                                )}`
                              )
                            }
                          >
                            <span className="actionMain">Testni ko‘rish</span>
                          </button>

                          <button
                            type="button"
                            className="draftButton"
                            disabled={busy}
                            onClick={() =>
                              changeStatus(
                                test.id,
                                "draft"
                              )
                            }
                          >
                            <span className="actionMain">Qoralamaga qaytarish</span>
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        className="saveButton"
                        disabled={busy}
                        onClick={() => setExportTest(test)}
                      >
                        <span className="actionMain">Kompyuterga saqlash</span>
                      </button>

                      <button
                        type="button"
                        className="deleteButton"
                        disabled={busy}
                        onClick={() =>
                          deleteTest(test)
                        }
                      >
                        <span className="actionMain">O‘chirish</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {exportTest && (
        <div
          className="exportOverlay"
          onClick={() => {
            if (!exporting) {
              setExportTest(null);
              setExportFormat(null);
            }
          }}
        >
          <div
            className="exportModal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="exportTitle">
              <span>Kompyuterga saqlash</span>
              <strong>{exportTest.title || "Test"}</strong>
            </div>

            {!exportFormat ? (
              <>
                <p>Avval fayl formatini tanlang.</p>
                <div className="exportChoices">
                  <button
                    type="button"
                    className="pdfChoice"
                    disabled={exporting}
                    onClick={() => setExportFormat("pdf")}
                  >
                    <span className="choiceMain">PDF</span>
                    <span className="choiceSub">Chop etish yoki PDF sifatida saqlash</span>
                  </button>

                  <button
                    type="button"
                    className="wordChoice"
                    disabled={exporting}
                    onClick={() => setExportFormat("word")}
                  >
                    <span className="choiceMain">Word</span>
                    <span className="choiceSub">Tahrirlash mumkin bo‘lgan .doc fayl</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <p>
                  <strong>{exportFormat === "pdf" ? "PDF" : "Word"}</strong> qanday saqlansin?
                </p>
                <div className="answerChoices">
                  <button
                    type="button"
                    className="withAnswersChoice"
                    disabled={exporting}
                    onClick={() =>
                      exportFormat === "pdf"
                        ? exportAsPdf(exportTest, true)
                        : exportAsWord(exportTest, true)
                    }
                  >
                    <span className="choiceMain">Javoblari bilan</span>
                    <span className="choiceSub">To‘g‘ri javoblar yashil rangda belgilanadi</span>
                  </button>

                  <button
                    type="button"
                    className="withoutAnswersChoice"
                    disabled={exporting}
                    onClick={() =>
                      exportFormat === "pdf"
                        ? exportAsPdf(exportTest, false)
                        : exportAsWord(exportTest, false)
                    }
                  >
                    <span className="choiceMain">Javoblarsiz</span>
                    <span className="choiceSub">Talabalarga tarqatish uchun toza test</span>
                  </button>
                </div>

                <button
                  type="button"
                  className="backExport"
                  disabled={exporting}
                  onClick={() => setExportFormat(null)}
                >
                  ← Formatni qayta tanlash
                </button>
              </>
            )}

            <button
              type="button"
              className="cancelExport"
              disabled={exporting}
              onClick={() => {
                setExportTest(null);
                setExportFormat(null);
              }}
            >
              {exporting ? "Tayyorlanmoqda..." : "Bekor qilish"}
            </button>
          </div>
        </div>
      )}

      {/* =====================================================
          YANGI TEST TUGMASI
      ===================================================== */}

      <div className="bottomCreate">
        <button
          type="button"
          onClick={() =>
            router.push("/test/editor")
          }
        >
          <span>+</span>

          YANGI TEST YARATISH
        </button>
      </div>

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
            20px 20px 100px;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #f4f6f7 55%,
              #e9eef1 100%
            );

          color: #111;

          font-family:
            Georgia,
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
          cursor: wait;
        }

        /* ================================================
           HEADER
        ================================================ */

        .header {
          width: min(1500px, 96%);

          min-height: 120px;

          margin: 0 auto;

          padding: 22px 28px;

          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 25px;

          border:
            3px solid #303538;

          border-radius: 25px;

          background:
            linear-gradient(
              145deg,
              #696d70,
              #4f5457 50%,
              #373b3e
            );

          box-shadow:
            inset 0 7px 6px
              rgba(255, 255, 255, 0.25),
            inset 0 -7px 8px
              rgba(0, 0, 0, 0.3),
            0 7px 0 #272b2e,
            0 14px 24px
              rgba(0, 0, 0, 0.23);
        }

        .headerTitle {
          min-width: 310px;

          padding: 14px 30px;

          display: flex;

          flex-direction: column;

          align-items: center;

          justify-content: center;

          border:
            3px solid #174461;

          border-radius: 16px;

          background:
            linear-gradient(
              #a8e5ff,
              #58a8d7
            );

          box-shadow:
            inset 0 6px 5px
              rgba(255, 255, 255, 0.75),
            0 5px 0 #17415c;

          color: #073b68;

          text-align: center;
        }

        .headerTitle span {
          margin-bottom: 3px;

          font-size: 13px;

          letter-spacing: 2px;
        }

        .headerTitle strong {
          font-size: 27px;
        }

        .headerActions {
          display: flex;

          align-items: center;

          justify-content: flex-end;

          gap: 12px;

          flex-wrap: wrap;
        }

        .headerActions button {
          min-height: 52px;

          padding: 0 20px;

          border-radius: 10px;

          font-weight: 700;

          font-size: 15px;
        }

        .grayButton {
          border:
            2px solid #555;

          background:
            linear-gradient(
              #ffffff,
              #bcbcbc
            );

          box-shadow:
            0 4px 0 #444;
        }

        .resultsButton {
          color: #125a32;

          border:
            2px solid #267446;

          background:
            linear-gradient(
              #c4f2d2,
              #68c988
            );

          box-shadow:
            0 4px 0 #266c42;

          font-weight: 700;
        }

        .resultsButton:hover {
          filter: brightness(1.05);
        }

        .blueButton {
          color: #073b68;

          border:
            2px solid #174461;

          background:
            linear-gradient(
              #b6ebff,
              #58a8d7
            );

          box-shadow:
            0 4px 0 #17415c;

          font-weight: 700;
        }


        /* ================================================
           YANGI TEST TANLOVI
        ================================================ */

        .createOverlay {
          position: fixed;
          inset: 0;
          z-index: 9999;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 24px;

          background:
            rgba(18, 25, 29, 0.58);

          backdrop-filter:
            blur(5px);
        }

        .createModal {
          position: relative;

          width:
            min(720px, 96vw);

          padding:
            54px 34px 34px;

          border:
            3px solid #303538;

          border-radius:
            24px;

          background:
            linear-gradient(
              145deg,
              #74797c,
              #555b5e 52%,
              #3a3f42
            );

          box-shadow:
            inset 0 7px 6px
              rgba(255,255,255,.25),
            inset 0 -8px 10px
              rgba(0,0,0,.32),
            0 9px 0 #252a2d,
            0 24px 44px
              rgba(0,0,0,.34);

          text-align:
            center;
        }

        .createModalBadge {
          position:
            absolute;

          top:
            -25px;

          left:
            50%;

          transform:
            translateX(-50%);

          min-width:
            220px;

          padding:
            11px 24px;

          border:
            2px solid #174461;

          border-radius:
            12px;

          color:
            #073b68;

          background:
            linear-gradient(
              #c8f1ff,
              #66b8e4
            );

          box-shadow:
            inset 0 5px 5px
              rgba(255,255,255,.75),
            0 5px 0 #17415c;

          font-weight:
            800;

          letter-spacing:
            1.2px;
        }

        .createClose {
          position:
            absolute;

          top:
            14px;

          right:
            16px;

          width:
            40px;

          height:
            40px;

          display:
            grid;

          place-items:
            center;

          border:
            2px solid #8c1f1f;

          border-radius:
            50%;

          color:
            white;

          background:
            linear-gradient(
              #ff7777,
              #dc3030
            );

          box-shadow:
            0 4px 0 #8e2020;

          font-size:
            25px;

          font-weight:
            900;

          line-height:
            1;
        }

        .createModal h2 {
          margin:
            5px 0 8px;

          color:
            white;

          font-size:
            28px;

          text-shadow:
            0 2px 2px
              rgba(0,0,0,.45);
        }

        .createModalText {
          max-width:
            580px;

          margin:
            0 auto 26px;

          color:
            #f2f7f9;

          font-size:
            16px;

          line-height:
            1.5;
        }

        .createChoiceGrid {
          display:
            grid;

          grid-template-columns:
            repeat(2, minmax(0,1fr));

          gap:
            20px;
        }

        .createChoice {
          min-height:
            190px;

          padding:
            24px 20px;

          display:
            flex;

          flex-direction:
            column;

          align-items:
            center;

          justify-content:
            center;

          gap:
            10px;

          border-radius:
            18px;

          transition:
            transform .12s ease,
            filter .12s ease,
            box-shadow .12s ease;

          font-family:
            inherit;
        }

        .createChoice:hover {
          transform:
            translateY(-3px);

          filter:
            brightness(1.04);
        }

        .createChoice:active {
          transform:
            translateY(4px);
        }

        .createChoice strong {
          font-size:
            21px;
        }

        .createChoice small {
          max-width:
            250px;

          font-size:
            14px;

          line-height:
            1.35;
        }

        .createChoiceIcon {
          min-width:
            62px;

          min-height:
            52px;

          display:
            grid;

          place-items:
            center;

          padding:
            8px 12px;

          border-radius:
            10px;

          font-size:
            22px;

          font-weight:
            900;

          box-shadow:
            inset 0 3px 3px
              rgba(255,255,255,.65),
            0 3px 0
              rgba(0,0,0,.28);
        }

        .createChoiceManual {
          color:
            #263238;

          border:
            2px solid #656d72;

          background:
            linear-gradient(
              #ffffff,
              #c7cbce
            );

          box-shadow:
            inset 0 5px 5px
              rgba(255,255,255,.8),
            0 6px 0 #555d61;
        }

        .createChoiceManual .createChoiceIcon {
          border:
            2px solid #60686c;

          background:
            linear-gradient(
              #ffffff,
              #d8dbdd
            );
        }

        .createChoicePdf {
          color:
            #073b68;

          border:
            2px solid #174461;

          background:
            linear-gradient(
              #c9f2ff,
              #67b7e1
            );

          box-shadow:
            inset 0 5px 5px
              rgba(255,255,255,.8),
            0 6px 0 #17415c;
        }

        .createChoicePdf .createChoiceIcon {
          color:
            white;

          border:
            2px solid #8b2424;

          background:
            linear-gradient(
              #ef6969,
              #bf2f2f
            );
        }


        /* ================================================
           TEST KATEGORIYALARI
        ================================================ */

        .categorySection {
          margin:
            0 0 32px;

          padding:
            20px;

          border:
            2px solid #4c565c;

          border-radius:
            19px;

          background:
            linear-gradient(
              180deg,
              #eef2f4 0%,
              #cdd3d7 100%
            );

          box-shadow:
            inset 0 4px 4px
              rgba(255,255,255,.95),
            0 5px 0 #4d565b,
            0 10px 18px
              rgba(0,0,0,.14);
        }

        .categorySectionHeader {
          display:
            flex;

          align-items:
            center;

          justify-content:
            space-between;

          gap:
            18px;

          margin-bottom:
            17px;

          padding:
            0 4px;
        }

        .categorySectionHeader > div:first-child {
          display:
            flex;

          flex-direction:
            column;

          gap:
            3px;
        }

        .categorySectionHeader strong {
          color:
            #073b68;

          font-size:
            21px;
        }

        .categorySectionHeader span {
          color:
            #526068;

          font-size:
            13px;
        }

        .selectedCategoryName {
          padding:
            8px 14px;

          border:
            1px solid #6f7b81;

          border-radius:
            9px;

          color:
            #073b68;

          background:
            rgba(255,255,255,.68);

          box-shadow:
            inset 0 2px 2px
              rgba(255,255,255,.9);

          font-weight:
            800;
        }

        .categoryGrid {
          display:
            grid;

          grid-template-columns:
            repeat(3, minmax(0,1fr));

          gap:
            16px;
        }

        .categoryCard {
          position:
            relative;

          min-height:
            132px;

          padding:
            18px 58px 18px 17px;

          display:
            flex;

          align-items:
            center;

          gap:
            14px;

          text-align:
            left;

          border:
            2px solid #70797e;

          border-radius:
            15px;

          color:
            #253039;

          background:
            linear-gradient(
              180deg,
              #ffffff 0%,
              #d6dadd 100%
            );

          box-shadow:
            inset 0 4px 4px
              rgba(255,255,255,.9),
            0 5px 0 #596267,
            0 9px 15px
              rgba(0,0,0,.12);

          transition:
            transform .12s ease,
            filter .12s ease,
            box-shadow .12s ease;
        }

        .categoryCard:hover {
          transform:
            translateY(-2px);

          filter:
            brightness(1.03);
        }

        .categoryCard:active {
          transform:
            translateY(3px);

          box-shadow:
            0 2px 0 #596267;
        }

        .activeCategoryCard {
          color:
            #073b68;

          border-color:
            #16567a;

          background:
            linear-gradient(
              180deg,
              #d7f5ff 0%,
              #85cdec 100%
            );

          box-shadow:
            inset 0 4px 4px
              rgba(255,255,255,.85),
            0 6px 0 #174760,
            0 11px 18px
              rgba(0,0,0,.15);
        }

        .categoryIcon {
          flex:
            0 0 48px;

          width:
            48px;

          height:
            48px;

          display:
            grid;

          place-items:
            center;

          border:
            2px solid #49616f;

          border-radius:
            12px;

          color:
            #073b68;

          background:
            linear-gradient(
              #e8faff,
              #8bcfeb
            );

          box-shadow:
            inset 0 3px 3px
              rgba(255,255,255,.8),
            0 3px 0 #405867;

          font-size:
            17px;

          font-weight:
            900;
        }

        .categoryCardContent {
          display:
            flex;

          flex:
            1;

          flex-direction:
            column;

          justify-content:
            center;

          gap:
            0;
        }

        .categoryCardContent strong {
          font-size:
            16px;

          line-height:
            1.15;
        }

        .categoryCount {
          position:
            absolute;

          top:
            12px;

          right:
            12px;

          min-width:
            34px;

          height:
            34px;

          padding:
            0 8px;

          display:
            grid;

          place-items:
            center;

          border:
            2px solid #174461;

          border-radius:
            999px;

          color:
            #073b68;

          background:
            linear-gradient(
              #e5f9ff,
              #8fcfeb
            );

          box-shadow:
            0 3px 0 #17415c;

          font-weight:
            900;
        }

        .testTypeBadge {
          display:
            inline-flex;

          width:
            fit-content;

          margin:
            0 0 12px;

          padding:
            6px 11px;

          border:
            1px solid #477289;

          border-radius:
            999px;

          color:
            #073b68;

          background:
            linear-gradient(
              #effbff,
              #b9e6f7
            );

          font-size:
            12px;

          font-weight:
            900;
        }

        /* CREATE MODAL — KATEGORIYA */

        .createModalWide {
          width:
            min(940px, 96vw);
        }

        .createCategoryGrid {
          display:
            grid;

          grid-template-columns:
            repeat(3, minmax(0,1fr));

          gap:
            12px;

          margin:
            20px 0;
        }

        .createCategoryCard {
          min-height:
            116px;

          padding:
            14px;

          display:
            flex;

          flex-direction:
            column;

          align-items:
            center;

          justify-content:
            center;

          gap:
            7px;

          border:
            2px solid #69747a;

          border-radius:
            13px;

          color:
            #273239;

          background:
            linear-gradient(
              #ffffff,
              #d5dadd
            );

          box-shadow:
            inset 0 3px 3px
              rgba(255,255,255,.9),
            0 4px 0 #555f64;

          font-family:
            inherit;
        }

        .activeCreateCategory {
          color:
            #073b68;

          border-color:
            #174461;

          background:
            linear-gradient(
              #ddf7ff,
              #79c6e9
            );

          box-shadow:
            inset 0 3px 3px
              rgba(255,255,255,.9),
            0 5px 0 #17415c;
        }

        .createCategoryCard strong {
          font-size:
            14px;
        }

        .createCategoryCard small {
          color:
            #52616a;

          font-size:
            11px;

          line-height:
            1.25;
        }

        .categoryMiniIcon {
          min-width:
            38px;

          min-height:
            34px;

          padding:
            4px 8px;

          display:
            grid;

          place-items:
            center;

          border:
            1px solid #486476;

          border-radius:
            8px;

          color:
            #073b68;

          background:
            #eefaff;

          font-weight:
            900;
        }

        .customTypeBox {
          margin:
            14px 0 20px;

          padding:
            14px;

          display:
            grid;

          grid-template-columns:
            180px 1fr;

          align-items:
            center;

          gap:
            12px;

          border:
            2px solid #65727a;

          border-radius:
            12px;

          background:
            rgba(255,255,255,.86);

          box-shadow:
            inset 0 3px 3px
              rgba(0,0,0,.06);
        }

        .customTypeBox label {
          color:
            #073b68;

          font-weight:
            900;
        }

        .customTypeBox input {
          min-height:
            44px;

          padding:
            8px 12px;

          border:
            2px solid #7e8a91;

          border-radius:
            9px;

          font-family:
            inherit;

          font-size:
            15px;

          outline:
            none;
        }

        .customTypeBox input:focus {
          border-color:
            #168dc5;

          box-shadow:
            0 0 0 3px
              rgba(22,141,197,.14);
        }

        .createMethodTitle {
          margin:
            18px 0 12px;

          color:
            white;

          font-size:
            18px;

          font-weight:
            900;

          text-shadow:
            0 2px 2px
              rgba(0,0,0,.42);
        }

        /* ================================================
           MAIN
        ================================================ */

        .mainBox {
          position: relative;

          width: min(1500px, 96%);

          margin:
            95px auto 60px;

          padding:
            85px 35px 40px;

          border:
            3px solid #303538;

          border-radius: 27px;

          background:
            linear-gradient(
              145deg,
              #686c6f,
              #505457 45%,
              #363a3d
            );

          box-shadow:
            inset 0 7px 6px
              rgba(255, 255, 255, 0.23),
            inset 0 -8px 8px
              rgba(0, 0, 0, 0.32),
            0 7px 0 #272b2e,
            0 15px 24px
              rgba(0, 0, 0, 0.25);
        }

        .floatingTitle {
          position: absolute;

          top: -35px;

          left: 50%;

          transform:
            translateX(-50%);

          min-width: 330px;

          min-height: 70px;

          padding:
            10px 30px;

          display: flex;

          align-items: center;

          justify-content: center;

          color: #073b68;

          text-align: center;

          border:
            3px solid #174461;

          border-radius: 16px;

          background:
            linear-gradient(
              #a7e2ff,
              #58a8d7
            );

          box-shadow:
            inset 0 6px 5px
              rgba(255, 255, 255, 0.7),
            0 5px 0 #17415c;

          font-size: 28px;

          font-weight: 700;

          z-index: 10;
        }

        /* ================================================
           STATISTICS
        ================================================ */

        .statistics {
          display: grid;

          grid-template-columns:
            repeat(3, minmax(0, 1fr));

          gap: 20px;

          margin-bottom: 28px;
        }

        .statCard {
          min-height: 105px;

          padding: 15px;

          border:
            3px solid #666;

          border-radius: 14px;

          background:
            linear-gradient(
              #ffffff,
              #cccccc
            );

          box-shadow:
            inset 0 5px 5px white,
            0 5px 0 #555d61;

          text-align: center;
        }

        .statCard strong {
          display: block;

          margin-bottom: 5px;

          color: #07517e;

          font-size: 34px;
        }

        .statCard span {
          font-size: 17px;

          font-weight: 700;
        }

        .activeStat {
          border-color: #1688bf;

          background:
            linear-gradient(
              #d9f3ff,
              #88cbe9
            );
        }

        /* ================================================
           SEARCH
        ================================================ */

        .searchArea {
          margin-bottom: 30px;

          padding: 22px;

          display: flex;

          gap: 15px;

          border:
            2px solid #555;

          border-radius: 15px;

          background:
            linear-gradient(
              #eeeeee,
              #c4c4c4
            );

          box-shadow:
            inset 0 5px 5px white,
            0 5px 0 #555d61;
        }

        .searchInputBox {
          position: relative;

          flex: 1;
        }

        .searchInputBox input {
          width: 100%;

          height: 58px;

          padding:
            0 55px 0 18px;

          border:
            2px solid #168fc9;

          border-radius: 10px;

          outline: none;

          background: white;

          direction: ltr;

          text-align: left;

          font-size: 18px;
        }

        .clearSearch {
          position: absolute;

          top: 50%;

          right: 12px;

          width: 35px;

          height: 35px;

          transform:
            translateY(-50%);

          border: none;

          background: transparent;

          color: #b11919;

          font-size: 27px;

          font-weight: 700;
        }

        .refreshButton {
          min-width: 140px;

          border:
            2px solid #555;

          border-radius: 9px;

          background:
            linear-gradient(
              #ffffff,
              #bbbbbb
            );

          font-weight: 700;
        }

        /* ================================================
           CONTENT
        ================================================ */

        .contentBox {
          min-height: 250px;

          padding: 28px;

          border:
            2px solid #555;

          border-radius: 18px;

          background:
            linear-gradient(
              #f5f5f5,
              #c9c9c9
            );

          box-shadow:
            inset 0 6px 5px white,
            0 6px 0 #555d61;
        }

        .errorBox {
          margin-bottom: 25px;

          padding: 18px;

          color: #8c1111;

          text-align: center;

          border:
            2px solid #c72c2c;

          border-radius: 10px;

          background: #ffd5d5;

          font-weight: 700;
        }

        .emptyBox {
          min-height: 300px;

          display: flex;

          flex-direction: column;

          align-items: center;

          justify-content: center;

          text-align: center;
        }

        .emptyIcon {
          width: 70px;

          height: 70px;

          margin-bottom: 15px;

          display: flex;

          align-items: center;

          justify-content: center;

          border:
            3px solid #168fc9;

          border-radius: 50%;

          color: #07517e;

          font-size: 35px;

          font-weight: 700;
        }

        .emptyBox h2 {
          margin:
            5px 0;
        }

        .emptyBox p {
          color: #555;
        }

        .createFirstButton {
          min-height: 52px;

          margin-top: 15px;

          padding: 0 25px;

          border-radius: 9px;
        }

        .loader {
          width: 45px;

          height: 45px;

          margin-bottom: 20px;

          border:
            5px solid #ccc;

          border-top-color:
            #168fc9;

          border-radius: 50%;

          animation:
            spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform:
              rotate(360deg);
          }
        }

        /* ================================================
           TEST LIST
        ================================================ */

        .testList {
          display: grid;

          gap: 25px;
        }

        .testCard {
          position: relative;

          padding:
            35px 28px 28px;

          overflow: hidden;

          border:
            2px solid #60676b;

          border-radius: 17px;

          background:
            linear-gradient(
              #ffffff,
              #dedede 65%,
              #c4c4c4
            );

          box-shadow:
            inset 0 5px 5px white,
            0 6px 0 #555d61,
            0 12px 18px
              rgba(0, 0, 0, 0.2);
        }

        .statusBadge {
          position: absolute;

          top: 15px;

          right: 15px;

          padding:
            8px 13px;

          border-radius: 8px;

          font-size: 12px;

          font-weight: 700;

          letter-spacing: 0.4px;
        }

        .draftBadge {
          color: #704e00;

          border:
            1px solid #b9870d;

          background: #ffe7a3;
        }

        .publishedBadge {
          color: #126033;

          border:
            1px solid #3a9660;

          background: #ccefd8;
        }

        .testHeader {
          padding-right: 170px;
        }

        .testTitleArea h2 {
          margin:
            0 0 8px;

          color: #111;

          font-size: 30px;
          font-weight: 800;
          letter-spacing: .1px;
        }

        .testTitleArea p {
          margin: 0;

          color: #07517e;

          font-size: 20px;

          font-weight: 800;
        }

        .description {
          margin-top: 20px;

          padding: 16px;
          color: #1c252b;
          font-size: 16px;
          font-weight: 600;

          border:
            1px solid #aaa;

          border-radius: 8px;

          background:
            rgba(255, 255, 255, 0.55);

          line-height: 1.5;
        }

        /* ================================================
           INFORMATION
        ================================================ */

        .testInformation {
          margin:
            25px 0;

          display: grid;

          grid-template-columns:
            repeat(4, minmax(0, 1fr));

          gap: 14px;
        }

        .infoItem {
          min-height: 90px;

          padding: 15px;

          display: flex;

          flex-direction: column;

          align-items: center;

          justify-content: center;

          border:
            1px solid #999;

          border-radius: 10px;

          background:
            rgba(255, 255, 255, 0.65);

          text-align: center;
        }

        .infoItem span {
          margin-bottom: 7px;

          color: #26343c;

          font-size: 15px;
          font-weight: 700;
        }

        .infoItem strong {
          color: #07517e;

          font-size: 23px;
          font-weight: 800;
        }

        .infoItem small {
          font-size: 13px;
        }

        .dateText {
          font-size: 15px !important;
          line-height: 1.3;
        }

        /* ================================================
           ACTIONS
        ================================================ */

        .actions {
          display: flex;

          align-items: stretch;

          gap: 11px;

          flex-wrap: wrap;
        }

        .actions button {
          min-height: 50px;

          padding:
            0 18px;

          border-radius: 9px;

          font-weight: 700;
        }

        .editButton {
          color: #674700;

          border:
            2px solid #956b00;

          background:
            linear-gradient(
              #ffe69d,
              #daa329
            );

          box-shadow:
            0 4px 0 #8a6300;
        }

        .publishButton {
          color: #0e552c;

          border:
            2px solid #277b49;

          background:
            linear-gradient(
              #b9efca,
              #5bc37d
            );

          box-shadow:
            0 4px 0 #277144;
        }

        .viewButton {
          color: #073b68;

          border:
            2px solid #174461;

          background:
            linear-gradient(
              #b5eaff,
              #59a9d8
            );

          box-shadow:
            0 4px 0 #17415c;
        }

        .draftButton {
          color: #624900;

          border:
            2px solid #8d710e;

          background:
            linear-gradient(
              #fff2b9,
              #d7b850
            );

          box-shadow:
            0 4px 0 #806811;
        }

        .saveButton {
          color: #125c32;

          border:
            2px solid #267446;

          background:
            linear-gradient(
              #c4f2d2,
              #68c988
            );

          box-shadow:
            0 4px 0 #266c42;
        }

        .thematicPublishButton,
        .thematicDeleteButton {
          min-height: 54px;
          min-width: 176px;

          padding: 10px 18px;

          border-radius: 11px;

          color: #111111 !important;

          font-family:
            "Times New Roman",
            Georgia,
            serif;

          font-size: 16px;
          font-weight: 800;

          cursor: pointer;

          transition:
            transform 0.12s ease,
            box-shadow 0.12s ease,
            filter 0.12s ease;

          text-shadow:
            0 1px 0
            rgba(255,255,255,.55);
        }

        .thematicPublishButton {
          border:
            2px solid #174461;

          background:
            linear-gradient(
              180deg,
              #c8f2ff 0%,
              #79c6e9 48%,
              #4ca1d0 100%
            );

          box-shadow:
            inset 0 3px 2px
              rgba(255,255,255,.92),
            inset 0 -3px 3px
              rgba(23,68,97,.20),
            0 5px 0 #17415c,
            0 8px 12px
              rgba(0,0,0,.20);
        }

        .thematicDeleteButton {
          border:
            2px solid #8e1515;

          background:
            linear-gradient(
              180deg,
              #ffc0c0 0%,
              #ef8585 48%,
              #cf5656 100%
            );

          box-shadow:
            inset 0 3px 2px
              rgba(255,255,255,.90),
            inset 0 -3px 3px
              rgba(119,18,18,.20),
            0 5px 0 #831515,
            0 8px 12px
              rgba(0,0,0,.20);
        }

        .thematicPublishButton:hover:not(:disabled),
        .thematicDeleteButton:hover:not(:disabled) {
          filter: brightness(1.04);
          transform:
            translateY(-1px);
        }

        .thematicPublishButton:active:not(:disabled),
        .thematicDeleteButton:active:not(:disabled) {
          transform:
            translateY(4px);

          box-shadow:
            inset 0 2px 3px
              rgba(0,0,0,.10),
            0 1px 0
              rgba(0,0,0,.45);
        }

        .thematicPublishButton:disabled,
        .thematicDeleteButton:disabled {
          cursor:
            not-allowed;

          opacity: .58;

          color:
            #111111 !important;

          filter:
            grayscale(.08);
        }

        .deleteButton {
          margin-left: auto;

          color: white;

          border:
            2px solid #8e1515;

          background:
            linear-gradient(
              #f66d6d,
              #c62424
            );

          box-shadow:
            0 4px 0 #831515;
        }

        /* ================================================
           BOTTOM CREATE
        ================================================ */

        .bottomCreate {
          width: min(1500px, 96%);

          margin: 0 auto;

          text-align: center;
        }

        .bottomCreate button {
          min-width: 330px;

          min-height: 65px;

          padding:
            0 30px;

          color: #073b68;

          border:
            3px solid #174461;

          border-radius: 13px;

          background:
            linear-gradient(
              #b6ebff,
              #58a8d7
            );

          box-shadow:
            inset 0 5px 5px
              rgba(255, 255, 255, 0.6),
            0 5px 0 #17415c;

          font-size: 20px;

          font-weight: 800;
        }

        .bottomCreate span {
          margin-right: 8px;

          font-size: 28px;

          vertical-align: middle;
        }

        .headerActions button {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          line-height: 1.12;
        }

        .buttonMain {
          font-size: 16px;
          font-weight: 900;
        }

        .buttonSub {
          margin-top: 4px;
          font-size: 12px;
          font-weight: 700;
          opacity: 1;
          color: #26343c;
        }

        .actions button {
          position: relative;
          min-width: 170px;
          min-height: 52px;
          padding: 7px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          line-height: 1.12;
          transition: transform .12s ease, filter .12s ease, box-shadow .12s ease;
        }

        .actions button:hover {
          filter: brightness(1.04);
          transform: translateY(-1px);
        }

        .actions button:active {
          transform: translateY(3px);
          box-shadow: 0 1px 0 rgba(0,0,0,.45) !important;
        }

        .actionMain {
          display: block;
          font-size: 16px;
          font-weight: 900;
        }

        .actionSub {
          display: block;
          margin-top: 4px;
          font-size: 12px;
          font-weight: 700;
          opacity: 1;
          color: #26343c;
        }

        /* ===============================
           Yozuvlarni tiniq va aniq ko‘rsatish
        =============================== */
        .page,
        .page button,
        .page input {
          -webkit-font-smoothing: antialiased;
          text-rendering: geometricPrecision;
        }

        .testCard,
        .statCard,
        .infoItem,
        .actions button,
        .headerActions button {
          text-shadow: none;
        }

        .buttonMain,
        .actionMain,
        .testTitleArea h2,
        .testTitleArea p,
        .infoItem strong {
          opacity: 1;
          text-shadow: 0 1px 0 rgba(255,255,255,.35);
        }

        .buttonSub,
        .actionSub,
        .description,
        .infoItem span,
        .dateText {
          opacity: 1;
          color: #26343c;
          text-shadow: none;
        }

        .exportOverlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          padding: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(4, 20, 30, .62);
          backdrop-filter: blur(6px);
        }

        .exportModal {
          width: min(540px, 100%);
          padding: 26px;
          border: 3px solid #303538;
          border-radius: 22px;
          background: linear-gradient(145deg, #f8f8f8, #d2d2d2);
          box-shadow:
            inset 0 6px 5px rgba(255,255,255,.95),
            0 7px 0 #555d61,
            0 20px 45px rgba(0,0,0,.35);
          text-align: center;
        }

        .exportTitle {
          margin-bottom: 12px;
          padding: 14px 16px;
          border: 2px solid #174461;
          border-radius: 13px;
          background: linear-gradient(#b6ebff, #58a8d7);
          box-shadow: inset 0 5px 5px rgba(255,255,255,.7), 0 4px 0 #17415c;
          color: #073b68;
        }

        .exportTitle span,
        .exportTitle strong {
          display: block;
        }

        .exportTitle span {
          font-size: 13px;
          letter-spacing: .7px;
          text-transform: uppercase;
        }

        .exportTitle strong {
          margin-top: 4px;
          font-size: 23px;
        }

        .exportModal p {
          margin: 18px 0;
          color: #444;
        }

        .exportChoices {
          display: grid;
          grid-template-columns: repeat(2, minmax(0,1fr));
          gap: 14px;
        }

        .exportChoices button {
          min-height: 92px;
          padding: 12px;
          border-radius: 13px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 5px 0 rgba(0,0,0,.28);
          font-weight: 700;
        }

        .pdfChoice {
          border: 2px solid #8e1515;
          background: linear-gradient(#ffd1d1, #ed7777);
          color: #7b1111;
        }

        .wordChoice {
          border: 2px solid #174461;
          background: linear-gradient(#c9f1ff, #64b6e1);
          color: #073b68;
        }

        .choiceMain {
          font-size: 24px;
          font-weight: 900;
        }

        .choiceSub {
          margin-top: 5px;
          font-size: 11px;
          line-height: 1.3;
        }

        .cancelExport {
          width: 100%;
          min-height: 46px;
          margin-top: 18px;
          border: 2px solid #555;
          border-radius: 10px;
          background: linear-gradient(#fff, #bbb);
          box-shadow: 0 4px 0 #555;
          font-weight: 800;
        }

        .answerChoices {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .answerChoices button {
          min-height: 92px;
          padding: 12px;
          border-radius: 13px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 5px 0 rgba(0,0,0,.28);
          font-weight: 800;
        }

        .withAnswersChoice {
          border: 2px solid #267446;
          background: linear-gradient(#d8f8e2, #74cf92);
          color: #104d2b;
        }

        .withoutAnswersChoice {
          border: 2px solid #174461;
          background: linear-gradient(#d8f3ff, #73bce2);
          color: #073b68;
        }

        .backExport {
          width: 100%;
          min-height: 44px;
          margin-top: 14px;
          border: 2px solid #6a6a6a;
          border-radius: 10px;
          background: linear-gradient(#fff, #d3d3d3);
          box-shadow: 0 3px 0 #666;
          color: #202020;
          font-weight: 800;
        }

        /* Matnlarni xira ko‘rinishdan chiqarish */
        .page,
        .page button,
        .page input {
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }

        .testTitleArea h2,
        .testTitleArea p,
        .description,
        .infoItem span,
        .infoItem strong,
        .actionMain,
        .actionSub,
        .buttonMain,
        .buttonSub,
        .statCard span,
        .exportModal {
          text-shadow: none;
          opacity: 1;
        }

        .description,
        .infoItem span,
        .actionSub,
        .buttonSub {
          color: #26343c;
        }

        .actionSub,
        .buttonSub {
          font-weight: 700;
          opacity: .92;
        }

        /* ================================================
           RESPONSIVE
        ================================================ */

        
        @media (max-width: 1050px) {
          .categoryGrid,
          .createCategoryGrid {
            grid-template-columns:
              repeat(2, minmax(0,1fr));
          }
        }

        @media (max-width: 680px) {
          .categoryGrid,
          .createCategoryGrid {
            grid-template-columns:
              1fr;
          }

          .categorySectionHeader {
            align-items:
              flex-start;

            flex-direction:
              column;
          }

          .selectedCategoryName {
            width:
              100%;
          }

          .customTypeBox {
            grid-template-columns:
              1fr;
          }
        }

@media (max-width: 1000px) {
          .header {
            flex-direction: column;
          }

          .headerTitle {
            width: 100%;
            min-width: 0;
          }

          .headerActions {
            width: 100%;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .headerActions button {
            width: 100%;
          }

          .testInformation {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 700px) {
          .testTitleArea h2 { font-size: 24px; line-height: 1.2; }
          .testTitleArea p { font-size: 17px; line-height: 1.25; }
          .description { font-size: 15px; line-height: 1.45; }
          .infoItem span { font-size: 14px; }
          .infoItem strong { font-size: 21px; }
          .dateText { font-size: 14px !important; }
          .buttonMain, .actionMain { font-size: 15px; }
          .buttonSub, .actionSub { font-size: 11px; line-height: 1.25; }
          .page {
            padding: 9px 6px 60px;
          }

          .header {
            width: 99%;
            min-height: auto;
            padding: 13px 11px;
            gap: 12px;
            border-radius: 18px;
          }

          .headerTitle {
            min-height: 78px;
            padding: 10px 12px;
            border-width: 2px;
            border-radius: 13px;
          }

          .headerTitle span {
            font-size: 11px;
          }

          .headerTitle strong {
            font-size: 22px;
          }

          .headerActions {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
          }

          .headerActions button {
            min-height: 55px;
            padding: 6px 8px;
            border-radius: 9px;
          }

          .buttonMain {
            font-size: 13px;
          }

          .buttonSub {
            font-size: 9px;
          }

          .mainBox {
            width: 99%;
            margin-top: 66px;
            padding: 54px 9px 16px;
            border-radius: 19px;
          }

          .floatingTitle {
            top: -27px;
            min-width: 210px;
            min-height: 51px;
            padding: 7px 18px;
            border-width: 2px;
            border-radius: 12px;
            font-size: 21px;
          }

          .statistics {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 7px;
            margin-bottom: 15px;
          }

          .statCard {
            min-height: 82px;
            padding: 9px 5px;
            border-width: 2px;
            border-radius: 10px;
            box-shadow: inset 0 4px 4px white, 0 3px 0 #555d61;
          }

          .statCard strong {
            margin-bottom: 2px;
            font-size: 25px;
          }

          .statCard span {
            font-size: 12px;
            line-height: 1.12;
          }

          .searchArea {
            margin-bottom: 15px;
            padding: 10px;
            flex-direction: column;
            gap: 8px;
            border-radius: 11px;
          }

          .searchInputBox input {
            height: 46px;
            padding-left: 12px;
            font-size: 14px;
          }

          .refreshButton {
            min-height: 42px;
          }

          .contentBox {
            min-height: 180px;
            padding: 8px;
            border-radius: 13px;
          }

          .testList {
            gap: 14px;
          }

          .testCard {
            padding: 52px 10px 14px;
            border-radius: 13px;
            box-shadow: inset 0 4px 4px white, 0 4px 0 #555d61, 0 8px 12px rgba(0,0,0,.15);
          }

          .statusBadge {
            top: 10px;
            right: 10px;
            padding: 6px 9px;
            font-size: 10px;
          }

          .testHeader {
            padding-right: 0;
          }

          .testTitleArea h2 {
            margin-bottom: 4px;
            font-size: 23px;
          }

          .testTitleArea p {
            font-size: 15px;
          }

          .description {
            margin-top: 12px;
            padding: 10px;
            font-size: 13px;
          }

          .testInformation {
            margin: 14px 0;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 7px;
          }

          .infoItem {
            min-height: 78px;
            padding: 8px 5px;
            border-radius: 9px;
          }

          .infoItem span {
            margin-bottom: 4px;
            font-size: 11px;
          }

          .infoItem strong {
            font-size: 18px;
            line-height: 1.15;
          }

          .dateText {
            font-size: 12px !important;
          }

          .actions {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
          }

          .actions button {
            width: 100%;
            min-width: 0;
            min-height: 58px;
            margin-left: 0;
            padding: 7px 6px;
            border-radius: 9px;
          }

          .actionMain {
            font-size: 13px;
          }

          .actionSub {
            font-size: 9px;
            line-height: 1.16;
          }

          .deleteButton {
            grid-column: 1 / -1;
          }

          .bottomCreate {
            width: 99%;
          }

          .bottomCreate button {
            width: 100%;
            min-width: 0;
            min-height: 53px;
            font-size: 15px;
          }

          .exportModal {
            padding: 18px 13px;
            border-radius: 17px;
          }

          .exportChoices,
          .answerChoices {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .exportChoices button {
            min-height: 76px;
          }
        }

        @media (max-width: 420px) {
          .headerActions {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .statistics {
            gap: 5px;
          }

          .statCard strong {
            font-size: 22px;
          }

          .statCard span {
            font-size: 10px;
          }

          .actions {
            grid-template-columns: 1fr;
          }

          .deleteButton {
            grid-column: auto;
          }
        }
      `}</style>
    </main>
  );
}
