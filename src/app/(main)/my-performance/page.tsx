// src/app/(main)/my-performance/page.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { useMasterData } from "@/contexts/master-data-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { format, parse } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { AchievementDetailDialog } from "@/components/reports/achievement-detail-dialog";
import { usePageContext } from "@/contexts/page-context";
import { ResponsivePage, ResponsiveToolbar } from "@/components/ui/adaptive-layout";
import { PageHeader } from "@/components/ui/page-header";
import { UserCog, Calendar, FilePieChart, TrendingUp, BarChart3, Clock, AlertCircle } from "lucide-react";
import { AdaptiveCardGrid, AdaptiveMetricCard } from "@/components/ui/adaptive-card";

export default function MyPerformancePage() {
    const { kpiData, currentUser: userProfile } = useMasterData();
    const { currentUser } = useAuth();
    const { setPageContext } = usePageContext();

    const myAvailablePeriods = useMemo(() => {
        if (!currentUser) return [];
        return [...new Set(kpiData
            .filter(d => d.employeeId === currentUser.id)
            .map(d => d.period))]
            .sort((a, b) => b.localeCompare(a));
    }, [kpiData, currentUser]);
    
    const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);

    useEffect(() => {
        if (myAvailablePeriods.length > 0 && !selectedPeriod) {
            setSelectedPeriod(myAvailablePeriods[0]);
        }
    }, [myAvailablePeriods, selectedPeriod]);

    const myKpiDataForPeriod = useMemo(() => {
        if (!selectedPeriod || !currentUser) return null;
        return kpiData.find(d => d.employeeId === currentUser.id && d.period === selectedPeriod) || null;
    }, [kpiData, currentUser, selectedPeriod]);
    
    useEffect(() => {
        setPageContext('Performa Saya', null);
    }, [setPageContext]);

    if (!currentUser) return null;

    return (
      <ResponsivePage>
        <PageHeader 
            title="Performa Saya" 
            description="Tinjau histori pencapaian, tren skor, dan analisis status kinerja pribadi Anda."
            icon={UserCog}
        />

        {myAvailablePeriods.length > 0 ? (
            <div className="space-y-8">
                <ResponsiveToolbar>
                    <div className="flex items-center gap-3">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Pilih Periode Laporan:</Label>
                        <Select value={selectedPeriod ?? ""} onValueChange={setSelectedPeriod}>
                            <SelectTrigger className="w-full md:w-[220px] bg-background border-none shadow-sm font-bold h-10">
                                <Calendar size={14} className="mr-2 text-primary" />
                                <SelectValue placeholder="Pilih Periode" />
                            </SelectTrigger>
                            <SelectContent className="z-[350]">
                                {myAvailablePeriods.map(period => (
                                    <SelectItem key={period} value={period}>
                                        {format(parse(period, "yyyy-MM", new Date()), "MMMM yyyy", { locale: localeId })}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </ResponsiveToolbar>

                {myKpiDataForPeriod ? (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <AdaptiveCardGrid complexity="simple">
                            <AdaptiveMetricCard 
                                title="Skor Akhir" 
                                value={myKpiDataForPeriod.score.toFixed(1)} 
                                icon={BarChart3}
                                color="bg-primary/10 text-primary"
                            />
                            <AdaptiveMetricCard 
                                title="Status Kinerja" 
                                value={myKpiDataForPeriod.status} 
                                icon={TrendingUp}
                                color="bg-emerald-500/10 text-emerald-600"
                            />
                            <AdaptiveMetricCard 
                                title="Persetujuan" 
                                value={myKpiDataForPeriod.approvalStatus} 
                                icon={Clock}
                                color={myKpiDataForPeriod.approvalStatus === 'Disetujui' ? "bg-blue-500/10 text-blue-600" : "bg-amber-500/10 text-amber-600"}
                            />
                        </AdaptiveCardGrid>

                        <div className="bg-background rounded-3xl border border-border/40 shadow-xl overflow-hidden">
                            <AchievementDetailDialog 
                                isDialog={false}
                                kpiData={myKpiDataForPeriod}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="py-32 text-center border-2 border-dashed rounded-3xl opacity-30">
                        <FilePieChart size={48} className="mx-auto mb-4" />
                        <p className="font-bold uppercase text-xs">Pilih periode untuk melihat detail</p>
                    </div>
                )}
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed rounded-3xl bg-muted/10 opacity-40 text-center">
                <AlertCircle size={48} className="mb-4 text-muted-foreground" />
                <p className="font-black uppercase text-[10px] tracking-[0.2em]">Belum Ada Data Kinerja</p>
                <p className="text-xs font-medium mt-2 max-w-xs">Data akan muncul di sini setelah Anda mengisi pencapaian KPI bulanan.</p>
            </div>
        )}
      </ResponsivePage>
    );
}
