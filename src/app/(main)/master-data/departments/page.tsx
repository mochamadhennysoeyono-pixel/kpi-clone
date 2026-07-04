// src/app/(main)/master-data/departments/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { PlusCircle, MoreHorizontal, Network, ChevronDown, Trash2 } from "lucide-react";
import type { Department, Company } from "@/types";
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


const nameSchema = z.object({
  name: z.string().min(1, "Nama harus diisi"),
  company: z.string().optional(),
});

type NameFormValues = z.infer<typeof nameSchema>;

interface NameFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (data: { name: string, company?: string }) => void;
  itemType: string;
  item?: Department;
  companies: Company[];
}

function NameFormDialog({ isOpen, onOpenChange, onSave, itemType, item, companies }: NameFormDialogProps) {
  const { userRole, currentUser } = useAuth();
  const form = useForm<NameFormValues>({
    resolver: zodResolver(nameSchema),
    defaultValues: {
      name: '',
      company: '',
    },
  });

  const companyOptions = useMemo(() => {
    return companies.filter(c => c.status === 'Aktif');
  }, [companies]);

  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: item?.name || '',
        company: item?.company || (userRole !== 'superadmin' ? currentUser?.company : ''),
      });
    }
  }, [isOpen, item, form, userRole, currentUser]);

  const onSubmit = (data: NameFormValues) => {
    onSave(data);
    onOpenChange(false);
  };
  
  const isEditing = !!item;
  
  const canChangeCompany = useMemo(() => {
    if (userRole === 'superadmin') return true;
    if (userRole === 'manajemen') {
        const userCompany = companies.find(c => c.name === currentUser?.company);
        return userCompany?.isHolding === true;
    }
    return false;
  }, [userRole, currentUser, companies]);


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>{isEditing ? `Ubah ${itemType}` : `Tambah ${itemType} Baru`}</DialogTitle>
              <DialogDescription>
                Lengkapi detail untuk {itemType.toLowerCase()} di bawah ini.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              {canChangeCompany && (
                 <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Perusahaan</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isEditing}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih perusahaan" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {companyOptions.map(c => (
                                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
              )}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama {itemType}</FormLabel>
                    <FormControl>
                      <Input placeholder={`cth., ${itemType} Baru`} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Batal
                </Button>
              </DialogClose>
              <Button type="submit">Simpan</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


export default function DepartmentsPage() {
  const { departments, addDepartment, updateDepartment, deleteDepartments, companies } = useMasterData();
  const { currentUser, userRole } = useAuth();

  const [isDialogOpen, setDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | undefined>(undefined);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<Department[] | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const { toast } = useToast();
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('all');

  const userCompany = useMemo(() => {
    return companies.find(c => c.name === currentUser?.company);
  }, [companies, currentUser]);

  const manageableCompanies = useMemo(() => {
    if (userRole === 'superadmin') {
      return companies;
    }
    if (!userCompany) return [];
    
    if (userCompany.isHolding) {
      const getChildCompanies = (parentId: string): Company[] => {
        const children = companies.filter(c => c.parentId === parentId);
        return [...children, ...children.flatMap(c => getChildCompanies(c.id))];
      };
      return [userCompany, ...getChildCompanies(userCompany.id)];
    }
    return [userCompany];
  }, [userRole, companies, userCompany]);
  
  const manageableCompanyNames = useMemo(() => manageableCompanies.map(c => c.name), [manageableCompanies]);

  const filteredDepartments = useMemo(() => {
    let depts = departments.filter(d => manageableCompanyNames.includes(d.company));
    
    if (selectedCompanyFilter !== 'all') {
      depts = depts.filter(d => d.company === selectedCompanyFilter);
    }

    return depts;
  }, [departments, manageableCompanyNames, selectedCompanyFilter]);

  useEffect(() => {
    if (userRole !== 'superadmin' && manageableCompanies.length > 1) {
      setSelectedCompanyFilter('all');
    } else if (userRole !== 'superadmin' && manageableCompanies.length === 1) {
      setSelectedCompanyFilter(manageableCompanies[0].name);
    }
  }, [userRole, manageableCompanies]);

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked) {
      setSelectedRowIds(filteredDepartments.map(d => d.id));
    } else {
      setSelectedRowIds([]);
    }
  };

  const handleRowSelect = (rowId: string) => {
    setSelectedRowIds(prev =>
      prev.includes(rowId) ? prev.filter(id => id !== rowId) : [...prev, rowId]
    );
  };

  const openBulkDeleteDialog = () => {
    const itemsToDelete = departments.filter(d => selectedRowIds.includes(d.id));
    setDepartmentToDelete(itemsToDelete);
    setDeleteDialogOpen(true);
  };

  const handleAddItem = () => {
    setSelectedDepartment(undefined);
    setDialogOpen(true);
  };

  const handleEditItem = (item: Department) => {
    setSelectedDepartment(item);
    setDialogOpen(true);
  };

  const handleSaveItem = async (data: { name: string, company?: string }) => {
    const companyName = data.company;
    if (!companyName) {
        toast({ variant: "destructive", title: "Gagal Menyimpan", description: "Perusahaan harus dipilih." });
        return;
    }

    if (selectedDepartment) {
      await updateDepartment(selectedDepartment.id, { name: data.name, company: data.company });
    } else {
      await addDepartment({ name: data.name, company: companyName });
    }
  };

  const openDeleteDialog = (item: Department) => {
    setDepartmentToDelete([item]);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (departmentToDelete && departmentToDelete.length > 0) {
      const idsToDelete = departmentToDelete.map(d => d.id);
      await deleteDepartments(idsToDelete);
      toast({ title: "Data Dihapus", description: `${idsToDelete.length} data departemen telah berhasil dihapus.` });
      setDepartmentToDelete(null);
      setSelectedRowIds([]);
    }
  };

  const canShowCompanyFilter = manageableCompanies.length > 1;

  return (
    <div className="space-y-6">
      <Card className="shadow-lg mb-6 overflow-hidden">
        <CardHeader className="bg-primary text-primary-foreground dark:bg-card">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="font-headline text-lg sm:text-xl">Data Departemen</CardTitle>
              <CardDescription className="text-primary-foreground/80 dark:text-muted-foreground text-xs sm:text-sm">
                Kelola daftar departemen di perusahaan Anda. Menampilkan {filteredDepartments.length} data.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
                {selectedRowIds.length > 0 && (
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 gap-1 bg-background/20 text-primary-foreground hover:bg-background/30 dark:bg-muted dark:text-foreground dark:hover:bg-muted/80">
                            Aksi Massal ({selectedRowIds.length})
                            <ChevronDown className="ml-1 h-3.5 w-3.5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Pilih Aksi</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive font-bold" onClick={openBulkDeleteDialog}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Hapus Pilihan
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                )}
                <Button size="sm" className="h-9 gap-1 font-bold shadow-md" onClick={handleAddItem}>
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Tambah Departemen
                  </span>
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {canShowCompanyFilter && (
            <div className="mb-6 p-4 border rounded-lg bg-muted/30 max-w-xs">
              <Select value={selectedCompanyFilter} onValueChange={setSelectedCompanyFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter Perusahaan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Perusahaan</SelectItem>
                  {manageableCompanies.map(c => (
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
                        checked={selectedRowIds.length > 0 && filteredDepartments.length > 0 && selectedRowIds.length === filteredDepartments.length}
                        onCheckedChange={(checked) => handleSelectAll(checked)}
                        aria-label="Pilih semua"
                    />
                </TableHead>
                <TableHead>Nama Departemen</TableHead>
                {canShowCompanyFilter && <TableHead>Perusahaan</TableHead>}
                <TableHead>
                  <span className="sr-only">Aksi</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDepartments.map((department) => (
                <TableRow key={department.id} data-state={selectedRowIds.includes(department.id) && "selected"}>
                  <TableCell padding="checkbox">
                        <Checkbox
                            checked={selectedRowIds.includes(department.id)}
                            onCheckedChange={() => handleRowSelect(department.id)}
                            aria-label={`Pilih ${department.name}`}
                        />
                  </TableCell>
                  <TableCell className="font-medium py-4">
                     <div className="flex items-center gap-3">
                      <div className="hidden h-9 w-9 sm:flex items-center justify-center rounded-xl bg-primary/5 text-primary border border-primary/10">
                        <Network className="h-5 w-5" />
                      </div>
                       <span className="text-slate-900 font-bold">{department.name}</span>
                    </div>
                  </TableCell>
                  {canShowCompanyFilter && <TableCell className="text-sm text-slate-600">{department.company}</TableCell>}
                  <TableCell className="text-right">
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost" className="rounded-full">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Buka menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel className="text-[10px] font-black uppercase opacity-60">Opsi Departemen</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEditItem(department)}>Ubah Nama</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive font-bold" onClick={() => openDeleteDialog(department)}>Hapus Departemen</DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <NameFormDialog
        isOpen={isDialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveItem}
        itemType="Departemen"
        item={selectedDepartment}
        companies={manageableCompanies}
      />

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        itemName={departmentToDelete?.length === 1 ? departmentToDelete[0].name : `${departmentToDelete?.length} item`}
        itemType="departemen"
      />
    </div>
  );
}
