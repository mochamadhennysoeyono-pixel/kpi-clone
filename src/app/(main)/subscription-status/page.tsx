
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
    History,
    Clock
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
import { ResponsivePage } from '@/components/ui/adaptive-layout';
import { PageHeader } from '@/components/ui/page-header';
import { AdaptiveCardGrid, AdaptiveMetricCard } from '@/components/ui/adaptive-card';


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
                <span className="text-[10px] font-black uppercase tracking-tight text-slate-800">{label}</span>
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
                    allowHolding: false, allowKpi: true, allowKbo: true, allowOkr: true, 
                    allowReporting: true, allowLms: false, allowCollabSpace: true, 
                    allowAiFeatures: true, allowDocumentManagement: false,
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
    
    const finalUserLimit = relevantCompany?.customUserLimit ?? currentPlan?.userLimit ?? 0;
    const finalManagementLimit = relevantCompany?.customManagementUserLimit ?? currentPlan?.managementUserLimit ?? 0;
    const finalCompanyLimit = relevantCompany?.customCompanyLimit ?? currentPlan?.companyLimit ?? 0;

    const getRemainingDays = () => {
        if (!relevantCompany?.subscriptionExpiryDate) return 'N/A';
        const expiryDate = new Date(relevantCompany.subscriptionExpiryDate);
        const now = new Date();
        if (now > expiryDate) return 'EXPIRED';
        return formatDistanceToNowStrict(expiryDate, { unit: 'day', locale: localeId });
    };

    if (!relevantCompany || !currentPlan) return null;

    return (
        <ResponsivePage>
            <PageHeader 
                title="Status Langganan Aktif"
                description={`Manajemen detail paket berlangganan untuk entitas ${relevantCompany.name}.`}
                icon={Crown}
                actions={
                    <Button asChild variant="secondary" className="font-bold shadow-lg h-9 sm:h-10 px-6">
                        <Link href={`/subscription-plans?companyId=${userCompany?.id}`}>
                            <ShoppingCart className="mr-2 size-4" />
                            Upgrade / Ganti Paket
                        </Link>
                    </Button>
                }
            />

            <Card className="bg-primary text-primary-foreground border-none shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none"><Crown size={150} /></div>
                <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10 bg-black/10">
                    <div className="p-6">
                        <p className="text-[9px] font-black uppercase opacity-60 tracking-widest mb-1">Paket</p>
                        <p className="text-xl font-black">{currentPlan.name}</p>
                    </div>
                    <div className="p-6">
                        <p className="text-[9px] font-black uppercase opacity-60 tracking-widest mb-1">Nilai Investasi</p>
                        <p className="text-xl font-black">Rp {(relevantCompany.customPrice ?? currentPlan.price).toLocaleString('id-ID')}</p>
                    </div>
                    <div className="p-6">
                        <p className="text-[9px] font-black uppercase opacity-60 tracking-widest mb-1">Masa Aktif</p>
                        <p className="text-xl font-black">{getRemainingDays()}</p>
                    </div>
                    <div className="p-6">
                        <p className="text-[9px] font-black uppercase opacity-60 tracking-widest mb-1">Exp Date</p>
                        <p className="text-xl font-black">{relevantCompany.subscriptionExpiryDate ? format(new Date(relevantCompany.subscriptionExpiryDate), 'd MMM yyyy') : '-'}</p>
                    </div>
                </div>
            </Card>

            <AdaptiveCardGrid complexity="simple">
                <AdaptiveMetricCard 
                    title="Utilisasi Staff" 
                    value={`${usageDetails.totalUsage.userCount} / ${finalUserLimit === -1 ? '∞' : finalUserLimit}`} 
                    icon={Users} 
                />
                <AdaptiveMetricCard 
                    title="Utilisasi Admin" 
                    value={`${usageDetails.totalUsage.managementCount} / ${finalManagementLimit === -1 ? '∞' : finalManagementLimit}`} 
                    icon={Shield} 
                />
                {currentPlan.features.allowHolding && (
                    <AdaptiveMetricCard 
                        title="Unit Bisnis" 
                        value={`${usageDetails.totalUsage.childCompanyCount} / ${finalCompanyLimit === -1 ? '∞' : finalCompanyLimit}`} 
                        icon={GitMerge} 
                    />
                )}
            </AdaptiveCardGrid>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-border/40 shadow-sm bg-background">
                    <CardHeader className="bg-muted/30 border-b p-5">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2"><LayoutGrid size={16} className="text-primary" /> Cakupan Modul Aktif</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <FeatureStatus label="Manajemen KPI" enabled={currentPlan.features.allowKpi} icon={ClipboardCheck} />
                            <FeatureStatus label="Penilaian KBO" enabled={currentPlan.features.allowKbo} icon={Shield} />
                            <FeatureStatus label="Manajemen OKR" enabled={currentPlan.features.allowOkr} icon={Target} />
                            <FeatureStatus label="Portal LMS" enabled={currentPlan.features.allowLms} icon={GraduationCap} />
                            <FeatureStatus label="CollabSpace" enabled={currentPlan.features.allowCollabSpace} icon={LayoutGrid} />
                            <FeatureStatus label="Fitur AI (KIPI)" enabled={currentPlan.features.allowAiFeatures} icon={Bot} />
                            <FeatureStatus label="Akses Holding" enabled={currentPlan.features.allowHolding} icon={GitMerge} />
                            <FeatureStatus label="Laporan Analitik" enabled={currentPlan.features.allowReporting} icon={Info} />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/40 shadow-sm bg-background">
                    <CardHeader className="bg-muted/30 border-b p-5">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2"><ShoppingCart size={16} className="text-primary" /> Manfaat Eksklusif</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <ul className="space-y-3">
                            {(currentPlan.benefitList || []).map((benefit, i) => (
                                <li key={i} className="text-xs font-bold flex items-start gap-3 text-slate-700">
                                    <CheckCircle2 className="size-4 text-green-500 shrink-0 mt-0.5" />
                                    <span>{benefit}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-border/40 shadow-sm overflow-hidden bg-background">
                <CardHeader className="bg-muted/30 border-b p-5">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2"><History size={16} className="text-primary" /> Riwayat Transaksi Paket</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/10">
                            <TableRow className="border-none">
                                <TableHead className="text-[10px] font-black uppercase py-4">Waktu</TableHead>
                                <TableHead className="text-[10px] font-black uppercase">Aksi</TableHead>
                                <TableHead className="text-[10px] font-black uppercase">Nama Paket</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-right">Nilai (Rp)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {companyHistory.length > 0 ? (
                                companyHistory.map((log) => (
                                    <TableRow key={log.id} className="border-border/40">
                                        <TableCell className="text-[10px] font-bold text-muted-foreground uppercase">{log.timestamp ? format(log.timestamp.toDate(), "d MMM yy, HH:mm") : '-'}</TableCell>
                                        <TableCell><Badge variant="outline" className="text-[8px] font-black uppercase h-5 bg-muted/50 border-none">{log.action}</Badge></TableCell>
                                        <TableCell className="text-xs font-black text-slate-800">{log.planName}</TableCell>
                                        <TableCell className="text-right font-mono text-xs font-black text-primary">Rp {log.amount.toLocaleString('id-ID')}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={4} className="h-40 text-center text-xs text-muted-foreground italic">Belum ada riwayat tercatat.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </ResponsivePage>
    );
}
