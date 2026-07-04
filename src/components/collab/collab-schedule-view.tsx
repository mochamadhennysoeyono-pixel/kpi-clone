// src/components/collab/collab-schedule-view.tsx
"use client";

import React, { useMemo, useState } from 'react';
import { useMasterData } from '@/contexts/master-data-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { 
    Calendar, 
    Clock, 
    AlertCircle, 
    CalendarDays,
    Timer,
    Hourglass,
    ChevronLeft,
    ChevronRight,
    LayoutGrid,
    List
} from 'lucide-react';
import { 
    format, 
    isBefore, 
    isToday, 
    isThisWeek, 
    startOfDay, 
    startOfMonth, 
    endOfMonth, 
    eachDayOfInterval, 
    getDay, 
    isSameDay, 
    addMonths, 
    subMonths 
} from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { CollabTask, CollabSpace } from '@/types';
import { useBreakpoint } from '@/hooks/use-breakpoint';

interface CollabScheduleViewProps {
    space: CollabSpace;
}

const safeToDate = (dateVal: any): Date | null => {
    if (!dateVal) return null;
    if (dateVal instanceof Date) return dateVal;
    if (typeof dateVal.toDate === 'function') return dateVal.toDate();
    if (dateVal.seconds) return new Date(dateVal.seconds * 1000);
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d;
};

export function CollabScheduleView({ space }: CollabScheduleViewProps) {
    const { collabTasks, employees } = useMasterData();
    const [viewMode, setViewMode] = useState<'timeline' | 'calendar'>('timeline');
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const { isMobile } = useBreakpoint();

    // 1. Base Task Data
    const tasksInSpace = useMemo(() => {
        return collabTasks.filter(t => t.spaceId === space.id && t.dueDate);
    }, [collabTasks, space.id]);

    // 2. Timeline Grouping
    const timelineData = useMemo(() => {
        const today = startOfDay(new Date());
        const groups = {
            overdue: [] as CollabTask[],
            today: [] as CollabTask[],
            thisWeek: [] as CollabTask[],
            upcoming: [] as CollabTask[],
        };

        tasksInSpace.forEach(task => {
            const dueDate = safeToDate(task.dueDate);
            if (!dueDate || task.status === 'done' || task.status === 'cancelled') return;

            const dateOnly = startOfDay(dueDate);

            if (isBefore(dateOnly, today)) {
                groups.overdue.push(task);
            } else if (isToday(dateOnly)) {
                groups.today.push(task);
            } else if (isThisWeek(dateOnly, { weekStartsOn: 1 })) {
                groups.thisWeek.push(task);
            } else {
                groups.upcoming.push(task);
            }
        });

        const sortFn = (a: CollabTask, b: CollabTask) => {
            const dateA = safeToDate(a.dueDate)?.getTime() || 0;
            const dateB = safeToDate(b.dueDate)?.getTime() || 0;
            return dateA - dateB;
        };

        return {
            overdue: groups.overdue.sort(sortFn),
            today: groups.today.sort(sortFn),
            thisWeek: groups.thisWeek.sort(sortFn),
            upcoming: groups.upcoming.sort(sortFn),
        };
    }, [tasksInSpace]);

    // 3. Calendar Calculation
    const calendarDays = useMemo(() => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        const days = eachDayOfInterval({ start, end });
        
        const startDay = getDay(start);
        const prefix = Array.from({ length: startDay }, (_, i) => null);
        
        return [...prefix, ...days];
    }, [currentMonth]);

    const renderTaskItem = (task: CollabTask, urgencyColor: string) => {
        const dueDate = safeToDate(task.dueDate);
        const assigneeNames = (task.assigneeIds || []).map(id => employees.find(e => e.id === id)?.name).filter(Boolean).join(", ");

        return (
            <div key={task.id} className="group relative pl-6 pb-6 last:pb-0">
                <div className="absolute left-[7px] top-2 bottom-0 w-px bg-border group-last:bg-transparent" />
                <div className={cn("absolute left-0 top-1.5 size-4 rounded-full border-2 border-background shadow-sm z-10", urgencyColor)} />

                <div className="bg-muted/30 hover:bg-muted/50 border border-border/40 rounded-xl p-4 transition-all hover:translate-x-1 cursor-default">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                            <h4 className="text-sm font-bold text-foreground leading-tight truncate pr-4">{task.title}</h4>
                            <div className="flex flex-wrap items-center gap-3 text-[9px] sm:text-[10px] font-black uppercase text-muted-foreground tracking-tighter">
                                <span className="flex items-center gap-1.5"><Clock className="size-3" /> {dueDate ? format(dueDate, "d MMM yyyy") : "-"}</span>
                                <span className="flex items-center gap-1.5 truncate"><User className="size-3" /> {assigneeNames || 'Unassigned'}</span>
                            </div>
                        </div>
                        <Badge variant="outline" className="text-[8px] font-black uppercase h-5 px-1.5 shrink-0 bg-background/50 border-none shadow-sm w-fit">
                            {task.status.replace('-', ' ')}
                        </Badge>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full gap-6 animate-fade-in pb-10">
            {/* Header Adaptive Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20">
                        <div className="p-1.5 bg-rose-500 rounded-lg text-white"><AlertCircle size={16} /></div>
                        <div className="min-w-0"><p className="text-[9px] font-black uppercase text-rose-600 tracking-wider">Overdue</p><p className="text-lg font-black text-rose-700 leading-none">{timelineData.overdue.length}</p></div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20">
                        <div className="p-1.5 bg-blue-500 rounded-lg text-white"><Timer size={16} /></div>
                        <div className="min-w-0"><p className="text-[9px] font-black uppercase text-blue-600 tracking-wider">Mgg Ini</p><p className="text-lg font-black text-blue-700 leading-none">{timelineData.today.length + timelineData.thisWeek.length}</p></div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20">
                        <div className="p-1.5 bg-emerald-500 rounded-lg text-white"><CalendarDays size={16} /></div>
                        <div className="min-w-0"><p className="text-[9px] font-black uppercase text-emerald-600 tracking-wider">Total</p><p className="text-lg font-black text-emerald-700 leading-none">{tasksInSpace.length}</p></div>
                    </div>
                </div>

                <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border/40 self-end">
                    <Button 
                        variant={viewMode === 'timeline' ? 'default' : 'ghost'} 
                        size="sm" 
                        className="h-8 text-[9px] font-black uppercase px-3"
                        onClick={() => setViewMode('timeline')}
                    >
                        <List className="size-3 mr-1.5" /> Lini Masa
                    </Button>
                    <Button 
                        variant={viewMode === 'calendar' ? 'default' : 'ghost'} 
                        size="sm" 
                        className="h-8 text-[9px] font-black uppercase px-3"
                        onClick={() => setViewMode('calendar')}
                    >
                        <LayoutGrid className="size-3 mr-1.5" /> Kalender
                    </Button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 bg-background rounded-2xl border border-border/40 shadow-sm overflow-hidden flex flex-col">
                {viewMode === 'timeline' ? (
                    <ScrollArea className="flex-1 p-5 sm:p-8">
                        <div className="space-y-12">
                            {tasksInSpace.length > 0 ? (
                                <>
                                    {timelineData.overdue.length > 0 && (
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3"><Badge variant="destructive" className="text-[9px] font-black uppercase h-5">Terlewati</Badge><Separator className="flex-1 bg-rose-200 dark:bg-rose-900/30" /></div>
                                            <div>{timelineData.overdue.map(t => renderTaskItem(t, "bg-rose-500"))}</div>
                                        </div>
                                    )}
                                    {(timelineData.today.length > 0 || timelineData.thisWeek.length > 0) && (
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3"><Badge className="bg-blue-500 text-white text-[9px] font-black uppercase h-5">Minggu Ini</Badge><Separator className="flex-1 bg-blue-200 dark:bg-blue-900/30" /></div>
                                            <div>
                                                {timelineData.today.map(t => renderTaskItem(t, "bg-amber-500"))}
                                                {timelineData.thisWeek.map(t => renderTaskItem(t, "bg-blue-500"))}
                                            </div>
                                        </div>
                                    )}
                                    {timelineData.upcoming.length > 0 && (
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3"><Badge variant="outline" className="text-[9px] font-black uppercase h-5">Mendatang</Badge><Separator className="flex-1" /></div>
                                            <div>{timelineData.upcoming.map(t => renderTaskItem(t, "bg-slate-300"))}</div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="py-24 text-center space-y-4">
                                    <div className="size-20 bg-muted/20 rounded-full flex items-center justify-center mx-auto opacity-20">
                                        <Calendar className="size-10" />
                                    </div>
                                    <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">Jadwal Kosong</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                ) : (
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="p-4 border-b bg-muted/10 flex items-center justify-between shrink-0">
                            <h3 className="text-xs font-black uppercase tracking-widest text-foreground/70">
                                {format(currentMonth, "MMMM yyyy", { locale: localeId })}
                            </h3>
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="icon" className="size-8 rounded-lg" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                                    <ChevronLeft size={14} />
                                </Button>
                                <Button variant="outline" size="sm" className="h-8 text-[9px] font-black uppercase tracking-tighter" onClick={() => setCurrentMonth(new Date())}>HARI INI</Button>
                                <Button variant="outline" size="icon" className="size-8 rounded-lg" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                                    <ChevronRight size={14} />
                                </Button>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-auto p-4">
                            <div className="grid grid-cols-7 border-t border-l rounded-xl overflow-hidden min-w-[600px] bg-muted/5">
                                {['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'].map(d => (
                                    <div key={d} className="p-2 text-center text-[9px] font-black text-muted-foreground bg-muted/20 border-r border-b">{d}</div>
                                ))}
                                {calendarDays.map((day, i) => {
                                    const tasksOnDay = day ? tasksInSpace.filter(t => isSameDay(safeToDate(t.dueDate)!, day)) : [];
                                    const isCurrentDay = day && isToday(day);

                                    return (
                                        <div 
                                            key={i} 
                                            className={cn(
                                                "h-24 p-1 border-r border-b transition-colors flex flex-col gap-1",
                                                !day ? "bg-muted/10" : "bg-background",
                                                isCurrentDay && "bg-primary/5"
                                            )}
                                        >
                                            {day && (
                                                <>
                                                    <span className={cn(
                                                        "text-[9px] font-black size-5 flex items-center justify-center rounded-lg ml-auto mb-1",
                                                        isCurrentDay ? "bg-primary text-white" : "text-muted-foreground opacity-40"
                                                    )}>
                                                        {format(day, "d")}
                                                    </span>
                                                    <ScrollArea className="flex-1">
                                                        <div className="space-y-1">
                                                            {tasksOnDay.map(t => (
                                                                <div 
                                                                    key={t.id} 
                                                                    className={cn(
                                                                        "text-[8px] p-1 px-1.5 rounded-lg border leading-none font-black truncate uppercase tracking-tighter shadow-sm",
                                                                        t.status === 'done' ? "bg-green-50 border-green-100 text-green-700 opacity-60" : "bg-primary/5 border-primary/10 text-primary"
                                                                    )}
                                                                    title={t.title}
                                                                >
                                                                    {t.title}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </ScrollArea>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
