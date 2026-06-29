// src/app/(main)/appraisal-dashboard/[employeeId]/page.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter, useParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, User, HelpCircle, Calculator, Target } from "lucide-react";
import { format, parse, eachMonthOfInterval, lastDayOfMonth } from "date-fns";
import { id as localeId } from "date-fns/locale";
import type { Employee, KpiData, AppraisalSetup, KboSetup, KboAssessment, OKR } from "@/types";
import { useMasterData } from "@/contexts/master-data-context";
import { PerformanceTrendChart } from "@/components/reports/performance-trend-chart";
import { ReportDetailView } from '@/app/(main)/reports/page';
import StatCard from "@/components/dashboard/stat-card";
import { BarChartBig, BrainCircuit } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface StoredAppraisalData {
    subject: Employee;
    kpiScore: number | null;
    kboScore: number | null;
    okrScore: number | null;
    finalScore: number | null;
    isOkrIntegrated: boolean;
}

interface CalculationDetail {
  title: string;
  type: 'KPI' | 'KBO' | 'OKR';
  score: number | null;
  weight: number;
  contribution: number;
  kboBreakdown?: { category: string; weight: number; score: number | null, contribution: number }[];
  kpiBreakdown?: { period: string; score: number }[];
  okrBreakdown?: OKR[];
}

function CalculationBreakdownDialog({ isOpen, onOpenChange, detail }: { isOpen: boolean, onOpenChange: (open: boolean) => void, detail: CalculationDetail | null }) {
    if (!detail) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md grid grid-rows-[auto_1fr_auto] max-h-[90vh] overflow-hidden p-0">
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-primary"/>
                        Rincian Skor {detail.type}
                    </DialogTitle>
                    <DialogDescription>
                        Berikut adalah rincian bagaimana skor {detail.type.toLowerCase()} berkontribusi pada skor akhir appraisal.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="overflow-y-auto px-6">
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="p-3 border rounded-lg bg-muted/50 text-center">
                                <p className="text-xs text-muted-foreground">Skor {detail.type === 'OKR' ? 'Rata-rata' : 'Rata-rata'} {detail.type}</p>
                                <p className="text-lg font-bold">{detail.score?.toFixed(1) || 'N/A'}</p>
                            </div>
                            <div className="p-3 border rounded-lg bg-muted/50 text-center">
                                <p className="text-xs text-muted-foreground">Bobot Kontribusi</p>
                                <p className="text-lg font-bold">{detail.weight}%</p>
                            </div>
                        </div>
                        <Separator />
                         <div className="p-4 border rounded-lg bg-primary/10 text-center">
                            <p className="text-sm font-semibold">Kontribusi ke Skor Final</p>
                            <p className="text-xs text-muted-foreground">({detail.score?.toFixed(1) || '0'} &times; {detail.weight}%)</p>
                            <p className="text-2xl font-bold text-primary">{detail.contribution.toFixed(1)}</p>
                        </div>

                        {detail.type === 'KBO' && detail.kboBreakdown && detail.kboBreakdown.length > 0 && (
                            <div className="pt-4 mt-4 border-t">
                                <h4 className="font-semibold text-sm mb-2">Rincian Komponen KBO:</h4>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Kategori</TableHead>
                                            <TableHead>Skor</TableHead>
                                            <TableHead>Bobot</TableHead>
                                            <TableHead className="text-right">Kontribusi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {detail.kboBreakdown.map(item => (
                                            <TableRow key={item.category}>
                                                <TableCell className="font-medium text-xs">{item.category}</TableCell>
                                                <TableCell className="text-xs">{item.score?.toFixed(1) || '-'}</TableCell>
                                                <TableCell className="text-xs">{item.weight}%</TableCell>
                                                <TableCell className="text-right text-xs font-semibold">{item.contribution.toFixed(1)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                 <p className="text-xs text-muted-foreground mt-2 text-right">Total Kontribusi = Skor Rata-rata KBO</p>
                            </div>
                        )}

                        {detail.type === 'KPI' && detail.kpiBreakdown && detail.kpiBreakdown.length > 0 && (
                             <div className="pt-4 mt-4 border-t">
                                <h4 className="font-semibold text-sm mb-2">Rincian Skor KPI Bulanan:</h4>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Periode</TableHead>
                                            <TableHead className="text-right">Skor KPI</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {detail.kpiBreakdown.map(item => (
                                            <TableRow key={item.period}>
                                                <TableCell className="font-medium text-xs">{format(parse(item.period, "yyyy-MM", new Date()), "LLLL yyyy", { locale: localeId })}</TableCell>
                                                <TableCell className="text-right text-xs font-semibold">{item.score.toFixed(1)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <p className="text-xs text-muted-foreground mt-2 text-right">Total dari skor ini dirata-rata menjadi Skor Rata-rata KPI.</p>
                            </div>
                        )}

                        {detail.type === 'OKR' && detail.okrBreakdown && detail.okrBreakdown.length > 0 && (
                             <div className="pt-4 mt-4 border-t">
                                <h4 className="font-semibold text-sm mb-2">Partisipasi Project OKR:</h4>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Objective</TableHead>
                                            <TableHead className="text-right">Progres Project</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {detail.okrBreakdown.map(o => (
                                            <TableRow key={o.id}>
                                                <TableCell className="font-medium text-xs">{o.objective}</TableCell>
                                                <TableCell className="text-right text-xs font-semibold">{o.progress.toFixed(1)}%</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <p className="text-xs text-muted-foreground mt-2 text-right">Menampilkan semua project di mana karyawan terlibat sebagai Owner atau kontributor.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
                <DialogFooter className="border-t p-6 pt-4">
                    <DialogClose asChild>
                        <Button variant="outline">Tutup</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function AppraisalDetailPage() {
    const router = useRouter();
    const params = useParams();
    const employeeId = params.employeeId as string;

    const { kpiData, kboAssessments, kboSetups, appraisalTasks, okrs } = useMasterData();
    const [analysisData, setAnalysisData] = useState<StoredAppraisalData | null>(null);
    const [appraisalSetup, setAppraisalSetup] = useState<AppraisalSetup | null>(null);
    const [isClient, setIsClient] = useState(false);
    const [selectedDetail, setSelectedDetail] = useState<KpiData | null>(null);
    const [calculationDetail, setCalculationDetail] = useState<CalculationDetail | null>(null);

    useEffect(() => {
        setIsClient(true);
        const storedResult = sessionStorage.getItem('selectedAppraisalResult');
        const storedSetup = sessionStorage.getItem('selectedAppraisalSetup');
        
        if (storedResult && storedSetup) {
            try {
                setAnalysisData(JSON.parse(storedResult));
                setAppraisalSetup(JSON.parse(storedSetup));
            } catch (error) {
                console.error("Failed to parse appraisal data from session storage", error);
                router.replace('/appraisal-dashboard');
            }
        } else {
             console.warn("No appraisal data found in session storage. Redirecting...");
             router.replace('/appraisal-dashboard');
        }
    }, [router]);
    
    const analysisResult = useMemo(() => {
        if (!analysisData?.subject || !appraisalSetup) return null;

        const periodStart = parse(appraisalSetup.periodStart || appraisalSetup.period!, 'yyyy-MM', new Date());
        const periodEnd = lastDayOfMonth(parse(appraisalSetup.periodEnd || appraisalSetup.period!, 'yyyy-MM', new Date()));
        
        const cycleMonths = eachMonthOfInterval({
            start: parse(appraisalSetup.periodStart || appraisalSetup.period!, 'yyyy-MM', new Date()),
            end: parse(appraisalSetup.periodEnd || appraisalSetup.period!, 'yyyy-MM', new Date()),
        }).map(d => format(d, 'yyyy-MM'));

        const trendData = kpiData
            .filter(d =>
                d.employeeId === employeeId && cycleMonths.includes(d.period)
            )
            .sort((a, b) => a.period.localeCompare(b.period));

        const subjectOkrs = okrs.filter(okr => 
            okr.status !== 'Draft' && 
            okr.status !== 'Waiting for Approval' &&
            (okr.startDate.toDate() <= periodEnd && okr.endDate.toDate() >= periodStart) && (
                okr.ownerId === employeeId ||
                okr.keyResults.some(kr => 
                    kr.ownerId === employeeId ||
                    kr.contributors?.some(c => c.ownerId === employeeId) ||
                    kr.milestones?.some(m => m.ownerId === employeeId) ||
                    kr.checklist?.some(c => c.ownerId === employeeId)
                )
            )
        );

        return { trendData, subjectOkrs };

    }, [analysisData, appraisalSetup, kpiData, employeeId, okrs]);


    const handleBack = () => {
        sessionStorage.removeItem('selectedAppraisalResult');
        sessionStorage.removeItem('selectedAppraisalSetup');
        router.back();
    };

    const handleShowKpiBreakdown = () => {
        if (!analysisData || !appraisalSetup || !analysisData.subject || !analysisResult) return;
        const components = appraisalSetup.componentsByLevel?.[analysisData.subject.level];
        const weightOverride = appraisalSetup.individualWeightOverrides?.[analysisData.subject.id];
        const weight = weightOverride ? weightOverride.kpiWeight : (components?.kpiWeight ?? 0);

        setCalculationDetail({
            title: "Rincian Skor KPI",
            type: 'KPI',
            score: analysisData.kpiScore,
            weight: weight,
            contribution: (analysisData.kpiScore ?? 0) * (weight / 100),
            kpiBreakdown: analysisResult.trendData.map(d => ({ period: d.period, score: d.score })),
        });
    };

    const handleShowKboBreakdown = () => {
        if (!analysisData || !appraisalSetup || !analysisData.subject) return;
        const subject = analysisData.subject;
        const components = appraisalSetup.componentsByLevel?.[subject.level];
        const weightOverride = appraisalSetup.individualWeightOverrides?.[subject.id];
        const weight = weightOverride ? weightOverride.kboWeight : (components?.kboWeight ?? 0);

        if (!components?.kbo) return;
    
        const tasksForSubject = appraisalTasks.filter(t => t.subjectId === subject.id && t.setupId === appraisalSetup.id && t.status === 'completed');
        const completedRaterIdsByKboSetup: Record<string, string[]> = {};
        
        tasksForSubject.forEach(task => {
            if (!completedRaterIdsByKboSetup[task.kboSetupId]) {
                completedRaterIdsByKboSetup[task.kboSetupId] = [];
            }
            completedRaterIdsByKboSetup[task.kboSetupId].push(task.raterId);
        });

        const kboBreakdown = Object.entries(components.kbo).map(([categoryName, kboComponent]) => {
            if (!kboComponent.kboSetupIds || kboComponent.kboSetupIds.length === 0) return null;
            
            const kboSetupId = kboComponent.kboSetupIds[0];
            const completedRaterIds = completedRaterIdsByKboSetup[kboSetupId] || [];

            const categoryScores = completedRaterIds.map(raterId => {
                const assessmentDoc = kboAssessments.find(a => a.setupId === appraisalSetup.id && a.subjectId === subject.id && a.raterId === raterId);
                return assessmentDoc?.assessments?.[kboSetupId]?.totalScore;
            }).filter((score): score is number => typeof score === 'number' && !isNaN(score));

            const avgCategoryScore = categoryScores.length > 0 ? categoryScores.reduce((sum, score) => sum + score, 0) / categoryScores.length : null;
            
            return {
                category: categoryName,
                weight: kboComponent.weight || 0,
                score: avgCategoryScore,
            };
        }).filter((b): b is NonNullable<typeof b> => !!b);

        const totalEffectiveWeight = kboBreakdown.reduce((sum, item) => item.score !== null ? sum + item.weight : sum, 0);

        const normalizedBreakdown = kboBreakdown.map(item => {
            const normalizedWeight = totalEffectiveWeight > 0 && item.score !== null ? (item.weight / totalEffectiveWeight) * 100 : 0;
            return {
                ...item,
                contribution: item.score !== null ? item.score * (normalizedWeight / 100) : 0,
            };
        });

        const finalKboScore = normalizedBreakdown.reduce((sum, item) => sum + item.contribution, 0);

        setCalculationDetail({
            title: "Rincian Skor KBO",
            type: 'KBO',
            score: finalKboScore,
            weight: weight,
            contribution: (finalKboScore ?? 0) * (weight / 100),
            kboBreakdown: normalizedBreakdown.map(item => ({...item, contribution: item.score !== null ? item.score * (item.weight/100) : 0 }))
        });
    };

    const handleShowOkrBreakdown = () => {
        if (!analysisData || !appraisalSetup || !analysisResult || !analysisData.isOkrIntegrated) return;
        
        const weightOverride = appraisalSetup.individualWeightOverrides?.[analysisData.subject.id];
        if (!weightOverride) return;

        setCalculationDetail({
            title: "Rincian Progres OKR",
            type: 'OKR',
            score: analysisData.okrScore,
            weight: weightOverride.okrWeight,
            contribution: (analysisData.okrScore ?? 0) * (weightOverride.okrWeight / 100),
            okrBreakdown: analysisResult.subjectOkrs,
        });
    };
    
    if (!isClient || !analysisData || !appraisalSetup || !analysisResult) {
        return (
             <div className="flex h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-muted-foreground">Memuat analisis...</p>
                </div>
            </div>
        );
    }
    
    const { subject, kpiScore, kboScore, okrScore, finalScore, isOkrIntegrated } = analysisData;
    const { trendData } = analysisResult;
    
    const weightOverride = appraisalSetup.individualWeightOverrides?.[subject.id];
    const components = appraisalSetup.componentsByLevel?.[subject.level];
    
    const kpiWeight = weightOverride ? weightOverride.kpiWeight : (components?.kpiWeight ?? 0);
    const kboWeight = weightOverride ? weightOverride.kboWeight : (components?.kboWeight ?? 0);
    const okrWeight = weightOverride ? weightOverride.okrWeight : 0;
    
    const periodLabel = `${format(parse(appraisalSetup.periodStart || appraisalSetup.period!, "yyyy-MM", new Date()), "MMM yyyy", { locale: localeId })} - ${format(parse(appraisalSetup.periodEnd || appraisalSetup.period!, "yyyy-MM", new Date()), "MMM yyyy", { locale: localeId })}`;


    return (
        <>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <Button variant="ghost" size="sm" onClick={handleBack} className="mb-2 -ml-2 self-start">
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            Kembali ke Dasbor
                        </Button>
                         <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-4">
                            <CardTitle className="text-lg font-semibold leading-none tracking-tight">Analisis Appraisal: {subject.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Skor Final: <span className="font-bold text-primary text-lg">{finalScore?.toFixed(1) || '-'}</span>
                            </p>
                        </div>
                        <CardDescription className="text-sm text-muted-foreground p-0 pt-1">
                            Periode: {periodLabel}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                         <div className={cn("grid grid-cols-1 gap-4", isOkrIntegrated ? "md:grid-cols-3" : "md:grid-cols-2")}>
                            <div className="cursor-pointer" onClick={handleShowKpiBreakdown}>
                                <StatCard
                                    title="Rata-rata Skor KPI"
                                    value={kpiScore?.toFixed(1) || 'N/A'}
                                    icon={BarChartBig}
                                    description={`Bobot kontribusi: ${kpiWeight}%`}
                                    iconColor="text-blue-500"
                                />
                            </div>
                            <div className="cursor-pointer" onClick={handleShowKboBreakdown}>
                                <StatCard
                                    title="Rata-rata Skor KBO"
                                    value={kboScore?.toFixed(1) || 'N/A'}
                                    icon={BrainCircuit}
                                    description={`Bobot kontribusi: ${kboWeight}%`}
                                    iconColor="text-green-500"
                                />
                            </div>
                            {isOkrIntegrated && (
                                <div className="cursor-pointer" onClick={handleShowOkrBreakdown}>
                                    <StatCard
                                        title="Progres OKR Terhitung"
                                        value={okrScore?.toFixed(1) || '0.0'}
                                        icon={Target}
                                        description={`Bobot kontribusi: ${okrWeight}%`}
                                        iconColor="text-purple-500"
                                    />
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {trendData.length > 0 && <PerformanceTrendChart data={trendData} />}
            
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Rincian Skor KPI per Bulan</CardTitle>
                        <CardDescription>Klik baris untuk melihat detail pencapaian bulanan.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Periode</TableHead>
                                    <TableHead className="text-right">Skor KPI</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {trendData.map(data => (
                                    <TableRow key={data.period} className="cursor-pointer hover:bg-muted" onClick={() => setSelectedDetail(data)}>
                                        <TableCell>{format(parse(data.period, "yyyy-MM", new Date()), "LLLL yyyy", { locale: localeId })}</TableCell>
                                        <TableCell className="text-right font-semibold">{data.score.toFixed(1)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                         </Table>
                    </CardContent>
                </Card>
            </div>
             {selectedDetail && (
                <ReportDetailView 
                    kpiData={selectedDetail}
                    onClose={() => setSelectedDetail(null)}
                />
            )}
             <CalculationBreakdownDialog 
                isOpen={!!calculationDetail}
                onOpenChange={() => setCalculationDetail(null)}
                detail={calculationDetail}
            />
        </>
    );
}
