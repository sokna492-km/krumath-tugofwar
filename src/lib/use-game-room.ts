import { useCallback, useEffect, useRef, useState } from "react";
import type { GameAction, GameState, Side } from "@/lib/game";
import { buildClaimUrl } from "@/lib/krumathUrls";
import type {
  ControllerStatus,
  PublicClaims,
  ServerMessage,
} from "@/lib/room-protocol";

function wsUrlForRoom(roomId: string): string {
  const base = import.meta.env.BASE_URL || "/";
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const path = `${base}api/room/${encodeURIComponent(roomId)}`.replace(
    /\/{2,}/g,
    "/",
  );
  return `${proto}//${window.location.host}${path.startsWith("/") ? path : `/${path}`}`;
}

function nextActionId(counter: { n: number }): string {
  counter.n += 1;
  return `a_${counter.n}_${Date.now()}`;
}

export type HostRoomState = {
  connected: boolean;
  roomId: string | null;
  claimUrls: { blue: string; red: string } | null;
  claims: PublicClaims;
  remoteState: GameState | null;
};

const emptyClaims: PublicClaims = {
  blue: { claimed: false },
  red: { claimed: false },
};

/** Fake QR targets for local UI work — phones cannot join without a real DO room. */
function devMockClaimUrls(): { blue: string; red: string } {
  return {
    blue: buildClaimUrl("dev-blue-token", "dev-room"),
    red: buildClaimUrl("dev-red-token", "dev-room"),
  };
}

/** Host: create room, connect WS, send actions when connected. */
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
          : action.type === "backspace" ||
              action.type === "toggleSign" ||
              action.type === "submit"
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
    // DEV: fake URLs so QR UI is editable without a Durable Object.
    claimUrls:
      room.claimUrls ?? (import.meta.env.DEV ? devMockClaimUrls() : null),
    // DEV: mark blue claimed so host "connected" checkmark UI is visible; red stays scannable.
    claims:
      room.connected || !import.meta.env.DEV
        ? room.claims
        : { blue: { claimed: true }, red: { claimed: false } },
    sendAction,
  };
}

const SESSION_KEY_PREFIX = "tugofwar_session_";

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
      typeof localStorage !== "undefined"
        ? localStorage.getItem(storageKey)
        : null;

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
        } else if (
          msg.code === "invalidClaim" ||
          msg.code === "invalidSession"
        ) {
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
