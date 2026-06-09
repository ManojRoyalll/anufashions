import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  trend?: number;
  accent?: "brand" | "terra" | "slate";
  subtitle?: string;
};

export function StatCard({ label, value, trend, accent = "brand", subtitle }: StatCardProps) {
  const borderColor = {
    brand: "border-l-brand-500",
    terra: "border-l-terra-500",
    slate: "border-l-slate-400"
  }[accent];

  return (
    <div className={cn("rounded-2xl border border-white/60 bg-white/80 backdrop-blur-sm shadow-premium border-l-4 p-4", borderColor)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {trend !== undefined && (
        <div className="mt-1 flex items-center gap-1">
          {trend > 0 ? (
            <TrendingUp className="h-3 w-3 text-brand-600" />
          ) : trend < 0 ? (
            <TrendingDown className="h-3 w-3 text-terra-500" />
          ) : (
            <Minus className="h-3 w-3 text-slate-400" />
          )}
          <span className={cn("text-xs font-medium", trend > 0 ? "text-brand-600" : trend < 0 ? "text-terra-500" : "text-slate-400")}>
            {trend > 0 ? "+" : ""}{trend.toFixed(1)}% vs last month
          </span>
        </div>
      )}
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}
