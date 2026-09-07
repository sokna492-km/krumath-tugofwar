# Contributing

Thanks for helping improve Math Tug-of-War.

## Setup

1. Fork and clone the repo.
2. `npm i`
3. `cp .env.example .env` (optional for local DEV).
4. `npm run dev` → open `/tugofwar/`.

## Checks before a PR

```sh
npm test
npm run lint
npm run build
```

## Guidelines

- Keep changes focused; match existing TypeScript / React style.
- Do not commit `.env`, `.dev.vars`, keys, or real Supabase credentials.
- QR / Durable Object rooms need a Cloudflare Worker deploy; local Vite uses on-screen keypads (and DEV mock QR URLs) without a real DO.
- App base path lives in `src/lib/app-config.ts` — keep Vite `base` and `scripts/patch-do-export.mjs` aligned when changing it.

## Pull requests

- Describe **why** the change exists.
- Note how you tested (unit tests, local DEV, deployed Worker).
- Link related issues when applicable.

By contributing, you agree your contributions are licensed under the MIT License.
