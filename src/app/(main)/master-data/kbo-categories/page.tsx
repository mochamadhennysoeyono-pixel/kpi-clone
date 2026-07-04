// src/app/(main)/master-data/kbo-categories/page.tsx
"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { DEFAULT_KBO_CATEGORIES } from "@/lib/default-data";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResponsivePage, ResponsiveToolbar } from "@/components/ui/adaptive-layout";
import { PageHeader } from "@/components/ui/page-header";
import { AdaptiveTable } from "@/components/ui/adaptive-table";


const categorySchema = z.object({
  id: z.string().min(1, "ID harus diisi"),
  name: z.string().min(1, "Nama kategori harus diisi"),
  description: z.string().min(1, "Deskripsi harus diisi"),
  company: z.string().optional(),
  status: z.enum(['Aktif', 'Tidak Aktif']),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface CategoryFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (data: Partial<CategoryFormValues>) => void;
  itemType: string;
  item?: KboCategory;
  companies: Company[];
}

function CategoryFormDialog({ isOpen, onOpenChange, onSave, itemType, item, companies }: CategoryFormDialogProps) {
  const { userRole, currentUser } = useAuth();
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { id: '', name: '', description: '', company: '', status: 'Aktif' },
  });

  const companyOptions = useMemo(() => companies.filter(c => c.status === 'Aktif'), [companies]);
  const isEditing = !!item;

  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        id: item?.id || '',
        name: item?.name || '',
        description: item?.description || '',
        company: item?.company || (userRole !== 'superadmin' ? currentUser?.company : ''),
        status: item?.status || 'Aktif',
      });
    }
  }, [isOpen, item, form, userRole, currentUser]);

  const onSubmit = (data: CategoryFormValues) => {
    onSave(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md flex flex-col">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle>{isEditing ? `Ubah ${itemType}` : `Tambah ${itemType} Baru`}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="flex-1 py-4 -mx-6 px-6">
                <div className="space-y-4">
              {userRole === 'superadmin' && (
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Perusahaan</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isEditing}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Pilih perusahaan" /></SelectTrigger></FormControl>
                        <SelectContent>{companyOptions.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
               <FormField
                  control={form.control}
                  name="id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID Kategori</FormLabel>
                      <FormControl>
                        <Input placeholder="cth., C1 atau CUSTOM1" {...field} disabled={isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nama Kategori</FormLabel><FormControl><Input placeholder="cth., Kompetensi Inti" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Deskripsi</FormLabel><FormControl><Textarea placeholder="Jelaskan kategori ini..." {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Aktif">Aktif</SelectItem><SelectItem value="Tidak Aktif">Tidak Aktif</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
            </div>
            </ScrollArea>
            <DialogFooter className="mt-auto p-6 pt-4 border-t">
              <DialogClose asChild><Button type="button" variant="outline">Batal</Button></DialogClose>
              <Button type="submit">Simpan</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


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
    if (userRole === 'superadmin') {
      if (selectedCompanyFilter !== 'all') {
        cats = cats.filter(c => c.company === selectedCompanyFilter);
      }
    } else if (currentUser) {
      cats = cats.filter(c => c.company === currentUser.company);
    }
    
    let result = [...DEFAULT_KBO_CATEGORIES, ...cats];
    
    if (searchTerm) {
        result = result.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    
    return result;
  }, [kboCategories, currentUser, userRole, selectedCompanyFilter, defaultCategoryIds, searchTerm]);

  const handleAddItem = () => {
    setSelectedCategory(undefined);
    setDialogOpen(true);
  };

  const handleEditItem = (category: KboCategory) => {
    if (defaultCategoryIds.has(category.id)) return;
    setSelectedCategory(category);
    setDialogOpen(true);
  };

  const handleSaveItem = async (data: Partial<CategoryFormValues>) => {
    const isEditing = !!selectedCategory;
    const companyToSave = userRole === 'manajemen' ? currentUser?.company : data.company;

    if (!companyToSave) {
        toast({ variant: "destructive", title: "Gagal Menyimpan", description: "Perusahaan harus dipilih." });
        return;
    }
    if (!data.id || !data.name) {
         toast({ variant: "destructive", title: "Gagal Menyimpan", description: "ID dan Nama Kategori harus diisi." });
        return;
    }
    
    // Combine company-specific and global categories for a comprehensive check
    const allRelevantCategories = [
        ...DEFAULT_KBO_CATEGORIES, 
        ...kboCategories.filter(cat => cat.company === companyToSave)
    ];

    const isIdDuplicate = allRelevantCategories.some(
      cat => cat.id.toLowerCase() === data.id!.toLowerCase() && (isEditing ? cat.id !== selectedCategory.id : true)
    );
    const isNameDuplicate = allRelevantCategories.some(
      cat => cat.name.toLowerCase() === data.name!.toLowerCase() && (isEditing ? cat.id !== selectedCategory.id : true)
    );

    if (isIdDuplicate) {
        toast({ variant: "destructive", title: "Gagal Menyimpan", description: `ID kategori "${data.id}" sudah digunakan secara global atau di perusahaan ini.` });
        return;
    }
    if (isNameDuplicate) {
        toast({ variant: "destructive", title: "Gagal Menyimpan", description: `Nama kategori "${data.name}" sudah digunakan secara global atau di perusahaan ini.` });
        return;
    }

    const dataToSave = { ...data, company: companyToSave } as Omit<KboCategory, 'id'> & { id: string };

    if (isEditing) {
        await updateKboCategory(selectedCategory.id, dataToSave);
    } else {
        await addKboCategory(dataToSave);
    }
    setDialogOpen(false);
  };

  const openDeleteDialog = (category: KboCategory) => {
    if (defaultCategoryIds.has(category.id)) return;
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (categoryToDelete) {
      await deleteKboCategories([categoryToDelete.id]);
      setCategoryToDelete(null);
    }
  };

  return (
    <ResponsivePage>
      <PageHeader 
        title="Kategori Kompetensi (KBO)"
        description="Kelola kategori kompetensi global dan kustom untuk kerangka penilaian perilaku tim."
        icon={FolderKanban}
        actions={
            <Button onClick={handleAddItem} className="font-bold shadow-lg h-9 sm:h-10">
                <PlusCircle className="size-4" />
                Tambah Kategori
            </Button>
        }
      />

      <ResponsiveToolbar>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="Cari nama kategori..." 
            className="pl-9 h-10 border-none shadow-none bg-background/50 focus-visible:ring-primary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {userRole === 'superadmin' && (
            <Select value={selectedCompanyFilter} onValueChange={setSelectedCompanyFilter}>
                <SelectTrigger className="w-full sm:w-[220px] h-10 bg-background border-none">
                    <Building className="size-4 mr-2 text-primary" />
                    <SelectValue placeholder="Semua Klien" />
                </SelectTrigger>
                <SelectContent>
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
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tight">{c.id}</p>
                </div>
              </div>
            )
          },
          {
             header: "Konteks",
             cell: (c) => (
                defaultCategoryIds.has(c.id) 
                    ? <Badge variant="secondary" className="text-[8px] font-black uppercase">GLOBAL</Badge> 
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
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditItem(c)}><Pencil className="size-3.5 mr-2" />Ubah</DropdownMenuItem>
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
                                    <p className="text-[10px] text-muted-foreground font-bold">{c.id}</p>
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
                                        <Button variant="ghost" size="sm" className="h-8 font-bold text-[9px] uppercase" onClick={() => handleEditItem(c)}>EDIT</Button>
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
      
      <CategoryFormDialog
        isOpen={isDialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveItem}
        itemType="Kategori Kompetensi"
        item={selectedCategory}
        companies={companies}
      />

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        itemName={categoryToDelete?.name || ''}
        itemType="kategori"
      />
    </ResponsivePage>
  );
}
