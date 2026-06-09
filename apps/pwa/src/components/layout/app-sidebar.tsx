"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, Boxes, ShoppingCart, ShoppingBag, Users, Truck, Wallet, FileText, Settings, ChartBar } from "lucide-react";
import { cn } from "@/lib/utils";

const menus = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/inventory", key: "inventory", icon: Boxes },
  { href: "/sales", key: "sales", icon: ShoppingCart },
  { href: "/purchases", key: "purchases", icon: ShoppingBag },
  { href: "/customers", key: "customers", icon: Users },
  { href: "/suppliers", key: "suppliers", icon: Truck },
  { href: "/expenses", key: "expenses", icon: Wallet },
  { href: "/reports", key: "reports", icon: FileText },
  { href: "/analytics", key: "analytics", icon: ChartBar },
  { href: "/settings", key: "settings", icon: Settings }
];

export function AppSidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <aside className="h-full w-64 border-r border-slate-200 bg-white p-4">
      <h2 className="mb-6 text-lg font-bold text-[#7f8a44]">{t("businessName")}</h2>
      <nav className="space-y-2">
        {menus.map((menu) => (
          <Link
            key={menu.href}
            href={menu.href}
            className={cn(
              "flex items-center gap-2 rounded-xl px-3 py-2 text-base",
              pathname === menu.href ? "bg-[#7f8a44] text-white" : "text-slate-700 hover:bg-slate-100"
            )}
          >
            <menu.icon className="h-4 w-4" />
            {t(menu.key)}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
