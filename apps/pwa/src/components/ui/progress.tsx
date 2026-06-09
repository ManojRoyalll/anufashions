export function Progress({ value }: { value: number }) {
  return (
    <div className="h-3 w-full rounded-full bg-slate-200">
      <div className="h-3 rounded-full bg-[#7f8a44] transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
