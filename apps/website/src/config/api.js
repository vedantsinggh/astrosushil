/**
 * Resolves the backend API base URL cleanly across local development and
 * production builds, avoiding silent fallback to localhost on hosted domains.
 */
export function resolveApiBaseUrl() {
  const configured = import.meta.env.VITE_API_URL;
  if (configured && !configured.startsWith("%")) {
    return configured.replace(/\/+$/, "");
  }
  if (import.meta.env.VITE_DEPLOY_ENV === "testing") {
    // A testing build must never fall back to the production API (vite.config.js also fails
    // the build when VITE_API_URL is missing). Use the same-origin path the testing proxy serves.
    console.error("[config] VITE_API_URL missing in a testing build; using same-origin /api/v1");
    return "/api/v1";
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:3000/api/v1";
    }
    return "https://api.astrosushil.com/api/v1";
  }
  return "http://localhost:3000/api/v1";
}

export const API_BASE_URL = resolveApiBaseUrl();
