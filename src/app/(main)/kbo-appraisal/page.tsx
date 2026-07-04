
// src/app/(main)/kbo-appraisal/page.tsx
"use client";

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DotsThree, ClipboardText, WarningCircle, CornersOut, CornersIn, X, Copy, Eye, ArrowsClockwise, Calendar, Buildings, Brain, MagnifyingGlass, ArrowRight } from '@phosphor-icons/react';
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';
import type { Employee, AppraisalSetup, KboSetup, Company } from '@/types';
import { Progress } from '@/components/ui/progress';
import { parse, isBefore, isAfter, isWithinInterval, format, isValid } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { ResponsivePage, ResponsiveToolbar } from '@/components/ui/adaptive-layout';
import { PageHeader } from '@/components/ui/page-header';
import { AdaptiveCardGrid, AdaptiveMetricCard } from '@/components/ui/adaptive-card';
import { AdaptiveTable } from '@/components/ui/adaptive-table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';


interface KboResult {
    subject: Employee;
    score: number | null;
    status: string;
    ratersDone: number;
    totalRaters: number;
}

const getContextName = (setup: KboSetup): string => {
    if (setup.categoryName === 'Generic Competency') return `Level: ${setup.level || 'N/A'}`;
    if (setup.categoryName === 'Specific Competency') return `Jabatan: ${setup.position || 'N/A'}`;
    if (setup.categoryName === 'Core Competency') return setup.company === 'Global' ? 'Global' : `Perusahaan: ${setup.company}`;
    return setup.company;
}


function KboDetailDialog({ isOpen, onOpenChange, result, setup, kboSetup }: { isOpen: boolean; onOpenChange: (open: boolean) => void; result: KboResult | null; setup: AppraisalSetup | null, kboSetup: KboSetup | null }) {
    const { employees, kboAssessments, appraisalTasks, deleteKboAssessment } = useMasterData();
    const { toast } = useToast();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isAlertOpen, setAlertOpen] = useState(false);
    const [assessmentToDelete, setAssessmentToDelete] = useState<{raterId: string, raterName: string} | null>(null);
    
    const raterDetails = useMemo(() => {
        if (!result || !setup || !kboSetup) return [];
    
        const tasksForSubjectAndKbo = appraisalTasks.filter(
            (task) => task.setupId === setup.id && task.subjectId === result.subject.id && task.kboSetupId === kboSetup.id
        );
    
        return tasksForSubjectAndKbo.map(task => {
            const rater = employees.find(e => e.id === task.raterId);
    
            const assessmentDoc = kboAssessments.find(a => 
                a.setupId === setup.id && 
                a.subjectId === result.subject.id && 
                a.raterId === rater?.id
            );
    
            const fallbackId = `${setup.id}_${result.subject.id}_${rater?.id}`;
            const fallbackDoc = assessmentDoc || kboAssessments.find(a => a.id === fallbackId);
            const assessment = fallbackDoc?.assessments?.[kboSetup.id];
    
            let raterType = 'Lainnya';
            if (rater?.id === result.subject.id) raterType = 'Diri Sendiri';
            else if (rater?.id === result.subject.reportsTo) raterType = 'Atasan Langsung';
            else if (rater && rater.reportsTo === result.subject.reportsTo) raterType = 'Rekan Sejawat';
            else if (rater?.reportsTo === result.subject.id) raterType = 'Bawahan';
    
            return {
                raterId: rater?.id,
                raterName: rater?.name || 'Pengguna Tidak Ditemukan',
                raterType: raterType,
                score: assessment?.totalScore ?? null,
                status: task.status === 'completed' && assessment ? 'Selesai' : 'Menunggu',
            };
        });
    
    }, [setup, result, employees, kboAssessments, appraisalTasks, kboSetup]);
    
    const allScores = useMemo(() => raterDetails.map(r => r.score).filter((s): s is number => s !== null), [raterDetails]);
    const averageScore = useMemo(() => allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0, [allScores]);

    const handleCopyLink = (raterId: string) => {
        if (!setup || !result || !kboSetup) return;
        const url = `${window.location.origin}/kbo-assessment-form?setupId=${setup.id}&subjectId=${result.subject.id}&raterId=${raterId}&kboSetupIds=${kboSetup.id}`;
        navigator.clipboard.writeText(url);
        toast({
            title: "Link disalin!",
            description: "Link penilaian telah disalin ke clipboard Anda.",
        });
    };

    const handleResetAssessment = async () => {
        if (!setup || !result || !assessmentToDelete || !kboSetup) return;
        const assessmentId = `${setup.id}_${result.subject.id}_${assessmentToDelete.raterId}`;
        try {
            await deleteKboAssessment(assessmentId, kboSetup.id);
            toast({
                title: "Penilaian Direset",
                description: `Hasil penilaian dari ${assessmentToDelete.raterName} telah berhasil dihapus.`,
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "Gagal Mereset",
                description: error.message || 'Terjadi kesalahan saat menghapus penilaian.'
            });
        } finally {
            setAssessmentToDelete(null);
            setAlertOpen(false);
        }
    };

    const openConfirmation = (raterId: string, raterName: string) => {
        setAssessmentToDelete({ raterId, raterName });
        setAlertOpen(true);
    };
    
    if (!result || !setup || !kboSetup) return null;

    return (
        <>
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className={cn("p-0 flex flex-col transition-all duration-300 border-none shadow-2xl", isExpanded ? "w-full sm:max-w-full" : "w-full sm:max-w-xl")}>
                <SheetHeader className="p-6 pb-2 border-b flex-row items-center justify-between bg-muted/20">
                    <div>
                        <SheetTitle className="font-black text-xl tracking-tighter">Detail Skor: {result.subject.name}</SheetTitle>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
                           Kategori: <span className="text-primary">{kboSetup.categoryName}</span>
                        </div>
                    </div>
                     <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="hidden sm:flex" onClick={() => setIsExpanded(!isExpanded)} >
                            {isExpanded ? <CornersIn size={18} /> : <CornersOut size={18} />}
                        </Button>
                        <SheetClose asChild><Button variant="ghost" size="icon"><X size={20} /></Button></SheetClose>
                     </div>
                </SheetHeader>
                <ScrollArea className="flex-1 min-h-0 bg-background">
                    <div className="p-6 space-y-6">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/10 hover:bg-transparent border-none">
                                    <TableHead className="text-[9px] font-black uppercase py-4">Tipe Penilai</TableHead>
                                    <TableHead className="text-[9px] font-black uppercase">Nama</TableHead>
                                    <TableHead className="text-[9px] font-black uppercase">Hasil</TableHead>
                                    <TableHead className="text-right text-[9px] font-black uppercase pr-4">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {raterDetails.map((rater, index) => (
                                    <TableRow key={index} className="border-border/40 group">
                                        <TableCell className="text-[10px] font-bold uppercase text-muted-foreground">{rater.raterType}</TableCell>
                                        <TableCell className="font-bold text-xs">{rater.raterName}</TableCell>
                                        <TableCell>
                                            {rater.score !== null ? (
                                                <Badge className="bg-primary/5 text-primary border-none font-black text-xs">{rater.score.toFixed(1)}</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[8px] font-black uppercase opacity-40">Menunggu</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right pr-4">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {rater.score !== null ? (
                                                    <>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" asChild>
                                                            <Link href={`/kbo-assessment-form?setupId=${setup!.id}&subjectId=${result.subject.id}&raterId=${rater.raterId}&kboSetupIds=${kboSetup!.id}`} target="_blank"><Eye size={14}/></Link>
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => rater.raterId && openConfirmation(rater.raterId, rater.raterName)}><ArrowsClockwise size={14}/></Button>
                                                    </>
                                                ) : (
                                                    rater.raterId && <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => handleCopyLink(rater.raterId!)}><Copy size={14}/></Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </ScrollArea>
                <div className="p-6 bg-slate-900 text-white shrink-0 flex justify-between items-center rounded-t-3xl shadow-2xl">
                    <div className="space-y-0.5">
                        <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">Rata-rata Akhir</p>
                        <p className="text-3xl font-black">{averageScore > 0 ? averageScore.toFixed(1) : '-'}</p>
                    </div>
                    <Button variant="outline" className="bg-white/10 border-white/20 hover:bg-white/20 text-white font-black uppercase tracking-widest text-[10px] h-10 px-6 rounded-xl" onClick={() => onOpenChange(false)}>Tutup</Button>
                </div>
            </SheetContent>
        </Sheet>

         <AlertDialog open={isAlertOpen} onOpenChange={setAlertOpen}>
            <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
                <AlertDialogHeader>
                    <AlertDialogTitle className="font-black tracking-tight text-slate-900">Konfirmasi Reset</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm font-medium leading-relaxed">
                        Anda yakin ingin menghapus hasil penilaian dari <strong>{assessmentToDelete?.raterName}</strong>? Tindakan ini tidak bisa dibatalkan.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2">
                    <AlertDialogCancel className="rounded-xl font-bold">Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetAssessment} className="bg-destructive hover:bg-destructive/90 rounded-xl font-black uppercase text-[10px] tracking-widest px-6 h-10">
                        Ya, Reset Sekarang
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    );
}

function KboAppraisalContent() {
  const { currentUser, userRole } = useAuth();
  const { companies, kboSetups, appraisalSetups, employees, kboAssessments, appraisalTasks } = useMasterData();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [selectedAppraisalId, setSelectedAppraisalId] = useState<string | null>(null);
  const [selectedKboSetupId, setSelectedKboSetupId] = useState<string | null>(null);
  const [selectedResultForDetail, setSelectedResultForDetail] = useState<KboResult | null>(null);
  
    const userCompany = useMemo(() => companies.find(c => c.name === currentUser?.company), [companies, currentUser]);
    const isHoldingAdmin = useMemo(() => userRole === 'manajemen' && !!userCompany?.isHolding, [userRole, userCompany]);
    const showCompanyFilter = userRole === 'superadmin' || isHoldingAdmin;

    const manageableCompanies = useMemo(() => {
        if (userRole === 'superadmin') return companies.filter(c => c.status === 'Aktif');
        if (isHoldingAdmin && userCompany) {
            const getChildCompanies = (parentId: string): Company[] => {
                const children = companies.filter(c => c.parentId === parentId);
                return [...children, ...children.flatMap(c => getChildCompanies(c.id))];
            };
            return [userCompany, ...getChildCompanies(userCompany.id)];
        }
        return userCompany ? [userCompany] : [];
    }, [userRole, isHoldingAdmin, userCompany, companies]);

    useEffect(() => {
        if (showCompanyFilter && manageableCompanies.length > 0 && !selectedCompanyId) {
            setSelectedCompanyId(manageableCompanies[0].id);
        } else if (!showCompanyFilter && userCompany) {
            setSelectedCompanyId(userCompany.id);
        }
    }, [showCompanyFilter, manageableCompanies, userCompany, selectedCompanyId]);
    
  // --- Filter Options ---
  const availablePeriods = useMemo(() => {
    const isValidPeriodFormat = (p: string | null | undefined): p is string => {
        if (!p) return false;
        const parsedDate = parse(p, 'yyyy-MM', new Date());
        return isValid(parsedDate);
    };

    const periodStarts = appraisalSetups.map(s => s.periodStart).filter(isValidPeriodFormat);
    const monthlyPeriods = appraisalSetups.map(s => s.period).filter(isValidPeriodFormat);
    
    return [...new Set([...periodStarts, ...monthlyPeriods])].sort((a,b) => b.localeCompare(a));
  }, [appraisalSetups]);
  
  useEffect(() => {
    if (searchParams.has('setupId')) {
        const setupIdFromQuery = searchParams.get('setupId');
        const setup = appraisalSetups.find(s => s.id === setupIdFromQuery);
        if (setup) {
            const period = setup.period || setup.periodStart;
            if (period) {
                 setSelectedPeriod(period);
                 setSelectedAppraisalId(setupIdFromQuery);
            }
        }
    } else if (availablePeriods.length > 0 && !selectedPeriod) {
        setSelectedPeriod(availablePeriods[0]);
    }
  }, [searchParams, appraisalSetups, availablePeriods, selectedPeriod]);


  const availableSetupsForPeriod = useMemo(() => {
      if (!selectedPeriod) return [];
      const periodDate = parse(selectedPeriod, 'yyyy-MM', new Date());
      if (!isValid(periodDate)) return [];

      return appraisalSetups.filter(s => {
        const companyMatch = !selectedCompanyId || s.company === companies.find(c => c.id === selectedCompanyId)?.name;
        if (!companyMatch) return false;
        
        if (s.period === selectedPeriod) return true;
        if (!s.periodStart || !s.periodEnd) return false;
        
        const setupStartDate = parse(s.periodStart, 'yyyy-MM', new Date());
        const setupEndDate = parse(s.periodEnd, 'yyyy-MM', new Date());
        
        if (!isValid(setupStartDate) || !isValid(setupEndDate)) return false;

        return isWithinInterval(periodDate, { start: setupStartDate, end: setupEndDate });
      });
  }, [selectedPeriod, appraisalSetups, selectedCompanyId, companies]);
  
  useEffect(() => {
      if (!searchParams.has('setupId') && availableSetupsForPeriod.length > 0 && !selectedAppraisalId) {
          setSelectedAppraisalId(availableSetupsForPeriod[0].id);
      }
  }, [availableSetupsForPeriod, selectedAppraisalId, searchParams]);
  
  const selectedAppraisal = useMemo(() => appraisalSetups.find(s => s.id === selectedAppraisalId), [selectedAppraisalId, appraisalSetups]);

  const availableKboSetupsForAppraisal = useMemo(() => {
    if (!selectedAppraisal || !selectedAppraisal.customRaterMappings) return [];
    const mappedKboSetupIds = Object.keys(selectedAppraisal.customRaterMappings);
    return kboSetups.filter(ks => mappedKboSetupIds.includes(ks.id));
  }, [selectedAppraisal, kboSetups]);


  useEffect(() => {
      setSelectedAppraisalId(null);
      setSelectedKboSetupId(null);
  }, [selectedPeriod, selectedCompanyId]);
  
  useEffect(() => {
      setSelectedKboSetupId(null);
  }, [selectedAppraisalId]);
  
  useEffect(() => {
      if (availableKboSetupsForAppraisal.length > 0) {
          if (!selectedKboSetupId || !availableKboSetupsForAppraisal.some(s => s.id === selectedKboSetupId)) {
            setSelectedKboSetupId(availableKboSetupsForAppraisal[0].id);
          }
      } else {
        setSelectedKboSetupId(null);
      }
  }, [availableKboSetupsForAppraisal, selectedKboSetupId]);


  const selectedKboSetup = useMemo(() => kboSetups.find(ks => ks.id === selectedKboSetupId), [selectedKboSetupId, kboSetups]);
  
  const getStatusFromPeriod = (setup: AppraisalSetup): { status: string; variant: "default" | "secondary" | "destructive" } => {
    const now = new Date();
    let startDate = now;
    let endDate = now;

    if (setup.periodStart) {
        const parsedStart = parse(setup.periodStart, 'yyyy-MM', new Date());
        if (isValid(parsedStart)) startDate = parsedStart;
    }
    if (setup.periodEnd) {
        const parsedEnd = parse(setup.periodEnd, 'yyyy-MM', new Date());
        if (isValid(parsedEnd)) endDate = parsedEnd;
    }
    
    if(isBefore(now, startDate)) return { status: 'Belum Berjalan', variant: 'secondary' };
    if(isAfter(now, endDate)) return { status: 'Selesai', variant: 'default' };
    return { status: 'Proses Penilaian', variant: 'destructive' };
  };

  const appraisalSubjects = useMemo((): KboResult[] => {
    if (!selectedAppraisalId || !selectedKboSetupId || !selectedAppraisal) return [];
  
    const customMappingsForKbo = selectedAppraisal.customRaterMappings?.[selectedKboSetupId] || {};
    const activeSubjectIds = Object.entries(customMappingsForKbo)
      .filter(([_, mapping]) => mapping.isSubjectActive)
      .map(([subjectId]) => subjectId);
    
    const subjects = activeSubjectIds
      .map(id => employees.find(e => e.id === id && e.status === 'Aktif'))
      .filter((e): e is Employee => !!e);
      
    const status = getStatusFromPeriod(selectedAppraisal).status;
  
    return subjects.map(subject => {
      const tasksForThisSubject = appraisalTasks.filter(t => t.subjectId === subject.id && t.kboSetupId === selectedKboSetupId);
      const totalRaters = tasksForThisSubject.length;
      const ratersDone = tasksForThisSubject.filter(t => t.status === 'completed').length;
      const completedRaterIds = tasksForThisSubject.filter(t => t.status === 'completed').map(t => t.raterId);
      
      const allScores = completedRaterIds.map(raterId => {
        const assessmentDoc = kboAssessments.find(a => a.setupId === selectedAppraisalId && a.subjectId === subject.id && a.raterId === raterId);
        return assessmentDoc?.assessments?.[selectedKboSetupId!]?.totalScore;
      }).filter((s): s is number => typeof s === 'number');
  
      const score = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : null;
      return { subject, score, status, ratersDone, totalRaters };
    });
  }, [selectedAppraisalId, selectedKboSetupId, selectedAppraisal, employees, appraisalTasks, kboAssessments]);

  const dashboardStats = useMemo(() => {
    if (appraisalSubjects.length === 0) return { avg: 0, done: 0, total: 0 };
    const scores = appraisalSubjects.map(s => s.score).filter((s): s is number => s !== null);
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const done = appraisalSubjects.reduce((sum, s) => sum + s.ratersDone, 0);
    const total = appraisalSubjects.reduce((sum, s) => sum + s.totalRaters, 0);
    return { avg, done, total };
  }, [appraisalSubjects]);

  return (
    <ResponsivePage>
      <PageHeader 
        title="Laporan Penilaian KBO"
        description="Monitor progres dan hasil evaluasi kompetensi perilaku (KBO) di seluruh unit bisnis Anda."
        icon={ClipboardText}
      />
      
      <ResponsiveToolbar>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex items-center gap-3 flex-1 min-w-0">
             {showCompanyFilter && (
                 <Select value={selectedCompanyId ?? ''} onValueChange={setSelectedCompanyId}>
                    <SelectTrigger className="h-10 min-w-[180px] border-none bg-background shadow-sm text-[11px] font-black uppercase"><Buildings className="size-4 mr-2 text-primary" weight="fill" /><SelectValue placeholder="Unit Bisnis" /></SelectTrigger>
                    <SelectContent className="z-[350]">{manageableCompanies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                 </Select>
             )}
             <Select value={selectedPeriod ?? ''} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="h-10 min-w-[160px] border-none bg-background shadow-sm text-[11px] font-black uppercase"><Calendar className="size-4 mr-2 text-primary" weight="fill" /><SelectValue placeholder="Periode" /></SelectTrigger>
              <SelectContent className="z-[350]">
                {availablePeriods.map(p => {
                    const parsedDate = parse(p, 'yyyy-MM', new Date());
                    const displayLabel = isValid(parsedDate) ? format(parsedDate, 'LLLL yyyy', {locale: localeId}) : p;
                    return <SelectItem key={p} value={p}>{displayLabel}</SelectItem>;
                })}
              </SelectContent>
            </Select>
            <Select value={selectedAppraisalId ?? ''} onValueChange={setSelectedAppraisalId} disabled={!selectedPeriod}>
              <SelectTrigger className="h-10 min-w-[200px] border-none bg-background shadow-sm text-[11px] font-black uppercase"><ClipboardText className="size-4 mr-2 text-primary" weight="fill" /><SelectValue placeholder="Setup Appraisal" /></SelectTrigger>
              <SelectContent className="z-[350]">{availableSetupsForPeriod.map(s => <SelectItem key={s.id} value={s.id}>{s.company} / {s.period || `${s.periodStart} - ${s.periodEnd}`}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={selectedKboSetupId ?? ''} onValueChange={setSelectedKboSetupId} disabled={!selectedAppraisalId || availableKboSetupsForAppraisal.length === 0}>
                <SelectTrigger className="h-10 min-w-[180px] border-none bg-background shadow-sm text-[11px] font-black uppercase"><Brain className="size-4 mr-2 text-primary" weight="fill" /><SelectValue placeholder="Kompetensi" /></SelectTrigger>
                <SelectContent className="z-[350]">{availableKboSetupsForAppraisal.map(ks => <SelectItem key={ks.id} value={ks.id}>{ks.categoryName}</SelectItem>)}</SelectContent>
            </Select>
        </div>
      </ResponsiveToolbar>
      
      {selectedKboSetupId && (
        <AdaptiveCardGrid complexity="simple">
            <AdaptiveMetricCard title="Rata-rata Skor" value={dashboardStats.avg.toFixed(1)} icon={Brain} color="bg-primary/10 text-primary" />
            <AdaptiveMetricCard title="Tugas Selesai" value={dashboardStats.done} icon={CheckCircle2} description={`${dashboardStats.total} total penilai`} color="bg-emerald-500/10 text-green-600" />
            <AdaptiveMetricCard title="Target Subjek" value={appraisalSubjects.length} icon={User} description="Personil yang dinilai" />
        </AdaptiveCardGrid>
      )}
      
      {selectedKboSetupId ? (
        <div className="pt-4">
            <AdaptiveTable 
                data={appraisalSubjects}
                keyExtractor={(r) => r.subject.id}
                columns={[
                    { header: "Karyawan", cell: (r) => (
                        <div className="flex items-center gap-3">
                            <Avatar className="size-9 border shadow-sm"><AvatarFallback className="text-[10px] font-black bg-primary/10 text-primary">{r.subject.name.substring(0,2).toUpperCase()}</AvatarFallback></Avatar>
                            <div className="min-w-0 flex-1"><p className="font-bold text-slate-900 truncate">{r.subject.name}</p><p className="text-[10px] text-muted-foreground font-bold truncate">{r.subject.position}</p></div>
                        </div>
                    )},
                    { header: "Progres Penilaian", cell: (r) => (
                        <div className="flex flex-col gap-1.5 w-full max-w-[120px]">
                            <div className="flex justify-between items-center text-[9px] font-black text-muted-foreground"><span>Progres</span><span>{Math.round((r.ratersDone / r.totalRaters) * 100)}%</span></div>
                            <Progress value={(r.ratersDone / r.totalRaters) * 100} className="h-1" />
                            <p className="text-[8px] font-bold text-muted-foreground text-right">{r.ratersDone}/{r.totalRaters} Selesai</p>
                        </div>
                    )},
                    { header: "Skor KBO", cell: (r) => <span className="text-lg font-black text-primary">{r.score !== null ? r.score.toFixed(1) : '-'}</span> },
                    { header: "Status", cell: (r) => <Badge variant={selectedAppraisal ? getStatusFromPeriod(selectedAppraisal).variant : 'outline'} className="text-[9px] font-black h-5 border-none">{r.status}</Badge> },
                    { header: "", className: "text-right", cell: (r) => (
                        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-full"><DotsThree size={24} weight="bold" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="z-[350]">
                            <DropdownMenuItem onClick={() => setSelectedResultForDetail(r)}><Eye className="size-3.5 mr-2" /> Lihat Rincian Skor</DropdownMenuItem>
                        </DropdownMenuContent></DropdownMenu>
                    )}
                ]}
                renderMobileCard={(r) => (
                    <Card className="border-border/40 shadow-sm overflow-hidden" onClick={() => setSelectedResultForDetail(r)}>
                        <CardContent className="p-4 space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <Avatar className="size-10 border-2 border-primary/10 shadow-sm"><AvatarFallback className="font-black text-xs">{r.subject.name.substring(0,2).toUpperCase()}</AvatarFallback></Avatar>
                                    <div className="min-w-0"><h3 className="font-black text-sm uppercase truncate">{r.subject.name}</h3><p className="text-[10px] font-bold text-muted-foreground">{r.subject.position}</p></div>
                                </div>
                                <div className="text-right"><p className="text-xl font-black text-primary leading-none">{r.score !== null ? r.score.toFixed(1) : '-'}</p><p className="text-[8px] font-black uppercase text-muted-foreground mt-1">SKOR</p></div>
                            </div>
                            <div className="flex items-center justify-between pt-3 border-t">
                                <div className="flex flex-col gap-1 flex-1 max-w-[150px]">
                                    <div className="flex justify-between text-[8px] font-black text-muted-foreground uppercase"><span>Progres</span><span>{r.ratersDone}/{r.totalRaters}</span></div>
                                    <Progress value={(r.ratersDone / r.totalRaters) * 100} className="h-1" />
                                </div>
                                <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase ml-4">Detail <ArrowRight size={10} /></div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            />
        </div>
      ) : (
        <div className="py-32 text-center border-2 border-dashed rounded-3xl bg-muted/5 opacity-40">
            <Brain size={48} className="mx-auto mb-4 text-slate-400" />
            <p className="font-black text-[10px] tracking-[0.2em]">Pilih Parameter Laporan</p>
        </div>
      )}
      <KboDetailDialog isOpen={!!selectedResultForDetail} onOpenChange={(open) => !open && setSelectedResultForDetail(null)} result={selectedResultForDetail} setup={selectedAppraisal || null} kboSetup={selectedKboSetup || null} />
    </ResponsivePage>
  );
}

export default function KboAppraisalPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-white"><Loader2 className="animate-spin text-primary size-10" /></div>}>
      <KboAppraisalContent />
    </Suspense>
  );
}
