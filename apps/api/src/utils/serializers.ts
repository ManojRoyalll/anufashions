export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (value && typeof value === "object" && "toNumber" in value && typeof (value as any).toNumber === "function") {
    return (value as any).toNumber();
  }
  return 0;
}

export function normalizeData<T>(input: T): T {
  if (Array.isArray(input)) {
    return input.map((item) => normalizeData(item)) as T;
  }

  if (input && typeof input === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (value && typeof value === "object" && "toNumber" in value && typeof (value as any).toNumber === "function") {
        output[key] = (value as any).toNumber();
      } else {
        output[key] = normalizeData(value as never);
      }
    }
    return output as T;
  }

  return input;
}
