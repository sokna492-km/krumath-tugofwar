import type { CookieOptions } from "@supabase/ssr";

/**
 * Cookie options for Supabase SSR.
 * Set `VITE_AUTH_COOKIE_DOMAIN` (e.g. `.example.com`) for shared SSO across a host site.
 * On `*.krumath.com` without that env, defaults to `.krumath.com` for the optional KruMath plug-in.
 */
export function cookieOptionsForHost(hostname: string): CookieOptions {
  const host = hostname.split(":")[0] ?? hostname;
  if (host === "localhost" || host.endsWith(".localhost") || host === "127.0.0.1") {
    return { path: "/", sameSite: "lax", secure: false };
  }

  const fromEnv = (import.meta.env["VITE_AUTH_COOKIE_DOMAIN"] as string | undefined)?.trim();
  const domain =
    fromEnv && fromEnv.length > 0
      ? fromEnv
      : host === "krumath.com" || host.endsWith(".krumath.com")
        ? ".krumath.com"
        : undefined;

  if (domain) {
    const bare = domain.startsWith(".") ? domain.slice(1) : domain;
    if (host === bare || host.endsWith(`.${bare}`)) {
      return {
        domain: domain.startsWith(".") ? domain : `.${domain}`,
        path: "/",
        sameSite: "lax",
        secure: true,
      };
    }
  }

  return { path: "/", sameSite: "lax", secure: true };
}
