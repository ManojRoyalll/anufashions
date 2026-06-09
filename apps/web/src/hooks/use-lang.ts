import { useLangStore } from "@/store/lang";

export function useLang() {
  const { t, lang, toggle } = useLangStore();
  return { t, lang, toggle };
}
