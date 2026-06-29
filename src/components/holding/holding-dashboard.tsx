// src/components/holding/holding-dashboard.tsx
"use client";

import { useMemo, useState, useEffect } from 'react';
import type { Company, KpiData } from '@/types';
import { useMasterData } from '@/contexts/master-data-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { format, parse } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import StatCard from '../dashboard/stat-card';
import { Users, Building, TrendingUp, TrendingDown, BarChartBig, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import GroupPerformanceComparisonChart from './group-performance-comparison-chart';
import GroupPerformanceTable from './group-performance-table';
import GroupPerformanceTrendChart from './group-performance-trend-chart';
import GroupStatusDistributionChart from './group-status-distribution-chart';

interface HoldingDashboardProps {
  holdingCompany: Company;
  childCompanies: Company[];
}

export type GroupPerformanceData = {
    companyId: string;
    companyName: string;
    averageScore: number;
    employeeCount: number;
    achievedCount: number; // Melampaui + Mencapai
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
    <div className="space-y-6">
        <div className="flex justify-end">
             <Select value={selectedPeriod ?? ""} onValueChange={setSelectedPeriod} disabled={availablePeriods.length === 0}>
                <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Pilih Periode" />
                </SelectTrigger>
                <SelectContent>
                    {availablePeriods.map(period => (
                        <SelectItem key={period} value={period}>
                            {format(parse(period, "yyyy-MM", new Date()), "LLLL yyyy", { locale: localeId })}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
        
        {availablePeriods.length === 0 ? (
          <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-lg">
            <p>Tidak ada data kinerja yang ditemukan untuk grup perusahaan Anda.</p>
          </div>
        ) : (
        <>
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <StatCard
                    title="Total Grup"
                    value={childCompanies.length.toString()}
                    icon={Building}
                    description="Jumlah anak perusahaan aktif"
                    iconColor="text-blue-500"
                />
                <StatCard
                    title="Total Karyawan"
                    value={aggregateStats.totalEmployees.toString()}
                    icon={Users}
                    description="Di semua grup pada periode ini"
                    iconColor="text-green-500"
                />
                 <StatCard
                    title="Rata-Rata Skor Grup"
                    value={aggregateStats.groupAverageScore.toString()}
                    icon={BarChartBig}
                    description="Skor rata-rata seluruh karyawan"
                    iconColor="text-purple-500"
                />
                <StatCard
                    title="Performa Terbaik"
                    value={topPerformer?.companyName || "N/A"}
                    icon={TrendingUp}
                    description={`Skor Rata-rata: ${topPerformer?.averageScore.toFixed(1) || 'N/A'}`}
                    iconColor="text-yellow-500"
                />
                <StatCard
                    title="Performa Terendah"
                    value={bottomPerformer?.companyName || "N/A"}
                    icon={TrendingDown}
                    description={`Skor Rata-rata: ${bottomPerformer?.averageScore.toFixed(1) || 'N/A'}`}
                    iconColor="text-red-500"
                />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3">
                    <GroupPerformanceTrendChart childCompanies={childCompanies} />
                </div>
                <div className="lg:col-span-2">
                    <GroupStatusDistributionChart performanceData={aggregateStats} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3">
                    <GroupPerformanceComparisonChart performanceData={groupPerformanceData} />
                </div>
                <div className="lg:col-span-2">
                    <GroupPerformanceTable performanceData={groupPerformanceData} />
                </div>
            </div>
        </>
        )}
    </div>
  );
}
