/** Feature slug on krumath.com — keep in sync with Vite/Nitro base. */
export const APP_SLUG = "tugofwar";

export function appReturnPath(): string {
  return `/${APP_SLUG}`;
}

/** Sign-in on the main KruMath site (not this Worker's routes). */
export function signInHref(returnPath = appReturnPath()): string {
  const path = `/sign-in?returnUrl=${encodeURIComponent(returnPath)}`;
  const origin = import.meta.env["VITE_KRUMATH_ORIGIN"] as string | undefined;
  if (origin && origin.length > 0) {
    return `${origin.replace(/\/$/, "")}${path}`;
  }
  return path;
}

export function homeHref(): string {
  const origin = import.meta.env["VITE_KRUMATH_ORIGIN"] as string | undefined;
  if (origin && origin.length > 0) {
    return `${origin.replace(/\/$/, "")}/home`;
  }
  return "/home";
}

/** Absolute claim URL from runtime origin + Vite base (no hard-coded host). */
export function buildClaimUrl(claimToken: string, roomId: string): string {
  const base = import.meta.env.BASE_URL || "/";
  const origin =
    typeof window !== "undefined" ? window.location.origin : "http://localhost";
  // roomId in the path — more reliable for phone QR scanners than ?room=
  return new URL(
    `c/${encodeURIComponent(roomId)}/${encodeURIComponent(claimToken)}`,
    `${origin}${base.endsWith("/") ? base : `${base}/`}`,
  ).toString();
}
