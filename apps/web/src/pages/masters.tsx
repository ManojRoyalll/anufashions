import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";

export default function MastersPage({ mode }: { mode: "customers" | "suppliers" }) {
  const [list, setList] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const endpoint = mode === "customers" ? "/customers" : "/suppliers";

  const load = () => api.get(endpoint).then((r) => setList(r.data));

  useEffect(() => {
    load();
  }, [mode]);

  const submit = async () => {
    await api.post(endpoint, {
      name,
      phone,
      address
    });
    setName("");
    setPhone("");
    setAddress("");
    load();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
          <Button onClick={submit}>Add {mode === "customers" ? "Customer" : "Supplier"}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h3 className="mb-3 font-semibold">{mode === "customers" ? "Customer" : "Supplier"} List</h3>
          <div className="space-y-2">
            {list.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-slate-600">{item.phone || "-"} | {item.address || "-"}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
