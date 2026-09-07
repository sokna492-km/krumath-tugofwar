import { Check, QrCode, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { km } from "@/lib/copy-km";

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
  const accentText =
    accent === "blue" ? "text-team-blue" : "text-team-red";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={label}
        aria-label={label}
        className={`absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-xl ring-1 transition duration-200 hover:scale-105 active:scale-95 sm:size-10 ${
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
              className="animate-pop-in relative w-full max-w-sm rounded-3xl bg-card p-3 pt-4 text-center shadow-2xl ring-1 ring-border"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={km.close}
                className="absolute top-2.5 right-2.5 flex size-9 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-secondary hover:text-foreground active:scale-95"
              >
                <X className="size-5" strokeWidth={2.5} />
              </button>
              <p className="mb-2 pr-8 text-xl font-extrabold text-foreground">
                {label}
              </p>
              {claimed ? (
                <div className="mx-auto flex w-full flex-col items-center gap-3 rounded-2xl bg-white p-8 ring-1 ring-border/50">
                  <span
                    className={`flex size-16 items-center justify-center rounded-full ${
                      accent === "blue" ? "bg-team-blue/15" : "bg-team-red/15"
                    }`}
                  >
                    <Check className={`size-9 ${accentText}`} strokeWidth={2.75} />
                  </span>
                  <p className="text-base font-semibold text-muted-foreground">
                    {km.qrClaimedHint}
                  </p>
                </div>
              ) : (
                <div className="animate-qr-reveal mx-auto w-full rounded-2xl bg-white p-2 ring-1 ring-border/50">
                  <QRCodeSVG
                    value={url}
                    size={320}
                    marginSize={1}
                    className="h-auto w-full"
                  />
                </div>
              )}
              {import.meta.env.DEV && !claimed && (
                <p className="mt-3 text-xs font-semibold text-amber-700">
                  {km.qrDevPreviewHint}
                </p>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
