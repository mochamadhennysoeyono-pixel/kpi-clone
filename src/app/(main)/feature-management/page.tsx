// src/app/(main)/feature-management/page.tsx
"use client";

import { useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useMasterData } from "@/contexts/master-data-context";
import { KeyRound, Building, Search, Filter } from "lucide-react";
import type { Company } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { ResponsivePage, ResponsiveToolbar } from "@/components/ui/adaptive-layout";
import { PageHeader } from "@/components/ui/page-header";
import { AdaptiveTable } from "@/components/ui/adaptive-table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// Define some features to manage (even if empty now, let's make the UI adaptive)
const features: { key: string, label: string }[] = [
    { key: 'hasAiKpiWizard', label: 'AI KPI Wizard' },
    { key: 'hasPageAssistant', label: 'Assistant' },
    { key: 'hasFeedbackCoach', label: 'Feedback Coach' },
];

export default function FeatureManagementPage() {
  const { companies, updateCompany } = useMasterData();
  const { userRole } = useAuth();
  const { toast } = useToast();

  const handleToggleFeature = async (company: Company, feature: string, checked: boolean) => {
    try {
      const currentFeatures = company.features || {};
      await updateCompany(company.id, {
        features: { ...currentFeatures, [feature]: checked },
      });
      toast({ title: "Fitur Diperbarui" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal", description: e.message });
    }
  };

  if (userRole !== 'superadmin') return <div className="p-20 text-center font-bold">Akses Ditolak.</div>;

  return (
    <ResponsivePage>
      <PageHeader 
        title="Manajemen Fitur Add-On"
        description="Aktifkan atau nonaktifkan fitur tambahan/AI untuk setiap perusahaan klien secara individu."
        icon={KeyRound}
      />

      <AdaptiveTable 
        data={companies}
        keyExtractor={(c) => c.id}
        columns={[
          {
            header: "Perusahaan",
            cell: (c) => (
              <div className="flex flex-col">
                <span className="font-bold text-slate-900 text-sm">{c.name}</span>
                <span className="text-[9px] font-black uppercase text-muted-foreground">{c.businessField}</span>
              </div>
            )
          },
          ...features.map(f => ({
            header: f.label,
            className: "text-center",
            cell: (c: Company) => (
                <div className="flex flex-col items-center gap-1">
                    <Switch checked={!!(c.features as any)?.[f.key]} onCheckedChange={(v) => handleToggleFeature(c, f.key, v)} className="scale-75" />
                    <span className="text-[8px] font-bold uppercase opacity-40">{(c.features as any)?.[f.key] ? 'On' : 'Off'}</span>
                </div>
            )
          }))
        ]}
        renderMobileCard={(c) => (
          <Card className="border-border/40 shadow-sm">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b">
                <div className="size-8 rounded-lg bg-primary/5 text-primary flex items-center justify-center border shrink-0">
                    <Building size={16} />
                </div>
                <h3 className="font-black text-sm uppercase truncate">{c.name}</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                  {features.map(f => (
                      <div key={f.key} className="p-2 rounded-lg bg-muted/30 flex items-center justify-between">
                          <span className="text-[9px] font-black uppercase text-slate-600">{f.label}</span>
                          <Switch checked={!!(c.features as any)?.[f.key]} onCheckedChange={(v) => handleToggleFeature(c, f.key, v)} className="scale-75" />
                      </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      />
    </ResponsivePage>
  );
}
