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
// Pattern (user's original style + random pad at end):
//   ANU5 + first digit of buy price + / + rest of buy digits + random digit
//   MP6  + first digit of sell price + / + rest of sell digits + random digit
//   D    + max discount %
//
// Example: buy=245, sell=490, disc=5 → ANU52/453-MP64/907-D5
// Example: buy=80,  sell=160, disc=10 → ANU58/03-MP61/603-D10
export function generateItemCode(buyPrice: number, sellPrice: number, maxDiscount = 0): string {
  const rand = () => String(Math.floor(Math.random() * 9) + 1); // 1–9
  const buy  = String(Math.round(buyPrice));
  const sell = String(Math.round(sellPrice));

  const anuCode = `ANU5${buy[0]}/${buy.slice(1)}${rand()}`;
  const mpCode  = `MP6${sell[0]}/${sell.slice(1)}${rand()}`;
  const dCode   = maxDiscount > 0 ? `-D${Math.round(maxDiscount)}` : "";

  return `${anuCode}-${mpCode}${dCode}`;
}
