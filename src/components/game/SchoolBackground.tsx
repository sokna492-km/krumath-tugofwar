import schoolBackground from "@/assets/school-background.svg";
import { cn } from "@/lib/utils";

type SchoolBackgroundProps = {
  className?: string;
};

/**
 * Non-interactive schoolyard backdrop. Keep scenery soft and peripheral —
 * if any element competes with kids/rope/panels, simplify the SVG, not the UI.
 */
export function SchoolBackground({ className }: SchoolBackgroundProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-0 overflow-hidden",
        className,
      )}
      aria-hidden="true"
    >
      <img
        src={schoolBackground}
        alt=""
        className="absolute inset-0 size-full object-cover object-center"
        draggable={false}
      />
      {/* Soft cream wash so center gameplay stays readable over scenery */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 50% at 50% 48%, var(--color-background) 0%, transparent 72%)",
          opacity: 0.4,
        }}
      />
    </div>
  );
}
