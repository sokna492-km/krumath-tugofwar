import { useCallback, useEffect, useRef, useState } from "react";
import type { GameState, Side } from "@/lib/game";
import type { ControllerStatus, PublicClaims, ServerMessage } from "@/lib/room-protocol";
import { emptyClaims, nextActionId, SESSION_KEY_PREFIX, wsUrlForRoom } from "@/lib/room-dev-mocks";

export type ControllerRoomState = {
  status: ControllerStatus;
  side: Side | null;
  gameState: GameState | null;
  claims: PublicClaims;
};

/** Phone controller: claim / reconnect via claimToken + sessionSecret. */
export function useControllerRoom(claimToken: string, roomId: string | null) {
  const [state, setState] = useState<ControllerRoomState>({
    status: "connecting",
    side: null,
    gameState: null,
    claims: emptyClaims,
  });
  const wsRef = useRef<WebSocket | null>(null);
  const actionCounter = useRef({ n: 0 });
  const sideRef = useRef<Side | null>(null);

  useEffect(() => {
    if (!roomId || !claimToken) {
      setState((s) => ({ ...s, status: "invalidClaim" }));
      return;
    }

    let cancelled = false;
    const storageKey = `${SESSION_KEY_PREFIX}${claimToken}`;
    const existingSecret =
      typeof localStorage !== "undefined" ? localStorage.getItem(storageKey) : null;

    setState((s) => ({
      ...s,
      status: existingSecret ? "reconnecting" : "connecting",
    }));

    const url = wsUrlForRoom(roomId);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (cancelled) return;
      setState((s) => ({ ...s, status: "connected" }));
      const hello: {
        type: "hello";
        role: "controller";
        claimToken: string;
        sessionSecret?: string;
      } = {
        type: "hello",
        role: "controller",
        claimToken,
      };
      if (existingSecret) hello.sessionSecret = existingSecret;
      ws.send(JSON.stringify(hello));
    };

    ws.onmessage = (ev) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(String(ev.data)) as ServerMessage;
      } catch {
        return;
      }
      if (msg.type === "claimed") {
        try {
          localStorage.setItem(storageKey, msg.sessionSecret);
        } catch {
          // ignore quota
        }
        sideRef.current = msg.side;
        setState({
          status: "claimed",
          side: msg.side,
          gameState: msg.gameState,
          claims: msg.claims,
        });
        return;
      }
      if (msg.type === "snapshot") {
        setState((prev) => ({
          ...prev,
          status: prev.side ? "claimed" : prev.status,
          gameState: msg.gameState,
          claims: msg.claims,
        }));
        return;
      }
      if (msg.type === "error") {
        if (msg.code === "claimAlreadyUsed") {
          setState((s) => ({ ...s, status: "claimAlreadyUsed" }));
        } else if (msg.code === "roomExpired") {
          setState((s) => ({ ...s, status: "roomExpired" }));
        } else if (msg.code === "invalidClaim" || msg.code === "invalidSession") {
          try {
            localStorage.removeItem(storageKey);
          } catch {
            // ignore
          }
          setState((s) => ({ ...s, status: "invalidClaim" }));
        }
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      setState((prev) => {
        if (
          prev.status === "claimAlreadyUsed" ||
          prev.status === "invalidClaim" ||
          prev.status === "roomExpired"
        ) {
          return prev;
        }
        if (prev.side) {
          return { ...prev, status: "reconnecting" };
        }
        return { ...prev, status: "roomExpired" };
      });
    };

    return () => {
      cancelled = true;
      ws.close();
      wsRef.current = null;
    };
  }, [claimToken, roomId]);

  const sendInput = useCallback(
    (
      action:
        | { type: "digit"; digit: string }
        | { type: "backspace" }
        | { type: "toggleSign" }
        | { type: "submit" },
    ) => {
      const socket = wsRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) return;
      if (!sideRef.current) return;
      socket.send(
        JSON.stringify({
          type: "action",
          actionId: nextActionId(actionCounter.current),
          action,
        }),
      );
    },
    [],
  );

  return { ...state, sendInput };
}
