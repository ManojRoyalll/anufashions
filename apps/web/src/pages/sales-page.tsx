import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, X, Trash2, ScanLine, Pencil, Check } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Drawer } from "@/components/ui/drawer";
import { useToastStore } from "@/store/toast";
import { useLang } from "@/hooks/use-lang";
import { inr } from "@/lib/utils";
import { QRScanner } from "@/components/ui/qr-scanner";

type CartItem = {
  productId: string; name: string; quantity: number;
  unitPrice: number; originalPrice: number; purchasePrice: number; discountLimit?: number;
};

type SaleRecord = {
  id: string; saleDate: string; totalAmount: number; paymentMethod: string; discount: number;
  customer?: { name: string; phone?: string };
  items: {
    id: string; quantity: number; unitPrice: number; lineTotal?: number; purchasePrice?: number;
    product?: { name: string; id: string; supplier?: { name: string }; category?: { name: string } };
  }[];
};

type Customer = { id: string; name: string; phone?: string; totalSpend: number };
type HistoryPeriod = "today" | "week" | "month";

// Discount chips: 0%, 5%, 10%, 15%, 20% + flat amounts
const DISCOUNT_CHIPS = [
  { label: "0%",   value: 0,   isPercent: true },
  { label: "5%",   value: 5,   isPercent: true },
  { label: "10%",  value: 10,  isPercent: true },
  { label: "15%",  value: 15,  isPercent: true },
  { label: "20%",  value: 20,  isPercent: true },
  { label: "₹100", value: 100, isPercent: false },
  { label: "₹200", value: 200, isPercent: false },
  { label: "₹500", value: 500, isPercent: false },
];

export default function SalesPage() {
  const { t } = useLang();
  const { show } = useToastStore();
  const billRef = useRef<HTMLDivElement>(null);

  const [products, setProducts] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showScanner, setShowScanner] = useState(false);

  const [discountChip, setDiscountChip] = useState<number | null>(0);
  const [customDiscount, setCustomDiscount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [customerQuery, setCustomerQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Bill modal state
  const [checkingOut, setCheckingOut] = useState(false);  // ← double-submit guard
  const [generatedBill, setGeneratedBill] = useState<null | {
    items: CartItem[]; subtotal: number; discount: number; total: number;
    payment: string; customer: { name: string; phone: string } | null; date: string;
  }>(null);
  const [showBillModal, setShowBillModal] = useState(false);

  // Sales history
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([]);
  const [period, setPeriod] = useState<HistoryPeriod>("today");
  const [historySearch, setHistorySearch] = useState("");
  const [detailSale, setDetailSale] = useState<SaleRecord | null>(null);

  // Edit sale state
  const [editingSale, setEditingSale] = useState<SaleRecord | null>(null);
  const [editPayment, setEditPayment] = useState("CASH");
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerPhone, setEditCustomerPhone] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Ref for the search input so Add Bill can focus it
  const searchRef = useRef<HTMLInputElement>(null);

  const loadProducts = () => api.get("/products").then((r) => setProducts(r.data));
  const loadCustomers = () => api.get("/customers").then((r) => setAllCustomers(r.data));
  const loadHistory = (p: HistoryPeriod) => {
    const now = new Date();
    let from: string;
    if (p === "today") from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    else if (p === "week") { const d = new Date(now); d.setDate(d.getDate() - 7); from = d.toISOString(); }
    else from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    api.get("/sales", { params: { from } })
      .then((r) => setSalesHistory(r.data))
      .catch(() => api.get("/sales").then((r) => setSalesHistory(r.data)));
  };

  useEffect(() => { loadProducts(); loadCustomers(); loadHistory("today"); }, []);

  const customerMatches = useMemo(() => {
    if (!customerQuery.trim()) return [];
    const q = customerQuery.toLowerCase();
    return allCustomers.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))
    ).slice(0, 5);
  }, [allCustomers, customerQuery]);

  const selectCustomer = (c: Customer) => {
    setSelectedCustomer(c); setNewCustomerName(c.name);
    setNewCustomerPhone(c.phone ?? ""); setCustomerQuery(""); setShowCustomerDropdown(false);
  };
  const clearCustomer = () => {
    setSelectedCustomer(null); setNewCustomerName(""); setNewCustomerPhone(""); setCustomerQuery("");
  };

  const handleQRScan = (data: string) => {
    setShowScanner(false);
    const code = data.split("|")[0].trim();
    const found = products.find((p) => p.code === code || p.name.toLowerCase() === code.toLowerCase());
    if (found) { addToCart(found); show(`${found.name} added ✓`); }
    else show(`Item not found: ${code}`, "error");
  };

  const filtered = query.trim().length > 0
    ? products.filter((p) =>
        [p.name, p.code, p.barcode, p.category?.name].join(" ").toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const addToCart = (product: any) => {
    setCart((prev) => {
      const found = prev.find((c) => c.productId === product.id);
      if (found) return prev.map((c) => c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, {
        productId: product.id, name: product.name, quantity: 1,
        unitPrice: product.sellingPrice, originalPrice: product.sellingPrice,
        purchasePrice: product.purchasePrice, discountLimit: product.discountLimit
      }];
    });
  };

  const updateQty = (id: string, qty: number) => {
    if (qty < 1) return removeFromCart(id);
    setCart((prev) => prev.map((c) => c.productId === id ? { ...c, quantity: qty } : c));
  };

  const updatePrice = (id: string, price: number) => {
    setCart((prev) => prev.map((c) => c.productId === id ? { ...c, unitPrice: Math.max(0, price) } : c));
  };

  const removeFromCart = (id: string) => setCart((prev) => prev.filter((c) => c.productId !== id));

  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0), [cart]);

  const discountAmount = useMemo(() => {
    if (customDiscount !== "") return Math.min(Number(customDiscount) || 0, subtotal);
    if (discountChip === null) return 0;
    const chip = DISCOUNT_CHIPS[discountChip];
    if (!chip) return 0;
    return chip.isPercent ? Math.round(subtotal * chip.value / 100) : Math.min(chip.value, subtotal);
  }, [subtotal, discountChip, customDiscount]);

  const total = subtotal - discountAmount;
  const discountPct = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;

  const discountWarnings = cart.filter(
    (i) => i.discountLimit != null && discountPct > i.discountLimit
  );

  // ── CHECKOUT — guarded against double-submit ──────────────────────────────
  const checkout = async () => {
    if (cart.length === 0 || checkingOut) return;  // ← guard
    setCheckingOut(true);
    try {
      let customerId: string | undefined;
      if (newCustomerName.trim() || newCustomerPhone.trim()) {
        if (selectedCustomer) {
          customerId = selectedCustomer.id;
        } else {
          const phone = newCustomerPhone.trim();
          const existing = phone ? allCustomers.find((c) => c.phone === phone) : null;
          if (existing) {
            customerId = existing.id;
          } else {
            const res = await api.post("/customers", {
              name: newCustomerName.trim() || "Customer",
              phone: phone || undefined
            });
            customerId = res.data.id;
          }
          await loadCustomers();
        }
      }

      await api.post("/sales", {
        saleDate: new Date().toISOString(),
        customerId,
        paymentMethod,
        discount: discountAmount,
        gst: 0,
        items: cart.map(({ productId, quantity, unitPrice }) => ({ productId, quantity, unitPrice }))
      });

      const billData = {
        items: [...cart], subtotal, discount: discountAmount, total, payment: paymentMethod,
        customer: (newCustomerName.trim() || newCustomerPhone.trim())
          ? { name: newCustomerName.trim() || "Customer", phone: newCustomerPhone.trim() }
          : null,
        date: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
      };
      setGeneratedBill(billData);
      setShowBillModal(true);

      setCart([]); setCustomDiscount(""); setDiscountChip(0); clearCustomer();
      show(t.generateBill + " ✓");
      loadHistory(period);
      loadProducts();
    } catch (e: any) {
      show(e?.response?.data?.error || "Error", "error");
    } finally {
      setCheckingOut(false);  // ← always release
    }
  };

  const shareOnWhatsApp = () => {
    if (!generatedBill) return;
    const payLabel = generatedBill.payment === "CASH" ? "Cash" : generatedBill.payment === "UPI" ? "UPI" : "Card";
    const lines: string[] = [
      "*Anu Fashions*", "_Ladies Sarees & Dress Materials_", "---------------------------",
      `Date: ${generatedBill.date}`,
    ];
    if (generatedBill.customer) {
      lines.push(`Customer: *${generatedBill.customer.name}*`);
      if (generatedBill.customer.phone) lines.push(`Mobile: ${generatedBill.customer.phone}`);
    }
    lines.push("---------------------------");
    generatedBill.items.forEach((i) => {
      lines.push(`*${i.name}*`);
      lines.push(`  ${i.quantity} pc x ${inr(i.unitPrice)}  =  ${inr(i.quantity * i.unitPrice)}`);
    });
    lines.push("---------------------------");
    if (generatedBill.discount > 0) {
      lines.push(`Subtotal : ${inr(generatedBill.subtotal)}`);
      lines.push(`Discount : - ${inr(generatedBill.discount)}`);
      lines.push("---------------------------");
    }
    lines.push(`*TOTAL : ${inr(generatedBill.total)}*`, `Payment : ${payLabel}`, "---------------------------",
      "Thank you! Please visit again.", "Dhanyavaadalu - ధన్యవాదాలు");
    const text = encodeURIComponent(lines.join("\n"));
    const phone = generatedBill.customer?.phone?.replace(/\D/g, "");
    window.open(phone ? `https://wa.me/91${phone}?text=${text}` : `https://wa.me/?text=${text}`, "_blank");
  };

  const deleteSale = async (id: string) => {
    if (!confirm("Delete this sale?")) return;
    try {
      await api.delete(`/sales/${id}`);
      show(t.delete + " ✓");
      loadHistory(period);
      loadCustomers();
    } catch { show("Error", "error"); }
  };

  const openEditSale = (sale: SaleRecord) => {
    setEditingSale(sale);
    setEditPayment(sale.paymentMethod);
    setEditCustomerName(sale.customer?.name ?? "");
    setEditCustomerPhone(sale.customer?.phone ?? "");
  };

  const saveEditSale = async () => {
    if (!editingSale) return;
    setEditSaving(true);
    try {
      // Update payment method
      await api.put(`/sales/${editingSale.id}`, {
        paymentMethod: editPayment,
        updatedAt: new Date().toISOString(),
      });
      // If customer name was added/changed and sale had no customer, create one
      if (editCustomerName.trim() && !editingSale.customer) {
        const phone = editCustomerPhone.trim();
        const existing = phone ? allCustomers.find(c => c.phone === phone) : null;
        let custId: string;
        if (existing) {
          custId = existing.id;
        } else {
          const res = await api.post("/customers", { name: editCustomerName.trim(), phone: phone || undefined });
          custId = res.data.id;
        }
        await api.put(`/sales/${editingSale.id}`, { customerId: custId, updatedAt: new Date().toISOString() });
        await loadCustomers();
      }
      show("Sale updated ✓");
      setEditingSale(null);
      loadHistory(period);
    } catch { show("Error saving", "error"); }
    finally { setEditSaving(false); }
  };

  const periodLabel: Record<HistoryPeriod, string> = { today: t.today, week: t.thisWeek, month: t.thisMonth };

  const BillContent = ({ bill }: { bill: typeof generatedBill }) => {
    if (!bill) return null;
    return (
      <div ref={billRef} className="bg-white border-2 border-dashed border-brand-200 rounded-xl p-4 font-mono text-xs space-y-1">
        <p className="text-center font-bold text-base">Anu Fashions</p>
        <p className="text-center text-slate-500 text-xs">Ladies Sarees & Dress Materials</p>
        <hr className="border-dashed border-brand-200 my-1" />
        <p className="flex justify-between"><span>Date:</span><span>{bill.date}</span></p>
        {bill.customer && (
          <>
            <p className="flex justify-between"><span>Customer:</span><span className="font-semibold">{bill.customer.name}</span></p>
            {bill.customer.phone && <p className="flex justify-between"><span>Mobile:</span><span>{bill.customer.phone}</span></p>}
          </>
        )}
        <hr className="border-dashed border-brand-200 my-1" />
        {bill.items.map((i, idx) => (
          <div key={idx}>
            <p className="font-semibold">{i.name}</p>
            <p className="flex justify-between text-slate-600"><span>{i.quantity} × {inr(i.unitPrice)}</span><span className="font-bold">{inr(i.quantity * i.unitPrice)}</span></p>
          </div>
        ))}
        <hr className="border-dashed border-brand-200 my-1" />
        {bill.discount > 0 && (
          <>
            <p className="flex justify-between text-slate-500"><span>Subtotal</span><span>{inr(bill.subtotal)}</span></p>
            <p className="flex justify-between text-terra-600 font-semibold"><span>Discount</span><span>− {inr(bill.discount)}</span></p>
          </>
        )}
        <p className="flex justify-between font-black text-base border-t border-brand-200 pt-1"><span>TOTAL</span><span>{inr(bill.total)}</span></p>
        <p className="flex justify-between text-slate-500"><span>Payment</span><span>{bill.payment}</span></p>
        <hr className="border-dashed border-brand-200 my-1" />
        <p className="text-center text-slate-500">Thank you! Please visit again.</p>
        <p className="text-center text-brand-700">ధన్యవాదాలు · మళ్ళీ రండి</p>
      </div>
    );
  };

  return (
    <>
      {showScanner && <QRScanner onScan={handleQRScan} onClose={() => setShowScanner(false)} />}

      {/* ── BILL MODAL — opens immediately after checkout ── */}
      <Modal open={showBillModal} onClose={() => setShowBillModal(false)} title="Bill Generated ✅" size="md">
        {generatedBill && (
          <div className="space-y-4">
            <BillContent bill={generatedBill} />
            <button
              onClick={shareOnWhatsApp}
              className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
              style={{ background: "#25D366" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.374 0 0 5.373 0 12c0 2.117.549 4.107 1.508 5.84L0 24l6.335-1.48A11.945 11.945 0 0012 24c6.626 0 12-5.373 12-12 0-6.628-5.374-12-12-12zm0 21.818a9.817 9.817 0 01-5.006-1.366l-.36-.214-3.76.878.899-3.654-.235-.374A9.808 9.808 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z"/></svg>
              Share Bill on WhatsApp
            </button>
            <button onClick={() => setShowBillModal(false)} className="w-full py-2.5 rounded-xl text-sm text-brand-600 border border-brand-200 hover:bg-brand-50 font-semibold">
              Close
            </button>
          </div>
        )}
      </Modal>

      {/* ── EDIT SALE MODAL ── */}
      <Modal open={!!editingSale} onClose={() => setEditingSale(null)} title="Edit Sale" size="sm">
        {editingSale && (
          <div className="space-y-4">
            <div className="bg-brand-50 rounded-xl p-3 space-y-1 text-sm">
              <p className="font-semibold text-brand-900">{editingSale.items.reduce((s, i) => s + i.quantity, 0)} items · {inr(Number(editingSale.totalAmount))}</p>
              <p className="text-slate-500">{new Date(editingSale.saleDate).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
            </div>

            {/* Customer — editable, pre-filled if exists */}
            <div>
              <p className="text-xs font-semibold text-brand-700 mb-2">
                Customer {editingSale.customer && <span className="text-slate-400 font-normal">(already assigned)</span>}
              </p>
              {editingSale.customer ? (
                <div className="rounded-xl bg-brand-50 px-3 py-2.5 text-sm">
                  <p className="font-semibold text-brand-900">{editingSale.customer.name}</p>
                  {editingSale.customer.phone && <p className="text-xs text-slate-500">{editingSale.customer.phone}</p>}
                  <p className="text-xs text-slate-400 mt-1">Customer already linked — remove and recreate sale to change.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">Add customer if missed during billing</p>
                  <input
                    type="text" placeholder="Customer name" value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                    className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
                  />
                  <input
                    type="tel" placeholder="Mobile number (optional)" value={editCustomerPhone}
                    onChange={(e) => setEditCustomerPhone(e.target.value.replace(/\D/g, ""))}
                    className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none normal-case"
                  />
                </div>
              )}
            </div>

            {/* Payment method */}
            <div>
              <p className="text-xs font-semibold text-brand-700 mb-2">Payment Method</p>
              <div className="grid grid-cols-3 gap-2">
                {[["CASH", "💵", t.cash], ["UPI", "📱", t.upi], ["CARD", "💳", t.card]].map(([val, icon, label]) => (
                  <button key={val} onClick={() => setEditPayment(val)}
                    className={`rounded-xl py-2.5 text-center font-bold border-2 transition ${editPayment === val ? "bg-brand-700 text-white border-brand-700" : "bg-white text-brand-700 border-brand-200"}`}>
                    <span className="block text-xl">{icon}</span>
                    <span className="block text-xs mt-0.5">{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setEditingSale(null)}>Cancel</Button>
              <Button className="flex-1" onClick={saveEditSale} disabled={editSaving}>
                {editSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <div className="space-y-3 max-w-2xl mx-auto pb-36">

        {/* ── SEARCH + SCAN ── */}
        <div className="flex gap-2">
          <input
            ref={searchRef}
            type="text"
            placeholder={t.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="flex-1 rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none text-base"
          />
          <button onClick={() => setShowScanner(true)}
            className="shrink-0 flex items-center gap-1.5 rounded-xl bg-brand-700 text-white px-4 py-2 text-sm font-bold hover:bg-brand-800 transition">
            <ScanLine className="h-5 w-5" />
          </button>
        </div>

        {/* ── PRODUCT SEARCH RESULTS ── */}
        {query.trim().length > 0 && (
          <Card>
            <CardContent className="p-2 space-y-1">
              {filtered.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-4">{t.noRecords}</p>
              ) : (
                filtered.map((product) => (
                  <button key={product.id} onClick={() => { addToCart(product); setQuery(""); }}
                    disabled={product.quantity === 0}
                    className="w-full flex items-center justify-between rounded-xl px-3 py-3 hover:bg-brand-50 active:bg-brand-100 transition disabled:opacity-40 text-left">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-brand-900">{product.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {product.category?.name}{" · "}
                        <span className={product.quantity <= 5 ? "text-terra-500 font-semibold" : ""}>Stock: {product.quantity}</span>
                      </p>
                    </div>
                    <div className="ml-3 shrink-0 text-right">
                      <p className="font-bold text-brand-800">{inr(product.sellingPrice)}</p>
                      {product.discountLimit != null && <p className="text-xs text-slate-400">Max disc: {product.discountLimit}%</p>}
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* ── CART ── */}
        {cart.length > 0 && (
          <Card>
            <CardContent className="space-y-2 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-brand-700">🧾 {t.cart}</p>
              {cart.map((item) => {
                const lineTotal = item.quantity * item.unitPrice;
                const billDiscount = discountAmount > 0 && subtotal > 0
                  ? (item.quantity * item.unitPrice / subtotal) * discountAmount : 0;
                const itemProfit = (item.unitPrice - item.purchasePrice) * item.quantity - billDiscount;
                const priceChanged = item.unitPrice !== item.originalPrice;
                return (
                  <div key={item.productId} className="bg-brand-50 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm text-brand-900 flex-1 truncate">{item.name}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${itemProfit >= 0 ? "bg-brand-100 text-brand-700" : "bg-red-100 text-red-600"}`}>
                          {t.profit} {inr(itemProfit)}
                        </span>
                        <button onClick={() => removeFromCart(item.productId)} className="text-terra-400 p-0.5">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item.productId, item.quantity - 1)} className="w-9 h-9 rounded-lg border-2 border-brand-300 bg-white font-bold text-brand-700 text-xl hover:bg-brand-100 flex items-center justify-center">−</button>
                      <span className="w-8 text-center font-bold text-lg text-brand-900">{item.quantity}</span>
                      <button onClick={() => updateQty(item.productId, item.quantity + 1)} className="w-9 h-9 rounded-lg border-2 border-brand-300 bg-white font-bold text-brand-700 text-xl hover:bg-brand-100 flex items-center justify-center">+</button>
                      <span className="text-xs text-slate-500 ml-1">₹</span>
                      <input type="number" value={item.unitPrice}
                        onChange={(e) => updatePrice(item.productId, Number(e.target.value))}
                        className={`w-24 rounded-lg border-2 px-2 py-1.5 text-sm font-bold text-center normal-case ${priceChanged ? "border-terra-400 bg-terra-50 text-terra-700" : "border-brand-200 bg-white"}`}
                      />
                      <span className="ml-auto font-bold text-base text-brand-800">{inr(lineTotal)}</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* ── DISCOUNT ── */}
        {cart.length > 0 && (
          <Card>
            <CardContent className="p-3 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-brand-700">{t.discount}</p>
              <div className="flex flex-wrap gap-2">
                {DISCOUNT_CHIPS.map((chip, i) => (
                  <button key={i} onClick={() => { setDiscountChip(i); setCustomDiscount(""); }}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition ${discountChip === i && customDiscount === "" ? "bg-brand-700 text-white border-brand-700" : "bg-white text-brand-700 border-brand-200"}`}>
                    {chip.label}
                  </button>
                ))}
                <div className="flex items-center gap-1 bg-brand-50 rounded-full px-3 py-1.5 border border-brand-200 flex-1 min-w-24">
                  <span className="text-xs text-brand-700">₹</span>
                  <input type="number" placeholder="Custom" value={customDiscount}
                    onChange={(e) => { setCustomDiscount(e.target.value); setDiscountChip(null); }}
                    className="w-full bg-transparent text-sm font-bold text-brand-900 focus:outline-none normal-case" />
                </div>
              </div>
              {discountWarnings.length > 0 && (
                <div className="flex items-start gap-2 rounded-xl bg-terra-50 px-3 py-2 text-xs text-terra-600">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{t.discountWarning}: {discountWarnings.map(i => i.name).join(", ")}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── PAYMENT ── */}
        {cart.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {[["CASH", "💵", t.cash], ["UPI", "📱", t.upi], ["CARD", "💳", t.card]].map(([val, icon, label]) => (
              <button key={val} onClick={() => setPaymentMethod(val)}
                className={`rounded-xl py-3 text-center font-bold border-2 transition ${paymentMethod === val ? "bg-brand-700 text-white border-brand-700" : "bg-white text-brand-700 border-brand-200"}`}>
                <span className="block text-2xl">{icon}</span>
                <span className="block text-xs mt-0.5">{label}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── CUSTOMER ── */}
        {cart.length > 0 && (
          <Card>
            <CardContent className="p-3 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-brand-700">Customer (optional)</p>
              {selectedCustomer ? (
                <div className="flex items-center justify-between bg-brand-50 rounded-xl px-3 py-2">
                  <div>
                    <p className="font-semibold text-brand-900 text-sm">{selectedCustomer.name}</p>
                    <p className="text-xs text-slate-500">{selectedCustomer.phone}</p>
                  </div>
                  <button onClick={clearCustomer} className="text-terra-400"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <div className="space-y-2 relative">
                  <Input placeholder="Search name or mobile..." value={customerQuery}
                    onChange={(e) => { setCustomerQuery(e.target.value); setShowCustomerDropdown(true); }}
                    onFocus={() => setShowCustomerDropdown(true)} />
                  {showCustomerDropdown && customerMatches.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-brand-200 rounded-xl shadow-premium overflow-hidden">
                      {customerMatches.map((c) => (
                        <button key={c.id} onClick={() => selectCustomer(c)} className="w-full text-left px-4 py-2.5 hover:bg-brand-50 border-b border-brand-50 last:border-0">
                          <p className="font-semibold text-sm">{c.name}</p>
                          <p className="text-xs text-slate-500">{c.phone}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Name" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} />
                    <Input placeholder="Mobile" type="tel" value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── SALES HISTORY ── */}
        <Card>
          <CardContent className="p-3 space-y-3">
            {/* Header row */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-semibold text-brand-900">{t.todaysSales}</h3>
              <div className="flex items-center gap-1.5">
                <div className="flex gap-1">
                  {(["today", "week", "month"] as HistoryPeriod[]).map((p) => (
                    <button key={p} onClick={() => { setPeriod(p); loadHistory(p); }}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${period === p ? "bg-brand-700 text-white" : "bg-brand-50 text-brand-700"}`}>
                      {periodLabel[p]}
                    </button>
                  ))}
                </div>
                {/* Add Bill — scroll to search + focus */}
                <button
                  onClick={() => {
                    setCart([]); setQuery(""); setCustomDiscount(""); setDiscountChip(0); clearCustomer();
                    setTimeout(() => {
                      searchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                      searchRef.current?.focus();
                    }, 100);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand-700 text-white text-xs font-bold hover:bg-brand-800 transition"
                >
                  + Add Bill
                </button>
              </div>
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder="Search by item, customer..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              data-no-caps
            />

            {/* List */}
            {(() => {
              const q = historySearch.toLowerCase().trim();
              const filtered = q
                ? salesHistory.filter(s =>
                    s.customer?.name?.toLowerCase().includes(q) ||
                    s.items.some(i => i.product?.name?.toLowerCase().includes(q) || i.product?.supplier?.name?.toLowerCase().includes(q))
                  )
                : salesHistory;
              return filtered.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-4">{q ? "No matching sales" : t.noSales}</p>
              ) : (
                <div className="space-y-2">
                  {filtered.map((sale) => (
                    <div key={sale.id}
                      className="flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2.5 cursor-pointer hover:bg-brand-100/60 transition"
                      onClick={() => setDetailSale(sale)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-brand-900">
                          {sale.items.reduce((s, i) => s + i.quantity, 0)} {t.items}
                          {sale.customer && <span className="text-brand-600"> · {sale.customer.name}</span>}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {new Date(sale.saleDate).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          {" · "}{sale.paymentMethod === "CASH" ? t.cash : sale.paymentMethod === "UPI" ? t.upi : t.card}
                          {sale.items[0]?.product?.supplier?.name && <span> · {sale.items[0].product.supplier.name}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                        <p className="font-bold text-brand-800">{inr(Number(sale.totalAmount))}</p>
                        <button onClick={() => openEditSale(sale)} className="p-1.5 text-brand-400 hover:text-brand-700 hover:bg-brand-100 rounded-lg">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => deleteSale(sale.id)} className="p-1.5 text-terra-400 hover:text-terra-600 rounded-lg">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            <div className="flex justify-between rounded-xl bg-white border border-brand-200 px-3 py-2.5 text-sm font-semibold">
              <span>{salesHistory.length} {t.transactions}</span>
              <span className="text-brand-800">{inr(salesHistory.reduce((s, r) => s + Number(r.totalAmount), 0))}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── SALE DETAIL DRAWER ── */}
      <Drawer
        open={!!detailSale}
        onClose={() => setDetailSale(null)}
        title={`Sale — ${new Date(detailSale?.saleDate ?? "").toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`}
      >
        {detailSale && (() => {
          const saleSubtotal = detailSale.items.reduce((s, i) => s + i.quantity * Number(i.unitPrice), 0);
          const saleDiscount = Number(detailSale.discount) || 0;
          const saleTotal = Number(detailSale.totalAmount);
          const saleCogs = detailSale.items.reduce((s, i) => s + i.quantity * Number(i.purchasePrice ?? 0), 0);
          const saleProfit = saleTotal - saleCogs;
          const saleMargin = saleSubtotal > 0 ? ((saleProfit / saleSubtotal) * 100) : 0;
          return (
            <div className="space-y-4">
              {/* Bill summary — full financial breakdown */}
              <div className="bg-white border border-brand-100 rounded-xl p-4 space-y-2 font-mono text-sm">
                <p className="font-bold text-brand-900 text-center text-base">Anu Fashions</p>
                <hr className="border-dashed border-brand-200" />
                {detailSale.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="truncate flex-1 mr-2">{item.product?.name ?? "—"} ×{item.quantity}</span>
                    <span className="font-medium">{inr(item.quantity * Number(item.unitPrice))}</span>
                  </div>
                ))}
                <hr className="border-dashed border-brand-200" />
                {saleDiscount > 0 && (
                  <>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Subtotal</span><span>{inr(saleSubtotal)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-amber-600 font-semibold">
                      <span>Discount</span><span>− {inr(saleDiscount)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between font-black text-base border-t border-brand-200 pt-1">
                  <span>TOTAL</span><span className="text-terra-700">{inr(saleTotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Payment</span>
                  <span>{detailSale.paymentMethod === "CASH" ? "💵 Cash" : detailSale.paymentMethod === "UPI" ? "📱 UPI" : "💳 Card"}</span>
                </div>
              </div>

              {/* Profit card */}
              <div className={`rounded-xl p-3 flex items-center justify-between ${saleProfit >= 0 ? "bg-brand-50" : "bg-red-50"}`}>
                <div>
                  <p className="text-xs text-slate-500">Profit on this bill</p>
                  <p className={`font-bold text-xl ${saleProfit >= 0 ? "text-brand-700" : "text-red-600"}`}>{inr(saleProfit)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Margin</p>
                  <p className={`font-bold text-lg ${saleProfit >= 0 ? "text-brand-600" : "text-red-500"}`}>{saleMargin.toFixed(1)}%</p>
                </div>
              </div>

              {/* Customer */}
              {detailSale.customer && (
                <div className="bg-brand-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">Customer</p>
                  <p className="font-semibold text-brand-900">{detailSale.customer.name}</p>
                  {detailSale.customer.phone && <p className="text-xs text-slate-500">{detailSale.customer.phone}</p>}
                </div>
              )}

              {/* Items detail */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-brand-700 mb-2">
                  Items Sold ({detailSale.items.length})
                </p>
                <div className="space-y-2">
                  {detailSale.items.map((item, i) => {
                    const lineProfit = (Number(item.unitPrice) - Number(item.purchasePrice ?? 0)) * item.quantity;
                    return (
                      <div key={item.id ?? i} className="bg-white border border-brand-100 rounded-xl px-3 py-2.5">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-brand-900">{item.product?.name ?? "—"}</p>
                            {item.product?.category?.name && <p className="text-xs text-slate-500">{item.product.category.name}</p>}
                            {item.product?.supplier?.name && (
                              <p className="text-xs text-brand-600 font-medium">Supplier: {item.product.supplier.name}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            <p className="text-sm font-semibold">{item.quantity} × {inr(Number(item.unitPrice))}</p>
                            <p className="text-xs font-bold text-brand-700">{inr(item.quantity * Number(item.unitPrice))}</p>
                            {item.purchasePrice && (
                              <p className="text-xs text-slate-400">Buy: {inr(Number(item.purchasePrice))} · Profit: {inr(lineProfit)}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => { openEditSale(detailSale); setDetailSale(null); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-brand-700 border border-brand-200 rounded-xl hover:bg-brand-50 transition"
                >
                  <Pencil className="h-4 w-4" /> Edit Sale
                </button>
                <button
                  onClick={() => { if (confirm("Delete this sale?")) { deleteSale(detailSale.id); setDetailSale(null); } }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-terra-600 border border-terra-200 rounded-xl hover:bg-terra-50 transition"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            </div>
          );
        })()}
      </Drawer>

      {/* ── STICKY BOTTOM BAR — always visible when cart has items ── */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-brand-200 shadow-2xl px-4 py-3 md:max-w-2xl md:mx-auto">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">{cart.reduce((s, i) => s + i.quantity, 0)} items</p>
              <p className="text-2xl font-black text-brand-900 leading-tight">{inr(total)}</p>
              {discountAmount > 0 && <p className="text-xs text-terra-600 font-semibold">− {inr(discountAmount)} discount</p>}
            </div>
            <Button
              className="text-lg py-4 px-8 font-bold rounded-2xl"
              onClick={checkout}
              disabled={checkingOut || cart.length === 0}
            >
              {checkingOut ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Generating…
                </span>
              ) : `✅ ${t.generateBill}`}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
