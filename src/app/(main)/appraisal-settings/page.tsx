
// src/app/(main)/appraisal-settings/page.tsx
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  PlusCircle, 
  Settings, 
  Building, 
  Filter, 
  Calendar,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
  Target
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useMasterData } from "@/contexts/master-data-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ResponsivePage, ResponsiveToolbar } from "@/components/ui/adaptive-layout";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { KboNavigator } from "@/components/layout/dashboard-navigator";
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";
import { AppraisalSetupSheet } from "@/components/appraisal/appraisal-setup-sheet";
import { format, parse } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export default function AppraisalSettingsPage() {
    const { currentUser, userRole } = useAuth();
    const { companies, appraisalSetups, addAppraisalSetup, updateAppraisalSetup, deleteAppraisalSetup } = useMasterData();
    const { toast } = useToast();
    const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('all');
    const [isSheetOpen, setSheetOpen] = useState(false);
    const [selectedSetup, setSelectedSetup] = useState<any>(undefined);
    const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [setupToDelete, setSetupToDelete] = useState<any>(null);

    const userCompany = useMemo(() => companies.find(c => c.name === currentUser?.company), [companies, currentUser]);
    const isHoldingAdmin = useMemo(() => userRole === 'manajemen' && !!userCompany?.isHolding, [userRole, userCompany]);

    const filteredSetups = useMemo(() => {
        let setups = appraisalSetups;
        if (selectedCompanyFilter !== 'all') setups = setups.filter(s => s.company === selectedCompanyFilter);
        return setups.sort((a,b) => (b.period || b.periodStart || '').localeCompare(a.period || a.periodStart || ''));
    }, [appraisalSetups, selectedCompanyFilter]);

    const handleSaveSetup = async (data: any) => {
        try {
            if (data.id) {
                await updateAppraisalSetup(data.id, data);
                toast({ title: "Setup Diperbarui", description: "Konfigurasi rater berhasil disimpan." });
            } else {
                await addAppraisalSetup(data);
                toast({ title: "Setup Berhasil Dibuat", description: "Silakan lanjutkan dengan pemetaan penilai." });
            }
            setSheetOpen(false);
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Gagal Menyimpan", description: e.message });
        }
    };

    const handleEditSetup = (setup: any) => {
        setSelectedSetup(setup);
        setSheetOpen(true);
    };

    const formatPeriod = (s: any) => s.period || `${format(parse(s.periodStart, 'yyyy-MM', new Date()), 'MMM yy')} - ${format(parse(s.periodEnd, 'yyyy-MM', new Date()), 'MMM yy')}`;

    return (
        <ResponsivePage>
            <PageHeader title="Setup Matriks Rater" description="Konfigurasi rater (penilai) dan bobot proporsional untuk evaluasi kinerja akhir." icon={Settings}
                actions={<Button onClick={() => { setSelectedSetup(undefined); setSheetOpen(true); }} className="font-bold shadow-lg h-9 sm:h-10 active:scale-95 transition-all"><PlusCircle className="size-4 mr-2" /> Buat Setup Rater</Button>}
            />

            <KboNavigator />

            <ResponsiveToolbar>
                <div className="flex-1 min-w-0">
                    {(userRole === 'superadmin' || isHoldingAdmin) && (
                        <Select value={selectedCompanyFilter} onValueChange={setSelectedCompanyFilter}>
                            <SelectTrigger className="w-full sm:w-[240px] bg-background border-none shadow-sm text-[11px] font-black uppercase"><Building size={14} className="mr-2 text-primary"/><SelectValue placeholder="Pilih Perusahaan"/></SelectTrigger>
                            <SelectContent className="z-[350]">
                                <SelectItem value="all">Semua Perusahaan</SelectItem>
                                {companies.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
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
                                <AccordionTrigger className="px-6 py-5 hover:no-underline group">
                                    <div className="flex items-center justify-between w-full pr-4">
                                        <div className="text-left grid gap-0.5 min-w-0 flex-1">
                                            <p className="font-black text-slate-900 truncate uppercase tracking-tight">{setup.company}</p>
                                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-black uppercase tracking-widest pt-1">
                                                <Calendar size={12} className="opacity-40" />
                                                <span>{formatPeriod(setup)}</span>
                                                <span className="opacity-30">•</span>
                                                <span className="text-primary/70">{setup.cycle}</span>
                                            </div>
                                        </div>
                                        <Badge variant={setup.status === "Aktif" ? "default" : "outline"} className="text-[8px] font-black px-1.5 h-4 border-none">{setup.status}</Badge>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-6 pt-2 border-t">
                                     <div className="flex justify-between items-center">
                                        <div className="flex flex-wrap gap-2">
                                            {setup.activeLevels.map((lvl: string) => (
                                                <Badge key={lvl} variant="outline" className="text-[8px] font-bold h-4 bg-muted/30 border-none uppercase">{lvl}</Badge>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="sm" className="h-8 font-black text-[9px] uppercase" onClick={() => handleEditSetup(setup)}><Pencil size={14} className="mr-2"/>Ubah Setup</Button>
                                            <Button variant="ghost" size="sm" className="h-8 font-black text-[9px] uppercase" onClick={() => {}}><Users size={14} className="mr-2"/>Mapping Penilai</Button>
                                            <Button variant="ghost" size="sm" className="h-8 font-black text-[9px] uppercase text-destructive hover:bg-destructive/5" onClick={() => { setSetupToDelete(setup); setDeleteDialogOpen(true); }}><Trash2 size={14} className="mr-2"/>Hapus</Button>
                                        </div>
                                     </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                ) : (
                    <div className="py-32 text-center border-2 border-dashed rounded-3xl bg-muted/10 opacity-30"><Settings size={48} className="mx-auto mb-4" /><p className="font-black uppercase text-[10px]">Belum Ada Konfigurasi</p></div>
                )}
            </div>

            <AppraisalSetupSheet 
                isOpen={isSheetOpen}
                onOpenChange={setSheetOpen}
                setup={selectedSetup}
                onSave={handleSaveSetup}
            />

            <DeleteConfirmationDialog 
                isOpen={isDeleteDialogOpen} 
                onOpenChange={setDeleteDialogOpen} 
                onConfirm={async () => { 
                    if(setupToDelete) await deleteAppraisalSetup(setupToDelete.id); 
                    setSetupToDelete(null); 
                }} 
                itemName={`setup rater ${setupToDelete?.company}`} 
                itemType="setup rater" 
            />
        </ResponsivePage>
    );
}
