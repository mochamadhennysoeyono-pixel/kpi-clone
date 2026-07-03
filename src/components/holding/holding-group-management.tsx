
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
  
  // LOGIC: Priority order for limit -> Custom Limit (Superadmin) > Plan Limit > Default 0
  const groupLimit = useMemo(() => {
      if (holdingCompany.customCompanyLimit != null) return holdingCompany.customCompanyLimit;
      return currentPlan?.companyLimit ?? 0;
  }, [holdingCompany, currentPlan]);

  const isLimitReached = useMemo(() => {
    if (groupLimit === -1) return false; // Unlimited
    return childCompanies.length >= groupLimit;
  }, [groupLimit, childCompanies.length]);

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
            title: "Kuota Cabang Penuh",
            description: `Batas maksimal anak perusahaan Anda adalah ${groupLimit}. Silakan hubungi admin untuk upgrade kuota.`,
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
        <div className="space-y-4 mb-6">
            {isLimitReached && (
                <Alert variant="destructive" className="bg-red-50 border-red-200">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800 font-medium">
                        Kuota anak perusahaan untuk paket <strong>{currentPlan?.name || 'CUSTOM'}</strong> telah tercapai ({childCompanies.length}/{groupLimit === -1 ? '∞' : groupLimit}). Anda tidak dapat menambah grup baru.
                    </AlertDescription>
                </Alert>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-background shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="text-center border-r pr-6">
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Kapasitas Grup</p>
                        <p className={cn("text-2xl font-black", isLimitReached ? "text-destructive" : "text-primary")}>
                            {childCompanies.length} <span className="text-sm font-bold text-muted-foreground">/ {groupLimit === -1 ? '∞' : groupLimit}</span>
                        </p>
                    </div>
                    <div className="hidden sm:block">
                        <p className="text-xs font-bold text-slate-700">Status Lisensi Cabang</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-medium">Paket: {currentPlan?.name || 'Kustom'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {selectedRowIds.length > 0 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 gap-1 font-bold">
                                    Aksi Massal ({selectedRowIds.length})
                                    <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel className="text-[10px] uppercase opacity-60">Pilih Aksi</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive font-bold" onClick={() => openDeleteDialog(childCompanies.filter(c => selectedRowIds.includes(c.id)))}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Hapus Pilihan
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    <Button 
                        size="sm" 
                        className="h-9 gap-1 font-bold shadow-md" 
                        onClick={() => handleOpenSheet()} 
                        disabled={isLimitReached}
                    >
                        <PlusCircle className="h-4 w-4" />
                        Tambah Grup Baru
                    </Button>
                </div>
            </div>
        </div>

        <div className="rounded-xl border shadow-sm overflow-hidden bg-background">
            <Table>
                <TableHeader className="bg-muted/50">
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
                        <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {childCompanies.length > 0 ? childCompanies.map((company) => (
                    <TableRow key={company.id} data-state={selectedRowIds.includes(company.id) && "selected"} className="hover:bg-muted/5 group">
                    <TableCell>
                        <Checkbox
                            checked={selectedRowIds.includes(company.id)}
                            onCheckedChange={() => handleRowSelect(company.id)}
                            aria-label={`Pilih ${company.name}`}
                        />
                    </TableCell>
                    <TableCell className="font-bold">
                        <div className="flex items-center gap-3">
                            <div className="hidden h-9 w-9 sm:flex items-center justify-center rounded-xl bg-primary/5 text-primary border border-primary/10">
                                <Building className="h-5 w-5" />
                            </div>
                            <span>{company.name}</span>
                        </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{company.businessField}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{company.address}</TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Buka menu</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel className="text-[10px] uppercase opacity-60 font-black">Kelola Cabang</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleOpenSheet(company)}>
                                    <Pencil className="mr-2 size-3.5" /> Ubah Rincian
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive font-bold" onClick={() => openDeleteDialog([company])}>
                                    <Trash2 className="mr-2 size-3.5" /> Hapus Cabang
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-40 text-center text-muted-foreground italic">
                            <div className="flex flex-col items-center gap-2 opacity-30">
                                <Building size={48} />
                                <p className="font-bold uppercase text-xs">Belum ada anak perusahaan yang terdaftar.</p>
                            </div>
                        </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
        </div>
        
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
            itemName={companiesToDelete?.length === 1 ? companiesToDelete[0].name : `${companiesToDelete?.length || 0} perusahaan`}
            itemType="perusahaan"
        />
    </>
  );
}
