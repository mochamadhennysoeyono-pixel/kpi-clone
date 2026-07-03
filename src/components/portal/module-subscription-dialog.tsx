
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
    ShoppingCart
} from 'lucide-react';
import { useMasterData } from '@/contexts/master-data-context';
import type { ModuleId, Company } from '@/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface ModuleSubscriptionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  module: { id: ModuleId; name: string; icon: any; color: string; bg: string } | null;
  company: Company | null;
  onConfirm: (data: { type: 'trial' | 'paid', quota: number, mgmtQuota: number, duration: number, totalPrice: number }) => Promise<void>;
}

export function ModuleSubscriptionDialog({ 
    isOpen, 
    onOpenChange, 
    module, 
    company, 
    onConfirm 
}: ModuleSubscriptionDialogProps) {
    const { modulePricing } = useMasterData();
    const [staffQuota, setStaffQuota] = useState(10);
    const [durationMonths, setDurationMonths] = useState<1 | 6 | 12>(12);
    const [isLoading, setIsLoading] = useState(false);

    // Get live pricing from master data
    const activePricing = useMemo(() => {
        if (!module) return null;
        return modulePricing.find(p => p.id === module.id);
    }, [module, modulePricing]);

    useEffect(() => {
        if (isOpen) {
            setStaffQuota(10);
            setDurationMonths(12);
        }
    }, [isOpen, module?.id]);

    const isTrialAvailable = useMemo(() => {
        if (!company || !module) return false;
        const hasUsedTrial = company.usedTrials?.includes(module.id);
        if (hasUsedTrial) return false;
        const currentSub = company.moduleSubscriptions?.[module.id];
        if (currentSub && currentSub.status === 'active') return false;
        return true;
    }, [company, module]);

    const pricing = useMemo(() => {
        if (!activePricing) return { staffBase: 0, totalBill: 0, monthlyDiscount: 0, finalMonthly: 0, discountPercent: 0 };

        const pricePerUser = activePricing.pricePerUser || 0;
        const staffBase = staffQuota * pricePerUser;
        const monthlyBase = staffBase;
        
        let discountPercent = 0;
        if (durationMonths === 6) discountPercent = (activePricing.discount6Months || 0) / 100; 
        if (durationMonths === 12) discountPercent = (activePricing.discount12Months || 0) / 100; 

        const monthlyDiscount = monthlyBase * discountPercent;
        const finalMonthly = monthlyBase - monthlyDiscount;
        const totalBill = finalMonthly * durationMonths;

        return {
            staffBase,
            monthlyBase,
            monthlyDiscount,
            finalMonthly,
            totalBill,
            discountPercent: discountPercent * 100,
            savingTotal: (monthlyBase * discountPercent) * durationMonths
        };
    }, [staffQuota, durationMonths, activePricing]);

    const handleAction = async (type: 'trial' | 'paid') => {
        setIsLoading(true);
        try {
            await onConfirm({
                type,
                quota: type === 'trial' ? 10 : staffQuota,
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
            <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl flex flex-col h-full max-h-[95vh]">
                <DialogHeader className="p-4 px-6 flex flex-row items-center justify-between bg-muted/20 border-b shrink-0">
                    <div className="flex items-center gap-2">
                        <div className={cn("p-1.5 rounded-lg", module.bg, module.color)}>
                            {React.createElement(module.icon, { size: 14 })}
                        </div>
                        <DialogTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Konfigurasi Paket: {module.name}
                        </DialogTitle>
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1 bg-background">
                    {!activePricing ? (
                        <div className="p-20 text-center space-y-4">
                            <Loader2 className="size-8 animate-spin mx-auto text-primary" />
                            <p className="text-sm font-bold text-muted-foreground">Menghubungkan ke pusat data harga...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                            <div className="p-6 md:p-8 space-y-8 bg-slate-50/50">
                                {/* Staff Quota */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Kapasitas Akun Staff</h3>
                                            <p className="text-[10px] text-muted-foreground font-medium uppercase text-balance">Berapa banyak karyawan yang akan menggunakan modul ini?</p>
                                        </div>
                                        <div className="flex items-center bg-white rounded-xl border border-slate-200 overflow-hidden h-10 shadow-sm">
                                            <button type="button" onClick={() => setStaffQuota(Math.max(1, staffQuota - 5))} className="px-3 hover:bg-blue-50 text-[#2563eb]"><Minus size={16} strokeWidth={3} /></button>
                                            <input type="number" value={staffQuota} onChange={(e) => setStaffQuota(Math.max(0, parseInt(e.target.value) || 0))} className="w-12 text-center border-none focus-visible:ring-0 text-sm font-black bg-transparent" />
                                            <button type="button" onClick={() => setStaffQuota(staffQuota + 5)} className="px-3 hover:bg-blue-50 text-[#2563eb]"><Plus size={16} strokeWidth={3} /></button>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Duration */}
                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Durasi Berlangganan</h3>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { val: 1, label: 'Bulanan', sub: 'Normal' },
                                            { val: 6, label: '6 Bulan', sub: `Hemat ${activePricing.discount6Months}%`, color: 'text-[#2563eb]' },
                                            { val: 12, label: '12 Bulan', sub: `Hemat ${activePricing.discount12Months}%`, color: 'text-[#2563eb]' },
                                        ].map((opt) => (
                                            <button
                                                key={opt.val}
                                                type="button"
                                                onClick={() => setDurationMonths(opt.val as any)}
                                                className={cn(
                                                    "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all bg-white",
                                                    durationMonths === opt.val 
                                                        ? "border-[#2563eb] bg-blue-50/30 ring-2 ring-blue-500/10" 
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
                            </div>

                            <div className="p-6 md:p-8 space-y-6 flex flex-col bg-white border-l">
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Ringkasan Tagihan</h3>

                                <div className="space-y-4 text-sm">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-muted-foreground font-medium uppercase tracking-tight">Staff ({staffQuota} User)</span>
                                            <span className="font-bold text-slate-700">Rp {pricing.staffBase.toLocaleString('id-ID')}</span>
                                        </div>
                                        {pricing.monthlyDiscount > 0 && (
                                            <div className="flex justify-between items-center text-[#2563eb] text-xs">
                                                <span className="font-bold italic uppercase tracking-tight">Diskon Durasi {pricing.discountPercent}%</span>
                                                <span className="font-bold">-Rp {pricing.monthlyDiscount.toLocaleString('id-ID')}</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <Separator />

                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">TOTAL PER BULAN</span>
                                        <span className="font-black text-lg text-slate-800">Rp {pricing.finalMonthly.toLocaleString('id-ID')}</span>
                                    </div>

                                    <div className="p-5 rounded-2xl bg-slate-900 text-white shadow-xl shadow-blue-500/10 space-y-2">
                                        <div className="flex justify-between items-center opacity-70">
                                            <span className="text-[10px] font-black uppercase tracking-widest">Total Tagihan ({durationMonths} Bln)</span>
                                            <ShoppingCart size={14} />
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <span className="text-2xl font-black tracking-tighter">
                                                Rp {pricing.totalBill.toLocaleString('id-ID')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 pt-6 mt-auto">
                                    <Button 
                                        onClick={() => handleAction('paid')}
                                        disabled={isLoading}
                                        className="w-full font-black text-[10px] uppercase tracking-widest h-12 bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20"
                                    >
                                        {isLoading ? <Loader2 className="animate-spin size-4" /> : <><ShoppingCart size={14} className="mr-2" /> Beli Paket</>}
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
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
