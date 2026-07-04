
// src/app/(main)/admin-management/page.tsx
"use client";

import { useState, useMemo } from "react";
import {
  PlusCircle,
  MoreHorizontal,
  User,
  ShieldCheck,
  Send,
  Loader2,
  Pencil,
  Trash2,
  Mail,
  ChevronDown,
} from "lucide-react";
import type { Employee, LoginStatus } from "@/types";
import { EmployeeFormSheet } from "@/components/master-data/employees/employee-form-sheet";
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";
import { useToast } from "@/hooks/use-toast";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase/client";
import { doc, setDoc, collection } from "firebase/firestore";
import { 
    ResponsivePage, 
    ResponsiveToolbar 
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
  const { currentUser, userRole, updateUserProfile, sendPasswordReset } = useAuth();
  const { employees, deleteEmployees, fetchData } = useMasterData();
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | undefined>(undefined);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [isSendingInvitation, setIsSendingInvitation] = useState<string | null>(null);
  const { toast } = useToast();

  const superAdmins = useMemo(() => {
    return employees.filter(e => e.role === 'superadmin');
  }, [employees]);

  const handleAddEmployee = () => {
    setSelectedEmployee(undefined);
    setSheetOpen(true);
  };
  
  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setSheetOpen(true);
  };

  const handleAddSuperAdmin = async (data: Omit<Employee, 'id' | 'password'>) => {
    toast({
        variant: 'destructive',
        title: 'Aksi Dilarang',
        description: 'Pembuatan akun login baru harus dilakukan melalui backend.',
    });
    
    try {
        const docRef = doc(collection(db, 'employees'));
        const dataToSave: Omit<Employee, 'id' | 'password'> = {
            ...data,
            role: 'superadmin',
            company: 'Internal',
            department: 'System',
            position: 'Superadmin',
            level: 'Direktur',
            reportsTo: '',
            status: 'Aktif',
            joinDate: new Date().toISOString().split('T')[0],
            loginStatus: 'No Login',
        };
        await setDoc(docRef, dataToSave);
        await fetchData();
        toast({ title: "Data Dibuat", description: "Data superadmin baru telah disimpan." });
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Gagal', description: e.message });
    }
  }
  
  const openDeleteDialog = (employee: Employee) => {
    if (employee.id === currentUser?.id) {
        toast({ variant: "destructive", title: "Ditolak", description: "Tidak bisa menghapus diri sendiri." });
        return;
    }
    setEmployeeToDelete(employee);
    setDeleteDialogOpen(true);
  };
  
  const handleDelete = async () => {
    if (employeeToDelete) {
      await deleteEmployees([employeeToDelete.id]);
      setEmployeeToDelete(null);
    }
  };

  const handleSendInvitation = async (email: string) => {
    setIsSendingInvitation(email);
    const result = await sendPasswordReset(email);
    setIsSendingInvitation(null);
    if (result.success) {
      toast({ title: "Email Terkirim" });
    }
  };
  
  const getLoginStatusBadge = (status: LoginStatus) => {
    switch (status) {
        case "Active": return "bg-green-100 text-green-800 border-green-200";
        case "Invited": return "bg-yellow-100 text-yellow-800 border-yellow-200";
        default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }

  if (userRole !== 'superadmin') {
      return <div className="p-20 text-center font-bold">Akses Ditolak.</div>;
  }

  return (
    <ResponsivePage>
      <PageHeader 
        title="Manajemen Superadmin"
        description="Kelola pengguna dengan hak akses tertinggi di sistem."
        icon={ShieldCheck}
        actions={
          <Button onClick={handleAddEmployee} className="font-bold shadow-lg h-9 sm:h-10">
            <PlusCircle className="size-4" />
            Tambah Superadmin
          </Button>
        }
      />

      <AdaptiveTable 
        data={superAdmins}
        keyExtractor={(e) => e.id}
        columns={[
          {
            header: "Superadmin",
            cell: (e) => (
              <div className="flex items-center gap-3">
                <Avatar className="size-9 border shadow-sm">
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-black uppercase">
                    {e.name.substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate">{e.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-medium truncate">{e.email}</p>
                </div>
              </div>
            )
          },
          {
            header: "Status Akun",
            cell: (e) => (
              <Badge variant={e.status === "Aktif" ? "default" : "outline"} className="text-[9px] uppercase font-black">
                {e.status}
              </Badge>
            )
          },
          {
            header: "Login",
            cell: (e) => (
              <Badge variant="outline" className={cn("text-[9px] uppercase font-bold h-5", getLoginStatusBadge(e.loginStatus))}>
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
                  <Button variant="ghost" size="icon" disabled={isSendingInvitation === e.email}>
                    {isSendingInvitation === e.email ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEditEmployee(e)}><Pencil className="size-3.5 mr-2" />Ubah</DropdownMenuItem>
                  {e.loginStatus !== 'No Login' && (
                    <DropdownMenuItem onClick={() => handleSendInvitation(e.email)}>
                      <Send className="mr-2 size-3.5" /> Kirim Reset Sandi
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive font-bold" onClick={() => openDeleteDialog(e)} disabled={e.id === currentUser?.id}>
                    <Trash2 className="size-3.5 mr-2" /> Hapus
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )
          }
        ]}
        renderMobileCard={(e) => (
          <Card className="border-border/40 shadow-sm">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="size-11 border-2 border-primary/10 shadow-sm">
                  <AvatarFallback className="bg-primary/5 text-primary text-xs font-black uppercase">{e.name.substring(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                   <h3 className="font-black text-sm truncate uppercase tracking-tight">{e.name}</h3>
                   <p className="text-[10px] text-muted-foreground truncate">{e.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-3 border-t">
                  <Badge variant={e.status === "Aktif" ? "default" : "outline"} className="text-[8px] font-black uppercase">{e.status}</Badge>
                  <Badge variant="outline" className={cn("text-[8px] font-black uppercase", getLoginStatusBadge(e.loginStatus))}>{e.loginStatus}</Badge>
              </div>
              <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1 font-bold text-[10px] h-8" onClick={() => handleEditEmployee(e)}>UBAH</Button>
                  <Button variant="ghost" size="sm" className="flex-1 font-bold text-[10px] h-8 text-destructive" onClick={() => openDeleteDialog(e)} disabled={e.id === currentUser?.id}>HAPUS</Button>
              </div>
            </CardContent>
          </Card>
        )}
      />

      <EmployeeFormSheet 
        isOpen={isSheetOpen} 
        onOpenChange={setSheetOpen} 
        employee={selectedEmployee} 
        onSave={updateUserProfile}
        onAdd={handleAddSuperAdmin}
        quotaInfo={null}
      />
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        itemName={employeeToDelete?.name || ''}
        itemType="superadmin"
      />
    </ResponsivePage>
  );
}
