export function calculateMargin(sellingPrice: number, purchasePrice: number) {
  const margin = sellingPrice - purchasePrice;
  const profitPercentage = purchasePrice > 0 ? (margin / purchasePrice) * 100 : 0;

  return {
    margin,
    profitPercentage
  };
}

export function calculateBreakEven(totalInvestment: number, totalProfit: number) {
  const remaining = Math.max(totalInvestment - totalProfit, 0);
  const progress = totalInvestment > 0 ? Math.min((totalProfit / totalInvestment) * 100, 100) : 0;

  return {
    remainingInvestment: remaining,
    progress
  };
}
