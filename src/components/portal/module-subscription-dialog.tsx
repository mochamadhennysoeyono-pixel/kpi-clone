
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
    ShoppingCart, 
    Users, 
    Calendar, 
    CreditCard, 
    ArrowRight,
    Loader2,
    CheckCircle2
} from 'lucide-react';
import type { ModuleId, Company, ModuleSubscription } from '@/types';
import { cn } from '@/lib/utils';

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

    // Reset state when dialog opens for a new module
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
        if (!module) return { monthly: 0, total: 0, discount: 0 };
        const basePrice = BASE_PRICES[module.id];
        const monthlyTotal = quota * basePrice;
        
        if (isYearly) {
            const annualRaw = monthlyTotal * 12;
            const discount = annualRaw * 0.2; // 20% discount for yearly
            return {
                monthly: (annualRaw - discount) / 12,
                total: annualRaw - discount,
                discount: discount
            };
        }

        return {
            monthly: monthlyTotal,
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
            <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
                <div className={cn("p-8 text-white relative", module.bg.replace('/20', ''))}>
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Icon size={120} />
                    </div>
                    <DialogHeader className="relative z-10 text-left">
                        <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl w-fit mb-4">
                            <Icon size={32} className="text-white" />
                        </div>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tight">Kustomisasi {module.name}</DialogTitle>
                        <DialogDescription className="text-white/80 font-medium text-sm">
                            Konfigurasi kapasitas dan durasi akses untuk tim Anda.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-8 space-y-8 bg-background">
                    {/* User Quota Slider */}
                    <div className="space-y-6">
                        <div className="flex justify-between items-end">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Kapasitas User</Label>
                            <div className="text-right">
                                <span className="text-3xl font-black text-primary">{quota}</span>
                                <span className="ml-1.5 text-xs font-bold text-muted-foreground uppercase">Seats</span>
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

                    {/* Duration Toggle */}
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-dashed border-border/60">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-background flex items-center justify-center border shadow-sm">
                                <Calendar size={18} className="text-primary" />
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-xs font-black uppercase tracking-tight">Tagihan Tahunan</p>
                                <Badge className="bg-emerald-500 text-white border-none text-[8px] h-4 font-black">HEMAT 20%</Badge>
                            </div>
                        </div>
                        <Switch checked={isYearly} onCheckedChange={setIsYearly} />
                    </div>

                    {/* Price Breakdown */}
                    <div className="space-y-4 pt-4 border-t border-border/40">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground font-medium">Estimasi per bulan</span>
                            <span className="font-bold">Rp {Math.round(pricing.monthly).toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Total Investasi</span>
                            <div className="text-right">
                                <p className="text-2xl font-black text-foreground leading-none">
                                    Rp {Math.round(pricing.total).toLocaleString('id-ID')}
                                </p>
                                <p className="text-[9px] font-bold text-muted-foreground mt-1 uppercase">
                                    Satu kali bayar untuk {isYearly ? '12 Bulan' : '30 Hari'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-8 pt-0 flex flex-col gap-3 bg-background">
                    <Button 
                        onClick={() => handleAction('paid')} 
                        disabled={isLoading}
                        className="h-12 w-full font-black uppercase tracking-widest shadow-xl transition-all active:scale-95"
                    >
                        {isLoading ? <Loader2 className="animate-spin size-4" /> : <CreditCard size={18} className="mr-2" />}
                        Berlangganan Sekarang
                    </Button>

                    {!hasUsedTrial ? (
                        <Button 
                            variant="outline" 
                            onClick={() => handleAction('trial')}
                            disabled={isLoading}
                            className="h-12 w-full font-bold border-2 text-primary hover:bg-primary/5 rounded-xl transition-all"
                        >
                            <Zap size={18} className="mr-2" /> Coba Gratis 14 Hari (10 User)
                        </Button>
                    ) : (
                        <p className="text-center text-[10px] text-muted-foreground font-medium italic opacity-60">
                            * Jatah Trial untuk modul ini sudah digunakan.
                        </p>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
