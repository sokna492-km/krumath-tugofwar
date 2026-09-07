import { APP_RETURN_PATH } from "@/lib/app-config";

export function appReturnPath(): string {
  return APP_RETURN_PATH;
}

function hostOrigin(): string | undefined {
  const primary = import.meta.env["VITE_HOST_ORIGIN"] as string | undefined;
  if (primary && primary.length > 0) return primary;
  // Legacy alias from older KruMath-integrated checkouts.
  const legacy = import.meta.env["VITE_KRUMATH_ORIGIN"] as string | undefined;
  if (legacy && legacy.length > 0) return legacy;
  return undefined;
}

/** Sign-in on the host site (not this Worker's routes). Relative when no origin set. */
export function signInHref(returnPath = appReturnPath()): string {
  const path = `/sign-in?returnUrl=${encodeURIComponent(returnPath)}`;
  const origin = hostOrigin();
  if (origin) {
    return `${origin.replace(/\/$/, "")}${path}`;
  }
  return path;
}

export function homeHref(): string {
  const origin = hostOrigin();
  if (origin) {
    return `${origin.replace(/\/$/, "")}/home`;
  }
  return "/home";
}

/** Absolute claim URL from runtime origin + Vite base (no hard-coded host). */
export function buildClaimUrl(claimToken: string, roomId: string): string {
  const base = import.meta.env.BASE_URL || "/";
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
  return new URL(
    `c/${encodeURIComponent(roomId)}/${encodeURIComponent(claimToken)}`,
    `${origin}${base.endsWith("/") ? base : `${base}/`}`,
  ).toString();
}
