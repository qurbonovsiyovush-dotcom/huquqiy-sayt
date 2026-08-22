import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "PDF fayl topilmadi.",
        },
        { status: 400 }
      );
    }

    // Faqat PDF
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        {
          success: false,
          error: "Faqat PDF fayl yuklash mumkin.",
        },
        { status: 400 }
      );
    }

    // 10 MB limit
    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: "PDF hajmi 10 MB dan oshmasligi kerak.",
        },
        { status: 400 }
      );
    }

    // Fayl nomini xavfsizlashtiramiz
    const safeName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-");

    const uniqueName =
      `kazuslar/pdf/${Date.now()}-${safeName}`;

    // Vercel Blob'ga saqlash
    const blob = await put(uniqueName, file, {
      access: "public",
      addRandomSuffix: true,
    });

    return NextResponse.json({
      success: true,

      file: {
        name: file.name,
        size: file.size,
        type: file.type,
        url: blob.url,
        pathname: blob.pathname,
      },
    });
  } catch (error) {
    console.error("PDF upload error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "PDF yuklashda xatolik yuz berdi.",
      },
      { status: 500 }
    );
  }
}
