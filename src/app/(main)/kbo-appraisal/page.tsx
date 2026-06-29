// src/app/(main)/kbo-appraisal/page.tsx
"use client";

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, MoreHorizontal, ClipboardList, AlertCircle, Maximize2, Minimize2, X, Copy, Eye, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';
import type { Employee, AppraisalSetup, KboSetup, Company } from '@/types';
import { Progress } from '@/components/ui/progress';
import { parse, isBefore, isAfter, isWithinInterval, format, isValid } from "date-fns";
import { id as localeId } from 'date-fns/locale';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';


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
    
            // 🔧 Find document by matching properties, not by concatenated ID string.
            const assessmentDoc = kboAssessments.find(a => 
                a.setupId === setup.id && 
                a.subjectId === result.subject.id && 
                a.raterId === rater?.id
            );
    
            // 🔁 Fallback for older data structures just in case
            const fallbackId = `${setup.id}_${result.subject.id}_${rater?.id}`;
            const fallbackDoc = assessmentDoc || kboAssessments.find(a => a.id === fallbackId);
    
            // Use the found document
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
            <SheetContent className={cn("p-0 flex flex-col transition-all duration-300", isExpanded ? "w-full sm:max-w-full" : "w-full sm:max-w-xl")}>
                <SheetHeader className="p-6 pb-2 border-b flex-row items-center justify-between">
                    <div>
                        <SheetTitle>Detail Penilaian KBO: {result.subject.name}</SheetTitle>
                        <div className="text-sm text-muted-foreground mt-1 space-y-1">
                           <span>Rincian skor untuk <Badge variant="outline">{kboSetup.categoryName} ({getContextName(kboSetup)})</Badge>.</span>
                        </div>
                    </div>
                     <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} >
                        {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                     </Button>
                </SheetHeader>
                <ScrollArea className="flex-1 min-h-0">
                    <div className="p-6 space-y-6">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tipe Penilai</TableHead>
                                    <TableHead>Nama</TableHead>
                                    <TableHead>Skor & Aksi</TableHead>
                                    <TableHead className="text-right">Link Penilaian</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {raterDetails.map((rater, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{rater.raterType}</TableCell>
                                        <TableCell>{rater.raterName}</TableCell>
                                        <TableCell>
                                            {rater.score !== null ? (
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="font-semibold">{rater.score.toFixed(1)}</span>
                                                    <div className='flex gap-2 items-center'>
                                                        <Link 
                                                            href={`/kbo-assessment-form?setupId=${setup!.id}&subjectId=${result.subject.id}&raterId=${rater.raterId}&kboSetupIds=${kboSetup!.id}`}
                                                            target="_blank"
                                                            className="text-xs text-primary hover:underline flex items-center gap-1"
                                                        >
                                                            <Eye className="h-3 w-3"/> lihat
                                                        </Link>
                                                        <span className="text-gray-300">|</span>
                                                        <button 
                                                            onClick={() => rater.raterId && openConfirmation(rater.raterId, rater.raterName)} 
                                                            className="text-xs text-destructive hover:underline flex items-center gap-1"
                                                        >
                                                            <RefreshCw className="h-3 w-3"/> reset
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">Belum Menilai</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {rater.raterId && rater.score === null && (
                                                <Button variant="outline" size="sm" onClick={() => handleCopyLink(rater.raterId!)}>
                                                    <Copy className="mr-2 h-3 w-3" />
                                                    Salin Link
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </ScrollArea>
                <div className="p-6 pt-4 border-t mt-auto flex w-full justify-between items-center">
                    <span className="font-semibold">Skor Rata-Rata Akhir: <Badge className="text-lg">{averageScore > 0 ? averageScore.toFixed(1) : '-'}</Badge></span>
                    <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Tutup</Button>
                </div>
            </SheetContent>
        </Sheet>

         <AlertDialog open={isAlertOpen} onOpenChange={setAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Konfirmasi Reset Penilaian</AlertDialogTitle>
                    <AlertDialogDescription>
                        Anda yakin ingin menghapus hasil penilaian dari <strong>{assessmentToDelete?.raterName}</strong> untuk <strong>{result.subject.name}</strong>? Tindakan ini tidak bisa dibatalkan.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetAssessment} className="bg-destructive hover:bg-destructive/90">
                        Ya, Reset Penilaian
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
    // Only include periods that match 'yyyy-MM' format to prevent parse errors
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
      
      // Ensure periodDate is valid before attempting interval checks
      if (!isValid(periodDate)) return [];

      return appraisalSetups.filter(s => {
        const companyMatch = !selectedCompanyId || s.company === companies.find(c => c.id === selectedCompanyId)?.name;
        if (!companyMatch) return false;
        
        if (s.period === selectedPeriod) return true;
        if (!s.periodStart || !s.periodEnd) return false;
        
        const setupStartDate = parse(s.periodStart, 'yyyy-MM', new Date());
        const setupEndDate = parse(s.periodEnd, 'yyyy-MM', new Date());
        
        // Skip if either start or end date is invalid
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
    
    // Get all kboSetupIds that have been mapped in the current appraisal setup
    const mappedKboSetupIds = Object.keys(selectedAppraisal.customRaterMappings);
    
    // Filter the global kboSetups to only include those that are mapped
    return kboSetups.filter(ks => mappedKboSetupIds.includes(ks.id));

  }, [selectedAppraisal, kboSetups]);


  // --- Reset dependent filters on change ---
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
    
    if(isBefore(now, startDate)) {
        return { status: 'Belum Berjalan', variant: 'secondary' };
    }
    if(isAfter(now, endDate)) {
        return { status: 'Selesai', variant: 'default' };
    }
    return { status: 'Proses Penilaian', variant: 'destructive' };
  };

  const appraisalSubjects = useMemo((): KboResult[] => {
    if (!selectedAppraisalId || !selectedKboSetupId || !selectedAppraisal) return [];
  
    // Source of truth: who is configured to be assessed in this kboSetup
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

  return (
    <>
    <div className="space-y-6">
      <Card className="shadow-lg mb-6 overflow-hidden">
        <CardHeader className="bg-primary text-primary-foreground dark:bg-card">
          <CardTitle className="font-headline flex items-center gap-2 dark:text-white">
            <ClipboardList className="h-6 w-6" />
            Laporan Penilaian Kompetensi (KBO)
          </CardTitle>
          <CardDescription className="text-primary-foreground/80 dark:text-muted-foreground">
            Tinjau hasil penilaian kompetensi perilaku (KBO) untuk setiap karyawan.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Filter Laporan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
             {showCompanyFilter && (
                 <Select value={selectedCompanyId ?? ''} onValueChange={setSelectedCompanyId}>
                    <SelectTrigger><SelectValue placeholder="Pilih Perusahaan" /></SelectTrigger>
                    <SelectContent>
                        {manageableCompanies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                 </Select>
             )}
             <Select value={selectedPeriod ?? ''} onValueChange={setSelectedPeriod}>
              <SelectTrigger><SelectValue placeholder="Pilih Periode" /></SelectTrigger>
              <SelectContent>
                {availablePeriods.map(p => {
                    const parsedDate = parse(p, 'yyyy-MM', new Date());
                    // Fallback to raw string if parsing somehow fails despite our previous checks
                    const displayLabel = isValid(parsedDate) ? format(parsedDate, 'LLLL yyyy', {locale: localeId}) : p;
                    return <SelectItem key={p} value={p}>{displayLabel}</SelectItem>;
                })}
              </SelectContent>
            </Select>

            <Select value={selectedAppraisalId ?? ''} onValueChange={setSelectedAppraisalId} disabled={!selectedPeriod}>
              <SelectTrigger><SelectValue placeholder="Pilih Pengaturan Appraisal" /></SelectTrigger>
              <SelectContent>
                {availableSetupsForPeriod.map(s => <SelectItem key={s.id} value={s.id}>{s.company} / {s.period || `${s.periodStart} - ${s.periodEnd}`}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={selectedKboSetupId ?? ''} onValueChange={setSelectedKboSetupId} disabled={!selectedAppraisalId || availableKboSetupsForAppraisal.length === 0}>
                <SelectTrigger><SelectValue placeholder="Pilih Kompetensi" /></SelectTrigger>
                <SelectContent>
                    {availableKboSetupsForAppraisal.map(ks => (
                        <SelectItem key={ks.id} value={ks.id}>{ks.categoryName} ({getContextName(ks)})</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Hasil Penilaian KBO</CardTitle>
          <CardDescription>Menampilkan {appraisalSubjects.length} hasil penilaian.</CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedKboSetupId ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground h-40 justify-center">
              <AlertCircle className="h-8 w-8" />
              <span>Pilih pengaturan dan kompetensi untuk melihat laporan.</span>
              <p className="text-xs">Pastikan tugas penilaian telah dipublikasikan untuk pengaturan yang dipilih.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Karyawan</TableHead>
                  <TableHead>Jabatan</TableHead>
                  <TableHead>Progres Penilaian</TableHead>
                  <TableHead>Skor KBO</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appraisalSubjects.length > 0 ? (
                  appraisalSubjects.map((result) => (
                      <TableRow key={result.subject.id}>
                      <TableCell>
                          <div className="flex items-center gap-3">
                          <div className="hidden h-9 w-9 sm:flex items-center justify-center rounded-full bg-muted">
                              <User className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="font-medium">{result.subject.name}</div>
                          </div>
                      </TableCell>
                      <TableCell>{result.subject.position}</TableCell>
                      <TableCell>
                          <div className="flex items-center gap-2">
                              <Progress value={(result.ratersDone / result.totalRaters) * 100} className="w-24 h-2"/>
                              <span className="text-xs text-muted-foreground">{result.ratersDone}/{result.totalRaters} Selesai</span>
                          </div>
                      </TableCell>
                      <TableCell className="font-semibold">{result.score !== null ? result.score.toFixed(1) : '-'}</TableCell>
                      <TableCell>
                          <Badge variant={selectedAppraisal ? getStatusFromPeriod(selectedAppraisal).variant : 'outline'}>{result.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                          <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Buka menu</span></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => setSelectedResultForDetail(result)}>
                                      Lihat Detail Skor
                                  </DropdownMenuItem>
                              </DropdownMenuContent>
                          </DropdownMenu>
                      </TableCell>
                      </TableRow>
                  ))
                ) : (
                  <TableRow>
                      <TableCell colSpan={6} className="text-center h-24">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                              <AlertCircle className="h-8 w-8" />
                              <span>Tidak ada data penilaian yang ditemukan untuk filter ini.</span>
                          </div>
                      </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
    <KboDetailDialog 
        isOpen={!!selectedResultForDetail}
        onOpenChange={(open) => !open && setSelectedResultForDetail(null)}
        result={selectedResultForDetail}
        setup={selectedAppraisal}
        kboSetup={selectedKboSetup}
    />
    </>
  );
}

export default function KboAppraisalPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <KboAppraisalContent />
    </Suspense>
  );
}
