// src/components/holding/holding-group-management.tsx
"use client";

import { useState, useMemo } from 'react';
import type { Company } from '@/types';
import { useMasterData } from '@/contexts/master-data-context';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, ChevronDown, Trash2, Building, Pencil, Shield } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { CompanyFormSheet } from '@/components/master-data/company/company-form-sheet';
import { DeleteConfirmationDialog } from '@/components/master-data/delete-confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AdaptiveTable } from '../ui/adaptive-table';
import { AdaptiveCardGrid, AdaptiveMetricCard } from '../ui/adaptive-card';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';

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
  
  const groupLimit = useMemo(() => {
      if (holdingCompany.customCompanyLimit != null) return holdingCompany.customCompanyLimit;
      return currentPlan?.companyLimit ?? 0;
  }, [holdingCompany, currentPlan]);

  const isLimitReached = useMemo(() => {
    if (groupLimit === -1) return false;
    return childCompanies.length >= groupLimit;
  }, [groupLimit, childCompanies.length]);

  const handleRowSelect = (rowId: string) => {
    setSelectedRowIds(prev =>
      prev.includes(rowId) ? prev.filter(id => id !== rowId) : [...prev, rowId]
    );
  };

  const handleOpenSheet = (company?: Company) => {
    if (!company && isLimitReached) {
        toast({ variant: "destructive", title: "Kuota Cabang Penuh", description: `Batas maksimal anak perusahaan Anda adalah ${groupLimit}.` });
        return;
    }
    setSelectedCompanyForEdit(company);
    setSheetOpen(true);
  };

  const handleSaveCompany = async (companyData: Company) => {
    if (companyData.id) {
      await updateCompany(companyData.id, companyData);
    } else {
        const dataToSave: Omit<Company, 'id'> = { ...companyData, parentId: holdingCompany.id };
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
    <div className="space-y-8">
        <AdaptiveCardGrid complexity="simple">
            <AdaptiveMetricCard 
                title="Kapasitas Grup"
                value={`${childCompanies.length} / ${groupLimit === -1 ? '∞' : groupLimit}`}
                icon={Shield}
                color={isLimitReached ? "bg-rose-500/10 text-rose-600" : "bg-primary/10 text-primary"}
                badge={currentPlan?.name || 'CUSTOM'}
            />
            <div className="col-span-1 sm:col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-5 flex items-end justify-end pb-1">
                <div className="flex items-center gap-2">
                    {selectedRowIds.length > 0 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-10 gap-1 font-bold">
                                    Aksi Massal ({selectedRowIds.length})
                                    <ChevronDown className="size-3.5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem className="text-destructive font-bold" onClick={() => openDeleteDialog(childCompanies.filter(c => selectedRowIds.includes(c.id)))}>
                                    <Trash2 className="mr-2 size-4" /> Hapus Terpilih
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    <Button onClick={() => handleOpenSheet()} disabled={isLimitReached} className="font-bold shadow-lg h-10">
                        <PlusCircle className="mr-2 size-4" /> Tambah Cabang
                    </Button>
                </div>
            </div>
        </AdaptiveCardGrid>

        <AdaptiveTable 
            data={childCompanies}
            keyExtractor={(c) => c.id}
            columns={[
                {
                    header: "Anak Perusahaan",
                    cell: (c) => (
                        <div className="flex items-center gap-3">
                            <div className="size-9 rounded-xl bg-primary/5 text-primary flex items-center justify-center border shrink-0">
                                <Building className="size-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold text-slate-900 truncate">{c.name}</p>
                                <p className="text-[10px] text-muted-foreground uppercase font-black">{c.businessField}</p>
                            </div>
                        </div>
                    )
                },
                { header: "Alamat / Lokasi", accessorKey: "address", className: "text-muted-foreground text-xs italic max-w-xs truncate" },
                { 
                    header: "Status", 
                    cell: (c) => <Badge variant={c.status === 'Aktif' ? 'default' : 'outline'} className="text-[10px] font-black uppercase h-5">{c.status}</Badge>
                },
                {
                    header: "",
                    className: "text-right",
                    cell: (c) => (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full"><MoreHorizontal className="size-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="z-[350]">
                                <DropdownMenuItem onClick={() => handleOpenSheet(c)}><Pencil size={14} className="mr-2"/> Ubah Rincian</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive font-bold" onClick={() => openDeleteDialog([c])}><Trash2 size={14} className="mr-2"/> Hapus Cabang</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
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
                                    <p className="text-[10px] text-muted-foreground font-bold">{c.businessField}</p>
                                </div>
                            </div>
                            <Badge variant={c.status === 'Aktif' ? 'default' : 'outline'} className="text-[8px] font-black h-4 uppercase">{c.status}</Badge>
                        </div>
                        <div className="flex gap-2 pt-3 border-t">
                            <Button variant="outline" size="sm" className="flex-1 font-bold text-[10px] h-9" onClick={() => handleOpenSheet(c)}>UBAH</Button>
                            <Button variant="ghost" size="sm" className="flex-1 font-bold text-[10px] h-9 text-destructive" onClick={() => openDeleteDialog([c])}>HAPUS</Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        />
        
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
    </div>
  );
}
