// Seeds the SQLite database with a week of synthetic visit data
// so the dashboard chart shows meaningful content right away.
// Run with: bun /home/z/my-project/scripts/seed-visits.ts

import { db } from "../src/lib/db";
import { todayKey, lastNDayKeys } from "../src/lib/visitor-utils";

async function main() {
  const days = lastNDayKeys(7); // includes today
  // Generate ~5-25 unique visitors per day (deterministic pseudo-random)
  for (const date of days) {
    const base = 8 + ((date.charCodeAt(date.length - 1) * 7) % 18); // 8..25
    for (let i = 0; i < base; i++) {
      // Full unique hash per (day, index) — DON'T clip to 8 chars
      const visitorHash = `seed_${date}_${i}`;
      const existing = await db.visit.findFirst({
        where: { visitorHash, date },
        select: { id: true },
      });
      if (existing) continue;
      await db.visit.create({
        data: {
          visitorHash,
          date,
          ip: null,
          userAgent: "seed-script",
          country:
            i % 4 === 0 ? "BG" : i % 4 === 1 ? "DE" : i % 4 === 2 ? "GB" : "US",
        },
      });
    }
  }

  const total = await db.visit.groupBy({
    by: ["visitorHash"],
    _count: { _all: true },
  });
  const today = await db.visit.count({ where: { date: todayKey() } });
  console.log(`Seeded visits. Days: ${days.join(", ")}`);
  console.log(`Today (${todayKey()}): ${today}`);
  console.log(`Total unique visitors: ${total.length}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
