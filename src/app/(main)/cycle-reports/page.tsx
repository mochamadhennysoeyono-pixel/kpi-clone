// src/app/(main)/cycle-reports/page.tsx
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";
import { useMasterData } from "@/contexts/master-data-context";
import type { KpiSetup, KpiData, KpiIndicator, Employee, Company } from "@/types";
import { getYear, startOfYear, endOfYear, parse, isWithinInterval, lastDayOfMonth } from "date-fns";
import { CycleReportCard } from "@/components/cycle-reports/cycle-report-card";
import { usePageContext } from "@/contexts/page-context";
import { GitMerge, Building, ChevronLeft, X, Maximize2, Minimize2, Activity } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import CycleDetailViewContent from '@/components/cycle-reports/cycle-detail-dialog-content';
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export type CyclicalIndicator = KpiIndicator & {
  setupId: string;
  company: string;
  position: string;
  department: string;
  level: string;
  validFrom: string;
  validTo: string;
  employeeId?: string;
};

export type ReportData = {
    indicator: CyclicalIndicator;
    leader?: Employee;
    actual: number;
    target: number;
    progress: number;
    contributingData: KpiData[];
    sourceType: 'Holding' | 'Internal';
};

function CycleDetailView({ report, onBack }: { report: ReportData, onBack: () => void }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
      setIsMounted(true);
      return () => {};
    }, []);

    if (!isMounted) return null;

    return createPortal(
         <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
            <div className={cn(
                "relative bg-background shadow-xl h-full transition-all duration-300 flex flex-col",
                isExpanded ? "w-full" : "w-full md:w-[550px] lg:w-1/3"
            )}>
                <div className="flex items-center justify-between p-4 border-b bg-muted/50 sticky top-0 z-10">
                    <h2 className="font-semibold text-foreground">Rincian Laporan Siklus</h2>
                    <div className="flex items-center gap-2">
                        <button
                            className="hidden sm:flex p-2 rounded-md hover:bg-accent"
                            onClick={() => setIsExpanded(!isExpanded)}
                            >
                            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                        </button>
                        <button className="p-2 rounded-md hover:bg-accent" onClick={onBack}>
                            <X size={18} />
                        </button>
                    </div>
                </div>
                <ScrollArea className="flex-1">
                    <div className="p-4">
                        <CycleDetailViewContent report={report} />
                    </div>
                </ScrollArea>
            </div>
        </div>,
        document.body
    )
}


export default function CycleReportsPage() {
  const { userRole, currentUser } = useAuth();
  const { companies, kpiSetups, kpiData, employees } = useMasterData();
  const { setPageContext } = usePageContext();
  const router = useRouter();
  const isMobile = useIsMobile();

  const userCompany = useMemo(() => companies.find(c => c.name === currentUser?.company), [companies, currentUser]);
  
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null);
  const [activeTab, setActiveTab] = useState('internal');
  
  const isManager = useMemo(() => {
    if (!currentUser || (userRole !== 'user' && userRole !== 'manajemen')) return false;
    return employees.some(e => e.reportsTo === currentUser.id);
  }, [currentUser, userRole, employees]);

  const isHoldingAdmin = useMemo(() => {
    if (userRole === 'superadmin') return true;
    return userRole === 'manajemen' && !!userCompany?.isHolding;
  }, [userRole, userCompany]);


  useEffect(() => {
    if (userRole === "superadmin" && companies.length > 0) {
      const activeCompanies = companies.filter((c) => c.status === "Aktif");
      if (activeCompanies.length > 0) {
        setSelectedCompanyId(activeCompanies[0].id);
      }
    } else if (currentUser) {
      const userCompanyData = companies.find((c) => c.name === currentUser.company);
      setSelectedCompanyId(userCompanyData?.id || null);
    }
  }, [userRole, currentUser, companies]);
  
  const manageableCompanies = useMemo(() => {
    if (userRole === 'superadmin') return companies.filter(c => c.status === 'Aktif');
    if (userRole === 'manajemen' && userCompany?.isHolding) {
        const getChildCompanies = (parentId: string): Company[] => {
            const children = companies.filter(c => c.parentId === parentId);
            return [...children, ...children.flatMap(c => getChildCompanies(c.id))];
        };
        return [userCompany, ...getChildCompanies(userCompany.id)];
    }
    return [];
  }, [userRole, userCompany, companies]);

  const showCompanyFilter = userRole === 'superadmin' || (userRole === 'manajemen' && userCompany?.isHolding);

  const selectedCompanyName = useMemo(() => {
    return companies.find((c) => c.id === selectedCompanyId)?.name;
  }, [selectedCompanyId, companies]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    kpiData.forEach(kd => {
        if (!kd.period) return;
        try {
            years.add(getYear(parse(kd.period, 'yyyy-MM', new Date())));
        } catch (e) {}
    });
    return Array.from(years).sort((a,b) => b - a).map(String);
  }, [kpiData]);

  const activeYearPeriod = useMemo(() => {
    if (!selectedYear) return null;
    const yearDate = new Date(parseInt(selectedYear), 0, 1);
    return { start: startOfYear(yearDate), end: endOfYear(yearDate) };
  }, [selectedYear]);

  const cyclicalIndicators = useMemo((): CyclicalIndicator[] => {
    if (!activeYearPeriod) return [];
    
    let companySetups = kpiSetups.filter(s => {
        if (s.status !== 'Aktif') return false;
        
        const setupStartDate = parse(s.validFrom, 'yyyy-MM', new Date());
        const setupEndDate = endOfYear(parse(s.validTo, 'yyyy-MM', new Date()));

        return isWithinInterval(setupStartDate, activeYearPeriod) || isWithinInterval(setupEndDate, activeYearPeriod) || (setupStartDate < activeYearPeriod.start && setupEndDate > activeYearPeriod.end);
    });
  
    const indicators: CyclicalIndicator[] = [];
    companySetups.forEach(setup => {
      setup.indicators.forEach(indicator => {
        if (indicator.cycle !== 'Bulanan') {
          indicators.push({
            ...indicator,
            setupId: setup.id,
            company: setup.company,
            position: setup.position,
            department: setup.department,
            level: setup.level,
            validFrom: setup.validFrom,
            validTo: setup.validTo,
          });
        }
      });
    });
    
    return indicators;
  }, [kpiSetups, activeYearPeriod]);

  const indicatorMap = useMemo(() => {
    const map = new Map<string, CyclicalIndicator>();
    cyclicalIndicators.forEach(indicator => {
      map.set(indicator.id, indicator);
    });
    return map;
  }, [cyclicalIndicators]);

  const getAllDescendantIds = useCallback((rootId: string): string[] => {
    const childrenIds = cyclicalIndicators
        .filter(({ source }) => source?.indicatorId === rootId)
        .map(({ id }) => id);

    if (childrenIds.length === 0) return [];

    return [
      ...childrenIds,
      ...childrenIds.flatMap(childId => getAllDescendantIds(childId))
    ];
  }, [cyclicalIndicators]);

  const reports = useMemo((): ReportData[] => {
    if (!activeYearPeriod || !cyclicalIndicators.length) return [];
  
    const topLevelIndicators = cyclicalIndicators.filter(indicator => {
        const isInCurrentTab = activeTab === 'holding' ? !!indicator.isCascaded : !indicator.isCascaded;
        if (!isInCurrentTab) return false;
        if (selectedCompanyName && indicator.company !== selectedCompanyName) return false;
        return !indicator.source?.indicatorId || !indicatorMap.has(indicator.source.indicatorId);
    });

    return topLevelIndicators.map(rootIndicator => {
        const descendantIds = getAllDescendantIds(rootIndicator.id);
        const allRelatedIds = new Set([rootIndicator.id, ...descendantIds]);
        
        const cycleStartDate = parse(rootIndicator.validFrom, "yyyy-MM", new Date());
        const cycleEndDate = lastDayOfMonth(parse(rootIndicator.validTo, "yyyy-MM", new Date()));
        
        const kpiDataForEntireCycle = kpiData.filter(d => {
            if (!d.period) return false;
            try {
                const periodDate = parse(d.period, "yyyy-MM", new Date());
                return isWithinInterval(periodDate, { start: cycleStartDate, end: cycleEndDate });
            } catch { return false; }
        });

        const leader = employees.find(e => 
            e.company === rootIndicator.company &&
            e.position === rootIndicator.position &&
            e.department === rootIndicator.department &&
            e.level === rootIndicator.level
        );

        let contributingData: KpiData[];

        if (rootIndicator.isCascaded) {
            const allocatedManagers = Object.entries(rootIndicator.targetAllocations || {}).map(([companyName, allocation]) => {
                return employees.find(e => e.company === companyName && e.position === allocation.position && e.status === 'Aktif');
            }).filter((e): e is Employee => !!e);
            
            const managerIds = allocatedManagers.map(m => m.id);
            contributingData = kpiDataForEntireCycle.filter(d => 
                managerIds.includes(d.employeeId) &&
                d.achievements.some(a => allRelatedIds.has(a.indicatorId))
            );
        } else if (leader) {
            const getSubordinateIdsRecursive = (managerId: string): string[] => {
                const directReports = employees.filter(e => e.reportsTo === managerId).map(e => e.id);
                if (directReports.length === 0) return [];
                return [...directReports, ...directReports.flatMap(id => getSubordinateIdsRecursive(id))];
            };
            const teamIds = getSubordinateIdsRecursive(leader.id);
            contributingData = kpiDataForEntireCycle.filter(d => 
                teamIds.includes(d.employeeId) &&
                d.achievements.some(a => allRelatedIds.has(a.indicatorId))
            );
        } else {
            contributingData = kpiDataForEntireCycle.filter(d => 
                d.company === rootIndicator.company &&
                d.achievements.some(a => allRelatedIds.has(a.indicatorId))
            );
        }

        const cumulativeActual = contributingData.reduce((sum, dataEntry) => {
            const actualForThisEntry = dataEntry.achievements
                .filter(ach => allRelatedIds.has(ach.indicatorId))
                .reduce((achSum, ach) => achSum + (ach.actual || 0), 0);
            return sum + actualForThisEntry;
        }, 0);
        
        const totalTarget = rootIndicator.isCascaded
            ? Object.values(rootIndicator.targetAllocations || {}).reduce((sum, val) => sum + (val.target || 0), 0)
            : rootIndicator.target || 0;

        return {
            indicator: rootIndicator,
            leader,
            actual: cumulativeActual,
            target: totalTarget,
            progress: totalTarget > 0 ? (cumulativeActual / totalTarget) * 100 : 0,
            contributingData,
            sourceType: rootIndicator.isCascaded ? "Holding" : "Internal",
        };
    }).filter(report => report.target > 0 || report.actual > 0);
  
  }, [activeYearPeriod, cyclicalIndicators, kpiData, selectedCompanyName, activeTab, getAllDescendantIds, indicatorMap, employees]);

  const handleReportClick = (report: ReportData) => {
    sessionStorage.setItem('selectedCycleReport', JSON.stringify(report));
    if (isMobile) {
        router.push(`/cycle-reports/${report.indicator.id}`);
    } else {
        setSelectedReport(report);
    }
  };

    useEffect(() => {
        if (availableYears.length > 0 && !selectedYear) {
            setSelectedYear(availableYears[0]);
        }
    }, [availableYears, selectedYear]);

    useEffect(() => {
      setPageContext('Laporan Progres Siklus KPI', null);
    }, [setPageContext]);
    
    useEffect(() => {
        setSelectedReport(null);
    }, [selectedCompanyId, selectedYear, activeTab]);

  return (
      <>
        <div className="container mx-auto space-y-6 pt-6">
            <Card className="shadow-lg border-t-4 border-primary mb-6 overflow-hidden">
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Activity className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="font-headline text-2xl">Laporan Progres Siklus KPI</CardTitle>
                        <CardDescription>
                            Pantau progres indikator KPI jangka panjang (Triwulan, Semester, Tahunan).
                        </CardDescription>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {showCompanyFilter && (
                    <Select onValueChange={setSelectedCompanyId} value={selectedCompanyId ?? ""}>
                        <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Pilih Perusahaan" />
                        </SelectTrigger>
                        <SelectContent>
                        {manageableCompanies.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    )}
                    <Select onValueChange={setSelectedYear} value={selectedYear ?? ""}>
                        <SelectTrigger className="w-full sm:w-[160px]">
                        <SelectValue placeholder="Pilih Tahun" />
                        </SelectTrigger>
                        <SelectContent>
                        {availableYears.map(year => (
                            <SelectItem key={year} value={year}>{`Tahun ${year}`}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                </div>
                </div>
            </CardHeader>
            </Card>

            <div className="flex-1 min-h-0">
                {selectedCompanyId && selectedYear ? (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
                    <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="internal"><Building className="mr-2 h-4 w-4" />Laporan Internal</TabsTrigger>
                    <TabsTrigger value="holding" disabled={!isHoldingAdmin}><GitMerge className="mr-2 h-4 w-4" />Laporan Turunan Holding</TabsTrigger>
                    </TabsList>
                    <ScrollArea className="flex-1 mt-4">
                        <TabsContent value="internal">
                        {reports.length > 0 ? (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                {reports.map(report => (
                                    <CycleReportCard key={report.indicator.id} report={report} onClick={() => handleReportClick(report)} />
                                ))}
                            </div>
                            ) : (
                                <Card><CardContent className="p-10 text-center text-muted-foreground">Tidak ada laporan siklus internal untuk filter ini.</CardContent></Card>
                            )}
                        </TabsContent>
                        <TabsContent value="holding">
                            {reports.length > 0 ? (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                    {reports.map(report => (
                                        <CycleReportCard key={report.indicator.id} report={report} onClick={() => handleReportClick(report)} />
                                    ))}
                                </div>
                            ) : (
                                <Card><CardContent className="p-10 text-center text-muted-foreground">Tidak ada laporan siklus turunan dari holding untuk filter ini.</CardContent></Card>
                            )}
                        </TabsContent>
                    </ScrollArea>
                </Tabs>
                ) : (
                <Card>
                    <CardContent className="p-10 text-center text-muted-foreground">
                        Silakan pilih perusahaan dan tahun untuk melihat laporan.
                    </CardContent>
                </Card>
                )}
            </div>
        </div>
        
        {selectedReport && (
            <CycleDetailView report={selectedReport} onBack={() => setSelectedReport(null)} />
        )}
      </>
  );
}
