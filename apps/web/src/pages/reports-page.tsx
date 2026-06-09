import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

export default function ReportsPage() {
  const download = async (path: string, filename: string) => {
    const response = await api.get(path, { responseType: "blob" });
    const blob = new Blob([response.data]);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <Card>
      <CardContent className="space-y-3">
        <h2 className="text-xl font-bold">Business Reports</h2>
        <div className="grid gap-2 md:grid-cols-3">
          <Button onClick={() => download("/reports/sales.csv", "sales-report.csv")}>Sales CSV</Button>
          <Button onClick={() => download("/reports/inventory.xlsx", "inventory-report.xlsx")}>Inventory Excel</Button>
          <Button onClick={() => download("/reports/summary.pdf", "business-summary.pdf")}>Summary PDF</Button>
        </div>
      </CardContent>
    </Card>
  );
}
