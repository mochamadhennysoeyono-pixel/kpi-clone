// src/app/(main)/cycle-reports/[reportId]/page.tsx
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ReportData } from '../page';
import CycleDetailViewContent from '@/components/cycle-reports/cycle-detail-dialog-content';

export default function CycleReportDetailPage() {
    const router = useRouter();
    const [report, setReport] = useState<ReportData | null>(null);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        const storedReport = sessionStorage.getItem('selectedCycleReport');
        if (storedReport) {
            try {
                const parsedReport = JSON.parse(storedReport);
                setReport(parsedReport);
            } catch (error) {
                console.error("Failed to parse report data from session storage", error);
                router.replace('/cycle-reports');
            }
        } else {
             console.warn("No report data found in session storage. Redirecting...");
             router.replace('/cycle-reports');
        }
    }, [router]);

    // This page is intended for mobile only. 
    // Show a loader until the client-side check is complete and data is loaded.
    if (!isClient || !report) {
        return (
             <div className="flex h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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
                <h2 className="text-lg font-semibold leading-none tracking-tight">{report.indicator.indicator}</h2>
                <p className="text-sm text-muted-foreground">
                    Rincian kontribusi untuk siklus {report.indicator.cycle.toLowerCase()}. Penanggung Jawab: <span className="font-semibold text-foreground">{report.leader?.name || 'Holding'}</span>.
                </p>
            </div>
            <ScrollArea className="flex-1 p-4">
                <CycleDetailViewContent report={report} />
            </ScrollArea>
        </div>
    );
}

// Renaming the component to avoid naming conflicts
const CycleDetailView = {
    Content: CycleDetailViewContent,
};

export { CycleDetailView };
