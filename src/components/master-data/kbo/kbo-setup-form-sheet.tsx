// src/components/master-data/kbo/kbo-setup-form-sheet.tsx
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { KboSetup, Company, KboDimension, Department, Position, KboRatingScaleItem } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';
import { DEFAULT_KBO_CATEGORIES } from '@/lib/default-data';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const keyBehaviorSchema = z.object({ value: z.string().min(1, 'Key behavior tidak boleh kosong') });

const ratingScaleItemSchema = z.object({
  level: z.coerce.number(),
  name: z.string().min(1, "Nama skala harus diisi"),
  percentage: z.coerce.number().min(0).max(100),
});

const dimensionSchema = z.object({
  id: z.string(),
  dimension: z.string().min(1, "Dimension harus diisi"),
  definition: z.string().min(1, "Definisi harus diisi"),
  keyBehaviors: z.array(keyBehaviorSchema).min(1, "Minimal satu key behavior"),
});

const setupSchema = z.object({
  id: z.string().optional(),
  company: z.string().min(1, "Konteks perusahaan harus dipilih"),
  categoryName: z.string().min(1, "Kategori harus dipilih"),
  level: z.enum(['Staff', 'Supervisor', 'Manager', 'Direktur']).optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  dimensions: z.array(dimensionSchema).min(1, "Minimal harus ada satu dimensi"),
  ratingScale: z.array(ratingScaleItemSchema).length(4, "Harus ada 4 skala penilaian"),
}).superRefine((data, ctx) => {
    if (data.categoryName === 'Generic Competency' && !data.level) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Level jabatan harus dipilih untuk kategori Generic.',
            path: ['level'],
        });
    }
    if (data.categoryName === 'Specific Competency' && !data.position) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Jabatan harus dipilih untuk kategori Specific.',
            path: ['position'],
        });
    }
});


type SetupFormValues = z.infer<typeof setupSchema>;

const defaultRatingScale: KboRatingScaleItem[] = [
    { level: 1, name: 'Sangat Tidak Kompeten', percentage: 25 },
    { level: 2, name: 'Kurang Kompeten', percentage: 50 },
    { level: 3, name: 'Kompeten', percentage: 75 },
    { level: 4, name: 'Sangat Kompeten', percentage: 100 },
];

function DimensionFields({ control, index, removeDimension, scorePerBehavior }: { control: any, index: number, removeDimension: (index: number) => void, scorePerBehavior: number }) {
    const { fields: kbFields, append: appendKb, remove: removeKb } = useFieldArray({
        control,
        name: `dimensions.${index}.keyBehaviors`
    });

    return (
      <div className="p-4 rounded-lg space-y-4 relative bg-muted/50 border">
        <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-muted-foreground hover:text-destructive" onClick={() => removeDimension(index)}><Trash2 className="h-4 w-4" /></Button>
        <FormField control={control} name={`dimensions.${index}.dimension`} render={({ field }) => (<FormItem><FormLabel>Dimensi</FormLabel><FormControl><Input placeholder="cth., Kerja Sama Tim" {...field} /></FormControl><FormMessage /></FormItem>)}/>
        <FormField control={control} name={`dimensions.${index}.definition`} render={({ field }) => (<FormItem><FormLabel>Definisi</FormLabel><FormControl><Textarea placeholder="Jelaskan perilaku yang diharapkan..." {...field} /></FormControl><FormMessage /></FormItem>)}/>
        
        <div className="space-y-2 pl-4 border-l-2">
           <FormLabel>Key Behaviors (Perilaku Kunci)</FormLabel>
           {kbFields.map((field, kbIndex) => (
              <FormField key={field.id} control={control} name={`dimensions.${index}.keyBehaviors.${kbIndex}.value`} render={({ field: kbField }) => (
                <FormItem>
                    <div className="flex items-center gap-2">
                        <FormControl><Input placeholder={`Perilaku kunci #${kbIndex + 1}`} {...kbField} /></FormControl>
                        <Badge variant="outline" className="text-primary font-semibold whitespace-nowrap">{scorePerBehavior.toFixed(2)}%</Badge>
                        <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => removeKb(kbIndex)} disabled={kbFields.length <= 1}><Trash2 className="h-4 w-4" /></Button>
                    </div><FormMessage />
                </FormItem>
                )}/>
           ))}
           <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => appendKb({ value: '' })}><PlusCircle className="mr-2 h-4 w-4" />Tambah Key Behavior</Button>
        </div>
      </div>
    )
}

interface KboSetupFormSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  setup?: KboSetup;
  isCloning?: boolean;
  onSave: (data: Omit<KboSetup, 'id'> & { id?: string }) => void;
  companies: Company[];
}

export function KboSetupFormSheet({ isOpen, onOpenChange, setup, isCloning, onSave, companies }: KboSetupFormSheetProps) {
  const { currentUser, userRole } = useAuth();
  const { kboCategories, departments, positions } = useMasterData();
  
  const form = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      company: 'Global',
      categoryName: 'Core Competency',
      dimensions: [{ id: `dim-${Date.now()}`, dimension: '', definition: '', keyBehaviors: [{ value: '' }] }],
      ratingScale: defaultRatingScale,
    },
  });

  const { fields: dimensionFields, append: appendDimension, remove: removeDimension } = useFieldArray({
    control: form.control,
    name: "dimensions",
  });

  const isEditing = !!setup && !isCloning;
  const companyForForm = form.watch('company');
  const categoryForForm = form.watch('categoryName');
  const departmentForForm = form.watch('department');
  const watchedDimensions = form.watch('dimensions');

  const totalKeyBehaviors = useMemo(() => {
    return watchedDimensions.reduce((sum, dim) => sum + (dim.keyBehaviors?.length || 0), 0);
  }, [watchedDimensions]);

  const scorePerBehavior = totalKeyBehaviors > 0 ? 100 / totalKeyBehaviors : 0;

  const departmentOptions = useMemo(() => {
    if (!companyForForm) return [];
    return departments.filter(d => d.company === companyForForm);
  }, [departments, companyForForm]);

  const positionOptions = useMemo(() => {
    if (!departmentForForm) return [];
    return positions.filter(p => p.company === companyForForm && p.department === departmentForForm);
  }, [positions, companyForForm, departmentForForm]);

  const { reset, setValue, getValues } = form;

  React.useEffect(() => {
    if (isOpen) {
      if (setup) {
        const baseData = {
            ...setup,
            ratingScale: setup.ratingScale && setup.ratingScale.length === 4 ? setup.ratingScale : defaultRatingScale,
            dimensions: setup.dimensions && setup.dimensions.length > 0 
                ? setup.dimensions.map(dim => ({ ...dim, keyBehaviors: dim.keyBehaviors.map(kb => ({ value: kb.value })) }))
                : [{ id: `dim-${Date.now()}`, dimension: '', definition: '', keyBehaviors: [{ value: '' }] }],
        };
        if (isCloning) {
            delete baseData.id;
            reset(baseData);
        } else {
            reset(baseData);
        }
      } else {
        const defaultCompany = userRole !== 'superadmin' ? currentUser?.company || '' : 'Global';
        reset({
          id: undefined,
          company: defaultCompany,
          categoryName: 'Core Competency',
          dimensions: [{ id: `dim-${Date.now()}`, dimension: '', definition: '', keyBehaviors: [{ value: '' }] }],
          ratingScale: defaultRatingScale,
        });
      }
    }
  }, [isOpen, setup, isCloning, userRole, currentUser, reset]);
  

  React.useEffect(() => {
    const currentCategory = getValues('categoryName');
    if(currentCategory === 'Core Competency') {
        setValue('level', undefined);
        setValue('department', undefined);
        setValue('position', undefined);
    }
    if(currentCategory === 'Generic Competency') {
        setValue('department', undefined);
        setValue('position', undefined);
    }
    if(currentCategory === 'Specific Competency') {
        setValue('level', undefined);
    }
  }, [categoryForForm, setValue, getValues]);


  const onSubmit = (data: SetupFormValues) => {
    const dataToSave: any = { ...data };
    
    // Clean up data before saving to prevent Firestore errors
    if (dataToSave.categoryName !== 'Generic Competency') {
      delete dataToSave.level;
    }
    if (dataToSave.categoryName !== 'Specific Competency') {
      delete dataToSave.department;
      delete dataToSave.position;
    }
    
    if (!dataToSave.id) {
      delete dataToSave.id;
    }

    onSave(dataToSave as any);
    onOpenChange(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-4xl flex flex-col h-full">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>{isEditing ? 'Ubah Pengaturan Kompetensi' : 'Buat Pengaturan Kompetensi Baru'}</SheetTitle>
              <SheetDescription>
                Definisikan satu set kompetensi untuk konteks tertentu.
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="flex-1 py-4 px-1 -mx-1">
              <div className="space-y-4 px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userRole === 'superadmin' && (
                    <FormField control={form.control} name="company" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Konteks Perusahaan</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pilih Konteks" /></SelectTrigger></FormControl>
                            <SelectContent>
                               <SelectItem value="Global">Global (Semua Perusahaan)</SelectItem>
                              {companies.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                            </SelectContent>
                          </Select><FormMessage />
                        </FormItem>
                    )}/>
                  )}
                  <FormField control={form.control} name="categoryName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kategori Kompetensi</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Pilih Kategori" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {DEFAULT_KBO_CATEGORIES.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                  )}/>
                </div>
                 
                <div className="p-4 border rounded-lg bg-muted/30">
                    <FormLabel>Skala Penilaian (Otomatis)</FormLabel>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 mt-2">
                        {defaultRatingScale.map((scale, index) => {
                            const calculatedScore = (scorePerBehavior * scale.percentage) / 100;
                            return (
                                <div key={index} className="text-xs">
                                    <p className="font-semibold">{scale.name}</p>
                                    <p className="text-muted-foreground">({scale.percentage}%) = <span className="font-bold text-primary">{calculatedScore.toFixed(2)} pts</span></p>
                                </div>
                            )
                        })}
                    </div>
                </div>
                
                {categoryForForm === 'Generic Competency' && (
                    <FormField control={form.control} name="level" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Level Jabatan</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pilih Level" /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="Staff">Staff</SelectItem>
                                <SelectItem value="Supervisor">Supervisor</SelectItem>
                                <SelectItem value="Manager">Manager</SelectItem>
                                <SelectItem value="Direktur">Direktur</SelectItem>
                            </SelectContent>
                          </Select><FormMessage />
                        </FormItem>
                    )}/>
                )}

                {categoryForForm === 'Specific Competency' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <FormField control={form.control} name="department" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Target Departemen</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value} disabled={!companyForForm}><FormControl><SelectTrigger><SelectValue placeholder="Pilih Departemen" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {departmentOptions.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                                </SelectContent>
                              </Select><FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="position" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Target Jabatan</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value} disabled={!departmentForForm}><FormControl><SelectTrigger><SelectValue placeholder="Pilih Jabatan" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {positionOptions.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                                </SelectContent>
                              </Select><FormMessage />
                            </FormItem>
                        )}/>
                    </div>
                )}

                <Separator className="my-6" />

                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Daftar Dimensi</h3>
                    {dimensionFields.map((field, index) => (
                      <DimensionFields key={field.id} control={form.control} index={index} removeDimension={removeDimension} scorePerBehavior={scorePerBehavior} />
                    ))}
                    <Button type="button" variant="outline" className="mt-4" onClick={() => appendDimension({ id: `dim-${Date.now()}`, dimension: '', definition: '', keyBehaviors: [{ value: '' }] })}><PlusCircle className="mr-2 h-4 w-4" />Tambah Dimensi</Button>
                </div>
              </div>
            </ScrollArea>
            <SheetFooter className="mt-auto pt-6">
              <SheetClose asChild><Button type="button" variant="outline">Batal</Button></SheetClose>
              <Button type="submit">Simpan Pengaturan</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
