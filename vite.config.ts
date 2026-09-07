import type { Plugin } from "vite";
import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";
import { APP_BASE } from "./src/lib/app-config";

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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const envDefine: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  return {
    base: APP_BASE,
    define: envDefine,
    resolve: {
      alias: { "@": `${process.cwd()}/src` },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
    },
    build: {
      rolldownOptions: {
        external: ["cloudflare:workers"],
      },
    },
    plugins: [
      stubCloudflareWorkersDev(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      tailwindcss(),
      tanstackStart({
        server: { entry: "server" },
        importProtection: {
          behavior: "error",
          client: {
            files: ["**/server/**"],
            specifiers: ["server-only"],
          },
        },
      }),
      nitro({
        preset: "cloudflare-module",
        cloudflare: {
          nodeCompat: true,
          deployConfig: true,
        },
      }),
      viteReact(),
    ],
  };
});
