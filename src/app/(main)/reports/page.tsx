
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
import Link from "next/link";
import { usePageContext } from "@/contexts/page-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DonutChart } from "@/components/reports/donut-chart";
import { useIsMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const PageHeader = ({ title, description }: { title: string, description: string | null }) => (
    <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
    </div>
);

const StatBlock = ({ title, value, description, icon: Icon, iconColor }: { title: string, value: string, description: string, icon: any, iconColor?: string }) => (
    <div className="p-4">
        <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
            <Icon className={`size-4 ${iconColor || 'text-slate-400'}`} />
        </div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500 mt-1">{description}</p>
    </div>
);

function TeamReportView() {
    const { currentUser, userRole } = useAuth();
    const { kpiData, companies, employees, updateKpiData, departments, positions } = useMasterData();
    const { toast } = useToast();
    const isMobile = useIsMobile();
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
            const userCompanyData = companies.find(c => c.name === currentUser.company);
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
                approvalStatus: `${allData.filter(d => d.approvalStatus === 'Disetujui').length}/${allData.length}`,
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
    useEffect(() => { setSelectedKpiDataForDetail(null); }, [selectedCompanyId, selectedDepartment, setSelectedPosition, singlePeriod, trendStartPeriod, trendEndPeriod, mode]);

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
            if (isMobile) { sessionStorage.setItem('selectedKpiDetail', JSON.stringify(data)); router.push(`/reports/detail/${data.id}`); }
            else { setSelectedKpiDataForDetail(data); }
        } else if (data.employee && trendStartPeriod && trendEndPeriod) {
            sessionStorage.setItem('selectedEmployeeAnalysis', JSON.stringify({ employee: data.employee, startPeriod: trendStartPeriod, endPeriod: trendEndPeriod }));
            router.push(`/reports/${data.employee.id}`);
        }
    };
    
    const getStatusBadgeVariant = (status: string) => status === 'Melampaui Target' ? 'default' : status === 'Mencapai Target' ? 'secondary' : 'destructive';
    const getTrendIcon = (trend: number) => trend > 0.1 ? <TrendingUp className="size-4 text-green-500" /> : trend < -0.1 ? <TrendingDown className="size-4 text-red-500" /> : <ArrowRight className="size-4 text-slate-400" />;

    return (
        <div className="space-y-4">
            <div className="p-4 border border-slate-200 rounded-lg">
                <div className="flex justify-between items-start mb-4">
                    <Label htmlFor="mode-switch" className="space-y-1">
                        <span className="font-semibold text-slate-800">Mode Analisis</span>
                        <span className="text-sm text-slate-500">{mode === 'single' ? 'Laporan periode tunggal.' : 'Tren perbandingan antar periode.'}</span>
                    </Label>
                    <Switch id="mode-switch" checked={mode === 'trend'} onCheckedChange={(c) => setMode(c ? 'trend' : 'single')} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-2">
                    {(userRole === 'superadmin' || isHoldingAdmin) && <Select onValueChange={(v) => { setSelectedCompanyId(v); setSelectedDepartment('all'); setSelectedPosition('all'); }} value={selectedCompanyId ?? ""}><SelectTrigger className="h-10 min-w-[180px]"><SelectValue placeholder="Pilih Perusahaan" /></SelectTrigger><SelectContent>{manageableCompanies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>}
                    <Select value={selectedDepartment} onValueChange={(v) => { setSelectedDepartment(v); setSelectedPosition('all'); }} disabled={!selectedCompanyId}><SelectTrigger className="h-10 min-w-[180px]"><SelectValue placeholder="Semua Departemen" /></SelectTrigger><SelectContent><SelectItem value="all">Semua Departemen</SelectItem>{uniqueCompanyDepartments.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent></Select>
                    <Select value={selectedPosition} onValueChange={setSelectedPosition} disabled={!selectedDepartment}><SelectTrigger className="h-10 min-w-[180px]"><SelectValue placeholder="Semua Jabatan" /></SelectTrigger><SelectContent><SelectItem value="all">Semua Jabatan</SelectItem>{uniqueCompanyPositions.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent></Select>
                    {mode === 'single' ? 
                        <Select value={singlePeriod ?? ""} onValueChange={setSinglePeriod} disabled={!availablePeriods.length}><SelectTrigger className="h-10 min-w-[180px]"><SelectValue placeholder="Periode" /></SelectTrigger><SelectContent>{availablePeriods.map(p => <SelectItem key={p} value={p}>{format(parse(p, 'yyyy-MM', new Date()), 'LLLL yyyy', { locale: localeId })}</SelectItem>)}</SelectContent></Select> : 
                        <><Select value={trendStartPeriod ?? ""} onValueChange={setTrendStartPeriod}><SelectTrigger className="h-10 min-w-[180px]"><SelectValue placeholder="Periode Mulai" /></SelectTrigger><SelectContent>{[...availablePeriods].sort().map(p => <SelectItem key={p} value={p}>{format(parse(p, 'yyyy-MM', new Date()), 'LLLL yyyy', { locale: localeId })}</SelectItem>)}</SelectContent></Select><Select value={trendEndPeriod ?? ""} onValueChange={setTrendEndPeriod}><SelectTrigger className="h-10 min-w-[180px]"><SelectValue placeholder="Periode Selesai" /></SelectTrigger><SelectContent>{[...availablePeriods].sort().map(p => <SelectItem key={p} value={p}>{format(parse(p, 'yyyy-MM', new Date()), 'LLLL yyyy', { locale: localeId })}</SelectItem>)}</SelectContent></Select></>}
                </div>
            </div>

            {selectedCompanyName ? (
                <div className="space-y-4 pt-4 border-t border-slate-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-slate-200 rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
                        <StatBlock title="Rata-Rata Skor Tim" value={teamStats.averageScore.toString()} icon={BarChart3} description="Selama periode terpilih" />
                        <StatBlock title="Performa Tertinggi" value={teamStats.topPerformer.name} icon={TrendingUp} description={`Skor: ${teamStats.topPerformer.score}`} iconColor="text-emerald-500" />
                        <StatBlock title="Performa Terendah" value={teamStats.lowestPerformer.name} icon={TrendingDown} description={`Skor: ${teamStats.lowestPerformer.score}`} iconColor="text-rose-500" />
                        <StatBlock title="Jumlah Karyawan" value={sortedReportData.length.toString()} icon={Users} description="Dalam filter terpilih" />
                    </div>
                    
                    <div className={cn("grid grid-cols-1 gap-4", mode === 'trend' ? "lg:grid-cols-5" : "lg:grid-cols-1")}>
                        <div className={cn("h-[300px]", mode === 'trend' ? "lg:col-span-3" : "lg:col-span-1")}>
                           <h3 className="text-sm font-semibold text-slate-600 mb-2">Perjalanan Kinerja Tim</h3>
                           <TeamPerformanceTrendChart key={`${selectedCompanyId}-${selectedDepartment}-${selectedPosition}`} chartData={chartData} />
                        </div>
                         {mode === 'trend' && (
                            <div className="lg:col-span-2 h-[300px]">
                                <h3 className="text-sm font-semibold text-slate-600 mb-2">Distribusi Status</h3>
                                <p className="text-xs text-slate-500 mb-3">Berdasarkan status terakhir karyawan.</p>
                                <DonutChart data={trendStats?.distribution as any} />
                            </div>
                        )}
                    </div>
                    
                    <div className="pt-4 border-t border-slate-200">
                         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                            <div>
                                <h2 className="text-base font-bold text-slate-800">Detail Kinerja Karyawan</h2>
                                <p className="text-sm text-slate-500">Menampilkan {sortedReportData.length} hasil untuk periode terpilih.</p>
                            </div>
                            <div className="flex items-center gap-2 self-end sm:self-center">
                                {isManager && (<Button asChild variant="outline" size="sm" className="border-slate-300"><Link href="/my-performance"><UserCog className="mr-2 h-4 w-4" />Performa Saya</Link></Button>)}
                            </div>
                        </div>
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50"><TableRow>
                                    <TableHead className="pl-4">Karyawan</TableHead>
                                    <TableHead className="hidden md:table-cell">Jabatan</TableHead>
                                    {mode === 'trend' ? (<><TableHead>Skor Rata-Rata</TableHead><TableHead className="hidden xl:table-cell">Tren</TableHead><TableHead className="hidden sm:table-cell">Persetujuan</TableHead></>) : (<><TableHead>Skor</TableHead><TableHead>Status</TableHead><TableHead className="hidden sm:table-cell">Persetujuan</TableHead></>)}
                                    <TableHead><span className="sr-only">Aksi</span></TableHead>
                                </TableRow></TableHeader>
                                <TableBody>{sortedReportData.length > 0 ? (sortedReportData.map((data: any) => (
                                    <TableRow key={data.id} onClick={() => handleViewDetails(data)} className="cursor-pointer hover:bg-slate-50">
                                        <TableCell className="pl-4"><div className="flex items-center gap-3">
                                            <div className="hidden h-9 w-9 sm:flex items-center justify-center rounded-full bg-slate-200"><User className="size-5 text-slate-500" /></div>
                                            <div><div className="font-medium text-sm text-slate-900">{data.employeeName || data.name}</div><div className="text-xs text-slate-500 sm:hidden">{data.position}</div></div>
                                        </div></TableCell>
                                        <TableCell className="hidden md:table-cell text-sm text-slate-600">{data.position}</TableCell>
                                        {mode === 'trend' ? (<>
                                            <TableCell className="font-semibold text-sm">{data.averageScore.toFixed(1)}</TableCell>
                                            <TableCell className="hidden xl:table-cell"><div className="flex items-center gap-1 font-medium text-xs">{getTrendIcon(data.personalTrend)} {data.personalTrend.toFixed(1)}%</div></TableCell>
                                            <TableCell className="hidden sm:table-cell"><Badge variant="secondary">{data.approvalStatus}</Badge></TableCell>
                                        </>) : (<>
                                            <TableCell className="font-semibold text-sm">{data.score.toFixed(1)}</TableCell>
                                            <TableCell><Badge variant={getStatusBadgeVariant(data.status)}>{data.status}</Badge></TableCell>
                                            <TableCell className="hidden sm:table-cell"><Badge variant={data.approvalStatus === 'Disetujui' ? 'outline' : 'destructive'} className="flex items-center gap-1.5 w-fit">{data.approvalStatus === 'Disetujui' ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}{data.approvalStatus}</Badge></TableCell>
                                        </>)}
                                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu><DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Buka</span></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end"><DropdownMenuLabel>Aksi</DropdownMenuLabel>
                                                {mode === 'single' && <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleApproveAchievement(data); }} disabled={data.approvalStatus === 'Disetujui'}><ShieldCheck className="mr-2 h-4 w-4" />Setujui</DropdownMenuItem>}
                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewDetails(data); }}>Lihat {mode === 'trend' ? 'Analisis' : 'Rincian'}</DropdownMenuItem>
                                            </DropdownMenuContent></DropdownMenu></TableCell>
                                    </TableRow>
                                ))) : (<TableRow><TableCell colSpan={7} className="text-center h-24 text-slate-500 text-sm">Tidak ada data yang ditemukan.</TableCell></TableRow>)}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            ) : (<div className="text-center text-slate-500 py-20 border border-dashed rounded-lg"><p>Silakan pilih perusahaan untuk menampilkan laporan.</p></div>)}
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

    const userCompany = useMemo(() => companies.find(c => c.name === currentUser?.company), [companies, currentUser]);
    const isHoldingAdmin = useMemo(() => userRole === 'manajemen' && !!userCompany?.isHolding, [userRole, userCompany]);
    const isManager = useMemo(() => (userRole === 'manajemen' || userRole === 'user') && employees.some(e => e.reportsTo === currentUser?.id), [userRole, currentUser, employees]);

    const manageableCompanies = useMemo(() => {
        if (userRole === 'superadmin') return companies.filter(c => c.status === 'Aktif');
        if (isHoldingAdmin && userCompany) {
            const getDescendantCompanies = (parentId: string): any[] => {
                const children = companies.filter(c => c.parentId === parentId);
                return children.flatMap(c => [c, ...getDescendantCompanies(c.id)]);
            };
            return [userCompany, ...getDescendantCompanies(userCompany.id)];
        }
        if (userCompany) return [userCompany]; return [];
    }, [userRole, isHoldingAdmin, userCompany, companies]);

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

    const uniqueCompanyDepartments = useMemo(() => !selectedCompanyName ? [] : [...new Map(departments.filter(d => d.company === selectedCompanyName).map(d => [d.name, d])).values()], [selectedCompanyName, departments]);
    const uniqueCompanyPositions = useMemo(() => !selectedCompanyName ? [] : [...new Map(positions.filter(p => p.company === selectedCompanyName && (selectedDepartment === 'all' || p.department === selectedDepartment)).map(p => [p.name, p])).values()], [selectedCompanyName, selectedDepartment, positions]);

    const filteredEmployees = useMemo(() => {
        if (!selectedCompanyName) return [];
        let base = employees.filter(e => e.company === selectedCompanyName && e.status === 'Aktif' && e.role !== 'superadmin');

        if (isManager && !isHoldingAdmin && currentUser) {
            const getSubordinateIds = (managerId: string): string[] => [managerId, ...employees.filter(e => e.reportsTo === managerId).flatMap(e => getSubordinateIds(e.id))];
            const teamIds = new Set(getSubordinateIds(currentUser.id));
            base = base.filter(e => teamIds.has(e.id));
        }

        if (selectedDepartment !== "all") base = base.filter(e => e.department === selectedDepartment);
        if (selectedPosition !== "all") base = base.filter(e => e.position === selectedPosition);

        return base.sort((a, b) => a.name.localeCompare(b.name));
    }, [employees, selectedCompanyName, selectedDepartment, selectedPosition, isManager, isHoldingAdmin, currentUser]);

    const availablePeriods = useMemo(() => {
        if (!kpiData || !selectedCompanyName) return [];
        return [...new Set(kpiData.filter(d => d.company === selectedCompanyName && d.period).map(d => d.period))].sort().reverse();
    }, [kpiData, selectedCompanyName]);

    useEffect(() => {
        if (availablePeriods.length > 0 && !startPeriod) {
            const sorted = [...availablePeriods].sort();
            setStartPeriod(sorted[Math.max(0, sorted.length - 6)]);
            setEndPeriod(sorted[sorted.length - 1]);
        }
    }, [availablePeriods, startPeriod]);

    const handleRunAnalysis = () => {
        if (selectedEmployeeId === 'all' || !startPeriod || !endPeriod) return;
        const employee = employees.find(e => e.id === selectedEmployeeId);
        if (employee) {
            sessionStorage.setItem('selectedEmployeeAnalysis', JSON.stringify({
                employee,
                startPeriod,
                endPeriod
            }));
            router.push(`/reports/${employee.id}`);
        }
    };

    return (
        <Card className="border-2 border-primary/20 shadow-xl overflow-hidden rounded-2xl animate-fade-in">
            <CardHeader className="bg-primary/5 p-5 sm:p-8 border-b border-primary/10">
                <div className="flex items-center gap-4">
                    <div className="size-10 sm:size-12 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm shrink-0">
                        <UserSearch size={20} className="sm:size-6" />
                    </div>
                    <div className="space-y-1">
                        <CardTitle className="text-xl sm:text-2xl font-black tracking-tight text-slate-800">Filter Analisis Kinerja Individu</CardTitle>
                        <CardDescription className="text-slate-500 font-medium text-xs sm:text-sm">Pilih karyawan dan rentang waktu untuk melihat analisis kinerja.</CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-5 sm:p-8 space-y-6 sm:space-y-10 bg-background">
                {/* Row 1: The Selects */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    <div className="space-y-2">
                        <Label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Building size={12} /> Perusahaan
                        </Label>
                        <Select 
                            onValueChange={(v) => { setSelectedCompanyId(v); setSelectedDepartment('all'); setSelectedPosition('all'); setSelectedEmployeeId('all'); }} 
                            value={selectedCompanyId ?? ""}
                        >
                            <SelectTrigger className="h-10 sm:h-12 border-slate-200 bg-slate-50/50 font-bold focus:ring-primary/20 text-xs sm:text-sm">
                                <SelectValue placeholder="Pilih Perusahaan" />
                            </SelectTrigger>
                            <SelectContent className="z-[300]">
                                {manageableCompanies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Network size={12} /> Departemen
                        </Label>
                        <Select 
                            value={selectedDepartment} 
                            onValueChange={(v) => { setSelectedDepartment(v); setSelectedPosition('all'); setSelectedEmployeeId('all'); }} 
                            disabled={!selectedCompanyId}
                        >
                            <SelectTrigger className="h-10 sm:h-12 border-slate-200 bg-slate-50/50 font-bold focus:ring-primary/20 text-xs sm:text-sm">
                                <SelectValue placeholder="Pilih Departemen" />
                            </SelectTrigger>
                            <SelectContent className="z-[300]">
                                <SelectItem value="all">Semua Departemen</SelectItem>
                                {uniqueCompanyDepartments.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Briefcase size={12} /> Jabatan
                        </Label>
                        <Select 
                            value={selectedPosition} 
                            onValueChange={(v) => { setSelectedPosition(v); setSelectedEmployeeId('all'); }} 
                            disabled={selectedDepartment === 'all'}
                        >
                            <SelectTrigger className="h-10 sm:h-12 border-slate-200 bg-slate-50/50 font-bold focus:ring-primary/20 text-xs sm:text-sm">
                                <SelectValue placeholder="Pilih Jabatan" />
                            </SelectTrigger>
                            <SelectContent className="z-[300]">
                                <SelectItem value="all">Semua Jabatan</SelectItem>
                                {uniqueCompanyPositions.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <User size={12} /> Karyawan
                        </Label>
                        <Select 
                            value={selectedEmployeeId} 
                            onValueChange={setSelectedEmployeeId} 
                            disabled={filteredEmployees.length === 0}
                        >
                            <SelectTrigger className="h-10 sm:h-12 border-slate-200 bg-slate-50/50 font-bold focus:ring-primary/20 text-xs sm:text-sm">
                                <SelectValue placeholder="Pilih Karyawan" />
                            </SelectTrigger>
                            <SelectContent className="z-[300]">
                                <SelectItem value="all">Pilih Karyawan</SelectItem>
                                {filteredEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Row 2: Periods & Action */}
                <div className="p-5 sm:p-8 rounded-2xl bg-muted/20 border border-dashed border-primary/20 relative group">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-end">
                        <div className="md:col-span-4 space-y-2">
                            <Label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-primary ml-1">Periode Mulai</Label>
                            <Select value={startPeriod} onValueChange={setStartPeriod} disabled={availablePeriods.length === 0}>
                                <SelectTrigger className="h-10 sm:h-12 bg-background border-slate-200 font-bold text-xs sm:text-sm">
                                    <Calendar className="size-4 mr-2 text-slate-400" />
                                    <SelectValue placeholder="Pilih Bulan..." />
                                </SelectTrigger>
                                <SelectContent className="z-[300]">
                                    {[...availablePeriods].reverse().map(p => (
                                        <SelectItem key={`start-${p}`} value={p}>{format(parse(p, 'yyyy-MM', new Date()), 'MMMM yyyy', { locale: localeId })}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="md:col-span-4 space-y-2">
                            <Label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-primary ml-1">Periode Selesai</Label>
                            <Select value={endPeriod} onValueChange={setEndPeriod} disabled={availablePeriods.length === 0}>
                                <SelectTrigger className="h-10 sm:h-12 bg-background border-slate-200 font-bold text-xs sm:text-sm">
                                    <Calendar className="size-4 mr-2 text-slate-400" />
                                    <SelectValue placeholder="Pilih Bulan..." />
                                </SelectTrigger>
                                <SelectContent className="z-[300]">
                                    {[...availablePeriods].reverse().map(p => (
                                        <SelectItem key={`end-${p}`} value={p}>{format(parse(p, 'yyyy-MM', new Date()), 'MMMM yyyy', { locale: localeId })}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="md:col-span-4">
                            <Button 
                                onClick={handleRunAnalysis}
                                disabled={selectedEmployeeId === 'all' || !startPeriod || !endPeriod}
                                className="w-full h-10 sm:h-12 font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-xl shadow-primary/20 group-hover:scale-[1.01] transition-all duration-300"
                            >
                                <TrendingUp className="mr-2 size-4" />
                                Jalankan Analisis
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function ReportDetailView({ kpiData, onClose }: { kpiData: KpiData, onClose: () => void }) {
    const [isExpanded, setIsExpanded] = useState(false);
    useEffect(() => { const body = document.body; body.style.overflow = 'hidden'; return () => { body.style.overflow = 'auto' }; }, []);
    return createPortal(
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-sm">
            <div className={cn("relative flex flex-col bg-background text-foreground shadow-2xl h-full max-h-screen transition-all duration-300", isExpanded ? "w-full" : "w-full sm:w-[550px] lg:w-[40%]")}>
                <div className="flex items-center justify-between p-4 border-b bg-slate-50 sticky top-0 z-10">
                    <h2 className="font-semibold text-slate-800">Detail Pencapaian</h2>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} title={isExpanded ? "Kecilkan" : "Perlebar"} className="hidden sm:inline-flex">{isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</Button>
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
    const pageTitleText = 'Laporan Kinerja';
    const pageDescription = 'Analisis kinerja tim dan individu berdasarkan KPI.';

    useEffect(() => { setPageContext(pageTitleText, null); }, [setPageContext, pageTitleText]);

    return (
      <div className="space-y-4">
        <PageHeader title={pageTitleText} description={pageDescription} />
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-[400px] gap-1 bg-slate-100 p-1 rounded-full">
                <TabsTrigger value="team" className={cn("font-semibold rounded-full transition-all text-sm duration-300 h-9", activeTab === 'team' ? 'bg-white text-slate-900 shadow-sm' : 'bg-transparent text-slate-600 hover:text-slate-900')}>Laporan Tim</TabsTrigger>
                <TabsTrigger value="individual" className={cn("font-semibold rounded-full transition-all text-sm duration-300 h-9", activeTab === 'individual' ? 'bg-white text-slate-900 shadow-sm' : 'bg-transparent text-slate-600 hover:text-slate-900')}>Analisis Individu</TabsTrigger>
            </TabsList>
            <TabsContent value="team" className="mt-4 animate-in fade-in slide-in-from-bottom-1 duration-200">
                <TeamReportView />
            </TabsContent>
            <TabsContent value="individual" className="mt-4 animate-in fade-in slide-in-from-bottom-1 duration-200">
                <IndividualAnalysisView />
            </TabsContent>
        </Tabs>
      </div>
    );
}
