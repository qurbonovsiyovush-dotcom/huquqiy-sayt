import { NextResponse } from "next/server";

export async function POST() {
  const response =
    NextResponse.json({
      success: true,
    });

  const cookieOptions = {
    httpOnly: true,
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  };

  response.cookies.set(
    "qurbonov_session",
    "",
    cookieOptions
  );

  response.cookies.set(
    "qurbonov_role",
    "",
    cookieOptions
  );

  response.cookies.set(
    "qurbonov_name",
    "",
    cookieOptions
  );

  response.cookies.set(
    "qurbonov_pending",
    "",
    cookieOptions
  );

  return response;
}
