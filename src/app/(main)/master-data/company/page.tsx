// src/app/(main)/master-data/company/page.tsx
"use client";

import { useState, useMemo } from "react";
import Link from 'next/link';
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { PlusCircle, MoreHorizontal, Building, ChevronDown, Trash2, Search, Crown, Users, Eye, Sparkles, Pencil, GitMerge } from "lucide-react";
import type { Company, Employee } from "@/types";
import { CompanyFormSheet } from "@/components/master-data/company/company-form-sheet";
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";
import { useMasterData } from "@/contexts/master-data-context";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";


export default function CompanyPage() {
  const { companies, addCompany, updateCompany, deleteCompany, subscriptionPlans, employees } = useMasterData();
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | undefined>(undefined);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredCompanies = useMemo(() => {
    return companies.filter(company => {
      const nameMatch = company.name.toLowerCase().includes(searchTerm.toLowerCase());
      const statusMatch = statusFilter === 'all' || company.status === statusFilter;
      return nameMatch && statusMatch;
    });
  }, [companies, searchTerm, statusFilter]);

  const companyUsage = useMemo(() => {
    const usageMap = new Map<string, { userCount: number; managementCount: number; childCompanyCount: number }>();
    companies.forEach(company => {
        const userCount = employees.filter(e => e.company === company.name && e.role === 'user').length;
        const managementCount = employees.filter(e => e.company === company.name && e.role === 'manajemen').length;
        const childCompanyCount = company.isHolding ? companies.filter(c => c.parentId === company.id).length : 0;
        usageMap.set(company.id, { userCount, managementCount, childCompanyCount });
    });
    return usageMap;
  }, [companies, employees]);

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked) {
      setSelectedRowIds(filteredCompanies.map(c => c.id));
    } else {
      setSelectedRowIds([]);
    }
  };

  const handleRowSelect = (rowId: string) => {
    setSelectedRowIds(prev =>
      prev.includes(rowId) ? prev.filter(id => id !== rowId) : [...prev, rowId]
    );
  };
  
  const handleBulkDelete = async () => {
    await Promise.all(selectedRowIds.map(id => deleteCompany(id)));
    toast({
        title: "Aksi Massal Berhasil",
        description: `${selectedRowIds.length} data perusahaan telah berhasil dihapus.`,
    });
    setSelectedRowIds([]);
  };

  const handleAddCompany = () => {
    setSelectedCompany(undefined);
    setSheetOpen(true);
  };

  const handleEditCompany = (company: Company) => {
    setSelectedCompany(company);
    setSheetOpen(true);
  };

  const handleSaveCompany = async (companyData: Company) => {
    if (companyData.id) {
      await updateCompany(companyData.id, companyData);
    } else {
      await addCompany(companyData);
    }
  };

  const handlePlanChange = async (company: Company, planId: string) => {
    try {
        await updateCompany(company.id, { subscriptionPlanId: planId });
        toast({
            title: "Paket Diperbarui Manual",
            description: `Perusahaan ${company.name} kini menggunakan paket baru. Log histori telah dicatat.`
        });
    } catch (e: any) {
        toast({
            variant: "destructive",
            title: "Gagal Memperbarui",
            description: e.message || 'Terjadi kesalahan.'
        });
    }
  }

  const openDeleteDialog = (company: Company) => {
    setCompanyToDelete(company);
    setDeleteDialogOpen(true);
  };

  const handleDeleteCompany = async () => {
    if (companyToDelete) {
      await deleteCompany(companyToDelete.id);
      setCompanyToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-t-4 border-primary mb-6 overflow-hidden">
        <CardHeader>
          <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <Building className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <CardTitle className="font-headline text-2xl">Data Perusahaan Klien</CardTitle>
                    <CardDescription>
                        Kelola data klien dan migrasikan paket mereka ke sistem terbaru di sini.
                    </CardDescription>
                </div>
            </div>
             <div className="flex items-center gap-2 self-end sm:self-center">
                {selectedRowIds.length > 0 && (
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="h-9 gap-1">
                            Aksi Massal ({selectedRowIds.length})
                            <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Pilih Aksi</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={handleBulkDelete}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Hapus Pilihan
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                )}
                <Button size="sm" className="h-9 gap-1 shadow-md" onClick={handleAddCompany}>
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Tambah Perusahaan
                  </span>
                </Button>
             </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
            <div className="flex items-center gap-4 mb-6 p-4 border rounded-lg bg-muted/30">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        placeholder="Cari nama perusahaan..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Status</SelectItem>
                        <SelectItem value="Aktif">Aktif</SelectItem>
                        <SelectItem value="Tidak Aktif">Tidak Aktif</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          <Table>
            <TableHeader>
              <TableRow>
                 <TableHead padding="checkbox" className="w-[40px]">
                    <Checkbox
                        checked={selectedRowIds.length > 0 && selectedRowIds.length === filteredCompanies.length && filteredCompanies.length > 0}
                        onCheckedChange={(checked) => handleSelectAll(checked)}
                        aria-label="Pilih semua"
                    />
                </TableHead>
                <TableHead>Nama Perusahaan</TableHead>
                <TableHead>Set Paket (Sistem Baru)</TableHead>
                <TableHead>Penggunaan Kuota</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
                <TableHead>
                  <span className="sr-only">Aksi</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCompanies.length > 0 ? (
                filteredCompanies.map((company) => {
                    const usage = companyUsage.get(company.id) || { userCount: 0, managementCount: 0, childCompanyCount: 0 };
                    const currentPlan = subscriptionPlans.find(p => p.id === company.subscriptionPlanId);
                    
                    return (
                    <TableRow key={company.id} data-state={selectedRowIds.includes(company.id) && "selected"}>
                    <TableCell padding="checkbox">
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
                        <div className="grid gap-0.5">
                            <span className="font-bold flex items-center gap-1.5">
                                {company.name} 
                                {company.isHolding && <Badge variant="secondary" className="h-4 text-[8px] px-1 bg-primary/10 text-primary">HOLDING</Badge>}
                            </span>
                            <span className="text-[10px] text-muted-foreground hidden sm:inline uppercase font-bold tracking-tight">
                                {company.businessField}
                            </span>
                        </div>
                        </div>
                    </TableCell>
                    <TableCell>
                        {company.parentId ? (
                           <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                               <GitMerge className="size-3" />
                               <span>Ikut Induk</span>
                           </div>
                        ) : (
                           <div className="flex flex-col gap-1.5">
                                <Select 
                                    value={company.subscriptionPlanId || 'none'} 
                                    onValueChange={(planId) => handlePlanChange(company, planId)}
                                >
                                    <SelectTrigger className={cn(
                                        "w-[160px] text-xs h-9 font-bold",
                                        !currentPlan && "border-destructive/50 text-destructive bg-destructive/5"
                                    )}>
                                        <SelectValue placeholder="Pilih Paket Baru" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none" disabled>-- Pilih Paket --</SelectItem>
                                        {subscriptionPlans.map(plan => (
                                            <SelectItem key={plan.id} value={plan.id}>
                                                <div className="flex items-center justify-between gap-4 w-full">
                                                    <span>{plan.name}</span>
                                                    <span className="opacity-50 font-normal">Rp{plan.price.toLocaleString('id-ID')}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {!currentPlan && company.subscriptionPlanId !== 'default-trial' && (
                                    <span className="text-[9px] font-black text-destructive uppercase flex items-center gap-1">
                                        <Sparkles size={10} /> Paket Belum Terhubung
                                    </span>
                                )}
                           </div>
                        )}
                    </TableCell>
                    <TableCell>
                         {currentPlan ? (
                            <div className="flex flex-col gap-1 text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                                <div className="flex items-center gap-1.5"><Users className="h-2.5 w-2.5" /> Staff: <span className="text-foreground">{usage.userCount}/{currentPlan.userLimit === -1 ? '∞' : currentPlan.userLimit}</span></div>
                                <div className="flex items-center gap-1.5"><Crown className="h-2.5 w-2.5" /> Admin: <span className="text-foreground">{usage.managementCount}/{currentPlan.managementUserLimit === -1 ? '∞' : currentPlan.managementUserLimit}</span></div>
                            </div>
                        ) : (
                            <span className="text-[10px] text-muted-foreground italic">N/A</span>
                        )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                        <Badge variant={company.status === "Aktif" ? "default" : "outline"} className="text-[10px] uppercase font-black">
                        {company.status}
                        </Badge>
                    </TableCell>
                    <TableCell>
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Buka menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel className="text-[10px] uppercase font-black opacity-60">Manajemen Klien</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                                <Link href={`/company-subscription-status/${company.id}`} className="cursor-pointer">
                                    <Eye className="mr-2 h-4 w-4"/> Detail & Riwayat Paket
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditCompany(company)} className="cursor-pointer">
                                <Pencil className="mr-2 h-4 w-4"/> Edit Identitas
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive cursor-pointer" onClick={() => openDeleteDialog(company)}>
                                <Trash2 className="mr-2 h-4 w-4"/> Hapus Perusahaan
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                    )
                })
              ) : (
                <TableRow>
                    <TableCell colSpan={6} className="h-40 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2 opacity-40">
                            <Building size={40} />
                            <p className="font-bold uppercase text-xs">Tidak ada data perusahaan.</p>
                        </div>
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <CompanyFormSheet 
        isOpen={isSheetOpen} 
        onOpenChange={setSheetOpen} 
        company={selectedCompany} 
        onSave={handleSaveCompany}
      />
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteCompany}
        itemName={companyToDelete?.name || ''}
        itemType="perusahaan"
      />
    </div>
  );
}
