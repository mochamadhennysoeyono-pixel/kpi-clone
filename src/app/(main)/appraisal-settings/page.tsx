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
                <FormField control={control} name={`componentsByLevel.${level}.kpiWeight`} render={({ field }) => (<FormItem><FormLabel>Bobot KPI (%)</FormLabel><FormControl><Input type="number" {...field} readOnly className="bg-muted/50" /></FormControl><FormMessage /></FormItem>)}/>
                <FormField control={control} name={`componentsByLevel.${level}.kboWeight`} render={({ field }) => (
                    <FormItem>
                         <div className="flex items-center justify-between">
                            <FormLabel>Bobot KBO (%)</FormLabel>
                            {kboContributionSummary && <Badge variant="outline">{kboContributionSummary}</Badge>}
                         </div>
                         <FormControl><Input type="number" {...field} /></FormControl><FormMessage />
                    </FormItem>
                )}/>
            </div>
             {kboWeight > 0 && activeKboCategories.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                    <Label>Bobot Kontribusi Kategori KBO</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         {activeKboCategories.map(categoryName => (
                            <FormField
                                key={categoryName}
                                control={control}
                                name={`componentsByLevel.${level}.kbo.${categoryName}.weight`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs text-primary font-semibold">{categoryName}</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                {...field}
                                                value={field.value ?? ''}
                                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                 <div className="space-y-4 rounded-lg border p-4">
                    <h4 className="font-medium text-center">Pilih Kompetensi (KBO) yang akan dinilai</h4>
                    <Accordion type="multiple" className="w-full space-y-2">
                    {groupedKboSetups.map(([categoryName, setups]) => (
                        <AccordionItem value={categoryName} key={categoryName} className="border rounded-md px-4 bg-background">
                            <AccordionTrigger className="py-3">{categoryName}</AccordionTrigger>
                            <AccordionContent className="pb-4 space-y-6">
                               <FormField
                                  control={control}
                                  name={`componentsByLevel.${level}.kbo.${categoryName}.kboSetupIds`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <div className="space-y-3">
                                        {setups.map(kbo => (
                                          <FormItem
                                            key={kbo.id}
                                            className="flex flex-row items-start space-x-3 space-y-0"
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
                                            <FormLabel className="text-sm font-normal">
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
            <SheetContent className="w-full sm:max-w-4xl flex flex-col h-full">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
                        <SheetHeader className="p-6">
                            <SheetTitle>{setup ? "Ubah Pengaturan Appraisal" : "Buat Pengaturan Appraisal Baru"}</SheetTitle>
                            <SheetDescription>Atur seluruh konfigurasi penilaian kinerja sebelum periode appraisal dimulai.</SheetDescription>
                        </SheetHeader>
                        <ScrollArea className="flex-1 min-h-0">
                            <div className="space-y-8 p-6">
                                <Card>
                                    <CardHeader><CardTitle className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5"/>Pengaturan Umum</CardTitle></CardHeader>
                                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField control={form.control} name="company" render={({ field }) => (
                                            <FormItem><FormLabel>Perusahaan</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{manageableCompanies.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={form.control} name="cycle" render={({ field }) => (
                                            <FormItem><FormLabel>Siklus Penilaian</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pilih Siklus" /></SelectTrigger></FormControl><SelectContent>
                                                <SelectItem value="Bulanan">Bulanan</SelectItem><SelectItem value="Triwulan">Triwulan (3 Bulan)</SelectItem>
                                                <SelectItem value="Semesteran">Semesteran (6 Bulan)</SelectItem><SelectItem value="Tahunan">Tahunan (12 Bulan)</SelectItem>
                                            </SelectContent></Select><FormMessage /></FormItem>
                                        )}/>
                                        {selectedCycle === 'Bulanan' ? (
                                            <FormField control={form.control} name="period" render={({ field }) => (
                                                <FormItem><FormLabel>Periode</FormLabel><FormControl><Input type="month" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                                            )}/>
                                        ) : (
                                            <>
                                                <FormField control={form.control} name="periodStart" render={({ field }) => (
                                                    <FormItem><FormLabel>Periode Mulai</FormLabel><FormControl><Input type="month" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                                                )}/>
                                                <FormField control={form.control} name="periodEnd" render={({ field }) => (
                                                    <FormItem><FormLabel>Periode Selesai</FormLabel><FormControl><Input type="month" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                                                )}/>
                                            </>
                                        )}
                                         <FormField control={form.control} name="status" render={({ field }) => (
                                            <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>
                                                <SelectItem value="Aktif">Aktif</SelectItem><SelectItem value="Tidak Aktif">Tidak Aktif</SelectItem>
                                            </SelectContent></Select><FormMessage /></FormItem>
                                        )}/>
                                    </CardContent>
                                </Card>
                                <Card>
                                     <CardHeader>
                                        <CardTitle className="flex items-center gap-2"><BarChart4 className="h-5 w-5"/>Bobot per Level Jabatan</CardTitle>
                                        <CardDescription>Pilih level jabatan yang akan dinilai, lalu atur bobot KPI dan KBO secara spesifik.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <FormField
                                            control={form.control}
                                            name="activeLevels"
                                            render={({ field }) => (
                                            <FormItem className="space-y-3 mb-6">
                                                <FormLabel>Pilih Level Jabatan untuk Dinilai</FormLabel>
                                                <div className="flex flex-wrap gap-x-6 gap-y-3">
                                                {levelKeys.map((level) => (
                                                    <FormItem
                                                        key={level}
                                                        className="flex flex-row items-start space-x-3 space-y-0"
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
                                                        <FormLabel className="font-normal">
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
                                                <TabsList className="justify-center">
                                                    {levelKeys.map(level => (
                                                        activeLevels.includes(level) && <TabsTrigger key={level} value={level}>{level}</TabsTrigger>
                                                    ))}
                                                </TabsList>
                                                {activeLevels.map(level => (
                                                    <TabsContent key={level} value={level} className="pt-6 w-full">
                                                        <LevelWeightingForm level={level as keyof Employee['level']} form={form} kboSetups={kboSetups} selectedCompany={selectedCompany} />
                                                    </TabsContent>
                                                ))}
                                            </Tabs>
                                        ) : (
                                            <div className="text-center text-muted-foreground p-6 border-2 border-dashed rounded-lg">
                                                Pilih setidaknya satu level jabatan untuk mulai mengatur bobot.
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </ScrollArea>
                        <SheetFooter className="p-6 border-t">
                            <SheetClose asChild><Button type="button" variant="outline">Batal</Button></SheetClose>
                            <Button type="submit">Simpan Konfigurasi</Button>
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
        <>
        <div className="space-y-6">
            <Card className="shadow-lg border-t-4 border-primary mb-6 overflow-hidden">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <ClipboardPen className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="font-headline text-2xl">Pengaturan Appraisal</CardTitle>
                                <CardDescription>
                                    Kelola seluruh konfigurasi penilaian kinerja sebelum periode appraisal dimulai.
                                </CardDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-center">
                            {showCompanyFilter && (
                                <Select value={selectedCompanyFilter} onValueChange={setSelectedCompanyFilter}>
                                    <SelectTrigger className="w-full sm:w-[200px]">
                                        <SelectValue placeholder="Filter Perusahaan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Perusahaan</SelectItem>
                                        {manageableCompanies.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )}
                             <Button size="sm" className="h-9 gap-1 shadow-md" onClick={() => { setSelectedSetup(undefined); setSheetOpen(true); }}>
                                <PlusCircle className="h-3.5 w-3.5" />
                                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                                    Buat Pengaturan
                                </span>
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {filteredSetups && filteredSetups.length > 0 ? (
                 <Accordion type="single" collapsible className="w-full">
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
                        <AccordionItem value={setup.id} key={setup.id}>
                            <AccordionTrigger className="p-4 bg-muted/30 rounded-t-lg">
                                <div className="flex items-center justify-between w-full pr-4">
                                    <div className="text-left grid gap-1">
                                        <p className="font-semibold">{setup.company}</p>
                                        <p className="text-sm text-muted-foreground">{setup.period || `${setup.periodStart} - ${setup.periodEnd}`} ({setup.cycle})</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {hasOkrOption && <Badge variant="secondary" className="gap-1"><Target className="h-3 w-3"/> OKR Aktif</Badge>}
                                        <Badge variant={setup.status === "Aktif" ? "default" : "outline"}>
                                            {setup.status}
                                        </Badge>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="p-4 border border-t-0 rounded-b-lg space-y-4">
                                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                                    <span className="font-medium">Level Aktif:</span>
                                    {setup.activeLevels.length > 0 ? setup.activeLevels.map(lvl => <Badge key={lvl} variant="outline">{lvl}</Badge>) : 'Tidak ada'}
                                </div>
                                
                                {activeKboContexts.size > 0 && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-muted-foreground">Kompetensi Aktif:</span>
                                        <div className="flex flex-wrap gap-1">
                                            {Array.from(activeKboContexts.values()).map(({ kboSetup, levels }) => (
                                                <Badge key={kboSetup.id} variant="outline">
                                                    {kboSetup.categoryName} ({getContextName(kboSetup)})
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="flex justify-end items-center gap-2 mt-4">
                                     <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button aria-haspopup="true" size="sm" variant="ghost">
                                            <MoreHorizontal className="mr-2 h-4 w-4" />
                                            Aksi Lainnya
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuLabel>Aksi Dasar</DropdownMenuLabel>
                                          <DropdownMenuItem onClick={() => { setSelectedSetup(setup); setSheetOpen(true);}}>Ubah Konfigurasi</DropdownMenuItem>
                                           <DropdownMenuSeparator />
                                          <DropdownMenuLabel>Pemetaan Penilai</DropdownMenuLabel>
                                          {Array.from(activeKboContexts.values()).map(({ kboSetup, levels }) => (
                                            <DropdownMenuItem key={kboSetup.id} onClick={() => handleOpenMappingDialog(setup, kboSetup, levels)}>
                                                Pemetaan: {kboSetup.categoryName} ({getContextName(kboSetup)})
                                            </DropdownMenuItem>
                                          ))}
                                          {hasOkrOption && (
                                              <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuLabel>Integrasi OKR</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => handleOpenOkrMappingDialog(setup)} className="text-primary font-bold">
                                                    <Target className="mr-2 h-4 w-4" /> Penyesuaian Bobot OKR
                                                </DropdownMenuItem>
                                              </>
                                          )}
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem asChild>
                                            <Link href={`/kbo-appraisal?setupId=${setup.id}`}>Lihat Laporan KBO</Link>
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem className="text-destructive" onClick={() => openDeleteDialog(setup)}>
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Hapus Pengaturan
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        )
                    })}
                 </Accordion>
            ) : (
                <Card>
                    <CardContent className="p-10 text-center text-muted-foreground">
                        Tidak ada pengaturan appraisal yang ditemukan.
                    </CardContent>
                </Card>
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
        </>
    );
}
