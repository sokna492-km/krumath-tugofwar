import type { GameState, Side } from "@/lib/game";
import type { GradeBand } from "@/lib/math";

export type ClientRole = "host" | "controller";

export type ControllerStatus =
  | "connecting"
  | "connected"
  | "claimed"
  | "reconnecting"
  | "roomExpired"
  | "claimAlreadyUsed"
  | "invalidClaim";

export type PublicClaims = {
  blue: { claimed: boolean };
  red: { claimed: boolean };
};

export type PublicRoomSnapshot = {
  roomId: string;
  gameState: GameState;
  claims: PublicClaims;
};

/** Host-only — never broadcast claim tokens to controllers. */
export type HostHello = {
  type: "hostHello";
  roomId: string;
  gameState: GameState;
  claims: PublicClaims;
  claimTokens: { blue: string; red: string };
};

export type SnapshotMessage = {
  type: "snapshot";
  roomId: string;
  gameState: GameState;
  claims: PublicClaims;
};

export type ClaimedMessage = {
  type: "claimed";
  side: Side;
  sessionSecret: string;
  roomId: string;
  gameState: GameState;
  claims: PublicClaims;
};

export type ErrorMessage = {
  type: "error";
  code:
    | "claimAlreadyUsed"
    | "invalidClaim"
    | "invalidSession"
    | "unauthorized"
    | "rateLimited"
    | "roomExpired"
    | "malformed"
    | "rejected";
  message?: string;
};

export type ServerMessage =
  HostHello | SnapshotMessage | ClaimedMessage | ErrorMessage | { type: "pong" };

export type ControllerInputType = "digit" | "backspace" | "toggleSign" | "submit";

export type ClientMessage =
  | { type: "hello"; role: "host" }
  | {
      type: "hello";
      role: "controller";
      claimToken: string;
      sessionSecret?: string;
    }
  | {
      type: "action";
      actionId: string;
      action:
        | { type: "digit"; digit: string; side?: Side }
        | { type: "backspace"; side?: Side }
        | { type: "toggleSign"; side?: Side }
        | { type: "submit"; side?: Side }
        | { type: "grade"; band: GradeBand }
        | { type: "playAgain" }
        | { type: "resetAll" };
    }
  | { type: "ping" };

export function parseClientMessage(raw: string): ClientMessage | null {
  try {
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object") return null;
    const msg = data as ClientMessage;
    if (msg.type === "ping") return msg;
    if (msg.type === "hello") {
      if (msg.role === "host") return msg;
      if (
        msg.role === "controller" &&
        typeof msg.claimToken === "string" &&
        msg.claimToken.length > 0
      ) {
        return msg;
      }
      return null;
    }
    if (msg.type === "action") {
      if (typeof msg.actionId !== "string" || msg.actionId.length === 0) return null;
      if (!msg.action || typeof msg.action !== "object") return null;
      return msg;
    }
    return null;
  } catch {
    return null;
  }
}
