import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  ShoppingCart, LayoutDashboard, Box, ShoppingBag,
  Settings, Menu, LogOut
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useAppStore } from "@/store/app";
import { useLang } from "@/hooks/use-lang";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AppShell() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const mobileOpen = useAppStore((s) => s.mobileOpen);
  const setMobileOpen = useAppStore((s) => s.setMobileOpen);
  const { t, lang, toggle } = useLang();

  const nav = [
    { to: "/", label: t.sell, sub: "అమ్మకం", icon: ShoppingCart },
    { to: "/buy", label: "Buy Stock", sub: "సరుకు కొనుగోలు", icon: ShoppingBag },
    { to: "/stock", label: t.myStock, sub: "నా సరుకు", icon: Box },
    { to: "/overview", label: t.overview, sub: "సారాంశం", icon: LayoutDashboard },
    { to: "/settings", label: "Settings", sub: "సెట్టింగులు", icon: Settings },
  ];

  return (
    <div className="min-h-screen md:grid md:grid-cols-[260px_1fr]">
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 border-r border-white/60 bg-white/90 p-4 backdrop-blur-md transition md:static md:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-brand-700">Anu Fashions</Link>
          <button className="md:hidden text-slate-500" onClick={() => setMobileOpen(false)}>✕</button>
        </div>
        <nav className="space-y-0.5">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition",
                isActive ? "bg-brand-100 text-brand-800" : "text-slate-600 hover:bg-brand-50 hover:text-brand-700"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 leading-tight">
                <span className="block">{item.label}</span>
                {lang === "en" && (
                  <span className="block text-xs text-slate-400 font-normal">{item.sub}</span>
                )}
              </span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="p-4 md:p-6">
        <header className="mb-5 flex items-center justify-between rounded-2xl bg-white/80 p-3 backdrop-blur-sm shadow-sm">
          <div className="flex items-center gap-2">
            <button className="md:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <p className="text-sm text-slate-600">
              {t.welcome}, <span className="font-semibold text-brand-700">{user?.name || "Owner"}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="flex items-center gap-0.5 rounded-full border border-brand-200 bg-white px-1 py-1 text-xs font-semibold shadow-sm"
            >
              <span className={cn("rounded-full px-2.5 py-1 transition", lang === "en" ? "bg-brand-700 text-white" : "text-slate-500")}>
                EN
              </span>
              <span className={cn("rounded-full px-2.5 py-1 transition", lang === "te" ? "bg-brand-700 text-white" : "text-slate-500")}>
                తె
              </span>
            </button>
            <Button variant="secondary" onClick={() => { logout(); navigate("/login"); }}>
              <LogOut className="mr-2 h-4 w-4" />{t.logout}
            </Button>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
