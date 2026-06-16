import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { useToastStore } from "@/store/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { PageHeader } from "@/components/ui/page-header";
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
  const [search, setSearch] = useState("");
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
    catch { show("Cannot delete — category has items. Remove items first.", "error"); }
  };

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Categories"
        subtitle="రకాలు — Sarees, Blouses, Kurthis etc."
        actions={<Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Category</Button>}
      />

      <Card>
        <CardContent className="space-y-3">
          <input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none max-w-xs"
          />

          {filtered.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-6">{t.noRecords}</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-xl bg-brand-50 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-brand-900">{c.name}</p>
                    {c.description && <p className="text-xs text-slate-500 mt-0.5">{c.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <Badge className={c.status === "ACTIVE" ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-500"}>
                      {c.status === "ACTIVE" ? t.active : t.inactive}
                    </Badge>
                    <Button size="sm" variant="secondary" onClick={() => openEdit(c)}><Pencil className="h-3 w-3" /></Button>
                    <Button size="sm" variant="accent" onClick={() => remove(c.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
