import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToastStore } from "@/store/toast";
import { useLang } from "@/hooks/use-lang";
import { inr } from "@/lib/utils";

type CartItem = {
  productId: string; name: string; quantity: number;
  unitPrice: number; originalPrice: number; purchasePrice: number; discountLimit?: number;
};

type SaleRecord = {
  id: string; saleDate: string; totalAmount: number; paymentMethod: string;
  customer?: { name: string };
  items: { quantity: number; product?: { name: string } }[];
};

type Customer = { id: string; name: string; phone?: string; totalSpend: number };
type HistoryPeriod = "today" | "week" | "month";

const DISCOUNT_CHIPS = [
  { label: "0%", value: 0, isPercent: true },
  { label: "5%", value: 5, isPercent: true },
  { label: "10%", value: 10, isPercent: true },
  { label: "₹100", value: 100, isPercent: false },
  { label: "₹200", value: 200, isPercent: false },
  { label: "₹500", value: 500, isPercent: false },
];

export default function SalesPage() {
  const { t } = useLang();
  const { show } = useToastStore();
  const billRef = useRef<HTMLDivElement>(null);

  // Products + search
  const [products, setProducts] = useState<any[]>([]);
  const [query, setQuery] = useState("");

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);

  // Discount
  const [discountChip, setDiscountChip] = useState<number | null>(0);
  const [customDiscount, setCustomDiscount] = useState<string>("");

  // Payment
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  // Customer
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [customerQuery, setCustomerQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Bill
  const [generatedBill, setGeneratedBill] = useState<null | {
    items: CartItem[]; subtotal: number; discount: number; total: number;
    payment: string; customer: { name: string; phone: string } | null;
    date: string;
  }>(null);

  // History
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([]);
  const [period, setPeriod] = useState<HistoryPeriod>("today");

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

  // Customer search
  const customerMatches = useMemo(() => {
    if (!customerQuery.trim()) return [];
    const q = customerQuery.toLowerCase();
    return allCustomers.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))
    ).slice(0, 5);
  }, [allCustomers, customerQuery]);

  const selectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setNewCustomerName(c.name);
    setNewCustomerPhone(c.phone ?? "");
    setCustomerQuery("");
    setShowCustomerDropdown(false);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setNewCustomerName("");
    setNewCustomerPhone("");
    setCustomerQuery("");
  };

  // Filtered products
  const filtered = products.filter((p) =>
    [p.name, p.code, p.barcode, p.category?.name].join(" ").toLowerCase().includes(query.toLowerCase())
  );

  // Cart ops
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

  // Totals
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

  // Ensure customer in DB, then post sale
  const checkout = async () => {
    if (cart.length === 0) return;
    try {
      let customerId: string | undefined;

      if (newCustomerName.trim() || newCustomerPhone.trim()) {
        if (selectedCustomer) {
          customerId = selectedCustomer.id;
        } else {
          // Check if phone already exists to avoid duplicate
          const phone = newCustomerPhone.trim();
          const existing = phone
            ? allCustomers.find((c) => c.phone === phone)
            : null;
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
        items: [...cart],
        subtotal,
        discount: discountAmount,
        total,
        payment: paymentMethod,
        customer: (newCustomerName.trim() || newCustomerPhone.trim())
          ? { name: newCustomerName.trim() || "Customer", phone: newCustomerPhone.trim() }
          : null,
        date: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
      };
      setGeneratedBill(billData);

      setCart([]); setCustomDiscount(""); setDiscountChip(0);
      clearCustomer();
      show(t.generateBill + " ✓");
      loadHistory(period);
      loadProducts();
    } catch (e: any) {
      show(e?.response?.data?.error || "Error", "error");
    }
  };

  const shareOnWhatsApp = () => {
    if (!generatedBill) return;
    const payLabel = generatedBill.payment === "CASH" ? "Cash" : generatedBill.payment === "UPI" ? "UPI" : "Card";
    const lines: string[] = [];
    lines.push("*Anu Fashions*");
    lines.push("_Ladies Sarees & Dress Materials_");
    lines.push("---------------------------");
    lines.push(`Date: ${generatedBill.date}`);
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
    lines.push(`*TOTAL : ${inr(generatedBill.total)}*`);
    lines.push(`Payment : ${payLabel}`);
    lines.push("---------------------------");
    lines.push("Thank you! Please visit again.");
    lines.push("Dhanyavaadalu - ధన్యవాదాలు");

    const text = encodeURIComponent(lines.join("\n"));
    const phone = generatedBill.customer?.phone?.replace(/\D/g, "");
    window.open(
      phone
        ? `https://wa.me/91${phone}?text=${text}`
        : `https://wa.me/?text=${text}`,
      "_blank"
    );
  };

  const periodLabel: Record<HistoryPeriod, string> = {
    today: t.today, week: t.thisWeek, month: t.thisMonth
  };

  return (
    <div className="space-y-5">
      {/* POS GRID */}
      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.95fr]">

        {/* LEFT — Product picker */}
        <Card>
          <CardContent className="space-y-3">
            <h2 className="text-xl font-bold text-brand-900">{t.sell} 🛒</h2>
            <Input placeholder={t.search} value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="max-h-[500px] space-y-2 overflow-auto pr-1">
              {filtered.length === 0 && (
                <p className="text-center text-sm text-slate-400 py-8">{t.noRecords}</p>
              )}
              {filtered.map((product) => (
                <div key={product.id} className="flex items-center justify-between rounded-xl bg-white/80 p-3 border border-brand-50 hover:border-brand-200 transition">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-brand-900 truncate">{product.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {product.category?.name}
                      {" · "}
                      <span className={product.quantity <= 5 ? "text-terra-500 font-semibold" : ""}>
                        {t.stock}: {product.quantity}
                      </span>
                      {product.discountLimit != null && ` · Max ${t.discount}: ${product.discountLimit}%`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-3 shrink-0">
                    <p className="text-base font-bold text-brand-800">{inr(product.sellingPrice)}</p>
                    <button
                      onClick={() => addToCart(product)}
                      disabled={product.quantity === 0}
                      className="bg-brand-700 text-white rounded-xl px-4 py-2 text-sm font-bold hover:bg-brand-800 disabled:opacity-40 transition"
                    >
                      + {t.addToBill}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* RIGHT — Bill */}
        <div className="space-y-3">

          {/* Cart items */}
          <Card>
            <CardContent className="space-y-3">
              <h3 className="font-bold text-brand-900 text-lg">{t.cart} 🧾</h3>

              {cart.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <p className="text-3xl mb-2">🛍️</p>
                  <p className="text-sm">Add sarees from the left</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[340px] overflow-auto pr-1">
                  {cart.map((item) => {
                    const lineTotal = item.quantity * item.unitPrice;
                    const itemProfit = (item.unitPrice - item.purchasePrice) * item.quantity;
                    const priceChanged = item.unitPrice !== item.originalPrice;
                    return (
                      <div key={item.productId} className="bg-brand-50 rounded-xl p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-sm text-brand-900 leading-tight flex-1">{item.name}</p>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${itemProfit >= 0 ? "bg-brand-100 text-brand-700" : "bg-red-100 text-red-600"}`}>
                              {t.profit} {inr(itemProfit)}
                            </span>
                            <button onClick={() => removeFromCart(item.productId)} className="text-terra-400 hover:text-terra-600 p-0.5">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Qty */}
                          <div className="flex items-center gap-1">
                            <button onClick={() => updateQty(item.productId, item.quantity - 1)} className="w-8 h-8 rounded-lg border-2 border-brand-300 bg-white font-bold text-brand-700 text-lg hover:bg-brand-100 flex items-center justify-center">−</button>
                            <span className="w-7 text-center font-bold text-base text-brand-900">{item.quantity}</span>
                            <button onClick={() => updateQty(item.productId, item.quantity + 1)} className="w-8 h-8 rounded-lg border-2 border-brand-300 bg-white font-bold text-brand-700 text-lg hover:bg-brand-100 flex items-center justify-center">+</button>
                          </div>
                          {/* Price per item */}
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-500">{t.sellPrice.split(" ")[0]} ₹</span>
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => updatePrice(item.productId, Number(e.target.value))}
                              className={`w-24 rounded-lg border-2 px-2 py-1 text-sm font-bold text-center ${priceChanged ? "border-terra-400 bg-terra-50 text-terra-700" : "border-brand-200 bg-white text-brand-900"}`}
                            />
                            {priceChanged && (
                              <span className="text-xs text-slate-400 line-through">{inr(item.originalPrice)}</span>
                            )}
                          </div>
                          <span className="ml-auto font-bold text-base text-brand-800">{inr(lineTotal)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Discount */}
          {cart.length > 0 && (
            <Card>
              <CardContent className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-brand-700">{t.discount} / తగ్గింపు</p>
                <div className="flex flex-wrap gap-2">
                  {DISCOUNT_CHIPS.map((chip, i) => (
                    <button
                      key={i}
                      onClick={() => { setDiscountChip(i); setCustomDiscount(""); }}
                      className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition ${
                        discountChip === i && customDiscount === ""
                          ? "bg-brand-700 text-white border-brand-700"
                          : "bg-white text-brand-700 border-brand-200 hover:border-brand-500"
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 bg-brand-50 rounded-xl px-3 py-2">
                  <span className="text-xs font-semibold text-brand-700 whitespace-nowrap">Custom ₹</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={customDiscount}
                    onChange={(e) => { setCustomDiscount(e.target.value); setDiscountChip(null); }}
                    className="flex-1 bg-transparent text-base font-bold text-brand-900 w-20 focus:outline-none"
                  />
                  {discountAmount > 0 && (
                    <span className="text-xs font-semibold text-terra-500">{discountPct.toFixed(1)}% off</span>
                  )}
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

          {/* Payment */}
          {cart.length > 0 && (
            <Card>
              <CardContent>
                <p className="text-xs font-bold uppercase tracking-wide text-brand-700 mb-2">{t.payment} / చెల్లింపు</p>
                <div className="grid grid-cols-3 gap-2">
                  {[["CASH", "💵", t.cash, "నగదు"], ["UPI", "📱", t.upi, "యూపీఐ"], ["CARD", "💳", t.card, "కార్డు"]].map(([val, icon, label, sub]) => (
                    <button
                      key={val}
                      onClick={() => setPaymentMethod(val)}
                      className={`rounded-xl py-3 text-center text-sm font-bold border-2 transition ${
                        paymentMethod === val
                          ? "bg-brand-700 text-white border-brand-700"
                          : "bg-white text-brand-700 border-brand-200 hover:border-brand-500"
                      }`}
                    >
                      <span className="block text-xl">{icon}</span>
                      <span className="block text-xs mt-0.5">{label}</span>
                      <span className={`block text-xs ${paymentMethod === val ? "opacity-70" : "text-slate-400"}`}>{sub}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Customer */}
          {cart.length > 0 && (
            <Card>
              <CardContent className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-brand-700">{t.customers} / కస్టమర్ (optional)</p>

                {selectedCustomer ? (
                  <div className="flex items-center justify-between bg-brand-50 rounded-xl px-3 py-2.5">
                    <div>
                      <p className="font-semibold text-brand-900 text-sm">{selectedCustomer.name}</p>
                      <p className="text-xs text-slate-500">{selectedCustomer.phone} · Total spend: {inr(selectedCustomer.totalSpend)}</p>
                    </div>
                    <button onClick={clearCustomer} className="text-terra-400 hover:text-terra-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      placeholder="Search name or mobile... / పేరు లేదా నంబర్"
                      value={customerQuery}
                      onChange={(e) => { setCustomerQuery(e.target.value); setShowCustomerDropdown(true); }}
                      onFocus={() => setShowCustomerDropdown(true)}
                    />
                    {showCustomerDropdown && customerMatches.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-brand-200 rounded-xl shadow-premium overflow-hidden">
                        {customerMatches.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => selectCustomer(c)}
                            className="w-full text-left px-4 py-2.5 hover:bg-brand-50 border-b border-brand-50 last:border-0"
                          >
                            <p className="font-semibold text-sm text-brand-900">{c.name}</p>
                            <p className="text-xs text-slate-500">{c.phone} · {inr(c.totalSpend)} spent</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {!selectedCustomer && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-brand-700 font-semibold mb-1">Name / పేరు</p>
                      <Input
                        placeholder="Lakshmi Devi"
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                      />
                    </div>
                    <div>
                      <p className="text-xs text-brand-700 font-semibold mb-1">Mobile / ఫోన్</p>
                      <Input
                        placeholder="9876543210"
                        type="tel"
                        value={newCustomerPhone}
                        onChange={(e) => setNewCustomerPhone(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Total + Generate */}
          {cart.length > 0 && (
            <Card>
              <CardContent className="space-y-3">
                <div className="bg-brand-50 rounded-xl p-4 space-y-1.5">
                  {cart.map((i) => (
                    <div key={i.productId} className="flex justify-between text-sm text-slate-600">
                      <span className="truncate flex-1 mr-2">{i.name} ×{i.quantity}</span>
                      <span className="font-medium shrink-0">{inr(i.quantity * i.unitPrice)}</span>
                    </div>
                  ))}
                  {discountAmount > 0 && (
                    <>
                      <div className="flex justify-between text-sm border-t border-brand-100 pt-1.5">
                        <span className="text-slate-500">Subtotal</span>
                        <span>{inr(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-terra-600 font-semibold">
                        <span>{t.discount}</span>
                        <span>− {inr(discountAmount)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-xl font-black text-brand-900 border-t-2 border-brand-200 pt-2 mt-1">
                    <span>{t.total}</span>
                    <span>{inr(total)}</span>
                  </div>
                </div>

                <Button
                  className="w-full text-base py-4 font-bold"
                  onClick={checkout}
                  disabled={cart.length === 0}
                >
                  ✅ {t.generateBill}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Generated Bill */}
          {generatedBill && (
            <Card>
              <CardContent className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wide text-brand-700">📋 Bill Preview</p>
                <div ref={billRef} className="bg-white border-2 border-dashed border-brand-200 rounded-xl p-4 font-mono text-xs space-y-1">
                  <p className="text-center font-bold text-base text-brand-900">🌸 Anu Fashions 🌸</p>
                  <p className="text-center text-slate-500 text-xs">Ladies Sarees & Dress Materials</p>
                  <hr className="border-dashed border-brand-200 my-1" />
                  <p className="flex justify-between"><span>Date:</span><span>{generatedBill.date}</span></p>
                  {generatedBill.customer && (
                    <>
                      <p className="flex justify-between"><span>Customer:</span><span className="font-semibold">{generatedBill.customer.name}</span></p>
                      {generatedBill.customer.phone && (
                        <p className="flex justify-between"><span>Mobile:</span><span>{generatedBill.customer.phone}</span></p>
                      )}
                    </>
                  )}
                  <hr className="border-dashed border-brand-200 my-1" />
                  {generatedBill.items.map((i, idx) => (
                    <div key={idx}>
                      <p className="font-semibold text-brand-900">{i.name}</p>
                      <p className="flex justify-between text-slate-600">
                        <span>{i.quantity} × {inr(i.unitPrice)}</span>
                        <span className="font-bold">{inr(i.quantity * i.unitPrice)}</span>
                      </p>
                    </div>
                  ))}
                  <hr className="border-dashed border-brand-200 my-1" />
                  {generatedBill.discount > 0 && (
                    <>
                      <p className="flex justify-between text-slate-500"><span>Subtotal</span><span>{inr(generatedBill.subtotal)}</span></p>
                      <p className="flex justify-between text-terra-600 font-semibold"><span>Discount</span><span>− {inr(generatedBill.discount)}</span></p>
                    </>
                  )}
                  <p className="flex justify-between font-black text-base text-brand-900 border-t border-brand-200 pt-1">
                    <span>TOTAL</span><span>{inr(generatedBill.total)}</span>
                  </p>
                  <p className="flex justify-between text-slate-500"><span>Payment</span><span>{generatedBill.payment}</span></p>
                  <hr className="border-dashed border-brand-200 my-1" />
                  <p className="text-center text-slate-500">🙏 Thank you! Please visit again 💐</p>
                  <p className="text-center text-brand-700">ధన్యవాదాలు · మళ్ళీ రండి 🌺</p>
                </div>

                <button
                  onClick={shareOnWhatsApp}
                  className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
                  style={{ background: "#25D366" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.374 0 0 5.373 0 12c0 2.117.549 4.107 1.508 5.84L0 24l6.335-1.48A11.945 11.945 0 0012 24c6.626 0 12-5.373 12-12 0-6.628-5.374-12-12-12zm0 21.818a9.817 9.817 0 01-5.006-1.366l-.36-.214-3.76.878.899-3.654-.235-.374A9.808 9.808 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z"/>
                  </svg>
                  Share Bill on WhatsApp
                </button>

                <button
                  onClick={() => setGeneratedBill(null)}
                  className="w-full py-2 rounded-xl text-sm text-brand-600 border border-brand-200 hover:bg-brand-50"
                >
                  New Sale / కొత్త అమ్మకం
                </button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* SALES HISTORY */}
      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-lg font-semibold">{t.todaysSales}</h3>
            <div className="flex gap-1">
              {(["today", "week", "month"] as HistoryPeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => { setPeriod(p); loadHistory(p); }}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    period === p ? "bg-brand-700 text-white" : "bg-brand-50 text-brand-700 hover:bg-brand-100"
                  }`}
                >
                  {periodLabel[p]}
                </button>
              ))}
            </div>
          </div>

          {salesHistory.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-4">{t.noSales}</p>
          ) : (
            <div className="space-y-2">
              {salesHistory.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between rounded-xl bg-brand-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-brand-900">
                      {sale.items.reduce((s, i) => s + i.quantity, 0)} {t.items}
                      {sale.customer && <span className="text-brand-600"> · {sale.customer.name}</span>}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(sale.saleDate).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      {" · "}{sale.paymentMethod === "CASH" ? t.cash : sale.paymentMethod === "UPI" ? t.upi : t.card}
                    </p>
                  </div>
                  <p className="font-bold text-brand-800">{inr(Number(sale.totalAmount))}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between rounded-xl bg-white border border-brand-200 px-4 py-3 text-sm font-semibold">
            <span>{t.totalSales}: {salesHistory.length} {t.transactions}</span>
            <span className="text-brand-800 text-base">{inr(salesHistory.reduce((s, r) => s + Number(r.totalAmount), 0))}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
