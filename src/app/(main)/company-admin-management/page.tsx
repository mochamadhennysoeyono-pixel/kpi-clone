
// src/app/(main)/company-admin-management/page.tsx
"use client";

import { useState, useMemo } from "react";
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
  PlusCircle,
  MoreHorizontal,
  User,
  ShieldCheck,
  Send,
  Loader2,
} from "lucide-react";
import type { CompanyAdmin, LoginStatus } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";
import { EmployeeFormSheet } from "@/components/master-data/employees/employee-form-sheet";


export default function CompanyAdminManagementPage() {
  const { currentUser, userRole, addCompanyAdmin, sendPasswordReset } = useAuth();
  const { companyAdmins, deleteCompanyAdmins, fetchData } = useMasterData();
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<any | undefined>(undefined);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<CompanyAdmin | null>(null);
  const [isSendingInvitation, setIsSendingInvitation] = useState<string | null>(null);
  const { toast } = useToast();

  const filteredAdmins = useMemo(() => {
    return companyAdmins.filter(a => a.company === currentUser?.company);
  }, [companyAdmins, currentUser]);

  const handleAddAdmin = () => {
    setSelectedAdmin(undefined);
    setSheetOpen(true);
  };
  
  const handleEditAdmin = (admin: CompanyAdmin) => {
    setSelectedAdmin(admin);
    setSheetOpen(true);
  };

  const handleAddAction = async (data: any) => {
    const result = await addCompanyAdmin({
        name: data.name,
        email: data.email,
        phone: data.phone || "",
        company: currentUser.company,
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

  const handleSendInvitation = async (email: string) => {
    setIsSendingInvitation(email);
    const result = await sendPasswordReset(email);
    setIsSendingInvitation(null);
    if (result.success) {
      toast({ title: "Email Terkirim" });
    } else {
      toast({ variant: "destructive", title: "Gagal", description: result.error });
    }
  };

  if (userRole !== 'manajemen') {
      return (
        <Card><CardHeader><CardTitle>Akses Ditolak</CardTitle></CardHeader></Card>
      )
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg mb-6">
        <CardHeader className="bg-primary text-primary-foreground dark:bg-card rounded-t-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="font-headline flex items-center gap-2">
                <ShieldCheck />
                Manajemen Admin Perusahaan
              </CardTitle>
              <CardDescription className="text-primary-foreground/80 dark:text-muted-foreground">
                Kelola rekan tim Manajemen Anda. Akun di sini tidak akan muncul di daftar KPI karyawan.
              </CardDescription>
            </div>
             <div className="ml-auto flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                <Button size="sm" className="h-9 gap-1" onClick={handleAddAdmin}>
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Tambah Admin</span>
                </Button>
             </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Pengguna</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status Akun</TableHead>
                <TableHead>Status Login</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAdmins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="hidden h-9 w-9 sm:flex items-center justify-center rounded-full bg-muted">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <span>{admin.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>
                    <Badge variant={admin.status === "Aktif" ? "default" : "outline"}>{admin.status}</Badge>
                  </TableCell>
                   <TableCell>
                    <Badge variant="outline">{admin.loginStatus}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            {isSendingInvitation === admin.email ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditAdmin(admin)}>Ubah</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSendInvitation(admin.email)}>Kirim Reset Sandi</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => openDeleteDialog(admin)}>Hapus</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <EmployeeFormSheet 
        isOpen={isSheetOpen}
        onOpenChange={setSheetOpen}
        employee={selectedAdmin}
        onAdd={handleAddAction}
        onSave={() => {}} // Handle edit separately
        quotaInfo={null}
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
