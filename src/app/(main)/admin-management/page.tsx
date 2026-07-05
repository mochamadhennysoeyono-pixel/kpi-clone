// src/app/(main)/admin-management/page.tsx
"use client";

import { useState } from "react";
import {
  PlusCircle,
  DotsThreeOutlineVertical,
  ShieldCheckered,
  PaperPlaneTilt,
  CircleNotch,
  PencilSimple,
  Trash,
} from "@phosphor-icons/react";
import type { SuperAdmin, LoginStatus, Employee } from "@/types";
import { EmployeeFormSheet } from "@/components/master-data/employees/employee-form-sheet";
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";
import { useToast } from "@/hooks/use-toast";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { 
    ResponsivePage, 
} from "@/components/ui/adaptive-layout";
import { PageHeader } from "@/components/ui/page-header";
import { AdaptiveTable } from "@/components/ui/adaptive-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminManagementPage() {
  const { currentUser, userRole, addSuperAdmin, sendPasswordReset } = useAuth();
  const { superadmins, deleteSuperadmins, fetchData } = useMasterData();
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Partial<Employee> | undefined>(undefined);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<SuperAdmin | null>(null);
  const [isSendingInvitation, setIsSendingInvitation] = useState<string | null>(null);
  const { toast } = useToast();

  const handleAddClick = () => {
    setSelectedAdmin({
        role: 'superadmin',
        status: 'Aktif',
        level: 'Direktur'
    });
    setSheetOpen(true);
  };
  
  const handleEditAdmin = (admin: SuperAdmin) => {
    setSelectedAdmin({ ...admin, role: 'superadmin' } as any);
    setSheetOpen(true);
  };

  const handleAddSuperAdminAction = async (data: any) => {
    const result = await addSuperAdmin({
        name: data.name,
        email: data.email,
        phone: data.phone || "",
        role: "superadmin",
        status: data.status || "Aktif",
    }, true);

    if (result.success) {
        toast({ title: "Superadmin Berhasil Ditambahkan" });
        await fetchData(true);
    } else {
        toast({ variant: "destructive", title: "Gagal", description: result.error });
    }
  }
  
  const openDeleteDialog = (admin: SuperAdmin) => {
    if (admin.id === currentUser?.id) {
        toast({ variant: "destructive", title: "Ditolak", description: "Tidak bisa menghapus diri sendiri." });
        return;
    }
    setAdminToDelete(admin);
    setDeleteDialogOpen(true);
  };
  
  const handleDelete = async () => {
    if (adminToDelete) {
      await deleteSuperadmins([adminToDelete.id]);
      setAdminToDelete(null);
    }
  };

  const handleSendInvitation = async (email: string, name: string) => {
    setIsSendingInvitation(email);
    const result = await sendPasswordReset(email, name);
    setIsSendingInvitation(null);
    if (result.success) {
      toast({ title: "Email Terkirim", description: `Tautan reset telah dikirim ke ${email}` });
    }
  };
  
  const getLoginStatusBadge = (status: LoginStatus) => {
    switch (status) {
        case "Active": return "bg-green-50 text-green-700 border-green-100";
        case "Invited": return "bg-amber-50 text-amber-700 border-amber-100";
        default: return "bg-slate-50 text-slate-600 border-slate-100";
    }
  }

  if (userRole !== 'superadmin') {
      return <div className="p-20 text-center font-bold">Akses Ditolak.</div>;
  }

  return (
    <ResponsivePage>
      <PageHeader 
        title="Manajemen Superadmin"
        description="Kelola otoritas tertinggi sistem dan pengaturan akses admin global."
        icon={ShieldCheckered}
        actions={
          <Button onClick={handleAddClick} className="font-bold shadow-stripe h-10 px-5 active:scale-95 transition-all">
            <PlusCircle className="size-4 mr-2" weight="fill" />
            Tambah Superadmin
          </Button>
        }
      />

      <AdaptiveTable 
        data={superadmins}
        keyExtractor={(e) => e.id}
        columns={[
          {
            header: "Profil Superadmin",
            cell: (e) => (
              <div className="flex items-center gap-3">
                <Avatar className="size-10 border-2 border-slate-50 shadow-sm shrink-0">
                  <AvatarFallback className="bg-primary/5 text-primary text-[11px] font-black uppercase">
                    {e.name.substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 truncate">{e.name}</p>
                  <p className="text-[11px] text-muted-foreground font-medium truncate">{e.email}</p>
                </div>
              </div>
            )
          },
          {
            header: "Status Akun",
            cell: (e) => (
              <Badge variant={e.status === "Aktif" ? "default" : "outline"} className="font-bold h-6 px-2.5 border-none shadow-sm">
                {e.status}
              </Badge>
            )
          },
          {
            header: "Akses Login",
            cell: (e) => (
              <Badge variant="outline" className={cn("text-[10px] font-black uppercase h-6 px-2 border", getLoginStatusBadge(e.loginStatus))}>
                {e.loginStatus}
              </Badge>
            )
          },
          {
            header: "",
            className: "text-right",
            cell: (e) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9 hover:bg-slate-50" disabled={isSendingInvitation === e.email}>
                    {isSendingInvitation === e.email ? <CircleNotch className="size-4 animate-spin" /> : <DotsThreeOutlineVertical className="size-4" weight="bold" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-2xl border-none p-2">
                  <DropdownMenuLabel className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Opsi Akun</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleEditAdmin(e)} className="p-2.5 rounded-lg cursor-pointer">
                    <PencilSimple className="size-4 mr-3 opacity-60" weight="bold" /> Ubah Data
                  </DropdownMenuItem>
                  {e.loginStatus !== 'No Login' && (
                    <DropdownMenuItem onClick={() => handleSendInvitation(e.email, e.name)} className="p-2.5 rounded-lg cursor-pointer">
                      <PaperPlaneTilt className="mr-3 size-4 opacity-60" weight="bold" /> Kirim Reset Sandi
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-slate-100" />
                  <DropdownMenuItem className="p-2.5 rounded-lg cursor-pointer text-destructive focus:bg-destructive/5 focus:text-destructive font-bold" onClick={() => openDeleteDialog(e)} disabled={e.id === currentUser?.id}>
                    <Trash className="size-4 mr-3" weight="bold" /> Hapus Permanen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )
          }
        ]}
        renderMobileCard={(e) => (
          <Card className="border-slate-100 shadow-sm overflow-hidden">
            <CardContent className="p-5 space-y-5">
              <div className="flex items-center gap-4">
                <Avatar className="size-14 border-4 border-slate-50 shadow-sm">
                  <AvatarFallback className="bg-primary/5 text-primary text-xs font-black uppercase">{e.name.substring(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                   <h3 className="font-black text-base truncate text-slate-900 leading-tight">{e.name}</h3>
                   <p className="text-[11px] text-muted-foreground truncate mt-1">{e.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-4 border-t border-slate-50">
                  <Badge variant={e.status === "Aktif" ? "default" : "outline"} className="text-[9px] font-black h-5 border-none shadow-sm">{e.status}</Badge>
                  <Badge variant="outline" className={cn("text-[9px] font-black h-5 border", getLoginStatusBadge(e.loginStatus))}>{e.loginStatus}</Badge>
              </div>
              <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1 font-bold h-9 rounded-xl border-slate-200" onClick={() => handleEditAdmin(e)}>Ubah</Button>
                  <Button variant="ghost" size="sm" className="flex-1 font-bold h-9 rounded-xl text-destructive hover:bg-destructive/5" onClick={() => openDeleteDialog(e)} disabled={e.id === currentUser?.id}>Hapus</Button>
              </div>
            </CardContent>
          </Card>
        )}
      />

      <EmployeeFormSheet 
        isOpen={isSheetOpen} 
        onOpenChange={setSheetOpen} 
        employee={selectedAdmin} 
        onSave={(id, data) => handleAddSuperAdminAction({ ...data, id })}
        onAdd={handleAddSuperAdminAction}
        quotaInfo={null}
      />
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        itemName={adminToDelete?.name || ''}
        itemType="superadmin"
      />
    </ResponsivePage>
  );
}
