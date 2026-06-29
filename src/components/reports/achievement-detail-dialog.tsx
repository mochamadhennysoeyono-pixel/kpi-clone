// src/components/reports/achievement-detail-dialog.tsx
"use client";

import { useMemo, useState, forwardRef, useEffect, useCallback } from "react";
import type { KpiData, KpiIndicator, Employee, KpiSetup, CalculationMethod } from "@/types";
import { useMasterData } from "@/contexts/master-data-context";
import { Link as LinkIcon, ShieldCheck, ShieldAlert, BadgeInfo, Award, Users, BarChartHorizontal, Activity, ExternalLink } from "lucide-react";
import { CategoryPerformanceCard, type CategoryScore } from "@/components/reports/category-performance-card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { Alert, AlertDescription } from "../ui/alert";
import { format, parse, lastDayOfMonth } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../ui/card";
import { Label } from "../ui/label";
import { PerformanceTrendChart } from "./performance-trend-chart";
import { Button } from "../ui/button";
import { CycleProgressDialog } from "../kpi/cycle-progress-dialog";
import { Separator } from "../ui/separator";


interface AchievementDetailProps {
  kpiData: KpiData;
  isDialog?: boolean;
}

const AchievementDetailDialog = forwardRef<HTMLDivElement, AchievementDetailProps>(({ kpiData, isDialog }, ref) => {
    const { employees, kpiSetups, kpiCategories, companies, kpiData: allKpiData } = useMasterData();
    const isMobile = useIsMobile();
    const [isClient, setIsClient] = useState(false);
    const [cycleProgressState, setCycleProgressState] = useState<{ isOpen: boolean; indicator: KpiIndicator | null }>({ isOpen: false, indicator: null });

    useEffect(() => {
        setIsClient(true);
    }, []);
    
    // All calculation logic is moved inside the printable component
    // to ensure it has all the data it needs.
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
                    sourceSetup = kpiSetups.find(s => 
                        s.isHolding && 
                        s.indicators.some(i => i.id === indicator.source!.indicatorId)
                    );
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
                    } else { // Sourced from internal supervisor
                        const overrides = sourceIndicator.targetOverrides || {};
                        if (overrides[employee.id] !== undefined) {
                            finalCycleTarget = overrides[employee.id];
                        } else {
                            const teamMates = employees.filter(e => 
                                e.reportsTo === employee.reportsTo && e.position === employee.position && 
                                e.department === employee.department && e.status === 'Aktif'
                            );
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
            
            if (monthlyOverride !== undefined && monthlyOverride !== null) {
                monthlyTarget = monthlyOverride;
            }
            
            finalTargets[indicator.id] = { monthly: monthlyTarget, cycle: finalCycleTarget };
        });
        
        return finalTargets;
    }, [currentKpiSetup, employee, employees, kpiSetups, companies, kpiData]);

    const calculateScore = useCallback((indicator: KpiIndicator, actualValue: number | undefined): number => {
        const actualVal = Number(actualValue);
        const monthlyTarget = distributedTargets[indicator.id]?.monthly ?? 0;
        const method = indicator.calculationMethod;
        let score: number;

        if (isNaN(actualVal)) {
            return 0;
        }

        switch (method) {
            case 'Target Minimal':
                if (monthlyTarget <= 0) {
                    score = actualVal <= 0 ? indicator.weight : 0;
                } else if (actualVal > monthlyTarget) {
                    score = 0;
                } else if (actualVal === monthlyTarget) {
                    score = indicator.weight * 0.25;
                } else {
                    const minScore = indicator.weight * 0.25;
                    const ratio = (monthlyTarget - actualVal) / monthlyTarget;
                    score = minScore + ratio * (indicator.weight - minScore);
                }
                break;
            case 'Target Mutlak':
                score = actualVal === monthlyTarget ? indicator.weight : 0;
                break;
            case 'Target Limit':
                score = actualVal <= monthlyTarget ? indicator.weight : 0;
                break;
            case 'Target Maksimal':
            default:
                if (monthlyTarget === 0) {
                    score = actualVal === 0 ? indicator.weight : 0;
                } else {
                    score = Math.min(actualVal / monthlyTarget, 1) * indicator.weight;
                }
                break;
        }
        
        const finalScore = isNaN(score) ? 0 : Math.max(0, Math.min(score, indicator.weight));
        return finalScore;
    }, [distributedTargets]);


    const calculateAchievementPercentage = (score: number, weight: number): number => {
      if (weight === 0) {
        return 0;
      }
      const percentage = (score / weight) * 100;
      return parseFloat(Math.max(0, Math.min(percentage, 1000)).toFixed(1)); // Cap at 1000% just in case
    };
  
    const groupedIndicators = useMemo(() => {
        if (!currentKpiSetup || !employee) return [];
        
        const groups: { [key: string]: { code: string, indicators: KpiIndicator[], totalWeight: number } } = {};
        
        currentKpiSetup.indicators.forEach(indicator => {
            const categoryName = indicator.category;
            if (!groups[categoryName]) {
                const categoryInfo = kpiCategories.find(c => c.name === categoryName && (c.company === employee.company || c.company === 'Global'));
                groups[categoryName] = {
                    code: categoryInfo?.code || 'N/A',
                    indicators: [],
                    totalWeight: 0,
                };
            }
            groups[categoryName].indicators.push(indicator);
            groups[categoryName].totalWeight += Number(indicator.weight || 0);
        });

        return Object.entries(groups).map(([name, data]) => ({
            categoryName: name,
            categoryCode: data.code,
            indicators: data.indicators,
            totalWeight: data.totalWeight
        }));
    }, [currentKpiSetup, kpiCategories, employee]);
    
    const categoryScores = useMemo((): CategoryScore[] => {
        if (!currentKpiSetup || !kpiData) return [];
      
        const categoryData: { [key: string]: { score: number; weight: number } } = {};
      
        currentKpiSetup.indicators.forEach(indicator => {
            if (!categoryData[indicator.category]) {
                categoryData[indicator.category] = { score: 0, weight: 0 };
            }
            
            const achievement = kpiData.achievements.find(a => a.indicatorId === indicator.id);
            const actualValue = achievement?.actual;
            const score = calculateScore(indicator, actualValue);

            categoryData[indicator.category].score = (categoryData[indicator.category].score || 0) + (Number(score) || 0);
            categoryData[indicator.category].weight = (categoryData[indicator.category].weight || 0) + (Number(indicator.weight) || 0);
        });
      
        return Object.entries(categoryData).map(([category, { score, weight }]) => ({
            category,
            score: parseFloat(score.toFixed(1)),
            weight: parseFloat(Number(weight).toFixed(1)),
            achievement: weight > 0 ? parseFloat(((score / weight) * 100).toFixed(1)) : 0,
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

    if (!employee) return null;

    const hasMetMinTarget = kpiData.score >= minAchievementTarget;

    // The actual JSX for the report content
    return (
        <>
            <div ref={ref} className="p-4 bg-background text-foreground">
                <div className="flex justify-between items-start mt-4 rounded-lg border p-4 bg-muted/30">
                    <div className="space-y-1">
                        <p className="font-semibold text-lg">{employee.name}</p>
                        <p className="text-muted-foreground text-sm">{employee.position} / {employee.department}</p>
                        {kpiData.approvalStatus === 'Disetujui' ? (
                            <div className="flex flex-col items-start">
                                <Badge variant="outline" className="border-green-300 bg-green-50 text-green-800">
                                    <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Disetujui
                                </Badge>
                                <p className="text-xs text-muted-foreground mt-1">
                                    oleh {kpiData.approvedBy} pada {kpiData.approvedAt ? format(new Date(kpiData.approvedAt), 'd MMM yyyy', { locale: localeId }) : ''}
                                </p>
                            </div>
                        ) : (
                            <Badge variant="outline" className="border-yellow-300 bg-yellow-50 text-yellow-800">
                                <ShieldAlert className="mr-1.5 h-3.5 w-3.5" /> Menunggu Persetujuan
                            </Badge>
                        )}
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                        <p className="text-sm text-muted-foreground">Skor Akhir</p>
                        <p className="text-3xl font-bold text-primary">{kpiData.score.toFixed(1)}</p>
                        <Badge variant={getStatusBadgeVariant(calculatedStatus)}>{calculatedStatus}</Badge>
                    </div>
                </div>
                    
                {currentKpiSetup && (
                    <Alert variant="default" className={`mt-6 ${hasMetMinTarget ? "bg-blue-50 border-blue-300 text-blue-800" : "bg-orange-50 border-orange-300 text-orange-800"}`}>
                        {hasMetMinTarget ? <Award className="h-4 w-4 !text-blue-600" /> : <BadgeInfo className="h-4 w-4 !text-orange-600" />}
                        <AlertDescription className="font-medium">
                            {hasMetMinTarget
                                ? `Selamat! Anda telah melampaui target minimal KPI (${minAchievementTarget}).`
                                : `Perhatian! Skor Anda di bawah target minimal KPI (${minAchievementTarget}).`
                            }
                        </AlertDescription>
                    </Alert>
                )}

                {myAllKpiData.length > 0 && <div className="mt-6"><PerformanceTrendChart data={myAllKpiData} /></div>}
    
                <div className="space-y-4 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {categoryScores.map(cs => (
                            <CategoryPerformanceCard key={cs.category} data={cs} />
                        ))}
                    </div>
                </div>
            
                <h3 className="text-lg font-semibold mb-2 mt-6">Rincian Indikator</h3>
                    {currentKpiSetup ? (
                    isMobile ? (
                        <Accordion type="multiple" className="w-full space-y-4" defaultValue={groupedIndicators.map(g => g.categoryName)}>
                        {groupedIndicators.map(group => (
                            <AccordionItem value={group.categoryName} key={group.categoryName} className="border-b-0">
                                    <Card className="overflow-hidden">
                                        <AccordionTrigger className="bg-muted/50 p-4">
                                            <div className="flex justify-between w-full pr-2">
                                                <span className="font-semibold text-base">{group.categoryName} ({group.categoryCode})</span>
                                                <Badge variant="outline">Bobot: {group.totalWeight}%</Badge>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="p-0">
                                            <div className="space-y-4 p-4">
                                                {group.indicators.map((indicator: KpiIndicator) => {
                                                    const achievement = kpiData.achievements.find(a => a.indicatorId === indicator.id);
                                                    const isRollup = indicator.rollup?.enabled && employee?.level !== 'Staff';
                                                    
                                                    const actualValue = isRollup ? aggregatedValues[indicator.id] : achievement?.actual;
                                                    const score = calculateScore(indicator, actualValue);
                                                    const achievementPercentage = calculateAchievementPercentage(score, indicator.weight);
                                                    const unit = indicator.targetFormat === 'Persentase' ? '%' : (indicator.unit ? ` ${indicator.unit}` : '');
                                                    const monthlyTarget = distributedTargets[indicator.id]?.monthly ?? 0;
                                                    const displayActualValue = typeof actualValue === 'number' ? `${actualValue.toLocaleString()}${unit}` : "N/A";
                                                    

                                                    return (
                                                        <Card key={indicator.id} className="bg-background">
                                                            <CardHeader className="pb-2">
                                                                <CardTitle className="text-sm">{indicator.indicator}</CardTitle>
                                                                <CardDescription className="text-xs !mt-1">
                                                                Cara Ukur: {indicator.measurement}
                                                                </CardDescription>
                                                            </CardHeader>
                                                            <CardContent className="space-y-4 text-sm pt-2">
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div>
                                                                        <Label className="text-xs text-muted-foreground">Target</Label>
                                                                        <p className="font-semibold">{monthlyTarget.toLocaleString(undefined, { maximumFractionDigits: 1 })}{unit}</p>
                                                                    </div>
                                                                    <div>
                                                                        <Label className="text-xs text-muted-foreground">Aktual</Label>
                                                                        <p className="font-semibold">{displayActualValue}</p>
                                                                    </div>
                                                                    <div>
                                                                        <Label className="text-xs text-muted-foreground">Pencapaian</Label>
                                                                        <p className="font-semibold text-primary">{achievementPercentage.toFixed(1)}%</p>
                                                                    </div>
                                                                    <div>
                                                                        <Label className="text-xs text-muted-foreground">Skor</Label>
                                                                        <p className="font-bold text-lg">{typeof score === 'number' ? score.toFixed(1) : '0.0'}</p>
                                                                    </div>
                                                                </div>
                                                                {(achievement?.keterangan || achievement?.linkBukti || indicator.cycle !== 'Bulanan') && <Separator />}
                                                                {achievement?.keterangan && (
                                                                    <div>
                                                                        <Label className="text-xs text-muted-foreground">Keterangan</Label>
                                                                        <p className="text-xs">{achievement.keterangan}</p>
                                                                    </div>
                                                                )}
                                                                {achievement?.linkBukti && (
                                                                    <div>
                                                                        <a href={achievement.linkBukti} target="_blank" rel="noopener noreferrer" className="text-xs inline-flex items-center gap-1 text-blue-600 hover:underline">
                                                                            <ExternalLink className="h-3 w-3"/> Link Bukti
                                                                        </a>
                                                                    </div>
                                                                )}
                                                                {indicator.cycle !== 'Bulanan' && (
                                                                    <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setCycleProgressState({ isOpen: true, indicator: indicator })}>
                                                                        <Activity className="mr-2 h-3 w-3" /> Lihat Progres Siklus
                                                                    </Button>
                                                                )}
                                                            </CardContent>
                                                        </Card>
                                                    )
                                                })}
                                            </div>
                                        </AccordionContent>
                                    </Card>
                                </AccordionItem>
                        ))}
                        </Accordion>
                    ) : (
                        <Accordion type="multiple" className="w-full" defaultValue={groupedIndicators.map(g => g.categoryName)}>
                            {groupedIndicators.map(group => (
                                <AccordionItem value={group.categoryName} key={group.categoryName}>
                                    <AccordionTrigger>
                                        <div className="flex justify-between w-full pr-2">
                                            <span className="font-semibold text-base">{group.categoryName} ({group.categoryCode})</span>
                                            <Badge variant="outline">Total Bobot: {group.totalWeight}%</Badge>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-[30%]">Indikator</TableHead>
                                                        <TableHead>Target</TableHead>
                                                        <TableHead>Aktual</TableHead>
                                                        <TableHead>Pencapaian</TableHead>
                                                        <TableHead>Keterangan</TableHead>
                                                        <TableHead>Bukti</TableHead>
                                                        <TableHead className="text-right">Skor</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {group.indicators.map((indicator: KpiIndicator) => {
                                                        const achievement = kpiData.achievements.find(a => a.indicatorId === indicator.id);
                                                        const isRollup = indicator.rollup?.enabled && employee?.level !== 'Staff';
                                                        
                                                        const actualValue = isRollup ? aggregatedValues[indicator.id] : achievement?.actual;
                                                        const score = calculateScore(indicator, actualValue);
                                                        const achievementPercentage = calculateAchievementPercentage(score, indicator.weight);
                                                        const unit = indicator.targetFormat === 'Persentase' ? '%' : (indicator.unit ? ` ${indicator.unit}` : '');
                                                        const monthlyTarget = distributedTargets[indicator.id]?.monthly ?? 0;
                                                        const displayActualValue = typeof actualValue === 'number' ? `${actualValue.toLocaleString()}${unit}` : "N/A";
                                                        
                
                                                        return (
                                                            <TableRow key={indicator.id}>
                                                                <TableCell className="font-medium text-xs">
                                                                    <p>{indicator.indicator}</p>
                                                                    <p className="text-muted-foreground font-normal">Cara Ukur: {indicator.measurement}</p>
                                                                    {indicator.cycle !== 'Bulanan' && (
                                                                        <Button variant="link" size="sm" className="text-xs h-auto p-0 mt-1" onClick={() => setCycleProgressState({ isOpen: true, indicator: indicator })}>
                                                                            <Activity className="mr-1 h-3 w-3" /> Progres Siklus
                                                                        </Button>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-xs">{monthlyTarget.toLocaleString(undefined, { maximumFractionDigits: 1 })}{unit}</TableCell>
                                                                <TableCell className="text-xs">{displayActualValue}</TableCell>
                                                                <TableCell className="text-xs font-semibold">{achievementPercentage.toFixed(1)}%</TableCell>
                                                                <TableCell className="text-xs whitespace-normal break-words max-w-[250px]">{achievement?.keterangan || '-'}</TableCell>
                                                                <TableCell>
                                                                    {achievement?.linkBukti ? (
                                                                        <a href={achievement.linkBukti} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                                            <ExternalLink className="h-4 w-4" />
                                                                        </a>
                                                                    ) : '-'}
                                                                </TableCell>
                                                                <TableCell className="text-right font-bold text-xs">
                                                                    {typeof score === 'number' ? score.toFixed(1) : '0.0'}
                                                                </TableCell>
                                                            </TableRow>
                                                        )
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    )
                ) : (
                    <div className="text-center text-muted-foreground py-10">
                        Pengaturan KPI untuk posisi ini tidak ditemukan.
                    </div>
                )}
            </div>

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
        </>
    );
});
AchievementDetailDialog.displayName = "AchievementDetailDialog";

export { AchievementDetailDialog };
