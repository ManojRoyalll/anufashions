import { create } from "zustand";

type AppState = {
  mobileOpen: boolean;
  setMobileOpen: (value: boolean) => void;
};

export const useAppStore = create<AppState>((set) => ({
  mobileOpen: false,
  setMobileOpen: (value) => set({ mobileOpen: value })
}));
