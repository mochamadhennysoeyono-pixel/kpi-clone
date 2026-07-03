
// src/app/(main)/subscription-management/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useMasterData } from "@/contexts/master-data-context";
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
  PlusCircle,
  Crown,
  Users,
  Building,
  CheckCircle,
  XCircle,
  Trash2,
  Shield,
  GraduationCap,
  ClipboardCheck,
  LayoutGrid,
  Target,
  FileText,
  Bot,
  GitMerge,
  Info,
  Sparkles,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SubscriptionPlan } from "@/types";
import { SubscriptionPlanFormSheet } from "@/components/subscriptions/subscription-plan-form-sheet";
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function FeatureCheck({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-tight">
      {enabled ? (
        <CheckCircle className="h-3 w-3 text-green-500" />
      ) : (
        <XCircle className="h-3 w-3 text-muted-foreground/30" />
      )}
      <span className={cn(enabled ? "text-foreground" : "text-muted-foreground/50")}>{label}</span>
    </div>
  );
}

export default function SubscriptionManagementPage() {
  const { subscriptionPlans, addSubscriptionPlan, updateSubscriptionPlan, deleteSubscriptionPlan } = useMasterData();
  const { toast } = useToast();
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | undefined>(undefined);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<SubscriptionPlan | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const sortedPlans = useMemo(() => {
    if (!subscriptionPlans) return [];
    return [...subscriptionPlans].sort((a, b) => a.price - b.price);
  }, [subscriptionPlans]);

  const handleAddPlan = () => {
    setSelectedPlan(undefined);
    setSheetOpen(true);
  };

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setSheetOpen(true);
  };
  
  const handleSavePlan = async (data: Omit<SubscriptionPlan, 'id'> & { id?: string }) => {
    try {
      if (data.id) {
        await updateSubscriptionPlan(data.id, data);
        toast({ title: "Paket Diperbarui" });
      } else {
        await addSubscriptionPlan(data);
        toast({ title: "Paket Baru Ditambahkan" });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Gagal Menyimpan', description: e.message });
    }
  };

  const handleInitializeDefaultPlans = async () => {
    setIsInitializing(true);
    const defaults: Omit<SubscriptionPlan, 'id'>[] = [
        {
            name: "TRIAL",
            title: "14 Days Free Trial",
            description: "Paket uji coba gratis untuk eksplorasi seluruh fitur utama KIPIAI.",
            price: 0,
            userLimit: 5,
            managementUserLimit: 1,
            companyLimit: 2, // Allow small testing group
            durationDays: 14,
            status: 'Active',
            benefitList: ["Akses KPI & KBO", "Akses CollabSpace", "Fitur AI (KIPI) Aktif", "Analisis Laporan Standar"],
            features: {
                allowHolding: false, allowKpi: true, allowKbo: true, allowOkr: true, 
                allowReporting: true, allowLms: false, allowCollabSpace: true, 
                allowAiFeatures: true, allowDocumentManagement: false
            }
        },
        {
            name: "BASIC",
            title: "Standard Performance",
            description: "Solusi terjangkau untuk UKM yang fokus pada manajemen KPI & KBO.",
            price: 2500000,
            userLimit: 25,
            managementUserLimit: 1,
            companyLimit: 0,
            durationDays: 365,
            status: 'Active',
            benefitList: ["Manajemen KPI Lengkap", "Penilaian KBO", "Target Dashboard", "Support Email"],
            features: {
                allowHolding: false, allowKpi: true, allowKbo: true, allowOkr: false, 
                allowReporting: true, allowLms: false, allowCollabSpace: false, 
                allowAiFeatures: false, allowDocumentManagement: false
            }
        },
        {
            name: "PROFESSIONAL",
            title: "Advanced Growth",
            description: "Paket lengkap untuk perusahaan yang ingin akselerasi performa dengan OKR & AI.",
            price: 7500000,
            userLimit: 100,
            managementUserLimit: 2,
            companyLimit: 2, // Enable small holding by default for PRO
            durationDays: 365,
            status: 'Active',
            benefitList: ["Semua Fitur Basic", "Manajemen OKR", "CollabSpace Aktif", "AI KPI Wizard", "Prioritas Support"],
            features: {
                allowHolding: true, allowKpi: true, allowKbo: true, allowOkr: true, 
                allowReporting: true, allowLms: true, allowCollabSpace: true, 
                allowAiFeatures: true, allowDocumentManagement: true
            }
        },
        {
            name: "ENTERPRISE",
            title: "Group & Holding",
            description: "Solusi korporasi untuk manajemen grup perusahaan (Holding) dengan kendali penuh.",
            price: 15000000,
            userLimit: -1,
            managementUserLimit: 5,
            companyLimit: 10,
            durationDays: 365,
            status: 'Active',
            benefitList: ["Akses Holding/Grup", "Unlimited User", "Full AI Capabilities", "Manajemen Dokumen Lanjutan", "Dedicated Account Manager"],
            features: {
                allowHolding: true, allowKpi: true, allowKbo: true, allowOkr: true, 
                allowReporting: true, allowLms: true, allowCollabSpace: true, 
                allowAiFeatures: true, allowDocumentManagement: true
            }
        }
    ];

    try {
        for (const plan of defaults) {
            await addSubscriptionPlan(plan);
        }
        toast({ title: "Inisialisasi Berhasil", description: "Paket telah diperbarui dengan kuota grup yang lebih baik." });
        await fetchData(true);
    } catch (e: any) {
        toast({ variant: 'destructive', title: "Gagal Inisialisasi", description: e.message });
    } finally {
        setIsInitializing(false);
    }
  };

  const openDeleteDialog = (plan: SubscriptionPlan) => {
    setPlanToDelete(plan);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!planToDelete) return;
    try {
      await deleteSubscriptionPlan(planToDelete.id);
      toast({ title: "Paket Dihapus" });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Gagal Menghapus', description: e.message });
    } finally {
      setPlanToDelete(null);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <Card className="shadow-lg border-t-4 border-primary overflow-hidden">
          <CardHeader className="bg-muted/30">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <Crown className="size-6 text-primary" />
                </div>
                <div>
                    <CardTitle className="font-headline text-2xl">Rencana Berlangganan</CardTitle>
                    <CardDescription>
                        Kelola struktur paket harga dan fitur SaaS Anda.
                    </CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleInitializeDefaultPlans} disabled={isInitializing}>
                    {isInitializing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-primary" />}
                    Update Paket Standar
                </Button>
                <Button onClick={handleAddPlan} className="font-bold shadow-md">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Buat Paket Baru
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {sortedPlans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedPlans.map((plan) => (
              <Card key={plan.id} className={cn(
                  "flex flex-col hover:shadow-md transition-all border-t-4",
                  plan.status === 'Draft' ? "border-t-slate-300 opacity-70" : "border-t-primary"
              )}>
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-lg font-black text-primary uppercase">{plan.name}</CardTitle>
                            {plan.status === 'Draft' && <Badge variant="secondary" className="text-[8px] h-4">DRAF</Badge>}
                        </div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{plan.title || "Tanpa Judul Badge"}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-black">Rp{plan.price.toLocaleString('id-ID')}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Durasi: {plan.durationDays} Hari</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow space-y-6">
                  <div className="space-y-3">
                      <div className="flex items-center gap-3 text-xs font-bold text-foreground/70">
                        <Users className="size-4 text-muted-foreground" />
                        <span>Limit: {plan.userLimit === -1 ? "Tak Terbatas" : `${plan.userLimit} Staff`}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-bold text-foreground/70">
                        <Shield className="size-4 text-muted-foreground" />
                        <span>Limit: {plan.managementUserLimit === -1 ? "Tak Terbatas" : `${plan.managementUserLimit} Admin`}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-bold text-foreground/70">
                        <Building className="size-4 text-muted-foreground" />
                        <span>Grup: {plan.features.allowHolding ? (plan.companyLimit === -1 ? "Tak Terbatas" : `${plan.companyLimit} Cabang`) : "Hanya 1 Perusahaan"}</span>
                      </div>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/30 border border-dashed border-muted-foreground/20 space-y-2">
                    <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Fitur & Modul</h4>
                    <div className="grid grid-cols-2 gap-y-2">
                        <FeatureCheck label="KPI" enabled={plan.features.allowKpi} />
                        <FeatureCheck label="KBO" enabled={plan.features.allowKbo} />
                        <FeatureCheck label="OKR" enabled={plan.features.allowOkr} />
                        <FeatureCheck label="LMS" enabled={plan.features.allowLms} />
                        <FeatureCheck label="Collab" enabled={plan.features.allowCollabSpace} />
                        <FeatureCheck label="AI (KIPI)" enabled={plan.features.allowAiFeatures} />
                        <FeatureCheck label="Docs" enabled={plan.features.allowDocumentManagement} />
                        <FeatureCheck label="Report" enabled={plan.features.allowReporting} />
                    </div>
                  </div>

                  {plan.benefitList && plan.benefitList.length > 0 && (
                      <div className="space-y-2">
                          <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Manfaat Paket</h4>
                          <ul className="space-y-1">
                              {plan.benefitList.map((benefit, i) => (
                                  <li key={i} className="text-xs flex items-start gap-2">
                                      <div className="size-1 rounded-full bg-primary mt-1.5 shrink-0" />
                                      <span className="text-foreground/80">{benefit}</span>
                                  </li>
                              ))}
                          </ul>
                      </div>
                  )}
                </CardContent>
                <CardFooter className="pt-4 border-t bg-muted/10 gap-2">
                  <Button variant="outline" size="sm" className="flex-1 font-bold text-xs" onClick={() => handleEditPlan(plan)}>Ubah Paket</Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-red-50" onClick={() => openDeleteDialog(plan)}>
                    <Trash2 className="size-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center border-2 border-dashed rounded-3xl opacity-40">
              <Crown className="size-16 mx-auto mb-4 text-muted-foreground" />
              <p className="font-bold">Belum Ada Rencana Berlangganan</p>
              <p className="text-sm">Klik tombol "Buat Paket Baru" atau "Gunakan Paket Standar" untuk mulai.</p>
          </div>
        )}
      </div>

      <SubscriptionPlanFormSheet
        isOpen={isSheetOpen}
        onOpenChange={setSheetOpen}
        plan={selectedPlan}
        onSave={handleSavePlan}
      />
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        itemName={`paket ${planToDelete?.name || ''}`}
        itemType="paket subscription"
      />
    </>
  );
}
