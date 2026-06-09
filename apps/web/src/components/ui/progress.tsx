export function Progress({ value }: { value: number }) {
  return (
    <div className="h-3 w-full rounded-full bg-brand-100">
      <div
        className="h-3 rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
