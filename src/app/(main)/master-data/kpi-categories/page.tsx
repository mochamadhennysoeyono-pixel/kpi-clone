
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
import { PlusCircle, MoreHorizontal, ChevronDown, Trash2, Upload, Download, FileSpreadsheet, Lock } from "lucide-react";
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
    let cats = kpiCategories.filter(c => !defaultCategoryIds.has(c.id)); // Exclude defaults initially
    if (userRole === 'superadmin') {
      if (selectedCompanyFilter !== 'all') {
        cats = cats.filter(c => c.company === selectedCompanyFilter);
      }
    } else if (currentUser) {
      cats = cats.filter(c => c.company === currentUser.company);
    }
    // Always add default categories at the top
    return [...DEFAULT_KPI_CATEGORIES, ...cats];
  }, [kpiCategories, currentUser, userRole, selectedCompanyFilter, defaultCategoryIds]);

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    // Only allow selecting non-default categories
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
  
  const handleExport = () => {
    toast({ description: "Fitur ini sedang dinonaktifkan untuk sementara." });
  };

  const handleImportClick = () => {
    toast({ description: "Fitur ini sedang dinonaktifkan untuk sementara." });
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    toast({ description: "Fitur ini sedang dinonaktifkan untuk sementara." });
  };


  return (
    <div className="space-y-6">
      <Card className="shadow-lg mb-6">
        <CardHeader className="bg-primary text-primary-foreground dark:bg-card rounded-t-lg">
          <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
            <div>
              <CardTitle className="font-headline">Kategori KPI</CardTitle>
              <CardDescription className="text-primary-foreground/80 dark:text-muted-foreground">
                Definisikan dan kelola kategori untuk Indikator Kinerja Utama. Menampilkan {filteredCategories.length} data.
              </CardDescription>
            </div>
             <div className="flex items-center gap-2 self-end sm:self-center">
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
                        <DropdownMenuItem className="text-destructive" onClick={openBulkDeleteDialog}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Hapus Pilihan
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                )}
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 gap-1 bg-background/20 text-primary-foreground hover:bg-background/30 dark:bg-muted dark:text-foreground dark:hover:bg-muted/80">
                            <ChevronDown className="h-3.5 w-3.5" />
                             <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Impor/Ekspor</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleImportClick}>
                            <Upload className="mr-2 h-4 w-4" /> Impor dari Excel
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExport}>
                            <Download className="mr-2 h-4 w-4" /> Ekspor ke Excel
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <a href="https://docs.google.com/spreadsheets/d/19mwT-PaBBElj5Uho9-LeSbg47u5_thDL/export?format=xlsx" target="_blank" rel="noopener noreferrer">
                                <FileSpreadsheet className="mr-2 h-4 w-4" /> Unduh Contoh Format
                            </a>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <input type="file" ref={fileInputRef} onChange={handleImport} accept=".xlsx, .xls" style={{ display: 'none' }} />
                <Button size="sm" className="h-9 gap-1" onClick={handleAddCategory}>
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Tambah Kategori
                  </span>
                </Button>
             </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {userRole === 'superadmin' && (
            <div className="mb-6 p-4 border rounded-lg bg-muted/30 max-w-xs">
              <Select value={selectedCompanyFilter} onValueChange={setSelectedCompanyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter Perusahaan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Perusahaan</SelectItem>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                 <TableHead padding="checkbox" className="w-[40px]">
                    <Checkbox
                        checked={selectedRowIds.length > 0 && selectedRowIds.length === filteredCategories.filter(c => !defaultCategoryIds.has(c.id)).length && filteredCategories.filter(c => !defaultCategoryIds.has(c.id)).length > 0}
                        onCheckedChange={(checked) => handleSelectAll(checked)}
                        aria-label="Pilih semua"
                    />
                </TableHead>
                <TableHead className="w-[100px]">Kode</TableHead>
                <TableHead>Nama</TableHead>
                 {currentUser?.role === 'superadmin' && <TableHead>Perusahaan</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Deskripsi</TableHead>
                <TableHead>
                  <span className="sr-only">Aksi</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.map((category) => {
                const isDefault = defaultCategoryIds.has(category.id);
                return (
                  <TableRow key={category.id} data-state={selectedRowIds.includes(category.id) && "selected"}>
                    <TableCell padding="checkbox">
                          <Checkbox
                              checked={selectedRowIds.includes(category.id)}
                              onCheckedChange={() => handleRowSelect(category.id)}
                              aria-label={`Pilih ${category.name}`}
                              disabled={isDefault}
                          />
                    </TableCell>
                    <TableCell className="font-medium">{category.code}</TableCell>
                    <TableCell>{category.name}</TableCell>
                    {currentUser?.role === 'superadmin' && <TableCell>{isDefault ? <Badge variant="secondary">Global</Badge> : category.company}</TableCell>}
                    <TableCell>
                      <Badge variant={category.status === "Aktif" ? "default" : "outline"}>
                        {category.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{category.description}</TableCell>
                    <TableCell>
                      {isDefault ? (
                         <div className="flex justify-end pr-4">
                            <Lock className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Buka menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEditCategory(category)}>Ubah</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => openDeleteDialog(category)}>Hapus</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
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
