"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMasterData } from "@/contexts/master-data-context";
import { 
    Users, 
    Building, 
    Crown, 
    ShoppingCart, 
    Clock, 
    AlertCircle, 
    LayoutDashboard, 
    Wallet,
    TrendingUp,
    ArrowRight,
    ArrowUpRight
} from "lucide-react";
import StatCard from "@/components/dashboard/stat-card";
import { format, parse, isAfter, isBefore, addDays, formatDistanceToNowStrict } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
    Pie, 
    PieChart, 
    ResponsiveContainer, 
    Cell, 
    Bar, 
    BarChart, 
    XAxis, 
    YAxis, 
    Tooltip,
    CartesianGrid 
} from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const CHART_COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
];

export default function AdminDashboardPage() {
  const { companies, employees, subscriptionPlans, subscriptionLogs } = useMasterData();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // --- Logic: Hero Stats ---
  const stats = useMemo(() => {
    const activeCompanies = companies.filter(c => c.status === 'Aktif');
    const pendingCompanies = companies.filter(c => c.status === 'Menunggu Persetujuan');
    
    let totalRevenue = 0;
    let activePaidSubscribers = 0;

    activeCompanies.forEach(company => {
        const plan = subscriptionPlans.find(p => p.id === company.subscriptionPlanId);
        const price = company.customPrice ?? plan?.price ?? 0;
        totalRevenue += price;
        if (price > 0) activePaidSubscribers++;
    });

    const totalUsers = employees.filter(e => e.status === 'Aktif').length;

    return {
        totalRevenue,
        activePaidSubscribers,
        totalUsers,
        pendingCount: pendingCompanies.length
    };
  }, [companies, subscriptionPlans, employees]);

  // --- Logic: Plan Distribution (Donut Chart) ---
  const planDistributionData = useMemo(() => {
    const distribution: Record<string, number> = {};
    companies.forEach(c => {
        const plan = subscriptionPlans.find(p => p.id === c.subscriptionPlanId);
        const planName = plan?.name || (c.subscriptionPlanId === 'default-trial' ? 'TRIAL' : 'N/A');
        distribution[planName] = (distribution[planName] || 0) + 1;
    });

    return Object.entries(distribution).map(([name, value], index) => ({
        name,
        value,
        fill: CHART_COLORS[index % CHART_COLORS.length]
    }));
  }, [companies, subscriptionPlans]);

  // --- Logic: Quota Consumption (Bar Chart) ---
  const quotaUsageData = useMemo(() => {
    const usage = companies
        .filter(c => c.status === 'Aktif')
        .map(company => {
            const plan = subscriptionPlans.find(p => p.id === company.subscriptionPlanId);
            const userLimit = company.customUserLimit ?? plan?.userLimit ?? 5;
            const currentUsers = employees.filter(e => e.company === company.name && e.role === 'user').length;
            
            const usagePercent = userLimit === -1 ? 0 : (currentUsers / userLimit) * 100;

            return {
                name: company.name,
                usage: parseFloat(usagePercent.toFixed(1)),
                label: `${currentUsers}/${userLimit === -1 ? '∞' : userLimit}`
            };
        })
        .sort((a, b) => b.usage - a.usage)
        .slice(0, 5); // Top 5 consumers

    return usage;
  }, [companies, subscriptionPlans, employees]);

  // --- Logic: Expiring Soon ---
  const expiringSoon = useMemo(() => {
    const now = new Date();
    const threshold = addDays(now, 30);

    return companies
        .filter(c => {
            if (!c.subscriptionExpiryDate || c.status !== 'Aktif') return false;
            const expiry = new Date(c.subscriptionExpiryDate);
            return isAfter(expiry, now) && isBefore(expiry, threshold);
        })
        .map(c => ({
            ...c,
            daysLeft: formatDistanceToNowStrict(new Date(c.subscriptionExpiryDate!), { unit: 'day', locale: localeId })
        }))
        .sort((a, b) => new Date(a.subscriptionExpiryDate!).getTime() - new Date(b.subscriptionExpiryDate!).getTime());
  }, [companies]);

  // --- Logic: Latest Activity ---
  const latestActivity = useMemo(() => {
    return [...subscriptionLogs]
        .sort((a, b) => {
            const tA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
            const tB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
            return tB - tA;
        })
        .slice(0, 5);
  }, [subscriptionLogs]);

  if (!isClient) return null;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <Card className="shadow-lg border-t-4 border-primary">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                      <LayoutDashboard className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                      <CardTitle className="font-headline text-2xl">Dasbor Bisnis & Kuota</CardTitle>
                      <CardDescription>Monitoring pendapatan, utilitas klien, dan kesehatan langganan global.</CardDescription>
                  </div>
              </div>
              <div className="flex items-center gap-2">
                  <Button asChild variant="outline" size="sm">
                      <Link href="/subscription-logs">Lihat Audit Log <ArrowUpRight className="ml-2 size-3" /></Link>
                  </Button>
              </div>
          </div>
        </CardHeader>
      </Card>

      {/* Hero Stats */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Estimasi Revenue"
          value={`Rp ${(stats.totalRevenue / 1000000).toFixed(1)}jt`}
          icon={Wallet}
          description="Total nilai paket aktif"
          iconColor="text-emerald-500"
        />
        <StatCard
          title="Langganan Berbayar"
          value={stats.activePaidSubscribers.toString()}
          icon={Crown}
          description="Perusahaan Non-Trial"
          iconColor="text-amber-500"
        />
        <StatCard
          title="Total User Sistem"
          value={stats.totalUsers.toString()}
          icon={Users}
          description="Akun karyawan aktif"
          iconColor="text-blue-500"
        />
        <StatCard
          title="Pending Aktivasi"
          value={stats.pendingCount.toString()}
          icon={AlertCircle}
          description="Butuh persetujuan"
          iconColor={stats.pendingCount > 0 ? "text-rose-500" : "text-muted-foreground"}
        />
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Plan Distribution */}
        <Card className="lg:col-span-5 shadow-lg flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Sebaran Paket Aktif</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={planDistributionData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {planDistributionData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />
                            ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-3 pr-4">
                    {planDistributionData.map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <div className="size-3 rounded-full" style={{ backgroundColor: item.fill }} />
                            <span className="text-xs font-bold text-foreground/70 uppercase">{item.name}</span>
                            <span className="text-xs font-black ml-auto">{item.value}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>

        {/* Quota Consumers */}
        <Card className="lg:col-span-7 shadow-lg flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Utilisasi Kuota User Tertinggi</CardTitle>
                <CardDescription>Top 5 perusahaan dengan penggunaan kuota user paling banyak (%).</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pt-4">
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={quotaUsageData} layout="vertical" margin={{ left: 20, right: 40 }}>
                        <XAxis type="number" domain={[0, 100]} hide />
                        <YAxis 
                            dataKey="name" 
                            type="category" 
                            tick={{ fontSize: 10, fontWeight: 700 }} 
                            width={100}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip cursor={{ fill: 'transparent' }} />
                        <Bar 
                            dataKey="usage" 
                            fill="hsl(var(--primary))" 
                            radius={[0, 4, 4, 0]} 
                            barSize={20}
                            label={{ 
                                position: 'right', 
                                fontSize: 10, 
                                fontWeight: 800, 
                                formatter: (val: any, entry: any) => {
                                    // Defensively check for nested payload to avoid undefined errors
                                    return entry?.payload?.label || val;
                                }
                            }}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiring Soon */}
        <Card className="shadow-lg border-l-4 border-l-rose-500">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="size-4 text-rose-500" />
                        Akan Kedaluwarsa
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] uppercase font-black">{expiringSoon.length} Klien</Badge>
                </div>
                <CardDescription>Klien yang masa aktifnya habis dalam 30 hari ke depan.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead className="text-[10px] font-black uppercase pl-6">Perusahaan</TableHead>
                            <TableHead className="text-[10px] font-black uppercase">Berakhir</TableHead>
                            <TableHead className="text-right text-[10px] font-black uppercase pr-6">Sisa Hari</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {expiringSoon.length > 0 ? expiringSoon.map(c => (
                            <TableRow key={c.id}>
                                <TableCell className="pl-6 font-bold text-sm">{c.name}</TableCell>
                                <TableCell className="text-xs">{format(new Date(c.subscriptionExpiryDate!), "d MMM yyyy")}</TableCell>
                                <TableCell className="text-right pr-6">
                                    <Badge variant="destructive" className="text-[10px] font-black">{c.daysLeft}</Badge>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground text-xs italic">
                                    Tidak ada paket yang segera berakhir.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        {/* Latest Activity */}
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="size-4 text-primary" />
                    Aktivitas Transaksi Terakhir
                </CardTitle>
                <CardDescription>Log histori pembaruan paket dan registrasi terbaru.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead className="text-[10px] font-black uppercase pl-6">Waktu</TableHead>
                            <TableHead className="text-[10px] font-black uppercase">Aksi</TableHead>
                            <TableHead className="text-right text-[10px] font-black uppercase pr-6">Nilai (Rp)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {latestActivity.length > 0 ? latestActivity.map(log => (
                            <TableRow key={log.id}>
                                <TableCell className="pl-6 text-[10px] font-medium text-muted-foreground">
                                    {log.timestamp?.toDate ? format(log.timestamp.toDate(), "d MMM, HH:mm") : "N/A"}
                                </TableCell>
                                <TableCell>
                                    <p className="text-xs font-bold leading-none mb-1">{log.companyName}</p>
                                    <Badge variant="outline" className="text-[8px] h-4 leading-none uppercase font-black bg-primary/5 text-primary border-primary/20">
                                        {log.action.replace('_', ' ')}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right pr-6 font-mono text-xs font-bold">
                                    {log.amount.toLocaleString('id-ID')}
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground text-xs italic">
                                    Belum ada aktivitas tercatat.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
