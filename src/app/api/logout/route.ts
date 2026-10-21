import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, isHttpsRequest } from "@/lib/visitor-utils";

/** POST /api/logout — clears the session cookie. */
export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttpsRequest(req),
    path: "/",
    maxAge: 0,
  });
  return res;
}

