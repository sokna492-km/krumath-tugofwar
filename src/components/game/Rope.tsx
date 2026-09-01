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
      <div className="absolute inset-x-0 bottom-3 h-3.5 rounded-full bg-field shadow-inner" />

      {/* center line */}
      <div className="absolute bottom-3 top-0 left-1/2 w-1 -translate-x-1/2 rounded-full bg-sun shadow-sm" />

      {/* moving group: characters + rope + marker */}
      <div
        className="relative flex w-full max-w-2xl items-center justify-between transition-transform duration-500 ease-out"
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

        {/* twisted rope with marker, aligned with the characters' hands */}
        <div className="relative mx-[-18px] flex-1 -translate-y-2 sm:mx-[-26px] sm:-translate-y-3">
          <div
            className="h-2.5 w-full rounded-full shadow-md sm:h-3.5"
            style={{
              backgroundImage:
                "repeating-linear-gradient(55deg, oklch(0.68 0.12 80) 0px, oklch(0.68 0.12 80) 5px, oklch(0.55 0.1 72) 5px, oklch(0.55 0.1 72) 10px)",
            }}
          />
          {/* marker ring + flag at rope center */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="flex flex-col items-center">
              <Flag className="size-7 fill-team-red text-team-red drop-shadow sm:size-9" />
              <div className="size-4 rounded-full border-[3px] border-team-red bg-card shadow sm:size-5" />
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
