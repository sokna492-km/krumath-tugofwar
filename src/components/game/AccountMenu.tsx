import { Home, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PlayableUser } from "@/lib/auth";
import { km } from "@/lib/copy-km";
import { homeHref, signInHref } from "@/lib/host-urls";
import { HoverTip } from "./HoverTip";

type AccountMenuProps = {
  user: PlayableUser | null;
};

/** Header account control: sign-in link, or home dropdown when signed in. */
export function AccountMenu({ user }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) {
    return (
      <HoverTip label={km.signIn} side="bottom">
        <a
          href={signInHref()}
          aria-label={km.signIn}
          className="inline-flex size-[38px] items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-transform hover:scale-105"
        >
          <User className="size-4" strokeWidth={2.5} />
        </a>
      </HoverTip>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <HoverTip label={km.homePage} side="bottom" disabled={open}>
        <button
          type="button"
          aria-label={km.homePage}
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex size-[38px] items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-transform hover:scale-105"
        >
          <User className="size-4" strokeWidth={2.5} />
        </button>
      </HoverTip>
      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 z-50 mt-2 min-w-40 overflow-hidden rounded-2xl bg-card py-1 shadow-xl ring-1 ring-border"
        >
          <a
            role="menuitem"
            href={homeHref()}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-foreground transition hover:bg-secondary"
            onClick={() => setOpen(false)}
          >
            <Home className="size-4 text-muted-foreground" strokeWidth={2.25} />
            {km.homePage}
          </a>
        </div>
      )}
    </div>
  );
}
