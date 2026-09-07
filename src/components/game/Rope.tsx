import { useCallback, useLayoutEffect, useRef, useState } from "react";
import tugBlue from "@/assets/tug-blue.png";
import tugRed from "@/assets/tug-red.png";
import { WIN_PULLS } from "@/lib/constants";
import { km } from "@/lib/copy-km";

/** Calibration UVs on each sprite box — grip tip, not fist center. */
const BLUE_HAND = { x: 0.82, y: 0.47 };
const RED_HAND = { x: 0.17, y: 0.45 };

/** Matches animate-tug-bounce and the group slide transition. */
const TRACK_MS = 500;

/** Fraction of tug-group width slid at full win lean (±WIN_PULLS). */
const MAX_SHIFT_RATIO = 0.25;

type Pt = { x: number; y: number };

type RopeProps = {
  position: number; // -WIN_PULLS (blue wins) .. +WIN_PULLS (red wins)
  pullKey: number; // increments on each successful pull, re-triggers bounce
  lastPuller: "blue" | "red" | null;
};

type RopeGeom = {
  p1: Pt;
  p2: Pt;
  mid: Pt;
  width: number;
  height: number;
};

function handPoint(img: DOMRect, origin: DOMRect, hand: { x: number; y: number }): Pt {
  return {
    x: img.left - origin.left + img.width * hand.x,
    y: img.top - origin.top + img.height * hand.y,
  };
}

/** Classic tug-of-war center rag: tied cloth on the rope (symmetric). */
function CenterMarker() {
  return (
    <svg
      width="52"
      height="40"
      viewBox="0 0 52 40"
      className="overflow-visible drop-shadow-md"
      aria-hidden="true"
    >
      {/* left cloth drape */}
      <path
        d="M26 18 C18 10, 8 8, 4 14 C6 20, 14 22, 22 20 Z"
        fill="var(--color-team-red)"
        stroke="var(--color-team-red-deep)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* right cloth drape */}
      <path
        d="M26 18 C34 10, 44 8, 48 14 C46 20, 38 22, 30 20 Z"
        fill="var(--color-team-red)"
        stroke="var(--color-team-red-deep)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* highlight folds */}
      <path
        d="M22 16 C16 12, 10 12, 7 15"
        fill="none"
        stroke="oklch(1 0 0 / 0.35)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M30 16 C36 12, 42 12, 45 15"
        fill="none"
        stroke="oklch(1 0 0 / 0.35)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* rope wrap knot */}
      <ellipse
        cx="26"
        cy="22"
        rx="11"
        ry="8.5"
        fill="oklch(0.7 0.11 80)"
        stroke="oklch(0.42 0.08 68)"
        strokeWidth="1.75"
      />
      <ellipse
        cx="26"
        cy="22"
        rx="7"
        ry="5.2"
        fill="oklch(0.58 0.1 74)"
        stroke="oklch(0.4 0.07 68)"
        strokeWidth="1.1"
      />
      {/* sun bead on the rag */}
      <circle
        cx="26"
        cy="22"
        r="4"
        fill="var(--color-sun)"
        stroke="oklch(0.62 0.15 85)"
        strokeWidth="1.5"
      />
      <circle cx="24.5" cy="20.5" r="1.2" fill="oklch(1 0 0 / 0.55)" />
    </svg>
  );
}

export function Rope({ position, pullKey, lastPuller }: RopeProps) {
  const arenaRef = useRef<HTMLDivElement>(null);
  const tugGroupRef = useRef<HTMLDivElement>(null);
  const blueRef = useRef<HTMLImageElement>(null);
  const redRef = useRef<HTMLImageElement>(null);
  const rafRef = useRef<number | null>(null);
  const trackUntilRef = useRef(0);

  const [geom, setGeom] = useState<RopeGeom | null>(null);

  const measure = useCallback(() => {
    const group = tugGroupRef.current;
    const blue = blueRef.current;
    const red = redRef.current;
    if (!group || !blue || !red) return;

    const groupRect = group.getBoundingClientRect();
    const blueRect = blue.getBoundingClientRect();
    const redRect = red.getBoundingClientRect();

    const p1 = handPoint(blueRect, groupRect, BLUE_HAND);
    const p2 = handPoint(redRect, groupRect, RED_HAND);

    setGeom({
      p1,
      p2,
      mid: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
      width: group.clientWidth,
      height: group.clientHeight,
    });
  }, []);

  const stopTracking = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    trackUntilRef.current = 0;
  }, []);

  const startTracking = useCallback(
    (ms: number) => {
      trackUntilRef.current = performance.now() + ms;
      if (rafRef.current != null) return;

      const tick = () => {
        measure();
        if (performance.now() < trackUntilRef.current) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          rafRef.current = null;
          measure(); // final settle
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [measure],
  );

  // Layout / resize
  useLayoutEffect(() => {
    const arena = arenaRef.current;
    if (!arena) return;

    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(arena);
    return () => ro.disconnect();
  }, [measure]);

  // Remeasure on pull / bounce / slide; rAF while CSS transitions run
  useLayoutEffect(() => {
    measure();
    startTracking(TRACK_MS);
    return () => stopTracking();
  }, [position, pullKey, lastPuller, measure, startTracking, stopTracking]);

  const progress = position / WIN_PULLS;
  const maxShift = geom ? geom.width * MAX_SHIFT_RATIO : 0;
  const slideX = progress * maxShift;

  return (
    <div
      ref={arenaRef}
      className="relative flex h-44 w-full items-center justify-center overflow-visible sm:h-56"
    >
      {/* center stake — fixed finish marker */}
      <div
        className="pointer-events-none absolute bottom-2 top-2 left-1/2 z-[2] flex -translate-x-1/2 flex-col items-center"
        aria-hidden="true"
      >
        {/* knob */}
        <span className="relative z-[1] size-2.5 shrink-0 rounded-full bg-sun shadow-sm ring-1 ring-black/10 sm:size-3" />
        {/* pole with highlight */}
        <span className="relative mt-[-2px] w-[5px] flex-1 rounded-full bg-gradient-to-r from-[oklch(0.72_0.14_85)] via-sun to-[oklch(0.78_0.15_95)] shadow-[1px_0_0_oklch(0.55_0.1_75/35%)] sm:w-1.5">
          <span className="absolute inset-y-1 left-[1px] w-px rounded-full bg-white/45" />
        </span>
        {/* ground base */}
        <span className="relative mt-[-1px] h-2 w-5 shrink-0 rounded-[100%] bg-[oklch(0.55_0.04_70)] shadow-inner sm:h-2.5 sm:w-6">
          <span className="absolute inset-x-1 top-0 h-1 rounded-[100%] bg-sun/80 blur-[0.5px]" />
        </span>
      </div>

      {/* kids + rope + rag slide together past the center line */}
      <div
        ref={tugGroupRef}
        className="relative z-10 flex h-full w-full items-center justify-center transition-transform duration-500 ease-out"
        style={{ transform: `translateX(${slideX}px)` }}
      >
        {geom && geom.width > 0 && geom.height > 0 && (
          <>
            <svg
              className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible drop-shadow-sm"
              viewBox={`0 0 ${geom.width} ${geom.height}`}
              width="100%"
              height="100%"
              aria-hidden="true"
            >
              <defs>
                <pattern
                  id="rope-stripe"
                  patternUnits="userSpaceOnUse"
                  width="6"
                  height="6"
                  patternTransform="rotate(55)"
                >
                  <rect width="3" height="6" fill="oklch(0.68 0.12 80)" />
                  <rect x="3" width="3" height="6" fill="oklch(0.55 0.1 72)" />
                </pattern>
              </defs>
              {/* thin striped rope fist-to-fist */}
              <line
                x1={geom.p1.x}
                y1={geom.p1.y}
                x2={geom.p2.x}
                y2={geom.p2.y}
                stroke="url(#rope-stripe)"
                strokeWidth={6}
                strokeLinecap="round"
              />
            </svg>

            {/* rag stays pinned to rope midpoint; moves with the group */}
            <div
              className="pointer-events-none absolute z-[1]"
              style={{
                left: geom.mid.x,
                top: geom.mid.y,
                // bead at (26, 22) in 52×40 viewBox → pin to rope point
                transform: "translate(-26px, -22px)",
              }}
            >
              <CenterMarker />
            </div>
          </>
        )}

        <div className="relative z-10 flex w-full max-w-2xl items-end justify-between">
          <div className="relative flex shrink-0 flex-col items-center">
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-1 left-1/2 z-0 h-3 w-[70%] -translate-x-1/2 rounded-[100%] bg-black/25 blur-[2px] sm:bottom-1.5 sm:h-3.5"
            />
            <img
              key={`b-${pullKey}`}
              ref={blueRef}
              src={tugBlue}
              alt={km.blueAlt}
              width={1024}
              height={1024}
              className={`relative z-[1] h-24 w-auto drop-shadow-sm sm:h-36 ${
                lastPuller === "blue" ? "animate-tug-bounce" : ""
              }`}
              onLoad={measure}
            />
          </div>

          <div className="relative flex shrink-0 flex-col items-center">
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-1 left-1/2 z-0 h-3 w-[70%] -translate-x-1/2 rounded-[100%] bg-black/25 blur-[2px] sm:bottom-1.5 sm:h-3.5"
            />
            <img
              key={`r-${pullKey}`}
              ref={redRef}
              src={tugRed}
              alt={km.redAlt}
              width={1024}
              height={1024}
              className={`relative z-[1] h-24 w-auto drop-shadow-sm sm:h-36 ${
                lastPuller === "red" ? "animate-tug-bounce" : ""
              }`}
              onLoad={measure}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
