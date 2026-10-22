import { NextRequest, NextResponse } from "next/server";
import { isHttpsRequest } from "@/lib/visitor-utils";
import { APP_VERSION } from "@/lib/version";

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
      cookieWillHaveSecureFlag: isHttpsRequest(req),
    },
    headers: Object.fromEntries(req.headers.entries()),
  });
}
