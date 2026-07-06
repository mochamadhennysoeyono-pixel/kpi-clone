
// src/app/(main)/setup-kpi/page.tsx
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  PlusCircle, 
  MoreHorizontal, 
  CalendarDays, 
  BellRing, 
  Settings, 
  Building, 
  Network, 
  Briefcase,
  Pencil,
  Trash2,
  Search
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { KpiSetup, Company, KpiIndicator } from '@/types';
import { KpiSetupSheet } from '@/components/setup-kpi/kpi-setup-sheet';
import { DeleteConfirmationDialog } from '@/components/master-data/delete-confirmation-dialog';
import { useMasterData } from '@/contexts/master-data-context';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parse } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import KpiBulkActions from '@/components/kpi/kpi-bulk-actions';
import { ResponsivePage, ResponsiveToolbar } from '@/components/ui/adaptive-layout';
import { PageHeader } from '@/components/ui/page-header';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { cn } from '@/lib/utils';
import { KpiNavigator } from '@/components/layout/dashboard-navigator';

export default function SetupKpiPage() {
  const { kpiSetups, addKpiSetup, updateKpiSetup, deleteKpiSetup, companies, employees } = useMasterData();
  const { currentUser, userRole } = useAuth();
  const { toast } = useToast();
  const { isMobile } = useBreakpoint();

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

  useEffect(() => {
    if (userRole === 'superadmin') setSelectedCompanyFilter('all');
    else if (currentUser?.company) setSelectedCompanyFilter(currentUser.company);
  }, [currentUser, userRole]);

  const filteredSetups = useMemo(() => {
    let setups = kpiSetups;
    if (selectedCompanyFilter !== 'all') setups = setups.filter(s => s.company === selectedCompanyFilter);
    if (selectedDepartment !== 'all') setups = setups.filter(s => s.department === selectedDepartment);
    if (selectedPosition !== 'all') setups = setups.filter(s => s.position === selectedPosition);
    return setups.sort((a, b) => (b.validFrom || '').localeCompare(a.validFrom || ''));
  }, [kpiSetups, selectedCompanyFilter, selectedDepartment, selectedPosition]);

  const handleSaveSetup = async (data: any) => {
    if (isCloning || !data.id) {
        const payload = { ...data }; delete payload.id;
        await addKpiSetup(payload);
    } else await updateKpiSetup(data.id, data);
    toast({ title: "Setup Disimpan" });
  };

  return (
    <ResponsivePage>
      <PageHeader title="Setup Matriks KPI" description="Definisikan dan kelola parameter KPI strategis untuk berbagai posisi jabatan." icon={Settings} 
        actions={<div className="flex items-center gap-2"><KpiBulkActions filteredSetups={filteredSetups} /><Button onClick={() => { setSelectedSetup(undefined); setSheetOpen(true); }} className="font-bold shadow-lg"><PlusCircle className="size-4 mr-2" /> Buat Setup</Button></div>} 
      />

      <KpiNavigator />

      <ResponsiveToolbar>
          <div className="flex-1 min-w-0">
             {(userRole === 'superadmin' || isHoldingAdmin) && (
                <Select value={selectedCompanyFilter} onValueChange={setSelectedCompanyFilter}>
                    <SelectTrigger className="w-full sm:w-[240px] bg-background border-none shadow-sm text-[11px] font-black uppercase"><Building size={14} className="mr-2 text-primary"/><SelectValue placeholder="Pilih Perusahaan"/></SelectTrigger>
                    <SelectContent className="z-[350]">
                        <SelectItem value="all">Semua Perusahaan</SelectItem>
                        {manageableCompanies.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                    </SelectContent>
                </Select>
             )}
          </div>
      </ResponsiveToolbar>

      <div className="pt-4">
        {filteredSetups.length > 0 ? (
            <Accordion type="single" collapsible className="w-full space-y-4">
              {filteredSetups.map((setup) => (
                <AccordionItem value={setup.id} key={setup.id} className="border rounded-2xl overflow-hidden bg-background shadow-sm border-border/40">
                  <AccordionTrigger className={cn("px-4 py-4 hover:no-underline transition-all group", isMobile ? "p-3" : "px-6")}>
                      <div className="flex items-center justify-between w-full pr-4">
                          <div className="text-left grid gap-0.5 min-w-0 flex-1">
                              <p className="font-black text-slate-900 truncate uppercase tracking-tight">{setup.position}</p>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-widest truncate">
                                  <span>{setup.department}</span>
                                  <span className="opacity-30">•</span>
                                  <span className="text-primary/70">{setup.company}</span>
                              </div>
                          </div>
                          <Badge variant={setup.status === "Aktif" ? "default" : "outline"} className="text-[8px] uppercase font-black px-1.5 h-4 border-none">{setup.status}</Badge>
                      </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-0 border-t border-border/40">
                      <div className={cn(isMobile ? "p-3" : "p-6")}>
                           <div className="w-full overflow-hidden min-w-0 rounded-xl border border-border/40 bg-muted/5">
                                <Table>
                                    <TableHeader className="bg-muted/20">
                                        <TableRow className="border-none">
                                            <TableHead className="text-[9px] font-black uppercase py-4">Indikator</TableHead>
                                            <TableHead className="text-[9px] font-black uppercase text-center">Target</TableHead>
                                            <TableHead className="text-right text-[9px] font-black uppercase pr-6">Bobot</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {setup.indicators.map(ind => (
                                            <TableRow key={ind.id} className="hover:bg-background border-border/40">
                                                <TableCell className="py-4 font-bold text-xs text-slate-800">{ind.indicator}</TableCell>
                                                <TableCell className="text-center font-black text-[10px] text-slate-600">{ind.target} {ind.targetFormat === 'Persentase' ? '%' : ind.unit}</TableCell>
                                                <TableCell className="text-right pr-6 font-black text-primary text-xs">{ind.weight}%</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                          </div>
                          <div className="mt-4 flex justify-end gap-2">
                                <Button variant="ghost" size="sm" className="h-8 font-black text-[9px] uppercase" onClick={() => handleEditSetup(setup)}><Pencil size={14} className="mr-2"/>Ubah</Button>
                                <Button variant="ghost" size="sm" className="h-8 font-black text-[9px] uppercase text-destructive" onClick={() => openDeleteDialog(setup)}><Trash2 size={14} className="mr-2"/>Hapus</Button>
                          </div>
                      </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
        ) : (
            <div className="text-center py-32 border-2 border-dashed rounded-3xl bg-muted/10 opacity-30"><Settings size={48} className="mx-auto mb-4" /><p className="font-black uppercase text-[10px] tracking-[0.2em]">Belum Ada Pengaturan</p></div>
        )}
      </div>

      <KpiSetupSheet isOpen={isSheetOpen} onOpenChange={setSheetOpen} setup={selectedSetup} isCloning={isCloning} onSave={handleSaveSetup} initialIndicators={initialIndicators} />
      <DeleteConfirmationDialog isOpen={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={async () => { if(setupToDelete) await deleteKpiSetup(setupToDelete.id); setSetupToDelete(null); }} itemName={`setup untuk ${setupToDelete?.position}`} itemType="pengaturan KPI" />
    </ResponsivePage>
  );
}
