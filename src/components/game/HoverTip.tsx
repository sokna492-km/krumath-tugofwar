import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type TipSide = "top" | "bottom" | "left" | "right";

type HoverTipProps = {
  label: string;
  side?: TipSide;
  /** Hide tip (e.g. while a menu is open). */
  disabled?: boolean;
  className?: string;
  children: ReactNode;
};

const SHOW_DELAY_MS = 180;

/** Polished hover/focus tooltip; portals to body to avoid overflow clipping. */
export function HoverTip({
  label,
  side = "bottom",
  disabled = false,
  className,
  children,
}: HoverTipProps) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const timerRef = useRef<number>(undefined);

  const place = () => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 8;
    if (side === "bottom") {
      setCoords({ top: r.bottom + gap, left: r.left + r.width / 2 });
    } else if (side === "top") {
      setCoords({ top: r.top - gap, left: r.left + r.width / 2 });
    } else if (side === "left") {
      setCoords({ top: r.top + r.height / 2, left: r.left - gap });
    } else {
      setCoords({ top: r.top + r.height / 2, left: r.right + gap });
    }
  };

  const show = () => {
    if (disabled) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      place();
      setVisible(true);
    }, SHOW_DELAY_MS);
  };

  const hide = () => {
    window.clearTimeout(timerRef.current);
    setVisible(false);
  };

  useEffect(() => {
    if (!disabled) return;
    window.clearTimeout(timerRef.current);
    setVisible(false);
  }, [disabled]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const transform =
    side === "bottom"
      ? "-translate-x-1/2"
      : side === "top"
        ? "-translate-x-1/2 -translate-y-full"
        : side === "left"
          ? "-translate-x-full -translate-y-1/2"
          : "-translate-y-1/2";

  return (
    <>
      <span
        ref={wrapRef}
        className={className}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocusCapture={show}
        onBlurCapture={hide}
      >
        {children}
      </span>
      {visible &&
        coords &&
        createPortal(
          <span
            role="tooltip"
            className={`pointer-events-none fixed z-[70] animate-fade-in whitespace-nowrap rounded-xl bg-foreground/92 px-3 py-1.5 text-sm font-bold text-background shadow-lg backdrop-blur-sm ${transform}`}
            style={{ top: coords.top, left: coords.left }}
          >
            {label}
          </span>,
          document.body,
        )}
    </>
  );
}
