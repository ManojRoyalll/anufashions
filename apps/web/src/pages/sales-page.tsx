import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { AlertTriangle, X, Trash2, ScanLine, Plus, CheckCircle } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { useToastStore } from "@/store/toast";
import { useLang } from "@/hooks/use-lang";
import { inr } from "@/lib/utils";
import { QRScanner } from "@/components/ui/qr-scanner";

type CartItem = {
  productId: string; name: string; quantity: number;
  unitPrice: number; originalPrice: number; purchasePrice: number; discountLimit?: number;
};

type Customer = { id: string; name: string; phone?: string; totalSpend: number };

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
  const searchRef = useRef<HTMLInputElement>(null);

  // Products
  const [products, setProducts] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  // Scan list: items accumulated during continuous scan session
  const [scanList, setScanList] = useState<CartItem[]>([]);
  const [lastAddedName, setLastAddedName] = useState("");

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);

  // Discount
  const [discountChip, setDiscountChip] = useState<number | null>(0);
  const [customDiscount, setCustomDiscount] = useState("");

  // Payment
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  // Customer
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [customerQuery, setCustomerQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Bill modal
  const [checkingOut, setCheckingOut] = useState(false);
  const [generatedBill, setGeneratedBill] = useState<null | {
    items: CartItem[]; subtotal: number; discount: number; total: number;
    payment: string; customer: { name: string; phone: string } | null; date: string;
  }>(null);
  const [showBillModal, setShowBillModal] = useState(false);

  // Add Bill (manual entry) modal
  const [showAddBill, setShowAddBill] = useState(false);
  const [addBillItems, setAddBillItems] = useState([{ name: "", sellPrice: "", quantity: "1" }]);
  const [addBillTotal, setAddBillTotal] = useState("");
  const [addBillPayment, setAddBillPayment] = useState("CASH");
  const [addBillSaving, setAddBillSaving] = useState(false);

  const loadProducts = () => api.get("/products").then((r) => setProducts(r.data));
  const loadCustomers = () => api.get("/customers").then((r) => setAllCustomers(r.data));

  useEffect(() => { loadProducts(); loadCustomers(); }, []);

  // Customer search
  const customerMatches = useMemo(() => {
    if (!customerQuery.trim()) return [];
    const q = customerQuery.toLowerCase();
    return allCustomers.filter(c => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))).slice(0, 5);
  }, [allCustomers, customerQuery]);

  const selectCustomer = (c: Customer) => {
    setSelectedCustomer(c); setNewCustomerName(c.name);
    setNewCustomerPhone(c.phone ?? ""); setCustomerQuery(""); setShowCustomerDropdown(false);
  };
  const clearCustomer = () => { setSelectedCustomer(null); setNewCustomerName(""); setNewCustomerPhone(""); setCustomerQuery(""); };

  // Resolve a QR code string to a product (handles all old + new patterns)
  const resolveCode = useCallback((data: string) => {
    const rawCode = data.split("|")[0].trim();
    let found = products.find(p => p.code === rawCode);
    if (!found) { const norm = (s: string) => s.replace(/[\s\-]/g, "").toLowerCase(); found = products.find(p => norm(p.code) === norm(rawCode)); }
    if (!found) found = products.find(p => p.name.toLowerCase() === rawCode.toLowerCase());
    if (!found) { const lc = rawCode.toLowerCase(); found = products.find(p => p.code?.toLowerCase().includes(lc) || lc.includes(p.code?.toLowerCase() ?? "__")); }
    return found ?? null;
  }, [products]);

  // Single-scan handler (search bar scan button — kept for backwards compat)
  const handleQRScan = useCallback((data: string) => {
    setShowScanner(false);
    const found = resolveCode(data);
    if (found) { addToCart(found); show(`${found.name} added ✓`); }
    else show(`Item not found`, "error");
  }, [resolveCode]);

  // Continuous-scan handler — adds to scanList instead of cart
  const handleContinuousScan = useCallback((data: string) => {
    const found = resolveCode(data);
    if (!found) { show(`Not found`, "error"); return; }
    setLastAddedName(found.name);
    setTimeout(() => setLastAddedName(""), 1200);
    setScanList(prev => {
      const existing = prev.find(i => i.productId === found.id);
      if (existing) return prev.map(i => i.productId === found.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { productId: found.id, name: found.name, quantity: 1, unitPrice: found.sellingPrice, originalPrice: found.sellingPrice, purchasePrice: found.purchasePrice, discountLimit: found.discountLimit }];
    });
  }, [resolveCode, show]);

  const openScanner = () => { setScanList([]); setShowScanner(true); };

  const doneScan = () => {
    setCart(scanList); // replaces entire cart
    setScanList([]);
    setShowScanner(false);
  };

  // Product search results
  const filtered = query.trim().length > 0
    ? products.filter(p => [p.name, p.code, p.barcode, p.category?.name].join(" ").toLowerCase().includes(query.toLowerCase()))
    : [];

  // Cart operations
  const addToCart = (product: any) => {
    setCart(prev => {
      const found = prev.find(c => c.productId === product.id);
      if (found) return prev.map(c => c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { productId: product.id, name: product.name, quantity: 1, unitPrice: product.sellingPrice, originalPrice: product.sellingPrice, purchasePrice: product.purchasePrice, discountLimit: product.discountLimit }];
    });
  };
  const updateQty = (id: string, qty: number) => { if (qty < 1) return removeFromCart(id); setCart(prev => prev.map(c => c.productId === id ? { ...c, quantity: qty } : c)); };
  const updatePrice = (id: string, price: number) => setCart(prev => prev.map(c => c.productId === id ? { ...c, unitPrice: Math.max(0, price) } : c));
  const removeFromCart = (id: string) => setCart(prev => prev.filter(c => c.productId !== id));

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
  const discountWarnings = cart.filter(i => i.discountLimit != null && discountPct > i.discountLimit);

  // Checkout
  const checkout = async () => {
    if (cart.length === 0 || checkingOut) return;
    setCheckingOut(true);
    try {
      let customerId: string | undefined;
      if (newCustomerName.trim() || newCustomerPhone.trim()) {
        if (selectedCustomer) { customerId = selectedCustomer.id; }
        else {
          const phone = newCustomerPhone.trim();
          const existing = phone ? allCustomers.find(c => c.phone === phone) : null;
          if (existing) { customerId = existing.id; }
          else { const res = await api.post("/customers", { name: newCustomerName.trim() || "Customer", phone: phone || undefined }); customerId = res.data.id; }
          await loadCustomers();
        }
      }
      await api.post("/sales", { saleDate: new Date().toISOString(), customerId, paymentMethod, discount: discountAmount, gst: 0, items: cart.map(({ productId, quantity, unitPrice }) => ({ productId, quantity, unitPrice })) });
      const billData = { items: [...cart], subtotal, discount: discountAmount, total, payment: paymentMethod, customer: (newCustomerName.trim() || newCustomerPhone.trim()) ? { name: newCustomerName.trim() || "Customer", phone: newCustomerPhone.trim() } : null, date: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) };
      setGeneratedBill(billData);
      setShowBillModal(true);
      setCart([]); setCustomDiscount(""); setDiscountChip(0); clearCustomer();
      show(t.generateBill + " ✓");
      loadProducts();
    } catch (e: any) { show(e?.response?.data?.error || "Error", "error"); }
    finally { setCheckingOut(false); }
  };

  // WhatsApp share
  const shareOnWhatsApp = () => {
    if (!generatedBill) return;
    const payLabel = generatedBill.payment === "CASH" ? "Cash" : generatedBill.payment === "UPI" ? "UPI" : "Card";
    const lines = ["*Anu Fashions*", "_Ladies Sarees & Dress Materials_", "---------------------------", `Date: ${generatedBill.date}`];
    if (generatedBill.customer) { lines.push(`Customer: *${generatedBill.customer.name}*`); if (generatedBill.customer.phone) lines.push(`Mobile: ${generatedBill.customer.phone}`); }
    lines.push("---------------------------");
    generatedBill.items.forEach(i => { lines.push(`*${i.name}*`); lines.push(`  ${i.quantity} pc x ${inr(i.unitPrice)}  =  ${inr(i.quantity * i.unitPrice)}`); });
    lines.push("---------------------------");
    if (generatedBill.discount > 0) { lines.push(`Subtotal : ${inr(generatedBill.subtotal)}`); lines.push(`Discount : - ${inr(generatedBill.discount)}`); lines.push("---------------------------"); }
    lines.push(`*TOTAL : ${inr(generatedBill.total)}*`, `Payment : ${payLabel}`, "---------------------------", "Thank you! Please visit again.", "Dhanyavaadalu - ధన్యవాదాలు");
    const text = encodeURIComponent(lines.join("\n"));
    const phone = generatedBill.customer?.phone?.replace(/\D/g, "");
    window.open(phone ? `https://wa.me/91${phone}?text=${text}` : `https://wa.me/?text=${text}`, "_blank");
  };

  // Manual Add Bill save
  const saveAddBill = async () => {
    const validItems = addBillItems.filter(i => i.name.trim() && Number(i.sellPrice) > 0 && Number(i.quantity) > 0);
    if (validItems.length === 0) { show("Add at least one item with name, price and quantity", "error"); return; }
    setAddBillSaving(true);
    try {
      const itemsSubtotal = validItems.reduce((s, i) => s + Number(i.sellPrice) * Number(i.quantity), 0);
      const billTotal = addBillTotal ? Number(addBillTotal) : itemsSubtotal;
      const discount = Math.max(0, itemsSubtotal - billTotal);
      // Find or create products for each item
      const saleItems: { productId: string; quantity: number; unitPrice: number }[] = [];
      for (const item of validItems) {
        // Try to match existing product by name
        const existing = products.find(p => p.name.toLowerCase() === item.name.toLowerCase().trim());
        if (existing) {
          saleItems.push({ productId: existing.id, quantity: Number(item.quantity), unitPrice: Number(item.sellPrice) });
        } else {
          // Create a minimal product entry
          const res = await api.post("/products", { code: `MANUAL-${Date.now()}`, name: item.name.trim().toUpperCase(), categoryId: undefined, purchasePrice: 0, sellingPrice: Number(item.sellPrice), quantity: 0 }).catch(() => null);
          if (res) saleItems.push({ productId: res.data.id, quantity: Number(item.quantity), unitPrice: Number(item.sellPrice) });
        }
      }
      if (saleItems.length === 0) { show("Could not create sale items", "error"); return; }
      await api.post("/sales", { saleDate: new Date().toISOString(), paymentMethod: addBillPayment, discount, gst: 0, items: saleItems });
      show("Bill added ✓");
      setShowAddBill(false);
      setAddBillItems([{ name: "", sellPrice: "", quantity: "1" }]);
      setAddBillTotal("");
      setAddBillPayment("CASH");
      loadProducts();
    } catch (e: any) { show(e?.message || "Error", "error"); }
    finally { setAddBillSaving(false); }
  };

  // Add Bill item rows helpers
  const setAddBillItem = (idx: number, field: string, val: string) =>
    setAddBillItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));

  const addBillSubtotal = addBillItems.reduce((s, i) => s + (Number(i.sellPrice) || 0) * (Number(i.quantity) || 0), 0);
  const addBillDiscount = addBillTotal ? Math.max(0, addBillSubtotal - Number(addBillTotal)) : 0;
  const addBillDiscountPct = addBillSubtotal > 0 && addBillDiscount > 0 ? ((addBillDiscount / addBillSubtotal) * 100).toFixed(1) : null;

  return (
    <>
      {/* ── CONTINUOUS SCAN SCREEN ── */}
      {showScanner && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-black shrink-0">
            <div>
              <p className="text-white font-bold text-lg">Scan Items</p>
              <p className="text-white/60 text-xs">{scanList.reduce((s,i)=>s+i.quantity,0)} items scanned</p>
            </div>
            <button onClick={() => { setScanList([]); setShowScanner(false); }}
              className="text-white/70 hover:text-white p-1">
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Camera — takes top portion */}
          <div className="shrink-0">
            <QRScanner onScan={handleContinuousScan} onClose={() => setShowScanner(false)} continuous />
          </div>

          {/* Scanned items list */}
          <div className="flex-1 bg-white overflow-y-auto">
            {scanList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                <p className="text-sm">Point camera at a label to scan</p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-brand-700 px-1">Items scanned ({scanList.reduce((s,i)=>s+i.quantity,0)})</p>
                {scanList.map(item => (
                  <div key={item.productId} className="flex items-center justify-between bg-brand-50 rounded-xl px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-brand-900 truncate">{item.name}</p>
                      <p className="text-xs text-slate-500">{inr(item.unitPrice)} each</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-bold text-brand-800">×{item.quantity}</span>
                      <span className="font-bold text-brand-700">{inr(item.quantity * item.unitPrice)}</span>
                      <button onClick={() => setScanList(prev => prev.filter(i => i.productId !== item.productId))}
                        className="text-terra-400 hover:text-terra-600 p-1">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add to Bill button */}
          <div className="shrink-0 bg-white border-t border-brand-200 p-4">
            {scanList.length > 0 ? (
              <button onClick={doneScan}
                className="w-full bg-brand-700 text-white rounded-2xl py-4 text-lg font-bold flex items-center justify-center gap-2 hover:bg-brand-800 transition">
                <CheckCircle className="h-6 w-6" />
                Add to Bill ({scanList.reduce((s,i)=>s+i.quantity,0)} items · {inr(scanList.reduce((s,i)=>s+i.quantity*i.unitPrice,0))})
              </button>
            ) : (
              <button onClick={() => { setScanList([]); setShowScanner(false); }}
                className="w-full border-2 border-brand-200 text-brand-600 rounded-2xl py-4 text-base font-semibold hover:bg-brand-50 transition">
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── BILL GENERATED MODAL ── */}
      <Modal open={showBillModal} onClose={() => setShowBillModal(false)} title="✅ Bill Generated" size="md">
        {generatedBill && (
          <div className="space-y-4">
            <div className="bg-white border-2 border-dashed border-brand-200 rounded-xl p-4 font-mono text-xs space-y-1">
              <p className="text-center font-bold text-base">Anu Fashions</p>
              <p className="text-center text-slate-500">Ladies Sarees & Dress Materials</p>
              <hr className="border-dashed border-brand-200 my-1" />
              <p className="flex justify-between"><span>Date:</span><span>{generatedBill.date}</span></p>
              {generatedBill.customer && (<><p className="flex justify-between"><span>Customer:</span><span className="font-semibold">{generatedBill.customer.name}</span></p>{generatedBill.customer.phone && <p className="flex justify-between"><span>Mobile:</span><span>{generatedBill.customer.phone}</span></p>}</>)}
              <hr className="border-dashed border-brand-200 my-1" />
              {generatedBill.items.map((i, idx) => (<div key={idx}><p className="font-semibold">{i.name}</p><p className="flex justify-between text-slate-600"><span>{i.quantity} × {inr(i.unitPrice)}</span><span className="font-bold">{inr(i.quantity * i.unitPrice)}</span></p></div>))}
              <hr className="border-dashed border-brand-200 my-1" />
              {generatedBill.discount > 0 && (<><p className="flex justify-between text-slate-500"><span>Subtotal</span><span>{inr(generatedBill.subtotal)}</span></p><p className="flex justify-between text-terra-600 font-semibold"><span>Discount</span><span>− {inr(generatedBill.discount)}</span></p></>)}
              <p className="flex justify-between font-black text-base border-t border-brand-200 pt-1"><span>TOTAL</span><span>{inr(generatedBill.total)}</span></p>
              <p className="flex justify-between text-slate-500"><span>Payment</span><span>{generatedBill.payment}</span></p>
              <hr className="border-dashed border-brand-200 my-1" />
              <p className="text-center text-slate-500">Thank you! Please visit again.</p>
              <p className="text-center text-brand-700">ధన్యవాదాలు · మళ్ళీ రండి</p>
            </div>
            <button onClick={shareOnWhatsApp} className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2" style={{ background: "#25D366" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.374 0 0 5.373 0 12c0 2.117.549 4.107 1.508 5.84L0 24l6.335-1.48A11.945 11.945 0 0012 24c6.626 0 12-5.373 12-12 0-6.628-5.374-12-12-12zm0 21.818a9.817 9.817 0 01-5.006-1.366l-.36-.214-3.76.878.899-3.654-.235-.374A9.808 9.808 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z"/></svg>
              Share on WhatsApp
            </button>
            <button onClick={() => setShowBillModal(false)} className="w-full py-2.5 rounded-xl text-sm text-brand-600 border border-brand-200 hover:bg-brand-50 font-semibold">
              New Sale / కొత్త అమ్మకం
            </button>
          </div>
        )}
      </Modal>

      {/* ── ADD BILL MANUAL MODAL ── */}
      <Modal open={showAddBill} onClose={() => setShowAddBill(false)} title="Add Bill Manually" size="md">
        <div className="space-y-4">
          <p className="text-xs text-slate-500">Add a bill for items not in stock list. Discount is auto-calculated from total bill amount.</p>

          {/* Item rows */}
          <div className="space-y-2">
            {addBillItems.map((item, idx) => (
              <div key={idx} className="bg-brand-50 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-brand-600 shrink-0">Item {idx + 1}</span>
                  {addBillItems.length > 1 && (
                    <button onClick={() => setAddBillItems(prev => prev.filter((_, i) => i !== idx))} className="ml-auto text-terra-400 hover:text-terra-600">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <input type="text" placeholder="Item name" value={item.name}
                  onChange={e => setAddBillItem(idx, "name", e.target.value)}
                  className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none" />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-brand-600 mb-1">Sell Price (₹)</p>
                    <input type="number" placeholder="0" value={item.sellPrice}
                      onChange={e => setAddBillItem(idx, "sellPrice", e.target.value)}
                      className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none normal-case" />
                  </div>
                  <div>
                    <p className="text-xs text-brand-600 mb-1">Quantity</p>
                    <input type="number" placeholder="1" value={item.quantity}
                      onChange={e => setAddBillItem(idx, "quantity", e.target.value)}
                      className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none normal-case" />
                  </div>
                </div>
                {Number(item.sellPrice) > 0 && Number(item.quantity) > 0 && (
                  <p className="text-xs text-brand-600 font-semibold">
                    Line total: {inr(Number(item.sellPrice) * Number(item.quantity))}
                  </p>
                )}
              </div>
            ))}
            <button onClick={() => setAddBillItems(prev => [...prev, { name: "", sellPrice: "", quantity: "1" }])}
              className="w-full flex items-center justify-center gap-1 py-2 text-sm text-brand-600 border-2 border-dashed border-brand-300 rounded-xl hover:bg-brand-50 transition">
              <Plus className="h-4 w-4" /> Add Another Item
            </button>
          </div>

          {/* Total bill amount — drives discount calc */}
          {addBillSubtotal > 0 && (
            <div>
              <p className="text-xs font-semibold text-brand-700 mb-1">
                Total Bill Amount (₹)
                <span className="font-normal text-slate-400 ml-1">— leave blank to use full amount ({inr(addBillSubtotal)})</span>
              </p>
              <input type="number" placeholder={String(addBillSubtotal)} value={addBillTotal}
                onChange={e => setAddBillTotal(e.target.value)}
                className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none normal-case" />
              {addBillDiscount > 0 && (
                <div className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm flex justify-between items-center">
                  <span className="text-slate-600">Discount applied</span>
                  <span className="font-bold text-amber-700">− {inr(addBillDiscount)} ({addBillDiscountPct}%)</span>
                </div>
              )}
              <div className="mt-2 rounded-xl bg-terra-50 px-3 py-2 text-sm flex justify-between font-bold">
                <span>Final Total</span>
                <span className="text-terra-700">{inr(addBillTotal ? Number(addBillTotal) : addBillSubtotal)}</span>
              </div>
            </div>
          )}

          {/* Payment */}
          <div>
            <p className="text-xs font-semibold text-brand-700 mb-2">Payment Method</p>
            <div className="grid grid-cols-3 gap-2">
              {[["CASH", "💵", t.cash], ["UPI", "📱", t.upi], ["CARD", "💳", t.card]].map(([val, icon, label]) => (
                <button key={val} onClick={() => setAddBillPayment(val)}
                  className={`rounded-xl py-2.5 text-center font-bold border-2 transition ${addBillPayment === val ? "bg-brand-700 text-white border-brand-700" : "bg-white text-brand-700 border-brand-200"}`}>
                  <span className="block text-xl">{icon}</span>
                  <span className="block text-xs">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAddBill(false)}>Cancel</Button>
            <Button className="flex-1" onClick={saveAddBill} disabled={addBillSaving}>
              {addBillSaving ? "Saving..." : "Save Bill"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── MAIN SELL PAGE ── */}
      <div className="space-y-3 max-w-2xl mx-auto pb-56">

        {/* ── SEARCH + SCAN + ADD BILL ── */}
        <div className="flex gap-2">
          <input
            ref={searchRef}
            type="text"
            placeholder="Search saree by name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-no-caps
            className="flex-1 rounded-xl border border-brand-200 bg-white px-3 py-2.5 text-base shadow-sm focus:border-brand-500 focus:outline-none"
          />
          <button onClick={openScanner}
            className="shrink-0 flex items-center gap-1.5 rounded-xl bg-brand-700 text-white px-4 py-2 font-bold hover:bg-brand-800 transition">
            <ScanLine className="h-5 w-5" />
          </button>
          <button onClick={() => setShowAddBill(true)}
            className="shrink-0 flex items-center gap-1.5 rounded-xl bg-slate-700 text-white px-3 py-2 text-xs font-bold hover:bg-slate-800 transition">
            <Plus className="h-4 w-4" /> Bill
          </button>
        </div>

        {/* ── PRODUCT SEARCH RESULTS ── */}
        {query.trim().length > 0 && (
          <Card>
            <CardContent className="p-2 space-y-1">
              {filtered.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-4">{t.noRecords}</p>
              ) : (
                filtered.map(product => (
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
              {cart.map(item => {
                const lineTotal = item.quantity * item.unitPrice;
                const priceChanged = item.unitPrice !== item.originalPrice;
                return (
                  <div key={item.productId} className="bg-brand-50 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm text-brand-900 flex-1 truncate">{item.name}</p>
                      <button onClick={() => removeFromCart(item.productId)} className="text-terra-400 p-0.5 shrink-0"><X className="h-4 w-4" /></button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item.productId, item.quantity - 1)} className="w-9 h-9 rounded-lg border-2 border-brand-300 bg-white font-bold text-brand-700 text-xl hover:bg-brand-100 flex items-center justify-center">−</button>
                      <span className="w-8 text-center font-bold text-lg text-brand-900">{item.quantity}</span>
                      <button onClick={() => updateQty(item.productId, item.quantity + 1)} className="w-9 h-9 rounded-lg border-2 border-brand-300 bg-white font-bold text-brand-700 text-xl hover:bg-brand-100 flex items-center justify-center">+</button>
                      <span className="text-xs text-slate-500 ml-1">₹</span>
                      <input type="number" value={item.unitPrice} onChange={e => updatePrice(item.productId, Number(e.target.value))}
                        className={`w-24 rounded-lg border-2 px-2 py-1.5 text-sm font-bold text-center normal-case ${priceChanged ? "border-terra-400 bg-terra-50 text-terra-700" : "border-brand-200 bg-white"}`} />
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
                    onChange={e => { setCustomDiscount(e.target.value); setDiscountChip(null); }}
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

        {/* ── CUSTOMER (optional) ── */}
        {cart.length > 0 && (
          <Card>
            <CardContent className="p-3 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-brand-700">Customer (optional)</p>
              {selectedCustomer ? (
                <div className="flex items-center justify-between bg-brand-50 rounded-xl px-3 py-2">
                  <div><p className="font-semibold text-brand-900 text-sm">{selectedCustomer.name}</p><p className="text-xs text-slate-500">{selectedCustomer.phone}</p></div>
                  <button onClick={clearCustomer} className="text-terra-400"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <div className="space-y-2 relative">
                  <input placeholder="Search name or mobile..." value={customerQuery}
                    onChange={e => { setCustomerQuery(e.target.value); setShowCustomerDropdown(true); }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    data-no-caps
                    className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none" />
                  {showCustomerDropdown && customerMatches.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-brand-200 rounded-xl shadow-lg overflow-hidden">
                      {customerMatches.map(c => (
                        <button key={c.id} onClick={() => selectCustomer(c)} className="w-full text-left px-4 py-2.5 hover:bg-brand-50 border-b border-brand-50 last:border-0">
                          <p className="font-semibold text-sm">{c.name}</p>
                          <p className="text-xs text-slate-500">{c.phone}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="Name" value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none" />
                    <input placeholder="Mobile" type="tel" value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)} className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none normal-case" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

      </div>

      {/* ── STICKY BOTTOM BAR — compact, always visible ── */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-brand-200 shadow-2xl md:max-w-2xl md:mx-auto">
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            {/* Left: total + discount badge */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-2xl font-black text-brand-900 leading-none">{inr(total)}</span>
                {discountAmount > 0 && (
                  <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                    − {inr(discountAmount)}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {cart.reduce((s, i) => s + i.quantity, 0)} item{cart.reduce((s, i) => s + i.quantity, 0) !== 1 ? "s" : ""} · {paymentMethod === "CASH" ? "💵 Cash" : paymentMethod === "UPI" ? "📱 UPI" : "💳 Card"}
              </p>
            </div>
            {/* Right: Generate Bill button */}
            <Button className="shrink-0 text-base py-3 px-6 font-bold rounded-2xl" onClick={checkout} disabled={checkingOut || cart.length === 0}>
              {checkingOut ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                  …
                </span>
              ) : `✅ Bill`}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
