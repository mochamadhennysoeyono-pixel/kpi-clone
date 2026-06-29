// src/components/holding/group-status-distribution-chart.tsx
"use client";

import { useMemo } from "react";
import { Pie, PieChart, ResponsiveContainer, Cell, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { ChartContainer, ChartTooltipContent } from "../ui/chart";

interface GroupStatusDistributionChartProps {
    performanceData: {
        exceedsTarget: number;
        achievesTarget: number;
        needsImprovement: number;
    };
}

const chartConfig = {
  "Melampaui Target": {
    label: "Melampaui Target",
    color: "hsl(var(--chart-2))",
  },
  "Mencapai Target": {
    label: "Mencapai Target",
    color: "hsl(var(--chart-1))",
  },
  "Perlu Peningkatan": {
    label: "Perlu Peningkatan",
    color: "hsl(var(--chart-5))",
  },
};

export default function GroupStatusDistributionChart({ performanceData }: GroupStatusDistributionChartProps) {
  const chartData = useMemo(() => {
    return [
      { name: 'Melampaui Target', value: performanceData.exceedsTarget, fill: chartConfig['Melampaui Target'].color },
      { name: 'Mencapai Target', value: performanceData.achievesTarget, fill: chartConfig['Mencapai Target'].color },
      { name: 'Perlu Peningkatan', value: performanceData.needsImprovement, fill: chartConfig['Perlu Peningkatan'].color },
    ].filter(item => item.value > 0);
  }, [performanceData]);

  const total = useMemo(() => chartData.reduce((acc, curr) => acc + curr.value, 0), [chartData]);
  if (total === 0) {
      return (
        <Card className="shadow-lg h-full">
            <CardHeader>
                <CardTitle>Distribusi Status Kinerja</CardTitle>
                <CardDescription className="text-muted-foreground">Persentase karyawan berdasarkan status kinerja.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center h-[350px]">
                <p className="text-muted-foreground">Tidak ada data untuk ditampilkan.</p>
            </CardContent>
        </Card>
      );
  }

  return (
    <Card className="shadow-lg h-full">
      <CardHeader>
        <CardTitle>Distribusi Status Kinerja</CardTitle>
        <CardDescription className="text-muted-foreground">Persentase karyawan berdasarkan status kinerja di seluruh grup.</CardDescription>
      </CardHeader>
      <CardContent className="h-[350px]">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square h-full">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={60}
                labelLine={false}
                label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                  const x = cx + (radius + 15) * Math.cos(-midAngle * (Math.PI / 180));
                  const y = cy + (radius + 15) * Math.sin(-midAngle * (Math.PI / 180));
                  return (
                    <text
                      x={x}
                      y={y}
                      fill="currentColor"
                      className="text-xs fill-foreground"
                      textAnchor={x > cx ? "start" : "end"}
                      dominantBaseline="central"
                    >
                      {`${(percent * 100).toFixed(0)}%`}
                    </text>
                  );
                }}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Legend content={({ payload }) => (
                <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-4">
                  {payload?.map((entry, index) => (
                    <li key={`item-${index}`} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-sm text-muted-foreground">{entry.value} ({entry.payload.value})</span>
                    </li>
                  ))}
                </ul>
              )} />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
