
// src/app/(main)/subscription-status/page.tsx
"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { 
    Crown, 
    Users, 
    Shield, 
    ShoppingCart, 
    CheckCircle2, 
    XCircle,
    ClipboardCheck,
    Target,
    GraduationCap,
    LayoutGrid,
    Bot,
    FileText,
    GitMerge,
    Info,
    History,
    Clock,
    ArrowRight,
    ChevronLeft,
    Wallet
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNowStrict, format, parseISO, isValid } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ModuleId, Company, SubscriptionLog } from '@/types';
import { cn } from '@/lib/utils';
import { ResponsivePage } from '@/components/ui/adaptive-layout';
import { PageHeader } from '@/components/ui/page-header';
import { AdaptiveCardGrid, AdaptiveMetricCard } from '@/components/ui/adaptive-card';
import { ScrollArea } from '@/components/ui/scroll-area';

// --- Internal Components ---

function ModuleStatusCard({ 
    id, 
    name, 
    icon: Icon, 
    sub 
}: { 
    id: ModuleId, 
    name: string, 
    icon: any, 
    sub?: any 
}) {
    const isActive = sub?.status === 'active';
    const isExpired = sub?.status === 'expired';
    const isTrial = sub?.type === 'trial';

    const getRemainingDays = () => {
        if (!sub?.expiryDate) return null;
        const expiry = parseISO(sub.expiryDate);
        const now = new Date();
        if (now > expiry) return 'EXPIRED';
        return formatDistanceToNowStrict(expiry, { unit: 'day', locale: localeId });
    };

    const daysLeft = getRemainingDays();

    return (
        <Card className={cn(
            "border-border/60 shadow-sm overflow-hidden transition-all duration-300",
            isActive ? "bg-background" : "bg-muted/10 grayscale opacity-60"
        )}>
            <div className={cn("h-1.5 w-full", isActive ? "bg-primary" : "bg-slate-300")} />
            <CardContent className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                    <div className={cn(
                        "p-2 rounded-xl",
                        isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                        <Icon size={20} />
                    </div>
                    {isActive && (
                        <Badge className={cn(
                            "text-[8px] font-black uppercase h-5 px-2 border-none",
                            isTrial ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                        )}>
                            {isTrial ? 'Trial' : 'Pro'}
                        </Badge>
                    )}
                </div>

                <div className="space-y-0.5">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{name}</h4>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        {isActive ? (isTrial ? 'Akses Terbatas' : 'Lisensi Penuh') : 'Belum Aktif'}
                    </p>
                </div>

                {isActive && (
                    <div className="pt-2 space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase">
                            <span className="text-muted-foreground opacity-60">Staff Quota</span>
                            <span className="text-slate-900">{sub.quota === -1 ? '∞' : sub.quota} Akun</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-black uppercase">
                            <span className="text-muted-foreground opacity-60">Masa Aktif</span>
                            <span className={cn(isExpired ? "text-rose-600" : "text-primary")}>
                                {daysLeft}
                            </span>
                        </div>
                        {isExpired && (
                            <Button asChild size="sm" variant="destructive" className="w-full h-8 text-[9px] font-black uppercase tracking-widest mt-2">
                                <Link href={`/subscription-plans?companyId=${id}`}>REAKTIVASI SEKARANG</Link>
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function SubscriptionStatusPage() {
    const { currentUser } = useAuth();
    const { companies, employees, subscriptionLogs, companyAdmins } = useMasterData();
    
    const company = useMemo(() => companies.find(c => c.name === currentUser?.company), [companies, currentUser]);
    
    const activeModulesCount = useMemo(() => {
        if (!company?.moduleSubscriptions) return 0;
        return Object.values(company.moduleSubscriptions).filter(s => s.status === 'active').length;
    }, [company]);

    const mgmtLimit = company?.customManagementUserLimit || 1;
    const currentMgmtCount = useMemo(() => company ? companyAdmins.filter(a => a.company === company.name).length : 0, [companyAdmins, company]);

    const myLogs = useMemo(() => {
        if (!company) return [];
        return subscriptionLogs
            .filter(log => log.companyId === company.id)
            .sort((a, b) => {
                const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(0);
                const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(0);
                return dateB.getTime() - dateA.getTime();
            });
    }, [company, subscriptionLogs]);

    const moduleCatalog = [
        { id: 'appraisal' as ModuleId, name: 'Appraisal & KPI', icon: ClipboardCheck },
        { id: 'lms' as ModuleId, name: 'Akademi LMS', icon: GraduationCap },
        { id: 'collabspace' as ModuleId, name: 'CollabSpace', icon: LayoutGrid },
    ];

    if (!company) return null;

    return (
        <ResponsivePage>
            <PageHeader 
                title="Pusat Billing & Berlangganan"
                description="Kelola seluruh inventori modul aktif, kuota staff, dan riwayat audit transaksi keuangan perusahaan Anda."
                icon={Wallet}
                actions={
                    <Button asChild variant="outline" className="font-bold border-slate-200 bg-white shadow-sm h-10 px-5">
                        <Link href="/workspace">
                            <ChevronLeft className="size-4 mr-2" strokeWidth={3} />
                            WORKSPACE
                        </Link>
                    </Button>
                }
            />

            {/* Metrics Overview */}
            <AdaptiveCardGrid complexity="simple">
                <AdaptiveMetricCard 
                    title="Modul Aktif" 
                    value={activeModulesCount} 
                    icon={LayoutGrid} 
                    color="bg-primary/10 text-primary" 
                    description="Dari 3 modul tersedia"
                />
                <AdaptiveMetricCard 
                    title="Tim Manajemen" 
                    value={`${currentMgmtCount} / ${mgmtLimit}`} 
                    icon={Shield} 
                    color="bg-indigo-500/10 text-indigo-600" 
                    description="Admin aktif saat ini"
                />
                <AdaptiveMetricCard 
                    title="Total Transaksi" 
                    value={myLogs.length} 
                    icon={History} 
                    description="Seluruh riwayat pembayaran"
                />
            </AdaptiveCardGrid>

            {/* Modular Inventory Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-primary" /> INVENTORI MODUL OPERASIONAL
                    </h3>
                    <Button asChild variant="ghost" size="sm" className="text-[10px] font-black uppercase text-primary hover:bg-primary/5">
                        <Link href="/subscription-plans?companyId=${company.id}">
                            BELI MODUL LAIN <ArrowRight size={12} className="ml-1.5" strokeWidth={3} />
                        </Link>
                    </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {moduleCatalog.map(m => (
                        <ModuleStatusCard 
                            key={m.id} 
                            id={m.id} 
                            name={m.name} 
                            icon={m.icon} 
                            sub={company.moduleSubscriptions?.[m.id]} 
                        />
                    ))}
                </div>
            </div>

            <Separator className="opacity-40" />

            {/* Full Transaction Audit Log */}
            <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1 flex items-center gap-2">
                    <History size={14} className="text-primary" /> AUDIT LOG TRANSAKSI & AKTIVASI
                </h3>
                <Card className="border-border/40 shadow-sm overflow-hidden bg-background">
                    <CardHeader className="bg-muted/30 border-b p-5">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            Riwayat Pembayaran & Perubahan Paket
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="w-full">
                            <Table>
                                <TableHeader className="bg-muted/10 border-none">
                                    <TableRow className="border-none">
                                        <TableHead className="text-[10px] font-black uppercase py-4 px-6">Timestamp</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase">Aksi / Detail</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase">Item Paket</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase text-right">Nilai (IDR)</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase text-right pr-6">Oleh</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {myLogs.length > 0 ? (
                                        myLogs.map((log) => (
                                            <TableRow key={log.id} className="border-border/40 hover:bg-muted/5 group transition-colors">
                                                <TableCell className="py-5 px-6">
                                                    <div className="font-mono text-[10px] font-bold text-slate-400">
                                                        {log.timestamp?.toDate ? format(log.timestamp.toDate(), "HH:mm:ss") : "--:--:--"}
                                                    </div>
                                                    <div className="text-[10px] font-bold text-slate-900 mt-0.5">
                                                        {log.timestamp?.toDate ? format(log.timestamp.toDate(), "dd MMM yyyy") : "-"}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={cn(
                                                        "text-[9px] font-black uppercase border-none px-1.5 h-4 shadow-sm",
                                                        log.action === 'TRIAL' ? "bg-amber-50 text-amber-700" : 
                                                        log.action === 'UPGRADE' ? "bg-emerald-50 text-emerald-700" : 
                                                        "bg-blue-50 text-blue-700"
                                                    )}>
                                                        {log.action.replace('_', ' ')}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs font-bold text-slate-700 uppercase tracking-tight">
                                                    {log.planName}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <span className="font-mono text-xs font-black text-primary tnum">
                                                        {log.amount > 0 ? `Rp ${log.amount.toLocaleString('id-ID')}` : 'FREE'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase">{log.performedBy}</p>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-40 text-center text-xs text-muted-foreground italic font-medium">
                                                Belum ada riwayat transaksi tercatat untuk unit bisnis ini.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            {/* Help Note */}
            <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 flex items-start gap-4">
                <Info size={18} className="text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-xs font-black text-slate-900 uppercase tracking-tight">Bantuan Administrasi Billing</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                        Jika Anda memerlukan bantuan terkait faktur pajak, perubahan metode pembayaran, atau kustomisasi kuota grup di luar pilihan standar, silakan hubungi tim dukungan kami melalui pusat bantuan.
                    </p>
                </div>
            </div>
        </ResponsivePage>
    );
}
