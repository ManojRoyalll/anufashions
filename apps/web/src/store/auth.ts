import { create } from "zustand";
import api from "@/lib/api";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type AuthState = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hydrate: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  loading: false,
  login: async (email, password) => {
    set({ loading: true });
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      set({ user: data.user, token: data.token });
    } finally {
      set({ loading: false });
    }
  },
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    set({ user: null, token: null });
  },
  hydrate: () => {
    const token = localStorage.getItem("token");
    const userRaw = localStorage.getItem("user");
    if (token && userRaw) {
      set({ token, user: JSON.parse(userRaw) as User });
    }
  }
}));
