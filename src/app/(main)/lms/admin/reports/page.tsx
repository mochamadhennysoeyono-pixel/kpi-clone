// src/app/(main)/lms/admin/reports/page.tsx
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useMasterData } from '@/contexts/master-data-context';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
    AreaChart as AreaChartIcon, 
    Users, 
    Trophy, 
    Percent, 
    BookOpenCheck, 
    Search, 
    Building, 
    ClipboardList,
    Eye,
    MoreHorizontal,
    RefreshCw,
    Check,
    X,
    Filter,
    ArrowRight
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { DeleteConfirmationDialog } from '@/components/master-data/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { ResponsivePage, ResponsiveToolbar } from '@/components/ui/adaptive-layout';
import { PageHeader } from '@/components/ui/page-header';
import { AdaptiveCardGrid, AdaptiveMetricCard } from '@/components/ui/adaptive-card';
import { AdaptiveTable } from '@/components/ui/adaptive-table';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export default function LmsAdminReportsPage() {
    const { currentUser, userRole } = useAuth();
    const { companies, courses, enrollments, employees, resetEnrollment } = useMasterData();
    const router = useRouter();
    const { toast } = useToast();

    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
    const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
    const [enrollmentToReset, setEnrollmentToReset] = useState<any>(null);
    const [isResetDialogOpen, setResetDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const userCompany = useMemo(() => companies.find(c => c.name === currentUser?.company), [companies, currentUser]);
    const isHoldingAdmin = useMemo(() => userRole === 'manajemen' && !!userCompany?.isHolding, [userRole, userCompany]);
    const showCompanyFilter = userRole === 'superadmin' || isHoldingAdmin;

    const manageableCompanies = useMemo(() => {
        if (userRole === 'superadmin') return companies.filter(c => c.status === 'Aktif');
        if (isHoldingAdmin && userCompany) {
            const getChildCompanies = (parentId: string): any[] => {
                const children = companies.filter(c => c.parentId === parentId);
                return [...children, ...children.flatMap(c => getChildCompanies(c.id))];
            };
            return [userCompany, ...getChildCompanies(userCompany.id)];
        }
        if (userCompany) return [userCompany];
        return [];
    }, [userRole, isHoldingAdmin, userCompany, companies]);

    useEffect(() => {
        if (!showCompanyFilter && userCompany) setSelectedCompanyId(userCompany.id);
    }, [showCompanyFilter, userCompany]);
    
    const companyCourses = useMemo(() => {
      let relevantCompanies = manageableCompanies;
      if (selectedCompanyId !== 'all') relevantCompanies = manageableCompanies.filter(c => c.id === selectedCompanyId);
      const names = new Set(relevantCompanies.map(c => c.name));
      return courses.filter(course => names.has(course.company));
    }, [courses, selectedCompanyId, manageableCompanies]);

    const reportData = useMemo(() => {
        const targetCourses = selectedCourseId === 'all' ? companyCourses : companyCourses.filter(c => c.id === selectedCourseId);
        if (targetCourses.length === 0) return { totalEnrollments: 0, completedCount: 0, completionRate: 0, averageScore: 0, targetedUsers: [] };

        const targetedEmployeeIds = new Set<string>();
        targetCourses.forEach(course => {
            const targetAudience = course.targetAudience;
            const courseCompanyEmployees = employees.filter(e => e.company === course.company && e.status === 'Aktif');
            if (!targetAudience || (!targetAudience.departments?.length && !targetAudience.positions?.length && !targetAudience.levels?.length && !targetAudience.employees?.length)) {
                courseCompanyEmployees.filter(e => e.role === 'user').forEach(e => targetedEmployeeIds.add(e.id));
                return;
            }
            const { departments, positions, levels, employees: specificEmployees } = targetAudience;
            if (specificEmployees?.length) specificEmployees.forEach(id => targetedEmployeeIds.add(id));
            else {
                 let filtered = courseCompanyEmployees;
                if (departments?.length) filtered = filtered.filter(e => departments.includes(e.department));
                if (positions?.length) filtered = filtered.filter(e => positions.includes(e.position));
                if (levels?.length) filtered = filtered.filter(e => levels.includes(e.level));
                filtered.forEach(e => targetedEmployeeIds.add(e.id));
            }
        });
        
        const targetedUsers = Array.from(targetedEmployeeIds).map(eid => {
            const employee = employees.find(e => e.id === eid);
            const enrollment = enrollments.find(e => e.employeeId === eid && targetCourses.some(c => c.id === e.courseId));
            const course = enrollment ? courses.find(c => c.id === enrollment.courseId) : targetCourses.find(c => true);
            const finalScore = enrollment?.status === 'completed' && course ? enrollment.getFinalScore(course) : 0;
            let passingStatus: 'Lulus' | 'Tidak Lulus' | 'N/A' = 'N/A';
            if (enrollment?.status === 'completed' && course) {
                if(course.isProgram) {
                    const failed = course.modules.filter(mod => (mod.passingScore != null) && (enrollment.moduleScores?.find(ms => ms.moduleId === mod.id)?.postTestScore ?? 0) < mod.passingScore!);
                    passingStatus = failed.length === 0 ? 'Lulus' : 'Tidak Lulus';
                } else if (typeof enrollment.postTestScore === 'number' && typeof course.postTestPassingScore === 'number') {
                    passingStatus = enrollment.postTestScore >= course.postTestPassingScore ? 'Lulus' : 'Tidak Lulus';
                }
            }
            return { employee, enrollment, course, status: enrollment?.status || 'not-started', progress: enrollment?.progress || 0, finalScore, passingStatus };
        }).filter(item => item.employee);
        
        const completed = targetedUsers.filter(u => u.status === 'completed');
        const totalScore = completed.reduce((sum, u) => sum + u.finalScore, 0);
        return { totalEnrollments: targetedUsers.length, completedCount: completed.length, completionRate: targetedUsers.length > 0 ? (completed.length / targetedUsers.length) * 100 : 0, averageScore: completed.length > 0 ? totalScore / completed.length : 0, targetedUsers };
    }, [selectedCourseId, companyCourses, enrollments, employees, courses]);

    const displayUsers = useMemo(() => searchTerm ? reportData.targetedUsers.filter(u => u.employee!.name.toLowerCase().includes(searchTerm.toLowerCase())) : reportData.targetedUsers, [reportData.targetedUsers, searchTerm]);

    const handleViewResult = (item: any) => {
        if (item.course?.isProgram) router.push(`/lms/admin/reports/${item.enrollment.courseId}/${item.employee.id}`);
        else { sessionStorage.setItem('lmsResultViewerData', JSON.stringify({ enrollment: item.enrollment, employee: item.employee })); router.push(`/lms/user/course/${item.enrollment.courseId}`); }
    };

    return (
        <ResponsivePage>
            <PageHeader title="Laporan & Hasil Belajar" description="Analisis tingkat kelulusan, partisipasi, dan efektivitas program pengembangan karyawan." icon={AreaChartIcon} />
            
            <ResponsiveToolbar>
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input placeholder="Cari nama peserta..." className="pl-9 h-10 border-none bg-background/50 shadow-none focus-visible:ring-primary/20" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex items-center gap-3">
                    {showCompanyFilter && (
                        <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                            <SelectTrigger className="w-full sm:w-[180px] h-10 bg-background border-none shadow-sm text-[10px] font-black uppercase"><Building size={14} className="mr-2 text-primary" /><SelectValue placeholder="Perusahaan" /></SelectTrigger>
                            <SelectContent className="z-[350]"><SelectItem value="all">Semua Klien</SelectItem>{manageableCompanies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                    )}
                    <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                        <SelectTrigger className="w-full sm:w-[220px] h-10 bg-background border-none shadow-sm text-[10px] font-black uppercase"><ClipboardList size={14} className="mr-2 text-primary" /><SelectValue placeholder="Pilih Kursus" /></SelectTrigger>
                        <SelectContent className="z-[350]"><SelectItem value="all">Seluruh Materi</SelectItem>{companyCourses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </ResponsiveToolbar>

            <AdaptiveCardGrid complexity="simple">
                <AdaptiveMetricCard title="Total Peserta" value={reportData.totalEnrollments} icon={Users} color="bg-primary/10 text-primary" />
                <AdaptiveMetricCard title="Capaian Lulus" value={`${reportData.completionRate.toFixed(1)}%`} icon={Percent} description={`${reportData.completedCount} Selesai`} color="bg-emerald-500/10 text-green-600" />
                <AdaptiveMetricCard title="Rata-rata Skor" value={reportData.averageScore.toFixed(1)} icon={Trophy} color="bg-amber-500/10 text-amber-600" />
                <AdaptiveMetricCard title="Cakupan Materi" value={selectedCourseId === 'all' ? companyCourses.length : 1} icon={BookOpenCheck} />
            </AdaptiveCardGrid>

            <div className="space-y-4 pt-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1 flex items-center gap-2"><Users size={14} className="text-primary" /> Detail Partisipasi Peserta</h3>
                <AdaptiveTable 
                    data={displayUsers}
                    keyExtractor={(u) => u.employee!.id}
                    columns={[
                        { header: "Peserta Belajar", cell: (u) => (
                            <div className="flex items-center gap-3">
                                <Avatar className="size-9 border"><AvatarFallback className="text-[10px] font-black bg-primary/10 text-primary">{u.employee!.name.substring(0,2).toUpperCase()}</AvatarFallback></Avatar>
                                <div className="min-w-0"><p className="font-bold text-slate-900 truncate">{u.employee!.name}</p><p className="text-[10px] text-muted-foreground uppercase font-black">{u.employee!.position}</p></div>
                            </div>
                        )},
                        { header: "Progres", cell: (u) => (
                            <div className="flex flex-col gap-1.5 w-full max-w-[120px]">
                                <div className="flex justify-between items-center text-[9px] font-black text-muted-foreground"><span>PROGRES</span><span>{u.progress}%</span></div>
                                <Progress value={u.progress} className="h-1" />
                            </div>
                        )},
                        { header: "Hasil Akhir", cell: (u) => <span className="text-lg font-black text-primary">{u.status === 'completed' ? u.finalScore.toFixed(1) : '-'}</span> },
                        { header: "Kelulusan", cell: (u) => (
                            u.passingStatus === 'N/A' ? <span className="text-muted-foreground opacity-30">-</span> : 
                            <Badge variant={u.passingStatus === 'Lulus' ? 'default' : 'destructive'} className={cn("text-[9px] font-black uppercase h-5", u.passingStatus === 'Lulus' ? "bg-green-600" : "")}>{u.passingStatus}</Badge>
                        )},
                        { header: "", className: "text-right", cell: (u) => (
                            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-full"><MoreHorizontal size={4} /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="z-[350]">
                                <DropdownMenuItem onClick={() => handleViewResult(u)} disabled={u.status !== 'completed'}><Eye className="size-3.5 mr-2" /> Lihat Rincian Hasil</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setEnrollmentToReset(u.enrollment); setResetDialogOpen(true); }} className="text-destructive font-bold"><RefreshCw className="size-3.5 mr-2" /> Reset Progres</DropdownMenuItem>
                            </DropdownMenuContent></DropdownMenu>
                        )}
                    ]}
                    renderMobileCard={(u) => (
                        <Card className="border-border/40 shadow-sm overflow-hidden" onClick={() => u.status === 'completed' && handleViewResult(u)}>
                            <CardContent className="p-4 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="size-10 border-2 border-primary/10"><AvatarFallback className="font-black text-xs">{u.employee!.name.substring(0,2).toUpperCase()}</AvatarFallback></Avatar>
                                        <div className="min-w-0"><h3 className="font-black text-sm truncate uppercase">{u.employee!.name}</h3><p className="text-[10px] font-bold text-muted-foreground">{u.employee!.position}</p></div>
                                    </div>
                                    <div className="text-right"><p className="text-xl font-black text-primary leading-none">{u.status === 'completed' ? u.finalScore.toFixed(1) : '-'}</p><p className="text-[8px] font-black uppercase text-muted-foreground mt-1">SKOR</p></div>
                                </div>
                                <div className="flex items-center justify-between pt-3 border-t">
                                    <div className="flex flex-col gap-1 flex-1 max-w-[150px] pr-4">
                                        <div className="flex justify-between text-[8px] font-black text-muted-foreground uppercase"><span>PROGRES</span><span>{u.progress}%</span></div>
                                        <Progress value={u.progress} className="h-1" />
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase">ANALISA <ArrowRight size={10} /></div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                />
            </div>

            <DeleteConfirmationDialog isOpen={isResetDialogOpen} onOpenChange={setResetDialogOpen} onConfirm={async () => { if(enrollmentToReset) await resetEnrollment(enrollmentToReset.id); setEnrollmentToReset(null); }} itemName="progres belajar peserta" itemType="progres kursus" />
        </ResponsivePage>
    );
}
