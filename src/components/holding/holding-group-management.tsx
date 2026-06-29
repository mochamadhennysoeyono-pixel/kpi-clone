
// src/components/holding/holding-group-management.tsx
"use client";

import { useState, useMemo } from 'react';
import type { Company, SubscriptionPlan } from '@/types';
import { useMasterData } from '@/contexts/master-data-context';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, ChevronDown, Trash2, Building, AlertCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from '@/components/ui/checkbox';
import { CompanyFormSheet } from '@/components/master-data/company/company-form-sheet';
import { DeleteConfirmationDialog } from '@/components/master-data/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '../ui/alert';

interface HoldingGroupManagementProps {
    holdingCompany: Company;
    childCompanies: Company[];
}

export default function HoldingGroupManagement({ holdingCompany, childCompanies }: HoldingGroupManagementProps) {
  const { addCompany, updateCompany, deleteCompany, subscriptionPlans } = useMasterData();
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [selectedCompanyForEdit, setSelectedCompanyForEdit] = useState<Company | undefined>(undefined);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [companiesToDelete, setCompaniesToDelete] = useState<Company[] | null>(null);
  const { toast } = useToast();

  const currentPlan = useMemo(() => {
    return subscriptionPlans.find(p => p.id === holdingCompany.subscriptionPlanId);
  }, [subscriptionPlans, holdingCompany]);
  
  const isLimitReached = useMemo(() => {
    if (!currentPlan || currentPlan.companyLimit === -1) return false;
    return childCompanies.length >= currentPlan.companyLimit;
  }, [currentPlan, childCompanies]);

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    setSelectedRowIds(checked ? childCompanies.map(c => c.id) : []);
  };

  const handleRowSelect = (rowId: string) => {
    setSelectedRowIds(prev =>
      prev.includes(rowId) ? prev.filter(id => id !== rowId) : [...prev, rowId]
    );
  };

  const handleOpenSheet = (company?: Company) => {
    if (!company && isLimitReached) {
        toast({
            variant: "destructive",
            title: "Kuota Penuh",
            description: `Anda telah mencapai batas ${currentPlan?.companyLimit} anak perusahaan untuk paket ${currentPlan?.name}.`,
        });
        return;
    }
    setSelectedCompanyForEdit(company);
    setSheetOpen(true);
  };

  const handleSaveCompany = async (companyData: Company) => {
    if (companyData.id) { // This is an edit
      await updateCompany(companyData.id, companyData);
    } else { // This is an add
        const dataToSave: Omit<Company, 'id'> = {
            ...companyData,
            parentId: holdingCompany.id,
        };
        await addCompany(dataToSave);
    }
  };

  const openDeleteDialog = (companies: Company[]) => {
    setCompaniesToDelete(companies);
    setDeleteDialogOpen(true);
  };
  
  const handleDelete = async () => {
    if (companiesToDelete && companiesToDelete.length > 0) {
      await Promise.all(companiesToDelete.map(c => deleteCompany(c.id)));
      setCompaniesToDelete(null);
      setSelectedRowIds([]);
    }
  };

  return (
    <>
        {isLimitReached && (
            <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    Kuota anak perusahaan untuk paket <strong>{currentPlan?.name}</strong> telah tercapai ({childCompanies.length}/{currentPlan?.companyLimit}). Anda tidak dapat menambah grup baru.
                </AlertDescription>
            </Alert>
        )}
        <div className="flex items-center justify-end gap-2 mb-4">
            {selectedRowIds.length > 0 && (
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="bg-background/20 text-primary-foreground hover:bg-background/30 dark:bg-muted dark:text-foreground dark:hover:bg-muted/80">
                        Aksi Massal ({selectedRowIds.length})
                        <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Pilih Aksi</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => openDeleteDialog(childCompanies.filter(c => selectedRowIds.includes(c.id)))}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Hapus Pilihan
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            )}
            <Button size="sm" className="h-9 gap-1" onClick={() => handleOpenSheet()} disabled={isLimitReached}>
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Tambah Grup Baru
            </span>
            </Button>
        </div>
        <Table>
            <TableHeader>
            <TableRow>
                <TableHead className="w-[40px]">
                <Checkbox
                    checked={selectedRowIds.length > 0 && selectedRowIds.length === childCompanies.length}
                    onCheckedChange={(checked) => handleSelectAll(checked)}
                    aria-label="Pilih semua"
                />
                </TableHead>
                <TableHead>Nama Anak Perusahaan</TableHead>
                <TableHead>Bidang Usaha</TableHead>
                <TableHead>Alamat</TableHead>
                <TableHead>
                <span className="sr-only">Aksi</span>
                </TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {childCompanies.length > 0 ? childCompanies.map((company) => (
                <TableRow key={company.id} data-state={selectedRowIds.includes(company.id) && "selected"}>
                <TableCell>
                    <Checkbox
                        checked={selectedRowIds.includes(company.id)}
                        onCheckedChange={() => handleRowSelect(company.id)}
                        aria-label={`Pilih ${company.name}`}
                    />
                </TableCell>
                <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                    <div className="hidden h-9 w-9 sm:flex items-center justify-center rounded-full bg-muted">
                        <Building className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <span>{company.name}</span>
                    </div>
                </TableCell>
                <TableCell>{company.businessField}</TableCell>
                <TableCell>{company.address}</TableCell>
                <TableCell className="text-right">
                    <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Buka menu</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleOpenSheet(company)}>Ubah</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => openDeleteDialog([company])}>Hapus</DropdownMenuItem>
                    </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
                </TableRow>
            )) : (
                <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                        Belum ada anak perusahaan.
                    </TableCell>
                </TableRow>
            )}
            </TableBody>
        </Table>
        
        <CompanyFormSheet 
            isOpen={isSheetOpen}
            onOpenChange={setSheetOpen}
            company={selectedCompanyForEdit}
            onSave={handleSaveCompany}
        />
        <DeleteConfirmationDialog
            isOpen={isDeleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            onConfirm={handleDelete}
            itemName={companiesToDelete?.length === 1 ? companiesToDelete[0].name : `${companiesToDelete?.length} perusahaan`}
            itemType="perusahaan"
        />
    </>
  );
}
