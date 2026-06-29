// src/app/(main)/lms/admin/reports/[...slug]/page.tsx
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import type { Course, Enrollment, Employee } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, User, X, CheckCircle, TrendingUp, TrendingDown } from "lucide-react";

export default function LmsParticipantDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { courses, enrollments, employees, learningPrograms } = useMasterData();

    const { slug } = params;
    const [courseId, employeeId] = slug || [];

    const course = React.useMemo(() => courses.find(c => c.id === courseId), [courses, courseId]);
    const employee = React.useMemo(() => employees.find(e => e.id === employeeId), [employees, employeeId]);
    const enrollment = React.useMemo(() => enrollments.find(e => e.courseId === courseId && e.employeeId === employeeId), [enrollments, courseId, employeeId]);
    
    // Find the program this course might belong to, for this user.
    const parentProgramInfo = React.useMemo(() => {
      for (const program of learningPrograms) {
        for (const stage of program.stages) {
          const activity = stage.activities.find(act => act.resourceId === courseId);
          if (activity) {
            return { program, activity };
          }
        }
      }
      return null;
    }, [learningPrograms, courseId]);


    const { moduleScores, finalScore, finalStatus, failedModules } = React.useMemo(() => {
        if (!enrollment || !course || !course.isProgram) return { moduleScores: [], finalScore: 0, finalStatus: 'N/A', failedModules: [] };

        const scores = course.modules.map(module => {
            const moduleScoreData = enrollment.moduleScores?.find(ms => ms.moduleId === module.id);
            
            // Determine the correct passing score
            const activityPassingScore = parentProgramInfo?.activity.passingCriteria.score;
            const modulePassingScore = module.passingScore;
            const effectivePassingScore = activityPassingScore ?? modulePassingScore;

            const isMandatory = effectivePassingScore !== undefined && effectivePassingScore !== null;
            const postTestScore = moduleScoreData?.postTestScore ?? null;
            
            const status = isMandatory 
              ? ((postTestScore ?? 0) >= effectivePassingScore ? 'Lulus' : 'Tidak Lulus') 
              : 'Selesai';
            
            let growth: number | null = null;
            const preTestScore = moduleScoreData?.preTestScore ?? null;
            if (preTestScore !== null && postTestScore !== null && preTestScore > 0) {
                growth = ((postTestScore - preTestScore) / preTestScore) * 100;
            } else if (preTestScore === 0 && postTestScore > 0) {
                growth = Infinity;
            }
            
            return {
                ...module,
                preTestScore,
                postTestScore,
                growth,
                status,
                effectivePassingScore
            };
        });

        const totalWeightedScore = course.modules.reduce((acc, mod) => {
            const moduleScoreData = enrollment.moduleScores?.find(ms => ms.moduleId === mod.id);
            const weight = mod.weight ?? 0;
            const modulePostTestScore = moduleScoreData?.postTestScore ?? 0;
            return acc + (modulePostTestScore * (weight / 100));
        }, 0);
        
        const mandatoryModules = scores.filter(m => m.effectivePassingScore !== undefined && m.effectivePassingScore !== null);
        const failedMandatoryModules = mandatoryModules.filter(m => m.status === 'Tidak Lulus');

        const isEligible = failedMandatoryModules.length === 0;

        return {
            moduleScores: scores,
            finalScore: totalWeightedScore,
            finalStatus: isEligible ? 'Eligible' : 'Not Eligible',
            failedModules: failedMandatoryModules,
        };
    }, [enrollment, course, parentProgramInfo]);


    if (!course || !employee) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Data tidak ditemukan</CardTitle>
                    <CardDescription>Laporan untuk kursus atau peserta ini tidak dapat ditemukan.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
                    </Button>
                </CardContent>
            </Card>
        );
    }
    
    // --- Render detail untuk Program Pembelajaran ---
    if (course.isProgram) {
        return (
            <div className="space-y-6">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Ringkasan Program
                </Button>
                <Card>
                    <CardHeader>
                        <CardTitle>Detail Laporan: {employee.name}</CardTitle>
                        <CardDescription>Rincian performa untuk program <span className="font-semibold">{course.title}</span>.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 border rounded-lg text-center">
                            <p className="text-sm text-muted-foreground">Skor Akhir</p>
                            <p className="text-3xl font-bold text-primary">{finalScore.toFixed(1)}</p>
                        </div>
                        <div className="p-4 border rounded-lg text-center">
                            <p className="text-sm text-muted-foreground">Status Kelayakan</p>
                            {finalStatus === 'Eligible' ? (
                                <Badge className="text-lg bg-green-600 hover:bg-green-700">Eligible</Badge>
                            ) : (
                                <Badge variant="destructive" className="text-lg">Not Eligible</Badge>
                            )}
                        </div>
                        <div className="p-4 border rounded-lg text-center">
                            <p className="text-sm text-muted-foreground">Gagal di</p>
                            <p className="text-lg font-semibold truncate">{failedModules.length > 0 ? failedModules.map(m => m.title).join(', ') : '-'}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Performa per Bab (Modul)</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Bab / Modul</TableHead>
                                    <TableHead>Pre-Test</TableHead>
                                    <TableHead>Post-Test</TableHead>
                                    <TableHead>Pertumbuhan (%)</TableHead>
                                    <TableHead>KKM</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {moduleScores.map(mod => (
                                    <TableRow key={mod.id}>
                                        <TableCell className="font-medium">{mod.title}</TableCell>
                                        <TableCell>{mod.preTestScore?.toFixed(1) ?? '-'}</TableCell>
                                        <TableCell className="font-semibold">{mod.postTestScore?.toFixed(1) ?? '-'}</TableCell>
                                        <TableCell>
                                            {mod.growth === null ? (
                                                '-'
                                            ) : mod.growth === Infinity ? (
                                                <span className="font-semibold text-green-600">∞</span>
                                            ) : (
                                                <span className={`font-semibold flex items-center gap-1 ${mod.growth > 0 ? 'text-green-600' : mod.growth < 0 ? 'text-red-600' : ''}`}>
                                                    {mod.growth > 0 ? <TrendingUp className="h-4 w-4" /> : mod.growth < 0 ? <TrendingDown className="h-4 w-4"/> : null}
                                                    {mod.growth.toFixed(1)}%
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>{mod.effectivePassingScore ?? '-'}</TableCell>
                                        <TableCell>
                                            {mod.status === 'Lulus' || mod.status === 'Selesai' ? (
                                                <Badge variant="default" className="bg-green-600 hover:bg-green-700"><Check className="mr-1 h-3 w-3" /> {mod.status}</Badge>
                                            ) : (
                                                <Badge variant="destructive"><X className="mr-1 h-3 w-3" /> {mod.status}</Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // --- Render detail untuk kursus biasa (legacy) ---
    return (
        <Card>
            <CardHeader>
                <CardTitle>Laporan Belum Tersedia</CardTitle>
                <CardDescription>
                    Halaman detail laporan saat ini hanya tersedia untuk kursus dalam "Mode Program Pembelajaran".
                </CardDescription>
            </CardHeader>
             <CardContent>
                <Button onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
                </Button>
            </CardContent>
        </Card>
    );
}
