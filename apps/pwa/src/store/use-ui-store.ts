"use client";

import { create } from "zustand";

type UIStore = {
  sidebarOpen: boolean;
  setSidebarOpen: (value: boolean) => void;
};

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: false,
  setSidebarOpen: (value) => set({ sidebarOpen: value })
}));
