import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "@/components/layout/app-shell";
import SalesPage from "@/pages/sales-page";
import StockPage from "@/pages/stock-page";
import InvoicesPage from "@/pages/invoices-page";
import OverviewPage from "@/pages/overview-page";
import DashboardPage from "@/pages/dashboard-page";
import LoginPage from "@/pages/login-page";
import ProductsPage from "@/pages/products-page";
import PurchasesPage from "@/pages/purchases-page";
import ExpensesPage from "@/pages/expenses-page";
import ReportsPage from "@/pages/reports-page";
import CategoriesPage from "@/pages/categories-page";
import PriceRangesPage from "@/pages/price-ranges-page";
import SuppliersPage from "@/pages/suppliers-page";
import CustomersPage from "@/pages/customers-page";
import AddStockPage from "@/pages/add-stock-page";
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
        <Route path="/" element={<SalesPage />} />
        <Route path="/stock" element={<StockPage />} />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/suppliers" element={<SuppliersPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/purchases" element={<PurchasesPage />} />
        <Route path="/add-stock" element={<AddStockPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/price-ranges" element={<PriceRangesPage />} />
        <Route path="/reports" element={<ReportsPage />} />
      </Route>
    </Routes>
  );
}
