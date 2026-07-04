// src/app/(main)/setup-kpi/page.tsx
"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
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
import { PlusCircle, MoreHorizontal, ChevronDown, CalendarDays, BellRing, Settings, Building, Filter, Network, Briefcase } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { KpiSetup, Company, KpiIndicator, KpiIndicatorCycle } from '@/types';
import { KpiSetupSheet } from '@/components/setup-kpi/kpi-setup-sheet';
import { DeleteConfirmationDialog } from '@/components/master-data/delete-confirmation-dialog';
import { useMasterData } from '@/contexts/master-data-context';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import KpiBulkActions from '@/components/kpi/kpi-bulk-actions';

export default function SetupKpiPage() {
  const { kpiSetups, addKpiSetup, updateKpiSetup, deleteKpiSetup, companies, employees } = useMasterData();
  const { currentUser, userRole } = useAuth();
  const { toast } = useToast();

  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedPosition, setSelectedPosition] = useState<string>('all');
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [selectedSetup, setSelectedSetup] = useState<KpiSetup | undefined>(undefined);
  const [isCloning, setIsCloning] = useState(false);
  const [initialIndicators, setInitialIndicators] = useState<string[]>([]);

  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [setupToDelete, setSetupToDelete] = useState<KpiSetup | null>(null);
  
  const userCompany = useMemo(() => companies.find(c => c.name === currentUser?.company), [companies, currentUser]);
  const isHoldingAdmin = useMemo(() => userRole === 'manajemen' && !!userCompany?.isHolding, [userRole, userCompany]);

  const isManager = useMemo(() => {
    if (!currentUser || (userRole !== 'user' && userRole !== 'manajemen')) return false;
    return employees.some(e => e.reportsTo === currentUser.id);
  }, [currentUser, userRole, employees]);

  const manageableCompanies = useMemo(() => {
    if (userRole === 'superadmin') return companies.filter(c => c.status === 'Aktif');
    if (isHoldingAdmin && userCompany) {
        const getChildCompanies = (parentId: string): Company[] => {
            const children = companies.filter(c => c.parentId === parentId);
            return [...children, ...children.flatMap(c => getChildCompanies(c.id))];
        };
        return [userCompany, ...getChildCompanies(userCompany.id)];
    }
    return [];
  }, [userRole, isHoldingAdmin, userCompany, companies]);

  const showCompanyFilter = userRole === 'superadmin' || isHoldingAdmin;

  useEffect(() => {
    if (showCompanyFilter) {
      setSelectedCompanyFilter('all');
    } else if (currentUser?.company) {
      const userCompanyData = manageableCompanies.find(c => c.name === currentUser.company);
      if(userCompanyData) setSelectedCompanyFilter(userCompanyData.name);
    }
  }, [showCompanyFilter, currentUser, manageableCompanies]);

  const departmentOptions = useMemo(() => {
    if (!selectedCompanyFilter || selectedCompanyFilter === 'all') return [];
    return [...new Set(kpiSetups.filter(s => s.company === selectedCompanyFilter).map(s => s.department))].filter(Boolean);
  }, [kpiSetups, selectedCompanyFilter]);

  const positionOptions = useMemo(() => {
      if (!selectedDepartment || selectedDepartment === 'all') return [];
      return [...new Set(kpiSetups.filter(s => s.company === selectedCompanyFilter && s.department === selectedDepartment).map(s => s.position))].filter(Boolean);
  }, [kpiSetups, selectedCompanyFilter, selectedDepartment]);


  const filteredSetups = useMemo(() => {
    let setups = kpiSetups;
    
    if (selectedCompanyFilter !== 'all') {
      setups = setups.filter(s => s.company === selectedCompanyFilter);
    } else if (userRole === 'manajemen' && !isHoldingAdmin && currentUser?.company) {
       setups = setups.filter(s => s.company === currentUser.company);
    } else if (userRole === 'manajemen' && isHoldingAdmin) {
       const managedCompanyNames = manageableCompanies.map(c => c.name);
       setups = setups.filter(s => managedCompanyNames.includes(s.company));
    }

    if (selectedDepartment !== 'all') {
      setups = setups.filter(s => s.department === selectedDepartment);
    }
    if (selectedPosition !== 'all') {
        setups = setups.filter(s => s.position === selectedPosition);
    }

    if (isManager && userRole !== 'manajemen' && currentUser) {
      const subordinateIds = employees.filter(e => e.reportsTo === currentUser.id).map(e => e.id);
      const teamIds = [currentUser.id, ...subordinateIds];
      const teamMembers = employees.filter(e => teamIds.includes(e.id));
      
      const teamPositions = new Set(teamMembers.map(tm => tm.position));
      const teamDepartments = new Set(teamMembers.map(tm => tm.department));

      setups = setups.filter(s => 
        teamPositions.has(s.position) && teamDepartments.has(s.department)
      );
    }
    
    return setups.sort((a, b) => (b.validFrom || '').localeCompare(a.validFrom || ''));
  }, [kpiSetups, selectedCompanyFilter, selectedDepartment, selectedPosition, userRole, currentUser, isManager, isHoldingAdmin, employees, manageableCompanies]);


  const handleAddSetup = (indicators: string[] = []) => {
    setSelectedSetup(undefined);
    setIsCloning(false);
    setInitialIndicators(indicators);
    setSheetOpen(true);
  };
  
  const handleEditSetup = (setup: KpiSetup) => {
    setSelectedSetup(setup);
    setIsCloning(false);
    setInitialIndicators([]);
    setSheetOpen(true);
  };
  
  const handleDuplicateSetup = (setup: KpiSetup) => {
    setSelectedSetup(setup);
    setIsCloning(true);
    setInitialIndicators([]);
    setSheetOpen(true);
  };

  const handleSaveSetup = async (setupData: Omit<KpiSetup, 'id'> & { id?: string }) => {
    if (isCloning || !setupData.id) {
        const newSetupData = { ...setupData };
        delete newSetupData.id;
        await addKpiSetup(newSetupData);
        toast({ title: "Pengaturan Dibuat", description: `Pengaturan KPI untuk ${setupData.position} telah berhasil dibuat.` });
    } else {
        await updateKpiSetup(setupData.id, setupData);
        toast({ title: "Pengaturan Diperbarui", description: `Pengaturan KPI untuk ${setupData.position} telah berhasil diperbarui.` });
    }
  };
  
  const openDeleteDialog = (setup: KpiSetup) => {
    setSetupToDelete(setup);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSetup = async () => {
    if (setupToDelete) {
      await deleteKpiSetup(setupToDelete.id);
      setSetupToDelete(null);
      toast({ title: "Pengaturan Dihapus", description: `Pengaturan KPI telah berhasil dihapus.` });
    }
  };
  
   const formatPeriod = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString + '-02'), "MMM yyyy", { locale: localeId });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="w-full min-w-0 space-y-6">
      <Card className="shadow-lg border-t-4 border-primary mb-6 overflow-hidden">
        <CardHeader className="px-4 sm:px-6">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                    <Settings className="size-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                    <CardTitle className="font-headline text-xl sm:text-2xl text-foreground">
                        Pengaturan KPI
                    </CardTitle>
                    <CardDescription className="text-sm leading-relaxed max-w-full">
                        Kelola konfigurasi KPI untuk berbagai peran dan departemen.
                    </CardDescription>
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0 self-end xl:self-center">
                <KpiBulkActions filteredSetups={filteredSetups} />
                <Button size="sm" className="h-10 gap-1 font-bold shadow-md" onClick={() => handleAddSetup()}>
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span className="whitespace-nowrap">Buat Pengaturan</span>
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6 p-4 border rounded-xl bg-muted/30">
               {showCompanyFilter && (
                <div className="space-y-1.5">
                    <p className="text-[10px] font-black uppercase text-muted-foreground ml-1">Perusahaan</p>
                    <Select value={selectedCompanyFilter || 'all'} onValueChange={(value) => { setSelectedCompanyFilter(value); setSelectedDepartment('all'); setSelectedPosition('all'); }}>
                        <SelectTrigger className="bg-background">
                            <Building className="size-3.5 mr-2 text-primary shrink-0" />
                            <SelectValue placeholder="Semua Perusahaan" />
                        </SelectTrigger>
                        <SelectContent className="z-[350]">
                            <SelectItem value="all">Semua Perusahaan</SelectItem>
                            {manageableCompanies.map(c => (
                            <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
              )}
              <div className="space-y-1.5">
                  <p className="text-[10px] font-black uppercase text-muted-foreground ml-1">Departemen</p>
                  <Select value={selectedDepartment} onValueChange={(value) => { setSelectedDepartment(value); setSelectedPosition('all'); }} disabled={departmentOptions.length === 0}>
                    <SelectTrigger className="bg-background">
                        <Network className="size-3.5 mr-2 text-muted-foreground shrink-0" />
                        <SelectValue placeholder="Semua Departemen" />
                    </SelectTrigger>
                    <SelectContent className="z-[350]">
                        <SelectItem value="all">Semua Departemen</SelectItem>
                        {departmentOptions.map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
              </div>
              <div className="space-y-1.5">
                  <p className="text-[10px] font-black uppercase text-muted-foreground ml-1">Jabatan</p>
                  <Select value={selectedPosition} onValueChange={setSelectedPosition} disabled={positionOptions.length === 0}>
                    <SelectTrigger className="bg-background">
                        <Briefcase className="size-3.5 mr-2 text-muted-foreground shrink-0" />
                        <SelectValue placeholder="Semua Jabatan" />
                    </SelectTrigger>
                    <SelectContent className="z-[350]">
                        <SelectItem value="all">Semua Jabatan</SelectItem>
                        {positionOptions.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
              </div>
            </div>
          <Accordion type="single" collapsible className="w-full">
            {filteredSetups.map((setup) => (
              <AccordionItem value={setup.id} key={setup.id} className="border rounded-xl mb-3 overflow-hidden bg-background shadow-sm">
                <AccordionTrigger className="px-4 py-4 hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                        <div className="text-left grid gap-0.5 min-w-0 flex-1">
                            <p className="font-bold text-slate-900 truncate">{setup.position} ({setup.level})</p>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-tight truncate">
                                <span>{setup.department}</span>
                                {(userRole === 'superadmin' || isHoldingAdmin) && (
                                    <>
                                        <span className="opacity-30">•</span>
                                        <span className="text-primary">{setup.company}</span>
                                    </>
                                )}
                            </div>
                            <div className="flex items-center text-[10px] font-medium text-muted-foreground gap-1.5 pt-1.5">
                                <CalendarDays className="size-3" />
                                <span>{formatPeriod(setup.validFrom)} - {formatPeriod(setup.validTo)}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            {!!setup.pendingIndicators?.length && (
                                <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100 animate-pulse">
                                            <BellRing className="size-3.5" />
                                            <span className="text-[10px] font-black">{setup.pendingIndicators.length} BARU</span>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="z-[350]">
                                    <p>Ada KPI turunan baru yang perlu ditinjau.</p>
                                    </TooltipContent>
                                </Tooltip>
                                </TooltipProvider>
                            )}
                            <Badge variant={setup.status === "Aktif" ? "default" : "outline"} className="text-[9px] uppercase font-black px-1.5 h-5">
                                {setup.status}
                            </Badge>
                        </div>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="px-4 pb-4">
                        {setup.description && (
                            <p className="text-xs text-muted-foreground mb-4 bg-muted/20 p-3 rounded-lg border border-dashed">{setup.description}</p>
                        )}
                         <div className="overflow-x-auto rounded-lg border">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow>
                                        <TableHead className="text-[10px] font-bold uppercase">Indikator</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase">Target</TableHead>
                                        <TableHead className="text-right text-[10px] font-bold uppercase">Bobot</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {setup.indicators.map(indicator => (
                                        <TableRow key={indicator.id} className="hover:bg-muted/5">
                                            <TableCell className="font-bold text-xs py-3">{indicator.indicator}</TableCell>
                                            <TableCell className="text-xs font-medium">{indicator.target} {indicator.targetFormat === 'Persentase' ? '%' : indicator.unit}</TableCell>
                                            <TableCell className="text-right font-black text-primary text-xs">{indicator.weight}%</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button aria-haspopup="true" size="sm" variant="ghost" className="h-8 gap-2 font-bold text-muted-foreground">
                                    <MoreHorizontal className="size-4" />
                                    <span>Pilihan Aksi</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="z-[350]">
                                  <DropdownMenuLabel className="text-[10px] uppercase opacity-60">Manajemen Setup</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => handleEditSetup(setup)} className="text-xs">Ubah Pengaturan</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDuplicateSetup(setup)} className="text-xs">Duplikat Pengaturan</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive font-bold text-xs" onClick={() => openDeleteDialog(setup)}>Hapus Pengaturan</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                        </div>
                    </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
           {filteredSetups.length === 0 && (
              <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-xl">
                  <Settings className="size-10 mx-auto mb-3 opacity-20" />
                  <p className="font-bold text-xs uppercase tracking-widest">Tidak ada pengaturan ditemukan</p>
                  <p className="text-[10px] mt-1">Coba sesuaikan filter atau buat pengaturan baru.</p>
              </div>
           )}
        </CardContent>
      </Card>
      <KpiSetupSheet
        isOpen={isSheetOpen}
        onOpenChange={setSheetOpen}
        setup={selectedSetup}
        isCloning={isCloning}
        onSave={handleSaveSetup}
        initialIndicators={initialIndicators}
      />
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteSetup}
        itemName={`pengaturan untuk ${setupToDelete?.position}`}
        itemType="pengaturan KPI"
      />
    </div>
  );
}
