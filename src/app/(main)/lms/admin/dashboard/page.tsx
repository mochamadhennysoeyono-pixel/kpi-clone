// src/app/(main)/lms/admin/dashboard/page.tsx
"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { GraduationCap, BookOpen, Users, CheckCircle2, TrendingUp, Award, Clock, Building, Filter, LayoutGrid } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell, Line, LineChart } from "recharts";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subMonths } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ResponsivePage, ResponsiveToolbar } from "@/components/ui/adaptive-layout";
import { PageHeader } from "@/components/ui/page-header";
import { AdaptiveCardGrid, AdaptiveMetricCard, AdaptiveInsightCard } from "@/components/ui/adaptive-card";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { cn } from "@/lib/utils";

export default function LmsAdminDashboardPage() {
  const { courses, enrollments, employees, companies, currentUser } = useMasterData();
  const { userRole: authRole } = useAuth();
  const { isMobile } = useBreakpoint();
  
  const [selectedCompany, setSelectedCompany] = useState<string>("all");

  const isSuperAdmin = authRole === 'superadmin';
  const isAdminHolding = authRole === 'manajemen' && companies.find(c => c.name === currentUser?.company)?.isHolding;
  const showCompanyFilter = isSuperAdmin || isAdminHolding;

  const filteredCourses = useMemo(() => {
    if (!showCompanyFilter || selectedCompany === "all") return courses;
    return courses.filter(c => c.company === selectedCompany || c.company === "Global");
  }, [courses, selectedCompany, showCompanyFilter]);

  const filteredEmployees = useMemo(() => {
    if (!showCompanyFilter || selectedCompany === "all") return employees;
    return employees.filter(e => e.company === selectedCompany);
  }, [employees, selectedCompany, showCompanyFilter]);

  const filteredEnrollments = useMemo(() => {
    const employeeIds = new Set(filteredEmployees.map(e => e.id));
    return enrollments.filter(en => employeeIds.has(en.employeeId));
  }, [enrollments, filteredEmployees]);

  const stats = useMemo(() => {
    const totalCourses = filteredCourses.length;
    const totalParticipants = new Set(filteredEnrollments.map(en => en.employeeId)).size;
    const completions = filteredEnrollments.filter(en => en.status === 'completed').length;
    const completionRate = filteredEnrollments.length > 0 
      ? Math.round((completions / filteredEnrollments.length) * 100) 
      : 0;
    return { totalCourses, totalParticipants, completions, completionRate, totalEnrollments: filteredEnrollments.length };
  }, [filteredCourses, filteredEnrollments]);

  const activityTrendData = useMemo(() => {
    const months = Array.from({ length: 5 }, (_, i) => subMonths(new Date(), 4 - i));
    return months.map(month => {
      const monthStr = format(month, 'MMM');
      const startOfM = new Date(month.getFullYear(), month.getMonth(), 1);
      const endOfM = new Date(month.getFullYear(), month.getMonth() + 1, 0);

      const monthEnrollments = filteredEnrollments.filter(en => {
        const date = en.startedAt?.toDate ? en.startedAt.toDate() : (en.startedAt ? new Date(en.startedAt) : null);
        return date && date >= startOfM && date <= endOfM;
      }).length;

      const monthCompletions = filteredEnrollments.filter(en => {
        const date = en.completedAt?.toDate ? en.completedAt.toDate() : (en.completedAt ? new Date(en.completedAt) : null);
        return en.status === 'completed' && date && date >= startOfM && date <= endOfM;
      }).length;

      return { name: monthStr, enrollments: monthEnrollments, completions: monthCompletions };
    });
  }, [filteredEnrollments]);

  const popularCoursesData = useMemo(() => {
    const courseStats = filteredCourses.map(course => {
      const count = filteredEnrollments.filter(en => en.courseId === course.id).length;
      return { name: course.title, students: count };
    });
    return courseStats
      .sort((a, b) => b.students - a.students)
      .slice(0, 5)
      .map((item, index) => ({
        ...item,
        color: `hsl(var(--chart-${(index % 5) + 1}))`
      }));
  }, [filteredCourses, filteredEnrollments]);

  const recentActivities = useMemo(() => {
    return [...filteredEnrollments]
      .sort((a, b) => {
        const dateA = a.completedAt || a.startedAt;
        const dateB = b.completedAt || b.startedAt;
        const timeA = dateA?.toDate ? dateA.toDate().getTime() : (dateA ? new Date(dateA).getTime() : 0);
        const timeB = dateB?.toDate ? dateB.toDate().getTime() : (dateB ? new Date(dateB).getTime() : 0);
        return timeB - timeA;
      })
      .slice(0, 5)
      .map(en => {
        const emp = employees.find(e => e.id === en.employeeId);
        const course = courses.find(c => c.id === en.courseId);
        const date = en.completedAt || en.startedAt;
        const timeStr = date?.toDate ? format(date.toDate(), 'dd MMM HH:mm') : (date ? format(new Date(date), 'dd MMM HH:mm') : '-');
        
        return {
          id: en.id,
          user: emp?.name || "Karyawan",
          action: en.status === 'completed' ? "Menyelesaikan kursus" : "Mulai kursus",
          target: course?.title || "Kursus",
          time: timeStr,
          avatar: emp?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || "U"
        };
      });
  }, [filteredEnrollments, employees, courses]);

  return (
    <ResponsivePage>
      <PageHeader 
        title="Dasbor Admin LMS" 
        description="Pantau efektivitas konten dan progres pengembangan kompetensi karyawan."
        icon={GraduationCap}
      />

      <ResponsiveToolbar>
        <div className="flex flex-1 items-center gap-3">
            <Filter size={16} className="text-muted-foreground hidden sm:block shrink-0" />
            {showCompanyFilter && (
                <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                    <SelectTrigger className="w-full sm:w-[240px] bg-background border-none h-10 shadow-sm text-[11px] font-black uppercase">
                        <Building className="size-3.5 mr-2 text-primary" />
                        <SelectValue placeholder="Pilih Perusahaan" />
                    </SelectTrigger>
                    <SelectContent className="z-[350]">
                        <SelectItem value="all">Seluruh Ekosistem</SelectItem>
                        {companies.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            )}
        </div>
      </ResponsiveToolbar>

      <AdaptiveCardGrid complexity="simple">
        <AdaptiveMetricCard title="Total Kursus" value={stats.totalCourses} icon={BookOpen} color="bg-blue-500/10 text-blue-600" />
        <AdaptiveMetricCard title="Peserta Aktif" value={stats.totalParticipants} icon={Users} color="bg-emerald-500/10 text-green-600" />
        <AdaptiveMetricCard title="Kelulusan" value={`${stats.completionRate}%`} icon={CheckCircle2} description={`${stats.completions} Selesai`} color="bg-amber-500/10 text-amber-600" />
        <AdaptiveMetricCard title="Pendaftaran" value={stats.totalEnrollments} icon={TrendingUp} color="bg-purple-500/10 text-purple-600" />
      </AdaptiveCardGrid>

      <AdaptiveCardGrid complexity="complex">
        <AdaptiveInsightCard title="Tren Aktivitas Belajar" icon={TrendingUp} description="Pendaftaran vs Penyelesaian bulanan">
            <div className="h-[300px] pt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={activityTrendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                        <XAxis dataKey="name" fontSize={10} fontWeight={700} tickLine={false} axisLine={false} />
                        <YAxis fontSize={10} fontWeight={700} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        <Line type="monotone" dataKey="enrollments" name="Pendaftaran" stroke="hsl(var(--chart-1))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="completions" name="Penyelesaian" stroke="hsl(var(--chart-2))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </AdaptiveInsightCard>

        <AdaptiveInsightCard title="Kursus Terpopuler" icon={Award} description="Berdasarkan jumlah partisipan aktif">
            <div className="h-[300px] pt-4">
                {popularCoursesData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={popularCoursesData} layout="vertical" margin={{ left: -10, right: 20 }}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={80} fontSize={9} fontWeight={800} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                            <Bar dataKey="students" name="Peserta" radius={[0, 4, 4, 0]} barSize={16}>
                                {popularCoursesData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-xs italic">Belum ada data pendaftaran.</div>
                )}
            </div>
        </AdaptiveInsightCard>
      </AdaptiveCardGrid>

      <AdaptiveInsightCard title="Aktivitas Real-Time" icon={Clock} description="Riwayat interaksi terakhir dalam LMS">
          <div className="space-y-6 py-2">
            {recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-4 animate-in fade-in slide-in-from-left-2 duration-300">
                        <Avatar className="size-9 border shadow-sm shrink-0">
                            <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-black">{activity.avatar}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold leading-none text-slate-900 truncate">
                                {activity.user} <span className="font-normal text-muted-foreground">{activity.action}</span>
                            </p>
                            <p className="text-[10px] text-primary font-black uppercase tracking-tight mt-1 truncate">{activity.target}</p>
                        </div>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase shrink-0">{activity.time}</div>
                    </div>
                ))
            ) : (
                <div className="text-center py-10 text-muted-foreground italic text-xs">Belum ada aktivitas baru.</div>
            )}
          </div>
      </AdaptiveInsightCard>
    </ResponsivePage>
  );
}
