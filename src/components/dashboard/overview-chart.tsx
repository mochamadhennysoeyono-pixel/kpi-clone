// src/components/dashboard/overview-chart.tsx
"use client";

import React, { type ReactNode } from "react";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { ChartContainer, ChartTooltipContent } from "../ui/chart";
import type { CompanyPerformance } from "@/app/(main)/dashboard/page";
import { format, parse } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface OverviewChartProps {
  performanceData: CompanyPerformance[];
  period: string | null;
  availablePeriods: string[];
  onPeriodChange: (period: string | null) => void;
  companyFilter: 'all' | 'holding' | 'standalone';
  onCompanyFilterChange: (filter: 'all' | 'holding' | 'standalone') => void;
}

const chartConfig = {
  averageScore: {
    label: "Rata-rata Skor",
  },
};

const chartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];


export default function OverviewChart({
  performanceData,
  period,
  availablePeriods,
  onPeriodChange,
  companyFilter,
  onCompanyFilterChange
}: OverviewChartProps) {
  const chartData = performanceData.map(item => ({
    company: item.companyName,
    averageScore: item.averageScore.toFixed(1)
  })).reverse(); // Reverse to have the highest score at the top
  
  const formattedPeriod = period ? format(parse(period, "yyyy-MM", new Date()), "LLLL yyyy", { locale: localeId }) : 'periode terpilih';

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Perbandingan Kinerja Klien</CardTitle>
              <CardDescription className="text-muted-foreground">
                  Rata-rata skor KPI untuk setiap klien pada {formattedPeriod}
              </CardDescription>
            </div>
             <div className="flex flex-col sm:flex-row gap-2 self-start sm:self-center">
                  <Select value={period ?? ""} onValueChange={onPeriodChange}>
                      <SelectTrigger className="w-full sm:w-[200px]">
                          <SelectValue placeholder="Pilih Periode" />
                      </SelectTrigger>
                      <SelectContent>
                          {availablePeriods.map(p => (
                              <SelectItem key={p} value={p}>
                                  {format(parse(p, "yyyy-MM", new Date()), "LLLL yyyy", {locale: localeId})}
                              </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
                  <Select value={companyFilter} onValueChange={(value) => onCompanyFilterChange(value as any)}>
                      <SelectTrigger className="w-full sm:w-[200px]">
                          <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">Tampilkan Semua</SelectItem>
                          <SelectItem value="holding">Hanya Holding & Anak</SelectItem>
                          <SelectItem value="standalone">Hanya Mandiri</SelectItem>
                      </SelectContent>
                  </Select>
              </div>
          </div>
      </CardHeader>
      <CardContent>
        {performanceData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30, bottom: 5 }}>
                 <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <YAxis 
                    dataKey="company" 
                    type="category"
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={10} 
                    fontSize={12}
                    width={120}
                    interval={0}
                />
                <XAxis dataKey="averageScore" type="number" domain={[0, 100]} tickMargin={10} fontSize={12} />
                <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    content={<ChartTooltipContent indicator="dot" />} 
                />
                <Bar dataKey="averageScore" radius={4}>
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
            <div className="flex items-center justify-center h-[350px]">
                <p className="text-muted-foreground text-sm">Tidak ada data kinerja untuk ditampilkan pada periode ini.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
