import { Delete, Check } from "lucide-react";
import { km } from "@/lib/copy-km";

type KeypadProps = {
  onDigit: (digit: string) => void;
  onClear: () => void;
  onSubmit: () => void;
  accent: "blue" | "red";
  disabled?: boolean;
  allowNegative?: boolean;
  onToggleSign?: () => void;
};

const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

const keyBase =
  "flex min-h-0 h-full items-center justify-center rounded-xl font-bold shadow-[0_3px_0_var(--color-border)] transition-transform duration-100 hover:brightness-95 active:translate-y-0.5 active:shadow-none disabled:opacity-50 text-[clamp(1rem,3.2vh,1.875rem)]";

export function Keypad({
  onDigit,
  onClear,
  onSubmit,
  accent,
  disabled,
  allowNegative,
  onToggleSign,
}: KeypadProps) {
  return (
    <div
      className={`grid h-full min-h-0 grid-cols-3 gap-1.5 sm:gap-2 ${
        allowNegative ? "grid-rows-5" : "grid-rows-4"
      }`}
    >
      {allowNegative && (
        <button
          type="button"
          disabled={disabled}
          onClick={onToggleSign}
          aria-label={km.toggleSign}
          className={`${keyBase} col-span-3 bg-secondary text-secondary-foreground`}
        >
          ±
        </button>
      )}
      {keys.map((k) => (
        <button
          key={k}
          type="button"
          disabled={disabled}
          onClick={() => onDigit(k)}
          className={`${keyBase} bg-card text-foreground hover:bg-secondary`}
        >
          {k}
        </button>
      ))}
      <button
        type="button"
        disabled={disabled}
        onClick={onClear}
        aria-label={km.backspace}
        className={`${keyBase} bg-team-red/15 text-team-red shadow-[0_3px_0_oklch(0.6_0.23_25/25%)] hover:bg-team-red/25`}
      >
        <Delete className="size-[clamp(1.1rem,3vh,1.75rem)]" strokeWidth={2.75} />
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onDigit("0")}
        className={`${keyBase} bg-card text-foreground hover:bg-secondary`}
      >
        0
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onSubmit}
        aria-label={km.submitAnswer}
        className={`${keyBase} text-primary-foreground ${
          accent === "blue"
            ? "bg-team-blue shadow-[0_3px_0_var(--color-team-blue-deep)]"
            : "bg-team-red shadow-[0_3px_0_var(--color-team-red-deep)]"
        }`}
      >
        <Check className="size-[clamp(1.25rem,3.5vh,2rem)]" strokeWidth={3.5} />
      </button>
    </div>
  );
}
