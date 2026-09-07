import type { CookieOptions } from "@supabase/ssr";

/** Cookie options matching KruMath SSO on .krumath.com */
export function cookieOptionsForHost(hostname: string): CookieOptions {
  const host = hostname.split(":")[0] ?? hostname;
  if (host === "localhost" || host.endsWith(".localhost") || host === "127.0.0.1") {
    return { path: "/", sameSite: "lax", secure: false };
  }
  if (host === "krumath.com" || host.endsWith(".krumath.com")) {
    return {
      domain: ".krumath.com",
      path: "/",
      sameSite: "lax",
      secure: true,
    };
  }
  return { path: "/", sameSite: "lax", secure: true };
}
