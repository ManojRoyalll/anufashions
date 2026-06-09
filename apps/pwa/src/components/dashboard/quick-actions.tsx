"use client";

import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export function QuickActions() {
  const router = useRouter();
  const { t } = useTranslation();

  const actions = [
    { label: t("addProduct"), href: "/inventory" },
    { label: t("addSale"), href: "/sales" },
    { label: t("addPurchase"), href: "/purchases" },
    { label: t("addExpense"), href: "/expenses" },
    { label: t("addCustomer"), href: "/customers" },
    { label: t("generateReport"), href: "/reports" }
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {actions.map((a) => (
        <Button key={a.href} size="lg" onClick={() => router.push(a.href)} className="h-14">
          {a.label}
        </Button>
      ))}
    </div>
  );
}
