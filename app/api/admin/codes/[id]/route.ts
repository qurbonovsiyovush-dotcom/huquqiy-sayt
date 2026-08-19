import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

type AccessCode = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  approved: boolean;
  requestedAt: string | null;
  createdAt: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
};

const DATA_FILE = path.join(
  process.cwd(),
  "data-storage",
  "access-codes.json"
);

async function isAdmin() {
  const cookieStore = await cookies();

  return (
    cookieStore.get("qurbonov_role")?.value ===
    "admin"
  );
}

async function readCodes(): Promise<AccessCode[]> {
  try {
    const text = await fs.readFile(
      DATA_FILE,
      "utf8"
    );

    const data = JSON.parse(text);

    return Array.isArray(data)
      ? data
      : [];
  } catch {
    return [];
  }
}

async function writeCodes(
  codes: AccessCode[]
) {
  await fs.writeFile(
    DATA_FILE,
    JSON.stringify(codes, null, 2),
    "utf8"
  );
}

export async function DELETE(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Faqat administrator o‘chira oladi.",
      },
      {
        status: 403,
      }
    );
  }

  try {
    const { id } =
      await context.params;

    const cleanId =
      decodeURIComponent(id).trim();

    console.log(
      "DELETE ID:",
      cleanId
    );

    const codes =
      await readCodes();

    console.log(
      "OLD COUNT:",
      codes.length
    );

    const user =
      codes.find(
        (item) =>
          item.id === cleanId
      );

    if (!user) {
      console.log(
        "USER NOT FOUND:",
        cleanId
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Foydalanuvchi topilmadi.",
        },
        {
          status: 404,
        }
      );
    }

    const newCodes =
      codes.filter(
        (item) =>
          item.id !== cleanId
      );

    await writeCodes(
      newCodes
    );

    const check =
      await readCodes();

    const stillExists =
      check.some(
        (item) =>
          item.id === cleanId
      );

    console.log(
      "NEW COUNT:",
      check.length
    );

    console.log(
      "STILL EXISTS:",
      stillExists
    );

    if (stillExists) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Foydalanuvchini o‘chirib bo‘lmadi.",
        },
        {
          status: 500,
        }
      );
    }

    console.log(
      "DELETED:",
      user.name,
      user.code
    );

    return NextResponse.json({
      success: true,
      deletedId: user.id,
      deletedName: user.name,
      deletedCode: user.code,
    });

  } catch (error) {
    console.error(
      "DELETE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Serverda o‘chirish xatosi.",
      },
      {
        status: 500,
      }
    );
  }
}