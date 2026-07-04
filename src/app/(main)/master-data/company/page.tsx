// src/app/(main)/master-data/company/page.tsx
"use client";

import { useState, useMemo } from "react";
import Link from 'next/link';
import {
  PlusCircle,
  MoreHorizontal,
  Building,
  Trash2,
  Search,
  Crown,
  Users,
  Eye,
  Pencil,
  GitMerge,
  Filter,
  CheckCircle2,
  AlertCircle,
  ShieldCheck
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
import { 
    AdaptiveCardGrid, 
    AdaptiveMetricCard 
} from "@/components/ui/adaptive-card";
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
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // --- Filtering Logic ---
  const filteredCompanies = useMemo(() => {
    return companies.filter(company => {
      const nameMatch = company.name.toLowerCase().includes(searchTerm.toLowerCase());
      const statusMatch = statusFilter === 'all' || company.status === statusFilter;
      return nameMatch && statusMatch;
    });
  }, [companies, searchTerm, statusFilter]);

  // --- Statistics Logic ---
  const stats = useMemo(() => {
    const total = companies.length;
    const active = companies.filter(c => c.status === 'Aktif').length;
    const holding = companies.filter(c => c.isHolding).length;
    return { total, active, holding };
  }, [companies]);

  const companyUsage = useMemo(() => {
    const usageMap = new Map<string, { userCount: number; managementCount: number }>();
    companies.forEach(company => {
        const userCount = employees.filter(e => e.company === company.name && e.role === 'user').length;
        const managementCount = employees.filter(e => e.company === company.name && e.role === 'manajemen').length;
        usageMap.set(company.id, { userCount, managementCount });
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
  };

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
        description="Kelola seluruh profil klien, jaring struktur holding, dan pemantauan utilisasi kuota sistem secara terpusat."
        icon={Building}
        actions={
          <Button onClick={() => { setSelectedCompany(undefined); setSheetOpen(true); }} className="font-bold shadow-lg h-9 sm:h-10 active:scale-95 transition-all">
            <PlusCircle className="size-4" />
            Tambah Perusahaan
          </Button>
        }
      />

      <AdaptiveCardGrid complexity="simple">
        <AdaptiveMetricCard 
            title="Total Klien"
            value={stats.total}
            icon={Building}
            color="bg-primary/10 text-primary"
        />
        <AdaptiveMetricCard 
            title="Unit Aktif"
            value={stats.active}
            icon={CheckCircle2}
            color="bg-emerald-500/10 text-emerald-600"
        />
        <AdaptiveMetricCard 
            title="Holding Company"
            value={stats.holding}
            icon={GitMerge}
            color="bg-blue-500/10 text-blue-600"
        />
      </AdaptiveCardGrid>

      <ResponsiveToolbar>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="Cari nama perusahaan atau bidang usaha..." 
            className="pl-9 h-10 border-none shadow-none bg-background/50 focus-visible:ring-primary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[200px] h-10 bg-background border-none shadow-sm text-[11px] font-black uppercase">
                    <Filter className="size-3.5 mr-2 text-primary" />
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="z-[350]">
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="Aktif">Unit Aktif</SelectItem>
                    <SelectItem value="Tidak Aktif">Nonaktif</SelectItem>
                    <SelectItem value="Menunggu Persetujuan">Pending</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </ResponsiveToolbar>

      <AdaptiveTable 
        data={filteredCompanies}
        keyExtractor={(c) => c.id}
        columns={[
          {
            header: "Klien & Industri",
            cell: (c) => (
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-primary/5 text-primary flex items-center justify-center border shrink-0">
                  {c.isHolding ? <GitMerge className="size-5" /> : <Building className="size-5" />}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate flex items-center gap-2">
                    {c.name}
                    {c.isHolding && <Badge variant="secondary" className="text-[8px] h-4 font-black bg-blue-100 text-blue-700 border-none">HOLDING</Badge>}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tight truncate">{c.businessField}</p>
                </div>
              </div>
            )
          },
          {
            header: "Koneksi Paket",
            cell: (c) => {
                const currentPlan = subscriptionPlans.find(p => p.id === c.subscriptionPlanId);
                return c.parentId ? (
                    <Badge variant="outline" className="text-[9px] gap-1 border-primary/20 text-primary uppercase font-bold"><GitMerge size={10}/> IKUT INDUK</Badge>
                ) : (
                    <Select value={c.subscriptionPlanId || 'none'} onValueChange={(v) => handlePlanChange(c, v)}>
                        <SelectTrigger className="h-8 text-[10px] font-black uppercase w-[150px] border-none bg-muted/50">
                            <SelectValue placeholder="Pilih Paket" />
                        </SelectTrigger>
                        <SelectContent className="z-[350]">
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
                        <div className="flex justify-between gap-4"><span>Staff:</span> <span className="text-slate-900">{usage.userCount}</span></div>
                        <div className="flex justify-between gap-4"><span>Admin:</span> <span className="text-slate-900">{usage.managementCount}</span></div>
                    </div>
                );
            }
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
            header: "",
            className: "text-right",
            cell: (c) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full"><MoreHorizontal className="size-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[350]">
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
                <Card className="border-border/40 shadow-sm overflow-hidden bg-background">
                    <CardContent className="p-4 space-y-4">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="size-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center border shrink-0">
                                    {c.isHolding ? <GitMerge size={20} /> : <Building size={20} />}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-black text-sm uppercase truncate text-slate-900">{c.name}</h3>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">{c.businessField}</p>
                                </div>
                            </div>
                            <Badge variant={c.status === 'Aktif' ? 'default' : 'outline'} className="text-[8px] font-black h-4 border-none">{c.status}</Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-dashed">
                            <div className="p-2 rounded-lg bg-muted/30 text-center">
                                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Karyawan</p>
                                <p className="text-sm font-black text-primary">{usage.userCount}</p>
                            </div>
                            <div className="p-2 rounded-lg bg-muted/30 text-center">
                                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Admin Unit</p>
                                <p className="text-sm font-black text-primary">{usage.managementCount}</p>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                             <Button asChild variant="outline" size="sm" className="flex-1 font-black text-[9px] h-9 shadow-sm">
                                <Link href={`/company-subscription-status/${c.id}`}>STATUS PAKET</Link>
                             </Button>
                             <Button variant="ghost" size="sm" className="flex-1 font-black text-[9px] h-9" onClick={() => handleEditCompany(c)}>UBAH PROFIL</Button>
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-9 w-9"><MoreHorizontal size={14}/></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="z-[350]">
                                    <DropdownMenuItem className="text-destructive font-bold" onClick={() => openDeleteDialog(c)}>Hapus Klien</DropdownMenuItem>
                                </DropdownMenuContent>
                             </DropdownMenu>
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
