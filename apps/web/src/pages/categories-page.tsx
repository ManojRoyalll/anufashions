import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { useToastStore } from "@/store/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useLang } from "@/hooks/use-lang";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"])
});
type FormData = z.infer<typeof schema>;

type Category = { id: string; name: string; description?: string; status: "ACTIVE" | "INACTIVE" };

export default function CategoriesPage() {
  const { t } = useLang();
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Category | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { show } = useToastStore();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: "ACTIVE" }
  });

  const load = () => api.get("/categories").then((r) => setCategories(r.data));
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); reset({ name: "", description: "", status: "ACTIVE" }); setModalOpen(true); };
  const openEdit = (cat: Category) => { setEditing(cat); reset({ name: cat.name, description: cat.description ?? "", status: cat.status }); setModalOpen(true); };

  const onSubmit = async (data: FormData) => {
    try {
      if (editing) {
        await api.put(`/categories/${editing.id}`, data);
        show(t.save + " ✓");
      } else {
        await api.post("/categories", data);
        show(t.addCategory + " ✓");
      }
      setModalOpen(false);
      load();
    } catch {
      show("Error", "error");
    }
  };

  const remove = async (id: string) => {
    if (!confirm(t.delete + "?")) return;
    try {
      await api.delete(`/categories/${id}`);
      show(t.delete + " ✓");
      load();
    } catch { show("Error", "error"); }
  };

  const columns = [
    { key: "name", label: t.name, sortable: true },
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
      <PageHeader title={t.types} subtitle={t.types} actions={<Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />{t.addCategory}</Button>} />
      <Card><CardContent><DataTable columns={columns} data={categories} searchable searchPlaceholder={t.search} searchKeys={["name"]} /></CardContent></Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t.editCategory : t.addCategory}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label={t.categoryName} required error={errors.name?.message}>
            <Input {...register("name")} placeholder="e.g. Sarees" />
          </FormField>
          <FormField label={t.description} error={errors.description?.message}>
            <Textarea {...register("description")} placeholder="Optional description" />
          </FormField>
          <FormField label={t.status}>
            <select {...register("status")} className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none">
              <option value="ACTIVE">{t.active}</option>
              <option value="INACTIVE">{t.inactive}</option>
            </select>
          </FormField>
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">{editing ? t.save : t.addCategory}</Button>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>{t.cancel}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
