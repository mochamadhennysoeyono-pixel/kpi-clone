// src/components/portal/module-subscription-dialog.tsx
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
    Zap, 
    CreditCard, 
    Users, 
    Calendar, 
    ArrowRight,
    Loader2,
    CheckCircle2,
    Info,
    Receipt
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import type { ModuleId, Company, ModuleSubscription } from '@/types';
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

// Pricing configuration
const BASE_PRICES: Record<ModuleId, number> = {
    'appraisal': 15000,   // Rp 15k / user / month
    'lms': 10000,         // Rp 10k / user / month
    'collabspace': 12000, // Rp 12k / user / month
};

export function ModuleSubscriptionDialog({ 
    isOpen, 
    onOpenChange, 
    module, 
    company, 
    onConfirm 
}: ModuleSubscriptionDialogProps) {
    const [quota, setQuota] = useState(10);
    const [isYearly, setIsYearly] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setQuota(10);
            setIsYearly(true);
        }
    }, [isOpen, module?.id]);

    const hasUsedTrial = useMemo(() => {
        if (!company || !module) return false;
        return company.usedTrials?.includes(module.id);
    }, [company, module]);

    const pricing = useMemo(() => {
        if (!module) return { monthlyUnit: 0, monthlyTotal: 0, total: 0, discount: 0 };
        const monthlyUnit = BASE_PRICES[module.id];
        const monthlyTotal = quota * monthlyUnit;
        
        if (isYearly) {
            const annualRaw = monthlyTotal * 12;
            const discount = annualRaw * 0.2; // 20% discount for yearly
            return {
                monthlyUnit,
                monthlyTotal,
                total: annualRaw - discount,
                discount: discount
            };
        }

        return {
            monthlyUnit,
            monthlyTotal,
            total: monthlyTotal,
            discount: 0
        };
    }, [module, quota, isYearly]);

    const handleAction = async (type: 'trial' | 'paid') => {
        setIsLoading(true);
        try {
            await onConfirm({
                type,
                quota: type === 'trial' ? 10 : quota,
                duration: isYearly ? 365 : 30,
                totalPrice: type === 'trial' ? 0 : pricing.total
            });
            onOpenChange(false);
        } finally {
            setIsLoading(false);
        }
    };

    if (!module) return null;

    const Icon = module.icon;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl rounded-[2rem] flex flex-col max-h-[90vh]">
                {/* Minimal Header */}
                <div className="p-4 px-6 flex items-center justify-between bg-muted/20 border-b">
                    <div className="flex items-center gap-3">
                        <div className={cn("p-1.5 rounded-lg", module.bg, module.color)}>
                            <Icon size={16} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/60">{module.name}</span>
                    </div>
                </div>

                <ScrollArea className="flex-1 min-h-0 bg-background">
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
                        {/* LEFT: CONFIGURATION */}
                        <div className="lg:col-span-3 p-8 md:p-10 space-y-10">
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black tracking-tight">Konfigurasi Akses</h3>
                                <p className="text-sm text-muted-foreground font-medium">Tentukan jumlah personil dan durasi penggunaan modul.</p>
                            </div>

                            <div className="space-y-6">
                                <div className="flex justify-between items-end">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Kapasitas User</Label>
                                    <div className="text-right">
                                        <span className="text-4xl font-black text-primary">{quota}</span>
                                        <span className="ml-1.5 text-xs font-bold text-muted-foreground uppercase tracking-widest">Seats</span>
                                    </div>
                                </div>
                                <Slider 
                                    value={[quota]} 
                                    onValueChange={(vals) => setQuota(vals[0])}
                                    max={200}
                                    min={5}
                                    step={5}
                                    className="py-4"
                                />
                                <div className="flex justify-between text-[9px] font-bold text-muted-foreground uppercase px-1">
                                    <span>Min. 5 User</span>
                                    <span>Maks. 200 User</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Siklus Penagihan</Label>
                                <div 
                                    className={cn(
                                        "flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer group",
                                        isYearly ? "bg-primary/5 border-primary/20 shadow-sm" : "bg-background border-border/40 hover:border-border"
                                    )}
                                    onClick={() => setIsYearly(!isYearly)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "size-10 rounded-xl flex items-center justify-center border shadow-sm transition-colors",
                                            isYearly ? "bg-primary text-white border-primary" : "bg-muted text-muted-foreground"
                                        )}>
                                            <Calendar size={18} />
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-black uppercase tracking-tight">Langganan Tahunan</p>
                                            <p className="text-[10px] font-medium text-muted-foreground">Bayar sekali untuk 12 bulan penuh.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {isYearly && <Badge className="bg-emerald-500 text-white border-none text-[8px] h-4 font-black">HEMAT 20%</Badge>}
                                        <Switch checked={isYearly} onCheckedChange={setIsYearly} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: SUMMARY (The "Invoice" Side) */}
                        <div className="lg:col-span-2 bg-muted/30 border-l border-border/40 p-8 md:p-10 flex flex-col justify-between">
                            <div className="space-y-8">
                                <div className="flex items-center gap-2 text-primary">
                                    <Receipt size={18} />
                                    <h4 className="text-[10px] font-black uppercase tracking-widest">Ringkasan Tagihan</h4>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-muted-foreground font-medium">Biaya per User / Bulan</span>
                                        <span className="font-bold">Rp {pricing.monthlyUnit.toLocaleString('id-ID')}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-muted-foreground font-medium">Total User ({quota})</span>
                                        <span className="font-bold">Rp {pricing.monthlyTotal.toLocaleString('id-ID')}</span>
                                    </div>
                                    {isYearly && (
                                        <div className="flex justify-between items-center text-xs text-emerald-600">
                                            <span className="font-medium">Potongan Tahunan (20%)</span>
                                            <span className="font-bold">-Rp {pricing.discount.toLocaleString('id-ID')}</span>
                                        </div>
                                    )}
                                    <Separator className="bg-border/60" />
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Investasi</span>
                                            <span className="text-2xl font-black text-primary">
                                                Rp {Math.round(pricing.total).toLocaleString('id-ID')}
                                            </span>
                                        </div>
                                        <p className="text-right text-[9px] font-bold text-muted-foreground uppercase opacity-60">
                                            DITAGIHKAN SETIAP {isYearly ? 'TAHUN' : 'BULAN'}
                                        </p>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-background/50 border border-border/40 border-dashed space-y-3">
                                    <div className="flex gap-2 text-primary">
                                        <Info size={14} className="shrink-0 mt-0.5" />
                                        <p className="text-[10px] font-medium leading-relaxed italic opacity-80">
                                            * Nilai ini belum termasuk PPN 11%. Tagihan final akan muncul saat Anda melanjutkan ke metode pembayaran.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 mt-10">
                                <Button 
                                    onClick={() => handleAction('paid')} 
                                    disabled={isLoading}
                                    className="h-12 w-full font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 group"
                                >
                                    {isLoading ? <Loader2 className="animate-spin size-4" /> : <CreditCard size={18} className="mr-2 group-hover:translate-x-0.5 transition-transform" />}
                                    Lanjutkan Pembayaran
                                </Button>

                                {!hasUsedTrial ? (
                                    <Button 
                                        variant="outline" 
                                        onClick={() => handleAction('trial')}
                                        disabled={isLoading}
                                        className="h-12 w-full font-black uppercase tracking-widest border-2 text-primary hover:bg-primary/5 rounded-xl transition-all text-[10px]"
                                    >
                                        <Zap size={16} className="mr-2" /> Aktifkan Trial 14 Hari
                                    </Button>
                                ) : (
                                    <p className="text-center text-[9px] text-muted-foreground font-black uppercase tracking-tight opacity-40">
                                        Trial telah digunakan untuk modul ini
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
