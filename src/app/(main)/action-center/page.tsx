
// src/app/(main)/action-center/page.tsx
"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';
import { format, parse } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    FilePlus2, 
    CheckCircle, 
    ClipboardPen, 
    BookUser, 
    Award, 
    ShieldCheck, 
    Book, 
    BarChart3, 
    GraduationCap, 
    BarChartHorizontal, 
    CirclePlay, 
    BookCopy, 
    BrainCircuit, 
    Target, 
    BellRing,
    TrendingUp,
    TrendingDown
} from 'lucide-react';
import Link from 'next/link';
import type { Enrollment, KpiData, Course, Employee, KboAssessment, AppraisalSetup, AppraisalTask } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PerformanceTrendChart } from '@/components/reports/performance-trend-chart';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";


function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 4) return "Malam";
  if (hour < 11) return "Pagi";
  if (hour < 15) return "Siang";
  if (hour < 19) return "Sore";
  return "Malam";
}

function KpiInputHighlightCard({ hasSubmitted }: { hasSubmitted: boolean }) {
    const currentMonth = format(new Date(), "LLLL yyyy", { locale: localeId });
    const statusText = hasSubmitted ? "Sudah diinput" : "Belum diinput";

    return (
        <Card className="bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-shadow h-full flex flex-col">
            <CardContent className="p-4 flex items-center gap-4 flex-grow">
                <div className="flex items-center justify-center bg-primary-foreground/20 h-12 w-12 rounded-lg flex-shrink-0">
                    <FilePlus2 className="h-6 w-6 text-yellow-300" />
                </div>
                <div className="flex-grow">
                    <h3 className="text-sm font-bold -mb-0.5">Input KPI Bulanan</h3>
                    <p className="text-xs text-primary-foreground/80">Periode: {currentMonth}</p>
                </div>
                <div className="text-right flex-shrink-0">
                    <p className="text-xs">Status</p>
                    <p className="font-bold text-sm">{statusText}</p>
                </div>
            </CardContent>
            <Button asChild variant="secondary" size="sm" className="w-full font-bold text-xs rounded-t-none mt-auto">
                <Link href="/input-achievement">
                    {hasSubmitted ? "Lihat / Ubah Input" : "Input KPI Bulanan"}
                </Link>
            </Button>
        </Card>
    )
}


// --- Action Center Task Cards ---

function OkrUpdateTaskCard({ count }: { count: number }) {
    if (count === 0) return null;
    return (
        <Link href="/okr/progress">
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <Target className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                    <p className="font-semibold text-sm">Update OKR</p>
                    <p className="text-xs text-muted-foreground">{count} Key Result perlu diupdate</p>
                </div>
            </div>
        </Link>
    );
}

function TeamApprovalTaskCard({ pendingCount }: { pendingCount: number }) {
    if (pendingCount === 0) return null;
    return (
        <Link href="/reports">
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                 <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                    <p className="font-semibold text-sm">Persetujuan KPI Tim</p>
                    <p className="text-xs text-muted-foreground">{pendingCount} laporan menunggu persetujuan Anda</p>
                </div>
            </div>
        </Link>
    );
}

function KboAssessmentTaskCard({ task }: { task: AppraisalTask }) {
    return (
        <Link href={`/kbo-assessment-form?setupId=${task.setupId}&subjectId=${task.subjectId}&raterId=${task.raterId}&kboSetupIds=${task.kboSetupId}`}>
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                 <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <ClipboardPen className="h-4 w-4 text-accent" />
                </div>
                <div>
                    <p className="font-semibold text-sm">Nilai Kompetensi</p>
                    <p className="text-xs text-muted-foreground">Berikan penilaian untuk {task.subjectName}</p>
                </div>
            </div>
        </Link>
    );
}

function LmsCourseTaskCard({ enrollment, course }: { enrollment: Enrollment, course: Course }) {
     return (
        <Link href={`/lms/user/course/${enrollment.courseId}`}>
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                 <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                    <BookUser className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                    <p className="font-semibold text-sm">Lanjutkan Kursus</p>
                    <p className="text-xs text-muted-foreground">Selesaikan "{course.title}" ({enrollment.progress}%)</p>
                </div>
            </div>
        </Link>
    )
}

function NewCourseTaskCard({ course }: { course: Course }) {
    return (
        <Link href={`/lms/user/course/${course.id}`}>
            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                    <p className="font-semibold text-sm">Mulai Kursus Baru</p>
                    <p className="text-xs text-muted-foreground">"{course.title}" telah ditugaskan untuk Anda</p>
                </div>
            </div>
        </Link>
    );
}

function LatestKpiCard({ kpiData }: { kpiData: KpiData[] }) {
    const sortedByPeriod = useMemo(() => {
        if (!kpiData || kpiData.length === 0) return [];
        return [...kpiData].sort((a, b) => a.period.localeCompare(b.period));
    }, [kpiData]);

    const latestKpi = sortedByPeriod[sortedByPeriod.length - 1];

    if (!latestKpi) return null;

    return (
        <Card className="flex flex-col h-full">
            <CardHeader className="pb-2 flex-grow">
                <CardTitle className="text-sm font-semibold text-muted-foreground">SKOR KPI TERBARU</CardTitle>
                <div className="mt-1">
                    <p className="text-2xl font-bold">{latestKpi.score.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">{format(parse(latestKpi.period, "yyyy-MM", new Date()), "LLLL yyyy", { locale: localeId })}</p>
                </div>
            </CardHeader>
            <CardContent className="flex items-end mt-auto">
                 <Button asChild variant="outline" size="sm" className="w-full text-xs">
                    <Link href="/my-performance">Lihat Hasil</Link>
                </Button>
            </CardContent>
        </Card>
    );
}

function LatestKboCard({ assessments, appraisalSetups, currentUser, appraisalTasks }: { assessments: KboAssessment[], appraisalSetups: AppraisalSetup[], currentUser: Employee, appraisalTasks: AppraisalTask[] }) {
    const latestAssessment = useMemo(() => {
        if (!assessments || assessments.length === 0) return null;
        return assessments.sort((a, b) => new Date(b.timestamp.toDate()).getTime() - new Date(a.timestamp.toDate()).getTime())[0];
    }, [assessments]);

    const { averageScore } = useMemo(() => {
        if (!latestAssessment || !currentUser) return { averageScore: 0 };
    
        const appraisalSetup = appraisalSetups.find(s => s.id === latestAssessment.setupId);
        if (!appraisalSetup) return { averageScore: 0 };

        const components = appraisalSetup.componentsByLevel?.[currentUser.level];
        if (!components?.kbo) return { averageScore: 0 };

        const tasksForSubjectInSetup = appraisalTasks.filter(t => t.subjectId === currentUser.id && t.setupId === appraisalSetup.id && t.status === 'completed');
        const completedRaterIdsByKboSetup: Record<string, string[]> = {};
        
        tasksForSubjectInSetup.forEach(task => {
            if (!completedRaterIdsByKboSetup[task.kboSetupId]) completedRaterIdsByKboSetup[task.kboSetupId] = [];
            completedRaterIdsByKboSetup[task.kboSetupId].push(task.raterId);
        });

        const categoryScores = Object.entries(components.kbo).map(([categoryName, kboComponent]) => {
            if (!kboComponent.kboSetupIds || kboComponent.kboSetupIds.length === 0) return null;
            const kboSetupId = kboComponent.kboSetupIds[0];
            const completedRaters = completedRaterIdsByKboSetup[kboSetupId] || [];

            if (completedRaters.length === 0) return null;

            const scores = completedRaters.map(raterId => {
                const assessmentDoc = assessments.find(a => a.setupId === appraisalSetup.id && a.subjectId === currentUser.id && a.raterId === raterId);
                return assessmentDoc?.assessments?.[kboSetupId]?.totalScore;
            }).filter((score): score is number => typeof score === 'number');

            if (scores.length === 0) return null;
            const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
            return { weight: kboComponent.weight || 0, score: avgScore };
        }).filter((s): s is NonNullable<typeof s> => s !== null);

        if (categoryScores.length === 0) return { averageScore: 0 };

        const totalEffectiveWeight = categoryScores.reduce((sum, item) => sum + item.weight, 0);
        if (totalEffectiveWeight === 0) return { averageScore: 0 };
        
        const finalKboScore = categoryScores.reduce((sum, item) => sum + item.score * (item.weight / totalEffectiveWeight), 0);
        return { averageScore: finalKboScore };

    }, [latestAssessment, appraisalSetups, currentUser, appraisalTasks, assessments]);

    if (!latestAssessment) return null;
    
    return (
        <Card className="flex flex-col h-full">
            <CardHeader className="pb-2 flex-grow">
                 <CardTitle className="text-sm font-semibold text-muted-foreground">SKOR KBO TERBARU</CardTitle>
                <div className="mt-1">
                    <p className="text-2xl font-bold">{averageScore.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">{format(latestAssessment.timestamp.toDate(), "LLLL yyyy", { locale: localeId })}</p>
                </div>
            </CardHeader>
        </Card>
    );
}

function HighlightCard({ title, value, period, icon: Icon, colorClass }: { title: string, value: string, period: string, icon: React.ElementType, colorClass: string }) {
    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex-row items-center gap-4 space-y-0">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorClass} bg-opacity-10 flex-shrink-0`}>
                    <Icon className={`h-6 w-6 ${colorClass}`} />
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">{title}</p>
                    <p className="text-lg font-bold">{value}</p>
                    <p className="text-xs text-muted-foreground">{period}</p>
                </div>
            </CardHeader>
        </Card>
    );
}

function LearningListCard({ title, courses, enrollments, status }: { title: string, courses: Course[], enrollments: Enrollment[], status: 'in-progress' | 'completed' | 'not-started' }) {
    const actionText = {
        'in-progress': 'Lanjutkan Belajar',
        'completed': 'Lihat Hasil',
        'not-started': 'Mulai Belajar'
    };
    const icon = {
        'in-progress': <CirclePlay className="mr-2 h-4 w-4" />,
        'completed': <Award className="mr-2 h-4 w-4" />,
        'not-started': <CirclePlay className="mr-2 h-4 w-4" />
    };

    if (courses.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-semibold">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-4 text-sm text-muted-foreground">
                        {status === 'in-progress' && "Tidak ada materi yang sedang Anda pelajari."}
                        {status === 'completed' && "Anda belum menyelesaikan materi apa pun."}
                        {status === 'not-started' && "Semua kursus yang ditargetkan sudah dimulai."}
                    </div>
                </CardContent>
            </Card>
        )
    }


    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base font-semibold">{title} ({courses.length})</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {courses.map(course => {
                        const enrollment = enrollments.find(e => e.courseId === course.id);
                        return (
                            <div key={course.id} className="p-3 border rounded-lg flex flex-col sm:flex-row sm:items-center gap-4">
                                {course.thumbnailUrl && (
                                    <div className="relative aspect-video w-full sm:w-24 rounded-md overflow-hidden flex-shrink-0">
                                        <Image src={course.thumbnailUrl} alt={course.title} fill className="object-cover" />
                                    </div>
                                )}
                                <div className="flex-grow">
                                    <p className="font-semibold text-sm">{course.title}</p>
                                    {status === 'in-progress' && enrollment && (
                                        <div className="flex items-center gap-2 mt-1">
                                            <Progress value={enrollment.progress} className="h-2" />
                                            <span className="text-xs font-semibold text-muted-foreground">{enrollment.progress}%</span>
                                        </div>
                                    )}
                                    {status === 'completed' && (
                                         <p className="text-xs text-green-600 mt-1">Selesai</p>
                                    )}
                                </div>
                                <Button asChild size="sm" variant={status === 'completed' ? 'secondary' : 'default'} className="mt-2 sm:mt-0">
                                    <Link href={`/lms/user/course/${course.id}`}>
                                        {icon[status]}
                                        {actionText[status]}
                                    </Link>
                                </Button>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    );
}

function LmsLeaderboardCard({ currentUser, enrollments, courses, employees }: { currentUser: Employee | null, enrollments: Enrollment[], courses: Course[], employees: Employee[] }) {
    const leaderboardData = useMemo(() => {
        if (!currentUser?.company) return [];

        const companyEmployees = employees.filter(e => e.company === currentUser.company && e.status === 'Aktif');
        const companyEnrollments = enrollments.filter(e => companyEmployees.some(emp => emp.id === e.employeeId));

        const dataByEmployee = new Map<string, { totalProgress: number; progressCount: number; totalScore: number; completedCount: number; }>();

        companyEnrollments.forEach(enrollment => {
            if (!dataByEmployee.has(enrollment.employeeId)) {
                dataByEmployee.set(enrollment.employeeId, { totalProgress: 0, progressCount: 0, totalScore: 0, completedCount: 0 });
            }
            const entry = dataByEmployee.get(enrollment.employeeId)!;
            entry.totalProgress += enrollment.progress;
            entry.progressCount++;

            if (enrollment.status === 'completed') {
                const course = courses.find(c => c.id === enrollment.courseId);
                entry.totalScore += enrollment.getFinalScore(course || null);
                entry.completedCount++;
            }
        });
        
        return Array.from(dataByEmployee.entries()).map(([employeeId, data]) => {
            const employee = employees.find(e => e.id === employeeId)!;
            const averageScore = data.completedCount > 0 ? data.totalScore / data.completedCount : 0;
            const averageProgress = data.progressCount > 0 ? data.totalProgress / data.progressCount : 0;

            return {
                employee,
                averageScore: parseFloat(averageScore.toFixed(1)),
                averageProgress: parseFloat(averageProgress.toFixed(0)),
            };
        })
        .filter(item => item.averageProgress > 0)
        .sort((a, b) => b.averageScore - a.averageScore || b.averageProgress - a.averageProgress)
        .slice(0, 10);

    }, [currentUser, enrollments, courses, employees]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base font-semibold">Papan Peringkat Pembelajaran</CardTitle>
                <CardDescription>Peringkat berdasarkan rata-rata skor akhir dari semua kursus yang selesai.</CardDescription>
            </CardHeader>
            <CardContent>
                 {leaderboardData.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-10">#</TableHead>
                                <TableHead>Peserta</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-right">Skor Rata-rata</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {leaderboardData.map((entry, index) => {
                                const statusProgress = entry.averageProgress;
                                return (
                                    <TableRow key={entry.employee.id} className={cn(currentUser && entry.employee.id === currentUser.id && "bg-primary/10")}>
                                        <TableCell className="font-bold">{index + 1}</TableCell>
                                        <TableCell>{entry.employee.name}</TableCell>
                                        <TableCell className="text-center">
                                            {statusProgress >= 100 ? (
                                                <Badge variant="default">Selesai</Badge>
                                            ) : statusProgress > 0 ? (
                                                <div className="flex items-center gap-2 justify-center">
                                                    <Progress value={statusProgress} className="h-2 w-16"/>
                                                    <span className="text-xs font-semibold">{statusProgress.toFixed(0)}%</span>
                                                </div>
                                            ) : (
                                                <Badge variant="outline">Belum Mulai</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">{entry.averageScore > 0 ? entry.averageScore.toFixed(1) : '-'}</TableCell>
                                    </TableRow>
                                )}
                            )}
                        </TableBody>
                    </Table>
                 ) : (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                        Belum ada peserta yang memulai kursus untuk ditampilkan di papan peringkat.
                    </div>
                 )}
            </CardContent>
        </Card>
    );
}

// --- Main Page ---

function MyDashboardContent() {
    const { currentUser } = useAuth();
    const { kpiData, appraisalTasks, enrollments, employees, courses, kboAssessments, appraisalSetups, okrs } = useMasterData();
    const [greeting, setGreeting] = useState('');
    const [carouselApi, setCarouselApi] = useState<CarouselApi>();
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        setGreeting(getGreeting());
    }, []);
    
    useEffect(() => {
        if (!carouselApi) return;
        
        const onSelect = () => {
            setCurrentSlide(carouselApi.selectedScrollSnap());
        };
        
        carouselApi.on("select", onSelect);
        onSelect(); // Set initial state

        return () => carouselApi.off("select", onSelect);
    }, [carouselApi]);

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
        
        return {
            targetedCourses: myTargetedCourses,
            notStartedCourses: unstarted,
            inProgressCourses: inProgress,
            completedCourses: completed,
        };
    }, [courses, enrollments, currentUser]);
    
    const currentPeriod = format(new Date(), "yyyy-MM");
    const hasSubmittedKpiForCurrentMonth = kpiData.some(d => d.employeeId === currentUser?.id && d.period === currentPeriod);

    // Task list calculation
    const actionTasks = useMemo(() => {
        if (!currentUser) return [];

        const tasks: React.ReactNode[] = [];
        
        const myOkrKrCount = okrs.filter(okr => 
            okr.status === 'Active' && 
            okr.keyResults.some(kr => 
                kr.ownerId === currentUser.id ||
                kr.milestones.some(m => m.ownerId === currentUser.id) ||
                kr.checklist.some(c => c.ownerId === currentUser.id) ||
                kr.contributors.some(c => c.ownerId === currentUser.id)
            )
        ).reduce((count, okr) => count + okr.keyResults.filter(kr => 
             kr.ownerId === currentUser.id ||
             kr.milestones.some(m => m.ownerId === currentUser.id) ||
             kr.checklist.some(c => c.ownerId === currentUser.id) ||
             kr.contributors.some(c => c.ownerId === currentUser.id)
        ).length, 0);

        if (myOkrKrCount > 0) {
            tasks.push(<OkrUpdateTaskCard key="okr-update" count={myOkrKrCount} />);
        }

        if (teamKpiDataForApproval.length > 0) {
            tasks.push(<TeamApprovalTaskCard key="team-approval" pendingCount={teamKpiDataForApproval.length} />);
        }

        const pendingKboTasks = appraisalTasks.filter(t => t.raterId === currentUser.id && t.status !== 'completed');
        pendingKboTasks.forEach(task => {
            tasks.push(<KboAssessmentTaskCard key={task.id} task={task} />);
        });

        const activeEnrollments = enrollments.filter(e => e.employeeId === currentUser.id && (e.status === 'in-progress'));
        activeEnrollments.forEach(enrollment => {
             const course = courses.find(c => c.id === enrollment.courseId);
             if (course) {
                tasks.push(<LmsCourseTaskCard key={enrollment.id} enrollment={enrollment} course={course} />);
             }
        });

        notStartedCourses.forEach(course => {
            tasks.push(<NewCourseTaskCard key={`new-${course.id}`} course={course} />);
        });
        
        return tasks;
    }, [currentUser, kpiData, appraisalTasks, enrollments, courses, teamKpiDataForApproval, notStartedCourses, okrs]);
    
    // --- Data for Insight Cards ---
    const myKpiData = useMemo(() => {
        if (!currentUser) return [];
        return kpiData
            .filter(d => d.employeeId === currentUser.id)
            .sort((a,b) => a.period.localeCompare(b.period));
    }, [currentUser, kpiData]);
    
    const myKboData = useMemo(() => {
        if (!currentUser) return [];
        return kboAssessments.filter(a => a.subjectId === currentUser.id);
    }, [currentUser, kboAssessments]);
    
    const hasKboContext = useMemo(() => myKboData.length > 0 || appraisalTasks.some(t => t.subjectId === currentUser?.id || t.raterId === currentUser?.id), [myKboData, appraisalTasks, currentUser]);


    const kpiHighlights = useMemo(() => {
        if (myKpiData.length === 0) return null;
        
        const sortedByScore = [...myKpiData].sort((a, b) => b.score - a.score);
        const best = sortedByScore[0];
        const worst = sortedByScore[sortedByScore.length - 1];
        
        const average = myKpiData.reduce((sum, d) => sum + d.score, 0) / myKpiData.length;

        return {
            best: { 
                score: best.score, 
                period: format(parse(best.period, "yyyy-MM", new Date()), "LLLL yyyy", { locale: localeId }) 
            },
            worst: { 
                score: worst.score, 
                period: format(parse(worst.period, "yyyy-MM", new Date()), "LLLL yyyy", { locale: localeId }) 
            },
            average: average,
        }
    }, [myKpiData]);

    const kboCategoryScores = useMemo(() => {
        if (!myKboData.length || !currentUser) return [];
        const latestAssessment = myKboData.sort((a, b) => new Date(b.timestamp.toDate()).getTime() - new Date(a.timestamp.toDate()).getTime())[0];
        if (!latestAssessment) return [];
    
        const appraisalSetupForKBO = appraisalSetups.find(s => s.id === latestAssessment.setupId);
        if (!appraisalSetupForKBO) return [];
    
        const components = appraisalSetupForKBO.componentsByLevel?.[currentUser!.level];
        if (!components?.kbo) return [];
    
        const categoryResults: { name: string; score: number }[] = [];
    
        const categoryScoresList = Object.entries(components.kbo).map(([categoryName, kboComponent]) => {
            if (!kboComponent.kboSetupIds || kboComponent.kboSetupIds.length === 0) return null;
            const kboSetupId = kboComponent.kboSetupIds[0];
            const assessmentForCategory = latestAssessment.assessments[kboSetupId];
            if (assessmentForCategory) {
                return {
                    name: categoryName,
                    score: assessmentForCategory.totalScore,
                    weight: kboComponent.weight || 0,
                };
            }
            return null;
        }).filter((item): item is NonNullable<typeof item> => item !== null);

        return categoryScoresList.map(item => ({
            name: item.name,
            score: item.score,
        }));
    
    }, [myKboData, appraisalSetups, currentUser]);

    const kboChartData = useMemo(() => {
        return myKboData.map(d => {
            const avgScore = Object.values(d.assessments).reduce((sum, val) => sum + val.totalScore, 0) / Object.keys(d.assessments).length;
            return {
                period: format(d.timestamp.toDate(), 'yyyy-MM'),
                score: parseFloat(avgScore.toFixed(1)),
            }
        }).sort((a, b) => a.period.localeCompare(b.period));
    }, [myKboData]);
    
    if (!currentUser) {
        return (
             <div className="flex h-64 w-full items-center justify-center">
                <p className="text-muted-foreground">Memuat data pengguna...</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold font-headline tracking-tight">Selamat {greeting}, {currentUser.name.split(' ')[0]}!</h1>
                <p className="text-muted-foreground">Siap untuk memantau performa hari ini?</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiInputHighlightCard hasSubmitted={hasSubmittedKpiForCurrentMonth} />
                 <Card className="h-full flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-base font-semibold">Tugas untuk Anda</CardTitle>
                        {actionTasks.length > 0 && (
                            <p className="text-xs font-semibold text-muted-foreground">{actionTasks.length} Tugas</p>
                        )}
                    </CardHeader>
                    <CardContent className="flex-grow flex items-center justify-center">
                        {actionTasks.length > 0 ? (
                        actionTasks.length > 1 ? (
                                <Carousel setApi={setCarouselApi} className="w-full">
                                    <CarouselContent>
                                        {actionTasks.map((task, i) => <CarouselItem key={i}>{task}</CarouselItem>)}
                                    </CarouselContent>
                                    <div className="text-center mt-2">
                                        <p className="text-sm font-semibold text-muted-foreground/80">
                                            {currentSlide + 1} / {actionTasks.length}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground/60 italic">geser</p>
                                    </div>
                                </Carousel>
                        ) : (
                                <div className="space-y-1 w-full">
                                    {actionTasks.map((task, i) => <div key={i}>{task}</div>)}
                                </div>
                        )
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-2 text-center p-4 h-full">
                                <CheckCircle className="h-8 w-8 text-green-500" />
                                <p className="text-sm font-medium text-muted-foreground">Kerja bagus! Tidak ada tugas yang menunggu.</p>
                            </div>
                        )}
                    </CardContent>
                 </Card>
                 {myKpiData.length > 0 && (
                    <LatestKpiCard kpiData={myKpiData} />
                )}
                 {hasKboContext && myKboData.length > 0 && (
                    <LatestKboCard assessments={myKboData} appraisalSetups={appraisalSetups} currentUser={currentUser} appraisalTasks={appraisalTasks} />
                )}
            </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                {myKpiData.length > 0 && (
                    <Card className="h-full flex flex-col">
                        <CardHeader>
                            <CardTitle className="font-headline text-lg flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-primary" />
                                Detail Kinerja (KPI)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 flex-grow flex flex-col">
                            <div className="h-[200px] flex-shrink-0">
                                <PerformanceTrendChart data={myKpiData} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 content-start mt-auto">
                                {kpiHighlights?.best && <HighlightCard title="Performa Terbaik" value={kpiHighlights.best.score.toFixed(1)} period={kpiHighlights.best.period} icon={TrendingUp} colorClass="text-green-600" />}
                                {kpiHighlights?.worst && <HighlightCard title="Performa Terendah" value={kpiHighlights.worst.score.toFixed(1)} period={kpiHighlights.worst.period} icon={TrendingDown} colorClass="text-red-600" />}
                                {kpiHighlights?.average && <HighlightCard title="Rata-rata Skor" value={kpiHighlights.average.toFixed(1)} period="Semua Periode" icon={BarChartHorizontal} colorClass="text-blue-600" />}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {hasKboContext && myKboData.length > 0 && (
                    <Card className="h-full flex flex-col">
                         <CardHeader>
                            <CardTitle className="font-headline text-lg flex items-center gap-2">
                                <BrainCircuit className="h-5 w-5 text-primary" />
                                Detail Kinerja (KBO)
                            </CardTitle>
                        </CardHeader>
                         <CardContent className="space-y-6 flex-grow flex flex-col">
                            <div className="h-[200px] flex-shrink-0">
                                <PerformanceTrendChart data={kboChartData} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-auto">
                                {kboCategoryScores && kboCategoryScores.map((cat, index) => (
                                    <HighlightCard 
                                        key={index}
                                        title={cat.name}
                                        value={cat.score.toFixed(1)}
                                        period="Skor Rata-Rata"
                                        icon={BookCopy}
                                        colorClass="text-indigo-600"
                                    />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {(targetedCourses.length > 0) && (
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline text-lg flex items-center gap-2">
                             <GraduationCap className="h-5 w-5 text-primary" />
                             Area Pembelajaran (LMS)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <div className="space-y-4">
                             <LearningListCard 
                                title="Materi Baru Untuk Anda"
                                courses={notStartedCourses}
                                enrollments={enrollments}
                                status="not-started"
                            />
                            <LearningListCard 
                                title="Materi Sedang Dipelajari"
                                courses={inProgressCourses}
                                enrollments={enrollments}
                                status="in-progress"
                            />
                             <LearningListCard 
                                title="Materi Selesai"
                                courses={completedCourses}
                                enrollments={enrollments}
                                status="completed"
                            />
                        </div>
                         <LmsLeaderboardCard currentUser={currentUser} enrollments={enrollments} courses={courses} employees={employees} />
                    </CardContent>
                </Card>
            )}

        </div>
    );
}

export default function ActionCenterPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <MyDashboardContent />
        </Suspense>
    )
}
