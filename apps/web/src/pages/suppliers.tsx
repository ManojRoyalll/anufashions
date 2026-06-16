import { useEffect, useState } from "react";
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
import { useLang } from "@/hooks/use-lang";

type Supplier = { id: string; name: string; phone?: string; email?: string; address?: string; productsSupplied?: string };

const empty = () => ({ supplierName: "", phone: "", email: "", address: "", productsSupplied: "" });

export default function SuppliersPage() {
  const { t } = useLang();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(empty());
  const [err, setErr] = useState("");
  const { show } = useToastStore();

  const load = () => api.get("/suppliers").then((r) => setSuppliers(r.data));
  useEffect(() => { load(); }, []);

  const set = (field: string, val: string) => {
    setForm((f) => ({ ...f, [field]: val }));
    if (field === "supplierName") setErr("");
  };

  const openAdd = () => { setEditing(null); setForm(empty()); setErr(""); setModalOpen(true); };
  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({ supplierName: s.name, phone: s.phone ?? "", email: s.email ?? "", address: s.address ?? "", productsSupplied: s.productsSupplied ?? "" });
    setErr("");
    setModalOpen(true);
  };

  const onSubmit = async () => {
    if (!form.supplierName.trim() || form.supplierName.trim().length < 2) {
      setErr("Name is required (at least 2 characters)");
      return;
    }
    if (form.phone.trim() && !/^\d{10}$/.test(form.phone.trim())) {
      setErr("Phone must be exactly 10 digits");
      return;
    }
    try {
      const payload = { name: form.supplierName.trim(), phone: form.phone || undefined, email: form.email || undefined, address: form.address || undefined, productsSupplied: form.productsSupplied || undefined };
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
    { key: "name", label: t.name, sortable: true, sticky: true },
    { key: "phone", label: t.phone },
    { key: "email", label: t.email },
    { key: "address", label: t.address },
    { key: "productsSupplied", label: t.itemsSupplied },
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
        <div className="space-y-4">
          <FormField label={t.name} required error={err}>
            <input
              type="text"
              autoComplete="off"
              placeholder="Supplier name"
              value={form.supplierName}
              onChange={(e) => set("supplierName", e.target.value)}
              className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label={t.phone} error={form.phone && !/^\d{10}$/.test(form.phone.trim()) ? "Enter 10-digit mobile number" : undefined}>
              <input type="tel" autoComplete="off" placeholder="9876543210" maxLength={10} value={form.phone} onChange={(e) => { set("phone", e.target.value.replace(/\D/g, "")); setErr(""); }} className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none" />
            </FormField>
            <FormField label={t.email}>
              <input type="text" autoComplete="off" placeholder="email@example.com" value={form.email} onChange={(e) => set("email", e.target.value)} className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none" />
            </FormField>
          </div>
          <FormField label={t.address}>
            <Textarea placeholder="Address" value={form.address} onChange={(e) => set("address", e.target.value)} />
          </FormField>
          <FormField label={t.productsSupplied}>
            <input type="text" autoComplete="off" placeholder="e.g. Sarees, Suits" value={form.productsSupplied} onChange={(e) => set("productsSupplied", e.target.value)} className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none" />
          </FormField>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={onSubmit}>{editing ? t.save : t.addSupplier}</Button>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>{t.cancel}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
