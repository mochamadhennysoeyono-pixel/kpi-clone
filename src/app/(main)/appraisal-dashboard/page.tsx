// src/app/(main)/appraisal-dashboard/page.tsx
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { User, Activity, AlertCircle, MoreHorizontal, BarChartBig, Users, TrendingUp, TrendingDown, ArrowRight, Target } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';
import type { Employee, AppraisalSetup, KboSetup, Company, KpiData, AppraisalComponents, OKR, KeyResult } from '@/types';
import { parse, isWithinInterval, format, eachMonthOfInterval, isBefore, subMonths, startOfMonth, addMonths, lastDayOfMonth } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import StatCard from '@/components/dashboard/stat-card';
import { DonutChart } from '@/components/reports/donut-chart';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import TeamPerformanceTrendChart from '@/components/reports/team-performance-trend-chart';
import { cn } from '@/lib/utils';

interface AppraisalResult {
    subject: Employee;
    kpiScore: number | null;
    kboScore: number | null;
    okrScore: number | null;
    finalScore: number | null;
    status: string;
    averageScore?: number;
    personalTrend?: number;
    isLatestApproved?: boolean;
    approvalStatus?: string;
    isOkrIntegrated?: boolean;
}

const getStatusFromFinalScore = (score: number | null): { status: string; variant: "default" | "secondary" | "destructive" | "outline" } => {
    if (score === null) return { status: 'Belum Lengkap', variant: 'outline' };
    if (score >= 90) return { status: 'Sangat Baik', variant: 'default' };
    if (score >= 70) return { status: 'Baik', variant: 'secondary' };
    return { status: 'Perlu Peningkatan', variant: 'destructive' };
};

const getTrendIcon = (trend: number) => {
    if (trend > 0.1) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend < -0.1) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <ArrowRight className="h-4 w-4 text-muted-foreground" />;
};

const levelOptions: Employee['level'][] = ['Direktur', 'Manager', 'Supervisor', 'Staff'];

export default function AppraisalDashboardPage() {
    const { currentUser, userRole } = useAuth();
    const { companies, appraisalSetups, employees, kpiData, kboAssessments, kboSetups, okrs } = useMasterData();
    const router = useRouter();

    const [mode, setMode] = useState<'single' | 'trend'>('single');
    const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
    const [selectedLevel, setSelectedLevel] = useState<string>('all');
    
    // State for single mode
    const [selectedAppraisalId, setSelectedAppraisalId] = useState<string | null>(null);

    // State for trend mode
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
        if (showCompanyFilter && manageableCompanies.length > 0 && !selectedCompanyId) {
            setSelectedCompanyId(manageableCompanies[0].id);
        } else if (!showCompanyFilter && userCompany) {
            setSelectedCompanyId(userCompany.id);
        }
    }, [showCompanyFilter, manageableCompanies, userCompany, selectedCompanyId]);
    
    const availableSetupsForCompany = useMemo(() => {
      if (!selectedCompanyId) return [];
      const companyName = companies.find(c => c.id === selectedCompanyId)?.name;
      if (!companyName) return [];
      return appraisalSetups.filter(s => s.company === companyName && s.status === 'Aktif').sort((a,b) => (b.period || b.periodStart || '').localeCompare(a.period || a.periodStart || ''));
    }, [selectedCompanyId, appraisalSetups, companies]);

    const allAvailablePeriods = useMemo(() => {
        if (!selectedCompanyId) return [];
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
        if (selectedCompanyId) {
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
            
            // 1. KPI Score
            const subjectKpiData = kpiData.filter(d => d.employeeId === subject.id && cycleMonths.includes(d.period));
            const kpiScore = subjectKpiData.length > 0 ? subjectKpiData.reduce((sum, d) => sum + d.score, 0) / subjectKpiData.length : null;

            // 2. KBO Score
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
            
            // 3. OKR Score (Weighted average of relevant parts)
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
                // If they own the objective, use total progress
                if (okr.ownerId === subject.id) return okr.progress;

                // Otherwise, calculate progress from the parts they own
                const relevantKrs = okr.keyResults.filter(kr => 
                    kr.ownerId === subject.id ||
                    kr.contributors?.some(c => c.ownerId === subject.id) ||
                    kr.milestones?.some(m => m.ownerId === subject.id) ||
                    kr.checklist?.some(c => c.ownerId === subject.id)
                );

                if (relevantKrs.length === 0) return 0;

                const krProgresses = relevantKrs.map(kr => {
                    if (kr.ownershipModel === 'single_owner' && kr.ownerId === subject.id) {
                        return calculateRelativeProgress(kr.currentValue, kr.startValue, kr.targetValue);
                    }
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

            // 4. Final Weighted Score
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
                
                if (kpiScore !== null && kboScore !== null) {
                    finalScore = (kpiScore * kpiW) + (kboScore * kboW);
                } else if (kpiScore !== null && kboW === 0) {
                    finalScore = kpiScore;
                } else if (kboScore !== null && kpiW === 0) {
                    finalScore = kboScore;
                }
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

            const employeeTrendData = new Map<string, { currentScores: number[], previousScores: number[], latestData: any }>();

            employeeBase.forEach(emp => {
                const data = { currentScores: [] as number[], previousScores: [] as number[], latestData: null as any };
                
                relevantAppraisals.forEach(appraisal => {
                    const { finalScore } = calculateFinalScore(emp, appraisal);
                    if (finalScore !== null) data.currentScores.push(finalScore);
                });

                // Find data for previous period trend
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
                    averageScore: parseFloat(averageScore.toFixed(1)),
                    personalTrend: parseFloat(trend.toFixed(1)),
                    status: getStatusFromFinalScore(averageScore).status,
                };
            });
            
            // For chart
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
        if (appraisalResults.length === 0) {
            return { averageScore: 0, topPerformer: { name: 'N/A', score: 0 }, bottomPerformer: { name: 'N/A', score: 0 }, distribution: { exceeds: 0, achieves: 0, needs: 0 }, performanceTrend: 0 };
        }
        
        const totalScore = appraisalResults.reduce((sum, r) => sum + (r.averageScore ?? r.finalScore ?? 0), 0);
        const averageScore = totalScore / appraisalResults.length;
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
        if (!selectedAppraisal) return;
        sessionStorage.setItem('selectedAppraisalResult', JSON.stringify(result));
        sessionStorage.setItem('selectedAppraisalSetup', JSON.stringify(selectedAppraisal));
        router.push(`/appraisal-dashboard/${result.subject.id}`);
    }

    return (
        <div className="space-y-6">
            <Card className="shadow-lg border-t-4 border-primary mb-6 overflow-hidden">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Activity className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="font-headline text-2xl">Dasbor Appraisal Kinerja</CardTitle>
                            <CardDescription>
                                Analisis dan tinjau hasil penilaian kinerja karyawan berdasarkan periode appraisal.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <Card className="shadow-lg">
                 <CardHeader className="bg-muted/50">
                    <div className="flex justify-between items-center">
                        <Label htmlFor="mode-switch" className="flex flex-col space-y-1">
                            <span className="font-semibold">Mode Analisis</span>
                            <span className="font-normal text-xs text-muted-foreground">
                                {mode === 'single' ? 'Melihat laporan untuk satu periode.' : 'Membandingkan kinerja antar periode.'}
                            </span>
                        </Label>
                        <Switch
                            id="mode-switch"
                            checked={mode === 'trend'}
                            onCheckedChange={(checked) => setMode(checked ? 'trend' : 'single')}
                        />
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {showCompanyFilter && ( <Select value={selectedCompanyId ?? ''} onValueChange={setSelectedCompanyId}> <SelectTrigger><SelectValue placeholder="Pilih Perusahaan" /></SelectTrigger> <SelectContent> {manageableCompanies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)} </SelectContent> </Select> )}
                        
                        {mode === 'single' ? (
                            <Select value={selectedAppraisalId ?? ''} onValueChange={setSelectedAppraisalId} disabled={availableSetupsForCompany.length === 0}> <SelectTrigger> <SelectValue placeholder="Pilih Pengaturan Appraisal" /> </SelectTrigger> <SelectContent> {availableSetupsForCompany.map(s => <SelectItem key={s.id} value={s.id}>{s.period || `${s.periodStart} - ${s.periodEnd}`}</SelectItem>)} </SelectContent> </Select>
                        ) : (
                            <>
                                <Select value={trendStartPeriod ?? ''} onValueChange={setTrendStartPeriod} disabled={allAvailablePeriods.length === 0}><SelectTrigger><SelectValue placeholder="Periode Mulai" /></SelectTrigger><SelectContent>{[...allAvailablePeriods].sort().map(p => <SelectItem key={p} value={p}>{format(parse(p, 'yyyy-MM', new Date()), "LLLL yyyy", { locale: localeId })}</SelectItem>)}</SelectContent></Select>
                                <Select value={trendEndPeriod ?? ''} onValueChange={setTrendEndPeriod} disabled={allAvailablePeriods.length === 0}><SelectTrigger><SelectValue placeholder="Periode Selesai" /></SelectTrigger><SelectContent>{[...allAvailablePeriods].sort().map(p => <SelectItem key={p} value={p}>{format(parse(p, 'yyyy-MM', new Date()), "LLLL yyyy", { locale: localeId })}</SelectItem>)}</SelectContent></Select>
                            </>
                        )}
                        <Select value={selectedLevel} onValueChange={setSelectedLevel}> <SelectTrigger> <SelectValue placeholder="Pilih Level" /> </SelectTrigger> <SelectContent> <SelectItem value="all">Semua Level</SelectItem> {levelOptions.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)} </SelectContent> </Select>
                    </div>
                </CardContent>
            </Card>
             <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="sm:col-span-2">
                        <StatCard title="Rata-Rata Skor Tim" value={dashboardStats.averageScore.toFixed(1)} icon={BarChartBig} description={`Total ${appraisalResults.length} karyawan dinilai`} iconColor="text-blue-500" />
                    </div>
                    <StatCard title="Performa Tertinggi" value={dashboardStats.topPerformer.name} icon={TrendingUp} description={`Skor: ${dashboardStats.topPerformer.score.toFixed(1)}`} iconColor="text-green-500" />
                    <StatCard title="Performa Terendah" value={dashboardStats.bottomPerformer.name} icon={TrendingDown} description={`Skor: ${dashboardStats.bottomPerformer.score.toFixed(1)}`} iconColor="text-red-500" />
                </div>
                <div className="lg:col-span-2">
                    <Card className="shadow-lg h-full">
                        <CardHeader><CardTitle className="font-headline text-base">Distribusi Status</CardTitle></CardHeader>
                        <CardContent><DonutChart data={dashboardStats.distribution} /></CardContent>
                    </Card>
                </div>
            </div>
            {mode === 'trend' && chartData.length > 0 && <TeamPerformanceTrendChart chartData={chartData} />}

            <Card>
                <CardHeader>
                    <CardTitle>Hasil Appraisal</CardTitle>
                    <CardDescription>Menampilkan {appraisalResults.length} hasil penilaian.</CardDescription>
                </CardHeader>
                <CardContent>
                  {!selectedAppraisalId && mode === 'single' ? (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground h-40 justify-center"> <AlertCircle className="h-8 w-8" /> <span>Pilih pengaturan appraisal untuk melihat laporan.</span> </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Karyawan</TableHead>
                          {mode === 'single' ? (
                              <>
                                <TableHead className="text-center">Skor KPI</TableHead>
                                <TableHead className="text-center">Skor KBO</TableHead>
                                <TableHead className="text-center">Skor OKR</TableHead>
                                <TableHead className="text-center">Skor Final</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                              </>
                          ) : (
                              <>
                                <TableHead className="text-center">Skor Rata-rata</TableHead>
                                <TableHead className="text-center">Tren</TableHead>
                                <TableHead className="text-center">Status Akhir</TableHead>
                              </>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {appraisalResults.length > 0 ? (
                          appraisalResults.map((result) => (
                            <TableRow key={result.subject.id} onClick={mode === 'single' ? () => handleViewDetail(result) : undefined} className={mode === 'single' ? "cursor-pointer" : ""}>
                              <TableCell>
                                  <div className="flex items-center gap-3">
                                  <div className="hidden h-9 w-9 sm:flex items-center justify-center rounded-full bg-muted"> <User className="h-5 w-5 text-muted-foreground" /> </div>
                                  <div>
                                      <p className="font-medium">{result.subject.name}</p>
                                      <div className="text-xs text-muted-foreground"> {result.subject.position} / <Badge variant="outline" className="text-xs">{result.subject.level}</Badge> </div>
                                  </div>
                                  </div>
                              </TableCell>
                              {mode === 'single' ? (
                                  <>
                                      <TableCell className="text-center font-semibold">{result.kpiScore !== null ? result.kpiScore.toFixed(1) : '-'}</TableCell>
                                      <TableCell className="text-center font-semibold">{result.kboScore !== null ? result.kboScore.toFixed(1) : '-'}</TableCell>
                                      <TableCell className="text-center font-semibold">
                                          {result.isOkrIntegrated ? (
                                              <div className="flex flex-col items-center">
                                                  <span className="font-bold text-primary">{result.okrScore?.toFixed(1) || '0.0'}</span>
                                                  <Badge variant="outline" className="text-[8px] h-4">Terintegrasi</Badge>
                                              </div>
                                          ) : (
                                              <span className="text-muted-foreground/50">-</span>
                                          )}
                                      </TableCell>
                                      <TableCell className="text-center text-lg font-bold text-primary">{result.finalScore !== null ? result.finalScore.toFixed(1) : '-'}</TableCell>
                                      <TableCell className="text-center"> <Badge variant={getStatusFromFinalScore(result.finalScore).variant}>{result.status}</Badge> </TableCell>
                                      <TableCell className="text-right">
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button aria-haspopup="true" size="icon" variant="ghost">
                                                <MoreHorizontal className="h-4 w-4" />
                                                <span className="sr-only">Buka menu</span>
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                              <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                                              <DropdownMenuItem onClick={() => handleViewDetail(result)}>
                                                Lihat Detail
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                      </TableCell>
                                  </>
                              ) : (
                                  <>
                                      <TableCell className="text-center font-bold text-primary">{result.averageScore?.toFixed(1)}</TableCell>
                                      <TableCell className="text-center"><div className="flex items-center justify-center gap-1 font-semibold">{getTrendIcon(result.personalTrend ?? 0)} {(result.personalTrend ?? 0).toFixed(1)}%</div></TableCell>
                                      <TableCell className="text-center"><Badge variant={getStatusFromFinalScore(result.averageScore ?? null).variant}>{result.status}</Badge></TableCell>
                                  </>
                              )}
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={mode === 'single' ? 7 : 4} className="text-center h-24">Tidak ada data penilaian untuk ditampilkan.</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
            </Card>
        </div>
    )
}
