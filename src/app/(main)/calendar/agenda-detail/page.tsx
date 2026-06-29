// src/app/(main)/calendar/agenda-detail/page.tsx
"use client";

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Info, Users, Tag, Edit, X, Lock, ArrowLeft } from "lucide-react";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

function AgendaDetailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // In a real app, you'd use these params to fetch event details.
    // For now, we'll use dummy data based on a hypothetical event.
    const title = searchParams.get('title') || 'Event Tidak Ditemukan';
    const date = searchParams.get('date');
    const type = searchParams.get('type');
    const company = searchParams.get('company');

    const isLocked = true; // Dummy state for visual simulation

    return (
        <div className="max-w-2xl mx-auto">
             <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Kalender
            </Button>
            <Card className="shadow-lg">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>{title}</CardTitle>
                        {isLocked ? (
                            <Badge variant="destructive"><Lock className="mr-2 h-3 w-3"/> Terkunci</Badge>
                        ) : (
                            <Badge variant="outline">{type || 'Event'}</Badge>
                        )}
                    </div>
                    <CardDescription>Detail jadwal dan dampaknya pada sistem.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                <div className="flex items-center gap-4 text-sm">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                    <p className="font-semibold">{date ? new Date(date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Tanggal tidak spesifik'}</p>
                    <p className="text-muted-foreground">Ini adalah tanggal efektif event ini.</p>
                    </div>
                </div>
                <div className="flex items-start gap-4 text-sm">
                    <Info className="h-5 w-5 text-muted-foreground mt-1" />
                    <div>
                    <p className="font-semibold">Deskripsi</p>
                    <p className="text-muted-foreground">
                        Event ini secara otomatis akan mengubah status modul terkait di seluruh perusahaan yang menjadi target.
                    </p>
                    </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                    <p className="font-semibold">Target</p>
                    <p className="text-muted-foreground">{company || 'Semua Perusahaan'}</p>
                    </div>
                </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default function AgendaDetailPage() {
    return (
        <Suspense fallback={<div>Memuat detail...</div>}>
            <AgendaDetailContent />
        </Suspense>
    );
}
