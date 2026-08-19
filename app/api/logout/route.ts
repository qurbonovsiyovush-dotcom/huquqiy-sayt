import { NextResponse } from "next/server";

export async function POST() {
  const response =
    NextResponse.json({
      success: true,
    });

  response.cookies.set(
    "qurbonov_session",
    "",
    {
      httpOnly: true,
      path: "/",
      expires: new Date(0),
    }
  );

  response.cookies.set(
    "qurbonov_role",
    "",
    {
      httpOnly: true,
      path: "/",
      expires: new Date(0),
    }
  );

  response.cookies.set(
    "qurbonov_name",
    "",
    {
      httpOnly: true,
      path: "/",
      expires: new Date(0),
    }
  );

  return response;
}