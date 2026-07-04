// src/app/(main)/master-data/kpi-categories/page.tsx
"use client";

import { useState, useMemo, useRef } from "react";
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
import { PlusCircle, MoreHorizontal, ChevronDown, Trash2, Upload, Download, FileSpreadsheet, Lock, Building, Filter, FolderKanban } from "lucide-react";
import type { KpiCategory } from "@/types";
import { KpiCategoryFormDialog } from "@/components/master-data/kpi-categories/kpi-category-form-dialog";
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";
import { useToast } from "@/hooks/use-toast";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_KPI_CATEGORIES } from "@/lib/default-data";

export default function KpiCategoriesPage() {
  const { companies, kpiCategories, addKpiCategory, updateKpiCategory, deleteKpiCategories } = useMasterData();
  const { currentUser, userRole } = useAuth();

  const [isDialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<KpiCategory | undefined>(undefined);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoriesToDelete, setCategoriesToDelete] = useState<KpiCategory[] | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('all');
  
  const defaultCategoryIds = useMemo(() => new Set(DEFAULT_KPI_CATEGORIES.map(c => c.id)), []);

  const filteredCategories = useMemo(() => {
    let cats = kpiCategories.filter(c => !defaultCategoryIds.has(c.id)); 
    if (userRole === 'superadmin') {
      if (selectedCompanyFilter !== 'all') {
        cats = cats.filter(c => c.company === selectedCompanyFilter);
      }
    } else if (currentUser) {
      cats = cats.filter(c => c.company === currentUser.company);
    }
    return [...DEFAULT_KPI_CATEGORIES, ...cats];
  }, [kpiCategories, currentUser, userRole, selectedCompanyFilter, defaultCategoryIds]);

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    const selectableIds = filteredCategories.filter(c => !defaultCategoryIds.has(c.id)).map(c => c.id);
    if (checked) {
      setSelectedRowIds(selectableIds);
    } else {
      setSelectedRowIds([]);
    }
  };

  const handleRowSelect = (rowId: string) => {
    if (defaultCategoryIds.has(rowId)) return;
    setSelectedRowIds(prev =>
      prev.includes(rowId) ? prev.filter(id => id !== rowId) : [...prev, rowId]
    );
  };
  
  const openBulkDeleteDialog = () => {
    const itemsToDelete = kpiCategories.filter(c => selectedRowIds.includes(c.id) && !defaultCategoryIds.has(c.id));
    if (itemsToDelete.length === 0) return;
    setCategoriesToDelete(itemsToDelete);
    setDeleteDialogOpen(true);
  };

  const handleAddCategory = () => {
    setSelectedCategory(undefined);
    setDialogOpen(true);
  };

  const handleEditCategory = (category: KpiCategory) => {
    if (defaultCategoryIds.has(category.id)) return;
    setSelectedCategory(category);
    setDialogOpen(true);
  };

  const handleSaveCategory = async (categoryData: Omit<KpiCategory, 'id'> & { id?: string }) => {
    const companyToSave = userRole === 'manajemen' ? currentUser?.company : categoryData.company;
    if (!companyToSave) {
        toast({ variant: "destructive", title: "Gagal Menyimpan", description: "Perusahaan harus dipilih." });
        return;
    }

    const dataToSave = { ...categoryData, company: companyToSave };

    if (categoryData.id) {
        await updateKpiCategory(categoryData.id, dataToSave);
    } else {
        await addKpiCategory(dataToSave);
    }
  };

  const openDeleteDialog = (category: KpiCategory) => {
    if (defaultCategoryIds.has(category.id)) return;
    setCategoriesToDelete([category]);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (categoriesToDelete && categoriesToDelete.length > 0) {
      const idsToDelete = categoriesToDelete.map(c => c.id);
      await deleteKpiCategories(idsToDelete);
      setCategoriesToDelete(null);
      setSelectedRowIds([]);
    }
  };
  
  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-t-4 border-primary mb-6 overflow-hidden">
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                <FolderKanban className="size-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="font-headline text-xl sm:text-2xl text-foreground truncate">
                    Kategori KPI
                </CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                   Definisikan dan kelola kategori untuk Indikator Kinerja Utama. Menampilkan {filteredCategories.length} data.
                </CardDescription>
              </div>
            </div>
             <div className="flex flex-wrap items-center gap-2 shrink-0 self-end lg:self-center">
                {selectedRowIds.length > 0 && (
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-10 gap-1 shadow-sm">
                            <ChevronDown className="ml-1 h-3.5 w-3.5" />
                            Aksi Massal ({selectedRowIds.length})
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="z-[350]">
                        <DropdownMenuLabel className="text-[10px] uppercase font-black opacity-60">Pilih Aksi</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive font-bold" onClick={openBulkDeleteDialog}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Hapus Pilihan
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                )}
                <Button size="sm" className="h-10 gap-1 font-bold shadow-md" onClick={handleAddCategory}>
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="whitespace-nowrap">Tambah Kategori</span>
                </Button>
             </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {userRole === 'superadmin' && (
            <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 border rounded-xl bg-muted/30 max-w-full">
              <div className="flex flex-1 items-center gap-2 min-w-0">
                <Building className="size-4 text-primary shrink-0" />
                <Select value={selectedCompanyFilter} onValueChange={setSelectedCompanyFilter}>
                    <SelectTrigger className="w-full md:w-[280px] bg-background">
                    <SelectValue placeholder="Filter Perusahaan" />
                    </SelectTrigger>
                    <SelectContent className="z-[350]">
                    <SelectItem value="all">Semua Perusahaan & Global</SelectItem>
                    {companies.map(c => (
                        <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div className="overflow-x-auto rounded-xl border shadow-sm">
            <Table className="min-w-[800px]">
                <TableHeader className="bg-muted/50">
                <TableRow>
                    <TableHead className="w-[40px]">
                        <Checkbox
                            checked={selectedRowIds.length > 0 && selectedRowIds.length === filteredCategories.filter(c => !defaultCategoryIds.has(c.id)).length && filteredCategories.filter(c => !defaultCategoryIds.has(c.id)).length > 0}
                            onCheckedChange={(checked) => handleSelectAll(checked)}
                            aria-label="Pilih semua"
                        />
                    </TableHead>
                    <TableHead className="w-[120px]">Kode</TableHead>
                    <TableHead>Nama Kategori</TableHead>
                    {userRole === 'superadmin' && <TableHead>Konteks</TableHead>}
                    <TableHead>Status</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredCategories.map((category) => {
                    const isDefault = defaultCategoryIds.has(category.id);
                    return (
                    <TableRow key={category.id} data-state={selectedRowIds.includes(category.id) && "selected"} className="hover:bg-muted/5">
                        <TableCell>
                            <Checkbox
                                checked={selectedRowIds.includes(category.id)}
                                onCheckedChange={() => handleRowSelect(category.id)}
                                aria-label={`Pilih ${category.name}`}
                                disabled={isDefault}
                            />
                        </TableCell>
                        <TableCell className="font-mono text-sm font-bold text-primary">{category.code}</TableCell>
                        <TableCell className="font-bold text-slate-900">{category.name}</TableCell>
                        {userRole === 'superadmin' && (
                            <TableCell>
                                {isDefault ? <Badge variant="secondary" className="text-[8px] font-black uppercase">GLOBAL</Badge> : <span className="text-xs font-semibold">{category.company}</span>}
                            </TableCell>
                        )}
                        <TableCell>
                        <Badge variant={category.status === "Aktif" ? "default" : "outline"} className="text-[10px] uppercase font-black">
                            {category.status}
                        </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground leading-relaxed max-w-xs truncate">{category.description}</TableCell>
                        <TableCell className="text-right">
                        {isDefault ? (
                            <div className="flex justify-end pr-4"><Lock className="size-4 text-muted-foreground/30" /></div>
                        ) : (
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button aria-haspopup="true" size="icon" variant="ghost" className="rounded-full">
                                <MoreHorizontal className="size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="z-[350]">
                                <DropdownMenuLabel className="text-[10px] uppercase font-black opacity-60">Opsi Kategori</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleEditCategory(category)}>Ubah Detail</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive font-bold" onClick={() => openDeleteDialog(category)}>Hapus</DropdownMenuItem>
                            </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        </TableCell>
                    </TableRow>
                    )
                })}
                </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <KpiCategoryFormDialog 
        isOpen={isDialogOpen}
        onOpenChange={setDialogOpen}
        category={selectedCategory}
        onSave={handleSaveCategory}
        kpiCategories={kpiCategories}
        companies={companies}
      />
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        itemName={categoriesToDelete?.length === 1 ? categoriesToDelete[0].name : `${categoriesToDelete?.length} item`}
        itemType="kategori KPI"
      />
    </div>
  );
}
