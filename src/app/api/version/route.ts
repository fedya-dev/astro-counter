import { NextResponse } from "next/server";
import { APP_VERSION } from "@/lib/version";

/**
 * GET /api/version
 * Returns the running build's version string. Use this to verify that the
 * Docker container is running the latest code:
 *
 *   curl http://your-server:3000/api/version
 *   -> {"ok":true,"version":"v1.0.5"}
 *
 * If you see an older version (or no version field), the container is running
 * stale code. Force a rebuild WITHOUT cache:
 *
 *   docker compose down
 *   docker compose build --no-cache
 *   docker compose up -d
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    version: APP_VERSION,
    builtAt: "2026-10-21T18:15:00Z",
    description:
      "Astro Visitor Counter — multi-site personal visit tracker. " +
      "If /api/version returns an older version than " +
      APP_VERSION +
      ", your Docker container is running stale code. Run: " +
      "docker compose down && docker compose build --no-cache && docker compose up -d",
  });
}


