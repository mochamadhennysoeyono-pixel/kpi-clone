
// src/app/(main)/master-data/kpi-categories/page.tsx
"use client";

import { useState, useMemo } from "react";
import {
  PlusCircle,
  MoreHorizontal,
  Trash2,
  Building,
  FolderKanban,
  Search,
  Pencil,
} from "lucide-react";
import type { KpiCategory } from "@/types";
import { KpiCategoryFormDialog } from "@/components/master-data/kpi-categories/kpi-category-form-dialog";
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";
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
import { KpiNavigator } from "@/components/layout/dashboard-navigator";

export default function KpiCategoriesPage() {
  const { companies, kpiCategories, addKpiCategory, updateKpiCategory, deleteKpiCategories } = useMasterData();
  const { currentUser, userRole } = useAuth();
  const { toast } = useToast();

  const [isDialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<KpiCategory | undefined>(undefined);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoriesToDelete, setCategoriesToDelete] = useState<KpiCategory[] | null>(null);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState("");
  
  const defaultCategoryIds = useMemo(() => new Set(DEFAULT_KPI_CATEGORIES.map(c => c.id)), []);

  const filteredCategories = useMemo(() => {
    let cats = kpiCategories.filter(c => !defaultCategoryIds.has(c.id)); 
    if (userRole === 'superadmin' && selectedCompanyFilter !== 'all') cats = cats.filter(c => c.company === selectedCompanyFilter);
    else if (userRole !== 'superadmin' && currentUser) cats = cats.filter(c => c.company === currentUser.company);

    let result = [...DEFAULT_KPI_CATEGORIES, ...cats];
    if (searchTerm) result = result.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return result;
  }, [kpiCategories, currentUser, userRole, selectedCompanyFilter, defaultCategoryIds, searchTerm]);

  const handleSaveCategory = async (data: any) => {
    if (data.id) await updateKpiCategory(data.id, data);
    else await addKpiCategory(data);
    toast({ title: "Kategori Disimpan" });
  };

  return (
    <ResponsivePage>
      <PageHeader title="Library Kategori KPI" description="Kelola klasifikasi indikator untuk pengelompokan laporan kinerja yang terstruktur." icon={FolderKanban}
        actions={<Button onClick={() => { setSelectedCategory(undefined); setDialogOpen(true); }} className="font-bold shadow-lg"><PlusCircle className="size-4 mr-2" /> Tambah Kategori</Button>}
      />

      <KpiNavigator />

      <ResponsiveToolbar>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Cari kategori..." className="pl-9 h-10 border-none bg-background/50 shadow-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        {userRole === 'superadmin' && (
            <Select value={selectedCompanyFilter} onValueChange={setSelectedCompanyFilter}>
                <SelectTrigger className="w-full sm:w-[240px] h-10 bg-background border-none"><Building size={14} className="mr-2 text-primary" /><SelectValue placeholder="Pilih Perusahaan" /></SelectTrigger>
                <SelectContent className="z-[350]">
                    <SelectItem value="all">Semua Klien & Global</SelectItem>
                    {companies.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
            </Select>
        )}
      </ResponsiveToolbar>

      <AdaptiveTable 
        data={filteredCategories}
        keyExtractor={(c) => c.id}
        columns={[
          { header: "Kategori", cell: (c) => (<div className="flex items-center gap-3"><div className="size-9 rounded-xl bg-primary/5 text-primary flex items-center justify-center border shrink-0"><FolderKanban className="size-5" /></div><div className="min-w-0"><p className="font-bold text-slate-900 truncate">{c.name}</p><p className="text-[10px] text-muted-foreground uppercase font-black">{c.code}</p></div></div>)},
          { header: "Konteks", cell: (c) => (defaultCategoryIds.has(c.id) ? <Badge variant="secondary" className="text-[8px] font-black uppercase">GLOBAL</Badge> : <span className="text-xs font-semibold text-slate-600">{c.company}</span>)},
          { header: "Status", cell: (c) => <Badge variant={c.status === 'Aktif' ? 'default' : 'outline'} className="text-[9px] uppercase font-black h-5 border-none">{c.status}</Badge> },
          { header: "", className: "text-right", cell: (c) => (!defaultCategoryIds.has(c.id) && (
              <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-full"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[350]">
                    <DropdownMenuItem onClick={() => { setSelectedCategory(c); setDialogOpen(true); }}><Pencil size={14} className="mr-2"/> Ubah</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive font-bold" onClick={() => { setCategoriesToDelete([c]); setDeleteDialogOpen(true); }}><Trash2 size={14} className="mr-2"/> Hapus</DropdownMenuItem>
                </DropdownMenuContent></DropdownMenu>
          ))}
        ]}
        renderMobileCard={(c) => (
          <Card className="border-border/40 shadow-sm bg-background">
            <CardContent className="p-4 space-y-4">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="size-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center border shrink-0"><FolderKanban size={20} /></div>
                        <div className="min-w-0"><h3 className="font-black text-sm uppercase truncate">{c.name}</h3><p className="text-[10px] text-muted-foreground font-bold">{c.code}</p></div>
                    </div>
                    {!defaultCategoryIds.has(c.id) && <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal size={14}/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => { setSelectedCategory(c); setDialogOpen(true); }}>Ubah</DropdownMenuItem><DropdownMenuItem className="text-destructive" onClick={() => { setCategoriesToDelete([c]); setDeleteDialogOpen(true); }}>Hapus</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}
                </div>
            </CardContent>
          </Card>
        )}
      />
      
      <KpiCategoryFormDialog isOpen={isDialogOpen} onOpenChange={setDialogOpen} category={selectedCategory} onSave={handleSaveCategory} kpiCategories={kpiCategories} companies={companies} />
      <DeleteConfirmationDialog isOpen={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={async () => { if(categoriesToDelete) await deleteKpiCategories(categoriesToDelete.map(c => c.id)); setCategoriesToDelete(null); }} itemName={categoriesToDelete?.length === 1 ? categoriesToDelete[0].name : 'beberapa kategori'} itemType="kategori KPI" />
    </ResponsivePage>
  );
}
