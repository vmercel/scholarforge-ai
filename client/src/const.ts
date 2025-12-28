export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

function getNextPath(): string {
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const next = current === "/" ? "/dashboard" : current;
  return next;
}

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const rawOauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const next = getNextPath();

  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  const trimmedPortal = (rawOauthPortalUrl ?? "").toString().trim();

  // Internal (dev) auth mode:
  // - env var missing, OR
  // - env var points to a localhost portal (ports may vary), OR
  // - env var matches the current origin
  if (!trimmedPortal) {
    return `/auth/login?next=${encodeURIComponent(next)}`;
  }

  let portalUrl: URL | null = null;
  try {
    portalUrl = new URL(trimmedPortal);
  } catch {
    portalUrl = null;
  }

  if (
    !portalUrl ||
    localHosts.has(portalUrl.hostname) ||
    portalUrl.origin === window.location.origin
  ) {
    return `/auth/login?next=${encodeURIComponent(next)}`;
  }

  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const portalBase = portalUrl.toString().endsWith("/")
    ? portalUrl.toString()
    : `${portalUrl.toString()}/`;

  const url = new URL(`${portalBase}app-auth`);
  if (appId) url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};

export const getSignupUrl = () => {
  const next = getNextPath();
  return `/auth/signup?next=${encodeURIComponent(next)}`;
};
