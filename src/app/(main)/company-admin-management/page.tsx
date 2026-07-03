// src/app/(main)/company-admin-management/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PlusCircle,
  MoreHorizontal,
  User,
  ShieldCheck,
  Send,
  Loader2,
  Building,
  Filter,
  Trash2,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { CompanyAdmin, Company } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";
import { EmployeeFormSheet } from "@/components/master-data/employees/employee-form-sheet";

interface CompanyAdminManagementPageProps {
    onQuotaFull?: () => void;
}

export default function CompanyAdminManagementPage({ onQuotaFull }: CompanyAdminManagementPageProps) {
  const { currentUser, userRole, addCompanyAdmin, sendPasswordReset } = useAuth();
  const { companyAdmins, deleteCompanyAdmins, companies, subscriptionPlans, employees, fetchData } = useMasterData();
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<any | undefined>(undefined);
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

    const plan = subscriptionPlans.find(p => p.id === company.subscriptionPlanId);
    const limit = company.customManagementUserLimit ?? plan?.managementUserLimit ?? 2;
    const currentUsage = companyAdmins.filter(a => a.company === company.name).length;

    return {
        limit,
        currentUsage,
        userLimitReached: false, 
        managementLimitReached: limit !== -1 && currentUsage >= limit,
        message: limit !== -1 && currentUsage >= limit ? "Kuota Manajemen penuh. Silakan tambah kuota investasi." : "",
        companyName: company.name,
        limits: { user: 0, mgmt: limit }
    };
  }, [selectedCompanyId, companies, subscriptionPlans, companyAdmins, userCompany]);

  const handleAddAdmin = () => {
    if (selectedCompanyId === 'all' && isSuperadmin) {
        toast({ variant: "destructive", title: "Pilih Perusahaan", description: "Harap pilih perusahaan spesifik terlebih dahulu untuk menambah admin." });
        return;
    }
    if (quotaInfo?.managementLimitReached) {
        if (onQuotaFull) {
            onQuotaFull(); // Trigger purchase dialog in parent (Portal)
        } else {
            toast({ variant: "destructive", title: "Kuota Penuh", description: quotaInfo.message });
        }
        return;
    }
    setSelectedAdmin(undefined);
    setSheetOpen(true);
  };
  
  const handleEditAdmin = (admin: CompanyAdmin) => {
    setSelectedAdmin(admin);
    setSheetOpen(true);
  };

  const handleAddAction = async (data: any) => {
    const targetCompanyName = isSuperadmin 
        ? companies.find(c => c.id === selectedCompanyId)?.name 
        : (data.company || currentUser.company);

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
  
  const openDeleteDialog = (admin: CompanyAdmin) => {
    if (admin.id === currentUser?.id) {
        toast({ variant: "destructive", title: "Tindakan Ditolak", description: "Anda tidak dapat menghapus akun Anda sendiri." });
        return;
    }
    setAdminToDelete(admin);
    setDeleteDialogOpen(true);
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
      toast({
        title: "Email Terkirim",
        description: `Link pembaruan sandi / aktivasi untuk ${name} telah berhasil dikirim.`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Gagal Mengirim",
        description: result.error || "Terjadi kesalahan yang tidak diketahui.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-t-4 border-primary overflow-hidden">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ShieldCheck className="size-6 text-primary" />
              </div>
              <div>
                <CardTitle className="font-headline text-2xl">
                    {isSuperadmin ? "Manajemen Admin Klien" : "Manajemen Tim Admin"}
                </CardTitle>
                <CardDescription>
                   {isSuperadmin 
                    ? "Kelola seluruh akun admin dari semua perusahaan klien di satu tempat."
                    : "Kelola rekan tim Manajemen Anda. Akun di sini tidak akan muncul di daftar KPI karyawan."}
                </CardDescription>
              </div>
            </div>
             <div className="flex items-center gap-2 self-end sm:self-center">
                <Button size="sm" className="h-10 gap-1 font-bold shadow-md" onClick={handleAddAdmin}>
                  <PlusCircle className="h-4 w-4" />
                  Tambah Admin
                </Button>
             </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
            <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 border rounded-xl bg-muted/30">
                {(isSuperadmin || isHoldingAdmin) && (
                    <div className="flex flex-1 items-center gap-2">
                        <Filter className="size-4 text-muted-foreground hidden sm:block" />
                        <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                            <SelectTrigger className="w-full md:w-[280px] bg-background">
                                <Building className="size-3.5 mr-2 text-primary" />
                                <SelectValue placeholder="Pilih Perusahaan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Perusahaan</SelectItem>
                                {manageableCompanies.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                {quotaInfo && (
                    <div className="flex items-center gap-4 px-4 py-2 bg-background rounded-lg border border-border/40 shadow-sm">
                        <div className="text-center border-r pr-4">
                            <p className="text-[9px] font-black uppercase text-muted-foreground">Kuota Terpakai</p>
                            <p className={cn("text-lg font-black", quotaInfo.managementLimitReached ? "text-destructive" : "text-primary")}>
                                {quotaInfo.currentUsage} / {quotaInfo.limit === -1 ? '∞' : quotaInfo.limit}
                            </p>
                        </div>
                        <div className="hidden sm:block">
                            <p className="text-[10px] font-bold text-muted-foreground">Status kapasitas admin untuk <span className="text-foreground">{quotaInfo.companyName}</span></p>
                        </div>
                    </div>
                )}
            </div>

            <div className="rounded-xl border overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead>Nama Pengguna</TableHead>
                        {(isSuperadmin || isHoldingAdmin) && <TableHead>Perusahaan</TableHead>}
                        <TableHead>Email</TableHead>
                        <TableHead>Status Login</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {filteredAdmins.length > 0 ? (
                        filteredAdmins.map((admin) => (
                        <TableRow key={admin.id} className="hover:bg-muted/5 group">
                        <TableCell className="font-medium py-4">
                            <div className="flex items-center gap-3">
                            <Avatar className="size-9 border shadow-sm">
                                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-black">
                                    {admin.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <span className="font-bold text-slate-900">{admin.name}</span>
                            </div>
                        </TableCell>
                        {(isSuperadmin || isHoldingAdmin) && (
                            <TableCell>
                                <div className="flex items-center gap-1.5 text-xs font-semibold">
                                    <Building className="size-3 text-muted-foreground" />
                                    {admin.company}
                                </div>
                            </TableCell>
                        )}
                        <TableCell className="text-sm text-slate-600">{admin.email}</TableCell>
                        <TableCell>
                            <Badge variant="outline" className={cn(
                                "font-bold text-[10px] uppercase",
                                admin.loginStatus === 'Active' ? "bg-green-50 text-green-700 border-green-200" :
                                admin.loginStatus === 'Invited' ? "bg-amber-50 text-amber-700 border-amber-200" :
                                "bg-slate-100 text-slate-600 border-slate-200"
                            )}>
                                {admin.loginStatus}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button aria-haspopup="true" size="icon" variant="ghost" className="rounded-full">
                                    {isSendingInvitation === admin.email ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuLabel className="text-[10px] uppercase font-black opacity-60">Opsi Admin</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleEditAdmin(admin)}>
                                    Ubah Profil
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSendInvitation(admin.email, admin.name)}>
                                    <Send className="mr-2 size-3.5" /> Kirim Pembaruan Sandi / Aktivasi
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive font-bold" onClick={() => openDeleteDialog(admin)}>
                                    <Trash2 className="mr-2 size-3.5" /> Hapus Akses
                                </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={(isSuperadmin || isHoldingAdmin) ? 5 : 4} className="h-32 text-center text-muted-foreground italic">
                                Tidak ada data admin ditemukan.
                            </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
      
      <EmployeeFormSheet 
        isOpen={isSheetOpen}
        onOpenChange={setSheetOpen}
        employee={selectedAdmin}
        onAdd={handleAddAction}
        onSave={() => {}} 
        quotaInfo={quotaInfo as any}
      />

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        itemName={adminToDelete?.name || ''}
        itemType="admin perusahaan"
      />
    </div>
  );
}
