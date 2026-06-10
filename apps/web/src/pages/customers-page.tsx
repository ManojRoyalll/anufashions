import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { useToastStore } from "@/store/toast";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FormField } from "@/components/ui/form-field";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Card, CardContent } from "@/components/ui/card";
import { inr } from "@/lib/utils";
import { useLang } from "@/hooks/use-lang";

type Customer = { id: string; name: string; phone?: string; address?: string; totalSpend: number };

const empty = () => ({ customerName: "", phone: "", address: "" });

export default function CustomersPage() {
  const { t } = useLang();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(empty());
  const [err, setErr] = useState("");
  const { show } = useToastStore();

  const load = () => api.get("/customers").then((r) => setCustomers(r.data));
  useEffect(() => { load(); }, []);

  const set = (field: string, val: string) => {
    setForm((f) => ({ ...f, [field]: val }));
    if (field === "customerName") setErr("");
  };

  const openAdd = () => { setEditing(null); setForm(empty()); setErr(""); setModalOpen(true); };
  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({ customerName: c.name, phone: c.phone ?? "", address: c.address ?? "" });
    setErr("");
    setModalOpen(true);
  };

  const onSubmit = async () => {
    if (!form.customerName.trim() || form.customerName.trim().length < 2) {
      setErr("Name is required (at least 2 characters)");
      return;
    }
    try {
      const payload = { name: form.customerName.trim(), phone: form.phone || undefined, address: form.address || undefined };
      if (editing) { await api.put(`/customers/${editing.id}`, payload); show(t.save + " ✓"); }
      else { await api.post("/customers", payload); show(t.add + " ✓"); }
      setModalOpen(false);
      load();
    } catch { show("Error", "error"); }
  };

  const remove = async (id: string) => {
    if (!confirm(t.delete + "?")) return;
    try { await api.delete(`/customers/${id}`); show(t.delete + " ✓"); load(); }
    catch { show("Error", "error"); }
  };

  const columns = [
    { key: "name", label: t.name, sortable: true },
    { key: "phone", label: t.phone },
    { key: "address", label: t.address },
    { key: "totalSpend", label: "Total Spent", render: (c: Customer) => <span className="font-semibold text-brand-700">{inr(c.totalSpend)}</span> },
    { key: "actions", label: "", render: (c: Customer) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(c)}><Pencil className="h-3 w-3" /></Button>
        <Button size="sm" variant="accent" onClick={() => remove(c.id)}><Trash2 className="h-3 w-3" /></Button>
      </div>
    )}
  ];

  return (
    <div className="space-y-5">
      <PageHeader title={t.customers} subtitle="Customer list" actions={<Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />{t.add} Customer</Button>} />
      <Card><CardContent><DataTable columns={columns} data={customers} searchable searchPlaceholder={t.search} searchKeys={["name"]} /></CardContent></Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Customer" : "Add Customer"}>
        <div className="space-y-4">
          <FormField label={t.name} required error={err}>
            <input
              type="text"
              autoComplete="off"
              placeholder="Customer name"
              value={form.customerName}
              onChange={(e) => set("customerName", e.target.value)}
              className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
            />
          </FormField>
          <FormField label={t.phone}>
            <input type="tel" autoComplete="off" placeholder="Phone number" value={form.phone} onChange={(e) => set("phone", e.target.value)} className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none" />
          </FormField>
          <FormField label={t.address}>
            <input type="text" autoComplete="off" placeholder="Address" value={form.address} onChange={(e) => set("address", e.target.value)} className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none" />
          </FormField>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={onSubmit}>{editing ? t.save : t.add}</Button>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>{t.cancel}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
