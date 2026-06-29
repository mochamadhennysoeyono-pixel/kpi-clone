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
import { Loader2, User, UserCheck } from 'lucide-react';
import { useMasterData } from '@/contexts/master-data-context';
import type { Employee, AppraisalSetup, KboSetup, KboDimension, KboAssessment } from '@/types';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { serverTimestamp } from 'firebase/firestore';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

const getContextName = (setup: KboSetup): string => {
    if (setup.categoryName === 'Generic Competency') return `Level: ${setup.level || 'N/A'}`;
    if (setup.categoryName === 'Specific Competency') return `Jabatan: ${setup.position || 'N/A'}`;
    if (setup.categoryName === 'Core Competency') return setup.company === 'Global' ? 'Global' : `Perusahaan: ${setup.company}`;
    return setup.company;
}

function KboAssessmentForm() {
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { appraisalSetups, kboSetups, employees, addKboAssessment, kboAssessments, fetchData } = useMasterData();

    const [loading, setLoading] = useState(false);
    const [selections, setSelections] = useState<Record<string, string>>({});
    const [notes, setNotes] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    
    const setupId = searchParams.get('setupId');
    const subjectId = searchParams.get('subjectId');
    const raterId = searchParams.get('raterId');
    const kboSetupIdsParam = searchParams.get('kboSetupIds');
    
    // Source of Truth: The IDs from the URL parameter.
    const kboSetupIdsFromUrl = useMemo(() => kboSetupIdsParam ? kboSetupIdsParam.split(',') : [], [kboSetupIdsParam]);

    // Strict filtering: Only get setups that are explicitly requested in the URL.
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

    // This derives dimensions ONLY from the already-filtered relevantKboSetups.
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
    
    // Correctly load data only for the relevant kboSetupIds
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
                // Only load selections for the current relevant kboId
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

        // Average the scores if there are multiple setups being assessed at once
        const finalScore = relevantKboSetups.length > 0 ? totalWeightedScore / relevantKboSetups.length : 0;
        return finalScore;
    }, [selections, relevantKboSetups]);


    const handleSubmit = useCallback(async () => {
        if (!setup || !subject || !rater || !relevantKboSetups.length) return;
        setLoading(true);

        try {
            // This loop ensures that data is saved distinctly for each kboSetupId from the URL
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
    
    const categoryNames = useMemo(() => {
        if (!relevantKboSetups || relevantKboSetups.length === 0) return 'Kompetensi';
        const names = relevantKboSetups.map(s => `${s.categoryName} (${getContextName(s)})`).join(', ');
        return names;
    }, [relevantKboSetups]);

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
            <Card className="max-w-4xl mx-auto my-10">
                <CardHeader>
                    <CardTitle className="text-destructive">Link Penilaian Tidak Valid</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Link yang Anda gunakan tidak valid atau periode penilaian telah berakhir. Silakan hubungi administrator.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="max-w-4xl mx-auto my-10 space-y-6">
            <Card className="shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle className="font-headline text-3xl tracking-tight">KBO</CardTitle>
                    <CardDescription className="text-xs tracking-widest font-medium">
                        (PERFORMANCE APPRAISAL BASED ON BEHAVIOR)
                    </CardDescription>
                    <p className="text-sm text-muted-foreground pt-2">Periode Penilaian: <span className="font-semibold text-foreground">{periodLabel}</span></p>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start text-sm pt-4 gap-4 border-t mt-4">
                        <div className='flex items-start gap-2 text-left'>
                            <User className="h-5 w-5 mt-0.5 text-muted-foreground" />
                            <div>
                                <p className="text-muted-foreground">Subjek:</p>
                                <p className='font-semibold text-foreground'>{subject.name}</p>
                                <p className="text-xs text-muted-foreground">{subject.position} / {subject.department}</p>
                            </div>
                        </div>
                         <div className='flex items-start gap-2 text-left'>
                            <UserCheck className="h-5 w-5 mt-0.5 text-muted-foreground" />
                            <div>
                                <p className="text-muted-foreground">Penilai:</p>
                                <p className='font-semibold text-foreground'>{rater.name}</p>
                                <p className="text-xs text-muted-foreground">{rater.position} / {rater.department}</p>
                            </div>
                        </div>
                    </div>
                </CardHeader>
            </Card>
            
            <div className="grid grid-cols-1 gap-6">
                 <Card className="sticky top-4 z-20 shadow-xl backdrop-blur-lg bg-background/80">
                    <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-center h-full gap-4">
                        <div className="text-center p-2 border rounded-lg bg-muted/50 w-full sm:w-auto">
                            <p className="text-sm font-semibold">Skala Penilaian</p>
                            <div className="flex justify-center items-center gap-2 text-xs text-muted-foreground mt-1">
                                <span>Tidak Kompeten</span>
                                <span className="font-mono">&lt;--</span>
                                <span className="font-mono">1</span>
                                <span className="font-mono">2</span>
                                <span className="font-mono">3</span>
                                <span className="font-mono">4</span>
                                <span className="font-mono">--&gt;</span>
                                <span>Sangat Kompeten</span>
                            </div>
                        </div>
                         <div className="text-center p-2 mt-2 sm:mt-0">
                            <p className="text-xs font-medium text-muted-foreground">Kompetensi Dinilai</p>
                            <div className="flex flex-wrap gap-1 justify-center">
                                {relevantKboSetups.map(s => <Badge key={s.id} variant="secondary">{s.categoryName}</Badge>)}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                {allDimensions.map((dim, dimIndex) => (
                <div key={`${dim.id}-${dimIndex}`} className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">{dim.dimension}</CardTitle>
                            <CardDescription>{dim.definition}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {dim.keyBehaviors.map((kb, index) => {
                                const kbId = `${dim.id}-${index}`;
                                return (
                                    <div key={kbId} className="p-3 border rounded-md bg-muted/20">
                                        <p className="font-medium text-sm mb-3">{kb.value}</p>
                                        <RadioGroup
                                            onValueChange={(value) => handleSelectionChange(kbId, value)}
                                            value={selections[kbId]}
                                            className="flex flex-wrap items-center gap-x-6 gap-y-2"
                                            disabled={isSubmitted || loading}
                                        >
                                            {[1, 2, 3, 4].map(level => (
                                                <div className="flex items-center space-x-2" key={level}>
                                                    <RadioGroupItem value={String(level)} id={`${kbId}-${level}`} />
                                                    <Label htmlFor={`${kbId}-${level}`} className="text-sm font-medium cursor-pointer">
                                                        {level}
                                                    </Label>
                                                </div>
                                            ))}
                                        </RadioGroup>
                                    </div>
                                )
                            })}
                        </CardContent>
                    </Card>
                </div>
                ))}
            </div>

            <Card>
                <CardContent className="p-4 space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="notes">Catatan untuk {subject.name} (Opsional)</Label>
                        <Textarea
                            id="notes"
                            placeholder="Berikan umpan balik atau contoh spesifik di sini..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            disabled={isSubmitted || loading}
                            className="h-24"
                        />
                    </div>
                </CardContent>
                <CardFooter className="p-4 pt-0">
                    {isSubmitted ? (
                         <div className="text-sm text-center w-full text-green-700 font-medium bg-green-50 p-3 rounded-md border border-green-200">
                           Anda sudah mengirimkan penilaian ini. Terima kasih!
                        </div>
                    ) : (
                        <Button onClick={handleSubmit} disabled={loading || !isAllSelected} className="w-full">
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {loading ? 'Mengirim...' : 'Kirim Penilaian'}
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}

export default function KboAssessmentFormPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        }>
            <KboAssessmentForm />
        </Suspense>
    )
}
