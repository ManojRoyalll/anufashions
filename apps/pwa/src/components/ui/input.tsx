import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn("h-11 w-full rounded-xl border border-slate-300 px-3 text-base outline-none focus:border-[#7f8a44]", className)}
      {...props}
    />
  );
}
