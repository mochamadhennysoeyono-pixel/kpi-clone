// src/app/(main)/subscription-management/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import { 
  Shield, 
  GraduationCap, 
  ClipboardCheck, 
  LayoutGrid, 
  Settings, 
  Save, 
  Loader2, 
  Tags, 
  Zap, 
  Edit, 
  Info,
  Crown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ModulePricing, AddonPricing, ModuleId } from "@/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ResponsivePage } from "@/components/ui/adaptive-layout";
import { PageHeader } from "@/components/ui/page-header";
import { AdaptiveCardGrid, AdaptiveInsightCard } from "@/components/ui/adaptive-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

const MODULES: { id: ModuleId, name: string, icon: any, color: string }[] = [
    { id: 'appraisal', name: 'Modul Appraisal', icon: ClipboardCheck, color: 'text-blue-600' },
    { id: 'lms', name: 'Modul LMS', icon: GraduationCap, color: 'text-amber-600' },
    { id: 'collabspace', name: 'Modul CollabSpace', icon: LayoutGrid, color: 'text-emerald-600' },
];

const ADDONS = [
    { id: 'mgmt_account', name: 'Akun Manajemen (Lifetime)', icon: Shield, color: 'text-indigo-600' }
];

function PricingCard({ config, pricing, onSave }: { config: any, pricing?: ModulePricing, onSave: (id: string, data: any) => Promise<void> }) {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        pricePerUser: pricing?.pricePerUser ?? 0,
        discount6Months: pricing?.discount6Months ?? 0,
        discount12Months: pricing?.discount12Months ?? 0
    });

    const handleSave = async () => {
        setIsLoading(true);
        await onSave(config.id, formData);
        setIsLoading(false);
        setIsEditing(false);
    };

    return (
        <Card className="border-border/60 hover:shadow-md transition-all flex flex-col overflow-hidden bg-background">
            <CardContent className="p-4 sm:p-6 flex-1 space-y-4">
                <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-xl bg-muted/50", config.color)}>
                        <config.icon size={20} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">{config.name}</p>
                        <h4 className="text-xs font-bold text-slate-800">Harga Dasar</h4>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase text-muted-foreground opacity-60">Harga / User (Bulan)</Label>
                        {isEditing ? (
                            <Input type="number" value={formData.pricePerUser} onChange={(e) => setFormData(prev => ({ ...prev, pricePerUser: parseInt(e.target.value) || 0 }))} className="h-9 font-black" />
                        ) : (
                            <p className="text-xl font-black text-primary">Rp {pricing?.pricePerUser?.toLocaleString('id-ID') || '0'}</p>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-[8px] font-black uppercase text-muted-foreground">Diskon 6 Bln</Label>
                            {isEditing ? <Input type="number" value={formData.discount6Months} onChange={(e) => setFormData(prev => ({ ...prev, discount6Months: parseInt(e.target.value) || 0 }))} className="h-8 text-xs" /> : <Badge variant="secondary" className="font-bold text-[10px]">{pricing?.discount6Months || 0}%</Badge>}
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[8px] font-black uppercase text-muted-foreground">Diskon 12 Bln</Label>
                            {isEditing ? <Input type="number" value={formData.discount12Months} onChange={(e) => setFormData(prev => ({ ...prev, discount12Months: parseInt(e.target.value) || 0 }))} className="h-8 text-xs" /> : <Badge variant="default" className="font-bold text-[10px]">{pricing?.discount12Months || 0}%</Badge>}
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="p-4 bg-muted/5 border-t">
                {isEditing ? (
                    <div className="flex gap-2 w-full">
                        <Button variant="ghost" size="sm" className="flex-1 h-8 text-[10px] font-bold" onClick={() => setIsEditing(false)}>BATAL</Button>
                        <Button size="sm" className="flex-1 h-8 text-[10px] font-bold" onClick={handleSave} disabled={isLoading}>{isLoading ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3 mr-1.5" />} SIMPAN</Button>
                    </div>
                ) : (
                    <Button variant="outline" size="sm" className="w-full h-8 text-[10px] font-black uppercase" onClick={() => setIsEditing(true)}>Ubah Harga</Button>
                )}
            </CardFooter>
        </Card>
    );
}

export default function SubscriptionManagementPage() {
  const { modulePricing, addonPricing, updateModulePricing, updateAddonPricing } = useMasterData();
  const { userRole } = useAuth();
  const { toast } = useToast();

  if (userRole !== 'superadmin') return <div className="p-20 text-center font-bold">Akses Ditolak.</div>;

  return (
    <ResponsivePage>
      <PageHeader 
        title="Manajemen Langganan"
        description="Atur nilai investasi per user untuk setiap modul dan layanan tambahan sistem secara global."
        icon={Crown}
      />

      <div className="space-y-8">
        <section className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-2">
                <Zap size={14} className="text-primary" /> Harga Modul Operasional
            </h3>
            <AdaptiveCardGrid complexity="medium">
                {MODULES.map(mod => (
                    <PricingCard 
                        key={mod.id} 
                        config={mod} 
                        pricing={modulePricing.find(p => p.id === mod.id)}
                        onSave={async (id, data) => {
                            await updateModulePricing(id, { ...data, name: mod.name });
                            toast({ title: "Harga Diperbarui" });
                        }}
                    />
                ))}
            </AdaptiveCardGrid>
        </section>

        <Separator className="opacity-50" />

        <section className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-2">
                <Tags size={14} className="text-primary" /> Layanan Tambahan (Add-ons)
            </h3>
            <AdaptiveCardGrid complexity="complex">
                {ADDONS.map(addon => {
                    const pricing = addonPricing.find(p => p.id === addon.id);
                    return (
                        <Card key={addon.id} className="border-border/60 shadow-sm overflow-hidden bg-background">
                            <CardContent className="p-5 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className={cn("p-2.5 rounded-xl bg-muted/50", addon.color)}>
                                        <addon.icon size={22} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-muted-foreground uppercase leading-none mb-1">Lifetime</p>
                                        <h4 className="text-sm font-bold text-slate-800">{addon.name}</h4>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-muted-foreground uppercase opacity-60">Nilai Unit</p>
                                    <p className="text-lg font-black text-primary">Rp {pricing?.pricePerUnit?.toLocaleString('id-ID') || '0'}</p>
                                </div>
                            </CardContent>
                            <CardFooter className="p-3 bg-muted/5 border-t">
                                <Button variant="ghost" size="sm" className="w-full h-8 text-[10px] font-bold gap-2">
                                    <Edit size={12} /> SESUAIKAN HARGA
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                })}
            </AdaptiveCardGrid>
        </section>

        <Alert className="bg-amber-50 border-amber-200">
            <Info className="size-4 text-amber-600" />
            <AlertDescription className="text-[11px] text-amber-800 font-medium leading-relaxed">
                PENTING: Perubahan harga di sini akan berdampak langsung pada simulasi tagihan di portal klien. Pastikan nilai investasi sudah sesuai dengan kebijakan bisnis terbaru.
            </AlertDescription>
        </Alert>
      </div>
    </ResponsivePage>
  );
}
