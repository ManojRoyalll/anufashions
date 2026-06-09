"use client";

import { ResponsiveContainer, LineChart, Line, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent } from "@/components/ui/card";

export function AnalyticsChart({ title, data }: { title: string; data: Array<{ label: string; value: number }> }) {
  return (
    <Card>
      <CardContent>
        <h3 className="mb-4 text-base font-semibold">{title}</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="4 4" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#7f8a44" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
