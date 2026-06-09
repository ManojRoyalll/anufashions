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
import { inr } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(2, "Name required"),
  phone: z.string().optional(),
  address: z.string().optional()
});
type FormData = z.infer<typeof schema>;

type Customer = { id: string; name: string; phone?: string; address?: string; totalSpend: number };

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { show } = useToastStore();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const load = () => api.get("/customers").then((r) => setCustomers(r.data));
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); reset({ name: "", phone: "", address: "" }); setModalOpen(true); };
  const openEdit = (c: Customer) => { setEditing(c); reset({ name: c.name, phone: c.phone ?? "", address: c.address ?? "" }); setModalOpen(true); };

  const onSubmit = async (data: FormData) => {
    try {
      if (editing) { await api.put(`/customers/${editing.id}`, data); show("Customer updated"); }
      else { await api.post("/customers", data); show("Customer added"); }
      setModalOpen(false);
      load();
    } catch { show("Failed to save customer", "error"); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this customer?")) return;
    try { await api.delete(`/customers/${id}`); show("Customer deleted"); load(); }
    catch { show("Cannot delete customer", "error"); }
  };

  const columns = [
    { key: "name", label: "Name", sortable: true },
    { key: "phone", label: "Phone" },
    { key: "address", label: "Address" },
    { key: "totalSpend", label: "Total Spend", render: (c: Customer) => <span className="font-semibold text-brand-700">{inr(c.totalSpend)}</span> },
    { key: "actions", label: "", render: (c: Customer) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(c)}><Pencil className="h-3 w-3" /></Button>
        <Button size="sm" variant="accent" onClick={() => remove(c.id)}><Trash2 className="h-3 w-3" /></Button>
      </div>
    )}
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Customers" subtitle="Track your customer base" actions={<Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Customer</Button>} />
      <Card><CardContent><DataTable columns={columns} data={customers} searchable searchPlaceholder="Search customers..." searchKeys={["name"]} /></CardContent></Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Customer" : "Add Customer"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Name" required error={errors.name?.message}><Input {...register("name")} placeholder="Customer name" /></FormField>
          <FormField label="Phone" error={errors.phone?.message}><Input {...register("phone")} placeholder="Phone number" /></FormField>
          <FormField label="Address" error={errors.address?.message}><Input {...register("address")} placeholder="Address" /></FormField>
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">{editing ? "Save Changes" : "Add Customer"}</Button>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
