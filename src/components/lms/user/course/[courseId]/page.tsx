// src/components/lms/user/course/[courseId]/page.tsx
"use client";

import * as React from "react";
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import {
  FileText,
  Youtube,
  Link as LinkIcon,
  FileQuestion,
  BookOpenCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  Lock,
  X,
  CheckCircle,
  PartyPopper,
  Award,
  Timer,
  TrendingUp,
  Target,
  Trophy,
  Calculator,
  Lightbulb,
  Download,
  Check,
  Loader2,
  Angry,
} from "lucide-react";
import type { Course, LmsModule, LmsTopic, LmsQuiz, Enrollment, Employee } from "@/types";
import { enrollmentWithMethods } from "@/types"; // Import the missing function
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { QuizTakerDialog } from "@/components/lms/quiz-taker-dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Drawer, DrawerContent, DrawerTrigger, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { format, formatDistanceStrict } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import Image from "next/image";


const TopicContent = React.memo(({ topic }: { topic: LmsTopic }) => {
    const { youtubeEmbedUrl, textContent, isExternalLink } = React.useMemo(() => {
        const getYoutubeEmbedUrl = (url: string) => {
            if (!url) return null;
            let videoId = null;
            try {
                if (url.includes('youtube.com/watch')) {
                    videoId = new URL(url).searchParams.get('v');
                } else if (url.includes('youtu.be/')) {
                    videoId = url.split('youtu.be/')[1].split('?')[0];
                }
            } catch (e) {
                return null;
            }
            return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
        };
        
        const getGoogleEmbedUrl = (url: string) => {
            if (!url) return null;
            try {
              if (url.includes("/file/d/")) {
                return url.replace("/view", "/preview").replace("/edit", "/preview");
              }
              if (url.includes("/document/d/") || url.includes("/presentation/d/") || url.includes("/spreadsheets/d/")) {
                  return url.replace(/\/edit\?.*$/, "/embed").replace(/\/view\?.*$/, "/embed");
              }
            } catch(e) {
              return null;
            }
            return url; 
        };
        
        const safeContent = topic.content || '';
        let embedUrl: string | null = null;
        let isExtLink = false;
        
        if (topic.contentType === 'video') {
            embedUrl = getYoutubeEmbedUrl(safeContent);
        } else if (topic.contentType === 'link') {
            const googleUrl = getGoogleEmbedUrl(safeContent);
            // If it's a google embeddable link, use it. Otherwise, treat as an external link.
            if (googleUrl && (googleUrl.includes('/embed') || googleUrl.includes('/preview'))) {
                embedUrl = googleUrl;
            } else {
                isExtLink = true;
            }
        }
        
        return { youtubeEmbedUrl: embedUrl, textContent: safeContent, isExternalLink: isExtLink };
    }, [topic.content, topic.contentType]);

    const getDownloadLink = (url: string) => {
        if (!url) return "#";
        try {
            const urlObj = new URL(url);
            if (urlObj.hostname.includes('drive.google.com')) {
                const fileId = url.match(/d\/(.+?)\//);
                if (fileId && fileId[1]) {
                    return `https://drive.google.com/uc?export=download&id=${fileId[1]}`;
                }
            }
        } catch (e) {
            console.error("Invalid URL for download link:", url);
        }
        return url;
    };
    
    return (
        <div className="space-y-6">
             {(topic.contentType === 'video' || (topic.contentType === 'link' && !isExternalLink)) && youtubeEmbedUrl && (
                <div className="relative aspect-video">
                     <iframe
                        key={youtubeEmbedUrl}
                        width="100%"
                        height="100%"
                        src={youtubeEmbedUrl}
                        title="Embedded content"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                        allowFullScreen
                        className="rounded-md border"
                    ></iframe>
                </div>
            )}
            
            {topic.contentType === 'text' && (
                <div className="text-sm whitespace-pre-wrap leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: textContent }} />
            )}

            {topic.contentType === 'link' && isExternalLink && (
                 <Button asChild variant="outline">
                    <a href={textContent} target="_blank" rel="noopener noreferrer">
                        <LinkIcon className="mr-2 h-4 w-4" />
                        Buka Tautan Materi
                    </a>
                </Button>
            )}

            {topic.workbookUrl && (
                <div className="pt-4">
                    <Button asChild variant="outline">
                        <a href={getDownloadLink(topic.workbookUrl)} target="_blank" rel="noopener noreferrer">
                            <Download className="mr-2 h-4 w-4" />
                            Unduh Workbook
                        </a>
                    </Button>
                </div>
            )}
        </div>
    );
});
TopicContent.displayName = 'TopicContent';


function CourseSidebar({ course, activeItem, setActiveItem, enrollment, isReviewMode }: { course: any; activeItem: any; setActiveItem: (item: any) => void; enrollment: Enrollment | null; isReviewMode: boolean; }) {
    
    const isItemCompleted = (item: any) => {
        if (!enrollment) return false;
        if (item.type === 'pre-test') return enrollment.preTestScore !== undefined;
        if (item.type === 'topic') {
            const topicStatus = enrollment.topicStatus?.[item.id];
            // Considered complete if it exists. Quiz failure prevents advancing, but the attempt is 'complete'.
            return !!topicStatus;
        }
        if (item.type === 'post-test') return enrollment.postTestScore !== undefined;
        return false;
    };
    
    const isItemLocked = (item: any, index: number, allItems: any[]) => {
        if (isReviewMode) return false; // Nothing is locked in review mode
        if (index === 0) return false; // First item is never locked
        const prevItem = allItems[index - 1];
        // The previous item must be marked as completed in the enrollment status
        const prevItemCompleted = isItemCompleted(prevItem);
        // And if it had a quiz, it must have been passed
        const prevItemQuizPassed = prevItem.type === 'topic' && prevItem.quiz ? enrollment?.topicStatus?.[prevItem.id]?.quizPassed === true : true;
        
        return !prevItemCompleted || !prevItemQuizPassed;
    };

    return (
        <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
                <Accordion type="multiple" className="w-full space-y-2" defaultValue={course.learningItems.map((item: any) => `${item.type}-${item.id}`)}>
                    {course.learningItems.map((item: any, index: number) => {
                        const isLocked = isItemLocked(item, index, course.learningItems);
                        const isCompleted = isItemCompleted(item);
                        const isActive = activeItem?.id === item.id && activeItem?.type === item.type;
                        
                        let IconComponent;
                        if (item.type === 'pre-test' || item.type === 'post-test') {
                            IconComponent = FileQuestion;
                        } else if (item.quiz) {
                            IconComponent = Lightbulb;
                        } else {
                            IconComponent = FileText;
                        }

                        return (
                            <button
                                key={`${item.type}-${item.id}`}
                                disabled={isLocked}
                                className={cn(
                                    "flex w-full items-center gap-3 text-left p-3 text-sm rounded-lg border",
                                    "transition-colors duration-200",
                                    isLocked ? "bg-muted/50 text-muted-foreground cursor-not-allowed" : "bg-background hover:bg-muted/50",
                                    isActive && "bg-primary/10 border-primary"
                                )}
                                onClick={() => setActiveItem(item)}
                            >
                                {isCompleted ? <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" /> : <IconComponent className="h-4 w-4 flex-shrink-0" />}
                                <span className="flex-1">{item.title}</span>
                                {isLocked && <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                            </button>
                        );
                    })}
                </Accordion>
            </div>
        </ScrollArea>
    );
}

function CourseResultView({ course, enrollment, currentUser }: { course: Course, enrollment: Enrollment, currentUser: Employee }) {
    const { enrollments, employees } = useMasterData();
    const [isScoreDetailOpen, setIsScoreDetailOpen] = React.useState(false);

    const targetedEmployees = React.useMemo(() => {
        if (!course || !course.targetAudience) return [];
        const { departments, positions, levels, employees: specificEmployees } = course.targetAudience;

        if (!departments?.length && !positions?.length && !levels?.length && !specificEmployees?.length) {
            return employees.filter(e => e.company === course.company && e.status === 'Aktif');
        }
        
        const targetedSet = new Set<string>();

        if (specificEmployees?.length) {
            specificEmployees.forEach(id => targetedSet.add(id));
        }

        if (!specificEmployees?.length) {
            let filteredEmployees = employees.filter(e => e.company === course.company && e.status === 'Aktif');
            if (levels?.length) {
                filteredEmployees = filteredEmployees.filter(e => levels.includes(e.level));
            }
            if (departments?.length) {
                filteredEmployees = filteredEmployees.filter(e => departments.includes(e.department));
            }
            if (positions?.length) {
                filteredEmployees = filteredEmployees.filter(e => positions.includes(e.position));
            }
            filteredEmployees.forEach(e => targetedSet.add(e.id));
        }
        
        return employees.filter(e => targetedSet.has(e.id));
    }, [employees, course]);

    const leaderboard = React.useMemo(() => {
        return targetedEmployees.map(employee => {
            const enrollmentData = enrollments.find(e => e.courseId === course.id && e.employeeId === employee.id);
            const status = enrollmentData?.status ?? 'not-started';
            
            return {
                employeeId: employee.id,
                employeeName: employee.name,
                finalScore: status === 'completed' && enrollmentData ? enrollmentData.getFinalScore() : null,
                status: status,
                progress: enrollmentData?.progress ?? 0,
            };
        })
        .sort((a, b) => (b.finalScore ?? -1) - (a.finalScore ?? -1));

    }, [enrollments, course.id, targetedEmployees]);
    
    const myRank = leaderboard.findIndex(r => r.employeeId === currentUser.id) + 1;
    
    const preTestScore = enrollment.preTestScore ?? 0;
    const postTestScore = enrollment.postTestScore ?? 0;
    
    const finalScore = enrollment.getFinalScore();
    const passingScore = course.postTestPassingScore ?? 0;
    const isPassed = postTestScore >= passingScore;

    const getFormattedDate = (timestamp: any): string => {
        if (!timestamp) return 'N/A';
        try {
            const date = typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
            if (isNaN(date.getTime())) return 'Tanggal Tidak Valid';
            return format(date, "d MMMM yyyy, HH:mm", { locale: localeId });
        } catch {
            return 'Tanggal Tidak Valid';
        }
    };
    
    const getDuration = (): string => {
        if (!enrollment.startedAt || !enrollment.completedAt) return 'N/A';
        try {
            const startDate = typeof enrollment.startedAt.toDate === 'function' ? enrollment.startedAt.toDate() : new Date(enrollment.startedAt);
            const endDate = typeof enrollment.completedAt.toDate === 'function' ? enrollment.completedAt.toDate() : new Date(enrollment.completedAt);
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 'N/A';
            return formatDistanceStrict(endDate, startDate, { locale: localeId, unit: 'day' });
        } catch {
            return 'N/A';
        }
    };

    const startDateFormatted = getFormattedDate(enrollment.startedAt);
    const completedDateFormatted = getFormattedDate(enrollment.completedAt);

    return (
        <>
        <div className="p-4 md:p-8 space-y-6">
            <div className="text-center space-y-2">
                <PartyPopper className="h-16 w-16 text-yellow-500 mx-auto" />
                <h2 className="text-2xl font-bold">Laporan Hasil Belajar</h2>
                <p className="text-muted-foreground max-w-xl mx-auto">Selamat, {currentUser.name}! Anda telah menyelesaikan kursus "{course.title}". Berikut adalah rincian pencapaian Anda.</p>
                {isPassed ? (
                    <Badge className="bg-green-600 hover:bg-green-700"><Check className="mr-1 h-3.5 w-3.5" /> Lulus</Badge>
                ) : (
                    <Badge variant="destructive"><X className="mr-1 h-3.5 w-3.5" /> Tidak Lulus</Badge>
                )}
            </div>
            
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle>Informasi Pembelajaran</CardTitle></CardHeader>
                    <CardContent className="text-sm space-y-2">
                        <div className="flex justify-between"><span className="text-muted-foreground">Peserta:</span> <span className="font-semibold">{currentUser.name} ({currentUser.position})</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Mulai Belajar:</span> <span className="font-semibold">{startDateFormatted}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Selesai Belajar:</span> <span className="font-semibold">{completedDateFormatted}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Peringkat:</span> <span className="font-semibold">{myRank > 0 ? `${myRank} dari ${leaderboard.length} peserta` : 'N/A'}</span></div>
                    </CardContent>
                </Card>
                <Card onClick={() => setIsScoreDetailOpen(true)} className="text-center cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardHeader><CardTitle className="text-base font-semibold">Skor Akhir</CardTitle></CardHeader>
                    <CardContent><p className="text-5xl font-bold text-primary">{finalScore.toFixed(1)}</p></CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Papan Peringkat (Leaderboard)</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-16">Peringkat</TableHead>
                                <TableHead>Nama Peserta</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Skor Akhir</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {leaderboard.map((entry, index) => (
                                <TableRow key={entry.employeeId} className={cn(entry.employeeId === currentUser.id && "bg-primary/10")}>
                                    <TableCell className="font-bold text-center">{index + 1}</TableCell>
                                    <TableCell>{entry.employeeName}</TableCell>
                                    <TableCell>
                                        {entry.status === 'completed' 
                                            ? <Badge variant="default">Selesai</Badge> 
                                            : <Badge variant="outline">{entry.status === 'in-progress' ? `Berjalan (${entry.progress}%)` : 'Belum Mulai'}</Badge>
                                        }
                                    </TableCell>
                                    <TableCell className="text-right font-semibold">{entry.finalScore?.toFixed(1) || '-'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Rincian Pembelajaran</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Materi</TableHead>
                                <TableHead>Skor</TableHead>
                                {postTestScore !== undefined && (
                                    <>
                                        <TableHead>Min. Lulus</TableHead>
                                        <TableHead>Status</TableHead>
                                    </>
                                )}
                                <TableHead className="text-right">Tanggal Selesai</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                           {enrollment.preTestScore !== undefined && (
                               <TableRow>
                                   <TableCell>Pre-Test</TableCell>
                                   <TableCell>{enrollment.preTestScore.toFixed(1)}</TableCell>
                                   {postTestScore !== undefined && <><TableCell>-</TableCell><TableCell>-</TableCell></>}
                                   <TableCell className="text-right text-xs">-</TableCell>
                               </TableRow>
                           )}
                           {Object.entries(enrollment.topicStatus || {}).map(([topicId, status]) => {
                               const topic = course.modules.flatMap(m => m.topics).find(t => t.id === topicId);
                               return (
                                <TableRow key={topicId}>
                                    <TableCell>{topic?.title || 'Topik Dihapus'}</TableCell>
                                    <TableCell>-</TableCell>
                                    {postTestScore !== undefined && <><TableCell>-</TableCell><TableCell>-</TableCell></>}
                                    <TableCell className="text-right text-xs">
                                        {getFormattedDate(status.completedAt)}
                                    </TableCell>
                                </TableRow>
                               )
                           })}
                            {enrollment.postTestScore !== undefined && (
                               <TableRow>
                                   <TableCell>Post-Test</TableCell>
                                   <TableCell>{enrollment.postTestScore.toFixed(1)}</TableCell>
                                   <TableCell>{passingScore.toFixed(1)}</TableCell>
                                   <TableCell>
                                     {isPassed ? (
                                        <Badge variant="default" className="bg-green-600 hover:bg-green-700">Lulus</Badge>
                                     ) : (
                                        <Badge variant="destructive">Tidak Lulus</Badge>
                                     )}
                                   </TableCell>
                                   <TableCell className="text-right text-xs">
                                     {getFormattedDate(enrollment.completedAt)}
                                   </TableCell>
                               </TableRow>
                           )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
        <Dialog open={isScoreDetailOpen} onOpenChange={setIsScoreDetailOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-primary" />
                        Rincian Perhitungan Skor Akhir
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <p className="text-sm text-muted-foreground">
                        Skor akhir dihitung berdasarkan bobot dari Pre-Test dan Post-Test untuk mengukur pertumbuhan pemahaman.
                    </p>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center p-3 border rounded-lg">
                            <div>
                                <p className="font-semibold">Skor Pre-Test</p>
                                <p className="text-xs text-muted-foreground">Bobot: 30%</p>
                            </div>
                            <p className="text-lg font-bold">{preTestScore.toFixed(1)}</p>
                        </div>
                         <div className="flex justify-between items-center p-3 border rounded-lg">
                            <div>
                                <p className="font-semibold">Skor Post-Test</p>
                                <p className="text-xs text-muted-foreground">Bobot: 70%</p>
                            </div>
                            <p className="text-lg font-bold">{postTestScore.toFixed(1)}</p>
                        </div>
                    </div>
                    <Separator />
                    <div className="p-4 border rounded-lg bg-primary/10 text-center">
                        <p className="text-sm font-semibold">Formula Perhitungan</p>
                        <p className="text-xs text-muted-foreground font-mono">({postTestScore.toFixed(1)} &times; 70%) + ({preTestScore.toFixed(1)} &times; 30%)</p>
                        <p className="text-3xl font-bold text-primary mt-2">{finalScore.toFixed(1)}</p>
                    </div>
                </div>
                 <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Tutup</Button>
                    </DialogClose>
                 </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
}

export default function CoursePage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { courses, quizzes, enrollments, enrollToCourse, updateEnrollment } = useMasterData();
    const { currentUser } = useAuth();
    const isMobile = useIsMobile();
    
    const courseId = params.courseId as string;
    const isReviewMode = searchParams.get('review') === 'true';
    const [sidebarOpen, setSidebarOpen] = React.useState(false);
    const [activeItem, setActiveItem] = React.useState<any | null>(null);
    const [activeQuiz, setActiveQuiz] = React.useState<any | null>(null);
    const [isMobileDrawerOpen, setIsMobileDrawerOpen] = React.useState(false);
    
    const [isClient, setIsClient] = React.useState(false);
    const [isResultView, setIsResultView] = React.useState(false);
    const [viewerData, setViewerData] = React.useState<{enrollment: Enrollment, employee: Employee} | null>(null);

    // --- Data Memoization ---
    const courseWithLearningItems = React.useMemo(() => {
        const baseCourse = courses.find(c => c.id === courseId);
        if (!baseCourse) return null;

        let learningItems: any[] = [];
        if (baseCourse.preTestQuizId) {
            const quiz = quizzes.find(q => q.id === baseCourse.preTestQuizId);
            if (quiz) learningItems.push({ ...quiz, type: 'pre-test', title: `Pre-Test: ${quiz.title}` });
        }
        baseCourse.modules.forEach(module => {
            module.topics.forEach(topic => {
                learningItems.push({ ...topic, type: 'topic', moduleId: module.id });
            });
        });
        if (baseCourse.postTestQuizId) {
            const quiz = quizzes.find(q => q.id === baseCourse.postTestQuizId);
            if (quiz) learningItems.push({ ...quiz, type: 'post-test', title: `Post-Test: ${quiz.title}` });
        }
        return { ...baseCourse, learningItems };
    }, [courses, quizzes, courseId]);

    const viewingAsAdmin = !!viewerData;
    const enrollmentToUse = viewingAsAdmin ? viewerData?.enrollment : enrollments.find(e => e.courseId === courseId && e.employeeId === currentUser?.id);
    const userToDisplay = viewingAsAdmin ? viewerData?.employee : currentUser;
    const isCourseCompleted = enrollmentToUse?.status === 'completed';
    
    // --- Effects ---
     React.useEffect(() => {
        setIsClient(true);
        const resultDataString = sessionStorage.getItem('lmsResultViewerData');
        if (resultDataString) {
            try {
                const data = JSON.parse(resultDataString);
                const enrollmentWithDateObjects = {
                    ...data.enrollment,
                    startedAt: data.enrollment.startedAt,
                    completedAt: data.enrollment.completedAt,
                    topicStatus: Object.entries(data.enrollment.topicStatus || {}).reduce((acc, [key, value]: [string, any]) => {
                        acc[key] = { ...value, completedAt: value.completedAt };
                        return acc;
                    }, {} as { [key: string]: any }),
                };
                setViewerData({ 
                    enrollment: enrollmentWithMethods(enrollmentWithDateObjects as Omit<Enrollment, 'getFinalScore'>),
                    employee: data.employee 
                });
                setIsResultView(true);
                sessionStorage.removeItem('lmsResultViewerData'); // Clean up
            } catch (e) {
                console.error("Failed to parse result viewer data", e);
            }
        }
    }, []);

    React.useEffect(() => {
        if (!viewingAsAdmin && courseId && currentUser && !enrollmentToUse) {
            enrollToCourse(courseId, currentUser.id);
        }
    }, [courseId, currentUser, enrollmentToUse, enrollToCourse, viewingAsAdmin]);
    
    React.useEffect(() => {
        if (!courseWithLearningItems || viewingAsAdmin) return;
        
        if (isCourseCompleted && !isReviewMode) {
             setActiveItem(null);
             setActiveQuiz(null);
             return;
        }

        const firstUncompleted = courseWithLearningItems.learningItems.find((item) => {
            if (isReviewMode) return false; // In review mode, nothing is "uncompleted" for navigation
            if (!enrollmentToUse) return true;
            if (item.type === 'pre-test') return enrollmentToUse.preTestScore === undefined;
            if (item.type === 'post-test') return enrollmentToUse.postTestScore === undefined;
            const status = enrollmentToUse.topicStatus?.[item.id];
            // An item is incomplete if its status doesn't exist, OR if it has a quiz that hasn't been passed.
            return !status || (item.quiz && !status.quizPassed);
        });

        handleSetActiveItem(firstUncompleted || courseWithLearningItems.learningItems[0] || null);
        setSidebarOpen(!isMobile);
    }, [courseWithLearningItems, isMobile, enrollmentToUse, isCourseCompleted, viewingAsAdmin, isReviewMode]);

    // --- Handlers ---
    const handleSetActiveItem = (item: any) => {
        if (!item) {
            setActiveItem(null);
            setActiveQuiz(null);
            return;
        }
        
        if (item.type === 'pre-test' || item.type === 'post-test') {
            setActiveItem(null);
            setActiveQuiz(item);
        } else {
            setActiveItem(item);
            setActiveQuiz(null);
            if (isMobile) setIsMobileDrawerOpen(false);
        }
    };
    
    const handleTopicComplete = (topicId: string, quizPassed: boolean = true) => {
        if (!enrollmentToUse || !courseWithLearningItems || isReviewMode) return;
        
        const newTopicStatus = { 
            ...enrollmentToUse.topicStatus, 
            [topicId]: {
                status: 'completed' as const,
                completedAt: new Date(),
                quizPassed: quizPassed,
            }
        };
        
        const completedCount = (enrollmentToUse.preTestScore !== undefined ? 1 : 0) + 
                               Object.keys(newTopicStatus).length + 
                               (enrollmentToUse.postTestScore !== undefined ? 1 : 0);
        
        const newProgress = courseWithLearningItems.learningItems.length > 0 
            ? Math.round((completedCount / courseWithLearningItems.learningItems.length) * 100) 
            : 0;
        
        updateEnrollment(enrollmentToUse.id, { topicStatus: newTopicStatus, progress: newProgress });
        
        const currentIndex = courseWithLearningItems.learningItems.findIndex(item => item.id === topicId && item.type === 'topic');
        
        if (currentIndex !== -1 && currentIndex + 1 < courseWithLearningItems.learningItems.length) {
            const nextItem = courseWithLearningItems.learningItems[currentIndex + 1];
            handleSetActiveItem(nextItem);
        } else {
             updateEnrollment(enrollmentToUse.id, { status: 'completed', completedAt: new Date(), progress: 100 });
        }
    };

    const handleContinueClick = () => {
        if (!activeItem || isReviewMode) return;
        handleTopicComplete(activeItem.id, true);
    };
    
    const handleQuizSubmit = (score: number, quizId: string, type: 'pre-test' | 'post-test') => {
        if (!enrollmentToUse || !courseWithLearningItems || isReviewMode) return;
        
        const updateData: Partial<Enrollment> = {};
        
        if (type === 'pre-test' && enrollmentToUse.preTestScore === undefined) {
            updateData.preTestScore = score;
        } else if (type === 'post-test' && enrollmentToUse.postTestScore === undefined) {
            updateData.postTestScore = score;
            updateData.status = 'completed';
            updateData.completedAt = new Date();
        }

        const completedCount = (updateData.preTestScore !== undefined || enrollmentToUse.preTestScore !== undefined ? 1 : 0) + 
                               Object.keys(enrollmentToUse.topicStatus || {}).length + 
                               (updateData.postTestScore !== undefined || enrollmentToUse.postTestScore !== undefined ? 1 : 0);
        
        updateData.progress = courseWithLearningItems.learningItems.length > 0 ? Math.round((completedCount / courseWithLearningItems.learningItems.length) * 100) : 0;
        if(updateData.status === 'completed') updateData.progress = 100;
        
        updateEnrollment(enrollmentToUse.id, updateData);

        const currentIndex = courseWithLearningItems.learningItems.findIndex(item => item.id === quizId && item.type === type);
        
        if (currentIndex !== -1 && currentIndex + 1 < courseWithLearningItems.learningItems.length) {
            const nextItem = courseWithLearningItems.learningItems[currentIndex + 1];
            handleSetActiveItem(nextItem);
        } else {
            setActiveQuiz(null);
            setActiveItem(null); 
        }
    };
    
    // --- Render Logic ---
    if (!courseWithLearningItems || !userToDisplay || !isClient) {
        return ( <Card><CardHeader><CardTitle>Memuat...</CardTitle><CardDescription>Memuat data kursus...</CardDescription></CardHeader></Card> );
    }

    const progress = enrollmentToUse?.progress ?? 0;
    
    const MainContent = () => {
        if ((isCourseCompleted && !isReviewMode) || isResultView) {
            if (enrollmentToUse) {
                return <CourseResultView course={courseWithLearningItems} enrollment={enrollmentToUse} currentUser={userToDisplay} />;
            }
            return <Card><CardContent className="p-8 text-center">Data hasil tidak ditemukan.</CardContent></Card>;
        }
        
        if (activeQuiz) {
             return null; // The QuizTakerDialog will be rendered via portal
        }
        
        if (activeItem && activeItem.type === 'topic') {
            return (
                <div className="p-4 md:p-8 space-y-6">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold tracking-tight">{activeItem.title}</h2>
                    </div>
                    <Separator />
                    <TopicContent topic={activeItem} />
                    {!isReviewMode && (
                      <div className="pt-4">
                          <Button onClick={handleContinueClick}>
                             Tandai Selesai & Lanjutkan
                          </Button>
                      </div>
                    )}
                </div>
            );
        }
        
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Pilih materi dari daftar untuk memulai.</p>
            </div>
        )
    }

    return (
        <div className="flex h-screen max-h-screen">
             {(!isResultView && !viewingAsAdmin) && !isMobile && (
                <aside className={cn(
                    "h-full bg-muted/50 border-r transition-all duration-300 overflow-hidden",
                    sidebarOpen ? "w-full md:w-80" : "w-0"
                )}>
                    <CourseSidebar course={courseWithLearningItems} activeItem={activeItem} setActiveItem={handleSetActiveItem} enrollment={enrollmentToUse} isReviewMode={isReviewMode} />
                </aside>
            )}

            <div className="flex flex-1 flex-col overflow-y-hidden">
                <header className="p-4 border-b flex-row items-center justify-between flex sticky top-0 bg-background/80 backdrop-blur-lg z-10">
                    <div className="flex items-center gap-2">
                         {isMobile && !isResultView && !viewingAsAdmin ? (
                            <Drawer open={isMobileDrawerOpen} onOpenChange={setIsMobileDrawerOpen}>
                                <DrawerTrigger asChild><Button variant="ghost" size="icon"><Menu /></Button></DrawerTrigger>
                                <DrawerContent className="h-[70vh]">
                                    <DrawerHeader><DrawerTitle>Daftar Materi</DrawerTitle></DrawerHeader>
                                   <CourseSidebar course={courseWithLearningItems} activeItem={activeItem} setActiveItem={handleSetActiveItem} enrollment={enrollmentToUse} isReviewMode={isReviewMode} />
                                </DrawerContent>
                            </Drawer>
                         ) : !isResultView && !viewingAsAdmin ? (
                            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>{sidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}</Button>
                         ) : null}
                         {!isResultView && !isReviewMode && (
                             <div className="w-full max-w-sm">
                               <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
                                   <span>Progres Kursus</span>
                                   <span>{progress}%</span>
                               </div>
                               <Progress value={progress} className="h-2" />
                             </div>
                         )}
                    </div>
                    <div className="flex items-center gap-2">
                        {viewingAsAdmin ? (
                            <Button variant="outline" onClick={() => router.push('/lms/admin/reports')}>
                                Kembali ke Laporan
                            </Button>
                        ) : (
                             <Button variant="outline" onClick={() => router.back()}>
                                Kembali
                            </Button>
                        )}
                    </div>
                </header>
                
                <main className="flex-1 h-full overflow-y-auto">
                    <MainContent />
                </main>
            </div>
            
            {activeQuiz && enrollmentToUse && !viewingAsAdmin && !isReviewMode && (
                <QuizTakerDialog
                    isOpen={!!activeQuiz}
                    onOpenChange={(open) => !open && setActiveQuiz(null)}
                    course={courseWithLearningItems}
                    quiz={activeQuiz}
                    quizType={activeQuiz.type!}
                    enrollment={enrollmentToUse}
                    onSubmit={handleQuizSubmit}
                />
            )}
        </div>
    );
}
