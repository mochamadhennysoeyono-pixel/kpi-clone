// src/app/(main)/lms/user/program/[programId]/page.tsx
"use client";

import * as React from 'react';
import { useParams, useRouter } from "next/navigation";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from '@/contexts/auth-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Workflow, BookOpenCheck, FileQuestion, Calendar, Edit, Clock, Users, Briefcase, GitFork, User, CheckCircle } from 'lucide-react';
import type { ProgramActivity, LearningProgram, Enrollment } from '@/types';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

const getActivityIcon = (type: ProgramActivity['type']) => {
    switch (type) {
        case 'LMS_COURSE': return <BookOpenCheck className="h-5 w-5 text-blue-600" />;
        case 'LMS_QUIZ': return <FileQuestion className="h-5 w-5 text-purple-600" />;
        default: return <Workflow className="h-5 w-5 text-gray-500" />;
    }
}

function ActivityCard({ activity, enrollment }: { activity: ProgramActivity, enrollment: Enrollment | undefined }) {
    const { courses, quizzes } = useMasterData();
    const router = useRouter();
    
    const resourceName = React.useMemo(() => {
        if (activity.type === 'LMS_COURSE') {
            return courses.find(c => c.id === activity.resourceId)?.title || 'Kursus tidak ditemukan';
        }
        if (activity.type === 'LMS_QUIZ') {
            return quizzes.find(q => q.id === activity.resourceId)?.title || 'Kuis tidak ditemukan';
        }
        return activity.resourceId;
    }, [activity, courses, quizzes]);

    const getSafeDate = (dateValue: any): Date | null => {
        if (!dateValue) return null;
        if (typeof dateValue.toDate === 'function') return dateValue.toDate();
        const date = new Date(dateValue);
        return isNaN(date.getTime()) ? null : date;
    };

    const startDate = getSafeDate(activity.startDate);
    const endDate = getSafeDate(activity.endDate);

    const formattedStartDate = startDate ? format(startDate, "d MMM", { locale: localeId }) : 'N/A';
    const formattedEndDate = endDate ? format(endDate, "d MMM yyyy", { locale: localeId }) : 'N/A';

    const isCompleted = React.useMemo(() => {
        if (!enrollment) return false;
        // This is a simplified check. A real implementation would need more robust logic.
        // For example, checking moduleScores for the specific module linked to this activity.
        if (activity.type === 'LMS_COURSE') {
            const module = courses.find(c => c.id === activity.resourceId)?.modules[0];
            if (!module) return false;
            const moduleScore = enrollment.moduleScores?.find(ms => ms.moduleId === module.id);
            return !!moduleScore?.postTestScore;
        }
        return false;
    }, [enrollment, activity, courses]);
    
    const handleNavigate = () => {
        if (activity.type === 'LMS_COURSE' && activity.resourceId) {
            router.push(`/lms/user/course/${activity.resourceId}`);
        }
        // TODO: Handle navigation for other activity types
    };

    return (
        <Card className="bg-background shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="p-4 flex flex-row items-start gap-4">
                <div className="bg-muted p-2 rounded-lg">
                    {getActivityIcon(activity.type)}
                </div>
                <div>
                    <CardTitle className="text-base">{activity.title}</CardTitle>
                    <CardDescription className="text-xs !mt-1">
                        Tipe: <Badge variant="secondary" className="text-xs">{activity.type.replace(/_/g, ' ')}</Badge>
                    </CardDescription>
                </div>
                 {isCompleted && (
                    <div className="ml-auto flex-shrink-0">
                         <Badge className="bg-green-600 hover:bg-green-700">
                            <CheckCircle className="h-3 w-3 mr-1" /> Selesai
                        </Badge>
                    </div>
                )}
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3 text-sm">
                 <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{formattedStartDate} - {formattedEndDate}</span>
                 </div>
                 <div className="flex flex-col items-start gap-2">
                    <span className="text-muted-foreground font-medium">Sumber Daya:</span>
                    <span className="font-semibold">{resourceName}</span>
                 </div>
                 <div className="flex items-center justify-end">
                    <Button size="sm" variant="outline" onClick={handleNavigate} disabled={!activity.resourceId || activity.type !== 'LMS_COURSE'}>
                        {isCompleted ? 'Tinjau Materi' : 'Mulai Aktivitas'}
                    </Button>
                 </div>
            </CardContent>
        </Card>
    );
}

export default function LearningProgramDetailPage() {
    const params = useParams();
    const programId = params.programId as string;
    const router = useRouter();
    const { learningPrograms, employees, enrollments } = useMasterData();
    const { currentUser } = useAuth();

    const program = React.useMemo(() => {
        return learningPrograms.find(p => p.id === programId);
    }, [programId, learningPrograms]);
    
    // Find the enrollment for the first course in the program to represent program enrollment
    const programEnrollment = React.useMemo(() => {
        if (!program || !currentUser) return undefined;
        const firstCourseActivity = program.stages.flatMap(s => s.activities).find(a => a.type === 'LMS_COURSE');
        if (!firstCourseActivity) return undefined;
        return enrollments.find(e => e.courseId === firstCourseActivity.resourceId && e.employeeId === currentUser.id);
    }, [program, currentUser, enrollments]);

    if (!program) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="ml-2">Memuat data program...</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => router.push('/lms/user/my-learnings')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Daftar Pelatihan
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <CardTitle className="font-headline text-2xl">{program.title}</CardTitle>
                         <Badge variant={program.status === "published" ? "default" : "outline"} className="text-base">
                            {program.status === 'published' ? 'Tersedia' : 'Draf'}
                        </Badge>
                    </div>
                    <CardDescription>{program.description}</CardDescription>
                </CardHeader>
            </Card>

            <div className="space-y-8">
                {program.stages.map((stage, index) => (
                    <div key={stage.id || index} className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 bg-primary text-primary-foreground h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg">{index + 1}</div>
                            <h3 className="text-xl font-semibold">{stage.title}</h3>
                        </div>
                        <div className="pl-12 relative">
                             <div className="absolute left-[39px] top-4 bottom-4 w-0.5 bg-border -z-10"></div>
                             <div className="space-y-4">
                                {stage.activities.map((activity, actIndex) => (
                                    <ActivityCard key={activity.id || actIndex} activity={activity} enrollment={programEnrollment} />
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
