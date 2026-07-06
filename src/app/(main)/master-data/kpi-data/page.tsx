
// src/app/(main)/master-data/kpi-data/page.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  MoreHorizontal,
  X,
  Minimize2,
  Maximize2,
  Database,
  Search,
  Building,
  Eye,
  Calendar,
  Trash2,
} from "lucide-react";
import type { KpiData } from "@/types";
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import { AchievementDetailDialog as AchievementDetailContent } from "@/components/reports/achievement-detail-dialog";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
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
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KpiNavigator } from "@/components/layout/dashboard-navigator";

function ReportDetailView({ kpiData, onClose }: { kpiData: KpiData, onClose: () => void }) {
    const [isExpanded, setIsExpanded] = useState(false);
    useEffect(() => {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = 'auto'; };
    }, []);
    return createPortal(
        <div className="fixed inset-0 z-[500] flex justify-end bg-black/60 backdrop-blur-sm no-print">
            <div className={cn("relative flex flex-col bg-background text-foreground shadow-2xl h-full max-h-screen transition-all duration-300", isExpanded ? "w-full" : "w-full sm:w-[600px] lg:w-[45%]")}>
                <div className="flex items-center justify-between p-4 border-b bg-slate-50 sticky top-0 z-10">
                    <h2 className="font-bold text-slate-800">Pratinjau Laporan</h2>
                     <div className="flex items-center gap-1">
                         <Button variant="ghost" size="icon" className="hidden sm:flex" onClick={() => setIsExpanded(!isExpanded)}>{isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</Button>
                        <Button variant="ghost" size="icon" onClick={onClose}><X size={18} /></Button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto"><AchievementDetailContent kpiData={kpiData} isDialog={true} /></div>
            </div>
        </div>,
        document.body
    );
}

export default function KpiDataPage() {
  const { kpiData, companies, deleteKpiData } = useMasterData();
  const { currentUser, userRole } = useAuth();
  const [dataToDelete, setDataToDelete] = useState<KpiData[] | null>(null);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedKpiData, setSelectedKpiData] = useState<KpiData | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ company: "all", period: "all" });
  
  const userCompany = useMemo(() => companies.find(c => c.name === currentUser?.company), [companies, currentUser]);
  const isHoldingAdmin = useMemo(() => userRole === 'manajemen' && !!userCompany?.isHolding, [userRole, userCompany]);

  const baseFilteredData = useMemo(() => {
    let data = kpiData;
    if (userRole === 'manajemen' && !isHoldingAdmin) data = data.filter(d => d.company === currentUser?.company);
    else if(userRole === 'manajemen' && isHoldingAdmin) {
        const managed = [userCompany!.name, ...companies.filter(c => c.parentId === userCompany!.id).map(c => c.name)];
        data = data.filter(d => managed.includes(d.company));
    }
    return data;
  }, [kpiData, userRole, isHoldingAdmin, userCompany, companies, currentUser]);

  const uniqueCompanyOptions = useMemo(() => [...new Set(baseFilteredData.map(d => d.company))], [baseFilteredData]);
  const uniquePeriodOptions = useMemo(() => [...new Set(baseFilteredData.filter(d => (filters.company === 'all' || d.company === filters.company) && d.period).map(d => d.period))].sort().reverse(), [baseFilteredData, filters.company]);

  const filteredKpiData = useMemo(() => {
    return baseFilteredData.filter(d => {
      const cMatch = filters.company === 'all' || d.company === filters.company;
      const pMatch = filters.period === 'all' || d.period === filters.period;
      const sMatch = !searchTerm || d.employeeName.toLowerCase().includes(searchTerm.toLowerCase());
      return cMatch && pMatch && sMatch;
    });
  }, [baseFilteredData, filters, searchTerm]);

  return (
    <ResponsivePage>
      <PageHeader title="Arsip Data KPI" description="Pusat penyimpanan permanen seluruh catatan histori capaian kinerja karyawan." icon={Database} />
      
      <KpiNavigator />

      <ResponsiveToolbar>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Cari nama karyawan..." className="pl-9 h-10 border-none bg-background/50 shadow-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
            {(userRole === 'superadmin' || isHoldingAdmin) && (
                <Select value={filters.company} onValueChange={(v) => setFilters(prev => ({...prev, company: v}))}>
                    <SelectTrigger className="w-full sm:w-[200px] h-10 bg-background border-none"><Building size={14} className="mr-2 text-primary" /><SelectValue placeholder="Perusahaan" /></SelectTrigger>
                    <SelectContent className="z-[350]"><SelectItem value="all">Semua Klien</SelectItem>{uniqueCompanyOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
            )}
            <Select value={filters.period} onValueChange={(v) => setFilters(prev => ({...prev, period: v}))}>
                <SelectTrigger className="w-full sm:w-[180px] h-10 bg-background border-none"><Calendar size={14} className="mr-2 text-primary" /><SelectValue placeholder="Periode" /></SelectTrigger>
                <SelectContent className="z-[350]"><SelectItem value="all">Semua Periode</SelectItem>{uniquePeriodOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
        </div>
      </ResponsiveToolbar>

      <AdaptiveTable 
        data={filteredKpiData}
        keyExtractor={(d) => d.id}
        columns={[
          { header: "Karyawan", cell: (d) => (<div className="min-w-0"><p className="font-bold text-slate-900 truncate">{d.employeeName}</p><p className="text-[10px] text-muted-foreground uppercase font-black">{d.position}</p></div>)},
          { header: "Periode", accessorKey: "period", className: "font-semibold" },
          { header: "Skor", cell: (d) => <span className="text-xl font-black text-primary">{d.score.toFixed(1)}</span> },
          { header: "Persetujuan", cell: (d) => <Badge variant={d.approvalStatus === 'Disetujui' ? 'outline' : 'destructive'} className="text-[8px] font-bold border-none bg-muted/50">{d.approvalStatus}</Badge> },
          { header: "", className: "text-right", cell: (d) => (
              <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-full"><MoreHorizontal size={4} /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[350]">
                  <DropdownMenuItem onClick={() => setSelectedKpiData(d)}><Eye className="size-3.5 mr-2" /> Lihat Rincian</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive font-bold" onClick={() => { setDataToDelete([d]); setDeleteDialogOpen(true); }}><Trash2 className="size-3.5 mr-2" /> Hapus Data</DropdownMenuItem>
                </DropdownMenuContent></DropdownMenu>
          )}
        ]}
        renderMobileCard={(d) => (
          <Card className="border-border/40 shadow-sm overflow-hidden bg-background">
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-start">
                <div className="min-w-0"><h3 className="font-black text-sm uppercase truncate">{d.employeeName}</h3><p className="text-[10px] text-muted-foreground font-bold">{d.period}</p></div>
                <div className="text-right"><p className="text-xl font-black text-primary leading-none">{d.score.toFixed(1)}</p><p className="text-[8px] font-black uppercase text-muted-foreground mt-1">TOTAL SKOR</p></div>
              </div>
              <div className="flex gap-2 pt-3 border-t">
                  <Button variant="outline" size="sm" className="flex-1 font-bold text-[9px] uppercase h-8" onClick={() => setSelectedKpiData(d)}>LIHAT DETAIL</Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 text-destructive" onClick={() => { setDataToDelete([d]); setDeleteDialogOpen(true); }}><Trash2 size={16}/></Button>
              </div>
            </CardContent>
          </Card>
        )}
      />

      {selectedKpiData && <ReportDetailView kpiData={selectedKpiData} onClose={() => setSelectedKpiData(null)} />}
      <DeleteConfirmationDialog isOpen={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={async () => { if(dataToDelete) await deleteKpiData(dataToDelete.map(d => d.id)); setDataToDelete(null); }} itemName={dataToDelete?.length === 1 ? `data ${dataToDelete[0].employeeName}` : 'beberapa data'} itemType="arsip data" />
    </ResponsivePage>
  );
}
