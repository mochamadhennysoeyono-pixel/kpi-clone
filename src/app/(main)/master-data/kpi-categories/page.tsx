// src/app/(main)/master-data/kpi-categories/page.tsx
"use client";

import { useState, useMemo } from "react";
import {
  PlusCircle,
  MoreHorizontal,
  ChevronDown,
  Trash2,
  Lock,
  Building,
  Filter,
  FolderKanban,
  Search,
  Pencil,
} from "lucide-react";
import type { KpiCategory } from "@/types";
import { KpiCategoryFormDialog } from "@/components/master-data/kpi-categories/kpi-category-form-dialog";
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";
import { useToast } from "@/hooks/use-toast";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_KPI_CATEGORIES } from "@/lib/default-data";
import { ResponsivePage, ResponsiveToolbar } from "@/components/ui/adaptive-layout";
import { PageHeader } from "@/components/ui/page-header";
import { AdaptiveTable } from "@/components/ui/adaptive-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";

export default function KpiCategoriesPage() {
  const { companies, kpiCategories, addKpiCategory, updateKpiCategory, deleteKpiCategories } = useMasterData();
  const { currentUser, userRole } = useAuth();
  const { toast } = useToast();

  const [isDialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<KpiCategory | undefined>(undefined);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoriesToDelete, setCategoriesToDelete] = useState<KpiCategory[] | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState("");
  
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

    let result = [...DEFAULT_KPI_CATEGORIES, ...cats];

    if (searchTerm) {
        result = result.filter(c => 
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            c.code.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    return result;
  }, [kpiCategories, currentUser, userRole, selectedCompanyFilter, defaultCategoryIds, searchTerm]);

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

    try {
        if (categoryData.id) {
            await updateKpiCategory(categoryData.id, dataToSave);
        } else {
            await addKpiCategory(dataToSave);
        }
        setDialogOpen(false);
    } catch (e: any) {
        toast({ variant: "destructive", title: "Gagal", description: e.message });
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
    <ResponsivePage>
      <PageHeader 
        title="Kategori KPI"
        description="Kelola kategori standar dan kustom sebagai landasan pengelompokan indikator kinerja."
        icon={FolderKanban}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {selectedRowIds.length > 0 && (
                <Button variant="outline" size="sm" className="h-9 sm:h-10 text-destructive font-bold" onClick={openBulkDeleteDialog}>
                    <Trash2 className="size-4 mr-2" /> Hapus ({selectedRowIds.length})
                </Button>
            )}
            <Button onClick={handleAddCategory} className="font-bold shadow-lg h-9 sm:h-10">
                <PlusCircle className="size-4" />
                Tambah Kategori
            </Button>
          </div>
        }
      />

      <ResponsiveToolbar>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="Cari kategori..." 
            className="pl-9 h-10 border-none shadow-none bg-background/50 focus-visible:ring-primary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {userRole === 'superadmin' && (
            <Select value={selectedCompanyFilter} onValueChange={setSelectedCompanyFilter}>
                <SelectTrigger className="w-full sm:w-[240px] h-10 bg-background border-none shadow-sm">
                    <Building className="size-4 mr-2 text-primary" />
                    <SelectValue placeholder="Semua Klien" />
                </SelectTrigger>
                <SelectContent className="z-[350]">
                    <SelectItem value="all">Semua Perusahaan & Global</SelectItem>
                    {companies.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
            </Select>
        )}
      </ResponsiveToolbar>

      <AdaptiveTable 
        data={filteredCategories}
        keyExtractor={(c) => c.id}
        columns={[
          {
            header: "Kategori",
            cell: (c) => (
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-primary/5 text-primary flex items-center justify-center border shrink-0">
                  <FolderKanban className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tight">{c.code}</p>
                </div>
              </div>
            )
          },
          {
             header: "Konteks",
             cell: (c) => (
                defaultCategoryIds.has(c.id) 
                    ? <Badge variant="secondary" className="text-[8px] font-black uppercase border-none h-4">GLOBAL</Badge> 
                    : <span className="text-xs font-semibold text-slate-600">{c.company}</span>
             )
          },
          {
            header: "Status",
            cell: (c) => (
              <Badge variant={c.status === 'Aktif' ? 'default' : 'outline'} className="text-[9px] uppercase font-black h-5 border-none">
                {c.status}
              </Badge>
            )
          },
          {
            header: "Deskripsi",
            accessorKey: "description",
            className: "text-muted-foreground text-xs leading-relaxed max-w-xs truncate",
            hideOnTablet: true,
          },
          {
            header: "",
            className: "text-right",
            cell: (c) => (
                defaultCategoryIds.has(c.id) ? (
                    <div className="flex justify-end pr-4 opacity-20"><Lock className="size-4" /></div>
                ) : (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full"><MoreHorizontal className="size-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="z-[350]">
                            <DropdownMenuItem onClick={() => handleEditCategory(c)}><Pencil className="size-3.5 mr-2" />Ubah</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive font-bold" onClick={() => openDeleteDialog(c)}><Trash2 className="size-3.5 mr-2" />Hapus</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            )
          }
        ]}
        renderMobileCard={(c) => {
            const isDefault = defaultCategoryIds.has(c.id);
            return (
                <Card className="border-border/40 shadow-sm overflow-hidden bg-background">
                    <CardContent className="p-4 space-y-4">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="size-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center border shrink-0">
                                    <FolderKanban size={20} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-black text-sm uppercase truncate">{c.name}</h3>
                                    <p className="text-[10px] text-muted-foreground font-bold">{c.code}</p>
                                </div>
                            </div>
                            <Badge variant={c.status === 'Aktif' ? 'default' : 'outline'} className="text-[8px] font-black h-4 border-none">{c.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 italic">{c.description}</p>
                        <div className="flex items-center justify-between pt-3 border-t">
                            <div className="text-[9px] font-black uppercase text-muted-foreground">Konteks: {isDefault ? "Global" : c.company}</div>
                            <div className="flex gap-2">
                                {isDefault ? (
                                    <Badge variant="outline" className="text-[8px] font-black gap-1.5 border-none bg-muted/50"><Lock size={10}/> TERKUNCI</Badge>
                                ) : (
                                    <>
                                        <Button variant="ghost" size="sm" className="h-8 font-bold text-[9px] uppercase" onClick={() => handleEditCategory(c)}>EDIT</Button>
                                        <Button variant="ghost" size="sm" className="h-8 font-bold text-[9px] uppercase text-destructive" onClick={() => openDeleteDialog(c)}>HAPUS</Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            );
        }}
      />
      
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
        itemName={categoriesToDelete?.length === 1 ? categoriesToDelete[0].name : `${categoriesToDelete?.length || 0} kategori`}
        itemType="kategori KPI"
      />
    </ResponsivePage>
  );
}
