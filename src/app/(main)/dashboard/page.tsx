"use client";

import { useState, useMemo, useEffect } from "react";
import { useMasterData } from "@/contexts/master-data-context";
import { 
    Users, 
    Crown, 
    Wallet,
    AlertCircle, 
    Clock,
    TrendingUp,
    Building,
    Calendar,
    Activity,
    LayoutDashboard,
    ArrowRight,
    Search,
    History
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
} from "@/components/ui/adaptive-layout";
import { PageHeader } from "@/components/ui/page-header";
import { AdaptiveTable } from "@/components/ui/adaptive-table";
import { 
    AdaptiveCardGrid, 
    AdaptiveMetricCard, 
    AdaptiveInsightCard 
} from "@/components/ui/adaptive-card";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { cn } from "@/lib/utils";

// Industrial Palette - Light Edition
const CHART_COLORS = ["#533afd", "#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0"];

export default function AdminDashboardPage() {
  const { companies, employees, subscriptionPlans, subscriptionLogs } = useMasterData();
  const { isMobile } = useBreakpoint();
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
        const planName = plan?.name || (c.subscriptionPlanId === 'default-trial' ? 'Trial' : 'N/A');
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
        title="Workbench Bisnis" 
        description="Pusat kendali operasional dan monitoring kesehatan ekosistem klien."
        icon={LayoutDashboard}
        actions={
            <Button asChild variant="outline" className="font-bold border-border bg-background shadow-sm h-9 px-4 text-[11px] active:scale-95 transition-all">
                <Link href="/subscription-logs" className="flex items-center gap-2">
                    <Activity className="size-3.5 text-primary" />
                    <span>Audit System Log</span>
                </Link>
            </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 border border-border rounded-2xl overflow-hidden bg-card divide-x divide-y md:divide-y-0 divide-border shadow-sm">
          <div className="p-5 sm:p-8 space-y-2 group hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2 text-muted-foreground font-black text-[9px] uppercase tracking-[0.2em]">
                <Wallet size={12} className="text-primary" /> Estimasi Pendapatan
              </div>
              <div className="flex items-baseline gap-2">
                  <h3 className="text-xl sm:text-3xl font-black text-foreground tnum">Rp {(stats.totalRevenue / 1000000).toFixed(1)}jt</h3>
                  <span className="text-[10px] font-bold text-green-600 tnum">+12%</span>
              </div>
              <p className="text-[9px] font-bold text-muted-foreground/60 uppercase">Nilai paket aktif tahunan</p>
          </div>
          <div className="p-5 sm:p-8 space-y-2 group hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2 text-muted-foreground font-black text-[9px] uppercase tracking-[0.2em]">
                <Crown size={12} className="text-primary" /> Klien Berbayar
              </div>
              <h3 className="text-xl sm:text-3xl font-black text-foreground tnum">{stats.activePaidSubscribers}</h3>
              <p className="text-[9px] font-bold text-muted-foreground/60 uppercase">Entitas non-trial</p>
          </div>
          <div className="p-5 sm:p-8 space-y-2 group hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2 text-muted-foreground font-black text-[9px] uppercase tracking-[0.2em]">
                <Users size={12} /> Total Pengguna
              </div>
              <h3 className="text-xl sm:text-3xl font-black text-foreground tnum">{stats.totalUsers}</h3>
              <p className="text-[9px] font-bold text-muted-foreground/60 uppercase">Akun staff aktif global</p>
          </div>
          <div className="p-5 sm:p-8 space-y-2 group hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2 text-muted-foreground font-black text-[9px] uppercase tracking-[0.2em]">
                <AlertCircle size={12} className={cn(stats.pendingCount > 0 ? "text-rose-500" : "")} /> Butuh Aktivasi
              </div>
              <h3 className={cn("text-xl sm:text-3xl font-black tnum", stats.pendingCount > 0 ? "text-rose-500" : "text-foreground")}>{stats.pendingCount}</h3>
              <p className="text-[9px] font-bold text-muted-foreground/60 uppercase">Pendaftaran tertunda</p>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-10">
        <div className="lg:col-span-8">
            <AdaptiveInsightCard 
                title="Sebaran Portfolio Klien" 
                description="Dominasi paket langganan antar unit bisnis"
                icon={TrendingUp}
            >
                <div className="flex flex-col sm:flex-row items-center h-[350px]">
                    <div className="w-full sm:w-1/2 h-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={planDistributionData} 
                                    innerRadius={75} 
                                    outerRadius={105} 
                                    paddingAngle={4} 
                                    dataKey="value"
                                    stroke="#fff"
                                    strokeWidth={2}
                                >
                                    {planDistributionData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#fff', 
                                        borderRadius: '12px', 
                                        border: '1px solid #ebebeb',
                                        fontSize: '11px',
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)'
                                    }} 
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="w-full sm:w-1/2 grid grid-cols-1 gap-2 pl-0 sm:pl-10">
                        {planDistributionData.map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-border hover:bg-muted/30 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="size-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                                    <span className="text-xs font-bold text-foreground/70 uppercase tracking-tight">{item.name}</span>
                                </div>
                                <span className="text-xs font-black text-foreground tnum">{item.value} Unit</span>
                            </div>
                        ))}
                    </div>
                </div>
            </AdaptiveInsightCard>
        </div>

        <div className="lg:col-span-4">
            <AdaptiveInsightCard 
                title="Utilisasi Kuota Staff" 
                description="Persentase pemakaian slot karyawan"
                icon={Users}
            >
                <div className="h-[350px] pt-4 space-y-6">
                    {quotaUsageData.map((item, i) => (
                        <div key={i} className="space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                <span className="text-muted-foreground truncate pr-6">{item.name}</span>
                                <span className="text-foreground tnum">{item.label}</span>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary transition-all duration-500" style={{ width: `${item.usage}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
            </AdaptiveInsightCard>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 mt-10">
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                    <Clock className="size-3.5 text-rose-500" /> System Alerts: Expiring Soon
                </h2>
                <Link href="/master-data/company" className="text-[10px] font-black text-primary hover:underline uppercase tracking-tighter">Kelola Klien <ArrowRight size={10} className="inline ml-1" /></Link>
            </div>
            <div className="border border-border rounded-2xl overflow-hidden bg-card shadow-sm">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow className="border-border">
                            <TableHead className="text-[10px] font-black uppercase py-4 px-6">Nama Klien</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-right pr-8">Status Kedaluwarsa</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {expiringSoon.length > 0 ? expiringSoon.map(c => (
                            <TableRow key={c.id} className="border-border hover:bg-muted/20">
                                <TableCell className="py-5 px-6">
                                    <div className="font-bold text-sm text-foreground">{c.name}</div>
                                    <div className="text-[10px] font-medium text-muted-foreground uppercase mt-1 font-mono tracking-tight">{format(new Date(c.subscriptionExpiryDate!), "d MMM yyyy")}</div>
                                </TableCell>
                                <TableCell className="text-right pr-8">
                                    <Badge variant="destructive" className="font-black text-[9px] uppercase h-6 border-none px-2.5 rounded-full shadow-sm">
                                        {c.daysLeft.split(' ')[0]} Hari Lagi
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={2} className="h-40 text-center text-xs font-medium text-muted-foreground italic">Sistem aman, tidak ada paket kritis dalam waktu dekat.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>

        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                    <History className="size-3.5 text-primary" /> Live Audit Trail
                </h2>
                <Link href="/subscription-logs" className="text-[10px] font-black text-primary hover:underline uppercase tracking-tighter">Semua Log <ArrowRight size={10} className="inline ml-1" /></Link>
            </div>
            <div className="border border-border rounded-2xl overflow-hidden bg-card shadow-sm">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow className="border-border">
                            <TableHead className="text-[10px] font-black uppercase py-4 px-6">Aktivitas</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-right pr-8">Nilai (IDR)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {latestActivity.map(log => (
                            <TableRow key={log.id} className="border-border hover:bg-muted/20">
                                <TableCell className="py-5 px-6">
                                    <div className="flex items-center gap-2">
                                        <div className="text-sm font-bold text-foreground">{log.companyName}</div>
                                        <Badge variant="outline" className="text-[8px] h-4 px-1.5 font-black bg-muted border-none text-muted-foreground uppercase">{log.action}</Badge>
                                    </div>
                                    <div className="text-[10px] font-medium text-muted-foreground uppercase mt-1 font-mono tracking-tight">
                                        {log.timestamp?.toDate ? format(log.timestamp.toDate(), "d MMM, HH:mm") : "N/A"}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right pr-8">
                                    <span className="font-mono text-sm font-black text-primary tnum">
                                        {log.amount.toLocaleString('id-ID')}
                                    </span>
                                </TableCell>
                            </TableRow>
                        ))}
                        {latestActivity.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={2} className="h-40 text-center text-xs font-medium text-muted-foreground italic">Belum ada aktivitas tercatat.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
      </div>
    </ResponsivePage>
  );
}