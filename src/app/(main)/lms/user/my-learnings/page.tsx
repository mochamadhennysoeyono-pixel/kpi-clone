// src/app/(main)/lms/user/my-learnings/page.tsx
"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from '@/contexts/auth-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { BookUser, CirclePlay, Award, BookUp, RefreshCw, Workflow } from "lucide-react";
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default function LmsUserMyLearningsPage() {
    const { courses, enrollments, learningPrograms } = useMasterData();
    const { currentUser } = useAuth();

    const { myCourses, myPrograms } = useMemo(() => {
        if (!currentUser || !courses || !learningPrograms) return { myCourses: [], myPrograms: [] };

        const targetedCourseIds = new Set<string>();
        const targetedProgramIds = new Set<string>();

        // Find targeted programs
        learningPrograms.forEach(program => {
            if (program.status !== 'published') return;

            const userCompany = currentUser.company;
            if (program.company !== userCompany && program.company !== 'Global') return;

            const { departments, positions, levels, employees: specificEmployees } = program.targetAudience;

            if (!departments?.length && !positions?.length && !levels?.length && !specificEmployees?.length) {
                if (currentUser.role === 'user') targetedProgramIds.add(program.id!);
                return;
            }

            if (specificEmployees?.includes(currentUser.id)) {
                targetedProgramIds.add(program.id!);
                return;
            }
            
            if (!specificEmployees || specificEmployees.length === 0) {
                const departmentMatch = !departments?.length || departments.includes(currentUser.department);
                const positionMatch = !positions?.length || positions.includes(currentUser.position);
                const levelMatch = !levels?.length || levels.includes(currentUser.level);
                if(departmentMatch && positionMatch && levelMatch) targetedProgramIds.add(program.id!);
            }
        });
        
        // Find targeted standalone courses
        courses.forEach(course => {
            if (course.status !== 'published') return;

            const userCompany = currentUser.company;
            if (course.company !== userCompany && course.company !== 'Global') return;

            const { departments, positions, levels, employees: specificEmployees } = course.targetAudience;

            if (!departments?.length && !positions?.length && !levels?.length && !specificEmployees?.length) {
                 if (currentUser.role === 'user') targetedCourseIds.add(course.id);
                return;
            }
            
            if (specificEmployees?.includes(currentUser.id)) {
                targetedCourseIds.add(course.id);
                return;
            }

            if (!specificEmployees || specificEmployees.length === 0) {
                const departmentMatch = !departments?.length || departments.includes(currentUser.department);
                const positionMatch = !positions?.length || positions.includes(currentUser.position);
                const levelMatch = !levels?.length || levels.includes(currentUser.level);
                if(departmentMatch && positionMatch && levelMatch) targetedCourseIds.add(course.id);
            }
        });

        const mappedCourses = Array.from(targetedCourseIds).map(courseId => {
            const course = courses.find(c => c.id === courseId)!;
            const enrollment = enrollments.find(e => e.courseId === courseId && e.employeeId === currentUser.id);
            return {
                status: enrollment?.status || 'not-started',
                progress: enrollment?.progress || 0,
                courseDetails: course,
                courseId: course.id,
            };
        });

        const mappedPrograms = Array.from(targetedProgramIds).map(programId => {
            const program = learningPrograms.find(p => p.id === programId)!;
            // TODO: Calculate program progress based on its activities and user's enrollments
            return {
                programDetails: program,
                programId: program.id,
                progress: 0, // Placeholder
            };
        });

        return { myCourses: mappedCourses, myPrograms: mappedPrograms };
    }, [courses, enrollments, currentUser, learningPrograms]);

    const getStatusBadge = (status: 'not-started' | 'in-progress' | 'completed') => {
        switch(status) {
            case 'completed': return <Badge variant="default">Selesai</Badge>;
            case 'in-progress': return <Badge variant="secondary">Berjalan</Badge>;
            default: return <Badge variant="outline">Belum Dimulai</Badge>;
        }
    }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline text-2xl">
            <BookUser />
            Area Pelatihan Saya
          </CardTitle>
          <CardDescription>
            Lihat progres pelatihan yang sedang berjalan dan akses sertifikat yang telah Anda peroleh.
          </CardDescription>
        </CardHeader>
      </Card>
      
      {/* Learning Programs Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
            <Workflow className="text-primary"/>
            Program Pembelajaran Saya
        </h2>
        {myPrograms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myPrograms.map(program => (
                    <Card key={program.programId} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <CardTitle className="text-base font-semibold">{program.programDetails.title}</CardTitle>
                            <p className="text-xs text-muted-foreground">{program.programDetails.stages.length} Tahapan</p>
                        </CardHeader>
                         <CardContent className="flex-grow">
                            <p className="text-sm text-muted-foreground line-clamp-3">{program.programDetails.description}</p>
                        </CardContent>
                        <CardFooter>
                            <Button asChild className="w-full">
                                <Link href={`/lms/user/program/${program.programId}`}>
                                    Lihat Journey
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        ) : (
            <Card>
                <CardContent className="p-10 text-center text-muted-foreground">
                    Anda tidak terdaftar dalam program pembelajaran apa pun saat ini.
                </CardContent>
            </Card>
        )}
      </section>

      <Separator />

      {/* Individual Courses Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
            <BookUp className="text-primary"/>
            Kursus Individual Saya
        </h2>
         {myCourses.length > 0 ? (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myCourses.map(item => {
              const isCompleted = item.status === 'completed';
              return (
                  <Card key={item.courseId} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow">
                     {item.courseDetails?.thumbnailUrl && (
                       <div className="relative aspect-video w-full">
                         <Image src={item.courseDetails.thumbnailUrl} alt={item.courseDetails.title} fill className="object-cover" />
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="text-base font-semibold">{item.courseDetails?.title}</CardTitle>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {getStatusBadge(item.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-2">
                      <p className="text-xs text-muted-foreground">Progres</p>
                      <div className="flex items-center gap-2">
                          <Progress value={item.progress} className="h-2" />
                          <span className="text-xs font-semibold">{item.progress}%</span>
                      </div>
                    </CardContent>
                    <CardFooter className="flex-col sm:flex-row gap-2">
                      {isCompleted ? (
                          <>
                              <Button asChild className="w-full" variant="secondary">
                                  <Link href={`/lms/user/course/${item.courseId}`}>
                                      <Award className="mr-2 h-4 w-4" /> Lihat Hasil
                                  </Link>
                              </Button>
                              <Button asChild className="w-full" variant="outline">
                                  <Link href={`/lms/user/course/${item.courseId}?review=true`}>
                                      <RefreshCw className="mr-2 h-4 w-4" /> Akses Kembali
                                  </Link>
                              </Button>
                          </>
                      ) : (
                           <Button asChild className="w-full">
                              <Link href={`/lms/user/course/${item.courseId}`}>
                                  {item.status === 'not-started' ? <CirclePlay className="mr-2 h-4 w-4" /> : <BookUp className="mr-2 h-4 w-4" />}
                                  {item.status === 'not-started' ? 'Mulai Belajar' : 'Lanjutkan Belajar'}
                              </Link>
                          </Button>
                      )}
                    </CardFooter>
                  </Card>
              )
            })}
          </div>
         ) : (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
                Anda tidak ditugaskan kursus individual apa pun saat ini.
            </CardContent>
          </Card>
         )}
      </section>
    </div>
  );
}
