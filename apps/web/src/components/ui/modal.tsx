import { X } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
};

export function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          // Fill up to 96% of screen height, flex column so header is sticky
          "relative z-10 w-full flex flex-col bg-white rounded-2xl shadow-premium",
          "max-h-[96vh]",
          size === "sm" && "max-w-sm",
          size === "md" && "max-w-lg",
          size === "lg" && "max-w-2xl"
        )}
      >
        {/* Sticky header — always visible */}
        <div className="flex items-center justify-between border-b border-brand-100 px-4 sm:px-6 py-3 sm:py-4 shrink-0">
          <h2 className="text-base sm:text-lg font-bold text-brand-900 truncate pr-3">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-brand-50 shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>
        {/* Scrollable body — header stays put */}
        <div className="overflow-y-auto overscroll-contain flex-1 px-4 sm:px-6 py-4 sm:py-5">
          {children}
        </div>
      </div>
    </div>
  );
}
