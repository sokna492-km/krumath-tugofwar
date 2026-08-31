import type { Question } from "@/lib/math";
import { Keypad } from "./Keypad";

type PlayerPanelProps = {
  name: string;
  accent: "blue" | "red";
  question: Question;
  input: string;
  score: number;
  shaking: boolean;
  disabled: boolean;
  allowNegative: boolean;
  onDigit: (digit: string) => void;
  onClear: () => void;
  onSubmit: () => void;
  onToggleSign: () => void;
};

export function PlayerPanel({
  name,
  accent,
  question,
  input,
  score,
  shaking,
  disabled,
  allowNegative,
  onDigit,
  onClear,
  onSubmit,
  onToggleSign,
}: PlayerPanelProps) {
  const isBlue = accent === "blue";
  return (
    <section
      aria-label={`${name} panel`}
      className={`w-full max-w-md overflow-hidden rounded-3xl bg-card shadow-xl ring-1 ring-border ${
        shaking ? "animate-shake" : ""
      }`}
    >
      <header
        className={`px-4 py-3 text-center ${
          isBlue
            ? "bg-team-blue shadow-[inset_0_-4px_0_var(--color-team-blue-deep)]"
            : "bg-team-red shadow-[inset_0_-4px_0_var(--color-team-red-deep)]"
        }`}
      >
        <div className="flex items-center justify-center gap-3">
          <h2 className="text-xl font-extrabold tracking-wide text-primary-foreground sm:text-2xl">
            {name}
          </h2>
          <span className="rounded-full bg-white/25 px-3 py-0.5 text-sm font-bold text-primary-foreground">
            ★ {score}
          </span>
        </div>
      </header>

      <div className={`${isBlue ? "bg-team-blue/90" : "bg-team-red/90"} px-4 py-6 text-center`}>
        <p className="text-5xl font-extrabold tracking-wider text-primary-foreground sm:text-6xl">
          {question.a} {question.symbol} {question.b}
        </p>
      </div>

      <div className="space-y-4 p-4 sm:p-6">
        <output
          aria-live="polite"
          className="block h-14 rounded-xl border-2 border-input bg-background px-4 text-right text-3xl font-bold leading-[3.25rem] text-foreground"
        >
          {input || <span className="text-muted-foreground/40">?</span>}
        </output>
        <Keypad
          accent={accent}
          disabled={disabled}
          allowNegative={allowNegative}
          onDigit={onDigit}
          onClear={onClear}
          onSubmit={onSubmit}
          onToggleSign={onToggleSign}
        />
      </div>
    </section>
  );
}
