import { useEffect, useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, Check } from "lucide-react";
import api from "@/lib/api";
import { useToastStore } from "@/store/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { inr } from "@/lib/utils";
import { useLang } from "@/hooks/use-lang";

type Supplier = { id: string; name: string; phone?: string };
type ExistingCategory = { id: string; name: string };

type ItemRow = {
  id: string;
  title: string;
  buyPrice: string;
  sellPrice: string;
  maxDiscount: string;
  quantity: string;
};

type CategoryGroup = {
  id: string;
  categoryName: string;
  items: ItemRow[];
};

function emptyItem(): ItemRow {
  return { id: Math.random().toString(36).slice(2), title: "", buyPrice: "", sellPrice: "", maxDiscount: "", quantity: "" };
}

function emptyGroup(): CategoryGroup {
  return { id: Math.random().toString(36).slice(2), categoryName: "", items: [emptyItem()] };
}

export default function AddStockPage() {
  const { t } = useLang();
  const { show } = useToastStore();

  // Step 1: Supplier
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [existingCategories, setExistingCategories] = useState<ExistingCategory[]>([]);
  const [supplierQuery, setSupplierQuery] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");
  const [showSupplierDrop, setShowSupplierDrop] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  // Step 2: Categories + Items
  const [groups, setGroups] = useState<CategoryGroup[]>([emptyGroup()]);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/suppliers").then((r) => setSuppliers(r.data));
    api.get("/categories").then((r) => setExistingCategories(r.data));
  }, []);

  const supplierMatches = supplierQuery.trim()
    ? suppliers.filter((s) =>
        s.name.toLowerCase().includes(supplierQuery.toLowerCase()) ||
        (s.phone && s.phone.includes(supplierQuery))
      ).slice(0, 5)
    : [];

  const selectSupplier = (s: Supplier) => {
    setSelectedSupplier(s);
    setNewSupplierName(s.name);
    setNewSupplierPhone(s.phone ?? "");
    setSupplierQuery("");
    setShowSupplierDrop(false);
  };

  const proceedToItems = async () => {
    if (!newSupplierName.trim()) { show("Enter supplier name", "error"); return; }
    if (!selectedSupplier) {
      // Create new supplier
      try {
        const res = await api.post("/suppliers", {
          name: newSupplierName.trim(),
          phone: newSupplierPhone.trim() || undefined
        });
        setSelectedSupplier(res.data);
        const updated = await api.get("/suppliers");
        setSuppliers(updated.data);
      } catch { show("Error saving supplier", "error"); return; }
    }
    setStep(2);
    setOpenGroups(new Set([groups[0].id]));
  };

  // Group ops
  const addGroup = () => {
    const g = emptyGroup();
    setGroups((prev) => [...prev, g]);
    setOpenGroups((prev) => new Set([...prev, g.id]));
  };

  const removeGroup = (id: string) => setGroups((prev) => prev.filter((g) => g.id !== id));

  const updateGroupName = (id: string, val: string) =>
    setGroups((prev) => prev.map((g) => g.id === id ? { ...g, categoryName: val } : g));

  const toggleGroup = (id: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Item ops
  const addItem = (groupId: string) =>
    setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, items: [...g.items, emptyItem()] } : g));

  const removeItem = (groupId: string, itemId: string) =>
    setGroups((prev) => prev.map((g) => g.id === groupId
      ? { ...g, items: g.items.filter((i) => i.id !== itemId) }
      : g
    ));

  const updateItem = (groupId: string, itemId: string, field: keyof ItemRow, val: string) =>
    setGroups((prev) => prev.map((g) => g.id === groupId
      ? { ...g, items: g.items.map((i) => i.id === itemId ? { ...i, [field]: val } : i) }
      : g
    ));

  const totalItems = groups.reduce((s, g) => s + g.items.filter((i) => i.title.trim()).length, 0);

  const saveAll = async () => {
    if (!selectedSupplier) return;
    setSaving(true);
    let saved = 0;
    let failed = 0;
    try {
      for (const group of groups) {
        if (!group.categoryName.trim()) continue;

        // Ensure category exists
        let categoryId: string;
        try {
          const catRes = await api.post("/categories", { name: group.categoryName.trim(), status: "ACTIVE" });
          categoryId = catRes.data.id;
        } catch {
          // Category likely already exists — fetch it
          const cats = await api.get("/categories");
          const existing = cats.data.find((c: { id: string; name: string }) =>
            c.name.toLowerCase() === group.categoryName.trim().toLowerCase()
          );
          if (!existing) { failed++; continue; }
          categoryId = existing.id;
        }

        for (const item of group.items) {
          if (!item.title.trim() || !item.buyPrice || !item.sellPrice || !item.quantity) continue;
          try {
            await api.post("/products", {
              code: `ANU-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
              name: item.title.trim(),
              categoryId,
              supplierId: selectedSupplier.id,
              purchasePrice: Number(item.buyPrice),
              sellingPrice: Number(item.sellPrice),
              discountLimit: item.maxDiscount ? Number(item.maxDiscount) : undefined,
              quantity: Number(item.quantity),
            });
            saved++;
          } catch { failed++; }
        }
      }

      if (saved > 0) {
        show(`${saved} item${saved > 1 ? "s" : ""} added to stock ✓`);
        setGroups([emptyGroup()]);
        setStep(1);
        setSelectedSupplier(null);
        setNewSupplierName("");
        setNewSupplierPhone("");
      }
      if (failed > 0) show(`${failed} item${failed > 1 ? "s" : ""} failed`, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-brand-900">Add Stock</h1>
        <p className="text-sm text-slate-500 mt-0.5">సరుకు చేర్చు — Add items by supplier</p>
      </div>

      {/* STEP INDICATOR */}
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold ${step === 1 ? "bg-brand-700 text-white" : "bg-brand-100 text-brand-700"}`}>
          {step > 1 ? <Check className="h-4 w-4" /> : <span>1</span>}
          Supplier
        </div>
        <div className="h-px flex-1 bg-brand-200" />
        <div className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold ${step === 2 ? "bg-brand-700 text-white" : "bg-brand-100 text-brand-600"}`}>
          <span>2</span>
          Categories &amp; Items
        </div>
      </div>

      {/* STEP 1: SUPPLIER */}
      {step === 1 && (
        <Card>
          <CardContent className="space-y-4">
            <p className="font-semibold text-brand-900">Who did you buy from? / ఎవరి నుండి కొన్నారు?</p>

            {selectedSupplier ? (
              <div className="flex items-center justify-between bg-brand-50 rounded-xl px-4 py-3">
                <div>
                  <p className="font-bold text-brand-900">{selectedSupplier.name}</p>
                  {selectedSupplier.phone && <p className="text-xs text-slate-500">{selectedSupplier.phone}</p>}
                </div>
                <button onClick={() => { setSelectedSupplier(null); setNewSupplierName(""); setNewSupplierPhone(""); }} className="text-terra-500 text-sm font-medium">Change</button>
              </div>
            ) : (
              <div className="relative space-y-3">
                <div>
                  <p className="text-xs font-semibold text-brand-700 mb-1">Search existing supplier</p>
                  <Input
                    placeholder="Type name or phone..."
                    value={supplierQuery}
                    onChange={(e) => { setSupplierQuery(e.target.value); setShowSupplierDrop(true); }}
                    onFocus={() => setShowSupplierDrop(true)}
                    autoComplete="off"
                  />
                  {showSupplierDrop && supplierMatches.length > 0 && (
                    <div className="absolute left-0 right-0 z-20 mt-1 bg-white border border-brand-200 rounded-xl shadow-premium overflow-hidden">
                      {supplierMatches.map((s) => (
                        <button key={s.id} onClick={() => selectSupplier(s)} className="w-full text-left px-4 py-2.5 hover:bg-brand-50 border-b border-brand-50 last:border-0">
                          <p className="font-semibold text-sm text-brand-900">{s.name}</p>
                          {s.phone && <p className="text-xs text-slate-500">{s.phone}</p>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="border-t border-brand-100 pt-3">
                  <p className="text-xs font-semibold text-brand-700 mb-2">Or add new supplier</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Name *</p>
                      <Input
                        placeholder="Supplier name"
                        value={newSupplierName}
                        onChange={(e) => setNewSupplierName(e.target.value)}
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Phone</p>
                      <Input
                        placeholder="Phone number"
                        value={newSupplierPhone}
                        onChange={(e) => setNewSupplierPhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Button className="w-full" onClick={proceedToItems} disabled={!newSupplierName.trim() && !selectedSupplier}>
              Next — Add Items →
            </Button>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: CATEGORIES + ITEMS */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="bg-brand-50 rounded-xl px-4 py-2 text-sm">
              <span className="text-slate-500">Supplier: </span>
              <span className="font-bold text-brand-900">{selectedSupplier?.name}</span>
              <button onClick={() => setStep(1)} className="ml-3 text-xs text-brand-600 underline">Change</button>
            </div>
          </div>

          {groups.map((group, gi) => (
            <Card key={group.id}>
              <CardContent className="space-y-3">
                {/* Category row */}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-brand-700 mb-1">Category / రకం {gi + 1}</p>
                    <input
                      type="text"
                      autoComplete="off"
                      placeholder="e.g. Cotton Sarees, Silk Sarees, Blouses..."
                      value={group.categoryName}
                      onChange={(e) => updateGroupName(group.id, e.target.value)}
                      className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
                    />
                    {existingCategories.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {existingCategories.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => updateGroupName(group.id, c.name)}
                            className={`rounded-full px-3 py-1 text-xs font-medium border transition ${
                              group.categoryName === c.name
                                ? "bg-brand-700 text-white border-brand-700"
                                : "bg-white text-brand-700 border-brand-200 hover:border-brand-500"
                            }`}
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-5">
                    <button onClick={() => toggleGroup(group.id)} className="p-2 rounded-xl bg-brand-50 text-brand-700 hover:bg-brand-100">
                      {openGroups.has(group.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {groups.length > 1 && (
                      <button onClick={() => removeGroup(group.id)} className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Items */}
                {openGroups.has(group.id) && (
                  <div className="space-y-2">
                    {/* Header row */}
                    <div className="grid grid-cols-[2fr_1fr_1fr_0.7fr_0.7fr_auto] gap-2 px-1">
                      {["Saree / Item Name", "Buy ₹", "Sell ₹", "Max Disc %", "Qty", ""].map((h) => (
                        <p key={h} className="text-xs font-semibold text-brand-600">{h}</p>
                      ))}
                    </div>

                    {group.items.map((item) => {
                      const buy = Number(item.buyPrice) || 0;
                      const sell = Number(item.sellPrice) || 0;
                      const profit = sell - buy;
                      return (
                        <div key={item.id} className="space-y-1">
                          <div className="grid grid-cols-[2fr_1fr_1fr_0.7fr_0.7fr_auto] gap-2 items-center">
                            <Input
                              placeholder="Item name"
                              value={item.title}
                              onChange={(e) => updateItem(group.id, item.id, "title", e.target.value)}
                              autoComplete="off"
                            />
                            <Input
                              type="number"
                              placeholder="0"
                              value={item.buyPrice}
                              onChange={(e) => updateItem(group.id, item.id, "buyPrice", e.target.value)}
                            />
                            <Input
                              type="number"
                              placeholder="0"
                              value={item.sellPrice}
                              onChange={(e) => updateItem(group.id, item.id, "sellPrice", e.target.value)}
                            />
                            <Input
                              type="number"
                              placeholder="20"
                              value={item.maxDiscount}
                              onChange={(e) => updateItem(group.id, item.id, "maxDiscount", e.target.value)}
                            />
                            <Input
                              type="number"
                              placeholder="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(group.id, item.id, "quantity", e.target.value)}
                            />
                            <button
                              onClick={() => group.items.length > 1 ? removeItem(group.id, item.id) : undefined}
                              className={`p-2 rounded-xl ${group.items.length > 1 ? "text-red-400 hover:bg-red-50" : "text-slate-200"}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {/* Live profit preview */}
                          {(buy > 0 && sell > 0) && (
                            <p className={`text-xs ml-1 font-semibold ${profit >= 0 ? "text-brand-600" : "text-terra-500"}`}>
                              Profit: {inr(profit)} per piece ({buy > 0 ? ((profit / buy) * 100).toFixed(1) : 0}%)
                            </p>
                          )}
                        </div>
                      );
                    })}

                    <button
                      onClick={() => addItem(group.id)}
                      className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-800 font-medium mt-1"
                    >
                      <Plus className="h-4 w-4" /> Add another item
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          <button
            onClick={addGroup}
            className="flex items-center gap-2 w-full justify-center rounded-xl border-2 border-dashed border-brand-300 py-3 text-sm font-semibold text-brand-600 hover:border-brand-500 hover:bg-brand-50 transition"
          >
            <Plus className="h-4 w-4" /> Add another category
          </button>

          {totalItems > 0 && (
            <Card>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-brand-900">{totalItems} item{totalItems > 1 ? "s" : ""} ready to save</p>
                    <p className="text-xs text-slate-500">Under {groups.filter(g => g.categoryName.trim()).length} categor{groups.filter(g => g.categoryName.trim()).length > 1 ? "ies" : "y"} for {selectedSupplier?.name}</p>
                  </div>
                  <Button onClick={saveAll} disabled={saving} className="px-8">
                    {saving ? "Saving..." : "✅ Save All"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
