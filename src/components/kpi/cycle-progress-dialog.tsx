// src/components/kpi/cycle-progress-dialog.tsx
"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { KpiData, KpiIndicator, KpiSetup } from "@/types";
import { Progress } from "../ui/progress";
import { format, parse, getMonth, getYear, startOfYear, endOfYear, addMonths, isWithinInterval, startOfMonth } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface CycleProgressDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  kpiData: KpiData;
  indicator: KpiIndicator;
  allKpiData: KpiData[];
  employee: KpiData['employee'];
  kpiSetup: KpiSetup | null;
}

// Revised getCycleInfo function
const getCycleInfo = (
  currentPeriod: string, 
  cycle: KpiIndicator['cycle'], 
  setupValidFrom: string, 
  setupValidTo: string
) => {
  if (!setupValidFrom || !setupValidTo) {
    // Fallback if setup period is invalid
    const fallbackDate = parse(currentPeriod, 'yyyy-MM', new Date());
    return { start: startOfMonth(fallbackDate), end: fallbackDate };
  }

  const currentPeriodDate = parse(currentPeriod, 'yyyy-MM', new Date());
  const setupStartDate = parse(setupValidFrom, 'yyyy-MM', new Date());
  
  let cycleStartDate = startOfYear(setupStartDate); // Default for yearly
  let cycleEndDate: Date;

  switch (cycle) {
    case '3 Bulan': {
      let quarterStart = setupStartDate;
      while (true) {
        let quarterEnd = addMonths(quarterStart, 3);
        if (isWithinInterval(currentPeriodDate, { start: quarterStart, end: quarterEnd })) {
          cycleStartDate = quarterStart;
          cycleEndDate = addMonths(quarterStart, 2); // To get the last month of the quarter
          break;
        }
        quarterStart = addMonths(quarterStart, 3);
        if (quarterStart > currentPeriodDate) {
          cycleStartDate = currentPeriodDate; // Fallback
          cycleEndDate = currentPeriodDate;
          break;
        }
      }
      break;
    }
    case '6 Bulan': {
       let semesterStart = setupStartDate;
       while (true) {
         let semesterEnd = addMonths(semesterStart, 6);
         if (isWithinInterval(currentPeriodDate, { start: semesterStart, end: semesterEnd })) {
           cycleStartDate = semesterStart;
           cycleEndDate = addMonths(semesterStart, 5);
           break;
         }
         semesterStart = addMonths(semesterStart, 6);
         if (semesterStart > currentPeriodDate) {
           cycleStartDate = currentPeriodDate; // Fallback
           cycleEndDate = currentPeriodDate;
           break;
         }
       }
       break;
    }
    case '1 Tahun':
      cycleStartDate = setupStartDate;
      cycleEndDate = addMonths(setupStartDate, 11);
      break;
    default: // Bulanan
      cycleStartDate = currentPeriodDate;
      cycleEndDate = currentPeriodDate;
      break;
  }

  return { start: cycleStartDate, end: cycleEndDate! };
};


export function CycleProgressDialog({
  isOpen,
  onOpenChange,
  kpiData,
  indicator,
  allKpiData,
  employee,
  kpiSetup
}: CycleProgressDialogProps) {
  
  const { start, end } = useMemo(
    () => kpiSetup ? getCycleInfo(kpiData.period, indicator.cycle, kpiSetup.validFrom, kpiSetup.validTo) : { start: new Date(), end: new Date() },
    [kpiData.period, indicator.cycle, kpiSetup]
  );
  
  const cycleData = useMemo(() => {
    const dataInCycle = allKpiData.filter(d => {
        if (!employee || d.employeeId !== employee.id) return false;
        const dPeriod = parse(d.period, 'yyyy-MM', new Date());
        return dPeriod >= start && dPeriod <= end;
    });

    const achievementsByMonth: { [month: string]: number } = {};
    let cumulativeActual = 0;

    dataInCycle.forEach(d => {
        const achievement = d.achievements.find(a => a.indicatorId === indicator.id);
        if (achievement && typeof achievement.actual === 'number') {
            const monthName = format(parse(d.period, 'yyyy-MM', new Date()), 'LLLL', { locale: localeId });
            achievementsByMonth[monthName] = achievement.actual;
            cumulativeActual += achievement.actual;
        }
    });

    return { achievementsByMonth, cumulativeActual };

  }, [allKpiData, employee, start, end, indicator.id]);

  const target = indicator.target;
  const unit = indicator.targetFormat === 'Persentase' ? '%' : (indicator.unit ? ` ${indicator.unit}` : '');
  const progressPercentage = target > 0 ? (cycleData.cumulativeActual / target) * 100 : 0;

  const formatCyclePeriod = () => {
    if (!start || !end) return 'N/A';
    if (indicator.cycle === '1 Tahun') {
        return format(start, 'yyyy');
    }
    if (indicator.cycle === 'Bulanan') {
      return format(start, 'LLLL yyyy', { locale: localeId });
    }
    return `${format(start, 'MMM yyyy', { locale: localeId })} - ${format(end, 'MMM yyyy', { locale: localeId })}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Progres Siklus: {indicator.indicator}</DialogTitle>
          <DialogDescription>
            Menampilkan progres kumulatif untuk siklus {indicator.cycle.toLowerCase()} ({formatCyclePeriod()}).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="flex justify-between items-end">
                <div>
                    <p className="text-sm text-muted-foreground">Pencapaian Kumulatif</p>
                    <p className="text-2xl font-bold">{cycleData.cumulativeActual.toLocaleString()}{unit}</p>
                </div>
                 <div>
                    <p className="text-sm text-muted-foreground text-right">Target Siklus</p>
                    <p className="text-lg font-semibold text-right">{target.toLocaleString()}{unit}</p>
                </div>
            </div>
            <div>
                 <Progress value={progressPercentage} className="h-4" />
                 <p className="text-center text-sm font-bold mt-2">{progressPercentage.toFixed(1)}% Tercapai</p>
            </div>
            
            <div>
                <h4 className="font-semibold text-sm mb-2">Rincian per Bulan:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {Object.entries(cycleData.achievementsByMonth).map(([month, actual]) => (
                        <li key={month}>
                           <span className="font-medium text-foreground">{month}:</span> {actual.toLocaleString()}{unit}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
        <DialogFooter className="border-t pt-4">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Tutup
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
