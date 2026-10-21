import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  SESSION_COOKIE,
  generateApiKey,
  buildTrackingSnippet,
  detectPublicOrigin,
  isValidSession,
} from "@/lib/visitor-utils";

function isAdmin(req: NextRequest): boolean {
  return isValidSession(req.cookies.get(SESSION_COOKIE)?.value);
}

/**
 * POST /api/sites/[id]/regenerate-key
 * Admin-only. Rotates the site's API key. Old key stops working immediately.
 * Returns the new key + updated snippet.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(req)) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }
  try {
    const { id } = await params;
    const newKey = generateApiKey();
    const site = await db.site.update({
      where: { id },
      data: { apiKey: newKey },
      select: { id: true, name: true, slug: true, domain: true, apiKey: true },
    });
    const baseUrl = detectPublicOrigin(req);
    const snippet = buildTrackingSnippet({
      baseUrl,
      slug: site.slug,
      apiKey: site.apiKey,
    });
    return NextResponse.json({ ok: true, site, snippet });
  } catch (err) {
    console.error("[/api/sites/[id]/regenerate-key] error:", err);
    return NextResponse.json(
      { ok: false, error: "key_rotate_failed" },
      { status: 500 }
    );
  }
}
