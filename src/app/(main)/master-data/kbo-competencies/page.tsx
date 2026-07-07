// src/app/(main)/master-data/kbo-competencies/page.tsx
"use client";

import { useState, useMemo, forwardRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { PlusCircle, MoreHorizontal, BrainCircuit, Maximize2, Minimize2, Eye, ClipboardPen, X, Copy, ChevronDown, Trash2, Building, Search, Pencil, LayoutGrid, CheckSquare } from "lucide-react";
import type { KboSetup, Company } from "@/types";
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KboSetupFormSheet } from "@/components/master-data/kbo/kbo-setup-form-sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ResponsivePage, ResponsiveToolbar } from "@/components/ui/adaptive-layout";
import { PageHeader } from "@/components/ui/page-header";
import { AdaptiveCardGrid } from "@/components/ui/adaptive-card";
import { Input } from "@/components/ui/input";
import { KboNavigator } from "@/components/layout/dashboard-navigator";

const getContextName = (setup: KboSetup): string => {
    if (setup.categoryName === 'Generic Competency') return `Level: ${setup.level || 'N/A'}`;
    if (setup.categoryName === 'Specific Competency') return `Jabatan: ${setup.position || 'N/A'}`;
    if (setup.categoryName === 'Core Competency') return setup.company === 'Global' ? 'Global' : `Perusahaan: ${setup.company}`;
    return setup.company;
}

export default function KboCompetenciesPage() {
  const { kboSetups, companies, addKboSetup, updateKboSetup, deleteKboSetup } = useMasterData();
  const { currentUser, userRole } = useAuth();
  const { toast } = useToast();
  
  const [isFormSheetOpen, setFormSheetOpen] = useState(false);
  const [selectedSetup, setSelectedSetup] = useState<KboSetup | undefined>(undefined);
  const [isCloning, setIsCloning] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [setupToDelete, setSetupToDelete] = useState<KboSetup | null>(null);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState("");
  
  const userCompany = useMemo(() => companies.find(c => c.name === currentUser?.company), [companies, currentUser]);
  const isHoldingAdmin = useMemo(() => userRole === 'manajemen' && !!userCompany?.isHolding, [userRole, userCompany]);

  const filteredSetups = useMemo(() => {
    let setups = [...kboSetups];
    if (selectedCompanyFilter !== 'all') setups = setups.filter(s => s.company === selectedCompanyFilter);
    if (searchTerm) setups = setups.filter(s => s.categoryName.toLowerCase().includes(searchTerm.toLowerCase()) || getContextName(s).toLowerCase().includes(searchTerm.toLowerCase()));
    return setups;
  }, [kboSetups, selectedCompanyFilter, searchTerm]);

  const handleSaveItem = async (data: any) => {
    if (isCloning || !data.id) await addKboSetup(data);
    else await updateKboSetup(data.id, data);
    toast({ title: "Setup Kompetensi Disimpan" });
  };

  return (
    <ResponsivePage>
      <PageHeader title="Pustaka Kompetensi (KBO)" description="Kelola seluruh dimensi perilaku dan indikator penilaian kompetensi global & spesifik." icon={BrainCircuit}
        actions={<Button onClick={() => { setSelectedSetup(undefined); setFormSheetOpen(true); setIsCloning(false); }} className="font-bold shadow-lg h-9 sm:h-10"><PlusCircle className="size-4 mr-2" /> Buat Setup Baru</Button>}
      />

      <KboNavigator />

      <ResponsiveToolbar>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Cari kategori atau jabatan..." className="pl-9 h-10 border-none bg-background/50 shadow-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        {(userRole === 'superadmin' || isHoldingAdmin) && (
            <Select value={selectedCompanyFilter} onValueChange={setSelectedCompanyFilter}>
                <SelectTrigger className="w-full sm:w-[200px] h-10 bg-background border-none shadow-sm text-[11px] font-black uppercase"><Building size={14} className="mr-2 text-primary" /><SelectValue placeholder="Unit Bisnis" /></SelectTrigger>
                <SelectContent className="z-[350]">
                    <SelectItem value="all">Semua Klien & Global</SelectItem>
                    {companies.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
            </Select>
        )}
      </ResponsiveToolbar>

      <div className="pt-4">
          {filteredSetups.length > 0 ? (
              <AdaptiveCardGrid complexity="medium">
                  {filteredSetups.map(setup => (
                      <Card key={setup.id} className="border-border/40 hover:shadow-md transition-all overflow-hidden bg-background">
                           <CardHeader className="p-4 pb-2 bg-muted/20 border-b">
                               <div className="flex justify-between items-start gap-4">
                                    <div className="min-w-0">
                                        <h4 className="font-black text-xs uppercase tracking-tight text-slate-900 truncate">{getContextName(setup)}</h4>
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-60 truncate">{setup.company}</p>
                                    </div>
                                    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><MoreHorizontal size={14}/></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="z-[350]">
                                            <DropdownMenuItem onClick={() => { setSelectedSetup(setup); setIsCloning(false); setFormSheetOpen(true); }}><Pencil size={14} className="mr-2"/> Ubah</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => { setSelectedSetup(setup); setIsCloning(true); setFormSheetOpen(true); }}><Copy size={14} className="mr-2"/> Duplikat</DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-destructive font-bold" onClick={() => { setSetupToDelete(setup); setDeleteDialogOpen(true); }}><Trash2 size={14} className="mr-2"/> Hapus</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                               </div>
                           </CardHeader>
                           <CardContent className="p-4">
                                <div className="flex items-center gap-4 text-[10px] font-black uppercase text-muted-foreground">
                                    <div className="flex items-center gap-1.5"><LayoutGrid size={12} className="text-primary opacity-40" /> {setup.dimensions.length} Dimensi</div>
                                    <div className="flex items-center gap-1.5"><CheckSquare size={12} className="text-primary opacity-40" /> {setup.dimensions.reduce((s,d) => s + d.keyBehaviors.length, 0)} Poin</div>
                                </div>
                           </CardContent>
                      </Card>
                  ))}
              </AdaptiveCardGrid>
          ) : (
              <div className="py-32 text-center border-2 border-dashed rounded-3xl bg-muted/10 opacity-30"><BrainCircuit size={48} className="mx-auto mb-4" /><p className="font-black uppercase text-[10px]">Pustaka Kosong</p></div>
          )}
      </div>

      <KboSetupFormSheet isOpen={isFormSheetOpen} onOpenChange={setFormSheetOpen} setup={selectedSetup} isCloning={isCloning} onSave={handleSaveItem} companies={companies} />
      <DeleteConfirmationDialog isOpen={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={async () => { if(setupToDelete) await deleteKboSetup(setupToDelete.id); setSetupToDelete(null); }} itemName={`setup ${setupToDelete ? getContextName(setupToDelete) : ''}`} itemType="pustaka KBO" />
    </ResponsivePage>
  );
}
