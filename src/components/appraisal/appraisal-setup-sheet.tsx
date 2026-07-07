
"use client";

import * as React from 'react';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import type { AppraisalSetup, Company, Employee } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Save, Shield, ClipboardCheck, LayoutGrid, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const componentsSchema = z.object({
  kpiWeight: z.coerce.number().min(0).max(100),
  kboWeight: z.coerce.number().min(0).max(100),
  kbo: z.record(z.object({
    kboSetupIds: z.array(z.string()).optional(),
    weight: z.coerce.number().optional()
  })).optional()
});

const appraisalSetupSchema = z.object({
  id: z.string().optional(),
  company: z.string().min(1, "Perusahaan harus dipilih"),
  periodStart: z.string().min(1, "Periode mulai wajib diisi"),
  periodEnd: z.string().min(1, "Periode selesai wajib diisi"),
  cycle: z.enum(['Bulanan', 'Triwulan', 'Semesteran', 'Tahunan']),
  status: z.enum(['Aktif', 'Tidak Aktif']),
  activeLevels: z.array(z.string()).min(1, "Minimal pilih satu level jabatan"),
  componentsByLevel: z.object({
    Direktur: componentsSchema,
    Manager: componentsSchema,
    Supervisor: componentsSchema,
    Staff: componentsSchema,
  }),
});

type AppraisalSetupFormValues = z.infer<typeof appraisalSetupSchema>;

interface AppraisalSetupSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  setup?: AppraisalSetup;
  onSave: (data: Omit<AppraisalSetup, 'id'> & { id?: string }) => Promise<void>;
}

const LEVEL_OPTIONS: Array<Employee['level']> = ['Direktur', 'Manager', 'Supervisor', 'Staff'];

export function AppraisalSetupSheet({ isOpen, onOpenChange, setup, onSave }: AppraisalSetupSheetProps) {
  const { userRole, currentUser } = useAuth();
  const { companies } = useMasterData();
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<AppraisalSetupFormValues>({
    resolver: zodResolver(appraisalSetupSchema),
    defaultValues: {
      company: '',
      cycle: 'Bulanan',
      status: 'Aktif',
      activeLevels: ['Staff', 'Supervisor', 'Manager'],
      componentsByLevel: {
        Direktur: { kpiWeight: 50, kboWeight: 50 },
        Manager: { kpiWeight: 60, kboWeight: 40 },
        Supervisor: { kpiWeight: 70, kboWeight: 30 },
        Staff: { kpiWeight: 80, kboWeight: 20 },
      }
    },
  });

  const watchedCompany = form.watch('company');
  const watchedLevels = form.watch('activeLevels') || [];

  const manageableCompanies = useMemo(() => {
    if (userRole === 'superadmin') return companies;
    return companies.filter(c => c.name === currentUser?.company);
  }, [companies, userRole, currentUser]);

  useEffect(() => {
    if (isOpen) {
      if (setup) {
        form.reset(setup as any);
      } else {
        const defaultCompany = userRole !== 'superadmin' ? currentUser?.company || '' : '';
        form.reset({
          company: defaultCompany,
          cycle: 'Bulanan',
          status: 'Aktif',
          activeLevels: ['Staff', 'Supervisor', 'Manager'],
          componentsByLevel: {
            Direktur: { kpiWeight: 50, kboWeight: 50 },
            Manager: { kpiWeight: 60, kboWeight: 40 },
            Supervisor: { kpiWeight: 70, kboWeight: 30 },
            Staff: { kpiWeight: 80, kboWeight: 20 },
          }
        });
      }
    }
  }, [isOpen, setup, form, userRole, currentUser]);

  const onSubmit = async (data: AppraisalSetupFormValues) => {
    setIsLoading(true);
    try {
      await onSave(data as any);
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col h-full p-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <SheetHeader className="p-6 border-b bg-muted/20">
              <SheetTitle className="font-black text-xl tracking-tighter">
                {setup ? 'UBAH SETUP RATER' : 'BUAT SETUP RATER BARU'}
              </SheetTitle>
              <SheetDescription className="text-xs font-bold uppercase tracking-widest text-primary/60">
                Konfigurasi bobot penilaian dan cakupan rater per periode.
              </SheetDescription>
            </SheetHeader>

            <ScrollArea className="flex-1 min-h-0 bg-background">
              <div className="p-6 space-y-8">
                {/* Section 1: Dasar & Periode */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <LayoutGrid size={16} strokeWidth={3} />
                    <h3 className="text-xs font-black uppercase tracking-widest">Konteks & Periode</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase opacity-60">Unit Bisnis</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-10 font-bold bg-muted/5">
                                <SelectValue placeholder="Pilih Perusahaan" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {manageableCompanies.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cycle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase opacity-60">Siklus Penilaian</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-10 font-bold bg-muted/5">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Bulanan">Bulanan</SelectItem>
                              <SelectItem value="Triwulan">Triwulan</SelectItem>
                              <SelectItem value="Semesteran">Semesteran</SelectItem>
                              <SelectItem value="Tahunan">Tahunan</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="periodStart"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase opacity-60">Mulai Periode</FormLabel>
                          <FormControl><Input type="month" {...field} className="h-10 font-bold" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="periodEnd"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black uppercase opacity-60">Selesai Periode</FormLabel>
                          <FormControl><Input type="month" {...field} className="h-10 font-bold" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                {/* Section 2: Level Jabatan */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Shield size={16} strokeWidth={3} />
                    <h3 className="text-xs font-black uppercase tracking-widest">Level yang Terlibat</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {LEVEL_OPTIONS.map((lvl) => (
                      <FormField
                        key={lvl}
                        control={form.control}
                        name="activeLevels"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-3 rounded-xl border bg-muted/5">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(lvl)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...(field.value || []), lvl])
                                    : field.onChange(field.value?.filter((value) => value !== lvl))
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-xs font-black uppercase cursor-pointer">{lvl}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage>{form.formState.errors.activeLevels?.message}</FormMessage>
                </div>

                <Separator />

                {/* Section 3: Bobot per Level */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-primary">
                    <ClipboardCheck size={16} strokeWidth={3} />
                    <h3 className="text-xs font-black uppercase tracking-widest">Konfigurasi Bobot Skor Akhir</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-6">
                    {LEVEL_OPTIONS.map((lvl) => {
                      const isActive = watchedLevels.includes(lvl);
                      if (!isActive) return null;

                      return (
                        <div key={lvl} className="p-5 rounded-2xl border border-border/60 bg-background shadow-sm space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
                          <div className="flex justify-between items-center">
                            <Badge variant="secondary" className="font-black text-[10px] uppercase h-5 px-2 bg-primary/5 text-primary border-none">LEVEL: {lvl}</Badge>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total 100%</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`componentsByLevel.${lvl}.kpiWeight`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[9px] font-black uppercase text-muted-foreground">Bobot KPI (%)</FormLabel>
                                  <FormControl><Input type="number" {...field} className="h-9 font-black" /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`componentsByLevel.${lvl}.kboWeight`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[9px] font-black uppercase text-muted-foreground">Bobot KBO (%)</FormLabel>
                                  <FormControl><Input type="number" {...field} className="h-9 font-black" /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </ScrollArea>

            <SheetFooter className="p-6 border-t bg-muted/20">
              <div className="flex w-full justify-between items-center gap-4">
                <SheetClose asChild><Button variant="ghost" className="font-black text-[10px] uppercase tracking-widest">Batal</Button></SheetClose>
                <Button type="submit" disabled={isLoading} className="font-black text-[10px] uppercase tracking-widest px-8 shadow-lg active:scale-[0.98] transition-all">
                  {isLoading ? <Loader2 className="animate-spin size-4" /> : <Save size={14} className="mr-2" />}
                  {setup ? 'Simpan Perubahan' : 'Publikasi Setup'}
                </Button>
              </div>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
