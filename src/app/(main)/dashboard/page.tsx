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

// Industrial Palette
const CHART_COLORS = ["#533afd", "#334155", "#475569", "#64748b", "#94a3b8"];
const BAR_CHART_FILL = "#533afd";

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
    <ResponsivePage className="max-w-[1600px]">
      <PageHeader 
        title="Workbench Bisnis" 
        description="Pusat kendali operasional dan monitoring kesehatan ekosistem klien."
        icon={LayoutDashboard}
        actions={
            <Button asChild variant="outline" className="font-bold border-[#23252a] bg-[#0f1011] shadow-sm h-8 px-4 text-[10px] active:scale-95 transition-all">
                <Link href="/subscription-logs" className="flex items-center gap-2">
                    <Activity className="size-3.5 opacity-70" />
                    <span>Audit System Log</span>
                </Link>
            </Button>
        }
      />

      {/* Integrated Industrial Grid for Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 border border-[#23252a] rounded-xl overflow-hidden bg-[#0f1011] divide-x divide-y md:divide-y-0 divide-[#23252a]">
          <div className="p-5 sm:p-6 space-y-2 group hover:bg-[#141516] transition-colors">
              <div className="flex items-center gap-2 text-[#8a8f98] font-black text-[9px] uppercase tracking-[0.2em]">
                <Wallet size={12} className="text-primary" /> Estimasi Pendapatan
              </div>
              <div className="flex items-baseline gap-2">
                  <h3 className="text-xl sm:text-2xl font-black text-white tnum">Rp {(stats.totalRevenue / 1000000).toFixed(1)}jt</h3>
                  <span className="text-[9px] font-bold text-green-400 tnum">+12%</span>
              </div>
              <p className="text-[8px] font-bold text-muted-foreground uppercase opacity-40">Nilai paket aktif tahunan</p>
          </div>
          <div className="p-5 sm:p-6 space-y-2 group hover:bg-[#141516] transition-colors">
              <div className="flex items-center gap-2 text-[#8a8f98] font-black text-[9px] uppercase tracking-[0.2em]">
                <Crown size={12} className="text-primary" /> Klien Berbayar
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white tnum">{stats.activePaidSubscribers}</h3>
              <p className="text-[8px] font-bold text-muted-foreground uppercase opacity-40">Entitas non-trial</p>
          </div>
          <div className="p-5 sm:p-6 space-y-2 group hover:bg-[#141516] transition-colors">
              <div className="flex items-center gap-2 text-[#8a8f98] font-black text-[9px] uppercase tracking-[0.2em]">
                <Users size={12} /> Total Pengguna
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white tnum">{stats.totalUsers}</h3>
              <p className="text-[8px] font-bold text-muted-foreground uppercase opacity-40">Akun staff aktif global</p>
          </div>
          <div className="p-5 sm:p-6 space-y-2 group hover:bg-[#141516] transition-colors">
              <div className="flex items-center gap-2 text-[#8a8f98] font-black text-[9px] uppercase tracking-[0.2em]">
                <AlertCircle size={12} className={cn(stats.pendingCount > 0 ? "text-rose-500" : "")} /> Butuh Aktivasi
              </div>
              <h3 className={cn("text-xl sm:text-2xl font-black tnum", stats.pendingCount > 0 ? "text-rose-500" : "text-white")}>{stats.pendingCount}</h3>
              <p className="text-[8px] font-bold text-muted-foreground uppercase opacity-40">Pendaftaran tertunda</p>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">
        <div className="lg:col-span-8">
            <AdaptiveInsightCard 
                title="Sebaran Portfolio Klien" 
                description="Dominasi paket langganan antar unit bisnis"
                icon={TrendingUp}
            >
                <div className="flex flex-col sm:flex-row items-center h-[320px]">
                    <div className="w-full sm:w-1/2 h-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={planDistributionData} 
                                    innerRadius={70} 
                                    outerRadius={95} 
                                    paddingAngle={5} 
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {planDistributionData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#0f1011', 
                                        borderRadius: '8px', 
                                        border: '1px solid #23252a',
                                        fontSize: '11px',
                                        color: '#f7f8f8'
                                    }} 
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="w-full sm:w-1/2 grid grid-cols-1 gap-1.5 pl-0 sm:pl-8">
                        {planDistributionData.map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-2 rounded-lg border border-transparent hover:border-[#23252a] hover:bg-[#141516] transition-all">
                                <div className="flex items-center gap-2.5">
                                    <div className="size-2 rounded-full" style={{ backgroundColor: item.fill }} />
                                    <span className="text-[11px] font-medium text-[#8a8f98]">{item.name}</span>
                                </div>
                                <span className="text-[11px] font-black text-white tnum">{item.value} Unit</span>
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
                <div className="h-[320px] pt-2 space-y-5">
                    {quotaUsageData.map((item, i) => (
                        <div key={i} className="space-y-1.5">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tight">
                                <span className="text-[#8a8f98] truncate pr-4">{item.name}</span>
                                <span className="text-white tnum">{item.label}</span>
                            </div>
                            <div className="h-1 w-full bg-[#18191a] rounded-full overflow-hidden">
                                <div className="h-full bg-primary" style={{ width: `${item.usage}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
            </AdaptiveInsightCard>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-4">
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#62666d] flex items-center gap-2">
                    <Clock className="size-3.5 text-rose-500" /> System Alerts: Expiring
                </h2>
                <Link href="/master-data/company" className="text-[9px] font-black text-primary hover:underline uppercase tracking-tighter">Kelola Klien <ArrowRight size={10} className="inline ml-1" /></Link>
            </div>
            <div className="border border-[#23252a] rounded-xl overflow-hidden bg-[#0f1011]">
                <Table>
                    <TableHeader className="bg-[#18191a]">
                        <TableRow className="border-[#23252a]">
                            <TableHead className="text-[9px] font-black uppercase py-3">Nama Klien</TableHead>
                            <TableHead className="text-[9px] font-black uppercase text-right pr-6">Status Kedaluwarsa</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {expiringSoon.length > 0 ? expiringSoon.map(c => (
                            <TableRow key={c.id} className="border-[#23252a] hover:bg-[#141516]">
                                <TableCell className="py-4">
                                    <div className="font-bold text-xs text-white">{c.name}</div>
                                    <div className="text-[9px] font-medium text-muted-foreground uppercase mt-0.5 font-mono">{format(new Date(c.subscriptionExpiryDate!), "d MMM yyyy")}</div>
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                    <Badge variant="destructive" className="font-black text-[9px] uppercase h-5 border-none px-2 rounded-md">
                                        {c.daysLeft.split(' ')[0]} Hari Lagi
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={2} className="h-32 text-center text-[10px] font-medium text-[#62666d] italic">Sistem aman, tidak ada paket kritis.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>

        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#62666d] flex items-center gap-2">
                    <History className="size-3.5 text-primary" /> Live Audit Trail
                </h2>
                <Link href="/subscription-logs" className="text-[9px] font-black text-primary hover:underline uppercase tracking-tighter">Semua Log <ArrowRight size={10} className="inline ml-1" /></Link>
            </div>
            <div className="border border-[#23252a] rounded-xl overflow-hidden bg-[#0f1011]">
                <Table>
                    <TableHeader className="bg-[#18191a]">
                        <TableRow className="border-[#23252a]">
                            <TableHead className="text-[9px] font-black uppercase py-3">Aktivitas</TableHead>
                            <TableHead className="text-[9px] font-black uppercase text-right pr-6">Nilai (IDR)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {latestActivity.map(log => (
                            <TableRow key={log.id} className="border-[#23252a] hover:bg-[#141516]">
                                <TableCell className="py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="text-xs font-bold text-white">{log.companyName}</div>
                                        <Badge variant="outline" className="text-[7px] h-3.5 px-1 font-black bg-[#18191a] border-none text-[#8a8f98] uppercase">{log.action}</Badge>
                                    </div>
                                    <div className="text-[9px] font-medium text-muted-foreground uppercase mt-0.5 font-mono">
                                        {log.timestamp?.toDate ? format(log.timestamp.toDate(), "d MMM, HH:mm") : "N/A"}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                    <span className="font-mono text-xs font-black text-primary tnum">
                                        {log.amount.toLocaleString('id-ID')}
                                    </span>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
      </div>
    </ResponsivePage>
  );
}
