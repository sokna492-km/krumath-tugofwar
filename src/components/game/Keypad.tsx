import { Delete, Check } from "lucide-react";

type KeypadProps = {
  onDigit: (digit: string) => void;
  onClear: () => void;
  onSubmit: () => void;
  accent: "blue" | "red";
  disabled?: boolean;
};

const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function Keypad({ onDigit, onClear, onSubmit, accent, disabled }: KeypadProps) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {keys.map((k) => (
        <button
          key={k}
          type="button"
          disabled={disabled}
          onClick={() => onDigit(k)}
          className="rounded-xl bg-card py-3 text-2xl font-bold text-foreground shadow-[0_3px_0_var(--color-border)] transition-transform duration-100 hover:bg-secondary active:translate-y-0.5 active:shadow-none disabled:opacity-50 sm:py-4 sm:text-3xl"
        >
          {k}
        </button>
      ))}
      <button
        type="button"
        disabled={disabled}
        onClick={onClear}
        aria-label="Clear"
        className="flex items-center justify-center rounded-xl bg-team-red/15 py-3 text-2xl font-bold text-team-red shadow-[0_3px_0_oklch(0.6_0.23_25/25%)] transition-transform duration-100 hover:bg-team-red/25 active:translate-y-0.5 active:shadow-none disabled:opacity-50 sm:py-4"
      >
        <Delete className="size-7" strokeWidth={2.75} />
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onDigit("0")}
        className="rounded-xl bg-card py-3 text-2xl font-bold text-foreground shadow-[0_3px_0_var(--color-border)] transition-transform duration-100 hover:bg-secondary active:translate-y-0.5 active:shadow-none disabled:opacity-50 sm:py-4 sm:text-3xl"
      >
        0
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onSubmit}
        aria-label="Submit answer"
        className={`flex items-center justify-center rounded-xl py-3 font-bold text-primary-foreground transition-transform duration-100 active:translate-y-0.5 active:shadow-none disabled:opacity-50 sm:py-4 ${
          accent === "blue"
            ? "bg-team-blue shadow-[0_3px_0_var(--color-team-blue-deep)]"
            : "bg-team-red shadow-[0_3px_0_var(--color-team-red-deep)]"
        }`}
      >
        <Check className="size-8" strokeWidth={3.5} />
      </button>
    </div>
  );
}
