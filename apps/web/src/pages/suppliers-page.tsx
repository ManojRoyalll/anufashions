import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { useToastStore } from "@/store/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { inr } from "@/lib/utils";
import { useLang } from "@/hooks/use-lang";

const schema = z.object({
  supplierName: z.string().min(2, "Name required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
  productsSupplied: z.string().optional()
});
type FormData = z.infer<typeof schema>;

type Supplier = { id: string; name: string; phone?: string; email?: string; address?: string; outstandingPayments: number };

export default function SuppliersPage() {
  const { t } = useLang();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { show } = useToastStore();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const load = () => api.get("/suppliers").then((r) => setSuppliers(r.data));
  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    reset({ supplierName: "", phone: "", email: "", address: "", productsSupplied: "" });
    setModalOpen(true);
  };
  const openEdit = (s: Supplier) => {
    setEditing(s);
    reset({ supplierName: s.name, phone: s.phone ?? "", email: s.email ?? "", address: s.address ?? "" });
    setModalOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    try {
      const payload = { name: data.supplierName, phone: data.phone, email: data.email, address: data.address, productsSupplied: data.productsSupplied };
      if (editing) { await api.put(`/suppliers/${editing.id}`, payload); show(t.save + " ✓"); }
      else { await api.post("/suppliers", payload); show(t.addSupplier + " ✓"); }
      setModalOpen(false);
      load();
    } catch { show("Error", "error"); }
  };

  const remove = async (id: string) => {
    if (!confirm(t.delete + "?")) return;
    try { await api.delete(`/suppliers/${id}`); show(t.delete + " ✓"); load(); }
    catch { show("Error", "error"); }
  };

  const columns = [
    { key: "name", label: t.name, sortable: true },
    { key: "phone", label: t.phone },
    { key: "email", label: t.email },
    { key: "address", label: t.address },
    { key: "outstandingPayments", label: t.outstanding, render: (s: Supplier) => inr(s.outstandingPayments) },
    { key: "actions", label: "", render: (s: Supplier) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(s)}><Pencil className="h-3 w-3" /></Button>
        <Button size="sm" variant="accent" onClick={() => remove(s.id)}><Trash2 className="h-3 w-3" /></Button>
      </div>
    )}
  ];

  return (
    <div className="space-y-5">
      <PageHeader title={t.suppliers} subtitle={t.suppliers} actions={<Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />{t.addSupplier}</Button>} />
      <Card><CardContent><DataTable columns={columns} data={suppliers} searchable searchPlaceholder={t.search} searchKeys={["name"]} /></CardContent></Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t.editSupplier : t.addSupplier}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label={t.name} required error={errors.supplierName?.message}>
            <Input {...register("supplierName")} placeholder="Supplier name" autoComplete="off" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label={t.phone} error={errors.phone?.message}>
              <Input {...register("phone")} placeholder="Phone number" />
            </FormField>
            <FormField label={t.email} error={errors.email?.message}>
              <Input {...register("email")} placeholder="email@example.com" />
            </FormField>
          </div>
          <FormField label={t.address} error={errors.address?.message}>
            <Textarea {...register("address")} placeholder="Address" />
          </FormField>
          <FormField label={t.productsSupplied} error={errors.productsSupplied?.message}>
            <Input {...register("productsSupplied")} placeholder="e.g. Sarees, Suits" />
          </FormField>
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">{editing ? t.save : t.addSupplier}</Button>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>{t.cancel}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
