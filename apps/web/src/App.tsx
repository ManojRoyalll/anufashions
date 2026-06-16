import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "@/components/layout/app-shell";
import HomePage from "@/pages/home-page";
import SalesPage from "@/pages/sales-page";
import SalesHistoryPage from "@/pages/sales-history-page";
import BuyPage from "@/pages/buy-page";
import ProductsPage from "@/pages/products-page";
import OverviewPage from "@/pages/overview-page";
import SettingsPage from "@/pages/settings-page";
import LoginPage from "@/pages/login-page";
import DashboardPage from "@/pages/dashboard-page";
import StockPage from "@/pages/stock-page";
import InvoicesPage from "@/pages/invoices-page";
import SuppliersPage from "@/pages/suppliers-page";
import CategoriesPage from "@/pages/categories-page";
import PriceRangesPage from "@/pages/price-ranges-page";
import CustomersPage from "@/pages/customers-page";
import PurchasesPage from "@/pages/purchases-page";
import AddStockPage from "@/pages/add-stock-page";
import ExpensesPage from "@/pages/expenses-page";
import ReportsPage from "@/pages/reports-page";
import { useAuthStore } from "@/store/auth";

function Protected({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Protected><AppShell /></Protected>}>
        <Route path="/home" element={<HomePage />} />
        {/* Primary 5-item nav */}
        <Route path="/" element={<SalesPage />} />
        <Route path="/buy" element={<BuyPage />} />
        <Route path="/stock" element={<ProductsPage />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/sales-history" element={<SalesHistoryPage />} />
        {/* Legacy routes kept working */}
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/stock-tabs" element={<StockPage />} />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/suppliers" element={<SuppliersPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/price-ranges" element={<PriceRangesPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/purchases" element={<PurchasesPage />} />
        <Route path="/add-stock" element={<AddStockPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/reports" element={<ReportsPage />} />
      </Route>
    </Routes>
  );
}
