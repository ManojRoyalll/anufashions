import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function inr(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value || 0);
}

// ── Item code generator ────────────────────────────────────────────────────────
// Pattern (user's original style):
//   ANU5 + first digit of buy + / + rest of buy digits + pad digit
//   MP6  + first digit of sell + / + rest of sell digits + pad digit
//   D    + max discount %
//
// pad is derived from a seed (use item id or a stable value) so the code
// doesn't change on every keystroke while typing — only changes when prices change.
//
// Example: buy=245, sell=490, disc=5, pad=3 → ANU52/403-MP64/903-D5
export function generateItemCode(buyPrice: number, sellPrice: number, maxDiscount = 0, seed = 0): string {
  // Derive a stable 1–9 digit from the seed so the pad doesn't flicker
  const pad = ((Math.abs(seed) % 9) + 1).toString();
  const buy  = String(Math.round(buyPrice));
  const sell = String(Math.round(sellPrice));

  const anuCode = `ANU5${buy[0]}/${buy.slice(1)}${pad}`;
  const mpCode  = `MP6${sell[0]}/${sell.slice(1)}${pad}`;
  const dCode   = maxDiscount > 0 ? `-D${Math.round(maxDiscount)}` : "";

  return `${anuCode}-${mpCode}${dCode}`;
}
