// src/components/reports/kpi-performance-chart.tsx
"use client";

import { useMemo } from "react";
import { Pie, PieChart, ResponsiveContainer, Cell, Legend, Tooltip } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { KpiData } from "@/types";

interface KpiPerformanceChartProps {
  data: KpiData[];
  period: string;
}

const chartConfig = {
  count: {
    label: "Karyawan",
  },
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

export function KpiPerformanceChart({ data, period }: KpiPerformanceChartProps) {
  const performanceData = useMemo(() => {
    const statusCounts: { [key: string]: number } = {
      "Melampaui Target": 0,
      "Mencapai Target": 0,
      "Perlu Peningkatan": 0,
    };
    data.forEach(item => {
      if (item.status in statusCounts) {
        statusCounts[item.status]++;
      }
    });
    return Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      fill: `var(--color-${status.replace(/ /g, '')})`,
    })).filter(item => item.count > 0);
  }, [data]);

  const typedChartConfig = chartConfig as Record<string, { label: string; color: string }>;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline">Distribusi Kinerja KPI</CardTitle>
        <CardDescription className="text-muted-foreground">
          Distribusi status kinerja karyawan untuk periode {period}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {performanceData.length > 0 ? (
          <ChartContainer
            config={typedChartConfig}
            className="mx-auto aspect-square h-[250px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel nameKey="status" />}
                />
                <Pie
                  data={performanceData}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  labelLine={false}
                  label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                    return (
                      <text
                        x={x}
                        y={y}
                        fill="white"
                        textAnchor={x > cx ? "start" : "end"}
                        dominantBaseline="central"
                        className="text-xs font-bold"
                      >
                        {`${(percent * 100).toFixed(0)}%`}
                      </text>
                    );
                  }}
                >
                  {performanceData.map((entry) => (
                    <Cell key={entry.status} fill={typedChartConfig[entry.status as keyof typeof typedChartConfig].color} />
                  ))}
                </Pie>
                <Legend
                  content={({ payload }) => {
                    return (
                      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
                        {payload?.map((entry, index) => (
                          <li key={`item-${index}`} className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-sm text-muted-foreground">{entry.value}</span>
                          </li>
                        ))}
                      </ul>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <div className="flex items-center justify-center h-[315px]">
            <p className="text-muted-foreground text-sm">Tidak ada data untuk ditampilkan di grafik.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
