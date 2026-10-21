import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  SESSION_COOKIE,
  generateApiKey,
  generateSiteSlug,
  isValidSession,
  buildTrackingSnippet,
  detectPublicOrigin,
} from "@/lib/visitor-utils";

/** Helper: returns true if the request has a valid admin session cookie. */
function isAdmin(req: NextRequest): boolean {
  return isValidSession(req.cookies.get(SESSION_COOKIE)?.value);
}

/**
 * GET /api/sites
 * Admin-only. Lists all registered sites with their stats summary.
 */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }
  try {
    const sites = await db.site.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
        apiKey: true,
        createdAt: true,
        _count: { select: { visits: true } },
      },
    });

    // For each site, also compute today's + yesterday's count
    const todayStr = new Date();
    const todayDate = `${todayStr.getFullYear()}-${String(
      todayStr.getMonth() + 1
    ).padStart(2, "0")}-${String(todayStr.getDate()).padStart(2, "0")}`;
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yesterdayDate = `${y.getFullYear()}-${String(
      y.getMonth() + 1
    ).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;

    const enriched = await Promise.all(
      sites.map(async (s) => {
        const [today, yesterday] = await Promise.all([
          db.visit.count({ where: { siteId: s.id, date: todayDate } }),
          db.visit.count({
            where: { siteId: s.id, date: yesterdayDate },
          }),
        ]);
        return {
          id: s.id,
          name: s.name,
          slug: s.slug,
          domain: s.domain,
          apiKey: s.apiKey,
          createdAt: s.createdAt,
          totalVisits: s._count.visits,
          today,
          yesterday,
        };
      })
    );

    return NextResponse.json({ ok: true, sites: enriched });
  } catch (err) {
    console.error("[/api/sites GET] error:", err);
    return NextResponse.json(
      { ok: false, error: "sites_list_failed" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sites
 * Admin-only. Creates a new site.
 * Body: { name: string, domain?: string }
 */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }
  try {
    const body = await req.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const domain =
      typeof body?.domain === "string" && body.domain.trim()
        ? body.domain.trim()
        : null;

    if (!name || name.length < 2 || name.length > 80) {
      return NextResponse.json(
        { ok: false, error: "invalid_name" },
        { status: 400 }
      );
    }

    // Generate a unique slug. Retry on collision (extremely unlikely).
    let slug = generateSiteSlug();
    for (let attempt = 0; attempt < 5; attempt++) {
      const exists = await db.site.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (!exists) break;
      slug = generateSiteSlug();
    }

    const apiKey = generateApiKey();

    const site = await db.site.create({
      data: { name, slug, apiKey, domain },
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
        apiKey: true,
        createdAt: true,
      },
    });

    const baseUrl = detectPublicOrigin(req);
    const snippet = buildTrackingSnippet({ baseUrl, slug, apiKey });

    return NextResponse.json({ ok: true, site, snippet });
  } catch (err) {
    console.error("[/api/sites POST] error:", err);
    return NextResponse.json(
      { ok: false, error: "site_create_failed" },
      { status: 500 }
    );
  }
}
