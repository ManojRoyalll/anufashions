import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inr } from "@/lib/utils";
import { useToastStore } from "@/store/toast";

const types = ["RENT", "ELECTRICITY", "TRANSPORT", "MARKETING", "SALARY", "PACKAGING", "MISC"];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [type, setType] = useState("RENT");
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("");
  const { show } = useToastStore();

  const load = () => api.get("/expenses").then((r) => setExpenses(r.data));

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    try {
      await api.post("/expenses", {
        date: new Date().toISOString(),
        type,
        amount,
        description
      });
      setAmount(0);
      setDescription("");
      load();
      show("Expense added");
    } catch {
      show("Failed to add expense", "error");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <select className="h-10 rounded-xl border border-brand-200 bg-white/80 px-3 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <Input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          <Input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Button onClick={submit}>Add Expense</Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h3 className="mb-3 font-semibold">Expense Register</h3>
          <div className="space-y-2">
            {expenses.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{expense.type}</p>
                  <p className="text-xs text-slate-600">{new Date(expense.date).toLocaleDateString()} | {expense.description || "-"}</p>
                </div>
                <p className="font-semibold">{inr(expense.amount)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
