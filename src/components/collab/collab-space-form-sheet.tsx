// src/components/collab/collab-space-form-sheet.tsx
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "../ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useMasterData } from '@/contexts/master-data-context';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Palette, Users, Network, Briefcase, UserCheck, Check, Building } from 'lucide-react';
import { serverTimestamp } from 'firebase/firestore';
import { Label } from '../ui/label';
import { cn } from '@/lib/utils';
import { MultiSelect } from '../ui/multi-select';
import { ScrollArea } from '../ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Company, Employee, Position, Department } from '@/types';

const colorClasses: Record<string, string> = {
    'blue-500': 'bg-blue-500',
    'emerald-500': 'bg-emerald-500',
    'rose-500': 'bg-rose-500',
    'amber-500': 'bg-amber-500',
    'violet-500': 'bg-violet-500',
    'sky-500': 'bg-sky-500',
};

const PASTEL_COLORS = [
    { name: 'Blue', value: 'blue-500' },
    { name: 'Green', value: 'emerald-500' },
    { name: 'Rose', value: 'rose-500' },
    { name: 'Amber', value: 'amber-500' },
    { name: 'Violet', value: 'violet-500' },
    { name: 'Sky', value: 'sky-500' },
];

const spaceSchema = z.object({
  name: z.string().min(1, "Nama ruangan harus diisi."),
  description: z.string().min(1, "Deskripsi harus diisi."),
  company: z.string().min(1, "Perusahaan harus dipilih."),
  color: z.string().default('blue-500'),
  targetDepartments: z.array(z.string()).default([]),
  targetPositions: z.array(z.string()).default([]),
  targetEmployees: z.array(z.string()).default([]),
});

type SpaceFormValues = z.infer<typeof spaceSchema>;

interface CollabSpaceFormSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  space?: any;
}

export function CollabSpaceFormSheet({ isOpen, onOpenChange, space }: CollabSpaceFormSheetProps) {
  const { addCollabSpace, updateCollabSpace, employees, departments, positions, companies } = useMasterData();
  const { currentUser, userRole } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SpaceFormValues>({
    resolver: zodResolver(spaceSchema),
    defaultValues: { 
        name: '', 
        description: '', 
        company: '',
        color: 'blue-500', 
        targetDepartments: [], 
        targetPositions: [], 
        targetEmployees: [] 
    }
  });

  const isEditing = !!space;

  // --- Logic for visibility scoping ---
  const userCompany = useMemo(() => companies.find(c => c.name === currentUser?.company), [companies, currentUser]);
  const isHoldingAdmin = useMemo(() => userRole === 'manajemen' && !!userCompany?.isHolding, [userRole, userCompany]);
  const showCompanySelector = userRole === 'superadmin' || isHoldingAdmin;

  const manageableCompanies = useMemo(() => {
    if (userRole === 'superadmin') return companies.filter(c => c.status === 'Aktif');
    if (isHoldingAdmin && userCompany) {
      const getChildCompanies = (parentId: string): any[] => {
        const children = companies.filter(c => c.parentId === parentId);
        return [...children, ...children.flatMap(c => getChildCompanies(c.id))];
      };
      return [userCompany, ...getChildCompanies(userCompany.id)];
    }
    if (userCompany) return [userCompany];
    return [];
  }, [userRole, isHoldingAdmin, userCompany, companies]);

  // --- Hierarchical Options ---
  const watchedCompany = form.watch('company');
  const watchedDepts = form.watch('targetDepartments') || [];
  const watchedPos = form.watch('targetPositions') || [];
  const watchedColor = form.watch('color');

  const deptOptions = useMemo(() => {
    if (!watchedCompany) return [];
    return departments
        .filter(d => d.company === watchedCompany)
        .map(d => ({ label: d.name, value: d.name }));
  }, [departments, watchedCompany]);

  const posOptions = useMemo(() => {
    if (!watchedCompany) return [];
    let filteredPos = positions.filter(p => p.company === watchedCompany);
    if (watchedDepts.length > 0) {
        filteredPos = filteredPos.filter(p => watchedDepts.includes(p.department));
    }
    return [...new Set(filteredPos.map(p => p.name))].map(name => ({ label: name, value: name }));
  }, [positions, watchedCompany, watchedDepts]);

  const employeeOptions = useMemo(() => {
    if (!watchedCompany) return [];
    let filteredEmps = employees.filter(e => e.company === watchedCompany && e.status === 'Aktif');
    
    if (watchedDepts.length > 0) {
        filteredEmps = filteredEmps.filter(e => watchedDepts.includes(e.department));
    }
    if (watchedPos.length > 0) {
        filteredEmps = filteredEmps.filter(e => watchedPos.includes(e.position));
    }
    
    return filteredEmps.map(e => ({ label: e.name, value: e.id }));
  }, [employees, watchedCompany, watchedDepts, watchedPos]);

  useEffect(() => {
    if (isOpen) {
      if (space) {
        form.reset({
          name: space.name,
          description: space.description,
          company: space.company,
          color: space.color || 'blue-500',
          targetDepartments: [],
          targetPositions: [],
          targetEmployees: space.memberIds || [],
        });
      } else if (currentUser) {
        form.reset({
          name: '',
          description: '',
          company: currentUser.company,
          color: 'blue-500',
          targetDepartments: [],
          targetPositions: [],
          targetEmployees: [currentUser.id],
        });
      }
    }
  }, [isOpen, space, currentUser, form]);

  const resolveMemberIds = (data: SpaceFormValues) => {
    if (!currentUser) return [];
    const { targetDepartments, targetPositions, targetEmployees, company } = data;
    const allCompanyEmployees = employees.filter(e => e.company === company && e.status === 'Aktif');
    
    const resolvedIds = new Set<string>();
    
    if (targetEmployees.length > 0) {
        targetEmployees.forEach(id => resolvedIds.add(id));
    } else if (targetPositions.length > 0) {
        allCompanyEmployees
            .filter(e => targetDepartments.includes(e.department) && targetPositions.includes(e.position))
            .forEach(e => resolvedIds.add(e.id));
    } else if (targetDepartments.length > 0) {
        allCompanyEmployees
            .filter(e => targetDepartments.includes(e.department))
            .forEach(e => resolvedIds.add(e.id));
    }
    
    // Always include creator if they belong to the same company, or explicitly add if superadmin
    if (currentUser.company === company) {
        resolvedIds.add(currentUser.id);
    }
    return Array.from(resolvedIds);
  };

  const onSubmit = async (data: SpaceFormValues) => {
    if (!currentUser) return;
    setIsLoading(true);
    
    const finalMemberIds = resolveMemberIds(data);

    try {
        if (isEditing) {
            await updateCollabSpace(space.id, {
                name: data.name,
                description: data.description,
                company: data.company,
                color: data.color,
                memberIds: finalMemberIds,
                updatedAt: serverTimestamp(),
            });
            toast({ title: "Ruangan Berhasil Diperbarui!" });
        } else {
            await addCollabSpace({
                name: data.name,
                description: data.description,
                company: data.company,
                color: data.color,
                memberIds: finalMemberIds,
                creatorId: currentUser.id,
                creatorName: currentUser.name,
                status: 'active',
                createdAt: serverTimestamp(),
            });
            toast({ title: "Ruangan Berhasil Dibuat!" });
        }
        onOpenChange(false);
    } catch (e: any) {
        toast({ variant: 'destructive', title: "Gagal Menyimpan", description: e.message });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl h-full max-h-[90vh] flex flex-col p-0 overflow-hidden gap-0 border-none shadow-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full overflow-hidden">
            <DialogHeader className="p-6 pb-4 shrink-0 bg-background border-b">
              <DialogTitle className="text-xl font-bold font-headline text-foreground">
                {isEditing ? 'Ubah Rincian Ruangan' : 'Buat CollabSpace Baru'}
              </DialogTitle>
              <DialogDescription>
                {isEditing ? 'Sesuaikan informasi ruangan project Anda.' : 'Wadah khusus untuk koordinasi project tim Anda.'}
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="flex-1 min-h-0 bg-background">
                <div className="p-6 space-y-8">
                    <div className="space-y-4">
                        {showCompanySelector && (
                            <FormField
                                control={form.control}
                                name="company"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-muted-foreground font-semibold flex items-center gap-2">
                                            <Building className="size-4" /> Perusahaan Penanggung Jawab
                                        </FormLabel>
                                        <Select 
                                            onValueChange={(val) => {
                                                field.onChange(val);
                                                form.setValue('targetDepartments', []);
                                                form.setValue('targetPositions', []);
                                                form.setValue('targetEmployees', []);
                                            }} 
                                            value={field.value}
                                            disabled={isEditing}
                                        >
                                            <FormControl>
                                                <SelectTrigger className="h-12">
                                                    <SelectValue placeholder="Pilih perusahaan..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {manageableCompanies.map(c => (
                                                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-muted-foreground font-semibold">Nama Ruangan</FormLabel>
                                <FormControl><Input placeholder="cth., Project Kampanye Digital Q4" {...field} className="h-12 border-muted-foreground/20 focus-visible:ring-primary" /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-muted-foreground font-semibold">Deskripsi</FormLabel>
                                <FormControl><Textarea placeholder="Tujuan atau lingkup ruangan ini..." {...field} className="min-h-[80px] resize-none border-muted-foreground/20 focus-visible:ring-primary" /></FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>

                    <div className="p-4 border rounded-xl bg-muted/20 space-y-5">
                        <div className="flex items-center gap-2 text-primary">
                            <Users className="size-4" />
                            <h4 className="text-xs font-bold uppercase tracking-wider">Penugasan Anggota Ruangan</h4>
                        </div>

                        <FormField
                            control={form.control}
                            name="targetDepartments"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[11px] font-bold flex items-center gap-2"><Network className="size-3" /> Pilih Departemen</FormLabel>
                                <FormControl>
                                    <MultiSelect 
                                        options={deptOptions} 
                                        value={field.value} 
                                        onChange={(val) => {
                                            field.onChange(val);
                                            form.setValue('targetPositions', []);
                                            form.setValue('targetEmployees', []);
                                        }} 
                                        placeholder={watchedCompany ? "Pilih departemen..." : "Pilih perusahaan dulu..."}
                                        disabled={!watchedCompany}
                                    />
                                </FormControl>
                                <FormDescription className="text-[10px]">Pilih departemen untuk menyertakan seluruh personil di dalamnya.</FormDescription>
                            </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="targetPositions"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[11px] font-bold flex items-center gap-2"><Briefcase className="size-3" /> Pilih Jabatan (Spesifik)</FormLabel>
                                <FormControl>
                                    <MultiSelect 
                                        options={posOptions} 
                                        value={field.value} 
                                        onChange={(val) => {
                                            field.onChange(val);
                                            form.setValue('targetEmployees', []);
                                        }} 
                                        placeholder={watchedDepts.length > 0 ? "Pilih jabatan..." : "Pilih departemen dulu..."}
                                        disabled={watchedDepts.length === 0}
                                    />
                                </FormControl>
                                <FormDescription className="text-[10px]">Filter lebih dalam berdasarkan jabatan tertentu di departemen terpilih.</FormDescription>
                            </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="targetEmployees"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[11px] font-bold flex items-center gap-2"><UserCheck className="size-3" /> Pilih Karyawan (Sangat Spesifik)</FormLabel>
                                <FormControl>
                                    <MultiSelect 
                                        options={employeeOptions} 
                                        value={field.value} 
                                        onChange={field.onChange} 
                                        placeholder={watchedCompany ? "Pilih individu..." : "Pilih perusahaan dulu..."}
                                        disabled={!watchedCompany}
                                    />
                                </FormControl>
                                <FormDescription className="text-[10px]">Pilih individu secara manual jika hanya ingin mengundang orang tertentu.</FormDescription>
                            </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="color"
                        render={({ field }) => (
                        <FormItem className="space-y-3">
                            <FormLabel className="text-muted-foreground font-semibold flex items-center gap-2">
                                <Palette className="h-4 w-4" /> Tema Warna Ruangan
                            </FormLabel>
                            <FormControl>
                                <div className="flex flex-wrap gap-3">
                                    {PASTEL_COLORS.map((color) => (
                                        <button
                                            key={color.value}
                                            type="button"
                                            onClick={() => field.onChange(color.value)}
                                            className={cn(
                                                "size-9 rounded-full transition-all border-2 flex items-center justify-center",
                                                colorClasses[color.value],
                                                field.value === color.value ? "ring-2 ring-offset-2 ring-primary border-white scale-110" : "border-transparent opacity-80 hover:opacity-100"
                                            )}
                                            title={color.name}
                                        >
                                            {field.value === color.value && <Check className="size-4 text-white" />}
                                        </button>
                                    ))}
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
            </ScrollArea>

            <DialogFooter className="p-6 shrink-0 flex flex-row justify-end gap-2 bg-muted/20 border-t">
              <DialogClose asChild>
                <Button type="button" variant="ghost" disabled={isLoading}>Batal</Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading} className="font-bold px-8 shadow-md">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Simpan Perubahan' : 'Buat Ruangan'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
