// src/app/(main)/okr/okr-detail-view.tsx
"use client";

import { useMemo, useState } from 'react';
import type { OKR, KeyResult, ProgressUpdate, Milestone, Contributor, Employee } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Target, User, Calendar, Flame, Shield, TrendingUp, Edit, Send, ChevronLeft, Files, Users as UsersIcon, ListChecks, ArrowRight, Clock, MessageSquare, Briefcase, Building } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ResponsivePage } from '@/components/ui/adaptive-layout';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { AdaptiveCardGrid, AdaptiveMetricCard, AdaptiveInsightCard } from '@/components/ui/adaptive-card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

const PriorityBadge = ({ priority }: { priority: OKR['priority'] }) => {
    const variant = priority === 'Crucial' ? 'destructive' : priority === 'Medium' ? 'secondary' : 'outline';
    const icon = priority === 'Crucial' ? <Flame className="h-3 w-3 mr-1" /> : priority === 'Medium' ? <TrendingUp className="h-3 w-3 mr-1" /> : <Shield className="h-3 w-3 mr-1" />;
    return <Badge variant={variant} className="flex items-center gap-1 font-black text-[9px] uppercase px-2 h-5 border-none shadow-sm">{icon} {priority}</Badge>;
};

const resolveName = (id: string | undefined, storedName: string | undefined, employees: Employee[]) => {
    if (storedName && storedName !== 'Unknown' && storedName !== 'N/A' && storedName !== '') return storedName;
    if (!id) return 'Unknown';
    const emp = employees.find(e => e.id === id);
    return emp ? emp.name : 'Unknown';
};

export const OKRDetailView = ({ okr }: { okr: OKR }) => {
    const { currentUser } = useAuth();
    const { employees } = useMasterData();
    const { isMobile } = useBreakpoint();
    const router = useRouter();
    
    const getDate = (date: any): Date | null => {
        if (!date) return null;
        if (date instanceof Date) return date;
        if (typeof date.toDate === 'function') return date.toDate();
        const d = new Date(date);
        return isNaN(d.getTime()) ? null : d;
    };

    const startDate = getDate(okr.startDate);
    const endDate = getDate(okr.endDate);
    
    return (
        <ResponsivePage>
            <div className="flex flex-col gap-6">
                <Button variant="ghost" onClick={() => router.push('/okr')} className="-ml-4 hover:bg-muted font-bold text-[10px] uppercase tracking-widest text-muted-foreground w-fit px-4">
                    <ChevronLeft className="mr-2 h-4 w-4" /> Kembali ke Workspace
                </Button>

                <Card className="border-l-4 border-primary shadow-lg overflow-hidden bg-background">
                    <CardHeader className={isMobile ? "p-5" : "p-8"}>
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
                            <div className="space-y-4 min-w-0">
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="outline" className="text-[10px] font-black uppercase h-5 bg-muted/50 border-none">{okr.status}</Badge>
                                    <PriorityBadge priority={okr.priority} />
                                </div>
                                <h1 className={cn("font-black tracking-tighter text-slate-900 leading-tight", isMobile ? "text-2xl" : "text-4xl")}>
                                    {okr.objective}
                                </h1>
                                {okr.description && <p className="text-muted-foreground text-sm leading-relaxed max-w-3xl">{okr.description}</p>}
                            </div>
                            <div className="flex flex-col items-end gap-3 flex-shrink-0 w-full sm:w-auto">
                                <div className="text-right p-4 rounded-2xl bg-primary/5 border border-primary/10 w-full sm:w-auto">
                                    <p className="text-[10px] uppercase font-black text-primary/60 tracking-widest mb-1">Capaian Progres</p>
                                    <p className={cn("font-black text-primary leading-none", isMobile ? "text-4xl" : "text-5xl")}>
                                        {(okr.progress ?? 0).toFixed(1)}%
                                    </p>
                                </div>
                                <div className="text-[9px] font-black uppercase text-muted-foreground flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full border border-border/40">
                                    <Calendar className="size-3 opacity-60" />
                                    <span>{startDate ? format(startDate, "d MMM yy") : ''} - {endDate ? format(endDate, "d MMM yyyy") : ''}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-t border-dashed mt-8 pt-6">
                            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                <User size={14} />
                            </div>
                            <span>Project Owner: <span className="text-slate-900 font-bold">{resolveName(okr.ownerId, okr.ownerName, employees)}</span></span>
                        </div>
                    </CardHeader>
                    <CardContent className={isMobile ? "p-5 pt-0" : "p-8 pt-0"}>
                        <div className="space-y-2 pt-4">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-primary/60">
                                <span>Health Check Progres</span>
                                <span>{(okr.progress ?? 0).toFixed(0)}%</span>
                            </div>
                            <Progress value={okr.progress} className="h-2.5" />
                        </div>
                    </CardContent>
                </Card>

                <Tabs defaultValue="deliverables" className="w-full">
                    <ScrollArea className="w-full" orientation="horizontal">
                        <TabsList className="flex w-max sm:grid sm:w-full sm:grid-cols-3 max-w-[500px] bg-muted/30 p-1 rounded-xl mb-8">
                            <TabsTrigger value="deliverables" className="font-bold text-xs uppercase px-6">Key Results</TabsTrigger>
                            <TabsTrigger value="logs" className="font-bold text-xs uppercase px-6">Riwayat</TabsTrigger>
                            <TabsTrigger value="info" className="font-bold text-xs uppercase px-6">Info Lanjut</TabsTrigger>
                        </TabsList>
                    </ScrollArea>

                    <TabsContent value="deliverables" className="m-0 border-none space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1 flex items-center gap-2">
                            <ListChecks size={14} className="text-primary" /> Strategi Hasil Utama
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {okr.keyResults.map(kr => {
                                 const range = kr.targetValue - kr.startValue;
                                 const progress = range > 0 ? ((kr.currentValue - kr.startValue) / range) * 100 : (kr.currentValue >= kr.targetValue ? 100 : 0);
                                 const unit = kr.unit || (kr.type === 'Percentage' ? '%' : '');

                                 return (
                                     <Card key={kr.id} className="border-border/40 hover:shadow-md transition-all group overflow-hidden bg-background">
                                        <CardContent className="p-5 space-y-4">
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="space-y-1 min-w-0">
                                                    <h4 className="font-black text-xs uppercase text-slate-800 leading-tight line-clamp-2">{kr.name}</h4>
                                                    <p className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                                        <Badge variant="outline" className="h-4 px-1 text-[7px] border-none bg-muted/60">{kr.type}</Badge>
                                                        PIC: {resolveName(kr.ownerId || okr.ownerId, kr.ownerName, employees)}
                                                    </p>
                                                </div>
                                                <p className="text-lg font-black text-primary shrink-0">{Math.max(0, Math.min(progress, 100)).toFixed(0)}%</p>
                                            </div>
                                            <Progress value={Math.max(0, Math.min(progress, 100))} className="h-1" />
                                            <div className="grid grid-cols-2 gap-4 pt-1">
                                                <div className="space-y-0.5">
                                                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Aktual</p>
                                                    <p className="text-sm font-black text-slate-700">{kr.currentValue.toLocaleString('id-ID')}{unit}</p>
                                                </div>
                                                <div className="space-y-0.5 text-right">
                                                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Target</p>
                                                    <p className="text-sm font-black text-slate-700">{kr.targetValue.toLocaleString('id-ID')}{unit}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                 )
                             })}
                        </div>
                    </TabsContent>

                    <TabsContent value="logs" className="m-0 border-none animate-in fade-in duration-300">
                        <Card className="border-border/40 shadow-sm overflow-hidden bg-background">
                            <CardHeader className="bg-muted/30 border-b p-5">
                                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                    <Clock size={16} className="text-primary" /> Jejak Aktivitas Project
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ScrollArea className="h-[450px]">
                                    <div className="divide-y divide-border/40">
                                        {okr.activityLog && okr.activityLog.length > 0 ? (
                                            okr.activityLog.slice().reverse().map(log => (
                                                <div key={log.id} className="p-5 flex gap-4 hover:bg-muted/5 transition-colors">
                                                    <Avatar className="size-8 shrink-0 border shadow-sm">
                                                        <AvatarFallback className="text-[10px] font-black bg-primary/10 text-primary">
                                                            {log.authorName.substring(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1 min-w-0 space-y-1">
                                                        <div className="flex justify-between items-center">
                                                            <p className="text-xs font-bold text-slate-900">{log.authorName}</p>
                                                            <span className="text-[9px] font-medium text-muted-foreground uppercase">
                                                                {log.timestamp && typeof log.timestamp.toDate === 'function' ? format(log.timestamp.toDate(), "d MMM, HH:mm") : 'Baru saja'}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-600 leading-relaxed">{log.comment}</p>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-20 text-center text-muted-foreground italic text-xs">Belum ada riwayat aktivitas tercatat.</div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="info" className="m-0 border-none space-y-4">
                         <AdaptiveCardGrid complexity="complex">
                            <AdaptiveInsightCard title="Struktur Delegasi" icon={Briefcase} description="Unit bisnis yang terlibat">
                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl bg-muted/30 border border-dashed text-center">
                                        <Building className="size-8 text-primary mx-auto mb-2 opacity-20" />
                                        <p className="text-sm font-bold text-slate-800">{okr.company}</p>
                                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mt-1">ORGANISASI INDUK</p>
                                    </div>
                                    <div className="space-y-3">
                                         <p className="text-[10px] font-black uppercase text-muted-foreground ml-1">Statistik Internal</p>
                                         <div className="grid grid-cols-2 gap-3">
                                            <div className="p-3 rounded-xl bg-background border flex flex-col items-center">
                                                <p className="text-xl font-black text-primary">{okr.keyResults.length}</p>
                                                <p className="text-[8px] font-bold text-muted-foreground uppercase">Key Results</p>
                                            </div>
                                            <div className="p-3 rounded-xl bg-background border flex flex-col items-center">
                                                <p className="text-xl font-black text-primary">{new Set(okr.keyResults.map(k => k.ownerId || okr.ownerId)).size}</p>
                                                <p className="text-[8px] font-bold text-muted-foreground uppercase">Kolaborator</p>
                                            </div>
                                         </div>
                                    </div>
                                </div>
                            </AdaptiveInsightCard>
                         </AdaptiveCardGrid>
                    </TabsContent>
                </Tabs>
            </div>
        </ResponsivePage>
    );
};
