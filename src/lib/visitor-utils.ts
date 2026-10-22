import { NextRequest } from "next/server";

export const ADMIN_PIN = process.env.ADMIN_PIN || "1234";

export const SESSION_COOKIE = "astro_session";

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

/** Color palette for auto-assigning site chip colors. */
export const SITE_COLOR_PALETTE = [
  "#a855f7", // violet
  "#f59e0b", // amber
  "#22d3ee", // cyan
  "#10b981", // emerald
  "#ec4899", // pink
  "#ef4444", // red
  "#8b5cf6", // indigo-violet
  "#f97316", // orange
  "#06b6d4", // sky
  "#84cc16", // lime
  "#eab308", // yellow
  "#14b8a6", // teal
];

/** Pick a color from the palette by hash of an arbitrary string. */
export function pickPaletteColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(h, 31) + seed.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(h) % SITE_COLOR_PALETTE.length;
  return SITE_COLOR_PALETTE[idx];
}

export function getVisitorHash(req: NextRequest): string {
  const ip =
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const ua = req.headers.get("user-agent") || "unknown";
  const country =
    req.headers.get("cf-ipcountry") ||
    req.headers.get("x-geo-country") ||
    "";
  let hash = 0x811c9dc5;
  const input = `${ip}|${ua}|${country}`;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayKey(d);
}

export function lastNDayKeys(n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(todayKey(d));
  }
  return out;
}

export function formatDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const days = ["Нед", "Пон", "Вто", "Сря", "Чет", "Пет", "Съб"];
  return `${days[date.getDay()]} ${String(d).padStart(2, "0")}.${String(
    m
  ).padStart(2, "0")}`;
}

export function makeSessionToken(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const stamp = Date.now().toString(36);
  return `${stamp}.${rand}`;
}

export function isValidSession(
  token: string | undefined | null
): boolean {
  if (!token) return false;
  const [stamp] = token.split(".");
  const ts = parseInt(stamp, 36);
  if (Number.isNaN(ts)) return false;
  const ageSec = (Date.now() - ts) / 1000;
  return ageSec >= 0 && ageSec < SESSION_TTL_SECONDS;
}

export function detectPublicOrigin(req: NextRequest): string {
  const envOverride = process.env.NEXT_PUBLIC_BASE_URL;
  if (envOverride) return envOverride.replace(/\/$/, "");
  const fwdHost =
    req.headers.get("x-forwarded-host") || req.headers.get("host");
  const fwdProto =
    req.headers.get("x-forwarded-proto") ||
    (fwdHost?.startsWith("localhost") || fwdHost?.startsWith("127.0.0.1")
      ? "http"
      : "https");
  if (fwdHost) return `${fwdProto}://${fwdHost}`;
  return new URL(req.url).origin;
}

export function isHttpsRequest(req: NextRequest): boolean {
  const fwdProto = req.headers.get("x-forwarded-proto");
  if (fwdProto) {
    return fwdProto.toLowerCase().trim() === "https";
  }
  const fwdSsl = req.headers.get("x-forwarded-ssl");
  if (fwdSsl) {
    return fwdSsl.toLowerCase().trim() === "on";
  }
  if (req.nextUrl?.protocol === "https:") return true;
  try {
    const fullUrl = req.url || "";
    if (fullUrl.startsWith("https://")) return true;
  } catch {
    // ignore
  }
  return false;
}

export function generateSiteSlug(): string {
  const uuid = crypto.randomUUID().replace(/-/g, "");
  const num = parseInt(uuid.slice(0, 8), 16);
  return num.toString(36).padStart(6, "0");
}

export function generateApiKey(): string {
  const a = Math.random().toString(36).slice(2, 14);
  const b = Math.random().toString(36).slice(2, 14);
  return `sk_${a}${b}`;
}

export function buildTrackingSnippet(opts: {
  baseUrl: string;
  slug: string;
  apiKey: string;
}): string {
  const endpoint = `${opts.baseUrl}/api/track?site=${opts.slug}&k=${opts.apiKey}`;
  return `<!-- Astro Visitor Counter -->
<script>
(function(){
  function track(){
    try {
      var data = {
        referrer: document.referrer || "",
        page: location.pathname || "/"
      };
      fetch(${JSON.stringify(endpoint)}, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      }).catch(function(){});
    } catch(e) {}
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", track);
  } else {
    track();
  }
})();
</script>
<!-- End Astro Visitor Counter -->`;
}
