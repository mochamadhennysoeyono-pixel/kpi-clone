
// src/app/(main)/admin-management/page.tsx
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
import type { Employee, LoginStatus } from "@/types";
import { EmployeeFormSheet } from "@/components/master-data/employees/employee-form-sheet";
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";
import { useToast } from "@/hooks/use-toast";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import { doc, setDoc, addDoc, collection } from "firebase/firestore";


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
        description: 'Pembuatan akun login baru harus dilakukan melalui backend (Cloud Function) untuk menjaga keamanan sesi admin. Fitur ini dinonaktifkan sementara di UI.',
    });
    
    // Fallback: Create Firestore document only, without creating Auth user
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
            loginStatus: 'No Login', // Set to No Login as Auth user is not created
        };
        await setDoc(docRef, dataToSave);
        await fetchData();
        toast({ title: "Data Superadmin Dibuat", description: "Data superadmin baru telah dibuat di database. Akun login harus dibuat secara manual." });
    } catch (e: any) {
        console.error("Error creating superadmin document:", e);
        toast({
            variant: 'destructive',
            title: 'Gagal Membuat Data',
            description: e.message || 'Terjadi kesalahan saat menyimpan data superadmin baru.'
        });
    }
  }
  
  const openDeleteDialog = (employee: Employee) => {
    if (employee.id === currentUser?.id) {
        toast({
            variant: "destructive",
            title: "Tindakan Ditolak",
            description: "Anda tidak dapat menghapus akun Anda sendiri.",
        });
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
      toast({
        title: "Email Terkirim",
        description: `Email pembaruan kata sandi telah dikirim ke ${email}.`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Gagal Mengirim Email",
        description: result.error || "Terjadi kesalahan yang tidak diketahui.",
      });
    }
  };
  
  const getLoginStatusBadge = (status: LoginStatus) => {
    switch (status) {
        case "Active": return "bg-green-100 text-green-800 border-green-200";
        case "Invited": return "bg-yellow-100 text-yellow-800 border-yellow-200";
        case "No Login": return "bg-gray-100 text-gray-800 border-gray-200";
        default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }

  if (userRole !== 'superadmin') {
      return (
        <Card>
            <CardHeader>
                <CardTitle>Akses Ditolak</CardTitle>
                <CardDescription>Halaman ini hanya dapat diakses oleh Superadmin.</CardDescription>
            </CardHeader>
        </Card>
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
                Manajemen Superadmin
              </CardTitle>
              <CardDescription className="text-primary-foreground/80 dark:text-muted-foreground">
                Kelola pengguna dengan hak akses tertinggi di sistem.
              </CardDescription>
            </div>
             <div className="ml-auto flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                <Button size="sm" className="h-9 gap-1" onClick={handleAddEmployee}>
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Tambah Superadmin
                  </span>
                </Button>
             </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Pengguna</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status Akun</TableHead>
                  <TableHead>Status Login</TableHead>
                  <TableHead>
                    <span className="sr-only">Aksi</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {superAdmins.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="hidden h-9 w-9 sm:flex items-center justify-center rounded-full bg-muted">
                          <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <span>{employee.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{employee.email}</TableCell>
                    <TableCell>
                      <Badge variant={employee.status === "Aktif" ? "default" : "outline"}>
                        {employee.status}
                      </Badge>
                    </TableCell>
                     <TableCell>
                      <Badge variant="outline" className={cn("font-medium", getLoginStatusBadge(employee.loginStatus))}>
                        {employee.loginStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost" disabled={isSendingInvitation === employee.email}>
                            {isSendingInvitation === employee.email ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                            <span className="sr-only">Buka menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleEditEmployee(employee)}>Ubah</DropdownMenuItem>
                          {employee.loginStatus !== 'No Login' && (
                            <DropdownMenuItem onClick={() => handleSendInvitation(employee.email)}>
                              <Send className="mr-2 h-4 w-4" />
                              Kirim Pembaruan Sandi
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => openDeleteDialog(employee)} disabled={employee.id === currentUser?.id}>Hapus</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
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
    </div>
  );
}
