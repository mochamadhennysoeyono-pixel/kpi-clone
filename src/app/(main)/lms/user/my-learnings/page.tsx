// src/app/(main)/lms/user/my-learnings/page.tsx
"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from '@/contexts/auth-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { BookUser, CirclePlay, Award, BookUp, RefreshCw, Workflow, GraduationCap, ArrowRight, Clock, Star } from "lucide-react";
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ResponsivePage } from '@/components/ui/adaptive-layout';
import { PageHeader } from '@/components/ui/page-header';
import { AdaptiveCardGrid } from '@/components/ui/adaptive-card';
import { cn } from '@/lib/utils';
import { useBreakpoint } from '@/hooks/use-breakpoint';

export default function LmsUserMyLearningsPage() {
    const { courses, enrollments, learningPrograms } = useMasterData();
    const { currentUser } = useAuth();
    const { isMobile } = useBreakpoint();

    const { myCourses, myPrograms } = useMemo(() => {
        if (!currentUser || !courses || !learningPrograms) return { myCourses: [], myPrograms: [] };

        const targetedCourseIds = new Set<string>();
        const targetedProgramIds = new Set<string>();

        const checkAccess = (target: any) => {
            if (!target || Object.values(target).every(v => !v || (v as any).length === 0)) return currentUser.role === 'user';
            const { departments, positions, levels, employees: emps } = target;
            if (emps?.includes(currentUser.id)) return true;
            const deptMatch = !departments?.length || departments.includes(currentUser.department);
            const posMatch = !positions?.length || positions.includes(currentUser.position);
            const levelMatch = !levels?.length || levels.includes(currentUser.level);
            return deptMatch && posMatch && levelMatch;
        };

        learningPrograms.forEach(p => {
            if (p.status === 'published' && (p.company === currentUser.company || p.company === 'Global') && checkAccess(p.targetAudience)) {
                targetedProgramIds.add(p.id!);
            }
        });
        
        courses.forEach(c => {
            if (c.status === 'published' && (c.company === currentUser.company || c.company === 'Global') && checkAccess(c.targetAudience)) {
                targetedCourseIds.add(c.id);
            }
        });

        const mappedCourses = Array.from(targetedCourseIds).map(id => {
            const c = courses.find(item => item.id === id)!;
            const e = enrollments.find(item => item.courseId === id && item.employeeId === currentUser.id);
            return { status: e?.status || 'not-started', progress: e?.progress || 0, courseDetails: c, courseId: c.id };
        });

        const mappedPrograms = Array.from(targetedProgramIds).map(id => {
            const p = learningPrograms.find(item => item.id === id)!;
            return { programDetails: p, programId: p.id, progress: 0 };
        });

        return { myCourses: mappedCourses, myPrograms: mappedPrograms };
    }, [courses, enrollments, currentUser, learningPrograms]);

    const getStatusBadge = (status: string) => {
        switch(status) {
            case 'completed': return <Badge className="bg-green-600 border-none font-black text-[8px] h-4 uppercase">Selesai</Badge>;
            case 'in-progress': return <Badge variant="secondary" className="bg-blue-500 text-white border-none font-black text-[8px] h-4 uppercase">Aktif</Badge>;
            default: return <Badge variant="outline" className="font-black text-[8px] h-4 uppercase opacity-40">Belum Mulai</Badge>;
        }
    }

    return (
        <ResponsivePage>
            <PageHeader 
                title="Akademi Pembelajaran" 
                description="Tingkatkan kompetensi Anda melalui program terstruktur dan kursus mandiri yang telah ditugaskan."
                icon={BookUser}
            />
            
            {/* Learning Programs Section */}
            <div className="space-y-4">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1 flex items-center gap-2">
                    <Workflow className="size-4 text-primary" /> Program Pembelajaran Utama
                </h2>
                {myPrograms.length > 0 ? (
                    <AdaptiveCardGrid complexity="medium">
                        {myPrograms.map(p => (
                            <Card key={p.programId} className="flex flex-col border-none shadow-sm hover:shadow-md transition-all overflow-hidden bg-background group">
                                <CardHeader className="bg-primary/5 p-5">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="p-2 bg-background rounded-lg shadow-sm border border-primary/10 text-primary group-hover:scale-110 transition-transform">
                                            <Star size={18} />
                                        </div>
                                        <Badge variant="outline" className="text-[8px] font-black border-primary/20 text-primary uppercase h-5">{p.programDetails.stages.length} TAHAP</Badge>
                                    </div>
                                    <CardTitle className="text-sm font-black uppercase tracking-tight line-clamp-1">{p.programDetails.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="flex-grow p-5 pt-4">
                                    <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-3">{p.programDetails.description}</p>
                                </CardContent>
                                <CardFooter className="p-4 pt-0">
                                    <Button asChild className="w-full font-black uppercase text-[10px] h-10 rounded-xl shadow-md">
                                        <Link href={`/lms/user/program/${p.programId}`}>LANJUTKAN JOURNEY <ArrowRight size={14} className="ml-2" /></Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </AdaptiveCardGrid>
                ) : (
                    <Card className="border-dashed"><CardContent className="p-10 text-center text-xs text-muted-foreground font-medium italic">Anda belum memiliki penugasan program terstruktur.</CardContent></Card>
                )}
            </div>

            <Separator className="opacity-40" />

            {/* Individual Courses Section */}
            <div className="space-y-4">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1 flex items-center gap-2">
                    <GraduationCap className="size-4 text-primary" /> Katalog Kursus Mandiri
                </h2>
                {myCourses.length > 0 ? (
                    <AdaptiveCardGrid complexity="medium">
                        {myCourses.map(item => {
                            const isDone = item.status === 'completed';
                            return (
                                <Card key={item.courseId} className="flex flex-col border-border/40 shadow-sm hover:shadow-md transition-all overflow-hidden bg-background group">
                                    <div className="relative aspect-video w-full bg-slate-100 border-b">
                                        {item.courseDetails?.thumbnailUrl ? (
                                            <Image src={item.courseDetails.thumbnailUrl} alt={item.courseDetails.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center text-slate-300"><BookUp size={40} /></div>
                                        )}
                                        <div className="absolute top-3 right-3">{getStatusBadge(item.status)}</div>
                                    </div>
                                    <CardHeader className="p-4 pb-2">
                                        <CardTitle className="text-xs font-black uppercase tracking-tight text-slate-900 line-clamp-2 min-h-[32px]">{item.courseDetails?.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="px-4 py-2 flex-grow space-y-3">
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-center text-[9px] font-black uppercase text-muted-foreground">
                                                <span>Progres Belajar</span>
                                                <span className="text-primary">{item.progress}%</span>
                                            </div>
                                            <Progress value={item.progress} className="h-1" />
                                        </div>
                                    </CardContent>
                                    <CardFooter className="p-4 gap-2">
                                        {isDone ? (
                                            <>
                                                <Button asChild className="flex-1 font-black uppercase text-[9px] h-9 shadow-sm" variant="secondary">
                                                    <Link href={`/lms/user/course/${item.courseId}`}><Award size={14} className="mr-1.5" /> HASIL</Link>
                                                </Button>
                                                <Button asChild className="flex-1 font-black uppercase text-[9px] h-9" variant="outline">
                                                    <Link href={`/lms/user/course/${item.courseId}?review=true`}><RefreshCw size={12} className="mr-1.5" /> RE-AKSESS</Link>
                                                </Button>
                                            </>
                                        ) : (
                                            <Button asChild className="w-full font-black uppercase text-[9px] h-10 shadow-md rounded-xl">
                                                <Link href={`/lms/user/course/${item.courseId}`}>
                                                    {item.status === 'not-started' ? <><CirclePlay size={16} className="mr-2" /> MULAI MATERI</> : <><BookUp size={16} className="mr-2" /> LANJUTKAN</>}
                                                </Link>
                                            </Button>
                                        )}
                                    </CardFooter>
                                </Card>
                            )
                        })}
                    </AdaptiveCardGrid>
                ) : (
                    <Card className="border-dashed"><CardContent className="p-10 text-center text-xs text-muted-foreground font-medium italic">Belum ada kursus mandiri yang ditugaskan kepada Anda.</CardContent></Card>
                )}
            </div>
        </ResponsivePage>
    );
}
