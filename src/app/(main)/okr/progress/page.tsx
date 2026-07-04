// src/app/(main)/okr/progress/page.tsx
"use client";

import { useMemo, useState, useEffect, useCallback } from 'react';
import type { OKR, KeyResult, Milestone, ChecklistItem, Contributor, CollabActivityLogEntry } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { 
  Target, 
  User as LucideUser, 
  Users as LucideUsers, 
  Calendar, 
  CheckSquare, 
  Hash, 
  Percent, 
  ChevronLeft, 
  Loader2, 
  ListChecks, 
  ArrowRight, 
  BookCopy, 
  Save,
  Lock as LucideLock,
  Timer,
  TrendingUp
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { serverTimestamp } from 'firebase/firestore';
import { ResponsivePage } from '@/components/ui/adaptive-layout';
import { PageHeader } from '@/components/ui/page-header';
import { AdaptiveCardGrid, AdaptiveInsightCard } from '@/components/ui/adaptive-card';
import { useBreakpoint } from '@/hooks/use-breakpoint';

// Helper to safely convert dates
const safeToDate = (dateVal: any): Date | null => {
    if (!dateVal) return null;
    if (dateVal instanceof Date) return dateVal;
    if (typeof dateVal.toDate === 'function') return dateVal.toDate();
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d;
};

const formatSafeDate = (date: any, formatStr: string) => {
    const d = safeToDate(date);
    if (!d || !isValid(d)) return 'N/A';
    return format(d, formatStr, { locale: localeId });
};

function isValid(d: any): d is Date {
    return d instanceof Date && !isNaN(d.getTime());
}

// --- Detail View with Adaptive Layout ---
function UserOkrDetailView({ okr, onBack }: { okr: OKR; onBack: () => void }) {
    const { currentUser } = useAuth();
    const { updateOkr, fetchData, employees } = useMasterData();
    const { toast } = useToast();
    const { isMobile } = useBreakpoint();
    
    const [updates, setUpdates] = useState<Record<string, { value?: number | '', items?: Record<string, boolean> }>>({});
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState<string | null>(null);

    const createLogEntry = (comment: string) => ({
        id: `log_${Date.now()}`,
        authorId: currentUser!.id,
        authorName: currentUser!.name,
        timestamp: serverTimestamp(),
        comment,
        type: 'progress' as const
    });

    const handleUpdate = async (krId: string) => {
        setLoading(krId);
        const krToUpdate = okr.keyResults.find(k => k.id === krId);
        if (!krToUpdate) {
            setLoading(null);
            return;
        }

        const updatedOkr = { ...okr, keyResults: okr.keyResults.map(kr => ({ ...kr })) };
        const krIndex = updatedOkr.keyResults.findIndex((kr: KeyResult) => kr.id === krId);
        const krData = updatedOkr.keyResults[krIndex];
        const updateData = updates[krId];
        const updateNote = notes[krId] || '';
        let logComment = '';

        if (krData.type === 'Numeric' || krData.type === 'Percentage') {
            const newValue = updateData?.value === '' ? undefined : Number(updateData?.value);
            if (newValue === undefined) {
                toast({ variant: 'destructive', title: 'Input tidak valid' });
                setLoading(null);
                return;
            }
            if (krData.ownershipModel === 'split_ownership') {
                const cIndex = krData.contributors.findIndex((c: Contributor) => c.ownerId === currentUser!.id);
                if (cIndex !== -1) krData.contributors[cIndex].currentValue = newValue;
                krData.currentValue = krData.contributors.reduce((s: number, c: Contributor) => s + (c.currentValue || 0), 0);
            } else {
                krData.currentValue = newValue;
            }
            logComment = `Update progres "${krData.name}" ke ${newValue}${krData.unit || ''}. ${updateNote}`;
        } else {
            const items = krData.type === 'Milestone' ? krData.milestones : krData.checklist;
            let changed = false;
            Object.entries(updateData?.items || {}).forEach(([itemId, isCompleted]) => {
                const item = items.find((i: any) => i.id === itemId);
                if (item && item.completed !== isCompleted) {
                    item.completed = isCompleted;
                    changed = true;
                    logComment += `${isCompleted ? 'Selesai' : 'Batal'} "${item.text}". `;
                }
            });
            if (krData.type === 'Milestone') krData.currentValue = krData.milestones.filter((m: Milestone) => m.completed).length;
            else krData.currentValue = krData.checklist.filter((c: ChecklistItem) => c.completed).length;
            logComment += updateNote;
            if (!changed && !updateNote) { setLoading(null); return; }
        }
        
        const totalWeight = updatedOkr.keyResults.reduce((s: number, k: KeyResult) => s + (k.weight || 0), 0);
        const useW = totalWeight > 99 && totalWeight < 101;
        updatedOkr.progress = updatedOkr.keyResults.reduce((s: number, k: KeyResult) => {
            const range = k.targetValue - k.startValue;
            const p = range > 0 ? ((k.currentValue - k.startValue) / range) * 100 : (k.currentValue >= k.targetValue ? 100 : 0);
            const w = useW && k.weight ? k.weight / 100 : (1 / updatedOkr.keyResults.length);
            return s + (Math.max(0, Math.min(p, 100)) * w);
        }, 0);

        updatedOkr.activityLog = [...(updatedOkr.activityLog || []), createLogEntry(logComment)];

        try {
            await updateOkr(okr.id, updatedOkr);
            toast({ title: 'Progres Berhasil Diperbarui' });
            setUpdates(prev => ({...prev, [krId]: {}})); 
            setNotes(prev => ({...prev, [krId]: ''}));
            fetchData(true);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Gagal Update', description: e.message });
        } finally {
            setLoading(null);
        }
    };
    
    return (
        <div className="space-y-6">
            <Button variant="ghost" onClick={onBack} className="-ml-4 hover:bg-muted font-bold text-[10px] uppercase tracking-widest text-muted-foreground px-4">
                <ChevronLeft className="mr-2 h-4 w-4" /> Kembali ke Daftar
            </Button>

            <AdaptiveInsightCard 
                title={okr.objective} 
                description={okr.description} 
                icon={Target}
                footer={
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-muted-foreground">
                            <LucideUser size={12} className="opacity-40" /> Owner: {okr.ownerName}
                        </div>
                        <Badge variant="outline" className="text-[10px] font-black h-5 border-primary/20 text-primary uppercase">{okr.status}</Badge>
                    </div>
                }
            >
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider">
                        <span className="text-muted-foreground">Progres Total Project</span>
                        <span className="text-primary text-xl">{(okr.progress ?? 0).toFixed(1)}%</span>
                    </div>
                    <Progress value={okr.progress} className="h-2" />
                </div>
            </AdaptiveInsightCard>

            <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1 flex items-center gap-2">
                    <Timer size={14} className="text-primary" /> Key Results yang Perlu Diupdate
                </h3>
                
                {okr.keyResults.map(kr => {
                    const range = kr.targetValue - kr.startValue;
                    const p = range > 0 ? ((kr.currentValue - kr.startValue) / range) * 100 : (kr.currentValue >= kr.targetValue ? 100 : 0);
                    const safeP = Math.max(0, Math.min(p, 100));
                    const unit = kr.unit || (kr.type === 'Percentage' ? '%' : '');
                    const canUpdate = (kr.ownershipModel === 'single_owner' && (kr.ownerId || okr.ownerId) === currentUser?.id) ||
                                     (kr.ownershipModel === 'split_ownership' && kr.contributors?.some(c => c.ownerId === currentUser?.id)) ||
                                     (kr.ownershipModel === 'delegated' && (kr.milestones?.some(m => m.ownerId === currentUser?.id) || kr.checklist?.some(c => c.ownerId === currentUser?.id)));

                    return (
                        <Card key={kr.id} className="border-border/40 shadow-sm overflow-hidden bg-background">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                                <div className="lg:col-span-4 p-5 lg:p-6 bg-muted/20 border-b lg:border-b-0 lg:border-r border-border/40">
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <Badge variant="secondary" className="text-[8px] font-black uppercase h-4 px-1.5">{kr.type}</Badge>
                                            <h4 className="font-bold text-sm leading-snug">{kr.name}</h4>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center text-[10px] font-black uppercase text-muted-foreground">
                                                <span>Aktual: {kr.currentValue}{unit}</span>
                                                <span>{safeP.toFixed(0)}%</span>
                                            </div>
                                            <Progress value={safeP} className="h-1" />
                                            <div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground uppercase opacity-60 pt-1">
                                                <span>MULAI: {kr.startValue}{unit}</span>
                                                <span>TARGET: {kr.targetValue}{unit}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="lg:col-span-8 p-5 lg:p-6">
                                    {canUpdate ? (
                                        <div className="space-y-6">
                                            {(kr.type === 'Numeric' || kr.type === 'Percentage') && (
                                                <div className="space-y-3">
                                                    <div className="grid gap-1.5">
                                                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Nilai Pencapaian Baru ({unit})</Label>
                                                        <Input 
                                                            type="number" 
                                                            className="h-11 font-black text-base bg-muted/5 border-none"
                                                            value={updates[kr.id]?.value ?? (kr.ownershipModel === 'split_ownership' ? kr.contributors.find(c => c.ownerId === currentUser?.id)?.currentValue : kr.currentValue) ?? ''}
                                                            onChange={(e) => setUpdates(prev => ({...prev, [kr.id]: { value: e.target.value === '' ? '' : Number(e.target.value) }}))}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                            {(kr.type === 'Milestone' || kr.type === 'Binary') && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {(kr.milestones || kr.checklist || []).map((item: any) => {
                                                        const isMine = item.ownerId === currentUser?.id;
                                                        const isChecked = updates[kr.id]?.items?.[item.id] ?? item.completed;
                                                        return (
                                                            <div key={item.id} className={cn("flex items-center gap-3 p-3 border rounded-xl transition-all", isChecked ? "bg-primary/5 border-primary/20" : "bg-muted/5 border-transparent")}>
                                                                <Checkbox 
                                                                    id={item.id} 
                                                                    checked={isChecked} 
                                                                    disabled={!isMine}
                                                                    onCheckedChange={(v) => setUpdates(prev => ({...prev, [kr.id]: { items: { ...(prev[kr.id]?.items || {}), [item.id]: !!v }}}))}
                                                                />
                                                                <Label htmlFor={item.id} className={cn("text-xs font-bold truncate flex-1", isChecked && "line-through opacity-50")}>{item.text}</Label>
                                                                {!isMine && <LucideLock size={10} className="opacity-20" />}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Komentar Progres (Opsional)</Label>
                                                <Textarea 
                                                    placeholder="Ceritakan kendala atau keberhasilan hari ini..." 
                                                    className="h-20 text-xs font-medium resize-none bg-muted/5 border-none"
                                                    value={notes[kr.id] || ""}
                                                    onChange={(e) => setNotes(prev => ({...prev, [kr.id]: e.target.value}))}
                                                />
                                            </div>
                                            <Button onClick={() => handleUpdate(kr.id)} disabled={loading === kr.id} className="w-full sm:w-auto px-8 font-black uppercase text-[10px] tracking-widest h-10 shadow-lg shadow-primary/10">
                                                {loading === kr.id ? <Loader2 className="size-3 animate-spin mr-2"/> : <Save className="size-3 mr-2"/>}
                                                Update Progres Saya
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed rounded-2xl opacity-30">
                                            <LucideLock size={24} className="mb-2" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">Akses Terbatas</p>
                                            <p className="text-[9px] font-bold mt-1">Hanya PIC yang dapat mengupdate progres ini.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}

export default function OkrProgressPage() {
    const { currentUser } = useAuth();
    const { okrs } = useMasterData();
    const [selectedOkr, setSelectedOkr] = useState<OKR | null>(null);

    const myOkrs = useMemo(() => {
        if (!currentUser) return [];
        return okrs.filter(okr => 
            okr.status === 'Active' && (
                okr.ownerId === currentUser.id ||
                okr.keyResults.some(kr => 
                    (kr.ownershipModel === 'single_owner' && (kr.ownerId || okr.ownerId) === currentUser.id) ||
                    (kr.ownershipModel === 'delegated' && (kr.milestones?.some(m => m.ownerId === currentUser.id) || kr.checklist?.some(c => c.ownerId === currentUser.id))) ||
                    (kr.ownershipModel === 'split_ownership' && kr.contributors?.some(c => c.ownerId === currentUser.id))
                )
            )
        );
    }, [okrs, currentUser]);

    if (!currentUser) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary opacity-20" /></div>;
    
    if (selectedOkr) {
        return (
            <ResponsivePage>
                <UserOkrDetailView okr={selectedOkr} onBack={() => setSelectedOkr(null)} />
            </ResponsivePage>
        );
    }

    return (
        <ResponsivePage>
            <PageHeader 
                title="Update Progres Project" 
                description="Lakukan pelaporan berkala terhadap hasil utama project yang ditugaskan kepada Anda." 
                icon={TrendingUp} 
            />

            {myOkrs.length > 0 ? (
                <AdaptiveCardGrid complexity="medium">
                    {myOkrs.map(okr => (
                        <Card key={okr.id} className="hover:shadow-md transition-all border-l-4 border-primary bg-background overflow-hidden flex flex-col group">
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-xs font-black uppercase tracking-tight text-slate-900 truncate">{okr.objective}</CardTitle>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase mt-0.5">{okr.company}</p>
                            </CardHeader>
                            <CardContent className="p-4 pt-2 flex-grow">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase">
                                        <span className="text-muted-foreground">Status</span>
                                        <span className="text-primary">{(okr.progress ?? 0).toFixed(0)}%</span>
                                    </div>
                                    <Progress value={okr.progress ?? 0} className="h-1" />
                                </div>
                            </CardContent>
                            <CardFooter className="p-3 px-4 border-t bg-muted/5">
                                <Button size="sm" className="w-full h-8 font-black text-[9px] uppercase tracking-widest gap-2" onClick={() => setSelectedOkr(okr)}>
                                    UPDATE PROGRES <ArrowRight size={12} />
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </AdaptiveCardGrid>
            ) : (
                <div className="py-32 text-center border-2 border-dashed rounded-3xl bg-muted/5 opacity-40">
                    <CheckSquare size={48} className="mx-auto mb-4 text-slate-400" />
                    <p className="font-black uppercase text-[10px] tracking-[0.2em]">Tidak Ada Penugasan Aktif</p>
                </div>
            )}
        </ResponsivePage>
    );
}
