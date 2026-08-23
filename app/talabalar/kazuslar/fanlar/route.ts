import { cookies } from "next/headers";
import { get, put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUBJECTS_PATH =
  "huquqiy-sayt/kazuslar/fanlar.json";

type CourseNumber = 1 | 2 | 3 | 4;

type SemesterNumber =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8;

type SubjectCategory = "ODDIY" | "ON" | "YN";

type SubjectFolder = {
  id: string;
  name: string;
  category?: SubjectCategory;
  course: CourseNumber;
  semester: SemesterNumber;
  createdAt: string;
  updatedAt: string;
};

/* =========================================================
   ADMIN TEKSHIRISH
========================================================= */

async function isAdmin() {
  const cookieStore = await cookies();

  return (
    cookieStore.get("qurbonov_role")?.value ===
    "admin"
  );
}

/* =========================================================
   YORDAMCHI FUNKSIYALAR
========================================================= */

function normalizeName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("uz");
}

function isValidCourse(
  value: number
): value is CourseNumber {
  return [1, 2, 3, 4].includes(value);
}

function isValidSemester(
  value: number
): value is SemesterNumber {
  return [
    1, 2, 3, 4, 5, 6, 7, 8,
  ].includes(value);
}

function semestersForCourse(
  course: CourseNumber
): SemesterNumber[] {
  if (course === 1) return [1, 2];
  if (course === 2) return [3, 4];
  if (course === 3) return [5, 6];
  return [7, 8];
}

/* =========================================================
   FANLARNI O‘QISH

   MUHIM TUZATISH:
   @vercel/blob get() natijasida .text() yo‘q.
   Natija stream beradi.
   Shu sabab:
   new Response(result.stream).text()
========================================================= */

async function readSubjects(): Promise<
  SubjectFolder[]
> {
  if (
    !process.env
      .BLOB_READ_WRITE_TOKEN
  ) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN topilmadi."
    );
  }

  try {
    const result = await get(
      SUBJECTS_PATH,
      {
        access: "private",
      }
    );

    if (
      !result ||
      result.statusCode !== 200 ||
      !result.stream
    ) {
      return [];
    }

    const raw = await new Response(
      result.stream
    ).text();

    if (!raw.trim()) {
      return [];
    }

    const parsed = JSON.parse(raw);

    /*
      Eski format:
      [
        {...},
        {...}
      ]

      Yoki:
      {
        subjects: [...]
      }

      Ikkalasini ham o‘qiydi.
    */
    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray(parsed.subjects)
    ) {
      return parsed.subjects;
    }

    return [];
  } catch (error) {
    /*
      fanlar.json hali mavjud bo‘lmagan
      birinchi ishga tushish holatida
      bo‘sh ro‘yxat qaytaramiz.
    */
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    if (
      message
        .toLowerCase()
        .includes("not found") ||
      message.includes("404")
    ) {
      return [];
    }

    throw error;
  }
}

/* =========================================================
   FANLARNI SAQLASH

   allowOverwrite: true
   — mavjud fanlar.json ustiga yangisini yozadi.
========================================================= */

async function writeSubjects(
  subjects: SubjectFolder[]
) {
  if (
    !process.env
      .BLOB_READ_WRITE_TOKEN
  ) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN topilmadi."
    );
  }

  await put(
    SUBJECTS_PATH,
    JSON.stringify(
      subjects,
      null,
      2
    ),
    {
      access: "private",

      /*
        Avvalgi Vercel Blob xatosini
        aynan shu tuzatadi.
      */
      allowOverwrite: true,

      addRandomSuffix: false,

      contentType:
        "application/json; charset=utf-8",
    }
  );
}

/* =========================================================
   GET — BARCHA FANLAR
========================================================= */

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const categoryRaw = (url.searchParams.get("category") || "ODDIY").toUpperCase();
    const category: SubjectCategory =
      categoryRaw === "ON" || categoryRaw === "YN" ? categoryRaw : "ODDIY";

    const subjects =
      await readSubjects();

    const filtered = subjects.filter((item) => {
      const itemCategory = item.category || "ODDIY";
      return itemCategory === category;
    });

    const sorted = [...filtered].sort(
      (a, b) => {
        if (a.course !== b.course) {
          return a.course - b.course;
        }

        if (
          a.semester !== b.semester
        ) {
          return (
            a.semester - b.semester
          );
        }

        return a.name.localeCompare(
          b.name,
          "uz"
        );
      }
    );

    /*
      page.tsx data.success ni tekshiradi.
      Shu sabab "ok" emas, "success".
    */
    return NextResponse.json({
      success: true,
      subjects: sorted,
    });
  } catch (error) {
    console.error(
      "SUBJECTS GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Fanlarni yuklab bo‘lmadi.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   POST — YANGI FAN
========================================================= */

export async function POST(
  request: NextRequest
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Fan qo‘shish faqat administrator uchun.",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      await request.json();

    const categoryRaw = String(body?.category ?? "ODDIY").toUpperCase();
    const category: SubjectCategory =
      categoryRaw === "ON" || categoryRaw === "YN" ? categoryRaw : "ODDIY";

    const name = String(
      body?.name ?? ""
    )
      .trim()
      .replace(/\s+/g, " ");

    const course =
      Number(body?.course);

    const semester =
      Number(body?.semester);

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Fan nomini kiriting.",
        },
        {
          status: 400,
        }
      );
    }

    if (!isValidCourse(course)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Kurs noto‘g‘ri.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !isValidSemester(semester)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Semestr noto‘g‘ri.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !semestersForCourse(
        course
      ).includes(semester)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            `${semester}-semestr ${course}-kursga mos emas.`,
        },
        {
          status: 400,
        }
      );
    }

    const subjects =
      await readSubjects();

    const duplicate =
      subjects.some(
        (item) =>
          (item.category || "ODDIY") === category &&
          item.course === course &&
          item.semester ===
            semester &&
          normalizeName(
            item.name
          ) ===
            normalizeName(name)
      );

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bu fan ushbu semestrda allaqachon mavjud.",
        },
        {
          status: 409,
        }
      );
    }

    const now =
      new Date().toISOString();

    const subject: SubjectFolder =
      {
        id:
          typeof crypto !==
            "undefined" &&
          "randomUUID" in crypto
            ? crypto.randomUUID()
            : `fan-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 9)}`,

        name,
        category,
        course,
        semester,
        createdAt: now,
        updatedAt: now,
      };

    const next = [
      ...subjects,
      subject,
    ];

    await writeSubjects(next);

    return NextResponse.json(
      {
        success: true,
        subject,
        subjects: next,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "SUBJECT POST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Fan qo‘shishda xatolik.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   PATCH — FAN NOMINI TAHRIRLASH
========================================================= */

export async function PATCH(
  request: NextRequest
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Fanni tahrirlash faqat administrator uchun.",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      await request.json();

    const id = String(
      body?.id ?? ""
    ).trim();

    const categoryRaw = String(body?.category ?? "ODDIY").toUpperCase();
    const category: SubjectCategory =
      categoryRaw === "ON" || categoryRaw === "YN" ? categoryRaw : "ODDIY";

    const name = String(
      body?.name ?? ""
    )
      .trim()
      .replace(/\s+/g, " ");

    const course =
      Number(body?.course);

    const semester =
      Number(body?.semester);

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Fan ID topilmadi.",
        },
        {
          status: 400,
        }
      );
    }

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Fan nomini kiriting.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !isValidCourse(course) ||
      !isValidSemester(semester)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Kurs yoki semestr noto‘g‘ri.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !semestersForCourse(
        course
      ).includes(semester)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Semestr tanlangan kursga mos emas.",
        },
        {
          status: 400,
        }
      );
    }

    const subjects =
      await readSubjects();

    const index =
      subjects.findIndex(
        (item) =>
          item.id === id
      );

    if (index === -1) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Fan topilmadi.",
        },
        {
          status: 404,
        }
      );
    }

    const duplicate =
      subjects.some(
        (item) =>
          item.id !== id &&
          (item.category || "ODDIY") === category &&
          item.course === course &&
          item.semester ===
            semester &&
          normalizeName(
            item.name
          ) ===
            normalizeName(name)
      );

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bu nomdagi fan ushbu semestrda mavjud.",
        },
        {
          status: 409,
        }
      );
    }

    const updated: SubjectFolder =
      {
        ...subjects[index],
        name,
        category,
        course,
        semester,
        updatedAt:
          new Date().toISOString(),
      };

    const next =
      subjects.map((item) =>
        item.id === id
          ? updated
          : item
      );

    await writeSubjects(next);

    return NextResponse.json({
      success: true,
      subject: updated,
      subjects: next,
    });
  } catch (error) {
    console.error(
      "SUBJECT PATCH ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Fanni tahrirlashda xatolik.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   DELETE — FANNI O‘CHIRISH
========================================================= */

export async function DELETE(
  request: NextRequest
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Fanni o‘chirish faqat administrator uchun.",
        },
        {
          status: 403,
        }
      );
    }

    const url =
      new URL(request.url);

    let id =
      url.searchParams
        .get("id")
        ?.trim() ?? "";

    /*
      page.tsx body orqali ham id yuborsa,
      ikkala usulni ham qo‘llaymiz.
    */
    if (!id) {
      try {
        const body =
          await request.json();

        id = String(
          body?.id ?? ""
        ).trim();
      } catch {
        // Body bo‘lmasligi mumkin.
      }
    }

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "O‘chiriladigan fan ID topilmadi.",
        },
        {
          status: 400,
        }
      );
    }

    const subjects =
      await readSubjects();

    const subject =
      subjects.find(
        (item) =>
          item.id === id
      );

    if (!subject) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Fan topilmadi.",
        },
        {
          status: 404,
        }
      );
    }

    const next =
      subjects.filter(
        (item) =>
          item.id !== id
      );

    await writeSubjects(next);

    return NextResponse.json({
      success: true,
      message:
        `“${subject.name}” fani o‘chirildi.`,
      subjects: next,
    });
  } catch (error) {
    console.error(
      "SUBJECT DELETE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Fanni o‘chirishda xatolik.",
      },
      {
        status: 500,
      }
    );
  }
}
