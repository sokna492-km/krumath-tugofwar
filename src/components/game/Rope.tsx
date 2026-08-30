import { Flag } from "lucide-react";
import tugBlue from "@/assets/tug-blue.png";
import tugRed from "@/assets/tug-red.png";

export const WIN_PULLS = 8;

type RopeProps = {
  position: number; // -WIN_PULLS (blue wins) .. +WIN_PULLS (red wins)
  pullKey: number; // increments on each successful pull, re-triggers bounce
  lastPuller: "blue" | "red" | null;
};

export function Rope({ position, pullKey, lastPuller }: RopeProps) {
  const pct = (position / WIN_PULLS) * 38; // percent shift of the group

  return (
    <div className="relative flex h-44 w-full items-center justify-center overflow-visible sm:h-56">
      {/* ground */}
      <div className="absolute inset-x-0 bottom-4 h-3 rounded-full bg-field" />

      {/* center line */}
      <div className="absolute bottom-4 top-0 left-1/2 w-1 -translate-x-1/2 rounded-full bg-sun" />

      {/* moving group: characters + rope + marker */}
      <div
        className="relative flex w-full max-w-lg items-center justify-between transition-transform duration-500 ease-out"
        style={{ transform: `translateX(${pct}%)` }}
      >
        <img
          key={`b-${pullKey}`}
          src={tugBlue}
          alt="Blue player pulling the rope"
          width={1024}
          height={1024}
          className={`h-24 w-auto drop-shadow-md sm:h-36 ${
            lastPuller === "blue" ? "animate-tug-bounce" : ""
          }`}
        />

        {/* rope with marker */}
        <div className="relative mx-1 h-2 flex-1 rounded-full bg-amber-900/80 sm:mx-2">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="flex flex-col items-center">
              <Flag className="size-6 fill-team-red text-team-red sm:size-8" />
              <div className="h-4 w-1 rounded-full bg-amber-900/80" />
            </div>
          </div>
        </div>

        <img
          key={`r-${pullKey}`}
          src={tugRed}
          alt="Red player pulling the rope"
          width={1024}
          height={1024}
          className={`h-24 w-auto drop-shadow-md sm:h-36 ${
            lastPuller === "red" ? "animate-tug-bounce" : ""
          }`}
        />
      </div>
    </div>
  );
}
