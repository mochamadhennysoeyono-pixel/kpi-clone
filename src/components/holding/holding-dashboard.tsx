// src/components/holding/holding-dashboard.tsx
"use client";

import { useMemo, useState, useEffect } from 'react';
import type { Company, KpiData } from '@/types';
import { useMasterData } from '@/contexts/master-data-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { format, parse } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Users, Building, TrendingUp, TrendingDown, BarChartBig, Calendar, LayoutGrid } from 'lucide-react';
import GroupPerformanceComparisonChart from './group-performance-comparison-chart';
import GroupPerformanceTable from './group-performance-table';
import GroupPerformanceTrendChart from './group-performance-trend-chart';
import GroupStatusDistributionChart from './group-status-distribution-chart';
import { AdaptiveCardGrid, AdaptiveMetricCard, AdaptiveInsightCard } from '../ui/adaptive-card';

interface HoldingDashboardProps {
  holdingCompany: Company;
  childCompanies: Company[];
}

export type GroupPerformanceData = {
    companyId: string;
    companyName: string;
    averageScore: number;
    employeeCount: number;
    achievedCount: number;
    needsImprovementCount: number;
};

export default function HoldingDashboard({ holdingCompany, childCompanies }: HoldingDashboardProps) {
  const { kpiData } = useMasterData();
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);

  const availablePeriods = useMemo(() => {
    const childCompanyNames = childCompanies.map(c => c.name);
    return [...new Set(kpiData
        .filter(d => childCompanyNames.includes(d.company) && d.period)
        .map(d => d.period))]
        .sort((a,b) => b.localeCompare(a));
  }, [kpiData, childCompanies]);

  useEffect(() => {
    if (availablePeriods.length > 0 && !selectedPeriod) {
        setSelectedPeriod(availablePeriods[0]);
    }
  }, [availablePeriods, selectedPeriod]);

  const performanceForPeriod = useMemo(() => {
    if (!selectedPeriod) return [];
     const childCompanyNames = childCompanies.map(c => c.name);
     return kpiData.filter(d => childCompanyNames.includes(d.company) && d.period === selectedPeriod);
  }, [selectedPeriod, childCompanies, kpiData]);


  const groupPerformanceData = useMemo((): GroupPerformanceData[] => {
    if (performanceForPeriod.length === 0) return [];
    
    return childCompanies.map(company => {
        const companyData = performanceForPeriod.filter(d => d.company === company.name);
        if (companyData.length === 0) {
            return { companyId: company.id, companyName: company.name, averageScore: 0, employeeCount: 0, achievedCount: 0, needsImprovementCount: 0 };
        }

        const totalScore = companyData.reduce((sum, d) => sum + d.score, 0);
        const averageScore = totalScore / companyData.length;
        const achievedCount = companyData.filter(d => d.status === 'Mencapai Target' || d.status === 'Melampaui Target').length;

        return {
            companyId: company.id,
            companyName: company.name,
            averageScore: parseFloat(averageScore.toFixed(1)),
            employeeCount: companyData.length,
            achievedCount: achievedCount,
            needsImprovementCount: companyData.length - achievedCount,
        };
    }).sort((a, b) => b.averageScore - a.averageScore);

  }, [performanceForPeriod, childCompanies]);

  const aggregateStats = useMemo(() => {
    if (performanceForPeriod.length === 0) {
      return {
        totalEmployees: 0,
        groupAverageScore: 0,
        exceedsTarget: 0,
        achievesTarget: 0,
        needsImprovement: 0,
      };
    }
    
    const totalScore = performanceForPeriod.reduce((sum, d) => sum + d.score, 0);
    const groupAverageScore = totalScore / performanceForPeriod.length;

    const statusCounts = performanceForPeriod.reduce((acc, d) => {
        if (d.status === 'Melampaui Target') acc.exceedsTarget++;
        else if (d.status === 'Mencapai Target') acc.achievesTarget++;
        else if (d.status === 'Perlu Peningkatan') acc.needsImprovement++;
        return acc;
    }, { exceedsTarget: 0, achievesTarget: 0, needsImprovement: 0 });

    return {
        totalEmployees: performanceForPeriod.length,
        groupAverageScore: parseFloat(groupAverageScore.toFixed(1)),
        ...statusCounts,
    }

  }, [performanceForPeriod]);

  const topPerformer = groupPerformanceData[0] || null;
  const bottomPerformer = groupPerformanceData[groupPerformanceData.length - 1] || null;

  return (
    <div className="space-y-6 sm:space-y-10">
        <div className="flex justify-end p-1 border-b border-border/40 pb-4">
             <div className="flex items-center gap-3">
                <Calendar className="size-4 text-muted-foreground" />
                <Select value={selectedPeriod ?? ""} onValueChange={setSelectedPeriod} disabled={availablePeriods.length === 0}>
                    <SelectTrigger className="w-[180px] h-9 text-xs font-bold border-none bg-muted/30">
                        <SelectValue placeholder="Pilih Periode" />
                    </SelectTrigger>
                    <SelectContent className="z-[350]">
                        {availablePeriods.map(period => (
                            <SelectItem key={period} value={period}>
                                {format(parse(period, "yyyy-MM", new Date()), "MMMM yyyy", { locale: localeId })}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
             </div>
        </div>
        
        {availablePeriods.length === 0 ? (
          <div className="text-center text-muted-foreground py-24 border-2 border-dashed rounded-3xl bg-muted/5">
            <p className="font-bold uppercase text-xs tracking-widest">Data Kinerja Grup Kosong</p>
            <p className="text-xs mt-1">Belum ada laporan KPI yang masuk dari unit bisnis.</p>
          </div>
        ) : (
        <>
            <AdaptiveCardGrid complexity="simple">
                <AdaptiveMetricCard
                    title="Anak Perusahaan"
                    value={childCompanies.length}
                    icon={Building}
                    color="bg-blue-500/10 text-blue-600"
                />
                <AdaptiveMetricCard
                    title="Total Personil"
                    value={aggregateStats.totalEmployees}
                    icon={Users}
                    color="bg-emerald-500/10 text-emerald-600"
                />
                 <AdaptiveMetricCard
                    title="Rata-rata Skor"
                    value={aggregateStats.groupAverageScore}
                    icon={BarChartBig}
                    color="bg-purple-500/10 text-purple-600"
                />
                <AdaptiveMetricCard
                    title="Best Performer"
                    value={topPerformer?.averageScore || 0}
                    badge={topPerformer?.companyName}
                    icon={TrendingUp}
                    color="bg-amber-500/10 text-amber-600"
                />
                <AdaptiveMetricCard
                    title="Low Performer"
                    value={bottomPerformer?.averageScore || 0}
                    badge={bottomPerformer?.companyName}
                    icon={TrendingDown}
                    color="bg-rose-500/10 text-rose-600"
                />
            </AdaptiveCardGrid>
            
            <AdaptiveCardGrid complexity="complex">
                <AdaptiveInsightCard 
                    title="Historis Tren Grup" 
                    icon={TrendingUp}
                    description="Perjalanan skor kumulatif antar unit bisnis"
                >
                    <div className="h-[350px]">
                        <GroupPerformanceTrendChart childCompanies={childCompanies} />
                    </div>
                </AdaptiveInsightCard>

                <AdaptiveInsightCard 
                    title="Sebaran Status Karyawan" 
                    icon={LayoutGrid}
                    description="Distribusi pencapaian target di seluruh grup"
                >
                    <div className="h-[350px]">
                        <GroupStatusDistributionChart performanceData={aggregateStats} />
                    </div>
                </AdaptiveInsightCard>
            </AdaptiveCardGrid>

            <AdaptiveCardGrid complexity="medium">
                <div className="md:col-span-2 lg:col-span-2">
                    <AdaptiveInsightCard title="Analisa Komparasi Unit" icon={BarChartBig} description="Rasio pencapaian antar anak perusahaan">
                         <div className="h-[350px]">
                            <GroupPerformanceComparisonChart performanceData={groupPerformanceData} />
                         </div>
                    </AdaptiveInsightCard>
                </div>
                <div className="md:col-span-2 lg:col-span-2">
                    <AdaptiveInsightCard title="Leaderboard Bisnis" icon={TrendingUp} description="Peringkat berdasarkan skor rata-rata">
                        <GroupPerformanceTable performanceData={groupPerformanceData} />
                    </AdaptiveInsightCard>
                </div>
            </AdaptiveCardGrid>
        </>
        )}
    </div>
  );
}
