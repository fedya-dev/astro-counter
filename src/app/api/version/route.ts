import { NextResponse } from "next/server";
import { APP_VERSION } from "@/lib/version";

export async function GET() {
  return NextResponse.json({
    ok: true,
    version: APP_VERSION,
    builtAt: "2026-10-22T16:50:00Z",
    description:
      "Astro Visitor Counter — multi-site personal visit tracker. " +
      "If /api/version returns an older version than " +
      APP_VERSION +
      ", your Docker container is running stale code. Run: " +
      "docker compose down && docker compose build --no-cache && docker compose up -d",
  });
}
