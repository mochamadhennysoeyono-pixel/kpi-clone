// src/app/(main)/activation-management/page.tsx
"use client";

import { useState, useMemo } from "react";
import {
  Check,
  Clock,
  Trash2,
  Building,
  User,
  Calendar,
  ClipboardCheck,
} from "lucide-react";
import type { Company, Employee } from "@/types";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";
import { db } from "@/lib/firebase/client";
import { runTransaction, doc, deleteDoc } from "firebase/firestore";
import { ResponsivePage } from "@/components/ui/adaptive-layout";
import { PageHeader } from "@/components/ui/page-header";
import { AdaptiveTable } from "@/components/ui/adaptive-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ActivationManagementPage() {
  const { companies, employees, fetchData } = useMasterData();
  const { userRole } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{company: Company, admin?: Employee} | null>(null);

  const pendingCompanies = useMemo(() => {
    return companies
        .filter(c => c.status === 'Menunggu Persetujuan')
        .map(company => {
            const admin = employees.find(e => e.company === company.name && e.role === 'manajemen');
            return { ...company, admin };
        });
  }, [companies, employees]);

  const handleActivate = async (company: Company, admin?: Employee) => {
    setIsLoading(true);
    try {
      await runTransaction(db, async (transaction) => {
        const companyRef = doc(db, "companies", company.id);
        const activationDate = new Date();
        const expiryDate = addDays(activationDate, 14);
        
        const dataToUpdate: Partial<Company> = { 
            status: 'Aktif',
            subscriptionPlanId: 'default-trial',
            subscriptionActivationDate: activationDate.toISOString(),
            subscriptionExpiryDate: expiryDate.toISOString(),
            customUserLimit: 5,
            customManagementUserLimit: 2,
            canBecomeHolding: false,
        };

        transaction.update(companyRef, dataToUpdate);

        if (admin) {
            const adminRef = doc(db, "employees", admin.id);
            transaction.update(adminRef, { status: 'Aktif' });
        }
      });
      
      await fetchData();
      toast({ title: "Aktivasi Berhasil", description: `Perusahaan ${company.name} aktif dengan paket Trial 14 hari.` });
    } catch (e: any) {
        toast({ variant: "destructive", title: "Gagal Aktivasi", description: e.message });
    } finally {
        setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setIsLoading(true);
    try {
        if (itemToDelete.admin) await deleteDoc(doc(db, "employees", itemToDelete.admin.id));
        await deleteDoc(doc(db, "companies", itemToDelete.company.id));
        await fetchData();
        toast({ title: "Pendaftaran Dihapus" });
    } catch (e: any) {
         toast({ variant: "destructive", title: "Gagal Menghapus", description: e.message });
    } finally {
        setIsLoading(false);
        setDeleteDialogOpen(false);
        setItemToDelete(null);
    }
  }

  if (userRole !== 'superadmin') {
    return <div className="p-20 text-center font-bold">Akses Ditolak.</div>;
  }

  return (
    <ResponsivePage>
      <PageHeader 
        title="Aktivasi Perusahaan"
        description="Tinjau dan aktifkan pendaftaran perusahaan baru yang masuk melalui formulir registrasi."
        icon={ClipboardCheck}
      />

      <AdaptiveTable 
        data={pendingCompanies}
        keyExtractor={(c) => c.id}
        emptyMessage="Tidak ada pendaftaran baru yang menunggu persetujuan."
        columns={[
          {
            header: "Perusahaan",
            cell: (c) => (
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-primary/5 text-primary flex items-center justify-center border shrink-0">
                  <Building className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tight">{c.businessField || 'Pendaftaran Baru'}</p>
                </div>
              </div>
            )
          },
          {
            header: "Admin Utama",
            cell: (c) => (
              <div className="flex items-center gap-2">
                <User size={14} className="text-muted-foreground" />
                <span className="text-sm font-medium">{c.admin?.name || 'N/A'}</span>
              </div>
            )
          },
          {
             header: "Email",
             cell: (c) => <span className="text-xs text-slate-600">{c.admin?.email || 'N/A'}</span>
          },
          {
            header: "Tgl Daftar",
            cell: (c) => (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar size={14} />
                {c.admin ? format(new Date(c.admin.joinDate), "d MMM yyyy", { locale: localeId }) : 'N/A'}
              </div>
            )
          },
          {
            header: "",
            className: "text-right",
            cell: (c) => (
              <div className="flex gap-2 justify-end">
                <Button size="sm" className="h-8 font-bold text-[10px] uppercase" onClick={() => handleActivate(c, c.admin)} disabled={isLoading}>
                    <Check className="mr-1.5 h-3.5 w-3.5" /> Aktifkan
                </Button>
                <Button variant="ghost" size="sm" className="h-8 font-bold text-[10px] uppercase text-destructive" onClick={() => { setItemToDelete(c); setDeleteDialogOpen(true); }} disabled={isLoading}>
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Hapus
                </Button>
              </div>
            )
          }
        ]}
        renderMobileCard={(c) => (
          <Card className="border-border/40 shadow-sm overflow-hidden">
            <CardContent className="p-4 space-y-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="size-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center border shrink-0">
                            <Building size={20} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-black text-sm uppercase truncate">{c.name}</h3>
                            <p className="text-[10px] text-muted-foreground font-bold">{c.admin?.name || 'N/A'}</p>
                        </div>
                    </div>
                    <Badge variant="outline" className="text-[8px] font-black uppercase h-5 bg-amber-50 text-amber-700 border-none">PENDING</Badge>
                </div>
                <div className="flex items-center justify-between pt-3 border-t">
                    <div className="text-[9px] font-black text-muted-foreground uppercase">Tgl Daftar: {c.admin ? format(new Date(c.admin.joinDate), "d MMM yyyy") : '-'}</div>
                    <div className="flex gap-2">
                        <Button size="sm" className="h-8 font-bold text-[9px] uppercase" onClick={() => handleActivate(c, c.admin)} disabled={isLoading}>AKTIFKAN</Button>
                        <Button variant="ghost" size="sm" className="h-8 font-bold text-[9px] uppercase text-destructive" onClick={() => { setItemToDelete(c); setDeleteDialogOpen(true); }} disabled={isLoading}>HAPUS</Button>
                    </div>
                </div>
            </CardContent>
          </Card>
        )}
      />

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        itemName={`pendaftaran ${itemToDelete?.company.name || ''}`}
        itemType="pendaftaran"
      />
    </ResponsivePage>
  );
}
