import { useCallback, useLayoutEffect, useRef, useState } from "react";
import tugBlue from "@/assets/tug-blue.png";
import tugRed from "@/assets/tug-red.png";
import { WIN_PULLS } from "@/lib/constants";
import { km } from "@/lib/copy-km";

export { WIN_PULLS };

/** Calibration UVs on each sprite box — grip tip, not fist center. */
const BLUE_HAND = { x: 0.82, y: 0.47 };
const RED_HAND = { x: 0.17, y: 0.45 };

/** Matches animate-tug-bounce and the group slide transition. */
const TRACK_MS = 500;

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

function handPoint(
  img: DOMRect,
  arena: DOMRect,
  hand: { x: number; y: number },
): Pt {
  return {
    x: img.left - arena.left + img.width * hand.x,
    y: img.top - arena.top + img.height * hand.y,
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
      {/* sun bead — progress marker on the rope */}
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
  const blueRef = useRef<HTMLImageElement>(null);
  const redRef = useRef<HTMLImageElement>(null);
  const rafRef = useRef<number | null>(null);
  const trackUntilRef = useRef(0);

  const [geom, setGeom] = useState<RopeGeom | null>(null);

  const measure = useCallback(() => {
    const arena = arenaRef.current;
    const blue = blueRef.current;
    const red = redRef.current;
    if (!arena || !blue || !red) return;

    const arenaRect = arena.getBoundingClientRect();
    const blueRect = blue.getBoundingClientRect();
    const redRect = red.getBoundingClientRect();

    const p1 = handPoint(blueRect, arenaRect, BLUE_HAND);
    const p2 = handPoint(redRect, arenaRect, RED_HAND);

    setGeom({
      p1,
      p2,
      mid: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
      width: arena.clientWidth,
      height: arena.clientHeight,
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

  // Remeasure on pull / bounce; rAF while CSS bounce animates
  useLayoutEffect(() => {
    measure();
    startTracking(TRACK_MS);
    return () => stopTracking();
  }, [position, pullKey, lastPuller, measure, startTracking, stopTracking]);

  const progress = position / WIN_PULLS;
  const travel = geom ? (geom.p2.x - geom.p1.x) * 0.28 : 0;
  const markerX = geom ? geom.mid.x + progress * travel : 0;
  const markerY = geom ? geom.mid.y : 0;

  return (
    <div
      ref={arenaRef}
      className="relative flex h-44 w-full items-center justify-center overflow-visible sm:h-56"
    >
      {/* ground */}
      <div className="absolute inset-x-0 bottom-3 h-3.5 rounded-full bg-field shadow-inner" />

      {/* center line */}
      <div className="absolute bottom-3 top-0 left-1/2 w-1 -translate-x-1/2 rounded-full bg-sun shadow-sm" />

      {/* arena-local rope + markers (under characters) */}
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

          {/* rag marker slides along the rope with tug progress */}
          <div
            className="pointer-events-none absolute z-[1] transition-[left,top] duration-500 ease-out"
            style={{
              left: markerX,
              top: markerY,
              // bead at (26, 22) in 52×40 viewBox → pin to rope point
              transform: "translate(-26px, -22px)",
            }}
          >
            <CenterMarker />
          </div>
        </>
      )}

      {/* characters stay fixed; progress is the sliding marker */}
      <div className="relative z-10 flex w-full max-w-2xl items-end justify-between">
        <img
          key={`b-${pullKey}`}
          ref={blueRef}
          src={tugBlue}
          alt={km.blueAlt}
          width={1024}
          height={1024}
          className={`h-24 w-auto shrink-0 drop-shadow-md sm:h-36 ${
            lastPuller === "blue" ? "animate-tug-bounce" : ""
          }`}
          onLoad={measure}
        />

        <img
          key={`r-${pullKey}`}
          ref={redRef}
          src={tugRed}
          alt={km.redAlt}
          width={1024}
          height={1024}
          className={`h-24 w-auto shrink-0 drop-shadow-md sm:h-36 ${
            lastPuller === "red" ? "animate-tug-bounce" : ""
          }`}
          onLoad={measure}
        />
      </div>
    </div>
  );
}
