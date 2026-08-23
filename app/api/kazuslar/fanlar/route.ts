import { NextRequest, NextResponse } from "next/server";
import { get, put } from "@vercel/blob";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================================================
   TYPES
========================================================= */

type SubjectFolder = {
  id: string;
  course: number;
  semester: number;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type SubjectsFile = {
  subjects: SubjectFolder[];
};

/* =========================================================
   VERCEL BLOB
========================================================= */

const SUBJECTS_PATH = "huquqiy-sayt/kazuslar/fanlar.json";

/* =========================================================
   ADMIN
========================================================= */

async function isAdmin() {
  const cookieStore = await cookies();

  const session =
    cookieStore.get("qurbonov_session")?.value ?? "";

  const role =
    cookieStore.get("qurbonov_role")?.value ?? "";

  return Boolean(session) && role === "admin";
}

/* =========================================================
   YORDAMCHI FUNKSIYALAR
========================================================= */

function cleanText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function cleanNumber(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.trunc(number);
}

function createId() {
  return (
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 10)
  );
}

/* =========================================================
   FANLARNI O‘QISH
========================================================= */

async function readSubjects(): Promise<SubjectFolder[]> {
  try {
    const result = await get(SUBJECTS_PATH, {
      access: "private",
    });

    if (!result) {
      return [];
    }

    const text = await result.text();

    if (!text.trim()) {
      return [];
    }

    const parsed = JSON.parse(text);

    /*
      Eski format:
      [
        {...},
        {...}
      ]

      yoki yangi format:
      {
        subjects: [...]
      }

      Ikkalasini ham o‘qiy oladi.
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
    console.error("Fanlarni o‘qishda xato:", error);

    /*
      Fayl hali mavjud bo‘lmasa,
      bo‘sh ro‘yxat qaytaramiz.
    */

    return [];
  }
}

/* =========================================================
   FANLARNI SAQLASH

   MUHIM:
   allowOverwrite: true

   fanlar.json mavjud bo‘lsa,
   shu fayl yangilanadi.
========================================================= */

async function writeSubjects(
  subjects: SubjectFolder[]
) {
  const data: SubjectsFile = {
    subjects,
  };

  await put(
    SUBJECTS_PATH,
    JSON.stringify(data, null, 2),
    {
      access: "private",

      /*
        MUHIM!

        fanlar.json allaqachon mavjud bo‘lsa
        uni yangilashga ruxsat beradi.
      */
      allowOverwrite: true,

      /*
        Har safar yangi random nom
        yaratib yubormaydi.
      */
      addRandomSuffix: false,

      contentType:
        "application/json; charset=utf-8",
    }
  );
}

/* =========================================================
   GET
   Barcha fanlarni olish

   Qo‘llab-quvvatlaydi:

   /api/kazuslar/fanlar

   /api/kazuslar/fanlar?course=1

   /api/kazuslar/fanlar?course=1&semester=1
========================================================= */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const courseParam =
      searchParams.get("course");

    const semesterParam =
      searchParams.get("semester");

    let subjects = await readSubjects();

    /* -------------------------
       Kurs bo‘yicha filter
    ------------------------- */

    if (courseParam) {
      const course = Number(courseParam);

      subjects = subjects.filter(
        (subject) =>
          Number(subject.course) === course
      );
    }

    /* -------------------------
       Semestr bo‘yicha filter
    ------------------------- */

    if (semesterParam) {
      const semester = Number(semesterParam);

      subjects = subjects.filter(
        (subject) =>
          Number(subject.semester) === semester
      );
    }

    /* -------------------------
       Tartiblash
    ------------------------- */

    subjects.sort((a, b) => {
      if (a.course !== b.course) {
        return a.course - b.course;
      }

      if (a.semester !== b.semester) {
        return a.semester - b.semester;
      }

      return a.name.localeCompare(
        b.name,
        "uz"
      );
    });

    return NextResponse.json(
      {
        ok: true,
        subjects,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("GET fanlar xatosi:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          "Fanlarni yuklashda xatolik yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   POST
   Yangi fan qo‘shish
========================================================= */

export async function POST(request: NextRequest) {
  try {
    /* -------------------------
       Admin tekshirish
    ------------------------- */

    if (!(await isAdmin())) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Fan qo‘shish faqat administrator uchun.",
        },
        {
          status: 403,
        }
      );
    }

    /* -------------------------
       Body
    ------------------------- */

    const body = await request.json();

    const course = cleanNumber(
      body?.course
    );

    const semester = cleanNumber(
      body?.semester
    );

    const name = cleanText(
      body?.name
    );

    /* -------------------------
       Kurs tekshirish
    ------------------------- */

    if (course < 1 || course > 4) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Kurs 1 dan 4 gacha bo‘lishi kerak.",
        },
        {
          status: 400,
        }
      );
    }

    /* -------------------------
       Semestr tekshirish
    ------------------------- */

    if (semester < 1 || semester > 8) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Semestr 1 dan 8 gacha bo‘lishi kerak.",
        },
        {
          status: 400,
        }
      );
    }

    /* -------------------------
       Kurs va semestr mosligi
    ------------------------- */

    const allowedSemesters: Record<
      number,
      number[]
    > = {
      1: [1, 2],
      2: [3, 4],
      3: [5, 6],
      4: [7, 8],
    };

    if (
      !allowedSemesters[course]?.includes(
        semester
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            `${course}-kurs uchun ${semester}-semestr mos emas.`,
        },
        {
          status: 400,
        }
      );
    }

    /* -------------------------
       Fan nomi
    ------------------------- */

    if (!name) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Fan nomini kiriting.",
        },
        {
          status: 400,
        }
      );
    }

    if (name.length > 150) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Fan nomi juda uzun.",
        },
        {
          status: 400,
        }
      );
    }

    /* -------------------------
       Eski fanlarni olish
    ------------------------- */

    const subjects =
      await readSubjects();

    /* -------------------------
       Takroriy fan
    ------------------------- */

    const duplicate =
      subjects.some((subject) => {
        return (
          Number(subject.course) ===
            course &&
          Number(subject.semester) ===
            semester &&
          subject.name
            .trim()
            .toLocaleLowerCase("uz") ===
            name
              .trim()
              .toLocaleLowerCase("uz")
        );
      });

    if (duplicate) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Bu fan ushbu semestrga allaqachon qo‘shilgan.",
        },
        {
          status: 409,
        }
      );
    }

    /* -------------------------
       Yangi fan
    ------------------------- */

    const now =
      new Date().toISOString();

    const newSubject: SubjectFolder = {
      id: createId(),

      course,

      semester,

      name,

      createdAt: now,

      updatedAt: now,
    };

    subjects.push(newSubject);

    /* -------------------------
       SAQLASH
    ------------------------- */

    await writeSubjects(subjects);

    return NextResponse.json(
      {
        ok: true,

        message:
          "Fan muvaffaqiyatli qo‘shildi.",

        subject: newSubject,

        subjects,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST fan qo‘shish xatosi:",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Fan qo‘shishda noma’lum xatolik yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   PATCH
   Fan nomini tahrirlash
========================================================= */

export async function PATCH(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Fanlarni tahrirlash faqat administrator uchun.",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      await request.json();

    const id =
      cleanText(body?.id);

    const name =
      cleanText(body?.name);

    if (!id) {
      return NextResponse.json(
        {
          ok: false,
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
          ok: false,
          error:
            "Yangi fan nomini kiriting.",
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
        (subject) =>
          subject.id === id
      );

    if (index === -1) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Fan topilmadi.",
        },
        {
          status: 404,
        }
      );
    }

    /* -------------------------
       Shu semestrda boshqa fan
       xuddi shu nomda bormi?
    ------------------------- */

    const current =
      subjects[index];

    const duplicate =
      subjects.some(
        (subject) =>
          subject.id !== id &&
          Number(subject.course) ===
            Number(current.course) &&
          Number(subject.semester) ===
            Number(current.semester) &&
          subject.name
            .trim()
            .toLocaleLowerCase("uz") ===
            name
              .trim()
              .toLocaleLowerCase("uz")
      );

    if (duplicate) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Bu nomdagi fan ushbu semestrda mavjud.",
        },
        {
          status: 409,
        }
      );
    }

    subjects[index] = {
      ...subjects[index],

      name,

      updatedAt:
        new Date().toISOString(),
    };

    await writeSubjects(subjects);

    return NextResponse.json({
      ok: true,

      message:
        "Fan nomi muvaffaqiyatli o‘zgartirildi.",

      subject:
        subjects[index],

      subjects,
    });
  } catch (error) {
    console.error(
      "PATCH fan xatosi:",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Fanni tahrirlashda xatolik yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   DELETE
   Fan papkasini o‘chirish

   /api/kazuslar/fanlar?id=...
========================================================= */

export async function DELETE(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Fanlarni o‘chirish faqat administrator uchun.",
        },
        {
          status: 403,
        }
      );
    }

    const { searchParams } =
      new URL(request.url);

    const id =
      cleanText(
        searchParams.get("id")
      );

    if (!id) {
      return NextResponse.json(
        {
          ok: false,
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
          ok: false,
          error:
            "Fan topilmadi.",
        },
        {
          status: 404,
        }
      );
    }

    const newSubjects =
      subjects.filter(
        (item) =>
          item.id !== id
      );

    await writeSubjects(
      newSubjects
    );

    return NextResponse.json({
      ok: true,

      message:
        `"${subject.name}" fani o‘chirildi.`,

      subjects: newSubjects,
    });
  } catch (error) {
    console.error(
      "DELETE fan xatosi:",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Fanni o‘chirishda xatolik yuz berdi.",
      },
      {
        status: 500,
      }
    );
  }
}
