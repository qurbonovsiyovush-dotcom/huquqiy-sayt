import { cookies } from "next/headers";
import { get, put } from "@vercel/blob";
import { NextResponse } from "next/server";

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

type SubjectFolder = {
  id: string;
  name: string;
  course: CourseNumber;
  semester: SemesterNumber;
  createdAt: string;
  updatedAt: string;
};

async function isAdmin() {
  const cookieStore = await cookies();

  return (
    cookieStore.get("qurbonov_role")?.value ===
    "admin"
  );
}

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

  try {
    const parsed =
      JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

async function writeSubjects(
  subjects: SubjectFolder[]
) {
  await put(
    SUBJECTS_PATH,
    JSON.stringify(
      subjects,
      null,
      2
    ),
    {
      access: "private",
      addRandomSuffix: false,
      contentType:
        "application/json; charset=utf-8",
    }
  );
}

export async function GET() {
  try {
    const subjects =
      await readSubjects();

    return NextResponse.json({
      success: true,
      subjects,
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

export async function POST(
  request: Request
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bu amal faqat administrator uchun.",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      await request.json();

    const name =
      String(
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
            "Fan nomi kiritilmagan.",
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

    const expectedSemesters =
      course === 1
        ? [1, 2]
        : course === 2
          ? [3, 4]
          : course === 3
            ? [5, 6]
            : [7, 8];

    if (
      !expectedSemesters.includes(
        semester
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bu semestr tanlangan kursga mos emas.",
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

    return NextResponse.json({
      success: true,
      subject,
    });
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
            : "Fanni saqlashda xatolik.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(
  request: Request
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bu amal faqat administrator uchun.",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      await request.json();

    const id =
      String(
        body?.id ?? ""
      ).trim();

    const name =
      String(
        body?.name ?? ""
      )
        .trim()
        .replace(/\s+/g, " ");

    const course =
      Number(body?.course);

    const semester =
      Number(body?.semester);

    if (!id || !name) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Fan ID yoki nomi topilmadi.",
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

    const subjects =
      await readSubjects();

    const existing =
      subjects.find(
        (item) =>
          item.id === id
      );

    if (!existing) {
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

    const updated: SubjectFolder =
      {
        ...existing,
        name,
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

export async function DELETE(
  request: Request
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bu amal faqat administrator uchun.",
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

    if (!id) {
      try {
        const body =
          await request.json();

        id =
          String(
            body?.id ?? ""
          ).trim();
      } catch {
        // body bo‘lmasligi mumkin
      }
    }

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Fan ID ko‘rsatilmagan.",
        },
        {
          status: 400,
        }
      );
    }

    const subjects =
      await readSubjects();

    const exists =
      subjects.some(
        (item) =>
          item.id === id
      );

    if (!exists) {
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
