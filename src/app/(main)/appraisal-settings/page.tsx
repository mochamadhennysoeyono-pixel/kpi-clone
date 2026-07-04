// src/app/(main)/appraisal-settings/page.tsx
"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useForm, useFieldArray, useWatch, type Control, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from 'next/link';
import {
  differenceInMonths,
  addMonths,
  startOfMonth,
  parse,
  format,
  lastDayOfMonth,
} from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertCircle,
  Save,
  SlidersHorizontal,
  BarChart4,
  Users,
  PlusCircle,
  ChevronDown,
  MoreHorizontal,
  Trash2,
  ClipboardList,
  Target,
  ClipboardPen,
  Filter,
  Building,
  Calendar,
  Settings,
  Pencil
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/contexts/auth-context";
import { useMasterData } from "@/contexts/master-data-context";
import type { AppraisalSetup, Company, KboSetup, Employee } from "@/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_KBO_CATEGORIES } from "@/lib/default-data";
import { useToast } from "@/hooks/use-toast";
import { AppraisalMappingDialog } from '@/components/appraisal/appraisal-mapping-dialog';
import { OkrWeightMappingDialog } from '@/components/appraisal/okr-weight-mapping-dialog';
import { DeleteConfirmationDialog } from "@/components/master-data/delete-confirmation-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ResponsivePage, ResponsiveToolbar } from "@/components/ui/adaptive-layout";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";


// --- Zod Schema ---
const kboComponentSchema = z.object({
    kboSetupIds: z.array(z.string()).optional(),
    weight: z.coerce.number().min(0).max(100).optional(),
});

const appraisalComponentsSchema = z.object({
  kpiWeight: z.coerce.number().min(0).max(100),
  kboWeight: z.coerce.number().min(0).max(100),
  kbo: z.record(z.string(), kboComponentSchema).optional(),
}).refine(data => Math.abs(data.kpiWeight + data.kboWeight - 100) < 0.01, {
  message: "Total bobot KPI dan KBO harus 100%.",
  path: ["kpiWeight"],
}).refine(data => {
  if (!data.kbo) return true;
  const activeKboCategories = Object.values(data.kbo).filter(cat => cat.kboSetupIds && cat.kboSetupIds.length > 0 && typeof cat.weight === 'number');
  if (activeKboCategories.length > 0) {
    const totalWeight = activeKboCategories.reduce((sum, cat) => sum + (cat.weight || 0), 0);
    return Math.abs(totalWeight - 100) < 0.1;
  }
  return true;
}, {
  message: "Total bobot dari semua kategori KBO yang aktif harus 100%.",
  path: ["kbo.Core Competency.weight"], // Attach error to a visible field
});


const appraisalSetupSchema = z.object({
  id: z.string().optional(),
  company: z.string().min(1, "Perusahaan harus dipilih"),
  cycle: z.enum(["Bulanan", "Triwulan", "Semesteran", "Tahunan"]),
  period: z.string().optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  status: z.enum(["Aktif", "Tidak Aktif"]),
  activeLevels: z.array(z.string()).min(1, "Pilih setidaknya satu level jabatan."),
  componentsByLevel: z.object({
    Direktur: appraisalComponentsSchema,
    Manager: appraisalComponentsSchema,
    Supervisor: appraisalComponentsSchema,
    Staff: appraisalComponentsSchema,
  }),
}).refine(data => {
    if (data.cycle !== 'Bulanan' && (!data.periodStart || !data.periodEnd)) {
        return false;
    }
    return true;
}, {
    message: "Rentang periode harus diisi.",
    path: ["periodStart"],
}).refine(data => {
    if (data.cycle === 'Bulanan' && !data.period) {
        return false;
    }
    return true;
}, {
    message: "Periode bulan harus diisi.",
    path: ["period"],
});

type AppraisalSetupFormValues = z.infer<typeof appraisalSetupSchema>;

const getContextName = (setup: KboSetup): string => {
    if (setup.categoryName === 'Generic Competency') return `Level: ${setup.level || 'N/A'}`;
    if (setup.categoryName === 'Specific Competency') return `Jabatan: ${setup.position || 'N/A'}`;
    if (setup.categoryName === 'Core Competency') return setup.company === 'Global' ? 'Global' : `Perusahaan: ${setup.company}`;
    return setup.company;
}

const levelKeys: (keyof Employee['level'])[] = ['Direktur', 'Manager', 'Supervisor', 'Staff'];

function LevelWeightingForm({ level, form, kboSetups, selectedCompany }: { level: keyof Employee['level'], form: any, kboSetups: KboSetup[], selectedCompany: string }) {
    const { control, setValue, getValues } = form as UseFormReturn<AppraisalSetupFormValues>;
    const kboWeight = useWatch({ control, name: `componentsByLevel.${level}.kboWeight` });
    const watchedKboComponents = useWatch({ control, name: `componentsByLevel.${level}.kbo` });

    const activeKboCategories = useMemo(() => {
        if (!watchedKboComponents) return [];
        return Object.entries(watchedKboComponents)
            .filter(([, val]) => val?.kboSetupIds && val.kboSetupIds.length > 0)
            .map(([key]) => key);
    }, [watchedKboComponents]);
    
     const prevActiveCategoriesRef = useRef<string[]>([]);
     useEffect(() => {
        const currentActiveCategories = activeKboCategories.sort();
        const prevActiveCategories = prevActiveCategoriesRef.current.sort();

        const hasChanged = currentActiveCategories.length !== prevActiveCategories.length || 
                           currentActiveCategories.some((cat, i) => cat !== prevActiveCategories[i]);

        if (hasChanged && currentActiveCategories.length > 0) {
            const evenWeight = 100 / currentActiveCategories.length;
            const currentValues = getValues(`componentsByLevel.${level}.kbo`) || {};
            let isManuallySet = false;
            
            // Check if any active category already has a manual weight set
            for (const catName of currentActiveCategories) {
                if(currentValues[catName]?.weight !== undefined) {
                    isManuallySet = true;
                    break;
                }
            }
            
            if (!isManuallySet) {
                 currentActiveCategories.forEach(categoryName => {
                    setValue(`componentsByLevel.${level}.kbo.${categoryName}.weight`, evenWeight, { shouldValidate: true });
                });
            }

            prevActiveCategories.forEach(categoryName => {
                if (!currentActiveCategories.includes(categoryName)) {
                    setValue(`componentsByLevel.${level}.kbo.${categoryName}.weight`, undefined);
                }
            });
        }
        
        prevActiveCategoriesRef.current = currentActiveCategories;
    }, [activeKboCategories, level, setValue, getValues]);

    useEffect(() => {
        const kboValue = Number(kboWeight);
        if (!isNaN(kboValue)) {
            const kpiValue = 100 - kboValue;
            setValue(`componentsByLevel.${level}.kpiWeight`, kpiValue, { shouldValidate: true });
        }
    }, [kboWeight, setValue, level]);

    const groupedKboSetups = useMemo(() => {
        const relevantSetups = kboSetups.filter(s => s.company === 'Global' || s.company === selectedCompany);
        const groups: Record<string, KboSetup[]> = {};
        DEFAULT_KBO_CATEGORIES.forEach(cat => {
            groups[cat.name] = relevantSetups.filter(s => s.categoryName === cat.name);
        });
        return Object.entries(groups).filter(([_, setups]) => setups.length > 0);
    }, [kboSetups, selectedCompany]);
    
    const kboContributionSummary = useMemo(() => {
        if (!watchedKboComponents) return null;
        return Object.entries(watchedKboComponents)
          .filter(([, cat]) => cat?.weight && cat.weight > 0)
          .map(([name, cat]) => `${name.substring(0,4)}. ${cat.weight?.toFixed(0)}%`)
          .join(', ');
    }, [watchedKboComponents]);


    return (
         <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <FormField control={control} name={`componentsByLevel.${level}.kpiWeight`} render={({ field }) => (<FormItem><FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Bobot KPI (%)</FormLabel><FormControl><Input type="number" {...field} readOnly className="bg-muted/50 font-bold" /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={control} name={`componentsByLevel.${level}.kboWeight`} render={({ field }) => (
                    <FormItem>
                         <div className="flex items-center justify-between">
                            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Bobot KBO (%)</FormLabel>
                            {kboContributionSummary && <Badge variant="outline" className="text-[8px] font-black border-none bg-primary/5 text-primary">{kboContributionSummary}</Badge>}
                         </div>
                         <FormControl><Input type="number" {...field} className="font-bold" /></FormControl><FormMessage />
                    </FormItem>
                )}/>
            </div>
             {kboWeight > 0 && activeKboCategories.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-dashed">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary/70">Pembagian Kontribusi Kategori KBO</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         {activeKboCategories.map(categoryName => (
                            <FormField
                                key={categoryName}
                                control={control}
                                name={`componentsByLevel.${level}.kbo.${categoryName}.weight`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-bold text-slate-500 uppercase">{categoryName}</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                {...field}
                                                value={field.value ?? ''}
                                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                className="h-9 font-bold"
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        ))}
                    </div>
                     <FormField
                        control={control}
                        name={`componentsByLevel.${level}.kbo.Core Competency.weight`} // Attach error here
                        render={() => <FormMessage />}
                    />
                </div>
            )}
            {kboWeight > 0 && (
                 <div className="space-y-4 rounded-xl border p-4 sm:p-6 bg-muted/20">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-center text-muted-foreground">Pilih Kompetensi yang Dinilai</h4>
                    <Accordion type="multiple" className="w-full space-y-2">
                    {groupedKboSetups.map(([categoryName, setups]) => (
                        <AccordionItem value={categoryName} key={categoryName} className="border rounded-xl px-4 bg-background shadow-sm">
                            <AccordionTrigger className="py-4 font-black uppercase text-[10px] tracking-widest text-slate-800">{categoryName}</AccordionTrigger>
                            <AccordionContent className="pb-4 space-y-4">
                               <FormField
                                  control={control}
                                  name={`componentsByLevel.${level}.kbo.${categoryName}.kboSetupIds`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <div className="space-y-2">
                                        {setups.map(kbo => (
                                          <FormItem
                                            key={kbo.id}
                                            className="flex flex-row items-center space-x-3 space-y-0 p-3 rounded-lg border hover:bg-muted/5 transition-colors cursor-pointer"
                                          >
                                            <FormControl>
                                              <Checkbox
                                                checked={field.value?.includes(kbo.id)}
                                                onCheckedChange={(checked) => {
                                                  const currentValues = field.value || [];
                                                  const newValues = checked
                                                    ? [...currentValues, kbo.id]
                                                    : currentValues.filter((value) => value !== kbo.id);
                                                  field.onChange(newValues);
                                                }}
                                              />
                                            </FormControl>
                                            <FormLabel className="text-xs font-bold uppercase tracking-tight text-foreground/80 cursor-pointer flex-1">
                                              {getContextName(kbo)}
                                            </FormLabel>
                                          </FormItem>
                                        ))}
                                      </div>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                    </Accordion>
                </div>
            )}
        </div>
    );
}

// --- Form Sheet Component ---
function AppraisalSetupSheet({ isOpen, onOpenChange, onSave, setup, companies, kboSetups, manageableCompanies }: { isOpen: boolean, onOpenChange: (open: boolean) => void, onSave: (data: any) => void, setup?: AppraisalSetup, companies: Company[], kboSetups: KboSetup[], manageableCompanies: Company[] }) {
    const { currentUser, userRole } = useAuth();
    
    const getDefaultComponents = () => ({
        kpiWeight: 60, kboWeight: 40, kbo: {}
    });
    
    const form = useForm<AppraisalSetupFormValues>({
        resolver: zodResolver(appraisalSetupSchema),
        defaultValues: {
            cycle: "Tahunan", status: "Aktif", activeLevels: [],
            componentsByLevel: {
                Direktur: getDefaultComponents(), Manager: getDefaultComponents(), Supervisor: getDefaultComponents(), Staff: getDefaultComponents()
            }
        },
    });

    const selectedCompany = form.watch("company");
    const selectedCycle = form.watch("cycle");
    const activeLevels = form.watch("activeLevels");
    
    useEffect(() => {
        if (isOpen) {
            const defaultCompany = userRole !== 'superadmin' ? currentUser?.company || '' : manageableCompanies[0]?.name || '';
            const baseValues = {
                company: defaultCompany,
                cycle: "Tahunan",
                status: "Aktif",
                period: '', periodStart: '', periodEnd: '',
                activeLevels: [],
                componentsByLevel: {
                    Direktur: getDefaultComponents(), Manager: getDefaultComponents(), Supervisor: getDefaultComponents(), Staff: getDefaultComponents()
                },
            };
            if (setup) {
                const active = setup.activeLevels || Object.keys(setup.componentsByLevel || {});
                const componentsByLevel = {
                    ...baseValues.componentsByLevel,
                };

                (Object.keys(setup.componentsByLevel || {}) as (keyof typeof setup.componentsByLevel)[]).forEach(level => {
                    if (componentsByLevel[level]) {
                        componentsByLevel[level] = {
                            ...componentsByLevel[level],
                            ...setup.componentsByLevel?.[level],
                        };
                    }
                });

                const migratedSetup = {
                    ...setup,
                    activeLevels: active,
                    componentsByLevel,
                };
                form.reset({ ...baseValues, ...migratedSetup } as any);
            } else {
                 form.reset(baseValues as AppraisalSetupFormValues);
            }
        }
    }, [isOpen, setup, form, userRole, currentUser, manageableCompanies]);

    const onSubmit = (data: AppraisalSetupFormValues) => {
        const sanitizedData: any = { ...data };
        levelKeys.forEach(level => {
            const kbo = sanitizedData.componentsByLevel[level]?.kbo;
            if (kbo) {
                Object.keys(kbo).forEach(category => {
                    if (!kbo[category].kboSetupIds) {
                        kbo[category].kboSetupIds = [];
                    }
                    if (kbo[category].weight === undefined || isNaN(kbo[category].weight)) {
                        delete kbo[category].weight;
                    }
                });
            }
        });
        
        onSave(sanitizedData);
        onOpenChange(false);
    };
    
    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-4xl flex flex-col h-full p-0 overflow-hidden border-none shadow-2xl">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full overflow-hidden">
                        <SheetHeader className="p-6 sm:p-10 pb-4 shrink-0 bg-background border-b">
                            <SheetTitle className="font-black text-2xl uppercase tracking-tighter">{setup ? "Ubah Konfigurasi Appraisal" : "Buat Konfigurasi Appraisal Baru"}</SheetTitle>
                            <SheetDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Atur seluruh parameter penilaian kinerja (KPI + KBO).</SheetDescription>
                        </SheetHeader>
                        <ScrollArea className="flex-1 min-h-0 bg-muted/5">
                            <div className="space-y-8 p-6 sm:p-10">
                                <Card className="border-border/40 shadow-sm overflow-hidden bg-background">
                                    <CardHeader className="bg-muted/20 border-b p-5">
                                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><SlidersHorizontal className="size-4 text-primary"/>Parameter Umum</CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                                        <FormField control={form.control} name="company" render={({ field }) => (
                                            <FormItem><FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Perusahaan</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-11 font-bold"><SelectValue/></SelectTrigger></FormControl><SelectContent>{manageableCompanies.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={form.control} name="cycle" render={({ field }) => (
                                            <FormItem><FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Siklus Penilaian</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-11 font-bold"><SelectValue placeholder="Pilih Siklus" /></SelectTrigger></FormControl><SelectContent>
                                                <SelectItem value="Bulanan">Bulanan</SelectItem><SelectItem value="Triwulan">Triwulan (3 Bulan)</SelectItem>
                                                <SelectItem value="Semesteran">Semesteran (6 Bulan)</SelectItem><SelectItem value="Tahunan">Tahunan (12 Bulan)</SelectItem>
                                            </SelectContent></Select><FormMessage /></FormItem>
                                        )}/>
                                        {selectedCycle === 'Bulanan' ? (
                                            <FormField control={form.control} name="period" render={({ field }) => (
                                                <FormItem><FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Periode Bulan</FormLabel><FormControl><Input type="month" {...field} value={field.value || ''} className="h-11 font-bold" /></FormControl><FormMessage /></FormItem>
                                            )}/>
                                        ) : (
                                            <>
                                                <FormField control={form.control} name="periodStart" render={({ field }) => (
                                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Mulai Periode</FormLabel><FormControl><Input type="month" {...field} value={field.value || ''} className="h-11 font-bold" /></FormControl><FormMessage /></FormItem>
                                                )}/>
                                                <FormField control={form.control} name="periodEnd" render={({ field }) => (
                                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Selesai Periode</FormLabel><FormControl><Input type="month" {...field} value={field.value || ''} className="h-11 font-bold" /></FormControl><FormMessage /></FormItem>
                                                )}/>
                                            </>
                                        )}
                                         <FormField control={form.control} name="status" render={({ field }) => (
                                            <FormItem><FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Status Aktivasi</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-11 font-bold"><SelectValue/></SelectTrigger></FormControl><SelectContent>
                                                <SelectItem value="Aktif">Aktif</SelectItem><SelectItem value="Tidak Aktif">Tidak Aktif</SelectItem>
                                            </SelectContent></Select><FormMessage /></FormItem>
                                        )}/>
                                    </CardContent>
                                </Card>

                                <Card className="border-border/40 shadow-sm overflow-hidden bg-background">
                                     <CardHeader className="bg-muted/20 border-b p-5">
                                        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><BarChart4 className="size-4 text-primary"/>Matriks Bobot & Kompetensi</CardTitle>
                                        <CardDescription className="text-[10px] font-bold uppercase text-primary/60">Tentukan bobot kontribusi untuk setiap level jabatan.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <FormField
                                            control={form.control}
                                            name="activeLevels"
                                            render={({ field }) => (
                                            <FormItem className="space-y-4 mb-8 p-4 rounded-2xl bg-muted/20 border-border/40 border">
                                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block text-center">Pilih Level Jabatan untuk Dinilai</FormLabel>
                                                <div className="flex flex-wrap justify-center gap-4">
                                                {levelKeys.map((level) => (
                                                    <FormItem
                                                        key={level}
                                                        className="flex flex-row items-center space-x-2 space-y-0 px-4 py-2 rounded-xl bg-background border shadow-sm cursor-pointer"
                                                    >
                                                        <FormControl>
                                                        <Checkbox
                                                            checked={field.value?.includes(level)}
                                                            onCheckedChange={(checked) => {
                                                            return checked
                                                                ? field.onChange([...(field.value || []), level])
                                                                : field.onChange(
                                                                    (field.value || []).filter(
                                                                    (value) => value !== level
                                                                    )
                                                                )
                                                            }}
                                                        />
                                                        </FormControl>
                                                        <FormLabel className="font-bold text-xs uppercase cursor-pointer">
                                                        {level}
                                                        </FormLabel>
                                                    </FormItem>
                                                ))}
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                            )}
                                        />

                                        {activeLevels && activeLevels.length > 0 ? (
                                             <Tabs defaultValue={activeLevels[0]} className="w-full flex flex-col items-center">
                                                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 bg-muted/50 p-1 rounded-xl h-auto gap-1">
                                                    {levelKeys.map(level => (
                                                        activeLevels.includes(level) && <TabsTrigger key={level} value={level} className="text-[10px] font-bold uppercase rounded-lg h-9">{level}</TabsTrigger>
                                                    ))}
                                                </TabsList>
                                                {activeLevels.map(level => (
                                                    <TabsContent key={level} value={level} className="pt-8 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                        <LevelWeightingForm level={level as keyof Employee['level']} form={form} kboSetups={kboSetups} selectedCompany={selectedCompany} />
                                                    </TabsContent>
                                                ))}
                                            </Tabs>
                                        ) : (
                                            <div className="py-20 text-center border-2 border-dashed rounded-3xl bg-muted/10 opacity-30">
                                                <Users size={48} className="mx-auto mb-4" />
                                                <p className="font-black uppercase text-[10px] tracking-[0.2em]">Pilih Level Jabatan</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </ScrollArea>
                        <SheetFooter className="p-6 border-t bg-background shrink-0 flex flex-row justify-end gap-2">
                            <SheetClose asChild><Button type="button" variant="ghost" className="font-bold">Batal</Button></SheetClose>
                            <Button type="submit" className="font-black uppercase tracking-widest text-[10px] h-11 px-8 shadow-lg shadow-primary/10">Simpan Seluruh Konfigurasi</Button>
                        </SheetFooter>
                    </form>
                </Form>
            </SheetContent>
        </Sheet>
    )
}

// --- Main Page Component ---
export default function AppraisalSettingsPage() {
    const { currentUser, userRole } = useAuth();
    const { companies, kboSetups, appraisalSetups, okrs, employees, addAppraisalSetup, updateAppraisalSetup, deleteAppraisalSetup, generateAppraisalTasks } = useMasterData();
    const { toast } = useToast();
    const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('all');
    const [isSheetOpen, setSheetOpen] = useState(false);
    const [selectedSetup, setSelectedSetup] = useState<AppraisalSetup | undefined>(undefined);
    const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
    const [okrMappingDialogOpen, setOkrMappingDialogOpen] = useState(false);
    const [setupForMapping, setSetupForMapping] = useState<AppraisalSetup | null>(null);
    const [selectedKboSetupForMapping, setSelectedKboSetupForMapping] = useState<KboSetup | null>(null);
    const [activeLevelsForMapping, setActiveLevelsForMapping] = useState<Set<keyof Employee['level']>>(new Set());
    const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [setupToDelete, setSetupToDelete] = useState<AppraisalSetup | null>(null);

    const manageableCompanies = useMemo(() => {
        if (userRole === 'superadmin') return companies.filter(c => c.status === 'Aktif');
        if (currentUser?.company) {
            const userCompany = companies.find(c => c.name === currentUser.company);
            if (!userCompany) return [];
            if (userCompany.isHolding) {
                const getChildCompanies = (parentId: string): Company[] => {
                    const children = companies.filter(c => c.parentId === parentId);
                    return [...children, ...children.flatMap(c => getChildCompanies(c.id))];
                };
                return [userCompany, ...getChildCompanies(userCompany.id)];
            }
            return [userCompany];
        }
        return [];
    }, [companies, currentUser, userRole]);

    const showCompanyFilter = useMemo(() => userRole === 'superadmin' || (userRole === 'manajemen' && !!currentUser?.company && !!companies.find(c => c.name === currentUser.company)?.isHolding), [userRole, currentUser, companies]);


    useEffect(() => {
        if (!showCompanyFilter && currentUser?.company) {
            setSelectedCompanyFilter(currentUser.company);
        } else if (showCompanyFilter) {
            setSelectedCompanyFilter('all');
        }
    }, [showCompanyFilter, currentUser]);

    // Detect if an appraisal setup has subjects with active OKRs (including contributors)
    const checkHasSubjectsWithOkrs = useCallback((setup: AppraisalSetup) => {
        const allMappedSubjectIds = new Set<string>();
        if (setup.customRaterMappings) {
            Object.values(setup.customRaterMappings).forEach(kboMap => {
                Object.entries(kboMap).forEach(([subjectId, mapping]) => {
                    if (mapping.isSubjectActive) allMappedSubjectIds.add(subjectId);
                });
            });
        }

        if (allMappedSubjectIds.size === 0) return false;

        const periodStart = parse(setup.periodStart || setup.period || '', 'yyyy-MM', new Date());
        const periodEnd = lastDayOfMonth(parse(setup.periodEnd || setup.period || '', 'yyyy-MM', new Date()));

        return Array.from(allMappedSubjectIds).some(id => {
            return okrs.some(okr => {
                if (okr.status === 'Draft' || okr.status === 'Waiting for Approval') return false;
                
                // Check if subject is owner or any kind of participant
                const isParticipant = okr.ownerId === id || okr.keyResults.some(kr => 
                    kr.ownerId === id ||
                    kr.contributors?.some(c => c.ownerId === id) ||
                    kr.milestones?.some(m => m.ownerId === id) ||
                    kr.checklist?.some(c => c.ownerId === id)
                );

                if (!isParticipant) return false;

                const okrStart = okr.startDate.toDate();
                const okrEnd = okr.endDate.toDate();
                return (okrStart <= periodEnd && okrEnd >= periodStart);
            });
        });
    }, [okrs]);

    const filteredSetups = useMemo(() => {
        if (!appraisalSetups) return [];
        let setups = appraisalSetups;
        if (selectedCompanyFilter !== 'all') {
            setups = setups.filter(s => s.company === selectedCompanyFilter);
        } else if (userRole !== 'superadmin' && currentUser?.company) {
             const manageableCompanyNames = manageableCompanies.map(c => c.name);
             setups = setups.filter(s => manageableCompanyNames.includes(s.company));
        }
        return setups.sort((a,b) => (b.period || b.periodStart || '').localeCompare(a.period || a.periodStart || ''));
    }, [appraisalSetups, selectedCompanyFilter, userRole, currentUser, manageableCompanies]);
    
    const handleSave = async (data: Omit<AppraisalSetup, 'id'> & { id?: string }) => {
        try {
            if (data.id) {
                await updateAppraisalSetup(data.id, data);
            } else {
                await addAppraisalSetup(data);
            }
        } catch (error: any) {
             toast({ variant: 'destructive', title: "Gagal Menyimpan", description: error.message });
        }
    };
    
    const handleOpenMappingDialog = (setup: AppraisalSetup, kboSetup: KboSetup, activeLevels: Set<keyof Employee['level']>) => {
        setSetupForMapping(setup);
        setSelectedKboSetupForMapping(kboSetup);
        setActiveLevelsForMapping(activeLevels);
        setMappingDialogOpen(true);
    }

    const handleOpenOkrMappingDialog = (setup: AppraisalSetup) => {
        setSetupForMapping(setup);
        setOkrMappingDialogOpen(true);
    }
    
    const openDeleteDialog = (setup: AppraisalSetup) => {
        setSetupToDelete(setup);
        setDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!setupToDelete) return;
        try {
            await deleteAppraisalSetup(setupToDelete.id);
            toast({ title: 'Data Dihapus', description: 'Pengaturan appraisal dan semua tugas terkait telah dihapus.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Gagal Menghapus', description: error.message });
        } finally {
            setSetupToDelete(null);
            setDeleteDialogOpen(false);
        }
    };

    return (
        <ResponsivePage>
            <PageHeader 
                title="Pengaturan Appraisal"
                description="Kelola seluruh bobot penilaian kinerja (KPI + KBO) dan pemetaan penilai untuk setiap unit bisnis."
                icon={ClipboardPen}
                actions={
                    <Button onClick={() => { setSelectedSetup(undefined); setSheetOpen(true); }} className="font-bold shadow-lg h-9 sm:h-10 active:scale-95 transition-all">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Buat Pengaturan Baru
                    </Button>
                }
            />

            <ResponsiveToolbar>
                <div className="flex flex-1 items-center gap-2 min-w-0">
                    <Filter className="size-4 text-muted-foreground hidden sm:block shrink-0" />
                    {showCompanyFilter && (
                        <Select value={selectedCompanyFilter} onValueChange={setSelectedCompanyFilter}>
                            <SelectTrigger className="w-full sm:w-[240px] bg-background border-none h-10 shadow-sm text-[11px] font-black uppercase">
                                <Building className="size-3.5 mr-2 text-primary" />
                                <SelectValue placeholder="Pilih Perusahaan" />
                            </SelectTrigger>
                            <SelectContent className="z-[350]">
                                <SelectItem value="all">Semua Klien Saya</SelectItem>
                                {manageableCompanies.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </ResponsiveToolbar>

            <div className="pt-4">
                {filteredSetups && filteredSetups.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full space-y-4">
                        {filteredSetups.map((setup) => {
                            const activeKboContexts = new Map<string, { kboSetup: KboSetup, levels: Set<keyof Employee['level']> }>();
                            const activeLevels = setup.activeLevels || levelKeys;
                            const hasOkrOption = checkHasSubjectsWithOkrs(setup);
                            
                            activeLevels.forEach(level => {
                                const levelComponents = setup.componentsByLevel?.[level as keyof typeof setup.componentsByLevel];
                                if (levelComponents?.kboWeight > 0 && levelComponents.kbo) {
                                    Object.values(levelComponents.kbo).forEach(kboComp => {
                                        kboComp.kboSetupIds?.forEach(kboSetupId => {
                                            const kboSetup = kboSetups.find(ks => ks.id === kboSetupId);
                                            if (kboSetup) {
                                                if (!activeKboContexts.has(kboSetup.id)) {
                                                    activeKboContexts.set(kboSetup.id, { kboSetup, levels: new Set() });
                                                }
                                                activeKboContexts.get(kboSetup.id)?.levels.add(level as keyof Employee['level']);
                                            }
                                        });
                                    });
                                }
                            });

                            return (
                            <AccordionItem value={setup.id} key={setup.id} className="border rounded-2xl overflow-hidden bg-background shadow-sm border-border/40">
                                <AccordionTrigger className="px-4 sm:px-6 py-5 hover:no-underline group">
                                    <div className="flex items-center justify-between w-full pr-4">
                                        <div className="text-left grid gap-0.5 min-w-0 flex-1">
                                            <p className="font-black text-slate-900 uppercase tracking-tight truncate">{setup.company}</p>
                                            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground tracking-widest pt-1">
                                                <Calendar size={12} className="opacity-40" />
                                                <span>{setup.period || `${setup.periodStart} - ${setup.periodEnd}`}</span>
                                                <span className="opacity-30">•</span>
                                                <span className="text-primary/70">{setup.cycle}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            {hasOkrOption && <Badge variant="secondary" className="h-5 px-1.5 font-black text-[8px] uppercase gap-1 bg-purple-50 text-purple-700 border-none"><Target className="size-2.5"/> OKR</Badge>}
                                            <Badge variant={setup.status === "Aktif" ? "default" : "outline"} className="h-5 px-1.5 font-black text-[8px] uppercase border-none">
                                                {setup.status}
                                            </Badge>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-0 border-t border-border/40">
                                    <div className="p-5 sm:p-8 space-y-6">
                                        <div className="flex flex-wrap gap-x-6 gap-y-3">
                                            <div className="space-y-1.5">
                                                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.2em]">Target Penilaian</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {setup.activeLevels.length > 0 ? setup.activeLevels.map(lvl => <Badge key={lvl} variant="outline" className="text-[9px] font-bold h-5 border-border/60">{lvl}</Badge>) : <span className="text-xs text-muted-foreground italic">Tidak ada level aktif</span>}
                                                </div>
                                            </div>
                                            
                                            {activeKboContexts.size > 0 && (
                                                <div className="space-y-1.5">
                                                    <p className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.2em]">Pustaka KBO Aktif</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {Array.from(activeKboContexts.values()).map(({ kboSetup, levels }) => (
                                                            <Badge key={kboSetup.id} variant="secondary" className="text-[9px] font-bold h-5 bg-primary/5 text-primary border-none">
                                                                {kboSetup.categoryName} ({getContextName(kboSetup)})
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex justify-end pt-4 border-t border-dashed gap-2">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="outline" size="sm" className="h-9 gap-2 font-black text-[10px] uppercase shadow-sm">
                                                        <Settings className="size-3.5" /> Konfigurasi Penilai
                                                        <ChevronDown className="size-3" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="z-[350] w-64">
                                                    <DropdownMenuLabel className="text-[10px] uppercase opacity-60">Mapping Per Kategori</DropdownMenuLabel>
                                                    {Array.from(activeKboContexts.values()).map(({ kboSetup, levels }) => (
                                                        <DropdownMenuItem key={kboSetup.id} onClick={() => handleOpenMappingDialog(setup, kboSetup, levels)} className="text-xs">
                                                            <Users className="size-3.5 mr-2 opacity-60" /> {kboSetup.categoryName}
                                                        </DropdownMenuItem>
                                                    ))}
                                                    {hasOkrOption && (
                                                        <>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuLabel className="text-[10px] uppercase opacity-60">Deep Integration</DropdownMenuLabel>
                                                            <DropdownMenuItem onClick={() => handleOpenOkrMappingDialog(setup)} className="text-primary font-bold text-xs">
                                                                <Target className="mr-2 h-3.5 w-3.5" /> Penyesuaian Bobot OKR
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-muted">
                                                        <MoreHorizontal className="size-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="z-[350]">
                                                    <DropdownMenuLabel className="text-[10px] uppercase opacity-60 font-black">Opsi Lanjutan</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => { setSelectedSetup(setup); setSheetOpen(true);}} className="text-xs"><Pencil className="size-3.5 mr-2" />Ubah Dasar Setup</DropdownMenuItem>
                                                    <DropdownMenuItem asChild className="text-xs"><Link href={`/kbo-appraisal?setupId=${setup.id}`}><AreaChart className="size-3.5 mr-2" />Lihat Progres Laporan</Link></DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-destructive font-bold text-xs" onClick={() => openDeleteDialog(setup)}><Trash2 className="size-3.5 mr-2" />Hapus Permanen</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                            )
                        })}
                    </Accordion>
                ) : (
                    <div className="py-32 text-center border-2 border-dashed rounded-[2rem] bg-muted/10 opacity-30">
                        <ClipboardPen size={48} className="mx-auto mb-4" />
                        <p className="font-black uppercase text-[10px] tracking-[0.2em]">Belum Ada Konfigurasi</p>
                    </div>
                )}
            </div>

            <AppraisalSetupSheet
                isOpen={isSheetOpen}
                onOpenChange={setSheetOpen}
                setup={selectedSetup}
                onSave={handleSave}
                companies={companies}
                kboSetups={kboSetups}
                manageableCompanies={manageableCompanies}
            />
            {setupForMapping && selectedKboSetupForMapping && (
                <AppraisalMappingDialog
                    isOpen={mappingDialogOpen}
                    onOpenChange={setMappingDialogOpen}
                    setup={setupForMapping}
                    kboSetup={selectedKboSetupForMapping}
                    activeLevels={activeLevelsForMapping}
                />
            )}
            {setupForMapping && (
                <OkrWeightMappingDialog 
                    isOpen={okrMappingDialogOpen}
                    onOpenChange={setOkrMappingDialogOpen}
                    setup={setupForMapping}
                />
            )}
            {setupToDelete && (
                <DeleteConfirmationDialog
                    isOpen={isDeleteDialogOpen}
                    onOpenChange={setDeleteDialogOpen}
                    onConfirm={handleDelete}
                    itemName={`pengaturan appraisal untuk ${setupToDelete.company} (${setupToDelete.period || setupToDelete.periodStart})`}
                    itemType="pengaturan appraisal"
                />
            )}
        </ResponsivePage>
    );
}
