import { DurableObject } from "cloudflare:workers";
import { SHAKE_MS } from "@/lib/constants";
import {
  applyClearShake,
  applyRoomAction,
  claimOrReconnect,
  createRoomModel,
  toPublicSnapshot,
  type RoomModel,
  type RoomSecrets,
} from "@/lib/room-logic";
import type { GameState, Side } from "@/lib/game";
import {
  parseClientMessage,
  type ServerMessage,
} from "@/lib/room-protocol";

type ConnAttachment = {
  connectionId: string;
  role: "host" | "controller" | "pending";
  side: Side | null;
};

type PersistedRoom = {
  roomId: string;
  gameState: GameState;
  secrets: RoomSecrets;
};

export type TugEnv = {
  TUG_ROOMS: DurableObjectNamespace;
};

export class TugRoom extends DurableObject<TugEnv> {
  private room: RoomModel | null = null;
  private shakeTimers: Partial<Record<Side, ReturnType<typeof setTimeout>>> = {};

  private async persistRoom(): Promise<void> {
    if (!this.room) return;
    const payload: PersistedRoom = {
      roomId: this.room.roomId,
      gameState: this.room.gameState,
      secrets: this.room.secrets,
    };
    await this.ctx.storage.put("room", payload);
  }

  private async loadRoom(): Promise<RoomModel | null> {
    if (this.room) return this.room;
    const stored = await this.ctx.storage.get<PersistedRoom>("room");
    if (!stored) return null;
    this.room = {
      roomId: stored.roomId,
      gameState: stored.gameState,
      secrets: stored.secrets,
      seenActionIds: new Map(),
      actionTimestamps: new Map(),
    };
    return this.room;
  }

  /** Load persisted room or create once — never recreate tokens on hibernation wake. */
  private async ensureRoom(roomId: string): Promise<RoomModel> {
    const loaded = await this.loadRoom();
    if (loaded) return loaded;
    this.room = createRoomModel(roomId);
    await this.persistRoom();
    return this.room;
  }

  private send(ws: WebSocket, msg: ServerMessage) {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // ignore closed sockets
    }
  }

  private broadcast(msg: ServerMessage) {
    for (const ws of this.ctx.getWebSockets()) {
      this.send(ws, msg);
    }
  }

  private broadcastSnapshot() {
    if (!this.room) return;
    const snap = toPublicSnapshot(this.room);
    this.broadcast({
      type: "snapshot",
      roomId: snap.roomId,
      gameState: snap.gameState,
      claims: snap.claims,
    });
  }

  private scheduleShakeClear(side: Side) {
    const existing = this.shakeTimers[side];
    if (existing !== undefined) clearTimeout(existing);
    this.shakeTimers[side] = setTimeout(() => {
      void (async () => {
        delete this.shakeTimers[side];
        if (!this.room) await this.loadRoom();
        if (!this.room) return;
        this.room = applyClearShake(this.room, side);
        await this.persistRoom();
        this.broadcastSnapshot();
      })();
    }, SHAKE_MS);
  }

  override async fetch(request: Request): Promise<Response> {
    const upgrade = request.headers.get("Upgrade");
    if (!upgrade || upgrade.toLowerCase() !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    const url = new URL(request.url);
    const roomId = url.searchParams.get("roomId");
    if (!roomId) {
      return new Response("Missing roomId", { status: 400 });
    }

    await this.ensureRoom(roomId);

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    const attachment: ConnAttachment = {
      connectionId: crypto.randomUUID(),
      role: "pending",
      side: null,
    };
    server.serializeAttachment(attachment);
    this.ctx.acceptWebSocket(server);

    return new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    const text =
      typeof message === "string" ? message : new TextDecoder().decode(message);
    const parsed = parseClientMessage(text);
    if (!parsed) {
      this.send(ws, { type: "error", code: "malformed" });
      return;
    }

    const attachment = (ws.deserializeAttachment() ?? {
      connectionId: crypto.randomUUID(),
      role: "pending",
      side: null,
    }) as ConnAttachment;

    if (!this.room) {
      await this.loadRoom();
    }
    if (!this.room) {
      this.send(ws, { type: "error", code: "roomExpired" });
      return;
    }

    if (parsed.type === "ping") {
      this.send(ws, { type: "pong" });
      return;
    }

    if (parsed.type === "hello") {
      if (parsed.role === "host") {
        attachment.role = "host";
        attachment.side = null;
        ws.serializeAttachment(attachment);
        const snap = toPublicSnapshot(this.room);
        this.send(ws, {
          type: "hostHello",
          roomId: snap.roomId,
          gameState: snap.gameState,
          claims: snap.claims,
          claimTokens: {
            blue: this.room.secrets.blueClaimToken,
            red: this.room.secrets.redClaimToken,
          },
        });
        return;
      }

      const result = claimOrReconnect(
        this.room,
        parsed.claimToken,
        parsed.sessionSecret,
      );
      if (!result.ok) {
        this.send(ws, {
          type: "error",
          code: result.error === "invalidSession" ? "invalidClaim" : result.error,
        });
        return;
      }
      this.room = result.room;
      await this.persistRoom();
      attachment.role = "controller";
      attachment.side = result.side;
      ws.serializeAttachment(attachment);

      const sessionSecret =
        "sessionSecret" in result && typeof result.sessionSecret === "string"
          ? result.sessionSecret
          : parsed.sessionSecret;

      if (!sessionSecret) {
        this.send(ws, { type: "error", code: "invalidClaim" });
        return;
      }

      const snap = toPublicSnapshot(this.room);
      this.send(ws, {
        type: "claimed",
        side: result.side,
        sessionSecret,
        roomId: snap.roomId,
        gameState: snap.gameState,
        claims: snap.claims,
      });
      this.broadcastSnapshot();
      return;
    }

    if (parsed.type === "action") {
      if (attachment.role === "pending") {
        this.send(ws, { type: "error", code: "unauthorized" });
        return;
      }

      const result = applyRoomAction(this.room, {
        role: attachment.role,
        controllerSide: attachment.side,
        connectionKey: attachment.connectionId,
        actionId: parsed.actionId,
        action: parsed.action,
      });

      this.room = result.room;
      await this.persistRoom();

      if (!result.ok) {
        this.send(ws, { type: "error", code: result.error });
        return;
      }

      if (result.shakeSide) {
        this.scheduleShakeClear(result.shakeSide);
      }
      this.broadcastSnapshot();
    }
  }

  override async webSocketClose(ws: WebSocket, code: number, reason: string) {
    // Disconnect ≠ unclaim — leave room.secrets intact (persisted).
    try {
      ws.close(code, reason);
    } catch {
      // already closed
    }
  }

  override async webSocketError(ws: WebSocket) {
    try {
      ws.close(1011, "error");
    } catch {
      // ignore
    }
  }
}
