
// src/app/(main)/subscription-management/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Shield,
  GraduationCap,
  ClipboardCheck,
  LayoutGrid,
  Users,
  Settings,
  PlusCircle,
  Save,
  Loader2,
  Tags,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ModulePricing, AddonPricing, ModuleId } from "@/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const MODULES: { id: ModuleId, name: string, icon: any, color: string }[] = [
    { id: 'appraisal', name: 'Modul Appraisal', icon: ClipboardCheck, color: 'text-blue-600' },
    { id: 'lms', name: 'Modul LMS', icon: GraduationCap, color: 'text-amber-600' },
    { id: 'collabspace', name: 'Modul CollabSpace', icon: LayoutGrid, color: 'text-emerald-600' },
];

const ADDONS = [
    { id: 'mgmt_account', name: 'Akun Manajemen (Lifetime)', icon: Shield, color: 'text-indigo-600' }
];

function PricingCard({ 
    config, 
    pricing, 
    onSave 
}: { 
    config: any, 
    pricing?: ModulePricing, 
    onSave: (id: string, data: any) => Promise<void>
}) {
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
        <Card className="shadow-sm border-border/60 hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center gap-4 pb-4">
                <div className={cn("p-2.5 rounded-xl bg-muted/50", config.color)}>
                    <config.icon size={24} />
                </div>
                <div>
                    <CardTitle className="text-sm font-black uppercase tracking-tight">{config.name}</CardTitle>
                    <CardDescription className="text-[10px] font-bold">Pengaturan Harga Dasar & Diskon</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground">Harga / User (Bulan)</Label>
                        {isEditing ? (
                            <Input 
                                type="number" 
                                value={formData.pricePerUser} 
                                onChange={(e) => setFormData(prev => ({ ...prev, pricePerUser: parseInt(e.target.value) || 0 }))}
                                className="h-9 font-bold"
                            />
                        ) : (
                            <p className="text-lg font-black text-primary">Rp {pricing?.pricePerUser?.toLocaleString('id-ID') || '0'}</p>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground">Pot. 6 Bulan (%)</Label>
                            {isEditing ? (
                                <Input 
                                    type="number" 
                                    value={formData.discount6Months} 
                                    onChange={(e) => setFormData(prev => ({ ...prev, discount6Months: parseInt(e.target.value) || 0 }))}
                                    className="h-9"
                                />
                            ) : (
                                <Badge variant="secondary" className="font-bold">{pricing?.discount6Months || 0}%</Badge>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground">Pot. 12 Bulan (%)</Label>
                            {isEditing ? (
                                <Input 
                                    type="number" 
                                    value={formData.discount12Months} 
                                    onChange={(e) => setFormData(prev => ({ ...prev, discount12Months: parseInt(e.target.value) || 0 }))}
                                    className="h-9"
                                />
                            ) : (
                                <Badge variant="default" className="font-bold">{pricing?.discount12Months || 0}%</Badge>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="pt-4 border-t bg-muted/5 flex justify-end">
                {isEditing ? (
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Batal</Button>
                        <Button size="sm" onClick={handleSave} disabled={isLoading}>
                            {isLoading ? <Loader2 className="size-3 animate-spin mr-2" /> : <Save className="size-3 mr-2" />}
                            Simpan
                        </Button>
                    </div>
                ) : (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>Ubah Harga</Button>
                )}
            </CardFooter>
        </Card>
    );
}

function AddonPricingCard({ 
    config, 
    pricing, 
    onSave 
}: { 
    config: any, 
    pricing?: AddonPricing, 
    onSave: (id: string, data: any) => Promise<void>
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [price, setPrice] = useState(pricing?.pricePerUnit ?? 0);

    const handleSave = async () => {
        setIsLoading(true);
        await onSave(config.id, { pricePerUnit: price, type: 'lifetime', name: config.name });
        setIsLoading(false);
        setIsEditing(false);
    };

    return (
        <Card className="shadow-sm border-border/60">
            <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className={cn("p-2.5 rounded-xl bg-muted/50", config.color)}>
                        <config.icon size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none mb-1">Add-on Item</p>
                        <h4 className="text-sm font-bold text-slate-800">{config.name}</h4>
                    </div>
                </div>
                
                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-muted-foreground uppercase opacity-60">Investasi Unit</p>
                        {isEditing ? (
                            <Input 
                                type="number" 
                                value={price} 
                                onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
                                className="h-8 w-32 font-bold text-right"
                            />
                        ) : (
                            <p className="text-lg font-black text-primary">Rp {pricing?.pricePerUnit?.toLocaleString('id-ID') || '0'}</p>
                        )}
                    </div>
                    {isEditing ? (
                        <Button size="sm" onClick={handleSave} disabled={isLoading}>
                             {isLoading ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                        </Button>
                    ) : (
                        <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}><Pencil className="size-4" /></Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export default function SubscriptionManagementPage() {
  const { modulePricing, addonPricing, updateModulePricing, updateAddonPricing, userRole } = useMasterData();
  const { toast } = useToast();

  if (userRole !== 'superadmin') {
      return <div className="p-20 text-center font-bold">Akses Ditolak.</div>;
  }

  return (
    <div className="space-y-10 max-w-6xl mx-auto pb-20">
      <Card className="shadow-lg border-t-4 border-primary overflow-hidden">
        <CardHeader className="bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                  <Settings className="size-6 text-primary" />
              </div>
              <div>
                  <CardTitle className="font-headline text-2xl">Pusat Konfigurasi Harga</CardTitle>
                  <CardDescription>
                      Atur nilai investasi per user untuk setiap modul dan layanan tambahan.
                  </CardDescription>
              </div>
            </div>
        </CardHeader>
      </Card>

      <section className="space-y-6">
        <div className="flex items-center gap-3 ml-1">
            <Zap className="size-5 text-primary" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Harga Per-User Modul Operasional</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {MODULES.map(mod => (
                <PricingCard 
                    key={mod.id} 
                    config={mod} 
                    pricing={modulePricing.find(p => p.id === mod.id)}
                    onSave={async (id, data) => {
                        await updateModulePricing(id, { ...data, name: mod.name });
                        toast({ title: "Konfigurasi Disimpan" });
                    }}
                />
            ))}
        </div>
      </section>

      <Separator />

      <section className="space-y-6">
        <div className="flex items-center gap-3 ml-1">
            <Tags className="size-5 text-primary" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Konfigurasi Add-on (Lifetime)</h3>
        </div>
        <div className="grid grid-cols-1 gap-4">
            {ADDONS.map(addon => (
                <AddonPricingCard 
                    key={addon.id} 
                    config={addon} 
                    pricing={addonPricing.find(p => p.id === addon.id)}
                    onSave={async (id, data) => {
                        await updateAddonPricing(id, data);
                        toast({ title: "Harga Add-on Diperbarui" });
                    }}
                />
            ))}
        </div>
      </section>
      
      <Alert className="bg-amber-50 border-amber-200">
        <Info className="size-4 text-amber-600" />
        <AlertDescription className="text-[10px] text-amber-800 font-medium">
            Perubahan harga di sini akan berdampak langsung pada kalkulasi di halaman Portal Klien saat mereka melakukan aktivasi atau perpanjangan.
        </AlertDescription>
      </Alert>
    </div>
  );
}

function Pencil({ className }: { className?: string }) {
    return <Edit className={className} />;
}
