// src/app/(main)/kbo-assessment-form/page.tsx
"use client";

import React, { useState, useMemo, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, UserCheck, Brain, ClipboardText, Timer, CheckCircle, ArrowRight, XCircle } from '@phosphor-icons/react';
import { useMasterData } from '@/contexts/master-data-context';
import type { Employee, AppraisalSetup, KboSetup, KboDimension, KboAssessment } from '@/types';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { serverTimestamp } from 'firebase/firestore';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { ResponsivePage } from '@/components/ui/adaptive-layout';
import { PageHeader } from '@/components/ui/page-header';
import { AdaptiveCardGrid } from '@/components/ui/adaptive-card';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

const getContextName = (setup: KboSetup): string => {
    if (setup.categoryName === 'Generic Competency') return `Level: ${setup.level || 'N/A'}`;
    if (setup.categoryName === 'Specific Competency') return `Jabatan: ${setup.position || 'N/A'}`;
    if (setup.categoryName === 'Core Competency') return setup.company === 'Global' ? 'Global' : `Perusahaan: ${setup.company}`;
    return setup.company;
}

function KboAssessmentForm() {
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { appraisalSetups, kboSetups, employees, addKboAssessment, kboAssessments } = useMasterData();

    const [loading, setLoading] = useState(false);
    const [selections, setSelections] = useState<Record<string, string>>({});
    const [notes, setNotes] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    
    const setupId = searchParams.get('setupId');
    const subjectId = searchParams.get('subjectId');
    const raterId = searchParams.get('raterId');
    const kboSetupIdsParam = searchParams.get('kboSetupIds');
    
    const kboSetupIdsFromUrl = useMemo(() => kboSetupIdsParam ? kboSetupIdsParam.split(',') : [], [kboSetupIdsParam]);

    const relevantKboSetups = useMemo(() => {
        if (!kboSetupIdsFromUrl.length) return [];
        return kboSetups.filter(ks => kboSetupIdsFromUrl.includes(ks.id));
    }, [kboSetups, kboSetupIdsFromUrl]);

    const { setup, subject, rater } = useMemo(() => {
        if (!setupId || !subjectId || !raterId) {
            return { setup: null, subject: null, rater: null };
        }
        const currentSetup = appraisalSetups.find(s => s.id === setupId);
        const currentSubject = employees.find(e => e.id === subjectId);
        const currentRater = employees.find(e => e.id === raterId);

        return { setup: currentSetup, subject: currentSubject, rater: currentRater };
    }, [setupId, subjectId, raterId, appraisalSetups, employees]);

    const allDimensions = useMemo(() => {
        return relevantKboSetups.flatMap(ks => ks.dimensions);
    }, [relevantKboSetups]);


    const assessmentId = useMemo(() => {
        if (!setupId || !subjectId || !raterId) return null;
        return `${setupId}_${subjectId}_${raterId}`;
    }, [setupId, subjectId, raterId]);

    const existingAssessmentDoc = useMemo(() => {
      if (!assessmentId) return null;
      return kboAssessments.find(a => a.id === assessmentId);
    }, [assessmentId, kboAssessments]);
    
    useEffect(() => {
        if (!assessmentId || !existingAssessmentDoc || !kboSetupIdsFromUrl.length) {
             setSelections({});
             setNotes('');
             setIsSubmitted(false);
             return;
        }

        const mergedSelections: Record<string, string> = {};
        let noteFound = '';
        let allRelevantKbosAreDone = true;

        for (const kboId of kboSetupIdsFromUrl) {
            const assessmentPart = existingAssessmentDoc.assessments?.[kboId];
            if (assessmentPart) {
                Object.assign(mergedSelections, assessmentPart.selections);
                if (assessmentPart.notes && !noteFound) {
                    noteFound = assessmentPart.notes;
                }
            } else {
                allRelevantKbosAreDone = false;
            }
        }
        
        setSelections(mergedSelections);
        setNotes(noteFound);
        setIsSubmitted(allRelevantKbosAreDone);
        
    }, [assessmentId, existingAssessmentDoc, kboSetupIdsFromUrl]);

    const handleSelectionChange = (keyBehaviorId: string, value: string) => {
        setSelections(prev => ({
            ...prev,
            [keyBehaviorId]: value
        }));
    };

    const totalScore = useMemo(() => {
        if (!relevantKboSetups.length) return 0;
        
        let totalWeightedScore = 0;
        
        relevantKboSetups.forEach(kboSetup => {
            const setupDimensions = kboSetup.dimensions;
            const setupKeyBehaviorsCount = setupDimensions.reduce((sum, dim) => sum + dim.keyBehaviors.length, 0);
            if (setupKeyBehaviorsCount === 0) return;
            
            const scorePerBehavior = 100 / setupKeyBehaviorsCount;
            let setupScore = 0;

            setupDimensions.forEach(dim => {
                dim.keyBehaviors.forEach((kb, kbIndex) => {
                    const kbId = `${dim.id}-${kbIndex}`;
                    const selectedLevelStr = selections[kbId];
                    if (selectedLevelStr) {
                        const selectedLevel = parseInt(selectedLevelStr, 10);
                        const ratingScaleItem = kboSetup.ratingScale.find(s => s.level === selectedLevel);
                        if (ratingScaleItem) {
                            setupScore += (scorePerBehavior * ratingScaleItem.percentage) / 100;
                        }
                    }
                });
            });
            totalWeightedScore += setupScore;
        });

        const finalScore = relevantKboSetups.length > 0 ? totalWeightedScore / relevantKboSetups.length : 0;
        return finalScore;
    }, [selections, relevantKboSetups]);


    const handleSubmit = useCallback(async () => {
        if (!setup || !subject || !rater || !relevantKboSetups.length) return;
        setLoading(true);

        try {
            for (const kboSetup of relevantKboSetups) {
                const relevantSelections: Record<string, string> = {};
                kboSetup.dimensions.forEach(dim => {
                    dim.keyBehaviors.forEach((kb, index) => {
                        const kbId = `${dim.id}-${index}`;
                        if (selections[kbId]) {
                            relevantSelections[kbId] = selections[kbId];
                        }
                    });
                });

                await addKboAssessment({
                    setupId: setup.id,
                    subjectId: subject.id,
                    raterId: rater.id,
                    kboSetupId: kboSetup.id,
                    selections: relevantSelections,
                    totalScore: parseFloat(totalScore.toFixed(2)),
                    notes: notes,
                });
            }
            
            toast({
                title: "Penilaian Terkirim",
                description: `Terima kasih, ${rater.name}. Penilaian Anda untuk ${subject.name} telah berhasil disimpan.`,
            });
            setIsSubmitted(true);
        } catch (error: any) {
            console.error("Error submitting assessment:", error);
            toast({
                variant: 'destructive',
                title: "Gagal Menyimpan Penilaian",
                description: error.message || "Terjadi kesalahan saat menyimpan data ke server.",
            });
        } finally {
            setLoading(false);
        }
    }, [setup, subject, rater, relevantKboSetups, selections, notes, totalScore, addKboAssessment, toast]);

    const totalKeyBehaviors = allDimensions.reduce((sum, dim) => sum + dim.keyBehaviors.length, 0);
    const isAllSelected = totalKeyBehaviors > 0 && Object.keys(selections).length === totalKeyBehaviors;
    
    const periodLabel = useMemo(() => {
        if (!setup) return 'N/A';
        if (setup.cycle === 'Bulanan' && setup.period) {
            return format(new Date(setup.period), "LLLL yyyy", { locale: localeId });
        }
        if (setup.periodStart && setup.periodEnd) {
             return `${format(new Date(setup.periodStart), "MMM yyyy", { locale: localeId })} - ${format(new Date(setup.periodEnd), "MMM yyyy", { locale: localeId })}`;
        }
        return 'Periode tidak valid';
    }, [setup]);

    if (!setup || !subject || !rater) {
        return (
            <ResponsivePage className="flex items-center justify-center min-h-[80vh]">
                <Card className="max-w-md w-full border-none shadow-2xl overflow-hidden bg-background">
                    <CardHeader className="bg-rose-50 text-center pb-8">
                        <XCircle size={48} weight="fill" className="text-rose-500 mx-auto mb-4" />
                        <CardTitle className="font-black text-rose-900 tracking-tighter">Akses Ditolak</CardTitle>
                        <CardDescription className="text-rose-700 font-bold uppercase text-[10px]">Tautan Tidak Valid atau Kadaluwarsa</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 text-center text-sm font-medium text-muted-foreground leading-relaxed">
                        Mohon pastikan Anda menggunakan tautan penilaian resmi yang dikirimkan oleh sistem. Jika masalah berlanjut, hubungi administrator HR.
                    </CardContent>
                </Card>
            </ResponsivePage>
        );
    }

    return (
        <ResponsivePage>
            <PageHeader 
                title="Penilaian Kompetensi"
                description={`Silakan berikan penilaian objektif berdasarkan perilaku kerja nyata dari subjek bersangkutan.`}
                icon={ClipboardText}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-4 space-y-6">
                    <Card className="border-border/40 shadow-sm overflow-hidden bg-background">
                        <CardHeader className="bg-muted/30 border-b p-5">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
                                <UserCheck size={14} className="text-primary" weight="fill" /> Subjek & Penilai
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="flex items-center gap-4">
                                <Avatar className="size-12 border-2 border-primary/10 shadow-sm">
                                    <AvatarFallback className="bg-primary/5 text-primary text-xs font-black uppercase">{subject.name.substring(0, 2)}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <p className="text-[9px] font-black text-primary uppercase tracking-widest">Subjek Dinilai</p>
                                    <p className="text-base font-black text-slate-900 truncate tracking-tight">{subject.name}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground">{subject.position}</p>
                                </div>
                            </div>
                            <Separator className="border-dashed" />
                            <div className="flex items-center gap-4">
                                <Avatar className="size-10 border shadow-sm">
                                    <AvatarFallback className="bg-muted text-muted-foreground text-[10px] font-black uppercase">{rater.name.substring(0, 2)}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Penilai (Anda)</p>
                                    <p className="text-sm font-bold text-slate-700 truncate">{rater.name}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/40 shadow-sm bg-background">
                         <CardContent className="p-6 space-y-6">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Periode Penilaian</p>
                                <p className="text-sm font-black text-slate-800 flex items-center gap-2"><Timer size={14} className="text-primary opacity-40" weight="fill" /> {periodLabel}</p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Kompetensi Fokus</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {relevantKboSetups.map(s => (
                                        <Badge key={s.id} variant="outline" className="text-[9px] font-black h-5 bg-muted/50 border-none">{s.categoryName}</Badge>
                                    ))}
                                </div>
                            </div>
                         </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-8 space-y-6">
                    <Card className="sticky top-4 z-20 shadow-xl border-primary/20 bg-background/95 backdrop-blur-lg">
                        <CardContent className="p-4 flex items-center justify-between gap-4">
                            <div className="space-y-0.5">
                                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Progres Pengisian</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-xl font-black text-primary">{Object.keys(selections).length} / {totalKeyBehaviors}</span>
                                    <span className="text-[10px] font-bold text-muted-foreground">Poin Terisi</span>
                                </div>
                            </div>
                            <div className="text-right space-y-0.5">
                                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Skor Sementara</p>
                                <p className="text-2xl font-black text-slate-900">{totalScore.toFixed(2)}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-8">
                        {allDimensions.map((dim, dimIndex) => (
                            <div key={`${dim.id}-${dimIndex}`} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${dimIndex * 100}ms` }}>
                                <div className="flex items-center gap-3 px-1">
                                    <div className="size-8 rounded-xl bg-primary text-white flex items-center justify-center text-xs font-black shrink-0">{dimIndex + 1}</div>
                                    <div className="min-w-0">
                                        <h3 className="font-black text-sm text-slate-900">{dim.dimension}</h3>
                                        <p className="text-[11px] text-muted-foreground italic leading-snug line-clamp-1">"{dim.definition}"</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    {dim.keyBehaviors.map((kb, index) => {
                                        const kbId = `${dim.id}-${index}`;
                                        const currentVal = selections[kbId];
                                        
                                        return (
                                            <Card key={kbId} className={cn(
                                                "border-border/40 shadow-sm transition-all group",
                                                currentVal ? "bg-primary/[0.02] border-primary/10" : "bg-background"
                                            )}>
                                                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                    <p className="text-xs font-bold text-slate-700 leading-relaxed flex-1">{kb.value}</p>
                                                    <RadioGroup
                                                        onValueChange={(value) => handleSelectionChange(kbId, value)}
                                                        value={currentVal}
                                                        className="flex flex-row items-center gap-2 shrink-0"
                                                        disabled={isSubmitted || loading}
                                                    >
                                                        {[1, 2, 3, 4].map(lvl => (
                                                            <div className="relative" key={lvl}>
                                                                <RadioGroupItem value={String(lvl)} id={`${kbId}-${lvl}`} className="peer sr-only" />
                                                                <Label 
                                                                    htmlFor={`${kbId}-${lvl}`} 
                                                                    className={cn(
                                                                        "size-9 rounded-xl border-2 flex items-center justify-center text-xs font-black transition-all cursor-pointer",
                                                                        "hover:bg-muted border-border/60 text-muted-foreground",
                                                                        currentVal === String(lvl) ? "bg-primary border-primary text-white scale-110 shadow-lg" : ""
                                                                    )}
                                                                >
                                                                    {lvl}
                                                                </Label>
                                                            </div>
                                                        ))}
                                                    </RadioGroup>
                                                </CardContent>
                                            </Card>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    <Card className="border-border/40 shadow-lg bg-background">
                        <CardHeader>
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Umpan Balik Tambahan (Opsional)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Textarea
                                placeholder={`Berikan saran pengembangan atau contoh perilaku spesifik untuk ${subject.name.split(' ')[0]}...`}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                disabled={isSubmitted || loading}
                                className="min-h-[120px] bg-muted/5 border-none resize-none text-sm font-medium"
                            />
                        </CardContent>
                        <CardFooter className="p-6 border-t bg-muted/5">
                            {isSubmitted ? (
                                <Alert className="bg-emerald-50 border-emerald-200">
                                    <CheckCircle size={16} weight="fill" className="text-emerald-600" />
                                    <AlertDescription className="text-xs font-bold text-emerald-800 uppercase ml-2">
                                        Terima kasih, data penilaian telah berhasil tersimpan dalam sistem.
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <Button 
                                    onClick={handleSubmit} 
                                    disabled={loading || !isAllSelected} 
                                    className="w-full font-black uppercase tracking-widest text-[11px] h-12 shadow-xl shadow-primary/20 rounded-2xl active:scale-95 transition-all"
                                >
                                    {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : <ClipboardText className="size-4 mr-2" weight="fill" />}
                                    Kirim Penilaian Final
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </ResponsivePage>
    );
}

export default function KboAssessmentFormPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen w-full items-center justify-center bg-white">
                <Loader2 className="animate-spin text-primary size-10" />
            </div>
        }>
            <KboAssessmentForm />
        </Suspense>
    )
}
