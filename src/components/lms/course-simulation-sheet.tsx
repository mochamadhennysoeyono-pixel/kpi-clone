
// src/components/lms/course-simulation-sheet.tsx
"use client";

import * as React from "react";
import { useParams, useRouter } from 'next/navigation';
import { useMasterData } from "@/contexts/master-data-context";
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
  Minimize2,
  Maximize2
} from "lucide-react";
import type { Course, LmsModule, LmsTopic, LmsQuiz, Enrollment, Employee, KboSetup } from "@/types";
import { ScrollArea } from "../ui/scroll-area";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Drawer, DrawerContent, DrawerTrigger, DrawerHeader, DrawerTitle } from "../ui/drawer";
import { Accordion } from "../ui/accordion";
import { Progress } from "../ui/progress";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Badge } from "../ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "../ui/sheet";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription
} from "../ui/card";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import { VideoPlayer } from "./video-player";


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
            } catch (error) {
                console.error("Invalid URL for YouTube parsing:", url);
                return null;
            }
            return null;
        };
        
        const getGoogleEmbedUrl = (url: string) => {
            if (!url) return null;
             if (url.includes("/file/d/")) {
                return url.replace("/view", "/preview").replace("/edit", "/preview");
              }
            if (url.includes("/document/d/") || url.includes("/presentation/d/") || url.includes("/spreadsheets/d/")) {
                return url.replace(/\/edit\?.*$/, "/embed").replace(/\/view\?.*$/, "/embed");
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


function CourseSidebar({ course, activeItem, setActiveItem, completedItems }: { course: any; activeItem: any; setActiveItem: (item: any) => void; completedItems: Set<string>; }) {
    
    const isItemCompleted = (item: any) => {
        const itemKey = `${item.type}-${item.type.includes('module') ? item.moduleId : item.id}`;
        return completedItems.has(itemKey);
    };
    
    const isItemLocked = (item: any, index: number, allItems: any[]) => {
        if (index === 0) return false; // First item is never locked
        const prevItem = allItems[index - 1];
        return !isItemCompleted(prevItem);
    };

    return (
        <div className="p-4 space-y-2">
            <Accordion type="multiple" className="w-full space-y-2" defaultValue={course.modules.map((m: any) => m.id)}>
                {course.learningItems.map((item: any, index: number) => {
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
                    
                    const itemKey = `${item.type}-${item.type.includes('module') ? item.moduleId : item.id}`;

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
    );
}

function QuizContent({ quiz, quizType, onSubmit }: { quiz: LmsQuiz; quizType: string; onSubmit: () => void }) {
  const [answers, setAnswers] = React.useState<Record<string, number>>({});
  const [loading, setLoading] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [score, setScore] = React.useState(0);

  const totalPoints = React.useMemo(() => quiz.questions.reduce((sum, q) => sum + q.points, 0), [quiz.questions]);

  const handleAnswerChange = (questionId: string, optionIndex: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmit = () => {
    setLoading(true);
    let calculatedScore = 0;
    quiz.questions.forEach(q => {
        if (answers[q.id] === q.correctAnswer) {
            calculatedScore += q.points;
        }
    });
    const finalPercentageScore = totalPoints > 0 ? (calculatedScore / totalPoints) * 100 : 0;
    setScore(parseFloat(finalPercentageScore.toFixed(1)));
    setSubmitted(true);
    setLoading(false);
  };
  
   const handleCloseOrContinue = () => {
        if (onSubmit) {
            onSubmit();
        }
        // Reset state for next use
        setAnswers({});
        setSubmitted(false);
        setScore(0);
    };

  const isPassed = score >= (quiz.passingScore || 80);

  return (
    <Card className="h-full w-full flex flex-col shadow-none border-0 bg-transparent">
        <CardHeader>
            <CardTitle className="text-2xl font-bold tracking-tight">
                {quiz.title}
            </CardTitle>
             <CardDescription>
                 {quizType.includes('pre')
                 ? "Kerjakan pre-test ini untuk mengukur pemahaman awal Anda."
                 : "Selesaikan post-test ini untuk menyelesaikan kursus."}
            </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 py-0 min-h-0">
            <ScrollArea className="h-full pr-6 -mr-6">
                <div className="space-y-6">
                    {!submitted ? (
                        quiz.questions.map((q, qIndex) => (
                            <div key={q.id} className="p-4 border rounded-lg space-y-3 bg-background">
                                <p className="font-semibold text-sm">
                                    {qIndex + 1}. {q.question}
                                </p>
                                <RadioGroup onValueChange={(value) => handleAnswerChange(q.id, parseInt(value))}>
                                    {q.options.map((option, oIndex) => (
                                    <div key={oIndex} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted">
                                        <RadioGroupItem value={String(oIndex)} id={`q${qIndex}-opt${oIndex}`} />
                                        <Label htmlFor={`q${qIndex}-opt${oIndex}`} className="font-normal cursor-pointer">
                                        {option}
                                        </Label>
                                    </div>
                                    ))}
                                </RadioGroup>
                            </div>
                        ))
                    ) : (
                        <div className="py-4 flex flex-col items-center justify-center text-center">
                            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 ${isPassed ? 'bg-green-100' : 'bg-red-100'}`}>
                                {isPassed ? <Check className="h-12 w-12 text-green-600" /> : <X className="h-12 w-12 text-red-600" />}
                            </div>
                            <h3 className="text-xl font-bold">{isPassed ? 'Simulasi Lulus!' : 'Simulasi Gagal'}</h3>
                            <p className="text-muted-foreground">Skor Anda (Simulasi)</p>
                            <p className="text-5xl font-bold my-2">{score}</p>
                            <div className="w-full max-w-sm mx-auto my-4">
                                <Progress value={score} className="h-3" />
                                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                    <span>0</span>
                                    <span>Skor Kelulusan: {quiz.passingScore}</span>
                                    <span>100</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </CardContent>
         <CardFooter className="pt-6">
            {!submitted ? (
                <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading || Object.keys(answers).length !== quiz.questions.length}
                    className="w-full sm:w-auto"
                >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Selesaikan & Kirim Jawaban
                </Button>
            ) : (
                 <Button onClick={handleCloseOrContinue} className="w-full sm:w-auto">
                    Lanjutkan Simulasi
                </Button>
            )}
        </CardFooter>
    </Card>
  )
}

function TopicQuizSimulation({ topic, onCorrect, onIncorrect, onRetry }: { topic: LmsTopic, onCorrect: () => void, onIncorrect: () => void, onRetry: () => void }) {
    const [selectedAnswer, setSelectedAnswer] = React.useState<number | null>(null);
    const [feedback, setFeedback] = React.useState<'correct' | 'incorrect' | null>(null);
    const quiz = topic.quiz;

    if (!quiz) return null;

    const handleSubmit = () => {
        if (selectedAnswer === quiz.correctAnswer) {
            setFeedback('correct');
        } else {
            setFeedback('incorrect');
        }
    };
    
    return (
        <Card className="h-full w-full flex flex-col shadow-none border-0 bg-transparent">
            <CardHeader>
                <CardTitle className="text-2xl font-bold tracking-tight">Kita cek pemahaman dulu yuk</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                {!feedback ? (
                    <div className="space-y-4">
                        <p className="font-semibold">{quiz.question}</p>
                        <RadioGroup
                            onValueChange={(value) => setSelectedAnswer(parseInt(value))}
                        >
                            {quiz.options.map((option, index) => (
                            <div key={index} className="flex items-center space-x-2 p-2 rounded-md">
                                <RadioGroupItem value={String(index)} id={`topic-q-opt-${index}`} />
                                <Label htmlFor={`topic-q-opt-${index}`} className="font-normal cursor-pointer">
                                {option}
                                </Label>
                            </div>
                            ))}
                        </RadioGroup>
                    </div>
                ) : feedback === 'correct' ? (
                    <div className="text-center py-4 space-y-3 flex flex-col items-center">
                        <PartyPopper className="h-12 w-12 text-yellow-500" />
                        <h3 className="font-bold text-lg">yeeey kamu benar</h3>
                    </div>
                ) : (
                    <div className="text-center py-4 space-y-3 flex flex-col items-center">
                        <Angry className="h-12 w-12 text-destructive" />
                        <h3 className="font-bold text-lg text-destructive">yaaaah kamu salah deh</h3>
                    </div>
                )}
            </CardContent>
            <CardFooter className="pt-6">
                {!feedback ? (
                    <Button onClick={handleSubmit} disabled={selectedAnswer === null}>
                        Periksa Jawaban
                    </Button>
                ) : feedback === 'correct' ? (
                    <Button onClick={onCorrect}>Lanjutkan</Button>
                ) : (
                    <div className="flex gap-2">
                        <Button onClick={onIncorrect}>Lanjutkan Saja</Button>
                        <Button onClick={onRetry} variant="outline">Ulang Topik Materi</Button>
                    </div>
                )}
            </CardFooter>
        </Card>
    );
}

interface CourseSimulationSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  course?: Course | null;
}

export function CourseSimulationSheet({ isOpen, onOpenChange, course }: CourseSimulationSheetProps) {
    const { quizzes } = useMasterData();
    const isMobile = useIsMobile();
    const [sidebarOpen, setSidebarOpen] = React.useState(!isMobile);
    const [activeItem, setActiveItem] = React.useState<any | null>(null);
    const [isTopicQuizMode, setIsTopicQuizMode] = React.useState(false);
    const [isMobileDrawerOpen, setIsMobileDrawerOpen] = React.useState(false);
    const [completedItems, setCompletedItems] = React.useState<Set<string>>(new Set());
    const [progress, setProgress] = React.useState(0);
    const [isCourseFinished, setIsCourseFinished] = React.useState(false);

    const courseWithLearningItems = React.useMemo(() => {
        if (!course) return null;
        let learningItems: any[] = [];
        if (course.isProgram) {
            course.modules.forEach((module, index) => {
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
             if (course.preTestQuizId && course.preTestQuizId !== 'none') {
                const quiz = quizzes.find(q => q.id === course.preTestQuizId);
                if (quiz) learningItems.push({ ...quiz, type: 'pre-test', title: `Pre-Test: ${quiz.title}` });
            }
            course.modules.forEach(module => {
                module.topics.forEach(topic => {
                    learningItems.push({ ...topic, type: 'topic', moduleId: module.id });
                });
            });
            if (course.postTestQuizId && course.postTestQuizId !== 'none') {
                const quiz = quizzes.find(q => q.id === course.postTestQuizId);
                if (quiz) learningItems.push({ ...quiz, type: 'post-test', title: `Post-Test: ${quiz.title}` });
            }
        }
        return { ...course, learningItems };
    }, [course, quizzes]);

    React.useEffect(() => {
        if (isOpen && courseWithLearningItems) {
            setCompletedItems(new Set());
            setProgress(0);
            setIsCourseFinished(false);
            setIsTopicQuizMode(false);
            
            const firstItem = courseWithLearningItems.learningItems[0];
            if (firstItem) {
                handleSetActiveItem(firstItem);
            }
        }
    }, [isOpen, courseWithLearningItems]);

    React.useEffect(() => {
        if (courseWithLearningItems && courseWithLearningItems.learningItems.length > 0) {
            const newProgress = Math.round((completedItems.size / courseWithLearningItems.learningItems.length) * 100);
            setProgress(newProgress);
        } else {
            setProgress(0);
        }
    }, [completedItems, courseWithLearningItems]);
    
    const handleItemCompletion = (item: any) => {
        const itemKey = `${item.type}-${item.type.includes('module') ? item.moduleId : item.id}`;
        setCompletedItems(prev => new Set(prev).add(itemKey));

        const currentIndex = courseWithLearningItems!.learningItems.findIndex(i => {
            const currentItemKey = `${i.type}-${i.type.includes('module') ? i.moduleId : i.id}`;
            return currentItemKey === itemKey;
        });
        
        if (currentIndex !== -1 && currentIndex + 1 < courseWithLearningItems!.learningItems.length) {
            const nextItem = courseWithLearningItems!.learningItems[currentIndex + 1];
            handleSetActiveItem(nextItem);
        } else {
            setIsCourseFinished(true);
            setActiveItem(null);
        }
        setIsTopicQuizMode(false);
    };
    
    const handleSetActiveItem = (item: any) => {
        if (!item) return;
        setIsTopicQuizMode(false);
        setActiveItem(item);
        if (isMobile) setIsMobileDrawerOpen(false);
    };
    
    const handleContinueClick = () => {
        if (!activeItem) return;
        if (activeItem.quiz) {
            setIsTopicQuizMode(true);
        } else {
            handleItemCompletion(activeItem);
        }
    };

    const handleRetryTopic = () => {
        setIsTopicQuizMode(false);
    };

    if (!isOpen || !course || !courseWithLearningItems) return null;
    
    const activeItemFromList = activeItem;

    const MainContent = () => {
        if (isCourseFinished) {
            return (
                <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                    <BookOpenCheck className="h-16 w-16 text-green-500 mb-4" />
                    <h2 className="text-2xl font-bold">Simulasi Selesai</h2>
                    <p className="text-muted-foreground">Anda telah menyelesaikan semua materi dalam simulasi ini.</p>
                </div>
            );
        }

        if (!activeItem) {
            return (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>Pilih materi untuk memulai simulasi.</p>
                </div>
            )
        }

        if (activeItem.type.includes('test')) {
            return <QuizContent quiz={activeItem} quizType={activeItem.type} onSubmit={() => handleItemCompletion(activeItem)} />;
        }
       
        if (isTopicQuizMode) {
            return <TopicQuizSimulation 
                topic={activeItem} 
                onCorrect={() => handleItemCompletion(activeItem)}
                onIncorrect={() => handleItemCompletion(activeItem)}
                onRetry={handleRetryTopic}
            />;
        }
        
        if (activeItem.type === 'topic') {
            return (
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold tracking-tight">{activeItem.title}</h2>
                    <Separator />
                    <TopicContent topic={activeItem} />
                    <div className="pt-4">
                        <Button onClick={handleContinueClick}>Tandai Selesai & Lanjutkan</Button>
                    </div>
                </div>
            );
        }
        
        return null;
    }

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent 
                className="p-0 flex flex-col h-full w-full sm:max-w-full"
                side="right"
            >
                <SheetHeader className="p-4 border-b flex-row items-center justify-between">
                    <div>
                        <SheetTitle>Simulasi Kursus: {course.title}</SheetTitle>
                        <SheetDescription>Pratinjau pengalaman belajar dari sudut pandang karyawan.</SheetDescription>
                    </div>
                    <SheetClose asChild>
                        <Button variant="ghost" size="icon"><X className="h-5 w-5" /></Button>
                    </SheetClose>
                </SheetHeader>
                <div className="flex flex-1 min-h-0">
                    {!isMobile && (
                        <aside className={cn(
                            "h-full bg-muted/50 border-r transition-all duration-300 overflow-y-auto",
                            sidebarOpen ? "w-full md:w-80" : "w-0"
                        )}>
                            <CourseSidebar course={courseWithLearningItems} activeItem={activeItemFromList} setActiveItem={handleSetActiveItem} completedItems={completedItems} />
                        </aside>
                    )}
                    <main className="flex-1 h-full">
                        <ScrollArea className="h-full">
                            <div className="p-4 md:p-8">
                                <MainContent />
                            </div>
                        </ScrollArea>
                    </main>
                </div>
            </SheetContent>
        </Sheet>
    );
}
