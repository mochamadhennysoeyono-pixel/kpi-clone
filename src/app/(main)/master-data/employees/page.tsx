// src/app/(main)/master-data/employees/page.tsx
"use client";

import { useState, useMemo, useRef } from "react";
import { 
    Users, PlusCircle, Search, Filter, Building, 
    MoreHorizontal, Pencil, ShieldCheck, Zap, 
    Trash2, Send, Loader2, Mail, Briefcase, Network, ChevronDown
} from "lucide-react";
import { 
    ResponsivePage, 
    ResponsiveToolbar 
} from "@/components/ui/adaptive-layout";
import { PageHeader } from "@/components/ui/page-header";
import { AdaptiveTable } from "@/components/ui/adaptive-table";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { EmployeeFormSheet } from "@/components/master-data/employees/employee-form-sheet";
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Employee } from "@/types";
import { Card, CardContent } from "@/components/ui/card";

export default function EmployeesPage() {
  const { employees, companies, departments, positions, deleteEmployees, fetchData } = useMasterData();
  const { currentUser, userRole, sendPasswordReset, setIsLoading } = useAuth();
  const { toast } = useToast();
  const { isMobile } = useBreakpoint();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCompany, setFilterCompany] = useState("all");
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | undefined>(undefined);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeesToDelete, setEmployeesToDelete] = useState<Employee[] | null>(null);

  // --- Scoping Logic ---
  const filteredEmployees = useMemo(() => {
    let result = employees.filter(e => e.role !== 'superadmin');
    
    if (filterCompany !== "all") {
        result = result.filter(e => e.company === filterCompany);
    }
    
    if (searchTerm) {
        result = result.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, filterCompany, searchTerm]);

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setSheetOpen(true);
  };

  const handleSendReset = async (email: string, name: string) => {
    const result = await sendPasswordReset(email, name);
    if (result.success) toast({ title: "Email Terkirim" });
  };

  const openDeleteDialog = (employee: Employee) => {
    setEmployeesToDelete([employee]);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!employeesToDelete) return;
    setIsLoading(true);
    try {
        await deleteEmployees(employeesToDelete.map(e => e.id));
        setDeleteDialogOpen(false);
        fetchData(true);
    } catch (e: any) {
        toast({ variant: 'destructive', title: "Gagal Menghapus", description: e.message });
    } finally {
        setIsLoading(false);
    }
  };

  // --- REUSABLE ADAPTIVE COMPONENTS USAGE ---
  return (
    <ResponsivePage>
      <PageHeader 
        title="Manajemen Karyawan"
        description="Kelola profil personil, penempatan, dan akses modul secara terpusat."
        icon={Users}
        actions={
          <Button onClick={() => { setSelectedEmployee(undefined); setSheetOpen(true); }} className="font-bold shadow-lg h-9 sm:h-10">
            <PlusCircle className="size-4" />
            Tambah Karyawan
          </Button>
        }
      />

      <ResponsiveToolbar>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="Cari nama karyawan..." 
            className="pl-9 h-10 border-none shadow-none bg-background/50 focus-visible:ring-primary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
            <Select value={filterCompany} onValueChange={setFilterCompany}>
                <SelectTrigger className="w-full sm:w-[200px] h-9 bg-background border-none text-[11px] font-black uppercase tracking-tight">
                    <Building className="size-3.5 mr-2 text-primary" />
                    <SelectValue placeholder="Semua Perusahaan" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Semua Perusahaan</SelectItem>
                    {companies.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
      </ResponsiveToolbar>

      <AdaptiveTable 
        data={filteredEmployees}
        keyExtractor={(e) => e.id}
        columns={[
          {
            header: "Karyawan",
            cell: (e) => (
              <div className="flex items-center gap-3">
                <Avatar className="size-9 border shadow-sm shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-black uppercase">
                    {e.name.substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 truncate">{e.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-medium truncate">{e.email}</p>
                </div>
              </div>
            )
          },
          {
            header: "Posisi & Dept",
            accessorKey: "position",
            hideOnTablet: true,
            cell: (e) => (
              <div className="space-y-0.5">
                <p className="font-bold text-xs">{e.position}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tight">{e.department}</p>
              </div>
            )
          },
          {
             header: "Perusahaan",
             accessorKey: "company",
             className: "font-medium text-xs",
          },
          {
            header: "Status",
            cell: (e) => (
              <Badge variant={e.status === 'Aktif' ? 'default' : 'outline'} className="text-[9px] uppercase font-black h-5 border-none">
                {e.status}
              </Badge>
            )
          },
          {
            header: "",
            className: "text-right",
            cell: (e) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full"><MoreHorizontal className="size-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                   <DropdownMenuItem onClick={() => handleEdit(e)}><Pencil className="size-3.5 mr-2" />Ubah</DropdownMenuItem>
                   <DropdownMenuItem onClick={() => handleSendReset(e.email, e.name)}><Send className="size-3.5 mr-2" />Kirim Reset Sandi</DropdownMenuItem>
                   <DropdownMenuSeparator />
                   <DropdownMenuItem onClick={() => openDeleteDialog(e)} className="text-destructive font-bold"><Trash2 className="size-3.5 mr-2" />Hapus</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )
          }
        ]}
        renderMobileCard={(e) => (
          <Card className="border-border/40 shadow-sm overflow-hidden">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="size-12 border-2 border-primary/10 shadow-sm">
                  <AvatarFallback className="bg-primary/5 text-primary text-xs font-black uppercase">{e.name.substring(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                   <h3 className="font-black text-base truncate">{e.name}</h3>
                   <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[8px] font-black uppercase h-4 bg-muted/50 border-none">{e.level}</Badge>
                      <Badge variant={e.status === 'Aktif' ? 'default' : 'outline'} className="text-[8px] font-black uppercase h-4 border-none">{e.status}</Badge>
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-3 pt-3 border-t text-[11px] font-bold">
                  <div className="space-y-1">
                      <p className="text-muted-foreground uppercase text-[8px] tracking-widest">Jabatan</p>
                      <div className="flex items-center gap-1.5"><Briefcase className="size-3 text-primary" /> {e.position}</div>
                  </div>
                  <div className="space-y-1">
                      <p className="text-muted-foreground uppercase text-[8px] tracking-widest">Departemen</p>
                      <div className="flex items-center gap-1.5"><Network className="size-3 text-primary" /> {e.department}</div>
                  </div>
                  <div className="col-span-2 space-y-1">
                      <p className="text-muted-foreground uppercase text-[8px] tracking-widest">Email</p>
                      <div className="flex items-center gap-1.5"><Mail className="size-3 text-primary" /> {e.email}</div>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" className="font-bold text-[10px] h-9 gap-2" onClick={() => handleEdit(e)}>
                      <Pencil className="size-3" /> UBAH DATA
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="font-bold text-[10px] h-9">AKSI LAIN <ChevronDown className="size-3 ml-1" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[180px]">
                      <DropdownMenuItem onClick={() => handleSendReset(e.email, e.name)}>Kirim Reset Sandi</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive font-bold" onClick={() => openDeleteDialog(e)}>Hapus Akun</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        )}
      />

      <EmployeeFormSheet 
        isOpen={isSheetOpen}
        onOpenChange={setSheetOpen}
        employee={selectedEmployee}
        onAdd={() => { fetchData(true); }}
        onSave={() => { fetchData(true); }}
        quotaInfo={null}
      />

      <DeleteConfirmationDialog 
        isOpen={isDeleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        itemName={employeesToDelete?.[0]?.name || ""}
        itemType="Karyawan"
      />
    </ResponsivePage>
  );
}
