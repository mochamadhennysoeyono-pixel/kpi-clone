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
import { AIFeedbackCoach } from "@/components/my-performance/ai-feedback-coach";
import { usePageContext } from "@/contexts/page-context";


export default function MyPerformancePage() {
    const { kpiData, employees, kpiSetups } = useMasterData();
    const { currentUser } = useAuth();
    const { setPageContext } = usePageContext();

    const myAvailablePeriods = useMemo(() => {
        if (!currentUser) return [];
        return [...new Set(kpiData
            .filter(d => d.employeeId === currentUser.id)
            .map(d => d.period))]
            .sort((a, b) => b.localeCompare(a)); // Sort descending
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
    
    // Effect to update page context for KIPI
    useEffect(() => {
        setPageContext('Halaman Performa Saya', null);
    }, [setPageContext]);


    if (!currentUser) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <p className="text-muted-foreground">Memuat data pengguna...</p>
            </div>
        )
    }

    if (myAvailablePeriods.length === 0) {
       return (
             <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <h2 className="font-headline text-2xl">Performa Saya</h2>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground text-center">
                            Belum ada data kinerja yang tersedia untuk Anda. <br/> Silakan isi pencapaian KPI Anda terlebih dahulu.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center mb-4">
                 <div className="flex items-center gap-2">
                    <Select value={selectedPeriod ?? ""} onValueChange={setSelectedPeriod}>
                        <SelectTrigger className="w-full md:w-[180px]">
                            <SelectValue placeholder="Pilih Periode" />
                        </SelectTrigger>
                        <SelectContent>
                            {myAvailablePeriods.map(period => (
                                <SelectItem key={period} value={period}>{format(parse(period, "yyyy-MM", new Date()), "LLLL yyyy", { locale: localeId })}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            
            {myKpiDataForPeriod && (
                <AIFeedbackCoach kpiData={myKpiDataForPeriod} />
            )}

            {myKpiDataForPeriod ? (
                <Card>
                    <CardContent className="p-0 sm:p-6">
                        <AchievementDetailDialog 
                            isDialog={false}
                            kpiData={myKpiDataForPeriod}
                        />
                    </CardContent>
                </Card>
            ) : (
                 <Card>
                    <CardContent>
                        <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground">
                                Data kinerja Anda untuk periode yang dipilih belum tersedia.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
