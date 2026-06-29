// src/app/(main)/okr/okr-detail-view.tsx
"use client";

import { useMemo, useState } from 'react';
import type { OKR, KeyResult, ProgressUpdate, Milestone } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Target, User, Calendar, Flame, Shield, TrendingUp, Edit, Send, ChevronLeft, Files, Users as UsersIcon, ListChecks, ArrowRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const PriorityBadge = ({ priority }: { priority: OKR['priority'] }) => {
    const variant = priority === 'Crucial' ? 'destructive' : priority === 'Medium' ? 'secondary' : 'outline';
    const icon = priority === 'Crucial' ? <Flame className="h-3 w-3 mr-1" /> : priority === 'Medium' ? <TrendingUp className="h-3 w-3 mr-1" /> : <Shield className="h-3 w-3 mr-1" />;
    return <Badge variant={variant} className="flex items-center gap-1">{icon} {priority}</Badge>;
};

export const OKRDetailView = ({ okr }: { okr: OKR }) => {
    const { currentUser } = useAuth();
    const { updateOkrStatus } = useMasterData();
    const router = useRouter();
    const isOwner = currentUser?.id === okr.ownerId;
    const isApprover = currentUser?.id === okr.approverId || currentUser?.role === 'superadmin' || (currentUser?.role === 'manajemen' && currentUser?.company === okr.company);
    
    const getDate = (date: any): Date | null => {
        if (!date) return null;
        if (date instanceof Date) return date;
        if (typeof date.toDate === 'function') {
            return date.toDate();
        }
        // Handle ISO strings or other date strings
        const d = new Date(date);
        if (isNaN(d.getTime())) {
            return null;
        }
        return d;
    };

    const startDate = getDate(okr.startDate);
    const endDate = getDate(okr.endDate);
    
    return (
        <div className="space-y-6">
            <Button variant="ghost" onClick={() => router.push('/okr')} className="-ml-4">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Kembali ke Daftar OKR
            </Button>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start gap-4">
                        <div>
                            <Badge variant="outline" className="mb-2">{okr.status}</Badge>
                            <CardTitle className="font-headline text-2xl">{okr.objective}</CardTitle>
                            {okr.description && (
                                <CardDescription className="pt-2 max-w-prose">{okr.description}</CardDescription>
                            )}
                        </div>
                         <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <PriorityBadge priority={okr.priority} />
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>{startDate ? format(startDate, "d MMM yy", { locale: localeId }) : ''} - {endDate ? format(endDate, "d MMM yyyy", { locale: localeId }) : ''}</span>
                            </div>
                        </div>
                    </div>
                     <div className="flex items-center gap-2 text-sm text-muted-foreground border-t pt-4 mt-4">
                        <User className="h-4 w-4" />
                        <span>Penanggung Jawab: <span className="font-semibold text-foreground">{okr.ownerName}</span></span>
                    </div>
                </CardHeader>
                <CardContent>
                     <div className="space-y-1">
                        <div className="flex justify-between items-center text-sm font-medium">
                            <span>Progres Total Objective</span>
                            <span className="text-primary font-bold text-lg">{(okr.progress ?? 0).toFixed(1)}%</span>
                        </div>
                        <Progress value={okr.progress} className="h-3" />
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="deliverables">
                <TabsList>
                    <TabsTrigger value="deliverables">Key Results</TabsTrigger>
                    <TabsTrigger value="timeline">Aktivitas</TabsTrigger>
                    <TabsTrigger value="team" disabled>Tim</TabsTrigger>
                    <TabsTrigger value="files" disabled>Files</TabsTrigger>
                    <TabsTrigger value="logs">Riwayat Aktivitas</TabsTrigger>
                </TabsList>
                <TabsContent value="deliverables" className="mt-4">
                    <Card>
                        <CardHeader><CardTitle>Daftar Key Results</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                             {okr.keyResults.map(kr => {
                                 // Fix relative progress calculation for detail view
                                 const range = kr.targetValue - kr.startValue;
                                 const progress = range > 0 ? ((kr.currentValue - kr.startValue) / range) * 100 : (kr.currentValue >= kr.targetValue ? 100 : 0);
                                 const unit = kr.unit || (kr.type === 'Percentage' ? '%' : '');

                                 return (
                                     <div key={kr.id} className="p-4 border rounded-lg space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold">{kr.name}</p>
                                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-1">
                                                    <span className="bg-muted px-1.5 py-0.5 rounded border">Mulai: {kr.startValue}{unit}</span>
                                                    <ArrowRight className="h-3 w-3" />
                                                    <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20 font-bold">Target: {kr.targetValue}{unit}</span>
                                                </div>
                                            </div>
                                            <p className="text-lg font-black text-primary">{Math.max(0, Math.min(progress, 100)).toFixed(1)}%</p>
                                        </div>
                                        <Progress value={Math.max(0, Math.min(progress, 100))} className="h-2" />
                                        <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                                            <span className="font-mono">
                                                Aktual: {kr.currentValue.toLocaleString('id-ID')}{unit}
                                            </span>
                                             <span>
                                                Owner: <span className="font-bold text-foreground">{kr.ownerName || okr.ownerName}</span>
                                            </span>
                                        </div>
                                    </div>
                                 )
                             })}
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="timeline" className="mt-4">
                    <Card><CardHeader><CardTitle className="flex items-center gap-2"><ListChecks/>Aktivitas</CardTitle></CardHeader><CardContent><p className="text-muted-foreground text-sm italic p-8 text-center border-2 border-dashed rounded-lg">Fitur ini sedang dalam pengembangan.</p></CardContent></Card>
                </TabsContent>
                <TabsContent value="team" className="mt-4">
                    <Card><CardHeader><CardTitle className="flex items-center gap-2"><UsersIcon/>Tim OKR</CardTitle></CardHeader><CardContent><p className="text-muted-foreground text-sm italic p-8 text-center border-2 border-dashed rounded-lg">Fitur ini sedang dalam pengembangan.</p></CardContent></Card>
                </TabsContent>
                <TabsContent value="files" className="mt-4">
                    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Files/>File & Lampiran</CardTitle></CardHeader><CardContent><p className="text-muted-foreground text-sm italic p-8 text-center border-2 border-dashed rounded-lg">Fitur ini sedang dalam pengembangan.</p></CardContent></Card>
                </TabsContent>
                <TabsContent value="logs" className="mt-4">
                    <Card>
                        <CardHeader><CardTitle>Riwayat Aktivitas</CardTitle></CardHeader>
                        <CardContent>
                            {okr.activityLog && okr.activityLog.length > 0 ? (
                                <div className="space-y-4">
                                    {okr.activityLog.slice().reverse().map(log => (
                                        <div key={log.id} className="p-3 border-l-2 border-primary bg-muted/30 rounded-r-lg">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-bold text-sm">{log.authorName}</span>
                                                <span className="text-[10px] text-muted-foreground">{log.timestamp && typeof log.timestamp.toDate === 'function' ? format(log.timestamp.toDate(), "d MMM yyyy, HH:mm") : 'Baru saja'}</span>
                                            </div>
                                            <p className="text-sm text-foreground/80">{log.comment}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-sm italic p-8 text-center border-2 border-dashed rounded-lg">Belum ada catatan aktivitas.</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};
