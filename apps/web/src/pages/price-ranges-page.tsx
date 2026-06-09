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
  name: z.string().min(1, "Name is required"),
  minPrice: z.coerce.number().nonnegative("Must be 0 or more"),
  maxPrice: z.coerce.number().positive("Must be greater than 0")
}).refine((d) => d.maxPrice > d.minPrice, { message: "Max must be greater than min", path: ["maxPrice"] });
type FormData = z.infer<typeof schema>;

type PriceRange = { id: string; name: string; minPrice: number; maxPrice: number; itemCount: number };

export default function PriceRangesPage() {
  const [ranges, setRanges] = useState<PriceRange[]>([]);
  const [editing, setEditing] = useState<PriceRange | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { show } = useToastStore();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const load = () => api.get("/price-ranges").then((r) => setRanges(r.data));
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); reset({ name: "", minPrice: 0, maxPrice: 0 }); setModalOpen(true); };
  const openEdit = (r: PriceRange) => { setEditing(r); reset({ name: r.name, minPrice: r.minPrice, maxPrice: r.maxPrice }); setModalOpen(true); };

  const onSubmit = async (data: FormData) => {
    try {
      if (editing) {
        await api.put(`/price-ranges/${editing.id}`, data);
        show("Price range updated — products auto-reassigned");
      } else {
        await api.post("/price-ranges", data);
        show("Price range created — products auto-assigned");
      }
      setModalOpen(false);
      load();
    } catch { show("Failed to save price range", "error"); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this price range? Products will be unassigned.")) return;
    try {
      await api.delete(`/price-ranges/${id}`);
      show("Price range deleted");
      load();
    } catch { show("Delete failed", "error"); }
  };

  const columns = [
    { key: "name", label: "Name", sortable: true },
    { key: "minPrice", label: "Min Price", render: (r: PriceRange) => inr(r.minPrice) },
    { key: "maxPrice", label: "Max Price", render: (r: PriceRange) => inr(r.maxPrice) },
    { key: "itemCount", label: "Items", render: (r: PriceRange) => <span className="font-semibold text-brand-700">{r.itemCount}</span> },
    { key: "actions", label: "", render: (r: PriceRange) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(r)}><Pencil className="h-3 w-3" /></Button>
        <Button size="sm" variant="accent" onClick={() => remove(r.id)}><Trash2 className="h-3 w-3" /></Button>
      </div>
    )}
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Price Ranges" subtitle="Define segments — items are auto-assigned by selling price" actions={<Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Range</Button>} />
      <Card><CardContent><DataTable columns={columns} data={ranges} searchable searchPlaceholder="Search ranges..." searchKeys={["name"]} /></CardContent></Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Price Range" : "Add Price Range"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Range Name" required error={errors.name?.message}>
            <Input {...register("name")} placeholder="e.g. Budget, Premium" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Min Price (₹)" required error={errors.minPrice?.message}>
              <Input type="number" min={0} {...register("minPrice")} placeholder="0" />
            </FormField>
            <FormField label="Max Price (₹)" required error={errors.maxPrice?.message}>
              <Input type="number" min={1} {...register("maxPrice")} placeholder="999" />
            </FormField>
          </div>
          <p className="text-xs text-slate-500">All products with selling price in this range will be auto-assigned when saved.</p>
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">{editing ? "Save Changes" : "Create Range"}</Button>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
