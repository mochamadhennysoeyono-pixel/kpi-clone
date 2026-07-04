
// src/app/(main)/master-data/departments/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import {
  PlusCircle,
  MoreHorizontal,
  Network,
  Trash2,
  Search,
  Building,
  Filter,
  Pencil,
} from "lucide-react";
import type { Department, Company } from "@/types";
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";
import { useMasterData } from "@/contexts/master-data-context";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { 
    ResponsivePage, 
    ResponsiveToolbar 
} from "@/components/ui/adaptive-layout";
import { PageHeader } from "@/components/ui/page-header";
import { AdaptiveTable } from "@/components/ui/adaptive-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

const nameSchema = z.object({
  name: z.string().min(1, "Nama harus diisi"),
  company: z.string().min(1, "Perusahaan harus dipilih"),
});

type NameFormValues = z.infer<typeof nameSchema>;

function NameFormDialog({ isOpen, onOpenChange, onSave, item, companies }: { isOpen: boolean, onOpenChange: (o: boolean) => void, onSave: (d: any) => void, item?: Department, companies: Company[] }) {
  const { userRole, currentUser } = useAuth();
  const form = useForm<NameFormValues>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: '', company: '' },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: item?.name || '',
        company: item?.company || (userRole !== 'superadmin' ? currentUser?.company : ''),
      });
    }
  }, [isOpen, item, form, userRole, currentUser]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSave)}>
            <DialogHeader>
              <DialogTitle>{item ? "Ubah Departemen" : "Tambah Departemen Baru"}</DialogTitle>
              <DialogDescription>Lengkapi rincian departemen di bawah ini.</DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-4">
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Perusahaan</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!!item}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Pilih perusahaan" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {companies.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Departemen</FormLabel>
                    <FormControl><Input placeholder="cth., Sales & Marketing" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Batal</Button></DialogClose>
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
  const { toast } = useToast();

  const [isDialogOpen, setDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | undefined>(undefined);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('all');

  const manageableCompanies = useMemo(() => {
    if (userRole === 'superadmin') return companies.filter(c => c.status === 'Aktif');
    const userCompany = companies.find(c => c.name === currentUser?.company);
    if (!userCompany) return [];
    if (userCompany.isHolding) {
      const getChildren = (id: string): Company[] => {
        const childs = companies.filter(c => c.parentId === id);
        return [...childs, ...childs.flatMap(c => getChildren(c.id))];
      };
      return [userCompany, ...getChildren(userCompany.id)].filter(c => c.status === 'Aktif');
    }
    return [userCompany];
  }, [userRole, companies, currentUser]);

  const filteredDepartments = useMemo(() => {
    const manageableNames = new Set(manageableCompanies.map(c => c.name));
    return departments.filter(d => 
        manageableNames.has(d.company) &&
        (selectedCompanyFilter === 'all' || d.company === selectedCompanyFilter) &&
        (d.name.toLowerCase().includes(searchTerm.toLowerCase()))
    ).sort((a,b) => a.name.localeCompare(b.name));
  }, [departments, manageableCompanies, selectedCompanyFilter, searchTerm]);

  const handleSaveItem = async (data: NameFormValues) => {
    if (selectedDepartment) {
      await updateDepartment(selectedDepartment.id, data);
    } else {
      await addDepartment(data);
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (departmentToDelete) {
      await deleteDepartments([departmentToDelete.id]);
      setDepartmentToDelete(null);
    }
  };

  return (
    <ResponsivePage>
      <PageHeader 
        title="Daftar Departemen"
        description="Kelola struktur departemen untuk pengelompokan karyawan dan target KPI."
        icon={Network}
        actions={
          <Button onClick={() => { setSelectedDepartment(undefined); setDialogOpen(true); }} className="font-bold shadow-lg h-9 sm:h-10">
            <PlusCircle className="size-4" />
            Tambah Departemen
          </Button>
        }
      />

      <ResponsiveToolbar>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="Cari departemen..." 
            className="pl-9 h-10 border-none shadow-none bg-background/50 focus-visible:ring-primary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
            <Select value={selectedCompanyFilter} onValueChange={setSelectedCompanyFilter}>
                <SelectTrigger className="w-full sm:w-[200px] h-10 bg-background border-none">
                    <Building className="size-4 mr-2 text-primary" />
                    <SelectValue placeholder="Semua Perusahaan" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Semua Perusahaan</SelectItem>
                    {manageableCompanies.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
      </ResponsiveToolbar>

      <AdaptiveTable 
        data={filteredDepartments}
        keyExtractor={(d) => d.id}
        columns={[
          {
            header: "Nama Departemen",
            cell: (d) => (
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-primary/5 text-primary flex items-center justify-center border shrink-0">
                  <Network className="size-5" />
                </div>
                <span className="font-bold text-slate-900">{d.name}</span>
              </div>
            )
          },
          {
             header: "Perusahaan",
             accessorKey: "company",
             className: "text-slate-600 font-medium",
          },
          {
            header: "",
            className: "text-right",
            cell: (d) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full"><MoreHorizontal className="size-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setSelectedDepartment(d); setDialogOpen(true); }}>
                    <Pencil className="size-3.5 mr-2" /> Ubah Nama
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive font-bold" onClick={() => { setDepartmentToDelete(d); setDeleteDialogOpen(true); }}>
                    <Trash2 className="size-3.5 mr-2" /> Hapus
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )
          }
        ]}
        renderMobileCard={(d) => (
          <Card className="border-border/40 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="size-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center border shrink-0">
                        <Network size={20} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-black text-sm uppercase truncate">{d.name}</h3>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">{d.company}</p>
                    </div>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full"><MoreHorizontal className="size-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelectedDepartment(d); setDialogOpen(true); }}>Ubah</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive font-bold" onClick={() => { setDepartmentToDelete(d); setDeleteDialogOpen(true); }}>Hapus</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardContent>
          </Card>
        )}
      />

      <NameFormDialog
        isOpen={isDialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveItem}
        item={selectedDepartment}
        companies={manageableCompanies}
      />

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        itemName={departmentToDelete?.name || ''}
        itemType="departemen"
      />
    </ResponsivePage>
  );
}
