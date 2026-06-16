import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import { useLang } from "@/hooks/use-lang";

const TILES = [
  {
    to: "/",
    emoji: "💰",
    label: "Sell",
    sub: "అమ్మకం",
    desc: "Bill customers",
    bg: "from-brand-600 to-brand-700",
    shadow: "shadow-brand-300",
  },
  {
    to: "/stock",
    emoji: "📦",
    label: "My Stock",
    sub: "నా సరుకు",
    desc: "View & manage sarees",
    bg: "from-terra-400 to-terra-500",
    shadow: "shadow-terra-300",
  },
  {
    to: "/buy",
    emoji: "🛒",
    label: "Buy Stock",
    sub: "కొనుగోలు",
    desc: "Add new purchases",
    bg: "from-brand-500 to-brand-600",
    shadow: "shadow-brand-200",
  },
  {
    to: "/sales-history",
    emoji: "📋",
    label: "Sales",
    sub: "అమ్మకాల చరిత్ర",
    desc: "History & reports",
    bg: "from-terra-300 to-terra-400",
    shadow: "shadow-terra-200",
  },
  {
    to: "/overview",
    emoji: "📊",
    label: "Overview",
    sub: "సారాంశం",
    desc: "Business analytics",
    bg: "from-brand-400 to-brand-500",
    shadow: "shadow-brand-200",
  },
  {
    to: "/settings",
    emoji: "⚙️",
    label: "Settings",
    sub: "సెట్టింగులు",
    desc: "Manage categories & more",
    bg: "from-slate-500 to-slate-600",
    shadow: "shadow-slate-300",
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { lang, toggle } = useLang();

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(145deg, #fff8f0 0%, #fce4f1 60%, #fff8f0 100%)" }}>
      {/* Decorative top border */}
      <div className="h-1.5 bg-gradient-to-r from-brand-600 via-terra-400 to-brand-600" />

      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-800" style={{ fontFamily: "Noto Serif, serif" }}>
            🌺 Anu Fashions
          </h1>
          <p className="text-sm text-brand-500 mt-0.5">
            Welcome, <span className="font-semibold">{user?.name || "Owner"}</span>
          </p>
        </div>
        <button
          onClick={toggle}
          className="flex items-center gap-0.5 rounded-2xl border-2 border-brand-200 bg-white px-1 py-1 text-xs font-bold shadow-sm"
        >
          <span className={`rounded-xl px-2.5 py-1.5 transition ${lang === "en" ? "bg-brand-600 text-white" : "text-slate-500"}`}>EN</span>
          <span className={`rounded-xl px-2.5 py-1.5 transition ${lang === "te" ? "bg-brand-600 text-white" : "text-slate-500"}`}>తె</span>
        </button>
      </div>

      {/* Tiles grid */}
      <div className="px-4 pb-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {TILES.map((tile) => (
          <button
            key={tile.to}
            onClick={() => navigate(tile.to)}
            className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${tile.bg} p-5 text-left text-white shadow-lg active:scale-95 transition-transform`}
          >
            {/* Decorative circle */}
            <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
            <div className="absolute -bottom-6 -left-4 w-16 h-16 rounded-full bg-white/5" />

            <div className="relative">
              <span className="text-4xl block mb-3">{tile.emoji}</span>
              <p className="font-bold text-lg leading-tight">{tile.label}</p>
              <p className="text-xs opacity-80 mt-0.5">{tile.sub}</p>
              <p className="text-xs opacity-60 mt-2">{tile.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Bottom decorative border */}
      <div className="h-1 bg-gradient-to-r from-brand-600 via-terra-400 to-brand-600" />
    </div>
  );
}
