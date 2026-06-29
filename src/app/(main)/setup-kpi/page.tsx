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
import { PlusCircle, MoreHorizontal, ChevronDown, CalendarDays, BellRing, Settings } from "lucide-react";
import { KpiSuggestionForm } from "@/components/setup-kpi/kpi-suggestion-form";
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
      const subordinateIds = employees.filter(e => e.reportsTo === managerId).map(e => e.id);
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
    <div className="space-y-6">
      <KpiSuggestionForm onAddIndicators={handleAddSetup} />
      <Card className="shadow-lg border-t-4 border-primary mb-6 overflow-hidden">
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Settings className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="font-headline text-2xl">Pengaturan KPI</CardTitle>
                        <CardDescription>
                            Kelola konfigurasi KPI untuk berbagai peran dan departemen.
                        </CardDescription>
                    </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                    <KpiBulkActions filteredSetups={filteredSetups} />
                    <Button size="sm" className="h-10 gap-1 shadow-md" onClick={() => handleAddSetup()}>
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                            Buat Pengaturan
                        </span>
                    </Button>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t">
               {showCompanyFilter && (
                <Select value={selectedCompanyFilter || 'all'} onValueChange={(value) => { setSelectedCompanyFilter(value); setSelectedDepartment('all'); setSelectedPosition('all'); }}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filter Perusahaan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Perusahaan</SelectItem>
                    {manageableCompanies.map(c => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
               <Select value={selectedDepartment} onValueChange={(value) => { setSelectedDepartment(value); setSelectedPosition('all'); }} disabled={departmentOptions.length === 0}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filter Departemen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Departemen</SelectItem>
                    {departmentOptions.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                 <Select value={selectedPosition} onValueChange={setSelectedPosition} disabled={positionOptions.length === 0}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filter Jabatan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Jabatan</SelectItem>
                    {positionOptions.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Accordion type="single" collapsible className="w-full">
            {filteredSetups.map((setup) => (
              <AccordionItem value={setup.id} key={setup.id}>
                <AccordionTrigger>
                    <div className="flex items-center justify-between w-full pr-4">
                        <div className="text-left grid gap-1">
                            <p className="font-semibold">{setup.position} ({setup.level})</p>
                            <p className="text-sm text-muted-foreground">{setup.department} {(userRole === 'superadmin' || isHoldingAdmin) && `(${setup.company})`}</p>
                            <div className="flex items-center text-xs text-muted-foreground gap-1.5 pt-1">
                                <CalendarDays className="h-3.5 w-3.5" />
                                <span>{formatPeriod(setup.validFrom)} - {formatPeriod(setup.validTo)}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {!!setup.pendingIndicators?.length && (
                                <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center gap-1 text-yellow-600 animate-pulse">
                                            <BellRing className="h-4 w-4" />
                                            <span className="text-xs font-semibold">{setup.pendingIndicators.length}</span>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                    <p>Ada KPI turunan baru yang perlu ditinjau.</p>
                                    </TooltipContent>
                                </Tooltip>
                                </TooltipProvider>
                            )}
                            <Badge variant={setup.status === "Aktif" ? "default" : "outline"}>
                                {setup.status}
                            </Badge>
                        </div>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="pl-4 pr-4 pb-4">
                        <p className="text-sm text-muted-foreground mb-4">{setup.description}</p>
                         <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Indikator</TableHead>
                                        <TableHead>Target</TableHead>
                                        <TableHead className="text-right">Bobot</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {setup.indicators.map(indicator => (
                                        <TableRow key={indicator.id}>
                                            <TableCell className="font-medium">{indicator.indicator}</TableCell>
                                            <TableCell>{indicator.target} {indicator.targetFormat === 'Persentase' ? '%' : indicator.unit}</TableCell>
                                            <TableCell className="text-right">{indicator.weight}%</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="mt-4 flex justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button aria-haspopup="true" size="icon" variant="ghost">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Buka menu</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => handleEditSetup(setup)}>Ubah Pengaturan</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDuplicateSetup(setup)}>Duplikat Pengaturan</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive" onClick={() => openDeleteDialog(setup)}>Hapus Pengaturan</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                        </div>
                    </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
           {filteredSetups.length === 0 && (
              <div className="text-center text-muted-foreground py-10">
                  <p>Tidak ada pengaturan KPI yang ditemukan untuk filter yang dipilih.</p>
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
