
// src/app/(main)/company-subscription-status/[companyId]/page.tsx
"use client";

import { useMemo } from 'react';
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
    Info
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { formatDistanceToNowStrict, format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import StatCard from '@/components/dashboard/stat-card';
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
import type { SubscriptionPlan, Company } from '@/types';

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

export default function CompanySubscriptionStatusPage() {
    const { companyId } = useParams();
    const router = useRouter();
    const { companies, employees, subscriptionPlans, subscriptionLogs } = useMasterData();
    
    const company = useMemo(() => companies.find(c => c.id === companyId), [companyId, companies]);

    const relevantCompanyForPlan = useMemo(() => {
        if (!company) return null;
        if (company.parentId) {
            return companies.find(c => c.id === company.parentId);
        }
        return company;
    }, [company, companies]);

    const currentPlan = useMemo(() => {
        if (!relevantCompanyForPlan) return null;
        
        const plan = subscriptionPlans.find(p => p.id === relevantCompanyForPlan.subscriptionPlanId);
        if (plan) return plan;

        if (relevantCompanyForPlan.subscriptionPlanId === 'default-trial') {
            return {
                id: 'default-trial',
                name: 'TRIAL',
                title: '14 Days Free Trial',
                price: 0,
                userLimit: relevantCompanyForPlan.customUserLimit ?? 5,
                managementUserLimit: relevantCompanyForPlan.customManagementUserLimit ?? 2,
                companyLimit: 0,
                durationDays: 14,
                benefitList: ["Akses KPI & KBO", "Akses CollabSpace", "Fitur AI (KIPI) Aktif", "Analisis Laporan Standar"],
                features: {
                    allowHolding: false, allowKpi: true, allowKbo: true, allowOkr: true, 
                    allowReporting: true, allowLms: false, allowCollabSpace: true, 
                    allowAiFeatures: true, allowDocumentManagement: false
                },
            } as SubscriptionPlan;
        }
        return null;
    }, [relevantCompanyForPlan, subscriptionPlans]);
    
    const usage = useMemo(() => {
        if (!relevantCompanyForPlan) return { userCount: 0, managementCount: 0, childCompanyCount: 0 };
        const groupCompanyNames = [relevantCompanyForPlan, ...companies.filter(c => c.parentId === relevantCompanyForPlan.id)].map(c => c.name);
        const groupEmployees = employees.filter(e => groupCompanyNames.includes(e.company));

        return {
            userCount: groupEmployees.filter(e => e.role === 'user').length,
            managementCount: groupEmployees.filter(e => e.role === 'manajemen').length,
            childCompanyCount: relevantCompanyForPlan.isHolding ? companies.filter(c => c.parentId === relevantCompanyForPlan.id).length : 0,
        };
    }, [relevantCompanyForPlan, employees, companies]);

    const companyHistory = useMemo(() => {
        if (!relevantCompanyForPlan) return [];
        return subscriptionLogs
            .filter(log => log.companyId === relevantCompanyForPlan.id)
            .sort((a, b) => {
                const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(0);
                const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(0);
                return dateB.getTime() - dateA.getTime();
            });
    }, [relevantCompanyForPlan, subscriptionLogs]);
    
    const finalPrice = relevantCompanyForPlan?.customPrice ?? currentPlan?.price ?? 0;
    const finalUserLimit = relevantCompanyForPlan?.customUserLimit ?? currentPlan?.userLimit ?? 0;
    const finalManagementLimit = relevantCompanyForPlan?.customManagementUserLimit ?? currentPlan?.managementUserLimit ?? 0;
    const finalCompanyLimit = relevantCompanyForPlan?.customCompanyLimit ?? currentPlan?.companyLimit ?? 0;
    
    const isCustomized = !!(
      relevantCompanyForPlan?.customPrice || 
      relevantCompanyForPlan?.customUserLimit || 
      relevantCompanyForPlan?.customManagementUserLimit || 
      relevantCompanyForPlan?.customCompanyLimit
    );


    const getRemainingDays = () => {
        if (!relevantCompanyForPlan?.subscriptionExpiryDate) return 'N/A';
        const expiryDate = new Date(relevantCompanyForPlan.subscriptionExpiryDate);
        const now = new Date();
        if (now > expiryDate) return 'Telah Berakhir';
        return formatDistanceToNowStrict(expiryDate, { unit: 'day', locale: localeId });
    };

    if (!company) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Data Tidak Ditemukan</CardTitle>
                    <CardDescription>Perusahaan tidak ditemukan.</CardDescription>
                </CardHeader>
                 <CardContent>
                     <Button onClick={() => router.back()}><ChevronLeft className="mr-2 h-4 w-4" /> Kembali</Button>
                 </CardContent>
            </Card>
        );
    }
    
    if (!currentPlan) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Paket Tidak Ditemukan</CardTitle>
                    <CardDescription>Perusahaan ini belum memiliki paket langganan aktif.</CardDescription>
                </CardHeader>
                 <CardContent>
                     <Button onClick={() => router.back()}><ChevronLeft className="mr-2 h-4 w-4" /> Kembali</Button>
                 </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20">
             <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                <ChevronLeft className="mr-2 h-4 w-4" /> Kembali ke Data Perusahaan
            </Button>
            <Card className="shadow-lg overflow-hidden border-none bg-primary text-primary-foreground relative">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <Crown size={120} />
                </div>
                <CardHeader className="p-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <CardTitle className="font-headline text-3xl flex items-center gap-3">Status Langganan: {company.name}</CardTitle>
                            <CardDescription className="text-primary-foreground/80 text-base">
                                Pantau dan kelola rincian paket berlangganan klien.
                            </CardDescription>
                        </div>
                        <Button asChild variant="secondary" className="font-bold h-12 px-8 shadow-xl">
                            <Link href={`/subscription-plans?companyId=${companyId}`}>
                                <ShoppingCart className="mr-2 size-5" />
                                Ubah / Beli Paket Lain
                            </Link>
                        </Button>
                    </div>
                </CardHeader>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 bg-black/10 border-t border-white/10 backdrop-blur-sm">
                    <div className="p-6 border-r border-white/5">
                        <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-1">Paket Saat Ini</p>
                        <div className="flex items-center gap-2">
                            <p className="text-xl font-black">{currentPlan.name}</p>
                            {isCustomized && currentPlan.id !== 'default-trial' && <Badge variant="secondary" className="text-[8px] h-4">CUSTOM</Badge>}
                        </div>
                    </div>
                    <div className="p-6 border-r border-white/5">
                        <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-1">Biaya Tahunan</p>
                        <p className="text-xl font-black">Rp{finalPrice.toLocaleString('id-ID')}</p>
                    </div>
                    <div className="p-6 border-r border-white/5">
                        <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-1">Sisa Masa Aktif</p>
                        <p className="text-xl font-black">{getRemainingDays()}</p>
                    </div>
                    <div className="p-6">
                        <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-1">Berakhir Pada</p>
                        <p className="text-xl font-black">{relevantCompanyForPlan?.subscriptionExpiryDate ? format(new Date(relevantCompanyForPlan.subscriptionExpiryDate), 'd MMM yyyy') : '-'}</p>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <Card className="shadow-md border-border/40 bg-background">
                        <CardHeader>
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <Users size={16} className="text-primary" />
                                Penggunaan Kuota
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <QuotaIndicator label="Akun User" used={usage.userCount} limit={finalUserLimit} icon={Users} />
                            <QuotaIndicator label="Akun Manajemen" used={usage.managementCount} limit={finalManagementLimit} icon={Shield} />
                            {currentPlan.features.allowHolding && (
                                <QuotaIndicator label="Anak Perusahaan/Grup" used={usage.childCompanyCount} limit={finalCompanyLimit} icon={Building} />
                            )}
                        </CardContent>
                    </Card>

                    {currentPlan.benefitList && currentPlan.benefitList.length > 0 && (
                        <Card className="shadow-md border-border/40 bg-background">
                            <CardHeader>
                                <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <Crown size={16} className="text-primary" />
                                    Manfaat Paket Klien
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3">
                                    {currentPlan.benefitList.map((benefit, i) => (
                                        <li key={i} className="text-sm flex items-start gap-2">
                                            <div className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                            <span className="text-foreground/80 font-medium">{benefit}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <Card className="lg:col-span-2 shadow-md border-border/40 bg-background">
                    <CardHeader>
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <LayoutGrid size={16} className="text-primary" />
                            Modul & Fitur Aktif Klien
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            {/* --- Subscription History Section for Superadmin --- */}
            <Card className="shadow-md border-border/40">
                <CardHeader className="bg-muted/30">
                    <div className="flex items-center gap-2">
                        <History size={18} className="text-primary" />
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Log Histori Langganan Klien</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/10 border-none">
                                <TableHead className="font-bold text-[10px] uppercase">Waktu</TableHead>
                                <TableHead className="font-bold text-[10px] uppercase">Aksi</TableHead>
                                <TableHead className="font-bold text-[10px] uppercase">Paket</TableHead>
                                <TableHead className="font-bold text-[10px] uppercase">Nilai (Rp)</TableHead>
                                <TableHead className="font-bold text-[10px] uppercase">Masa Aktif</TableHead>
                                <TableHead className="text-right font-bold text-[10px] uppercase">Petugas</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {companyHistory.length > 0 ? (
                                companyHistory.map((log) => (
                                    <TableRow key={log.id} className="hover:bg-muted/5">
                                        <TableCell className="text-xs py-4 font-medium">
                                            {log.timestamp ? format(log.timestamp.toDate(), "d MMM yyyy, HH:mm") : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={cn(
                                                "text-[9px] font-black uppercase",
                                                log.action === 'TRIAL' ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                log.action === 'UPGRADE' ? "bg-green-50 text-green-700 border-green-200" :
                                                "bg-blue-50 text-blue-700 border-blue-200"
                                            )}>
                                                {log.action.replace('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm font-bold">{log.planName}</TableCell>
                                        <TableCell className="text-xs font-mono">
                                            {log.amount.toLocaleString('id-ID')}
                                        </TableCell>
                                        <TableCell className="text-[11px] text-muted-foreground">
                                            {formatSafeDate(log.startDate, "d MMM yy")} - {formatSafeDate(log.endDate, "d MMM yy")}
                                        </TableCell>
                                        <TableCell className="text-right text-xs font-semibold">{log.performedBy}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic text-xs">
                                        Belum ada riwayat tercatat untuk perusahaan ini.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
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
