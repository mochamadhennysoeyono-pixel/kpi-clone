// src/components/reports/performance-trend-chart.tsx
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
import { format, parse } from "date-fns";
import { id } from "date-fns/locale";
import {
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { KpiData } from "@/types";

interface PerformanceTrendChartProps {
  data: KpiData[];
}

const chartConfig = {
  score: {
    label: "Skor KPI",
    color: "hsl(var(--chart-1))",
  },
};

export function PerformanceTrendChart({ data }: PerformanceTrendChartProps) {
  const chartData = useMemo(() => {
    return data
      .sort((a, b) => a.period.localeCompare(b.period))
      .map(d => ({
      period: format(parse(d.period, "yyyy-MM", new Date()), "MMM yy", { locale: id }),
      score: d.score,
    }));
  }, [data]);

  return (
    <ChartContainer config={chartConfig} className="h-full w-full" id="kpi-trend-chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{
            top: 5,
            right: 20,
            left: -10,
            bottom: 5,
          }}
        >
          <defs>
            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartConfig.score.color} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={chartConfig.score.color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} fontSize={10} />
          <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tickMargin={8} fontSize={10} />
          <Tooltip content={<ChartTooltipContent />} />
          <Area
            type="monotone"
            dataKey="score"
            stroke={chartConfig.score.color}
            strokeWidth={2.5}
            fillOpacity={1} 
            fill="url(#colorScore)"
            dot={{
              fill: chartConfig.score.color,
              r: 3,
            }}
            activeDot={{
              r: 6,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
