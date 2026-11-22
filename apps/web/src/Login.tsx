import { useState } from "react";
import { Tag, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth";

const LAST_EMAIL_KEY = "anu-last-email";

export default function Login() {
  const [email, setEmail] = useState(() => {
    try { return localStorage.getItem(LAST_EMAIL_KEY) || ""; } catch { return ""; }
  });
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setBusy(true);
    const msg = await signIn(email, pin);
    setBusy(false);
    if (msg) { setError("Wrong email or PIN. Please try again."); return; }
    try { localStorage.setItem(LAST_EMAIL_KEY, email.trim()); } catch { /* ignore */ }
  };

  return (
    <div className="min-h-dvh bg-brand-50/40 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div className="text-center space-y-3">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 text-white flex items-center justify-center shadow-md">
              <Tag className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-brand-900">Anu Fashions</h1>
              <p className="text-sm text-slate-500">Sign in to create labels · లేబుల్ తయారీ</p>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-brand-100 shadow-sm p-5 space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-brand-700">Email</span>
              <input
                type="email" autoComplete="username" inputMode="email" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 w-full rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-brand-700">PIN</span>
              <input
                type="password" autoComplete="current-password" inputMode="numeric" required
                value={pin} onChange={(e) => setPin(e.target.value)}
                placeholder="••••••"
                className="mt-1 w-full rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-base tracking-[0.4em] focus:border-brand-500 focus:outline-none"
              />
            </label>

            {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

            <Button type="submit" className="w-full py-3.5 text-base font-bold rounded-2xl" disabled={busy || !email || !pin}>
              <Lock className="mr-2 h-4 w-4" />
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </div>

          <p className="text-center text-xs text-slate-400">Only authorised accounts can access this app.</p>
        </form>
      </div>
    </div>
  );
}
