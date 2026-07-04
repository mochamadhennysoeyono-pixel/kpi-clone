// src/app/(main)/reports/page.tsx
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Users,
  BarChart3,
  ShieldCheck,
  ShieldAlert,
  UserCog,
  X,
  Maximize2,
  Minimize2,
  ArrowRight,
  Search,
  UserSearch,
  Calendar,
  Building,
  Briefcase,
  Network,
  Zap,
  FilePieChart
} from "lucide-react";
import { useMasterData } from "@/contexts/master-data-context";
import type { KpiData, Company, Employee } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { AchievementDetailDialog as AchievementDetailContent } from "@/components/reports/achievement-detail-dialog";
import TeamPerformanceTrendChart from "@/components/reports/team-performance-trend-chart";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { format, parse, isBefore, addMonths, subMonths, startOfMonth, isValid } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DonutChart } from "@/components/reports/donut-chart";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ResponsivePage, ResponsiveToolbar } from "@/components/ui/adaptive-layout";
import { PageHeader } from "@/components/ui/page-header";
import { AdaptiveCardGrid, AdaptiveMetricCard, AdaptiveInsightCard } from "@/components/ui/adaptive-card";
import { AdaptiveTable } from "@/components/ui/adaptive-table";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { usePageContext } from "@/contexts/page-context";

function TeamReportView() {
    const { currentUser, userRole } = useAuth();
    const { kpiData, companies, employees, updateKpiData, departments, positions } = useMasterData();
    const { toast } = useToast();
    const { isMobile } = useBreakpoint();
    const router = useRouter();
    
    const [mode, setMode] = useState<'single' | 'trend'>('single');
    const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
    const [selectedDepartment, setSelectedDepartment] = useState("all");
    const [selectedPosition, setSelectedPosition] = useState("all");
    const [selectedKpiDataForDetail, setSelectedKpiDataForDetail] = useState<KpiData | null>(null);
    const [singlePeriod, setSinglePeriod] = useState<string | null>(null);
    const [trendStartPeriod, setTrendStartPeriod] = useState<string | null>(null);
    const [trendEndPeriod, setTrendEndPeriod] = useState<string | null>(null);

    const userCompany = useMemo(() => companies.find(c => c.name === currentUser?.company), [companies, currentUser]);
    const isHoldingAdmin = useMemo(() => userRole === 'manajemen' && !!userCompany?.isHolding, [userRole, userCompany]);
    const isManager = useMemo(() => (userRole === 'manajemen' || userRole === 'user') && employees.some(e => e.reportsTo === currentUser?.id), [userRole, currentUser, employees]);

    useEffect(() => {
        if (userRole === 'superadmin' && companies.length > 0) {
            const activeCompanies = companies.filter(c => c.status === 'Aktif');
            if (activeCompanies.length > 0) setSelectedCompanyId(activeCompanies[0].id);
        } else if (currentUser) {
            const userCompanyData = companies.find((c) => c.name === currentUser.company);
            setSelectedCompanyId(userCompanyData?.id || null);
        }
    }, [userRole, currentUser, companies]);

    const selectedCompanyName = useMemo(() => companies.find(c => c.id === selectedCompanyId)?.name, [selectedCompanyId, companies]);
   
    const availablePeriods = useMemo(() => {
        if (!kpiData || !selectedCompanyName) return [];
        return [...new Set(kpiData.filter(d => d.company === selectedCompanyName && d.period).map(d => d.period))].sort().reverse();
    }, [kpiData, selectedCompanyName]);

    useEffect(() => {
        if (availablePeriods.length === 0) return;
        if (mode === 'single' && !singlePeriod) setSinglePeriod(availablePeriods[0]);
        else if (mode === 'trend' && (!trendStartPeriod || !trendEndPeriod)) {
             const sortedPeriods = [...availablePeriods].sort();
             if (sortedPeriods.length > 0) {
                const latestPeriod = sortedPeriods[sortedPeriods.length - 1];
                setTrendEndPeriod(latestPeriod);
                const defaultStartPeriod = format(startOfMonth(subMonths(parse(latestPeriod, 'yyyy-MM', new Date()), 2)), 'yyyy-MM');
                setTrendStartPeriod(sortedPeriods.find(p => p >= defaultStartPeriod) || sortedPeriods[0]);
             }
        }
    }, [mode, availablePeriods, singlePeriod, trendStartPeriod, trendEndPeriod]);
    
    const getDateRanges = useCallback(() => {
        if (mode !== 'trend' || !trendStartPeriod || !trendEndPeriod) return { currentPeriods: [], previousPeriods: [] };
        let start = parse(trendStartPeriod, 'yyyy-MM', new Date());
        let end = parse(trendEndPeriod, 'yyyy-MM', new Date());
        if (!isValid(start) || !isValid(end)) return { currentPeriods: [], previousPeriods: [] };
        if (isBefore(end, start)) [start, end] = [end, start];
        const getCurrent = (s: Date, e: Date) => {
            const periods = []; let current = startOfMonth(s);
            while (current <= startOfMonth(e)) { periods.push(format(current, 'yyyy-MM')); current = addMonths(current, 1); }
            return periods;
        };
        const currentPeriods = getCurrent(start, end);
        return { currentPeriods, previousPeriods: getCurrent(subMonths(start, currentPeriods.length), subMonths(start, 1)) };
    }, [mode, trendStartPeriod, trendEndPeriod]);
    
    const { reportData, trendStats } = useMemo(() => {
         if (!selectedCompanyName) return { reportData: [], trendStats: { performanceTrend: 0, distribution: { exceeds: 0, achieves: 0, needs: 0 } } };
        if (mode === 'single') {
            let data = singlePeriod ? kpiData.filter(d => d.period === singlePeriod && d.company === selectedCompanyName) : [];
            if (selectedDepartment !== "all") data = data.filter(d => d.department === selectedDepartment);
            if (selectedPosition !== "all") data = data.filter(d => d.position === selectedPosition);
             if (isManager && !isHoldingAdmin && currentUser) {
                const getSubordinateIds = (managerId: string): string[] => [managerId, ...employees.filter(e => e.reportsTo === managerId).flatMap(e => getSubordinateIds(e.id))];
                const teamIds = new Set(getSubordinateIds(currentUser.id));
                data = data.filter(d => teamIds.has(d.employeeId));
            }
            return { reportData: data.map(d => ({...d, employee: employees.find(e => e.id === d.employeeId)})), trendStats: { performanceTrend: 0, distribution: { exceeds: 0, achieves: 0, needs: 0 } } };
        }

        const { currentPeriods, previousPeriods } = getDateRanges();
        const filterByPeriods = (p: string[]) => !p || p.length === 0 ? [] : kpiData.filter(d => d.company === selectedCompanyName && (selectedDepartment === 'all' || d.department === selectedDepartment) && (selectedPosition === 'all' || d.position === selectedPosition) && p.includes(d.period));
        let periodData = filterByPeriods(currentPeriods);
        let trendComparisonData = filterByPeriods(previousPeriods);

        if (isManager && !isHoldingAdmin && currentUser) {
            const getSubordinateIds = (managerId: string): string[] => [managerId, ...employees.filter(e => e.reportsTo === managerId).flatMap(e => getSubordinateIds(e.id))];
            const teamIds = new Set(getSubordinateIds(currentUser.id));
            periodData = periodData.filter(d => teamIds.has(d.employeeId));
            trendComparisonData = trendComparisonData.filter(d => teamIds.has(d.employeeId));
        }

        const employeeScores = new Map<string, { scores: number[], latestData: KpiData }>();
        periodData.forEach(d => {
            if (!employeeScores.has(d.employeeId)) employeeScores.set(d.employeeId, { scores: [], latestData: d });
            const entry = employeeScores.get(d.employeeId)!; entry.scores.push(d.score);
            if (d.period > entry.latestData.period) entry.latestData = d;
        });

        const empPreviousScores = new Map<string, number[]>();
        trendComparisonData.forEach(d => {
             if (!empPreviousScores.has(d.employeeId)) empPreviousScores.set(d.employeeId, []);
             empPreviousScores.get(d.employeeId)!.push(d.score);
        });

        const finalReportData = Array.from(employeeScores.entries()).map(([id, data]) => {
            const avg = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
            const prevScores = empPreviousScores.get(id) || [];
            const prevAvg = prevScores.length ? prevScores.reduce((a, b) => a + b, 0) / prevScores.length : 0;
            const trend = prevAvg ? ((avg - prevAvg) / prevAvg) * 100 : (avg > 0 ? 100 : 0);
            const allData = periodData.filter(d => d.employeeId === id);
            return {
                ...data.latestData, id, score: data.latestData.score, averageScore: parseFloat(avg.toFixed(1)),
                approvalStatusSummary: `${allData.filter(d => d.approvalStatus === 'Disetujui').length}/${allData.length}`,
                personalTrend: parseFloat(trend.toFixed(1)), employee: employees.find(e => e.id === id),
            };
        });

        const currentAvg = periodData.length ? periodData.reduce((s, d) => s + d.score, 0) / periodData.length : 0;
        const previousAvg = trendComparisonData.length ? trendComparisonData.reduce((s, d) => s + d.score, 0) / trendComparisonData.length : 0;
        const performanceTrend = previousAvg ? ((currentAvg - previousAvg) / previousAvg) * 100 : (currentAvg > 0 ? 100 : 0);
        
        const distribution = [...new Set(periodData.map(d => d.employeeId))].reduce((a, eid) => {
            const d = periodData.find(pd => pd.employeeId === eid)!;
            const statusKey = d.status === 'Melampaui Target' ? 'exceeds' : d.status === 'Mencapai Target' ? 'achieves' : 'needs';
            return { ...a, [statusKey]: a[statusKey as keyof typeof a] + 1 };
        }, { exceeds: 0, achieves: 0, needs: 0 });

        return { reportData: finalReportData, trendStats: { performanceTrend, distribution } };
    }, [kpiData, selectedCompanyName, mode, singlePeriod, trendStartPeriod, trendEndPeriod, selectedDepartment, selectedPosition, employees, currentUser, getDateRanges, isHoldingAdmin, isManager]);
    
    const chartData = useMemo(() => {
        let baseData = kpiData.filter(d => d.company === selectedCompanyName);
        if (isManager && !isHoldingAdmin && currentUser) {
            const getSubordinateIds = (managerId: string): string[] => [managerId, ...employees.filter(e => e.reportsTo === managerId).flatMap(e => getSubordinateIds(e.id))];
            const teamIds = new Set(getSubordinateIds(currentUser.id));
            baseData = baseData.filter(d => teamIds.has(d.employeeId));
        }
        if (selectedDepartment !== 'all') baseData = baseData.filter(d => d.department === selectedDepartment);
        if (selectedPosition !== 'all') baseData = baseData.filter(d => d.position === selectedPosition);
        const periods = [...new Set(baseData.map(d => d.period))].sort().slice(-12);
        if (periods.length === 0) return [];
        const avgByPeriod: Record<string, number> = periods.reduce((acc, p) => {
            const data = baseData.filter(d => d.period === p); acc[p] = data.length ? data.reduce((s, d) => s + d.score, 0) / data.length : 0; return acc;
        }, {} as Record<string, number>);
        return Object.entries(avgByPeriod).map(([p, avg]) => ({ periodLabel: format(parse(p, 'yyyy-MM', new Date()), 'MMM yy', { locale: localeId }), date: parse(p, 'yyyy-MM', new Date()), "Rata-rata Skor": avg })).sort((a,b) => a.date.getTime() - b.date.getTime());
    }, [kpiData, selectedCompanyName, selectedDepartment, selectedPosition, isManager, isHoldingAdmin, currentUser, employees]);
        
    const handleApproveAchievement = async (data: KpiData) => {
        if (!currentUser || !data) return;
        await updateKpiData(data.id, { approvalStatus: 'Disetujui', approvedBy: currentUser.name, approvedAt: new Date().toISOString() });
        toast({ title: 'KPI Disetujui', description: `Pencapaian KPI untuk ${data.employeeName} telah disetujui.` });
    };

    const manageableCompanies = useMemo(() => {
        if (userRole === 'superadmin') return companies.filter(c => c.status === 'Aktif');
        if (isHoldingAdmin && userCompany) {
            const getChildCompanies = (parentId: string): Company[] => companies.filter(c => c.parentId === parentId).flatMap(c => [c, ...getChildCompanies(c.id)]);
            return [userCompany, ...getChildCompanies(userCompany.id)];
        }
        if (userCompany) return [userCompany]; return [];
    }, [userRole, isHoldingAdmin, userCompany, companies]);

    const uniqueCompanyDepartments = useMemo(() => !selectedCompanyName ? [] : [...new Map(departments.filter(d => d.company === selectedCompanyName).map(d => [d.name, d])).values()], [selectedCompanyName, departments]);
    const uniqueCompanyPositions = useMemo(() => !selectedCompanyName ? [] : [...new Map(positions.filter(p => p.company === selectedCompanyName && (selectedDepartment === 'all' || p.department === selectedDepartment)).map(p => [p.name, p])).values()], [selectedCompanyName, selectedDepartment, positions]);

    const sortedReportData = useMemo(() => [...(reportData || [])].sort((a,b) => (b.score ?? b.averageScore) - (a.score ?? a.averageScore)), [reportData]);
    const teamStats = useMemo(() => {
        if(sortedReportData.length === 0) return { averageScore: 0, topPerformer: { name: 'N/A', score: "0" }, lowestPerformer: { name: 'N/A', score: "0" } };
        return { averageScore: parseFloat((sortedReportData.reduce((s, d) => s + (d.averageScore ?? d.score), 0) / sortedReportData.length).toFixed(1)) || 0,
            topPerformer: { name: sortedReportData[0]?.employeeName, score: (sortedReportData[0]?.averageScore ?? sortedReportData[0]?.score ?? 0).toFixed(1) },
            lowestPerformer: { name: sortedReportData[sortedReportData.length - 1]?.employeeName, score: (sortedReportData[sortedReportData.length-1]?.averageScore ?? sortedReportData[sortedReportData.length-1]?.score ?? 0).toFixed(1) } }
    }, [sortedReportData]);
    
    const handleViewDetails = (data: any) => {
        if (mode === 'single') {
            if (isMobile) { 
                sessionStorage.setItem('selectedKpiDetail', JSON.stringify(data)); 
                router.push(`/reports/detail/${data.id}`); 
            } else { 
                setSelectedKpiDataForDetail(data); 
            }
        } else if (data.employee && trendStartPeriod && trendEndPeriod) {
            sessionStorage.setItem('selectedEmployeeAnalysis', JSON.stringify({ employee: data.employee, startPeriod: trendStartPeriod, endPeriod: trendEndPeriod }));
            router.push(`/reports/${data.employee.id}`);
        }
    };
    
    const getStatusBadgeVariant = (status: string) => status === 'Melampaui Target' ? 'default' : status === 'Mencapai Target' ? 'secondary' : 'destructive';
    const getTrendIcon = (trend: number) => trend > 0.1 ? <TrendingUp className="size-4 text-green-500" /> : trend < -0.1 ? <TrendingDown className="size-4 text-red-500" /> : <ArrowRight className="size-4 text-slate-400" />;

    return (
        <div className="space-y-6">
            <ResponsiveToolbar>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                    <Label htmlFor="mode-switch" className="space-y-0.5">
                        <span className="font-bold text-slate-800 text-sm">Mode Analisis</span>
                        <p className="text-[10px] text-slate-500 uppercase font-black">{mode === 'single' ? 'Periode Tunggal' : 'Tren Perbandingan'}</p>
                    </Label>
                    <Switch id="mode-switch" checked={mode === 'trend'} onCheckedChange={(c) => setMode(c ? 'trend' : 'single')} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-2 w-full">
                    {(userRole === 'superadmin' || isHoldingAdmin) && <Select onValueChange={(v) => { setSelectedCompanyId(v); setSelectedDepartment('all'); setSelectedPosition('all'); }} value={selectedCompanyId ?? ""}><SelectTrigger className="h-10 min-w-[180px] bg-background"><Building className="size-3.5 mr-2 text-primary" /><SelectValue placeholder="Perusahaan" /></SelectTrigger><SelectContent className="z-[350]">{manageableCompanies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>}
                    <Select value={selectedDepartment} onValueChange={(v) => { setSelectedDepartment(v); setSelectedPosition('all'); }} disabled={!selectedCompanyId}><SelectTrigger className="h-10 min-w-[180px] bg-background"><Network className="size-3.5 mr-2 text-primary" /><SelectValue placeholder="Semua Departemen" /></SelectTrigger><SelectContent className="z-[350]"><SelectItem value="all">Semua Departemen</SelectItem>{uniqueCompanyDepartments.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent></Select>
                    {mode === 'single' ? 
                        <Select value={singlePeriod ?? ""} onValueChange={setSinglePeriod} disabled={!availablePeriods.length}><SelectTrigger className="h-10 min-w-[180px] bg-background"><Calendar className="size-3.5 mr-2 text-primary" /><SelectValue placeholder="Pilih Periode" /></SelectTrigger><SelectContent className="z-[350]">{availablePeriods.map(p => <SelectItem key={p} value={p}>{format(parse(p, 'yyyy-MM', new Date()), 'LLLL yyyy', { locale: localeId })}</SelectItem>)}</SelectContent></Select> : 
                        <><Select value={trendStartPeriod ?? ""} onValueChange={setTrendStartPeriod}><SelectTrigger className="h-10 min-w-[150px] bg-background"><Calendar className="size-3.5 mr-2 text-primary" /><SelectValue placeholder="Mulai" /></SelectTrigger><SelectContent className="z-[350]">{[...availablePeriods].sort().map(p => <SelectItem key={p} value={p}>{format(parse(p, 'yyyy-MM', new Date()), 'MMM yy', { locale: localeId })}</SelectItem>)}</SelectContent></Select><Select value={trendEndPeriod ?? ""} onValueChange={setTrendEndPeriod}><SelectTrigger className="h-10 min-w-[150px] bg-background"><Calendar className="size-3.5 mr-2 text-primary" /><SelectValue placeholder="Selesai" /></SelectTrigger><SelectContent className="z-[350]">{[...availablePeriods].sort().map(p => <SelectItem key={p} value={p}>{format(parse(p, 'yyyy-MM', new Date()), 'MMM yy', { locale: localeId })}</SelectItem>)}</SelectContent></Select></>}
                </div>
            </ResponsiveToolbar>

            {selectedCompanyName ? (
                <>
                    <AdaptiveCardGrid complexity="simple">
                        <AdaptiveMetricCard title="Rata-Rata Tim" value={teamStats.averageScore} icon={BarChart3} description="Seluruh personil terpilih" />
                        <AdaptiveMetricCard title="Capaian Tertinggi" value={teamStats.topPerformer.score} icon={TrendingUp} badge={teamStats.topPerformer.name} color="bg-emerald-500/10 text-emerald-600" />
                        <AdaptiveMetricCard title="Capaian Terendah" value={teamStats.lowestPerformer.score} icon={TrendingDown} badge={teamStats.lowestPerformer.name} color="bg-rose-500/10 text-rose-600" />
                        <AdaptiveMetricCard title="Total Personil" value={sortedReportData.length} icon={Users} description="Dalam filter saat ini" />
                    </AdaptiveCardGrid>
                    
                    <AdaptiveCardGrid complexity="complex">
                        <AdaptiveInsightCard title="Visualisasi Tren Kinerja" icon={TrendingUp} description="Perjalanan skor rata-rata bulanan">
                            <div className="h-[300px] pt-4"><TeamPerformanceTrendChart chartData={chartData} /></div>
                        </AdaptiveInsightCard>
                         {mode === 'trend' && (
                            <AdaptiveInsightCard title="Distribusi Status" icon={LayoutGrid} description="Berdasarkan status rata-rata terakhir">
                                <div className="h-[300px] pt-4"><DonutChart data={trendStats?.distribution as any} /></div>
                            </AdaptiveInsightCard>
                        )}
                    </AdaptiveCardGrid>
                    
                    <AdaptiveTable 
                        data={sortedReportData}
                        keyExtractor={(d: any) => d.id}
                        columns={[
                            { header: "Karyawan", cell: (d: any) => (
                                <div className="flex items-center gap-3">
                                    <Avatar className="size-9 border"><AvatarFallback className="text-[10px] font-black bg-primary/10 text-primary">{d.employeeName?.substring(0,2).toUpperCase()}</AvatarFallback></Avatar>
                                    <div className="min-w-0"><p className="font-bold text-slate-900 truncate">{d.employeeName}</p><p className="text-[10px] text-muted-foreground uppercase font-black">{d.position}</p></div>
                                </div>
                            )},
                            { header: mode === 'trend' ? "Skor Rata-Rata" : "Skor Periode", cell: (d: any) => <span className="text-lg font-black text-primary">{(d.averageScore ?? d.score).toFixed(1)}</span> },
                            { header: "Status / Tren", cell: (d: any) => (
                                mode === 'trend' ? <div className="flex items-center gap-2 font-bold text-xs">{getTrendIcon(d.personalTrend)} {d.personalTrend.toFixed(1)}%</div> : <Badge variant={getStatusBadgeVariant(d.status)} className="text-[9px] font-black uppercase h-5">{d.status}</Badge>
                            )},
                            { header: "Persetujuan", hideOnTablet: true, cell: (d: any) => <Badge variant="outline" className="text-[8px] font-bold border-none bg-muted/50">{mode === 'trend' ? `App: ${d.approvalStatusSummary}` : d.approvalStatus}</Badge> },
                            { header: "", className: "text-right", cell: (d: any) => (
                                <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-full"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="z-[350]">
                                    <DropdownMenuItem onClick={() => handleViewDetails(d)}><ArrowRight className="size-3.5 mr-2" /> Lihat Analisis</DropdownMenuItem>
                                    {mode === 'single' && <DropdownMenuItem onClick={() => handleApproveAchievement(d)} disabled={d.approvalStatus === 'Disetujui'}><ShieldCheck className="size-3.5 mr-2" /> Setujui KPI</DropdownMenuItem>}
                                </DropdownMenuContent></DropdownMenu>
                            )}
                        ]}
                        renderMobileCard={(d: any) => (
                            <Card className="border-border/40 shadow-sm overflow-hidden" onClick={() => handleViewDetails(d)}>
                                <CardContent className="p-4 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="size-10 border-2 border-primary/10"><AvatarFallback className="font-black text-xs">{d.employeeName?.substring(0,2).toUpperCase()}</AvatarFallback></Avatar>
                                            <div className="min-w-0"><h3 className="font-black text-sm truncate uppercase">{d.employeeName}</h3><p className="text-[10px] font-bold text-muted-foreground">{d.position}</p></div>
                                        </div>
                                        <div className="text-right"><p className="text-xl font-black text-primary leading-none">{(d.averageScore ?? d.score).toFixed(1)}</p><p className="text-[8px] font-black uppercase text-muted-foreground mt-1">SKOR</p></div>
                                    </div>
                                    <div className="flex items-center justify-between pt-3 border-t">
                                        <Badge variant={getStatusBadgeVariant(d.status || 'todo')} className="text-[8px] font-black uppercase h-5">{mode === 'trend' ? `TREN: ${d.personalTrend}%` : d.status}</Badge>
                                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase">LIHAT DETAIL <ArrowRight size={10} /></div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    />
                </>
            ) : (
                <div className="text-center text-slate-500 py-32 border-2 border-dashed rounded-3xl bg-muted/5">
                    <PageHeader title="Pilih Unit Bisnis" description="Silakan pilih perusahaan terlebih dahulu untuk menampilkan laporan agregat." icon={Search} />
                </div>
            )}
            {selectedKpiDataForDetail && (<ReportDetailView kpiData={selectedKpiDataForDetail} onClose={() => setSelectedKpiDataForDetail(null)} />)}
        </div>
    );
}

function IndividualAnalysisView() {
    const { currentUser, userRole } = useAuth();
    const { employees, companies, kpiData, departments, positions } = useMasterData();
    const router = useRouter();
    
    const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
    const [selectedDepartment, setSelectedDepartment] = useState("all");
    const [selectedPosition, setSelectedPosition] = useState("all");
    const [selectedEmployeeId, setSelectedEmployeeId] = useState("all");
    const [startPeriod, setStartPeriod] = useState<string>("");
    const [endPeriod, setEndPeriod] = useState<string>("");

    const manageableCompanies = useMemo(() => {
        if (userRole === 'superadmin') return companies.filter(c => c.status === 'Aktif');
        const userCompany = companies.find(c => c.name === currentUser?.company);
        if (userRole === 'manajemen' && userCompany?.isHolding) {
            const getDescendantCompanies = (parentId: string): any[] => {
                const children = companies.filter(c => c.parentId === parentId);
                return children.flatMap(c => [c, ...getDescendantCompanies(c.id)]);
            };
            return [userCompany, ...getDescendantCompanies(userCompany.id)];
        }
        if (userCompany) return [userCompany]; return [];
    }, [userRole, currentUser, companies]);

    useEffect(() => {
        if (userRole === 'superadmin' && companies.length > 0) {
            const activeCompanies = companies.filter(c => c.status === 'Aktif');
            if (activeCompanies.length > 0) setSelectedCompanyId(activeCompanies[0].id);
        } else if (currentUser) {
            const userCompanyData = companies.find(c => c.name === currentUser.company);
            setSelectedCompanyId(userCompanyData?.id || null);
        }
    }, [userRole, currentUser, companies]);

    const selectedCompanyName = useMemo(() => companies.find(c => c.id === selectedCompanyId)?.name, [selectedCompanyId, companies]);
    const filteredEmployees = useMemo(() => {
        if (!selectedCompanyName) return [];
        let base = employees.filter(e => e.company === selectedCompanyName && e.status === 'Aktif' && e.role !== 'superadmin');
        if (selectedDepartment !== "all") base = base.filter(e => e.department === selectedDepartment);
        if (selectedPosition !== "all") base = base.filter(e => e.position === selectedPosition);
        return base.sort((a, b) => a.name.localeCompare(b.name));
    }, [employees, selectedCompanyName, selectedDepartment, selectedPosition]);

    const availablePeriods = useMemo(() => {
        if (!kpiData || !selectedCompanyName) return [];
        return [...new Set(kpiData.filter(d => d.company === selectedCompanyName && d.period).map(d => d.period))].sort().reverse();
    }, [kpiData, selectedCompanyName]);

    const handleRunAnalysis = () => {
        if (selectedEmployeeId === 'all' || !startPeriod || !endPeriod) return;
        const employee = employees.find(e => e.id === selectedEmployeeId);
        if (employee) {
            sessionStorage.setItem('selectedEmployeeAnalysis', JSON.stringify({ employee, startPeriod, endPeriod }));
            router.push(`/reports/${employee.id}`);
        }
    };

    return (
        <Card className="border-2 border-primary/10 shadow-xl overflow-hidden rounded-2xl bg-background">
            <CardHeader className="bg-primary/5 p-8 border-b">
                <div className="flex items-center gap-4">
                    <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm"><UserSearch size={24} /></div>
                    <div className="space-y-1"><CardTitle className="text-2xl font-black tracking-tight">Simulator Performa Personal</CardTitle><CardDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Pilih karyawan dan rentang waktu untuk menjalankan analisa data.</CardDescription></div>
                </div>
            </CardHeader>
            <CardContent className="p-8 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Unit Bisnis</Label><Select onValueChange={(v) => { setSelectedCompanyId(v); setSelectedDepartment('all'); setSelectedEmployeeId('all'); }} value={selectedCompanyId ?? ""}><SelectTrigger className="h-12 font-bold"><SelectValue /></SelectTrigger><SelectContent className="z-[350]">{manageableCompanies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Karyawan</Label><Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId} disabled={filteredEmployees.length === 0}><SelectTrigger className="h-12 font-bold"><SelectValue placeholder="Pilih Karyawan..." /></SelectTrigger><SelectContent className="z-[350]">{filteredEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-primary tracking-widest">Mulai</Label><Select value={startPeriod} onValueChange={setStartPeriod}><SelectTrigger className="h-12 font-bold"><SelectValue placeholder="Pilih Bulan..." /></SelectTrigger><SelectContent className="z-[350]">{[...availablePeriods].reverse().map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-primary tracking-widest">Selesai</Label><Select value={endPeriod} onValueChange={setEndPeriod}><SelectTrigger className="h-12 font-bold"><SelectValue placeholder="Pilih Bulan..." /></SelectTrigger><SelectContent className="z-[350]">{[...availablePeriods].reverse().map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <Button onClick={handleRunAnalysis} disabled={selectedEmployeeId === 'all' || !startPeriod || !endPeriod} className="w-full h-12 font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20"><TrendingUp size={16} className="mr-2" /> Jalankan Analisis Performa</Button>
            </CardContent>
        </Card>
    );
}

export function ReportDetailView({ kpiData, onClose }: { kpiData: KpiData, onClose: () => void }) {
    const [isExpanded, setIsExpanded] = useState(false);
    useEffect(() => { const body = document.body; body.style.overflow = 'hidden'; return () => { body.style.overflow = 'auto' }; }, []);
    return createPortal(
        <div className="fixed inset-0 z-[500] flex justify-end bg-black/60 backdrop-blur-sm">
            <div className={cn("relative flex flex-col bg-background text-foreground shadow-2xl h-full max-h-screen transition-all duration-300", isExpanded ? "w-full" : "w-full sm:w-[600px] lg:w-[45%]")}>
                <div className="flex items-center justify-between p-4 border-b bg-slate-50 sticky top-0 z-10">
                    <h2 className="font-bold text-slate-800">Pratinjau Laporan Kinerja</h2>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="hidden sm:flex" onClick={() => setIsExpanded(!isExpanded)}>{isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</Button>
                        <Button variant="ghost" size="icon" onClick={onClose}><X size={18} /></Button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto"><AchievementDetailContent kpiData={kpiData} isDialog={true} /></div>
            </div>
        </div>,
        document.body
    );
}

export default function ReportsPage() {
    const { setPageContext } = usePageContext();
    const [activeTab, setActiveTab] = useState("team");
    useEffect(() => { setPageContext('Pusat Analisis Laporan', null); }, [setPageContext]);

    return (
      <ResponsivePage>
        <PageHeader title="Pusat Analisis Laporan" description="Monitor pencapaian target dan analisis tren pertumbuhan kinerja di seluruh unit bisnis." icon={FilePieChart} />
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-[400px] bg-muted/30 p-1 rounded-xl mb-6">
                <TabsTrigger value="team" className="font-bold text-xs rounded-lg uppercase tracking-tight">Laporan Agregat Tim</TabsTrigger>
                <TabsTrigger value="individual" className="font-bold text-xs rounded-lg uppercase tracking-tight">Analisa Individu</TabsTrigger>
            </TabsList>
            <TabsContent value="team" className="m-0 border-none space-y-6"><TeamReportView /></TabsContent>
            <TabsContent value="individual" className="m-0 border-none"><IndividualAnalysisView /></TabsContent>
        </Tabs>
      </ResponsivePage>
    );
}
