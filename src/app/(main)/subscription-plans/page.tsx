// src/app/(main)/subscription-plans/page.tsx
"use client";

import { useMemo, Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMasterData } from '@/contexts/master-data-context';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, Check, X, Shield, Users, Building, ChevronLeft, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SubscriptionPlan } from '@/types';
import { createSubscriptionTransaction, processPaymentSuccess } from '@/actions/payment.action';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

declare global {
  interface Window {
    snap: any;
  }
}

function FeatureItem({ label, enabled }: { label: string; enabled: boolean }) {
    return (
        <div className={cn(
            "py-2 px-4 flex items-center justify-center gap-1.5 transition-colors",
            enabled ? "text-foreground font-medium" : "text-muted-foreground/30 font-normal"
        )}>
            {enabled ? (
                <Check className="size-3 text-primary shrink-0" />
            ) : (
                <X className="size-3 shrink-0" />
            )}
            <span className="text-[10px] tracking-tight">{label}</span>
        </div>
    );
}

function PlanCard({ 
    plan, 
    currentPlan, 
    onPay 
}: { 
    plan: SubscriptionPlan, 
    currentPlan: SubscriptionPlan | null, 
    onPay: (plan: SubscriptionPlan) => Promise<void>
}) {
    const isCurrentPlan = plan.id === currentPlan?.id;
    const [isLoading, setIsLoading] = useState(false);

    const handleAction = async () => {
        setIsLoading(true);
        try {
            await onPay(plan);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className={cn(
            "flex flex-col border-border/40 shadow-none rounded-xl lg:rounded-none lg:first:rounded-l-xl lg:last:rounded-r-xl border lg:border-r-0 lg:last:border-r transition-all duration-300 bg-background",
            isCurrentPlan && "bg-primary/5 ring-2 ring-primary/20 z-10 scale-[1.02] lg:scale-105 shadow-xl lg:shadow-2xl border-primary/20"
        )}>
            <CardHeader className="p-6 space-y-4">
                <div className="space-y-1 text-center">
                    <CardTitle className="text-xl font-black text-foreground uppercase tracking-tight">{plan.name}</CardTitle>
                    <p className="text-[10px] text-muted-foreground leading-relaxed min-h-[40px] italic">
                        {plan.description}
                    </p>
                </div>
                <div className="pt-2 text-center">
                    <p className="text-2xl font-black text-foreground tracking-tighter">
                        Rp {plan.price.toLocaleString('id-ID')}
                    </p>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Per {plan.durationDays >= 365 ? 'Tahun' : `${plan.durationDays} Hari`}</p>
                </div>
            </CardHeader>
            
            <div className="px-6 pb-6">
                <Button 
                    className={cn(
                        "w-full font-black text-[10px] uppercase tracking-widest h-10 shadow-sm transition-all active:scale-95",
                        isCurrentPlan ? "bg-muted text-muted-foreground hover:bg-muted" : "bg-primary hover:bg-primary/90"
                    )}
                    disabled={isCurrentPlan || isLoading}
                    onClick={handleAction}
                >
                    {isLoading ? (
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    ) : null}
                    {isCurrentPlan ? 'Paket Aktif' : 'Pilih Paket'}
                </Button>
            </div>

            <CardContent className="p-0 border-t flex-1">
                <div className="flex flex-col text-center divide-y divide-border/40 text-[10px] font-bold uppercase tracking-tight">
                    {/* Limit Section */}
                    <div className="py-3 px-4 bg-muted/20 text-muted-foreground font-black text-[9px] tracking-widest">
                        LIMIT & KUOTA
                    </div>
                    <div className="py-2.5 px-4 flex items-center justify-center gap-2">
                        <Users size={12} className="opacity-40" />
                        {plan.userLimit === -1 ? 'Staff Tak Terbatas' : `${plan.userLimit} Akun Staff`}
                    </div>
                    <div className="py-2.5 px-4 flex items-center justify-center gap-2">
                        <Shield size={12} className="opacity-40" />
                        {plan.managementUserLimit === -1 ? 'Admin Tak Terbatas' : `${plan.managementUserLimit} Akun Admin`}
                    </div>
                    {plan.features.allowHolding && (
                        <div className="py-2.5 px-4 flex items-center justify-center gap-2 text-primary">
                            <Building size={12} className="opacity-60" />
                            {plan.companyLimit === -1 ? 'Grup Tak Terbatas' : `${plan.companyLimit} Cabang/Grup`}
                        </div>
                    )}

                    {/* Modul Section */}
                    <div className="py-3 px-4 bg-muted/20 text-muted-foreground font-black text-[9px] tracking-widest">
                        MODUL & FITUR
                    </div>
                    <FeatureItem label="Manajemen KPI" enabled={plan.features.allowKpi} />
                    <FeatureItem label="Penilaian KBO" enabled={plan.features.allowKbo} />
                    <FeatureItem label="Manajemen OKR" enabled={plan.features.allowOkr} />
                    <FeatureItem label="Portal LMS" enabled={plan.features.allowLms} />
                    <FeatureItem label="CollabSpace" enabled={plan.features.allowCollabSpace} />
                    <FeatureItem label="Fitur AI (KIPI)" enabled={plan.features.allowAiFeatures} />
                    <FeatureItem label="Doc Management" enabled={plan.features.allowDocumentManagement} />
                    <FeatureItem label="Analisis Laporan" enabled={plan.features.allowReporting} />

                    {/* Benefit List Section */}
                    {plan.benefitList && plan.benefitList.length > 0 && (
                        <>
                            <div className="py-3 px-4 bg-muted/20 text-muted-foreground font-black text-[9px] tracking-widest">
                                MANFAAT LAINNYA
                            </div>
                            {plan.benefitList.map((benefit, i) => (
                                <div key={i} className="py-2.5 px-4 text-foreground/70 normal-case font-medium text-[11px] leading-tight">
                                    {benefit}
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function SubscriptionPlansContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();
    const companyId = searchParams.get('companyId');
    const { companies, subscriptionPlans, fetchData } = useMasterData();
    const { currentUser } = useAuth();

    const company = useMemo(() => companies.find(c => c.id === companyId), [companyId, companies]);

    const relevantCompanyForPlan = useMemo(() => {
        if (!company) return null;
        return company.parentId ? companies.find(c => c.id === company.parentId) : company;
    }, [company, companies]);

    const currentPlan = useMemo(() => {
        if (!relevantCompanyForPlan) return null;
        return subscriptionPlans.find(p => p.id === relevantCompanyForPlan.subscriptionPlanId);
    }, [relevantCompanyForPlan, subscriptionPlans]);

    const filteredPlans = useMemo(() => {
        return subscriptionPlans
            .filter(p => p.status === 'Active' && p.price > 0 && p.name !== 'TRIAL')
            .sort((a, b) => a.price - b.price);
    }, [subscriptionPlans]);

    const handlePayment = async (plan: SubscriptionPlan) => {
        if (!relevantCompanyForPlan || !currentUser) {
            toast({ variant: 'destructive', title: "Sesi Tidak Valid", description: "Harap login kembali untuk melanjutkan." });
            return;
        }

        try {
            const plainPlan = { id: plan.id, price: plan.price, name: plan.name };
            const plainCompany = { id: relevantCompanyForPlan.id, name: relevantCompanyForPlan.name };
            const plainUser = { name: currentUser.name, email: currentUser.email, phone: currentUser.phone || "" };

            const res = await createSubscriptionTransaction(plainPlan, plainCompany, plainUser);
            
            if (res.success && res.token) {
                if (window.snap) {
                    window.snap.pay(res.token, {
                        onSuccess: async (result: any) => {
                            toast({ title: "Pembayaran Berhasil!", description: "Sedang memperbarui status paket Anda..." });
                            
                            // FORCE UPDATE FROM CLIENT (Because Webhook might be blocked in dev environment)
                            await processPaymentSuccess(relevantCompanyForPlan.id, plan.id, plan.price, result.order_id);
                            
                            await fetchData(true); // Silent refresh
                            setTimeout(() => router.push('/subscription-status'), 1500);
                        },
                        onPending: (result: any) => {
                            toast({ title: "Menunggu Pembayaran", description: "Silakan selesaikan pembayaran sesuai instruksi Midtrans." });
                        },
                        onError: (result: any) => {
                            toast({ variant: 'destructive', title: "Pembayaran Gagal", description: "Terjadi kesalahan pada proses transaksi." });
                        },
                        onClose: () => {
                            toast({ description: "Pembayaran dibatalkan." });
                        }
                    });
                } else {
                    window.location.href = res.redirectUrl!;
                }
            } else {
                throw new Error(res.error || "Gagal mendapatkan token transaksi.");
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Kesalahan Sistem", description: error.message });
        }
    };

    if (!company) {
         return (
             <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-black">Perusahaan Tidak Ditemukan</h2>
                    <p className="text-muted-foreground">Silakan kembali ke Dashboard dan pilih perusahaan yang valid.</p>
                </div>
                <Button asChild variant="outline">
                    <Link href="/dashboard">Kembali ke Dashboard</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-24 px-4 sm:px-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-headline">Billing Center</h1>
                    <p className="text-muted-foreground text-sm font-medium">
                        Pilih paket manajemen performa terbaik untuk <strong>{company.name}</strong>.
                    </p>
                </div>
                <Button variant="ghost" asChild className="self-start">
                    <Link href="/dashboard">
                        <ChevronLeft className="mr-2 size-4" /> Kembali
                    </Link>
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-0 lg:border lg:border-border/40 lg:rounded-2xl lg:overflow-hidden lg:shadow-sm">
                {filteredPlans.map(plan => (
                    <PlanCard 
                        key={plan.id} 
                        plan={plan} 
                        currentPlan={currentPlan || null}
                        onPay={handlePayment}
                    />
                ))}
            </div>
            
            {filteredPlans.length === 0 && (
                <div className="py-20 text-center border-2 border-dashed rounded-3xl opacity-40">
                    <ShoppingCart className="size-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="font-bold">Belum ada paket berbayar yang tersedia.</p>
                </div>
            )}
        </div>
    );
}


export default function SubscriptionPlansPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-center">
                    <Loader2 className="animate-spin text-primary size-10" />
                    <p className="font-bold uppercase tracking-widest text-[10px] animate-pulse">Menyiapkan Katalog Pembayaran...</p>
                </div>
            </div>
        }>
            <SubscriptionPlansContent />
        </Suspense>
    )
}
