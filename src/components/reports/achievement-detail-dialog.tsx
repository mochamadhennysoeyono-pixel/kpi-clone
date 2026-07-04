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

    useEffect(() => { setIsClient(true); }, []);
    
    const employee = useMemo(() => employees.find(e => e.id === kpiData.employeeId), [kpiData.employeeId, employees]);

    const currentKpiSetup = useMemo(() => {
        if (!employee) return null;
        const periodDate = parse(kpiData.period, 'yyyy-MM', new Date());
        return kpiSetups.find(s => s.position === employee.position && s.department === employee.department && s.company === employee.company && s.level === employee.level && s.status === "Aktif" && (s.validFrom ? parse(s.validFrom, 'yyyy-MM', new Date()) : null) !== null && (s.validTo ? lastDayOfMonth(parse(s.validTo, 'yyyy-MM', new Date())) : null) !== null && periodDate >= parse(s.validFrom, 'yyyy-MM', new Date()) && periodDate <= lastDayOfMonth(parse(s.validTo, 'yyyy-MM', new Date())));
    }, [kpiData.period, employee, kpiSetups]);

    const aggregatedValues = useMemo(() => {
        if (!currentKpiSetup || !employee || !['Supervisor', 'Manager', 'Direktur'].includes(employee.level)) return {};
        const rollupInds = currentKpiSetup.indicators.filter(ind => ind.rollup?.enabled);
        if (rollupInds.length === 0) return {};
        const subIds = employees.filter(e => e.reportsTo === employee.id && e.status === 'Aktif').map(e => e.id);
        const subKpiData = allKpiData.filter(d => subIds.includes(d.employeeId) && d.period === kpiData.period);
        const aggregated: { [indicatorId: string]: number } = {};
        rollupInds.forEach(supInd => {
            const vals: number[] = [];
            subKpiData.forEach(subD => {
                const subE = employees.find(e => e.id === subD.employeeId);
                const subS = subE ? kpiSetups.find(s => s.company === subE.company && s.position === subE.position && s.department === subE.department && subE.level === s.level && s.status === 'Aktif') : null;
                const srcInd = subS?.indicators.find(i => i.source?.indicatorId === supInd.id);
                const ach = srcInd ? subD.achievements.find(a => a.indicatorId === srcInd.id) : null;
                if (ach && typeof ach.actual === 'number') vals.push(ach.actual);
            });
            if (vals.length > 0) aggregated[supInd.id] = supInd.rollup?.method === 'SUM' ? vals.reduce((a, b) => a + b, 0) : vals.reduce((a, b) => a + b, 0) / vals.length;
        });
        return aggregated;
    }, [currentKpiSetup, kpiData.period, employee, allKpiData, kpiSetups, employees]);

    const distributedTargets = useMemo(() => {
        const trgs: { [id: string]: { monthly: number; cycle: number } } = {};
        if (!currentKpiSetup || !employee) return trgs;
        currentKpiSetup.indicators.forEach(indicator => {
            let cycleTrg = indicator.target;
            const monthlyOverride = kpiData.achievements.find(ach => ach.indicatorId === indicator.id)?.monthlyTargetOverride;
            if (indicator.source && monthlyOverride == null) {
                let srcS = indicator.source.employeeId === 'HOLDING' ? kpiSetups.find(s => s.isHolding && s.indicators.some(i => i.id === indicator.source!.indicatorId)) : employee.reportsTo ? kpiSetups.find(s => { const sup = employees.find(e => e.id === employee.reportsTo)!; return s.company === sup.company && s.position === sup.position && s.department === sup.department && s.level === sup.level; }) : null;
                const srcI = srcS?.indicators.find(i => i.id === indicator.source!.indicatorId);
                if (srcI) cycleTrg = indicator.source.employeeId === 'HOLDING' ? (srcI.targetAllocations?.[employee.company]?.target ?? 0) : (srcI.targetOverrides?.[employee.id] ?? (srcI.target / (employees.filter(e => e.reportsTo === employee.reportsTo && e.position === employee.position).length || 1)));
            }
            trgs[indicator.id] = { monthly: monthlyOverride ?? (cycleTrg / (indicator.cycle === '1 Tahun' ? 12 : indicator.cycle === '6 Bulan' ? 6 : indicator.cycle === '3 Bulan' ? 3 : 1)), cycle: cycleTrg };
        });
        return trgs;
    }, [currentKpiSetup, employee, employees, kpiSetups, kpiData]);

    const calculateScore = useCallback((ind: KpiIndicator, actVal: number | undefined): number => {
        const act = Number(actVal); const trg = distributedTargets[ind.id]?.monthly ?? 0;
        if (isNaN(act)) return 0;
        let s: number;
        switch (ind.calculationMethod) {
            case 'Target Minimal': s = trg <= 0 ? (act <= 0 ? ind.weight : 0) : (act > trg ? 0 : (act === trg ? ind.weight * 0.25 : (ind.weight * 0.25) + ((trg - act) / trg) * (ind.weight * 0.75))); break;
            case 'Target Mutlak': s = act === trg ? ind.weight : 0; break;
            case 'Target Limit': s = act <= trg ? ind.weight : 0; break;
            default: s = trg === 0 ? (act === 0 ? ind.weight : 0) : Math.min(act / trg, 1) * ind.weight; break;
        }
        return Math.max(0, Math.min(s, ind.weight));
    }, [distributedTargets]);

    const groupedIndicators = useMemo(() => {
        if (!currentKpiSetup || !employee) return [];
        const grps: Record<string, any> = {};
        currentKpiSetup.indicators.forEach(ind => {
            if (!grps[ind.category]) grps[ind.category] = { code: kpiCategories.find(c => c.name === ind.category)?.code || 'N/A', indicators: [], totalWeight: 0 };
            grps[ind.category].indicators.push(ind); grps[ind.category].totalWeight += ind.weight;
        });
        return Object.entries(grps).map(([name, data]: [string, any]) => ({ categoryName: name, categoryCode: data.code, indicators: data.indicators, totalWeight: data.totalWeight }));
    }, [currentKpiSetup, kpiCategories, employee]);

    const categoryScores = useMemo((): CategoryScore[] => {
        if (!currentKpiSetup || !kpiData) return [];
        const grpData: Record<string, any> = {};
        currentKpiSetup.indicators.forEach(ind => {
            if (!grpData[ind.category]) grpData[ind.category] = { s: 0, w: 0 };
            const ach = kpiData.achievements.find(a => a.indicatorId === ind.id);
            grpData[ind.category].s += calculateScore(ind, ach?.actual); grpData[ind.category].w += ind.weight;
        });
        return Object.entries(grpData).map(([cat, val]: [string, any]) => ({ category: cat, score: parseFloat(val.s.toFixed(1)), weight: val.w, achievement: val.w > 0 ? (val.s / val.w) * 100 : 0 }));
    }, [kpiData, currentKpiSetup, calculateScore]);

    if (!employee || !isClient) return null;

    return (
        <div ref={ref} className={cn("space-y-8", isDialog ? "p-6 sm:p-10" : "")}>
            {!isDialog && (
                <Card className="border-l-4 border-primary shadow-lg overflow-hidden bg-background">
                    <CardContent className={isMobile ? "p-5" : "p-8"}>
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
                            <div className="space-y-4 min-w-0">
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="outline" className="text-[10px] font-black uppercase h-5 bg-muted/50 border-none">{kpiData.period}</Badge>
                                    <Badge variant={kpiData.approvalStatus === 'Disetujui' ? 'default' : 'outline'} className={cn("text-[10px] font-black uppercase h-5 border-none", kpiData.approvalStatus === 'Disetujui' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>{kpiData.approvalStatus}</Badge>
                                </div>
                                <h2 className={cn("font-black tracking-tighter text-slate-900 leading-tight", isMobile ? "text-2xl" : "text-4xl")}>{employee.name}</h2>
                                <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest flex items-center gap-2"><Briefcase size={14} className="opacity-40" /> {employee.position} <span className="opacity-20">/</span> {employee.department}</p>
                            </div>
                            <div className="text-right p-5 rounded-2xl bg-primary/5 border border-primary/10 w-full sm:w-auto shrink-0">
                                <p className="text-[10px] uppercase font-black text-primary/60 tracking-widest mb-1">Skor Akhir KPI</p>
                                <p className={cn("font-black text-primary leading-none", isMobile ? "text-4xl" : "text-5xl")}>{kpiData.score.toFixed(1)}</p>
                                <Badge className="mt-3 text-[8px] font-black uppercase px-2 h-5 bg-primary text-white border-none">{kpiData.status}</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <AdaptiveCardGrid complexity="medium">
                {categoryScores.map(cs => <CategoryPerformanceCard key={cs.category} data={cs} />)}
            </AdaptiveCardGrid>

            <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1 flex items-center gap-2"><FileText size={14} className="text-primary" /> Rincian Matriks Indikator</h3>
                {currentKpiSetup ? (
                    <div className="space-y-4">
                        {groupedIndicators.map(group => (
                            <Card key={group.categoryName} className="border-border/40 overflow-hidden shadow-sm bg-background">
                                <CardHeader className="bg-muted/30 p-4 px-6 flex flex-row items-center justify-between">
                                    <div className="min-w-0">
                                        <span className="text-[8px] font-black text-primary/60 uppercase tracking-widest block">{group.categoryCode}</span>
                                        <CardTitle className="text-xs font-black uppercase text-slate-900">{group.categoryName}</CardTitle>
                                    </div>
                                    <Badge variant="outline" className="text-[9px] font-bold h-5 border-none bg-background shadow-sm">BOBOT: {group.totalWeight}%</Badge>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-border/40">
                                        {group.indicators.map((ind: KpiIndicator) => {
                                            const ach = kpiData.achievements.find(a => a.indicatorId === ind.id);
                                            const isRollup = ind.rollup?.enabled && employee?.level !== 'Staff';
                                            const actVal = isRollup ? aggregatedValues[ind.id] : ach?.actual;
                                            const score = calculateScore(ind, actVal);
                                            const unit = ind.targetFormat === 'Persentase' ? '%' : (ind.unit ? ` ${ind.unit}` : '');
                                            const trg = distributedTargets[ind.id]?.monthly ?? 0;

                                            return (
                                                <div key={ind.id} className="p-5 sm:p-6 group/row hover:bg-muted/5 transition-colors">
                                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                                                        <div className="lg:col-span-5 space-y-2">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-bold text-xs uppercase text-slate-800 leading-tight">{ind.indicator}</h4>
                                                                {isRollup && <Users size={12} className="text-primary opacity-30" />}
                                                                {ind.cycle !== 'Bulanan' && <Badge variant="secondary" className="text-[7px] h-3.5 px-1 font-black border-none uppercase">{ind.cycle}</Badge>}
                                                            </div>
                                                            <p className="text-[10px] text-muted-foreground leading-relaxed font-medium line-clamp-2 italic">"{ind.measurement}"</p>
                                                        </div>
                                                        <div className="lg:col-span-5 grid grid-cols-3 gap-4">
                                                            <div className="space-y-1">
                                                                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Target</p>
                                                                <p className="text-xs font-black text-slate-600">{trg.toLocaleString('id-ID', { maximumFractionDigits: 1 })}{unit}</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Aktual</p>
                                                                <p className="text-xs font-black text-slate-900">{(actVal || 0).toLocaleString('id-ID')}{unit}</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Capaian</p>
                                                                <p className="text-xs font-black text-primary">{ind.weight > 0 ? ((score / ind.weight) * 100).toFixed(1) : '0'}%</p>
                                                            </div>
                                                        </div>
                                                        <div className="lg:col-span-2 text-right">
                                                            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">SKOR POIN</p>
                                                            <p className="text-xl font-black text-primary leading-none">{score.toFixed(1)}</p>
                                                        </div>
                                                    </div>
                                                    {(ach?.keterangan || ach?.linkBukti || ind.cycle !== 'Bulanan') && (
                                                        <div className="mt-4 pt-4 border-t border-dashed flex flex-wrap items-center justify-between gap-4">
                                                            <div className="flex-1 min-w-[200px]">
                                                                {ach?.keterangan && <p className="text-[10px] text-muted-foreground font-medium bg-muted/30 p-2 rounded-lg border border-border/40"><span className="font-black text-slate-500 uppercase mr-1">Catatan:</span> {ach.keterangan}</p>}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {ach?.linkBukti && <Button variant="outline" size="sm" className="h-7 text-[9px] font-black uppercase rounded-lg border-primary/20 text-primary gap-1.5" asChild><a href={ach.linkBukti} target="_blank" rel="noopener noreferrer"><ExternalLink size={10} /> Link Bukti</a></Button>}
                                                                {ind.cycle !== 'Bulanan' && <Button variant="outline" size="sm" className="h-7 text-[9px] font-black uppercase rounded-lg gap-1.5" onClick={() => setCycleProgressState({ isOpen: true, indicator: ind })}><Activity size={10} /> Progres Siklus</Button>}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 border-2 border-dashed rounded-3xl opacity-30"><Search size={40} className="mx-auto mb-2" /><p className="font-bold text-xs uppercase tracking-widest">Data Tidak Ditemukan</p></div>
                )}
            </div>

            {cycleProgressState.isOpen && cycleProgressState.indicator && employee && <CycleProgressDialog isOpen={cycleProgressState.isOpen} onOpenChange={(o) => setCycleProgressState({ isOpen: o, indicator: null })} kpiData={kpiData} indicator={cycleProgressState.indicator} allKpiData={allKpiData} employee={employee} kpiSetup={currentKpiSetup} />}
        </div>
    );
});
AchievementDetailDialog.displayName = "AchievementDetailDialog";
export { AchievementDetailDialog };
