
// src/app/(main)/activation-management/page.tsx
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
import { Check, Clock, Trash2 } from "lucide-react";
import type { Company, Employee } from "@/types";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";
import { db } from "@/lib/firebase/client";
import { runTransaction, doc, collection, deleteDoc } from "firebase/firestore";


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
        
        // --- Default Trial Package Logic ---
        const activationDate = new Date();
        const expiryDate = addDays(activationDate, 14); // 14-day trial
        
        const dataToUpdate: Partial<Company> = { 
            status: 'Aktif',
            subscriptionPlanId: 'default-trial', // Special identifier for default trial
            subscriptionActivationDate: activationDate.toISOString(),
            subscriptionExpiryDate: expiryDate.toISOString(),
            customUserLimit: 5,
            customManagementUserLimit: 2,
            canBecomeHolding: false, // Default for trial
        };

        transaction.update(companyRef, dataToUpdate);

        if (admin) {
            const adminRef = doc(db, "employees", admin.id);
            transaction.update(adminRef, { status: 'Aktif' });
        }
      });
      
      await fetchData(); // Refresh all data
      toast({
          title: "Aktivasi Berhasil",
          description: `Perusahaan ${company.name} dan adminnya telah diaktifkan dengan paket Trial 14 hari.`,
      });

    } catch (e: any) {
        toast({
            variant: "destructive",
            title: "Gagal Aktivasi",
            description: e.message || "Terjadi kesalahan saat mengaktifkan perusahaan.",
        });
    } finally {
        setIsLoading(false);
    }
  };


  const openDeleteDialog = (item: { company: Company, admin?: Employee }) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setIsLoading(true);
    try {
        if (itemToDelete.admin) {
            // Note: Firebase Auth user is not deleted here, only Firestore record.
            // This is intentional to allow for re-registration if needed.
            await deleteDoc(doc(db, "employees", itemToDelete.admin.id));
        }
        await deleteDoc(doc(db, "companies", itemToDelete.company.id));
        
        await fetchData();
        toast({
            title: "Pendaftaran Dihapus",
            description: `Pendaftaran untuk perusahaan ${itemToDelete.company.name} telah berhasil dihapus.`,
        });
    } catch (e: any) {
         toast({
            variant: "destructive",
            title: "Gagal Menghapus",
            description: e.message || "Terjadi kesalahan saat menghapus pendaftaran.",
        });
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
    <>
      <div className="space-y-6">
        <Card className="shadow-lg mb-6">
          <CardHeader className="bg-primary text-primary-foreground dark:bg-card rounded-t-lg">
              <div>
                <CardTitle className="font-headline">Manajemen Aktivasi Perusahaan</CardTitle>
                <CardDescription className="text-primary-foreground/80 dark:text-muted-foreground">
                  Tinjau dan aktifkan pendaftaran perusahaan baru yang masuk melalui formulir registrasi.
                </CardDescription>
              </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Nama Perusahaan</TableHead>
                        <TableHead>Nama Admin</TableHead>
                        <TableHead>Email Admin</TableHead>
                        <TableHead>Tanggal Daftar</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {pendingCompanies.length > 0 ? (
                        pendingCompanies.map(({ admin, ...company }) => (
                            <TableRow key={company.id}>
                                <TableCell className="font-medium">{company.name}</TableCell>
                                <TableCell>{admin?.name || 'N/A'}</TableCell>
                                <TableCell>{admin?.email || 'N/A'}</TableCell>
                                <TableCell>{admin ? format(new Date(admin.joinDate), "d MMM yyyy", { locale: localeId }) : 'N/A'}</TableCell>
                                <TableCell className="text-right">
                                <div className="flex gap-2 justify-end">
                                    <Button 
                                        size="sm" 
                                        onClick={() => handleActivate(company, admin)}
                                        disabled={isLoading}
                                    >
                                        <Check className="mr-2 h-4 w-4" />
                                        Aktifkan
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => openDeleteDialog({ company, admin })}
                                        disabled={isLoading}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Hapus
                                    </Button>
                                </div>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                            <Clock className="mx-auto h-8 w-8 mb-2" />
                            Tidak ada pendaftaran baru yang menunggu persetujuan.
                            </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        itemName={`pendaftaran untuk ${itemToDelete?.company.name || ''}`}
        itemType="pendaftaran"
      />
    </>
  );
}
