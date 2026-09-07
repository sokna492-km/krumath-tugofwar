import { CONTROLLER_RATE_LIMIT, CONTROLLER_RATE_WINDOW_MS } from "@/lib/constants";
import {
  createInitialState,
  gameReducer,
  type GameAction,
  type GameState,
  type Side,
} from "@/lib/game";
import type { GradeBand } from "@/lib/math";
import type { ClientMessage, PublicClaims, PublicRoomSnapshot } from "@/lib/room-protocol";

export type RoomSecrets = {
  blueClaimToken: string;
  redClaimToken: string;
  blueSessionSecret: string | null;
  redSessionSecret: string | null;
};

export type RoomModel = {
  roomId: string;
  gameState: GameState;
  secrets: RoomSecrets;
  /** connectionKey → recent actionIds (idempotency) */
  seenActionIds: Map<string, string[]>;
  /** connectionKey → action timestamps (rate limit) */
  actionTimestamps: Map<string, number[]>;
};

export type RandomTokenFn = () => string;

export function randomToken128(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function createRoomModel(
  roomId: string,
  randomToken: RandomTokenFn = randomToken128,
): RoomModel {
  return {
    roomId,
    gameState: createInitialState("4-5"),
    secrets: {
      blueClaimToken: randomToken(),
      redClaimToken: randomToken(),
      blueSessionSecret: null,
      redSessionSecret: null,
    },
    seenActionIds: new Map(),
    actionTimestamps: new Map(),
  };
}

export function publicClaims(room: RoomModel): PublicClaims {
  return {
    blue: { claimed: room.secrets.blueSessionSecret !== null },
    red: { claimed: room.secrets.redSessionSecret !== null },
  };
}

export function toPublicSnapshot(room: RoomModel): PublicRoomSnapshot {
  return {
    roomId: room.roomId,
    gameState: room.gameState,
    claims: publicClaims(room),
  };
}

export function isSideClaimed(room: RoomModel, side: Side): boolean {
  return side === "blue"
    ? room.secrets.blueSessionSecret !== null
    : room.secrets.redSessionSecret !== null;
}

export type ClaimResult =
  | {
      ok: true;
      side: Side;
      sessionSecret: string;
      room: RoomModel;
    }
  | {
      ok: false;
      error: "claimAlreadyUsed" | "invalidClaim";
      room: RoomModel;
    };

export function claimWithToken(
  room: RoomModel,
  claimToken: string,
  randomToken: RandomTokenFn = randomToken128,
): ClaimResult {
  if (claimToken === room.secrets.blueClaimToken) {
    if (room.secrets.blueSessionSecret !== null) {
      return { ok: false, error: "claimAlreadyUsed", room };
    }
    const sessionSecret = randomToken();
    const next: RoomModel = {
      ...room,
      secrets: { ...room.secrets, blueSessionSecret: sessionSecret },
    };
    return { ok: true, side: "blue", sessionSecret, room: next };
  }
  if (claimToken === room.secrets.redClaimToken) {
    if (room.secrets.redSessionSecret !== null) {
      return { ok: false, error: "claimAlreadyUsed", room };
    }
    const sessionSecret = randomToken();
    const next: RoomModel = {
      ...room,
      secrets: { ...room.secrets, redSessionSecret: sessionSecret },
    };
    return { ok: true, side: "red", sessionSecret, room: next };
  }
  return { ok: false, error: "invalidClaim", room };
}

export type ReconnectResult =
  | { ok: true; side: Side; room: RoomModel }
  | { ok: false; error: "invalidSession"; room: RoomModel };

/** Reconnect with sessionSecret only — claimToken cannot take over a claimed side. */
export function reconnectWithSession(room: RoomModel, sessionSecret: string): ReconnectResult {
  if (room.secrets.blueSessionSecret !== null && sessionSecret === room.secrets.blueSessionSecret) {
    return { ok: true, side: "blue", room };
  }
  if (room.secrets.redSessionSecret !== null && sessionSecret === room.secrets.redSessionSecret) {
    return { ok: true, side: "red", room };
  }
  return { ok: false, error: "invalidSession", room };
}

/**
 * If side already claimed and phone sends claimToken again with matching session,
 * treat as reconnect rather than alreadyClaimed.
 */
export function claimOrReconnect(
  room: RoomModel,
  claimToken: string,
  sessionSecret: string | undefined,
  randomToken: RandomTokenFn = randomToken128,
): ClaimResult | (ReconnectResult & { sessionSecret?: string }) {
  if (sessionSecret) {
    const recon = reconnectWithSession(room, sessionSecret);
    if (recon.ok) {
      return { ...recon, sessionSecret };
    }
  }

  const claimed =
    claimToken === room.secrets.blueClaimToken
      ? room.secrets.blueSessionSecret !== null
      : claimToken === room.secrets.redClaimToken
        ? room.secrets.redSessionSecret !== null
        : false;

  if (claimed) {
    return { ok: false, error: "claimAlreadyUsed", room };
  }

  return claimWithToken(room, claimToken, randomToken);
}

const HOST_ONLY = new Set(["grade", "playAgain", "resetAll"]);

export type ApplyActionError = "unauthorized" | "rateLimited" | "rejected" | "malformed";

export type ApplyActionResult =
  | {
      ok: true;
      room: RoomModel;
      /** Side that just started shaking (needs DO timer clear). */
      shakeSide: Side | null;
    }
  | { ok: false; error: ApplyActionError; room: RoomModel };

function rememberActionId(
  room: RoomModel,
  connectionKey: string,
  actionId: string,
): { room: RoomModel; duplicate: boolean } {
  const prev = room.seenActionIds.get(connectionKey) ?? [];
  if (prev.includes(actionId)) {
    return { room, duplicate: true };
  }
  const nextIds = [...prev, actionId].slice(-64);
  const seenActionIds = new Map(room.seenActionIds);
  seenActionIds.set(connectionKey, nextIds);
  return { room: { ...room, seenActionIds }, duplicate: false };
}

function checkRateLimit(
  room: RoomModel,
  connectionKey: string,
  now: number,
): { room: RoomModel; limited: boolean } {
  const prev = room.actionTimestamps.get(connectionKey) ?? [];
  const recent = prev.filter((t) => now - t < CONTROLLER_RATE_WINDOW_MS);
  if (recent.length >= CONTROLLER_RATE_LIMIT) {
    const actionTimestamps = new Map(room.actionTimestamps);
    actionTimestamps.set(connectionKey, recent);
    return { room: { ...room, actionTimestamps }, limited: true };
  }
  const actionTimestamps = new Map(room.actionTimestamps);
  actionTimestamps.set(connectionKey, [...recent, now]);
  return { room: { ...room, actionTimestamps }, limited: false };
}

function toGameAction(
  action: Extract<ClientMessage, { type: "action" }>["action"],
  side: Side,
): GameAction | null {
  switch (action.type) {
    case "digit":
      if (typeof action.digit !== "string") return null;
      return { type: "digit", side, digit: action.digit };
    case "backspace":
      return { type: "backspace", side };
    case "toggleSign":
      return { type: "toggleSign", side };
    case "submit":
      return { type: "submit", side };
    case "grade":
      return { type: "grade", band: action.band as GradeBand };
    case "playAgain":
      return { type: "playAgain" };
    case "resetAll":
      return { type: "resetAll" };
    default:
      return null;
  }
}

/**
 * Apply a client action. Controller side is taken from the authenticated session —
 * never from the client payload. Host may only input on unclaimed sides.
 * Disconnect does not clear claims (caller must not call unclaim).
 */
export function applyRoomAction(
  room: RoomModel,
  opts: {
    role: "host" | "controller";
    /** Bound side for controllers; ignored for host. */
    controllerSide: Side | null;
    connectionKey: string;
    actionId: string;
    action: Extract<ClientMessage, { type: "action" }>["action"];
    now?: number;
  },
): ApplyActionResult {
  const now = opts.now ?? Date.now();
  let next = room;

  const deduped = rememberActionId(next, opts.connectionKey, opts.actionId);
  next = deduped.room;
  if (deduped.duplicate) {
    return { ok: true, room: next, shakeSide: null };
  }

  if (opts.role === "controller") {
    const limited = checkRateLimit(next, opts.connectionKey, now);
    next = limited.room;
    if (limited.limited) {
      return { ok: false, error: "rateLimited", room: next };
    }
    if (HOST_ONLY.has(opts.action.type)) {
      return { ok: false, error: "unauthorized", room: next };
    }
    if (!opts.controllerSide) {
      return { ok: false, error: "unauthorized", room: next };
    }
  }

  let sideForInput: Side | null = null;
  if (opts.role === "controller") {
    sideForInput = opts.controllerSide;
  } else if (
    opts.action.type === "digit" ||
    opts.action.type === "backspace" ||
    opts.action.type === "toggleSign" ||
    opts.action.type === "submit"
  ) {
    const requested = opts.action.side;
    if (requested !== "blue" && requested !== "red") {
      return { ok: false, error: "malformed", room: next };
    }
    if (isSideClaimed(next, requested)) {
      return { ok: false, error: "unauthorized", room: next };
    }
    sideForInput = requested;
  }

  let gameAction: GameAction | null = null;
  if (
    opts.action.type === "grade" ||
    opts.action.type === "playAgain" ||
    opts.action.type === "resetAll"
  ) {
    if (opts.role !== "host") {
      return { ok: false, error: "unauthorized", room: next };
    }
    gameAction = toGameAction(opts.action, "blue");
  } else if (sideForInput) {
    gameAction = toGameAction(opts.action, sideForInput);
  } else {
    return { ok: false, error: "malformed", room: next };
  }

  if (!gameAction) {
    return { ok: false, error: "malformed", room: next };
  }

  const before =
    sideForInput === "blue"
      ? next.gameState.blue
      : sideForInput === "red"
        ? next.gameState.red
        : null;

  const gameState = gameReducer(next.gameState, gameAction);
  next = { ...next, gameState };

  let shakeSide: Side | null = null;
  if (
    gameAction.type === "submit" &&
    sideForInput &&
    before &&
    !before.shaking &&
    gameState[sideForInput].shaking
  ) {
    shakeSide = sideForInput;
  }

  return { ok: true, room: next, shakeSide };
}

/** Claims survive playAgain / resetAll — only gameState changes. */
export function applyClearShake(room: RoomModel, side: Side): RoomModel {
  return {
    ...room,
    gameState: gameReducer(room.gameState, { type: "clearShake", side }),
  };
}
