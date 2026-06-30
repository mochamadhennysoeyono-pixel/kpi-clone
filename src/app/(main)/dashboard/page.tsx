"use client";

import { useState, useMemo, useEffect } from "react";
import { useMasterData } from "@/contexts/master-data-context";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
    Users, 
    Crown, 
    Wallet,
    AlertCircle, 
    ArrowUpRight,
    Clock,
    TrendingUp
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


// =================================================================
// CONTEXT: APP DASHBOARD - Denser UI Components
// =================================================================

const PageHeader = ({ title, description, children }) => (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        {children && <div>{children}</div>}
    </div>
);

const StatBlock = ({ title, value, description, icon: Icon, iconColor }) => (
    <div className="p-4">
        <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
            <Icon className={`size-4 ${iconColor || 'text-slate-400'}`} />
        </div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500 mt-1">{description}</p>
    </div>
);

// --- CHART CONFIG (keeping it neutral) --- //
const CHART_COLORS = ["#1e293b", "#475569", "#64748b", "#94a3b8", "#cbd5e1"];
const BAR_CHART_FILL = "#1e293b";

export default function AdminDashboardPage() {
  const { companies, employees, subscriptionPlans, subscriptionLogs } = useMasterData();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // All business logic remains the same, no changes here
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
    const distribution = {};
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
        .map(c => ({ ...c, daysLeft: formatDistanceToNowStrict(new Date(c.subscriptionExpiryDate), { unit: 'day', locale: localeId }) }))
        .sort((a, b) => new Date(a.subscriptionExpiryDate).getTime() - new Date(b.subscriptionExpiryDate).getTime());
  }, [companies]);

  const latestActivity = useMemo(() => {
    return [...subscriptionLogs].sort((a, b) => (b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0) - (a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0)).slice(0, 5);
  }, [subscriptionLogs]);

  if (!isClient) return null;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <PageHeader 
        title="Dasbor Bisnis" 
        description="Monitoring pendapatan, utilitas klien, dan kesehatan langganan global."
      >
        <Button asChild size="sm" className="bg-slate-900 text-white hover:bg-slate-800 active:scale-95">
            <Link href="/subscription-logs">Lihat Audit Log <ArrowUpRight className="ml-2 size-3" /></Link>
        </Button>
      </PageHeader>

      {/* --- REFACTORED: Hero Stats (Dense) --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-slate-200 rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <StatBlock
          title="Estimasi Revenue"
          value={`Rp ${(stats.totalRevenue / 1000000).toFixed(1)}jt`}
          icon={Wallet}
          description="Total nilai paket aktif"
          iconColor="text-emerald-500"
        />
        <StatBlock
          title="Langganan Berbayar"
          value={stats.activePaidSubscribers.toString()}
          icon={Crown}
          description="Perusahaan Non-Trial"
          iconColor="text-amber-500"
        />
        <StatBlock
          title="Total User Sistem"
          value={stats.totalUsers.toString()}
          icon={Users}
          description="Akun karyawan aktif"
        />
        <StatBlock
          title="Pending Aktivasi"
          value={stats.pendingCount.toString()}
          icon={AlertCircle}
          description="Butuh persetujuan"
          iconColor={stats.pendingCount > 0 ? "text-rose-500" : "text-slate-400"}
        />
      </div>

      {/* --- REFACTORED: Analytics Section (Dense) --- */}
      <div className="space-y-6 pt-6 border-t border-slate-200">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Plan Distribution */}
            <div className="lg:col-span-5">
                <h2 className="text-sm font-semibold text-slate-600 mb-3">Sebaran Paket Aktif</h2>
                <div className="w-full h-[300px] flex items-center">
                    <ResponsiveContainer width="60%" height="100%">
                        <PieChart>
                            <Pie data={planDistributionData} innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                                {planDistributionData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.fill} />)}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col gap-3 w-[40%] pl-4">
                        {planDistributionData.map((item, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <div className="size-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                                <span className="text-xs font-medium text-slate-600 uppercase">{item.name}</span>
                                <span className="text-xs font-bold ml-auto text-slate-800">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quota Consumers */}
            <div className="lg:col-span-7">
                 <h2 className="text-sm font-semibold text-slate-600 mb-1">Utilisasi Kuota User Tertinggi</h2>
                 <p className="text-xs text-slate-500 mb-3">Top 5 perusahaan dengan penggunaan kuota user terbanyak (%).</p>
                <div className="w-full h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={quotaUsageData} layout="vertical" margin={{ left: 10, right: 30 }}>
                            <XAxis type="number" domain={[0, 100]} hide />
                            <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#475569' }} width={80} axisLine={false} tickLine={false} />
                            <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                            <Bar dataKey="usage" fill={BAR_CHART_FILL} radius={[4, 4, 4, 4]} barSize={16} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* --- REFACTORED: Tables Row (Dense) --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6 border-t border-slate-200">
            <div>
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-1">
                    <Clock className="size-4 text-rose-500" />
                    Akan Kedaluwarsa ({expiringSoon.length})
                </h2>
                <p className="text-sm text-slate-500 mb-3">Klien yang masa aktifnya habis dalam 30 hari ke depan.</p>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                     <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="pl-4 text-xs">Perusahaan</TableHead>
                                <TableHead className="text-xs">Berakhir</TableHead>
                                <TableHead className="text-right pr-4 text-xs">Sisa Hari</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {expiringSoon.length > 0 ? expiringSoon.map(c => (
                                <TableRow key={c.id} className="hover:bg-slate-50">
                                    <TableCell className="pl-4 font-medium text-sm text-slate-800">{c.name}</TableCell>
                                    <TableCell className="text-sm text-slate-600">{format(new Date(c.subscriptionExpiryDate), "d MMM yyyy")}</TableCell>
                                    <TableCell className="text-right pr-4">
                                        <Badge variant="destructive" className="text-xs">{c.daysLeft.split(' ')[0]} hari</Badge>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={3} className="h-24 text-center text-slate-500 text-sm italic">Tidak ada paket yang segera berakhir.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
            <div>
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-1">
                    <TrendingUp className="size-4 text-slate-500" />
                    Aktivitas Transaksi Terakhir
                </h2>
                <p className="text-sm text-slate-500 mb-3">Log histori pembaruan paket & registrasi.</p>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="pl-4 text-xs">Waktu</TableHead>
                                <TableHead className="text-xs">Aksi</TableHead>
                                <TableHead className="text-right pr-4 text-xs">Nilai (Rp)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {latestActivity.length > 0 ? latestActivity.map(log => (
                                <TableRow key={log.id} className="hover:bg-slate-50">
                                    <TableCell className="pl-4 text-xs font-medium text-slate-500">
                                        {log.timestamp?.toDate ? format(log.timestamp.toDate(), "d MMM, HH:mm") : "N/A"}
                                    </TableCell>
                                    <TableCell>
                                        <p className="text-sm font-medium leading-tight text-slate-800">{log.companyName}</p>
                                        <Badge variant="outline" className="text-[9px] uppercase font-semibold mt-0.5">{log.action.replace('_', ' ')}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-4 font-mono text-sm font-semibold text-slate-800">
                                        {log.amount.toLocaleString('id-ID')}
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={3} className="h-24 text-center text-slate-500 text-sm italic">Belum ada aktivitas tercatat.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
