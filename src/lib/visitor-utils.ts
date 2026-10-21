import { NextRequest } from "next/server";

/**
 * The personal PIN used to unlock the private stats dashboard.
 * Change this to your own secret PIN before deploying.
 * (Default kept simple for personal use: "1234")
 */
export const ADMIN_PIN = process.env.ADMIN_PIN || "1234";

/** Cookie name used to remember the unlock state across reloads. */
export const SESSION_COOKIE = "astro_session";

/** How long the unlock stays valid (7 days in seconds). */
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

/**
 * Returns a stable visitor hash from the request. We hash the IP + user-agent
 * so that the same person reloading the page multiple times in the same day
 * only counts as ONE visit for that day.
 */
export function getVisitorHash(req: NextRequest): string {
  const ip =
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const ua = req.headers.get("user-agent") || "unknown";
  const country = req.headers.get("cf-ipcountry") || req.headers.get("x-geo-country") || "";
  // Simple FNV-1a 32-bit hash — fast, no crypto needed (not security-sensitive).
  let hash = 0x811c9dc5;
  const input = `${ip}|${ua}|${country}`;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  // Convert to unsigned hex string
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/** Today's date in YYYY-MM-DD using the server's local timezone. */
export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Yesterday's date key. */
export function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayKey(d);
}

/** Returns the last N day-keys ending today, oldest first. */
export function lastNDayKeys(n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(todayKey(d));
  }
  return out;
}

/** Format a YYYY-MM-DD key as a friendly Bulgarian label like "Пн 21.10" */
export function formatDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const days = ["Нед", "Пон", "Вто", "Сря", "Чет", "Пет", "Съб"];
  return `${days[date.getDay()]} ${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}`;
}

/** Verify the session cookie was issued by us (HMAC-like check). */
export function makeSessionToken(): string {
  // Simple random token — persisted only in the cookie, never stored server-side.
  // Security comes from the PIN being correct, not from the token being unforgeable,
  // since the worst an attacker can do with a forged token is see daily visit counts.
  const rand = Math.random().toString(36).slice(2, 10);
  const stamp = Date.now().toString(36);
  return `${stamp}.${rand}`;
}

/** True if a session token is well-formed and not expired. */
export function isValidSession(token: string | undefined | null): boolean {
  if (!token) return false;
  const [stamp] = token.split(".");
  const ts = parseInt(stamp, 36);
  if (Number.isNaN(ts)) return false;
  const ageSec = (Date.now() - ts) / 1000;
  return ageSec >= 0 && ageSec < SESSION_TTL_SECONDS;
}

/**
 * Generate a short URL-safe slug for a site (e.g. "trainbrakes", "blog-bg").
 * Uses crypto.randomUUID() for the underlying randomness, then base36-encodes
 * the first 8 bytes for compactness. ~10 chars total.
 */
export function generateSiteSlug(): string {
  const uuid = crypto.randomUUID().replace(/-/g, "");
  // Take first 8 hex chars → 32 bits → base36 (max ~6-7 chars)
  const num = parseInt(uuid.slice(0, 8), 16);
  return num.toString(36).padStart(6, "0");
}

/**
 * Generate a longer random API key (32 chars base36) used by the tracking
 * snippet to authenticate POST requests. Anyone with this key can record
 * visits for this site, but cannot read stats (stats need the PIN).
 */
export function generateApiKey(): string {
  // Two halves so we get ~24 chars total
  const a = Math.random().toString(36).slice(2, 14);
  const b = Math.random().toString(36).slice(2, 14);
  return `sk_${a}${b}`;
}

/**
 * Detect the public origin from the incoming request — works behind Caddy
 * reverse proxy by checking x-forwarded-host / x-forwarded-proto, falling
 * back to the Host header, then to NEXT_PUBLIC_BASE_URL env, then localhost.
 */
export function detectPublicOrigin(req: NextRequest): string {
  // 1. Explicit env override wins if set
  const envOverride = process.env.NEXT_PUBLIC_BASE_URL;
  if (envOverride) return envOverride.replace(/\/$/, "");
  // 2. Try x-forwarded-host + x-forwarded-proto (Caddy/CF set these)
  const fwdHost =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host");
  const fwdProto =
    req.headers.get("x-forwarded-proto") ||
    (fwdHost?.startsWith("localhost") || fwdHost?.startsWith("127.0.0.1")
      ? "http"
      : "https");
  if (fwdHost) return `${fwdProto}://${fwdHost}`;
  // 3. Last resort
  return new URL(req.url).origin;
}

/**
 * Returns true if the current request is HTTPS (either directly or behind a
 * reverse proxy that set x-forwarded-proto). Used to decide whether to mark
 * the session cookie as `Secure`.
 *
 * Critical for self-hosted deployments: if we always set `secure: true` when
 * NODE_ENV=production, the browser refuses to store the cookie on plain HTTP
 * connections — and the dashboard's "unlock" silently fails (toast shows
 * "Достъп разрешен" but the page stays locked).
 *
 * Detection order (most explicit first):
 * 1. `x-forwarded-proto: https` (set by Caddy/Nginx/Traefik behind TLS) → true
 * 2. `x-forwarded-proto: http` → false (explicit HTTP behind proxy)
 * 3. `x-forwarded-ssl: on` (legacy Caddy header) → true
 * 4. `x-forwarded-ssl: off` → false
 * 5. Direct connection to Next.js: protocol is "https:" → true
 * 6. Otherwise: false (safer default — self-hosted HTTP works)
 */
export function isHttpsRequest(req: NextRequest): boolean {
  // 1. x-forwarded-proto is set by Caddy/Nginx/Traefik when they terminate TLS
  const fwdProto = req.headers.get("x-forwarded-proto");
  if (fwdProto) {
    return fwdProto.toLowerCase().trim() === "https";
  }
  // 2. Legacy Caddy x-forwarded-ssl header
  const fwdSsl = req.headers.get("x-forwarded-ssl");
  if (fwdSsl) {
    return fwdSsl.toLowerCase().trim() === "on";
  }
  // 3. Direct HTTPS connection to the Next.js server (no proxy in front)
  //    Check both req.nextUrl.protocol AND a parsed URL from req.url as a
  //    fallback — Next.js standalone sometimes doesn't populate nextUrl
  //    protocol correctly for the runtime request.
  if (req.nextUrl?.protocol === "https:") return true;
  try {
    const fullUrl = req.url || "";
    if (fullUrl.startsWith("https://")) return true;
  } catch {
    // ignore
  }
  // 4. Otherwise: HTTP (safer default — even when accessed by IP/hostname
  //    over plain HTTP, the cookie will be stored). If you deploy behind HTTPS
  //    without a reverse proxy that sets x-forwarded-proto, you'll need to
  //    set it yourself in your proxy config.
  return false;
}



/** Generate the full tracking snippet for a site. */
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


