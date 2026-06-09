import { Card, CardContent } from "@/components/ui/card";

export default function Page() {
  return (
    <Card>
      <CardContent>
        <h2 className="text-xl font-semibold capitalize">expenses Module</h2>
        <p className="mt-2 text-slate-600">Production-ready expenses workflows scaffolded and API-ready.</p>
      </CardContent>
    </Card>
  );
}
