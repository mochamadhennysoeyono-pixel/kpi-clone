// src/components/reports/achievement-detail-dialog.tsx
"use client";

import { useMemo, useState, forwardRef, useEffect, useCallback } from "react";
import type { KpiData, KpiIndicator, Employee, KpiSetup, CalculationMethod } from "@/types";
import { useMasterData } from "@/contexts/master-data-context";
import { Link as LinkIcon, ShieldCheck, ShieldAlert, BadgeInfo, Award, Users, BarChartHorizontal, Activity, ExternalLink, Calendar, User, Briefcase, FileText } from "lucide-react";
import { CategoryPerformanceCard, type CategoryScore } from "@/components/reports/category-performance-card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { Alert, AlertDescription } from "../ui/alert";
import { format, parse, lastDayOfMonth } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../ui/card";
import { Label } from "../ui/label";
import { PerformanceTrendChart } from "./performance-trend-chart";
import { Button } from "../ui/button";
import { CycleProgressDialog } from "../kpi/cycle-progress-dialog";
import { Separator } from "../ui/separator";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { AdaptiveCardGrid, AdaptiveMetricCard, AdaptiveInsightCard } from "@/components/ui/adaptive-card";

interface AchievementDetailProps {
  kpiData: KpiData;
  isDialog?: boolean;
}

const AchievementDetailDialog = forwardRef<HTMLDivElement, AchievementDetailProps>(({ kpiData, isDialog }, ref) => {
    const { employees, kpiSetups, kpiCategories, companies, kpiData: allKpiData } = useMasterData();
    const { isMobile } = useBreakpoint();
    const [isClient, setIsClient] = useState(false);
    const [cycleProgressState, setCycleProgressState] = useState<{ isOpen: boolean; indicator: KpiIndicator | null }>({ isOpen: false, indicator: null });

    useEffect(() => {
        setIsClient(true);
    }, []);
    
    const employee = useMemo(() => employees.find(e => e.id === kpiData.employeeId), [kpiData.employeeId, employees]);

    const myAllKpiData = useMemo(() => {
      if (!employee) return [];
      return allKpiData.filter(d => d.employeeId === employee.id).sort((a,b) => a.period.localeCompare(b.period));
    }, [allKpiData, employee]);

    const currentKpiSetup = useMemo(() => {
        if (!employee) return null;
        const periodDate = parse(kpiData.period, 'yyyy-MM', new Date());

        return kpiSetups.find(
        (s) => {
            const isMatch = s.position === employee.position &&
                s.department === employee.department &&
                s.company === employee.company &&
                s.level === employee.level &&
                s.status === "Aktif";
            if (!isMatch) return false;

            const validFrom = s.validFrom ? parse(s.validFrom, 'yyyy-MM', new Date()) : null;
            const validTo = s.validTo ? lastDayOfMonth(parse(s.validTo, 'yyyy-MM', new Date())) : null;

            if (validFrom && validTo) {
            return periodDate >= validFrom && periodDate <= validTo;
            }
            return false;
        }
        );
    }, [kpiData.period, employee, kpiSetups]);

    const minAchievementTarget = useMemo(() => currentKpiSetup?.minAchievement ?? 70, [currentKpiSetup]);

    const aggregatedValues = useMemo(() => {
        if (!currentKpiSetup || !employee || !['Supervisor', 'Manager', 'Direktur'].includes(employee.level)) {
            return {};
        }
        const supervisorRollupIndicators = currentKpiSetup.indicators.filter(ind => ind.rollup?.enabled);
        if (supervisorRollupIndicators.length === 0) return {};

        const subordinateIds = employees.filter(e => e.reportsTo === employee.id && e.status === 'Aktif').map(e => e.id);
        if (subordinateIds.length === 0) return {};
        
        const subordinateKpiDataForPeriod = allKpiData.filter(d => subordinateIds.includes(d.employeeId) && d.period === kpiData.period);
        const periodDate = parse(kpiData.period, 'yyyy-MM', new Date());
        const aggregatedResult: { [supervisorIndicatorId: string]: number } = {};

        supervisorRollupIndicators.forEach(supIndicator => {
            const values: number[] = [];
            subordinateKpiDataForPeriod.forEach(subData => {
                const subEmployee = employees.find(e => e.id === subData.employeeId);
                if (!subEmployee) return;

                const subKpiSetup = kpiSetups.find(s => {
                    const isMatch = s.company === subEmployee.company && s.position === subEmployee.position && s.department === subEmployee.department && subEmployee?.level === s.level && s.status === 'Aktif';
                    if (!isMatch) return false;
                    const validFrom = s.validFrom ? parse(s.validFrom, 'yyyy-MM', new Date()) : null;
                    const validTo = s.validTo ? lastDayOfMonth(parse(s.validTo, 'yyyy-MM', new Date())) : null;
                    if (validFrom && validTo) return periodDate >= validFrom && periodDate <= validTo;
                    return false;
                });

                if (subKpiSetup) {
                    const sourcedIndicator = subKpiSetup.indicators.find(subInd => subInd.source?.indicatorId === supIndicator.id);
                    if (sourcedIndicator) {
                        const achievement = subData.achievements.find(ach => ach.indicatorId === sourcedIndicator.id);
                        if (achievement && typeof achievement.actual === 'number') {
                            values.push(achievement.actual);
                        }
                    }
                }
            });

            if (values.length > 0) {
                if (supIndicator.rollup?.method === 'SUM') {
                    aggregatedResult[supIndicator.id] = values.reduce((sum, val) => sum + val, 0);
                } else if (supIndicator.rollup?.method === 'AVERAGE') {
                    aggregatedResult[supIndicator.id] = values.reduce((sum, val) => sum + val, 0) / values.length;
                }
            }
        });
        return aggregatedResult;
    }, [currentKpiSetup, kpiData.period, employee, allKpiData, kpiSetups, employees]);


    const getCycleDivider = (cycle: KpiIndicator['cycle']): number => {
        switch(cycle) {
            case 'Bulanan': return 1;
            case '3 Bulan': return 3;
            case '6 Bulan': return 6;
            case '1 Tahun': return 12;
            default: return 1;
        }
    }
    
    const distributedTargets = useMemo(() => {
        const finalTargets: { [indicatorId: string]: { monthly: number; cycle: number } } = {};
        if (!currentKpiSetup || !employee) return finalTargets;
    
        const periodDate = parse(kpiData.period, 'yyyy-MM', new Date());
    
        currentKpiSetup.indicators.forEach(indicator => {
            let finalCycleTarget = indicator.target;
            
            const monthlyOverride = kpiData.achievements.find(ach => ach.indicatorId === indicator.id)?.monthlyTargetOverride;
    
            if (indicator.source && (monthlyOverride === undefined || monthlyOverride === null)) {
                let sourceSetup: KpiSetup | undefined;
                if (indicator.source.employeeId === 'HOLDING') {
                    sourceSetup = kpiSetups.find(s => s.isHolding && s.indicators.some(i => i.id === indicator.source!.indicatorId));
                } else if (employee.reportsTo) {
                    const supervisor = employees.find(e => e.id === employee.reportsTo);
                    if (supervisor) {
                        sourceSetup = kpiSetups.find(s => 
                            s.company === supervisor.company && s.position === supervisor.position && 
                            s.department === supervisor.department && s.level === supervisor.level && s.status === 'Aktif' &&
                            (s.validFrom ? parse(s.validFrom, 'yyyy-MM', new Date()) : new Date(0)) <= periodDate &&
                            (s.validTo ? lastDayOfMonth(parse(s.validTo, 'yyyy-MM', new Date())) : new Date()) >= periodDate
                        );
                    }
                }
    
                const sourceIndicator = sourceSetup?.indicators.find(ind => ind.id === indicator.source!.indicatorId);
                if (sourceIndicator) {
                    if (indicator.source.employeeId === 'HOLDING') {
                        finalCycleTarget = sourceIndicator.targetAllocations?.[employee.company]?.target ?? 0;
                    } else { 
                        const overrides = sourceIndicator.targetOverrides || {};
                        if (overrides[employee.id] !== undefined) {
                            finalCycleTarget = overrides[employee.id];
                        } else {
                            const teamMates = employees.filter(e => e.reportsTo === employee.reportsTo && e.position === employee.position && e.department === employee.department && e.status === 'Aktif');
                            const lockedTargetsSum = teamMates.filter(tm => overrides[tm.id] !== undefined).reduce((sum, tm) => sum + (overrides[tm.id] || 0), 0);
                            const unlockedTeamMates = teamMates.filter(tm => overrides[tm.id] === undefined);
                            const remainingSupervisorTarget = sourceIndicator.target - lockedTargetsSum;
                            finalCycleTarget = unlockedTeamMates.length > 0 ? remainingSupervisorTarget / unlockedTeamMates.length : 0;
                        }
                    }
                }
            }
            
            const cycleDivider = getCycleDivider(indicator.cycle);
            let monthlyTarget = finalCycleTarget / cycleDivider;
            if (monthlyOverride !== undefined && monthlyOverride !== null) monthlyTarget = monthlyOverride;
            finalTargets[indicator.id] = { monthly: monthlyTarget, cycle: finalCycleTarget };
        });
        
        return finalTargets;
    }, [currentKpiSetup, employee, employees, kpiSetups, companies, kpiData]);

    const calculateScore = useCallback((indicator: KpiIndicator, actualValue: number | undefined): number => {
        const actualVal = Number(actualValue);
        const monthlyTarget = distributedTargets[indicator.id]?.monthly ?? 0;
        const method = indicator.calculationMethod;
        let score: number;

        if (isNaN(actualVal)) return 0;

        switch (method) {
            case 'Target Minimal':
                if (monthlyTarget <= 0) score = actualVal <= 0 ? indicator.weight : 0;
                else if (actualVal > monthlyTarget) score = 0;
                else if (actualVal === monthlyTarget) score = indicator.weight * 0.25;
                else { const minScore = indicator.weight * 0.25; const ratio = (monthlyTarget - actualVal) / monthlyTarget; score = minScore + ratio * (indicator.weight - minScore); }
                break;
            case 'Target Mutlak': score = actualVal === monthlyTarget ? indicator.weight : 0; break;
            case 'Target Limit': score = actualVal <= monthlyTarget ? indicator.weight : 0; break;
            case 'Target Maksimal':
            default:
                if (monthlyTarget === 0) score = actualVal === 0 ? indicator.weight : 0;
                else score = Math.min(actualVal / monthlyTarget, 1) * indicator.weight;
                break;
        }
        return isNaN(score) ? 0 : Math.max(0, Math.min(score, indicator.weight));
    }, [distributedTargets]);


    const calculateAchievementPercentage = (score: number, weight: number): number => {
      if (weight === 0) return 0;
      return parseFloat(Math.max(0, Math.min((score / weight) * 100, 1000)).toFixed(1));
    };
  
    const groupedIndicators = useMemo(() => {
        if (!currentKpiSetup || !employee) return [];
        const groups: { [key: string]: { code: string, indicators: KpiIndicator[], totalWeight: number } } = {};
        currentKpiSetup.indicators.forEach(indicator => {
            const categoryName = indicator.category;
            if (!groups[categoryName]) {
                const categoryInfo = kpiCategories.find(c => c.name === categoryName && (c.company === employee.company || c.company === 'Global'));
                groups[categoryName] = { code: categoryInfo?.code || 'N/A', indicators: [], totalWeight: 0 };
            }
            groups[categoryName].indicators.push(indicator);
            groups[categoryName].totalWeight += Number(indicator.weight || 0);
        });
        return Object.entries(groups).map(([name, data]) => ({ categoryName: name, categoryCode: data.code, indicators: data.indicators, totalWeight: data.totalWeight }));
    }, [currentKpiSetup, kpiCategories, employee]);
    
    const categoryScores = useMemo((): CategoryScore[] => {
        if (!currentKpiSetup || !kpiData) return [];
        const categoryData: { [key: string]: { score: number; weight: number } } = {};
        currentKpiSetup.indicators.forEach(indicator => {
            if (!categoryData[indicator.category]) categoryData[indicator.category] = { score: 0, weight: 0 };
            const achievement = kpiData.achievements.find(a => a.indicatorId === indicator.id);
            const score = calculateScore(indicator, achievement?.actual);
            categoryData[indicator.category].score += (Number(score) || 0);
            categoryData[indicator.category].weight += (Number(indicator.weight) || 0);
        });
        return Object.entries(categoryData).map(([category, { score, weight }]) => ({
            category, score: parseFloat(score.toFixed(1)), weight: parseFloat(Number(weight).toFixed(1)), achievement: weight > 0 ? parseFloat(((score / weight) * 100).toFixed(1)) : 0,
        }));
    }, [kpiData, currentKpiSetup, calculateScore]);

    const getStatus = (score: number, minAch: number) => {
        const excellentThreshold = minAch * 1.1;
        if (score >= excellentThreshold) return "Melampaui Target";
        if (score >= minAch) return "Mencapai Target";
        return "Perlu Peningkatan";
    };

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
        case "Melampaui Target": return "default";
        case "Mencapai Target": return "secondary";
        case "Perlu Peningkatan": return "destructive";
        default: return "outline";
        }
    };
    
    const calculatedStatus = getStatus(kpiData.score, minAchievementTarget);

    if (!employee || !isClient) return null;

    const hasMetMinTarget = kpiData.score >= minAchievementTarget;

    return (
        <div ref={ref} className="space-y-6">
            <Card className="border-none shadow-none bg-transparent">
                <CardContent className="p-0 space-y-6">
                    <Card className="border-l-4 border-primary shadow-md overflow-hidden bg-background">
                        <CardContent className={isMobile ? "p-5" : "p-8"}>
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
                                <div className="space-y-3 min-w-0">
                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="outline" className="text-[10px] font-black uppercase h-5 bg-muted/50 border-none">{kpiData.period}</Badge>
                                        <Badge variant={kpiData.approvalStatus === 'Disetujui' ? 'default' : 'outline'} className={cn(
                                            "text-[10px] font-black uppercase h-5 border-none",
                                            kpiData.approvalStatus === 'Disetujui' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                                        )}>
                                            {kpiData.approvalStatus === 'Disetujui' ? <ShieldCheck size={10} className="mr-1" /> : <ShieldAlert size={10} className="mr-1" />}
                                            {kpiData.approvalStatus}
                                        </Badge>
                                    </div>
                                    <h2 className={cn("font-black tracking-tighter text-slate-900 leading-tight", isMobile ? "text-xl" : "text-3xl")}>
                                        {employee.name}
                                    </h2>
                                    <p className="text-muted-foreground text-[10px] sm:text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                        <Briefcase size={12} className="opacity-40" /> {employee.position} <span className="opacity-20">/</span> {employee.department}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-3 flex-shrink-0 w-full sm:w-auto">
                                    <div className="text-right p-4 rounded-2xl bg-primary/5 border border-primary/10 w-full sm:w-auto">
                                        <p className="text-[10px] uppercase font-black text-primary/60 tracking-widest mb-1">Skor Akhir KPI</p>
                                        <p className={cn("font-black text-primary leading-none", isMobile ? "text-4xl" : "text-5xl")}>
                                            {kpiData.score.toFixed(1)}
                                        </p>
                                        <Badge variant={getStatusBadgeVariant(calculatedStatus)} className="mt-2 text-[8px] font-black uppercase">{calculatedStatus}</Badge>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    {currentKpiSetup && (
                        <Alert variant="default" className={cn(
                            "border-none shadow-sm",
                            hasMetMinTarget ? "bg-blue-50 text-blue-800" : "bg-amber-50 text-amber-800"
                        )}>
                            <div className="flex items-center gap-3">
                                <div className={cn("p-2 rounded-full", hasMetMinTarget ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600")}>
                                    {hasMetMinTarget ? <Award size={16} /> : <BadgeInfo size={16} />}
                                </div>
                                <AlertDescription className="text-xs font-bold uppercase tracking-tight leading-relaxed">
                                    {hasMetMinTarget
                                        ? `Analisis: Skor mencapai target minimal (${minAchievementTarget}%). Pertahankan konsistensi.`
                                        : `Peringatan: Capaian berada di bawah ambang batas minimal (${minAchievementTarget}%).`
                                    }
                                </AlertDescription>
                            </div>
                        </Alert>
                    )}

                    <AdaptiveCardGrid complexity="medium">
                        {categoryScores.map(cs => (
                            <CategoryPerformanceCard key={cs.category} data={cs} />
                        ))}
                    </AdaptiveCardGrid>

                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1 flex items-center gap-2">
                            <FileText size={14} className="text-primary" /> Rincian Matriks Indikator
                        </h3>
                        {currentKpiSetup ? (
                            <Accordion type="multiple" className="w-full space-y-4" defaultValue={groupedIndicators.map(g => g.categoryName)}>
                                {groupedIndicators.map(group => (
                                    <AccordionItem value={group.categoryName} key={group.categoryName} className="border rounded-2xl overflow-hidden bg-background shadow-sm border-border/40">
                                        <AccordionTrigger className="bg-muted/30 p-4 hover:no-underline px-6">
                                            <div className="flex justify-between w-full pr-4">
                                                <div className="text-left">
                                                    <span className="font-black text-[10px] uppercase tracking-widest text-primary/60 block mb-1">KATEGORI: {group.categoryCode}</span>
                                                    <span className="font-black text-sm text-slate-900 uppercase tracking-tight">{group.categoryName}</span>
                                                </div>
                                                <Badge variant="outline" className="text-[9px] font-black h-5 border-none bg-background shadow-sm">BOBOT: {group.totalWeight}%</Badge>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="p-0 border-t border-border/40">
                                            <div className="divide-y divide-border/40">
                                                {group.indicators.map((indicator: KpiIndicator) => {
                                                    const achievement = kpiData.achievements.find(a => a.indicatorId === indicator.id);
                                                    const isRollup = indicator.rollup?.enabled && employee?.level !== 'Staff';
                                                    const actualValue = isRollup ? aggregatedValues[indicator.id] : achievement?.actual;
                                                    const score = calculateScore(indicator, actualValue);
                                                    const achievementPercentage = calculateAchievementPercentage(score, indicator.weight);
                                                    const unit = indicator.targetFormat === 'Persentase' ? '%' : (indicator.unit ? ` ${indicator.unit}` : '');
                                                    const monthlyTarget = distributedTargets[indicator.id]?.monthly ?? 0;
                                                    
                                                    return (
                                                        <div key={indicator.id} className="p-5 sm:p-6 bg-background group/row transition-colors hover:bg-muted/5">
                                                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                                                                <div className="lg:col-span-5 space-y-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <h4 className="font-black text-xs uppercase text-slate-800 leading-tight">{indicator.indicator}</h4>
                                                                        {isRollup && <Users size={12} className="text-primary opacity-40" />}
                                                                        {indicator.cycle !== 'Bulanan' && <Badge variant="outline" className="text-[7px] h-4 font-black bg-primary/5 text-primary border-none uppercase">{indicator.cycle}</Badge>}
                                                                    </div>
                                                                    <p className="text-[10px] text-muted-foreground leading-relaxed font-medium line-clamp-2 italic">
                                                                        "{indicator.measurement}"
                                                                    </p>
                                                                </div>
                                                                
                                                                <div className="lg:col-span-5 grid grid-cols-3 gap-4">
                                                                    <div className="space-y-0.5">
                                                                        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Target</p>
                                                                        <p className="text-xs font-black text-slate-700">{monthlyTarget.toLocaleString('id-ID', { maximumFractionDigits: 1 })}{unit}</p>
                                                                    </div>
                                                                    <div className="space-y-0.5">
                                                                        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Aktual</p>
                                                                        <p className="text-xs font-black text-slate-900">{(typeof actualValue === 'number' ? actualValue : 0).toLocaleString('id-ID')}{unit}</p>
                                                                    </div>
                                                                    <div className="space-y-0.5">
                                                                        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Capaian</p>
                                                                        <p className="text-xs font-black text-primary">{achievementPercentage.toFixed(1)}%</p>
                                                                    </div>
                                                                </div>

                                                                <div className="lg:col-span-2 text-right">
                                                                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">SKOR INDIVIDU</p>
                                                                    <p className="text-xl font-black text-primary leading-none">{(typeof score === 'number' ? score : 0).toFixed(1)}</p>
                                                                </div>
                                                            </div>
                                                            
                                                            {(achievement?.keterangan || achievement?.linkBukti || indicator.cycle !== 'Bulanan') && (
                                                                <div className="mt-4 pt-4 border-t border-dashed flex flex-wrap items-center justify-between gap-4">
                                                                    <div className="flex-1 min-w-[200px]">
                                                                        {achievement?.keterangan && (
                                                                            <p className="text-[10px] text-muted-foreground font-medium bg-muted/30 p-2 rounded-lg border border-border/40">
                                                                                <span className="font-black text-slate-500 uppercase mr-1">Catatan:</span> {achievement.keterangan}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        {achievement?.linkBukti && (
                                                                            <Button variant="outline" size="sm" className="h-7 text-[9px] font-black uppercase rounded-lg border-primary/20 text-primary gap-1.5" asChild>
                                                                                <a href={achievement.linkBukti} target="_blank" rel="noopener noreferrer">
                                                                                    <ExternalLink size={10} /> Link Bukti
                                                                                </a>
                                                                            </Button>
                                                                        )}
                                                                        {indicator.cycle !== 'Bulanan' && (
                                                                            <Button variant="outline" size="sm" className="h-7 text-[9px] font-black uppercase rounded-lg gap-1.5" onClick={() => setCycleProgressState({ isOpen: true, indicator: indicator })}>
                                                                                <Activity size={10} /> Progres Siklus
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        ) : (
                            <div className="text-center py-20 border-2 border-dashed rounded-3xl opacity-30">
                                <Search size={40} className="mx-auto mb-2" />
                                <p className="font-bold text-xs uppercase tracking-widest">Data Tidak Ditemukan</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {cycleProgressState.isOpen && cycleProgressState.indicator && employee && (
                <CycleProgressDialog
                    isOpen={cycleProgressState.isOpen}
                    onOpenChange={(isOpen) => setCycleProgressState({ isOpen, indicator: null })}
                    kpiData={kpiData}
                    indicator={cycleProgressState.indicator}
                    allKpiData={allKpiData}
                    employee={employee}
                    kpiSetup={currentKpiSetup}
                />
            )}
        </div>
    );
});
AchievementDetailDialog.displayName = "AchievementDetailDialog";

export { AchievementDetailDialog };
