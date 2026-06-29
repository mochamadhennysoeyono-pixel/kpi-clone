// src/components/reports/achievement-edit-sheet.tsx
"use client";

import { useEffect, useMemo, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '../ui/badge';
import type { KpiData, KpiIndicator, KpiAchievement, PerformanceStatus, Employee, KpiSetup } from '@/types';
import { useMasterData } from '@/contexts/master-data-context';
import { ScrollArea } from '../ui/scroll-area';
import { Save, LinkIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { parse, lastDayOfMonth } from 'date-fns';

interface AchievementEditSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  kpiData: KpiData;
  onSave: (data: KpiData) => void;
  employees: Employee[];
  allKpiData: KpiData[];
}

export function AchievementEditSheet({ 
    isOpen, 
    onOpenChange, 
    kpiData, 
    onSave,
    employees,
    allKpiData
}: AchievementEditSheetProps) {
  const { kpiSetups, updateKpiData } = useMasterData();
  const { toast } = useToast();
  const [achievements, setAchievements] = useState<{ [key: string]: Partial<KpiAchievement> }>({});
  
  const currentKpiSetup = useMemo(() => {
    if (!kpiData) return null;
    const employee = employees.find(e => e.id === kpiData.employeeId);
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
  }, [kpiData, kpiSetups, employees]);


  const aggregatedValues = useMemo(() => {
    if (!currentKpiSetup || !kpiData) {
      return {};
    }
    const currentEmployee = employees.find(e => e.id === kpiData.employeeId);
    if (!currentEmployee || !['Supervisor', 'Manager', 'Direktur'].includes(currentEmployee.level)) return {};

    const aggregated: { [indicatorId: string]: number } = {};
    const rollupIndicators = currentKpiSetup.indicators.filter(ind => ind.rollup?.enabled);
    if (rollupIndicators.length === 0) return {};

    const subordinates = employees.filter(e => e.reportsTo === currentEmployee.id && e.status === 'Aktif');
    if (subordinates.length === 0) return {};

    const subordinateKpiDataForPeriod = allKpiData.filter(d => 
        subordinates.some(sub => sub.id === d.employeeId) && 
        d.period === kpiData.period
    );
    
    for (const leaderIndicator of rollupIndicators) {
        if (!leaderIndicator.id) continue;

        const values = subordinateKpiDataForPeriod.flatMap(subData => {
            const subKpiSetup = kpiSetups.find(s => 
                s.company === subData.company && 
                s.department === subData.department &&
                s.position === subData.position &&
                s.status === 'Aktif'
            );
            if (!subKpiSetup) return [];

            const sourcedIndicator = subKpiSetup.indicators.find(ind => ind.source?.indicatorId === leaderIndicator.id);
            if (!sourcedIndicator) return [];
            
            const achievement = subData.achievements.find(ach => ach.indicatorId === sourcedIndicator.id);
            return (achievement && typeof achievement.actual === 'number') ? [achievement.actual] : [];
        });
        
        if (values.length > 0) {
            const rollupMethod = leaderIndicator.rollup?.method; 
            if (rollupMethod === 'SUM') {
                aggregated[leaderIndicator.id] = values.reduce((sum, val) => sum + val, 0);
            } else if (rollupMethod === 'AVERAGE') {
                aggregated[leaderIndicator.id] = values.reduce((sum, val) => sum + val, 0) / values.length;
            }
        }
    }
    
    return aggregated;
  }, [currentKpiSetup, kpiData, employees, allKpiData, kpiSetups]);

  useEffect(() => {
    if (kpiData && isOpen) {
      const initialValues = kpiData.achievements.reduce((acc, ach) => {
        acc[ach.indicatorId] = ach;
        return acc;
      }, {} as { [key: string]: KpiAchievement });
      setAchievements(initialValues);
    }
  }, [kpiData, isOpen]);


  const calculateScore = (indicator: KpiIndicator, actualValue: number | undefined) => {
    if (actualValue === undefined || actualValue === null) {
      return 0;
    }

    if (indicator.target === 0) {
      return actualValue === 0 ? indicator.weight : 0;
    }
    
    const achievementRatio = actualValue / indicator.target;
    const score = achievementRatio * indicator.weight;
    return parseFloat(Math.min(score, indicator.weight).toFixed(1));
  };
  
  const getStatus = (score: number, minAchievement: number): PerformanceStatus => {
    const excellentThreshold = minAchievement * 1.1; // 110% of minimum
    if (score >= excellentThreshold) return "Melampaui Target";
    if (score >= minAchievement) return "Mencapai Target";
    return "Perlu Peningkatan";
  }

 const totalScore = useMemo(() => {
    if (!currentKpiSetup) return 0;
    const total = currentKpiSetup.indicators.reduce((sum, indicator) => {
        const isRollup = indicator.rollup?.enabled ?? false;
        
        const actualValue = isRollup
          ? aggregatedValues[indicator.id]
          : achievements[indicator.id]?.actual;

        const numericActual = typeof actualValue === 'string' ? parseFloat(actualValue) : actualValue;

        if (isNaN(numericActual as number)) {
            return sum + calculateScore(indicator, undefined);
        }
        return sum + calculateScore(indicator, numericActual);
    }, 0);
    return parseFloat(total.toFixed(1));
  }, [achievements, currentKpiSetup, aggregatedValues, calculateScore]);


  const handleAchievementChange = (indicatorId: string, field: keyof KpiAchievement, value: string | number) => {
    const finalValue = value === '' ? undefined : value;
    setAchievements(prev => ({
      ...prev,
      [indicatorId]: {
        ...prev[indicatorId],
        indicatorId,
        [field]: finalValue
      }
    }));
  };

  const handleSubmit = async () => {
    if (!currentKpiSetup) return;
    
     if (kpiData.approvalStatus === 'Disetujui') {
        toast({
            variant: "destructive",
            title: "Gagal Menyimpan",
            description: "Data KPI ini sudah disetujui dan tidak dapat diubah.",
        });
        return;
    }

    const minAchievement = currentKpiSetup.minAchievement ?? 70;
    const currentStatus = getStatus(totalScore, minAchievement);

    const updatedKpiData: Partial<KpiData> = {
        score: totalScore,
        status: currentStatus,
        achievements: currentKpiSetup.indicators.map(indicator => {
             const isRollup = indicator.rollup?.enabled ?? false;
             const actualValue = isRollup ? aggregatedValues[indicator.id] : achievements[indicator.id]?.actual;
             
             return {
                indicatorId: indicator.id,
                actual: (actualValue as number) ?? 0,
                keterangan: achievements[indicator.id]?.keterangan ?? '',
                linkBukti: achievements[indicator.id]?.linkBukti ?? '',
            }
        }),
        approvalStatus: "Menunggu Persetujuan",
        approvedBy: undefined,
        approvedAt: undefined,
    };
    await updateKpiData(kpiData.id, updatedKpiData);
    onSave({ ...kpiData, ...updatedKpiData });
    onOpenChange(false);
  };

  if (!currentKpiSetup) {
    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
             <SheetContent className="sm:max-w-xl">
                 <SheetHeader>
                    <SheetTitle>Pengaturan KPI Tidak Ditemukan</SheetTitle>
                    <SheetDescription>
                        Tidak ada pengaturan KPI aktif yang cocok untuk posisi dan departemen karyawan ini.
                    </SheetDescription>
                </SheetHeader>
             </SheetContent>
        </Sheet>
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-4xl md:w-3/4 lg:w-2/3 flex flex-col h-full">
        <SheetHeader className="p-6 pb-2">
          <SheetTitle>Ubah Pencapaian KPI</SheetTitle>
          <SheetDescription>
            Perbarui pencapaian aktual untuk {kpiData.employeeName} periode {kpiData.period}.
          </SheetDescription>
        </SheetHeader>
        <div className="flex justify-between items-center my-4 mx-6 p-4 border rounded-lg bg-muted/30">
            <div>
                <p className="font-semibold text-lg">{kpiData.employeeName}</p>
                <p className="text-muted-foreground text-sm">{kpiData.position} / {kpiData.department}</p>
            </div>
        </div>
        <div className="flex-1 min-h-0 px-6">
            <TooltipProvider>
                <ScrollArea className="h-full">
                <Table className="min-w-[1000px]">
                    <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                        <TableHead>Indikator</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Bobot</TableHead>
                        <TableHead>Aktual</TableHead>
                        <TableHead>Keterangan</TableHead>
                        <TableHead>Link Bukti</TableHead>
                        <TableHead className="text-right">Skor</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {currentKpiSetup.indicators.map((kpi) => {
                         const isRollup = kpi.rollup?.enabled ?? false;
                         const aggregatedValue = aggregatedValues[kpi.id];
                         const displayValue = isRollup ? aggregatedValue : achievements[kpi.id]?.actual;

                        const actualInput = (
                             <Input
                                type="number"
                                className={cn("h-8 text-xs min-w-[80px]", isRollup && "font-bold bg-muted/50 cursor-not-allowed")}
                                value={displayValue ?? ''}
                                onChange={(e) => handleAchievementChange(kpi.id, 'actual', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                disabled={isRollup}
                             />
                        );

                        return (
                            <TableRow key={kpi.id}>
                            <TableCell className="font-medium text-xs flex items-center gap-2">
                                {kpi.indicator}
                                {isRollup && <LinkIcon className="h-3 w-3 text-muted-foreground" />}
                            </TableCell>
                            <TableCell className="text-xs">
                                {kpi.target} {kpi.targetFormat === 'Persentase' ? '%' : kpi.unit}
                            </TableCell>
                            <TableCell className="text-xs">{kpi.weight}%</TableCell>
                            <TableCell>
                                {isRollup ? (
                                    <Tooltip>
                                        <TooltipTrigger asChild>{actualInput}</TooltipTrigger>
                                        <TooltipContent>
                                            <p>Nilai ini dihitung otomatis dari pencapaian tim.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                ) : actualInput}
                            </TableCell>
                            <TableCell>
                                <Input
                                className="h-8 text-xs min-w-[150px]"
                                value={achievements[kpi.id]?.keterangan ?? ''}
                                onChange={(e) => handleAchievementChange(kpi.id, 'keterangan', e.target.value)}
                                placeholder="Opsional"
                                />
                            </TableCell>
                            <TableCell>
                                <Input
                                className="h-8 text-xs min-w-[150px]"
                                value={achievements[kpi.id]?.linkBukti ?? ''}
                                onChange={(e) => handleAchievementChange(kpi.id, 'linkBukti', e.target.value)}
                                placeholder="https://..."
                                />
                            </TableCell>
                            <TableCell className="text-right font-bold text-xs">
                                {calculateScore(kpi, displayValue as number | undefined).toFixed(1)}
                            </TableCell>
                            </TableRow>
                        )
                    })}
                    </TableBody>
                </Table>
                </ScrollArea>
            </TooltipProvider>
        </div>
        <SheetFooter className="mt-auto p-6 border-t">
            <div className="flex w-full justify-between items-center">
                <div className="text-lg">
                    Total Skor: <Badge variant="default" className="text-lg">{totalScore.toFixed(1)}</Badge>
                </div>
                <div className="space-x-2">
                <SheetClose asChild>
                    <Button type="button" variant="outline">
                    Batal
                    </Button>
                </SheetClose>
                <Button onClick={handleSubmit}>
                    <Save className="mr-2 h-4 w-4" />
                    Simpan Perubahan
                </Button>
                </div>
            </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
