
// src/app/(main)/company-subscription-status/[companyId]/page.tsx
"use client";

import { useMemo, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMasterData } from '@/contexts/master-data-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { 
    Crown, 
    Users, 
    Building, 
    Shield, 
    ChevronLeft, 
    Calendar, 
    ShoppingCart, 
    History, 
    ArrowRight,
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
    Clock,
    Zap
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { formatDistanceToNowStrict, format, parseISO, isValid } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from '@/lib/utils';
import type { SubscriptionPlan, Company, ModuleId, ModuleSubscription } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';

// --- Sub Components ---

function ModuleStatusCard({ 
    id, 
    name, 
    icon: Icon, 
    sub 
}: { 
    id: ModuleId, 
    name: string, 
    icon: any, 
    sub?: ModuleSubscription 
}) {
    const isActive = sub?.status === 'active';
    const isExpired = sub?.status === 'expired';
    const isTrial = sub?.type === 'trial';

    const getRemainingDays = () => {
        if (!sub?.expiryDate) return null;
        try {
            const expiry = parseISO(sub.expiryDate);
            const now = new Date();
            if (now > expiry) return 'EXPIRED';
            return formatDistanceToNowStrict(expiry, { unit: 'day', locale: localeId });
        } catch (e) {
            return 'N/A';
        }
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
                        isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                        <Icon size={20} />
                    </div>
                    {isActive && (
                        <Badge className={cn(
                            "text-[8px] font-black uppercase h-5 px-2 border-none",
                            isTrial ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                        )}>
                            {isTrial ? 'Trial' : 'Paid'}
                        </Badge>
                    )}
                </div>

                <div className="space-y-0.5">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{name}</h4>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        {isActive ? (isTrial ? 'Akses Terbatas' : 'Lisensi Penuh') : 'Modul Inaktif'}
                    </p>
                </div>

                {isActive && (
                    <div className="pt-2 space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase">
                            <span className="text-muted-foreground opacity-60">Staff Quota</span>
                            <span className="text-slate-900 font-bold">{sub.quota === -1 ? '∞' : sub.quota} Akun</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-black uppercase">
                            <span className="text-muted-foreground opacity-60">Masa Aktif</span>
                            <span className={cn("font-bold", isExpired ? "text-rose-600" : "text-primary")}>
                                {daysLeft}
                            </span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function CompanySubscriptionStatusPage() {
    const { companyId } = useParams();
    const router = useRouter();
    const { companies, employees, subscriptionPlans, subscriptionLogs, companyAdmins } = useMasterData();
    
    const company = useMemo(() => companies.find(c => c.id === companyId), [companyId, companies]);

    // Aggregate statistics
    const usage = useMemo(() => {
        if (!company) return { userCount: 0, managementCount: 0 };
        const companyEmployees = employees.filter(e => e.company === company.name && e.status === 'Aktif');
        const companyAdminsList = companyAdmins.filter(a => a.company === company.name && a.status === 'Aktif');

        return {
            userCount: companyEmployees.filter(e => e.role === 'user').length,
            managementCount: companyAdminsList.length,
        };
    }, [company, employees, companyAdmins]);

    const companyHistory = useMemo(() => {
        if (!company) return [];
        return subscriptionLogs
            .filter(log => log.companyId === company.id)
            .sort((a, b) => {
                const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(0);
                const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(0);
                return dateB.getTime() - dateA.getTime();
            });
    }, [company, subscriptionLogs]);

    const activeModulesCount = useMemo(() => {
        if (!company?.moduleSubscriptions) return 0;
        return Object.values(company.moduleSubscriptions).filter(s => s.status === 'active').length;
    }, [company]);

    const moduleCatalog = [
        { id: 'appraisal' as ModuleId, name: 'Appraisal & KPI', icon: ClipboardCheck },
        { id: 'lms' as ModuleId, name: 'Akademi LMS', icon: GraduationCap },
        { id: 'collabspace' as ModuleId, name: 'CollabSpace', icon: LayoutGrid },
    ];

    if (!company) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="animate-spin text-primary size-10" />
            </div>
        );
    }

    const mgmtLimit = company.customManagementUserLimit || 1;

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-24 px-4 sm:px-0 animate-fade-in">
             <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => router.back()} className="-ml-4 hover:bg-muted font-bold text-[10px] uppercase tracking-widest text-muted-foreground px-4">
                    <ChevronLeft className="mr-2 h-4 w-4" /> KEMBALI KE DATA KLIEN
                </Button>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black text-[10px] uppercase h-6 px-3">{company.status}</Badge>
                </div>
            </div>

            <Card className="shadow-lg overflow-hidden border-none bg-[#131b2e] text-white relative">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <Crown size={120} />
                </div>
                <CardHeader className="p-8 sm:p-10">
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">OVERVIEW LANGGANAN KLIEN</p>
                        <CardTitle className="font-headline text-3xl sm:text-4xl tracking-tighter uppercase">{company.name}</CardTitle>
                        <CardDescription className="text-slate-400 text-sm sm:text-base font-medium max-w-2xl">
                            Monitoring infrastruktur modular, utilisasi kuota personil, dan rekaman audit finansial unit bisnis.
                        </CardDescription>
                    </div>
                </CardHeader>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 bg-black/20 border-t border-white/5 backdrop-blur-md">
                    <div className="p-6 border-r border-white/5">
                        <p className="text-[9px] font-black uppercase opacity-40 tracking-widest mb-1">Modul Aktif</p>
                        <p className="text-xl font-black">{activeModulesCount} / 3</p>
                    </div>
                    <div className="p-6 border-r border-white/5">
                        <p className="text-[9px] font-black uppercase opacity-40 tracking-widest mb-1">Total Staff</p>
                        <p className="text-xl font-black">{usage.userCount} Personil</p>
                    </div>
                    <div className="p-6 border-r border-white/5">
                        <p className="text-[9px] font-black uppercase opacity-40 tracking-widest mb-1">Admin Klien</p>
                        <p className="text-xl font-black">{usage.managementCount} / {mgmtLimit}</p>
                    </div>
                    <div className="p-6">
                        <p className="text-[9px] font-black uppercase opacity-40 tracking-widest mb-1">System Health</p>
                        <div className="flex items-center gap-2">
                            <div className="size-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <p className="text-sm font-black text-emerald-400 uppercase tracking-widest">Normal</p>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Modular Inventory Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-400">
                    <Zap size={14} className="text-primary" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">INVENTORI MODUL AKTIF</h3>
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

            {/* History Table */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-400">
                    <History size={14} className="text-primary" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">LOG HISTORI TRANSAKSI KLIEN</h3>
                </div>
                <Card className="shadow-md border-border/40 overflow-hidden bg-background">
                    <CardHeader className="bg-muted/30 border-b p-5">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Arsip Aktivasi & Pembayaran</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="w-full">
                            <Table>
                                <TableHeader className="bg-muted/10 border-none">
                                    <TableRow className="border-none">
                                        <TableHead className="text-[10px] font-black uppercase py-4 px-6">Timestamp</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase">Aksi / Event</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase">Item Paket</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase text-right">Nilai (IDR)</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase text-right pr-6">Petugas</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {companyHistory.length > 0 ? (
                                        companyHistory.map((log) => (
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
                                                        {log.amount > 0 ? `+${log.amount.toLocaleString('id-ID')}` : 'FREE'}
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
        </div>
    );
}
