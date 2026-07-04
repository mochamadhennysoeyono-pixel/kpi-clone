// src/app/(main)/collab-space/reports/page.tsx
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useMasterData } from '@/contexts/master-data-context';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    Search, 
    Users, 
    Zap, 
    Briefcase, 
    Filter,
    Flame,
    LayoutGrid,
    TrendingUp,
    Clock,
    CheckCircle2,
    Calendar as CalendarIcon,
    Building,
    ExternalLink,
    ArrowRight
} from 'lucide-react';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
    AreaChart, 
    Area, 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip as RechartsTooltip, 
    ResponsiveContainer
} from 'recharts';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format, isBefore, startOfDay, subDays, eachDayOfInterval, isSameDay, getYear, getMonth, isValid, addDays } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { MultiSelect } from '@/components/ui/multi-select';
import { ResponsivePage, ResponsiveToolbar } from '@/components/ui/adaptive-layout';
import { PageHeader } from '@/components/ui/page-header';
import { AdaptiveCardGrid, AdaptiveMetricCard, AdaptiveInsightCard } from '@/components/ui/adaptive-card';
import { AdaptiveTable } from '@/components/ui/adaptive-table';
import { Card, CardContent } from '@/components/ui/card';

export default function CollabTaskReportPage() {
    const { collabSpaces, collabTasks, employees, companies } = useMasterData();
    const { currentUser, userRole } = useAuth();

    // --- States ---
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
    const [selectedSpaceId, setSelectedSpaceId] = useState<string | 'all'>('all');
    const [selectedMonths, setSelectedMonths] = useState<string[]>([(getMonth(new Date()) + 1).toString()]);
    const [selectedYears, setSelectedYears] = useState<string[]>([format(new Date(), 'yyyy')]);
    const [searchTerm, setSearchTerm] = useState("");

    // --- Scoping Logic ---
    const userCompany = useMemo(() => companies.find(c => c.name === currentUser?.company), [companies, currentUser]);
    const isHoldingAdmin = useMemo(() => userRole === 'manajemen' && !!userCompany?.isHolding, [userRole, userCompany]);
    const showAdminFilters = userRole === 'superadmin' || isHoldingAdmin;

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

    const monthOptions = [
        { value: '1', label: 'Januari' }, { value: '2', label: 'Februari' }, { value: '3', label: 'Maret' },
        { value: '4', label: 'April' }, { value: '5', label: 'Mei' }, { value: '6', label: 'Juni' },
        { value: '7', label: 'Juli' }, { value: '8', label: 'Agustus' }, { value: '9', label: 'September' },
        { value: '10', label: 'Oktober' }, { value: '11', label: 'November' }, { value: '12', label: 'Desember' },
    ];

    const yearOptions = useMemo(() => {
        const years = new Set<string>();
        years.add(format(new Date(), 'yyyy'));
        collabTasks.forEach(task => {
            const date = task.createdAt?.toDate ? task.createdAt.toDate() : (task.createdAt ? new Date(task.createdAt) : null);
            if (date) years.add(format(date, 'yyyy'));
        });
        return Array.from(years).sort((a, b) => b.localeCompare(a)).map(y => ({ label: y, value: y }));
    }, [collabTasks]);

    const filteredSpaces = useMemo(() => {
        let spaces = collabSpaces;
        if (showAdminFilters && selectedCompanyId !== 'all') {
            const companyName = companies.find(c => c.id === selectedCompanyId)?.name;
            spaces = spaces.filter(s => s.company === companyName);
        } else if (userRole === 'manajemen' && !isHoldingAdmin) {
            spaces = spaces.filter(s => s.company === currentUser?.company);
        } else if (userRole === 'user') {
            spaces = spaces.filter(s => s.memberIds.includes(currentUser?.id || ''));
        }
        return spaces;
    }, [collabSpaces, currentUser, userRole, showAdminFilters, selectedCompanyId, companies, isHoldingAdmin]);

    const activeSpaceTasks = useMemo(() => {
        let tasks = collabTasks;
        if (selectedSpaceId !== 'all') tasks = tasks.filter(t => t.spaceId === selectedSpaceId);
        else {
            const spaceIds = filteredSpaces.map(s => s.id);
            tasks = tasks.filter(t => spaceIds.includes(t.spaceId));
        }

        tasks = tasks.filter(t => {
            const date = t.createdAt?.toDate ? t.createdAt.toDate() : (t.createdAt ? new Date(t.createdAt) : null);
            if (!date) return false;
            const matchesYear = selectedYears.length === 0 || selectedYears.includes(getYear(date).toString());
            const matchesMonth = selectedMonths.length === 0 || selectedMonths.includes((getMonth(date) + 1).toString());
            return matchesYear && matchesMonth;
        });
        return tasks;
    }, [collabTasks, selectedSpaceId, selectedMonths, selectedYears, filteredSpaces]);

    const stats = useMemo(() => {
        const today = startOfDay(new Date());
        const counts = { total: activeSpaceTasks.length, todo: 0, inProgress: 0, done: 0, overdue: 0, atRisk: 0 };
        activeSpaceTasks.forEach(t => {
            const dueDate = t.dueDate?.toDate ? t.dueDate.toDate() : (t.dueDate ? new Date(t.dueDate) : null);
            if (t.status === 'done') counts.done++;
            else {
                if (dueDate && isBefore(dueDate, today)) counts.overdue++;
                else if (dueDate && isBefore(dueDate, addDays(today, 2))) counts.atRisk++;
                if (t.status === 'in-progress') counts.inProgress++; else counts.todo++;
            }
        });
        const efficiency = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;
        return { ...counts, efficiency };
    }, [activeSpaceTasks]);

    const trendData = useMemo(() => {
        const last7Days = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });
        return last7Days.map(day => ({
            date: format(day, 'dd MMM', { locale: localeId }),
            completed: activeSpaceTasks.filter(t => {
                const compAt = t.activityLog?.find(log => log.action.includes('Selesai'))?.timestamp?.toDate?.() || (t.status === 'done' ? (t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt)) : null);
                return compAt && isSameDay(compAt, day);
            }).length
        }));
    }, [activeSpaceTasks]);

    const workloadData = useMemo(() => {
        const map: Record<string, { name: string, active: number, done: number }> = {};
        activeSpaceTasks.forEach(t => {
            const ids = t.assigneeIds || (t.assigneeId ? [t.assigneeId] : []);
            ids.forEach(id => {
                if (!map[id]) {
                    const emp = employees.find(e => e.id === id);
                    map[id] = { name: emp?.name || 'Unknown', active: 0, done: 0 };
                }
                if (t.status === 'done') map[id].done++; else map[id].active++;
            });
        });
        return Object.values(map).sort((a, b) => b.active - a.active).slice(0, 5);
    }, [activeSpaceTasks, employees]);

    const displayTasks = useMemo(() => searchTerm ? activeSpaceTasks.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase())) : activeSpaceTasks, [activeSpaceTasks, searchTerm]);

    return (
        <ResponsivePage>
            <PageHeader 
                title="Laporan Analitik CollabSpace"
                description="Pantau produktivitas, tren penyelesaian tugas, dan distribusi beban kerja tim Anda."
                icon={CalendarIcon}
            />

            <ResponsiveToolbar>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground shrink-0">Waktu:</Label>
                        <MultiSelect options={yearOptions} value={selectedYears} onChange={setSelectedYears} placeholder="Tahun" className="w-[100px] h-9 text-[10px]" />
                        <MultiSelect options={monthOptions} value={selectedMonths} onChange={setSelectedMonths} placeholder="Bulan" className="w-[140px] h-9 text-[10px]" />
                    </div>
                    {showAdminFilters && (
                        <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                            <SelectTrigger className="w-full sm:w-[180px] h-9 border-none bg-background shadow-sm text-[10px] font-black uppercase">
                                <Building size={14} className="mr-2 text-primary" />
                                <SelectValue placeholder="Perusahaan" />
                            </SelectTrigger>
                            <SelectContent className="z-[350]">
                                <SelectItem value="all">Semua Perusahaan</SelectItem>
                                {manageableCompanies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                    <Select value={selectedSpaceId} onValueChange={setSelectedSpaceId}>
                        <SelectTrigger className="w-full sm:w-[180px] h-9 border-none bg-background shadow-sm text-[10px] font-black uppercase">
                            <LayoutGrid size={14} className="mr-2 text-primary" />
                            <SelectValue placeholder="Ruangan" />
                        </SelectTrigger>
                        <SelectContent className="z-[350]">
                            <SelectItem value="all">Semua Ruangan</SelectItem>
                            {filteredSpaces.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </ResponsiveToolbar>

            <AdaptiveCardGrid complexity="simple">
                <AdaptiveMetricCard title="Tugas Aktif" value={stats.todo + stats.inProgress} icon={Briefcase} description={`${stats.total} total dibuat`} color="bg-blue-500/10 text-blue-600" />
                <AdaptiveMetricCard title="Efisiensi" value={`${stats.efficiency}%`} icon={Zap} description="Tingkat penyelesaian" color="bg-emerald-500/10 text-emerald-600" />
                <AdaptiveMetricCard title="Overdue" value={stats.overdue} icon={Clock} description="Tugas terlambat" color="bg-rose-500/10 text-rose-600" />
                <AdaptiveMetricCard title="At Risk" value={stats.atRisk} icon={Flame} description="Deadline < 2 hari" color="bg-amber-500/10 text-amber-600" />
            </AdaptiveCardGrid>

            <AdaptiveCardGrid complexity="complex">
                <AdaptiveInsightCard title="Tren Penyelesaian" icon={TrendingUp} description="Aktivitas 7 hari terakhir">
                    <div className="h-[250px] pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs><linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/></linearGradient></defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                                <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                <Area type="monotone" dataKey="completed" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorProd)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </AdaptiveInsightCard>

                <AdaptiveInsightCard title="Beban Kerja Tim" icon={Users} description="Distribusi tugas per anggota">
                    <div className="h-[250px] pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={workloadData} layout="vertical" margin={{left: -20}}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} width={80} />
                                <RechartsTooltip cursor={{fill: 'transparent'}} />
                                <Bar dataKey="active" stackId="a" fill="#3B82F6" radius={[0, 0, 0, 0]} barSize={12} />
                                <Bar dataKey="done" stackId="a" fill="#22C55E" radius={[0, 4, 4, 0]} barSize={12} />
                            </BarChart>
                        </ResponsiveContainer>
                        <div className="flex justify-center gap-4 mt-4">
                            <div className="flex items-center gap-1.5 text-[8px] font-black uppercase"><div className="size-2 rounded-full bg-blue-500"/> Aktif</div>
                            <div className="flex items-center gap-1.5 text-[8px] font-black uppercase"><div className="size-2 rounded-full bg-green-500"/> Selesai</div>
                        </div>
                    </div>
                </AdaptiveInsightCard>
            </AdaptiveCardGrid>

            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Detail Daftar Tugas</h3>
                    <div className="relative w-full max-w-[240px]">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                        <Input placeholder="Cari judul tugas..." className="h-8 pl-8 text-[10px] bg-background border-none shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </div>

                <AdaptiveTable 
                    data={displayTasks}
                    keyExtractor={(t) => t.id}
                    columns={[
                        { header: "Judul Tugas", cell: (t) => <div className="flex flex-col"><span className="font-bold text-slate-900 text-xs">{t.title}</span><span className="text-[9px] font-bold text-muted-foreground uppercase">{t.company}</span></div> },
                        { header: "PIC", cell: (t) => <div className="flex items-center gap-2"><Avatar className="size-6"><AvatarFallback className="text-[8px] font-black bg-primary/10 text-primary">{t.assigneeName?.substring(0,2).toUpperCase()}</AvatarFallback></Avatar><span className="text-[10px] font-bold">{t.assigneeName}</span></div> },
                        { header: "Status", cell: (t) => <Badge variant="outline" className={cn("text-[8px] font-black uppercase h-5 border-none", t.status === 'done' ? "bg-green-100 text-green-700" : t.status === 'in-progress' ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600")}>{t.status.replace('-', ' ')}</Badge> },
                        { header: "Tenggat", className: "text-right", cell: (t) => {
                            const dDate = t.dueDate?.toDate?.();
                            const isOver = dDate && isBefore(dDate, startOfDay(new Date())) && t.status !== 'done';
                            return <div className="flex flex-col items-end"><span className={cn("text-[10px] font-black", isOver ? "text-rose-600" : "text-slate-600")}>{dDate ? format(dDate, "d MMM yyyy") : '-'}</span>{isOver && <Badge className="text-[7px] font-black h-3.5 bg-rose-600 border-none uppercase">LATE</Badge>}</div>
                        }}
                    ]}
                    renderMobileCard={(t) => (
                        <Card className="border-border/40 shadow-sm overflow-hidden">
                            <CardContent className="p-4 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="min-w-0">
                                        <h4 className="font-black text-xs uppercase truncate text-slate-800">{t.title}</h4>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <Avatar className="size-4"><AvatarFallback className="text-[6px] font-bold bg-muted">{t.assigneeName?.substring(0,2).toUpperCase()}</AvatarFallback></Avatar>
                                            <span className="text-[9px] font-bold text-muted-foreground uppercase">{t.assigneeName}</span>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className={cn("text-[8px] h-4 font-black border-none", t.status === 'done' ? "bg-green-50 text-green-600" : "bg-muted")}>{t.status.toUpperCase()}</Badge>
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t border-dashed">
                                    <span className="text-[9px] font-black text-muted-foreground uppercase">Deadline</span>
                                    <span className="text-[10px] font-black text-slate-700">{t.dueDate ? formatSafeDate(t.dueDate, "d MMM yyyy") : '-'}</span>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                />
            </div>
        </ResponsivePage>
    );
}

function formatSafeDate(date: any, formatStr: string) {
    const d = date?.toDate?.() || (date ? new Date(date) : null);
    if (!d || !isValid(d)) return '-';
    return format(d, formatStr, { locale: localeId });
}

function isValid(d: any): d is Date {
    return d instanceof Date && !isNaN(d.getTime());
}