// src/components/reports/team-performance-trend-chart.tsx
"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
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
import { useIsMobile } from "@/hooks/use-mobile";

interface TeamPerformanceTrendChartProps {
    chartData: any[];
}

const chartConfig = {
    "Rata-rata Skor": {
        label: "Rata-rata Skor", 
        color: "hsl(var(--chart-1))",
    },
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="p-2 text-xs bg-background/90 border rounded-md shadow-lg">
                <p className="font-bold text-sm mb-2">{label}</p>
                <p className="text-primary font-semibold">
                    Progres Kumulatif Tim: <span className="font-bold">{data.cumulativeProgress}%</span>
                </p>
                {data.contributions && data.contributions.length > 0 && (
                    <div className="mt-2 pt-2 border-t">
                        <p className="font-semibold text-muted-foreground mb-1">Kontribusi Bulan Ini:</p>
                        <ul className="space-y-1">
                            {data.contributions.map((c: any, i: number) => (
                                <li key={i} className="flex justify-between gap-4">
                                    <span className="text-muted-foreground">{c.name}:</span>
                                    <span className="font-semibold">{c.actual.toLocaleString('id-ID')}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
    }
    return null;
};


export default function TeamPerformanceTrendChart({ chartData }: TeamPerformanceTrendChartProps) {
  const isMobile = useIsMobile();
  
  const finalChartDataForRender = useMemo(() => {
    if (!chartData) {
        return [];
    }
    // If only one data point exists, duplicate it to draw a line.
    if (chartData.length === 1) {
      return [chartData[0], { ...chartData[0], periodLabel: `${chartData[0].periodLabel} ` }];
    }
    return chartData;
  }, [chartData]);
  
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline">Perjalanan Kinerja Tim</CardTitle>
        <CardDescription className="text-muted-foreground">
          Tren skor KPI rata-rata untuk tim yang difilter.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
            {finalChartDataForRender && finalChartDataForRender.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <ChartContainer config={chartConfig} className="w-full h-full">
                    <AreaChart
                        data={finalChartDataForRender}
                        margin={{
                            top: 5,
                            right: isMobile ? 5 : 20,
                            left: isMobile ? -25 : -10,
                            bottom: 5,
                        }}
                        >
                        <defs>
                            <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={chartConfig["Rata-rata Skor"].color} stopOpacity={0.8}/>
                                <stop offset="95%" stopColor={chartConfig["Rata-rata Skor"].color} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="periodLabel" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} interval="preserveStartEnd" />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} width={isMobile ? 35: 40} fontSize={12} domain={[0, 100]} />
                        <Tooltip content={finalChartDataForRender[0]?.contributions ? <CustomTooltip /> : <ChartTooltipContent indicator="dot" />} />
                        <Area
                            key="Rata-rata Skor"
                            type="monotone"
                            dataKey="Rata-rata Skor"
                            stroke={chartConfig["Rata-rata Skor"].color}
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorGradient)"
                            dot={{
                                fill: chartConfig["Rata-rata Skor"].color,
                                r: 4
                            }}
                            activeDot={{
                                r: 6,
                            }}
                        />
                    </AreaChart>
                    </ChartContainer>
                </ResponsiveContainer>
            ) : (
                <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground text-sm text-center">
                        Tidak ada data historis yang cukup untuk menampilkan tren.
                    </p>
                </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
