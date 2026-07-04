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
} from "@/components/ui/adaptive-layout";
import { PageHeader } from "@/components/ui/page-header";
import { AdaptiveTable } from "@/components/ui/adaptive-table";
import { 
    AdaptiveCardGrid, 
    AdaptiveMetricCard, 
    AdaptiveInsightCard 
} from "@/components/ui/adaptive-card";
import { Card, CardContent } from "@/components/ui/card";
import { useBreakpoint } from "@/hooks/use-breakpoint";

// Industrial Palette: Scale of grays + Single Indigo Accent
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
    <ResponsivePage>
      <PageHeader 
        title="Dasbor Bisnis" 
        description="Monitoring pendapatan, utilitas klien, dan kesehatan langganan global secara real-time."
        icon={LayoutDashboard}
        actions={
            <Button asChild variant="outline" className="font-bold border-border bg-card shadow-sm h-9 sm:h-10 px-6 active:scale-95 transition-all">
                <Link href="/subscription-logs" className="flex items-center gap-2">
                    <Activity className="size-4 opacity-70" />
                    <span>Audit Log</span>
                </Link>
            </Button>
        }
      />

      <AdaptiveCardGrid complexity="simple">
        <AdaptiveMetricCard
          title="Estimasi Pendapatan"
          value={`Rp ${(stats.totalRevenue / 1000000).toFixed(1)}jt`}
          icon={Wallet}
          description="Total nilai paket aktif"
          color="bg-primary/10 text-primary"
          trend={{ value: 12, isUp: true }}
        />
        <AdaptiveMetricCard
          title="Berbayar"
          value={stats.activePaidSubscribers.toString()}
          icon={Crown}
          description="Perusahaan Non-Trial"
          color="bg-primary/10 text-primary"
        />
        <AdaptiveMetricCard
          title="Total Pengguna"
          value={stats.totalUsers.toString()}
          icon={Users}
          description="Akun karyawan aktif"
        />
        <AdaptiveMetricCard
          title="Tertunda"
          value={stats.pendingCount.toString()}
          icon={AlertCircle}
          description="Butuh persetujuan"
          color={stats.pendingCount > 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}
        />
      </AdaptiveCardGrid>

      <AdaptiveCardGrid complexity="complex" className="mt-8">
        <AdaptiveInsightCard 
            title="Sebaran Paket Aktif" 
            description="Perbandingan jenis paket langganan antar unit bisnis"
            icon={TrendingUp}
        >
            <div className="flex flex-col sm:flex-row items-center h-full min-h-[300px]">
                <div className="w-full sm:w-1/2 h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie 
                                data={planDistributionData} 
                                innerRadius={isMobile ? 50 : 60} 
                                outerRadius={isMobile ? 80 : 90} 
                                paddingAngle={4} 
                                dataKey="value"
                                stroke="none"
                            >
                                {planDistributionData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: '#0f1011', 
                                    borderRadius: '12px', 
                                    border: '1px solid #23252a',
                                    boxShadow: '0 8px 30px rgb(0,0,0,0.5)', 
                                    fontSize: '11px',
                                    color: '#f7f8f8'
                                }} 
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="w-full sm:w-1/2 flex flex-col gap-2 pl-0 sm:pl-6 mt-4 sm:mt-0">
                    {planDistributionData.map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-transparent hover:border-border transition-colors">
                            <div className="flex items-center gap-2">
                                <div className="size-2 rounded-full" style={{ backgroundColor: item.fill }} />
                                <span className="text-[11px] font-medium text-[#8a8f98]">{item.name}</span>
                            </div>
                            <span className="text-xs font-black text-white tnum">{item.value} Klien</span>
                        </div>
                    ))}
                </div>
            </div>
        </AdaptiveInsightCard>

        <AdaptiveInsightCard 
            title="Utilisasi Kuota User" 
            description="Persentase penggunaan slot karyawan tertinggi"
            icon={Users}
        >
            <div className="h-[300px] pt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={quotaUsageData} layout="vertical" margin={{ left: -10, right: 30, top: 0, bottom: 0 }}>
                        <XAxis type="number" domain={[0, 100]} hide />
                        <YAxis 
                            dataKey="name" 
                            type="category" 
                            tick={{ fontSize: 10, fill: '#8a8f98', fontWeight: 500 }} 
                            width={100} 
                            axisLine={false} 
                            tickLine={false} 
                        />
                        <Tooltip 
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                            contentStyle={{ 
                                backgroundColor: '#0f1011', 
                                borderRadius: '12px', 
                                border: '1px solid #23252a',
                                fontSize: '11px' 
                            }} 
                        />
                        <Bar dataKey="usage" fill={BAR_CHART_FILL} radius={[0, 4, 4, 0]} barSize={14} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </AdaptiveInsightCard>
      </AdaptiveCardGrid>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-8">
        <div className="space-y-4">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#62666d] ml-1 flex items-center gap-2">
                <Clock className="size-3.5 text-destructive" /> Segera Kedaluwarsa
            </h2>
            <AdaptiveTable
                data={expiringSoon}
                keyExtractor={(c) => c.id}
                emptyMessage="Tidak ada paket yang segera berakhir."
                columns={[
                    {
                        header: "Perusahaan",
                        cell: (c) => (
                            <div className="flex items-center gap-2.5">
                                <div className="size-8 rounded-lg bg-muted/50 flex items-center justify-center border border-border/40">
                                    <Building size={14} className="text-muted-foreground" />
                                </div>
                                <span className="font-bold text-white text-sm">{c.name}</span>
                            </div>
                        )
                    },
                    {
                        header: "Tanggal Berakhir",
                        cell: (c) => (
                            <div className="flex items-center gap-2 text-[#8a8f98] font-medium">
                                <Calendar size={14} className="opacity-40" />
                                <span className="tnum">{format(new Date(c.subscriptionExpiryDate!), "d MMM yyyy")}</span>
                            </div>
                        )
                    },
                    {
                        header: "Sisa Waktu",
                        className: "text-right",
                        cell: (c) => (
                            <Badge variant="destructive" className="font-black text-[9px] uppercase tracking-tight h-5 border-none px-2">
                                {c.daysLeft.split(' ')[0]} Hari Lagi
                            </Badge>
                        )
                    }
                ]}
                renderMobileCard={(c) => (
                    <Card className="border-destructive/20 bg-destructive/5">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="min-w-0">
                                <h3 className="font-bold text-sm text-white truncate">{c.name}</h3>
                                <p className="text-[10px] font-bold text-[#8a8f98] uppercase flex items-center gap-1 mt-1">
                                    <Calendar size={10} /> <span className="tnum">{format(new Date(c.subscriptionExpiryDate!), "d MMM yyyy")}</span>
                                </p>
                            </div>
                            <Badge variant="destructive" className="font-black text-[10px] h-6 shrink-0">{c.daysLeft.split(' ')[0]} Hari</Badge>
                        </CardContent>
                    </Card>
                )}
            />
        </div>

        <div className="space-y-4">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#62666d] ml-1 flex items-center gap-2">
                <TrendingUp className="size-3.5 text-primary" /> Histori Transaksi
            </h2>
            <AdaptiveTable
                data={latestActivity}
                keyExtractor={(log) => log.id}
                emptyMessage="Belum ada aktivitas tercatat."
                columns={[
                    {
                        header: "Waktu",
                        cell: (log) => (
                            <span className="text-[10px] font-bold text-[#8a8f98] uppercase tnum">
                                {log.timestamp?.toDate ? format(log.timestamp.toDate(), "d MMM, HH:mm") : "N/A"}
                            </span>
                        )
                    },
                    {
                        header: "Detail Aksi",
                        cell: (log) => (
                            <div className="flex flex-col gap-1">
                                <span className="font-bold text-white text-xs">{log.companyName}</span>
                                <Badge variant="outline" className="w-fit text-[8px] font-black uppercase h-4 px-1.5 border-none bg-muted/50 text-[#8a8f98]">{log.action.replace('_', ' ')}</Badge>
                            </div>
                        )
                    },
                    {
                        header: "Nilai",
                        className: "text-right",
                        cell: (log) => (
                            <span className="font-mono text-xs font-black text-white tnum">
                                Rp {log.amount.toLocaleString('id-ID')}
                            </span>
                        )
                    }
                ]}
                renderMobileCard={(log) => (
                    <Card className="border-border/40 shadow-sm bg-card">
                        <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                                <div className="min-w-0">
                                    <h4 className="font-bold text-sm text-white truncate">{log.companyName}</h4>
                                    <p className="text-[9px] font-bold text-[#8a8f98] uppercase tnum">{log.timestamp?.toDate ? format(log.timestamp.toDate(), "d MMM, HH:mm") : "N/A"}</p>
                                </div>
                                <Badge variant="secondary" className="text-[8px] font-black uppercase h-5">{log.action.replace('_', ' ')}</Badge>
                            </div>
                            <div className="flex justify-between items-center pt-3 border-t border-border/40">
                                <span className="text-[9px] font-black text-[#62666d] uppercase">Nilai Transaksi</span>
                                <span className="font-mono text-sm font-black text-primary tnum">Rp {log.amount.toLocaleString('id-ID')}</span>
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
