import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session =
    request.cookies.get("qurbonov_session")?.value;

  const role =
    request.cookies.get("qurbonov_role")?.value;

  if (!session) {
    return NextResponse.json(
      {
        success: false,
        role: null,
        message: "Tizimga kirilmagan.",
      },
      {
        status: 401,
      }
    );
  }

  const safeRole =
    role === "admin"
      ? "admin"
      : "user";

  return NextResponse.json(
    {
      success: true,
      role: safeRole,
    },
    {
      status: 200,
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate",
      },
    }
  );
}