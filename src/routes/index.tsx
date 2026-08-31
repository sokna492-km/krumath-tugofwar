import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { GraduationCap, RotateCcw, Trophy } from "lucide-react";
import {
  GRADE_BANDS,
  bandAllowsNegative,
  makeQuestion,
  type GradeBand,
  type Question,
} from "@/lib/math";
import { PlayerPanel } from "@/components/game/PlayerPanel";
import { Rope, WIN_PULLS } from "@/components/game/Rope";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Math Tug of War — 2-Player Math Game" },
      {
        name: "description",
        content:
          "A fun two-player tug of war math game. Solve addition, subtraction, multiplication and division to pull the rope to your side and win.",
      },
      { property: "og:title", content: "Math Tug of War — 2-Player Math Game" },
      {
        property: "og:description",
        content:
          "Solve math facts to pull the rope your way. First player to drag the marker to their side wins!",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Side = "blue" | "red";

type SideState = {
  question: Question;
  input: string;
  score: number;
  shaking: boolean;
};

const freshSide = (): SideState => ({
  question: makeQuestion(),
  input: "",
  score: 0,
  shaking: false,
});

const CONFETTI = Array.from({ length: 24 }, (_, i) => i);

function Index() {
  const [blue, setBlue] = useState<SideState>(freshSide);
  const [red, setRed] = useState<SideState>(freshSide);
  const [position, setPosition] = useState(0);
  const [pullKey, setPullKey] = useState(0);
  const [lastPuller, setLastPuller] = useState<Side | null>(null);
  const [winner, setWinner] = useState<Side | null>(null);


  const setSide = useCallback(
    (side: Side, updater: (s: SideState) => SideState) => {
      (side === "blue" ? setBlue : setRed)((prev) => updater(prev));
    },
    []
  );

  const handleDigit = (side: Side, digit: string) => {
    if (winner) return;
    setSide(side, (s) =>
      s.input.length >= 5 ? s : { ...s, input: s.input + digit }
    );
  };

  const handleClear = (side: Side) => {
    if (winner) return;
    setSide(side, (s) => ({ ...s, input: "" }));
  };

  const handleSubmit = (side: Side) => {
    if (winner) return;
    const state = side === "blue" ? blue : red;
    const value = parseInt(state.input, 10);
    if (state.input === "" || Number.isNaN(value)) return;

    if (value === state.question.answer) {
      const next = side === "blue" ? position - 1 : position + 1;
      setPosition(next);
      setPullKey((k) => k + 1);
      setLastPuller(side);
      setSide(side, (s) => ({ ...s, input: "", question: makeQuestion() }));
      if (Math.abs(next) >= WIN_PULLS) {
        setWinner(side);
        setSide(side, (s) => ({ ...s, score: s.score + 1 }));
      }
    } else {
      setSide(side, (s) => ({ ...s, input: "", shaking: true }));
      window.setTimeout(() => setSide(side, (s) => ({ ...s, shaking: false })), 350);
    }
  };

  const playAgain = () => {
    setPosition(0);
    setWinner(null);
    setLastPuller(null);
    setBlue((s) => ({ ...freshSide(), score: s.score }));
    setRed((s) => ({ ...freshSide(), score: s.score }));
  };

  const resetAll = () => {
    setPosition(0);
    setWinner(null);
    setLastPuller(null);
    setBlue(freshSide());
    setRed(freshSide());
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center gap-4 overflow-hidden bg-background px-3 py-4 sm:gap-6 sm:px-6 sm:py-8">
      <header className="flex w-full max-w-6xl items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Math Tug of War
        </h1>
        <button
          type="button"
          onClick={resetAll}
          className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground transition-transform hover:scale-105"
        >
          <RotateCcw className="size-4" />
          New Match
        </button>
      </header>

      <div className="flex w-full max-w-6xl flex-col items-center gap-4 sm:gap-6 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        <div className="flex justify-center lg:justify-end">
          <PlayerPanel
            name="Blue"
            accent="blue"
            question={blue.question}
            input={blue.input}
            score={blue.score}
            shaking={blue.shaking}
            disabled={!!winner}
            onDigit={(d) => handleDigit("blue", d)}
            onClear={() => handleClear("blue")}
            onSubmit={() => handleSubmit("blue")}
          />
        </div>

        <div className="w-full max-w-md lg:w-72 xl:w-96">
          <Rope position={position} pullKey={pullKey} lastPuller={lastPuller} />
        </div>

        <div className="flex justify-center lg:justify-start">
          <PlayerPanel
            name="Red"
            accent="red"
            question={red.question}
            input={red.input}
            score={red.score}
            shaking={red.shaking}
            disabled={!!winner}
            onDigit={(d) => handleDigit("red", d)}
            onClear={() => handleClear("red")}
            onSubmit={() => handleSubmit("red")}
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
              {winner === "blue" ? "Blue" : "Red"} Wins!
            </h2>
            <p className="mt-2 text-lg font-semibold text-muted-foreground">
              ★ {blue.score} — {red.score} ★
            </p>
            <button
              type="button"
              onClick={playAgain}
              className={`mt-6 w-full rounded-2xl py-4 text-xl font-extrabold text-primary-foreground transition-transform hover:scale-105 active:translate-y-0.5 ${
                winner === "blue"
                  ? "bg-team-blue shadow-[0_4px_0_var(--color-team-blue-deep)]"
                  : "bg-team-red shadow-[0_4px_0_var(--color-team-red-deep)]"
              }`}
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
