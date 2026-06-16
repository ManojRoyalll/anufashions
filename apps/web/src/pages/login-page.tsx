import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth";
import { useLang } from "@/hooks/use-lang";

export default function LoginPage() {
  const { t } = useLang();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);
  const [email, setEmail] = useState("admin@anufashions.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: "linear-gradient(145deg, #fff8f0 0%, #fce4f1 100%)" }}>

      {/* Decorative top band */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-brand-600 via-terra-400 to-brand-600" />

      {/* Logo card */}
      <div className="w-full max-w-sm space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-brand-600 shadow-lg mb-2">
            <span className="text-3xl">🌺</span>
          </div>
          <h1 className="text-3xl font-bold text-brand-700" style={{ fontFamily: "Noto Serif, serif" }}>
            Anu Fashions
          </h1>
          <p className="text-sm text-brand-400 font-medium">Sarees & Ladies Wear</p>
          <p className="text-xs text-slate-500">చీరలు & లేడీస్ వేర్</p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-3xl shadow-xl p-6 space-y-4 border border-brand-100">
          <div className="space-y-1 mb-2">
            <h2 className="text-lg font-bold text-brand-800">Welcome Back</h2>
            <p className="text-xs text-slate-500">Sign in to manage your shop</p>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-brand-700 mb-1">Email</p>
              <input
                type="email"
                data-no-caps
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border-2 border-brand-200 bg-brand-50 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none normal-case"
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-brand-700 mb-1">Password</p>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border-2 border-brand-200 bg-brand-50 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none normal-case"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          <button
            disabled={loading}
            onClick={async () => {
              try {
                setError("");
                await login(email, password);
                navigate("/");
              } catch {
                setError("Invalid credentials. Please try again.");
              }
            }}
            className="w-full py-4 rounded-2xl bg-brand-600 text-white font-bold text-lg hover:bg-brand-700 active:bg-brand-800 transition disabled:opacity-50 shadow-md"
          >
            {loading ? "Signing in…" : "Sign In →"}
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400">Anu Fashions ERP v2.0</p>
      </div>

      {/* Decorative bottom band */}
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-brand-600 via-terra-400 to-brand-600" />
    </div>
  );
}
