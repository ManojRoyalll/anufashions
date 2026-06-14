// apps/web/src/pages/products-page.tsx
import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import api from "@/lib/api";
import { useToastStore } from "@/store/toast";
import { useLang } from "@/hooks/use-lang";
import { inr, generateItemCode, roundUpTo50, getSellMultiplier } from "@/lib/utils";
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
import { LabelPrinterItem, CustomLabelPrinter } from "@/components/ui/label-printer";

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
  // Supplier search state for the add/edit modal
  const [supplierQuery, setSupplierQuery] = useState("");
  const [showSupplierDrop, setShowSupplierDrop] = useState(false);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterMinPrice, setFilterMinPrice] = useState("");
  const [filterMaxPrice, setFilterMaxPrice] = useState("");
  const [filterMinQty, setFilterMinQty] = useState("");
  const [filterMaxQty, setFilterMaxQty] = useState("");
  const [filterSort, setFilterSort] = useState<"name" | "code" | "sellingPrice" | "quantity" | "purchasePrice" | "margin">("name");
  const [filterSortDir, setFilterSortDir] = useState<"asc" | "desc">("asc");
  const [showFilters, setShowFilters] = useState(false);

  const { register, handleSubmit, reset, watch, setValue, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema)
  });

  const purchasePrice = watch("purchasePrice") || 0;
  const sellingPrice = watch("sellingPrice") || 0;
  const currentCode = watch("code") || "";
  const discountLimit = watch("discountLimit") || 0;
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

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      if (filterCategory && p.category?.name !== filterCategory) return false;
      if (filterStatus && p.stockStatus !== filterStatus) return false;
      if (filterSupplier && p.supplier?.name !== filterSupplier) return false;
      if (filterMinPrice && p.sellingPrice < Number(filterMinPrice)) return false;
      if (filterMaxPrice && p.sellingPrice > Number(filterMaxPrice)) return false;
      if (filterMinQty && p.quantity < Number(filterMinQty)) return false;
      if (filterMaxQty && p.quantity > Number(filterMaxQty)) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      const av = (filterSort === "sellingPrice" || filterSort === "quantity" || filterSort === "purchasePrice" || filterSort === "margin")
        ? (a[filterSort] as number) : String(a[filterSort as keyof typeof a] ?? "").toLowerCase();
      const bv = (filterSort === "sellingPrice" || filterSort === "quantity" || filterSort === "purchasePrice" || filterSort === "margin")
        ? (b[filterSort] as number) : String(b[filterSort as keyof typeof b] ?? "").toLowerCase();
      if (av < bv) return filterSortDir === "asc" ? -1 : 1;
      if (av > bv) return filterSortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [products, filterCategory, filterStatus, filterSupplier, filterMinPrice, filterMaxPrice, filterMinQty, filterMaxQty, filterSort, filterSortDir]);

  // Reset form values after modal opens so fields are mounted when reset fires
  useEffect(() => {
    if (!modalOpen) return;
    if (editing) {
      reset({
        supplierId: editing.supplierId ?? "",
        name: editing.name,
        categoryId: editing.categoryId,
        purchasePrice: editing.purchasePrice,
        sellingPrice: editing.sellingPrice,
        discountLimit: editing.discountLimit ?? 30,
        quantity: editing.quantity,
        imageUrl: editing.imageUrl ?? "",
        notes: editing.notes ?? "",
        code: editing.code,
        mrp: editing.mrp,
        color: editing.color ?? "",
        size: editing.size ?? "",
        material: editing.material ?? "",
        priceRangeId: editing.priceRangeId ?? "",
      });
    } else {
      reset({ supplierId: "", name: "", categoryId: "", purchasePrice: 0, sellingPrice: 0, quantity: 0, discountLimit: 30 });
    }
  }, [modalOpen, editing]);

  // Auto-set sell price = multiplier × buy price, rounded up to nearest 50
  useEffect(() => {
    if (!modalOpen || editing) return;
    const m = getSellMultiplier();
    const currentSell = sellingPrice;
    if (purchasePrice > 0 && (currentSell === 0 || currentSell === roundUpTo50(purchasePrice * m))) {
      setValue("sellingPrice", roundUpTo50(purchasePrice * m));
    }
  }, [purchasePrice, modalOpen, editing]);

  // Auto-generate code when adding new item and prices are filled
  useEffect(() => {
    if (!modalOpen || editing) return; // only for new items
    if (purchasePrice > 0 && sellingPrice > 0) {
      // Stable seed based on prices so code doesn't flicker while typing
      const seed = Math.round(purchasePrice) + Math.round(sellingPrice);
      setValue("code", generateItemCode(purchasePrice, sellingPrice, discountLimit, seed));
    }
  }, [purchasePrice, sellingPrice, discountLimit, modalOpen, editing]);

  const openAdd = () => {
    setEditing(null);
    setShowMore(false);
    setSupplierQuery("");
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setShowMore(false);
    setSupplierQuery(suppliers.find(s => s.id === p.supplierId)?.name ?? "");
    setModalOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        ...data,
        code: data.code || generateItemCode(data.purchasePrice, data.sellingPrice, data.discountLimit ?? 0, Math.round(data.purchasePrice) + Math.round(data.sellingPrice)),
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
  const totalPieces = products.reduce((s, p) => s + p.quantity, 0);

  const columns = [
    { key: "code", label: "Code", sortable: true, render: (p: Product) => (
      <span className="font-mono text-xs text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded">{p.code}</span>
    )},
    { key: "name", label: t.sareeName, sortable: true, sticky: true },
    { key: "category", label: t.type, render: (p: Product) => p.category?.name ?? "-" },
    { key: "supplier", label: t.supplier, render: (p: Product) => p.supplier?.name ?? "-" },
    { key: "purchasePrice", label: t.buyPrice, render: (p: Product) => inr(p.purchasePrice) },
    { key: "sellingPrice", label: t.sellPrice, render: (p: Product) => inr(p.sellingPrice) },
    { key: "margin", label: t.profit, render: (p: Product) => <span className="font-semibold text-brand-700">{inr(p.margin)}</span> },
    { key: "quantity", label: t.pieces },
    { key: "discountLimit", label: t.maxDiscount, render: (p: Product) => p.discountLimit != null ? `${p.discountLimit}%` : "-" },
    { key: "stockStatus", label: t.stock, render: (p: Product) => stockBadge(p.stockStatus) },
    { key: "actions", label: "", render: (p: Product) => (
      <div className="flex gap-1.5">
        <LabelPrinterItem product={p} />
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
        actions={
          <div className="flex gap-2">
            <CustomLabelPrinter />
            <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />{t.addItem}</Button>
          </div>
        }
      />

      {/* ── Stats cards ── */}
      {/* ── Stats cards — click to filter ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <button
          onClick={() => { setFilterStatus(""); setShowFilters(false); }}
          className={`rounded-2xl shadow-sm border p-4 text-left transition hover:shadow-md ${!filterStatus ? "bg-brand-700 border-brand-700" : "bg-white border-brand-100 hover:border-brand-300"}`}
        >
          <p className={`text-xs font-medium ${!filterStatus ? "text-brand-200" : "text-slate-500"}`}>Total Items</p>
          <p className={`text-2xl font-bold mt-1 ${!filterStatus ? "text-white" : "text-brand-900"}`}>{products.length}</p>
          <p className={`text-xs mt-0.5 ${!filterStatus ? "text-brand-200" : "text-slate-400"}`}>{totalPieces.toLocaleString("en-IN")} pcs</p>
        </button>
        <div className="rounded-2xl bg-white shadow-sm border border-brand-100 p-4">
          <p className="text-xs text-slate-500 font-medium">Inventory Value</p>
          <p className="text-2xl font-bold text-brand-700 mt-1">{inr(inventoryValue)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{totalPieces} pieces</p>
        </div>
        <button
          onClick={() => { setFilterStatus("IN_STOCK"); setShowFilters(false); }}
          className={`rounded-2xl shadow-sm border p-4 text-left transition hover:shadow-md ${filterStatus === "IN_STOCK" ? "bg-brand-700 border-brand-700" : "bg-white border-brand-100 hover:border-brand-300"}`}
        >
          <p className={`text-xs font-medium ${filterStatus === "IN_STOCK" ? "text-brand-200" : "text-slate-500"}`}>In Stock</p>
          <p className={`text-2xl font-bold mt-1 ${filterStatus === "IN_STOCK" ? "text-white" : "text-brand-700"}`}>
            {products.filter(p => p.stockStatus === "IN_STOCK").length}
          </p>
          <p className={`text-xs mt-0.5 ${filterStatus === "IN_STOCK" ? "text-brand-200" : "text-slate-400"}`}>Tap to filter</p>
        </button>
        <button
          onClick={() => { setFilterStatus("LOW_STOCK"); setShowFilters(false); }}
          className={`rounded-2xl shadow-sm border p-4 text-left transition hover:shadow-md ${filterStatus === "LOW_STOCK" ? "bg-amber-600 border-amber-600" : lowCount > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-brand-100"} `}
        >
          <p className={`text-xs font-medium ${filterStatus === "LOW_STOCK" ? "text-amber-100" : "text-slate-500"}`}>Low Stock</p>
          <p className={`text-2xl font-bold mt-1 ${filterStatus === "LOW_STOCK" ? "text-white" : lowCount > 0 ? "text-amber-600" : "text-slate-400"}`}>{lowCount}</p>
          <p className={`text-xs mt-0.5 ${filterStatus === "LOW_STOCK" ? "text-amber-200" : "text-slate-400"}`}>≤5 pieces</p>
        </button>
        <button
          onClick={() => { setFilterStatus("OUT_OF_STOCK"); setShowFilters(false); }}
          className={`rounded-2xl shadow-sm border p-4 text-left transition hover:shadow-md ${filterStatus === "OUT_OF_STOCK" ? "bg-red-600 border-red-600" : outCount > 0 ? "bg-red-50 border-red-200" : "bg-white border-brand-100"}`}
        >
          <p className={`text-xs font-medium ${filterStatus === "OUT_OF_STOCK" ? "text-red-100" : "text-slate-500"}`}>Out of Stock</p>
          <p className={`text-2xl font-bold mt-1 ${filterStatus === "OUT_OF_STOCK" ? "text-white" : outCount > 0 ? "text-red-600" : "text-slate-400"}`}>{outCount}</p>
          <p className={`text-xs mt-0.5 ${filterStatus === "OUT_OF_STOCK" ? "text-red-200" : "text-slate-400"}`}>Tap to filter</p>
        </button>
      </div>

      <Card>
        <CardContent className="space-y-4">
          {/* ── Filter bar ── */}
          {(() => {
            const activeCount = [filterCategory, filterStatus, filterSupplier, filterMinPrice, filterMaxPrice, filterMinQty, filterMaxQty].filter(Boolean).length;
            const clearAll = () => { setFilterCategory(""); setFilterStatus(""); setFilterSupplier(""); setFilterMinPrice(""); setFilterMaxPrice(""); setFilterMinQty(""); setFilterMaxQty(""); };
            return (
              <div className="space-y-3">
                {/* Top row: search toggle + sort */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowFilters(v => !v)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition ${
                      showFilters || activeCount > 0
                        ? "bg-brand-700 text-white border-brand-700"
                        : "bg-white text-brand-700 border-brand-200 hover:bg-brand-50"
                    }`}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 8h10M11 12h2M15 16H9" /></svg>
                    Filters
                    {activeCount > 0 && <span className="ml-1 bg-white text-brand-700 rounded-full px-1.5 text-xs font-bold">{activeCount}</span>}
                  </button>
                  {activeCount > 0 && (
                    <button onClick={clearAll} className="text-xs text-terra-600 font-medium hover:underline">
                      Clear all
                    </button>
                  )}
                  <div className="flex items-center gap-1 ml-auto">
                    <span className="text-xs text-slate-500">Sort:</span>
                    <select className="rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm" value={filterSort} onChange={(e) => setFilterSort(e.target.value as typeof filterSort)}>
                      <option value="name">Name</option>
                      <option value="code">Code</option>
                      <option value="sellingPrice">Sell Price</option>
                      <option value="purchasePrice">Buy Price</option>
                      <option value="quantity">Quantity</option>
                      <option value="margin">Profit</option>
                    </select>
                    <button
                      onClick={() => setFilterSortDir(d => d === "asc" ? "desc" : "asc")}
                      className="rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm font-bold text-brand-700 hover:bg-brand-50"
                    >{filterSortDir === "asc" ? "↑ A–Z" : "↓ Z–A"}</button>
                  </div>
                </div>

                {/* Expanded filter panel */}
                {showFilters && (
                  <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">

                    {/* Category */}
                    <div>
                      <p className="text-xs font-semibold text-brand-700 mb-1">Type / Category</p>
                      <select className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                        <option value="">All Types</option>
                        {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>

                    {/* Supplier */}
                    <div>
                      <p className="text-xs font-semibold text-brand-700 mb-1">Supplier</p>
                      <select className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm" value={filterSupplier} onChange={(e) => setFilterSupplier(e.target.value)}>
                        <option value="">All Suppliers</option>
                        {suppliers.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>

                    {/* Stock status */}
                    <div>
                      <p className="text-xs font-semibold text-brand-700 mb-1">Stock Status</p>
                      <select className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                        <option value="">All</option>
                        <option value="IN_STOCK">{t.inStock}</option>
                        <option value="LOW_STOCK">{t.lowStock}</option>
                        <option value="OUT_OF_STOCK">{t.outOfStock}</option>
                      </select>
                    </div>

                    {/* Sell price range */}
                    <div>
                      <p className="text-xs font-semibold text-brand-700 mb-1">Sell Price (₹)</p>
                      <div className="flex items-center gap-1.5">
                        <input type="number" placeholder="Min" value={filterMinPrice} onChange={(e) => setFilterMinPrice(e.target.value)}
                          className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
                        <span className="text-slate-400 text-xs shrink-0">to</span>
                        <input type="number" placeholder="Max" value={filterMaxPrice} onChange={(e) => setFilterMaxPrice(e.target.value)}
                          className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
                      </div>
                    </div>

                    {/* Quantity range */}
                    <div>
                      <p className="text-xs font-semibold text-brand-700 mb-1">Pieces (Qty)</p>
                      <div className="flex items-center gap-1.5">
                        <input type="number" placeholder="Min" value={filterMinQty} onChange={(e) => setFilterMinQty(e.target.value)}
                          className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
                        <span className="text-slate-400 text-xs shrink-0">to</span>
                        <input type="number" placeholder="Max" value={filterMaxQty} onChange={(e) => setFilterMaxQty(e.target.value)}
                          className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
                      </div>
                    </div>

                    {/* Active filter summary */}
                    {activeCount > 0 && (
                      <div className="sm:col-span-2 md:col-span-3 flex items-center justify-between bg-brand-100 rounded-xl px-3 py-2">
                        <span className="text-xs text-brand-700 font-medium">
                          Showing <strong>{filtered.length}</strong> of {products.length} items
                        </span>
                        <button onClick={clearAll} className="text-xs text-terra-600 font-semibold hover:underline">Clear all filters</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          <DataTable columns={columns} data={filtered} searchable searchPlaceholder={t.search} searchKeys={["name", "code"]} />
        </CardContent>
      </Card>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setSupplierQuery(""); }} title={editing ? t.editItem : t.addItem} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Supplier — searchable */}
          <FormField label={t.supplier} error={errors.supplierId?.message}>
            <div className="relative">
              <input
                type="text"
                autoComplete="off"
                placeholder="Search supplier by name..."
                value={supplierQuery}
                onChange={(e) => { setSupplierQuery(e.target.value); setShowSupplierDrop(true); setValue("supplierId", ""); }}
                onFocus={() => setShowSupplierDrop(true)}
                className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
              />
              {showSupplierDrop && supplierQuery && (
                <div className="absolute left-0 right-0 z-20 mt-1 bg-white border border-brand-200 rounded-xl shadow-lg overflow-hidden">
                  {suppliers
                    .filter(s => s.name.toLowerCase().includes(supplierQuery.toLowerCase()))
                    .slice(0, 6)
                    .map(s => (
                      <button key={s.id} type="button"
                        onClick={() => { setValue("supplierId", s.id); setSupplierQuery(s.name); setShowSupplierDrop(false); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-brand-50 border-b border-brand-50 last:border-0 text-sm font-medium text-brand-900"
                      >{s.name}</button>
                    ))
                  }
                  {suppliers.filter(s => s.name.toLowerCase().includes(supplierQuery.toLowerCase())).length === 0 && (
                    <p className="px-4 py-3 text-sm text-slate-400">No supplier found</p>
                  )}
                </div>
              )}
            </div>
            {/* Hidden RHF field */}
            <input type="hidden" {...register("supplierId")} />
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

          {/* Code — always visible, auto-generated */}
          <FormField label={`${t.productCode} (auto-generated)`} error={errors.code?.message}>
            <div className="flex gap-2">
              <Input {...register("code")} placeholder="Auto-generated from prices" className="flex-1" />
              {purchasePrice > 0 && sellingPrice > 0 && (
                <button
                  type="button"
                  onClick={() => setValue("code", generateItemCode(purchasePrice, sellingPrice, discountLimit, Math.floor(Math.random() * 9) + 1))}
                  className="shrink-0 px-3 py-2 text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-200 rounded-xl hover:bg-brand-100 transition"
                >↻ New</button>
              )}
            </div>
          </FormField>

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
