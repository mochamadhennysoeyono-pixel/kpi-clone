// src/components/holding/holding-kpi-setup-sheet.tsx
"use client";

import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { KpiSetup, KpiIndicator, KpiIndicatorCycle, Company, Position } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, Trash2, HelpCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useMasterData } from '@/contexts/master-data-context';
import { Checkbox } from '../ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_KPI_CATEGORIES } from '@/lib/default-data';
import { parse } from 'date-fns';


const indicatorSchema = z.object({
  id: z.string(),
  category: z.string().min(1, "Kategori harus dipilih"),
  indicator: z.string().min(1, "Indikator harus diisi"),
  measurement: z.string().min(1, "Cara mengukur harus diisi"),
  cycle: z.enum(['Bulanan', '3 Bulan', '6 Bulan', '1 Tahun'], { required_error: "Siklus harus dipilih" }),
  target: z.coerce.number().min(0, "Target harus positif"),
  targetFormat: z.enum(['Numerik', 'Persentase']),
  unit: z.string().min(1, "Satuan harus diisi"),
  weight: z.coerce.number().min(0, "Bobot harus positif").max(100, "Bobot maks 100"),
  isCascaded: z.boolean().optional(),
  targetAllocations: z.record(z.object({
    target: z.coerce.number().optional(),
    position: z.string().optional(),
  })).optional(),
  selectedAllocationCompanies: z.array(z.string()).optional(),
});

const setupSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Deskripsi harus diisi"),
  validFrom: z.string().min(1, "Periode mulai harus diisi"),
  validTo: z.string().min(1, "Periode selesai harus diisi"),
  status: z.enum(['Aktif', 'Tidak Aktif']),
  indicators: z.array(indicatorSchema).min(1, "Minimal harus ada satu indikator"),
  allocateToInternal: z.boolean().optional(),
}).refine(data => {
    const totalWeight = data.indicators.reduce((sum, ind) => sum + Number(ind.weight || 0), 0);
    return Math.abs(totalWeight - 100) < 0.001;
}, {
    message: "Total bobot semua indikator harus 100%",
    path: ["indicators"],
}).refine(data => {
    for (const indicator of data.indicators) {
        if (indicator.isCascaded) {
            const allocatedSum = Object.values(indicator.targetAllocations || {}).reduce((sum, val) => sum + (Number(val.target) || 0), 0);
            if (allocatedSum > indicator.target) {
                return false;
            }
        }
    }
    return true;
}, {
    message: "Jumlah target yang dialokasikan tidak boleh melebihi target total indikator.",
    path: ["indicators"],
});


export type HoldingSetupFormValues = z.infer<typeof setupSchema>;

interface HoldingKpiSetupSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  setup?: KpiSetup;
  isCloning?: boolean;
  onSave: (data: Omit<KpiSetup, 'id'> & { id?: string }) => void;
  holdingCompany: Company;
  childCompanies: Company[];
}

export function HoldingKpiSetupSheet({ 
    isOpen, 
    onOpenChange, 
    setup, 
    isCloning, 
    onSave,
    holdingCompany,
    childCompanies
}: HoldingKpiSetupSheetProps) {
  const { kpiCategories, kpiSetups, positions } = useMasterData();
  const { toast } = useToast();

  const form = useForm<HoldingSetupFormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      id: '',
      description: '',
      validFrom: '',
      validTo: '',
      status: 'Aktif',
      indicators: [],
      allocateToInternal: false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "indicators",
  });
  
  const watchedIndicators = form.watch('indicators');
  const allocateToInternal = form.watch('allocateToInternal');
  const totalWeight = watchedIndicators.reduce((sum, ind) => sum + Number(ind.weight || 0), 0);

  const filteredCategoryOptions = useMemo(() => {
    const customCats = kpiCategories.filter(c => c.company === holdingCompany.name && c.status === 'Aktif');
    return [...DEFAULT_KPI_CATEGORIES, ...customCats];
  }, [kpiCategories, holdingCompany]);
  
  const defaultNewIndicator = {
    id: `IND${Date.now()}`,
    category: '', indicator: '', measurement: '', target: 100,
    targetFormat: 'Numerik' as const, unit: 'Poin', weight: 100, cycle: '1 Tahun' as KpiIndicatorCycle,
    isCascaded: false,
    targetAllocations: {},
    selectedAllocationCompanies: [],
  };

  const companyPositions = useMemo(() => {
    const posByCompany: Record<string, Position[]> = {};
    const allRelevantCompanies = [holdingCompany, ...childCompanies];
    allRelevantCompanies.forEach(c => {
      posByCompany[c.name] = positions.filter(p => p.company === c.name);
    });
    return posByCompany;
  }, [positions, holdingCompany, childCompanies]);


  useEffect(() => {
    if (isOpen) {
      if (setup) {
        const resetData = {
          ...setup,
          id: isCloning ? undefined : setup.id,
          description: isCloning ? `Salinan dari ${setup.description}` : setup.description,
          validFrom: setup.validFrom || '',
          validTo: setup.validTo || '',
           indicators: setup.indicators.map(ind => ({
            ...defaultNewIndicator, // Apply defaults first
            ...ind, // Then override with existing data
            selectedAllocationCompanies: ind.targetAllocations ? Object.keys(ind.targetAllocations) : [],
          })),
          allocateToInternal: !!setup.indicators.some(ind => ind.targetAllocations?.[holdingCompany.name]),
        };
        form.reset(resetData as any);
      } else {
        form.reset({
          id: undefined,
          description: `Pengaturan Induk ${holdingCompany.name}`,
          validFrom: '',
          validTo: '',
          status: 'Aktif',
          indicators: [defaultNewIndicator],
          allocateToInternal: false,
        });
      }
    }
  }, [setup, form, isOpen, isCloning, holdingCompany]);

  const onSubmit = (data: HoldingSetupFormValues) => {
    // Validation for overlapping periods
    if (!data.id || isCloning) {
      const newPeriodStart = new Date(data.validFrom);
      const newPeriodEnd = new Date(data.validTo);

      const isOverlapping = kpiSetups.some(existingSetup => {
        if (
          existingSetup.company === holdingCompany.name &&
          existingSetup.position === 'Admin Perusahaan' &&
          existingSetup.level === 'Direktur' &&
          existingSetup.id !== data.id // Exclude self when editing
        ) {
          const existingStart = existingSetup.validFrom ? new Date(existingSetup.validFrom) : null;
          const existingEnd = existingSetup.validTo ? new Date(existingSetup.validTo) : null;
          if (existingStart && existingEnd) {
            return newPeriodStart <= existingEnd && newPeriodEnd >= existingStart;
          }
        }
        return false;
      });
      
      if (isOverlapping) {
        toast({
          variant: "destructive",
          title: "Pengaturan Tumpang Tindih",
          description: `Sudah ada pengaturan KPI induk untuk ${holdingCompany.name} pada periode yang dipilih. Silakan pilih periode lain.`,
        });
        return; // Stop submission
      }
    }
    
    // Clean up undefined values and unselected allocations before saving
    const cleanedIndicators = data.indicators.map(indicator => {
      const cleanIndicator: any = { ...indicator };
      
      if (!cleanIndicator.isCascaded) {
        delete cleanIndicator.targetAllocations;
      } else {
        const finalAllocations: any = {};
        const selectedCompanies = new Set(cleanIndicator.selectedAllocationCompanies || []);
        if (data.allocateToInternal) {
          selectedCompanies.add(holdingCompany.name);
        }

        selectedCompanies.forEach((companyName: string) => {
          if (cleanIndicator.targetAllocations?.[companyName] && cleanIndicator.targetAllocations[companyName].target !== undefined && cleanIndicator.targetAllocations[companyName].target !== null) {
             finalAllocations[companyName] = cleanIndicator.targetAllocations[companyName];
          }
        });

        cleanIndicator.targetAllocations = finalAllocations;
      }
      delete cleanIndicator.selectedAllocationCompanies;

      return cleanIndicator;
    });

    const finalData = {
      ...data,
      indicators: cleanedIndicators,
      company: holdingCompany.name,
      position: 'Admin Perusahaan' as const,
      department: 'Manajemen' as const,
      level: 'Direktur' as const,
    };
    onSave(finalData);
    onOpenChange(false);
  };
  
  const formErrors = form.formState.errors;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-4xl md:w-3/4 lg:w-2/3 flex flex-col h-full p-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <SheetHeader className="p-6">
              <SheetTitle>{isCloning ? "Duplikat Pengaturan Induk" : (setup ? 'Ubah Pengaturan Induk' : 'Pengaturan KPI Induk Baru')}</SheetTitle>
              <SheetDescription>
                Definisikan KPI di tingkat holding. Total bobot indikator harus 100%.
              </SheetDescription>
            </SheetHeader>

            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-6 py-4 px-6">
                 <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Deskripsi/Nama Pengaturan</FormLabel>
                        <FormControl>
                            <Input placeholder={`cth., KPI Holding ${holdingCompany.name} 2025`} {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
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
                
                <Separator className="my-6" />
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Indikator KPI Induk</h3>
                  
                  {fields.map((field, index) => {
                    const isCascaded = !!watchedIndicators[index]?.isCascaded;
                    const indicatorTarget = watchedIndicators[index]?.target || 0;
                    const allocatedSum = Object.values(watchedIndicators[index]?.targetAllocations || {}).reduce((sum: any, val: any) => sum + (Number(val.target) || 0), 0);
                    const remainingToAllocate = indicatorTarget - allocatedSum;
                    const selectedAllocationCompanies = watchedIndicators[index]?.selectedAllocationCompanies || [];


                    return (
                        <div key={field.id} className={'p-4 rounded-lg space-y-4 relative bg-muted/50 border'}>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                                onClick={() => remove(index)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                             
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name={`indicators.${index}.category`}
                                    render={({ field: formField }) => (
                                        <FormItem>
                                            <FormLabel>Kategori</FormLabel>
                                            <Select onValueChange={formField.onChange} value={formField.value}>
                                                <FormControl>
                                                    <SelectTrigger><SelectValue placeholder="Pilih Kategori" /></SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {filteredCategoryOptions.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`indicators.${index}.indicator`}
                                    render={({ field: formField }) => (
                                        <FormItem>
                                            <FormLabel>Indikator</FormLabel>
                                            <FormControl><Input placeholder="Nama indikator..." {...formField} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name={`indicators.${index}.measurement`}
                                render={({ field: formField }) => (
                                    <FormItem>
                                        <FormLabel>Cara Mengukur</FormLabel>
                                        <FormControl><Textarea placeholder="Jelaskan cara mengukur..." {...formField} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name={`indicators.${index}.cycle`}
                                    render={({ field: formField }) => (
                                        <FormItem>
                                            <FormLabel>Siklus</FormLabel>
                                            <Select onValueChange={formField.onChange} value={formField.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Pilih Siklus" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {['Bulanan', '3 Bulan', '6 Bulan', '1 Tahun'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`indicators.${index}.target`}
                                    render={({ field: formField }) => (
                                        <FormItem>
                                            <FormLabel>Target Total</FormLabel>
                                            <FormControl><Input type="number" placeholder="e.g., 10000" {...formField} value={formField.value ?? ''} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`indicators.${index}.weight`}
                                    render={({ field: formField }) => (
                                        <FormItem>
                                            <FormLabel>Bobot (%)</FormLabel>
                                            <FormControl><Input type="number" placeholder="e.g., 25" {...formField} value={formField.value ?? ''} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <FormField
                                    control={form.control}
                                    name={`indicators.${index}.targetFormat`}
                                    render={({ field: formField }) => (
                                        <FormItem>
                                            <FormLabel>Format Target</FormLabel>
                                            <Select onValueChange={formField.onChange} value={formField.value}>
                                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Numerik">Numerik</SelectItem>
                                                    <SelectItem value="Persentase">Persentase</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`indicators.${index}.unit`}
                                    render={({ field: formField }) => (
                                        <FormItem>
                                            <FormLabel>Satuan</FormLabel>
                                            <FormControl><Input placeholder="e.g., Juta, %, Unit" {...formField} value={formField.value ?? ''} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                             <div className="space-y-4 rounded-md border p-4 shadow-sm bg-background">
                                <FormField
                                    control={form.control}
                                    name={`indicators.${index}.isCascaded`}
                                    render={({ field: formField }) => (
                                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                            <FormControl>
                                              <Checkbox 
                                                checked={formField.value} 
                                                onCheckedChange={formField.onChange}
                                              />
                                            </FormControl>
                                            <FormLabel className="font-medium leading-none cursor-pointer">
                                                Pusat Penurunan Cerdas: Alokasikan & Tugaskan Target
                                            </FormLabel>
                                        </FormItem>
                                    )}
                                />
                                {isCascaded && (
                                    <div className="pt-4 space-y-4">
                                        <Alert variant={remainingToAllocate < 0 ? "destructive" : "default"}>
                                            <AlertTitle>Alokasi Target</AlertTitle>
                                            <AlertDescription>
                                                Sisa target yang belum dialokasikan: <strong>{remainingToAllocate.toLocaleString()}</strong>. Pastikan sisa alokasi tidak negatif.
                                            </AlertDescription>
                                        </Alert>
                                        
                                        <div className="space-y-2">
                                            <FormField
                                                control={form.control}
                                                name="allocateToInternal"
                                                render={({ field: formField }) => (
                                                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                                                    <FormControl><Checkbox checked={formField.value} onCheckedChange={formField.onChange} /></FormControl>
                                                    <div className="space-y-1 leading-none">
                                                        <FormLabel>Alokasikan untuk Tim Internal Holding</FormLabel>
                                                    </div>
                                                </FormItem>
                                                )}
                                            />
                                            
                                            {childCompanies.map(company => (
                                                 <FormField
                                                    key={company.id}
                                                    control={form.control}
                                                    name={`indicators.${index}.selectedAllocationCompanies`}
                                                    render={({ field: formField }) => (
                                                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                                                        <FormControl>
                                                            <Checkbox
                                                                checked={formField.value?.includes(company.name)}
                                                                onCheckedChange={(checked) => {
                                                                return checked
                                                                    ? formField.onChange([...(formField.value || []), company.name])
                                                                    : formField.onChange(
                                                                        (formField.value || []).filter(
                                                                        (value) => value !== company.name
                                                                        )
                                                                    )
                                                                }}
                                                            />
                                                        </FormControl>
                                                        <FormLabel className="font-normal">{company.name}</FormLabel>
                                                    </FormItem>
                                                     )}
                                                />
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-1 gap-x-6 gap-y-4">
                                            { (allocateToInternal) && (
                                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start border-b pb-4 last:border-b-0">
                                                    <FormField
                                                        control={form.control}
                                                        name={`indicators.${index}.targetAllocations.${holdingCompany.name}.target`}
                                                        render={({ field: formField }) => (
                                                            <FormItem>
                                                                <FormLabel>{holdingCompany.name} (Internal)</FormLabel>
                                                                <FormControl>
                                                                    <Input type="number" placeholder="Alokasi Target" {...formField} value={formField.value ?? ''} onChange={(e) => formField.onChange(parseFloat(e.target.value) || 0)} />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name={`indicators.${index}.targetAllocations.${holdingCompany.name}.position`}
                                                        render={({ field: formField }) => (
                                                            <FormItem>
                                                                <FormLabel>Tugaskan ke Jabatan</FormLabel>
                                                                <Select onValueChange={formField.onChange} value={formField.value}>
                                                                    <FormControl>
                                                                        <SelectTrigger>
                                                                            <SelectValue placeholder="Pilih Jabatan" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        {(companyPositions[holdingCompany.name] || []).map(pos => (
                                                                            <SelectItem key={pos.id} value={pos.name}>{pos.name}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                            )}
                                            {childCompanies.map(company => (
                                                selectedAllocationCompanies.includes(company.name) && (
                                                 <div key={company.id} className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start border-b pb-4 last:border-b-0">
                                                    <FormField
                                                        control={form.control}
                                                        name={`indicators.${index}.targetAllocations.${company.name}.target`}
                                                        render={({ field: formField }) => (
                                                            <FormItem>
                                                                <FormLabel>{company.name}</FormLabel>
                                                                <FormControl>
                                                                    <Input type="number" placeholder="Alokasi Target" {...formField} value={formField.value ?? ''} onChange={(e) => formField.onChange(parseFloat(e.target.value) || 0)} />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                     <FormField
                                                        control={form.control}
                                                        name={`indicators.${index}.targetAllocations.${company.name}.position`}
                                                        render={({ field: formField }) => (
                                                            <FormItem>
                                                                <FormLabel>Tugaskan ke Jabatan</FormLabel>
                                                                <Select onValueChange={formField.onChange} value={formField.value}>
                                                                    <FormControl>
                                                                        <SelectTrigger>
                                                                            <SelectValue placeholder="Pilih Jabatan" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        {(companyPositions[company.name] || []).map(pos => (
                                                                            <SelectItem key={pos.id} value={pos.name}>{pos.name}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                                )
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                  })}
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4"
                    onClick={() => append(defaultNewIndicator)}
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

             <SheetFooter className="mt-auto p-6 border-t">
              <div className="flex w-full justify-between items-center gap-4">
                 <div className="text-sm font-bold">
                    Total Bobot: <span className={totalWeight !== 100 ? 'text-destructive' : 'text-primary'}>{totalWeight.toFixed(0)}%</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <SheetClose asChild><Button type="button" variant="outline">Batal</Button></SheetClose>
                    <Button type="submit">Simpan Pengaturan</Button>
                 </div>
              </div>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
