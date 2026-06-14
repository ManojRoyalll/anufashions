import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  ShoppingCart, LayoutDashboard, Box, ShoppingBag,
  Settings, Menu, X, LogOut, ZoomIn, ZoomOut, RefreshCw, ClipboardList
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useAppStore } from "@/store/app";
import { useLang } from "@/hooks/use-lang";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

export default function AppShell() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const mobileOpen = useAppStore((s) => s.mobileOpen);
  const setMobileOpen = useAppStore((s) => s.setMobileOpen);
  const { t, lang, toggle } = useLang();

  const ZOOM_LEVELS = [80, 90, 100, 110, 125, 150];
  const savedZoom = Number(localStorage.getItem("zoom") || "100");
  const [zoom, setZoom] = useState(savedZoom);
  const [refreshing, setRefreshing] = useState(false);

  // PWA update detection
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(url, sw) {
      // Poll for updates every 60 seconds while the app is open
      if (sw) setInterval(() => sw.update(), 60_000);
    },
  });

  // Manual refresh: tell the SW to skip waiting, then reload
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          await reg.unregister();
        }
      }
      // Clear all caches
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } finally {
      window.location.reload();
    }
  };

  useEffect(() => {
    document.documentElement.style.fontSize = `${zoom}%`;
    localStorage.setItem("zoom", String(zoom));
  }, [zoom]);

  const zoomIn = () => setZoom((z) => { const idx = ZOOM_LEVELS.indexOf(z); return idx < ZOOM_LEVELS.length - 1 ? ZOOM_LEVELS[idx + 1] : z; });
  const zoomOut = () => setZoom((z) => { const idx = ZOOM_LEVELS.indexOf(z); return idx > 0 ? ZOOM_LEVELS[idx - 1] : z; });

  const nav = [
    { to: "/", label: t.sell, sub: "అమ్మకం", icon: ShoppingCart },
    { to: "/buy", label: "Buy Stock", sub: "సరుకు కొనుగోలు", icon: ShoppingBag },
    { to: "/stock", label: t.myStock, sub: "నా సరుకు", icon: Box },
    { to: "/sales-history", label: "Sales History", sub: "అమ్మకాల చరిత్ర", icon: ClipboardList },
    { to: "/overview", label: t.overview, sub: "సారాంశం", icon: LayoutDashboard },
    { to: "/settings", label: "Settings", sub: "సెట్టింగులు", icon: Settings },
  ];

  return (
    <div className="min-h-screen md:grid md:grid-cols-[260px_1fr]">

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 border-r border-white/60 bg-white/90 p-4 backdrop-blur-md transition flex flex-col md:static md:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Sidebar header */}
        <div className="mb-4 flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-brand-700" onClick={() => setMobileOpen(false)}>
            Anu Fashions
          </Link>
          <button className="md:hidden text-slate-500 p-1 hover:bg-brand-50 rounded-lg" onClick={() => setMobileOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User name */}
        <p className="text-xs text-slate-500 mb-4 px-1">
          {t.welcome}, <span className="font-semibold text-brand-700">{user?.name || "Owner"}</span>
        </p>

        {/* Nav items */}
        <nav className="space-y-0.5 flex-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition",
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

        {/* Sidebar footer — logout */}
        <div className="border-t border-brand-100 pt-3 mt-3">
          <button
            onClick={() => { setMobileOpen(false); logout(); navigate("/login"); }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-terra-50 hover:text-terra-700 transition"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>{t.logout}</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <main className="p-3 md:p-6">
        {/* Update available banner */}
        {needRefresh && (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-brand-700 px-4 py-3 text-white shadow-lg" style={{ position: "relative", zIndex: 60 }}>
            <div className="flex items-center gap-2 min-w-0">
              <RefreshCw className="h-4 w-4 shrink-0 animate-pulse" />
              <span className="text-sm font-semibold">New update available!</span>
              <span className="text-xs text-brand-200 hidden sm:inline">Tap to reload with the latest version.</span>
            </div>
            <button
              onClick={async () => {
                try { await updateServiceWorker(true); } catch { /* ignore */ }
                // Always do a hard reload to guarantee fresh version
                setTimeout(() => window.location.reload(), 300);
              }}
              className="shrink-0 rounded-xl bg-white text-brand-700 px-4 py-2 text-sm font-bold hover:bg-brand-50 active:bg-brand-100 transition touch-manipulation"
            >
              Update Now
            </button>
          </div>
        )}

        {/* Header — compact, mobile-friendly */}
        <header className="mb-4 flex items-center justify-between rounded-2xl bg-white/80 px-3 py-2 backdrop-blur-sm shadow-sm">
          <button className="md:hidden p-1.5 rounded-xl hover:bg-brand-50" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5 text-slate-700" />
          </button>

          {/* Desktop: welcome text */}
          <p className="hidden md:block text-sm text-slate-600">
            {t.welcome}, <span className="font-semibold text-brand-700">{user?.name || "Owner"}</span>
          </p>

          {/* Right: refresh + zoom + language */}
          <div className="flex items-center gap-1.5 ml-auto">
            {/* Manual refresh button */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh app & clear cache"
              className="rounded-full border border-brand-200 bg-white p-2 shadow-sm text-slate-500 hover:bg-brand-50 hover:text-brand-700 transition disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            </button>
            {/* Zoom */}
            <div className="flex items-center gap-0.5 rounded-full border border-brand-200 bg-white px-1 py-1 shadow-sm">
              <button onClick={zoomOut} className="rounded-full p-1 text-slate-500 hover:bg-brand-50">
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="text-xs font-semibold text-slate-600 min-w-[28px] text-center">{zoom}%</span>
              <button onClick={zoomIn} className="rounded-full p-1 text-slate-500 hover:bg-brand-50">
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>
            {/* Language */}
            <button
              onClick={toggle}
              className="flex items-center gap-0.5 rounded-full border border-brand-200 bg-white px-1 py-1 text-xs font-semibold shadow-sm"
            >
              <span className={cn("rounded-full px-2 py-1 transition", lang === "en" ? "bg-brand-700 text-white" : "text-slate-500")}>EN</span>
              <span className={cn("rounded-full px-2 py-1 transition", lang === "te" ? "bg-brand-700 text-white" : "text-slate-500")}>తె</span>
            </button>
          </div>
        </header>

        <Outlet />
      </main>
    </div>
  );
}
