// src/components/cycle-reports/cycle-detail-dialog-content.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import type { ReportData } from "@/app/(main)/cycle-reports/page";
import type { Employee, KpiIndicator, KpiSetup } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { useMasterData } from "@/contexts/master-data-context";
import { Progress } from "../ui/progress";
import { User, Target as TargetIcon, Clock, AreaChart } from "lucide-react";
import { format, parse, intervalToDuration, lastDayOfMonth, isWithinInterval, differenceInMonths, eachMonthOfInterval } from "date-fns";
import { id as localeId } from "date-fns/locale";
import TeamPerformanceTrendChart from "../reports/team-performance-trend-chart";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface CycleDetailContentProps {
  report: ReportData | null;
}

export default function CycleDetailViewContent({ report }: CycleDetailContentProps) {
    const { kpiSetups, employees } = useMasterData();
    
    if (!report) return null;

    const progressByEmployee = useMemo(() => {
        if (!report.contributingData || report.contributingData.length === 0) return [];
    
        const groupedByEmployee = new Map<string, { employee: Employee; totalActual: number; totalCycleTarget: number, contributions: any[] }>();
        const supervisorIndicator = report.indicator;

        report.contributingData.forEach(dataEntry => {
            const employee = employees.find(e => e.id === dataEntry.employeeId);
            if (!employee) return;

            let individualTargetForCycle = 0;

            if (report.sourceType === 'Internal' && report.leader) {
                const supSetup = kpiSetups.find(s => s.id === report.indicator.setupId);
                const supIndicator = supSetup?.indicators.find(i => i.id === supervisorIndicator.id);
                const targetOverrides = supIndicator?.targetOverrides || {};
                
                const teamMates = employees.filter(e => e.reportsTo === report.leader!.id && e.status === 'Aktif');
                const lockedTeamMates = teamMates.filter(tm => targetOverrides[tm.id] !== undefined);
                const lockedTargetsSum = lockedTeamMates.reduce((sum, tm) => sum + (targetOverrides[tm.id] || 0), 0);
                
                const unlockedTeamMates = teamMates.filter(tm => targetOverrides[tm.id] === undefined);
                const remainingTarget = (supIndicator?.target || 0) - lockedTargetsSum;
                
                if (targetOverrides[employee.id] !== undefined) {
                    individualTargetForCycle = targetOverrides[employee.id];
                } else {
                    individualTargetForCycle = unlockedTeamMates.length > 0 ? remainingTarget / unlockedTeamMates.length : 0;
                }
            } else if (report.sourceType === 'Holding') {
                const totalHoldingAllocation = supervisorIndicator.targetAllocations?.[employee.company]?.target ?? 0;
                const staffInSameRole = employees.filter(e => e.company === employee.company && e.position === employee.position && e.department === employee.department && e.level === employee.level && e.status === 'Aktif');
                const numStaff = staffInSameRole.length > 0 ? staffInSameRole.length : 1;
                individualTargetForCycle = totalHoldingAllocation / numStaff;
            }

            const staffSetup = kpiSetups.find(s => s.company === employee.company && s.position === employee.position && s.department === employee.department && s.level === employee.level && s.status === 'Aktif' && isWithinInterval(parse(dataEntry.period, "yyyy-MM", new Date()), { start: parse(s.validFrom, 'yyyy-MM', new Date()), end: lastDayOfMonth(parse(s.validTo, 'yyyy-MM', new Date())) }));
            const staffIndicator = staffSetup?.indicators.find(i => i.source?.indicatorId === supervisorIndicator.id);
            const achievement = staffIndicator ? dataEntry.achievements.find((a: any) => a.indicatorId === staffIndicator.id) : undefined;
            
            if (achievement) {
                const existingEntry = groupedByEmployee.get(employee.id);
                if (existingEntry) {
                    existingEntry.totalActual += achievement.actual || 0;
                    existingEntry.contributions.push({ period: dataEntry.period, actual: achievement.actual || 0 });
                } else {
                    groupedByEmployee.set(employee.id, {
                        employee,
                        totalActual: achievement.actual || 0,
                        totalCycleTarget: individualTargetForCycle,
                        contributions: [{ period: dataEntry.period, actual: achievement.actual || 0 }]
                    });
                }
            }
        });

        return Array.from(groupedByEmployee.values());

    }, [report, employees, kpiSetups]);

    const monthlyTrendData = useMemo(() => {
      if (!progressByEmployee || progressByEmployee.length === 0 || !report.indicator.validFrom || !report.indicator.validTo) return [];

      const cycleMonths = eachMonthOfInterval({
          start: parse(report.indicator.validFrom, 'yyyy-MM', new Date()),
          end: parse(report.indicator.validTo, 'yyyy-MM', new Date()),
      });

      let cumulativeTeamActual = 0;
      const totalTeamTarget = progressByEmployee.reduce((sum, item) => sum + item.totalCycleTarget, 0);

      return cycleMonths.map(month => {
          const period = format(month, 'yyyy-MM');
          let monthlyTeamActual = 0;
          const contributions: { name: string; target: number; actual: number }[] = [];

          progressByEmployee.forEach(({ employee, totalCycleTarget, contributions: monthlyContribs }) => {
              const contribForMonth = monthlyContribs.find(mc => mc.period === period);
              const actualForMonth = contribForMonth?.actual || 0;
              monthlyTeamActual += actualForMonth;
              contributions.push({
                  name: employee.name,
                  target: totalCycleTarget,
                  actual: actualForMonth,
              });
          });

          cumulativeTeamActual += monthlyTeamActual;
          const cumulativeProgress = totalTeamTarget > 0 ? (cumulativeTeamActual / totalTeamTarget) * 100 : 0;

          return {
              periodLabel: format(month, "MMM yy", { locale: localeId }),
              "Rata-rata Skor": parseFloat(cumulativeProgress.toFixed(1)),
              contributions: contributions,
              cumulativeProgress: cumulativeProgress.toFixed(1),
          };
      });

  }, [progressByEmployee, report.indicator.validFrom, report.indicator.validTo]);


    const [remainingTime, setRemainingTime] = useState({ months: 0, days: 0, hours: 0 });

    useEffect(() => {
        if (!report) return;

        const relevantSetup = kpiSetups.find(s => s.id === report.indicator.setupId);
        if (!relevantSetup || !relevantSetup.validTo) {
            setRemainingTime({ months: 0, days: 0, hours: 0 });
            return;
        }

        const calculateRemainingTime = () => {
            const endDate = lastDayOfMonth(parse(relevantSetup.validTo, 'yyyy-MM', new Date()));
            endDate.setHours(23, 59, 59, 999); 

            const now = new Date();
            if (now > endDate) {
                setRemainingTime({ months: 0, days: 0, hours: 0 });
                return;
            }

            const duration = intervalToDuration({ start: now, end: endDate });
            setRemainingTime({
                months: duration.months || 0,
                days: duration.days || 0,
                hours: duration.hours || 0
            });
        };

        calculateRemainingTime();
        const timer = setInterval(calculateRemainingTime, 1000 * 60);

        return () => clearInterval(timer);

    }, [report, kpiSetups]);
    
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <AreaChart className="h-4 w-4" />
                        Tren Progres Kumulatif Tim
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <TeamPerformanceTrendChart
                        chartData={monthlyTrendData}
                    />
                </CardContent>
            </Card>
            
            <Card className="shadow-inner bg-muted/40 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Sisa Waktu Siklus</CardTitle>
                    <Clock className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent className="flex items-center justify-center gap-x-2 sm:gap-x-4 pt-4">
                     <div className="text-center">
                        <p className="text-2xl sm:text-4xl font-bold text-primary">{remainingTime.months}</p>
                        <p className="text-xs text-muted-foreground">Bulan</p>
                    </div>
                    <div className="text-2xl sm:text-4xl font-light text-muted-foreground/50">:</div>
                    <div className="text-center">
                        <p className="text-2xl sm:text-4xl font-bold text-primary">{remainingTime.days}</p>
                        <p className="text-xs text-muted-foreground">Hari</p>
                    </div>
                    <div className="text-2xl sm:text-4xl font-light text-muted-foreground/50">:</div>
                    <div className="text-center">
                        <p className="text-2xl sm:text-4xl font-bold text-primary">{remainingTime.hours}</p>
                        <p className="text-xs text-muted-foreground">Jam</p>
                    </div>
                </CardContent>
            </Card>

            <div>
                <h3 className="font-semibold text-sm mb-2">Rincian Per Karyawan</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {progressByEmployee.map(({ employee, totalActual, totalCycleTarget, contributions }) => {
                        
                        let cumulativeActual = 0;
                        const contributionsWithCumulativeProgress = eachMonthOfInterval({
                            start: parse(report.indicator.validFrom, 'yyyy-MM', new Date()),
                            end: parse(report.indicator.validTo, 'yyyy-MM', new Date()),
                        }).map(month => {
                            const period = format(month, 'yyyy-MM');
                            const contribForMonth = contributions.find(c => c.period === period);
                            const actualForMonth = contribForMonth?.actual || 0;
                            cumulativeActual += actualForMonth;
                            const cumulativeProgress = totalCycleTarget > 0 ? (cumulativeActual / totalCycleTarget) * 100 : 0;
                            return { period, actual: actualForMonth, cumulativeProgress };
                        });


                        return (
                            <Card key={employee.id} className="flex flex-col">
                                <CardHeader>
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                                            <User className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base">{employee.name}</CardTitle>
                                            <p className="text-sm text-muted-foreground">{employee.position} / <span className="font-medium text-foreground/80">{employee.company}</span></p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2 mt-2">
                                        <div className="flex items-center gap-1.5">
                                            <TargetIcon className="h-3 w-3" />
                                            <span>Target Siklus:</span>
                                            <span className="font-bold text-foreground">{totalCycleTarget.toLocaleString('id-ID', { maximumFractionDigits: 1 })}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span>Total Aktual:</span>
                                            <span className="font-bold text-primary">{totalActual.toLocaleString('id-ID')}</span>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="text-xs">Periode</TableHead>
                                                <TableHead className="text-xs text-right">Aktual</TableHead>
                                                <TableHead className="text-xs text-right">Progres</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {contributionsWithCumulativeProgress.map((item: any) => (
                                                <TableRow key={item.period}>
                                                    <TableCell className="text-xs py-2">{format(parse(item.period, 'yyyy-MM', new Date()), "LLLL", { locale: localeId })}</TableCell>
                                                    <TableCell className="text-xs py-2 text-right font-semibold">{item.actual.toLocaleString('id-ID')}</TableCell>
                                                    <TableCell className="text-xs py-2 text-right">
                                                         <div className="flex items-center justify-end gap-2">
                                                            <Progress value={item.cumulativeProgress} className="h-1.5 w-12" />
                                                            <span className="font-medium text-muted-foreground w-10 text-right">{item.cumulativeProgress.toFixed(0)}%</span>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}
