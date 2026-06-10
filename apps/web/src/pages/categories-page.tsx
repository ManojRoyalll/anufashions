import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { useToastStore } from "@/store/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Card, CardContent } from "@/components/ui/card";
import { useLang } from "@/hooks/use-lang";

type Category = { id: string; name: string; description?: string; status: "ACTIVE" | "INACTIVE" };

const empty = () => ({ categoryName: "", description: "", status: "ACTIVE" as "ACTIVE" | "INACTIVE" });

export default function CategoriesPage() {
  const { t } = useLang();
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Category | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(empty());
  const [err, setErr] = useState("");
  const { show } = useToastStore();

  const load = () => api.get("/categories").then((r) => setCategories(r.data));
  useEffect(() => { load(); }, []);

  const set = (field: string, val: string) => {
    setForm((f) => ({ ...f, [field]: val }));
    if (field === "categoryName") setErr("");
  };

  const openAdd = () => { setEditing(null); setForm(empty()); setErr(""); setModalOpen(true); };
  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({ categoryName: c.name, description: c.description ?? "", status: c.status });
    setErr("");
    setModalOpen(true);
  };

  const onSubmit = async () => {
    if (!form.categoryName.trim() || form.categoryName.trim().length < 2) {
      setErr("Category name is required (at least 2 characters)");
      return;
    }
    try {
      const payload = { name: form.categoryName.trim(), description: form.description || undefined, status: form.status };
      if (editing) { await api.put(`/categories/${editing.id}`, payload); show(t.save + " ✓"); }
      else { await api.post("/categories", payload); show("Category added ✓"); }
      setModalOpen(false);
      load();
    } catch { show("Error", "error"); }
  };

  const remove = async (id: string) => {
    if (!confirm(t.delete + "?")) return;
    try { await api.delete(`/categories/${id}`); show(t.delete + " ✓"); load(); }
    catch { show("Cannot delete — category has products", "error"); }
  };

  const columns = [
    { key: "name", label: "Category Name", sortable: true },
    { key: "description", label: t.description },
    { key: "status", label: t.status, render: (row: Category) => (
      <Badge className={row.status === "ACTIVE" ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-500"}>
        {row.status === "ACTIVE" ? t.active : t.inactive}
      </Badge>
    )},
    { key: "actions", label: "", render: (row: Category) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(row)}><Pencil className="h-3 w-3" /></Button>
        <Button size="sm" variant="accent" onClick={() => remove(row.id)}><Trash2 className="h-3 w-3" /></Button>
      </div>
    )}
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Categories" subtitle="రకాలు — Sarees, Blouses, Kurthis etc." actions={<Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Category</Button>} />
      <Card><CardContent><DataTable columns={columns} data={categories} searchable searchPlaceholder="Search categories..." searchKeys={["name"]} /></CardContent></Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Category" : "Add Category"}>
        <div className="space-y-4">
          <FormField label="Category Name" required error={err}>
            <input
              type="text"
              autoComplete="off"
              placeholder="e.g. Silk Sarees, Cotton Sarees, Blouses..."
              value={form.categoryName}
              onChange={(e) => set("categoryName", e.target.value)}
              className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
            />
          </FormField>
          <FormField label={t.description}>
            <input type="text" autoComplete="off" placeholder="Optional description" value={form.description} onChange={(e) => set("description", e.target.value)} className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none" />
          </FormField>
          <FormField label={t.status}>
            <select value={form.status} onChange={(e) => set("status", e.target.value)} className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
              <option value="ACTIVE">{t.active}</option>
              <option value="INACTIVE">{t.inactive}</option>
            </select>
          </FormField>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={onSubmit}>{editing ? t.save : "Add Category"}</Button>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>{t.cancel}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
