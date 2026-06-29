// src/components/appraisal/appraisal-mapping-dialog.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Edit, AlertCircle, Maximize2, Minimize2, Send } from "lucide-react";
import { useMasterData } from "@/contexts/master-data-context";
import type { Employee, AppraisalSetup, KboSetup } from "@/types";
import { RaterSelectionDialog, type RaterSelection } from './rater-selection-dialog';
import { SupervisorSelectionDialog } from './supervisor-selection-dialog';
import { ScrollArea } from "../ui/scroll-area";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";


interface Raters {
    selfEnabled: boolean;
    supervisor: Employee | null;
    peers: RaterSelection[];
    subordinates: RaterSelection[];
}

interface MappingData {
    id: string;
    subject: Employee;
    raters: Raters;
    isSubjectActive: boolean;
    _peerOptions?: Employee[];
    _subordinateOptions?: Employee[];
    _supervisorOptions?: Employee[];
}

interface AppraisalMappingDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  setup: AppraisalSetup | null;
  kboSetup: KboSetup | null;
  activeLevels: Set<keyof Employee['level']>;
}

const getContextName = (setup: KboSetup): string => {
    if (setup.categoryName === 'Generic Competency') return `Level: ${setup.level || 'N/A'}`;
    if (setup.categoryName === 'Specific Competency') return `Jabatan: ${setup.position || 'N/A'}`;
    if (setup.categoryName === 'Core Competency') return setup.company === 'Global' ? 'Global' : `Perusahaan: ${setup.company}`;
    return setup.company;
}

export function AppraisalMappingDialog({ isOpen, onOpenChange, setup, kboSetup, activeLevels }: AppraisalMappingDialogProps) {
    const { employees, updateAppraisalSetup, generateAppraisalTasks, appraisalTasks } = useMasterData();
    const { toast } = useToast();
    const [customMappings, setCustomMappings] = useState<AppraisalSetup['customRaterMappings']>({});
    const [isExpanded, setIsExpanded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [positionFilter, setPositionFilter] = useState('all');
    
    const tasksPublished = useMemo(() => {
        if (!setup || !kboSetup) return false;
        // Check if a task exists for this specific kboSetup
        return appraisalTasks.some(task => task.kboSetupId === kboSetup.id);
    }, [appraisalTasks, setup, kboSetup]);


    useEffect(() => {
        if (setup) {
            setCustomMappings(setup.customRaterMappings || {});
        } else {
            // Reset filters when dialog is closed or setup changes
            setDepartmentFilter('all');
            setPositionFilter('all');
        }
    }, [setup]);


    const baseMappingData = useMemo((): MappingData[] => {
        if (!setup || !kboSetup) return [];

        const companyEmployees = employees.filter(e => 
            e.company === setup.company && 
            e.status === 'Aktif' && 
            e.role === 'user' &&
            activeLevels.has(e.level) // Filter by active levels for this KBO context
        );

        return companyEmployees.map(employee => {
            const customMapForKboSetup = (customMappings || {})?.[kboSetup.id]?.[employee.id];

            const isSubjectActive = customMapForKboSetup?.isSubjectActive ?? false;

            // Default to OFF unless specified
            const selfEnabled = customMapForKboSetup?.hasOwnProperty('selfEnabled') ? customMapForKboSetup.selfEnabled! : false;

            const supervisorId = customMapForKboSetup?.hasOwnProperty('supervisorId') ? customMapForKboSetup.supervisorId : null;
            const finalSupervisor = supervisorId ? employees.find(e => e.id === supervisorId) : null;

            const finalPeers = customMapForKboSetup?.hasOwnProperty('peers') ? customMapForKboSetup.peers! : [];
            
            const finalSubordinates = customMapForKboSetup?.hasOwnProperty('subordinates') ? customMapForKboSetup.subordinates! : [];
            
            let allPeerOptions: Employee[] = [];
            if (['Manager', 'Direktur'].includes(employee.level) || !employee.reportsTo) {
                 allPeerOptions = employees.filter(e => e.company === employee.company && e.department === employee.department && e.level === employee.level && e.id !== employee.id && e.status === 'Aktif');
            } else {
                allPeerOptions = employees.filter(e => e.reportsTo === employee.reportsTo && e.id !== employee.id && e.status === 'Aktif');
            }
            
            const allSubordinateOptions = employees.filter(e => e.reportsTo === employee.id && e.status === 'Aktif');
            const superiorLevels: Employee['level'][] = employee.level === 'Staff' ? ['Supervisor', 'Manager', 'Direktur'] : employee.level === 'Supervisor' ? ['Manager', 'Direktur'] : employee.level === 'Manager' ? ['Direktur'] : [];
            const supervisorOptions = employees.filter(e => e.company === employee.company && superiorLevels.includes(e.level) && e.status === 'Aktif');

            return {
                id: employee.id,
                subject: employee,
                isSubjectActive,
                raters: { selfEnabled, supervisor: finalSupervisor, peers: finalPeers, subordinates: finalSubordinates },
                _peerOptions: allPeerOptions,
                _subordinateOptions: allSubordinateOptions,
                _supervisorOptions: supervisorOptions
            }
        });
    }, [setup, kboSetup, employees, customMappings, activeLevels]);
    
    const departmentOptions = useMemo(() => {
        return [...new Set(baseMappingData.map(m => m.subject.department))];
    }, [baseMappingData]);

    const positionOptions = useMemo(() => {
        if (departmentFilter === 'all') {
            return [...new Set(baseMappingData.map(m => m.subject.position))];
        }
        return [...new Set(baseMappingData.filter(m => m.subject.department === departmentFilter).map(m => m.subject.position))];
    }, [baseMappingData, departmentFilter]);

    const mappingData = useMemo(() => {
        return baseMappingData.filter(m => {
            const deptMatch = departmentFilter === 'all' || m.subject.department === departmentFilter;
            const posMatch = positionFilter === 'all' || m.subject.position === positionFilter;
            return deptMatch && posMatch;
        });
    }, [baseMappingData, departmentFilter, positionFilter]);

    const handleOpenDialog = (subject: Employee, raterType: 'peers' | 'subordinates' | 'supervisor') => {
        const fullMappingData = baseMappingData.find(m => m.id === subject.id);
        if (!fullMappingData) return;

        if (raterType === 'peers') {
            setPeerDialogState({ isOpen: true, subject, allOptions: (fullMappingData._peerOptions || []).map(e => ({ id: e.id, name: e.name })), currentSelection: fullMappingData.raters.peers });
        } else if (raterType === 'subordinates') {
            setSubordinateDialogState({ isOpen: true, subject, allOptions: (fullMappingData._subordinateOptions || []).map(e => ({ id: e.id, name: e.name })), currentSelection: fullMappingData.raters.subordinates });
        } else if (raterType === 'supervisor') {
            setSupervisorDialogState({ isOpen: true, subject, allOptions: (fullMappingData._supervisorOptions || []).map(e => ({ id: e.id, name: e.name })), currentSelectionId: fullMappingData.raters.supervisor?.id || null });
        }
    }
    
    const handleSelfToggle = (subjectId: string, enabled: boolean) => {
         setCustomMappings(prev => ({
            ...prev,
            [kboSetup!.id]: {
                ...(prev[kboSetup!.id] || {}),
                [subjectId]: { ...((prev[kboSetup!.id] || {})[subjectId] || {}), selfEnabled: enabled }
            }
        }));
    };
    
    const handleSubjectActiveToggle = (subjectId: string, enabled: boolean) => {
         setCustomMappings(prev => ({
            ...prev,
            [kboSetup!.id]: {
                ...(prev[kboSetup!.id] || {}),
                [subjectId]: { ...((prev[kboSetup!.id] || {})[subjectId] || {}), isSubjectActive: enabled }
            }
        }));
    };

    const handleSaveSupervisor = (subjectId: string, supervisorId: string | null) => {
        setCustomMappings(prev => ({
            ...prev,
            [kboSetup!.id]: {
                ...(prev[kboSetup!.id] || {}),
                [subjectId]: { ...((prev[kboSetup!.id] || {})[subjectId] || {}), supervisorId: supervisorId }
            }
        }));
    };

    const handleSaveSelection = (subjectId: string, raterType: 'peers' | 'subordinates', newSelection: RaterSelection[]) => {
        setCustomMappings(prev => ({
            ...prev,
            [kboSetup!.id]: {
                ...(prev[kboSetup!.id] || {}),
                [subjectId]: { ...((prev[kboSetup!.id] || {})[subjectId] || {}), [raterType]: newSelection }
            }
        }));
    };

    const handleSaveChanges = async (publish: boolean = false) => {
        if (!setup || !kboSetup) return;
        setIsLoading(true);

        const currentMappings = setup.customRaterMappings || {};
        const updatedMappings = {
            ...currentMappings,
            [kboSetup.id]: {
                ...(currentMappings[kboSetup.id] || {}),
                ...(customMappings[kboSetup.id] || {})
            }
        };

        try {
            await updateAppraisalSetup(setup.id, { customRaterMappings: updatedMappings });
            
            if (publish) {
                 const setupWithLatestMappings = { ...setup, customRaterMappings: updatedMappings };
                 await generateAppraisalTasks(setupWithLatestMappings, kboSetup.id);
                 toast({
                    title: "Tugas Dipublikasikan!",
                    description: `Tugas penilaian untuk ${kboSetup.categoryName} (${getContextName(kboSetup)}) telah dibuat/diperbarui.`
                });
            } else {
                 toast({
                    title: "Pemetaan Disimpan",
                    description: "Perubahan pemetaan penilai kustom telah berhasil disimpan."
                });
            }

            if (publish) {
                onOpenChange(false);
            }
        } catch (error: any) {
             toast({
                variant: "destructive",
                title: "Gagal Menyimpan",
                description: error.message || "Terjadi kesalahan saat menyimpan pemetaan."
            });
        } finally {
            setIsLoading(false);
        }
    };

    const hasChanges = useMemo(() => {
        const originalMappingForKbo = setup?.customRaterMappings?.[kboSetup?.id || ''] || {};
        const currentMappingForKbo = customMappings?.[kboSetup?.id || ''] || {};
        return JSON.stringify(currentMappingForKbo) !== JSON.stringify(originalMappingForKbo);
    }, [customMappings, setup?.customRaterMappings, kboSetup]);
    
    const publishButtonText = tasksPublished ? "Publikasi Pembaruan Penilai" : "Publikasi Tugas Penilai";
    
    // State for the rater selection dialogs
    const [peerDialogState, setPeerDialogState] = useState({ isOpen: false, subject: null as Employee | null, allOptions: [] as RaterSelection[], currentSelection: [] as RaterSelection[] });
    const [subordinateDialogState, setSubordinateDialogState] = useState({ isOpen: false, subject: null as Employee | null, allOptions: [] as RaterSelection[], currentSelection: [] as RaterSelection[] });
    const [supervisorDialogState, setSupervisorDialogState] = useState({ isOpen: false, subject: null as Employee | null, allOptions: [] as RaterSelection[], currentSelectionId: null as string | null });

    if (!setup || !kboSetup) return null;

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className={cn("flex flex-col h-full max-h-[90vh]", isExpanded ? "max-w-[95vw]" : "sm:max-w-4xl lg:max-w-6xl")}>
            <DialogHeader className="flex-row items-center justify-between pr-12">
                <div>
                    <DialogTitle>Pemetaan Penilai: <Badge variant="secondary">{kboSetup.categoryName}</Badge> <Badge variant="outline">{getContextName(kboSetup)}</Badge></DialogTitle>
                    <DialogDescription>
                        Tinjau dan sesuaikan penilai untuk periode {setup.period || `${setup.periodStart} - ${setup.periodEnd}`}.
                    </DialogDescription>
                </div>
                 <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} >
                    {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                 </Button>
            </DialogHeader>
            <div className="flex flex-col sm:flex-row gap-4">
                 <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="w-full sm:w-[200px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Departemen</SelectItem>
                        {departmentOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                 </Select>
                  <Select value={positionFilter} onValueChange={setPositionFilter}>
                    <SelectTrigger className="w-full sm:w-[200px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Jabatan</SelectItem>
                        {positionOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                 </Select>
            </div>
            
            <div className="flex-1 min-h-0">
                <ScrollArea className="h-full">
                {mappingData.length > 0 ? (
                    <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                            <TableRow>
                                <TableHead className="w-[20%]">Subjek (Yang Dinilai)</TableHead>
                                <TableHead className="w-[12%] text-center">Aktifkan Penilaian</TableHead>
                                <TableHead className="w-[15%] text-center">Diri Sendiri</TableHead>
                                <TableHead className="w-[18%]">Atasan</TableHead>
                                <TableHead className="w-[17.5%]">Rekan Sejawat</TableHead>
                                <TableHead className="w-[17.5%]">Bawahan</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mappingData.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium align-top">
                                    <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    {item.subject.name}
                                    </div>
                                    <p className="text-xs text-muted-foreground pl-6">{item.subject.position}</p>
                                </TableCell>
                                <TableCell className="align-top text-center">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <Switch
                                            id={`active-${item.id}`}
                                            checked={item.isSubjectActive}
                                            onCheckedChange={(checked) => handleSubjectActiveToggle(item.id, !!checked)}
                                        />
                                         <Label htmlFor={`active-${item.id}`} className="text-xs">{item.isSubjectActive ? 'Aktif' : 'Nonaktif'}</Label>
                                    </div>
                                </TableCell>
                                <TableCell className="align-top text-center">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <Switch
                                            id={`self-${item.id}`}
                                            checked={item.raters.selfEnabled}
                                            onCheckedChange={(checked) => handleSelfToggle(item.id, !!checked)}
                                        />
                                         <Label htmlFor={`self-${item.id}`} className="text-xs">{item.raters.selfEnabled ? 'Aktif' : 'Nonaktif'}</Label>
                                    </div>
                                </TableCell>
                                <TableCell className="align-top">
                                    <div className="flex items-start gap-2">
                                        <div className="flex flex-wrap gap-1">
                                            {item.raters.supervisor ? (
                                                <Badge variant="secondary">{item.raters.supervisor.name}</Badge>
                                            ) : <span className="text-xs text-muted-foreground">- Tidak Ada -</span>}
                                        </div>
                                         <Button variant="ghost" size="sm" className="ml-auto" onClick={() => handleOpenDialog(item.subject, 'supervisor')}>
                                            <Edit className="mr-2 h-3 w-3" /> Sesuaikan
                                        </Button>
                                    </div>
                                </TableCell>
                                <TableCell className="align-top">
                                <div className="flex items-start gap-2">
                                    <div className="flex flex-wrap gap-1">
                                    {item.raters.peers.length > 0 ? (
                                        item.raters.peers.map(peer => <Badge key={peer.id} variant="outline">{peer.name}</Badge>)
                                    ) : ( <span className="text-xs text-muted-foreground">-</span> )}
                                    </div>
                                    <Button variant="ghost" size="sm" className="ml-auto" onClick={() => handleOpenDialog(item.subject, 'peers')}>
                                        <Edit className="mr-2 h-3 w-3" /> Sesuaikan
                                    </Button>
                                </div>
                                </TableCell>
                                <TableCell className="align-top">
                                <div className="flex items-start gap-2">
                                    <div className="flex flex-wrap gap-1">
                                    {item.raters.subordinates.length > 0 ? (
                                        item.raters.subordinates.map(sub => <Badge key={sub.id} variant="outline">{sub.name}</Badge>)
                                    ) : ( <span className="text-xs text-muted-foreground">-</span> )}
                                    </div>
                                <Button variant="ghost" size="sm" className="ml-auto" onClick={() => handleOpenDialog(item.subject, 'subordinates')}>
                                        <Edit className="mr-2 h-3 w-3" /> Sesuaikan
                                    </Button>
                                </div>
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                        <Alert variant="default" className="text-sm max-w-md mx-auto">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Tidak Ada Subjek Penilaian</AlertTitle>
                            <AlertDescription>
                            Tidak ada karyawan dengan level jabatan yang relevan atau yang cocok dengan kriteria filter yang dipilih.
                            </AlertDescription>
                        </Alert>
                    </div>
                )}
                </ScrollArea>
            </div>
            <DialogFooter className="mt-auto pt-4 border-t gap-2">
                <Button type="button" onClick={() => handleSaveChanges(true)} disabled={isLoading}>
                    <Send className="mr-2 h-4 w-4" />
                    {publishButtonText}
                </Button>
                {hasChanges && (
                    <Button type="button" variant="outline" onClick={() => handleSaveChanges(false)} disabled={isLoading}>
                        Simpan Perubahan
                    </Button>
                )}
                 <DialogClose asChild>
                    <Button type="button" variant="secondary">
                    Tutup
                    </Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
    </Dialog>
     <RaterSelectionDialog
        isOpen={peerDialogState.isOpen}
        onOpenChange={(isOpen) => setPeerDialogState(prev => ({ ...prev, isOpen }))}
        subject={peerDialogState.subject}
        raterType="peers"
        allOptions={peerDialogState.allOptions}
        currentSelection={peerDialogState.currentSelection}
        onSave={handleSaveSelection}
    />
     <RaterSelectionDialog
        isOpen={subordinateDialogState.isOpen}
        onOpenChange={(isOpen) => setSubordinateDialogState(prev => ({ ...prev, isOpen }))}
        subject={subordinateDialogState.subject}
        raterType="subordinates"
        allOptions={subordinateDialogState.allOptions}
        currentSelection={subordinateDialogState.currentSelection}
        onSave={handleSaveSelection}
    />
     <SupervisorSelectionDialog
        isOpen={supervisorDialogState.isOpen}
        onOpenChange={(isOpen) => setSupervisorDialogState(prev => ({ ...prev, isOpen }))}
        subject={supervisorDialogState.subject}
        allOptions={supervisorDialogState.allOptions}
        currentSelectionId={supervisorDialogState.currentSelectionId}
        onSave={handleSaveSupervisor}
    />
    </>
  );
}
