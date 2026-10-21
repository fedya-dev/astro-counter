import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_PIN,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  isHttpsRequest,
  makeSessionToken,
} from "@/lib/visitor-utils";

/**
 * POST /api/auth
 * Body: { pin: string }
 * Verifies the PIN, and if correct sets an HttpOnly session cookie so the
 * private stats dashboard becomes visible to that browser only.
 *
 * The cookie's `Secure` flag is set dynamically based on the request scheme:
 * - HTTP localhost (dev) → not secure (browser would reject otherwise)
 * - HTTP server (self-hosted, no reverse proxy) → not secure (otherwise the
 *   browser silently refuses to store the cookie and the dashboard "stays
 *   locked" even after a correct PIN)
 * - HTTPS directly or behind a reverse proxy with x-forwarded-proto=https
 *   → secure (best practice, cookie only sent over TLS)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const pin = body?.pin;
    if (typeof pin !== "string" || !pin) {
      return NextResponse.json(
        { ok: false, error: "missing_pin" },
        { status: 400 }
      );
    }

    // Constant-time comparison to avoid timing attacks on the PIN.
    const a = Buffer.from(String(pin));
    const b = Buffer.from(String(ADMIN_PIN));
    const sameLength = a.length === b.length;
    let match = sameLength;
    if (sameLength) {
      let diff = 0;
      for (let i = 0; i < a.length; i++) {
        diff |= a[i] ^ b[i];
      }
      match = diff === 0;
    }

    if (!match) {
      // Slight artificial delay to slow down brute force.
      await new Promise((r) => setTimeout(r, 400));
      return NextResponse.json(
        { ok: false, error: "invalid_pin" },
        { status: 401 }
      );
    }

    const token = makeSessionToken();
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: isHttpsRequest(req),
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });
    return res;
  } catch (err) {
    console.error("[/api/auth] error:", err);
    return NextResponse.json(
      { ok: false, error: "auth_failed" },
      { status: 500 }
    );
  }
}

