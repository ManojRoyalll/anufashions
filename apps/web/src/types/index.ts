export interface DashboardCards {
  totalInvestment: number;
  totalInventoryValue: number;
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  monthlyProfit: number;
  todaysSales: number;
  stockRemaining: number;
  netProfitAfterExpenses: number;
}

export interface DashboardPayload {
  cards: DashboardCards;
  investmentRecovery: {
    remainingInvestment: number;
    progress: number;
  };
}

export interface AnalyticsPayload {
  dailySalesTrend: { date: string; value: number }[];
  categoryWiseProfit: { name: string; value: number }[];
  inventoryDistribution: { name: string; value: number }[];
  topSellingProducts: { name: string; quantity: number }[];
  notifications: {
    lowStock: { id: string; name: string; quantity: number }[];
    outOfStock: { id: string; name: string; quantity: number }[];
  };
}
