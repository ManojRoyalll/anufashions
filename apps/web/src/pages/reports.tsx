import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { useLang } from "@/hooks/use-lang";

export default function ReportsPage() {
  const { t } = useLang();

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
        <h2 className="text-xl font-bold">{t.businessReports}</h2>
        <div className="grid gap-2 md:grid-cols-3">
          <Button onClick={() => download("/reports/sales.csv", "sales-report.csv")}>{t.salesCsv}</Button>
          <Button onClick={() => download("/reports/inventory.xlsx", "inventory-report.xlsx")}>{t.inventoryExcel}</Button>
          <Button onClick={() => download("/reports/summary.pdf", "business-summary.pdf")}>{t.summaryPdf}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
