// src/components/holding/holding-kpi-setup.tsx
"use client";

import { useState, useMemo } from 'react';
import { useMasterData } from '@/contexts/master-data-context';
import type { Company, KpiSetup } from '@/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, Calendar, Settings, Pencil, Trash2, Copy } from 'lucide-react';
import { HoldingKpiSetupSheet } from './holding-kpi-setup-sheet';
import { useToast } from '@/hooks/use-toast';
import { DeleteConfirmationDialog } from '../master-data/delete-confirmation-dialog';
import { format, parse } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface HoldingKpiSetupProps {
  holdingCompany: Company;
  childCompanies: Company[];
}

export default function HoldingKpiSetup({ holdingCompany, childCompanies }: HoldingKpiSetupProps) {
  const { kpiSetups, addKpiSetup, updateKpiSetup, deleteKpiSetup } = useMasterData();
  const { toast } = useToast();

  const [isSheetOpen, setSheetOpen] = useState(false);
  const [selectedSetup, setSelectedSetup] = useState<KpiSetup | undefined>(undefined);
  const [isCloning, setIsCloning] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [setupToDelete, setSetupToDelete] = useState<KpiSetup | null>(null);

  const holdingSetups = useMemo(() => {
    return kpiSetups
      .filter(s => s.company === holdingCompany.name && s.level === 'Direktur' && s.position === 'Admin Perusahaan')
      .sort((a,b) => (b.validFrom || '').localeCompare(a.validFrom || ''));
  }, [kpiSetups, holdingCompany]);

  const handleAddSetup = () => {
    setSelectedSetup(undefined);
    setIsCloning(false);
    setSheetOpen(true);
  };

  const handleEditSetup = (setup: KpiSetup) => {
    setSelectedSetup(setup);
    setIsCloning(false);
    setSheetOpen(true);
  };
  
  const handleDuplicateSetup = (setup: KpiSetup) => {
    setSelectedSetup(setup);
    setIsCloning(true);
    setSheetOpen(true);
  };

  const handleSaveSetup = async (setupData: Omit<KpiSetup, 'id'> & { id?: string }) => {
    if (isCloning || !setupData.id) {
        const newSetupData = { ...setupData };
        delete (newSetupData as Partial<KpiSetup>).id;
        await addKpiSetup(newSetupData, true);
    } else {
        await updateKpiSetup(setupData.id!, setupData, true);
    }
    toast({ title: "Pengaturan Disimpan", description: "Seluruh turunan KPI otomatis telah diperbarui." });
  };

  const openDeleteDialog = (setup: KpiSetup) => {
    setSetupToDelete(setup);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSetup = async () => {
    if (setupToDelete) {
      await deleteKpiSetup(setupToDelete.id);
      setSetupToDelete(null);
      toast({ title: "Pengaturan Dihapus" });
    }
  };
  
  const formatPeriod = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(parse(dateString, "yyyy-MM", new Date()), "MMM yyyy", { locale: localeId });
    } catch (e) { return dateString; }
  };

  return (
    <>
      <div className="flex justify-end mb-6">
        <Button onClick={handleAddSetup} className="font-bold shadow-lg h-10 px-6 active:scale-95 transition-all">
          <PlusCircle className="mr-2 size-4" />
          Buat Setup Induk
        </Button>
      </div>

       <div className="space-y-4">
            {holdingSetups.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                    {holdingSetups.map((setup) => (
                    <AccordionItem value={setup.id} key={setup.id} className="border rounded-2xl mb-4 overflow-hidden bg-background shadow-sm">
                        <AccordionTrigger className="px-6 py-5 hover:no-underline group">
                            <div className="flex items-center justify-between w-full pr-4">
                                <div className="text-left flex items-start gap-4">
                                    <div className="p-2.5 bg-primary/5 rounded-xl text-primary group-hover:scale-110 transition-transform hidden sm:block">
                                        <Calendar size={20} />
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="font-black text-slate-900 tracking-tight">{setup.description || "Pengaturan KPI Induk"}</p>
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                                            <span>Siklus: {formatPeriod(setup.validFrom)} - {formatPeriod(setup.validTo)}</span>
                                        </div>
                                    </div>
                                </div>
                                <Badge variant={setup.status === "Aktif" ? "default" : "outline"} className="font-black text-[9px] uppercase h-5 border-none">
                                    {setup.status}
                                </Badge>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6 pt-2">
                            <div className="rounded-xl border shadow-sm overflow-hidden bg-muted/5">
                                <Table>
                                    <TableHeader className="bg-muted/30">
                                        <TableRow className="hover:bg-transparent border-none">
                                            <TableHead className="text-[10px] font-black uppercase py-4">Indikator Strategis</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase">Target Total</TableHead>
                                            <TableHead className="text-right text-[10px] font-black uppercase">Bobot</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {setup.indicators.map(indicator => (
                                            <TableRow key={indicator.id} className="border-border/40">
                                                <TableCell className="font-bold text-sm py-4">
                                                    {indicator.indicator}
                                                    <p className="text-[10px] text-muted-foreground font-medium italic mt-1 leading-relaxed">{indicator.measurement}</p>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="font-mono text-xs font-bold text-slate-700">
                                                        {indicator.target.toLocaleString()} {indicator.targetFormat === 'Persentase' ? '%' : indicator.unit}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Badge className="bg-primary/5 text-primary border-none font-black text-[10px] h-5">{indicator.weight}%</Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            
                            <div className="mt-4 flex justify-end gap-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-9 gap-2 font-bold text-muted-foreground">
                                            <MoreHorizontal className="size-4" />
                                            <span>Opsi Manajemen</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="z-[350]">
                                        <DropdownMenuLabel className="text-[10px] font-black uppercase opacity-60">Aksi Setup</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => handleEditSetup(setup)}><Pencil size={14} className="mr-2"/> Ubah Pengaturan</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleDuplicateSetup(setup)}><Copy size={14} className="mr-2"/> Duplikat (Kloning)</DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive font-bold" onClick={() => openDeleteDialog(setup)}><Trash2 size={14} className="mr-2"/> Hapus Setup</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                    ))}
                </Accordion>
            ) : (
                <div className="py-32 text-center border-2 border-dashed rounded-[2rem] bg-muted/10">
                    <Settings size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="font-black uppercase text-[10px] tracking-[0.2em] text-slate-400">Belum Ada Setup Aktif</p>
                </div>
            )}
        </div>

      <HoldingKpiSetupSheet
        isOpen={isSheetOpen}
        onOpenChange={setSheetOpen}
        setup={selectedSetup}
        isCloning={isCloning}
        onSave={handleSaveSetup}
        holdingCompany={holdingCompany}
        childCompanies={childCompanies}
      />
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteSetup}
        itemName={`pengaturan untuk ${setupToDelete?.description}`}
        itemType="pengaturan KPI"
      />
    </>
  );
}
