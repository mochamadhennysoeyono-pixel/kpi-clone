
// src/app/(main)/lms/user/course/[courseId]/page.tsx
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
  HelpCircle,
  GraduationCap,
} from "lucide-react";
import type { Course, LmsModule, LmsTopic, LmsQuiz, Enrollment, Employee } from "@/types";
import { enrollmentWithMethods } from "@/types";
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
import { VideoPlayer } from "@/components/lms/video-player";
import { toast } from "@/hooks/use-toast";


const TopicContent = React.memo(({ topic }: { topic: LmsTopic }) => {
    const { youtubeVideoId, textContent, isExternalLink, embedUrl } = React.useMemo(() => {
        const getYoutubeVideoId = (url: string): string | null => {
            if (!url) return null;
            try {
                if (url.includes('youtube.com/watch')) {
                    const videoId = new URL(url).searchParams.get('v');
                    return videoId;
                } else if (url.includes('youtu.be/')) {
                    const videoId = url.split('youtu.be/')[1].split('?')[0];
                    return videoId;
                }
            } catch (e) {
                return null;
            }
            return null;
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
        let finalEmbedUrl: string | null = null;
        let isExtLink = false;
        let videoId: string | null = null;
        
        if (topic.contentType === 'video') {
            videoId = getYoutubeVideoId(safeContent);
        } else if (topic.contentType === 'link') {
            const googleUrl = getGoogleEmbedUrl(safeContent);
            if (googleUrl && (googleUrl.includes('/embed') || googleUrl.includes('/preview'))) {
                finalEmbedUrl = googleUrl;
            } else {
                isExtLink = true;
            }
        }
        
        return { youtubeVideoId: videoId, textContent: safeContent, isExternalLink: isExtLink, embedUrl: finalEmbedUrl };
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
            {topic.description && (
                <div className="prose prose-sm max-w-none text-muted-foreground italic">
                    <p>{topic.description}</p>
                </div>
            )}
             {topic.contentType === 'video' && youtubeVideoId && (
                <VideoPlayer videoId={youtubeVideoId} hideControls={topic.hideVideoControls} />
             )}

             {topic.contentType === 'link' && !isExternalLink && embedUrl && (
                <div className="relative aspect-video">
                     <iframe
                        key={embedUrl}
                        width="100%"
                        height="100%"
                        src={embedUrl}
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
        
        if (item.type === 'module-pre-test') {
            const moduleScore = enrollment.moduleScores?.find(ms => ms.moduleId === item.moduleId);
            return moduleScore?.preTestScore !== undefined;
        }
        if (item.type === 'module-post-test') {
            const moduleScore = enrollment.moduleScores?.find(ms => ms.moduleId === item.moduleId);
            return moduleScore?.postTestScore !== undefined;
        }
        if (item.type === 'topic') {
            return !!enrollment.topicStatus?.[item.id];
        }

        // Legacy pre/post test
        if (item.type === 'pre-test') return enrollment.preTestScore !== undefined;
        if (item.type === 'post-test') return enrollment.postTestScore !== undefined;
        
        return false;
    };
    
    const isItemLocked = (item: any, index: number, allItems: any[]) => {
        if (isReviewMode || index === 0) return false;
        
        const prevItem = allItems[index - 1];
        if (!isItemCompleted(prevItem)) return true;

        if(prevItem.type === 'topic' && prevItem.quiz && !enrollment?.topicStatus?.[prevItem.id]?.quizPassed) {
            return true;
        }
        
        if (prevItem.type === 'module-post-test') {
             const moduleScore = enrollment?.moduleScores?.find(ms => ms.moduleId === prevItem.moduleId);
             const moduleDetails = course.modules.find((m: any) => m.id === prevItem.moduleId);
             const passingScore = moduleDetails?.passingScore;
             if (passingScore !== undefined && moduleScore && (moduleScore.postTestScore ?? 0) < passingScore) {
                 return true; // Lock next item if module is not passed
             }
        }
        
        return false;
    };

    return (
        <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
                <Accordion type="multiple" className="w-full space-y-2" defaultValue={course.modules.map((m: any) => m.id)}>
                    {course.learningItems.map((item: any, index: number) => {
                        if (item.type === 'module-separator') {
                            return <Separator key={`sep-${index}`} className="my-3" />;
                        }

                        const isLocked = isItemLocked(item, index, course.learningItems);
                        const isCompleted = isItemCompleted(item);
                        const isActive = activeItem?.id === item.id && activeItem?.type === item.type;
                        
                        let IconComponent;
                        if (item.type.includes('test')) {
                            IconComponent = FileQuestion;
                        } else if (item.quiz) {
                            IconComponent = Lightbulb;
                        } else {
                            IconComponent = FileText;
                        }

                        let itemKey;
                        if (item.type === 'module-pre-test' || item.type === 'module-post-test') {
                            itemKey = `${item.type}-${item.moduleId}`;
                        } else if (item.type === 'topic') {
                            itemKey = item.id;
                        } else {
                             itemKey = `${item.type}-${item.id || index}`;
                        }
                        
                        return (
                            <button
                                key={itemKey}
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
            return employees.filter(e => e.company === course.company && e.status === 'Aktif' && e.role === 'user');
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
                finalScore: status === 'completed' && enrollmentData ? enrollmentData.getFinalScore(course) : null,
                status: status,
                progress: enrollmentData?.progress ?? 0,
            };
        })
        .sort((a, b) => (b.finalScore ?? -1) - (a.finalScore ?? -1));

    }, [enrollments, course, targetedEmployees]);
    
    const myRank = leaderboard.findIndex(r => r.employeeId === currentUser.id) + 1;
    
    const { finalScore, isPassed, hasMandatoryModules } = React.useMemo(() => {
        if (!enrollment || !course) return { finalScore: 0, isPassed: false, hasMandatoryModules: false };
        const score = enrollment.getFinalScore(course);
        
        if (course.isProgram) {
            const mandatoryModules = course.modules.filter(mod => mod.passingScore !== undefined && mod.passingScore !== null);
            if (mandatoryModules.length === 0) {
                return { finalScore: score, isPassed: false, hasMandatoryModules: false };
            }
            const failedModules = mandatoryModules.filter(mod => {
                const moduleScoreData = enrollment.moduleScores?.find(ms => ms.moduleId === mod.id);
                return (moduleScoreData?.postTestScore ?? 0) < mod.passingScore!;
            });
            return { finalScore: score, isPassed: failedModules.length === 0, hasMandatoryModules: true };
        } else {
            const pScore = course.postTestPassingScore ?? 0;
            const postTest = enrollment.postTestScore ?? 0;
            if (pScore === 0 && !course.postTestQuizId) return { finalScore: score, isPassed: false, hasMandatoryModules: false };
            const passed = postTest >= pScore;
            return { finalScore: score, isPassed: passed, hasMandatoryModules: true };
        }
    }, [enrollment, course]);


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
    
    const formulaComponents = React.useMemo(() => {
        if (!course.isProgram || !enrollment.moduleScores) return null;
        return enrollment.moduleScores.map(ms => {
            const module = course.modules.find(m => m.id === ms.moduleId);
            const postTestScore = ms.postTestScore ?? 0;
            const contribution = postTestScore * ((module?.weight ?? 0) / 100);
            return {
                title: module?.title || "Modul Dihapus",
                score: postTestScore,
                weight: module?.weight ?? 0,
                contribution: parseFloat(contribution.toFixed(1))
            };
        });
    }, [course, enrollment]);

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="space-y-6">
            <div className="text-center space-y-2">
                <PartyPopper className="h-16 w-16 text-yellow-500 mx-auto" />
                <h2 className="text-2xl font-bold">Laporan Hasil Belajar</h2>
                <p className="text-muted-foreground max-w-xl mx-auto">Selamat, {currentUser.name}! Anda telah menyelesaikan kursus "{course.title}". Berikut adalah rincian pencapaian Anda.</p>
                {!hasMandatoryModules ? (
                    <Badge variant="outline">N/A</Badge>
                ) : isPassed ? (
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
        </div>
        <Dialog open={isScoreDetailOpen} onOpenChange={setIsScoreDetailOpen}>
            <DialogContent className="sm:max-w-lg flex flex-col h-full max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-primary" />
                        Rincian Perhitungan Skor Akhir
                    </DialogTitle>
                </DialogHeader>
                <ScrollArea className="flex-1 -mx-6 px-6">
                    <div className="space-y-4 py-4">
                        {course.isProgram && formulaComponents ? (
                            <>
                                <p className="text-sm text-muted-foreground">Skor akhir dihitung dari penjumlahan skor kontribusi setiap modul/bab.</p>
                                <div className="space-y-2">
                                {formulaComponents.map((item, index) => (
                                    <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                                        <div>
                                            <p className="font-semibold">{item.title}</p>
                                            <p className="text-xs text-muted-foreground">Skor Post-Test: {item.score.toFixed(1)}, Bobot: {item.weight}%</p>
                                        </div>
                                        <p className="text-lg font-bold text-blue-600">{item.contribution.toFixed(1)}</p>
                                    </div>
                                ))}
                                </div>
                                <Separator/>
                                <div className="p-4 border rounded-lg bg-primary/10 text-center">
                                    <p className="text-sm font-semibold">Formula Perhitungan</p>
                                    <p className="text-xs text-muted-foreground font-mono">{formulaComponents.map(item => item.contribution.toFixed(1)).join(' + ')}</p>
                                    <p className="text-3xl font-bold text-primary mt-1">{finalScore.toFixed(1)}</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-sm text-muted-foreground">
                                    Skor akhir dihitung berdasarkan bobot dari Pre-Test dan Post-Test untuk mengukur pertumbuhan pemahaman.
                                </p>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center p-3 border rounded-lg">
                                        <div>
                                            <p className="font-semibold">Skor Pre-Test</p>
                                            <p className="text-xs text-muted-foreground">Bobot: 30%</p>
                                        </div>
                                        <p className="text-lg font-bold">{(enrollment.preTestScore ?? 0).toFixed(1)}</p>
                                    </div>
                                     <div className="flex justify-between items-center p-3 border rounded-lg">
                                        <div>
                                            <p className="font-semibold">Skor Post-Test</p>
                                            <p className="text-xs text-muted-foreground">Bobot: 70%</p>
                                        </div>
                                        <p className="text-lg font-bold">{(enrollment.postTestScore ?? 0).toFixed(1)}</p>
                                    </div>
                                </div>
                                <Separator />
                                <div className="p-4 border rounded-lg bg-primary/10 text-center">
                                    <p className="text-sm font-semibold">Formula Perhitungan</p>
                                    <p className="text-xs text-muted-foreground font-mono">({(enrollment.postTestScore ?? 0).toFixed(1)} &times; 70%) + ({(enrollment.preTestScore ?? 0).toFixed(1)} &times; 30%)</p>
                                    <p className="text-3xl font-bold text-primary mt-2">{finalScore.toFixed(1)}</p>
                                </div>
                            </>
                        )}
                    </div>
                 </ScrollArea>
                 <DialogFooter className="mt-auto pt-4 border-t">
                    <DialogClose asChild>
                        <Button variant="outline">Tutup</Button>
                    </DialogClose>
                 </DialogFooter>
            </DialogContent>
        </Dialog>
        </div>
    );
}

export default function CoursePage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { courses, quizzes, enrollments, enrollToCourse, updateEnrollment, fetchData } = useMasterData();
    const { currentUser } = useAuth();
    const isMobile = useIsMobile();
    
    const courseId = params.courseId as string;
    const isReviewMode = searchParams.get('review') === 'true';
    const [sidebarOpen, setSidebarOpen] = React.useState(true);
    const [activeItem, setActiveItem] = React.useState<any | null>(null);
    const [activeQuiz, setActiveQuiz] = React.useState<any | null>(null);
    const [isMobileDrawerOpen, setIsMobileDrawerOpen] = React.useState(false);
    
    const [isClient, setIsClient] = React.useState(false);
    const [isResultView, setIsResultView] = React.useState(false);
    const [viewerData, setViewerData] = React.useState<{enrollment: Enrollment, employee: Employee} | null>(null);

    // Variabel progress harus di atas Hook yang memanggilnya
    const enrollmentToUse = !!viewerData ? viewerData?.enrollment : enrollments.find(e => e.courseId === courseId && e.employeeId === currentUser?.id);
    const progress = enrollmentToUse?.progress ?? 0;

    // Topic Quiz State
    const [selectedTopicOption, setSelectedTopicOption] = React.useState<string | null>(null);
    const [topicQuizSubmitted, setTopicQuizSubmitted] = React.useState(false);
    const [topicQuizCorrect, setTopicQuizCorrect] = React.useState(false);

    // --- Data Memoization ---
    const courseWithLearningItems = React.useMemo(() => {
        const baseCourse = courses.find(c => c.id === courseId);
        if (!baseCourse) return null;

        let learningItems: any[] = [];
        if (baseCourse.isProgram) {
            baseCourse.modules.forEach((module, index) => {
                if (module.preTestQuizId && module.preTestQuizId !== 'none') {
                    const quiz = quizzes.find(q => q.id === module.preTestQuizId);
                    if (quiz) learningItems.push({ ...quiz, type: 'module-pre-test', moduleId: module.id, title: `Pre-Test: ${module.title}` });
                }
                module.topics.forEach(topic => {
                    learningItems.push({ ...topic, type: 'topic', moduleId: module.id });
                });
                if (module.postTestQuizId && module.postTestQuizId !== 'none') {
                    const quiz = quizzes.find(q => q.id === module.postTestQuizId);
                    if (quiz) learningItems.push({ ...quiz, type: 'module-post-test', moduleId: module.id, title: `Post-Test: ${module.title}` });
                }
            });
        } else {
             if (baseCourse.preTestQuizId && baseCourse.preTestQuizId !== 'none') {
                const quiz = quizzes.find(q => q.id === baseCourse.preTestQuizId);
                if (quiz) learningItems.push({ ...quiz, type: 'pre-test', title: `Pre-Test: ${quiz.title}` });
            }
            baseCourse.modules.forEach(module => {
                module.topics.forEach(topic => {
                    learningItems.push({ ...topic, type: 'topic', moduleId: module.id });
                });
            });
            if (baseCourse.postTestQuizId && baseCourse.postTestQuizId !== 'none') {
                const quiz = quizzes.find(q => q.id === baseCourse.postTestQuizId);
                if (quiz) learningItems.push({ ...quiz, type: 'post-test', title: `Post-Test: ${quiz.title}` });
            }
        }
        return { ...baseCourse, learningItems };
    }, [courses, quizzes, courseId]);

    const viewingAsAdmin = !!viewerData;
    const userToDisplay = viewingAsAdmin ? viewerData?.employee : currentUser;
    const isCourseCompleted = enrollmentToUse?.status === 'completed';
    
    // --- Effects ---
     React.useEffect(() => {
        setIsClient(true);
        const resultDataString = sessionStorage.getItem('lmsResultViewerData');
        if (resultDataString) {
            try {
                const data = JSON.parse(resultDataString);
                setViewerData({ 
                    enrollment: enrollmentWithMethods(data.enrollment as Omit<Enrollment, 'getFinalScore'>),
                    employee: data.employee 
                });
                setIsResultView(true);
                sessionStorage.removeItem('lmsResultViewerData');
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
    
    const findNextItem = React.useCallback(() => {
        if (!courseWithLearningItems || !enrollmentToUse) return null;
    
        return courseWithLearningItems.learningItems.find((item) => {
            if (item.type === 'module-separator') return false;
            
            if (item.type === 'module-pre-test') {
                return enrollmentToUse.moduleScores?.find(ms => ms.moduleId === item.moduleId)?.preTestScore === undefined;
            }
            if (item.type === 'module-post-test') {
                return enrollmentToUse.moduleScores?.find(ms => ms.moduleId === item.moduleId)?.postTestScore === undefined;
            }
            if (item.type === 'topic') {
                const status = enrollmentToUse.topicStatus?.[item.id];
                return !status || (item.quiz && !status.quizPassed);
            }
            if (item.type === 'pre-test') return enrollmentToUse.preTestScore === undefined;
            if (item.type === 'post-test') return enrollmentToUse.postTestScore === undefined;
            return false;
        });
    }, [courseWithLearningItems, enrollmentToUse]);

    // Auto-navigate only on initial load OR after progress update
    const hasInitialNavigated = React.useRef(false);
    const prevEnrollmentProgress = React.useRef(progress);

    React.useEffect(() => {
        if (viewingAsAdmin || isReviewMode || isCourseCompleted || isResultView) return;
        
        if (!hasInitialNavigated.current || progress !== prevEnrollmentProgress.current) {
            const nextItem = findNextItem();
            if (nextItem) {
                handleSetActiveItem(nextItem);
            }
            hasInitialNavigated.current = true;
            prevEnrollmentProgress.current = progress;
        }
    }, [enrollmentToUse, findNextItem, viewingAsAdmin, isReviewMode, isCourseCompleted, isResultView, progress]);


    // --- Handlers ---
    const handleSetActiveItem = (item: any) => {
        if (!item) {
            setActiveItem(null);
            setActiveQuiz(null);
            return;
        }
        
        setSelectedTopicOption(null);
        setTopicQuizSubmitted(false);
        setTopicQuizCorrect(false);

        if (item.type.includes('test')) {
            setActiveItem(null);
            setActiveQuiz(item);
        } else {
            setActiveItem(item);
            setActiveQuiz(null);
            if (isMobile) setIsMobileDrawerOpen(false);
        }
    };
    
    const handleTopicComplete = async (topicId: string, quizPassed: boolean = true) => {
        if (!enrollmentToUse || !courseWithLearningItems || isReviewMode) return;
        
        const newTopicStatus = { 
            ...enrollmentToUse.topicStatus, 
            [topicId]: {
                status: 'completed' as const,
                completedAt: new Date(),
                quizPassed: quizPassed,
            }
        };
        
        const totalItemsCount = courseWithLearningItems.learningItems.length;
        const completedItemsCount = courseWithLearningItems.learningItems.filter(item => {
             if (item.id === topicId) return true;
             if (item.type === 'topic') return !!enrollmentToUse.topicStatus?.[item.id];
             if (item.type === 'module-pre-test' || item.type === 'module-post-test') {
                 const ms = enrollmentToUse.moduleScores?.find(m => m.moduleId === item.moduleId);
                 return item.type === 'module-pre-test' ? ms?.preTestScore !== undefined : ms?.postTestScore !== undefined;
             }
             if (item.type === 'pre-test') return enrollmentToUse.preTestScore !== undefined;
             if (item.type === 'post-test') return enrollmentToUse.postTestScore !== undefined;
             return false;
        }).length;

        const newProgress = Math.min(100, Math.round((completedItemsCount / totalItemsCount) * 100));
        
        await updateEnrollment(enrollmentToUse.id, { topicStatus: newTopicStatus, progress: newProgress });
        await fetchData(true);
    };

    const handleTopicQuizSubmit = () => {
        if (!activeItem?.quiz || selectedTopicOption === null) return;
        
        const isCorrect = parseInt(selectedTopicOption) === activeItem.quiz.correctAnswer;
        setTopicQuizCorrect(isCorrect);
        setTopicQuizSubmitted(true);
        
        if (isCorrect) {
            toast({ title: "Jawaban Benar!", description: "Anda dapat melanjutkan ke materi berikutnya.", className: "bg-green-600 text-white" });
        } else {
            toast({ title: "Jawaban Salah", description: "Silakan coba lagi untuk memahami materi ini.", variant: "destructive" });
        }
    };

    const handleContinueClick = () => {
        if (!activeItem || isReviewMode) return;
        handleTopicComplete(activeItem.id, true);
    };
    
    const handleQuizSubmit = React.useCallback(async (updateData: Partial<Enrollment>, quizType: string, quizId: string, moduleId?: string) => {
        if (!enrollmentToUse || isReviewMode || !courseWithLearningItems) return;
        
        const optimisticUpdate: Partial<Enrollment> = { ...updateData };
        let finishing = false;

        if (courseWithLearningItems.isProgram) {
            const lastItem = courseWithLearningItems.learningItems[courseWithLearningItems.learningItems.length - 1];
            if (quizType === 'module-post-test' && lastItem.type === 'module-post-test' && lastItem.moduleId === moduleId) {
                finishing = true;
            }
        } else {
            const lastItem = courseWithLearningItems.learningItems[courseWithLearningItems.learningItems.length - 1];
            if (quizType === 'post-test' && lastItem.type === 'post-test') {
                finishing = true;
            }
        }
        
        if (finishing) {
            optimisticUpdate.status = 'completed';
            optimisticUpdate.progress = 100;
            optimisticUpdate.completedAt = new Date();
            setIsResultView(true);
            setActiveQuiz(null);
        }
        
        await updateEnrollment(enrollmentToUse.id, optimisticUpdate);
        await fetchData(true);
        
        if (!finishing) {
            setActiveQuiz(null);
        }
    
    }, [enrollmentToUse, isReviewMode, courseWithLearningItems, updateEnrollment, fetchData]);
    
    
    // --- Render Logic ---
    if (!courseWithLearningItems || !userToDisplay || !isClient) {
        return ( 
            <div className="flex h-screen items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground animate-pulse">Memuat materi kursus...</p>
                </div>
            </div>
        );
    }

    const MainContent = () => {
        if ((isCourseCompleted && !isReviewMode) || isResultView) {
            if (enrollmentToUse) {
                return <CourseResultView course={courseWithLearningItems} enrollment={enrollmentToUse} currentUser={userToDisplay} />;
            }
            return <Card><CardContent className="p-8 text-center">Data hasil tidak ditemukan.</CardContent></Card>;
        }
        
        if (activeQuiz) {
             return null;
        }
        
        if (activeItem && activeItem.type === 'topic') {
            const hasQuiz = !!activeItem.quiz && activeItem.quiz.question;
            const isCompleted = enrollmentToUse?.topicStatus?.[activeItem.id]?.status === 'completed';

            return (
                <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
                    <div className="space-y-1">
                        <Badge variant="outline" className="mb-2">Materi Topik</Badge>
                        <h2 className="text-3xl font-bold tracking-tight">{activeItem.title}</h2>
                    </div>
                    <Separator />
                    
                    <TopicContent topic={activeItem} />

                    {hasQuiz && !isCompleted && !isReviewMode && (
                        <Card className="mt-10 border-primary/20 bg-primary/5">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <HelpCircle className="h-5 w-5 text-primary" />
                                    Cek Pemahaman
                                </CardTitle>
                                <CardDescription>Jawab pertanyaan di bawah ini untuk memastikan Anda telah memahami materi.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="font-medium">{activeItem.quiz.question}</p>
                                <RadioGroup 
                                    value={selectedTopicOption || ""} 
                                    onValueChange={setSelectedTopicOption}
                                    disabled={topicQuizSubmitted && topicQuizCorrect}
                                >
                                    {activeItem.quiz.options.map((opt: string, idx: number) => (
                                        <div key={idx} className={cn(
                                            "flex items-center space-x-3 p-3 rounded-md border transition-colors",
                                            topicQuizSubmitted && idx === activeItem.quiz.correctAnswer && "bg-green-100 border-green-500",
                                            topicQuizSubmitted && selectedTopicOption === String(idx) && idx !== activeItem.quiz.correctAnswer && "bg-red-100 border-red-500",
                                            !topicQuizSubmitted && "hover:bg-muted cursor-pointer"
                                        )}>
                                            <RadioGroupItem value={String(idx)} id={`topic-opt-${idx}`} />
                                            <Label htmlFor={`topic-opt-${idx}`} className="flex-1 cursor-pointer">{opt}</Label>
                                            {topicQuizSubmitted && idx === activeItem.quiz.correctAnswer && <CheckCircle className="h-4 w-4 text-green-600" />}
                                            {topicQuizSubmitted && selectedTopicOption === String(idx) && idx !== activeItem.quiz.correctAnswer && <X className="h-4 w-4 text-red-600" />}
                                        </div>
                                    ))}
                                </RadioGroup>
                            </CardContent>
                            <CardFooter>
                                {!topicQuizCorrect ? (
                                    <Button onClick={handleTopicQuizSubmit} disabled={!selectedTopicOption} className="w-full sm:w-auto">
                                        Periksa Jawaban
                                    </Button>
                                ) : (
                                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                                        <Badge className="bg-green-600 px-3 py-1">Lulus Cek Pemahaman</Badge>
                                        <Button onClick={handleContinueClick} className="w-full sm:w-auto">
                                            Selesaikan & Lanjutkan
                                        </Button>
                                    </div>
                                )}
                            </CardFooter>
                        </Card>
                    )}

                    {!isReviewMode && (!hasQuiz || isCompleted) && (
                      <div className="pt-8 flex justify-center border-t">
                          <Button onClick={handleContinueClick} size="lg" className="px-12 rounded-full shadow-lg hover:shadow-xl transition-all">
                             {isCompleted ? "Lanjut ke Materi Berikutnya" : "Tandai Selesai & Lanjutkan"}
                             <CheckCircle className="ml-2 h-5 w-5" />
                          </Button>
                      </div>
                    )}
                </div>
            );
        }
        
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
                <BookOpenCheck className="h-16 w-16 opacity-20" />
                <p>Pilih materi dari daftar untuk memulai pembelajaran.</p>
            </div>
        )
    }

    return (
        <div className="flex h-screen max-h-screen overflow-hidden bg-background">
             {(!isResultView && !viewingAsAdmin) && !isMobile && (
                <aside className={cn(
                    "h-full bg-muted/30 border-r transition-all duration-300 overflow-hidden",
                    sidebarOpen ? "w-80" : "w-0"
                )}>
                    <div className="p-4 border-b bg-background/50 flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-primary" />
                        <h2 className="font-semibold truncate">{courseWithLearningItems.title}</h2>
                    </div>
                    <CourseSidebar course={courseWithLearningItems} activeItem={activeItem} setActiveItem={handleSetActiveItem} enrollment={enrollmentToUse} isReviewMode={isReviewMode} />
                </aside>
            )}

            <div className="flex flex-1 flex-col min-w-0">
                <header className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-20">
                    <div className="flex items-center gap-4 flex-1">
                         {isMobile && !isResultView && !viewingAsAdmin ? (
                            <Drawer open={isMobileDrawerOpen} onOpenChange={setIsMobileDrawerOpen}>
                                <DrawerTrigger asChild><Button variant="outline" size="icon"><Menu className="h-5 w-5" /></Button></DrawerTrigger>
                                <DrawerContent className="h-[85vh]">
                                    <DrawerHeader className="border-b"><DrawerTitle className="text-left">{courseWithLearningItems.title}</DrawerTitle></DrawerHeader>
                                   <CourseSidebar course={courseWithLearningItems} activeItem={activeItem} setActiveItem={handleSetActiveItem} enrollment={enrollmentToUse} isReviewMode={isReviewMode} />
                                </DrawerContent>
                            </Drawer>
                         ) : !isResultView && !viewingAsAdmin ? (
                            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden md:flex">
                                {sidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
                            </Button>
                         ) : null}
                         
                         {!isResultView && !isReviewMode && (
                             <div className="hidden sm:flex flex-col w-full max-w-xs gap-1">
                               <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                                   <span>Progres Belajar</span>
                                   <span>{progress}%</span>
                               </div>
                               <Progress value={progress} className="h-1.5" />
                             </div>
                         )}
                    </div>

                    <div className="flex items-center gap-3">
                        {isReviewMode && <Badge variant="secondary" className="mr-2">Mode Pratinjau</Badge>}
                        {viewingAsAdmin ? (
                            <Button variant="outline" size="sm" onClick={() => router.push('/lms/admin/reports')}>
                                Kembali ke Laporan
                            </Button>
                        ) : (
                             <Button variant="ghost" size="sm" onClick={() => router.back()}>
                                Keluar Kursus
                            </Button>
                        )}
                    </div>
                </header>
                
                <main className="flex-1 overflow-y-auto scroll-smooth">
                    <MainContent />
                </main>
            </div>
            
            {activeQuiz && enrollmentToUse && !viewingAsAdmin && !isReviewMode && (
                <QuizTakerDialog
                    isOpen={!!activeQuiz}
                    onOpenChange={(open) => {
                        if (!open) {
                            setActiveQuiz(null);
                        }
                    }}
                    course={courseWithLearningItems}
                    quiz={activeQuiz}
                    quizType={activeQuiz.type!}
                    moduleId={activeQuiz.moduleId}
                    enrollment={enrollmentToUse}
                    onSubmit={handleQuizSubmit}
                />
            )}
        </div>
    );
}