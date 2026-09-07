import { Check, QrCode, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { km } from "@/lib/copy-km";
import { HoverTip } from "./HoverTip";

type ClaimQrProps = {
  url: string | null;
  claimed: boolean;
  accent: "blue" | "red";
};

/** Minimalist QR trigger in panel header; click to enlarge. Hidden when no URL. */
export function ClaimQr({ url, claimed, accent }: ClaimQrProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!url) return null;

  const label = claimed ? km.qrClaimed : km.qrScanToJoin;
  const isBlue = accent === "blue";
  const accentText = isBlue ? "text-team-blue" : "text-team-red";
  const accentSoft = isBlue ? "bg-team-blue/15" : "bg-team-red/15";
  const accentRing = isBlue ? "ring-team-blue/35" : "ring-team-red/35";
  const accentHeader = isBlue
    ? "bg-team-blue shadow-[inset_0_-3px_0_var(--color-team-blue-deep)]"
    : "bg-team-red shadow-[inset_0_-3px_0_var(--color-team-red-deep)]";

  return (
    <>
      <HoverTip
        label={label}
        side="bottom"
        disabled={open}
        className="absolute top-1/2 right-2 z-10 -translate-y-1/2"
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={label}
          className={`flex size-9 items-center justify-center rounded-xl ring-1 transition duration-200 hover:scale-105 active:scale-95 sm:size-10 ${
            claimed
              ? "bg-white text-foreground shadow-md ring-white/80"
              : "bg-white/20 text-white shadow-sm ring-white/35 backdrop-blur-sm hover:bg-white/30"
          }`}
        >
          {claimed ? (
            <Check className={`size-5 ${accentText}`} strokeWidth={2.75} />
          ) : (
            <QrCode className="size-5" strokeWidth={2.25} />
          )}
        </button>
      </HoverTip>

      {open &&
        createPortal(
          <div
            className="animate-fade-in fixed inset-0 z-[60] flex items-center justify-center bg-foreground/45 p-3 backdrop-blur-md sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-label={label}
            onClick={() => setOpen(false)}
          >
            <div
              className={`animate-pop-in relative w-full max-w-sm overflow-hidden rounded-3xl bg-card text-center shadow-2xl ring-2 ${accentRing}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`relative px-3 py-3.5 ${accentHeader}`}>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={km.close}
                  className="absolute top-2 right-2 flex size-9 items-center justify-center rounded-xl text-white/85 transition hover:bg-white/20 hover:text-white active:scale-95"
                >
                  <X className="size-5" strokeWidth={2.5} />
                </button>
                <p className="pr-8 text-xl font-extrabold tracking-wide text-primary-foreground">
                  {label}
                </p>
              </div>
              <div className={`p-3 ${accentSoft}`}>
                {claimed ? (
                  <div className="mx-auto flex w-full flex-col items-center gap-3 rounded-2xl bg-white p-8 ring-1 ring-black/5">
                    <span
                      className={`flex size-16 items-center justify-center rounded-full ${accentSoft}`}
                    >
                      <Check className={`size-9 ${accentText}`} strokeWidth={2.75} />
                    </span>
                    <p className="text-base font-semibold text-muted-foreground">
                      {km.qrClaimedHint}
                    </p>
                  </div>
                ) : (
                  <div
                    className={`animate-qr-reveal mx-auto w-full rounded-2xl bg-white p-2.5 ring-2 ${accentRing}`}
                  >
                    <QRCodeSVG
                      value={url}
                      size={320}
                      marginSize={1}
                      level="M"
                      bgColor="#ffffff"
                      fgColor={isBlue ? "var(--team-blue-deep)" : "var(--team-red-deep)"}
                      className="h-auto w-full"
                    />
                  </div>
                )}
                {import.meta.env.DEV && !claimed && (
                  <p className="mt-3 text-xs font-semibold text-amber-800">{km.qrDevPreviewHint}</p>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
