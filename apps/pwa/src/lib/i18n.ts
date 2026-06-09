"use client";

import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import en from "@/locales/en.json";
import te from "@/locales/te.json";

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: { en: { translation: en }, te: { translation: te } },
      fallbackLng: "en",
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "navigator"],
        caches: ["localStorage"]
      }
    });
}

export default i18n;
