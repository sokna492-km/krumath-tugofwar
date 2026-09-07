import { createFileRoute } from "@tanstack/react-router";
import { randomToken128 } from "@/lib/room-logic";

/** Server-generated room id (crypto 128-bit). Claim tokens minted when host connects to DO. */
export const Route = createFileRoute("/api/room/create")({
  server: {
    handlers: {
      POST: async () => {
        const roomId = randomToken128();
        return Response.json({ roomId });
      },
    },
  },
});
