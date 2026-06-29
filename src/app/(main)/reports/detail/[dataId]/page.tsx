// src/app/(main)/reports/detail/[dataId]/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { AchievementDetailDialog as AchievementDetailContent } from "@/components/reports/achievement-detail-dialog";
import type { KpiData } from '@/types';

export default function KpiReportDetailPage() {
    const router = useRouter();
    const [kpiData, setKpiData] = useState<KpiData | null>(null);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        const storedData = sessionStorage.getItem('selectedKpiDetail');
        if (storedData) {
            try {
                setKpiData(JSON.parse(storedData));
            } catch (error) {
                console.error("Failed to parse KPI data from session storage", error);
                router.replace('/reports');
            }
        } else {
             router.replace('/reports');
        }
    }, [router]);

    if (!isClient || !kpiData) {
        return (
             <div className="flex h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-muted-foreground">Memuat detail...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="p-4 border-b">
                <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2 -ml-2 self-start">
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Kembali ke Laporan
                </Button>
                <h2 className="text-lg font-semibold leading-none tracking-tight">Detail Pencapaian KPI</h2>
                <p className="text-sm text-muted-foreground">
                    Menampilkan rincian pencapaian untuk <span className="font-semibold text-foreground">{kpiData.employeeName}</span> periode <span className="font-semibold text-foreground">{kpiData.period}</span>.
                </p>
            </div>
            <div className="flex-1">
                <AchievementDetailContent kpiData={kpiData} isDialog={false} />
            </div>
        </div>
    );
}
