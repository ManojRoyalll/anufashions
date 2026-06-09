import { create } from "zustand";
import { translations, type Translations } from "@/lib/i18n";

type LangState = {
  lang: "en" | "te";
  t: Translations;
  toggle: () => void;
};

const saved = (localStorage.getItem("lang") as "en" | "te") || "en";

export const useLangStore = create<LangState>((set) => ({
  lang: saved,
  t: translations[saved],
  toggle: () =>
    set((s) => {
      const next = s.lang === "en" ? "te" : "en";
      localStorage.setItem("lang", next);
      return { lang: next, t: translations[next] };
    })
}));
