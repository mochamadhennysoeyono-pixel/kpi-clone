// src/components/holding/group-performance-trend-chart.tsx
"use client";

import { useMemo } from 'react';
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ChartContainer, ChartTooltipContent } from '../ui/chart';
import type { Company } from '@/types';
import { useMasterData } from '@/contexts/master-data-context';
import { format, parse } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface GroupPerformanceTrendChartProps {
    childCompanies: Company[];
}

const chartColors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
];

export default function GroupPerformanceTrendChart({ childCompanies }: GroupPerformanceTrendChartProps) {
    const { kpiData } = useMasterData();

    const { chartData, chartConfig } = useMemo(() => {
        if (!childCompanies || childCompanies.length === 0) {
            return { chartData: [], chartConfig: {} };
        }
        
        const finalChartConfig = childCompanies.reduce((acc, company, index) => {
            acc[company.name] = {
                label: company.name,
                color: chartColors[index % chartColors.length],
            };
            return acc;
        }, {} as any);

        const dataByPeriodAndCompany: { [period: string]: { [companyName: string]: { totalScore: number; count: number } } } = {};
        const childCompanyNames = childCompanies.map(c => c.name);

        kpiData.forEach(d => {
            if (d.period && childCompanyNames.includes(d.company)) {
                if (!dataByPeriodAndCompany[d.period]) {
                    dataByPeriodAndCompany[d.period] = {};
                }
                if (!dataByPeriodAndCompany[d.period][d.company]) {
                    dataByPeriodAndCompany[d.period][d.company] = { totalScore: 0, count: 0 };
                }
                dataByPeriodAndCompany[d.period][d.company].totalScore += d.score;
                dataByPeriodAndCompany[d.period][d.company].count++;
            }
        });

        const finalChartData = Object.entries(dataByPeriodAndCompany)
            .map(([period, companiesData]) => {
                const entry: { [key: string]: any } = {
                    periodLabel: format(parse(period, "yyyy-MM", new Date()), "MMM yy", { locale: localeId }),
                    date: parse(period, 'yyyy-MM', new Date()),
                };
                childCompanyNames.forEach(name => {
                    const data = companiesData[name];
                    entry[name] = data ? parseFloat((data.totalScore / data.count).toFixed(1)) : null;
                });
                return entry;
            })
            .sort((a,b) => a.date.getTime() - b.date.getTime());


        return { chartData: finalChartData, chartConfig: finalChartConfig };

    }, [kpiData, childCompanies]);


  return (
    <Card className="shadow-lg h-full">
      <CardHeader>
        <CardTitle>Tren Kinerja Grup</CardTitle>
        <CardDescription className="text-muted-foreground">Perjalanan skor rata-rata untuk setiap anak perusahaan dari waktu ke waktu.</CardDescription>
      </CardHeader>
      <CardContent className="h-[350px]">
        {chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ left: -10, right: 20 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="periodLabel"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={12}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={12}
                  domain={[0, 100]}
                />
                <Tooltip content={<ChartTooltipContent indicator="dot" />} />
                <Legend />
                {childCompanies.map((company) => (
                    <Line
                        key={company.id}
                        dataKey={company.name}
                        type="monotone"
                        stroke={chartConfig[company.name]?.color}
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                    />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Tidak cukup data historis untuk menampilkan tren.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
