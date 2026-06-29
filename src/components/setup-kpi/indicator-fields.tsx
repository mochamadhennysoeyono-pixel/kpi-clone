// src/components/setup-kpi/indicator-fields.tsx
"use client"

import * as React from 'react';
import type { UseFieldArrayRemove, UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import type { SetupFormValues } from './kpi-setup-sheet';
import type { KpiCategory, KpiIndicatorCycle, CalculationMethod } from '@/types';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Separator } from '../ui/separator';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';

type IndicatorFieldsProps = {
    form: UseFormReturn<SetupFormValues>;
    indicatorIndex: number;
    remove: UseFieldArrayRemove;
    watchedIndicators: any[];
    filteredCategoryOptions: KpiCategory[];
    isSupervisorOrManager: boolean;
};

const cycleOptions: KpiIndicatorCycle[] = ['Bulanan', '3 Bulan', '6 Bulan', '1 Tahun'];

export function IndicatorFields({
    form,
    indicatorIndex,
    remove,
    watchedIndicators,
    filteredCategoryOptions,
    isSupervisorOrManager,
}: IndicatorFieldsProps) {
    const isSourcedFromSupervisor = !!watchedIndicators[indicatorIndex]?.source;

    const [useCustomCalculation, setUseCustomCalculation] = React.useState(
        !!watchedIndicators[indicatorIndex]?.calculationMethod && watchedIndicators[indicatorIndex]?.calculationMethod !== 'Target Maksimal'
    );

    React.useEffect(() => {
        const method = watchedIndicators[indicatorIndex]?.calculationMethod;
        setUseCustomCalculation(method && method !== 'Target Maksimal');
    }, [watchedIndicators, indicatorIndex]);

    const handleCustomCalcCheckboxChange = (checked: boolean | 'indeterminate') => {
        const isChecked = !!checked;
        setUseCustomCalculation(isChecked);
        if (!isChecked) {
            form.setValue(`indicators.${indicatorIndex}.calculationMethod`, 'Target Maksimal');
        } else {
            // Default to 'Target Minimal' when checkbox is first checked
            form.setValue(`indicators.${indicatorIndex}.calculationMethod`, 'Target Minimal');
        }
    };
    
    const handleCalculationMethodChange = (value: string) => {
        form.setValue(`indicators.${indicatorIndex}.calculationMethod`, value as CalculationMethod);
    };

    const getDisplayIndicatorCode = () => {
        const currentCategoryName = watchedIndicators[indicatorIndex]?.category;
        if (!currentCategoryName) return `KPI-${indicatorIndex + 1}`;
        
        const categoryInfo = filteredCategoryOptions.find(c => c.name === currentCategoryName);
        const categoryCode = categoryInfo?.code || 'N/A';

        const countInCategory = watchedIndicators
            .slice(0, indicatorIndex)
            .filter(ind => ind.category === currentCategoryName)
            .length;
        
        return `${categoryCode}${countInCategory + 1}`;
    };

     const handleRollupChange = (checked: boolean | 'indeterminate') => {
        if (checked) {
            form.setValue(`indicators.${indicatorIndex}.rollup`, {
                enabled: true,
                method: 'SUM' // Default to SUM
            });
        } else {
            const currentIndicators = form.getValues('indicators');
            const newIndicators = [...currentIndicators];
            if (newIndicators[indicatorIndex]) {
                 delete newIndicators[indicatorIndex].rollup;
            }
            form.setValue('indicators', newIndicators, { shouldValidate: true });
        }
    };
    
    const displayIndicatorCode = getDisplayIndicatorCode();
    const rollup = watchedIndicators[indicatorIndex]?.rollup;
    const rollupEnabled = rollup?.enabled ?? false;

    const calculationMethod = watchedIndicators[indicatorIndex]?.calculationMethod || 'Target Maksimal';

    return (
        <div className={cn(
            "border p-4 rounded-lg space-y-4 relative",
            isSourcedFromSupervisor ? "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800" : "bg-muted/50"
        )}>
             {!isSourcedFromSupervisor && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(indicatorIndex)}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            )}
            
            {isSourcedFromSupervisor && (
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">Indikator ini diturunkan dari atasan/holding.</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name={`indicators.${indicatorIndex}.category`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Kategori</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isSourcedFromSupervisor}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih Kategori" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {filteredCategoryOptions.map(c => (
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
                    name={`indicators.${indicatorIndex}.indicator`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Indikator</FormLabel>
                            <div className="flex items-start gap-2">
                                <Input
                                    value={displayIndicatorCode}
                                    readOnly
                                    className="w-20 bg-background border-dashed text-center font-semibold text-muted-foreground"
                                />
                                <FormControl>
                                    <Textarea placeholder="Objective Goals" {...field} className="flex-1 min-h-[40px] h-16" disabled={isSourcedFromSupervisor} />
                                </FormControl>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            
            <FormField
                control={form.control}
                name={`indicators.${indicatorIndex}.measurement`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Cara Mengukur</FormLabel>
                        <FormControl>
                            <Textarea 
                                placeholder="Jelaskan bagaimana indikator ini diukur..." 
                                {...field} 
                                className="h-16"
                                disabled={isSourcedFromSupervisor}
                             />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 <FormField
                    control={form.control}
                    name={`indicators.${indicatorIndex}.cycle`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Siklus Penilaian</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isSourcedFromSupervisor}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih Siklus" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {cycleOptions.map(cycle => (
                                        <SelectItem key={cycle} value={cycle}>{cycle}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name={`indicators.${indicatorIndex}.target`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Target Total Siklus</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="e.g., 100" {...field} readOnly={isSourcedFromSupervisor} className={ isSourcedFromSupervisor ? "bg-muted/50 cursor-not-allowed" : ""}/>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name={`indicators.${indicatorIndex}.weight`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Bobot (%)</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="e.g., 25" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name={`indicators.${indicatorIndex}.targetFormat`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Format Target</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isSourcedFromSupervisor}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue/>
                                    </SelectTrigger>
                                </FormControl>
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
                    name={`indicators.${indicatorIndex}.unit`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Satuan</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Laporan, Poin, %" {...field} disabled={isSourcedFromSupervisor} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <Separator />

             <div className="space-y-4 rounded-md border p-4 shadow-sm bg-background">
                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                        <Checkbox
                            checked={useCustomCalculation}
                            onCheckedChange={handleCustomCalcCheckboxChange}
                        />
                    </FormControl>
                    <FormLabel className="font-medium leading-none cursor-pointer">
                        Gunakan Metode Perhitungan Khusus
                    </FormLabel>
                </FormItem>
                
                {useCustomCalculation && (
                    <RadioGroup 
                        onValueChange={handleCalculationMethodChange} 
                        value={calculationMethod} 
                        className="pl-6 space-y-2"
                    >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                                <RadioGroupItem value="Target Minimal" id={`calc-min-${indicatorIndex}`} />
                            </FormControl>
                            <FormLabel htmlFor={`calc-min-${indicatorIndex}`} className="font-normal">
                                Target Minimal (Batas Atas, nilai lebih rendah lebih baik)
                            </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                                <RadioGroupItem value="Target Mutlak" id={`calc-abs-${indicatorIndex}`} />
                            </FormControl>
                            <FormLabel htmlFor={`calc-abs-${indicatorIndex}`} className="font-normal">
                                Target Mutlak (Nilai harus sama persis)
                            </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                                <RadioGroupItem value="Target Limit" id={`calc-limit-${indicatorIndex}`} />
                            </FormControl>
                            <FormLabel htmlFor={`calc-limit-${indicatorIndex}`} className="font-normal">
                                Target Limit (Upper Limit, nilai ≤ target mendapat skor penuh)
                            </FormLabel>
                        </FormItem>
                    </RadioGroup>
                )}
            </div>
            
             {isSupervisorOrManager && (
                 <>
                    <Separator />
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0 rounded-md border p-4 shadow-sm bg-background">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                checked={rollupEnabled}
                                onCheckedChange={handleRollupChange}
                                id={`rollup-${indicatorIndex}`}
                            />
                            <label htmlFor={`rollup-${indicatorIndex}`} className="font-medium leading-none cursor-pointer">
                                Turunkan Indikator ini ke Tim
                            </label>
                        </div>
                        {rollupEnabled && (
                            <FormField
                                control={form.control}
                                name={`indicators.${indicatorIndex}.rollup.method`}
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Metode Kalkulasi" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="SUM">SUM (Jumlahkan pencapaian tim)</SelectItem>
                                                <SelectItem value="AVERAGE">AVERAGE (Rata-rata pencapaian tim)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                             />
                        )}
                    </div>
                 </>
             )}
        </div>
    )
}
