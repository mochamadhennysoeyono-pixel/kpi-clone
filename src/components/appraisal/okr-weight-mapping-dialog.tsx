// src/components/appraisal/okr-weight-mapping-dialog.tsx
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Target, AlertCircle, Save, Loader2, Users } from "lucide-react";
import { useMasterData } from "@/contexts/master-data-context";
import type { Employee, AppraisalSetup, OKR, IndividualWeightOverride } from "@/types";
import { ScrollArea } from "../ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { parse, lastDayOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

interface OkrWeightMappingDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  setup: AppraisalSetup;
}

export function OkrWeightMappingDialog({ isOpen, onOpenChange, setup }: OkrWeightMappingDialogProps) {
    const { employees, okrs, updateAppraisalSetup } = useMasterData();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    
    // Local state for weight overrides
    const [overrides, setOverrides] = useState<Record<string, IndividualWeightOverride>>({});

    useEffect(() => {
        if (isOpen && setup) {
            setOverrides(setup.individualWeightOverrides || {});
        }
    }, [isOpen, setup]);

    // Detect subjects who have active OKRs in the appraisal period (including contributors)
    const subjectsWithOkrs = useMemo(() => {
        if (!setup) return [];

        const allMappedSubjectIds = new Set<string>();
        if (setup.customRaterMappings) {
            Object.values(setup.customRaterMappings).forEach(kboMap => {
                Object.entries(kboMap).forEach(([subjectId, mapping]) => {
                    if (mapping.isSubjectActive) allMappedSubjectIds.add(subjectId);
                });
            });
        }

        const periodStart = parse(setup.periodStart || setup.period || '', 'yyyy-MM', new Date());
        const periodEnd = lastDayOfMonth(parse(setup.periodEnd || setup.period || '', 'yyyy-MM', new Date()));

        return Array.from(allMappedSubjectIds).map(id => {
            const employee = employees.find(e => e.id === id);
            if (!employee) return null;

            const activeOkrs = okrs.filter(okr => {
                if (okr.status === 'Draft' || okr.status === 'Waiting for Approval') return false;
                
                // Broad participation check
                const isParticipant = okr.ownerId === id || okr.keyResults.some(kr => 
                    kr.ownerId === id ||
                    kr.contributors?.some(c => c.ownerId === id) ||
                    kr.milestones?.some(m => m.ownerId === id) ||
                    kr.checklist?.some(c => c.ownerId === id)
                );

                if (!isParticipant) return false;

                const okrStart = okr.startDate.toDate();
                const okrEnd = okr.endDate.toDate();
                
                // Check for overlap
                return (okrStart <= periodEnd && okrEnd >= periodStart);
            });

            if (activeOkrs.length === 0) return null;

            return {
                employee,
                activeOkrs,
                defaultKpiWeight: setup.componentsByLevel[employee.level]?.kpiWeight || 0,
                defaultKboWeight: setup.componentsByLevel[employee.level]?.kboWeight || 0,
            };
        }).filter((item): item is NonNullable<typeof item> => !!item);

    }, [setup, employees, okrs]);

    const handleToggleOkr = (employeeId: string, enabled: boolean, defaultKpi: number, defaultKbo: number) => {
        setOverrides(prev => {
            const newOverrides = { ...prev };
            if (enabled) {
                // Initialize with 20% OKR weight by default
                newOverrides[employeeId] = {
                    kpiWeight: Math.max(0, defaultKpi - 10),
                    kboWeight: Math.max(0, defaultKbo - 10),
                    okrWeight: 20,
                };
            } else {
                delete newOverrides[employeeId];
            }
            return newOverrides;
        });
    };

    const handleWeightChange = (employeeId: string, field: keyof IndividualWeightOverride, value: number) => {
        setOverrides(prev => ({
            ...prev,
            [employeeId]: {
                ...prev[employeeId],
                [field]: value
            }
        }));
    };

    const handleSave = async () => {
        // Validate all overrides sum to 100
        const invalidOverrides = Object.entries(overrides).filter(([_, val]) => {
            return val.kpiWeight + val.kboWeight + val.okrWeight !== 100;
        });

        if (invalidOverrides.length > 0) {
            toast({
                variant: 'destructive',
                title: "Bobot Tidak Valid",
                description: "Pastikan total bobot KPI, KBO, dan OKR berjumlah tepat 100% untuk semua karyawan."
            });
            return;
        }

        setIsLoading(true);
        try {
            await updateAppraisalSetup(setup.id, { individualWeightOverrides: overrides });
            toast({ title: "Bobot OKR Berhasil Disimpan" });
            onOpenChange(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Gagal Menyimpan", description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    if (!setup) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl flex flex-col h-full max-h-[85vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Target className="text-primary" />
                        Integrasi & Penyesuaian Bobot OKR (Owner & Tim)
                    </DialogTitle>
                    <DialogDescription>
                        Karyawan di bawah ini terdeteksi menjalankan atau berkontribusi dalam OKR aktif. Sesuaikan bobot penilaian akhir mereka di sini.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 min-h-0 py-4">
                    <ScrollArea className="h-full border rounded-md">
                        {subjectsWithOkrs.length > 0 ? (
                            <Table>
                                <TableHeader className="sticky top-0 bg-background z-10">
                                    <TableRow>
                                        <TableHead className="w-[30%]">Karyawan</TableHead>
                                        <TableHead className="w-[15%] text-center">Gunakan OKR</TableHead>
                                        <TableHead className="w-[15%] text-center">Bobot KPI %</TableHead>
                                        <TableHead className="w-[15%] text-center">Bobot KBO %</TableHead>
                                        <TableHead className="w-[15%] text-center">Bobot OKR %</TableHead>
                                        <TableHead className="w-[10%] text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {subjectsWithOkrs.map(({ employee, activeOkrs, defaultKpiWeight, defaultKboWeight }) => {
                                        const isOverridden = !!overrides[employee.id];
                                        const current = overrides[employee.id] || { kpiWeight: defaultKpiWeight, kboWeight: defaultKboWeight, okrWeight: 0 };
                                        const total = current.kpiWeight + current.kboWeight + current.okrWeight;
                                        
                                        const hasDirectOwnership = activeOkrs.some(o => o.ownerId === employee.id);

                                        return (
                                            <TableRow key={employee.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <User className="h-4 w-4 text-muted-foreground" />
                                                        <span className="font-medium text-sm">{employee.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-1 ml-6">
                                                        <Badge variant={hasDirectOwnership ? "default" : "secondary"} className="text-[10px]">
                                                            {hasDirectOwnership ? <Target className="h-2 w-2 mr-1"/> : <Users className="h-2 w-2 mr-1"/>}
                                                            {activeOkrs.length} OKR
                                                        </Badge>
                                                        <span className="text-[10px] text-muted-foreground italic">Std: {defaultKpiWeight}/{defaultKboWeight}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Switch 
                                                        checked={isOverridden}
                                                        onCheckedChange={(checked) => handleToggleOkr(employee.id, checked, defaultKpiWeight, defaultKboWeight)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input 
                                                        type="number" 
                                                        value={current.kpiWeight}
                                                        onChange={(e) => handleWeightChange(employee.id, 'kpiWeight', parseInt(e.target.value) || 0)}
                                                        disabled={!isOverridden}
                                                        className="text-center h-8"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input 
                                                        type="number" 
                                                        value={current.kboWeight}
                                                        onChange={(e) => handleWeightChange(employee.id, 'kboWeight', parseInt(e.target.value) || 0)}
                                                        disabled={!isOverridden}
                                                        className="text-center h-8"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input 
                                                        type="number" 
                                                        value={current.okrWeight}
                                                        onChange={(e) => handleWeightChange(employee.id, 'okrWeight', parseInt(e.target.value) || 0)}
                                                        disabled={!isOverridden}
                                                        className="text-center h-8 font-bold text-primary"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <span className={cn("font-bold text-sm", total !== 100 ? "text-destructive" : "text-green-600")}>
                                                        {total}%
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground p-8 text-center">
                                <AlertCircle className="h-12 w-12 mb-4 opacity-20" />
                                <p>Tidak ada subjek appraisal yang menjalankan atau berkontribusi pada OKR di periode ini.</p>
                            </div>
                        )}
                    </ScrollArea>
                </div>

                <DialogFooter className="border-t pt-4">
                    <DialogClose asChild><Button variant="outline">Batal</Button></DialogClose>
                    <Button onClick={handleSave} disabled={isLoading || subjectsWithOkrs.length === 0}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" />
                        Simpan Penyesuaian Bobot
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
