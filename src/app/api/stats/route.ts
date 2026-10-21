import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  SESSION_COOKIE,
  todayKey,
  yesterdayKey,
  lastNDayKeys,
  formatDayLabel,
  isValidSession,
} from "@/lib/visitor-utils";

/**
 * GET /api/stats?site=<slug>
 * Requires a valid session cookie (i.e. the user has entered the correct PIN).
 *
 * If `site` query param is provided, returns stats for that specific site.
 * Otherwise, returns aggregated stats across the dashboard's own `/` page
 * (legacy visits with siteId=null).
 *
 * Returns the private dashboard breakdown:
 *   - today's count
 *   - yesterday's count
 *   - total unique visitors
 *   - last 7 days series (date label + count)
 *   - top countries (last 7 days)
 *   - top referrers (last 7 days) — new for external sites
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!isValidSession(token)) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const siteSlug = url.searchParams.get("site");

    // Determine the site filter
    let siteId: string | null = null;
    let siteName: string | null = null;
    if (siteSlug) {
      const site = await db.site.findUnique({
        where: { slug: siteSlug },
        select: { id: true, name: true },
      });
      if (!site) {
        return NextResponse.json(
          { ok: false, error: "unknown_site" },
          { status: 404 }
        );
      }
      siteId = site.id;
      siteName = site.name;
    }

    const today = todayKey();
    const yesterday = yesterdayKey();
    const last7 = lastNDayKeys(7);

    // The Prisma `where` filter — null siteId means "dashboard self-visits"
    const where = siteId ? { siteId } : { siteId: null };

    const [
      todayCount,
      yesterdayCount,
      totalUniqueRows,
      last7Counts,
      topCountriesRows,
      topReferrersRows,
    ] = await Promise.all([
      db.visit.count({ where: { ...where, date: today } }),
      db.visit.count({ where: { ...where, date: yesterday } }),
      db.visit.groupBy({
        by: ["visitorHash"],
        where,
        _count: { _all: true },
      }),
      Promise.all(
        last7.map(async (date) => ({
          date,
          label: formatDayLabel(date),
          count: await db.visit.count({ where: { ...where, date } }),
        }))
      ),
      db.visit.groupBy({
        by: ["country"],
        _count: { _all: true },
        where: { ...where, date: { in: last7 } },
        orderBy: { _count: { country: "desc" } },
        take: 5,
      }),
      db.visit.groupBy({
        by: ["referrer"],
        _count: { _all: true },
        where: {
          ...where,
          date: { in: last7 },
          referrer: { not: null },
        },
        orderBy: { _count: { referrer: "desc" } },
        take: 5,
      }),
    ]);

    const topCountries = topCountriesRows
      .filter((r) => r.country)
      .map((r) => ({
        country: r.country as string,
        count: r._count._all,
      }));

    const topReferrers = topReferrersRows
      .filter((r) => r.referrer)
      .map((r) => ({
        referrer: r.referrer as string,
        count: r._count._all,
      }));

    const weekTotal = last7Counts.reduce((sum, d) => sum + d.count, 0);

    const todayCountNum = todayCount;
    const yesterdayCountNum = yesterdayCount;
    let trendPct: number | null = null;
    if (yesterdayCountNum > 0) {
      trendPct = Math.round(
        ((todayCountNum - yesterdayCountNum) / yesterdayCountNum) * 100
      );
    } else if (todayCountNum > 0) {
      trendPct = 100;
    }

    return NextResponse.json({
      ok: true,
      stats: {
        site: siteName,
        siteSlug: siteSlug || null,
        today: todayCountNum,
        yesterday: yesterdayCountNum,
        total: totalUniqueRows.length,
        weekTotal,
        trendPct,
        series: last7Counts,
        topCountries,
        topReferrers,
      },
    });
  } catch (err) {
    console.error("[/api/stats] error:", err);
    return NextResponse.json(
      { ok: false, error: "stats_failed" },
      { status: 500 }
    );
  }
}
