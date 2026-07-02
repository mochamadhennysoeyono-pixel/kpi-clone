// src/components/portal/module-subscription-dialog.tsx
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    Plus, 
    Minus, 
    Check, 
    Zap, 
    Info, 
    ScanFace,
    Loader2
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import type { ModuleId, Company } from '@/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

interface ModuleSubscriptionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  module: { id: ModuleId; name: string; icon: any; color: string; bg: string } | null;
  company: Company | null;
  onConfirm: (data: { type: 'trial' | 'paid', quota: number, duration: number, totalPrice: number }) => Promise<void>;
}

// Pricing configuration (Price per user per month as seen in image)
const BASE_PRICE = 12500; 

export function ModuleSubscriptionDialog({ 
    isOpen, 
    onOpenChange, 
    module, 
    company, 
    onConfirm 
}: ModuleSubscriptionDialogProps) {
    const [quota, setQuota] = useState(6);
    const [durationMonths, setDurationMonths] = useState<1 | 6 | 12>(12);
    const [hasLiveness, setHasLiveness] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setQuota(6);
            setDurationMonths(12);
            setHasLiveness(false);
        }
    }, [isOpen, module?.id]);

    const pricing = useMemo(() => {
        const livenessPrice = hasLiveness ? 1500 : 0;
        const monthlyBase = quota * BASE_PRICE;
        const monthlyLiveness = quota * livenessPrice;
        const rawMonthlyTotal = monthlyBase + monthlyLiveness;
        
        let discountPercent = 0;
        if (durationMonths === 6) discountPercent = 0.03; // 3% as image
        if (durationMonths === 12) discountPercent = 0.05; // 5% as image

        const monthlyDiscount = monthlyBase * discountPercent;
        const finalMonthly = rawMonthlyTotal - monthlyDiscount;
        const totalBill = finalMonthly * durationMonths;

        return {
            monthlyBase,
            monthlyLiveness,
            monthlyDiscount,
            finalMonthly,
            totalBill,
            discountPercent: discountPercent * 100,
            savingTotal: (monthlyBase * discountPercent) * durationMonths
        };
    }, [quota, durationMonths, hasLiveness]);

    const handleAction = async (type: 'trial' | 'paid') => {
        setIsLoading(true);
        try {
            await onConfirm({
                type,
                quota: type === 'trial' ? 10 : quota,
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
            <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl flex flex-col h-full max-h-[95vh] md:max-h-[85vh]">
                <DialogHeader className="p-4 px-6 flex flex-row items-center justify-between bg-muted/20 border-b shrink-0">
                    <div className="flex items-center gap-2">
                        <div className={cn("p-1.5 rounded-lg", module.bg, module.color)}>
                            {React.createElement(module.icon, { size: 14 })}
                        </div>
                        <DialogTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {module.name}
                        </DialogTitle>
                    </div>
                    <DialogDescription className="sr-only">
                        Beli paket langganan {module.name}.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 bg-background">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                        
                        {/* LEFT COLUMN: CONFIGURATION */}
                        <div className="p-6 md:p-8 space-y-8 bg-slate-50/50">
                            {/* Quantity Section */}
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <h3 className="font-bold text-slate-800">Jumlah Karyawan</h3>
                                    <p className="text-[10px] text-muted-foreground uppercase font-medium">Min. 1</p>
                                </div>
                                <div className="flex items-center bg-white rounded-lg border border-slate-200 overflow-hidden h-10 shadow-sm">
                                    <button 
                                        type="button"
                                        onClick={() => setQuota(Math.max(1, quota - 1))}
                                        className="px-3 hover:bg-slate-50 transition-colors text-amber-500 bg-amber-50"
                                    >
                                        <Minus size={16} strokeWidth={3} />
                                    </button>
                                    <input 
                                        type="number"
                                        value={quota}
                                        onChange={(e) => setQuota(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-14 text-center border-none focus-visible:ring-0 text-sm font-bold bg-transparent"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setQuota(quota + 1)}
                                        className="px-3 hover:bg-slate-50 transition-colors text-amber-500 bg-amber-50"
                                    >
                                        <Plus size={16} strokeWidth={3} />
                                    </button>
                                </div>
                            </div>

                            {/* Duration Section */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Durasi Berlangganan</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { val: 1, label: 'Bulanan', sub: 'Harga Normal' },
                                        { val: 6, label: '6 Bulan', sub: 'Hemat 3%', color: 'text-green-600' },
                                        { val: 12, label: '12 Bulan', sub: 'Hemat 5%', color: 'text-green-600' },
                                    ].map((opt) => (
                                        <button
                                            key={opt.val}
                                            type="button"
                                            onClick={() => setDurationMonths(opt.val as any)}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all bg-white",
                                                durationMonths === opt.val 
                                                    ? "border-amber-400 bg-amber-50/30" 
                                                    : "border-slate-200 hover:border-slate-300"
                                            )}
                                        >
                                            <span className="text-sm font-bold text-slate-800">{opt.label}</span>
                                            <span className={cn("text-[10px] font-bold mt-1", opt.color || "text-amber-600")}>
                                                {opt.sub}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                                {pricing.savingTotal > 0 && (
                                    <p className="text-[11px] font-bold text-green-600 flex items-center gap-1.5">
                                        💰 Hemat Rp {pricing.savingTotal.toLocaleString('id-ID')} dibanding bulanan
                                    </p>
                                )}
                            </div>

                            {/* Add-on Card */}
                            <div className={cn(
                                "p-4 rounded-2xl border transition-all flex items-start gap-4",
                                hasLiveness ? "bg-white border-slate-200 shadow-sm" : "bg-slate-100/50 border-transparent"
                            )}>
                                <div className="p-2 bg-white rounded-xl border shadow-sm shrink-0">
                                    <ScanFace className="size-6 text-slate-400" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-sm font-bold text-slate-800">Liveness Detection</h4>
                                        <Switch checked={hasLiveness} onCheckedChange={setHasLiveness} />
                                    </div>
                                    <p className="text-[10px] font-bold text-muted-foreground">+Rp 1.500/karyawan/bulan</p>
                                    <p className="text-[10px] text-muted-foreground leading-relaxed pt-2">
                                        Cegah titip absen & manipulasi kehadiran. Direkomendasikan untuk sistem shift.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: SUMMARY */}
                        <div className="p-6 md:p-8 space-y-8 flex flex-col bg-white border-l">
                            <h3 className="text-lg font-bold text-slate-800">Rincian Biaya</h3>

                            <div className="space-y-4 text-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground font-medium">Harga dasar ({quota} x Rp {BASE_PRICE.toLocaleString('id-ID')})</span>
                                    <span className="font-bold text-slate-700">Rp {pricing.monthlyBase.toLocaleString('id-ID')}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground font-medium">Liveness Detection ({quota} x Rp {hasLiveness ? '1.500' : '0'})</span>
                                    <span className="font-bold text-slate-700">Rp {pricing.monthlyLiveness.toLocaleString('id-ID')}</span>
                                </div>
                                {pricing.monthlyDiscount > 0 && (
                                    <div className="flex justify-between items-center text-green-600">
                                        <span className="font-medium italic">Diskon Hemat {pricing.discountPercent}%</span>
                                        <span className="font-bold">Rp {pricing.monthlyDiscount.toLocaleString('id-ID')}</span>
                                    </div>
                                )}
                                
                                <Separator />

                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">TOTAL / BULAN</span>
                                    <span className="font-bold text-slate-700">Rp {pricing.finalMonthly.toLocaleString('id-ID')}</span>
                                </div>

                                <div className="flex justify-between items-end pt-2">
                                    <span className="text-xs font-bold text-muted-foreground">Total tagihan ({durationMonths} bulan)*</span>
                                    <span className="text-2xl font-black text-slate-900 leading-none">
                                        Rp {pricing.totalBill.toLocaleString('id-ID')}
                                    </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground italic text-right">*Nilai ini belum termasuk PPN</p>
                            </div>

                            <div className="flex flex-col gap-3 pt-8 mt-auto">
                                <div className="flex gap-3">
                                    <Button 
                                        variant="outline" 
                                        className="flex-1 font-bold text-xs h-12 border-amber-200 bg-amber-50/50 hover:bg-amber-100 text-amber-700 rounded-xl"
                                        onClick={() => handleAction('trial')}
                                    >
                                        Coba Demo Gratis
                                    </Button>
                                    <Button 
                                        onClick={() => handleAction('paid')}
                                        disabled={isLoading}
                                        className="flex-1 font-bold text-xs h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-lg shadow-amber-200"
                                    >
                                        {isLoading ? <Loader2 className="animate-spin size-4" /> : 'Mulai Berlangganan'}
                                    </Button>
                                </div>
                                <p className="text-[10px] text-center text-muted-foreground font-medium uppercase tracking-tight">
                                    Setup &lt; 5 menit, langsung aktif
                                </p>
                            </div>
                        </div>

                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
