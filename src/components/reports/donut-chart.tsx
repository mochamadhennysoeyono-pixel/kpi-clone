// src/components/reports/donut-chart.tsx
"use client";

import { useMemo } from "react";
import { Pie, PieChart, ResponsiveContainer, Cell } from "recharts";
import {
  ChartContainer,
} from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

interface DonutChartProps {
    data: {
        exceeds: number;
        achieves: number;
        needs: number;
    };
}

const chartConfig = {
  exceeds: {
    label: "Sangat Baik",
    color: "hsl(var(--chart-2))",
  },
  achieves: {
    label: "Baik",
    color: "hsl(var(--chart-1))",
  },
  needs: {
    label: "Perlu Peningkatan",
    color: "hsl(var(--chart-5))",
  },
};

export function DonutChart({ data }: DonutChartProps) {
  const chartData = useMemo(() => {
    return [
      { name: 'exceeds', value: data.exceeds, fill: chartConfig.exceeds.color },
      { name: 'achieves', value: data.achieves, fill: chartConfig.achieves.color },
      { name: 'needs', value: data.needs, fill: chartConfig.needs.color },
    ].filter(item => item.value > 0);
  }, [data]);
  
  const total = useMemo(() => chartData.reduce((acc, curr) => acc + curr.value, 0), [chartData]);
  
  if (total === 0) {
      return (
        <div className="flex items-center justify-center h-full min-h-[250px]">
            <p className="text-muted-foreground text-sm">Tidak ada data untuk ditampilkan.</p>
        </div>
      );
  }

  return (
    <div className="w-full h-full min-h-[250px] flex flex-col sm:flex-row items-center justify-center gap-4">
      <div className="w-1/2 h-full">
         <ChartContainer config={chartConfig} className="w-full aspect-square">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={0} // Make it a solid pie chart
                strokeWidth={2}
                 label={({
                    cx,
                    cy,
                    midAngle,
                    innerRadius,
                    outerRadius,
                    value,
                    percent,
                }) => {
                    const RADIAN = Math.PI / 180
                    const radius = (innerRadius || 0) + (outerRadius - (innerRadius || 0)) * 0.5
                    const x = cx + radius * Math.cos(-midAngle * RADIAN)
                    const y = cy + radius * Math.sin(-midAngle * RADIAN)
        
                    return (
                        <text
                        x={x}
                        y={y}
                        className="fill-white text-xs"
                        textAnchor={x > cx ? "start" : "end"}
                        dominantBaseline="central"
                        >
                        {`${(percent * 100).toFixed(0)}%`}
                        </text>
                    )
                }}
                labelLine={false}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} stroke={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      <div className="w-1/2 flex flex-col justify-center gap-4 border-l pl-6">
        {chartData.map((entry) => (
          <div key={entry.name} className="flex items-start gap-2">
            <span className="h-3.5 w-3.5 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: entry.fill }} />
            <div>
              <p className="text-sm font-medium text-muted-foreground">{chartConfig[entry.name as keyof typeof chartConfig].label}</p>
              <p className="font-bold text-lg">{entry.value}</p>
            </div>
          </div>
        ))}
         <div className="border-t pt-2 mt-2">
              <p className="text-sm font-medium text-muted-foreground">Total Karyawan</p>
              <p className="font-bold text-lg">{total}</p>
        </div>
      </div>
    </div>
  );
}