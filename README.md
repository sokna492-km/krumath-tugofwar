# krumath-tugofwar

Two-player math tug-of-war for Grade 4–12. Each player answers questions on an on-screen keypad; correct answers pull the rope toward their side. First to pull the center marker all the way wins.

Khmer UI. Digits and math symbols stay Western.

Classroom mode: each team header shows a QR code. One phone per team scans and types answers; the projector keypad for that side locks. Touch-screen TVs still work with no setup if nobody claims.

Deployed as `krumath.com/tugofwar` (see [KRUMATH_GAME_INTEGRATION.md](./KRUMATH_GAME_INTEGRATION.md)).

## Development

Requires Node.js and npm.

```sh
npm i
cp .env.example .env   # fill VITE_SUPABASE_* for auth (skipped on DEV host gate)
npm run dev
```

App base path is `/tugofwar/` — open `http://localhost:<port>/tugofwar/`.

Other scripts:

```sh
npm test        # unit tests (game + room protocol)
npm run build   # production build
npm run lint    # eslint
```

Phone QR rooms need Durable Objects (Cloudflare). Local Vite without DO falls back to on-screen keypads only; validate QR on the deployed Worker.

## Operator checklist (Cloudflare + home link)

Feature-repo work stops after deploy. Do **not** edit the KruMath monorepo from this task.

1. Build with Supabase env: `npm run build` (or `npm run deploy` / `wrangler deploy`).
2. Deploy Worker `krumath-tugofwar` (Durable Object class `TugRoom`, binding `TUG_ROOMS`).
3. Cloudflare hostname route (more specific than the main site Worker):

   ```text
   krumath.com/tugofwar*  →  krumath-tugofwar
   ```

4. Smoke-test:
   - Signed-out host → `/sign-in?returnUrl=/tugofwar`
   - Signed-in host → game + QR in headers
   - Scan QR on phone → keypad; second scan → already used
   - Assets at `/tugofwar/assets/...`

5. **Maintainer (Phase C, separate PR):** add home entry on `krumath.com/home` linking to `/tugofwar`.
