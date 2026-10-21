import { NextRequest, NextResponse } from "next/server";
import { isHttpsRequest } from "@/lib/visitor-utils";
import { APP_VERSION } from "@/lib/version";

/**
 * GET /api/debug/auth-info
 * Diagnostic endpoint — returns everything the server sees about the current
 * request, including what isHttpsRequest() returns. Use this to debug the
 * "cookie has Secure flag" issue.
 *
 *   curl http://your-server:3000/api/debug/auth-info
 */
export async function GET(req: NextRequest) {
  const fwdProto = req.headers.get("x-forwarded-proto");
  const fwdSsl = req.headers.get("x-forwarded-ssl");
  const host = req.headers.get("host");
  const nextUrlProtocol = req.nextUrl?.protocol;
  const fullUrl = req.url;

  return NextResponse.json({
    ok: true,
    appVersion: APP_VERSION,
    requestAnalysis: {
      xForwardedProto: fwdProto,
      xForwardedSsl: fwdSsl,
      host,
      nextUrlProtocol,
      fullUrl,
      isHttpsDetected: isHttpsRequest(req),
      // What this means for the auth cookie:
      //   - If isHttpsDetected = false → cookie set with secure: false
      //   - If isHttpsDetected = true  → cookie set with secure: true
      //                              → browser/curl will REFUSE to send it over HTTP!
      cookieWillHaveSecureFlag: isHttpsRequest(req),
    },
    headers: Object.fromEntries(req.headers.entries()),
  });
}

