// src/components/setup-kpi/kpi-setup-sheet.tsx
"use client";

import * as React from 'react';
import { useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { KpiSetup, KpiIndicator, KpiIndicatorCycle, Department, Position, Company, Employee } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, AlertCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useMasterData } from '@/contexts/master-data-context';
import { useAuth } from '@/contexts/auth-context';
import { IndicatorFields } from './indicator-fields';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { parse, lastDayOfMonth } from 'date-fns';
import { DEFAULT_KPI_CATEGORIES } from '@/lib/default-data';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';


const indicatorSchema = z.object({
  id: z.string(),
  code: z.string().optional(),
  category: z.string().min(1, "Kategori harus dipilih"),
  indicator: z.string().min(1, "Indikator harus diisi"),
  measurement: z.string().min(1, "Cara mengukur harus diisi"),
  cycle: z.enum(['Bulanan', '3 Bulan', '6 Bulan', '1 Tahun'], { required_error: "Siklus harus dipilih" }),
  target: z.coerce.number(), // Target can be 0 for 'Target Mutlak'
  targetFormat: z.enum(['Numerik', 'Persentase']),
  unit: z.string().min(1, "Satuan harus diisi"),
  weight: z.coerce.number().min(0, "Bobot harus positif").max(100, "Bobot maks 100"),
  calculationMethod: z.enum(['Target Maksimal', 'Target Minimal', 'Target Mutlak', 'Target Limit']).optional(),
  rollup: z.object({
      enabled: z.boolean(),
      method: z.enum(['SUM', 'AVERAGE']),
  }).optional(),
  source: z.object({
      indicatorId: z.string(),
      employeeId: z.string(),
  }).optional(),
  targetOverrides: z.record(z.number()).optional(),
});

const setupSchema = z.object({
  id: z.string().optional(),
  company: z.string().min(1, "Perusahaan harus dipilih"),
  position: z.string().min(1, "Posisi harus diisi"),
  department: z.string().min(1, "Departemen harus diisi"),
  level: z.enum(['Staff', 'Supervisor', 'Manager', 'Direktur'], { required_error: "Level jabatan harus dipilih" }),
  validFrom: z.string().min(1, "Periode mulai harus diisi"),
  validTo: z.string().min(1, "Periode selesai harus diisi"),
  minAchievement: z.coerce.number().min(0, "Nilai minimal harus positif").max(100, "Nilai maksimal 100").optional(),
  kpiInputDeadline: z.object({
    type: z.enum(['specific_date', 'last_day', 'relative_to_end']),
    value: z.coerce.number().optional(),
  }).optional(),
  status: z.enum(['Aktif', 'Tidak Aktif']),
  indicators: z.array(indicatorSchema).min(1, "Minimal harus ada satu indikator"),
  pendingIndicators: z.array(indicatorSchema).optional(),
}).refine(data => {
    const totalWeight = data.indicators.reduce((sum, ind) => sum + Number(ind.weight || 0), 0);
    return Math.abs(totalWeight - 100) < 0.001;
}, {
    message: "Total bobot semua indikator harus 100%",
    path: ["indicators"],
});


export type SetupFormValues = z.infer<typeof setupSchema>;

interface KpiSetupSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  setup?: KpiSetup;
  isCloning?: boolean;
  onSave: (data: Omit<KpiSetup, 'id'> & { id?: string }) => void;
  initialIndicators?: any[];
}

export function KpiSetupSheet({ isOpen, onOpenChange, setup, isCloning = false, onSave, initialIndicators = [] }: KpiSetupSheetProps) {
  const { kpiCategories, departments, positions, companies, employees, kpiSetups } = useMasterData();
  const { currentUser, userRole } = useAuth();
  const { toast } = useToast();

  const form = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      id: '',
      company: '',
      position: '',
      department: '',
      level: undefined,
      validFrom: '',
      validTo: '',
      minAchievement: 70,
      kpiInputDeadline: { type: 'specific_date', value: 25 },
      status: 'Aktif',
      indicators: [],
      pendingIndicators: [],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "indicators",
  });

  const companyForSetup = form.watch('company');
  const levelForSetup = form.watch('level');
  const positionForSetup = form.watch('position');
  const departmentForSetup = form.watch('department');
  const watchedIndicators = form.watch('indicators');
  const validFromForSetup = form.watch('validFrom');
  const validToForSetup = form.watch('validTo');
  
  const totalWeight = watchedIndicators.reduce((sum, ind) => sum + Number(ind.weight || 0), 0);
  const deadlineType = form.watch('kpiInputDeadline.type');

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

  const filteredCompanyOptions = useMemo(() => {
    if (userRole === 'superadmin') return companies.filter(c => c.status === 'Aktif');
    return manageableCompanies;
  }, [companies, manageableCompanies, userRole]);

  const filteredDepartmentOptions: Department[] = useMemo(() => {
    if (!companyForSetup) return [];
    return departments.filter(d => d.company === companyForSetup);
  }, [companyForSetup, departments]);
  
  const filteredPositionOptions: Position[] = useMemo(() => {
    if (!departmentForSetup) return [];
    return positions.filter(p => p.company === companyForSetup && p.department === departmentForSetup);
  }, [departmentForSetup, companyForSetup, positions]);
  
   const filteredCategoryOptions = useMemo(() => {
    const customCats = kpiCategories.filter(c => (c.company === companyForSetup && c.status === 'Aktif'));
    return [...DEFAULT_KPI_CATEGORIES, ...customCats];
  }, [kpiCategories, companyForSetup]);
  
  const isSupervisorOrManager = levelForSetup === 'Supervisor' || levelForSetup === 'Manager' || levelForSetup === 'Direktur';
  const hasPendingIndicators = useMemo(() => setup?.pendingIndicators && setup.pendingIndicators.length > 0, [setup]);
  
  const canChangeCompany = useMemo(() => {
    if (userRole === 'superadmin') return true;
    if (userRole === 'manajemen' && isHoldingAdmin) return true;
    return false;
  }, [userRole, isHoldingAdmin]);

  const handleCompanyChange = (companyName: string) => {
    form.setValue('company', companyName);
    form.setValue('department', '');
    form.setValue('position', '');
    form.setValue('level', undefined);
  }
  
  const handleDepartmentChange = (departmentName: string) => {
    form.setValue('department', departmentName);
    form.setValue('position', '');
    form.setValue('level', undefined);
  }

  useEffect(() => {
    if (!isOpen) return;

    const sanitizeIndicators = (indicators: KpiIndicator[] = []): Partial<KpiIndicator>[] => {
        return indicators.map(ind => ({
          ...ind,
          calculationMethod: ind.calculationMethod || 'Target Maksimal',
        }));
    };

    const defaultIndicator: Omit<KpiIndicator, 'code'> = {
      id: `IND${Date.now()}`,
      category: '', indicator: '', measurement: '', target: 100, cycle: 'Bulanan',
      targetFormat: 'Numerik', unit: 'Poin', weight: 100,
      calculationMethod: 'Target Maksimal',
    };
  
    if (setup) { 
      const sanitizedIndicators = sanitizeIndicators(setup.indicators || []);
      const deadlineValue = typeof setup.kpiInputDeadline === 'number'
        ? { type: 'specific_date' as const, value: setup.kpiInputDeadline }
        : setup.kpiInputDeadline;

      form.reset({
        ...setup,
        id: isCloning ? undefined : setup.id,
        position: isCloning ? '' : setup.position,
        department: isCloning ? '' : setup.department,
        level: isCloning ? undefined : setup.level,
        validFrom: setup.validFrom || '',
        validTo: setup.validTo || '',
        minAchievement: setup.minAchievement ?? 70,
        kpiInputDeadline: deadlineValue ?? { type: 'specific_date', value: 25 },
        indicators: sanitizedIndicators.length > 0 ? sanitizedIndicators.map(ind => ({ ...defaultIndicator, ...ind })) : [defaultIndicator],
        pendingIndicators: setup.pendingIndicators || [],
      });
    } else { 
      const manualIndicators = initialIndicators.length > 0
        ? initialIndicators.map((draft, i) => ({ 
            ...defaultIndicator, 
            id: `IND${Date.now()}-${i}`,
            indicator: draft.indicator || draft.kpiName, 
            weight: 0,
            category: draft.category,
            measurement: draft.measurement,
            cycle: draft.cycle,
            target: draft.target,
            targetFormat: draft.targetFormat,
            unit: draft.unit,
            calculationMethod: draft.calculationMethod,
        }))
        : [defaultIndicator];
      
      const defaultCompany = (userRole !== 'superadmin' && currentUser) ? currentUser.company || '' : '';
  
      form.reset({
        id: undefined,
        company: defaultCompany,
        position: '', department: '', level: undefined,
        validFrom: '', validTo: '',
        minAchievement: 70, kpiInputDeadline: { type: 'specific_date', value: 25 }, status: 'Aktif',
        indicators: manualIndicators,
        pendingIndicators: [],
      });
    }
  }, [isOpen, setup, isCloning, initialIndicators, form, currentUser, userRole, toast]);

  useEffect(() => {
    if (!isOpen || isCloning || !companyForSetup || !departmentForSetup || !positionForSetup || !levelForSetup || !validFromForSetup || !validToForSetup) {
      return;
    }

    const representativeEmployee = employees.find(e => 
      e.company === companyForSetup &&
      e.department === departmentForSetup &&
      e.position === positionForSetup &&
      e.level === levelForSetup &&
      e.status === 'Aktif'
    );
    
    let sourcedIndicators: KpiIndicator[] = [];

    if (representativeEmployee?.reportsTo) {
      const supervisor = employees.find(e => e.id === representativeEmployee.reportsTo);
      if (supervisor) {
        const supervisorSetup = kpiSetups.find(s => {
          if (
            s.company === supervisor.company &&
            s.position === supervisor.position &&
            s.department === supervisor.department &&
            s.level === supervisor.level &&
            s.status === 'Aktif'
          ) {
            const periodStart = parse(validFromForSetup, 'yyyy-MM', new Date());
            const periodEnd = lastDayOfMonth(parse(validToForSetup, 'yyyy-MM', new Date()));
            const setupStart = s.validFrom ? parse(s.validFrom, 'yyyy-MM', new Date()) : null;
            const setupEnd = s.validTo ? lastDayOfMonth(parse(s.validTo, 'yyyy-MM', new Date())) : null;
            return setupStart && setupEnd && periodStart <= setupEnd && periodEnd >= setupStart;
          }
          return false;
        });
        
        if (supervisorSetup) {
          const rolledDownIndicators = supervisorSetup.indicators
            .filter(ind => ind.rollup?.enabled)
            .map(supInd => ({
              ...supInd,
              id: `SRC-${supInd.id}-${representativeEmployee.id}`,
              source: { indicatorId: supInd.id, employeeId: supervisor.id },
              weight: 0,
            }));
          sourcedIndicators.push(...rolledDownIndicators as KpiIndicator[]);
        }
      }
    }
    
    if (sourcedIndicators.length > 0) {
        const currentIndicators = form.getValues('indicators').filter(ind => !ind.source);
        const existingSourcedIds = new Set(currentIndicators.map(i => i.source?.indicatorId));
        const newSourcedIndicators = sourcedIndicators.filter(si => !existingSourcedIds.has(si.id));
        
        if (newSourcedIndicators.length > 0) {
            replace([...currentIndicators, ...newSourcedIndicators]);
        }
    }

  }, [isOpen, companyForSetup, departmentForSetup, positionForSetup, levelForSetup, validFromForSetup, validToForSetup, employees, kpiSetups, isCloning, form, replace]);



  const handleForceSave = () => {
    const data = form.getValues();
    const totalWeight = data.indicators.reduce((sum, ind) => sum + Number(ind.weight || 0), 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
        toast({
            variant: "destructive",
            title: "Total Bobot Harus 100%",
            description: `Total bobot saat ini adalah ${totalWeight.toFixed(0)}%. Harap sesuaikan sebelum menyimpan.`,
        });
        return;
    }
    onSubmit(data);
  }
  
  const onSubmit = (data: SetupFormValues) => {
    if (!data.id || isCloning) {
      const newPeriodStart = new Date(data.validFrom);
      const newPeriodEnd = new Date(data.validTo);

      const isOverlapping = kpiSetups.some(existingSetup => {
        if (
          existingSetup.company === data.company &&
          existingSetup.position === data.position &&
          existingSetup.department === data.department &&
          existingSetup.level === data.level &&
          existingSetup.id !== data.id
        ) {
          const existingStart = existingSetup.validFrom ? new Date(existingSetup.validFrom) : null;
          const existingEnd = existingSetup.validTo ? new Date(existingSetup.validTo) : null;
          return existingStart && existingEnd && newPeriodStart <= existingEnd && newPeriodEnd >= existingStart;
        }
        return false;
      });

      if (isOverlapping) {
        toast({
          variant: "destructive",
          title: "Pengaturan Tumpang Tindih",
          description: "Sudah ada pengaturan KPI yang aktif untuk jabatan dan periode ini. Silakan pilih periode lain.",
        });
        return;
      }
    }

    const cleanedIndicators = data.indicators.map((indicator) => {
        const cleanIndicator: any = { ...indicator };
        if (!cleanIndicator.rollup?.enabled) delete cleanIndicator.rollup;
        if (isCloning && cleanIndicator.targetOverrides) delete cleanIndicator.targetOverrides;
        cleanIndicator.calculationMethod = cleanIndicator.calculationMethod || 'Target Maksimal';
        return cleanIndicator;
    });

    const dataToSave = { 
        ...data, 
        indicators: cleanedIndicators, 
        description: '',
        pendingIndicators: [],
    };

    if (!dataToSave.id) delete (dataToSave as any).id;
    onSave(dataToSave as KpiSetup);
    onOpenChange(false);
  };
  
  const handleAcceptPending = (pendingIndicator: KpiIndicator) => {
    const allIndicators = form.getValues('indicators');
    const existingSourcedIndicatorIndex = allIndicators.findIndex(
      (ind) => ind.source?.indicatorId === pendingIndicator.source?.indicatorId
    );
  
    const newIndicator = { ...pendingIndicator, weight: 0 };
  
    if (existingSourcedIndicatorIndex > -1) {
      const oldWeight = allIndicators[existingSourcedIndicatorIndex].weight;
      newIndicator.weight = oldWeight;
      const updatedIndicators = allIndicators.map((ind, index) => index === existingSourcedIndicatorIndex ? newIndicator : ind);
      replace(updatedIndicators);
    } else {
      append(newIndicator);
    }
    
    const currentPending = form.getValues('pendingIndicators') || [];
    const updatedPending = currentPending.filter(p => p.id !== pendingIndicator.id);
    form.setValue('pendingIndicators', updatedPending, { shouldValidate: true });
    
    toast({
      title: "Indikator Ditambahkan",
      description: "KPI baru dari Holding telah ditambahkan ke draf. Sesuaikan bobotnya agar total menjadi 100%.",
    });
  };
  
  const formErrors = form.formState.errors;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-4xl md:w-3/4 lg:w-2/3 flex flex-col h-full p-0">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
              <SheetHeader className="p-6">
                <SheetTitle>{isCloning ? "Duplikat Pengaturan KPI" : (setup ? 'Ubah Pengaturan KPI' : 'Pengaturan KPI Baru')}</SheetTitle>
                <SheetDescription>
                  Lengkapi detail di bawah ini. Total bobot semua indikator harus 100%.
                </SheetDescription>
              </SheetHeader>
              
              <ScrollArea className="flex-1 min-h-0">
                <div className="space-y-6 px-6 py-4">
                  {hasPendingIndicators && (
                     <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Tinjauan KPI Diperlukan</AlertTitle>
                        <AlertDescription>
                          Holding/Atasan telah menugaskan KPI baru. Tambahkan ke daftar dan sesuaikan bobot semua indikator hingga totalnya menjadi 100%.
                          <div className="mt-4 space-y-2">
                             {form.getValues('pendingIndicators')?.map(pi => (
                              <div key={pi.id} className="flex items-center justify-between p-2 bg-background rounded">
                                  <span className="text-sm font-medium">{pi.indicator}</span>
                                  <Button type="button" size="sm" onClick={() => handleAcceptPending(pi)}>Tambahkan</Button>
                              </div>
                             ))}
                          </div>
                        </AlertDescription>
                      </Alert>
                  )}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <FormField
                          control={form.control}
                          name="company"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Perusahaan</FormLabel>
                                  <Select onValueChange={handleCompanyChange} value={field.value} disabled={!canChangeCompany || (!!setup && !isCloning)}>
                                      <FormControl>
                                          <SelectTrigger className={(isCloning) ? "" : ((!canChangeCompany || !!setup) ? "bg-muted/50 cursor-not-allowed" : "")}>
                                              <SelectValue placeholder="Pilih Perusahaan" />
                                          </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                          {filteredCompanyOptions.map(c => (
                                              <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                          ))}
                                      </SelectContent>
                                  </Select>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                       <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Status</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                          <SelectTrigger>
                                              <SelectValue placeholder="Pilih status" />
                                          </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                          <SelectItem value="Aktif">Aktif</SelectItem>
                                          <SelectItem value="Tidak Aktif">Tidak Aktif</SelectItem>
                                      </SelectContent>
                                  </Select>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                  </div>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <FormField
                        control={form.control}
                        name="department"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Departemen</FormLabel>
                                <Select onValueChange={handleDepartmentChange} value={field.value} disabled={!companyForSetup || (!!setup && !isCloning)}>
                                    <FormControl>
                                        <SelectTrigger className={(isCloning) ? "" : ((!companyForSetup || !!setup) ? "bg-muted/50 cursor-not-allowed" : "")}>
                                            <SelectValue placeholder="Pilih departemen" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {filteredDepartmentOptions.map(d => (
                                            <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                      <FormField
                        control={form.control}
                        name="position"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Posisi</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={!departmentForSetup || (!!setup && !isCloning)}>
                                    <FormControl>
                                        <SelectTrigger className={(isCloning) ? "" : ((!departmentForSetup || !!setup) ? "bg-muted/50 cursor-not-allowed" : "")}>
                                            <SelectValue placeholder="Pilih Posisi" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {filteredPositionOptions.map(p => (
                                            <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="level"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Level Jabatan</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={!companyForSetup || (!!setup && !isCloning)}>
                                    <FormControl>
                                        <SelectTrigger className={(isCloning) ? "" : ((!companyForSetup || !!setup) ? "bg-muted/50 cursor-not-allowed" : "")}>
                                            <SelectValue placeholder="Pilih Level"/>
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Staff">Staff</SelectItem>
                                        <SelectItem value="Supervisor">Supervisor</SelectItem>
                                        <SelectItem value="Manager">Manager</SelectItem>
                                        <SelectItem value="Direktur">Direktur</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                      />
                  </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="validFrom"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Berlaku Dari</FormLabel>
                            <FormControl>
                              <Input type="month" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="validTo"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Berlaku Sampai</FormLabel>
                            <FormControl>
                                <Input type="month" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                      />
                  </div>
                   
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                          control={form.control}
                          name="minAchievement"
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>Minimal Pencapaian KPI (%)</FormLabel>
                              <FormControl>
                                  <Input type="number" placeholder="Contoh: 70" {...field} value={field.value ?? ''} />
                              </FormControl>
                              <FormMessage />
                              </FormItem>
                          )}
                      />
                       <FormField
                          control={form.control}
                          name="kpiInputDeadline.type"
                          render={({ field }) => (
                              <FormItem className="space-y-3">
                                  <FormLabel>Jenis Deadline Pengisian</FormLabel>
                                  <FormControl>
                                  <RadioGroup
                                      onValueChange={field.onChange}
                                      value={field.value}
                                      className="grid grid-cols-2 gap-4"
                                  >
                                      <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="specific_date" id="r1" /></FormControl><Label htmlFor="r1">Tanggal Spesifik</Label></FormItem>
                                      <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="last_day" id="r2" /></FormControl><Label htmlFor="r2">Akhir Bulan</Label></FormItem>
                                      <FormItem className="flex items-center space-x-2 col-span-2"><FormControl><RadioGroupItem value="relative_to_end" id="r3" /></FormControl><Label htmlFor="r3">Relatif Dari Akhir Bulan (H+/-)</Label></FormItem>
                                  </RadioGroup>
                                  </FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                  </div>
                   {(deadlineType === 'specific_date' || deadlineType === 'relative_to_end') && (
                      <FormField
                          control={form.control}
                          name="kpiInputDeadline.value"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>
                                      {deadlineType === 'specific_date' ? 'Tanggal (1-31)' : 'Offset Hari (Gunakan minus untuk mundur)'}
                                  </FormLabel>
                                  <FormControl>
                                      <Input type="number" placeholder={deadlineType === 'specific_date' ? 'cth., 25' : 'cth., -5'} {...field} value={field.value ?? ''} />
                                  </FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                  )}
                  
                  <Separator className="my-6" />

                  <div className="p-4 border rounded-lg">
                      <h3 className="text-lg font-medium mb-4">Indikator KPI</h3>
                       <div className="flex flex-col gap-4">
                          {fields.map((field, indicatorIndex) => (
                             <IndicatorFields
                                key={field.id}
                                form={form}
                                indicatorIndex={indicatorIndex}
                                remove={remove}
                                watchedIndicators={watchedIndicators}
                                filteredCategoryOptions={filteredCategoryOptions}
                                isSupervisorOrManager={isSupervisorOrManager}
                             />
                          ))}
                      </div>
                      <Button
                          type="button"
                          variant="outline"
                          className="mt-4"
                          onClick={() => append({ id: `IND${Date.now()}`, category: '', indicator: '', measurement: '', target: 100, targetFormat: 'Numerik', unit: 'Poin', weight: 0, code: '', cycle: 'Bulanan', calculationMethod: 'Target Maksimal' })}
                      >
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Tambah Indikator
                      </Button>
                      {formErrors.indicators?.root && (
                          <p className="text-sm font-medium text-destructive mt-2">{formErrors.indicators.root.message}</p>
                      )}
                  </div>
                </div>
              </ScrollArea>
              
              <SheetFooter className="mt-auto p-4 border-t flex flex-col sm:flex-row sm:justify-between sm:items-center">
                <div className="flex items-center justify-between sm:justify-start gap-4 w-full">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-sm">
                                  Total Bobot: <span className={`font-bold ${totalWeight !== 100 ? 'text-destructive' : 'text-primary'}`}>{totalWeight.toFixed(0)}%</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Total bobot dari semua indikator harus tepat 100%.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto">
                    <SheetClose asChild>
                        <Button type="button" variant="outline" className="w-full">Batal</Button>
                    </SheetClose>
                    <Button type="button" onClick={handleForceSave} className="w-full">Simpan Pengaturan</Button>
                </div>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </>
  );
}
