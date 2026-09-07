import { createFileRoute } from "@tanstack/react-router";
import { bandAllowsNegative } from "@/lib/math";
import { createInitialState, type Side } from "@/lib/game";
import { km } from "@/lib/copy-km";
import { useControllerRoom } from "@/lib/use-game-room";
import { Keypad } from "@/components/game/Keypad";
import { SchoolBackground } from "@/components/game/SchoolBackground";

type ControllerSearch = {
  preview?: "claimed";
};

export const Route = createFileRoute("/c/$roomId/$claimToken")({
  validateSearch: (search: Record<string, unknown>): ControllerSearch => {
    if (search["preview"] === "claimed") return { preview: "claimed" };
    return {};
  },
  head: () => ({
    meta: [{ title: km.metaTitle }],
  }),
  component: ControllerPage,
});

function statusMessage(status: ReturnType<typeof useControllerRoom>["status"]): string {
  switch (status) {
    case "connecting":
    case "connected":
      return km.controllerConnecting;
    case "reconnecting":
      return km.controllerReconnecting;
    case "claimed":
      return km.controllerClaimed;
    case "claimAlreadyUsed":
      return km.controllerAlreadyUsed;
    case "invalidClaim":
      return km.controllerInvalid;
    case "roomExpired":
      return km.controllerRoomExpired;
    default:
      return km.controllerConnecting;
  }
}

function ControllerPlaySurface({
  side,
  gameState,
  onDigit,
  onClear,
  onSubmit,
  onToggleSign,
}: {
  side: Side;
  gameState: ReturnType<typeof createInitialState>;
  onDigit: (d: string) => void;
  onClear: () => void;
  onSubmit: () => void;
  onToggleSign: () => void;
}) {
  const sideState = gameState[side];
  const isBlue = side === "blue";
  const name = isBlue ? km.blue : km.red;

  return (
    <section
      className={`w-full overflow-hidden rounded-3xl bg-card shadow-xl ring-1 ring-border ${
        sideState.shaking ? "animate-shake" : ""
      }`}
    >
      <header
        className={`px-4 py-3 text-center ${
          isBlue
            ? "bg-team-blue shadow-[inset_0_-4px_0_var(--color-team-blue-deep)]"
            : "bg-team-red shadow-[inset_0_-4px_0_var(--color-team-red-deep)]"
        }`}
      >
        <h1 className="text-xl font-extrabold text-primary-foreground">
          {name} ★ {sideState.score}
        </h1>
      </header>
      <div className={`${isBlue ? "bg-team-blue/90" : "bg-team-red/90"} px-4 py-8 text-center`}>
        <p className="text-4xl font-extrabold tracking-wide text-primary-foreground">
          {sideState.question.prompt}
        </p>
      </div>
      <div className="space-y-4 p-4">
        <output
          aria-live="polite"
          className="block h-14 rounded-xl border-2 border-input bg-background px-4 text-right text-3xl font-bold leading-[3.25rem] text-foreground"
        >
          {sideState.input || <span className="text-muted-foreground/40">?</span>}
        </output>
        <div className="h-[min(52dvh,22rem)]">
          <Keypad
            accent={side}
            disabled={!!gameState.winner || sideState.shaking}
            allowNegative={bandAllowsNegative(gameState.band)}
            onDigit={onDigit}
            onClear={onClear}
            onSubmit={onSubmit}
            onToggleSign={onToggleSign}
          />
        </div>
      </div>
    </section>
  );
}

function DevClaimedPreview({ side }: { side: Side }) {
  const gameState = createInitialState("4-5");
  return (
    <div className="space-y-3">
      <p className="text-center text-xs font-semibold text-amber-700">{km.qrDevPreviewHint}</p>
      <ControllerPlaySurface
        side={side}
        gameState={gameState}
        onDigit={() => undefined}
        onClear={() => undefined}
        onSubmit={() => undefined}
        onToggleSign={() => undefined}
      />
    </div>
  );
}

function ControllerPage() {
  const { roomId, claimToken } = Route.useParams();
  const { preview } = Route.useSearch();
  const { status, side, gameState, sendInput } = useControllerRoom(claimToken, roomId);

  const previewClaimed = import.meta.env.DEV && preview === "claimed";
  const previewSide: Side = claimToken.includes("red") || roomId.includes("red") ? "red" : "blue";

  const ready = status === "claimed" && side && gameState;
  const liveSide = side ?? "blue";

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-4 overflow-hidden bg-background px-3 py-6">
      <SchoolBackground />
      <div className="relative z-10 w-full max-w-sm">
        {previewClaimed ? (
          <DevClaimedPreview side={previewSide} />
        ) : !ready || !gameState ? (
          <div className="rounded-3xl bg-card p-8 text-center shadow-xl ring-1 ring-border">
            <p className="text-lg font-extrabold text-foreground">{statusMessage(status)}</p>
            {import.meta.env.DEV && (
              <p className="mt-4 text-xs font-semibold text-amber-700">
                {km.controllerDevPreviewHint}
              </p>
            )}
          </div>
        ) : (
          <ControllerPlaySurface
            side={liveSide}
            gameState={gameState}
            onDigit={(d) => sendInput({ type: "digit", digit: d })}
            onClear={() => sendInput({ type: "backspace" })}
            onSubmit={() => sendInput({ type: "submit" })}
            onToggleSign={() => sendInput({ type: "toggleSign" })}
          />
        )}
      </div>
    </main>
  );
}
