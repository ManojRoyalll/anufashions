import { cn } from "@/lib/utils";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none",
        props.className
      )}
    />
  );
}
