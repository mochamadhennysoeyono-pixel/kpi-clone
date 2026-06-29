// src/components/holding/holding-kpi-setup.tsx
"use client";

import { useState, useMemo } from 'react';
import { useMasterData } from '@/contexts/master-data-context';
import type { Company, KpiSetup, Notification, KpiIndicator } from '@/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { HoldingKpiSetupSheet } from './holding-kpi-setup-sheet';
import { useToast } from '@/hooks/use-toast';
import { DeleteConfirmationDialog } from '../master-data/delete-confirmation-dialog';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface HoldingKpiSetupProps {
  holdingCompany: Company;
  childCompanies: Company[];
}

export default function HoldingKpiSetup({ holdingCompany, childCompanies }: HoldingKpiSetupProps) {
  const { kpiSetups, addKpiSetup, updateKpiSetup, deleteKpiSetup, employees } = useMasterData();
  const { toast } = useToast();

  const [isSheetOpen, setSheetOpen] = useState(false);
  const [selectedSetup, setSelectedSetup] = useState<KpiSetup | undefined>(undefined);
  const [isCloning, setIsCloning] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [setupToDelete, setSetupToDelete] = useState<KpiSetup | null>(null);

  const holdingSetups = useMemo(() => {
    // These are setups specifically for the holding company entity itself
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
    const isNew = isCloning || !setupData.id;
    let mainSetupId: string;

    // Save the main holding setup first
    if (isNew) {
        const newSetupData = { ...setupData };
        delete (newSetupData as Partial<KpiSetup>).id;
        const newDoc = await addKpiSetup(newSetupData, true);
        if (!newDoc) {
            toast({ variant: "destructive", title: "Gagal Menyimpan", description: "Tidak dapat membuat dokumen utama holding." });
            return;
        }
        mainSetupId = newDoc.id;
    } else {
        mainSetupId = setupData.id!;
        await updateKpiSetup(mainSetupId, setupData, true);
    }

    // Now, process the cascades
    for (const indicator of setupData.indicators) {
        if (!indicator.isCascaded || !indicator.targetAllocations) continue;

        for (const [companyName, allocation] of Object.entries(indicator.targetAllocations)) {
            if (!allocation || typeof allocation.target === 'undefined' || allocation.target === null || !allocation.position) continue;
            
            const position = allocation.position as string;
            const target = allocation.target as number;
            
            const manager = employees.find(e => e.company === companyName && e.position === position && e.status === 'Aktif');
            if (!manager) continue;

            const managerSetup = kpiSetups.find(s => s.company === companyName && s.position === position && s.validFrom === setupData.validFrom && s.validTo === setupData.validTo);
            
            const sourcedIndicatorForManager: KpiIndicator = {
                ...indicator,
                id: `SRC-${indicator.id}-${companyName}-${position}`,
                target: target,
                weight: 0,
                source: { indicatorId: indicator.id, employeeId: 'HOLDING' },
                isCascaded: false,
            };
            delete sourcedIndicatorForManager.targetAllocations;

            const setupPayload: Partial<KpiSetup> = {
              pendingIndicators: [sourcedIndicatorForManager],
            };
            
            if (managerSetup) {
                const currentPending = managerSetup.pendingIndicators || [];
                setupPayload.pendingIndicators = [...currentPending.filter(p => p.source?.indicatorId !== indicator.id), sourcedIndicatorForManager];
                await updateKpiSetup(managerSetup.id, setupPayload, true);
            } else {
                const newManagerSetup: Omit<KpiSetup, 'id'> = {
                    company: companyName,
                    position: position,
                    department: manager.department,
                    level: manager.level,
                    status: "Aktif",
                    validFrom: setupData.validFrom,
                    validTo: setupData.validTo,
                    description: `Dibuat otomatis dari ${holdingCompany.name} | ${setupData.validFrom}`,
                    minAchievement: 70,
                    indicators: [],
                    pendingIndicators: [sourcedIndicatorForManager]
                };
                await addKpiSetup(newManagerSetup, true);
            }
        }
    }

    toast({ title: "Sukses!", description: "Pengaturan KPI Induk dan semua tugas turunan otomatisnya telah diproses." });
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
      // Assuming yyyy-MM format
      return format(new Date(dateString + '-02'), "MMM yyyy", { locale: id });
    } catch (e) {
      return dateString;
    }
  };


  return (
    <>
      <div className="flex items-center justify-end gap-2 mb-4">
        <Button size="sm" className="h-9 gap-1" onClick={handleAddSetup}>
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Buat Pengaturan Induk
          </span>
        </Button>
      </div>

       <Accordion type="single" collapsible className="w-full">
            {holdingSetups.map((setup) => (
              <AccordionItem value={setup.id} key={setup.id}>
                <AccordionTrigger>
                    <div className="flex items-center justify-between w-full pr-4">
                        <div className="text-left">
                            <p className="font-semibold">{setup.description || "Pengaturan KPI Induk"}</p>
                            <p className="text-sm text-muted-foreground">Periode: {formatPeriod(setup.validFrom)} - {formatPeriod(setup.validTo)}</p>
                        </div>
                        <Badge variant={setup.status === "Aktif" ? "default" : "outline"}>
                            {setup.status}
                        </Badge>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="pl-4 pr-4 pb-4">
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
                                        <TableCell>{indicator.target.toLocaleString()} {indicator.targetFormat === 'Persentase' ? '%' : indicator.unit}</TableCell>
                                        <TableCell className="text-right">{indicator.weight}%</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
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
                                  <DropdownMenuItem className="text-destructive" onClick={() => openDeleteDialog(setup)}>Hapus</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                        </div>
                    </div>
                </AccordionContent>
              </AccordionItem>
            ))}
        </Accordion>
        {holdingSetups.length === 0 && (
            <div className="text-center text-muted-foreground py-10 border rounded-lg">
                <p>Belum ada Pengaturan KPI untuk Holding.</p>
            </div>
        )}

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
