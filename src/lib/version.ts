/**
 * App version — bump this on every code change so the user can verify
 * the running container is up to date.
 *
 * Verification endpoints:
 *   - Browser: footer of the locked screen shows "Astro Counter vX.Y.Z"
 *   - CLI:      curl http://your-server:3000/api/version
 *
 * If the running version is older than this constant, the Docker container
 * is running stale code. Force a rebuild:
 *
 *   docker compose down
 *   docker compose build --no-cache
 *   docker compose up -d
 */
export const APP_VERSION = "v1.0.7";

