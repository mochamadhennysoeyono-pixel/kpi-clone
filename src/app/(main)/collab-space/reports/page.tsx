// src/app/(main)/collab-space/reports/page.tsx
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useMasterData } from '@/contexts/master-data-context';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
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
    Building
} from 'lucide-react';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { format, isBefore, startOfDay, subDays, eachDayOfInterval, isSameDay, getYear, getMonth, parse } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { MultiSelect } from '@/components/ui/multi-select';
import type { Company } from '@/types';

export default function CollabTaskReportPage() {
    const { collabSpaces, collabTasks, employees, companies } = useMasterData();
    const { currentUser, userRole } = useAuth();

    // --- States ---
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
    const [selectedSpaceId, setSelectedSpaceId] = useState<string | 'all'>('all');
    const [selectedMonths, setSelectedMonths] = useState<string[]>([format(new Date(), 'M')]);
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

    // --- Constants ---
    const monthOptions = [
        { value: '1', label: 'Januari' },
        { value: '2', label: 'Februari' },
        { value: '3', label: 'Maret' },
        { value: '4', label: 'April' },
        { value: '5', label: 'Mei' },
        { value: '6', label: 'Juni' },
        { value: '7', label: 'Juli' },
        { value: '8', label: 'Agustus' },
        { value: '9', label: 'September' },
        { value: '10', label: 'Oktober' },
        { value: '11', label: 'November' },
        { value: '12', label: 'Desember' },
    ];

    // --- Computed Data: Years ---
    const yearOptions = useMemo(() => {
        const years = new Set<string>();
        years.add(format(new Date(), 'yyyy'));
        collabTasks.forEach(task => {
            const date = task.createdAt?.toDate ? task.createdAt.toDate() : (task.createdAt ? new Date(task.createdAt) : null);
            if (date) years.add(format(date, 'yyyy'));
        });
        return Array.from(years).sort((a, b) => b.localeCompare(a)).map(y => ({ label: y, value: y }));
    }, [collabTasks]);

    // --- Computed Data: Filtering ---
    const filteredSpaces = useMemo(() => {
        let spaces = collabSpaces;
        
        // 1. Filter by Company (if admin/holding)
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
        
        // Filter by Space
        if (selectedSpaceId !== 'all') {
            tasks = tasks.filter(t => t.spaceId === selectedSpaceId);
        } else {
            // Scoping based on filtered spaces
            const spaceIds = filteredSpaces.map(s => s.id);
            tasks = tasks.filter(t => spaceIds.includes(t.spaceId));
        }

        // Filter by Time (Multi-select aware)
        tasks = tasks.filter(t => {
            const date = t.createdAt?.toDate ? t.createdAt.toDate() : (t.createdAt ? new Date(t.createdAt) : null);
            if (!date) return false;

            const matchesYear = selectedYears.length === 0 || selectedYears.includes(getYear(date).toString());
            const matchesMonth = selectedMonths.length === 0 || selectedMonths.includes((getMonth(date) + 1).toString());

            return matchesYear && matchesMonth;
        });

        return tasks;
    }, [collabTasks, selectedSpaceId, selectedMonths, selectedYears, filteredSpaces]);

    const displayTasks = useMemo(() => {
        if (!searchTerm) return activeSpaceTasks;
        return activeSpaceTasks.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [activeSpaceTasks, searchTerm]);

    // --- Analytics Logic ---
    const stats = useMemo(() => {
        const today = startOfDay(new Date());
        const counts = { total: activeSpaceTasks.length, todo: 0, inProgress: 0, done: 0, overdue: 0, atRisk: 0 };
        
        activeSpaceTasks.forEach(t => {
            const dueDate = t.dueDate?.toDate ? t.dueDate.toDate() : (t.dueDate ? new Date(t.dueDate) : null);
            const isDone = t.status === 'done';
            
            if (isDone) {
                counts.done++;
            } else {
                if (dueDate && isBefore(dueDate, today)) {
                    counts.overdue++;
                } else if (dueDate && isBefore(dueDate, subDays(today, -2))) {
                    counts.atRisk++;
                }
                
                if (t.status === 'in-progress') counts.inProgress++;
                else counts.todo++;
            }
        });

        const efficiency = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;
        return { ...counts, efficiency };
    }, [activeSpaceTasks]);

    // Trend Data
    const trendData = useMemo(() => {
        const last7Days = eachDayOfInterval({
            start: subDays(new Date(), 6),
            end: new Date()
        });

        return last7Days.map(day => {
            const dayTasks = activeSpaceTasks.filter(t => {
                const completedAt = t.activityLog?.find(log => log.action.includes('Selesai'))?.timestamp?.toDate?.() 
                                  || (t.status === 'done' ? (t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt)) : null);
                return completedAt && isSameDay(completedAt, day);
            });

            return {
                date: format(day, 'dd MMM', { locale: localeId }),
                completed: dayTasks.length
            };
        });
    }, [activeSpaceTasks]);

    // Workload Data
    const workloadData = useMemo(() => {
        const memberCounts: Record<string, { name: string, active: number, done: number }> = {};
        
        activeSpaceTasks.forEach(t => {
            const ids = t.assigneeIds || (t.assigneeId ? [t.assigneeId] : []);
            ids.forEach(id => {
                if (!memberCounts[id]) {
                    const emp = employees.find(e => e.id === id);
                    memberCounts[id] = { name: emp?.name || 'Unknown', active: 0, done: 0 };
                }
                if (t.status === 'done') memberCounts[id].done++;
                else memberCounts[id].active++;
            });
        });

        return Object.values(memberCounts).sort((a, b) => b.active - a.active).slice(0, 5);
    }, [activeSpaceTasks, employees]);

    // Reset space filter when company changes
    useEffect(() => {
        setSelectedSpaceId('all');
    }, [selectedCompanyId]);

    return (
        <div className="space-y-6 pb-10">
            {/* Header Area */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <CalendarIcon className="size-6 text-primary" />
                        Laporan Tugas CollabSpace
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium">Analisis efisiensi dan beban kerja tim berdasarkan periode.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 bg-muted/30 p-2.5 rounded-xl border border-border/50">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Periode:</Label>
                            <MultiSelect
                                options={yearOptions}
                                value={selectedYears}
                                onChange={setSelectedYears}
                                placeholder="Pilih Tahun..."
                                className="w-[120px] text-xs font-semibold"
                            />
                            <MultiSelect
                                options={monthOptions}
                                value={selectedMonths}
                                onChange={setSelectedMonths}
                                placeholder="Pilih Bulan..."
                                className="w-[160px] text-xs font-semibold"
                            />
                        </div>

                        <div className="h-6 w-px bg-border mx-1" />

                        {showAdminFilters && (
                            <>
                                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                                    <SelectTrigger className="w-[180px] h-9 text-xs font-semibold border-none shadow-sm bg-background">
                                        <Building className="size-3 mr-2 text-primary" />
                                        <SelectValue placeholder="Pilih Perusahaan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Perusahaan</SelectItem>
                                        {manageableCompanies.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <div className="h-6 w-px bg-border mx-1" />
                            </>
                        )}

                        <Select value={selectedSpaceId} onValueChange={setSelectedSpaceId}>
                            <SelectTrigger className="w-[180px] h-9 text-xs font-semibold border-none shadow-sm bg-background">
                                <LayoutGrid className="size-3 mr-2 text-primary" />
                                <SelectValue placeholder="Pilih Ruangan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Ruangan</SelectItem>
                                {filteredSpaces.map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard 
                    label="Tugas Aktif" 
                    value={stats.todo + stats.inProgress} 
                    subValue={`${stats.total} Total Dibuat`} 
                    icon={Briefcase} 
                    color="text-blue-600"
                    bg="bg-blue-50"
                />
                <MetricCard 
                    label="Efisiensi Tim" 
                    value={`${stats.efficiency}%`} 
                    subValue="Tingkat Penyelesaian" 
                    icon={Zap} 
                    color="text-emerald-600"
                    bg="bg-emerald-50"
                />
                <MetricCard 
                    label="Keterlambatan" 
                    value={stats.overdue} 
                    subValue="Perlu Tindak Lanjut" 
                    icon={Clock} 
                    color="text-rose-600"
                    bg="bg-rose-50"
                />
                <MetricCard 
                    label="Segera Berakhir" 
                    value={stats.atRisk} 
                    subValue="Deadline < 2 hari" 
                    icon={Flame} 
                    color="text-amber-600"
                    bg="bg-amber-50"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Productivity Trend */}
                <Card className="lg:col-span-2 shadow-sm border-none bg-background">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <TrendingUp className="size-4 text-primary" />
                            Tren Penyelesaian (7 Hari Terakhir)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                <XAxis 
                                    dataKey="date" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fontSize: 10, fontWeight: 500}} 
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fontSize: 10, fontWeight: 500}} 
                                />
                                <RechartsTooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="completed" 
                                    stroke="hsl(var(--primary))" 
                                    strokeWidth={3}
                                    fillOpacity={1} 
                                    fill="url(#colorProd)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Workload Analysis */}
                <Card className="shadow-sm border-none bg-background">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Users className="size-4 text-primary" />
                            Beban Kerja Tim
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={workloadData} layout="vertical" margin={{left: -20}}>
                                <XAxis type="number" hide />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fontSize: 10, fontWeight: 500}}
                                    width={80}
                                />
                                <RechartsTooltip cursor={{fill: 'transparent'}} />
                                <Bar dataKey="active" stackId="a" fill="#3B82F6" radius={[0, 0, 0, 0]} barSize={12} />
                                <Bar dataKey="done" stackId="a" fill="#22C55E" radius={[0, 4, 4, 0]} barSize={12} />
                            </BarChart>
                        </ResponsiveContainer>
                        <div className="flex justify-center gap-4 mt-2">
                            <div className="flex items-center gap-1 text-[9px] font-bold uppercase"><div className="size-2 rounded-full bg-blue-500"/> Aktif</div>
                            <div className="flex items-center gap-1 text-[9px] font-bold uppercase"><div className="size-2 rounded-full bg-green-500"/> Selesai</div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Table */}
                <Card className="lg:col-span-8 shadow-sm border-none bg-background">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-sm font-bold text-foreground">Daftar Tugas & Status</CardTitle>
                        </div>
                        <div className="relative w-48">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                            <Input 
                                placeholder="Cari tugas..." 
                                className="h-8 pl-7 text-xs bg-muted/30 border-none font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[400px]">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30 hover:bg-muted/30 border-none">
                                        <TableHead className="text-[10px] font-bold uppercase">Tugas</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase text-center">PIC</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase">Status</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase text-right">Deadline</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {displayTasks.length > 0 ? (
                                        displayTasks.map(t => {
                                            const dueDate = t.dueDate?.toDate ? t.dueDate.toDate() : (t.dueDate ? new Date(t.dueDate) : null);
                                            const isOverdue = !t.status.includes('done') && dueDate && isBefore(dueDate, startOfDay(new Date()));
                                            const assignee = employees.find(e => e.id === (t.assigneeIds?.[0] || t.assigneeId));

                                            return (
                                                <TableRow key={t.id} className="group hover:bg-muted/5 border-border/40">
                                                    <TableCell className="py-4">
                                                        <p className="font-bold text-sm truncate max-w-[200px]">{t.title}</p>
                                                        <p className="text-[10px] text-muted-foreground font-medium uppercase">{t.company}</p>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Avatar className="size-7 mx-auto ring-2 ring-background">
                                                            <AvatarFallback className="text-[9px] font-bold bg-primary/10 text-primary">
                                                                {assignee?.name?.substring(0, 2).toUpperCase() || '?'}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge 
                                                            variant="outline" 
                                                            className={cn(
                                                                "text-[9px] uppercase font-bold border-none h-5",
                                                                t.status === 'done' ? "bg-green-100 text-green-700" :
                                                                t.status === 'in-progress' ? "bg-blue-100 text-blue-700" :
                                                                "bg-slate-100 text-slate-700"
                                                            )}
                                                        >
                                                            {t.status.replace('-', ' ')}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex flex-col items-end">
                                                            <span className={cn("text-xs font-bold", isOverdue ? "text-rose-600" : "text-foreground")}>
                                                                {dueDate ? format(dueDate, "d MMM yyyy") : '-'}
                                                            </span>
                                                            {isOverdue && <Badge className="text-[8px] h-4 bg-rose-600 border-none font-bold">Terlambat</Badge>}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-40 text-center text-muted-foreground italic text-xs font-medium">
                                                Tidak ada data tugas untuk periode ini.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Priority */}
                <div className="lg:col-span-4">
                    <Card className="shadow-sm border-none bg-background h-fit">
                        <CardHeader>
                            <CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Distribusi Prioritas</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <PriorityRow label="High" count={activeSpaceTasks.filter(t => t.priority === 'high').length} total={stats.total} color="bg-rose-500" />
                            <PriorityRow label="Medium" count={activeSpaceTasks.filter(t => t.priority === 'medium').length} total={stats.total} color="bg-blue-500" />
                            <PriorityRow label="Low" count={activeSpaceTasks.filter(t => t.priority === 'low').length} total={stats.total} color="bg-slate-400" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ label, value, subValue, icon: Icon, color, bg }: { label: string, value: string | number, subValue: string, icon: any, color: string, bg: string }) {
    return (
        <Card className="border-none shadow-sm overflow-hidden group hover:shadow-md transition-all bg-background">
            <CardContent className="p-6">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">{label}</p>
                        <h3 className="text-3xl font-bold text-foreground">{value}</h3>
                        <p className="text-[10px] font-medium text-muted-foreground opacity-60 uppercase">{subValue}</p>
                    </div>
                    <div className={cn("p-3 rounded-2xl transition-transform group-hover:scale-110 duration-300", bg)}>
                        <Icon className={cn("size-5", color)} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function PriorityRow({ label, count, total, color }: { label: string, count: number, total: number, color: string }) {
    const percent = total > 0 ? (count / total) * 100 : 0;
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                <span>{label} Priority</span>
                <span className="text-muted-foreground font-medium">{count} Tugas</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className={cn("h-full transition-all duration-1000", color)} style={{ width: `${percent}%` }} />
            </div>
        </div>
    );
}
