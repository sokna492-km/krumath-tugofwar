import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useReducer, useRef } from "react";
import { GraduationCap, RotateCcw, Trophy } from "lucide-react";
import { GRADE_BANDS, bandAllowsNegative, type GradeBand } from "@/lib/math";
import {
  canChangeGrade,
  createInitialState,
  gameReducer,
  type Side,
} from "@/lib/game";
import { km } from "@/lib/copy-km";
import { PlayerPanel } from "@/components/game/PlayerPanel";
import { Rope } from "@/components/game/Rope";
import { SchoolBackground } from "@/components/game/SchoolBackground";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: km.metaTitleFull },
      {
        name: "description",
        content: km.metaDescription,
      },
      {
        property: "og:title",
        content: km.metaTitleFull,
      },
      {
        property: "og:description",
        content: km.metaDescription,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const CONFETTI = Array.from({ length: 24 }, (_, i) => i);

const SHAKE_MS = 350;

function Index() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () =>
    createInitialState("4-5"),
  );
  const shakeTimers = useRef<Partial<Record<Side, number>>>({});

  const {
    band,
    blue,
    red,
    position,
    pullKey,
    lastPuller,
    winner,
  } = state;

  const gradeEditable = canChangeGrade(state);

  useEffect(() => {
    return () => {
      const timers = shakeTimers.current;
      if (timers.blue !== undefined) window.clearTimeout(timers.blue);
      if (timers.red !== undefined) window.clearTimeout(timers.red);
    };
  }, []);

  const handleSubmit = (side: Side) => {
    const before = side === "blue" ? blue : red;
    if (winner || before.shaking || before.input === "") return;

    dispatch({ type: "submit", side });

    // Wrong answers set shaking in the reducer; schedule clear using next tick state.
    // Read after dispatch via functional check: if input was non-empty and will shake,
    // we detect wrong by comparing — easier: always arm clearShake only when wrong.
    const value = parseInt(before.input, 10);
    const wrong =
      !Number.isNaN(value) && value !== before.question.answer;
    if (wrong) {
      const existing = shakeTimers.current[side];
      if (existing) window.clearTimeout(existing);
      shakeTimers.current[side] = window.setTimeout(() => {
        dispatch({ type: "clearShake", side });
        delete shakeTimers.current[side];
      }, SHAKE_MS);
    }
  };

  const handleGradeChange = (next: GradeBand) => {
    dispatch({ type: "grade", band: next });
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center gap-4 overflow-hidden bg-background px-3 py-4 sm:gap-6 sm:px-6 sm:py-8">
      <SchoolBackground />
      <div className="relative z-10 flex w-full flex-col items-center gap-4 sm:gap-6">
        <header className="flex w-full max-w-7xl items-center justify-between">
          <h1 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-foreground sm:gap-3 sm:text-2xl">
            <img
              src="/favicon.svg"
              alt=""
              className="size-7 shrink-0 sm:size-8"
              width={32}
              height={32}
            />
            <span>{km.metaTitle}</span>
          </h1>
          <button
            type="button"
            onClick={() => dispatch({ type: "resetAll" })}
            className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground transition-transform hover:scale-105"
          >
            <RotateCcw className="size-4" />
            {km.newMatch}
          </button>
        </header>

        <p className="max-w-xl text-center text-sm font-semibold text-muted-foreground sm:text-base">
          {km.hint}
        </p>

        <div
          role="group"
          aria-label={km.gradeLevel}
          className="flex flex-wrap items-center justify-center gap-1.5 rounded-full bg-card px-3 py-2 shadow-md ring-1 ring-border"
        >
          <GraduationCap className="mr-1 size-5 text-muted-foreground" />
          <span className="mr-1 text-sm font-bold text-muted-foreground">
            {km.grade}
          </span>
          {GRADE_BANDS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => handleGradeChange(g.id)}
              aria-pressed={band === g.id}
              disabled={!gradeEditable && band !== g.id}
              title={gradeEditable ? undefined : km.gradeLocked}
              className={`rounded-full px-3.5 py-1.5 text-sm font-extrabold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                band === g.id
                  ? "bg-primary text-primary-foreground shadow-[0_2px_0_var(--color-team-blue-deep)]"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        <div className="flex w-full max-w-7xl flex-col items-center gap-4 sm:gap-6 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center">
          <div className="flex justify-center lg:justify-end">
            <PlayerPanel
              name={km.blue}
              accent="blue"
              question={blue.question}
              input={blue.input}
              score={blue.score}
              shaking={blue.shaking}
              disabled={!!winner || blue.shaking}
              allowNegative={bandAllowsNegative(band)}
              onDigit={(d) =>
                dispatch({ type: "digit", side: "blue", digit: d })
              }
              onClear={() => dispatch({ type: "backspace", side: "blue" })}
              onSubmit={() => handleSubmit("blue")}
              onToggleSign={() =>
                dispatch({ type: "toggleSign", side: "blue" })
              }
            />
          </div>

          <div className="flex w-full min-w-0 max-w-md flex-col items-center gap-2 lg:w-96 xl:w-[30rem]">
            <div className="flex w-full items-center justify-between px-1 text-xs font-extrabold tracking-wide sm:text-sm">
              <span className="text-team-blue">{km.blueArrow}</span>
              <span className="text-team-red">{km.redArrow}</span>
            </div>
            <Rope
              position={position}
              pullKey={pullKey}
              lastPuller={lastPuller}
            />
          </div>

          <div className="flex justify-center lg:justify-start">
            <PlayerPanel
              name={km.red}
              accent="red"
              question={red.question}
              input={red.input}
              score={red.score}
              shaking={red.shaking}
              disabled={!!winner || red.shaking}
              allowNegative={bandAllowsNegative(band)}
              onDigit={(d) =>
                dispatch({ type: "digit", side: "red", digit: d })
              }
              onClear={() => dispatch({ type: "backspace", side: "red" })}
              onSubmit={() => handleSubmit("red")}
              onToggleSign={() =>
                dispatch({ type: "toggleSign", side: "red" })
              }
            />
          </div>
        </div>

        {winner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
            {CONFETTI.map((i) => (
              <span
                key={i}
                className="animate-confetti pointer-events-none absolute top-0 block size-3 rounded-sm"
                style={{
                  left: `${(i * 41) % 100}%`,
                  backgroundColor:
                    i % 3 === 0
                      ? "var(--color-team-blue)"
                      : i % 3 === 1
                        ? "var(--color-team-red)"
                        : "var(--color-sun)",
                  animationDuration: `${2.2 + (i % 5) * 0.5}s`,
                  animationDelay: `${(i % 7) * 0.3}s`,
                }}
              />
            ))}
            <div className="animate-pop-in w-full max-w-sm rounded-3xl bg-card p-8 text-center shadow-2xl">
              <div
                className={`mx-auto mb-4 flex size-20 items-center justify-center rounded-full ${
                  winner === "blue" ? "bg-team-blue" : "bg-team-red"
                }`}
              >
                <Trophy className="size-10 text-primary-foreground" />
              </div>
              <h2 className="text-3xl font-extrabold text-foreground">
                {winner === "blue" ? km.blueWins : km.redWins}
              </h2>
              <p className="mt-2 text-lg font-semibold text-muted-foreground">
                ★ {blue.score} — {red.score} ★
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => dispatch({ type: "playAgain" })}
                  className={`w-full rounded-2xl py-4 text-xl font-extrabold text-primary-foreground transition-transform hover:scale-105 active:translate-y-0.5 ${
                    winner === "blue"
                      ? "bg-team-blue shadow-[0_4px_0_var(--color-team-blue-deep)]"
                      : "bg-team-red shadow-[0_4px_0_var(--color-team-red-deep)]"
                  }`}
                >
                  {km.playAgain}
                </button>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "resetAll" })}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-secondary py-3 text-base font-bold text-secondary-foreground transition-transform hover:scale-105"
                >
                  <RotateCcw className="size-4" />
                  {km.newMatch}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
