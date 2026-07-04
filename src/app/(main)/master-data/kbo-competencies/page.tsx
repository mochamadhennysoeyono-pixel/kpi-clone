// src/app/(main)/master-data/kbo-competencies/page.tsx
"use client";

import { useState, useMemo, forwardRef, useEffect } from "react";
import { createPortal } from "react-dom";
import * as XLSX from 'xlsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { PlusCircle, MoreHorizontal, BrainCircuit, Maximize2, Minimize2, Eye, ClipboardPen, X, Copy, ChevronDown, Trash2, Download, Building, Filter, Search, Pencil, LayoutGrid, CheckSquare } from "lucide-react";
import type { KboSetup, Company } from "@/types";
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";
import { useMasterData } from "@/contexts/master-data-context";
import { useAuth } from "@/contexts/auth-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KboSetupFormSheet } from "@/components/master-data/kbo/kbo-setup-form-sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ResponsivePage, ResponsiveToolbar } from "@/components/ui/adaptive-layout";
import { PageHeader } from "@/components/ui/page-header";
import { AdaptiveCardGrid } from "@/components/ui/adaptive-card";
import { Input } from "@/components/ui/input";


const KboDetailView = forwardRef<HTMLDivElement, { setup: KboSetup }>(({ setup }, ref) => {
    const totalKeyBehaviors = setup.dimensions.reduce((sum, dim) => sum + dim.keyBehaviors.length, 0);
    const scorePerBehavior = totalKeyBehaviors > 0 ? 100 / totalKeyBehaviors : 0;

    return (
        <div ref={ref} className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Kategori</p>
                    <p className="font-bold text-slate-900">{setup.categoryName}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Konteks</p>
                    <p className="font-bold text-slate-900">{getContextName(setup)}</p>
                </div>
            </div>
            
            <div className="rounded-xl border shadow-sm overflow-hidden bg-muted/5">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow className="border-none">
                            <TableHead className="text-[9px] font-black uppercase py-4">Skala</TableHead>
                            <TableHead className="text-[9px] font-black uppercase">Nama Skala</TableHead>
                            <TableHead className="text-[9px] font-black uppercase text-center">% Bobot</TableHead>
                            <TableHead className="text-right text-[9px] font-black uppercase pr-6">Poin</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(setup.ratingScale || []).map((scale, index) => {
                            const calculatedScore = (scorePerBehavior * scale.percentage) / 100;
                            return (
                            <TableRow key={index} className="border-border/40">
                                    <TableCell className="font-black text-primary text-xs py-4">{scale.level}</TableCell>
                                    <TableCell className="text-xs font-bold">{scale.name}</TableCell>
                                    <TableCell className="text-center"><Badge variant="outline" className="text-[9px] font-black h-5 border-none bg-muted/50">{scale.percentage}%</Badge></TableCell>
                                    <TableCell className="text-right pr-6 font-mono text-[11px] font-black">{calculatedScore.toFixed(2)}</TableCell>
                            </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>

            <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Struktur Dimensi</h4>
                <div className="space-y-4">
                    {setup.dimensions.map(dim => (
                        <Card key={dim.id} className="border-border/40 bg-muted/10 shadow-none">
                            <CardHeader className="p-4 bg-muted/20 border-b">
                                <CardTitle className="text-xs font-black uppercase text-slate-800">{dim.dimension}</CardTitle>
                                <CardDescription className="text-[10px] leading-relaxed italic">"{dim.definition}"</CardDescription>
                            </CardHeader>
                            <CardContent className="p-4">
                                <ul className="space-y-2">
                                    {dim.keyBehaviors.map((kb, i) => (
                                    <li key={i} className="flex items-start gap-2 text-xs font-medium text-slate-600">
                                        <div className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                        <span>{kb.value}</span>
                                    </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    )
});
KboDetailView.displayName = 'KboDetailView';

const KboSimulationView = forwardRef<HTMLDivElement, { setup: KboSetup }>(({ setup }, ref) => {
    const totalKeyBehaviors = setup.dimensions.reduce((sum, dim) => sum + dim.keyBehaviors.length, 0);
    const scorePerBehavior = totalKeyBehaviors > 0 ? 100 / totalKeyBehaviors : 0;
    
    const [selections, setSelections] = useState<Record<string, string>>({});
    
    const totalScore = useMemo(() => {
        let score = 0;
        Object.values(selections).forEach(scaleLevelStr => {
            const scaleLevel = parseInt(scaleLevelStr, 10);
            const scale = setup.ratingScale.find(s => s.level === scaleLevel);
            if (scale) {
                score += (scorePerBehavior * scale.percentage) / 100;
            }
        });
        return score;
    }, [selections, setup.ratingScale, scorePerBehavior]);

    const handleSelectionChange = (keyBehaviorId: string, scaleLevel: string) => {
        setSelections(prev => ({ ...prev, [keyBehaviorId]: scaleLevel }));
    };

    return (
        <div ref={ref} className="space-y-6 pb-20">
             <div className="sticky top-0 z-10 p-6 bg-primary text-primary-foreground shadow-xl rounded-b-[2rem] flex justify-between items-center gap-6">
                 <div className="space-y-1 min-w-0">
                    <h3 className="font-black text-lg sm:text-xl uppercase tracking-tight truncate">{setup.categoryName}</h3>
                    <div className="text-[9px] font-black uppercase tracking-widest opacity-60 flex flex-wrap gap-x-3">
                        <span>Mode Simulasi</span>
                        <span>•</span>
                        <span>{getContextName(setup)}</span>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center bg-white/10 backdrop-blur-md rounded-2xl p-4 text-center border border-white/20 shrink-0">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-70">Estimasi Skor</p>
                    <p className="text-3xl font-black">{totalScore.toFixed(2)}</p>
                </div>
            </div>
            
            <div className="p-4 sm:p-8 space-y-8 animate-fade-in">
                <div className="text-center p-4 rounded-2xl bg-muted/40 border border-border/40">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-3">Panduan Skala Penilaian</p>
                    <div className="flex justify-center items-center gap-3 text-[11px] font-bold">
                        <span className="text-rose-600">Gagal</span>
                        <div className="flex gap-1.5">
                            {[1, 2, 3, 4].map(n => <div key={n} className="size-6 rounded-md bg-white border shadow-sm flex items-center justify-center text-primary">{n}</div>)}
                        </div>
                        <span className="text-emerald-600">Sangat Baik</span>
                    </div>
                </div>


                {setup.dimensions.map(dim => (
                <div key={dim.id} className="space-y-4">
                    <div className="px-1">
                        <h3 className="font-black text-sm uppercase tracking-tight text-slate-900">{dim.dimension}</h3>
                        <p className="text-[11px] text-muted-foreground font-medium italic mt-1 leading-relaxed">"{dim.definition}"</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        {dim.keyBehaviors.map((kb, index) => {
                            const kbId = `${dim.id}-${index}`;
                            return (
                                <Card key={kbId} className={cn(
                                    "border-border/40 shadow-sm group hover:border-primary/20 transition-all bg-background",
                                    selections[kbId] && "bg-primary/[0.02] border-primary/10"
                                )}>
                                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <p className="text-xs font-bold text-slate-700 flex-1 leading-relaxed">{kb.value}</p>
                                        <RadioGroup
                                            onValueChange={(value) => handleSelectionChange(kbId, value)}
                                            value={selections[kbId]}
                                            className="flex flex-row items-center gap-2 shrink-0"
                                        >
                                            {setup.ratingScale.map(scale => (
                                                <div className="relative" key={scale.level}>
                                                    <RadioGroupItem value={String(scale.level)} id={`${kbId}-${scale.level}`} className="peer sr-only" />
                                                    <Label 
                                                        htmlFor={`${kbId}-${scale.level}`} 
                                                        className={cn(
                                                            "size-9 rounded-xl border-2 flex items-center justify-center text-xs font-black transition-all cursor-pointer",
                                                            "hover:bg-muted border-border/60 text-muted-foreground",
                                                            selections[kbId] === String(scale.level) ? "bg-primary border-primary text-white scale-110 shadow-lg" : ""
                                                        )}
                                                    >
                                                        {scale.level}
                                                    </Label>
                                                </div>
                                            ))}
                                        </RadioGroup>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                </div>
                ))}
            </div>
        </div>
    )
});
KboSimulationView.displayName = 'KboSimulationView';


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
  const [isDetailSheetOpen, setDetailSheetOpen] = useState(false);
  const [isDetailSheetExpanded, setDetailSheetExpanded] = useState(false);
  const [isSimulationSheetOpen, setSimulationSheetOpen] = useState(false);
  const [isSimulationSheetExpanded, setSimulationSheetExpanded] = useState(false);

  const [selectedSetup, setSelectedSetup] = useState<KboSetup | undefined>(undefined);
  const [isCloning, setIsCloning] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [setupsToDelete, setSetupsToDelete] = useState<KboSetup[] | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState("");
  
  const manageableCompanies = useMemo(() => {
    if (userRole === 'superadmin') return companies.filter(c => c.status === 'Aktif');
    if (currentUser?.company) {
        const userCompany = companies.find(c => c.name === currentUser.company);
        if (userCompany?.isHolding) {
            return companies.filter(c => c.id === userCompany.id || c.parentId === userCompany.id);
        }
        return companies.filter(c => c.name === currentUser.company);
    }
    return [];
  }, [companies, currentUser, userRole]);

  const filteredSetups = useMemo(() => {
    let setups = [...kboSetups];
    if (selectedCompanyFilter !== 'all') {
        setups = setups.filter(s => s.company === selectedCompanyFilter);
    } else if (userRole === 'manajemen') {
        const manageableCompanyNames = manageableCompanies.map(c => c.name);
        setups = setups.filter(s => manageableCompanyNames.includes(s.company) || s.company === 'Global');
    }
    
    if (searchTerm) {
        setups = setups.filter(s => 
            s.categoryName.toLowerCase().includes(searchTerm.toLowerCase()) || 
            getContextName(s).toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    return setups;
  }, [kboSetups, selectedCompanyFilter, userRole, currentUser, manageableCompanies, searchTerm]);

  const groupedSetups = useMemo(() => {
    const groups: { [key: string]: KboSetup[] } = {
      "Core Competency": [],
      "Generic Competency": [],
      "Specific Competency": [],
    };
    filteredSetups.forEach(setup => {
      if (groups[setup.categoryName]) {
        groups[setup.categoryName].push(setup);
      }
    });
    return groups;
  }, [filteredSetups]);
  
   const handleSelectAllInCategory = (categoryName: string, checked: boolean) => {
    const categorySetupIds = groupedSetups[categoryName].map(s => s.id);
    if (checked) {
      setSelectedRowIds(prev => [...new Set([...prev, ...categorySetupIds])]);
    } else {
      setSelectedRowIds(prev => prev.filter(id => !categorySetupIds.includes(id)));
    }
  };

  const handleRowSelect = (id: string) => {
    setSelectedRowIds(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedRowIds.length === 0) return;
    const toDelete = kboSetups.filter(s => selectedRowIds.includes(s.id));
    setSetupsToDelete(toDelete);
    setDeleteDialogOpen(true);
  };
  
  const handleBulkExport = () => {
    if (selectedRowIds.length === 0) {
      toast({ variant: 'destructive', title: "Tidak Ada Data Terpilih" });
      return;
    }
    const dataToExport = kboSetups
      .filter(s => selectedRowIds.includes(s.id))
      .flatMap(setup => 
        setup.dimensions.flatMap(dim =>
          dim.keyBehaviors.map(kb => ({
            'ID Pengaturan': setup.id,
            'Kategori': setup.categoryName,
            'Konteks': getContextName(setup),
            'Dimensi': dim.dimension,
            'Definisi': dim.definition,
            'Perilaku Kunci': kb.value,
          }))
        )
      );

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Kompetensi KBO");
    XLSX.writeFile(workbook, `Ekspor_KBO_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: "Ekspor Berhasil", description: `${selectedRowIds.length} data kompetensi telah diekspor.` });
  };


  const handleAddItem = () => {
    setSelectedSetup(undefined);
    setIsCloning(false);
    setFormSheetOpen(true);
  };

  const handleEditItem = (item: KboSetup) => {
    setSelectedSetup(item);
    setIsCloning(false);
    setFormSheetOpen(true);
  };
  
  const handleDuplicateItem = (item: KboSetup) => {
    setSelectedSetup(item);
    setIsCloning(true);
    setFormSheetOpen(true);
  };

  const handleViewDetails = (item: KboSetup) => {
    setSelectedSetup(item);
    setDetailSheetOpen(true);
  }
  
  const handleViewSimulation = (item: KboSetup) => {
    setSelectedSetup(item);
    setSimulationSheetOpen(true);
  }

  const handleSaveItem = async (data: Omit<KboSetup, 'id'> & { id?: string }) => {
    const isNew = isCloning || !data.id;
    const companyToSave = userRole === 'manajemen' ? currentUser?.company : data.company;
    if (!companyToSave) {
        toast({ variant: "destructive", title: "Gagal Menyimpan", description: "Perusahaan harus dipilih." });
        return;
    }

    const dataToSave: any = { ...data, company: companyToSave };
    if (dataToSave.categoryName !== 'Generic Competency') delete dataToSave.level;
    if (dataToSave.categoryName !== 'Specific Competency') {
        delete dataToSave.department;
        delete dataToSave.position;
    }
    
    try {
        if (isNew) {
            delete dataToSave.id;
            await addKboSetup(dataToSave);
        } else {
            await updateKboSetup(data.id!, dataToSave);
        }
    } catch (e: any) {
        toast({ variant: "destructive", title: "Gagal", description: e.message });
    }
  };

  const openDeleteDialog = (item: KboSetup) => {
    setSetupsToDelete([item]);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (setupsToDelete && setupsToDelete.length > 0) {
        const idsToDelete = setupsToDelete.map(s => s.id);
        await Promise.all(idsToDelete.map(id => deleteKboSetup(id)));
        setSetupsToDelete(null);
        setSelectedRowIds(prev => prev.filter(id => !idsToDelete.includes(id)));
        toast({ title: 'Data Dihapus', description: `${idsToDelete.length} pengaturan kompetensi telah dihapus.` });
    }
  };
  
  return (
    <ResponsivePage>
      <PageHeader 
        title="Pustaka Kompetensi (KBO)"
        description="Kelola seluruh dimensi perilaku dan indikator penilaian kompetensi di tingkat holding maupun cabang."
        icon={BrainCircuit}
        actions={
            <div className="flex flex-wrap items-center gap-2">
                 {selectedRowIds.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 sm:h-10 gap-1 font-bold shadow-sm">
                          Aksi Massal ({selectedRowIds.length})
                          <ChevronDown className="size-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="z-[350]">
                        <DropdownMenuLabel className="text-[10px] font-black uppercase opacity-60">Pilih Aksi</DropdownMenuLabel>
                        <DropdownMenuItem onClick={handleBulkExport}><Download size={14} className="mr-2"/> Ekspor Pilihan</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleBulkDelete} className="text-destructive font-bold">
                          <Trash2 className="size-14 mr-2" /> Hapus Permanen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                <Button size="sm" className="h-9 sm:h-10 gap-1 font-bold shadow-lg active:scale-95 transition-all" onClick={handleAddItem}>
                  <PlusCircle className="h-4 w-4" />
                  Buat Pengaturan
                </Button>
            </div>
        }
      />

      <ResponsiveToolbar>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="Cari kategori atau jabatan..." 
            className="pl-9 h-10 border-none shadow-none bg-background/50 focus-visible:ring-primary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
            {userRole === 'superadmin' && (
                <Select value={selectedCompanyFilter} onValueChange={setSelectedCompanyFilter}>
                    <SelectTrigger className="w-full sm:w-[200px] h-10 bg-background border-none shadow-sm text-[11px] font-black uppercase">
                        <Building size={14} className="mr-2 text-primary" />
                        <SelectValue placeholder="Konteks Data" />
                    </SelectTrigger>
                    <SelectContent className="z-[350]">
                        <SelectItem value="all">Semua Klien & Global</SelectItem>
                        <SelectItem value="Global">Hanya Global</SelectItem>
                        {manageableCompanies.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            )}
        </div>
      </ResponsiveToolbar>

      <div className="pt-4">
            <Accordion type="multiple" className="w-full space-y-6" defaultValue={Object.keys(groupedSetups)}>
              {Object.entries(groupedSetups).map(([categoryName, setups]) => (
                <AccordionItem value={categoryName} key={categoryName} className="border-none">
                    <div className="space-y-4">
                       <div className="flex items-center justify-between px-1">
                           <div className="flex items-center gap-3">
                               <Checkbox
                                    id={`select-all-${categoryName}`}
                                    checked={setups.length > 0 && setups.every(s => selectedRowIds.includes(s.id))}
                                    onCheckedChange={(checked) => handleSelectAllInCategory(categoryName, !!checked)}
                                />
                                <Label htmlFor={`select-all-${categoryName}`} className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 cursor-pointer">{categoryName}</Label>
                           </div>
                           <Badge variant="outline" className="text-[9px] font-black border-none bg-muted/50 text-muted-foreground">{setups.length} SET</Badge>
                       </div>
                       
                       {setups.length > 0 ? (
                           <AdaptiveCardGrid complexity="medium">
                               {setups.map(setup => {
                                   const totalKeyBehaviors = setup.dimensions.reduce((sum, dim) => sum + dim.keyBehaviors.length, 0);
                                   const isSelected = selectedRowIds.includes(setup.id);
                                   
                                   return (
                                       <Card key={setup.id} className={cn(
                                           "border-border/40 hover:shadow-md transition-all group relative overflow-hidden bg-background",
                                           isSelected && "ring-2 ring-primary border-primary bg-primary/5 shadow-lg"
                                        )}>
                                           <CardHeader className="p-4 pb-2">
                                               <div className="flex justify-between items-start gap-4">
                                                   <div className="flex items-center gap-3 min-w-0">
                                                       <Checkbox 
                                                            checked={isSelected} 
                                                            onCheckedChange={() => handleRowSelect(setup.id)}
                                                            className="mt-1"
                                                       />
                                                       <div className="min-w-0">
                                                            <h4 className="font-black text-sm uppercase tracking-tight text-slate-900 truncate" title={getContextName(setup)}>{getContextName(setup)}</h4>
                                                            <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60 truncate">{setup.company}</p>
                                                       </div>
                                                   </div>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted shrink-0">
                                                                <MoreHorizontal className="size-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="z-[350]">
                                                            <DropdownMenuLabel className="text-[10px] font-black uppercase opacity-60 font-black">Manajemen Set</DropdownMenuLabel>
                                                            <DropdownMenuItem onClick={() => handleViewDetails(setup)} className="text-xs"><Eye className="size-3.5 mr-2"/> Lihat Rincian</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleViewSimulation(setup)} className="text-xs"><ClipboardPen className="size-3.5 mr-2"/> Simulasi Penilaian</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleEditItem(setup)} className="text-xs"><Pencil className="size-3.5 mr-2"/> Ubah Deskripsi</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleDuplicateItem(setup)} className="text-xs"><Copy className="size-3.5 mr-2"/> Duplikat (Clone)</DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem className="text-destructive font-bold text-xs" onClick={() => openDeleteDialog(setup)}><Trash2 className="size-3.5 mr-2"/> Hapus Permanen</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                               </div>
                                           </CardHeader>
                                           <CardContent className="p-4 pt-2">
                                               <div className="flex items-center gap-4 text-[10px] font-black uppercase text-muted-foreground tracking-tighter">
                                                   <div className="flex items-center gap-1.5"><LayoutGrid size={12} className="text-primary opacity-40" /> {setup.dimensions.length} Dimensi</div>
                                                   <div className="flex items-center gap-1.5"><CheckSquare size={12} className="text-primary opacity-40" /> {totalKeyBehaviors} Perilaku</div>
                                               </div>
                                           </CardContent>
                                       </Card>
                                   )
                               })}
                           </AdaptiveCardGrid>
                       ) : (
                           <div className="py-20 text-center border-2 border-dashed rounded-3xl opacity-20">
                               <p className="font-bold uppercase text-[10px] tracking-widest italic">Belum ada data pengaturan</p>
                           </div>
                       )}
                    </div>
                </AccordionItem>
              ))}
            </Accordion>
      </div>

      <KboSetupFormSheet
        isOpen={isFormSheetOpen}
        onOpenChange={setFormSheetOpen}
        setup={selectedSetup}
        isCloning={isCloning}
        onSave={handleSaveItem}
        companies={manageableCompanies}
      />

      {selectedSetup && (
        <Sheet open={isDetailSheetOpen} onOpenChange={setDetailSheetOpen}>
            <SheetContent
                className={cn("p-0 flex flex-col transition-all duration-300 border-none shadow-2xl", isDetailSheetExpanded ? "w-full sm:max-w-full" : "w-full sm:max-w-3xl")}
                side="right"
            >
                <SheetHeader className="p-6 pb-2 border-b flex-row items-center justify-between bg-muted/20">
                    <div className="space-y-1">
                        <SheetTitle className="font-black text-xl uppercase tracking-tighter">Rincian Kompetensi</SheetTitle>
                        <SheetDescription className="text-xs font-bold uppercase tracking-wider text-primary">{selectedSetup.categoryName}</SheetDescription>
                    </div>
                     <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="hidden sm:flex" onClick={() => setDetailSheetExpanded(!isDetailSheetExpanded)} >
                            {isDetailSheetExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                        </Button>
                        <SheetClose asChild><Button variant="ghost" size="icon"><X size={20} /></Button></SheetClose>
                     </div>
                </SheetHeader>
                 <ScrollArea className="flex-1 min-h-0 bg-background"><KboDetailView setup={selectedSetup} /></ScrollArea>
            </SheetContent>
        </Sheet>
      )}
      
      {selectedSetup && (
         <Sheet open={isSimulationSheetOpen} onOpenChange={setSimulationSheetOpen}>
            <SheetContent 
                className={cn("p-0 flex flex-col transition-all duration-300 h-full border-none shadow-2xl", isSimulationSheetExpanded ? "w-full" : "w-full sm:max-w-2xl")}
                side="right"
            >
                 <SheetHeader className="p-6 pb-2 border-b flex-row items-center justify-between bg-muted/20">
                    <div className="space-y-1">
                        <SheetTitle className="font-black text-xl uppercase tracking-tighter">Simulator Penilaian</SheetTitle>
                        <SheetDescription className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Gunakan untuk validasi bobot skor indikator</SheetDescription>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="hidden sm:flex" onClick={() => setSimulationSheetExpanded(!isSimulationSheetExpanded)} >
                            {isSimulationSheetExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                        </Button>
                        <SheetClose asChild><Button variant="ghost" size="icon"><X size={20} /></Button></SheetClose>
                    </div>
                </SheetHeader>
                <ScrollArea className="flex-1 min-h-0 bg-background/50"><KboSimulationView setup={selectedSetup} /></ScrollArea>
            </SheetContent>
         </Sheet>
      )}

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        itemName={setupsToDelete?.length === 1 ? `pengaturan KBO untuk ${getContextName(setupsToDelete[0])}` : `${setupsToDelete?.length || 0} pengaturan`}
        itemType="pengaturan kompetensi"
      />
    </ResponsivePage>
  );
}
