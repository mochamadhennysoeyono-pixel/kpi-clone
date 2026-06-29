
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
    Building, 
    Shield, 
    Calendar, 
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
    History
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNowStrict, format } from 'date-fns';
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
import type { SubscriptionPlan, Company, SubscriptionLog } from '@/types';
import { cn } from '@/lib/utils';


function QuotaIndicator({ label, used, limit, icon: Icon }: { label: string; used: number; limit: number; icon: React.ElementType }) {
    const isUnlimited = limit === -1;
    const percentage = isUnlimited ? 0 : (used / limit) * 100;

    return (
        <div className="space-y-2 p-4 border rounded-lg bg-background shadow-sm">
            <div className="flex justify-between items-center text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="font-bold text-foreground/70">{label}</span>
                </div>
                <span className="font-black text-foreground">{used} / {isUnlimited ? '∞' : limit}</span>
            </div>
            {!isUnlimited && <Progress value={percentage} className="h-1.5" />}
        </div>
    );
}

function FeatureStatus({ label, enabled, icon: Icon }: { label: string; enabled: boolean; icon: any }) {
    return (
        <div className={cn(
            "flex items-center justify-between p-3 rounded-xl border transition-all",
            enabled ? "bg-background border-primary/20 shadow-sm" : "bg-muted/30 opacity-40 border-dashed"
        )}>
            <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                    <Icon className="size-4" />
                </div>
                <span className="text-xs font-bold uppercase tracking-tight">{label}</span>
            </div>
            {enabled ? (
                <CheckCircle2 className="size-4 text-green-500" />
            ) : (
                <XCircle className="size-4 text-muted-foreground/30" />
            )}
        </div>
    );
}

export default function SubscriptionStatusPage() {
    const { currentUser, userRole } = useAuth();
    const { companies, employees, subscriptionPlans, subscriptionLogs } = useMasterData();
    
    const userCompany = useMemo(() => {
        if (!currentUser) return null;
        return companies.find(c => c.name === currentUser.company);
    }, [currentUser, companies]);
    
    const relevantCompany = useMemo(() => {
        if (!userCompany) return null;
        if (userCompany.parentId) {
            return companies.find(c => c.id === userCompany.parentId) || userCompany;
        }
        return userCompany;
    }, [userCompany, companies]);

    const currentPlan = useMemo(() => {
        if (!relevantCompany) return null;

        const plan = subscriptionPlans.find(p => p.id === relevantCompany.subscriptionPlanId);
        if (plan) return plan;

        if (relevantCompany.subscriptionPlanId === 'default-trial') {
            return {
                id: 'default-trial',
                name: 'TRIAL',
                title: '14 Days Free Trial',
                price: 0,
                userLimit: relevantCompany.customUserLimit ?? 5,
                managementUserLimit: relevantCompany.customManagementUserLimit ?? 2,
                companyLimit: 0,
                durationDays: 14,
                benefitList: ["Akses KPI & KBO", "Akses CollabSpace", "Fitur AI (KIPI) Aktif", "Analisis Laporan Standar"],
                features: {
                    allowHolding: false,
                    allowKpi: true,
                    allowKbo: true,
                    allowOkr: true,
                    allowReporting: true,
                    allowLms: false,
                    allowCollabSpace: true,
                    allowAiFeatures: true,
                    allowDocumentManagement: false,
                },
            } as SubscriptionPlan;
        }

        return null;
    }, [relevantCompany, subscriptionPlans]);
    
    const usageDetails = useMemo(() => {
        if (!relevantCompany) return { totalUsage: { userCount: 0, managementCount: 0, childCompanyCount: 0 }, breakdown: [] };

        const childCompanies = companies.filter(c => c.parentId === relevantCompany.id);
        const allGroupCompanies = [relevantCompany, ...childCompanies];

        const breakdown = allGroupCompanies.map(company => {
            const companyEmployees = employees.filter(e => e.company === company.name);
            return {
                companyName: company.name,
                isHolding: company.id === relevantCompany.id,
                userCount: companyEmployees.filter(e => e.role === 'user').length,
                managementCount: companyEmployees.filter(e => e.role === 'manajemen').length,
            };
        });

        const totalUsage = breakdown.reduce((acc, curr) => {
            acc.userCount += curr.userCount;
            acc.managementCount += curr.managementCount;
            return acc;
        }, { userCount: 0, managementCount: 0, childCompanyCount: childCompanies.length });

        return { totalUsage, breakdown };

    }, [relevantCompany, employees, companies]);

    const companyHistory = useMemo(() => {
        if (!relevantCompany) return [];
        return subscriptionLogs
            .filter(log => log.companyId === relevantCompany.id)
            .sort((a, b) => {
                const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(0);
                const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(0);
                return dateB.getTime() - dateA.getTime();
            });
    }, [relevantCompany, subscriptionLogs]);
    
    const isCustomized = !!(
      relevantCompany?.customPrice || 
      relevantCompany?.customUserLimit || 
      relevantCompany?.customManagementUserLimit || 
      relevantCompany?.customCompanyLimit
    );

    const finalPrice = relevantCompany?.customPrice ?? currentPlan?.price ?? 0;
    const finalUserLimit = relevantCompany?.customUserLimit ?? currentPlan?.userLimit ?? 0;
    const finalManagementLimit = relevantCompany?.customManagementUserLimit ?? currentPlan?.managementUserLimit ?? 0;
    const finalCompanyLimit = relevantCompany?.customCompanyLimit ?? currentPlan?.companyLimit ?? 0;

    const getRemainingDays = () => {
        if (!relevantCompany?.subscriptionExpiryDate) return 'N/A';
        const expiryDate = new Date(relevantCompany.subscriptionExpiryDate);
        const now = new Date();
        if (now > expiryDate) return 'Telah Berakhir';
        return formatDistanceToNowStrict(expiryDate, { unit: 'day', locale: localeId });
    };

    if (!currentUser || userRole !== 'manajemen') {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Akses Ditolak</CardTitle>
                    <CardDescription>Halaman ini hanya untuk admin perusahaan.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (!currentPlan || !relevantCompany) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Paket Tidak Ditemukan</CardTitle>
                    <CardDescription>Perusahaan Anda atau induk perusahaan Anda belum memiliki paket langganan aktif. Silakan hubungi Superadmin.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <div className="w-full max-w-5xl mx-auto space-y-6 pb-24 min-w-0 overflow-hidden">
            <Card className="shadow-lg overflow-hidden border-none bg-primary text-primary-foreground relative w-full">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <Crown className="size-24 md:size-48" />
                </div>
                <CardHeader className="p-5 md:p-8">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10 w-full">
                        <div className="space-y-2 min-w-0 flex-1">
                            <CardTitle className="font-headline text-xl md:text-3xl flex items-center gap-3">Status Langganan Aktif</CardTitle>
                            <CardDescription className="text-primary-foreground/80 text-xs md:text-base max-w-full break-words">
                                Detail kuota dan fitur untuk grup perusahaan <strong>{relevantCompany.name}</strong>.
                            </CardDescription>
                        </div>
                        <Button asChild variant="secondary" className="font-bold h-10 md:h-12 px-6 md:px-8 shadow-xl w-full md:w-auto shrink-0">
                            <Link href={`/subscription-plans?companyId=${userCompany?.id}`}>
                                <ShoppingCart className="mr-2 size-4 md:size-5" />
                                Upgrade / Ganti Paket
                            </Link>
                        </Button>
                    </div>
                </CardHeader>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-black/20 border-t border-white/10 backdrop-blur-md w-full">
                    <div className="p-4 md:p-6 border-b sm:border-b-0 sm:border-r border-white/5 min-w-0">
                        <p className="text-[9px] font-black uppercase opacity-60 tracking-widest mb-1">Paket Saat Ini</p>
                        <div className="flex items-center gap-2 min-w-0">
                            <p className="text-base md:text-xl font-black truncate">{currentPlan.name}</p>
                            {isCustomized && currentPlan.id !== 'default-trial' && <Badge variant="secondary" className="text-[8px] h-3.5 shrink-0">CUSTOM</Badge>}
                        </div>
                    </div>
                    <div className="p-4 md:p-6 border-b sm:border-b-0 lg:border-r border-white/5 min-w-0">
                        <p className="text-[9px] font-black uppercase opacity-60 tracking-widest mb-1">Biaya Tahunan</p>
                        <p className="text-base md:text-xl font-black break-all">Rp{finalPrice.toLocaleString('id-ID')}</p>
                    </div>
                    <div className="p-4 md:p-6 border-b sm:border-b-0 sm:border-r border-white/5 min-w-0">
                        <p className="text-[9px] font-black uppercase opacity-60 tracking-widest mb-1">Sisa Masa Aktif</p>
                        <p className="text-base md:text-xl font-black truncate">{getRemainingDays()}</p>
                    </div>
                    <div className="p-4 md:p-6 min-w-0">
                        <p className="text-[9px] font-black uppercase opacity-60 tracking-widest mb-1">Berakhir Pada</p>
                        <p className="text-base md:text-xl font-black truncate">{relevantCompany.subscriptionExpiryDate ? format(new Date(relevantCompany.subscriptionExpiryDate), 'd MMM yyyy') : '-'}</p>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
                <div className="lg:col-span-1 space-y-6 w-full min-w-0">
                    <Card className="shadow-md border-border/40 bg-background w-full">
                        <CardHeader className="p-4 md:p-6">
                            <CardTitle className="text-[10px] md:text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <Users size={16} className="text-primary" />
                                Penggunaan Kuota
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 md:p-6 pt-0 md:pt-0 space-y-4">
                            <QuotaIndicator label="Akun User" used={usageDetails.totalUsage.userCount} limit={finalUserLimit} icon={Users} />
                            <QuotaIndicator label="Akun Manajemen" used={usageDetails.totalUsage.managementCount} limit={finalManagementLimit} icon={Shield} />
                            {currentPlan.features.allowHolding && (
                                <QuotaIndicator label="Cabang / Grup" used={usageDetails.totalUsage.childCompanyCount} limit={finalCompanyLimit} icon={Building} />
                            )}
                        </CardContent>
                    </Card>

                    {currentPlan.benefitList && currentPlan.benefitList.length > 0 && (
                        <Card className="shadow-md border-border/40 bg-background w-full overflow-hidden">
                            <CardHeader className="p-4 md:p-6">
                                <CardTitle className="text-[10px] md:text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <Crown size={16} className="text-primary" />
                                    Manfaat Paket
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
                                <ul className="space-y-3">
                                    {currentPlan.benefitList.map((benefit, i) => (
                                        <li key={i} className="text-xs md:text-sm flex items-start gap-2">
                                            <div className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                            <span className="text-foreground/80 font-medium break-words">{benefit}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <Card className="lg:col-span-2 shadow-md border-border/40 bg-background w-full">
                    <CardHeader className="p-4 md:p-6">
                        <CardTitle className="text-[10px] md:text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <LayoutGrid size={16} className="text-primary" />
                            Modul & Fitur Aktif
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <FeatureStatus label="Manajemen KPI" enabled={currentPlan.features.allowKpi} icon={ClipboardCheck} />
                            <FeatureStatus label="Manajemen KBO" enabled={currentPlan.features.allowKbo} icon={Shield} />
                            <FeatureStatus label="Manajemen OKR" enabled={currentPlan.features.allowOkr} icon={Target} />
                            <FeatureStatus label="Portal LMS" enabled={currentPlan.features.allowLms} icon={GraduationCap} />
                            <FeatureStatus label="CollabSpace" enabled={currentPlan.features.allowCollabSpace} icon={LayoutGrid} />
                            <FeatureStatus label="Fitur AI (KIPI)" enabled={currentPlan.features.allowAiFeatures} icon={Bot} />
                            <FeatureStatus label="Dokumen & Kontrak" enabled={currentPlan.features.allowDocumentManagement} icon={FileText} />
                            <FeatureStatus label="Akses Holding" enabled={currentPlan.features.allowHolding} icon={GitMerge} />
                            <FeatureStatus label="Analisis Laporan" enabled={currentPlan.features.allowReporting} icon={Info} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* --- Subscription History Section --- */}
            <Card className="shadow-md border-border/40 overflow-hidden w-full">
                <CardHeader className="bg-muted/30 p-4 md:p-6">
                    <div className="flex items-center gap-2">
                        <History size={18} className="text-primary" />
                        <CardTitle className="text-[10px] md:text-sm font-black uppercase tracking-widest text-muted-foreground">Riwayat Transaksi & Paket</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="w-full overflow-x-auto">
                        <Table className="min-w-[500px]">
                            <TableHeader>
                                <TableRow className="bg-muted/10 border-none">
                                    <TableHead className="font-bold text-[9px] uppercase whitespace-nowrap px-4">Tanggal</TableHead>
                                    <TableHead className="font-bold text-[9px] uppercase px-4">Aksi</TableHead>
                                    <TableHead className="font-bold text-[9px] uppercase px-4">Paket</TableHead>
                                    <TableHead className="font-bold text-[9px] uppercase whitespace-nowrap px-4">Masa Berlaku</TableHead>
                                    <TableHead className="text-right font-bold text-[9px] uppercase px-4">Oleh</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {companyHistory.length > 0 ? (
                                    companyHistory.map((log) => (
                                        <TableRow key={log.id} className="hover:bg-muted/5 border-b border-muted/20">
                                            <TableCell className="text-[10px] md:text-xs py-4 px-4 font-medium whitespace-nowrap">
                                                {log.timestamp ? format(log.timestamp.toDate(), "d MMM yy, HH:mm") : 'N/A'}
                                            </TableCell>
                                            <TableCell className="px-4">
                                                <Badge variant="outline" className={cn(
                                                    "text-[8px] font-black uppercase px-1.5 h-4",
                                                    log.action === 'TRIAL' ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                    log.action === 'UPGRADE' ? "bg-green-50 text-green-700 border-green-200" :
                                                    "bg-blue-50 text-blue-700 border-blue-200"
                                                )}>
                                                    {log.action.replace('_', ' ')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-[11px] md:text-sm font-bold px-4">{log.planName}</TableCell>
                                            <TableCell className="text-[10px] text-muted-foreground whitespace-nowrap px-4">
                                                {formatSafeDate(log.startDate, "d MMM yy")} - {formatSafeDate(log.endDate, "d MMM yy")}
                                            </TableCell>
                                            <TableCell className="text-right text-[10px] font-semibold px-4">{log.performedBy}</TableCell>
                                        </TableRow>
                                    ) )
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic text-xs">
                                            Belum ada riwayat transaksi tercatat.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {relevantCompany.isHolding && (
                <Card className="shadow-md border-border/40 overflow-hidden w-full">
                    <CardHeader className="bg-muted/30 p-4 md:p-6">
                        <CardTitle className="text-[10px] md:text-sm font-black uppercase tracking-widest text-muted-foreground">Rincian Penggunaan per Perusahaan</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                         <div className="w-full overflow-x-auto">
                            <Table className="min-w-[500px]">
                                <TableHeader>
                                    <TableRow className="bg-muted/10 border-none">
                                        <TableHead className="font-bold text-[9px] uppercase px-4">Nama Perusahaan</TableHead>
                                        <TableHead className="text-center font-bold text-[9px] uppercase whitespace-nowrap px-4">User</TableHead>
                                        <TableHead className="text-center font-bold text-[9px] uppercase whitespace-nowrap px-4">Admin</TableHead>
                                        <TableHead className="text-right font-bold text-[9px] uppercase px-4">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {usageDetails.breakdown.map(item => (
                                        <TableRow key={item.companyName} className="hover:bg-muted/5 border-b border-muted/20">
                                            <TableCell className="font-bold text-[11px] md:text-sm py-4 px-4">
                                                {item.companyName}
                                            </TableCell>
                                            <TableCell className="text-center font-mono text-[11px] md:text-sm px-4">{item.userCount}</TableCell>
                                            <TableCell className="text-center font-mono text-[11px] md:text-sm px-4">{item.managementCount}</TableCell>
                                            <TableCell className="text-right px-4">
                                                {item.isHolding ? <Badge className="text-[8px] font-black uppercase bg-primary/10 text-primary border-none">Holding</Badge> : <Badge variant="outline" className="text-[8px] md:text-[9px] font-bold uppercase">Anak</Badge>}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function formatSafeDate(date: any, formatStr: string) {
    const d = safeToDate(date);
    if (!d) return '-';
    return format(d, formatStr, { locale: localeId });
}

function safeToDate(dateVal: any): Date | null {
    if (!dateVal) return null;
    if (dateVal instanceof Date) return dateVal;
    if (typeof dateVal.toDate === 'function') return dateVal.toDate();
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d;
}
