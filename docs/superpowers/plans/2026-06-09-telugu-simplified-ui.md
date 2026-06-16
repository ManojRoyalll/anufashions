# Telugu + Simplified UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add bilingual English/Telugu support with a one-tap toggle, simplify all UI labels for a home saree business user, make Sell the home page, and add sales history to the Sell page.

**Architecture:** A single `i18n.ts` translation file exports `en` and `te` objects. A Zustand `lang.ts` store persists the choice to localStorage. A `useLang()` hook returns the active translation object `t`. Every component calls `const { t } = useLang()` and uses `t.someKey` for all visible text. No external i18n library needed.

**Tech Stack:** React 18, TypeScript, Zustand, Tailwind CSS, existing component library (`@/components/ui/*`)

---

## File Map

### New files
- `apps/web/src/lib/i18n.ts` — full translation dictionary for `en` and `te`
- `apps/web/src/store/lang.ts` — Zustand store: `lang`, `toggle()`, persisted to localStorage
- `apps/web/src/hooks/use-lang.ts` — `useLang()` hook returning `{ t, lang }`

### Modified files
- `apps/web/src/components/layout/app-shell.tsx` — EN/తె toggle in header, rename + reorder nav
- `apps/web/src/App.tsx` — swap `/` → SalesPage, `/dashboard` → DashboardPage
- `apps/web/src/pages/sales-page.tsx` — add sales history section with date filter tabs, translate labels
- `apps/web/src/pages/products-page.tsx` — reorder modal fields supplier-first, add More Details collapse, translate labels
- `apps/web/src/pages/dashboard-page.tsx` — translate labels
- `apps/web/src/pages/categories-page.tsx` — translate labels
- `apps/web/src/pages/price-ranges-page.tsx` — translate labels
- `apps/web/src/pages/suppliers-page.tsx` — translate labels
- `apps/web/src/pages/purchases-page.tsx` — translate labels
- `apps/web/src/pages/customers-page.tsx` — translate labels
- `apps/web/src/pages/expenses-page.tsx` — translate labels
- `apps/web/src/pages/reports-page.tsx` — translate labels
- `apps/web/src/pages/login-page.tsx` — translate labels

---

## Task 1: i18n translation file

**Files:**
- Create: `apps/web/src/lib/i18n.ts`

- [ ] **Step 1: Create the translation file**

```ts
// apps/web/src/lib/i18n.ts

export const translations = {
  en: {
    // Nav
    sell: "Sell",
    dashboard: "Dashboard",
    myStock: "My Stock",
    boughtStock: "Bought Stock",
    suppliers: "Suppliers",
    types: "Types",
    priceGroups: "Price Groups",
    reports: "Reports",
    customers: "Customers",
    expenses: "Expenses",

    // Actions
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    search: "Search saree by name...",
    generateBill: "Generate Bill",
    addToBill: "Add to Bill",
    logout: "Logout",

    // Product form
    sareeName: "Saree Name",
    supplier: "Supplier",
    type: "Type",
    buyPrice: "Buy Price (₹)",
    sellPrice: "Sell Price (₹)",
    profit: "Profit",
    pieces: "Pieces",
    photo: "Photo",
    notes: "Notes",
    maxDiscount: "Max Discount %",
    moreDetails: "More Details",
    productCode: "Product Code",
    mrp: "MRP (₹)",
    colour: "Colour",
    size: "Size",
    material: "Material",
    priceRange: "Price Group",
    addItem: "Add Item",
    editItem: "Edit Item",

    // Sales
    cart: "Cart",
    walkIn: "Walk-in Customer",
    discount: "Discount (₹)",
    gst: "GST (₹)",
    subtotal: "Subtotal",
    total: "Total",
    payment: "Payment",
    cash: "Cash",
    upi: "UPI",
    card: "Card",
    todaysSales: "Today's Sales",
    today: "Today",
    thisWeek: "This Week",
    thisMonth: "This Month",
    time: "Time",
    items: "Items",
    amount: "Amount",
    noSales: "No sales yet",
    totalSales: "Total",

    // Stock status
    inStock: "In Stock",
    lowStock: "Low Stock",
    outOfStock: "Out of Stock",
    stock: "Stock",

    // Dashboard
    totalInvestment: "Total Investment",
    totalInventoryValue: "Inventory Value",
    totalRevenue: "Total Revenue",
    totalProfit: "Total Profit",
    monthlyProfit: "This Month Profit",
    todaysSalesCount: "Today's Sales",
    stockRemaining: "Stock Left",
    netProfit: "Net Profit",
    investmentRecovery: "Investment Recovery",
    remaining: "Remaining",
    stockAlerts: "Stock Alerts",
    left: "left",

    // Categories
    name: "Name",
    description: "Description",
    status: "Status",
    active: "Active",
    inactive: "Inactive",
    addCategory: "Add Type",
    editCategory: "Edit Type",
    categoryName: "Type Name",

    // Price ranges
    minPrice: "Min Price (₹)",
    maxPrice: "Max Price (₹)",
    addPriceGroup: "Add Price Group",
    editPriceGroup: "Edit Price Group",
    rangeNameLabel: "Group Name",
    autoAssignNote: "All sarees with selling price in this range will be auto-assigned when saved.",

    // Suppliers
    phone: "Phone",
    email: "Email",
    address: "Address",
    productsSupplied: "What they supply",
    outstanding: "Outstanding (₹)",
    addSupplier: "Add Supplier",
    editSupplier: "Edit Supplier",

    // Purchases
    invoiceNo: "Invoice No",
    costPrice: "Cost Price (₹)",
    quantity: "Quantity",
    purchaseDate: "Date",
    purchaseHistory: "Purchase History",
    recordPurchase: "Record Purchase",

    // Common
    welcome: "Welcome",
    loading: "Loading...",
    noRecords: "No records found.",
    transactions: "transactions",
    units: "units",
    discountWarning: "Discount exceeds limit for",
    margin: "Profit",
    maxDisc: "Max disc",

    // Reports
    salesCsv: "Sales CSV",
    inventoryExcel: "Inventory Excel",
    summaryPdf: "Summary PDF",
    businessReports: "Business Reports",
  },

  te: {
    // Nav
    sell: "అమ్మకం",
    dashboard: "సారాంశం",
    myStock: "నా సరుకు",
    boughtStock: "కొన్న సరుకు",
    suppliers: "సరఫరాదారులు",
    types: "రకాలు",
    priceGroups: "ధర గుంపులు",
    reports: "నివేదికలు",
    customers: "కస్టమర్లు",
    expenses: "ఖర్చులు",

    // Actions
    save: "సేవ్ చేయి",
    cancel: "రద్దు చేయి",
    delete: "తొలగించు",
    edit: "మార్చు",
    add: "చేర్చు",
    search: "సారీ పేరు వెతుకు...",
    generateBill: "బిల్లు తయారు చేయి",
    addToBill: "బిల్లుకు చేర్చు",
    logout: "నిష్క్రమించు",

    // Product form
    sareeName: "సారీ పేరు",
    supplier: "సరఫరాదారు",
    type: "రకం",
    buyPrice: "కొన్న ధర (₹)",
    sellPrice: "అమ్మే ధర (₹)",
    profit: "లాభం",
    pieces: "పీసులు",
    photo: "ఫోటో",
    notes: "గమనికలు",
    maxDiscount: "గరిష్ట తగ్గింపు %",
    moreDetails: "మరిన్ని వివరాలు",
    productCode: "ప్రొడక్ట్ కోడ్",
    mrp: "గరిష్ట ధర (₹)",
    colour: "రంగు",
    size: "సైజు",
    material: "మెటీరియల్",
    priceRange: "ధర గ్రూప్",
    addItem: "సరుకు చేర్చు",
    editItem: "సరుకు మార్చు",

    // Sales
    cart: "బిల్లు",
    walkIn: "వచ్చిన కస్టమర్",
    discount: "తగ్గింపు (₹)",
    gst: "జీఎస్టీ (₹)",
    subtotal: "మొత్తం",
    total: "చెల్లించాల్సింది",
    payment: "చెల్లింపు",
    cash: "నగదు",
    upi: "యూపీఐ",
    card: "కార్డు",
    todaysSales: "ఈ రోజు అమ్మకాలు",
    today: "ఈ రోజు",
    thisWeek: "ఈ వారం",
    thisMonth: "ఈ నెల",
    time: "సమయం",
    items: "వస్తువులు",
    amount: "మొత్తం",
    noSales: "అమ్మకాలు లేవు",
    totalSales: "మొత్తం",

    // Stock status
    inStock: "సరుకు ఉంది",
    lowStock: "తక్కువ సరుకు",
    outOfStock: "సరుకు లేదు",
    stock: "సరుకు",

    // Dashboard
    totalInvestment: "మొత్తం పెట్టుబడి",
    totalInventoryValue: "సరుకు విలువ",
    totalRevenue: "మొత్తం ఆదాయం",
    totalProfit: "మొత్తం లాభం",
    monthlyProfit: "ఈ నెల లాభం",
    todaysSalesCount: "ఈ రోజు అమ్మకాలు",
    stockRemaining: "మిగిలిన సరుకు",
    netProfit: "నికర లాభం",
    investmentRecovery: "పెట్టుబడి తిరిగి రావడం",
    remaining: "మిగిలింది",
    stockAlerts: "సరుకు హెచ్చరికలు",
    left: "మిగిలింది",

    // Categories
    name: "పేరు",
    description: "వివరణ",
    status: "స్థితి",
    active: "చురుకుగా ఉంది",
    inactive: "నిష్క్రియంగా ఉంది",
    addCategory: "రకం చేర్చు",
    editCategory: "రకం మార్చు",
    categoryName: "రకం పేరు",

    // Price ranges
    minPrice: "కనిష్ట ధర (₹)",
    maxPrice: "గరిష్ట ధర (₹)",
    addPriceGroup: "ధర గ్రూప్ చేర్చు",
    editPriceGroup: "ధర గ్రూప్ మార్చు",
    rangeNameLabel: "గ్రూప్ పేరు",
    autoAssignNote: "ఈ ధర పరిధిలో అమ్మే ధర ఉన్న అన్ని సారీలు స్వయంగా చేర్చబడతాయి.",

    // Suppliers
    phone: "ఫోన్",
    email: "ఈమెయిల్",
    address: "చిరునామా",
    productsSupplied: "వారు ఏం ఇస్తారు",
    outstanding: "చెల్లించాల్సింది (₹)",
    addSupplier: "సరఫరాదారు చేర్చు",
    editSupplier: "సరఫరాదారు మార్చు",

    // Purchases
    invoiceNo: "ఇన్వాయిస్ నంబర్",
    costPrice: "కొన్న ధర (₹)",
    quantity: "పీసులు",
    purchaseDate: "తేదీ",
    purchaseHistory: "కొన్న చరిత్ర",
    recordPurchase: "కొన్నది నమోదు చేయి",

    // Common
    welcome: "స్వాగతం",
    loading: "లోడవుతోంది...",
    noRecords: "రికార్డులు లేవు.",
    transactions: "అమ్మకాలు",
    units: "పీసులు",
    discountWarning: "తగ్గింపు పరిమితి మించింది",
    margin: "లాభం",
    maxDisc: "గరిష్ట తగ్గింపు",

    // Reports
    salesCsv: "అమ్మకాల CSV",
    inventoryExcel: "సరుకు Excel",
    summaryPdf: "సారాంశం PDF",
    businessReports: "వ్యాపార నివేదికలు",
  }
} as const;

export type TranslationKey = keyof typeof translations.en;
export type Translations = typeof translations.en;
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/lib/i18n.ts
git commit -m "feat: add English/Telugu translation dictionary"
```

---

## Task 2: Language Zustand store + useLang hook

**Files:**
- Create: `apps/web/src/store/lang.ts`
- Create: `apps/web/src/hooks/use-lang.ts`

- [ ] **Step 1: Create lang store**

```ts
// apps/web/src/store/lang.ts
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
```

- [ ] **Step 2: Create useLang hook**

```ts
// apps/web/src/hooks/use-lang.ts
import { useLangStore } from "@/store/lang";

export function useLang() {
  const { t, lang, toggle } = useLangStore();
  return { t, lang, toggle };
}
```

- [ ] **Step 3: Verify TypeScript is clean**

```bash
cd /Users/c5365444/development/anufashions/apps/web && npx tsc --noEmit 2>&1
```
Expected: no output (zero errors)

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/store/lang.ts apps/web/src/hooks/use-lang.ts
git commit -m "feat: add lang Zustand store and useLang hook"
```

---

## Task 3: App shell — EN/తె toggle + nav rename + reorder

**Files:**
- Modify: `apps/web/src/components/layout/app-shell.tsx`

- [ ] **Step 1: Replace app-shell.tsx**

```tsx
// apps/web/src/components/layout/app-shell.tsx
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  ShoppingCart, LayoutDashboard, Box, ShoppingBag,
  Truck, Tag, Layers, FileText, Menu, LogOut
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useAppStore } from "@/store/app";
import { useLang } from "@/hooks/use-lang";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AppShell() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const mobileOpen = useAppStore((s) => s.mobileOpen);
  const setMobileOpen = useAppStore((s) => s.setMobileOpen);
  const { t, lang, toggle } = useLang();

  const nav = [
    { to: "/", label: t.sell, sub: "అమ్మకం", icon: ShoppingCart },
    { to: "/dashboard", label: t.dashboard, sub: "సారాంశం", icon: LayoutDashboard },
    { to: "/products", label: t.myStock, sub: "నా సరుకు", icon: Box },
    { to: "/purchases", label: t.boughtStock, sub: "కొన్న సరుకు", icon: ShoppingBag },
    { to: "/suppliers", label: t.suppliers, sub: "సరఫరాదారులు", icon: Truck },
    { to: "/categories", label: t.types, sub: "రకాలు", icon: Tag },
    { to: "/price-ranges", label: t.priceGroups, sub: "ధర గుంపులు", icon: Layers },
    { to: "/reports", label: t.reports, sub: "నివేదికలు", icon: FileText },
  ];

  return (
    <div className="min-h-screen md:grid md:grid-cols-[260px_1fr]">
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 border-r border-white/60 bg-white/90 p-4 backdrop-blur-md transition md:static md:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-brand-700">Anu Fashions</Link>
          <button className="md:hidden text-slate-500" onClick={() => setMobileOpen(false)}>✕</button>
        </div>
        <nav className="space-y-0.5">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition",
                isActive ? "bg-brand-100 text-brand-800" : "text-slate-600 hover:bg-brand-50 hover:text-brand-700"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 leading-tight">
                <span className="block">{item.label}</span>
                {lang === "en" && item.sub !== item.label && (
                  <span className="block text-xs text-slate-400 font-normal">{item.sub}</span>
                )}
              </span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="p-4 md:p-6">
        <header className="mb-5 flex items-center justify-between rounded-2xl bg-white/80 p-3 backdrop-blur-sm shadow-sm">
          <div className="flex items-center gap-2">
            <button className="md:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <p className="text-sm text-slate-600">
              {t.welcome}, <span className="font-semibold text-brand-700">{user?.name || "Owner"}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="flex items-center gap-0.5 rounded-full border border-brand-200 bg-white px-1 py-1 text-xs font-semibold shadow-sm"
            >
              <span className={cn("rounded-full px-2.5 py-1 transition", lang === "en" ? "bg-brand-700 text-white" : "text-slate-500")}>
                EN
              </span>
              <span className={cn("rounded-full px-2.5 py-1 transition", lang === "te" ? "bg-brand-700 text-white" : "text-slate-500")}>
                తె
              </span>
            </button>
            <Button variant="secondary" onClick={() => { logout(); navigate("/login"); }}>
              <LogOut className="mr-2 h-4 w-4" />{t.logout}
            </Button>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd /Users/c5365444/development/anufashions/apps/web && npx tsc --noEmit 2>&1
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/app-shell.tsx
git commit -m "feat: add EN/తె language toggle and bilingual nav labels"
```

---

## Task 4: App router — swap / and /dashboard

**Files:**
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Update App.tsx**

```tsx
// apps/web/src/App.tsx
import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "@/components/layout/app-shell";
import SalesPage from "@/pages/sales-page";
import DashboardPage from "@/pages/dashboard-page";
import LoginPage from "@/pages/login-page";
import ProductsPage from "@/pages/products-page";
import PurchasesPage from "@/pages/purchases-page";
import ExpensesPage from "@/pages/expenses-page";
import ReportsPage from "@/pages/reports-page";
import CategoriesPage from "@/pages/categories-page";
import PriceRangesPage from "@/pages/price-ranges-page";
import SuppliersPage from "@/pages/suppliers-page";
import CustomersPage from "@/pages/customers-page";
import { useAuthStore } from "@/store/auth";

function Protected({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Protected><AppShell /></Protected>}>
        <Route path="/" element={<SalesPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/sales" element={<SalesPage />} />
        <Route path="/purchases" element={<PurchasesPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/suppliers" element={<SuppliersPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/price-ranges" element={<PriceRangesPage />} />
        <Route path="/reports" element={<ReportsPage />} />
      </Route>
    </Routes>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/App.tsx
git commit -m "feat: make Sell the home page, Dashboard moves to /dashboard"
```

---

## Task 5: Sell page — translated labels + sales history section

**Files:**
- Modify: `apps/web/src/pages/sales-page.tsx`

- [ ] **Step 1: Replace sales-page.tsx**

```tsx
// apps/web/src/pages/sales-page.tsx
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToastStore } from "@/store/toast";
import { useLang } from "@/hooks/use-lang";
import { inr } from "@/lib/utils";

type CartItem = {
  productId: string; name: string; quantity: number;
  unitPrice: number; purchasePrice: number; discountLimit?: number;
};

type SaleRecord = {
  id: string; saleDate: string; totalAmount: number; paymentMethod: string;
  items: { quantity: number }[];
};

type HistoryPeriod = "today" | "week" | "month";

export default function SalesPage() {
  const { t } = useLang();
  const { show } = useToastStore();

  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [discount, setDiscount] = useState(0);
  const [gst, setGst] = useState(0);
  const [cart, setCart] = useState<CartItem[]>([]);

  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([]);
  const [period, setPeriod] = useState<HistoryPeriod>("today");

  const loadData = () =>
    Promise.all([api.get("/products"), api.get("/customers")]).then(([p, c]) => {
      setProducts(p.data);
      setCustomers(c.data);
    });

  const loadHistory = (p: HistoryPeriod) => {
    const now = new Date();
    let from: string;
    if (p === "today") {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    } else if (p === "week") {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      from = d.toISOString();
    } else {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      from = d.toISOString();
    }
    api.get("/sales", { params: { from } }).then((r) => setSalesHistory(r.data)).catch(() => {
      api.get("/sales").then((r) => setSalesHistory(r.data));
    });
  };

  useEffect(() => { loadData(); loadHistory("today"); }, []);

  const changePeriod = (p: HistoryPeriod) => { setPeriod(p); loadHistory(p); };

  const filtered = products.filter((p) =>
    [p.name, p.code, p.barcode, p.category?.name].join(" ").toLowerCase().includes(query.toLowerCase())
  );

  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0), [cart]);
  const total = subtotal - discount + gst;
  const discountPct = subtotal > 0 ? (discount / subtotal) * 100 : 0;
  const discountWarnings = cart.filter((i) => i.discountLimit != null && discountPct > i.discountLimit);

  const historyTotal = salesHistory.reduce((s, r) => s + Number(r.totalAmount), 0);

  const addToCart = (product: any) => {
    setCart((prev) => {
      const found = prev.find((c) => c.productId === product.id);
      if (found) return prev.map((c) => c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, {
        productId: product.id, name: product.name, quantity: 1,
        unitPrice: product.sellingPrice, purchasePrice: product.purchasePrice,
        discountLimit: product.discountLimit
      }];
    });
  };

  const checkout = async () => {
    if (cart.length === 0) return;
    const safeDiscount = Math.min(discount, subtotal);
    try {
      await api.post("/sales", {
        saleDate: new Date().toISOString(),
        customerId: customerId || undefined,
        paymentMethod,
        discount: safeDiscount,
        gst,
        items: cart.map(({ productId, quantity, unitPrice }) => ({ productId, quantity, unitPrice }))
      });
      setCart([]); setDiscount(0); setGst(0); setCustomerId("");
      show(t.generateBill + " ✓");
      loadHistory(period);
      loadData();
    } catch { show(t.notes + " — " + "Error", "error"); }
  };

  const periodLabel: Record<HistoryPeriod, string> = {
    today: t.today,
    week: t.thisWeek,
    month: t.thisMonth
  };

  return (
    <div className="space-y-5">
      {/* ── MAKE A SALE ── */}
      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <Card>
          <CardContent className="space-y-3">
            <h2 className="text-xl font-bold text-brand-900">{t.sell}</h2>
            <Input placeholder={t.search} value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="max-h-[460px] space-y-2 overflow-auto">
              {filtered.map((product) => (
                <div key={product.id} className="flex items-center justify-between rounded-xl bg-white/80 p-3 border border-brand-50">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-slate-500">
                      {product.category?.name} · {t.stock}: {product.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-sm font-semibold">{inr(product.sellingPrice)}</p>
                      {product.discountLimit != null && (
                        <p className="text-xs text-slate-400">{t.maxDisc}: {product.discountLimit}%</p>
                      )}
                    </div>
                    <Button size="sm" onClick={() => addToCart(product)} disabled={product.quantity === 0}>
                      {t.addToBill}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3">
            <h3 className="text-lg font-semibold">{t.cart}</h3>

            {discountWarnings.length > 0 && (
              <div className="rounded-xl bg-terra-50 px-3 py-2 text-xs text-terra-600 flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{t.discountWarning}: {discountWarnings.map(i => i.name).join(", ")}</span>
              </div>
            )}

            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.productId} className="rounded-xl bg-brand-50 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-slate-500">{t.margin}: {inr(item.unitPrice - item.purchasePrice)}</p>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <Input type="number" min={1} value={item.quantity}
                      onChange={(e) => setCart((prev) => prev.map((c) =>
                        c.productId === item.productId ? { ...c, quantity: Number(e.target.value) } : c
                      ))}
                      className="w-20" />
                    <span className="text-sm font-semibold">{inr(item.unitPrice * item.quantity)}</span>
                  </div>
                </div>
              ))}
            </div>

            <select className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">{t.walkIn}</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <div className="grid grid-cols-2 gap-2">
              <Input type="number" min={0} placeholder={t.discount} value={discount}
                onChange={(e) => setDiscount(Math.min(Number(e.target.value), subtotal))} />
              <Input type="number" placeholder={t.gst} value={gst}
                onChange={(e) => setGst(Number(e.target.value))} />
            </div>

            <select className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="CASH">{t.cash}</option>
              <option value="UPI">{t.upi}</option>
              <option value="CARD">{t.card}</option>
            </select>

            <div className="rounded-xl bg-brand-100 p-3 space-y-1 text-sm">
              <div className="flex justify-between"><span>{t.subtotal}</span><span>{inr(subtotal)}</span></div>
              <div className="flex justify-between text-terra-600"><span>{t.discount}</span><span>- {inr(discount)}</span></div>
              <div className="flex justify-between"><span>{t.gst}</span><span>+ {inr(gst)}</span></div>
              <div className="flex justify-between font-bold text-base border-t border-brand-200 pt-1">
                <span>{t.total}</span><span>{inr(total)}</span>
              </div>
            </div>

            <Button className="w-full text-base py-3" onClick={checkout} disabled={cart.length === 0}>
              {t.generateBill}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ── SALES HISTORY ── */}
      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-lg font-semibold">{t.todaysSales}</h3>
            <div className="flex gap-1">
              {(["today", "week", "month"] as HistoryPeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => changePeriod(p)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    period === p
                      ? "bg-brand-700 text-white"
                      : "bg-brand-50 text-brand-700 hover:bg-brand-100"
                  }`}
                >
                  {periodLabel[p]}
                </button>
              ))}
            </div>
          </div>

          {salesHistory.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">{t.noSales}</p>
          ) : (
            <div className="space-y-2">
              {salesHistory.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between rounded-xl bg-brand-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">
                      {sale.items.reduce((s, i) => s + i.quantity, 0)} {t.items}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(sale.saleDate).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      {" · "}
                      {sale.paymentMethod === "CASH" ? t.cash : sale.paymentMethod === "UPI" ? t.upi : t.card}
                    </p>
                  </div>
                  <p className="text-base font-bold text-brand-800">{inr(Number(sale.totalAmount))}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between rounded-xl bg-white border border-brand-200 px-4 py-3 text-sm font-semibold">
            <span>{t.totalSales}: {salesHistory.length} {t.transactions}</span>
            <span className="text-brand-800 text-base">{inr(historyTotal)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/sales-page.tsx
git commit -m "feat: add sales history section and Telugu labels to Sell page"
```

---

## Task 6: My Stock page — supplier-first form + simplified labels

**Files:**
- Modify: `apps/web/src/pages/products-page.tsx`

- [ ] **Step 1: Replace products-page.tsx**

```tsx
// apps/web/src/pages/products-page.tsx
import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import api from "@/lib/api";
import { useToastStore } from "@/store/toast";
import { useLang } from "@/hooks/use-lang";
import { inr } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { ImageUpload } from "@/components/ui/image-upload";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  supplierId: z.string().optional(),
  name: z.string().min(2, "Name required"),
  categoryId: z.string().min(1, "Type required"),
  purchasePrice: z.coerce.number().nonnegative(),
  sellingPrice: z.coerce.number().nonnegative(),
  discountLimit: z.coerce.number().min(0).max(100).optional(),
  quantity: z.coerce.number().int().nonnegative(),
  imageUrl: z.string().optional(),
  notes: z.string().optional(),
  // More details (hidden by default)
  code: z.string().optional(),
  mrp: z.coerce.number().nonnegative().optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  material: z.string().optional(),
  priceRangeId: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

type Product = {
  id: string; code: string; name: string; quantity: number;
  purchasePrice: number; sellingPrice: number; margin: number; profitPercentage: number;
  discountLimit?: number; stockStatus: string;
  categoryId: string; supplierId?: string; priceRangeId?: string;
  imageUrl?: string; color?: string; size?: string; material?: string; mrp?: number; notes?: string;
  category?: { name: string }; supplier?: { name: string }; priceRange?: { name: string };
};

export default function ProductsPage() {
  const { t } = useLang();
  const { show } = useToastStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [priceRanges, setPriceRanges] = useState<{ id: string; name: string }[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const { register, handleSubmit, reset, watch, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema)
  });

  const purchasePrice = watch("purchasePrice") || 0;
  const sellingPrice = watch("sellingPrice") || 0;
  const liveMargin = sellingPrice - purchasePrice;
  const livePct = purchasePrice > 0 ? ((liveMargin / purchasePrice) * 100) : 0;

  const load = () =>
    Promise.all([
      api.get("/products"),
      api.get("/categories"),
      api.get("/suppliers"),
      api.get("/price-ranges")
    ]).then(([p, c, s, r]) => {
      setProducts(p.data);
      setCategories(c.data);
      setSuppliers(s.data);
      setPriceRanges(r.data);
    });

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => products.filter((p) => {
    if (filterCategory && p.category?.name !== filterCategory) return false;
    if (filterStatus && p.stockStatus !== filterStatus) return false;
    return true;
  }), [products, filterCategory, filterStatus]);

  const openAdd = () => {
    setEditing(null);
    setShowMore(false);
    reset({ supplierId: "", name: "", categoryId: "", purchasePrice: 0, sellingPrice: 0, quantity: 0, discountLimit: 30 });
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setShowMore(false);
    reset({
      supplierId: p.supplierId ?? "",
      name: p.name,
      categoryId: p.categoryId,
      purchasePrice: p.purchasePrice,
      sellingPrice: p.sellingPrice,
      discountLimit: p.discountLimit ?? 30,
      quantity: p.quantity,
      imageUrl: p.imageUrl ?? "",
      notes: p.notes ?? "",
      code: p.code,
      mrp: p.mrp,
      color: p.color ?? "",
      size: p.size ?? "",
      material: p.material ?? "",
      priceRangeId: p.priceRangeId ?? "",
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        ...data,
        code: data.code || `ANU-${Date.now()}`,
        supplierId: data.supplierId || undefined,
        priceRangeId: data.priceRangeId || undefined,
      };
      if (editing) { await api.put(`/products/${editing.id}`, payload); show(t.save + " ✓"); }
      else { await api.post("/products", payload); show(t.addItem + " ✓"); }
      setModalOpen(false);
      load();
    } catch { show("Error", "error"); }
  };

  const remove = async (id: string) => {
    if (!confirm(t.delete + "?")) return;
    try { await api.delete(`/products/${id}`); show(t.delete + " ✓"); load(); }
    catch { show("Error", "error"); }
  };

  const stockBadge = (status: string) => {
    if (status === "IN_STOCK") return <Badge className="bg-brand-100 text-brand-700">{t.inStock}</Badge>;
    if (status === "LOW_STOCK") return <Badge className="bg-amber-100 text-amber-700">{t.lowStock}</Badge>;
    return <Badge className="bg-red-100 text-red-700">{t.outOfStock}</Badge>;
  };

  const lowCount = products.filter((p) => p.stockStatus === "LOW_STOCK").length;
  const outCount = products.filter((p) => p.stockStatus === "OUT_OF_STOCK").length;
  const inventoryValue = products.reduce((s, p) => s + p.purchasePrice * p.quantity, 0);

  const columns = [
    { key: "name", label: t.sareeName, sortable: true },
    { key: "category", label: t.type, render: (p: Product) => p.category?.name ?? "-" },
    { key: "supplier", label: t.supplier, render: (p: Product) => p.supplier?.name ?? "-" },
    { key: "purchasePrice", label: t.buyPrice, render: (p: Product) => inr(p.purchasePrice) },
    { key: "sellingPrice", label: t.sellPrice, render: (p: Product) => inr(p.sellingPrice) },
    { key: "margin", label: t.profit, render: (p: Product) => <span className="font-semibold text-brand-700">{inr(p.margin)}</span> },
    { key: "quantity", label: t.pieces },
    { key: "discountLimit", label: t.maxDiscount, render: (p: Product) => p.discountLimit != null ? `${p.discountLimit}%` : "-" },
    { key: "stockStatus", label: t.stock, render: (p: Product) => stockBadge(p.stockStatus) },
    { key: "actions", label: "", render: (p: Product) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(p)}><Pencil className="h-3 w-3" /></Button>
        <Button size="sm" variant="accent" onClick={() => remove(p.id)}><Trash2 className="h-3 w-3" /></Button>
      </div>
    )}
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.myStock}
        subtitle={`${products.length} ${t.items}`}
        actions={<Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />{t.addItem}</Button>}
      />

      <div className="flex flex-wrap gap-3 text-sm">
        <span className="rounded-xl bg-white/80 px-3 py-1.5 font-medium shadow-sm">{products.length} {t.items}</span>
        {lowCount > 0 && <span className="rounded-xl bg-amber-100 px-3 py-1.5 font-medium text-amber-700">{lowCount} {t.lowStock}</span>}
        {outCount > 0 && <span className="rounded-xl bg-red-100 px-3 py-1.5 font-medium text-red-700">{outCount} {t.outOfStock}</span>}
        <span className="rounded-xl bg-brand-100 px-3 py-1.5 font-medium text-brand-700">{inr(inventoryValue)}</span>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <select className="rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="">{t.types}</option>
              {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <select className="rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">{t.stock}</option>
              <option value="IN_STOCK">{t.inStock}</option>
              <option value="LOW_STOCK">{t.lowStock}</option>
              <option value="OUT_OF_STOCK">{t.outOfStock}</option>
            </select>
          </div>
          <DataTable columns={columns} data={filtered} searchable searchPlaceholder={t.search} searchKeys={["name", "code"]} />
        </CardContent>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t.editItem : t.addItem} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Supplier first */}
          <FormField label={t.supplier} error={errors.supplierId?.message}>
            <select {...register("supplierId")} className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
              <option value="">{t.supplier}...</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </FormField>

          <FormField label={t.sareeName} required error={errors.name?.message}>
            <Input {...register("name")} placeholder={t.sareeName} />
          </FormField>

          <FormField label={t.type} required error={errors.categoryId?.message}>
            <select {...register("categoryId")} className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
              <option value="">{t.type}...</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label={t.buyPrice} required error={errors.purchasePrice?.message}>
              <Input type="number" min={0} step="0.01" {...register("purchasePrice")} />
            </FormField>
            <FormField label={t.sellPrice} required error={errors.sellingPrice?.message}>
              <Input type="number" min={0} step="0.01" {...register("sellingPrice")} />
            </FormField>
          </div>

          {(purchasePrice > 0 || sellingPrice > 0) && (
            <div className="rounded-xl bg-brand-50 px-4 py-3 text-sm flex items-center gap-3">
              <span className="font-semibold text-brand-800">{t.profit}:</span>
              <span className={`font-bold text-lg ${liveMargin >= 0 ? "text-brand-700" : "text-terra-500"}`}>{inr(liveMargin)}</span>
              <span className="text-slate-500">({livePct.toFixed(1)}%)</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField label={t.maxDiscount} error={errors.discountLimit?.message}>
              <Input type="number" min={0} max={100} {...register("discountLimit")} placeholder="30" />
            </FormField>
            <FormField label={t.pieces} required error={errors.quantity?.message}>
              <Input type="number" min={0} {...register("quantity")} />
            </FormField>
          </div>

          <FormField label={t.photo}>
            <Controller
              control={control}
              name="imageUrl"
              render={({ field }) => <ImageUpload value={field.value} onChange={field.onChange} />}
            />
          </FormField>

          <FormField label={t.notes}>
            <Textarea {...register("notes")} placeholder={t.notes} />
          </FormField>

          {/* Collapsible More Details */}
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl bg-brand-50 px-4 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-100"
          >
            <span>{t.moreDetails}</span>
            {showMore ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showMore && (
            <div className="space-y-4 rounded-xl border border-brand-100 p-4">
              <FormField label={t.productCode} error={errors.code?.message}>
                <Input {...register("code")} placeholder="e.g. ANU-SILK-001" />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label={t.mrp} error={errors.mrp?.message}>
                  <Input type="number" min={0} step="0.01" {...register("mrp")} />
                </FormField>
                <FormField label={t.priceRange} error={errors.priceRangeId?.message}>
                  <select {...register("priceRangeId")} className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
                    <option value="">Auto</option>
                    {priceRanges.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </FormField>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField label={t.colour}><Input {...register("color")} /></FormField>
                <FormField label={t.size}><Input {...register("size")} /></FormField>
                <FormField label={t.material}><Input {...register("material")} /></FormField>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">{editing ? t.save : t.addItem}</Button>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>{t.cancel}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/products-page.tsx
git commit -m "feat: simplify My Stock form with supplier-first order and More Details collapse"
```

---

## Task 7: Translate all remaining pages

**Files:**
- Modify: `apps/web/src/pages/dashboard-page.tsx`
- Modify: `apps/web/src/pages/categories-page.tsx`
- Modify: `apps/web/src/pages/price-ranges-page.tsx`
- Modify: `apps/web/src/pages/suppliers-page.tsx`
- Modify: `apps/web/src/pages/purchases-page.tsx`
- Modify: `apps/web/src/pages/customers-page.tsx`
- Modify: `apps/web/src/pages/reports-page.tsx`
- Modify: `apps/web/src/pages/login-page.tsx`

Read each file before editing. For each page, add `import { useLang } from "@/hooks/use-lang";` and `const { t } = useLang();` at the top of the component, then replace every hardcoded English string with the matching `t.key` from `i18n.ts`.

- [ ] **Step 1: Translate dashboard-page.tsx**

Read `apps/web/src/pages/dashboard-page.tsx`, then replace hardcoded strings:

| Hardcoded string | Replace with |
|---|---|
| `"Loading dashboard..."` | `t.loading` |
| `"Total Investment"` | `t.totalInvestment` |
| `"Total Inventory Value"` | `t.totalInventoryValue` |
| `"Total Revenue"` | `t.totalRevenue` |
| `"Total Profit"` | `t.totalProfit` |
| `"Monthly Profit"` | `t.monthlyProfit` |
| `"Today's Sales"` (StatCard) | `t.todaysSalesCount` |
| `subtitle="transactions"` | `subtitle={t.transactions}` |
| `"Stock Remaining"` | `t.stockRemaining` |
| `subtitle="units"` | `subtitle={t.units}` |
| `"Net Profit (after expenses)"` | `t.netProfit` |
| `"Investment Recovery Progress"` | `t.investmentRecovery` |
| `"Remaining:"` | `t.remaining + ":"` |
| `"Daily Sales Trend"` | `"Daily Sales"` (keep short) |
| `"Category Wise Profit"` | `t.profit` |
| `"Inventory Distribution"` | `t.myStock` |
| `"Top Selling Products"` | `t.myStock + " – Top"` |
| `"sold"` | `t.sell` |
| `"Stock Alerts"` | `t.stockAlerts` |
| `"left"` | `t.left` |

- [ ] **Step 2: Translate categories-page.tsx**

Add `useLang`, replace:
- `"Categories"` → `t.types`
- `"Organise your products by type"` → `t.types`
- `"Add Category"` → `t.addCategory`
- `"Search categories..."` → `t.search`
- `"Name"` (column) → `t.name`
- `"Description"` (column) → `t.description`
- `"Status"` (column) → `t.status`
- `"ACTIVE"` (badge text) → `t.active`
- `"INACTIVE"` (badge text) → `t.inactive`
- `"Edit Category"` (modal title) → `t.editCategory`
- `"Add Category"` (modal title) → `t.addCategory`
- `"Name"` (form label) → `t.categoryName`
- `"Description"` (form label) → `t.description`
- `"Status"` (form label) → `t.status`
- `"Active"` (option) → `t.active`
- `"Inactive"` (option) → `t.inactive`
- `"Save Changes"` → `t.save`
- `"Create Category"` → `t.addCategory`
- `"Cancel"` → `t.cancel`
- `"Category updated"` → `t.save + " ✓"`
- `"Category created"` → `t.addCategory + " ✓"`
- `"Failed to save category"` → `"Error"`
- `"Delete this category?"` → `t.delete + "?"`
- `"Category deleted"` → `t.delete + " ✓"`
- `"Cannot delete — category has products"` → `"Error"`

- [ ] **Step 3: Translate price-ranges-page.tsx**

Add `useLang`, replace:
- `"Price Ranges"` → `t.priceGroups`
- `"Define segments..."` → `t.priceGroups`
- `"Add Range"` → `t.addPriceGroup`
- `"Search ranges..."` → `t.search`
- `"Name"` (column) → `t.name`
- `"Min Price"` (column) → `t.minPrice`
- `"Max Price"` (column) → `t.maxPrice`
- `"Items"` (column) → `t.items`
- `"Edit Price Range"` → `t.editPriceGroup`
- `"Add Price Range"` → `t.addPriceGroup`
- `"Range Name"` (form label) → `t.rangeNameLabel`
- `"Min Price (₹)"` → `t.minPrice`
- `"Max Price (₹)"` → `t.maxPrice`
- `"All products with selling price..."` → `t.autoAssignNote`
- `"Save Changes"` → `t.save`
- `"Create Range"` → `t.addPriceGroup`
- `"Cancel"` → `t.cancel`
- Toast messages → use `t.save + " ✓"` for success, `"Error"` for error

- [ ] **Step 4: Translate suppliers-page.tsx**

Add `useLang`, replace:
- `"Suppliers"` → `t.suppliers`
- `"Manage your stock suppliers"` → `t.suppliers`
- `"Add Supplier"` → `t.addSupplier`
- `"Search suppliers..."` → `t.search`
- `"Name"` → `t.name`
- `"Phone"` → `t.phone`
- `"Email"` → `t.email`
- `"Address"` → `t.address`
- `"Outstanding"` → `t.outstanding`
- `"Edit Supplier"` → `t.editSupplier`
- `"Add Supplier"` (modal title) → `t.addSupplier`
- `"Supplier name"` → `t.name`
- `"Phone number"` → `t.phone`
- `"Address"` → `t.address`
- `"Products Supplied"` → `t.productsSupplied`
- `"Save Changes"` → `t.save`
- `"Add Supplier"` (button) → `t.addSupplier`
- `"Cancel"` → `t.cancel`
- Toast → `t.save + " ✓"` / `"Error"`

- [ ] **Step 5: Translate purchases-page.tsx**

Read `apps/web/src/pages/purchases-page.tsx`, add `useLang`, replace:
- `"Supplier"` → `t.supplier`
- `"Invoice Number"` → `t.invoiceNo`
- `"Product"` → `t.sareeName`
- `"Record Purchase"` → `t.recordPurchase`
- `"Purchase History"` → `t.purchaseHistory`
- `"Date"` → `t.purchaseDate`
- `"Items"` → `t.items`
- `"Total"` → `t.total`
- `"Please select a supplier and product"` → `t.supplier + " / " + t.sareeName`
- `"Purchase recorded"` → `t.recordPurchase + " ✓"`
- `"Failed to record purchase"` → `"Error"`

- [ ] **Step 6: Translate customers-page.tsx**

Add `useLang`, replace:
- `"Customers"` → `t.customers`
- `"Track your customer base"` → `t.customers`
- `"Add Customer"` → `t.add + " " + t.customers`
- `"Search customers..."` → `t.search`
- `"Name"` → `t.name`
- `"Phone"` → `t.phone`
- `"Address"` → `t.address`
- `"Total Spend"` → `t.total`
- Modal titles / buttons → `t.save`, `t.cancel`, `t.add`, `t.edit`
- Toast → `t.save + " ✓"` / `"Error"`

- [ ] **Step 7: Translate reports-page.tsx**

Add `useLang`, replace:
- `"Business Reports"` → `t.businessReports`
- `"Sales CSV"` → `t.salesCsv`
- `"Inventory Excel"` → `t.inventoryExcel`
- `"Summary PDF"` → `t.summaryPdf`

- [ ] **Step 8: Translate login-page.tsx**

Read `apps/web/src/pages/login-page.tsx`, add `useLang`, replace visible English strings with translation keys.

- [ ] **Step 9: TypeScript check**

```bash
cd /Users/c5365444/development/anufashions/apps/web && npx tsc --noEmit 2>&1
```
Expected: no errors

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/pages/dashboard-page.tsx apps/web/src/pages/categories-page.tsx apps/web/src/pages/price-ranges-page.tsx apps/web/src/pages/suppliers-page.tsx apps/web/src/pages/purchases-page.tsx apps/web/src/pages/customers-page.tsx apps/web/src/pages/reports-page.tsx apps/web/src/pages/login-page.tsx
git commit -m "feat: apply Telugu/English translations to all pages"
```

---

## Task 8: Final TypeScript check + verify servers running

- [ ] **Step 1: TypeScript check**

```bash
cd /Users/c5365444/development/anufashions/apps/web && npx tsc --noEmit 2>&1
```
Expected: no output

- [ ] **Step 2: Verify Vite dev server is up**

```bash
curl -s http://localhost:5176 2>&1 | head -3
```
Expected: `<!doctype html>`

If not running, start it:
```bash
cd /Users/c5365444/development/anufashions/apps/web && npx vite --port 5176
```

- [ ] **Step 3: Final commit**

```bash
git add -A && git status
git commit -m "feat: complete Telugu + simplified UI — bilingual toggle, Sell as home, simplified stock form" --allow-empty
```
