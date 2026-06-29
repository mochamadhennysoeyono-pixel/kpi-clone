// src/app/(main)/okr/reports/page.tsx
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useMasterData } from '@/contexts/master-data-context';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { 
    Target, 
    Calendar, 
    ChevronLeft, 
    User as LucideUser, 
    Users as LucideUsers,
    ArrowRight, 
    TrendingUp,
    ListChecks,
    Lock as LucideLock,
    Building,
    CheckCircle2,
    CheckCircle,
    Circle,
    Clock,
    UserCheck,
    Briefcase
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { OKR, KeyResult, Company, Contributor, Milestone, ChecklistItem, Employee } from '@/types';
import { cn } from '@/lib/utils';
import React from 'react';

// Helper to safely convert dates
const safeToDate = (dateVal: any): Date | null => {
    if (!dateVal) return null;
    if (dateVal instanceof Date) return dateVal;
    if (typeof dateVal.toDate === 'function') return dateVal.toDate();
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d;
};

// Global helper for name resolution
const resolveName = (id: string | undefined, storedName: string | undefined, employees: Employee[]) => {
    if (storedName && storedName !== 'Unknown' && storedName !== 'N/A' && storedName !== '') return storedName;
    if (!id) return 'Unknown';
    const emp = employees.find(e => e.id === id);
    return emp ? emp.name : 'Unknown';
};

// Detail View Component for OKR Reports
const OkrReportDetailView = ({ okr, onBack }: { okr: OKR, onBack: () => void }) => {
    const { employees } = useMasterData();
    const startDate = safeToDate(okr.startDate);
    const endDate = safeToDate(okr.endDate);

    const getStatusVariant = (status: OKR['status']) => {
        switch (status) {
            case 'Active': return 'default';
            case 'Completed': return 'secondary';
            case 'Overdue': return 'destructive';
            default: return 'outline';
        }
    };

    // --- Logic for Individual Aggregation ---
    const individualReport = useMemo(() => {
        const userMap = new Map<string, { 
            name: string, 
            roles: Set<string>, 
            tasks: { progress: number }[] 
        }>();

        const getOrInit = (id: string, initialName?: string) => {
            if (!userMap.has(id)) {
                userMap.set(id, { 
                    name: resolveName(id, initialName, employees), 
                    roles: new Set(), 
                    tasks: [] 
                });
            }
            return userMap.get(id)!;
        };

        // 1. Add Main Owner
        const mainOwner = getOrInit(okr.ownerId, okr.ownerName);
        mainOwner.roles.add("Project Owner");

        // 2. Add KR Owners & Contributors
        okr.keyResults.forEach(kr => {
            const range = kr.targetValue - kr.startValue;
            const krProgress = range > 0 ? ((kr.currentValue - kr.startValue) / range) * 100 : (kr.currentValue >= kr.targetValue ? 100 : 0);
            const safeProgress = Math.max(0, Math.min(krProgress, 100));

            if (kr.ownershipModel === 'single_owner') {
                const owner = getOrInit(kr.ownerId || okr.ownerId, kr.ownerName);
                owner.roles.add("KR Owner");
                owner.tasks.push({ progress: safeProgress });
            } else if (kr.ownershipModel === 'split_ownership') {
                kr.contributors.forEach(c => {
                    const contrib = getOrInit(c.ownerId, c.ownerName);
                    contrib.roles.add("Kontributor");
                    const cProgress = c.targetValue > 0 ? (c.currentValue / c.targetValue) * 100 : (c.currentValue >= c.targetValue ? 100 : 0);
                    contrib.tasks.push({ progress: Math.max(0, Math.min(cProgress, 100)) });
                });
            } else if (kr.ownershipModel === 'delegated') {
                (kr.milestones || []).forEach(m => {
                    const pic = getOrInit(m.ownerId || '', m.ownerName);
                    pic.roles.add("PIC Milestone");
                    pic.tasks.push({ progress: m.completed ? 100 : 0 });
                });
                (kr.checklist || []).forEach(c => {
                    const pic = getOrInit(c.ownerId || '', c.ownerName);
                    pic.roles.add("PIC Checklist");
                    pic.tasks.push({ progress: c.completed ? 100 : 0 });
                });
            }
        });

        return Array.from(userMap.entries()).map(([id, data]) => {
            const avgProgress = data.tasks.length > 0 
                ? data.tasks.reduce((sum, t) => sum + t.progress, 0) / data.tasks.length 
                : (id === okr.ownerId ? okr.progress : 0);
            
            return {
                id,
                name: data.name,
                roles: Array.from(data.roles),
                taskCount: data.tasks.length,
                avgProgress: parseFloat(avgProgress.toFixed(1))
            };
        }).sort((a, b) => b.avgProgress - a.avgProgress);
    }, [okr, employees]);
    
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <Button variant="ghost" onClick={onBack} className="-ml-4 hover:bg-muted">
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Kembali ke Daftar Laporan
                </Button>
            </div>

            <Tabs defaultValue="global" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-6">
                    <TabsTrigger value="global">Global Project</TabsTrigger>
                    <TabsTrigger value="individual">Laporan Individu</TabsTrigger>
                </TabsList>

                <TabsContent value="global" className="space-y-6">
                    <Card className="border-l-4 border-primary shadow-lg">
                        <CardHeader>
                            <div className="flex justify-between items-start gap-4">
                                <div>
                                    <Badge variant={getStatusVariant(okr.status)} className="mb-2">
                                        {okr.status === 'Active' ? 'Sedang Berjalan' : okr.status}
                                    </Badge>
                                    <CardTitle className="font-headline text-2xl">{okr.objective}</CardTitle>
                                    <CardDescription className="pt-2 max-w-prose text-sm">{okr.description}</CardDescription>
                                </div>
                                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                    <div className="text-right">
                                        <p className="text-[10px] uppercase font-black text-muted-foreground">Capaian Progres</p>
                                        <p className="font-black text-4xl text-primary leading-tight">{(okr.progress ?? 0).toFixed(1)}%</p>
                                    </div>
                                    <div className="text-[10px] text-muted-foreground flex items-center gap-2 bg-muted px-2 py-1 rounded">
                                        <Calendar className="h-3 w-3" />
                                        <span>{startDate ? format(startDate, "d MMM yy", { locale: localeId }) : ''} - {endDate ? format(endDate, "d MMM yyyy", { locale: localeId }) : ''}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-4 mt-4">
                                <LucideUser className="h-3.5 w-3.5" />
                                <span>Owner Utama: <span className="font-bold text-foreground">{resolveName(okr.ownerId, okr.ownerName, employees)}</span></span>
                            </div>
                        </CardHeader>
                    </Card>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <ListChecks className="h-5 w-5 text-primary" />
                                Rincian Progres Key Results
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-[40%] font-bold">Key Result</TableHead>
                                        <TableHead className="font-bold">Target & Aktual</TableHead>
                                        <TableHead className="text-right font-bold">Progres</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {okr.keyResults.map(kr => {
                                        const range = kr.targetValue - kr.startValue;
                                        const progress = range > 0 ? ((kr.currentValue - kr.startValue) / range) * 100 : (kr.currentValue >= kr.targetValue ? 100 : 0);
                                        const unit = kr.unit || (kr.type === 'Percentage' ? '%' : '');
                                        const isMeasurable = kr.type === 'Numeric' || kr.type === 'Percentage';
                                        const hasSubItems = (kr.type === 'Milestone' || kr.type === 'Binary') && ((kr.milestones?.length ?? 0) > 0 || (kr.checklist?.length ?? 0) > 0);
                                        const hasContributors = kr.ownershipModel === 'split_ownership' && (kr.contributors?.length ?? 0) > 0;

                                        return (
                                            <React.Fragment key={kr.id}>
                                                <TableRow className="hover:bg-muted/5 border-b-0">
                                                    <TableCell className="py-4">
                                                        <p className="font-bold text-sm">{kr.name}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Badge variant="secondary" className="text-[10px] uppercase font-bold">{kr.type}</Badge>
                                                            <p className="text-[10px] text-muted-foreground">PIC Utama: {resolveName(kr.ownerId || okr.ownerId, kr.ownerName, employees)}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
                                                                <span className="bg-muted px-1.5 py-0.5 rounded border">Mulai: {kr.startValue}{unit}</span>
                                                                <ArrowRight className="h-3 w-3" />
                                                                <span className="bg-primary/5 text-primary px-1.5 py-0.5 rounded border border-primary/10 font-bold">Target: {kr.targetValue}{unit}</span>
                                                            </div>
                                                            <span className="font-black text-sm text-foreground">
                                                                {isMeasurable ? `Total Aktual: ${kr.currentValue.toLocaleString('id-ID')}${unit}` : `Selesai: ${kr.currentValue} dari ${kr.targetValue}`}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right py-4">
                                                        <div className="flex flex-col items-end gap-1.5">
                                                            <span className="text-sm font-black text-primary">{Math.max(0, Math.min(progress, 100)).toFixed(1)}%</span>
                                                            <Progress value={Math.max(0, Math.min(progress, 100))} className="h-1.5 w-24" />
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                                
                                                {hasSubItems && (
                                                    <TableRow className="bg-muted/20 hover:bg-muted/30 border-b">
                                                        <TableCell colSpan={3} className="py-3 px-6">
                                                            <div className="space-y-3">
                                                                <p className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5">
                                                                    <ListChecks className="h-3 w-3"/> Rincian Milestone & Penanggung Jawab
                                                                </p>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                    {(kr.milestones || kr.checklist || []).map((item: any) => (
                                                                        <div key={item.id} className="flex items-center gap-3 p-2 bg-background rounded border border-dashed border-muted-foreground/30">
                                                                            {item.completed ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" /> : <Clock className="h-4 w-4 text-muted-foreground shrink-0" />}
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className={cn("text-xs font-medium truncate", item.completed && "text-muted-foreground line-through")}>{item.text}</p>
                                                                                <p className="text-[9px] text-muted-foreground">PIC: <span className="font-bold">{resolveName(item.ownerId, item.ownerName, employees)}</span></p>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}

                                                {hasContributors && (
                                                    <TableRow className="bg-muted/20 hover:bg-muted/30 border-b">
                                                        <TableCell colSpan={3} className="py-3 px-6">
                                                            <div className="space-y-3">
                                                                <p className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5">
                                                                    <LucideUsers className="h-3 w-3"/> Rincian Kontribusi Anggota Tim
                                                                </p>
                                                                <div className="grid gap-2">
                                                                    {kr.contributors.map((c: Contributor) => {
                                                                        const cProgress = c.targetValue > 0 ? (c.currentValue / c.targetValue) * 100 : (c.currentValue >= c.targetValue ? 100 : 0);
                                                                        return (
                                                                            <div key={c.ownerId} className="flex items-center justify-between gap-4 p-2 bg-background rounded border border-dashed border-muted-foreground/30">
                                                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                                    <LucideUser className="h-3 w-3 text-muted-foreground shrink-0"/>
                                                                                    <span className="text-xs font-bold truncate">{resolveName(c.ownerId, c.ownerName, employees)}</span>
                                                                                </div>
                                                                                <div className="flex items-center gap-4 shrink-0">
                                                                                    <div className="text-right hidden sm:block">
                                                                                        <p className="text-[9px] text-muted-foreground uppercase font-medium">Aktual / Target</p>
                                                                                        <p className="text-xs font-mono">{c.currentValue.toLocaleString('id-ID')} / {c.targetValue.toLocaleString('id-ID')} {unit}</p>
                                                                                    </div>
                                                                                    <div className="w-24 space-y-1">
                                                                                        <div className="flex justify-between items-center text-[9px] font-black text-primary">
                                                                                            <span>{Math.min(cProgress, 100).toFixed(0)}%</span>
                                                                                            {cProgress >= 100 && <CheckCircle2 className="h-2.5 w-2.5 text-green-500" />}
                                                                                        </div>
                                                                                        <Progress value={Math.min(cProgress, 100)} className="h-1" />
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </React.Fragment>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="individual">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <LucideUsers className="h-5 w-5 text-primary" />
                                Matriks Kontribusi Personil
                            </CardTitle>
                            <CardDescription>Ringkasan keterlibatan dan tingkat penyelesaian tugas individu dalam project ini.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead>Nama Personil</TableHead>
                                        <TableHead>Peran</TableHead>
                                        <TableHead className="text-center">Jumlah Tugas</TableHead>
                                        <TableHead className="text-right">Rata-rata Progres</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {individualReport.map(user => (
                                        <TableRow key={user.id} className="hover:bg-muted/5">
                                            <TableCell className="font-bold">
                                                <div className="flex items-center gap-2">
                                                    <div className="size-8 rounded-full bg-muted flex items-center justify-center">
                                                        <LucideUser size={16} className="text-muted-foreground" />
                                                    </div>
                                                    {user.name}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {user.roles.map(role => (
                                                        <Badge key={role} variant={role === 'Project Owner' ? 'default' : 'outline'} className="text-[10px] h-5">
                                                            {role}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center font-mono">{user.taskCount}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="font-black text-primary">{user.avgProgress}%</span>
                                                    <Progress value={user.avgProgress} className="h-1.5 w-24" />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};


// Main Page Component
export default function OkrReportsPage() {
    const { currentUser, userRole } = useAuth();
    const { okrs, companies, employees } = useMasterData();
    const [selectedOkr, setSelectedOkr] = useState<OKR | null>(null);
    const [selectedCompany, setSelectedCompany] = useState<string>('all');

    const userCompany = useMemo(() => companies.find(c => c.name === currentUser?.company), [companies, currentUser]);
    const isHoldingAdmin = useMemo(() => userRole === 'manajemen' && !!userCompany?.isHolding, [userRole, userCompany]);
    const showCompanyFilter = userRole === 'superadmin' || isHoldingAdmin;

    const manageableCompanies = useMemo(() => {
        if (userRole === 'superadmin') return companies.filter(c => c.status === 'Aktif');
        if (isHoldingAdmin && userCompany) {
            const getDescendantCompanies = (parentId: string): Company[] => {
                const children = companies.filter(c => c.parentId === parentId);
                return children.flatMap(c => [c, ...getDescendantCompanies(c.id)]);
            };
            const all = [userCompany, ...getDescendantCompanies(userCompany.id)];
            // Deduplicate by ID to guarantee unique keys
            return Array.from(new Map(all.map(c => [c.id, c])).values());
        }
        if (userCompany) return [userCompany];
        return [];
    }, [userRole, isHoldingAdmin, userCompany, companies]);

    useEffect(() => {
        if (!showCompanyFilter && currentUser?.company) {
            setSelectedCompany(currentUser.company);
        }
    }, [showCompanyFilter, currentUser]);

    const reportOkrs = useMemo(() => {
        if (!currentUser || !okrs || !employees) return [];
        
        // 1. Initial Company Scoping
        let companyFilteredOkrs = okrs;
        if (showCompanyFilter) {
            if (selectedCompany !== 'all') {
                companyFilteredOkrs = okrs.filter(okr => okr.company === selectedCompany);
            } else {
                const manageableNames = manageableCompanies.map(c => c.name);
                companyFilteredOkrs = okrs.filter(okr => manageableNames.includes(okr.company));
            }
        } else {
            companyFilteredOkrs = okrs.filter(okr => okr.company === currentUser.company);
        }

        // 2. Role-based Visibility Scoping
        let visibleOkrs: OKR[] = [];
        if (userRole === 'superadmin' || userRole === 'manajemen') {
            visibleOkrs = companyFilteredOkrs;
        } else {
            const isManager = employees.some(e => e.reportsTo === currentUser.id);
            if (isManager) {
                const getSubordinateIdsRecursive = (managerId: string): string[] => {
                    const directReports = employees.filter(e => e.reportsTo === managerId).map(e => e.id);
                    if (directReports.length === 0) return [];
                    return [...directReports, ...directReports.flatMap(id => getSubordinateIdsRecursive(id))];
                };
                const teamIds = [currentUser.id, ...getSubordinateIdsRecursive(currentUser.id)];
                visibleOkrs = companyFilteredOkrs.filter(okr => 
                    teamIds.includes(okr.ownerId) || 
                    okr.keyResults.some(kr => 
                        (kr.ownershipModel === 'single_owner' && teamIds.includes(kr.ownerId || okr.ownerId)) ||
                        (kr.ownershipModel === 'delegated' && (kr.milestones?.some(m => teamIds.includes(m.ownerId || '')) || kr.checklist?.some(c => teamIds.includes(c.ownerId || '')))) ||
                        (kr.ownershipModel === 'split_ownership' && kr.contributors?.some(c => teamIds.includes(c.ownerId)))
                    )
                );
            } else {
                visibleOkrs = companyFilteredOkrs.filter(okr => 
                    okr.ownerId === currentUser.id ||
                    okr.keyResults.some(kr => 
                        (kr.ownershipModel === 'single_owner' && (kr.ownerId || okr.ownerId) === currentUser.id) ||
                        (kr.ownershipModel === 'delegated' && (kr.milestones?.some(m => m.ownerId === currentUser.id) || kr.checklist?.some(c => kr.ownerId === currentUser.id || c.ownerId === currentUser.id))) ||
                        (kr.ownershipModel === 'split_ownership' && kr.contributors?.some(c => c.ownerId === currentUser.id))
                    )
                );
            }
        }

        // 3. Status Filtering & Sorting
        return visibleOkrs.filter(okr => 
            (okr.status === 'Active' || okr.status === 'Completed' || okr.status === 'Overdue')
        ).sort((a,b) => {
            const statusPriority: Record<string, number> = { 'Overdue': 0, 'Active': 1, 'Completed': 2 };
            const pA = statusPriority[a.status] ?? 99;
            const pB = statusPriority[b.status] ?? 99;
            if (pA !== pB) return pA - pB;
            
            const dateA = safeToDate(a.endDate)?.getTime() || 0;
            const dateB = safeToDate(b.endDate)?.getTime() || 0;
            return dateB - dateA;
        });
    }, [okrs, currentUser, userRole, employees, selectedCompany, showCompanyFilter, manageableCompanies]);

    if (selectedOkr) {
        return <OkrReportDetailView okr={selectedOkr} onBack={() => setSelectedOkr(null)} />;
    }

    return (
        <div className="space-y-6">
            <Card className="shadow-lg border-t-4 border-primary">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <TrendingUp className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="font-headline text-2xl">Laporan Progres & Hasil Proyek</CardTitle>
                                <CardDescription>
                                    Analisis pencapaian sementara untuk project aktif dan hasil akhir untuk project yang sudah selesai.
                                </CardDescription>
                            </div>
                        </div>
                        {showCompanyFilter && (
                            <div className="flex items-center gap-2 self-start sm:self-center">
                                <LucideLock className="h-4 w-4 text-muted-foreground" />
                                <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="Filter Perusahaan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Perusahaan</SelectItem>
                                        {manageableCompanies.map(c => (
                                            <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                </CardHeader>
            </Card>

            {reportOkrs.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {reportOkrs.map(okr => {
                        const endDate = safeToDate(okr.endDate);
                        const isOverdue = okr.status === 'Overdue';
                        const isActive = okr.status === 'Active';

                        return (
                            <Card key={okr.id} className={cn(
                                "shadow-sm hover:shadow-md transition-all duration-200 border-l-4",
                                isOverdue ? "border-l-destructive" : isActive ? "border-l-blue-500" : "border-l-green-500"
                            )}>
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start gap-2">
                                        <CardTitle className="text-base font-bold line-clamp-1">{okr.objective}</CardTitle>
                                        <Badge variant={okr.status === 'Completed' ? 'secondary' : okr.status === 'Overdue' ? 'destructive' : 'default'} className="text-[10px] uppercase font-bold shrink-0">
                                            {okr.status === 'Active' ? 'Aktif' : okr.status}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
                                        <LucideUser className="h-3 w-3" />
                                        <span>Owner: {resolveName(okr.ownerId, okr.ownerName, employees)}</span>
                                        {showCompanyFilter && (
                                            <>
                                                <span className="mx-1">•</span>
                                                <Building className="h-3 w-3" />
                                                <span>{okr.company}</span>
                                            </>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="pb-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-xs font-bold">
                                            <span className="text-muted-foreground">{isActive ? 'Capaian Saat Ini' : 'Skor Akhir'}</span>
                                            <span className="text-primary text-lg">{(okr.progress ?? 0).toFixed(1)}%</span>
                                        </div>
                                        <Progress value={okr.progress ?? 0} className="h-2" />
                                    </div>
                                </CardContent>
                                <CardFooter className="flex justify-between items-center text-[10px] text-muted-foreground bg-muted/10 py-3 rounded-b-lg border-t">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-3.5 w-3.5" />
                                        <span>
                                            Tenggat: {endDate ? format(endDate, "d MMM yyyy", { locale: localeId }) : 'N/A'}
                                        </span>
                                    </div>
                                    <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold" onClick={() => setSelectedOkr(okr)}>
                                        Lihat Rincian <ArrowRight className="h-3 w-3 ml-1.5"/>
                                    </Button>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <Card className="border-dashed">
                    <CardContent className="p-16 text-center">
                        <div className="bg-muted rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                            <Target className="h-8 w-8 text-muted-foreground opacity-20" />
                        </div>
                        <p className="text-muted-foreground font-medium">
                            Belum ada project yang dapat ditampilkan dalam laporan untuk kriteria ini.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
