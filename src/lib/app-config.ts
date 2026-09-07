/** App mount path — keep in sync with Vite `base` and `scripts/patch-do-export.mjs`. */
export const APP_SLUG = "tugofwar";

/** Vite/Nitro base including trailing slash. */
export const APP_BASE = `/${APP_SLUG}/`;

/** Path used as sign-in returnUrl (no trailing slash). */
export const APP_RETURN_PATH = `/${APP_SLUG}`;
