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
import { 
    Plus, 
    Minus, 
    Check, 
    Zap, 
    Info, 
    Loader2,
    Building,
    Users,
    Timer,
    ShoppingCart,
    ArrowRight
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import type { ModuleId, Company } from '@/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface ModuleSubscriptionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  module: { id: ModuleId; name: string; icon: any; color: string; bg: string } | null;
  company: Company | null;
  onConfirm: (data: { type: 'trial' | 'paid', quota: number, duration: number, totalPrice: number }) => Promise<void>;
}

// Pricing configuration (Price per user per month)
const BASE_PRICE = 12500; 

export function ModuleSubscriptionDialog({ 
    isOpen, 
    onOpenChange, 
    module, 
    company, 
    onConfirm 
}: ModuleSubscriptionDialogProps) {
    const [quota, setQuota] = useState(10);
    const [durationMonths, setDurationMonths] = useState<1 | 6 | 12>(12);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setQuota(10);
            setDurationMonths(12);
        }
    }, [isOpen, module?.id]);

    const pricing = useMemo(() => {
        const monthlyBase = quota * BASE_PRICE;
        const rawMonthlyTotal = monthlyBase;
        
        let discountPercent = 0;
        if (durationMonths === 6) discountPercent = 0.03; // 3%
        if (durationMonths === 12) discountPercent = 0.05; // 5%

        const monthlyDiscount = monthlyBase * discountPercent;
        const finalMonthly = rawMonthlyTotal - monthlyDiscount;
        const totalBill = finalMonthly * durationMonths;

        return {
            monthlyBase,
            monthlyDiscount,
            finalMonthly,
            totalBill,
            discountPercent: discountPercent * 100,
            savingTotal: (monthlyBase * discountPercent) * durationMonths
        };
    }, [quota, durationMonths]);

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
            <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl flex flex-col h-full max-h-[90vh] md:max-h-[85vh]">
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
                        <div className="p-6 md:p-8 space-y-10 bg-slate-50/50">
                            {/* Quantity Section */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Jumlah Karyawan</h3>
                                        <p className="text-[10px] text-muted-foreground font-medium uppercase">Kapasitas akses modul</p>
                                    </div>
                                    <div className="flex items-center bg-white rounded-xl border border-slate-200 overflow-hidden h-12 shadow-sm">
                                        <button 
                                            type="button"
                                            onClick={() => setQuota(Math.max(1, quota - 1))}
                                            className="px-4 hover:bg-blue-50 transition-colors text-[#2563eb] bg-blue-50/30"
                                        >
                                            <Minus size={18} strokeWidth={3} />
                                        </button>
                                        <input 
                                            type="number"
                                            value={quota}
                                            onChange={(e) => setQuota(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="w-16 text-center border-none focus-visible:ring-0 text-lg font-black bg-transparent"
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setQuota(quota + 1)}
                                            className="px-4 hover:bg-blue-50 transition-colors text-[#2563eb] bg-blue-50/30"
                                        >
                                            <Plus size={18} strokeWidth={3} />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-[10px] text-center font-bold text-muted-foreground uppercase tracking-widest bg-white py-2 rounded-lg border border-dashed border-slate-200">
                                    Akses untuk <span className="text-[#2563eb] font-black">{quota} Personil</span> aktif
                                </p>
                            </div>

                            {/* Duration Section */}
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Durasi Berlangganan</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { val: 1, label: 'Bulanan', sub: 'Normal' },
                                        { val: 6, label: '6 Bulan', sub: 'Hemat 3%', color: 'text-blue-600' },
                                        { val: 12, label: '12 Bulan', sub: 'Hemat 5%', color: 'text-blue-600' },
                                    ].map((opt) => (
                                        <button
                                            key={opt.val}
                                            type="button"
                                            onClick={() => setDurationMonths(opt.val as any)}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all bg-white",
                                                durationMonths === opt.val 
                                                    ? "border-[#2563eb] bg-blue-50/30 ring-4 ring-blue-500/10" 
                                                    : "border-slate-100 hover:border-slate-200"
                                            )}
                                        >
                                            <span className="text-sm font-black text-slate-800">{opt.label}</span>
                                            <span className={cn("text-[9px] font-black uppercase mt-1", opt.color || "text-slate-400")}>
                                                {opt.sub}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                                {pricing.savingTotal > 0 && (
                                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                                        <div className="p-1 bg-blue-500 rounded-full text-white"><Check size={10} strokeWidth={4} /></div>
                                        <p className="text-[11px] font-bold text-blue-700">
                                            Hemat Rp {pricing.savingTotal.toLocaleString('id-ID')} dengan paket {durationMonths} bulan
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-white border border-slate-100 rounded-2xl space-y-3">
                                <div className="flex items-center gap-2 text-[#2563eb]">
                                    <Info size={14} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Bantuan</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    Pilih jumlah karyawan dan durasi yang sesuai untuk mendapatkan penawaran terbaik.
                                </p>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: SUMMARY */}
                        <div className="p-6 md:p-8 space-y-8 flex flex-col bg-white border-l">
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Ringkasan Tagihan</h3>

                            <div className="space-y-5 text-sm">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground font-bold text-xs uppercase tracking-tight">Harga Dasar ({quota} Karyawan)</span>
                                        <span className="font-bold text-slate-700">Rp {pricing.monthlyBase.toLocaleString('id-ID')}</span>
                                    </div>
                                    {pricing.monthlyDiscount > 0 && (
                                        <div className="flex justify-between items-center text-blue-600">
                                            <span className="font-bold text-xs italic uppercase tracking-tight">Diskon Durasi {pricing.discountPercent}%</span>
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
                                    <p className="text-[9px] font-bold text-white/50 italic text-right">* Nilai ini belum termasuk PPN</p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 pt-6 mt-auto">
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <Button 
                                        variant="outline" 
                                        className="flex-1 font-black text-[10px] uppercase tracking-widest h-12 border-blue-200 bg-blue-50/30 hover:bg-blue-100 text-blue-700 rounded-xl"
                                        onClick={() => handleAction('trial')}
                                    >
                                        Demo 14 Hari
                                    </Button>
                                    <Button 
                                        onClick={() => handleAction('paid')}
                                        disabled={isLoading}
                                        className="flex-1 font-black text-[10px] uppercase tracking-widest h-12 bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20"
                                    >
                                        {isLoading ? <Loader2 className="animate-spin size-4" /> : <><Zap size={14} className="mr-2" /> Bayar Sekarang</>}
                                    </Button>
                                </div>
                                <div className="flex items-center justify-center gap-1.5 opacity-60">
                                    <ArrowRight size={10} />
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em]">Sistem Aktif Seketika</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
