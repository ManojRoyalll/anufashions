import { useEffect } from "react";
import { createPortal } from "react-dom";
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
  /** When true, right pane does NOT scroll — preview stays pinned while left scrolls */
  rightFixed?: boolean;
  /** Column split, default "45/55" */
  split?: "40/60" | "45/55" | "50/50";
};

export function TwoPane({
  open, onClose, title, leftPane, rightPane,
  leftLabel = "Details", rightLabel = "Summary",
  rightFixed = false,
  split = "45/55",
}: TwoPaneProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const leftW  = split === "40/60" ? "sm:w-[40%]" : split === "50/50" ? "sm:w-[50%]" : "sm:w-[45%]";
  const rightW = split === "40/60" ? "sm:w-[60%]" : split === "50/50" ? "sm:w-[50%]" : "sm:w-[55%]";

  return createPortal(
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

        {/* Pane labels */}
        <div className="hidden sm:grid border-b border-brand-100 shrink-0"
          style={{ gridTemplateColumns: split === "40/60" ? "40% 60%" : split === "50/50" ? "50% 50%" : "45% 55%" }}>
          <div className="px-4 py-2 text-xs font-semibold text-brand-600 uppercase tracking-wide border-r border-brand-100">
            {leftLabel}
          </div>
          <div className="px-4 py-2 text-xs font-semibold text-brand-600 uppercase tracking-wide">
            {rightLabel}
          </div>
        </div>

        {/* Two panes */}
        <div className="flex flex-col sm:flex-row flex-1 min-h-0">

          {/* Left pane — always scrollable */}
          <div className={cn(
            leftW, "sm:border-r sm:border-brand-100",
            "overflow-y-auto overscroll-contain",
            "max-h-[50vh] sm:max-h-none",
          )}>
            <div className="p-4 sm:p-5 space-y-4">
              {leftPane}
            </div>
          </div>

          {/* Right pane — fixed (no scroll) when rightFixed=true, otherwise scrollable */}
          <div className={cn(
            rightW,
            rightFixed
              ? "overflow-hidden flex flex-col"           // preview never scrolls away
              : "overflow-y-auto overscroll-contain",
            "border-t border-brand-100 sm:border-t-0",
            "bg-brand-50/40",
            "flex-1 sm:flex-none",
          )}>
            <div className={cn(
              "p-4 sm:p-5 space-y-4",
              rightFixed && "h-full flex flex-col",
            )}>
              {rightPane}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
