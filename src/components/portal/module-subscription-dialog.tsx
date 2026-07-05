// src/components/portal/module-subscription-dialog.tsx
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
    Plus, 
    Minus, 
    Zap, 
    Loader2,
    Users,
    ShoppingCart,
    X,
    Clock,
    AlertCircle,
    UserPlus
} from 'lucide-react';
import { useMasterData } from '@/contexts/master-data-context';
import type { ModuleId, Company } from '@/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { differenceInDays, parseISO, format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Progress } from '../ui/progress';

interface ModuleSubscriptionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  module: { id: ModuleId; name: string; icon: any; color: string; bg: string } | null;
  company: Company | null;
  mode?: 'activate' | 'add-quota';
  onConfirm: (data: { type: 'trial' | 'paid', quota: number, mgmtQuota: number, duration: number, totalPrice: number }) => Promise<void>;
}

export function ModuleSubscriptionDialog({ 
    isOpen, 
    onOpenChange, 
    module, 
    company, 
    mode = 'activate',
    onConfirm 
}: ModuleSubscriptionDialogProps) {
    const { modulePricing, addonPricing } = useMasterData();
    const [staffQuota, setStaffQuota] = useState(10);
    const [durationMonths, setDurationMonths] = useState<1 | 6 | 12>(12);
    const [isLoading, setIsLoading] = useState(false);

    const isAddQuotaMode = mode === 'add-quota';

    // Get live pricing from master data
    const activePricing = useMemo(() => {
        if (!module) return null;
        return modulePricing.find(p => p.id === module.id);
    }, [module, modulePricing]);

    // Calculate remaining days for prorate
    const prorateInfo = useMemo(() => {
        if (!isAddQuotaMode || !company || !module || !company.moduleSubscriptions?.[module.id]) return null;
        
        const currentSub = company.moduleSubscriptions[module.id];
        const expiryDate = parseISO(currentSub.expiryDate);
        const now = new Date();
        const daysLeft = Math.max(0, differenceInDays(expiryDate, now));
        const monthRatio = daysLeft / 30;

        return {
            daysLeft,
            monthRatio,
            expiryDate
        };
    }, [isAddQuotaMode, company, module]);

    useEffect(() => {
        if (isOpen) {
            setStaffQuota(isAddQuotaMode ? 5 : 10);
            setDurationMonths(12);
        }
    }, [isOpen, module?.id, isAddQuotaMode]);

    const isTrialAvailable = useMemo(() => {
        if (!company || !module || isAddQuotaMode) return false;
        const hasUsedTrial = company.usedTrials?.includes(module.id);
        if (hasUsedTrial) return false;
        const currentSub = company.moduleSubscriptions?.[module.id];
        if (currentSub && currentSub.status === 'active') return false;
        return true;
    }, [company, module, isAddQuotaMode]);

    const pricing = useMemo(() => {
        if (!activePricing) return { staffBase: 0, totalBill: 0, monthlyDiscount: 0, finalMonthly: 0, discountPercent: 0, savingTotal: 0 };

        const pricePerUser = activePricing.pricePerUser || 0;
        
        if (isAddQuotaMode && prorateInfo) {
            // Logic Prorate: (User tambahan * Harga * Sisa Bulan)
            const totalBill = staffQuota * pricePerUser * prorateInfo.monthRatio;
            return {
                staffBase: staffQuota * pricePerUser,
                totalBill: Math.max(0, Math.round(totalBill)),
                monthlyBase: staffQuota * pricePerUser,
                monthlyDiscount: 0,
                finalMonthly: staffQuota * pricePerUser,
                discountPercent: 0,
                savingTotal: 0
            };
        }

        const monthlyBase = staffQuota * pricePerUser;
        let discountPercent = 0;
        if (durationMonths === 6) discountPercent = (activePricing.discount6Months || 0) / 100; 
        if (durationMonths === 12) discountPercent = (activePricing.discount12Months || 0) / 100; 

        const monthlyDiscount = monthlyBase * discountPercent;
        const finalMonthly = monthlyBase - monthlyDiscount;
        const totalBill = finalMonthly * durationMonths;

        return {
            staffBase: monthlyBase,
            monthlyBase,
            monthlyDiscount,
            finalMonthly,
            totalBill,
            discountPercent: discountPercent * 100,
            savingTotal: (monthlyBase * discountPercent) * durationMonths
        };
    }, [staffQuota, durationMonths, activePricing, isAddQuotaMode, prorateInfo]);

    const handleAction = async (type: 'trial' | 'paid') => {
        setIsLoading(true);
        try {
            await onConfirm({
                type,
                quota: staffQuota,
                mgmtQuota: type === 'trial' ? 1 : (company?.customManagementUserLimit || 1),
                duration: type === 'trial' ? 14 : (durationMonths * 30),
                totalPrice: type === 'trial' ? 0 : pricing.totalBill
            });
            onOpenChange(false);
        } finally {
            setIsLoading(false);
        }
    };

    if (!module) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl flex flex-col h-full max-h-[90vh]">
                <DialogHeader className="p-4 px-6 bg-muted/20 border-b shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-xl bg-primary/10 text-primary")}>
                            {isAddQuotaMode ? <UserPlus size={20} /> : React.createElement(module.icon, { size: 20 })}
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black uppercase tracking-tighter text-slate-900">
                                {isAddQuotaMode ? `Tambah Kuota: ${module.name}` : `Konfigurasi Paket: ${module.name}`}
                            </DialogTitle>
                            {isAddQuotaMode && prorateInfo && (
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                                    Sisa masa aktif: {prorateInfo.daysLeft} hari
                                </p>
                            )}
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1 min-h-0 bg-background">
                    {!activePricing ? (
                        <div className="p-20 text-center space-y-4">
                            <Loader2 className="size-8 animate-spin mx-auto text-primary" />
                            <p className="text-sm font-bold text-muted-foreground">Menghubungkan ke pusat data harga...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                            <div className="p-6 md:p-8 space-y-8 bg-slate-50/50">
                                {/* Staff Quota Input */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                                                {isAddQuotaMode ? "Jumlah User Tambahan" : "Kapasitas Akun Staff"}
                                            </h3>
                                            <p className="text-[10px] text-muted-foreground font-medium uppercase text-balance">
                                                {isAddQuotaMode ? "Berapa banyak user yang ingin ditambahkan ke kuota saat ini?" : "Berapa banyak karyawan yang akan menggunakan modul ini?"}
                                            </p>
                                        </div>
                                        <div className="flex items-center bg-white rounded-xl border border-slate-200 overflow-hidden h-11 shadow-sm shrink-0">
                                            <button type="button" onClick={() => setStaffQuota(Math.max(1, staffQuota - 5))} className="px-3 hover:bg-blue-50 text-primary"><Minus size={16} strokeWidth={3} /></button>
                                            <input type="number" value={staffQuota} onChange={(e) => setStaffQuota(Math.max(0, parseInt(e.target.value) || 0))} className="w-12 text-center border-none focus-visible:ring-0 text-sm font-black bg-transparent" />
                                            <button type="button" onClick={() => setStaffQuota(staffQuota + 5)} className="px-3 hover:bg-blue-50 text-primary"><Plus size={16} strokeWidth={3} /></button>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Duration / Info Section */}
                                {isAddQuotaMode ? (
                                    <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 space-y-3">
                                        <div className="flex items-center gap-2 text-primary">
                                            <Clock size={16} strokeWidth={2.5} />
                                            <h4 className="text-xs font-black uppercase tracking-wider">Sinkronisasi Masa Aktif</h4>
                                        </div>
                                        <p className="text-[11px] font-medium leading-relaxed text-slate-600">
                                            Kuota tambahan ini akan aktif secara prorata mengikuti masa berlaku paket utama Anda hingga tanggal <strong>{prorateInfo ? format(prorateInfo.expiryDate, "d MMMM yyyy", { locale: localeId }) : '-'}</strong>.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Durasi Berlangganan</h3>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { val: 1, label: 'Bulanan', sub: 'Normal' },
                                                { val: 6, label: '6 Bulan', sub: `Hemat ${activePricing.discount6Months}%`, color: 'text-primary' },
                                                { val: 12, label: '12 Bulan', sub: `Hemat ${activePricing.discount12Months}%`, color: 'text-primary' },
                                            ].map((opt) => (
                                                <button
                                                    key={opt.val}
                                                    type="button"
                                                    onClick={() => setDurationMonths(opt.val as any)}
                                                    className={cn(
                                                        "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all bg-white",
                                                        durationMonths === opt.val 
                                                            ? "border-primary bg-primary/5 ring-2 ring-primary/10" 
                                                            : "border-slate-100 hover:border-slate-200"
                                                    )}
                                                >
                                                    <span className="text-xs font-black text-slate-800">{opt.label}</span>
                                                    <span className={cn("text-[8px] font-black uppercase mt-1", opt.color || "text-slate-400")}>
                                                        {opt.sub}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Mobile Summary View */}
                                <div className="md:hidden space-y-6 pt-6 border-t">
                                     <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Ringkasan Tagihan</h3>
                                     <div className="p-5 rounded-2xl bg-slate-900 text-white shadow-xl space-y-2">
                                        <p className="text-2xl font-black">Rp {pricing.totalBill.toLocaleString('id-ID')}</p>
                                        <p className="text-[9px] font-bold uppercase opacity-50">Total Investasi Prorata</p>
                                     </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Invoice Summary */}
                            <div className="hidden md:flex p-8 space-y-6 flex-col bg-white border-l h-full">
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Ringkasan Investasi</h3>

                                <div className="space-y-4 text-sm">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-muted-foreground font-medium uppercase tracking-tight">Harga Dasar / User</span>
                                            <span className="font-bold text-slate-700">Rp {activePricing.pricePerUser?.toLocaleString('id-ID')}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-muted-foreground font-medium uppercase tracking-tight">Kuantitas Baru</span>
                                            <span className="font-bold text-slate-700">+{staffQuota} User</span>
                                        </div>
                                        {isAddQuotaMode && prorateInfo && (
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-muted-foreground font-medium uppercase tracking-tight">Rasio Sisa Masa (H/{prorateInfo.daysLeft})</span>
                                                <span className="font-bold text-slate-700">x{prorateInfo.monthRatio.toFixed(2)}</span>
                                            </div>
                                        )}
                                        {!isAddQuotaMode && pricing.monthlyDiscount > 0 && (
                                            <div className="flex justify-between items-center text-primary text-xs">
                                                <span className="font-bold italic uppercase tracking-tight">Diskon Durasi {pricing.discountPercent}%</span>
                                                <span className="font-bold">-Rp {pricing.monthlyDiscount.toLocaleString('id-ID')}</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <Separator />

                                    <div className="p-6 rounded-2xl bg-slate-900 text-white shadow-xl shadow-primary/10 space-y-2 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><ShoppingCart size={60} /></div>
                                        <div className="relative z-10">
                                            <div className="flex justify-between items-center opacity-70 mb-1">
                                                <span className="text-[10px] font-black uppercase tracking-widest">Total Tagihan {isAddQuotaMode ? 'Prorata' : `(${durationMonths} Bln)`}</span>
                                            </div>
                                            <p className="text-2xl font-black tracking-tighter">
                                                Rp {pricing.totalBill.toLocaleString('id-ID')}
                                            </p>
                                        </div>
                                    </div>

                                    {isAddQuotaMode && (
                                        <div className="flex gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100 text-amber-800 text-[10px] leading-relaxed font-medium">
                                            <AlertCircle size={14} className="shrink-0" />
                                            <span>Penambahan kuota ini tidak menambah masa aktif modul, hanya menambah kapasitas user.</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-3 pt-6 mt-auto">
                                    <Button 
                                        onClick={() => handleAction('paid')}
                                        disabled={isLoading || staffQuota <= 0}
                                        className="w-full font-black text-[11px] uppercase tracking-widest h-12 bg-primary hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95"
                                    >
                                        {isLoading ? <Loader2 className="animate-spin size-4" /> : <><ShoppingCart size={14} className="mr-2" /> {isAddQuotaMode ? 'Bayar Tambah Kuota' : 'Beli Paket Sekarang'}</>}
                                    </Button>
                                    
                                    {isTrialAvailable && (
                                        <Button 
                                            variant="ghost" 
                                            className="w-full font-black text-[10px] uppercase tracking-widest h-10 text-muted-foreground hover:text-primary"
                                            onClick={() => handleAction('trial')}
                                        >
                                            Coba Gratis 14 Hari (10 Staff)
                                        </Button>
                                    )}
                                </div>
                            </div>
                            
                            {/* Mobile Footer */}
                            <div className="md:hidden p-6 border-t bg-background space-y-3">
                                <Button 
                                    onClick={() => handleAction('paid')}
                                    disabled={isLoading || staffQuota <= 0}
                                    className="w-full font-black text-[10px] uppercase tracking-widest h-12"
                                >
                                    {isLoading ? <Loader2 className="animate-spin size-4" /> : 'Proses Pembayaran'}
                                </Button>
                                {isTrialAvailable && (
                                    <Button variant="ghost" className="w-full text-[10px] font-bold uppercase" onClick={() => handleAction('trial')}>Mulai Trial</Button>
                                )}
                            </div>
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
