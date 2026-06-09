"use client";

import { Bell, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function AppHeader() {
  const { t, i18n } = useTranslation();

  return (
    <header className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
      <Input className="min-w-[220px] flex-1" placeholder={t("search")} />
      <button className="rounded-xl border border-slate-200 p-3" aria-label={t("notifications")}>
        <Bell className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-2">
        <Languages className="h-4 w-4" />
        <Select
          className="border-none p-0"
          value={i18n.language.startsWith("te") ? "te" : "en"}
          onChange={(e) => {
            i18n.changeLanguage(e.target.value);
            localStorage.setItem("i18nextLng", e.target.value);
          }}
        >
          <option value="en">English</option>
          <option value="te">తెలుగు</option>
        </Select>
      </div>
    </header>
  );
}
