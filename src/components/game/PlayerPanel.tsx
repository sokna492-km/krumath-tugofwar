import { useLayoutEffect, useRef, useState } from "react";
import type { Question } from "@/lib/math";
import { km } from "@/lib/copy-km";
import { ClaimQr } from "./ClaimQr";
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
  claimUrl?: string | null;
  claimed?: boolean;
};

const QUESTION_MAX_PX = 60; // ~text-6xl
const QUESTION_MIN_PX = 20;

/** Shrinks question text until it fits on one line inside the panel. */
function FitQuestion({ prompt }: { prompt: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const [fontPx, setFontPx] = useState(QUESTION_MAX_PX);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const text = textRef.current;
    if (!box || !text) return;

    const fit = () => {
      let size = QUESTION_MAX_PX;
      text.style.fontSize = `${size}px`;
      while (size > QUESTION_MIN_PX && text.scrollWidth > box.clientWidth) {
        size -= 1;
        text.style.fontSize = `${size}px`;
      }
      setFontPx(size);
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, [prompt]);

  return (
    <div ref={boxRef} className="w-full overflow-hidden">
      <p
        ref={textRef}
        className="whitespace-nowrap text-center font-extrabold tracking-wide text-primary-foreground"
        style={{ fontSize: fontPx }}
      >
        {prompt}
      </p>
    </div>
  );
}

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
  claimUrl = null,
  claimed = false,
}: PlayerPanelProps) {
  const isBlue = accent === "blue";
  return (
    <section
      aria-label={isBlue ? km.bluePanel : km.redPanel}
      className={`w-full overflow-hidden rounded-3xl bg-card shadow-xl ring-1 ring-border ${
        shaking ? "animate-shake" : ""
      }`}
    >
      <header
        className={`relative px-4 py-3 text-center ${
          isBlue
            ? "bg-team-blue shadow-[inset_0_-4px_0_var(--color-team-blue-deep)]"
            : "bg-team-red shadow-[inset_0_-4px_0_var(--color-team-red-deep)]"
        }`}
      >
        <div className="flex items-center justify-center gap-3 pr-12">
          <h2 className="text-xl font-extrabold tracking-wide text-primary-foreground sm:text-2xl">
            {name}
          </h2>
          <span className="rounded-full bg-white/25 px-3 py-0.5 text-sm font-bold text-primary-foreground">
            ★ {score}
          </span>
        </div>
        <ClaimQr url={claimUrl} claimed={claimed} accent={accent} />
      </header>

      <div
        className={`${isBlue ? "bg-team-blue/90" : "bg-team-red/90"} px-4 py-6 text-center`}
      >
        <FitQuestion prompt={question.prompt} />
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
