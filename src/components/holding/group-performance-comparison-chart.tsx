// src/components/holding/group-performance-comparison-chart.tsx
"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { ChartContainer, ChartTooltipContent } from "../ui/chart";
import type { GroupPerformanceData } from './holding-dashboard';

interface GroupPerformanceComparisonChartProps {
    performanceData: GroupPerformanceData[];
}

export default function GroupPerformanceComparisonChart({ performanceData }: GroupPerformanceComparisonChartProps) {
  const chartConfig = {
    averageScore: {
      label: "Rata-rata Skor",
      color: "hsl(var(--chart-1))",
    },
  };
  
  const chartData = performanceData.map(item => ({
    company: item.companyName,
    averageScore: item.averageScore
  }));

  return (
    <Card className="shadow-lg h-full">
      <CardHeader>
        <CardTitle>Perbandingan Kinerja Grup</CardTitle>
        <CardDescription className="text-muted-foreground">Rata-rata skor KPI untuk setiap anak perusahaan.</CardDescription>
      </CardHeader>
      <CardContent className="h-[350px]">
        {chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer>
              <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <YAxis
                  dataKey="company"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  fontSize={12}
                  width={100}
                />
                <XAxis dataKey="averageScore" type="number" domain={[0, 100]} hide />
                <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted))' }} 
                    content={<ChartTooltipContent indicator="dot" />} 
                />
                <Bar dataKey="averageScore" radius={4} fill="var(--color-averageScore)">
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground text-sm">Tidak ada data untuk ditampilkan.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
