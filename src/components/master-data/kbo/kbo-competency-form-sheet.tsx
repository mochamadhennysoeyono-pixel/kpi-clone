// src/components/master-data/kbo/kbo-competency-form-sheet.tsx
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
import type { KboCompetency, Company } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { useMasterData } from '@/contexts/master-data-context';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, Trash2 } from 'lucide-react';


const competencySchema = z.object({
  id: z.string().optional(),
  company: z.string().min(1, "Perusahaan harus dipilih"),
  categoryId: z.string().min(1, "Kategori harus dipilih"),
  dimension: z.string().min(1, "Dimensi harus diisi"),
  definition: z.string().min(1, "Definisi harus diisi"),
  keyBehaviors: z.array(z.object({ value: z.string().min(1, 'Key behavior tidak boleh kosong') })).min(1, "Minimal satu key behavior"),
});

type CompetencyFormValues = z.infer<typeof competencySchema>;

interface KboCompetencyFormSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  competency?: KboCompetency;
  onSave: (data: Omit<KboCompetency, 'id'> & { id?: string }) => void;
}

export function KboCompetencyFormSheet({ isOpen, onOpenChange, competency, onSave }: KboCompetencyFormSheetProps) {
  const { currentUser, userRole } = useAuth();
  const { kboCategories, companies } = useMasterData();

  const form = useForm<CompetencyFormValues>({
    resolver: zodResolver(competencySchema),
    defaultValues: {
      keyBehaviors: [{ value: '' }],
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "keyBehaviors",
  });

  const isEditing = !!competency;

  useEffect(() => {
    if (isOpen) {
      if (competency) {
        form.reset({
            ...competency,
            keyBehaviors: competency.keyBehaviors.map(kb => ({ value: kb }))
        });
      } else {
        form.reset({
          id: undefined,
          company: userRole !== 'superadmin' ? currentUser?.company || '' : '',
          categoryId: '',
          dimension: '',
          definition: '',
          keyBehaviors: [{ value: '' }],
        });
      }
    }
  }, [competency, form, isOpen, userRole, currentUser]);

  const onSubmit = (data: CompetencyFormValues) => {
    const dataToSave = { ...data, keyBehaviors: data.keyBehaviors.map(kb => kb.value) };
    if (!dataToSave.id) {
      delete dataToSave.id;
    }
    onSave(dataToSave as Omit<KboCompetency, 'id'> & { id?: string });
    onOpenChange(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col h-full">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>{isEditing ? 'Ubah Kompetensi' : 'Tambah Kompetensi Baru'}</SheetTitle>
              <SheetDescription>
                Lengkapi detail kompetensi di bawah ini.
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="flex-1 py-4 px-1 -mx-1">
              <div className="space-y-4 px-4">
                {userRole === 'superadmin' && (
                  <FormField
                    control={form.control} name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Perusahaan</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Pilih perusahaan" /></SelectTrigger></FormControl>
                          <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control} name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategori Kompetensi</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger></FormControl>
                        <SelectContent>{kboCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control} name="dimension"
                  render={({ field }) => (
                    <FormItem><FormLabel>Dimensi</FormLabel><FormControl><Input placeholder="cth., Kerja Sama Tim" {...field} /></FormControl><FormMessage /></FormItem>
                  )}
                />
                 <FormField
                  control={form.control} name="definition"
                  render={({ field }) => (
                    <FormItem><FormLabel>Definisi</FormLabel><FormControl><Textarea placeholder="Jelaskan definisi dimensi ini..." {...field} /></FormControl><FormMessage /></FormItem>
                  )}
                />

                <div className="space-y-2">
                    <FormLabel>Key Behaviors (Perilaku Kunci)</FormLabel>
                    {fields.map((field, index) => (
                       <FormField
                            key={field.id}
                            control={form.control}
                            name={`keyBehaviors.${index}.value`}
                            render={({ field: kbField }) => (
                            <FormItem>
                                <div className="flex items-center gap-2">
                                <FormControl>
                                    <Input placeholder={`Perilaku kunci #${index + 1}`} {...kbField} />
                                </FormControl>
                                <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => remove(index)} disabled={fields.length <= 1}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                </div>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ value: '' })}><PlusCircle className="mr-2 h-4 w-4" />Tambah Key Behavior</Button>
                </div>

              </div>
            </ScrollArea>
            <SheetFooter className="mt-auto pt-6">
              <SheetClose asChild><Button type="button" variant="outline">Batal</Button></SheetClose>
              <Button type="submit">Simpan</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
