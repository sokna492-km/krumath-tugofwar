import { useCallback, useEffect, useRef, useState } from "react";
import type { GameAction, GameState } from "@/lib/game";
import { buildClaimUrl } from "@/lib/host-urls";
import type { PublicClaims, ServerMessage } from "@/lib/room-protocol";
import {
  devMockClaimUrls,
  devMockClaims,
  emptyClaims,
  nextActionId,
  wsUrlForRoom,
} from "@/lib/room-dev-mocks";

export type HostRoomState = {
  connected: boolean;
  roomId: string | null;
  claimUrls: { blue: string; red: string } | null;
  claims: PublicClaims;
  remoteState: GameState | null;
};

/**
 * Host: create room, connect WS, send actions when connected.
 * Without a Durable Object (local Vite), falls back to local gameReducer + DEV mock QR URLs.
 */
export function useHostRoom() {
  const [room, setRoom] = useState<HostRoomState>({
    connected: false,
    roomId: null,
    claimUrls: null,
    claims: emptyClaims,
    remoteState: null,
  });
  const wsRef = useRef<WebSocket | null>(null);
  const actionCounter = useRef({ n: 0 });

  useEffect(() => {
    let cancelled = false;
    let ws: WebSocket | null = null;

    async function connect() {
      try {
        const base = import.meta.env.BASE_URL || "/";
        const createPath = `${base}api/room/create`.replace(/\/{2,}/g, "/");
        const res = await fetch(createPath.startsWith("/") ? createPath : `/${createPath}`, {
          method: "POST",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { roomId?: string };
        if (!data.roomId || cancelled) return;

        const url = wsUrlForRoom(data.roomId);
        ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          ws?.send(JSON.stringify({ type: "hello", role: "host" }));
        };

        ws.onmessage = (ev) => {
          let msg: ServerMessage;
          try {
            msg = JSON.parse(String(ev.data)) as ServerMessage;
          } catch {
            return;
          }
          if (msg.type === "hostHello") {
            setRoom({
              connected: true,
              roomId: msg.roomId,
              claimUrls: {
                blue: buildClaimUrl(msg.claimTokens.blue, msg.roomId),
                red: buildClaimUrl(msg.claimTokens.red, msg.roomId),
              },
              claims: msg.claims,
              remoteState: msg.gameState,
            });
            return;
          }
          if (msg.type === "snapshot") {
            setRoom((prev) => ({
              ...prev,
              connected: true,
              roomId: msg.roomId,
              claims: msg.claims,
              remoteState: msg.gameState,
            }));
          }
        };

        ws.onclose = () => {
          wsRef.current = null;
          setRoom((prev) => ({
            ...prev,
            connected: false,
          }));
        };
      } catch {
        // Local DEV without DO — stay in local reducer fallback.
      }
    }

    void connect();

    return () => {
      cancelled = true;
      ws?.close();
      wsRef.current = null;
    };
  }, []);

  const sendAction = useCallback((action: GameAction) => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    if (action.type === "clearShake") return false;
    const payload = {
      type: "action" as const,
      actionId: nextActionId(actionCounter.current),
      action:
        action.type === "digit"
          ? { type: "digit" as const, digit: action.digit, side: action.side }
          : action.type === "backspace" || action.type === "toggleSign" || action.type === "submit"
            ? { type: action.type, side: action.side }
            : action.type === "grade"
              ? { type: "grade" as const, band: action.band }
              : action.type === "playAgain"
                ? { type: "playAgain" as const }
                : { type: "resetAll" as const },
    };
    socket.send(JSON.stringify(payload));
    return true;
  }, []);

  return {
    ...room,
    claimUrls: room.claimUrls ?? (import.meta.env.DEV ? devMockClaimUrls() : null),
    claims: room.connected || !import.meta.env.DEV ? room.claims : devMockClaims(),
    sendAction,
  };
}
