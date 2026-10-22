import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVisitorHash, todayKey } from "@/lib/visitor-utils";

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

    const visitorHash = getVisitorHash(req);
    const date = todayKey();

    let referrer: string | null = null;
    try {
      const body = await req.json();
      if (body && typeof body.referrer === "string" && body.referrer) {
        try {
          const u = new URL(body.referrer);
          referrer = `${u.origin}${u.pathname}`.slice(0, 200);
        } catch {
          referrer = String(body.referrer).slice(0, 200);
        }
      }
    } catch {
      // body empty
    }

    const siteId = site?.id ?? null;

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
