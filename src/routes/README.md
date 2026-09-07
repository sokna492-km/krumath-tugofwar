# Routes

TanStack Start uses **file-based routing**. Every `.tsx` file in this directory
defines a route. The only root layout is `src/routes/__root.tsx`.
`routeTree.gen.ts` is auto-generated — do not edit it by hand.

## App routes (base `/tugofwar/`)

| File                        | URL                                                           |
| --------------------------- | ------------------------------------------------------------- |
| `index.tsx`                 | `/` — host game (hard auth gate in production)                |
| `c.$roomId.$claimToken.tsx` | `/c/:roomId/:claimToken` — phone controller                   |
| `api/room.create.ts`        | `POST /api/room/create` — mint room id                        |
| `api/room.$roomId.ts`       | `GET /api/room/:roomId` — WebSocket upgrade to Durable Object |
| `__root.tsx`                | App shell (HTML, meta, 404 / error UI)                        |

## Conventions (TanStack)

| Pattern      | Meaning                            |
| ------------ | ---------------------------------- |
| `$param.tsx` | Dynamic segment                    |
| `api/*.ts`   | API / server handlers              |
| `__root.tsx` | Root shell — preserve `<Outlet />` |
