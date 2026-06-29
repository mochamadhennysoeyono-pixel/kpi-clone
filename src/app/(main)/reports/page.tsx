
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
  BarChartBig,
  ShieldCheck,
  ShieldAlert,
  UserCog,
  Wand2,
  X,
  Maximize2,
  Minimize2,
  CalendarIcon,
  PieChart,
  ArrowRight,
  FilePieChart,
  Building,
  Filter,
} from "lucide-react";
import { useMasterData } from "@/contexts/master-data-context";
import type { KpiData, Company, Employee, PerformanceStatus } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { AchievementDetailDialog as AchievementDetailContent } from "@/components/reports/achievement-detail-dialog";
import StatCard from "@/components/dashboard/stat-card";
import TeamPerformanceTrendChart from "@/components/reports/team-performance-trend-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { format, parse, isBefore, addMonths, subMonths, startOfMonth, isValid } from "date-fns";
import { id as localeId } from "date-fns/locale";
import Link from "next/link";
import { ScenarioPlannerDialog } from "@/components/reports/scenario-planner-dialog";
import { usePageContext } from "@/contexts/page-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DonutChart } from "@/components/reports/donut-chart";
import { useIsMobile } from "@/hooks/use-mobile";

// =================================================================
// 1. VIEW UNTUK LAPORAN TIM
// =================================================================
function TeamReportView() {
    const { currentUser, userRole } = useAuth();
    const { kpiData, companies, employees, updateKpiData, departments, positions } = useMasterData();
    const { toast } = useToast();
    const isMobile = useIsMobile();
    const router = useRouter();
    
    // --- State Management ---
    const [mode, setMode] = useState<'single' | 'trend'>('single');
    const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
    const [selectedDepartment, setSelectedDepartment] = useState("all");
    const [selectedPosition, setSelectedPosition] = useState("all");
    const [selectedKpiDataForDetail, setSelectedKpiDataForDetail] = useState<KpiData | null>(null);
    const [isScenarioPlannerOpen, setIsScenarioPlannerOpen] = useState(false);

    // Single mode state
    const [singlePeriod, setSinglePeriod] = useState<string | null>(null);
    
    // Trend mode states
    const [trendStartPeriod, setTrendStartPeriod] = useState<string | null>(null);
    const [trendEndPeriod, setTrendEndPeriod] = useState<string | null>(null);

    // --- Data Filtering & Computation ---
    const userCompany = useMemo(() => companies.find(c => c.name === currentUser?.company), [companies, currentUser]);
    const isHoldingAdmin = useMemo(() => userRole === 'manajemen' && !!userCompany?.isHolding, [userRole, userCompany]);
    const isManager = useMemo(() => (userRole === 'manajemen' || userRole === 'user') && employees.some(e => e.reportsTo === currentUser?.id), [userRole, currentUser, employees]);
    
    const showScenarioPlanner = useMemo(() => {
        if (userRole === 'superadmin') return true;
        return !!userCompany?.features?.hasScenarioPlanner;
    }, [userRole, userCompany]);

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
        
        if (mode === 'single' && !singlePeriod) {
            setSinglePeriod(availablePeriods[0]);
        } else if (mode === 'trend' && (!trendStartPeriod || !trendEndPeriod)) {
             const sortedPeriods = [...availablePeriods].sort();
             if (sortedPeriods.length > 0) {
                const latestPeriod = sortedPeriods[sortedPeriods.length - 1];
                setTrendEndPeriod(latestPeriod);
                
                const endPeriodDate = parse(latestPeriod, 'yyyy-MM', new Date());
                const defaultStartPeriod = format(startOfMonth(subMonths(endPeriodDate, 2)), 'yyyy-MM');

                const bestStart = sortedPeriods.find(p => p >= defaultStartPeriod) || sortedPeriods[0];
                setTrendStartPeriod(bestStart);
             }
        }
    }, [mode, availablePeriods, singlePeriod, trendStartPeriod, trendEndPeriod]);
    
    const getDateRanges = useCallback(() => {
        if (mode !== 'trend' || !trendStartPeriod || !trendEndPeriod) {
            return { currentPeriods: [], previousPeriods: [] };
        }
    
        let startPeriodDate = parse(trendStartPeriod, 'yyyy-MM', new Date());
        let endPeriodDate = parse(trendEndPeriod, 'yyyy-MM', new Date());
        
        if (!isValid(startPeriodDate) || !isValid(endPeriodDate)) {
            return { currentPeriods: [], previousPeriods: [] };
        }
    
        if (isBefore(endPeriodDate, startPeriodDate)) {
            [startPeriodDate, endPeriodDate] = [endPeriodDate, startPeriodDate];
        }
    
        const getCurrentPeriods = (start: Date, end: Date): string[] => {
            const periods = [];
            let current = startOfMonth(start);
            const currentPeriodEnd = startOfMonth(end);
            while (current <= currentPeriodEnd) {
                periods.push(format(current, 'yyyy-MM'));
                current = addMonths(current, 1);
            }
            return periods;
        };
    
        const currentPeriods = getCurrentPeriods(startPeriodDate, endPeriodDate);
        const periodCount = currentPeriods.length;
        const previousEndDate = subMonths(startPeriodDate, 1);
        const previousStartDate = subMonths(startPeriodDate, periodCount);
        
        const previousPeriods = getCurrentPeriods(previousStartDate, previousEndDate);
        
        return { currentPeriods, previousPeriods };
    }, [mode, trendStartPeriod, trendEndPeriod]);
    
    const { reportData, trendStats } = useMemo(() => {
        if (!selectedCompanyName) return { reportData: [], trendStats: {} };

        if (mode === 'single') {
            let singlePeriodData = singlePeriod ? kpiData.filter(d => d.period === singlePeriod && d.company === selectedCompanyName) : [];
            
            if (selectedDepartment !== "all") {
                singlePeriodData = singlePeriodData.filter(d => d.department === selectedDepartment);
            }
            if (selectedPosition !== "all") {
                singlePeriodData = singlePeriodData.filter(d => d.position === selectedPosition);
            }

             if (isManager && !isHoldingAdmin && currentUser) {
                const getSubordinateIdsRecursive = (managerId: string): string[] => {
                    const directReports = employees.filter(e => e.reportsTo === managerId).map(e => e.id);
                    if (directReports.length === 0) return [];
                    return [...directReports, ...directReports.flatMap(id => getSubordinateIdsRecursive(id))];
                };
                const teamIds = [currentUser.id, ...getSubordinateIdsRecursive(currentUser.id)];
                singlePeriodData = singlePeriodData.filter(d => teamIds.includes(d.employeeId));
            }

            const finalData = singlePeriodData.map(d => ({
                ...d,
                employee: employees.find(e => e.id === d.employeeId),
            }));

            return { reportData: finalData, trendStats: {} };
        }

        const { currentPeriods, previousPeriods } = getDateRanges();
        
        const filterDataByPeriods = (periods: string[]): KpiData[] => {
            if (!periods || periods.length === 0) return [];
            return kpiData.filter(data =>
                data.company === selectedCompanyName &&
                (selectedDepartment === "all" || data.department === selectedDepartment) &&
                (selectedPosition === "all" || data.position === selectedPosition) &&
                periods.includes(data.period)
            );
        };
        
        let periodData = filterDataByPeriods(currentPeriods);
        let trendComparisonData = filterDataByPeriods(previousPeriods);

        if (isManager && !isHoldingAdmin && currentUser) {
             const getSubordinateIdsRecursive = (managerId: string): string[] => {
                const directReports = employees.filter(e => e.reportsTo === managerId).map(e => e.id);
                if (directReports.length === 0) return [];
                return [...directReports, ...directReports.flatMap(id => getSubordinateIdsRecursive(id))];
            };
            const teamIds = [currentUser.id, ...getSubordinateIdsRecursive(currentUser.id)];
            periodData = periodData.filter(d => teamIds.includes(d.employeeId));
            trendComparisonData = trendComparisonData.filter(d => teamIds.includes(d.employeeId));
        }

        const employeeScores = new Map<string, { scores: number[], latestData: KpiData | null }>();
        periodData.forEach(d => {
            if (!employeeScores.has(d.employeeId)) employeeScores.set(d.employeeId, { scores: [], latestData: null });
            
            const currentEntry = employeeScores.get(d.employeeId)!;
            currentEntry.scores.push(d.score);
            
            if (!currentEntry.latestData || d.period > currentEntry.latestData.period) {
                currentEntry.latestData = d;
            }
        });
        
        const employeePreviousScores = new Map<string, number[]>();
        trendComparisonData.forEach(d => {
             if (!employeePreviousScores.has(d.employeeId)) employeePreviousScores.set(d.employeeId, []);
             employeePreviousScores.get(d.employeeId)!.push(d.score);
        });

        const reportData = Array.from(employeeScores.entries()).map(([employeeId, data]) => {
            const employee = employees.find(e => e.id === employeeId);
            const averageScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;

            const previousScores = employeePreviousScores.get(employeeId) || [];
            const previousAverage = previousScores.length > 0 ? previousScores.reduce((a, b) => a + b, 0) / previousScores.length : 0;
            const trend = previousAverage > 0 ? ((averageScore - previousAverage) / previousAverage) * 100 : (averageScore > 0 ? 100 : 0);

            const allEmployeeData = periodData.filter(d => d.employeeId === employeeId);
            const approvedCount = allEmployeeData.filter(d => d.approvalStatus === 'Disetujui').length;

            return {
                ...data.latestData,
                id: employeeId,
                score: data.latestData?.score,
                averageScore: parseFloat(averageScore.toFixed(1)),
                latestScore: data.latestData?.score ?? 0,
                approvalStatus: `${approvedCount}/${allEmployeeData.length}`,
                isLatestApproved: data.latestData?.approvalStatus === 'Disetujui',
                personalTrend: parseFloat(trend.toFixed(1)),
                employee,
            };
        });

        const currentAvg = periodData.length > 0 ? periodData.reduce((sum, d) => sum + d.score, 0) / periodData.length : 0;
        const previousAvg = trendComparisonData.length > 0 ? trendComparisonData.reduce((sum, d) => sum + d.score, 0) / trendComparisonData.length : 0;
        const performanceTrend = previousAvg > 0 ? ((currentAvg - previousAvg) / previousAvg) * 100 : (currentAvg > 0 ? 100 : 0);

        const uniqueEmployeesMap = new Map<string, KpiData>();
        periodData.forEach(d => {
            if (!uniqueEmployeesMap.has(d.employeeId) || d.period > uniqueEmployeesMap.get(d.employeeId)!.period) {
                uniqueEmployeesMap.set(d.employeeId, d);
            }
        });
        
        const distribution = Array.from(uniqueEmployeesMap.values()).reduce((acc, d) => {
            if (d.status === "Melampaui Target") acc.exceeds++;
            else if (d.status === "Mencapai Target") acc.achieves++;
            else acc.needs++;
            return acc;
        }, { exceeds: 0, achieves: 0, needs: 0 });

        return { reportData, trendStats: { performanceTrend, distribution } };

    }, [kpiData, selectedCompanyName, mode, singlePeriod, trendStartPeriod, trendEndPeriod, selectedDepartment, selectedPosition, employees, currentUser, getDateRanges, isHoldingAdmin, isManager]);
    
    const chartData = useMemo(() => {
        const teamMemberIds = new Set<string>();
        let baseData = kpiData;

        if (selectedCompanyName) {
            baseData = baseData.filter(d => d.company === selectedCompanyName);
        }

        if (isManager && !isHoldingAdmin && currentUser) {
            const getSubordinateIdsRecursive = (managerId: string): string[] => {
                const directReports = employees.filter(e => e.reportsTo === managerId).map(e => e.id);
                if (directReports.length === 0) return [];
                return [...directReports, ...directReports.flatMap(id => getSubordinateIdsRecursive(id))];
            };
            const teamIds = [currentUser.id, ...getSubordinateIdsRecursive(currentUser.id)];
            teamIds.forEach(id => teamMemberIds.add(id));
        }

        if (teamMemberIds.size > 0) {
            baseData = baseData.filter(d => teamMemberIds.has(d.employeeId));
        }
        
        if (selectedDepartment !== 'all') {
            baseData = baseData.filter(d => d.department === selectedDepartment);
        }
        if (selectedPosition !== 'all') {
            baseData = baseData.filter(d => d.position === selectedPosition);
        }
        
        const allAvailablePeriods = [...new Set(baseData.map(d => d.period))].sort();
        const periodsToInclude = allAvailablePeriods.slice(-12);

        if (periodsToInclude.length === 0) return [];
        
        const averageByPeriod = periodsToInclude.reduce((acc, period) => {
            const dataForThisPeriod = baseData.filter(d => d.period === period);
            if (dataForThisPeriod.length > 0) {
                const totalScore = dataForThisPeriod.reduce((sum, d) => sum + d.score, 0);
                acc[period] = totalScore / dataForThisPeriod.length;
            } else {
                acc[period] = 0;
            }
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(averageByPeriod).map(([period, averageScore]) => ({
            periodLabel: format(parse(period, "yyyy-MM", new Date()), "MMM yy", { locale: localeId }),
            date: parse(period, 'yyyy-MM', new Date()),
            "Rata-rata Skor": averageScore,
        })).sort((a, b) => a.date.getTime() - b.date.getTime());

    }, [kpiData, selectedCompanyName, selectedDepartment, selectedPosition, isManager, isHoldingAdmin, currentUser, employees]);
        
    const handleCompanyChange = (companyId: string) => { setSelectedCompanyId(companyId); setSelectedDepartment("all"); setSelectedPosition("all"); setSinglePeriod(null); setSelectedKpiDataForDetail(null); };
    const handleDepartmentChange = (department: string) => { setSelectedDepartment(department); setSelectedPosition("all"); setSelectedKpiDataForDetail(null); };
    
    const handleViewDetails = (data: any) => {
        if (mode === 'single') {
            if (isMobile) {
                sessionStorage.setItem('selectedKpiDetail', JSON.stringify(data));
                router.push(`/reports/detail/${data.id}`);
            } else {
                setSelectedKpiDataForDetail(data);
            }
        } else if (data.employee && trendStartPeriod && trendEndPeriod) {
            sessionStorage.setItem('selectedEmployeeAnalysis', JSON.stringify({ 
                employee: data.employee, 
                startPeriod: trendStartPeriod, 
                endPeriod: trendEndPeriod 
            }));
            router.push(`/reports/${data.employee.id}`);
        }
    };
    

    const handleApproveAchievement = async (data: KpiData) => {
        if (!currentUser) return;
        if (!data) return;
        await updateKpiData(data.id, { approvalStatus: 'Disetujui', approvedBy: currentUser.name, approvedAt: new Date().toISOString() });
        toast({ title: 'KPI Disetujui', description: `Pencapaian KPI untuk ${data.employeeName} telah disetujui.` });
    };
    
    useEffect(() => {
        setSelectedKpiDataForDetail(null);
    }, [selectedCompanyId, selectedDepartment, selectedPosition, singlePeriod, trendStartPeriod, trendEndPeriod, mode]);

    const manageableCompanies = useMemo(() => {
        if (userRole === 'superadmin') return companies.filter(c => c.status === 'Aktif');
        if (isHoldingAdmin && userCompany) {
            const getChildCompanies = (parentId: string): Company[] => companies.filter(c => c.parentId === parentId).flatMap(c => [c, ...getChildCompanies(c.id)]);
            return [userCompany, ...getChildCompanies(userCompany.id)];
        }
        if (userCompany) return [userCompany];
        return [];
    }, [userRole, isHoldingAdmin, userCompany, companies]);

    const showCompanyFilter = userRole === 'superadmin' || isHoldingAdmin;

    const uniqueCompanyDepartments = useMemo(() => {
      if (!selectedCompanyName) return [];
      return [...new Map(departments.filter(d => d.company === selectedCompanyName).map(d => [d.name, d])).values()];
    }, [selectedCompanyName, departments]);

    const uniqueCompanyPositions = useMemo(() => {
      if (!selectedCompanyName) return [];
      return [...new Map(positions.filter(p => p.company === selectedCompanyName && (selectedDepartment === 'all' || p.department === selectedDepartment)).map(p => [p.name, p])).values()];
    }, [selectedCompanyName, selectedDepartment, positions]);

    const finalReportData = reportData || [];
    const sortedReportData = useMemo(() => [...(finalReportData || [])].sort((a,b) => (b.score ?? b.averageScore) - (a.score ?? a.averageScore)), [finalReportData]);
    
    const teamStats = useMemo(() => {
        if(finalReportData.length === 0) return { averageScore: 0, topPerformer: { name: 'N/A', score: 0 }, lowestPerformer: { name: 'N/A', score: 0 }, memberCount: 0 };
        const totalScore = finalReportData.reduce((sum, d) => sum + (d.averageScore ?? d.score), 0);
        return {
            averageScore: parseFloat((totalScore / finalReportData.length).toFixed(1)) || 0,
            topPerformer: { name: sortedReportData[0]?.employeeName, score: (sortedReportData[0]?.averageScore ?? sortedReportData[0]?.score ?? 0).toFixed(1) },
            lowestPerformer: { name: sortedReportData[sortedReportData.length - 1]?.employeeName, score: (sortedReportData[sortedReportData.length - 1]?.averageScore ?? sortedReportData[sortedReportData.length-1]?.score ?? 0).toFixed(1) },
            memberCount: finalReportData.length
        }
    }, [finalReportData, sortedReportData]);
    
    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case "Melampaui Target": return "default";
            case "Mencapai Target": return "secondary";
            case "Perlu Peningkatan": return "destructive";
            default: return "outline";
        }
    };
    
    const getTrendIcon = (trend: number) => {
        if (trend > 0.1) return <TrendingUp className="h-4 w-4 text-green-500" />;
        if (trend < -0.1) return <TrendingDown className="h-4 w-4 text-red-500" />;
        return <ArrowRight className="h-4 w-4 text-muted-foreground" />;
    };

    return (
        <div className="space-y-6">
            <Card className="shadow-lg mb-6 overflow-hidden">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-2">
                        {showCompanyFilter && (
                            <Select onValueChange={handleCompanyChange} value={selectedCompanyId ?? ""}><SelectTrigger className="w-full lg:w-auto min-w-[180px]"><SelectValue placeholder="Pilih Perusahaan" /></SelectTrigger><SelectContent>{manageableCompanies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
                        )}
                        <Select value={selectedDepartment} onValueChange={handleDepartmentChange} disabled={!selectedCompanyId}><SelectTrigger className="w-full lg:w-auto min-w-[180px]"><SelectValue placeholder="Semua Departemen" /></SelectTrigger><SelectContent><SelectItem value="all">Semua Departemen</SelectItem>{uniqueCompanyDepartments.map(dep => <SelectItem key={dep.id} value={dep.name}>{dep.name}</SelectItem>)}</SelectContent></Select>
                        <Select value={selectedPosition} onValueChange={setSelectedPosition} disabled={!selectedDepartment}><SelectTrigger className="w-full lg:w-auto min-w-[180px]"><SelectValue placeholder="Semua Jabatan" /></SelectTrigger><SelectContent><SelectItem value="all">Semua Jabatan</SelectItem>{uniqueCompanyPositions.map(pos => <SelectItem key={pos.id} value={pos.name}>{pos.name}</SelectItem>)}</SelectContent></Select>
                        
                        {mode === 'single' ? (
                             <Select value={singlePeriod ?? ""} onValueChange={setSinglePeriod} disabled={availablePeriods.length === 0}><SelectTrigger className="w-full lg:w-auto min-w-[160px]"><SelectValue placeholder="Periode" /></SelectTrigger><SelectContent>{availablePeriods.map(period => <SelectItem key={period} value={period}>{format(parse(period, "yyyy-MM", new Date()), "LLLL yyyy", { locale: localeId })}</SelectItem>)}</SelectContent></Select>
                        ) : (
                           <>
                             <Select value={trendStartPeriod ?? ""} onValueChange={setTrendStartPeriod} disabled={availablePeriods.length === 0}><SelectTrigger className="w-full lg:w-auto min-w-[160px]"><SelectValue placeholder="Periode Mulai" /></SelectTrigger><SelectContent>{[...availablePeriods].sort().map(period => <SelectItem key={period} value={period}>{format(parse(period, "yyyy-MM", new Date()), "LLLL yyyy", { locale: localeId })}</SelectItem>)}</SelectContent></Select>
                             <Select value={trendEndPeriod ?? ""} onValueChange={setTrendEndPeriod} disabled={availablePeriods.length === 0}><SelectTrigger className="w-full lg:w-auto min-w-[160px]"><SelectValue placeholder="Periode Selesai" /></SelectTrigger><SelectContent>{[...availablePeriods].sort().map(period => <SelectItem key={period} value={period}>{format(parse(period, "yyyy-MM", new Date()), "LLLL yyyy", { locale: localeId })}</SelectItem>)}</SelectContent></Select>
                           </>
                        )}
                    </div>
                </CardContent>
            </Card>

            {selectedCompanyName ? (
                <div className="space-y-6">
                     <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
                        <StatCard title="Rata-Rata Skor Tim" value={teamStats.averageScore.toString()} icon={BarChartBig} description={`Selama periode terpilih`} iconColor="text-blue-500" />
                        <StatCard title="Performa Tertinggi" value={teamStats.topPerformer.name} icon={TrendingUp} description={`Skor: ${teamStats.topPerformer.score}`} iconColor="text-yellow-500" />
                        <StatCard title="Performa Terendah" value={teamStats.lowestPerformer.name} icon={TrendingDown} description={`Skor: ${teamStats.lowestPerformer.score}`} iconColor="text-red-500" />
                        {mode === 'trend' && (
                             <StatCard 
                                title="Tren Kinerja" 
                                value={`${(trendStats?.performanceTrend ?? 0).toFixed(1)}%`} 
                                icon={(trendStats?.performanceTrend ?? 0) > 0 ? TrendingUp : TrendingDown} 
                                description="Dibandingkan periode sebelumnya" 
                                iconColor={(trendStats?.performanceTrend ?? 0) > 0 ? "text-green-500" : "text-red-500"} 
                            />
                        )}
                    </div>
                    <div className={cn("grid grid-cols-1 gap-6", mode === 'trend' ? "lg:grid-cols-5" : "lg:grid-cols-1")}>
                        <div className={cn(mode === 'trend' ? "lg:col-span-3" : "lg:col-span-1")}>
                            <TeamPerformanceTrendChart key={`${selectedCompanyId}-${selectedDepartment}-${selectedPosition}`} chartData={chartData} />
                        </div>
                         {mode === 'trend' && (
                            <div className="lg:col-span-2">
                                 <Card className="shadow-lg h-full">
                                    <CardHeader>
                                        <CardTitle className="font-headline">Distribusi Status</CardTitle>
                                        <CardDescription>Berdasarkan status terakhir karyawan selama periode.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <DonutChart data={trendStats?.distribution as any} />
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>
                    <Card className="shadow-lg w-full overflow-hidden">
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div><CardTitle>Detail Kinerja Karyawan</CardTitle><CardDescription>Menampilkan {finalReportData.length} hasil untuk periode terpilih.</CardDescription></div>
                                <div className="flex items-center gap-2 self-end sm:self-center">
                                    {showScenarioPlanner && (isManager || userRole === 'manajemen') && (
                                        <Button size="sm" onClick={() => setIsScenarioPlannerOpen(true)} variant="outline">
                                            <Wand2 className="mr-2 h-4 w-4" />
                                            AI Scenario Planner
                                        </Button>
                                    )}
                                    {isManager && (<Button asChild variant="outline" size="sm"><Link href="/my-performance"><UserCog className="mr-2 h-4 w-4" />Lihat Rincian Performa Saya</Link></Button>)}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Karyawan</TableHead>
                                            <TableHead className="hidden md:table-cell">Jabatan</TableHead>
                                            {mode === 'trend' ? (
                                                <>
                                                    <TableHead>Skor Rata-Rata</TableHead>
                                                    <TableHead className="hidden lg:table-cell">Skor Terbaru</TableHead>
                                                    <TableHead className="hidden xl:table-cell">Tren Pribadi</TableHead>
                                                    <TableHead className="hidden sm:table-cell">Persetujuan</TableHead>
                                                </>
                                            ) : (
                                                <>
                                                    <TableHead>Skor</TableHead>
                                                    <TableHead className="hidden sm:table-cell">Min. Target</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="hidden sm:table-cell">Persetujuan</TableHead>
                                                    <TableHead><span className="sr-only">Aksi</span></TableHead>
                                                </>
                                            )}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {finalReportData.length > 0 ? (sortedReportData.map((data: any) => (
                                            <TableRow key={data.id} onClick={() => handleViewDetails(data)} className="cursor-pointer">
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="hidden h-9 w-9 sm:flex items-center justify-center rounded-full bg-muted">
                                                            <User className="h-5 w-5 text-muted-foreground" />
                                                        </div>
                                                        <div>
                                                            <div className="font-medium">{data.employeeName || data.name}</div>
                                                            <div className="text-sm text-muted-foreground block sm:hidden">{data.position}</div>
                                                            <div className="text-xs text-muted-foreground hidden sm:inline">{data.department}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell">{data.position}</TableCell>
                                                {mode === 'trend' ? (
                                                    <>
                                                        <TableCell className="font-semibold">{data.averageScore.toFixed(1)}</TableCell>
                                                        <TableCell className="hidden lg:table-cell">{data.latestScore.toFixed(1)}</TableCell>
                                                        <TableCell className="hidden xl:table-cell"><div className="flex items-center gap-1">{getTrendIcon(data.personalTrend)} {data.personalTrend.toFixed(1)}%</div></TableCell>
                                                        <TableCell className="hidden sm:table-cell"><Badge variant="outline">{data.approvalStatus}</Badge></TableCell>
                                                    </>
                                                ) : (
                                                    <>
                                                        <TableCell className="font-semibold">{data.score.toFixed(1)}</TableCell>
                                                        <TableCell className="hidden sm:table-cell">{data.minAchievement ?? 'N/A'}</TableCell>
                                                        <TableCell>
                                                             <Badge variant={getStatusBadgeVariant(data.status)}>{data.status}</Badge>
                                                        </TableCell>
                                                        <TableCell className="hidden sm:table-cell">
                                                            <Badge variant={data.approvalStatus === 'Disetujui' ? 'default' : 'destructive'} className="flex items-center gap-1.5 w-fit">
                                                                {data.approvalStatus === 'Disetujui' ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                                                                {data.approvalStatus}
                                                            </Badge>
                                                        </TableCell>
                                                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Buka menu</span></Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                                                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleApproveAchievement(data); }} disabled={data.approvalStatus === 'Disetujui'}>
                                                                        <ShieldCheck className="mr-2 h-4 w-4" />Setujui KPI {mode === 'trend' ? 'Terbaru' : ''}
                                                                    </DropdownMenuItem>
                                                                    {mode === 'trend' && (
                                                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewDetails(data); }}>Lihat Analisis</DropdownMenuItem>
                                                                    )}
                                                                    {mode === 'single' && (
                                                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewDetails(data); }}>Lihat Rincian</DropdownMenuItem>
                                                                    )}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                    </>
                                                )}
                                            </TableRow>
                                        ))) : (
                                            <TableRow><TableCell colSpan={7} className="text-center h-24">Tidak ada data yang ditemukan untuk filter yang dipilih.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            ) : (<Card className="shadow-lg"><CardContent className="pt-6"><div className="text-center text-muted-foreground py-12"><p>Silakan pilih perusahaan untuk menampilkan laporan.</p></div></CardContent></Card>)}
            {selectedKpiDataForDetail && (<ReportDetailView kpiData={selectedKpiDataForDetail} onClose={() => setSelectedKpiDataForDetail(null)} />)}
            {showScenarioPlanner && (
                <ScenarioPlannerDialog
                    isOpen={isScenarioPlannerOpen}
                    onOpenChange={setIsScenarioPlannerOpen}
                    filteredReportData={reportData as KpiData[]}
                />
            )}
        </div>
    );
}


// =================================================================
// 2. VIEW UNTUK ANALISIS INDIVIDU
// =================================================================
function IndividualAnalysisView() {
    const { currentUser, userRole } = useAuth();
    const { kpiData, companies, employees, departments, positions } = useMasterData();
    const router = useRouter();
    const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
    const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
    const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
    const [startPeriod, setStartPeriod] = useState<string>('');
    const [endPeriod, setEndPeriod] = useState<string>('');
    const selectedEmployee = useMemo(() => employees.find(e => e.id === selectedEmployeeId), [employees, selectedEmployeeId]);


    // --- Filter Logic ---
    const userCompany = useMemo(() => companies.find(c => c.name === currentUser?.company), [companies, currentUser]);
    const isHoldingAdmin = useMemo(() => userRole === 'manajemen' && !!userCompany?.isHolding, [userRole, userCompany]);
    const showCompanyFilter = userRole === 'superadmin' || isHoldingAdmin;

    const manageableCompanies = useMemo(() => {
      if (userRole === 'superadmin') return companies.filter(c => c.status === 'Aktif');
      if (isHoldingAdmin && userCompany) {
        const getDescendantIds = (parentId: string): string[] => {
          const children = companies.filter(c => c.parentId === parentId);
          return [parentId, ...children.flatMap(c => getDescendantIds(c.id))];
        };
        const managedIds = getDescendantIds(userCompany.id);
        return companies.filter(c => managedIds.includes(c.id) && c.status === 'Aktif');
      }
      if (userCompany) return [userCompany];
      return [];
    }, [userRole, companies, userCompany, isHoldingAdmin]);

    useEffect(() => {
      if (manageableCompanies.length > 0) {
        const initialCompanyId = manageableCompanies[0].id;
        setSelectedCompanyId(initialCompanyId);
      } else if (currentUser) {
        const userCompanyData = companies.find(c => c.name === currentUser.company);
        setSelectedCompanyId(userCompanyData?.id || null);
      }
    }, [manageableCompanies, currentUser, companies]);
    
    const departmentOptions = useMemo(() => !selectedCompanyId ? [] : [...new Map(departments.filter(d => d.company === companies.find(c => c.id === selectedCompanyId)?.name).map(d => [d.name, d])).values()], [departments, selectedCompanyId, companies]);
    const positionOptions = useMemo(() => !selectedDepartment ? [] : [...new Map(positions.filter(p => p.company === companies.find(c => c.id === selectedCompanyId)?.name && p.department === selectedDepartment).map(p => [p.name, p])).values()], [positions, selectedDepartment, selectedCompanyId, companies]);
    const employeeOptions = useMemo(() => !selectedPosition ? [] : employees.filter(e => e.company === companies.find(c => c.id === selectedCompanyId)?.name && e.department === selectedDepartment && e.position === selectedPosition && e.status === 'Aktif'), [employees, selectedPosition, selectedDepartment, selectedCompanyId, companies]);
    
    // --- Handlers ---
    const handleAnalyze = () => {
        if (!selectedEmployeeId || !startPeriod || !endPeriod || !selectedEmployee) {
            return;
        }
        sessionStorage.setItem('selectedEmployeeAnalysis', JSON.stringify({ 
            employee: selectedEmployee, 
            startPeriod: startPeriod, 
            endPeriod: endPeriod 
        }));
        router.push(`/reports/${selectedEmployee.id}`);
    };

    return (
        <div className="space-y-6">
            <Card className="shadow-lg border-t-4 border-primary overflow-hidden">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <UserCog className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="font-headline text-2xl">Filter Analisis Kinerja Individu</CardTitle>
                            <CardDescription>Pilih karyawan dan rentang waktu untuk melihat analisis kinerja.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        {showCompanyFilter && (
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                                    <Building className="size-3" /> Perusahaan
                                </Label>
                                <Select value={selectedCompanyId || ''} onValueChange={v => { setSelectedCompanyId(v); setSelectedDepartment(null); setSelectedPosition(null); setSelectedEmployeeId(null); }}>
                                    <SelectTrigger className="bg-background">
                                        <SelectValue placeholder="Pilih Perusahaan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {manageableCompanies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                                <Filter className="size-3" /> Departemen
                            </Label>
                            <Select value={selectedDepartment || ''} onValueChange={v => { setSelectedDepartment(v); setSelectedPosition(null); setSelectedEmployeeId(null); }} disabled={!selectedCompanyId}>
                                <SelectTrigger className="bg-background">
                                    <SelectValue placeholder="Pilih Departemen" />
                                </SelectTrigger>
                                <SelectContent>
                                    {departmentOptions.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                                <Filter className="size-3" /> Jabatan
                            </Label>
                            <Select value={selectedPosition || ''} onValueChange={v => { setSelectedPosition(v); setSelectedEmployeeId(null); }} disabled={!selectedDepartment}>
                                <SelectTrigger className="bg-background">
                                    <SelectValue placeholder="Pilih Jabatan" />
                                </SelectTrigger>
                                <SelectContent>
                                    {positionOptions.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                                <User className="size-3" /> Karyawan
                            </Label>
                            <Select value={selectedEmployeeId || ''} onValueChange={setSelectedEmployeeId} disabled={!selectedPosition}>
                                <SelectTrigger className="bg-background">
                                    <SelectValue placeholder="Pilih Karyawan" />
                                </SelectTrigger>
                                <SelectContent>
                                    {employeeOptions.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 items-end p-4 bg-muted/20 rounded-xl border border-dashed border-border/60">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Periode Mulai</Label>
                            <Select value={startPeriod} onValueChange={setStartPeriod} disabled={!selectedEmployeeId}>
                                <SelectTrigger className="bg-background">
                                    <SelectValue placeholder="Pilih Bulan..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {[...new Set(kpiData.filter(d => d.employeeId === selectedEmployeeId).map(d => d.period))].sort().map(p => (
                                        <SelectItem key={p} value={p}>{format(parse(p, "yyyy-MM", new Date()), "LLLL yyyy", { locale: localeId })}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Periode Selesai</Label>
                            <Select value={endPeriod} onValueChange={setEndPeriod} disabled={!selectedEmployeeId}>
                                <SelectTrigger className="bg-background">
                                    <SelectValue placeholder="Pilih Bulan..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {[...new Set(kpiData.filter(d => d.employeeId === selectedEmployeeId).map(d => d.period))].sort().map(p => (
                                        <SelectItem key={p} value={p}>{format(parse(p, "yyyy-MM", new Date()), "LLLL yyyy", { locale: localeId })}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button 
                            onClick={handleAnalyze} 
                            disabled={!selectedEmployeeId || !startPeriod || !endPeriod}
                            className="font-bold shadow-md h-10"
                        >
                            <TrendingUp className="mr-2 size-4" />
                            Jalankan Analisis
                        </Button>
                     </div>
                </CardContent>
            </Card>
        </div>
    );
}

// =================================================================
// 3. MAIN PAGE COMPONENT
// =================================================================
export function ReportDetailView({ kpiData, onClose }: { kpiData: KpiData, onClose: () => void }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => { setIsMounted(true); }, []);

    if (!isMounted) return null;
    return createPortal(
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60"><div className={cn("relative flex flex-col bg-background text-foreground shadow-xl h-full max-h-screen transition-all duration-300", isExpanded ? "w-full" : "w-full sm:w-[550px] lg:w-1/3")}>
            <div className="flex items-center justify-between p-4 border-b bg-muted/50 sticky top-0 z-10">
                <h2 className="font-semibold text-foreground">Detail Pencapaian</h2>
                <div className="flex items-center gap-2">
                    <button className="hidden sm:flex p-2 rounded-md hover:bg-accent" onClick={() => setIsExpanded(!isExpanded)} title={isExpanded ? "Kecilkan" : "Perlebar"}>{isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
                    <button className="p-2 rounded-md hover:bg-accent" onClick={onClose}><X size={18} /></button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto"><AchievementDetailContent kpiData={kpiData} isDialog={true} /></div>
        </div></div>,
        document.body
    );
}

export default function ReportsPage() {
    const { setPageContext } = usePageContext();
    const [isClient, setIsClient] = useState(false);
    const [activeTab, setActiveTab] = useState("team");
    
    useEffect(() => { setIsClient(true); }, []);
    
    const pageTitleText = 'Laporan Kinerja (KPI)';
    const pageDescription = 'Analisis kinerja tim dan individu berdasarkan KPI.';

    useEffect(() => { setPageContext(pageTitleText, null); }, [setPageContext, pageTitleText]);

    if (!isClient) {
        return (
            <div className="space-y-6">
                <Card className="shadow-lg mb-6 overflow-hidden">
                    <CardHeader className="bg-primary text-primary-foreground dark:bg-card">
                        <Skeleton className="h-8 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                </Card>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">{[...Array(4)].map((_, i) => (<Card key={i} className="shadow-lg"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-4" /></CardHeader><CardContent><Skeleton className="h-7 w-12 mb-2" /><Skeleton className="h-3 w-full" /></CardContent></Card>))}</div>
            </div>
        )
    }

    return (
      <div className="space-y-6">
        <Card className="shadow-lg border-t-4 border-primary mb-6 overflow-hidden">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <FilePieChart className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="font-headline text-2xl">{pageTitleText}</CardTitle>
                        <CardDescription>{pageDescription}</CardDescription>
                    </div>
                </div>
            </CardHeader>
        </Card>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                <TabsTrigger value="team" className="font-bold">Laporan Tim</TabsTrigger>
                <TabsTrigger value="individual" className="font-bold">Analisis Individu</TabsTrigger>
            </TabsList>
            <TabsContent value="team" className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <TeamReportView />
            </TabsContent>
            <TabsContent value="individual" className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <IndividualAnalysisView />
            </TabsContent>
        </Tabs>
      </div>
    );
}
