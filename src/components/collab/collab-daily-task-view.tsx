// src/components/collab/collab-daily-task-view.tsx
"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useMasterData } from '@/contexts/master-data-context';
import { useAuth } from '@/contexts/auth-context';
import { 
    CheckCircle2, 
    Plus, 
    Clock, 
    MoreHorizontal, 
    Trash2, 
    FileUp, 
    Loader2,
    CalendarDays,
    History,
    BarChart3,
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    CheckSquare,
    PlusCircle,
    X,
    Users,
    Circle,
    PlayCircle,
    XCircle,
    Edit,
    User,
    ExternalLink,
    PauseCircle,
    Save,
    FileText,
    Zap,
    ListChecks,
    CalendarCheck2,
    Timer,
    TrendingUp,
    Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter,
    DialogDescription,
    DialogClose 
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
    format, 
    isSameDay, 
    startOfMonth, 
    endOfMonth, 
    eachDayOfInterval, 
    getDay, 
    addMonths, 
    subMonths, 
    addDays, 
    subDays, 
    isToday, 
    isValid,
    startOfDay,
    getYear,
    getMonth,
    differenceInMinutes
} from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { serverTimestamp, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { storage } from '@/lib/firebase/client';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { MultiSelect } from '@/components/ui/multi-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '../ui/calendar';

interface CollabDailyTaskViewProps {
    space: any;
    onBackToDashboard?: () => void;
}

type DailySubTab = 'calendar' | 'tasks' | 'log' | 'report';

interface FormActivity {
    title: string;
}

const safeToDate = (dateVal: any): Date | null => {
    if (!dateVal) return null;
    if (dateVal instanceof Date) return dateVal;
    if (typeof dateVal.toDate === 'function') return dateVal.toDate();
    if (dateVal.seconds) return new Date(dateVal.seconds * 1000);
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d;
};

const formatSafeDate = (date: any, formatStr: string) => {
    const d = safeToDate(date);
    if (!d || !isValid(d)) return 'N/A';
    return format(d, formatStr, { locale: localeId });
};

const dailyStatusConfig: Record<string, { label: string, color: string, icon: any, border: string, chartColor: string }> = {
    'todo': { label: 'Rencana', color: 'text-slate-400', border: 'border-slate-200', icon: Circle, chartColor: '#94a3b8' },
    'in-progress': { label: 'Berjalan', color: 'text-blue-500', border: 'border-blue-200', icon: PlayCircle, chartColor: '#3b82f6' },
    'done': { label: 'Selesai', color: 'text-green-600', border: 'border-green-200', icon: CheckCircle2, chartColor: '#16a34a' },
    'failed': { label: 'Tidak Selesai', color: 'text-red-600', border: 'border-red-200', icon: XCircle, chartColor: '#dc2626' },
    'postponed': { label: 'Ditunda', color: 'text-amber-600', border: 'border-amber-200', icon: PauseCircle, chartColor: '#d97706' },
};

export function CollabDailyTaskView({ space, onBackToDashboard }: CollabDailyTaskViewProps) {
    const { currentUser, userRole } = useAuth();
    const { collabTasks, employees, addCollabTask, updateCollabTask, deleteCollabTask, fetchData } = useMasterData();
    const { toast } = useToast();

    const [activeSubTab, setActiveSubTab] = useState<DailySubTab>('calendar');
    const [isLoading, setIsLoading] = useState(false);
    
    // Date & Member Navigation
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedMemberId, setSelectedMemberId] = useState<string>("all");

    // Multi-Date State
    const [isMultiDateMode, setIsMultiDateMode] = useState(false);
    const [multiSelectedDates, setMultiSelectedDates] = useState<Date[]>([]);

    // Report Filter States
    const [selectedMonths, setSelectedMonths] = useState<string[]>([(getMonth(new Date()) + 1).toString()]);
    const [selectedYears, setSelectedYears] = useState<string[]>([getYear(new Date()).toString()]);

    // Creation/Edit State
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<any | null>(null);
    const [formActivities, setFormActivities] = useState<FormActivity[]>([{ title: "" }]);

    // Finishing Task State
    const [finishingTask, setFinishingTask] = useState<any | null>(null);
    const [selectedFinishStatus, setSelectedFinishStatus] = useState<string>("");
    const [finishNote, setFinishNote] = useState("");
    const [finishStartTime, setFinishStartTime] = useState("");
    const [finishEndTime, setFinishEndTime] = useState("");
    const [attachFile, setAttachFile] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Options ---
    const monthOptions = [
        { label: "Januari", value: "1" }, { label: "Februari", value: "2" }, { label: "Maret", value: "3" },
        { label: "April", value: "4" }, { label: "Mei", value: "5" }, { label: "Juni", value: "6" },
        { label: "Juli", value: "7" }, { label: "Agustus", value: "8" }, { label: "September", value: "9" },
        { label: "Oktober", value: "10" }, { label: "November", value: "11" }, { label: "Desember", value: "12" }
    ];

    const yearOptions = useMemo(() => {
        const years = new Set<string>();
        years.add(getYear(new Date()).toString());
        collabTasks.forEach(t => {
            const date = safeToDate(t.createdAt);
            if (date) years.add(getYear(date).toString());
        });
        return Array.from(years).sort().map(y => ({ label: y, value: y }));
    }, [collabTasks]);

    // --- Hierarchical Access Logic ---
    const allowedMembers = useMemo(() => {
        if (!currentUser) return [];
        
        if (userRole === 'superadmin' || userRole === 'manajemen' || userRole === 'hr-manager') {
            return employees.filter(e => space.memberIds.includes(e.id));
        }

        const getSubordinateIds = (managerId: string): string[] => {
            const direct = employees.filter(e => e.reportsTo === managerId).map(e => e.id);
            return [...direct, ...direct.flatMap(id => getSubordinateIds(id))];
        };

        const myTeamIds = new Set([currentUser.id, ...getSubordinateIds(currentUser.id)]);
        return employees.filter(e => space.memberIds.includes(e.id) && myTeamIds.has(e.id));
    }, [userRole, employees, space.memberIds, currentUser]);

    const scopedTasks = useMemo(() => {
        const allowedIds = new Set(allowedMembers.map(m => m.id));
        return collabTasks.filter(t => 
            t.spaceId === space.id && 
            t.taskType === 'daily' && 
            t.assigneeIds?.some(id => allowedIds.has(id))
        );
    }, [collabTasks, space.id, allowedMembers]);

    // --- Report Calculation Memos ---
    const monthTasks = useMemo(() => {
        return scopedTasks.filter(t => {
            const date = safeToDate(t.createdAt);
            if (!date) return false;
            
            const matchesYear = selectedYears.includes(getYear(date).toString());
            const matchesMonth = selectedMonths.includes((getMonth(date) + 1).toString());
            const matchesMember = selectedMemberId === 'all' || t.assigneeIds?.includes(selectedMemberId);

            return matchesYear && matchesMonth && matchesMember;
        });
    }, [scopedTasks, selectedYears, selectedMonths, selectedMemberId]);

    const reportStats = useMemo(() => {
        const counts = {
            total: monthTasks.length,
            done: monthTasks.filter(t => t.status === 'done').length,
            failed: monthTasks.filter(t => t.status === 'failed').length,
            postponed: monthTasks.filter(t => t.status === 'postponed').length,
            progress: monthTasks.filter(t => t.status === 'in-progress').length,
            todo: monthTasks.filter(t => t.status === 'todo').length,
        };

        const totalMinutes = monthTasks.reduce((total, t) => {
            if (t.status === 'done' && t.startTime && t.endTime) {
                const s = safeToDate(t.startTime);
                const e = safeToDate(t.endTime);
                if (s && e) return total + differenceInMinutes(e, s);
            }
            return total;
        }, 0);

        const efficiency = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;

        return { ...counts, totalMinutes, efficiency };
    }, [monthTasks]);

    const workloadByMember = useMemo(() => {
        const map: Record<string, { name: string, totalMin: number, taskCount: number, efficiency: number, done: number }> = {};
        
        monthTasks.forEach(t => {
            const id = t.assigneeIds?.[0] || 'unassigned';
            if (!map[id]) {
                const emp = employees.find(e => e.id === id);
                map[id] = { name: emp?.name || t.assigneeName || 'Unknown', totalMin: 0, taskCount: 0, efficiency: 0, done: 0 };
            }
            map[id].taskCount++;
            if (t.status === 'done') {
                map[id].done++;
                if (t.startTime && t.endTime) {
                    const s = safeToDate(t.startTime);
                    const e = safeToDate(t.endTime);
                    if (s && e) map[id].totalMin += differenceInMinutes(e, s);
                }
            }
        });

        return Object.values(map).map(m => ({
            ...m,
            efficiency: m.taskCount > 0 ? Math.round((m.done / m.taskCount) * 100) : 0
        })).sort((a, b) => b.totalMin - a.totalMin);
    }, [monthTasks, employees]);

    const keywordAnalysis = useMemo(() => {
        const keywords: Record<string, { count: number, totalMin: number }> = {};
        const stopWords = new Set(['dan', 'di', 'ke', 'dari', 'untuk', 'dengan', 'yang', 'ini', 'itu', 'atau', 'pada', 'saya', 'kami', 'kita']);

        monthTasks.forEach(t => {
            if (t.status !== 'done') return;
            
            const words = t.title.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));
            const duration = (t.startTime && t.endTime) ? differenceInMinutes(safeToDate(t.endTime)!, safeToDate(t.startTime)!) : 0;

            words.forEach(word => {
                if (!keywords[word]) keywords[word] = { count: 0, totalMin: 0 };
                keywords[word].count++;
                keywords[word].totalMin += duration;
            });
        });

        return Object.entries(keywords)
            .map(([word, data]) => ({ word, ...data }))
            .sort((a, b) => b.totalMin - a.totalMin)
            .slice(0, 10);
    }, [monthTasks]);

    // --- Effects ---
    useEffect(() => {
        if (isCreateDialogOpen && !editingTask) {
            setMultiSelectedDates([selectedDate]);
        }
    }, [isCreateDialogOpen, editingTask, selectedDate]);

    // --- Actions ---
    const handleSaveTask = async () => {
        const validActivities = formActivities.filter(a => a.title.trim() !== "");
        const targetId = selectedMemberId === 'all' ? currentUser?.id : selectedMemberId;
        
        if (validActivities.length === 0 || !targetId) {
            toast({ variant: 'destructive', title: "Data tidak lengkap", description: "Pilih personil dan isi setidaknya satu aktivitas." });
            return;
        }

        const targetDates = isMultiDateMode ? multiSelectedDates : [selectedDate];
        if (targetDates.length === 0) {
            toast({ variant: 'destructive', title: "Tanggal Belum Dipilih", description: "Harap pilih setidaknya satu tanggal untuk menjadwalkan tugas." });
            return;
        }
        
        setIsLoading(true);

        try {
            const targetEmployee = employees.find(e => e.id === targetId);

            if (editingTask) {
                const act = validActivities[0];
                await updateCollabTask(editingTask.id, {
                    title: act.title.trim(),
                    activityLog: [...(editingTask.activityLog || []), {
                        id: `log_${Date.now()}`,
                        authorId: currentUser!.id,
                        authorName: currentUser!.name,
                        timestamp: new Date(),
                        action: `memperbarui nama tugas: "${act.title.trim()}"`,
                        type: 'activity'
                    }]
                });
                toast({ title: "Tugas Diperbarui" });
            } else {
                for (const date of targetDates) {
                    const cleanDate = startOfDay(date);
                    
                    for (const act of validActivities) {
                        await addCollabTask({
                            spaceId: space.id,
                            company: space.company,
                            title: act.title.trim(),
                            status: 'todo',
                            taskType: 'daily',
                            priority: 'medium',
                            createdBy: currentUser!.id,
                            assigneeIds: [targetId],
                            assigneeName: targetEmployee?.name || "",
                            createdAt: Timestamp.fromDate(cleanDate), 
                            activityLog: [{
                                id: `log_${Date.now()}`,
                                authorId: currentUser!.id,
                                authorName: currentUser!.name,
                                timestamp: new Date(),
                                action: `membuat rencana tugas "${act.title.trim()}" untuk ${targetEmployee?.name} pada tanggal ${format(cleanDate, 'dd/MM/yy')}`,
                                type: 'activity'
                            }]
                        });
                    }
                }
                toast({ title: `Agenda Berhasil Dicatat untuk ${targetDates.length} Hari` });
            }

            setIsCreateDialogOpen(false);
            setEditingTask(null);
            setFormActivities([{ title: "" }]);
            setIsMultiDateMode(false);
            setMultiSelectedDates([]);
            fetchData(true);
        } catch (e: any) {
            console.error("Save task failed:", e);
            toast({ variant: 'destructive', title: "Gagal", description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditRequest = (task: any) => {
        setEditingTask(task);
        if (task.assigneeIds?.[0]) {
            setSelectedMemberId(task.assigneeIds[0]);
        }
        setFormActivities([{
            title: task.title
        }]);
        setIsMultiDateMode(false);
        setIsCreateDialogOpen(true);
    };

    const handleOpenFinishDialog = (task: any) => {
        setFinishingTask(task);
        setSelectedFinishStatus("");
        setFinishNote("");
        setFinishStartTime("");
        setFinishEndTime("");
        setAttachFile(false);
    };

    const handleUpdateStatus = async () => {
        if (!finishingTask || !currentUser || !selectedFinishStatus) return;

        if ((selectedFinishStatus === 'failed' || selectedFinishStatus === 'postponed') && !finishNote.trim()) {
            toast({
                variant: 'destructive',
                title: "Keterangan Wajib Diisi",
                description: `Mohon berikan alasan atau kendala kenapa tugas ini ${dailyStatusConfig[selectedFinishStatus].label.toLowerCase()}.`
            });
            return;
        }

        if (selectedFinishStatus === 'done' && (!finishStartTime || !finishEndTime)) {
            toast({
                variant: 'destructive',
                title: "Jam Kerja Wajib Diisi",
                description: "Harap masukkan jam mulai dan jam selesai untuk mencatat durasi kerja."
            });
            return;
        }

        setIsLoading(true);

        try {
            let fileData = null;
            if (attachFile && fileInputRef.current?.files?.[0]) {
                const file = fileInputRef.current.files[0];
                const storagePath = `collab_daily/${space.id}/${finishingTask.id}/${Date.now()}_${file.name}`;
                const storageRef = ref(storage, storagePath);
                const uploadTask = uploadBytesResumable(storageRef, file);

                await new Promise((resolve, reject) => {
                    uploadTask.on('state_changed', 
                        (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
                        reject,
                        async () => {
                            const url = await getDownloadURL(uploadTask.snapshot.ref);
                            fileData = { name: file.name, url, type: file.type };
                            resolve(true);
                        }
                    );
                });
            }

            const mergeDateTime = (date: Date, timeStr: string) => {
                if (!timeStr) return null;
                const [hours, minutes] = timeStr.split(':').map(Number);
                const newDate = new Date(date);
                newDate.setHours(hours, minutes, 0, 0);
                return Timestamp.fromDate(newDate);
            };

            const taskDate = safeToDate(finishingTask.createdAt) || new Date();
            const startTs = selectedFinishStatus === 'done' ? mergeDateTime(taskDate, finishStartTime) : null;
            const endTs = selectedFinishStatus === 'done' ? mergeDateTime(taskDate, finishEndTime) : null;

            const statusLabel = dailyStatusConfig[selectedFinishStatus].label;

            await updateCollabTask(finishingTask.id, {
                status: selectedFinishStatus as any,
                completedAt: selectedFinishStatus === 'done' ? serverTimestamp() : null,
                startTime: startTs,
                endTime: endTs,
                updatedAt: serverTimestamp(),
                description: finishNote || finishingTask.description,
                attachments: fileData ? [...(finishingTask.attachments || []), fileData] : (finishingTask.attachments || []),
                activityLog: [...(finishingTask.activityLog || []), {
                    id: `log_${Date.now()}`,
                    authorId: currentUser.id,
                    authorName: currentUser.name,
                    timestamp: new Date(),
                    action: `memperbarui status tugas harian menjadi "${statusLabel}". ${finishNote ? 'Catatan: ' + finishNote : ''}`,
                    type: 'activity'
                }]
            });

            toast({ title: "Update Berhasil", description: `Tugas ditandai sebagai ${statusLabel}.` });
            setFinishingTask(null);
            fetchData(true);
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Gagal", description: e.message });
        } finally {
            setIsLoading(false);
            setUploadProgress(null);
        }
    };

    // --- Tab Rendering Logic ---
    const renderDateSlider = () => (
        <div className="flex items-center justify-between p-2.5 bg-background rounded-xl border border-border/40 shadow-sm">
            <Button variant="ghost" size="icon" className="size-7 rounded-full" onClick={() => setSelectedDate(prev => subDays(prev, 1))}>
                <ChevronLeft className="size-3.5" />
            </Button>
            <div className="text-center px-4">
                <p className="text-[11px] font-medium text-foreground tracking-tight uppercase">
                    {format(selectedDate, 'EEEE, dd MMM yyyy', { locale: localeId })}
                </p>
                {isToday(selectedDate) && <span className="text-[8px] font-medium text-primary uppercase block -mt-0.5">Hari Ini</span>}
            </div>
            <Button variant="ghost" size="icon" className="size-7 rounded-full" onClick={() => setSelectedDate(prev => addDays(prev, 1))}>
                <ChevronRight className="size-3.5" />
            </Button>
        </div>
    );

    const getGroupedTasksByDate = useCallback((date: Date, memberId: string) => {
        const dayTasks = scopedTasks.filter(t => {
            const taskDate = safeToDate(t.createdAt);
            return taskDate && isSameDay(taskDate, date);
        });

        const filteredDayTasks = memberId === "all" 
            ? dayTasks 
            : dayTasks.filter(t => t.assigneeIds?.includes(memberId));

        const groups: Record<string, { assigneeName: string, tasks: any[] }> = {};
        
        filteredDayTasks.forEach(task => {
            const assigneeId = task.assigneeIds?.[0] || 'unassigned';
            if (!groups[assigneeId]) {
                const emp = employees.find(e => e.id === assigneeId);
                groups[assigneeId] = {
                    assigneeName: emp?.name || task.assigneeName || 'Unknown',
                    tasks: []
                };
            }
            groups[assigneeId].tasks.push(task);
        });

        return Object.entries(groups).map(([assigneeId, data]) => ({
            assigneeId,
            assigneeName: data.assigneeName,
            tasks: data.tasks.sort((a, b) => {
                const timeA = a.startTime ? formatSafeDate(a.startTime, "HH:mm") : "00:00";
                const timeB = b.startTime ? formatSafeDate(b.startTime, "HH:mm") : "00:00";
                return timeA.localeCompare(timeB);
            })
        }));
    }, [scopedTasks, employees]);

    const renderCalendarView = () => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        const days = eachDayOfInterval({ start, end });
        const startDay = getDay(start);
        const prefix = Array.from({ length: startDay }, (_, i) => null);
        const allDays = [...prefix, ...days];

        const getGroupedTasksForDay = (date: Date) => {
            const dayTasks = scopedTasks.filter(t => {
                const taskDate = safeToDate(t.createdAt);
                return taskDate && isSameDay(taskDate, date);
            });
            return selectedMemberId === "all" ? dayTasks : dayTasks.filter(t => t.assigneeIds?.includes(selectedMemberId));
        };

        const groupedTasksOnSelectedDate = getGroupedTasksByDate(selectedDate, selectedMemberId);

        return (
            <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                        <SelectTrigger className="w-full sm:w-[250px] bg-background border-border/60 h-9 text-[11px] font-medium">
                            <Users className="size-3.5 mr-2 text-primary" />
                            <SelectValue placeholder="Pilih Personil..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Anggota</SelectItem>
                            {allowedMembers.map(m => (
                                <SelectItem key={m.id} value={m.id}>{m.name} {m.id === currentUser?.id ? "(Anda)" : ""}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="size-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft size={14} /></Button>
                        <span className="text-[10px] font-medium uppercase tracking-widest w-32 text-center">{format(currentMonth, "MMMM yyyy", { locale: localeId })}</span>
                        <Button variant="outline" size="icon" className="size-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight size={14} /></Button>
                    </div>
                </div>

                <div className="grid grid-cols-7 border-t border-l rounded-xl overflow-hidden shadow-sm bg-background">
                    {['M', 'S', 'S', 'R', 'K', 'J', 'S'].map((d, i) => (
                        <div key={i} className="p-2 text-center text-[9px] font-medium text-muted-foreground bg-muted/20 border-r border-b">{d}</div>
                    ))}
                    {allDays.map((day, i) => {
                        const isSel = day && isSameDay(day, selectedDate);
                        const isTod = day && isToday(day);
                        const dayTasks = day ? getGroupedTasksForDay(day) : [];
                        const hasTasks = dayTasks.length > 0;

                        return (
                            <div 
                                key={i} 
                                onClick={() => day && setSelectedDate(day)}
                                className={cn(
                                    "h-12 flex items-center justify-center border-r border-b text-xs font-medium transition-all relative cursor-pointer",
                                    !day && "bg-muted/5",
                                    isSel ? "bg-primary text-white" : (isTod ? "text-primary border-primary/20" : "hover:bg-muted")
                                )}
                            >
                                {day && format(day, "d")}
                                {hasTasks && !isSel && <div className="absolute bottom-1.5 size-1 rounded-full bg-primary/40" />}
                            </div>
                        );
                    })}
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">RENCANA AGENDA TIM</p>
                        <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 font-black" onClick={() => { setEditingTask(null); setFormActivities([{ title: "" }]); setIsCreateDialogOpen(true); }}>
                            <PlusCircle size={14} /> BUAT RENCANA
                        </Button>
                    </div>
                    {groupedTasksOnSelectedDate.length > 0 ? (
                        groupedTasksOnSelectedDate.map(group => (
                            <Card key={group.assigneeId} className="border-border/40 bg-muted/5 shadow-none overflow-hidden">
                                <CardHeader className="p-3 pb-2 border-b bg-muted/30">
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tight text-primary">
                                        <User size={12} /> {group.assigneeName}
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-border/40">
                                        {group.tasks.map(t => (
                                            <div key={t.id} className="p-3 text-[11px] font-medium flex justify-between items-center group/item hover:bg-background/50 transition-colors">
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <div className={cn("size-2 rounded-full shrink-0")} style={{ backgroundColor: dailyStatusConfig[t.status]?.chartColor || '#ccc' }} />
                                                    <span className="truncate text-foreground/90">{t.title}</span>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {t.status === 'done' && t.startTime && t.endTime && (
                                                        <span className="text-[9px] opacity-60 bg-background px-1.5 py-0.5 rounded border">
                                                            {formatSafeDate(t.startTime, "HH:mm")} - {formatSafeDate(t.endTime, "HH:mm")}
                                                        </span>
                                                    )}
                                                    <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditRequest(t)}><Edit size={12} /></Button>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteCollabTask(t.id)}><Trash2 size={12} /></Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="py-10 text-center border border-dashed rounded-xl text-[10px] text-muted-foreground italic">Belum ada rencana untuk tanggal ini.</div>
                    )}
                </div>
            </div>
        );
    };

    const renderTasksTab = () => {
        const groupedTasks = getGroupedTasksByDate(selectedDate, selectedMemberId);

        return (
            <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                        <SelectTrigger className="w-full sm:w-[250px] bg-background border-border/60 h-9 text-[11px] font-medium">
                            <Users className="size-3.5 mr-2 text-primary" />
                            <SelectValue placeholder="Pilih Personil..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Anggota</SelectItem>
                            {allowedMembers.map(m => (
                                <SelectItem key={m.id} value={m.id}>{m.name} {m.id === currentUser?.id ? "(Anda)" : ""}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {renderDateSlider()}
                </div>
                <div className="space-y-4">
                    {groupedTasks.length > 0 ? (
                        groupedTasks.map(group => (
                            <Card key={group.assigneeId} className="border-border/40 overflow-hidden shadow-sm">
                                <CardHeader className="p-3 border-b bg-muted/30">
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tight text-primary">
                                        <User size={12} /> {group.assigneeName}
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-border/40">
                                        {group.tasks.map(task => {
                                            const cfg = dailyStatusConfig[task.status] || dailyStatusConfig.todo;
                                            const isPending = task.status === 'todo';

                                            return (
                                                <button 
                                                    key={task.id} 
                                                    onClick={() => handleOpenFinishDialog(task)}
                                                    className={cn(
                                                        "w-full p-4 flex items-center gap-4 text-left transition-colors hover:bg-muted/10"
                                                    )}
                                                >
                                                    <div className="shrink-0">
                                                        <cfg.icon className={cn("size-6", cfg.color)} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={cn("text-sm font-medium")}>{task.title}</p>
                                                        <div className="flex flex-wrap items-center gap-3 mt-1 text-[9px] font-medium text-muted-foreground uppercase">
                                                            {task.startTime && task.endTime ? (
                                                                <span className="flex items-center gap-1"><Clock size={10} /> {formatSafeDate(task.startTime, "HH:mm")} - {formatSafeDate(task.endTime, "HH:mm")}</span>
                                                            ) : <span className="flex items-center gap-1 text-[8px] italic">Belum ada catatan waktu</span>}
                                                            <span className={cn("font-bold flex items-center gap-1", cfg.color)}>
                                                                {isPending ? "Menunggu Update" : cfg.label}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="size-4 text-muted-foreground/30" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="py-20 text-center opacity-30">
                            <CheckSquare size={40} className="mx-auto mb-2"/>
                            <p className="text-[10px] font-medium uppercase tracking-widest">Tidak ada tugas pada tanggal ini</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderLogTab = () => {
        const logs = scopedTasks
            .filter(t => selectedMemberId === "all" || t.assigneeIds?.includes(selectedMemberId))
            .flatMap(t => (t.activityLog || []).map((log: any) => ({ ...log, taskTitle: t.title })))
            .filter(log => {
                const logDate = safeToDate(log.timestamp);
                return logDate && isSameDay(logDate, selectedDate);
            })
            .sort((a,b) => (safeToDate(b.timestamp)?.getTime() || 0) - (safeToDate(a.timestamp)?.getTime() || 0));

        return (
            <div className="space-y-6 animate-in fade-in duration-300 pb-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                        <SelectTrigger className="w-full sm:w-[250px] bg-background border-border/60 h-9 text-[11px] font-medium">
                            <Users className="size-3.5 mr-2 text-primary" />
                            <SelectValue placeholder="Pilih Personil..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Anggota</SelectItem>
                            {allowedMembers.map(m => (
                                <SelectItem key={m.id} value={m.id}>{m.name} {m.id === currentUser?.id ? "(Anda)" : ""}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {renderDateSlider()}
                </div>
                <div className="space-y-4">
                    {logs.length > 0 ? (
                        logs.map((log, idx) => (
                            <Card key={idx} className="border-border/40 hover:shadow-md transition-shadow">
                                <CardContent className="p-4 flex items-start gap-3">
                                    <Avatar className="size-8 shrink-0 border"><AvatarFallback className="bg-muted text-[10px] font-medium text-muted-foreground">{log.authorName.substring(0,2).toUpperCase()}</AvatarFallback></Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <p className="text-[11px] font-bold text-foreground">{log.authorName}</p>
                                            <span className="text-[9px] text-muted-foreground font-medium uppercase">{formatSafeDate(log.timestamp, "HH:mm")}</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1 leading-relaxed font-normal">{log.action}</div>
                                        <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/50 border text-[9px] font-medium text-muted-foreground">
                                            <FileText size={10} /> {log.taskTitle}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="py-20 text-center opacity-30"><History size={40} className="mx-auto mb-2"/><p className="text-[10px] font-medium uppercase">Tidak ada aktifitas pada tanggal ini</p></div>
                    )}
                </div>
            </div>
        );
    };

    const renderReportTab = () => {
        const formatDuration = (totalMin: number) => {
            const h = Math.floor(totalMin / 60);
            const m = totalMin % 60;
            return `${h}j ${m}m`;
        };

        return (
            <div className="space-y-6 animate-in fade-in duration-300 pb-20">
                <div className="flex flex-col xl:flex-row xl:items-end gap-4 p-4 bg-background rounded-2xl border border-border/40 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Personil</Label>
                            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                                <SelectTrigger className="h-10 text-xs font-bold bg-muted/5 border-none shadow-none"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua Anggota</SelectItem>
                                    {allowedMembers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Filter Tahun</Label>
                            <MultiSelect 
                                options={yearOptions} 
                                value={selectedYears} 
                                onChange={setSelectedYears} 
                                placeholder="Pilih Tahun..."
                                className="border-none bg-muted/5 shadow-none h-10"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Filter Bulan</Label>
                            <MultiSelect 
                                options={monthOptions} 
                                value={selectedMonths} 
                                onChange={setSelectedMonths} 
                                placeholder="Pilih Bulan..."
                                className="border-none bg-muted/5 shadow-none h-10"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-none shadow-sm bg-primary text-primary-foreground">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-[9px] font-black uppercase opacity-70">Total Agenda</p>
                                <p className="text-2xl font-black">{reportStats.total}</p>
                            </div>
                            <div className="p-2 bg-white/20 rounded-lg"><CalendarIcon size={20} /></div>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-sm bg-background">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-[9px] font-black uppercase text-muted-foreground">Persentase Penyelesaian</p>
                                <p className="text-2xl font-black text-green-600">{reportStats.efficiency}%</p>
                            </div>
                            <div className="p-2 bg-green-50 rounded-lg text-green-600"><Zap size={20} /></div>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-sm bg-background">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-[9px] font-black uppercase text-muted-foreground">Total Waktu Kerja</p>
                                <p className="text-2xl font-black text-blue-600">{formatDuration(reportStats.totalMinutes)}</p>
                            </div>
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Timer size={20} /></div>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-sm bg-background">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-[9px] font-black uppercase text-muted-foreground">Batal/Gagal</p>
                                <p className="text-2xl font-black text-red-600">{reportStats.failed}</p>
                            </div>
                            <div className="p-2 bg-red-50 rounded-lg text-red-600"><XCircle size={20} /></div>
                        </CardContent>
                    </Card>
                </div>

                {/* --- Analisa Beban Kerja Tim (Waktu) --- */}
                <Card className="border-none shadow-sm bg-background overflow-hidden">
                    <CardHeader className="pb-2 border-b bg-muted/30">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <TrendingUp size={14} className="text-primary" /> Analisa Beban Kerja Tim (Workload)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/10 hover:bg-muted/10 border-none">
                                    <TableHead className="text-[10px] font-bold uppercase">Personil</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase text-center">Total Waktu</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase text-center">Penyelesaian</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase text-right">Intensitas</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {workloadByMember.map((m, idx) => (
                                    <TableRow key={idx} className="group border-border/40">
                                        <TableCell className="py-4">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="size-6 border">
                                                    <AvatarFallback className="text-[8px] font-black">{m.name.substring(0,2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-xs font-bold">{m.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-mono text-xs font-black text-blue-600">
                                            {formatDuration(m.totalMin)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-[10px] font-bold">{m.efficiency}%</span>
                                                <Progress value={m.efficiency} className="h-1 w-16" />
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant="outline" className="text-[9px] font-black bg-muted/30 border-none">
                                                {m.taskCount} Tugas
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* --- Analisa Konteks Aktivitas (Top Keywords) --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-none shadow-sm bg-background overflow-hidden">
                        <CardHeader className="pb-2 border-b bg-muted/30">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <ListChecks size={14} className="text-primary" /> Top Konteks Aktivitas (Waktu Terbanyak)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="space-y-4">
                                {keywordAnalysis.length > 0 ? keywordAnalysis.map((item, idx) => {
                                    const maxMin = keywordAnalysis[0].totalMin;
                                    const percent = (item.totalMin / maxMin) * 100;
                                    return (
                                        <div key={idx} className="space-y-1.5">
                                            <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                                                <span className="text-foreground/80">{item.word}</span>
                                                <span className="text-primary">{formatDuration(item.totalMin)}</span>
                                            </div>
                                            <Progress value={percent} className="h-1.5" />
                                        </div>
                                    );
                                }) : (
                                    <p className="text-center py-10 text-xs text-muted-foreground italic">Belum ada data aktivitas untuk dianalisa.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-background overflow-hidden">
                        <CardHeader className="pb-2 border-b bg-muted/30">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <Search size={14} className="text-primary" /> Rekomendasi Optimasi
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <div className="p-2 h-fit bg-blue-50 text-blue-600 rounded-lg"><Clock size={16}/></div>
                                    <div>
                                        <p className="text-xs font-bold">Keseimbangan Beban Kerja</p>
                                        <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                                            {workloadByMember.length > 1 ? (
                                                `Beban kerja tertinggi saat ini dipegang oleh ${workloadByMember[0].name} dengan total ${formatDuration(workloadByMember[0].totalMin)}. Pertimbangkan delegasi jika selisih dengan anggota lain > 30%.`
                                            ) : "Data anggota belum cukup untuk analisa pembanding."}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="p-2 h-fit bg-green-50 text-green-600 rounded-lg"><CheckCircle2 size={16}/></div>
                                    <div>
                                        <p className="text-xs font-bold">Analisa Intensitas Kata Kunci</p>
                                        <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                                            {keywordAnalysis.length > 0 ? (
                                                `Aktivitas dominan tim Anda bulan ini berkaitan dengan "${keywordAnalysis[0].word.toUpperCase()}". Fokuskan perbaikan alat atau SOP pada area tersebut untuk efisiensi.`
                                            ) : "Belum ada pola aktivitas yang terdeteksi."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* --- Rincian Tabel Standar --- */}
                <Card className="border-none shadow-sm bg-background overflow-hidden">
                    <CardHeader className="pb-2 border-b bg-muted/30">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <FileText size={14} className="text-primary" /> Rincian Aktivitas Periode Terpilih
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[400px]">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/10">
                                        <TableHead className="text-[10px] font-bold uppercase">Tugas / PIC</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase text-center">Status</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase text-center">Durasi</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase">Keterangan</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase text-right">Waktu Update</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {monthTasks.length > 0 ? (
                                        monthTasks.sort((a,b) => (safeToDate(b.updatedAt || b.createdAt)?.getTime() || 0) - (safeToDate(a.updatedAt || a.createdAt)?.getTime() || 0)).map(t => {
                                            const cfg = dailyStatusConfig[t.status] || dailyStatusConfig.todo;
                                            const updateDate = safeToDate(t.updatedAt || t.completedAt || t.createdAt);
                                            
                                            let durationStr = "-";
                                            if (t.status === 'done' && t.startTime && t.endTime) {
                                                const s = safeToDate(t.startTime);
                                                const e = safeToDate(t.endTime);
                                                if (s && e) durationStr = formatDuration(differenceInMinutes(e, s));
                                            }

                                            return (
                                                <TableRow key={t.id} className="group hover:bg-muted/5 border-border/40">
                                                    <TableCell className="py-4">
                                                        <p className="text-xs font-bold text-foreground/90">{t.title}</p>
                                                        <div className="flex items-center gap-1.5 mt-1">
                                                            <Avatar className="size-4 border">
                                                                <AvatarFallback className="text-[6px] font-black bg-primary/10 text-primary">
                                                                    {t.assigneeName?.substring(0,2).toUpperCase()}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span className="text-[9px] font-medium text-muted-foreground uppercase">{t.assigneeName}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="outline" className={cn("text-[8px] font-black uppercase border-none", cfg.color, "bg-muted/30")}>
                                                            {cfg.label}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono text-[10px] font-bold">
                                                        {durationStr}
                                                    </TableCell>
                                                    <TableCell className="max-w-[200px]">
                                                        <p className="text-[10px] text-muted-foreground leading-relaxed italic line-clamp-2">
                                                            {t.description || t.text || "-"}
                                                        </p>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <p className="text-[10px] font-bold text-foreground/70">{updateDate ? format(updateDate, "dd/MM/yy", { locale: localeId }) : "-"}</p>
                                                        <p className="text-[8px] text-muted-foreground">{updateDate ? format(updateDate, "HH:mm") : ""}</p>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-40 text-center text-muted-foreground italic text-xs font-medium">
                                                Tidak ada data untuk periode ini.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        );
    };

    // --- Tab Switching Logic ---
    const renderContent = () => {
        switch(activeSubTab) {
            case 'calendar': return renderCalendarView();
            case 'tasks': return renderTasksTab();
            case 'log': return renderLogTab();
            case 'report': return renderReportTab();
            default: return null;
        }
    };

    // --- Row Handlers ---
    const handleAddActivityRow = () => {
        setFormActivities(prev => [...prev, { title: "" }]);
    };

    const handleRemoveActivityRow = (index: number) => {
        if (formActivities.length <= 1) return;
        setFormActivities(prev => prev.filter((_, i) => i !== index));
    };

    const handleActivityChange = (index: number, field: keyof FormActivity, value: string) => {
        setFormActivities(prev => prev.map((act, i) => i === index ? { ...act, [field]: value } : act));
    };

    return (
        <div className="flex flex-col h-full bg-muted/10 relative">
            <div className={cn("z-50 w-full bg-background/95 backdrop-blur-xl border-border/40 shadow-sm transition-all duration-500", "fixed bottom-0 left-0 md:sticky md:top-0 md:bottom-auto md:border-b")}>
                <div className="p-1.5 flex items-center justify-between max-w-5xl mx-auto w-full">
                    <div className="md:hidden flex items-center pl-1 pr-2 border-r border-border/40 mr-1 shrink-0">
                        <button 
                            onClick={onBackToDashboard} 
                            className="flex flex-col items-center justify-center size-10 rounded-xl text-muted-foreground hover:bg-muted/50 transition-all active:scale-90"
                        >
                            <ChevronLeft size={20} className="stroke-[3px]" />
                            <span className="text-[7px] font-black uppercase tracking-tighter">Back</span>
                        </button>
                    </div>

                    <div className="hidden md:flex items-center gap-3 pl-4 pr-6 border-r border-border/40 mr-2 shrink-0">
                         <button onClick={onBackToDashboard} className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tighter">
                            <ChevronLeft size={14} /> DASHBOARD
                         </button>
                         <Separator orientation="vertical" className="h-4" />
                         <span className="font-black text-[11px] text-foreground truncate max-w-[150px] uppercase tracking-wider">{space.name}</span>
                    </div>
                    <div className="flex flex-1 items-center justify-between gap-1">
                        <SubNavButton active={activeSubTab === 'calendar'} onClick={() => setActiveSubTab('calendar')} icon={CalendarIcon} label="Jadwal" />
                        <SubNavButton active={activeSubTab === 'tasks'} onClick={() => setActiveSubTab('tasks')} icon={CheckSquare} label="Tugas" />
                        <SubNavButton active={activeSubTab === 'log'} onClick={() => setActiveSubTab('log')} icon={History} label="Log" />
                        <SubNavButton active={activeSubTab === 'report'} onClick={() => setActiveSubTab('report')} icon={BarChart3} label="Laporan" />
                    </div>
                </div>
            </div>

            <ScrollArea className="flex-1 p-4 md:p-6">
                <div className="max-w-3xl mx-auto pb-24 md:pb-6">
                    {renderContent()}
                </div>
            </ScrollArea>

            {/* CREATE/EDIT DIALOG */}
            <Dialog open={isCreateDialogOpen} onOpenChange={(o) => { setIsCreateDialogOpen(o); if(!o) setEditingTask(null); }}>
                <DialogContent className="sm:max-w-md flex flex-col h-full max-h-[90vh] p-0 overflow-hidden">
                    <DialogHeader className="p-6 pb-2 shrink-0 bg-background border-b">
                        <DialogTitle className="font-headline font-black text-sm">{editingTask ? 'Ubah Rencana' : 'Buat Rencana Agenda'}</DialogTitle>
                        <DialogDescription className="text-[10px] font-bold uppercase tracking-wider">Untuk: {format(selectedDate, "d MMMM yyyy", { locale: localeId })}</DialogDescription>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-y-auto p-6 bg-muted/5">
                        <div className="space-y-6">
                            {allowedMembers.length > 1 && !editingTask && (
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Penanggung Jawab</Label>
                                    <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                                        <SelectTrigger className="h-10 text-xs font-bold bg-background"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Pilih Personil...</SelectItem>
                                            {allowedMembers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Daftar Rencana Aktivitas</Label>
                                {formActivities.map((act, index) => (
                                    <div key={index} className="p-4 rounded-xl border bg-background relative animate-in slide-in-from-top-2 duration-200 shadow-sm">
                                        {formActivities.length > 1 && (
                                            <button 
                                                type="button" 
                                                className="absolute -top-2 -right-2 size-6 rounded-full bg-destructive text-white flex items-center justify-center shadow-lg active:scale-95 z-10"
                                                onClick={() => handleRemoveActivityRow(index)}
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-black uppercase opacity-60">Nama Kegiatan</Label>
                                            <Input 
                                                placeholder="cth., Meeting Koordinasi" 
                                                value={act.title} 
                                                onChange={(e) => handleActivityChange(index, 'title', e.target.value)} 
                                                className="h-10 text-xs font-bold bg-muted/5" 
                                            />
                                        </div>
                                    </div>
                                ))}
                                
                                {!editingTask && (
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="sm" 
                                        className="w-full border-dashed gap-2 font-black text-[10px] uppercase h-10 rounded-xl"
                                        onClick={handleAddActivityRow}
                                    >
                                        <Plus size={14} /> TAMBAH BARIS AGENDA
                                    </Button>
                                )}
                            </div>

                            {!editingTask && (
                                <>
                                    <Separator />
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-3 rounded-xl border bg-background border-primary/20 shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <CalendarCheck2 className="size-4 text-primary" />
                                                <div className="space-y-0.5">
                                                    <Label className="text-xs font-black uppercase leading-none">Aktifkan di Banyak Tanggal</Label>
                                                    <p className="text-[9px] font-medium text-muted-foreground">Tugas ini rutin dilakukan setiap hari atau tanggal tertentu.</p>
                                                </div>
                                            </div>
                                            <Switch 
                                                checked={isMultiDateMode} 
                                                onCheckedChange={setIsMultiDateMode} 
                                            />
                                        </div>

                                        {isMultiDateMode && (
                                            <div className="p-4 border rounded-xl bg-background shadow-inner animate-in fade-in zoom-in-95 duration-300">
                                                <Label className="text-[10px] font-black uppercase text-primary block mb-3 text-center">Pilih Semua Tanggal Penugasan</Label>
                                                <Calendar 
                                                    mode="multiple"
                                                    selected={multiSelectedDates}
                                                    onSelect={(dates) => setMultiSelectedDates(dates || [])}
                                                    className="mx-auto"
                                                />
                                                <p className="text-[10px] text-center mt-3 font-bold text-muted-foreground">
                                                    {multiSelectedDates.length} Tanggal Dipilih
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="p-6 pt-2 shrink-0 bg-background border-t">
                        <Button onClick={handleSaveTask} disabled={isLoading || formActivities.every(a => !a.title.trim())} className="w-full sm:w-auto font-black px-8 text-xs h-11 shadow-lg">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                            {editingTask ? 'SIMPAN PERUBAHAN' : `SIMPAN ${formActivities.filter(a => a.title.trim()).length * (isMultiDateMode ? Math.max(1, multiSelectedDates.length) : 1)} AGENDA`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* FINISH/UPDATE STATUS DIALOG */}
            <Dialog open={!!finishingTask} onOpenChange={(o) => !o && setFinishingTask(null)}>
                <DialogContent className="sm:max-w-md flex flex-col h-full max-h-[90vh] p-0 overflow-hidden">
                    <DialogHeader className="p-6 pb-2 shrink-0 bg-background border-b text-left">
                        <DialogTitle className="font-black text-sm uppercase">Update Progress Tugas</DialogTitle>
                        <DialogDescription className="text-xs font-bold text-primary">Agenda: {finishingTask?.title}</DialogDescription>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-muted/5">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pilih Realisasi Status</Label>
                            <RadioGroup 
                                value={selectedFinishStatus} 
                                onValueChange={setSelectedFinishStatus} 
                                className="grid grid-cols-1 gap-2"
                            >
                                {['done', 'failed', 'postponed'].map((status) => {
                                    const cfg = dailyStatusConfig[status];
                                    const isSel = selectedFinishStatus === status;
                                    return (
                                        <div key={status} className="relative">
                                            <RadioGroupItem value={status} id={status} className="peer sr-only" />
                                            <Label 
                                                htmlFor={status} 
                                                className={cn(
                                                    "flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer bg-background",
                                                    isSel ? cn("border-primary ring-1 ring-primary/20 bg-primary/5", cfg.color) : "border-border/40 hover:bg-muted/50"
                                                )}
                                            >
                                                <cfg.icon size={20} className={cfg.color} />
                                                <div className="flex-1">
                                                    <p className="text-xs font-black uppercase">{cfg.label}</p>
                                                </div>
                                                {isSel && <CheckCircle2 size={16} className="text-primary" />}
                                            </Label>
                                        </div>
                                    );
                                })}
                            </RadioGroup>
                        </div>

                        {selectedFinishStatus && (
                            <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
                                {selectedFinishStatus === 'done' && (
                                    <div className="p-4 rounded-xl bg-background border-2 border-green-100 space-y-4 shadow-sm">
                                        <div className="flex items-center gap-2 text-green-600">
                                            <Timer size={16} />
                                            <Label className="text-[10px] font-black uppercase tracking-widest">Catatan Waktu Pengerjaan</Label>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] font-bold uppercase opacity-60">Jam Mulai</Label>
                                                <Input type="time" value={finishStartTime} onChange={(e) => setFinishStartTime(e.target.value)} className="h-9 font-bold bg-muted/5 border-green-50" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] font-bold uppercase opacity-60">Jam Selesai</Label>
                                                <Input type="time" value={finishEndTime} onChange={(e) => setFinishEndTime(e.target.value)} className="h-9 font-bold bg-muted/5 border-green-50" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                        Keterangan / Kendala {(selectedFinishStatus === 'failed' || selectedFinishStatus === 'postponed') && <span className="text-destructive">* (Wajib)</span>}
                                    </Label>
                                    <Textarea 
                                        placeholder={
                                            selectedFinishStatus === 'failed' || selectedFinishStatus === 'postponed' 
                                            ? "Sebutkan alasan kendala atau kenapa tugas ini ditunda (Wajib)..." 
                                            : "Berikan catatan singkat hasil pekerjaan..."
                                        }
                                        value={finishNote} 
                                        onChange={(e) => setFinishNote(e.target.value)} 
                                        className={cn(
                                            "min-h-[100px] resize-none bg-background text-xs font-bold border-border/60",
                                            (selectedFinishStatus === 'failed' || selectedFinishStatus === 'postponed') && !finishNote.trim() && "border-destructive/50 focus-visible:ring-destructive"
                                        )} 
                                    />
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 rounded-xl border bg-background border-border/60">
                                        <div className="flex items-center gap-2">
                                            <FileUp size={16} className="text-primary" />
                                            <span className="text-xs font-black uppercase text-foreground/70">Lampirkan Bukti File</span>
                                        </div>
                                        <Switch checked={attachFile} onCheckedChange={setAttachFile} />
                                    </div>
                                    {attachFile && (
                                        <div className="animate-in fade-in slide-in-from-top-2 p-1">
                                            <input type="file" ref={fileInputRef} className="text-xs h-10 font-medium bg-background file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-primary/10 file:text-primary hover:file:bg-primary/20 w-full" />
                                            {uploadProgress !== null && (
                                                <div className="mt-3 space-y-1">
                                                    <Progress value={uploadProgress} className="h-1" />
                                                    <p className="text-[9px] font-black text-primary text-right">{uploadProgress.toFixed(0)}%</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="p-6 border-t bg-background">
                        <Button 
                            onClick={handleUpdateStatus} 
                            disabled={isLoading || !selectedFinishStatus || ((selectedFinishStatus === 'failed' || selectedFinishStatus === 'postponed') && !finishNote.trim()) || (selectedFinishStatus === 'done' && (!finishStartTime || !finishEndTime))} 
                            className="w-full font-black uppercase tracking-wider text-[10px] h-11 shadow-lg"
                        >
                            {isLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
                            Simpan Realisasi Tugas
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function SubNavButton({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
    return (
        <button onClick={onClick} className={cn("flex flex-col items-center justify-center flex-1 h-10 rounded-xl transition-all duration-300 gap-0.5", active ? "bg-primary text-white shadow-md scale-105" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground")}>
            <Icon size={16} />
            <span className="text-[8px] font-black uppercase tracking-tighter">{label}</span>
        </button>
    );
}
