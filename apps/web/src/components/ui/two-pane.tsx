import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type TwoPaneProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  leftPane: React.ReactNode;
  rightPane: React.ReactNode;
  leftLabel?: string;
  rightLabel?: string;
};

export function TwoPane({
  open, onClose, title, leftPane, rightPane,
  leftLabel = "Details", rightLabel = "Summary",
}: TwoPaneProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-3 bg-black/50 backdrop-blur-sm">
      <div className="relative z-10 w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col"
        style={{ height: "min(96vh, 900px)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-brand-100 shrink-0">
          <h2 className="text-base font-bold text-brand-900 truncate pr-4">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-brand-50 shrink-0 touch-manipulation"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Pane labels — visible from sm (640px) = tablet portrait and up */}
        <div className="hidden sm:grid sm:grid-cols-[45%_55%] border-b border-brand-100 shrink-0">
          <div className="px-4 py-2 text-xs font-semibold text-brand-600 uppercase tracking-wide border-r border-brand-100">
            {leftLabel}
          </div>
          <div className="px-4 py-2 text-xs font-semibold text-brand-600 uppercase tracking-wide">
            {rightLabel}
          </div>
        </div>

        {/* Two panes — side-by-side from sm (640px) upward */}
        <div className="flex flex-col sm:flex-row flex-1 min-h-0">

          {/* Left pane — form/action */}
          <div className={cn(
            "sm:w-[45%] sm:border-r sm:border-brand-100",
            "overflow-y-auto overscroll-contain",
            // On mobile: max half the modal height so right pane is still visible
            "max-h-[45vh] sm:max-h-none",
          )}>
            <div className="p-4 sm:p-5 space-y-4">
              {leftPane}
            </div>
          </div>

          {/* Right pane — preview/summary */}
          <div className={cn(
            "sm:w-[55%] overflow-y-auto overscroll-contain",
            "border-t border-brand-100 sm:border-t-0",
            "bg-brand-50/40",
            // On mobile: allow remaining space
            "flex-1 sm:flex-none",
          )}>
            <div className="p-4 sm:p-5 space-y-4">
              {rightPane}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
