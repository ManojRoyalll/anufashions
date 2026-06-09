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

export interface AnalyticsPoint {
  date?: string;
  month?: string;
  name?: string;
  value?: number;
  quantity?: number;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
  category?: { name: string };
}
