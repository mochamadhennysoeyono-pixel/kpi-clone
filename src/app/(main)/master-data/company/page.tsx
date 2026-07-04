
// src/app/(main)/master-data/company/page.tsx
"use client";

import { useState, useMemo } from "react";
import Link from 'next/link';
import {
  PlusCircle,
  MoreHorizontal,
  Building,
  ChevronDown,
  Trash2,
  Search,
  Crown,
  Users,
  Eye,
  Sparkles,
  Pencil,
  GitMerge,
  Filter,
} from "lucide-react";
import type { Company } from "@/types";
import { CompanyFormSheet } from "@/components/master-data/company/company-form-sheet";
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";
import { useMasterData } from "@/contexts/master-data-context";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { 
    ResponsivePage, 
    ResponsiveToolbar 
} from "@/components/ui/adaptive-layout";
import { PageHeader } from "@/components/ui/page-header";
import { AdaptiveTable } from "@/components/ui/adaptive-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function CompanyPage() {
  const { companies, addCompany, updateCompany, deleteCompany, subscriptionPlans, employees } = useMasterData();
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | undefined>(undefined);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredCompanies = useMemo(() => {
    return companies.filter(company => {
      const nameMatch = company.name.toLowerCase().includes(searchTerm.toLowerCase());
      const statusMatch = statusFilter === 'all' || company.status === statusFilter;
      return nameMatch && statusMatch;
    });
  }, [companies, searchTerm, statusFilter]);

  const companyUsage = useMemo(() => {
    const usageMap = new Map<string, { userCount: number; managementCount: number; childCompanyCount: number }>();
    companies.forEach(company => {
        const userCount = employees.filter(e => e.company === company.name && e.role === 'user').length;
        const managementCount = employees.filter(e => e.company === company.name && e.role === 'manajemen').length;
        const childCompanyCount = company.isHolding ? companies.filter(c => c.parentId === company.id).length : 0;
        usageMap.set(company.id, { userCount, managementCount, childCompanyCount });
    });
    return usageMap;
  }, [companies, employees]);

  const handleEditCompany = (company: Company) => {
    setSelectedCompany(company);
    setSheetOpen(true);
  };

  const handleSaveCompany = async (companyData: Company) => {
    if (companyData.id) {
      await updateCompany(companyData.id, companyData);
    } else {
      await addCompany(companyData);
    }
  };

  const handlePlanChange = async (company: Company, planId: string) => {
    try {
        await updateCompany(company.id, { subscriptionPlanId: planId });
        toast({ title: "Paket Diperbarui" });
    } catch (e: any) {
        toast({ variant: "destructive", title: "Gagal", description: e.message });
    }
  }

  const openDeleteDialog = (company: Company) => {
    setCompanyToDelete(company);
    setDeleteDialogOpen(true);
  };

  const handleDeleteCompany = async () => {
    if (companyToDelete) {
      await deleteCompany(companyToDelete.id);
      setCompanyToDelete(null);
    }
  };

  return (
    <ResponsivePage>
      <PageHeader 
        title="Data Perusahaan Klien"
        description="Kelola data klien, status operasional, dan integrasi paket langganan secara global."
        icon={Building}
        actions={
          <Button onClick={() => { setSelectedCompany(undefined); setSheetOpen(true); }} className="font-bold shadow-lg h-9 sm:h-10">
            <PlusCircle className="size-4" />
            Tambah Perusahaan
          </Button>
        }
      />

      <ResponsiveToolbar>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="Cari nama perusahaan..." 
            className="pl-9 h-10 border-none shadow-none bg-background/50 focus-visible:ring-primary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px] h-10 bg-background border-none">
                    <Filter className="size-4 mr-2 text-primary" />
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="Aktif">Aktif</SelectItem>
                    <SelectItem value="Tidak Aktif">Tidak Aktif</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </ResponsiveToolbar>

      <AdaptiveTable 
        data={filteredCompanies}
        keyExtractor={(c) => c.id}
        columns={[
          {
            header: "Nama Perusahaan",
            cell: (c) => (
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-primary/5 text-primary flex items-center justify-center border shrink-0">
                  <Building className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate flex items-center gap-2">
                    {c.name}
                    {c.isHolding && <Badge variant="secondary" className="text-[8px] h-4 font-black">HOLDING</Badge>}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tight">{c.businessField}</p>
                </div>
              </div>
            )
          },
          {
            header: "Koneksi Paket",
            cell: (c) => {
                const currentPlan = subscriptionPlans.find(p => p.id === c.subscriptionPlanId);
                return c.parentId ? (
                    <Badge variant="outline" className="text-[9px] gap-1"><GitMerge size={10}/> IKUT INDUK</Badge>
                ) : (
                    <Select value={c.subscriptionPlanId || 'none'} onValueChange={(v) => handlePlanChange(c, v)}>
                        <SelectTrigger className="h-8 text-[10px] font-black uppercase w-[150px]">
                            <SelectValue placeholder="Pilih Paket" />
                        </SelectTrigger>
                        <SelectContent>
                            {subscriptionPlans.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                );
            }
          },
          {
            header: "Utilisasi Kuota",
            cell: (c) => {
                const usage = companyUsage.get(c.id) || { userCount: 0, managementCount: 0 };
                return (
                    <div className="text-[9px] font-black uppercase space-y-0.5 text-muted-foreground">
                        <div className="flex justify-between"><span>Staff:</span> <span className="text-primary">{usage.userCount}</span></div>
                        <div className="flex justify-between"><span>Admin:</span> <span className="text-primary">{usage.managementCount}</span></div>
                    </div>
                );
            }
          },
          {
            header: "Status",
            cell: (c) => (
              <Badge variant={c.status === 'Aktif' ? 'default' : 'outline'} className="text-[9px] uppercase font-black">
                {c.status}
              </Badge>
            )
          },
          {
            header: "",
            className: "text-right",
            cell: (c) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full"><MoreHorizontal className="size-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/company-subscription-status/${c.id}`} className="cursor-pointer">
                      <Eye className="size-3.5 mr-2" /> Detail Paket
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleEditCompany(c)}><Pencil className="size-3.5 mr-2" />Edit Profil</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive font-bold" onClick={() => openDeleteDialog(c)}><Trash2 className="size-3.5 mr-2" />Hapus</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )
          }
        ]}
        renderMobileCard={(c) => {
            const usage = companyUsage.get(c.id) || { userCount: 0, managementCount: 0 };
            return (
                <Card className="border-border/40 shadow-sm">
                    <CardContent className="p-4 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center border shrink-0">
                                <Building size={20} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="font-black text-sm uppercase truncate">{c.name}</h3>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold">{c.businessField}</p>
                            </div>
                            <Badge variant={c.status === 'Aktif' ? 'default' : 'outline'} className="text-[8px] font-black h-4">{c.status}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-3 border-t">
                            <div className="p-2 rounded-lg bg-muted/30 text-center">
                                <p className="text-[8px] font-black text-muted-foreground uppercase">Staff Terdaftar</p>
                                <p className="text-sm font-black text-primary">{usage.userCount}</p>
                            </div>
                            <div className="p-2 rounded-lg bg-muted/30 text-center">
                                <p className="text-[8px] font-black text-muted-foreground uppercase">Admin Aktif</p>
                                <p className="text-sm font-black text-primary">{usage.managementCount}</p>
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                             <Button asChild variant="outline" size="sm" className="flex-1 font-bold text-[10px] h-8">
                                <Link href={`/company-subscription-status/${c.id}`}>LOG PAKET</Link>
                             </Button>
                             <Button variant="ghost" size="sm" className="flex-1 font-bold text-[10px] h-8" onClick={() => handleEditCompany(c)}>EDIT</Button>
                        </div>
                    </CardContent>
                </Card>
            );
        }}
      />

      <CompanyFormSheet 
        isOpen={isSheetOpen} 
        onOpenChange={setSheetOpen} 
        company={selectedCompany} 
        onSave={handleSaveCompany}
      />
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteCompany}
        itemName={companyToDelete?.name || ''}
        itemType="perusahaan"
      />
    </ResponsivePage>
  );
}
