
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
    History,
    Zap,
    ShieldCheck,
    Globe
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
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { 
    ResponsivePage, 
} from "@/components/ui/adaptive-layout";
import { PageHeader } from "@/components/ui/page-header";
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
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

// Industrial Palette - Light Edition (Stripe/Linear Inspired)
const CHART_COLORS = ["#533afd", "#64748b", "#94a3b8", "#col5e1", "#e2e8f0"];

export default function AdminDashboardPage() {
  const { companies, employees, subscriptionPlans, subscriptionLogs, isLoading: isMasterLoading } = useMasterData();
  const { userRole, isLoading: isAuthLoading } = useAuth();
  const { isMobile } = useBreakpoint();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // --- ACCESS GUARD: ONLY SUPERADMIN ALLOWED ---
  useEffect(() => {
    if (!isAuthLoading && userRole && userRole !== 'superadmin') {
        console.warn("[Access Guard] Management user attempted to access Superadmin Dashboard. Redirecting to workspace.");
        router.replace('/workspace');
    }
  }, [userRole, isAuthLoading, router]);

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

  const criticalAlerts = useMemo(() => {
    const now = new Date();
    const threshold = addDays(now, 30);
    return companies.filter(c => c.subscriptionExpiryDate && c.status === 'Aktif' && isAfter(new Date(c.subscriptionExpiryDate), now) && isBefore(new Date(c.subscriptionExpiryDate), threshold))
        .map(c => ({ 
            ...c, 
            daysLeft: formatDistanceToNowStrict(new Date(c.subscriptionExpiryDate!), { unit: 'day', locale: localeId }) 
        }))
        .sort((a, b) => new Date(a.subscriptionExpiryDate!).getTime() - new Date(b.subscriptionExpiryDate!).getTime());
  }, [companies]);

  const liveActivity = useMemo(() => {
    return [...subscriptionLogs].sort((a, b) => (b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0) - (a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0)).slice(0, 6);
  }, [subscriptionLogs]);

  if (!isClient || isAuthLoading || userRole !== 'superadmin') return null;

  return (
    <ResponsivePage>
      <PageHeader 
        title="Workbench Operasional" 
        description="Oversight sistemik terhadap kesehatan portfolio klien, utilisasi infrastruktur, dan arus aktivitas real-time."
        icon={LayoutDashboard}
        actions={
            <Button asChild variant="outline" className="font-bold border-slate-200 bg-white shadow-stripe h-10 px-5 text-[11px] hover:bg-slate-50 transition-all">
                <Link href="/subscription-logs" className="flex items-center gap-2">
                    <History className="size-4 text-primary" strokeWidth={3} />
                    <span>AUDIT SYSTEM LOG</span>
                </Link>
            </Button>
        }
      />

      {/* --- High Density KPI Grid --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-slate-100 rounded-3xl overflow-hidden bg-white divide-x divide-y md:divide-y-0 divide-slate-50 shadow-stripe mb-10">
          <div className="p-6 sm:p-10 space-y-3 group hover:bg-slate-50/50 transition-colors">
              <div className="flex items-center gap-2 text-slate-400 font-black text-[9px] uppercase tracking-[0.2em]">
                <Wallet size={14} className="text-primary" strokeWidth={2.5} /> Projected ARR
              </div>
              <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl sm:text-4xl font-black text-slate-900 tnum tracking-tighter">Rp {(stats.totalRevenue / 1000000).toFixed(1)}jt</h3>
                  <Badge variant="outline" className="text-[8px] font-black bg-emerald-50 text-green-600 border-none">+12.4%</Badge>
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Estimasi pendapatan tahunan</p>
          </div>
          <div className="p-6 sm:p-10 space-y-3 group hover:bg-slate-50/50 transition-colors">
              <div className="flex items-center gap-2 text-slate-400 font-black text-[9px] uppercase tracking-[0.2em]">
                <Crown size={14} className="text-primary" strokeWidth={2.5} /> Entitas Berbayar
              </div>
              <h3 className="text-2xl sm:text-4xl font-black text-slate-900 tnum tracking-tighter">{stats.activePaidSubscribers}</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Klien dengan paket non-trial</p>
          </div>
          <div className="p-6 sm:p-10 space-y-3 group hover:bg-slate-50/50 transition-colors">
              <div className="flex items-center gap-2 text-slate-400 font-black text-[9px] uppercase tracking-[0.2em]">
                <Users size={14} /> Global Staff
              </div>
              <h3 className="text-2xl sm:text-4xl font-black text-slate-900 tnum tracking-tighter">{stats.totalUsers.toLocaleString('id-ID')}</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Akun operasional aktif global</p>
          </div>
          <div className="p-6 sm:p-10 space-y-3 group hover:bg-slate-50/50 transition-colors">
              <div className="flex items-center gap-2 text-slate-400 font-black text-[9px] uppercase tracking-[0.2em]">
                <AlertCircle size={14} className={cn(stats.pendingCount > 0 ? "text-rose-500 animate-pulse" : "")} strokeWidth={2.5} /> Pending Activation
              </div>
              <h3 className={cn("text-2xl sm:text-4xl font-black tnum tracking-tighter", stats.pendingCount > 0 ? "text-rose-600" : "text-slate-900")}>{stats.pendingCount}</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Pendaftaran butuh validasi</p>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* --- Left Column: Portfolio Analysis --- */}
        <div className="lg:col-span-8 space-y-8">
            <AdaptiveInsightCard 
                title="Portfolio Entitas & Penetrasi Paket" 
                description="Dominansi struktur langganan antar unit bisnis"
                icon={Globe}
            >
                <div className="flex flex-col md:flex-row items-center h-auto md:h-[350px] gap-8">
                    <div className="w-full md:w-1/2 h-[250px] md:h-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={planDistributionData} 
                                    innerRadius={75} 
                                    outerRadius={105} 
                                    paddingAngle={4} 
                                    dataKey="value"
                                    stroke="#fff"
                                    strokeWidth={3}
                                >
                                    {planDistributionData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#fff', 
                                        borderRadius: '16px', 
                                        border: 'none',
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        boxShadow: '0 20px 40px -10px rgb(0 0 0 / 0.1)'
                                    }} 
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="w-full md:w-1/2 grid grid-cols-1 gap-2">
                        {planDistributionData.map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-50 bg-slate-50/30 hover:border-slate-200 hover:bg-white transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="size-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-tight group-hover:text-slate-900 transition-colors">{item.name}</span>
                                </div>
                                <span className="text-xs font-black text-slate-900 tnum">{item.value} Units</span>
                            </div>
                        ))}
                    </div>
                </div>
            </AdaptiveInsightCard>

            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                        <History className="size-3.5 text-primary" strokeWidth={3} /> ARUS AKTIVITAS SISTEM (LIVE)
                    </h2>
                    <Link href="/subscription-logs" className="text-[9px] font-black text-primary hover:underline uppercase tracking-widest flex items-center gap-1">VIEW ALL LOGS <ArrowRight size={10} strokeWidth={3}/></Link>
                </div>
                <div className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-stripe">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow className="border-slate-50">
                                <TableHead className="text-[9px] font-black uppercase py-4 px-8 text-slate-400">Timestamp</TableHead>
                                <TableHead className="text-[9px] font-black uppercase text-slate-400">Entitas / Aksi</TableHead>
                                <TableHead className="text-[9px] font-black uppercase text-right pr-10 text-slate-400">Revenue (IDR)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {liveActivity.map(log => (
                                <TableRow key={log.id} className="border-slate-50 hover:bg-slate-50/30 transition-colors group">
                                    <TableCell className="py-5 px-8">
                                        <div className="font-mono text-[10px] font-bold text-slate-400">
                                            {log.timestamp?.toDate ? format(log.timestamp.toDate(), "HH:mm:ss") : "00:00:00"}
                                        </div>
                                        <div className="text-[9px] font-medium text-slate-300 uppercase mt-0.5 tracking-tighter">
                                            {log.timestamp?.toDate ? format(log.timestamp.toDate(), "dd MMM yyyy") : "-"}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <div className="text-sm font-black text-slate-800 tracking-tight">{log.companyName}</div>
                                            <div className="flex items-center gap-1.5">
                                                <Badge variant="secondary" className="text-[8px] h-4 px-1.5 font-black border-none uppercase tracking-tighter bg-slate-100 text-slate-500">{log.action}</Badge>
                                                <span className="text-[10px] font-medium text-slate-400 truncate max-w-[150px]">{log.planName}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-10">
                                        <span className="font-mono text-sm font-black text-primary tnum tracking-tighter group-hover:scale-105 transition-transform block">
                                            {log.amount > 0 ? `+${log.amount.toLocaleString('id-ID')}` : '0'}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>

        {/* --- Right Column: Infrastructure & Alerts --- */}
        <div className="lg:col-span-4 space-y-8">
            <AdaptiveInsightCard 
                title="Utilisasi Infrastruktur" 
                description="Kapasitas slot staff per entitas aktif"
                icon={Users}
            >
                <div className="h-auto py-2 space-y-7">
                    {quotaUsageData.map((item, i) => (
                        <div key={i} className="space-y-2.5">
                            <div className="flex justify-between items-end">
                                <div className="min-w-0 flex-1 pr-4">
                                    <p className="text-[10px] font-black text-slate-900 uppercase truncate tracking-tight">{item.name}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Kapasitas: <span className="font-mono">{item.label}</span></p>
                                </div>
                                <span className={cn(
                                    "text-xs font-black tnum",
                                    item.usage > 90 ? "text-rose-600" : "text-primary"
                                )}>{item.usage}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className={cn(
                                    "h-full transition-all duration-700 ease-out",
                                    item.usage > 90 ? "bg-rose-500" : "bg-primary"
                                )} style={{ width: `${item.usage}%` }} />
                            </div>
                        </div>
                    ))}
                    {quotaUsageData.length === 0 && (
                        <div className="py-10 text-center text-xs text-slate-400 italic">Belum ada data pemakaian.</div>
                    )}
                </div>
            </AdaptiveInsightCard>

            <div className="space-y-4">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2 ml-1">
                    <Clock className="size-3.5 text-rose-500" strokeWidth={3} /> SYSTEM CRITICAL ALERTS
                </h2>
                <div className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-stripe">
                    <Table>
                        <TableHeader className="bg-rose-50/30">
                            <TableRow className="border-slate-50">
                                <TableHead className="text-[9px] font-black uppercase py-4 px-6 text-rose-800">Klien Kritis</TableHead>
                                <TableHead className="text-[9px] font-black uppercase text-right pr-6 text-rose-800">Timeline</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {criticalAlerts.length > 0 ? criticalAlerts.map(c => (
                                <TableRow key={c.id} className="border-slate-50 hover:bg-rose-50/20 transition-colors">
                                    <TableCell className="py-4 px-6">
                                        <div className="font-bold text-xs text-slate-800 tracking-tight">{c.name}</div>
                                        <div className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 font-mono">{format(new Date(c.subscriptionExpiryDate!), "dd/MM/yy")}</div>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <Badge variant="destructive" className="font-black text-[8px] uppercase h-5 border-none px-2 rounded-lg">
                                            {c.daysLeft.split(' ')[0]} HARI
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={2} className="h-32 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">No Critical Alerts</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <Card className="bg-[#090e1a] text-white border-none rounded-2xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10"><Zap size={100} /></div>
                <CardContent className="p-8 space-y-6">
                    <div className="space-y-2">
                        <h4 className="text-lg font-black tracking-tighter">System Health: Optimal</h4>
                        <p className="text-xs text-slate-400 leading-relaxed font-medium">Seluruh modul operasional berjalan normal di seluruh zona waktu server.</p>
                    </div>
                    <Button asChild className="w-full h-11 bg-white text-slate-950 hover:bg-slate-100 font-black text-[10px] uppercase tracking-widest rounded-xl">
                        <Link href="/master-data/company">
                            MANAGE ENTITIES <ArrowRight size={14} className="ml-2" strokeWidth={3} />
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
      </div>
    </ResponsivePage>
  );
}
