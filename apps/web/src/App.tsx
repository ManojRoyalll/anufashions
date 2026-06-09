import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "@/components/layout/app-shell";
import DashboardPage from "@/pages/dashboard-page";
import LoginPage from "@/pages/login-page";
import ProductsPage from "@/pages/products-page";
import SalesPage from "@/pages/sales-page";
import PurchasesPage from "@/pages/purchases-page";
import ExpensesPage from "@/pages/expenses-page";
import MastersPage from "@/pages/masters-page";
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
      <Route
        element={
          <Protected>
            <AppShell />
          </Protected>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/sales" element={<SalesPage />} />
        <Route path="/purchases" element={<PurchasesPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/masters" element={<MastersPage mode="customers" />} />
        <Route path="/suppliers" element={<MastersPage mode="suppliers" />} />
        <Route path="/reports" element={<ReportsPage />} />
      </Route>
    </Routes>
  );
}
