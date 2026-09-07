import type { Side } from "@/lib/game";
import { buildClaimUrl } from "@/lib/host-urls";
import type { PublicClaims } from "@/lib/room-protocol";

export const emptyClaims: PublicClaims = {
  blue: { claimed: false },
  red: { claimed: false },
};

export function wsUrlForRoom(roomId: string): string {
  const base = import.meta.env.BASE_URL || "/";
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const path = `${base}api/room/${encodeURIComponent(roomId)}`.replace(/\/{2,}/g, "/");
  return `${proto}//${window.location.host}${path.startsWith("/") ? path : `/${path}`}`;
}

export function nextActionId(counter: { n: number }): string {
  counter.n += 1;
  return `a_${counter.n}_${Date.now()}`;
}

/** Fake QR targets for local UI work — phones cannot join without a real DO room. */
export function devMockClaimUrls(): { blue: string; red: string } {
  return {
    blue: buildClaimUrl("dev-blue-token", "dev-room"),
    red: buildClaimUrl("dev-red-token", "dev-room"),
  };
}

/** DEV: mark blue claimed so host "connected" checkmark UI is visible. */
export function devMockClaims(): PublicClaims {
  return { blue: { claimed: true }, red: { claimed: false } };
}

export const SESSION_KEY_PREFIX = "tugofwar_session_";

export type { Side };
