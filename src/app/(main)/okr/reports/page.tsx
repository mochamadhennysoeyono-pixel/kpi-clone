
// src/app/(main)/okr/reports/page.tsx
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useMasterData } from '@/contexts/master-data-context';
import { useAuth } from '@/contexts/auth-context';
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
    Clock,
    UserCheck,
    Briefcase,
    LayoutGrid,
    Search,
    FilePieChart
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { OKR, KeyResult, Company, Contributor, Milestone, ChecklistItem, Employee } from '@/types';
import { cn } from '@/lib/utils';
import React from 'react';
import { ResponsivePage, ResponsiveToolbar } from '@/components/ui/adaptive-layout';
import { PageHeader } from '@/components/ui/page-header';
import { AdaptiveCardGrid, AdaptiveMetricCard, AdaptiveInsightCard } from '@/components/ui/adaptive-card';
import { AdaptiveTable } from '@/components/ui/adaptive-table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { DashboardNavigator } from '@/components/layout/dashboard-navigator';
import { Input } from '@/components/ui/input';

// Helper to safely convert dates
const safeToDate = (dateVal: any): Date | null => {
    if (!dateVal) return null;
    if (dateVal instanceof Date) return dateVal;
    if (typeof dateVal.toDate === 'function') return dateVal.toDate();
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d;
};

const formatSafeDate = (date: any, formatStr: string) => {
    const d = safeToDate(date);
    if (!d) return 'N/A';
    return format(d, formatStr, { locale: localeId });
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
    const { isMobile } = useBreakpoint();
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

        const mainOwner = getOrInit(okr.ownerId, okr.ownerName);
        mainOwner.roles.add("Project Owner");

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
            <Button variant="ghost" onClick={onBack} className="-ml-4 hover:bg-muted font-bold text-[10px] uppercase tracking-widest text-muted-foreground px-4">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Kembali ke Daftar Laporan
            </Button>

            <Tabs defaultValue="global" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-8 bg-muted/30 p-1 rounded-xl">
                    <TabsTrigger value="global" className="font-bold text-xs">Global Project</TabsTrigger>
                    <TabsTrigger value="individual" className="font-bold text-xs">Laporan Individu</TabsTrigger>
                </TabsList>

                <TabsContent value="global" className="space-y-8 m-0 border-none">
                    <Card className="border-l-4 border-primary shadow-lg overflow-hidden bg-background">
                        <CardContent className={isMobile ? "p-5" : "p-8"}>
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
                                <div className="space-y-3 min-w-0">
                                    <Badge variant={getStatusVariant(okr.status)} className="font-black text-[9px] uppercase h-5 px-2">
                                        {okr.status === 'Active' ? 'Sedang Berjalan' : okr.status}
                                    </Badge>
                                    <h2 className={cn("font-black tracking-tighter text-slate-900 leading-tight", isMobile ? "text-xl" : "text-3xl")}>
                                        {okr.objective}
                                    </h2>
                                    <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl">{okr.description}</p>
                                </div>
                                <div className="flex flex-col items-end gap-3 flex-shrink-0 w-full sm:w-auto">
                                    <div className="text-right p-4 rounded-2xl bg-primary/5 border border-primary/10 w-full sm:w-auto">
                                        <p className="text-[10px] uppercase font-black text-primary/60 tracking-widest mb-1">Capaian Progres</p>
                                        <p className={cn("font-black text-primary leading-none", isMobile ? "text-4xl" : "text-5xl")}>
                                            {(okr.progress ?? 0).toFixed(1)}%
                                        </p>
                                    </div>
                                    <div className="text-[9px] font-black uppercase text-muted-foreground flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full border border-border/40">
                                        <Calendar className="size-3 opacity-60" />
                                        <span>{startDate ? format(startDate, "d MMM yy") : ''} - {endDate ? format(endDate, "d MMM yyyy") : ''}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-t border-dashed mt-8 pt-5">
                                <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                    <LucideUser size={14} />
                                </div>
                                <span>Owner Utama: <span className="text-slate-900">{resolveName(okr.ownerId, okr.ownerName, employees)}</span></span>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1 flex items-center gap-2">
                            <ListChecks size={14} className="text-primary" /> Rincian Progres Key Results
                        </h3>
                        <AdaptiveTable 
                            data={okr.keyResults}
                            keyExtractor={(kr) => kr.id}
                            columns={[
                                { header: "Key Result", cell: (kr) => (
                                    <div className="flex flex-col gap-1">
                                        <span className="font-bold text-slate-900 text-sm">{kr.name}</span>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-[8px] font-black uppercase h-4 bg-muted/50 border-none">{kr.type}</Badge>
                                            <span className="text-[9px] font-bold text-muted-foreground">PIC: {resolveName(kr.ownerId || okr.ownerId, kr.ownerName, employees)}</span>
                                        </div>
                                    </div>
                                )},
                                { header: "Target & Aktual", cell: (kr) => {
                                    const unit = kr.unit || (kr.type === 'Percentage' ? '%' : '');
                                    const isMeasurable = kr.type === 'Numeric' || kr.type === 'Percentage';
                                    return (
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground mb-1">
                                                <span className="bg-muted px-1.5 py-0.5 rounded border">Mulai: {kr.startValue}{unit}</span>
                                                <ArrowRight className="h-3 w-3" />
                                                <span className="bg-primary/5 text-primary px-1.5 py-0.5 rounded border border-primary/10 font-bold">Target: {kr.targetValue}{unit}</span>
                                            </div>
                                            <span className="font-black text-xs text-foreground uppercase tracking-tight">
                                                {isMeasurable ? `Aktual: ${kr.currentValue.toLocaleString('id-ID')}${unit}` : `Selesai: ${kr.currentValue} / ${kr.targetValue}`}
                                            </span>
                                        </div>
                                    );
                                }},
                                { header: "Capaian (%)", className: "text-right", cell: (kr) => {
                                    const range = kr.targetValue - kr.startValue;
                                    const progress = range > 0 ? ((kr.currentValue - kr.startValue) / range) * 100 : (kr.currentValue >= kr.targetValue ? 100 : 0);
                                    const safeP = Math.max(0, Math.min(progress, 100));
                                    return (
                                        <div className="flex flex-col items-end gap-1.5">
                                            <span className="text-sm font-black text-primary">{safeP.toFixed(1)}%</span>
                                            <Progress value={safeP} className="h-1 w-24" />
                                        </div>
                                    );
                                }}
                            ]}
                            renderMobileCard={(kr) => {
                                const range = kr.targetValue - kr.startValue;
                                const progress = range > 0 ? ((kr.currentValue - kr.startValue) / range) * 100 : (kr.currentValue >= kr.targetValue ? 100 : 0);
                                const safeP = Math.max(0, Math.min(progress, 100));
                                const unit = kr.unit || (kr.type === 'Percentage' ? '%' : '');
                                const isMeasurable = kr.type === 'Numeric' || kr.type === 'Percentage';

                                return (
                                    <Card className="border-border/40 shadow-sm overflow-hidden">
                                        <CardContent className="p-4 space-y-4">
                                            <div className="flex justify-between items-start gap-2">
                                                <h4 className="font-black text-xs uppercase text-slate-800 leading-tight">{kr.name}</h4>
                                                <Badge variant="secondary" className="text-[8px] h-4 font-black">{kr.type}</Badge>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 py-3 border-y border-dashed">
                                                <div className="space-y-1">
                                                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Capaian Aktual</p>
                                                    <p className="text-sm font-black text-primary">{kr.currentValue}{unit}</p>
                                                </div>
                                                <div className="space-y-1 text-right">
                                                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Persentase</p>
                                                    <p className="text-sm font-black text-primary">{safeP.toFixed(1)}%</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5">
                                                    <Avatar className="size-5 border">
                                                        <AvatarFallback className="text-[7px] font-black">{resolveName(kr.ownerId || okr.ownerId, kr.ownerName, employees).substring(0,2).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-[9px] font-bold text-muted-foreground uppercase">{resolveName(kr.ownerId || okr.ownerId, kr.ownerName, employees)}</span>
                                                </div>
                                                <span className="text-[9px] font-bold text-muted-foreground">TARGET: {kr.targetValue}{unit}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            }}
                        />
                    </div>
                </TabsContent>

                <TabsContent value="individual" className="m-0 border-none animate-in fade-in duration-300">
                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1 flex items-center gap-2">
                            <LucideUsers size={14} className="text-primary" /> Matriks Kontribusi Personil
                        </h3>
                        <AdaptiveTable 
                            data={individualReport}
                            keyExtractor={(user) => user.id}
                            columns={[
                                { header: "Personil", cell: (user) => (
                                    <div className="flex items-center gap-3">
                                        <Avatar className="size-9 border shadow-sm">
                                            <AvatarFallback className="text-[10px] font-black bg-primary/10 text-primary uppercase">
                                                {user.name.substring(0, 2)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="font-bold text-slate-900">{user.name}</span>
                                    </div>
                                )},
                                { header: "Peran di Project", cell: (user) => (
                                    <div className="flex flex-wrap gap-1">
                                        {user.roles.map(role => (
                                            <Badge key={role} variant={role === 'Project Owner' ? 'default' : 'outline'} className="text-[9px] font-black uppercase h-5">
                                                {role}
                                            </Badge>
                                        ))}
                                    </div>
                                )},
                                { header: "Total Tugas", className: "text-center font-mono font-bold", accessorKey: "taskCount" },
                                { header: "Rata-rata Progres", className: "text-right", cell: (user) => (
                                    <div className="flex flex-col items-end gap-1.5">
                                        <span className="text-sm font-black text-primary">{user.avgProgress}%</span>
                                        <Progress value={user.avgProgress} className="h-1 w-24" />
                                    </div>
                                )}
                            ]}
                            renderMobileCard={(user) => (
                                <Card className="border-border/40 shadow-sm overflow-hidden bg-background">
                                    <CardContent className="p-4 space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="size-10 border-2 border-primary/10 shadow-sm">
                                                    <AvatarFallback className="font-black text-xs">{user.name.substring(0,2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <h4 className="font-black text-sm uppercase truncate text-slate-800">{user.name}</h4>
                                                    <div className="flex gap-1 mt-1">
                                                        {user.roles.slice(0, 1).map(role => (
                                                            <span key={role} className="text-[8px] font-black uppercase text-primary/70">{role}</span>
                                                        ))}
                                                        {user.roles.length > 1 && <span className="text-[8px] font-black uppercase text-muted-foreground">+{user.roles.length - 1} LAINNYA</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xl font-black text-primary leading-none">{user.avgProgress}%</p>
                                                <p className="text-[8px] font-black uppercase text-muted-foreground mt-1">PROGRES</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center pt-3 border-t border-dashed">
                                            <span className="text-[9px] font-black text-muted-foreground uppercase">Tugas Terlibat</span>
                                            <Badge variant="outline" className="text-[10px] font-black h-5 bg-muted/30 border-none">{user.taskCount} ITEM</Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};


export default function OkrReportsPage() {
    const { currentUser, userRole } = useAuth();
    const { okrs, companies, employees } = useMasterData();
    const [selectedOkr, setSelectedOkr] = useState<OKR | null>(null);
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState("");

    const userCompany = useMemo(() => companies.find(c => c.name === currentUser?.company), [companies, currentUser]);
    const isHoldingAdmin = useMemo(() => userRole === 'manajemen' && !!userCompany?.isHolding, [userRole, userCompany]);
    const showCompanyFilter = userRole === 'superadmin' || isHoldingAdmin;

    const manageableCompanies = useMemo(() => {
        if (userRole === 'superadmin') return companies.filter(c => c.status === 'Aktif');
        if (isHoldingAdmin && userCompany) {
            const getDescendantCompanies = (parentId: string): any[] => {
                const children = companies.filter(c => c.parentId === parentId);
                return children.flatMap(c => [c, ...getDescendantCompanies(c.id)]);
            };
            return [userCompany, ...getDescendantCompanies(userCompany.id)];
        }
        return [];
    }, [userRole, isHoldingAdmin, userCompany, companies]);

    const reportOkrs = useMemo(() => {
        if (!currentUser || !okrs || !employees) return [];
        
        let filtered = okrs.filter(okr => 
            (okr.status === 'Active' || okr.status === 'Completed' || okr.status === 'Overdue')
        );

        if (showCompanyFilter && selectedCompanyId !== 'all') {
            const companyName = companies.find(c => c.id === selectedCompanyId)?.name;
            filtered = filtered.filter(o => o.company === companyName);
        } else if (!showCompanyFilter) {
            filtered = filtered.filter(o => o.company === currentUser.company);
        }

        if (searchTerm) {
            filtered = filtered.filter(o => o.objective.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        return filtered.sort((a,b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));
    }, [okrs, currentUser, showCompanyFilter, selectedCompanyId, companies, searchTerm, employees]);

    if (selectedOkr) {
        return <OkrReportDetailView okr={selectedOkr} onBack={() => setSelectedOkr(null)} />;
    }

    return (
        <ResponsivePage>
            <PageHeader 
                title="Dashboard OKR" 
                description="Analisis performa unit bisnis dan kontribusi personil terhadap sasaran strategis perusahaan." 
                icon={FilePieChart} 
            />

            <DashboardNavigator />

            <ResponsiveToolbar>
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input 
                        placeholder="Cari project..." 
                        className="pl-9 h-10 border-none bg-background/50 shadow-none focus-visible:ring-primary/20" 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                    />
                </div>
                {showCompanyFilter && (
                    <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                        <SelectTrigger className="w-full sm:w-[240px] h-10 bg-background border-none">
                            <Building className="size-4 mr-2 text-primary" />
                            <SelectValue placeholder="Semua Perusahaan" />
                        </SelectTrigger>
                        <SelectContent className="z-[350]">
                            <SelectItem value="all">Semua Unit Bisnis</SelectItem>
                            {manageableCompanies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                )}
            </ResponsiveToolbar>

            <AdaptiveCardGrid complexity="medium">
                {reportOkrs.length > 0 ? (
                    reportOkrs.map(okr => (
                        <Card key={okr.id} className="hover:shadow-md transition-all border-l-4 border-primary group bg-background overflow-hidden flex flex-col h-full">
                            <CardHeader className="p-4 pb-2">
                                <div className="flex justify-between items-start gap-2">
                                    <CardTitle className="text-xs font-black uppercase tracking-tight text-slate-900 truncate flex-1">
                                        {okr.objective}
                                    </CardTitle>
                                    <Badge variant={okr.status === 'Completed' ? 'secondary' : okr.status === 'Overdue' ? 'destructive' : 'default'} className="text-[8px] h-4 font-black uppercase shrink-0">
                                        {okr.status}
                                    </Badge>
                                </div>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1 flex items-center gap-1">
                                    <Building size={10} /> {okr.company}
                                </p>
                            </CardHeader>
                            <CardContent className="p-4 py-4 flex-1">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase">
                                        <span className="text-muted-foreground">Progres</span>
                                        <span className="text-primary">{(okr.progress ?? 0).toFixed(1)}%</span>
                                    </div>
                                    <Progress value={okr.progress ?? 0} className="h-1.5" />
                                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase bg-muted/50 w-fit px-2 py-0.5 rounded-full">
                                        <LucideUser size={10} /> {resolveName(okr.ownerId, okr.ownerName, employees)}
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="p-3 px-4 border-t bg-muted/5 mt-auto flex justify-between items-center">
                                <div className="text-[9px] font-black text-muted-foreground uppercase flex items-center gap-1.5">
                                    <Calendar size={12} className="opacity-40" />
                                    {formatSafeDate(okr.endDate, "d MMM yy")}
                                </div>
                                <Button variant="ghost" size="sm" className="h-7 text-[9px] font-black gap-1.5 text-primary hover:bg-primary/5" onClick={() => setSelectedOkr(okr)}>
                                    LIHAT ANALISIS <ArrowRight size={10} />
                                </Button>
                            </CardFooter>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full py-32 text-center border-2 border-dashed rounded-3xl bg-muted/5 opacity-40">
                        <FilePieChart size={48} className="mx-auto mb-4 text-slate-400" />
                        <p className="font-black uppercase text-[10px] tracking-[0.2em]">Belum Ada Laporan</p>
                    </div>
                )}
            </AdaptiveCardGrid>
        </ResponsivePage>
    );
}
