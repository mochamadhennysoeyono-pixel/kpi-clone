// src/app/(main)/group-management/page.tsx
"use client";

import { useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';
import { Building, GitMerge, AlertTriangle, Filter } from 'lucide-react';
import type { Company } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { ResponsivePage, ResponsiveToolbar } from "@/components/ui/adaptive-layout";
import { PageHeader } from "@/components/ui/page-header";
import { AdaptiveTable } from "@/components/ui/adaptive-table";
import { Badge } from "@/components/ui/badge";
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function GroupManagementPage() {
  const { companies, updateCompany } = useMasterData();
  const { userRole } = useAuth();
  const { toast } = useToast();

  const handleToggleHoldingStatus = async (company: Company) => {
    try {
        await updateCompany(company.id, { isHolding: !company.isHolding });
        toast({ title: "Status Diperbarui" });
    } catch (e) {
        toast({ variant: "destructive", title: "Gagal", description: "Terjadi kesalahan sistem." });
    }
  };
  
  const handleToggleCanBecomeHolding = async (company: Company) => {
    try {
        await updateCompany(company.id, { canBecomeHolding: !company.canBecomeHolding });
        toast({ title: "Izin Diperbarui" });
    } catch (e) {
        toast({ variant: "destructive", title: "Gagal", description: "Terjadi kesalahan sistem." });
    }
  };

  if (userRole !== 'superadmin') return <div className="p-20 text-center font-bold">Akses Ditolak.</div>;

  return (
    <ResponsivePage>
      <PageHeader 
        title="Manajemen Status Holding"
        description="Aktifkan fitur struktur induk-anak (Group) untuk perusahaan yang memenuhi syarat."
        icon={GitMerge}
      />

      <AdaptiveTable 
        data={companies}
        keyExtractor={(c) => c.id}
        columns={[
          {
            header: "Klien",
            cell: (c) => (
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-primary/5 text-primary flex items-center justify-center border shrink-0">
                  {c.isHolding ? <GitMerge className="size-5" /> : <Building className="size-5" />}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-black">{c.businessField}</p>
                </div>
              </div>
            )
          },
          {
            header: "Status Hirarki",
            cell: (c) => (
                c.isHolding ? <Badge className="bg-primary text-white text-[9px] font-black uppercase">Holding Aktif</Badge> : 
                c.parentId ? <Badge variant="secondary" className="text-[9px] font-black uppercase">Anak Perusahaan</Badge> : 
                <Badge variant="outline" className="text-[9px] font-black uppercase">Standalone</Badge>
            )
          },
          {
            header: "Izin Upgrade",
            cell: (c) => (
                <div className="flex items-center gap-3">
                    <Switch checked={!!c.canBecomeHolding} onCheckedChange={() => handleToggleCanBecomeHolding(c)} disabled={!!c.parentId} />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{c.canBecomeHolding ? 'Ya' : 'Tidak'}</span>
                </div>
            )
          },
          {
            header: "Mode Holding",
            className: "text-right",
            cell: (c) => (
                <div className="flex items-center justify-end gap-3">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{c.isHolding ? 'Aktif' : 'Nonaktif'}</span>
                    <Switch checked={!!c.isHolding} onCheckedChange={() => handleToggleHoldingStatus(c)} disabled={!!c.parentId} />
                </div>
            )
          }
        ]}
        renderMobileCard={(c) => (
          <Card className="border-border/40 shadow-sm overflow-hidden">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center border shrink-0">
                    {c.isHolding ? <GitMerge size={20} /> : <Building size={20} />}
                </div>
                <div className="min-w-0 flex-1">
                   <h3 className="font-black text-sm uppercase truncate">{c.name}</h3>
                   <p className="text-[10px] text-muted-foreground uppercase font-bold">{c.businessField}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                  <div className="space-y-2">
                      <Label className="text-[8px] font-black uppercase opacity-60">Izin Upgrade</Label>
                      <div className="flex items-center gap-2"><Switch checked={!!c.canBecomeHolding} onCheckedChange={() => handleToggleCanBecomeHolding(c)} disabled={!!c.parentId} className="scale-75 origin-left" /></div>
                  </div>
                  <div className="space-y-2 text-right">
                      <Label className="text-[8px] font-black uppercase opacity-60">Mode Holding</Label>
                      <div className="flex items-center justify-end gap-2"><Switch checked={!!c.isHolding} onCheckedChange={() => handleToggleHoldingStatus(c)} disabled={!!c.parentId} className="scale-75" /></div>
                  </div>
              </div>
            </CardContent>
          </Card>
        )}
      />
    </ResponsivePage>
  );
}
