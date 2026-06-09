import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-brand-100 px-2 py-1 text-xs font-semibold text-brand-700",
        className
      )}
      {...props}
    />
  );
}
