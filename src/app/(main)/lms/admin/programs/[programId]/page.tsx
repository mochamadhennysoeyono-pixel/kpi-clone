// src/app/(main)/lms/admin/programs/[programId]/page.tsx
"use client";

import * as React from 'react';
import { useParams, useRouter } from "next/navigation";
import { useMasterData } from '@/contexts/master-data-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Workflow, BookOpenCheck, FileQuestion, Calendar, Edit, Clock, Users, Briefcase, GitFork, User } from 'lucide-react';
import type { ProgramActivity, LearningProgram, CourseTargetAudience } from '@/types';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

const getActivityIcon = (type: ProgramActivity['type']) => {
    switch (type) {
        case 'LMS_COURSE': return <BookOpenCheck className="h-5 w-5 text-blue-600" />;
        case 'LMS_QUIZ': return <FileQuestion className="h-5 w-5 text-purple-600" />;
        default: return <Workflow className="h-5 w-5 text-gray-500" />;
    }
}

function TargetAudienceInfo({ target, employees }: { target: CourseTargetAudience, employees: any[] }) {
    if (!target || Object.values(target).every(v => !v || v.length === 0)) {
        return <p className="text-sm text-green-600 dark:text-green-400">Untuk Semua Karyawan</p>;
    }

    const employeeNames = (target.employees || [])
        .map(id => employees.find(e => e.id === id)?.name)
        .filter(Boolean)
        .slice(0, 3) // Show max 3 names
        .join(', ');

    const remainingEmployeeCount = Math.max(0, (target.employees?.length || 0) - 3);

    return (
        <div className="flex flex-wrap items-center gap-2">
            {target.levels && target.levels.length > 0 && <Badge variant="outline"><Users className="h-3 w-3 mr-1.5"/>{target.levels.join(', ')}</Badge>}
            {target.departments && target.departments.length > 0 && <Badge variant="outline"><Briefcase className="h-3 w-3 mr-1.5"/>{target.departments.join(', ')}</Badge>}
            {target.positions && target.positions.length > 0 && <Badge variant="outline"><GitFork className="h-3 w-3 mr-1.5"/>{target.positions.join(', ')}</Badge>}
            {employeeNames && <Badge variant="outline"><User className="h-3 w-3 mr-1.5"/>{employeeNames}{remainingEmployeeCount > 0 ? ` +${remainingEmployeeCount} lainnya` : ''}</Badge>}
        </div>
    );
}

function ActivityCard({ activity }: { activity: ProgramActivity }) {
    const { courses, quizzes } = useMasterData();
    
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
        if (isNaN(date.getTime())) return null;
        return date;
    };

    const startDate = getSafeDate(activity.startDate);
    const endDate = getSafeDate(activity.endDate);

    const formattedStartDate = startDate ? format(startDate, "d MMM yyyy", { locale: localeId }) : 'N/A';
    const formattedEndDate = endDate ? format(endDate, "d MMM yyyy", { locale: localeId }) : 'N/A';

    return (
        <Card className="bg-background shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="p-4 flex flex-row items-start gap-4">
                <div className="bg-muted p-2 rounded-lg">
                    {getActivityIcon(activity.type)}
                </div>
                <div>
                    <CardTitle className="text-base">{activity.title}</CardTitle>
                    <CardDescription className="text-xs !mt-1">
                        Tipe: <Badge variant="secondary" className="text-xs">{activity.type}</Badge>
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3 text-sm">
                 <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{formattedStartDate} - {formattedEndDate}</span>
                 </div>
                 <div className="flex flex-col items-start gap-2">
                    <span className="text-muted-foreground font-medium">Sumber Daya:</span>
                    <span className="font-semibold">{resourceName}</span>
                 </div>
                 <div className="flex flex-col items-start gap-2">
                    <span className="text-muted-foreground font-medium">Kriteria Kelulusan (KKM):</span>
                    <span className="font-semibold">{activity.passingCriteria.score}%</span>
                 </div>
            </CardContent>
        </Card>
    );
}

export default function LearningProgramDetailPage() {
    const params = useParams();
    const programId = params.programId as string;
    const router = useRouter();
    const { learningPrograms, employees } = useMasterData();

    const program = React.useMemo(() => {
        return learningPrograms.find(p => p.id === programId);
    }, [programId, learningPrograms]);
    
    const handleEdit = () => {
        router.push(`/lms/admin/programs/${programId}/edit`);
    };

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
                <Button variant="ghost" onClick={() => router.push('/lms/admin/programs')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Daftar Program
                </Button>
                <Button onClick={handleEdit}>
                    <Edit className="mr-2 h-4 w-4" /> Ubah Program
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <CardTitle className="font-headline text-2xl">{program.title}</CardTitle>
                         <Badge variant={program.status === "published" ? "default" : "outline"} className="text-base">
                            {program.status === 'published' ? 'Diterbitkan' : 'Draf'}
                        </Badge>
                    </div>
                    <CardDescription>{program.description}</CardDescription>
                </CardHeader>
                 <CardContent>
                    <h3 className="text-sm font-semibold mb-2">Target Peserta</h3>
                    <TargetAudienceInfo target={program.targetAudience} employees={employees} />
                </CardContent>
            </Card>

            <div className="space-y-8">
                {program.stages.map((stage, index) => (
                    <div key={stage.id || index} className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 bg-primary text-primary-foreground h-8 w-8 rounded-full flex items-center justify-center font-bold">{index + 1}</div>
                            <h3 className="text-xl font-semibold">{stage.title}</h3>
                        </div>
                        <div className="pl-11 relative">
                            {/* Vertical line connecting activities */}
                             <div className="absolute left-[37px] top-4 bottom-4 w-0.5 bg-border -z-10"></div>
                             <div className="space-y-4">
                                {stage.activities.map((activity, actIndex) => (
                                    <ActivityCard key={activity.id || actIndex} activity={activity} />
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
