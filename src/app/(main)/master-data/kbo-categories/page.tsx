// src/app/(main)/master-data/kbo-categories/page.tsx
"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import { PlusCircle, MoreHorizontal, Lock, FolderKanban, Building, Filter, Search, Pencil, Trash2 } from "lucide-react";
import type { KboCategory, Company } from "@/types";
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KboCategoryFormDialog } from "@/components/master-data/kbo-categories/kbo-category-form-dialog";
import { ResponsivePage, ResponsiveToolbar } from "@/components/ui/adaptive-layout";
import { PageHeader } from "@/components/ui/page-header";
import { AdaptiveTable } from "@/components/ui/adaptive-table";
import { KboNavigator } from "@/components/layout/dashboard-navigator";
import { DEFAULT_KBO_CATEGORIES } from "@/lib/default-data";
import { Input } from "@/components/ui/input";

export default function KboCategoriesPage() {
  const { kboCategories, addKboCategory, updateKboCategory, deleteKboCategories, companies } = useMasterData();
  const { currentUser, userRole } = useAuth();
  const { toast } = useToast();
  
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<KboCategory | undefined>(undefined);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<KboCategory | null>(null);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState("");
  
  const defaultCategoryIds = useMemo(() => new Set(DEFAULT_KBO_CATEGORIES.map(c => c.id)), []);

  const filteredCategories = useMemo(() => {
    let cats = kboCategories.filter(c => !defaultCategoryIds.has(c.id));
    if (userRole === 'superadmin' && selectedCompanyFilter !== 'all') cats = cats.filter(c => c.company === selectedCompanyFilter);
    else if (userRole !== 'superadmin' && currentUser) cats = cats.filter(c => c.company === currentUser.company);
    
    let result = [...DEFAULT_KBO_CATEGORIES, ...cats];
    if (searchTerm) result = result.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return result;
  }, [kboCategories, currentUser, userRole, selectedCompanyFilter, defaultCategoryIds, searchTerm]);

  const handleSaveItem = async (data: any) => {
    if (data.id) await updateKboCategory(data.id, data);
    else await addKboCategory(data);
    toast({ title: "Kategori Disimpan" });
  };

  return (
    <ResponsivePage>
      <PageHeader title="Kategori Kompetensi (KBO)" description="Kelola klasifikasi standar kompetensi global dan kustom perusahaan." icon={FolderKanban}
        actions={<Button onClick={() => { setSelectedCategory(undefined); setDialogOpen(true); }} className="font-bold shadow-lg"><PlusCircle className="size-4 mr-2" /> Tambah Kategori</Button>}
      />

      <KboNavigator />

      <ResponsiveToolbar>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Cari nama kategori..." className="pl-9 h-10 border-none bg-background/50 shadow-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
          { header: "Kategori", cell: (c) => (<div className="flex items-center gap-3"><div className="size-9 rounded-xl bg-primary/5 text-primary flex items-center justify-center border shrink-0"><FolderKanban className="size-5" /></div><div className="min-w-0"><p className="font-bold text-slate-900 truncate">{c.name}</p><p className="text-[10px] text-muted-foreground uppercase font-black">{c.id}</p></div></div>)},
          { header: "Konteks", cell: (c) => (defaultCategoryIds.has(c.id) ? <Badge variant="secondary" className="text-[8px] font-black uppercase">GLOBAL</Badge> : <span className="text-xs font-semibold text-slate-600">{c.company}</span>)},
          { header: "Status", cell: (c) => <Badge variant={c.status === 'Aktif' ? 'default' : 'outline'} className="text-[9px] uppercase font-black h-5 border-none">{c.status}</Badge> },
          { header: "", className: "text-right", cell: (c) => (!defaultCategoryIds.has(c.id) && (
              <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-full"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[350]">
                    <DropdownMenuItem onClick={() => { setSelectedCategory(c); setDialogOpen(true); }}><Pencil size={14} className="mr-2"/> Ubah</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive font-bold" onClick={() => { setCategoryToDelete(c); setDeleteDialogOpen(true); }}><Trash2 size={14} className="mr-2"/> Hapus</DropdownMenuItem>
                </DropdownMenuContent></DropdownMenu>
          ))}
        ]}
        renderMobileCard={(c) => (
          <Card className="border-border/40 shadow-sm bg-background">
            <CardContent className="p-4 space-y-4">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="size-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center border shrink-0"><FolderKanban size={20} /></div>
                        <div className="min-w-0"><h3 className="font-black text-sm uppercase truncate">{c.name}</h3><p className="text-[10px] text-muted-foreground font-bold">{c.id}</p></div>
                    </div>
                    {!defaultCategoryIds.has(c.id) && <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal size={14}/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => { setSelectedCategory(c); setDialogOpen(true); }}>Ubah</DropdownMenuItem><DropdownMenuItem className="text-destructive" onClick={() => { setCategoryToDelete(c); setDeleteDialogOpen(true); }}>Hapus</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}
                </div>
            </CardContent>
          </Card>
        )}
      />
      
      <KboCategoryFormDialog isOpen={isDialogOpen} onOpenChange={setDialogOpen} onSave={handleSaveItem} item={selectedCategory} companies={companies} />
      <DeleteConfirmationDialog isOpen={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={async () => { if(categoryToDelete) await deleteKboCategories([categoryToDelete.id]); setCategoryToDelete(null); }} itemName={categoryToDelete?.name || ''} itemType="kategori KBO" />
    </ResponsivePage>
  );
}
