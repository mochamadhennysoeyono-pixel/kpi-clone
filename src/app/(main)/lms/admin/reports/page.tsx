// src/app/(main)/lms/admin/reports/page.tsx
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { AreaChart, BookOpenCheck, CheckCircle, Percent, Users, User, Trophy, BarChart, Eye, MoreHorizontal, RefreshCw, Trash2, Check, X } from "lucide-react";
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';
import type { Company, Course, Enrollment, Employee } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import StatCard from '@/components/dashboard/stat-card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { DeleteConfirmationDialog } from '@/components/master-data/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';

export default function LmsAdminReportsPage() {
    const { currentUser, userRole } = useAuth();
    const { companies, courses, enrollments, employees, resetEnrollment } = useMasterData();
    const router = useRouter();
    const { toast } = useToast();

    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
    const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
    const [enrollmentToReset, setEnrollmentToReset] = useState<Enrollment | null>(null);
    const [isResetDialogOpen, setResetDialogOpen] = useState(false);

    const userCompany = useMemo(() => companies.find(c => c.name === currentUser?.company), [companies, currentUser]);
    
    const manageableCompanies = useMemo(() => {
        if (userRole === 'superadmin') return companies.filter(c => c.status === 'Aktif');
        if (userRole === 'manajemen' && userCompany?.isHolding) {
            const getChildCompanies = (parentId: string): Company[] => {
                const children = companies.filter(c => c.parentId === parentId);
                return [...children, ...children.flatMap(c => getChildCompanies(c.id))];
            };
            return [userCompany, ...getChildCompanies(userCompany.id)];
        }
        if (userCompany) return [userCompany];
        return [];
    }, [userRole, userCompany, companies]);

    const showCompanyFilter = userRole === 'superadmin' || (userRole === 'manajemen' && !!userCompany?.isHolding);

    useEffect(() => {
        if (!showCompanyFilter && userCompany) {
            setSelectedCompanyId(userCompany.id);
        }
    }, [showCompanyFilter, userCompany]);
    
    const companyCourses = useMemo(() => {
      let relevantCompanies = manageableCompanies;
      if (selectedCompanyId !== 'all') {
          relevantCompanies = manageableCompanies.filter(c => c.id === selectedCompanyId);
      }
      const relevantCompanyNames = new Set(relevantCompanies.map(c => c.name));
      return courses.filter(course => relevantCompanyNames.has(course.company));
    }, [courses, selectedCompanyId, manageableCompanies]);

    useEffect(() => {
        if(companyCourses.length > 0) {
            setSelectedCourseId('all');
        }
    }, [selectedCompanyId, companyCourses]);


    const reportData = useMemo(() => {
        const targetCourses = selectedCourseId === 'all'
            ? companyCourses
            : companyCourses.filter(c => c.id === selectedCourseId);
        
        if (targetCourses.length === 0) {
            return { totalEnrollments: 0, completedCount: 0, completionRate: 0, averageScore: 0, targetedUsers: [] };
        }

        const targetedEmployeeIds = new Set<string>();

        targetCourses.forEach(course => {
            const targetAudience = course.targetAudience;

            // Base employees to filter from
            const courseCompanyEmployees = employees.filter(e => e.company === course.company && e.status === 'Aktif');

            // For "Everyone" - only target 'user' role
            if (!targetAudience || (!targetAudience.departments?.length && !targetAudience.positions?.length && !targetAudience.levels?.length && !targetAudience.employees?.length)) {
                courseCompanyEmployees.filter(e => e.role === 'user').forEach(e => targetedEmployeeIds.add(e.id));
                return;
            }
            
            const { departments, positions, levels, employees: specificEmployees } = targetAudience;

            if (specificEmployees?.length) {
                specificEmployees.forEach(id => targetedEmployeeIds.add(id));
            } else {
                 let filteredEmployees = courseCompanyEmployees;
                if (departments?.length) filteredEmployees = filteredEmployees.filter(e => departments.includes(e.department));
                if (positions?.length) filteredEmployees = filteredEmployees.filter(e => positions.includes(e.position));
                if (levels?.length) filteredEmployees = filteredEmployees.filter(e => levels.includes(e.level));
                filteredEmployees.forEach(e => targetedEmployeeIds.add(e.id));
            }
        });
        
        const targetedUsers = Array.from(targetedEmployeeIds).map(employeeId => {
            const employee = employees.find(e => e.id === employeeId);
            const enrollment = enrollments.find(e => e.employeeId === employeeId && targetCourses.some(c => c.id === e.courseId));
            const course = enrollment ? courses.find(c => c.id === enrollment.courseId) : targetCourses.find(c => {
                 if (!c.targetAudience) return true; // For all
                 if (c.targetAudience.employees?.includes(employeeId)) return true;
                 if (!c.targetAudience.employees?.length) {
                     const deptMatch = !c.targetAudience.departments?.length || c.targetAudience.departments.includes(employee!.department);
                     const posMatch = !c.targetAudience.positions?.length || c.targetAudience.positions.includes(employee!.position);
                     const levelMatch = !c.targetAudience.levels?.length || c.targetAudience.levels.includes(employee!.level);
                     return deptMatch && posMatch && levelMatch;
                 }
                 return false;
            });

            const finalScore = enrollment?.status === 'completed' && course ? enrollment.getFinalScore(course) : 0;
            
            let passingStatus: 'Lulus' | 'Tidak Lulus' | 'N/A' = 'N/A';
            if (enrollment?.status === 'completed' && course) {
                if(course.isProgram) {
                    const failedModules = course.modules.filter(mod => {
                        const isMandatory = mod.passingScore !== undefined && mod.passingScore !== null;
                        if (!isMandatory) return false;
                        const moduleScoreData = enrollment.moduleScores?.find(ms => ms.moduleId === mod.id);
                        return (moduleScoreData?.postTestScore ?? 0) < mod.passingScore!;
                    });
                    passingStatus = failedModules.length === 0 ? 'Lulus' : 'Tidak Lulus';
                } else {
                    const postTestPassingScore = course.postTestPassingScore;
                    const postTestScore = enrollment.postTestScore;
                    if (typeof postTestScore === 'number' && typeof postTestPassingScore === 'number') {
                        passingStatus = postTestScore >= postTestPassingScore ? 'Lulus' : 'Tidak Lulus';
                    }
                }
            }


            return {
                employee: employee,
                enrollment: enrollment,
                course: course,
                status: enrollment?.status || 'not-started',
                progress: enrollment?.progress || 0,
                finalScore,
                passingStatus,
            };
        }).filter(item => item.employee);
        
        const completedEnrollments = targetedUsers.filter(u => u.status === 'completed');
        const totalScore = completedEnrollments.reduce((sum, u) => sum + u.finalScore, 0);
        
        return {
            totalEnrollments: targetedUsers.length,
            completedCount: completedEnrollments.length,
            completionRate: targetedUsers.length > 0 ? (completedEnrollments.length / targetedUsers.length) * 100 : 0,
            averageScore: completedEnrollments.length > 0 ? totalScore / completedEnrollments.length : 0,
            targetedUsers,
        };

    }, [selectedCourseId, companyCourses, enrollments, employees, courses]);

    const handleViewResult = (enrollment: Enrollment, employee: Employee) => {
        const isProgram = courses.find(c => c.id === enrollment.courseId)?.isProgram;
        if (isProgram) {
            router.push(`/lms/admin/reports/${enrollment.courseId}/${employee.id}`);
        } else {
            sessionStorage.setItem('lmsResultViewerData', JSON.stringify({ enrollment, employee }));
            router.push(`/lms/user/course/${enrollment.courseId}`);
        }
    };
    
    const openResetDialog = (enrollment: Enrollment | undefined) => {
        if (enrollment) {
            setEnrollmentToReset(enrollment);
            setResetDialogOpen(true);
        } else {
            toast({ variant: 'destructive', title: 'Data Tidak Ditemukan', description: 'Tidak dapat mereset progres karena data pendaftaran tidak ditemukan.' });
        }
    };

    const handleConfirmReset = async () => {
        if (!enrollmentToReset) return;
        await resetEnrollment(enrollmentToReset.id);
        setEnrollmentToReset(null);
    };


  return (
      <>
        <div className="space-y-6">
        <Card>
            <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <AreaChart />
                Laporan LMS
            </CardTitle>
            <CardDescription>
                Analisis data kelulusan, partisipasi, dan efektivitas pelatihan.
            </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {showCompanyFilter && (
                        <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                            <SelectTrigger><SelectValue placeholder="Pilih Perusahaan" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Perusahaan</SelectItem>
                                {manageableCompanies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                    <Select value={selectedCourseId} onValueChange={setSelectedCourseId} disabled={companyCourses.length === 0}>
                        <SelectTrigger><SelectValue placeholder="Pilih Kursus" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Kursus</SelectItem>
                            {companyCourses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
                    <StatCard title="Total Peserta" value={reportData.totalEnrollments.toString()} icon={Users} description="Jumlah peserta yang ditargetkan." />
                    <StatCard title="Tingkat Penyelesaian" value={`${reportData.completionRate.toFixed(1)}%`} icon={Percent} description={`${reportData.completedCount} dari ${reportData.totalEnrollments} peserta selesai.`} />
                    <StatCard title="Rata-rata Skor" value={reportData.averageScore.toFixed(1)} icon={Trophy} description="Rata-rata skor akhir dari peserta yang lulus." />
                    <StatCard title="Jumlah Kursus" value={selectedCourseId === 'all' ? companyCourses.length.toString() : '1'} icon={BookOpenCheck} description="Jumlah kursus yang dianalisis." />
                </div>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
            <CardTitle>Detail Target Peserta</CardTitle>
            <CardDescription>
                Rincian progres dan skor untuk setiap peserta yang ditargetkan.
            </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nama Peserta</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Progres</TableHead>
                            <TableHead>Kelulusan</TableHead>
                            <TableHead className="text-right">Skor Akhir</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                    {reportData.targetedUsers.length > 0 ? (
                        reportData.targetedUsers.map(user => (
                            <TableRow key={user.employee?.id}>
                                <TableCell>
                                    <div className="font-medium">{user.employee?.name}</div>
                                    <div className="text-xs text-muted-foreground">{user.employee?.position}</div>
                                </TableCell>
                                <TableCell>
                                    {user.status === 'completed' ? <Badge>Selesai</Badge> : user.status === 'in-progress' ? <Badge variant="secondary">Berjalan</Badge> : <Badge variant="outline">Belum Mulai</Badge>}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Progress value={user.progress} className="w-24 h-2" />
                                        <span className="text-xs font-semibold">{user.progress}%</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                  {user.passingStatus === 'N/A' ? (
                                    <span>-</span>
                                  ) : user.passingStatus === 'Lulus' ? (
                                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                      <Check className="mr-1 h-3 w-3" /> Lulus
                                    </Badge>
                                  ) : (
                                    <Badge variant="destructive">
                                      <X className="mr-1 h-3 w-3" /> Tidak Lulus
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right font-semibold">{user.status === 'completed' ? user.finalScore.toFixed(1) : '-'}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            {user.status === 'completed' && user.enrollment && user.employee && (
                                                <DropdownMenuItem onClick={() => handleViewResult(user.enrollment!, user.employee!)}>
                                                    <Eye className="mr-2 h-4 w-4"/> Lihat Detail Hasil
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem onClick={() => openResetDialog(user.enrollment)}>
                                                <RefreshCw className="mr-2 h-4 w-4"/> Reset Progres
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={9} className="h-24 text-center">
                                Belum ada peserta yang ditargetkan untuk kursus ini.
                            </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        </div>
        
         <DeleteConfirmationDialog
            isOpen={isResetDialogOpen}
            onOpenChange={setResetDialogOpen}
            onConfirm={handleConfirmReset}
            itemName={`progres kursus untuk ${enrollmentToReset ? reportData.targetedUsers.find(u => u.enrollment?.id === enrollmentToReset.id)?.employee?.name : ''}`}
            itemType="progres kursus"
        />
    </>
  );
}
