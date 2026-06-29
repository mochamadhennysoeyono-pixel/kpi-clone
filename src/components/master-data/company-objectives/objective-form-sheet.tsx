// src/components/master-data/company-objectives/objective-form-sheet.tsx
"use client";

import * as React from "react";
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { CompanyObjective, Company } from '@/types';
import { useMasterData } from '@/contexts/master-data-context';
import { useAuth } from '@/contexts/auth-context';
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle, Trash2 } from "lucide-react";

const objectiveItemSchema = z.object({
  id: z.string().optional(),
  objectiveName: z.string().min(1, "Deskripsi tujuan tidak boleh kosong."),
  bscPerspective: z.enum(["Financial", "Customer & Market", "Internal Business Process", "Learning & Growth"], { required_error: "Perspektif BSC harus dipilih" }),
  strategicFocus: z.enum(["Growth", "Efficiency", "Quality", "Compliance"], { required_error: "Fokus strategis harus dipilih" }),
});

const formSchema = z.object({
  company: z.string().min(1, "Perusahaan harus dipilih"),
  period: z.string().min(4, "Periode (tahun) harus diisi"),
  objectives: z.array(objectiveItemSchema).min(1, "Harus ada minimal satu objective."),
});


type ObjectiveFormValues = z.infer<typeof formSchema>;

interface ObjectiveFormSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  objective?: CompanyObjective;
  onSave: (data: { company: string; period: string; objectives: (Omit<CompanyObjective, 'id'|'company'|'period'> & {id?: string})[] }) => void;
}

export function ObjectiveFormSheet({ isOpen, onOpenChange, objective, onSave }: ObjectiveFormSheetProps) {
    const { companies } = useMasterData();
    const { currentUser, userRole } = useAuth();

    const form = useForm<ObjectiveFormValues>({
        resolver: zodResolver(formSchema),
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "objectives"
    });

    const isEditing = !!objective;

    const manageableCompanies = React.useMemo(() => {
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

    useEffect(() => {
        if(isOpen) {
            if (objective) {
                form.reset({
                    company: objective.company,
                    period: objective.period,
                    objectives: [{
                        id: objective.id,
                        objectiveName: objective.objectiveName,
                        bscPerspective: objective.bscPerspective,
                        strategicFocus: objective.strategicFocus,
                    }]
                });
            } else {
                 form.reset({
                    company: currentUser?.company || manageableCompanies[0]?.name,
                    period: new Date().getFullYear().toString(),
                    objectives: [{
                        objectiveName: "",
                        bscPerspective: undefined,
                        strategicFocus: undefined,
                    }]
                });
            }
        }
    }, [isOpen, objective, form, currentUser, manageableCompanies]);

    const onSubmit = (data: ObjectiveFormValues) => {
        onSave({
            company: data.company,
            period: data.period,
            objectives: data.objectives.map(obj => ({
                id: obj.id,
                objectiveName: obj.objectiveName,
                bscPerspective: obj.bscPerspective,
                strategicFocus: obj.strategicFocus,
            }))
        });
        onOpenChange(false);
    };
    
    const showCompanyFilter = userRole === 'superadmin' || (userRole === 'manajemen' && !!companies.find(c => c.name === currentUser?.company)?.isHolding);

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-2xl flex flex-col h-full">
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
                        <SheetHeader>
                            <SheetTitle>{isEditing ? "Ubah Objective" : "Tambah Objective Baru"}</SheetTitle>
                            <SheetDescription>Isi detail tujuan strategis perusahaan.</SheetDescription>
                        </SheetHeader>
                        <div className="flex-1 py-4 overflow-y-auto">
                            <ScrollArea className="h-full pr-4">
                                <div className="space-y-4">
                                    {showCompanyFilter && (
                                        <FormField
                                            control={form.control}
                                            name="company"
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormLabel>Perusahaan</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value} disabled={isEditing}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Pilih perusahaan"/></SelectTrigger></FormControl>
                                                    <SelectContent>{manageableCompanies.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                                                </Select>
                                                <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                    <FormField
                                        control={form.control}
                                        name="period"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Periode (Tahun)</FormLabel>
                                                <FormControl><Input placeholder="cth., 2024" {...field} disabled={isEditing}/></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    
                                    <div className="space-y-4">
                                        <FormLabel>Daftar Objective</FormLabel>
                                        {fields.map((field, index) => (
                                            <div key={field.id} className="p-4 border rounded-lg space-y-4 relative bg-muted/50">
                                                {!isEditing && (
                                                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-muted-foreground hover:text-destructive" onClick={() => remove(index)} disabled={fields.length <= 1}>
                                                        <Trash2 className="h-4 w-4"/>
                                                    </Button>
                                                )}
                                                <FormField
                                                    control={form.control}
                                                    name={`objectives.${index}.objectiveName`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Nama / Deskripsi Tujuan</FormLabel>
                                                            <FormControl><Textarea placeholder="cth., Meningkatkan profitabilitas bisnis sebesar 15%" {...field} /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <div className="grid grid-cols-2 gap-4">
                                                    <FormField control={form.control} name={`objectives.${index}.bscPerspective`} render={({ field }) => (<FormItem><FormLabel>Perspektif BSC</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Financial">Financial</SelectItem><SelectItem value="Customer & Market">Customer & Market</SelectItem><SelectItem value="Internal Business Process">Internal Business Process</SelectItem><SelectItem value="Learning & Growth">Learning & Growth</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                                                    <FormField control={form.control} name={`objectives.${index}.strategicFocus`} render={({ field }) => (<FormItem><FormLabel>Fokus Strategis</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Growth">Growth</SelectItem><SelectItem value="Efficiency">Efficiency</SelectItem><SelectItem value="Quality">Quality</SelectItem><SelectItem value="Compliance">Compliance</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                                                </div>
                                            </div>
                                        ))}
                                        {!isEditing && (
                                             <Button type="button" variant="outline" onClick={() => append({ objectiveName: '', bscPerspective: 'Financial', strategicFocus: 'Growth' })}>
                                                <PlusCircle className="mr-2 h-4 w-4" />
                                                Tambah Objective
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </ScrollArea>
                        </div>
                        <SheetFooter className="mt-auto">
                            <SheetClose asChild><Button type="button" variant="outline">Batal</Button></SheetClose>
                            <Button type="submit">Simpan</Button>
                        </SheetFooter>
                    </form>
                 </Form>
            </SheetContent>
        </Sheet>
    );
}
