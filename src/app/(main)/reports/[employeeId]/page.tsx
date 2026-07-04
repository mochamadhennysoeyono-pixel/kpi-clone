// src/app/(main)/reports/[employeeId]/page.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, User, ChevronLeft, TrendingUp, BarChart3, Clock } from "lucide-react";
import { format, parse } from "date-fns";
import { id as localeId } from "date-fns/locale";
import type { Employee, KpiData } from "@/types";
import { useMasterData } from "@/contexts/master-data-context";
import TeamPerformanceTrendChart from "@/components/reports/team-performance-trend-chart";
import { ReportDetailView } from '@/app/(main)/reports/page';
import { ResponsivePage } from "@/components/ui/adaptive-layout";
import { PageHeader } from "@/components/ui/page-header";
import { AdaptiveCardGrid, AdaptiveMetricCard, AdaptiveInsightCard } from "@/components/ui/adaptive-card";

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
      <ResponsivePage>
            <div className="flex flex-col gap-6">
                <Button variant="ghost" onClick={handleBack} className="-ml-4 hover:bg-muted font-bold text-[10px] uppercase tracking-widest text-muted-foreground w-fit px-4">
                    <ChevronLeft className="mr-2 h-4 w-4" /> Kembali ke Daftar
                </Button>

                <PageHeader 
                    title={`Analisis Performa: ${employee.name}`}
                    description={`Visualisasi tren pencapaian target periode ${format(parse(startPeriod, "yyyy-MM", new Date()), "MMM yyyy", { locale: localeId })} - ${format(parse(endPeriod, "yyyy-MM", new Date()), "MMM yyyy", { locale: localeId })}`}
                    icon={User}
                />

                <AdaptiveCardGrid complexity="simple">
                    <AdaptiveMetricCard 
                        title="Rata-Rata Skor" 
                        value={analysisResult.averageScore.toFixed(1)} 
                        icon={BarChart3}
                        color="bg-primary/10 text-primary"
                    />
                    <AdaptiveMetricCard 
                        title="Total Periode" 
                        value={analysisResult.trendData.length} 
                        icon={CalendarIcon}
                        description="Bulan terdata"
                    />
                    <AdaptiveMetricCard 
                        title="Capaian Tertinggi" 
                        value={Math.max(...analysisResult.trendData.map(d => d.score)).toFixed(1)} 
                        icon={TrendingUp}
                        color="bg-emerald-500/10 text-emerald-600"
                    />
                    <AdaptiveMetricCard 
                        title="Status Terakhir" 
                        value={analysisResult.trendData[analysisResult.trendData.length-1].status} 
                        icon={Clock}
                        color="bg-blue-500/10 text-blue-600"
                    />
                </AdaptiveCardGrid>

                <AdaptiveCardGrid complexity="complex">
                    <AdaptiveInsightCard title="Tren Skor Bulanan" icon={TrendingUp} description="Perkembangan skor dari waktu ke waktu">
                        <div className="h-[350px] pt-4">
                            <TeamPerformanceTrendChart chartData={analysisResult.chartData} />
                        </div>
                    </AdaptiveInsightCard>

                    <AdaptiveInsightCard title="Rincian Laporan Per Bulan" icon={Clock} description="Klik kartu untuk melihat rincian pencapaian">
                        <ScrollArea className="h-[350px] pr-4">
                            <div className="grid grid-cols-2 gap-3 py-2">
                                {analysisResult.trendData.map(data => (
                                    <button 
                                        key={data.period} 
                                        onClick={() => setSelectedDetail(data)}
                                        className="text-center p-3 rounded-xl border bg-background hover:bg-muted/50 hover:border-primary/20 transition-all group"
                                    >
                                        <p className="text-[10px] font-black uppercase text-muted-foreground group-hover:text-primary transition-colors">
                                            {format(parse(data.period, "yyyy-MM", new Date()), "LLLL", { locale: localeId })}
                                        </p>
                                        <p className="text-2xl font-black mt-1 text-slate-800">{data.score.toFixed(1)}</p>
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>
                    </AdaptiveInsightCard>
                </AdaptiveCardGrid>
            </div>

            {selectedDetail && (
                <ReportDetailView 
                    kpiData={selectedDetail}
                    onClose={() => setSelectedDetail(null)}
                />
            )}
      </ResponsivePage>
    );
}
