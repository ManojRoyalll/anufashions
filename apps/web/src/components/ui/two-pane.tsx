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
    // Backdrop — intentionally NO onClick so outside taps never close this
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-sm">
      <div className="relative z-10 w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-100 shrink-0">
          <h2 className="text-base font-bold text-brand-900 truncate pr-4">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-brand-50 shrink-0"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Pane labels (tablet/desktop only) */}
        <div className="hidden md:grid md:grid-cols-[45%_55%] border-b border-brand-50 shrink-0">
          <div className="px-5 py-2 text-xs font-semibold text-brand-600 uppercase tracking-wide border-r border-brand-100">
            {leftLabel}
          </div>
          <div className="px-5 py-2 text-xs font-semibold text-brand-600 uppercase tracking-wide">
            {rightLabel}
          </div>
        </div>

        {/* Two panes */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0">
          {/* Left pane */}
          <div className="md:w-[45%] md:border-r md:border-brand-100 overflow-y-auto">
            <div className="p-5 space-y-4">
              {leftPane}
            </div>
          </div>

          {/* Right pane */}
          <div className={cn(
            "md:w-[55%] overflow-y-auto",
            "border-t border-brand-100 md:border-t-0",
            "bg-brand-50/30"
          )}>
            <div className="p-5 space-y-4">
              {rightPane}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
