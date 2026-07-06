"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';
import { format, parse } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    FilePlus2, 
    CheckCircle, 
    ClipboardPen, 
    BookUser, 
    Award, 
    ShieldCheck, 
    BarChart3, 
    GraduationCap, 
    BarChartHorizontal, 
    CirclePlay, 
    BookCopy, 
    BrainCircuit, 
    Target, 
    TrendingUp,
    TrendingDown,
    Loader2,
    ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import type { Enrollment, KpiData, Course, Employee, KboAssessment, AppraisalSetup, AppraisalTask } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PerformanceTrendChart } from '@/components/reports/performance-trend-chart';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { 
    AdaptiveCardGrid, 
    AdaptiveMetricCard, 
    AdaptiveInsightCard 
} from "@/components/ui/adaptive-card";
import { ResponsivePage } from "@/components/ui/adaptive-layout";
import { useBreakpoint } from '@/hooks/use-breakpoint';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 4) return "Malam";
  if (hour < 11) return "Pagi";
  if (hour < 15) return "Siang";
  if (hour < 19) return "Sore";
  return "Malam";
}

// --- Action Center Task Cards (Medium Complexity) ---

function TaskItemWrapper({ icon: Icon, title, subtitle, href, color }: { icon: any, title: string, subtitle: string, href: string, color: string }) {
    return (
        <Link href={href}>
            <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-all active:scale-95 border border-transparent hover:border-border/40">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm", color)}>
                    <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                    <p className="font-bold text-xs truncate uppercase tracking-tight">{title}</p>
                    <p className="text-[10px] text-muted-foreground truncate leading-none mt-1">{subtitle}</p>
                </div>
            </div>
        </Link>
    );
}

function MyDashboardContent() {
    const { currentUser } = useAuth();
    const { kpiData, appraisalTasks, enrollments, employees, courses, kboAssessments, appraisalSetups, okrs } = useMasterData();
    const [greeting, setGreeting] = useState('');
    const { isMobile } = useBreakpoint();

    useEffect(() => {
        setGreeting(getGreeting());
    }, []);
    
    const hasSubordinates = useMemo(() => employees.some(e => e.reportsTo === currentUser?.id), [employees, currentUser]);

    const teamKpiDataForApproval = useMemo(() => {
        if (!hasSubordinates || !currentUser) return [];
        const subordinateIds = employees.filter(e => e.reportsTo === currentUser.id).map(e => e.id);
        return kpiData.filter(d => subordinateIds.includes(d.employeeId) && d.approvalStatus !== 'Disetujui');
    }, [hasSubordinates, currentUser, employees, kpiData]);

    const { targetedCourses, notStartedCourses, inProgressCourses, completedCourses } = useMemo(() => {
        if (!currentUser) return { targetedCourses: [], notStartedCourses: [], inProgressCourses: [], completedCourses: [] };

        const myTargetedCourses = courses.filter(course => {
            if (course.status !== 'published' || (course.company !== currentUser.company && course.company !== 'Global')) return false;
            
            const targetAudience = course.targetAudience;
            if (!targetAudience || (!targetAudience.departments?.length && !targetAudience.positions?.length && !targetAudience.levels?.length && !targetAudience.employees?.length)) {
                return true;
            }
            
            const { departments, positions, levels, employees: specificEmployees } = targetAudience;
            if (specificEmployees?.includes(currentUser.id)) return true;
            
            let isTargetedByRole = false;
            if (!specificEmployees || specificEmployees.length === 0) {
                const departmentMatch = !departments?.length || departments.includes(currentUser.department);
                const positionMatch = !positions?.length || positions.includes(currentUser.position);
                const levelMatch = !levels?.length || levels.includes(currentUser.level);
                isTargetedByRole = departmentMatch && positionMatch && levelMatch;
            }

            return isTargetedByRole;
        });

        const myEnrollments = enrollments.filter(e => e.employeeId === currentUser.id);
        const unstarted = myTargetedCourses.filter(c => !myEnrollments.some(e => e.courseId === c.id));
        const inProgress = myTargetedCourses.filter(c => myEnrollments.some(e => e.courseId === c.id && e.status === 'in-progress'));
        const completed = myTargetedCourses.filter(c => myEnrollments.some(e => e.courseId === c.id && e.status === 'completed'));
        
        return { targetedCourses: myTargetedCourses, notStartedCourses: unstarted, inProgressCourses: inProgress, completedCourses: completed };
    }, [courses, enrollments, currentUser]);
    
    const currentPeriod = format(new Date(), "yyyy-MM");
    const hasSubmittedKpiForCurrentMonth = kpiData.some(d => d.employeeId === currentUser?.id && d.period === currentPeriod);

    // Task list calculation
    const actionTasks = useMemo(() => {
        if (!currentUser) return [];
        const tasks: any[] = [];
        
        const myOkrKrCount = okrs.filter(okr => okr.status === 'Active' && okr.keyResults.some(kr => kr.ownerId === currentUser.id)).length;
        if (myOkrKrCount > 0) {
            tasks.push({ icon: Target, title: "Update OKR", subtitle: `${myOkrKrCount} Key Result perlu diupdate`, href: "/okr/progress", color: "bg-blue-600" });
        }

        if (teamKpiDataForApproval.length > 0) {
            tasks.push({ icon: ShieldCheck, title: "Persetujuan KPI", subtitle: `${teamKpiDataForApproval.length} laporan tim`, href: "/reports", color: "bg-amber-600" });
        }

        const pendingKboTasks = appraisalTasks.filter(t => t.raterId === currentUser.id && t.status !== 'completed');
        pendingKboTasks.forEach(task => {
            tasks.push({ icon: ClipboardPen, title: "Nilai Kompetensi", subtitle: `Nilai ${task.subjectName}`, href: `/kbo-assessment-form?setupId=${task.setupId}&subjectId=${task.subjectId}&raterId=${task.raterId}&kboSetupIds=${task.kboSetupId}`, color: "bg-indigo-600" });
        });

        inProgressCourses.forEach(course => {
            const enrollment = enrollments.find(e => e.courseId === course.id && e.employeeId === currentUser.id);
            tasks.push({ icon: BookUser, title: "Lanjutkan Belajar", subtitle: `${course.title} (${enrollment?.progress}%)`, href: `/lms/user/course/${course.id}`, color: "bg-emerald-600" });
        });

        notStartedCourses.forEach(course => {
            tasks.push({ icon: GraduationCap, title: "Materi Baru", subtitle: `Kursus: ${course.title}`, href: `/lms/user/course/${course.id}`, color: "bg-rose-600" });
        });
        
        return tasks;
    }, [currentUser, kpiData, appraisalTasks, enrollments, okrs, teamKpiDataForApproval, inProgressCourses, notStartedCourses]);
    
    // --- Data for Insight Cards ---
    const myKpiData = useMemo(() => {
        if (!currentUser) return [];
        return kpiData.filter(d => d.employeeId === currentUser.id).sort((a,b) => a.period.localeCompare(b.period));
    }, [currentUser, kpiData]);
    
    const kpiHighlights = useMemo(() => {
        if (myKpiData.length === 0) return null;
        const sortedByScore = [...myKpiData].sort((a, b) => b.score - a.score);
        const average = myKpiData.reduce((sum, d) => sum + d.score, 0) / myKpiData.length;
        return { best: sortedByScore[0], worst: sortedByScore[sortedByScore.length - 1], average };
    }, [myKpiData]);

    const myKboData = useMemo(() => {
        if (!currentUser) return [];
        return kboAssessments.filter(a => a.subjectId === currentUser.id);
    }, [currentUser, kboAssessments]);
    
    const kboCategoryScores = useMemo(() => {
        if (!myKboData.length || !currentUser) return [];
        const latestAssessment = myKboData.sort((a, b) => {
            const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(0);
            const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(0);
            return dateB.getTime() - dateA.getTime();
        })[0];
        const setup = appraisalSetups.find(s => s.id === latestAssessment.setupId);
        const comps = setup?.componentsByLevel?.[currentUser.level];
        if (!comps?.kbo) return [];
    
        return Object.entries(comps.kbo).map(([name, kboComp]) => {
            const scoreData = latestAssessment.assessments[kboComp.kboSetupIds?.[0] || ''];
            return scoreData ? { name, score: scoreData.totalScore } : null;
        }).filter(Boolean);
    }, [myKboData, appraisalSetups, currentUser]);

    if (!currentUser) return <div className="p-20 text-center animate-pulse">Sinkronisasi Profil...</div>;

    return (
        <ResponsivePage>
            <div className="space-y-1">
                <h1 className="text-2xl sm:text-4xl font-black font-headline tracking-tighter">Halo, {currentUser.name.split(' ')[0]}!</h1>
                <p className="text-muted-foreground text-sm sm:text-lg">Siap untuk memantau performa hari ini?</p>
            </div>
            
            <AdaptiveCardGrid complexity="simple">
                <Card className="bg-primary text-primary-foreground shadow-lg border-none relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><FilePlus2 size={80} /></div>
                    <CardHeader className={isMobile ? "p-3" : "p-5"}>
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-60">Status KPI</CardTitle>
                        <h3 className="text-lg sm:text-2xl font-black mt-1">{format(new Date(), "MMMM yyyy", { locale: localeId })}</h3>
                    </CardHeader>
                    <CardContent className={isMobile ? "p-3 pt-0" : "p-5 pt-0"}>
                         <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-wider", hasSubmittedKpiForCurrentMonth ? "bg-green-500/20 text-green-300 border-none" : "bg-amber-500/20 text-amber-300 border-none")}>
                            {hasSubmittedKpiForCurrentMonth ? "Sudah Diinput" : "Belum Diinput"}
                         </Badge>
                    </CardContent>
                    <CardFooter className="p-0 border-t border-white/10">
                        <Button asChild variant="ghost" className="w-full h-10 text-[10px] font-black uppercase text-white hover:bg-white/5 rounded-none">
                            <Link href="/input-achievement">{hasSubmittedKpiForCurrentMonth ? "Lihat Detail" : "Input Sekarang"}</Link>
                        </Button>
                    </CardFooter>
                </Card>

                <Card className="shadow-sm border-none bg-background flex flex-col min-w-0">
                    <CardHeader className={isMobile ? "p-3 pb-1" : "p-5 pb-1"}>
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pusat Tugas</CardTitle>
                    </CardHeader>
                    <CardContent className="p-1 flex-grow">
                        {actionTasks.length > 0 ? (
                            <div className="space-y-1">
                                {actionTasks.slice(0, isMobile ? 1 : 3).map((t, i) => (
                                    <TaskItemWrapper key={i} {...t} />
                                ))}
                                {actionTasks.length > (isMobile ? 1 : 3) && (
                                    <p className="text-[8px] font-bold text-center text-muted-foreground py-1">+{actionTasks.length - (isMobile ? 1 : 3)} TUGAS LAINNYA</p>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-6 gap-2 opacity-30">
                                <CheckCircle size={24} />
                                <p className="text-[9px] font-black">Agenda Bersih</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {kpiHighlights && (
                    <AdaptiveMetricCard 
                        title="KPI Terbaru" 
                        value={myKpiData[myKpiData.length-1]?.score.toFixed(1) || "0.0"} 
                        icon={BarChart3} 
                        description={format(parse(myKpiData[myKpiData.length-1]?.period, "yyyy-MM", new Date()), "MMM yy")}
                        trend={{ value: 5, isUp: true }}
                    />
                )}

                {kboCategoryScores.length > 0 && (
                     <AdaptiveMetricCard 
                        title="Rata-rata KBO" 
                        value={(kboCategoryScores.reduce((s: any, c: any) => s + c.score, 0) / kboCategoryScores.length).toFixed(1)} 
                        icon={BrainCircuit} 
                        color="bg-indigo-500/10 text-indigo-600"
                    />
                )}
            </AdaptiveCardGrid>

            <AdaptiveCardGrid complexity="complex" className="mt-8">
                {myKpiData.length > 0 && (
                    <AdaptiveInsightCard title="Tren Kinerja (KPI)" icon={TrendingUp} description="Progres bulanan personal">
                        <div className="h-[200px] w-full"><PerformanceTrendChart data={myKpiData} /></div>
                        <div className="grid grid-cols-2 gap-4 mt-6">
                            <div className="p-3 rounded-xl bg-green-50 border border-green-100">
                                <p className="text-[9px] font-black uppercase text-green-600">Tertinggi</p>
                                <p className="text-xl font-black text-green-700">{kpiHighlights?.best.score.toFixed(1)}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                                <p className="text-[9px] font-black uppercase text-blue-600">Rata-rata</p>
                                <p className="text-xl font-black text-blue-700">{kpiHighlights?.average.toFixed(1)}</p>
                            </div>
                        </div>
                    </AdaptiveInsightCard>
                )}

                {kboCategoryScores.length > 0 && (
                    <AdaptiveInsightCard title="Analisa Kompetensi (KBO)" icon={BrainCircuit} description="Detail per kategori kompetensi">
                         <div className="space-y-4 py-2">
                            {kboCategoryScores.map((cat: any, i: number) => (
                                <div key={i} className="space-y-1.5">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tight">
                                        <span className="text-muted-foreground">{cat.name}</span>
                                        <span className="text-primary">{cat.score.toFixed(1)}</span>
                                    </div>
                                    <Progress value={cat.score} className="h-1.5" />
                                </div>
                            ))}
                         </div>
                         <Separator className="my-6" />
                         <div className="flex items-center gap-3 p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                            <div className="p-2 bg-white rounded-xl shadow-sm text-indigo-600"><BookCopy size={16}/></div>
                            <div>
                                <p className="text-[10px] font-black text-indigo-900 uppercase">Fokus Pengembangan</p>
                                <p className="text-[9px] text-indigo-700 leading-tight font-medium">Berdasarkan skor terendah: <strong>{kboCategoryScores.sort((a:any, b:any) => a.score - b.score)[0].name}</strong></p>
                            </div>
                         </div>
                    </AdaptiveInsightCard>
                )}
            </AdaptiveCardGrid>

            {targetedCourses.length > 0 && (
                <AdaptiveInsightCard title="Akademi Pembelajaran (LMS)" icon={GraduationCap} description="Materi pengembangan yang ditugaskan">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Daftar Kursus</p>
                            {targetedCourses.slice(0, 3).map(course => (
                                <div key={course.id} className="p-3 rounded-xl border border-border/40 bg-muted/5 flex items-center gap-3 group hover:bg-muted/10 transition-all cursor-pointer">
                                    <div className="size-10 rounded-lg overflow-hidden bg-slate-200 shrink-0 relative">
                                        {course.thumbnailUrl && <Image src={course.thumbnailUrl} alt={course.title} fill className="object-cover" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold truncate">{course.title}</p>
                                        <p className="text-[9px] font-medium text-muted-foreground uppercase">{course.modules.length} Modul</p>
                                    </div>
                                    <ArrowRight size={14} className="text-muted-foreground opacity-30 group-hover:opacity-100 transition-all" />
                                </div>
                            ))}
                        </div>
                        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-100 flex flex-col justify-center items-center text-center">
                            <div className="size-14 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mb-4"><Award size={28} /></div>
                            <p className="text-sm font-black text-amber-900 uppercase tracking-tighter">Sertifikasi Anda</p>
                            <p className="text-xs text-amber-700 font-bold">{completedCourses.length} Kursus Selesai</p>
                            <Button asChild size="sm" className="mt-4 rounded-full px-6 text-[10px] font-black uppercase bg-amber-600 hover:bg-amber-700 shadow-md">
                                <Link href="/lms/user/my-learnings">Lihat Portal</Link>
                            </Button>
                        </div>
                    </div>
                </AdaptiveInsightCard>
            )}
        </ResponsivePage>
    );
}

export default function ActionCenterPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-white"><Loader2 className="animate-spin text-primary size-10" /></div>}>
            <MyDashboardContent />
        </Suspense>
    )
}
