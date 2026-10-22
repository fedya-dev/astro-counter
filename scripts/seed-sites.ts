// Seeds the database with `trainbrakes.com` + 1 week of demo visits.
// Run with: bun /home/z/my-project/scripts/seed-sites.ts

import { db } from "../src/lib/db";
import {
  generateApiKey,
  generateSiteSlug,
  buildTrackingSnippet,
  todayKey,
  lastNDayKeys,
} from "../src/lib/visitor-utils";

async function ensureSite(name: string, domain: string, color: string, slugOverride?: string) {
  let site = await db.site.findFirst({
    where: { domain },
    select: { id: true, name: true, slug: true, apiKey: true, domain: true, color: true },
  });
  if (!site) {
    let slug = slugOverride || generateSiteSlug();
    for (let i = 0; i < 5; i++) {
      const exists = await db.site.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (!exists) break;
      slug = generateSiteSlug();
    }
    const apiKey = generateApiKey();
    site = await db.site.create({
      data: { name, slug, apiKey, domain, color },
      select: { id: true, name: true, slug: true, apiKey: true, domain: true, color: true },
    });
    console.log(`Created site: ${name} (${slug}) — ${domain} — ${color}`);
  } else {
    console.log(`Site already exists: ${site.name} (${site.slug})`);
  }
  return site;
}

async function seedVisits(siteId: string, days: string[]) {
  for (const date of days) {
    const base = 12 + ((date.charCodeAt(date.length - 1) * 7) % 18);
    for (let i = 0; i < base; i++) {
      const visitorHash = `seed_${siteId.slice(0, 6)}_${date}_${i}`;
      const existing = await db.visit.findFirst({
        where: { visitorHash, date, siteId },
        select: { id: true },
      });
      if (existing) continue;
      const referrers = [
        "https://www.google.com/search",
        "https://www.facebook.com/",
        "https://www.linkedin.com/feed",
        null,
      ];
      await db.visit.create({
        data: {
          visitorHash,
          date,
          siteId,
          ip: null,
          userAgent: "seed-script",
          country:
            i % 5 === 0 ? "BG" : i % 5 === 1 ? "DE" : i % 5 === 2 ? "GB" : i % 5 === 3 ? "US" : "FR",
          referrer: referrers[i % referrers.length],
        },
      });
    }
  }
}

async function main() {
  const trainBrakes = await ensureSite("Train Brakes", "trainbrakes.com", "#a855f7", "trainbrakes");
  const blog = await ensureSite("Test Blog", "example.com", "#22d3ee");

  const days = lastNDayKeys(7);
  await seedVisits(trainBrakes.id, days);
  await seedVisits(blog.id, days);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const snippet = buildTrackingSnippet({
    baseUrl,
    slug: trainBrakes.slug,
    apiKey: trainBrakes.apiKey,
  });

  const todayVisits = await db.visit.count({
    where: { siteId: trainBrakes.id, date: todayKey() },
  });
  const totalVisits = await db.visit.count({ where: { siteId: trainBrakes.id } });

  console.log("\n--- TRAIN BRAKES SNIPPET ---");
  console.log(snippet);
  console.log("\n--- STATS ---");
  console.log(`Today (${todayKey()}): ${todayVisits}`);
  console.log(`Total: ${totalVisits}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
