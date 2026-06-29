// src/app/(main)/okr/progress/page.tsx
"use client";

import { useMemo, useState, useEffect, useCallback } from 'react';
import type { OKR, KeyResult, Milestone, ChecklistItem, Contributor } from '@/types';
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
  Lock as LucideLock 
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { serverTimestamp } from 'firebase/firestore';

// Helper to safely convert Firestore timestamp or other date formats to JS Date
const safeToDate = (dateVal: any): Date | null => {
    if (!dateVal) return null;
    if (dateVal instanceof Date) return dateVal;
    if (typeof dateVal.toDate === 'function') return dateVal.toDate();
    if (dateVal.seconds) return new Date(dateVal.seconds * 1000);
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d;
};

// --- Card View for Each OKR Project ---
const OkrCard = ({ okr, onSelect }: { okr: OKR; onSelect: () => void }) => {
    const endDate = safeToDate(okr.endDate);

    return (
        <Card className="hover:shadow-md transition-shadow h-full flex flex-col border-l-4 border-primary">
            <CardHeader>
                <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-base font-bold">{okr.objective}</CardTitle>
                    <Badge variant="outline" className="flex-shrink-0">{okr.status}</Badge>
                </div>
                <CardDescription className="text-xs !mt-2">
                    Penanggung Jawab Utama: {okr.ownerName}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Progres Total</span>
                        <span className="font-bold text-primary">{(okr.progress ?? 0).toFixed(0)}%</span>
                    </div>
                    <Progress value={okr.progress ?? 0} />
                </div>
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground border-t pt-3 flex justify-between items-center bg-muted/20">
                 <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                        Tenggat: {endDate ? format(endDate, "d MMM yyyy", { locale: localeId }) : 'N/A'}
                    </span>
                </div>
                <Button size="sm" onClick={onSelect} className="font-bold">
                    Buka Project <ArrowRight className="h-4 w-4 ml-2"/>
                </Button>
            </CardFooter>
        </Card>
    );
};

// --- Detail View with Simple Table ---
function UserOkrDetailView({ okr, onBack }: { okr: OKR; onBack: () => void }) {
    const { currentUser } = useAuth();
    const { updateOkr, fetchData, employees } = useMasterData();
    const { toast } = useToast();
    
    // State for local updates
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
            toast({ variant: 'destructive', title: 'Key Result tidak ditemukan' });
            setLoading(null);
            return;
        }

        // Safe cloning to avoid destroying Firestore types
        const updatedOkr = { 
            ...okr, 
            keyResults: okr.keyResults.map(kr => ({ ...kr })) 
        };
        const krIndex = updatedOkr.keyResults.findIndex((kr: KeyResult) => kr.id === krId);
        const krData = updatedOkr.keyResults[krIndex];
        const updateData = updates[krId];
        const updateNote = notes[krId] || '';
        let logComment = '';

        if (krData.type === 'Numeric' || krData.type === 'Percentage') {
            const newValue = updateData?.value === '' ? undefined : Number(updateData?.value);
            
            if (newValue === undefined) {
                toast({ variant: 'destructive', title: 'Input tidak valid', description: 'Harap masukkan nilai terbaru.' });
                setLoading(null);
                return;
            }

            // Validation: Cannot be less than startValue
            if (newValue < krData.startValue) {
                toast({ variant: 'destructive', title: 'Nilai Terlalu Rendah', description: `Nilai tidak boleh kurang dari nilai awal (${krData.startValue}).` });
                setLoading(null);
                return;
            }

            if (krData.ownershipModel === 'split_ownership') {
                const contributorIndex = krData.contributors.findIndex((c: Contributor) => c.ownerId === currentUser!.id);
                if (contributorIndex !== -1) {
                    krData.contributors[contributorIndex].currentValue = newValue;
                }
            } else {
                krData.currentValue = newValue;
            }
            logComment = `Memperbarui nilai "${krData.name}" menjadi ${newValue} ${krData.unit || ''}. ${updateNote}`;
        } else { // Milestone or Binary
            const itemsToUpdate = krData.type === 'Milestone' ? krData.milestones : krData.checklist;
            let changed = false;
            Object.entries(updateData?.items || {}).forEach(([itemId, isCompleted]) => {
                const item = itemsToUpdate.find((i: any) => i.id === itemId);
                if (item && item.completed !== isCompleted) {
                    item.completed = isCompleted;
                    changed = true;
                    logComment += `${isCompleted ? 'Menyelesaikan' : 'Membatalkan'} tugas "${item.text}". `;
                }
            });

            if (!changed && !updateNote) {
                toast({ variant: 'destructive', title: 'Tidak ada perubahan', description: 'Tidak ada status tugas yang diubah.' });
                setLoading(null);
                return;
            }
             logComment += updateNote;
        }
        
        // Helper for relative progress calculation
        const calculateRelativeKrProgress = (curr: number, start: number, target: number) => {
            const range = target - start;
            if (range <= 0) return curr >= target ? 100 : 0;
            const res = ((curr - start) / range) * 100;
            return Math.max(0, Math.min(res, 100));
        };

        // Recalculate KR total values
        if (krData.type === 'Numeric' || krData.type === 'Percentage') {
            if (krData.ownershipModel === 'split_ownership') {
                krData.currentValue = krData.contributors.reduce((sum: number, c: Contributor) => sum + (c.currentValue || 0), 0);
            }
        } else if (krData.type === 'Milestone') {
            krData.currentValue = krData.milestones.filter((m: Milestone) => m.completed).length;
        } else if (krData.type === 'Binary') {
            krData.currentValue = krData.checklist.filter((c: ChecklistItem) => c.completed).length;
        }
        
        // Recalculate Total Objective Progress
        const totalWeight = updatedOkr.keyResults.reduce((sum: number, currentKr: KeyResult) => sum + (currentKr.weight || 0), 0);
        const useWeights = totalWeight > 99 && totalWeight < 101;
    
        const totalProgress = updatedOkr.keyResults.reduce((sum: number, currentKr: KeyResult) => {
          const krProgress = calculateRelativeKrProgress(currentKr.currentValue, currentKr.startValue, currentKr.targetValue);
          const weight = useWeights && currentKr.weight ? currentKr.weight / 100 : (1 / updatedOkr.keyResults.length);
          return sum + (krProgress * weight);
        }, 0);
        updatedOkr.progress = totalProgress;

        updatedOkr.activityLog = [...(updatedOkr.activityLog || []), createLogEntry(logComment)];

        try {
            await updateOkr(okr.id, updatedOkr);
            toast({ title: 'Progres Diperbarui!' });
            setUpdates(prev => ({...prev, [krId]: {}})); 
            setNotes(prev => ({...prev, [krId]: ''}));
            await fetchData();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Gagal Update', description: e.message });
        } finally {
            setLoading(null);
        }
    };
    
    return (
         <div className="space-y-6">
            <Button variant="ghost" onClick={onBack} className="-ml-4 hover:bg-muted">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Kembali ke Daftar Project
            </Button>
            <Card className="border-l-4 border-primary shadow-lg">
                 <CardHeader>
                    <CardTitle className="font-headline text-2xl">{okr.objective}</CardTitle>
                    <CardDescription>{okr.description}</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm font-bold">
                            <span>Progres Total Objective</span>
                            <span className="text-primary text-lg">{(okr.progress ?? 0).toFixed(1)}%</span>
                        </div>
                        <Progress value={okr.progress} className="h-3" />
                    </div>
                </CardContent>
            </Card>
            <div className="rounded-xl border shadow-sm overflow-hidden bg-background">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="w-[35%] font-bold">Tugas Key Result</TableHead>
                            <TableHead className="w-[20%] font-bold">Status Pencapaian</TableHead>
                            <TableHead className="w-[45%] font-bold">Update Progres</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {okr.keyResults.map(kr => {
                            // Calculate update permissions
                            let canUpdate = false;
                            if (currentUser) {
                                if (kr.ownershipModel === 'single_owner') {
                                    canUpdate = (kr.ownerId || okr.ownerId) === currentUser.id;
                                } else if (kr.ownershipModel === 'split_ownership') {
                                    canUpdate = kr.contributors?.some(c => c.ownerId === currentUser.id) ?? false;
                                } else if (kr.ownershipModel === 'delegated') {
                                    canUpdate = (kr.milestones?.some(m => m.ownerId === currentUser.id) || 
                                                 kr.checklist?.some(c => c.ownerId === currentUser.id)) ?? false;
                                }
                            }
                            
                            // Relative progress calculation
                            const range = kr.targetValue - kr.startValue;
                            const progress = range > 0 ? ((kr.currentValue - kr.startValue) / range) * 100 : (kr.currentValue >= kr.targetValue ? 100 : 0);
                            const unit = kr.unit || (kr.type === 'Percentage' ? '%' : '');

                            return (
                                <TableRow key={kr.id} className="align-top hover:bg-muted/10">
                                    <TableCell className="py-6">
                                        <p className="font-bold text-base">{kr.name}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Badge variant="secondary" className="text-[10px] uppercase font-bold">{kr.type}</Badge>
                                            <p className="text-[11px] text-muted-foreground">
                                                PIC Utama: <span className="font-bold text-foreground">{kr.ownerName || employees.find(e => e.id === (kr.ownerId || okr.ownerId))?.name || 'N/A'}</span>
                                            </p>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-6">
                                         <div className="space-y-2">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-muted-foreground">Aktual:</span>
                                                <span className="text-lg font-black text-primary leading-none">{kr.currentValue.toLocaleString('id-ID')}{unit}</span>
                                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-1">
                                                    <span className="bg-muted px-1.5 py-0.5 rounded border">Mulai: {kr.startValue}{unit}</span>
                                                    <ArrowRight className="h-3 w-3" />
                                                    <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20 font-bold">Target: {kr.targetValue}{unit}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1 pt-1">
                                                <Progress value={Math.max(0, Math.min(progress, 100))} className="h-2"/>
                                                <p className="text-[10px] font-black text-right">{Math.max(0, Math.min(progress, 100)).toFixed(0)}%</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-6">
                                        <div className="space-y-4">
                                            {(kr.type === 'Numeric' || kr.type === 'Percentage') && (
                                                <div className="space-y-3">
                                                    {kr.ownershipModel === 'split_ownership' && (
                                                        <div className="space-y-1 bg-muted/30 p-3 rounded-lg text-xs border">
                                                            <p className="font-bold mb-2 flex items-center gap-2"><LucideUsers className="h-3 w-3"/> Kontribusi Tim:</p>
                                                            {kr.contributors.map(c => {
                                                                const cName = c.ownerName || employees.find(e => e.id === c.ownerId)?.name || 'Unknown';
                                                                return (
                                                                    <div key={c.ownerId} className="flex justify-between items-center py-1 border-b border-dashed last:border-0">
                                                                        <span className={cn(c.ownerId === currentUser?.id && "font-bold text-primary")}>
                                                                            {cName} {c.ownerId === currentUser?.id && "(Anda)"}
                                                                        </span>
                                                                        <span className="font-mono">{c.currentValue} / {c.targetValue} {unit}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                    
                                                    {canUpdate && (
                                                        <div className="grid gap-2">
                                                            <Label className="text-[10px] uppercase font-black text-muted-foreground flex items-center gap-1">
                                                                <Hash className="h-3 w-3"/> Input Nilai Capaian Terbaru ({unit})
                                                            </Label>
                                                            <Input 
                                                                type="number" 
                                                                placeholder={`Min. ${kr.startValue}...`}
                                                                value={updates[kr.id]?.value ?? (kr.ownershipModel === 'split_ownership' ? kr.contributors.find(c => c.ownerId === currentUser?.id)?.currentValue : kr.currentValue) ?? ''} 
                                                                onChange={(e) => setUpdates(prev => ({...prev, [kr.id]: { value: e.target.value === '' ? '' : Number(e.target.value) }}))} 
                                                                className="font-bold text-base"
                                                                min={kr.startValue}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {(kr.type === 'Milestone' || kr.type === 'Binary') && (
                                                <div className="space-y-2">
                                                    {(kr.milestones || kr.checklist)?.map(item => {
                                                        const isMyItem = item.ownerId === currentUser?.id;
                                                        const iName = item.ownerName || employees.find(e => e.id === item.ownerId)?.name || 'Unknown';
                                                        const isChecked = updates[kr.id]?.items?.[item.id] ?? item.completed;
                                                        
                                                        return (
                                                            <div key={item.id} className={cn(
                                                                "flex items-start gap-3 p-3 border rounded-lg transition-colors",
                                                                isChecked ? "bg-primary/5 border-primary/20" : "bg-background"
                                                            )}>
                                                                <Checkbox
                                                                    id={item.id}
                                                                    checked={isChecked}
                                                                    onCheckedChange={(checked) => setUpdates(prev => ({...prev, [kr.id]: { items: {...(prev[kr.id]?.items || {}), [item.id]: !!checked }}}))}
                                                                    disabled={!isMyItem}
                                                                    className="mt-1"
                                                                />
                                                                <div className="grid gap-0.5">
                                                                    <Label htmlFor={item.id} className={cn("text-sm cursor-pointer font-medium", isChecked && 'line-through text-muted-foreground')}>
                                                                        {item.text}
                                                                    </Label>
                                                                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                                                                        <LucideUser className="h-2.5 w-2.5"/> PIC: <span className={cn("font-bold", isMyItem ? "text-primary" : "text-foreground")}>{iName} {isMyItem && "(Anda)"}</span>
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {canUpdate ? (
                                                <div className="space-y-3 pt-3 border-t border-dashed">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[10px] uppercase font-black text-muted-foreground flex items-center gap-1">
                                                            <BookCopy className="h-3 w-3"/> Catatan Perubahan
                                                        </Label>
                                                        <Textarea 
                                                            placeholder="Ketik keterangan progres..." 
                                                            value={notes[kr.id] || ''} 
                                                            onChange={(e) => setNotes(prev => ({...prev, [kr.id]: e.target.value}))}
                                                            className="text-sm h-20 min-h-[80px]"
                                                        />
                                                    </div>
                                                    <Button size="sm" className="w-full font-bold shadow-md" onClick={() => handleUpdate(kr.id)} disabled={loading === kr.id}>
                                                        {loading === kr.id ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Save className="h-4 w-4 mr-2"/>}
                                                        {loading === kr.id ? "Memproses..." : "Simpan Update Saya"}
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="text-center py-6 bg-muted/20 rounded-lg border border-dashed flex flex-col items-center gap-2 text-muted-foreground">
                                                    <LucideLock className="h-5 w-5 opacity-50" />
                                                    <p className="text-[11px] font-medium italic max-w-[200px]">
                                                        Hanya PIC yang dapat memperbarui Key Result ini.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

// --- Main Page Component ---
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

    if (!currentUser) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    if (selectedOkr) {
        return <UserOkrDetailView okr={selectedOkr} onBack={() => setSelectedOkr(null)} />;
    }

    return (
        <div className="space-y-6">
            <Card className="shadow-lg border-t-4 border-primary">
                <CardHeader>
                    <CardTitle className="font-headline text-2xl flex items-center gap-2">
                        <Target className="h-6 w-6 text-primary" />
                        Project Anda
                    </CardTitle>
                    <CardDescription className="text-base">
                        Pantau dan perbarui progres project OKR yang ditugaskan kepada Anda dan tim.
                    </CardDescription>
                </CardHeader>
            </Card>

            {myOkrs.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {myOkrs.map(okr => (
                        <OkrCard key={okr.id} okr={okr} onSelect={() => setSelectedOkr(okr)} />
                    ))}
                </div>
            ) : (
                <Card className="border-dashed">
                    <CardContent className="p-16 text-center">
                        <div className="bg-muted rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                            <ListChecks className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground font-medium">
                            Saat ini tidak ada project OKR aktif yang ditugaskan kepada Anda.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
