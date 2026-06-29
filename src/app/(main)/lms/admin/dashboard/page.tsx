// src/app/(main)/lms/admin/dashboard/page.tsx
"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { GraduationCap, BookOpen, Users, CheckCircle2, TrendingUp, Award, Clock } from "lucide-react";
import StatCard from "@/components/dashboard/stat-card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell, Line, LineChart } from "recharts";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subMonths, isAfter, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";

export default function LmsAdminDashboardPage() {
  const { courses, enrollments, employees, companies, userRole, currentUser } = useMasterData();
  const { userRole: authRole } = useAuth();
  
  // Filter state
  const [selectedCompany, setSelectedCompany] = useState<string>("all");

  // Filter lists based on role
  const isSuperAdmin = authRole === 'superadmin';
  const isAdminHolding = authRole === 'manajemen' && companies.find(c => c.name === currentUser?.company)?.isHolding;
  
  const showCompanyFilter = isSuperAdmin || isAdminHolding;

  // Filtered Data
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

  // Stats Calculations
  const totalCourses = filteredCourses.length;
  const totalParticipants = new Set(filteredEnrollments.map(en => en.employeeId)).size;
  const completions = filteredEnrollments.filter(en => en.status === 'completed').length;
  const completionRate = filteredEnrollments.length > 0 
    ? Math.round((completions / filteredEnrollments.length) * 100) 
    : 0;

  // Tren Aktivitas (5 bulan terakhir)
  const activityTrendData = useMemo(() => {
    const months = Array.from({ length: 5 }, (_, i) => subMonths(new Date(), 4 - i));
    return months.map(month => {
      const monthStr = format(month, 'MMM');
      const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
      const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);

      const monthEnrollments = filteredEnrollments.filter(en => {
        const date = en.startedAt?.toDate ? en.startedAt.toDate() : (en.startedAt ? new Date(en.startedAt) : null);
        return date && date >= startOfMonth && date <= endOfMonth;
      }).length;

      const monthCompletions = filteredEnrollments.filter(en => {
        const date = en.completedAt?.toDate ? en.completedAt.toDate() : (en.completedAt ? new Date(en.completedAt) : null);
        return en.status === 'completed' && date && date >= startOfMonth && date <= endOfMonth;
      }).length;

      return { name: monthStr, enrollments: monthEnrollments, completions: monthCompletions };
    });
  }, [filteredEnrollments]);

  // Kursus Terpopuler
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

  // Aktivitas Terbaru
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
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            Dasbor Admin LMS
          </h1>
          <p className="text-muted-foreground">
            Pantau progres pembelajaran dan efektivitas konten edukasi.
          </p>
        </div>

        {showCompanyFilter && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Perusahaan:</span>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Semua Perusahaan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Perusahaan</SelectItem>
                {companies.map(c => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Kursus" 
          value={totalCourses.toString()} 
          icon={BookOpen} 
          description="Kursus tersedia"
          iconColor="text-blue-500"
        />
        <StatCard 
          title="Karyawan Belajar" 
          value={totalParticipants.toString()} 
          icon={Users} 
          description="Partisipan aktif"
          iconColor="text-green-500"
        />
        <StatCard 
          title="Tingkat Kelulusan" 
          value={`${completionRate}%`} 
          icon={CheckCircle2} 
          description={`${completions} kursus selesai`}
          iconColor="text-orange-500"
        />
        <StatCard 
          title="Total Pendaftaran" 
          value={filteredEnrollments.length.toString()} 
          icon={TrendingUp} 
          description="Akumulasi pendaftaran"
          iconColor="text-purple-500"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Activity Trend Chart */}
        <Card className="lg:col-span-4 shadow-lg border-l-4 border-primary">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Tren Aktivitas Belajar
            </CardTitle>
            <CardDescription>Perbandingan pendaftaran dan penyelesaian kursus bulanan.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityTrendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Line type="monotone" dataKey="enrollments" name="Pendaftaran" stroke="hsl(var(--chart-1))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="completions" name="Penyelesaian" stroke="hsl(var(--chart-2))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Popular Courses Chart */}
        <Card className="lg:col-span-3 shadow-lg border-l-4 border-primary">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4" />
              Kursus Terpopuler
            </CardTitle>
            <CardDescription>Berdasarkan jumlah partisipan aktif.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {popularCoursesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={popularCoursesData} layout="vertical" margin={{ left: -20, right: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
                    />
                    <Bar dataKey="students" name="Peserta" radius={[0, 4, 4, 0]} barSize={20}>
                      {popularCoursesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm italic">
                  Belum ada data pendaftaran.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Log */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-base">Aktivitas Terbaru</CardTitle>
          <CardDescription>Riwayat interaksi karyawan dalam LMS.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivities.length > 0 ? (
            <div className="space-y-6">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">{activity.avatar}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {activity.user} <span className="font-normal text-muted-foreground">{activity.action}</span>
                    </p>
                    <p className="text-sm text-primary font-semibold">{activity.target}</p>
                  </div>
                  <div className="text-xs text-muted-foreground">{activity.time}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground italic text-sm">
              Belum ada aktivitas pembelajaran.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}