// src/app/(main)/company-admin-management/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import {
  PlusCircle,
  MoreHorizontal,
  ShieldCheck,
  Send,
  Loader2,
  Building,
  Filter,
  Trash2,
  Users,
  Shield,
  Pencil,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { CompanyAdmin, Company, Employee } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";
import { EmployeeFormSheet } from "@/components/master-data/employees/employee-form-sheet";
import { ResponsivePage, ResponsiveToolbar } from "@/components/ui/adaptive-layout";
import { PageHeader } from "@/components/ui/page-header";
import { AdaptiveTable } from "@/components/ui/adaptive-table";
import { AdaptiveCardGrid, AdaptiveMetricCard } from "@/components/ui/adaptive-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";

export default function CompanyAdminManagementPage({ onQuotaFull }: { onQuotaFull?: () => void }) {
  const { currentUser, userRole, addCompanyAdmin, sendPasswordReset } = useAuth();
  const { companyAdmins, deleteCompanyAdmins, companies, subscriptionPlans, fetchData } = useMasterData();
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Partial<Employee> | undefined>(undefined);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<CompanyAdmin | null>(null);
  const [isSendingInvitation, setIsSendingInvitation] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const { toast } = useToast();

  const isSuperadmin = userRole === 'superadmin';
  const userCompany = useMemo(() => companies.find(c => c.name === currentUser?.company), [companies, currentUser]);
  const isHoldingAdmin = useMemo(() => userRole === 'manajemen' && !!userCompany?.isHolding, [userRole, userCompany]);

  const manageableCompanies = useMemo(() => {
    if (isSuperadmin) return companies.filter(c => c.status === 'Aktif');
    if (isHoldingAdmin && userCompany) {
        const getChildCompanies = (parentId: string): Company[] => {
            const children = companies.filter(c => c.parentId === parentId);
            return [...children, ...children.flatMap(c => getChildCompanies(c.id))];
        };
        return [userCompany, ...getChildCompanies(userCompany.id)];
    }
    if (userCompany) return [userCompany];
    return [];
  }, [isSuperadmin, isHoldingAdmin, userCompany, companies]);

  useEffect(() => {
    if (!isSuperadmin && !isHoldingAdmin && userCompany) {
        setSelectedCompanyId(userCompany.id);
    }
  }, [isSuperadmin, isHoldingAdmin, userCompany]);

  const filteredAdmins = useMemo(() => {
    let admins = companyAdmins;
    if (isSuperadmin) {
        if (selectedCompanyId !== 'all') {
            const companyName = companies.find(c => c.id === selectedCompanyId)?.name;
            admins = admins.filter(a => a.company === companyName);
        }
    } else {
        const manageableNames = manageableCompanies.map(c => c.name);
        admins = admins.filter(a => manageableNames.includes(a.company));
        if (selectedCompanyId !== 'all') {
            const companyName = companies.find(c => c.id === selectedCompanyId)?.name;
            admins = admins.filter(a => a.company === companyName);
        }
    }
    return admins.sort((a, b) => a.name.localeCompare(b.name));
  }, [companyAdmins, isSuperadmin, selectedCompanyId, manageableCompanies, companies]);

  const quotaInfo = useMemo(() => {
    const targetId = selectedCompanyId === 'all' ? (userCompany?.id || null) : selectedCompanyId;
    if (!targetId || targetId === 'all') return null;

    const company = companies.find(c => c.id === targetId);
    if (!company) return null;

    const limit = company.customManagementUserLimit || 1;
    const currentUsage = companyAdmins.filter(a => a.company === company.name).length;

    return {
        limit,
        currentUsage,
        managementLimitReached: limit !== -1 && currentUsage >= limit,
        message: limit !== -1 && currentUsage >= limit ? "Kuota Manajemen penuh. Silakan investasi tambah kuota." : "",
        companyName: company.name,
        limits: { user: 0, mgmt: limit }
    };
  }, [selectedCompanyId, companies, companyAdmins, userCompany]);

  const handleAddAdmin = () => {
    if (selectedCompanyId === 'all' && isSuperadmin) {
        toast({ variant: "destructive", title: "Pilih Perusahaan", description: "Harap pilih perusahaan spesifik terlebih dahulu untuk menambah admin." });
        return;
    }
    if (quotaInfo?.managementLimitReached) {
        if (onQuotaFull) onQuotaFull(); 
        else toast({ variant: "destructive", title: "Kuota Penuh", description: quotaInfo.message });
        return;
    }
    setSelectedAdmin({
        role: 'manajemen',
        company: isSuperadmin ? (companies.find(c => c.id === selectedCompanyId)?.name || '') : (userCompany?.name || ''),
        status: 'Aktif'
    });
    setSheetOpen(true);
  };
  
  const handleEditAdmin = (admin: CompanyAdmin) => {
    setSelectedAdmin({ ...admin, role: 'manajemen' } as any);
    setSheetOpen(true);
  };

  const handleAddAction = async (data: any) => {
    const targetCompanyName = data.company || (isSuperadmin ? companies.find(c => c.id === selectedCompanyId)?.name : currentUser.company);
    const result = await addCompanyAdmin({
        name: data.name,
        email: data.email,
        phone: data.phone || "",
        company: targetCompanyName,
        role: "manajemen",
        status: "Aktif",
    }, true);

    if (result.success) {
        toast({ title: "Admin Berhasil Ditambahkan" });
        await fetchData();
    } else {
        toast({ variant: "destructive", title: "Gagal", description: result.error });
    }
  };
  
  const handleDelete = async () => {
    if (adminToDelete) {
      await deleteCompanyAdmins([adminToDelete.id]);
      setAdminToDelete(null);
    }
  };

  const handleSendInvitation = async (email: string, name: string) => {
    setIsSendingInvitation(email);
    const result = await sendPasswordReset(email, name);
    setIsSendingInvitation(null);
    if (result.success) {
      toast({ title: "Email Terkirim" });
    }
  };

  return (
    <ResponsivePage>
      <PageHeader 
        title={isSuperadmin ? "Manajemen Admin Klien" : "Manajemen Tim Admin"}
        description={isSuperadmin ? "Kelola seluruh akun admin dari semua perusahaan klien di satu tempat." : "Kelola rekan tim Manajemen Anda."}
        icon={ShieldCheck}
        actions={
          <Button onClick={handleAddAdmin} className="font-bold shadow-lg h-9 sm:h-10">
            <PlusCircle className="size-4" />
            Tambah Admin
          </Button>
        }
      />

      {(isSuperadmin || isHoldingAdmin) && (
        <ResponsiveToolbar>
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <Filter className="size-4 text-muted-foreground hidden sm:block shrink-0" />
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger className="w-full md:w-[280px] bg-background">
                    <Building className="size-3.5 mr-2 text-primary shrink-0" />
                    <SelectValue placeholder="Pilih Perusahaan" />
                </SelectTrigger>
                <SelectContent className="z-[350]">
                    <SelectItem value="all">Semua Perusahaan</SelectItem>
                    {manageableCompanies.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
        </ResponsiveToolbar>
      )}

      {quotaInfo && (
        <AdaptiveCardGrid complexity="simple" className="mb-6">
            <AdaptiveMetricCard 
                title="Kapasitas Admin"
                value={`${quotaInfo.currentUsage} / ${quotaInfo.limit === -1 ? '∞' : quotaInfo.limit}`}
                icon={Shield}
                color={quotaInfo.managementLimitReached ? "bg-rose-500/10 text-rose-600" : "bg-primary/10 text-primary"}
                badge={quotaInfo.companyName}
            />
        </AdaptiveCardGrid>
      )}

      <AdaptiveTable 
        data={filteredAdmins}
        keyExtractor={(a) => a.id}
        columns={[
          {
            header: "Admin Perusahaan",
            cell: (a) => (
              <div className="flex items-center gap-3">
                <Avatar className="size-9 border shadow-sm shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-black uppercase">
                    {a.name.substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 truncate">{a.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-medium truncate">{a.email}</p>
                </div>
              </div>
            )
          },
          {
             header: "Perusahaan",
             accessorKey: "company",
             className: "text-slate-600 font-medium",
             hideOnTablet: true,
          },
          {
            header: "Status Login",
            cell: (a) => (
              <Badge variant="outline" className={cn(
                "text-[9px] font-black uppercase border-none h-5",
                a.loginStatus === 'Active' ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"
              )}>
                {a.loginStatus}
              </Badge>
            )
          },
          {
            header: "",
            className: "text-right",
            cell: (a) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    {isSendingInvitation === a.email ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[350]">
                  <DropdownMenuItem onClick={() => handleEditAdmin(a)}><Pencil className="size-3.5 mr-2" />Ubah</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSendInvitation(a.email, a.name)}><Send className="size-3.5 mr-2" />Kirim Reset Sandi</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive font-bold" onClick={() => { setAdminToDelete(a); setDeleteDialogOpen(true); }} disabled={a.id === currentUser?.id}><Trash2 className="size-3.5 mr-2" />Hapus</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )
          }
        ]}
        renderMobileCard={(a) => (
          <Card className="border-border/40 shadow-sm overflow-hidden">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="size-11 border-2 border-primary/10 shadow-sm">
                  <AvatarFallback className="bg-primary/5 text-primary text-xs font-black uppercase">{a.name.substring(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                   <h3 className="font-black text-sm uppercase truncate tracking-tight">{a.name}</h3>
                   <p className="text-[10px] text-muted-foreground truncate">{a.email}</p>
                </div>
                <Badge variant="outline" className="text-[8px] font-black uppercase h-5 bg-muted/30 border-none">{a.loginStatus}</Badge>
              </div>
              <div className="pt-3 border-t">
                  <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Perusahaan</p>
                  <p className="text-xs font-bold text-foreground/80">{a.company}</p>
              </div>
              <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className="flex-1 font-bold text-[10px] h-8" onClick={() => handleEditAdmin(a)}>UBAH</Button>
                  <Button variant="ghost" size="sm" className="flex-1 font-bold text-[10px] h-8 text-destructive" onClick={() => { setAdminToDelete(a); setDeleteDialogOpen(true); }} disabled={a.id === currentUser?.id}>HAPUS</Button>
              </div>
            </CardContent>
          </Card>
        )}
      />

      <EmployeeFormSheet 
        isOpen={isSheetOpen}
        onOpenChange={setSheetOpen}
        employee={selectedAdmin}
        onAdd={handleAddAction}
        onSave={(id, data) => handleAddAction({ ...data, id })} 
        quotaInfo={null}
      />

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        itemName={adminToDelete?.name || ''}
        itemType="admin perusahaan"
      />
    </ResponsivePage>
  );
}
