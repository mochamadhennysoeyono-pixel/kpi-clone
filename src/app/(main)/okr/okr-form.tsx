// src/app/(main)/okr/okr-form.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useFieldArray, useWatch, useFormContext, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMasterData } from '@/contexts/master-data-context';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { PlusCircle, Trash2, CalendarIcon, Percent, Hash, CheckSquare, Binary, Send, User, Users, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, isValid } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { OKR, KeyResult, Milestone, Employee, Department, Position, Company, ChecklistItem, Contributor, OwnershipModel, OkrStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { serverTimestamp } from 'firebase/firestore';

const milestoneSchema = z.object({
  id: z.string(),
  text: z.string().min(1, "Teks milestone tidak boleh kosong"),
  completed: z.boolean().default(false),
  ownerId: z.string().optional().nullable(),
  ownerName: z.string().optional().nullable(),
});

const checklistItemSchema = z.object({
    id: z.string(),
    text: z.string().min(1, "Teks item tidak boleh kosong."),
    completed: z.boolean().default(false),
    ownerId: z.string().optional().nullable(),
    ownerName: z.string().optional().nullable(),
});

const contributorSchema = z.object({
    ownerId: z.string().min(1, "Kontributor harus dipilih."),
    ownerName: z.string().optional().nullable(),
    targetValue: z.coerce.number(),
    currentValue: z.coerce.number().default(0),
});

const keyResultSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Nama Key Result harus diisi"),
  description: z.string().optional().nullable(),
  type: z.enum(['Percentage', 'Numeric', 'Milestone', 'Binary']),
  ownershipModel: z.enum(['single_owner', 'split_ownership', 'delegated']),
  
  ownerId: z.string().optional().nullable(),
  ownerName: z.string().optional().nullable(),

  weight: z.coerce.number().optional().nullable(),
  startValue: z.coerce.number().optional().default(0),
  targetValue: z.coerce.number().optional().nullable(),
  unit: z.string().optional().nullable(),

  milestones: z.array(milestoneSchema).optional().default([]),
  checklist: z.array(checklistItemSchema).optional().default([]),
  contributors: z.array(contributorSchema).optional().default([]),

}).superRefine((data, ctx) => {
    if ((data.type === 'Numeric' || data.type === 'Percentage') && data.ownershipModel === 'single_owner') {
        if (data.targetValue === undefined || data.targetValue === null) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Target harus diisi untuk tipe Numerik atau Persentase.",
                path: ['targetValue'],
            });
        }
    }
});


const okrSchema = z.object({
  objective: z.string().min(1, "Objective harus diisi."),
  description: z.string().optional().nullable(),
  priority: z.enum(['Crucial', 'Medium', 'Normal']),
  startDate: z.date({ required_error: "Tanggal mulai harus diisi." }),
  endDate: z.date({ required_error: "Tanggal selesai harus diisi." }),
  ownerId: z.string().min(1, "Objective harus ditugaskan ke seseorang."),
  keyResults: z.array(keyResultSchema).min(1, "Minimal harus ada satu Key Result."),
}).refine(data => {
    const totalWeight = data.keyResults.reduce((sum, kr) => sum + (kr.weight || 0), 0);
    const weightedKrs = data.keyResults.filter(kr => kr.weight !== undefined && kr.weight !== null && kr.weight > 0);
    if (weightedKrs.length > 0 && Math.abs(totalWeight - 100) > 0.1) {
        return false;
    }
    return true;
}, {
    message: "Total bobot Key Result harus 100% jika menggunakan pembobotan.",
    path: ["keyResults"],
});

type OkrFormValues = z.infer<typeof okrSchema>;

const KeyResultForm = ({ control, index, remove, krOwnerOptions }: { control: any, index: number, remove: (index: number) => void, krOwnerOptions: Employee[] }) => {
    const { setValue } = useFormContext<OkrFormValues>();
    const krType = useWatch({ control, name: `keyResults.${index}.type` });
    const ownershipModel = useWatch({ control, name: `keyResults.${index}.ownershipModel` });
    const contributors = useWatch({ control, name: `keyResults.${index}.contributors` });
    const milestones = useWatch({ control, name: `keyResults.${index}.milestones` });
    const checklist = useWatch({ control, name: `keyResults.${index}.checklist` });

    const { fields: milestoneFields, append: appendMilestone, remove: removeMilestone } = useFieldArray({ control, name: `keyResults.${index}.milestones` });
    const { fields: checklistFields, append: appendChecklist, remove: removeChecklist } = useFieldArray({ control, name: `keyResults.${index}.checklist` });
    const { fields: contributorFields, append: appendContributor, remove: removeContributor } = useFieldArray({ control, name: `keyResults.${index}.contributors` });

    useEffect(() => {
        if (krType === 'Milestone') {
            setValue(`keyResults.${index}.targetValue`, milestones?.length || 0, { shouldValidate: true });
        } else if (krType === 'Binary') {
            const target = (checklist && checklist.length > 0) ? checklist.length : 1;
            setValue(`keyResults.${index}.targetValue`, target, { shouldValidate: true });
        }
    }, [krType, milestones, checklist, index, setValue]);

    useEffect(() => {
        if (ownershipModel === 'split_ownership') {
            const totalTarget = contributors?.reduce((sum, c) => sum + (c.targetValue || 0), 0) || 0;
            setValue(`keyResults.${index}.targetValue`, totalTarget, { shouldValidate: true });
        }
    }, [contributors, ownershipModel, index, setValue]);
    
    return (
        <Card className="bg-muted/50 p-4 relative">
            <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-muted-foreground" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
            <div className="space-y-4">
                <FormField control={control} name={`keyResults.${index}.name`} render={({ field }) => (
                    <FormItem><FormLabel>Key Result #{index + 1}</FormLabel><FormControl><Input placeholder="Nama Key Result..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                    <FormField control={control} name={`keyResults.${index}.type`} render={({ field }) => (
                        <FormItem><FormLabel>Tipe Progres</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pilih Tipe" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Percentage"><div className="flex items-center gap-2"><Percent className="h-4 w-4" /> Persentase</div></SelectItem><SelectItem value="Numeric"><div className="flex items-center gap-2"><Hash className="h-4 w-4" /> Angka</div></SelectItem><SelectItem value="Milestone"><div className="flex items-center gap-2"><CheckSquare className="h-4 w-4" /> Milestone</div></SelectItem><SelectItem value="Binary"><div className="flex items-center gap-2"><Binary className="h-4 w-4" /> Selesai / Belum</div></SelectItem></SelectContent></Select><FormMessage /></FormItem>
                    )}/>
                    <FormField control={control} name={`keyResults.${index}.ownershipModel`} render={({ field }) => (
                        <FormItem><FormLabel>Model Kepemilikan</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pilih Model" /></SelectTrigger></FormControl><SelectContent><SelectItem value="single_owner"><div className="flex items-center gap-2"><User className="h-4 w-4" /> Pemilik Tunggal</div></SelectItem><SelectItem value="split_ownership" disabled={krType === 'Milestone' || krType === 'Binary'}><div className="flex items-center gap-2"><Users className="h-4 w-4" /> Dibagi (Split)</div></SelectItem><SelectItem value="delegated" disabled={krType === 'Percentage' || krType === 'Numeric'}><div className="flex items-center gap-2"><Users className="h-4 w-4" /> Didelegasikan</div></SelectItem></SelectContent></Select><FormMessage /></FormItem>
                    )}/>
                </div>
                
                {ownershipModel === 'single_owner' && (
                    <FormField control={control} name={`keyResults.${index}.ownerId`} render={({ field }) => (
                        <FormItem><FormLabel>Penanggung Jawab Tugas</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Default: Owner Utama OKR"/></SelectTrigger></FormControl><SelectContent>{krOwnerOptions.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                    )} />
                )}

                {(ownershipModel === 'single_owner' && (krType === 'Numeric' || krType === 'Percentage')) && (
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                         <FormField control={control} name={`keyResults.${index}.startValue`} render={({ field }) => (<FormItem><FormLabel>Nilai Awal</FormLabel><FormControl><Input type="number" placeholder="0" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
                         <FormField control={control} name={`keyResults.${index}.targetValue`} render={({ field }) => (<FormItem><FormLabel>Target</FormLabel><FormControl><Input type="number" placeholder={krType === 'Percentage' ? '100' : '1000'} {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
                         {krType === 'Numeric' && (<FormField control={control} name={`keyResults.${index}.unit`} render={({ field }) => (<FormItem><FormLabel>Satuan <span className="text-xs text-muted-foreground">(Ops)</span></FormLabel><FormControl><Input placeholder="Unit" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />)}
                         <FormField control={control} name={`keyResults.${index}.weight`} render={({ field }) => (<FormItem><FormLabel>Bobot (%) <span className="text-xs text-muted-foreground">(Ops)</span></FormLabel><FormControl><Input type="number" placeholder="25" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
                    </div>
                )}
                
                {ownershipModel === 'split_ownership' && (krType === 'Numeric' || krType === 'Percentage') && (
                    <div className="pl-4 border-l-2 space-y-3">
                         <FormLabel>Kontributor & Target Parsial</FormLabel>
                         {contributorFields.map((field, cIndex) => (
                             <div key={field.id} className="flex items-end gap-2 p-2 bg-background rounded-md">
                                 <FormField control={control} name={`keyResults.${index}.contributors.${cIndex}.ownerId`} render={({ field: contributorField }) => (<FormItem className="flex-1"><FormLabel className="text-xs">Kontributor</FormLabel><Select onValueChange={contributorField.onChange} value={contributorField.value}><FormControl><SelectTrigger><SelectValue placeholder="Pilih Anggota Tim"/></SelectTrigger></FormControl><SelectContent>{krOwnerOptions.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></FormItem>)}/>
                                 <FormField control={control} name={`keyResults.${index}.contributors.${cIndex}.targetValue`} render={({ field: contributorField }) => (<FormItem><FormLabel className="text-xs">Target</FormLabel><FormControl><Input type="number" placeholder="Target" {...contributorField} value={contributorField.value ?? ''} /></FormControl></FormItem>)}/>
                                 <Button type="button" size="icon" variant="ghost" onClick={() => removeContributor(cIndex)}><Trash2 className="h-4 w-4" /></Button>
                             </div>
                         ))}
                         <Button type="button" size="sm" variant="outline" onClick={() => appendContributor({ ownerId: '', ownerName: '', targetValue: 0, currentValue: 0 })}>Tambah Kontributor</Button>
                    </div>
                )}

                {ownershipModel === 'delegated' && krType === 'Milestone' && (
                    <div className="pl-4 border-l-2 space-y-2">
                        <FormLabel>Milestones & Penanggung Jawab</FormLabel>
                        {milestoneFields.map((field, mIndex) => (<div key={field.id} className="flex items-end gap-2 p-2 bg-background rounded-md">
                             <FormField control={control} name={`keyResults.${index}.milestones.${mIndex}.text`} render={({ field: milestoneField }) => (<FormItem className="flex-1"><FormLabel className="text-xs">Milestone #{mIndex+1}</FormLabel><FormControl><Input placeholder={`Detail milestone...`} {...milestoneField} /></FormControl><FormMessage /></FormItem>)}/>
                             <FormField control={control} name={`keyResults.${index}.milestones.${mIndex}.ownerId`} render={({ field: milestoneField }) => (<FormItem className="w-48"><FormLabel className="text-xs">Owner</FormLabel><Select onValueChange={milestoneField.onChange} value={milestoneField.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Pilih Owner"/></SelectTrigger></FormControl><SelectContent>{krOwnerOptions.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></FormItem>)}/>
                             <Button type="button" size="icon" variant="ghost" onClick={() => removeMilestone(mIndex)}><Trash2 className="h-4 w-4" /></Button>
                         </div>))}
                        <Button type="button" size="sm" variant="outline" onClick={() => appendMilestone({ id: `m_${Date.now()}`, text: '', completed: false })}>Tambah Milestone</Button>
                    </div>
                )}

                 {ownershipModel === 'delegated' && krType === 'Binary' && (
                    <div className="pl-4 border-l-2 space-y-2">
                        <FormLabel>Checklist Penyelesaian & Penanggung Jawab</FormLabel>
                        {checklistFields.map((field, cIndex) => (<div key={field.id} className="flex items-end gap-2 p-2 bg-background rounded-md">
                             <FormField control={control} name={`keyResults.${index}.checklist.${cIndex}.text`} render={({ field: checklistField }) => (<FormItem className="flex-1"><FormLabel className="text-xs">Item Checklist #{cIndex+1}</FormLabel><FormControl><Input placeholder={`Tugas...`} {...checklistField} /></FormControl><FormMessage /></FormItem>)}/>
                             <FormField control={control} name={`keyResults.${index}.checklist.${cIndex}.ownerId`} render={({ field: checklistField }) => (<FormItem className="w-48"><FormLabel className="text-xs">Owner</FormLabel><Select onValueChange={checklistField.onChange} value={checklistField.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Pilih Owner"/></SelectTrigger></FormControl><SelectContent>{krOwnerOptions.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select></FormItem>)}/>
                             <Button type="button" size="icon" variant="ghost" onClick={() => removeChecklist(cIndex)}><Trash2 className="h-4 w-4" /></Button>
                         </div>))}
                        <Button type="button" size="sm" variant="outline" onClick={() => appendChecklist({ id: `c_${Date.now()}`, text: '', completed: false })}>Tambah Item Checklist</Button>
                    </div>
                )}

            </div>
        </Card>
    );
};

export const OKRSetupForm = ({ okr }: { okr?: OKR }) => {
    const { addOkr, updateOkr, employees, companies, departments, positions } = useMasterData();
    const { currentUser, userRole } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<OkrFormValues>({
        resolver: zodResolver(okrSchema),
        defaultValues: {
            objective: '', priority: 'Medium', ownerId: '',
            keyResults: [{
                id: `kr_${Date.now()}`, name: '', type: 'Percentage', ownershipModel: 'single_owner',
                startValue: 0, targetValue: 100, milestones: [], checklist: [], contributors: [],
            }]
        },
    });
    
    const [filterCompany, setFilterCompany] = useState<string>('');
    const [filterDepartment, setFilterDepartment] = useState<string>('');
    const [filterPosition, setFilterPosition] = useState<string>('');
    const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);
    
    const userCompany = useMemo(() => companies.find(c => c.name === currentUser?.company), [companies, currentUser]);
    const isHoldingAdmin = useMemo(() => userRole === 'manajemen' && !!userCompany?.isHolding, [userRole, userCompany]);
    const showCompanyFilter = userRole === 'superadmin' || isHoldingAdmin;

    const companyOptions = useMemo(() => {
        if (userRole === 'superadmin') return companies.filter(c => c.status === 'Aktif');
        if (isHoldingAdmin && userCompany) return [userCompany, ...companies.filter(c => c.parentId === userCompany.id)];
        return userCompany ? [userCompany] : [];
    }, [userRole, isHoldingAdmin, userCompany, companies]);

    const departmentOptions = useMemo(() => !filterCompany ? [] : [...new Set(departments.filter(d => d.company === filterCompany).map(d => d.name))], [departments, filterCompany]);
    const positionOptions = useMemo(() => !filterDepartment ? [] : [...new Set(positions.filter(p => p.company === filterCompany && p.department === filterDepartment).map(p => p.name))], [positions, filterCompany, filterDepartment]);
    
    const ownerOptions = useMemo(() => {
        return employees.filter(e => 
            (!filterCompany || e.company === filterCompany) && 
            (!filterDepartment || e.department === filterDepartment) && 
            (!filterPosition || e.position === filterPosition) && 
            e.status === 'Aktif'
        );
    }, [employees, filterCompany, filterDepartment, filterPosition]);

    const mainOwnerId = useWatch({ control: form.control, name: 'ownerId' });

    const krOwnerOptions = useMemo(() => {
        const mainOwner = employees.find(e => e.id === mainOwnerId);
        const companyName = mainOwner?.company || filterCompany;
        if (!companyName) return ownerOptions;
        return employees.filter(e => e.company === companyName && e.status === 'Aktif');
    }, [mainOwnerId, employees, filterCompany, ownerOptions]);
    
    useEffect(() => {
        if (okr && employees.length > 0 && !isInitialLoadDone) {
            const owner = employees.find(e => e.id === okr.ownerId);
            if(owner) { 
                setFilterCompany(owner.company); 
                setFilterDepartment(owner.department); 
                setFilterPosition(owner.position); 
            }
            
            // Convert strings or Timestamps to Date objects
            const toDate = (val: any) => {
                if (!val) return new Date();
                if (val.toDate && typeof val.toDate === 'function') return val.toDate();
                const d = new Date(val);
                return isValid(d) ? d : new Date();
            };

            // Reset form with sanitized data
            form.reset({ 
                ...okr, 
                objective: okr.objective || '',
                description: okr.description || '',
                priority: okr.priority || 'Medium',
                ownerId: okr.ownerId || '',
                startDate: toDate(okr.startDate), 
                endDate: toDate(okr.endDate),
                keyResults: okr.keyResults?.map(kr => ({
                    ...kr,
                    description: kr.description || '',
                    ownerId: kr.ownerId || '',
                    ownerName: kr.ownerName || '',
                    milestones: kr.milestones?.map(m => ({ ...m, ownerId: m.ownerId || '', ownerName: m.ownerName || '' })) || [],
                    checklist: kr.checklist?.map(c => ({ ...c, ownerId: c.ownerId || '', ownerName: c.ownerName || '' })) || [],
                    contributors: kr.contributors?.map(c => ({ ...c, ownerName: c.ownerName || '' })) || [],
                    startValue: kr.startValue ?? 0,
                    targetValue: kr.targetValue ?? 100,
                    weight: kr.weight ?? undefined
                })) || []
            });
            setIsInitialLoadDone(true);
        } else if (!okr && employees.length > 0 && !isInitialLoadDone) {
             const defaultCompany = userCompany?.name || companyOptions[0]?.name || '';
             setFilterCompany(defaultCompany);
             setIsInitialLoadDone(true);
        }
    }, [okr, employees, isInitialLoadDone, userCompany, companyOptions, form]);

    // Handle form validation errors for debugging
    const formErrors = form.formState.errors;
    useEffect(() => {
        if (Object.keys(formErrors).length > 0) {
            console.warn("OKR Form Validation Errors:", formErrors);
        }
    }, [formErrors]);

    const handleCompanyChange = (value: string) => { setFilterCompany(value); setFilterDepartment(''); setFilterPosition(''); form.setValue('ownerId', ''); };
    const handleDepartmentChange = (value: string) => { setFilterDepartment(value); setFilterPosition(''); form.setValue('ownerId', ''); };
    const handlePositionChange = (value: string) => { setFilterPosition(value); form.setValue('ownerId', ''); };

    const { fields, append, remove } = useFieldArray({ control: form.control, name: "keyResults" });

    const onSubmit = async (data: OkrFormValues, status: OkrStatus) => {
        if (!currentUser || isSubmitting) return;
        setIsSubmitting(true);
        
        const owner = employees.find(e => e.id === data.ownerId);
        if (!owner) {
            toast({ variant: "destructive", title: "Gagal", description: "Data pemilik OKR tidak ditemukan." });
            setIsSubmitting(false);
            return;
        }
        
        const finalKeyResults = data.keyResults.map(kr => {
            let finalKr: any = { ...kr };
            
            if (kr.ownershipModel === 'single_owner') {
                const krOwner = kr.ownerId ? employees.find(e => e.id === kr.ownerId) : owner;
                finalKr = { ...finalKr, ownerId: krOwner?.id || null, ownerName: krOwner?.name || null };
            }

            if(kr.ownershipModel === 'delegated') {
                if(kr.milestones) {
                    finalKr.milestones = kr.milestones.map(m => ({ ...m, ownerId: m.ownerId || null, ownerName: employees.find(e => e.id === m.ownerId)?.name || null }));
                }
                if(kr.checklist) {
                    finalKr.checklist = kr.checklist.map(c => ({ ...c, ownerId: c.ownerId || null, ownerName: employees.find(e => e.id === c.ownerId)?.name || null }));
                }
            }
            
            if (kr.ownershipModel === 'split_ownership' && kr.contributors) {
                finalKr.contributors = kr.contributors.map(c => ({ ...c, ownerName: employees.find(e => e.id === c.ownerId)?.name || null }));
            }

            finalKr.description = kr.description || null;
            finalKr.unit = kr.unit || null;
            finalKr.weight = kr.weight || null;
            finalKr.currentValue = kr.currentValue || 0;
            finalKr.targetValue = kr.targetValue ?? 0;

            return finalKr;
        });

        const payload: Omit<OKR, 'id' | 'createdAt' | 'progress' | 'activityLog'> = {
            ...data,
            description: data.description || '',
            approverId: owner.reportsTo || null,
            keyResults: finalKeyResults,
            company: owner.company,
            ownerName: owner.name,
            status,
        };
        
        try {
            if (okr) {
                await updateOkr(okr.id, payload);
                toast({ title: "Berhasil", description: "OKR telah diperbarui." });
            } else {
                await addOkr({ ...payload, createdAt: serverTimestamp(), progress: 0, activityLog: [] });
                toast({ title: "Berhasil", description: "OKR baru telah dibuat." });
            }
            router.push('/okr');
        } catch (error: any) {
            console.error("Error saving OKR:", error);
            toast({ variant: "destructive", title: "Error", description: error.message || "Gagal menyimpan OKR." });
            setIsSubmitting(false);
        }
    };

    const onError = (errors: any) => {
        console.error("Form Validation Failed:", errors);
        toast({ 
            variant: "destructive", 
            title: "Data Tidak Valid", 
            description: "Beberapa field wajib belum diisi atau format data salah. Cek konsol browser untuk detailnya." 
        });
    };
    
    return (
        <FormProvider {...form}>
            <form onSubmit={(e) => e.preventDefault()}>
                <Card>
                    <CardHeader>
                        <CardTitle>{okr ? 'Ubah OKR' : 'Buat OKR Baru'}</CardTitle>
                        <CardDescription>Definisikan Objective Anda dan Key Results yang terukur untuk mencapainya.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                       <Card className="bg-muted/30"><CardHeader><CardTitle className="text-base">Penugasan OKR</CardTitle><CardDescription>Pilih siapa yang akan bertanggung jawab atas Objective ini.</CardDescription></CardHeader>
                            <CardContent className="space-y-4">
                                {showCompanyFilter && (<div className="grid grid-cols-1 md:grid-cols-3 gap-4"><FormItem><FormLabel>Perusahaan</FormLabel><Select onValueChange={handleCompanyChange} value={filterCompany}><SelectTrigger><SelectValue placeholder="Pilih Perusahaan"/></SelectTrigger><SelectContent>{companyOptions.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent></Select></FormItem><FormItem><FormLabel>Departemen</FormLabel><Select onValueChange={handleDepartmentChange} value={filterDepartment} disabled={!filterCompany}><SelectTrigger><SelectValue placeholder="Pilih Departemen"/></SelectTrigger><SelectContent>{departmentOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></FormItem><FormItem><FormLabel>Jabatan</FormLabel><Select onValueChange={handlePositionChange} value={filterPosition} disabled={!filterDepartment}><SelectTrigger><SelectValue placeholder="Pilih Jabatan"/></SelectTrigger><SelectContent>{positionOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></FormItem></div>)}
                                <FormField control={form.control} name="ownerId" render={({ field }) => (<FormItem><FormLabel>Ditugaskan kepada (Project Owner)</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pilih Karyawan"/></SelectTrigger></FormControl><SelectContent>{ownerOptions.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
                            </CardContent>
                        </Card>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                             <FormField control={form.control} name="startDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Tanggal Mulai</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP", {locale: localeId}) : <span>Pilih tanggal</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)}/>
                             <FormField control={form.control} name="endDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Tanggal Selesai</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP", {locale: localeId}) : <span>Pilih tanggal</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)}/>
                             <FormField control={form.control} name="priority" render={({ field }) => (<FormItem><FormLabel>Prioritas</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Crucial">Krusial</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="Normal">Biasa</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                        </div>
                        <FormField control={form.control} name="objective" render={({ field }) => (<FormItem><FormLabel>Objective</FormLabel><FormControl><Input placeholder="Apa tujuan besar yang ingin dicapai?" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                         <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Deskripsi Objective (Opsional)</FormLabel><FormControl><Textarea placeholder="Jelaskan lebih detail mengenai tujuan ini..." {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <div className="space-y-4">
                            <h3 className="font-semibold">Key Results</h3>
                            {fields.map((field, index) => (<KeyResultForm key={field.id} control={form.control} index={index} remove={remove} krOwnerOptions={krOwnerOptions}/>))}
                            <Button type="button" variant="outline" onClick={() => append({ id: `kr_${Date.now()}`, name: '', type: 'Percentage', ownershipModel: 'single_owner', startValue: 0, targetValue: 100, milestones: [], checklist: [], contributors: [] })}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Tambah Key Result
                            </Button>
                             {form.formState.errors.keyResults && <p className="text-sm font-medium text-destructive">{form.formState.errors.keyResults.message}</p>}
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => router.push('/okr')} disabled={isSubmitting}>Batal</Button>
                        <Button type="button" variant="outline" onClick={form.handleSubmit((data) => onSubmit(data, 'Draft'), onError)} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Simpan sebagai Draf
                        </Button>
                        <Button type="button" onClick={form.handleSubmit((data) => onSubmit(data, 'Active'), onError)} className="bg-primary text-white" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Simpan & Publikasi
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </FormProvider>
    );
};
