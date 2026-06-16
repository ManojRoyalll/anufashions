import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  ShoppingCart, LayoutDashboard, Box, ShoppingBag,
  Settings, Home, X, LogOut, ZoomIn, ZoomOut, RefreshCw, ClipboardList, Menu
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useAppStore } from "@/store/app";
import { useLang } from "@/hooks/use-lang";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

// Bottom tab bar items (5 most-used)
const BOTTOM_TABS = [
  { to: "/home", label: "Home", sub: "హోమ్", icon: Home },
  { to: "/",     label: "Sell",  sub: "అమ్మకం", icon: ShoppingCart },
  { to: "/stock", label: "Stock", sub: "సరుకు", icon: Box },
  { to: "/buy",  label: "Buy",   sub: "కొనుగోలు", icon: ShoppingBag },
  { to: "/sales-history", label: "Sales", sub: "చరిత్ర", icon: ClipboardList },
];

// Full sidebar nav (desktop)
const SIDEBAR_NAV = [
  { to: "/home",          label: "Home",          sub: "హోమ్",              icon: Home },
  { to: "/",              label: "Sell",           sub: "అమ్మకం",           icon: ShoppingCart },
  { to: "/buy",           label: "Buy Stock",      sub: "కొనుగోలు",         icon: ShoppingBag },
  { to: "/stock",         label: "My Stock",       sub: "నా సరుకు",         icon: Box },
  { to: "/sales-history", label: "Sales History",  sub: "అమ్మకాల చరిత్ర",  icon: ClipboardList },
  { to: "/overview",      label: "Overview",       sub: "సారాంశం",          icon: LayoutDashboard },
  { to: "/settings",      label: "Settings",       sub: "సెట్టింగులు",      icon: Settings },
];

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const mobileOpen = useAppStore((s) => s.mobileOpen);
  const setMobileOpen = useAppStore((s) => s.setMobileOpen);
  const { t, lang, toggle } = useLang();

  const ZOOM_LEVELS = [80, 90, 100, 110, 125, 150];
  const savedZoom = Number(localStorage.getItem("zoom") || "100");
  const [zoom, setZoom] = useState(savedZoom);
  const [refreshing, setRefreshing] = useState(false);

  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(url, sw) {
      if (sw) setInterval(() => sw.update(), 60_000);
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) await reg.unregister();
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } finally { window.location.reload(); }
  };

  useEffect(() => {
    document.documentElement.style.fontSize = `${zoom}%`;
    localStorage.setItem("zoom", String(zoom));
  }, [zoom]);

  const zoomIn = () => setZoom(z => { const idx = ZOOM_LEVELS.indexOf(z); return idx < ZOOM_LEVELS.length - 1 ? ZOOM_LEVELS[idx + 1] : z; });
  const zoomOut = () => setZoom(z => { const idx = ZOOM_LEVELS.indexOf(z); return idx > 0 ? ZOOM_LEVELS[idx - 1] : z; });

  // Title from current route
  const currentPage = SIDEBAR_NAV.find(n => n.to === location.pathname);

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">

      {/* ── DESKTOP SIDEBAR ── */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-60 flex flex-col transition-transform duration-300",
        "md:static md:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}
        style={{ background: "linear-gradient(180deg, #fff8f0 0%, #fce4f1 100%)", borderRight: "2px solid #f9c0e2" }}>

        {/* Sidebar header */}
        <div className="px-4 py-5 flex items-center justify-between border-b border-brand-200">
          <Link to="/home" onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
            <span className="text-2xl">🌺</span>
            <div>
              <p className="font-bold text-brand-700 leading-tight text-base" style={{ fontFamily: "Noto Serif, serif" }}>Anu Fashions</p>
              <p className="text-xs text-brand-400">Sarees & Ladies Wear</p>
            </div>
          </Link>
          <button className="md:hidden text-slate-400 p-1 hover:bg-brand-100 rounded-lg" onClick={() => setMobileOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User */}
        <div className="px-4 py-3 border-b border-brand-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold text-sm">
              {(user?.name || "O")[0].toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-800">{user?.name || "Owner"}</p>
              <p className="text-xs text-slate-400">Admin</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {SIDEBAR_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/" || item.to === "/home"}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => cn(
                "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition",
                isActive
                  ? "bg-brand-600 text-white shadow-md"
                  : "text-brand-800 hover:bg-brand-100 hover:text-brand-700"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 leading-tight">
                <span className="block">{item.label}</span>
                <span className="block text-xs opacity-60 font-normal">{item.sub}</span>
              </span>
            </NavLink>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="px-3 py-3 border-t border-brand-200 space-y-1">
          <button
            onClick={() => { setMobileOpen(false); logout(); navigate("/login"); }}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>{t.logout} / లాగ్అవుట్</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── MAIN CONTENT ── */}
      <main className="pb-20 md:pb-0 min-h-screen" style={{ background: "linear-gradient(145deg, #fffaf5 0%, #fff8f0 100%)" }}>

        {/* Update banner */}
        {needRefresh && (
          <div className="flex items-center justify-between gap-3 bg-brand-700 px-4 py-3 text-white" style={{ position: "relative", zIndex: 60 }}>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-pulse" />
              <span className="text-sm font-semibold">New update available!</span>
            </div>
            <button
              onClick={async () => {
                try { await updateServiceWorker(true); } catch { /* ignore */ }
                setTimeout(() => window.location.reload(), 300);
              }}
              className="shrink-0 rounded-xl bg-white text-brand-700 px-4 py-2 text-sm font-bold hover:bg-brand-50 transition touch-manipulation"
            >
              Update Now
            </button>
          </div>
        )}

        {/* Top header bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b border-brand-100"
          style={{ background: "rgba(255,248,240,0.95)", backdropFilter: "blur(12px)" }}>

          {/* Left: hamburger (mobile) or page title (desktop) */}
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 rounded-xl hover:bg-brand-100 text-brand-600" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden md:block">
              <p className="font-bold text-brand-800 text-base leading-tight" style={{ fontFamily: "Noto Serif, serif" }}>
                {currentPage?.label || "Anu Fashions"}
              </p>
              <p className="text-xs text-brand-400">{currentPage?.sub}</p>
            </div>
            {/* Mobile: brand name */}
            <Link to="/home" className="md:hidden flex items-center gap-1.5">
              <span className="text-xl">🌺</span>
              <span className="font-bold text-brand-700 text-base" style={{ fontFamily: "Noto Serif, serif" }}>Anu Fashions</span>
            </Link>
          </div>

          {/* Right: refresh + zoom + language */}
          <div className="flex items-center gap-2">
            <button onClick={handleRefresh} disabled={refreshing} title="Refresh"
              className="rounded-full border border-brand-200 bg-white p-2 shadow-sm text-slate-500 hover:bg-brand-50 hover:text-brand-600 transition disabled:opacity-50">
              <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            </button>
            <div className="hidden sm:flex items-center gap-0.5 rounded-full border border-brand-200 bg-white px-1 py-1 shadow-sm">
              <button onClick={zoomOut} className="rounded-full p-1 text-slate-500 hover:bg-brand-50"><ZoomOut className="h-3.5 w-3.5" /></button>
              <span className="text-xs font-semibold text-slate-600 min-w-[28px] text-center">{zoom}%</span>
              <button onClick={zoomIn} className="rounded-full p-1 text-slate-500 hover:bg-brand-50"><ZoomIn className="h-3.5 w-3.5" /></button>
            </div>
            <button onClick={toggle}
              className="flex items-center gap-0.5 rounded-full border border-brand-200 bg-white px-1 py-1 text-xs font-bold shadow-sm">
              <span className={cn("rounded-full px-2 py-1 transition", lang === "en" ? "bg-brand-600 text-white" : "text-slate-500")}>EN</span>
              <span className={cn("rounded-full px-2 py-1 transition", lang === "te" ? "bg-brand-600 text-white" : "text-slate-500")}>తె</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="p-3 md:p-5">
          <Outlet />
        </div>
      </main>

      {/* ── MOBILE BOTTOM TAB BAR ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t-2 border-brand-200"
        style={{ background: "linear-gradient(180deg, rgba(255,248,240,0.97) 0%, #fff8f0 100%)", backdropFilter: "blur(16px)" }}>
        <div className="flex">
          {BOTTOM_TABS.map((tab) => {
            const isActive = location.pathname === tab.to || (tab.to === "/" && location.pathname === "/");
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.to === "/" || tab.to === "/home"}
                className="flex-1 flex flex-col items-center py-2.5 gap-0.5 transition"
              >
                <div className={cn(
                  "rounded-2xl p-2 transition",
                  isActive ? "bg-brand-600 text-white shadow-md" : "text-slate-400"
                )}>
                  <tab.icon className="h-5 w-5" />
                </div>
                <span className={cn("text-[10px] font-semibold leading-none", isActive ? "text-brand-700" : "text-slate-400")}>
                  {tab.label}
                </span>
              </NavLink>
            );
          })}
        </div>
        {/* iOS safe area */}
        <div className="h-safe-bottom bg-transparent" />
      </nav>
    </div>
  );
}
