
// src/app/(main)/calendar/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, PlusCircle, Workflow, BookOpenCheck, FilePlus2, ClipboardPen, GraduationCap, CalendarDays } from "lucide-react";
import { useRouter } from 'next/navigation';
import { cn } from "@/lib/utils";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import type { AppraisalSetup, Company, LearningProgram, Department, Employee, KpiData, AppraisalTask, Course, KpiSetup } from "@/types";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isWithinInterval, parse, isValid, lastDayOfMonth, addDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { usePageContext } from "@/contexts/page-context";
import { EventDetailDialog } from "@/components/calendar/event-detail-dialog";
import { ResponsivePage, ResponsiveToolbar } from "@/components/ui/adaptive-layout";
import { PageHeader } from "@/components/ui/page-header";


type CalendarEventType = 'Appraisal' | 'Learning' | 'KPI' | 'KBO' | 'Meeting';

export type CalendarEvent = {
    id: string;
    title: string;
    date: Date; // A single date for the event day
    type: CalendarEventType;
    sourceDocs: any[]; // Array of source documents (e.g., KpiSetup[])
    status?: 'Selesai' | 'Berjalan' | 'Akan Datang';
    company?: string;
};


function EventBadge({ event, onClick }: { event: CalendarEvent; onClick: (event: CalendarEvent) => void }) {
    const eventStyles: Record<CalendarEventType, string> = {
        'Appraisal': "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900",
        'Learning': "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900",
        'KPI': "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900",
        'KBO': "bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:hover:bg-purple-900",
        'Meeting': "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:hover:bg-yellow-900",
    };

    let colorClasses = eventStyles[event.type] || "bg-secondary text-secondary-foreground hover:bg-secondary/80";

    return (
        <div 
            className={cn('px-1.5 py-0.5 rounded text-[10px] leading-tight cursor-pointer truncate', colorClasses)}
            onClick={() => onClick(event)}
        >
            {event.title}
        </div>
    );
}

export default function UnifiedCalendarPage() {
  const router = useRouter();
  const { currentUser, userRole } = useAuth();
  const { setPageContext } = usePageContext();
  const { appraisalSetups, kpiSetups, companies, employees, courses, appraisalTasks } = useMasterData();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    setPageContext('Pusat Penjadwalan', 'Tinjau semua jadwal penting perusahaan dan personal dalam satu kalender terpadu.');
  }, [setPageContext]);

  const userCompany = useMemo(() => companies.find(c => c.name === currentUser?.company), [companies, currentUser]);
  const isHoldingAdmin = useMemo(() => userRole === 'manajemen' && !!userCompany?.isHolding, [userRole, userCompany]);
  const showCompanyFilter = userRole === 'superadmin' || isHoldingAdmin;

  const isManager = useMemo(() => {
    if (!currentUser) return false;
    return employees.some(e => e.reportsTo === currentUser.id);
  }, [currentUser, employees]);

  const manageableCompanies = useMemo(() => {
      if (userRole === 'superadmin') return companies.filter(c => c.status === 'Aktif');
      if (isHoldingAdmin && userCompany) {
          const getChildCompanies = (parentId: string): Company[] => companies.filter(c => c.parentId === parentId).flatMap(c => [c, ...getChildCompanies(c.id)]);
          return [userCompany, ...getChildCompanies(userCompany.id)];
      }
      if (userCompany) return [userCompany];
      return [];
  }, [userRole, isHoldingAdmin, userCompany, companies]);

  useEffect(() => {
    if (!showCompanyFilter && userCompany) {
      setSelectedCompanyId(userCompany.id);
    }
  }, [showCompanyFilter, userCompany]);
  
  const groupedEvents = useMemo(() => {
    if (!currentUser) return new Map<string, CalendarEvent>();

    const eventsByDayAndType = new Map<string, { title: string; type: CalendarEventType; docs: any[] }>();
    const monthInterval = { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };

    let relevantKpiSetups: KpiSetup[];
    
    // --- Logic to filter relevant setups based on role ---
    if (userRole === 'superadmin') {
      relevantKpiSetups = selectedCompanyId === 'all' ? kpiSetups : kpiSetups.filter(s => s.company === companies.find(c => c.id === selectedCompanyId)?.name);
    } else if (userRole === 'manajemen') {
      const manageableCompanyNames = manageableCompanies.map(c => c.name);
      relevantKpiSetups = kpiSetups.filter(s => manageableCompanyNames.includes(s.company));
    } else { // 'user' role (atasan atau bawahan)
      const subordinateIds = employees.filter(e => e.reportsTo === currentUser.id).map(e => e.id);
      const teamIds = [currentUser.id, ...subordinateIds];
      const teamMembers = employees.filter(e => teamIds.includes(e.id));
      
      relevantKpiSetups = kpiSetups.filter(s => 
          teamMembers.some(member => 
              s.company === member.company &&
              s.department === member.department &&
              s.position === member.position &&
              s.level === member.level
          )
      );
    }
    
    relevantKpiSetups.forEach(setup => {
      if (setup.status !== 'Aktif' || !setup.kpiInputDeadline) return;
      
      const setupStart = parse(setup.validFrom, 'yyyy-MM', new Date());
      const setupEnd = lastDayOfMonth(parse(setup.validTo, 'yyyy-MM', new Date()));

      if (isWithinInterval(monthInterval.start, { start: setupStart, end: setupEnd }) ||
          isWithinInterval(monthInterval.end, { start: setupStart, end: setupEnd }) ||
          (monthInterval.start > setupStart && monthInterval.end < setupEnd)) {

            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            let deadlineDate: Date | null = null;
            const { type, value } = setup.kpiInputDeadline;

            if (type === 'last_day') {
                deadlineDate = endOfMonth(currentDate);
            } else if (type === 'relative_to_end' && value !== undefined) {
                deadlineDate = addDays(endOfMonth(currentDate), value);
            } else if (type === 'specific_date' && value !== undefined) {
                const lastDayCurrentMonth = endOfMonth(currentDate).getDate();
                deadlineDate = new Date(year, month, Math.min(value, lastDayCurrentMonth));
            }

            if (deadlineDate && isValid(deadlineDate) && isWithinInterval(deadlineDate, monthInterval)) {
                const dateKey = format(deadlineDate, 'yyyy-MM-dd');
                const eventKey = `${dateKey}_KPI`;

                if (!eventsByDayAndType.has(eventKey)) {
                    eventsByDayAndType.set(eventKey, { title: "Deadline Input KPI", type: 'KPI', docs: [] });
                }
                eventsByDayAndType.get(eventKey)!.docs.push(setup);
            }
      }
    });

    const finalEvents = new Map<string, CalendarEvent>();
    eventsByDayAndType.forEach((group, key) => {
        const [dateStr, type] = key.split('_');
        finalEvents.set(key, {
            id: key,
            title: group.title,
            date: parse(dateStr, 'yyyy-MM-dd', new Date()),
            type: group.type as CalendarEventType,
            sourceDocs: group.docs,
        });
    });

    return finalEvents;

  }, [currentUser, userRole, currentDate, selectedCompanyId, companies, appraisalSetups, courses, kpiSetups, appraisalTasks, manageableCompanies, employees]);


  const firstDay = startOfMonth(currentDate);
  const lastDay = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: firstDay, end: lastDay });
  const startingDayIndex = getDay(firstDay);
  const emptyStartDays = Array.from({ length: startingDayIndex });

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    groupedEvents.forEach(event => {
      const dateKey = format(event.date, "yyyy-MM-dd");
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(event);
    });
    return map;
  }, [groupedEvents]);

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  return (
    <ResponsivePage>
      <PageHeader 
        title="Kalender Terpadu"
        description="Pantau seluruh jadwal global, siklus perusahaan, dan agenda personal dalam satu tampilan."
        icon={CalendarDays}
        actions={
            (userRole === 'manajemen' || isManager) && (
                <Button onClick={() => router.push('/calendar/team-schedule')} className="font-bold shadow-lg">
                    <PlusCircle className="mr-2 h-4 w-4"/>
                    Buat Agenda Tim
                </Button>
            )
        }
      />

      <ResponsiveToolbar>
            <div className="flex flex-1 items-center gap-3">
                {showCompanyFilter && (
                    <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                        <SelectTrigger className="w-full sm:w-[240px] bg-background border-none shadow-sm"><CalendarIcon className="size-4 mr-2 text-primary" /><SelectValue placeholder="Filter Perusahaan" /></SelectTrigger>
                        <SelectContent className="z-[350]">
                            <SelectItem value="all">Seluruh Ekosistem</SelectItem>
                            {manageableCompanies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                )}
            </div>
             <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="size-9" onClick={() => setCurrentDate(subMonths(currentDate, 1))}><ChevronLeft size={16} /></Button>
                <h3 className="text-sm font-black uppercase tracking-widest text-center w-40">{format(currentDate, "MMMM yyyy", { locale: localeId })}</h3>
                <Button variant="outline" size="icon" className="size-9" onClick={() => setCurrentDate(addMonths(currentDate, 1))}><ChevronRight size={16} /></Button>
                <Button variant="outline" size="sm" className="h-9 font-bold text-[10px] uppercase ml-2" onClick={() => setCurrentDate(new Date())}>HARI INI</Button>
            </div>
      </ResponsiveToolbar>

      <Card className="border-border/40 shadow-sm overflow-hidden bg-background">
        <CardContent className="p-0">
            <div className="grid grid-cols-7 border-b bg-muted/10">
                {['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'].map((day) => (
                    <div key={day} className="text-center font-black text-[9px] py-3 tracking-widest text-muted-foreground border-r last:border-r-0">{day}</div>
                ))}
            </div>
            <div className="grid grid-cols-7">
                 {emptyStartDays.map((_, index) => (
                    <div key={`empty-${index}`} className="border-r border-b h-24 sm:h-32 bg-muted/5 opacity-50 last:border-r-0"></div>
                ))}
                {daysInMonth.map(day => {
                    const dateKey = format(day, "yyyy-MM-dd");
                    const dayEvents = eventsByDate.get(dateKey) || [];
                    const isTodayDate = isToday(day);

                    return (
                        <div key={day.toString()} className={cn(
                            "relative h-24 sm:h-32 border-r border-b p-1.5 flex flex-col gap-1 overflow-y-auto transition-colors",
                            isTodayDate ? "bg-primary/5" : "hover:bg-muted/5",
                            "last:border-r-0"
                        )}>
                            <span className={cn(
                                "font-black text-[10px] size-5 flex items-center justify-center rounded-lg",
                                isTodayDate ? "bg-primary text-white" : "text-muted-foreground opacity-40"
                            )}>
                                {format(day, "d")}
                            </span>
                            <div className="space-y-1">
                                {dayEvents.map(event => (
                                    <EventBadge key={event.id} event={event} onClick={handleEventClick} />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </CardContent>
      </Card>
      
      <EventDetailDialog
        event={selectedEvent}
        isOpen={!!selectedEvent}
        onOpenChange={() => setSelectedEvent(null)}
      />
    </ResponsivePage>
  );
}
