import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/room/$roomId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const upgrade = request.headers.get("Upgrade");
        if (!upgrade || upgrade.toLowerCase() !== "websocket") {
          return new Response("Expected Upgrade: websocket", { status: 426 });
        }

        try {
          // Cloudflare Workers binding — unavailable in plain Vite without DO.
          const { env } = await import("cloudflare:workers");
          const rooms = (env as { TUG_ROOMS?: DurableObjectNamespace }).TUG_ROOMS;
          if (!rooms) {
            return new Response("Room service unavailable", { status: 503 });
          }
          const id = rooms.idFromName(params.roomId);
          const stub = rooms.get(id);
          const url = new URL(request.url);
          url.searchParams.set("roomId", params.roomId);
          return stub.fetch(new Request(url.toString(), request));
        } catch {
          return new Response("Room service unavailable", { status: 503 });
        }
      },
    },
  },
});
