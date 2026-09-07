# Host platform integration (optional)

This game runs standalone. Auth and “go home” can optionally plug into a **host site** that already has Supabase Auth (for example KruMath on `krumath.com`).

You do **not** need a host site for local development: the hard gate is skipped in Vite `DEV`.

## What this app expects from a host

| Concern | Behavior                                                                                   |
| ------- | ------------------------------------------------------------------------------------------ |
| Sign-in | Redirect to `/sign-in?returnUrl=/tugofwar` (relative, or prefixed with `VITE_HOST_ORIGIN`) |
| Home    | Link to `/home` (or `{VITE_HOST_ORIGIN}/home`)                                             |
| Session | Same Supabase project; reject missing and anonymous users                                  |
| Cookies | Optional shared domain via `VITE_AUTH_COOKIE_DOMAIN` (e.g. `.krumath.com`)                 |

This Worker does **not** implement sign-in UI. After login, the host should return the user to `returnUrl`.

## Env mapping

| This app (Vite)           | Typical Next.js host            |
| ------------------------- | ------------------------------- |
| `VITE_SUPABASE_URL`       | `NEXT_PUBLIC_SUPABASE_URL`      |
| `VITE_SUPABASE_ANON_KEY`  | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `VITE_HOST_ORIGIN`        | Local host origin (optional)    |
| `VITE_AUTH_COOKIE_DOMAIN` | Shared cookie domain (optional) |

Never commit real keys. Anon keys are public client material but still belong only in deploy secrets / local `.env`.

## Cloudflare route

Serve the app under a path base (`/tugofwar/` by default):

1. Build with Supabase (and cookie/origin) env present.
2. Deploy Worker `krumath-tugofwar` (Durable Object class `TugRoom`, binding `TUG_ROOMS`).
3. Add a hostname route more specific than the main site Worker:

   ```text
   your-domain.com/tugofwar*  →  krumath-tugofwar
   ```

4. Leave `/`, `/home`, `/sign-in`, `/auth/*` on the host Worker.

## Auth gate styles

This repo uses a **hard gate** on the host game route in production: unsigned / anonymous users redirect to sign-in. DEV skips the gate so localhost works without shared cookies.

Helpers:

- [`src/lib/auth.ts`](../src/lib/auth.ts) — `fetchPlayableUser`
- [`src/lib/auth-cookies.ts`](../src/lib/auth-cookies.ts) — cookie options
- [`src/lib/host-urls.ts`](../src/lib/host-urls.ts) — sign-in / home / claim URLs
- [`src/lib/supabase.server.ts`](../src/lib/supabase.server.ts) — SSR Supabase client

## Example: KruMath

On production KruMath:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_AUTH_COOKIE_DOMAIN=.krumath.com
```

Local host app on port 3000:

```env
VITE_HOST_ORIGIN=http://localhost:3000
```

(`VITE_KRUMATH_ORIGIN` remains a supported legacy alias for `VITE_HOST_ORIGIN`.)

Add a home-page link to `/tugofwar` on the host site in a separate change after the Worker route works.

## Checklist

```text
[ ] Path base chosen and synced (app-config + Vite + patch script)
[ ] Supabase env at build time
[ ] Cookie domain set only if sharing SSO with a host
[ ] Worker deployed + path route configured
[ ] Smoke: signed-out redirect, signed-in game, QR claim, assets under /tugofwar/assets/
[ ] Host home link added when ready
```
