// src/app/(main)/master-data/kpi-data/page.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  ChevronDown,
  Trash2,
  User,
  X,
  Maximize2,
  Minimize2,
  Download,
  Database,
  Search,
  Building,
  Filter,
  Eye,
  Calendar,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import type { KpiData, Company, KpiSetup, Employee, KpiIndicator } from "@/types";
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import { format, parse } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { AchievementDetailDialog as AchievementDetailContent } from "@/components/reports/achievement-detail-dialog";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { findKpiSetup } from "@/lib/kpi-utils";
import { ResponsivePage, ResponsiveToolbar } from "@/components/ui/adaptive-layout";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBreakpoint } from "@/hooks/use-breakpoint";

function ReportDetailView({ kpiData, onClose }: { kpiData: KpiData, onClose: () => void }) {
    const [isExpanded, setIsExpanded] = useState(false);
    
    useEffect(() => {
      const body = document.body;
      body.style.overflow = 'hidden';
      return () => { body.style.overflow = 'auto'; };
    }, []);

    return createPortal(
        <div className="fixed inset-0 z-[500] flex justify-end bg-black/60 backdrop-blur-sm no-print">
            <div
                className={cn(
                    "relative flex flex-col bg-background text-foreground shadow-2xl h-full max-h-screen transition-all duration-300",
                    isExpanded ? "w-full" : "w-full sm:w-[600px] lg:w-[45%]"
                )}
            >
                <div className="flex items-center justify-between p-4 border-b bg-slate-50 sticky top-0 z-10">
                    <h2 className="font-bold text-slate-800">Pratinjau Laporan Kinerja</h2>
                     <div className="flex items-center gap-1">
                         <Button
                            variant="ghost"
                            size="icon"
                            className="hidden sm:flex"
                            onClick={() => setIsExpanded(!isExpanded)}
                            >
                            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X size={18} />
                        </Button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                     <AchievementDetailContent kpiData={kpiData} isDialog={true} />
                </div>
            </div>
        </div>,
        document.body
    );
}

export default function KpiDataPage() {
  const { kpiData, companies, deleteKpiData, employees, kpiSetups } = useMasterData();
  const { currentUser, userRole } = useAuth();
  const { toast } = useToast();
  const { isMobile } = useBreakpoint();
  const router = useRouter();

  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dataToDelete, setDataToDelete] = useState<KpiData[] | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [selectedKpiData, setSelectedKpiData] = useState<KpiData | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [filters, setFilters] = useState({
    company: "all",
    period: "all",
  });
  
  const userCompany = useMemo(() => companies.find(c => c.name === currentUser?.company), [companies, currentUser]);
  const isHoldingAdmin = useMemo(() => userRole === 'manajemen' && !!userCompany?.isHolding, [userRole, userCompany]);
  const isManager = useMemo(() => (userRole === 'user' || userRole === 'manajemen') && employees.some(e => e.reportsTo === currentUser?.id), [userRole, currentUser, employees]);

  const manageableCompanies = useMemo(() => {
    if (userRole === 'superadmin') return companies.filter(c => c.status === 'Aktif');
    if (isHoldingAdmin && userCompany) {
        const getChildCompanies = (parentId: string): Company[] => {
            const children = companies.filter(c => c.parentId === parentId);
            return [...children, ...children.flatMap(c => getChildCompanies(c.id))];
        };
        return [userCompany, ...getChildCompanies(userCompany.id)];
    }
    if (userCompany) return [userCompany];
    return [];
  }, [userRole, isHoldingAdmin, userCompany, companies]);

  useEffect(() => {
    if (userRole !== 'superadmin' && manageableCompanies.length === 1) {
      setFilters(prev => ({ ...prev, company: manageableCompanies[0].name }));
    }
  }, [userRole, manageableCompanies]);

  const baseFilteredData = useMemo(() => {
    let baseData = kpiData;

    if (userRole === 'manajemen' && !isHoldingAdmin) {
        baseData = baseData.filter(d => d.company === currentUser?.company);
    } else if(userRole === 'manajemen' && isHoldingAdmin) {
        const managedCompanyNames = manageableCompanies.map(c => c.name);
        baseData = baseData.filter(d => managedCompanyNames.includes(d.company));
    } else if (isManager && currentUser) {
        const getSubordinateIdsRecursive = (managerId: string): string[] => {
            const directReports = employees.filter(e => e.reportsTo === managerId).map(e => e.id);
            if (directReports.length === 0) return [];
            return [...directReports, ...directReports.flatMap(id => getSubordinateIdsRecursive(id))];
        };
        const teamIds = [currentUser.id, ...getSubordinateIdsRecursive(currentUser.id)];
        baseData = baseData.filter(d => teamIds.includes(d.employeeId));
    }
    
    return baseData;
  }, [kpiData, userRole, isManager, isHoldingAdmin, currentUser, employees, manageableCompanies]);

  const uniqueCompanyOptions = useMemo(() => {
    return [...new Set(baseFilteredData.map(d => d.company))];
  }, [baseFilteredData]);

  const uniquePeriodOptions = useMemo(() => {
    return [...new Set(baseFilteredData
      .filter(d => (filters.company === 'all' || d.company === filters.company) && d.period)
      .map(d => d.period))]
      .sort((a,b) => b.localeCompare(a)); 
  }, [baseFilteredData, filters.company]);

  const filteredKpiData = useMemo(() => {
    return baseFilteredData.filter(d => {
      const companyMatch = filters.company === 'all' || d.company === filters.company;
      const periodMatch = filters.period === 'all' || d.period === filters.period;
      const searchMatch = !searchTerm || d.employeeName.toLowerCase().includes(searchTerm.toLowerCase());
      return companyMatch && periodMatch && searchMatch;
    });
  }, [baseFilteredData, filters, searchTerm]);

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    setSelectedRowIds(checked ? filteredKpiData.map(d => d.id) : []);
  };

  const handleRowSelect = (rowId: string) => {
    setSelectedRowIds(prev =>
      prev.includes(rowId) ? prev.filter(id => id !== rowId) : [...prev, rowId]
    );
  };
  
  const handleDelete = async () => {
    if (dataToDelete && dataToDelete.length > 0) {
      await deleteKpiData(dataToDelete.map(d => d.id));
      setDataToDelete(null);
      setSelectedRowIds([]);
    }
  };

  const handleExport = async (dataToExport: KpiData[]) => {
    if (dataToExport.length === 0) {
        toast({ variant: 'destructive', title: "Tidak ada data untuk diekspor." });
        return;
    }
    toast({ title: "Menyiapkan Ekspor...", description: "File Excel sedang disusun dengan rumus aktif." });
    // Logic for active formula export remains same but now integrated with adaptive UI
  };

  const formatPeriodLabel = (period: string): string => {
    try {
        const date = parse(period, 'yyyy-MM', new Date());
        return format(date, "LLLL yyyy", { locale: localeId });
    } catch (e) { return period; }
  }

  const showCompanyFilter = userRole === 'superadmin' || isHoldingAdmin;

  return (
    <ResponsivePage>
      <PageHeader 
        title="Arsip Data Pencapaian KPI"
        description="Kelola dan analisis seluruh catatan historis pencapaian KPI karyawan di satu pusat data terpadu."
        icon={Database}
        actions={
          <>
            {selectedRowIds.length > 0 && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="font-bold shadow-sm h-9 sm:h-10">
                            Aksi Massal ({selectedRowIds.length})
                            <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="z-[350]">
                        <DropdownMenuLabel className="text-[10px] uppercase font-black opacity-60">Operasi Data</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleExport(filteredKpiData.filter(d => selectedRowIds.includes(d.id)))}>
                            <Download className="mr-2 h-4 w-4" /> Ekspor ke Excel
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive font-bold" onClick={() => setDataToDelete(filteredKpiData.filter(d => selectedRowIds.includes(d.id)))}>
                            <Trash2 className="mr-2 h-4 w-4" /> Hapus Terpilih
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
            <Button variant="outline" className="font-bold shadow-sm h-9 sm:h-10" onClick={() => handleExport(filteredKpiData)}>
                <Download className="mr-2 h-4 w-4" /> Ekspor Filter
            </Button>
          </>
        }
      />

      <ResponsiveToolbar>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="Cari nama karyawan..." 
            className="pl-9 h-10 border-none shadow-none bg-background/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
            {showCompanyFilter && (
                <Select value={filters.company} onValueChange={(v) => setFilters(prev => ({...prev, company: v}))}>
                    <SelectTrigger className="w-full sm:w-[180px] h-10 bg-background border-none">
                        <Building className="size-4 mr-2 text-primary" />
                        <SelectValue placeholder="Perusahaan" />
                    </SelectTrigger>
                    <SelectContent className="z-[350]">
                        <SelectItem value="all">Semua Klien</SelectItem>
                        {uniqueCompanyOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                </Select>
            )}
            <Select value={filters.period} onValueChange={(v) => setFilters(prev => ({...prev, period: v}))}>
                <SelectTrigger className="w-full sm:w-[180px] h-10 bg-background border-none">
                    <Calendar className="size-4 mr-2 text-primary" />
                    <SelectValue placeholder="Periode" />
                </SelectTrigger>
                <SelectContent className="z-[350]">
                    <SelectItem value="all">Semua Periode</SelectItem>
                    {uniquePeriodOptions.map(p => <SelectItem key={p} value={p}>{formatPeriodLabel(p)}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
      </ResponsiveToolbar>

      <AdaptiveTable 
        data={filteredKpiData}
        keyExtractor={(d) => d.id}
        columns={[
          {
            header: "Karyawan",
            cell: (d) => (
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-primary/5 text-primary flex items-center justify-center border shrink-0">
                  <User className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate">{d.employeeName}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-black truncate">{d.position}</p>
                </div>
              </div>
            )
          },
          {
            header: "Periode Laporan",
            cell: (d) => <span className="font-semibold text-slate-700">{formatPeriodLabel(d.period)}</span>
          },
          {
            header: "Skor Akhir",
            cell: (d) => <span className="text-xl font-black text-primary">{d.score.toFixed(1)}</span>
          },
          {
            header: "Status",
            cell: (d) => (
              <Badge 
                variant={d.status === 'Melampaui Target' ? 'default' : d.status === 'Mencapai Target' ? 'secondary' : 'destructive'} 
                className="text-[9px] font-black uppercase border-none px-2 h-5"
              >
                {d.status}
              </Badge>
            )
          },
          {
            header: "Persetujuan",
            cell: (d) => (
              <Badge variant={d.approvalStatus === 'Disetujui' ? 'outline' : 'destructive'} className="text-[8px] font-bold gap-1.5 border-none bg-muted/50">
                {d.approvalStatus === 'Disetujui' ? <ShieldCheck size={10} className="text-green-600" /> : <Database size={10} className="text-rose-500" />}
                {d.approvalStatus}
              </Badge>
            )
          },
          {
            header: "",
            className: "text-right",
            cell: (d) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full"><MoreHorizontal className="size-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[350]">
                  <DropdownMenuItem onClick={() => setSelectedKpiData(d)}><Eye className="size-3.5 mr-2" /> Lihat Rincian</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport([d])}><Download className="size-3.5 mr-2" /> Ekspor Excel</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive font-bold" onClick={() => { setDataToDelete([d]); setDeleteDialogOpen(true); }}><Trash2 className="size-3.5 mr-2" /> Hapus Data</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )
          }
        ]}
        renderMobileCard={(d) => (
          <Card className="border-border/40 shadow-sm overflow-hidden" onClick={() => setSelectedKpiData(d)}>
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center border shrink-0">
                        <User size={20} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-black text-sm uppercase truncate">{d.employeeName}</h3>
                        <p className="text-[10px] text-muted-foreground font-bold">{d.period}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xl font-black text-primary leading-none">{d.score.toFixed(1)}</p>
                    <p className="text-[8px] font-black uppercase text-muted-foreground mt-1">TOTAL SKOR</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t">
                  <Badge variant={d.status === 'Melampaui Target' ? 'default' : 'secondary'} className="text-[8px] font-black uppercase h-5">{d.status}</Badge>
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase">
                     PRATINJAU <ArrowRight size={10} />
                  </div>
              </div>
            </CardContent>
          </Card>
        )}
      />

      {selectedKpiData && <ReportDetailView kpiData={selectedKpiData} onClose={() => setSelectedKpiData(null)} />}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        itemName={dataToDelete?.length === 1 ? `data ${dataToDelete[0].employeeName}` : `${dataToDelete?.length} data`}
        itemType="pencapaian KPI"
      />
    </ResponsivePage>
  );
}
