# Math Tug-of-War

Two-player classroom math game for grades 4–12. Each side answers questions on an on-screen keypad; correct answers pull the rope toward that team. First to pull the center marker all the way wins.

Khmer UI. Digits and math symbols stay Western.

**Classroom / QR mode:** each team header can show a claim QR. One phone per team scans and types answers; the projector keypad for that side locks. Touch-screen TVs still work with no setup if nobody claims.

Optional: plug into a host site (for example [KruMath](https://krumath.com)) for shared Supabase SSO. See [docs/HOST_INTEGRATION.md](./docs/HOST_INTEGRATION.md).

License: [MIT](./LICENSE).

## Stack

- TanStack Start (React 19) + Vite 8
- Cloudflare Workers + Durable Objects (`TugRoom`) for phone QR rooms
- Optional Supabase Auth hard gate

## Development

Requires Node.js 20+ and npm.

```sh
npm i
cp .env.example .env   # optional for local DEV (auth gate is skipped)
npm run dev
```

App base path is `/tugofwar/` — open `http://localhost:<port>/tugofwar/`.

```sh
npm test        # unit tests (game + room protocol)
npm run build   # production build
npm run lint    # eslint
npm run deploy  # build, patch DO export, wrangler deploy
```

Phone QR rooms need Durable Objects. Local Vite without a Worker falls back to on-screen keypads only; validate QR on a deployed Worker.

## Environment

| Variable                  | Required                 | Purpose                                              |
| ------------------------- | ------------------------ | ---------------------------------------------------- |
| `VITE_SUPABASE_URL`       | For production auth gate | Supabase project URL                                 |
| `VITE_SUPABASE_ANON_KEY`  | For production auth gate | Public anon key (never commit real values)           |
| `VITE_HOST_ORIGIN`        | Optional                 | Host site origin for sign-in / home redirects        |
| `VITE_KRUMATH_ORIGIN`     | Optional                 | Legacy alias for `VITE_HOST_ORIGIN`                  |
| `VITE_AUTH_COOKIE_DOMAIN` | Optional                 | Cookie `Domain` for shared SSO (e.g. `.krumath.com`) |

`VITE_*` values are embedded at **build time**. Changing them requires rebuild + redeploy.

## Deploy (Cloudflare)

1. Set build env (`VITE_SUPABASE_*`, and cookie/origin vars if using a host).
2. `npm run deploy` (runs build → `scripts/patch-do-export.mjs` → wrangler).
3. Route a hostname path more specific than your main site Worker, e.g. `example.com/tugofwar*` → this Worker.
4. Smoke-test assets under `/tugofwar/assets/...`, auth redirect (if gated), and QR claim flow.

Keep `APP_SLUG` / base path in sync across [`src/lib/app-config.ts`](./src/lib/app-config.ts), Vite `base`, and the patch script.

## Architecture notes

- **Host UI** (`/`): local `gameReducer` until a room WebSocket connects; then state syncs through the Durable Object.
- **Controller** (`/c/:roomId/:claimToken`): phone keypad after claiming a side.
- **APIs:** `POST /api/room/create`, `GET /api/room/:roomId` (WebSocket upgrade).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Security reports: [SECURITY.md](./SECURITY.md). Code of conduct: [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).
