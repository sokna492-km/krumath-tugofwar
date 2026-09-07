// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import type { Plugin } from "vite";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const APP_BASE = "/tugofwar/";

/**
 * `cloudflare:workers` only exists in the Workers runtime.
 * During `vite dev`, stub it so exporting TugRoom from src/server.ts does not crash SSR.
 *
 * Do NOT list `cloudflare:workers` in `ssr.external` for serve — that skips this stub
 * and Node fails with "Cannot find module 'cloudflare:workers'".
 * Production build still externalizes via rolldownOptions.external below.
 */
function stubCloudflareWorkersDev(): Plugin {
  const virtual = "\0cloudflare:workers-dev-stub";
  return {
    name: "stub-cloudflare-workers-dev",
    apply: "serve",
    enforce: "pre",
    resolveId(id) {
      if (id === "cloudflare:workers") return virtual;
    },
    load(id) {
      if (id !== virtual) return;
      return `
        export class DurableObject {
          constructor(ctx, env) {
            this.ctx = ctx;
            this.env = env;
          }
        }
        export const env = new Proxy({}, { get: () => undefined });
      `;
    },
  };
}

export default defineConfig({
  vite: {
    base: APP_BASE,
    plugins: [stubCloudflareWorkersDev()],
    build: {
      rolldownOptions: {
        external: ["cloudflare:workers"],
      },
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  nitro: {
    // cloudflare-module via lovable defaults; pin base for krumath.com/tugofwar
    preset: "cloudflare-module",
  },
});
