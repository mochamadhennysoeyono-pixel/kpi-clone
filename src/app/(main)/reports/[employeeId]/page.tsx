// src/app/(main)/reports/[employeeId]/page.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, User, ChevronLeft } from "lucide-react";
import { format, parse } from "date-fns";
import { id as localeId } from "date-fns/locale";
import type { Employee, KpiData } from "@/types";
import { useMasterData } from "@/contexts/master-data-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import TeamPerformanceTrendChart from "@/components/reports/team-performance-trend-chart";
import { ReportDetailView } from '@/app/(main)/reports/page';

interface StoredAnalysisData {
    employee: Employee;
    startPeriod: string;
    endPeriod: string;
}

export default function ReportDetailPage() {
    const router = useRouter();
    const { kpiData } = useMasterData();
    const [analysisData, setAnalysisData] = useState<StoredAnalysisData | null>(null);
    const [isClient, setIsClient] = useState(false);
    const [selectedDetail, setSelectedDetail] = useState<KpiData | null>(null);

    useEffect(() => {
        setIsClient(true);
        const storedData = sessionStorage.getItem('selectedEmployeeAnalysis');
        if (storedData) {
            try {
                const parsedData: StoredAnalysisData = JSON.parse(storedData);
                setAnalysisData(parsedData);
            } catch (error) {
                console.error("Failed to parse analysis data from session storage", error);
                router.replace('/reports');
            }
        } else {
             console.warn("No analysis data found in session storage. Redirecting...");
             router.replace('/reports');
        }
    }, [router]);

    const analysisResult = useMemo(() => {
        if (!analysisData?.employee) return null;
        const trendData = kpiData
            .filter(d =>
                d.employeeId === analysisData.employee.id &&
                d.period >= analysisData.startPeriod &&
                d.period <= analysisData.endPeriod
            )
            .sort((a, b) => a.period.localeCompare(b.period));

        if (trendData.length === 0) return null;

        const totalScore = trendData.reduce((sum, d) => sum + d.score, 0);
        const averageScore = totalScore / trendData.length;

        const chartData = trendData.map(d => ({
            periodLabel: format(parse(d.period, "yyyy-MM", new Date()), "MMM yy", { locale: localeId }),
            date: parse(d.period, 'yyyy-MM', new Date()),
            "Rata-rata Skor": d.score
        })).sort((a, b) => a.date.getTime() - b.date.getTime());

        return { averageScore, trendData, chartData };
    }, [analysisData, kpiData]);

    const handleBack = () => {
        sessionStorage.removeItem('selectedEmployeeAnalysis');
        router.back();
    };
    
    if (!isClient || !analysisData || !analysisResult) {
        return (
             <div className="flex h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-muted-foreground">Memuat analisis...</p>
                </div>
            </div>
        );
    }

    const { employee, startPeriod, endPeriod } = analysisData;

    return (
      <>
        <div className="space-y-6">
            <Card>
                <CardHeader>
                   <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                         <div>
                            <Button variant="ghost" size="sm" onClick={handleBack} className="mb-2 -ml-2 self-start">
                                <ChevronLeft className="mr-2 h-4 w-4" />
                                Kembali ke Laporan
                            </Button>
                             <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-4">
                                <CardTitle className="text-lg font-semibold leading-none tracking-tight">Analisis Kinerja: {employee.name}</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Rata-Rata Skor: <span className="font-bold text-primary text-lg">{analysisResult.averageScore.toFixed(1)}</span>
                                </p>
                            </div>
                            <CardDescription className="text-sm text-muted-foreground p-0 pt-1">
                                Periode: {format(parse(startPeriod, "yyyy-MM", new Date()), "MMM yyyy", { locale: localeId })} - {format(parse(endPeriod, "yyyy-MM", new Date()), "MMM yyyy", { locale: localeId })}
                            </CardDescription>
                         </div>
                    </div>
                </CardHeader>
                 <CardContent>
                     <div className="flex flex-col sm:flex-row justify-between items-start gap-4 p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                <User className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">{employee.name}</h3>
                                <p className="text-sm text-muted-foreground">{employee.position} / {employee.department}</p>
                            </div>
                        </div>
                    </div>
                 </CardContent>
            </Card>

            <TeamPerformanceTrendChart chartData={analysisResult.chartData} />
            
            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-semibold">Rincian Skor per Bulan</CardTitle>
                    <CardDescription>Klik kartu untuk melihat rincian pencapaian bulanan.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {analysisResult.trendData.map(data => (
                            <Card 
                                key={data.period} 
                                className="text-center p-3 rounded-lg border bg-background hover:bg-muted transition-colors cursor-pointer"
                                onClick={() => setSelectedDetail(data)}
                            >
                                <CardHeader className="p-0"><CardTitle className="text-xs text-muted-foreground">{format(parse(data.period, "yyyy-MM", new Date()), "LLLL", { locale: localeId })}</CardTitle></CardHeader>
                                <CardContent className="p-0 pt-1">
                                    <p className="text-2xl font-bold">{data.score.toFixed(1)}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
        {selectedDetail && (
          <ReportDetailView 
            kpiData={selectedDetail}
            onClose={() => setSelectedDetail(null)}
          />
        )}
      </>
    );
}

    