import { describe, expect, it } from "vitest";
import {
  applyClearShake,
  applyRoomAction,
  claimOrReconnect,
  claimWithToken,
  createRoomModel,
  isSideClaimed,
  publicClaims,
  reconnectWithSession,
  toPublicSnapshot,
} from "@/lib/room-logic";

const tokens = (() => {
  let n = 0;
  return () => `tok_${++n}`;
})();

function freshRoom() {
  return createRoomModel("room_test", tokens);
}

describe("room claim / reconnect", () => {
  it("claims blue then rejects second blue claim", () => {
    let room = freshRoom();
    const blueTok = room.secrets.blueClaimToken;
    const first = claimWithToken(room, blueTok, tokens);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    room = first.room;
    expect(first.side).toBe("blue");
    expect(first.sessionSecret).toBeTruthy();

    const second = claimWithToken(room, blueTok, tokens);
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.error).toBe("claimAlreadyUsed");
  });

  it("claims red independently", () => {
    let room = freshRoom();
    const blue = claimWithToken(room, room.secrets.blueClaimToken, tokens);
    expect(blue.ok).toBe(true);
    if (!blue.ok) return;
    room = blue.room;
    const red = claimWithToken(room, room.secrets.redClaimToken, tokens);
    expect(red.ok).toBe(true);
    if (!red.ok) return;
    expect(red.side).toBe("red");
    expect(publicClaims(red.room).blue.claimed).toBe(true);
    expect(publicClaims(red.room).red.claimed).toBe(true);
  });

  it("rejects invalid token", () => {
    const room = freshRoom();
    const result = claimWithToken(room, "nope", tokens);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("invalidClaim");
  });

  it("reconnects with session secret", () => {
    let room = freshRoom();
    const claimed = claimWithToken(room, room.secrets.blueClaimToken, tokens);
    expect(claimed.ok).toBe(true);
    if (!claimed.ok) return;
    room = claimed.room;
    const recon = reconnectWithSession(room, claimed.sessionSecret);
    expect(recon.ok).toBe(true);
    if (!recon.ok) return;
    expect(recon.side).toBe("blue");
  });

  it("rejects wrong session", () => {
    let room = freshRoom();
    const claimed = claimWithToken(room, room.secrets.blueClaimToken, tokens);
    expect(claimed.ok).toBe(true);
    if (!claimed.ok) return;
    room = claimed.room;
    const recon = reconnectWithSession(room, "wrong");
    expect(recon.ok).toBe(false);
    if (recon.ok) return;
    expect(recon.error).toBe("invalidSession");
  });

  it("claimOrReconnect with session reconnects instead of alreadyClaimed", () => {
    let room = freshRoom();
    const tok = room.secrets.blueClaimToken;
    const claimed = claimWithToken(room, tok, tokens);
    expect(claimed.ok).toBe(true);
    if (!claimed.ok) return;
    room = claimed.room;
    const again = claimOrReconnect(room, tok, claimed.sessionSecret, tokens);
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.side).toBe("blue");
  });
});

describe("room authorization", () => {
  it("rejects controller reset / grade", () => {
    let room = freshRoom();
    const claimed = claimWithToken(room, room.secrets.blueClaimToken, tokens);
    expect(claimed.ok).toBe(true);
    if (!claimed.ok) return;
    room = claimed.room;

    for (const action of [
      { type: "resetAll" as const },
      { type: "playAgain" as const },
      { type: "grade" as const, band: "6-7" as const },
    ]) {
      const result = applyRoomAction(room, {
        role: "controller",
        controllerSide: "blue",
        connectionKey: "c1",
        actionId: `a_${action.type}`,
        action,
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toBe("unauthorized");
    }
  });

  it("controller action affects bound side only (ignores client side)", () => {
    let room = freshRoom();
    const claimed = claimWithToken(room, room.secrets.blueClaimToken, tokens);
    expect(claimed.ok).toBe(true);
    if (!claimed.ok) return;
    room = claimed.room;

    const result = applyRoomAction(room, {
      role: "controller",
      controllerSide: "blue",
      connectionKey: "c1",
      actionId: "d1",
      action: { type: "digit", digit: "7", side: "red" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.room.gameState.blue.input).toBe("7");
    expect(result.room.gameState.red.input).toBe("");
  });

  it("host can input on unclaimed side", () => {
    const room = freshRoom();
    const result = applyRoomAction(room, {
      role: "host",
      controllerSide: null,
      connectionKey: "host",
      actionId: "h1",
      action: { type: "digit", digit: "3", side: "red" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.room.gameState.red.input).toBe("3");
  });

  it("host cannot input on claimed side", () => {
    let room = freshRoom();
    const claimed = claimWithToken(room, room.secrets.blueClaimToken, tokens);
    expect(claimed.ok).toBe(true);
    if (!claimed.ok) return;
    room = claimed.room;
    const result = applyRoomAction(room, {
      role: "host",
      controllerSide: null,
      connectionKey: "host",
      actionId: "h2",
      action: { type: "digit", digit: "1", side: "blue" },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("unauthorized");
  });

  it("playAgain keeps claims and refreshes game", () => {
    let room = freshRoom();
    const claimed = claimWithToken(room, room.secrets.blueClaimToken, tokens);
    expect(claimed.ok).toBe(true);
    if (!claimed.ok) return;
    room = claimed.room;
    room = {
      ...room,
      gameState: {
        ...room.gameState,
        position: 3,
        blue: { ...room.gameState.blue, input: "12", score: 2 },
      },
    };
    const result = applyRoomAction(room, {
      role: "host",
      controllerSide: null,
      connectionKey: "host",
      actionId: "pa1",
      action: { type: "playAgain" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(isSideClaimed(result.room, "blue")).toBe(true);
    expect(result.room.gameState.position).toBe(0);
    expect(result.room.gameState.blue.score).toBe(2);
    expect(result.room.gameState.blue.input).toBe("");
  });

  it("disconnect does not unclaim (model unchanged)", () => {
    let room = freshRoom();
    const claimed = claimWithToken(room, room.secrets.blueClaimToken, tokens);
    expect(claimed.ok).toBe(true);
    if (!claimed.ok) return;
    room = claimed.room;
    // No unclaim API — public claims still true after "disconnect"
    expect(toPublicSnapshot(room).claims.blue.claimed).toBe(true);
  });

  it("duplicate actionId is idempotent", () => {
    const room = freshRoom();
    const first = applyRoomAction(room, {
      role: "host",
      controllerSide: null,
      connectionKey: "host",
      actionId: "same",
      action: { type: "digit", digit: "9", side: "blue" },
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = applyRoomAction(first.room, {
      role: "host",
      controllerSide: null,
      connectionKey: "host",
      actionId: "same",
      action: { type: "digit", digit: "8", side: "blue" },
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.room.gameState.blue.input).toBe("9");
  });

  it("rate-limits controller spam", () => {
    let room = freshRoom();
    const claimed = claimWithToken(room, room.secrets.blueClaimToken, tokens);
    expect(claimed.ok).toBe(true);
    if (!claimed.ok) return;
    room = claimed.room;
    const now = 1_000_000;
    let limited = false;
    for (let i = 0; i < 50; i++) {
      const result = applyRoomAction(room, {
        role: "controller",
        controllerSide: "blue",
        connectionKey: "c1",
        actionId: `spam_${i}`,
        action: { type: "digit", digit: "1" },
        now,
      });
      room = result.room;
      if (!result.ok && result.error === "rateLimited") {
        limited = true;
        break;
      }
    }
    expect(limited).toBe(true);
  });

  it("clearShake clears shaking flag", () => {
    let room = freshRoom();
    room = {
      ...room,
      gameState: {
        ...room.gameState,
        blue: { ...room.gameState.blue, shaking: true },
      },
    };
    room = applyClearShake(room, "blue");
    expect(room.gameState.blue.shaking).toBe(false);
  });
});
