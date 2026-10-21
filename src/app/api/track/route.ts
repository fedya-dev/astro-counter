import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getVisitorHash,
  todayKey,
  yesterdayKey,
} from "@/lib/visitor-utils";

/**
 * Cross-origin tracking endpoint.
 *
 * External sites embed a snippet that POSTs to:
 *   POST /api/track?site=<slug>&k=<apiKey>
 * Body (optional): { referrer?: string, page?: string }
 *
 * Security model:
 *   - The slug is public (visible in the snippet URL).
 *   - The apiKey (k=...) is also embedded in the snippet URL — yes, this means
 *     anyone viewing the site's source can extract it. That's by design: the
 *     worst they can do is record fake visits to YOUR stats, which doesn't
 *     compromise the private dashboard (still gated by the PIN).
 *   - The dashboard itself is protected by the PIN cookie.
 *
 * This endpoint is fully CORS-open (any origin allowed) because it must be
 * callable from external websites.
 *
 * Also serves the legacy self-tracking use case when neither site nor k are
 * provided (the dashboard's own `/` page calls this with no site — registered
 * as the implicit "Self" site).
 */

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const siteSlug = url.searchParams.get("site");
    const apiKey = url.searchParams.get("k");

    let site: { id: string; slug: string; apiKey: string } | null = null;

    // If a site slug is provided, look it up + verify the API key.
    if (siteSlug) {
      const found = await db.site.findUnique({
        where: { slug: siteSlug },
        select: { id: true, slug: true, apiKey: true, domain: true },
      });
      if (!found) {
        return NextResponse.json(
          { ok: false, error: "unknown_site" },
          { status: 404, headers: corsHeaders() }
        );
      }
      if (apiKey !== found.apiKey) {
        return NextResponse.json(
          { ok: false, error: "invalid_key" },
          { status: 401, headers: corsHeaders() }
        );
      }
      site = { id: found.id, slug: found.slug, apiKey: found.apiKey };
    }

    // Visitor hash is now per-(visitor, site) so the same person visiting
    // multiple tracked sites still counts as 1 unique per site per day.
    const visitorHash = getVisitorHash(req);
    const date = todayKey();

    let referrer: string | null = null;
    try {
      const body = await req.json();
      if (body && typeof body.referrer === "string" && body.referrer) {
        // Sanitize: strip query/fragment, keep origin+pathname, truncate.
        try {
          const u = new URL(body.referrer);
          referrer = `${u.origin}${u.pathname}`.slice(0, 200);
        } catch {
          referrer = String(body.referrer).slice(0, 200);
        }
      }
    } catch {
      // body was empty / not JSON — that's fine, snippet always sends JSON
    }

    const siteId = site?.id ?? null;

    // Deduplicate: same (visitor, site, date) = one row.
    const existing = await db.visit.findFirst({
      where: siteId
        ? { visitorHash, date, siteId }
        : { visitorHash, date, siteId: null },
      select: { id: true },
    });

    let visitId: string;
    if (existing) {
      visitId = existing.id;
    } else {
      const created = await db.visit.create({
        data: {
          visitorHash,
          date,
          siteId,
          ip:
            req.headers.get("x-real-ip") ||
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            null,
          userAgent: req.headers.get("user-agent") || null,
          country:
            req.headers.get("cf-ipcountry") ||
            req.headers.get("x-geo-country") ||
            null,
          referrer,
        },
      });
      visitId = created.id;
    }

    // Public-safe counts (only for the requested site).
    const where = siteId ? { siteId } : { siteId: null };
    const todayCount = await db.visit.count({ where: { ...where, date } });
    const totalUnique = await db.visit.groupBy({
      by: ["visitorHash"],
      where,
      _count: { _all: true },
    });

    return NextResponse.json(
      {
        ok: true,
        visitId,
        site: site?.slug ?? null,
        // Note: for external sites, we return today's count + total — but the
        // snippet doesn't actually USE this response (it's fire-and-forget
        // with `mode: "no-cors"`). It's only useful for debugging.
        today: todayCount,
        total: totalUnique.length,
      },
      { headers: corsHeaders() }
    );
  } catch (err) {
    console.error("[/api/track] error:", err);
    return NextResponse.json(
      { ok: false, error: "track_failed" },
      { status: 500, headers: corsHeaders() }
    );
  }
}

/** GET /api/track — public-safe count for today + total unique (optionally filtered by site). */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const siteSlug = url.searchParams.get("site");
    const where = siteSlug ? { site: { slug: siteSlug } } : { siteId: null };

    const date = todayKey();
    const todayCount = await db.visit.count({
      where: { ...where, date },
    });
    const totalUnique = await db.visit.groupBy({
      by: ["visitorHash"],
      where,
      _count: { _all: true },
    });

    return NextResponse.json(
      { ok: true, today: todayCount, total: totalUnique.length },
      { headers: corsHeaders() }
    );
  } catch (err) {
    console.error("[/api/track GET] error:", err);
    return NextResponse.json(
      { ok: false, error: "track_failed" },
      { status: 500, headers: corsHeaders() }
    );
  }
}

// Re-export for type-checking only
export const _yesterdayKey = yesterdayKey;
