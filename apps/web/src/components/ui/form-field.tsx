import { cn } from "@/lib/utils";

type FormFieldProps = {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
};

export function FormField({ label, error, required, children, className }: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label className="text-xs font-semibold uppercase tracking-wide text-brand-700">
        {label}
        {required && <span className="ml-0.5 text-terra-500">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-terra-500">{error}</p>}
    </div>
  );
}
