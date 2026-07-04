"use client";

import { useState, useMemo, useEffect } from "react";
import { useMasterData } from "@/contexts/master-data-context";
import { 
    Users, 
    Crown, 
    Wallet,
    AlertCircle, 
    ArrowUpRight,
    Clock,
    TrendingUp,
    Building,
    Calendar,
    Activity,
    LayoutDashboard
} from "lucide-react";
import { format, addDays, isAfter, isBefore, formatDistanceToNowStrict } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { 
    Pie, 
    PieChart, 
    ResponsiveContainer, 
    Cell, 
    Bar, 
    BarChart, 
    XAxis, 
    YAxis, 
    Tooltip
} from "recharts";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
    ResponsivePage, 
    ResponsiveGrid 
} from "@/components/ui/adaptive-layout";
import { PageHeader } from "@/components/ui/page-header";
import { AdaptiveTable } from "@/components/ui/adaptive-table";
import { ResponsiveStatCard } from "@/components/ui/responsive-stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBreakpoint } from "@/hooks/use-breakpoint";

// --- CHART CONFIG --- //
const CHART_COLORS = ["#1e293b", "#475569", "#64748b", "#94a3b8", "#cbd5e1"];
const BAR_CHART_FILL = "#1e293b";

export default function AdminDashboardPage() {
  const { companies, employees, subscriptionPlans, subscriptionLogs } = useMasterData();
  const { isMobile, isTablet, isLaptop } = useBreakpoint();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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
    return { totalRevenue, activePaidSubscribers, totalUsers, pendingCount: pendingCompanies.length };
  }, [companies, subscriptionPlans, employees]);

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

  const quotaUsageData = useMemo(() => {
    return companies.filter(c => c.status === 'Aktif').map(company => {
        const plan = subscriptionPlans.find(p => p.id === company.subscriptionPlanId);
        const userLimit = company.customUserLimit ?? plan?.userLimit ?? 5;
        const currentUsers = employees.filter(e => e.company === company.name && e.role === 'user').length;
        const usagePercent = userLimit === -1 ? 0 : (currentUsers / userLimit) * 100;
        return { name: company.name, usage: parseFloat(usagePercent.toFixed(1)), label: `${currentUsers}/${userLimit === -1 ? '∞' : userLimit}` };
    }).sort((a, b) => b.usage - a.usage).slice(0, 5);
  }, [companies, subscriptionPlans, employees]);

  const expiringSoon = useMemo(() => {
    const now = new Date();
    const threshold = addDays(now, 30);
    return companies.filter(c => c.subscriptionExpiryDate && c.status === 'Aktif' && isAfter(new Date(c.subscriptionExpiryDate), now) && isBefore(new Date(c.subscriptionExpiryDate), threshold))
        .map(c => ({ 
            ...c, 
            daysLeft: formatDistanceToNowStrict(new Date(c.subscriptionExpiryDate!), { unit: 'day', locale: localeId }) 
        }))
        .sort((a, b) => new Date(a.subscriptionExpiryDate!).getTime() - new Date(b.subscriptionExpiryDate!).getTime());
  }, [companies]);

  const latestActivity = useMemo(() => {
    return [...subscriptionLogs].sort((a, b) => (b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0) - (a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0)).slice(0, 5);
  }, [subscriptionLogs]);

  if (!isClient) return null;

  return (
    <ResponsivePage>
      <PageHeader 
        title="Dasbor Bisnis" 
        description="Monitoring pendapatan, utilitas klien, dan kesehatan langganan global."
        icon={LayoutDashboard}
        actions={
            <Button asChild className="font-bold shadow-lg h-10 px-6 active:scale-95">
                <Link href="/subscription-logs">
                    <Activity className="mr-2 size-4" />
                    Lihat Audit Log
                </Link>
            </Button>
        }
      />

      {/* --- HERO STATS: Adaptive Grid --- */}
      <ResponsiveGrid cols={{ xs: 1, sm: 2, md: 2, lg: 4, xl: 4 }}>
        <ResponsiveStatCard
          title="Estimasi Revenue"
          value={`Rp ${(stats.totalRevenue / 1000000).toFixed(1)}jt`}
          icon={Wallet}
          description="Total nilai paket aktif"
          color="bg-emerald-500/10 text-emerald-600"
        />
        <ResponsiveStatCard
          title="Langganan Berbayar"
          value={stats.activePaidSubscribers.toString()}
          icon={Crown}
          description="Perusahaan Non-Trial"
          color="bg-amber-500/10 text-amber-600"
        />
        <ResponsiveStatCard
          title="Total User Sistem"
          value={stats.totalUsers.toString()}
          icon={Users}
          description="Akun karyawan aktif"
        />
        <ResponsiveStatCard
          title="Pending Aktivasi"
          value={stats.pendingCount.toString()}
          icon={AlertCircle}
          description="Butuh persetujuan"
          color={stats.pendingCount > 0 ? "bg-rose-500/10 text-rose-600" : "bg-slate-100 text-slate-400"}
        />
      </ResponsiveGrid>

      {/* --- ANALYTICS SECTION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">
        {/* Plan Distribution */}
        <Card className="lg:col-span-5 shadow-sm border-border/40 overflow-hidden">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <TrendingUp size={14} className="text-primary" /> Sebaran Paket Aktif
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row items-center h-full min-h-[300px]">
                    <div className="w-full sm:w-1/2 h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={planDistributionData} 
                                    innerRadius={isMobile ? 50 : 60} 
                                    outerRadius={isMobile ? 80 : 90} 
                                    paddingAngle={3} 
                                    dataKey="value"
                                >
                                    {planDistributionData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.fill} />)}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="w-full sm:w-1/2 flex flex-col gap-2.5 pl-0 sm:pl-6 mt-4 sm:mt-0">
                        {planDistributionData.map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                                <div className="flex items-center gap-2">
                                    <div className="size-2 rounded-full" style={{ backgroundColor: item.fill }} />
                                    <span className="text-[10px] font-black uppercase text-slate-600">{item.name}</span>
                                </div>
                                <span className="text-xs font-black text-slate-900">{item.value} Klien</span>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Quota Consumers */}
        <Card className="lg:col-span-7 shadow-sm border-border/40 overflow-hidden">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Users size={14} className="text-primary" /> Utilisasi Kuota User Tertinggi (%)
                </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] pt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={quotaUsageData} layout="vertical" margin={{ left: -10, right: 30, top: 0, bottom: 0 }}>
                        <XAxis type="number" domain={[0, 100]} hide />
                        <YAxis 
                            dataKey="name" 
                            type="category" 
                            tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} 
                            width={100} 
                            axisLine={false} 
                            tickLine={false} 
                        />
                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '11px' }} />
                        <Bar dataKey="usage" fill={BAR_CHART_FILL} radius={[0, 4, 4, 0]} barSize={16} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
      </div>

      {/* --- TABLES SECTION: Adaptive Tables --- */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">
        <div className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1 flex items-center gap-2">
                <Clock className="size-3.5 text-rose-500" /> Akan Kedaluwarsa
            </h2>
            <AdaptiveTable
                data={expiringSoon}
                keyExtractor={(c) => c.id}
                emptyMessage="Tidak ada paket yang segera berakhir."
                columns={[
                    {
                        header: "Perusahaan",
                        cell: (c) => (
                            <div className="flex items-center gap-2">
                                <Building size={14} className="text-muted-foreground" />
                                <span className="font-bold text-slate-800">{c.name}</span>
                            </div>
                        )
                    },
                    {
                        header: "Tanggal Berakhir",
                        cell: (c) => (
                            <div className="flex items-center gap-2 text-slate-600">
                                <Calendar size={14} className="opacity-40" />
                                {format(new Date(c.subscriptionExpiryDate!), "d MMM yyyy")}
                            </div>
                        )
                    },
                    {
                        header: "Sisa Waktu",
                        className: "text-right",
                        cell: (c) => (
                            <Badge variant="destructive" className="font-black text-[9px] uppercase tracking-tighter h-5">
                                {c.daysLeft.split(' ')[0]} HARI LAGI
                            </Badge>
                        )
                    }
                ]}
                renderMobileCard={(c) => (
                    <Card className="border-rose-100 bg-rose-50/30">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="min-w-0">
                                <h3 className="font-black text-sm uppercase truncate">{c.name}</h3>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1 mt-0.5">
                                    <Calendar size={10} /> {format(new Date(c.subscriptionExpiryDate!), "d MMM yyyy")}
                                </p>
                            </div>
                            <Badge variant="destructive" className="font-black text-[10px] h-6 shrink-0">{c.daysLeft.split(' ')[0]} HARI</Badge>
                        </CardContent>
                    </Card>
                )}
            />
        </div>

        <div className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1 flex items-center gap-2">
                <TrendingUp className="size-3.5 text-blue-500" /> Aktivitas Transaksi
            </h2>
            <AdaptiveTable
                data={latestActivity}
                keyExtractor={(log) => log.id}
                emptyMessage="Belum ada aktivitas tercatat."
                columns={[
                    {
                        header: "Waktu",
                        cell: (log) => (
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                {log.timestamp?.toDate ? format(log.timestamp.toDate(), "d MMM, HH:mm") : "N/A"}
                            </span>
                        )
                    },
                    {
                        header: "Detail Aksi",
                        cell: (log) => (
                            <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-slate-900 text-xs">{log.companyName}</span>
                                <Badge variant="outline" className="w-fit text-[8px] font-black uppercase h-4 px-1.5 border-none bg-slate-100">{log.action.replace('_', ' ')}</Badge>
                            </div>
                        )
                    },
                    {
                        header: "Nilai (Rp)",
                        className: "text-right",
                        cell: (log) => (
                            <span className="font-mono text-xs font-black text-slate-800">
                                {log.amount.toLocaleString('id-ID')}
                            </span>
                        )
                    }
                ]}
                renderMobileCard={(log) => (
                    <Card className="border-border/40 shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <div className="min-w-0">
                                    <h4 className="font-black text-sm uppercase truncate text-slate-800">{log.companyName}</h4>
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase">{log.timestamp?.toDate ? format(log.timestamp.toDate(), "d MMM, HH:mm") : "N/A"}</p>
                                </div>
                                <Badge variant="secondary" className="text-[8px] font-black uppercase">{log.action.replace('_', ' ')}</Badge>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-dashed">
                                <span className="text-[9px] font-black text-muted-foreground uppercase">Nilai Transaksi</span>
                                <span className="font-mono text-sm font-black text-primary">Rp {log.amount.toLocaleString('id-ID')}</span>
                            </div>
                        </CardContent>
                    </Card>
                )}
            />
        </div>
      </div>
    </ResponsivePage>
  );
}
