import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { useToastStore } from "@/store/toast";
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
  code: z.string().min(2, "Code required"),
  name: z.string().min(2, "Name required"),
  categoryId: z.string().min(1, "Category required"),
  purchasePrice: z.coerce.number().nonnegative(),
  sellingPrice: z.coerce.number().nonnegative(),
  quantity: z.coerce.number().int().nonnegative(),
  supplierId: z.string().optional(),
  priceRangeId: z.string().optional(),
  discountLimit: z.coerce.number().min(0).max(100).optional(),
  mrp: z.coerce.number().nonnegative().optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  material: z.string().optional(),
  imageUrl: z.string().optional(),
  notes: z.string().optional()
});
type FormData = z.infer<typeof schema>;

type Product = {
  id: string; code: string; name: string; quantity: number;
  purchasePrice: number; sellingPrice: number; margin: number; profitPercentage: number;
  discountLimit?: number; stockStatus: string;
  category?: { name: string }; supplier?: { name: string }; priceRange?: { name: string };
};

const stockBadge = (status: string) => {
  if (status === "IN_STOCK") return <Badge className="bg-brand-100 text-brand-700">In Stock</Badge>;
  if (status === "LOW_STOCK") return <Badge className="bg-amber-100 text-amber-700">Low Stock</Badge>;
  return <Badge className="bg-red-100 text-red-700">Out of Stock</Badge>;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [priceRanges, setPriceRanges] = useState<{ id: string; name: string }[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterRange, setFilterRange] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("");
  const { show } = useToastStore();

  const { register, handleSubmit, reset, watch, control, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

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
    if (filterRange && p.priceRange?.name !== filterRange) return false;
    if (filterStatus && p.stockStatus !== filterStatus) return false;
    if (filterSupplier && p.supplier?.name !== filterSupplier) return false;
    return true;
  }), [products, filterCategory, filterRange, filterStatus, filterSupplier]);

  const openAdd = () => {
    setEditing(null);
    reset({ code: "", name: "", categoryId: "", purchasePrice: 0, sellingPrice: 0, quantity: 0, discountLimit: 30 });
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    reset({
      code: p.code, name: p.name, categoryId: p.category ? categories.find(c => c.name === p.category?.name)?.id ?? "" : "",
      purchasePrice: p.purchasePrice, sellingPrice: p.sellingPrice, quantity: p.quantity,
      discountLimit: p.discountLimit ?? 30
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    try {
      const payload = { ...data, supplierId: data.supplierId || undefined, priceRangeId: data.priceRangeId || undefined };
      if (editing) { await api.put(`/products/${editing.id}`, payload); show("Product updated"); }
      else { await api.post("/products", payload); show("Product added"); }
      setModalOpen(false);
      load();
    } catch { show("Failed to save product", "error"); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    try { await api.delete(`/products/${id}`); show("Product deleted"); load(); }
    catch { show("Cannot delete product", "error"); }
  };

  const lowCount = products.filter((p) => p.stockStatus === "LOW_STOCK").length;
  const outCount = products.filter((p) => p.stockStatus === "OUT_OF_STOCK").length;
  const inventoryValue = products.reduce((s, p) => s + p.purchasePrice * p.quantity, 0);

  const columns = [
    { key: "code", label: "Code", sortable: true },
    { key: "name", label: "Name", sortable: true },
    { key: "category", label: "Category", render: (p: Product) => p.category?.name ?? "-" },
    { key: "priceRange", label: "Range", render: (p: Product) => p.priceRange?.name ?? "-" },
    { key: "purchasePrice", label: "Buy", render: (p: Product) => inr(p.purchasePrice) },
    { key: "sellingPrice", label: "Sell", render: (p: Product) => inr(p.sellingPrice) },
    { key: "margin", label: "Margin", render: (p: Product) => inr(p.margin) },
    { key: "profitPercentage", label: "Margin %", render: (p: Product) => `${Number(p.profitPercentage).toFixed(1)}%` },
    { key: "quantity", label: "Qty" },
    { key: "discountLimit", label: "Disc. Limit", render: (p: Product) => p.discountLimit != null ? `${p.discountLimit}%` : "-" },
    { key: "stockStatus", label: "Status", render: (p: Product) => stockBadge(p.stockStatus) },
    { key: "actions", label: "", render: (p: Product) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(p)}><Pencil className="h-3 w-3" /></Button>
        <Button size="sm" variant="accent" onClick={() => remove(p.id)}><Trash2 className="h-3 w-3" /></Button>
      </div>
    )}
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Products" subtitle="Manage your inventory" actions={<Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Item</Button>} />

      <div className="flex flex-wrap gap-3 text-sm">
        <span className="rounded-xl bg-white/80 px-3 py-1.5 font-medium shadow-sm">{products.length} items</span>
        <span className="rounded-xl bg-amber-100 px-3 py-1.5 font-medium text-amber-700">{lowCount} low stock</span>
        <span className="rounded-xl bg-red-100 px-3 py-1.5 font-medium text-red-700">{outCount} out of stock</span>
        <span className="rounded-xl bg-brand-100 px-3 py-1.5 font-medium text-brand-700">Inv. value: {inr(inventoryValue)}</span>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <select className="rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <select className="rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm" value={filterRange} onChange={(e) => setFilterRange(e.target.value)}>
              <option value="">All Price Ranges</option>
              {priceRanges.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
            </select>
            <select className="rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All Stock Status</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
            <select className="rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm" value={filterSupplier} onChange={(e) => setFilterSupplier(e.target.value)}>
              <option value="">All Suppliers</option>
              {suppliers.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          <DataTable
            columns={columns}
            data={filtered}
            searchable
            searchPlaceholder="Search by name, code..."
            searchKeys={["name", "code"]}
          />
        </CardContent>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Item" : "Add Item"} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Item Name" required error={errors.name?.message}>
              <Input {...register("name")} placeholder="e.g. Soft Silk Saree" />
            </FormField>
            <FormField label="Product Code" required error={errors.code?.message}>
              <Input {...register("code")} placeholder="e.g. ANU-SILK-001" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Category" required error={errors.categoryId?.message}>
              <select {...register("categoryId")} className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
                <option value="">Select category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </FormField>
            <FormField label="Supplier" error={errors.supplierId?.message}>
              <select {...register("supplierId")} className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
                <option value="">Select supplier</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </FormField>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Purchase Price (₹)" required error={errors.purchasePrice?.message}>
              <Input type="number" min={0} step="0.01" {...register("purchasePrice")} />
            </FormField>
            <FormField label="Selling Price (₹)" required error={errors.sellingPrice?.message}>
              <Input type="number" min={0} step="0.01" {...register("sellingPrice")} />
            </FormField>
            <FormField label="MRP (₹)" error={errors.mrp?.message}>
              <Input type="number" min={0} step="0.01" {...register("mrp")} />
            </FormField>
          </div>

          {(purchasePrice > 0 || sellingPrice > 0) && (
            <div className="rounded-xl bg-brand-50 px-4 py-3 text-sm">
              <span className="font-semibold text-brand-800">Live Margin: </span>
              <span className={liveMargin >= 0 ? "text-brand-700 font-bold" : "text-terra-500 font-bold"}>{inr(liveMargin)}</span>
              <span className="ml-2 text-slate-500">({livePct.toFixed(1)}%)</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <FormField label="Quantity" required error={errors.quantity?.message}>
              <Input type="number" min={0} {...register("quantity")} />
            </FormField>
            <FormField label="Price Range" error={errors.priceRangeId?.message}>
              <select {...register("priceRangeId")} className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
                <option value="">Auto (by selling price)</option>
                {priceRanges.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </FormField>
            <FormField label="Discount Limit %" error={errors.discountLimit?.message}>
              <Input type="number" min={0} max={100} {...register("discountLimit")} placeholder="30" />
            </FormField>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Colour"><Input {...register("color")} placeholder="e.g. Teal" /></FormField>
            <FormField label="Size"><Input {...register("size")} placeholder="e.g. Free Size" /></FormField>
            <FormField label="Material"><Input {...register("material")} placeholder="e.g. Silk" /></FormField>
          </div>
          <FormField label="Image">
            <Controller
              control={control}
              name="imageUrl"
              render={({ field }) => <ImageUpload value={field.value} onChange={field.onChange} />}
            />
          </FormField>
          <FormField label="Notes"><Textarea {...register("notes")} placeholder="Any additional notes..." /></FormField>
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">{editing ? "Save Changes" : "Add Item"}</Button>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
