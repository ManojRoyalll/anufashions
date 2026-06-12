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
// Pattern:
//   ANU part: random digit + buyPrice + random digit, split after 2 chars with /
//             → strip first+last digit of ANU section (no slash) = buy price
//   MP  part: sell price digits reversed
//   D   part: max discount %
//
// Example: buy=245, sell=490, disc=5 → ANU32/456-MP094-D5
export function generateItemCode(buyPrice: number, sellPrice: number, maxDiscount = 0): string {
  const rand = () => String(Math.floor(Math.random() * 9) + 1); // 1–9, never 0
  const buy = String(Math.round(buyPrice));
  const sell = String(Math.round(sellPrice));

  // ANU section: pad + buy + pad, insert / after position 2 (of the full string)
  const anuRaw = rand() + buy + rand();            // e.g. "3245 6" for buy=245
  const anuCode = anuRaw.slice(0, 2) + "/" + anuRaw.slice(2); // "32/456"

  // MP section: reverse the sell price digits
  const mpCode = sell.split("").reverse().join(""); // 490 → "094"

  // D section: max discount
  const dCode = maxDiscount > 0 ? `-D${Math.round(maxDiscount)}` : "";

  return `ANU${anuCode}-MP${mpCode}${dCode}`;
}
