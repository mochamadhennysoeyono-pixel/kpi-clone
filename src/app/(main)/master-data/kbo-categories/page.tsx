// src/app/(main)/master-data/kbo-categories/page.tsx
"use client";

import * as React from "react";
import { useState, useMemo } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { PlusCircle, MoreHorizontal, Lock, FolderKanban } from "lucide-react";
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
    return [...DEFAULT_KBO_CATEGORIES, ...cats];
  }, [kboCategories, currentUser, userRole, selectedCompanyFilter, defaultCategoryIds]);

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
    <div className="space-y-6">
      <Card className="shadow-lg mb-6">
        <CardHeader className="bg-primary text-primary-foreground dark:bg-card rounded-t-lg">
          <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
            <div>
              <CardTitle className="font-headline">Kategori Kompetensi (KBO)</CardTitle>
              <CardDescription className="text-primary-foreground/80 dark:text-muted-foreground">
                Sistem menggunakan 3 kategori kompetensi global (Core, Generic, Specific) yang tidak dapat diubah.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {userRole === 'superadmin' && (
            <div className="mb-6 p-4 border rounded-lg bg-muted/30 max-w-xs">
              <Select value={selectedCompanyFilter} onValueChange={setSelectedCompanyFilter}>
                <SelectTrigger><SelectValue placeholder="Filter Perusahaan" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Perusahaan & Global</SelectItem>
                  {companies.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">ID</TableHead>
                <TableHead>Nama Kategori</TableHead>
                {userRole === 'superadmin' && <TableHead>Konteks</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead><span className="sr-only">Aksi</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.map((category) => {
                const isDefault = defaultCategoryIds.has(category.id);
                return (
                  <TableRow key={category.id}>
                    <TableCell className="font-mono text-xs">{category.id}</TableCell>
                    <TableCell className="font-medium flex items-center gap-3">
                        <div className="hidden h-9 w-9 sm:flex items-center justify-center rounded-full bg-muted">
                            <FolderKanban className="h-5 w-5 text-muted-foreground" />
                        </div>
                        {category.name}
                    </TableCell>
                    {userRole === 'superadmin' && <TableCell>{isDefault ? <Badge variant="secondary">Global</Badge> : category.company}</TableCell>}
                    <TableCell><Badge variant={category.status === "Aktif" ? "default" : "outline"}>{category.status}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{category.description}</TableCell>
                    <TableCell className="text-right">
                      {isDefault ? (
                        <div className="flex justify-end pr-4"><Lock className="h-4 w-4 text-muted-foreground" /></div>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Buka menu</span></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEditItem(category)}>Ubah</DropdownMenuItem>
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
    </div>
  );
}
