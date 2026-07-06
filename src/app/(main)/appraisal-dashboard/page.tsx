
// src/app/(main)/appraisal-dashboard/page.tsx
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { 
    Activity, 
    MoreHorizontal, 
    BarChartBig, 
    Users, 
    TrendingUp, 
    TrendingDown, 
    ArrowRight, 
    Building, 
    Calendar, 
    LayoutGrid 
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';
import type { Employee, AppraisalSetup, Company, OKR } from '@/types';
import { parse, isBefore, format, eachMonthOfInterval, subMonths, startOfMonth, lastDayOfMonth } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useRouter } from 'next/navigation';
import { DonutChart } from '@/components/reports/donut-chart';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import TeamPerformanceTrendChart from '@/components/reports/team-performance-trend-chart';
import { cn } from '@/lib/utils';
import { ResponsivePage, ResponsiveToolbar } from '@/components/ui/adaptive-layout';
import { PageHeader } from '@/components/ui/page-header';
import { AdaptiveCardGrid, AdaptiveMetricCard, AdaptiveInsightCard } from '@/components/ui/adaptive-card';
import { AdaptiveTable } from '@/components/ui/adaptive-table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardNavigator } from '@/components/layout/dashboard-navigator';

interface AppraisalResult {
    subject: Employee;
    kpiScore: number | null;
    kboScore: number | null;
    okrScore: number | null;
    finalScore: number | null;
    status: string;
    averageScore?: number;
    personalTrend?: number;
    isOkrIntegrated?: boolean;
}

const getStatusFromFinalScore = (score: number | null): { status: string; variant: "default" | "secondary" | "destructive" | "outline" } => {
    if (score === null) return { status: 'Belum Lengkap', variant: 'outline' };
    if (score >= 90) return { status: 'Sangat Baik', variant: 'default' };
    if (score >= 70) return { status: 'Baik', variant: 'secondary' };
    return { status: 'Perlu Peningkatan', variant: 'destructive' };
};

const getTrendIcon = (trend: number) => {
    if (trend > 0.1) return <TrendingUp className="size-4 text-green-500" />;
    if (trend < -0.1) return <TrendingDown className="size-4 text-red-500" />;
    return <ArrowRight className="size-4 text-muted-foreground opacity-30" />;
};

const levelOptions: Employee['level'][] = ['Direktur', 'Manager', 'Supervisor', 'Staff'];

export default function AppraisalDashboardPage() {
    const { currentUser, userRole } = useAuth();
    const { companies, appraisalSetups, employees, kpiData, kboAssessments, kboSetups, okrs } = useMasterData();
    const router = useRouter();

    const [mode, setMode] = useState<'single' | 'trend'>('single');
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
    const [selectedLevel, setSelectedLevel] = useState<string>('all');
    
    const [selectedAppraisalId, setSelectedAppraisalId] = useState<string | null>(null);
    const [trendStartPeriod, setTrendStartPeriod] = useState<string | null>(null);
    const [trendEndPeriod, setTrendEndPeriod] = useState<string | null>(null);

    const userCompany = useMemo(() => companies.find(c => c.name === currentUser?.company), [companies, currentUser]);
    const isHoldingAdmin = useMemo(() => userRole === 'manajemen' && !!userCompany?.isHolding, [userRole, userCompany]);
    const showCompanyFilter = userRole === 'superadmin' || isHoldingAdmin;

    const manageableCompanies = useMemo(() => {
        if (userRole === 'superadmin') return companies.filter(c => c.status === 'Aktif');
        if (isHoldingAdmin && userCompany) {
            const getChildCompanies = (parentId: string): Company[] => {
                const children = companies.filter(c => c.parentId === parentId);
                return [...children, ...children.flatMap(c => getChildCompanies(c.id))];
            };
            return [userCompany, ...getChildCompanies(userCompany.id)];
        }
        return userCompany ? [userCompany] : [];
    }, [userRole, isHoldingAdmin, userCompany, companies]);

    useEffect(() => {
        if (showCompanyFilter && manageableCompanies.length > 0 && selectedCompanyId === 'all') {
            setSelectedCompanyId(manageableCompanies[0].id);
        } else if (!showCompanyFilter && userCompany) {
            setSelectedCompanyId(userCompany.id);
        }
    }, [showCompanyFilter, manageableCompanies, userCompany, selectedCompanyId]);
    
    const availableSetupsForCompany = useMemo(() => {
      if (!selectedCompanyId || selectedCompanyId === 'all') return [];
      const companyName = companies.find(c => c.id === selectedCompanyId)?.name;
      if (!companyName) return [];
      return appraisalSetups.filter(s => s.company === companyName && s.status === 'Aktif').sort((a,b) => (b.period || b.periodStart || '').localeCompare(a.period || a.periodStart || ''));
    }, [selectedCompanyId, appraisalSetups, companies]);

    const allAvailablePeriods = useMemo(() => {
        if (!selectedCompanyId || selectedCompanyId === 'all') return [];
        const companyName = companies.find(c => c.id === selectedCompanyId)?.name;
        if (!companyName) return [];
        return [...new Set(kpiData.filter(d => d.company === companyName).map(d => d.period))].sort((a,b) => b.localeCompare(a));
    }, [kpiData, selectedCompanyId, companies]);

    useEffect(() => {
        if (mode === 'single') {
            if (availableSetupsForCompany.length > 0 && !availableSetupsForCompany.some(s => s.id === selectedAppraisalId)) {
                setSelectedAppraisalId(availableSetupsForCompany[0].id);
            } else if (availableSetupsForCompany.length === 0) {
                setSelectedAppraisalId(null);
            }
        } else if (mode === 'trend') {
             if (allAvailablePeriods.length > 0 && (!trendStartPeriod || !trendEndPeriod)) {
                const sortedPeriods = [...allAvailablePeriods].sort();
                const latestPeriod = sortedPeriods[sortedPeriods.length - 1];
                setTrendEndPeriod(latestPeriod);
                const defaultStart = format(startOfMonth(subMonths(parse(latestPeriod, 'yyyy-MM', new Date()), 2)), 'yyyy-MM');
                setTrendStartPeriod(sortedPeriods.find(p => p >= defaultStart) || sortedPeriods[0]);
             }
        }
    }, [mode, availableSetupsForCompany, selectedAppraisalId, allAvailablePeriods, trendStartPeriod, trendEndPeriod]);

    const selectedAppraisal = useMemo(() => appraisalSetups.find(s => s.id === selectedAppraisalId), [selectedAppraisalId, appraisalSetups]);
    
    const getDateRanges = useCallback(() => {
        if (mode !== 'trend' || !trendStartPeriod || !trendEndPeriod) return { currentPeriods: [], previousPeriods: [] };
        let start = parse(trendStartPeriod, 'yyyy-MM', new Date());
        let end = parse(trendEndPeriod, 'yyyy-MM', new Date());
        if (isBefore(end, start)) [start, end] = [end, start];
        
        const currentPeriods = eachMonthOfInterval({ start, end }).map(d => format(d, 'yyyy-MM'));
        const periodCount = currentPeriods.length;
        const prevEnd = subMonths(start, 1);
        const prevStart = subMonths(start, periodCount);
        const previousPeriods = eachMonthOfInterval({ start: prevStart, end: prevEnd }).map(d => format(d, 'yyyy-MM'));
        
        return { currentPeriods, previousPeriods };
    }, [mode, trendStartPeriod, trendEndPeriod]);


    const { appraisalResults, chartData } = useMemo((): { appraisalResults: AppraisalResult[], chartData: any[] } => {
        if (mode === 'single' && !selectedAppraisal) return { appraisalResults: [], chartData: [] };
        if (mode === 'trend' && (!trendStartPeriod || !trendEndPeriod)) return { appraisalResults: [], chartData: [] };

        let employeeBase = employees;
        if (selectedCompanyId && selectedCompanyId !== 'all') {
            const companyName = companies.find(c => c.id === selectedCompanyId)?.name;
            if (companyName) employeeBase = employeeBase.filter(e => e.company === companyName);
        }
        if (selectedLevel !== 'all') {
            employeeBase = employeeBase.filter(e => e.level === selectedLevel);
        }

        const calculateRelativeProgress = (curr: number, start: number, target: number) => {
            const range = target - start;
            if (range <= 0) return curr >= target ? 100 : 0;
            return Math.max(0, Math.min(((curr - start) / range) * 100, 100));
        };

        const calculateFinalScore = (subject: Employee, appraisal: AppraisalSetup | null): { kpiScore: number | null, kboScore: number | null, okrScore: number | null, finalScore: number | null, isOkrIntegrated: boolean } => {
            if (!appraisal) return { kpiScore: null, kboScore: null, okrScore: null, finalScore: null, isOkrIntegrated: false };
            
            const components = appraisal.componentsByLevel?.[subject.level];
            if (!components) return { kpiScore: null, kboScore: null, okrScore: null, finalScore: null, isOkrIntegrated: false };

            const periodStart = parse(appraisal.periodStart || appraisal.period!, 'yyyy-MM', new Date());
            const periodEnd = lastDayOfMonth(parse(appraisal.periodEnd || appraisal.period!, 'yyyy-MM', new Date()));
            const cycleMonths = eachMonthOfInterval({ start: periodStart, end: periodEnd }).map(d => format(d, 'yyyy-MM'));
            
            const subjectKpiData = kpiData.filter(d => d.employeeId === subject.id && cycleMonths.includes(d.period));
            const kpiScore = subjectKpiData.length > 0 ? subjectKpiData.reduce((sum, d) => sum + d.score, 0) / subjectKpiData.length : null;

            let totalWeightedKboScore = 0;
            let totalEffectiveKboWeight = 0;
            const activeKboCategories = Object.entries(components.kbo || {}).filter(([, cat]) => cat.kboSetupIds && cat.kboSetupIds.length > 0);

            activeKboCategories.forEach(([, kboComponent]) => {
                const kboSetup = kboSetups.find(ks => kboComponent.kboSetupIds?.includes(ks.id));
                if (!kboSetup) return;

                const relevantAssessments = kboAssessments.filter(a => 
                    a.subjectId === subject.id && 
                    a.assessments && 
                    a.assessments[kboSetup.id]
                );
                if (relevantAssessments.length === 0) return;

                const categoryScores = relevantAssessments.map(a => a.assessments[kboSetup.id].totalScore);
                const avgCategoryScore = categoryScores.reduce((sum, score) => sum + score, 0) / categoryScores.length;
                
                totalWeightedKboScore += avgCategoryScore * (kboComponent.weight || 0);
                totalEffectiveKboWeight += (kboComponent.weight || 0);
            });
            const kboScore = totalEffectiveKboWeight > 0 ? (totalWeightedKboScore / totalEffectiveKboWeight) : null;
            
            const subjectOkrs = okrs.filter(okr => 
                okr.status !== 'Draft' && okr.status !== 'Waiting for Approval' &&
                (okr.startDate.toDate() <= periodEnd && okr.endDate.toDate() >= periodStart) && (
                    okr.ownerId === subject.id ||
                    okr.keyResults.some(kr => 
                        kr.ownerId === subject.id ||
                        kr.contributors?.some(c => c.ownerId === subject.id) ||
                        kr.milestones?.some(m => m.ownerId === subject.id) ||
                        kr.checklist?.some(c => c.ownerId === subject.id)
                    )
                )
            );

            const individualOkrScores = subjectOkrs.map(okr => {
                if (okr.ownerId === subject.id) return okr.progress;
                const relevantKrs = okr.keyResults.filter(kr => 
                    kr.ownerId === subject.id ||
                    kr.contributors?.some(c => c.ownerId === subject.id) ||
                    kr.milestones?.some(m => m.ownerId === subject.id) ||
                    kr.checklist?.some(c => c.ownerId === subject.id)
                );
                if (relevantKrs.length === 0) return 0;
                const krProgresses = relevantKrs.map(kr => {
                    if (kr.ownershipModel === 'single_owner' && kr.ownerId === subject.id) return calculateRelativeProgress(kr.currentValue, kr.startValue, kr.targetValue);
                    if (kr.ownershipModel === 'split_ownership') {
                        const contrib = kr.contributors?.find(c => c.ownerId === subject.id);
                        if (contrib) return calculateRelativeProgress(contrib.currentValue, 0, contrib.targetValue);
                    }
                    if (kr.ownershipModel === 'delegated') {
                        const myMilestones = kr.milestones?.filter(m => m.ownerId === subject.id) || [];
                        const myChecklist = kr.checklist?.filter(c => c.ownerId === subject.id) || [];
                        const totalItems = myMilestones.length + myChecklist.length;
                        if (totalItems === 0) return 0;
                        const doneItems = myMilestones.filter(m => m.completed).length + myChecklist.filter(c => c.completed).length;
                        return (doneItems / totalItems) * 100;
                    }
                    return 0;
                });
                return krProgresses.reduce((a, b) => a + b, 0) / krProgresses.length;
            });

            const okrScore = individualOkrScores.length > 0 ? individualOkrScores.reduce((sum, s) => sum + s, 0) / individualOkrScores.length : null;
            const weightOverride = appraisal.individualWeightOverrides?.[subject.id];
            const isOkrIntegrated = !!weightOverride;

            let finalScore: number | null = null;
            if (weightOverride) {
                const kpiContribution = (kpiScore ?? 0) * (weightOverride.kpiWeight / 100);
                const kboContribution = (kboScore ?? 0) * (weightOverride.kboWeight / 100);
                const okrContribution = (okrScore ?? 0) * (weightOverride.okrWeight / 100);
                finalScore = kpiContribution + kboContribution + okrContribution;
            } else {
                const kpiW = (components.kpiWeight ?? 0) / 100;
                const kboW = (components.kboWeight ?? 0) / 100;
                if (kpiScore !== null && kboScore !== null) finalScore = (kpiScore * kpiW) + (kboScore * kboW);
                else if (kpiScore !== null && kboW === 0) finalScore = kpiScore;
                else if (kboScore !== null && kpiW === 0) finalScore = kboScore;
            }

            return { kpiScore, kboScore, okrScore, finalScore, isOkrIntegrated };
        };

        if (mode === 'single') {
            const results = employeeBase.map(subject => {
                const { kpiScore, kboScore, okrScore, finalScore, isOkrIntegrated } = calculateFinalScore(subject, selectedAppraisal);
                return { subject, kpiScore, kboScore, okrScore, finalScore, status: getStatusFromFinalScore(finalScore).status, isOkrIntegrated };
            }).filter(r => r.finalScore !== null);
            return { appraisalResults: results.sort((a,b) => (b.finalScore ?? -1) - (a.finalScore ?? -1)), chartData: [] };
        } else { // Trend mode
            const { currentPeriods, previousPeriods } = getDateRanges();
            const relevantAppraisals = appraisalSetups.filter(s => currentPeriods.some(p => s.periodStart === p || s.period === p));
            const employeeTrendData = new Map<string, { currentScores: number[], previousScores: number[] }>();

            employeeBase.forEach(emp => {
                const data = { currentScores: [] as number[], previousScores: [] as number[] };
                relevantAppraisals.forEach(appraisal => {
                    const { finalScore } = calculateFinalScore(emp, appraisal);
                    if (finalScore !== null) data.currentScores.push(finalScore);
                });
                const prevAppraisals = appraisalSetups.filter(s => previousPeriods.some(p => s.periodStart === p || s.period === p));
                prevAppraisals.forEach(appraisal => {
                    const { finalScore } = calculateFinalScore(emp, appraisal);
                    if (finalScore !== null) data.previousScores.push(finalScore);
                });
                if (data.currentScores.length > 0) employeeTrendData.set(emp.id, data);
            });

            const trendResults = Array.from(employeeTrendData.entries()).map(([employeeId, data]) => {
                const subject = employees.find(e => e.id === employeeId)!;
                const averageScore = data.currentScores.reduce((a, b) => a + b, 0) / data.currentScores.length;
                const previousAverage = data.previousScores.length > 0 ? data.previousScores.reduce((a,b) => a+b, 0) / data.previousScores.length : 0;
                const trend = previousAverage > 0 ? ((averageScore - previousAverage) / previousAverage) * 100 : (averageScore > 0 ? 100 : 0);
                return {
                    subject, kpiScore: null, kboScore: null, okrScore: null, finalScore: null,
                    averageScore: parseFloat(averageScore.toFixed(1)), personalTrend: parseFloat(trend.toFixed(1)),
                    status: getStatusFromFinalScore(averageScore).status,
                };
            });
            
            const aggregationByPeriod: { [period: string]: number[] } = {};
            currentPeriods.forEach(p => {
                const appraisalForPeriod = appraisalSetups.find(s => s.periodStart === p || s.period === p);
                if (appraisalForPeriod) {
                    employeeBase.forEach(emp => {
                         const { finalScore } = calculateFinalScore(emp, appraisalForPeriod);
                         if (finalScore !== null) {
                            if (!aggregationByPeriod[p]) aggregationByPeriod[p] = [];
                            aggregationByPeriod[p].push(finalScore);
                         }
                    });
                }
            });
            
            const finalChartData = Object.entries(aggregationByPeriod).map(([period, scores]) => ({
                periodLabel: format(parse(period, 'yyyy-MM', new Date()), "MMM yy", { locale: localeId }),
                date: parse(period, 'yyyy-MM', new Date()),
                "Rata-rata Skor": scores.reduce((a,b) => a+b,0) / scores.length,
            })).sort((a,b) => a.date.getTime() - b.date.getTime());

            return { appraisalResults: trendResults.sort((a,b) => (b.averageScore ?? -1) - (a.averageScore ?? -1)), chartData: finalChartData };
        }

    }, [selectedAppraisal, selectedCompanyId, selectedLevel, mode, trendStartPeriod, trendEndPeriod, getDateRanges, employees, kpiData, kboAssessments, kboSetups, appraisalSetups, companies, okrs]);

    const dashboardStats = useMemo(() => {
        if (appraisalResults.length === 0) return { averageScore: 0, topPerformer: { name: 'N/A', score: 0 }, bottomPerformer: { name: 'N/A', score: 0 }, distribution: { exceeds: 0, achieves: 0, needs: 0 } };
        const scores = appraisalResults.map(r => r.averageScore ?? r.finalScore ?? 0);
        const averageScore = scores.reduce((s, x) => s + x, 0) / scores.length;
        const topPerformer = appraisalResults[0];
        const bottomPerformer = appraisalResults[appraisalResults.length - 1];
        const distribution = appraisalResults.reduce((acc, r) => {
            if (r.status === 'Sangat Baik') acc.exceeds++;
            else if (r.status === 'Baik') acc.achieves++;
            else if (r.status === 'Perlu Peningkatan') acc.needs++;
            return acc;
        }, { exceeds: 0, achieves: 0, needs: 0 });
        return { averageScore, topPerformer: { name: topPerformer.subject.name, score: topPerformer.averageScore ?? topPerformer.finalScore ?? 0 }, bottomPerformer: { name: bottomPerformer.subject.name, score: bottomPerformer.averageScore ?? bottomPerformer.finalScore ?? 0 }, distribution };
    }, [appraisalResults]);
    
    const handleViewDetail = (result: AppraisalResult) => {
        if (!selectedAppraisal && mode === 'single') return;
        sessionStorage.setItem('selectedAppraisalResult', JSON.stringify(result));
        if (selectedAppraisal) {
            sessionStorage.setItem('selectedAppraisalSetup', JSON.stringify(selectedAppraisal));
        }
        router.push(`/appraisal-dashboard/${result.subject.id}`);
    }

    return (
        <ResponsivePage>
            <PageHeader 
                title="Dashboard Appraisal" 
                description="Analisis performa akhir karyawan berdasarkan penggabungan skor KPI, KBO, dan OKR secara proporsional." 
                icon={Activity} 
            />

            <DashboardNavigator />

            <ResponsiveToolbar>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                    <Label htmlFor="mode-switch" className="space-y-0.5">
                        <span className="font-bold text-slate-800 text-sm">Mode Analisis</span>
                        <p className="text-[10px] text-slate-500 uppercase font-black">{mode === 'single' ? 'Periode Tunggal' : 'Tren Perbandingan'}</p>
                    </Label>
                    <Switch id="mode-switch" checked={mode === 'trend'} onCheckedChange={(c) => setMode(c ? 'trend' : 'single')} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-2 w-full">
                    {showCompanyFilter && (
                        <Select onValueChange={setSelectedCompanyId} value={selectedCompanyId ?? ""}>
                            <SelectTrigger className="h-9 min-w-[180px] bg-background border-none shadow-sm text-[11px] font-black uppercase tracking-tight">
                                <Building className="size-3.5 mr-2 text-primary" />
                                <SelectValue placeholder="Perusahaan" />
                            </SelectTrigger>
                            <SelectContent className="z-[350]">
                                {manageableCompanies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                    {mode === 'single' ? (
                        <Select value={selectedAppraisalId ?? ""} onValueChange={setSelectedAppraisalId} disabled={availableSetupsForCompany.length === 0}>
                            <SelectTrigger className="h-9 min-w-[200px] bg-background border-none shadow-sm text-[11px] font-black uppercase tracking-tight">
                                <Calendar className="size-3.5 mr-2 text-primary" />
                                <SelectValue placeholder="Pilih Setup" />
                            </SelectTrigger>
                            <SelectContent className="z-[350]">
                                {availableSetupsForCompany.map(s => <SelectItem key={s.id} value={s.id}>{s.period || `${s.periodStart} - ${s.periodEnd}`}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    ) : (
                        <>
                            <Select value={trendStartPeriod ?? ""} onValueChange={setTrendStartPeriod}>
                                <SelectTrigger className="h-9 min-w-[120px] bg-background border-none shadow-sm text-[11px] font-black uppercase tracking-tight">
                                    <Calendar className="size-3.5 mr-2 text-primary" />
                                    <SelectValue placeholder="Mulai" />
                                </SelectTrigger>
                                <SelectContent className="z-[350]">
                                    {[...allAvailablePeriods].sort().map(p => <SelectItem key={p} value={p}>{format(parse(p, 'yyyy-MM', new Date()), 'MMM yy', { locale: localeId })}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={trendEndPeriod ?? ""} onValueChange={setTrendEndPeriod}>
                                <SelectTrigger className="h-9 min-w-[120px] bg-background border-none shadow-sm text-[11px] font-black uppercase tracking-tight">
                                    <Calendar className="size-3.5 mr-2 text-primary" />
                                    <SelectValue placeholder="Selesai" />
                                </SelectTrigger>
                                <SelectContent className="z-[350]">
                                    {[...allAvailablePeriods].sort().map(p => <SelectItem key={p} value={p}>{format(parse(p, 'yyyy-MM', new Date()), 'MMM yy', { locale: localeId })}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </>
                    )}
                    <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                        <SelectTrigger className="h-9 min-w-[150px] bg-background border-none shadow-sm text-[11px] font-black uppercase tracking-tight">
                            <LayoutGrid className="size-3.5 mr-2 text-primary" />
                            <SelectValue placeholder="Semua Level" />
                        </SelectTrigger>
                        <SelectContent className="z-[350]">
                            <SelectItem value="all">Semua Level</SelectItem>
                            {levelOptions.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </ResponsiveToolbar>

            <AdaptiveCardGrid complexity="simple">
                <AdaptiveMetricCard title="Rata-Rata Tim" value={dashboardStats.averageScore.toFixed(1)} icon={BarChartBig} color="bg-primary/10 text-primary" />
                <AdaptiveMetricCard title="Best Performer" value={dashboardStats.topPerformer.score.toFixed(1)} icon={TrendingUp} badge={dashboardStats.topPerformer.name} color="bg-emerald-500/10 text-emerald-600" />
                <AdaptiveMetricCard title="Low Performer" value={dashboardStats.bottomPerformer.score.toFixed(1)} icon={TrendingDown} badge={dashboardStats.bottomPerformer.name} color="bg-rose-500/10 text-rose-600" />
                <AdaptiveMetricCard title="Total Dinilai" value={appraisalResults.length} icon={Users} description="Personil dalam cakupan" />
            </AdaptiveCardGrid>

            <AdaptiveCardGrid complexity="complex">
                <AdaptiveInsightCard title="Distribusi Kelayakan" icon={LayoutGrid} description="Berdasarkan ambang batas skor final">
                    <div className="h-[300px] pt-4"><DonutChart data={dashboardStats.distribution as any} /></div>
                </AdaptiveInsightCard>
                {mode === 'trend' && chartData.length > 0 && (
                    <AdaptiveInsightCard title="Tren Agregat Grup" icon={TrendingUp} description="Pergerakan skor rata-rata bulanan">
                        <div className="h-[300px] pt-4"><TeamPerformanceTrendChart chartData={chartData} /></div>
                    </AdaptiveInsightCard>
                )}
            </AdaptiveCardGrid>

            <AdaptiveTable 
                data={appraisalResults}
                keyExtractor={(r: any) => r.subject.id}
                columns={[
                    { header: "Karyawan", cell: (r: any) => (
                        <div className="flex items-center gap-3">
                            <Avatar className="size-9 border shadow-sm"><AvatarFallback className="text-[10px] font-black bg-primary/10 text-primary">{r.subject.name.substring(0,2).toUpperCase()}</AvatarFallback></Avatar>
                            <div className="min-w-0"><p className="font-bold text-slate-900 truncate">{r.subject.name}</p><p className="text-[10px] text-muted-foreground uppercase font-black">{r.subject.position}</p></div>
                        </div>
                    )},
                    { header: mode === 'trend' ? "Skor Rata-Rata" : "Skor Final", cell: (r: any) => <span className="text-lg font-black text-primary tnum">{(r.averageScore ?? r.finalScore).toFixed(1)}</span> },
                    { header: "Status / Tren", cell: (r: any) => (
                        mode === 'trend' ? <div className="flex items-center gap-2 font-bold text-xs tnum">{getTrendIcon(r.personalTrend)} {r.personalTrend.toFixed(1)}%</div> : <Badge variant={getStatusFromFinalScore(r.finalScore).variant} className="text-[9px] font-black uppercase h-5">{r.status}</Badge>
                    )},
                    { header: "Komponen Skor", hideOnTablet: true, cell: (r: any) => (
                        mode === 'single' ? (
                            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase whitespace-nowrap tnum">
                                <span>KPI: {r.kpiScore?.toFixed(1) || '-'}</span>
                                <span className="opacity-30">|</span>
                                <span>KBO: {r.kboScore?.toFixed(1) || '-'}</span>
                                {r.isOkrIntegrated && <><span className="opacity-30">|</span><span className="text-primary">OKR: {r.okrScore?.toFixed(1) || '0.0'}</span></>}
                            </div>
                        ) : null
                    )},
                    { header: "", className: "text-right", cell: (r: any) => (
                        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-full"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="z-[350]">
                            <DropdownMenuItem onClick={() => handleViewDetail(r)}><ArrowRight className="size-3.5 mr-2" /> Lihat Analisis Detail</DropdownMenuItem>
                        </DropdownMenuContent></DropdownMenu>
                    )}
                ]}
                renderMobileCard={(r: any) => (
                    <Card className="border-border/40 shadow-sm overflow-hidden" onClick={() => handleViewDetail(r)}>
                        <CardContent className="p-4 space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <Avatar className="size-10 border-2 border-primary/10 shadow-sm"><AvatarFallback className="font-black text-xs">{r.subject.name.substring(0,2).toUpperCase()}</AvatarFallback></Avatar>
                                    <div className="min-w-0"><h3 className="font-black text-sm truncate uppercase">{r.subject.name}</h3><p className="text-[10px] font-bold text-muted-foreground">{r.subject.position}</p></div>
                                </div>
                                <div className="text-right"><p className="text-xl font-black text-primary leading-none tnum">{(r.averageScore ?? r.finalScore).toFixed(1)}</p><p className="text-[8px] font-black uppercase text-muted-foreground mt-1">SKOR</p></div>
                            </div>
                            <div className="flex items-center justify-between pt-3 border-t">
                                <Badge variant={getStatusFromFinalScore(r.averageScore ?? r.finalScore).variant} className="text-[8px] font-black uppercase h-5">{mode === 'trend' ? `TREN: ${r.personalTrend}%` : r.status}</Badge>
                                <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase">ANALISA <ArrowRight size={10} /></div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            />
        </ResponsivePage>
    );
}
